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
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import ProfileHeader from '../components/ProfileHeader';

const TeamsScreen = () => {
  const navigation = useNavigation();
  const { state } = useAppContext();

  const teams = state.teams.map(team => ({
    ...team,
    memberCount: team.members.length,
  }));

  const renderTeamItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.teamCard}
      onPress={() => navigation.navigate('TeamDetails' as never, { teamId: item.id } as never)}
    >
      <View style={styles.teamIcon}>
        <Ionicons name="people" size={32} color="#137fec" />
      </View>
      <View style={styles.teamContent}>
        <Text style={styles.teamName}>{item.name}</Text>
        <Text style={styles.memberCount}>{item.memberCount} members</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Header */}
      <ProfileHeader
        title="My Teams"
        subtitle="Team management"
        rightElement={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateTeam' as never)}
          >
            <Ionicons name="add" size={24} color="#137fec" />
          </TouchableOpacity>
        }
        onProfilePress={() => {
          // Handle profile navigation
        }}
        onRightElementPress={() => navigation.navigate('CreateTeam' as never)}
      />

      {/* Teams List */}
      <FlatList
        data={teams}
        renderItem={renderTeamItem}
        keyExtractor={(item) => item.id}
        style={styles.teamList}
        contentContainerStyle={styles.teamListContent}
        showsVerticalScrollIndicator={false}
      />
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
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamList: {
    flex: 1,
  },
  teamListContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#137fec',
    opacity: 0.1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  teamContent: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default TeamsScreen;