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
import { apiService } from '../services/api';

const TaskDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { taskId } = route.params as { taskId: string };
  const [newComment, setNewComment] = useState('');
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        setTask(response.data);
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

  if (isLoading) {
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#137fec" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#137fec" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Info */}
        <View style={styles.taskInfo}>
          <View style={styles.taskHeader}>
            <Text style={styles.taskTitle}>{task?.title || 'No Title'}</Text>
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

          <Text style={styles.taskDescription}>{task?.description || 'No description provided'}</Text>

          {/* Task Details */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Project</Text>
              <Text style={styles.detailValue}>{task?.project || 'No project'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Assignee</Text>
              <Text style={styles.detailValue}>{task?.assignee || 'No assignee'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Start Date</Text>
              <Text style={styles.detailValue}>
                {task?.startDate ? new Date(task.startDate).toLocaleDateString() : 'Not set'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>
                {task?.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Estimated Hours</Text>
              <Text style={styles.detailValue}>{task?.estimatedHours || 0}h</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Time Spent</Text>
              <Text style={styles.detailValue}>{task?.timeSpent || '0'}h</Text>
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

          {/* Tags */}
          {task?.tags && task.tags.trim() && (
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
          )}

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
    backgroundColor: '#f6f7f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    padding: 16,
  },
  taskInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  taskHeader: {
    marginBottom: 16,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    lineHeight: 32,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
});

export default TaskDetailsScreen;