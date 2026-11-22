import React, { useEffect, useState } from 'react';
import { ProductCard } from '../../shared/ProductViews.jsx';
import { getLocale, t } from '../../shared/i18n.js';
import { getProducts, siteUrl } from './catalog.js';

const emptyFilters = () => ({ q: '', min: '', max: '', types: [], colors: [], sort: 'recommended' });
const massageTypes = () => [...new Set(getProducts().map(product => product.level).filter(Boolean))].sort();
const colors = () => [...new Map(getProducts().flatMap(product => product.colors || []).map(item => [item.key, item])).values()]
  .sort((a, b) => a.name.localeCompare(b.name, getLocale())).map(item => [item.key, item.name, item.swatch]);
const priceValue = value => value !== '' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;

function readFilters() {
  const params = new URLSearchParams(location.search);
  const price = name => priceValue(params.get(name) || '') === null ? '' : params.get(name);
  return {
    q: (params.get('q') || '').slice(0, 180), min: price('min'), max: price('max'),
    types: params.getAll('type').filter(value => value.length <= 80),
    colors: params.getAll('color').filter(value => value.length <= 100),
    sort: ['price-asc', 'price-desc', 'name'].includes(params.get('sort')) ? params.get('sort') : 'recommended',
  };
}

export function Catalog() {
  const [filters, setFilters] = useState(emptyFilters);
  const [ready, setReady] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    const restore = () => setFilters(readFilters());
    restore(); setReady(true);
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams(location.search);
    for (const key of ['q', 'min', 'max', 'type', 'color', 'sort']) params.delete(key);
    for (const key of ['q', 'min', 'max']) if (filters[key]) params.set(key, filters[key]);
    filters.types.forEach(value => params.append('type', value));
    filters.colors.forEach(value => params.append('color', value));
    if (filters.sort !== 'recommended') params.set('sort', filters.sort);
    const query = params.toString();
    history.replaceState(null, '', location.pathname + (query ? '?' + query : '') + location.hash);
  }, [filters, ready]);

  const change = (key, value) => setFilters(previous => ({ ...previous, [key]: value }));
  const toggle = (key, value) => setFilters(previous => ({ ...previous,
    [key]: previous[key].includes(value) ? previous[key].filter(item => item !== value) : [...previous[key], value],
  }));
  const min = priceValue(filters.min), max = priceValue(filters.max);
  const invalidPrice = min !== null && max !== null && max < min;
  const search = filters.q.trim().toLocaleLowerCase(getLocale());
  const items = getProducts().filter(product => !invalidPrice
    && (!search || (product.name + ' ' + product.model).toLocaleLowerCase(getLocale()).includes(search))
    && (min === null || product.price >= min) && (max === null || product.price <= max)
    && (!filters.types.length || filters.types.includes(product.level))
    && (!filters.colors.length || (product.colors || []).some(color => filters.colors.includes(color.key))));
  if (filters.sort === 'price-asc') items.sort((a, b) => a.price - b.price);
  if (filters.sort === 'price-desc') items.sort((a, b) => b.price - a.price);
  if (filters.sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name, getLocale()));
  const hasFilters = Boolean(filters.q || filters.min || filters.max || filters.types.length || filters.colors.length || filters.sort !== 'recommended');

  return <div className="wrap catalog-page">
    <nav className="breadcrumb" aria-label={t('Útvonal')}><a href={siteUrl('/')}>{t('Kezdőlap')}</a><span> / {t('Masszázsfotelek')}</span></nav>
    <header className="catalog-intro">
      <h1>{t('Masszázsfotelek')}</h1>
      <p>{t('Hasonlítsa össze a modelleket, és szűkítse a kínálatot az Önnek fontos szempontok szerint.')}</p>
    </header>
    <button type="button" className="catalog-filter-toggle" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={() => setFiltersOpen(!filtersOpen)}>{t(filtersOpen ? 'Szűrők elrejtése' : 'Szűrők megjelenítése')}</button>
    <div className="catalog-layout">
      <aside id="catalog-filters" className={'catalog-filters' + (filtersOpen ? ' is-open' : '')} aria-label={t('Szűrők')}>
        <div className="catalog-filter-heading"><h2>{t('Szűrők')}</h2><button type="button" disabled={!hasFilters} onClick={() => setFilters(emptyFilters())}>{t('Szűrők törlése')}</button></div>
        <label className="catalog-search">{t('Keresés a modellek között')}<input type="search" placeholder={t('Név vagy modellkód')} maxLength={180} value={filters.q} onChange={event => change('q', event.target.value)} /></label>
        <fieldset><legend>{t('Ár (Ft)')}</legend><div className="catalog-price-range">
          <label>{t('Minimum')}<input aria-label={t('Minimum ár')} type="number" min="0" step="1" inputMode="numeric" value={filters.min} onChange={event => change('min', event.target.value)} aria-invalid={invalidPrice} aria-describedby={invalidPrice ? 'price-filter-error' : undefined} /></label>
          <label>{t('Maximum')}<input aria-label={t('Maximum ár')} type="number" min="0" step="1" inputMode="numeric" value={filters.max} onChange={event => change('max', event.target.value)} aria-invalid={invalidPrice} aria-describedby={invalidPrice ? 'price-filter-error' : undefined} /></label>
        </div>{invalidPrice && <p id="price-filter-error" className="catalog-filter-error" role="alert">{t('A maximum ár nem lehet kisebb a minimum árnál.')}</p>}</fieldset>
        {!!massageTypes().length && <fieldset><legend>{t('Masszázstípus')}</legend>{massageTypes().map(type => <label className="catalog-filter-option" key={type}><input type="checkbox" checked={filters.types.includes(type)} onChange={() => toggle('types', type)} /><span>{type}</span></label>)}</fieldset>}
        {!!colors().length && <fieldset><legend>{t('Szín')}</legend>{colors().map(([key, label, swatch]) => <label className="catalog-filter-option" key={key}><input type="checkbox" checked={filters.colors.includes(key)} onChange={() => toggle('colors', key)} /><span className="catalog-swatch" style={{ backgroundColor: swatch }} aria-hidden="true" /><span>{label}</span></label>)}</fieldset>}
      </aside>
      <section className="catalog-results" aria-label={t('Eredmények')}>
        <div className="catalog-results-bar"><p role="status" aria-live="polite" aria-atomic="true">{items.length} {t('fotel')}</p><label>{t('Rendezés')}<select value={filters.sort} onChange={event => change('sort', event.target.value)}>
          <option value="recommended">{t('Ajánlott sorrend')}</option><option value="price-asc">{t('Ár szerint növekvő')}</option><option value="price-desc">{t('Ár szerint csökkenő')}</option><option value="name">{t('Név szerint')}</option>
        </select></label></div>
        {items.length ? <div className="catalog catalog-grid">{items.map(product => <ProductCard key={product.slug} product={product} />)}</div>
          : <div className="catalog-empty"><h2>{t('Nincs megfelelő találat.')}</h2><p>{t('Próbáljon más szűrőket, vagy törölje a szűrést az összes modell megtekintéséhez.')}</p><button className="button" type="button" onClick={() => setFilters(emptyFilters())}>{t('Szűrők törlése')}</button></div>}
      </section>
    </div>
  </div>;
}
