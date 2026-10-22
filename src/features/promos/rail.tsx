import { useEffect, useRef, useState } from 'react';
import { fetchPromos } from '@/data/api';
import type { Key } from '@/i18n/dictionary';
import { useI18n } from '@/i18n/provider';
import type { PromoId } from '@/lib/types';
import { IconChevron } from '@/ui/icons';
import { arrowStep } from '@/lib/keys';
import { useReducedMotion } from '@/ui/primitives';

function promoKey(id: PromoId, part: 'kicker' | 'title' | 'body'): Key {
  return `promo.${id}.${part}` as Key;
}

export function PromoRail() {
  const { t, dir } = useI18n();
  const reduce = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [promos, setPromos] = useState<PromoId[]>([]);
  const [nonce, setNonce] = useState(0);
  const ignoreFail = useRef(false);

  useEffect(() => {
    const ac = new AbortController();
    const skip = ignoreFail.current;
    ignoreFail.current = false;
    setStatus('loading');
    fetchPromos(ac.signal, skip)
      .then((ids) => {
        if (ac.signal.aborted) return;
        setPromos(ids);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (ac.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        setStatus('error');
      });
    return () => ac.abort();
  }, [nonce]);

  function scrollBy(direction: number) {
    const el = scroller.current;
    if (!el) return;
    const amount = direction * Math.max(240, (el.clientWidth || 280) * 0.8);
    const rtl = getComputedStyle(el).direction === 'rtl';
    el.scrollBy({
      left: rtl ? -amount : amount,
      behavior: reduce ? 'auto' : 'smooth',
    });
  }

  function onKey(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = arrowStep(event.key);
    if (!step) return;
    event.preventDefault();
    scrollBy(step);
  }

  return (
    <section id="promos" className="block" aria-busy={status === 'loading'}>
      <div className="block__head">
        <h2>{t('promo.region')}</h2>
        {status === 'ready' && promos.length > 0 ? (
          <div className="block__tools">
            <button type="button" className="icon-btn" aria-label={t('promo.prev')} onClick={() => scrollBy(-1)}>
              <IconChevron dir={dir === 'rtl' ? 'right' : 'left'} />
            </button>
            <button type="button" className="icon-btn" aria-label={t('promo.next')} onClick={() => scrollBy(1)}>
              <IconChevron dir={dir === 'rtl' ? 'left' : 'right'} />
            </button>
          </div>
        ) : null}
      </div>
      {status === 'loading' ? (
        <>
          <span className="sr-only">{t('loading.promos')}</span>
          <div className="rail" aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="skel rail-skel" key={index} />
            ))}
          </div>
        </>
      ) : null}
      {status === 'error' ? (
        <div className="error-block">
          <p>{t('promo.error')}</p>
          <button
            type="button"
            className="btn btn--solid"
            onClick={() => {
              ignoreFail.current = true;
              setNonce((n) => n + 1);
            }}
          >
            {t('action.retry')}
          </button>
        </div>
      ) : null}
      {status === 'ready' && promos.length === 0 ? <p className="empty">{t('promo.empty')}</p> : null}
      {status === 'ready' && promos.length > 0 ? (
        <div
          className="rail"
          ref={scroller}
          tabIndex={0}
          role="region"
          aria-label={t('promo.region')}
          onKeyDown={onKey}
        >
          {promos.map((id, index) => (
            <article className="rail-card" key={id} data-tone={id}>
              <p className="kicker">
                <span className="kicker__n" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {t(promoKey(id, 'kicker'))}
              </p>
              <h3>{t(promoKey(id, 'title'))}</h3>
              <p>{t(promoKey(id, 'body'))}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
