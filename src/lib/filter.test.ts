import { describe, expect, it } from 'vitest';
import { categoryKey, filterGames, hasActiveFilters, parseQuery, tagKey } from './filter';
import type { Game, LobbyQuery } from './types';

function game(patch: Partial<Game> & Pick<Game, 'id' | 'title'>): Game {
  return {
    providerId: 'calder',
    provider: 'Calder',
    category: 'slots',
    tags: ['new'],
    rtp: 94,
    minBet: 20,
    maxBet: 10000,
    trend: 10,
    releasedAt: '2024-01-01',
    playable: false,
    ...patch,
  };
}

const orchard = game({ id: 'orchard', title: 'Glass Orchard', trend: 100, rtp: 1, playable: true, tags: ['new', 'hot'] });
const lamp = game({ id: 'lamp', title: 'Low Lamp', providerId: 'oster', provider: 'Oster', rtp: 97, trend: 40, releasedAt: '2026-04-01', tags: ['classic'] });
const pit = game({
  id: 'pit',
  title: 'Night Pit',
  providerId: 'sable',
  provider: 'Sable',
  category: 'live',
  rtp: 90,
  trend: 80,
  releasedAt: '2025-06-01',
  tags: ['hot'],
});
const catalog = [orchard, lamp, pit];

function query(patch: Partial<LobbyQuery> = {}): LobbyQuery {
  return { cat: 'all', providers: [], tag: null, q: '', sort: 'trend', ...patch };
}

describe('lobby query', () => {
  it('reads a combined deep link and drops junk', () => {
    const parsed = parseQuery(new URLSearchParams('cat=slots&provider=calder,oster&tag=new&q=glass&sort=rtp'));
    expect(parsed).toMatchObject({
      cat: 'slots',
      providers: ['calder', 'oster'],
      tag: 'new',
      q: 'glass',
      sort: 'rtp',
    });
    expect(parseQuery(new URLSearchParams('cat=bingo&tag=nope&sort=alpha')).cat).toBe('all');
    expect(parseQuery(new URLSearchParams('tag=nope')).tag).toBeNull();
    expect(parseQuery(new URLSearchParams(`q=${'a'.repeat(90)}`)).q).toHaveLength(80);
  });

  it('stacks category, studio, tag, and search', () => {
    const view = filterGames(catalog, query({ cat: 'slots', providers: ['calder'], tag: 'new', q: 'orchard' }));
    expect(view.map((item) => item.id)).toEqual(['orchard']);
  });

  it('searches the studio name and sorts by the enumerated house return', () => {
    const byStudio = filterGames(catalog, query({ q: 'oster' }));
    expect(byStudio.map((item) => item.id)).toEqual(['lamp']);

    const byRtp = filterGames(catalog, query({ sort: 'rtp' }));
    expect(byRtp.map((item) => item.id)).toEqual(['lamp', 'orchard', 'pit']);

    const byNew = filterGames(catalog, query({ sort: 'new' }));
    expect(byNew.map((item) => item.id)).toEqual(['lamp', 'pit', 'orchard']);
  });

  it('treats a lone sort as the default view', () => {
    expect(hasActiveFilters(query({ sort: 'rtp' }))).toBe(false);
    expect(hasActiveFilters(query({ q: '  ' }))).toBe(false);
    expect(hasActiveFilters(query({ tag: 'hot' }))).toBe(true);
  });

  it('maps every category and tag onto a copy key', () => {
    expect(categoryKey('slots')).toBe('cat.slots');
    expect(categoryKey('table')).toBe('cat.table');
    expect(categoryKey('live')).toBe('cat.live');
    expect(tagKey('high-limit')).toBe('tag.high-limit');
    expect(tagKey('ways')).toBe('tag.ways');
  });
});
