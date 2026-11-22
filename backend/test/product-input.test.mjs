import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createProductBody } from '../dist/product-input.js';

const product = variants => ({ name: 'Tesztfotel', model_code: 'TEST-CODE', slug: 'test-code', variants });
test('variant codes accept Hungarian color names and spaces', () => {
  const parsed = createProductBody.parse(product([{ code: ' sötét szürke ', color_name: 'Sötét szürke' }, { code: 'fehér 01', color_name: 'Fehér' }]));
  assert.deepEqual(parsed.variants.map(item => item.code), ['SOTET-SZURKE', 'FEHER-01']);
});
test('German references normalize to the same variant identifier', () => {
  const parsed = createProductBody.parse({ ...product([{ code: 'krémszín', color_name: 'Krémszín' }]),
    translations: { de: { variant_names: [{ code: 'krémszín', color_name: 'Creme' }] } } });
  assert.equal(parsed.translations.de.variant_names[0].code, parsed.variants[0].code);
});
test('existing ASCII identifiers remain stable', () => {
  const parsed = createProductBody.parse(product([{ code: 'GRAPHITE_01-A', color_name: 'Grafit' }]));
  assert.equal(parsed.variants[0].code, 'GRAPHITE_01-A');
});
test('collisions after accent and space normalization are rejected', () => {
  assert.equal(createProductBody.safeParse(product([{ code: 'fehér 01', color_name: 'Fehér' }, { code: 'FEHER-01', color_name: 'Másik' }])).success, false);
});
test('empty or punctuation-only codes report a Hungarian field error', () => {
  const result = createProductBody.safeParse(product([{ code: '!!!', color_name: 'Grafit' }]));
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0].path, ['variants', 0, 'code']);
  assert.match(result.error.issues[0].message, /Adj meg egy változatkódot/);
});
