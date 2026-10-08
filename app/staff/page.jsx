'use client';
// Staff dashboard: sign in, see every order by stage, move orders along, confirm pickups, price quotes.
// The database only lets accounts marked as staff see or change any of this.
import { useEffect, useState, useCallback } from 'react';
import { supabase, money, STAGES, stageLabel } from '../../lib/supabase';
import s from './staff.module.css';

export default function StaffPage() {
  const [session, setSession] = useState(undefined);
  const [isStaff, setIsStaff] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsStaff(null); return; }
    supabase.from('profiles').select('role').eq('id', session.user.id).single()
      .then(({ data }) => setIsStaff(data?.role === 'staff'));
  }, [session]);

  if (session === undefined) return <p className="narrow muted" style={{ paddingTop: 32 }}>Loading…</p>;
  if (!session) return <SignIn />;
  if (isStaff === null) return <p className="narrow muted" style={{ paddingTop: 32 }}>Checking access…</p>;
  if (!isStaff) {
    return (
      <div className="narrow" style={{ paddingTop: 36, display: 'grid', gap: 14 }}>
        <h1 style={{ fontSize: 32 }}>Almost there.</h1>
        <p style={{ margin: 0 }}>You're signed in as <strong>{session.user.email}</strong>, but this account isn't set up as staff yet. Ask Brawel to turn on staff access, then refresh.</p>
        <button className="btn ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    );
  }
  return <Dashboard email={session.user.email} userId={session.user.id} />;
}

function SignIn() {
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    const fn = mode === 'in' ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error, data } = await fn.call(supabase.auth, { email, password });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (mode === 'up' && !data.session) setMsg('Check your email to confirm the account, then sign in here.');
  }

  return (
    <form onSubmit={submit} className="narrow" style={{ paddingTop: 36, paddingBottom: 40, display: 'grid', gap: 14 }}>
      <div className="eyebrow">Staff</div>
      <h1 style={{ fontSize: 34 }}>{mode === 'in' ? 'Sign in to the bench.' : 'Create a staff login.'}</h1>
      <label className="field">Email<input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label className="field">Password<input className="input" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      {msg && <p className="error" role="status">{msg}</p>}
      <button className="btn primary block" disabled={busy}>{busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create login'}</button>
      <button type="button" className="btn ghost block" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
        {mode === 'in' ? 'First time? Create a staff login' : 'Have a login? Sign in'}
      </button>
    </form>
  );
}

const COLUMNS = [
  { id: 'booked', title: 'Booked · waiting for pair' },
  { id: 'received', title: 'Received' },
  { id: 'working', title: 'On the bench', statuses: ['inspected', 'in_restoration'] },
  { id: 'ready_for_pickup', title: 'Ready for pickup' },
];

