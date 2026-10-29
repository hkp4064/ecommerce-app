const path = require('path');
const express = require('express');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Parse JSON request bodies
app.use(express.json());

// ---- API routes ----
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Module 4 will add:
app.use('/api/products', require('./routes/products.routes'));
app.use('/api/categories', require('./routes/categories.routes'));

// Unknown /api/* paths return a JSON 404 (not an HTML page)
app.use('/api', notFound);

// ---- Frontend (static files) ----
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ---- Error handling (must be last) ----
app.use(errorHandler);

module.exports = app;
