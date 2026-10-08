'use client';
// The service menu, read live from the database so prices change without touching code.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, money } from '../lib/supabase';

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
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {fixed.map((s) => (
          <Link key={s.id} href={`/book?s=${s.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'var(--display)', fontSize: 21 }}>{s.name}</span>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{money(s.price_cents)}</span>
            </div>
            <span className="muted small">{s.description}</span>
          </Link>
        ))}
      </div>

      {bundles.length > 0 && (
        <div className="soft" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
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

      {services.some((s) => s.price_is_sample) && (
        <p className="muted small" style={{ margin: 0 }}>Prices are samples for testing and are subject to change.</p>
      )}
    </div>
  );
}
