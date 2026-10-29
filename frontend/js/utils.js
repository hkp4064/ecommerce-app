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
  