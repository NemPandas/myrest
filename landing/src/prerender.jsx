import React from 'react';
import { renderToString } from 'react-dom/server';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { App } from './App.jsx';
import { getPage, metadata, products, productUrl, orderUrl } from './catalog.js';

const template = await readFile('dist/index.html', 'utf8');
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;');

for (const path of ['/', ...products.flatMap((item) => [productUrl(item), orderUrl(item)]), '/404.html']) {
  const page = getPage(path);
  const { title, description } = metadata(page);
  const html = template
    .replace(/<title>.*?<\/title>/, () => '<title>' + escape(title) + '</title>')
    .replace('<!-- page-meta -->', () => '<meta name="description" content="' + escape(description) + '">')
    .replace('<div id="root"></div>', () => '<div id="root">' + renderToString(<App page={page} />) + '</div>');
  const target = join('dist', path.endsWith('/') ? path + 'index.html' : path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
}
