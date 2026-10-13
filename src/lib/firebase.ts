// Firebase bootstrap. Returns null when src/firebaseConfig.ts has not been filled in,
// so the app keeps working in local-only mode.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as FbAuth from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';

import { firebaseConfig, isFirebaseConfigured } from '@/firebaseConfig';

export type Firebase = { app: FirebaseApp; auth: FbAuth.Auth; db: Firestore };

let instance: Firebase | null | undefined;

export function getFirebase(): Firebase | null {
  if (instance !== undefined) return instance;
  if (!isFirebaseConfigured()) {
    instance = null;
    return null;
  }
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  let auth: FbAuth.Auth;
  if (Platform.OS === 'web') {
    auth = FbAuth.getAuth(app);
  } else {
    // On React Native the auth entry point exposes getReactNativePersistence (not in the web typings).
    const getRNPersistence = (FbAuth as unknown as { getReactNativePersistence?: (s: unknown) => FbAuth.Persistence }).getReactNativePersistence;
    try {
      auth = FbAuth.initializeAuth(app, getRNPersistence ? { persistence: getRNPersistence(AsyncStorage) } : undefined);
    } catch {
      auth = FbAuth.getAuth(app);
    }
  }

  let db: Firestore;
  try {
    db = Platform.OS === 'web' ? initializeFirestore(app, { localCache: persistentLocalCache() }) : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    db = getFirestore(app);
  }
  instance = { app, auth, db };
  return instance;
}
