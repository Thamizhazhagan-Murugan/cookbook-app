// ─────────────────────────────────────────────────────────────────────────────
// Firebase setup — paste your own project's web config here.
//
// 1. Go to https://console.firebase.google.com → Add project
// 2. Build → Authentication → Get started → Sign-in method → enable "Anonymous"
// 3. Build → Firestore Database → Create database (production mode) → pick a region
// 4. Project settings (gear) → Your apps → Web app (</>) → Register → copy the config below
// 5. Firestore → Rules → paste the rules from README.md (each user can only read/write their own data)
//
// Until this is filled in, the app runs in local-only mode (everything is still saved on the phone).
// ─────────────────────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: 'PASTE_YOUR_API_KEY',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  storageBucket: 'your-project.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:0000000000000000',
};

export function isFirebaseConfigured(): boolean {
  return !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('PASTE') && !!firebaseConfig.projectId && firebaseConfig.projectId !== 'your-project';
}
