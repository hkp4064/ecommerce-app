const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

const cartOperationsTotal = new client.Counter({
  name: 'cart_operations_total',
  help: 'Cart operations',
  labelNames: ['operation'], // add | update | remove
  registers: [register],
});

const cartItemsAddedTotal = new client.Counter({
  name: 'cart_items_added_total',
  help: 'Total items added to carts',
  registers: [register],
});

const authAttemptsTotal = new client.Counter({
  name: 'auth_attempts_total',
  help: 'Login attempts',
  labelNames: ['result'], // success | failure
  registers: [register],
});

module.exports = {
  register,
  httpRequestsTotal,
  httpRequestDuration,
  cartOperationsTotal,
  cartItemsAddedTotal,
  authAttemptsTotal,
};
