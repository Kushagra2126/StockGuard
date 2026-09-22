'use strict';

// Extra feature: red warning badge for expired products.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../app');
const { createStore } = require('../src/inventory');

const TODAY = '2026-06-15';

test('expired products get a red warning badge, other products do not', async (t) => {
  const store = createStore([
    { name: 'Old Yogurt', category: 'Dairy', quantity: 4, purchaseDate: '2026-06-01', expiryDate: '2026-06-10', supplier: 'Amul' },
    { name: 'Fresh Milk', category: 'Dairy', quantity: 9, purchaseDate: '2026-06-10', expiryDate: '2026-06-30', supplier: 'Amul' },
    { name: 'Expires Today', category: 'Dairy', quantity: 2, purchaseDate: '2026-06-10', expiryDate: TODAY, supplier: 'Amul' },
  ]);
  const server = createApp({ store, now: () => TODAY }).listen(0);
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;

  const html = await (await fetch(`${base}/`)).text();

  // Exactly one red badge: Old Yogurt. "Expires Today" is not expired yet.
  const badges = html.match(/<span class="badge badge--expired">[^<]*Expired<\/span>/g);
  assert.equal(badges.length, 1);

  // The row of the expired product is highlighted, and the red style exists.
  assert.match(html, /<tr class="row row--expired">\s*<th scope="row">Old Yogurt/);
  const css = await (await fetch(`${base}/style.css`)).text();
  assert.match(css, /\.badge--expired\s*\{[^}]*background:\s*var\(--red\)/);
});
