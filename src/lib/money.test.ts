import { describe, expect, it } from 'vitest';
import {
  endsWithNine,
  formatMoney,
  formatPlain,
  formatRtp,
  formatWhen,
  parseAmountToCents,
  toUsdCents,
  usdPerUnit,
} from './money';

describe('cashier amounts', () => {
  it('refuses whole units that end in 9', () => {
    expect(endsWithNine(1900)).toBe(true);
    expect(endsWithNine(1940)).toBe(true);
    expect(endsWithNine(900)).toBe(true);
    expect(endsWithNine(9000)).toBe(false);
    expect(endsWithNine(2000)).toBe(false);
  });

  it('parses a typed amount into cents', () => {
    expect(parseAmountToCents('20')).toBe(2000);
    expect(parseAmountToCents('20,50')).toBe(2050);
    expect(parseAmountToCents(' 20.5 ')).toBe(2050);
    expect(parseAmountToCents('0')).toBeNull();
    expect(parseAmountToCents('20.555')).toBeNull();
    expect(parseAmountToCents('nope')).toBeNull();
  });

  it('converts EUR and GBP with the stub rates', () => {
    expect(usdPerUnit('USD')).toBe(1);
    expect(toUsdCents(1000, 'EUR')).toBe(1080);
    expect(toUsdCents(1000, 'GBP')).toBe(1270);
  });

  it('keeps western digits and a German percent sign', () => {
    expect(formatMoney(24500, 'USD', 'ar')).not.toMatch(/[٠-٩]/);
    expect(formatPlain(1.08, 'en-US')).toBe('1.08');
    expect(formatRtp(96.98, 'de-DE')).toMatch(/%$/);
    expect(formatRtp(96.98, 'de-DE')).toContain(' ');
    expect(formatRtp(96.98, 'en-US')).toBe('96.98%');
    expect(formatWhen('2026-10-21T21:14:00.000Z', 'en-US')).toMatch(/Oct/);
  });
});
