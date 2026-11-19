// Shows what is stored for users and sessions (password hashes are truncated).
require('dotenv').config();
const knex = require('knex')(require('../knexfile'));

(async () => {
  const users = await knex('users').select('id', 'email', 'name', 'password_hash');
  console.table(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      password_hash: u.password_hash.slice(0, 20) + '...',
    }))
  );
  const sessions = await knex('sessions').count({ n: '*' }).first();
  console.log(`active sessions in database: ${sessions.n}`);
  await knex.destroy();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
