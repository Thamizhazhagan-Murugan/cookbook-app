// Grocery engine: merges the week's recipes into one shopping list, aware of the pantry.
import { RECIPE_BY_ID } from './recipes';
import { sumQuantities, scaleText } from './quantities';
import type { GroceryItem, Ingredient, PantryItem, Recipe, Week } from './types';
import { servingsByRecipe } from './week';

export const AISLE_ORDER = [
  'Produce',
  'Meat & poultry',
  'Seafood',
  'Dairy & eggs',
  'Bakery & wraps',
  'Rice, pasta & grains',
  'Canned, jarred & stock',
  'Sauces, oils & condiments',
  'Spices & seasonings',
  'Baking, nuts & seeds',
  'Frozen',
  'Other',
  'Added by you',
];

/** Aisles whose items keep for weeks — buying once covers several weeks. */
export const STAPLE_AISLES = new Set(['Spices & seasonings', 'Sauces, oils & condiments', 'Baking, nuts & seeds', 'Canned, jarred & stock']);

/** How much it "costs" to add a new ingredient of this aisle to the shopping (used by suggestions). */
export const AISLE_WEIGHT: Record<string, number> = {
  'Meat & poultry': 3,
  Seafood: 3,
  Produce: 2,
  'Dairy & eggs': 2,
  'Bakery & wraps': 2,
  'Rice, pasta & grains': 1.5,
  Frozen: 1.5,
  'Canned, jarred & stock': 1,
  'Sauces, oils & condiments': 1,
  Other: 1,
  'Spices & seasonings': 0.5,
  'Baking, nuts & seeds': 0.5,
};

const CUSTOM_UNITS = /^((?:\d+\s+)?\d+\/\d+|[½¼¾⅓⅔⅛]|\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|lbs?|tsp|tbsp|cups?|cloves?|slices?|pieces?|cans?|x)?\b\.?\s*(?:of\s+)?(.*)$/i;

/** Minimal parser for items the person types themselves. */
export function parseCustom(text: string): { name: string; qtyText: string; key: string } {
  const s = text.replace(/\s+/g, ' ').trim();
  const m = s.match(CUSTOM_UNITS);
  const name = m ? m[3].trim() || s : s;
  const qtyText = m ? `${m[1]}${m[2] ? ` ${m[2]}` : ''}` : '';
  return { name, qtyText, key: ingKey(name) };
}

export function ingKey(name: string): string {
  let k = name.toLowerCase().replace(/[^a-z0-9%\s]/g, ' ');
  k = k.replace(/\b(raw|fresh|uncooked|cooked|boneless|skinless|large|medium|small|any|chopped|diced|minced|sliced|grated|shredded|crushed|finely|roughly|of choice|your choice|optional|to taste|each|handful|some|a few|juice of|zest of)\b/g, ' ');
  k = k.replace(/\bor\b.*$/, '').replace(/\s+/g, ' ').trim();
  k = k
    .split(' ')
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .join(' ');
  return k || name.toLowerCase();
}

export type BuildOptions = {
  pantry: Record<string, PantryItem>;
  recipes?: Record<string, Recipe>;
};

/** Build the merged grocery list for a week. */
export function buildGroceryList(week: Week | undefined, opts: BuildOptions): GroceryItem[] {
  if (!week) return [];
  const recipes = opts.recipes || RECIPE_BY_ID;
  const byRecipe = servingsByRecipe(week);
  type Acc = { key: string; name: string; aisle: string; parts: { qty: number | null; unit: string; qtyText: string; note: string }[]; sources: Map<string, string> };
  const acc = new Map<string, Acc>();

  for (const [recipeId, servings] of Object.entries(byRecipe)) {
    const r = recipes[recipeId];
    if (!r) continue;
    const f = r.servings && servings ? servings / r.servings : 1;
    for (const g of r.ingredients) {
      for (const ing of g.items) {
        const key = ing.key;
        if (!acc.has(key)) acc.set(key, { key, name: ing.name, aisle: ing.aisle, parts: [], sources: new Map() });
        const a = acc.get(key)!;
        a.parts.push({ qty: ing.qty != null ? ing.qty * f : null, unit: ing.unit, qtyText: ing.qtyText ? scaleText(ing.qtyText, f) : '', note: ing.note });
        a.sources.set(r.id, r.title);
      }
    }
  }

  const list: GroceryItem[] = [];
  for (const a of acc.values()) {
    const inPantry = !!opts.pantry[a.key];
    const override = week.have[a.key];
    const have = override != null ? override : inPantry;
    list.push({
      key: a.key,
      name: a.name,
      aisle: a.aisle,
      qtyStr: sumQuantities(a.parts),
      notes: [...new Set(a.parts.map((p) => p.note).filter(Boolean))],
      sources: [...a.sources.entries()].map(([recipeId, title]) => ({ recipeId, title })),
      have,
      inPantry,
      checked: !!week.checked[a.key],
    });
  }
  for (const c of week.extras) {
    const p = parseCustom(c.text);
    const key = `custom:${c.id}`;
    list.push({ key, name: p.name, aisle: 'Added by you', qtyStr: p.qtyText, notes: [], sources: [], have: false, inPantry: false, checked: !!week.checked[key], custom: { id: c.id } });
  }
  list.sort((x, y) => AISLE_ORDER.indexOf(x.aisle) - AISLE_ORDER.indexOf(y.aisle) || x.name.localeCompare(y.name));
  return list;
}

export type GroupedList = { aisle: string; items: GroceryItem[] }[];

export function groupByAisle(items: GroceryItem[]): GroupedList {
  const by = new Map<string, GroceryItem[]>();
  for (const i of items) {
    if (!by.has(i.aisle)) by.set(i.aisle, []);
    by.get(i.aisle)!.push(i);
  }
  return AISLE_ORDER.filter((a) => by.has(a)).map((a) => ({ aisle: a, items: by.get(a)! }));
}

export function splitList(items: GroceryItem[]) {
  return {
    toBuy: items.filter((i) => !i.have && !i.checked),
    bought: items.filter((i) => !i.have && i.checked),
    have: items.filter((i) => i.have),
  };
}

export function listAsText(items: GroceryItem[], title: string): string {
  const { toBuy, have } = splitList(items);
  const lines: string[] = [title, ''];
  for (const g of groupByAisle(toBuy)) {
    lines.push(g.aisle.toUpperCase());
    for (const i of g.items) lines.push(`☐ ${i.qtyStr ? `${i.qtyStr} ` : ''}${i.name}${i.notes.length ? ` (${i.notes.join('; ')})` : ''}`);
    lines.push('');
  }
  if (have.length) {
    lines.push('ALREADY HAVE');
    for (const i of have) lines.push(`✓ ${i.name}`);
  }
  return lines.join('\n').trim();
}

/** Items bought this week that are worth keeping in the pantry (staples last for weeks). */
export function carryOverCandidates(items: GroceryItem[]): GroceryItem[] {
  return items.filter((i) => i.checked && !i.custom && STAPLE_AISLES.has(i.aisle));
}

export function pantryItemFrom(i: { key: string; name: string; aisle: string }, source: PantryItem['source']): PantryItem {
  return { key: i.key, name: i.name, aisle: i.aisle, addedAt: Date.now(), source };
}

export function ingredientFromCustom(text: string): Ingredient {
  const p = parseCustom(text);
  return { raw: text, qty: null, unit: '', qtyText: p.qtyText, name: p.name, note: '', key: p.key, aisle: 'Other' };
}
