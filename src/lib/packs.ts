// Purchase units. Recipes say "2 tbsp olive oil"; the shop sells a bottle. This table turns
// recipe amounts into "what to buy" (packs, heads, kg) and lets the pantry track what's left.
//
// Each pack has a base unit for stock-keeping: grams, millilitres or a count.
//  - size:      how much one pack holds, in the base unit
//  - perUnitG:  for count items (onion, lemon) the typical weight of one, so "150 g red onion"
//               becomes 1 onion
//  - tspG:      for dry goods, grams per teaspoon (spices ~2.5 g); liquids use 5 ml per tsp
//  - soldBy weight: no fixed pack — buy the amount needed, rounded up to `step` grams

export type BaseUnit = 'g' | 'ml' | 'count';
export type Pack = {
  label: string; // "bottle", "jar", "onion", "head of garlic"
  plural?: string;
  unit: BaseUnit;
  size: number; // amount per pack in base units (count packs: usually 1)
  perUnitG?: number; // count items: grams per piece
  tspG?: number; // dry goods: grams per teaspoon
  soldBy?: 'weight';
  step?: number; // weight items: rounding step in grams
};

type Rule = [RegExp, Pack];

const jar = (size = 40, tspG = 2.5): Pack => ({ label: 'jar', unit: 'g', size, tspG });
const bottle = (size = 500): Pack => ({ label: 'bottle', unit: 'ml', size });
const tub = (size: number): Pack => ({ label: 'tub', unit: 'g', size, tspG: 5 });
const bag = (size: number, tspG = 3): Pack => ({ label: 'bag', unit: 'g', size, tspG });
const box = (size: number, tspG = 3): Pack => ({ label: 'box', unit: 'g', size, tspG });
const block = (size: number): Pack => ({ label: 'block', unit: 'g', size, tspG: 5 });
const can = (size: number): Pack => ({ label: 'can', unit: 'g', size, tspG: 5 });
const carton = (size: number): Pack => ({ label: 'carton', unit: 'ml', size });
const pack = (size: number, unit: BaseUnit = 'g'): Pack => ({ label: 'pack', unit, size, tspG: 5 });
const each = (label: string, perUnitG: number, plural?: string): Pack => ({ label, plural, unit: 'count', size: 1, perUnitG });
const bunch = (perUnitG = 30): Pack => ({ label: 'bunch', plural: 'bunches', unit: 'g', size: perUnitG, tspG: 1.5 });
const weight = (step = 100): Pack => ({ label: '', unit: 'g', size: step, soldBy: 'weight', step, tspG: 5 });

