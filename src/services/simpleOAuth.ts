import * as AuthSession from 'expo-auth-session';
import { getClientIds, GOOGLE_SCOPES, storeTokens } from './googleAuth';

// Simple OAuth implementation that should work better with Expo Go
export const simpleGoogleAuth = async () => {
  console.log('🔧 [Simple OAuth] ===== Starting Simple OAuth Flow =====');
  
  const clientIds = getClientIds();
  const clientId = clientIds.expo || clientIds.android || clientIds.ios;
  const redirectUri = 'https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT';
  
  console.log('🔧 [Simple OAuth] Client ID:', clientId);
  console.log('🔧 [Simple OAuth] Redirect URI:', redirectUri);
  console.log('🔧 [Simple OAuth] Scopes:', GOOGLE_SCOPES);
  
  try {
    // Create a very simple OAuth request
    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: GOOGLE_SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      usePKCE: false,
      // Minimal additional parameters
      additionalParameters: {},
    });
    
    console.log('🔧 [Simple OAuth] Request created:', request.url);
    
    const result = await request.promptAsync({
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    });
    
    console.log('🔧 [Simple OAuth] Result:', result);
    console.log('🔧 [Simple OAuth] Result type:', result.type);
    console.log('🔧 [Simple OAuth] Result params:', result.params);
    
    if (result.type === 'success' && result.params?.access_token) {
      console.log('✅ [Simple OAuth] Success!');
      console.log('✅ [Simple OAuth] Access token found!');
      console.log('✅ [Simple OAuth] Expires in:', result.params.expires_in);
      
      const expiresIn = Number(result.params.expires_in) || 3600;
      await storeTokens({
        accessToken: result.params.access_token,
        expiresAt: Date.now() + (expiresIn * 1000),
      });
      
      console.log('💾 [Simple OAuth] Tokens stored successfully');
      return { success: true, accessToken: result.params.access_token };
    } else if (result.type === 'cancel') {
      console.log('🚫 [Simple OAuth] User cancelled');
      return { success: false, error: 'User cancelled' };
    } else if (result.type === 'dismiss') {
      console.log('🚫 [Simple OAuth] OAuth dismissed');
      return { success: false, error: 'OAuth dismissed' };
    } else if (result.type === 'error') {
      console.error('❌ [Simple OAuth] OAuth error:', result.error);
      return { success: false, error: `OAuth error: ${result.error?.message || 'Unknown error'}` };
    } else {
      console.error('❌ [Simple OAuth] Unknown result type:', result.type);
      return { success: false, error: `Unknown result type: ${result.type}` };
    }
  } catch (error) {
    console.error('❌ [Simple OAuth] Exception occurred:', error);
    return { success: false, error: error.message };
  }
};

// Even simpler OAuth with minimal scopes
export const minimalGoogleAuth = async () => {
  console.log('🔧 [Minimal OAuth] ===== Starting Minimal OAuth Flow =====');
  
  const clientIds = getClientIds();
  const clientId = clientIds.expo || clientIds.android || clientIds.ios;
  const redirectUri = 'https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT';
  
  // Use minimal scopes
  const minimalScopes = ['https://www.googleapis.com/auth/calendar'];
  
  console.log('🔧 [Minimal OAuth] Client ID:', clientId);
  console.log('🔧 [Minimal OAuth] Redirect URI:', redirectUri);
  console.log('🔧 [Minimal OAuth] Scopes:', minimalScopes);
  
  try {
    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: minimalScopes,
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      usePKCE: false,
      additionalParameters: {},
    });
    
    console.log('🔧 [Minimal OAuth] Request created:', request.url);
    
    const result = await request.promptAsync({
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    });
    
    console.log('🔧 [Minimal OAuth] Result:', result);
    
    if (result.type === 'success' && result.params?.access_token) {
      console.log('✅ [Minimal OAuth] Success!');
      
      const expiresIn = Number(result.params.expires_in) || 3600;
      await storeTokens({
        accessToken: result.params.access_token,
        expiresAt: Date.now() + (expiresIn * 1000),
      });
      
      console.log('💾 [Minimal OAuth] Tokens stored successfully');
      return { success: true, accessToken: result.params.access_token };
    } else {
      console.error('❌ [Minimal OAuth] Failed:', result);
      return { success: false, error: `Result type: ${result.type}` };
    }
  } catch (error) {
    console.error('❌ [Minimal OAuth] Exception:', error);
    return { success: false, error: error.message };
  }
};
