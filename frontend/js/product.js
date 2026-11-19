import { getProduct } from './api.js';
import { initNav } from './nav.js';
import { addProductToCart } from './add-to-cart.js';
import {
  escapeHtml,
  formatPrice,
  showToast,
  IMAGE_FALLBACK,
  MAX_QUANTITY_PER_PRODUCT,
} from './utils.js';

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

function actionsHtml(p) {
  if (p.stock === 0) {
    return '<div class="detail-actions"><button class="btn" disabled>Out of stock</button></div>';
  }
  const max = Math.min(p.stock, MAX_QUANTITY_PER_PRODUCT);
  return `
    <div class="detail-actions">
      <label for="qty">Quantity</label>
      <input type="number" id="qty" min="1" max="${max}" value="1" />
      <button type="button" id="add-btn" class="btn">Add to cart</button>
    </div>`;
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
        ${actionsHtml(p)}
      </div>
    </article>`;

  const img = detailEl.querySelector('.detail-image');
  img.addEventListener('error', () => {
    if (img.src !== IMAGE_FALLBACK) img.src = IMAGE_FALLBACK;
  });

  const addBtn = detailEl.querySelector('#add-btn');
  if (addBtn) {
    const qtyInput = detailEl.querySelector('#qty');
    addBtn.addEventListener('click', () => {
      const quantity = Number(qtyInput.value);
      const max = Number(qtyInput.max);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > max) {
        showToast(`Please choose a quantity between 1 and ${max}.`, 'error');
        return;
      }
      addProductToCart(p.id, addBtn, quantity);
    });
  }
}

async function init() {
  initNav();
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
