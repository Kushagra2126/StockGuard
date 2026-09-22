'use strict';

const { createApp } = require('./app');
const { createStore } = require('./src/inventory');
const { sampleProducts } = require('./src/seed');
const { todayISO } = require('./src/expiry');

const PORT = process.env.PORT || 3000;

// Start with demo data unless SEED_DEMO_DATA=false
const seed = process.env.SEED_DEMO_DATA !== 'false' ? sampleProducts(todayISO()) : [];
const app = createApp({ store: createStore(seed) });

app.listen(PORT, () => console.log(`StockGuard running on port ${PORT}`));
