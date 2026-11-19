const HttpError = require('../middleware/HttpError');
const { COOKIE_NAME } = require('../middleware/session');
const { hashForLog } = require('../logger');
const { parseRegister, parseLogin } = require('../validators/auth.validator');
const authService = require('../services/auth.service');

const regenerate = (req) =>
  new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())));
const save = (req) =>
  new Promise((resolve, reject) => req.session.save((e) => (e ? reject(e) : resolve())));
const destroy = (req) =>
  new Promise((resolve, reject) => req.session.destroy((e) => (e ? reject(e) : resolve())));

// Creates a fresh session for the user. Regenerating the session ID on login
// prevents session fixation attacks.
async function startSession(req, userId) {
  await regenerate(req);
  req.session.userId = userId;
  await save(req);
}

async function register(req, res) {
  const data = parseRegister(req.body);
  const user = await authService.registerUser(data);
  await startSession(req, user.id); // registering also logs you in
  req.log.info({ event: 'user_registered', userId: user.id }, 'User registered');
  res.status(201).json({ user });
}

async function login(req, res) {
  const { email, password } = parseLogin(req.body);
  const user = await authService.authenticate(email, password);
  if (!user) {
    req.log.warn(
      { event: 'auth_failure', reason: 'invalid_credentials', emailHash: hashForLog(email) },
      'Login failed'
    );
    // Same message for "unknown email" and "wrong password"
    throw new HttpError(401, 'Invalid email or password');
  }
  await startSession(req, user.id);
  req.log.info({ event: 'login_success', userId: user.id }, 'User logged in');
  res.status(200).json({ user });
}

async function logout(req, res) {
  const userId = req.session.userId;
  await destroy(req);
  res.clearCookie(COOKIE_NAME);
  req.log.info({ event: 'logout', userId }, 'User logged out');
  res.status(200).json({ message: 'Logged out' });
}

async function me(req, res) {
  const user = await authService.getUserById(req.session.userId);
  if (!user) {
    // The account was deleted while the session was still alive
    await destroy(req);
    res.clearCookie(COOKIE_NAME);
    throw new HttpError(401, 'Authentication required');
  }
  res.status(200).json({ user });
}

module.exports = { register, login, logout, me };
