// ─────────────────────────────────────────────────────────────────────────────
// Firebase setup — paste your own project's values here. README.md has the step-by-step.
//
//  1. https://console.firebase.google.com → Add project
//  2. Build → Authentication → Sign-in method → enable BOTH "Anonymous" and "Google"
//  3. Build → Firestore Database → Create database → Rules: paste firestore.rules
//  4. Project settings → Your apps → Web app (</>) → copy the config into `firebaseConfig`
//  5. For Google sign-in on the phone: Authentication → Sign-in method → Google →
//     "Web SDK configuration" → copy the Web client ID into `googleWebClientId`,
//     then register an Android app (package com.thamizh.cookbook + SHA-1) and save
//     its google-services.json in the project root.
//
// Until `firebaseConfig` is filled in, the app runs in local-only mode (everything is still
// saved on the phone). Until `googleWebClientId` is filled in, data is kept under an
// anonymous per-device account.
// ─────────────────────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: 'PASTE_YOUR_API_KEY',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:0000000000000000',
};

/** OAuth 2.0 "Web client" ID from Firebase → Authentication → Google → Web SDK configuration. */
export const googleWebClientId = 'PASTE_YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';

export function isFirebaseConfigured(): boolean {
  return !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('PASTE') && !!firebaseConfig.projectId && firebaseConfig.projectId !== 'your-project';
}

export function isGoogleConfigured(): boolean {
  return isFirebaseConfigured() && !!googleWebClientId && !googleWebClientId.startsWith('PASTE');
}
