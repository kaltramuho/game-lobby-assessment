import { playableRtpPercent } from '@/lib/slot-math';
import type { Category, Game, LobbyQuery, SortKey, Tag } from '@/lib/types';

const TAGS: readonly Tag[] = ['new', 'hot', 'jackpot', 'classic', 'ways', 'high-limit'];

export function isTag(value: string | null): value is Tag {
  return TAGS.includes(value as Tag);
}

export function parseQuery(params: URLSearchParams): LobbyQuery {
  const cat = params.get('cat');
  const sort = params.get('sort');
  const tag = params.get('tag');
  const category: LobbyQuery['cat'] =
    cat === 'slots' || cat === 'table' || cat === 'live' ? cat : 'all';
  const sortKey: SortKey = sort === 'new' || sort === 'rtp' || sort === 'trend' ? sort : 'trend';
  return {
    cat: category,
    sort: sortKey,
    tag: isTag(tag) ? tag : null,
    providers: (params.get('provider') ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
    q: (params.get('q') ?? '').slice(0, 80),
  };
}

export function filterGames(games: Game[], query: LobbyQuery) {
  const needle = query.q.trim().toLowerCase();
  const houseRtp = playableRtpPercent();
  const filtered = games.filter((game) => {
    if (query.cat !== 'all' && game.category !== query.cat) return false;
    if (query.providers.length > 0 && !query.providers.includes(game.providerId)) return false;
    if (query.tag && !game.tags.includes(query.tag)) return false;
    if (!needle) return true;
    const hay = `${game.title} ${game.provider}`.toLowerCase();
    return hay.includes(needle);
  });

  const rtpOf = (game: Game) => (game.playable ? houseRtp : game.rtp);
  filtered.sort((a, b) => {
    if (query.sort === 'new') return b.releasedAt.localeCompare(a.releasedAt) || a.title.localeCompare(b.title);
    if (query.sort === 'rtp') return rtpOf(b) - rtpOf(a) || a.title.localeCompare(b.title);
    return b.trend - a.trend || a.title.localeCompare(b.title);
  });
  return filtered;
}

export function hasActiveFilters(query: LobbyQuery) {
  return query.cat !== 'all' || query.providers.length > 0 || query.tag !== null || query.q.trim() !== '';
}

export function categoryKey(category: Category) {
  if (category === 'slots') return 'cat.slots' as const;
  if (category === 'table') return 'cat.table' as const;
  return 'cat.live' as const;
}

export function tagKey(tag: Tag) {
  switch (tag) {
    case 'new':
      return 'tag.new' as const;
    case 'hot':
      return 'tag.hot' as const;
    case 'jackpot':
      return 'tag.jackpot' as const;
    case 'classic':
      return 'tag.classic' as const;
    case 'ways':
      return 'tag.ways' as const;
    case 'high-limit':
      return 'tag.high-limit' as const;
    default: {
      const unexpected: never = tag;
      throw new Error(unexpected);
    }
  }
}

export const TAG_ORDER: readonly Tag[] = TAGS;
