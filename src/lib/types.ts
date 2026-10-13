// Shared domain types for the Cookbook app.

export type Ingredient = {
  raw: string;
  qty: number | null;
  unit: string; // '' | g | kg | ml | l | oz | lb | tsp | tbsp | cup | clove | slice | piece | can | handful | pinch
  qtyText: string;
  name: string;
  note: string;
  key: string; // normalised dedupe key, e.g. "chicken breast"
  aisle: string;
};

export type IngredientGroup = { name: string; items: Ingredient[] };
export type Step = { n: number; title: string; text: string };
export type Macros = { calories?: number; protein?: number; carbs?: number; fat?: number; variant?: string };
export type RecipeTime = { prep_min: number; cook_min: number; passive_min: number; total_min: number };

export type Recipe = {
  id: string;
  title: string;
  book: 'mealprep' | 'cookbook';
  book_name: string;
  page: number;
  description?: string;
  macros: Macros;
  macro_variants?: Macros[];
  servings?: number;
  servings_text?: string;
  steps: Step[];
  notes: string[];
  extra_sections: { title: string; items: string[] }[];
  time: RecipeTime;
  category: string;
  tags: string[];
  is_protein_prep?: boolean;
  ingredients_only?: boolean;
  ingredients: IngredientGroup[];
  nIngredients: number;
  keys: string[];
};

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export const SLOT_KEYS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type SlotKey = (typeof SLOT_KEYS)[number];

export type Meal = { recipeId: string; servings: number };
export type DayPlan = Partial<Record<SlotKey, Meal>>;

export type Week = {
  id: string; // Monday date, YYYY-MM-DD
  days: Record<DayKey, DayPlan>;
  extras: { id: string; text: string }[];
  checked: Record<string, boolean>; // grocery key -> bought
  have: Record<string, boolean>; // grocery key -> "already have" override for this week
  finishedAt?: number;
  updatedAt: number;
};

export type PantryItem = {
  key: string;
  name: string;
  aisle: string;
  addedAt: number;
  source: 'bought' | 'manual' | 'carried';
};

export type CookProgress = {
  recipeId: string;
  step: number; // 0-based index of the current step
  ticks: Record<string, boolean>; // ingredient key "g.i" -> gathered
  servings: number;
  startedAt: number;
  updatedAt: number;
};

export type CookLogEntry = { recipeId: string; cookedAt: number };

export type Profile = {
  favorites: string[];
  pantry: Record<string, PantryItem>;
  cooking: Record<string, CookProgress>;
  cookLog: CookLogEntry[];
  settings: { slots: SlotKey[] };
  updatedAt: number;
};

export type GrocerySource = { recipeId: string; title: string };

export type GroceryItem = {
  key: string;
  name: string;
  aisle: string;
  qtyStr: string;
  notes: string[];
  sources: GrocerySource[];
  have: boolean; // in pantry or overridden as "already have"
  inPantry: boolean;
  checked: boolean;
  custom?: { id: string };
};

export type Timer = {
  id: string;
  label: string;
  sub: string;
  total: number; // seconds
  remaining: number; // seconds when paused
  endAt: number; // epoch ms when running
  running: boolean;
  done: boolean;
};
