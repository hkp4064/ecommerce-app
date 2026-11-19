const rateLimit = require('express-rate-limit');
const HttpError = require('./HttpError');

// Only FAILED logins count, so normal users are never blocked.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) =>
    next(new HttpError(429, 'Too many failed login attempts. Please try again later.')),
});

module.exports = { loginLimiter };
