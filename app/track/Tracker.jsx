'use client';
// Look up an order with its number + the email used to book. No password needed.
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import OrderStatus from '../../components/OrderStatus';

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

      {order && <OrderStatus order={order} />}
    </div>
  );
}
