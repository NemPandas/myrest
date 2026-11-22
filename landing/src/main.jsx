import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { getPage, metadata } from './catalog.js';
import { setLocale } from '../../shared/i18n.js';
import './style.css';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const relative = location.pathname.slice(base.length) || '/';
const match = relative.match(/^\/(hu|de)(?=\/|$)/);

async function start() {
  if (!match) {
    let language;
    try { language = localStorage.getItem('myrest-language'); } catch { /* Optional preference. */ }
    if (!['hu', 'de'].includes(language)) {
      try {
        const response = await fetch(base + '/api/locale', { signal: AbortSignal.timeout(2500), cache: 'no-store' });
        if (!response.ok) throw new Error('Locale lookup failed');
        language = (await response.json()).language;
      } catch {
        language = navigator.language.toLowerCase().startsWith('hu') ? 'hu' : 'de';
      }
    }
    language = language === 'hu' ? 'hu' : 'de';
    location.replace(base + '/' + language + (relative === '/' ? '/' : relative) + location.search + location.hash);
    return;
  }
  setLocale(match[1]);
  document.documentElement.lang = match[1];
  const path = relative.replace(/^\/(hu|de)/, '') || '/';
  const page = getPage(path);
  const meta = metadata(page);
  document.title = meta.title;
  let description = document.querySelector('meta[name="description"]');
  if (!description) { description = document.createElement('meta'); description.name = 'description'; document.head.append(description); }
  description.content = meta.description;
  const root = document.getElementById('root');
  const app = <App page={page} path={path} />;
  if (root.hasChildNodes() && root.dataset.locale === match[1]) hydrateRoot(root, app);
  else createRoot(root).render(app);
}
start();
