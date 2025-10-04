import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import ProfileHeader from '../components/ProfileHeader';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { state } = useAppContext();
  const { tasks, meetings, sprints, teams } = state;
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userManagementTab, setUserManagementTab] = useState('Active Users');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoApprovalEnabled, setAutoApprovalEnabled] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Add safety check to ensure context data is available
  if (!tasks || !meetings || !sprints || !teams) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate analytics data with null checks
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(task => task.status === 'Done').length || 0;
  const pendingTasks = tasks?.filter(task => task.status !== 'Done').length || 0;
  const activeTasks = tasks?.filter(task => task.status === 'In Progress').length || 0;
  
  const todayMeetings = meetings?.filter(meeting => {
    const today = new Date().toISOString().split('T')[0];
    return meeting.date === today;
  }).length || 0;
  
  const activeSprints = sprints?.filter(sprint => sprint.status === 'active').length || 0;

  // Debug logging
  console.log('DashboardScreen - Real Data Debug:');
  console.log('Total tasks:', totalTasks);
  console.log('Active tasks:', activeTasks);
  console.log('Today meetings:', todayMeetings);
  console.log('Active sprints:', activeSprints);
  console.log('Tasks data:', tasks);
  console.log('Meetings data:', meetings);
  console.log('Sprints data:', sprints);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get recent tasks (last 5)
  const recentTasks = tasks?.slice(0, 5) || [];
  
  // Get upcoming meetings (next 3)
  const upcomingMeetings = meetings?.slice(0, 3) || [];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const tabs = [
    { id: 'Overview', label: 'Overview', icon: 'grid-outline' },
    { id: 'Tasks', label: 'Tasks', icon: 'checkmark-circle-outline' },
    { id: 'Meetings', label: 'Meetings', icon: 'calendar-outline' },
    { id: 'Teams', label: 'Teams', icon: 'people-outline' },
    { id: 'Sprints', label: 'Sprints', icon: 'speedometer-outline' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done':
        return '#10b981';
      case 'In Progress':
        return '#f59e0b';
      case 'To Do':
        return '#6b7280';
      default:
        return '#6b7280';
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

  const renderOverviewTab = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      {/* Quick Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#3b82f6' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
        </View>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{totalTasks}</Text>
            <Text style={styles.statLabel}>Total Tasks</Text>
          </View>
      </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#10b981' }]}>
            <Ionicons name="play-circle" size={20} color="#fff" />
                </View>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{activeTasks}</Text>
            <Text style={styles.statLabel}>Active</Text>
                </View>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#f59e0b' }]}>
            <Ionicons name="calendar" size={20} color="#fff" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{todayMeetings}</Text>
            <Text style={styles.statLabel}>Today's Meetings</Text>
          </View>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#8b5cf6' }]}>
            <Ionicons name="speedometer" size={20} color="#fff" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{activeSprints}</Text>
            <Text style={styles.statLabel}>Active Sprints</Text>
          </View>
        </View>
      </View>

      {/* Progress Overview */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View style={styles.progressTitleContainer}>
            <View style={styles.progressIconContainer}>
              <Ionicons name="trending-up" size={20} color="#10b981" />
            </View>
            <Text style={styles.progressTitle}>Progress Overview</Text>
          </View>
          <View style={styles.progressPercentageContainer}>
            <Text style={styles.progressPercentage}>{completionRate}%</Text>
            <View style={styles.progressTrend}>
              <Ionicons name="arrow-up" size={12} color="#10b981" />
              <Text style={styles.progressTrendText}>+12%</Text>
            </View>
          </View>
        </View>
        
        {/* Line Graph */}
        <View style={styles.lineGraphContainer}>
          <View style={styles.graphHeader}>
            <Text style={styles.graphTitle}>Progress Trend</Text>
            <View style={styles.graphLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} />
                <Text style={styles.legendText}>Tasks</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.lineGraph}>
            {/* Grid Lines */}
            <View style={styles.gridContainer}>
              {[0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={[styles.gridLine, { left: `${i * 25}%` }]} />
              ))}
            </View>
            
            {/* Line Chart */}
            <View style={styles.chartContainer}>
              {/* Data Points */}
              <View style={[styles.dataPoint, { left: '0%', top: '30%' }]}>
                <View style={styles.dataPointInner} />
              </View>
              <View style={[styles.dataPoint, { left: '20%', top: '20%' }]}>
                <View style={styles.dataPointInner} />
              </View>
              <View style={[styles.dataPoint, { left: '40%', top: '60%' }]}>
                <View style={styles.dataPointInner} />
              </View>
              <View style={[styles.dataPoint, { left: '60%', top: '10%' }]}>
                <View style={[styles.dataPointInner, styles.dataPointHighlight]} />
              </View>
              <View style={[styles.dataPoint, { left: '80%', top: '40%' }]}>
                <View style={styles.dataPointInner} />
              </View>
              <View style={[styles.dataPoint, { left: '100%', top: '35%' }]}>
                <View style={styles.dataPointInner} />
              </View>
              
              {/* Gradient Line */}
              <View style={styles.gradientLine} />
              
              {/* Area Fill */}
              <View style={styles.areaFill} />
            </View>
            
            {/* X-axis Labels */}
            <View style={styles.xAxisLabels}>
              <Text style={styles.xAxisLabel}>Feb 1</Text>
              <Text style={styles.xAxisLabel}>Feb 8</Text>
              <Text style={[styles.xAxisLabel, styles.xAxisLabelActive]}>Feb 15</Text>
              <Text style={styles.xAxisLabel}>Feb 22</Text>
            </View>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
          </View>
          <Text style={styles.progressBarLabel}>{completionRate}% Complete</Text>
        </View>
        
        <View style={styles.progressStatsGrid}>
          <View style={styles.progressStatCard}>
            <View style={[styles.statIconSmall, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            </View>
            <View style={styles.statContentSmall}>
              <Text style={styles.statNumberSmall}>{completedTasks}</Text>
              <Text style={styles.statLabelSmall}>Completed</Text>
            </View>
          </View>
          
          <View style={styles.progressStatCard}>
            <View style={[styles.statIconSmall, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="time" size={16} color="#f59e0b" />
            </View>
            <View style={styles.statContentSmall}>
              <Text style={styles.statNumberSmall}>{pendingTasks}</Text>
              <Text style={styles.statLabelSmall}>Pending</Text>
            </View>
          </View>
          
          <View style={styles.progressStatCard}>
            <View style={[styles.statIconSmall, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="flame" size={16} color="#3b82f6" />
            </View>
            <View style={styles.statContentSmall}>
              <Text style={styles.statNumberSmall}>{activeTasks}</Text>
              <Text style={styles.statLabelSmall}>Active</Text>
            </View>
          </View>
        </View>
      </View>

      {/* User Management Section */}
      <View style={styles.userManagementSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="shield-checkmark" size={20} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>User Management</Text>
        </View>
          <TouchableOpacity style={styles.manageButton}>
            <Text style={styles.manageButtonText}>Manage Users</Text>
        </TouchableOpacity>
      </View>

        {/* User Management Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.userTabContainer}
          contentContainerStyle={styles.userTabContentContainer}
        >
          {[
            { id: 'Active Users', label: 'Active Users', icon: 'people' },
            { id: 'Teams', label: 'Teams', icon: 'business' },
            { id: 'Roles', label: 'Roles', icon: 'shield' },
            { id: 'Permissions', label: 'Permissions', icon: 'lock-closed' },
            { id: 'Settings', label: 'Settings', icon: 'settings' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.userTab, userManagementTab === tab.id && styles.activeUserTab]}
              onPress={() => setUserManagementTab(tab.id)}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={14} 
                color={userManagementTab === tab.id ? '#8b5cf6' : '#6b7280'} 
              />
              <Text style={[styles.userTabText, userManagementTab === tab.id && styles.activeUserTabText]}>
                {tab.label}
              </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>

        {/* User Stats Grid - Only Two Cards */}
        <View style={styles.userStatsGrid}>
          <View style={[styles.userStatCard, { backgroundColor: '#f3e8ff' }]}>
            <View style={styles.userStatIcon}>
              <Ionicons name="people" size={20} color="#8b5cf6" />
            </View>
            <View style={styles.userStatContent}>
              <Text style={styles.userStatNumber}>1250</Text>
              <Text style={styles.userStatLabel}>Total Users</Text>
          </View>
        </View>

          <View style={[styles.userStatCard, { backgroundColor: '#f0fdf4' }]}>
            <View style={styles.userStatIcon}>
              <Ionicons name="trending-up" size={20} color="#10b981" />
                      </View>
            <View style={styles.userStatContent}>
              <Text style={styles.userStatNumber}>180</Text>
              <Text style={styles.userStatLabel}>Active Today</Text>
                    </View>
          </View>
        </View>

        {/* User Management Content Based on Tab */}
        {userManagementTab === 'Active Users' && (
          <View style={styles.userTabContent}>
            <Text style={styles.recentUsersTitle}>Active Users</Text>
            <View style={styles.userList}>
              <View style={styles.userItem}>
                <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>John Doe</Text>
                  <Text style={styles.userDetails}>2 apps • 15/03/2024</Text>
                </View>
                <TouchableOpacity style={styles.userActionButton}>
                  <Ionicons name="ellipsis-vertical" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.userItem}>
                <View style={[styles.statusDot, { backgroundColor: '#10b981' }]} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>Jane Smith</Text>
                  <Text style={styles.userDetails}>1 apps • 14/03/2024</Text>
                </View>
                <TouchableOpacity style={styles.userActionButton}>
                  <Ionicons name="ellipsis-vertical" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.userItem}>
                <View style={[styles.statusDot, { backgroundColor: '#6b7280' }]} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>Mike Johnson</Text>
                  <Text style={styles.userDetails}>0 apps • Never</Text>
                </View>
                <TouchableOpacity style={styles.userActionButton}>
                  <Ionicons name="ellipsis-vertical" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {userManagementTab === 'Teams' && (
          <View style={styles.userTabContent}>
            <Text style={styles.recentUsersTitle}>Team Management</Text>
            <View style={styles.teamList}>
              <View style={styles.teamItem}>
                <View style={styles.teamIcon}>
                  <Ionicons name="business" size={20} color="#3b82f6" />
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>Development Team</Text>
                  <Text style={styles.teamDetails}>8 members • Active</Text>
                </View>
                <TouchableOpacity style={styles.teamActionButton}>
                  <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.teamItem}>
                <View style={styles.teamIcon}>
                  <Ionicons name="business" size={20} color="#10b981" />
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>Design Team</Text>
                  <Text style={styles.teamDetails}>5 members • Active</Text>
                </View>
                <TouchableOpacity style={styles.teamActionButton}>
                  <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {userManagementTab === 'Settings' && (
          <View style={styles.userTabContent}>
            <Text style={styles.recentUsersTitle}>User Settings</Text>
            <View style={styles.settingsList}>
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingName}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>Get notified about user activities</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.toggleButton, notificationsEnabled && styles.toggleButtonActive]}
                  onPress={() => setNotificationsEnabled(!notificationsEnabled)}
                >
                  <View style={[styles.toggleCircle, notificationsEnabled && styles.toggleCircleActive]} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingName}>Auto Approval</Text>
                  <Text style={styles.settingDescription}>Automatically approve new users</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.toggleButton, autoApprovalEnabled && styles.toggleButtonActive]}
                  onPress={() => setAutoApprovalEnabled(!autoApprovalEnabled)}
                >
                  <View style={[styles.toggleCircle, autoApprovalEnabled && styles.toggleCircleActive]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {userManagementTab === 'Roles' && (
          <View style={styles.userTabContent}>
            <Text style={styles.recentUsersTitle}>User Roles</Text>
            <View style={styles.roleList}>
              <View style={styles.roleItem}>
                <View style={[styles.roleIcon, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="crown" size={16} color="#f59e0b" />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleName}>Admin</Text>
                  <Text style={styles.roleDetails}>Full system access</Text>
                </View>
                <Text style={styles.roleCount}>3 users</Text>
              </View>
              
              <View style={styles.roleItem}>
                <View style={[styles.roleIcon, { backgroundColor: '#dbeafe' }]}>
                  <Ionicons name="shield" size={16} color="#3b82f6" />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleName}>Manager</Text>
                  <Text style={styles.roleDetails}>Team management access</Text>
                </View>
                <Text style={styles.roleCount}>12 users</Text>
              </View>
              
              <View style={styles.roleItem}>
                <View style={[styles.roleIcon, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="person" size={16} color="#10b981" />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleName}>User</Text>
                  <Text style={styles.roleDetails}>Basic access</Text>
                </View>
                <Text style={styles.roleCount}>1235 users</Text>
              </View>
            </View>
          </View>
        )}

        {userManagementTab === 'Permissions' && (
          <View style={styles.userTabContent}>
            <Text style={styles.recentUsersTitle}>Permission Groups</Text>
            <View style={styles.permissionList}>
              <View style={styles.permissionItem}>
                <Ionicons name="create" size={20} color="#3b82f6" />
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionName}>Create & Edit</Text>
                  <Text style={styles.permissionDetails}>Can create and modify content</Text>
                </View>
                <TouchableOpacity style={styles.permissionToggle}>
                  <Ionicons name="checkmark" size={16} color="#10b981" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.permissionItem}>
                <Ionicons name="trash" size={20} color="#ef4444" />
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionName}>Delete</Text>
                  <Text style={styles.permissionDetails}>Can delete content</Text>
                </View>
                <TouchableOpacity style={styles.permissionToggle}>
                  <Ionicons name="checkmark" size={16} color="#10b981" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.permissionItem}>
                <Ionicons name="settings" size={20} color="#6b7280" />
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionName}>System Settings</Text>
                  <Text style={styles.permissionDetails}>Can modify system settings</Text>
                </View>
                <TouchableOpacity style={styles.permissionToggle}>
                  <Ionicons name="close" size={16} color="#ef4444" />
                </TouchableOpacity>
                      </View>
                    </View>
                    </View>
                  )}
                </View>

      {/* Quick Calendar */}
      <View style={styles.calendarCard}>
        <TouchableOpacity 
          style={styles.calendarButton}
          onPress={() => setActiveTab('Meetings')}
        >
          <View style={styles.calendarIcon}>
            <Ionicons name="calendar-outline" size={32} color="#3b82f6" />
          </View>
          <View style={styles.calendarText}>
            <Text style={styles.calendarTitle}>Calendar</Text>
            <Text style={styles.calendarSubtitle}>Click to view meetings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderTasksTab = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      {/* Active Tasks */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="play-circle" size={20} color="#f59e0b" />
          <Text style={styles.sectionTitle}>Active Tasks</Text>
        </View>
        {tasks.filter(task => task.status === 'In Progress').length > 0 ? (
          tasks.filter(task => task.status === 'In Progress').map((item) => (
            <TouchableOpacity 
              key={item.id}
              style={styles.taskItem}
              onPress={() => navigation.navigate('TaskDetails' as never, { taskId: item.id } as never)}
            >
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle} numberOfLines={1}>{item.title || 'No Title'}</Text>
                <Text style={styles.taskProject}>{item.project || 'No Project'}</Text>
              </View>
              <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(item.priority) }]} />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No active tasks</Text>
        )}
                    </View>

      {/* Recent Tasks */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time" size={20} color="#6b7280" />
          <Text style={styles.sectionTitle}>Recent Tasks</Text>
        </View>
        {recentTasks.length > 0 ? (
          recentTasks.map((item) => (
            <TouchableOpacity 
              key={item.id}
              style={styles.taskItem}
              onPress={() => navigation.navigate('TaskDetails' as never, { taskId: item.id } as never)}
            >
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle} numberOfLines={1}>{item.title || 'No Title'}</Text>
                <Text style={styles.taskProject}>{item.project || 'No Project'}</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No recent tasks</Text>
                  )}
                </View>
    </Animated.View>
  );

  const renderMeetingsTab = () => {
    const todayMeetingsList = meetings.filter(meeting => {
      const today = new Date().toISOString().split('T')[0];
      return meeting.date === today;
    });

    return (
      <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
        {/* Today's Meetings */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="today" size={20} color="#10b981" />
            <Text style={styles.sectionTitle}>Today's Meetings</Text>
                </View>
          {todayMeetingsList.length > 0 ? (
            todayMeetingsList.map((item) => (
              <View key={item.id} style={styles.meetingItem}>
                <View style={styles.meetingTime}>
                  <Text style={styles.meetingTimeText}>{item.time}</Text>
              </View>
                <View style={styles.meetingInfo}>
                  <Text style={styles.meetingTitle}>{item.title}</Text>
                  <Text style={styles.meetingLocation}>{item.location}</Text>
          </View>
                <Ionicons name="videocam" size={20} color="#6b7280" />
        </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No meetings today</Text>
          )}
        </View>

        {/* Upcoming Meetings */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Upcoming Meetings</Text>
          </View>
          {upcomingMeetings.length > 0 ? (
            upcomingMeetings.map((item) => (
              <View key={item.id} style={styles.meetingItem}>
                <View style={styles.meetingDate}>
                  <Text style={styles.meetingDateText}>{item.date}</Text>
                  <Text style={styles.meetingTimeText}>{item.time}</Text>
                </View>
                <View style={styles.meetingInfo}>
                  <Text style={styles.meetingTitle}>{item.title}</Text>
                  <Text style={styles.meetingLocation}>{item.location}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No upcoming meetings</Text>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderTeamsTab = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people" size={20} color="#8b5cf6" />
          <Text style={styles.sectionTitle}>Teams</Text>
        </View>
        {teams.length > 0 ? (
          teams.map((item) => (
            <TouchableOpacity 
              key={item.id}
              style={styles.teamItem}
              onPress={() => navigation.navigate('TeamDetails' as never, { teamId: item.id } as never)}
            >
              <View style={styles.teamIcon}>
                <Ionicons name="people" size={24} color="#8b5cf6" />
              </View>
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{item.name}</Text>
                <Text style={styles.teamMembers}>{item.members.length} members</Text>
                    </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No teams found</Text>
                  )}
                </View>
    </Animated.View>
  );

  const renderSprintsTab = () => {
    const activeSprintsList = sprints.filter(sprint => sprint.status === 'active');
    
    return (
      <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="speedometer" size={20} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Active Sprints</Text>
          </View>
          {activeSprintsList.length > 0 ? (
            activeSprintsList.map((item) => (
              <View key={item.id} style={styles.sprintItem}>
                <View style={styles.sprintInfo}>
                  <Text style={styles.sprintName}>{item.name}</Text>
                  <Text style={styles.sprintDuration}>{item.startDate} - {item.endDate}</Text>
                </View>
                <View style={styles.sprintProgress}>
                  <Text style={styles.sprintProgressText}>{item.progress}%</Text>
                  <View style={styles.sprintProgressBar}>
                    <View style={[styles.sprintProgressFill, { width: `${item.progress}%` }]} />
                </View>
              </View>
          </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No active sprints</Text>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Overview':
        return renderOverviewTab();
      case 'Tasks':
        return renderTasksTab();
      case 'Meetings':
        return renderMeetingsTab();
      case 'Teams':
        return renderTeamsTab();
      case 'Sprints':
        return renderSprintsTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Header */}
      <ProfileHeader
        title="My Dashboard"
        subtitle="Project overview"
        rightElement={
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#1f2937" />
          </TouchableOpacity>
        }
        onProfilePress={() => {
          // Handle profile navigation
        }}
        onRightElementPress={() => {
          // Handle notification navigation
        }}
      />

      {/* Compact Tab Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
        contentContainerStyle={styles.tabContentContainer}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={14} 
              color={activeTab === tab.id ? '#3b82f6' : '#6b7280'} 
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingBottom: 80, // Add space for bottom tab bar
  },
  notificationButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  tabContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    maxHeight: 50,
    marginBottom: 15,
  },
  tabContentContainer: {
    paddingHorizontal: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    minWidth: 70,
    height: 32,
  },
  activeTab: {
    backgroundColor: '#dbeafe',
  },
  tabText: {
    marginLeft: 3,
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContent: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    height: 60,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'left',
  },
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  progressPercentageContainer: {
    alignItems: 'flex-end',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10b981',
    marginBottom: 2,
  },
  progressTrend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrendText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 2,
  },
  lineGraphContainer: {
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  graphTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  graphLegend: {
    flexDirection: 'row',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  lineGraph: {
    height: 120,
    position: 'relative',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    bottom: 20,
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  chartContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    transform: [{ translateX: -4 }, { translateY: -4 }],
  },
  dataPointInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8b5cf6',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dataPointHighlight: {
    backgroundColor: '#f59e0b',
    borderColor: '#ffffff',
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#f59e0b',
  },
  gradientLine: {
    position: 'absolute',
    top: '25%',
    left: '5%',
    right: '5%',
    height: 3,
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  areaFill: {
    position: 'absolute',
    top: '25%',
    left: '5%',
    right: '5%',
    height: 60,
    backgroundColor: '#8b5cf6',
    opacity: 0.1,
    borderRadius: 8,
  },
  xAxisLabels: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  xAxisLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  xAxisLabelActive: {
    backgroundColor: '#f3e8ff',
    color: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '600',
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 5,
  },
  progressBarLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  progressStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statContentSmall: {
    flex: 1,
  },
  statNumberSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 1,
  },
  statLabelSmall: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  calendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  calendarText: {
    flex: 1,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  calendarSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  taskProject: {
    fontSize: 12,
    color: '#6b7280',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  meetingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  meetingTime: {
    width: 60,
    alignItems: 'center',
    marginRight: 12,
  },
  meetingTimeText: {
    fontSize: 12,
    color: '#6b7280',
  },
  meetingDate: {
    width: 60,
    alignItems: 'center',
    marginRight: 12,
  },
  meetingDateText: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  meetingInfo: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  meetingLocation: {
    fontSize: 12,
    color: '#6b7280',
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  teamIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  teamMembers: {
    fontSize: 12,
    color: '#6b7280',
  },
  sprintItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sprintInfo: {
    marginBottom: 8,
  },
  sprintName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  sprintDuration: {
    fontSize: 12,
    color: '#6b7280',
  },
  sprintProgress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sprintProgressText: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 8,
    width: 30,
  },
  sprintProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  sprintProgressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  // User Management Styles
  userManagementSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 6,
  },
  manageButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  manageButtonText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  userStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  userStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    height: 60,
  },
  userStatIcon: {
    marginRight: 10,
  },
  userStatContent: {
    flex: 1,
    alignItems: 'flex-start',
  },
  userStatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  userStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'left',
  },
  recentUsersSection: {
    marginTop: 4,
  },
  recentUsersTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  userList: {
    gap: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  userInfo: {
    marginLeft: 10,
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 1,
  },
  userDetails: {
    fontSize: 11,
    color: '#6b7280',
  },
  // User Management Tabs
  userTabContainer: {
    marginBottom: 12,
  },
  userTabContentContainer: {
    paddingHorizontal: 4,
  },
  userTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    minWidth: 90,
  },
  activeUserTab: {
    backgroundColor: '#f3e8ff',
  },
  userTabText: {
    marginLeft: 4,
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeUserTabText: {
    color: '#8b5cf6',
  },
  userTabContent: {
    marginTop: 8,
  },
  // User Action Buttons
  userActionButton: {
    padding: 8,
  },
  // Team Management
  teamList: {
    gap: 8,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  teamIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  teamDetails: {
    fontSize: 11,
    color: '#6b7280',
  },
  teamActionButton: {
    padding: 8,
  },
  // Settings Toggle
  settingsList: {
    gap: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
  },
  settingName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 11,
    color: '#6b7280',
  },
  toggleButton: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleCircleActive: {
    transform: [{ translateX: 20 }],
  },
  // Roles
  roleList: {
    gap: 8,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  roleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  roleDetails: {
    fontSize: 11,
    color: '#6b7280',
  },
  roleCount: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  // Permissions
  permissionList: {
    gap: 8,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  permissionInfo: {
    flex: 1,
    marginLeft: 10,
  },
  permissionName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  permissionDetails: {
    fontSize: 11,
    color: '#6b7280',
  },
  permissionToggle: {
    padding: 4,
  },
});

export default DashboardScreen; 