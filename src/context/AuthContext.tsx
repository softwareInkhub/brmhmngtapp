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
      console.log('🔑 [LOGIN] User object:', user);
      console.log('🔑 [LOGIN] User object keys:', Object.keys(user));
      console.log('🔑 [LOGIN] User has namespaceRoles?', !!(user as any).namespaceRoles);
      
      // Hydrate namespaceRoles for RBAC
      let hydratedUser = user as any;
      try { 
        console.log('🔑 [LOGIN] Attempting to hydrate namespaceRoles...');
        console.log('🔑 [LOGIN] User data being sent to hydration:', {
          username: user.name,
          email: user.email,
          id: (user as any).id
        });
        hydratedUser = await hydrateNamespaceRoles(user as any); 
        console.log('🔑 [LOGIN] Hydration complete. User has namespaceRoles?', !!hydratedUser.namespaceRoles);
        console.log('🔑 [LOGIN] Hydrated user object keys:', Object.keys(hydratedUser));
        if (hydratedUser.namespaceRoles) {
          console.log('🔑 [LOGIN] NamespaceRoles content:', JSON.stringify(hydratedUser.namespaceRoles, null, 2));
        }
      } catch (e) {
        console.log('❌ [LOGIN] Hydration failed with error:', e);
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
      console.log('🔄 [HYDRATE] ==========================================');
      console.log('🔄 [HYDRATE] Starting hydration for user:', {
        username: user.username,
        name: user.name,
        email: user.email,
        id: user.id,
        allKeys: Object.keys(user)
      });
      
      const res = await apiService.getUsers();
      console.log('📡 [HYDRATE] API response:', { 
        success: res.success, 
        dataIsArray: Array.isArray(res.data), 
        dataLength: res.data?.length,
        error: res.error
      });
      
      if (!res.success || !Array.isArray(res.data)) {
        console.log('❌ [HYDRATE] Failed to get users from API');
        console.log('❌ [HYDRATE] Response error:', res.error);
        console.log('❌ [HYDRATE] Response data:', res.data);
        return user;
      }
      
      console.log('✅ [HYDRATE] Successfully fetched', res.data.length, 'users from API');
      
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
      console.log('🔍 [HYDRATE] Available users in DB (' + res.data.length + ' users):');
      res.data.forEach((u: any, index: number) => {
        console.log(`  User ${index + 1}:`, {
          username: u.username,
          email: u.email,
          cognitoUsername: u.cognitoUsername,
          hasNamespaceRoles: !!u.namespaceRoles
        });
      });
      
      const match = res.data.find((u: any) => {
        // Exact matches
        const usernameMatch = u.username && String(u.username).trim() === uname;
        const nameMatch = u.name && String(u.name).trim() === uname;
        const emailMatch = u.email && String(u.email).trim().toLowerCase() === email;
        const idMatch = u.id && id && u.id === id;
        const userIdMatch = u.userId && id && u.userId === id;
        const cognitoMatch = cognito && (u.cognitoUsername === cognito || u.cognito_user === cognito);
        
        // Flexible matches - email prefix or username contains
        const emailPrefix = email.split('@')[0]; // e.g., "adityabot69" from "adityabot69@gmail.com"
        const dbEmailPrefix = u.email ? String(u.email).split('@')[0].toLowerCase() : '';
        const emailPrefixMatch = emailPrefix && dbEmailPrefix && emailPrefix === dbEmailPrefix;
        
        // Check if username/cognitoUsername starts with the login username (case insensitive)
        const usernameStartsWith = u.username && uname && 
          String(u.username).toLowerCase().replace(/[_\s]/g, '').startsWith(uname.toLowerCase().replace(/[_\s]/g, ''));
        const cognitoStartsWith = u.cognitoUsername && uname && 
          String(u.cognitoUsername).toLowerCase().replace(/[_\s]/g, '').startsWith(uname.toLowerCase().replace(/[_\s]/g, ''));
        
        if (usernameMatch || nameMatch || emailMatch || idMatch || userIdMatch || cognitoMatch || emailPrefixMatch || usernameStartsWith || cognitoStartsWith) {
          console.log('✅ [HYDRATE] Match found for:', {
            dbUser: { username: u.username, email: u.email, cognitoUsername: u.cognitoUsername },
            matchedBy: {
              usernameMatch, nameMatch, emailMatch, idMatch, userIdMatch, cognitoMatch,
              emailPrefixMatch, usernameStartsWith, cognitoStartsWith
            }
          });
        }
        
        // Prioritize exact email match first, then other matches
        return emailMatch || emailPrefixMatch || usernameMatch || nameMatch || idMatch || userIdMatch || cognitoMatch || usernameStartsWith || cognitoStartsWith;
      });
      
      if (!match) {
        console.log('❌ [HYDRATE] ==========================================');
        console.log('❌ [HYDRATE] NO MATCHING USER FOUND IN DATABASE!');
        console.log('❌ [HYDRATE] Tried to match with:');
        console.log('  - uname:', uname);
        console.log('  - email:', email);
        console.log('  - id:', id);
        console.log('  - cognito:', cognito);
        console.log('❌ [HYDRATE] ==========================================');
        return user;
      }
      
      console.log('✅ [HYDRATE] Found matching user:', {
        username: match.username,
        email: match.email,
        hasNamespaceRoles: !!match.namespaceRoles
      });
      
      let roles = match.namespaceRoles || (match.metadata && match.metadata.namespaceRoles);
      console.log('📦 [HYDRATE] Raw namespaceRoles type:', typeof roles);
      console.log('📦 [HYDRATE] Raw namespaceRoles value:', roles);
      if (roles) {
        console.log('📦 [HYDRATE] Raw namespaceRoles (first 200 chars):', 
          typeof roles === 'string' ? roles.substring(0, 200) : JSON.stringify(roles).substring(0, 200)
        );
      } else {
        console.log('❌ [HYDRATE] namespaceRoles is NULL/UNDEFINED in database!');
        console.log('📦 [HYDRATE] Match object keys:', Object.keys(match));
        console.log('📦 [HYDRATE] Full match object:', JSON.stringify(match, null, 2));
      }
      
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
      
      console.log('✅✅✅ [HYDRATE] HYDRATION COMPLETE! User now has namespaceRoles.');
      console.log('✅✅✅ [HYDRATE] Merged user keys:', Object.keys(merged));
      console.log('✅✅✅ [HYDRATE] Has namespaceRoles?', !!merged.namespaceRoles);
      console.log('🔄 [HYDRATE] ==========================================');
      return merged;
    } catch (error) {
      console.log('❌❌❌ [HYDRATE] ERROR during hydration:', error);
      console.log('❌ [HYDRATE] Error stack:', error instanceof Error ? error.stack : 'N/A');
      console.log('🔄 [HYDRATE] ==========================================');
      return user;
    }
  }

  // Role derivation from namespaceRoles; default 'user'
  function deriveRole(user: User | null): 'admin' | 'manager' | 'user' {
    if (!user) return 'user';
    
    console.log('🔍 [DERIVE_ROLE] Starting role derivation for user:', {
      username: (user as any).username || (user as any).name,
      email: (user as any).email,
      hasNamespaceRoles: !!(user as any).namespaceRoles
    });
    
    // Check if user is admin in either 'localhost' or 'projectmanagement' namespace
    const namespacesToCheck = ['localhost', 'projectmanagement'];
    const u: any = user;
    let nr: any = u.namespaceRoles || (u.metadata && u.metadata.namespaceRoles) || null;
    
    // Parse if stored as JSON string
    if (typeof nr === 'string') {
      try { 
        nr = JSON.parse(nr);
        console.log('🔍 [DERIVE_ROLE] Parsed namespaceRoles from JSON string');
      } catch (e) { 
        console.log('🔍 [DERIVE_ROLE] Failed to parse JSON string:', e);
      }
    }
    
    if (nr && typeof nr === 'object' && nr !== null) {
      console.log('🔍 [DERIVE_ROLE] NamespaceRoles available, checking namespaces...');
      
      // Unwrap DynamoDB M wrapper if present
      const base = (nr as any)?.M && typeof (nr as any).M === 'object' ? (nr as any).M : nr;
      console.log('🔍 [DERIVE_ROLE] Available namespaces:', Object.keys(base));
      
      // Check both localhost and projectmanagement namespaces for admin role
      for (const namespace of namespacesToCheck) {
        const node = base[namespace];
        
        if (node) {
          console.log(`🔍 [DERIVE_ROLE] Checking namespace: ${namespace}`);
          
          let role: string | undefined;
          
          // Try strict Dynamo form first
          if (node?.M?.role?.S) {
            role = node.M.role.S;
            console.log(`🔍 [DERIVE_ROLE] Found role (DynamoDB format) in ${namespace}: ${role}`);
          }
          // Try plain form
          else if (node?.role) {
            role = node.role;
            console.log(`🔍 [DERIVE_ROLE] Found role (plain format) in ${namespace}: ${role}`);
          }
          
          // If admin role found in this namespace, return admin immediately
          if (role === 'admin') {
            console.log(`✅ [DERIVE_ROLE] User is ADMIN in ${namespace} namespace`);
            return 'admin';
          }
          
          // Check for manager role (lower priority than admin)
          if (role === 'manager') {
            console.log(`✅ [DERIVE_ROLE] User is MANAGER in ${namespace} namespace`);
            // Don't return yet, continue checking for admin in other namespaces
          }
          
          // Infer from permissions if role missing
          const permsDyn = node?.M?.permissions?.L?.map((p: any) => p?.S).filter(Boolean) || [];
          const permsPlain = Array.isArray(node?.permissions) ? node.permissions : [];
          const perms = (permsDyn.length ? permsDyn : permsPlain) as string[];
          
          if (perms.length > 0) {
            console.log(`🔍 [DERIVE_ROLE] Permissions in ${namespace}:`, perms);
            
            if (perms.includes('crud:all') && perms.includes('assign:users')) {
              console.log(`✅ [DERIVE_ROLE] User has ADMIN permissions in ${namespace} namespace`);
              return 'admin';
            }
            else if (perms.includes('crud:all')) {
              console.log(`✅ [DERIVE_ROLE] User has MANAGER permissions in ${namespace} namespace`);
              // Don't return yet, continue checking for admin in other namespaces
            }
          }
        }
      }
    }
    
    // Check for manager role after checking all namespaces for admin
    if (nr && typeof nr === 'object' && nr !== null) {
      const base = (nr as any)?.M && typeof (nr as any).M === 'object' ? (nr as any).M : nr;
      for (const namespace of namespacesToCheck) {
        const node = base[namespace];
        if (node) {
          let role: string | undefined;
          if (node?.M?.role?.S) role = node.M.role.S;
          else if (node?.role) role = node.role;
          
          if (role === 'manager') {
            console.log(`✅ [DERIVE_ROLE] User is MANAGER in ${namespace} namespace (final)`);
            return 'manager';
          }
          
          // Check permissions for manager
          const permsDyn = node?.M?.permissions?.L?.map((p: any) => p?.S).filter(Boolean) || [];
          const permsPlain = Array.isArray(node?.permissions) ? node.permissions : [];
          const perms = (permsDyn.length ? permsDyn : permsPlain) as string[];
          
          if (perms.includes('crud:all')) {
            console.log(`✅ [DERIVE_ROLE] User has MANAGER permissions in ${namespace} namespace (final)`);
            return 'manager';
          }
        }
      }
    }
    
    // Fallback to user.role if present
    const r = (user as any).role;
    if (r === 'admin' || r === 'manager' || r === 'user') {
      console.log('🔍 [DERIVE_ROLE] Using fallback role from user.role:', r);
      return r;
    }
    
    console.log('🔍 [DERIVE_ROLE] No admin/manager role found, defaulting to user');
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


