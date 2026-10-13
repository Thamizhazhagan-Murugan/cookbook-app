// Smart suggestions: rank recipes by how much of their shopping is already covered
// by what's planned this week and what's in the pantry.
import { AISLE_WEIGHT } from './grocery';
import { RECIPES, RECIPE_BY_ID } from './recipes';
import type { Ingredient, PantryItem, Recipe, Week } from './types';
import { servingsByRecipe } from './week';

export type Coverage = {
  keys: Set<string>; // ingredient keys already covered
  fromPlan: Set<string>;
  fromPantry: Set<string>;
};

export function coverage(week: Week | undefined, pantry: Record<string, PantryItem>, recipes: Record<string, Recipe> = RECIPE_BY_ID): Coverage {
  const fromPlan = new Set<string>();
  if (week) for (const id of Object.keys(servingsByRecipe(week))) for (const k of recipes[id]?.keys || []) fromPlan.add(k);
  const fromPantry = new Set(Object.keys(pantry));
  return { keys: new Set([...fromPlan, ...fromPantry]), fromPlan, fromPantry };
}

export type Suggestion = {
  recipe: Recipe;
  newItems: Ingredient[]; // one representative ingredient per new key
  reusedKeys: string[];
  newCost: number; // weighted "shopping effort" of new items
  reuseRatio: number; // 0..1 share of the recipe's ingredients already covered
  score: number; // higher is better
};

function uniqueByKey(r: Recipe): Ingredient[] {
  const seen = new Set<string>();
  const out: Ingredient[] = [];
  for (const g of r.ingredients) for (const i of g.items) if (!seen.has(i.key)) { seen.add(i.key); out.push(i); }
  return out;
}

export function suggestFor(r: Recipe, cov: Coverage): Suggestion {
  const items = uniqueByKey(r);
  const newItems: Ingredient[] = [];
  const reusedKeys: string[] = [];
  let newCost = 0;
  let totalCost = 0;
  for (const i of items) {
    const w = AISLE_WEIGHT[i.aisle] ?? 1;
    totalCost += w;
    if (cov.keys.has(i.key)) reusedKeys.push(i.key);
    else {
      newItems.push(i);
      newCost += w;
    }
  }
  // sort new items so the "big" purchases (meat, produce) are listed first
  newItems.sort((a, b) => (AISLE_WEIGHT[b.aisle] ?? 1) - (AISLE_WEIGHT[a.aisle] ?? 1) || a.name.localeCompare(b.name));
  const reuseRatio = items.length ? reusedKeys.length / items.length : 0;
  const score = totalCost ? 1 - newCost / totalCost : 0;
  return { recipe: r, newItems, reusedKeys, newCost, reuseRatio, score };
}

export type SuggestOptions = {
  exclude?: Set<string>; // recipe ids to leave out (already planned)
  candidates?: Recipe[];
  minReuse?: number;
};

/** Rank candidate recipes: fewest new (weighted) purchases first. */
export function rankSuggestions(cov: Coverage, opts: SuggestOptions = {}): Suggestion[] {
  const cands = (opts.candidates || RECIPES).filter((r) => !opts.exclude?.has(r.id));
  const out = cands.map((r) => suggestFor(r, cov));
  out.sort((a, b) => b.score - a.score || a.newItems.length - b.newItems.length || b.reuseRatio - a.reuseRatio || a.recipe.title.localeCompare(b.recipe.title));
  return opts.minReuse != null ? out.filter((s) => s.reuseRatio >= opts.minReuse!) : out;
}

/** Short human line for a suggestion, e.g. "Reuses 9 of 12 · 3 new: chicken thighs, gochujang, sesame seeds". */
export function explain(s: Suggestion): { headline: string; detail: string; tone: 'great' | 'good' | 'ok' | 'none' } {
  const total = s.newItems.length + s.reusedKeys.length;
  const n = s.newItems.length;
  const tone = n === 0 ? 'great' : s.score >= 0.7 ? 'great' : s.score >= 0.45 ? 'good' : s.reusedKeys.length ? 'ok' : 'none';
  const headline = n === 0 ? 'Nothing new to buy' : `${n} new item${n === 1 ? '' : 's'} to buy`;
  const detail = s.reusedKeys.length
    ? `Reuses ${s.reusedKeys.length} of ${total}${n ? ` · new: ${s.newItems.slice(0, 4).map((i) => i.name.toLowerCase()).join(', ')}${n > 4 ? ` +${n - 4}` : ''}` : ''}`
    : `Shares nothing with this week's plan`;
  return { headline, detail, tone };
}
