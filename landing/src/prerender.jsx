import React from 'react';
import { loadEnv } from 'vite';
import { renderToString } from 'react-dom/server';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { App } from './App.jsx';
import { getPage, metadata, getProducts, setProducts, loadProducts, productUrl, orderUrl } from './catalog.js';
import { setLocale } from '../../shared/i18n.js';

const template = await readFile('dist/index.html', 'utf8');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const env = loadEnv('production', process.cwd(), '');
const apiBase = (env.MYREST_API_TARGET || 'http://localhost:3001').replace(/\/$/, '');
const catalogs = { hu: await loadProducts('hu', apiBase), de: await loadProducts('de', apiBase) };
for (const language of ['hu', 'de']) {
  setLocale(language);
  const items = catalogs[language];
  setProducts(items);
  const paths = ['/', '/masszazsfotelek/', ...getProducts().flatMap(item => [productUrl(item), orderUrl(item)]), '/404.html', '/product-shell.html'];
  for (const path of paths) {
    const shell = path === '/product-shell.html';
    const page = shell ? { kind: 'loading' } : getPage(path);
    const { title, description } = metadata(page);
    const alternates = ['hu', 'de'].filter(lang => !page.product || catalogs[lang].some(product => product.slug === page.product.slug)).map(lang => '<link rel="alternate" hreflang="' + lang + '" href="' + base + '/' + lang + path + '">').join('');
    const html = template.replace('lang="hu"', 'lang="' + language + '"')
      .replace(/<title>.*?<\/title>/, () => '<title>' + escape(title) + '</title>')
      .replace('<!-- page-meta -->', () => '<meta name="description" content="' + escape(description) + '">' + alternates)
      .replace('<div id="root"></div>', () => '<div id="root" data-locale="' + language + '"' + (shell ? ' data-shell="true"' : '') + '>' + renderToString(<App page={page} path={path} />) + '</div>' + (shell ? '' : '<script type="application/json" id="catalog-data">' + JSON.stringify(items).replaceAll('<', String.fromCharCode(92) + 'u003c') + '</script>'));
    const relative = path.endsWith('/') ? path + 'index.html' : path;
    const target = join('dist', language, relative);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, html);
    // Legacy links retain their path; main.jsx selects a language on entry.
    if (language === 'hu') {
      const legacy = join('dist', relative);
      await mkdir(dirname(legacy), { recursive: true });
      await writeFile(legacy, html);
    }
  }
}
