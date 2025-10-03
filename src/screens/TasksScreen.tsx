import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/api';

const TasksScreen = () => {
  const navigation = useNavigation();
  const { state, dispatch } = useAppContext();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [refreshing, setRefreshing] = useState(false);

  // Sort tasks by creation date (newest first)
  const tasks = [...state.tasks].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA; // Newest first
  });
  const isLoading = state.isLoading;

  const fetchTasks = async () => {
    try {
      console.log('Starting to fetch tasks...');
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiService.getTasks();
      
      console.log('Fetch tasks response:', response);
      
      if (response.success && response.data) {
        console.log('Tasks fetched successfully:', response.data.length, 'tasks');
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
    fetchTasks();
  }, []);

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
      <TouchableOpacity
        style={styles.taskItem}
        onPress={() => navigation.navigate('TaskDetails' as never, { taskId: item.id } as never)}
      >
        {isNewTask(item) && (
          <View style={styles.newTaskIndicator}>
            <Text style={styles.newTaskText}>NEW</Text>
          </View>
        )}
        <View style={styles.taskContent}>
          <Text style={styles.taskTitle}>{item.title || 'No Title'}</Text>
          <Text style={styles.taskDetails}>
            Due: {item.dueDate || 'No Date'} · Assigned to: {item.assignee || 'No Assignee'}
          </Text>
          {isNewTask(item) && (
            <Text style={styles.newTaskSubtext}>
              Created {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
          )}
        </View>
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status).bg },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.status).text },
            ]}
          >
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  const renderGridTaskItem = ({ item }: { item: any }) => {
    // Debug logging for grid view
    if (__DEV__) {
      console.log('Rendering grid task item:', {
        id: item.id,
        title: item.title,
        assignee: item.assignee,
        fullItem: item
      });
    }

    return (
      <TouchableOpacity
        style={styles.gridTaskCard}
        onPress={() => navigation.navigate('TaskDetails' as never, { taskId: item.id } as never)}
      >
      {/* Priority Indicator */}
      <View
        style={[
          styles.gridPriorityIndicator,
          { backgroundColor: getPriorityColor(item.priority) },
        ]}
      />

      {/* New Task Badge */}
      {isNewTask(item) && (
        <View style={styles.gridNewTaskBadge}>
          <Text style={styles.gridNewTaskText}>NEW</Text>
        </View>
      )}

      {/* Task Header */}
      <View style={styles.gridTaskHeader}>
        <View style={styles.gridTaskIcon}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#137fec" />
        </View>
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

      {/* Task Content */}
      <View style={styles.gridTaskContent}>
        <Text style={styles.gridTaskTitle} numberOfLines={2}>
          {item.title || 'No Title'}
        </Text>
        
        {/* Task Description */}
        {item.description && (
          <Text style={styles.gridTaskDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Progress Bar */}
        {item.progress !== undefined && (
          <View style={styles.gridProgressContainer}>
            <View style={styles.gridProgressBar}>
              <View
                style={[
                  styles.gridProgressFill,
                  { width: `${item.progress}%` },
                ]}
              />
            </View>
            <Text style={styles.gridProgressText}>{item.progress}%</Text>
          </View>
        )}
      </View>

      {/* Task Footer */}
      <View style={styles.gridTaskFooter}>
        <View style={styles.gridAssigneeInfo}>
          <View style={styles.gridAssigneeAvatar}>
            <Text style={styles.gridAssigneeInitial}>
              {(item.assignee || 'N').charAt(0).toUpperCase()}
            </Text>
          </View>
            <Text style={styles.gridAssigneeName} numberOfLines={1}>
              {item.assignee || 'No Assignee'}
            </Text>
        </View>
        
        <View style={styles.gridDueDateContainer}>
          <Ionicons name="calendar-outline" size={12} color="#6b7280" />
          <Text style={styles.gridDueDate}>
            {new Date(item.dueDate).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Tasks</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateTask' as never)}
          >
            <Ionicons name="add" size={32} color="#137fec" />
          </TouchableOpacity>
        </View>
        
        {/* View Mode Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'list' && styles.activeTab]}
            onPress={() => setViewMode('list')}
          >
            <Text
              style={[
                styles.tabText,
                viewMode === 'list' && styles.activeTabText,
              ]}
            >
              List
            </Text>
            {viewMode === 'list' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'grid' && styles.activeTab]}
            onPress={() => setViewMode('grid')}
          >
            <Text
              style={[
                styles.tabText,
                viewMode === 'grid' && styles.activeTabText,
              ]}
            >
              Grid
            </Text>
            {viewMode === 'grid' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        </View>
      </View>

        {/* Debug Info */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              Tasks: {tasks.length} | Loading: {isLoading ? 'Yes' : 'No'} | Refreshing: {refreshing ? 'Yes' : 'No'}
            </Text>
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
            <Ionicons name="clipboard-outline" size={64} color="#d1d5db" />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7f8',
  },
  header: {
    backgroundColor: '#f6f7f8',
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    // Active tab styling
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#137fec',
    fontWeight: 'bold',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#137fec',
  },
  taskList: {
    flex: 1,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
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
  statusContainer: {
    marginLeft: 16,
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
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridTaskCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    minHeight: 180,
  },
  gridPriorityIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  gridTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
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
    paddingVertical: 4,
    borderRadius: 12,
  },
  gridStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  gridTaskContent: {
    flex: 1,
    marginBottom: 12,
  },
  gridTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
    lineHeight: 20,
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
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  gridAssigneeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gridAssigneeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#137fec',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  gridAssigneeInitial: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  gridAssigneeName: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  gridDueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridDueDate: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  debugContainer: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  debugText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
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