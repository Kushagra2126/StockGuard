'use strict';

// Number of days ahead that counts as "expiring soon" ("this week").
const EXPIRING_SOON_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Parse a strict YYYY-MM-DD string into a UTC timestamp (midnight).
 * Returns null for anything that is not a real calendar date
 * (e.g. "2026-02-30", "12/05/2026", "").
 * Using UTC avoids off-by-one errors caused by time zones / daylight saving.
 */
function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time)) return null;
  // Round-trip check rejects overflow dates such as 2026-02-30.
  if (new Date(time).toISOString().slice(0, 10) !== value) return null;
  return time;
}

/** Today's date as YYYY-MM-DD. */
function todayISO(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * Whole days from `today` until `expiryDate`.
 *   > 0  -> expires in the future
 *   = 0  -> expires today
 *   < 0  -> already expired
 */
function daysUntilExpiry(expiryDate, today = todayISO()) {
  const expiry = parseDate(expiryDate);
  const base = parseDate(today);
  if (expiry === null || base === null) return null;
  return Math.round((expiry - base) / MS_PER_DAY);
}

/**
 * Classify a product's expiry state.
 *   expired        -> daysLeft < 0
 *   expiring-soon  -> 0 <= daysLeft <= windowDays
 *   fresh          -> everything else
 */
function getExpiryStatus(daysLeft, windowDays = EXPIRING_SOON_DAYS) {
  if (daysLeft === null) return 'unknown';
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= windowDays) return 'expiring-soon';
  return 'fresh';
}

/** Human-readable text for the dashboard, e.g. "3 days left". */
function describeExpiry(daysLeft) {
  if (daysLeft === null) return 'Unknown';
  if (daysLeft < -1) return `Expired ${Math.abs(daysLeft)} days ago`;
  if (daysLeft === -1) return 'Expired yesterday';
  if (daysLeft === 0) return 'Expires today';
  if (daysLeft === 1) return '1 day left';
  return `${daysLeft} days left`;
}

/** Add computed fields to a stored product (never mutates the original). */
function enrichProduct(product, today = todayISO()) {
  const daysLeft = daysUntilExpiry(product.expiryDate, today);
  return {
    ...product,
    daysUntilExpiry: daysLeft,
    expiryStatus: getExpiryStatus(daysLeft),
    outOfStock: product.quantity === 0,
  };
}

module.exports = {
  EXPIRING_SOON_DAYS,
  parseDate,
  todayISO,
  daysUntilExpiry,
  getExpiryStatus,
  describeExpiry,
  enrichProduct,
};
