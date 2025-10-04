import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const navigation = useNavigation();
  const { state } = useAppContext();
  const { tasks, meetings, sprints } = state;
  const [activeTab, setActiveTab] = useState('Quality');

  // Add safety check to ensure context data is available
  if (!tasks || !meetings || !sprints) {
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
  
  const todayMeetings = meetings?.filter(meeting => {
    const today = new Date().toISOString().split('T')[0];
    return meeting.date === today;
  }).length || 0;
  
  const activeSprints = sprints?.filter(sprint => sprint.status === 'active').length || 0;

  // Calculate completion percentage
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Get current date info
  const today = new Date();
  const currentDay = today.getDay();
  const currentDate = today.getDate();
  
  // Generate week dates
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - currentDay + i);
    weekDates.push({
      day: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][i],
      date: date.getDate(),
      isToday: date.getDate() === currentDate
    });
  }

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
      {/* Professional Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.buildingName}>Project Management</Text>
          <Ionicons name="chevron-down" size={16} color="#6b7280" />
          <Text style={styles.subtitle}>BRMH Management System</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {['Efficiency', 'Quality', 'Tasks'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab && styles.activeTabText
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Performance Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardLabel}>Current</Text>
              <View style={styles.mainMetric}>
                <Text style={styles.mainNumber}>{totalTasks}</Text>
                <View style={styles.trendContainer}>
                  <Text style={styles.trendText}>+{completionRate}%</Text>
                  <Ionicons name="trending-up" size={12} color="#10b981" />
                </View>
              </View>
              <Text style={styles.metricLabel}>TOTAL TASKS</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.timeRange}>Last 30 days</Text>
              <Ionicons name="chevron-down" size={16} color="#6b7280" />
              <View style={styles.miniChart}>
                <View style={styles.chartLine} />
              </View>
            </View>
          </View>
        </View>

        {/* Calendar Card */}
        <View style={styles.card}>
          <View style={styles.calendarContainer}>
            <View style={styles.dayRow}>
              {weekDates.map((day, index) => (
                <Text key={index} style={styles.dayText}>{day.day}</Text>
              ))}
            </View>
            <View style={styles.dateRow}>
              {weekDates.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateButton,
                    day.isToday && styles.todayButton
                  ]}
                >
                  <Text style={[
                    styles.dateText,
                    day.isToday && styles.todayText
                  ]}>
                    {day.date}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Progress Gauge Card */}
        <View style={styles.card}>
          <View style={styles.gaugeContainer}>
            <View style={styles.gauge}>
              <View style={styles.gaugeInner}>
                <Text style={styles.gaugeText}>ACTIVE</Text>
              </View>
            </View>
            <View style={styles.gaugeLabels}>
              <View style={styles.labelItem}>
                <Text style={styles.labelValue}>150</Text>
                <Text style={styles.labelText}>HIGH PRIORITY</Text>
              </View>
              <View style={styles.labelItem}>
                <Text style={styles.labelValue}>120</Text>
                <Text style={styles.labelText}>MEDIUM PRIORITY</Text>
              </View>
              <View style={styles.labelItem}>
                <Text style={styles.labelValue}>130</Text>
                <Text style={styles.labelText}>LOW PRIORITY</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Status Distribution Card */}
        <View style={styles.card}>
          <View style={styles.statusContainer}>
            <Text style={styles.cardTitle}>Task Status Distribution</Text>
            <View style={styles.statusBar}>
              <View style={[styles.statusSegment, { width: `${completionRate}%`, backgroundColor: '#10b981' }]} />
              <View style={[styles.statusSegment, { width: `${100 - completionRate}%`, backgroundColor: '#ef4444' }]} />
            </View>
            <View style={styles.statusLabels}>
              <Text style={styles.statusLabel}>{completionRate}% Completed</Text>
              <Text style={styles.statusLabel}>{100 - completionRate}% Pending</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCard1]}>
            <Text style={styles.statNumber}>{completedTasks}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={[styles.statCard, styles.statCard2]}>
            <Text style={styles.statNumber}>{pendingTasks}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, styles.statCard3]}>
            <Text style={styles.statNumber}>{todayMeetings}</Text>
            <Text style={styles.statLabel}>Meetings Today</Text>
          </View>
          <View style={[styles.statCard, styles.statCard4]}>
            <Text style={styles.statNumber}>{activeSprints}</Text>
            <Text style={styles.statLabel}>Active Sprints</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  buildingName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  notificationButton: {
    padding: 8,
  },
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#ffffff',
  },
  // Content Styles
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  // Card Styles
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  // Current Performance Card
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  mainMetric: {
    marginBottom: 8,
  },
  mainNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    marginRight: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  timeRange: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  miniChart: {
    width: 80,
    height: 30,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartLine: {
    width: 60,
    height: 2,
    backgroundColor: '#2563eb',
    borderRadius: 1,
  },
  // Calendar Styles
  calendarContainer: {
    paddingVertical: 10,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  dayText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    width: 32,
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayButton: {
    backgroundColor: '#2563eb',
  },
  dateText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  todayText: {
    color: '#ffffff',
  },
  // Gauge Styles
  gaugeContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  gauge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 8,
    borderColor: '#e5e7eb',
  },
  gaugeInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  labelItem: {
    alignItems: 'center',
  },
  labelValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  labelText: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Status Distribution
  statusContainer: {
    paddingVertical: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statusBar: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    flexDirection: 'row',
    marginBottom: 12,
  },
  statusSegment: {
    height: '100%',
    borderRadius: 4,
  },
  statusLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statCard1: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  statCard2: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  statCard3: {
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  statCard4: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
});

export default DashboardScreen; 