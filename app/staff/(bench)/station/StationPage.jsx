'use client';
// A station, opened by scanning its QR poster. Scanning it sets this phone to that station, then
// the page lists the pairs here now, the ones coming next, and what's been done here today.
// Opening it from a link (no qr=1) only shows the station; the phone stays where it was.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { useHere, setHere, STATE_LABEL, since } from '../../../../lib/stations';
import { useStaff, firstName } from '../staff-shared';
import s from '../../staff.module.css';

const PAIR = 'id, position, shoe_model, shoe_size, station_id, station_state, station_at, station_by, next_station_id, hold_note, spot, '
  + 'orders!order_pairs_order_id_fkey!inner(id, number, status, due_at)';

export default function StationPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { stations, station, userId, person, openScanner } = useStaff();
  const here = useHere();
  const wanted = params.get('id');
  const scanned = params.get('qr') === '1';
  const id = wanted || here?.id;
  const st = id ? station(id) : null;

  // A QR poster sets this phone's station, then drops qr=1 so a refresh isn't a second scan.
  useEffect(() => {
    if (wanted && scanned) {
      setHere(wanted, true);
      router.replace(`/staff/station?id=${encodeURIComponent(wanted)}`);
    }
  }, [wanted, scanned, router]);

  const [pairs, setPairs] = useState(null);
  const [today, setToday] = useState([]);
  const load = useCallback(async () => {
    if (!st) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const [p, m] = await Promise.all([
      supabase.from('order_pairs').select(PAIR).not('orders.status', 'in', '(picked_up,cancelled)').not('station_id', 'is', null),
      supabase.from('pair_moves').select('id, pair_id, action, created_by, created_at').eq('station_id', st.id).gte('created_at', start.toISOString()),
    ]);
    setPairs(p.data || []);
    setToday(m.data || []);
  }, [st]);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  if (!stations.length) return <p className="muted">Loading…</p>;
  if (!st) return <ChooseStation />;

  const isHere = here?.id === st.id;
  const prev = [...stations].filter((x) => x.active && x.sort < st.sort).pop();
  const atStation = (pairs || []).filter((p) => p.station_id === st.id && ['working', 'held'].includes(p.station_state));
  const coming = (pairs || []).filter((p) => (prev && p.station_id === prev.id && p.station_state === 'done') || (p.station_state === 'sent_back' && p.next_station_id === st.id));
  const doneToday = today.filter((m) => m.action === 'done');
  const mine = doneToday.filter((m) => m.created_by === userId).length;

  return (
    <>
      <div className={s.top}>
        <div>
          <div className="eyebrow">{isHere ? (here.scanned ? 'You’re here · scanned' : 'You’re here · picked by hand') : 'Station'}</div>
          <h1 style={{ fontSize: 32 }}>{st.name}</h1>
          {st.hint && <div className="muted">{st.hint}</div>}
        </div>
        <div className="pills">
          {!isHere && <button className="btn ghost small" onClick={() => setHere(st.id, false)}>I’m at {st.name}</button>}
          <button className="btn ghost small" onClick={() => { setHere(null); router.push('/staff/station'); }}>Change station</button>
        </div>
      </div>

      <button className={s.bigScan} onClick={openScanner}>
        <strong>Scan a pair ticket</strong>
        <span>Point the camera at the QR on the ticket. No camera? Type the code, e.g. 1042-2.</span>
      </button>
      {isHere && !here.scanned && <p className={s.warnBox}>This phone was set to {st.name} by hand. Scan the poster so moves are marked as scanned.</p>}

      <div className={s.tiles3}>
        <div className={s.tile}><span className="muted small">Here now</span><span className={s.tileValue}>{atStation.length}</span></div>
        <div className={s.tile}><span className="muted small">Coming next</span><span className={s.tileValue}>{coming.length}</span></div>
        <div className={s.tile}><span className="muted small">Done here today</span><span className={s.tileValue}>{doneToday.length}</span><span className="muted small">{mine} by you</span></div>
      </div>

      <section className={s.stack}>
        <h2 className={s.colTitle}>Here now<span>{atStation.length}</span></h2>
        {pairs === null ? <p className="muted">Loading…</p> : atStation.length === 0 ? <p className="muted small">Nothing being worked here.</p>
          : atStation.map((p) => <PairRow key={p.id} p={p} person={person} />)}
      </section>
      <section className={s.stack}>
        <h2 className={s.colTitle}>Coming next{prev ? ` · done at ${prev.name}` : ''}<span>{coming.length}</span></h2>
        {pairs !== null && coming.length === 0 && <p className="muted small">Nothing waiting.</p>}
        {coming.map((p) => <PairRow key={p.id} p={p} person={person} note={p.station_state === 'sent_back' ? `Sent back from ${station(p.station_id)?.name}` : null} />)}
      </section>
      <ChecklistPreview st={st} />
    </>
  );
}

export function PairRow({ p, person, note }) {
  const o = p.orders;
  const late = o.due_at && new Date(o.due_at) < new Date();
  return (
    <Link href={`/staff/pair?id=${p.id}`} className={s.pairRow} data-state={p.station_state}>
      <span className={s.pairNum}>#{o.number}<small>P{p.position}</small></span>
      <span style={{ minWidth: 0 }}>
        <strong className={s.ellipsis}>{p.shoe_model || `Pair ${p.position}`}{p.shoe_size ? ` · ${p.shoe_size}` : ''}</strong>
        <span className="muted small">
          {STATE_LABEL[p.station_state]} {since(p.station_at)} · {firstName(person(p.station_by)) || 'staff'}
          {p.spot ? ` · spot ${p.spot}` : ''}
        </span>
        {p.station_state === 'held' && <span className="small" style={{ color: 'var(--danger)', display: 'block' }}>{p.hold_note}</span>}
        {note && <span className="small" style={{ color: 'var(--warn)', display: 'block' }}>{note}</span>}
      </span>
      {late && <span className="badge" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>Late</span>}
    </Link>
  );
}

function ChecklistPreview({ st }) {
  return (
    <details className="card">
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>What gets checked at {st.name}</summary>
      <ul className="small" style={{ margin: '10px 0 0', paddingLeft: 18, display: 'grid', gap: 4 }}>
        {st.services_check && <li>Each booked service for the pair</li>}
        {(st.checklist || []).map((c) => <li key={c.label}>{c.label}{c.required ? '' : ' (if needed)'}</li>)}
        {st.photo_kind && <li>{st.photo_kind === 'intake' ? 'Check-in' : 'Finished'} photos, taken here</li>}
        {st.asks_spot && <li>Where the pair was put</li>}
        {st.needs_done && <li>Only pairs that passed the step before can start here</li>}
      </ul>
    </details>
  );
}

function ChooseStation() {
  const { stations, openScanner } = useStaff();
  return (
    <>
      <div>
        <div className="eyebrow">Stations</div>
        <h1 style={{ fontSize: 32 }}>Where are you working?</h1>
      </div>
      <button className={s.bigScan} onClick={openScanner}>
        <strong>Scan your station’s QR</strong>
        <span>It’s on the poster at each station.</span>
      </button>
      <div className={s.stationGrid}>
        {stations.filter((x) => x.active).map((x) => (
          <button key={x.id} type="button" className={s.stationPick} onClick={() => setHere(x.id, false)}>
            <strong>{x.name}</strong>
            <span className="muted small">{x.hint}</span>
          </button>
        ))}
      </div>
      <p className="muted small" style={{ margin: 0 }}>Picking a station here works, but moves are marked “picked by hand” instead of “scanned”.</p>
    </>
  );
}