function Dashboard({ email, userId }) {
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [o, q] = await Promise.all([
      supabase.from('orders').select('*, order_items(name, price_cents, needs_quote, pair_id), order_pairs!order_pairs_order_id_fkey(id, position, shoe_model, shoe_size, shoe_color, notes), order_events(status, note, created_at)')
        .not('status', 'in', '(picked_up,cancelled)').order('created_at', { ascending: true }),
      supabase.from('quote_requests').select('*').in('status', ['new', 'priced']).order('created_at', { ascending: true }),
    ]);
    if (o.error || q.error) setError('Couldn’t load orders. Refresh to try again.');
    setOrders(o.data || []);
    setQuotes(q.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = orders.find((o) => o.id === openId);
  const newQuotes = quotes.filter((q) => q.status === 'new').length;

  return (
    <div className="wrap" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div className={s.top}>
        <div>
          <div className="eyebrow">Staff · {email}</div>
          <h1 style={{ fontSize: 32 }}>The bench</h1>
        </div>
        <div className="pills">
          <button className="pill" aria-pressed={tab === 'orders'} onClick={() => setTab('orders')}>Orders · {orders.length}</button>
          <button className="pill" aria-pressed={tab === 'quotes'} onClick={() => setTab('quotes')}>Quotes{newQuotes ? ` · ${newQuotes} new` : ''}</button>
          <button className="pill" onClick={load}>Refresh</button>
          <button className="pill" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      {tab === 'orders' && (
        open ? (
          <OrderDetail order={open} userId={userId} onBack={() => setOpenId(null)} onSaved={load} />
        ) : (
          <div className={s.board}>
            {COLUMNS.map((col) => {
              const list = orders.filter((o) => (col.statuses || [col.id]).includes(o.status));
              return (
                <section key={col.id} className={s.col}>
                  <h2 className={s.colTitle}>{col.title}<span>{list.length}</span></h2>
                  {list.length === 0 && <p className="muted small" style={{ margin: 4 }}>Nothing here.</p>}
                  {list.map((o) => (
                    <button key={o.id} className={s.ticket} onClick={() => setOpenId(o.id)}>
                      <span className={s.ticketTop}>
                        <span>#{o.number}</span>
                        {o.handoff === 'pickup'
                          ? <span className={`badge ${o.pickup_status === 'confirmed' ? 'ok' : 'warn'}`}>{o.pickup_status === 'confirmed' ? 'Pickup set' : 'Pickup req.'}</span>
                          : <span className="badge grey">Drop-off</span>}
                      </span>
                      <strong>{itemSummary(o.order_items)}</strong>
                      <span className="muted small">{o.shoe_model || 'Pair'}{o.shoe_size ? ` · ${o.shoe_size}` : ''}</span>
                      {o.status === 'inspected' || o.status === 'in_restoration' ? <span className="small">{stageLabel(o.status)}</span> : null}
                    </button>
                  ))}
                </section>
              );
            })}
          </div>
        )
      )}

      {tab === 'quotes' && <Quotes quotes={quotes} onSaved={load} />}
    </div>
  );
}

function OrderDetail({ order, userId, onBack, onSaved }) {
  const idx = STAGES.findIndex((x) => x.id === order.status);
  const nextStage = STAGES[idx + 1];
  const [internal, setInternal] = useState(order.internal_notes || '');
  const [checkin, setCheckin] = useState(order.checkin_condition || '');
  const [pickupTime, setPickupTime] = useState(order.pickup_time || '');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');

  async function update(fields, eventStatus, note) {
    setBusy(true); setFlash('');
    const { error } = await supabase.from('orders').update(fields).eq('id', order.id);
    if (!error && eventStatus) {
      await supabase.from('order_events').insert({ order_id: order.id, status: eventStatus, note, created_by: userId });
    }
    setBusy(false);
    setFlash(error ? 'Didn’t save. Try again.' : 'Saved.');
    if (!error) onSaved();
  }

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 760 }}>
      <button className="btn ghost small" style={{ justifySelf: 'start' }} onClick={onBack}>← All orders</button>
      <div>
        <div className="muted small" style={{ fontFamily: 'var(--mono)' }}>#{order.number} · {order.handoff === 'pickup' ? 'PICKUP' : 'DROP-OFF'} · {money(order.total_cents)}</div>
        <h2 style={{ fontSize: 28 }}>{itemSummary(order.order_items)}</h2>
        <div className="muted">{[order.shoe_model, order.shoe_size, order.shoe_color].filter(Boolean).join(' · ')}</div>
        {order.discount_cents > 0 && <div className="small" style={{ color: 'var(--ok)' }}>Includes {money(order.discount_cents)} deep clean bundle savings</div>}
      </div>

      {order.order_pairs.length > 0 && <PairList order={order} />}

      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, minmax(0,1fr))`, gap: 4 }}>
          {STAGES.map((st, i) => (
            <div key={st.id}>
              <div style={{ height: 6, borderRadius: 3, background: i <= idx ? 'var(--accent)' : 'var(--line)' }} />
              <div className="small" style={{ marginTop: 6, fontWeight: i === idx ? 700 : 400, color: i <= idx ? 'var(--ink)' : 'var(--muted)', fontSize: 12 }}>{st.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {nextStage && (
            <button className="btn primary" disabled={busy} onClick={() => update({ status: nextStage.id }, nextStage.id, null)}>
              Move to: {nextStage.label} →
            </button>
          )}
          {idx > 0 && (
            <button className="btn ghost" disabled={busy} onClick={() => update({ status: STAGES[idx - 1].id }, STAGES[idx - 1].id, 'Moved back')}>Undo last move</button>
          )}
        </div>
        <p className="muted small" style={{ margin: 0 }}>The customer sees each stage on their tracking page. Status emails come once the business email is set up.</p>
      </div>

      {order.handoff === 'pickup' && (
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <strong>Pickup</strong>
          <div className="small">{order.pickup_address}<br />Mobile: <strong>{order.pickup_phone}</strong>{order.pickup_evening ? ` · prefers ${order.pickup_evening}` : ''}</div>
          <label className="field">Confirmed time
            <input className="input" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} placeholder="e.g. Tue 6:30pm" />
          </label>
          <button className="btn dark" disabled={busy || !pickupTime.trim()}
            onClick={() => update({ pickup_status: 'confirmed', pickup_time: pickupTime }, order.status, `Pickup confirmed for ${pickupTime}`)}>
            Mark pickup confirmed
          </button>
          <p className="muted small" style={{ margin: 0 }}>Text the customer first, then mark it here so their tracking page shows the time.</p>
        </div>
      )}

      <div className="card" style={{ display: 'grid', gap: 12 }}>
        {order.customer_notes && <div className="soft small"><strong>Customer says:</strong> “{order.customer_notes}”</div>}
        <label className="field">Check-in condition
          <input className="input" value={checkin} onChange={(e) => setCheckin(e.target.value)} placeholder="e.g. heel already scuffed at drop-off" />
        </label>
        <label className="field">Internal note <span className="muted" style={{ fontWeight: 400 }}>(customer never sees this)</span>
          <textarea className="input" value={internal} onChange={(e) => setInternal(e.target.value)} />
        </label>
        <button className="btn ghost" disabled={busy} onClick={() => update({ internal_notes: internal, checkin_condition: checkin })}>Save notes</button>
        <div className="muted small">Customer: {order.email}{order.photo_consent ? ' · OK to post photos' : ' · no photo posting'}</div>
      </div>

      {flash && <p className="small" role="status" style={{ color: flash === 'Saved.' ? 'var(--ok)' : 'var(--danger)' }}>{flash}</p>}

      <button className="btn ghost small" style={{ justifySelf: 'start', color: 'var(--danger)' }} disabled={busy}
        onClick={() => update({ status: 'cancelled' }, 'cancelled', 'Cancelled by staff').then(onBack)}>
        Cancel this order
      </button>
    </div>
  );
}

// "Deep cleaning ×6 + Icing bottoms": one name per service, counted across pairs
function itemSummary(items) {
  const counts = new Map();
  items.forEach((i) => counts.set(i.name, (counts.get(i.name) || 0) + 1));
  return [...counts].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name)).join(' + ');
}

function PairList({ order }) {
  const pairs = [...order.order_pairs].sort((a, b) => a.position - b.position);
  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <strong>{pairs.length} {pairs.length === 1 ? 'pair' : 'pairs'}</strong>
      {pairs.map((p) => {
        const items = order.order_items.filter((i) => i.pair_id === p.id);
        return (
          <div key={p.id} style={{ display: 'grid', gap: 4, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
            <div><span className="muted small" style={{ fontFamily: 'var(--mono)' }}>PAIR {p.position}</span> <strong>{p.shoe_model}</strong>
              <span className="muted small">{[p.shoe_size, p.shoe_color].filter(Boolean).map((x) => ` · ${x}`).join('')}</span></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {items.map((i) => (
                <span key={i.name} className={`badge ${i.needs_quote ? 'warn' : 'grey'}`}>{i.name}{i.needs_quote ? ' · needs quote' : ` · ${money(i.price_cents)}`}</span>
              ))}
            </div>
            {p.notes && <div className="small">“{p.notes}”</div>}
          </div>
        );
      })}
    </div>
  );
}

function Quotes({ quotes, onSaved }) {
  if (quotes.length === 0) return <p className="muted">No quote requests waiting.</p>;
  return <div style={{ display: 'grid', gap: 12, maxWidth: 760 }}>{quotes.map((q) => <QuoteCard key={q.id} q={q} onSaved={onSaved} />)}</div>;
}

function QuoteCard({ q, onSaved }) {
  const [price, setPrice] = useState(q.price_cents ? String(q.price_cents / 100) : '');
  const [turnaround, setTurnaround] = useState(q.turnaround || '');
  const [message, setMessage] = useState(q.message || '');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');

  async function save(status) {
    setBusy(true);
    const cents = Math.round(parseFloat(price) * 100);
    const fields = status === 'cant_take' ? { status } : {
      status, price_cents: Number.isFinite(cents) ? cents : null, turnaround, message,
      expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
    };
    const { error } = await supabase.from('quote_requests').update(fields).eq('id', q.id);
    setBusy(false);
    setFlash(error ? 'Didn’t save.' : 'Saved. Text the customer the price.');
    if (!error) onSaved();
  }

  return (
    <div className="card" style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <strong>#{q.number} · {q.kind || 'Paint'}{q.shoe_model ? ` · ${q.shoe_model}` : ''}</strong>
        <span className={`badge ${q.status === 'priced' ? 'ok' : 'warn'}`}>{q.status === 'priced' ? 'Priced' : 'New'}</span>
      </div>
      <div className="soft small">“{q.description}”</div>
      <div className="muted small">{q.email}{q.inspiration_url ? <> · <a href={q.inspiration_url} target="_blank" rel="noreferrer">inspiration</a></> : null}</div>
      <div className="row2">
        <label className="field">Price ($)<input className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        <label className="field">Turnaround<input className="input" value={turnaround} onChange={(e) => setTurnaround(e.target.value)} placeholder="e.g. 5 days" /></label>
      </div>
      <label className="field">Message to customer<textarea className="input" value={message} onChange={(e) => setMessage(e.target.value)} /></label>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn primary" disabled={busy || !price} onClick={() => save('priced')}>Save price</button>
        <button className="btn ghost" disabled={busy} style={{ color: 'var(--danger)' }} onClick={() => save('cant_take')}>Can't take this job</button>
      </div>
      {flash && <p className="small" role="status" style={{ margin: 0 }}>{flash}</p>}
    </div>
  );
}
