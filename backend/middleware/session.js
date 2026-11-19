const session = require('express-session');
const connectSessionKnex = require('connect-session-knex');
const db = require('../db');
const { logger } = require('../logger');

const COOKIE_NAME = 'ecom.sid';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const secret = process.env.SESSION_SECRET;
if (!secret) {
  throw new Error('SESSION_SECRET is not set. Copy .env.example to .env and set a random value.');
}
if (secret.startsWith('change-me')) {
  logger.warn({ event: 'insecure_config' }, 'SESSION_SECRET is still the placeholder value');
}

// Works with both the older and newer export styles of connect-session-knex.
// The sessions table is created by migration 004, so the store must not create it.
const StoreClass = connectSessionKnex.ConnectSessionKnexStore || connectSessionKnex(session);
const store = new StoreClass({
  knex: db,
  tablename: 'sessions',
  createtable: false,
  createTable: false,
});

const sessionMiddleware = session({
  name: COOKIE_NAME,
  secret,
  store,
  resave: false,
  saveUninitialized: false, // no cookie until someone logs in
  cookie: {
    httpOnly: true,                                  // JavaScript cannot read the cookie
    sameSite: 'lax',                                 // not sent on cross-site POSTs (CSRF defence)
    secure: process.env.NODE_ENV === 'production',   // HTTPS only in production
    maxAge: SEVEN_DAYS,
  },
});

module.exports = { sessionMiddleware, COOKIE_NAME };
