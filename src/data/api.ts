import { rememberGames } from '@/data/catalog-cache';
import type { Game, PromoId, Tag, Txn, TxnKind, WalletSnapshot } from '@/lib/types';

const CATALOG_CACHE = 'merrin.catalog.v1';
const CATEGORIES = new Set(['slots', 'table', 'live']);
const TAGS = new Set(['new', 'hot', 'jackpot', 'classic', 'ways', 'high-limit']);
const PROMO_IDS = new Set<PromoId>(['calder', 'pit', 'salon', 'tuesday', 'ferry']);
const KINDS = new Set<TxnKind>(['deposit', 'stake', 'win']);

function hasFlag(name: 'fail' | 'empty', key: string) {
  const raw = new URLSearchParams(window.location.search).get(name) ?? '';
  return raw.split(',').map((part) => part.trim()).includes(key);
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => resolve(), ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('aborted', 'AbortError'));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function parseGames(data: unknown): Game[] {
  if (!Array.isArray(data)) throw new Error('catalog');
  return data.map((row) => {
    if (!row || typeof row !== 'object') throw new Error('catalog');
    const game = row as Record<string, unknown>;
    const tags = game.tags;
    if (typeof game.id !== 'string' || typeof game.title !== 'string') throw new Error('catalog');
    if (typeof game.providerId !== 'string' || typeof game.provider !== 'string') throw new Error('catalog');
    if (typeof game.category !== 'string' || !CATEGORIES.has(game.category)) throw new Error('catalog');
    if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string' || !TAGS.has(tag))) throw new Error('catalog');
    if (typeof game.rtp !== 'number' || typeof game.minBet !== 'number' || typeof game.maxBet !== 'number') {
      throw new Error('catalog');
    }
    if (typeof game.trend !== 'number' || typeof game.releasedAt !== 'string') throw new Error('catalog');
    return {
      id: game.id,
      title: game.title,
      providerId: game.providerId,
      provider: game.provider,
      category: game.category as Game['category'],
      tags: tags as Tag[],
      rtp: game.rtp,
      minBet: game.minBet,
      maxBet: game.maxBet,
      trend: game.trend,
      releasedAt: game.releasedAt,
      playable: game.playable === true,
    };
  });
}

function readCatalogCache() {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE);
    if (!raw) return null;
    return parseGames(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export async function fetchGames(signal: AbortSignal, ignoreFail: boolean) {
  if (!ignoreFail && hasFlag('fail', 'catalog')) {
    await wait(320, signal);
    throw new Error('catalog');
  }
  try {
    if (import.meta.env.DEV) await wait(480, signal);
    const res = await fetch('/games.json', { signal });
    if (!res.ok) throw new Error(String(res.status));
    const games = parseGames(await res.json());
    rememberGames(games);
    try {
      localStorage.setItem(CATALOG_CACHE, JSON.stringify(games));
    } catch {
      // Private mode or a full disk. The lobby still renders.
    }
    return { games, stale: false };
  } catch (error) {
    if (signal.aborted) throw error;
    const cached = readCatalogCache();
    if (cached) {
      rememberGames(cached);
      return { games: cached, stale: true };
    }
    throw error;
  }
}

export async function fetchPromos(signal: AbortSignal, ignoreFail: boolean): Promise<PromoId[]> {
  if (!ignoreFail && hasFlag('fail', 'promos')) {
    await wait(280, signal);
    throw new Error('promos');
  }
  if (import.meta.env.DEV) await wait(360, signal);
  if (hasFlag('empty', 'promos')) return [];
  const res = await fetch('/promos.json', { signal });
  if (!res.ok) throw new Error(String(res.status));
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error('promos');
  const ids: PromoId[] = [];
  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    const id = (row as { id?: unknown }).id;
    if (typeof id === 'string' && PROMO_IDS.has(id as PromoId)) ids.push(id as PromoId);
  }
  return ids;
}

function parseTxn(row: unknown): Txn {
  if (!row || typeof row !== 'object') throw new Error('wallet');
  const txn = row as Record<string, unknown>;
  if (typeof txn.id !== 'string' || typeof txn.kind !== 'string' || !KINDS.has(txn.kind as TxnKind)) {
    throw new Error('wallet');
  }
  if (typeof txn.cents !== 'number' || typeof txn.createdAt !== 'string') throw new Error('wallet');
  return {
    id: txn.id,
    kind: txn.kind as TxnKind,
    cents: txn.cents,
    createdAt: txn.createdAt,
    note: typeof txn.note === 'string' ? txn.note : '',
    status: txn.status === 'pending' ? 'pending' : 'posted',
  };
}

export async function fetchWallet(signal: AbortSignal, ignoreFail: boolean): Promise<WalletSnapshot> {
  if (!ignoreFail && hasFlag('fail', 'wallet')) {
    await wait(300, signal);
    throw new Error('wallet');
  }
  if (import.meta.env.DEV) await wait(400, signal);
  const res = await fetch('/wallet.json', { signal });
  if (!res.ok) throw new Error(String(res.status));
  const data: unknown = await res.json();
  if (!data || typeof data !== 'object') throw new Error('wallet');
  const wallet = data as Record<string, unknown>;
  if (wallet.currency !== 'USD' || typeof wallet.balanceCents !== 'number' || !Array.isArray(wallet.transactions)) {
    throw new Error('wallet');
  }
  const transactions = hasFlag('empty', 'wallet') ? [] : wallet.transactions.map(parseTxn);
  return { currency: 'USD', balanceCents: wallet.balanceCents, transactions };
}
