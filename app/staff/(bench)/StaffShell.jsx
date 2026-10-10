'use client';
// The frame around every staff page: only workers and admins get past it (everyone else goes to
// /staff/sign-in), it loads the team and the stations once, and it holds the side menu, the station
// this phone is at, and the Scan button.
// The database is what actually protects the data; this only decides what to show.
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { useHere, setHere, parseCode } from '../../../lib/stations';
import Scanner from '../../../components/qr/Scanner';
import { StaffContext, sameDay } from './staff-shared';
import s from '../staff.module.css';

const MENU = [
  { href: '/staff', label: 'Board' },
  { href: '/staff/floor', label: 'Floor' },
  { href: '/staff/calendar', label: 'Calendar' },
  { href: '/staff/search', label: 'Search & history' },
  { href: '/staff/pickups', label: 'Today’s pickups', count: 'pickups' },
  { href: '/staff/quotes', label: 'Quotes', count: 'quotes' },
  { href: '/staff/stations', label: 'Stations & QR' },
];
// Admins only. The pages check too, and the database is what actually enforces it.
const ADMIN_MENU = [
  { href: '/staff/menu', label: 'Menu & prices' },
  { href: '/staff/team', label: 'Team' },
  { href: '/staff/reports', label: 'Reports' },
  { href: '/staff/settings', label: 'Settings & activity' },
];

export default function StaffShell({ children }) {
  const { ready, user, profile, role, isStaff, isAdmin, recovering, signOut } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const allowed = ready && user && isStaff && !recovering;
  const wasIn = useRef(false); // signed in earlier on this page, so a missing user means they just signed out
  if (allowed) wasIn.current = true;

  const [team, setTeam] = useState([]);
  const [stations, setStations] = useState([]);
  const [counts, setCounts] = useState({});
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const here = useHere();

  useEffect(() => {
    // a scanned QR opened while signed out comes back to the same page after signing in
    const back = `${window.location.pathname}${window.location.search}`;
    const next = back.startsWith('/staff/') && back !== '/staff/' ? `next=${encodeURIComponent(back)}` : '';
    if (ready && !allowed) router.replace(wasIn.current && !user ? '/staff/sign-in?out=1' : `/staff/sign-in${next ? `?${next}` : ''}`);
  }, [ready, allowed, user, router]);

  useEffect(() => {
    if (!allowed) return;
    supabase.from('profiles').select('id, email, full_name, role').in('role', ['worker', 'admin']).order('full_name')
      .then(({ data }) => setTeam(data || []));
  }, [allowed]);

  const loadStations = useCallback(() => (
    supabase.from('stations').select('*').order('sort').then(({ data }) => setStations(data || []))
  ), []);
  useEffect(() => { if (allowed) loadStations(); }, [allowed, loadStations]);

  // One handler for everything the camera can read: a station poster, a pair ticket, or a typed code.
  const onCode = useCallback(async (text) => {
    const code = parseCode(text);
    setScanMsg('');
    if (code?.station) {
      setHere(code.station, true);
      setScanning(false);
      if (!path.startsWith('/staff/pair')) router.push(`/staff/station?id=${encodeURIComponent(code.station)}`);
      return true;
    }
    if (code?.pair) {
      setScanning(false);
      router.push(`/staff/pair?id=${code.pair}&qr=1`);
      return true;
    }
    if (code?.order) {
      const { data } = await supabase.from('orders').select('id, order_pairs!order_pairs_order_id_fkey(id, position)').eq('number', code.order).maybeSingle();
      if (!data) { setScanMsg(`No order #${code.order}.`); return false; }
      const pairs = data.order_pairs || [];
      const pair = code.position ? pairs.find((p) => p.position === code.position) : pairs.length === 1 ? pairs[0] : null;
      setScanning(false);
      if (pair) router.push(`/staff/pair?id=${pair.id}`);
      else router.push(`/staff/order?id=${data.id}`);
      return true;
    }
    setScanMsg('That isn’t one of our codes. Scan a station poster or a pair ticket.');
    return false;
  }, [path, router]);
  const closeScanner = useCallback(() => { setScanning(false); setScanMsg(''); }, []);

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
    stations,
    station: (id) => stations.find((x) => x.id === id),
    reloadStations: loadStations,
    openScanner: () => setScanning(true),
  }), [user?.id, user?.email, role, isAdmin, team, stations, loadStations]);
  const hereStation = here && stations.find((x) => x.id === here.id);

  if (!allowed) return <p className="narrow muted" style={{ paddingTop: 32 }}>Loading…</p>;

  return (
    <StaffContext.Provider value={ctx}>
      <div className={`wrap ${s.shell}`}>
        <nav className={s.side} aria-label="Staff" data-print-hide>
          <div className={s.who}>
            <strong>{profile?.full_name || user.email}</strong>
            <span className="badge">{role === 'admin' ? 'Admin' : 'Worker'}</span>
          </div>
          <div className={s.sideLinks}>
          {[...MENU, ...(isAdmin ? [{ group: 'Admin' }, ...ADMIN_MENU] : [])].map((m) => {
            if (m.group) return <div key={m.group} className={s.sideGroup}>{m.group}</div>;
            const on = m.href === '/staff' ? path === '/staff' || path.startsWith('/staff/order') : path.startsWith(m.href);
            const n = m.count && counts[m.count];
            return (
              <Link key={m.href} href={m.href} className={s.sideLink} aria-current={on ? 'page' : undefined}>
                {m.label}{n ? <span className={s.sideCount}>{n}{m.count === 'quotes' ? ' new' : ''}</span> : null}
              </Link>
            );
          })}
          <button type="button" className={s.sideLink} onClick={signOut}>Sign out</button>
          </div>
        </nav>
        <div className={s.content}>
          <div className={s.hereBar} data-print-hide>
            <Link href={hereStation ? `/staff/station?id=${hereStation.id}` : '/staff/station'} className={s.hereChip}>
              <span className={s.hereDot} data-on={hereStation ? 'true' : 'false'} aria-hidden="true" />
              {hereStation ? <>At <strong>{hereStation.name}</strong></> : 'No station set'}
            </Link>
            <button type="button" className="btn primary small" onClick={() => setScanning(true)}>Scan</button>
          </div>
          {children}
        </div>
      </div>
      {scanning && (
        <Scanner title="Scan a station or a pair ticket" message={scanMsg} onCode={onCode} onClose={closeScanner} />
      )}
    </StaffContext.Provider>
  );
}
