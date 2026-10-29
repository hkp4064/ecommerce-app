import { getProduct } from './api.js';
import { escapeHtml, formatPrice, IMAGE_FALLBACK } from './utils.js';

const detailEl = document.getElementById('product-detail');
const statusEl = document.getElementById('status');
const backLink = document.getElementById('back-link');

function showStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.hidden = !message;
}

function stockLabel(stock) {
  if (stock === 0) return '<span class="stock out">Out of stock</span>';
  if (stock <= 10) return `<span class="stock low">Only ${stock} left</span>`;
  return '<span class="stock in">In stock</span>';
}

function renderProduct(p) {
  document.title = `ShopEasy | ${p.name}`;
  detailEl.innerHTML = `
    <article class="detail">
      <img class="detail-image" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" />
      <div class="detail-info">
        <span class="badge">${escapeHtml(p.category)}</span>
        <h1>${escapeHtml(p.name)}</h1>
        <p class="detail-price">${formatPrice(p.price)}</p>
        <p>${stockLabel(p.stock)}</p>
        <h2 class="detail-subtitle">Description</h2>
        <p class="detail-desc">${escapeHtml(p.description)}</p>
      </div>
    </article>`;

  const img = detailEl.querySelector('.detail-image');
  img.addEventListener('error', () => {
    if (img.src !== IMAGE_FALLBACK) img.src = IMAGE_FALLBACK;
  });
}

async function init() {
  const id = new URLSearchParams(window.location.search).get('id');

  // "Back" returns to the listing with its search/filter/page preserved
  if (document.referrer.startsWith(window.location.origin) && history.length > 1) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      history.back();
    });
  }

  if (!id) {
    showStatus('No product selected.', 'error');
    return;
  }

  showStatus('Loading product...');
  try {
    const product = await getProduct(id);
    showStatus('');
    renderProduct(product);
  } catch (err) {
    showStatus(err.message, 'error');
  }
}

init();
