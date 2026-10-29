const HttpError = require('./HttpError');

// Central error handler: every error ends up here
// Keeps one response shape: { "error": "message" }
module.exports = (err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  // Malformed JSON body (thrown by express.json())
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  // Anything unexpected: log details, hide them from the client
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
