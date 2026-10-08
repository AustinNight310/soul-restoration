'use client';
// Drag-to-compare for one pair: a real photo pair when it has one, otherwise the drawing.
import { useState } from 'react';
import { WorkImage } from './Shoe';

export default function BeforeAfter({ item }) {
  const [pos, setPos] = useState(55);
  return (
    <div>
      <div style={{ position: 'relative', aspectRatio: '16 / 10', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--line)' }}>
        <WorkImage item={item} clean={false} />
        <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)` }}><WorkImage item={item} clean /></div>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, width: 2, marginLeft: -1, background: '#fff', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: `${pos}%`, width: 44, height: 44, margin: '-22px 0 0 -22px', borderRadius: '50%', background: '#fff', border: '2px solid var(--accent)', pointerEvents: 'none' }} />
        <span className="badge" style={{ position: 'absolute', left: 12, bottom: 12, background: '#fff' }}>After</span>
        <span className="badge grey" style={{ position: 'absolute', right: 12, bottom: 12, background: '#fff' }}>Before</span>
        <input
          type="range" min="0" max="100" value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Drag to compare before and after"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, opacity: 0, cursor: 'ew-resize' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 10, fontSize: 14 }}>
        <strong>{item.model}</strong><span className="muted">{item.services.join(' · ')}</span>
      </div>
    </div>
  );
}
