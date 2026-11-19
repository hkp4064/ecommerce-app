import { addToCart } from './api.js';
import { getCurrentUser, refreshCartCount } from './nav.js';
import { showToast } from './utils.js';

function goToLogin() {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `login.html?next=${next}`;
}

// Used by the listing page and the details page.
export async function addProductToCart(productId, button, quantity = 1) {
  if (!getCurrentUser()) {
    goToLogin();
    return;
  }

  const label = button.textContent;
  button.disabled = true;
  try {
    await addToCart(productId, quantity);
    showToast(quantity === 1 ? 'Added to cart' : `Added ${quantity} to cart`);
    button.textContent = 'Added ✓';
    refreshCartCount();
    setTimeout(() => {
      button.textContent = label;
      button.disabled = false;
    }, 1200);
  } catch (err) {
    button.disabled = false;
    if (err.status === 401) {
      goToLogin(); // session expired
      return;
    }
    showToast(err.message, 'error'); // for example "Only 2 of ... available"
  }
}
