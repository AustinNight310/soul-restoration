'use client';
// The signed-in customer's home: their orders (open and past), quotes, and profile.
// Signing in links earlier orders booked with the same email (claim_my_orders).
// Staff see only their own orders here too: every query filters on user_id, not just row-level security.
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, money, STAGES, stageLabel, serviceSummary } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import OrderStatus from '../../components/OrderStatus';
import s from './account.module.css';

const DONE = ['picked_up', 'cancelled'];
const isExpired = (q) => q.status === 'priced' && q.expires_at && new Date(q.expires_at) < new Date();

export default function Account() {
  const { ready, user, profile, isStaff } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const wasIn = useRef(false); // signed in earlier on this page, so a missing user means they just signed out
  if (user) wasIn.current = true;

  const [orders, setOrders] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [claimed, setClaimed] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready || user) return;
    // A sign-in link that has expired lands here with the error in the address.
    const expired = window.location.hash.includes('error');
    router.replace(wasIn.current ? '/sign-in?out=1' : expired ? '/sign-in?expired=1' : '/sign-in');
  }, [ready, user, router]);

  const userId = user?.id;
  const load = useCallback(async () => {
    const [o, q] = await Promise.all([
      supabase.from('orders')
        .select('id, number, status, handoff, pickup_status, pickup_time, total_cents, created_at, email, shoe_model, order_items(name), order_pairs!order_pairs_order_id_fkey(shoe_model, position)')
        .eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('quote_requests')
        .select('id, number, kind, description, shoe_model, status, price_cents, turnaround, message, expires_at, created_at')
        .eq('user_id', userId).order('created_at', { ascending: false }),
    ]);
    if (o.error || q.error) setError('Couldn’t load your orders. Refresh to try again.');
    setOrders(o.data || []);
    setQuotes(q.data || []);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    supabase.rpc('claim_my_orders').then(({ data }) => {
      if (data && (data.orders > 0 || data.quotes > 0)) setClaimed(data);
      load();
    });
  }, [userId, load]);

  if (!ready || !user) return <p className="narrow muted" style={{ paddingTop: 32 }}>Loading…</p>;

  const tab = params.get('tab') || 'orders';
  const openNumber = parseInt(params.get('order') || '', 10);
  const openOrder = orders?.find((o) => o.number === openNumber);
  const waiting = quotes.filter((q) => q.status === 'priced' && !isExpired(q));

  if (openOrder) return <OrderDetail order={openOrder} />;

  return (
    <div className="narrow" style={{ paddingTop: 32, paddingBottom: 40, display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gap: 4 }}>
        <div className="eyebrow">Your account</div>
        <h1 style={{ fontSize: 34 }}>{profile?.full_name ? `Hey ${profile.full_name.replace(/[.!]+$/, '')}.` : 'Your pairs.'}</h1>
      </div>
      {claimed && <p className="notice" role="status">{claimedNote(claimed, user.email)}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <nav className="pills" aria-label="Account">
        <Link href="/account" className="pill" aria-current={tab === 'orders' ? 'page' : undefined}>Orders{orders ? ` · ${orders.length}` : ''}</Link>
        <Link href="/account?tab=quotes" className="pill" aria-current={tab === 'quotes' ? 'page' : undefined}>Quotes{quotes.length ? ` · ${quotes.length}` : ''}</Link>
        <Link href="/account?tab=profile" className="pill" aria-current={tab === 'profile' ? 'page' : undefined}>Profile</Link>
      </nav>

      {tab === 'orders' && (
        orders === null ? <p className="muted">Loading your orders…</p> : (
          <>
            {waiting.length > 0 && (
              <>
                <h2 className={s.h2}>Quote waiting on you</h2>
                {waiting.map((q) => <QuoteCard key={q.id} q={q} onAnswered={load} />)}
              </>
            )}
            <Orders orders={orders} />
            {isStaff && <Link href="/staff" className="btn dark block">Go to the bench</Link>}
          </>
        )
      )}
      {tab === 'quotes' && <Quotes quotes={quotes} onAnswered={load} />}
      {tab === 'profile' && <Profile />}
    </div>
  );
}

