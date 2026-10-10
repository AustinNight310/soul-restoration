'use client';
// Customer sign-in: no password, we email a link that signs you in.
// Booking and tracking still work without an account.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function CustomerSignIn() {
  const { ready, user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (ready && user) router.replace('/account'); }, [ready, user, router]);

  async function send(e) {
    e?.preventDefault();
    setMsg('');
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    setBusy(false);
    if (error) return setMsg(error.status === 429 ? 'Too many tries. Wait a minute, then send another link.' : error.message);
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <div className="narrow" style={{ paddingTop: 36, paddingBottom: 40, display: 'grid', gap: 14 }}>
        <div className="eyebrow">Check your email</div>
        <h1 style={{ fontSize: 34 }}>Your link is on its way.</h1>
        <p style={{ margin: 0 }}>We sent a sign-in link to <strong>{sentTo}</strong>. Open it on this device and you'll land in your account.</p>
        <div className="soft small" style={{ display: 'grid', gap: 4 }}>
          <span>The link works once.</span>
          <span className="muted">Not there? Check spam, or wait a minute and send another.</span>
        </div>
        {msg && <p className="error" role="alert">{msg}</p>}
        <button className="btn ghost block" disabled={busy} onClick={() => send()}>{busy ? 'Sending…' : 'Send another link'}</button>
        <button className="btn block" style={{ color: 'var(--accent)' }} onClick={() => { setSentTo(''); setMsg(''); }}>Use a different email</button>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="narrow" style={{ paddingTop: 36, paddingBottom: 40, display: 'grid', gap: 14 }}>
      {params.get('out') && <p className="notice" role="status">You're signed out.</p>}
      {params.get('expired') && <p className="error" role="alert">That link has expired or was already used. Send yourself a new one.</p>}
      <div className="eyebrow">Your account</div>
      <h1 style={{ fontSize: 34 }}>Sign in to see your pairs.</h1>
      <p className="muted" style={{ margin: 0 }}>No password needed. We'll email you a link that signs you in.</p>
      <label className="field">Email<input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      {msg && <p className="error" role="alert">{msg}</p>}
      <button className="btn primary block" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
      <p className="small muted" style={{ margin: 0 }}>Just want a status check? <Link href="/track">Track an order</Link> with its number and email.</p>
      <p className="small muted" style={{ margin: 0 }}>Work at the shop? <Link href="/staff/sign-in">Staff sign-in</Link></p>
    </form>
  );
}
