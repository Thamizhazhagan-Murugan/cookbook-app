// Classifies a recipe step by what you're doing, so cook mode can show a matching animation.
import type { Step } from './types';

export type StepKind = 'chop' | 'mix' | 'saute' | 'boil' | 'oven' | 'grill' | 'blend' | 'wait' | 'serve';

export const STEP_KIND_LABEL: Record<StepKind, string> = {
  chop: 'Prep',
  mix: 'Mix',
  saute: 'Sauté',
  boil: 'Simmer',
  oven: 'Oven',
  grill: 'Grill',
  blend: 'Blend',
  wait: 'Rest',
  serve: 'Serve',
};

// Phrases that mention equipment/ingredients without being the action of the step.
const NOISE = [
  /\b(remove[sd]?|take|took|taken|out|transfer(red)?|lift)( it| them| the \w+)? (from|out of|off) (the |your )?(oven|pan|heat|grill|blender|pot|air[- ]?fryer|fridge)\b/g,
  /\b(bbq|barbecue|grilled?|blended|roast(ed)?|baked|fried|air[- ]?fried|boiled|smoked|chopped|minced|sliced|diced|grated|shredded|crushed|cooked|toasted|chilled|whisked|mixed|seasoned|marinated) (\w+)\b/g,
  /\bice cubes?\b/g,
  /\bwhile (the|your|it|they|this) [^.,;]*(cook|bake|roast|boil|simmer|rest|fry|grill)s?\b/g,
];

// [pattern, kind, weight]. Cooking methods outrank prep so "chop the veg, then fry it" reads as frying.
const RULES: [RegExp, StepKind, number][] = [
  [/\b(blend (the|until|for|on|everything|all|well|it|them|together|in|into|again|to)|blender|blitz|food processor|process until|pulse)\b/, 'blend', 4],
  [/\b(grill (the|for|on|until|them|it|each|over|both)|grilling|on (the|a|your) (grill|bbq|barbecue)|preheat (the|your|a) (grill|bbq|barbecue)|griddle|skewers?|thread (onto|the)|over (the )?(coals|flame))\b/, 'grill', 4],
  [/\b(oven|bake (the|for|until|at|in|them|it|on|uncovered|covered)|baking (tray|sheet|dish|paper)|roast (the|for|until|at|in|them|it)|preheat|air[- ]?fry(er)?|broil|microwave|tray|sheet pan)\b/, 'oven', 4],
  [/\b(boil(ing)?|bring (it |the \w+ |everything )?to a (gentle |rolling )?(boil|simmer|bubble)|simmer(ing)?|pot of water|in a pot|in the pot|saucepan|steam (the|for|until)|al dente|reduce[sd]? by|let .{0,30}reduce|thickens?|bubble)\b/, 'boil', 3],
  [/\b(saut[ée](ing)?|sear(ing)?|fry(ing)?|pan[- ]?fry|skillet|wok|heat (a|the|your|up the) (large |big |small |non-stick |nonstick |same |separate |clean |frying )*pan|(in|into|to|onto|back to|back into) (a|the|your) (large |big |small |non-stick |nonstick |same |separate |clean |hot |frying )*(pan|skillet|wok)|scrambl(e|ed|ing)|flip|toast (the|your|both|them|it|until|for)|caramel[is]+e|brown (the|them|it|on|for|all)|until (golden|browned|crispy|charred)|crisp(y)? up|melt (the )?butter|deglaze|glaze (the|them|it|with))\b/, 'saute', 3],
  [/\b(cook (for|until|the|on|over|them|it|through|in batches|each)|cooking (for|until|on)|over (low|medium|high)(-| )?(low |high )?heat|lower the heat|(reduce|turn|increase|raise|bring) the heat|turn (down|up|off) the heat|on (low|medium|high) heat|(low|medium|high) heat)\b/, 'saute', 2],
  [/\b(thinly |finely |roughly |carefully |then |now |first |next )?(slice|chop|dice|cut|mince|grate|peel|trim|cube|julienne|shred|halve|quarter|crumble|crush|zest|juice|wash|rinse|pat dry|drain|crack)( the| your| all| some| any| a| an| each| them| it| up| off| into| and| raw| washed| cooked| uncooked| boneless| fresh| \d| in| both| everything| open| off| away)\b/, 'chop', 2],
  [/\b(mix(ing)?|whisk(ing)?|combine|toss(ing)?|fold (in|through|the)|mash|beat|knead|coat (the|them|evenly|well|in|each)|coating|dip (each|the|them|it|in)|dredge|marinate|marinade|season(ing)?|rub (the|it|them|all|in)|mixing bowl|in a (large |small |medium |big |separate |clean )?bowl)\b/, 'mix', 2],
  [/\b(stir (in|through|together|until|well|everything|to combine|the|it|them|continuously|gently|occasionally|frequently|constantly))\b/, 'mix', 1],
  [/\b(rest (for|the|it|them|at|uncovered|covered)|let (it|them|the \w+)( rest| sit| stand| cool)|set aside|refrigerat(e|ing)|fridge|chill (for|the|it|them|until|in)|cool (down|for|completely|slightly)|leave (to|it|them|for)|sit for|soak (the|for|in)|overnight|stand for|freeze|defrost|thaw)\b/, 'wait', 1.5],
  [/\b(serve[sd]?|serving|plate (up|the|it|them)|plated|garnish|drizzle|sprinkle|top (with|it|each|the)|assemble|layer (the|in|on|with)|wrap (it|them|up|tightly|the|each)|roll (it|them|up|tightly|the|each)|divide|portion|store|container|enjoy|spoon (over|on|onto|the|it|some)|spread (the|a|some|evenly|it|on)|fill (the|each|with)|stuff (the|each|with)|build|stack|dollop|scoop)\b/, 'serve', 2],
];

