// Nutrition: estimates vitamins & minerals per recipe from its ingredients (foods.json holds
// per-100 g reference values), totals a planned day, compares it with daily targets and
// explains what would close any gap. Calories/protein/carbs/fat come from the books where given.
import foodsData from '@/data/foods.json';
import { packFor, toBase } from './packs';
import { RECIPES } from './recipes';
import type { BodyProfile, DayKey, Ingredient, Recipe, Week } from './types';

export type NutrientId =
  | 'kcal' | 'protein' | 'carbs' | 'fat' | 'satfat' | 'fibre' | 'sugar' | 'sodium' | 'potassium' | 'calcium' | 'iron' | 'magnesium' | 'zinc'
  | 'vitA' | 'vitC' | 'vitD' | 'vitE' | 'vitK' | 'b6' | 'folate' | 'b12';

export type Group = 'macro' | 'limit' | 'vitamin' | 'mineral';
export type NutrientMeta = { id: NutrientId; label: string; unit: string; group: Group; dp: number; short?: string };

export const NUTRIENTS: NutrientMeta[] = [
  { id: 'kcal', label: 'Calories', unit: 'kcal', group: 'macro', dp: 0 },
  { id: 'protein', label: 'Protein', unit: 'g', group: 'macro', dp: 0 },
  { id: 'carbs', label: 'Carbs', unit: 'g', group: 'macro', dp: 0 },
  { id: 'fat', label: 'Fat', unit: 'g', group: 'macro', dp: 0 },
  { id: 'fibre', label: 'Fibre', unit: 'g', group: 'macro', dp: 0 },
  { id: 'satfat', label: 'Saturated fat', unit: 'g', group: 'limit', dp: 0 },
  { id: 'sugar', label: 'Sugar', unit: 'g', group: 'limit', dp: 0 },
  { id: 'sodium', label: 'Sodium', unit: 'mg', group: 'limit', dp: 0 },
  { id: 'vitA', label: 'Vitamin A', unit: 'µg', group: 'vitamin', dp: 0 },
  { id: 'vitC', label: 'Vitamin C', unit: 'mg', group: 'vitamin', dp: 0 },
  { id: 'vitD', label: 'Vitamin D', unit: 'µg', group: 'vitamin', dp: 1 },
  { id: 'vitE', label: 'Vitamin E', unit: 'mg', group: 'vitamin', dp: 1 },
  { id: 'vitK', label: 'Vitamin K', unit: 'µg', group: 'vitamin', dp: 0 },
  { id: 'b6', label: 'Vitamin B6', unit: 'mg', group: 'vitamin', dp: 1 },
  { id: 'folate', label: 'Folate (B9)', unit: 'µg', group: 'vitamin', dp: 0 },
  { id: 'b12', label: 'Vitamin B12', unit: 'µg', group: 'vitamin', dp: 1 },
  { id: 'potassium', label: 'Potassium', unit: 'mg', group: 'mineral', dp: 0 },
  { id: 'calcium', label: 'Calcium', unit: 'mg', group: 'mineral', dp: 0 },
  { id: 'iron', label: 'Iron', unit: 'mg', group: 'mineral', dp: 1 },
  { id: 'magnesium', label: 'Magnesium', unit: 'mg', group: 'mineral', dp: 0 },
  { id: 'zinc', label: 'Zinc', unit: 'mg', group: 'mineral', dp: 1 },
];
export const NUTRIENT_BY_ID: Record<NutrientId, NutrientMeta> = Object.fromEntries(NUTRIENTS.map((n) => [n.id, n])) as Record<NutrientId, NutrientMeta>;

export type Totals = Record<NutrientId, number>;
export const zero = (): Totals => Object.fromEntries(NUTRIENTS.map((n) => [n.id, 0])) as Totals;
export const addTo = (a: Totals, b: Totals, k = 1): Totals => {
  for (const n of NUTRIENTS) a[n.id] += b[n.id] * k;
  return a;
};

/* ------------------------------------------------------------------ foods */

