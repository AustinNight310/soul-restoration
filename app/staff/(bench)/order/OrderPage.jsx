'use client';
// One order on the bench: move it through the stages, take check-in and bench photos (and choose which
// the customer sees), assign it, confirm the pickup, keep notes, and see everything that happened.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase, money, STAGES, stageLabel, serviceSummary } from '../../../../lib/supabase';
import { useStaff, ORDER_SELECT, firstName, pickupLabel, phoneHref } from '../staff-shared';
import s from '../../staff.module.css';

export default function OrderPage() {
  const id = useSearchParams().get('id');
  const { userId, isAdmin } = useStaff();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('orders')
      .select(ORDER_SELECT.replace('order_photos(id, kind)', 'order_photos(id, kind, path, visible_to_customer, created_at)'))
      .eq('id', id).maybeSingle();
    if (error || !data) setError('Couldn’t find that order.');
    else setOrder(data);
  }, [id]);
  useEffect(() => { if (id) load(); }, [id, load]);

  // Save fields on the order, and add a line to its history when the stage or pickup changes.
  async function update(fields, eventStatus, note) {
    setBusy(true); setFlash('');
    const { error } = await supabase.from('orders').update(fields).eq('id', order.id);
    if (!error && eventStatus) {
      await supabase.from('order_events').insert({ order_id: order.id, status: eventStatus, note, created_by: userId });
    }
    setBusy(false);
    setFlash(error ? 'Didn’t save. Try again.' : 'Saved.');
    if (!error) load();
    return !error;
  }

  if (error) return <><Link href="/staff" className="btn ghost small" style={{ justifySelf: 'start' }}>← All orders</Link><p className="error">{error}</p></>;
  if (!order) return <p className="muted">Loading…</p>;

  const ctx = { order, update, busy, reload: load };
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Link href="/staff" className="btn ghost small">← All orders</Link>
        <Link href={`/staff/ticket?id=${order.id}`} className="btn ghost small">Print ticket</Link>
      </div>
      <div>
        <div className="muted small" style={{ fontFamily: 'var(--mono)' }}>#{order.number} · {order.handoff === 'pickup' ? 'PICKUP' : 'DROP-OFF'} · {money(order.total_cents)}</div>
        <h1 style={{ fontSize: 28 }}>{serviceSummary(order.order_items)}</h1>
        <div className="muted">{[order.shoe_model, order.shoe_size, order.shoe_color].filter(Boolean).join(' · ')}</div>
        {order.discount_cents > 0 && <div className="small" style={{ color: 'var(--ok)' }}>Includes {money(order.discount_cents)} deep clean bundle savings</div>}
      </div>
      {flash && <p className="small" role="status" style={{ margin: 0, color: flash === 'Saved.' ? 'var(--ok)' : 'var(--danger)' }}>{flash}</p>}

      <div className={s.detail}>
        <div className={s.main}>
          <Stages {...ctx} />
          <Photos {...ctx} />
          {order.order_pairs.length > 0 && <PairList order={order} />}
          {order.handoff === 'pickup' && <Pickup {...ctx} />}
          <Notes {...ctx} />
        </div>
        <aside className={s.aside}>
          <Assign {...ctx} />
          <Customer order={order} />
          <Activity order={order} />
          {order.status !== 'cancelled' && !isAdmin && (
            <p className="muted small" style={{ margin: 0 }}>Need to cancel this order? Ask an admin.</p>
          )}
          {order.status !== 'cancelled' && isAdmin && (
            <button className="btn ghost small" style={{ justifySelf: 'start', color: 'var(--danger)' }} disabled={busy}
              onClick={() => { if (window.confirm(`Cancel order #${order.number}?`)) update({ status: 'cancelled' }, 'cancelled', 'Cancelled by staff'); }}>
              Cancel this order
            </button>
          )}
        </aside>
      </div>
    </>
  );
}

