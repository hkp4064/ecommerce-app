// Minimal HTTP client with a cookie jar, for demo and test scripts.
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function createClient(base = BASE_URL) {
  const jar = new Map(); // cookie name -> value

  async function request(method, path, body) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (jar.size) {
      headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    }

    let res;
    try {
      res = await fetch(base + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error(`Cannot reach ${base}. Is the server running?`);
    }

    for (const cookie of res.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      if (!value || /expires=thu, 01 jan 1970/i.test(cookie)) jar.delete(name);
      else jar.set(name, value);
    }

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data };
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body ?? {}),
    patch: (path, body) => request('PATCH', path, body ?? {}),
    delete: (path) => request('DELETE', path),
  };
}

module.exports = { createClient, BASE_URL };
