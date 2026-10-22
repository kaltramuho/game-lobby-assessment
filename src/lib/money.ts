export const PAY_CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
export type PayCurrency = (typeof PAY_CURRENCIES)[number];

const TO_USD: Record<PayCurrency, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
};

export function usdPerUnit(currency: PayCurrency) {
  return TO_USD[currency];
}

export function toUsdCents(cents: number, currency: PayCurrency) {
  return Math.round(cents * TO_USD[currency]);
}

export function parseAmountToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.');
  if (!/^\d{1,6}(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole, frac = ''] = cleaned.split('.');
  const cents = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 1_000_000) return null;
  return cents;
}

export function endsWithNine(cents: number) {
  return Math.floor(cents / 100) % 10 === 9;
}

const latn = { numberingSystem: 'latn' as const };

export function formatMoney(cents: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    ...latn,
    style: 'currency',
    currency,
  }).format(cents / 100);
}

export function formatPlain(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    ...latn,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatRtp(percent: number, locale: string) {
  const rendered = new Intl.NumberFormat(locale, {
    ...latn,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percent);
  return locale.startsWith('de') ? `${rendered} %` : `${rendered}%`;
}

export function formatWhen(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    ...latn,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