type FoodRow = { v: number[]; unitG?: number; tspG?: number };
type FoodsFile = { fields: string[]; foods: Record<string, FoodRow>; rules: [string, string][]; aisleDefault: Record<string, string | null> };
const FOODS = foodsData as unknown as FoodsFile;
const FIELD_INDEX = Object.fromEntries(FOODS.fields.map((f, i) => [f, i])) as Record<NutrientId, number>;
const RULES: [RegExp, string][] = FOODS.rules.map(([p, f]) => [new RegExp(p), f]);
const foodCache = new Map<string, string | null>();

export function foodFor(ing: Pick<Ingredient, 'key' | 'name' | 'aisle'>): string | null {
  const ck = `${ing.key}|${ing.name}`;
  const hit = foodCache.get(ck);
  if (hit !== undefined) return hit;
  const hay = `${ing.key} | ${ing.name.toLowerCase()}`;
  let found: string | null = null;
  for (const [re, f] of RULES) {
    if (re.test(hay)) {
      found = f;
      break;
    }
  }
  if (!found) found = FOODS.aisleDefault[ing.aisle] ?? null;
  foodCache.set(ck, found);
  return found;
}

/** Best-guess grams of an ingredient line, or null when the book gives no quantity. */
export function gramsOf(ing: Ingredient): number | null {
  if (ing.qty == null) return null;
  const foodId = foodFor(ing);
  const food = foodId ? FOODS.foods[foodId] : undefined;
  const pack = packFor(ing.key, ing.name, ing.aisle);
  if ((ing.unit === 'tsp' || ing.unit === 'tbsp') && food?.tspG) return ing.qty * food.tspG * (ing.unit === 'tbsp' ? 3 : 1);
  if (ing.unit === '') {
    // "800 (28oz) chicken" lost its unit in parsing — a count that large is grams; otherwise it's pieces
    if (ing.qty > 12) return ing.qty;
    return ing.qty * (pack.unit === 'count' ? (pack.perUnitG ?? food?.unitG ?? 50) : (food?.unitG ?? 30));
  }
  const base = toBase(ing.qty, ing.unit, pack);
  if (base == null) return null;
  if (pack.unit === 'count') return base * (pack.perUnitG ?? food?.unitG ?? 50);
  return Math.min(base, 3000); // g, or ml ≈ g
}

/* --------------------------------------------------------------- recipes */

export type RecipeNutrition = {
  perServing: Totals;
  servings: number;
  /** ingredient lines that contributed / total lines (garnish-style lines without amounts don't) */
  matched: number;
  lines: number;
  fromBook: boolean; // kcal/protein/carbs/fat taken from the book
};

const recipeCache = new Map<string, RecipeNutrition>();

export function recipeNutrition(r: Recipe): RecipeNutrition {
  const hit = recipeCache.get(r.id);
  if (hit) return hit;
  const batch = zero();
  let lines = 0;
  let matched = 0;
  for (const g of r.ingredients) {
    for (const ing of g.items) {
      lines++;
      const foodId = foodFor(ing);
      const grams = gramsOf(ing);
      if (!foodId || grams == null) continue;
      const row = FOODS.foods[foodId];
      if (!row) continue;
      matched++;
      for (const n of NUTRIENTS) batch[n.id] += (row.v[FIELD_INDEX[n.id]] * grams) / 100;
    }
  }
  const bookKcal = r.macros.calories ?? null;
  let servings = r.servings ?? 0;
  if (!servings) servings = bookKcal && batch.kcal > 0 ? Math.max(1, Math.round(batch.kcal / bookKcal)) : 1;
  const perServing = zero();
  for (const n of NUTRIENTS) perServing[n.id] = batch[n.id] / servings;
  const fromBook = r.macros.calories != null;
  // Calibrate: the book's per-serving calories are the author's intent; if our ingredient maths lands
  // elsewhere (serving count, a parsed-out unit) scale the estimate so vitamins stay in proportion.
  if (fromBook && bookKcal && perServing.kcal > 0 && matched / Math.max(1, lines) >= 0.8) {
    const f = Math.min(3, Math.max(0.33, bookKcal / perServing.kcal));
    for (const n of NUTRIENTS) perServing[n.id] *= f;
  }
  if (fromBook) {
    perServing.kcal = r.macros.calories ?? perServing.kcal;
    perServing.protein = r.macros.protein ?? perServing.protein;
    perServing.carbs = r.macros.carbs ?? perServing.carbs;
    perServing.fat = r.macros.fat ?? perServing.fat;
  }
  const out = { perServing, servings, matched, lines, fromBook };
  recipeCache.set(r.id, out);
  return out;
}

