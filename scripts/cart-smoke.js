// Exercises the cart API. Start the server first (npm run dev).
require('dotenv').config();
const knex = require('knex')(require('../knexfile'));
const { createClient } = require('./lib/client');

let failures = 0;
function expect(label, actual, expected) {
  const pass = actual === expected;
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${pass ? '' : `  (got ${actual}, expected ${expected})`}`);
}
const cents = (x) => Math.round(x * 100);

const STOCK_TEST_PRODUCT = 17; // Trekking Backpack

(async () => {
  const email = `cart${Date.now()}@example.com`;
  const c = createClient();
  const originalStock = (await knex('products').where({ id: STOCK_TEST_PRODUCT }).first()).stock;

  try {
    // ---- Authentication required ----
    let r = await createClient().get('/api/cart');
    expect('GET /cart without login -> 401', r.status, 401);
    r = await createClient().post('/api/cart/items', { product_id: 1, quantity: 1 });
    expect('POST /cart/items without login -> 401', r.status, 401);

    await c.post('/api/auth/register', { email, name: 'Cart Tester', password: 'correct-horse-battery' });

    // ---- Empty cart ----
    r = await c.get('/api/cart');
    expect('New user has an empty cart', r.status === 200 && r.data.items.length === 0 && r.data.total === 0, true);

    const p1 = (await c.get('/api/products/1')).data;
    const p2 = (await c.get('/api/products/2')).data;

    // ---- Validation ----
    r = await c.post('/api/cart/items', { product_id: 1, quantity: 0 });
    expect('Quantity 0 -> 400', r.status, 400);
    r = await c.post('/api/cart/items', { product_id: 1, quantity: '2' });
    expect('Quantity as a string -> 400', r.status, 400);
    r = await c.post('/api/cart/items', { product_id: 1, quantity: 11 });
    expect('Quantity above the maximum -> 400', r.status, 400);
    r = await c.post('/api/cart/items', { product_id: 1, quantity: 1, price: 1 });
    expect('Client-submitted price is rejected -> 400', r.status, 400);
    r = await c.post('/api/cart/items', { product_id: 99999, quantity: 1 });
    expect('Unknown product -> 404', r.status, 404);

    // ---- Add, merge, totals from server prices ----
    r = await c.post('/api/cart/items', { product_id: 1, quantity: 2 });
    expect('Add product 1 x2 -> 201', r.status, 201);
    expect('  total = 2 x server price', cents(r.data.total), cents(p1.price) * 2);
    const itemId = r.data.items[0].id;

    r = await c.post('/api/cart/items', { product_id: 1, quantity: 1 });
    expect('Add the same product again merges quantity', r.data.items.length === 1 && r.data.items[0].quantity === 3, true);

    r = await c.post('/api/cart/items', { product_id: 2, quantity: 1 });
    expect('Add a second product', r.data.items.length, 2);
    expect('  total = 3 x p1 + p2', cents(r.data.total), cents(p1.price) * 3 + cents(p2.price));
    const item2Id = r.data.items[1].id;

    // ---- Update ----
    r = await c.patch(`/api/cart/items/${itemId}`, { quantity: 1 });
    expect('PATCH quantity -> 200', r.status, 200);
    expect('  total recalculated', cents(r.data.total), cents(p1.price) + cents(p2.price));
    r = await c.patch(`/api/cart/items/${itemId}`, { quantity: 0 });
    expect('PATCH quantity 0 -> 400', r.status, 400);
    r = await c.patch('/api/cart/items/abc', { quantity: 1 });
    expect('PATCH invalid item id -> 400', r.status, 400);
    r = await c.patch('/api/cart/items/99999', { quantity: 1 });
    expect('PATCH nonexistent item -> 404', r.status, 404);

    // ---- Remove ----
    r = await c.delete(`/api/cart/items/${item2Id}`);
    expect('DELETE item -> 200', r.status, 200);
    expect('  one item left', r.data.items.length, 1);
    r = await c.delete(`/api/cart/items/${item2Id}`);
    expect('DELETE the same item again -> 404', r.status, 404);

    // ---- Persistence across logout and login ----
    await c.post('/api/auth/logout');
    await c.post('/api/auth/login', { email, password: 'correct-horse-battery' });
    r = await c.get('/api/cart');
    expect('Cart persists after logout and login', r.data.items.length, 1);

    // ---- Stock rules (stock is changed temporarily) ----
    await knex('products').where({ id: STOCK_TEST_PRODUCT }).update({ stock: 2 });
    r = await c.post('/api/cart/items', { product_id: STOCK_TEST_PRODUCT, quantity: 3 });
    expect('Quantity above stock -> 409', r.status, 409);
    r = await c.post('/api/cart/items', { product_id: STOCK_TEST_PRODUCT, quantity: 2 });
    expect('Quantity equal to stock -> 201', r.status, 201);
    r = await c.post('/api/cart/items', { product_id: STOCK_TEST_PRODUCT, quantity: 1 });
    expect('Adding more than stock in total -> 409', r.status, 409);
    const stockItem = (await c.get('/api/cart')).data.items.find((i) => i.product_id === STOCK_TEST_PRODUCT);
    r = await c.patch(`/api/cart/items/${stockItem.id}`, { quantity: 3 });
    expect('PATCH above stock -> 409', r.status, 409);

    await knex('products').where({ id: STOCK_TEST_PRODUCT }).update({ stock: 0 });
    r = await c.post('/api/cart/items', { product_id: STOCK_TEST_PRODUCT, quantity: 1 });
    expect('Out-of-stock product -> 409', r.status, 409);
  } finally {
    // Restore the product and remove the test user (their cart is deleted with them)
    await knex('products').where({ id: STOCK_TEST_PRODUCT }).update({ stock: originalStock });
    await knex('users').where({ email }).del();
    await knex.destroy();
  }

  console.log(failures ? `\n${failures} check(s) FAILED.` : '\nAll checks passed.');
  process.exit(failures ? 1 : 0);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
