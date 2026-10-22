import { EV } from '@/lib/bus';

const THEME_KEY = 'merrin.theme';
const HUE_KEY = 'merrin.hue';

export type ThemeName = 'light' | 'dark';

function paintThemeColor(theme: ThemeName) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0e141b' : '#e6ebf1');
}

export function currentTheme(): ThemeName {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function readHue() {
  const raw = localStorage.getItem(HUE_KEY);
  if (raw === null || raw.trim() === '') return 204;
  const stored = Number(raw);
  if (!Number.isFinite(stored)) return 204;
  return Math.min(360, Math.max(0, Math.round(stored)));
}

export function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem(THEME_KEY, theme);
  paintThemeColor(theme);
  window.dispatchEvent(new CustomEvent(EV.theme));
}

export function applyHue(hue: number) {
  const next = Math.min(360, Math.max(0, Math.round(hue)));
  document.documentElement.style.setProperty('--hue', String(next));
  localStorage.setItem(HUE_KEY, String(next));
  window.dispatchEvent(new CustomEvent(EV.theme));
}

export function toggleTheme() {
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}

export function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const theme: ThemeName =
    stored === 'light' || stored === 'dark'
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.documentElement.style.setProperty('--hue', String(readHue()));
  paintThemeColor(theme);

  if (stored === 'light' || stored === 'dark') return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    if (localStorage.getItem(THEME_KEY)) return;
    const next: ThemeName = mq.matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    paintThemeColor(next);
    window.dispatchEvent(new CustomEvent(EV.theme));
  });
}
