'use client';
// Paint and hefty-job quotes: price new requests, and see which ones customers accepted.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';

export default function QuotesPage() {
  const [quotes, setQuotes] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('quote_requests').select('*')
      .in('status', ['new', 'priced', 'accepted']).order('created_at', { ascending: true });
    if (error) setError('Couldn’t load quotes. Refresh to try again.');
    setQuotes(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div>
        <div className="eyebrow">Paint jobs and big orders</div>
        <h1 style={{ fontSize: 32 }}>Quotes</h1>
      </div>
      {error && <p className="error">{error}</p>}
      {quotes === null ? <p className="muted">Loading quotes…</p> : <Quotes quotes={quotes} onSaved={load} />}
    </>
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
        <span className={`badge ${q.status === 'accepted' ? 'ok' : q.status === 'priced' ? 'grey' : 'warn'}`}>
          {q.status === 'accepted' ? 'Accepted' : q.status === 'priced' ? 'Priced · waiting' : 'New'}
        </span>
      </div>
      <div className="soft small">“{q.description}”</div>
      {q.status === 'accepted' && <p className="small" style={{ margin: 0, color: 'var(--ok)' }}>The customer accepted. Text them to set up the drop-off or pickup.</p>}
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
