require('dotenv').config({ quiet: true });
const crypto = require('crypto');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'ecommerce-api' },
  timestamp: pino.stdTimeFunctions.isoTime, // "time":"2026-11-19T10:15:42.123Z"
  formatters: {
    level: (label) => ({ level: label }),   // "level":"info" instead of 30
  },
  // Safety net: even if a secret ends up in a logged object, it is replaced.
  // (We also never log request bodies or headers at all.)
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      'password',
      'password_hash',
      'passwordHash',
      'token',
      'sess',
      '*.password',
      '*.password_hash',
      '*.passwordHash',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
});

// Lets logs correlate repeated attempts for the same email without storing the
// email itself (keyed hash, so it can't be reversed by guessing common emails).
function hashForLog(value) {
  const key = process.env.SESSION_SECRET || 'log-key';
  return crypto.createHmac('sha256', key).update(String(value).toLowerCase()).digest('hex').slice(0, 12);
}

module.exports = { logger, hashForLog };
