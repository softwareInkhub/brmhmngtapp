import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const STORAGE_KEY = '@google_oauth_tokens';

export type GoogleTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

export const getStoredTokens = async (): Promise<GoogleTokens | null> => {
  console.log('💾 [Token Storage] Getting stored tokens...');
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    const tokens = JSON.parse(raw);
    console.log('💾 [Token Storage] Found stored tokens:', {
      hasAccessToken: !!tokens.accessToken,
      hasRefreshToken: !!tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      isExpired: tokens.expiresAt ? Date.now() >= tokens.expiresAt : false
    });
    return tokens;
  } else {
    console.log('💾 [Token Storage] No stored tokens found');
    return null;
  }
};

export const storeTokens = async (tokens: GoogleTokens) => {
  console.log('💾 [Token Storage] Storing tokens...');
  console.log('💾 [Token Storage] Token data:', {
    hasAccessToken: !!tokens.accessToken,
    hasRefreshToken: !!tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    expiresIn: tokens.expiresAt ? Math.round((tokens.expiresAt - Date.now()) / 1000) : 'Unknown'
  });
  
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  console.log('💾 [Token Storage] Tokens stored successfully');
};

export const clearTokens = async () => {
  console.log('💾 [Token Storage] Clearing stored tokens...');
  await AsyncStorage.removeItem(STORAGE_KEY);
  console.log('💾 [Token Storage] Tokens cleared successfully');
};

export const GOOGLE_SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

export const getClientIds = () => {
  const extra = (Constants.expoConfig as any)?.extra || {};
  return {
    expo: extra.googleExpoClientId,
    ios: extra.googleIosClientId,
    android: extra.googleAndroidClientId,
  };
};

export const exchangeCodeAsync = async (code: string, clientId: string, codeVerifier?: string) => {
  console.log('🔄 [Token Exchange] ===== Starting Token Exchange =====');
  console.log('🔄 [Token Exchange] Authorization Code:', code);
  console.log('🔄 [Token Exchange] Client ID:', clientId);
  console.log('🔄 [Token Exchange] Code Verifier:', codeVerifier);
  console.log('🔄 [Token Exchange] Code Verifier Length:', codeVerifier?.length || 0);
  
  // Use the same redirect URI that was used in the authorization request
  const redirectUri = 'https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT';
  
  const params = new URLSearchParams({
    client_id: clientId,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code_verifier: codeVerifier || '',
  });
  
  console.log('🔄 [Token Exchange] Request Parameters:');
  console.log('🔄 [Token Exchange] - client_id:', clientId);
  console.log('🔄 [Token Exchange] - code:', code.substring(0, 20) + '...');
  console.log('🔄 [Token Exchange] - grant_type: authorization_code');
  console.log('🔄 [Token Exchange] - redirect_uri:', redirectUri);
  console.log('🔄 [Token Exchange] - code_verifier:', codeVerifier ? 'Present' : 'Missing');
  
  const requestBody = params.toString();
  console.log('🔄 [Token Exchange] Request Body Length:', requestBody.length);
  
  try {
    console.log('🔄 [Token Exchange] Making request to Google token endpoint...');
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: requestBody,
    });
    
    console.log('🔄 [Token Exchange] Response Status:', res.status);
    console.log('🔄 [Token Exchange] Response Headers:', Object.fromEntries(res.headers.entries()));
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ [Token Exchange] Request Failed:');
      console.error('❌ [Token Exchange] Status:', res.status);
      console.error('❌ [Token Exchange] Status Text:', res.statusText);
      console.error('❌ [Token Exchange] Error Response:', errorText);
      
      // Try to parse error as JSON
      try {
        const errorJson = JSON.parse(errorText);
        console.error('❌ [Token Exchange] Parsed Error:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.error('❌ [Token Exchange] Could not parse error as JSON');
      }
      
      throw new Error(`Failed to exchange OAuth code: ${res.status} - ${errorText}`);
    }
    
    const tokenData = await res.json();
    console.log('✅ [Token Exchange] Success!');
    console.log('✅ [Token Exchange] Token Data Keys:', Object.keys(tokenData));
    console.log('✅ [Token Exchange] Access Token Present:', !!tokenData.access_token);
    console.log('✅ [Token Exchange] Refresh Token Present:', !!tokenData.refresh_token);
    console.log('✅ [Token Exchange] Expires In:', tokenData.expires_in);
    console.log('✅ [Token Exchange] Token Type:', tokenData.token_type);
    console.log('✅ [Token Exchange] Scope:', tokenData.scope);
    
    return tokenData;
  } catch (error) {
    console.error('❌ [Token Exchange] Exception occurred:');
    console.error('❌ [Token Exchange] Error Type:', error.constructor.name);
    console.error('❌ [Token Exchange] Error Message:', error.message);
    console.error('❌ [Token Exchange] Full Error:', error);
    throw error;
  }
};

export const refreshAccessToken = async (refreshToken: string, clientId: string) => {
  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error('Failed to refresh token');
  return res.json();
};

