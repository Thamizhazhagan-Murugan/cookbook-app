import { buildGroceryList, carryOverCandidates, ingKey, listAsText, parseCustom, splitList } from '../grocery';
import { fmtQty, fmtUnit, scaleText, sumQuantities } from '../quantities';
import { RECIPES, RECIPE_BY_ID, filterRecipes } from '../recipes';
import { coverage, explain, rankSuggestions } from '../suggest';
import { clockText, timersIn } from '../timers';
import type { Week } from '../types';
import { dayRangeLabel, emptyWeek, mealPrepDays, mealsOf, servingsByRecipe, shiftWeek, weekIdFor, weekRangeLabel } from '../week';

describe('data', () => {
  it('loads all 271 recipes with ingredients, steps and photos keys', () => {
    expect(RECIPES.length).toBe(271);
    for (const r of RECIPES) {
      expect(r.ingredients.length).toBeGreaterThan(0);
      expect(r.keys.length).toBeGreaterThan(0);
      expect(r.time.total_min).toBeGreaterThan(0);
    }
    expect(RECIPES.filter((r) => r.steps.length === 0).every((r) => r.ingredients_only)).toBe(true);
  });
  it('filters and sorts', () => {
    expect(filterRecipes({ query: 'shawarma' }).length).toBeGreaterThan(3);
    expect(filterRecipes({ query: 'gochujang' }).every((r) => r.keys.some((k) => k.includes('gochujang')))).toBe(true);
    const fast = filterRecipes({ sort: 'fast' });
    expect(fast[0].time.total_min).toBeLessThanOrEqual(fast[fast.length - 1].time.total_min);
    expect(filterRecipes({ category: 'Seafood' }).every((r) => r.category === 'Seafood')).toBe(true);
    expect(filterRecipes({ quick: true }).every((r) => r.time.total_min <= 30)).toBe(true);
  });
});

describe('quantities', () => {
  it('formats fractions', () => {
    expect(fmtQty(0.5)).toBe('½');
    expect(fmtQty(1.5)).toBe('1 ½');
    expect(fmtQty(2)).toBe('2');
    expect(fmtQty(12.4)).toBe('12');
    expect(fmtQty(1 / 3)).toBe('⅓');
  });
  it('scales ingredient text, skipping percentages', () => {
    expect(scaleText('800g (28oz) Raw Chicken Breasts, cubed', 0.5)).toBe('400g (14oz) Raw Chicken Breasts, cubed');
    expect(scaleText('300g (10.5oz) 1% Milk', 2)).toBe('600g (21oz) 1% Milk');
    expect(scaleText('1/2 Tsp Salt', 2)).toBe('1 Tsp Salt');
    expect(scaleText('Handful Parsley', 3)).toBe('Handful Parsley');
    expect(scaleText('2 Tsp Oregano', 1)).toBe('2 Tsp Oregano');
  });
  it('sums like units and converts tsp to tbsp', () => {
    expect(sumQuantities([{ qty: 600, unit: 'g', qtyText: '600 g' }, { qty: 500, unit: 'g', qtyText: '500 g' }])).toBe('1.1 kg');
    expect(sumQuantities([{ qty: 2, unit: 'tsp', qtyText: '2 tsp' }, { qty: 1, unit: 'tbsp', qtyText: '1 tbsp' }])).toBe('1 ¾ tbsp');
    expect(sumQuantities([{ qty: 1, unit: 'tbsp', qtyText: '1 tbsp' }, { qty: null, unit: '', qtyText: 'Handful' }])).toBe('1 tbsp + Handful');
    expect(fmtUnit(2, 'clove')).toBe('2 cloves');
  });
});

describe('week', () => {
  it('computes Monday ids and ranges', () => {
    expect(weekIdFor(new Date(2026, 9, 13))).toBe('2026-10-12'); // Tue 13 Oct 2026 -> Mon 12
    expect(weekIdFor(new Date(2026, 9, 12))).toBe('2026-10-12');
    expect(weekIdFor(new Date(2026, 9, 18))).toBe('2026-10-12'); // Sunday belongs to the same week
    expect(shiftWeek('2026-10-12', 1)).toBe('2026-10-19');
    expect(weekRangeLabel('2026-10-12')).toBe('Oct 12 – 18');
    expect(weekRangeLabel('2026-10-26')).toBe('Oct 26 – Nov 1');
  });
  it('spreads a meal-prep batch over free days', () => {
    const w = emptyWeek('2026-10-12');
    expect(mealPrepDays(w, 'mon', 'dinner', 4)).toEqual(['mon', 'tue', 'wed', 'thu']);
    w.days.tue.dinner = { recipeId: 'cb-5', servings: 1 }; // taken -> skipped
    expect(mealPrepDays(w, 'mon', 'dinner', 4)).toEqual(['mon', 'wed', 'thu', 'fri']);
    expect(mealPrepDays(w, 'tue', 'dinner', 2)).toEqual(['tue', 'wed']); // start day is always replaced
    expect(mealPrepDays(w, 'sat', 'dinner', 5)).toEqual(['sat', 'sun']); // week ends
    expect(mealPrepDays(w, 'mon', 'lunch', 1)).toEqual(['mon']);
    expect(dayRangeLabel(['mon', 'tue', 'wed'])).toBe('Mon–Wed');
    expect(dayRangeLabel(['mon', 'wed'])).toBe('Mon, Wed');
    expect(dayRangeLabel(['fri'])).toBe('Fri');
  });
  it('lists meals and servings', () => {
    const w = emptyWeek('2026-10-12');
    w.days.mon.dinner = { recipeId: 'mp-16', servings: 2 };
    w.days.tue.lunch = { recipeId: 'mp-16', servings: 1 };
    w.days.wed.dinner = { recipeId: 'cb-5', servings: 1 };
    expect(mealsOf(w).length).toBe(3);
    expect(servingsByRecipe(w)).toEqual({ 'mp-16': 3, 'cb-5': 1 });
  });
});

