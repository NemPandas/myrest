import { t } from '../../shared/i18n.js';
import { productUrl, orderUrl } from '../../shared/catalog.js';
export { productUrl, orderUrl, siteUrl, photo, money } from '../../shared/catalog.js';

let products = [];
export const getProducts = () => products;
export const setProducts = values => { products = values; };
export function fromApi(record) {
  const variants = (record.variants || []).map(item => ({ ...item, active: !item.disabled_at }));
  const colors = variants.map(item => ({ key: item.color_hex?.toLowerCase() || item.code, name: item.color_name, swatch: item.color_hex || '#edf4f7' }));
  return { ...record, isAdminProduct: true, model: record.model_code, price: record.gross_price_huf,
    level: record.massage_level?.trim().toUpperCase() || '',
    features: record.features || [], specs: (record.specifications || []).map(item => [item.name, item.value]),
    images: record.images || (record.cover ? [record.cover] : []), variants, colors,
    color: colors[0]?.name || '', swatch: colors[0]?.swatch, source: record.source_url };
}
export async function loadProducts(language, apiBase = '') {
  const records = [];
  for (let offset = 0; ; offset += 100) {
    const response = await fetch(apiBase + '/api/products?' + new URLSearchParams({ lang: language, limit: '100', offset: String(offset) }),
      { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Catalog request failed');
    const data = await response.json();
    records.push(...data.items);
    if (data.items.length < 100) break;
  }
  // Details supply the active colors and massage type used by the filters.
  const items = [];
  for (let offset = 0; offset < records.length; offset += 6) {
    const batch = await Promise.all(records.slice(offset, offset + 6).map(async item => {
      const response = await fetch(apiBase + '/api/products/' + encodeURIComponent(item.slug) + '?lang=' + language,
        { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (response.status === 404) return null; // Withdrawn between listing and detail fetch.
      if (!response.ok) throw new Error('Product request failed');
      return fromApi(await response.json());
    }));
    items.push(...batch.filter(Boolean));
  }
  return items;
}

export function getPage(pathname) {
  const path = pathname.replace(/\/+$/, '');
  if (!path) return { kind: 'home' };
  if (path === '/masszazsfotelek') return { kind: 'catalog' };
  for (const product of getProducts()) {
    if (path === productUrl(product).slice(0, -1)) return { kind: 'product', product };
    if (path === orderUrl(product).slice(0, -1)) return { kind: 'order', product };
  }
  return { kind: 'missing' };
}

export function metadata(page) {
  if (page.kind === 'catalog') return { title: t('Masszázsfotelek összehasonlítása | MyRest'), description: t('Találja meg az Önnek megfelelő masszázsfotelt. Szűrés ár, masszázstípus és szín szerint.') };
  if (page.kind === 'product') return {
    title: page.product.seo_title || page.product.name + t(' masszázsfotel | MyRest'),
    description: page.product.seo_description || page.product.summary || page.product.description || '',
  };
  if (page.kind === 'order') return {
    title: t('Próbarendelés – ') + page.product.name + ' | MyRest',
    description: t('Banki átutalásos próbarendelés a MyRest bemutatófelületén.'),
  };
  if (page.kind === 'missing') return { title: t('Az oldal nem található | MyRest'), description: '' };
  return {
    title: t('MyRest | Masszázsfotelek az otthoni pihenéshez'),
    description: t('Ismerje meg a masszázsfoteleket, hasonlítsa össze a modelleket, és találja meg az otthonába illő fotelt.'),
  };
}
