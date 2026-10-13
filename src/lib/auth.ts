// Account handling. Everyone starts on an anonymous per-device account; "Continue with Google"
// upgrades that account in place (same uid, data untouched). If the Google account already
// owns data from another phone, we switch to it and sync.ts merges the local data in.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { GoogleAuthProvider, linkWithCredential, linkWithPopup, signInWithCredential, signInWithPopup, signOut, type AuthCredential, type User } from 'firebase/auth';
import { Platform } from 'react-native';

import { getFirebase } from './firebase';
import { isGoogleConfigured } from '@/firebaseConfig';
import { useStore } from '@/store/useStore';

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export type GoogleAvailability = 'ready' | 'expo-go' | 'not-configured' | 'no-firebase';

export function googleAvailability(): GoogleAvailability {
  if (!getFirebase()) return 'no-firebase';
  if (!isGoogleConfigured()) return 'not-configured';
  if (Platform.OS !== 'web' && isExpoGo) return 'expo-go';
  return 'ready';
}

/** Set when we had to switch accounts (not link) so sync.ts merges local data into the new one. */
let mergeOnNextAttach = false;
export function takeMergeFlag(): boolean {
  const v = mergeOnNextAttach;
  mergeOnNextAttach = false;
  return v;
}

export type AccountInfo = { uid: string; isAnonymous: boolean; name?: string; email?: string; photo?: string };
export function accountInfo(u: User): AccountInfo {
  const g = u.providerData.find((p) => p.providerId === 'google.com');
  return { uid: u.uid, isAnonymous: u.isAnonymous, name: u.displayName || g?.displayName || undefined, email: u.email || g?.email || undefined, photo: u.photoURL || g?.photoURL || undefined };
}

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');
let googleModule: GoogleSigninModule | null | undefined;
function nativeGoogle(): GoogleSigninModule | null {
  if (googleModule !== undefined) return googleModule;
  try {
    // Lazy so Expo Go (which lacks the native module) never crashes at import time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    googleModule = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
  } catch {
    googleModule = null;
  }
  return googleModule;
}

async function nativeCredential(): Promise<AuthCredential | null> {
  const mod = nativeGoogle();
  if (!mod) throw new Error('Google sign-in needs the installed app build (not Expo Go).');
  const { googleWebClientId } = await import('@/firebaseConfig');
  mod.GoogleSignin.configure({ webClientId: googleWebClientId });
  await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await mod.GoogleSignin.signIn();
  if (res.type !== 'success') return null;
  const idToken = res.data.idToken;
  if (!idToken) throw new Error('Google did not return an ID token — check the Web client ID.');
  return GoogleAuthProvider.credential(idToken);
}

export type SignInResult = 'linked' | 'switched' | 'cancelled';

/** Upgrade the current (anonymous) account to Google, or switch to the existing Google account. */
export async function signInWithGoogle(): Promise<SignInResult> {
  const fb = getFirebase();
  if (!fb) throw new Error('Firebase is not configured.');
  const auth = fb.auth;
  const user = auth.currentUser;

  if (Platform.OS === 'web') {
    const provider = new GoogleAuthProvider();
    if (user?.isAnonymous) {
      try {
        await linkWithPopup(user, provider);
        useStore.getState().setSync({ user: accountInfo(auth.currentUser!) });
        return 'linked';
      } catch (e) {
        const err = e as { code?: string };
        if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use') {
          const cred = GoogleAuthProvider.credentialFromError(e as never);
          if (!cred) throw e;
          mergeOnNextAttach = true;
          await signInWithCredential(auth, cred);
          return 'switched';
        }
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return 'cancelled';
        throw e;
      }
    }
    try {
      await signInWithPopup(auth, provider);
      return 'switched';
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return 'cancelled';
      throw e;
    }
  }

  const cred = await nativeCredential();
  if (!cred) return 'cancelled';
  if (user?.isAnonymous) {
    try {
      await linkWithCredential(user, cred);
      useStore.getState().setSync({ user: accountInfo(auth.currentUser!) });
      return 'linked';
    } catch (e) {
      const err = e as { code?: string };
      if (err.code !== 'auth/credential-already-in-use' && err.code !== 'auth/email-already-in-use') throw e;
    }
  }
  mergeOnNextAttach = true;
  await signInWithCredential(auth, cred);
  return 'switched';
}

/** Sign out of Google, wipe this phone's copy, and start a fresh anonymous account. */
export async function signOutToDevice(): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  try {
    const mod = Platform.OS !== 'web' ? nativeGoogle() : null;
    await mod?.GoogleSignin.signOut();
  } catch {}
  useStore.getState().resetLocal();
  await signOut(fb.auth); // sync.ts signs back in anonymously on the auth-state change
}
