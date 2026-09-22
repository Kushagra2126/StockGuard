'use strict';

const { EXPIRING_SOON_DAYS, enrichProduct } = require('./expiry');

/** Simple in-memory product store (data resets when the server restarts). */
function createStore(initial = []) {
  const products = [];
  let nextId = 1;

  const store = {
    add(values) {
      const product = { id: nextId++, ...values };
      products.push(product);
      return product;
    },
    all() {
      return products.map((p) => ({ ...p }));
    },
    clear() {
      products.length = 0;
      nextId = 1;
    },
  };

  initial.forEach((p) => store.add(p));
  return store;
}

/** Enrich every product and sort by soonest expiry first. */
function listProducts(store, today) {
  return store
    .all()
    .map((p) => enrichProduct(p, today))
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry || a.id - b.id);
}

/** Numbers shown on the dashboard. */
function computeStats(products) {
  return {
    totalProducts: products.length,
    expiringThisWeek: products.filter((p) => p.expiryStatus === 'expiring-soon').length,
    outOfStock: products.filter((p) => p.outOfStock).length,
    expired: products.filter((p) => p.expiryStatus === 'expired').length,
  };
}

/** Data for GET /api/expiry-alerts. */
function buildAlerts(products, today, windowDays = EXPIRING_SOON_DAYS) {
  const expired = products.filter((p) => p.expiryStatus === 'expired');
  const expiringSoon = products.filter(
    (p) => p.daysUntilExpiry >= 0 && p.daysUntilExpiry <= windowDays
  );
  const outOfStock = products.filter((p) => p.outOfStock);
  return {
    generatedOn: today,
    windowDays,
    counts: {
      expired: expired.length,
      expiringSoon: expiringSoon.length,
      outOfStock: outOfStock.length,
    },
    expired,
    expiringSoon,
    outOfStock,
  };
}

module.exports = { createStore, listProducts, computeStats, buildAlerts };
