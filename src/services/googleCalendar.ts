import { getStoredTokens, refreshAccessToken, getClientIds } from './googleAuth';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  type: 'meeting' | 'review' | 'presentation' | 'event';
  description?: string;
  location?: string;
  startDateTime?: string;
  endDateTime?: string;
}

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export const getAccessToken = async (): Promise<string | null> => {
  const tokens = await getStoredTokens();
  if (!tokens?.accessToken) return null;

  // Check if token is expired (if we have expiresAt)
  if (tokens.expiresAt && Date.now() >= tokens.expiresAt) {
    if (tokens.refreshToken) {
      const clientIds = getClientIds();
      const clientId = clientIds.expo || clientIds.android || clientIds.ios;
      try {
        const newTokens = await refreshAccessToken(tokens.refreshToken, clientId);
        // Store the new tokens
        const { storeTokens } = await import('./googleAuth');
        await storeTokens({
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token || tokens.refreshToken,
          expiresAt: Date.now() + (newTokens.expires_in * 1000),
        });
        return newTokens.access_token;
      } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
      }
    }
    return null;
  }

  return tokens.accessToken;
};

export const fetchCalendarEvents = async (
  timeMin?: string,
  timeMax?: string
): Promise<CalendarEvent[]> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('No access token available');
  }

  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    ...(timeMin && { timeMin }),
    ...(timeMax && { timeMax }),
  });

  try {
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/primary/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Calendar API error:', error);
      throw new Error(`Failed to fetch calendar events: ${response.status}`);
    }

    const data = await response.json();
    const events: GoogleCalendarEvent[] = data.items || [];

    // Transform Google Calendar events to our format
    return events.map((event) => transformGoogleEvent(event));
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
};

export const fetchEventsForDate = async (date: Date): Promise<CalendarEvent[]> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return fetchCalendarEvents(
    startOfDay.toISOString(),
    endOfDay.toISOString()
  );
};

export const fetchEventsForMonth = async (date: Date): Promise<CalendarEvent[]> => {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

  return fetchCalendarEvents(
    startOfMonth.toISOString(),
    endOfMonth.toISOString()
  );
};

export const createCalendarEvent = async (
  event: {
    summary: string;
    description?: string;
    startDateTime: string;
    endDateTime: string;
    location?: string;
    attendees?: string[];
  }
): Promise<GoogleCalendarEvent> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('No access token available');
  }

  const eventBody = {
    summary: event.summary,
    description: event.description,
    start: {
      dateTime: event.startDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: event.endDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    location: event.location,
    attendees: event.attendees?.map((email) => ({ email })),
  };

  try {
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/primary/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Calendar API error:', error);
      throw new Error(`Failed to create calendar event: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
};

export const updateCalendarEvent = async (
  eventId: string,
  updates: Partial<{
    summary: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    location: string;
  }>
): Promise<GoogleCalendarEvent> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('No access token available');
  }

  const eventBody: any = {};
  
  if (updates.summary) eventBody.summary = updates.summary;
  if (updates.description) eventBody.description = updates.description;
  if (updates.location) eventBody.location = updates.location;
  
  if (updates.startDateTime) {
    eventBody.start = {
      dateTime: updates.startDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
  
  if (updates.endDateTime) {
    eventBody.end = {
      dateTime: updates.endDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  try {
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Calendar API error:', error);
      throw new Error(`Failed to update calendar event: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
};

export const deleteCalendarEvent = async (eventId: string): Promise<void> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('No access token available');
  }

  try {
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Calendar API error:', error);
      throw new Error(`Failed to delete calendar event: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
};

// Helper function to transform Google Calendar event to our format
const transformGoogleEvent = (event: GoogleCalendarEvent): CalendarEvent => {
  const startDateTime = event.start.dateTime || event.start.date;
  const endDateTime = event.end.dateTime || event.end.date;
  
  const startDate = startDateTime ? new Date(startDateTime) : new Date();
  const endDate = endDateTime ? new Date(endDateTime) : new Date();
  
  let timeString = '';
  
  if (event.start.dateTime && event.end.dateTime) {
    // Time-based event
    const startTime = startDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const endTime = endDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    timeString = `${startTime} - ${endTime}`;
  } else {
    // All-day event
    timeString = 'All day';
  }

  // Determine event type based on summary/description
  let type: CalendarEvent['type'] = 'event';
  const summary = (event.summary || '').toLowerCase();
  
  if (summary.includes('meeting') || summary.includes('call')) {
    type = 'meeting';
  } else if (summary.includes('review') || summary.includes('retrospective')) {
    type = 'review';
  } else if (summary.includes('presentation') || summary.includes('demo')) {
    type = 'presentation';
  }

  return {
    id: event.id,
    title: event.summary || 'Untitled Event',
    time: timeString,
    type,
    description: event.description,
    location: event.location,
    startDateTime,
    endDateTime,
  };
};

// Get events grouped by date
export const getEventsByDate = (events: CalendarEvent[]): Map<string, CalendarEvent[]> => {
  const eventsByDate = new Map<string, CalendarEvent[]>();
  
  events.forEach(event => {
    if (event.startDateTime) {
      const date = new Date(event.startDateTime);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, []);
      }
      eventsByDate.get(dateKey)!.push(event);
    }
  });
  
  return eventsByDate;
};

