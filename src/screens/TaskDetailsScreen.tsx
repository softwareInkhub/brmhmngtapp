import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Task } from '../types';
import ProfileHeader from '../components/ProfileHeader';
import { apiService } from '../services/api';
import { useAppContext } from '../context/AppContext';

const TaskDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { taskId } = route.params as { taskId: string };
  const { state } = useAppContext();
  const [newComment, setNewComment] = useState('');
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subtasksExpanded, setSubtasksExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editProject, setEditProject] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editEstimatedHours, setEditEstimatedHours] = useState('');
  const [editTimeSpent, setEditTimeSpent] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editProgress, setEditProgress] = useState('');
  const [editTags, setEditTags] = useState('');

  const fetchTask = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching task with ID:', taskId);
      const response = await apiService.getTaskById(taskId);
      
      console.log('TaskDetailsScreen - API Response:', response);
      console.log('TaskDetailsScreen - Task Data:', response.data);
      
      if (response.success && response.data) {
        console.log('Setting task data:', response.data);
        console.log('Task title:', response.data.title);
        console.log('Task description:', response.data.description);
        console.log('Task project:', response.data.project);
        console.log('Task assignee:', response.data.assignee);
        const t = response.data as Task;
        setTask(t);
        // fetch subtasks by two methods: direct children (parentId = id) and ids listed in subtasks JSON
        const allRes = await apiService.getTasks();
        let children: Task[] = [];
        if (allRes.success && allRes.data) {
          const list = allRes.data as Task[];
          // direct children
          children = list.filter(x => (x as any).parentId === t.id);
          // ids in subtasks field
          try {
            const arr = t.subtasks ? JSON.parse((t as any).subtasks as any) : [];
            if (Array.isArray(arr)) {
              const byIds = list.filter(x => arr.includes(x.id));
              // merge unique
              const map: any = {};
              [...children, ...byIds].forEach(x => { map[x.id] = x; });
              children = Object.values(map);
            }
          } catch {}
        }
        setSubtasks(children);
      } else {
        console.error('Failed to fetch task:', response.error);
        Alert.alert('Error', 'Failed to load task details');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching task:', error);
      Alert.alert('Error', 'An unexpected error occurred');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  useEffect(() => {
    if (task) {
      setEditTitle(task.title || '');
      setEditDescription(task.description || '');
      setEditProject(task.project || '');
      setEditAssignee(task.assignee || '');
      setEditStartDate(task.startDate || '');
      setEditDueDate(task.dueDate || '');
      setEditEstimatedHours(String(task.estimatedHours ?? ''));
      setEditTimeSpent(task.timeSpent || '');
      setEditStatus(task.status || '');
      setEditPriority(task.priority || '');
      setEditProgress(String(task.progress ?? ''));
      setEditTags(task.tags || '');
    }
  }, [task]);

  const handleSendComment = () => {
    if (newComment.trim()) {
      // Handle sending comment
      setNewComment('');
    }
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

  const handleToggleEdit = () => {
    setIsEditing(prev => !prev);
  };

  const handleSaveEdit = async () => {
    if (!task) return;
    try {
      setIsLoading(true);
      const updates: Partial<Task> = {
        title: editTitle,
        description: editDescription,
        project: editProject,
        assignee: editAssignee,
        startDate: editStartDate,
        dueDate: editDueDate,
        estimatedHours: Number(editEstimatedHours) || 0,
        timeSpent: editTimeSpent,
        status: (editStatus as any) || task.status,
        priority: (editPriority as any) || task.priority,
        progress: Math.max(0, Math.min(100, Number(editProgress) || 0)),
        tags: editTags,
      };
      const res = await apiService.updateTask(task.id, updates);
      if (res.success && res.data) {
        setTask(prev => ({ ...(prev as Task), ...res.data }));
        setIsEditing(false);
        Alert.alert('Success', 'Task updated successfully');
      } else {
        Alert.alert('Update Failed', res.error || 'Could not update task');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update task');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#137fec" />
          <Text style={styles.loadingText}>Loading task details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#137fec" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Debug logging for task data
  console.log('TaskDetailsScreen - Rendering with task:', task);
  console.log('TaskDetailsScreen - Task title:', task?.title);
  console.log('TaskDetailsScreen - Task description:', task?.description);
  console.log('TaskDetailsScreen - Task project:', task?.project);
  console.log('TaskDetailsScreen - Task assignee:', task?.assignee);

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Header */}
      <ProfileHeader
        title={isEditing ? (editTitle || 'No Title') : (task?.title || 'No Title')}
        subtitle={isEditing ? 'Editing task' : 'View task information'}
        rightElement={
          <TouchableOpacity
            style={styles.backButton}
            onPress={isEditing ? handleSaveEdit : handleToggleEdit}
          >
            <Ionicons name={isEditing ? 'checkmark' : 'pencil'} size={22} color="#137fec" />
          </TouchableOpacity>
        }
        onProfilePress={() => {
          // Handle profile navigation
        }}
        onRightElementPress={isEditing ? handleSaveEdit : handleToggleEdit}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Info */}
        <View style={styles.taskInfo}>
          <View style={styles.taskHeader}>
            {isEditing ? (
              <TextInput
                style={styles.taskTitleInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Task title"
              />
            ) : null}
            <View style={styles.taskMeta}>
              <View style={styles.priorityContainer}>
                <View
                  style={[
                    styles.priorityDot,
                    { backgroundColor: getPriorityColor(task?.priority || 'Medium') },
                  ]}
                />
                <Text style={styles.priorityText}>{task?.priority || 'Medium'} Priority</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(task?.status || 'To Do').bg },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(task?.status || 'To Do').text },
                  ]}
                >
                  {task?.status || 'To Do'}
                </Text>
              </View>
            </View>
          </View>

          {isEditing ? (
            <TextInput
              style={styles.taskDescriptionInput}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Task description"
              multiline
            />
          ) : (
            <Text style={styles.taskDescription}>{task?.description || 'No description provided'}</Text>
          )}

          {/* Task Details */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Project</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailInput}
                  value={editProject}
                  onChangeText={setEditProject}
                  placeholder="Project"
                />
              ) : (
                <Text style={styles.detailValue}>{task?.project || 'No project'}</Text>
              )}
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Assignee</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailInput}
                  value={editAssignee}
                  onChangeText={setEditAssignee}
                  placeholder="Assignee"
                />
              ) : (
                <Text style={styles.detailValue}>{task?.assignee || 'No assignee'}</Text>
              )}
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Start Date</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailInput}
                  value={editStartDate}
                  onChangeText={setEditStartDate}
                  placeholder="YYYY-MM-DD"
                />
              ) : (
                <Text style={styles.detailValue}>
                  {task?.startDate ? new Date(task.startDate).toLocaleDateString() : 'Not set'}
                </Text>
              )}
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Due Date</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailInput}
                  value={editDueDate}
                  onChangeText={setEditDueDate}
                  placeholder="YYYY-MM-DD"
                />
              ) : (
                <Text style={styles.detailValue}>
                  {task?.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}
                </Text>
              )}
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Estimated Hours</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailInput}
                  keyboardType="numeric"
                  value={editEstimatedHours}
                  onChangeText={setEditEstimatedHours}
                  placeholder="0"
                />
              ) : (
                <Text style={styles.detailValue}>{task?.estimatedHours || 0}h</Text>
              )}
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Time Spent</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailInput}
                  value={editTimeSpent}
                  onChangeText={setEditTimeSpent}
                  placeholder="0h"
                />
              ) : (
                <Text style={styles.detailValue}>{task?.timeSpent || '0'}h</Text>
              )}
            </View>
          </View>

          {/* Status / Priority / Progress */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Status</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailInput}
                  value={editStatus}
                  onChangeText={setEditStatus}
                  placeholder="To Do | In Progress | Completed | Overdue"
                />
              ) : (
                <Text style={styles.detailValue}>{task?.status || 'To Do'}</Text>
              )}
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Priority</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailInput}
                  value={editPriority}
                  onChangeText={setEditPriority}
                  placeholder="Low | Medium | High"
                />
              ) : (
                <Text style={styles.detailValue}>{task?.priority || 'Medium'}</Text>
              )}
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Progress (%)</Text>
              {isEditing ? (
                <TextInput
                  style={styles.detailInput}
                  keyboardType="numeric"
                  value={editProgress}
                  onChangeText={setEditProgress}
                  placeholder="0-100"
                />
              ) : (
                <Text style={styles.detailValue}>{task?.progress || 0}%</Text>
              )}
            </View>
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressPercentage}>{task?.progress || 0}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${task?.progress || 0}%` },
                ]}
              />
            </View>
          </View>

        {/* Subtasks */}
        <View style={styles.subtasksSection}>
          <View style={styles.subtasksHeader}>
            <Text style={styles.sectionTitle}>Subtasks ({subtasks.length})</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={() => setSubtasksExpanded(!subtasksExpanded)}>
                <Ionicons name={subtasksExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => (navigation as any).navigate('CreateTask', { parentTaskId: task.id })} style={styles.addSubtaskBtn}>
                <Ionicons name="add" size={18} color="#137fec" />
                <Text style={styles.addSubtaskText}>Subtask</Text>
              </TouchableOpacity>
            </View>
          </View>
          {subtasksExpanded && (
            <View style={styles.subtasksList}>
              {subtasks.length === 0 ? (
                <Text style={{ color: '#9ca3af' }}>No subtasks yet</Text>
              ) : (
                subtasks.map((st) => (
                  <TouchableOpacity key={st.id} style={styles.subtaskItem} onPress={() => (navigation as any).navigate('TaskDetails', { taskId: st.id })}>
                    <View style={[styles.subtaskStatus, { backgroundColor: getStatusColor(st.status).bg }]}> 
                      <Text style={[styles.subtaskStatusText, { color: getStatusColor(st.status).text }]}>{st.status}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subtaskTitle} numberOfLines={1}>{st.title || 'Untitled'}</Text>
                      <Text style={styles.subtaskMeta} numberOfLines={1}>{st.assignee || 'Unassigned'} • {st.dueDate || 'No date'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

          {/* Tags */}
          {isEditing ? (
            <View style={styles.tagsSection}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <TextInput
                style={styles.detailInput}
                value={editTags}
                onChangeText={setEditTags}
                placeholder="Comma,separated,tags"
              />
            </View>
          ) : task?.tags && task.tags.trim() ? (
            <View style={styles.tagsSection}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {task.tags.split(',').map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag.trim()}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Comments ({task?.comments || '0'})</Text>
            
            {/* Comment Input */}
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendComment}
              >
                <Ionicons name="send" size={20} color="#137fec" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:'#f6f7f8',
    paddingBottom: 16, // Add padding for safe area
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    paddingVertical: 5,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  moreButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 8,
  },
  taskInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
   
  },
  taskHeader: {
    marginBottom: 1,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: 28,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  taskTitleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: 28,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskDescription: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 24,
  },
  taskDescriptionInput: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
    marginBottom: 24,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  detailItem: {
    width: '45%',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  detailInput: {
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  progressSection: {
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#137fec',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#137fec',
    borderRadius: 4,
  },
  tagsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  commentsSection: {
    marginBottom: 24,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1f2937',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#137fec',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  // Subtasks Section Styles
  subtasksSection: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  subtasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addSubtaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
  },
  addSubtaskText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#137fec',
  },
  subtasksList: {
    gap: 8,
  },
  subtaskItem: {
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
  subtaskStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  subtaskStatusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  subtaskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  subtaskMeta: {
    fontSize: 11,
    color: '#6b7280',
  },
});

export default TaskDetailsScreen;