import * as AuthSession from 'expo-auth-session';
import { getClientIds, GOOGLE_SCOPES, storeTokens, getStoredTokens } from './googleAuth';

// Custom OAuth implementation for better Expo Go compatibility
export const customGoogleAuth = async () => {
  console.log('🔧 [Custom OAuth] ===== Starting Custom OAuth Flow =====');
  
  const clientIds = getClientIds();
  const clientId = clientIds.expo || clientIds.android || clientIds.ios;
  const redirectUri = 'https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT';
  
  console.log('🔧 [Custom OAuth] Client ID:', clientId);
  console.log('🔧 [Custom OAuth] Redirect URI:', redirectUri);
  console.log('🔧 [Custom OAuth] Scopes:', GOOGLE_SCOPES);
  
  try {
    // Use AuthSession with simplified configuration
    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: GOOGLE_SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      usePKCE: false,
      additionalParameters: {
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
      },
    });
    
    console.log('🔧 [Custom OAuth] Request created:', request.url);
    
    const result = await request.promptAsync({
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    });
    
    console.log('🔧 [Custom OAuth] Result:', result);
    console.log('🔧 [Custom OAuth] Result type:', result.type);
    console.log('🔧 [Custom OAuth] Result params:', result.params);
    
    if (result.type === 'success' && result.params?.access_token) {
      console.log('✅ [Custom OAuth] Success!');
      console.log('✅ [Custom OAuth] Access token found!');
      console.log('✅ [Custom OAuth] Expires in:', result.params.expires_in);
      
      const expiresIn = Number(result.params.expires_in) || 3600;
      await storeTokens({
        accessToken: result.params.access_token,
        expiresAt: Date.now() + (expiresIn * 1000),
      });
      
      console.log('💾 [Custom OAuth] Tokens stored successfully');
      return { success: true, accessToken: result.params.access_token };
    } else if (result.type === 'cancel') {
      console.log('🚫 [Custom OAuth] User cancelled');
      return { success: false, error: 'User cancelled' };
    } else if (result.type === 'dismiss') {
      console.log('🚫 [Custom OAuth] OAuth dismissed');
      return { success: false, error: 'OAuth dismissed' };
    } else if (result.type === 'error') {
      console.error('❌ [Custom OAuth] OAuth error:', result.error);
      return { success: false, error: `OAuth error: ${result.error?.message || 'Unknown error'}` };
    } else {
      console.error('❌ [Custom OAuth] Unknown result type:', result.type);
      return { success: false, error: `Unknown result type: ${result.type}` };
    }
  } catch (error) {
    console.error('❌ [Custom OAuth] Exception occurred:', error);
    return { success: false, error: error.message };
  }
};

// Alternative method using AuthSession with different configuration
export const alternativeGoogleAuth = async () => {
  console.log('🔧 [Alternative OAuth] ===== Starting Alternative OAuth Flow =====');
  
  const clientIds = getClientIds();
  const clientId = clientIds.expo || clientIds.android || clientIds.ios;
  const redirectUri = 'https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT';
  
  console.log('🔧 [Alternative OAuth] Client ID:', clientId);
  console.log('🔧 [Alternative OAuth] Redirect URI:', redirectUri);
  
  try {
    // Use AuthSession with different configuration - try code flow
    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: GOOGLE_SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      additionalParameters: {
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
      },
    });
    
    console.log('🔧 [Alternative OAuth] Request created:', request.url);
    console.log('🔧 [Alternative OAuth] Code verifier:', request.codeVerifier);
    
    const result = await request.promptAsync({
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
    });
    
    console.log('🔧 [Alternative OAuth] Result:', result);
    console.log('🔧 [Alternative OAuth] Result type:', result.type);
    console.log('🔧 [Alternative OAuth] Result params:', result.params);
    
    if (result.type === 'success') {
      if (result.params?.code) {
        console.log('✅ [Alternative OAuth] Authorization code received!');
        console.log('🔧 [Alternative OAuth] Exchanging code for tokens...');
        
        // Exchange code for tokens
        const { exchangeCodeAsync } = await import('./googleAuth');
        const tokenResponse = await exchangeCodeAsync(
          result.params.code,
          clientId,
          request.codeVerifier
        );
        
        console.log('✅ [Alternative OAuth] Token exchange successful!');
        await storeTokens({
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt: Date.now() + (tokenResponse.expires_in * 1000),
        });
        
        console.log('💾 [Alternative OAuth] Tokens stored successfully');
        return { success: true, accessToken: tokenResponse.access_token };
      } else if (result.params?.access_token) {
        console.log('✅ [Alternative OAuth] Direct access token received!');
        
        const expiresIn = Number(result.params.expires_in) || 3600;
        await storeTokens({
          accessToken: result.params.access_token,
          expiresAt: Date.now() + (expiresIn * 1000),
        });
        
        console.log('💾 [Alternative OAuth] Tokens stored successfully');
        return { success: true, accessToken: result.params.access_token };
      } else {
        console.error('❌ [Alternative OAuth] No tokens or code in response');
        return { success: false, error: 'No tokens or code received' };
      }
    } else if (result.type === 'cancel') {
      console.log('🚫 [Alternative OAuth] User cancelled');
      return { success: false, error: 'User cancelled' };
    } else if (result.type === 'dismiss') {
      console.log('🚫 [Alternative OAuth] OAuth dismissed');
      return { success: false, error: 'OAuth dismissed' };
    } else if (result.type === 'error') {
      console.error('❌ [Alternative OAuth] OAuth error:', result.error);
      return { success: false, error: `OAuth error: ${result.error?.message || 'Unknown error'}` };
    } else {
      console.error('❌ [Alternative OAuth] Unknown result type:', result.type);
      return { success: false, error: `Unknown result type: ${result.type}` };
    }
  } catch (error) {
    console.error('❌ [Alternative OAuth] Exception:', error);
    return { success: false, error: error.message };
  }
};
