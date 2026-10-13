import { addToPantry, buildGroceryList, pantryName, splitList, weekUsage } from '../grocery';
import { buyPlan, fmtStock, packFor, packLabel, toBase } from '../packs';
import type { PantryItem, Week } from '../types';
import { emptyWeek } from '../week';

const pantryOf = (items: Partial<PantryItem>[]): Record<string, PantryItem> =>
  Object.fromEntries(items.map((i) => [i.key!, { key: i.key!, name: i.name || i.key!, aisle: i.aisle || 'Other', addedAt: 1, source: 'bought', ...i } as PantryItem]));

function planWeek(ids: [string, number][]): Week {
  const w = emptyWeek('2026-10-12');
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
  ids.forEach(([id, servings], i) => {
    w.days[days[i % 7]].dinner = { recipeId: id, servings };
  });
  return w;
}

describe('packs', () => {
  it('maps ingredients to shop packs', () => {
    expect(packFor('olive oil', 'Olive Oil', 'Sauces, oils & condiments').label).toBe('bottle');
    expect(packFor('garlic', 'Minced Garlic', 'Produce').label).toBe('jar'); // jarred minced garlic
    expect(packFor('garlic clove', 'Garlic Cloves', 'Produce').label).toBe('head of garlic');
    expect(packFor('red onion', 'Red Onion', 'Produce')).toMatchObject({ label: 'onion', unit: 'count', perUnitG: 150 });
    expect(packFor('chicken breast', 'Raw Chicken Breast', 'Meat & poultry').soldBy).toBe('weight');
    expect(packFor('paprika', 'Paprika', 'Spices & seasonings')).toMatchObject({ label: 'jar', size: 40 });
    expect(packFor('canned tomato', 'Canned Tomatoes', 'Canned, jarred & stock')).toMatchObject({ label: 'can', size: 800 });
    expect(packFor('whole egg', 'Whole Eggs', 'Dairy & eggs')).toMatchObject({ label: 'dozen', size: 12 });
    expect(packFor('something odd', 'Something Odd', 'Spices & seasonings').label).toBe('jar'); // aisle default
  });
  it('converts recipe amounts into base units', () => {
    const oil = packFor('olive oil', 'Olive Oil', 'Sauces, oils & condiments');
    expect(toBase(2, 'tbsp', oil)).toBe(30);
    expect(toBase(2, 'tsp', oil)).toBe(10);
    const paprika = packFor('paprika', 'Paprika', 'Spices & seasonings');
    expect(toBase(2, 'tsp', paprika)).toBe(5);
    const onion = packFor('red onion', 'Red Onion', 'Produce');
    expect(toBase(150, 'g', onion)).toBe(1);
    expect(toBase(2, '', onion)).toBe(2);
    const garlic = packFor('garlic clove', 'Garlic Cloves', 'Produce');
    expect(toBase(5, 'clove', garlic)).toBeCloseTo(0.5);
    const chicken = packFor('chicken breast', 'Chicken Breast', 'Meat & poultry');
    expect(toBase(28, 'oz', chicken)).toBeCloseTo(793.8);
    expect(toBase(null, 'g', chicken)).toBeNull();
  });
  it('plans purchases in packs and labels them', () => {
    const oil = packFor('olive oil', 'Olive Oil', 'Sauces, oils & condiments');
    expect(buyPlan(30, 0, oil)).toMatchObject({ packs: 1, label: '1 bottle', base: 750 });
    expect(buyPlan(30, 700, oil)).toBeNull(); // plenty left
    expect(buyPlan(30, 10, oil)).toMatchObject({ packs: 1 });
    const chicken = packFor('chicken breast', 'Chicken Breast', 'Meat & poultry');
    expect(buyPlan(1400, 0, chicken)).toMatchObject({ label: '1.4 kg', base: 1400 });
    expect(buyPlan(1400, 500, chicken)).toMatchObject({ label: '900 g' });
    expect(buyPlan(1234, 0, chicken)?.label).toBe('1.3 kg');
    const onion = packFor('red onion', 'Red Onion', 'Produce');
    expect(buyPlan(2.3, 0, onion)?.label).toBe('3 onions');
    expect(buyPlan(null, 0, onion)?.label).toBe('1 onion'); // unknown amount → one
    expect(buyPlan(null, 1, onion)).toBeNull();
    const garlic = packFor('garlic clove', 'Garlic Cloves', 'Produce');
    expect(packLabel(2, garlic)).toBe('2 heads of garlic');
    const eggs = packFor('whole egg', 'Whole Eggs', 'Dairy & eggs');
    expect(buyPlan(4, 0, eggs)?.label).toBe('1 dozen');
    const tomatoes = packFor('canned tomato', 'Canned Tomatoes', 'Canned, jarred & stock');
    expect(buyPlan(1200, 0, tomatoes)?.label).toBe('2 cans');
  });
  it('tidies pantry names', () => {
    expect(pantryName('Handful Shredded Lettuce or choice of leafy veg')).toBe('Lettuce');
    expect(pantryName('Raw Chicken Breasts')).toBe('Chicken Breasts');
    expect(pantryName('Chopped Red Onion')).toBe('Red Onion');
    expect(pantryName('Minced Garlic')).toBe('Minced Garlic');
    expect(pantryName('Fresh Parsley')).toBe('Fresh Parsley');
  });
  it('describes what is left', () => {
    const oil = packFor('olive oil', 'Olive Oil', 'Sauces, oils & condiments');
    expect(fmtStock(720, oil)).toBe('≈ 1 bottle');
    expect(fmtStock(380, oil)).toBe('≈ ½ bottle');
    expect(fmtStock(40, oil)).toBe('a little (40 ml)');
    expect(fmtStock(0, oil)).toBe('used up');
    const onion = packFor('red onion', 'Red Onion', 'Produce');
    expect(fmtStock(2, onion)).toBe('2 onions');
    const chicken = packFor('chicken breast', 'Chicken Breast', 'Meat & poultry');
    expect(fmtStock(1400, chicken)).toBe('1.4 kg');
  });
});

