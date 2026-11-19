const HttpError = require('./HttpError');

// Use on any route that needs a logged-in user.
// Controllers then read the user id from req.session.userId (never from the request body).
module.exports = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return next(new HttpError(401, 'Authentication required'));
  }
  next();
};
