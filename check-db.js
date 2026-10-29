const knex = require('knex')(require('./knexfile'));

(async () => {
  const rows = await knex('products')
    .join('categories', 'products.category_id', 'categories.id')
    .select('products.id', 'products.name', 'products.price', 'categories.name as category');
  console.table(rows);
  await knex.destroy();
})();
