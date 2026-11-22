import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from './accounts.js';
import { pool, rows } from './db.js';
import { notFound, pageSchema } from './http.js';
import type { OrderSnapshot } from './order-email.js';

type SavedOrder = { id: string; snapshot: OrderSnapshot; status: string; created_at: Date };
const filters = pageSchema.extend({
 q: z.string().trim().max(200).default(''),
 language: z.enum(['hu', 'de']).optional(),
 status: z.enum(['awaiting_transfer', 'paid']).optional(),
});
export const adminOrders = Router();
adminOrders.use(requireAdmin);
adminOrders.get('/', async (req, res) => {
 const { limit, offset, q, language, status } = filters.parse(req.query);
 const clauses: string[] = [];
 const values: (string | number)[] = [];
 if (q) {
  clauses.push(`(LOCATE(LOWER(?), LOWER(CONCAT_WS(' ', id,
   JSON_UNQUOTE(JSON_EXTRACT(snapshot, '$.name')),
   JSON_UNQUOTE(JSON_EXTRACT(snapshot, '$.email')),
   JSON_UNQUOTE(JSON_EXTRACT(snapshot, '$.product')),
   JSON_UNQUOTE(JSON_EXTRACT(snapshot, '$.model'))))) > 0)`);
  values.push(q);
 }
 if (language) { clauses.push("JSON_UNQUOTE(JSON_EXTRACT(snapshot, '$.language')) = ?"); values.push(language); }
 if (status) { clauses.push('status = ?'); values.push(status); }
 const items = await rows<SavedOrder>(pool, `SELECT id, snapshot, status, created_at FROM orders
  ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''}
  ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...values, limit + 1, offset]);
 res.json({ items: items.slice(0, limit), hasMore: items.length > limit });
});
adminOrders.get('/:id', async (req, res) => {
 const id = z.string().regex(/^MR-[0-9a-f-]{36}$/).parse(req.params.id);
 const [order] = await rows<SavedOrder>(pool, 'SELECT id, snapshot, status, created_at FROM orders WHERE id = ?', [id]);
 if (!order) notFound();
 const emails = await rows<{ kind: string; sent_at: Date | null; attempts: number }>(pool,
  'SELECT kind, sent_at, attempts FROM order_emails WHERE order_id = ? ORDER BY kind', [id]);
 res.json({ ...order, emails });
});
