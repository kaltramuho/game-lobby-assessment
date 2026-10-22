import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyHue, applyTheme, currentTheme, initTheme, readHue, toggleTheme } from './theme';

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('--hue');
});

describe('theme', () => {
  it('falls back to hue 204 and clamps the slider', () => {
    expect(readHue()).toBe(204);
    localStorage.setItem('merrin.hue', '  ');
    expect(readHue()).toBe(204);
    localStorage.setItem('merrin.hue', 'nope');
    expect(readHue()).toBe(204);
    localStorage.setItem('merrin.hue', '0');
    expect(readHue()).toBe(0);
    applyHue(400);
    expect(readHue()).toBe(360);
    expect(document.documentElement.style.getPropertyValue('--hue')).toBe('360');
  });

  it('persists a toggle and follows the system until the player chooses', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
    const listeners: Array<() => void> = [];
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: (_: string, fn: () => void) => listeners.push(fn),
        removeEventListener: vi.fn(),
      })),
    );

    initTheme();
    expect(currentTheme()).toBe('dark');
    expect(localStorage.getItem('merrin.theme')).toBeNull();

    listeners[0]?.();
    expect(currentTheme()).toBe('dark');

    toggleTheme();
    expect(currentTheme()).toBe('light');
    expect(localStorage.getItem('merrin.theme')).toBe('light');
    expect(meta.getAttribute('content')).toBe('#e6ebf1');

    applyTheme('dark');
    listeners[0]?.();
    expect(currentTheme()).toBe('dark');
    meta.remove();
    vi.unstubAllGlobals();
  });
});
