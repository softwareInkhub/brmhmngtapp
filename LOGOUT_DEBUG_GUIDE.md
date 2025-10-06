# 🔍 Logout Debug & Fix Guide

## ✅ Changes Made

I've added **comprehensive debugging** to track the logout flow and identify any issues.

---

## 🔧 What Was Fixed

### 1. **Added Debug Logging**
Every step of the logout process now logs to console with emoji markers:

- 🔴 **[SIDEBAR]** - Sidebar component actions
- 🚪 **[LOGOUT]** - AuthContext logout function
- 🗺️ **[NAVIGATOR]** - AppNavigator rendering decisions
- 🔄 **[NAVIGATOR]** - Auth state change detection

### 2. **Added State Change Monitoring**
The AppNavigator now has a `useEffect` that triggers whenever auth state changes, making it impossible to miss logout events.

### 3. **Added Storage Verification**
After clearing AsyncStorage, the code now verifies that tokens are actually removed.

---

## 🧪 How to Test Logout

### Step 1: Clear Existing Data
Before testing, clear any old data:

```bash
cd BRMHMANAGEMENT
npm start
```

Then in your app:
1. If logged in, logout first
2. Close app completely
3. Reopen app

### Step 2: Login Fresh
1. Open app
2. Login with credentials
3. Should see dashboard

### Step 3: Test Logout with Debug Logs

**Open your console/terminal** where you ran `npm start` or `expo start`

1. **Tap hamburger menu (≡)** in top-left
   - Sidebar should open

2. **Scroll to bottom of sidebar**
   - You should see red "Logout" button

3. **Tap "Logout" button**
   - You should see: `🔴 [SIDEBAR] Logout button pressed`

4. **Tap "Logout" in confirmation dialog**
   - Watch console for this sequence:

```
🔴 [SIDEBAR] User confirmed logout
🔴 [SIDEBAR] Closing sidebar...
🔴 [SIDEBAR] Calling logout function...
🚪 [LOGOUT] Starting logout process...
🚪 [LOGOUT] Current auth state: { hasUser: true, hasToken: true, isAuthenticated: true }
🚪 [LOGOUT] Clearing AsyncStorage...
🚪 [LOGOUT] AsyncStorage cleared successfully
🚪 [LOGOUT] Verification - User in storage: null
🚪 [LOGOUT] Verification - Token in storage: null
🚪 [LOGOUT] Setting auth state to logged out...
🚪 [LOGOUT] Logout complete! isAuthenticated: false
🔴 [SIDEBAR] Logout function completed
🔴 [SIDEBAR] Waiting for AppNavigator to redirect...
🔄 [NAVIGATOR] Auth state changed!
🔄 [NAVIGATOR] New state: { isAuthenticated: false, isLoading: false, hasUser: false, hasToken: false }
🗺️ [NAVIGATOR] Render - Current auth state: { isAuthenticated: false, ... }
🗺️ [NAVIGATOR] Rendering AUTH screens
```

5. **You should see Login screen**
   - App should redirect to login automatically

---

## ❌ Troubleshooting

### Problem 1: Console Shows Nothing

**Symptoms:**
- No debug logs appear in console
- App seems to do nothing

**Solutions:**
1. Make sure you're looking at the correct console (Metro bundler terminal)
2. Try refreshing the app (shake device → Reload)
3. Restart Metro bundler:
   ```bash
   # Stop current process (Ctrl+C)
   npm start --reset-cache
   ```

### Problem 2: Logs Show Error

**Symptoms:**
- See `❌ [LOGOUT] Error clearing auth:`
- Alert says "Failed to logout"

**Solutions:**
1. Check if AsyncStorage is properly installed:
   ```bash
   cd BRMHMANAGEMENT
   npm list @react-native-async-storage/async-storage
   ```
   
2. If not installed:
   ```bash
   npm install @react-native-async-storage/async-storage
   ```

