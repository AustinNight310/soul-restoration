'use client';
// The frame around every staff page: only workers and admins get past it (everyone else goes to
// /staff/sign-in), it loads the team once, and it holds the side menu.
// The database is what actually protects the data; this only decides what to show.
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { StaffContext, sameDay } from './staff-shared';
import s from '../staff.module.css';

const MENU = [
  { href: '/staff', label: 'Board' },
  { href: '/staff/search', label: 'Search & history' },
  { href: '/staff/pickups', label: 'Today’s pickups', count: 'pickups' },
  { href: '/staff/quotes', label: 'Quotes', count: 'quotes' },
];

export default function StaffShell({ children }) {
  const { ready, user, profile, role, isStaff, isAdmin, recovering, signOut } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const allowed = ready && user && isStaff && !recovering;
  const wasIn = useRef(false); // signed in earlier on this page, so a missing user means they just signed out
  if (allowed) wasIn.current = true;

  const [team, setTeam] = useState([]);
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (ready && !allowed) router.replace(wasIn.current && !user ? '/staff/sign-in?out=1' : '/staff/sign-in');
  }, [ready, allowed, user, router]);

  useEffect(() => {
    if (!allowed) return;
    supabase.from('profiles').select('id, email, full_name, role').in('role', ['worker', 'admin']).order('full_name')
      .then(({ data }) => setTeam(data || []));
  }, [allowed]);

  // Little numbers in the menu: new quotes, and pickups set for today.
  useEffect(() => {
    if (!allowed) return;
    Promise.all([
      supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('orders').select('pickup_at').eq('handoff', 'pickup').eq('pickup_status', 'confirmed').not('pickup_at', 'is', null).not('status', 'in', '(picked_up,cancelled)'),
    ]).then(([q, p]) => {
      const now = new Date();
      setCounts({ quotes: q.count || 0, pickups: (p.data || []).filter((o) => sameDay(new Date(o.pickup_at), now)).length });
    });
  }, [allowed, path]);

  const ctx = useMemo(() => ({
    userId: user?.id,
    email: user?.email,
    role,
    isAdmin,
    team,
    person: (id) => team.find((t) => t.id === id),
  }), [user?.id, user?.email, role, isAdmin, team]);

  if (!allowed) return <p className="narrow muted" style={{ paddingTop: 32 }}>Loading…</p>;

  return (
    <StaffContext.Provider value={ctx}>
      <div className={`wrap ${s.shell}`}>
        <nav className={s.side} aria-label="Staff" data-print-hide>
          <div className={s.who}>
            <strong>{profile?.full_name || user.email}</strong>
            <span className="badge">{role === 'admin' ? 'Admin' : 'Worker'}</span>
          </div>
          {MENU.map((m) => {
            const on = m.href === '/staff' ? path === '/staff' || path.startsWith('/staff/order') : path.startsWith(m.href);
            const n = m.count && counts[m.count];
            return (
              <Link key={m.href} href={m.href} className={s.sideLink} aria-current={on ? 'page' : undefined}>
                {m.label}{n ? <span className={s.sideCount}>{n}{m.count === 'quotes' ? ' new' : ''}</span> : null}
              </Link>
            );
          })}
          <button type="button" className={s.sideLink} onClick={signOut}>Sign out</button>
        </nav>
        <div className={s.content}>{children}</div>
      </div>
    </StaffContext.Provider>
  );
}
