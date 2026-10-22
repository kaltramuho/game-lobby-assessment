import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { fetchGames } from '@/data/api';
import { EV, emit } from '@/lib/bus';
import { categoryKey, filterGames, hasActiveFilters, parseQuery, TAG_ORDER, tagKey } from '@/lib/filter';
import { readFavs, subscribeFavs, toggleFav } from '@/data/favorites';
import { useI18n } from '@/i18n/provider';
import { IconStar } from '@/ui/icons';
import { formatMoney, formatRtp } from '@/lib/money';
import { clearFilterParams, useQuery } from '@/features/query/query';
import { arrowStep } from '@/lib/keys';
import { playableRtpPercent } from '@/lib/slot-math';
import type { Game, LobbyQuery, Tag } from '@/lib/types';
import { Dialog } from '@/ui/primitives';

function hueOf(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

export function Catalog() {
  const { t, locale } = useI18n();
  const { params, replace } = useQuery();
  const query = parseQuery(params);
  const [games, setGames] = useState<Game[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [stale, setStale] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [favs, setFavs] = useState<Set<string>>(() => new Set(readFavs()));
  const ignoreFail = useRef(false);

  useEffect(() => subscribeFavs(() => setFavs(new Set(readFavs()))), []);

  useEffect(() => {
    const ac = new AbortController();
    const skip = ignoreFail.current;
    ignoreFail.current = false;
    setStatus('loading');
    fetchGames(ac.signal, skip)
      .then((result) => {
        if (ac.signal.aborted) return;
        setGames(result.games);
        setStale(result.stale);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (ac.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        setStatus('error');
      });
    return () => ac.abort();
  }, [nonce]);

  const view = useMemo(() => (games ? filterGames(games, query) : []), [games, query]);
  const countLabel = view.length === 1 ? t('games.one') : t('games.many', { count: view.length });

  function retry() {
    ignoreFail.current = true;
    setStatus('loading');
    setGames(null);
    setStale(false);
    setNonce((n) => n + 1);
  }

  return (
    <section id="games" className="block" aria-busy={status === 'loading'}>
      <div className="block__head">
        <h2>{t('nav.games')}</h2>
        {status === 'ready' ? (
          <p className="count" aria-live="polite">
            {countLabel}
          </p>
        ) : null}
      </div>
      {games && games.length > 0 ? (
        <Filters games={games} query={query} locale={locale} />
      ) : null}
      {stale ? (
        <div className="banner">
          <p>{t('games.stale')}</p>
          <button type="button" className="btn btn--ghost" onClick={retry}>
            {t('action.retry')}
          </button>
        </div>
      ) : null}
      {status === 'loading' && !games ? (
        <>
          <span className="sr-only">{t('games.loading')}</span>
          <div className="directory" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => (
              <div className="skel-row" key={index}>
                <div className="skel skel-sq" />
                <div className="skel-row__lines">
                  <div className="skel skel-line" />
                  <div className="skel skel-line skel-line--short" />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {status === 'error' && !games ? (
        <div className="error-block">
          <p>{t('games.error')}</p>
          <button type="button" className="btn btn--solid" onClick={retry}>
            {t('action.retry')}
          </button>
        </div>
      ) : null}
      {games && games.length === 0 ? <p className="empty">{t('games.none')}</p> : null}
      {games && games.length > 0 && view.length === 0 ? (
        <div className="empty">
          <p>{t('games.empty')}</p>
          <button type="button" className="btn btn--solid" onClick={() => replace(clearFilterParams)}>
            {t('filter.clear')}
          </button>
        </div>
      ) : null}
      {view.length > 0 ? (
        <div className="directory">
          {view.map((game) => (
            <GameCard key={game.id} game={game} pinned={favs.has(game.id)} locale={locale} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Filters({
  games,
  query,
  locale,
}: {
  games: Game[];
  query: LobbyQuery;
  locale: string;
}) {
  const { t } = useI18n();
  const { replace } = useQuery();
  const [draft, setDraft] = useState(query.q);
  const [studiosOpen, setStudiosOpen] = useState(false);
  const typed = useRef(false);
  const studioBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    typed.current = false;
    setDraft(query.q);
  }, [query.q]);

  useEffect(() => {
    if (!typed.current || draft === query.q) return;
    const timer = window.setTimeout(() => {
      replace((params) => {
        const next = draft.trim().slice(0, 80);
        if (next) params.set('q', next);
        else params.delete('q');
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draft, query.q, replace]);

  useEffect(() => {
    if (!studiosOpen) return;
    function onDoc(event: MouseEvent) {
      if (!studioBox.current?.contains(event.target as Node)) setStudiosOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setStudiosOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [studiosOpen]);

  const studios = useMemo(() => {
    const map = new Map<string, string>();
    for (const game of games) map.set(game.providerId, game.provider);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [games, locale]);

  function setCat(cat: LobbyQuery['cat']) {
    replace((params) => {
      if (cat === 'all') params.delete('cat');
      else params.set('cat', cat);
    });
  }

  function setTag(tag: Tag | null) {
    replace((params) => {
      if (!tag) params.delete('tag');
      else params.set('tag', tag);
    });
  }

  function toggleStudio(id: string) {
    replace((params) => {
      const current = (params.get('provider') ?? '').split(',').map((part) => part.trim()).filter(Boolean);
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      if (next.length) params.set('provider', next.join(','));
      else params.delete('provider');
    });
  }

  const categories: { id: LobbyQuery['cat']; label: string }[] = [
    { id: 'all', label: t('filter.all') },
    { id: 'slots', label: t('filter.slots') },
    { id: 'table', label: t('filter.table') },
    { id: 'live', label: t('filter.live') },
  ];

  return (
    <div className="toolbar">
      <div
        className="seg"
        role="radiogroup"
        aria-label={t('filter.category')}
        onKeyDown={(event) => {
          const index = categories.findIndex((item) => item.id === query.cat);
          const dir = arrowStep(event.key);
          if (!dir) return;
          event.preventDefault();
          const nextIndex = (index + dir + categories.length) % categories.length;
          const next = categories[nextIndex];
          if (!next) return;
          setCat(next.id);
          event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
        }}
      >
        {categories.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={query.cat === item.id}
            tabIndex={query.cat === item.id ? 0 : -1}
            onClick={() => setCat(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="disclosure" ref={studioBox}>
        <button
          type="button"
          className="btn btn--ghost"
          aria-expanded={studiosOpen}
          aria-controls="studio-panel"
          onClick={() => setStudiosOpen((open) => !open)}
        >
          {query.providers.length
            ? t('filter.studioCount', { count: query.providers.length })
            : t('filter.studios')}
        </button>
        {studiosOpen ? (
          <div id="studio-panel" className="disclosure__panel" role="group" aria-label={t('filter.studios')}>
            {studios.map((studio) => (
              <label key={studio.id} className="check">
                <input
                  type="checkbox"
                  checked={query.providers.includes(studio.id)}
                  onChange={() => toggleStudio(studio.id)}
                />
                <span>{studio.name}</span>
              </label>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className="seg seg--wrap"
        role="radiogroup"
        aria-label={t('filter.tags')}
        onKeyDown={(event) => {
          const options: (Tag | null)[] = [null, ...TAG_ORDER];
          const index = Math.max(0, options.findIndex((item) => item === query.tag));
          const dir = arrowStep(event.key);
          if (!dir) return;
          event.preventDefault();
          const nextIndex = (index + dir + options.length) % options.length;
          setTag(options[nextIndex] ?? null);
          event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
        }}
      >
        <TagButton current={query.tag} value={null} label={t('filter.tagAll')} onPick={setTag} />
        {TAG_ORDER.map((tag) => (
          <TagButton key={tag} current={query.tag} value={tag} label={t(tagKey(tag))} onPick={setTag} />
        ))}
      </div>

      <label className="search">
        <span className="sr-only">{t('filter.search')}</span>
        <input
          id="game-search"
          value={draft}
          placeholder={t('filter.searchPlaceholder')}
          autoComplete="off"
          onChange={(event) => {
            typed.current = true;
            setDraft(event.target.value);
          }}
        />
      </label>

      <label className="field field--inline">
        <span>{t('filter.sort')}</span>
        <select
          value={query.sort}
          onChange={(event) => {
            const sort = event.target.value;
            replace((params) => {
              if (sort === 'trend') params.delete('sort');
              else params.set('sort', sort);
            });
          }}
        >
          <option value="trend">{t('filter.sort.trend')}</option>
          <option value="new">{t('filter.sort.new')}</option>
          <option value="rtp">{t('filter.sort.rtp')}</option>
        </select>
      </label>

      {hasActiveFilters(query) ? (
        <button type="button" className="btn btn--ghost" onClick={() => replace(clearFilterParams)}>
          {t('filter.clear')}
        </button>
      ) : null}
    </div>
  );
}

function TagButton({
  current,
  value,
  label,
  onPick,
}: {
  current: Tag | null;
  value: Tag | null;
  label: string;
  onPick: (tag: Tag | null) => void;
}) {
  const on = current === value;
  return (
    <button type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} onClick={() => onPick(value)}>
      {label}
    </button>
  );
}

const GameCard = memo(function GameCard({
  game,
  pinned,
  locale,
}: {
  game: Game;
  pinned: boolean;
  locale: string;
}) {
  const { t } = useI18n();
  const [details, setDetails] = useState(false);
  const rtp = game.playable ? playableRtpPercent() : game.rtp;
  const letter = game.title.trim().charAt(0).toUpperCase();

  return (
    <article className={game.playable ? 'game game--house' : 'game'} id={`game-${game.id}`}>
      <div className="game__thumb" style={{ '--thumb': hueOf(game.id) } as React.CSSProperties} aria-hidden="true">
        {letter}
      </div>
      <div className="game__copy">
        <div className="game__titleline">
          <h3>{game.title}</h3>
          <span className="game__cat">{t(categoryKey(game.category))}</span>
          {game.playable ? <span className="game__flag">{t('games.house')}</span> : null}
        </div>
        <p className="muted">{game.provider}</p>
        <div className="tags">
          {game.tags.map((tag) => (
            <span className="tag" key={tag}>
              {t(tagKey(tag))}
            </span>
          ))}
        </div>
      </div>
      <p className="game__nums">
        <span>
          {t('games.rtp')} {formatRtp(rtp, locale)}
        </span>
        <span>
          {t('games.bet', {
            min: formatMoney(Math.round(game.minBet * 100), 'USD', locale),
            max: formatMoney(Math.round(game.maxBet * 100), 'USD', locale),
          })}
        </span>
      </p>
      <div className="game__actions">
        <button
          type="button"
          className={pinned ? 'icon-btn is-on' : 'icon-btn'}
          aria-pressed={pinned}
          aria-label={t(pinned ? 'games.favRemove' : 'games.favAdd', { title: game.title })}
          onClick={() => toggleFav(game.id)}
        >
          <IconStar filled={pinned} />
        </button>
        {game.playable ? (
          <button type="button" className="btn btn--solid" data-open onClick={() => emit(EV.play, game.id)}>
            {t('games.play')}
          </button>
        ) : (
          <button type="button" className="btn btn--ghost" data-open onClick={() => setDetails(true)}>
            {t('games.details')}
          </button>
        )}
      </div>
      <Dialog open={details} title={game.title} onClose={() => setDetails(false)}>
        <div className="dialog__head">
          <h2>{game.title}</h2>
          <button type="button" className="icon-btn" aria-label={t('action.close')} onClick={() => setDetails(false)}>
            ×
          </button>
        </div>
        <p className="muted">{game.provider}</p>
        <p>
          {t('games.rtp')} {formatRtp(rtp, locale)}
        </p>
        <p className="muted">{t('games.detailsNote')}</p>
        <div className="dialog__actions">
          <button type="button" className="btn btn--solid" onClick={() => setDetails(false)}>
            {t('action.close')}
          </button>
        </div>
      </Dialog>
    </article>
  );
});
