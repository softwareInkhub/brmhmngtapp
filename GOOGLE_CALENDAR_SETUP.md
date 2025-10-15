# Google Calendar Integration Setup Guide

## Overview
This guide will help you connect your BRMHMANAGEMENT app with Google Calendar using a **Web Application Client ID**.

## ✅ YES, you can use a Web App Client ID!

Your app uses Expo's auth proxy (`useProxy: true`), which allows you to use a Web Application client ID for development. This is perfect for testing!

---

## Step-by-Step Setup

### Step 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click on the project dropdown at the top
   - Click "New Project" or select an existing one
   - Project name: `BRMHMANAGEMENT` (or any name you prefer)

3. **Enable Google Calendar API**
   - Go to: **APIs & Services → Library**
   - Search for: `Google Calendar API`
   - Click on it and press **ENABLE**

---

### Step 2: Configure OAuth Consent Screen

1. **Navigate to OAuth consent screen**
   - Go to: **APIs & Services → OAuth consent screen**

2. **Choose User Type**
   - Select: **External**
   - Click: **CREATE**

3. **Fill in App Information**
   - App name: `BRMHMANAGEMENT`
   - User support email: `your-email@gmail.com`
   - App logo: (optional)
   - App domain: (leave empty for now)
   - Developer contact: `your-email@gmail.com`
   - Click: **SAVE AND CONTINUE**

4. **Add Scopes**
   - Click: **ADD OR REMOVE SCOPES**
   - Search and add these scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
     - `openid`
     - `profile`
     - `email`
   - Click: **UPDATE**
   - Click: **SAVE AND CONTINUE**

5. **Add Test Users**
   - Click: **ADD USERS**
   - Add your Gmail address (and any other testers)
   - Click: **ADD**
   - Click: **SAVE AND CONTINUE**

6. **Review and Publish**
   - Review your settings
   - Click: **BACK TO DASHBOARD**

---

### Step 3: Create OAuth Client ID

1. **Navigate to Credentials**
   - Go to: **APIs & Services → Credentials**

2. **Create Credentials**
   - Click: **+ CREATE CREDENTIALS**
   - Select: **OAuth client ID**

3. **Configure the OAuth Client**
   - Application type: **Web application**
   - Name: `BRMHMANAGEMENT Web Client`

4. **Add Authorized Redirect URIs**
   Add these URIs (important!):
   ```
   https://auth.expo.io/
   ```
   
   If you have an Expo username, also add:
   ```
   https://auth.expo.io/@YOUR_EXPO_USERNAME/BRMHMANAGEMENT
   ```

5. **Create**
   - Click: **CREATE**
   - A popup will appear with your credentials

6. **Save Your Client ID**
   - Copy the **Client ID** (looks like: `123456789-abc123def.apps.googleusercontent.com`)
   - ⚠️ Keep this safe! You'll need it in the next step

---

### Step 4: Configure Your App

1. **Open `app.json`**
   - Located in: `BRMHMANAGEMENT/app.json`

2. **Update the Client ID**
   - Find the `extra` section (around line 29)
   - Replace the existing client ID with your new one:

   ```json
   "extra": {
     "googleExpoClientId": "YOUR-CLIENT-ID-HERE.apps.googleusercontent.com",
     "googleIosClientId": "YOUR-CLIENT-ID-HERE.apps.googleusercontent.com",
     "googleAndroidClientId": "YOUR-CLIENT-ID-HERE.apps.googleusercontent.com"
   }
   ```

3. **Save the file**

---

### Step 5: Test the Integration

1. **Clear Expo cache and restart**
   ```bash
   cd BRMHMANAGEMENT
   npx expo start --clear
   ```

2. **Open the app**
   - Scan the QR code with Expo Go app
   - Or press `i` for iOS simulator, `a` for Android emulator

3. **Navigate to Calendar Screen**
   - Go to the Calendar tab
   - You should see a "Connect Google Calendar" button

4. **Connect Google Calendar**
   - Tap the "Connect Google Calendar" button
   - You'll be redirected to Google's sign-in page
   - Sign in with the Google account you added as a test user
   - Grant the requested permissions
   - You'll be redirected back to your app

5. **Verify Connection**
   - You should see "Google Calendar Connected" message
   - Your calendar events should start loading
   - Try navigating between months to see events

---

## Troubleshooting

### Issue: "Authorization Error: Invalid Client"
**Solution:** 
- Make sure the Client ID in `app.json` matches exactly with Google Cloud Console
- Restart the Expo development server: `npx expo start --clear`

### Issue: "Redirect URI Mismatch"
**Solution:**
- Check that `https://auth.expo.io/` is added to Authorized redirect URIs
- The redirect URI is case-sensitive

### Issue: "Access Blocked: This app's request is invalid"
**Solution:**
- Make sure you've added yourself as a test user in the OAuth consent screen
- Check that the Google Calendar API is enabled

### Issue: "Token Expired" or "401 Unauthorized"
**Solution:**
- The app automatically refreshes tokens, but if it fails:
- Tap the connected button to disconnect
- Reconnect Google Calendar

### Issue: No Events Showing
**Solution:**
- Check that you have events in your Google Calendar
- Make sure the events are in the current or nearby months
- Try pulling down to refresh the calendar

---

## How It Works

### Authentication Flow
1. User taps "Connect Google Calendar"
2. App opens Google's OAuth page via Expo auth proxy
3. User signs in and grants permissions
4. Google redirects back with an access token
5. App stores the token securely using AsyncStorage
6. Token is used to fetch calendar events

### API Calls
The app can:
- ✅ Fetch calendar events for specific dates/months
- ✅ Create new calendar events
- ✅ Update existing events
- ✅ Delete events
- ✅ Automatically refresh expired tokens

### Security
- Tokens are stored securely in AsyncStorage
- The app uses HTTPS for all API calls
- Access tokens expire after 1 hour (auto-refreshed)
- Users can disconnect at any time

---

## Production Deployment

For **production builds** (not using Expo Go), you'll need platform-specific client IDs:

### For iOS:
1. Create **iOS** application type in Google Cloud Console
2. Bundle ID: Your app's bundle ID
3. Update `googleIosClientId` in `app.json`

### For Android:
1. Create **Android** application type in Google Cloud Console
2. Package name: Your app's package name
3. SHA-1 fingerprint: Get from your keystore
4. Update `googleAndroidClientId` in `app.json`

---

## Need Help?

- Google Cloud Console: https://console.cloud.google.com/
- Expo Auth Session Docs: https://docs.expo.dev/guides/authentication/
- Google Calendar API Docs: https://developers.google.com/calendar/api

---

## Quick Checklist

- [ ] Google Cloud project created
- [ ] Google Calendar API enabled
- [ ] OAuth consent screen configured
- [ ] Test user(s) added
- [ ] Web Application client ID created
- [ ] Redirect URI added: `https://auth.expo.io/`
- [ ] Client ID copied to `app.json`
- [ ] App restarted with `--clear` flag
- [ ] Successfully connected Google Calendar
- [ ] Events loading correctly

---

**Current Status:** Your app is already configured and ready! Just replace the client ID with your own from Google Cloud Console.

