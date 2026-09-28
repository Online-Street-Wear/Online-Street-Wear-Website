import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createOrdersApp } from '../src/server/orders-app.ts';
import { openLocalDatabase } from '../src/server/local-db.js';
import { OrderStore } from '../src/server/order-store.ts';
import { sendOrderEmail, sendOrderNotifications, retryOrderEmails } from '../src/server/order-email.ts';
import { MAX_CART_ITEMS, MAX_CART_QUANTITY, MAX_COLOUR_LENGTH, MAX_ORDER_QUANTITY } from '../src/shared/order-limits.ts';
import { PRODUCT_SIZES, isProductSize } from '../src/shared/product-options.ts';

const checkout = () => ({
  email: 'customer@example.com', shippingProvince: 'gauteng', site_url: 'http://localhost:5173',
  shippingAddress: { fullName: 'Test Customer', phone: '072 123 4567', paxiPointCode: 'p1234', paxiPointName: 'PEP Test Collection Point' },
  items: [{ productId: 'local-angel-box-tee', quantity: 1, size: 'M', requestedColour: 'Green' }],
});

function fixture(t, options = {}) {
  const db = openLocalDatabase(':memory:');
  t.after(() => db.close());
  const store = new OrderStore(db);
  const env = { DB: db, PAYSTACK_SECRET_KEY: 'sk_test_fixture_only', PAYSTACK_CURRENCY: 'ZAR', ORDER_ADMIN_TOKEN: 'admin-fixture-token-at-least-32-characters', ...(options.email ? { RESEND_API_KEY: 'fixture-only', ORDER_FROM_EMAIL: 'ONLINE <orders@example.com>' } : {}), ...(options.ownerEmail ? { ORDER_OWNER_EMAIL: options.ownerEmail } : {}) };
  const calls = { initialize: [], emails: [], productReads: [], verify: 0 };
  let transactionOverride = {};
  let emailFailure = false;
  const fetcher = async (url, init = {}) => {
    if (url === 'https://api.paystack.co/transaction/initialize') {
      const body = JSON.parse(init.body);
      calls.initialize.push(body);
      return Response.json({ status: true, data: { reference: body.reference, authorization_url: 'https://checkout.paystack.com/test-fixture' } });
    }
    if (String(url).startsWith('https://api.paystack.co/transaction/verify/')) {
      calls.verify++;
      const reference = decodeURIComponent(String(url).split('/').pop());
      const order = await store.byReference(reference);
      return Response.json({ status: true, data: { status: 'success', reference, amount: order.total, currency: 'ZAR', domain: 'test', customer: { email: order.email }, ...transactionOverride } });
    }
    if (url === 'https://api.resend.com/emails') {
      calls.emails.push({ body: JSON.parse(init.body), headers: init.headers });
      if (typeof emailFailure === 'function' ? emailFailure(calls.emails.at(-1).body) : emailFailure) throw new Error('Simulated network timeout');
      return Response.json({ id: 'email-fixture-id' });
    }
    if (String(url).startsWith('https://firestore.googleapis.com/')) {
      calls.productReads.push(String(url));
      return Response.json({ fields: { name: { stringValue: 'Firestore Tee' }, price: { doubleValue: 450 } } });
    }
    throw new Error(`Unexpected external request: ${url}`);
  };
  const app = createOrdersApp(fetcher);
  const request = (path, body, method = 'POST', headers = {}) => app.request(`http://localhost:8789${path}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }, env);
  const create = async (body = checkout()) => { const response = await request('/api/payments/create-payment', body); assert.equal(response.status, 200, await response.clone().text()); return response.json(); };
  const verify = payment => request(`/api/payments/verify/${payment.reference}?token=${payment.trackingToken}`, undefined, 'GET');
  const webhook = async (payment, override = {}, signatureOverride) => {
    const order = await store.byReference(payment.reference);
    const body = { event: 'charge.success', data: { status: 'success', reference: payment.reference, amount: order.total, currency: 'ZAR', domain: 'test', customer: { email: order.email }, ...override } };
    const signature = signatureOverride ?? createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(JSON.stringify(body)).digest('hex');
    return request('/api/payments/webhook', body, 'POST', { 'x-paystack-signature': signature });
  };
  return { app, request, create, verify, webhook, store, env, db, fetcher, calls, setTransaction: value => { transactionOverride = value; }, setEmailFailure: value => { emailFailure = value; }, admin: { Authorization: `Bearer ${env.ORDER_ADMIN_TOKEN}` } };
}

test('checkout prices products and delivery on the server, saves size, colour and PAXI point, and returns an authenticated callback', async t => {
  const f = fixture(t);
  const payment = await f.create({ ...checkout(), amount: 1, shippingFee: 0, items: [{ ...checkout().items[0], price: 1 }] });
  const saved = await f.store.find(payment.orderNumber);
  assert.equal(saved.total, 38000);
  assert.equal(saved.subtotal, 30000);
  assert.equal(saved.items[0].requestedColour, 'Green');
  assert.equal(saved.items[0].size, 'M');
  assert.equal(saved.shippingAddress.paxiPointCode, 'P1234');
  assert.equal(saved.shippingAddress.phone, '0721234567');
  assert.notEqual(saved.tokenHash, payment.trackingToken);
  const initialized = f.calls.initialize[0];
  assert.equal(initialized.amount, '38000');
  const callback = new URL(initialized.callback_url);
  assert.equal(callback.pathname, '/order-confirmation');
  assert.equal(callback.searchParams.get('token'), payment.trackingToken);
  assert.equal(callback.searchParams.get('reference'), payment.reference);
  const free = await f.create({ ...checkout(), items: [{ ...checkout().items[0], quantity: 7 }] });
  assert.equal((await f.store.find(free.orderNumber)).shippingFee, 0);
});

test('all five sizes remain distinct in a saved order, payment confirmation and customer tracking', async t => {
  const f = fixture(t);
  const payment = await f.create({ ...checkout(), items: PRODUCT_SIZES.map(size => ({ ...checkout().items[0], size })) });
  assert.ok(PRODUCT_SIZES.every(isProductSize));
  const saved = await f.store.find(payment.orderNumber);
  assert.deepEqual(saved.items.map(item => item.size), [...PRODUCT_SIZES]);
  assert.equal(saved.items.length, 5);
  assert.equal(saved.subtotal, 150000);
  const verified = await (await f.verify(payment)).json();
  assert.deepEqual(verified.order.items.map(item => item.size), [...PRODUCT_SIZES]);
  const tracked = await (await f.request('/api/orders/track', { orderNumber: payment.orderNumber, email: checkout().email })).json();
  assert.deepEqual(tracked.order.items.map(item => item.size), [...PRODUCT_SIZES]);
});

test('missing and unsupported sizes fail before creating orders or contacting Paystack', async t => {
  const f = fixture(t);
  for (const size of [undefined, null, '', 'XS', 'XXXL', 'm', ' M ', 1, ['M']]) {
    assert.equal(isProductSize(size), false);
    const response = await f.request('/api/payments/create-payment', { ...checkout(), items: [{ ...checkout().items[0], size }] });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Choose a size/);
  }
  assert.equal(f.calls.initialize.length, 0);
  assert.equal((await f.store.list()).length, 0);
});

test('Firestore document prices are fetched authoritatively', async t => {
  const f = fixture(t);
  const payment = await f.create({ ...checkout(), items: [{ productId: 'firestore-product-id', quantity: 2, size: 'XL', requestedColour: 'Navy' }] });
  assert.equal((await f.store.find(payment.orderNumber)).total, 98000);
  assert.equal((await f.store.find(payment.orderNumber)).items[0].size, 'XL');
  assert.equal(f.calls.productReads.length, 1);
  assert.match(f.calls.productReads[0], /projects\/online-street-wear\//);
});

test('checkout accepts cart colour and quantity boundaries and rejects oversized totals before opening payment', async t => {
  const f = fixture(t);
  const colour = 'x'.repeat(MAX_COLOUR_LENGTH);
  const payment = await f.create({ ...checkout(), items: [{ ...checkout().items[0], quantity: MAX_CART_QUANTITY, requestedColour: colour }] });
  const saved = await f.store.find(payment.orderNumber);
  assert.equal(saved.items[0].quantity, MAX_CART_QUANTITY);
  assert.equal(saved.items[0].requestedColour, colour);
  const fullCart = await f.create({ ...checkout(), items: Array.from({ length: MAX_CART_ITEMS }, (_, index) => ({ ...checkout().items[0], requestedColour: `Colour ${index}` })) });
  assert.equal((await f.store.find(fullCart.orderNumber)).items.length, MAX_CART_ITEMS);
  const openedPayments = f.calls.initialize.length;
  const oversized = await f.request('/api/payments/create-payment', { ...checkout(), items: [
    { ...checkout().items[0], quantity: MAX_CART_QUANTITY },
    { ...checkout().items[0], quantity: MAX_ORDER_QUANTITY - MAX_CART_QUANTITY + 1 },
  ] });
  assert.equal(oversized.status, 400);
  assert.match((await oversized.json()).error, /Order up to 100 items at a time/);
  for (const items of [
    [{ ...checkout().items[0], quantity: MAX_CART_QUANTITY + 1 }],
    [{ ...checkout().items[0], requestedColour: colour + 'x' }],
    Array.from({ length: MAX_CART_ITEMS + 1 }, () => checkout().items[0]),
  ]) assert.equal((await f.request('/api/payments/create-payment', { ...checkout(), items })).status, 400);
  assert.equal(f.calls.initialize.length, openedPayments);
});

test('null, malformed JSON, missing PAXI details, invalid phone, quantities and foreign origins fail safely', async t => {
  const f = fixture(t);
  for (const body of [null, [], {}, { ...checkout(), shippingAddress: { ...checkout().shippingAddress, paxiPointCode: '' } }, { ...checkout(), shippingAddress: { ...checkout().shippingAddress, phone: 'garbage' } }, { ...checkout(), items: [{ ...checkout().items[0], quantity: -1 }] }, { ...checkout(), site_url: 'https://attacker.example' }]) {
    assert.equal((await f.request('/api/payments/create-payment', body)).status, 400);
  }
  const response = await f.app.request('http://localhost:8789/api/payments/create-payment', { method: 'POST', body: '{broken', headers: { 'Content-Type': 'application/json' } }, f.env);
  assert.equal(response.status, 400);
  assert.equal(f.calls.initialize.length, 0);
  await f.create();
});

test('paid status requires matching reference, cents, currency, email and payment mode', async t => {
  const f = fixture(t);
  const payment = await f.create();
  for (const override of [{ reference: 'other-reference' }, { amount: 1 }, { currency: 'NGN' }, { customer: { email: 'other@example.com' } }, { domain: 'live' }]) {
    f.setTransaction(override);
    assert.equal((await f.verify(payment)).status, 409);
    assert.equal((await f.store.find(payment.orderNumber)).paymentStatus, 'pending');
  }
  f.setTransaction({ status: 'abandoned' });
  assert.equal((await (await f.verify(payment)).json()).paid, false);
  f.setTransaction({});
  const verified = await (await f.verify(payment)).json();
  assert.equal(verified.paid, true);
  assert.equal(verified.order.status, 'confirmed');
  assert.equal(verified.order.items[0].size, 'M');
  assert.equal(verified.order.paymentMode, 'test');
  assert.equal(verified.order.emailStatus, 'not_configured');
  assert.deepEqual(verified.order.collectionPoint, { code: 'P1234', name: 'PEP Test Collection Point' });
  for (const privateField of ['email', 'tokenHash', 'reference', 'shippingAddress', 'siteOrigin']) assert.equal(privateField in verified.order, false);
});

test('verification and tracking require the return token or order number plus matching email', async t => {
  const f = fixture(t);
  const payment = await f.create();
  assert.equal((await f.verify({ ...payment, trackingToken: 'wrong-token' })).status, 403);
  assert.equal(f.calls.verify, 0);
  assert.equal((await f.request(`/api/orders/${payment.orderNumber}`, undefined, 'GET')).status, 404);
  assert.equal((await f.request(`/api/orders/${payment.orderNumber}?token=${payment.trackingToken}`, undefined, 'GET')).status, 200);
  assert.equal((await f.request('/api/orders/track', { orderNumber: payment.orderNumber, email: 'wrong@example.com' })).status, 404);
  assert.equal((await f.request('/api/orders/track', { orderNumber: payment.orderNumber.toLowerCase(), email: ' CUSTOMER@EXAMPLE.COM ' })).status, 200);
});

test('webhooks authenticate raw payloads and validate payment before applying fulfilment', async t => {
  const f = fixture(t);
  const payment = await f.create();
  assert.equal((await f.webhook(payment, {}, 'invalid')).status, 401);
  assert.equal((await f.webhook(payment, { amount: 1 })).status, 409);
  assert.equal((await f.webhook(payment, { domain: 'live' })).status, 409);
  const raw = 'null';
  const signature = createHmac('sha512', f.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');
  assert.equal((await f.request('/api/payments/webhook', null, 'POST', { 'x-paystack-signature': signature })).status, 400);
  assert.equal((await f.store.find(payment.orderNumber)).paymentStatus, 'pending');
  assert.equal((await f.webhook(payment)).status, 200);
  assert.equal((await f.store.find(payment.orderNumber)).paymentStatus, 'paid');
});

test('concurrent duplicate webhooks and callbacks confirm and send one email only', async t => {
  const f = fixture(t, { email: true });
  const payment = await f.create();
  const responses = await Promise.all([f.verify(payment), ...Array.from({ length: 6 }, () => f.webhook(payment))]);
  assert.ok(responses.every(response => response.status === 200));
  const order = await f.store.find(payment.orderNumber);
  assert.equal(order.history.filter(event => event.status === 'confirmed').length, 1);
  assert.equal(order.emailStatus, 'sent');
  assert.equal(f.calls.emails.length, 1);
  assert.match(f.calls.emails[0].body.text, /PAXI collection point: PEP Test Collection Point \(P1234\)/);
  assert.match(f.calls.emails[0].body.text, /Colour: Green/);
  assert.match(f.calls.emails[0].body.text, /Size: M/);
  assert.ok(f.calls.emails[0].body.text.includes(payment.orderNumber));
  assert.equal(f.calls.emails[0].headers['Idempotency-Key'], `order-confirmation/${payment.orderNumber}`);
  await f.verify(payment);
  await f.webhook(payment);
  assert.equal(f.calls.emails.length, 1);
});

test('legacy orders remain readable and confirmation emails show size as not recorded', async t => {
  const f = fixture(t, { email: true });
  const payment = await f.create();
  await f.store.update(payment.orderNumber, order => { delete order.items[0].size; });
  const verified = await (await f.verify(payment)).json();
  assert.equal(verified.paid, true);
  assert.equal(verified.order.items[0].size, undefined);
  assert.match(f.calls.emails[0].body.text, /Size: Not recorded/);
});

test('email timeout keeps the paid order and retries exactly the same payload and idempotency key', async t => {
  const f = fixture(t, { email: true });
  f.setEmailFailure(true);
  const payment = await f.create();
  const verified = await (await f.verify(payment)).json();
  assert.equal(verified.paid, true);
  assert.equal(verified.order.emailStatus, 'failed');
  await sendOrderEmail(f.store, payment.orderNumber, f.env, f.fetcher);
  assert.equal(f.calls.emails.length, 1);
  await f.store.update(payment.orderNumber, order => { order.emailRetryAfter = 0; order.shippingAddress.fullName = 'Changed name after first attempt'; order.items[0].size = 'XXL'; });
  f.setEmailFailure(false);
  const retried = await retryOrderEmails(f.store, f.env, f.fetcher);
  assert.equal(retried.sent, 1);
  assert.deepEqual(f.calls.emails[0], f.calls.emails[1]);
  assert.match(f.calls.emails[1].body.text, /Size: M/);
  assert.equal((await f.store.find(payment.orderNumber)).emailStatus, 'sent');
});

test('email jobs with expired provider idempotency windows never automatically resend', async t => {
  const f = fixture(t, { email: true });
  f.setEmailFailure(true);
  const payment = await f.create();
  await f.verify(payment);
  await f.store.update(payment.orderNumber, order => { order.emailRetryAfter = 0; order.emailFirstAttemptAt = Date.now() - 25 * 60 * 60 * 1000; });
  f.setEmailFailure(false);
  assert.equal((await retryOrderEmails(f.store, f.env, f.fetcher)).checked, 0);
  await sendOrderEmail(f.store, payment.orderNumber, f.env, f.fetcher);
  assert.equal(f.calls.emails.length, 1);
});

test('a previously claimed email from before size selection retries its original payload unchanged', async t => {
  const f = fixture(t, { email: true });
  const payment = await f.create();
  const originalPayload = {
    from: 'ONLINE <orders@example.com>', to: [checkout().email],
    subject: `Your ONLINE order ${payment.orderNumber} is confirmed`,
    text: 'Original confirmation created before sizes were recorded.',
  };
  await f.store.update(payment.orderNumber, order => {
    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    order.emailStatus = 'failed';
    order.emailFirstAttemptAt = Date.now();
    order.emailPayload = originalPayload;
    delete order.items[0].size;
  });
  await sendOrderEmail(f.store, payment.orderNumber, f.env, f.fetcher);
  assert.equal(f.calls.emails.length, 1);
  assert.deepEqual(f.calls.emails[0].body, originalPayload);
  assert.equal(f.calls.emails[0].headers['Idempotency-Key'], `order-confirmation/${payment.orderNumber}`);
});

test('merchant authentication and sequential PAXI tracking updates govern customer progress', async t => {
  const f = fixture(t);
  const payment = await f.create();
  const endpoint = `/api/admin/orders/${payment.orderNumber}`;
  assert.equal((await f.request('/api/admin/orders', undefined, 'GET')).status, 401);
  assert.equal((await f.request(endpoint, { status: 'processing' }, 'PATCH', f.admin)).status, 409);
  await f.verify(payment);
  assert.equal((await f.request(endpoint, { status: 'shipped' }, 'PATCH', f.admin)).status, 409);
  assert.equal((await f.request(endpoint, { status: 'processing' }, 'PATCH', f.admin)).status, 200);
  assert.equal((await f.request(endpoint, { status: 'shipped' }, 'PATCH', f.admin)).status, 400);
  assert.equal((await f.request(endpoint, { status: 'shipped', tracking: { courier: 'PAXI', trackingNumber: 'TEST123456', url: 'https://attacker.example' } }, 'PATCH', f.admin)).status, 400);
  assert.equal((await f.request(endpoint, { status: 'shipped', tracking: { courier: 'PAXI', trackingNumber: 'TEST123456' } }, 'PATCH', f.admin)).status, 200);
  assert.equal((await f.request(endpoint, { status: 'ready_for_collection' }, 'PATCH', f.admin)).status, 200);
  const tracked = await (await f.request('/api/orders/track', { orderNumber: payment.orderNumber, email: 'customer@example.com' })).json();
  assert.equal(tracked.order.status, 'ready_for_collection');
  assert.equal(tracked.order.tracking.url, 'https://www.paxi.co.za/track-a-parcel');
  assert.equal((await f.request(endpoint, { status: 'delivered' }, 'PATCH', f.admin)).status, 200);
  assert.equal((await f.request(endpoint, { status: 'processing' }, 'PATCH', f.admin)).status, 409);
});

test('payment confirmation notifies the customer and store owner in separate private messages', async t => {
  const ownerEmail = 'store-owner@example.com';
  const f = fixture(t, { email: true, ownerEmail });
  const payment = await f.create();
  const responses = await Promise.all([f.verify(payment), f.webhook(payment), f.webhook(payment)]);
  assert.ok(responses.every(response => response.status === 200));
  assert.equal(f.calls.emails.length, 2);
  const customerMessage = f.calls.emails.find(message => message.body.to.includes(checkout().email));
  const ownerMessage = f.calls.emails.find(message => message.body.to.includes(ownerEmail));
  assert.deepEqual(customerMessage.body.to, [checkout().email]);
  assert.deepEqual(ownerMessage.body.to, [ownerEmail]);
  assert.equal(JSON.stringify(customerMessage.body).includes(ownerEmail), false);
  for (const message of f.calls.emails) {
    assert.equal('cc' in message.body, false);
    assert.equal('bcc' in message.body, false);
    assert.ok(message.body.text.includes(payment.orderNumber));
    assert.match(message.body.text, /PEP Test Collection Point/);
    assert.match(message.body.text, /P1234/);
  }
  assert.notEqual(customerMessage.headers['Idempotency-Key'], ownerMessage.headers['Idempotency-Key']);
  await f.verify(payment);
  await f.webhook(payment);
  assert.equal(f.calls.emails.length, 2);
});

test('unauthorized and invalid fulfilment updates never queue or send customer notifications', async t => {
  const f = fixture(t, { email: true });
  const payment = await f.create();
  const endpoint = `/api/admin/orders/${payment.orderNumber}`;
  assert.equal((await f.request(endpoint, { status: 'processing' }, 'PATCH')).status, 401);
  assert.equal((await f.request(endpoint, { status: 'processing' }, 'PATCH', f.admin)).status, 409);
  assert.equal(f.calls.emails.length, 0);
  await f.verify(payment);
  assert.equal(f.calls.emails.length, 1);
  assert.equal((await f.request(endpoint, { status: 'shipped', tracking: { courier: 'PAXI', trackingNumber: 'TEST123456' } }, 'PATCH', f.admin)).status, 409);
  assert.equal((await f.request(endpoint, { status: 'processing' }, 'PATCH', f.admin)).status, 200);
  assert.equal((await f.request(endpoint, { status: 'shipped' }, 'PATCH', f.admin)).status, 400);
  assert.equal((await f.request(endpoint, { status: 'shipped', tracking: { courier: 'PAXI', trackingNumber: 'TEST123456', url: 'https://attacker.example' } }, 'PATCH', f.admin)).status, 400);
  assert.equal((await f.request(endpoint, { status: 'ready_for_collection' }, 'PATCH', f.admin)).status, 409);
  assert.equal(f.calls.emails.length, 1);
  const stored = await f.store.find(payment.orderNumber);
  assert.equal(stored.status, 'processing');
  assert.equal((stored.notificationEmails || []).filter(job => job.kind !== 'confirmed').length, 0);
});

test('concurrent PAXI status updates send each customer and owner notification once with the selected collection point', async t => {
  const ownerEmail = 'store-owner@example.com';
  const f = fixture(t, { email: true, ownerEmail });
  const payment = await f.create();
  await f.verify(payment);
  const endpoint = `/api/admin/orders/${payment.orderNumber}`;
  assert.equal((await f.request(endpoint, { status: 'processing' }, 'PATCH', f.admin)).status, 200);
  const initialEmailCount = f.calls.emails.length;
  assert.equal(initialEmailCount, 2);
  const statuses = ['shipped', 'ready_for_collection', 'delivered'];
  for (const [index, status] of statuses.entries()) {
    const body = { status, ...(status === 'shipped' ? { tracking: { courier: 'PAXI', trackingNumber: 'TEST123456' } } : {}) };
    const responses = await Promise.all(Array.from({ length: 5 }, () => f.request(endpoint, body, 'PATCH', f.admin)));
    assert.ok(responses.every(response => response.status === 200));
    assert.equal(f.calls.emails.length, initialEmailCount + (index + 1) * 2);
    const latestMessages = f.calls.emails.slice(-2);
    assert.deepEqual(latestMessages.flatMap(message => message.body.to).sort(), [checkout().email, ownerEmail].sort());
    for (const message of latestMessages) {
      assert.ok(message.body.text.includes(payment.orderNumber));
      assert.match(message.body.text, /PEP Test Collection Point/);
      assert.match(message.body.text, /P1234/);
      assert.match(message.body.text, /TEST123456/);
      if (message.body.to.includes(checkout().email)) {
        assert.equal(JSON.stringify(message.body).includes(ownerEmail), false);
        assert.match(message.body.text, /http:\/\/localhost:5173\/track-order\?order=/);
      }
    }
    const stored = await f.store.find(payment.orderNumber);
    assert.equal(stored.history.filter(event => event.status === status).length, 1);
  }
  assert.equal(new Set(f.calls.emails.map(message => message.headers['Idempotency-Key'])).size, f.calls.emails.length);
  assert.match(f.calls.emails.find(message => message.body.to.includes(checkout().email) && /ready|arrived/i.test(message.body.subject)).body.text, /collect|collection/i);
  await retryOrderEmails(f.store, f.env, f.fetcher);
  assert.equal(f.calls.emails.length, 8);
});

test('a failed PAXI notification preserves fulfilment and retries its original recipient, payload and idempotency key', async t => {
  const f = fixture(t, { email: true });
  const payment = await f.create();
  await f.verify(payment);
  const endpoint = `/api/admin/orders/${payment.orderNumber}`;
  await f.request(endpoint, { status: 'processing' }, 'PATCH', f.admin);
  f.setEmailFailure(true);
  const body = { status: 'shipped', tracking: { courier: 'PAXI', trackingNumber: 'TEST123456' } };
  const response = await f.request(endpoint, body, 'PATCH', f.admin);
  assert.equal(response.status, 200);
  const publicResult = await response.json();
  assert.equal(publicResult.order.status, 'shipped');
  assert.equal(publicResult.order.notifications.find(job => job.kind === 'shipped').status, 'failed');
  const stored = await f.store.find(payment.orderNumber);
  const failed = stored.notificationEmails.find(job => job.kind === 'shipped' && job.audience === 'customer');
  assert.equal(failed.status, 'failed');
  assert.equal(failed.attempts, 1);
  assert.ok(failed.retryAfter > Date.now());
  const firstAttempt = f.calls.emails[1];
  assert.equal(firstAttempt.headers['Idempotency-Key'], `order-notification/${payment.orderNumber}/customer/shipped`);
  await f.request(endpoint, body, 'PATCH', f.admin);
  await retryOrderEmails(f.store, f.env, f.fetcher);
  assert.equal(f.calls.emails.length, 2);
  await f.store.update(payment.orderNumber, order => {
    order.notificationEmails.find(job => job.kind === 'shipped' && job.audience === 'customer').retryAfter = 0;
    order.email = 'changed-customer@example.com';
    order.shippingAddress.paxiPointName = 'Changed collection point';
    order.tracking.trackingNumber = 'CHANGED123';
  });
  f.setEmailFailure(false);
  assert.equal((await retryOrderEmails(f.store, f.env, f.fetcher)).sent, 1);
  assert.equal(f.calls.emails.length, 3);
  assert.deepEqual(f.calls.emails[2], firstAttempt);
  const retried = (await f.store.find(payment.orderNumber)).notificationEmails.find(job => job.kind === 'shipped' && job.audience === 'customer');
  assert.equal(retried.status, 'sent');
  assert.equal(retried.attempts, 2);
  assert.ok(retried.sentAt);
});

test('owner email failure cannot fail or repeat the customer confirmation', async t => {
  const ownerEmail = 'store-owner@example.com';
  const f = fixture(t, { email: true, ownerEmail });
  f.setEmailFailure(body => body.to.includes(ownerEmail));
  const payment = await f.create();
  const response = await f.verify(payment);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.paid, true);
  assert.equal(result.order.emailStatus, 'sent');
  assert.equal(f.calls.emails.length, 2);
  const firstOwnerAttempt = f.calls.emails.find(message => message.body.to.includes(ownerEmail));
  const stored = await f.store.find(payment.orderNumber);
  const ownerJob = stored.notificationEmails.find(job => job.kind === 'confirmed' && job.audience === 'owner');
  assert.equal(ownerJob.status, 'failed');
  assert.equal(ownerJob.attempts, 1);
  await f.verify(payment);
  assert.equal(f.calls.emails.length, 2);
  await f.store.update(payment.orderNumber, order => {
    order.notificationEmails.find(job => job.kind === 'confirmed' && job.audience === 'owner').retryAfter = 0;
  });
  f.env.ORDER_OWNER_EMAIL = 'new-owner@example.com';
  f.setEmailFailure(false);
  assert.equal((await retryOrderEmails(f.store, f.env, f.fetcher)).sent, 1);
  assert.deepEqual(f.calls.emails.at(-1), firstOwnerAttempt);
  assert.equal(f.calls.emails.filter(message => message.body.to.includes(checkout().email)).length, 1);
  assert.equal((await f.store.find(payment.orderNumber)).emailStatus, 'sent');
});

test('authenticated tracking exposes customer notification summaries and the selected PAXI point without private delivery data', async t => {
  const ownerEmail = 'store-owner@example.com';
  const f = fixture(t, { email: true, ownerEmail });
  const payment = await f.create();
  await f.verify(payment);
  const endpoint = `/api/admin/orders/${payment.orderNumber}`;
  for (const body of [{ status: 'processing' }, { status: 'shipped', tracking: { courier: 'PAXI', trackingNumber: 'TEST123456' } }, { status: 'ready_for_collection' }]) {
    assert.equal((await f.request(endpoint, body, 'PATCH', f.admin)).status, 200);
  }
  const responses = await Promise.all([
    f.request('/api/orders/track', { orderNumber: payment.orderNumber, email: checkout().email }),
    f.request(`/api/orders/${payment.orderNumber}?token=${payment.trackingToken}`, undefined, 'GET'),
    f.verify(payment),
  ]);
  for (const response of responses) {
    assert.equal(response.status, 200);
    const { order } = await response.json();
    assert.equal(order.status, 'ready_for_collection');
    assert.deepEqual(order.collectionPoint, { code: 'P1234', name: 'PEP Test Collection Point' });
    assert.equal(order.tracking.trackingNumber, 'TEST123456');
    assert.equal(order.tracking.url, 'https://www.paxi.co.za/track-a-parcel');
    assert.deepEqual(order.notifications.map(job => job.kind), ['shipped', 'ready_for_collection']);
    for (const job of order.notifications) {
      assert.equal(job.status, 'sent');
      assert.ok(job.createdAt);
      assert.ok(job.sentAt);
      assert.deepEqual(Object.keys(job).sort(), ['kind', 'status', 'createdAt', 'sentAt'].sort());
    }
    for (const field of ['email', 'tokenHash', 'reference', 'shippingAddress', 'siteOrigin', 'notificationEmails', 'ownerNotifications', 'emailPayload', 'emailProviderId']) {
      assert.equal(field in order, false);
    }
    const publicJson = JSON.stringify(order);
    for (const secret of [checkout().email, ownerEmail, 'email-fixture-id', 'fixture-only', payment.trackingToken]) assert.equal(publicJson.includes(secret), false);
  }
});

test('PAXI notification retries stop before the provider idempotency window expires', async t => {
  const f = fixture(t, { email: true, ownerEmail: 'store-owner@example.com' });
  const payment = await f.create();
  await f.verify(payment);
  const endpoint = `/api/admin/orders/${payment.orderNumber}`;
  await f.request(endpoint, { status: 'processing' }, 'PATCH', f.admin);
  f.setEmailFailure(true);
  await f.request(endpoint, { status: 'shipped', tracking: { courier: 'PAXI', trackingNumber: 'TEST123456' } }, 'PATCH', f.admin);
  assert.equal(f.calls.emails.length, 4);
  await f.store.update(payment.orderNumber, order => {
    for (const job of order.notificationEmails.filter(job => job.kind === 'shipped')) {
      job.retryAfter = 0;
      job.firstAttemptAt = Date.now() - 25 * 60 * 60 * 1000;
    }
  });
  f.setEmailFailure(false);
  assert.equal((await retryOrderEmails(f.store, f.env, f.fetcher)).checked, 0);
  await sendOrderNotifications(f.store, payment.orderNumber, f.env, f.fetcher);
  assert.equal(f.calls.emails.length, 4);
  assert.equal((await f.store.find(payment.orderNumber)).status, 'shipped');
});

test('orders and PAXI arrivals stay trackable while email is unconfigured and queued messages send once after setup', async t => {
  const f = fixture(t);
  const payment = await f.create();
  await f.verify(payment);
  const endpoint = `/api/admin/orders/${payment.orderNumber}`;
  for (const body of [{ status: 'processing' }, { status: 'shipped', tracking: { courier: 'PAXI', trackingNumber: 'TEST123456' } }, { status: 'ready_for_collection' }]) {
    assert.equal((await f.request(endpoint, body, 'PATCH', f.admin)).status, 200);
  }
  const { order } = await (await f.request('/api/orders/track', { orderNumber: payment.orderNumber, email: checkout().email })).json();
  assert.equal(order.status, 'ready_for_collection');
  assert.equal(order.collectionPoint.code, 'P1234');
  assert.equal(order.emailStatus, 'not_configured');
  assert.ok(order.notifications.every(job => job.status === 'not_configured'));
  assert.equal(f.calls.emails.length, 0);
  f.env.RESEND_API_KEY = 'fixture-only';
  f.env.ORDER_FROM_EMAIL = 'ONLINE <orders@example.com>';
  f.env.ORDER_OWNER_EMAIL = 'store-owner@example.com';
  const retried = await f.request('/api/admin/orders/retry-emails', {}, 'POST', f.admin);
  assert.equal(retried.status, 200);
  assert.equal((await retried.json()).sent, 6);
  assert.equal(f.calls.emails.length, 6);
  assert.equal(f.calls.emails.filter(message => message.body.to.includes(checkout().email)).length, 3);
  assert.equal(f.calls.emails.filter(message => message.body.to.includes(f.env.ORDER_OWNER_EMAIL)).length, 3);
  const saved = await f.store.find(payment.orderNumber);
  assert.equal(saved.status, 'ready_for_collection');
  assert.equal(saved.emailStatus, 'sent');
  assert.ok(saved.notificationEmails.every(job => job.status === 'sent' && job.attempts === 1));
  await f.request(`/api/admin/orders/${payment.orderNumber}/retry-email`, {}, 'POST', f.admin);
  assert.equal(f.calls.emails.length, 6);
});

test('unconfigured owner jobs cannot fill the retry queue ahead of a later customer shipment', async t => {
  const f = fixture(t, { email: true });
  const templatePayment = await f.create();
  await f.verify(templatePayment);
  const template = await f.store.find(templatePayment.orderNumber);
  assert.equal(template.emailStatus, 'sent');
  assert.equal(template.notificationEmails[0].status, 'not_configured');
  for (let index = 0; index < 25; index++) {
    await f.store.insert({
      ...template, orderNumber: `ONL-20200101-${String(index).padStart(12, '0')}`,
      reference: `unconfigured-owner-${index}`, createdAt: '2020-01-01T00:00:00.000Z',
    });
  }
  const payment = await f.create();
  await f.verify(payment);
  const endpoint = `/api/admin/orders/${payment.orderNumber}`;
  await f.request(endpoint, { status: 'processing' }, 'PATCH', f.admin);
  f.setEmailFailure(true);
  await f.request(endpoint, { status: 'shipped', tracking: { courier: 'PAXI', trackingNumber: 'TEST123456' } }, 'PATCH', f.admin);
  await f.store.update(payment.orderNumber, order => {
    order.notificationEmails.find(job => job.kind === 'shipped' && job.audience === 'customer').retryAfter = 0;
  });
  const attemptsBeforeRetry = f.calls.emails.length;
  f.setEmailFailure(false);
  const retried = await retryOrderEmails(f.store, f.env, f.fetcher);
  assert.equal(retried.sent, 1);
  assert.equal(f.calls.emails.length, attemptsBeforeRetry + 1);
  assert.deepEqual(f.calls.emails.at(-1).body.to, [checkout().email]);
  assert.ok(f.calls.emails.at(-1).body.subject.includes(payment.orderNumber));
});

test('an invalid owner email stays queued until a valid recipient is configured', async t => {
  const f = fixture(t, { email: true, ownerEmail: 'not-an-email' });
  const payment = await f.create();
  await f.verify(payment);
  assert.equal(f.calls.emails.length, 1);
  assert.deepEqual(f.calls.emails[0].body.to, [checkout().email]);
  const ownerJob = (await f.store.find(payment.orderNumber)).notificationEmails.find(job => job.audience === 'owner');
  assert.equal(ownerJob.status, 'not_configured');
  assert.equal(ownerJob.attempts, 0);
  assert.equal((await retryOrderEmails(f.store, f.env, f.fetcher)).sent, 0);
  f.env.ORDER_OWNER_EMAIL = 'store-owner@example.com';
  assert.equal((await retryOrderEmails(f.store, f.env, f.fetcher)).sent, 1);
  assert.equal(f.calls.emails.length, 2);
  assert.deepEqual(f.calls.emails[1].body.to, [f.env.ORDER_OWNER_EMAIL]);
});

test('email setup flags require merchant authentication and expose no credentials or recipient addresses', async t => {
  const f = fixture(t);
  const endpoint = '/api/admin/email-settings';
  assert.equal((await f.request(endpoint, undefined, 'GET')).status, 401);
  assert.equal((await f.request(endpoint, undefined, 'GET', { Authorization: 'Bearer wrong-admin-key' })).status, 401);
  const setup = async () => {
    const response = await f.request(endpoint, undefined, 'GET', f.admin);
    assert.equal(response.status, 200);
    return response.json();
  };
  assert.deepEqual(await setup(), { providerConfigured: false, senderConfigured: false, ownerConfigured: false });
  f.env.RESEND_API_KEY = 'fixture-only-secret';
  f.env.ORDER_FROM_EMAIL = 'ONLINE <orders@example.com>';
  f.env.ORDER_OWNER_EMAIL = 'invalid-owner';
  assert.deepEqual(await setup(), { providerConfigured: true, senderConfigured: true, ownerConfigured: false });
  f.env.ORDER_OWNER_EMAIL = 'store-owner@example.com';
  assert.deepEqual(await setup(), { providerConfigured: true, senderConfigured: true, ownerConfigured: true });
});

test('admin search reaches older paid orders and cursor pages remain stable when timestamps match', async t => {
  const f = fixture(t);
  const payment = await f.create();
  const template = await f.store.find(payment.orderNumber);
  const expected = [payment.orderNumber];
  for (let index = 0; index < 120; index++) {
    const orderNumber = `ONL-20260101-${String(index).padStart(12, '0')}`;
    expected.push(orderNumber);
    await f.store.insert({
      ...template, orderNumber, reference: `test-reference-${index}`, createdAt: '2026-01-01T00:00:00.000Z',
      email: index === 0 ? 'old_customer@example.com' : 'recent@example.com',
      paymentMode: index === 0 ? 'live' : 'test', paymentStatus: 'paid', status: 'processing',
    });
  }
  const adminGet = async query => {
    const response = await f.request(`/api/admin/orders${query ? `?${query}` : ''}`, undefined, 'GET', f.admin);
    assert.equal(response.status, 200);
    return response.json();
  };
  const first = await adminGet('');
  assert.equal(first.orders.length, 50);
  assert.equal(typeof first.nextCursor, 'string');
  assert.equal(first.orders[0].paymentMode, 'test');
  // Newer inserts must not duplicate or skip the remaining older orders.
  await f.store.insert({ ...template, orderNumber: 'ONL-NEWEST', reference: 'test-newest-reference', createdAt: '2099-01-01T00:00:00.000Z' });
  const second = await adminGet(new URLSearchParams({ cursor: first.nextCursor }));
  const third = await adminGet(new URLSearchParams({ cursor: second.nextCursor }));
  assert.equal(second.orders.length, 50);
  assert.equal(third.orders.length, 21);
  assert.equal(third.nextCursor, null);
  const seen = [...first.orders, ...second.orders, ...third.orders].map(order => order.orderNumber);
  assert.equal(new Set(seen).size, expected.length);
  assert.deepEqual([...seen].sort(), expected.sort());
  assert.deepEqual(seen.slice(1), [...seen.slice(1)].sort().reverse());
  const byEmail = await adminGet(new URLSearchParams({ search: ' OLD_CUSTOMER@EXAMPLE.COM ' }));
  assert.equal(byEmail.orders.length, 1);
  assert.equal(byEmail.orders[0].paymentMode, 'live');
  assert.equal(byEmail.orders[0].status, 'processing');
  const byNumber = await adminGet(new URLSearchParams({ search: byEmail.orders[0].orderNumber.toLowerCase() }));
  assert.equal(byNumber.orders[0].orderNumber, byEmail.orders[0].orderNumber);
  assert.equal(byNumber.nextCursor, null);
  // Search text is literal: SQL wildcard characters cannot match every order.
  assert.equal((await adminGet(new URLSearchParams({ search: '%' }))).orders.length, 0);
  assert.equal((await adminGet(new URLSearchParams({ search: '_' }))).orders.length, 1);
  for (const query of [new URLSearchParams({ cursor: 'broken' }), new URLSearchParams({ cursor: first.nextCursor, search: 'different' })]) {
    assert.equal((await f.request(`/api/admin/orders?${query}`, undefined, 'GET', f.admin)).status, 400);
  }
});

test('orders persist across SQLite close and reopen', async t => {
  const f = fixture(t);
  const payment = await f.create();
  await f.verify(payment);
  const order = await f.store.find(payment.orderNumber);
  const directory = mkdtempSync(join(tmpdir(), 'online-order-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const filename = join(directory, 'orders.sqlite');
  const first = openLocalDatabase(filename);
  await new OrderStore(first).insert(order);
  first.close();
  const second = openLocalDatabase(filename);
  try {
    const reopened = await new OrderStore(second).find(payment.orderNumber);
    assert.deepEqual(reopened, order);
    assert.equal(reopened.items[0].size, 'M');
  }
  finally { second.close(); }
});
