import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { translate, type Key } from './dictionary';
import { applyDocumentLang, localeFor, nextLang, readLang, type Lang } from './locale';

type I18nValue = {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  locale: string;
  nextLabel: string;
  t: (key: Key, vars?: Record<string, string | number>) => string;
  cycleLang: () => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readLang);

  const value = useMemo<I18nValue>(() => {
    const upcoming = nextLang(lang);
    const cycleLang = () => {
      setLang((current) => {
        const next = nextLang(current);
        localStorage.setItem('merrin.lang', next);
        applyDocumentLang(next);
        return next;
      });
    };
    return {
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      locale: localeFor(lang),
      nextLabel: translate(upcoming, 'lang.name'),
      t: (key, vars) => translate(lang, key, vars),
      cycleLang,
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('i18n');
  return value;
}
