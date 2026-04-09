export function formatPrice(price) {
  if (price === null || price === undefined || price === '') return '0';
  const num = typeof price === 'string' ? price.replace(/[^\d]/g, '') : String(price);
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function parsePrice(formattedPrice) {
  if (!formattedPrice) return 0;
  return parseInt(String(formattedPrice).replace(/[^\d]/g, ''), 10) || 0;
}
