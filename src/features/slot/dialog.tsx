import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { EV, on } from '@/lib/bus';
import type { Key } from '@/i18n/dictionary';
import { peekGames } from '@/data/catalog-cache';
import { useI18n } from '@/i18n/provider';
import { formatMoney, formatRtp } from '@/lib/money';
import { paytable, playableRtpPercent, spinReels, STRIP, type SymbolId } from '@/lib/slot-math';
import type { Game } from '@/lib/types';
import { arrowStep } from '@/lib/keys';
import { Dialog, useReducedMotion } from '@/ui/primitives';
import { useWallet } from '@/features/wallet/wallet';

const STAKES = [20, 50, 100, 200, 500];
const CELL = 76;

function mark(id: SymbolId | 'pair') {
  switch (id) {
    case 'cherry':
    case 'pair':
      return 'CH';
    case 'lemon':
      return 'LM';
    case 'plum':
      return 'PL';
    case 'bell':
      return 'BL';
    case 'bar':
      return 'BAR';
    case 'seven':
      return '7';
    case 'star':
      return '★';
    default: {
      const unexpected: never = id;
      return unexpected;
    }
  }
}
const LOOPS = 6;

type Result =
  | { kind: 'idle' }
  | { kind: 'spinning' }
  | { kind: 'low' }
  | { kind: 'win'; amount: number; symbols: SymbolId[] }
  | { kind: 'lose'; symbols: SymbolId[] };

function symKey(id: SymbolId): Key {
  switch (id) {
    case 'cherry':
      return 'sym.cherry';
    case 'lemon':
      return 'sym.lemon';
    case 'plum':
      return 'sym.plum';
    case 'bell':
      return 'sym.bell';
    case 'bar':
      return 'sym.bar';
    case 'seven':
      return 'sym.seven';
    case 'star':
      return 'sym.star';
    default: {
      const unexpected: never = id;
      throw new Error(unexpected);
    }
  }
}