/** One serving of every meal planned on a day (what one person eats), plus how complete the estimate is. */
export function dayNutrition(week: Week | undefined, day: DayKey, recipes: Record<string, Recipe>): { totals: Totals; meals: number; matched: number; lines: number } {
  const totals = zero();
  let meals = 0;
  let matched = 0;
  let lines = 0;
  const plan = week?.days[day] ?? {};
  for (const meal of Object.values(plan)) {
    if (!meal) continue;
    const r = recipes[meal.recipeId];
    if (!r) continue;
    const n = recipeNutrition(r);
    addTo(totals, n.perServing, 1);
    meals++;
    matched += n.matched;
    lines += n.lines;
  }
  return { totals, meals, matched, lines };
}

/* --------------------------------------------------------------- targets */

export type Sex = BodyProfile['sex'];
export type Activity = BodyProfile['activity'];
export type Goal = BodyProfile['goal'];
export type { BodyProfile };

export const ACTIVITY: { key: Activity; label: string; factor: number; hint: string }[] = [
  { key: 'sedentary', label: 'Sedentary', factor: 1.2, hint: 'desk job, little exercise' },
  { key: 'light', label: 'Light', factor: 1.375, hint: '1–3 workouts a week' },
  { key: 'moderate', label: 'Moderate', factor: 1.55, hint: '3–5 workouts a week' },
  { key: 'active', label: 'Active', factor: 1.725, hint: 'hard training or physical job' },
  { key: 'very', label: 'Very active', factor: 1.9, hint: 'physical job + daily training' },
];
export const GOALS: { key: Goal; label: string; factor: number }[] = [
  { key: 'lose', label: 'Lose fat', factor: 0.85 },
  { key: 'maintain', label: 'Maintain', factor: 1 },
  { key: 'gain', label: 'Build muscle', factor: 1.1 },
];

export type Target = { value: number; kind: 'min' | 'max' };
export type Targets = Record<NutrientId, Target>;

