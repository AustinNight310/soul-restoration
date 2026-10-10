'use client';
// Pickups to make: today's confirmed times in order, then what's coming up, then requests that still
// need a time. Call, text or map the stop, and mark it collected when the pairs are in the bag.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase, serviceSummary } from '../../../../lib/supabase';
import { useStaff, sameDay, timeLabel, pickupLabel, phoneHref, pairCount } from '../staff-shared';
import s from '../../staff.module.css';

export default function Pickups() {
  const { userId } = useStaff();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('orders')
      .select('id, number, status, pickup_status, pickup_at, pickup_time, pickup_address, pickup_phone, pickup_evening, order_items(name), order_pairs!order_pairs_order_id_fkey(id)')
      .eq('handoff', 'pickup').in('pickup_status', ['requested', 'confirmed'])
      .not('status', 'in', '(picked_up,cancelled)')
      .order('pickup_at', { ascending: true, nullsFirst: false });
    if (error) setError('Couldn’t load pickups. Refresh to try again.');
    setOrders(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function collected(o) {
    setBusy(o.id);
    const status = o.status === 'booked' ? 'received' : o.status;
    const { error } = await supabase.from('orders').update({ pickup_status: 'collected', status }).eq('id', o.id);
    if (!error) await supabase.from('order_events').insert({ order_id: o.id, status, note: 'Collected on pickup', created_by: userId });
    setBusy(null);
    if (error) setError('Didn’t save. Try again.');
    load();
  }

  if (orders === null) return <p className="muted">Loading pickups…</p>;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const timed = orders.filter((o) => o.pickup_status === 'confirmed' && o.pickup_at);
  const groups = [
    { title: 'Missed', hint: 'Confirmed for an earlier day and not collected yet.', list: timed.filter((o) => new Date(o.pickup_at) < startOfToday) },
    { title: 'Today', list: timed.filter((o) => sameDay(new Date(o.pickup_at), now)) },
    { title: 'Coming up', list: timed.filter((o) => new Date(o.pickup_at) >= startOfToday && !sameDay(new Date(o.pickup_at), now)) },
    { title: 'Needs a time', hint: 'Text the customer, then set the time on the order.', list: orders.filter((o) => !(o.pickup_status === 'confirmed' && o.pickup_at)) },
  ];

  return (
    <>
      <div>
        <div className="eyebrow">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
        <h1 style={{ fontSize: 32 }}>Pickups</h1>
      </div>
      {error && <p className="error">{error}</p>}
      {orders.length === 0 && <p className="muted">No pickups waiting.</p>}
      {groups.filter((g) => g.list.length || g.title === 'Today').map((g) => (
        <section key={g.title} style={{ display: 'grid', gap: 10 }}>
          <h2 style={{ fontSize: 21 }}>{g.title} <span className="muted small" style={{ fontFamily: 'var(--mono)' }}>{g.list.length}</span></h2>
          {g.hint && <p className="muted small" style={{ margin: 0 }}>{g.hint}</p>}
          {g.title === 'Today' && g.list.length === 0 && <p className="muted small" style={{ margin: 0 }}>Nothing set for today.</p>}
          {g.list.map((o) => <Stop key={o.id} o={o} today={g.title === 'Today'} busy={busy === o.id} onCollected={() => collected(o)} />)}
        </section>
      ))}
    </>
  );
}

function Stop({ o, today, busy, onCollected }) {
  const n = pairCount(o);
  const tel = phoneHref('tel', o.pickup_phone);
  const sms = phoneHref('sms', o.pickup_phone, `Hi, it's Soul Sneakers. On my way for your pickup (order #${o.number}).`);
  const map = o.pickup_address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.pickup_address)}` : null;
  const timed = o.pickup_status === 'confirmed' && o.pickup_at;
  return (
    <div className={s.stop}>
      <span className={s.stopTime}>{timed ? (today ? timeLabel(o.pickup_at) : pickupLabel(o.pickup_at).replace(/, \d+:\d+.*$/, '')) : <span className="badge warn">Requested</span>}</span>
      <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
        <span><Link href={`/staff/order?id=${o.id}`} className={s.rowLink}>#{o.number}</Link> · {n} {n === 1 ? 'pair' : 'pairs'} · {serviceSummary(o.order_items)}</span>
        <span className="muted small" style={{ overflowWrap: 'anywhere' }}>{o.pickup_address}{o.pickup_evening ? ` · prefers ${o.pickup_evening}` : ''}{timed && !today ? ` · ${timeLabel(o.pickup_at)}` : ''}</span>
      </span>
      <span className={s.stopActions}>
        {tel && <a className="btn ghost small" href={tel}>Call</a>}
        {sms && <a className="btn ghost small" href={sms}>{timed ? 'Text “On my way”' : 'Text'}</a>}
        {map && <a className="btn ghost small" href={map} target="_blank" rel="noreferrer">Map</a>}
        {timed
          ? <button className="btn dark small" disabled={busy} onClick={onCollected}>{busy ? 'Saving…' : 'Mark collected'}</button>
          : <Link className="btn primary small" href={`/staff/order?id=${o.id}`}>Set time</Link>}
      </span>
    </div>
  );
}
