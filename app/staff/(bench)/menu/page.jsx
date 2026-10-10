'use client';
// Menu & prices (admins): rename services, change prices, confirm sample prices, take things off the menu,
// and reorder. Prices apply to new bookings; booked orders keep the price they were booked at.
import { useCallback, useEffect, useState } from 'react';
import { supabase, money } from '../../../../lib/supabase';
import { AdminOnly } from '../staff-shared';
import s from '../../staff.module.css';

const KIND = { fixed: 'Fixed', bundle: 'Bundle', quote: 'Quote' };
const toDollars = (cents) => (cents == null ? '' : String(cents / 100));
const toCents = (text) => {
  const n = parseFloat(String(text).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};

export default function MenuPage() {
  return <AdminOnly><Menu /></AdminOnly>;
}

function Menu() {
  const [rows, setRows] = useState(null);
  const [saved, setSaved] = useState([]);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('services').select('*').order('sort');
    if (error) return setFlash('Couldn’t load the menu. Refresh to try again.');
    const list = (data || []).map((r) => ({ ...r, price: toDollars(r.price_cents) }));
    setRows(list);
    setSaved(list);
  }, []);
  useEffect(() => { load(); }, [load]);

  const edit = (id, fields) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...fields } : r)));
  function move(i, dir) {
    setRows((rs) => {
      const next = [...rs];
      const j = i + dir;
      if (j < 0 || j >= next.length) return rs;
      // swap the two rows and their sort numbers, so only those two change
      const [a, b] = [next[i], next[j]];
      next[i] = { ...b, sort: a.sort };
      next[j] = { ...a, sort: b.sort };
      return next;
    });
  }

  const changed = (rows || []).filter((r) => {
    const o = saved.find((x) => x.id === r.id);
    return o && (o.name !== r.name || (o.short_name || '') !== (r.short_name || '') || o.price_cents !== toCents(r.price)
      || o.price_is_sample !== r.price_is_sample || o.active !== r.active || o.sort !== r.sort || (o.description || '') !== (r.description || ''));
  });

  async function save() {
    const bad = changed.find((r) => !r.name.trim() || toCents(r.price) == null);
    if (bad) return setFlash(`${bad.name || 'A service'} needs a name and a price.`);
    setBusy(true); setFlash('');
    for (const r of changed) {
      const { error } = await supabase.from('services').update({
        name: r.name.trim(), short_name: (r.short_name || '').trim() || null, description: (r.description || '').trim() || null,
        price_cents: toCents(r.price), price_is_sample: r.price_is_sample, active: r.active, sort: r.sort,
      }).eq('id', r.id);
      if (error) { setBusy(false); return setFlash(`Didn’t save ${r.name}: ${error.message}`); }
    }
    setBusy(false);
    setFlash(`Saved ${changed.length} ${changed.length === 1 ? 'change' : 'changes'}.`);
    load();
  }

  if (!rows) return <p className="muted">{flash || 'Loading the menu…'}</p>;
  const samples = rows.filter((r) => r.price_is_sample && r.active).length;

  return (
    <>
      <div className={s.top}>
        <div><div className="eyebrow">Admin</div><h1 style={{ fontSize: 32 }}>Menu &amp; prices</h1></div>
        <div className="pills">
          <button className="btn ghost small" disabled={busy || !changed.length} onClick={() => setRows(saved)}>Undo changes</button>
          <button className="btn primary small" disabled={busy || !changed.length} onClick={save}>{busy ? 'Saving…' : changed.length ? `Save ${changed.length} ${changed.length === 1 ? 'change' : 'changes'}` : 'Saved'}</button>
        </div>
      </div>
      {samples > 0 && <p className="hefty" style={{ margin: 0 }}><strong>{samples} {samples === 1 ? 'price is' : 'prices are'} still samples.</strong> Customers see “sample price” next to them until you confirm.</p>}
      {flash && <p className="small" role="status" style={{ margin: 0 }}>{flash}</p>}
      <div className={s.tableBox}>
        <table className={s.table} style={{ minWidth: 860 }}>
          <thead><tr><th>Order</th><th>Service</th><th>Button label</th><th>Kind</th><th>Price ($)</th><th>Confirmed</th><th>On menu</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} style={{ opacity: r.active ? 1 : 0.6 }}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="linkbtn" aria-label={`Move ${r.name} up`} disabled={i === 0} onClick={() => move(i, -1)} style={{ minWidth: 28, minHeight: 36 }}>↑</button>
                  <button className="linkbtn" aria-label={`Move ${r.name} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)} style={{ minWidth: 28, minHeight: 36 }}>↓</button>
                </td>
                <td style={{ minWidth: 220 }}>
                  <input className={s.cell} value={r.name} aria-label="Name" onChange={(e) => edit(r.id, { name: e.target.value })} />
                  <input className={s.cell} value={r.description || ''} aria-label="Description" placeholder="Description" onChange={(e) => edit(r.id, { description: e.target.value })} style={{ marginTop: 6, fontSize: 13 }} />
                </td>
                <td>{r.kind === 'bundle' ? <span className="muted">—</span>
                  : <input className={s.cell} value={r.short_name || ''} aria-label="Button label" onChange={(e) => edit(r.id, { short_name: e.target.value })} style={{ minWidth: 120 }} />}</td>
                <td><span className={`badge ${r.kind === 'quote' ? 'warn' : r.kind === 'bundle' ? '' : 'grey'}`}>{KIND[r.kind]}{r.kind === 'bundle' ? ` · ${r.pairs}` : ''}</span></td>
                <td><input className={s.cell} inputMode="decimal" value={r.price} aria-label={`Price of ${r.name}`} onChange={(e) => edit(r.id, { price: e.target.value })} style={{ width: 96, fontFamily: 'var(--mono)' }} />
                  {r.kind === 'quote' && <div className="muted" style={{ fontSize: 12 }}>“from” price</div>}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <button className={s.switch} role="switch" aria-checked={!r.price_is_sample} aria-label={`${r.name} price confirmed`} onClick={() => edit(r.id, { price_is_sample: !r.price_is_sample })} />
                    {r.price_is_sample ? <span className="badge warn">Sample</span> : <span className="small">Confirmed</span>}
                  </span>
                </td>
                <td><button className={s.switch} role="switch" aria-checked={r.active} aria-label={`${r.name} on the menu`} onClick={() => edit(r.id, { active: !r.active })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small" style={{ margin: 0 }}>New prices apply to new bookings. Orders already booked keep the price they were booked at. Bundles are what the deep clean savings are worked out from: {rows.filter((r) => r.kind === 'bundle').map((r) => `${r.pairs} pairs for ${money(toCents(r.price))}`).join(', ')}.</p>
    </>
  );
}
