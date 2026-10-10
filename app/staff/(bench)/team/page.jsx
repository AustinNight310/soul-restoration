'use client';
// Team (admins): add someone by email, change worker / admin, remove access, cancel a waiting invite.
// Everything goes through set_staff_role(), which also stops admins changing their own role.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { AdminOnly, useStaff } from '../staff-shared';
import s from '../../staff.module.css';

const CAN = [
  ['Board, move stages', true],
  ['Notes, photos, tickets', true],
  ['Pickups', true],
  ['Search & history', true],
  ['Suggest a quote price', true],
  ['Set quote prices', false],
  ['Cancel an order', false],
  ['Menu & prices', false],
  ['Team', false],
  ['Reports, settings, activity', false],
];

export default function TeamPage() {
  return <AdminOnly><Team /></AdminOnly>;
}

function Team() {
  const { userId } = useStaff();
  const [people, setPeople] = useState(null);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('worker');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    const [t, i] = await Promise.all([
      supabase.rpc('team_members'),
      supabase.from('staff_invites').select('email, role, created_at').order('created_at'),
    ]);
    if (t.error) setMsg({ error: 'Couldn’t load the team. Refresh to try again.' });
    setPeople(t.data || []);
    setInvites(i.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setStaffRole(who, newRole, done) {
    setBusy(true); setMsg(null);
    const { data, error } = await supabase.rpc('set_staff_role', { p_email: who, p_role: newRole });
    setBusy(false);
    if (error) return setMsg({ error: error.message });
    setMsg({ ok: done(data.status) });
    load();
  }

  function add(e) {
    e.preventDefault();
    const who = email.trim();
    setStaffRole(who, role, (status) => {
      setEmail('');
      return status === 'invited'
        ? `${who} is added. They get access once they set up a login at /staff/sign-in with this email.`
        : `${who} already had an account and is now ${role === 'admin' ? 'an admin' : 'a worker'}.`;
    });
  }

  if (!people) return <p className="muted">Loading the team…</p>;

  return (
    <>
      <div><div className="eyebrow">Admin</div><h1 style={{ fontSize: 32 }}>Team</h1></div>
      {msg?.error && <p className="error" role="alert">{msg.error}</p>}
      {msg?.ok && <p className="notice" role="status">{msg.ok}</p>}
      <div className={s.detail}>
        <div className={s.main}>
          <form className="card" onSubmit={add} style={{ display: 'grid', gap: 12 }}>
            <strong>Add someone</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
              <label className="field" style={{ flex: '1 1 220px' }}>Email<input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com" /></label>
              <label className="field" style={{ flex: '0 1 140px' }}>Role
                <select className="input" value={role} onChange={(e) => setRole(e.target.value)}><option value="worker">Worker</option><option value="admin">Admin</option></select>
              </label>
              <button className="btn primary" disabled={busy}>Add to team</button>
            </div>
            <span className="muted small">If they already have an account, access turns on now. If not, it turns on when they first set up their login at /staff/sign-in with this email.</span>
          </form>

          <div className="card" style={{ display: 'grid' }}>
            <strong style={{ paddingBottom: 8 }}>{people.length} {people.length === 1 ? 'person' : 'people'}{invites.length ? ` · ${invites.length} waiting` : ''}</strong>
            {people.map((p) => (
              <div key={p.id} className={s.person}>
                <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                  <strong>{p.full_name || p.email.split('@')[0]}</strong>{p.id === userId ? <span className="muted small"> · you</span> : null}<br />
                  <span className="muted small">{p.email} · {p.last_sign_in_at ? `last in ${new Date(p.last_sign_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'hasn’t signed in yet'}</span>
                </span>
                <select className="input" aria-label={`Role for ${p.email}`} value={p.role} disabled={busy || p.id === userId}
                  onChange={(e) => setStaffRole(p.email, e.target.value, () => `${p.email} is now ${e.target.value === 'admin' ? 'an admin' : 'a worker'}.`)}>
                  <option value="worker">Worker</option><option value="admin">Admin</option>
                </select>
                {p.id === userId ? <span /> : (
                  <button className="btn ghost small" style={{ color: 'var(--danger)' }} disabled={busy}
                    onClick={() => window.confirm(`Remove ${p.email} from the team? They keep their customer account.`) && setStaffRole(p.email, 'customer', () => `${p.email} no longer has staff access.`)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            {invites.map((i) => (
              <div key={i.email} className={s.person}>
                <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                  <strong>{i.email}</strong> <span className="badge warn">Waiting to sign up</span><br />
                  <span className="muted small">Added {new Date(i.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} as {i.role === 'admin' ? 'an admin' : 'a worker'}</span>
                </span>
                <select className="input" aria-label={`Role for ${i.email}`} value={i.role} disabled={busy}
                  onChange={(e) => setStaffRole(i.email, e.target.value, () => `${i.email} will join as ${e.target.value === 'admin' ? 'an admin' : 'a worker'}.`)}>
                  <option value="worker">Worker</option><option value="admin">Admin</option>
                </select>
                <button className="btn ghost small" style={{ color: 'var(--danger)' }} disabled={busy}
                  onClick={() => setStaffRole(i.email, 'customer', () => `Cancelled the invite for ${i.email}.`)}>Cancel</button>
              </div>
            ))}
          </div>
          <span className="muted small">You can’t change your own role, so the team always has an admin. Removing someone turns them back into a customer account; their past work stays in the history.</span>
        </div>
        <aside className={s.aside}>
          <div className="card" style={{ display: 'grid', gap: 4 }}>
            <strong style={{ paddingBottom: 6 }}>Who can do what</strong>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 64px 64px', fontSize: 14 }}>
              <span className="muted small" style={{ fontWeight: 700 }}>Tool</span><span className="muted small" style={{ fontWeight: 700 }}>Worker</span><span className="muted small" style={{ fontWeight: 700 }}>Admin</span>
              {CAN.map(([label, worker]) => [
                <span key={label} style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}>{label}</span>,
                <span key={label + 'w'} style={{ padding: '6px 0', borderTop: '1px solid var(--line)', color: worker ? 'var(--ok)' : 'var(--muted)', fontWeight: worker ? 700 : 400 }}>{worker ? 'Yes' : 'No'}</span>,
                <span key={label + 'a'} style={{ padding: '6px 0', borderTop: '1px solid var(--line)', color: 'var(--ok)', fontWeight: 700 }}>Yes</span>,
              ])}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
