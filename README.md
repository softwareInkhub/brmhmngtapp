# BRMH Management App

A React Native Expo mobile application for project management, built with TypeScript. This app provides comprehensive task, project, team, and meeting management capabilities with real-time WhatsApp notifications.

## Features

### 📱 Core Functionality
- **Task Management**: Create, read, update, and delete tasks with full CRUD operations
- **Project Organization**: Organize tasks by projects with detailed project information
- **Team Collaboration**: Manage teams and assign tasks to team members
- **Meeting Scheduling**: Schedule and manage team meetings
- **Sprint Management**: Organize tasks into sprints for agile development

### 🔔 WhatsApp Notifications
- **Real-time Notifications**: Automatic WhatsApp notifications when new tasks are created
- **Rich Task Details**: Notifications include all task information (title, project, assignee, priority, dates, etc.)
- **Professional Formatting**: Well-formatted messages with emojis and structured information

### 🎨 UI/UX Features
- **Modern Design**: Clean, professional interface similar to Jira
- **Multiple Views**: List and grid view options for tasks
- **Responsive Layout**: Optimized for mobile devices
- **Dark/Light Theme Support**: Built with accessibility in mind

## API Integration

### Task Management API
- **Create Task**: `POST https://brmh.in/crud?tableName=project-management-tasks`
- **Get All Tasks**: `GET https://brmh.in/crud?tableName=project-management-tasks`
- **Get Task by ID**: `GET https://brmh.in/crud?tableName=project-management-tasks&id={taskId}`
- **Update Task**: `PUT https://brmh.in/crud?tableName=project-management-tasks&id={taskId}`
- **Delete Task**: `DELETE https://brmh.in/crud?tableName=project-management-tasks&id={taskId}`

### WhatsApp Notification API
- **Endpoint**: `https://brmh.in/notify/11d0d0c0-9745-48bd-bbbe-9aa0c517f294`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Body**: `{ "message": "formatted notification message" }`

## Task Schema

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  project: string;
  assignee: string;
  status: 'To Do' | 'In Progress' | 'Done' | 'Blocked';
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  startDate: string;
  estimatedHours: number;
  tags: string;
  subtasks: string; // JSON string
  comments: string; // Count as string
  progress: number; // 0-100
  timeSpent: string; // Hours as string
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

## WhatsApp Notification Format

When a new task is created, the following formatted message is sent via WhatsApp:

```
📢 *New Task Created*

🔹 *Task Title:* [Task Title]
🔹 *Project:* [Project Name]
🔹 *Description:* [Task Description]
🔹 *Assignee:* [Assignee Name]
🔹 *Status:* [Status]
🔹 *Priority:* [Priority]

📊 *Task Details*
- Start Date: [Formatted Date]
- Due Date: [Formatted Date]
- Estimated Hours: [Hours] hours
- Progress: [Progress]%

🏷️ *Tags:* [Tags]

📝 *Additional Notes:* [Comments]

✅ Please review and start working on this task.
```

## Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/softwareInkhub/brmhmngtapp.git
   cd brmhmngtapp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npx expo start
   ```

4. **Run on device/simulator**:
   - Scan the QR code with Expo Go app (mobile)
   - Press `i` for iOS simulator
   - Press `a` for Android emulator

## Project Structure

```
BRMHMANAGEMENT/
├── src/
│   ├── context/
│   │   └── AppContext.tsx          # Global state management
│   ├── navigation/
│   │   └── AppNavigator.tsx        # Navigation configuration
│   ├── screens/
│   │   ├── DashboardScreen.tsx     # Main dashboard
│   │   ├── TasksScreen.tsx         # Task list/grid view
│   │   ├── TaskDetailsScreen.tsx   # Individual task details
│   │   ├── CreateTaskScreen.tsx    # Task creation form
│   │   ├── TeamsScreen.tsx         # Team management
│   │   ├── CalendarScreen.tsx      # Meeting calendar
│   │   └── ...                     # Other screens
│   ├── services/
│   │   └── api.ts                  # API service with notifications
│   └── types/
│       └── index.ts                # TypeScript interfaces
├── App.js                          # Main app entry point
├── package.json                    # Dependencies
└── README.md                       # This file
```

## Key Features Implementation

### State Management
- Uses React Context API with `useReducer` for global state
- Centralized task, team, and meeting data management
- Real-time updates across all screens

### API Service
- Centralized API service with error handling
- Support for multiple response formats
- Automatic task verification after creation
- WhatsApp notification integration

### Navigation
- Stack navigator for screen transitions
- Bottom tab navigator for main sections
- Type-safe navigation with TypeScript

## Development Notes

### Error Handling
- Comprehensive error handling for API calls
- User-friendly error messages
- Fallback UI states for loading and errors

### Data Validation
- Form validation for required fields
- Type checking with TypeScript
- API response validation and parsing

### Performance
- Efficient list rendering with FlatList
- Optimized re-renders with proper keys
- Lazy loading and pagination support

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.
