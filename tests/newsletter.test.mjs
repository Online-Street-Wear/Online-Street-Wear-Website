import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOrdersApp } from '../src/server/orders-app.ts';
import { openLocalDatabase } from '../src/server/local-db.js';

function fixture(t) {
  const db = openLocalDatabase(':memory:');
  t.after(() => db.close());
  const app = createOrdersApp(() => { throw new Error('Newsletter subscriptions must not contact external providers.'); });
  const request = body => app.request('http://localhost:8789/api/newsletter/subscribe', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }, { DB: db });
  const subscriptions = async () => (await db.prepare('SELECT email, created_at, updated_at FROM newsletter_subscriptions').all()).results;
  return { db, app, request, subscriptions };
}

test('local newsletter saves a normalized opt-in without credentials or sending email', async t => {
  const f = fixture(t);
  const response = await f.request({ email: '  Shopper@Example.COM  ' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { success: true, message: 'Thanks! Your email is on the newsletter list.' });
  const saved = await f.subscriptions();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].email, 'shopper@example.com');
  assert.ok(saved[0].created_at);
  assert.ok(saved[0].updated_at);
});

test('repeat subscriptions are idempotent and do not disclose existing membership', async t => {
  const f = fixture(t);
  const first = await f.request({ email: 'shopper@example.com' });
  const duplicate = await f.request({ email: ' SHOPPER@EXAMPLE.COM ' });
  assert.equal(first.status, 200);
  assert.equal(duplicate.status, first.status);
  assert.deepEqual(await duplicate.json(), await first.json());
  assert.equal((await f.subscriptions()).length, 1);
});

test('invalid or malformed newsletter submissions are rejected without saving an address', async t => {
  const f = fixture(t);
  for (const body of [{}, null, [], { email: 123 }, { email: '' }, { email: 'not-an-email' }, { email: `shopper@${'a'.repeat(250)}.com` }]) {
    const response = await f.request(body);
    assert.equal(response.status, 400);
    const result = await response.json();
    assert.equal(result.success, false);
    assert.equal(typeof result.message, 'string');
  }
  const malformed = await f.app.request('http://localhost:8789/api/newsletter/subscribe', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"email":',
  }, { DB: f.db });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).success, false);
  assert.deepEqual(await f.subscriptions(), []);
});

test('newsletter does not expose stored contacts through public GET requests', async t => {
  const f = fixture(t);
  await f.request({ email: 'shopper@example.com' });
  for (const path of ['/api/newsletter', '/api/newsletter/subscribe', '/api/newsletter/subscriptions']) {
    const response = await f.app.request(`http://localhost:8789${path}`, {}, { DB: f.db });
    assert.equal(response.status, 404);
    assert.doesNotMatch(await response.text(), /shopper@example\.com/);
  }
});

test('newsletter storage failure returns a retryable error without database details', async t => {
  const f = fixture(t);
  const response = await f.app.request('http://localhost:8789/api/newsletter/subscribe', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'shopper@example.com' }),
  }, { DB: { prepare() { throw new Error('Private database connection details'); } } });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { success: false, message: 'We could not save your subscription. Please try again.' });
});
