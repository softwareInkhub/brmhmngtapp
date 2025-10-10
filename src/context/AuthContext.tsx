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
  role?: 'admin' | 'manager' | 'user';
}

interface AuthContextType extends AuthState {
  login: (user: User, token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  isAdmin: () => boolean;
  isManager: () => boolean;
  canManage: () => boolean; // create/edit/delete
  canAssign: () => boolean; // assign users to team
  roleForNamespace: (ns: string) => 'admin' | 'manager' | 'user';
  hasPermission: (ns: string, perm: string) => boolean; // e.g., ('projectmanagement', 'crud') or ('projectmanagement','read:all')
  refreshNamespaceRoles: () => Promise<void>;
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
    role: 'user',
  });

  // Load stored auth data on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      console.log('💾 [LOAD] Loading stored auth from AsyncStorage...');
      const [storedUser, storedToken, storedRefreshToken] = await Promise.all([
        AsyncStorage.getItem(AUTH_STORAGE_KEY),
        AsyncStorage.getItem(TOKEN_STORAGE_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY),
      ]);

      if (storedUser && storedToken) {
        console.log('💾 [LOAD] Found stored user and token');
        let user = JSON.parse(storedUser);
        console.log('💾 [LOAD] Parsed user:', {
          email: user.email,
          username: user.username || user.name,
          hasNamespaceRoles: !!user.namespaceRoles,
          userKeys: Object.keys(user)
        });
        
        // Attempt to hydrate namespaceRoles from DB
        try {
          console.log('💾 [LOAD] Attempting to hydrate namespaceRoles from DB...');
          user = await hydrateNamespaceRoles(user);
          console.log('💾 [LOAD] After hydration, hasNamespaceRoles:', !!user.namespaceRoles);
          
          // Save hydrated user back to storage
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
          console.log('💾 [LOAD] Saved hydrated user back to AsyncStorage');
        } catch (e) {
          console.log('💾 [LOAD] Hydration failed:', e);
        }
        
        const role = deriveRole(user);
        console.log('💾 [LOAD] Setting auth state with role:', role);
        
        setAuthState({
          user,
          token: storedToken,
          refreshToken: storedRefreshToken,
          isLoading: false,
          isAuthenticated: true,
          role,
        });
        
        console.log('💾 [LOAD] Load complete!');
      } else {
        console.log('💾 [LOAD] No stored auth found');
        setAuthState({
          user: null,
          token: null,
          refreshToken: null,
          isLoading: false,
          isAuthenticated: false,
          role: 'user',
        });
      }
    } catch (error) {
      console.error('❌ [LOAD] Error loading stored auth:', error);
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
      console.log('🔑 [LOGIN] Starting login process for user:', user.email);
      console.log('🔑 [LOGIN] User object keys:', Object.keys(user));
      console.log('🔑 [LOGIN] User has namespaceRoles?', !!(user as any).namespaceRoles);
      
      // Hydrate namespaceRoles for RBAC
      let hydratedUser = user as any;
      try { 
        console.log('🔑 [LOGIN] Attempting to hydrate namespaceRoles...');
        hydratedUser = await hydrateNamespaceRoles(user as any); 
        console.log('🔑 [LOGIN] Hydration complete. User has namespaceRoles?', !!hydratedUser.namespaceRoles);
      } catch (e) {
        console.log('🔑 [LOGIN] Hydration failed:', e);
      }

      const storagePromises = [
        AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(hydratedUser)),
        AsyncStorage.setItem(TOKEN_STORAGE_KEY, token),
      ];

      if (refreshToken) {
        storagePromises.push(AsyncStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken));
      }

      await Promise.all(storagePromises);
      
      console.log('🔑 [LOGIN] Setting auth state with role:', deriveRole(hydratedUser));

      setAuthState({
        user: hydratedUser,
        token,
        refreshToken: refreshToken || null,
        isLoading: false,
        isAuthenticated: true,
        role: deriveRole(hydratedUser),
      });
      
      console.log('🔑 [LOGIN] Login complete!');
    } catch (error) {
      console.error('❌ [LOGIN] Error storing auth:', error);
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
        role: 'user',
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
        role: 'user',
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
        role: deriveRole(user),
      }));
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user data');
    }
  };

  // Fetch and merge namespaceRoles for the current user from brmh-users
  async function hydrateNamespaceRoles(user: any): Promise<any> {
    try {
      console.log('🔄 [HYDRATE] Starting hydration for user:', {
        username: user.username,
        name: user.name,
        email: user.email
      });
      
      const res = await apiService.getUsers();
      console.log('📡 [HYDRATE] API response:', { success: res.success, dataIsArray: Array.isArray(res.data), dataLength: res.data?.length });
      
      if (!res.success || !Array.isArray(res.data)) {
        console.log('❌ [HYDRATE] Failed to get users from API');
        return user;
      }
      
      // Log first user from API for debugging
      if (res.data.length > 0) {
        console.log('📡 [HYDRATE] Sample user from API:', {
          username: res.data[0].username,
          email: res.data[0].email,
          hasNamespaceRoles: !!res.data[0].namespaceRoles,
          namespaceRolesType: typeof res.data[0].namespaceRoles
        });
      }
      
      const uname = (user.username || user.name || '').trim();
      const email = (user.email || '').trim().toLowerCase();
      const id = user.id || user.userId;
      const cognito = user.cognitoUsername || user.cognito_user || user.cognito || '';
      
      console.log('🔍 [HYDRATE] Looking for match with:', { uname, email, id, cognito });
      
      // Log all users to see what we're comparing against
      console.log('🔍 [HYDRATE] Available users in DB:', res.data.map((u: any) => ({
        username: u.username,
        email: u.email,
        cognitoUsername: u.cognitoUsername
      })));
      
      const match = res.data.find((u: any) => {
        const usernameMatch = u.username && String(u.username).trim() === uname;
        const nameMatch = u.name && String(u.name).trim() === uname;
        const emailMatch = u.email && String(u.email).trim().toLowerCase() === email;
        const idMatch = u.id && id && u.id === id;
        const userIdMatch = u.userId && id && u.userId === id;
        const cognitoMatch = cognito && (u.cognitoUsername === cognito || u.cognito_user === cognito);
        
        if (usernameMatch || nameMatch || emailMatch || idMatch || userIdMatch || cognitoMatch) {
          console.log('✅ [HYDRATE] Match found by:', {
            usernameMatch, nameMatch, emailMatch, idMatch, userIdMatch, cognitoMatch
          });
        }
        
        return usernameMatch || nameMatch || emailMatch || idMatch || userIdMatch || cognitoMatch;
      });
      
      if (!match) {
        console.log('❌ [HYDRATE] No matching user found in database');
        console.log('❌ [HYDRATE] Tried to match:', { uname, email, id, cognito });
        return user;
      }
      
      console.log('✅ [HYDRATE] Found matching user:', {
        username: match.username,
        email: match.email,
        hasNamespaceRoles: !!match.namespaceRoles
      });
      
      let roles = match.namespaceRoles || (match.metadata && match.metadata.namespaceRoles);
      console.log('📦 [HYDRATE] Raw namespaceRoles type:', typeof roles);
      console.log('📦 [HYDRATE] Raw namespaceRoles (first 200 chars):', 
        typeof roles === 'string' ? roles.substring(0, 200) : JSON.stringify(roles).substring(0, 200)
      );
      
      // Parse roles if it is a JSON string
      if (typeof roles === 'string') { 
        try { 
          roles = JSON.parse(roles); 
          console.log('✅ [HYDRATE] Successfully parsed JSON string');
        } catch (e) { 
          console.log('❌ [HYDRATE] Failed to parse JSON string:', e);
        } 
      }
      
      // Some records might store namespace objects at top-level (e.g., match.projectmanagement)
      // Detect and merge those into roles object to normalize
      const topLevelPM = (match as any).projectmanagement;
      if (topLevelPM) {
        console.log('📦 [HYDRATE] Found top-level projectmanagement:', topLevelPM);
        const normalized = roles && typeof roles === 'object' ? { ...roles } : {} as any;
        normalized.projectmanagement = topLevelPM;
        roles = normalized;
      }
      
      if (!roles) {
        console.log('❌ [HYDRATE] No roles found after parsing');
        return user;
      }
      
      console.log('✅ [HYDRATE] Final namespaceRoles structure:', JSON.stringify(roles, null, 2));
      
      const merged = { ...user } as any;
      merged.namespaceRoles = roles;
      
      console.log('✅ [HYDRATE] Hydration complete. User now has namespaceRoles.');
      return merged;
    } catch (error) {
      console.log('❌ [HYDRATE] Error during hydration:', error);
      return user;
    }
  }

  // Role derivation from namespaceRoles; default 'user'
  function deriveRole(user: User | null): 'admin' | 'manager' | 'user' {
    if (!user) return 'user';
    // Fallback to user.role if present
    const r = (user as any).role;
    if (r === 'admin' || r === 'manager' || r === 'user') return r;
    return 'user';
  }

  const isAdmin = () => authState.role === 'admin';
  const isManager = () => authState.role === 'manager';
  const canManage = () => isAdmin() || isManager();
  const canAssign = () => isAdmin() || isManager();

  function roleForNamespace(ns: string): 'admin' | 'manager' | 'user' {
    console.log(`🔐 [ROLE] Checking role for namespace: ${ns}`);
    const u: any = authState.user || {};
    console.log('👤 [ROLE] User:', { 
      username: u.username || u.name, 
      email: u.email,
      hasNamespaceRoles: !!u.namespaceRoles 
    });
    console.log('👤 [ROLE] Full user object keys:', Object.keys(u));
    console.log('👤 [ROLE] User.namespaceRoles value:', u.namespaceRoles);
    console.log('👤 [ROLE] User.metadata value:', u.metadata);
    
    // Prefer explicit namespaceRoles if present
    let nr: any = u.namespaceRoles || (u.metadata && u.metadata.namespaceRoles) || null;
    console.log('📦 [ROLE] NamespaceRoles type:', typeof nr);
    console.log('📦 [ROLE] NamespaceRoles value:', nr);
    console.log('📦 [ROLE] NamespaceRoles is null?', nr === null);
    console.log('📦 [ROLE] NamespaceRoles is truthy?', !!nr);
    
    // If stored as JSON string, parse it
    if (typeof nr === 'string') {
      try { 
        nr = JSON.parse(nr); 
        console.log('✅ [ROLE] Parsed JSON string');
      } catch (e) { 
        console.log('❌ [ROLE] Failed to parse JSON string:', e);
      }
    }
    
    let role: string | undefined;
    if (nr && typeof nr === 'object' && nr !== null) {
      console.log('📦 [ROLE] NamespaceRoles keys:', Object.keys(nr));
      
      // If Dynamo attribute encoded (M,S,L), unwrap top-level M first
      const base = (nr as any)?.M && typeof (nr as any).M === 'object' ? (nr as any).M : nr;
      console.log('📦 [ROLE] Base object keys:', Object.keys(base));
      
      const node = base[ns];
      console.log(`📦 [ROLE] Node for ${ns}:`, node ? JSON.stringify(node, null, 2) : 'null');
      
      if (node) {
        // Try strict Dynamo form first
        if (node?.M?.role?.S) {
          role = node.M.role.S;
          console.log(`✅ [ROLE] Found role (DynamoDB format): ${role}`);
        }
        // Try plain form
        else if (node?.role) {
          role = node.role;
          console.log(`✅ [ROLE] Found role (plain format): ${role}`);
        }
        
        // Infer from permissions if role missing
        const permsDyn = node?.M?.permissions?.L?.map((p: any) => p?.S).filter(Boolean) || [];
        const permsPlain = Array.isArray(node?.permissions) ? node.permissions : [];
        const perms = (permsDyn.length ? permsDyn : permsPlain) as string[];
        console.log(`📋 [ROLE] Permissions for ${ns}:`, perms);
        
        if (!role && perms.includes('crud:all') && perms.includes('assign:users')) {
          role = 'admin';
          console.log(`✅ [ROLE] Inferred admin from permissions`);
        }
        else if (!role && perms.includes('crud:all')) {
          role = 'manager';
          console.log(`✅ [ROLE] Inferred manager from permissions`);
        }
      } else {
        console.log(`❌ [ROLE] No node found for namespace: ${ns}`);
      }
    } else {
      console.log('❌ [ROLE] NamespaceRoles is not an object');
    }
    
    // Role is now determined purely by namespaceRoles from database
    // No hardcoded admin assignments
    const finalRole = (role === 'admin' || role === 'manager') ? role as any : 'user';
    console.log(`🎯 [ROLE] Final role for ${ns}: ${finalRole}`);
    return finalRole;
  }

  function permissionsForRole(role: 'admin' | 'manager' | 'user'): string[] {
    if (role === 'admin' || role === 'manager') {
      return ['crud:all', 'assign:users', 'read:all'];
    }
    return ['read:all'];
  }

  function hasPermission(ns: string, perm: string): boolean {
    const role = roleForNamespace(ns);
    const perms = permissionsForRole(role);
    if (perm === 'crud' || perm === 'crud:all') return perms.includes('crud:all');
    if (perm === 'assign:users') return perms.includes('assign:users');
    if (perm === 'read' || perm === 'read:all') return perms.includes('read:all');
    return false;
  }

  // Force refresh roles from DB for the current user
  async function refreshNamespaceRoles(): Promise<void> {
    if (!authState.user) return;
    try {
      const merged = await hydrateNamespaceRoles(authState.user as any);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(merged));
      setAuthState(prev => ({ ...prev, user: merged, role: deriveRole(merged) }));
    } catch (e) {
      // no-op
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        updateUser,
        isAdmin,
        isManager,
        canManage,
        canAssign,
        roleForNamespace,
        hasPermission,
        refreshNamespaceRoles,
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


