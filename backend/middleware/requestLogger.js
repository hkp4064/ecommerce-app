const crypto = require('crypto');
const pinoHttp = require('pino-http');
const { logger } = require('../logger');

// Only accept simple client-supplied IDs (prevents log injection)
const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;

module.exports = pinoHttp({
  logger,

  // Every request gets an ID, also returned to the client in X-Request-Id
  genReqId(req, res) {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },

  // Log API calls only (not static files, and not /metrics once Prometheus scrapes it)
  autoLogging: { ignore: (req) => !req.url.startsWith('/api') },

  // Level reflects the outcome: 5xx -> error, 4xx -> warn, everything else -> info
  customLogLevel(req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  // Added to the "request completed" line
  customProps(req, res) {
    return {
      userId: req.session && req.session.userId,
      errorMessage: res.locals && res.locals.errorMessage,
    };
  },

  customAttributeKeys: { responseTime: 'duration_ms' },

  // Log only these fields, never headers (cookies) or bodies (passwords)
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: String(req.originalUrl || req.url).slice(0, 200),
      remoteAddress: req.socket && req.socket.remoteAddress,
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