function planWeek(ids: [string, number][]): Week {
  const w = emptyWeek('2026-10-12');
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  ids.forEach(([id, servings], i) => {
    w.days[days[i % 7]].dinner = { recipeId: id, servings };
  });
  return w;
}

describe('grocery', () => {
  it('merges the same ingredient across recipes and scales by servings', () => {
    const w = planWeek([['mp-16', 4], ['cb-5', 3]]);
    const list = buildGroceryList(w, { pantry: {} });
    const chicken = list.find((i) => i.key === 'chicken breast');
    expect(chicken).toBeTruthy();
    expect(chicken!.sources.length).toBe(2);
    expect(chicken!.qtyStr).toBe('1.4 kg'); // 800g + 600g
    const garlic = list.find((i) => i.key === 'garlic');
    expect(garlic!.sources.length).toBe(2);
    // halving servings halves grams
    const half = buildGroceryList(planWeek([['mp-16', 2]]), { pantry: {} });
    expect(half.find((i) => i.key === 'chicken breast')!.qtyStr).toBe('400 g');
  });
  it('marks pantry items as already have and respects overrides', () => {
    const w = planWeek([['mp-16', 4]]);
    const pantry = { paprika: { key: 'paprika', name: 'Paprika', aisle: 'Spices & seasonings', addedAt: 1, source: 'bought' as const } };
    let list = buildGroceryList(w, { pantry });
    expect(list.find((i) => i.key === 'paprika')!.have).toBe(true);
    const { toBuy, have } = splitList(list);
    expect(have.some((i) => i.key === 'paprika')).toBe(true);
    expect(toBuy.some((i) => i.key === 'paprika')).toBe(false);
    w.have.paprika = false; // "I ran out"
    list = buildGroceryList(w, { pantry });
    expect(list.find((i) => i.key === 'paprika')!.have).toBe(false);
  });
  it('handles custom items and carry-over candidates', () => {
    const w = planWeek([['mp-16', 4]]);
    w.extras.push({ id: 'x1', text: '2 Dish soap' });
    w.checked['custom:x1'] = true;
    w.checked['smoked paprika'] = true;
    w.checked['chicken breast'] = true;
    const list = buildGroceryList(w, { pantry: {} });
    const custom = list.find((i) => i.custom);
    expect(custom!.name).toBe('Dish soap');
    expect(custom!.qtyStr).toBe('2');
    const carry = carryOverCandidates(list).map((i) => i.key);
    expect(carry).toContain('smoked paprika');
    expect(carry).not.toContain('chicken breast'); // perishable
    expect(carry).not.toContain('custom:x1');
    const txt = listAsText(list, 'Groceries');
    expect(txt).toContain('PRODUCE');
    expect(txt).not.toContain('Chicken Breasts'); // already bought
    expect(parseCustom('1.5 kg potatoes').key).toBe('potatoe');
    expect(ingKey('Raw Chicken Breasts, cubed')).toBe('chicken breasts cubed'.replace('breasts', 'breast'));
  });
});

describe('suggestions', () => {
  it('ranks recipes sharing ingredients with the plan above unrelated ones', () => {
    const w = planWeek([['mp-240', 8]]); // Korean BBQ Chicken (gochujang, soy, sesame...)
    const cov = coverage(w, {});
    const ranked = rankSuggestions(cov, { exclude: new Set(['mp-240']) });
    const korean = ranked.findIndex((s) => /korean/i.test(s.recipe.title));
    const smoothie = ranked.findIndex((s) => /smoothie/i.test(s.recipe.title));
    expect(korean).toBeGreaterThanOrEqual(0);
    expect(korean).toBeLessThan(smoothie);
    const top = ranked[0];
    expect(top.reuseRatio).toBeGreaterThan(0.4);
    expect(explain(top).headline).toMatch(/new item|Nothing new/);
  });
  it('counts pantry as covered', () => {
    const r = RECIPE_BY_ID['cb-5'];
    const none = rankSuggestions(coverage(undefined, {}), { candidates: [r] })[0];
    const pantry = Object.fromEntries(r.keys.map((k) => [k, { key: k, name: k, aisle: 'Other', addedAt: 1, source: 'manual' as const }]));
    const all = rankSuggestions(coverage(undefined, pantry), { candidates: [r] })[0];
    expect(none.newItems.length).toBe(r.keys.length);
    expect(all.newItems.length).toBe(0);
    expect(explain(all).headline).toBe('Nothing new to buy');
  });
});

describe('timers', () => {
  it('finds durations in step text', () => {
    const t = timersIn('Cook for 3-4 minutes on each side, then rest for 1 hour. Stir 10 seconds.');
    expect(t.map((x) => x.secs)).toEqual([240, 3600, 10].filter((s) => s >= 15));
    expect(t[0].label).toBe('3–4 min');
    expect(clockText(3661)).toBe('1:01:01');
    expect(clockText(59)).toBe('0:59');
  });
});
