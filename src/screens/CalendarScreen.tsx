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

  // OAuth request
  const clientIds = getClientIds();
  // Use Expo's auth proxy in development so the redirect matches a web client
  const redirectUri = (makeRedirectUri as any)({ useProxy: true });
  console.log('[Google OAuth] Using redirectUri:', redirectUri);
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: clientIds.expo || clientIds.android || clientIds.ios,
      scopes: GOOGLE_SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      usePKCE: false,
    },
    { authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth', tokenEndpoint: 'https://oauth2.googleapis.com/token' }
  );

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

  useEffect(() => {
    (async () => {
      const tokens = await getStoredTokens();
      setHasGoogle(!!tokens?.accessToken);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (response?.type === 'success' && response.params?.access_token) {
        const expiresIn = Number(response.params.expires_in) || 3600;
        await storeTokens({ 
          accessToken: response.params.access_token,
          expiresAt: Date.now() + (expiresIn * 1000)
        });
        setHasGoogle(true);
      }
    })();
  }, [response]);

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
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => promptAsync()}
            disabled={!request}
          >
            <Ionicons name="logo-google" size={18} color="#fff" />
            <Text style={styles.connectText}>Connect Google Calendar</Text>
          </TouchableOpacity>
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
    paddingBottom: 80, // Add space for bottom tab bar
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
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#137fec',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  connectText: {
    color: 'white',
    fontWeight: '600',
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