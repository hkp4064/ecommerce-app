const HttpError = require('./HttpError');
const { logger } = require('../logger');

// Knex puts the full SQL, including the values, in front of the real message:
//   "insert into users (...) values ('a@b.com', '$2a$12$...') - SQLITE_ERROR: ..."
// Keep only the part after the last " - " so values are never logged.
function cleanDbMessage(err) {
  const msg = String(err.message);
  const i = msg.lastIndexOf(' - ');
  return i >= 0 ? msg.slice(i + 3) : msg;
}

// Central error handler: every error ends up here.
// Keeps one response shape: { "error": "message" }
module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // Expected errors (validation, auth, not found...). The request log line
  // already records the status, and gets this message through res.locals.
  if (err instanceof HttpError) {
    res.locals.errorMessage = err.message;
    return res.status(err.status).json({ error: err.message });
  }

  if (err.type === 'entity.parse.failed') {
    res.locals.errorMessage = 'Invalid JSON in request body';
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  if (err.type === 'entity.too.large') {
    res.locals.errorMessage = 'Request body too large';
    return res.status(413).json({ error: 'Request body too large' });
  }

  // Unexpected errors: log details, hide them from the client
  const log = req.log || logger;
  if (String(err.code || '').startsWith('SQLITE_')) {
    log.error(
      {
        event: 'database_error',
        db: { code: err.code, errno: err.errno, message: cleanDbMessage(err) },
      },
      'Database error'
    );
  } else {
    log.error({ event: 'unhandled_exception', err }, 'Unhandled exception');
  }

  res.status(500).json({ error: 'Internal server error', requestId: req.id });
};
