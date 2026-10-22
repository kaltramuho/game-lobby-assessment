const KEY = 'merrin.favs';
const listeners = new Set<() => void>();

export function readFavs(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

export function writeFavs(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
  listeners.forEach((listener) => listener());
}

export function toggleFav(id: string) {
  const current = readFavs();
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  writeFavs(next);
}

export function subscribeFavs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
