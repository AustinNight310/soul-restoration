// Drawn sneaker used until real photos are in. `colors` sets the clean colorway;
// the dirty version is the same shape, muddied and stained.
const UPPER = 'M70,215 C60,190 75,170 100,160 L150,140 C170,110 200,85 240,78 C270,73 300,78 320,92 L345,110 C380,118 430,128 470,145 C510,160 535,175 540,195 L545,215 Z';
const MIDSOLE = 'M60,215 L548,215 C552,232 545,245 525,248 L85,248 C65,248 55,235 60,215 Z';
const OUTSOLE = 'M85,248 L525,248 C520,258 510,264 495,264 L100,264 C90,264 86,257 85,248 Z';

export const DEFAULT_COLORS = { upper: '#FFFFFF', accent: '#0A6FAE', sole: '#0A6FAE' };

export default function Shoe({ clean, colors = DEFAULT_COLORS, viewBox = '0 0 600 338' }) {
  const c = { ...DEFAULT_COLORS, ...colors };
  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
      <rect x="-100" y="-100" width="800" height="600" fill={clean ? '#F4F7F9' : '#E9E4DA'} />
      <ellipse cx="305" cy="282" rx="250" ry="12" fill="#0A2A40" opacity="0.1" />
      <path d={UPPER} fill={clean ? c.upper : c.dirtyUpper || '#9C9078'} stroke={clean ? '#D5DDE3' : 'none'} strokeWidth="2" />
      <path d={MIDSOLE} fill={clean ? '#FFFFFF' : '#C9B98A'} stroke={clean ? '#D5DDE3' : 'none'} strokeWidth="2" />
      <path d={OUTSOLE} fill={clean ? c.sole : '#6B604C'} />
      <path d="M190,175 C260,165 340,170 420,195" stroke={clean ? c.accent : '#6E6450'} strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M262,98 L300,124 M282,92 L322,118 M302,96 L340,120" stroke={clean ? '#181D22' : '#4A4334'} strokeWidth="4" strokeLinecap="round" />
      {!clean && (
        <g fill="#5E5545" opacity="0.45">
          <circle cx="140" cy="230" r="9" /><circle cx="330" cy="236" r="12" /><circle cx="230" cy="190" r="14" /><circle cx="400" cy="160" r="10" />
        </g>
      )}
    </svg>
  );
}

// A real photo when the item has one, otherwise the drawing.
export function WorkImage({ item, clean, viewBox }) {
  const src = clean ? item.after : item.before;
  if (src) {
    return <img src={src} alt={`${item.model}, ${clean ? 'after' : 'before'}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />;
  }
  return <Shoe clean={clean} colors={item.colors} viewBox={viewBox} />;
}
