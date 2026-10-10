// The placeholder bench scenes: flat line illustrations drawn in code, animated with CSS (bench.css).
// Each one is replaced by a Lottie animation as soon as lib/bench.js names a file for that step.
export const SNEAKER_DEFS = `<svg class="ill" width="0" height="0" style="position:absolute" aria-hidden="true"><defs><symbol id="sneaker" viewBox="0 0 304 140">
  <path class="o" fill="var(--up, #fff)" d="M8,108 C6,86 8,58 12,44 C14,36 18,32 26,32 C40,34 56,46 72,50 C82,52 90,46 96,40 C96,30 98,20 104,15 C111,9 124,10 128,16 L132,27 C156,39 184,53 212,62 C246,70 278,80 290,93 C296,99 298,104 296,108 Z"/>
  <path class="thin" d="M104,18 C112,21 120,22 128,20"/>
  <rect class="o" x="105" y="22" width="14" height="9" rx="2" fill="var(--panel, #2f78c4)" transform="rotate(-10 112 26)"/>
  <path class="o" fill="var(--panel, #2f78c4)" d="M8,108 C6,86 8,58 12,44 C14,38 18,35 24,35 C30,50 36,62 52,70 C64,76 72,92 74,108 Z"/>
  <path class="dash" d="M14,102 C12,84 13,60 17,46 M22,40 C28,54 36,66 50,74 C60,80 66,94 68,104"/>
  <path class="o" fill="var(--panel, #2f78c4)" d="M297,108 C299,100 293,94 285,90 C269,82 250,76 232,74 C232,86 226,96 214,102 C196,107 150,108 120,108 Z"/>
  <path class="dash" d="M236,79 C236,90 230,99 218,104 C200,108 160,109 130,109 M285,96 C276,90 262,84 244,80"/>
  <path class="o" fill="var(--panel, #2f78c4)" d="M100,38 L132,28 C154,40 182,52 212,62 L218,74 C186,66 152,54 126,40 C118,44 108,44 100,38 Z"/>
  <path class="dash" d="M108,40 C116,44 124,44 128,44 C152,56 184,68 214,72"/>
  <g fill="#181d22"><circle cx="250" cy="84" r="1.3"/><circle cx="258" cy="86" r="1.3"/><circle cx="266" cy="89" r="1.3"/><circle cx="274" cy="92" r="1.3"/><circle cx="254" cy="92" r="1.3"/><circle cx="262" cy="94" r="1.3"/><circle cx="270" cy="97" r="1.3"/><circle cx="246" cy="90" r="1.3"/></g>
  <path class="thin" d="M26,38 C42,40 58,52 72,55"/>
  <g fill="#fff" class="o"><ellipse cx="129" cy="28" rx="9" ry="5" transform="rotate(-24 129 28)"/><ellipse cx="147" cy="37" rx="9" ry="5" transform="rotate(-24 147 37)"/><ellipse cx="165" cy="45" rx="9" ry="5" transform="rotate(-24 165 45)"/><ellipse cx="183" cy="53" rx="9" ry="5" transform="rotate(-24 183 53)"/><ellipse cx="201" cy="60" rx="9" ry="5" transform="rotate(-24 201 60)"/></g>
  <path class="o" fill="var(--sole, #fff)" d="M5,108 L295,108 C299,108 301,112 300,118 L298,128 C297,133 293,136 287,136 L14,136 C8,136 4,133 3,128 L2,116 C2,111 2,108 5,108 Z"/>
  <path class="thin" d="M3,122 L300,122"/>
  <path class="thin" d="M16,126 v7 M28,126 v7 M40,126 v7 M52,126 v7 M64,126 v7 M76,126 v7 M88,126 v7 M100,126 v7 M112,126 v7 M124,126 v7 M136,126 v7 M148,126 v7 M160,126 v7 M172,126 v7 M184,126 v7 M196,126 v7 M208,126 v7 M220,126 v7 M232,126 v7 M244,126 v7 M256,126 v7 M268,126 v7 M280,126 v7"/>
</symbol></defs></svg>`;

