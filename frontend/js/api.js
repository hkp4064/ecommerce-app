// All communication with the backend goes through here.
// The session cookie is sent automatically by the browser (same origin).

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, { params, body } = {}) {
  const url = new URL(path, window.location.origin);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  const options = { method, headers: {}, credentials: 'same-origin' };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new ApiError('Cannot reach the server. Is it running?', 0);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // non-JSON response, handled below
  }

  if (!response.ok) {
    throw new ApiError((data && data.error) || `Request failed (${response.status})`, response.status);
  }
  return data;
}

// ---- Products ----
export const getProducts = ({ search, category, page, limit } = {}) =>
  request('GET', '/api/products', { params: { search, category, page, limit } });

export const getProduct = (id) => request('GET', `/api/products/${encodeURIComponent(id)}`);

export const getCategories = () => request('GET', '/api/categories');

// ---- Authentication ----
export const register = ({ email, name, password }) =>
  request('POST', '/api/auth/register', { body: { email, name, password } });

export const login = ({ email, password }) =>
  request('POST', '/api/auth/login', { body: { email, password } });

export const logout = () => request('POST', '/api/auth/logout', { body: {} });

// Returns the current user, or null when nobody is logged in
export async function getMe() {
  try {
    const data = await request('GET', '/api/auth/me');
    return data.user;
  } catch (err) {
    if (err.status === 401) return null;
    throw err;
  }
}

// ---- Cart (used in Module 7) ----
export const getCart = () => request('GET', '/api/cart');

export const addToCart = (productId, quantity = 1) =>
  request('POST', '/api/cart/items', { body: { product_id: productId, quantity } });

export const updateCartItem = (itemId, quantity) =>
  request('PATCH', `/api/cart/items/${itemId}`, { body: { quantity } });

export const removeCartItem = (itemId) => request('DELETE', `/api/cart/items/${itemId}`);