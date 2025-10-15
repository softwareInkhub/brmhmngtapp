# Google OAuth & Calendar Integration Setup Guide

## Overview

This app integrates with Google Calendar using OAuth 2.0 for authentication and the Google Calendar API for calendar operations. The integration allows users to:

1. **Connect their Google account** to access calendar data
2. **View calendar events** in a custom calendar interface
3. **Create new events** that sync to Google Calendar
4. **Manage calendar permissions** with proper token refresh

## Architecture Flow

### 1. Authentication Flow
```
User → Connect Google → OAuth Request → Google Consent → Token Exchange → Store Tokens
```

### 2. Calendar Operations Flow
```
App → Check Tokens → Refresh if Expired → API Calls → Google Calendar API → Response
```

## Code Structure

### Core Files

#### `src/services/googleAuth.ts`
- **Purpose**: Handles OAuth authentication flow
- **Key Functions**:
  - `getStoredTokens()`: Retrieves stored access/refresh tokens
  - `storeTokens()`: Saves tokens to AsyncStorage
  - `clearTokens()`: Removes stored tokens
  - `refreshAccessToken()`: Refreshes expired tokens
  - `getClientIds()`: Gets OAuth client IDs from app config

#### `src/services/googleCalendar.ts`
- **Purpose**: Manages Google Calendar API operations
- **Key Functions**:
  - `fetchCalendarEvents()`: Retrieves events from calendar
  - `createCalendarEvent()`: Creates new calendar events
  - `updateCalendarEvent()`: Updates existing events
  - `deleteCalendarEvent()`: Removes events
  - `getAccessToken()`: Handles token validation and refresh

#### `src/screens/CalendarScreen.tsx`
- **Purpose**: Main calendar interface
- **Features**:
  - Google OAuth connection/disconnection
  - Calendar grid view with event indicators
  - Event list for selected dates
  - Pull-to-refresh functionality

#### `src/screens/CreateMeetingScreen.tsx`
- **Purpose**: Event creation interface
- **Features**:
  - Form for event details (title, description, location, time)
  - Date/time pickers
  - Integration with Google Calendar API

## OAuth Configuration

### Required Google Cloud Console Setup

1. **Create OAuth 2.0 Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "APIs & Services" → "Credentials"
   - Create OAuth 2.0 Client ID

2. **Configure Authorized Redirect URIs**:
   ```
   For Expo Go Development:
   https://auth.expo.io/@your-expo-username/BRMHMANAGEMENT
   
   For Production (when you build standalone apps):
   https://auth.expo.io/@your-expo-username/BRMHMANAGEMENT
   ```

3. **Enable APIs**:
   - Google Calendar API
   - Google+ API (for user info)

### App Configuration (`app.json`)

```json
{
  "expo": {
    "extra": {
      "googleExpoClientId": "YOUR_EXPO_CLIENT_ID",
      "googleIosClientId": "YOUR_IOS_CLIENT_ID", 
      "googleAndroidClientId": "YOUR_ANDROID_CLIENT_ID"
    }
  }
}
```

## Current Issue: Redirect URI Mismatch

### Problem Analysis

You're getting `redirect_uri_mismatch (400)` because:

1. **Incorrect Redirect URI**: The code is using `https://auth.expo.io/` but your Google Console is configured for `https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT`

2. **Missing Expo Username**: The redirect URI must include your Expo username

### Solution

#### Step 1: Fix the Redirect URI in Code

Update `CalendarScreen.tsx` line 40:

```typescript
// WRONG (current):
const redirectUri = 'https://auth.expo.io/';

// CORRECT:
const redirectUri = 'https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT';
```

#### Step 2: Verify Google Console Configuration

In your Google Cloud Console OAuth client:

**Authorized redirect URIs should include**:
```
https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT
```

#### Step 3: Alternative - Use Dynamic Redirect URI

For better flexibility, use Expo's `makeRedirectUri`:

```typescript
import { makeRedirectUri } from 'expo-auth-session';

// This automatically generates the correct redirect URI
const redirectUri = makeRedirectUri({ useProxy: true });
```

## Debugging Steps

### 1. Check Current Configuration

```bash
# Check your Expo username
npx expo whoami

# Verify app configuration
npx expo config
```

### 2. Test OAuth Flow

Add debug logging to `CalendarScreen.tsx`:

```typescript
console.log('[OAuth Debug] Redirect URI:', redirectUri);
console.log('[OAuth Debug] Client ID:', clientIds.expo);
console.log('[OAuth Debug] Request:', request);
```

### 3. Verify Token Storage

Check if tokens are being stored correctly:

```typescript
// Add to CalendarScreen.tsx useEffect
useEffect(() => {
  (async () => {
    const tokens = await getStoredTokens();
    console.log('[OAuth Debug] Stored tokens:', tokens);
    setHasGoogle(!!tokens?.accessToken);
  })();
}, []);
```

### 4. Test API Calls

Verify calendar API access:

```typescript
// Add test function
const testCalendarAccess = async () => {
  try {
    const events = await fetchEventsForMonth(new Date());
    console.log('[Calendar Debug] Events fetched:', events.length);
  } catch (error) {
    console.error('[Calendar Debug] Error:', error);
  }
};
```

## Complete Working Implementation

### Updated CalendarScreen.tsx (Key Changes)

```typescript
// Fix redirect URI
const redirectUri = 'https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT';

// Add debug logging
console.log('[OAuth Debug] Using redirectUri:', redirectUri);
console.log('[OAuth Debug] Client ID:', clientIds.expo);

// Enhanced error handling
useEffect(() => {
  (async () => {
    if (response?.type === 'success' && response.params?.access_token) {
      console.log('[OAuth Debug] OAuth success, storing tokens');
      const expiresIn = Number(response.params.expires_in) || 3600;
      await storeTokens({ 
        accessToken: response.params.access_token,
        expiresAt: Date.now() + (expiresIn * 1000)
      });
      setHasGoogle(true);
    } else if (response?.type === 'error') {
      console.error('[OAuth Debug] OAuth error:', response.error);
      Alert.alert('Authentication Error', response.error?.message || 'Failed to authenticate');
    }
  })();
}, [response]);
```

## Testing Checklist

- [ ] Google Cloud Console OAuth client configured
- [ ] Redirect URI matches exactly: `https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT`
- [ ] Google Calendar API enabled
- [ ] Client ID added to `app.json`
- [ ] App runs in Expo Go
- [ ] OAuth flow completes without errors
- [ ] Calendar events load successfully
- [ ] New events can be created

## Common Issues & Solutions

### 1. "redirect_uri_mismatch"
- **Cause**: Redirect URI in code doesn't match Google Console
- **Fix**: Ensure exact match including Expo username

### 2. "invalid_client"
- **Cause**: Wrong client ID or not configured for Expo
- **Fix**: Use Expo client ID in Google Console

### 3. "access_denied"
- **Cause**: User denied permissions or app not verified
- **Fix**: Add test users in Google Console or verify app

### 4. "token_expired"
- **Cause**: Access token expired and refresh failed
- **Fix**: Check refresh token flow and client configuration

## Production Considerations

1. **Use separate OAuth clients** for development and production
2. **Implement proper error handling** for network issues
3. **Add token refresh logic** for long-running sessions
4. **Consider rate limiting** for API calls
5. **Implement offline support** with local caching

## Security Best Practices

1. **Never expose client secrets** in client-side code
2. **Use HTTPS** for all OAuth redirects
3. **Implement proper token storage** with encryption
4. **Validate all API responses** before processing
5. **Handle token expiration** gracefully

This setup provides a robust Google Calendar integration with proper OAuth flow and error handling.
