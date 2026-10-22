import { describe, expect, it } from 'vitest';
import { makeId } from './ids';

describe('ids', () => {
  it('does not repeat a prefix', () => {
    const a = makeId('win');
    const b = makeId('win');
    expect(a).not.toBe(b);
    expect(a.startsWith('win-')).toBe(true);
  });
});
