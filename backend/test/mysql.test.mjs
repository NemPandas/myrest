import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { app } from '../dist/app.js';
import { pool, rows } from '../dist/db.js';

test('admin and catalog API against an empty MySQL test schema', async t => {
  t.after(() => pool.end());
  assert.equal(process.env.NODE_ENV, 'test');
  assert.match(process.env.DB_NAME, /_test$/);
  assert.equal((await rows(pool, 'SELECT id FROM admin_users LIMIT 1')).length, 0);
  const ownerPassword = 'Test owner password 923!';
  const editorPassword = 'Test editor password 923!';
  const createOwner = () => spawnSync(process.execPath, ['dist/create-owner.js', 'owner@example.test'], {
    input: ownerPassword + '\n', encoding: 'utf8',
  });
  const bootstrap = createOwner();
  assert.equal(bootstrap.status, 0, bootstrap.stderr);
  assert.equal(createOwner().status, 1);

  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => server.close(resolve)));
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port + '/api';

  async function call(path, { method = 'GET', body, cookie, origin = process.env.APP_ORIGIN ?? 'http://localhost:3001' } = {}) {
    const headers = { Origin: origin };
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(base + path, { method, headers, body: JSON.stringify(body) });
    return {
      status: res.status,
      data: res.status === 204 ? null : await res.json(),
      cookie: res.headers.get('set-cookie')?.split(';')[0],
    };
  }

  async function request(path, options, status = 200) {
    const result = await call(path, options);
    assert.equal(result.status, status, path + ' ' + JSON.stringify(result.data));
    return result;
  }

  const login = (email, password, status = 200) =>
    request('/admin/auth/login', { method: 'POST', body: { email, password } }, status);

  await request('/health');
  await request('/admin/auth/me', {}, 401);
  await request('/admin/auth/login', { method: 'POST', origin: 'http://untrusted.test' }, 403);
  await login('unknown@example.test', ownerPassword, 401);
  const { cookie: owner, data: ownerAccount } = await login('OWNER@example.test', ownerPassword);
  await request('/admin/auth/me', { cookie: owner });
  await request('/admin/users/' + ownerAccount.id, { method: 'PATCH', cookie: owner, body: { active: false } }, 409);

  const invite = async email => (await request('/admin/invites', {
    method: 'POST', cookie: owner, body: { email },
  }, 201)).data;
  const register = ({ email, token }) => call('/admin/auth/register', {
    method: 'POST', body: { email, token, password: editorPassword },
  });

  const revoked = await invite('revoked@example.test');
  await request('/admin/invites/' + revoked.id + '/revoke', { method: 'POST', cookie: owner }, 204);
  assert.equal((await register(revoked)).status, 422);

  const editorInvite = await invite('editor@example.test');
  const registrations = await Promise.all([register(editorInvite), register(editorInvite)]);
  assert.deepEqual(registrations.map(result => result.status).sort(), [201, 422]);
  const { data: invitations } = await request('/admin/invites', { cookie: owner });
  assert.ok(invitations.items.every(item => !('token' in item)));
  const { cookie: editor, data: editorAccount } = await login(editorInvite.email, editorPassword);
  await request('/admin/users', { cookie: editor }, 403);

  await t.test('uploaded images cannot be deleted while referenced by a product', async () => {
    const sharp = (await import('sharp')).default;
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#336680' } }).png().toBuffer();
    const form = new FormData();
    form.append('file', new Blob([png], { type: 'image/png' }), 'chair.png');
    const uploaded = await fetch(base + '/admin/images', { method: 'POST',
      headers: { Cookie: editor, Origin: process.env.APP_ORIGIN ?? 'http://localhost:3001' }, body: form });
    assert.equal(uploaded.status, 201);
    const image = await uploaded.json();
    const imagePath = '/admin/images/' + image.filename;
    const { data: item } = await request('/admin/products', { method: 'POST', cookie: editor, body: {
      name: 'Képfeltöltés', model_code: 'IMAGE-ASSET', slug: 'image-upload-check',
      images: [{ url: image.url, alt_text: 'Tesztkép' }],
    } }, 201);
    await request(imagePath, { method: 'DELETE', cookie: editor }, 409);
    await request('/admin/products/' + item.id, { method: 'PATCH', cookie: editor,
      body: { version: item.version, images: [] } });
    await request(imagePath, { method: 'DELETE', cookie: editor }, 204);
    await request('/admin/products/' + item.id, { method: 'PATCH', cookie: editor,
      body: { version: item.version + 1, images: [{ url: image.url, alt_text: 'Törölt kép' }] } }, 422);
    await request(image.url.replace(/^\/api/, ''), {}, 404);
    await request('/admin/products/' + item.id, { method: 'DELETE', cookie: editor,
      body: { version: item.version + 1 } });
  });

  const product = {
    slug: 'test-chair',
    model_code: 'TEST-1',
    name: 'Tesztfotel',
    summary: 'Rövid leírás',
    description: 'Részletes leírás',
    gross_price_huf: 123450,
    features: ['Hátmelegítés'],
    specifications: [{ name: 'Magasság', value: '120 cm' }],
    images: [
      { url: '/media/side.webp', alt_text: 'Oldalról', sort_order: 2 },
      { url: '/media/chair.webp', alt_text: 'Elölről', sort_order: 0 },
    ],
    variants: [{ code: 'GRAPHITE', color_name: 'Grafit', color_hex: '#44474d' }],
  };
  const create = status => request('/admin/products', { method: 'POST', body: product, cookie: editor }, status);
  const { data: draft } = await create(201);
  assert.equal(draft.version, 1);
  assert.deepEqual(draft.features, product.features);

  const path = '/admin/products/' + draft.id;
  const mutate = (suffix, method, body, status) => request(path + suffix, { method, body, cookie: editor }, status);
  const details = async () => (await request(path, { cookie: editor })).data;
  await request('/products/test-chair', {}, 404);
  await create(409);
  await mutate('/publish', 'POST', { version: 1 });
  assert.equal((await request('/products?limit=1')).data.items[0].cover.url, '/media/chair.webp');
  assert.equal((await request('/products/test-chair')).data.version, undefined);
  await mutate('', 'PATCH', { version: 2, images: [] }, 422);
  await mutate('', 'PATCH', { version: 2, variants: [] }, 422);
  const unchanged = await details();
  assert.equal(unchanged.images.length, 2);
  assert.equal(unchanged.variants[0].disabled_at, null);
  await mutate('', 'PATCH', { version: 2, slug: 'different' }, 409);

  const edits = await Promise.all(['First', 'Second'].map(name => call(path, {
    method: 'PATCH', body: { version: 2, name }, cookie: editor,
  })));
  assert.deepEqual(edits.map(result => result.status).sort(), [200, 409]);
  const { data: changed } = await mutate('', 'PATCH', {
    version: 3,
    variants: [{ code: 'graphite', color_name: 'Szürke' }],
  });
  assert.equal(changed.variants[0].id, draft.variants[0].id);
  await mutate('/unpublish', 'POST', { version: 4 });
  await mutate('', 'DELETE', { version: 5 });
  await request('/products/test-chair', {}, 404);
  await create(409);
  assert.equal((await request('/admin/products?deleted=only&q=TEST', { cookie: editor })).data.items[0].id, draft.id);
  assert.equal((await request('/admin/products', { cookie: editor })).data.items.length, 0);
  await mutate('/restore', 'POST', { version: 6 });
  const restored = await details();
  assert.equal(restored.status, 'draft');
  assert.equal(restored.deleted_at, null);
  assert.equal(restored.images.length, 2);
  const { data: audit } = await request(path + '/audit', { cookie: editor });
  assert.deepEqual(audit.items.map(entry => entry.action), [
    'restore', 'delete', 'unpublish', 'update', 'update', 'publish', 'create',
  ]);

  await t.test('Hungarian and German content publish independently without cross-language fallback', async () => {
    const body = { ...product, slug: 'bilingual-chair', model_code: 'I18N-1', name: 'Magyar fotel',
      translations: { de: { name: 'Deutscher Sessel' } } };
    const { data: created } = await request('/admin/products', { method: 'POST', cookie: editor, body }, 201);
    const endpoint = '/admin/products/' + created.id;
    const edit = (body, status = 200) => request(endpoint, { method: 'PATCH', cookie: editor, body }, status);
    const action = (name, version, language, status = 200) => request(endpoint + '/' + name,
      { method: 'POST', cookie: editor, body: { version, language } }, status);
    await action('publish', 1, 'de', 422);
    await action('publish', 1, 'hu');
    await request('/products/bilingual-chair?lang=de', {}, 404);
    const german = { gross_price_eur: 1299.95, name: 'Deutscher Sessel', summary: 'Kurze Beschreibung', description: 'Deutscher Text',
      features: ['Rückenwärme'], specifications: [{ name: 'Höhe', value: '120 cm' }],
      seo_title: 'Deutscher SEO-Titel', seo_description: 'Deutsche SEO-Beschreibung',
      image_alts: body.images.map(image => ({ url: image.url, alt_text: 'Sesselansicht' })),
      variant_names: [{ code: 'graphite', color_name: 'Graphit' }] };
    await edit({ version: 2, translations: { de: { ...german, status: 'published' } } }, 422);
    const { data: saved } = await edit({ version: 2, translations: { de: german } });
    assert.equal(saved.name, 'Magyar fotel');
    assert.equal(saved.images[0].alt_text, 'Elölről');
    assert.equal(saved.translations.de.status, 'draft');
    await action('publish', 3, 'de');
    const { data: de } = await request('/products/bilingual-chair?lang=de');
    assert.equal(de.name, german.name);
    assert.equal(de.description, german.description);
    assert.equal(de.gross_price_eur, 1299.95);
    assert.equal(de.currency, 'EUR');
    assert.equal((await request('/products/bilingual-chair?lang=hu')).data.gross_price_huf, product.gross_price_huf);
    assert.equal(de.images[0].alt_text, 'Sesselansicht');
    assert.equal(de.variants[0].color_name, 'Graphit');
    assert.equal(de.variants[0].id, saved.variants[0].id);
    assert.equal((await request('/products/bilingual-chair?lang=hu')).data.name, 'Magyar fotel');
    assert.equal((await request('/products?lang=de')).data.items[0].cover.alt_text, 'Sesselansicht');
    await edit({ version: 4, translations: { de: { ...german, summary: null } } }, 422);
    await edit({ version: 4, images: [] }, 422);
    assert.equal((await request(endpoint, { cookie: editor })).data.version, 4);
    await action('unpublish', 4, 'hu');
    await request('/products/bilingual-chair?lang=hu', {}, 404);
    await request('/products/bilingual-chair?lang=de');
    await edit({ version: 5, variants: [{ code: 'NEW', color_name: '' }] }, 422);
    await action('unpublish', 4, 'de', 409);
    const { data: list } = await request('/admin/products?language=de&status=published&q=Deutscher', { cookie: editor });
    assert.equal(list.items[0].id, created.id);
    await action('unpublish', 5, 'de');
    await request('/products/bilingual-chair?lang=de', {}, 404);
    await action('publish', 6, 'de');
    await request(endpoint, { method: 'DELETE', cookie: editor, body: { version: 7 } });
    await request('/products/bilingual-chair?lang=de', {}, 404);
    const { data: restored } = await action('restore', 8, 'hu');
    assert.equal(restored.status, 'draft');
    assert.equal(restored.translations.de.status, 'draft');
    await request('/products?lang=en', {}, 422);
    await request(endpoint + '/publish', { method: 'POST', cookie: editor, body: { version: 9, language: 'en' } }, 422);
  });

  const editorPath = '/admin/users/' + editorAccount.id;
  await request(editorPath, { method: 'PATCH', cookie: owner, body: { role: 'owner' } });
  await request('/admin/auth/me', { cookie: editor }, 401);
  const { cookie: newOwner } = await login(editorInvite.email, editorPassword);
  await request(editorPath, { method: 'PATCH', cookie: owner, body: { active: false } });
  await request('/admin/auth/me', { cookie: newOwner }, 401);
  await login(editorInvite.email, editorPassword, 401);
  await request('/admin/auth/logout', { method: 'POST', cookie: owner }, 204);
  await request('/admin/auth/me', { cookie: owner }, 401);
  const [record] = await rows(pool, 'SELECT password_hash FROM admin_users WHERE id = ?', [ownerAccount.id]);
  assert.match(record.password_hash, /^\$argon2id\$/);
  // Vary casing across failed logins to verify the account limit uses the normalized address.
  for (let attempt = 0; attempt < 10; attempt++) {
    await login(attempt % 2 ? 'LIMIT@example.test' : 'limit@example.test', ownerPassword, 401);
  }
  await login('limit@example.test', ownerPassword, 429);
});
