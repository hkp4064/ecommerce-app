exports.up = async function (knex) {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email', 254).notNullable().unique(); // stored lowercase by the app
    table.string('name', 100).notNullable();
    table.string('password_hash', 255).notNullable();  // bcrypt hash, never the password
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('users');
};
