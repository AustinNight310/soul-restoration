'use client';
// Drag-to-compare sneaker drawing. Swap the two drawings for real photos once Criss has them.
import { useState } from 'react';

const UPPER = 'M70,215 C60,190 75,170 100,160 L150,140 C170,110 200,85 240,78 C270,73 300,78 320,92 L345,110 C380,118 430,128 470,145 C510,160 535,175 540,195 L545,215 Z';
const MIDSOLE = 'M60,215 L548,215 C552,232 545,245 525,248 L85,248 C65,248 55,235 60,215 Z';
const OUTSOLE = 'M85,248 L525,248 C520,258 510,264 495,264 L100,264 C90,264 86,257 85,248 Z';

function Shoe({ clean }) {
  return (
    <svg viewBox="0 0 600 338" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
      <rect width="600" height="338" fill={clean ? '#F4F7F9' : '#E9E4DA'} />
      <ellipse cx="305" cy="282" rx="250" ry="12" fill="#0A2A40" opacity="0.1" />
      <path d={UPPER} fill={clean ? '#FFFFFF' : '#9C9078'} stroke={clean ? '#D5DDE3' : 'none'} strokeWidth="2" />
      <path d={MIDSOLE} fill={clean ? '#FFFFFF' : '#B3A88F'} stroke={clean ? '#D5DDE3' : 'none'} strokeWidth="2" />
      <path d={OUTSOLE} fill={clean ? '#0A6FAE' : '#5E5545'} />
      <path d="M190,175 C260,165 340,170 420,195" stroke={clean ? '#0A6FAE' : '#6E6450'} strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M262,98 L300,124 M282,92 L322,118 M302,96 L340,120" stroke={clean ? '#181D22' : '#4A4334'} strokeWidth="4" strokeLinecap="round" />
      {!clean && (
        <g fill="#5E5545" opacity="0.45">
          <circle cx="140" cy="230" r="9" /><circle cx="330" cy="236" r="12" /><circle cx="230" cy="190" r="14" /><circle cx="400" cy="160" r="10" />
        </g>
      )}
    </svg>
  );
}

export default function BeforeAfter() {
  const [pos, setPos] = useState(50);
  return (
    <div>
      <div style={{ position: 'relative', aspectRatio: '16 / 9', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--line)' }}>
        <Shoe clean={false} />
        <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)` }}><Shoe clean /></div>
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
      <p className="muted small" style={{ textAlign: 'center', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11 }}>
        Drag to compare
      </p>
    </div>
  );
}
