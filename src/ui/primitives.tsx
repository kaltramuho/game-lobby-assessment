import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const inertHolds = new Map<HTMLElement, number>();

function holdInert(el: HTMLElement) {
  inertHolds.set(el, (inertHolds.get(el) ?? 0) + 1);
  el.inert = true;
}

function releaseInert(el: HTMLElement) {
  const next = (inertHolds.get(el) ?? 1) - 1;
  if (next > 0) {
    inertHolds.set(el, next);
    return;
  }
  inertHolds.delete(el);
  el.inert = false;
}

function inertOutside(dialog: HTMLElement) {
  const held: HTMLElement[] = [];
  let node: HTMLElement | null = dialog;
  while (node && node !== document.body) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    for (const child of parent.children) {
      if (!(child instanceof HTMLElement) || child === node) continue;
      if (child.hasAttribute('data-overlay-dismiss')) continue;
      holdInert(child);
      held.push(child);
    }
    node = parent;
  }
  return () => {
    for (const el of held) releaseInert(el);
  };
}

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatch(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return match;
}

export function useReducedMotion() {
  return useMedia('(prefers-reduced-motion: reduce)');
}

export function useOverlay<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.dataset.overlay = '1';
    document.body.style.overflow = 'hidden';
    const root = ref.current;
    const focusables = () =>
      root
        ? [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute('disabled'))
        : [];
    const release = root ? inertOutside(root) : () => undefined;
    const frame = requestAnimationFrame(() => focusables()[0]?.focus());

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      const inside = Boolean(root?.contains(active));
      if (!inside || (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      release();
      delete document.body.dataset.overlay;
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open]);

  return ref;
}

export function Dialog({
  open,
  title,
  onClose,
  wide,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useOverlay<HTMLDivElement>(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="backdrop" onMouseDown={onClose}>
      <div
        className={wide ? 'dialog dialog--wide' : 'dialog'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(timer);
  }, [ms]);
  return now;
}

export function useDocumentHidden() {
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return hidden;
}
