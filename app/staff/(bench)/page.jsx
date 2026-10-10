'use client';
// The board: every open order by stage. Filter to your own or unassigned orders, or jump to search.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, stageLabel, serviceSummary } from '../../../lib/supabase';
import { useStaff, ORDER_SELECT, OPEN_FILTER, firstName, shoes, pairCount } from './staff-shared';
import s from '../staff.module.css';

const COLUMNS = [
  { id: 'booked', title: 'Booked · waiting for pair' },
  { id: 'received', title: 'Received' },
  { id: 'working', title: 'On the bench', statuses: ['inspected', 'in_restoration'] },
  { id: 'ready_for_pickup', title: 'Ready for pickup' },
];

export default function Board() {
  const { userId, person } = useStaff();
  const router = useRouter();
  const [orders, setOrders] = useState(null);
  const [who, setWho] = useState('all'); // 'all' | 'mine' | 'none'
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('orders').select(ORDER_SELECT)
      .not('status', 'in', OPEN_FILTER).order('created_at', { ascending: true });
    if (error) setError('Couldn’t load orders. Refresh to try again.');
    setOrders(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = (orders || []).filter((o) => (who === 'mine' ? o.assigned_to === userId : who === 'none' ? !o.assigned_to : true));
  const mine = (orders || []).filter((o) => o.assigned_to === userId).length;
  const none = (orders || []).filter((o) => !o.assigned_to).length;

  return (
    <>
      <div className={s.top}>
        <div>
          <div className="eyebrow">Open orders</div>
          <h1 style={{ fontSize: 32 }}>The bench</h1>
        </div>
        <form className="pills" role="search" onSubmit={(e) => { e.preventDefault(); router.push(`/staff/search?q=${encodeURIComponent(q.trim())}`); }}>
          <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order #, email or shoe"
            aria-label="Find an order" style={{ minHeight: 44, width: 220, borderRadius: 999 }} />
          <button type="button" className="pill" aria-pressed={who === 'all'} onClick={() => setWho('all')}>Everyone · {orders?.length ?? '…'}</button>
          <button type="button" className="pill" aria-pressed={who === 'mine'} onClick={() => setWho('mine')}>Mine · {mine}</button>
          <button type="button" className="pill" aria-pressed={who === 'none'} onClick={() => setWho('none')}>Unassigned · {none}</button>
          <button type="button" className="pill" onClick={load}>Refresh</button>
        </form>
      </div>
      {error && <p className="error">{error}</p>}
      {orders === null ? <p className="muted">Loading orders…</p> : (
        <div className={s.board}>
          {COLUMNS.map((col) => {
            const colList = list.filter((o) => (col.statuses || [col.id]).includes(o.status));
            return (
              <section key={col.id} className={s.col}>
                <h2 className={s.colTitle}>{col.title}<span>{colList.length}</span></h2>
                {colList.length === 0 && <p className="muted small" style={{ margin: 4 }}>Nothing here.</p>}
                {colList.map((o) => <Ticket key={o.id} o={o} assignee={person(o.assigned_to)} />)}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function Ticket({ o, assignee }) {
  const needsPhotos = o.status === 'received' && !(o.order_photos || []).some((p) => p.kind === 'intake');
  const n = pairCount(o);
  return (
    <Link href={`/staff/order?id=${o.id}`} className={s.ticket} style={{ textDecoration: 'none' }}>
      <span className={s.ticketTop}>
        <span>#{o.number}{n > 1 ? ` · ${n} pairs` : ''}</span>
        {o.handoff === 'pickup'
          ? <span className={`badge ${o.pickup_status === 'confirmed' || o.pickup_status === 'collected' ? 'ok' : 'warn'}`}>{o.pickup_status === 'requested' ? 'Pickup req.' : 'Pickup set'}</span>
          : <span className="badge grey">Drop-off</span>}
      </span>
      <strong>{serviceSummary(o.order_items)}</strong>
      {shoes(o) && <span className="muted small">{shoes(o)}</span>}
      {(o.status === 'inspected' || o.status === 'in_restoration') && <span className="small">{stageLabel(o.status)}</span>}
      {needsPhotos && <span className="small" style={{ color: 'var(--warn)' }}>Needs check-in photos</span>}
      <span className={s.assignee}>
        {assignee
          ? <><span className={s.dot} aria-hidden="true">{firstName(assignee).charAt(0).toUpperCase()}</span>{firstName(assignee)}</>
          : <><span className={`${s.dot} ${s.none}`} aria-hidden="true">?</span>Unassigned</>}
      </span>
    </Link>
  );
}
