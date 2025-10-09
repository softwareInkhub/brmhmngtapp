import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/api';
import ProfileHeader from '../components/ProfileHeader';
import Sidebar from '../components/Sidebar';

const TeamsScreen = () => {
  const navigation = useNavigation();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const { state } = useAppContext();
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [teamForm, setTeamForm] = useState<{ 
    name: string; 
    description: string;
    project: string;
    budget: string;
    startDate: string;
    tags: string[];
    members: any[];
  }>({ 
    name: '', 
    description: '',
    project: '',
    budget: '',
    startDate: new Date().toISOString().slice(0,10),
    tags: [],
    members: [],
  });
  const [showTeamDetailsModal, setShowTeamDetailsModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const setTeamName = (t: string) => setTeamForm(p => ({ ...p, name: t }));
  const setTeamDesc = (t: string) => setTeamForm(p => ({ ...p, description: t }));
  const setTeamProject = (t: string) => setTeamForm(p => ({ ...p, project: t }));
  const setTeamBudget = (t: string) => setTeamForm(p => ({ ...p, budget: t }));
  const setStartDate = (t: string) => setTeamForm(p => ({ ...p, startDate: t }));
  const [tagInput, setTagInput] = useState('');
  const addTag = () => {
    const v = tagInput.trim();
    if (!v) return;
    setTeamForm(p => ({ ...p, tags: Array.from(new Set([...(p.tags || []), v])) }));
    setTagInput('');
  };
  const removeTag = (idx: number) => setTeamForm(p => ({ ...p, tags: (p.tags || []).filter((_, i) => i !== idx) }));
  const [memberDraft, setMemberDraft] = useState<{ name: string; role: string; email: string }>({ name: '', role: '', email: '' });
  const addMember = () => {
    if (!memberDraft.name.trim()) { Alert.alert('Validation', 'Member name is required'); return; }
    const m = { id: Date.now(), name: memberDraft.name.trim(), role: memberDraft.role || 'Member', email: memberDraft.email || '' };
    setTeamForm(p => ({ ...p, members: [ ...(p.members || []), m ] }));
    setMemberDraft({ name: '', role: '', email: '' });
  };
  const removeMember = (id: any) => setTeamForm(p => ({ ...p, members: (p.members || []).filter((m: any) => m.id !== id) }));
  // Users for selection from brmh-users
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usersSearch, setUsersSearch] = useState('');
  const filteredUsers = allUsers.filter(u => {
    const q = usersSearch.trim().toLowerCase();
    if (!q) return true;
    const s = `${u.name||''} ${u.username||''} ${u.email||''}`.toLowerCase();
    return s.includes(q);
  });
  const [showUsersDropdown, setShowUsersDropdown] = useState(false);
  const userSearchRef = useRef<TextInput>(null);
  React.useEffect(() => { if (showCreateTeamModal) { (async ()=>{ try { const res = await apiService.getUsers(); if (res.success && res.data) setAllUsers(res.data); } catch {} })(); } }, [showCreateTeamModal]);
  const handleCreateTeamInline = async () => {
    if (!teamForm.name.trim()) { Alert.alert('Validation', 'Please enter team name'); return; }
    try {
      const payload = {
        name: teamForm.name,
        description: teamForm.description,
        members: teamForm.members,
        project: teamForm.project,
        budget: teamForm.budget,
        startDate: teamForm.startDate,
        tags: teamForm.tags,
      } as any;
      const res = await apiService.createTeam(payload);
      if (res.success && res.data) {
        // Normalize returned item
        const created = { 
          ...res.data,
          members: Array.isArray(res.data.members) ? res.data.members : (res.data.members ? JSON.parse(res.data.members) : []),
          memberCount: Array.isArray(res.data.members) ? res.data.members.length : (res.data.members ? JSON.parse(res.data.members).length : 0),
        } as any;
        // Update local list used by screen
        setTeams(prev => [created, ...prev]);
        setShowCreateTeamModal(false);
        setTeamForm({ name: '', description: '', project: '', budget: '', startDate: new Date().toISOString().slice(0,10), tags: [], members: [] });
        Alert.alert('Success', 'Team created successfully');
      } else {
        Alert.alert('Error', res.error || 'Failed to create team');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to create team');
    }
  };

  const [teams, setTeams] = useState<any[]>([]);
  const fetchTeams = async () => {
    try {
      const res = await apiService.getTeams();
      if (res.success && res.data) {
        const list = res.data.map((t:any) => ({ ...t, members: Array.isArray(t.members) ? t.members : (t.members ? JSON.parse(t.members) : []), memberCount: (Array.isArray(t.members) ? t.members : (t.members ? JSON.parse(t.members) : []) ).length }));
        setTeams(list);
      }
    } catch {}
  };
  React.useEffect(() => { fetchTeams(); }, []);
  // Also refresh when screen regains focus (ensures latest after navigations)
  // Note: importing useFocusEffect would require updating imports; skipping to keep minimal

  const handleTeamMenu = (team: any) => {
    Alert.alert(
      'Team Options',
      `What would you like to do with "${team.name || 'Untitled Team'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => { setSelectedTeam(team); setShowTeamDetailsModal(true); } },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          const res = await apiService.deleteTeam(team.id || team.teamId);
          if (res.success) setTeams(prev => prev.filter(t => (t.id||t.teamId)!==(team.id||team.teamId)));
          else Alert.alert('Error', (res as any).error || 'Failed to delete team');
        }}
      ]
    );
  };

  const renderTeamItem = ({ item }: { item: any }) => (
    <View style={styles.teamCard}>
      <TouchableOpacity style={{ flexDirection:'row', alignItems:'center', flex:1 }} onPress={() => { setSelectedTeam(item); setShowTeamDetailsModal(true); }}>
      <View style={styles.teamIcon}>
        <Ionicons name="people" size={32} color="#137fec" />
      </View>
      <View style={styles.teamContent}>
        <Text style={styles.teamName}>{item.name}</Text>
        <Text style={styles.memberCount}>{item.memberCount} members</Text>
      </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleTeamMenu(item)} style={{ padding: 6 }}>
        <Ionicons name="ellipsis-horizontal" size={18} color="#6b7280" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      {/* Profile Header */}
      <ProfileHeader
        title="My Teams"
        subtitle="Team management"
        rightElement={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateTeamModal(true)}
          >
            <Ionicons name="add" size={24} color="#137fec" />
          </TouchableOpacity>
        }
        onProfilePress={() => {
          // Handle profile navigation
        }}
        onRightElementPress={() => setShowCreateTeamModal(true)}
        onMenuPress={() => setSidebarVisible(true)}
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

      {/* Create Team Modal */}
      <Modal
        visible={showCreateTeamModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateTeamModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={() => setShowCreateTeamModal(false)} />
          <View style={styles.sheetModal}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Create Team</Text>
              <TouchableOpacity onPress={() => setShowCreateTeamModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
              {/* Inline full form */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Team Name *</Text>
                <TextInput style={styles.input} placeholder="Enter team name" value={teamForm.name} onChangeText={setTeamName} />
              </View>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Description</Text>
                <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Enter team description" value={teamForm.description} onChangeText={setTeamDesc} multiline numberOfLines={4} />
              </View>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Project</Text>
                <TextInput style={styles.input} placeholder="Project name" value={teamForm.project} onChangeText={setTeamProject} />
              </View>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Budget</Text>
                <TextInput style={styles.input} placeholder="$75K" value={teamForm.budget} onChangeText={setTeamBudget} />
              </View>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Start Date (YYYY-MM-DD)</Text>
                <TextInput style={styles.input} placeholder="2025-01-15" value={teamForm.startDate} onChangeText={setStartDate} />
              </View>
              {/* Tags */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Tags</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Add a tag" value={tagInput} onChangeText={setTagInput} />
                  <TouchableOpacity onPress={addTag} style={[styles.createBtn, { width: 90, height: 46 }]}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {teamForm.tags.map((t, i) => (
                    <TouchableOpacity key={`${t}-${i}`} onPress={() => removeTag(i)} style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 }}>
                      <Text style={{ color: '#374151', fontSize: 12 }}>#{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {/* Select Users */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Select Users</Text>
                 <TextInput
                  style={[styles.input, { marginBottom: 8 }]} placeholder="Search users by name or email"
                   value={usersSearch} onChangeText={setUsersSearch}
                   ref={userSearchRef}
                  onFocus={() => setShowUsersDropdown(true)}
                  onEndEditing={() => setShowUsersDropdown(false)}
                />
                {showUsersDropdown && (
                  <View style={{ maxHeight: 220, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                      contentContainerStyle={{ paddingVertical: 4 }}
                    >
                      {filteredUsers.map((u) => {
                        const already = (teamForm.members||[]).some((m:any)=> (m.id||m.userId) === (u.id||u.userId));
                        return (
                          <TouchableOpacity key={u.id || u.userId}
                            onPress={() => {
                              if (!already) {
                                const m = { id: u.id || u.userId, name: u.name || u.username || u.email, email: u.email };
                                setTeamForm(p => ({ ...p, members: [ ...(p.members||[]), m ] }));
                              }
                              setShowUsersDropdown(false);
                              userSearchRef.current?.blur();
                            }}
                            style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:12, paddingVertical:10 }}
                          >
                            <Text style={{ color:'#374151' }}>{u.name || u.username || u.email}</Text>
                            {already ? <Ionicons name="checkmark" size={18} color="#10b981" /> : <Ionicons name="add" size={18} color="#6b7280" />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
                {/* Selected members as pills */}
                <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:8 }}>
                  {(teamForm.members||[]).map((m:any) => (
                    <View key={m.id} style={{ flexDirection:'row', alignItems:'center', backgroundColor:'#e0f2fe', borderWidth:1, borderColor:'#b3e5fc', paddingHorizontal:10, paddingVertical:6, borderRadius:16 }}>
                      <Text style={{ color:'#0277bd', fontSize:12, fontWeight:'600' }}>{m.name}</Text>
                      <TouchableOpacity onPress={() => removeMember(m.id)} style={{ marginLeft:6 }}>
                        <Ionicons name="close" size={14} color="#0277bd" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreateTeamInline}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Create Team</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Team Details Modal */}
      <Modal
        visible={showTeamDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTeamDetailsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={() => setShowTeamDetailsModal(false)} />
          <View style={styles.sheetModal}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Team Details</Text>
              <TouchableOpacity onPress={() => setShowTeamDetailsModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedTeam && (
              <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1f2937', marginTop: 12, marginBottom: 8 }}>
                  {selectedTeam.name || 'Untitled Team'}
                </Text>
                {selectedTeam.description ? (
                  <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 20, marginBottom: 16 }}>
                    {selectedTeam.description}
                  </Text>
                ) : null}

                {/* Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                  <View style={{ width: '45%' }}>
                    <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600', marginBottom: 4 }}>Created At</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1f2937' }}>{selectedTeam.createdAt ? String(selectedTeam.createdAt).slice(0,10) : '-'}</Text>
                  </View>
                  <View style={{ width: '45%' }}>
                    <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600', marginBottom: 4 }}>Updated At</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1f2937' }}>{selectedTeam.updatedAt ? String(selectedTeam.updatedAt).slice(0,10) : '-'}</Text>
                  </View>
                </View>

                {/* Members (organized list) */}
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 8 }}>Members</Text>
                <View style={{ gap: 8, marginBottom: 16 }}>
                  {(() => {
                    const members = Array.isArray(selectedTeam.members) ? selectedTeam.members : (selectedTeam.members ? JSON.parse(selectedTeam.members) : []);
                    if (!members || members.length === 0) return <Text style={{ color: '#9ca3af' }}>No members yet</Text>;
                    return members.map((m: any, idx: number) => (
                      <View key={m?.id || idx} style={{ backgroundColor:'#f8fafc', borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, padding:10 }}>
                        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                          <Text style={{ color:'#1f2937', fontWeight:'600' }}>{m?.name || 'Member'}</Text>
                          <Text style={{ color:'#6b7280', fontSize:12 }}>{m?.role || 'Member'}</Text>
                        </View>
                        {m?.email ? <Text style={{ color:'#6b7280', fontSize:12, marginTop:2 }}>{m.email}</Text> : null}
                      </View>
                    ));
                  })()}
                </View>

                {/* Projects */}
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 8 }}>Projects</Text>
                <View style={{ gap: 6, marginBottom: 24 }}>
                  {(selectedTeam.projects || []).length === 0 ? (
                    <Text style={{ color: '#9ca3af' }}>No projects linked</Text>
                  ) : (
                    (selectedTeam.projects || []).map((p: any, idx: number) => (
                      <View key={p?.id || p || idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="briefcase-outline" size={14} color="#6b7280" />
                        <Text style={{ color: '#374151' }}>{p?.name || p}</Text>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            )}
            {/* Inline edit/save controls could be added here similar to projects if desired */}
          </View>
        </View>
      </Modal>
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  backdropTouchable: { flex: 1 },
  sheetModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', minHeight: '65%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#111827' },
  createBtn: { backgroundColor: '#137fec', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 12, marginBottom: 24 },
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