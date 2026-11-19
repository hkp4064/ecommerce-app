// Exercises the auth API end to end. Start the server first (npm run dev).
const { createClient } = require('./lib/client');

let failures = 0;
function expect(label, actual, expected) {
  const pass = actual === expected;
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${pass ? '' : `  (got ${actual}, expected ${expected})`}`);
}

(async () => {
  const email = `smoke${Date.now()}@example.com`;
  const creds = { email, name: 'Smoke Test', password: 'correct-horse-battery' };
  const c = createClient();

  let r = await c.get('/api/auth/me');
  expect('GET /me without login -> 401', r.status, 401);

  r = await c.post('/api/auth/register', { ...creds, password: 'short' });
  expect('Register with a short password -> 400', r.status, 400);

  r = await c.post('/api/auth/register', creds);
  expect('Register new user -> 201', r.status, 201);
  expect('Response does not contain a password hash', JSON.stringify(r.data).includes('hash'), false);

  r = await createClient().post('/api/auth/register', creds);
  expect('Register same email again -> 409', r.status, 409);

  r = await c.get('/api/auth/me');
  expect('GET /me after register (logged in) -> 200', r.status, 200);
  expect('  /me returns the right email', r.data && r.data.user.email, email);

  r = await c.post('/api/auth/logout');
  expect('Logout -> 200', r.status, 200);

  r = await c.get('/api/auth/me');
  expect('GET /me after logout -> 401', r.status, 401);

  r = await c.post('/api/auth/login', { email, password: 'wrong-password' });
  expect('Login with wrong password -> 401', r.status, 401);
  const wrongPasswordMsg = r.data && r.data.error;

  r = await c.post('/api/auth/login', { email: 'nobody@example.com', password: 'whatever123' });
  expect('Login with unknown email -> 401', r.status, 401);
  expect('  same error message as wrong password', r.data && r.data.error, wrongPasswordMsg);

  r = await c.post('/api/auth/login', { email, password: creds.password });
  expect('Login with correct password -> 200', r.status, 200);

  r = await c.get('/api/auth/me');
  expect('GET /me after login -> 200', r.status, 200);

  console.log(failures ? `\n${failures} check(s) FAILED.` : '\nAll checks passed.');
  process.exit(failures ? 1 : 0);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
