import reel from './reel.json';

export type SymbolId = keyof typeof reel.three;

export const STRIP = reel.strip as readonly SymbolId[];

const THREE = reel.three;

export function multiplier(line: readonly SymbolId[]) {
  const [a, b, c] = line;
  if (a && a === b && b === c) return THREE[a];
  if (a === 'cherry' && b === 'cherry') return reel.cherryPair;
  return 0;
}

let cachedPercent = -1;

export function theoreticalRtp() {
  const n = STRIP.length;
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      for (let k = 0; k < n; k += 1) {
        const a = STRIP[i];
        const b = STRIP[j];
        const c = STRIP[k];
        if (!a || !b || !c) continue;
        total += multiplier([a, b, c]);
      }
    }
  }
  return total / (n * n * n);
}

export function playableRtpPercent() {
  if (cachedPercent < 0) cachedPercent = Math.round(theoreticalRtp() * 10000) / 100;
  return cachedPercent;
}

export function spinReels(rng: () => number = Math.random) {
  const n = STRIP.length;
  const stops = [0, 1, 2].map(() => Math.floor(rng() * n));
  const line = stops.map((stop) => STRIP[stop]).filter((symbol): symbol is SymbolId => Boolean(symbol));
  return { stops, line, multiplier: multiplier(line) };
}

export function paytable() {
  const rows = (Object.entries(THREE) as [SymbolId, number][])
    .map(([id, mult]) => ({ id, mult }))
    .sort((a, b) => b.mult - a.mult);
  return [...rows, { id: 'pair' as const, mult: reel.cherryPair }];
}
