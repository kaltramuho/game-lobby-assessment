import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchWallet } from '@/data/api';
import { EV, on } from '@/lib/bus';
import { useI18n } from '@/i18n/provider';
import { makeId } from '@/lib/ids';
import {
  PAY_CURRENCIES,
  endsWithNine,
  formatMoney,
  formatPlain,
  formatWhen,
  parseAmountToCents,
  toUsdCents,
  usdPerUnit,
  type PayCurrency,
} from '@/lib/money';
import type { Txn, TxnKind } from '@/lib/types';
import { Dialog, useReducedMotion } from '@/ui/primitives';

type WalletValue = {
  status: 'loading' | 'ready' | 'error';
  currency: 'USD';
  balanceCents: number | null;
  transactions: Txn[];
  reload: (ignoreFail?: boolean) => void;
  debit: (cents: number, note: string) => boolean;
  credit: (cents: number, note: string) => void;
  deposit: (sourceCents: number, currency: PayCurrency, sourceLabel: string) => Promise<void>;
};

const WalletContext = createContext<WalletValue | null>(null);

function txnKey(kind: TxnKind) {
  if (kind === 'deposit') return 'txn.deposit' as const;
  if (kind === 'stake') return 'txn.stake' as const;
  return 'txn.win' as const;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [currency, setCurrency] = useState<'USD'>('USD');
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [nonce, setNonce] = useState(0);
  const ignoreFail = useRef(false);
  const balanceRef = useRef(0);

  const setBal = useCallback((next: number) => {
    balanceRef.current = next;
    setBalanceCents(next);
  }, []);

  const pushTxn = useCallback((txn: Txn) => {
    setTransactions((rows) => [txn, ...rows].slice(0, 20));
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const skipFail = ignoreFail.current;
    ignoreFail.current = false;
    setStatus('loading');
    fetchWallet(ac.signal, skipFail)
      .then((wallet) => {
        if (ac.signal.aborted) return;
        setCurrency(wallet.currency);
        setBal(wallet.balanceCents);
        setTransactions(wallet.transactions);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (ac.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        setStatus('error');
      });
    return () => ac.abort();
  }, [nonce, setBal]);

  const reload = useCallback((skip?: boolean) => {
    ignoreFail.current = Boolean(skip);
    setNonce((n) => n + 1);
  }, []);

  const debit = useCallback(
    (cents: number, note: string) => {
      if (cents <= 0 || balanceRef.current < cents) return false;
      setBal(balanceRef.current - cents);
      pushTxn({
        id: makeId('stake'),
        kind: 'stake',
        cents: -cents,
        createdAt: new Date().toISOString(),
        note,
        status: 'posted',
      });
      return true;
    },
    [pushTxn, setBal],
  );

  const credit = useCallback(
    (cents: number, note: string) => {
      if (cents <= 0) return;
      setBal(balanceRef.current + cents);
      pushTxn({
        id: makeId('win'),
        kind: 'win',
        cents,
        createdAt: new Date().toISOString(),
        note,
        status: 'posted',
      });
    },
    [pushTxn, setBal],
  );

  const deposit = useCallback(
    async (sourceCents: number, payIn: PayCurrency, sourceLabel: string) => {
      const usd = toUsdCents(sourceCents, payIn);
      const id = makeId('dep');
      setBal(balanceRef.current + usd);
      pushTxn({
        id,
        kind: 'deposit',
        cents: usd,
        createdAt: new Date().toISOString(),
        note: sourceLabel,
        status: 'pending',
      });
      await new Promise((resolve) => window.setTimeout(resolve, 720));
      if (endsWithNine(sourceCents)) {
        setBal(balanceRef.current - usd);
        setTransactions((rows) => rows.filter((row) => row.id !== id));
        throw new Error('declined');
      }
      setTransactions((rows) => rows.map((row) => (row.id === id ? { ...row, status: 'posted' } : row)));
    },
    [pushTxn, setBal],
  );

  const value: WalletValue = {
    status,
    currency,
    balanceCents,
    transactions,
    reload,
    debit,
    credit,
    deposit,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error('wallet');
  return value;
}

function BalanceFigure({ cents, currency }: { cents: number; currency: string }) {
  const { locale } = useI18n();
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(cents);
  const shownRef = useRef(cents);
  const first = useRef(true);

  useEffect(() => {
    if (first.current || reduce) {
      first.current = false;
      shownRef.current = cents;
      setShown(cents);
      return;
    }
    const from = shownRef.current;
    const started = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - started) / 680);
      const eased = 1 - (1 - p) ** 3;
      const next = Math.round(from + (cents - from) * eased);
      shownRef.current = next;
      setShown(next);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [cents, reduce]);

  return <span className="balance__num">{formatMoney(shown, currency, locale)}</span>;
}

export function WalletChip() {
  const { t, locale } = useI18n();
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'home' | 'deposit'>('home');

  useEffect(() => on(EV.deposit, () => {
    setStep('deposit');
    setOpen(true);
  }), []);

  if (wallet.status === 'error') {
    return (
      <div className="wallet-error" role="alert">
        <span>{t('wallet.error')}</span>
        <button type="button" className="btn btn--ghost" onClick={() => wallet.reload(true)}>
          {t('action.retry')}
        </button>
      </div>
    );
  }

  if (wallet.status === 'loading' || wallet.balanceCents === null) {
    return (
      <div className="skel skel-chip" role="status">
        <span className="sr-only">{t('loading.wallet')}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="balance"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setStep('home');
          setOpen(true);
        }}
      >
        <span className="sr-only">{t('wallet.balance')}</span>
        <BalanceFigure cents={wallet.balanceCents} currency={wallet.currency} />
        <span className="balance__code">{wallet.currency}</span>
      </button>
      <WalletDialog
        open={open}
        step={step}
        locale={locale}
        onStep={setStep}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function WalletDialog({
  open,
  step,
  locale,
  onStep,
  onClose,
}: {
  open: boolean;
  step: 'home' | 'deposit';
  locale: string;
  onStep: (step: 'home' | 'deposit') => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const wallet = useWallet();
  const title = step === 'deposit' ? t('deposit.title') : t('wallet.open');

  return (
    <Dialog open={open} title={title} onClose={step === 'deposit' ? () => onStep('home') : onClose}>
      <div className="dialog__head">
        <h2>{title}</h2>
        <button type="button" className="icon-btn" aria-label={t('action.close')} onClick={onClose}>
          ×
        </button>
      </div>
      {wallet.balanceCents !== null && (
        <p className="wallet-balance">
          <span className="sr-only">{t('wallet.balance')}</span>
          <BalanceFigure cents={wallet.balanceCents} currency={wallet.currency} />
          <span className="balance__code">
            <span className="sr-only">{t('wallet.currency')} </span>
            {wallet.currency}
          </span>
        </p>
      )}
      {step === 'home' ? (
        <>
          <div className="dialog__row">
            <h3>{t('wallet.recent')}</h3>
            <button type="button" className="btn btn--solid" onClick={() => onStep('deposit')}>
              {t('wallet.deposit')}
            </button>
          </div>
          {wallet.transactions.length === 0 ? (
            <p className="empty">{t('wallet.empty')}</p>
          ) : (
            <ul className="txn-list">
              {wallet.transactions.map((txn) => (
                <li key={txn.id} className={txn.status === 'pending' ? 'txn txn--pending' : 'txn'}>
                  <div>
                    <strong>{t(txnKey(txn.kind))}</strong>
                    {txn.note ? <span className="muted"> {txn.note}</span> : null}
                    <div className="muted tiny">
                      {formatWhen(txn.createdAt, locale)}
                      {txn.status === 'pending' ? ` · ${t('txn.pending')}` : ''}
                    </div>
                  </div>
                  <span className={txn.cents < 0 ? 'txn__amt' : 'txn__amt txn__amt--up'}>
                    {formatMoney(txn.cents, wallet.currency, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <DepositForm
          locale={locale}
          onCancel={() => onStep('home')}
          onDone={() => onStep('home')}
        />
      )}
    </Dialog>
  );
}

function DepositForm({
  locale,
  onCancel,
  onDone,
}: {
  locale: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const wallet = useWallet();
  const [raw, setRaw] = useState('');
  const [currency, setCurrency] = useState<PayCurrency>('USD');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const cents = parseAmountToCents(raw);
  const credit = cents === null ? null : toUsdCents(cents, currency);
  const rate = formatPlain(usdPerUnit(currency), locale);

  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (cents === null) {
      setError(t('deposit.badAmount'));
      return;
    }
    setError('');
    setPending(true);
    const sourceLabel = currency === 'USD' ? '' : `${currency} ${raw.trim()}`;
    try {
      await wallet.deposit(cents, currency, sourceLabel);
      setRaw('');
      onDone();
    } catch {
      setError(t('deposit.declined'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <label className="field">
        <span>{t('deposit.amount')}</span>
        <input
          inputMode="decimal"
          autoComplete="off"
          value={raw}
          disabled={pending}
          onChange={(event) => {
            setRaw(event.target.value);
            setError('');
          }}
        />
      </label>
      <label className="field">
        <span>{t('deposit.currency')}</span>
        <select
          value={currency}
          disabled={pending}
          onChange={(event) => setCurrency(event.target.value as PayCurrency)}
        >
          {PAY_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>
      <p className="rate">
        <span>{t('deposit.rate')}</span>
        <strong>{t('deposit.rateValue', { code: currency, rate })}</strong>
      </p>
      <p className="rate">
        <span>{t('deposit.receive')}</span>
        <strong>{credit === null ? t('deposit.none') : formatMoney(credit, 'USD', locale)}</strong>
      </p>
      {error ? (
        <p className="alert" role="alert" tabIndex={-1} ref={alertRef}>
          {error}
        </p>
      ) : null}
      <div className="dialog__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={pending}>
          {t('deposit.cancel')}
        </button>
        <button type="submit" className="btn btn--solid" disabled={pending}>
          {pending ? t('deposit.pending') : t('deposit.confirm')}
        </button>
      </div>
    </form>
  );
}
