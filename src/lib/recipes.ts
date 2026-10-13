import data from '@/data/recipes.json';
import staplesData from '@/data/staples.json';
import type { Recipe } from './types';

export const RECIPES: Recipe[] = data as unknown as Recipe[];
export const RECIPE_BY_ID: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
export const STAPLES: { section: string; items: string[] }[] = staplesData as { section: string; items: string[] }[];

export const CATEGORIES = ['All', 'Chicken', 'Beef', 'Seafood', 'Breakfast', 'Smoothies & Drinks', 'Desserts & Snacks', 'Sides'] as const;
export type Category = (typeof CATEGORIES)[number];

export type SortKey = 'book' | 'fast' | 'kcal' | 'protein' | 'az';
export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'book', label: 'Book order' },
  { key: 'fast', label: 'Quickest first' },
  { key: 'kcal', label: 'Lowest calories' },
  { key: 'protein', label: 'Most protein' },
  { key: 'az', label: 'A to Z' },
];

export type RecipeFilter = {
  query?: string;
  category?: Category;
  book?: 'all' | 'mealprep' | 'cookbook';
  quick?: boolean;
  onlyIds?: Set<string> | null;
  sort?: SortKey;
};

export function filterRecipes(f: RecipeFilter, list: Recipe[] = RECIPES): Recipe[] {
  const q = (f.query || '').trim().toLowerCase();
  const cat = f.category || 'All';
  let out = list.filter((r) => {
    if (cat !== 'All' && !(r.category === cat || (cat === 'Sides' && r.category === 'Other'))) return false;
    if (f.book && f.book !== 'all' && r.book !== f.book) return false;
    if (f.quick && r.time.total_min > 30) return false;
    if (f.onlyIds && !f.onlyIds.has(r.id)) return false;
    if (q) {
      if (r.title.toLowerCase().includes(q)) return true;
      if (r.tags.some((t) => t.toLowerCase().includes(q))) return true;
      return r.keys.some((k) => k.includes(q));
    }
    return true;
  });
  const sort = f.sort || 'book';
  const cmp: Record<SortKey, (a: Recipe, b: Recipe) => number> = {
    book: () => 0,
    fast: (a, b) => a.time.total_min - b.time.total_min,
    kcal: (a, b) => (a.macros.calories ?? 9e9) - (b.macros.calories ?? 9e9),
    protein: (a, b) => (b.macros.protein ?? 0) - (a.macros.protein ?? 0),
    az: (a, b) => a.title.localeCompare(b.title),
  };
  if (sort !== 'book') out = out.slice().sort(cmp[sort]);
  return out;
}

export function minsText(m: number): string {
  if (!m) return '—';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function timeLabel(r: Recipe): string {
  return `≈ ${minsText(r.time.total_min)}`;
}
