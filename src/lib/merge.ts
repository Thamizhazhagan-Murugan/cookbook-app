// Merging rules used when a phone's local data meets an account's cloud data
// (e.g. signing in with Google on a second phone). Nothing is thrown away:
// newer wins per week, and collections are unioned.
import type { Profile, Week } from './types';

export function mergeWeeks(local: Record<string, Week>, remote: Week[]): Record<string, Week> {
  const out: Record<string, Week> = { ...local };
  for (const r of remote) {
    const l = out[r.id];
    if (!l || (r.updatedAt || 0) > (l.updatedAt || 0)) out[r.id] = r;
  }
  return out;
}

export function mergeProfiles(local: Profile, remote: Profile | null | undefined): Profile {
  if (!remote) return local;
  const newer = (remote.updatedAt || 0) > (local.updatedAt || 0) ? remote : local;
  const favorites = [...new Set([...(remote.favorites || []), ...(local.favorites || [])])];
  const pantry = { ...(remote.pantry || {}) };
  for (const [k, v] of Object.entries(local.pantry || {})) if (!pantry[k] || v.addedAt > pantry[k].addedAt) pantry[k] = v;
  const cooking = { ...(remote.cooking || {}) };
  for (const [k, v] of Object.entries(local.cooking || {})) if (!cooking[k] || v.updatedAt > cooking[k].updatedAt) cooking[k] = v;
  const seen = new Set<string>();
  const cookLog = [...(remote.cookLog || []), ...(local.cookLog || [])]
    .filter((e) => {
      const key = `${e.recipeId}@${e.cookedAt}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.cookedAt - a.cookedAt)
    .slice(0, 500);
  return { favorites, pantry, cooking, cookLog, settings: newer.settings || local.settings, updatedAt: Math.max(local.updatedAt || 0, remote.updatedAt || 0, 1) };
}

/** True when the local store holds anything worth carrying into an account. */
export function hasLocalData(weeks: Record<string, Week>, profile: Profile): boolean {
  return Object.values(weeks).some((w) => w.updatedAt) || !!profile.updatedAt;
}
