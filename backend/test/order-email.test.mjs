import test from 'node:test';
import assert from 'node:assert/strict';
process.env.DB_NAME ||= 'test'; process.env.DB_USER ||= 'test'; process.env.DB_PASSWORD ||= 'test';
process.env.BREVO_API_KEY = 'test-key'; process.env.EMAIL_FROM = 'sender@example.com'; process.env.ORDER_NOTIFY_EMAIL = 'owner@example.com';
const { renderOrderEmail, sendOrderEmail } = await import('../dist/order-email.js');
const order = { id: 'MR-test', language: 'hu', name: '<img src=x onerror=alert(1)>', email: 'test@example.com', phone: '123', product: 'Chair', model: 'X1', variant: 'Blue', quantity: 2, subtotal: 100, shipping: 10, total: 110, currency: 'HUF', shippingAddress: 'Budapest', billingAddress: 'Berlin', bank: { beneficiary: 'Company', account: 'HU123', bic: 'ABC' } };
test('Hungarian confirmation includes order, bank, addresses and escapes user input', () => {
 const result = renderOrderEmail(order);
 assert.match(result.subject, /Rendelés visszaigazolása/);
 for (const value of ['MR-test', 'Chair', 'Blue', 'HU123', 'Budapest', 'Berlin', 'ABC']) assert.ok(result.htmlContent.includes(value));
 assert.ok(result.htmlContent.includes('&lt;img')); assert.ok(!result.htmlContent.includes('<img'));
 assert.ok(result.textContent.includes(order.name));
});
test('German customer gets German content and EUR; owner gets Hungarian', () => {
 const german = { ...order, language: 'de', currency: 'EUR' };
 const result = renderOrderEmail(german);
 assert.match(result.subject, /Bestellbestätigung/); assert.match(result.htmlContent, /lang="de"/);
 assert.match(result.textContent, /Gesamtbetrag/); assert.match(result.textContent, /110,00/);
 assert.match(renderOrderEmail(german, true).subject, /Új rendelés/);
});

test('Brevo request uses server credentials, separate recipients and reports failures', async () => {
 const original = globalThis.fetch;
 const calls = [];
 globalThis.fetch = async (url, init) => { calls.push({ url, ...init, body: JSON.parse(init.body) }); return new Response('{}', { status: 201 }); };
 try {
  await sendOrderEmail(order, false); await sendOrderEmail(order, true);
  assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(calls[0].headers['api-key'], 'test-key');
  assert.equal(calls[0].body.to[0].email, order.email);
  assert.equal(calls[1].body.to[0].email, 'owner@example.com');
  assert.notEqual(calls[0].body.headers.IdempotencyKey, calls[1].body.headers.IdempotencyKey);
  globalThis.fetch = async () => new Response('{}', { status: 429 });
  await assert.rejects(sendOrderEmail(order, false), /Brevo HTTP 429/);
 } finally { globalThis.fetch = original; }
});
