// Escape text before putting it into innerHTML (prevents XSS)
export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const priceFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatPrice(value) {
  return priceFormatter.format(value);
}

// Inline SVG shown when an image fails to load
export const IMAGE_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>" +
      "<rect width='100%' height='100%' fill='#e5e7eb'/>" +
      "<text x='50%' y='50%' fill='#6b7280' font-family='sans-serif' font-size='24' " +
      "text-anchor='middle' dominant-baseline='middle'>No image</text></svg>"
  );
  
// Must match MAX_QUANTITY in backend/validators/cart.validator.js.
// This is only a convenience for the UI; the server enforces the real limit.
export const MAX_QUANTITY_PER_PRODUCT = 10;

// Small pop-up message in the corner of the screen
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message; // textContent, so server messages can't inject HTML
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
