'use client';
// Paint quote request. Photos are added by text for now; uploads come after the shop test.
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

const KINDS = ['Recolor', 'Touch-up', 'Custom design', 'Something else'];

export default function QuotePage() {
  const [kind, setKind] = useState('Recolor');
  const [form, setForm] = useState({ description: '', model: '', size: '', link: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);
  const { user } = useAuth();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { data, error } = await supabase.rpc('create_quote_request', {
      p_email: user ? user.email : form.email, p_kind: kind, p_description: form.description,
      p_shoe_model: form.model, p_shoe_size: form.size, p_inspiration_url: form.link,
    });
    setBusy(false);
    if (error) return setError(error.message || 'Something went wrong. Try again.');
    setSent(data);
  }

  if (sent) {
    return (
      <div className="narrow" style={{ paddingTop: 40, paddingBottom: 40, display: 'grid', gap: 16 }}>
        <span className="badge" style={{ justifySelf: 'start' }}>Request #{sent.number}</span>
        <h1 style={{ fontSize: 38 }}>Request sent.</h1>
        <p style={{ margin: 0 }}>Text a few photos of the pair (side, top and sole) to <strong>347-238-9320</strong> with your request number. We’ll reply with a price. Nothing is charged until you accept.</p>
        {user && <Link href="/account?tab=quotes" className="btn primary block">See it in your account</Link>}
        <Link href="/" className="btn ghost block">Back to home</Link>
      </div>
    );
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={submit} className="narrow" style={{ paddingTop: 36, paddingBottom: 40, display: 'grid', gap: 18 }}>
      <div className="eyebrow">Paint jobs · from $50</div>
      <h1 style={{ fontSize: 36, lineHeight: 1.1 }}>Show us the idea.</h1>
      <p className="muted" style={{ margin: 0 }}>Paint work is priced per pair. Describe what you want and we'll reply with a price. Quotes are good for 7 days.</p>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>What kind of work?</div>
        <div className="pills">
          {KINDS.map((k) => <button key={k} type="button" className="pill" aria-pressed={kind === k} onClick={() => setKind(k)}>{k}</button>)}
        </div>
      </div>
      <label className="field">Describe what you want
        <textarea className="input" value={form.description} onChange={set('description')} placeholder="Recolor the swoosh panels forest green, keep the midsole white…" required />
      </label>
      <div className="row2">
        <label className="field">Brand and model<input className="input" value={form.model} onChange={set('model')} /></label>
        <label className="field">Size<input className="input" value={form.size} onChange={set('size')} /></label>
      </div>
      <label className="field">Inspiration link <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
        <input className="input" type="url" value={form.link} onChange={set('link')} placeholder="Instagram post, Pinterest…" />
      </label>
      {user ? (
        <div className="soft small">Sending as <strong>{user.email}</strong>. The price shows up in your account.</div>
      ) : (
        <label className="field">Email
          <input className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        </label>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn primary block" disabled={busy}>{busy ? 'Sending…' : 'Send quote request'}</button>
    </form>
  );
}
