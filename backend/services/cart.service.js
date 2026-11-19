const db = require('../db');
const HttpError = require('../middleware/HttpError');
const { MAX_QUANTITY } = require('../validators/cart.validator');
const { cartOperationsTotal, cartItemsAddedTotal } = require('../metrics');

// Money is summed in paise/cents (integers) to avoid floating-point errors.
const toCents = (price) => Math.round(Number(price) * 100);

// Every function takes the user id from the SESSION (set by the controller),
// and only ever looks at that user's cart.
async function getOrCreateCart(conn, userId) {
  let cart = await conn('carts').where({ user_id: userId }).first();
  if (!cart) {
    try {
      await conn('carts').insert({ user_id: userId });
    } catch (err) {
      if (!String(err.code).startsWith('SQLITE_CONSTRAINT')) throw err; // already created
    }
    cart = await conn('carts').where({ user_id: userId }).first();
  }
  return cart;
}

function assertQuantityAllowed(product, quantity) {
  if (product.stock <= 0) {
    throw new HttpError(409, `"${product.name}" is out of stock`);
  }
  if (quantity > product.stock) {
    throw new HttpError(409, `Only ${product.stock} of "${product.name}" available`);
  }
  if (quantity > MAX_QUANTITY) {
    throw new HttpError(409, `You can have at most ${MAX_QUANTITY} of one product in your cart`);
  }
}

const touchCart = (conn, cartId) =>
  conn('carts').where({ id: cartId }).update({ updated_at: db.fn.now() });

// ---- Read ----

async function getCart(userId) {
  const cart = await db('carts').where({ user_id: userId }).first();
  if (!cart) return { items: [], item_count: 0, total: 0 };

  // Prices come from the products table at read time, never from the client.
  const rows = await db('cart_items')
    .join('products', 'cart_items.product_id', 'products.id')
    .where('cart_items.cart_id', cart.id)
    .select(
      'cart_items.id as id',
      'products.id as product_id',
      'products.name',
      'products.image_url',
      'products.price as unit_price',
      'products.stock',
      'cart_items.quantity'
    )
    .orderBy('cart_items.id', 'asc');

  let totalCents = 0;
  let itemCount = 0;
  const items = rows.map((r) => {
    const lineCents = toCents(r.unit_price) * r.quantity;
    totalCents += lineCents;
    itemCount += r.quantity;
    return { ...r, unit_price: Number(r.unit_price), line_total: lineCents / 100 };
  });

  return { items, item_count: itemCount, total: totalCents / 100 };
}

// ---- Write (each runs in a transaction: check, then change) ----
// Inside a transaction always use `trx`, never `db`, or the query will wait forever
// for the single SQLite connection.

async function addItem(userId, productId, quantity) {
  await db.transaction(async (trx) => {
    const cart = await getOrCreateCart(trx, userId);

    const product = await trx('products').where({ id: productId }).first();
    if (!product) throw new HttpError(404, `Product with id ${productId} not found`);

    const existing = await trx('cart_items')
      .where({ cart_id: cart.id, product_id: productId })
      .first();
    const newQuantity = (existing ? existing.quantity : 0) + quantity;
    assertQuantityAllowed(product, newQuantity);

    if (existing) {
      await trx('cart_items').where({ id: existing.id }).update({ quantity: newQuantity });
    } else {
      await trx('cart_items').insert({
        cart_id: cart.id,
        product_id: productId,
        quantity,
      });
    }
    await touchCart(trx, cart.id);
  });
  cartOperationsTotal.inc({ operation: 'add' });
  cartItemsAddedTotal.inc(quantity);
  return getCart(userId);
}

async function updateItem(userId, itemId, quantity) {
  await db.transaction(async (trx) => {
    const cart = await getOrCreateCart(trx, userId);

    // The cart_id condition is the authorization check: an item that belongs
    // to someone else's cart is simply "not found" for this user.
    const item = await trx('cart_items').where({ id: itemId, cart_id: cart.id }).first();
    if (!item) throw new HttpError(404, 'Cart item not found');

    const product = await trx('products').where({ id: item.product_id }).first();
    assertQuantityAllowed(product, quantity);

    await trx('cart_items').where({ id: item.id }).update({ quantity });
    await touchCart(trx, cart.id);
  });
  cartOperationsTotal.inc({ operation: 'update' });
  return getCart(userId);
}

async function removeItem(userId, itemId) {
  await db.transaction(async (trx) => {
    const cart = await getOrCreateCart(trx, userId);
    const deleted = await trx('cart_items').where({ id: itemId, cart_id: cart.id }).del();
    if (deleted === 0) throw new HttpError(404, 'Cart item not found');
    await touchCart(trx, cart.id);
  });
  cartOperationsTotal.inc({ operation: 'remove' });
  return getCart(userId);
}

module.exports = { getCart, addItem, updateItem, removeItem };
