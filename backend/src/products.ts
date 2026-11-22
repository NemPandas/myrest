import { germanTranslation, saveGerman, validateGerman, localizeGerman } from './product-translations.js';
import { Router } from 'express';
import type { Request, Response } from 'express';
import type { PoolConnection } from 'mysql2/promise';
import { z } from 'zod';
import { currentAdmin, requireAdmin } from './accounts.js';
import { lastInsertId, pool, rows, transaction, write } from './db.js';
import { conflict, idSchema, invalid, notFound, pageSchema } from './http.js';
import { createProductBody, productState, slugSchema, updateProductBody, localizedVersionBody, productLanguage } from './product-input.js';
import type { ProductInput } from './product-input.js';
import { validateStoredImages } from './image-storage.js';

const visible = "status = 'published' AND deleted_at IS NULL";
const visibleFor = (language: string) => language === 'de'
  ? "deleted_at IS NULL AND EXISTS (SELECT 1 FROM product_translations t WHERE t.product_id = products.id AND t.status = 'published')"
  : visible;
const cardColumns = 'id, slug, model_code, name, summary, gross_price_huf, features';
const detailColumns = cardColumns + ', massage_level, description, specifications, source_url, seo_title, seo_description';
const adminColumns = detailColumns + ', status, sort_order, version, deleted_at, created_at, updated_at';

type Image = { id: string; url: string; alt_text: string; sort_order: number };
type Variant = { id: string; code: string; disabled_at: Date | null };
type Product = {
  id: string;
  slug: string;
  version: number;
  status: z.infer<typeof productState>;
  deleted_at: Date | null;
  summary: string | null;
  description: string | null;
  gross_price_huf: number | null;
};

async function productDetail(db: PoolConnection, key: string, admin: boolean, language = 'hu') {
  const [product] = admin
    ? await rows<Pick<Product, 'id'>>(db, `SELECT ${adminColumns} FROM products WHERE id = ?`, [key])
    : await rows<Pick<Product, 'id'>>(db, `SELECT ${detailColumns} FROM products WHERE slug = ? AND ${visibleFor(language)}`, [key]);
  if (!product) notFound();
  const { id } = product;
  const images = await rows(db, `
    SELECT id, url, alt_text, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order, id
  `, [id]);
  const variants = await rows(db, `
    SELECT id, code, color_name, color_hex, sort_order${admin ? ', disabled_at' : ''}
    FROM product_variants WHERE product_id = ? ${admin ? '' : 'AND disabled_at IS NULL'}
    ORDER BY sort_order, id
  `, [id]);
  const german = await germanTranslation(db, id);
  const result = { ...product, images, variants };
  if (admin) return { ...result, translations: { de: german } };
  return language === 'de' && german ? localizeGerman(result as typeof result & {
    images: { url: string; alt_text: string }[]; variants: { code: string; color_name: string }[];
  }, german) : result;
}

export const publicProducts = Router();

publicProducts.get('/', async (req, res) => {
  const language = productLanguage.default('hu').parse(req.query.lang);
  const { limit, offset } = pageSchema.parse(req.query);
  const items = await transaction(async db => {
    const products = await rows<Pick<Product, 'id'>>(db, `
      SELECT ${cardColumns} FROM products WHERE ${visibleFor(language)} ORDER BY sort_order, id LIMIT ? OFFSET ?
    `, [limit, offset]);
    if (!products.length) return [];
    const ids = products.map(product => product.id);
    const covers = await rows<Image & { product_id: string }>(db, `
      SELECT product_id, id, url, alt_text, sort_order FROM (
        SELECT product_id, id, url, alt_text, sort_order,
          ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY sort_order, id) AS image_rank
        FROM product_images WHERE product_id IN (${ids.map(() => '?').join(', ')})
      ) ranked WHERE image_rank = 1
    `, ids);
    const coverByProduct = new Map(covers.map(({ product_id, ...image }) => [product_id, image]));
    return Promise.all(products.map(async product => {
      const result = { ...product, cover: coverByProduct.get(product.id) ?? null };
      const german = language === 'de' ? await germanTranslation(db, product.id) : null;
      return german ? localizeGerman(result, german) : result;
    }));
  }, { snapshot: true });
  res.json({ items, limit, offset });
});

