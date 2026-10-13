// Grocery engine: merges the week's recipes into one shopping list, aware of the pantry.
import { SKIP, buyPlan, fmtStock, packFor, toBase, type Pack } from './packs';
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
  k = k.replace(/\b(raw|fresh|uncooked|cooked|boneless|skinless|large|medium|small|any|chopped|diced|minced|sliced|grated|shredded|crushed|finely|roughly|of choice|your choice|optional|to taste|each|handful|some|a few|juice of|zest of|juice|zest|whole|squeezed|freshly|pinch of|pinch)\b/g, ' ');
  k = k.replace(/\bor\b.*$/, '');
  k = k.replace(/\b\d+(\s*\/\s*\d+)?\b/g, ' ');
  k = k.replace(/^\s*of\s+/, '').replace(/\s+/g, ' ').trim();
  k = k
    .split(' ')
    .map((w) => (w.length > 3 && w.endsWith('oes') ? w.slice(0, -2) : w.length > 3 && w.endsWith('ies') ? `${w.slice(0, -3)}y` : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .filter(Boolean)
    .join(' ') || name.toLowerCase();
  if (/^(salt( and| &)? (black )?pepper|salt pepper|sea salt|himalayan salt|kosher salt)$/.test(k)) k = 'salt';
  if (/\blemon\b/.test(k) && !/pepper|grass|curd/.test(k)) k = 'lemon';
  if (/\blime\b/.test(k) && !/leaf|leave/.test(k)) k = 'lime';
  if (/^(whole |large |medium )?eggs?$/.test(k)) k = 'egg';
  return k;
}

export type BuildOptions = {
  pantry: Record<string, PantryItem>;
  recipes?: Record<string, Recipe>;
  /** Amounts (base units) still needed by earlier weeks that have been shopped but not yet eaten. */
  reserved?: Record<string, number>;
};

/** What weeks before `weekId` — shopped, not yet consumed — will still use from the pantry. */
export function reservedBefore(weeks: Record<string, Week>, weekId: string, recipes: Record<string, Recipe> = RECIPE_BY_ID): Record<string, number> {
  const out: Record<string, number> = {};
  for (const w of Object.values(weeks)) {
    if (w.id >= weekId || !w.finishedAt || w.consumedAt) continue;
    for (const [k, v] of Object.entries(weekUsage(w, recipes))) out[k] = (out[k] || 0) + v;
  }
  return out;
}

/** Stock of a pantry item in its pack's base unit. Legacy items without a quantity count as one pack. */
export function pantryQty(item: PantryItem | undefined, pack: Pack): number {
  if (!item) return 0;
  if (item.qty == null) return pack.size;
  return item.unit && item.unit !== pack.unit ? pack.size : item.qty;
}

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
        if (SKIP.test(key)) continue;
        if (!acc.has(key)) acc.set(key, { key, name: ing.name, aisle: ing.aisle, parts: [], sources: new Map() });
        const a = acc.get(key)!;
        a.parts.push({ qty: ing.qty != null ? ing.qty * f : null, unit: ing.unit, qtyText: ing.qtyText ? scaleText(ing.qtyText, f) : '', note: ing.note });
        a.sources.set(r.id, r.title);
      }
    }
  }

  const list: GroceryItem[] = [];
  for (const a of acc.values()) {
    const pack = packFor(a.key, a.name, a.aisle);
    // recipe need in base units; unknown parts (e.g. "handful") count as unknown unless others are known
    let needBase: number | null = 0;
    let known = false;
    for (const p of a.parts) {
      const b = toBase(p.qty, p.unit, pack);
      if (b != null) {
        needBase += b;
        known = true;
      }
    }
    if (!known) needBase = null;
    const item = opts.pantry[a.key];
    const inPantry = !!item && pantryQty(item, pack) > 0;
    const haveBase = inPantry ? Math.max(0, pantryQty(item, pack) - (opts.reserved?.[a.key] || 0)) : 0;
    const buy = buyPlan(needBase, haveBase, pack, a.name);
    const override = week.have[a.key];
    const have = override != null ? override : buy == null;
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
      needBase,
      haveBase,
      haveText: haveBase > 0 ? fmtStock(haveBase, pack, a.name) : '',
      buy: have ? null : buy ?? buyPlan(needBase, 0, pack, a.name),
      packUnit: pack.unit,
    });
  }
  for (const c of week.extras) {
    const p = parseCustom(c.text);
    const key = `custom:${c.id}`;
    list.push({ key, name: p.name, aisle: 'Added by you', qtyStr: p.qtyText, notes: [], sources: [], have: false, inPantry: false, checked: !!week.checked[key], custom: { id: c.id }, needBase: null, haveBase: 0, haveText: '', buy: null, packUnit: 'count' });
  }
  list.sort((x, y) => AISLE_ORDER.indexOf(x.aisle) - AISLE_ORDER.indexOf(y.aisle) || x.name.localeCompare(y.name));
  return list;
}

