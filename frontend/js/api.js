// All communication with the backend goes through here.
async function request(path, params = {}) {
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Cannot reach the server. Is it running?');
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // non-JSON response, handled below
  }

  if (!response.ok) {
    throw new Error((body && body.error) || `Request failed (${response.status})`);
  }
  return body;
}

export function getProducts({ search, category, page, limit } = {}) {
  return request('/api/products', { search, category, page, limit });
}

export function getProduct(id) {
  return request(`/api/products/${encodeURIComponent(id)}`);
}

export function getCategories() {
  return request('/api/categories');
}
