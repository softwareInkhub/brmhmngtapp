import React, { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

interface CreateTaskFormProps {
  onClose: () => void;
  parentTaskId?: string | null;
  onTaskCreated?: (task: any) => void;
}

const CreateTaskForm: React.FC<CreateTaskFormProps> = ({ 
  onClose, 
  parentTaskId = null, 
  onTaskCreated 
}) => {
  const { state, dispatch } = useAppContext();
  const { canManage } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showHourMenu, setShowHourMenu] = useState(false);
  const [showMinuteMenu, setShowMinuteMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [showTeamMenu, setShowTeamMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [hourValue, setHourValue] = useState<string>('0');
  const [minuteValue, setMinuteValue] = useState<string>('0');
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: '',
    assignee: '',
    assignedTeams: [] as string[],
    assignedUsers: [] as string[],
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

  const handleTeamSelection = (teamId: string, teamName: string) => {
    const newSelectedTeams = selectedTeams.includes(teamId)
      ? selectedTeams.filter(id => id !== teamId)
      : [...selectedTeams, teamId];
    
    setSelectedTeams(newSelectedTeams);
    setFormData(prev => ({
      ...prev,
      assignedTeams: newSelectedTeams,
    }));
  };

  const handleUserSelection = (userId: string, userName: string) => {
    const newSelectedUsers = selectedUsers.includes(userId)
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId];
    
    setSelectedUsers(newSelectedUsers);
    setFormData(prev => ({
      ...prev,
      assignedUsers: newSelectedUsers,
    }));
  };

  const removeTeam = (teamId: string) => {
    const newSelectedTeams = selectedTeams.filter(id => id !== teamId);
    setSelectedTeams(newSelectedTeams);
    setFormData(prev => ({
      ...prev,
      assignedTeams: newSelectedTeams,
    }));
  };

  const removeUser = (userId: string) => {
    const newSelectedUsers = selectedUsers.filter(id => id !== userId);
    setSelectedUsers(newSelectedUsers);
    setFormData(prev => ({
      ...prev,
      assignedUsers: newSelectedUsers,
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

    if (!formData.assignee.trim() && selectedTeams.length === 0 && selectedUsers.length === 0) {
      Alert.alert('Error', 'Please enter an assignee or select teams/users');
      return;
    }

    setIsLoading(true);

    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        project: formData.project.trim(),
        assignee: formData.assignee.trim(),
        assignedTeams: selectedTeams,
        assignedUsers: selectedUsers,
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
        parentId: parentTaskId,
      };

      const response = await apiService.createTask(taskData);

      if (response.success && response.data) {
        const finalTask = response.data;
        
        // Add to local state immediately for optimistic UI update
        dispatch({ type: 'ADD_TASK', payload: finalTask });

        // Handle subtask relationship if this is a subtask
        if (parentTaskId) {
          try {
            const parentRes = await apiService.getTaskById(parentTaskId);
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
                await apiService.updateTask(parentTaskId, { 
                  subtasks: JSON.stringify(subtasksArray) 
                } as any);
              }
            }
          } catch (e) {
            console.warn('⚠️ Failed to update parent task:', e);
          }
        }

        // Send WhatsApp notification with assignment details
        try {
          // Prepare assignment details for notification
          const assignmentDetails = [];
          
          // Add manual assignee if provided
          if (formData.assignee.trim()) {
            assignmentDetails.push(`Manual Assignee: ${formData.assignee.trim()}`);
          }
          
          // Add selected teams
          if (selectedTeams.length > 0) {
            const teamNames = selectedTeams.map(teamId => {
              const team = teams.find(t => t.id === teamId || t.teamId === teamId || t.name === teamId);
              return team?.name || team?.title || teamId;
            });
            assignmentDetails.push(`Teams: ${teamNames.join(', ')}`);
          }
          
          // Add selected users
          if (selectedUsers.length > 0) {
            const userNames = selectedUsers.map(userId => {
              const user = users.find(u => u.id === userId);
              return user?.name || user?.username || userId;
            });
            assignmentDetails.push(`Users: ${userNames.join(', ')}`);
          }
          
          // Create enhanced task data for notification with assignment details
          const enhancedTaskData = {
            ...finalTask,
            assignmentDetails: assignmentDetails.length > 0 ? assignmentDetails.join(' | ') : 'Unassigned',
            assignedTeams: selectedTeams,
            assignedUsers: selectedUsers,
            manualAssignee: formData.assignee.trim(),
          };
          
          const notificationResponse = await apiService.sendWhatsAppNotification(enhancedTaskData as any);
          if (notificationResponse.success) {
            console.log('✅ WhatsApp notification sent successfully with assignment details');
          } else {
            console.warn('⚠️ Failed to send WhatsApp notification:', notificationResponse.error);
          }
        } catch (notificationError) {
          console.error('❌ Error sending WhatsApp notification:', notificationError);
        }

        // Call the onTaskCreated callback if provided
        if (onTaskCreated) {
          onTaskCreated(finalTask);
        }

        // Prepare assignment details for the success message
        const assignmentDetails = [];
        
        // Add manual assignee if provided
        if (formData.assignee.trim()) {
          assignmentDetails.push(`Manual Assignee: ${formData.assignee.trim()}`);
        }
        
        // Add selected teams
        if (selectedTeams.length > 0) {
          const teamNames = selectedTeams.map(teamId => {
            const team = teams.find(t => t.id === teamId || t.teamId === teamId || t.name === teamId);
            return team?.name || team?.title || teamId;
          });
          assignmentDetails.push(`Teams: ${teamNames.join(', ')}`);
        }
        
        // Add selected users
        if (selectedUsers.length > 0) {
          const userNames = selectedUsers.map(userId => {
            const user = users.find(u => u.id === userId);
            return user?.name || user?.username || userId;
          });
          assignmentDetails.push(`Users: ${userNames.join(', ')}`);
        }
        
        // Create the assignment summary
        const assignmentSummary = assignmentDetails.length > 0 
          ? `\n\n📋 Assignments:\n${assignmentDetails.join('\n')}`
          : '\n\n📋 Assignments: Unassigned';

        // Show success alert with detailed assignment information
        Alert.alert(
          'Task Created Successfully! ✅', 
          `Task "${finalTask.title}" has been created and saved.${assignmentSummary}`,
          [
            { 
              text: 'OK', 
              onPress: () => onClose()
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

  // Fetch projects, teams, and users for dropdowns
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Fetch projects
        const projectsRes = await apiService.getProjects();
        if (mounted && projectsRes.success && projectsRes.data) {
          setProjects(projectsRes.data as any[]);
        }

        // Fetch teams
        const teamsRes = await apiService.getTeams();
        if (mounted && teamsRes.success && teamsRes.data) {
          setTeams(teamsRes.data as any[]);
        }

        // Fetch users from BRMH user table
        const usersRes = await apiService.getUsers();
        if (mounted && usersRes.success && usersRes.data) {
          // Transform the user data to ensure we have the right structure
          const transformedUsers = usersRes.data.map((user: any) => ({
            id: user.id || user.userId || user.email,
            name: user.name || user.username || user.email?.split('@')[0] || 'Unknown User',
            email: user.email || '',
            username: user.username || user.name || '',
          }));
          setUsers(transformedUsers);
          console.log('👥 [CreateTaskForm] Fetched users:', transformedUsers.length);
        } else {
          console.warn('⚠️ [CreateTaskForm] Failed to fetch users:', usersRes.error);
          setUsers([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
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
      <View style={[styles.inputGroup, styles.row]}>
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

      {/* Assignment Section */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Assignment *</Text>
        
        {/* Manual Assignee Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { fontSize: 12, color: '#6b7280' }]}>Manual Assignee (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter assignee name manually"
            value={formData.assignee}
            onChangeText={(value) => handleInputChange('assignee', value)}
          />
        </View>

        {/* Selected Teams and Users Display */}
        {(selectedTeams.length > 0 || selectedUsers.length > 0) && (
          <View style={styles.selectedItemsContainer}>
            <Text style={[styles.label, { fontSize: 12, color: '#6b7280', marginBottom: 8 }]}>Selected Assignments:</Text>
            
            {/* Selected Teams */}
            {selectedTeams.length > 0 && (
              <View style={styles.selectedItemsRow}>
                <Text style={styles.selectedItemsLabel}>Teams:</Text>
                <View style={styles.selectedItemsList}>
                  {selectedTeams.map(teamId => {
                    const team = teams.find(t => t.id === teamId);
                    return (
                      <View key={teamId} style={styles.selectedItem}>
                        <Text style={styles.selectedItemText}>{team?.name || teamId}</Text>
                        <TouchableOpacity onPress={() => removeTeam(teamId)}>
                          <Ionicons name="close-circle" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <View style={styles.selectedItemsRow}>
                <Text style={styles.selectedItemsLabel}>Users:</Text>
                <View style={styles.selectedItemsList}>
                  {selectedUsers.map(userId => {
                    const user = users.find(u => u.id === userId);
                    return (
                      <View key={userId} style={styles.selectedItem}>
                        <Text style={styles.selectedItemText}>{user?.name || userId}</Text>
                        <TouchableOpacity onPress={() => removeUser(userId)}>
                          <Ionicons name="close-circle" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Team and User Selection Buttons */}
        <View style={styles.row}>
          <View style={[styles.col, styles.teamDropdownWrapper]}>
            <TouchableOpacity
              style={styles.select}
              onPress={() => {
                setShowTeamMenu(!showTeamMenu);
                setShowUserMenu(false);
                // Close other dropdowns
                setShowPriorityMenu(false);
                setShowHourMenu(false);
                setShowMinuteMenu(false);
                setShowProjectMenu(false);
                setShowStatusMenu(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.selectText}>Select Teams</Text>
              <Ionicons name={showTeamMenu ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
            </TouchableOpacity>
            {showTeamMenu && (
              <View style={[styles.teamSelectMenu]}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: 'white' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Ionicons name="search" size={14} color="#9ca3af" />
                    <TextInput
                      value={teamSearch}
                      onChangeText={setTeamSearch}
                      placeholder="Search teams"
                      placeholderTextColor="#9ca3af"
                      style={{ marginLeft: 6, flex: 1, color: '#111827', paddingVertical: 0 }}
                    />
                  </View>
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  style={{ maxHeight: 250 }}
                  contentContainerStyle={{ paddingBottom: 8 }}
                  showsVerticalScrollIndicator={true}
                  bounces={false}
                >
                  {(teams || [])
                    .filter(t => !teamSearch.trim() || (t.name || t.title || '').toLowerCase().includes(teamSearch.toLowerCase()))
                    .map((team, idx) => (
                      <TouchableOpacity
                        key={team.id || team.teamId || team.name || String(idx)}
                        style={[
                          styles.selectOption,
                          selectedTeams.includes(team.id || team.teamId || team.name) && styles.selectedOption
                        ]}
                        onPress={() => handleTeamSelection(team.id || team.teamId || team.name, team.name || team.title || '')}
                      >
                        <View style={styles.optionContent}>
                          <Text style={[
                            styles.selectOptionText,
                            selectedTeams.includes(team.id || team.teamId || team.name) && styles.selectedOptionText
                          ]}>
                            {team.name || team.title || '-'}
                          </Text>
                          {selectedTeams.includes(team.id || team.teamId || team.name) && (
                            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  {teams.length === 0 && (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No teams found</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={[styles.col, styles.userDropdownWrapper]}>
            <TouchableOpacity
              style={styles.select}
              onPress={() => {
                setShowUserMenu(!showUserMenu);
                setShowTeamMenu(false);
                // Close other dropdowns
                setShowPriorityMenu(false);
                setShowHourMenu(false);
                setShowMinuteMenu(false);
                setShowProjectMenu(false);
                setShowStatusMenu(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.selectText}>Select Users</Text>
              <Ionicons name={showUserMenu ? 'chevron-up' : 'chevron-down'} size={16} color="#6b7280" />
            </TouchableOpacity>
            {showUserMenu && (
              <View style={[styles.userSelectMenu]}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: 'white' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Ionicons name="search" size={14} color="#9ca3af" />
                    <TextInput
                      value={userSearch}
                      onChangeText={setUserSearch}
                      placeholder="Search users"
                      placeholderTextColor="#9ca3af"
                      style={{ marginLeft: 6, flex: 1, color: '#111827', paddingVertical: 0 }}
                    />
                  </View>
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  style={{ maxHeight: 250 }}
                  contentContainerStyle={{ paddingBottom: 8 }}
                  showsVerticalScrollIndicator={true}
                  bounces={false}
                >
                  {(users || [])
                    .filter(u => {
                      const searchTerm = userSearch.toLowerCase();
                      const name = (u.name || '').toLowerCase();
                      const email = (u.email || '').toLowerCase();
                      const username = (u.username || '').toLowerCase();
                      return !searchTerm || name.includes(searchTerm) || email.includes(searchTerm) || username.includes(searchTerm);
                    })
                    .map((user, idx) => (
                      <TouchableOpacity
                        key={user.id || String(idx)}
                        style={[
                          styles.selectOption,
                          selectedUsers.includes(user.id) && styles.selectedOption
                        ]}
                        onPress={() => handleUserSelection(user.id, user.name || user.email || '')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.optionContent}>
                          <View style={styles.userInfo}>
                            <Text style={[
                              styles.selectOptionText,
                              selectedUsers.includes(user.id) && styles.selectedOptionText
                            ]}>
                              {user.name || user.username || 'Unknown User'}
                            </Text>
                            {user.email && (
                              <Text style={[styles.selectOptionText, { fontSize: 12, color: '#6b7280', marginTop: 2 }]}>
                                {user.email}
                              </Text>
                            )}
                            {user.username && user.username !== user.name && (
                              <Text style={[styles.selectOptionText, { fontSize: 11, color: '#9ca3af', marginTop: 1 }]}>
                                @{user.username}
                              </Text>
                            )}
                          </View>
                          {selectedUsers.includes(user.id) && (
                            <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  {users.length === 0 && (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No users found</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Status */}
      <View style={[styles.inputGroup, styles.statusDropdownWrapper]}>
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
              setShowTeamMenu(false);
              setShowUserMenu(false);
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
          onPress={onClose}
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
  );
};

const styles = StyleSheet.create({
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
  // Team dropdown styles
  teamDropdownWrapper: {
    zIndex: 1500,
    elevation: 8,
  },
  teamSelectMenu: {
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
    elevation: 8,
    overflow: 'hidden',
    zIndex: 1500,
  },
  // User dropdown styles
  userDropdownWrapper: {
    zIndex: 1500,
    elevation: 8,
  },
  userSelectMenu: {
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
    elevation: 8,
    overflow: 'hidden',
    zIndex: 1500,
  },
  // Status dropdown styles
  statusDropdownWrapper: {
    zIndex: 1000,
    elevation: 5,
  },
  statusDropdownContainer: {
    position: 'relative',
    zIndex: 1000,
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
    elevation: 5,
    overflow: 'hidden',
    zIndex: 1000,
  },
  // Selected items styles
  selectedItemsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedItemsRow: {
    marginBottom: 8,
  },
  selectedItemsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  selectedItemsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  selectedItemText: {
    fontSize: 12,
    color: '#1e40af',
    marginRight: 4,
  },
  // Option content styles
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  selectedOption: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },
  selectedOptionText: {
    color: '#0c4a6e',
    fontWeight: '600',
  },
  // User info styles
  userInfo: {
    flex: 1,
  },
  // Empty state styles
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
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

export default CreateTaskForm;