3. Clear node modules and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```

### Problem 3: Logout Completes But No Redirect

**Symptoms:**
- Console shows: `🚪 [LOGOUT] Logout complete! isAuthenticated: false`
- But app stays on dashboard

**Solutions:**
1. Check if `🔄 [NAVIGATOR] Auth state changed!` appears after logout
   - If NO: AuthContext state update isn't triggering re-render
   
2. Verify AppNavigator is wrapped in AuthProvider:
   ```typescript
   // App.js should have:
   <AuthProvider>
     <AppProvider>
       <AppNavigator />
     </AppProvider>
   </AuthProvider>
   ```

3. Force refresh the app:
   - Shake device → Reload
   - Or close and reopen app

### Problem 4: Token Not Clearing

**Symptoms:**
- Console shows: `🚪 [LOGOUT] Verification - Token in storage: <some_value>`
- Token is still there after clear attempt

**Solutions:**
1. AsyncStorage might be cached. Try:
   ```bash
   # For iOS Simulator
   xcrun simctl erase all
   
   # For Android Emulator
   adb shell pm clear com.yourapp
   ```

2. Check storage keys match:
   ```typescript
   // In AuthContext.tsx, verify:
   const AUTH_STORAGE_KEY = '@brmh_auth';
   const TOKEN_STORAGE_KEY = '@brmh_token';
   ```

### Problem 5: "useAuth must be used within AuthProvider"

**Symptoms:**
- Error: `useAuth must be used within an AuthProvider`
- App crashes

**Solutions:**
1. Check App.js has proper provider nesting:
   ```typescript
   import { AuthProvider } from './src/context/AuthContext';
   
   export default function App() {
     return (
       <SafeAreaProvider>
         <AuthProvider>  {/* ← This must wrap everything */}
           <AppProvider>
             <AppNavigator />
           </AppProvider>
         </AuthProvider>
       </SafeAreaProvider>
     );
   }
   ```

---

## 🔍 Manual Storage Check

To manually verify token clearing:

### Option 1: Add Debug Function
Add this to your DashboardScreen temporarily:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// In component
const checkStorage = async () => {
  const token = await AsyncStorage.getItem('@brmh_token');
  const user = await AsyncStorage.getItem('@brmh_auth');
  console.log('📦 Token in storage:', token);
  console.log('📦 User in storage:', user);
  Alert.alert('Storage Check', `Token: ${token ? 'EXISTS' : 'NULL'}\nUser: ${user ? 'EXISTS' : 'NULL'}`);
};

// Add button
<TouchableOpacity onPress={checkStorage}>
  <Text>Check Storage</Text>
</TouchableOpacity>
```

### Option 2: React Native Debugger
1. Install React Native Debugger
2. Enable "Debug JS Remotely"
3. Open Chrome DevTools
4. Go to Application → Local Storage
5. Check AsyncStorage keys

---

## ✅ Expected Behavior

### Before Logout:
```
📦 Storage Check:
Token: EXISTS (long JWT string)
User: EXISTS (JSON user object)
isAuthenticated: true
```

### After Logout:
```
📦 Storage Check:
Token: NULL
User: NULL
isAuthenticated: false
Screen: Login
```

---

## 🎯 Quick Fix Checklist

If logout isn't working, verify these in order:

- [ ] AsyncStorage package is installed
- [ ] AuthProvider wraps AppNavigator in App.js
- [ ] Console shows debug logs
- [ ] Logout function is being called
- [ ] AsyncStorage.removeItem is executed
- [ ] Storage verification shows null
- [ ] isAuthenticated changes to false
- [ ] AppNavigator detects state change
- [ ] AppNavigator re-renders with AUTH screens
- [ ] Login screen appears

---

## 🚀 Test Commands

Run these to verify everything is set up:

```bash
# 1. Verify package is installed
cd BRMHMANAGEMENT
npm list @react-native-async-storage/async-storage

# 2. Clean install
rm -rf node_modules package-lock.json
npm install

# 3. Clear cache and start
npm start --reset-cache

# 4. Run on device/simulator
npm run android
# or
npm run ios
```

---

## 📞 Getting More Help

If logout still doesn't work after trying all the above:

1. **Capture full console output:**
   - Run `npm start`
   - Perform logout
   - Copy ALL console logs from start to finish

2. **Check App.js structure:**
   - Verify AuthProvider is wrapping AppNavigator
   - Ensure no duplicate providers

3. **Test with a clean state:**
   - Uninstall app from device
   - Reinstall fresh
   - Try logout again

---

## 📝 Debug Log Reference

| Emoji | Component | Meaning |
|-------|-----------|---------|
| 🔴 | Sidebar | User interactions in sidebar |
| 🚪 | AuthContext | Logout function execution |
| 🗺️ | AppNavigator | Navigation rendering decisions |
| 🔄 | AppNavigator | Auth state change detection |
| ❌ | Any | Error occurred |
| ✅ | Any | Success |
| 📦 | Manual | Storage check results |

---

**Status:** Debug logging enabled ✅  
**Next Step:** Test logout and check console logs  
**Expected Result:** Clean logout with navigation to login screen

