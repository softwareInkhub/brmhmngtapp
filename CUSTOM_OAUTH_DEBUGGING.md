# Custom OAuth Methods - Debugging Guide

## 🔧 New OAuth Methods Added

I've added two new OAuth methods to work around the dismiss issue:

### 1. **Custom OAuth Method** (Green Button)
- Uses `WebBrowser.openAuthSessionAsync` directly
- Implements implicit flow manually
- Better control over the OAuth process
- More compatible with Expo Go

### 2. **Alternative OAuth Method** (Orange Button)
- Uses `AuthSession.AuthRequest` with different configuration
- Direct request creation and prompting
- Bypasses some Expo OAuth limitations

## 🚀 How to Test

### Step 1: Clear Cache and Restart
```bash
npx expo start --clear
```

### Step 2: Test All Methods
You now have **4 different OAuth methods** to try:

1. **Connect Google Calendar** (Blue) - Original code flow
2. **Try Alternative Method** (Gray) - Original implicit flow  
3. **Custom OAuth Method** (Green) - New custom implementation
4. **Alternative OAuth Method** (Orange) - New alternative implementation

### Step 3: Watch Console Logs
Each method has extensive logging:

#### Custom OAuth Method Logs:
```
🔧 [Custom OAuth] ===== Starting Custom OAuth Flow =====
🔧 [Custom OAuth] Client ID: 612179888169-brgngnt28t0ghl7d7ph18tinden68bnt.apps.googleusercontent.com
🔧 [Custom OAuth] Redirect URI: https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT
🔧 [Custom OAuth] Authorization URL: https://accounts.google.com/o/oauth2/v2/auth?...
🔧 [Custom OAuth] Opening browser...
🔧 [Custom OAuth] Browser result: {...}
```

#### Alternative OAuth Method Logs:
```
🔧 [Alternative OAuth] ===== Starting Alternative OAuth Flow =====
🔧 [Alternative OAuth] Client ID: 612179888169-brgngnt28t0ghl7d7ph18tinden68bnt.apps.googleusercontent.com
🔧 [Alternative OAuth] Request created: https://accounts.google.com/o/oauth2/v2/auth?...
🔧 [Alternative OAuth] Result: {...}
```

## 🔍 What to Look For

### Success Indicators:
```
✅ [Custom OAuth] Success!
✅ [Custom OAuth] Access token found!
💾 [Custom OAuth] Tokens stored successfully
```

### Error Indicators:
```
❌ [Custom OAuth] Error in response: access_denied
❌ [Custom OAuth] No access token in response
❌ [Custom OAuth] Browser dismissed
```

## 🎯 Expected Behavior

### Custom OAuth Method:
1. Opens browser with Google OAuth
2. User completes authentication
3. Browser redirects back to app
4. App parses URL fragment for tokens
5. Tokens are stored and calendar connects

### Alternative OAuth Method:
1. Creates AuthRequest manually
2. Prompts for authentication
3. Handles response directly
4. Stores tokens and connects calendar

## 🚨 Common Issues & Solutions

### Issue 1: Browser Doesn't Open
**Cause**: WebBrowser permissions or configuration
**Solution**: Check Expo Go permissions, try different network

### Issue 2: Browser Opens But Doesn't Redirect
**Cause**: Redirect URI mismatch or browser issues
**Solution**: Verify Google Console configuration

### Issue 3: Tokens Not Found in URL
**Cause**: Google OAuth error or scope issues
**Solution**: Check Google Console scopes and test user setup

### Issue 4: Still Getting Dismissed
**Cause**: Fundamental OAuth configuration issue
**Solution**: Try all 4 methods, check Google Console setup

## 📋 Testing Checklist

- [ ] **Method 1 (Code Flow)**: Try original method
- [ ] **Method 2 (Implicit Flow)**: Try original fallback
- [ ] **Method 3 (Custom OAuth)**: Try new custom method
- [ ] **Method 4 (Alternative OAuth)**: Try new alternative method
- [ ] **Check console logs** for each method
- [ ] **Verify token storage** if any method succeeds
- [ ] **Test calendar functionality** after successful auth

## 🔧 Debugging Commands

```bash
# Clear cache and restart
npx expo start --clear

# Check Expo configuration
npx expo config

# Verify OAuth setup
node debug-oauth.js
```

## 🎉 Success Criteria

You'll know it's working when:
- ✅ One of the 4 methods completes successfully
- ✅ Console shows "Success!" and "Tokens stored successfully"
- ✅ "Google Calendar connected successfully!" alert appears
- ✅ Calendar events load in the app
- ✅ You can create new events

## 🆘 If All Methods Fail

If all 4 OAuth methods fail:

1. **Check Google Console**:
   - Verify OAuth client configuration
   - Ensure redirect URI is exactly: `https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT`
   - Check that Google Calendar API is enabled
   - Verify you're added as a test user

2. **Check Network**:
   - Try different network (WiFi vs mobile data)
   - Check if corporate firewall is blocking OAuth

3. **Check Expo Go**:
   - Restart Expo Go completely
   - Try on different device
   - Check Expo Go version

4. **Check Google Account**:
   - Try with different Google account
   - Check if 2FA is enabled
   - Verify account permissions

The custom OAuth methods should work better with Expo Go since they bypass some of the limitations of the standard AuthSession implementation!
