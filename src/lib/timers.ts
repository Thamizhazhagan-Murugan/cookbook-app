// Find cooking durations inside step text so they can become one-tap timers.
export type TimerHint = { label: string; secs: number };

const TRE = /(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi;

export function timersIn(text: string): TimerHint[] {
  const out: TimerHint[] = [];
  let m: RegExpExecArray | null;
  TRE.lastIndex = 0;
  while ((m = TRE.exec(text))) {
    const a = +m[1];
    const b = m[2] ? +m[2] : a;
    const u = m[3].toLowerCase();
    const mult = u.startsWith('h') ? 3600 : u.startsWith('s') ? 1 : 60;
    const secs = Math.max(a, b) * mult;
    if (secs < 15 || secs > 12 * 3600) continue;
    const unitLabel = u.startsWith('h') ? (b === 1 ? 'hr' : 'hrs') : u.startsWith('s') ? 'sec' : 'min';
    out.push({ label: `${m[2] ? `${m[1]}–${m[2]}` : m[1]} ${unitLabel}`, secs });
  }
  return out;
}

export function clockText(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = s % 60;
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(x).padStart(2, '0')}`;
}
