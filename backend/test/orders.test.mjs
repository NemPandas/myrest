import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

// Real HTTP, validation, authentication middleware and transactions; MySQL I/O is isolated.
test('orders save without email settings and authenticated admins can list and inspect them', async t => {
 Object.assign(process.env, { NODE_ENV: 'test', DB_NAME: 'orders_test', DB_USER: 'test', DB_PASSWORD: 'test', APP_ORIGIN: 'http://localhost:3001' });
 for (const key of ['BREVO_API_KEY', 'EMAIL_FROM', 'ORDER_NOTIFY_EMAIL', 'BANK_BENEFICIARY', 'BANK_ACCOUNT', 'ORDER_SHIPPING_HUF', 'ORDER_SHIPPING_EUR']) delete process.env[key];
 const { app } = await import('../dist/app.js');
 const { pool } = await import('../dist/db.js');
 const records = []; let staged = null; let failInsert = false;
 const product = { id: '8', name: 'Magyar fotel', model_code: 'CHAIR-1', gross_price_huf: 120000 };
 const queryLog = [];
 const sql = async (sql, params = []) => {
  queryLog.push({ sql, params });
  if (sql.includes('FROM admin_sessions')) return [[{ id: '1', role: 'editor' }], []];
  if (sql.includes('FROM orders WHERE request_key')) return [[...records.filter(r => r.request_key === params[0])], []];
  if (sql.includes('FROM products')) return [[product], []];
  if (sql.includes('FROM product_variants')) return [[{ code: 'BLUE', color_name: 'Kék' }], []];
  if (sql.includes('FROM product_translations')) return [[{ status: 'published', content: { name: 'Deutscher Sessel', gross_price_eur: 999.95, variant_names: [{ code: 'BLUE', color_name: 'Blau' }] } }], []];
  if (sql.startsWith('INSERT INTO orders')) {
   if (failInsert) throw new Error('Simulated database failure');
   assert.match(sql, /UTC_TIMESTAMP/);
   staged.push({ id: params[0], request_key: params[1], request_hash: params[2], snapshot: JSON.parse(params[3]), status: 'awaiting_transfer', created_at: new Date('2026-11-22T10:00:00Z') });
   return [{ affectedRows: 1 }, []];
  }
  if (sql.includes('FROM order_emails')) return [[], []];
  if (sql.includes('FROM orders WHERE id')) return [[...records.filter(r => r.id === params[0])], []];
  if (sql.includes('FROM orders')) return [[...records].reverse().slice(params.at(-1), params.at(-1) + params.at(-2)), []];
  throw new Error('Unexpected SQL: ' + sql);
 };
 pool.execute = sql;
 pool.getConnection = async () => ({ execute: sql,
  beginTransaction: async () => { staged = []; }, commit: async () => { records.push(...staged); staged = null; },
  rollback: async () => { staged = null; }, release() {}, destroy() {} });
 const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
 t.after(async () => { await new Promise(resolve => server.close(resolve)); await pool.end(); });
 const base = 'http://127.0.0.1:' + server.address().port + '/api';
 const cookie = 'myrest_session=' + 'a'.repeat(43);
 async function call(path, body, admin = false, origin = process.env.APP_ORIGIN) {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { Origin: origin, 'Content-Type': 'application/json', ...(admin ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json(), cache: response.headers.get('cache-control') };
 }
 const config = await call('/orders/config'); assert.equal(config.data.enabled, true); assert.equal(config.data.emailEnabled, false); assert.deepEqual(config.data.shipping, { hu: 0, de: 0 });
 const body = { requestKey: randomUUID(), language: 'hu', slug: 'chair', variantCode: 'BLUE', quantity: 2, name: 'Teszt Vásárló', email: 'customer@example.com', phone: '+3612345678', shippingAddress: { zip: '1111', city: 'Budapest', address: 'Fő utca 1.' }, billingAddress: { zip: '2222', city: 'Másik város', address: 'Másik utca 2.' }, expectedTotal: 240000 };
 assert.equal((await call('/orders', body, false, 'https://wrong.test')).status, 403);
 assert.equal((await call('/orders', { ...body, expectedTotal: 1 })).status, 409); assert.equal(records.length, 0);
 assert.equal((await call('/orders', { ...body, variantCode: 'UNKNOWN' })).status, 422); assert.equal(records.length, 0);
 const saved = await call('/orders', body); assert.equal(saved.status, 201); assert.equal(saved.data.emailQueued, false);
 assert.equal(records.length, 1); assert.equal(records[0].snapshot.name, body.name); assert.equal(records[0].snapshot.productId, '8'); assert.equal(records[0].snapshot.quantity, 2); assert.equal(records[0].snapshot.total, 240000); assert.ok(records[0].snapshot.billingAddress.includes('Másik város')); assert.ok(records[0].snapshot.shippingAddress.includes('Budapest'));
 assert.equal(queryLog.some(item => item.sql.includes('INSERT INTO order_emails')), false);
 const repeated = await call('/orders', body); assert.equal(repeated.data.id, saved.data.id); assert.equal(records.length, 1);
 assert.equal((await call('/orders', { ...body, name: 'Changed' })).status, 409); assert.equal(records.length, 1);
 failInsert = true; assert.equal((await call('/orders', { ...body, requestKey: randomUUID() })).status, 500); assert.equal(records.length, 1); failInsert = false;
 const german = await call('/orders', { ...body, requestKey: randomUUID(), language: 'de', expectedTotal: 1999.90 }); assert.equal(german.status, 201); assert.equal(records[1].snapshot.product, 'Deutscher Sessel'); assert.equal(records[1].snapshot.currency, 'EUR'); assert.equal(records[1].snapshot.variant, 'Blau');
 assert.equal((await call('/admin/orders')).status, 401); assert.equal((await call('/admin/orders/' + saved.data.id)).status, 401);
 const list = await call('/admin/orders?limit=1&offset=0', null, true); assert.equal(list.status, 200); assert.equal(list.cache, 'no-store'); assert.equal(list.data.items.length, 1); assert.equal(list.data.hasMore, true); assert.equal(list.data.items[0].id, german.data.id);
 const second = await call('/admin/orders?limit=1&offset=1', null, true); assert.equal(second.data.items[0].id, saved.data.id); assert.equal(second.data.hasMore, false);
 await call('/admin/orders?q=customer&language=de&status=awaiting_transfer', null, true);
 const filtered = queryLog.filter(item => item.sql.includes('LOCATE')).at(-1); assert.deepEqual(filtered.params, ['customer', 'de', 'awaiting_transfer', 21, 0]); assert.ok(!filtered.sql.includes('customer'));
 const detail = await call('/admin/orders/' + saved.data.id, null, true); assert.equal(detail.status, 200); assert.equal(detail.data.snapshot.name, body.name); assert.equal(detail.data.created_at, '2026-11-22T10:00:00.000Z'); assert.deepEqual(detail.data.emails, []);
 product.name = 'Changed product'; product.gross_price_huf = 1;
 assert.equal((await call('/admin/orders/' + saved.data.id, null, true)).data.snapshot.product, 'Magyar fotel');
 assert.equal((await call('/admin/orders/MR-' + randomUUID(), null, true)).status, 404);
 assert.equal((await call('/admin/orders/not-valid', null, true)).status, 422);
 assert.equal((await call('/admin/orders?language=en', null, true)).status, 422);
});
