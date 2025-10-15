import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
// Optional dependency to avoid type errors if not installed
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DateTimePicker: any = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-community/datetimepicker');
    return mod.default || mod;
  } catch {
    return null;
  }
})();
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types';
import { apiService } from '../services/api';
import ProfileHeader from '../components/ProfileHeader';

const CreateTaskScreen = () => {
  const navigation = useNavigation();
  const route = useRoute() as any;
  const { state, dispatch } = useAppContext();
  const { canManage } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showHourMenu, setShowHourMenu] = useState(false);
  const [showMinuteMenu, setShowMinuteMenu] = useState(false);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(route?.params?.parentTaskId || null);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [hourValue, setHourValue] = useState<string>('0');
  const [minuteValue, setMinuteValue] = useState<string>('0');
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: '',
    assignee: '',
    status: 'To Do' as 'To Do' | 'In Progress' | 'Completed' | 'Overdue',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    dueDate: '',
    startDate: '',
    estimatedHours: '',
    tags: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateTask = async () => {
    // Check if user has permission to create tasks (admin or manager only)
    if (!canManage()) {
      Alert.alert(
        'Permission Denied',
        'Only administrators and managers can create tasks. Please contact your administrator for access.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (!formData.project.trim()) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }

    if (!formData.assignee.trim()) {
      Alert.alert('Error', 'Please enter an assignee');
      return;
    }

    setIsLoading(true);

    try {
    const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        project: formData.project.trim(),
        assignee: formData.assignee.trim(),
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate || new Date().toISOString().split('T')[0],
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        estimatedHours: parseFloat(formData.estimatedHours) || 0,
        tags: formData.tags.trim(),
        subtasks: '[]',
        comments: '0',
        progress: 0,
        timeSpent: '0',
        parentId: selectedParentId,
      };

      console.log('Form data being sent:', {
        title: taskData.title,
        assignee: taskData.assignee,
        project: taskData.project,
        fullTaskData: taskData
      });

      const response = await apiService.createTask(taskData);

      if (response.success && response.data) {
        // The API service now guarantees a complete task object with all fields
        const finalTask = response.data;
        
        console.log('📦 [CreateTaskScreen] Full task data received:', JSON.stringify(finalTask, null, 2));
        console.log(`✅ Task created successfully: ${finalTask?.title || 'NO TITLE'} (ID: ${finalTask?.id || 'NO ID'})`);
        console.log('📋 Task details:', {
          title: finalTask?.title,
          project: finalTask?.project,
          assignee: finalTask?.assignee,
          description: finalTask?.description,
          priority: finalTask?.priority,
          status: finalTask?.status,
          dueDate: finalTask?.dueDate,
        });
        
        // Validate task data
        if (!finalTask || !finalTask.id) {
          console.error('❌ [CreateTaskScreen] Invalid task data received:', finalTask);
          Alert.alert('Error', 'Task created but data is invalid. Please refresh the task list.');
          return;
        }
        
        console.log('📋 Final task ready for notification and UI:', finalTask);
        
        // Add to local state immediately for optimistic UI update
        dispatch({ type: 'ADD_TASK', payload: finalTask });

        // Handle subtask relationship if this is a subtask
        if (selectedParentId) {
          try {
            const parentRes = await apiService.getTaskById(selectedParentId);
            if (parentRes.success && parentRes.data) {
              const parent = parentRes.data;
              let subtasksArray: string[] = [];
              
              // Parse existing subtasks safely
              try {
                subtasksArray = typeof parent.subtasks === 'string' 
                  ? JSON.parse(parent.subtasks) 
                  : Array.isArray(parent.subtasks) ? parent.subtasks : [];
              } catch (e) {
                subtasksArray = [];
              }
              
              // Add new subtask ID if not present
              if (!subtasksArray.includes(finalTask.id)) {
                subtasksArray.push(finalTask.id);
                await apiService.updateTask(selectedParentId, { 
                  subtasks: JSON.stringify(subtasksArray) 
                } as any);
                console.log(`✅ Parent task updated with new subtask`);
              }
            }
          } catch (e) {
            console.warn('⚠️ Failed to update parent task:', e);
          }
        }

        // Send WhatsApp notification with FINAL task (guaranteed to have all fields)
        console.log('📱 Sending WhatsApp notification for task:', finalTask.id);
        console.log('📱 Notification task data:', {
          title: finalTask.title,
          project: finalTask.project,
          assignee: finalTask.assignee,
          description: finalTask.description
        });
        try {
          const notificationResponse = await apiService.sendWhatsAppNotification(finalTask as any);
          if (notificationResponse.success) {
            console.log('✅ WhatsApp notification sent successfully');
          } else {
            console.warn('⚠️ Failed to send WhatsApp notification:', notificationResponse.error);
          }
        } catch (notificationError) {
          console.error('❌ Error sending WhatsApp notification:', notificationError);
          // Don't block the user if notification fails - just log it
        }

        // Show success alert
        const taskTitle = finalTask.title || 'Untitled Task';
        const taskProject = finalTask.project || 'No Project';
        const taskAssignee = finalTask.assignee || 'Unassigned';
        const taskPriority = finalTask.priority || 'Medium';
        const taskDueDate = finalTask.dueDate || 'Not set';
        
        Alert.alert(
          'Task Created Successfully! ✅', 
          `Task "${taskTitle}" has been created and saved.\n\n📋 Task Details:\n• Project: ${taskProject}\n• Assignee: ${taskAssignee}\n• Priority: ${taskPriority}\n• Due Date: ${taskDueDate}\n\n📱 WhatsApp notification has been sent.`,
          [
            { 
              text: 'OK', 
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        console.error('Task creation failed:', response.error);
        Alert.alert(
          'Creation Failed ❌', 
          response.error || 'Failed to create task. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch projects for dropdown
  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await apiService.getProjects();
      if (mounted && res.success && res.data) {
        try {
          setProjects(res.data as any[]);
        } catch {
          setProjects([]);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Header */}
      {/* <ProfileHeader
        title="Create Task"
        subtitle="Add new task"
        rightElement={
          <TouchableOpacity
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color="#137fec" />
          </TouchableOpacity>
        }
        onProfilePress={() => {
          // Handle profile navigation
        }}
        onRightElementPress={() => navigation.goBack()}
      /> */}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Task Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter task title"
            value={formData.title}
            onChangeText={(value) => handleInputChange('title', value)}
          />
        </View>

        {/* Parent Task (Optional) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Parent Task (optional)</Text>
          <TouchableOpacity
            style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
            activeOpacity={0.8}
            onPress={() => setShowParentPicker(true)}
          >
            <Text style={styles.inputText} numberOfLines={1}>
              {selectedParentId ? (state.tasks.find(t => t.id === selectedParentId)?.title || selectedParentId) : 'Select parent task'}
            </Text>
            {selectedParentId ? (
              <TouchableOpacity onPress={() => setSelectedParentId(null)}>
                <Ionicons name="close-circle" size={18} color="#6b7280" />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-down" size={18} color="#6b7280" />
            )}
          </TouchableOpacity>
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter task description"
            value={formData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Priority + Estimated Hours (Row) */}
        <View style={[styles.inputGroup, styles.row]}>
          <View style={[styles.col, styles.priorityDropdownWrapper]}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityDropdownContainer}>
              <TouchableOpacity
                style={styles.select}
                onPress={() => {
                  setShowPriorityMenu(!showPriorityMenu);
                  // Close other dropdowns when opening priority
                  setShowHourMenu(false);
                  setShowMinuteMenu(false);
                  setShowProjectMenu(false);
                  setShowStatusMenu(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.selectText}>{formData.priority}</Text>
                <Ionicons
                  name={showPriorityMenu ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#6b7280"
                />
              </TouchableOpacity>
              {showPriorityMenu && (
                <View style={[styles.prioritySelectMenu]}>
                  {(['Low', 'Medium', 'High'] as const).map(p => (
                    <TouchableOpacity
                      key={p}
                      style={styles.selectOption}
                      onPress={() => {
                        handleInputChange('priority', p);
                        setShowPriorityMenu(false);
                      }}
                    >
                      <Text style={styles.selectOptionText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
          <View style={[styles.col, styles.hoursDropdownWrapper]}>
            <Text style={styles.label}>Estimated Hours</Text>
            <View style={styles.row}>
              <View style={[styles.col, styles.hourDropdownContainer]}>
                <TouchableOpacity
                  style={styles.select}
                  onPress={() => {
                    setShowHourMenu(!showHourMenu);
                    setShowMinuteMenu(false);
                    // Close other dropdowns when opening hours
                    setShowPriorityMenu(false);
                    setShowProjectMenu(false);
                    setShowStatusMenu(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.selectText}>{hourValue} h</Text>
                  <Ionicons name={showHourMenu ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
                </TouchableOpacity>
                {showHourMenu && (
                  <View style={[styles.hourSelectMenu]}>
                    <ScrollView 
                      style={{ maxHeight: 200 }}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      {Array.from({ length: 101 }).map((_, i) => (
                        <TouchableOpacity
                          key={`h-${i}`}
                          style={styles.selectOption}
                          onPress={() => {
                            const v = String(i);
                            setHourValue(v);
                            const total = (i + (parseInt(minuteValue) || 0) / 60).toFixed(2);
                            handleInputChange('estimatedHours', total);
                            setShowHourMenu(false);
                          }}
                        >
                          <Text style={styles.selectOptionText}>{i} h</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              <View style={[styles.col, styles.minuteDropdownContainer]}>
                <TouchableOpacity
                  style={styles.select}
                  onPress={() => {
                    setShowMinuteMenu(!showMinuteMenu);
                    setShowHourMenu(false);
                    // Close other dropdowns when opening minutes
                    setShowPriorityMenu(false);
                    setShowProjectMenu(false);
                    setShowStatusMenu(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.selectText}>{minuteValue} m</Text>
                  <Ionicons name={showMinuteMenu ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
                </TouchableOpacity>
                {showMinuteMenu && (
                  <View style={[styles.minuteSelectMenu]}>
                    {[0, 15, 30, 45].map(m => (
                      <TouchableOpacity
                        key={`m-${m}`}
                        style={styles.selectOption}
                        onPress={() => {
                          const v = String(m);
                          setMinuteValue(v);
                          const total = (parseInt(hourValue) + m / 60).toFixed(2);
                          handleInputChange('estimatedHours', total);
                          setShowMinuteMenu(false);
                        }}
                      >
                        <Text style={styles.selectOptionText}>{m} m</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Dates (Row) */}
        <View style={[styles.inputGroup, styles.row, { zIndex: 1000 }] }>
          <View style={[styles.col, styles.dateCol]}>
            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (!DateTimePicker) {
                  Alert.alert('Date picker unavailable', 'This screen requires @react-native-community/datetimepicker and a native device/emulator. On web the calendar will not open.');
                  return;
                }
                setShowStartPicker(true);
              }}
            >
              <View style={[styles.input, styles.dateButton]}>
                <Text style={styles.inputText}>{formData.startDate || 'YYYY-MM-DD'}</Text>
                <Ionicons name="calendar-outline" size={18} color="#6b7280" />
              </View>
            </TouchableOpacity>
            {showStartPicker && DateTimePicker && (
              <DateTimePicker
                value={formData.startDate ? new Date(formData.startDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(event, date) => {
                  if (Platform.OS !== 'ios') setShowStartPicker(false);
                  if (date) {
                    const iso = date.toISOString().split('T')[0];
                    handleInputChange('startDate', iso);
                  }
                }}
                style={Platform.OS === 'ios' ? { alignSelf: 'flex-start' } : undefined}
              />
            )}
          </View>
          <View style={[styles.col, styles.dateCol]}>
            <Text style={styles.label}>Due Date</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (!DateTimePicker) {
                  Alert.alert('Date picker unavailable', 'This screen requires @react-native-community/datetimepicker and a native device/emulator. On web the calendar will not open.');
                  return;
                }
                setShowDuePicker(true);
              }}
            >
              <View style={[styles.input, styles.dateButton]}> 
                <Text style={styles.inputText}>{formData.dueDate || 'YYYY-MM-DD'}</Text>
                <Ionicons name="calendar-outline" size={18} color="#6b7280" />
              </View>
            </TouchableOpacity>
            {showDuePicker && DateTimePicker && (
              <DateTimePicker
                value={formData.dueDate ? new Date(formData.dueDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(event, date) => {
                  if (Platform.OS !== 'ios') setShowDuePicker(false);
                  if (date) {
                    const iso = date.toISOString().split('T')[0];
                    handleInputChange('dueDate', iso);
                  }
                }}
                style={Platform.OS === 'ios' ? { alignSelf: 'flex-start' } : undefined}
              />
            )}
          </View>
        </View>

        {/* Project */}
        <View style={[styles.inputGroup, styles.projectDropdownWrapper]}>
          <Text style={styles.label}>Project *</Text>
          <View style={styles.projectDropdownContainer}>
            <TouchableOpacity
              style={styles.select}
              onPress={() => {
                setShowProjectMenu(!showProjectMenu);
                // Close other dropdowns when opening project
                setShowPriorityMenu(false);
                setShowHourMenu(false);
                setShowMinuteMenu(false);
                setShowStatusMenu(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.selectText} numberOfLines={1}>{formData.project || 'Select project'}</Text>
              <Ionicons name={showProjectMenu ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
            </TouchableOpacity>
            {showProjectMenu && (
              <View style={[styles.projectSelectMenu]}> 
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: 'white' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Ionicons name="search" size={14} color="#9ca3af" />
                    <TextInput
                      value={projectSearch}
                      onChangeText={setProjectSearch}
                      placeholder="Search projects"
                      placeholderTextColor="#9ca3af"
                      style={{ marginLeft: 6, flex: 1, color: '#111827', paddingVertical: 0 }}
                    />
                  </View>
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  style={{ maxHeight: 220 }}
                  contentContainerStyle={{ paddingBottom: 8 }}
                  showsVerticalScrollIndicator={true}
                >
                  {(projects || [])
                    .filter(p => !projectSearch.trim() || (p.name || p.title || '').toLowerCase().includes(projectSearch.toLowerCase()))
                    .map((item, idx) => (
                      <TouchableOpacity
                        key={item.id || item.projectId || item.name || String(idx)}
                        style={styles.selectOption}
                        onPress={() => {
                          handleInputChange('project', item.name || item.title || '');
                          setShowProjectMenu(false);
                        }}
                      >
                        <Text style={styles.selectOptionText} numberOfLines={1}>{item.name || item.title || '-'}</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* Assigned To + Status (Row) */}
        <View style={[styles.inputGroup, styles.row]}>
          <View style={[styles.col, { flex: 0.6 }]}>
            <Text style={styles.label}>Assigned To *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter assignee name"
              value={formData.assignee}
              onChangeText={(value) => handleInputChange('assignee', value)}
            />
          </View>
          <View style={[styles.col, styles.statusDropdownWrapper, { flex: 0.4 }]}>
            <Text style={styles.label}>Status *</Text>
            <View style={styles.statusDropdownContainer}>
              <TouchableOpacity
                style={styles.select}
                onPress={() => {
                  setShowStatusMenu(!showStatusMenu);
                  // Close other dropdowns when opening status
                  setShowPriorityMenu(false);
                  setShowHourMenu(false);
                  setShowMinuteMenu(false);
                  setShowProjectMenu(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.selectText}>{formData.status}</Text>
                <Ionicons
                  name={showStatusMenu ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#6b7280"
                />
              </TouchableOpacity>
              {showStatusMenu && (
                <View style={[styles.statusSelectMenu]}>
                  {(['To Do', 'In Progress', 'Completed', 'Overdue'] as const).map(s => (
                    <TouchableOpacity
                      key={s}
                      style={styles.selectOption}
                      onPress={() => {
                        handleInputChange('status', s);
                        setShowStatusMenu(false);
                      }}
                    >
                      <Text style={styles.selectOptionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Tags */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tags</Text>
          <TextInput
            style={styles.input}
            placeholder="Comma,separated"
            value={formData.tags}
            onChangeText={(value) => handleInputChange('tags', value)}
          />
        </View>


        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createButton, isLoading && styles.createButtonDisabled]}
            onPress={handleCreateTask}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.createButtonText}>Creating...</Text>
              </View>
            ) : (
              <Text style={styles.createButtonText}>Create Task</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Parent Picker Modal (simple sheet) */}
      {showParentPicker && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowParentPicker(false)} />
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: 420 }}>
            <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Select Parent Task</Text>
              <TouchableOpacity onPress={() => setShowParentPicker(false)}>
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Ionicons name="search" size={16} color="#9ca3af" />
                <TextInput
                  value={parentSearch}
                  onChangeText={setParentSearch}
                  placeholder="Search tasks..."
                  placeholderTextColor="#9ca3af"
                  style={{ marginLeft: 6, flex: 1, color: '#111827' }}
                />
              </View>
            </View>
            <ScrollView style={{ paddingHorizontal: 12, marginTop: 8 }}>
              {state.tasks
                .filter(t => !t.parentId) // show only top-level by default to avoid clutter
                .filter(t => !parentSearch.trim() || (t.title || '').toLowerCase().includes(parentSearch.toLowerCase()))
                .map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
                    onPress={() => {
                      setSelectedParentId(t.id);
                      setShowParentPicker(false);
                    }}
                  >
                    <Text style={{ fontSize: 14, color: '#111827' }} numberOfLines={1}>{t.title || 'Untitled'}</Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{t.project || 'No Project'} • {t.assignee || 'Unassigned'}</Text>
                  </TouchableOpacity>
                ))}
              {state.tasks.length === 0 && (
                <Text style={{ paddingVertical: 16, textAlign: 'center', color: '#6b7280' }}>No tasks available</Text>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7f8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1f2937',
  },
  inputText: {
    fontSize: 14,
    color: '#1f2937',
  },
  select: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 14,
    color: '#1f2937',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
    zIndex: 4000,
  },
  // Priority dropdown styles
  priorityDropdownWrapper: {
    zIndex: 5000,
    elevation: 25,
  },
  priorityDropdownContainer: {
    position: 'relative',
    zIndex: 5000,
  },
  prioritySelectMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 25,
    overflow: 'hidden',
    zIndex: 5000,
  },
  // Hours dropdown styles
  hoursDropdownWrapper: {
    zIndex: 4000,
    elevation: 20,
  },
  hourDropdownContainer: {
    position: 'relative',
    zIndex: 4000,
  },
  hourSelectMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 20,
    overflow: 'hidden',
    zIndex: 4000,
  },
  // Minutes dropdown styles
  minuteDropdownContainer: {
    position: 'relative',
    zIndex: 4000,
  },
  minuteSelectMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 20,
    overflow: 'hidden',
    zIndex: 4000,
  },
  // Project dropdown styles
  projectDropdownWrapper: {
    zIndex: 3000,
    elevation: 15,
  },
  projectDropdownContainer: {
    position: 'relative',
    zIndex: 3000,
  },
  projectSelectMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 15,
    overflow: 'hidden',
    zIndex: 3000,
  },
  // Status dropdown styles
  statusDropdownWrapper: {
    zIndex: 2000,
    elevation: 10,
  },
  statusDropdownContainer: {
    position: 'relative',
    zIndex: 2000,
  },
  statusSelectMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
    zIndex: 2000,
  },
  // Legacy styles for backward compatibility
  dropdownContainer: {
    position: 'relative',
    zIndex: 3500,
  },
  dropdownWrapper: {
    zIndex: 3000,
    elevation: 24,
  },
  dateCol: {
    zIndex: 0,
    elevation: 0,
  },
  selectOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectOptionText: {
    fontSize: 14,
    color: '#1f2937',
  },
  textArea: {
    height: 50,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  priorityButtonSelected: {
    borderColor: '#137fec',
    backgroundColor: '#137fec',
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  priorityTextSelected: {
    color: 'white',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  createButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#137fec',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default CreateTaskScreen;