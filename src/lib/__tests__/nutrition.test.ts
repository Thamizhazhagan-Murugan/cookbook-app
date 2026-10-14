import { RECIPES, RECIPE_BY_ID } from '../recipes';
import { ADVICE, DEFAULT_BODY, NUTRIENTS, assess, dayNutrition, foodFor, gaps, gramsOf, recipeNutrition, richRecipes, targetsFor } from '../nutrition';
import type { Ingredient, Week } from '../types';

const ing = (raw: string, qty: number | null, unit: string, name: string, key: string, aisle = 'Produce'): Ingredient => ({ raw, qty, unit, qtyText: '', name, note: '', key, aisle });

test('ingredients map to foods and sensible gram amounts', () => {
  expect(foodFor(ing('', 1, '', 'Chopped Tomatoes', 'tomato', 'Canned, jarred & stock'))).toBe('canned_tomato');
  expect(foodFor(ing('', 1, '', 'Tomato', 'tomato'))).toBe('tomato');
  expect(foodFor(ing('', 1, 'tsp', 'Garlic Powder', 'garlic powder', 'Spices & seasonings'))).toBe('garlic_powder');
  expect(foodFor(ing('', 1, '', 'Garlic Cloves', 'garlic clove'))).toBe('garlic');
  expect(gramsOf(ing('', 800, '', 'Raw Chicken Breast', 'chicken breast', 'Meat & poultry'))).toBe(800); // unit lost in parsing
  expect(gramsOf(ing('', 2, '', 'Eggs', 'egg', 'Dairy & eggs'))).toBeCloseTo(100, -1);
  expect(gramsOf(ing('', 1, 'tbsp', 'Honey', 'honey', 'Sauces, oils & condiments'))).toBeCloseTo(21, 0);
  expect(gramsOf(ing('', null, '', 'Parsley', 'parsley'))).toBeNull();
});

test('per-serving estimate uses the book macros and stays in a sane range', () => {
  const n = recipeNutrition(RECIPE_BY_ID['mp-16']);
  expect(n.perServing.kcal).toBe(597);
  expect(n.perServing.protein).toBe(59);
  expect(n.matched).toBe(n.lines);
  expect(n.perServing.calcium).toBeGreaterThan(200); // cheese + milk
  expect(n.perServing.sodium).toBeGreaterThan(1000);
  for (const r of RECIPES) {
    const x = recipeNutrition(r);
    for (const m of NUTRIENTS) expect(Number.isFinite(x.perServing[m.id])).toBe(true);
    expect(x.perServing.kcal).toBeLessThan(2500);
  }
});

test('targets follow sex, age and goal', () => {
  const m = targetsFor(DEFAULT_BODY);
  expect(m.kcal.value).toBeGreaterThan(2400);
  expect(m.protein.value).toBe(120);
  expect(m.iron.value).toBe(8);
  const f = targetsFor({ ...DEFAULT_BODY, sex: 'female', weightKg: 60, goal: 'lose' });
  expect(f.iron.value).toBe(18);
  expect(f.kcal.value).toBeLessThan(m.kcal.value);
  expect(f.sodium.kind).toBe('max');
});

test('a planned day is assessed and gaps come with advice', () => {
  const week = { id: 'w', days: { mon: { lunch: { recipeId: 'mp-18', servings: 1 }, dinner: { recipeId: 'mp-16', servings: 4 } }, tue: {}, wed: {}, thu: {}, fri: {}, sat: {}, sun: {} }, extras: [], checked: {}, have: {}, updatedAt: 0 } as unknown as Week;
  const d = dayNutrition(week, 'mon', RECIPE_BY_ID);
  expect(d.meals).toBe(2);
  expect(d.totals.kcal).toBe(597 + (RECIPE_BY_ID['mp-18'].macros.calories ?? 0)); // one serving each, whatever was cooked
  const a = assess(d.totals, targetsFor(DEFAULT_BODY));
  const g = gaps(a);
  expect(g.length).toBeGreaterThan(0);
  expect(g.find((x) => x.id === 'vitD')?.status).toBe('low');
  for (const x of g) expect(ADVICE[x.id].supplement.length).toBeGreaterThan(10);
  expect(richRecipes('vitD', 3).every((r) => recipeNutrition(r).perServing.vitD > 0)).toBe(true);
  expect(dayNutrition(undefined, 'mon', RECIPE_BY_ID).meals).toBe(0);
});
