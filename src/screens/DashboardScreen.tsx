import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { tasks, meetings, sprints } = useAppContext();

  // Calculate analytics data
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'Done').length;
  const pendingTasks = tasks.filter(task => task.status !== 'Done').length;
  
  const todayMeetings = meetings.filter(meeting => {
    const today = new Date().toISOString().split('T')[0];
    return meeting.date === today;
  }).length;
  
  const activeSprints = sprints.filter(sprint => sprint.status === 'active').length;

  const myTasks = [
    {
      id: '1',
      title: 'Review project proposal',
      dueDate: 'Due Today',
      priority: 'high' as const,
    },
    {
      id: '2',
      title: 'Schedule team meeting',
      dueDate: 'Due Tomorrow',
      priority: 'medium' as const,
    },
    {
      id: '3',
      title: 'Prepare presentation slides',
      dueDate: 'Due in 3 days',
      priority: 'low' as const,
    },
  ];

  const teamActivity = [
    {
      id: 'activity-1',
      type: 'assignment',
      message: "Sarah assigned you to 'Design Review'",
      time: '10 min ago',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmjR8c660qlmdngYRV-P85OinWxMFbxwHlmTy0ucl4BwZpZ-jNhlVqWbzQZGhCDvaSoXkadIBiYms3UkW4lbcww1DSx_XvrY8H_itFZ1JMm1SNF6ImeGTgfVmoJgfej6A-XOf5ukl0RYR1SAofeStonNbmiUF9qYah6DduxRNZGOSHxUgZj_hmIxMo3KhcyFE4MvLrRgBp16FCPzuTSpp_pzxN2LNB55J_JamPIkQ5DfvkwtNgGtaYf6PjDDrty6ZQ8md6W02KXwY',
    },
    {
      id: 'activity-2',
      type: 'meeting',
      message: "Team meeting for 'Project Alpha' at 2 PM",
      time: '3 hours ago',
      avatar: null,
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      default:
        return 'transparent';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.profileImage} />
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search-outline" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Analytics Cards Section */}
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Analytics</Text>
          <View style={styles.analyticsGrid}>
            {/* Total Tasks Card */}
            <TouchableOpacity 
              style={[styles.analyticsCard, styles.tasksCard]}
              onPress={() => navigation.navigate('Tasks' as never)}
            >
              <View style={styles.analyticsIcon}>
                <Ionicons name="checkmark-circle-outline" size={24} color="#137fec" />
              </View>
              <View style={styles.analyticsContent}>
                <Text style={styles.analyticsNumber}>{totalTasks}</Text>
                <Text style={styles.analyticsLabel}>Total Tasks</Text>
                <Text style={styles.analyticsSubtext}>
                  {completedTasks} completed, {pendingTasks} pending
                </Text>
              </View>
            </TouchableOpacity>

            {/* Calendar Card */}
            <TouchableOpacity 
              style={[styles.analyticsCard, styles.calendarCard]}
              onPress={() => navigation.navigate('Calendar' as never)}
            >
              <View style={styles.analyticsIcon}>
                <Ionicons name="calendar-outline" size={24} color="#10b981" />
              </View>
              <View style={styles.analyticsContent}>
                <Text style={styles.analyticsNumber}>{todayMeetings}</Text>
                <Text style={styles.analyticsLabel}>Today's Meetings</Text>
                <Text style={styles.analyticsSubtext}>
                  {meetings.length} total meetings
                </Text>
              </View>
            </TouchableOpacity>

            {/* Sprint Card */}
            <TouchableOpacity 
              style={[styles.analyticsCard, styles.sprintCard]}
              onPress={() => navigation.navigate('Sprints' as never)}
            >
              <View style={styles.analyticsIcon}>
                <Ionicons name="flag-outline" size={24} color="#f59e0b" />
              </View>
              <View style={styles.analyticsContent}>
                <Text style={styles.analyticsNumber}>{activeSprints}</Text>
                <Text style={styles.analyticsLabel}>Active Sprints</Text>
                <Text style={styles.analyticsSubtext}>
                  {sprints.length} total sprints
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Tasks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Tasks</Text>
          <View style={styles.taskList}>
            {myTasks.map((task) => (
              <TouchableOpacity key={task.id} style={styles.taskCard}>
                <View style={styles.taskIcon}>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#137fec" />
                </View>
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDueDate}>{task.dueDate}</Text>
                </View>
                <View
                  style={[
                    styles.priorityIndicator,
                    { backgroundColor: getPriorityColor(task.priority) },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Team Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Activity</Text>
          <View style={styles.activityList}>
            {teamActivity.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityIconContainer}>
                  {activity.avatar ? (
                    <View style={styles.activityAvatar}>
                      <View style={styles.avatarOverlay}>
                        <Ionicons name="person-add-outline" size={12} color="white" />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.meetingIcon}>
                      <Ionicons name="calendar-outline" size={24} color="#10b981" />
                    </View>
                  )}
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityMessage}>{activity.message}</Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
            ))}
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f6f7f8',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d1d5db',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  searchButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  taskList: {
    gap: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#137fec',
    opacity: 0.1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  taskDueDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  priorityIndicator: {
    width: 6,
    height: 24,
    borderRadius: 3,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  activityIconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  activityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d1d5db',
    position: 'relative',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#137fec',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#f6f7f8',
  },
  meetingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    opacity: 0.1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  // Analytics Cards Styles
  analyticsSection: {
    marginBottom: 32,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
  },
  tasksCard: {
    borderLeftColor: '#137fec',
  },
  calendarCard: {
    borderLeftColor: '#10b981',
  },
  sprintCard: {
    borderLeftColor: '#f59e0b',
  },
  analyticsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  analyticsContent: {
    flex: 1,
  },
  analyticsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  analyticsSubtext: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
});

export default DashboardScreen; 