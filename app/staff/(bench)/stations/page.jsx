'use client';
// Stations & QR: the stations pairs move through, the QR poster for each (print and hang them up),
// and, for admins, each station's checklist. Checklist changes go in the activity log.
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { stationUrl } from '../../../../lib/stations';
import QR from '../../../../components/qr/QR';
import { useStaff } from '../staff-shared';
import s from '../../staff.module.css';
import p from './stations.module.css';

export default function Stations() {
  const { stations, isAdmin, reloadStations } = useStaff();
  const [origin, setOrigin] = useState('');
  const [only, setOnly] = useState(null); // print one poster
  useEffect(() => { setOrigin(window.location.origin); }, []);
  useEffect(() => {
    const after = () => setOnly(null);
    window.addEventListener('afterprint', after);
    return () => window.removeEventListener('afterprint', after);
  }, []);
  function print(id) {
    setOnly(id);
    setTimeout(() => window.print(), 50);
  }
  if (!stations.length || !origin) return <p className="muted">Loading…</p>;
  const active = stations.filter((x) => x.active);

  return (
    <>
      <style>{'@page { size: letter; margin: 0.5in; }'}</style>
      <div className={s.top} data-print-hide>
        <div>
          <div className="eyebrow">Stations & QR</div>
          <h1 style={{ fontSize: 32 }}>How a pair moves through the shop</h1>
        </div>
        <button className="btn primary small" onClick={() => print(null)}>Print all {active.length} posters</button>
      </div>

      <div className="soft small" data-print-hide style={{ display: 'grid', gap: 6 }}>
        <strong>How it works</strong>
        <span>1. Hang each poster at its station. Every pair’s printed ticket has its own QR.</span>
        <span>2. At a station, tap <strong>Scan</strong> and scan the poster. Your phone remembers where you are for the day.</span>
        <span>3. Scan a pair’s ticket, tap <strong>Start</strong>, do the work, tick the checklist, tap <strong>Done</strong>. Take it to the next station.</span>
        <span>4. The order’s stage moves on its own when every pair is through, so the customer’s tracking is always right.</span>
      </div>

      <div className={p.posters}>
        {active.map((x, i) => (
          <article key={x.id} className={`${p.poster} ${only && only !== x.id ? p.skip : ''}`}>
            <div className={p.posterBrand}>Soul·Restoration</div>
            <div className={p.posterNum}>Station {i + 1} of {active.length}</div>
            <div className={p.posterName}>{x.name}</div>
            <QR value={stationUrl(origin, x.id)} size={180} label={`QR code for ${x.name}`} />
            <div className={p.posterHow}>Scan this when you start work here, then scan each pair’s ticket.</div>
            <div className="pills" data-print-hide>
              <button className="btn ghost small" onClick={() => print(x.id)}>Print this one</button>
            </div>
          </article>
        ))}
      </div>

      <div data-print-hide style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ fontSize: 24 }}>Checklists</h2>
        {!isAdmin && <p className="muted small" style={{ margin: 0 }}>Only admins can change these. Ask an admin if a step is missing.</p>}
        {stations.map((x) => <StationCard key={x.id} st={x} canEdit={isAdmin} onSaved={reloadStations} />)}
      </div>
    </>
  );
}

// One line per check. A line ending in "(if needed)" is optional; every other line has to be ticked.
const toText = (list) => list.map((c) => `${c.label}${c.required ? '' : ' (if needed)'}`).join('\n');
const fromText = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
  const optional = /\(if needed\)$/i.test(l);
  return { label: l.replace(/\s*\(if needed\)$/i, '').slice(0, 120), required: !optional };
});

function StationCard({ st, canEdit, onSaved }) {
  const { station } = useStaff();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(st.name);
  const [hint, setHint] = useState(st.hint || '');
  const [text, setText] = useState(toText(st.checklist || []));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function save(fields) {
    setBusy(true); setMsg('');
    const { error } = await supabase.from('stations').update(fields).eq('id', st.id);
    setBusy(false);
    if (error) { setMsg('Didn’t save. Try again.'); return; }
    setEditing(false);
    onSaved();
  }

  return (
    <div className="card" style={{ display: 'grid', gap: 10, opacity: st.active ? 1 : 0.6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <strong style={{ fontSize: 18 }}>{st.name}{!st.active && <span className="badge grey" style={{ marginLeft: 8 }}>Off</span>}</strong>
        <span className="muted small">{st.hint}</span>
      </div>
      {!editing ? (
        <>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
            {st.services_check && <li>Each booked service for the pair</li>}
            {(st.checklist || []).map((c) => <li key={c.label}>{c.label}{c.required ? '' : <span className="muted"> (if needed)</span>}</li>)}
          </ul>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {st.photo_kind && <span className="badge">{st.photo_kind === 'intake' ? 'Check-in photos' : 'Finished photos'}</span>}
            {st.asks_spot && <span className="badge">Asks for the spot</span>}
            {st.needs_done && <span className="badge warn">Only after {station(st.needs_done)?.name}</span>}
          </div>
          {canEdit && (
            <div className="pills">
              <button className="btn ghost small" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn ghost small" disabled={busy} onClick={() => save({ active: !st.active })}>{st.active ? 'Turn off' : 'Turn on'}</button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="row2">
            <label className="field">Name<input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /></label>
            <label className="field">What happens here<input className="input" value={hint} onChange={(e) => setHint(e.target.value)} maxLength={120} /></label>
          </div>
          <label className="field">Checklist <span className="muted" style={{ fontWeight: 400 }}>(one per line; end a line with “(if needed)” to make it optional)</span>
            <textarea className="input" rows={Math.max(3, text.split('\n').length + 1)} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <div className="pills">
            <button className="btn primary small" disabled={busy || !name.trim()} onClick={() => save({ name: name.trim(), hint: hint.trim() || null, checklist: fromText(text) })}>Save</button>
            <button className="btn ghost small" onClick={() => setEditing(false)}>Cancel</button>
          </div>
          <p className="muted small" style={{ margin: 0 }}>Turning a station off keeps its history; its poster stops working. The QR codes don’t change when you rename a station.</p>
        </>
      )}
      {msg && <p className="error" role="alert">{msg}</p>}
    </div>
  );
}
