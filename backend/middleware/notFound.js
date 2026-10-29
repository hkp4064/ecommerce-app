const HttpError = require('./HttpError');

// Runs when no route matched
module.exports = (req, res, next) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
