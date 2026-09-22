'use strict';

// Demo data so the dashboard is not empty on first load.
// Dates are relative to "today" so the demo always shows every status.

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function sampleProducts(today) {
  return [
    { name: 'Full Cream Milk 1L', category: 'Dairy', quantity: 24, purchaseDate: addDays(today, -5), expiryDate: addDays(today, 3), supplier: 'Amul Distributors' },
    { name: 'Greek Yogurt 400g', category: 'Dairy', quantity: 12, purchaseDate: addDays(today, -12), expiryDate: addDays(today, -2), supplier: 'Amul Distributors' },
    { name: 'Whole Wheat Bread', category: 'Bakery', quantity: 0, purchaseDate: addDays(today, -6), expiryDate: addDays(today, 1), supplier: 'City Bakery' },
    { name: 'Basmati Rice 5kg', category: 'Grains', quantity: 40, purchaseDate: addDays(today, -30), expiryDate: addDays(today, 240), supplier: 'Sharma Wholesale' },
    { name: 'Paracetamol 500mg', category: 'Pharmacy', quantity: 150, purchaseDate: addDays(today, -60), expiryDate: addDays(today, 300), supplier: 'MedPlus Supplies' },
    { name: 'Orange Juice 1L', category: 'Beverages', quantity: 0, purchaseDate: addDays(today, -40), expiryDate: addDays(today, -6), supplier: 'FreshPress Ltd' },
    { name: 'Cheddar Cheese 200g', category: 'Dairy', quantity: 18, purchaseDate: addDays(today, -10), expiryDate: addDays(today, 7), supplier: 'Britannia Foods' },
  ];
}

module.exports = { sampleProducts, addDays };
