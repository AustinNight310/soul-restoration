'use client';
// The signed-in customer's home. Orders and quotes come next; for now it confirms who you are.
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';

export default function Account() {
  const { ready, user, profile, isStaff, signOut } = useAuth();
  const router = useRouter();
  const wasIn = useRef(false); // signed in earlier on this page, so a missing user means they just signed out
  if (user) wasIn.current = true;

  useEffect(() => {
    if (!ready || user) return;
    // A sign-in link that has expired lands here with the error in the address.
    const expired = window.location.hash.includes('error');
    router.replace(wasIn.current ? '/sign-in?out=1' : expired ? '/sign-in?expired=1' : '/sign-in');
  }, [ready, user, router]);

  if (!ready || !user) return <p className="narrow muted" style={{ paddingTop: 32 }}>Loading…</p>;

  const name = profile?.full_name;
  return (
    <div className="narrow" style={{ paddingTop: 36, paddingBottom: 40, display: 'grid', gap: 16 }}>
      <div className="eyebrow">Your account</div>
      <h1 style={{ fontSize: 34 }}>{name ? `Hey ${name}.` : 'You’re signed in.'}</h1>
      <p style={{ margin: 0 }}>Signed in as <strong>{user.email}</strong>.</p>
      <div className="soft small" style={{ display: 'grid', gap: 4 }}>
        <strong>Your orders and quotes are coming here soon.</strong>
        <span className="muted">Until then, <Link href="/track">track an order</Link> with its number and this email.</span>
      </div>
      {isStaff && <Link href="/staff" className="btn dark block">Go to the bench</Link>}
      <Link href="/book" className="btn primary block">Book a pair</Link>
      <button className="btn ghost block" onClick={signOut}>Sign out</button>
    </div>
  );
}
