// Account & cloud backup card: anonymous device account → "Continue with Google" → signed-in state.
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { googleAvailability, signInWithGoogle, signOutToDevice } from '@/lib/auth';
import * as haptics from '@/lib/haptics';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme';
import { Button, Card, T } from './ui';

export function AccountCard() {
  const { c } = useTheme();
  const sync = useStore((s) => s.sync);
  const showToast = useStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const avail = googleAvailability();
  const user = sync.user;
  const google = user && !user.isAnonymous;
  const when = sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const statusLine =
    sync.mode === 'local' ? 'Local only — add your Firebase config to back up and sync' : sync.status === 'online' ? `Synced${when ? ` · ${when}` : ''}` : sync.status === 'error' ? `Sync error: ${sync.error}` : 'Connecting…';

  const onGoogle = async () => {
    setBusy(true);
    try {
      const r = await signInWithGoogle();
      if (r === 'linked') {
        haptics.success();
        showToast('Signed in — your data now lives on your Google account');
      } else if (r === 'switched') {
        haptics.success();
        showToast("Signed in — this phone's data was merged into your account");
      }
    } catch (e) {
      haptics.warn();
      showToast((e as Error).message.replace(/^Firebase: /, '').slice(0, 120));
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = () => {
    const go = async () => {
      setBusy(true);
      try {
        await signOutToDevice();
        showToast('Signed out — this phone starts fresh');
      } catch (e) {
        showToast((e as Error).message);
      } finally {
        setBusy(false);
      }
    };
    if (Platform.OS === 'web') {
      if (confirm('Sign out? Your data stays in the cloud; this phone starts with an empty plan.')) go();
    } else Alert.alert('Sign out?', 'Your data stays safe in your Google account. This phone will start with an empty plan until you sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: go }]);
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {google && user?.photo ? (
          <Image source={{ uri: user.photo }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface2 }} />
        ) : (
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={sync.mode === 'cloud' ? (google ? 'person' : 'phone-portrait-outline') : 'phone-portrait-outline'} size={22} color={c.accent} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="bodySemi" numberOfLines={1}>
            {google ? user?.name || user?.email || 'Google account' : sync.mode === 'cloud' ? 'Device account' : 'Saved on this phone'}
          </T>
          <T v="small" color="muted" numberOfLines={2}>
            {google && user?.email ? `${user.email} · ` : ''}
            {statusLine}
          </T>
        </View>
        <Ionicons name={sync.mode === 'cloud' ? (sync.status === 'online' ? 'cloud-done-outline' : sync.status === 'error' ? 'cloud-offline-outline' : 'cloud-outline') : 'cloud-offline-outline'} size={22} color={sync.status === 'error' ? c.danger : c.muted} />
      </View>

      {sync.mode === 'local' ? (
        <T v="tiny" color="muted" style={{ marginTop: 10 }}>
          Open src/firebaseConfig.ts and paste your Firebase web config (README has the steps). Weeks, pantry, favourites and cooking progress then back up automatically.
        </T>
      ) : google ? (
        <View style={{ marginTop: 12, gap: 8 }}>
          <T v="tiny" color="muted">
            Everything is stored under your Google account, so signing in on another phone brings it all back.
          </T>
          <Button label="Sign out" icon="log-out-outline" kind="ghost" size="sm" onPress={onSignOut} disabled={busy} style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : (
        <View style={{ marginTop: 12, gap: 8 }}>
          <T v="tiny" color="muted">
            Your data is backed up under an anonymous account tied to this install. Sign in with Google to keep it when you change phones.
          </T>
          {avail === 'ready' ? (
            <Button label={busy ? 'Signing in…' : 'Continue with Google'} icon="logo-google" kind="primary" onPress={onGoogle} disabled={busy} style={{ alignSelf: 'flex-start' }} />
          ) : avail === 'expo-go' ? (
            <T v="tiny" color="accent">
              Google sign-in works in the installed app (EAS build) — Expo Go can&apos;t load Google&apos;s native sign-in.
            </T>
          ) : (
            <T v="tiny" color="accent">
              To enable Google sign-in, paste the Web client ID into src/firebaseConfig.ts and enable Google in Firebase → Authentication.
            </T>
          )}
        </View>
      )}
    </Card>
  );
}
