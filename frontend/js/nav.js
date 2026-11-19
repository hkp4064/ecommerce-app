import { getMe, getCart, logout } from './api.js';
import { escapeHtml } from './utils.js';

let currentUser = null;

export const getCurrentUser = () => currentUser;

function render(nav) {
  if (currentUser) {
    nav.innerHTML = `
      <a href="/">Products</a>
      <a href="cart.html" class="nav-cart">Cart <span id="cart-count" class="cart-count" hidden>0</span></a>
      <span class="nav-user">Hi, ${escapeHtml(currentUser.name)}</span>
      <button type="button" id="logout-btn" class="btn btn-secondary btn-small">Logout</button>`;

    nav.querySelector('#logout-btn').addEventListener('click', async () => {
      try {
        await logout();
      } finally {
        window.location.href = '/';
      }
    });
  } else {
    // Send people back to the page they were on after logging in
    const onAuthPage = /\/(login|register)\.html$/.test(window.location.pathname);
    const next = onAuthPage
      ? ''
      : `?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    nav.innerHTML = `
      <a href="/">Products</a>
      <a href="login.html${next}">Login</a>
      <a href="register.html${next}" class="btn btn-small">Register</a>`;
  }
}

// Updates the number on the Cart link (call after the cart changes)
export async function refreshCartCount() {
  const badge = document.getElementById('cart-count');
  if (!badge || !currentUser) return;
  try {
    const cart = await getCart();
    badge.textContent = cart.item_count;
    badge.hidden = cart.item_count === 0;
  } catch {
    // The badge is optional
  }
}

// Call once per page. Resolves to the current user, or null if logged out.
export async function initNav() {
  const nav = document.getElementById('site-nav');
  try {
    currentUser = await getMe();
  } catch {
    currentUser = null;
  }
  if (nav) render(nav);
  refreshCartCount();
  return currentUser;
}
