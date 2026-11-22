import { createHash, randomUUID } from 'node:crypto';
import { Router, json } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { config } from './config.js';
import { email } from './credentials.js';
import { rows, transaction, write } from './db.js';
import { HttpError, conflict, notFound } from './http.js';
import { germanTranslation } from './product-translations.js';
import type { OrderSnapshot } from './order-email.js';
const text = z.string().trim().min(1).max(250);
const address = z.strictObject({ zip: text, city: text, address: text });
const inputSchema = z.strictObject({ requestKey: z.uuid(), language: z.enum(['hu', 'de']),
 slug: z.string().min(1).max(160), variantCode: z.string().max(80), quantity: z.number().int().min(1).max(99),
 name: text, email, phone: text, shippingAddress: address, billingAddress: address,
 expectedTotal: z.number().positive(),
});
export const orders = Router();
orders.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
orders.get('/config', (_req, res) => res.json({ enabled: true, emailEnabled: emailReady(), shipping: config.shipping }));
export function emailReady() {
 return Boolean(config.email.apiKey && config.email.from && config.email.notify && config.bank.beneficiary && config.bank.account);
}
orders.post('/', rateLimit({ windowMs: 60 * 60 * 1000, limit: 20 }), json({ limit: '16kb' }), async (req, res) => {
 if (!config.allowedOrigins.includes(req.get('Origin') || '')) throw new HttpError(403, 'invalid_origin', 'Invalid origin');
 const input = inputSchema.parse(req.body);
 const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
 const result = await transaction(async db => {
  const [existing] = await rows<{ snapshot: OrderSnapshot; request_hash: string }>(db, 'SELECT snapshot, request_hash FROM orders WHERE request_key = ?', [input.requestKey]);
  if (existing) { if (existing.request_hash !== hash) conflict('Order attempt changed'); return existing.snapshot; }
  const [product] = await rows<{ id: string; name: string; model_code: string; gross_price_huf: number }>(db,
   `SELECT id, name, model_code, gross_price_huf FROM products WHERE slug = ? AND deleted_at IS NULL
    AND ${input.language === 'hu' ? "status = 'published'" : "EXISTS (SELECT 1 FROM product_translations t WHERE t.product_id = products.id AND t.status = 'published')"} FOR SHARE`, [input.slug]);
  if (!product) notFound();
  const variants = await rows<{ code: string; color_name: string }>(db, 'SELECT code, color_name FROM product_variants WHERE product_id = ? AND disabled_at IS NULL FOR SHARE', [product.id]);
  const variant = variants.find(item => item.code === input.variantCode);
  if (variants.length && !variant) throw new HttpError(422, 'invalid_variant', 'Invalid variant');
  const german = input.language === 'de' ? await germanTranslation(db, product.id) : null;
  if (input.language === 'de' && (german?.status !== 'published' || !german.name || !german.gross_price_eur)) notFound();
  const price = input.language === 'de' ? german!.gross_price_eur! : product.gross_price_huf;
  const shipping = config.shipping[input.language]!;
  const subtotal = Math.round(price * input.quantity * 100) / 100;
  const total = Math.round((subtotal + shipping) * 100) / 100;
  if (Math.abs(total - input.expectedTotal) > 0.001) conflict('Price changed');
  const format = (value: z.infer<typeof address>) => [value.zip, value.city, value.address].join(', ');
  const snapshot: OrderSnapshot = { id: 'MR-' + randomUUID(), emailQueued: emailReady(), language: input.language, name: input.name, email: input.email, phone: input.phone,
   productId: product.id, variantCode: variant?.code || '', product: german?.name || product.name, model: product.model_code,
   variant: german ? german.variant_names.find(item => item.code === variant?.code)?.color_name || '' : variant?.color_name || '',
   quantity: input.quantity, subtotal, shipping, total, currency: input.language === 'de' ? 'EUR' : 'HUF',
   shippingAddress: format(input.shippingAddress), billingAddress: format(input.billingAddress),
   bank: { beneficiary: config.bank.beneficiary || '', account: config.bank.account || '', bic: config.bank.bic } };
  await write(db, 'INSERT INTO orders (id, request_key, request_hash, snapshot, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(6))', [snapshot.id, input.requestKey, hash, JSON.stringify(snapshot)]);
  if (snapshot.emailQueued) await write(db, "INSERT INTO order_emails (order_id, kind) VALUES (?, 'customer'), (?, 'owner')", [snapshot.id, snapshot.id]);
  return snapshot;
 });
 res.status(201).json({ id: result.id, email: result.email, total: result.total, bank: result.bank, emailQueued: result.emailQueued ?? false });
});
// A dedicated worker sends persisted messages independently from checkout requests.
export async function processOrderEmails(send: (order: OrderSnapshot, owner: boolean) => Promise<void>) {
 for (let i = 0; i < 20; i++) {
  const processed = await transaction(async db => {
   const [job] = await rows<{ order_id: string; kind: string }>(db,
    'SELECT order_id, kind FROM order_emails WHERE sent_at IS NULL AND next_attempt_at <= UTC_TIMESTAMP(6) ORDER BY next_attempt_at LIMIT 1 FOR UPDATE SKIP LOCKED');
   if (!job) return false;
   const [order] = await rows<{ snapshot: OrderSnapshot }>(db, 'SELECT snapshot FROM orders WHERE id = ?', [job.order_id]);
   try {
    await send(order.snapshot, job.kind === 'owner');
    await write(db, 'UPDATE order_emails SET sent_at = UTC_TIMESTAMP(6), attempts = attempts + 1 WHERE order_id = ? AND kind = ?', [job.order_id, job.kind]);
   } catch {
    await write(db, 'UPDATE order_emails SET attempts = attempts + 1, next_attempt_at = DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 5 MINUTE) WHERE order_id = ? AND kind = ?', [job.order_id, job.kind]);
    console.error('Order email failed; retry scheduled', { order: job.order_id, kind: job.kind });
   }
   return true;
  });
  if (!processed) break;
 }
}
