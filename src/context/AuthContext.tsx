import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { apiService } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (user: User, token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = '@brmh_auth';
const TOKEN_STORAGE_KEY = '@brmh_token';
const REFRESH_TOKEN_STORAGE_KEY = '@brmh_refresh_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    refreshToken: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load stored auth data on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedUser, storedToken, storedRefreshToken] = await Promise.all([
        AsyncStorage.getItem(AUTH_STORAGE_KEY),
        AsyncStorage.getItem(TOKEN_STORAGE_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY),
      ]);

      if (storedUser && storedToken) {
        const user = JSON.parse(storedUser);
        setAuthState({
          user,
          token: storedToken,
          refreshToken: storedRefreshToken,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          token: null,
          refreshToken: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      setAuthState({
        user: null,
        token: null,
        refreshToken: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const login = async (user: User, token: string, refreshToken?: string) => {
    try {
      const storagePromises = [
        AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user)),
        AsyncStorage.setItem(TOKEN_STORAGE_KEY, token),
      ];

      if (refreshToken) {
        storagePromises.push(AsyncStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken));
      }

      await Promise.all(storagePromises);

      setAuthState({
        user,
        token,
        refreshToken: refreshToken || null,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Error storing auth:', error);
      throw new Error('Failed to save authentication data');
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 [LOGOUT] Starting logout process...');
      console.log('🚪 [LOGOUT] Current auth state:', {
        hasUser: !!authState.user,
        hasToken: !!authState.token,
        hasRefreshToken: !!authState.refreshToken,
        isAuthenticated: authState.isAuthenticated
      });

      // Step 1: Call backend logout API to clear cookies and revoke tokens
      console.log('🚪 [LOGOUT] Step 1: Calling backend logout API...');
      try {
        const logoutResponse = await apiService.logout(authState.refreshToken || undefined);
        if (logoutResponse.success) {
          console.log('🚪 [LOGOUT] Backend logout successful');
        } else {
          console.warn('🚪 [LOGOUT] Backend logout failed, continuing with local cleanup:', logoutResponse.error);
        }
      } catch (apiError) {
        console.warn('🚪 [LOGOUT] Backend logout API call failed, continuing with local cleanup:', apiError);
      }

      // Step 2: Clear all AsyncStorage items (local storage)
      console.log('🚪 [LOGOUT] Step 2: Clearing AsyncStorage...');
      await Promise.all([
        AsyncStorage.removeItem(AUTH_STORAGE_KEY),
        AsyncStorage.removeItem(TOKEN_STORAGE_KEY),
        AsyncStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY),
      ]);
      console.log('🚪 [LOGOUT] AsyncStorage cleared successfully');

      // Step 3: Verify storage is clear
      const [verifyUser, verifyToken, verifyRefreshToken] = await Promise.all([
        AsyncStorage.getItem(AUTH_STORAGE_KEY),
        AsyncStorage.getItem(TOKEN_STORAGE_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY),
      ]);
      console.log('🚪 [LOGOUT] Step 3: Verification results:');
      console.log('  - User in storage:', verifyUser);
      console.log('  - Token in storage:', verifyToken);
      console.log('  - Refresh token in storage:', verifyRefreshToken);

      // Step 4: Update auth state to trigger navigation
      console.log('🚪 [LOGOUT] Step 4: Setting auth state to logged out...');
      setAuthState({
        user: null,
        token: null,
        refreshToken: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      console.log('🚪 [LOGOUT] ✅ Logout complete! isAuthenticated: false');
      console.log('🚪 [LOGOUT] AppNavigator should now redirect to Login screen');
    } catch (error) {
      console.error('❌ [LOGOUT] Error during logout:', error);
      // Even if there's an error, clear the state to force logout
      setAuthState({
        user: null,
        token: null,
        refreshToken: null,
        isLoading: false,
        isAuthenticated: false,
      });
      throw new Error('Failed to complete logout process');
    }
  };

  const updateUser = async (user: User) => {
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      setAuthState(prevState => ({
        ...prevState,
        user,
      }));
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user data');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


