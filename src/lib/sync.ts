// Cloud sync: mirrors weeks + profile to Firestore under users/{uid}/…
// Local-first, last-write-wins by `updatedAt`. Follows the signed-in account: when the user
// upgrades to Google (same uid) nothing changes; when they switch to an existing Google
// account, the phone's data is merged into it first.
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, setDoc, type Firestore } from 'firebase/firestore';

import { accountInfo, takeMergeFlag } from './auth';
import { getFirebase } from './firebase';
import { hasLocalData, mergeProfiles, mergeWeeks } from './merge';
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

  let current: { uid: string; unsubs: (() => void)[]; pending: Record<string, ReturnType<typeof setTimeout>> } | null = null;
  const pushed: Record<string, number> = {}; // docId -> updatedAt last pushed or received

  const detach = () => {
    if (!current) return;
    current.unsubs.forEach((u) => u());
    Object.values(current.pending).forEach(clearTimeout);
    current = null;
  };

  const schedulePush = (db: Firestore, id: string, data: Week | Profile, path: string[]) => {
    if (!current) return;
    clearTimeout(current.pending[id]);
    current.pending[id] = setTimeout(async () => {
      try {
        await setDoc(doc(db, ...(path as [string, ...string[]])), strip(data));
        pushed[id] = data.updatedAt;
        store.getState().setSync({ status: 'online', lastSync: Date.now(), error: undefined });
      } catch (e) {
        store.getState().setSync({ status: 'error', error: (e as Error).message });
      }
    }, 700);
  };

  /** One-off: fold this phone's data into the account's data, write it back, adopt it locally. */
  const migrate = async (db: Firestore, uid: string) => {
    const s = store.getState();
    if (!hasLocalData(s.weeks, s.profile)) return;
    const profileRef = doc(db, 'users', uid, 'state', 'profile');
    const weeksRef = collection(db, 'users', uid, 'weeks');
    const [p, w] = await Promise.all([getDoc(profileRef), getDocs(weeksRef)]);
    const remoteProfile = p.exists() ? (p.data() as Profile) : null;
    const remoteWeeks = w.docs.map((d) => d.data() as Week);
    const weeks = mergeWeeks(s.weeks, remoteWeeks);
    const profile = mergeProfiles(s.profile, remoteProfile);
    profile.updatedAt = Date.now();
    const writes: Promise<unknown>[] = [setDoc(profileRef, strip(profile))];
    pushed.profile = profile.updatedAt;
    for (const wk of Object.values(weeks)) {
      const remote = remoteWeeks.find((r) => r.id === wk.id);
      if (!remote || remote.updatedAt !== wk.updatedAt) writes.push(setDoc(doc(db, 'users', uid, 'weeks', wk.id), strip(wk)));
      pushed[wk.id] = wk.updatedAt;
    }
    await Promise.all(writes);
    s.replaceAll({ weeks, profile });
  };

  const attach = async (uid: string) => {
    detach();
    current = { uid, unsubs: [], pending: {} };
    const db = fb.db;
    for (const k of Object.keys(pushed)) delete pushed[k];

    if (takeMergeFlag()) {
      try {
        await migrate(db, uid);
      } catch (e) {
        store.getState().setSync({ status: 'error', error: `Merge failed: ${(e as Error).message}` });
      }
    }
    if (!current || current.uid !== uid) return; // account changed while merging

    const profileRef = doc(db, 'users', uid, 'state', 'profile');
    const weeksRef = collection(db, 'users', uid, 'weeks');
    const profilePath = ['users', uid, 'state', 'profile'];

    // remote -> local
    current.unsubs.push(
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
              schedulePush(db, 'profile', s.profile, profilePath);
            }
          } else if (s.profile.updatedAt) {
            schedulePush(db, 'profile', s.profile, profilePath);
          }
          s.setSync({ status: 'online', lastSync: Date.now() });
        },
        (e) => store.getState().setSync({ status: 'error', error: e.message })
      )
    );
    current.unsubs.push(
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
              schedulePush(db, remote.id, local, ['users', uid, 'weeks', remote.id]);
            }
          });
          for (const w of Object.values(store.getState().weeks)) if (!seen.has(w.id) && w.updatedAt && pushed[w.id] !== w.updatedAt) schedulePush(db, w.id, w, ['users', uid, 'weeks', w.id]);
          s.setSync({ status: 'online', lastSync: Date.now() });
        },
        (e) => store.getState().setSync({ status: 'error', error: e.message })
      )
    );

    // local -> remote
    current.unsubs.push(
      store.subscribe((s, prev) => {
        if (s.profile !== prev.profile && s.profile.updatedAt && pushed.profile !== s.profile.updatedAt) schedulePush(db, 'profile', s.profile, profilePath);
        if (s.weeks !== prev.weeks) {
          for (const w of Object.values(s.weeks)) {
            if (w !== prev.weeks[w.id] && w.updatedAt && pushed[w.id] !== w.updatedAt) schedulePush(db, w.id, w, ['users', uid, 'weeks', w.id]);
          }
        }
      })
    );
  };

  const unsubAuth = onAuthStateChanged(fb.auth, (user) => {
    if (!user) {
      detach();
      store.getState().setSync({ status: 'connecting', uid: undefined, user: undefined });
      signInAnonymously(fb.auth).catch((e) => store.getState().setSync({ status: 'error', error: e.message }));
      return;
    }
    store.getState().setSync({ uid: user.uid, user: accountInfo(user), status: current?.uid === user.uid ? store.getState().sync.status : 'connecting' });
    if (current?.uid !== user.uid) attach(user.uid);
  });
  if (!fb.auth.currentUser) signInAnonymously(fb.auth).catch((e) => store.getState().setSync({ status: 'error', error: e.message }));

  return () => {
    unsubAuth();
    detach();
  };
}
