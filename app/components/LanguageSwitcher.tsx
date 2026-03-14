'use client';

import { useLocale } from '@/app/LocaleContext';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className="language-switcher"
      role="group"
      aria-label="Language / Langue"
    >
      <button
        type="button"
        onClick={() => setLocale('en')}
        title="English"
        aria-pressed={locale === 'en'}
        className={locale === 'en' ? 'active' : ''}
      >
        <span className="flag" aria-hidden>🇬🇧</span>
      </button>
      <button
        type="button"
        onClick={() => setLocale('fr')}
        title="Français"
        aria-pressed={locale === 'fr'}
        className={locale === 'fr' ? 'active' : ''}
      >
        <span className="flag" aria-hidden>🇫🇷</span>
      </button>
    </div>
  );
}
