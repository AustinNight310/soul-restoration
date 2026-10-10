'use client';
// One pair, opened by scanning its ticket. It shows where the pair is and, for the station this phone
// is at, what to do: start it here, tick the station's checklist (and take photos where they're needed),
// then mark it done so it can go to the next station. Problems put it on hold or send it back.
// pair_action() in the database checks every step and records who did it, where and when.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase, money, stageLabel } from '../../../../lib/supabase';
import { shrink } from '../../../../lib/photos';
import { useHere, setHere, nextStation, checklistFor, skippedOnTheWay, STATE_LABEL, since } from '../../../../lib/stations';
import { useStaff, firstName } from '../staff-shared';
import s from '../../staff.module.css';

const SELECT = '*, orders!order_pairs_order_id_fkey(id, number, status, handoff, due_at, customer_notes, checkin_condition, internal_notes, assigned_to, '
  + 'order_pairs!order_pairs_order_id_fkey(id)), order_items(name, needs_quote, price_cents), '
  + 'order_photos(id, kind, path, created_at), pair_moves(id, station_id, action, checks, note, source, skipped, created_by, created_at)';

export default function PairPage() {
  const params = useSearchParams();
  const id = params.get('id');
  const fromQr = params.get('qr') === '1';
  const { stations, station } = useStaff();
  const here = useHere();
  const hereSt = here ? station(here.id) : null;
  const [pair, setPair] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('order_pairs').select(SELECT).eq('id', id).maybeSingle();
    if (error || !data) setError('Couldn’t find that pair. Check the ticket, or scan it again.');
    else setPair(data);
  }, [id]);
  useEffect(() => { if (id) load(); }, [id, load]);
  useEffect(() => { setFlash(''); }, [here?.id]);

  if (error) return <><Link href="/staff/station" className="btn ghost small" style={{ justifySelf: 'start' }}>← Station</Link><p className="error">{error}</p></>;
  if (!pair || !stations.length) return <p className="muted">Loading…</p>;

  const o = pair.orders;
  const moves = [...(pair.pair_moves || [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const ctx = { pair, order: o, moves, hereSt, here, fromQr, reload: load, setFlash };
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Link href={hereSt ? `/staff/station?id=${hereSt.id}` : '/staff/station'} className="btn ghost small">← {hereSt ? hereSt.name : 'Stations'}</Link>
        <Link href={`/staff/order?id=${o.id}`} className="btn ghost small">Whole order #{o.number}</Link>
      </div>
      <div>
        <div className="muted small" style={{ fontFamily: 'var(--mono)' }}>#{o.number} · PAIR {pair.position} OF {o.order_pairs.length} · {stageLabel(o.status).toUpperCase()}</div>
        <h1 style={{ fontSize: 28 }}>{pair.shoe_model || `Pair ${pair.position}`}</h1>
        <div className="muted">{[pair.shoe_size, pair.shoe_color].filter(Boolean).join(' · ') || 'No size or color on the ticket'}</div>
      </div>
      {flash && <p className={s.flash} role="status">{flash}</p>}
      <div className={s.detail}>
        <div className={s.main}>
          <Action {...ctx} />
          <Journey {...ctx} />
        </div>
        <aside className={s.aside}>
          <Where {...ctx} />
          <Details {...ctx} />
          <History {...ctx} />
        </aside>
      </div>
    </>
  );
}

// ---------- what to do at this station ----------
function Action(ctx) {
  const { pair, hereSt } = ctx;
  if (!hereSt) return <PickStation />;
  if (pair.station_state === 'held') return <Held {...ctx} />;
  if (pair.station_id === hereSt.id && pair.station_state === 'working') return <Checklist key={pair.station_at} {...ctx} />;
  if (pair.station_id === hereSt.id && pair.station_state === 'done') return <DoneHere {...ctx} />;
  return <Start {...ctx} />;
}

function useAct({ pair, here, fromQr, reload, setFlash }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function act(action, station, extra = {}) {
    setBusy(true); setErr(''); setFlash('');
    const { error } = await supabase.rpc('pair_action', {
      p_pair_id: pair.id,
      p_station: station,
      p_action: action,
      p_checks: extra.checks || [],
      p_note: extra.note || null,
      p_source: here?.scanned && fromQr ? 'scan' : 'manual',
      p_target: extra.target || null,
      p_spot: extra.spot || null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return false; }
    if (extra.flash) setFlash(extra.flash);
    await reload();
    return true;
  }
  return { act, busy, err };
}

function PickStation() {
  const { stations, openScanner } = useStaff();
  return (
    <div className={`card ${s.panel}`}>
      <strong className={s.panelTitle}>Which station are you at?</strong>
      <p className="muted small" style={{ margin: 0 }}>Scan the QR poster at your station. Moves made without scanning are marked “picked by hand” in the history.</p>
      <button className="btn primary block" onClick={openScanner}>Scan the station QR</button>
      <div className="pills">
        {stations.filter((x) => x.active).map((x) => (
          <button key={x.id} type="button" className="pill" onClick={() => setHere(x.id, false)}>{x.name}</button>
        ))}
      </div>
    </div>
  );
}

function Start(ctx) {
  const { pair, hereSt } = ctx;
  const { stations, station, isAdmin } = useStaff();
  const { act, busy, err } = useAct(ctx);
  const [note, setNote] = useState('');
  const cur = station(pair.station_id);
  const need = hereSt.needs_done ? station(hereSt.needs_done) : null;
  const blocked = need && !(pair.station_id === need.id && pair.station_state === 'done');
  const skipped = skippedOnTheWay(stations, pair, hereSt);
  const unfinished = cur && cur.id !== hereSt.id && pair.station_state === 'working';
  const sentTo = pair.next_station_id && station(pair.next_station_id);
  const backwards = cur && cur.sort > hereSt.sort && pair.next_station_id !== hereSt.id;

  return (
    <div className={`card ${s.panel}`}>
      <span className="eyebrow">You’re at {hereSt.name}</span>
      <strong className={s.panelTitle}>{blocked ? `Not ready for ${hereSt.name}` : `Start this pair at ${hereSt.name}?`}</strong>
      {blocked && (
        <div className={s.warnBox} data-tone="danger">
          {need.name} has to be done first. {cur ? <>It’s {pair.station_state === 'done' ? 'done at' : 'at'} <strong>{cur.name}</strong> now.</> : 'It hasn’t been scanned anywhere yet.'}
        </div>
      )}
      {sentTo && sentTo.id !== hereSt.id && <div className={s.warnBox}>It was sent back to <strong>{sentTo.name}</strong>. Take it there instead.</div>}
      {!blocked && unfinished && <div className={s.warnBox}>It’s still open at <strong>{cur.name}</strong>. Starting here records {cur.name} as not finished.</div>}
      {!blocked && skipped.length > 0 && <div className={s.warnBox}>This skips {skipped.map((x) => x.name).join(', ')}. Skips show on the pair’s history.</div>}
      {!blocked && backwards && <div className={s.warnBox}>This moves it back from {cur.name}. If it needs redoing, use “Send back” at {cur.name} instead, so the reason is on record.</div>}
      {hereSt.hint && <p className="muted small" style={{ margin: 0 }}>{hereSt.hint}</p>}
      {blocked && isAdmin && (
        <label className="field">Admin: start anyway, and say why
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. customer collecting as is" />
        </label>
      )}
      <button className="btn primary block" disabled={busy || (blocked && !(isAdmin && note.trim()))}
        onClick={() => act('arrive', hereSt.id, { note: blocked ? note : null })}>
        {busy ? 'Saving…' : `Start at ${hereSt.name}`}
      </button>
      {err && <p className="error" role="alert">{err}</p>}
      {blocked && need && <p className="muted small" style={{ margin: 0 }}>Wrong station? Scan the poster where you are.</p>}
    </div>
  );
}

function Checklist(ctx) {
  const { pair, order, moves, hereSt, reload } = ctx;
  const { stations } = useStaff();
  const { act, busy, err } = useAct(ctx);
  const items = checklistFor(hereSt, (pair.order_items || []).map((i) => i.name));
  const [ticked, setTicked] = useState(() => new Set());
  const [spot, setSpot] = useState(pair.spot || '');
  const arrived = [...moves].reverse().find((m) => m.station_id === hereSt.id && m.action === 'arrive')?.created_at || pair.station_at;
  const photos = (pair.order_photos || []).filter((p) => p.kind === hereSt.photo_kind && p.created_at >= arrived);
  const needPhoto = !!hereSt.photo_kind && photos.length === 0;
  const missing = items.filter((i) => i.required && !ticked.has(i.label));
  const needSpot = hereSt.asks_spot && !spot.trim();
  const ready = !missing.length && !needPhoto && !needSpot;
  const next = nextStation(stations, hereSt.id);
  const toggle = (label) => setTicked((t) => { const n = new Set(t); if (n.has(label)) n.delete(label); else n.add(label); return n; });

  return (
    <div className={`card ${s.panel}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span className="eyebrow">Working at {hereSt.name}</span>
        <span className="muted small">started {since(arrived)} ago</span>
      </div>
      <strong className={s.panelTitle}>Check off before it moves on</strong>
      <ul className={s.checks}>
        {items.map((i) => (
          <li key={i.label}>
            <label className={s.check} data-on={ticked.has(i.label) ? 'true' : 'false'}>
              <input type="checkbox" checked={ticked.has(i.label)} onChange={() => toggle(i.label)} />
              <span className={s.checkBox} aria-hidden="true" />
              <span>{i.label}{i.service && <span className="badge grey" style={{ marginLeft: 8 }}>Booked</span>}{!i.required && <span className="muted small"> · if needed</span>}</span>
            </label>
          </li>
        ))}
      </ul>
      {hereSt.photo_kind && <StationPhotos pair={pair} order={order} kind={hereSt.photo_kind} count={photos.length} reload={reload} />}
      {hereSt.asks_spot && (
        <label className="field">Where did you put it?
          <input className="input" value={spot} onChange={(e) => setSpot(e.target.value)} placeholder="Rack or shelf spot, e.g. B2" maxLength={40} />
        </label>
      )}
      <button className="btn primary block" disabled={busy || !ready}
        onClick={() => act('done', hereSt.id, { checks: [...ticked], spot, flash: `Done at ${hereSt.name}.${next ? ` Next: ${next.name}.` : ''}` })}>
        {busy ? 'Saving…' : `Done at ${hereSt.name}${next ? ` → ${next.name}` : ''}`}
      </button>
      {!ready && (
        <p className="muted small" style={{ margin: 0 }}>
          {[missing.length ? `${missing.length} required ${missing.length === 1 ? 'check' : 'checks'} left` : null,
            needPhoto ? `${hereSt.photo_kind === 'intake' ? 'check-in' : 'finished'} photos to take` : null,
            needSpot ? 'say where you put it' : null].filter(Boolean).join(' · ')}
        </p>
      )}
      {err && <p className="error" role="alert">{err}</p>}
      <Problem {...ctx} />
    </div>
  );
}

function StationPhotos({ pair, order, kind, count, reload }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function add(e) {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    setBusy(true); setMsg('');
    let failed = 0;
    for (const [i, file] of files.entries()) {
      const blob = await shrink(file);
      const path = `orders/${order.id}/${Date.now()}-${pair.position}-${i}.jpg`;
      const up = await supabase.storage.from('photos').upload(path, blob, { contentType: blob.type || 'image/jpeg' });
      const row = !up.error && await supabase.from('order_photos').insert({ order_id: order.id, pair_id: pair.id, path, kind });
      if (up.error || row?.error) failed++;
    }
    setBusy(false);
    if (failed) setMsg(`${failed} photo${failed > 1 ? 's' : ''} didn’t upload. Try again.`);
    reload();
  }
  return (
    <div className={s.photoNeed} data-ok={count > 0 ? 'true' : 'false'}>
      <div>
        <strong>{kind === 'intake' ? 'Check-in photos' : 'Finished photos'}</strong>
        <div className="small">{count > 0 ? `${count} taken here` : kind === 'intake' ? 'Both sides, toe, heel and soles, before anything is touched.' : 'Same angles as check-in, so the customer sees the difference.'}</div>
      </div>
      <label className="btn dark small" style={{ position: 'relative' }}>
        <input type="file" accept="image/*" capture="environment" multiple onChange={add} disabled={busy} className="sr-only" />
        {busy ? 'Uploading…' : count > 0 ? 'Add more' : 'Take photos'}
      </label>
      {msg && <p className="error" role="alert" style={{ gridColumn: '1 / -1', margin: 0 }}>{msg}</p>}
    </div>
  );
}

// Something's wrong: put it on hold (stays here, everyone sees why) or send it back to an earlier station.
function Problem(ctx) {
  const { hereSt } = ctx;
  const { stations } = useStaff();
  const { act, busy, err } = useAct(ctx);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('hold');
  const [note, setNote] = useState('');
  const earlier = stations.filter((x) => x.active && x.sort < hereSt.sort);
  const [target, setTarget] = useState(earlier[earlier.length - 1]?.id || '');
  if (!open) return <button type="button" className="linkbtn" style={{ justifySelf: 'start' }} onClick={() => setOpen(true)}>Problem with this pair?</button>;
  return (
    <div className={s.problem}>
      <div className="pills" role="radiogroup" aria-label="What to do">
        <button type="button" className="pill" role="radio" aria-checked={mode === 'hold'} aria-pressed={mode === 'hold'} onClick={() => setMode('hold')}>Put on hold</button>
        {earlier.length > 0 && <button type="button" className="pill" role="radio" aria-checked={mode === 'back'} aria-pressed={mode === 'back'} onClick={() => setMode('back')}>Send back</button>}
      </div>
      {mode === 'back' && (
        <label className="field">Back to
          <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
            {earlier.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
      )}
      <label className="field">{mode === 'hold' ? 'What’s wrong?' : 'What needs redoing?'}
        <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} rows={2}
          placeholder={mode === 'hold' ? 'e.g. sole cracking, ask Criss before going on' : 'e.g. glue mark on the left toe'} />
      </label>
      <div className="pills">
        <button className="btn dark small" disabled={busy || !note.trim() || (mode === 'back' && !target)}
          onClick={() => act(mode === 'hold' ? 'hold' : 'send_back', hereSt.id, { note, target, flash: mode === 'hold' ? 'On hold. Everyone sees why on the floor.' : 'Sent back.' })}>
          {mode === 'hold' ? 'Put on hold' : 'Send back'}
        </button>
        <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>Never mind</button>
      </div>
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  );
}

function Held(ctx) {
  const { pair } = ctx;
  const { station, person } = useStaff();
  const { act, busy, err } = useAct(ctx);
  const [note, setNote] = useState('');
  const at = station(pair.station_id);
  return (
    <div className={`card ${s.panel}`} data-tone="danger">
      <span className="eyebrow" style={{ color: 'var(--danger)' }}>On hold at {at?.name}</span>
      <strong className={s.panelTitle}>{pair.hold_note}</strong>
      <span className="muted small">{firstName(person(pair.station_by)) || 'Someone'} · {since(pair.station_at)} ago</span>
      <label className="field">How was it sorted out?
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Criss OK’d it, carry on" />
      </label>
      <button className="btn primary block" disabled={busy || !note.trim()} onClick={() => act('release', pair.station_id, { note, flash: 'Hold cleared.' })}>Clear the hold</button>
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  );
}

function DoneHere(ctx) {
  const { pair, hereSt } = ctx;
  const { stations, person, openScanner } = useStaff();
  const { act, busy, err } = useAct(ctx);
  const next = nextStation(stations, hereSt.id);
  return (
    <div className={`card ${s.panel}`} data-tone="ok">
      <span className="eyebrow" style={{ color: 'var(--ok)' }}>Done at {hereSt.name}</span>
      <strong className={s.panelTitle}>{next ? `Next: ${next.name}` : 'All the way through'}</strong>
      <span className="muted small">{firstName(person(pair.station_by)) || 'Someone'} marked it done {since(pair.station_at)} ago{pair.spot ? ` · spot ${pair.spot}` : ''}</span>
      {next && <p className="small" style={{ margin: 0 }}>Take it to {next.name} and scan it there when you set it down.</p>}
      <button className="btn primary block" onClick={openScanner}>Scan the next pair</button>
      <button type="button" className="linkbtn" style={{ justifySelf: 'start' }} disabled={busy}
        onClick={() => { if (window.confirm(`Reopen this pair at ${hereSt.name}? It goes back on the checklist.`)) act('arrive', hereSt.id); }}>Reopen at {hereSt.name}</button>
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  );
}

// ---------- where it is and where it's been ----------
function Where({ pair }) {
  const { station, person } = useStaff();
  const at = station(pair.station_id);
  const sentTo = station(pair.next_station_id);
  return (
    <div className="card" style={{ display: 'grid', gap: 6 }}>
      <span className="muted small">Where it is</span>
      {at ? (
        <>
          <strong style={{ fontSize: 20 }}>{at.name}</strong>
          <span><span className={`badge ${pair.station_state === 'done' ? 'ok' : pair.station_state === 'working' ? '' : 'warn'}`}>{STATE_LABEL[pair.station_state]}</span>
            <span className="muted small"> {since(pair.station_at)} ago · {firstName(person(pair.station_by)) || 'staff'}</span></span>
          {sentTo && pair.station_state === 'sent_back' && <span className="small">Going back to <strong>{sentTo.name}</strong></span>}
          {pair.spot && <span className="small">Spot: <strong>{pair.spot}</strong></span>}
        </>
      ) : <span className="small">Not scanned anywhere yet.</span>}
    </div>
  );
}

function Journey({ pair, moves }) {
  const { stations } = useStaff();
  const last = {};
  moves.forEach((m) => { if (m.station_id) last[m.station_id] = m; });
  // a station never visited, with a later one already reached, was skipped
  const reached = Math.max(-1, ...stations.filter((x) => last[x.id] || x.id === pair.station_id).map((x) => x.sort));
  return (
    <div className="card" style={{ display: 'grid', gap: 10 }}>
      <strong>Through the shop</strong>
      <ol className={s.journey}>
        {stations.filter((x) => x.active).map((x) => {
          const m = last[x.id];
          const now = pair.station_id === x.id;
          const state = now ? pair.station_state : m?.action === 'done' ? 'done' : m ? 'visited' : x.sort < reached ? 'skipped' : 'todo';
          return (
            <li key={x.id} className={s.jStep} data-state={state} data-now={now ? 'true' : 'false'}>
              <span className={s.jDot} aria-hidden="true">{state === 'done' ? '✓' : state === 'held' ? '!' : ''}</span>
              <span className={s.jName}>{x.name}</span>
              <span className="muted small">{now ? STATE_LABEL[pair.station_state] : state === 'done' ? new Date(m.created_at).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : state === 'visited' ? 'Not finished' : state === 'skipped' ? 'Skipped' : ''}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Details({ pair, order }) {
  const late = order.due_at && new Date(order.due_at) < new Date() && !['ready_for_pickup', 'picked_up'].includes(order.status);
  const [urls, setUrls] = useState({});
  const photos = [...(pair.order_photos || [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const paths = photos.map((p) => p.path).join('|');
  useEffect(() => {
    if (!paths) return;
    supabase.storage.from('photos').createSignedUrls(paths.split('|'), 3600).then(({ data }) => {
      setUrls(Object.fromEntries((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl])));
    });
  }, [paths]);
  return (
    <div className="card" style={{ display: 'grid', gap: 10 }}>
      <strong>The job</strong>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(pair.order_items || []).map((i) => <span key={i.name} className={`badge ${i.needs_quote ? 'warn' : 'grey'}`}>{i.name}{i.needs_quote ? ' · needs quote' : ` · ${money(i.price_cents)}`}</span>)}
      </div>
      {order.due_at && <span className="small" style={late ? { color: 'var(--danger)', fontWeight: 700 } : undefined}>Ready by {new Date(order.due_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{late ? ' · past due' : ''}</span>}
      {pair.notes && <div className="small">Customer: “{pair.notes}”</div>}
      {order.customer_notes && <div className="small">Order note: “{order.customer_notes}”</div>}
      {order.checkin_condition && <div className="small">At check-in: {order.checkin_condition}</div>}
      {order.internal_notes && <div className="small">Staff note: {order.internal_notes}</div>}
      {photos.length > 0 && (
        <div className={s.thumbs}>
          {photos.map((p) => urls[p.path]
            ? <a key={p.id} href={urls[p.path]} target="_blank" rel="noreferrer"><img src={urls[p.path]} alt={`${p.kind} photo`} /></a>
            : <span key={p.id} />)}
        </div>
      )}
    </div>
  );
}

const ACTION = { arrive: 'Started', done: 'Done', hold: 'On hold', release: 'Hold cleared', send_back: 'Sent back' };

function History({ moves }) {
  const { station, person } = useStaff();
  if (!moves.length) return null;
  return (
    <div className="card" style={{ display: 'grid', gap: 6 }}>
      <strong>History</strong>
      <div className={s.events}>
        {[...moves].reverse().map((m) => (
          <div key={m.id} className={s.event}>
            <span className="muted" style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{new Date(m.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
            <span>
              <strong>{ACTION[m.action]}</strong> · {station(m.station_id)?.name || 'a removed station'} · {firstName(person(m.created_by)) || 'staff'}
              {m.source === 'manual' && <span className="muted"> · picked by hand</span>}
              {m.note && <> · {m.note}</>}
              {m.skipped?.length > 0 && <span style={{ color: 'var(--warn)' }}> · skipped {m.skipped.join(', ')}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
