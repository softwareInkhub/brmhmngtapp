import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  ScrollView,
  Modal,
  Image,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/api';
import CreateTaskForm from '../components/CreateTaskForm';
import ProfileHeader from '../components/ProfileHeader';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

const TasksScreen = ({ route }: any) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const { state, dispatch } = useAppContext();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  
  // Multi-filter states
  const [activeFilterCategory, setActiveFilterCategory] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  
  const [teams, setTeams] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showSubtasksModal, setShowSubtasksModal] = useState(false);
  const [modalSubtasks, setModalSubtasks] = useState<any[]>([]);
  const [modalParentTitle, setModalParentTitle] = useState('');
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<any>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<any>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [parentTask, setParentTask] = useState<any>(null);
  const [loadingParentTask, setLoadingParentTask] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [audioSound, setAudioSound] = useState<Audio.Sound | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentAudioAttachment, setCurrentAudioAttachment] = useState<any | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Fetch teams, projects, and users for filters
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [teamsData, projectsData, usersData] = await Promise.all([
          apiService.getTeams(),
          apiService.getProjects(),
          apiService.getUsers()
        ]);
        setTeams(Array.isArray(teamsData) ? teamsData : []);
        setProjects(Array.isArray(projectsData) ? projectsData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        console.error('Error fetching filter data:', error);
      }
    };
    fetchFilterData();
  }, []);

  // Helper function to check if task is overdue
  const isTaskOverdue = (task: any) => {
    if (!task.dueDate || task.status === 'completed') return false;
    return new Date(task.dueDate) < new Date();
  };

  // Sort tasks and apply all filters
  const filteredTasks = [...state.tasks]
    .filter(task => {
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
          task.title?.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query) ||
          task.assignee?.toLowerCase().includes(query) ||
          task.project?.toLowerCase().includes(query) ||
          task.status?.toLowerCase().includes(query)
        );
        if (!matchesSearch) return false;
      }
      
      // Filter by old selectedStatus (for status pills compatibility)
      if (selectedStatus) {
        return task.status === selectedStatus;
      }

      // Filter by new multi-select statuses
      if (selectedStatuses.length > 0) {
        const taskStatus = task.status || 'todo';
        if (selectedStatuses.includes('overdue') && isTaskOverdue(task)) {
          return true;
        }
        if (!selectedStatuses.includes(taskStatus) && !selectedStatuses.includes('overdue')) {
          return false;
        }
        if (selectedStatuses.includes('overdue') && !isTaskOverdue(task) && !selectedStatuses.includes(taskStatus)) {
          return false;
        }
      }

      // Filter by priorities
      if (selectedPriorities.length > 0) {
        const taskPriority = (task.priority || 'medium').toLowerCase();
        if (!selectedPriorities.includes(taskPriority)) return false;
      }

      // Filter by assignees
      if (selectedAssignees.length > 0) {
        if (!selectedAssignees.includes(task.assignee)) return false;
      }

      // Filter by teams
      if (selectedTeams.length > 0) {
        const taskTeam = (task as any).teamId || (task as any).team;
        if (!selectedTeams.includes(taskTeam)) return false;
      }

      // Filter by projects
      if (selectedProjects.length > 0) {
        const taskProject = (task as any).projectId || task.project;
        if (!selectedProjects.includes(taskProject)) return false;
      }

      // Filter by date
      if (selectedDateFilter) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const taskDate = task.dueDate ? new Date(task.dueDate) : null;
        
        if (selectedDateFilter === 'today' && taskDate) {
          taskDate.setHours(0, 0, 0, 0);
          if (taskDate.getTime() !== today.getTime()) return false;
        } else if (selectedDateFilter === 'week' && taskDate) {
          const weekFromNow = new Date(today);
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          if (taskDate < today || taskDate > weekFromNow) return false;
        } else if (selectedDateFilter === 'month' && taskDate) {
          const monthFromNow = new Date(today);
          monthFromNow.setMonth(monthFromNow.getMonth() + 1);
          if (taskDate < today || taskDate > monthFromNow) return false;
        } else if (selectedDateFilter === 'overdue' && taskDate) {
          if (taskDate >= today) return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort alphabetically by title
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      return titleA.localeCompare(titleB);
    });
  
  const tasks = filteredTasks;
  const isLoading = state.isLoading;

  // Count tasks by status
  const getTaskCountByStatus = (status: string) => {
    return state.tasks.filter(task => task.status === status).length;
  };

  const fetchTasks = async () => {
    try {
      console.log('Starting to fetch tasks...');
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiService.getTasks();
      
      console.log('Fetch tasks response:', response);
      
      if (response.success && response.data) {
        console.log('Tasks fetched successfully:', response.data.length, 'tasks');
        console.log('Task data with parentId info:', response.data.map((task: any) => ({ 
          id: task.id, 
          title: task.title, 
          parentId: task.parentId,
          subtasks: task.subtasks 
        })));
        dispatch({ type: 'SET_TASKS', payload: response.data });
      } else {
        console.error('Failed to fetch tasks:', response.error);
        // Keep existing tasks if fetch fails
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // Keep existing tasks if fetch fails
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  useEffect(() => {
    // Only fetch tasks if we don't have any tasks in state
    // This prevents overwriting newly created tasks
    if (tasks.length === 0) {
      console.log('No tasks in state, fetching from API...');
      fetchTasks();
    } else {
      console.log('Tasks already in state, not fetching from API');
    }
  }, []);

  // Cleanup audio when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (audioSound) {
        audioSound.unloadAsync().catch(err => console.log('Error unloading audio:', err));
      }
    };
  }, [audioSound]);

  // Listen for navigation params to open create modal
  useEffect(() => {
    if (route?.params?.openCreateModal) {
      setShowCreateTaskModal(true);
      // Clear the param to avoid reopening on subsequent navigation
      navigation.setParams({ openCreateModal: undefined } as any);
    }
  }, [route?.params?.openCreateModal]);

  // Refresh tasks when screen comes into focus (but not on initial load)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we already have tasks (to sync with latest data)
      // This handles cases where tasks were created on other screens
      if (tasks.length > 0) {
        console.log('Screen focused, refreshing tasks to sync with latest data...');
        fetchTasks();
      }
    }, [tasks.length])
  );

  // Fetch parent task when task details modal opens
  useEffect(() => {
    const fetchParentTask = async () => {
      if (selectedTaskForDetails && selectedTaskForDetails.parentId) {
        setLoadingParentTask(true);
        try {
          // Try to find parent task in local state first
          const localParent = state.tasks.find(t => t.id === selectedTaskForDetails.parentId);
          if (localParent) {
            setParentTask(localParent);
          } else {
            // Fetch from API if not in local state
            const response = await apiService.getTaskById(selectedTaskForDetails.parentId);
            if (response.success && response.data) {
              setParentTask(response.data);
            } else {
              setParentTask(null);
            }
          }
        } catch (error) {
          console.error('Error fetching parent task:', error);
          setParentTask(null);
        } finally {
          setLoadingParentTask(false);
        }
      } else {
        setParentTask(null);
      }
    };

    fetchParentTask();
  }, [selectedTaskForDetails?.id, selectedTaskForDetails?.parentId]);

  // Handle attachment click
  const handleAttachmentClick = async (attachment: any) => {
    // Use S3 URL if available, fallback to local URI
    const fileSource = attachment.url || attachment.uri;
    
    if (attachment.type === 'image') {
      // Show image viewer
      setSelectedImage(fileSource);
      setShowImageViewer(true);
    } else if (attachment.type === 'audio') {
      // Handle audio playback in-app
      try {
        // If already playing this audio, stop it
        if (currentAudioAttachment?.id === attachment.id && audioSound) {
          await audioSound.stopAsync();
          await audioSound.unloadAsync();
          setAudioSound(null);
          setIsPlayingAudio(false);
          setCurrentAudioAttachment(null);
          return;
        }

        // If playing a different audio, stop it first
        if (audioSound) {
          await audioSound.stopAsync();
          await audioSound.unloadAsync();
          setAudioSound(null);
        }

        // Load and play the new audio
        const { sound } = await Audio.Sound.createAsync(
          { uri: fileSource },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsPlayingAudio(false);
              setCurrentAudioAttachment(null);
            }
          }
        );

        setAudioSound(sound);
        setIsPlayingAudio(true);
        setCurrentAudioAttachment(attachment);
      } catch (error) {
        console.error('Error playing audio:', error);
        Alert.alert('Error', 'Failed to play audio file');
      }
    } else {
      // For other file types, show options
      Alert.alert(
        attachment.name,
        `File type: ${attachment.type}\nSize: ${formatAttachmentSize(attachment.size)}`,
        [
          {
            text: 'Open',
            onPress: () => {
              if (fileSource) {
                Linking.openURL(fileSource).catch(err => {
                  console.error('Error opening file:', err);
                  Alert.alert('Error', 'Cannot open this file type');
                });
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return { bg: '#dcfce7', text: '#166534' };
      case 'In Progress':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'Overdue':
        return { bg: '#fee2e2', text: '#991b1b' };
      case 'To Do':
        return { bg: '#e0e7ff', text: '#3730a3' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const getStatusText = (status: string) => {
    return status;
  };

  const isNewTask = (task: any) => {
    const now = new Date().getTime();
    const taskCreated = new Date(task.createdAt).getTime();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    return (now - taskCreated) < fiveMinutes;
  };

  const getSubtaskCount = (t: any): number => {
    try {
      // Count actual subtasks that exist in the database with this task as parent
      const actualSubtasks = state.tasks.filter(task => (task as any).parentId === t.id);
      console.log(`Subtask count for "${t.title}": ${actualSubtasks.length} actual subtasks found`);
      console.log(`Parent task ID: ${t.id}`);
      console.log(`All tasks with parentId:`, state.tasks.filter(task => (task as any).parentId).map(task => ({ id: task.id, title: task.title, parentId: (task as any).parentId })));
      return actualSubtasks.length;
    } catch (error) {
      console.error('Error counting subtasks:', error);
      return 0;
    }
  };

  const buildSubtasksList = (parent: any) => {
    try {
      const byParent = state.tasks.filter(x => (x as any).parentId === parent.id);
      let byIds: any[] = [];
      try {
        if (typeof parent.subtasks === 'string' && parent.subtasks.trim()) {
          const arr = JSON.parse(parent.subtasks);
          if (Array.isArray(arr)) byIds = state.tasks.filter(x => arr.includes(x.id));
        } else if (Array.isArray(parent.subtasks)) {
          byIds = state.tasks.filter(x => parent.subtasks.includes(x.id));
        }
      } catch {}
      const map: any = {};
      [...byParent, ...byIds].forEach(x => { map[x.id] = x; });
      return Object.values(map);
    } catch {
      return [];
    }
  };

  const openSubtasksModal = (item: any) => {
    const list = buildSubtasksList(item);
    setModalSubtasks(list);
    setModalParentTitle(item.title || 'Subtasks');
    setShowSubtasksModal(true);
  };

  const closeTaskDetailsModal = () => {
    setShowTaskDetailsModal(false);
    setIsEditingTask(false);
    setEditFormData({});
    setNewComment('');
  };

  const handleAddComment = async () => {
    if (!selectedTaskForDetails || !newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    setIsAddingComment(true);
    try {
      const response = await apiService.addCommentToTask(selectedTaskForDetails.id, {
        userId: user?.id || 'unknown',
        userName: user?.name || user?.email || 'Anonymous',
        text: newComment.trim(),
      });

      if (response.success) {
        // Refresh task details to show new comment
        const updatedTaskResponse = await apiService.getTaskById(selectedTaskForDetails.id);
        if (updatedTaskResponse.success && updatedTaskResponse.data) {
          setSelectedTaskForDetails(updatedTaskResponse.data);
          dispatch({ type: 'UPDATE_TASK', payload: updatedTaskResponse.data });
        }
        setNewComment('');
      } else {
        Alert.alert('Error', response.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleSaveTaskEdit = async () => {
    if (!selectedTaskForDetails) return;
    
    console.log('=== SAVING TASK EDIT ===');
    console.log('Selected task ID:', selectedTaskForDetails.id);
    console.log('Edit form data:', editFormData);
    
    try {
      const updates: any = {
        title: editFormData.title,
        description: editFormData.description,
        project: editFormData.project,
        assignee: editFormData.assignee,
        startDate: editFormData.startDate,
        dueDate: editFormData.dueDate,
        estimatedHours: editFormData.estimatedHours,
        timeSpent: editFormData.timeSpent,
        progress: editFormData.progress,
        tags: editFormData.tags,
      };

      console.log('Updates to send:', updates);

      const response = await apiService.updateTask(selectedTaskForDetails.id, updates);
      
      console.log('Update response:', response);
      
      if (response.success && response.data) {
        console.log('Update successful, updating UI...');
        
        // Update the task in the global state
        dispatch({ type: 'UPDATE_TASK', payload: response.data });
        
        // Close modal and reset states
        setShowTaskDetailsModal(false);
        setIsEditingTask(false);
        setEditFormData({});
        setSelectedTaskForDetails(null);
        
        // Refresh tasks to ensure we have latest data and sort order
        await fetchTasks();
        
        Alert.alert('Success', 'Task updated successfully');
      } else {
        console.error('Update failed:', response.error);
        Alert.alert('Update Failed', response.error || 'Could not update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleEditTask = (taskId: string) => {
    // Open task details modal in edit mode
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      setSelectedTaskForDetails(task);
      const freshFormData = {
        title: task.title || '',
        description: task.description || '',
        project: task.project || '',
        assignee: task.assignee || '',
        startDate: task.startDate || '',
        dueDate: task.dueDate || '',
        estimatedHours: task.estimatedHours || 0,
        timeSpent: task.timeSpent || '',
        progress: task.progress || 0,
        tags: task.tags || '',
      };
      setEditFormData(freshFormData);
      setIsEditingTask(true);
      setShowTaskDetailsModal(true);
    }
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${taskTitle}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('=== TASKS SCREEN - DELETING TASK ===');
              console.log('Task ID:', taskId);
              console.log('Task Title:', taskTitle);
              dispatch({ type: 'SET_LOADING', payload: true });
              
              const response = await apiService.deleteTask(taskId);
              
              console.log('Delete response received:', response);
              
              if (response.success) {
                console.log('Task deleted successfully from database');
                // Remove task from local state
                dispatch({ type: 'DELETE_TASK', payload: taskId });
                Alert.alert('Success', 'Task deleted successfully');
              } else {
                console.error('Failed to delete task:', response.error);
                console.error('Full error response:', response);
                Alert.alert('Error', `Failed to delete task: ${response.error || 'Unknown error'}`);
              }
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', `An error occurred while deleting the task: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
              dispatch({ type: 'SET_LOADING', payload: false });
            }
          },
        },
      ]
    );
  };

  const handleMenuPress = (taskId: string, taskTitle: string) => {
    Alert.alert(
      'Task Options',
      `What would you like to do with "${taskTitle}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Edit',
          onPress: () => handleEditTask(taskId),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteTask(taskId, taskTitle),
        },
      ]
    );
  };

  const renderTaskItem = ({ item }: { item: any }) => {
    // Debug logging to see what data we're receiving
    if (__DEV__) {
      console.log('Rendering task item:', {
        id: item.id,
        title: item.title,
        assignee: item.assignee,
        project: item.project,
        fullItem: item
      });
    }

    const progress = item.progress || 0;
    const hasSubtasks = getSubtaskCount(item) > 0;
    const isOverdue = item.status === 'Overdue' || (item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'Completed');

    return (
      <View style={styles.taskCard}>
        <TouchableOpacity
          style={styles.taskCardTouchable}
          onPress={() => {
            setSelectedTaskForDetails(item);
            setIsEditingTask(false);
            setEditFormData({});
            setShowTaskDetailsModal(true);
          }}
          activeOpacity={0.8}
        >
          
          <View style={styles.taskCardContent}>
            {/* Header Row */}
            <View style={styles.taskCardHeader}>
              <View style={styles.taskCardHeaderLeft}>
                <View style={[styles.taskIconNew, { backgroundColor: getStatusColor(item.status).bg }]}> 
                  <Ionicons name="clipboard" size={18} color={getStatusColor(item.status).text} />
            </View>
            <View style={{ flex: 1 }}>
                  <Text style={styles.taskCardTitleNew} numberOfLines={2}>{item.title || 'No Title'}</Text>
                  
                  {/* Date, Status, and Time - All in one line under title */}
                  <View style={styles.dateStatusTimeRow}>
                    {/* Date Badge */}
                    {item.dueDate && (
                      <View style={[styles.dueDateBadge, isOverdue && styles.dueDateBadgeOverdue]}>
                        <Ionicons name="calendar-outline" size={10} color={isOverdue ? '#ef4444' : '#6b7280'} />
                        <Text style={[styles.dueDateBadgeText, isOverdue && styles.dueDateBadgeTextOverdue]}>
                          {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
                      </View>
                    )}
                    
                    {/* Status Badge */}
                    <View style={[styles.statusBadgeNew, { backgroundColor: getStatusColor(item.status).bg }]}>
                      <View style={[styles.statusDotNew, { backgroundColor: getStatusColor(item.status).text }]} />
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status).text }]}>
                        {getStatusText(item.status)}
                      </Text>
                    </View>

                    {/* Time Badge */}
                    {item.estimatedHours > 0 && (
                      <View style={styles.timeContainer}>
                        <Ionicons name="time-outline" size={12} color="#92400e" />
                        <Text style={styles.timeText}>{item.estimatedHours}h</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => handleMenuPress(item.id, item.title || 'Untitled Task')}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Progress Section */}
            {progress > 0 && (
              <View style={styles.progressSection}>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{progress}%</Text>
                </View>
              </View>
            )}

            {/* Assignee Section */}
            {item.assignee && (
              <View style={styles.assigneeSection}>
                <Text style={styles.assigneeLabel}>Assigned to</Text>
                <Text style={styles.assigneeName} numberOfLines={1}>{item.assignee}</Text>
              </View>
            )}

            {/* Project → Subtask/Parent Info Row (Bottom) */}
            {(item.project || item.parentId || hasSubtasks) && (
              <View style={styles.metaInfoRow}>
                {/* Project Badge (Left) */}
                {item.project && (
                  <View style={styles.projectBadge}>
                    <Ionicons name="briefcase-outline" size={10} color="#6366f1" />
                    <Text style={styles.projectBadgeText} numberOfLines={1}>{item.project}</Text>
                  </View>
                )}
                
                {/* Parent Task Badge - if this is a subtask */}
              {item.parentId && (
                <View style={styles.parentTaskBadge}>
                    <Ionicons name="git-branch-outline" size={11} color="#0277bd" />
                  <Text style={styles.parentTaskBadgeText} numberOfLines={1}>
                    Subtask of: {state.tasks.find(t => t.id === item.parentId)?.title || item.parentId}
                  </Text>
                </View>
              )}
                
                {/* Subtasks Badge - if this task has subtasks */}
                {hasSubtasks && (
                <TouchableOpacity style={styles.subtaskBadge} onPress={() => openSubtasksModal(item)}>
                    <Ionicons name="list" size={11} color="#d97706" />
                  <Text style={styles.subtaskBadgeText}>{getSubtaskCount(item)} Subtask{getSubtaskCount(item) > 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              )}
            </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderGridTaskItem = ({ item }: { item: any }) => {
    const progress = item.progress || 0;
    const hasSubtasks = getSubtaskCount(item) > 0;
    const isOverdue = item.status === 'Overdue' || (item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'Completed');

    return (
      <View style={styles.gridTaskCard}>
        <TouchableOpacity
          style={styles.gridTaskContentContainer}
          onPress={() => {
            setSelectedTaskForDetails(item);
            setIsEditingTask(false);
            setEditFormData({});
            setShowTaskDetailsModal(true);
          }}
          activeOpacity={0.8}
        >
          
          {/* Header with Status Icon */}
          <View style={styles.gridTaskHeader}>
            <View style={[styles.gridTaskIconContainer, { backgroundColor: getStatusColor(item.status).bg }]}>
              <Ionicons name="clipboard" size={16} color={getStatusColor(item.status).text} />
            </View>
            <View style={[styles.gridPriorityIndicator, { backgroundColor: getPriorityColor(item.priority || 'Medium') }]} />
          </View>

          {/* Task Title */}
          <View style={styles.gridTaskContent}>
            <Text style={styles.gridTaskTitle} numberOfLines={2}>
              {item.title || 'No Title'}
            </Text>
            {item.project && (
              <View style={styles.gridProjectBadge}>
                <Ionicons name="briefcase-outline" size={9} color="#6366f1" />
                <Text style={styles.gridProjectText} numberOfLines={1}>{item.project}</Text>
              </View>
            )}
            {/* Parent Task Badge */}
            {item.parentId && (
              <View style={styles.gridParentBadge}>
                <Ionicons name="git-branch-outline" size={9} color="#0277bd" />
                <Text style={styles.gridParentText} numberOfLines={1}>
                  Subtask
                </Text>
              </View>
            )}
            {/* Subtasks Badge */}
            {hasSubtasks && (
              <View style={styles.gridSubtaskBadgeProminent}>
                <Ionicons name="list" size={9} color="#d97706" />
                <Text style={styles.gridSubtaskTextProminent}>
                  {getSubtaskCount(item)} subtask{getSubtaskCount(item) > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          {progress > 0 && (
            <View style={styles.gridProgressSection}>
              <View style={styles.gridProgressBar}>
                <View style={[styles.gridProgressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.gridProgressTextNew}>{progress}%</Text>
            </View>
          )}

          {/* Status and Due Date Row */}
          <View style={styles.gridTaskFooter}>
            <View style={[styles.gridStatusBadge, { backgroundColor: getStatusColor(item.status).bg }]}>
              <Text style={[styles.gridStatusText, { color: getStatusColor(item.status).text }]}>
                  {getStatusText(item.status)}
                </Text>
            </View>
            
            {item.dueDate && (
              <View style={[styles.gridDueDateBadge, isOverdue && styles.gridDueDateBadgeOverdue]}>
                <Ionicons name="calendar-outline" size={9} color={isOverdue ? '#ef4444' : '#6b7280'} />
                <Text style={[styles.gridDueDateText, isOverdue && styles.gridDueDateOverdue]}>
                {new Date(item.dueDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
            )}
          </View>

          {/* Assignee Section */}
          {item.assignee && (
            <View style={styles.gridAssigneeSection}>
              <Text style={styles.gridAssigneeLabel}>Assigned to</Text>
              <Text style={styles.gridAssigneeNameText} numberOfLines={1}>{item.assignee}</Text>
            </View>
          )}

          {/* Info Row with Badges */}
          {(hasSubtasks || item.estimatedHours > 0) && (
            <View style={styles.gridBadgesContainer}>
              {hasSubtasks && (
                <View style={styles.gridSubtaskBadge}>
                  <Ionicons name="list" size={10} color="#8b5cf6" />
                  <Text style={styles.gridSubtaskText}>{getSubtaskCount(item)}</Text>
                </View>
              )}
              {item.estimatedHours > 0 && (
                <View style={styles.gridTimeBadge}>
                  <Ionicons name="time-outline" size={10} color="#f59e0b" />
                  <Text style={styles.gridTimeText}>{item.estimatedHours}h</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'High':
          return '#ef4444';
        case 'Medium':
          return '#f59e0b';
        case 'Low':
          return '#10b981';
        default:
          return '#6b7280';
      }
    };

  const { hasPermission, user } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* Sidebar */}
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />

      {/* Profile Header */}
      <ProfileHeader
        title="My Tasks"
        onMenuPress={() => setSidebarVisible(true)}
        onProfilePress={() => {
          // Handle profile navigation
        }}
        onNotificationsPress={() => (navigation as any).navigate('Notifications')}
      />
        

        {/* Search Bar and Icons */}
        <View style={[styles.searchContainer, styles.searchContainerWithBar]}>
          {showSearchBar && (
            <View style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}>
              <Ionicons name="search-outline" size={18} color="#9ca3af" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#9ca3af"
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                />
            </View>
          )}
          
          <View style={styles.iconsContainer}>
            <TouchableOpacity 
              style={styles.filterIcon}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name="filter-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.toggleIcon}
              onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              <Ionicons 
                name={viewMode === 'list' ? 'apps-outline' : 'list-outline'} 
                size={18} 
                color="#6b7280" 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Compact Filter Categories Bar */}
        {showFilters && (
          <View style={styles.filterCategoriesBar}>
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterCategoriesContent}
            >
              {[
                { key: 'status', label: 'Status', icon: 'checkmark-circle-outline' },
                { key: 'priority', label: 'Priority', icon: 'flag-outline' },
                { key: 'assignee', label: 'Assigned To', icon: 'person-outline' },
                { key: 'team', label: 'Team', icon: 'people-outline' },
                { key: 'project', label: 'Project', icon: 'briefcase-outline' },
                { key: 'date', label: 'Date', icon: 'calendar-outline' }
              ].map((category) => (
              <TouchableOpacity
                  key={category.key}
                style={[
                    styles.filterCategoryChip,
                    activeFilterCategory === category.key && styles.filterCategoryChipActive
                ]}
                  onPress={() => setActiveFilterCategory(activeFilterCategory === category.key ? null : category.key)}
              >
                  <Ionicons name={category.icon as any} size={14} color={activeFilterCategory === category.key ? '#137fec' : '#6b7280'} />
                <Text style={[
                    styles.filterCategoryChipText,
                    activeFilterCategory === category.key && styles.filterCategoryChipTextActive
                ]}>
                    {category.label}
                </Text>
              </TouchableOpacity>
              ))}
              
              {/* Clear All */}
              {(selectedStatuses.length > 0 || selectedPriorities.length > 0 || 
                selectedAssignees.length > 0 || selectedTeams.length > 0 || 
                selectedProjects.length > 0 || selectedDateFilter) && (
                <TouchableOpacity
                  style={styles.filterClearAllChip}
                  onPress={() => {
                    setSelectedStatuses([]);
                    setSelectedPriorities([]);
                    setSelectedAssignees([]);
                    setSelectedTeams([]);
                    setSelectedProjects([]);
                    setSelectedDateFilter(null);
                    setActiveFilterCategory(null);
                  }}
                >
                  <Ionicons name="close-circle" size={14} color="#ef4444" />
                  <Text style={styles.filterClearAllChipText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}

        {/* Active Filters Display */}
        {(selectedStatuses.length > 0 || selectedPriorities.length > 0 || 
          selectedAssignees.length > 0 || selectedTeams.length > 0 || 
          selectedProjects.length > 0 || selectedDateFilter) && (
          <View style={styles.activeFiltersContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activeFiltersContent}
            >
              {/* Status filters */}
              {selectedStatuses.map((status) => (
                <View key={`status-${status}`} style={styles.activeFilterPill}>
                  <Text style={styles.activeFilterPillText}>
                    Status: {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedStatuses(prev => prev.filter(s => s !== status))}
                  >
                    <Ionicons name="close-circle" size={18} color="#6b7280" />
                </TouchableOpacity>
                </View>
              ))}
              
              {/* Priority filters */}
              {selectedPriorities.map((priority) => (
                <View key={`priority-${priority}`} style={styles.activeFilterPill}>
                  <Text style={styles.activeFilterPillText}>
                    Priority: {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedPriorities(prev => prev.filter(p => p !== priority))}
                  >
                    <Ionicons name="close-circle" size={18} color="#6b7280" />
                  </TouchableOpacity>
            </View>
              ))}
              
              {/* Assignee filters */}
              {selectedAssignees.map((assigneeId) => {
                const user = users.find(u => u.id === assigneeId);
                return (
                  <View key={`assignee-${assigneeId}`} style={styles.activeFilterPill}>
                    <Text style={styles.activeFilterPillText}>
                      Assignee: {user?.name || user?.email || assigneeId}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setSelectedAssignees(prev => prev.filter(a => a !== assigneeId))}
                    >
                      <Ionicons name="close-circle" size={18} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              
              {/* Team filters */}
              {selectedTeams.map((teamId) => {
                const team = teams.find(t => t.id === teamId);
                return (
                  <View key={`team-${teamId}`} style={styles.activeFilterPill}>
                    <Text style={styles.activeFilterPillText}>
                      Team: {team?.name || teamId}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setSelectedTeams(prev => prev.filter(t => t !== teamId))}
                    >
                      <Ionicons name="close-circle" size={18} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              
              {/* Project filters */}
              {selectedProjects.map((projectId) => {
                const project = projects.find(p => p.id === projectId);
                return (
                  <View key={`project-${projectId}`} style={styles.activeFilterPill}>
                    <Text style={styles.activeFilterPillText}>
                      Project: {project?.name || projectId}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setSelectedProjects(prev => prev.filter(p => p !== projectId))}
                    >
                      <Ionicons name="close-circle" size={18} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                );
              })}
              
              {/* Date filter */}
              {selectedDateFilter && (
                <View style={styles.activeFilterPill}>
                  <Text style={styles.activeFilterPillText}>
                    Date: {selectedDateFilter === 'today' ? 'Today' : 
                           selectedDateFilter === 'week' ? 'This Week' :
                           selectedDateFilter === 'month' ? 'This Month' : 'Overdue'}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedDateFilter(null)}>
                    <Ionicons name="close-circle" size={18} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Dynamic Filter Pills Section */}
        {activeFilterCategory && (
          <View style={styles.dynamicPillsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dynamicPillsContent}
          >
              {/* Status Pills */}
              {activeFilterCategory === 'status' && (
                <>
                  {['all', 'todo', 'in progress', 'completed', 'overdue'].map((status) => (
            <TouchableOpacity
                      key={status}
              style={[
                        styles.dynamicPill,
                        (status === 'all' ? selectedStatuses.length === 0 : selectedStatuses.includes(status)) && styles.dynamicPillActive
                      ]}
                      onPress={() => {
                        if (status === 'all') {
                          setSelectedStatuses([]);
                        } else {
                          setSelectedStatuses(prev => 
                            prev.includes(status) 
                              ? prev.filter(s => s !== status)
                              : [...prev, status]
                          );
                        }
                      }}
            >
              <Text style={[
                        styles.dynamicPillText,
                        (status === 'all' ? selectedStatuses.length === 0 : selectedStatuses.includes(status)) && styles.dynamicPillTextActive
              ]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Priority Pills */}
              {activeFilterCategory === 'priority' && (
                <>
                  {['low', 'medium', 'high'].map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.dynamicPill,
                        selectedPriorities.includes(priority) && styles.dynamicPillActive
                      ]}
                      onPress={() => {
                        setSelectedPriorities(prev => 
                          prev.includes(priority)
                            ? prev.filter(p => p !== priority)
                            : [...prev, priority]
                        );
                      }}
                    >
              <Text style={[
                        styles.dynamicPillText,
                        selectedPriorities.includes(priority) && styles.dynamicPillTextActive
              ]}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Date Pills */}
              {activeFilterCategory === 'date' && (
                <>
                  {[
                    { key: 'today', label: 'Today' },
                    { key: 'week', label: 'This Week' },
                    { key: 'month', label: 'This Month' },
                    { key: 'overdue', label: 'Overdue' }
                  ].map((dateOption) => (
              <TouchableOpacity
                      key={dateOption.key}
                style={[
                        styles.dynamicPill,
                        selectedDateFilter === dateOption.key && styles.dynamicPillActive
                      ]}
                      onPress={() => {
                        setSelectedDateFilter(
                          selectedDateFilter === dateOption.key ? null : dateOption.key
                        );
                      }}
              >
                <Text style={[
                        styles.dynamicPillText,
                        selectedDateFilter === dateOption.key && styles.dynamicPillTextActive
                ]}>
                        {dateOption.label}
                </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

            </ScrollView>
          </View>
        )}

        {/* List Views for Assignee, Team, Project */}
        {activeFilterCategory && ['assignee', 'team', 'project'].includes(activeFilterCategory) && (
          <View style={styles.filterListView}>
            <ScrollView style={styles.filterListScrollView}>
              {/* Assignee List */}
              {activeFilterCategory === 'assignee' && users.length > 0 && (
                <>
                  {users.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={[
                        styles.filterListRow,
                        selectedAssignees.includes(user.id) && styles.filterListRowActive
                      ]}
                      onPress={() => {
                        setSelectedAssignees(prev =>
                          prev.includes(user.id)
                            ? prev.filter(a => a !== user.id)
                            : [...prev, user.id]
                        );
                      }}
                    >
                      <View style={styles.filterListRowLeft}>
                        <View style={styles.filterListAvatar}>
                          <Text style={styles.filterListAvatarText}>
                            {(user.name?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
                </Text>
                        </View>
                        <View>
                          <Text style={styles.filterListRowTitle}>{user.name || 'Unnamed User'}</Text>
                          {user.email && (
                            <Text style={styles.filterListRowSubtitle}>{user.email}</Text>
                          )}
                        </View>
                      </View>
                      {selectedAssignees.includes(user.id) && (
                        <Ionicons name="checkmark-circle" size={22} color="#137fec" />
                      )}
              </TouchableOpacity>
            ))}
                </>
              )}

              {/* Team List */}
              {activeFilterCategory === 'team' && teams.length > 0 && (
                <>
                  {teams.map((team) => (
                    <TouchableOpacity
                      key={team.id}
                      style={[
                        styles.filterListRow,
                        selectedTeams.includes(team.id) && styles.filterListRowActive
                      ]}
                      onPress={() => {
                        setSelectedTeams(prev =>
                          prev.includes(team.id)
                            ? prev.filter(t => t !== team.id)
                            : [...prev, team.id]
                        );
                      }}
                    >
                      <View style={styles.filterListRowLeft}>
                        <View style={[styles.filterListAvatar, { backgroundColor: '#dbeafe' }]}>
                          <Ionicons name="people" size={16} color="#137fec" />
                        </View>
                        <View>
                          <Text style={styles.filterListRowTitle}>{team.name}</Text>
                          {team.members && (
                            <Text style={styles.filterListRowSubtitle}>
                              {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                            </Text>
                          )}
                        </View>
                      </View>
                      {selectedTeams.includes(team.id) && (
                        <Ionicons name="checkmark-circle" size={22} color="#137fec" />
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Project List */}
              {activeFilterCategory === 'project' && projects.length > 0 && (
                <>
                  {projects.map((project) => (
                    <TouchableOpacity
                      key={project.id}
                      style={[
                        styles.filterListRow,
                        selectedProjects.includes(project.id) && styles.filterListRowActive
                      ]}
                      onPress={() => {
                        setSelectedProjects(prev =>
                          prev.includes(project.id)
                            ? prev.filter(p => p !== project.id)
                            : [...prev, project.id]
                        );
                      }}
                    >
                      <View style={styles.filterListRowLeft}>
                        <View style={[styles.filterListAvatar, { backgroundColor: '#dcfce7' }]}>
                          <Ionicons name="briefcase" size={16} color="#10b981" />
                        </View>
                        <View>
                          <Text style={styles.filterListRowTitle}>{project.name}</Text>
                          {project.status && (
                            <Text style={styles.filterListRowSubtitle}>
                              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                            </Text>
                          )}
                        </View>
                      </View>
                      {selectedProjects.includes(project.id) && (
                        <Ionicons name="checkmark-circle" size={22} color="#137fec" />
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}
          </ScrollView>
        </View>
        )}

        {/* Task List/Grid */}
        {isLoading && tasks.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#137fec" />
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#e2e8f0" />
            <Text style={styles.emptyText}>No tasks found</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh or create a new task</Text>
          </View>
        ) : (
          <FlatList
            key={viewMode} // Force re-render when view mode changes
            data={tasks}
            extraData={state.tasks} // Force re-render when tasks array changes
            renderItem={viewMode === 'list' ? renderTaskItem : renderGridTaskItem}
            keyExtractor={(item) => item.id}
            style={styles.taskList}
            showsVerticalScrollIndicator={false}
            numColumns={viewMode === 'grid' ? 2 : 1}
            columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
            contentContainerStyle={viewMode === 'grid' ? styles.gridContainer : undefined}
            ItemSeparatorComponent={viewMode === 'list' ? () => <View style={styles.separator} /> : undefined}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#137fec']}
                tintColor="#137fec"
              />
            }
          />
        )}
        {/* Subtasks Modal */}
        <Modal
          visible={showSubtasksModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSubtasksModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{modalParentTitle}</Text>
                <TouchableOpacity onPress={() => setShowSubtasksModal(false)}>
                  <Ionicons name="close" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
              {modalSubtasks.length === 0 ? (
                <Text style={{ color: '#9ca3af', paddingVertical: 12 }}>No subtasks</Text>
              ) : (
                <ScrollView style={{ maxHeight: 300 }}>
                  {modalSubtasks.map((st: any) => (
                    <TouchableOpacity key={st.id} style={styles.modalRow}
                      onPress={() => {
                        setShowSubtasksModal(false);
                        setSelectedTaskForDetails(st);
                        setIsEditingTask(false);
                        setEditFormData({});
                        setShowTaskDetailsModal(true);
                      }}
                    >
                      <View style={[styles.modalStatus, { backgroundColor: getStatusColor(st.status).bg }]}> 
                        <Text style={[styles.modalStatusText, { color: getStatusColor(st.status).text }]}>{st.status}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalTitleText} numberOfLines={1}>{st.title || 'Untitled'}</Text>
                        <Text style={styles.modalMeta} numberOfLines={1}>{st.assignee || 'Unassigned'} • {st.dueDate || 'No date'}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Task Details Modal */}
        <Modal
          visible={showTaskDetailsModal}
          transparent
          animationType="slide"
          onRequestClose={closeTaskDetailsModal}
        >
          <View style={styles.taskDetailsBackdrop}>
            <TouchableOpacity 
              style={styles.taskDetailsBackdropTouchable}
              activeOpacity={1}
              onPress={closeTaskDetailsModal}
            />
            <View style={[styles.taskDetailsModal, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
            <View style={styles.taskDetailsHeader}>
              <Text style={styles.taskDetailsTitle}>Task Details</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => {
                  if (isEditingTask) {
                    // Save changes
                    handleSaveTaskEdit();
                  } else {
                    // Start editing - ensure we have fresh data
                    const freshFormData = {
                      title: selectedTaskForDetails.title || '',
                      description: selectedTaskForDetails.description || '',
                      project: selectedTaskForDetails.project || '',
                      assignee: selectedTaskForDetails.assignee || '',
                      startDate: selectedTaskForDetails.startDate || '',
                      dueDate: selectedTaskForDetails.dueDate || '',
                      estimatedHours: selectedTaskForDetails.estimatedHours || 0,
                      timeSpent: selectedTaskForDetails.timeSpent || '',
                      progress: selectedTaskForDetails.progress || 0,
                      tags: selectedTaskForDetails.tags || '',
                    };
                    setEditFormData(freshFormData);
                    setIsEditingTask(true);
                  }
                }}>
                  <Ionicons name={isEditingTask ? "checkmark" : "pencil"} size={20} color="#0ea5e9" />
                </TouchableOpacity>
                <TouchableOpacity onPress={closeTaskDetailsModal}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
              
              {selectedTaskForDetails && (
                <ScrollView style={styles.taskDetailsContent} showsVerticalScrollIndicator={false}>
                  {/* Task Info */}
                  <View style={styles.taskDetailsInfo}>
                    {/* Task Title */}
                    {isEditingTask ? (
                      <TextInput
                        style={styles.taskDetailsTitleInput}
                        value={editFormData.title || ''}
                        onChangeText={(value) => setEditFormData({...editFormData, title: value})}
                        placeholder="Task title"
                      />
                    ) : (
                      <Text style={styles.taskDetailsTitle}>{selectedTaskForDetails?.title || 'No Title'}</Text>
                    )}

                    <View style={styles.taskDetailsMeta}>
                      <View style={styles.taskDetailsPriorityContainer}>
                        <View
                          style={[
                            styles.taskDetailsPriorityDot,
                            { backgroundColor: getPriorityColor(selectedTaskForDetails?.priority || 'Medium') },
                          ]}
                        />
                        <Text style={styles.taskDetailsPriorityText}>{selectedTaskForDetails?.priority || 'Medium'} Priority</Text>
                      </View>
                      <View
                        style={[
                          styles.taskDetailsStatusBadge,
                          { backgroundColor: getStatusColor(selectedTaskForDetails?.status || 'To Do').bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.taskDetailsStatusText,
                            { color: getStatusColor(selectedTaskForDetails?.status || 'To Do').text },
                          ]}
                        >
                          {selectedTaskForDetails?.status || 'To Do'}
                        </Text>
                      </View>
                    </View>

                    {isEditingTask ? (
                      <TextInput
                        style={styles.taskDetailsDescriptionInput}
                        value={editFormData.description || ''}
                        onChangeText={(value) => setEditFormData({...editFormData, description: value})}
                        placeholder="Task description"
                        multiline
                        numberOfLines={4}
                      />
                    ) : (
                      <Text style={styles.taskDetailsDescription}>{selectedTaskForDetails?.description || 'No description provided'}</Text>
                    )}

                    {/* Parent Task (if subtask) */}
                    {selectedTaskForDetails?.parentId && (
                      <View style={styles.parentTaskSection}>
                        <View style={styles.parentTaskHeader}>
                          <Ionicons name="link-outline" size={16} color="#6b7280" />
                          <Text style={styles.parentTaskLabel}>Part of Parent Task</Text>
                        </View>
                        {loadingParentTask ? (
                          <ActivityIndicator size="small" color="#3b82f6" />
                        ) : parentTask ? (
                          <TouchableOpacity 
                            style={styles.parentTaskCard}
                            onPress={() => {
                              setSelectedTaskForDetails(parentTask);
                              setIsEditingTask(false);
                              setEditFormData({});
                            }}
                          >
                            <View style={styles.parentTaskContent}>
                              <Text style={styles.parentTaskTitle} numberOfLines={1}>
                                {parentTask.title || 'Untitled Task'}
                              </Text>
                              <Text style={styles.parentTaskMeta} numberOfLines={1}>
                                {parentTask.status} • {parentTask.priority} Priority
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.parentTaskError}>Parent task not found</Text>
                        )}
                      </View>
                    )}

                    {/* Task Details Grid */}
                    <View style={styles.taskDetailsGrid}>
                      <View style={styles.taskDetailsItem}>
                        <Text style={styles.taskDetailsLabel}>Project</Text>
                        {isEditingTask ? (
                          <TextInput
                            style={styles.taskDetailsInput}
                            value={editFormData.project || ''}
                            onChangeText={(value) => setEditFormData({...editFormData, project: value})}
                            placeholder="Project name"
                          />
                        ) : (
                          <Text style={styles.taskDetailsValue}>{selectedTaskForDetails?.project || 'No project'}</Text>
                        )}
                      </View>
                      <View style={styles.taskDetailsItem}>
                        <Text style={styles.taskDetailsLabel}>Assignee</Text>
                        {isEditingTask ? (
                          <TextInput
                            style={styles.taskDetailsInput}
                            value={editFormData.assignee || ''}
                            onChangeText={(value) => setEditFormData({...editFormData, assignee: value})}
                            placeholder="Assignee name"
                          />
                        ) : (
                          <Text style={styles.taskDetailsValue}>{selectedTaskForDetails?.assignee || 'No assignee'}</Text>
                        )}
                      </View>
                      <View style={styles.taskDetailsItem}>
                        <Text style={styles.taskDetailsLabel}>Start Date</Text>
                        {isEditingTask ? (
                          <TextInput
                            style={styles.taskDetailsInput}
                            value={editFormData.startDate || ''}
                            onChangeText={(value) => setEditFormData({...editFormData, startDate: value})}
                            placeholder="YYYY-MM-DD"
                          />
                        ) : (
                          <Text style={styles.taskDetailsValue}>
                            {selectedTaskForDetails?.startDate ? new Date(selectedTaskForDetails.startDate).toLocaleDateString() : 'Not set'}
                          </Text>
                        )}
                      </View>
                      <View style={styles.taskDetailsItem}>
                        <Text style={styles.taskDetailsLabel}>Due Date</Text>
                        {isEditingTask ? (
                          <TextInput
                            style={styles.taskDetailsInput}
                            value={editFormData.dueDate || ''}
                            onChangeText={(value) => setEditFormData({...editFormData, dueDate: value})}
                            placeholder="YYYY-MM-DD"
                          />
                        ) : (
                          <Text style={styles.taskDetailsValue}>
                            {selectedTaskForDetails?.dueDate ? new Date(selectedTaskForDetails.dueDate).toLocaleDateString() : 'Not set'}
                          </Text>
                        )}
                      </View>
                      <View style={styles.taskDetailsItem}>
                        <Text style={styles.taskDetailsLabel}>Estimated Hours</Text>
                        {isEditingTask ? (
                          <TextInput
                            style={styles.taskDetailsInput}
                            value={editFormData.estimatedHours?.toString() || ''}
                            onChangeText={(value) => setEditFormData({...editFormData, estimatedHours: parseFloat(value) || 0})}
                            placeholder="0"
                            keyboardType="numeric"
                          />
                        ) : (
                          <Text style={styles.taskDetailsValue}>{selectedTaskForDetails?.estimatedHours || 0}h</Text>
                        )}
                      </View>
                      <View style={styles.taskDetailsItem}>
                        <Text style={styles.taskDetailsLabel}>Time Spent</Text>
                        {isEditingTask ? (
                          <TextInput
                            style={styles.taskDetailsInput}
                            value={editFormData.timeSpent || ''}
                            onChangeText={(value) => setEditFormData({...editFormData, timeSpent: value})}
                            placeholder="0h"
                          />
                        ) : (
                          <Text style={styles.taskDetailsValue}>{selectedTaskForDetails?.timeSpent || '0'}h</Text>
                        )}
                      </View>
                    </View>

                    {/* Progress */}
                    <View style={styles.taskDetailsProgressSection}>
                      <View style={styles.taskDetailsProgressHeader}>
                        <Text style={styles.taskDetailsProgressLabel}>Progress</Text>
                        {isEditingTask ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TextInput
                              style={[styles.taskDetailsInput, { width: 60, textAlign: 'center' }]}
                              value={editFormData.progress?.toString() || '0'}
                              onChangeText={(value) => setEditFormData({...editFormData, progress: Math.max(0, Math.min(100, parseInt(value) || 0))})}
                              placeholder="0"
                              keyboardType="numeric"
                            />
                            <Text style={styles.taskDetailsProgressPercentage}>%</Text>
                          </View>
                        ) : (
                          <Text style={styles.taskDetailsProgressPercentage}>{selectedTaskForDetails?.progress || 0}%</Text>
                        )}
                      </View>
                      <View style={styles.taskDetailsProgressBar}>
                        <View
                          style={[
                            styles.taskDetailsProgressFill,
                            { width: `${isEditingTask ? (editFormData.progress || 0) : (selectedTaskForDetails?.progress || 0)}%` },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Subtasks */}
                    <View style={styles.taskDetailsSubtasksSection}>
                      <View style={styles.taskDetailsSubtasksHeader}>
                        <Text style={styles.taskDetailsSectionTitle}>Subtasks ({buildSubtasksList(selectedTaskForDetails).length})</Text>
                        <TouchableOpacity 
                          onPress={() => {
                            setShowTaskDetailsModal(false);
                            setShowCreateTaskModal(true);
                            // Pass parent task ID through state or props
                          }} 
                          style={styles.taskDetailsAddSubtaskBtn}
                        >
                          <Ionicons name="add-circle-outline" size={18} color="#0ea5e9" />
                          <Text style={styles.taskDetailsAddSubtaskText}>Subtask</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.taskDetailsSubtasksList}>
                        {buildSubtasksList(selectedTaskForDetails).length === 0 ? (
                          <Text style={{ color: '#9ca3af' }}>No subtasks yet</Text>
                        ) : (
                          buildSubtasksList(selectedTaskForDetails).map((st: any) => (
                            <TouchableOpacity 
                              key={st.id} 
                              style={styles.taskDetailsSubtaskItem} 
                              onPress={() => {
                                setSelectedTaskForDetails(st);
                                setIsEditingTask(false);
                                setEditFormData({});
                              }}
                            >
                              <View style={[styles.taskDetailsSubtaskStatus, { backgroundColor: getStatusColor(st.status).bg }]}> 
                                <Text style={[styles.taskDetailsSubtaskStatusText, { color: getStatusColor(st.status).text }]}>{st.status}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.taskDetailsSubtaskTitle} numberOfLines={1}>{st.title || 'Untitled'}</Text>
                                <Text style={styles.taskDetailsSubtaskMeta} numberOfLines={1}>{st.assignee || 'Unassigned'} • {st.dueDate || 'No date'}</Text>
                              </View>
                              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    </View>

                    {/* Tags */}
                    {selectedTaskForDetails?.tags && selectedTaskForDetails.tags.trim() && (
                      <View style={styles.taskDetailsTagsSection}>
                        <Text style={styles.taskDetailsSectionTitle}>Tags</Text>
                        <View style={styles.taskDetailsTagsContainer}>
                          {selectedTaskForDetails.tags.split(',').map((tag: string, index: number) => (
                            <View key={index} style={styles.taskDetailsTag}>
                              <Text style={styles.taskDetailsTagText}>{tag.trim()}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Attachments */}
                    {selectedTaskForDetails?.attachments && (() => {
                      try {
                        const attachmentsList = JSON.parse(selectedTaskForDetails.attachments);
                        if (Array.isArray(attachmentsList) && attachmentsList.length > 0) {
                          return (
                            <View style={styles.taskDetailsAttachmentsSection}>
                              <Text style={styles.taskDetailsSectionTitle}>Attachments ({attachmentsList.length})</Text>
                              <View style={styles.taskDetailsAttachmentsList}>
                                {attachmentsList.map((attachment: any) => {
                                  const isThisAudioPlaying = attachment.type === 'audio' && 
                                                              currentAudioAttachment?.id === attachment.id && 
                                                              isPlayingAudio;
                                  
                                  return (
                                    <TouchableOpacity 
                                      key={attachment.id} 
                                      style={[
                                        styles.taskDetailsAttachmentItem,
                                        isThisAudioPlaying && styles.taskDetailsAttachmentItemPlaying
                                      ]}
                                      onPress={() => handleAttachmentClick(attachment)}
                                      activeOpacity={0.7}
                                    >
                                      {attachment.type === 'image' && (attachment.url || attachment.uri) ? (
                                        <Image 
                                          source={{ uri: attachment.url || attachment.uri }} 
                                          style={styles.taskDetailsAttachmentThumbnail} 
                                        />
                                      ) : (
                                        <View style={[
                                          styles.taskDetailsAttachmentIcon,
                                          isThisAudioPlaying && styles.taskDetailsAttachmentIconPlaying
                                        ]}>
                                          <Ionicons 
                                            name={getAttachmentIcon(attachment.type) as any} 
                                            size={24} 
                                            color={isThisAudioPlaying ? '#8b5cf6' : '#3b82f6'} 
                                          />
                                        </View>
                                      )}
                                      <View style={styles.taskDetailsAttachmentInfo}>
                                        <Text style={styles.taskDetailsAttachmentName} numberOfLines={1}>
                                          {attachment.name}
                                        </Text>
                                        <Text style={styles.taskDetailsAttachmentMeta}>
                                          {attachment.duration ? `${Math.floor(attachment.duration / 60)}:${(attachment.duration % 60).toString().padStart(2, '0')} • ` : ''}
                                          {formatAttachmentSize(attachment.size)} • {attachment.type}
                                          {isThisAudioPlaying && ' • Playing...'}
                                        </Text>
                                      </View>
                                      <Ionicons 
                                        name={
                                          attachment.type === 'image' ? 'eye-outline' : 
                                          attachment.type === 'audio' ? (isThisAudioPlaying ? 'stop-circle' : 'play-circle') :
                                          'open-outline'
                                        } 
                                        size={20} 
                                        color={isThisAudioPlaying ? '#8b5cf6' : '#3b82f6'} 
                                      />
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </View>
                          );
                        }
                      } catch (e) {
                        console.error('Error parsing attachments:', e);
                      }
                      return null;
                    })()}

                    {/* Threads/Comments Section */}
                    <View style={styles.taskDetailsThreadsSection}>
                      <Text style={styles.taskDetailsSectionTitle}>
                        Threads ({selectedTaskForDetails?.threads ? (JSON.parse(selectedTaskForDetails.threads).length || 0) : 0})
                      </Text>
                      
                      {/* Comments List */}
                      {(() => {
                        try {
                          const threads = selectedTaskForDetails?.threads 
                            ? JSON.parse(selectedTaskForDetails.threads) 
                            : [];
                          
                          return (
                            <View style={styles.threadsList}>
                              {threads.length === 0 ? (
                                <Text style={styles.noThreadsText}>No comments yet. Be the first to comment!</Text>
                              ) : (
                                threads.map((comment: any) => (
                                  <View key={comment.id} style={styles.threadItem}>
                                    <View style={styles.threadAvatar}>
                                      <Ionicons name="person" size={16} color="#3b82f6" />
                                    </View>
                                    <View style={styles.threadContent}>
                                      <View style={styles.threadHeader}>
                                        <Text style={styles.threadUserName}>{comment.userName}</Text>
                                        <Text style={styles.threadTime}>
                                          {new Date(comment.createdAt).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </Text>
                                      </View>
                                      <Text style={styles.threadText}>{comment.text}</Text>
                                    </View>
                                  </View>
                                ))
                              )}
                            </View>
                          );
                        } catch (e) {
                          return <Text style={styles.noThreadsText}>Error loading comments</Text>;
                        }
                      })()}
                      
                      {/* Add Comment Input */}
                      <View style={styles.addCommentSection}>
                        <View style={styles.commentInputWrapper}>
                          <TextInput
                            style={styles.commentInput}
                            placeholder="Add a comment..."
                            placeholderTextColor="#9ca3af"
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                            maxLength={500}
                          />
                          <TouchableOpacity
                            style={styles.sendCommentButton}
                            onPress={handleAddComment}
                            disabled={isAddingComment || !newComment.trim()}
                          >
                            {isAddingComment ? (
                              <ActivityIndicator size="small" color="#3b82f6" />
                            ) : (
                              <Ionicons name="send" size={20} color={newComment.trim() ? '#3b82f6' : '#d1d5db'} />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Create Task Modal */}
        <Modal
          visible={showCreateTaskModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCreateTaskModal(false)}
        >
          <View style={styles.taskDetailsBackdrop}>
            <TouchableOpacity 
              style={styles.taskDetailsBackdropTouchable}
              activeOpacity={1}
              onPress={() => setShowCreateTaskModal(false)}
            />
            <View style={[styles.taskDetailsModal, { maxHeight: '90%', minHeight: '80%', paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
              <View style={styles.taskDetailsHeader}>
                <Text style={styles.taskDetailsTitle}>Create Task</Text>
                <TouchableOpacity onPress={() => setShowCreateTaskModal(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.taskDetailsContent} showsVerticalScrollIndicator={false}>
                <CreateTaskForm 
                  onClose={() => setShowCreateTaskModal(false)}
                  parentTaskId={selectedTaskForDetails?.id}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Edit Task Modal */}
        <Modal
          visible={showEditTaskModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEditTaskModal(false)}
        >
          <View style={styles.taskDetailsBackdrop}>
            <TouchableOpacity 
              style={styles.taskDetailsBackdropTouchable}
              activeOpacity={1}
              onPress={() => setShowEditTaskModal(false)}
            />
            <View style={[styles.taskDetailsModal, { maxHeight: '90%', minHeight: '80%', paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
              <View style={styles.taskDetailsHeader}>
                <Text style={styles.taskDetailsTitle}>Edit Task</Text>
                <TouchableOpacity onPress={() => setShowEditTaskModal(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.taskDetailsContent} showsVerticalScrollIndicator={false}>
                {/* Import EditTaskScreen component here or create inline form */}
                <Text style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
                  Edit Task Form will be embedded here
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Image Viewer Modal */}
        <Modal
          visible={showImageViewer}
          transparent
          animationType="fade"
          onRequestClose={() => setShowImageViewer(false)}
        >
          <View style={styles.imageViewerBackdrop}>
            <TouchableOpacity 
              style={styles.imageViewerCloseButton}
              onPress={() => setShowImageViewer(false)}
            >
              <Ionicons name="close-circle" size={36} color="#ffffff" />
            </TouchableOpacity>
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingBottom: 45, // Add space for bottom tab bar
  },
  header: {
    backgroundColor: '#f1f5f9  ',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTaskButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#137fec',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#137fec',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  taskList: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 8,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  taskCardTouchable: {
    position: 'relative',
  },
  priorityBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  taskCardContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingLeft: 20,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  taskCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  taskIconNew: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginLeft: -12,
  },
  taskCardTitleNew: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#111827',
    lineHeight: 20,
    marginBottom: 2,
  },
  dateStatusTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: -12,
  },
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  projectBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
  },
  timeContainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#f59e0b',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  timeTextHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
  taskCardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  statusBadgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDotNew: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priorityBadgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  dueDateBadgeOverdue: {
    backgroundColor: '#fee2e2',
  },
  dueDateBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
  },
  dueDateBadgeTextOverdue: {
    color: '#ef4444',
  },
  progressSection: {
    marginBottom: 4,
    marginTop: 0,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
    minWidth: 32,
    textAlign: 'right',
  },
  assigneeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    marginTop: -8,
  },
  assigneeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
  },
  assigneeName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  taskCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    marginTop: 0,
  },
  taskCardFooterLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  assigneeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#137fec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeInitial: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  assigneeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    maxWidth: 100,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10b981',
  },
  subtaskBadgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  subtaskBadgeTextNew: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  parentBadgeNew: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    flexWrap: 'wrap',
  },
  tagChip: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tagChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  moreTagsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
  },
  taskCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  taskIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  taskCardMeta: { fontSize: 12, color: '#6b7280' },
  taskCardSubtext: { fontSize: 11, color: '#9ca3af' },
  subtaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  subtaskBadgeText: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#6b7280',
    letterSpacing: 0.2,
  },
  parentTaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  parentTaskBadgeText: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#6b7280',
    letterSpacing: 0.2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalStatus: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  modalStatusText: { fontSize: 9, fontWeight: '700' },
  modalTitleText: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  modalMeta: { fontSize: 11, color: '#6b7280' },
  
  // Task Details Modal Styles
  taskDetailsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  taskDetailsBackdropTouchable: {
    flex: 1,
  },
  taskDetailsModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    minHeight: '65%',
  },
  taskDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  taskDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  taskDetailsContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  taskDetailsInfo: {
    paddingVertical: 16,
  },
  taskDetailsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  taskDetailsPriorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskDetailsPriorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskDetailsPriorityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  taskDetailsStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  taskDetailsStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskDetailsDescription: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 24,
  },
  parentTaskSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  parentTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  parentTaskLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  parentTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  parentTaskContent: {
    flex: 1,
  },
  parentTaskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  parentTaskMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  parentTaskError: {
    fontSize: 13,
    color: '#ef4444',
    fontStyle: 'italic',
  },
  taskDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  taskDetailsItem: {
    width: '45%',
  },
  taskDetailsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  taskDetailsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  taskDetailsProgressSection: {
    marginBottom: 24,
  },
  taskDetailsProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskDetailsProgressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  taskDetailsProgressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#137fec',
  },
  taskDetailsProgressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  taskDetailsProgressFill: {
    height: '100%',
    backgroundColor: '#137fec',
    borderRadius: 4,
  },
  taskDetailsSubtasksSection: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  taskDetailsSubtasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskDetailsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  taskDetailsAddSubtaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
  },
  taskDetailsAddSubtaskText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#137fec',
  },
  taskDetailsSubtasksList: {
    gap: 8,
  },
  taskDetailsSubtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 3,
    borderLeftColor: '#137fec',
  },
  taskDetailsSubtaskStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  taskDetailsSubtaskStatusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  taskDetailsSubtaskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  taskDetailsSubtaskMeta: {
    fontSize: 11,
    color: '#6b7280',
  },
  taskDetailsTagsSection: {
    marginBottom: 24,
  },
  taskDetailsTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  taskDetailsTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  taskDetailsTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  taskDetailsTitleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    lineHeight: 32,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  taskDetailsDescriptionInput: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
    marginBottom: 24,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  taskDetailsInput: {
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  taskContentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  taskDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusContainer: {
    marginRight: 8,
  },
  menuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginTop: -16,
    marginRight: -16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginLeft: 16,
  },
  // Grid View Styles
  gridContainer: {
    padding: 16,
    paddingBottom: 100,
    backgroundColor: '#f1f5f9',
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridTaskCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
    minHeight: 160,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  gridTaskContentContainer: {
    padding: 14,
    flex: 1,
    position: 'relative',
  },
  gridPriorityBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  gridTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 2,
  },
  gridTaskIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridPriorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gridTaskContent: {
    flex: 1,
    marginBottom: 10,
  },
  gridTaskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 18,
    marginBottom: 6,
  },
  gridProjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  gridProjectText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6366f1',
  },
  gridParentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  gridParentText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0277bd',
  },
  gridSubtaskBadgeProminent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  gridSubtaskTextProminent: {
    fontSize: 9,
    fontWeight: '700',
    color: '#d97706',
  },
  gridProgressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  gridProgressBar: {
    flex: 1,
    height: 5,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  gridProgressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  gridProgressTextNew: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
    minWidth: 28,
    textAlign: 'right',
  },
  gridTaskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  gridStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  gridStatusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  gridDueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gridDueDateBadgeOverdue: {
    backgroundColor: '#fee2e2',
  },
  gridDueDateText: {
    fontSize: 9,
    color: '#6b7280',
    fontWeight: '600',
  },
  gridDueDateOverdue: {
    color: '#ef4444',
  },
  gridAssigneeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
    marginTop: -4,
  },
  gridAssigneeLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6b7280',
  },
  gridAssigneeNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1f2937',
  },
  gridInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridAssigneeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  gridAssigneeAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#137fec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridAssigneeInitial: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  gridAssigneeName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    maxWidth: 80,
  },
  gridBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gridBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gridSubtaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gridSubtaskText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  gridTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gridTimeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#f59e0b',
  },
  gridStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridTaskDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  gridProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  gridProgressText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
  },
  gridMenuButton: {
    padding: 2,
    borderRadius: 4,
  },
  gridTaskIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#137fec',
    opacity: 0.1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridDueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridDueDate: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: '#f1f5f9',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minHeight: 48,
  },
  searchContainerWithBar: {
    justifyContent: 'space-between',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 36,
    marginRight: 12,
  },
  searchBarFocused: {
    backgroundColor: '#ffffff',
    borderColor: '#1e40af',
    borderWidth: 1.5,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 0,
    height: 20,
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Status Pills Styles
  statusPillsContainer: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
  },
  statusPillsContent: {
    paddingHorizontal: 16,
    gap: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 4,
    height: 28,
  },
  statusPillActive: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusPillAll: {
    backgroundColor: '#137fec',
    borderColor: '#137fec',
  },
  statusPillNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 4,
    lineHeight: 16,
  },
  statusPillNumberActive: {
    color: '#ffffff',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    lineHeight: 16,
  },
  statusPillTextActive: {
    fontWeight: '600',
    color: '#ffffff',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Filter Dropdown Styles
  filterCategoriesBar: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterCategoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  filterCategoryChipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#137fec',
  },
  filterCategoryChipText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterCategoryChipTextActive: {
    color: '#137fec',
    fontWeight: '600',
  },
  filterClearAllChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 4,
  },
  filterClearAllChipText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  dynamicPillsContainer: {
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dynamicPillsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dynamicPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dynamicPillActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#137fec',
    borderWidth: 1.5,
  },
  dynamicPillText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  dynamicPillTextActive: {
    color: '#137fec',
    fontWeight: '600',
  },
  filterListView: {
    backgroundColor: '#ffffff',
    maxHeight: 300,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterListScrollView: {
    maxHeight: 300,
  },
  filterListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterListRowActive: {
    backgroundColor: '#f0f9ff',
  },
  filterListRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  filterListAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterListAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterListRowTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  filterListRowSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  filterDropdown: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 1000,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 180,
  },
  filterDropdownContent: {
    padding: 8,
  },
  filterDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterDropdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterCloseButton: {
    padding: 4,
    borderRadius: 4,
  },
  filterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  filterDropdownItemActive: {
    backgroundColor: '#f3f4f6',
  },
  filterDropdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  filterDropdownTextActive: {
    fontWeight: '600',
    color: '#137fec',
  },
  filterStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    backgroundColor: '#f1f5f9',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  // New Task Indicator Styles
  newTaskIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  newTaskText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  newTaskSubtext: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
    marginTop: 4,
  },
  gridNewTaskBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  gridNewTaskText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'white',
  },
  // Attachments styles
  taskDetailsAttachmentsSection: {
    marginBottom: 24,
  },
  taskDetailsAttachmentsList: {
    gap: 10,
  },
  taskDetailsAttachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
  },
  taskDetailsAttachmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskDetailsAttachmentItemPlaying: {
    backgroundColor: '#f5f3ff',
    borderColor: '#8b5cf6',
    borderWidth: 2,
  },
  taskDetailsAttachmentIconPlaying: {
    backgroundColor: '#ede9fe',
  },
  taskDetailsAttachmentInfo: {
    flex: 1,
  },
  taskDetailsAttachmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  taskDetailsAttachmentMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  taskDetailsAttachmentThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  // Threads/Comments styles
  taskDetailsThreadsSection: {
    marginBottom: 24,
  },
  threadsList: {
    gap: 12,
    marginBottom: 16,
  },
  noThreadsText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  threadItem: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  threadAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadContent: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  threadUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  threadTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
  threadText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  addCommentSection: {
    marginTop: 12,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 8,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    maxHeight: 100,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  sendCommentButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Image Viewer styles
  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
  // Compact Filter Styles
  filterSection: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  compactFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  compactFilterPillActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#137fec',
  },
  compactPillText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  compactPillTextActive: {
    color: '#137fec',
    fontWeight: '600',
  },
  compactClearButton: {
    marginVertical: 8,
    marginHorizontal: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
    alignItems: 'center',
  },
  compactClearText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  activeFiltersContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  activeFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#dbeafe',
    borderRadius: 16,
    gap: 6,
  },
  activeFilterPillText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
  },
});

// Helper functions for attachments
const getAttachmentIcon = (type: string): string => {
  switch (type) {
    case 'image': return 'image';
    case 'video': return 'videocam';
    case 'audio': return 'musical-notes';
    case 'pdf': return 'document-text';
    case 'document': return 'document';
    case 'spreadsheet': return 'grid';
    case 'presentation': return 'easel';
    case 'archive': return 'archive';
    default: return 'document-attach';
  }
};

const formatAttachmentSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export default TasksScreen;