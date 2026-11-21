import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';

test('image API validates, stores, serves and deletes images with auth and reference protection', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'myrest-images-'));
  Object.assign(process.env, { NODE_ENV: 'test', DB_NAME: 'images_test', DB_USER: 'test', DB_PASSWORD: 'test',
    APP_ORIGIN: 'http://localhost:3001', UPLOAD_DIR: directory });
  const { app } = await import('../dist/app.js');
  const { pool } = await import('../dist/db.js');
  const { validateStoredImages } = await import('../dist/image-storage.js');
  // Isolate MySQL for this test; HTTP, multipart parsing, image decoding and disk I/O are real.
  let referenced = false;
  const sql = async statement => {
    if (statement.includes('FROM admin_sessions')) return [[{ id: '1', role: 'editor' }], []];
    if (statement.includes('GET_LOCK')) return [[{ acquired: '1' }], []];
    if (statement.includes('RELEASE_LOCK')) return [[{ released: '1' }], []];
    if (statement.includes('FROM product_images')) return [referenced ? [{ id: '1' }] : [], []];
    throw new Error('Unexpected SQL: ' + statement);
  };
  const originalExecute = pool.execute;
  const originalConnection = pool.getConnection;
  pool.execute = sql;
  pool.getConnection = async () => ({ execute: sql, beginTransaction: async () => {}, commit: async () => {},
    rollback: async () => {}, release() {}, destroy() {} });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    pool.execute = originalExecute;
    pool.getConnection = originalConnection;
    await pool.end();
    await rm(directory, { recursive: true, force: true });
  });
  const base = 'http://127.0.0.1:' + server.address().port;
  const headers = { Origin: process.env.APP_ORIGIN, Cookie: 'myrest_session=' + 'a'.repeat(43) };
  const png = await sharp({ create: { width: 30, height: 20, channels: 4, background: '#ff000080' } }).png().toBuffer();
  const upload = (data = png, extraHeaders = headers, field = 'file') => {
    const form = new FormData();
    form.append(field, new Blob([data], { type: 'image/png' }), '../../untrusted.png');
    return fetch(base + '/api/admin/images', { method: 'POST', headers: extraHeaders, body: form });
  };
  assert.equal((await upload(png, { Origin: headers.Origin })).status, 401);
  assert.equal((await upload(png, { ...headers, Origin: 'https://wrong.test' })).status, 403);
  assert.equal((await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).status, 422);
  assert.equal((await upload(Buffer.from('invalid image'))).status, 422);
  assert.equal((await upload(png, headers, 'wrong')).status, 422);
  assert.equal((await upload(Buffer.alloc(10 * 1024 * 1024 + 1))).status, 413);
  assert.deepEqual(await readdir(directory), []);
  const response = await upload();
  assert.equal(response.status, 201);
  const image = await response.json();
  assert.equal(image.width, 30);
  assert.equal(image.height, 20);
  assert.match(image.filename, /^[a-f0-9-]+\.webp$/);
  assert.equal(response.headers.get('location'), image.url);
  await validateStoredImages([{ url: image.url }, { url: process.env.APP_ORIGIN + image.url }]);
  await assert.rejects(validateStoredImages([{ url: image.url + '?v=1' }]), { status: 422 });
  const served = await fetch(base + image.url);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'image/webp');
  assert.equal((await sharp(Buffer.from(await served.arrayBuffer())).metadata()).format, 'webp');
  const remove = (filename = image.filename, requestHeaders = headers) =>
    fetch(base + '/api/admin/images/' + filename, { method: 'DELETE', headers: requestHeaders });
  assert.equal((await remove(image.filename, { Origin: headers.Origin })).status, 401);
  referenced = true;
  assert.equal((await remove()).status, 409);
  assert.equal((await fetch(base + image.url)).status, 200);
  referenced = false;
  assert.equal((await remove('not-a-file.webp')).status, 404);
  assert.equal((await remove()).status, 204);
  assert.equal((await fetch(base + image.url)).status, 404);
  assert.equal((await remove()).status, 404);
  await assert.rejects(validateStoredImages([{ url: image.url }]), { status: 422 });
  assert.deepEqual(await readdir(directory), []);
});
