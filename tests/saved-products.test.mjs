import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSavedProducts, toggleSavedProduct, MAX_SAVED_PRODUCTS } from '../src/react-app/lib/saved-products.ts';

test('saved picks survive a reload and removing a pick preserves the others', () => {
  let picks = toggleSavedProduct([], 'tee-one');
  picks = toggleSavedProduct(picks, 'hoodie-two');
  const restored = parseSavedProducts(JSON.stringify(picks));
  assert.deepEqual(restored, ['hoodie-two', 'tee-one']);
  assert.deepEqual(toggleSavedProduct(restored, 'tee-one'), ['hoodie-two']);
  assert.deepEqual(restored, ['hoodie-two', 'tee-one']);
});

test('corrupt browser storage cannot break saved picks or inject non-product values', () => {
  for (const input of [null, '{broken', '{}', 'null', '42']) assert.deepEqual(parseSavedProducts(input), []);
  assert.deepEqual(parseSavedProducts(JSON.stringify(['tee', null, {}, '', 3, ' tee ', 'tee', 'hoodie'])), ['tee', 'hoodie']);
});

test('saved picks remain bounded and retain the most recently saved products', () => {
  const existing = Array.from({ length: MAX_SAVED_PRODUCTS }, (_, index) => `item-${index}`);
  const next = toggleSavedProduct(existing, 'latest');
  assert.equal(next.length, MAX_SAVED_PRODUCTS);
  assert.equal(next[0], 'latest');
  assert.equal(next.includes(existing.at(-1)), false);
  assert.equal(parseSavedProducts(JSON.stringify([...existing, 'extra'])).length, MAX_SAVED_PRODUCTS);
});
