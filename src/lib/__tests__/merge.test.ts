import { hasLocalData, mergeProfiles, mergeWeeks } from '../merge';
import type { Profile, Week } from '../types';
import { emptyWeek } from '../week';

const prof = (over: Partial<Profile> = {}): Profile => ({ favorites: [], pantry: {}, cooking: {}, cookLog: [], settings: { slots: ['breakfast', 'lunch', 'dinner'] }, updatedAt: 0, ...over });

describe('merge on account switch', () => {
  it('keeps the newer copy of each week and unions the rest', () => {
    const a = emptyWeek('2026-10-12');
    a.days.mon.dinner = { recipeId: 'mp-16', servings: 2 };
    a.updatedAt = 100;
    const aRemote: Week = { ...emptyWeek('2026-10-12'), updatedAt: 200 };
    aRemote.days.tue.lunch = { recipeId: 'cb-5', servings: 1 };
    const localOnly = { ...emptyWeek('2026-10-05'), updatedAt: 50 };
    const remoteOnly = { ...emptyWeek('2026-09-28'), updatedAt: 60 };
    const merged = mergeWeeks({ '2026-10-12': a, '2026-10-05': localOnly }, [aRemote, remoteOnly]);
    expect(Object.keys(merged).sort()).toEqual(['2026-09-28', '2026-10-05', '2026-10-12']);
    expect(merged['2026-10-12'].days.tue.lunch?.recipeId).toBe('cb-5'); // remote was newer
    expect(merged['2026-10-12'].days.mon.dinner).toBeUndefined();
  });
  it('unions favourites, pantry, cooking progress and cook log', () => {
    const local = prof({ favorites: ['a', 'b'], pantry: { salt: { key: 'salt', name: 'Salt', aisle: 'Spices & seasonings', addedAt: 5, source: 'manual' } }, cooking: { 'mp-16': { recipeId: 'mp-16', step: 3, ticks: {}, servings: 4, startedAt: 1, updatedAt: 10 } }, cookLog: [{ recipeId: 'x', cookedAt: 1 }], updatedAt: 10 });
    const remote = prof({ favorites: ['b', 'c'], pantry: { salt: { key: 'salt', name: 'Salt', aisle: 'Spices & seasonings', addedAt: 9, source: 'bought' }, honey: { key: 'honey', name: 'Honey', aisle: 'Sauces, oils & condiments', addedAt: 2, source: 'bought' } }, cooking: { 'mp-16': { recipeId: 'mp-16', step: 1, ticks: {}, servings: 4, startedAt: 1, updatedAt: 5 } }, cookLog: [{ recipeId: 'x', cookedAt: 1 }, { recipeId: 'y', cookedAt: 2 }], settings: { slots: ['dinner'] }, updatedAt: 20 });
    const m = mergeProfiles(local, remote);
    expect(m.favorites.sort()).toEqual(['a', 'b', 'c']);
    expect(Object.keys(m.pantry).sort()).toEqual(['honey', 'salt']);
    expect(m.pantry.salt.source).toBe('bought'); // newer addedAt wins
    expect(m.cooking['mp-16'].step).toBe(3); // newer progress wins
    expect(m.cookLog.length).toBe(2); // deduplicated
    expect(m.settings.slots).toEqual(['dinner']); // settings from the newer profile
    expect(mergeProfiles(local, null)).toBe(local);
  });
  it('knows when there is nothing to migrate', () => {
    expect(hasLocalData({}, prof())).toBe(false);
    expect(hasLocalData({ w: { ...emptyWeek('2026-10-12'), updatedAt: 1 } }, prof())).toBe(true);
    expect(hasLocalData({}, prof({ updatedAt: 1 }))).toBe(true);
  });
});