export const SCENES = [
  `<svg class="scene ill" viewBox="0 0 640 420" data-s="1" aria-hidden="true">
  <path d="M80,310 C40,200 130,80 290,70 C450,60 590,120 600,240 C610,350 480,390 320,380 C170,370 110,370 80,310 Z" fill="var(--pale)"/><path class="thin" d="M30,385 H610"/>
  <rect class="o" x="380" y="262" width="230" height="16" rx="3" fill="#fff"/>
  <rect class="o" x="394" y="278" width="202" height="107" fill="var(--pale)"/>
  <path class="thin" d="M412,300 h166 M412,322 h166"/>
  <path class="o" d="M420,262 L432,236 H574 L586,262 Z" fill="var(--blue2)"/>
  <g class="tag"><path class="thin" d="M598,206 L598,220"/><rect class="o" x="570" y="220" width="56" height="30" rx="5" fill="#fff"/><text x="598" y="240" font-family="Space Mono, monospace" font-size="12" text-anchor="middle" fill="#181d22">#1042</text></g>
  <path class="dash" d="M320,240 C350,120 440,110 500,205" stroke-width="2"/>
  <g transform="translate(40,150)">
    <path class="o" d="M0,220 C0,150 40,118 90,118 C140,118 180,150 180,220 Z" fill="var(--blue)"/>
    <path class="o" d="M76,96 L76,122 C84,128 96,128 104,122 L104,96 Z" fill="var(--skin)"/>
    <circle class="o" cx="90" cy="68" r="34" fill="var(--skin)"/>
    <path d="M55,66 C50,30 78,18 98,20 C124,22 132,44 125,66 C120,50 104,42 86,46 C72,49 62,56 55,66 Z" fill="var(--ln)"/>
    <path class="o" d="M122,72 C128,72 130,80 124,84" fill="var(--skin)"/>
    
    <path d="M150,175 C190,170 215,165 236,160" stroke="var(--ln)" stroke-width="31" fill="none" stroke-linecap="round"/><path d="M150,175 C190,170 215,165 236,160" stroke="var(--blue)" stroke-width="25" fill="none" stroke-linecap="round"/>
  </g>
  <circle class="o" cx="284" cy="308" r="14" fill="var(--skin)"/>
  <g class="travel"><use href="#sneaker" x="250" y="245" width="150" height="65"/></g>
  <g transform="translate(140,40)"><g class="pop d2"><rect class="o" x="0" y="0" width="190" height="44" rx="12" fill="#fff"/><path class="o" d="M30,44 L22,58 L44,44" fill="#fff"/><circle cx="24" cy="22" r="9" fill="var(--blue)"/><path d="M19,22 l4,4 7,-8" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><text x="42" y="27" font-family="Figtree, sans-serif" font-size="14" font-weight="600" fill="#181d22">Booked · #1042</text></g></g>
</svg>`,
  `<svg class="scene ill" viewBox="0 0 640 420" aria-hidden="true">
  <path d="M80,310 C40,200 130,80 290,70 C450,60 590,120 600,240 C610,350 480,390 320,380 C170,370 110,370 80,310 Z" fill="var(--pale)"/><path class="thin" d="M30,385 H610"/>
  <ellipse class="o" cx="220" cy="330" rx="170" ry="20" fill="var(--blue2)"/>
  <path class="o" d="M60,330 L60,350 C60,362 380,362 380,350 L380,330" fill="var(--blue2)"/>
  <g style="--up:#d8cdb4;--panel:#8d826c;--sole:#e9d59c"><use href="#sneaker" x="70" y="195" width="300" height="130"/></g>
  <g fill="#7d7260" opacity=".5"><circle cx="130" cy="290" r="7"/><circle cx="240" cy="250" r="9"/><circle cx="310" cy="300" r="6"/><circle cx="200" cy="300" r="5"/></g>
  <g class="scan"><circle class="o" cx="110" cy="250" r="38" fill="#fff" fill-opacity=".35"/><path d="M137,277 L168,308" stroke="var(--ln)" stroke-width="10" stroke-linecap="round"/></g>
  <g transform="translate(440,170)">
    <path class="o" d="M0,220 C0,150 40,118 90,118 C140,118 180,150 180,220 Z" fill="var(--blue)"/>
    <path class="o" d="M76,96 L76,122 C84,128 96,128 104,122 L104,96 Z" fill="var(--skin)"/>
    <circle class="o" cx="90" cy="68" r="34" fill="var(--skin)"/>
    <path d="M55,66 C50,30 78,18 98,20 C124,22 132,44 125,66 C120,50 104,42 86,46 C72,49 62,56 55,66 Z" fill="var(--ln)"/>
    <path class="o" d="M122,72 C128,72 130,80 124,84" fill="var(--skin)"/>
    <g class="thin" stroke-width="2"><circle cx="104" cy="70" r="9" fill="#fff" fill-opacity=".4"/><circle cx="126" cy="70" r="7"/><path d="M113,70 h6"/></g>
    <path d="M40,215 C60,190 80,170 104,150" stroke="var(--ln)" stroke-width="31" fill="none" stroke-linecap="round"/><path d="M40,215 C60,190 80,170 104,150" stroke="var(--blue)" stroke-width="25" fill="none" stroke-linecap="round"/>
  </g>
  <circle class="o" cx="548" cy="316" r="13" fill="var(--skin)"/>
  <g transform="translate(40,40)">
    <rect class="o" x="0" y="0" width="200" height="118" rx="10" fill="#fff"/>
    <g font-family="Figtree, sans-serif" font-size="13" fill="#181d22">
      <rect class="o" x="14" y="16" width="18" height="18" rx="4" fill="#fff"/><path class="tick t1" d="M18,25 l5,5 9,-11" stroke="var(--blue)" stroke-width="3" fill="none" stroke-linecap="round"/><text x="42" y="30">Photographed</text>
      <rect class="o" x="14" y="48" width="18" height="18" rx="4" fill="#fff"/><path class="tick t2" d="M18,57 l5,5 9,-11" stroke="var(--blue)" stroke-width="3" fill="none" stroke-linecap="round"/><text x="42" y="62">Condition noted</text>
      <rect class="o" x="14" y="80" width="18" height="18" rx="4" fill="#fff"/><path class="tick t3" d="M18,89 l5,5 9,-11" stroke="var(--blue)" stroke-width="3" fill="none" stroke-linecap="round"/><text x="42" y="94">Extras need your OK</text>
    </g>
  </g>
  <rect class="flash" x="0" y="0" width="640" height="420" fill="#fff" opacity="0"/>
</svg>`,
  `<svg class="scene ill" viewBox="0 0 640 420" aria-hidden="true">
  <defs><clipPath id="wipeClip"><rect class="wipe" x="90" y="0" width="560" height="420"/></clipPath></defs>
  <path d="M80,310 C40,200 130,80 290,70 C450,60 590,120 600,240 C610,350 480,390 320,380 C170,370 110,370 80,310 Z" fill="var(--pale)"/><path class="thin" d="M30,385 H610"/>
  <rect class="o" x="70" y="340" width="500" height="22" rx="6" fill="var(--pale)"/>
  <use href="#sneaker" x="95" y="160" width="420" height="182"/>
  <g clip-path="url(#wipeClip)">
    <g style="--up:#d8cdb4;--panel:#8d826c;--sole:#e9d59c"><use href="#sneaker" x="95" y="160" width="420" height="182"/></g>
    <g fill="#7d7260" opacity=".5"><circle cx="170" cy="300" r="10"/><circle cx="300" cy="250" r="12"/><circle cx="400" cy="310" r="8"/><circle cx="250" cy="310" r="7"/><circle cx="460" cy="290" r="9"/></g>
  </g>
  <g class="scrub"><g transform="translate(110,120)"><g class="scrubber">
    <rect class="o" x="26" y="-70" width="20" height="80" rx="9" fill="var(--blue)"/>
    <rect class="o" x="-6" y="6" width="84" height="26" rx="9" fill="var(--blue)"/>
    <path class="thin" d="M2,32 v14 M14,32 v14 M26,32 v14 M38,32 v14 M50,32 v14 M62,32 v14 M72,32 v14" stroke-width="2.5"/>
  </g></g></g>
  <g fill="#fff" stroke="var(--blue)" stroke-width="2"><circle class="bubble" cx="200" cy="250" r="9"/><circle class="bubble" cx="260" cy="230" r="6"/><circle class="bubble" cx="330" cy="245" r="10"/><circle class="bubble" cx="400" cy="235" r="7"/><circle class="bubble" cx="460" cy="250" r="5"/></g>
  <g transform="translate(540,190)"><path class="o" d="M10,40 h40 v110 c0,8 -6,12 -12,12 h-16 c-6,0 -12,-4 -12,-12 Z" fill="var(--blue2)"/><rect class="o" x="18" y="20" width="24" height="20" fill="#fff"/><path class="o" d="M42,26 h18 v8 h-18" fill="#fff"/></g>
</svg>`,
  `<svg class="scene ill" viewBox="0 0 640 420" aria-hidden="true">
  <defs><clipPath id="wipeClip2"><rect class="wipe" x="90" y="0" width="560" height="420"/></clipPath></defs>
  <path d="M80,310 C40,200 130,80 290,70 C450,60 590,120 600,240 C610,350 480,390 320,380 C170,370 110,370 80,310 Z" fill="var(--pale)"/><path class="thin" d="M30,385 H610"/>
  <rect class="o" x="70" y="340" width="500" height="22" rx="6" fill="var(--pale)"/>
  <use href="#sneaker" x="95" y="160" width="420" height="182"/>
  <g clip-path="url(#wipeClip2)"><g style="--sole:#ecd590"><use href="#sneaker" x="95" y="160" width="420" height="182"/></g></g>
  <g class="scrub"><g transform="translate(90,250)"><rect x="0" y="0" width="26" height="100" rx="13" fill="var(--blue2)" opacity=".8"/></g></g>
  <g transform="translate(470,40)">
    <path class="gear o" fill="var(--blue)" d="M50,8 l8,0 3,12 9,4 10,-7 6,6 -7,10 4,9 12,3 0,8 -12,3 -4,9 7,10 -6,6 -10,-7 -9,4 -3,12 -8,0 -3,-12 -9,-4 -10,7 -6,-6 7,-10 -4,-9 -12,-3 0,-8 12,-3 4,-9 -7,-10 6,-6 10,7 9,-4 Z"/>
    <circle class="o" cx="54" cy="54" r="15" fill="#fff"/>
    <g transform="translate(70,70)"><path class="gear rev o" fill="var(--blue2)" d="M36,4 l6,0 2,9 7,3 8,-5 4,4 -5,8 3,7 9,2 0,6 -9,2 -3,7 5,8 -4,4 -8,-5 -7,3 -2,9 -6,0 -2,-9 -7,-3 -8,5 -4,-4 5,-8 -3,-7 -9,-2 0,-6 9,-2 3,-7 -5,-8 4,-4 8,5 7,-3 Z"/><circle class="o" cx="39" cy="39" r="10" fill="#fff"/></g>
  </g>
  <g fill="var(--blue)"><path class="spark" d="M150,120 l6,14 14,6 -14,6 -6,14 -6,-14 -14,-6 14,-6z"/><path class="spark" d="M420,140 l5,11 11,5 -11,5 -5,11 -5,-11 -11,-5 11,-5z"/><path class="spark" d="M560,300 l4,9 9,4 -9,4 -4,9 -4,-9 -9,-4 9,-4z"/></g>
  <g transform="translate(40,40)"><rect class="o" x="0" y="0" width="176" height="44" rx="12" fill="#fff"/><text x="16" y="27" font-family="Figtree, sans-serif" font-size="14" font-weight="600" fill="#181d22">Only what you booked</text></g>
</svg>`,
  `<svg class="scene ill" viewBox="0 0 640 420" aria-hidden="true">
  <path d="M80,310 C40,200 130,80 290,70 C450,60 590,120 600,240 C610,350 480,390 320,380 C170,370 110,370 80,310 Z" fill="var(--pale)"/><path class="thin" d="M30,385 H610"/>
  <path class="o" d="M190,230 L230,190 H450 L490,230 Z" fill="var(--blue2)"/>
  <g class="drop"><use href="#sneaker" x="215" y="150" width="250" height="108"/></g>
  <rect class="o" x="190" y="230" width="300" height="150" rx="4" fill="var(--pale)"/>
  <path class="lid o" d="M190,230 L170,170 H510 L490,230 Z" fill="#fff"/>
  <rect class="tape" x="190" y="226" width="300" height="10" fill="var(--blue)" opacity=".8"/>
  <g transform="translate(290,280)"><g class="pop d3"><rect class="o" x="0" y="0" width="100" height="54" rx="6" fill="#fff"/><text x="50" y="23" font-family="Space Mono, monospace" font-size="12" text-anchor="middle" fill="#181d22">#1042</text><text x="50" y="42" font-family="Figtree, sans-serif" font-size="12" font-weight="700" text-anchor="middle" fill="#2f78c4">READY</text></g></g>
  <g transform="translate(520,90)"><g class="pop d4"><circle class="o" cx="40" cy="40" r="38" fill="#fff"/><path d="M24,41 l11,11 22,-24" stroke="var(--ln)" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>
  <g transform="translate(60,60)"><path class="o" d="M30,0 C30,30 0,30 0,30 C30,30 30,60 30,60 C30,30 60,30 60,30 C30,30 30,0 30,0 Z" fill="var(--blue2)"/></g>
</svg>`,
  `<svg class="scene ill" viewBox="0 0 640 420" aria-hidden="true">
  <path d="M150,330 C110,230 170,110 320,100 C470,90 590,170 580,280 C570,380 430,400 300,390 C210,385 170,380 150,330 Z" fill="var(--pale)"/>
  <path class="thin" d="M30,385 H610"/>
  <g transform="translate(300,140)">
    <path class="o" d="M0,220 C0,150 40,118 90,118 C140,118 180,150 180,220 Z" fill="var(--blue)"/>
    <path class="o" d="M76,96 L76,122 C84,128 96,128 104,122 L104,96 Z" fill="var(--skin)"/>
    <circle class="o" cx="90" cy="68" r="34" fill="var(--skin)"/>
    <path d="M55,66 C50,30 78,18 98,20 C124,22 132,44 125,66 C120,50 104,42 86,46 C72,49 62,56 55,66 Z" fill="var(--ln)"/>
    <path class="o" d="M122,72 C128,72 130,80 124,84" fill="var(--skin)"/>
    
    <path d="M40,190 C40,215 70,230 110,232" stroke="var(--ln)" stroke-width="31" fill="none" stroke-linecap="round"/><path d="M40,190 C40,215 70,230 110,232" stroke="var(--blue)" stroke-width="25" fill="none" stroke-linecap="round"/>
  </g>
  <path class="o" d="M150,385 L190,260 C192,254 196,252 202,252 H370 C376,252 378,256 376,262 L340,385 Z" fill="#c9ced4"/>
  <circle cx="282" cy="318" r="10" fill="#fff"/>
  <path class="o" d="M120,385 H450" />
  <g transform="translate(70,90)">
    <rect class="o" x="0" y="0" width="230" height="58" rx="14" fill="#fff"/><path class="o" d="M180,58 L196,78 L200,58" fill="#fff"/>
    <g class="typing" fill="var(--blue)"><circle class="dot" cx="96" cy="29" r="7"/><circle class="dot" cx="116" cy="29" r="7"/><circle class="dot" cx="136" cy="29" r="7"/></g>
    <g class="msg"><text x="18" y="25" font-family="Space Mono, monospace" font-size="10" letter-spacing="1.5" fill="#5f6870">SOUL RESTORATION</text><text x="18" y="44" font-family="Figtree, sans-serif" font-size="15" font-weight="600" fill="#181d22">Your pair is ready!</text></g>
  </g>
  <g transform="translate(470,300)"><g class="pop d1"><path class="o" d="M0,20 L20,0 H110 L130,20 Z" fill="var(--blue2)"/><rect class="o" x="0" y="20" width="130" height="64" fill="var(--pale)"/><rect x="0" y="34" width="130" height="8" fill="var(--blue)" opacity=".8"/></g></g>
</svg>`,
];
