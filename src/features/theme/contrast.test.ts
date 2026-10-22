import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/app/styles.css', 'utf8');

function channel(c: number) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function lum(rgb: number[]) {
  return 0.2126 * channel(rgb[0]!) + 0.7152 * channel(rgb[1]!) + 0.0722 * channel(rgb[2]!);
}

function hsl(h: number, s: number, l: number) {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function contrast(a: number[], b: number[]) {
  const left = lum(a);
  const right = lum(b);
  const [hi, lo] = left > right ? [left, right] : [right, left];
  return (hi + 0.05) / (lo + 0.05);
}

function hex(value: string) {
  const n = Number.parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

describe('accent contrast', () => {
  it('keeps button and accent text at 4.5:1 for every hue', () => {
    const accents = [...css.matchAll(/--accent:\s*hsl\(var\(--hue\)\s+(\d+)%\s+(\d+)%\)/g)];
    const inks = [...css.matchAll(/--on-accent:\s*(#[0-9a-f]{6})/g)];
    expect(accents).toHaveLength(2);
    expect(inks).toHaveLength(2);
    const light = { s: Number(accents[0]![1]), l: Number(accents[0]![2]), ink: hex(inks[0]![1]!) };
    const dark = { s: Number(accents[1]![1]), l: Number(accents[1]![2]), ink: hex(inks[1]![1]!) };
    const lightGrounds = [hex('#f5f8fb'), hex('#e6ebf1')];
    const darkGrounds = [hex('#141c25'), hex('#0e141b'), hex('#0c1218')];

    for (let hue = 0; hue <= 360; hue += 1) {
      const lightAccent = hsl(hue, light.s, light.l);
      const darkAccent = hsl(hue, dark.s, dark.l);
      expect(contrast(lightAccent, light.ink)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(darkAccent, dark.ink)).toBeGreaterThanOrEqual(4.5);
      for (const ground of lightGrounds) expect(contrast(lightAccent, ground)).toBeGreaterThanOrEqual(4.5);
      for (const ground of darkGrounds) expect(contrast(darkAccent, ground)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