publicProducts.get('/:slug', async (req, res) => {
  const language = productLanguage.default('hu').parse(req.query.lang);
  const slug = slugSchema.safeParse(req.params.slug);
  if (!slug.success) notFound();
  res.json(await transaction(db => productDetail(db, slug.data, false, language), { snapshot: true }));
});

export const adminProducts = Router();
adminProducts.use(requireAdmin);

const ordering = {
  position: 'sort_order ASC',
  name: 'name ASC',
  updated: 'updated_at DESC',
};

const adminQuery = pageSchema.extend({
  language: productLanguage.default('hu'),
  status: productState.optional(),
  deleted: z.enum(['exclude', 'only', 'all']).default('exclude'),
  q: z.string().trim().max(180).optional(),
  order: z.enum(['position', 'name', 'updated']).default('updated'),
});

adminProducts.get('/', async (req, res) => {
  const { limit, offset, status, deleted, q, order, language } = adminQuery.parse(req.query);
  const conditions: string[] = [];
  const parameters: string[] = [];
  if (deleted !== 'all') conditions.push(deleted === 'only' ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL');
  if (status) {
    conditions.push(language === 'de' ? "COALESCE((SELECT status FROM product_translations t WHERE t.product_id = products.id), 'draft') = ?" : 'status = ?');
    parameters.push(status);
  }
  if (q) {
    const pattern = '%' + q.replace(/[!%_]/g, '!$&') + '%';
    conditions.push("(name LIKE ? ESCAPE '!' OR slug LIKE ? ESCAPE '!' OR model_code LIKE ? ESCAPE '!' OR EXISTS (SELECT 1 FROM product_translations t WHERE t.product_id = products.id AND JSON_UNQUOTE(JSON_EXTRACT(t.content, '$.name')) LIKE ? ESCAPE '!'))");
    parameters.push(pattern, pattern, pattern, pattern);
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const items = await rows(pool, `
    SELECT ${cardColumns}, status, sort_order, version, deleted_at, updated_at,
      COALESCE((SELECT status FROM product_translations t WHERE t.product_id = products.id), 'draft') AS german_status,
      (SELECT JSON_EXTRACT(t.content, '$.gross_price_eur') FROM product_translations t WHERE t.product_id = products.id) AS gross_price_eur FROM products
    ${where} ORDER BY ${ordering[order]}, id LIMIT ? OFFSET ?
  `, [...parameters, limit, offset]);
  res.json({ items, limit, offset });
});

adminProducts.get('/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  res.json(await transaction(db => productDetail(db, id, true), { snapshot: true }));
});

adminProducts.get('/:id/audit', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { limit, offset } = pageSchema.parse(req.query);
  const items = await transaction(async db => {
    const [product] = await rows(db, 'SELECT id FROM products WHERE id = ?', [id]);
    if (!product) notFound();
    return rows(db, `
      SELECT id, admin_id, action, product_version, created_at FROM product_audit_log
      WHERE product_id = ? ORDER BY product_version DESC LIMIT ? OFFSET ?
    `, [id, limit, offset]);
  }, { snapshot: true });
  res.json({ items, limit, offset });
});

function productValues(input: ProductInput) {
  const { images: _images, variants: _variants, translations: _translations, ...fields } = input;
  return Object.entries(fields).map(([column, value]) => ({
    column,
    value: value != null && (column === 'features' || column === 'specifications') ? JSON.stringify(value) : value,
  }));
}

