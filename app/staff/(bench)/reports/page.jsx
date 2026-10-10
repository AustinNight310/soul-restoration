'use client';
// Reports (admins): orders, pairs and booked value for a period, pairs booked per week, the most
// popular services, and how long orders sit in each stage (from the stage times on every order).
import { useEffect, useMemo, useState } from 'react';
import { supabase, money } from '../../../../lib/supabase';
import { AdminOnly } from '../staff-shared';
import s from '../../staff.module.css';

const DAY = 864e5;
const RANGES = [
  { id: 'week', label: 'Last 7 days', days: 7 },
  { id: '8w', label: 'Last 8 weeks', days: 56 },
  { id: 'year', label: 'This year' },
];
const STEPS = [
  ['booked', 'received', 'Booked → received'],
  ['received', 'inspected', 'Received → inspected'],
  ['inspected', 'ready_for_pickup', 'On the bench'],
  ['ready_for_pickup', 'picked_up', 'Ready → picked up'],
];

export default function ReportsPage() {
  return <AdminOnly><Reports /></AdminOnly>;
}

function Reports() {
  const [orders, setOrders] = useState(null);
  const [range, setRange] = useState('8w');
  const [hideTest, setHideTest] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('orders')
      .select('id, created_at, status, total_cents, is_test, order_items(name), order_pairs!order_pairs_order_id_fkey(id), order_events(status, created_at)')
      .order('created_at', { ascending: false }).limit(5000)
      .then(({ data, error }) => { if (error) setError('Couldn’t load orders. Refresh to try again.'); setOrders(data || []); });
  }, []);

  const r = useMemo(() => {
    if (!orders) return null;
    const now = new Date();
    const conf = RANGES.find((x) => x.id === range);
    const from = conf.days ? new Date(now - conf.days * DAY) : new Date(now.getFullYear(), 0, 1);
    const all = orders.filter((o) => !(hideTest && o.is_test));
    const inRange = all.filter((o) => new Date(o.created_at) >= from && o.status !== 'cancelled');
    const pairs = (o) => o.order_pairs?.length || 1;

    // pairs per week for the last 8 weeks (weeks start Monday)
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const start = new Date(monday.getTime() - (7 - i) * 7 * DAY);
      const end = new Date(start.getTime() + 7 * DAY);
      const n = all.filter((o) => o.status !== 'cancelled' && new Date(o.created_at) >= start && new Date(o.created_at) < end).reduce((t, o) => t + pairs(o), 0);
      return { start, n };
    });

    const services = new Map();
    inRange.forEach((o) => o.order_items.forEach((i) => services.set(i.name, (services.get(i.name) || 0) + 1)));
    const popular = [...services].sort((a, b) => b[1] - a[1]).slice(0, 6);

    const firstAt = (o, st) => {
      const t = o.order_events.filter((e) => e.status === st).map((e) => new Date(e.created_at).getTime());
      return t.length ? Math.min(...t) : null;
    };
    const stepDays = STEPS.map(([a, b, label]) => {
      const gaps = inRange.map((o) => {
        const ta = a === 'booked' ? new Date(o.created_at).getTime() : firstAt(o, a);
        const tb = firstAt(o, b);
        return ta && tb && tb >= ta ? (tb - ta) / DAY : null;
      }).filter((x) => x != null);
      return { label, avg: gaps.length ? gaps.reduce((t, x) => t + x, 0) / gaps.length : null, n: gaps.length };
    });
    const turn = inRange.map((o) => { const a = firstAt(o, 'received'), b = firstAt(o, 'ready_for_pickup'); return a && b && b >= a ? (b - a) / DAY : null; }).filter((x) => x != null);

    return {
      count: inRange.length,
      pairs: inRange.reduce((t, o) => t + pairs(o), 0),
      value: inRange.reduce((t, o) => t + (o.total_cents || 0), 0),
      turnaround: turn.length ? turn.reduce((t, x) => t + x, 0) / turn.length : null,
      weeks, popular, stepDays,
      tests: orders.filter((o) => o.is_test).length,
    };
  }, [orders, range, hideTest]);

  if (!r) return <p className="muted">{error || 'Loading reports…'}</p>;
  const maxWeek = Math.max(1, ...r.weeks.map((w) => w.n));
  const maxService = Math.max(1, ...r.popular.map((p) => p[1]));
  const maxStep = Math.max(0.1, ...r.stepDays.map((x) => x.avg || 0));
  const days = (x) => (x == null ? '—' : `${x < 10 ? x.toFixed(1) : Math.round(x)}d`);

  return (
    <>
      <div className={s.top}>
        <div><div className="eyebrow">Admin</div><h1 style={{ fontSize: 32 }}>Reports</h1></div>
        <div className="pills">
          {RANGES.map((x) => <button key={x.id} className="pill" aria-pressed={range === x.id} onClick={() => setRange(x.id)}>{x.label}</button>)}
          <button className="pill" aria-pressed={hideTest} onClick={() => setHideTest(!hideTest)}>Hide test orders{r.tests ? ` · ${r.tests}` : ''}</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <div className={s.tiles}>
        <div className={s.tile}><span className="muted small">Orders</span><span className={s.tileValue}>{r.count}</span></div>
        <div className={s.tile}><span className="muted small">Pairs</span><span className={s.tileValue}>{r.pairs}</span></div>
        <div className={s.tile}><span className="muted small">Booked value</span><span className={s.tileValue}>{money(r.value) || '$0'}</span></div>
        <div className={s.tile}><span className="muted small">Received → ready</span><span className={s.tileValue}>{days(r.turnaround)}</span></div>
      </div>
      <p className="muted small" style={{ margin: 0 }}>Cancelled orders aren’t counted. Booked value is what orders were booked at, before paint quotes and any changes at the counter.</p>

      <section className="card" style={{ display: 'grid', gap: 10 }}>
        <strong>Pairs booked per week</strong>
        {r.weeks.every((w) => !w.n) && <span className="muted small">No pairs booked in the last 8 weeks{hideTest ? ' (test orders hidden)' : ''}.</span>}
        <div className={s.bars} role="img" aria-label={`Pairs booked per week: ${r.weeks.map((w) => `${w.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${w.n}`).join(', ')}`}>
          {r.weeks.map((w, i) => (
            <div key={i} style={{ display: 'grid', alignContent: 'end', height: '100%', gap: 4 }}>
              <span className="small" style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>{w.n || ''}</span>
              <div className={s.bar} style={{ height: `${(w.n / maxWeek) * 120}px` }} />
            </div>
          ))}
        </div>
        <div className={s.barLabels} aria-hidden="true">{r.weeks.map((w, i) => <span key={i}>{w.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>)}</div>
      </section>

      <div className={s.detail}>
        <section className="card" style={{ display: 'grid', gap: 10, flex: '1 1 320px' }}>
          <strong>Popular services</strong>
          {r.popular.length === 0 && <span className="muted small">No orders in this period.</span>}
          {r.popular.map(([name, n]) => (
            <div key={name} className={s.hrow}><span>{name}</span><span className={s.hbar} style={{ width: `${(n / maxService) * 100}%` }} /><span style={{ fontFamily: 'var(--mono)' }}>{n}</span></div>
          ))}
        </section>
        <section className="card" style={{ display: 'grid', gap: 10, flex: '1 1 320px' }}>
          <strong>Average time in each stage</strong>
          {r.stepDays.map((x) => (
            <div key={x.label} className={s.hrow}><span>{x.label}</span><span className={s.hbar} style={{ width: x.avg == null ? 0 : `${(x.avg / maxStep) * 100}%` }} /><span style={{ fontFamily: 'var(--mono)' }}>{days(x.avg)}</span></div>
          ))}
          <span className="muted small">Worked out from the stage times saved on every order.</span>
        </section>
      </div>
    </>
  );
}
