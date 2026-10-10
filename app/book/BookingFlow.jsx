'use client';
// Three steps: the pairs and what each one needs → how we get them → review and book.
// Nothing is saved until the last button; the database recalculates the price itself.
// More than MAX_PAIRS pairs is a hefty job: the last step sends a quote request instead of booking.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase, money } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { DEEP_CLEAN, MAX_PAIRS, label, priceOrder } from '../../lib/pricing';

const EVENINGS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_ANY = 50;

export default function BookingFlow() {
  const params = useSearchParams();
  const nextKey = useRef(1);
  const newPair = (services = []) => ({ key: nextKey.current++, model: '', size: '', color: '', notes: '', services, open: false });

  const [services, setServices] = useState([]);
  const [step, setStep] = useState(1);
  const [pairs, setPairs] = useState(() => [newPair()]);
  const [handoff, setHandoff] = useState('drop_off');
  const [pickup, setPickup] = useState({ address: '', phone: '', evening: '' });
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [photoOk, setPhotoOk] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const { user, profile } = useAuth();

  // Signed in: the order goes on your account, under your email, with your mobile ready for pickups.
  useEffect(() => { if (user) setEmail(user.email); }, [user]);
  useEffect(() => {
    if (profile?.phone) setPickup((p) => (p.phone ? p : { ...p, phone: profile.phone }));
  }, [profile?.phone]);

  useEffect(() => {
    supabase.from('services').select('*').in('kind', ['fixed', 'bundle', 'quote']).order('sort')
      .then(({ data, error }) => {
        if (error) setError('The services didn’t load. Check your connection and refresh.');
        const list = data || [];
        setServices(list);
        // /book?s=<service> from the menu: a bundle starts that many deep cleans, a service starts one pair with it
        const s = list.find((x) => x.id === params.get('s'));
        if (s?.kind === 'bundle') setPairs(Array.from({ length: s.pairs }, () => newPair([DEEP_CLEAN])));
        else if (s && s.kind !== 'quote') setPairs([newPair([s.id])]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = services.filter((s) => s.kind === 'fixed' || s.kind === 'quote');
  const bundles = services.filter((s) => s.kind === 'bundle');
  const byId = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services]);
  const price = useMemo(() => priceOrder(pairs, services), [pairs, services]);
  const hefty = pairs.length > MAX_PAIRS;
  const single = byId[DEEP_CLEAN]?.price_cents;

  function editPair(i, fields) {
    setPairs((ps) => ps.map((p, j) => (j === i ? { ...p, ...fields } : p)));
  }
  function toggle(i, id) {
    setPairs((ps) => ps.map((p, j) => (j !== i ? p : {
      ...p, services: p.services.includes(id) ? p.services.filter((x) => x !== id) : [...p.services, id],
    })));
  }
  function duplicate(i) {
    setPairs((ps) => [...ps.slice(0, i + 1), newPair([...ps[i].services]), ...ps.slice(i + 1)]);
  }
  function remove(i) {
    setPairs((ps) => ps.filter((_, j) => j !== i));
  }
  // Bundle shortcut: make sure there are that many pairs and each of the first N has a deep clean.
  // Never removes pairs or services the customer already set up.
  function applyBundle(n) {
    setPairs((ps) => {
      const out = ps.map((p, i) => (i < n && !p.services.includes(DEEP_CLEAN) ? { ...p, services: [DEEP_CLEAN, ...p.services] } : p));
      while (out.length < n) out.push(newPair([DEEP_CLEAN]));
      return out;
    });
  }

  function next() {
    setError('');
    if (step === 1) {
      const noService = pairs.findIndex((p) => p.services.length === 0);
      if (noService >= 0) return setError(`Pick at least one service for pair ${noService + 1}.`);
      const noModel = pairs.findIndex((p) => !p.model.trim());
      if (noModel >= 0) return setError(`Add the brand and model for pair ${noModel + 1}.`);
    }
    if (step === 2 && handoff === 'pickup' && (!pickup.address.trim() || !pickup.phone.trim())) {
      return setError('Pickup needs an address and a mobile number.');
    }
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const pairPayload = () => pairs.map((p) => ({ model: p.model, size: p.size, color: p.color, notes: p.notes, services: p.services }));

  async function book() {
    setError('');
    setBusy(true);
    const { data, error } = await supabase.rpc('create_booking', {
      p_email: email,
      p_pairs: pairPayload(),
      p_handoff: handoff,
      p_pickup_address: handoff === 'pickup' ? pickup.address : null,
      p_pickup_phone: handoff === 'pickup' ? pickup.phone : null,
      p_pickup_evening: handoff === 'pickup' ? pickup.evening : null,
      p_photo_consent: photoOk,
    });
    setBusy(false);
    if (error) return setError(error.message || 'Something went wrong. Try again.');
    setDone({ ...data, kind: 'booking' });
    window.scrollTo({ top: 0 });
  }

  async function requestQuote() {
    setError('');
    setBusy(true);
    const list = pairs.map((p, i) => {
      const extra = [p.size, p.color].filter(Boolean).join(', ');
      const names = p.services.map((id) => (byId[id] ? label(byId[id]) : id)).join(', ');
      return `${i + 1}. ${p.model}${extra ? ` (${extra})` : ''}: ${names}${p.notes ? `. ${p.notes}` : ''}`;
    });
    const how = handoff === 'pickup'
      ? `Pickup: ${pickup.address}, ${pickup.phone}${pickup.evening ? `, ${pickup.evening} evening` : ''}`
      : 'Drop-off';
    const { data, error } = await supabase.rpc('create_quote_request', {
      p_email: email,
      p_kind: `Hefty job · ${pairs.length} pairs`,
      p_description: `${how}\n${list.join('\n')}`,
      p_shoe_model: `${pairs.length} pairs`,
      p_shoe_size: null,
      p_inspiration_url: null,
    });
    setBusy(false);
    if (error) return setError(error.message || 'Something went wrong. Try again.');
    setDone({ ...data, kind: 'quote', pairs: pairs.length });
    window.scrollTo({ top: 0 });
  }

  if (done?.kind === 'quote') return <QuoteSent result={done} signedIn={!!user} />;
  if (done) return <Confirmed result={done} email={email} signedIn={!!user} />;

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
            <div style={{ display: 'grid', gap: 8 }}>
              <h1 style={{ fontSize: 34, lineHeight: 1.1 }}>What do your pairs need?</h1>
              <p className="muted" style={{ margin: 0 }}>Add each pair and tap what it needs. Deep cleans get bundle pricing automatically.</p>
            </div>

            {bundles.length > 0 && (
              <div className="soft" style={{ display: 'grid', gap: 10 }}>
                <strong>Deep clean bundles</strong>
                <div className="pills">
                  {bundles.map((b) => {
                    const save = single ? b.pairs * single - b.price_cents : 0;
                    return (
                      <button key={b.id} type="button" className="pill" onClick={() => applyBundle(b.pairs)}>
                        {b.pairs} pairs · <span style={{ fontFamily: 'var(--mono)', fontWeight: 400, marginLeft: 4 }}>{money(b.price_cents)}</span>
                        {save > 0 && <span className="muted" style={{ fontWeight: 400, marginLeft: 6 }}>save {money(save)}</span>}
                      </button>
                    );
                  })}
                </div>
                <span className="muted small">Sets up that many pairs with deep cleaning. You can add more services to any pair below.</span>
              </div>
            )}

            <div className="stack">
              {pairs.map((p, i) => (
                <PairCard
                  key={p.key} pair={p} index={i} options={options} subtotal={price.pairTotals[i]}
                  canRemove={pairs.length > 1} canDuplicate={pairs.length < MAX_ANY}
                  onEdit={(f) => editPair(i, f)} onToggle={(id) => toggle(i, id)}
                  onDuplicate={() => duplicate(i)} onRemove={() => remove(i)}
                />
              ))}
            </div>
            <button type="button" className="add-pair" disabled={pairs.length >= MAX_ANY} onClick={() => setPairs((ps) => [...ps, newPair()])}>
              + Add another pair
            </button>

            {hefty ? <HeftyNote count={pairs.length} /> : <Summary price={price} pairs={pairs.length} />}
            <p className="muted small" style={{ margin: 0 }}>Prices are subject to change. Paint is priced after we look at the pair.</p>

            <Link href="/quote" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <strong>Only need a paint job?</strong> <span className="muted">Send photos and get a quote →</span>
            </Link>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={{ fontSize: 34, lineHeight: 1.1 }}>How will we get {pairs.length === 1 ? 'them' : `all ${pairs.length} pairs`}?</h1>
            <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 10 }}>
              <legend className="sr-only">Drop-off or pickup</legend>
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
            <h1 style={{ fontSize: 34, lineHeight: 1.1 }}>{hefty ? 'Get a price for the whole job.' : 'Almost there.'}</h1>
            <div className="card" style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <strong>{pairs.length} {pairs.length === 1 ? 'pair' : 'pairs'}</strong>
                <button type="button" className="btn ghost small" onClick={() => setStep(1)}>Edit</button>
              </div>
              {pairs.map((p, i) => (
                <div key={p.key} className="small" style={{ display: 'grid', gap: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <strong style={{ minWidth: 0 }}>{i + 1}. {p.model}</strong>
                    {!hefty && <span style={{ fontFamily: 'var(--mono)' }}>{money(price.pairTotals[i])}</span>}
                  </div>
                  <span className="muted">{p.services.map((id) => (byId[id] ? label(byId[id]) : id)).join(' · ')}</span>
                </div>
              ))}
              {hefty ? (
                <HeftyNote count={pairs.length} />
              ) : (
                <>
                  {price.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ok)' }} className="small">
                      <span>Deep clean bundle savings</span><span style={{ fontFamily: 'var(--mono)' }}>−{money(price.discount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                    <strong>Total</strong><span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontSize: 20 }}>{money(price.total)}</span>
                  </div>
                  {price.quoted.length > 0 && (
                    <p className="muted small" style={{ margin: 0 }}>Paint isn't in this total. Criss reviews the pair and texts you a paint price before starting, and the price can change after that review.</p>
                  )}
                </>
              )}
              <div className="muted small">{handoff === 'pickup' ? `Pickup requested${pickup.evening ? ` · ${pickup.evening} evening` : ''}` : 'Drop-off in the Bronx'}</div>
            </div>

            {user ? (
              <div className="soft small" style={{ display: 'grid', gap: 2 }}>
                <span>Booking as <strong>{user.email}</strong></span>
                <span className="muted">{hefty ? 'The quote shows up in your account.' : 'This order goes in your account.'}</span>
              </div>
            ) : (
              <label className="field">Email
                <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                <span className="muted" style={{ fontWeight: 400 }}>{hefty ? 'Your quote comes here.' : 'Your order number and tracking link go here.'}</span>
              </label>
            )}

            {!hefty && (
              <>
                <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 14 }}>
                  <input type="checkbox" checked={photoOk} onChange={(e) => setPhotoOk(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--accent)' }} />
                  <span>OK to post before/after photos of my pairs on Instagram.</span>
                </label>
                <label className="card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 14, cursor: 'pointer' }}>
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ width: 22, height: 22, accentColor: 'var(--accent)' }} />
                  <span>I agree to the <Link href="/terms">service terms</Link>, including the condition and results policy for older pairs.</span>
                </label>
                <p className="muted small" style={{ margin: 0 }}>Test version: you won't be charged. Payment happens at drop-off. Prices are subject to change.</p>
              </>
            )}
          </>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        {step < 3 ? (
          <button type="button" className="btn primary block" onClick={next}>
            Continue{step === 1 && !hefty && price.total > 0 ? ` · ${money(price.total)}` : ''}
          </button>
        ) : hefty ? (
          <button type="button" className="btn dark block" onClick={requestQuote} disabled={!email || busy}>
            {busy ? 'Sending…' : `Request a quote for ${pairs.length} pairs`}
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

function PairCard({ pair, index, options, subtotal, canRemove, canDuplicate, onEdit, onToggle, onDuplicate, onRemove }) {
  const n = index + 1;
  return (
    <div className="pair">
      <div className="pair-head">
        <span className="pair-num">Pair {n}</span>
        <input className="input pair-model" value={pair.model} onChange={(e) => onEdit({ model: e.target.value })}
          placeholder="Brand and model" aria-label={`Pair ${n} brand and model`} />
        <span className="pair-sub">{pair.services.length ? money(subtotal) : '—'}</span>
      </div>
      <div className="chips" role="group" aria-label={`Services for pair ${n}`}>
        {options.map((s) => (
          <button key={s.id} type="button" className={`chip${s.kind === 'quote' ? ' quote' : ''}`} aria-pressed={pair.services.includes(s.id)}
            title={s.description || undefined} onClick={() => onToggle(s.id)}>
            {label(s)}<span className="chip-price">{s.kind === 'quote' ? 'quote' : money(s.price_cents)}</span>
          </button>
        ))}
      </div>
      {pair.open && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="row2">
            <label className="field">Size
              <input className="input" value={pair.size} onChange={(e) => onEdit({ size: e.target.value })} placeholder="US 10" />
            </label>
            <label className="field">Colorway
              <input className="input" value={pair.color} onChange={(e) => onEdit({ color: e.target.value })} placeholder="White / red" />
            </label>
          </div>
          <label className="field">What needs fixing? <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
            <textarea className="input" value={pair.notes} onChange={(e) => onEdit({ notes: e.target.value })} placeholder="Yellow soles, left heel lifting…" />
          </label>
        </div>
      )}
      <div className="pair-foot">
        <button type="button" className="linkbtn" aria-expanded={pair.open} onClick={() => onEdit({ open: !pair.open })}>
          {pair.open ? 'Hide details' : 'Add size and notes'}
        </button>
        <span style={{ display: 'flex', gap: 16 }}>
          <button type="button" className="linkbtn" disabled={!canDuplicate} onClick={onDuplicate}>Duplicate</button>
          <button type="button" className="linkbtn" disabled={!canRemove} onClick={onRemove}>Remove</button>
        </span>
      </div>
    </div>
  );
}

function Summary({ price, pairs }) {
  if (price.lines.length === 0 && price.quoted.length === 0) return null;
  return (
    <div className="card summary">
      <div className="line"><strong>{pairs} {pairs === 1 ? 'pair' : 'pairs'}</strong><span /></div>
      {price.lines.map((l) => (
        <div key={l.id} className="line muted"><span>{l.name} × {l.count}</span><span className="num">{money(l.cents)}</span></div>
      ))}
      {price.discount > 0 && (
        <div className="line" style={{ color: 'var(--ok)' }}><span>Deep clean bundle ({price.deepCount} pairs)</span><span className="num">−{money(price.discount)}</span></div>
      )}
      {price.quoted.map((q) => (
        <div key={q.id} className="line muted"><span>{q.name} × {q.count}</span><span>priced after review</span></div>
      ))}
      <div className="line total"><strong>Total</strong><span className="num">{money(price.total)}</span></div>
    </div>
  );
}

function HeftyNote({ count }) {
  return (
    <div className="hefty">
      <strong>{count} pairs is a hefty job.</strong>
      <span>Orders over {MAX_PAIRS} pairs are priced by quote. Send the list and Criss will reply with one price for everything. Nothing is booked or charged until you accept.</span>
    </div>
  );
}

function QuoteSent({ result, signedIn }) {
  return (
    <div className="narrow" style={{ paddingTop: 40, paddingBottom: 40, display: 'grid', gap: 16 }}>
      <span className="badge" style={{ justifySelf: 'start' }}>Request #{result.number}</span>
      <h1 style={{ fontSize: 38 }}>Quote request sent.</h1>
      <p style={{ margin: 0 }}>Criss will look over all {result.pairs} pairs and reply with a price. You can text photos to <strong>347-238-9320</strong> with your request number to speed it up. Nothing is charged until you accept.</p>
      {signedIn && <Link href="/account?tab=quotes" className="btn primary block">See it in your account</Link>}
      <Link href="/" className="btn ghost block">Back to home</Link>
    </div>
  );
}

function Confirmed({ result, email, signedIn }) {
  const pickup = result.handoff === 'pickup';
  return (
    <div className="narrow" style={{ paddingTop: 40, paddingBottom: 40, display: 'grid', gap: 20 }}>
      <span className="badge ok" style={{ justifySelf: 'start' }}>Booked</span>
      <h1 style={{ fontSize: 38, lineHeight: 1.05 }}>You're booked in.</h1>
      <p style={{ margin: 0, fontSize: 18 }}>
        Your order number is <strong style={{ fontFamily: 'var(--mono)' }}>#{result.number}</strong>. Keep it with your email ({email}) to track your {result.pairs > 1 ? `${result.pairs} pairs` : 'pair'}.
      </p>
      {result.needs_quote && (
        <div className="soft small">Paint work isn't in your total yet. Criss will review the pair and text you a paint price before starting.</div>
      )}
      {pickup ? (
        <div className="card">
          <div className="eyebrow">Next · pickup</div>
          <p style={{ margin: '10px 0 0' }}>Criss will text you to confirm the evening and time before heading over. Nothing to drop off.</p>
        </div>
      ) : (
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <div className="eyebrow">Next · drop off your {result.pairs > 1 ? 'pairs' : 'pair'}</div>
          <div className="soft">
            <strong>{result.shop_address}</strong>
            <div className="muted small">{result.shop_hours}</div>
            {result.shop_phone && <div className="small" style={{ marginTop: 6 }}>Text <strong>{result.shop_phone}</strong> before you come.</div>}
          </div>
          <p className="muted small" style={{ margin: 0 }}>Bring your order number. We photograph every pair at check-in so its condition is on record. This address is only shared with booked customers.</p>
        </div>
      )}
      {signedIn ? (
        <Link href={`/account?order=${result.number}`} className="btn primary block">See it in your account</Link>
      ) : (
        <>
          <Link href={`/track?n=${result.number}`} className="btn primary block">Track this order</Link>
          <p className="muted small" style={{ margin: 0 }}>Want every order in one place? <Link href="/sign-in">Sign in</Link> with {email} and this one shows up in your account.</p>
        </>
      )}
      <Link href="/" className="btn ghost block">Back to home</Link>
    </div>
  );
}
