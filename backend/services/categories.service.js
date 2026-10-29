const db = require('../db');

async function listCategories() {
  return db('categories').select('id', 'name').orderBy('name', 'asc');
}

module.exports = { listCategories };
