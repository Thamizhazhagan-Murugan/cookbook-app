// Quantity formatting and scaling helpers.
import type { Ingredient } from './types';

const FR: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 };

/** Format a number as a tidy kitchen quantity: 1.5 -> "1 ½", 0.33 -> "⅓", 12.4 -> "12". */
export function fmtQty(v: number): string {
  if (v >= 10) return String(Math.round(v));
  const whole = Math.floor(v);
  const f = v - whole;
  const near: [number, string][] = [
    [0, ''],
    [0.25, '¼'],
    [1 / 3, '⅓'],
    [0.5, '½'],
    [2 / 3, '⅔'],
    [0.75, '¾'],
    [1, ''],
  ];
  let best: [number, string] = near[0];
  for (const n of near) if (Math.abs(f - n[0]) < Math.abs(f - best[0])) best = n;
  if (Math.abs(f - best[0]) < 0.04) {
    const w = whole + (best[0] === 1 ? 1 : 0);
    const s = best[0] === 1 ? '' : best[1];
    const out = (w ? String(w) : '') + (w && s ? ' ' : '') + s;
    return out || '0';
  }
  return String(Math.round(v * 10) / 10);
}

/** Scale every number inside an ingredient string by `f` (skips percentages like "1% milk"). */
export function scaleText(str: string, f: number): string {
  if (!f || Math.abs(f - 1) < 1e-6) return str;
  return str.replace(/(\d+)\s+(\d)\/(\d)|(\d+)\/(\d+)|(\d+(?:\.\d+)?)|([½¼¾⅓⅔⅛])/g, (m, a, b, c, d, e, n, u, off: number, s: string) => {
    if (/^\s*%/.test(s.slice(off + m.length))) return m;
    let v: number;
    if (a) v = +a + +b / +c;
    else if (d) v = +d / +e;
    else if (n) v = +n;
    else v = FR[u];
    return fmtQty(v * f);
  });
}

/** Display an ingredient line scaled by a factor (e.g. chosen servings / book servings). */
export function ingredientLine(i: Ingredient, f: number): string {
  return scaleText(i.raw, f);
}

export function fmtUnit(v: number, unit: string): string {
  let u = unit;
  if (u === 'g' && v >= 1000) return `${Math.round(v / 10) / 100} kg`;
  if (u === 'ml' && v >= 1000) return `${Math.round(v / 10) / 100} l`;
  if (u === 'g' || u === 'ml') v = v >= 100 ? Math.round(v / 5) * 5 : Math.round(v);
  else if (u === 'tsp' || u === 'tbsp' || u === 'cup') v = Math.round(v * 4) / 4;
  else if (u === 'kg' || u === 'l' || u === 'oz' || u === 'lb') v = Math.round(v * 10) / 10;
  else v = Math.ceil(v - 0.01);
  if (u === 'tsp' && v >= 3) {
    v = Math.round((v / 3) * 4) / 4;
    u = 'tbsp';
  }
  const n = u === 'g' || u === 'ml' ? String(Math.round(v)) : fmtQty(v);
  const plural = ['clove', 'slice', 'piece', 'can', 'handful', 'cup'].includes(u) && v > 1 ? `${u}s` : u;
  return u ? `${n} ${plural}` : n;
}

/** Sum quantities across parts, converting tbsp->tsp and kg->g so like units merge. */
export function sumQuantities(parts: { qty: number | null; unit: string; qtyText: string }[]): string {
  const sums = new Map<string, number>();
  const loose: string[] = [];
  for (const p of parts) {
    if (p.qty != null) {
      const u = p.unit === 'tbsp' ? 'tsp' : p.unit === 'kg' ? 'g' : p.unit === 'l' ? 'ml' : p.unit;
      const q = p.unit === 'tbsp' ? p.qty * 3 : p.unit === 'kg' || p.unit === 'l' ? p.qty * 1000 : p.qty;
      sums.set(u, (sums.get(u) || 0) + q);
    } else if (p.qtyText) loose.push(p.qtyText);
  }
  const bits = [...sums.entries()].map(([u, v]) => fmtUnit(v, u)).concat([...new Set(loose)]);
  return bits.join(' + ');
}