function claimedNote({ orders, quotes }, email) {
  const parts = [];
  if (orders) parts.push(`${orders} earlier ${orders === 1 ? 'order' : 'orders'}`);
  if (quotes) parts.push(`${quotes} ${quotes === 1 ? 'quote' : 'quotes'}`);
  return `We found ${parts.join(' and ')} booked with ${email} and added them here.`;
}

function Orders({ orders }) {
  const open = orders.filter((o) => !DONE.includes(o.status));
  const past = orders.filter((o) => DONE.includes(o.status));
  if (orders.length === 0) {
    return (
      <div className="soft" style={{ display: 'grid', gap: 10 }}>
        <strong>No orders yet.</strong>
        <span className="muted small">Book a pair and it shows up here, with every stage as it happens.</span>
        <Link href="/book" className="btn primary block">Book a pair</Link>
      </div>
    );
  }
  return (
    <>
      {open.length > 0 && <h2 className={s.h2}>In the shop</h2>}
      {open.map((o) => <OrderCard key={o.id} o={o} />)}
      {past.length > 0 && <h2 className={s.h2}>Past orders</h2>}
      {past.map((o) => <OrderCard key={o.id} o={o} past />)}
      <Link href="/book" className="btn primary block">Book another pair</Link>
    </>
  );
}

function OrderCard({ o, past }) {
  const pairs = [...(o.order_pairs || [])].sort((a, b) => a.position - b.position);
  const n = pairs.length || 1;
  const stage = STAGES.findIndex((x) => x.id === o.status);
  const badge = o.status === 'ready_for_pickup' ? 'ok' : DONE.includes(o.status) ? 'grey' : '';
  const shoes = pairs.map((p) => p.shoe_model).filter(Boolean).join(' · ') || o.shoe_model;
  return (
    <Link href={`/account?order=${o.number}`} className={s.order}>
      <span className={s.orderTop}>
        <span>#{o.number} · {n} {n === 1 ? 'pair' : 'pairs'}</span>
        <span className={`badge ${badge}`}>{stageLabel(o.status)}</span>
      </span>
      <strong>{serviceSummary(o.order_items) || 'Your order'}</strong>
      {!past && stage >= 0 && (
        <span className={s.bars} aria-hidden="true">
          {STAGES.map((x, i) => <span key={x.id} className={i <= stage ? s.on : undefined} />)}
        </span>
      )}
      {shoes && <span className="muted small">{shoes}</span>}
      {o.handoff === 'pickup' && o.pickup_status === 'confirmed' && o.pickup_time && !past && (
        <span className="small">Pickup confirmed: <strong>{o.pickup_time}</strong></span>
      )}
    </Link>
  );
}

function OrderDetail({ order }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    supabase.rpc('get_order_status', { p_number: order.number, p_email: order.email })
      .then(({ data, error }) => {
        if (error || !data) setError('Couldn’t load this order. Refresh to try again.');
        else setStatus(data);
      });
  }, [order.number, order.email]);

  return (
    <div className="narrow" style={{ paddingTop: 24, paddingBottom: 40, display: 'grid', gap: 16 }}>
      <Link href="/account" className="btn ghost small" style={{ justifySelf: 'start' }}>← My orders</Link>
      {error && <p className="error" role="alert">{error}</p>}
      {status ? <OrderStatus order={status} /> : !error && <p className="muted">Loading…</p>}
      <BenchPhotos orderId={order.id} />
      <p className="muted small" style={{ margin: 0 }}>Questions about this order? Text <strong>347-238-9320</strong> with #{order.number}.</p>
    </div>
  );
}

