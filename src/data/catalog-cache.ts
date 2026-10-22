import type { Game } from '@/lib/types';

let games: Game[] | null = null;
const listeners = new Set<() => void>();

export function peekGames() {
  return games;
}

export function rememberGames(next: Game[]) {
  games = next;
  listeners.forEach((listener) => listener());
}

export function subscribeGames(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
