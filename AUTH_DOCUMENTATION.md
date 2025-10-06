# BRMH Management - Authentication System

## Overview
Professional, industry-level authentication system with login and signup screens for the BRMH Management mobile application.

## Features Implemented

### 🔐 Authentication Screens

#### 1. **Login Screen** (`src/screens/LoginScreen.tsx`)
- Modern, professional UI with BRMH branding
- Email and password validation
- Show/hide password toggle
- Form validation with error messages
- Loading states during authentication
- Smooth navigation to signup
- Terms of Service and Privacy Policy links

**Key Features:**
- Email format validation
- Password length validation (minimum 6 characters)
- Real-time error clearing
- Professional error handling with alerts
- Responsive design

#### 2. **Signup Screen** (`src/screens/SignupScreen.tsx`)
- Comprehensive registration form
- Multi-field validation
- Password strength requirements
- Real-time password validation indicators
- Phone number validation
- Confirm password matching

**Fields:**
- Full Name (minimum 3 characters)
- Email (valid email format)
- Phone Number (minimum 10 digits)
- Password (8+ chars, uppercase, lowercase, number)
- Confirm Password

**Password Requirements:**
- At least 8 characters
- One uppercase letter
- One lowercase letter
- One number
- Visual indicators for each requirement

### 🔒 Authentication Context (`src/context/AuthContext.tsx`)
- Global authentication state management
- Persistent authentication using AsyncStorage
- User session management
- Automatic token storage
- Login/logout functionality
- User data updates

**State Management:**
- `user`: Current user object
- `token`: Authentication token
- `isLoading`: Loading state
- `isAuthenticated`: Authentication status

### 🌐 API Integration (`src/services/api.ts`)

#### Authentication Endpoints:
1. **Login** (`apiService.login()`)
   - Validates user credentials
   - Returns user object and token
   - Secure password verification

2. **Signup** (`apiService.signup()`)
   - Creates new user account
   - Checks for existing email
   - Returns user object and token
   - Stores user in `brmh-users` table

### 🧭 Navigation (`src/navigation/AppNavigator.tsx`)
- Protected route implementation
- Conditional rendering based on authentication
- Loading screen during auth check
- Automatic redirect to login/main app
- Seamless navigation flow

**Flow:**
1. App starts → Check authentication
2. If not authenticated → Show Login/Signup
3. If authenticated → Show Main App
4. Logout → Return to Login

### 👤 Profile Header (`src/components/ProfileHeader.tsx`)
- Displays current user information
- Profile menu with dropdown
- Logout functionality
- User role badge display
- Smooth modal animations

**Menu Options:**
- My Profile (placeholder)
- Settings (placeholder)
- Logout (functional)

## File Structure

```
BRMHMANAGEMENT/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx          # Login interface
│   │   └── SignupScreen.tsx         # Signup interface
│   ├── context/
│   │   └── AuthContext.tsx          # Auth state management
│   ├── services/
│   │   └── api.ts                   # API integration
│   ├── navigation/
│   │   └── AppNavigator.tsx         # Navigation with auth
│   ├── components/
│   │   └── ProfileHeader.tsx        # Header with logout
│   └── types/
│       └── index.ts                 # TypeScript types
├── App.js                            # Root with AuthProvider
└── AUTH_DOCUMENTATION.md             # This file
```

## Usage

### Starting the App
```bash
npm start
# or
expo start
```

### User Flow

1. **First Time Users:**
   - Open app → See Login screen
   - Tap "Sign Up" → Fill registration form
   - Submit → Auto login → Main app

2. **Returning Users:**
   - Open app → Auto login (if session exists)
   - Or enter credentials → Main app

3. **Logging Out:**
   - Tap profile icon/menu button
   - Select "Logout"
   - Confirm → Return to login

## API Integration

### Backend Endpoints

**Base URL:** `https://brmh.in/auth`

The app integrates with your production BRMH backend using AWS Cognito authentication:

#### 1. **Login Endpoint**
- **URL:** `POST /auth/login`
- **Request Body:**
  ```json
  {
    "username": "user@example.com",
    "password": "userPassword123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "result": {
      "idToken": { "jwtToken": "eyJhbGc..." },
      "accessToken": { "jwtToken": "eyJhbGc..." },
      "refreshToken": { "token": "eyJjdHk..." }
    }
  }
  ```

