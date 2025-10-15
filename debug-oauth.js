#!/usr/bin/env node

/**
 * OAuth Configuration Debug Script
 * Run this to verify your Google OAuth setup
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Google OAuth Configuration Debug\n');

// Check app.json
const appJsonPath = path.join(__dirname, 'app.json');
if (fs.existsSync(appJsonPath)) {
  const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  console.log('📱 App Configuration:');
  console.log(`   Name: ${appConfig.expo.name}`);
  console.log(`   Slug: ${appConfig.expo.slug}`);
  
  if (appConfig.expo.extra) {
    console.log('\n🔑 OAuth Client IDs:');
    console.log(`   Expo: ${appConfig.expo.extra.googleExpoClientId || '❌ Missing'}`);
    console.log(`   iOS: ${appConfig.expo.extra.googleIosClientId || '❌ Missing'}`);
    console.log(`   Android: ${appConfig.expo.extra.googleAndroidClientId || '❌ Missing'}`);
  } else {
    console.log('❌ No OAuth client IDs found in app.json');
  }
} else {
  console.log('❌ app.json not found');
}

// Expected redirect URI
console.log('\n🌐 Expected Redirect URI:');
console.log('   https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT');

console.log('\n📋 Google Console Checklist:');
console.log('   ✅ OAuth 2.0 Client ID created');
console.log('   ✅ Authorized redirect URI added: https://auth.expo.io/@adityaexpo12/BRMHMANAGEMENT');
console.log('   ✅ Google Calendar API enabled');
console.log('   ✅ Client ID matches app.json');

console.log('\n🔧 Common Issues & Solutions:');
console.log('   1. redirect_uri_mismatch: Ensure exact match in Google Console');
console.log('   2. invalid_client: Use correct client ID for Expo');
console.log('   3. access_denied: Add test users or verify app in Google Console');
console.log('   4. API not enabled: Enable Google Calendar API in Google Console');

console.log('\n🚀 Testing Steps:');
console.log('   1. Run: npx expo start');
console.log('   2. Open in Expo Go app');
console.log('   3. Navigate to Calendar screen');
console.log('   4. Tap "Connect Google Calendar"');
console.log('   5. Check console logs for OAuth debug info');

console.log('\n📱 Expo Commands:');
console.log('   npx expo whoami          # Check your Expo username');
console.log('   npx expo config          # View app configuration');
console.log('   npx expo start --clear   # Clear cache and start');
