// One shared Supabase client for the browser.
// The publishable key is meant to be public: the database's row-level security
// decides what each visitor can read or change.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(url, key);

// "4000" -> "$40"
export function money(cents) {
  if (cents == null) return '';
  const dollars = cents / 100;
  return '$' + (Number.isInteger(dollars) ? dollars : dollars.toFixed(2));
}

// Order stages in the order the shop moves through them.
export const STAGES = [
  { id: 'booked', label: 'Booked' },
  { id: 'received', label: 'Received' },
  { id: 'inspected', label: 'Inspected' },
  { id: 'in_restoration', label: 'In restoration' },
  { id: 'ready_for_pickup', label: 'Ready for pickup' },
  { id: 'picked_up', label: 'Picked up' },
];

export function stageLabel(id) {
  const s = STAGES.find((x) => x.id === id);
  if (s) return s.label;
  if (id === 'cancelled') return 'Cancelled';
  if (id === 'paid') return 'Paid';
  return id;
}

// "Deep cleaning ×6 + Icing bottoms": one name per service, counted across pairs
export function serviceSummary(items) {
  const counts = new Map();
  items.forEach((i) => counts.set(i.name, (counts.get(i.name) || 0) + 1));
  return [...counts].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name)).join(' + ');
}
