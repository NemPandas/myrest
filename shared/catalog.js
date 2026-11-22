import { getLocale, languagePath } from './i18n.js';
export const productUrl = (product) => '/masszazsfotelek/' + product.slug + '/';
export const orderUrl = (product) => productUrl(product) + 'rendeles/';
export const siteUrl = (path) => {
  const base = import.meta.env.VITE_STOREFRONT_BASE || import.meta.env.BASE_URL;
  const localized = import.meta.env.VITE_LANDING_I18N && !/^\/(media|assets|api)(\/|$)/.test(path) ? languagePath(path) : path;
  return base + localized.slice(1);
};
export const photo = (product, view = 'front') => product.isAdminProduct ? (product.images?.[Number(view) || 0]?.url || '') : siteUrl('/media/' + product.slug + '-' + view + '.webp');
export const money = (value, language = getLocale()) => new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'hu-HU', {
  style: 'currency', currency: 'HUF', maximumFractionDigits: 0,
}).format(value);