/** Amount of each ingredient (base units) a week's meals use — what cooking the plan takes out of the pantry. */
export function weekUsage(week: Week, recipes: Record<string, Recipe> = RECIPE_BY_ID): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [recipeId, servings] of Object.entries(servingsByRecipe(week))) {
    const r = recipes[recipeId];
    if (!r) continue;
    const f = r.servings && servings ? servings / r.servings : 1;
    for (const g of r.ingredients)
      for (const ing of g.items) {
        if (SKIP.test(ing.key)) continue;
        const pack = packFor(ing.key, ing.name, ing.aisle);
        const b = toBase(ing.qty != null ? ing.qty * f : null, ing.unit, pack) ?? (pack.unit === 'count' ? 1 : null);
        if (b != null) out[ing.key] = (out[ing.key] || 0) + b;
      }
  }
  return out;
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
    for (const i of g.items) lines.push(`☐ ${i.buy ? `${i.buy.label} ` : i.qtyStr ? `${i.qtyStr} ` : ''}${i.name}${i.qtyStr && i.buy ? ` (need ${i.qtyStr})` : ''}${i.notes.length ? ` (${i.notes.join('; ')})` : ''}`);
    lines.push('');
  }
  if (have.length) {
    lines.push('ALREADY HAVE');
    for (const i of have) lines.push(`✓ ${i.name}`);
  }
  return lines.join('\n').trim();
}

/** Everything ticked as bought this week goes into the pantry with the amount bought. */
export function carryOverCandidates(items: GroceryItem[]): GroceryItem[] {
  return items.filter((i) => i.checked && !i.custom);
}

/** "Handful Shredded Lettuce or choice of leafy veg" → "Lettuce" — a tidy name for the pantry. */
export function pantryName(name: string): string {
  let n = name.replace(/\s*(,| - | – | or ).*$/i, '');
  n = n.replace(/^(?:(chopped|handful( of)?|raw|sliced|diced|grated|shredded|uncooked|cooked|large|small|medium|a few|some|boneless|skinless|cubed|crushed)\s+)+/i, '');
  n = n.replace(/\s+(chopped|sliced|diced|grated|shredded|cubed|crushed|juiced)$/i, '').trim();
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : name;
}

export function pantryItemFrom(i: { key: string; name: string; aisle: string }, source: PantryItem['source'], qty?: number, unit?: PantryItem['unit']): PantryItem {
  const pack = packFor(i.key, i.name, i.aisle);
  return { key: i.key, name: pantryName(i.name), aisle: i.aisle, addedAt: Date.now(), updatedAt: Date.now(), source, qty: qty ?? pack.size, unit: unit ?? pack.unit };
}

/** Add a bought amount to an existing pantry entry (or create it). */
export function addToPantry(existing: PantryItem | undefined, i: { key: string; name: string; aisle: string }, amountBase: number, source: PantryItem['source']): PantryItem {
  const pack = packFor(i.key, i.name, i.aisle);
  const cur = pantryQty(existing, pack);
  return { ...(existing || {}), key: i.key, name: existing?.name || pantryName(i.name), aisle: i.aisle, addedAt: existing?.addedAt ?? Date.now(), updatedAt: Date.now(), source, qty: cur + amountBase, unit: pack.unit };
}

export function ingredientFromCustom(text: string): Ingredient {
  const p = parseCustom(text);
  return { raw: text, qty: null, unit: '', qtyText: p.qtyText, name: p.name, note: '', key: p.key, aisle: 'Other' };
}
