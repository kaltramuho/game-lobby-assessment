import { useEffect, useRef } from 'react';
import { EV, on } from '@/lib/bus';
import { useI18n } from '@/i18n/provider';
import { formatMoney } from '@/lib/money';
import { useReducedMotion } from '@/ui/primitives';

const START = 184320.55;

export function Jackpot() {
  const { t, locale } = useI18n();
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spokenRef = useRef<HTMLSpanElement>(null);
  const target = useRef(START);
  const shown = useRef(START);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const surface: HTMLCanvasElement = canvas;
    const context: CanvasRenderingContext2D = ctx;

    let raf = 0;
    let lastSpoken = 0;
    let lastBump = performance.now();

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = surface.clientWidth || 160;
      const height = surface.clientHeight || 36;
      surface.width = Math.max(1, Math.floor(width * dpr));
      surface.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(value: number) {
      const width = surface.clientWidth || 160;
      const height = surface.clientHeight || 36;
      context.clearRect(0, 0, width, height);
      const color = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#1c1915';
      context.fillStyle = color;
      context.font = `500 ${Math.max(15, Math.min(22, width / 9))}px "IBM Plex Mono", ui-monospace, monospace`;
      context.textBaseline = 'middle';
      const rtl = document.documentElement.dir === 'rtl';
      context.textAlign = rtl ? 'right' : 'left';
      context.fillText(formatMoney(Math.round(value * 100), 'USD', locale), rtl ? width : 0, height / 2 + 1);
    }

    function speak(now: number) {
      if (!spokenRef.current || now - lastSpoken < 8000) return;
      lastSpoken = now;
      spokenRef.current.textContent = formatMoney(Math.round(shown.current * 100), 'USD', locale);
    }

    function loop(now: number) {
      raf = 0;
      if (document.hidden) return;
      if (now - lastBump >= 1500) {
        lastBump = now;
        target.current += 0.35 + Math.random() * 2.8;
      }
      if (reduce) {
        shown.current = target.current;
      } else {
        shown.current += (target.current - shown.current) * 0.08;
        if (Math.abs(target.current - shown.current) < 0.01) shown.current = target.current;
      }
      draw(shown.current);
      speak(now);
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (raf || document.hidden) return;
      raf = requestAnimationFrame(loop);
    }

    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    resize();
    draw(shown.current);
    start();

    const observer = new ResizeObserver(() => {
      resize();
      draw(shown.current);
    });
    observer.observe(canvas);

    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVis);
    const offTheme = on(EV.theme, () => draw(shown.current));
    document.fonts?.ready.then(() => draw(shown.current)).catch(() => undefined);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      offTheme();
    };
  }, [locale, reduce]);

  return (
    <div className="jackpot">
      <span className="jackpot__label">{t('jackpot.label')}</span>
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="sr-only" ref={spokenRef} aria-live="polite">
        {formatMoney(Math.round(START * 100), 'USD', locale)}
      </span>
    </div>
  );
}
