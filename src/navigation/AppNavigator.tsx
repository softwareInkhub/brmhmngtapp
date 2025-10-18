import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList, BottomTabParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TasksScreen from '../screens/TasksScreen';
import TaskDetailsScreen from '../screens/TaskDetailsScreen';
import TeamsScreen from '../screens/TeamsScreen';
import TeamDetailsScreen from '../screens/TeamDetailsScreen';
import CalendarScreen from '../screens/CalendarScreen';
// import SprintsScreen from '../screens/SprintsScreen';
import ProjectsScreen from '../screens/ProjectsScreen';
import CreateProjectScreen from '../screens/CreateProjectScreen';
import ProjectDetailsScreen from '../screens/ProjectDetailsScreen';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import CreateTeamScreen from '../screens/CreateTeamScreen';
import CreateMeetingScreen from '../screens/CreateMeetingScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  // Tab bar height without safe area consideration
  const baseTabBarHeight = 55;
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else           if (route.name === 'Tasks') {
            // Show + icon when focused (on Tasks screen), clipboard when not focused
            iconName = focused ? 'add' : 'clipboard-outline';
          } else if (route.name === 'Teams') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Calendar') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Projects') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else {
            iconName = 'ellipse-outline';
          }

          // Special styling for Tasks tab
          if (route.name === 'Tasks') {
            return (
              <View style={styles.tasksTabContainer}>
                <View style={[styles.tasksTabGradient, { backgroundColor: focused ? '#0ea5e9' : '#6b7280' }]}>
                  <Ionicons name={iconName} size={focused ? 28 : 24} color="#ffffff" />
                </View>
              </View>
            );
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: '#137fec',
        tabBarInactiveTintColor: '#6b7280',
        tabBarHideOnKeyboard: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 0,
          height: baseTabBarHeight + insets.bottom,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },
        headerShown: false,
        tabBarShowLabel: true,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Projects" component={ProjectsScreen} />
      <Tab.Screen 
        name="Tasks" 
        component={TasksScreen}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            // Check if we're already on the Tasks screen
            const state = navigation.getState();
            const currentRoute = state.routes[state.index];
            
            if (currentRoute.name === 'Tasks') {
              // We're already on Tasks screen, prevent default navigation
              e.preventDefault();
              // Trigger the task creation modal by dispatching an event
              // The TasksScreen will listen for this event
              navigation.navigate('Tasks', { openCreateModal: true });
            }
          },
        })}
      />
      <Tab.Screen name="Teams" component={TeamsScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, isLoading, user, token } = useAuth();

  // Monitor auth state changes
  useEffect(() => {
    console.log('🔄 [NAVIGATOR] Auth state changed!');
    console.log('🔄 [NAVIGATOR] New state:', {
      isAuthenticated,
      isLoading,
      hasUser: !!user,
      hasToken: !!token,
      timestamp: new Date().toISOString()
    });
  }, [isAuthenticated, isLoading, user, token]);

  // Debug logging for navigation decisions
  console.log('🗺️ [NAVIGATOR] Render - Current auth state:', {
    isAuthenticated,
    isLoading,
    hasUser: !!user,
    hasToken: !!token
  });

  // Show loading screen while checking authentication
  if (isLoading) {
    console.log('🗺️ [NAVIGATOR] Showing loading screen...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#137fec" />
      </View>
    );
  }

  console.log(`🗺️ [NAVIGATOR] Rendering ${isAuthenticated ? 'MAIN APP' : 'AUTH'} screens`);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#f6f7f8',
          },
          headerTintColor: '#1f2937',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack - Show when user is not authenticated
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Signup" 
              component={SignupScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // Main App Stack - Show when user is authenticated
          <>
            <Stack.Screen 
              name="Main" 
              component={TabNavigator} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="TaskDetails" 
              component={TaskDetailsScreen}
              options={{ 
                title: 'Task Details',
              }}
            />
            <Stack.Screen 
              name="TeamDetails" 
              component={TeamDetailsScreen}
              options={{ 
                title: 'Team Details',
              }}
            />
            <Stack.Screen 
              name="CreateTask" 
              component={CreateTaskScreen}
              options={{ 
                title: 'Create Task',
              }}
            />
            <Stack.Screen 
              name="CreateTeam" 
              component={CreateTeamScreen}
              options={{ 
                title: 'Create Team',
              }}
            />
          <Stack.Screen 
            name="CreateProject" 
            component={CreateProjectScreen}
            options={{ 
              title: 'Create Project',
            }}
          />
          <Stack.Screen 
            name="ProjectDetails" 
            component={ProjectDetailsScreen}
            options={{ 
              title: 'Project Details',
            }}
          />
          <Stack.Screen 
            name="CreateMeeting" 
            component={CreateMeetingScreen}
            options={{ 
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="Notifications" 
            component={NotificationsScreen}
            options={{ 
              headerShown: false,
            }}
          />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  tasksTabContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -16,
    marginBottom: 8,
    shadowColor: '#0ea5e9',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  tasksTabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
});

export default AppNavigator;