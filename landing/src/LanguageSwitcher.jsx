import React from 'react';
import { getLocale, t } from '../../shared/i18n.js';

export function LanguageSwitcher({ path = '/' }) {
  return <nav className="language-switcher" aria-label={t('Nyelv')}>
    {['hu', 'de'].map(language => <a key={language} href={languageHref(language, path)} lang={language} title={language === 'hu' ? 'Magyar' : 'Deutsch'}
      aria-current={getLocale() === language ? 'page' : undefined} onClick={event => {
        event.preventDefault();
        try { localStorage.setItem('myrest-language', language); } catch { /* Storage may be disabled. */ }
        location.assign(languageHref(language, path) + location.search + location.hash);
      }}>{language === 'hu' ? 'HU' : 'DE'}</a>)}
  </nav>;
}
function languageHref(language, fallbackPath) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base + '/' + language + fallbackPath;
}
