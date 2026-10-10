'use client';
// Book by photos, one pair at a time and one question per screen:
//   photos → what's wrong (price adds up) → "is this your pair?" → size
// then the whole order with bundle savings → email and drop-off or pickup → booked.
// A confirmed pair without a size wears an amber "Size?" flag until it gets one.
// The database recalculates every price; lib/pricing.js shows the same math here.
// More than MAX_PAIRS pairs is a hefty job: the last step sends one quote request instead of booking.
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase, money } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { uploadPhoto } from '../../lib/photos';
import { DEEP_CLEAN, MAX_PAIRS, label, priceOrder } from '../../lib/pricing';
import s from './pairflow.module.css';

// What each service fixes, in the customer's words. Services without a line here show their own name.
const SAY = {
  deep_clean: 'Dirty, stained or scuffed',
  icing: 'See-through soles gone yellow',
  oxidation: 'White midsoles gone yellow',
  suede: 'Suede looks flat or faded',
  sole_repair: 'Sole peeling or lifting',
  paint: 'Paint, recolor or custom',
  not_sure: 'Not sure, take a look for me',
};
const SIZES = {
  "Men's": ['4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13', '14', '15'],
  "Women's": ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'],
  Kids: ['10C', '11C', '12C', '13C', '1Y', '2Y', '3Y', '3.5Y', '4Y', '4.5Y', '5Y', '5.5Y', '6Y', '6.5Y', '7Y'],
};
const RUN_TAG = { "Men's": 'M', "Women's": 'W', Kids: '' };
const ANGLES = ['side', 'top', 'sole'];
const PAIR_STEPS = ['photos', 'about', 'confirm', 'size'];
const MAX_PHOTOS = 6;
const MAX_ANY = 50;
const EVENINGS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const sizeText = (p) => (p.size ? `${p.size}${RUN_TAG[p.run] ? ' ' + RUN_TAG[p.run] : ''}` : '');
const pairName = (p, i) => p.model.trim() || `Pair ${i + 1}`;

