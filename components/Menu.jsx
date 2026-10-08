'use client';
// The service menu, read live from the database so prices change without touching code.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, money } from '../lib/supabase';
import Shoe from './Shoe';
import styles from '../app/services/services.module.css';

// What each service fixes, in plain words, plus a colorway for its picture.
const DETAILS = {
  deep_clean: { fixes: 'Dirt, stains, scuffs, smell', colors: { accent: '#C8102E', sole: '#C8102E' } },
  icing: { fixes: 'Yellow see-through soles', colors: { accent: '#181D22', sole: '#9FD3F0' } },
  oxidation: { fixes: 'Yellowed white midsoles', colors: { accent: '#E1E6EA', sole: '#FFFFFF' } },
  suede: { fixes: 'Flat, stained or faded suede', colors: { upper: '#8A6A4F', accent: '#3E2C1E', sole: '#E8D9B5' } },
  sole_repair: { fixes: 'Soles peeling or lifting', colors: { accent: '#E05A2B', sole: '#5F6870' } },
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
  const paint = services.find((s) => s.kind === 'quote');

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className={styles.grid}>
        {fixed.map((s) => (
          <div key={s.id} className={styles.svc}>
            <div className={styles.thumb}><Shoe clean colors={DETAILS[s.id]?.colors} viewBox="110 60 400 260" /></div>
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
        <Link href="/quote" className="card" style={{ background: 'var(--ink)', color: '#fff', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center', border: 'none' }}>
          <span>
            <span style={{ display: 'block', fontFamily: 'var(--display)', fontSize: 21 }}>Paint jobs</span>
            <span style={{ color: '#c9d0d6', fontSize: 14 }}>Recolors, touch-ups and custom designs. From {money(paint.price_cents)}. Send photos, get a price.</span>
          </span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--sky)' }}>Get a quote →</span>
        </Link>
      )}

      <p className="muted small" style={{ margin: 0 }}>
        Prices are per pair{services.some((s) => s.price_is_sample) ? ', samples for testing, and subject to change' : ''}. More than 10 pairs is a hefty job, and we'll quote it.
      </p>
    </div>
  );
}
