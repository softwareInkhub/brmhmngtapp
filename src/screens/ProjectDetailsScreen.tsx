import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';

const ProjectDetailsScreen = ({ route, navigation }: any) => {
  const { projectId } = route.params || {};
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const res = await apiService.getProjectById(projectId);
      if (res.success && res.data) setProject(res.data);
      setLoading(false);
    };
    fetch();
  }, [projectId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}> 
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#137fec" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Project Details</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator size="large" color="#137fec" /></View>
      ) : !project ? (
        <View style={styles.loadingBox}><Text style={{ color: '#6b7280' }}>Project not found</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{project.name || project.title || 'Untitled Project'}</Text>
          <Text style={styles.meta}>{project.status || '—'} • {project.startDate || '—'} → {project.endDate || '—'}</Text>

          {/* Render full schema */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>All Fields</Text>
            <View style={styles.kvGroup}>
              {renderRow('id', project.id)}
              {renderRow('name', project.name || project.title)}
              {renderRow('description', project.description)}
              {renderRow('company', project.company)}
              {renderRow('status', project.status)}
              {renderRow('priority', project.priority)}
              {renderRow('startDate', project.startDate)}
              {renderRow('endDate', project.endDate)}
              {renderRow('budget', project.budget)}
              {renderRow('team', project.team)}
              {renderRow('assignee', project.assignee)}
              {renderRow('progress', typeof project.progress === 'number' ? `${project.progress}%` : project.progress)}
              {renderRow('tasks', formatJsonLike(project.tasks))}
              {renderRow('tags', formatJsonLike(project.tags))}
              {renderRow('notes', project.notes)}
              {renderRow('createdAt', project.createdAt)}
              {renderRow('updatedAt', project.updatedAt)}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, gap: 12, paddingBottom: 120 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  meta: { color: '#6b7280', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  cardRow: { flexDirection: 'row', gap: 12 },
  cardTitle: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  cardText: { fontSize: 14, color: '#111827' },
  kvGroup: { gap: 8 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  kvKey: { fontSize: 12, color: '#6b7280', width: 110 },
  kvValue: { flex: 1, fontSize: 13, color: '#111827' },
});

export default ProjectDetailsScreen;

// helpers
const renderRow = (key: string, value: any) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvKey}>{key}</Text>
      <Text style={styles.kvValue} numberOfLines={0}>{String(value)}</Text>
    </View>
  );
};

const formatJsonLike = (val: any) => {
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return String(val); }
};


