import { getCart, updateCartItem, removeCartItem } from './api.js';
import { initNav, refreshCartCount } from './nav.js';
import {
  escapeHtml,
  formatPrice,
  showToast,
  IMAGE_FALLBACK,
  MAX_QUANTITY_PER_PRODUCT,
} from './utils.js';

const content = document.getElementById('cart-content');
const statusEl = document.getElementById('status');

let cart = null;
let busy = false; // blocks clicks while a request is in progress

function showStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.hidden = !message;
}

function goToLogin() {
  window.location.replace(`login.html?next=${encodeURIComponent('/cart.html')}`);
}

function itemRow(item) {
  const name = escapeHtml(item.name);
  const maxQty = Math.min(item.stock, MAX_QUANTITY_PER_PRODUCT);
  const overStock = item.quantity > item.stock;
  // If stock dropped below what's in the cart, "-" jumps straight to the available amount
  const decreaseTarget = Math.min(item.quantity - 1, item.stock);

  return `
    <li class="cart-item" data-id="${item.id}">
      <img src="${escapeHtml(item.image_url)}" alt="${name}" />
      <div class="cart-item-info">
        <a href="product.html?id=${item.product_id}" class="cart-item-name">${name}</a>
        <div class="muted">${formatPrice(item.unit_price)} each</div>
        ${
          overStock
            ? `<div class="stock out">Only ${item.stock} in stock. Please reduce the quantity.</div>`
            : ''
        }
      </div>
      <div class="qty-controls">
        <button type="button" class="btn btn-secondary btn-small" data-action="decrease"
          aria-label="Decrease quantity of ${name}" ${decreaseTarget < 1 ? 'disabled' : ''}>&minus;</button>
        <span class="qty-value">${item.quantity}</span>
        <button type="button" class="btn btn-secondary btn-small" data-action="increase"
          aria-label="Increase quantity of ${name}" ${item.quantity >= maxQty ? 'disabled' : ''}>+</button>
      </div>
      <div class="cart-item-total">${formatPrice(item.line_total)}</div>
      <button type="button" class="btn-link" data-action="remove"
        aria-label="Remove ${name} from cart">Remove</button>
    </li>`;
}

function render() {
  if (!cart || cart.items.length === 0) {
    content.innerHTML = `
      <div class="empty-cart">
        <p>Your cart is empty.</p>
        <a href="/" class="btn">Browse products</a>
      </div>`;
    return;
  }

  content.innerHTML = `
    <div class="cart-layout">
      <ul class="cart-list">${cart.items.map(itemRow).join('')}</ul>
      <aside class="cart-summary">
        <h2>Order summary</h2>
        <div class="summary-row"><span>Items</span><span>${cart.item_count}</span></div>
        <div class="summary-row total"><span>Total</span><span>${formatPrice(cart.total)}</span></div>
        <p class="summary-note">Prices and totals are calculated by the server.</p>
      </aside>
    </div>`;
}

// Runs a cart request, then re-renders from the server's response
async function mutate(request) {
  busy = true;
  content.classList.add('busy');
  try {
    cart = await request();
  } catch (err) {
    if (err.status === 401) {
      goToLogin();
      return;
    }
    showToast(err.message, 'error');
    try {
      cart = await getCart(); // show the real state after a rejected change
    } catch {
      // keep the old view
    }
  } finally {
    busy = false;
    content.classList.remove('busy');
  }
  render();
  refreshCartCount();
}

content.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn || btn.disabled || busy) return;

  const row = btn.closest('.cart-item');
  const item = cart.items.find((i) => i.id === Number(row.dataset.id));
  if (!item) return;

  switch (btn.dataset.action) {
    case 'increase':
      mutate(() => updateCartItem(item.id, item.quantity + 1));
      break;
    case 'decrease':
      mutate(() => updateCartItem(item.id, Math.min(item.quantity - 1, item.stock)));
      break;
    case 'remove':
      mutate(() => removeCartItem(item.id));
      break;
  }
});

// Broken image -> fallback (error events don't bubble, so use capture)
content.addEventListener(
  'error',
  (e) => {
    if (e.target.tagName === 'IMG' && e.target.src !== IMAGE_FALLBACK) {
      e.target.src = IMAGE_FALLBACK;
    }
  },
  true
);

async function init() {
  const user = await initNav();
  if (!user) {
    goToLogin();
    return;
  }
  showStatus('Loading your cart...');
  try {
    cart = await getCart();
    showStatus('');
    render();
  } catch (err) {
    showStatus(err.message, 'error');
  }
}

init();
