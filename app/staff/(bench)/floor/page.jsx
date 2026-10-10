'use client';
// The floor: every pair in the shop, by the station it's at, refreshed every 30 seconds.
// On hold, sent back, late, not moved in a day, or in the shop but never scanned: all flagged,
// so what the board says matches what's on the benches. Plus today's moves, person by person.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { STATE_LABEL, since } from '../../../../lib/stations';
import { useStaff, firstName } from '../staff-shared';
import s from '../../staff.module.css';

const PAIR = 'id, position, shoe_model, shoe_size, station_id, station_state, station_at, station_by, next_station_id, hold_note, spot, '
  + 'orders!order_pairs_order_id_fkey!inner(id, number, status, due_at, assigned_to)';
const STALE_MS = 24 * 60 * 60 * 1000;
const ACTION = { arrive: 'started', done: 'finished', hold: 'put on hold', release: 'cleared a hold on', send_back: 'sent back' };

export default function Floor() {
  const { stations, station, userId, person } = useStaff();
  const [pairs, setPairs] = useState(null);
  const [moves, setMoves] = useState([]);
  const [who, setWho] = useState('all');
  const [at, setAt] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const [p, m] = await Promise.all([
      supabase.from('order_pairs').select(PAIR).not('orders.status', 'in', '(picked_up,cancelled)'),
      supabase.from('pair_moves').select('id, pair_id, station_id, action, source, skipped, note, created_by, created_at, order_pairs(position), orders(number)')
        .gte('created_at', start.toISOString()).order('created_at', { ascending: false }).limit(200),
    ]);
    if (p.error) setError('Couldn’t load the floor. It tries again in 30 seconds.');
    else { setError(''); setPairs(p.data || []); setMoves(m.data || []); setAt(new Date()); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  if (!stations.length || pairs === null) return <p className="muted">{error || 'Loading the floor…'}</p>;

  const now = Date.now();
  const inShop = pairs.filter((p) => p.station_id || !['booked', 'pending_payment', 'paid'].includes(p.orders.status));
  const list = inShop.filter((p) => (who === 'mine' ? p.station_by === userId || p.orders.assigned_to === userId : true));
  const flags = (p) => ({
    late: p.orders.due_at && new Date(p.orders.due_at).getTime() < now && p.orders.status !== 'ready_for_pickup',
    stale: p.station_at && p.station_state !== 'done' && now - new Date(p.station_at).getTime() > STALE_MS,
  });
  const unscanned = list.filter((p) => !p.station_id);
  const held = list.filter((p) => p.station_state === 'held').length;
  const back = list.filter((p) => p.station_state === 'sent_back').length;
  const late = list.filter((p) => flags(p).late).length;

  // today, per person: finished at a station, and how many moves were scanned vs picked by hand
  const people = {};
  moves.forEach((m) => {
    const k = m.created_by || 'x';
    people[k] ||= { done: 0, moves: 0, manual: 0 };
    people[k].moves++;
    if (m.action === 'done') people[k].done++;
    if (m.source === 'manual' && m.action === 'arrive') people[k].manual++;
  });

  return (
    <>
      <div className={s.top}>
        <div>
          <div className="eyebrow">Live · updated {at ? at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}</div>
          <h1 style={{ fontSize: 32 }}>The floor</h1>
        </div>
        <div className="pills">
          <button type="button" className="pill" aria-pressed={who === 'all'} onClick={() => setWho('all')}>Everyone</button>
          <button type="button" className="pill" aria-pressed={who === 'mine'} onClick={() => setWho('mine')}>Mine</button>
          <button type="button" className="pill" onClick={load}>Refresh</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <div className={s.tiles}>
        <div className={s.tile}><span className="muted small">Pairs in the shop</span><span className={s.tileValue}>{list.length}</span></div>
        <div className={s.tile} data-tone={held ? 'danger' : undefined}><span className="muted small">On hold</span><span className={s.tileValue}>{held}</span></div>
        <div className={s.tile} data-tone={unscanned.length ? 'warn' : undefined}><span className="muted small">Not scanned in</span><span className={s.tileValue}>{unscanned.length}</span></div>
        <div className={s.tile} data-tone={late ? 'danger' : undefined}><span className="muted small">Past due</span><span className={s.tileValue}>{late}</span><span className="muted small">{back ? `${back} sent back` : ''}</span></div>
      </div>

      <div className={s.floor}>
        {unscanned.length > 0 && (
          <section className={s.col} data-tone="warn">
            <h2 className={s.colTitle}>Not scanned in<span>{unscanned.length}</span></h2>
            <p className="muted small" style={{ margin: '0 4px' }}>Order says it’s in the shop, but no one has scanned these pairs. Scan them where they are.</p>
            {unscanned.map((p) => <Card key={p.id} p={p} flags={flags(p)} person={person} />)}
          </section>
        )}
        {stations.filter((x) => x.active).map((x) => {
          const here = list.filter((p) => p.station_id === x.id);
          return (
            <section key={x.id} className={s.col}>
              <h2 className={s.colTitle}><Link href={`/staff/station?id=${x.id}`} style={{ color: 'inherit' }}>{x.name}</Link><span>{here.length}</span></h2>
              {here.length === 0 && <p className="muted small" style={{ margin: 4 }}>Empty.</p>}
              {here.map((p) => <Card key={p.id} p={p} flags={flags(p)} person={person} sentTo={station(p.next_station_id)} />)}
            </section>
          );
        })}
      </div>

      <div className={s.detail}>
        <div className={`card ${s.main}`} style={{ gap: 6 }}>
          <strong>Today’s moves</strong>
          {moves.length === 0 && <span className="muted small">Nothing scanned yet today.</span>}
          <div className={s.events}>
            {moves.slice(0, 60).map((m) => (
              <div key={m.id} className={s.event}>
                <span className="muted" style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                <span>
                  <strong>{firstName(person(m.created_by)) || 'staff'}</strong> {ACTION[m.action]}{' '}
                  <Link href={`/staff/pair?id=${m.pair_id}`}>#{m.orders?.number} P{m.order_pairs?.position}</Link>
                  {' '}at {station(m.station_id)?.name}
                  {m.source === 'manual' && m.action === 'arrive' && <span className="muted"> · by hand</span>}
                  {m.skipped?.length > 0 && <span style={{ color: 'var(--warn)' }}> · skipped {m.skipped.join(', ')}</span>}
                  {m.note && <span className="muted"> · {m.note}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
        <aside className={`card ${s.aside}`} style={{ gap: 8 }}>
          <strong>Who did what today</strong>
          {Object.keys(people).length === 0 && <span className="muted small">No moves yet.</span>}
          {Object.entries(people).sort((a, b) => b[1].done - a[1].done).map(([id, n]) => (
            <div key={id} className={s.personRow}>
              <span className={s.dot} aria-hidden="true">{(firstName(person(id)) || '?').charAt(0).toUpperCase()}</span>
              <span style={{ minWidth: 0 }}><strong>{firstName(person(id)) || 'Staff'}</strong>
                <span className="muted small" style={{ display: 'block' }}>{n.done} finished · {n.moves} {n.moves === 1 ? 'move' : 'moves'}{n.manual ? ` · ${n.manual} started by hand` : ''}</span></span>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}

function Card({ p, flags, person, sentTo }) {
  const o = p.orders;
  return (
    <Link href={`/staff/pair?id=${p.id}`} className={s.ticket} data-state={p.station_state || 'none'} style={{ textDecoration: 'none' }}>
      <span className={s.ticketTop}>
        <span>#{o.number} · P{p.position}</span>
        {p.station_state && <span className={`badge ${p.station_state === 'done' ? 'ok' : p.station_state === 'working' ? '' : 'warn'}`}
          style={p.station_state === 'held' ? { background: 'var(--danger-soft)', color: 'var(--danger)' } : undefined}>{STATE_LABEL[p.station_state]}</span>}
      </span>
      <strong className={s.ellipsis}>{p.shoe_model || `Pair ${p.position}`}{p.shoe_size ? ` · ${p.shoe_size}` : ''}</strong>
      {p.station_state === 'held' && <span className="small" style={{ color: 'var(--danger)' }}>{p.hold_note}</span>}
      {p.station_state === 'sent_back' && sentTo && <span className="small" style={{ color: 'var(--warn)' }}>Back to {sentTo.name}</span>}
      {p.spot && <span className="small">Spot {p.spot}</span>}
      <span className={s.assignee}>
        {p.station_at ? <>{firstName(person(p.station_by)) || 'staff'} · {since(p.station_at)} ago</> : 'Never scanned'}
        {flags.stale && <span style={{ color: 'var(--warn)', fontWeight: 700 }}> · no move in a day</span>}
        {flags.late && <span style={{ color: 'var(--danger)', fontWeight: 700 }}> · late</span>}
      </span>
    </Link>
  );
}
