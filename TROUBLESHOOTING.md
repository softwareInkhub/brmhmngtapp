# Google OAuth Troubleshooting Guide

## Current Issue: redirect_uri_mismatch (400)

### What's Happening
You're getting this error because the redirect URI in your code doesn't exactly match what's configured in your Google Cloud Console.

### Root Cause Analysis

**Your Current Code:**
```typescript
const redirectUri = 'https://auth.expo.io/';
```

**Your Google Console Configuration:**
```
https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT
```

**The Problem:** These don't match exactly!

## Step-by-Step Fix

### Step 1: Update Your Code ✅ (Already Fixed)
I've updated `CalendarScreen.tsx` to use the correct redirect URI:

```typescript
const redirectUri = 'https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT';
```

### Step 2: Verify Google Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Find your OAuth 2.0 Client ID
4. Click "Edit"
5. In "Authorized redirect URIs", ensure you have:
   ```
   https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT
   ```

### Step 3: Test the Fix

1. **Clear Expo cache:**
   ```bash
   npx expo start --clear
   ```

2. **Open in Expo Go app**

3. **Navigate to Calendar screen**

4. **Tap "Connect Google Calendar"**

5. **Check console logs** for debug information

## Debugging Commands

Run these commands to verify your setup:

```bash
# Check your Expo username
npx expo whoami

# View app configuration
npx expo config

# Clear cache and restart
npx expo start --clear
```

## Enhanced Debugging

I've added comprehensive logging to help you debug:

### Console Logs to Watch For:
```
[Google OAuth] Using redirectUri: https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT
[Google OAuth] Client ID: 612179888169-brgngnt28t0ghl7d7ph18tinden68bnt.apps.googleusercontent.com
[OAuth Debug] OAuth success, storing tokens
```

### Error Messages:
```
[OAuth Debug] OAuth error: {error: "redirect_uri_mismatch", ...}
```

## Common OAuth Errors & Solutions

### 1. redirect_uri_mismatch (400)
- **Cause:** Redirect URI doesn't match Google Console
- **Fix:** Ensure exact match including Expo username

### 2. invalid_client (400)
- **Cause:** Wrong client ID or not configured for Expo
- **Fix:** Use Expo client ID in Google Console

### 3. access_denied (403)
- **Cause:** User denied permissions or app not verified
- **Fix:** Add test users in Google Console

### 4. unauthorized_client (401)
- **Cause:** Client ID not authorized for this redirect URI
- **Fix:** Add redirect URI to Google Console

### 5. invalid_grant (400)
- **Cause:** Authorization code expired or already used
- **Fix:** Restart OAuth flow

## Google Console Configuration Checklist

- [ ] **OAuth 2.0 Client ID created**
- [ ] **Application type:** Web application
- [ ] **Authorized redirect URIs:** `https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT`
- [ ] **Google Calendar API enabled**
- [ ] **Client ID matches app.json**

## Testing Your Fix

### 1. Basic OAuth Flow Test
```typescript
// Add this to CalendarScreen.tsx for testing
const testOAuthConfig = () => {
  console.log('=== OAuth Configuration Test ===');
  console.log('Redirect URI:', redirectUri);
  console.log('Client ID:', clientIds.expo);
  console.log('Scopes:', GOOGLE_SCOPES);
  console.log('===============================');
};
```

### 2. Token Storage Test
```typescript
// Test token storage
const testTokenStorage = async () => {
  const tokens = await getStoredTokens();
  console.log('Stored tokens:', tokens);
  return !!tokens?.accessToken;
};
```

### 3. API Access Test
```typescript
// Test calendar API access
const testCalendarAPI = async () => {
  try {
    const events = await fetchEventsForMonth(new Date());
    console.log('Calendar API test successful:', events.length, 'events');
    return true;
  } catch (error) {
    console.error('Calendar API test failed:', error);
    return false;
  }
};
```

## Alternative Solutions

### Option 1: Use Dynamic Redirect URI
```typescript
import { makeRedirectUri } from 'expo-auth-session';

// This automatically generates the correct redirect URI
const redirectUri = makeRedirectUri({ useProxy: true });
```

### Option 2: Environment-Based Configuration
```typescript
const redirectUri = __DEV__ 
  ? 'https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT'
  : 'https://yourapp.com/auth/callback';
```

## Production Considerations

When you're ready to build for production:

1. **Create separate OAuth clients** for development and production
2. **Use different redirect URIs** for each environment
3. **Implement proper error handling** for network issues
4. **Add token refresh logic** for long-running sessions

## Still Having Issues?

If you're still getting errors after following these steps:

1. **Double-check the exact redirect URI** in Google Console
2. **Verify your Expo username** with `npx expo whoami`
3. **Check that Google Calendar API is enabled**
4. **Try creating a new OAuth client** in Google Console
5. **Clear all browser cookies** and try again

## Success Indicators

You'll know it's working when you see:
- ✅ OAuth flow completes without errors
- ✅ "Google Calendar connected successfully!" alert
- ✅ Calendar events load in the app
- ✅ You can create new events
- ✅ Events appear in your Google Calendar

The key is ensuring the redirect URI matches exactly between your code and Google Console configuration.