// Order matters: first match wins. Patterns run against "<key> | <name>" lower-cased.
const RULES: Rule[] = [
  // --- things you don't buy
  // (water etc. are filtered out before this table is consulted — see SKIP)

  // --- fresh garlic first (so "garlic clove" is not read as the spice "cloves")
  [/^(?!.*(powder|paste|minced|crushed|granul|salt))(?=.*\bgarlic\b)/, each('head of garlic', 50, 'heads of garlic')],

  // --- spices & dry seasonings
  [/\b(salt)\b(?!.*(pepper))/, { label: 'box', unit: 'g', size: 1000, tspG: 6 }],
  [/salt.*pepper|pepper.*salt|salt and pepper/, jar(60, 3)],
  [/black pepper|white pepper|^pepper\b|peppercorn/, jar(50, 2.5)],
  [/stock cube|bouillon cube|maggi cube/, { label: 'pack', unit: 'count', size: 12 }],
  [/seasoning|spice mix|taco spice|rub\b/, jar(50)],
  [/baking powder|baking soda|bicarb/, { label: 'tub', unit: 'g', size: 225, tspG: 4.5 }],
  [/vanilla/, { label: 'bottle', unit: 'ml', size: 118 }],
  [/cinnamon|nutmeg|cumin|paprika|turmeric|oregano|thyme|rosemary|dried (accent|parsley|dill|chives?|coriander|mint)|herb|chilli (flake|powder)|danger (flake|powder)|red pepper flake|cayenne|garam masala|curry powder|coriander powder|ground coriander|garlic powder|onion powder|ginger powder|five spice|allspice|cardamom|ground cloves?|whole cloves?|bay lea|sumac|za.?atar|mustard powder|fennel|star anise|lemon pepper|cajun|tandoori|shawarma|fajita|everything bagel|msg|dried/, jar(40)],

  // --- oils, sauces, condiments
  [/cooking spray|oil spray/, { label: 'can', unit: 'count', size: 1 }],
  [/olive oil|vegetable oil|canola oil|sunflower oil|avocado oil|coconut oil|\boil\b/, bottle(750)],
  [/sesame oil|chilli oil|danger oil|chilli crisp|danger crisp|truffle oil/, bottle(250)],
  [/soy sauce|soya sauce|tamari|teriyaki|worcestershire|fish sauce|oyster sauce|hoisin|mirin|rice vinegar|vinegar/, bottle(500)],
  [/sriracha|hot sauce|buffalo|tabasco|frank/, bottle(450)],
  [/\bhoney\b/, { label: 'jar', unit: 'g', size: 500, tspG: 7 }],
  [/maple syrup|agave|golden syrup/, bottle(250)],
  [/ketchup/, bottle(750)],
  [/mayo|mayonnaise/, { label: 'jar', unit: 'g', size: 445, tspG: 5 }],
  [/mustard/, { label: 'jar', unit: 'g', size: 200, tspG: 5 }],
  [/bbq sauce|barbecue/, bottle(500)],
  [/tomato paste|tomato puree/, can(156)],
  [/passata/, { label: 'bottle', unit: 'ml', size: 680 }],
  [/gochujang/, tub(500)],
  [/chipotle (paste|in adobo)|harissa|curry paste|thai .*paste|tandoori paste|tikka paste|miso/, { label: 'jar', unit: 'g', size: 200, tspG: 5 }],
  [/garlic paste|ginger paste|ginger garlic paste|minced garlic|crushed garlic|minced ginger/, { label: 'jar', unit: 'g', size: 300, tspG: 5 }],
  [/pesto|tahini|peanut butter|almond butter|nutella|chocolate spread/, { label: 'jar', unit: 'g', size: 400, tspG: 5 }],
  [/salsa|relish|chutney|pickle|kimchi|sauerkraut/, { label: 'jar', unit: 'g', size: 400, tspG: 5 }],
  [/\bsauce\b|dressing|marinade|glaze/, bottle(400)],

  // --- fresh produce (by piece)
  [/\bginger\b/, each('piece of ginger', 100, 'pieces of ginger')],
  [/spring onion|green onion|scallion/, bunch(100)],
  [/red onion|white onion|yellow onion|brown onion|\bonion\b/, each('onion', 150, 'onions')],
  [/shallot/, each('shallot', 40, 'shallots')],
  [/bell pepper|capsicum|red pepper|green pepper|yellow pepper|orange pepper/, each('pepper', 150, 'peppers')],
  [/jalape|habanero|serrano|bird.?s? eye|fresh chilli|fresh danger|green chilli|red chilli|thai chilli|\bchilli\b|\bchili\b/, each('chilli', 15, 'chillies')],
  [/cherry tomato|grape tomato/, { label: 'pack', unit: 'g', size: 250, tspG: 5 }],
  [/canned tomato|tinned tomato|crushed tomato|plum tomato|can of tomato|tomato can/, can(800)],
  [/tomato/, each('tomato', 120, 'tomatoes')],
  [/sweet potato/, weight(250)],
  [/potato/, weight(250)],
  [/\blemon\b|lemon juice|lemon zest|juice of.*lemon/, each('lemon', 1, 'lemons')],
  [/\blime\b|lime juice|lime zest|juice of.*lime/, each('lime', 1, 'limes')],
  [/\borange\b/, each('orange', 1, 'oranges')],
  [/avocado/, each('avocado', 150, 'avocados')],
  [/cucumber/, each('cucumber', 300, 'cucumbers')],
  [/carrot/, each('carrot', 60, 'carrots')],
  [/celery/, each('celery stalk', 50, 'celery stalks')],
  [/corn on the cob|cob/, each('cob', 1, 'cobs')],
  [/sweetcorn|corn kernel|canned corn/, can(341)],
  [/lettuce|romaine|iceberg|little gem|cos\b/, each('head of lettuce', 300, 'heads of lettuce')],
  [/spinach|kale|rocket|arugula|salad leaves|mixed leaves|leafy/, bag(250, 1)],
  [/broccoli|cauliflower|cabbage/, each('head', 400, 'heads')],
  [/mushroom/, pack(227)],
  [/zucchini|courgette|aubergine|eggplant/, each('', 250)],
  [/asparagus|green bean|bean sprout|pak choi|bok choy|snap pea|mangetout/, bag(200)],
  [/parsley|coriander|cilantro|\bmint\b|\bbasil\b|\bdill\b|chives/, bunch(30)],
  [/banana/, each('banana', 120, 'bananas')],
  [/strawberr|raspberr|blueberr|blackberr|berries/, pack(300)],
  [/mango|pineapple|melon|papaya/, each('', 350)],
  [/apple|pear|peach|nectarine|kiwi/, each('', 180)],
  [/grape/, bag(500)],
  [/frozen|edamame|peas\b/, bag(750)],

  // --- meat, poultry, seafood (sold by weight)
  [/bacon/, pack(375)],
  [/sausage/, pack(450)],
  [/shrimp|prawn/, bag(340)],
  [/canned tuna|tuna in|tin of tuna|\btuna\b/, can(170)],
  [/salmon|cod|tilapia|haddock|fish|steak|chicken|beef|mince|turkey|lamb|pork|thigh|breast|sirloin|topside|wing|drumstick|tender/, weight(100)],

  // --- dairy & eggs
  [/\beggs?\b|whole egg|large egg/, { label: 'dozen', unit: 'count', size: 12 }],
  [/egg white/, carton(500)],
  [/almond milk|oat milk|soy milk|coconut milk|evaporated milk|condensed milk/, can(400)],
  [/\bmilk\b/, carton(2000)],
  [/double cream|heavy cream|whipping cream|cooking cream|sour cream|cr[eè]me fra/, carton(473)],
  [/cream cheese/, block(250)],
  [/cottage cheese|ricotta|quark|skyr/, tub(500)],
  [/greek yogurt|yogurt|yoghurt/, tub(750)],
  [/butter|ghee/, block(454)],
  [/parmesan|parmigiano|pecorino/, block(200)],
  [/feta|halloumi|goat cheese|blue cheese|brie|camembert/, pack(200)],
  [/shredded|grated/, bag(320)],
  [/cheddar|mozzarella|gouda|swiss|monterey|provolone|cheese/, block(400)],

  // --- bakery & wraps
  [/tortilla|wrap/, { label: 'pack', unit: 'count', size: 10 }],
  [/naan|pita|pitta|flatbread/, { label: 'pack', unit: 'count', size: 5 }],
  [/bun|roll|bap|brioche/, { label: 'pack', unit: 'count', size: 8 }],
  [/bagel|english muffin/, { label: 'pack', unit: 'count', size: 6 }],
  [/bread|loaf|toast|sourdough/, { label: 'loaf', plural: 'loaves', unit: 'count', size: 18 }],
  [/pizza base|pizza dough|puff pastry|crust/, { label: 'pack', unit: 'count', size: 1 }],

  // --- rice, pasta, grains
  [/basmati|jasmine|long grain|white rice|brown rice|\brice\b/, bag(2000)],
  [/noodle|ramen|udon|vermicelli|soba/, pack(400)],
  [/macaroni|penne|fusilli|rigatoni|spaghetti|linguine|fettuccine|tagliatelle|lasagn|orzo|pasta/, bag(900)],
  [/\boats?\b|oatmeal|porridge/, bag(1000)],
  [/quinoa|couscous|bulgur|lentil|chickpea.*dry|split pea/, bag(900)],
  [/breadcrumb|panko/, box(400)],
  [/cornflour|cornstarch|corn starch/, box(450)],
  [/flour/, bag(2500)],
  [/cornflake|cereal|krispies|granola/, box(500)],

  // --- canned & jarred
  [/kidney bean|black bean|cannellini|butter bean|baked bean|chickpea|lentils? can|\bbeans?\b/, can(540)],
  [/coconut cream/, can(400)],
  [/stock|broth/, carton(900)],
  [/olive/, { label: 'jar', unit: 'g', size: 375, tspG: 5 }],
  [/\bcan\b|canned|tinned/, can(400)],

  // --- baking, nuts, seeds, protein
  [/protein powder|whey|casein/, { label: 'tub', unit: 'g', size: 900, tspG: 10 }],
  [/brown sugar|white sugar|caster sugar|icing sugar|\bsugar\b|sweetener|erythritol|stevia/, bag(1000, 4)],
  [/cocoa|cacao/, box(250, 2.5)],
  [/chocolate chip|choc chip|chocolate/, bag(300)],
  [/sesame seed|chia|flax|pumpkin seed|sunflower seed|poppy/, { label: 'jar', unit: 'g', size: 150, tspG: 3 }],
  [/cashew|almond|walnut|pecan|peanut|pistachio|hazelnut|macadamia|\bnuts?\b/, bag(300)],
  [/raisin|cranberr|date|apricot/, bag(300)],
  [/yeast/, { label: 'pack', unit: 'g', size: 8, tspG: 3 }],
];

