// Cloud sync: mirrors weeks + profile to Firestore under users/{uid}/…
// Strategy: local-first, last-write-wins by `updatedAt`. Remote changes newer than local are
// applied locally; local changes are pushed (debounced). Nothing here blocks the UI.
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, type Firestore } from 'firebase/firestore';

import { getFirebase } from './firebase';
import type { Profile, Week } from './types';
import { useStore } from '@/store/useStore';

const strip = <T,>(x: T): T => JSON.parse(JSON.stringify(x)); // drops undefined for Firestore

export function startSync(): () => void {
  const fb = getFirebase();
  const store = useStore;
  if (!fb) {
    store.getState().setSync({ mode: 'local', status: 'idle' });
    return () => {};
  }
  store.getState().setSync({ mode: 'cloud', status: 'connecting' });

  const unsubs: (() => void)[] = [];
  const pushed: Record<string, number> = {}; // docId -> updatedAt last pushed or received
  const pending: Record<string, ReturnType<typeof setTimeout>> = {};

  const schedulePush = (db: Firestore, uid: string, id: string, data: Week | Profile, path: string[]) => {
    clearTimeout(pending[id]);
    pending[id] = setTimeout(async () => {
      try {
        await setDoc(doc(db, ...(path as [string, ...string[]])), strip(data));
        pushed[id] = data.updatedAt;
        store.getState().setSync({ status: 'online', lastSync: Date.now(), error: undefined });
      } catch (e) {
        store.getState().setSync({ status: 'error', error: (e as Error).message });
      }
    }, 700);
  };

  const attach = (uid: string) => {
    const db = fb.db;
    const profileRef = doc(db, 'users', uid, 'state', 'profile');
    const weeksRef = collection(db, 'users', uid, 'weeks');

    // remote -> local
    unsubs.push(
      onSnapshot(
        profileRef,
        (snap) => {
          const s = store.getState();
          if (snap.exists()) {
            const remote = snap.data() as Profile;
            if ((remote.updatedAt || 0) > (s.profile.updatedAt || 0)) {
              pushed.profile = remote.updatedAt;
              s.applyRemoteProfile(remote);
            } else if ((s.profile.updatedAt || 0) > (remote.updatedAt || 0) && pushed.profile !== s.profile.updatedAt) {
              schedulePush(db, uid, 'profile', s.profile, ['users', uid, 'state', 'profile']);
            }
          } else if (s.profile.updatedAt) {
            schedulePush(db, uid, 'profile', s.profile, ['users', uid, 'state', 'profile']);
          }
          s.setSync({ status: 'online', lastSync: Date.now() });
        },
        (e) => store.getState().setSync({ status: 'error', error: e.message })
      )
    );
    unsubs.push(
      onSnapshot(
        weeksRef,
        (qs) => {
          const s = store.getState();
          const seen = new Set<string>();
          qs.forEach((d) => {
            const remote = d.data() as Week;
            seen.add(remote.id);
            const local = s.weeks[remote.id];
            if (!local || (remote.updatedAt || 0) > (local.updatedAt || 0)) {
              pushed[remote.id] = remote.updatedAt;
              s.applyRemoteWeek(remote);
            } else if ((local.updatedAt || 0) > (remote.updatedAt || 0) && pushed[remote.id] !== local.updatedAt) {
              schedulePush(db, uid, remote.id, local, ['users', uid, 'weeks', remote.id]);
            }
          });
          // weeks that exist only locally
          for (const w of Object.values(store.getState().weeks)) if (!seen.has(w.id) && w.updatedAt && pushed[w.id] !== w.updatedAt) schedulePush(db, uid, w.id, w, ['users', uid, 'weeks', w.id]);
          s.setSync({ status: 'online', lastSync: Date.now() });
        },
        (e) => store.getState().setSync({ status: 'error', error: e.message })
      )
    );

    // local -> remote
    unsubs.push(
      store.subscribe((s, prev) => {
        if (s.profile !== prev.profile && s.profile.updatedAt && pushed.profile !== s.profile.updatedAt) schedulePush(db, uid, 'profile', s.profile, ['users', uid, 'state', 'profile']);
        if (s.weeks !== prev.weeks) {
          for (const w of Object.values(s.weeks)) {
            if (w !== prev.weeks[w.id] && w.updatedAt && pushed[w.id] !== w.updatedAt) schedulePush(db, uid, w.id, w, ['users', uid, 'weeks', w.id]);
          }
        }
      })
    );
  };

  signInAnonymously(fb.auth).catch((e) => store.getState().setSync({ status: 'error', error: e.message }));
  unsubs.push(
    onAuthStateChanged(fb.auth, (user) => {
      if (user) {
        store.getState().setSync({ uid: user.uid, status: 'connecting' });
        attach(user.uid);
      }
    })
  );

  return () => {
    unsubs.forEach((u) => u());
    Object.values(pending).forEach(clearTimeout);
  };
}
