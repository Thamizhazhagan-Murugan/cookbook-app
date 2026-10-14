import recipes from '../../data/recipes.json';
import { stepKind, type StepKind } from '../steps';
import type { Recipe } from '../types';

const k = (text: string, title = '') => stepKind({ text, title });

test('cooking methods', () => {
  expect(k('Heat a pan over medium heat and melt 10g of butter. Add the chicken cubes and cook for 5 minutes per side until golden.')).toBe('saute');
  expect(k('Bring a pot of water to a boil and add the macaroni. Cook for 8 minutes until al dente, then drain.')).toBe('boil');
  expect(k('Spread the potatoes on a lined sheet pan. Bake at 200°C for 20 minutes or air fry for 18 minutes until golden.')).toBe('oven');
  expect(k('Thread the marinated chicken onto skewers and grill for 4 minutes each side.')).toBe('grill');
  expect(k('In a blender, combine yogurt, mayo and chipotle paste. Blend until smooth.')).toBe('blend');
});

test('prep, mixing, resting, serving', () => {
  expect(k('Chop 1 onion and 1 red bell pepper. Rinse the rice and set aside for later.')).toBe('chop');
  expect(k('Slice the chicken into cubes and place in a bowl. Add garlic, spice mix and yogurt. Toss until evenly coated.')).toBe('mix');
  expect(k('Let the chicken rest for 5 minutes before slicing into cubes.')).toBe('wait');
  expect(k('Divide into 4 servings, garnish with parsley and ENJOY!')).toBe('serve');
});

test('adjectives and equipment mentions do not count as actions', () => {
  expect(k('Lower the heat, add butter, minced garlic and freshly chopped parsley. Stir for 1–2 minutes until glazed.')).toBe('saute');
  expect(k('Drizzle with extra BBQ sauce, divide into four portions and enjoy!')).toBe('serve');
  expect(k('Return the blended sauce to the pan and add yogurt. Stir gently until creamy.')).toBe('saute');
  expect(k('Remove from the oven, let it cool slightly, then slice into portions and serve warm.')).not.toBe('oven');
});

test('step titles steer the result', () => {
  expect(k('Place the chicken in a bowl with the spices and oil. Set aside.', 'Marinate The Chicken')).toBe('mix');
});

test('every step in both books gets a kind, and the spread is sane', () => {
  const counts = {} as Record<StepKind, number>;
  for (const r of recipes as unknown as Recipe[]) r.steps.forEach((s, i) => { const kind = stepKind(s, i, r.steps.length); counts[kind] = (counts[kind] ?? 0) + 1; });
  expect(Object.keys(counts).sort()).toEqual(['blend', 'boil', 'chop', 'grill', 'mix', 'oven', 'saute', 'serve', 'wait']);
  expect(counts.saute).toBeGreaterThan(300);
  expect(counts.serve).toBeGreaterThan(150);
});
