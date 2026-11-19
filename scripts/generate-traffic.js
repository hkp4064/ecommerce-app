const BASE = process.argv[3] || 'http://localhost:3000';
const DURATION_MS = Number(process.argv[2] || 60) * 1000;
const EMAIL = 'traffic-demo@example.com';
const PASSWORD = 'DemoPass123!';

let cookie = '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// anon = true: send no cookie and ignore any cookie the response sets
async function call(method, path, body, anon = false) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(!anon && cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  if (!anon && setCookies.length) cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  return { status: res.status, data };
}

const asList = (d) => (Array.isArray(d) ? d : d?.products || d?.data || d?.items || []);
const cartItems = (d) => d?.items || d?.cart?.items || d?.data?.items || [];

async function main() {
  console.log(`Generating traffic against ${BASE} for ${DURATION_MS / 1000}s ...`);

  await call('POST', '/api/auth/register', { email: EMAIL, name: 'Traffic Demo', password: PASSWORD }, true);
  const login = await call('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD });
  if (login.status !== 200) {
    console.error('Login failed:', login.status, login.data);
    process.exit(1);
  }

  const productIds = asList((await call('GET', '/api/products')).data).map((p) => p.id).filter(Boolean);
  if (!productIds.length) {
    console.error('No products found. Run npm run db:setup first.');
    process.exit(1);
  }

  const randomItem = async () => {
    const items = cartItems((await call('GET', '/api/cart')).data);
    return items.length ? items[Math.floor(Math.random() * items.length)] : null;
  };

  const actions = [
    { w: 30, name: 'browse products', run: () => call('GET', '/api/products') },
    { w: 10, name: 'browse categories', run: () => call('GET', '/api/categories') },
    { w: 10, name: 'view cart', run: () => call('GET', '/api/cart') },
    {
      w: 10, name: 'add to cart',
      run: () => call('POST', '/api/cart/items', {
        productId: productIds[Math.floor(Math.random() * productIds.length)],
        quantity: 1,
      }),
    },
    {
      w: 6, name: 'update cart item',
      run: async () => {
        const item = await randomItem();
        return item ? call('PATCH', `/api/cart/items/${item.id}`, { quantity: 1 + Math.floor(Math.random() * 2) }) : null;
      },
    },
    {
      w: 5, name: 'remove cart item',
      run: async () => {
        const item = await randomItem();
        return item ? call('DELETE', `/api/cart/items/${item.id}`) : null;
      },
    },
    { w: 4, name: 'failed login', run: () => call('POST', '/api/auth/login', { email: EMAIL, password: 'WrongPass999!' }, true) },
    { w: 4, name: 'unknown product (404)', run: () => call('GET', '/api/products/999999') },
    { w: 3, name: 'unknown API path (404)', run: () => call('GET', '/api/does-not-exist') },
    { w: 3, name: 'slow request', debug: true, run: () => call('GET', '/api/debug/slow?ms=1500') },
    { w: 3, name: 'server error (500)', debug: true, run: () => call('GET', '/api/debug/fail') },
  ];

  let debugOn = true;
  const stats = {};
  const end = Date.now() + DURATION_MS;

  while (Date.now() < end) {
    const pool = actions.filter((a) => debugOn || !a.debug);
    let r = Math.random() * pool.reduce((s, a) => s + a.w, 0);
    const action = pool.find((a) => (r -= a.w) < 0) || pool[0];

    const result = await action.run();
    if (result) {
      const key = `${action.name} -> ${result.status}`;
      stats[key] = (stats[key] || 0) + 1;
      if (action.debug && result.status === 404) {
        debugOn = false;
        console.warn('Debug endpoints not found. Set ENABLE_FAILURE_DEMO=true and restart the app.');
      }
    }
    await sleep(100 + Math.random() * 300);
  }

  console.log('\nDone. Requests sent:');
  Object.entries(stats).sort().forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
