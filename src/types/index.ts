export interface Task {
  id: string;
  title: string;
  description: string;
  project: string;
  assignee: string;
  status: 'To Do' | 'In Progress' | 'Completed' | 'Overdue';
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  startDate: string;
  estimatedHours: number;
  tags: string;
  subtasks: string;
  comments: string;
  progress: number;
  timeSpent: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed';
  startDate: string;
  endDate?: string;
  teamId: string;
  tasks: string[];
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  projects: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'member' | 'viewer';
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  teamId?: string;
  projectId?: string;
  location?: string;
  meetingLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Sprint {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  goals: string[];
  tasks: string[];
  teamId: string;
  status: 'planning' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'member';
  avatar?: string;
  phone?: string;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  message?: string;
  error?: string;
}

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Main: undefined;
  TaskDetails: { taskId: string };
  TeamDetails: { teamId: string };
  ProjectDetails: { projectId: string };
  MeetingDetails: { meetingId: string };
  CreateTask: undefined;
  CreateTeam: undefined;
  CreateProject: undefined;
  CreateMeeting: undefined;
};

export type BottomTabParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Teams: undefined;
  Calendar: undefined;
  Projects: undefined;
  Sprints: undefined;
};