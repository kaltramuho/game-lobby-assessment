import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EV, on } from '@/lib/bus';
import { peekGames } from '@/data/catalog-cache';
import { useI18n } from '@/i18n/provider';
import { makeId } from '@/lib/ids';
import { formatMoney } from '@/lib/money';
import { useDocumentHidden, useMedia, useNow, useOverlay } from '@/ui/primitives';

type Win = {
  id: string;
  initials: string;
  name: string;
  game: string;
  cents: number;
  at: number;
};

type FeedUi = {
  open: boolean;
  setOpen: (open: boolean | ((value: boolean) => boolean)) => void;
};

const FeedContext = createContext<FeedUi | null>(null);
const MAX_WINS = 24;

const PLAYERS: [string, string][] = [
  ['Mina V.', 'MV'],
  ['Joris', 'JO'],
  ['Ade', 'AD'],
  ['S. Klein', 'SK'],
  ['Otto', 'OT'],
  ['Nils', 'NI'],
  ['Vera', 'VE'],
  ['H. Okonkwo', 'HO'],
  ['Leah', 'LE'],
  ['P. Duarte', 'PD'],
  ['Samir', 'SA'],
  ['Ines', 'IN'],
  ['Bo', 'BO'],
  ['Greta', 'GR'],
  ['Y. Rahman', 'YR'],
  ['Chris', 'CH'],
];

const FALLBACK_TITLES = ['Glass Orchard', 'Low Tide Roulette', 'The Long Table', 'Night Ferry', 'Wren\'s Wheel'];

function hueOf(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33 + seed.charCodeAt(i)) % 360;
  return h;
}

function makeWin(): Win {
  const player = PLAYERS[Math.floor(Math.random() * PLAYERS.length)] ?? PLAYERS[0];
  const games = peekGames();
  const game = games && games.length
    ? games[Math.floor(Math.random() * games.length)]?.title ?? FALLBACK_TITLES[0]
    : FALLBACK_TITLES[Math.floor(Math.random() * FALLBACK_TITLES.length)];
  const roll = Math.random();
  const dollars = roll > 0.97 ? 80 + Math.random() * 420 : roll > 0.82 ? 12 + Math.random() * 40 : 0.4 + Math.random() * 14;
  return {
    id: makeId('win'),
    initials: player?.[1] ?? '?',
    name: player?.[0] ?? 'Player',
    game: game ?? 'Glass Orchard',
    cents: Math.max(20, Math.round(dollars * 100)),
    at: Date.now(),
  };
}

function failedFeed() {
  return new URLSearchParams(window.location.search).get('fail')?.split(',').includes('feed') ?? false;
}

export function FeedProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);

  useEffect(
    () =>
      on(EV.feed, () => {
        setOpen(true);
      }),
    [],
  );

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

function useFeedUi() {
  const value = useContext(FeedContext);
  if (!value) throw new Error('feed');
  return value;
}

export function FeedButton() {
  const { t } = useI18n();
  const wide = useMedia('(min-width: 1024px)');
  const { open, setOpen } = useFeedUi();
  if (wide) return null;
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls="wins"
      onClick={() => setOpen((value) => !value)}
    >
      {t('nav.wins')}
      <span className="sr-only">. {open ? t('feed.close') : t('feed.open')}</span>
    </button>
  );
}

function ago(at: number, now: number, t: ReturnType<typeof useI18n>['t']) {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 8) return t('time.now');
  if (seconds < 60) return t('time.seconds', { s: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('time.minutes', { m: minutes });
  return t('time.hours', { h: Math.floor(minutes / 60) });
}

export function WinFeed() {
  const { t, locale } = useI18n();
  const { open, setOpen } = useFeedUi();
  const wide = useMedia('(min-width: 1024px)');
  const hidden = useDocumentHidden();
  const now = useNow(5000);
  const [held, setHeld] = useState(false);
  const [hover, setHover] = useState(false);
  const [wins, setWins] = useState<Win[]>([]);
  const [broken, setBroken] = useState(() => failedFeed());
  const dialog = open && !wide;
  const ref = useOverlay<HTMLElement>(dialog, () => setOpen(false));
  const paused = held || hover || hidden;

  useEffect(() => on(EV.feed, () => setHeld((value) => !value)), []);

  useEffect(() => {
    if (paused || broken) return;
    let timer = 0;
    const tick = () => {
      setWins((prev) => [makeWin(), ...prev].slice(0, MAX_WINS));
      timer = window.setTimeout(tick, 1400 + Math.random() * 1800);
    };
    timer = window.setTimeout(tick, 700);
    return () => window.clearTimeout(timer);
  }, [paused, broken]);

  return (
    <>
      {dialog ? (
        <button
          type="button"
          className="drawer-backdrop"
          data-overlay-dismiss
          aria-label={t('feed.close')}
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        id="wins"
        ref={ref}
        className="feed"
        hidden={!wide && !open ? true : undefined}
        role={dialog ? 'dialog' : undefined}
        aria-modal={dialog ? true : undefined}
        aria-label={t('feed.title')}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setHover(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setHover(false);
        }}
      >
        <div className="feed__head">
          <h2>{t('feed.title')}</h2>
          <div className="feed__tools">
            {paused ? <span className="feed__status">{t('feed.paused')}</span> : null}
            <button type="button" className="btn btn--ghost" aria-pressed={held} onClick={() => setHeld((value) => !value)}>
              {held ? <span className="btn__icon" aria-hidden="true">▶</span> : <span className="btn__icon" aria-hidden="true">❚❚</span>}
              {held ? t('feed.resume') : t('feed.pause')}
            </button>
            {dialog ? (
              <button type="button" className="icon-btn" aria-label={t('feed.close')} onClick={() => setOpen(false)}>
                ×
              </button>
            ) : null}
          </div>
        </div>
        {broken ? (
          <div className="error-block">
            <p>{t('feed.error')}</p>
            <button type="button" className="btn btn--solid" onClick={() => setBroken(false)}>
              {t('action.retry')}
            </button>
          </div>
        ) : wins.length === 0 ? (
          held ? (
            <p className="empty">{t('feed.empty')}</p>
          ) : (
            <>
              <span className="sr-only">{t('feed.loading')}</span>
              <div aria-hidden="true">
                {Array.from({ length: 4 }, (_, index) => (
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
          )
        ) : (
          <ul className="feed-list" aria-label={t('feed.region')}>
            {wins.map((win) => (
              <li key={win.id} className="feed-item">
                <span className="avatar" style={{ '--thumb': hueOf(win.name) } as React.CSSProperties}>
                  {win.initials}
                </span>
                <div className="feed-item__body">
                  <div className="feed-item__top">
                    <strong>{win.name}</strong>
                    <span className="feed-item__amt">{formatMoney(win.cents, 'USD', locale)}</span>
                  </div>
                  <div className="muted tiny">
                    {win.game} · {ago(win.at, now, t)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}
