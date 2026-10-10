'use client';
// What every staff page shares: who's signed in, the team (for names and assigning), and small helpers.
import { createContext, useContext } from 'react';
import Link from 'next/link';

export const StaffContext = createContext(null);
export const useStaff = () => useContext(StaffContext);

// Everything the board, search and order pages need about an order.
export const ORDER_SELECT = '*, order_items(name, price_cents, needs_quote, pair_id), '
  + 'order_pairs!order_pairs_order_id_fkey(id, position, shoe_model, shoe_size, shoe_color, notes, station_id, station_state, station_at, station_by, next_station_id, hold_note, spot), '
  + 'order_events(status, note, created_at, created_by), order_photos(id, kind)';

export const OPEN_FILTER = '(picked_up,cancelled)';

// Admin pages: a worker who follows a link here sees this instead of the page.
export function AdminOnly({ children }) {
  const { isAdmin } = useStaff();
  if (isAdmin) return children;
  return (
    <div className="soft" style={{ display: 'grid', gap: 10 }}>
      <strong>Admins only.</strong>
      <span className="muted small">Ask an admin if something here needs changing.</span>
      <Link href="/staff" className="btn ghost small" style={{ justifySelf: 'start' }}>Back to the board</Link>
    </div>
  );
}

export function firstName(person) {
  if (!person) return '';
  return (person.full_name || person.email || '').split(/[\s@]/)[0];
}

// Shoe names for an order, whether it was booked pair by pair or as one pair.
export function shoes(order) {
  const pairs = [...(order.order_pairs || [])].sort((a, b) => a.position - b.position);
  return pairs.length ? pairs.map((p) => p.shoe_model).filter(Boolean).join(' · ') : order.shoe_model || '';
}
export function pairCount(order) {
  return order.order_pairs?.length || 1;
}

// "Tue, Oct 14, 6:30 PM" — the friendly text customers see for a confirmed pickup.
export function pickupLabel(at) {
  return new Date(at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
export function timeLabel(at) {
  return new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Phone numbers as tel:/sms: links (digits only, keeps a leading +).
export function phoneHref(kind, phone, body) {
  const n = (phone || '').replace(/(?!^\+)[^\d]/g, '');
  if (!n) return null;
  return `${kind}:${n}${body ? `?&body=${encodeURIComponent(body)}` : ''}`;
}