#### 2. **Signup Endpoint**
- **URL:** `POST /auth/signup`
- **Request Body:**
  ```json
  {
    "username": "John Doe",
    "email": "user@example.com",
    "password": "userPassword123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Account created successfully! Please check your email for verification."
  }
  ```

### AWS Cognito Integration

The backend uses **AWS Cognito User Pools** for authentication:
- User pool manages user registration and authentication
- JWT tokens for secure API access
- Email verification required after signup
- Supports both email/password and social OAuth login

### Authentication Token (JWT)
- **Format:** JWT (JSON Web Token) from AWS Cognito
- **Storage:** AsyncStorage (persistent)
- **Structure:**
  - Header: Algorithm and token type
  - Payload: User claims (sub, email, name, etc.)
  - Signature: Cryptographic signature
- **Lifetime:** 1 hour (configurable in Cognito)
- **Refresh:** Use refresh token to get new access token
- **Cleared on:** Logout

## Security Considerations

### Production-Ready Security (AWS Cognito)

✅ **Already Implemented:**

1. **AWS Cognito User Pools:**
   - Industry-standard authentication service
   - Automatic password hashing with bcrypt
   - HTTPS-only API endpoints
   - Built-in rate limiting and DDoS protection

2. **JWT Tokens:**
   - Cryptographically signed tokens
   - Token expiration (1 hour default)
   - Refresh token mechanism
   - Token validation on every request

3. **Email Verification:**
   - Required email confirmation
   - Verification code sent to user email
   - Prevents fake account creation

4. **Password Requirements:**
   - Enforced complexity rules
   - Minimum length requirements
   - Mix of uppercase, lowercase, and numbers

5. **Additional Security Features:**
   - Multi-factor authentication (MFA) support
   - Account lockout after failed attempts
   - Password recovery flow
   - Session management
   - Cross-site request forgery (CSRF) protection

### Security Best Practices
- Store tokens securely in AsyncStorage
- Never log sensitive data in production
- Use HTTPS for all API calls
- Implement token refresh before expiration
- Clear tokens on logout
- Handle token expiration gracefully

## Design System

### Color Palette
- Primary Blue: `#137fec`
- Background: `#f9fafb`
- Text Dark: `#1f2937`
- Text Medium: `#6b7280`
- Text Light: `#9ca3af`
- Border: `#e5e7eb`
- Error: `#ef4444`
- Success: `#10b981`

### Typography
- Brand Title: 28px, Bold
- Welcome Title: 32px, Bold
- Body Text: 16px
- Labels: 14px, Semibold
- Small Text: 12-13px

### Components
- Input fields: 56px height, 12px radius
- Buttons: 56px height, 12px radius
- Cards: 16px padding, 12px radius
- Shadows: Subtle, consistent elevation

## Testing

### Test Signup
1. Enter valid name (e.g., "John Doe")
2. Enter valid email (e.g., "john@example.com")
3. Enter phone (e.g., "+1234567890")
4. Create password (e.g., "Password123")
5. Confirm password
6. Submit → Should create account

### Test Login
1. Use registered email
2. Enter correct password
3. Submit → Should log in

### Test Logout
1. Tap profile menu
2. Select Logout
3. Confirm → Should return to login

## Dependencies

- `@react-navigation/native`: Navigation
- `@react-navigation/stack`: Stack navigation
- `@react-navigation/bottom-tabs`: Tab navigation
- `@react-native-async-storage/async-storage`: Storage
- `@expo/vector-icons`: Icons
- `react-native-safe-area-context`: Safe areas

## Future Enhancements

1. **Password Recovery:**
   - Forgot password flow
   - Email verification
   - Password reset

2. **Social Login:**
   - Google Sign-In
   - Apple Sign-In
   - Facebook Login

3. **Biometric Authentication:**
   - Fingerprint
   - Face ID

4. **Two-Factor Authentication:**
   - SMS OTP
   - Email verification
   - Authenticator app

5. **Profile Management:**
   - Edit profile
   - Change password
   - Profile picture upload
   - Notification preferences

6. **Session Management:**
   - Multiple device sessions
   - Session timeout
   - Force logout

## Support

For issues or questions:
1. Check this documentation
2. Review code comments
3. Test with fresh install
4. Check console logs

## License

Part of BRMH Management Application
© 2025 All Rights Reserved

