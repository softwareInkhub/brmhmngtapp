import { Task } from '../types';

const API_BASE_URL = 'https://brmh.in/crud';
const TASK_NOTIFICATION_ENDPOINT = 'https://brmh.in/notify/11d0d0c0-9745-48bd-bbbe-9aa0c517f294';

// Helper function to format dates
const formatDate = (dateString: string): string => {
  if (!dateString) return 'Not set';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

export interface CreateTaskRequest {
  item: Task;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private   async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      console.log('Making API request to:', `${API_BASE_URL}${endpoint}`);
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response data:', data);
      
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Task>> {
    const taskId = `task-${Date.now()}`;
    const now = new Date().toISOString();
    
    const task: Task = {
      ...taskData,
      id: taskId,
      createdAt: now,
      updatedAt: now,
    };

    const requestBody: CreateTaskRequest = {
      item: task,
    };

    console.log('Creating task with data:', requestBody);
    console.log('Task title being sent:', task.title);
    console.log('Task assignee being sent:', task.assignee);

    const response = await this.makeRequest<any>('?tableName=project-management-tasks', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response.success) {
      return response;
    }

    // Handle different possible response formats for creation
    let createdTask: Task;
    
    if (response.data && response.data.item) {
      // Response with item object
      createdTask = response.data.item;
    } else if (response.data && response.data.data) {
      // Response with data object
      createdTask = response.data.data;
    } else if (response.data && response.data.result) {
      // Response with result object
      createdTask = response.data.result;
    } else if (response.data && !Array.isArray(response.data)) {
      // Direct object response
      createdTask = response.data;
    } else {
      // If response format is unexpected, return the original task
      console.log('Unexpected creation response format, using original task');
      createdTask = task;
    }

    console.log('Task created successfully:', createdTask);
    console.log('Created task title:', createdTask.title);
    console.log('Created task assignee:', createdTask.assignee);

    return {
      success: true,
      data: createdTask,
    };
  }

  async verifyTaskExists(taskId: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await this.getTaskById(taskId);
      return {
        success: true,
        data: response.success && response.data !== null,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify task',
      };
    }
  }

  async getTasks(): Promise<ApiResponse<Task[]>> {
    const response = await this.makeRequest<any>('?tableName=project-management-tasks', {
      method: 'GET',
    });

    if (!response.success) {
      return response;
    }

    // Handle different possible response formats
    let tasks: Task[] = [];
    
    if (Array.isArray(response.data)) {
      // Direct array response
      tasks = response.data;
    } else if (response.data && Array.isArray(response.data.items)) {
      // Response with items array
      tasks = response.data.items;
    } else if (response.data && Array.isArray(response.data.data)) {
      // Response with data array
      tasks = response.data.data;
    } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
      // Response with results array
      tasks = response.data.results;
    } else {
      console.log('Unexpected response format:', response.data);
      return {
        success: false,
        error: 'Unexpected response format from API',
      };
    }

    return {
      success: true,
      data: tasks,
    };
  }

  async getTaskById(taskId: string): Promise<ApiResponse<Task>> {
    const response = await this.makeRequest<any>(`?tableName=project-management-tasks&id=${taskId}`, {
      method: 'GET',
    });

    if (!response.success) {
      return response;
    }

    // Handle different possible response formats
    let task: Task;
    
    if (response.data && response.data.item) {
      // Response with item object
      task = response.data.item;
    } else if (response.data && response.data.data) {
      // Response with data object
      task = response.data.data;
    } else if (response.data && response.data.result) {
      // Response with result object
      task = response.data.result;
    } else if (response.data && !Array.isArray(response.data)) {
      // Direct object response
      task = response.data;
    } else {
      console.log('Unexpected response format for single task:', response.data);
      return {
        success: false,
        error: 'Unexpected response format from API',
      };
    }

    return {
      success: true,
      data: task,
    };
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<ApiResponse<Task>> {
    const updatedTask = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return this.makeRequest<Task>(`?tableName=project-management-tasks&id=${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updatedTask),
    });
  }

  async deleteTask(taskId: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`?tableName=project-management-tasks&id=${taskId}`, {
      method: 'DELETE',
    });
  }

  async sendTaskNotification(taskData: Task): Promise<ApiResponse<any>> {
    try {
      console.log('Sending WhatsApp notification for task:', taskData.title);
      
      const message = `📢 *New Task Created*\n\n` +
        `🔹 *Task Title:* ${taskData.title}\n` +
        `🔹 *Project:* ${taskData.project}\n` +
        `🔹 *Description:* ${taskData.description || 'No description provided'}\n` +
        `🔹 *Assignee:* ${taskData.assignee}\n` +
        `🔹 *Status:* ${taskData.status}\n` +
        `🔹 *Priority:* ${taskData.priority}\n\n` +
        `📊 *Task Details*\n` +
        `- Start Date: ${formatDate(taskData.startDate)}\n` +
        `- Due Date: ${formatDate(taskData.dueDate)}\n` +
        `- Estimated Hours: ${taskData.estimatedHours || 0} hours\n` +
        `- Progress: ${taskData.progress || 0}%\n\n` +
        `🏷️ *Tags:* ${taskData.tags || 'No tags'}\n\n` +
        `📝 *Additional Notes:* ${taskData.comments || 'No additional notes'}\n\n` +
        `✅ Please review and start working on this task.`;

      const response = await fetch(TASK_NOTIFICATION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('WhatsApp notification sent successfully:', result);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Failed to send task notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification',
      };
    }
  }
}

export const apiService = new ApiService();
