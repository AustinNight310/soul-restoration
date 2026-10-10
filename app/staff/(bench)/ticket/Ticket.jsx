'use client';
// Bench tickets: one 4×6 card per pair (order number, pair, services to tick off, check-in note),
// printed and kept with the shoes. Everything else on the page is hidden when printing.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { useStaff, firstName } from '../staff-shared';
import s from './ticket.module.css';

export default function Ticket() {
  const id = useSearchParams().get('id');
  const { person } = useStaff();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('orders')
      .select('id, number, handoff, created_at, shoe_model, shoe_size, shoe_color, checkin_condition, assigned_to, order_items(name, pair_id), order_pairs!order_pairs_order_id_fkey(id, position, shoe_model, shoe_size, shoe_color, notes)')
      .eq('id', id).maybeSingle()
      .then(({ data, error }) => (error || !data ? setError('Couldn’t find that order.') : setOrder(data)));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!order) return <p className="muted">Loading…</p>;

  const pairs = order.order_pairs.length
    ? [...order.order_pairs].sort((a, b) => a.position - b.position)
    : [{ id: null, position: 1, shoe_model: order.shoe_model, shoe_size: order.shoe_size, shoe_color: order.shoe_color }];
  const who = firstName(person(order.assigned_to));
  const day = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <>
      <style>{'@page { size: 6in 4in; margin: 0; }'}</style>
      <div className={s.controls}>
        <Link href={`/staff/order?id=${order.id}`} className="btn ghost small">← Back to #{order.number}</Link>
        <button className="btn primary small" onClick={() => window.print()}>Print {pairs.length} {pairs.length === 1 ? 'ticket' : 'tickets'}</button>
      </div>
      <div className={s.sheet}>
        {pairs.map((p) => {
          const items = order.order_items.filter((i) => (p.id ? i.pair_id === p.id : true));
          return (
            <article key={p.position} className={s.ticket}>
              <header className={s.head}>
                <div>
                  <div className={s.brand}>Soul·Sneakers</div>
                  <div className={s.meta}>{order.handoff === 'pickup' ? 'PICKUP' : 'DROP-OFF'} · IN {day(order.created_at)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={s.number}>#{order.number}</div>
                  <div className={s.meta}>PAIR {p.position} OF {pairs.length}</div>
                </div>
              </header>
              <div className={s.shoe}>{p.shoe_model || 'Pair'}{p.shoe_size ? ` · ${p.shoe_size}` : ''}</div>
              {p.shoe_color && <div>{p.shoe_color}</div>}
              <ul className={s.list}>
                {items.map((i, n) => <li key={n}><span className={s.box} aria-hidden="true" />{i.name}</li>)}
              </ul>
              {(p.notes || order.checkin_condition) && <div className={s.note}>{[order.checkin_condition, p.notes].filter(Boolean).join(' · ')}</div>}
              {who && <div className={s.meta} style={{ marginTop: 'auto' }}>ASSIGNED: {who.toUpperCase()}</div>}
            </article>
          );
        })}
      </div>
    </>
  );
}
