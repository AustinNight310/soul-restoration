'use client';
// The staff calendar: pickups, deliveries back to customers and due dates, by day, week or month.
// Move a stop by dragging it in the week view (mouse) or with Change time (everywhere). Moves always
// ask first, and can open a text to the customer with the new time.
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, serviceSummary } from '../../../../lib/supabase';
import { useStaff, firstName, phoneHref } from '../staff-shared';
import ChangeTime from './ChangeTime';
import {
  CAL_SELECT, GRID_START, GRID_END, HOUR_PX, KINDS, DOW, buildEvents, pairs, saveTime, textBody,
  startOfDay, startOfWeek, addDays, sameDay, dayKey, timeText, dayText,
} from './cal-lib';
import s from '../../staff.module.css';

export default function CalendarPage() {
  const { userId, person } = useStaff();
  const [orders, setOrders] = useState(null);
  const [settings, setSettings] = useState({ closed_days: [0] });
  const [view, setView] = useState('week');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [who, setWho] = useState('all');
  const [shown, setShown] = useState({ pickup: true, return: true, due: true });
  const [selected, setSelected] = useState(null);
  const [changing, setChanging] = useState(null);
  const [pending, setPending] = useState(null); // a dragged move waiting for confirmation
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  useEffect(() => { if (window.matchMedia('(max-width: 760px)').matches) setView('day'); }, []);

  const load = useCallback(async () => {
    const [o, c] = await Promise.all([
      supabase.from('orders').select(CAL_SELECT).not('status', 'in', '(picked_up,cancelled)'),
      supabase.rpc('get_calendar_settings'),
    ]);
    if (o.error) setError('Couldn’t load the calendar. Refresh to try again.');
    setOrders(o.data || []);
    if (c.data) setSettings(c.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const all = useMemo(() => buildEvents(orders || []), [orders]);
  const events = all.filter((e) => shown[e.kind] && (who === 'all' || e.order.assigned_to === userId));
  const closed = settings.closed_days || [];
  const sel = selected && all.find((e) => e.id === selected);
  const untimed = events.filter((e) => e.kind !== 'due' && !e.at);
  const noDue = (orders || []).filter((o) => !o.due_at && ['received', 'inspected', 'in_restoration'].includes(o.status));

  function step(dir) {
    setAnchor((a) => (view === 'month' ? new Date(a.getFullYear(), a.getMonth() + dir, 1) : addDays(a, dir * (view === 'week' ? 7 : 1))));
  }
  const title = view === 'month'
    ? anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : view === 'week'
      ? `${startOfWeek(anchor).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${addDays(startOfWeek(anchor), 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : anchor.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  async function done(message) {
    setChanging(null); setPending(null);
    setFlash(message || 'Saved.');
    await load();
  }
  async function confirmMove(text) {
    const err = await saveTime(pending.event, pending.at, userId);
    if (err) return setFlash(err.message || 'Didn’t save. Try again.');
    const sms = text && phoneHref('sms', pending.event.phone, textBody(pending.event, pending.at));
    if (sms) window.location.href = sms;
    done(`Moved #${pending.event.order.number} to ${dayText(pending.at)}, ${timeText(pending.at)}.`);
  }
  async function finish(e) {
    const o = e.order;
    const fields = e.kind === 'pickup'
      ? { pickup_status: 'collected', status: o.status === 'booked' ? 'received' : o.status }
      : { return_status: 'delivered', status: 'picked_up' };
    const { error } = await supabase.from('orders').update(fields).eq('id', o.id);
    if (error) return setFlash('Didn’t save. Try again.');
    await supabase.from('order_events').insert({ order_id: o.id, status: fields.status, created_by: userId, note: e.kind === 'pickup' ? 'Collected on pickup' : 'Delivered to the customer' });
    setSelected(null);
    done(e.kind === 'pickup' ? `Collected #${o.number}.` : `Delivered #${o.number}.`);
  }

  if (orders === null) return <p className="muted">{error || 'Loading the calendar…'}</p>;
  const ctx = { events, all, closed, selected, setSelected: (id) => { setSelected(id); setChanging(null); }, person, onMove: setPending, anchor, setAnchor, setView };

  return (
    <>
      <div className={s.calTop}>
        <div><div className="eyebrow">Calendar</div><h1 style={{ fontSize: 30 }}>{title}</h1></div>
        <div className={`pills ${s.calNav}`}>
          <button className="pill" onClick={() => step(-1)} aria-label="Earlier">‹</button>
          <button className="pill" onClick={() => setAnchor(startOfDay(new Date()))}>Today</button>
          <button className="pill" onClick={() => step(1)} aria-label="Later">›</button>
          {['day', 'week', 'month'].map((v) => <button key={v} className="pill" aria-pressed={view === v} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}
        </div>
      </div>
      <div className={`pills ${s.calFilters}`}>
        <button className="pill" aria-pressed={who === 'all'} onClick={() => setWho('all')}>Everyone</button>
        <button className="pill" aria-pressed={who === 'mine'} onClick={() => setWho('mine')}>Mine</button>
        {Object.entries(KINDS).map(([k, v]) => (
          <button key={k} className="pill" aria-pressed={shown[k]} onClick={() => setShown({ ...shown, [k]: !shown[k] })}>
            <span className={s.kdot} style={{ background: v.color }} aria-hidden="true" />{v.label}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {flash && <p className="notice" role="status">{flash}</p>}
      {pending && (
        <div className={s.moveBar} role="dialog" aria-label="Confirm the move">
          <span style={{ flex: '1 1 300px' }}>
            Move <strong>{KINDS[pending.event.kind].one} #{pending.event.order.number}</strong>
            {pending.event.at ? ` from ${dayText(pending.event.at)}, ${timeText(pending.event.at)}` : ''} to <strong>{dayText(pending.at)}, {timeText(pending.at)}</strong>?
            {clash(pending, all) && <><br /><span className="small">That day already has #{clash(pending, all).order.number} at {timeText(clash(pending, all).at)}.</span></>}
          </span>
          {pending.event.phone && <button className="btn primary small" onClick={() => confirmMove(true)}>Move and text the customer</button>}
          <button className="btn ghost small" onClick={() => confirmMove(false)}>Move only</button>
          <button className="btn ghost small" onClick={() => setPending(null)}>Cancel</button>
        </div>
      )}

      <div className={s.calWrap}>
        <div className={s.calMain}>
          {view === 'week' && <Week {...ctx} />}
          {view === 'month' && <Month {...ctx} />}
          {view === 'day' && <Day {...ctx} onChange={(e) => setChanging(e.id)} onFinish={finish} changing={changing} closeChange={() => setChanging(null)} done={done} />}
        </div>
        {view !== 'day' && (
          <aside className={s.calSide}>
            {sel && (changing === sel.id
              ? <ChangeTime event={sel} events={all} closedDays={closed} onDone={() => done()} onCancel={() => setChanging(null)} />
              : <Detail e={sel} person={person} onChange={() => setChanging(sel.id)} onFinish={() => finish(sel)} />)}
            {view === 'month' && <DayList day={anchor} events={events} setSelected={ctx.setSelected} openDay={() => setView('day')} />}
            <NeedsTime untimed={untimed} setSelected={ctx.setSelected} onChange={(e) => { setSelected(e.id); setChanging(e.id); }} />
            {noDue.length > 0 && (
              <section className="card" style={{ display: 'grid', gap: 0 }}>
                <strong style={{ paddingBottom: 6 }}>No due date · {noDue.length}</strong>
                {noDue.map((o) => (
                  <div key={o.id} style={{ borderTop: '1px solid var(--line)', padding: '8px 0', fontSize: 14 }}>
                    <strong>#{o.number}</strong> · {serviceSummary(o.order_items)}<br /><Link href={`/staff/order?id=${o.id}`} style={{ fontWeight: 600 }}>Set due date</Link>
                  </div>
                ))}
              </section>
            )}
          </aside>
        )}
      </div>
    </>
  );
}

// another stop on the same day within half an hour of a proposed move
function clash(p, all) {
  return all.find((e) => e.kind !== 'due' && e.id !== p.event.id && e.at && sameDay(e.at, p.at) && Math.abs(e.at - p.at) < 30 * 60000);
}

function Week({ events, closed, selected, setSelected, person, onMove, anchor }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i));
  const today = new Date();
  const [hover, setHover] = useState(null);
  const grab = useRef({ id: null, offset: 0 });
  const [canDrag, setCanDrag] = useState(false);
  useEffect(() => { setCanDrag(window.matchMedia('(pointer: fine)').matches); }, []);
  const height = (GRID_END - GRID_START) * HOUR_PX;
  const minutesAt = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const raw = GRID_START * 60 + ((e.clientY - rect.top - grab.current.offset) / HOUR_PX) * 60;
    return Math.min(Math.max(Math.round(raw / 15) * 15, GRID_START * 60), GRID_END * 60 - 15);
  };
  const top = (d) => Math.min(Math.max(((d.getHours() * 60 + d.getMinutes()) - GRID_START * 60) / 60 * HOUR_PX, 0), height - 40);

  return (
    <div className={s.week}>
      <div style={{ borderBottom: '1px solid var(--line)' }} />
      {days.map((d) => (
        <div key={dayKey(d)} className={`${s.wHead} ${sameDay(d, today) ? s.today : ''}`}><span>{DOW[d.getDay()]}</span><strong>{d.getDate()}</strong></div>
      ))}
      <div className={s.wGutter}>DUE</div>
      {days.map((d) => (
        <div key={dayKey(d)} className={s.wDue}>
          {events.filter((e) => e.kind === 'due' && sameDay(e.at, d)).map((e) => (
            <button key={e.id} type="button" className={`${s.chip} ${e.late ? s.late : ''}`} aria-pressed={selected === e.id} onClick={() => setSelected(e.id)}>
              #{e.order.number}{pairs(e.order) > 1 ? ` · ${pairs(e.order)} pairs` : ''}
            </button>
          ))}
        </div>
      ))}
      <div className={s.wHours} style={{ height }}>
        {Array.from({ length: GRID_END - GRID_START }, (_, i) => (
          <span key={i} style={{ top: i * HOUR_PX }}>{timeText(new Date(2000, 0, 1, GRID_START + i)).replace(':00', '')}</span>
        ))}
      </div>
      {days.map((d) => {
        const isClosed = closed.includes(d.getDay());
        const list = events.filter((e) => e.kind !== 'due' && e.at && sameDay(e.at, d)).sort((a, b) => a.at - b.at);
        const lanes = laneOf(list);
        const over = hover && hover.key === dayKey(d);
        return (
          <div key={dayKey(d)} className={`${s.wCol} ${isClosed ? s.closed : ''} ${over ? s.over : ''}`} style={{ height }}
            onDragOver={isClosed ? undefined : (e) => { e.preventDefault(); setHover({ key: dayKey(d), minutes: minutesAt(e) }); }}
            onDragLeave={() => setHover(null)}
            onDrop={isClosed ? undefined : (e) => {
              e.preventDefault();
              const m = minutesAt(e);
              const ev = events.find((x) => x.id === grab.current.id);
              setHover(null);
              if (ev) onMove({ event: ev, at: new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(m / 60), m % 60) });
            }}>
            {sameDay(d, today) && today.getHours() >= GRID_START && today.getHours() < GRID_END && (
              <div className={s.nowLine} style={{ top: ((today.getHours() * 60 + today.getMinutes()) - GRID_START * 60) / 60 * HOUR_PX }} aria-hidden="true" />
            )}
            {list.map((e) => {
              const { lane, of } = lanes.get(e.id);
              const who = firstName(person(e.order.assigned_to));
              return (
                <button key={e.id} type="button" className={s.ev} data-kind={e.kind} aria-pressed={selected === e.id}
                  draggable={canDrag}
                  onDragStart={(ev) => { grab.current = { id: e.id, offset: ev.clientY - ev.currentTarget.getBoundingClientRect().top }; ev.dataTransfer.setData('text/plain', e.id); ev.dataTransfer.effectAllowed = 'move'; }}
                  onClick={() => setSelected(e.id)}
                  style={{ top: top(e.at), height: 40, left: `calc(${(lane / of) * 100}% + 3px)`, width: `calc(${100 / of}% - 6px)`, right: 'auto' }}
                  title={canDrag ? 'Drag to move, or click for details' : undefined}>
                  <strong>{timeText(e.at)} {KINDS[e.kind].one} #{e.order.number}</strong>{who ? ` · ${who}` : ''}
                </button>
              );
            })}
            {over && (
              <div className={s.ghost} style={{ top: ((hover.minutes - GRID_START * 60) / 60) * HOUR_PX }}>
                <span>{timeText(new Date(2000, 0, 1, Math.floor(hover.minutes / 60), hover.minutes % 60))}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Side-by-side lanes for stops that overlap (each is drawn about 50 minutes tall).
function laneOf(list) {
  const SPAN = 50 * 60000;
  const out = new Map();
  let cluster = [];
  let clusterEnd = 0;
  let laneEnds = [];
  const close = () => {
    cluster.forEach((id) => { out.get(id).of = laneEnds.length || 1; });
    cluster = []; laneEnds = []; clusterEnd = 0;
  };
  for (const e of list) {
    const t = e.at.getTime();
    if (cluster.length && t >= clusterEnd) close();
    let lane = laneEnds.findIndex((end) => end <= t);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
    laneEnds[lane] = t + SPAN;
    clusterEnd = Math.max(clusterEnd, t + SPAN);
    out.set(e.id, { lane, of: 1 });
    cluster.push(e.id);
  }
  close();
  return out;
}

function Month({ events, closed, anchor, setAnchor }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const today = new Date();
  return (
    <div className={s.month}>
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className={s.mDow}>{d}</div>)}
      {days.map((d) => {
        const list = events.filter((e) => e.at && sameDay(e.at, d));
        const count = (k) => list.filter((e) => e.kind === k).length;
        const late = list.filter((e) => e.late).length;
        return (
          <button key={dayKey(d)} type="button" aria-pressed={sameDay(d, anchor)} onClick={() => setAnchor(d)}
            className={`${s.mDay} ${d.getMonth() !== anchor.getMonth() ? s.other : ''} ${closed.includes(d.getDay()) ? s.closed : ''}`}>
            <span className={`${s.mNum} ${sameDay(d, today) ? s.today : ''}`}>{d.getDate()}</span>
            {count('pickup') > 0 && <span className={s.mCount}><span className={s.kdot} style={{ background: KINDS.pickup.color }} />{count('pickup')} pickup{count('pickup') > 1 ? 's' : ''}</span>}
            {count('return') > 0 && <span className={s.mCount}><span className={s.kdot} style={{ background: KINDS.return.color }} />{count('return')} deliver{count('return') > 1 ? 'ies' : 'y'}</span>}
            {count('due') - late > 0 && <span className={s.mCount}><span className={s.kdot} style={{ background: KINDS.due.color }} />{count('due') - late} due</span>}
            {late > 0 && <span className={s.mCount} style={{ color: 'var(--danger)' }}><span className={s.kdot} style={{ background: 'var(--danger)' }} />{late} late</span>}
          </button>
        );
      })}
    </div>
  );
}

function DayList({ day, events, setSelected, openDay }) {
  const list = events.filter((e) => e.at && sameDay(e.at, day)).sort((a, b) => (a.kind === 'due') - (b.kind === 'due') || a.at - b.at);
  return (
    <section className="card" style={{ display: 'grid', gap: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6 }}><strong>{dayText(day)}</strong><button className="linkbtn" style={{ color: 'var(--accent)' }} onClick={openDay}>Open day</button></div>
      {list.length === 0 && <span className="muted small">Nothing on this day.</span>}
      {list.map((e) => (
        <button key={e.id} type="button" onClick={() => setSelected(e.id)} className="linkbtn" style={{ textAlign: 'left', textDecoration: 'none', color: 'var(--ink)', borderTop: '1px solid var(--line)', padding: '8px 0', display: 'grid', gridTemplateColumns: '64px 1fr', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: e.late ? 'var(--danger)' : 'var(--muted)' }}>{e.kind === 'due' ? (e.late ? 'Late' : 'Due') : timeText(e.at)}</span>
          <span><strong>{e.kind === 'due' ? '' : `${KINDS[e.kind].one} `}#{e.order.number}</strong> · {pairs(e.order)} {pairs(e.order) === 1 ? 'pair' : 'pairs'}</span>
        </button>
      ))}
    </section>
  );
}

function Detail({ e, person, onChange, onFinish }) {
  const o = e.order;
  const tel = phoneHref('tel', e.phone);
  const sms = phoneHref('sms', e.phone);
  const map = e.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.address)}` : null;
  const due = e.kind === 'due';
  return (
    <section className="card" style={{ display: 'grid', gap: 8 }}>
      <strong>{due ? (e.late ? `Late since ${dayText(e.at)}` : `Due ${dayText(e.at)}`) : e.at ? `${dayText(e.at)} · ${timeText(e.at)}` : 'No time yet'}</strong>
      <span className="small"><strong>{due ? '' : `${KINDS[e.kind].one} `}#{o.number}</strong> · {pairs(o)} {pairs(o) === 1 ? 'pair' : 'pairs'} · {serviceSummary(o.order_items)}</span>
      {e.address && <span className="small muted" style={{ overflowWrap: 'anywhere' }}>{e.address}{e.evening ? ` · prefers ${e.evening}` : ''}</span>}
      {e.kind === 'return' && <span className="small">Delivery fee: <strong>{o.return_fee_cents != null ? `$${(o.return_fee_cents / 100).toFixed(o.return_fee_cents % 100 ? 2 : 0)}` : 'not set yet'}</strong></span>}
      <span className="small">Assigned: <strong>{firstName(person(o.assigned_to)) || 'nobody yet'}</strong></span>
      <div className="pills">
        <Link className="pill" href={`/staff/order?id=${o.id}`}>Open order</Link>
        {tel && <a className="pill" href={tel}>Call</a>}
        {sms && <a className="pill" href={sms}>Text</a>}
        {map && <a className="pill" href={map} target="_blank" rel="noreferrer">Map</a>}
      </div>
      {!due && (
        <div className="pills">
          <button className="btn primary small" onClick={onChange}>{e.at ? 'Change time' : 'Set a time'}</button>
          {e.at && <button className="btn dark small" onClick={onFinish}>{e.kind === 'pickup' ? 'Mark collected' : 'Mark delivered'}</button>}
        </div>
      )}
    </section>
  );
}

function NeedsTime({ untimed, setSelected, onChange }) {
  if (!untimed.length) return null;
  return (
    <section className="card" style={{ display: 'grid', gap: 0 }}>
      <strong style={{ paddingBottom: 6 }}>Needs a time · {untimed.length}</strong>
      {untimed.map((e) => (
        <div key={e.id} style={{ borderTop: '1px solid var(--line)', padding: '8px 0', fontSize: 14, display: 'grid', gap: 2 }}>
          <button type="button" className="linkbtn" style={{ textAlign: 'left', color: 'var(--ink)', textDecoration: 'none', padding: 0 }} onClick={() => setSelected(e.id)}>
            <strong>{KINDS[e.kind].one} #{e.order.number}</strong> · {e.kind === 'pickup' ? 'pickup requested' : 'delivery requested'}
          </button>
          <span className="muted">{e.evening ? `Prefers ${e.evening}` : 'Any evening'} · {pairs(e.order)} {pairs(e.order) === 1 ? 'pair' : 'pairs'}</span>
          <button type="button" className="linkbtn" style={{ textAlign: 'left', color: 'var(--accent)', fontWeight: 600, padding: 0 }} onClick={() => onChange(e)}>Set a time</button>
        </div>
      ))}
    </section>
  );
}

function Day({ events, all, closed, anchor, setAnchor, person, onChange, onFinish, changing, closeChange, done }) {
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i));
  const today = new Date();
  const due = events.filter((e) => e.kind === 'due' && sameDay(e.at, anchor));
  const stops = events.filter((e) => e.kind !== 'due' && e.at && sameDay(e.at, anchor)).sort((a, b) => a.at - b.at);
  const untimed = events.filter((e) => e.kind !== 'due' && !e.at);
  const nowIndex = sameDay(anchor, today) ? stops.findIndex((e) => e.at > today) : -1;
  return (
    <div className={s.agenda}>
      <div className={s.dayChips} role="group" aria-label="Pick a day">
        {week.map((d) => {
          const kinds = new Set(events.filter((e) => e.at && sameDay(e.at, d)).map((e) => e.kind));
          return (
            <button key={dayKey(d)} type="button" className={s.dayChip} aria-pressed={sameDay(d, anchor)} onClick={() => setAnchor(d)} style={closed.includes(d.getDay()) ? { opacity: 0.55 } : undefined}>
              <span>{DOW[d.getDay()]}</span><strong>{d.getDate()}</strong>
              <span style={{ display: 'flex', gap: 2, height: 6 }} aria-hidden="true">{[...kinds].map((k) => <i key={k} className={s.kdot} style={{ width: 5, height: 5, background: KINDS[k].color }} />)}</span>
            </button>
          );
        })}
      </div>
      {closed.includes(anchor.getDay()) && <p className="muted small" style={{ margin: 0 }}>The shop is closed this day.</p>}
      {due.length > 0 && (
        <section style={{ display: 'grid', gap: 6 }}>
          <span className="eyebrow" style={{ color: 'var(--muted)' }}>Due · {due.length}</span>
          {due.map((e) => (
            <Link key={e.id} href={`/staff/order?id=${e.order.id}`} className={`${s.chip} ${e.late ? s.late : ''}`} style={{ padding: '10px 12px', fontSize: 14, textDecoration: 'none' }}>
              #{e.order.number} · {pairs(e.order)} {pairs(e.order) === 1 ? 'pair' : 'pairs'} · {firstName(person(e.order.assigned_to)) || 'unassigned'}
            </Link>
          ))}
        </section>
      )}
      <span className="eyebrow" style={{ color: 'var(--muted)' }}>Stops · {stops.length}</span>
      {stops.length === 0 && <p className="muted small" style={{ margin: 0 }}>No pickups or deliveries this day.</p>}
      {stops.map((e, i) => (
        <div key={e.id} style={{ display: 'grid', gap: 8 }}>
          {i === nowIndex && <div style={{ display: 'grid', gridTemplateColumns: '76px 1fr', alignItems: 'center', gap: 10 }}><span className="mono small" style={{ color: 'var(--danger)', fontSize: 11 }}>{timeText(today)}</span><span style={{ height: 2, background: 'var(--danger)' }} /></div>}
          <div className={s.aItem}>
            <span className={s.aTime}>{timeText(e.at)}</span>
            {changing === e.id
              ? <ChangeTime event={e} events={all} closedDays={closed} onDone={() => done()} onCancel={closeChange} />
              : <Stop e={e} person={person} onChange={() => onChange(e)} onFinish={() => onFinish(e)} />}
          </div>
        </div>
      ))}
      {untimed.length > 0 && (
        <section style={{ display: 'grid', gap: 6, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <span className="eyebrow" style={{ color: 'var(--muted)' }}>Needs a time · {untimed.length}</span>
          {untimed.map((e) => changing === e.id
            ? <ChangeTime key={e.id} event={e} events={all} closedDays={closed} onDone={() => done()} onCancel={closeChange} />
            : <button key={e.id} type="button" className="linkbtn" style={{ textAlign: 'left', color: 'var(--accent)', fontWeight: 600 }} onClick={() => onChange(e)}>{KINDS[e.kind].one} #{e.order.number} · {e.evening ? `prefers ${e.evening}` : 'any evening'} · set a time</button>)}
        </section>
      )}
    </div>
  );
}

function Stop({ e, person, onChange, onFinish }) {
  const o = e.order;
  const tel = phoneHref('tel', e.phone);
  const sms = phoneHref('sms', e.phone, `Hi, it's Soul Restoration. On my way with order #${o.number}.`);
  const map = e.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.address)}` : null;
  return (
    <div className={s.aCard} data-kind={e.kind}>
      <Link href={`/staff/order?id=${o.id}`} style={{ color: 'var(--ink)', fontWeight: 700, textDecoration: 'none' }}>{KINDS[e.kind].one} #{o.number} · {pairs(o)} {pairs(o) === 1 ? 'pair' : 'pairs'}</Link>
      <span className="small muted" style={{ overflowWrap: 'anywhere' }}>{e.address}{o.assigned_to ? ` · ${firstName(person(o.assigned_to))}` : ''}</span>
      <div className="pills">
        {tel && <a className="pill" href={tel}>Call</a>}
        {sms && <a className="pill" href={sms}>Text</a>}
        {map && <a className="pill" href={map} target="_blank" rel="noreferrer">Map</a>}
        <button className="pill" onClick={onChange}>Change time</button>
        <button className="btn dark small" onClick={onFinish}>{e.kind === 'pickup' ? 'Collected' : 'Delivered'}</button>
      </div>
    </div>
  );
}
