// Calendar helpers: turn open orders into pickups, deliveries and due dates, and do the date maths.
import { supabase } from '../../../../lib/supabase';
import { pickupLabel } from '../staff-shared';

export const CAL_SELECT = 'id, number, status, handoff, email, assigned_to, total_cents, '
  + 'pickup_status, pickup_at, pickup_address, pickup_phone, pickup_evening, '
  + 'return_method, return_status, return_at, return_address, return_phone, return_evening, return_fee_cents, due_at, '
  + 'order_items(name), order_pairs!order_pairs_order_id_fkey(id)';

// The week view's time grid, and the slots offered in Change time.
export const GRID_START = 12;   // noon
export const GRID_END = 22;     // 10 PM
export const HOUR_PX = 48;
export const SLOT_START = 15;   // 3 PM
export const SLOT_END = 21;     // last slot 8:30 PM
export const KINDS = {
  pickup: { label: 'Pickups', one: 'Collect', color: 'var(--accent)' },
  return: { label: 'Deliveries', one: 'Deliver', color: 'var(--ok)' },
  due: { label: 'Due', one: 'Due', color: 'var(--warn)' },
};
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const startOfWeek = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7)); // Monday
export const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
export const timeText = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
export const dayText = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// One list of calendar items from the open orders. Items without a time yet have at: null.
export function buildEvents(orders) {
  const today = startOfDay(new Date());
  const out = [];
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    if (o.handoff === 'pickup' && ['requested', 'confirmed'].includes(o.pickup_status)) {
      out.push({ id: `pickup-${o.id}`, kind: 'pickup', order: o, at: o.pickup_status === 'confirmed' && o.pickup_at ? new Date(o.pickup_at) : null,
        address: o.pickup_address, phone: o.pickup_phone, evening: o.pickup_evening });
    }
    if (o.return_method === 'delivery' && ['requested', 'confirmed'].includes(o.return_status)) {
      out.push({ id: `return-${o.id}`, kind: 'return', order: o, at: o.return_status === 'confirmed' && o.return_at ? new Date(o.return_at) : null,
        address: o.return_address, phone: o.return_phone, evening: o.return_evening });
    }
    if (o.due_at && !['picked_up'].includes(o.status) && o.return_status !== 'delivered') {
      const at = new Date(o.due_at);
      out.push({ id: `due-${o.id}`, kind: 'due', order: o, at, late: at < today && o.status !== 'ready_for_pickup' });
    }
  }
  return out;
}

export function pairs(o) { return o.order_pairs?.length || 1; }

// Save a new time for a pickup or a delivery, and note it in the order's history.
export async function saveTime(event, at, userId) {
  const label = pickupLabel(at.toISOString());
  const o = event.order;
  const fields = event.kind === 'pickup'
    ? { pickup_at: at.toISOString(), pickup_time: label, pickup_status: 'confirmed' }
    : { return_at: at.toISOString(), return_time: label, return_status: 'confirmed' };
  const { error } = await supabase.from('orders').update(fields).eq('id', o.id);
  if (error) return error;
  const was = event.at ? 'moved' : 'set';
  await supabase.from('order_events').insert({
    order_id: o.id, status: o.status, created_by: userId,
    note: event.kind === 'pickup' ? `Pickup ${was} for ${label}` : `Delivery ${was} for ${label}`,
  });
  return null;
}

export function textBody(event, at) {
  const when = pickupLabel(at.toISOString());
  return event.kind === 'pickup'
    ? `Hi, it's Soul Sneakers. Your pickup for order #${event.order.number} is ${when}. Reply if that doesn't work.`
    : `Hi, it's Soul Sneakers. We'll deliver order #${event.order.number} ${when}. Reply if that doesn't work.`;
}
