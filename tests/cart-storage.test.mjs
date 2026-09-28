import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addCartItem,
  changeCartItemSize,
  DEFAULT_COLOUR,
  deserializeCart,
  fallbackProductId,
  MAX_CART_QUANTITY,
  MAX_COLOUR_LENGTH,
  serializeCart,
  subtractPurchasedItems,
} from '../src/react-app/lib/cart-storage.ts';
import { catalog } from '../src/shared/catalog.ts';

const product = {
  productId: 'local-angel-box-tee',
  name: 'Angel Box Tee',
  price: '300.00',
  image: '/products/angel.jpg',
  category: 'T-Shirts',
  requestedColour: DEFAULT_COLOUR,
  size: 'M',
};

test('colour choices and line identifiers survive a checkout redirect/reload', () => {
  let cart = addCartItem([], product);
  cart = addCartItem(cart, { ...product, requestedColour: 'Navy blue' });
  cart = addCartItem(cart, { ...product, requestedColour: '  NAVY   blue  ' });
  assert.equal(cart.length, 2);
  assert.equal(cart[1].quantity, 2);
  assert.equal(cart[1].requestedColour, 'Navy blue');
  assert.notEqual(cart[0].id, cart[1].id);
  assert.deepEqual(deserializeCart(serializeCart(cart)), cart);
});

test('malformed or old storage is discarded without crashing checkout', () => {
  for (const stored of [null, '', '{', 'null', '[]', '{"version":2,"items":[]}', '{"version":1,"items":null}']) {
    assert.deepEqual(deserializeCart(stored), []);
  }
});

test('one corrupt line does not discard valid saved purchases', () => {
  const [valid] = addCartItem([], product);
  const invalidFields = [
    { id: '' }, { productId: '' }, { requestedColour: '  ' },
    { requestedColour: 'x'.repeat(MAX_COLOUR_LENGTH + 1) },
    { quantity: 0 }, { quantity: 1.5 }, { quantity: MAX_CART_QUANTITY + 1 },
    { price: '-300' }, { price: 'Infinity' }, { price: '30 rand' }, { price: '0' },
    { image: null }, { name: '' },
    { size: 'XS' }, { size: null },
  ];
  const corrupt = invalidFields.map((fields, index) => ({ ...valid, id: `invalid-${index}`, ...fields }));
  const raw = JSON.stringify({ version: 1, items: [null, ...corrupt, valid, valid] });
  assert.deepEqual(deserializeCart(raw), [valid]);
});

test('empty colour requests cannot be added and quantities remain bounded', () => {
  assert.deepEqual(addCartItem([], { ...product, requestedColour: ' \t ' }), []);
  assert.deepEqual(addCartItem([], { ...product, requestedColour: 'x'.repeat(MAX_COLOUR_LENGTH + 1) }), []);
  let cart = addCartItem([], product);
  for (let index = 0; index < MAX_CART_QUANTITY + 10; index++) cart = addCartItem(cart, product);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, MAX_CART_QUANTITY);
});

test('catalog fallback IDs match server pricing and Firebase IDs remain intact', () => {
  for (const entry of catalog) assert.equal(fallbackProductId(entry.name), entry.id);
  const firebaseId = 'AbCDeFg123456xyz';
  const [item] = addCartItem([], { ...product, productId: firebaseId });
  assert.equal(deserializeCart(serializeCart([item]))[0].productId, firebaseId);
});

test('paid quantities are subtracted while new quantities and other colours stay in the cart', () => {
  let cart = addCartItem([], product);
  cart = addCartItem(cart, product);
  const purchased = cart.map(({ id, quantity }) => ({ id, quantity }));
  cart = addCartItem(cart, product);
  cart = addCartItem(cart, { ...product, requestedColour: 'Purple' });
  cart = addCartItem(cart, { ...product, productId: 'another-product', name: 'Another product' });
  const remaining = subtractPurchasedItems(cart, purchased);
  assert.equal(remaining.length, 3);
  assert.equal(remaining[0].quantity, 1);
  assert.equal(remaining[1].requestedColour, 'Purple');
  assert.equal(remaining[2].productId, 'another-product');
});

test('a removed and re-added product is not removed by an older checkout callback', () => {
  const original = addCartItem([], product);
  const purchased = original.map(({ id, quantity }) => ({ id, quantity }));
  const newCart = addCartItem([], product);
  assert.notEqual(newCart[0].id, original[0].id);
  assert.strictEqual(subtractPurchasedItems(newCart, purchased), newCart);
});

test('completed lines are removed and malformed purchased quantities cannot alter the cart', () => {
  const cart = addCartItem([], product);
  const [{ id }] = cart;
  for (const quantity of [-1, 0, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.strictEqual(subtractPurchasedItems(cart, [{ id, quantity }]), cart);
  }
  assert.deepEqual(subtractPurchasedItems(cart, [{ id, quantity: 1 }]), []);
});

test('all sizes persist as separate lines and only matching size and colour quantities combine', () => {
  let cart = [];
  for (const size of ['S', 'M', 'L', 'XL', 'XXL']) cart = addCartItem(cart, { ...product, size });
  cart = addCartItem(cart, { ...product, size: 'XL' });
  cart = addCartItem(cart, { ...product, size: 'XL', requestedColour: 'Navy' });
  assert.equal(cart.length, 6);
  assert.equal(cart.find(item => item.size === 'XL' && item.requestedColour === DEFAULT_COLOUR).quantity, 2);
  assert.deepEqual(deserializeCart(serializeCart(cart)), cart);
  for (const size of [undefined, '', 'XS', 'xxl', null, 2]) assert.deepEqual(addCartItem([], { ...product, size }), []);
});

test('legacy cart lines retain identity and quantities but require a size choice', () => {
  const [item] = addCartItem([], product);
  const { size, ...legacy } = { ...item, quantity: 3 };
  const restored = deserializeCart(JSON.stringify({ version: 1, items: [legacy] }));
  assert.deepEqual(restored, [{ ...legacy, size: '' }]);
  const resized = changeCartItemSize(restored, legacy.id, 'L');
  assert.equal(resized[0].size, 'L');
  assert.equal(resized[0].quantity, 3);
  assert.notEqual(resized[0].id, legacy.id);
});

test('changing a size merges the matching variant without losing quantities at the per-line limit', () => {
  let cart = addCartItem(addCartItem([], product), { ...product, size: 'L' });
  const merged = changeCartItemSize(cart, cart[0].id, 'L');
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, cart[1].id);
  assert.equal(merged[0].quantity, 2);
  cart = [{ ...cart[0], quantity: 2 }, { ...cart[1], quantity: MAX_CART_QUANTITY }];
  const separate = changeCartItemSize(cart, cart[0].id, 'L');
  assert.equal(separate.length, 2);
  assert.equal(separate.reduce((sum, item) => sum + item.quantity, 0), MAX_CART_QUANTITY + 2);
  assert.ok(separate.every(item => item.quantity <= MAX_CART_QUANTITY));
  assert.strictEqual(changeCartItemSize(cart, cart[0].id, 'invalid'), cart);
});

test('an earlier payment return cannot remove a newly changed size', () => {
  const original = addCartItem([], product);
  const purchased = original.map(({ id, quantity }) => ({ id, quantity }));
  const changed = changeCartItemSize(original, original[0].id, 'XXL');
  assert.strictEqual(subtractPurchasedItems(changed, purchased), changed);
  assert.strictEqual(changeCartItemSize(changed, changed[0].id, 'XXL'), changed);
});
