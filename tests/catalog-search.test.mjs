import assert from 'node:assert/strict';
import test from 'node:test';
import { filterProducts, productSort } from '../src/react-app/lib/catalog-search.ts';

const products = [
  { name: 'Rose Tee', category: 'T-Shirts', price: '300.00' },
  { name: 'Blue Tee', category: 'T-Shirts', price: '80.00' },
  { name: 'Rose Hoodie', category: 'Hoodies', price: '1000.00' },
];

test('search combines case-insensitive name and category words with the category filter', () => {
  assert.deepEqual(filterProducts(products, '  ROSE   t-shirts ', '', 'featured'), [products[0]]);
  assert.deepEqual(filterProducts(products, 'rose', 'Hoodies', 'featured'), [products[2]]);
  assert.deepEqual(filterProducts(products, 'rose', 'Hats', 'featured'), []);
  assert.deepEqual(filterProducts(products, 'missing', '', 'featured'), []);
});

test('numeric price sort does not change featured catalog order', () => {
  assert.deepEqual(filterProducts(products, '', '', 'price-low'), [products[1], products[0], products[2]]);
  assert.deepEqual(filterProducts(products, '', '', 'price-high'), [products[2], products[0], products[1]]);
  assert.deepEqual(filterProducts(products, '', '', 'name'), [products[1], products[2], products[0]]);
  assert.deepEqual(filterProducts(products, ' ', '', 'featured'), products);
  assert.equal(products[0].name, 'Rose Tee');
});

test('unrecognized sorting from a shared URL falls back to featured', () => {
  assert.equal(productSort(null), 'featured');
  assert.equal(productSort('unknown'), 'featured');
  assert.equal(productSort('price-high'), 'price-high');
});
