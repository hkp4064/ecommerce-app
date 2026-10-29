/**
 * Creates the categories and products tables.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('categories', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
  });

  await knex.schema.createTable('products', (table) => {
    table.increments('id').primary();
    table.string('name', 200).notNullable();
    table.text('description').notNullable();
    table.decimal('price', 10, 2).notNullable();
    table.string('image_url', 500).notNullable();
    table.integer('category_id').unsigned().notNullable()
      .references('id').inTable('categories').onDelete('RESTRICT');
    table.integer('stock').notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.check('?? > 0', ['price']);
    table.check('?? >= 0', ['stock']);
    table.index('name');
    table.index('category_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('categories');
};
