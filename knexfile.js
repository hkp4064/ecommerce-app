require('dotenv').config();

module.exports = {
  client: 'better-sqlite3',
  connection: {
    filename: process.env.DB_FILE || './data.sqlite',
  },
  useNullAsDefault: true,
  migrations: { directory: './db/migrations' },
  seeds: { directory: './db/seeds' },
};