describe('grocery list with packs and stock', () => {
  it('shows pack quantities and skips water', () => {
    const list = buildGroceryList(planWeek([['mp-16', 4]]), { pantry: {} });
    const chicken = list.find((i) => i.key === 'chicken breast')!;
    expect(chicken.buy?.label).toBe('800 g');
    expect(chicken.qtyStr).toBe('800 g');
    const paprika = list.find((i) => i.key === 'paprika')!;
    expect(paprika.buy?.label).toBe('1 jar');
    expect(list.some((i) => /water/.test(i.key))).toBe(false);
  });
  it('uses pantry stock: enough → skip, partial → buy fewer', () => {
    const w = planWeek([['mp-16', 4]]);
    const oil = packFor('olive oil', 'Olive Oil', 'Sauces, oils & condiments');
    const pantry = pantryOf([
      { key: 'olive oil', name: 'Olive Oil', aisle: 'Sauces, oils & condiments', qty: 700, unit: 'ml' },
      { key: 'chicken breast', name: 'Chicken Breast', aisle: 'Meat & poultry', qty: 300, unit: 'g' },
      { key: 'honey', name: 'Honey', aisle: 'Sauces, oils & condiments' }, // legacy entry, no qty → one pack
    ]);
    const list = buildGroceryList(w, { pantry });
    const { toBuy, have } = splitList(list);
    expect(have.map((i) => i.key)).toEqual(expect.arrayContaining(['olive oil', 'honey']));
    const chicken = toBuy.find((i) => i.key === 'chicken breast')!;
    expect(chicken.buy?.label).toBe('500 g'); // 800 needed, 300 at home
    expect(chicken.haveText).toBe('300 g');
    expect(fmtStock(700, oil)).toBe('≈ 1 bottle');
  });
  it('adds bought packs to the pantry and deducts a week of cooking', () => {
    const w = planWeek([['mp-16', 4]]);
    const list = buildGroceryList(w, { pantry: {} });
    const oil = list.find((i) => i.key === 'olive oil')!;
    const item = addToPantry(undefined, oil, oil.buy!.base, 'bought');
    expect(item.qty).toBe(750);
    const usage = weekUsage(w);
    expect(usage['olive oil']).toBe(10); // 2 tsp
    expect(usage['chicken breast']).toBe(800);
    const again = addToPantry(item, oil, 750, 'bought');
    expect(again.qty).toBe(1500);
  });
});