function Stages({ order, update, busy }) {
  const idx = STAGES.findIndex((x) => x.id === order.status);
  const next = STAGES[idx + 1];
  if (order.status === 'cancelled') return <div className="card"><span className="badge grey">Cancelled</span></div>;
  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, minmax(0,1fr))`, gap: 4 }}>
        {STAGES.map((st, i) => (
          <div key={st.id}>
            <div style={{ height: 6, borderRadius: 3, background: i <= idx ? 'var(--accent)' : 'var(--line)' }} />
            <div className="small" style={{ marginTop: 6, fontWeight: i === idx ? 700 : 400, color: i <= idx ? 'var(--ink)' : 'var(--muted)', fontSize: 12 }}>{st.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {next && <button className="btn primary" disabled={busy} onClick={() => update({ status: next.id }, next.id, null)}>Move to: {next.label} →</button>}
        {idx > 0 && <button className="btn ghost" disabled={busy} onClick={() => update({ status: STAGES[idx - 1].id }, STAGES[idx - 1].id, 'Moved back')}>Undo last move</button>}
      </div>
      <p className="muted small" style={{ margin: 0 }}>The customer sees each stage on their tracking page and in their account.</p>
    </div>
  );
}

const KINDS = [{ id: 'intake', label: 'Check-in' }, { id: 'bench', label: 'On the bench' }];

// Phone photos are big; shrink to 1600px JPEG before uploading. Falls back to the original file.
async function shrink(file) {
  try {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((done) => canvas.toBlob((b) => done(b || file), 'image/jpeg', 0.85));
  } catch {
    return file;
  }
}

function Photos({ order, reload }) {
  const photos = [...(order.order_photos || [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const [kind, setKind] = useState(['booked', 'received'].includes(order.status) ? 'intake' : 'bench');
  const [urls, setUrls] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const paths = photos.map((p) => p.path).join('|');

  useEffect(() => {
    if (!paths) return;
    supabase.storage.from('photos').createSignedUrls(paths.split('|'), 3600).then(({ data }) => {
      setUrls(Object.fromEntries((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl])));
    });
  }, [paths]);

  async function add(e) {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    setBusy(true); setMsg('');
    let failed = 0;
    for (const [i, file] of files.entries()) {
      const blob = await shrink(file);
      const path = `orders/${order.id}/${Date.now()}-${i}.jpg`;
      const up = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' });
      const row = !up.error && await supabase.from('order_photos').insert({ order_id: order.id, path, kind });
      if (up.error || row?.error) failed++;
    }
    setBusy(false);
    if (failed) setMsg(`${failed} photo${failed > 1 ? 's' : ''} didn’t upload. Try again.`);
    reload();
  }

  async function toggle(p) {
    await supabase.from('order_photos').update({ visible_to_customer: !p.visible_to_customer }).eq('id', p.id);
    reload();
  }
  async function remove(p) {
    if (!window.confirm('Delete this photo?')) return;
    await supabase.storage.from('photos').remove([p.path]);
    await supabase.from('order_photos').delete().eq('id', p.id);
    reload();
  }

  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong>Photos</strong>
        <div className="pills" role="group" aria-label="Photo type">
          {KINDS.map((k) => <button key={k.id} type="button" className="pill" aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>{k.label}</button>)}
        </div>
      </div>
      <div className={s.photos}>
        {photos.map((p) => (
          <div key={p.id} className={s.photo}>
            {urls[p.path] ? <img src={urls[p.path]} alt={`${KINDS.find((k) => k.id === p.kind)?.label || 'Order'} photo`} /> : null}
            <div className={s.photoBar}>
              <button type="button" className={s.photoBtn} aria-pressed={p.visible_to_customer} onClick={() => toggle(p)}
                title={p.visible_to_customer ? 'The customer can see this. Tap to hide it.' : 'Only staff can see this. Tap to show the customer.'}>
                {p.visible_to_customer ? 'Customer sees' : 'Staff only'}
              </button>
              <button type="button" className={s.photoBtn} aria-label="Delete photo" onClick={() => remove(p)}>✕</button>
            </div>
          </div>
        ))}
        <label className={s.addPhoto} style={{ position: 'relative' }}>
          <input type="file" accept="image/*" capture="environment" multiple onChange={add} disabled={busy} />
          <span>{busy ? 'Uploading…' : `+ ${KINDS.find((k) => k.id === kind).label} photo`}</span>
        </label>
      </div>
      {msg && <p className="error" role="alert">{msg}</p>}
      <p className="muted small" style={{ margin: 0 }}>Check-in photos put the pair’s condition on record. New photos are shown to the customer; tap “Customer sees” to keep one staff-only.</p>
    </div>
  );
}

function PairList({ order }) {
  const pairs = [...order.order_pairs].sort((a, b) => a.position - b.position);
  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <strong>{pairs.length} {pairs.length === 1 ? 'pair' : 'pairs'}</strong>
      {pairs.map((p) => {
        const items = order.order_items.filter((i) => i.pair_id === p.id);
        return (
          <div key={p.id} style={{ display: 'grid', gap: 4, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
            <div><span className="muted small" style={{ fontFamily: 'var(--mono)' }}>PAIR {p.position}</span> <strong>{p.shoe_model}</strong>
              <span className="muted small">{[p.shoe_size, p.shoe_color].filter(Boolean).map((x) => ` · ${x}`).join('')}</span></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {items.map((i) => (
                <span key={i.name} className={`badge ${i.needs_quote ? 'warn' : 'grey'}`}>{i.name}{i.needs_quote ? ' · needs quote' : ` · ${money(i.price_cents)}`}</span>
              ))}
            </div>
            {p.notes && <div className="small">“{p.notes}”</div>}
          </div>
        );
      })}
    </div>
  );
}

// <input type="datetime-local"> wants local time without a zone.
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function Pickup({ order, update, busy }) {
  const [at, setAt] = useState(toLocalInput(order.pickup_at));
  const collected = order.pickup_status === 'collected';
  function confirm() {
    const iso = new Date(at).toISOString();
    const label = pickupLabel(iso);
    update({ pickup_status: 'confirmed', pickup_at: iso, pickup_time: label }, order.status, `Pickup confirmed for ${label}`);
  }
  function markCollected() {
    update({ pickup_status: 'collected', status: order.status === 'booked' ? 'received' : order.status }, order.status === 'booked' ? 'received' : order.status, 'Collected on pickup');
  }
  return (
    <div className="card" style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <strong>Pickup</strong>
        <span className={`badge ${order.pickup_status === 'requested' ? 'warn' : 'ok'}`}>{collected ? 'Collected' : order.pickup_status === 'confirmed' ? 'Confirmed' : 'Requested'}</span>
      </div>
      <div className="small">{order.pickup_address}<br />Mobile: <strong>{order.pickup_phone}</strong>{order.pickup_evening ? ` · prefers ${order.pickup_evening}` : ''}</div>
      {order.pickup_time && <div className="small">Set for <strong>{order.pickup_time}</strong></div>}
      {!collected && (
        <>
          <label className="field">{order.pickup_status === 'confirmed' ? 'Change the time' : 'Confirmed time'}
            <input className="input" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button className="btn dark" disabled={busy || !at} onClick={confirm}>Mark pickup confirmed</button>
            {order.pickup_status === 'confirmed' && <button className="btn ghost" disabled={busy} onClick={markCollected}>Mark collected</button>}
          </div>
          <p className="muted small" style={{ margin: 0 }}>Text the customer first, then mark it here so their tracking page shows the time.</p>
        </>
      )}
    </div>
  );
}

function Notes({ order, update, busy }) {
  const [internal, setInternal] = useState(order.internal_notes || '');
  const [checkin, setCheckin] = useState(order.checkin_condition || '');
  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      {order.customer_notes && <div className="soft small"><strong>Customer says:</strong> “{order.customer_notes}”</div>}
      <label className="field">Check-in condition
        <input className="input" value={checkin} onChange={(e) => setCheckin(e.target.value)} placeholder="e.g. heel already scuffed at drop-off" />
      </label>
      <label className="field">Internal note <span className="muted" style={{ fontWeight: 400 }}>(customer never sees this)</span>
        <textarea className="input" value={internal} onChange={(e) => setInternal(e.target.value)} />
      </label>
      <button className="btn ghost" disabled={busy} onClick={() => update({ internal_notes: internal, checkin_condition: checkin })}>Save notes</button>
    </div>
  );
}

function Assign({ order, update, busy }) {
  const { team, userId } = useStaff();
  return (
    <div className="card" style={{ display: 'grid', gap: 8 }}>
      <label className="field">Assigned to
        <select className="input" value={order.assigned_to || ''} disabled={busy} onChange={(e) => update({ assigned_to: e.target.value || null })}>
          <option value="">Unassigned</option>
          {team.map((t) => <option key={t.id} value={t.id}>{firstName(t)}{t.id === userId ? ' (me)' : ''}</option>)}
        </select>
      </label>
      {order.assigned_to !== userId && <button className="btn ghost small" disabled={busy} onClick={() => update({ assigned_to: userId })}>Take this order</button>}
    </div>
  );
}

function Customer({ order }) {
  const phone = order.pickup_phone;
  const tel = phoneHref('tel', phone);
  const sms = phoneHref('sms', phone, `Hi, it's Soul Restoration about order #${order.number}.`);
  return (
    <div className="card" style={{ display: 'grid', gap: 8 }}>
      <strong>Customer</strong>
      <span className="small" style={{ overflowWrap: 'anywhere' }}><a href={`mailto:${order.email}?subject=${encodeURIComponent(`Your order #${order.number}`)}`}>{order.email}</a>{phone ? <><br />{phone}</> : null}</span>
      {(tel || sms) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tel && <a className="btn ghost small" href={tel}>Call</a>}
          {sms && <a className="btn ghost small" href={sms}>Text</a>}
        </div>
      )}
      <span className="muted small">{order.photo_consent ? 'OK to post photos' : 'No photo posting'}{order.user_id ? ' · has an account' : ' · booked as a guest'}</span>
    </div>
  );
}

function Activity({ order }) {
  const { person } = useStaff();
  const events = [...(order.order_events || [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <div className="card" style={{ display: 'grid', gap: 6 }}>
      <strong>Activity</strong>
      <div className={s.events}>
        {events.map((e, i) => (
          <div key={i} className={s.event}>
            <span className="muted" style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{new Date(e.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
            <span><strong>{stageLabel(e.status)}</strong>{e.created_by ? ` · ${firstName(person(e.created_by)) || 'staff'}` : ' · online'}{e.note ? ` · ${e.note}` : ''}</span>
          </div>
        ))}
        <div className={s.event}>
          <span className="muted" style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{new Date(order.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
          <span>Order placed</span>
        </div>
      </div>
    </div>
  );
}
