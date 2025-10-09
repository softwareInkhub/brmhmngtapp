import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';

const CreateProjectScreen = ({ navigation }: any) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    // Basic validation
    const required = ['name','company','status','priority','startDate','endDate','budget','team','assignee'];
    for (const key of required) {
      if (!String((form as any)[key] || '').trim()) {
        Alert.alert('Validation', `Please enter ${key}`);
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
    };

    const res = await apiService.createProject(payload);
    setIsSubmitting(false);
    if (res.success) {
      Alert.alert('Success','Project created successfully',[{ text: 'OK', onPress: () => navigation.goBack() }]);
    } else {
      Alert.alert('Error', res.error || 'Failed to create project');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}> 
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#137fec" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Project</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Field label="Project Name *" value={form.name} onChange={(t) => setField('name', t)} placeholder="Enter project name" />
        <Field label="Description" value={form.description} onChange={(t) => setField('description', t)} placeholder="Optional description" multiline />
        <Field label="Company *" value={form.company} onChange={(t) => setField('company', t)} placeholder="company-id-123" />
        <Row>
          <Field label="Status *" value={form.status} onChange={(t) => setField('status', t)} placeholder="Planning / Active / Completed / On Hold" style={{ flex: 1 }} />
          <Field label="Priority *" value={form.priority} onChange={(t) => setField('priority', t)} placeholder="Low / Medium / High" style={{ flex: 1 }} />
        </Row>
        <Row>
          <Field label="Start Date *" value={form.startDate} onChange={(t) => setField('startDate', t)} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
          <Field label="End Date *" value={form.endDate} onChange={(t) => setField('endDate', t)} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
        </Row>
        <Row>
          <Field label="Budget *" value={form.budget} onChange={(t) => setField('budget', t)} placeholder="50000" keyboardType="numeric" style={{ flex: 1 }} />
          <Field label="Progress *" value={form.progress} onChange={(t) => setField('progress', t)} placeholder="0-100" keyboardType="numeric" style={{ flex: 1 }} />
        </Row>
        <Row>
          <Field label="Team *" value={form.team} onChange={(t) => setField('team', t)} placeholder="team-id-456" style={{ flex: 1 }} />
          <Field label="Assignee *" value={form.assignee} onChange={(t) => setField('assignee', t)} placeholder="user-id-789" style={{ flex: 1 }} />
        </Row>
        <Field label="Tasks (JSON) *" value={form.tasks} onChange={(t) => setField('tasks', t)} placeholder='["id1","id2"] or []' />
        <Field label="Tags (JSON) *" value={form.tags} onChange={(t) => setField('tags', t)} placeholder='["web","frontend"]' />
        <Field label="Notes" value={form.notes} onChange={(t) => setField('notes', t)} placeholder="Optional notes" />

        <TouchableOpacity style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} disabled={isSubmitting} onPress={submit}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Create Project</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const Field = ({ label, value, onChange, placeholder, multiline, keyboardType, style }: any) => (
  <View style={[styles.field, style]}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      style={[styles.input, multiline && { height: 80 }]}
      multiline={!!multiline}
      keyboardType={keyboardType}
    />
  </View>
);

const Row = ({ children }: any) => (
  <View style={{ flexDirection: 'row', gap: 12 }}>{children}</View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  content: { padding: 16, gap: 12, paddingBottom: 120 },
  field: { flex: 1 },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#111827' },
  submitBtn: { backgroundColor: '#137fec', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: 12 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default CreateProjectScreen;


