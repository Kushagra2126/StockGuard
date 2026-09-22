'use strict';

const path = require('path');
const express = require('express');

const { todayISO, describeExpiry, EXPIRING_SOON_DAYS } = require('./src/expiry');
const { validateProduct } = require('./src/validate');
const { createStore, listProducts, computeStats, buildAlerts } = require('./src/inventory');

// The commit shown in the footer and /health. In Docker/CI it comes from
// GIT_SHA (build arg); on Render it comes from RENDER_GIT_COMMIT.
const sha = [process.env.GIT_SHA, process.env.RENDER_GIT_COMMIT].find(Boolean) || 'local';
const COMMIT = sha.slice(0, 7);

/**
 * Build the Express app. Dependencies are injected so tests can use a fresh
 * store and a fixed "today" date.
 */
function createApp({ store = createStore(), now = () => todayISO() } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.locals.describeExpiry = describeExpiry;
  app.locals.commit = COMMIT;

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // Render the dashboard page (used for GET / and for form errors).
  function renderHome(res, { status = 200, form = {}, errors = {}, added = false } = {}) {
    const today = now();
    const products = listProducts(store, today);
    res.status(status).render('index', {
      products,
      stats: computeStats(products),
      today,
      form,
      errors,
      added,
      windowDays: EXPIRING_SOON_DAYS,
    });
  }

  // ---------- HTML pages ----------
  app.get('/', (req, res) => renderHome(res, { added: req.query.added === '1' }));

  app.post('/products', (req, res) => {
    const { errors, values } = validateProduct(req.body);
    if (Object.keys(errors).length > 0) {
      return renderHome(res, { status: 400, form: req.body, errors });
    }
    store.add(values);
    return res.redirect(303, '/?added=1');
  });

  // ---------- JSON API ----------
  app.get('/api/products', (req, res) => {
    res.json(listProducts(store, now()));
  });

  app.post('/api/products', (req, res) => {
    const { errors, values } = validateProduct(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    const product = store.add(values);
    return res.status(201).json(product);
  });

  app.get('/api/expiry-alerts', (req, res) => {
    let windowDays = EXPIRING_SOON_DAYS;
    if (req.query.days !== undefined) {
      const days = Number(req.query.days);
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        return res.status(400).json({ error: 'days must be a whole number between 1 and 365' });
      }
      windowDays = days;
    }
    const today = now();
    return res.json(buildAlerts(listProducts(store, today), today, windowDays));
  });

  app.get('/health', (req, res) => res.json({ status: 'ok', commit: COMMIT }));

  // ---------- 404 and error handling ----------
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(404).type('text').send('Page not found');
  });

  app.use((err, req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp, COMMIT };
