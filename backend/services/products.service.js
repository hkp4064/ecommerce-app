const db = require('../db');

// Columns returned for every product
const PRODUCT_COLUMNS = [
  'products.id',
  'products.name',
  'products.description',
  'products.price',
  'products.image_url',
  'products.stock',
  'products.category_id',
  'categories.name as category',
];

async function listProducts({ search, category, page, limit }) {
  const base = db('products').join('categories', 'products.category_id', 'categories.id');

  if (search) {
    base.where((qb) => {
      qb.where('products.name', 'like', `%${search}%`)
        .orWhere('products.description', 'like', `%${search}%`);
    });
  }
  if (category) {
    base.where('products.category_id', category);
  }

  // Total count (for pagination), using the same filters
  const countRow = await base.clone().count({ total: '*' }).first();
  const total = Number(countRow.total);

  const rows = await base
    .clone()
    .select(PRODUCT_COLUMNS)
    .orderBy('products.id', 'asc')
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getProductById(id) {
  const product = await db('products')
    .join('categories', 'products.category_id', 'categories.id')
    .select(PRODUCT_COLUMNS)
    .where('products.id', id)
    .first();
  return product || null;
}

module.exports = { listProducts, getProductById };
