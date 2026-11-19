const path = require('path');
const express = require('express');
const helmet = require('helmet');
const { sessionMiddleware } = require('./middleware/session');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const metricsMiddleware = require('./middleware/metrics');
const { register } = require('./metrics');

const app = express();

app.use(requestLogger);
app.use(metricsMiddleware);

// Parse JSON request bodies
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", 'data:', 'https://picsum.photos', 'https://*.picsum.photos'],
        'upgrade-insecure-requests': null, // we serve plain http on localhost
      },
    },
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(sessionMiddleware);

// ---- API routes ----
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/products', require('./routes/products.routes'));
app.use('/api/categories', require('./routes/categories.routes'));
app.use('/api/cart', require('./routes/cart.routes'));

if (process.env.ENABLE_FAILURE_DEMO === 'true') {
  app.use('/api/debug', require('./routes/debug.routes'));
}
// Unknown /api/* paths return a JSON 404 (not an HTML page)
app.use('/api', notFound);

// ---- Frontend (static files) ----
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ---- Error handling (must be last) ----
app.use(errorHandler);

module.exports = app;
