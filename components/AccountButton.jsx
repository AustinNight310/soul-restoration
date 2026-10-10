'use client';
// Header account control: "Sign in" when signed out, otherwise a round initial that opens a small menu.
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';

export default function AccountButton() {
  const { ready, user, profile, isStaff, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const path = usePathname();
  const router = useRouter();

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  // Keep the space so the header doesn't jump once we know who's signed in.
  if (!ready) return <span className="account" aria-hidden="true" style={{ width: 40 }} />;
  if (!user) {
    return <Link href="/sign-in" className="account btn ghost small">Sign in</Link>;
  }

  const name = profile?.full_name || user.email;
  async function out() {
    setOpen(false);
    const toStaff = path.startsWith('/staff');
    await signOut();
    router.replace(toStaff ? '/staff/sign-in?out=1' : '/sign-in?out=1');
  }

  return (
    <div className="account" ref={box} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      <button type="button" className="avatar" aria-label="Account menu" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        {name.trim().charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="account-menu" role="menu">
          <div className="account-who">
            {profile?.full_name && <strong>{profile.full_name}</strong>}
            <span className="muted small">{user.email}</span>
          </div>
          {isStaff && <Link role="menuitem" href="/staff">The bench</Link>}
          <Link role="menuitem" href="/account">My account</Link>
          <button role="menuitem" type="button" className="account-out" onClick={out}>Sign out</button>
        </div>
      )}
    </div>
  );
}
