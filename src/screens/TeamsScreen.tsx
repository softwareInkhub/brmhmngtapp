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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/api';
import ProfileHeader from '../components/ProfileHeader';
import { useAuth } from '../context/AuthContext';
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
  
  // Search, filter, view mode
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  const teamStatuses = ['All', 'Active', 'Archived'];
  const statusColors: Record<string, string> = {
    Active: '#10b981',
    Archived: '#6b7280',
  };
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
        let members = [];
        if (Array.isArray(res.data.members)) {
          members = res.data.members;
        } else if (typeof res.data.members === 'string' && res.data.members.trim()) {
          try {
            members = JSON.parse(res.data.members);
          } catch (e) {
            console.warn('Failed to parse members JSON in creation response:', res.data.members);
            members = teamForm.members; // Fallback to form data
          }
        }
        
        const created = { 
          ...res.data,
          members,
          memberCount: members.length
        } as any;
        
        // Update local list used by screen
        setTeams(prev => [created, ...prev]);
        
        // Also refresh from server to ensure we have the latest data
        setTimeout(() => {
          fetchTeams();
        }, 500);
        
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
        const list = res.data.map((t:any) => {
          // Parse members properly
          let members = [];
          if (Array.isArray(t.members)) {
            members = t.members;
          } else if (typeof t.members === 'string' && t.members.trim()) {
            try {
              members = JSON.parse(t.members);
            } catch (e) {
              console.warn('Failed to parse members JSON:', t.members);
              members = [];
            }
          }
          
          return {
            ...t,
            members,
            memberCount: members.length
          };
        });
        setTeams(list);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };
  React.useEffect(() => { fetchTeams(); }, []);
  
  // Refresh teams when screen comes into focus (e.g., after navigation)
  useFocusEffect(
    React.useCallback(() => {
      fetchTeams();
    }, [])
  );

  const { hasPermission } = useAuth();
  const handleTeamMenu = (team: any) => {
    if (!hasPermission('projectmanagement','crud')) {
      // View-only users cannot edit/delete
      setSelectedTeam(team);
      setShowTeamDetailsModal(true);
      return;
    }
    Alert.alert(
      'Team Options',
      `What would you like to do with "${team.name || 'Untitled Team'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => { setSelectedTeam(team); setShowTeamDetailsModal(true); } },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          const res = await apiService.deleteTeam(team.id || team.teamId);
          if (res.success) {
            setTeams(prev => prev.filter(t => (t.id||t.teamId)!==(team.id||team.teamId)));
            // Also refresh from server to ensure consistency
            setTimeout(() => {
              fetchTeams();
            }, 500);
          } else {
            Alert.alert('Error', (res as any).error || 'Failed to delete team');
          }
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
        rightElement={(() => {
          if (!hasPermission('projectmanagement','crud')) return null;
          return (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowCreateTeamModal(true)}
            >
              <Ionicons name="add" size={24} color="#137fec" />
            </TouchableOpacity>
          );
        })()}
        onProfilePress={() => {
          // Handle profile navigation
        }}
        onRightElementPress={() => {
          if (!hasPermission('projectmanagement','crud')) return;
          setShowCreateTeamModal(true);
        }}
        onMenuPress={() => setSidebarVisible(true)}
      />

      {/* Search and Filter Bar */}
      <View style={styles.topBar}>
        {searchVisible && (
          <View style={[styles.searchContainer, { borderColor: '#c084fc', borderWidth: 1 }]}>
            <Ionicons name="search" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search teams..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        )}
        <View style={styles.iconGroup}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setSearchVisible(!searchVisible)}>
            <Ionicons name="search-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowFilterDropdown(!showFilterDropdown)}>
            <Ionicons name="filter-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}>
            <Ionicons name={viewMode === 'list' ? 'apps-outline' : 'list-outline'} size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Dropdown */}
      {showFilterDropdown && (
        <View style={styles.filterDropdown}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filter by Status</Text>
            <TouchableOpacity onPress={() => setShowFilterDropdown(false)}>
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          {teamStatuses.map(status => (
            <TouchableOpacity
              key={status}
              style={styles.filterItem}
              onPress={() => { setSelectedStatus(status); setShowFilterDropdown(false); }}
            >
              <Text style={[styles.filterItemText, selectedStatus === status && { fontWeight: '600', color: '#137fec' }]}>{status}</Text>
              {selectedStatus === status && <Ionicons name="checkmark" size={18} color="#137fec" />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Status Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusPillsContainer} contentContainerStyle={styles.statusPillsContent}>
        {teamStatuses.map(status => {
          const count = status === 'All' ? teams.length : teams.filter(t => (t.archived ? 'Archived' : 'Active') === status).length;
          return (
            <TouchableOpacity
              key={status}
              style={[styles.statusPill, selectedStatus === status && { backgroundColor: '#137fec20', borderColor: '#137fec' }]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text style={[styles.statusPillText, selectedStatus === status && { color: '#137fec', fontWeight: '600' }]}>{status}</Text>
              <View style={[styles.statusBadge, { backgroundColor: selectedStatus === status ? '#137fec' : '#e5e7eb' }]}>
                <Text style={[styles.statusBadgeText, { color: selectedStatus === status ? '#fff' : '#6b7280' }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Teams List */}
      <FlatList
        key={viewMode} // Force re-render when view mode changes
        data={teams.filter(t => {
          const matchesSearch = !searchQuery.trim() || (t.name || '').toLowerCase().includes(searchQuery.toLowerCase());
          const matchesStatus = selectedStatus === 'All' || (t.archived ? 'Archived' : 'Active') === selectedStatus;
          return matchesSearch && matchesStatus;
        })}
        renderItem={viewMode === 'list' ? renderTeamItem : ({ item }) => (
          <TouchableOpacity style={styles.gridCard} onPress={() => { setSelectedTeam(item); setShowTeamDetailsModal(true); }}>
            <View style={styles.gridCardHeader}>
              <Ionicons name="people" size={28} color="#137fec" />
              <TouchableOpacity onPress={() => handleTeamMenu(item)} style={{ padding: 4 }}>
                <Ionicons name="ellipsis-horizontal" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.gridCardTitle} numberOfLines={2}>{item.name}</Text>
            <View style={styles.gridCardFooter}>
              <View style={[styles.gridStatusBadge, { backgroundColor: (item.archived ? '#6b7280' : '#10b981') + '20' }]}>
                <Text style={[styles.gridStatusText, { color: item.archived ? '#6b7280' : '#10b981' }]}>{item.archived ? 'Archived' : 'Active'}</Text>
              </View>
              <Text style={styles.gridCardMembers}>{item.memberCount} members</Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        style={styles.teamList}
        contentContainerStyle={viewMode === 'grid' ? styles.gridContainer : styles.teamListContent}
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
    paddingBottom: 80, // Add space for bottom tab bar (now positioned within safe area)
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    minHeight: 56,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    left: 16,
    right: 140,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 'auto',
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterDropdown: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  filterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  filterItemText: {
    fontSize: 14,
    color: '#374151',
  },
  statusPillsContainer: {
    maxHeight: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statusPillsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  statusBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  gridContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  gridCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 10,
    minHeight: 38,
  },
  gridCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gridStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  gridCardMembers: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default TeamsScreen;