'use client';
// One order's status card: the stage timeline, each pair and its services, the total, and how it gets
// to the shop. Takes what get_order_status returns. Used by tracking and by the customer's account.
import { money, STAGES, stageLabel } from '../lib/supabase';

export default function OrderStatus({ order }) {
  const current = STAGES.findIndex((s) => s.id === order.status);
  return (
    <div className="card" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div className="muted small" style={{ fontFamily: 'var(--mono)' }}>ORDER #{order.number}</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 24 }}>{order.shoe_model || 'Your pair'}</div>
        </div>
        <span className={`badge ${order.status === 'ready_for_pickup' ? 'ok' : ''}`}>{stageLabel(order.status)}</span>
      </div>

      {order.status !== 'cancelled' && (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 0 }}>
          {STAGES.map((s, i) => {
            const doneStage = i < current, now = i === current;
            const ev = order.events.find((e) => e.status === s.id);
            return (
              <li key={s.id} style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', boxSizing: 'border-box',
                    background: doneStage ? 'var(--accent)' : 'var(--card)',
                    border: now ? '4px solid var(--accent)' : doneStage ? 'none' : '2px solid var(--stroke-strong)' }} />
                  {i < STAGES.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 26, background: doneStage ? 'var(--accent)' : 'var(--line)' }} />}
                </div>
                <div style={{ paddingBottom: 12, marginTop: -3 }}>
                  <div style={{ fontWeight: 600, color: i > current ? 'var(--muted)' : 'var(--ink)' }}>{s.label}</div>
                  {ev && <div className="muted small">{new Date(ev.at).toLocaleDateString()}{ev.note ? ` · ${ev.note}` : ''}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="soft small" style={{ display: 'grid', gap: 4 }}>
        {order.pairs?.length > 0 ? order.pairs.map((p) => (
          <div key={p.position} style={{ display: 'grid', gap: 2, paddingBottom: 6 }}>
            <strong>{p.position}. {p.model || `Pair ${p.position}`}</strong>
            {p.items.map((it) => <ItemLine key={it.name} item={it} />)}
          </div>
        )) : order.items.map((it) => <ItemLine key={it.name} item={it} />)}
        {order.discount_cents > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ok)' }}><span>Deep clean bundle savings</span><span style={{ fontFamily: 'var(--mono)' }}>−{money(order.discount_cents)}</span></div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 6, marginTop: 2 }}><strong>Total</strong><span style={{ fontFamily: 'var(--mono)' }}>{money(order.total_cents)}</span></div>
      </div>

      {order.handoff === 'pickup' ? (
        <p className="small" style={{ margin: 0 }}>
          {order.pickup_status === 'confirmed' ? <>Pickup confirmed{order.pickup_time ? `: ${order.pickup_time}` : ''}.</> : 'Pickup requested. Criss will text you to confirm the time.'}
        </p>
      ) : order.shop_address && (
        <p className="small" style={{ margin: 0 }}><strong>Drop-off / pickup:</strong> {order.shop_address}. {order.shop_hours}</p>
      )}
    </div>
  );
}

function ItemLine({ item }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span>{item.name}</span>
      <span style={{ fontFamily: 'var(--mono)' }}>{item.needs_quote ? 'priced after review' : money(item.price_cents)}</span>
    </div>
  );
}