const DEFAULTS: Record<string, Pack> = {
  'Spices & seasonings': jar(40),
  'Sauces, oils & condiments': bottle(500),
  Produce: each('', 150),
  'Meat & poultry': weight(100),
  Seafood: weight(100),
  'Dairy & eggs': pack(500),
  'Bakery & wraps': { label: 'pack', unit: 'count', size: 8 },
  'Rice, pasta & grains': bag(900),
  'Canned, jarred & stock': can(400),
  'Baking, nuts & seeds': bag(500),
  Frozen: bag(750),
  Other: { label: 'pack', unit: 'count', size: 1 },
  'Added by you': { label: '', unit: 'count', size: 1 },
};

/** Ingredients that are never bought. */
export const SKIP = /^(water|pasta water|boiling water|hot water|warm water|cold water|ice|ice cube|tap water)$/;

const cache = new Map<string, Pack>();

export function packFor(key: string, name: string, aisle: string): Pack {
  const ck = `${key}|${aisle}`;
  const hit = cache.get(ck);
  if (hit) return hit;
  const hay = `${key} | ${name.toLowerCase()}`;
  let found: Pack | undefined;
  for (const [re, p] of RULES) {
    if (re.test(hay)) {
      found = p;
      break;
    }
  }
  const p = found || DEFAULTS[aisle] || DEFAULTS.Other;
  cache.set(ck, p);
  return p;
}