const TITLE_RULES: [RegExp, StepKind][] = [
  [/marinat/i, 'mix'],
  [/sauce|glaze|dressing|batter|season/i, 'mix'],
  [/blend|smoothie/i, 'blend'],
  [/bake|oven|roast|air[- ]?fry/i, 'oven'],
  [/grill|bbq/i, 'grill'],
  [/boil|simmer|rice|pasta|noodle/i, 'boil'],
  [/cook|fry|saut|sear/i, 'saute'],
  [/prep|chop|slice|cut|dice/i, 'chop'],
  [/assembl|serve|plate|wrap|roll|build|store|garnish/i, 'serve'],
  [/rest|chill|cool|set aside/i, 'wait'],
];

export function stepKind(step: Pick<Step, 'text' | 'title'>, index = 0, total = 1): StepKind {
  let text = ` ${step.text.toLowerCase()} `;
  for (const n of NOISE) text = text.replace(n, ' ');
  const score: Record<StepKind, number> = { chop: 0, mix: 0, saute: 0, boil: 0, oven: 0, grill: 0, blend: 0, wait: 0, serve: 0 };
  const first: Partial<Record<StepKind, number>> = {};
  for (const [re, kind, w] of RULES) {
    const g = new RegExp(re.source, 'g');
    let m: RegExpExecArray | null;
    let hits = 0;
    while ((m = g.exec(text)) && hits < 4) {
      hits++;
      if (first[kind] === undefined) first[kind] = m.index;
    }
    if (hits) score[kind] += w + Math.min(hits - 1, 2) * 0.5;
  }
  // "cook for X minutes" inside a boil/oven step belongs to that method, not the pan.
  if (score.saute > 0 && score.saute <= 2.5 && (score.boil >= 3 || score.oven >= 3)) score.saute = 0;
  for (const [re, kind] of TITLE_RULES) {
    if (step.title && re.test(step.title)) {
      score[kind] += 2.5;
      break;
    }
  }
  if (index === total - 1 && total > 1) score.serve += 0.5; // last step is usually plating
  let best: StepKind = 'chop';
  let bestScore = 0;
  for (const k of Object.keys(score) as StepKind[]) {
    const v = score[k];
    if (v > bestScore || (v === bestScore && v > 0 && (first[k] ?? 1e9) < (first[best] ?? 1e9))) {
      best = k;
      bestScore = v;
    }
  }
  if (bestScore === 0) return /\b(heat|add|pour|place)\b/.test(text) ? 'saute' : 'chop';
  return best;
}
