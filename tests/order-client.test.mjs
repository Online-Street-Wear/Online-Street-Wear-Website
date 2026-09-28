import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { claimPurchasedItems, createPayment, getPendingPayment, savePendingPayment, trackOrder, verifyPayment } from '../src/react-app/lib/orders.ts';

const stored = new Map();
beforeEach(() => {
  stored.clear();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  } });
});

const pending = { reference: 'ref-first', orderNumber: 'ONL-1', trackingToken: 'private-token', purchasedItems: [{ id: 'cart-line-1', quantity: 2 }] };

test('a paid checkout snapshot can be consumed only once across reloads', () => {
  savePendingPayment(pending);
  assert.deepEqual(getPendingPayment(pending.reference), pending);
  assert.deepEqual(claimPurchasedItems(pending.reference), pending.purchasedItems);
  assert.deepEqual(claimPurchasedItems(pending.reference), []);
  assert.equal(getPendingPayment(pending.reference).cartSettled, true);
  assert.equal(getPendingPayment(pending.reference).trackingToken, pending.trackingToken);
});

test('an older callback consumes its own snapshot and leaves a newer checkout untouched', () => {
  savePendingPayment(pending);
  const next = { ...pending, reference: 'ref-second', purchasedItems: [{ id: 'new-cart-line', quantity: 1 }] };
  savePendingPayment(next);
  assert.deepEqual(claimPurchasedItems(pending.reference), pending.purchasedItems);
  assert.deepEqual(getPendingPayment(next.reference), next);
  assert.deepEqual(claimPurchasedItems('unknown-reference'), []);
});

test('blocked storage stops checkout before a redirect can lose order details', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => { throw new Error('Storage disabled'); },
    setItem: () => { throw new Error('Storage disabled'); },
  } });
  assert.equal(getPendingPayment(pending.reference), null);
  assert.throws(() => savePendingPayment(pending), /Allow browser storage/);
});

test('malformed saved order details are ignored', () => {
  for (const invalid of ['{', 'null', '[]', JSON.stringify({ ...pending, reference: 'different' }), JSON.stringify({ ...pending, purchasedItems: null })]) {
    stored.set('online-streetwear:payment:ref-first', invalid);
    assert.equal(getPendingPayment(pending.reference), null);
  }
});

test('checkout rejects incomplete or insecure initialization responses', async context => {
  const checkout = { email: 'buyer@example.test', shippingProvince: 'gauteng', shippingAddress: { fullName: 'Test Buyer', phone: '0821234567', paxiPointCode: 'P1234', paxiPointName: 'Test PEP' }, items: [{ productId: 'tee', quantity: 1, size: 'L', requestedColour: 'Purple' }] };
  const valid = { authorization_url: 'https://checkout.paystack.com/test-only', reference: 'ref', orderNumber: 'ONL-1', trackingToken: 'token' };
  for (const payload of [{ ...valid, trackingToken: '' }, { ...valid, authorization_url: 'http://checkout.paystack.com/test-only' }, { ...valid, authorization_url: 'javascript:alert(1)' }]) {
    context.mock.method(globalThis, 'fetch', async () => Response.json(payload));
    await assert.rejects(createPayment(checkout));
    context.mock.restoreAll();
  }
});

test('verification keeps pending payments unconfirmed and forwards abort signals', async context => {
  const controller = new AbortController();
  let requested;
  context.mock.method(globalThis, 'fetch', async (path, options) => {
    requested = { path, options };
    return Response.json({ paid: false, paymentStatus: 'pending', order: { paymentStatus: 'pending' } });
  });
  const response = await verifyPayment('ref/with spaces', 'private&token', controller.signal);
  assert.equal(response.paid, false);
  assert.equal(requested.path, '/api/payments/verify/ref%2Fwith%20spaces?token=private%26token');
  assert.equal(requested.options.signal, controller.signal);
});

test('order lookup sends email in the request body and presents backend errors', async context => {
  let requested;
  context.mock.method(globalThis, 'fetch', async (path, options) => {
    requested = { path, options };
    return Response.json({ error: 'Order not found. Check your order number and email.' }, { status: 404 });
  });
  await assert.rejects(trackOrder(' ONL-1 ', ' buyer@example.test '), /Order not found/);
  assert.equal(requested.path, '/api/orders/track');
  assert.equal(requested.options.method, 'POST');
  assert.deepEqual(JSON.parse(requested.options.body), { orderNumber: 'ONL-1', email: 'buyer@example.test' });
});
