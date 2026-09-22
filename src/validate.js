'use strict';

const { parseDate } = require('./expiry');

const MAX_QUANTITY = 1000000;

/**
 * Convert a quantity from a form (string) or JSON (number) into an integer.
 * Returns null when the value is not a whole number >= 0.
 * Rejects: "", "abc", "-5", "2.5", 1.5, NaN, null, undefined.
 */
function parseQuantity(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Validate the body of "add product" (HTML form or JSON API).
 * Returns { errors, values }. `errors` is an object keyed by field name;
 * it is empty when the input is valid.
 */
function validateProduct(body = {}) {
  const errors = {};

  const name = cleanText(body.name);
  const category = cleanText(body.category);
  const supplier = cleanText(body.supplier);
  const purchaseDate = cleanText(body.purchaseDate);
  const expiryDate = cleanText(body.expiryDate);
  const quantity = parseQuantity(body.quantity);

  if (!name) errors.name = 'Product name is required';
  else if (name.length > 100) errors.name = 'Product name must be 100 characters or fewer';

  if (!category) errors.category = 'Category is required';
  else if (category.length > 50) errors.category = 'Category must be 50 characters or fewer';

  if (!supplier) errors.supplier = 'Supplier is required';
  else if (supplier.length > 100) errors.supplier = 'Supplier must be 100 characters or fewer';

  if (quantity === null) {
    errors.quantity = 'Quantity must be a whole number, 0 or more';
  } else if (quantity > MAX_QUANTITY) {
    errors.quantity = `Quantity must not exceed ${MAX_QUANTITY}`;
  }

  const purchase = parseDate(purchaseDate);
  const expiry = parseDate(expiryDate);
  if (purchase === null) errors.purchaseDate = 'Purchase date must be a valid date (YYYY-MM-DD)';
  if (expiry === null) errors.expiryDate = 'Expiry date must be a valid date (YYYY-MM-DD)';
  if (purchase !== null && expiry !== null && expiry < purchase) {
    errors.expiryDate = 'Expiry date cannot be before the purchase date';
  }

  return {
    errors,
    values: { name, category, quantity, purchaseDate, expiryDate, supplier },
  };
}

module.exports = { validateProduct, parseQuantity, MAX_QUANTITY };
