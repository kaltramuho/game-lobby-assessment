import { useEffect, useState } from 'react';
import { EV, on } from '@/lib/bus';
import { FeedButton } from '@/features/feed/feed';
import { useI18n } from '@/i18n/provider';
import { IconMoon, IconSun } from '@/ui/icons';
import { Jackpot } from '@/features/shell/jackpot';
import { PaletteButton } from '@/features/palette/palette';
import { applyHue, currentTheme, readHue, toggleTheme, type ThemeName } from '@/features/theme/theme';
import { WalletChip } from '@/features/wallet/wallet';

function ThemeControls() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<ThemeName>(currentTheme);
  const [hue, setHue] = useState(readHue);

  useEffect(
    () =>
      on(EV.theme, () => {
        setTheme(currentTheme());
        setHue(readHue());
      }),
    [],
  );

  return (
    <div className="theme-controls">
      <button
        type="button"
        className="icon-btn"
        aria-pressed={theme === 'dark'}
        aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
        onClick={() => toggleTheme()}
      >
        {theme === 'dark' ? <IconSun /> : <IconMoon />}
      </button>
      <label className="hue">
        <span className="sr-only">{t('theme.hue')}</span>
        <input
          type="range"
          min={0}
          max={360}
          value={hue}
          onChange={(event) => {
            const next = Number(event.target.value);
            setHue(next);
            applyHue(next);
          }}
        />
      </label>
    </div>
  );
}

export function Header() {
  const { t, cycleLang, nextLabel } = useI18n();
  return (
    <header className="mast">
      <h1 className="brand">
        <a href="#main">
          <span className="mark" aria-hidden="true" />
          <span>{t('brand')}</span>
        </a>
      </h1>
      <nav className="nav" aria-label={t('brand')}>
        <a href="#promos">{t('nav.promos')}</a>
        <a href="#games">{t('nav.games')}</a>
        <FeedButton />
      </nav>
      <Jackpot />
      <div className="tools">
        <PaletteButton />
        <button type="button" className="icon-btn lang" aria-label={t('lang.switch', { name: nextLabel })} onClick={cycleLang}>
          {t('lang.short')}
        </button>
        <ThemeControls />
        <WalletChip />
      </div>
    </header>
  );
}
