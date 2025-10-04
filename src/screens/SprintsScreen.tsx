import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import ProfileHeader from '../components/ProfileHeader';

interface Sprint {
  id: string;
  name: string;
  status: 'planning' | 'active' | 'completed';
  startDate: string;
  endDate: string;
  progress: number;
  tasksCompleted: number;
  totalTasks: number;
}

const SprintsScreen = () => {
  const navigation = useNavigation();

  const sprints: Sprint[] = [
    {
      id: '1',
      name: 'Sprint 1 - User Authentication',
      status: 'completed',
      startDate: '2024-01-01',
      endDate: '2024-01-14',
      progress: 100,
      tasksCompleted: 12,
      totalTasks: 12,
    },
    {
      id: '2',
      name: 'Sprint 2 - Dashboard & Analytics',
      status: 'active',
      startDate: '2024-01-15',
      endDate: '2024-01-28',
      progress: 75,
      tasksCompleted: 9,
      totalTasks: 12,
    },
    {
      id: '3',
      name: 'Sprint 3 - Mobile App Development',
      status: 'planning',
      startDate: '2024-01-29',
      endDate: '2024-02-11',
      progress: 0,
      tasksCompleted: 0,
      totalTasks: 15,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'active':
        return '#137fec';
      case 'planning':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'active':
        return 'Active';
      case 'planning':
        return 'Planning';
      default:
        return 'Unknown';
    }
  };

  const renderSprintCard = (sprint: Sprint) => (
    <TouchableOpacity key={sprint.id} style={styles.sprintCard}>
      <View style={styles.sprintHeader}>
        <View style={styles.sprintInfo}>
          <Text style={styles.sprintName}>{sprint.name}</Text>
          <Text style={styles.sprintDates}>
            {sprint.startDate} - {sprint.endDate}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(sprint.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusText(sprint.status)}</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressText}>{sprint.progress}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${sprint.progress}%` },
            ]}
          />
        </View>
        <Text style={styles.taskCount}>
          {sprint.tasksCompleted} of {sprint.totalTasks} tasks completed
        </Text>
      </View>

      <View style={styles.sprintActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="eye-outline" size={20} color="#137fec" />
          <Text style={styles.actionText}>View Details</Text>
        </TouchableOpacity>
        {sprint.status === 'active' && (
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="play-outline" size={20} color="#10b981" />
            <Text style={styles.actionText}>Continue</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Header */}
      <ProfileHeader
        title="My Sprints"
        subtitle="Sprint management"
        rightElement={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateSprint' as never)}
          >
            <Ionicons name="add" size={24} color="#137fec" />
          </TouchableOpacity>
        }
        onProfilePress={() => {
          // Handle profile navigation
        }}
        onRightElementPress={() => navigation.navigate('CreateSprint' as never)}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sprint Overview */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Sprint Overview</Text>
          <View style={styles.overviewStats}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>2</Text>
              <Text style={styles.statLabel}>Active Sprints</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>1</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>24</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>
          </View>
        </View>

        {/* Sprints List */}
        <View style={styles.sprintsSection}>
          <Text style={styles.sectionTitle}>All Sprints</Text>
          <View style={styles.sprintsList}>
            {sprints.map(renderSprintCard)}
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
    paddingBottom: 80, // Add space for bottom tab bar
  },
  header: {
    backgroundColor: '#f6f7f8',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  overviewSection: {
    marginTop: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#137fec',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  sprintsSection: {
    marginBottom: 32,
  },
  sprintsList: {
    gap: 16,
  },
  sprintCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sprintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sprintInfo: {
    flex: 1,
  },
  sprintName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sprintDates: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#137fec',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#137fec',
    borderRadius: 4,
  },
  taskCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  sprintActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#137fec',
    marginLeft: 6,
  },
});

export default SprintsScreen;