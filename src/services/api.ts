import { Task, User, AuthResponse } from '../types';

const API_BASE_URL = 'https://brmh.in/crud';
const AUTH_BASE_URL = 'https://brmh.in/auth';
const TASK_NOTIFICATION_ENDPOINT = 'https://brmh.in/notify/11d0d0c0-9745-48bd-bbbe-9aa0c517f294';
const AUTH_TABLE_NAME = 'brmh-users';

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

// Helper function to decode base64 (JWT payload)
const base64Decode = (str: string): string => {
  try {
    // Add padding if needed
    const padding = '='.repeat((4 - (str.length % 4)) % 4);
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
    
    // For React Native, we can use atob if available, otherwise decode manually
    if (typeof atob !== 'undefined') {
      return atob(base64);
    }
    
    // Manual base64 decode for environments without atob
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let bits = 0;
    let value = 0;
    
    for (let i = 0; i < base64.length; i++) {
      const char = base64[i];
      if (char === '=') break;
      
      const index = chars.indexOf(char);
      if (index === -1) continue;
      
      value = (value << 6) | index;
      bits += 6;
      
      if (bits >= 8) {
        bits -= 8;
        result += String.fromCharCode((value >> bits) & 0xFF);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Base64 decode error:', error);
    throw new Error('Failed to decode base64 string');
  }
};

// Helper function to convert DynamoDB format to plain object
const convertDynamoDBItem = (item: any): any => {
  console.log('convertDynamoDBItem - Input item:', item);
  
  if (!item || typeof item !== 'object') {
    console.log('convertDynamoDBItem - Not an object, returning as-is:', item);
    return item;
  }
  
  const converted: any = {};
  
  for (const [key, value] of Object.entries(item)) {
    console.log(`convertDynamoDBItem - Processing key "${key}" with value:`, value);
    
    if (value && typeof value === 'object') {
      if ('S' in value) {
        // String value
        converted[key] = (value as any).S;
        console.log(`convertDynamoDBItem - Converted "${key}" from string: "${(value as any).S}"`);
      } else if ('N' in value) {
        // Number value
        converted[key] = parseFloat((value as any).N as string);
        console.log(`convertDynamoDBItem - Converted "${key}" from number: ${converted[key]}`);
      } else if ('BOOL' in value) {
        // Boolean value
        converted[key] = (value as any).BOOL;
        console.log(`convertDynamoDBItem - Converted "${key}" from boolean: ${converted[key]}`);
      } else if ('NULL' in value) {
        // Null value
        converted[key] = null;
        console.log(`convertDynamoDBItem - Converted "${key}" from null`);
      } else if ('L' in value) {
        // List value
        converted[key] = ((value as any).L as any[]).map((item: any) => convertDynamoDBItem(item));
        console.log(`convertDynamoDBItem - Converted "${key}" from list`);
      } else if ('M' in value) {
        // Map value
        converted[key] = convertDynamoDBItem((value as any).M);
        console.log(`convertDynamoDBItem - Converted "${key}" from map`);
      }
    } else {
      converted[key] = value;
      console.log(`convertDynamoDBItem - Kept "${key}" as-is:`, value);
    }
  }
  
  console.log('convertDynamoDBItem - Final converted object:', converted);
  return converted;
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

    console.log('=== CREATING TASK ===');
    console.log('Original taskData input:', taskData);
    console.log('Task object being created:', task);
    console.log('Request body being sent:', requestBody);
    console.log('Task title being sent:', task.title);
    console.log('Task assignee being sent:', task.assignee);
    console.log('Task project being sent:', task.project);
    console.log('Task description being sent:', task.description);
    console.log('=====================');

    const response = await this.makeRequest<any>('?tableName=project-management-tasks', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response.success) {
      return response;
    }

    // Handle different possible response formats for creation
    let rawCreatedTask: any;
    
    if (response.data && response.data.item) {
      // Response with item object
      rawCreatedTask = response.data.item;
    } else if (response.data && response.data.data) {
      // Response with data object
      rawCreatedTask = response.data.data;
    } else if (response.data && response.data.result) {
      // Response with result object
      rawCreatedTask = response.data.result;
    } else if (response.data && !Array.isArray(response.data)) {
      // Direct object response
      rawCreatedTask = response.data;
    } else {
      // If response format is unexpected, return the original task
      console.log('Unexpected creation response format, using original task');
      rawCreatedTask = task;
    }

    // Convert DynamoDB format to plain object if needed
    console.log('=== TASK CREATION CONVERSION ===');
    console.log('Raw created task (before conversion):', rawCreatedTask);
    console.log('Raw task title:', rawCreatedTask?.title);
    console.log('Raw task project:', rawCreatedTask?.project);
    console.log('Raw task assignee:', rawCreatedTask?.assignee);
    
    const createdTask = convertDynamoDBItem(rawCreatedTask);
    console.log('Converted created task:', createdTask);
    console.log('Converted task title:', createdTask?.title);
    console.log('Converted task project:', createdTask?.project);
    console.log('Converted task assignee:', createdTask?.assignee);
    console.log('================================');

    console.log('Task created successfully:', createdTask);
    console.log('Created task title:', createdTask.title);
    console.log('Created task assignee:', createdTask.assignee);
    console.log('Created task project:', createdTask.project);
    console.log('Created task description:', createdTask.description);

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
    let rawTasks: any[] = [];
    
    if (Array.isArray(response.data)) {
      // Direct array response
      rawTasks = response.data;
    } else if (response.data && Array.isArray(response.data.items)) {
      // Response with items array
      rawTasks = response.data.items;
    } else if (response.data && Array.isArray(response.data.data)) {
      // Response with data array
      rawTasks = response.data.data;
    } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
      // Response with results array
      rawTasks = response.data.results;
    } else {
      console.log('Unexpected response format:', response.data);
      return {
        success: false,
        error: 'Unexpected response format from API',
      };
    }

    // Convert DynamoDB format to plain objects
    const tasks: Task[] = rawTasks.map((task: any) => {
      console.log('Converting task from DynamoDB format:', task);
      const convertedTask = convertDynamoDBItem(task);
      console.log('Converted task:', convertedTask);
      return convertedTask;
    });

    console.log('All converted tasks:', tasks);

    return {
      success: true,
      data: tasks,
    };
  }

  async getTaskById(taskId: string): Promise<ApiResponse<Task>> {
    console.log('API Service - Fetching task by ID:', taskId);
    const response = await this.makeRequest<any>(`?tableName=project-management-tasks&id=${taskId}`, {
      method: 'GET',
    });

    console.log('API Service - Raw response for getTaskById:', response);

    if (!response.success) {
      console.log('API Service - Request failed:', response.error);
      return response;
    }

    // Handle different possible response formats
    let rawTask: any;
    
    if (response.data && response.data.item) {
      // Response with item object
      rawTask = response.data.item;
      console.log('API Service - Using item format, raw task:', rawTask);
    } else if (response.data && response.data.data) {
      // Response with data object
      rawTask = response.data.data;
      console.log('API Service - Using data format, raw task:', rawTask);
    } else if (response.data && response.data.result) {
      // Response with result object
      rawTask = response.data.result;
      console.log('API Service - Using result format, raw task:', rawTask);
    } else if (response.data && !Array.isArray(response.data)) {
      // Direct object response
      rawTask = response.data;
      console.log('API Service - Using direct format, raw task:', rawTask);
    } else {
      console.log('API Service - Unexpected response format for single task:', response.data);
      return {
        success: false,
        error: 'Unexpected response format from API',
      };
    }

    // Convert DynamoDB format to plain object
    console.log('API Service - Converting DynamoDB format to plain object:', rawTask);
    const task = convertDynamoDBItem(rawTask);
    console.log('API Service - Converted task:', task);

    console.log('API Service - Final task data being returned:', task);
    console.log('API Service - Task title:', task?.title);
    console.log('API Service - Task description:', task?.description);
    console.log('API Service - Task project:', task?.project);
    console.log('API Service - Task assignee:', task?.assignee);

    return {
      success: true,
      data: task,
    };
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<ApiResponse<Task>> {
    // Clean payload: remove undefined/empty-string fields to avoid backend validation errors
    const cleanedUpdates: any = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined) return;
      if (typeof value === 'string' && value.trim() === '') return;
      cleanedUpdates[key] = value;
    });

    // Per README_CRUD_AND_INDEX: Update body must be { key: {...}, updates: {...} }
    const body = {
      key: { id: taskId },
      updates: {
        ...cleanedUpdates,
        updatedAt: new Date().toISOString(),
      },
    };

    return this.makeRequest<Task>(`?tableName=project-management-tasks`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async deleteTask(taskId: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`?tableName=project-management-tasks&id=${taskId}`, {
      method: 'DELETE',
    });
  }

  async sendTaskNotification(taskData: Task): Promise<ApiResponse<any>> {
    try {
      console.log('=== SENDING WHATSAPP NOTIFICATION ===');
      console.log('Full task data received:', taskData);
      console.log('Task title:', taskData.title);
      console.log('Task project:', taskData.project);
      console.log('Task assignee:', taskData.assignee);
      console.log('Task description:', taskData.description);
      console.log('Task status:', taskData.status);
      console.log('Task priority:', taskData.priority);
      console.log('Task startDate:', taskData.startDate);
      console.log('Task dueDate:', taskData.dueDate);
      console.log('Task estimatedHours:', taskData.estimatedHours);
      console.log('Task tags:', taskData.tags);
      console.log('Task comments:', taskData.comments);
      console.log('=====================================');
      
      const message = `📢 *New Task Created*\n\n` +
        `🔹 *Task Title:* ${taskData.title || 'No Title'}\n` +
        `🔹 *Project:* ${taskData.project || 'No Project'}\n` +
        `🔹 *Description:* ${taskData.description || 'No description provided'}\n` +
        `🔹 *Assignee:* ${taskData.assignee || 'No Assignee'}\n` +
        `🔹 *Status:* ${taskData.status || 'To Do'}\n` +
        `🔹 *Priority:* ${taskData.priority || 'Medium'}\n\n` +
        `📊 *Task Details*\n` +
        `- Start Date: ${formatDate(taskData.startDate)}\n` +
        `- Due Date: ${formatDate(taskData.dueDate)}\n` +
        `- Estimated Hours: ${taskData.estimatedHours || 0} hours\n` +
        `- Progress: ${taskData.progress || 0}%\n\n` +
        `🏷️ *Tags:* ${taskData.tags || 'No tags'}\n\n` +
        `📝 *Additional Notes:* ${taskData.comments || 'No additional notes'}\n\n` +
        `✅ Please review and start working on this task.`;

      console.log('Final notification message:', message);

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

  // Authentication Methods
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('=== ATTEMPTING LOGIN ===');
      console.log('Email:', email);

      const response = await fetch(`${AUTH_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email,
          password: password,
        }),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || data.message || 'Login failed',
        };
      }

      // Extract tokens from Cognito response format
      const idToken = data.result?.idToken?.jwtToken;
      const accessToken = data.result?.accessToken?.jwtToken;
      const refreshToken = data.result?.refreshToken?.token;

      if (!idToken) {
        return {
          success: false,
          error: 'No authentication token received',
        };
      }

      // Decode JWT to get user information
      const tokenParts = idToken.split('.');
      if (tokenParts.length !== 3) {
        return {
          success: false,
          error: 'Invalid token format',
        };
      }

      const payload = JSON.parse(base64Decode(tokenParts[1]));
      
      // Create user object from JWT payload
      const user: User = {
        id: payload.sub || payload['cognito:username'],
        email: payload.email || email,
        name: payload.name || payload.email?.split('@')[0] || 'User',
        role: 'member', // Default role
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log('Login successful for user:', user.email);
      console.log('Refresh token available:', !!refreshToken);

      return {
        success: true,
        user: user,
        token: idToken,
        refreshToken: refreshToken, // Include refresh token in response
        message: 'Login successful',
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  async signup(userData: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<AuthResponse> {
    try {
      console.log('=== ATTEMPTING SIGNUP ===');
      console.log('User data:', { ...userData, password: '***' });

      const response = await fetch(`${AUTH_BASE_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: userData.name,
          email: userData.email,
          password: userData.password,
        }),
      });

      const data = await response.json();
      console.log('Signup response:', data);

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || data.message || 'Signup failed',
        };
      }

      // After successful signup, automatically log in the user
      console.log('Signup successful, attempting auto-login...');
      const loginResponse = await this.login(userData.email, userData.password);

      if (loginResponse.success) {
        return {
          ...loginResponse,
          message: 'Account created successfully! Please check your email for verification.',
        };
      }

      // If auto-login fails, still return success but without user/token
      return {
        success: true,
        message: 'Account created successfully! Please check your email for verification, then login.',
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Signup failed',
      };
    }
  }

  async logout(refreshToken?: string): Promise<ApiResponse<any>> {
    try {
      console.log('🚪 [API SERVICE] Starting backend logout...');
      console.log('🚪 [API SERVICE] Refresh token provided:', !!refreshToken);

      // Call the backend logout endpoint to clear cookies and revoke tokens
      const response = await fetch(`${AUTH_BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
        credentials: 'include', // Important: Include cookies in the request
      });

      const data = await response.json();
      console.log('🚪 [API SERVICE] Logout response:', data);

      if (!response.ok) {
        console.warn('🚪 [API SERVICE] Backend logout failed, but continuing with local logout');
        // Don't throw error - we still want to clear local data even if backend fails
      }

      console.log('🚪 [API SERVICE] Backend logout completed');
      return {
        success: true,
        data: data,
        message: 'Logged out successfully',
      };
    } catch (error) {
      console.error('🚪 [API SERVICE] Logout error:', error);
      // Don't throw error - we still want to clear local data even if backend fails
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout request failed',
      };
    }
  }
}

export const apiService = new ApiService();
