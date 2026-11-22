export const productUrl = (product) => '/masszazsfotelek/' + product.slug + '/';
export const orderUrl = (product) => productUrl(product) + 'rendeles/';
export const siteUrl = (path) => (import.meta.env.VITE_STOREFRONT_BASE || import.meta.env.BASE_URL) + path.slice(1);
export const photo = (product, view = 'front') => product.isAdminProduct ? (product.images?.[Number(view) || 0]?.url || '') : siteUrl('/media/' + product.slug + '-' + view + '.webp');
export const money = (value) => new Intl.NumberFormat('hu-HU', {
  style: 'currency', currency: 'HUF', maximumFractionDigits: 0,
}).format(value);

