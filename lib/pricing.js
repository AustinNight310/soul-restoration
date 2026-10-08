// Display-only price math for the booking page. The database works out the real total
// the same way (public.deep_clean_discount + create_booking), so keep the two in step.

export const DEEP_CLEAN = 'deep_clean';
export const MAX_PAIRS = 10; // more than this is a hefty job, priced by quote

export function label(service) {
  return service.short_name || service.name;
}

// Savings from deep clean bundles for this many deep cleans: biggest bundles first,
// and a bundle only counts when it beats the same number of single cleans.
export function deepCleanDiscount(count, services) {
  const single = services.find((s) => s.id === DEEP_CLEAN)?.price_cents;
  if (!single) return 0;
  const bundles = services
    .filter((s) => s.kind === 'bundle' && s.price_cents != null && s.pairs > 1)
    .sort((a, b) => b.pairs - a.pairs);
  let left = count;
  let discount = 0;
  for (const b of bundles) {
    if (b.price_cents < b.pairs * single) {
      discount += Math.floor(left / b.pairs) * (b.pairs * single - b.price_cents);
      left %= b.pairs;
    }
  }
  return discount;
}

// pairs: [{ services: [id, ...] }]
export function priceOrder(pairs, services) {
  const byId = Object.fromEntries(services.map((s) => [s.id, s]));
  const counts = {};
  const pairTotals = pairs.map((p) => p.services.reduce((sum, id) => {
    counts[id] = (counts[id] || 0) + 1;
    const s = byId[id];
    return sum + (s && s.kind !== 'quote' ? s.price_cents || 0 : 0);
  }, 0));

  const lines = services
    .filter((s) => counts[s.id] && s.kind !== 'quote')
    .map((s) => ({ id: s.id, name: label(s), count: counts[s.id], cents: counts[s.id] * (s.price_cents || 0) }));
  const quoted = services
    .filter((s) => counts[s.id] && s.kind === 'quote')
    .map((s) => ({ id: s.id, name: label(s), count: counts[s.id] }));
  const subtotal = lines.reduce((sum, l) => sum + l.cents, 0);
  const deepCount = counts[DEEP_CLEAN] || 0;
  const discount = deepCleanDiscount(deepCount, services);

  return { lines, quoted, pairTotals, subtotal, deepCount, discount, total: subtotal - discount };
}
