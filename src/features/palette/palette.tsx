import { useEffect, useMemo, useRef, useState } from 'react';
import { EV, emit, on } from '@/lib/bus';
import { useI18n } from '@/i18n/provider';
import { peekGames, subscribeGames } from '@/data/catalog-cache';
import { scoreMatch } from '@/lib/fuzzy';
import { focusGameCard, scrollToId } from '@/lib/focus-game';
import { clearFilterParams, useQuery } from '@/features/query/query';
import { IconSearch } from '@/ui/icons';
import { toggleTheme } from '@/features/theme/theme';
import type { Game } from '@/lib/types';
import { useOverlay } from '@/ui/primitives';

type Item = {
  id: string;
  label: string;
  hint: string;
  score: number;
  run: () => void;
};

function isMac() {
  return /Mac|iPhone|iPad/.test(navigator.userAgent);
}

export function CommandPalette() {
  const { t, cycleLang } = useI18n();
  const { replace } = useQuery();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [games, setGames] = useState<Game[]>(() => peekGames() ?? []);
  const openRef = useRef(false);
  const listRef = useRef<HTMLUListElement>(null);
  const ref = useOverlay<HTMLDivElement>(open, () => setOpen(false));

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => subscribeGames(() => setGames(peekGames() ?? [])), []);

  useEffect(() => on(EV.palette, () => setOpen(true)), []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      if (document.body.dataset.overlay && !openRef.current) return;
      setOpen((value) => !value);
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setActive(0);
  }, [open]);

  const items = useMemo(() => {
    const close = () => setOpen(false);
    const actions: Item[] = [
      { id: 'theme', label: t('cmd.theme'), hint: t('palette.action'), score: 0, run: () => { toggleTheme(); close(); } },
      { id: 'lang', label: t('cmd.lang'), hint: t('palette.action'), score: 0, run: () => { cycleLang(); close(); } },
      { id: 'deposit', label: t('cmd.deposit'), hint: t('palette.action'), score: 0, run: () => { close(); emit(EV.deposit); } },
      { id: 'clear', label: t('cmd.clear'), hint: t('palette.action'), score: 0, run: () => { replace(clearFilterParams); close(); } },
      { id: 'games', label: t('cmd.games'), hint: t('palette.action'), score: 0, run: () => { close(); scrollToId('games'); } },
      { id: 'promos', label: t('cmd.promos'), hint: t('palette.action'), score: 0, run: () => { close(); scrollToId('promos'); } },
      { id: 'feed', label: t('cmd.feed'), hint: t('palette.action'), score: 0, run: () => { close(); emit(EV.feed); } },
    ];

    const needle = q.trim();
    if (!needle) {
      const trending = games
        .slice()
        .sort((a, b) => b.trend - a.trend)
        .slice(0, 5)
        .map((game, index) => ({
          id: `game-${game.id}`,
          label: game.title,
          hint: game.provider,
          score: 100 - index,
          run: () => {
            replace((params) => {
              params.delete('cat');
              params.delete('tag');
              params.delete('provider');
              params.set('q', game.title);
            });
            close();
            focusGameCard(game.id);
          },
        }));
      return [...actions, ...trending];
    }

    const scored: Item[] = [];
    for (const action of actions) {
      const score = scoreMatch(needle, action.label);
      if (score > 0) scored.push({ ...action, score });
    }
    const seenStudios = new Set<string>();
    for (const game of games) {
      const titleScore = scoreMatch(needle, game.title);
      const studioScore = scoreMatch(needle, game.provider) * 0.92;
      const score = Math.max(titleScore, studioScore);
      if (score > 0) {
        scored.push({
          id: `game-${game.id}`,
          label: game.title,
          hint: game.provider,
          score: titleScore >= studioScore ? score + 4 : score,
          run: () => {
            replace((params) => {
              params.delete('cat');
              params.delete('tag');
              params.delete('provider');
              params.set('q', game.title);
            });
            close();
            focusGameCard(game.id);
          },
        });
      }
      if (seenStudios.has(game.providerId)) continue;
      const studio = scoreMatch(needle, game.provider);
      if (studio > 0) {
        seenStudios.add(game.providerId);
        const providerId = game.providerId;
        const providerName = game.provider;
        scored.push({
          id: `studio-${providerId}`,
          label: providerName,
          hint: t('palette.studio'),
          score: studio + 6,
          run: () => {
            replace((params) => {
              params.delete('cat');
              params.delete('tag');
              params.delete('q');
              params.set('provider', providerId);
            });
            close();
            scrollToId('games');
          },
        });
      }
    }
    scored.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    return scored.slice(0, 12);
  }, [games, q, replace, t, cycleLang]);

  useEffect(() => {
    setActive((index) => Math.min(index, Math.max(0, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [active, items]);

  function choose(index: number) {
    items[index]?.run();
  }

  if (!open) return null;

  const activeId = items[active] ? `cmd-opt-${active}` : undefined;

  return (
    <div className="backdrop backdrop--palette" onMouseDown={() => setOpen(false)}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label={t('palette.label')}
        ref={ref}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          className="palette__input"
          role="combobox"
          aria-expanded="true"
          aria-controls="cmd-list"
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          placeholder={t('palette.placeholder')}
          value={q}
          autoComplete="off"
          onChange={(event) => {
            setQ(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive((index) => Math.min(items.length - 1, index + 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((index) => Math.max(0, index - 1));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              choose(active);
            } else if (event.key === 'Home') {
              event.preventDefault();
              setActive(0);
            } else if (event.key === 'End') {
              event.preventDefault();
              setActive(Math.max(0, items.length - 1));
            }
          }}
        />
        {items.length === 0 ? (
          <p className="empty">{t('palette.empty')}</p>
        ) : (
          <ul id="cmd-list" className="palette__list" role="listbox" ref={listRef}>
            {items.map((item, index) => (
              <li
                key={item.id}
                id={`cmd-opt-${index}`}
                role="option"
                aria-selected={index === active}
                className={index === active ? 'palette__opt is-on' : 'palette__opt'}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(index);
                }}
              >
                <span>{item.label}</span>
                <span className="muted tiny">{item.hint}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="palette__hint">{t('palette.hint')}</p>
      </div>
    </div>
  );
}

export function PaletteButton() {
  const { t } = useI18n();
  const mac = isMac();
  return (
    <button type="button" className="search-launch" aria-label={t('palette.open')} onClick={() => emit(EV.palette)}>
      <IconSearch />
      <span className="search-launch__label">{t('palette.open')}</span>
      <kbd className="search-launch__kbd">{mac ? t('palette.kbdMac') : t('palette.kbd')}</kbd>
    </button>
  );
}
