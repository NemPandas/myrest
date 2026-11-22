import type { PoolConnection } from 'mysql2/promise';
import type { z } from 'zod';
import { rows, write } from './db.js';
import { invalid } from './http.js';
import type { translationBody } from './product-input.js';

export type Translation = z.infer<typeof translationBody>;
export type German = Translation & { status: 'draft' | 'published' };
export async function germanTranslation(db: PoolConnection, id: string): Promise<German | null> {
  const [row] = await rows<{ content: Translation; status: German['status'] }>(db,
    'SELECT content, status FROM product_translations WHERE product_id = ?', [id]);
  return row ? { ...row.content, status: row.status } : null;
}
export async function saveGerman(db: PoolConnection, id: string, content: Translation) {
  await write(db, `INSERT INTO product_translations (product_id, content) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE content = ?`, [id, JSON.stringify(content), JSON.stringify(content)]);
}
export async function validateGerman(db: PoolConnection, id: string, price: number | null) {
  const translation = await germanTranslation(db, id);
  if (!translation?.name?.trim() || !translation.summary?.trim() || !translation.description?.trim() || !price) {
    invalid('A német közzétételhez német terméknév, összefoglaló, leírás és pozitív közös ár szükséges.');
  }
  const images = await rows<{ url: string }>(db, 'SELECT url FROM product_images WHERE product_id = ?', [id]);
  if (!images.length || images.some(image => !translation.image_alts.find(item => item.url === image.url)?.alt_text?.trim())) {
    invalid('A német közzétételhez legalább egy kép, és minden képhez német képleírás szükséges.');
  }
  const variants = await rows<{ code: string }>(db, 'SELECT code FROM product_variants WHERE product_id = ? AND disabled_at IS NULL', [id]);
  if (!variants.length || variants.some(variant => !translation.variant_names.find(item => item.code === variant.code.toUpperCase())?.color_name?.trim())) {
    invalid('A német közzétételhez minden aktív színváltozat német neve szükséges.');
  }
}
export function localizeGerman<T extends { cover?: { url: string; alt_text: string } | null; images?: { url: string; alt_text: string }[]; variants?: { code: string; color_name: string }[] }>(product: T, translation: Translation) {
  const imageAlt = (url: string) => translation.image_alts.find(item => item.url === url)?.alt_text || '';
  return { ...product, name: translation.name, summary: translation.summary, description: translation.description,
    features: translation.features, specifications: translation.specifications, seo_title: translation.seo_title,
    seo_description: translation.seo_description,
    ...(product.cover ? { cover: { ...product.cover, alt_text: imageAlt(product.cover.url) } } : {}),
    ...(product.images ? { images: product.images.map(image => ({ ...image, alt_text: imageAlt(image.url) })) } : {}),
    ...(product.variants ? { variants: product.variants.map(variant => ({ ...variant,
      color_name: translation.variant_names.find(item => item.code === variant.code.toUpperCase())?.color_name || '' })) } : {}),
  };
}