// The photos staff chose to share: check-in shots (the pair's condition on arrival) and bench progress.
function BenchPhotos({ orderId }) {
  const [photos, setPhotos] = useState([]);
  useEffect(() => {
    supabase.from('order_photos').select('id, path, kind, created_at').eq('order_id', orderId).eq('visible_to_customer', true)
      .order('created_at').then(async ({ data }) => {
        if (!data?.length) return;
        const { data: signed } = await supabase.storage.from('photos').createSignedUrls(data.map((p) => p.path), 3600);
        const url = Object.fromEntries((signed || []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl]));
        setPhotos(data.filter((p) => url[p.path]).map((p) => ({ ...p, url: url[p.path] })));
      });
  }, [orderId]);
  if (!photos.length) return null;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <h2 className={s.h2}>Photos from the bench</h2>
      <div className={s.photos}>
        {photos.map((p) => (
          <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className={s.photo}>
            <img src={p.url} alt={p.kind === 'intake' ? 'Check-in photo' : 'Bench photo'} />
            <span>{p.kind === 'intake' ? 'Check-in' : 'On the bench'}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

const QUOTE_STATUS = {
  new: { label: 'Pricing it', tone: 'warn' },
  priced: { label: 'Priced', tone: 'warn' },
  accepted: { label: 'Accepted', tone: 'ok' },
  declined: { label: 'Declined', tone: 'grey' },
  expired: { label: 'Expired', tone: 'grey' },
  cant_take: { label: 'Can’t take it', tone: 'grey' },
};

function Quotes({ quotes, onAnswered }) {
  if (quotes.length === 0) {
    return (
      <div className="soft" style={{ display: 'grid', gap: 10 }}>
        <strong>No quotes yet.</strong>
        <span className="muted small">Paint jobs and big orders are priced by quote. Send photos and get a price first.</span>
        <Link href="/quote" className="btn primary block">Ask for a paint quote</Link>
      </div>
    );
  }
  return quotes.map((q) => <QuoteCard key={q.id} q={q} onAnswered={onAnswered} />);
}

function QuoteCard({ q, onAnswered }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const st = QUOTE_STATUS[q.status] || { label: q.status, tone: 'grey' };
  const expired = isExpired(q);

  async function answer(accept) {
    setBusy(true); setMsg('');
    const { error } = await supabase.rpc('respond_to_quote', { p_id: q.id, p_accept: accept });
    setBusy(false);
    if (error) return setMsg(error.message);
    onAnswered();
  }

  return (
    <div className="card" style={{ display: 'grid', gap: 10 }}>
      <div className={s.orderTop}>
        <span>#{q.number} · {q.kind || 'Paint'}</span>
        <span className={`badge ${expired ? 'grey' : st.tone}`}>{expired ? 'Expired' : st.label}</span>
      </div>
      <strong>{q.shoe_model || q.kind || 'Quote request'}</strong>
      <span className="soft small" style={{ whiteSpace: 'pre-line' }}>“{q.description}”</span>
      {q.status === 'new' && <span className="small muted">Criss is looking it over and will reply with a price.</span>}
      {q.price_cents != null && ['priced', 'accepted'].includes(q.status) && (
        <span className="small">
          <strong style={{ fontFamily: 'var(--mono)' }}>{money(q.price_cents)}</strong>
          {q.turnaround ? ` · about ${q.turnaround}` : ''}
          {q.status === 'priced' && q.expires_at && !expired ? ` · good until ${new Date(q.expires_at).toLocaleDateString()}` : ''}
        </span>
      )}
      {q.message && ['priced', 'accepted'].includes(q.status) && <span className="small">“{q.message}”</span>}
      {q.status === 'accepted' && <span className="small muted">Criss will text you to set up the drop-off or pickup.</span>}
      {q.status === 'priced' && !expired && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn primary small" disabled={busy} onClick={() => answer(true)}>Accept</button>
          <button className="btn ghost small" disabled={busy} onClick={() => answer(false)}>No thanks</button>
        </div>
      )}
      {expired && <span className="small muted">This price has expired. <Link href="/quote">Send a new request</Link> and we’ll price it again.</span>}
      {msg && <p className="error" role="alert">{msg}</p>}
    </div>
  );
}

function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');

  async function save(e) {
    e.preventDefault();
    setBusy(true); setFlash('');
    const { error } = await supabase.from('profiles')
      .update({ full_name: name.trim() || null, phone: phone.trim() || null }).eq('id', user.id);
    setBusy(false);
    setFlash(error ? 'Didn’t save. Try again.' : 'Saved.');
    if (!error) refreshProfile();
  }

  return (
    <form onSubmit={save} style={{ display: 'grid', gap: 14 }}>
      <label className="field">Name<input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="field">Mobile, for pickup texts<input className="input" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      <div className="field">Email<span className="muted" style={{ fontWeight: 400 }}>{user.email}</span></div>
      {flash && <p className="small" role="status" style={{ margin: 0, color: flash === 'Saved.' ? 'var(--ok)' : 'var(--danger)' }}>{flash}</p>}
      <button className="btn primary block" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      <button type="button" className="btn ghost block" onClick={signOut}>Sign out</button>
    </form>
  );
}
