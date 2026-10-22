export const EV = {
  palette: 'merrin:palette',
  deposit: 'merrin:deposit',
  play: 'merrin:play',
  feed: 'merrin:feed-toggle',
  theme: 'merrin:theme',
} as const;

export function emit(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on(name: string, fn: (detail: unknown) => void) {
  const handler = (event: Event) => {
    fn((event as CustomEvent).detail);
  };
  window.addEventListener(name, handler);
  return () => window.removeEventListener(name, handler);
}
