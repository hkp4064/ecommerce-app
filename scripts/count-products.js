// Prints the number of products and categories in the database.
require('dotenv').config();
const knex = require('knex')(require('../knexfile'));

(async () => {
  const products = await knex('products').count({ n: '*' }).first();
  const categories = await knex('categories').count({ n: '*' }).first();
  console.log(`products: ${products.n}, categories: ${categories.n}`);
  await knex.destroy();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
