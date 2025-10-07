import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import { Task } from '../types';
import { apiService } from '../services/api';
import ProfileHeader from '../components/ProfileHeader';

const CreateTaskScreen = () => {
  const navigation = useNavigation();
  const { dispatch } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showHourMenu, setShowHourMenu] = useState(false);
  const [showMinuteMenu, setShowMinuteMenu] = useState(false);
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
        parentId: null,
      };

      console.log('Form data being sent:', {
        title: taskData.title,
        assignee: taskData.assignee,
        project: taskData.project,
        fullTaskData: taskData
      });

      const response = await apiService.createTask(taskData);

      if (response.success && response.data) {
        console.log('Task created successfully in database:', response.data);
        console.log('Task data being added to local state:', response.data);
        console.log('Task title in response.data:', response.data.title);
        console.log('Task project in response.data:', response.data.project);
        console.log('Task assignee in response.data:', response.data.assignee);
        
        // Verify the task was actually saved to the database
        const verificationResponse = await apiService.verifyTaskExists(response.data.id);
        const isVerified = verificationResponse.success && verificationResponse.data;
        
        // Add to local state as well for immediate UI update
        console.log('Dispatching ADD_TASK with payload:', response.data);
        dispatch({ type: 'ADD_TASK', payload: response.data });

        // Wait and get confirmed task data from database before sending notification
        console.log('Waiting to get confirmed task data from database...');
        let confirmedTaskData = response.data;
        
        if (isVerified && response.data.id) {
          // Small delay to ensure database has processed the data
          console.log('Waiting 2 seconds for database to process...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Get the task data directly from database to ensure we have the real data
          console.log('Fetching confirmed task data from database...');
          const confirmedTaskResponse = await apiService.getTaskById(response.data.id);
          
          if (confirmedTaskResponse.success && confirmedTaskResponse.data) {
            confirmedTaskData = confirmedTaskResponse.data;
            console.log('Got confirmed task data from database:', confirmedTaskData);
            console.log('Confirmed task title:', confirmedTaskData.title);
            console.log('Confirmed task project:', confirmedTaskData.project);
            console.log('Confirmed task assignee:', confirmedTaskData.assignee);
          } else {
            console.warn('Failed to get confirmed task data, using creation response data');
          }
        }

        // Send WhatsApp notification with confirmed data
        console.log('Sending WhatsApp notification with confirmed data...');
        const notificationResponse = await apiService.sendTaskNotification(confirmedTaskData);
        
        let notificationStatus = '';
        if (notificationResponse.success) {
          notificationStatus = '📱 WhatsApp notification sent with confirmed data!';
          console.log('WhatsApp notification sent successfully with confirmed data');
        } else {
          notificationStatus = '⚠️ Task created but WhatsApp notification failed to send.';
          console.error('WhatsApp notification failed:', notificationResponse.error);
        }

        const verificationMessage = isVerified 
          ? '✅ Verified: Task is saved in DynamoDB database!'
          : '⚠️ Warning: Task created but verification failed. Please refresh the task list.';

        Alert.alert(
          'Success! ✅', 
          `Task "${confirmedTaskData.title || response.data.title}" has been created.\n\n${verificationMessage}\n\n${notificationStatus}\n\nTask ID: ${response.data.id}\nProject: ${confirmedTaskData.project || response.data.project}\nAssignee: ${confirmedTaskData.assignee || response.data.assignee}`,
          [
            { 
              text: 'OK', 
              onPress: () => {
                console.log('Navigating back to tasks screen...');
                navigation.goBack();
              }
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
        <View style={[styles.inputGroup, styles.row, { zIndex: 2000 }] }>
          <View style={[styles.col, styles.dropdownWrapper]}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.select}
                onPress={() => setShowPriorityMenu(!showPriorityMenu)}
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
                <View style={[styles.selectMenu, { zIndex: 1000, elevation: 20 }]}>
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
          <View style={[styles.col, styles.dropdownWrapper]}>
            <Text style={styles.label}>Estimated Hours</Text>
            <View style={styles.row}>
              <View style={[styles.col, styles.dropdownWrapper]}>
                <TouchableOpacity
                  style={styles.select}
                  onPress={() => {
                    setShowHourMenu(!showHourMenu);
                    setShowMinuteMenu(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.selectText}>{hourValue} h</Text>
                  <Ionicons name={showHourMenu ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
                </TouchableOpacity>
                {showHourMenu && (
                  <View style={[styles.selectMenu, { zIndex: 1000, elevation: 20, maxHeight: 220 }]}>
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
                  </View>
                )}
              </View>
              <View style={[styles.col, styles.dropdownWrapper]}>
                <TouchableOpacity
                  style={styles.select}
                  onPress={() => {
                    setShowMinuteMenu(!showMinuteMenu);
                    setShowHourMenu(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.selectText}>{minuteValue} m</Text>
                  <Ionicons name={showMinuteMenu ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
                </TouchableOpacity>
                {showMinuteMenu && (
                  <View style={[styles.selectMenu, { zIndex: 1000, elevation: 20 }] }>
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
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Project *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter project name"
            value={formData.project}
            onChangeText={(value) => handleInputChange('project', value)}
          />
        </View>

        {/* Assigned To + Status (Row) */}
        <View style={[styles.inputGroup, styles.row, { zIndex: 2000 }]}>
          <View style={[styles.col, { flex: 0.6 }]}>
            <Text style={styles.label}>Assigned To *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter assignee name"
              value={formData.assignee}
              onChangeText={(value) => handleInputChange('assignee', value)}
            />
          </View>
          <View style={[styles.col, styles.dropdownWrapper, { flex: 0.4 }]}>
            <Text style={styles.label}>Status *</Text>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.select}
                onPress={() => setShowStatusMenu(!showStatusMenu)}
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
                <View style={[styles.selectMenu, { zIndex: 1000, elevation: 20 }]}>
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