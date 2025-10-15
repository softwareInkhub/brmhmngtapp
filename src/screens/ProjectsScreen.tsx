import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfileHeader from '../components/ProfileHeader';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { apiService } from '../services/api';

const { width } = Dimensions.get('window');

const ProjectsScreen = ({ navigation }: any) => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showProjectDetailsModal, setShowProjectDetailsModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProjectForm, setEditProjectForm] = useState<any>({});
  const [form, setForm] = useState({
    name: '',
    description: '',
    company: '',
    status: 'Planning',
    priority: 'Medium',
    startDate: '',
    endDate: '',
    budget: '',
    team: '',
    assignee: '',
    progress: '0',
    tasks: '[]',
    tags: '[]',
    notes: '',
  });

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    const required = ['name','company','status','priority','startDate','endDate','budget','team','assignee'];
    for (const key of required) {
      if (!String((form as any)[key] || '').trim()) {
        alert(`Please enter ${key}`);
        return;
      }
    }

    setIsSubmitting(true);
    const payload = {
      name: form.name,
      description: form.description,
      company: form.company,
      status: form.status.trim(),
      priority: form.priority.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      budget: form.budget.trim(),
      team: form.team,
      assignee: form.assignee,
      progress: Math.max(0, Math.min(100, Number(form.progress) || 0)),
      tasks: form.tasks?.trim() || '[]',
      tags: form.tags?.trim() || '[]',
      notes: form.notes,
    } as any;

    const res = await apiService.createProject(payload);
    setIsSubmitting(false);
    if (res.success) {
      setShowCreateProjectModal(false);
      await fetchProjects();
    } else {
      alert(res.error || 'Failed to create project');
    }
  };

  const fetchProjects = async () => {
    setIsLoading(true);
    const res = await apiService.getProjects();
    if (res.success && res.data) setProjects(res.data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  }, []);

  const handleProjectMenu = (project: any) => {
    Alert.alert(
      'Project Options',
      `What would you like to do with "${project.name || project.title || 'Untitled Project'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => openEditProject(project) },
        { text: 'Delete', style: 'destructive', onPress: () => deleteProject(project) },
      ]
    );
  };

  const openEditProject = (project: any) => {
    setSelectedProjectForDetails(project);
    setShowProjectDetailsModal(true);
    setIsEditingProject(true);
    setEditProjectForm({ ...project });
  };

  const deleteProject = async (project: any) => {
    try {
      setIsLoading(true);
      const res = await apiService.deleteProject(project.id || project.projectId);
      if (res.success) {
        setProjects(prev => prev.filter(p => (p.id || p.projectId) !== (project.id || project.projectId)));
        Alert.alert('Success', 'Project deleted successfully');
      } else {
        Alert.alert('Error', res.error || 'Failed to delete project');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to delete project');
    } finally {
      setIsLoading(false);
    }
  };

  const renderListItem = ({ item }: { item: any }) => (
    <View style={styles.listCard}>
      <TouchableOpacity style={{ flex: 1 }} onPress={() => { setSelectedProjectForDetails(item); setShowProjectDetailsModal(true); }}>
        <View style={styles.listLeft}>
          <View style={[styles.projectIcon, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="briefcase" size={18} color="#137fec" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.projectName} numberOfLines={1}>{item.name || item.title || 'Untitled Project'}</Text>
            <Text style={styles.projectMeta} numberOfLines={1}>{item.status || 'unknown'} • {item.startDate || '—'} → {item.endDate || '—'}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleProjectMenu(item)} style={{ padding: 6 }}>
        <Ionicons name="ellipsis-horizontal" size={18} color="#6b7280" />
      </TouchableOpacity>
    </View>
  );

  const renderGridItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.gridCard} onPress={() => {
      setSelectedProjectForDetails(item);
      setShowProjectDetailsModal(true);
    }}>
      <View style={styles.gridHeader}>
        <View style={[styles.statusBadge, { backgroundColor: '#f3f4f6' }]}>
          <Text style={styles.statusText}>{(item.status || 'Planning').toString()}</Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={14} color="#9ca3af" />
      </View>
      <Text style={styles.gridTitle} numberOfLines={2}>{item.name || item.title || 'Untitled Project'}</Text>
      <View style={styles.gridFooter}>
        <Text style={styles.gridDate}>{item.startDate || '—'} → {item.endDate || '—'}</Text>
      </View>
    </TouchableOpacity>
  );

  // Derived data
  const filteredProjects = projects
    .filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = (p.name || p.title || '').toLowerCase().includes(q) ||
                        (p.description || '').toLowerCase().includes(q) ||
                        (p.status || '').toString().toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (selectedStatus) {
        return (p.status || '').toString() === selectedStatus;
      }
      return true;
    });

  const getCountByStatus = (status: string) => filteredProjects.filter(p => (p.status || '').toString() === status).length;

  const { hasPermission } = useAuth();
  return (
    <SafeAreaView style={styles.container}>
      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <ProfileHeader
        title="My Projects"
        subtitle="Project management"
        rightElement={(() => {
          if (!hasPermission('projectmanagement','crud')) return null;
          return <Ionicons name="add" size={24} color="#137fec" />;
        })()}
        onRightElementPress={() => {
          if (!hasPermission('projectmanagement','crud')) return;
          setShowCreateProjectModal(true);
        }}
        onMenuPress={() => setSidebarVisible(true)}
      />

      {/* Search + Icons row */}
      <View style={styles.searchContainer}>
        {showSearchBar && (
          <View style={styles.searchBarWrapper}>
            <View style={[styles.searchBar, styles.searchBarActive]}>
              <TouchableOpacity onPress={() => setShowSearchBar(false)}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
              <View style={{ width: 8 }} />
              <InputLike
                value={searchQuery}
                onChange={(t) => setSearchQuery(t)}
                placeholder="Search projects..."
              />
            </View>
          </View>
        )}
        <View style={styles.iconsRow}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setShowSearchBar((v) => !v)}>
            <Ionicons name="search-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}>
            <Ionicons name={viewMode === 'list' ? 'apps-outline' : 'list-outline'} size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status pills similar to Tasks (scrollable) */}
      <View style={styles.pillsContainer}>
        <FlatList
          data={[{ key: 'all' }, 'planning', 'active', 'completed', 'on-hold']}
          keyExtractor={(item, index) => (typeof item === 'string' ? item : 'all')}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
          renderItem={({ item }) => (
            typeof item === 'string' ? (
              <Pill
                active={selectedStatus === item}
                number={getCountByStatus(item)}
                label={titleCase(item)}
                color={statusColor(item)}
                onPress={() => setSelectedStatus(selectedStatus === item ? null : item)}
              />
            ) : (
              <Pill
                active={!selectedStatus}
                number={filteredProjects.length}
                label="All"
                color="#137fec"
                onPress={() => setSelectedStatus(null)}
              />
            )
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#137fec" />
        </View>
      ) : projects.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="folder-open" size={40} color="#9ca3af" />
          <Text style={styles.emptyText}>No projects found</Text>
        </View>
      ) : (
        <FlatList
          key={viewMode}
          data={filteredProjects}
          renderItem={viewMode === 'list' ? renderListItem : renderGridItem}
          keyExtractor={(item, index) => item.id || item.projectId || `p-${index}`}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? { justifyContent: 'space-between' } : undefined}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#137fec"]} tintColor="#137fec" />}
        />
      )}

      {/* Project Details Modal */}
      <Modal
        visible={showProjectDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProjectDetailsModal(false)}
      >
        <View style={styles.projectDetailsBackdrop}>
          <TouchableOpacity 
            style={styles.projectDetailsBackdropTouchable}
            activeOpacity={1}
            onPress={() => setShowProjectDetailsModal(false)}
          />
          <View style={styles.projectDetailsModal}>
            <View style={styles.projectDetailsHeader}>
              <Text style={styles.projectDetailsTitle}>Project Details</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={async () => {
                  if (!isEditingProject) { setIsEditingProject(true); setEditProjectForm({ ...selectedProjectForDetails }); return; }
                  // Save edit
                  try {
                    setIsSubmitting(true);
                    const updates: any = { ...editProjectForm };
                    // Ensure we never send key fields in updates
                    delete updates.id;
                    delete updates.projectId;
                    delete updates.createdAt;
                    delete updates.timestamp;
                    delete updates.updatedAt;
                    // normalize fields similar to create
                    updates.status = String(updates.status || 'Planning');
                    updates.priority = String(updates.priority || 'Medium');
                    if (updates.progress !== undefined) updates.progress = Math.max(0, Math.min(100, Number(updates.progress) || 0));
                    const res = await apiService.updateProject(selectedProjectForDetails.id || selectedProjectForDetails.projectId, updates);
                    setIsSubmitting(false);
                    if (res.success) {
                      // Some responses may not return full item; merge with local updates
                      const updated = (res.data && Object.keys(res.data).length > 1) ? res.data : { ...selectedProjectForDetails, ...updates };
                      const updatedId = updated.id || updated.projectId || (selectedProjectForDetails.id || selectedProjectForDetails.projectId);
                      setSelectedProjectForDetails(updated);
                      setProjects(prev => prev.map(p => ((p.id || p.projectId) === updatedId ? { ...p, ...updated } : p)));
                      setIsEditingProject(false);
                      Alert.alert('Success', 'Project updated successfully');
                    } else {
                      Alert.alert('Update Failed', res.error || 'Could not update project');
                    }
                  } catch (e) {
                    setIsSubmitting(false);
                    Alert.alert('Error', 'Failed to update project');
                  }
                }}>
                  <Ionicons name={isEditingProject ? 'checkmark' : 'pencil'} size={20} color="#0ea5e9" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowProjectDetailsModal(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>
            
            {selectedProjectForDetails && (
              <ScrollView style={styles.projectDetailsContent} showsVerticalScrollIndicator={false}>
                <View style={styles.projectDetailsInfo}>
                  {/* Title */}
                  {isEditingProject ? (
                    <TextInput
                      value={editProjectForm.name || ''}
                      onChangeText={(t) => setEditProjectForm((p: any) => ({ ...p, name: t }))}
                      placeholder="Project name"
                      placeholderTextColor="#9ca3af"
                      style={{
                        fontSize: 24, fontWeight: '700', color: '#1f2937',
                        backgroundColor: '#f9fafb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16,
                      }}
                    />
                  ) : (
                    <Text style={styles.projectDetailsMainTitle}>
                      {selectedProjectForDetails.name || selectedProjectForDetails.title || 'Untitled Project'}
                    </Text>
                  )}
                  
                  {/* Status and Priority */}
                  <View style={styles.projectDetailsMeta}>
                    {isEditingProject ? (
                      <View style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
                        <TextInput
                          value={editProjectForm.status || ''}
                          onChangeText={(t) => setEditProjectForm((p: any) => ({ ...p, status: t }))}
                          placeholder="Status (Planning/Active/Completed/On Hold)"
                          placeholderTextColor="#9ca3af"
                          style={[styles.detailInputInline, { flex: 1 }]}
                        />
                        <TextInput
                          value={editProjectForm.priority || ''}
                          onChangeText={(t) => setEditProjectForm((p: any) => ({ ...p, priority: t }))}
                          placeholder="Priority (Low/Medium/High)"
                          placeholderTextColor="#9ca3af"
                          style={[styles.detailInputInline, { flex: 1 }]}
                        />
                      </View>
                    ) : (
                      <>
                        <View style={[styles.projectDetailsStatusBadge, { backgroundColor: getStatusColor(selectedProjectForDetails.status).bg }]}>
                          <Text style={[styles.projectDetailsStatusText, { color: getStatusColor(selectedProjectForDetails.status).text }]}>
                            {selectedProjectForDetails.status || 'Planning'}
                          </Text>
                        </View>
                        <View style={styles.projectDetailsPriorityContainer}>
                          <View
                            style={[
                              styles.projectDetailsPriorityDot,
                              { backgroundColor: getPriorityColor(selectedProjectForDetails.priority || 'Medium') },
                            ]}
                          />
                          <Text style={styles.projectDetailsPriorityText}>{selectedProjectForDetails.priority || 'Medium'} Priority</Text>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Description */}
                  {isEditingProject ? (
                    <TextInput
                      value={editProjectForm.description || ''}
                      onChangeText={(t) => setEditProjectForm((p: any) => ({ ...p, description: t }))}
                      placeholder="Description"
                      placeholderTextColor="#9ca3af"
                      multiline
                      style={{
                        fontSize: 16, color: '#1f2937', lineHeight: 24,
                        backgroundColor: '#f9fafb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 24,
                      }}
                    />
                  ) : (
                    selectedProjectForDetails.description && (
                      <Text style={styles.projectDetailsDescription}>
                        {selectedProjectForDetails.description}
                      </Text>
                    )
                  )}

                  {/* Project Details Grid */}
                  <View style={styles.projectDetailsGrid}>
                    <View style={styles.projectDetailsItem}>
                      <Text style={styles.projectDetailsLabel}>Company</Text>
                      {isEditingProject ? (
                        <TextInput style={styles.detailInputInline} value={editProjectForm.company || ''} onChangeText={(t) => setEditProjectForm((p: any) => ({ ...p, company: t }))} />
                      ) : (
                        <Text style={styles.projectDetailsValue}>{selectedProjectForDetails.company || '-'}</Text>
                      )}
                    </View>
                    <View style={styles.projectDetailsItem}>
                      <Text style={styles.projectDetailsLabel}>Start Date</Text>
                      {isEditingProject ? (
                        <TextInput style={styles.detailInputInline} value={editProjectForm.startDate || ''} onChangeText={(t) => setEditProjectForm((p: any) => ({ ...p, startDate: t }))} placeholder="YYYY-MM-DD" />
                      ) : (
                        <Text style={styles.projectDetailsValue}>{selectedProjectForDetails.startDate ? new Date(selectedProjectForDetails.startDate).toLocaleDateString() : '-'}</Text>
                      )}
                    </View>
                    <View style={styles.projectDetailsItem}>
                      <Text style={styles.projectDetailsLabel}>End Date</Text>
                      {isEditingProject ? (
                        <TextInput style={styles.detailInputInline} value={editProjectForm.endDate || ''} onChangeText={(t) => setEditProjectForm((p: any) => ({ ...p, endDate: t }))} placeholder="YYYY-MM-DD" />
                      ) : (
                        <Text style={styles.projectDetailsValue}>{selectedProjectForDetails.endDate ? new Date(selectedProjectForDetails.endDate).toLocaleDateString() : '-'}</Text>
                      )}
                    </View>
                    <View style={styles.projectDetailsItem}>
                      <Text style={styles.projectDetailsLabel}>Budget</Text>
                      {isEditingProject ? (
                        <TextInput style={styles.detailInputInline} value={editProjectForm.budget || ''} onChangeText={(t) => setEditProjectForm((p: any) => ({ ...p, budget: t }))} />
                      ) : (
                        <Text style={styles.projectDetailsValue}>${selectedProjectForDetails.budget || '-'}</Text>
                      )}
                    </View>
                    <View style={styles.projectDetailsItem}>
                      <Text style={styles.projectDetailsLabel}>Team</Text>
                      {isEditingProject ? (
                        <TextInput style={styles.detailInputInline} value={editProjectForm.team || ''} onChangeText={(t) => setEditProjectForm((p: any) => ({ ...p, team: t }))} />
                      ) : (
                        <Text style={styles.projectDetailsValue}>{selectedProjectForDetails.team || '-'}</Text>
                      )}
                    </View>
                    <View style={styles.projectDetailsItem}>
                      <Text style={styles.projectDetailsLabel}>Assignee</Text>
                      {isEditingProject ? (
                        <TextInput style={styles.detailInputInline} value={editProjectForm.assignee || ''} onChangeText={(t) => setEditProjectForm((p: any) => ({ ...p, assignee: t }))} />
                      ) : (
                        <Text style={styles.projectDetailsValue}>{selectedProjectForDetails.assignee || '-'}</Text>
                      )}
                    </View>
                    <View style={styles.projectDetailsItem}>
                      <Text style={styles.projectDetailsLabel}>Progress</Text>
                      {isEditingProject ? (
                        <TextInput style={styles.detailInputInline} value={String(editProjectForm.progress ?? '')} onChangeText={(t) => setEditProjectForm((p: any) => ({ ...p, progress: t }))} placeholder="0-100" />
                      ) : (
                        <Text style={styles.projectDetailsValue}>{selectedProjectForDetails.progress ?? 0}%</Text>
                      )}
                    </View>
                  </View>

                  {/* Progress Bar */}
                  {(!isEditingProject) && selectedProjectForDetails.progress !== undefined && selectedProjectForDetails.progress !== null && (
                    <View style={styles.projectDetailsProgressSection}>
                      <View style={styles.projectDetailsProgressHeader}>
                        <Text style={styles.projectDetailsProgressLabel}>Progress</Text>
                        <Text style={styles.projectDetailsProgressPercentage}>{selectedProjectForDetails.progress}%</Text>
                      </View>
                      <View style={styles.projectDetailsProgressBar}>
                        <View
                          style={[
                            styles.projectDetailsProgressFill,
                            { width: `${selectedProjectForDetails.progress}%` },
                          ]}
                        />
                      </View>
                    </View>
                  )}

                  {/* Tasks */}
                  <View style={styles.projectDetailsTasksSection}>
                    <Text style={styles.projectDetailsSectionTitle}>Tasks</Text>
                    {isEditingProject ? (
                      <TextInput
                        value={typeof editProjectForm.tasks === 'string' ? editProjectForm.tasks : JSON.stringify(editProjectForm.tasks || [])}
                        onChangeText={(t) => setEditProjectForm((p: any) => ({ ...p, tasks: t }))}
                        placeholder='["taskId1","taskId2"]'
                        placeholderTextColor="#9ca3af"
                        multiline
                        style={[styles.projectDetailsTasksText, { backgroundColor: '#fff' }]}
                      />
                    ) : (
                      selectedProjectForDetails.tasks ? (
                        <Text style={styles.projectDetailsTasksText}>
                          {typeof selectedProjectForDetails.tasks === 'string' ? selectedProjectForDetails.tasks : JSON.stringify(selectedProjectForDetails.tasks)}
                        </Text>
                      ) : null
                    )}
                  </View>

                  {/* Tags */}
                  <View style={styles.projectDetailsTagsSection}>
                    <Text style={styles.projectDetailsSectionTitle}>Tags</Text>
                    {isEditingProject ? (
                      <TextInput
                        value={typeof editProjectForm.tags === 'string' ? editProjectForm.tags : JSON.stringify(editProjectForm.tags || [])}
                        onChangeText={(t) => setEditProjectForm((p: any) => ({ ...p, tags: t }))}
                        placeholder='["web","frontend"]'
                        placeholderTextColor="#9ca3af"
                        multiline
                        style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 14, color: '#4b5563' }}
                      />
                    ) : (
                      selectedProjectForDetails.tags && (
                        <View style={styles.projectDetailsTagsContainer}>
                          {(selectedProjectForDetails.tags || '').split(',').map((tag: string, index: number) => (
                            <View key={index} style={styles.projectDetailsTag}>
                              <Text style={styles.projectDetailsTagText}>{tag.trim()}</Text>
                            </View>
                          ))}
                        </View>
                      )
                    )}
                  </View>

                  {/* Notes */}
                  <View style={styles.projectDetailsNotesSection}>
                    <Text style={styles.projectDetailsSectionTitle}>Notes</Text>
                    {isEditingProject ? (
                      <TextInput
                        value={editProjectForm.notes || ''}
                        onChangeText={(t) => setEditProjectForm((p: any) => ({ ...p, notes: t }))}
                        placeholder='Notes'
                        placeholderTextColor="#9ca3af"
                        multiline
                        style={styles.projectDetailsNotesText}
                      />
                    ) : (
                      selectedProjectForDetails.notes && (
                        <Text style={styles.projectDetailsNotesText}>{selectedProjectForDetails.notes}</Text>
                      )
                    )}
                  </View>

                  {/* Additional Fields */}
                  {Object.keys(selectedProjectForDetails).map(key => {
                    const value = selectedProjectForDetails[key];
                    // Skip fields we've already displayed
                    if (['name', 'title', 'description', 'status', 'priority', 'company', 'startDate', 'endDate', 'budget', 'team', 'assignee', 'progress', 'tasks', 'tags', 'notes', 'id', 'projectId'].includes(key)) {
                      return null;
                    }
                    // Skip empty values
                    if (!value || value === '' || value === null || value === undefined) {
                      return null;
                    }
                    
                    return (
                      <View key={key} style={styles.projectDetailsItem}>
                        <Text style={styles.projectDetailsLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                        <Text style={styles.projectDetailsValue}>
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Create Project Modal (bottom sheet like task create) */}
      <Modal
        visible={showCreateProjectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateProjectModal(false)}
      >
        <View style={styles.projectDetailsBackdrop}>
          <TouchableOpacity 
            style={styles.projectDetailsBackdropTouchable}
            activeOpacity={1}
            onPress={() => setShowCreateProjectModal(false)}
          />
          <View style={styles.projectDetailsModal}>
            <View style={styles.projectDetailsHeader}>
              <Text style={styles.projectDetailsTitle}>Create Project</Text>
              <TouchableOpacity onPress={() => setShowCreateProjectModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.projectDetailsContent} showsVerticalScrollIndicator={false}>
              <View style={{ paddingVertical: 12, gap: 12 }}>
                <ProjectField label="Project Name *" value={form.name} onChange={(t: string) => setField('name', t)} placeholder="Enter project name" />
                <ProjectField label="Description" value={form.description} onChange={(t: string) => setField('description', t)} placeholder="Optional description" multiline />
                <ProjectField label="Company *" value={form.company} onChange={(t: string) => setField('company', t)} placeholder="company-id-123" />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <ProjectField label="Status *" value={form.status} onChange={(t: string) => setField('status', t)} placeholder="Planning / Active / Completed / On Hold" style={{ flex: 1 }} />
                  <ProjectField label="Priority *" value={form.priority} onChange={(t: string) => setField('priority', t)} placeholder="Low / Medium / High" style={{ flex: 1 }} />
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <ProjectField label="Start Date *" value={form.startDate} onChange={(t: string) => setField('startDate', t)} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
                  <ProjectField label="End Date *" value={form.endDate} onChange={(t: string) => setField('endDate', t)} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <ProjectField label="Budget *" value={form.budget} onChange={(t: string) => setField('budget', t)} placeholder="50000" style={{ flex: 1 }} />
                  <ProjectField label="Progress *" value={form.progress} onChange={(t: string) => setField('progress', t)} placeholder="0-100" style={{ flex: 1 }} />
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <ProjectField label="Team *" value={form.team} onChange={(t: string) => setField('team', t)} placeholder="team-id-456" style={{ flex: 1 }} />
                  <ProjectField label="Assignee *" value={form.assignee} onChange={(t: string) => setField('assignee', t)} placeholder="user-id-789" style={{ flex: 1 }} />
                </View>
                <ProjectField label="Tasks (JSON) *" value={form.tasks} onChange={(t: string) => setField('tasks', t)} placeholder='["id1","id2"] or []' />
                <ProjectField label="Tags (JSON) *" value={form.tags} onChange={(t: string) => setField('tags', t)} placeholder='["web","frontend"]' />
                <ProjectField label="Notes" value={form.notes} onChange={(t: string) => setField('notes', t)} placeholder="Optional notes" />

                <TouchableOpacity style={styles.submitBtn} disabled={isSubmitting} onPress={submit}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>Create Project</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const cardWidth = (width - 16 * 2 - 8) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f8' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  headerSubtitle: { fontSize: 12, color: '#6b7280' },
  addButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 16, minHeight: 48 },
  searchBarWrapper: { flex: 1, marginRight: 12, position: 'absolute', left: 16, right: 90 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  searchBarActive: { borderColor: '#137fec' },
  iconsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  iconButton: { padding: 8, borderRadius: 8, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' },
  pillsContainer: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, paddingBottom: 8, marginTop: 8 },
  pillsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { marginTop: 8, color: '#6b7280' },
  listCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  projectIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  projectName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  projectMeta: { fontSize: 12, color: '#6b7280' },
  gridCard: { width: cardWidth, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700', color: '#374151' },
  gridTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 8, marginBottom: 12 },
  gridFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
  gridDate: { fontSize: 12, color: '#6b7280' },
  submitBtn: { backgroundColor: '#137fec', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 12 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  
  // Project Details Modal Styles
  projectDetailsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  projectDetailsBackdropTouchable: {
    flex: 1,
  },
  projectDetailsModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    minHeight: '65%',
  },
  projectDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  projectDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  projectDetailsContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  projectDetailsInfo: {
    paddingVertical: 16,
  },
  projectDetailsMainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    lineHeight: 32,
  },
  projectDetailsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  projectDetailsStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  projectDetailsStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  projectDetailsPriorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  projectDetailsPriorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  projectDetailsPriorityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  projectDetailsDescription: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 24,
  },
  projectDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  projectDetailsItem: {
    width: '45%',
  },
  projectDetailsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  projectDetailsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  detailInputInline: {
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  projectDetailsProgressSection: {
    marginBottom: 24,
  },
  projectDetailsProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectDetailsProgressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  projectDetailsProgressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#137fec',
  },
  projectDetailsProgressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  projectDetailsProgressFill: {
    height: '100%',
    backgroundColor: '#137fec',
    borderRadius: 4,
  },
  projectDetailsTasksSection: {
    marginBottom: 24,
  },
  projectDetailsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  projectDetailsTasksText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  projectDetailsTagsSection: {
    marginBottom: 24,
  },
  projectDetailsTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  projectDetailsTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  projectDetailsTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  projectDetailsNotesSection: {
    marginBottom: 24,
  },
  projectDetailsNotesText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
});

// Helper components & functions to mirror Tasks pills
const InputLike = ({ value, onChange, placeholder }: { value: string; onChange: (t: string) => void; placeholder: string }) => {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      style={{ flex: 1, fontSize: 14, color: '#1f2937', paddingVertical: 0 }}
    />
  );
};

const Pill = ({ active, number, label, color, onPress }: { active: boolean; number: number; label: string; color: string; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={[pillStyles.pill, active && [pillStyles.pillActive, { backgroundColor: '#137fec', borderColor: '#137fec' }]]}>
    <Text style={[pillStyles.number, { color: active ? '#ffffff' : color }]}>{number}</Text>
    <Text style={[pillStyles.label, active && { color: '#ffffff' }]}>{label}</Text>
  </TouchableOpacity>
);

const pillStyles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' },
  pillActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  number: { fontSize: 12, fontWeight: '700', marginRight: 6 },
  label: { fontSize: 12, color: '#374151', fontWeight: '500' },
});

const statusColor = (status: string): string => {
  switch (status) {
    case 'active':
      return '#10b981';
    case 'completed':
      return '#16a34a';
    case 'planning':
      return '#6b7280';
    case 'on-hold':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
};

const titleCase = (s: string) => s.replace(/(^|[-_\s])(\w)/g, (_, a, b) => `${a ? ' ' : ''}${b.toUpperCase()}`);

// Helper functions for project details modal
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return { bg: '#dcfce7', text: '#166534' };
    case 'completed':
      return { bg: '#dcfce7', text: '#166534' };
    case 'planning':
      return { bg: '#e0e7ff', text: '#3730a3' };
    case 'on-hold':
      return { bg: '#fef3c7', text: '#92400e' };
    default:
      return { bg: '#f3f4f6', text: '#374151' };
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

export default ProjectsScreen;

// Reusable field for modal form
const ProjectField = ({ label, value, onChange, placeholder, multiline, style }: any) => (
  <View style={[{ flex: 1 }, style]}>
    <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#111827', height: multiline ? 80 : undefined }}
      multiline={!!multiline}
    />
  </View>
);