function Reel({
  stop,
  spinning,
  duration,
}: {
  stop: number;
  spinning: boolean;
  duration: number;
}) {
  const reduce = useReducedMotion();
  const stripRef = useRef<HTMLDivElement>(null);
  const fromStop = useRef(stop);
  const total = (LOOPS + 2) * STRIP.length;

  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const place = (index: number, animate: boolean) => {
      el.style.transition = animate ? `transform ${duration}ms cubic-bezier(.15,.72,.12,1)` : 'none';
      el.style.transform = `translateY(${-(index - 1) * CELL}px)`;
    };
    if (reduce || !spinning) {
      place(STRIP.length + stop, false);
      fromStop.current = stop;
      return;
    }
    place(STRIP.length + fromStop.current, false);
    const frame = requestAnimationFrame(() => {
      place(LOOPS * STRIP.length + stop, true);
      fromStop.current = stop;
    });
    return () => cancelAnimationFrame(frame);
  }, [spinning, stop, duration, reduce]);

  return (
    <div className="reel-window" style={{ height: CELL * 3 }}>
      <div className="reel-strip" ref={stripRef}>
        {Array.from({ length: total }, (_, index) => {
          const symbol = STRIP[index % STRIP.length];
          return (
            <div className="sym" data-sym={symbol} style={{ height: CELL }} key={index}>
              <span className="sym__mark">{symbol ? mark(symbol) : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlotTable({ game, onClose }: { game: Game; onClose: () => void }) {
  const { t, locale } = useI18n();
  const wallet = useWallet();
  const reduce = useReducedMotion();
  const [bet, setBet] = useState(100);
  const [phase, setPhase] = useState<'idle' | 'spinning'>('idle');
  const [stops, setStops] = useState([2, 6, 11]);
  const [result, setResult] = useState<Result>({ kind: 'idle' });
  const phaseRef = useRef<'idle' | 'spinning'>('idle');
  const timer = useRef(0);
  const betAtSpin = useRef(100);
  const outcomeRef = useRef<ReturnType<typeof spinReels> | null>(null);
  const settleRef = useRef<() => void>(() => undefined);

  settleRef.current = () => {
    if (phaseRef.current !== 'spinning') return;
    const outcome = outcomeRef.current;
    phaseRef.current = 'idle';
    setPhase('idle');
    if (!outcome) return;
    if (outcome.multiplier > 0) {
      const amount = Math.round(betAtSpin.current * outcome.multiplier);
      wallet.credit(amount, game.title);
      setResult({ kind: 'win', amount, symbols: outcome.line });
      return;
    }
    setResult({ kind: 'lose', symbols: outcome.line });
  };

  useEffect(() => {
    return () => {
      if (phaseRef.current !== 'spinning') return;
      window.clearTimeout(timer.current);
      settleRef.current();
    };
  }, []);

  function spin() {
    if (phaseRef.current !== 'idle') return;
    if (!wallet.debit(bet, game.title)) {
      setResult({ kind: 'low' });
      return;
    }
    const outcome = spinReels();
    outcomeRef.current = outcome;
    betAtSpin.current = bet;
    phaseRef.current = 'spinning';
    setPhase('spinning');
    setStops(outcome.stops);
    setResult({ kind: 'spinning' });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => settleRef.current(), reduce ? 40 : 2100);
  }

  const symbols = (ids: SymbolId[]) => ids.map((id) => t(symKey(id))).join(', ');
  let message = '';
  if (result.kind === 'spinning') message = t('slot.spinning');
  if (result.kind === 'low') message = t('slot.low');
  if (result.kind === 'lose') message = `${t('slot.nowin')} ${t('slot.landed', { symbols: symbols(result.symbols) })}`;
  if (result.kind === 'win') {
    message = `${t('slot.win', { amount: formatMoney(result.amount, 'USD', locale) })} ${t('slot.landed', { symbols: symbols(result.symbols) })}`;
  }

  const balance = wallet.balanceCents ?? 0;
  const locked = phase !== 'idle';

  return (
    <div className="cabinet">
      <header className="cabinet__bar">
        <div>
          <p className="cabinet__studio">{game.provider}</p>
          <h2>{game.title}</h2>
        </div>
        <p className="cabinet__rtp">{t('slot.rtp', { rtp: formatRtp(playableRtpPercent(), locale) })}</p>
        <button type="button" className="icon-btn" aria-label={t('action.close')} onClick={onClose}>
          ×
        </button>
      </header>
      <div className="cabinet__body">
        <div className="cabinet__glass">
          <div className="reels" aria-hidden="true">
            {stops.map((stop, index) => (
              <Reel key={index} stop={stop} spinning={phase === 'spinning'} duration={700 + index * 550} />
            ))}
          </div>
          <p className="meter" aria-live="polite">
            <span className="meter__label">{result.kind === 'win' ? t('slot.paid') : t('slot.last')}</span>
            <span className="meter__value">{message || t('slot.ready')}</span>
          </p>
        </div>
        <aside className="pays" aria-label={t('slot.paytable')}>
          <h3>{t('slot.paytable')}</h3>
          <ul>
            {paytable().map((row) => (
              <li key={row.id} data-sym={row.id === 'pair' ? 'cherry' : row.id}>
                <span className="sym__mark" aria-hidden="true">
                  {mark(row.id)}
                </span>
                <span>{row.id === 'pair' ? t('slot.pair') : t('slot.three', { symbol: t(symKey(row.id)) })}</span>
                <span className="pays__mult">{row.mult}×</span>
              </li>
            ))}
          </ul>
          <p className="cabinet__rules">{t('slot.rules')}</p>
        </aside>
      </div>
      <footer className="deck">
        <p className="deck__credit">
          <span>{t('slot.credit')}</span>
          <strong>{formatMoney(balance, wallet.currency, locale)}</strong>
        </p>
        <div
          className="deck__bets"
          role="radiogroup"
          aria-label={t('slot.bet')}
          onKeyDown={(event) => {
            if (locked) return;
            const index = STAKES.indexOf(bet);
            const dir = arrowStep(event.key);
            if (!dir) return;
            event.preventDefault();
            const nextIndex = (index + dir + STAKES.length) % STAKES.length;
            const next = STAKES[nextIndex];
            if (next === undefined) return;
            setBet(next);
            event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
          }}
        >
          {STAKES.map((cents) => (
            <button
              key={cents}
              type="button"
              role="radio"
              aria-checked={bet === cents}
              tabIndex={bet === cents ? 0 : -1}
              disabled={locked}
              onClick={() => setBet(cents)}
            >
              {formatMoney(cents, 'USD', locale)}
            </button>
          ))}
        </div>
        <button type="button" className="deck__spin" disabled={locked || balance < bet} onClick={spin}>
          {locked ? t('slot.spinning') : t('slot.spin')}
        </button>
      </footer>
    </div>
  );
}

export function SlotHost() {
  const [game, setGame] = useState<Game | null>(null);

  useEffect(
    () =>
      on(EV.play, (detail) => {
        if (typeof detail !== 'string') return;
        const match = (peekGames() ?? []).find((item) => item.id === detail && item.playable);
        if (match) setGame(match);
      }),
    [],
  );

  return (
    <Dialog open={game !== null} title={game?.title ?? ''} wide onClose={() => setGame(null)}>
      {game ? <SlotTable game={game} onClose={() => setGame(null)} /> : null}
    </Dialog>
  );
}
