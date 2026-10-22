import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchGames, fetchPromos, fetchWallet } from './api';
import { peekGames } from './catalog-cache';

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
};

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body };
}

async function settle<T>(work: Promise<T>) {
  const pending = work.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  await vi.runAllTimersAsync();
  return pending;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('fixtures', () => {
  it('loads the catalog and keeps a copy', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse([game])));
    const result = await settle(fetchGames(new AbortController().signal, false));
    expect(result.ok && result.value).toMatchObject({ stale: false });
    expect(peekGames()?.[0]?.id).toBe('orchard');
    expect(JSON.parse(localStorage.getItem('merrin.catalog.v1') ?? '[]')).toHaveLength(1);
  });

  it('serves the saved catalog when the file 404s', async () => {
    localStorage.setItem('merrin.catalog.v1', JSON.stringify([game]));
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(null, false)));
    const result = await settle(fetchGames(new AbortController().signal, false));
    expect(result.ok && result.value.stale).toBe(true);
    expect(result.ok && result.value.games[0]?.title).toBe('Glass Orchard');
  });

  it('throws the fail flag before the network, and retry ignores it', async () => {
    window.history.replaceState(null, '', '/?fail=catalog');
    const fetchMock = vi.fn(async () => jsonResponse([game]));
    vi.stubGlobal('fetch', fetchMock);
    const failed = await settle(fetchGames(new AbortController().signal, false));
    expect(failed.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    const retried = await settle(fetchGames(new AbortController().signal, true));
    expect(retried.ok && retried.value.stale).toBe(false);
  });

  it('returns an empty promo or wallet list without dropping the balance', async () => {
    window.history.replaceState(null, '', '/?empty=promos');
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse([{ id: 'calder' }, { id: 'nope' }])));
    const promos = await settle(fetchPromos(new AbortController().signal, false));
    expect(promos.ok && promos.value).toEqual([]);

    window.history.replaceState(null, '', '/?empty=wallet');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          currency: 'USD',
          balanceCents: 24600,
          transactions: [{ id: 't1', kind: 'deposit', cents: 100, createdAt: '2026-01-01T00:00:00.000Z', note: '', status: 'posted' }],
        }),
      ),
    );
    const wallet = await settle(fetchWallet(new AbortController().signal, false));
    expect(wallet.ok && wallet.value.balanceCents).toBe(24600);
    expect(wallet.ok && wallet.value.transactions).toEqual([]);
  });

  it('fails the wallet when asked', async () => {
    window.history.replaceState(null, '', '/?fail=wallet');
    vi.stubGlobal('fetch', vi.fn());
    const result = await settle(fetchWallet(new AbortController().signal, false));
    expect(result.ok).toBe(false);
  });
});
