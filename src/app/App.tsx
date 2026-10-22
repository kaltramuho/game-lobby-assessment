import { Component, useEffect, type ReactNode } from 'react';
import { Catalog } from '@/features/catalog/catalog';
import { FavoritesRow } from '@/features/favorites/row';
import { FeedProvider, WinFeed } from '@/features/feed/feed';
import { CommandPalette } from '@/features/palette/palette';
import { PromoRail } from '@/features/promos/rail';
import { QueryProvider } from '@/features/query/query';
import { Header } from '@/features/shell/header';
import { SlotHost } from '@/features/slot/dialog';
import { WalletProvider } from '@/features/wallet/wallet';
import { translate } from '@/i18n/dictionary';
import { applyDocumentLang, readLang } from '@/i18n/locale';
import { I18nProvider, useI18n } from '@/i18n/provider';

class LobbyBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const lang = readLang();
    return (
      <div className="crash">
        <p>{translate(lang, 'crash.body')}</p>
        <button type="button" className="btn btn--solid" onClick={() => window.location.reload()}>
          {translate(lang, 'crash.reload')}
        </button>
      </div>
    );
  }
}

function Shell() {
  const { t, lang } = useI18n();
  useEffect(() => {
    document.title = t('meta.title');
    applyDocumentLang(lang);
  }, [t, lang]);

  return (
    <>
      <a className="skip" href="#main">
        {t('meta.skip')}
      </a>
      <div className="frame">
        <div className="dock">
          <Header />
          <FavoritesRow />
        </div>
        <main id="main" className="stage">
          <PromoRail />
          <Catalog />
        </main>
        <WinFeed />
      </div>
      <CommandPalette />
      <SlotHost />
    </>
  );
}

export function App() {
  return (
    <I18nProvider>
      <QueryProvider>
        <WalletProvider>
          <FeedProvider>
            <LobbyBoundary>
              <Shell />
            </LobbyBoundary>
          </FeedProvider>
        </WalletProvider>
      </QueryProvider>
    </I18nProvider>
  );
}