async function updateChildren(db: PoolConnection, id: string, input: ProductInput) {
  if (input.translations) await saveGerman(db, id, input.translations.de);
  if (input.images !== undefined) {
    await validateStoredImages(input.images);
    await write(db, 'DELETE FROM product_images WHERE product_id = ?', [id]);
    for (const [index, image] of input.images.entries()) {
      await write(db, `
        INSERT INTO product_images (product_id, url, alt_text, sort_order) VALUES (?, ?, ?, ?)
      `, [id, image.url, image.alt_text, image.sort_order ?? index]);
    }
  }
  if (input.variants !== undefined) {
    const existing = await rows<Variant>(db, 'SELECT id, code, disabled_at FROM product_variants WHERE product_id = ?', [id]);
    const byCode = new Map(existing.map(variant => [variant.code.toUpperCase(), variant]));
    for (const [index, variant] of input.variants.entries()) {
      const saved = byCode.get(variant.code);
      const values = [variant.color_name, variant.color_hex, variant.sort_order ?? index, Number(variant.active)];
      if (saved) {
        byCode.delete(variant.code);
        await write(db, `
          UPDATE product_variants SET color_name = ?, color_hex = ?, sort_order = ?,
            disabled_at = IF(?, NULL, COALESCE(disabled_at, UTC_TIMESTAMP(6))) WHERE id = ?
        `, [...values, saved.id]);
      } else {
        await write(db, `
          INSERT INTO product_variants (product_id, code, color_name, color_hex, sort_order, disabled_at)
          VALUES (?, ?, ?, ?, ?, IF(?, NULL, UTC_TIMESTAMP(6)))
        `, [id, variant.code, ...values]);
      }
    }
    for (const variant of byCode.values()) {
      if (!variant.disabled_at) {
        await write(db, 'UPDATE product_variants SET disabled_at = UTC_TIMESTAMP(6) WHERE id = ?', [variant.id]);
      }
    }
  }
}

type Lifecycle = 'publish' | 'unpublish' | 'delete' | 'restore';
type Action = 'create' | 'update' | Lifecycle;

async function audit(db: PoolConnection, id: string, admin: string, action: Action, version: number) {
  await write(db, `
    INSERT INTO product_audit_log (product_id, admin_id, action, product_version, created_at)
    VALUES (?, ?, ?, ?, UTC_TIMESTAMP(6))
  `, [id, admin, action, version]);
}

async function editable(db: PoolConnection, id: string, version: number) {
  const [product] = await rows<Product>(db, `
    SELECT id, slug, version, status, deleted_at, summary, description, gross_price_huf
    FROM products WHERE id = ? FOR UPDATE
  `, [id]);
  if (!product) notFound();
  if (product.version !== version) conflict('A termék időközben megváltozott. Töltsd be újra.');
  return product;
}

async function validatePublication(db: PoolConnection, product: Product) {
  if (!product.summary?.trim() || !product.description?.trim() || !product.gross_price_huf) {
    invalid('A közzétételhez összefoglaló, leírás és pozitív bruttó ár szükséges.');
  }
  const [image] = await rows(db, `
    SELECT id FROM product_images WHERE product_id = ? AND TRIM(alt_text) <> '' LIMIT 1
  `, [product.id]);
  if (!image) invalid('A közzétételhez legalább egy kép szükséges alternatív szöveggel.');
  const [variant] = await rows(db, `
    SELECT id FROM product_variants WHERE product_id = ? AND disabled_at IS NULL AND TRIM(color_name) <> '' LIMIT 1
  `, [product.id]);
  if (!variant) invalid('A közzétételhez legalább egy aktív változat szükséges.');
}

