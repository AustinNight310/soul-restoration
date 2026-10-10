'use client';
// Every order, open or done: find one by number, email, phone, shoe or service and open its full history.
// Loads the most recent orders once and filters as you type; plenty for one shop.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, money, stageLabel, serviceSummary } from '../../../../lib/supabase';
import { shoes, pairCount } from '../staff-shared';
import s from '../../staff.module.css';

const LIMIT = 1000;
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open', test: (o) => !['picked_up', 'cancelled'].includes(o.status) },
  { id: 'done', label: 'Picked up', test: (o) => o.status === 'picked_up' },
  { id: 'cancelled', label: 'Cancelled', test: (o) => o.status === 'cancelled' },
  { id: 'recent', label: 'Last 30 days', test: (o) => Date.now() - new Date(o.created_at) < 30 * 864e5 },
];

export default function Search() {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get('q') || '');
  const [filter, setFilter] = useState('all');
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('orders')
      .select('id, number, email, pickup_phone, shoe_model, status, total_cents, created_at, order_items(name), order_pairs!order_pairs_order_id_fkey(shoe_model, position)')
      .order('created_at', { ascending: false }).limit(LIMIT)
      .then(({ data, error }) => {
        if (error) setError('Couldn’t load orders. Refresh to try again.');
        setOrders(data || []);
      });
  }, []);

  const results = useMemo(() => {
    const words = q.toLowerCase().replace('#', '').split(/\s+/).filter(Boolean);
    const test = FILTERS.find((f) => f.id === filter).test;
    return (orders || []).filter((o) => {
      if (test && !test(o)) return false;
      const hay = [o.number, o.email, o.pickup_phone, shoes(o), serviceSummary(o.order_items)].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [orders, q, filter]);

  function type(value) {
    setQ(value);
    router.replace(value ? `/staff/search?q=${encodeURIComponent(value)}` : '/staff/search', { scroll: false });
  }

  return (
    <>
      <div>
        <div className="eyebrow">Every order, open or done</div>
        <h1 style={{ fontSize: 32 }}>Search &amp; history</h1>
      </div>
      <label className="field">Find an order
        <input className="input" type="search" value={q} onChange={(e) => type(e.target.value)} autoFocus
          placeholder="Order #, customer email, phone, shoe or service" />
      </label>
      <div className="pills">
        {FILTERS.map((f) => <button key={f.id} type="button" className="pill" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>)}
      </div>
      {error && <p className="error">{error}</p>}
      {orders === null ? <p className="muted">Loading orders…</p> : (
        <>
          <p className="muted small" style={{ margin: 0 }}>
            {results.length} {results.length === 1 ? 'order' : 'orders'}{orders.length === LIMIT ? ` (searching the latest ${LIMIT})` : ''}
          </p>
          {results.length > 0 && (
            <div className={s.tableBox}>
              <table className={s.table}>
                <thead><tr><th>Order</th><th>Customer</th><th>Pairs · services</th><th>Stage</th><th>Booked</th><th>Total</th></tr></thead>
                <tbody>
                  {results.map((o) => (
                    <tr key={o.id}>
                      <td><Link className={s.rowLink} href={`/staff/order?id=${o.id}`}>#{o.number}</Link></td>
                      <td style={{ overflowWrap: 'anywhere' }}>{o.email}{o.pickup_phone ? <div className="muted small">{o.pickup_phone}</div> : null}</td>
                      <td>{pairCount(o)} · {serviceSummary(o.order_items)}{shoes(o) ? <div className="muted small">{shoes(o)}</div> : null}</td>
                      <td><span className={`badge ${o.status === 'cancelled' ? 'grey' : o.status === 'picked_up' ? 'grey' : o.status === 'ready_for_pickup' ? 'ok' : ''}`}>{stageLabel(o.status)}</span></td>
                      <td>{new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{money(o.total_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
