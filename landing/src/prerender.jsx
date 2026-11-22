import React from 'react';
import { renderToString } from 'react-dom/server';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { App } from './App.jsx';
import { getPage, metadata, products, productUrl, orderUrl } from './catalog.js';
import { setLocale } from '../../shared/i18n.js';

const template = await readFile('dist/index.html', 'utf8');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const paths = ['/', ...products.flatMap(item => [productUrl(item), orderUrl(item)]), '/404.html'];
for (const language of ['hu', 'de']) {
  setLocale(language);
  for (const path of paths) {
    const page = getPage(path);
    const { title, description } = metadata(page);
    const alternates = ['hu', 'de'].map(lang => '<link rel="alternate" hreflang="' + lang + '" href="' + base + '/' + lang + path + '">').join('');
    const html = template.replace('lang="hu"', 'lang="' + language + '"')
      .replace(/<title>.*?<\/title>/, () => '<title>' + escape(title) + '</title>')
      .replace('<!-- page-meta -->', () => '<meta name="description" content="' + escape(description) + '">' + alternates)
      .replace('<div id="root"></div>', () => '<div id="root" data-locale="' + language + '">' + renderToString(<App page={page} path={path} />) + '</div>');
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
