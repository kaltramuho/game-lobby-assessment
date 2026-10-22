import { describe, expect, it } from 'vitest';
import { multiplier, paytable, playableRtpPercent, spinReels, STRIP, theoreticalRtp } from './slot-math';

describe('Glass Orchard', () => {
  it('pays three of a kind, or two cherries from the left', () => {
    expect(multiplier(['cherry', 'cherry', 'cherry'])).toBe(9);
    expect(multiplier(['star', 'star', 'star'])).toBe(200);
    expect(multiplier(['cherry', 'cherry', 'lemon'])).toBe(3);
    expect(multiplier(['lemon', 'cherry', 'cherry'])).toBe(0);
    expect(multiplier(['bar', 'seven', 'star'])).toBe(0);
  });

  it('enumerates the strip to 96.98%', () => {
    expect(STRIP).toHaveLength(20);
    expect(theoreticalRtp()).toBeCloseTo(0.96975, 5);
    expect(playableRtpPercent()).toBe(96.98);
  });

  it('draws each reel once and does not draw again for the payout', () => {
    const draws: number[] = [];
    const spin = spinReels(() => {
      draws.push(1);
      return 0;
    });
    expect(draws).toHaveLength(3);
    expect(spin.stops).toEqual([0, 0, 0]);
    expect(spin.line).toEqual(['cherry', 'cherry', 'cherry']);
    expect(spin.multiplier).toBe(9);
  });

  it('lists the pair after the three-of-a-kind pays, highest first', () => {
    const rows = paytable();
    expect(rows[0]).toEqual({ id: 'star', mult: 200 });
    expect(rows.at(-1)).toEqual({ id: 'pair', mult: 3 });
  });
});
