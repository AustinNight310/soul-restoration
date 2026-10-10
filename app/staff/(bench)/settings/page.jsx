'use client';
// Settings & activity (admins): the shop's address, hours and phone (shown to booked customers), and one
// feed of what everyone did: order stages, cancels and pickups, plus menu, team and settings changes.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase, stageLabel } from '../../../../lib/supabase';
import { AdminOnly, useStaff, firstName } from '../staff-shared';
import s from '../../staff.module.css';

const FILTERS = [
  { id: 'all', label: 'Everything' },
  { id: 'orders', label: 'Orders', test: (e) => e.type === 'order' },
  { id: 'cancels', label: 'Cancels', test: (e) => e.type === 'order' && e.status === 'cancelled' },
  { id: 'menu', label: 'Prices', test: (e) => e.kind === 'menu' },
  { id: 'team', label: 'Team', test: (e) => e.kind === 'team' },
  { id: 'settings', label: 'Settings', test: (e) => e.kind === 'settings' },
];

export default function SettingsPage() {
  return <AdminOnly><Settings /><Activity /></AdminOnly>;
}

function Settings() {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    supabase.rpc('get_shop_settings').then(({ data, error }) => {
      if (error) return setMsg({ error: 'Couldn’t load the settings.' });
      setForm({ address: data.shop_address || '', hours: data.shop_hours || '', phone: data.shop_phone || '' });
    });
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('set_shop_settings', { p_address: form.address, p_hours: form.hours, p_phone: form.phone });
    setBusy(false);
    setMsg(error ? { error: error.message } : { ok: 'Saved. New bookings and tracking pages show this now.' });
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <>
      <div><div className="eyebrow">Admin</div><h1 style={{ fontSize: 32 }}>Settings &amp; activity</h1></div>
      {!form ? <p className="muted">{msg?.error || 'Loading…'}</p> : (
        <form className="card" onSubmit={save} style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
          <strong>Shop</strong>
          <label className="field">Drop-off address <span className="muted" style={{ fontWeight: 400 }}>(only shown to customers who booked a drop-off, or who track with the right number and email)</span>
            <input className="input" value={form.address} onChange={set('address')} required />
          </label>
          <label className="field">Drop-off hours<input className="input" value={form.hours} onChange={set('hours')} required /></label>
          <label className="field">Text line<input className="input" type="tel" value={form.phone} onChange={set('phone')} required /></label>
          {msg?.error && <p className="error" role="alert">{msg.error}</p>}
          {msg?.ok && <p className="notice" role="status">{msg.ok}</p>}
          <button className="btn primary" disabled={busy} style={{ justifySelf: 'start' }}>{busy ? 'Saving…' : 'Save settings'}</button>
        </form>
      )}
    </>
  );
}

function Activity() {
  const { person } = useStaff();
  const [limit, setLimit] = useState(60);
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    const [ev, log] = await Promise.all([
      supabase.from('order_events').select('status, note, created_at, created_by, order_id, orders(number)').order('created_at', { ascending: false }).limit(limit),
      supabase.from('activity_log').select('at, actor, kind, summary').order('at', { ascending: false }).limit(limit),
    ]);
    const list = [
      ...(ev.data || []).map((e) => ({ type: 'order', at: e.created_at, who: e.created_by, status: e.status, note: e.note, orderId: e.order_id, number: e.orders?.number })),
      ...(log.data || []).map((l) => ({ type: 'log', at: l.at, who: l.actor, kind: l.kind, summary: l.summary })),
    ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
    setItems(list);
  }, [limit]);
  useEffect(() => { load(); }, [load]);

  const test = FILTERS.find((f) => f.id === filter).test;
  const shown = (items || []).filter((e) => !test || test(e));
  const when = (at) => new Date(at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <section className="card" style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <strong>Activity</strong>
        <div className="pills">{FILTERS.map((f) => <button key={f.id} className="pill" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>)}</div>
      </div>
      {items === null ? <p className="muted small">Loading…</p> : shown.length === 0 ? <p className="muted small">Nothing here yet.</p> : (
        <div className={s.events}>
          {shown.map((e, i) => (
            <div key={i} className={s.event} style={{ gridTemplateColumns: '120px 80px minmax(0,1fr)' }}>
              <span className="muted" style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{when(e.at)}</span>
              <strong>{e.who ? firstName(person(e.who)) || 'Staff' : e.type === 'order' ? 'Customer' : 'Setup'}</strong>
              {e.type === 'order'
                ? <span>{e.status === 'cancelled' ? <span className="badge grey">Cancelled</span> : stageLabel(e.status)} · <Link href={`/staff/order?id=${e.orderId}`}>#{e.number}</Link>{e.note ? ` · ${e.note}` : ''}</span>
                : <span>{e.summary}</span>}
            </div>
          ))}
        </div>
      )}
      {items && items.length >= limit && <button className="btn ghost small" style={{ justifySelf: 'start' }} onClick={() => setLimit(limit + 60)}>Show older</button>}
    </section>
  );
}
