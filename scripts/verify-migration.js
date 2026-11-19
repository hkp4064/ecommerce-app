// Proves that the Part 2 migrations preserve existing Part 1 product data.
// Uses a temporary database, so your real data.sqlite is never touched.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const knexLib = require('knex');
const baseConfig = require('../knexfile');

const root = path.join(__dirname, '..');
const tmpFile = path.join(root, 'tmp-verify.sqlite');

const config = {
  ...baseConfig,
  connection: { filename: tmpFile },
  migrations: { directory: path.join(root, 'db', 'migrations') },
  seeds: { directory: path.join(root, 'db', 'seeds') },
};

async function snapshot(knex) {
  const rows = await knex('products').orderBy('id');
  const hash = crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  return { count: rows.length, hash: hash.slice(0, 16) };
}

async function tables(knex) {
  const rows = await knex.raw(
    "SELECT name FROM sqlite_master WHERE type='table' " +
      "AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'knex_%' ORDER BY name"
  );
  return rows.map((r) => r.name).join(', ');
}

(async () => {
  fs.rmSync(tmpFile, { force: true });
  const knex = knexLib(config);
  let ok = true;

  const check = (label, a, b) => {
    const same = a.count === b.count && a.hash === b.hash;
    if (!same) ok = false;
    console.log(`${same ? 'PASS' : 'FAIL'}  ${label}`);
  };

  try {
    // 1. Recreate the Part 1 database: only migration 001, then seed data
    await knex.migrate.up();
    await knex.seed.run();
    const before = await snapshot(knex);
    console.log('Part 1 database  ->', await tables(knex));
    console.log('Products         ->', before);

    // 2. Apply the Part 2 migrations
    await knex.migrate.latest();
    const after = await snapshot(knex);
    console.log('\nAfter migrating  ->', await tables(knex));
    check('Products unchanged after applying migrations', before, after);

    // 3. Roll back the new migrations, products must still be intact
    await knex.migrate.rollback();
    const rolledBack = await snapshot(knex);
    console.log('\nAfter rollback   ->', await tables(knex));
    check('Products unchanged after rollback', before, rolledBack);

    // 4. Re-apply
    await knex.migrate.latest();
    const reapplied = await snapshot(knex);
    check('Products unchanged after re-applying', before, reapplied);
  } catch (err) {
    ok = false;
    console.error('Error:', err.message);
  } finally {
    await knex.destroy();
    fs.rmSync(tmpFile, { force: true });
  }

  console.log(ok ? '\nAll checks passed.' : '\nSome checks FAILED.');
  process.exit(ok ? 0 : 1);
})();