adminProducts.post('/', async (req, res) => {
  const input = createProductBody.parse(req.body);
  const admin = currentAdmin(res).id;
  const product = await transaction(async db => {
    const entries = productValues(input);
    await write(db, `
      INSERT INTO products (${entries.map(entry => entry.column).join(', ')}, created_at, updated_at)
      VALUES (${entries.map(() => '?').join(', ')}, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))
    `, entries.map(entry => entry.value));
    const id = await lastInsertId(db);
    await updateChildren(db, id, input);
    await audit(db, id, admin, 'create', 1);
    return productDetail(db, id, true);
  }, { mediaLock: input.images !== undefined });
  res.status(201).json(product);
});

adminProducts.patch('/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { version, ...input } = updateProductBody.parse(req.body);
  const admin = currentAdmin(res).id;
  const product = await transaction(async db => {
    const current = await editable(db, id, version);
    if (current.deleted_at) conflict('A törölt terméket előbb vissza kell állítani.');
    if (input.slug && input.slug !== current.slug) {
      const [published] = await rows(db, `
        SELECT id FROM product_audit_log WHERE product_id = ? AND action = 'publish' LIMIT 1
      `, [id]);
      if (published || current.status === 'published') conflict('A már közzétett termék slugja rögzített.');
    }
    await updateChildren(db, id, input);
    if (current.status === 'published') await validatePublication(db, { ...current, ...input });
    const german = await germanTranslation(db, id);
    if (german?.status === 'published') await validateGerman(db, id);
    const entries = productValues(input);
    const assignments = entries.map(entry => entry.column + ' = ?');
    assignments.push('version = version + 1', 'updated_at = UTC_TIMESTAMP(6)');
    await write(db, `UPDATE products SET ${assignments.join(', ')} WHERE id = ?`, [...entries.map(entry => entry.value), id]);
    await audit(db, id, admin, 'update', version + 1);
    return productDetail(db, id, true);
  }, { mediaLock: input.images !== undefined });
  res.json(product);
});

const transitions: Record<Lifecycle, string> = {
  publish: "status = 'published'",
  unpublish: "status = 'draft'",
  delete: "status = 'draft', deleted_at = UTC_TIMESTAMP(6)",
  restore: "status = 'draft', deleted_at = NULL",
};

function transition(action: Lifecycle) {
  return async (req: Request, res: Response) => {
    const id = idSchema.parse(req.params.id);
    const { version, language } = localizedVersionBody.parse(req.body);
    const admin = currentAdmin(res).id;
    const result = await transaction(async db => {
      const current = await editable(db, id, version);
      if (action === 'restore' ? !current.deleted_at : current.deleted_at) {
        conflict('A művelet a termék jelenlegi törlési állapotában nem érhető el.');
      }
      const german = language === 'de' ? await germanTranslation(db, id) : null;
      const status = language === 'de' ? german?.status || 'draft' : current.status;
      if (action === 'publish' && status === 'published' ||
          action === 'unpublish' && status === 'draft') {
        conflict('A termék már a kért állapotban van.');
      }
      if (action === 'publish') {
        if (language === 'de') await validateGerman(db, id);
        else await validatePublication(db, current);
      }
      if (language === 'de' && ['publish', 'unpublish'].includes(action)) {
        await write(db, 'UPDATE product_translations SET status = ? WHERE product_id = ?', [action === 'publish' ? 'published' : 'draft', id]);
      }
      if (action === 'delete') await write(db, "UPDATE product_translations SET status = 'draft' WHERE product_id = ?", [id]);
      await write(db, `
        UPDATE products SET ${language === 'de' && ['publish', 'unpublish'].includes(action) ? 'id = id' : transitions[action]}, version = version + 1, updated_at = UTC_TIMESTAMP(6) WHERE id = ?
      `, [id]);
      await audit(db, id, admin, action, version + 1);
      return productDetail(db, id, true);
    });
    res.json(result);
  };
}

adminProducts.post('/:id/publish', transition('publish'));
adminProducts.post('/:id/unpublish', transition('unpublish'));
adminProducts.delete('/:id', transition('delete'));
adminProducts.post('/:id/restore', transition('restore'));
