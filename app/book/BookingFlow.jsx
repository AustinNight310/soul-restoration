'use client';
// Three steps: what it needs → the pair and how we get it → review and book.
// Nothing is saved until the last button; the database recalculates the price itself.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase, money } from '../../lib/supabase';

const EVENINGS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BookingFlow() {
  const params = useSearchParams();
  const [services, setServices] = useState([]);
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState(() => (params.get('s') ? [params.get('s')] : []));
  const [pair, setPair] = useState({ model: '', size: '', color: '', notes: '' });
  const [handoff, setHandoff] = useState('drop_off');
  const [pickup, setPickup] = useState({ address: '', phone: '', evening: '' });
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [photoOk, setPhotoOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    supabase.from('services').select('*').in('kind', ['fixed', 'bundle']).order('sort')
      .then(({ data }) => setServices(data || []));
  }, []);

  const chosen = useMemo(() => services.filter((s) => picked.includes(s.id)), [services, picked]);
  const total = chosen.reduce((sum, s) => sum + (s.price_cents || 0), 0);

  function toggle(id) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function next() {
    setError('');
    if (step === 1 && picked.length === 0) return setError('Pick at least one service.');
    if (step === 2) {
      if (!pair.model.trim()) return setError('Tell us the brand and model.');
      if (handoff === 'pickup' && (!pickup.address.trim() || !pickup.phone.trim())) {
        return setError('Pickup needs an address and a mobile number.');
      }
    }
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function book() {
    setError('');
    setBusy(true);
    const { data, error } = await supabase.rpc('create_booking', {
      p_email: email,
      p_service_ids: picked,
      p_handoff: handoff,
      p_pickup_address: handoff === 'pickup' ? pickup.address : null,
      p_pickup_phone: handoff === 'pickup' ? pickup.phone : null,
      p_pickup_evening: handoff === 'pickup' ? pickup.evening : null,
      p_shoe_model: pair.model,
      p_shoe_size: pair.size,
      p_shoe_color: pair.color,
      p_notes: pair.notes,
      p_photo_consent: photoOk,
    });
    setBusy(false);
    if (error) return setError(error.message || 'Something went wrong. Try again.');
    setDone(data);
    window.scrollTo({ top: 0 });
  }

  if (done) return <Confirmed result={done} email={email} />;

  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="steps-bar" aria-hidden="true"><div style={{ width: `${(step / 3) * 100}%` }} /></div>
      <div className="narrow" style={{ paddingTop: 28, display: 'grid', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {step > 1 ? (
            <button type="button" className="btn ghost small" onClick={() => setStep(step - 1)}>← Back</button>
          ) : <span />}
          <span className="muted small" style={{ fontFamily: 'var(--mono)' }}>STEP {step} / 3</span>
        </div>

        {step === 1 && (
          <>
            <h1 style={{ fontSize: 34, lineHeight: 1.1 }}>What does your pair need?</h1>
            <p className="muted" style={{ margin: 0 }}>Pick everything that applies.</p>
            <div className="stack" role="group" aria-label="Services">
              {services.filter((s) => s.kind === 'fixed').map((s) => (
                <button key={s.id} type="button" role="checkbox" aria-checked={picked.includes(s.id)} className="option" onClick={() => toggle(s.id)}>
                  <span className="top"><span className="name">{s.name}</span><span className="price">{money(s.price_cents)}</span></span>
                  <span className="desc">{s.description}</span>
                </button>
              ))}
            </div>
            <div className="soft" style={{ display: 'grid', gap: 10 }}>
              <strong>Deep clean bundles</strong>
              <div className="stack" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
                {services.filter((s) => s.kind === 'bundle').map((s) => (
                  <button key={s.id} type="button" role="checkbox" aria-checked={picked.includes(s.id)} className="option" onClick={() => toggle(s.id)}>
                    <span className="name" style={{ fontSize: 17, fontFamily: 'var(--body)', fontWeight: 700 }}>{s.pairs} pairs</span>
                    <span className="price" style={{ display: 'block' }}>{money(s.price_cents)}</span>
                  </button>
                ))}
              </div>
            </div>
            <Link href="/quote" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <strong>Want a paint job?</strong> <span className="muted">Paint is priced by quote. Send photos →</span>
            </Link>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={{ fontSize: 34, lineHeight: 1.1 }}>Tell us about the pair.</h1>
            <label className="field">Brand and model
              <input className="input" value={pair.model} onChange={(e) => setPair({ ...pair, model: e.target.value })} placeholder="e.g. Air Jordan 1 Mid" />
            </label>
            <div className="row2">
              <label className="field">Size
                <input className="input" value={pair.size} onChange={(e) => setPair({ ...pair, size: e.target.value })} placeholder="US 10" />
              </label>
              <label className="field">Colorway
                <input className="input" value={pair.color} onChange={(e) => setPair({ ...pair, color: e.target.value })} placeholder="White / red" />
              </label>
            </div>
            <label className="field">What needs fixing? <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
              <textarea className="input" value={pair.notes} onChange={(e) => setPair({ ...pair, notes: e.target.value })} placeholder="Yellow soles, left heel lifting…" />
            </label>

            <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 10 }}>
              <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>How will we get them?</legend>
              <button type="button" role="radio" aria-checked={handoff === 'drop_off'} className="option" onClick={() => setHandoff('drop_off')}>
                <span className="name" style={{ fontSize: 18 }}>Drop off in the Bronx</span>
                <span className="desc">The exact address and hours appear as soon as you book.</span>
              </button>
              <button type="button" role="radio" aria-checked={handoff === 'pickup'} className="option" onClick={() => setHandoff('pickup')}>
                <span className="name" style={{ fontSize: 18 }}>Request a pickup</span>
                <span className="desc">Evenings after 5pm. We text you to confirm before we come.</span>
              </button>
            </fieldset>

            {handoff === 'pickup' && (
              <div className="soft" style={{ display: 'grid', gap: 12 }}>
                <label className="field">Pickup address
                  <input className="input" autoComplete="street-address" value={pickup.address} onChange={(e) => setPickup({ ...pickup, address: e.target.value })} placeholder="Street, apt, Bronx NY" />
                </label>
                <label className="field">Mobile number
                  <input className="input" type="tel" autoComplete="tel" value={pickup.phone} onChange={(e) => setPickup({ ...pickup, phone: e.target.value })} placeholder="For the confirmation text" />
                </label>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Best evening</div>
                  <div className="pills">
                    {EVENINGS.map((d) => (
                      <button key={d} type="button" className="pill" aria-pressed={pickup.evening === d} onClick={() => setPickup({ ...pickup, evening: d })}>{d}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h1 style={{ fontSize: 34, lineHeight: 1.1 }}>Almost there.</h1>
            <div className="card" style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <strong>{pair.model}</strong>
                <button type="button" className="btn ghost small" onClick={() => setStep(1)}>Edit</button>
              </div>
              {chosen.map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between' }} className="small">
                  <span className="muted">{s.name}</span><span style={{ fontFamily: 'var(--mono)' }}>{money(s.price_cents)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                <strong>Total</strong><span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontSize: 20 }}>{money(total)}</span>
              </div>
              <div className="muted small">{handoff === 'pickup' ? `Pickup requested${pickup.evening ? ` · ${pickup.evening} evening` : ''}` : 'Drop-off in the Bronx'}</div>
            </div>

            <label className="field">Email
              <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              <span className="muted" style={{ fontWeight: 400 }}>Your order number and tracking link go here.</span>
            </label>

            <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 14 }}>
              <input type="checkbox" checked={photoOk} onChange={(e) => setPhotoOk(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--accent)' }} />
              <span>OK to post before/after photos of my pair on Instagram.</span>
            </label>
            <label className="card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--accent)' }} />
              <span>I agree to the <Link href="/terms">service terms</Link>, including the condition and results policy for older pairs.</span>
            </label>
            <p className="muted small" style={{ margin: 0 }}>Test version: you won't be charged. Payment happens at drop-off.</p>
          </>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        {step < 3 ? (
          <button type="button" className="btn primary block" onClick={next}>
            Continue{step === 1 && picked.length ? ` · ${money(total)}` : ''}
          </button>
        ) : (
          <button type="button" className="btn dark block" onClick={book} disabled={!agreed || !email || busy}>
            {busy ? 'Booking…' : agreed ? 'Book it' : 'Agree to the terms to continue'}
          </button>
        )}
      </div>
    </div>
  );
}

function Confirmed({ result, email }) {
  const pickup = result.handoff === 'pickup';
  return (
    <div className="narrow" style={{ paddingTop: 40, paddingBottom: 40, display: 'grid', gap: 20 }}>
      <span className="badge ok" style={{ justifySelf: 'start' }}>Booked</span>
      <h1 style={{ fontSize: 38, lineHeight: 1.05 }}>You're booked in.</h1>
      <p style={{ margin: 0, fontSize: 18 }}>
        Your order number is <strong style={{ fontFamily: 'var(--mono)' }}>#{result.number}</strong>. Keep it with your email ({email}) to track your pair.
      </p>
      {pickup ? (
        <div className="card">
          <div className="eyebrow">Next · pickup</div>
          <p style={{ margin: '10px 0 0' }}>Criss will text you to confirm the evening and time before heading over. Nothing to drop off.</p>
        </div>
      ) : (
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <div className="eyebrow">Next · drop off your pair</div>
          <div className="soft">
            <strong>{result.shop_address}</strong>
            <div className="muted small">{result.shop_hours}</div>
            {result.shop_phone && <div className="small" style={{ marginTop: 6 }}>Text <strong>{result.shop_phone}</strong> before you come.</div>}
          </div>
          <p className="muted small" style={{ margin: 0 }}>Bring your order number. We photograph every pair at check-in so its condition is on record. This address is only shared with booked customers.</p>
        </div>
      )}
      <Link href={`/track?n=${result.number}`} className="btn primary block">Track this order</Link>
      <Link href="/" className="btn ghost block">Back to home</Link>
    </div>
  );
}
