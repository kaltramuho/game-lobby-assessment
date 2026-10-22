export const LANGS = ['en', 'de', 'ar'] as const;

export type Lang = (typeof LANGS)[number];

export function isLang(value: string | null): value is Lang {
  return value === 'en' || value === 'de' || value === 'ar';
}

export function readLang(): Lang {
  try {
    const stored = localStorage.getItem('merrin.lang');
    return isLang(stored) ? stored : 'en';
  } catch {
    return 'en';
  }
}

export function nextLang(lang: Lang): Lang {
  const index = LANGS.indexOf(lang);
  return LANGS[(index + 1) % LANGS.length] ?? 'en';
}

export function dirFor(lang: Lang): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export function localeFor(lang: Lang) {
  if (lang === 'de') return 'de-DE';
  if (lang === 'ar') return 'ar';
  return 'en-US';
}

export function applyDocumentLang(lang: Lang) {
  const root = document.documentElement;
  root.lang = lang;
  root.dir = dirFor(lang);
}
