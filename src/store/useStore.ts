// Local-first app state. Everything is persisted on the device; Firebase (src/lib/sync.ts)
// mirrors weeks + profile to the cloud when configured.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { buildGroceryList, carryOverCandidates, pantryItemFrom } from '@/lib/grocery';
import type { CookProgress, DayKey, Meal, PantryItem, Profile, SlotKey, Timer, Week } from '@/lib/types';
import { emptyWeek, weekIdFor } from '@/lib/week';

export type AccountInfo = { uid: string; isAnonymous: boolean; name?: string; email?: string; photo?: string };

export type SyncState = {
  mode: 'local' | 'cloud';
  status: 'idle' | 'connecting' | 'online' | 'offline' | 'error';
  uid?: string;
  user?: AccountInfo;
  lastSync?: number;
  error?: string;
};

export type ToastState = { id: number; text: string; action?: { label: string; href: string } } | null;

const defaultProfile = (): Profile => ({ favorites: [], pantry: {}, cooking: {}, cookLog: [], settings: { slots: ['breakfast', 'lunch', 'dinner'] }, updatedAt: 0 });

export type AppState = {
  hydrated: boolean;
  currentWeekId: string;
  weeks: Record<string, Week>;
  profile: Profile;
  timers: Timer[];
  toast: ToastState;
  sync: SyncState;

  // weeks
  selectWeek: (id: string) => void;
  ensureWeek: (id: string) => Week;
  setMeal: (weekId: string, day: DayKey, slot: SlotKey, meal: Meal | null) => void;
  setMealServings: (weekId: string, day: DayKey, slot: SlotKey, servings: number) => void;
  repeatMeal: (weekId: string, from: { day: DayKey; slot: SlotKey }, days: DayKey[]) => void;
  copyWeek: (fromId: string, toId: string) => void;
  clearWeek: (weekId: string) => void;
  // groceries
  toggleChecked: (weekId: string, key: string) => void;
  setHave: (weekId: string, key: string, have: boolean | null) => void;
  addExtra: (weekId: string, text: string) => void;
  removeExtra: (weekId: string, id: string) => void;
  resetChecked: (weekId: string) => void;
  finishShopping: (weekId: string) => number;
  // profile
  toggleFavorite: (recipeId: string) => void;
  pantryAdd: (item: PantryItem) => void;
  pantryRemove: (key: string) => void;
  pantryClear: () => void;
  setSlots: (slots: SlotKey[]) => void;
  saveCooking: (p: CookProgress) => void;
  clearCooking: (recipeId: string) => void;
  logCook: (recipeId: string) => void;
  // timers
  addTimer: (secs: number, label: string, sub: string) => void;
  toggleTimer: (id: string) => void;
  addMinute: (id: string) => void;
  removeTimer: (id: string) => void;
  tickTimers: () => boolean; // returns true if a timer just finished
  // ui
  showToast: (text: string, action?: { label: string; href: string }) => void;
  hideToast: () => void;
  // sync plumbing
  setSync: (s: Partial<SyncState>) => void;
  applyRemoteWeek: (w: Week) => void;
  applyRemoteProfile: (p: Profile) => void;
  replaceAll: (data: { weeks: Record<string, Week>; profile: Profile }) => void;
  resetLocal: () => void;
};

