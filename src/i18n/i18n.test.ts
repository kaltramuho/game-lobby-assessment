import { describe, expect, it } from 'vitest';
import { ar } from './ar';
import { de } from './de';
import { translate } from './dictionary';
import { en } from './en';
import { applyDocumentLang, dirFor, isLang, localeFor, nextLang, readLang } from './locale';

describe('copy', () => {
  it('gives German and Arabic every English key', () => {
    const keys = Object.keys(en).sort();
    expect(Object.keys(de).sort()).toEqual(keys);
    expect(Object.keys(ar).sort()).toEqual(keys);
    for (const key of keys) {
      expect(de[key as keyof typeof de].trim().length).toBeGreaterThan(0);
      expect(ar[key as keyof typeof ar].trim().length).toBeGreaterThan(0);
    }
  });

  it('fills placeholders', () => {
    expect(translate('en', 'games.many', { count: 100 })).toBe('100 titles');
    expect(translate('ar', 'lang.switch', { name: 'English' })).toContain('English');
    expect(translate('de', 'filter.clear')).toBe('Filter löschen');
  });
});

describe('language', () => {
  it('cycles English, German, Arabic and sets direction', () => {
    expect(nextLang('en')).toBe('de');
    expect(nextLang('de')).toBe('ar');
    expect(nextLang('ar')).toBe('en');
    expect(dirFor('ar')).toBe('rtl');
    expect(dirFor('de')).toBe('ltr');
    expect(localeFor('de')).toBe('de-DE');
    expect(localeFor('ar')).toBe('ar');
    expect(isLang('fr')).toBe(false);
  });

  it('reads a stored language and paints the document', () => {
    localStorage.setItem('merrin.lang', 'ar');
    expect(readLang()).toBe('ar');
    localStorage.setItem('merrin.lang', 'nope');
    expect(readLang()).toBe('en');
    applyDocumentLang('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    applyDocumentLang('en');
  });
});
