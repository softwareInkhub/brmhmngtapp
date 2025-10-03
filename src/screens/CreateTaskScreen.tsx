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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import { Task } from '../types';
import { apiService } from '../services/api';

const CreateTaskScreen = () => {
  const navigation = useNavigation();
  const { dispatch } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: '',
    assignee: '',
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
        status: 'To Do' as const,
        priority: formData.priority,
        dueDate: formData.dueDate || new Date().toISOString().split('T')[0],
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        estimatedHours: parseInt(formData.estimatedHours) || 0,
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
        
        // Verify the task was actually saved to the database
        const verificationResponse = await apiService.verifyTaskExists(response.data.id);
        const isVerified = verificationResponse.success && verificationResponse.data;
        
        // Add to local state as well for immediate UI update
        dispatch({ type: 'ADD_TASK', payload: response.data });

        const verificationMessage = isVerified 
          ? '✅ Verified: Task is saved in DynamoDB database!'
          : '⚠️ Warning: Task created but verification failed. Please refresh the task list.';

        Alert.alert(
          'Success! ✅', 
          `Task "${response.data.title}" has been created.\n\n${verificationMessage}\n\nTask ID: ${response.data.id}\nProject: ${response.data.project}\nAssignee: ${response.data.assignee}`,
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

        {/* Priority */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityContainer}>
            {['Low', 'Medium', 'High'].map((priority) => (
              <TouchableOpacity
                key={priority}
                style={[
                  styles.priorityButton,
                  formData.priority === priority && styles.priorityButtonSelected,
                ]}
                onPress={() => handleInputChange('priority', priority)}
              >
                <Text
                  style={[
                    styles.priorityText,
                    formData.priority === priority && styles.priorityTextSelected,
                  ]}
                >
                  {priority}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Due Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Due Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={formData.dueDate}
            onChangeText={(value) => handleInputChange('dueDate', value)}
          />
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

        {/* Assigned To */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Assigned To *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter assignee name"
            value={formData.assignee}
            onChangeText={(value) => handleInputChange('assignee', value)}
          />
        </View>

        {/* Start Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Start Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={formData.startDate}
            onChangeText={(value) => handleInputChange('startDate', value)}
          />
        </View>

        {/* Estimated Hours */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Estimated Hours</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter estimated hours"
            value={formData.estimatedHours}
            onChangeText={(value) => handleInputChange('estimatedHours', value)}
            keyboardType="numeric"
          />
        </View>

        {/* Tags */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tags</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter tags (comma-separated)"
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
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  priorityButtonSelected: {
    borderColor: '#137fec',
    backgroundColor: '#137fec',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  priorityTextSelected: {
    color: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  createButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
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