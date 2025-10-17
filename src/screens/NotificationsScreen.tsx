import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabKey = 'config' | 'triggers' | 'test' | 'logs';

const NotificationsScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<TabKey>('triggers');
  const [apiBase] = useState('https://brmh.in');
  const [saving, setSaving] = useState(false);

  // Config
  const [connName, setConnName] = useState('default');
  const [connToken, setConnToken] = useState('');
  const [connBaseUrl, setConnBaseUrl] = useState('https://gate.whapi.cloud');
  const [connTestMode, setConnTestMode] = useState(true);
  const [connections, setConnections] = useState<any[]>([]);

  // Triggers
  const [triggers, setTriggers] = useState<any[]>([]);
  const [trigName, setTrigName] = useState('Task Created Alert');
  const [trigEvent, setTrigEvent] = useState('crud_create');
  const [trigTo, setTrigTo] = useState('');
  const [countryCode, setCountryCode] = useState('91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [trigTemplate, setTrigTemplate] = useState('New task created: {{event.data.result.title}}');
  const [trigConnectionId, setTrigConnectionId] = useState('');
  const [filterTableName, setFilterTableName] = useState('tasks');

  // Trigger types
  const [triggerType, setTriggerType] = useState<'users' | 'community' | 'group'>('users');
  const [contactMode, setContactMode] = useState<'manual' | 'contact'>('manual');
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Communities & Groups
  const [communities, setCommunities] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [subgroups, setSubgroups] = useState<any[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingSubgroups, setLoadingSubgroups] = useState(false);

  // Logs
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Modals
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showCommunityPicker, setShowCommunityPicker] = useState(false);
  const [showSubgroupPicker, setShowSubgroupPicker] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  useEffect(() => {
    fetchConnections();
    fetchTriggers();
    fetchLogs();
  }, []);

  useEffect(() => {
    if (contactMode === 'manual') {
      setTrigTo(countryCode + phoneNumber);
    }
  }, [countryCode, phoneNumber, contactMode]);

  useEffect(() => {
    if (contactMode === 'contact' && selectedContact) {
      setTrigTo(selectedContact);
    }
  }, [selectedContact, contactMode]);

  useEffect(() => {
    if (trigConnectionId) {
      if (triggerType === 'community') {
        fetchCommunities(trigConnectionId);
      } else if (triggerType === 'group') {
        fetchGroups(trigConnectionId);
      }
    }
  }, [trigConnectionId, triggerType]);

  useEffect(() => {
    if (trigConnectionId && selectedCommunity) {
      fetchSubgroups(trigConnectionId, selectedCommunity);
    }
  }, [trigConnectionId, selectedCommunity]);

  async function fetchConnections() {
    try {
      const res = await fetch(`${apiBase}/notify/connections`, { cache: 'no-store' as any });
      const data = await res.json();
      if (data?.items) {
        setConnections(data.items);
        if (data.items[0]?.id) setTrigConnectionId(data.items[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch connections:', e);
    }
  }

  async function fetchTriggers() {
    try {
      const res = await fetch(`${apiBase}/notify/triggers`, { cache: 'no-store' as any });
      const data = await res.json();
      if (data?.items) setTriggers(data.items);
    } catch (e) {
      console.error('Failed to fetch triggers:', e);
    }
  }

  async function fetchLogs() {
    setLoadingLogs(true);
    try {
      const res = await fetch(`${apiBase}/notify/logs`, { cache: 'no-store' as any });
      const data = await res.json();
      if (data?.items) setLogs(data.items);
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    }
    setLoadingLogs(false);
  }

  async function fetchContacts(connectionId: string) {
    if (!connectionId) return;
    setLoadingContacts(true);
    try {
      const res = await fetch(`${apiBase}/notify/contacts/${connectionId}`, { cache: 'no-store' as any });
      const data = await res.json();
      
      let contactsList = [];
      if (data?.success && data?.testResult?.data) {
        const responseData = data.testResult.data;
        if (responseData.contacts && Array.isArray(responseData.contacts)) {
          contactsList = responseData.contacts;
        }
      }
      
      const validContacts = contactsList.filter((contact: any) => 
        contact && contact.id && contact.id !== '0' && 
        (contact.pushname || contact.name || contact.display_name)
      );
      
      setContacts(validContacts);
    } catch (e) {
      console.error('Failed to fetch contacts:', e);
    }
    setLoadingContacts(false);
  }

  async function fetchCommunities(connectionId: string) {
    if (!connectionId) return;
    setLoadingCommunities(true);
    try {
      const res = await fetch(`${apiBase}/notify/communities/${connectionId}`, { cache: 'no-store' as any });
      const data = await res.json();
      
      let communities = [];
      if (data?.success && data?.testResult?.data) {
        const responseData = data.testResult.data;
        if (responseData.announceGroupInfo) {
          communities.push(responseData.announceGroupInfo);
        }
        if (responseData.otherGroups && Array.isArray(responseData.otherGroups)) {
          communities.push(...responseData.otherGroups);
        }
      }
      
      setCommunities(Array.isArray(communities) ? communities : []);
    } catch (e) {
      console.error('Failed to fetch communities:', e);
    }
    setLoadingCommunities(false);
  }

  async function fetchGroups(connectionId: string) {
    if (!connectionId) return;
    setLoadingGroups(true);
    try {
      const res = await fetch(`${apiBase}/notify/groups/${connectionId}`, { cache: 'no-store' as any });
      const data = await res.json();
      
      let groups = [];
      if (data?.success && data?.testResult?.data) {
        const responseData = data.testResult.data;
        if (responseData.announceGroupInfo) {
          groups.push(responseData.announceGroupInfo);
        }
        if (responseData.otherGroups && Array.isArray(responseData.otherGroups)) {
          groups.push(...responseData.otherGroups);
        }
      }
      
      setGroups(Array.isArray(groups) ? groups : []);
    } catch (e) {
      console.error('Failed to fetch groups:', e);
    }
    setLoadingGroups(false);
  }

  async function fetchSubgroups(connectionId: string, communityId: string) {
    if (!connectionId || !communityId) return;
    setLoadingSubgroups(true);
    try {
      const res = await fetch(`${apiBase}/notify/communities/${connectionId}/${communityId}/subgroups`, { cache: 'no-store' as any });
      const data = await res.json();
      
      let subgroups = [];
      if (data?.success && data?.testResult?.data) {
        const responseData = data.testResult.data;
        if (responseData.announceGroupInfo) {
          subgroups.push({ ...responseData.announceGroupInfo, type: 'announcement' });
        }
        if (responseData.otherGroups && Array.isArray(responseData.otherGroups)) {
          subgroups.push(...responseData.otherGroups.map((group: any) => ({ ...group, type: 'subgroup' })));
        }
      }
      
      setSubgroups(Array.isArray(subgroups) ? subgroups : []);
    } catch (e) {
      console.error('Failed to fetch subgroups:', e);
    }
    setLoadingSubgroups(false);
  }

  async function saveConnection() {
    if (!connName || !connToken) {
      Alert.alert('Error', 'Please fill in connection name and token');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/notify/connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: connName, token: connToken, baseUrl: connBaseUrl, testMode: connTestMode })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to save connection');
      await fetchConnections();
      setShowConnectionModal(false);
      Alert.alert('Success', 'Connection saved successfully');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save connection');
    }
    setSaving(false);
  }

  async function saveTrigger() {
    if (!trigConnectionId) {
      Alert.alert('Error', 'Please select a connection');
      return;
    }
    
    let action: any = {};
    
    switch (triggerType) {
      case 'users':
        if (!trigTo) {
          Alert.alert('Error', 'Please enter recipient for users trigger');
          return;
        }
        action = { type: 'whapi_message', to: trigTo, textTemplate: trigTemplate };
        break;
      case 'community':
        if (!selectedCommunity || selectedGroups.length === 0) {
          Alert.alert('Error', 'Please select a community and at least one subgroup');
          return;
        }
        action = { type: 'whapi_community', communityId: selectedCommunity, groupIds: selectedGroups, messageTemplate: trigTemplate };
        break;
      case 'group':
        if (selectedGroups.length === 0) {
          Alert.alert('Error', 'Please select at least one group');
          return;
        }
        action = { type: 'whapi_group', groupIds: selectedGroups, messageTemplate: trigTemplate };
        break;
    }
    
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/notify/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trigName,
          eventType: trigEvent,
          connectionId: trigConnectionId,
          action,
          filters: {
            tableName: filterTableName || undefined
          },
          active: true
        })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to save trigger');
      await fetchTriggers();
      setShowTriggerModal(false);
      Alert.alert('Success', 'Trigger saved successfully');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save trigger');
    }
    setSaving(false);
  }

  async function testSpecificTrigger(triggerId: string) {
    try {
      const res = await fetch(`${apiBase}/notify/${triggerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            type: 'manual_test',
            method: 'POST',
            resource: 'manual',
            data: { message: 'Test message from mobile app' }
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Test failed');
      await fetchLogs();
      Alert.alert('Success', 'Test trigger fired successfully');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Test trigger failed');
    }
  }

  const renderTabButton = (id: TabKey, label: string, icon: string) => (
    <TouchableOpacity
      key={id}
      style={[styles.tabButton, activeTab === id && styles.tabButtonActive]}
      onPress={() => setActiveTab(id)}
    >
      <Ionicons name={icon as any} size={20} color={activeTab === id ? '#3b82f6' : '#6b7280'} />
      <Text style={[styles.tabButtonText, activeTab === id && styles.tabButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderConfigTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>WHAPI Connections</Text>
      
      <TouchableOpacity style={styles.addButton} onPress={() => setShowConnectionModal(true)}>
        <Ionicons name="add-circle" size={20} color="#ffffff" />
        <Text style={styles.addButtonText}>Add Connection</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saved Connections ({connections.length})</Text>
        {connections.length === 0 ? (
          <Text style={styles.emptyText}>No connections found. Add one to get started.</Text>
        ) : (
          connections.map((c) => (
            <View key={c.id} style={styles.connectionItem}>
              <View style={styles.connectionInfo}>
                <Text style={styles.connectionName}>{c.name}</Text>
                <Text style={styles.connectionId}>{c.id.substring(0, 16)}...</Text>
              </View>
              <TouchableOpacity
                style={[styles.useButton, trigConnectionId === c.id && styles.useButtonActive]}
                onPress={() => setTrigConnectionId(c.id)}
              >
                <Text style={[styles.useButtonText, trigConnectionId === c.id && styles.useButtonTextActive]}>
                  {trigConnectionId === c.id ? 'Active' : 'Use'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Connection Modal */}
      <Modal visible={showConnectionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add WHAPI Connection</Text>
              <TouchableOpacity onPress={() => setShowConnectionModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Connection Name</Text>
              <TextInput
                style={styles.input}
                value={connName}
                onChangeText={setConnName}
                placeholder="e.g. default"
              />

              <Text style={styles.inputLabel}>WHAPI Token</Text>
              <TextInput
                style={styles.input}
                value={connToken}
                onChangeText={setConnToken}
                placeholder="Enter WHAPI token"
                secureTextEntry
              />

              <Text style={styles.inputLabel}>Base URL</Text>
              <TextInput
                style={styles.input}
                value={connBaseUrl}
                onChangeText={setConnBaseUrl}
                placeholder="https://gate.whapi.cloud"
              />

              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Test Mode</Text>
                <Switch value={connTestMode} onValueChange={setConnTestMode} />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowConnectionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveConnection}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderTriggersTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Notification Triggers</Text>
      
      <TouchableOpacity style={styles.addButton} onPress={() => setShowTriggerModal(true)}>
        <Ionicons name="add-circle" size={20} color="#ffffff" />
        <Text style={styles.addButtonText}>Create Trigger</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Active Triggers ({triggers.length})</Text>
        {triggers.length === 0 ? (
          <Text style={styles.emptyText}>No triggers configured. Create one to start receiving notifications.</Text>
        ) : (
          triggers.map((t) => (
            <View key={t.id} style={styles.triggerItem}>
              <View style={styles.triggerHeader}>
                <Text style={styles.triggerName}>{t.name}</Text>
                <View style={styles.triggerBadge}>
                  <Text style={styles.triggerBadgeText}>{t.action?.type || 'whapi'}</Text>
                </View>
              </View>
              <Text style={styles.triggerEvent}>Event: {t.eventType}</Text>
              <Text style={styles.triggerDetails}>
                {t.action?.type === 'whapi_message' && `To: ${t.action?.to}`}
                {t.action?.type === 'whapi_community' && `Community: ${t.action?.communityId}`}
                {t.action?.type === 'whapi_group' && `Groups: ${t.action?.groupIds?.length || 0}`}
              </Text>
              <TouchableOpacity
                style={styles.testTriggerButton}
                onPress={() => testSpecificTrigger(t.id)}
              >
                <Ionicons name="play-circle" size={16} color="#3b82f6" />
                <Text style={styles.testTriggerButtonText}>Test</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Trigger Modal */}
      <Modal visible={showTriggerModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Trigger</Text>
              <TouchableOpacity onPress={() => setShowTriggerModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

             <ScrollView style={styles.modalBody}>
               <Text style={styles.inputLabel}>Trigger Name</Text>
               <TextInput
                 style={styles.input}
                 value={trigName}
                 onChangeText={setTrigName}
                 placeholder="e.g. Task Created Alert"
               />

               <Text style={styles.inputLabel}>Event Type</Text>
               <View style={styles.pickerContainer}>
                 <TouchableOpacity
                   style={[styles.pickerButton, trigEvent === 'crud_create' && styles.pickerButtonActive]}
                   onPress={() => setTrigEvent('crud_create')}
                 >
                   <Text style={[styles.pickerButtonText, trigEvent === 'crud_create' && styles.pickerButtonTextActive]}>Create</Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                   style={[styles.pickerButton, trigEvent === 'crud_update' && styles.pickerButtonActive]}
                   onPress={() => setTrigEvent('crud_update')}
                 >
                   <Text style={[styles.pickerButtonText, trigEvent === 'crud_update' && styles.pickerButtonTextActive]}>Update</Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                   style={[styles.pickerButton, trigEvent === 'crud_delete' && styles.pickerButtonActive]}
                   onPress={() => setTrigEvent('crud_delete')}
                 >
                   <Text style={[styles.pickerButtonText, trigEvent === 'crud_delete' && styles.pickerButtonTextActive]}>Delete</Text>
                 </TouchableOpacity>
               </View>

               <Text style={styles.inputLabel}>Table Name (Filter)</Text>
               <View style={styles.pickerContainer}>
                 <TouchableOpacity
                   style={[styles.pickerButton, filterTableName === 'tasks' && styles.pickerButtonActive]}
                   onPress={() => setFilterTableName('tasks')}
                 >
                   <Text style={[styles.pickerButtonText, filterTableName === 'tasks' && styles.pickerButtonTextActive]}>Tasks</Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                   style={[styles.pickerButton, filterTableName === 'projects' && styles.pickerButtonActive]}
                   onPress={() => setFilterTableName('projects')}
                 >
                   <Text style={[styles.pickerButtonText, filterTableName === 'projects' && styles.pickerButtonTextActive]}>Projects</Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                   style={[styles.pickerButton, filterTableName === 'teams' && styles.pickerButtonActive]}
                   onPress={() => setFilterTableName('teams')}
                 >
                   <Text style={[styles.pickerButtonText, filterTableName === 'teams' && styles.pickerButtonTextActive]}>Teams</Text>
                 </TouchableOpacity>
               </View>

               <Text style={styles.inputLabel}>WHAPI Connection *</Text>
               {connections.length === 0 ? (
                 <View style={styles.noConnectionContainer}>
                   <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                   <Text style={styles.noConnectionText}>No connections available</Text>
                   <TouchableOpacity 
                     onPress={() => {
                       setShowTriggerModal(false);
                       setTimeout(() => setActiveTab('config'), 100);
                     }}
                     style={styles.addConnectionLink}
                   >
                     <Text style={styles.addConnectionLinkText}>Add one in Config tab →</Text>
                   </TouchableOpacity>
                 </View>
               ) : (
                 <>
                   <View style={styles.pickerContainer}>
                     {connections.map((c) => (
                       <TouchableOpacity
                         key={c.id}
                         style={[styles.pickerButton, trigConnectionId === c.id && styles.pickerButtonActive]}
                         onPress={async () => {
                           setTrigConnectionId(c.id);
                           // Reset selections when changing connection
                           setSelectedContact('');
                           setSelectedCommunity('');
                           setSelectedGroups([]);
                           // Pre-fetch communities and groups for this connection
                           await Promise.all([
                             fetchCommunities(c.id),
                             fetchGroups(c.id)
                           ]);
                         }}
                       >
                         <View style={styles.connectionPickerItem}>
                           <Text style={[styles.pickerButtonText, trigConnectionId === c.id && styles.pickerButtonTextActive]}>
                             {c.name}
                           </Text>
                           {c.testMode && (
                             <View style={[styles.testModeBadge, trigConnectionId === c.id && styles.testModeBadgeActive]}>
                               <Text style={[styles.testModeText, trigConnectionId === c.id && styles.testModeTextActive]}>TEST</Text>
                             </View>
                           )}
                         </View>
                       </TouchableOpacity>
                     ))}
                   </View>
                   {trigConnectionId && (
                     <View style={styles.connectionInfoBox}>
                       <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                       <Text style={styles.connectionInfoText}>
                         Connection selected: {connections.find(c => c.id === trigConnectionId)?.name}
                       </Text>
                     </View>
                   )}
                 </>
               )}

               {trigConnectionId && (
                 <>
                   <Text style={styles.inputLabel}>Notification Type</Text>
                   <View style={styles.pickerContainer}>
                     <TouchableOpacity
                       style={[styles.pickerButton, triggerType === 'users' && styles.pickerButtonActive]}
                       onPress={() => setTriggerType('users')}
                     >
                       <Text style={[styles.pickerButtonText, triggerType === 'users' && styles.pickerButtonTextActive]}>User</Text>
                     </TouchableOpacity>
                     <TouchableOpacity
                       style={[styles.pickerButton, triggerType === 'community' && styles.pickerButtonActive]}
                       onPress={() => setTriggerType('community')}
                     >
                       <View style={styles.notificationTypeButton}>
                         <Text style={[styles.pickerButtonText, triggerType === 'community' && styles.pickerButtonTextActive]}>Community</Text>
                         {communities.length > 0 && (
                           <View style={[styles.countBadge, triggerType === 'community' && styles.countBadgeActive]}>
                             <Text style={[styles.countBadgeText, triggerType === 'community' && styles.countBadgeTextActive]}>{communities.length}</Text>
                           </View>
                         )}
                       </View>
                     </TouchableOpacity>
                     <TouchableOpacity
                       style={[styles.pickerButton, triggerType === 'group' && styles.pickerButtonActive]}
                       onPress={() => setTriggerType('group')}
                     >
                       <View style={styles.notificationTypeButton}>
                         <Text style={[styles.pickerButtonText, triggerType === 'group' && styles.pickerButtonTextActive]}>Group</Text>
                         {groups.length > 0 && (
                           <View style={[styles.countBadge, triggerType === 'group' && styles.countBadgeActive]}>
                             <Text style={[styles.countBadgeText, triggerType === 'group' && styles.countBadgeTextActive]}>{groups.length}</Text>
                           </View>
                         )}
                       </View>
                     </TouchableOpacity>
                   </View>
                 </>
               )}

               {!trigConnectionId && connections.length > 0 && (
                 <View style={styles.warningBox}>
                   <Ionicons name="information-circle-outline" size={20} color="#ea580c" />
                   <Text style={styles.warningText}>Please select a connection above to continue</Text>
                 </View>
               )}

              {trigConnectionId && triggerType === 'users' && (
                <>
                  <View style={styles.switchRow}>
                    <Text style={styles.inputLabel}>Manual Entry</Text>
                    <Switch 
                      value={contactMode === 'manual'} 
                      onValueChange={(val) => setContactMode(val ? 'manual' : 'contact')} 
                    />
                  </View>

                  {contactMode === 'manual' ? (
                    <>
                      <Text style={styles.inputLabel}>Country Code</Text>
                      <TextInput
                        style={styles.input}
                        value={countryCode}
                        onChangeText={setCountryCode}
                        placeholder="+91"
                        keyboardType="phone-pad"
                      />

                      <Text style={styles.inputLabel}>Phone Number</Text>
                      <TextInput
                        style={styles.input}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        placeholder="1234567890"
                        keyboardType="phone-pad"
                      />
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.selectButton}
                        onPress={async () => {
                          setShowContactPicker(true);
                          await fetchContacts(trigConnectionId);
                        }}
                      >
                        <Text style={styles.selectButtonText}>
                          {selectedContact ? `Selected: ${selectedContact.substring(0, 20)}...` : 'Select Contact'}
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}

              {trigConnectionId && triggerType === 'community' && (
                <>
                  <Text style={styles.inputLabel}>Select Community ({communities.length} available)</Text>
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={async () => {
                      setShowCommunityPicker(true);
                      await fetchCommunities(trigConnectionId);
                    }}
                  >
                    <Text style={styles.selectButtonText}>
                      {selectedCommunity ? 
                        (communities.find(c => c.id === selectedCommunity)?.title || 
                         communities.find(c => c.id === selectedCommunity)?.name || 
                         'Community Selected') 
                        : 'Select Community'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                  </TouchableOpacity>

                  {selectedCommunity && (
                    <>
                      <Text style={styles.inputLabel}>Select Subgroups ({selectedGroups.length} selected)</Text>
                      <TouchableOpacity
                        style={styles.selectButton}
                        onPress={async () => {
                          setShowSubgroupPicker(true);
                          await fetchSubgroups(trigConnectionId, selectedCommunity);
                        }}
                      >
                        <Text style={styles.selectButtonText}>
                          {selectedGroups.length > 0 ? `${selectedGroups.length} Subgroups Selected` : 'Select Subgroups'}
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                      </TouchableOpacity>

                      {selectedGroups.length > 0 && (
                        <View style={styles.selectedItemsContainer}>
                          {selectedGroups.map((groupId) => {
                            const group = subgroups.find(sg => sg.id === groupId);
                            return (
                              <View key={groupId} style={styles.selectedItem}>
                                <Text style={styles.selectedItemText}>
                                  {group?.type === 'announcement' ? '📢 ' : '💬 '}
                                  {group?.title || group?.name || groupId.substring(0, 20)}
                                </Text>
                                <TouchableOpacity onPress={() => setSelectedGroups(selectedGroups.filter(id => id !== groupId))}>
                                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </>
                  )}
                </>
              )}

              {trigConnectionId && triggerType === 'group' && (
                <>
                  <Text style={styles.inputLabel}>Select Groups ({groups.length} available, {selectedGroups.length} selected)</Text>
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={async () => {
                      setShowGroupPicker(true);
                      await fetchGroups(trigConnectionId);
                    }}
                  >
                    <Text style={styles.selectButtonText}>
                      {selectedGroups.length > 0 ? `${selectedGroups.length} Groups Selected` : 'Select Groups'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                  </TouchableOpacity>

                  {selectedGroups.length > 0 && (
                    <View style={styles.selectedItemsContainer}>
                      {selectedGroups.map((groupId) => {
                        const group = groups.find(g => g.id === groupId);
                        return (
                          <View key={groupId} style={styles.selectedItem}>
                            <Text style={styles.selectedItemText}>
                              💬 {group?.title || group?.name || groupId.substring(0, 20)}
                            </Text>
                            <TouchableOpacity onPress={() => setSelectedGroups(selectedGroups.filter(id => id !== groupId))}>
                              <Ionicons name="close-circle" size={20} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              )}

               <Text style={styles.inputLabel}>Message Template</Text>
               <TextInput
                 style={[styles.input, styles.textArea]}
                 value={trigTemplate}
                 onChangeText={setTrigTemplate}
                 placeholder="Message template using {{event}} variables"
                 multiline
                 numberOfLines={4}
               />
               <Text style={styles.helperText}>
                 Use variables like: {`{{event.data.result.title}}`}, {`{{event.data.result.status}}`}, {`{{trigger.name}}`}
               </Text>
             </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowTriggerModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveTrigger}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contact Picker Modal */}
      <Modal visible={showContactPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Contact</Text>
              <TouchableOpacity onPress={() => setShowContactPicker(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {loadingContacts ? (
                <ActivityIndicator size="large" color="#3b82f6" />
              ) : contacts.length === 0 ? (
                <Text style={styles.emptyText}>No contacts found</Text>
              ) : (
                contacts.map((contact) => (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.contactItem}
                    onPress={() => {
                      setSelectedContact(contact.id);
                      setShowContactPicker(false);
                    }}
                  >
                    <Text style={styles.contactName}>
                      {contact.pushname || contact.name || contact.display_name}
                    </Text>
                    <Text style={styles.contactId}>{contact.id}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Community Picker Modal */}
      <Modal visible={showCommunityPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Community</Text>
              <View style={styles.modalHeaderActions}>
                {!loadingCommunities && (
                  <TouchableOpacity 
                    onPress={() => fetchCommunities(trigConnectionId)}
                    style={styles.refreshButton}
                  >
                    <Ionicons name="refresh" size={20} color="#3b82f6" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowCommunityPicker(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalBody}>
              {loadingCommunities ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>Loading communities...</Text>
                </View>
              ) : communities.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="people-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyText}>No communities found</Text>
                  <Text style={styles.emptySubtext}>
                    Make sure your WHAPI connection has access to communities.
                  </Text>
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={() => fetchCommunities(trigConnectionId)}
                  >
                    <Ionicons name="refresh" size={16} color="#ffffff" />
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                communities.map((community) => (
                  <TouchableOpacity
                    key={community.id}
                    style={[
                      styles.contactItem,
                      selectedCommunity === community.id && styles.selectedPickerItem
                    ]}
                    onPress={() => {
                      setSelectedCommunity(community.id);
                      setSelectedGroups([]); // Reset selected groups when changing community
                      setShowCommunityPicker(false);
                    }}
                  >
                    <View style={styles.pickerItemContent}>
                      <Text style={styles.contactName}>
                        🏘️ {community.title || community.name || community.id}
                      </Text>
                      {community.id && (
                        <Text style={styles.contactId}>{community.id.substring(0, 30)}...</Text>
                      )}
                    </View>
                    {selectedCommunity === community.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Subgroup Picker Modal */}
      <Modal visible={showSubgroupPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Subgroups</Text>
              <View style={styles.modalHeaderActions}>
                {!loadingSubgroups && (
                  <TouchableOpacity 
                    onPress={() => fetchSubgroups(trigConnectionId, selectedCommunity)}
                    style={styles.refreshButton}
                  >
                    <Ionicons name="refresh" size={20} color="#3b82f6" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowSubgroupPicker(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalBody}>
              {loadingSubgroups ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>Loading subgroups...</Text>
                </View>
              ) : subgroups.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyText}>No subgroups found</Text>
                  <Text style={styles.emptySubtext}>
                    This community may not have any subgroups yet.
                  </Text>
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={() => fetchSubgroups(trigConnectionId, selectedCommunity)}
                  >
                    <Ionicons name="refresh" size={16} color="#ffffff" />
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.helperText}>Tap to select/deselect multiple subgroups</Text>
                  {subgroups.map((subgroup) => (
                    <TouchableOpacity
                      key={subgroup.id}
                      style={[
                        styles.contactItem,
                        selectedGroups.includes(subgroup.id) && styles.selectedPickerItem
                      ]}
                      onPress={() => {
                        if (selectedGroups.includes(subgroup.id)) {
                          setSelectedGroups(selectedGroups.filter(id => id !== subgroup.id));
                        } else {
                          setSelectedGroups([...selectedGroups, subgroup.id]);
                        }
                      }}
                    >
                      <View style={styles.pickerItemContent}>
                        <Text style={styles.contactName}>
                          {subgroup.type === 'announcement' ? '📢 ' : '💬 '}
                          {subgroup.title || subgroup.name || subgroup.id}
                          {subgroup.type === 'announcement' && ' (Announcement)'}
                        </Text>
                        {subgroup.id && (
                          <Text style={styles.contactId}>{subgroup.id.substring(0, 30)}...</Text>
                        )}
                      </View>
                      {selectedGroups.includes(subgroup.id) && (
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setShowSubgroupPicker(false)}
              >
                <Text style={styles.saveButtonText}>Done ({selectedGroups.length} selected)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Group Picker Modal */}
      <Modal visible={showGroupPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Groups</Text>
              <View style={styles.modalHeaderActions}>
                {!loadingGroups && (
                  <TouchableOpacity 
                    onPress={() => fetchGroups(trigConnectionId)}
                    style={styles.refreshButton}
                  >
                    <Ionicons name="refresh" size={20} color="#3b82f6" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowGroupPicker(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalBody}>
              {loadingGroups ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>Loading groups...</Text>
                </View>
              ) : groups.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#9ca3af" />
                  <Text style={styles.emptyText}>No groups found</Text>
                  <Text style={styles.emptySubtext}>
                    Make sure your WHAPI connection has access to groups.
                  </Text>
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={() => fetchGroups(trigConnectionId)}
                  >
                    <Ionicons name="refresh" size={16} color="#ffffff" />
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.helperText}>Tap to select/deselect multiple groups</Text>
                  {groups.map((group) => (
                    <TouchableOpacity
                      key={group.id}
                      style={[
                        styles.contactItem,
                        selectedGroups.includes(group.id) && styles.selectedPickerItem
                      ]}
                      onPress={() => {
                        if (selectedGroups.includes(group.id)) {
                          setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                        } else {
                          setSelectedGroups([...selectedGroups, group.id]);
                        }
                      }}
                    >
                      <View style={styles.pickerItemContent}>
                        <Text style={styles.contactName}>
                          💬 {group.title || group.name || group.id}
                        </Text>
                        {group.id && (
                          <Text style={styles.contactId}>{group.id.substring(0, 30)}...</Text>
                        )}
                      </View>
                      {selectedGroups.includes(group.id) && (
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setShowGroupPicker(false)}
              >
                <Text style={styles.saveButtonText}>Done ({selectedGroups.length} selected)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderTestTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Test Triggers</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Available Triggers</Text>
        {triggers.length === 0 ? (
          <Text style={styles.emptyText}>No triggers to test. Create one first.</Text>
        ) : (
          triggers.map((t) => (
            <View key={t.id} style={styles.testTriggerItem}>
              <View style={styles.testTriggerInfo}>
                <Text style={styles.testTriggerName}>{t.name}</Text>
                <Text style={styles.testTriggerEvent}>Event: {t.eventType}</Text>
                <Text style={styles.testTriggerId}>ID: {t.id.substring(0, 24)}...</Text>
              </View>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => testSpecificTrigger(t.id)}
              >
                <Ionicons name="play" size={16} color="#ffffff" />
                <Text style={styles.primaryButtonText}>Test</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </View>
  );

  const renderLogsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.logsHeader}>
        <Text style={styles.sectionTitle}>Delivery Logs</Text>
        <TouchableOpacity onPress={fetchLogs} disabled={loadingLogs}>
          <Ionicons name="refresh" size={24} color={loadingLogs ? '#9ca3af' : '#3b82f6'} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.card}>
        {loadingLogs ? (
          <ActivityIndicator size="large" color="#3b82f6" />
        ) : logs.length === 0 ? (
          <Text style={styles.emptyText}>No logs yet. Test a trigger to see results here.</Text>
        ) : (
          logs.slice(0, 20).map((log: any) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <Text style={styles.logKind}>{log.kind}</Text>
                <Text style={[styles.logStatus, log.status === 'error' ? styles.logStatusError : styles.logStatusOk]}>
                  {log.status || 'ok'}
                </Text>
              </View>
              <Text style={styles.logDate}>{log.createdAt}</Text>
              {log.eventType && <Text style={styles.logDetails}>Event: {log.eventType}</Text>}
              {log.triggerId && <Text style={styles.logDetails}>Trigger: {log.triggerId.substring(0, 16)}...</Text>}
            </View>
          ))
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {renderTabButton('config', 'Config', 'settings-outline')}
          {renderTabButton('triggers', 'Triggers', 'flash-outline')}
          {renderTabButton('test', 'Test', 'play-outline')}
          {renderTabButton('logs', 'Logs', 'list-outline')}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'config' && renderConfigTab()}
        {activeTab === 'triggers' && renderTriggersTab()}
        {activeTab === 'test' && renderTestTab()}
        {activeTab === 'logs' && renderLogsTab()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  tabs: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabsContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#dbeafe',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabButtonTextActive: {
    color: '#3b82f6',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
  connectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  connectionId: {
    fontSize: 12,
    color: '#9ca3af',
  },
  useButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  useButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  useButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  useButtonTextActive: {
    color: '#3b82f6',
  },
  triggerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  triggerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  triggerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  triggerBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  triggerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
  },
  triggerEvent: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 3,
  },
  triggerDetails: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  testTriggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  testTriggerButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1f2937',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  pickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  pickerButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  pickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  pickerButtonTextActive: {
    color: '#ffffff',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  selectButtonText: {
    fontSize: 15,
    color: '#374151',
  },
  helperText: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  contactItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  contactId: {
    fontSize: 13,
    color: '#9ca3af',
  },
  testTriggerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  testTriggerInfo: {
    flex: 1,
  },
  testTriggerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  testTriggerEvent: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  testTriggerId: {
    fontSize: 12,
    color: '#9ca3af',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logKind: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  logStatus: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  logStatusOk: {
    color: '#10b981',
    backgroundColor: '#d1fae5',
  },
  logStatusError: {
    color: '#ef4444',
    backgroundColor: '#fee2e2',
  },
  logDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  logDetails: {
    fontSize: 13,
    color: '#6b7280',
  },
  selectedItemsContainer: {
    marginTop: 12,
    gap: 8,
  },
  selectedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  selectedItemText: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  selectedPickerItem: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  pickerItemContent: {
    flex: 1,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    padding: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
   retryButtonText: {
     fontSize: 14,
     fontWeight: '600',
     color: '#ffffff',
   },
   noConnectionContainer: {
     flex: 1,
     alignItems: 'center',
     justifyContent: 'center',
     paddingVertical: 20,
     paddingHorizontal: 16,
     backgroundColor: '#fef2f2',
     borderRadius: 8,
     borderWidth: 1,
     borderColor: '#fecaca',
     gap: 8,
   },
   noConnectionText: {
     fontSize: 14,
     color: '#991b1b',
     fontWeight: '500',
   },
   addConnectionLink: {
     marginTop: 4,
   },
   addConnectionLinkText: {
     fontSize: 13,
     color: '#3b82f6',
     fontWeight: '600',
     textDecorationLine: 'underline',
   },
   connectionPickerItem: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 6,
   },
   testModeBadge: {
     backgroundColor: '#fef3c7',
     paddingHorizontal: 6,
     paddingVertical: 2,
     borderRadius: 4,
   },
   testModeBadgeActive: {
     backgroundColor: '#fef3c7',
   },
   testModeText: {
     fontSize: 9,
     fontWeight: '700',
     color: '#92400e',
     letterSpacing: 0.5,
   },
   testModeTextActive: {
     color: '#92400e',
   },
   connectionInfoBox: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 8,
     marginTop: 12,
     padding: 12,
     backgroundColor: '#f0fdf4',
     borderRadius: 8,
     borderWidth: 1,
     borderColor: '#bbf7d0',
   },
   connectionInfoText: {
     fontSize: 13,
     color: '#166534',
     fontWeight: '500',
   },
   notificationTypeButton: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 6,
   },
   countBadge: {
     backgroundColor: '#e5e7eb',
     paddingHorizontal: 6,
     paddingVertical: 2,
     borderRadius: 10,
     minWidth: 20,
     alignItems: 'center',
   },
   countBadgeActive: {
     backgroundColor: '#dbeafe',
   },
   countBadgeText: {
     fontSize: 10,
     fontWeight: '700',
     color: '#6b7280',
   },
   countBadgeTextActive: {
     color: '#1e40af',
   },
   warningBox: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 8,
     marginTop: 12,
     padding: 12,
     backgroundColor: '#fff7ed',
     borderRadius: 8,
     borderWidth: 1,
     borderColor: '#fed7aa',
   },
   warningText: {
     fontSize: 13,
     color: '#c2410c',
     fontWeight: '500',
     flex: 1,
   },
 });
 
 export default NotificationsScreen;

