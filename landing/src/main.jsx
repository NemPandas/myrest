import React, { useEffect, useState } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { getPage, metadata, setProducts, loadProducts } from './catalog.js';
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
  const seed = document.getElementById('catalog-data');
  const initial = seed ? JSON.parse(seed.textContent) : null;
  const root = document.getElementById('root');
  const app = <Storefront path={path} language={match[1]} initial={initial} />;
  if (root.hasChildNodes() && root.dataset.locale === match[1] && !root.dataset.shell) hydrateRoot(root, app);
  else createRoot(root).render(app);
}
function Storefront({ path, language, initial }) {
  const [state, setState] = useState({ items: initial || [], status: initial ? 'ready' : 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    loadProducts(language, base).then(items => { if (active) setState({ items, status: 'ready' }); })
      .catch(() => { if (active) setState({ items: [], status: 'error' }); });
    return () => { active = false; };
  }, [language, attempt]);
  setProducts(state.items);
  const page = state.status === 'loading' ? { kind: 'loading' } : state.status === 'error' ? { kind: 'error', retry: () => {
    setState({ items: [], status: 'loading' }); setAttempt(value => value + 1);
  } } : getPage(path);
  const meta = metadata(page);
  useEffect(() => {
    document.title = meta.title;
    let description = document.querySelector('meta[name="description"]');
    if (!description) { description = document.createElement('meta'); description.name = 'description'; document.head.append(description); }
    description.content = meta.description;
  }, [meta.title, meta.description]);
  return <App page={page} path={path} />;
}
start();
