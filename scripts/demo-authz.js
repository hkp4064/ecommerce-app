// Demonstrates that one user cannot read or change another user's cart.
// Start the server first (npm run dev).
require('dotenv').config();
const knex = require('knex')(require('../knexfile'));
const { createClient, BASE_URL } = require('./lib/client');

const COOKIE_NAME = 'ecom.sid';
let failures = 0;

const short = (v) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > 95 ? s.slice(0, 95) + '...' : s;
};

function report(title, pass, detail) {
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${title}`);
  if (detail) console.log(`        ${detail}`);
}

// Runs a request and checks the HTTP status
async function attempt(title, request, expectedStatus) {
  const r = await request;
  report(title, r.status === expectedStatus, `HTTP ${r.status}  ${short(r.data)}`);
  return r;
}

// A request with a hand-made Cookie header (what an attacker could do)
async function rawGet(path, cookie) {
  const res = await fetch(BASE_URL + path, { headers: { Cookie: cookie } });
  let data = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  return { status: res.status, data };
}

(async () => {
  const stamp = Date.now();
  const aliceCreds = { email: `alice${stamp}@example.com`, name: 'Alice', password: 'alice-password-123' };
  const bobCreds = { email: `bob${stamp}@example.com`, name: 'Bob', password: 'bob-password-12345' };
  const alice = createClient();
  const bob = createClient();

  try {
    // ---------------- Setup ----------------
    console.log('== Setup: two users, each with their own cart ==');
    await alice.post('/api/auth/register', aliceCreds);
    await bob.post('/api/auth/register', bobCreds);

    await alice.post('/api/cart/items', { product_id: 1, quantity: 2 });
    await alice.post('/api/cart/items', { product_id: 5, quantity: 1 });
    await bob.post('/api/cart/items', { product_id: 3, quantity: 1 });

    const aliceBefore = (await alice.get('/api/cart')).data;
    const aliceItemId = aliceBefore.items[0].id;
    const aliceId = (await alice.get('/api/auth/me')).data.user.id;
    const aliceCartId = (await knex('carts').where({ user_id: aliceId }).first()).id;

    console.log(`Alice (user ${aliceId}, cart ${aliceCartId}): ${aliceBefore.items.length} items, total ${aliceBefore.total}`);
    console.log(`Alice's first cart item has id ${aliceItemId}\n`);

    // ---------------- Attacks by Bob ----------------
    console.log("== Bob (logged in) tries to reach Alice's cart ==");

    let r = await attempt('Bob GET /api/cart returns only HIS cart', bob.get('/api/cart'), 200);
    report('  ...and none of Alice\'s items are in it', r.data.items.length === 1 && r.data.items[0].product_id === 3);

    r = await attempt(
      `Bob GET /api/cart?user_id=${aliceId}&cart_id=${aliceCartId} (IDs in the query are ignored)`,
      bob.get(`/api/cart?user_id=${aliceId}&cart_id=${aliceCartId}`),
      200
    );
    report('  ...still only Bob\'s own cart', r.data.items.length === 1 && r.data.items[0].product_id === 3);

    await attempt(`Bob GET /api/cart/${aliceCartId} (no route exists to read a cart by id)`, bob.get(`/api/cart/${aliceCartId}`), 404);

    await attempt(
      `Bob PATCH /api/cart/items/${aliceItemId} {quantity: 9} (change Alice's item)`,
      bob.patch(`/api/cart/items/${aliceItemId}`, { quantity: 9 }),
      404
    );

    await attempt(
      `Bob DELETE /api/cart/items/${aliceItemId} (delete Alice's item)`,
      bob.delete(`/api/cart/items/${aliceItemId}`),
      404
    );

    await attempt(
      `Bob POST /api/cart/items with "user_id": ${aliceId} (add into Alice's cart)`,
      bob.post('/api/cart/items', { product_id: 2, quantity: 1, user_id: aliceId }),
      400
    );

    await attempt(
      `Bob POST /api/cart/items with "cart_id": ${aliceCartId}`,
      bob.post('/api/cart/items', { product_id: 2, quantity: 1, cart_id: aliceCartId }),
      400
    );

    // ---------------- Not logged in / forged sessions ----------------
    console.log('\n== Without a valid session ==');

    await attempt('Anonymous GET /api/cart', createClient().get('/api/cart'), 401);
    await attempt(
      `Anonymous PATCH /api/cart/items/${aliceItemId}`,
      createClient().patch(`/api/cart/items/${aliceItemId}`, { quantity: 9 }),
      401
    );

    r = await rawGet('/api/cart', `${COOKIE_NAME}=s%3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA.forgedsignature`);
    report('Forged session cookie GET /api/cart', r.status === 401, `HTTP ${r.status}  ${short(r.data)}`);

    // Even Alice's real session ID is useless without the server's signature
    const sessionRows = await knex('sessions').select('sid', 'sess');
    const aliceSession = sessionRows.find((s) => {
      try {
        const sess = typeof s.sess === 'string' ? JSON.parse(s.sess) : s.sess;
        return sess.userId === aliceId;
      } catch {
        return false;
      }
    });
    if (aliceSession) {
      r = await rawGet('/api/cart', `${COOKIE_NAME}=${aliceSession.sid}`);
      report("Alice's real session ID sent unsigned", r.status === 401, `HTTP ${r.status}  ${short(r.data)}`);
    } else {
      console.log("SKIP  Alice's session row not found (not required)");
    }

    // ---------------- Alice's data is untouched ----------------
    console.log("\n== Alice's cart after all of Bob's attempts ==");
    const aliceAfter = (await alice.get('/api/cart')).data;
    const sig = (cart) => JSON.stringify(cart.items.map((i) => [i.id, i.product_id, i.quantity]));
    report(
      `Alice's cart is unchanged (${aliceAfter.items.length} items, total ${aliceAfter.total})`,
      sig(aliceAfter) === sig(aliceBefore) && aliceAfter.total === aliceBefore.total
    );

    console.log('\nDatabase view: every cart item belongs to exactly one cart and user');
    console.table(
      await knex('cart_items')
        .join('carts', 'cart_items.cart_id', 'carts.id')
        .join('users', 'carts.user_id', 'users.id')
        .whereIn('users.email', [aliceCreds.email, bobCreds.email])
        .select(
          'users.name as user',
          'carts.id as cart_id',
          'cart_items.id as item_id',
          'cart_items.product_id',
          'cart_items.quantity'
        )
        .orderBy('cart_items.id')
    );

    // ---------------- Session replay after logout ----------------
    console.log('== Session replay ==');
    const oldCookie = alice.cookieHeader();
    await alice.post('/api/auth/logout');
    r = await rawGet('/api/cart', oldCookie);
    report("Alice's old cookie replayed after she logged out", r.status === 401, `HTTP ${r.status}  ${short(r.data)}`);
  } finally {
    await knex('users').whereIn('email', [aliceCreds.email, bobCreds.email]).del();
    await knex.destroy();
  }

  console.log(failures ? `\n${failures} check(s) FAILED.` : '\nAll authorization checks passed.');
  process.exit(failures ? 1 : 0);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