const OZ = 28.35;
const LB = 453.6;

/** Convert a recipe quantity to the pack's base unit. Returns null when the amount is unknown. */
export function toBase(qty: number | null, unit: string, pack: Pack): number | null {
  if (qty == null) return null;
  const liquid = pack.unit === 'ml';
  const tsp = liquid ? 5 : (pack.tspG ?? 5);
  let grams: number | null = null; // or ml for liquids
  switch (unit) {
    case 'g':
    case 'ml':
      grams = qty;
      break;
    case 'kg':
    case 'l':
      grams = qty * 1000;
      break;
    case 'oz':
      grams = qty * OZ;
      break;
    case 'lb':
      grams = qty * LB;
      break;
    case 'tsp':
      grams = qty * tsp;
      break;
    case 'tbsp':
      grams = qty * tsp * 3;
      break;
    case 'cup':
      grams = qty * (liquid ? 240 : pack.unit === 'g' && (pack.tspG ?? 5) <= 3 ? 120 : 200);
      break;
    case 'pinch':
      grams = qty * 0.5;
      break;
    case 'handful':
      grams = qty * (pack.perUnitG && pack.perUnitG <= 50 ? 20 : 40);
      break;
    case 'clove':
      return pack.unit === 'count' ? (qty * 5) / (pack.perUnitG || 50) : qty * 5;
    case 'slice':
      return pack.unit === 'count' ? qty * (pack.size >= 10 ? 1 : 1 / 8) : qty * 25;
    case 'can':
      return pack.unit === 'count' ? qty : qty * pack.size;
    case 'piece':
    case '':
    default:
      // a bare number: "2 onions", "3 lemons", "4 wraps" → count; for weight/pack goods assume 1 unit = 1 pack
      if (pack.unit === 'count') return qty;
      return pack.soldBy === 'weight' ? qty * (pack.perUnitG || 150) : qty * pack.size;
  }
  if (pack.unit === 'count') return grams / (pack.perUnitG || 150);
  return grams;
}

