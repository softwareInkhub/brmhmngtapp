import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

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
import SprintsScreen from '../screens/SprintsScreen';
import CreateTaskScreen from '../screens/CreateTaskScreen';
import CreateTeamScreen from '../screens/CreateTeamScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Tasks') {
            iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
          } else if (route.name === 'Teams') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Calendar') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Sprints') {
            iconName = focused ? 'flag' : 'flag-outline';
          } else {
            iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: '#137fec',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
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
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Teams" component={TeamsScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Sprints" component={SprintsScreen} />
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
});

export default AppNavigator;