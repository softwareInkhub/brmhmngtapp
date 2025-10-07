import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Task, Team, Project, Meeting, Sprint } from '../types';

interface AppState {
  tasks: Task[];
  teams: Team[];
  projects: Project[];
  meetings: Meeting[];
  sprints: Sprint[];
  isLoading: boolean;
}

type AppAction =
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_TEAM'; payload: Team }
  | { type: 'UPDATE_TEAM'; payload: Team }
  | { type: 'DELETE_TEAM'; payload: string }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'ADD_MEETING'; payload: Meeting }
  | { type: 'UPDATE_MEETING'; payload: Meeting }
  | { type: 'DELETE_MEETING'; payload: string }
  | { type: 'ADD_SPRINT'; payload: Sprint }
  | { type: 'UPDATE_SPRINT'; payload: Sprint }
  | { type: 'DELETE_SPRINT'; payload: string };

const initialState: AppState = {
  tasks: [
    {
      id: 'task-1',
      title: 'Setup Project Structure',
      description: 'Initialize the project with proper folder structure and configuration',
      status: 'Completed',
      priority: 'High',
      assignee: 'John Doe',
      project: 'Project Alpha',
      startDate: '2024-01-15',
      dueDate: '2024-01-20',
      estimatedHours: 8,
      progress: 100,
      tags: ['setup', 'configuration'],
      comments: 'Completed successfully',
      createdAt: '2024-01-15T09:00:00.000Z',
      updatedAt: '2024-01-20T17:00:00.000Z',
    },
    {
      id: 'task-2',
      title: 'Implement User Authentication',
      description: 'Create login and registration functionality',
      status: 'In Progress',
      priority: 'High',
      assignee: 'Sarah Johnson',
      project: 'Project Alpha',
      startDate: '2024-01-20',
      dueDate: '2024-01-25',
      estimatedHours: 16,
      progress: 60,
      tags: ['auth', 'security'],
      comments: 'Working on JWT implementation',
      createdAt: '2024-01-20T10:00:00.000Z',
      updatedAt: '2024-01-22T14:30:00.000Z',
    },
    {
      id: 'task-3',
      title: 'Design Dashboard UI',
      description: 'Create wireframes and mockups for the main dashboard',
      status: 'To Do',
      priority: 'Medium',
      assignee: 'Alex Chen',
      project: 'Project Beta',
      startDate: '2024-01-25',
      dueDate: '2024-01-30',
      estimatedHours: 12,
      progress: 0,
      tags: ['design', 'ui', 'dashboard'],
      comments: 'Waiting for requirements',
      createdAt: '2024-01-22T11:00:00.000Z',
      updatedAt: '2024-01-22T11:00:00.000Z',
    },
  ], // Start with sample tasks for testing
  teams: [
    {
      id: '1',
      name: 'Product Team',
      description: 'Responsible for product strategy and development',
      members: [
        { id: 'member-1', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'admin' },
        { id: 'member-2', name: 'Alex Chen', email: 'alex@company.com', role: 'member' },
        { id: 'member-3', name: 'Maria Rodriguez', email: 'maria@company.com', role: 'member' },
      ],
      projects: ['1', '2'],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: '2',
      name: 'Marketing Team',
      description: 'Handles marketing campaigns and brand management',
      members: [
        { id: 'member-4', name: 'David Kim', email: 'david@company.com', role: 'admin' },
        { id: 'member-5', name: 'Emily Davis', email: 'emily@company.com', role: 'member' },
      ],
      projects: ['2'],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ],
  projects: [
    {
      id: '1',
      name: 'Project Alpha',
      description: 'Main product development project',
      status: 'active',
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      teamId: '1',
      tasks: ['1', '2'],
      progress: 45,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: '2',
      name: 'Project Beta',
      description: 'Secondary feature development project',
      status: 'planning',
      startDate: '2024-02-01',
      endDate: '2024-08-31',
      teamId: '1',
      tasks: ['3'],
      progress: 10,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ],
  meetings: [
    {
      id: '1',
      title: 'Team Meeting',
      description: 'Weekly team standup meeting',
      date: new Date().toISOString().split('T')[0], // Today's date
      startTime: '10:00',
      endTime: '11:00',
      attendees: ['member-1', 'member-2', 'member-3'],
      teamId: '1',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
    },
    {
      id: '2',
      title: 'Sprint Review',
      description: 'Sprint review and planning meeting',
      date: new Date().toISOString().split('T')[0], // Today's date
      startTime: '13:00',
      endTime: '14:00',
      attendees: ['member-1', 'member-2', 'member-3'],
      teamId: '1',
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
    },
  ],
  sprints: [
    {
      id: '1',
      name: 'Sprint 1 - User Authentication',
      description: 'Implement user authentication system',
      startDate: '2024-01-01',
      endDate: '2024-01-14',
      goals: ['Setup authentication', 'User registration', 'Login system'],
      tasks: ['1'],
      teamId: '1',
      status: 'completed',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: '2',
      name: 'Sprint 2 - Dashboard Development',
      description: 'Build main dashboard interface',
      startDate: '2024-01-15',
      endDate: '2024-01-28',
      goals: ['Dashboard UI', 'Data visualization', 'Navigation'],
      tasks: ['2', '3'],
      teamId: '1',
      status: 'active',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ],
  isLoading: false,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? action.payload : task
        ),
      };
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
      };
    case 'SET_TASKS':
      return {
        ...state,
        tasks: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'ADD_TEAM':
      return { ...state, teams: [...state.teams, action.payload] };
    case 'UPDATE_TEAM':
      return {
        ...state,
        teams: state.teams.map(team =>
          team.id === action.payload.id ? action.payload : team
        ),
      };
    case 'DELETE_TEAM':
      return {
        ...state,
        teams: state.teams.filter(team => team.id !== action.payload),
      };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(project =>
          project.id === action.payload.id ? action.payload : project
        ),
      };
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(project => project.id !== action.payload),
      };
    case 'ADD_MEETING':
      return { ...state, meetings: [...state.meetings, action.payload] };
    case 'UPDATE_MEETING':
      return {
        ...state,
        meetings: state.meetings.map(meeting =>
          meeting.id === action.payload.id ? action.payload : meeting
        ),
      };
    case 'DELETE_MEETING':
      return {
        ...state,
        meetings: state.meetings.filter(meeting => meeting.id !== action.payload),
      };
    case 'ADD_SPRINT':
      return { ...state, sprints: [...state.sprints, action.payload] };
    case 'UPDATE_SPRINT':
      return {
        ...state,
        sprints: state.sprints.map(sprint =>
          sprint.id === action.payload.id ? action.payload : sprint
        ),
      };
    case 'DELETE_SPRINT':
      return {
        ...state,
        sprints: state.sprints.filter(sprint => sprint.id !== action.payload),
      };
    default:
      return state;
  }
};

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};