exports.up = async function (knex) {
  await knex.schema.createTable('sessions', (table) => {
    table.string('sid', 255).primary();
    table.json('sess').notNullable();
    table.timestamp('expired').notNullable().index();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('sessions');
};
