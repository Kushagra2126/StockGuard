'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../app');
const { createStore } = require('../src/inventory');

const TODAY = '2026-06-15'; // fixed date so tests never depend on the real clock

// Start a fresh app on a random port. The server is closed automatically
// when the test finishes.
async function startApp(t) {
  const app = createApp({ store: createStore(), now: () => TODAY });
  const server = app.listen(0);
  t.after(() => server.close());
  return `http://127.0.0.1:${server.address().port}`;
}

const validProduct = {
  name: 'Milk 1L',
  category: 'Dairy',
  quantity: 10,
  purchaseDate: '2026-06-10',
  expiryDate: '2026-06-20',
  supplier: 'Amul',
};

function postJson(base, body) {
  return fetch(`${base}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------- health
test('GET /health returns status ok', async (t) => {
  const base = await startApp(t);
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
  assert.ok(body.commit, 'commit id should be present');
});

// ----------------------------------------------------------- add product
test('POST /api/products adds a product and GET /api/products lists it', async (t) => {
  const base = await startApp(t);

  const created = await postJson(base, validProduct);
  assert.equal(created.status, 201);
  const product = await created.json();
  assert.equal(product.id, 1);
  assert.equal(product.name, 'Milk 1L');

  const list = await (await fetch(`${base}/api/products`)).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Milk 1L');
  assert.equal(list[0].quantity, 10);
  assert.equal(list[0].daysUntilExpiry, 5);
  assert.equal(list[0].expiryStatus, 'expiring-soon');
});

test('HTML form posts a product, redirects, and the dashboard shows it', async (t) => {
  const base = await startApp(t);

  const post = await fetch(`${base}/products`, {
    method: 'POST',
    body: new URLSearchParams({ ...validProduct, quantity: '10' }),
    redirect: 'manual',
  });
  assert.equal(post.status, 303);

  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /Milk 1L/);
  assert.match(html, /id="stat-total">1</);
});

// ------------------------------------------------------ invalid quantity
test('POST /api/products rejects invalid quantities', async (t) => {
  const base = await startApp(t);
  const badQuantities = [-5, 2.5, 'abc', '', null];

  for (const quantity of badQuantities) {
    const res = await postJson(base, { ...validProduct, quantity });
    assert.equal(res.status, 400, `quantity ${JSON.stringify(quantity)} should be rejected`);
    const body = await res.json();
    assert.ok(body.details.quantity, 'error should mention quantity');
  }

  const list = await (await fetch(`${base}/api/products`)).json();
  assert.equal(list.length, 0, 'nothing should have been saved');
});

test('POST /api/products rejects missing name and expiry before purchase', async (t) => {
  const base = await startApp(t);

  const noName = await postJson(base, { ...validProduct, name: '   ' });
  assert.equal(noName.status, 400);
  assert.ok((await noName.json()).details.name);

  const backwards = await postJson(base, { ...validProduct, expiryDate: '2026-06-01' });
  assert.equal(backwards.status, 400);
  assert.ok((await backwards.json()).details.expiryDate);
});

test('HTML form shows an error message for invalid quantity', async (t) => {
  const base = await startApp(t);
  const res = await fetch(`${base}/products`, {
    method: 'POST',
    body: new URLSearchParams({ ...validProduct, quantity: '-1' }),
  });
  assert.equal(res.status, 400);
  const html = await res.text();
  assert.match(html, /Quantity must be a whole number/);
  assert.match(html, /value="Milk 1L"/, 'form should keep what the user typed');
});

// ------------------------------------------------ expiry alerts endpoint
test('GET /api/expiry-alerts groups expired, expiring and out-of-stock items', async (t) => {
  const base = await startApp(t);
  await postJson(base, { ...validProduct, name: 'Old Yogurt', expiryDate: '2026-06-10' }); // -5
  await postJson(base, { ...validProduct, name: 'Milk', expiryDate: '2026-06-18' }); // +3
  await postJson(base, { ...validProduct, name: 'Rice', expiryDate: '2027-01-01' }); // far
  await postJson(base, { ...validProduct, name: 'Bread', quantity: 0, expiryDate: '2026-06-16' }); // +1, empty

  const alerts = await (await fetch(`${base}/api/expiry-alerts`)).json();
  assert.equal(alerts.windowDays, 7);
  assert.deepEqual(alerts.expired.map((p) => p.name), ['Old Yogurt']);
  assert.deepEqual(alerts.expiringSoon.map((p) => p.name).sort(), ['Bread', 'Milk']);
  assert.deepEqual(alerts.outOfStock.map((p) => p.name), ['Bread']);

  const wide = await (await fetch(`${base}/api/expiry-alerts?days=365`)).json();
  assert.equal(wide.counts.expiringSoon, 3);

  const bad = await fetch(`${base}/api/expiry-alerts?days=abc`);
  assert.equal(bad.status, 400);
});

// ------------------------------------------------------------ dashboard
test('dashboard shows the correct count for each statistic', async (t) => {
  const base = await startApp(t);
  await postJson(base, { ...validProduct, name: 'Old Yogurt', expiryDate: '2026-06-10' });
  await postJson(base, { ...validProduct, name: 'Milk', expiryDate: '2026-06-18' });
  await postJson(base, { ...validProduct, name: 'Bread', quantity: 0, expiryDate: '2026-12-01' });

  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /id="stat-total">3</);
  assert.match(html, /id="stat-expiring">1</);
  assert.match(html, /id="stat-out">1</);
  assert.match(html, /id="stat-expired">1</);
});

test('unknown API route returns JSON 404 and bad JSON returns 400', async (t) => {
  const base = await startApp(t);
  const missing = await fetch(`${base}/api/nope`);
  assert.equal(missing.status, 404);

  const bad = await fetch(`${base}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json',
  });
  assert.equal(bad.status, 400);
});
