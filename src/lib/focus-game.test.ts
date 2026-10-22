import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusGameCard, scrollToId } from './focus-game';

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('focus', () => {
  it('scrolls a card into view and focuses its launch control', () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({ matches: true })),
    );
    document.body.innerHTML = '<article id="game-orchard"><button data-open>Launch</button></article><section id="promos"></section>';
    const card = document.getElementById('game-orchard')!;
    const promo = document.getElementById('promos')!;
    card.scrollIntoView = vi.fn();
    promo.scrollIntoView = vi.fn();
    const launch = card.querySelector('button')!;
    launch.focus = vi.fn();

    focusGameCard('orchard');
    scrollToId('promos');
    vi.runAllTimers();

    expect(card.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
    expect(launch.focus).toHaveBeenCalledOnce();
    expect(promo.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
    vi.unstubAllGlobals();
  });
});
