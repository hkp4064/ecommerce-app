// Proves what the logs contain, and what they never contain.
require('dotenv').config({ quiet: true });
const { spawn } = require('child_process');
const path = require('path');
const knex = require('knex')(require('../knexfile'));
const { createClient } = require('./lib/client');

const PORT = 3999;
const BASE = `http://localhost:${PORT}`;
const PASSWORD = 'LogCheck-Pa55word-9X';
const WRONG_PASSWORD = 'WrongPassword-123';
const email = `logcheck${Date.now()}@example.com`;

let failures = 0;
function check(label, ok, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && detail ? `  (${detail})` : ''}`);
}

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, '..', 'backend', 'server.js')], {
      env: { ...process.env, PORT: String(PORT), LOG_LEVEL: 'info' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let ready = false;
    const timer = setTimeout(() => reject(new Error('Server did not start within 10 seconds')), 10000);
    const onData = (chunk) => {
      output += chunk.toString();
      if (!ready && output.includes('"msg":"Server started"')) {
        ready = true;
        clearTimeout(timer);
        resolve({ child, getOutput: () => output });
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', reject);
    child.on('close', (code) => {
      if (!ready) {
        clearTimeout(timer);
        reject(new Error(`Server exited with code ${code} before starting:\n${output}`));
      }
    });
  });
}

function stopServer(child) {
  return new Promise((resolve) => {
    child.on('close', resolve); // 'close' fires after all output has been read
    child.kill('SIGINT');
    setTimeout(() => child.kill('SIGKILL'), 5000).unref();
  });
}

// "ecom.sid=s%3A<sid>.<signature>" -> the raw value, the decoded value and the session id
function cookieSecrets(cookieHeader) {
  const raw = cookieHeader.split('=').slice(1).join('=');
  const decoded = decodeURIComponent(raw);
  const sid = decoded.replace(/^s:/, '').split('.')[0];
  return [raw, decoded, sid];
}

(async () => {
  const { child, getOutput } = await startServer();
  const cookies = [];

  try {
    const c = createClient(BASE);
    await c.post('/api/auth/register', { email, name: 'Log Check', password: PASSWORD });
    cookies.push(c.cookieHeader());
    await c.post('/api/cart/items', { product_id: 1, quantity: 2 });
    await c.get('/api/products/999'); // 404
    await c.post('/api/auth/logout');
    await c.post('/api/auth/login', { email, password: WRONG_PASSWORD }); // failed login
    await c.post('/api/auth/login', { email, password: PASSWORD });
    cookies.push(c.cookieHeader());
    await c.get('/api/auth/me');
    await createClient(BASE).get('/api/cart'); // 401, not logged in
    const res = await fetch(`${BASE}/api/health`, { headers: { 'X-Request-Id': 'demo-request-123' } });
    check('Client request ID is echoed in the X-Request-Id header', res.headers.get('x-request-id') === 'demo-request-123');
  } finally {
    await stopServer(child);
  }

  // ---------- Analyse the captured output ----------
  const output = getOutput();
  const lines = output.split('\n').filter((l) => l.trim());
  const logs = [];
  const notJson = [];
  for (const line of lines) {
    try {
      logs.push(JSON.parse(line));
    } catch {
      notJson.push(line);
    }
  }

  console.log(`\nCaptured ${lines.length} log lines.\n`);
  check('Every log line is valid JSON', notJson.length === 0, `first non-JSON line: ${notJson[0]}`);
  check('Every line has a timestamp and a level', logs.every((l) => l.time && l.level));

  const requests = logs.filter((l) => l.msg === 'request completed');
  check(`API requests are logged (${requests.length} found)`, requests.length >= 9);
  check(
    'Each request line has id, method, url, status and duration',
    requests.every(
      (l) => l.req && l.req.id && l.req.method && l.req.url && l.res && l.res.statusCode && typeof l.duration_ms === 'number'
    )
  );
  check('Request IDs are unique', new Set(requests.map((l) => l.req.id)).size === requests.length);
  check('The client-supplied request ID appears in the logs', requests.some((l) => l.req.id === 'demo-request-123'));

  const notFound = requests.find((l) => l.req.url === '/api/products/999');
  check('A 404 is logged at level "warn"', notFound && notFound.res.statusCode === 404 && notFound.level === 'warn');
  check('Authenticated requests carry the user id', requests.some((l) => l.userId));

  const events = new Set(logs.map((l) => l.event).filter(Boolean));
  for (const name of ['user_registered', 'login_success', 'auth_failure', 'logout', 'cart_item_added']) {
    check(`Event "${name}" was logged`, events.has(name));
  }

  // ---------- Secrets must never appear ----------
  const secrets = {
    'the password': [PASSWORD],
    'the wrong password': [WRONG_PASSWORD],
    'the raw email address': [email],
    'a password hash': ['$2a$', '$2b$'],
    'session cookies': cookies.flatMap(cookieSecrets),
  };
  for (const [label, values] of Object.entries(secrets)) {
    const leaked = values.some((v) => v && output.includes(v));
    check(`Logs do not contain ${label}`, !leaked);
  }

  // ---------- Samples for your screenshot ----------
  const sample = (pred) => logs.find(pred);
  console.log('\nSample: a failed login');
  console.log(JSON.stringify(sample((l) => l.event === 'auth_failure')));
  console.log('\nSample: a request line');
  console.log(JSON.stringify(sample((l) => l.msg === 'request completed' && l.userId)));

  await knex('users').where({ email }).del();
  await knex.destroy();

  console.log(failures ? `\n${failures} check(s) FAILED.` : '\nAll logging checks passed.');
  process.exit(failures ? 1 : 0);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
