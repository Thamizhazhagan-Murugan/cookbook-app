import { DAY_KEYS, type DayKey, type Meal, type Week, type SlotKey } from './types';

export const DAY_LABELS: Record<DayKey, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
export const DAY_LONG: Record<DayKey, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
export const SLOT_LABELS: Record<SlotKey, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function toDateId(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateId(id: string): Date {
  const [y, m, d] = id.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Monday of the week containing `d`, as YYYY-MM-DD. */
export function weekIdFor(d: Date = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return toDateId(x);
}

export function shiftWeek(id: string, n: number): string {
  const d = parseDateId(id);
  d.setDate(d.getDate() + 7 * n);
  return toDateId(d);
}

export function dayDate(weekId: string, day: DayKey): Date {
  const d = parseDateId(weekId);
  d.setDate(d.getDate() + DAY_KEYS.indexOf(day));
  return d;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function weekRangeLabel(id: string): string {
  const a = parseDateId(id);
  const b = new Date(a);
  b.setDate(a.getDate() + 6);
  if (a.getMonth() === b.getMonth()) return `${MONTHS[a.getMonth()]} ${a.getDate()} – ${b.getDate()}`;
  return `${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}`;
}

export function weekRelativeLabel(id: string, today: Date = new Date()): string {
  const cur = weekIdFor(today);
  if (id === cur) return 'This week';
  if (id === shiftWeek(cur, 1)) return 'Next week';
  if (id === shiftWeek(cur, -1)) return 'Last week';
  const y = parseDateId(id).getFullYear();
  return y === today.getFullYear() ? 'Week of' : `Week of ${y},`;
}

export function todayKey(today: Date = new Date()): DayKey {
  return DAY_KEYS[(today.getDay() + 6) % 7];
}

export function emptyWeek(id: string): Week {
  return {
    id,
    days: { mon: {}, tue: {}, wed: {}, thu: {}, fri: {}, sat: {}, sun: {} },
    extras: [],
    checked: {},
    have: {},
    updatedAt: 0,
  };
}

export type PlacedMeal = Meal & { day: DayKey; slot: SlotKey };

export function mealsOf(week: Week | undefined): PlacedMeal[] {
  if (!week) return [];
  const out: PlacedMeal[] = [];
  for (const day of DAY_KEYS) {
    const plan = week.days[day] || {};
    for (const slot of Object.keys(plan) as SlotKey[]) {
      const m = plan[slot];
      if (m) out.push({ ...m, day, slot });
    }
  }
  return out;
}

/** Total servings per recipe across the week. */
export function servingsByRecipe(week: Week | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of mealsOf(week)) out[m.recipeId] = (out[m.recipeId] || 0) + m.servings;
  return out;
}

export function countMeals(week: Week | undefined): number {
  return mealsOf(week).length;
}

/**
 * Meal-prep placement: starting at `from`, walk forward through the week and return the days
 * (same slot) that a batch of `servings` single-serving meals would occupy. The start day is
 * always included (it gets replaced); later days are skipped when that slot is already taken.
 */
export function mealPrepDays(week: Week | undefined, from: DayKey, slot: SlotKey, servings: number): DayKey[] {
  const out: DayKey[] = [];
  const start = DAY_KEYS.indexOf(from);
  for (let i = start; i < DAY_KEYS.length && out.length < Math.max(1, servings); i++) {
    const d = DAY_KEYS[i];
    if (d === from || !week?.days[d]?.[slot]) out.push(d);
  }
  return out;
}

export function dayRangeLabel(days: DayKey[]): string {
  if (!days.length) return '';
  if (days.length === 1) return DAY_LABELS[days[0]];
  const idx = days.map((d) => DAY_KEYS.indexOf(d));
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  return contiguous ? `${DAY_LABELS[days[0]]}–${DAY_LABELS[days[days.length - 1]]}` : days.map((d) => DAY_LABELS[d]).join(', ');
}
