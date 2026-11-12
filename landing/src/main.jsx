import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { getPage, metadata } from './catalog.js';
import './style.css';

const base = import.meta.env.BASE_URL.slice(0, -1);
const page = getPage(location.pathname.slice(base.length));
const meta = metadata(page);
document.title = meta.title;
if (!document.querySelector('meta[name="description"]')) {
  const description = document.createElement('meta');
  description.name = 'description';
  description.content = meta.description;
  document.head.append(description);
}
const root = document.getElementById('root');
const app = <App page={page} />;
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
