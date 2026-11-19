const bcrypt = require('bcryptjs');
const db = require('../db');
const HttpError = require('../middleware/HttpError');
const { authAttemptsTotal } = require('../metrics');

const ROUNDS = 12; // bcrypt cost factor

// Compared against when the email doesn't exist, so a login for an unknown
// email takes about as long as a real one (prevents user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', ROUNDS);

const PUBLIC_COLUMNS = ['id', 'email', 'name'];

async function registerUser({ email, name, password }) {
  const existing = await db('users').where({ email }).first();
  if (existing) {
    throw new HttpError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, ROUNDS);

  try {
    await db('users').insert({ email, name, password_hash: passwordHash });
  } catch (err) {
    // Two simultaneous registrations for the same email
    if (err && String(err.code).startsWith('SQLITE_CONSTRAINT')) {
      throw new HttpError(409, 'An account with this email already exists');
    }
    throw err;
  }

  return db('users').where({ email }).select(PUBLIC_COLUMNS).first();
}

// Returns the public user object, or null if the credentials are wrong
async function authenticate(email, password) {
  const user = await db('users').where({ email }).first();
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) {
    authAttemptsTotal.inc({ result: 'failure' });
    return null;
  }
  authAttemptsTotal.inc({ result: 'success' });
  return { id: user.id, email: user.email, name: user.name };
}

async function getUserById(id) {
  return (await db('users').where({ id }).select(PUBLIC_COLUMNS).first()) || null;
}

module.exports = { registerUser, authenticate, getUserById };