export function roundUpWeight(g: number, step = 100): number {
  return Math.ceil(g / step - 1e-9) * step;
}

export function fmtWeight(g: number): string {
  if (g >= 1000) return `${Math.round(g / 100) / 10} kg`;
  return `${Math.round(g)} g`;
}

const fmtN = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));

/** "1 bottle", "2 heads of garlic", "1.4 kg", "3 onions" */
export function packLabel(packs: number, pack: Pack, name?: string): string {
  if (pack.soldBy === 'weight') return fmtWeight(packs * pack.size);
  const base = pack.label || (name ? name.toLowerCase() : 'pack');
  const plural = pack.plural || (base.endsWith('s') || base.endsWith('ch') ? base : `${base}s`);
  const n = fmtN(packs);
  if (pack.label === 'dozen') return packs === 1 ? '1 dozen' : `${n} dozen`;
  return `${n} ${packs === 1 ? base : plural}`;
}

/** How much is left, in pack terms: "≈ ¾ bottle", "2 onions", "1.2 kg". */
export function fmtStock(qty: number, pack: Pack, name?: string): string {
  if (qty <= 0) return 'used up';
  if (pack.soldBy === 'weight') return fmtWeight(qty);
  if (pack.unit === 'count' && pack.size === 1) return packLabel(Math.round(qty * 10) / 10, pack, name);
  const frac = qty / pack.size;
  if (frac >= 0.875) return `≈ ${packLabel(Math.max(1, Math.round(frac * 2) / 2), pack, name)}`;
  const q = Math.round(frac * 4) / 4;
  if (q <= 0.25) return `a little (${fmtAmount(qty, pack.unit)})`;
  return `≈ ${q === 0.5 ? '½' : '¾'} ${pack.label || 'pack'}`;
}

export function fmtAmount(qty: number, unit: BaseUnit): string {
  if (unit === 'count') return fmtN(Math.round(qty * 10) / 10);
  if (unit === 'ml') return qty >= 1000 ? `${Math.round(qty / 100) / 10} l` : `${Math.round(qty)} ml`;
  return fmtWeight(qty);
}

export type BuyPlan = { packs: number; label: string; base: number };

/** What to buy so that `have + bought >= need`. Unknown need → one pack. */
export function buyPlan(needBase: number | null, haveBase: number, pack: Pack, name?: string): BuyPlan | null {
  if (needBase == null) {
    if (haveBase > 0) return null;
    return { packs: 1, label: packLabel(1, pack, name), base: pack.size };
  }
  const short = needBase - haveBase;
  if (short <= needBase * 0.05 || short <= 0) return null;
  if (pack.soldBy === 'weight') {
    const g = roundUpWeight(short, pack.step || 100);
    return { packs: g / pack.size, label: fmtWeight(g), base: g };
  }
  const packs = Math.max(1, Math.ceil(short / pack.size - 1e-9));
  return { packs, label: packLabel(packs, pack, name), base: packs * pack.size };
}
