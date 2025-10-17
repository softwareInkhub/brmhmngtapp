import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import ProfileHeader from '../components/ProfileHeader';
import { getClientIds, GOOGLE_SCOPES, getStoredTokens, storeTokens, clearTokens } from '../services/googleAuth';
import { customGoogleAuth, alternativeGoogleAuth } from '../services/customOAuth';
import { simpleGoogleAuth, minimalGoogleAuth } from '../services/simpleOAuth';
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import { 
  fetchEventsForDate, 
  fetchEventsForMonth, 
  CalendarEvent,
  getEventsByDate 
} from '../services/googleCalendar';

const CalendarScreen = () => {
  const navigation = useNavigation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hasGoogle, setHasGoogle] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [eventsByDate, setEventsByDate] = useState<Map<string, CalendarEvent[]>>(new Map());
  const [customOAuthLoading, setCustomOAuthLoading] = useState(false);

  // OAuth request
  const clientIds = getClientIds();
  // Always use Expo's auth proxy for Google OAuth - MUST match Google Console exactly
  const redirectUri = 'https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT';
  
  console.log('🔍 [OAuth Debug] ===== OAuth Configuration =====');
  console.log('🔍 [OAuth Debug] Redirect URI:', redirectUri);
  console.log('🔍 [OAuth Debug] Client IDs:', clientIds);
  console.log('🔍 [OAuth Debug] Selected Client ID:', clientIds.expo || clientIds.android || clientIds.ios);
  console.log('🔍 [OAuth Debug] Scopes:', GOOGLE_SCOPES);
  console.log('🔍 [OAuth Debug] Response Type: Code');
  console.log('🔍 [OAuth Debug] PKCE: Enabled');
  console.log('🔍 [OAuth Debug] ================================');
  
  // Try authorization code flow first
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: clientIds.expo || clientIds.android || clientIds.ios,
      scopes: GOOGLE_SCOPES,
      redirectUri: redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      // Add additional parameters for better compatibility
      additionalParameters: {
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
      },
    },
    { 
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth', 
      tokenEndpoint: 'https://oauth2.googleapis.com/token' 
    }
  );

  // Fallback to implicit flow if code flow fails
  const [implicitRequest, implicitResponse, implicitPromptAsync] = useAuthRequest(
    {
      clientId: clientIds.expo || clientIds.android || clientIds.ios,
      scopes: GOOGLE_SCOPES,
      redirectUri: redirectUri,
      responseType: AuthSession.ResponseType.Token,
      usePKCE: false,
      additionalParameters: {
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
      },
    },
    { 
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth'
    }
  );
  
  // Log request object when it's created
  useEffect(() => {
    if (request) {
      console.log('🔍 [OAuth Debug] ===== Code Flow Auth Request Created =====');
      console.log('🔍 [OAuth Debug] Request URL:', request.url);
      console.log('🔍 [OAuth Debug] Request Params:', request.params);
      console.log('🔍 [OAuth Debug] Code Verifier:', request.codeVerifier);
      console.log('🔍 [OAuth Debug] Code Challenge:', request.codeChallenge);
      console.log('🔍 [OAuth Debug] ================================');
    }
  }, [request]);

  // Log implicit request object when it's created
  useEffect(() => {
    if (implicitRequest) {
      console.log('🔍 [OAuth Debug] ===== Implicit Flow Auth Request Created =====');
      console.log('🔍 [OAuth Debug] Implicit Request URL:', implicitRequest.url);
      console.log('🔍 [OAuth Debug] Implicit Request Params:', implicitRequest.params);
      console.log('🔍 [OAuth Debug] Implicit Response Type:', 'Token (Implicit)');
      console.log('🔍 [OAuth Debug] ================================');
    }
  }, [implicitRequest]);

  // Load events from Google Calendar
  const loadEvents = useCallback(async () => {
    if (!hasGoogle) return;
    
    try {
      setLoading(true);
      const monthEvents = await fetchEventsForMonth(currentDate);
      setEvents(monthEvents);
      
      // Group events by date
      const grouped = getEventsByDate(monthEvents);
      setEventsByDate(grouped);
      
      // Filter events for selected date
      const dateKey = selectedDate.toISOString().split('T')[0];
      setSelectedDateEvents(grouped.get(dateKey) || []);
    } catch (error: any) {
      console.error('Error loading events:', error);
      Alert.alert('Error', 'Failed to load calendar events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [hasGoogle, currentDate, selectedDate]);

  // Refresh events
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  // Custom OAuth methods
  const handleCustomOAuth = useCallback(async () => {
    setCustomOAuthLoading(true);
    try {
      console.log('🔧 [Custom OAuth] Starting custom OAuth flow...');
      const result = await customGoogleAuth();
      
      if (result.success) {
        console.log('✅ [Custom OAuth] Success!');
        setHasGoogle(true);
        Alert.alert('Success', 'Google Calendar connected successfully! (Custom OAuth)');
      } else {
        console.error('❌ [Custom OAuth] Failed:', result.error);
        Alert.alert('Error', `Custom OAuth failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ [Custom OAuth] Exception:', error);
      Alert.alert('Error', `Custom OAuth exception: ${error.message}`);
    } finally {
      setCustomOAuthLoading(false);
    }
  }, []);

  const handleAlternativeOAuth = useCallback(async () => {
    setCustomOAuthLoading(true);
    try {
      console.log('🔧 [Alternative OAuth] Starting alternative OAuth flow...');
      const result = await alternativeGoogleAuth();
      
      if (result.success) {
        console.log('✅ [Alternative OAuth] Success!');
        setHasGoogle(true);
        Alert.alert('Success', 'Google Calendar connected successfully! (Alternative OAuth)');
      } else {
        console.error('❌ [Alternative OAuth] Failed:', result.error);
        Alert.alert('Error', `Alternative OAuth failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ [Alternative OAuth] Exception:', error);
      Alert.alert('Error', `Alternative OAuth exception: ${error.message}`);
    } finally {
      setCustomOAuthLoading(false);
    }
  }, []);

  const handleSimpleOAuth = useCallback(async () => {
    setCustomOAuthLoading(true);
    try {
      console.log('🔧 [Simple OAuth] Starting simple OAuth flow...');
      const result = await simpleGoogleAuth();
      
      if (result.success) {
        console.log('✅ [Simple OAuth] Success!');
        setHasGoogle(true);
        Alert.alert('Success', 'Google Calendar connected successfully! (Simple OAuth)');
      } else {
        console.error('❌ [Simple OAuth] Failed:', result.error);
        Alert.alert('Error', `Simple OAuth failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ [Simple OAuth] Exception:', error);
      Alert.alert('Error', `Simple OAuth exception: ${error.message}`);
    } finally {
      setCustomOAuthLoading(false);
    }
  }, []);

  const handleMinimalOAuth = useCallback(async () => {
    setCustomOAuthLoading(true);
    try {
      console.log('🔧 [Minimal OAuth] Starting minimal OAuth flow...');
      const result = await minimalGoogleAuth();
      
      if (result.success) {
        console.log('✅ [Minimal OAuth] Success!');
        setHasGoogle(true);
        Alert.alert('Success', 'Google Calendar connected successfully! (Minimal OAuth)');
      } else {
        console.error('❌ [Minimal OAuth] Failed:', result.error);
        Alert.alert('Error', `Minimal OAuth failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ [Minimal OAuth] Exception:', error);
      Alert.alert('Error', `Minimal OAuth exception: ${error.message}`);
    } finally {
      setCustomOAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const tokens = await getStoredTokens();
      setHasGoogle(!!tokens?.accessToken);
    })();
  }, []);

  // Handle authorization code flow response
  useEffect(() => {
    (async () => {
      if (!response) return;
      
      console.log('🔍 [OAuth Debug] ===== Code Flow Response Received =====');
      console.log('🔍 [OAuth Debug] Response Type:', response?.type);
      console.log('🔍 [OAuth Debug] Full Response:', JSON.stringify(response, null, 2));
      console.log('🔍 [OAuth Debug] Response Params:', response?.params);
      console.log('🔍 [OAuth Debug] Response Error:', response?.error);
      console.log('🔍 [OAuth Debug] ================================');
      
      if (response?.type === 'success') {
        console.log('✅ [OAuth Debug] Code Flow SUCCESS - Processing response');
        
        if (response.params?.code) {
          console.log('🔑 [OAuth Debug] Authorization Code Flow Detected');
          console.log('🔑 [OAuth Debug] Authorization Code:', response.params.code);
          console.log('🔑 [OAuth Debug] Code Verifier Available:', !!request?.codeVerifier);
          
          try {
            const clientId = clientIds.expo || clientIds.android || clientIds.ios;
            console.log('🔄 [OAuth Debug] Starting token exchange...');
            console.log('🔄 [OAuth Debug] Client ID for exchange:', clientId);
            console.log('🔄 [OAuth Debug] Code Verifier:', request?.codeVerifier);
            
            const { exchangeCodeAsync } = await import('../services/googleAuth');
            const tokenResponse = await exchangeCodeAsync(
              response.params.code,
              clientId,
              request?.codeVerifier
            );
            
            console.log('✅ [OAuth Debug] Token exchange successful!');
            console.log('✅ [OAuth Debug] Token Response:', JSON.stringify(tokenResponse, null, 2));
            
            await storeTokens({
              accessToken: tokenResponse.access_token,
              refreshToken: tokenResponse.refresh_token,
              expiresAt: Date.now() + (tokenResponse.expires_in * 1000)
            });
            
            console.log('💾 [OAuth Debug] Tokens stored successfully');
            setHasGoogle(true);
            Alert.alert('Success', 'Google Calendar connected successfully!');
          } catch (error) {
            console.error('❌ [OAuth Debug] Token exchange failed:', error);
            console.error('❌ [OAuth Debug] Error details:', JSON.stringify(error, null, 2));
            Alert.alert('Error', `Failed to complete authentication: ${error.message || 'Unknown error'}`);
          }
        } else {
          console.warn('⚠️ [OAuth Debug] Success response but no authorization code found');
          console.warn('⚠️ [OAuth Debug] Available params:', Object.keys(response.params || {}));
        }
      } else if (response?.type === 'error') {
        console.error('❌ [OAuth Debug] Code Flow ERROR');
        console.error('❌ [OAuth Debug] Error Type:', response.error?.type);
        console.error('❌ [OAuth Debug] Error Code:', response.error?.code);
        console.error('❌ [OAuth Debug] Error Message:', response.error?.message);
        console.error('❌ [OAuth Debug] Full Error:', JSON.stringify(response.error, null, 2));
        
        Alert.alert(
          'Authentication Error', 
          `Failed to authenticate with Google:\n\nType: ${response.error?.type || 'Unknown'}\nCode: ${response.error?.code || 'Unknown'}\nMessage: ${response.error?.message || 'Unknown error'}\n\nPlease check:\n1. Redirect URI matches Google Console\n2. Client ID is correct\n3. Google Calendar API is enabled`
        );
      } else if (response?.type === 'cancel') {
        console.log('🚫 [OAuth Debug] Code flow cancelled by user');
      } else if (response?.type === 'dismiss') {
        console.log('🚫 [OAuth Debug] Code flow dismissed - this might be due to browser issues');
        console.log('🚫 [OAuth Debug] The OAuth flow was dismissed, possibly due to browser redirect issues');
        Alert.alert(
          'OAuth Dismissed',
          'The authentication was dismissed. This might be due to browser redirect issues. Please try again or check your Google Console configuration.',
          [
            { text: 'Try Again', onPress: () => promptAsync() },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        console.log('ℹ️ [OAuth Debug] Other code flow response type:', response?.type);
      }
    })();
  }, [response, clientIds, request]);

  // Handle implicit flow response (fallback)
  useEffect(() => {
    (async () => {
      if (!implicitResponse) return;
      
      console.log('🔍 [OAuth Debug] ===== Implicit Flow Response Received =====');
      console.log('🔍 [OAuth Debug] Response Type:', implicitResponse?.type);
      console.log('🔍 [OAuth Debug] Full Response:', JSON.stringify(implicitResponse, null, 2));
      console.log('🔍 [OAuth Debug] ================================');
      
      if (implicitResponse?.type === 'success' && implicitResponse.params?.access_token) {
        console.log('🔑 [OAuth Debug] Implicit Flow SUCCESS');
        console.log('🔑 [OAuth Debug] Access Token:', implicitResponse.params.access_token);
        console.log('🔑 [OAuth Debug] Expires In:', implicitResponse.params.expires_in);
        
        const expiresIn = Number(implicitResponse.params.expires_in) || 3600;
        await storeTokens({ 
          accessToken: implicitResponse.params.access_token,
          expiresAt: Date.now() + (expiresIn * 1000)
        });
        
        console.log('💾 [OAuth Debug] Implicit flow tokens stored');
        setHasGoogle(true);
        Alert.alert('Success', 'Google Calendar connected successfully! (Implicit Flow)');
      }
    })();
  }, [implicitResponse]);

  // Load events when Google is connected or date changes
  useEffect(() => {
    if (hasGoogle) {
      loadEvents();
    }
  }, [hasGoogle, currentDate]);

  // Update selected date events when selection changes
  useEffect(() => {
    if (hasGoogle) {
      const dateKey = selectedDate.toISOString().split('T')[0];
      setSelectedDateEvents(eventsByDate.get(dateKey) || []);
    }
  }, [selectedDate, eventsByDate, hasGoogle]);

  const currentMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const currentYear = currentDate.getFullYear();

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  const handleDateSelect = (day: number) => {
    const newSelectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newSelectedDate);
  };

  const hasEventsOnDay = (day: number): boolean => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateKey = date.toISOString().split('T')[0];
    return eventsByDate.has(dateKey) && (eventsByDate.get(dateKey)?.length || 0) > 0;
  };

  const renderCalendarGrid = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }
    
    // Add day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelectedDay = isSelected(day);
      const isTodayDate = isToday(day);
      const hasEvents = hasEventsOnDay(day);
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell, 
            isSelectedDay && styles.selectedDay,
            isTodayDate && !isSelectedDay && styles.todayDay
          ]}
          onPress={() => handleDateSelect(day)}
        >
          <Text style={[
            styles.dayText, 
            isSelectedDay && styles.selectedDayText,
            isTodayDate && !isSelectedDay && styles.todayDayText
          ]}>
            {day}
          </Text>
          {hasEvents && !isSelectedDay && (
            <View style={styles.eventDot} />
          )}
        </TouchableOpacity>
      );
    }
    
    return days;
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'meeting':
        return 'people-outline';
      case 'review':
        return 'checkbox-outline';
      case 'presentation':
        return 'easel-outline';
      default:
        return 'calendar-outline';
    }
  };

  const renderEventItem = (event: CalendarEvent) => (
    <View key={event.id} style={styles.eventItem}>
      <View style={styles.eventIcon}>
        <Ionicons name={getEventIcon(event.type)} size={24} color="#137fec" />
      </View>
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventTime}>{event.time}</Text>
        {event.location && (
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color="#6b7280" />
            <Text style={styles.eventLocation}>{event.location}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Header */}
      <ProfileHeader
        title="My Calendar"
        subtitle="Schedule & meetings"
        rightElement={
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#137fec" />
          </TouchableOpacity>
        }
        onProfilePress={() => {
          // Handle profile navigation
        }}
        onRightElementPress={() => navigation.goBack()}
        onNotificationsPress={() => (navigation as any).navigate('Notifications')}
      />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Google Connect */}
        {!hasGoogle && (
          <View style={styles.connectContainer}>
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => {
                console.log('🚀 [OAuth Debug] ===== Connect Button Pressed (Code Flow) =====');
                console.log('🚀 [OAuth Debug] Request Available:', !!request);
                console.log('🚀 [OAuth Debug] Request URL:', request?.url);
                console.log('🚀 [OAuth Debug] Starting OAuth flow...');
                console.log('🚀 [OAuth Debug] ================================');
                promptAsync();
              }}
              disabled={!request}
            >
              <Ionicons name="logo-google" size={18} color="#fff" />
              <Text style={styles.connectText}>Connect Google Calendar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.fallbackButton}
              onPress={() => {
                console.log('🚀 [OAuth Debug] ===== Fallback Button Pressed (Implicit Flow) =====');
                console.log('🚀 [OAuth Debug] Implicit Request Available:', !!implicitRequest);
                console.log('🚀 [OAuth Debug] Starting Implicit OAuth flow...');
                console.log('🚀 [OAuth Debug] ================================');
                implicitPromptAsync();
              }}
              disabled={!implicitRequest}
            >
              <Ionicons name="refresh" size={16} color="#137fec" />
              <Text style={styles.fallbackText}>Try Alternative Method</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.customButton}
              onPress={handleCustomOAuth}
              disabled={customOAuthLoading}
            >
              <Ionicons name="globe" size={16} color="#10b981" />
              <Text style={styles.customText}>
                {customOAuthLoading ? 'Connecting...' : 'Custom OAuth Method'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.customButton}
              onPress={handleAlternativeOAuth}
              disabled={customOAuthLoading}
            >
              <Ionicons name="settings" size={16} color="#f59e0b" />
              <Text style={styles.customText}>
                {customOAuthLoading ? 'Connecting...' : 'Alternative OAuth Method'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simpleButton}
              onPress={handleSimpleOAuth}
              disabled={customOAuthLoading}
            >
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.simpleText}>
                {customOAuthLoading ? 'Connecting...' : 'Simple OAuth Method'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.minimalButton}
              onPress={handleMinimalOAuth}
              disabled={customOAuthLoading}
            >
              <Ionicons name="shield-checkmark" size={16} color="#7c3aed" />
              <Text style={styles.minimalText}>
                {customOAuthLoading ? 'Connecting...' : 'Minimal OAuth Method'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {hasGoogle && (
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={async () => {
              await clearTokens();
              setHasGoogle(false);
              setEvents([]);
              setSelectedDateEvents([]);
            }}
          >
            <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            <Text style={styles.connectedText}>Google Calendar Connected</Text>
            <Text style={styles.disconnectText}>Tap to disconnect</Text>
          </TouchableOpacity>
        )}
        {/* Calendar Header */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            style={styles.monthButton}
            onPress={() => navigateMonth('prev')}
          >
            <Ionicons name="chevron-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{currentMonth}</Text>
          <TouchableOpacity
            style={styles.monthButton}
            onPress={() => navigateMonth('next')}
          >
            <Ionicons name="chevron-forward" size={24} color="#1f2937" />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarContainer}>
          {/* Days of week header */}
          <View style={styles.weekHeader}>
            {daysOfWeek.map((day, index) => (
              <Text key={`day-${index}`} style={styles.weekDayText}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {renderCalendarGrid()}
          </View>
        </View>

        {/* Selected Date Events */}
        <View style={styles.eventsSection}>
          <Text style={styles.eventsTitle}>
            {selectedDate.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </Text>
          
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#137fec" />
              <Text style={styles.loadingText}>Loading events...</Text>
            </View>
          )}
          
          {!loading && hasGoogle && selectedDateEvents.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No events for this day</Text>
            </View>
          )}
          
          {!loading && (!hasGoogle || selectedDateEvents.length > 0) && (
            <View style={styles.eventsList}>
              {selectedDateEvents.map(renderEventItem)}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateMeeting' as never)}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#f6f7f8',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  monthButton: {
    padding: 8,
    borderRadius: 20,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  selectedDay: {
    backgroundColor: '#137fec',
    borderRadius: 20,
  },
  todayDay: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 16,
    color: '#1f2937',
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  todayDayText: {
    color: '#137fec',
    fontWeight: 'bold',
  },
  eventsSection: {
    marginBottom: 100,
  },
  eventsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  eventsList: {
    gap: 16,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#137fec',
    opacity: 0.1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#137fec',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  connectContainer: {
    marginTop: 8,
    gap: 8,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#137fec',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  connectText: {
    color: 'white',
    fontWeight: '600',
  },
  fallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#137fec',
  },
  fallbackText: {
    color: '#137fec',
    fontWeight: '500',
    fontSize: 14,
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  customText: {
    color: '#10b981',
    fontWeight: '500',
    fontSize: 14,
  },
  simpleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#059669',
  },
  simpleText: {
    color: '#059669',
    fontWeight: '500',
    fontSize: 14,
  },
  minimalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  minimalText: {
    color: '#7c3aed',
    fontWeight: '500',
    fontSize: 14,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  connectedText: {
    color: '#10b981',
    fontWeight: '600',
  },
  disconnectText: {
    color: '#6b7280',
    fontSize: 12,
    marginLeft: 4,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#137fec',
    position: 'absolute',
    bottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  eventLocation: {
    fontSize: 12,
    color: '#6b7280',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
});

export default CalendarScreen;