'use client';
// The service menu, read live from the database so prices change without touching code.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, money } from '../lib/supabase';
import Dunk from './Dunk';
import styles from '../app/services/services.module.css';

// What each service fixes, in plain words, plus a colorway for its picture.
const DETAILS = {
  deep_clean: { fixes: 'Dirt, stains, scuffs, smell', colors: { over: '#c8102e' } },
  icing: { fixes: 'Yellow see-through soles', colors: { over: '#181d22', sole: '#bfe3f7' } },
  oxidation: { fixes: 'Yellowed white midsoles', colors: { over: '#2f78c4' } },
  suede: { fixes: 'Flat, stained or faded suede', colors: { up: '#c9a27e', over: '#8a6a4f', sole: '#e8d9b5' } },
  sole_repair: { fixes: 'Soles peeling or lifting', colors: { over: '#e05a2b' } },
};

export default function Menu() {
  const [services, setServices] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('services')
      .select('id, name, description, kind, price_cents, price_is_sample, pairs')
      .order('sort')
      .then(({ data, error }) => {
        if (error) setError('The menu didn’t load. Refresh to try again.');
        else setServices(data);
      });
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!services) return <p className="muted">Loading the menu…</p>;

  const fixed = services.filter((s) => s.kind === 'fixed');
  const bundles = services.filter((s) => s.kind === 'bundle');
  const paint = services.find((s) => s.id === 'paint');

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className={styles.grid}>
        {fixed.map((s) => (
          <div key={s.id} className={styles.svc}>
            <div className={styles.thumb}><Dunk clean colors={DETAILS[s.id]?.colors} viewBox="-10 -10 324 160" /></div>
            <div className={styles.body}>
              <div className={styles.top}>
                <h3>{s.name}</h3>
                <span className={styles.price}>{money(s.price_cents)}</span>
              </div>
              <p className="small" style={{ margin: 0, color: 'var(--ink-soft)' }}>{s.description}</p>
              {DETAILS[s.id] && <span className="muted" style={{ fontSize: 13 }}>Fixes: {DETAILS[s.id].fixes}</span>}
              <Link href={`/book?s=${s.id}`} className={styles.bookLink}>Book this →</Link>
            </div>
          </div>
        ))}
      </div>

      {bundles.length > 0 && (
        <div className="soft" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 21 }}>Deep clean bundles</div>
            <div className="muted small">Bring the whole rotation. Mix in other services per pair when you book.</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {bundles.map((b) => (
              <Link key={b.id} href={`/book?s=${b.id}`} className="btn ghost small">
                {b.pairs} pairs · {money(b.price_cents)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {paint && (
        <Link href="/book?s=paint" className="card" style={{ background: 'var(--deep)', color: 'var(--on-deep)', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center', border: 'none' }}>
          <span>
            <span style={{ display: 'block', fontFamily: 'var(--display)', fontSize: 21 }}>Paint jobs</span>
            <span style={{ color: 'var(--deep-soft)', fontSize: 14 }}>Recolors, touch-ups and custom designs. From {money(paint.price_cents)}. Snap it, tick “Paint”, and we price it from your photos.</span>
          </span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--sky)' }}>Start with photos →</span>
        </Link>
      )}

      <p className="muted small" style={{ margin: 0 }}>
        Prices are per pair{services.some((s) => s.price_is_sample) ? ', samples for testing, and subject to change' : ''}. More than 10 pairs is a hefty job, and we'll quote it.
      </p>
    </div>
  );
}
