import { ar } from './ar';
import { de } from './de';
import { en, type Key } from './en';
import type { Lang } from './locale';

export type { Key };
export type { Lang };

const tables: Record<Lang, { [K in Key]: string }> = { en, de, ar };

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>) {
  let text: string = tables[lang][key];
  if (!vars) return text;
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}