/** Daily targets: Mifflin-St Jeor for energy, protein by body weight, DRI/RDA values for the rest. */
export function targetsFor(b: BodyProfile): Targets {
  const male = b.sex === 'male';
  const bmr = 10 * b.weightKg + 6.25 * b.heightCm - 5 * b.age + (male ? 5 : -161);
  const act = ACTIVITY.find((a) => a.key === b.activity)?.factor ?? 1.55;
  const goal = GOALS.find((g) => g.key === b.goal)?.factor ?? 1;
  const kcal = Math.round((bmr * act * goal) / 10) * 10;
  const protein = Math.round(b.weightKg * b.proteinPerKg);
  const fat = Math.round((kcal * 0.28) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const older = b.age >= 51;
  const min = (value: number): Target => ({ value, kind: 'min' });
  const max = (value: number): Target => ({ value, kind: 'max' });
  return {
    kcal: min(kcal),
    protein: min(protein),
    carbs: min(carbs),
    fat: min(fat),
    fibre: min(male ? (older ? 30 : 38) : older ? 21 : 25),
    satfat: max(Math.round((kcal * 0.1) / 9)),
    sugar: max(Math.round((kcal * 0.1) / 4)),
    sodium: max(2300),
    vitA: min(male ? 900 : 700),
    vitC: min(male ? 90 : 75),
    vitD: min(b.age >= 71 ? 20 : 15),
    vitE: min(15),
    vitK: min(male ? 120 : 90),
    b6: min(older ? (male ? 1.7 : 1.5) : 1.3),
    folate: min(400),
    b12: min(2.4),
    potassium: min(male ? 3400 : 2600),
    calcium: min(older && (!male || b.age >= 71) ? 1200 : 1000),
    iron: min(male ? 8 : older ? 8 : 18),
    magnesium: min(male ? (b.age >= 31 ? 420 : 400) : b.age >= 31 ? 320 : 310),
    zinc: min(male ? 11 : 8),
  };
}

export const DEFAULT_BODY: BodyProfile = { sex: 'male', age: 30, heightCm: 175, weightKg: 75, activity: 'moderate', goal: 'maintain', proteinPerKg: 1.6 };

/* ------------------------------------------------------------ assessment */

export type Status = 'met' | 'close' | 'low' | 'ok' | 'over';
export type Assessment = { id: NutrientId; value: number; target: Target; pct: number; status: Status };

export function assess(totals: Totals, targets: Targets): Assessment[] {
  return NUTRIENTS.map((n) => {
    const t = targets[n.id];
    const value = totals[n.id];
    const pct = t.value > 0 ? value / t.value : 0;
    let status: Status;
    if (t.kind === 'max') status = pct <= 1 ? 'ok' : 'over';
    else status = pct >= 1 ? 'met' : pct >= 0.7 ? 'close' : 'low';
    return { id: n.id, value, target: t, pct, status };
  });
}

export const fmtAmount = (id: NutrientId, v: number): string => {
  const m = NUTRIENT_BY_ID[id];
  const r = m.dp ? v.toFixed(m.dp) : Math.round(v).toLocaleString();
  return `${r} ${m.unit}`;
};

/* ---------------------------------------------------------- suggestions */

export type Advice = { foods: string; supplement: string; caution?: string };

/** General information to close a gap — not medical advice; iron and vitamin A in particular need care. */
export const ADVICE: Record<NutrientId, Advice> = {
  kcal: { foods: 'Add a snack or a bigger portion — rice, potatoes, oats, nuts, olive oil are easy calories.', supplement: 'No supplement needed — food does this better. A protein shake with milk and a banana adds ~400 kcal if you struggle to eat enough.' },
  protein: { foods: 'Add a protein-heavy meal (chicken, beef, salmon, eggs, Greek yogurt, cottage cheese) or a bigger portion.', supplement: 'Whey or plant protein shake — one scoop is ~25 g protein. Clear whey is easiest if you dislike milky shakes.' },
  carbs: { foods: 'Rice, potatoes, pasta, oats, fruit, wraps.', supplement: 'None needed. If training hard, a banana or oats before/after sessions is enough.' },
  fat: { foods: 'Olive oil, avocado, nuts, seeds, salmon, whole eggs.', supplement: 'Fish oil (omega-3, ~1 g EPA+DHA a day) is the one fat supplement worth considering if you rarely eat oily fish.' },
  fibre: { foods: 'Oats, beans and lentils, berries, vegetables, high-fibre wraps, chia seeds.', supplement: 'Psyllium husk (5–10 g in water) — start small and increase slowly, with plenty of water.' },
  satfat: { foods: 'Swap butter and full-fat cheese for olive oil and lighter cheese; trim fat off meat.', supplement: 'Nothing to take — this is a “keep it under” nutrient.' },
  sugar: { foods: 'Cut back on honey, sweet sauces, juice and sweetened yogurt.', supplement: 'Nothing to take — this is a “keep it under” nutrient.' },
  sodium: { foods: 'Go easy on salt, soy sauce, stock cubes and pickles; rinse canned beans; use lemon, herbs and chilli for flavour.', supplement: 'Nothing to take — drink water and favour potassium-rich foods (potatoes, bananas, yogurt).' },
  vitA: { foods: 'Carrots, sweet potato, spinach, red pepper, eggs, paprika-heavy dishes.', supplement: 'A basic multivitamin covers it (as beta-carotene).', caution: 'Avoid high-dose vitamin A (retinol) supplements — it builds up in the body.' },
  vitC: { foods: 'Red pepper, broccoli, citrus, strawberries, kiwi, tomatoes.', supplement: 'Vitamin C 100–200 mg a day is plenty; more is simply excreted.' },
  vitD: { foods: 'Salmon, fortified milk, eggs — food alone rarely gets there, especially in a Canadian winter.', supplement: 'Vitamin D3 1,000–2,000 IU (25–50 µg) a day is the standard recommendation; take it with a meal that has some fat.' },
  vitE: { foods: 'Almonds, sunflower seeds, olive oil, avocado, spinach, paprika.', supplement: 'A handful of almonds beats a pill; a multivitamin covers the rest.' },
  vitK: { foods: 'Spinach, kale, lettuce, broccoli, parsley, green onion — a green side dish fixes it.', supplement: 'Rarely needed; found in most multivitamins.', caution: 'If you take a blood thinner (warfarin), keep vitamin K steady and talk to your doctor.' },
  b6: { foods: 'Chicken, salmon, potatoes, bananas, chickpeas.', supplement: 'B-complex or multivitamin.', caution: 'Keep B6 under 100 mg a day — high doses over time can affect nerves.' },
  folate: { foods: 'Spinach, lentils, beans, asparagus, broccoli, avocado, fortified bread.', supplement: 'Folic acid 400 µg, or a B-complex / multivitamin.' },
  b12: { foods: 'Beef, salmon, eggs, dairy, fortified plant milks and cereals.', supplement: 'B12 (cyanocobalamin or methylcobalamin) 250–1,000 µg — especially if you eat little meat or dairy.' },
  potassium: { foods: 'Potatoes, bananas, beans, yogurt, spinach, tomato paste, avocado, salmon.', supplement: 'Supplements are capped at 99 mg per pill, so food is the only real fix — one potato and a banana add ~800 mg.' },
  calcium: { foods: 'Milk, yogurt, cheese, fortified plant milk, tofu, sesame seeds, broccoli.', supplement: 'Calcium citrate 500 mg (one dose; the body absorbs ~500 mg at a time), ideally with vitamin D.', caution: 'Food first — calcium pills above what you need are linked to kidney stones.' },
  iron: { foods: 'Beef, lentils, beans, spinach, tofu, fortified cereal — pair with vitamin C (peppers, citrus) to absorb more.', supplement: 'Iron 18–27 mg (ferrous sulfate or bisglycinate) if a blood test shows you are low.', caution: 'Don’t start iron pills without a blood test — too much iron is harmful, and men rarely need it.' },
  magnesium: { foods: 'Pumpkin and sesame seeds, almonds, cashews, oats, beans, spinach, dark chocolate.', supplement: 'Magnesium glycinate or citrate 200–300 mg in the evening (citrate loosens the bowels; glycinate is gentler).' },
  zinc: { foods: 'Beef, shrimp, chickpeas, oats, cashews, seeds, cheese.', supplement: 'Zinc 10–15 mg (picolinate or citrate) with food.', caution: 'Stay under 40 mg a day — long-term high zinc lowers copper.' },
};

/** Cookbook recipes richest in a nutrient, per serving. */
const richCache = new Map<NutrientId, Recipe[]>();
export function richRecipes(id: NutrientId, n = 3): Recipe[] {
  let list = richCache.get(id);
  if (!list) {
    list = [...RECIPES].filter((r) => !r.ingredients_only).sort((a, b) => recipeNutrition(b).perServing[id] - recipeNutrition(a).perServing[id]);
    richCache.set(id, list);
  }
  return list.slice(0, n);
}

/** Gaps worth acting on, biggest first: "min" nutrients under 80 %, "max" nutrients over. */
export function gaps(a: Assessment[]): Assessment[] {
  return a.filter((x) => (x.target.kind === 'min' ? x.pct < 0.8 : x.pct > 1)).sort((x, y) => (x.target.kind === 'max' ? 1 : 0) - (y.target.kind === 'max' ? 1 : 0) || x.pct - y.pct);
}
