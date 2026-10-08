'use client';
// Look up an order with its number + the email used to book. No password needed.
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase, money, STAGES, stageLabel } from '../../lib/supabase';

export default function Tracker() {
  const params = useSearchParams();
  const [number, setNumber] = useState(params.get('n') || '');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function lookup(e) {
    e.preventDefault();
    setError('');
    setOrder(null);
    const n = parseInt(String(number).replace(/\D/g, ''), 10);
    if (!n || !email.trim()) return setError('Enter your order number and email.');
    setBusy(true);
    const { data, error } = await supabase.rpc('get_order_status', { p_number: n, p_email: email });
    setBusy(false);
    if (error) return setError('Something went wrong. Try again.');
    if (!data) return setError('No order matches that number and email.');
    setOrder(data);
  }

  const current = order ? STAGES.findIndex((s) => s.id === order.status) : -1;

  return (
    <div className="narrow" style={{ paddingTop: 36, paddingBottom: 40, display: 'grid', gap: 20 }}>
      <h1 style={{ fontSize: 36, lineHeight: 1.1 }}>Where's my pair?</h1>
      <form onSubmit={lookup} style={{ display: 'grid', gap: 12 }}>
        <div className="row2">
          <label className="field">Order number
            <input className="input" inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="#1004" />
          </label>
          <label className="field">Email
            <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
        </div>
        <button className="btn primary block" disabled={busy}>{busy ? 'Looking…' : 'Find my order'}</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}

      {order && (
        <div className="card" style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div className="muted small" style={{ fontFamily: 'var(--mono)' }}>ORDER #{order.number}</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 24 }}>{order.shoe_model || 'Your pair'}</div>
            </div>
            <span className={`badge ${order.status === 'ready_for_pickup' ? 'ok' : ''}`}>{stageLabel(order.status)}</span>
          </div>

          {order.status !== 'cancelled' && (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 0 }}>
              {STAGES.map((s, i) => {
                const doneStage = i < current, now = i === current;
                const ev = order.events.find((e) => e.status === s.id);
                return (
                  <li key={s.id} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', boxSizing: 'border-box',
                        background: doneStage ? 'var(--accent)' : '#fff',
                        border: now ? '4px solid var(--accent)' : doneStage ? 'none' : '2px solid rgba(16,21,27,0.22)' }} />
                      {i < STAGES.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 26, background: doneStage ? 'var(--accent)' : 'var(--line)' }} />}
                    </div>
                    <div style={{ paddingBottom: 12, marginTop: -3 }}>
                      <div style={{ fontWeight: 600, color: i > current ? 'var(--muted)' : 'var(--ink)' }}>{s.label}</div>
                      {ev && <div className="muted small">{new Date(ev.at).toLocaleDateString()}{ev.note ? ` · ${ev.note}` : ''}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="soft small" style={{ display: 'grid', gap: 4 }}>
            {order.pairs?.length > 0 ? order.pairs.map((p) => (
              <div key={p.position} style={{ display: 'grid', gap: 2, paddingBottom: 6 }}>
                <strong>{p.position}. {p.model}</strong>
                {p.items.map((it) => <ItemLine key={it.name} item={it} />)}
              </div>
            )) : order.items.map((it) => <ItemLine key={it.name} item={it} />)}
            {order.discount_cents > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ok)' }}><span>Deep clean bundle savings</span><span style={{ fontFamily: 'var(--mono)' }}>−{money(order.discount_cents)}</span></div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 6, marginTop: 2 }}><strong>Total</strong><span style={{ fontFamily: 'var(--mono)' }}>{money(order.total_cents)}</span></div>
          </div>

          {order.handoff === 'pickup' ? (
            <p className="small" style={{ margin: 0 }}>
              {order.pickup_status === 'confirmed' ? <>Pickup confirmed{order.pickup_time ? `: ${order.pickup_time}` : ''}.</> : 'Pickup requested. Criss will text you to confirm the time.'}
            </p>
          ) : order.shop_address && (
            <p className="small" style={{ margin: 0 }}><strong>Drop-off / pickup:</strong> {order.shop_address}. {order.shop_hours}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ItemLine({ item }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span>{item.name}</span>
      <span style={{ fontFamily: 'var(--mono)' }}>{item.needs_quote ? 'priced after review' : money(item.price_cents)}</span>
    </div>
  );
}
