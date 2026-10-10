// Dunk Low-style sneaker in flat line art, no logo. Drawn in a 304 x 140 box.
// Real photos replace it per pair (see lib/work.js).
export const DIRTY = { up: '#d8cdb4', over: '#8d826c', sole: '#e9d59c' };
const TOE_DOTS = [[250, 84], [258, 86], [266, 89], [274, 92], [254, 92], [262, 94], [270, 97], [246, 90]];
const TREAD = Array.from({ length: 23 }, (_, i) => `M${16 + i * 12},126 v7`).join(' ');

export function DunkPaths({ up = '#fff', over = '#2f78c4', sole = '#fff', dirt = false }) {
  return (
    <g className="sr-ill">
      <path className="sr-o" fill={up} d="M8,108 C6,86 8,58 12,44 C14,36 18,32 26,32 C40,34 56,46 72,50 C82,52 90,46 96,40 C96,30 98,20 104,15 C111,9 124,10 128,16 L132,27 C156,39 184,53 212,62 C246,70 278,80 290,93 C296,99 298,104 296,108 Z" />
      <path className="sr-t" d="M104,18 C112,21 120,22 128,20" />
      <rect className="sr-o" x="105" y="22" width="14" height="9" rx="2" fill={over} transform="rotate(-10 112 26)" />
      <path className="sr-o" fill={over} d="M8,108 C6,86 8,58 12,44 C14,38 18,35 24,35 C30,50 36,62 52,70 C64,76 72,92 74,108 Z" />
      <path className="sr-d" d="M14,102 C12,84 13,60 17,46 M22,40 C28,54 36,66 50,74 C60,80 66,94 68,104" />
      <path className="sr-o" fill={over} d="M297,108 C299,100 293,94 285,90 C269,82 250,76 232,74 C232,86 226,96 214,102 C196,107 150,108 120,108 Z" />
      <path className="sr-d" d="M236,79 C236,90 230,99 218,104 C200,108 160,109 130,109 M285,96 C276,90 262,84 244,80" />
      <path className="sr-o" fill={over} d="M100,38 L132,28 C154,40 182,52 212,62 L218,74 C186,66 152,54 126,40 C118,44 108,44 100,38 Z" />
      <path className="sr-d" d="M108,40 C116,44 124,44 128,44 C152,56 184,68 214,72" />
      {TOE_DOTS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#181d22" />)}
      <path className="sr-t" d="M26,38 C42,40 58,52 72,55" />
      <g fill="#fff" className="sr-o">
        {[[129, 28], [147, 37], [165, 45], [183, 53], [201, 60]].map(([x, y]) => (
          <ellipse key={x} cx={x} cy={y} rx="9" ry="5" transform={`rotate(-24 ${x} ${y})`} />
        ))}
      </g>
      <path className="sr-o" fill={sole} d="M5,108 L295,108 C299,108 301,112 300,118 L298,128 C297,133 293,136 287,136 L14,136 C8,136 4,133 3,128 L2,116 C2,111 2,108 5,108 Z" />
      <path className="sr-t" d="M3,122 L300,122" />
      <path className="sr-t" d={TREAD} />
      {dirt && (
        <g fill="#7d7260" opacity=".45">
          <circle cx="60" cy="92" r="7" /><circle cx="150" cy="80" r="9" /><circle cx="210" cy="96" r="6" /><circle cx="120" cy="114" r="5" /><circle cx="250" cy="116" r="6" />
        </g>
      )}
    </g>
  );
}

// A whole pair on its backdrop, filling its container. `colors` sets the clean colorway.
export default function Dunk({ clean = true, colors = {}, viewBox = '-40 -30 384 200' }) {
  const c = clean ? colors : { ...DIRTY, ...(colors.dirty || {}) };
  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: clean ? '#eef2f5' : '#e6dfd1' }}>
      <ellipse cx="152" cy="140" rx="150" ry="7" fill="#0A2A40" opacity=".12" />
      <DunkPaths up={c.up} over={c.over} sole={c.sole} dirt={!clean} />
    </svg>
  );
}
