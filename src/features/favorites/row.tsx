import { useEffect, useRef, useState } from 'react';
import { peekGames, subscribeGames } from '@/data/catalog-cache';
import { readFavs, subscribeFavs, toggleFav, writeFavs } from '@/data/favorites';
import { focusGameCard } from '@/lib/focus-game';
import { arrowStep } from '@/lib/keys';
import { useI18n } from '@/i18n/provider';
import { useQuery } from '@/features/query/query';
import type { Game } from '@/lib/types';
import { IconClose } from '@/ui/icons';

export function FavoritesRow() {
  const { t } = useI18n();
  const { replace } = useQuery();
  const [ids, setIds] = useState<string[]>(readFavs);
  const [games, setGames] = useState<Game[]>(() => peekGames() ?? []);
  const idsRef = useRef(ids);
  const drag = useRef<{ id: string; origin: number; moved: boolean; width: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dx, setDx] = useState(0);

  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);

  useEffect(() => subscribeGames(() => setGames(peekGames() ?? [])), []);
  useEffect(
    () =>
      subscribeFavs(() => {
        if (drag.current) return;
        setIds(readFavs());
      }),
    [],
  );

  const items = ids
    .map((id) => games.find((game) => game.id === id))
    .filter((game): game is Game => Boolean(game));

  function jump(game: Game) {
    replace((params) => {
      params.delete('cat');
      params.delete('tag');
      params.delete('provider');
      params.set('q', game.title);
    });
    focusGameCard(game.id);
  }

  function move(id: string, dir: -1 | 1) {
    const current = idsRef.current;
    const index = current.indexOf(id);
    const nextIndex = index + dir;
    if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return;
    const next = current.slice();
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(nextIndex, 0, item);
    idsRef.current = next;
    setIds(next);
    writeFavs(next);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>, id: string) {
    if (event.button !== 0) return;
    const el = event.currentTarget;
    el.setPointerCapture(event.pointerId);
    drag.current = {
      id,
      origin: event.clientX,
      moved: false,
      width: el.getBoundingClientRect().width + 8,
    };
    setDraggingId(id);
    setDx(0);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active) return;
    const physical = event.clientX - active.origin;
    const sign = document.documentElement.dir === 'rtl' ? -1 : 1;
    let delta = physical * sign;
    if (Math.abs(physical) > 5) active.moved = true;
    while (delta > active.width * 0.55) {
      const before = idsRef.current.indexOf(active.id);
      move(active.id, 1);
      if (idsRef.current.indexOf(active.id) === before) break;
      delta -= active.width;
      active.origin += active.width * sign;
    }
    while (delta < -active.width * 0.55) {
      const before = idsRef.current.indexOf(active.id);
      move(active.id, -1);
      if (idsRef.current.indexOf(active.id) === before) break;
      delta += active.width;
      active.origin -= active.width * sign;
    }
    setDx(event.clientX - active.origin);
  }

  function onPointerUp() {
    drag.current = null;
    setDraggingId(null);
    setDx(0);
  }

  return (
    <section id="favorites" className="block">
      <h2>{t('fav.title')}</h2>
      <p id="fav-hint" className="sr-only">
        {t('fav.hint')}
      </p>
      {items.length === 0 ? (
        <p className="empty">{t('fav.empty')}</p>
      ) : (
        <div className="fav-row" role="list">
          {items.map((game) => (
            <div
              key={game.id}
              role="listitem"
              className={draggingId === game.id ? 'fav is-dragging' : 'fav'}
              tabIndex={0}
              aria-describedby="fav-hint"
              style={draggingId === game.id ? { transform: `translateX(${dx}px)` } : undefined}
              onPointerDown={(event) => onPointerDown(event, game.id)}
              onPointerMove={onPointerMove}
              onPointerUp={() => {
                const moved = drag.current?.moved;
                const id = drag.current?.id;
                onPointerUp();
                if (!moved && id === game.id) jump(game);
              }}
              onKeyDown={(event) => {
                const step = arrowStep(event.key);
                if (step) {
                  event.preventDefault();
                  move(game.id, step);
                } else if (event.key === 'Enter') {
                  jump(game);
                }
              }}
            >
              <span className="fav__name">{game.title}</span>
              <button
                type="button"
                className="icon-btn icon-btn--tiny"
                aria-label={t('fav.remove', { title: game.title })}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => toggleFav(game.id)}
              >
                <IconClose />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
