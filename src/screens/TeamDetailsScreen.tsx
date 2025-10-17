import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import ProfileHeader from '../components/ProfileHeader';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  avatar?: string;
}

const TeamDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { teamId } = route.params as { teamId: string };

  // Mock data - in a real app, this would come from your state management
  const team = {
    id: teamId,
    name: 'Product Team',
    description: 'Responsible for product strategy, roadmap, and feature development.',
    members: [
      {
        id: '1',
        name: 'Sarah Johnson',
        email: 'sarah@company.com',
        role: 'admin' as const,
      },
      {
        id: '2',
        name: 'Alex Chen',
        email: 'alex@company.com',
        role: 'member' as const,
      },
      {
        id: '3',
        name: 'Maria Rodriguez',
        email: 'maria@company.com',
        role: 'member' as const,
      },
      {
        id: '4',
        name: 'David Kim',
        email: 'david@company.com',
        role: 'member' as const,
      },
      {
        id: '5',
        name: 'Emily Davis',
        email: 'emily@company.com',
        role: 'viewer' as const,
      },
    ],
    projects: ['Project Alpha', 'Project Beta'],
    createdAt: '2024-01-01',
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#ef4444';
      case 'member':
        return '#137fec';
      case 'viewer':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const renderMemberItem = ({ item }: { item: TeamMember }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberAvatar}>
        <Text style={styles.avatarText}>
          {item.name.split(' ').map(n => n[0]).join('')}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberEmail}>{item.email}</Text>
      </View>
      <View
        style={[
          styles.roleBadge,
          { backgroundColor: getRoleColor(item.role) },
        ]}
      >
        <Text style={styles.roleText}>
          {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Header */}
      <ProfileHeader
        title="Team Details"
        subtitle="Team information"
        rightElement={
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="pencil-outline" size={24} color="#137fec" />
          </TouchableOpacity>
        }
        onProfilePress={() => {
          // Handle profile navigation
        }}
        onRightElementPress={() => {
          // Handle edit navigation
        }}
        onNotificationsPress={() => (navigation as any).navigate('Notifications')}
      />

      {/* Team Info */}
      <View style={styles.teamInfo}>
        <View style={styles.teamIcon}>
          <Ionicons name="people" size={32} color="#137fec" />
        </View>
        <View style={styles.teamDetails}>
          <Text style={styles.teamName}>{team.name}</Text>
          <Text style={styles.teamDescription}>{team.description}</Text>
          <View style={styles.teamStats}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{team.members.length}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{team.projects.length}</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Projects Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Projects</Text>
        <View style={styles.projectsList}>
          {team.projects.map((project, index) => (
            <View key={index} style={styles.projectItem}>
              <View style={styles.projectIcon}>
                <Ionicons name="folder-outline" size={20} color="#137fec" />
              </View>
              <Text style={styles.projectName}>{project}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </View>
          ))}
        </View>
      </View>

      {/* Team Members Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Team Members</Text>
          <TouchableOpacity style={styles.addMemberButton}>
            <Ionicons name="person-add-outline" size={20} color="#137fec" />
            <Text style={styles.addMemberText}>Add Member</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={team.members}
          renderItem={renderMemberItem}
          keyExtractor={(item) => item.id}
          style={styles.membersList}
          showsVerticalScrollIndicator={false}
        />
      </View>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    padding: 8,
  },
  teamInfo: {
    backgroundColor: 'white',
    margin: 16,
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
  teamIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#137fec',
    opacity: 0.1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  teamDetails: {
    // Container for team details
  },
  teamName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  teamDescription: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  teamStats: {
    flexDirection: 'row',
    gap: 24,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#137fec',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#137fec',
  },
  addMemberText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#137fec',
    marginLeft: 4,
  },
  projectsList: {
    gap: 12,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
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
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#137fec',
    opacity: 0.1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  projectName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  membersList: {
    maxHeight: 300,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#137fec',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
});

export default TeamDetailsScreen;