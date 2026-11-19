exports.up = async function (knex) {
  // One cart per user
  await knex.schema.createTable('carts', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().unique()
      .references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Items reference products; the price is NOT stored here.
  // Totals are always calculated from products.price on the server.
  await knex.schema.createTable('cart_items', (table) => {
    table.increments('id').primary();
    table.integer('cart_id').unsigned().notNullable()
      .references('id').inTable('carts').onDelete('CASCADE');
    table.integer('product_id').unsigned().notNullable()
      .references('id').inTable('products').onDelete('RESTRICT');
    table.integer('quantity').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['cart_id', 'product_id']); // adding the same product again updates quantity
    table.check('?? > 0', ['quantity']);
    table.index('cart_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('cart_items');
  await knex.schema.dropTableIfExists('carts');
};
