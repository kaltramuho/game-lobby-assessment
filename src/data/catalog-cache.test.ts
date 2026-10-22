import { describe, expect, it, vi } from 'vitest';
import { peekGames, rememberGames, subscribeGames } from './catalog-cache';
import type { Game } from '@/lib/types';

const game = {
  id: 'orchard',
  title: 'Glass Orchard',
  providerId: 'calder',
  provider: 'Calder',
  category: 'slots',
  tags: ['new'],
  rtp: 96.98,
  minBet: 20,
  maxBet: 10000,
  trend: 100,
  releasedAt: '2026-01-01',
  playable: true,
} satisfies Game;

describe('catalog cache', () => {
  it('publishes the list it remembers', () => {
    const heard = vi.fn();
    const off = subscribeGames(heard);
    rememberGames([game]);
    expect(peekGames()).toEqual([game]);
    expect(heard).toHaveBeenCalledOnce();
    off();
    rememberGames([]);
    expect(heard).toHaveBeenCalledOnce();
  });
});