export default function PairFlow({ start }) {
  const nextKey = useRef(1);
  const newPair = (services = []) => ({ key: nextKey.current++, photos: [], model: '', services, run: "Men's", size: '', confirmed: false });

  const [services, setServices] = useState([]);
  const [pairs, setPairs] = useState(() => [newPair()]);
  const [cur, setCur] = useState(0);
  const [screen, setScreen] = useState('photos');
  const [email, setEmail] = useState('');
  const [handoff, setHandoff] = useState('drop_off');
  const [pickup, setPickup] = useState({ address: '', phone: '', evening: '' });
  const [photoOk, setPhotoOk] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const { user, profile } = useAuth();
  const cardRef = useRef(null);

  useEffect(() => { if (user) setEmail(user.email); }, [user]);
  useEffect(() => {
    if (profile?.phone) setPickup((p) => (p.phone ? p : { ...p, phone: profile.phone }));
  }, [profile?.phone]);

  useEffect(() => {
    supabase.from('services').select('*').in('kind', ['fixed', 'bundle', 'quote']).order('sort')
      .then(({ data, error }) => {
        if (error) setError('The prices didn’t load. Check your connection and refresh.');
        const list = data || [];
        setServices(list);
        // /book?s=<service> from the menu starts the first pair with it ticked; a bundle starts with a deep clean
        const pick = list.find((x) => x.id === start);
        if (pick) setPairs((ps) => ps.map((p, i) => (i === 0 && !p.services.length ? { ...p, services: [pick.kind === 'bundle' ? DEEP_CLEAN : pick.id] } : p)));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = services.filter((x) => x.kind === 'fixed' || x.kind === 'quote');
  const byId = useMemo(() => Object.fromEntries(services.map((x) => [x.id, x])), [services]);
  const ready = pairs.filter((p) => p.size);
  const price = useMemo(() => priceOrder(ready, services), [ready, services]);
  const pair = pairs[cur];
  const hefty = pairs.length > MAX_PAIRS;
  const reviewed = (p) => p.services.some((id) => byId[id]?.kind === 'quote');
  const pairCents = (p) => p.services.reduce((sum, id) => sum + (byId[id] && byId[id].kind !== 'quote' ? byId[id].price_cents || 0 : 0), 0);
  const pairPrice = (p) => `${money(pairCents(p))}${reviewed(p) ? ' +' : ''}`;
  const optionPrice = (o) => (o.kind !== 'quote' ? money(o.price_cents) : o.price_cents ? `from ${money(o.price_cents)}` : 'we’ll tell you');

  function go(next) {
    setError('');
    setScreen(next);
    const top = cardRef.current?.getBoundingClientRect().top;
    if (top != null && top < 70) window.scrollBy({ top: top - 90, behavior: 'smooth' });
  }
  function edit(fields, i = cur) {
    setPairs((ps) => ps.map((p, j) => (j === i ? { ...p, ...fields } : p)));
  }
  function toggle(id) {
    edit({ services: pair.services.includes(id) ? pair.services.filter((x) => x !== id) : [...pair.services, id] });
  }
  function open(i) {
    const p = pairs[i];
    setCur(i);
    go(p.size ? 'confirm' : p.confirmed ? 'size' : p.services.length ? 'about' : 'photos');
  }
  function another() {
    setPairs((ps) => [...ps, newPair()]);
    setCur(pairs.length);
    go('photos');
  }
  function toReview() {
    // a pair started but left without photos is dropped on the way back
    if (!pair.photos.length && !pair.services.length && pairs.length > 1) {
      setPairs((ps) => ps.filter((_, j) => j !== cur));
      setCur(0);
    }
    go('review');
  }
  function removePair(i) {
    setPairs((ps) => ps.filter((_, j) => j !== i));
    setCur(0);
    go('review');
  }

  async function addPhotos(files) {
    const key = pair.key;
    const room = MAX_PHOTOS - pair.photos.length;
    const list = [...files].slice(0, room);
    if (!list.length) return;
    setError('');
    const tiles = list.map(() => ({ id: crypto.randomUUID(), path: null, preview: null }));
    const update = (fn) => setPairs((ps) => ps.map((p) => (p.key === key ? { ...p, photos: fn(p.photos) } : p)));
    update((ph) => [...ph, ...tiles]);
    await Promise.all(list.map(async (file, n) => {
      try {
        const up = await uploadPhoto(file);
        update((ph) => ph.map((t) => (t.id === tiles[n].id ? { ...t, ...up } : t)));
      } catch (e) {
        update((ph) => ph.filter((t) => t.id !== tiles[n].id));
        setError(e.message);
      }
    }));
  }
  function removePhoto(id) {
    edit({ photos: pair.photos.filter((t) => t.id !== id) });
  }

  const payload = () => ready.map((p) => ({
    model: p.model, size: sizeText(p), services: p.services, photos: p.photos.filter((t) => t.path).map((t) => t.path),
  }));

  async function book() {
    setError('');
    if (handoff === 'pickup' && (!pickup.address.trim() || !pickup.phone.trim())) return setError('Pickup needs an address and a mobile number.');
    setBusy(true);
    const { data, error } = await supabase.rpc('create_booking', {
      p_email: email,
      p_pairs: payload(),
      p_handoff: handoff,
      p_pickup_address: handoff === 'pickup' ? pickup.address : null,
      p_pickup_phone: handoff === 'pickup' ? pickup.phone : null,
      p_pickup_evening: handoff === 'pickup' ? pickup.evening : null,
      p_photo_consent: photoOk,
    });
    setBusy(false);
    if (error) return setError(error.message || 'Something went wrong. Try again.');
    setDone({ ...data, kind: 'booking' });
  }

  async function requestQuote() {
    setError('');
    setBusy(true);
    const list = ready.map((p, i) => `${i + 1}. ${pairName(p, i)} (size ${sizeText(p)}): ${p.services.map((id) => (byId[id] ? label(byId[id]) : id)).join(', ')}`);
    const how = handoff === 'pickup'
      ? `Pickup: ${pickup.address}, ${pickup.phone}${pickup.evening ? `, ${pickup.evening} evening` : ''}`
      : 'Drop-off';
    const { data, error } = await supabase.rpc('create_quote_request', {
      p_email: email,
      p_kind: `Hefty job · ${ready.length} pairs`,
      p_description: `${how}\n${list.join('\n')}`,
      p_shoe_model: `${ready.length} pairs`,
      p_shoe_size: null,
      p_inspiration_url: null,
    });
    setBusy(false);
    if (error) return setError(error.message || 'Something went wrong. Try again.');
    setDone({ ...data, kind: 'quote', pairs: ready.length });
  }

  // ---------- pieces ----------
  const thumb = (photo, big, key) => (
    <span key={key} className={`${s.tt}${big ? ' ' + s.big : ''}`}>
      {photo?.preview ? <img src={photo.preview} alt="" /> : photo ? <span className={s.ttEmpty} aria-hidden="true">{photo.path ? '✓' : ''}</span> : null}
    </span>
  );

  const tray = () => (
    <div className={s.tray} role="list" aria-label="Your pairs">
      {pairs.map((p, i) => {
        const on = i === cur && screen !== 'review' && screen !== 'details';
        const needs = p.confirmed && !p.size;
        return (
          <button key={p.key} type="button" role="listitem" className={`${s.tchip}${on ? ' ' + s.on : ''}${needs ? ' ' + s.needs : ''}`} onClick={() => open(i)}>
            {thumb(p.photos[0])}
            Pair {i + 1}
            {p.size ? <em className={s.ok}>✓ {sizeText(p)}</em> : needs ? <em className={s.need}>Size?</em> : null}
          </button>
        );
      })}
    </div>
  );

  const pairHead = (title) => {
    const k = PAIR_STEPS.indexOf(screen);
    return (
      <>
        {(pairs.length > 1 || pair.confirmed) && tray()}
        <div className={s.top}>
          <div>
            <p className={s.kicker}>Pair {cur + 1} · step {k + 1} of 4</p>
            <h2>{title}</h2>
          </div>
          <div className={s.dots} aria-hidden="true">{PAIR_STEPS.map((x, i) => <i key={x} className={i <= k ? s.dotOn : ''} />)}</div>
        </div>
      </>
    );
  };

  const err = () => (error ? <p className="error" role="alert" style={{ margin: 0 }}>{error}</p> : null);

  // ---------- screens ----------
  if (done) {
    return (
      <div className={s.layout}><div className={s.card} ref={cardRef}>
        {done.kind === 'quote' ? <QuoteSent result={done} signedIn={!!user} /> : <Booked result={done} email={email} signedIn={!!user} />}
      </div></div>
    );
  }

  let body;
  if (screen === 'photos') {
    const uploading = pair.photos.some((t) => !t.path);
    const next = ANGLES[pair.photos.length];
    body = (
      <>
        {pairHead(`Snap pair ${cur + 1}`)}
        <div className={s.grid}>
          <div className={s.thumbs}>
            {pair.photos.map((t, j) => (
              <div key={t.id} className={s.thumb}>
                {t.preview ? <img src={t.preview} alt={`Pair ${cur + 1}, photo ${j + 1}`} /> : <span className={s.thumbNote}>{t.path ? 'Added' : 'Uploading…'}</span>}
                {t.path && <button type="button" className={s.rm} aria-label="Remove photo" onClick={() => removePhoto(t.id)}>×</button>}
              </div>
            ))}
            {pair.photos.length < MAX_PHOTOS && (
              <label className={s.add}>
                <input type="file" accept="image/*" multiple onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
                <span><b>+</b>{next ? `Add the ${next}` : 'Add more'}</span>
              </label>
            )}
          </div>
          <p className={s.hint}>Side, top and sole is perfect. Good light helps.</p>
        </div>
        {err()}
        <div className={s.go}>
          {pairs.length > 1 ? <button type="button" className={s.back} onClick={toReview}>← Your pairs</button> : <span />}
          <button type="button" className="btn primary" disabled={!pair.photos.some((t) => t.path) || uploading} onClick={() => go('about')}>
            {uploading ? 'Uploading…' : 'Next'}
          </button>
        </div>
      </>
    );
  } else if (screen === 'about') {
    body = (
      <>
        {pairHead("What’s going on with them?")}
        <div className={s.grid}>
          <label className="field">
            <span>What are they? <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></span>
            <input className="input" value={pair.model} onChange={(e) => edit({ model: e.target.value })} placeholder="Jordan 1, Dunk Low, Air Force 1…" maxLength={120} />
          </label>
          <div className={s.fixes} role="group" aria-label="What needs work">
            {options.map((o) => (
              <button key={o.id} type="button" className={s.fix} aria-pressed={pair.services.includes(o.id)} onClick={() => toggle(o.id)}>
                <span className={s.box} aria-hidden="true" />
                <span className={s.say}>{SAY[o.id] || o.name}<small>{label(o)}</small></span>
                <span className={s.pr}>{optionPrice(o)}</span>
              </button>
            ))}
            {!options.length && <p className="muted small">Loading…</p>}
          </div>
          <p className={s.running}><span>This pair</span><b>{pair.services.length ? pairPrice(pair) : '—'}</b></p>
        </div>
        {err()}
        <div className={s.go}>
          <button type="button" className={s.back} onClick={() => go('photos')}>← Photos</button>
          <button type="button" className="btn primary" disabled={!pair.services.length} onClick={() => go('confirm')}>Next</button>
        </div>
      </>
    );
  } else if (screen === 'confirm') {
    body = (
      <>
        {pairHead("Is this your pair?")}
        <div className={s.grid}>
          <div className={s.strip}>{pair.photos.slice(0, 3).map((t) => thumb(t, true, t.id))}</div>
          <p className={s.model}>{pairName(pair, cur)}{pair.size ? <span className="muted"> · size {sizeText(pair)}</span> : null}</p>
          <ul className={s.lines}>
            {pair.services.map((id) => byId[id] && (
              <li key={id}><span>{label(byId[id])}</span><span>{byId[id].kind === 'quote' ? 'Priced after review' : money(byId[id].price_cents)}</span></li>
            ))}
            <li className={s.tot}><span>This pair</span><span>{pairPrice(pair)}</span></li>
          </ul>
          {reviewed(pair) && <p className={s.hint}>We check the photos for paint or anything unsure and tell you the price before any work starts.</p>}
        </div>
        <div className={s.go}>
          <button type="button" className={s.back} onClick={() => go('about')}>← Change</button>
          <button type="button" className="btn primary" onClick={() => { edit({ confirmed: true }); go(pair.size ? 'review' : 'size'); }}>
            {pair.size ? 'Looks right' : 'Yes, that’s it'}
          </button>
        </div>
        {pairs.length > 1 && <button type="button" className={s.quiet} onClick={() => removePair(cur)}>Remove this pair</button>}
      </>
    );
  } else if (screen === 'size') {
    body = (
      <>
        {pairHead("Last thing: what size?")}
        <div className={s.grid}>
          <p className={`${s.flag}${pair.size ? ' ' + s.flagDone : ''}`} role="status">
            <i aria-hidden="true" />{pair.size ? `Size ${sizeText(pair)} added` : 'Add a size so we can pack them right'}
          </p>
          <div className={s.seg} role="radiogroup" aria-label="Size run">
            {Object.keys(SIZES).map((r) => (
              <button key={r} type="button" role="radio" aria-checked={pair.run === r} onClick={() => edit({ run: r, size: '' })}>{r}</button>
            ))}
          </div>
          <div className={s.sizes} role="radiogroup" aria-label="Size">
            {SIZES[pair.run].map((x) => (
              <button key={x} type="button" role="radio" aria-checked={pair.size === x} onClick={() => edit({ size: x })}>{x}</button>
            ))}
          </div>
        </div>
        {pair.size ? (
          <div className={s.ready}>
            <p><b>Pair {cur + 1} is ready.</b> {pairPrice(pair)}</p>
            <div className={s.two}>
              <button type="button" className="btn ghost" disabled={pairs.length >= MAX_ANY} onClick={another}>+ Another pair</button>
              <button type="button" className="btn primary" onClick={() => go('review')}>See my price</button>
            </div>
          </div>
        ) : (
          <div className={s.go}>
            <button type="button" className={s.back} onClick={() => go('confirm')}>← Back</button>
            <button type="button" className="btn primary" disabled>Pick a size</button>
          </div>
        )}
      </>
    );
  } else if (screen === 'review') {
    const unfinished = pairs.filter((p) => !p.size).length;
    const deepCount = ready.filter((p) => p.services.includes(DEEP_CLEAN)).length;
    const bundle3 = services.find((x) => x.kind === 'bundle' && x.pairs === 3);
    const single = byId[DEEP_CLEAN]?.price_cents;
    const nudge = !hefty && deepCount % 3 === 2 && bundle3 && single && bundle3.price_cents < 3 * single;
    body = (
      <>
        {tray()}
        <div className={s.top}><h2>Your price</h2></div>
        <div className={s.grid}>
          <ul className={s.order}>
            {pairs.map((p, i) => p.size && (
              <li key={p.key}>
                {thumb(p.photos[0])}
                <span className={s.who}><b>{pairName(p, i)}</b><small>Size {sizeText(p)} · {p.services.map((id) => (byId[id] ? label(byId[id]) : id)).join(', ')}</small></span>
                {!hefty && <span className={s.pr}>{pairPrice(p)}</span>}
                <button type="button" className="linkbtn" onClick={() => open(i)}>Edit</button>
              </li>
            ))}
          </ul>
          {unfinished > 0 && (
            <p className={s.flag} role="status"><i aria-hidden="true" />{unfinished === 1 ? 'One pair still needs' : `${unfinished} pairs still need`} finishing. Tap it above.</p>
          )}
          {hefty ? (
            <div className="hefty">
              <strong>{pairs.length} pairs is a hefty job.</strong>
              <span>Orders over {MAX_PAIRS} pairs get one price for everything. Send the list and we’ll reply. Nothing is booked or charged until you accept.</span>
            </div>
          ) : ready.length > 0 && (
            <ul className={s.lines}>
              <li><span>{ready.length} {ready.length === 1 ? 'pair' : 'pairs'}</span><span>{money(price.subtotal)}</span></li>
              {price.discount > 0 && <li className={s.save}><span>Deep clean bundle ({price.deepCount} pairs)</span><span>−{money(price.discount)}</span></li>}
              <li className={s.tot}><span>Your price</span><span>{money(price.total)}{price.quoted.length ? ' +' : ''}</span></li>
            </ul>
          )}
          {!hefty && (
            <p className={s.hint}>
              {price.quoted.length > 0 && '+ Paint and “not sure” pairs are priced from your photos. '}
              We double-check every pair. If anything changes, you’ll hear before you pay. Prices are subject to change.
            </p>
          )}
          {nudge && <p className={s.nudge}>Add one more deep clean and the 3-pair bundle takes {money(3 * single - bundle3.price_cents)} off.</p>}
          <button type="button" className="btn ghost" style={{ justifySelf: 'start' }} disabled={pairs.length >= MAX_ANY} onClick={another}>+ Another pair</button>
        </div>
        <button type="button" className="btn primary block" disabled={!ready.length || unfinished > 0} onClick={() => go('details')}>
          {hefty ? `Get one price for ${pairs.length} pairs` : 'Book these pairs'}
        </button>
      </>
    );
  } else {
    body = (
      <>
        <div className={s.top}>
          <div>
            <p className={s.kicker}>{ready.length} {ready.length === 1 ? 'pair' : 'pairs'}{hefty ? '' : ` · ${money(price.total)}${price.quoted.length ? ' +' : ''}`}</p>
            <h2>Almost done</h2>
          </div>
        </div>
        <div className={s.grid}>
          {user ? (
            <div className="soft small">Booking as <strong>{user.email}</strong>. {hefty ? 'The quote shows up in your account.' : 'This order goes in your account.'}</div>
          ) : (
            <label className="field">Email
              <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              <span className="muted" style={{ fontWeight: 400 }}>{hefty ? 'Your price comes here.' : 'Your order number and tracking link go here.'}</span>
            </label>
          )}
          <div className={s.reach} role="radiogroup" aria-label="Drop-off or pickup">
            <button type="button" role="radio" aria-checked={handoff === 'drop_off'} onClick={() => setHandoff('drop_off')}>Drop off<small>Bronx, NY</small></button>
            <button type="button" role="radio" aria-checked={handoff === 'pickup'} onClick={() => setHandoff('pickup')}>Pickup<small>Evenings after 5</small></button>
          </div>
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
                  {EVENINGS.map((d) => <button key={d} type="button" className="pill" aria-pressed={pickup.evening === d} onClick={() => setPickup({ ...pickup, evening: d })}>{d}</button>)}
                </div>
              </div>
            </div>
          )}
          {!hefty && (
            <>
              <label className={s.check}>
                <input type="checkbox" checked={photoOk} onChange={(e) => setPhotoOk(e.target.checked)} />
                <span>OK to post before/after photos of my pairs on Instagram.</span>
              </label>
              <label className={s.check}>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>I agree to the <Link href="/terms">service terms</Link>, including the policy for older pairs.</span>
              </label>
            </>
          )}
        </div>
        {err()}
        <div className={s.go}>
          <button type="button" className={s.back} onClick={() => go('review')}>← Your price</button>
          {hefty ? (
            <button type="button" className="btn primary" disabled={!email || busy} onClick={requestQuote}>{busy ? 'Sending…' : 'Send for a price'}</button>
          ) : (
            <button type="button" className="btn primary" disabled={!email || !agreed || busy} onClick={book}>{busy ? 'Booking…' : 'Book it'}</button>
          )}
        </div>
        <p className={s.promise}>{hefty ? 'Nothing is booked until you accept the price.' : 'Test version: nothing is charged. You pay at drop-off.'}</p>
      </>
    );
  }

  const bundles = services.filter((x) => x.kind === 'bundle');
  return (
    <div className={s.layout}>
      <div className={s.card} ref={cardRef} aria-live="polite">
        <div className={s.step} key={`${screen}-${cur}`}>{body}</div>
      </div>
      <aside className={s.side}>
        <div className={s.est}>
          {ready.length && !hefty ? (
            <>
              <h3>Your price so far</h3>
              <ul className={s.lines}>
                {pairs.map((p, i) => p.size && <li key={p.key}><span>{pairName(p, i)} · {sizeText(p)}</span><span>{pairPrice(p)}</span></li>)}
                {price.discount > 0 && <li className={s.save}><span>Bundle savings</span><span>−{money(price.discount)}</span></li>}
                <li className={s.tot}><span>Total</span><span>{money(price.total)}{price.quoted.length ? ' +' : ''}</span></li>
              </ul>
            </>
          ) : (
            <>
              <h3>Your price shows up here</h3>
              <p className="muted small" style={{ margin: 0 }}>As soon as your first pair is ready. Bundle savings come off on their own.</p>
            </>
          )}
        </div>
        {bundles.length > 0 && (
          <div className={s.bund}>
            <h3>Bringing a few pairs?</h3>
            <p className="muted small" style={{ margin: 0 }}>Deep clean bundles come off your price automatically.</p>
            <ul>
              {bundles.map((b) => <li key={b.id}><span>{b.pairs} pairs</span><span>{money(b.price_cents)}</span></li>)}
              <li><span>{MAX_PAIRS + 1}+ pairs</span><span>quoted</span></li>
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function QuoteSent({ result, signedIn }) {
  return (
    <div className={s.doneBox}>
      <div className={s.checkmark} aria-hidden="true">✓</div>
      <h2>Sent. Request #{result.number}.</h2>
      <p className="muted" style={{ margin: 0 }}>We’ll look over all {result.pairs} pairs and reply with one price. Nothing is charged until you accept.</p>
      {signedIn && <Link href="/account?tab=quotes" className="btn primary block">See it in your account</Link>}
      <Link href="/" className="btn ghost block">Back to home</Link>
    </div>
  );
}

function Booked({ result, email, signedIn }) {
  const pickup = result.handoff === 'pickup';
  return (
    <div className={s.doneBox}>
      <div className={s.checkmark} aria-hidden="true">✓</div>
      <h2>You’re booked in. Order #{result.number}.</h2>
      <p className="muted" style={{ margin: 0 }}>We look over your photos, usually the same day, and tell you if anything changes. Keep your order number with your email ({email}).</p>
      <ol className={s.next}>
        <li><b>1</b><span>{result.needs_quote ? 'We price the paint or “not sure” pairs and confirm the rest.' : 'We confirm your price from the photos.'}</span></li>
        <li><b>2</b><span>{pickup ? 'We text you to confirm the evening, then pick them up.' : <>Drop them off: <strong>{result.shop_address}</strong>. {result.shop_hours}</>}</span></li>
        <li><b>3</b><span>Follow each pair on your tracking page until it’s back in your hands.</span></li>
      </ol>
      {signedIn ? (
        <Link href={`/account?order=${result.number}`} className="btn primary block">See it in your account</Link>
      ) : (
        <>
          <Link href={`/track?n=${result.number}`} className="btn primary block">Track this order</Link>
          <p className="muted small" style={{ margin: 0 }}>Want every order in one place? <Link href="/sign-in">Sign in</Link> with {email} and this one shows up in your account.</p>
        </>
      )}
    </div>
  );
}
