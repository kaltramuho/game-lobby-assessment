import { afterEach, describe, expect, it } from 'vitest';
import { arrowStep } from './keys';

afterEach(() => {
  document.documentElement.dir = 'ltr';
});

describe('arrow keys', () => {
  it('moves right as forward in English', () => {
    document.documentElement.dir = 'ltr';
    expect(arrowStep('ArrowRight')).toBe(1);
    expect(arrowStep('ArrowLeft')).toBe(-1);
    expect(arrowStep('ArrowDown')).toBe(1);
    expect(arrowStep('Enter')).toBe(0);
  });

  it('moves left as forward in Arabic', () => {
    document.documentElement.dir = 'rtl';
    expect(arrowStep('ArrowLeft')).toBe(1);
    expect(arrowStep('ArrowRight')).toBe(-1);
    expect(arrowStep('ArrowUp')).toBe(-1);
  });
});
