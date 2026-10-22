import { describe, expect, it } from 'vitest';
import { scoreMatch } from './fuzzy';

describe('palette ranking', () => {
  it('prefers an exact title, then a prefix, then a later substring', () => {
    expect(scoreMatch('glass', 'Glass')).toBeGreaterThan(scoreMatch('glass', 'Glass Orchard'));
    expect(scoreMatch('glass', 'Glass Orchard')).toBeGreaterThan(scoreMatch('glass', 'Pair of Gloves'));
    expect(scoreMatch('', 'Anything')).toBe(1);
    expect(scoreMatch('zzzz', 'Glass Orchard')).toBe(0);
  });

  it('ranks a fuzzy studio hit above a title that misses letters', () => {
    const glassworks = scoreMatch('gls', 'Glassworks');
    const orchard = scoreMatch('gls', 'Glass Orchard');
    const tide = scoreMatch('gls', 'Low Tide Roulette');
    expect(glassworks).toBeGreaterThan(0);
    expect(orchard).toBeGreaterThan(0);
    expect(tide).toBe(0);
    expect(glassworks).toBeGreaterThan(orchard);
  });
});
