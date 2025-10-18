import { Task, User, AuthResponse } from '../types';

const API_BASE_URL = 'https://brmh.in/crud';
const AUTH_BASE_URL = 'https://brmh.in/auth';
const AUTH_TABLE_NAME = 'brmh-users';
const NOTIFICATION_URL = 'https://brmh.in/notify/11d0d0c0-9745-48bd-bbbe-9aa0c517f294';
const S3_UPLOAD_URL = 'https://brmh.in/s3/upload';

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
  if (!item || typeof item !== 'object') {
    return item;
  }
  
  // Check if this is a DynamoDB type wrapper (S, N, BOOL, etc.) at root level
  if (Object.keys(item).length === 1) {
    const key = Object.keys(item)[0];
    if (key === 'S') return item.S;
    if (key === 'N') return parseFloat(item.N);
    if (key === 'BOOL') return item.BOOL;
    if (key === 'NULL') return null;
    if (key === 'L') return item.L.map((i: any) => convertDynamoDBItem(i));
    if (key === 'M') return convertDynamoDBItem(item.M);
  }
  
  const converted: any = {};
  
  for (const [key, value] of Object.entries(item)) {
    if (value && typeof value === 'object') {
      if ('S' in value) {
        // String value
        converted[key] = (value as any).S;
      } else if ('N' in value) {
        // Number value
        converted[key] = parseFloat((value as any).N as string);
      } else if ('BOOL' in value) {
        // Boolean value
        converted[key] = (value as any).BOOL;
      } else if ('NULL' in value) {
        // Null value
        converted[key] = null;
      } else if ('L' in value) {
        // List value
        converted[key] = ((value as any).L as any[]).map((item: any) => convertDynamoDBItem(item));
      } else if ('M' in value) {
        // Map value
        converted[key] = convertDynamoDBItem((value as any).M);
      } else {
        // Plain object/value (not in DynamoDB format) - preserve as-is
        // This is important for fields like namespaceRoles that come as plain objects
        converted[key] = value;
      }
    } else {
      converted[key] = value;
    }
  }
  
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
          'Accept': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        let errorText = '';
        try { errorText = await response.text(); } catch {}
        throw new Error(`HTTP error! status: ${response.status}${errorText ? ` - ${errorText}` : ''}`);
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

    console.log('📦 [CREATE TASK] Full API response:', JSON.stringify(response, null, 2));

    // Handle different possible response formats for creation
    let rawCreatedTask: any;
    
    if (response.data && response.data.item) {
      // Response with item object
      console.log('📦 [CREATE TASK] Using response.data.item format');
      rawCreatedTask = response.data.item;
    } else if (response.data && response.data.data) {
      // Response with data object
      console.log('📦 [CREATE TASK] Using response.data.data format');
      rawCreatedTask = response.data.data;
    } else if (response.data && response.data.result) {
      // Response with result object
      console.log('📦 [CREATE TASK] Using response.data.result format');
      rawCreatedTask = response.data.result;
    } else if (response.data && response.data.Item) {
      // DynamoDB Item format (capital I)
      console.log('📦 [CREATE TASK] Using response.data.Item format (DynamoDB)');
      rawCreatedTask = response.data.Item;
    } else if (response.data && !Array.isArray(response.data)) {
      // Direct object response
      console.log('📦 [CREATE TASK] Using direct response.data format');
      rawCreatedTask = response.data;
    } else {
      // If response format is unexpected, use original task with generated ID
      console.log('📦 [CREATE TASK] Unexpected creation response format, using original task with ID');
      rawCreatedTask = { ...task, id: `task-${Date.now()}` };
    }

    console.log('📦 [CREATE TASK] Raw created task (before conversion):', JSON.stringify(rawCreatedTask, null, 2));

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

    // CRITICAL FIX: If API didn't return the data we sent, merge original task data
    // This handles cases where the API only returns {success: true} or minimal data
    const finalTask = {
      ...task,  // Original data we sent
      ...createdTask,  // Override with API response (which should have id, timestamps, etc.)
      // Ensure id exists
      id: createdTask.id || `task-${Date.now()}`,
    };

    console.log('📦 [CREATE TASK] Final task after merge:', JSON.stringify(finalTask, null, 2));
    console.log('📦 [CREATE TASK] Final task title:', finalTask.title);
    console.log('📦 [CREATE TASK] Final task project:', finalTask.project);

    return {
      success: true,
      data: finalTask,
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

  // Projects APIs
  async getProjects(): Promise<ApiResponse<any[]>> {
    const response = await this.makeRequest<any>('?tableName=project-management-projects', {
      method: 'GET',
    });

    if (!response.success) return response;

    let rawProjects: any[] = [];
    if (Array.isArray(response.data)) rawProjects = response.data;
    else if (response.data && Array.isArray(response.data.items)) rawProjects = response.data.items;
    else if (response.data && Array.isArray(response.data.data)) rawProjects = response.data.data;
    else if (response.data && response.data.results && Array.isArray(response.data.results)) rawProjects = response.data.results;
    else return { success: false, error: 'Unexpected response format from API' };

    const projects = rawProjects.map((p: any) => convertDynamoDBItem(p));
    return { success: true, data: projects };
  }

  async getProjectById(projectId: string): Promise<ApiResponse<any>> {
    const response = await this.makeRequest<any>(`?tableName=project-management-projects&id=${projectId}`, {
      method: 'GET',
    });

    if (!response.success) return response;

    let raw: any;
    if (response.data && response.data.item) raw = response.data.item;
    else if (response.data && response.data.data) raw = response.data.data;
    else if (response.data && response.data.result) raw = response.data.result;
    else if (response.data && !Array.isArray(response.data)) raw = response.data;
    else return { success: false, error: 'Unexpected response format from API' };

    return { success: true, data: convertDynamoDBItem(raw) };
  }

  async createProject(project: any): Promise<ApiResponse<any>> {
    // Ensure required fields and defaults
    const now = new Date().toISOString();
    const projectId = project.id || `project-${Date.now()}`;
    const payload = {
      item: {
        id: projectId,
        name: project.name,
        description: project.description || '',
        company: project.company,
        status: String(project.status || 'Planning'),
        priority: String(project.priority || 'Medium'),
        startDate: project.startDate,
        endDate: project.endDate,
        budget: String(project.budget),
        team: project.team,
        assignee: project.assignee,
        progress: typeof project.progress === 'number' ? project.progress : 0,
        tasks: typeof project.tasks === 'string' ? project.tasks : JSON.stringify(project.tasks || []),
        tags: typeof project.tags === 'string' ? project.tags : JSON.stringify(project.tags || []),
        notes: project.notes || '',
        createdAt: now,
        updatedAt: now,
      },
    };

    const response = await this.makeRequest<any>('?tableName=project-management-projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.success) return response;

    // Normalize response
    const data = response.data as any;
    const raw = data?.item || data?.data || data?.result || data;
    return { success: true, data: convertDynamoDBItem(raw) };
  }

  async updateProject(projectId: string, updates: Partial<any>): Promise<ApiResponse<any>> {
    // Clean payload
    const cleanedUpdates: any = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined) return;
      if (typeof value === 'string' && value.trim() === '') return;
      cleanedUpdates[key] = value;
    });

    // Never allow updating key/managed attributes
    delete cleanedUpdates.id;
    delete cleanedUpdates.projectId;
    delete cleanedUpdates.createdAt;
    delete cleanedUpdates.timestamp;
    // Allow updatedAt to be regenerated below
    delete cleanedUpdates.updatedAt;

    // Normalize fields for BRMH CRUD/Dynamo
    if (cleanedUpdates.status !== undefined) cleanedUpdates.status = String(cleanedUpdates.status);
    if (cleanedUpdates.priority !== undefined) cleanedUpdates.priority = String(cleanedUpdates.priority);
    if (cleanedUpdates.progress !== undefined) cleanedUpdates.progress = Math.max(0, Math.min(100, Number(cleanedUpdates.progress) || 0));
    if (cleanedUpdates.budget !== undefined) cleanedUpdates.budget = String(cleanedUpdates.budget);
    if (cleanedUpdates.tasks !== undefined) cleanedUpdates.tasks = typeof cleanedUpdates.tasks === 'string' ? cleanedUpdates.tasks : JSON.stringify(cleanedUpdates.tasks || []);
    if (cleanedUpdates.tags !== undefined) cleanedUpdates.tags = typeof cleanedUpdates.tags === 'string' ? cleanedUpdates.tags : JSON.stringify(cleanedUpdates.tags || []);

    const body = {
      key: { id: projectId },
      updates: {
        ...cleanedUpdates,
        updatedAt: new Date().toISOString(),
      },
    };

    const response = await this.makeRequest<any>(`?tableName=project-management-projects`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    if (!response.success) return response;

    // BRMH CRUD may return just status; if item present, normalize, else echo updates + id
    const data = response.data as any;
    const raw = data?.item || data?.data || data?.result || null;
    if (raw) {
      return { success: true, data: convertDynamoDBItem(raw) };
    }
    return { success: true, data: { id: projectId, ...cleanedUpdates } as any };
  }

  async deleteProject(projectId: string): Promise<ApiResponse<void>> {
    try {
      const deleteBody = { key: { id: projectId } } as any;
      const response = await this.makeRequest<void>(`?tableName=project-management-projects`, {
        method: 'DELETE',
        body: JSON.stringify(deleteBody),
      });
      return response;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
    }
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<ApiResponse<Task>> {
    console.log('=== UPDATING TASK ===');
    console.log('Task ID to update:', taskId);
    console.log('Updates to apply:', updates);
    
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

    console.log('Update request body:', body);

    const response = await this.makeRequest<any>(`?tableName=project-management-tasks`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    console.log('Update response:', response);

    if (!response.success) {
      console.error('Update failed:', response.error);
      return response;
    }

    // Handle different possible response formats
    let rawUpdatedTask: any;
    if (response.data && response.data.item) {
      rawUpdatedTask = response.data.item;
    } else if (response.data && response.data.data) {
      rawUpdatedTask = response.data.data;
    } else if (response.data && response.data.result) {
      rawUpdatedTask = response.data.result;
    } else if (response.data && !Array.isArray(response.data)) {
      rawUpdatedTask = response.data;
    } else {
      console.error('Unexpected response format:', response.data);
      return {
        success: false,
        error: 'Unexpected response format from server',
      };
    }

    console.log('Raw updated task:', rawUpdatedTask);
    
    // Convert DynamoDB item to Task format
    const updatedTask = convertDynamoDBItem(rawUpdatedTask);
    console.log('Converted updated task:', updatedTask);

    return {
      success: true,
      data: updatedTask,
    };
  }

  async deleteTask(taskId: string): Promise<ApiResponse<void>> {
    console.log('=== DELETING TASK ===');
    console.log('Task ID to delete:', taskId);
    console.log('Full delete URL:', `${API_BASE_URL}?tableName=project-management-tasks`);
    
    try {
      // According to BRMH CRUD API documentation, DELETE should include the item data in body
      const deleteBody = {
        id: taskId
      };
      
      console.log('Delete request body:', deleteBody);
      
      const response = await this.makeRequest<void>(`?tableName=project-management-tasks`, {
        method: 'DELETE',
        body: JSON.stringify(deleteBody),
      });
      
      console.log('Delete response:', response);
      return response;
    } catch (error) {
      console.error('Delete task error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Authentication Methods
  async login(usernameOrEmail: string, password: string): Promise<AuthResponse> {
    try {
      console.log('=== ATTEMPTING LOGIN ===');
      console.log('Username/Email:', usernameOrEmail);

      const response = await fetch(`${AUTH_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: usernameOrEmail,
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
        email: payload.email || usernameOrEmail,
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

  // Users listing from DynamoDB (brmh-users)
  async getUsers(): Promise<ApiResponse<any[]>> {
    try {
      console.log('👥 [API] Fetching users from table:', AUTH_TABLE_NAME);
      const response = await this.makeRequest<any>(`?tableName=${AUTH_TABLE_NAME}`, { method: 'GET' });
      
      if (!response.success) {
        console.log('❌ [API] Failed to fetch users:', response.error);
        return response;
      }

      let raw: any[] = [];
      if (Array.isArray(response.data)) raw = response.data;
      else if (response.data?.items) raw = response.data.items;
      else if (response.data?.data) raw = response.data.data;
      else if (response.data?.results) raw = response.data.results;

      console.log('👥 [API] Raw users fetched:', raw.length);
      
      // Log raw data for Aditya_Kumar before conversion
      const adityaRaw = raw.find((u: any) => {
        const email = u.email?.S || u.email;
        return email === 'adityabot69@gmail.com';
      });
      if (adityaRaw) {
        console.log('👥 [API] RAW Aditya_Kumar BEFORE conversion:');
        console.log('  - Keys:', Object.keys(adityaRaw));
        console.log('  - Has namespaceRoles key?', 'namespaceRoles' in adityaRaw);
        console.log('  - namespaceRoles value:', adityaRaw.namespaceRoles);
      }
      
      const users = raw.map((u: any) => convertDynamoDBItem(u));
      
      console.log('👥 [API] Converted users:', users.length);
      
      // Log converted data for Aditya_Kumar
      const adityaConverted = users.find((u: any) => u.email === 'adityabot69@gmail.com');
      if (adityaConverted) {
        console.log('👥 [API] CONVERTED Aditya_Kumar AFTER conversion:');
        console.log('  - Keys:', Object.keys(adityaConverted));
        console.log('  - Has namespaceRoles key?', 'namespaceRoles' in adityaConverted);
        console.log('  - namespaceRoles value:', adityaConverted.namespaceRoles);
        console.log('  - namespaceRoles type:', typeof adityaConverted.namespaceRoles);
      }
      
      console.log('👥 [API] Sample user (first):', users.length > 0 ? {
        username: users[0].username,
        email: users[0].email,
        hasNamespaceRoles: !!users[0].namespaceRoles,
        namespaceRolesType: typeof users[0].namespaceRoles,
        namespaceRolesLength: typeof users[0].namespaceRoles === 'string' ? users[0].namespaceRoles.length : 'N/A'
      } : 'No users');
      
      return { success: true, data: users };
    } catch (e) {
      console.log('❌ [API] Error fetching users:', e);
      return { success: false, error: 'Failed to fetch users' };
    }
  }

  async updateUser(userId: string, updates: Partial<any>): Promise<ApiResponse<any>> {
    // sanitize updates
    const cleaned: any = {};
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined) return;
      if (typeof v === 'string' && v.trim() === '') return;
      cleaned[k] = v;
    });
    delete cleaned.id; delete cleaned.userId; delete cleaned.createdAt; delete cleaned.timestamp; delete cleaned.updatedAt;

    const body = {
      key: { id: userId },
      updates: { ...cleaned, updatedAt: new Date().toISOString() },
    };

    const res = await this.makeRequest<any>(`?tableName=${AUTH_TABLE_NAME}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (!res.success) return res;
    const data = (res.data as any);
    const raw = data?.item || data?.data || data?.result || null;
    if (raw) return { success: true, data: convertDynamoDBItem(raw) };
    return { success: true, data: { id: userId, ...cleaned } };
  }

  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    const body = { key: { id: userId } } as any;
    return this.makeRequest<void>(`?tableName=${AUTH_TABLE_NAME}`, {
      method: 'DELETE',
      body: JSON.stringify(body),
    });
  }

  // Teams API
  async createTeam(team: any): Promise<ApiResponse<any>> {
    const now = new Date().toISOString();
    const teamId = team.id || `team-${Date.now()}`;
    const payload = {
      item: {
        id: teamId,
        name: team.name,
        description: team.description || '',
        members: typeof team.members === 'string' ? team.members : JSON.stringify(team.members || []),
        project: team.project || '',
        tasksCompleted: Number(team.tasksCompleted ?? 0),
        totalTasks: Number(team.totalTasks ?? 0),
        performance: Number(team.performance ?? 85),
        velocity: Number(team.velocity ?? 80),
        health: String(team.health || 'good'),
        budget: String(team.budget || ''),
        startDate: team.startDate || '',
        archived: Boolean(team.archived ?? false),
        tags: typeof team.tags === 'string' ? team.tags : JSON.stringify(team.tags || []),
        achievements: typeof team.achievements === 'string' ? team.achievements : JSON.stringify(team.achievements || []),
        lastActivity: team.lastActivity || 'Just now',
        department: team.department || '',
        manager: team.manager || '',
        whatsappGroupId: team.whatsappGroupId || '',
        whatsappGroupName: team.whatsappGroupName || '',
        goals: team.goals || '',
        notes: team.notes || '',
        createdAt: now,
        updatedAt: now,
      }
    };

    const response = await this.makeRequest<any>('?tableName=project-management-teams', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.success) return response;
    const data = response.data as any;
    const raw = data?.item || data?.data || data?.result || data;
    return { success: true, data: convertDynamoDBItem(raw) };
  }

  async getTeams(): Promise<ApiResponse<any[]>> {
    const response = await this.makeRequest<any>('?tableName=project-management-teams', {
      method: 'GET',
    });

    if (!response.success) return response;

    let rawTeams: any[] = [];
    if (Array.isArray(response.data)) rawTeams = response.data;
    else if (response.data && Array.isArray(response.data.items)) rawTeams = response.data.items;
    else if (response.data && Array.isArray(response.data.data)) rawTeams = response.data.data;
    else if (response.data && response.data.results && Array.isArray(response.data.results)) rawTeams = response.data.results;
    else return { success: false, error: 'Unexpected response format from API' };

    const teams = rawTeams.map((t: any) => convertDynamoDBItem(t));
    return { success: true, data: teams };
  }

  // Assign namespace role to user
  async assignNamespaceRole(params: {
    userId: string;
    namespace: string;
    role: 'admin' | 'manager' | 'user' | 'member';
    permissions?: string[];
    assignedBy?: string;
  }): Promise<ApiResponse<any>> {
    const { userId, namespace, role } = params;
    if (!userId || !namespace || !role) {
      return { success: false, error: 'Missing required fields' };
    }
    const resolvedRole = role === 'member' ? 'user' : role;
    const defaultPerms = resolvedRole === 'admin' || resolvedRole === 'manager'
      ? ['crud:all', 'assign:users', 'read:all']
      : ['read:all'];
    const body = {
      userId,
      namespace,
      role: resolvedRole,
      permissions: params.permissions && params.permissions.length ? params.permissions : defaultPerms,
      assignedBy: params.assignedBy || 'system',
    } as any;

    try {
      console.log('[assignNamespaceRole] Request body:', body);
      const response = await fetch('https://brmh.in/namespace-roles/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
      });
      const ok = response.ok;
      let data: any = null;
      try { data = await response.json(); } catch {
        try { const text = await response.text(); data = { raw: text }; } catch {}
      }
      console.log('[assignNamespaceRole] Response:', response.status, data);
      if (!ok) {
        const errMsg = data?.error || data?.message || data?.raw || 'assign failed';
        return { success: false, error: `HTTP ${response.status}: ${errMsg}` };
      }
      return { success: true, data: data || { success: true } };
    } catch (e: any) {
      return { success: false, error: e?.message || 'assign failed' };
    }
  }

  async updateTeam(teamId: string, updates: Partial<any>): Promise<ApiResponse<any>> {
    const cleaned: any = {};
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined) return;
      if (typeof v === 'string' && v.trim() === '') return;
      cleaned[k] = v;
    });
    delete cleaned.id; delete cleaned.teamId; delete cleaned.createdAt; delete cleaned.timestamp; delete cleaned.updatedAt;
    if (cleaned.members !== undefined) cleaned.members = typeof cleaned.members === 'string' ? cleaned.members : JSON.stringify(cleaned.members || []);
    if (cleaned.tags !== undefined) cleaned.tags = typeof cleaned.tags === 'string' ? cleaned.tags : JSON.stringify(cleaned.tags || []);
    if (cleaned.tasksCompleted !== undefined) cleaned.tasksCompleted = Number(cleaned.tasksCompleted);
    if (cleaned.totalTasks !== undefined) cleaned.totalTasks = Number(cleaned.totalTasks);
    if (cleaned.performance !== undefined) cleaned.performance = Number(cleaned.performance);
    if (cleaned.velocity !== undefined) cleaned.velocity = Number(cleaned.velocity);
    if (cleaned.archived !== undefined) cleaned.archived = Boolean(cleaned.archived);

    // Some BRMH tables expect body.id at root instead of key for PUT/DELETE
    const putBody = {
      id: teamId,
      updates: { ...cleaned, updatedAt: new Date().toISOString() },
    };
    const res = await this.makeRequest<any>('?tableName=project-management-teams', { method: 'PUT', body: JSON.stringify(putBody) });
    if (!res.success) return res;
    const data = res.data as any;
    const raw = data?.item || data?.data || data?.result || null;
    if (raw) return { success: true, data: convertDynamoDBItem(raw) };
    return { success: true, data: { id: teamId, ...cleaned } };
  }

  async deleteTeam(teamId: string): Promise<ApiResponse<void>> {
    const delBody = { id: teamId } as any;
    return this.makeRequest<void>('?tableName=project-management-teams', { method: 'DELETE', body: JSON.stringify(delBody) });
  }

  async signup(userData: {
    name: string;
    username?: string;
    email?: string;
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
          username: userData.username || userData.email || userData.name,
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
      const loginResponse = await this.login(userData.username || (userData.email as string), userData.password);

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

  // S3 Upload Service
  async uploadToS3(file: {
    uri: string;
    name: string;
    type: string;
    mimeType: string;
  }): Promise<ApiResponse<{ url: string; key: string }>> {
    try {
      console.log('📤 [S3 UPLOAD] Uploading file:', file.name);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as any);
      formData.append('folder', 'task-attachments');
      
      const response = await fetch(S3_UPLOAD_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('📤 [S3 UPLOAD] Upload successful:', data);

      return {
        success: true,
        data: {
          url: data.url || data.fileUrl || data.location,
          key: data.key || data.fileKey || file.name,
        },
      };
    } catch (error) {
      console.error('📤 [S3 UPLOAD] Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file',
      };
    }
  }

  // Add comment/thread to a task
  async addCommentToTask(taskId: string, comment: {
    userId: string;
    userName: string;
    text: string;
  }): Promise<ApiResponse<any>> {
    try {
      console.log('💬 [COMMENT] Adding comment to task:', taskId);
      
      const commentId = `comment-${Date.now()}`;
      const now = new Date().toISOString();
      
      const commentData = {
        id: commentId,
        userId: comment.userId,
        userName: comment.userName,
        text: comment.text,
        createdAt: now,
      };

      // Get current task to retrieve existing threads
      const taskResponse = await this.getTaskById(taskId);
      if (!taskResponse.success || !taskResponse.data) {
        return {
          success: false,
          error: 'Task not found',
        };
      }

      // Parse existing threads
      let threads: any[] = [];
      try {
        if (taskResponse.data.threads) {
          threads = typeof taskResponse.data.threads === 'string' 
            ? JSON.parse(taskResponse.data.threads) 
            : Array.isArray(taskResponse.data.threads) 
            ? taskResponse.data.threads 
            : [];
        }
      } catch (e) {
        console.warn('Failed to parse existing threads:', e);
        threads = [];
      }

      // Add new comment
      threads.push(commentData);

      // Update task with new threads
      const updateResponse = await this.updateTask(taskId, {
        threads: JSON.stringify(threads),
      } as any);

      if (updateResponse.success) {
        return {
          success: true,
          data: commentData,
        };
      }

      return updateResponse;
    } catch (error) {
      console.error('💬 [COMMENT] Error adding comment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add comment',
      };
    }
  }

  // WhatsApp Notification Service
  async sendWhatsAppNotification(task: Task): Promise<ApiResponse<any>> {
    try {
      console.log('📱 [NOTIFICATION] ========== NOTIFICATION DEBUG ==========');
      console.log('📱 [NOTIFICATION] Full task object:', JSON.stringify(task, null, 2));
      console.log('📱 [NOTIFICATION] Task ID:', task.id);
      console.log('📱 [NOTIFICATION] Task title:', task.title);
      console.log('📱 [NOTIFICATION] Task project:', task.project);
      console.log('📱 [NOTIFICATION] Task assignee:', task.assignee);
      console.log('📱 [NOTIFICATION] Task description:', task.description);
      console.log('📱 [NOTIFICATION] Task type:', typeof task);
      console.log('📱 [NOTIFICATION] Task keys:', Object.keys(task));
      console.log('📱 [NOTIFICATION] =======================================');
      
      // Format dates nicely
      const formattedStartDate = task.startDate ? formatDate(task.startDate) : 'Not set';
      const formattedDueDate = task.dueDate ? formatDate(task.dueDate) : 'Not set';
      
      // Build the notification message
      const message = `📢 *New Task Created*

🔹 *Task Title:* ${task.title}
🔹 *Project:* ${task.project || 'No Project'}
🔹 *Description:* ${task.description || 'No description provided'}
🔹 *Assignee:* ${task.assignee || 'Unassigned'}
🔹 *Status:* ${task.status}
🔹 *Priority:* ${task.priority}

📊 *Task Details*
- Start Date: ${formattedStartDate}
- Due Date: ${formattedDueDate}
- Estimated Hours: ${task.estimatedHours || 0} hours
- Progress: ${task.progress || 0}%

🏷️ *Tags:* ${task.tags || 'None'}

✅ Please review and start working on this task.`;

      console.log('📱 [NOTIFICATION] Notification message:', message);

      const response = await fetch(NOTIFICATION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      console.log('📱 [NOTIFICATION] Response status:', response.status);

      if (!response.ok) {
        let errorText = '';
        try { errorText = await response.text(); } catch {}
        console.error('📱 [NOTIFICATION] Failed to send notification:', errorText);
        return {
          success: false,
          error: `Failed to send notification: ${response.status}${errorText ? ` - ${errorText}` : ''}`,
        };
      }

      let data;
      try {
        data = await response.json();
      } catch {
        // Some APIs might not return JSON
        data = { success: true };
      }

      console.log('📱 [NOTIFICATION] Notification sent successfully:', data);

      return {
        success: true,
        data: data,
        message: 'WhatsApp notification sent successfully',
      };
    } catch (error) {
      console.error('📱 [NOTIFICATION] Error sending notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification',
      };
    }
  }
}

export const apiService = new ApiService();
