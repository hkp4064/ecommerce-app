import { getProducts, getCategories } from './api.js';
import { escapeHtml, formatPrice, IMAGE_FALLBACK } from './utils.js';

const PAGE_SIZE = 8;

const searchInput = document.getElementById('search-input');
const categorySelect = document.getElementById('category-select');
const clearBtn = document.getElementById('clear-btn');
const grid = document.getElementById('product-grid');
const statusEl = document.getElementById('status');
const resultInfo = document.getElementById('result-info');
const pagination = document.getElementById('pagination');

// Current filter state (initialised from the URL so links are shareable)
const params = new URLSearchParams(window.location.search);
const state = {
  search: params.get('search') || '',
  category: params.get('category') || '',
  page: Number(params.get('page')) || 1,
};

let latestRequest = 0; // ignore out-of-order responses

// ---------- Rendering ----------

function productCard(p) {
  const outOfStock = p.stock === 0;
  return `
    <article class="card">
      <a href="product.html?id=${p.id}" class="card-link">
        <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy" />
        <div class="card-body">
          <span class="badge">${escapeHtml(p.category)}</span>
          <h2 class="card-title">${escapeHtml(p.name)}</h2>
          <p class="card-desc">${escapeHtml(p.description)}</p>
          <div class="card-footer">
            <span class="price">${formatPrice(p.price)}</span>
            ${outOfStock ? '<span class="stock out">Out of stock</span>' : ''}
          </div>
        </div>
      </a>
    </article>`;
}

function renderPagination({ page, totalPages }) {
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  pagination.innerHTML = `
    <button class="btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Previous</button>
    <span>Page ${page} of ${totalPages}</span>
    <button class="btn" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>Next</button>`;
}

function showStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.hidden = !message;
}

// ---------- Data loading ----------

async function loadProducts() {
  const requestId = ++latestRequest;
  showStatus('Loading products...');
  grid.innerHTML = '';
  pagination.innerHTML = '';
  resultInfo.textContent = '';

  try {
    const { data, pagination: pg } = await getProducts({
      search: state.search,
      category: state.category,
      page: state.page,
      limit: PAGE_SIZE,
    });
    if (requestId !== latestRequest) return; // a newer request replaced this one

    if (data.length === 0) {
      showStatus('No products found. Try a different search or category.');
      return;
    }

    showStatus('');
    grid.innerHTML = data.map(productCard).join('');
    resultInfo.textContent = `${pg.total} product${pg.total === 1 ? '' : 's'} found`;
    renderPagination(pg);
  } catch (err) {
    if (requestId !== latestRequest) return;
    showStatus(err.message, 'error');
  }
}

async function loadCategories() {
  try {
    const categories = await getCategories();
    categorySelect.insertAdjacentHTML(
      'beforeend',
      categories
        .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
        .join('')
    );
    categorySelect.value = state.category; // restore selection from the URL
  } catch {
    // The filter is optional: listing still works without it
  }
}

// ---------- State and URL sync ----------

function syncUrl() {
  const q = new URLSearchParams();
  if (state.search) q.set('search', state.search);
  if (state.category) q.set('category', state.category);
  if (state.page > 1) q.set('page', state.page);
  const qs = q.toString();
  history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

function update() {
  syncUrl();
  loadProducts();
}

// ---------- Events ----------

let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.search = searchInput.value.trim();
    state.page = 1;
    update();
  }, 300); // debounce: wait until the user stops typing
});

categorySelect.addEventListener('change', () => {
  state.category = categorySelect.value;
  state.page = 1;
  update();
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  categorySelect.value = '';
  state.search = '';
  state.category = '';
  state.page = 1;
  update();
});

pagination.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-page]');
  if (!btn || btn.disabled) return;
  state.page = Number(btn.dataset.page);
  update();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Broken image -> fallback (error events don't bubble, so use capture)
grid.addEventListener(
  'error',
  (e) => {
    if (e.target.tagName === 'IMG' && e.target.src !== IMAGE_FALLBACK) {
      e.target.src = IMAGE_FALLBACK;
    }
  },
  true
);

// ---------- Init ----------

searchInput.value = state.search;
loadCategories();
loadProducts();
