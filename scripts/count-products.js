// Prints product/category counts and the tables in the database.
require('dotenv').config();
const knex = require('knex')(require('../knexfile'));

(async () => {
  const products = await knex('products').count({ n: '*' }).first();
  const categories = await knex('categories').count({ n: '*' }).first();
  console.log(`products: ${products.n}, categories: ${categories.n}`);

  const tables = await knex.raw(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  console.log('tables:', tables.map((t) => t.name).join(', '));

  await knex.destroy();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});