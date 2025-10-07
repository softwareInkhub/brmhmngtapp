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
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const storeTokens = async (tokens: GoogleTokens) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
};

export const clearTokens = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY);
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
  // Using AuthSession to fetch token via Google endpoints
  const redirectUri = makeRedirectUri({ useProxy: true });
  const params = new URLSearchParams({
    client_id: clientId,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code_verifier: codeVerifier || '',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error('Failed to exchange OAuth code');
  return res.json();
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


