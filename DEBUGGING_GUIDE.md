# OAuth Debugging Guide

## 🔍 How to Debug OAuth Issues

I've added extensive logging throughout the OAuth flow. Here's what to look for in your terminal logs:

### 1. Initial Configuration Logs
When the app starts, you should see:
```
🔍 [OAuth Debug] ===== OAuth Configuration =====
🔍 [OAuth Debug] Redirect URI: https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT
🔍 [OAuth Debug] Client IDs: {...}
🔍 [OAuth Debug] Selected Client ID: 612179888169-brgngnt28t0ghl7d7ph18tinden68bnt.apps.googleusercontent.com
🔍 [OAuth Debug] Scopes: ["openid", "profile", "email", "https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"]
🔍 [OAuth Debug] Response Type: Code
🔍 [OAuth Debug] PKCE: Enabled
🔍 [OAuth Debug] ================================
```

### 2. Auth Request Creation
When the OAuth request is created:
```
🔍 [OAuth Debug] ===== Auth Request Created =====
🔍 [OAuth Debug] Request URL: https://accounts.google.com/o/oauth2/v2/auth?...
🔍 [OAuth Debug] Request Params: {...}
🔍 [OAuth Debug] Code Verifier: [random string]
🔍 [OAuth Debug] Code Challenge: [SHA256 hash]
🔍 [OAuth Debug] ================================
```

### 3. Connect Button Press
When you tap "Connect Google Calendar":
```
🚀 [OAuth Debug] ===== Connect Button Pressed =====
🚀 [OAuth Debug] Request Available: true
🚀 [OAuth Debug] Request URL: https://accounts.google.com/o/oauth2/v2/auth?...
🚀 [OAuth Debug] Starting OAuth flow...
🚀 [OAuth Debug] ================================
```

### 4. OAuth Response
When Google redirects back to your app:
```
🔍 [OAuth Debug] ===== Response Received =====
🔍 [OAuth Debug] Response Type: success
🔍 [OAuth Debug] Full Response: {...}
🔍 [OAuth Debug] Response Params: {...}
🔍 [OAuth Debug] Response Error: null
🔍 [OAuth Debug] ================================
```

### 5. Token Exchange (Success)
If everything works:
```
✅ [OAuth Debug] OAuth SUCCESS - Processing response
🔑 [OAuth Debug] Authorization Code Flow Detected
🔑 [OAuth Debug] Authorization Code: [code]
🔑 [OAuth Debug] Code Verifier Available: true
🔄 [OAuth Debug] Starting token exchange...
🔄 [Token Exchange] ===== Starting Token Exchange =====
🔄 [Token Exchange] Authorization Code: [code]
🔄 [Token Exchange] Client ID: 612179888169-brgngnt28t0ghl7d7ph18tinden68bnt.apps.googleusercontent.com
🔄 [Token Exchange] Code Verifier: [verifier]
✅ [Token Exchange] Success!
✅ [Token Exchange] Access Token Present: true
✅ [Token Exchange] Refresh Token Present: true
💾 [Token Storage] Storing tokens...
💾 [Token Storage] Tokens stored successfully
```

### 6. Token Exchange (Error)
If there's an error:
```
❌ [Token Exchange] Request Failed:
❌ [Token Exchange] Status: 400
❌ [Token Exchange] Error Response: {"error":"invalid_grant","error_description":"Bad Request"}
❌ [Token Exchange] Parsed Error: {...}
```

## 🚨 Common Error Patterns

### Error 1: `invalid_grant`
**Cause:** Authorization code is invalid or expired
**Solution:** Check if the code verifier matches the code challenge

### Error 2: `redirect_uri_mismatch`
**Cause:** Redirect URI doesn't match Google Console
**Solution:** Verify exact match in Google Console

### Error 3: `invalid_client`
**Cause:** Wrong client ID or client not configured for Expo
**Solution:** Use Expo client ID in Google Console

### Error 4: `access_denied`
**Cause:** User denied permissions or app not verified
**Solution:** Add test users in Google Console

## 🔧 Debugging Steps

### Step 1: Check Initial Logs
Look for the configuration logs when the app starts. If you don't see them, there's an issue with the OAuth setup.

### Step 2: Check Request Creation
Verify that the auth request is created properly with the correct URL and parameters.

### Step 3: Check Button Press
When you tap the connect button, you should see the button press logs.

### Step 4: Check Response
After the OAuth flow, look for the response logs to see what Google is sending back.

### Step 5: Check Token Exchange
If you get a response with a code, check the token exchange logs to see where it fails.

## 📱 Testing Instructions

1. **Clear cache and restart:**
   ```bash
   npx expo start --clear
   ```

2. **Open in Expo Go**

3. **Navigate to Calendar screen**

4. **Watch the terminal logs** for the initial configuration

5. **Tap "Connect Google Calendar"**

6. **Complete the OAuth flow**

7. **Watch for response and token exchange logs**

## 🎯 What to Look For

### Success Indicators
- ✅ Configuration logs appear
- ✅ Request creation logs appear
- ✅ Button press logs appear
- ✅ Response type is "success"
- ✅ Authorization code is present
- ✅ Token exchange succeeds
- ✅ Tokens are stored

### Failure Indicators
- ❌ Missing configuration logs
- ❌ Request creation fails
- ❌ Response type is "error"
- ❌ No authorization code in response
- ❌ Token exchange fails
- ❌ Error messages in logs

## 🆘 If Still Having Issues

1. **Copy the exact error logs** from the terminal
2. **Check Google Console** configuration
3. **Verify redirect URI** matches exactly
4. **Try creating a new OAuth client** in Google Console
5. **Check that Google Calendar API is enabled**

The extensive logging will show you exactly where the OAuth flow is failing!
