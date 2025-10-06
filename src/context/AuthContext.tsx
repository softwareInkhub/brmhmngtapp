import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = '@brmh_auth';
const TOKEN_STORAGE_KEY = '@brmh_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load stored auth data on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedUser, storedToken] = await Promise.all([
        AsyncStorage.getItem(AUTH_STORAGE_KEY),
        AsyncStorage.getItem(TOKEN_STORAGE_KEY),
      ]);

      if (storedUser && storedToken) {
        const user = JSON.parse(storedUser);
        setAuthState({
          user,
          token: storedToken,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          token: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const login = async (user: User, token: string) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user)),
        AsyncStorage.setItem(TOKEN_STORAGE_KEY, token),
      ]);

      setAuthState({
        user,
        token,
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
        isAuthenticated: authState.isAuthenticated
      });

      // Clear AsyncStorage
      console.log('🚪 [LOGOUT] Clearing AsyncStorage...');
      await Promise.all([
        AsyncStorage.removeItem(AUTH_STORAGE_KEY),
        AsyncStorage.removeItem(TOKEN_STORAGE_KEY),
      ]);
      console.log('🚪 [LOGOUT] AsyncStorage cleared successfully');

      // Verify storage is clear
      const verifyUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      const verifyToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      console.log('🚪 [LOGOUT] Verification - User in storage:', verifyUser);
      console.log('🚪 [LOGOUT] Verification - Token in storage:', verifyToken);

      // Update auth state
      console.log('🚪 [LOGOUT] Setting auth state to logged out...');
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      });
      
      console.log('🚪 [LOGOUT] Logout complete! isAuthenticated: false');
    } catch (error) {
      console.error('❌ [LOGOUT] Error clearing auth:', error);
      throw new Error('Failed to clear authentication data');
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


