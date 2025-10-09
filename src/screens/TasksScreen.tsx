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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/api';
import CreateTaskForm from '../components/CreateTaskForm';
import ProfileHeader from '../components/ProfileHeader';
import Sidebar from '../components/Sidebar';

const TasksScreen = () => {
  const navigation = useNavigation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const { state, dispatch } = useAppContext();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
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

  // Sort tasks by creation date (newest first) and filter by search query and status
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
      
      // Filter by status
      if (selectedStatus) {
        return task.status === selectedStatus;
      }
      
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Newest first
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
        // Update the selected task data
        setSelectedTaskForDetails({ ...selectedTaskForDetails, ...response.data });
        setIsEditingTask(false);
        
        // Update the task in the global state
        dispatch({ type: 'UPDATE_TASK', payload: response.data });
        
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
    // Open edit modal instead of navigating to separate screen
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
      setSelectedTaskForEdit(task);
      setShowEditTaskModal(true);
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

    return (
      <View style={styles.taskCard}>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
          onPress={() => {
            setSelectedTaskForDetails(item);
            setShowTaskDetailsModal(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.taskCardLeft}>
            <View style={styles.taskIcon}> 
              <Ionicons name="clipboard" size={22} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskCardTitle} numberOfLines={1}>{item.title || 'No Title'}</Text>
              <Text style={styles.taskCardMeta} numberOfLines={1}>
                {getStatusText(item.status)} • {item.dueDate || 'No Date'}
              </Text>
              {item.parentId && (
                <View style={styles.parentTaskBadge}>
                  <Text style={styles.parentTaskBadgeText} numberOfLines={1}>
                    Subtask of: {state.tasks.find(t => t.id === item.parentId)?.title || item.parentId}
                  </Text>
                </View>
              )}
              {getSubtaskCount(item) > 0 && (
                <TouchableOpacity style={styles.subtaskBadge} onPress={() => openSubtasksModal(item)}>
                  <Text style={styles.subtaskBadgeText}>{getSubtaskCount(item)} Subtask{getSubtaskCount(item) > 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleMenuPress(item.id, item.title || 'Untitled Task')}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color="#6b7280" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderGridTaskItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.gridTaskCard}>
        <TouchableOpacity
          style={styles.gridTaskContentContainer}
          onPress={() => {
            setSelectedTaskForDetails(item);
            setShowTaskDetailsModal(true);
          }}
        >
          {/* Task Title */}
          <View style={styles.gridTaskContent}>
            <Text style={styles.gridTaskTitle} numberOfLines={2}>
              {item.title || 'No Title'}
            </Text>
          </View>

          {/* Task Footer */}
          <View style={styles.gridTaskFooter}>
            <View style={styles.gridStatusContainer}>
              <View
                style={[
                  styles.gridStatusBadge,
                  { backgroundColor: getStatusColor(item.status).bg },
                ]}
              >
                <Text
                  style={[
                    styles.gridStatusText,
                    { color: getStatusColor(item.status).text },
                  ]}
                >
                  {getStatusText(item.status)}
                </Text>
              </View>
            </View>
            
            <View style={styles.gridDueDateContainer}>
              <Text style={styles.gridDueDate}>
                {new Date(item.dueDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
          </View>
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Sidebar */}
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />

      {/* Profile Header */}
      <ProfileHeader
        title="My Tasks"
        subtitle="Task management"
        rightElement={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateTaskModal(true)}
          >
            <Ionicons name="add-circle" size={24} color="#0ea5e9" />
          </TouchableOpacity>
        }
        onMenuPress={() => setSidebarVisible(true)}
        onProfilePress={() => {
          // Handle profile navigation
        }}
        onRightElementPress={() => setShowCreateTaskModal(true)}
      />
        

        {/* Search Bar and Icons */}
        <View style={[styles.searchContainer, showSearchBar && styles.searchContainerWithBar]}>
          {showSearchBar && (
            <View style={styles.searchBarWrapper}>
              <View style={[styles.searchBar, styles.searchBarActive]}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#9ca3af"
                  autoFocus={true}
                />
              </View>
            </View>
          )}
          
          <View style={styles.iconsContainer}>
            <TouchableOpacity 
              style={styles.searchIconButton}
              onPress={() => setShowSearchBar(!showSearchBar)}
            >
              <Ionicons name="search-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.filterIcon}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name="options-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.toggleIcon}
              onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              <Ionicons 
                name={viewMode === 'list' ? 'apps-outline' : 'list-outline'} 
                size={20} 
                color="#6b7280" 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Dropdown Menu */}
        {showFilters && (
          <View style={styles.filterDropdown}>
            <View style={styles.filterDropdownContent}>
              <View style={styles.filterDropdownHeader}>
                <Text style={styles.filterDropdownTitle}>Filter by Status</Text>
                <TouchableOpacity
                  style={styles.filterCloseButton}
                  onPress={() => setShowFilters(false)}
                >
                  <Ionicons name="close" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.filterDropdownItem,
                  !selectedStatus && styles.filterDropdownItemActive
                ]}
                onPress={() => {
                  setSelectedStatus(null);
                  setShowFilters(false);
                }}
              >
                <View style={[styles.filterStatusDot, { backgroundColor: '#6b7280' }]} />
                <Text style={[
                  styles.filterDropdownText,
                  !selectedStatus && styles.filterDropdownTextActive
                ]}>
                  All Tasks
                </Text>
              </TouchableOpacity>
              
              {[
                { status: 'To Do', color: '#6b7280' },
                { status: 'In Progress', color: '#f59e0b' },
                { status: 'Completed', color: '#10b981' },
                { status: 'Overdue', color: '#ef4444' }
              ].map((statusItem) => (
                <TouchableOpacity
                  key={statusItem.status}
                  style={[
                    styles.filterDropdownItem,
                    selectedStatus === statusItem.status && styles.filterDropdownItemActive
                  ]}
                  onPress={() => {
                    setSelectedStatus(statusItem.status);
                    setShowFilters(false);
                  }}
                >
                  <View style={[styles.filterStatusDot, { backgroundColor: statusItem.color }]} />
                  <Text style={[
                    styles.filterDropdownText,
                    selectedStatus === statusItem.status && styles.filterDropdownTextActive
                  ]}>
                    {statusItem.status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Status Filter Pills */}
        <View style={styles.statusPillsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusPillsContent}
          >
            <TouchableOpacity
              style={[
                styles.statusPill,
                !selectedStatus && styles.statusPillActive,
                !selectedStatus && styles.statusPillAll
              ]}
              onPress={() => setSelectedStatus(null)}
            >
              <Text style={[
                styles.statusPillNumber,
                !selectedStatus && styles.statusPillNumberActive
              ]}>
                {state.tasks.length}
              </Text>
              <Text style={[
                styles.statusPillText,
                !selectedStatus && styles.statusPillTextActive
              ]}>
                All
              </Text>
            </TouchableOpacity>
            
            {[
              { status: 'To Do', color: '#6b7280', bgColor: '#f3f4f6' },
              { status: 'In Progress', color: '#f59e0b', bgColor: '#fef3c7' },
              { status: 'Completed', color: '#10b981', bgColor: '#dcfce7' },
              { status: 'Overdue', color: '#ef4444', bgColor: '#fee2e2' }
            ].map((statusItem) => (
              <TouchableOpacity
                key={statusItem.status}
                style={[
                  styles.statusPill,
                  selectedStatus === statusItem.status && styles.statusPillActive,
                  { backgroundColor: selectedStatus === statusItem.status ? statusItem.bgColor : '#f9fafb' }
                ]}
                onPress={() => setSelectedStatus(selectedStatus === statusItem.status ? null : statusItem.status)}
              >
                <Text style={[
                  styles.statusPillNumber,
                  { color: statusItem.color }
                ]}>
                  {getTaskCountByStatus(statusItem.status)}
                </Text>
                <Text style={[
                  styles.statusPillText,
                  selectedStatus === statusItem.status && styles.statusPillTextActive,
                  { color: selectedStatus === statusItem.status ? statusItem.color : '#6b7280' }
                ]}>
                  {statusItem.status}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

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
          onRequestClose={() => setShowTaskDetailsModal(false)}
        >
          <View style={styles.taskDetailsBackdrop}>
            <TouchableOpacity 
              style={styles.taskDetailsBackdropTouchable}
              activeOpacity={1}
              onPress={() => setShowTaskDetailsModal(false)}
            />
            <View style={styles.taskDetailsModal}>
            <View style={styles.taskDetailsHeader}>
              <Text style={styles.taskDetailsTitle}>Task Details</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => {
                  if (isEditingTask) {
                    // Save changes
                    handleSaveTaskEdit();
                  } else {
                    // Start editing
                    setIsEditingTask(true);
                    setEditFormData({ ...selectedTaskForDetails });
                  }
                }}>
                  <Ionicons name={isEditingTask ? "checkmark" : "pencil"} size={20} color="#0ea5e9" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowTaskDetailsModal(false)}>
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
            <View style={[styles.taskDetailsModal, { maxHeight: '90%', minHeight: '80%' }]}>
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
            <View style={[styles.taskDetailsModal, { maxHeight: '90%', minHeight: '80%' }]}>
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
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingBottom: 80, // Add space for bottom tab bar
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  subtaskBadgeText: { fontSize: 11, fontWeight: '600', color: '#d97706' },
  parentTaskBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#b3e5fc',
  },
  parentTaskBadgeText: { fontSize: 11, fontWeight: '500', color: '#0277bd' },
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
    borderRadius: 4,
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
    backgroundColor: '#f8fafc',
    borderRadius: 12,
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
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  gridTaskContentContainer: {
    padding: 12,
    flex: 1,
    borderRadius: 12,
  },
  gridTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gridTaskHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  gridStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  gridStatusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  gridTaskContent: {
    flex: 1,
    marginBottom: 8,
  },
  gridTaskTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 16,
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
  gridProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginRight: 8,
  },
  gridProgressFill: {
    height: '100%',
    backgroundColor: '#137fec',
    borderRadius: 2,
  },
  gridProgressText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
  },
  gridTaskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridAssigneeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: 'bold',
    color: 'white',
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
    borderRadius: 6,
    borderWidth: 0,
    borderColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 6,
    height: 32,
    marginRight: 12,
  },
  searchBarWrapper: {
    flex: 1,
    marginRight: 12,
    borderRadius: 8,
    padding: 2,
    backgroundColor: '#137fec',
    shadowColor: '#137fec',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  searchBarActive: {
    borderWidth: 0,
    borderColor: 'transparent',
    marginRight: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    paddingVertical: 0,
    height: 20,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchIconButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f9fafb',
    borderWidth: 0,
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIcon: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f9fafb',
    borderWidth: 0,
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIcon: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f9fafb',
    borderWidth: 0,
    height: 32,
    width: 32,
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
});

export default TasksScreen;