const now = () => Date.now();
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const useStore = create<AppState>()(
  persist(
    (set, get) => {
      const updWeek = (weekId: string, fn: (w: Week) => void) =>
        set((s) => {
          const w: Week = clone(s.weeks[weekId] || emptyWeek(weekId));
          fn(w);
          w.updatedAt = now();
          return { weeks: { ...s.weeks, [weekId]: w } };
        });
      const updProfile = (fn: (p: Profile) => void) =>
        set((s) => {
          const p: Profile = clone(s.profile);
          fn(p);
          p.updatedAt = now();
          return { profile: p };
        });

      return {
        hydrated: false,
        currentWeekId: weekIdFor(),
        weeks: {},
        profile: defaultProfile(),
        timers: [],
        toast: null,
        sync: { mode: 'local', status: 'idle' },

        selectWeek: (id) => set({ currentWeekId: id }),
        ensureWeek: (id) => get().weeks[id] || emptyWeek(id),
        setMeal: (weekId, day, slot, meal) =>
          updWeek(weekId, (w) => {
            if (meal) w.days[day][slot] = meal;
            else delete w.days[day][slot];
          }),
        setMealServings: (weekId, day, slot, servings) =>
          updWeek(weekId, (w) => {
            const m = w.days[day][slot];
            if (m) m.servings = Math.max(1, Math.min(40, servings));
          }),
        repeatMeal: (weekId, from, days) =>
          updWeek(weekId, (w) => {
            const m = w.days[from.day][from.slot];
            if (!m) return;
            for (const d of days) w.days[d][from.slot] = { ...m };
          }),
        copyWeek: (fromId, toId) =>
          set((s) => {
            const src = s.weeks[fromId];
            if (!src) return {};
            const w = emptyWeek(toId);
            w.days = clone(src.days);
            w.extras = clone(src.extras);
            w.updatedAt = now();
            return { weeks: { ...s.weeks, [toId]: w } };
          }),
        clearWeek: (weekId) =>
          updWeek(weekId, (w) => {
            const e = emptyWeek(weekId);
            w.days = e.days;
            w.extras = [];
            w.checked = {};
            w.have = {};
            delete w.finishedAt;
          }),

        toggleChecked: (weekId, key) =>
          updWeek(weekId, (w) => {
            if (w.checked[key]) delete w.checked[key];
            else w.checked[key] = true;
          }),
        setHave: (weekId, key, have) =>
          updWeek(weekId, (w) => {
            if (have == null) delete w.have[key];
            else w.have[key] = have;
            if (have) delete w.checked[key];
          }),
        addExtra: (weekId, text) => updWeek(weekId, (w) => w.extras.push({ id: uid(), text: text.trim() })),
        removeExtra: (weekId, id) =>
          updWeek(weekId, (w) => {
            w.extras = w.extras.filter((e) => e.id !== id);
            delete w.checked[`custom:${id}`];
          }),
        resetChecked: (weekId) => updWeek(weekId, (w) => (w.checked = {})),
        finishShopping: (weekId) => {
          const s = get();
          const week = s.weeks[weekId];
          if (!week) return 0;
          const list = buildGroceryList(week, { pantry: s.profile.pantry });
          const carry = carryOverCandidates(list);
          updProfile((p) => {
            for (const i of carry) p.pantry[i.key] = pantryItemFrom(i, 'bought');
          });
          updWeek(weekId, (w) => (w.finishedAt = now()));
          return carry.length;
        },

        toggleFavorite: (recipeId) =>
          updProfile((p) => {
            const i = p.favorites.indexOf(recipeId);
            if (i >= 0) p.favorites.splice(i, 1);
            else p.favorites.push(recipeId);
          }),
        pantryAdd: (item) => updProfile((p) => (p.pantry[item.key] = item)),
        pantryRemove: (key) => updProfile((p) => delete p.pantry[key]),
        pantryClear: () => updProfile((p) => (p.pantry = {})),
        setSlots: (slots) => updProfile((p) => (p.settings.slots = slots)),
        saveCooking: (prog) => updProfile((p) => (p.cooking[prog.recipeId] = { ...prog, updatedAt: now() })),
        clearCooking: (recipeId) => updProfile((p) => delete p.cooking[recipeId]),
        logCook: (recipeId) =>
          updProfile((p) => {
            p.cookLog.unshift({ recipeId, cookedAt: now() });
            p.cookLog = p.cookLog.slice(0, 500);
            delete p.cooking[recipeId];
          }),

        addTimer: (secs, label, sub) =>
          set((s) => ({ timers: [...s.timers, { id: uid(), label, sub, total: secs, remaining: secs, endAt: now() + secs * 1000, running: true, done: false }] })),
        toggleTimer: (id) =>
          set((s) => ({
            timers: s.timers.map((t) => {
              if (t.id !== id || t.done) return t;
              if (t.running) return { ...t, running: false, remaining: Math.max(0, Math.round((t.endAt - now()) / 1000)) };
              return { ...t, running: true, endAt: now() + t.remaining * 1000 };
            }),
          })),
        addMinute: (id) =>
          set((s) => ({
            timers: s.timers.map((t) => {
              if (t.id !== id) return t;
              if (t.done) return { ...t, done: false, running: true, remaining: 60, endAt: now() + 60000 };
              return t.running ? { ...t, endAt: t.endAt + 60000 } : { ...t, remaining: t.remaining + 60 };
            }),
          })),
        removeTimer: (id) => set((s) => ({ timers: s.timers.filter((t) => t.id !== id) })),
        tickTimers: () => {
          let finished = false;
          const timers = get().timers;
          if (!timers.length) return false;
          const next = timers.map((t) => {
            if (t.running && !t.done && t.endAt - now() <= 0) {
              finished = true;
              return { ...t, done: true, running: false, remaining: 0 };
            }
            return t;
          });
          if (finished) set({ timers: next });
          return finished;
        },

        showToast: (text, action) => set({ toast: { id: now(), text, action } }),
        hideToast: () => set({ toast: null }),

        setSync: (p) => set((s) => ({ sync: { ...s.sync, ...p } })),
        applyRemoteWeek: (w) => set((s) => ({ weeks: { ...s.weeks, [w.id]: w } })),
        applyRemoteProfile: (p) => set({ profile: { ...defaultProfile(), ...p } }),
        replaceAll: (data) => set({ weeks: data.weeks, profile: { ...defaultProfile(), ...data.profile } }),
        resetLocal: () => set({ weeks: {}, profile: defaultProfile(), currentWeekId: weekIdFor() }),
      };
    },
    {
      name: 'cookbook.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ currentWeekId: s.currentWeekId, weeks: s.weeks, profile: s.profile, timers: s.timers }),
      onRehydrateStorage: () => (state) => {
        // after hydration, make sure the selected week is a real week id and finish stale timers
        if (state) {
          state.tickTimers();
          useStore.setState({ hydrated: true });
        }
      },
    }
  )
);

/** Selector helpers */
export const useWeek = (id?: string) => useStore((s) => s.weeks[id || s.currentWeekId]) || undefined;
export const useProfile = () => useStore((s) => s.profile);
