'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  parseDate,
  daysUntilExpiry,
  getExpiryStatus,
  describeExpiry,
  enrichProduct,
} = require('../src/expiry');
const { parseQuantity } = require('../src/validate');
const { computeStats } = require('../src/inventory');

const TODAY = '2026-06-15';

// -------------------------------------------------- expiry calculation
test('daysUntilExpiry counts whole days from today', () => {
  assert.equal(daysUntilExpiry('2026-06-15', TODAY), 0); // today
  assert.equal(daysUntilExpiry('2026-06-16', TODAY), 1);
  assert.equal(daysUntilExpiry('2026-06-22', TODAY), 8);
  assert.equal(daysUntilExpiry('2026-06-14', TODAY), -1); // yesterday
  assert.equal(daysUntilExpiry('2026-05-16', TODAY), -30);
});

test('daysUntilExpiry handles month, year and leap-day boundaries', () => {
  assert.equal(daysUntilExpiry('2026-07-01', '2026-06-30'), 1);
  assert.equal(daysUntilExpiry('2027-01-01', '2026-12-31'), 1);
  assert.equal(daysUntilExpiry('2028-03-01', '2028-02-28'), 2); // 2028 is a leap year
});

test('daysUntilExpiry returns null for invalid dates', () => {
  assert.equal(daysUntilExpiry('not-a-date', TODAY), null);
  assert.equal(daysUntilExpiry('2026-02-30', TODAY), null);
  assert.equal(daysUntilExpiry('15/06/2026', TODAY), null);
  assert.equal(parseDate(''), null);
});

test('getExpiryStatus classifies expired / expiring-soon / fresh', () => {
  assert.equal(getExpiryStatus(-1), 'expired');
  assert.equal(getExpiryStatus(0), 'expiring-soon'); // expires today is NOT expired yet
  assert.equal(getExpiryStatus(7), 'expiring-soon'); // last day of the window
  assert.equal(getExpiryStatus(8), 'fresh');
  assert.equal(getExpiryStatus(null), 'unknown');
});

test('enrichProduct adds days left, status and out-of-stock flag', () => {
  const product = { id: 1, name: 'Milk', quantity: 0, expiryDate: '2026-06-12' };
  const result = enrichProduct(product, TODAY);
  assert.equal(result.daysUntilExpiry, -3);
  assert.equal(result.expiryStatus, 'expired');
  assert.equal(result.outOfStock, true);
  assert.equal(product.daysUntilExpiry, undefined, 'original must not be mutated');
});

test('describeExpiry gives readable text', () => {
  assert.equal(describeExpiry(-3), 'Expired 3 days ago');
  assert.equal(describeExpiry(-1), 'Expired yesterday');
  assert.equal(describeExpiry(0), 'Expires today');
  assert.equal(describeExpiry(1), '1 day left');
  assert.equal(describeExpiry(5), '5 days left');
});

// --------------------------------------------------- quantity + stats
test('parseQuantity accepts whole numbers only', () => {
  assert.equal(parseQuantity(0), 0);
  assert.equal(parseQuantity('12'), 12);
  assert.equal(parseQuantity(' 7 '), 7);
  for (const bad of [-1, 1.5, '-1', '2.5', 'abc', '', null, undefined, NaN]) {
    assert.equal(parseQuantity(bad), null, `${bad} should be invalid`);
  }
});

test('computeStats counts each dashboard number', () => {
  const day = (expiryDate, quantity) => enrichProduct({ expiryDate, quantity }, TODAY);
  const stats = computeStats([
    day('2026-06-01', 5), // expired
    day('2026-06-16', 0), // expiring soon + out of stock
    day('2026-06-20', 3), // expiring soon
    day('2027-01-01', 9), // fresh
  ]);
  assert.deepEqual(stats, { totalProducts: 4, expiringThisWeek: 2, outOfStock: 1, expired: 1 });
});
