const { httpRequestsTotal, httpRequestDuration } = require('../metrics');

function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') return next();
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const raw = req.route ? (req.baseUrl || '') + req.route.path : 'unmatched';
    const route = raw.length > 1 ? raw.replace(/\/$/, '') : raw;
    const labels = { method: req.method, route, status: res.statusCode };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
}

module.exports = metricsMiddleware;