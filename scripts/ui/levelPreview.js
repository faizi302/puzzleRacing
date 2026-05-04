// ════════════════════════════════════════════════════════════════
// LEVEL PREVIEW — Procedural SVG mini-map for level cards
// ─────────────────────────────────────────────────────────────────
// Each level gets a unique-but-deterministic preview based on a
// seed (level number). Biome controls the color theme.
//
// Public API:
//   renderLevelPreview(mountEl, { seed, biome, levelNum })
//
// Mount target should be the .lc-preview element of a level card.
// ════════════════════════════════════════════════════════════════

const BIOMES = {
  forest : { tint: '#2cf08a', accent: '#00e8ff', sky: 'rgba(44,240,138,0.10)' },
  desert : { tint: '#ffd84a', accent: '#ffb547', sky: 'rgba(255,216,74,0.12)' },
  ice    : { tint: '#9ad8ff', accent: '#00e8ff', sky: 'rgba(154,216,255,0.14)' },
  city   : { tint: '#ff2dd1', accent: '#7b3dff', sky: 'rgba(255,45,209,0.10)' },
  default: { tint: '#00e8ff', accent: '#7b3dff', sky: 'rgba(0,232,255,0.10)' },
};

// Mulberry32 — small, fast seeded RNG
function mulberry32(seed) {
  let t = (seed >>> 0) || 1;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function renderLevelPreview(mount, { seed = 1, biome = 'default', levelNum = 1 } = {}) {
  if (!mount) return;
  const theme = BIOMES[biome] || BIOMES.default;
  const rand  = mulberry32(seed * 9301 + 49297);

  const W = 320, H = 160;

  // Build a smooth track polyline (8 control points across the width)
  const POINTS = 9;
  const pts = [];
  for (let i = 0; i < POINTS; i++) {
    const x = (i / (POINTS - 1)) * (W - 40) + 20;
    const y = 30 + rand() * (H - 60);
    pts.push({ x, y });
  }

  // Smooth path via quadratic curves through midpoints
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${pts[i].x} ${pts[i].y} ${mx} ${my}`;
  }
  d += ` T ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;

  // Waypoint dots — pick 3-4 random points along the path
  const waypoints = [];
  const wpCount = 3 + Math.floor(rand() * 2);
  for (let i = 0; i < wpCount; i++) {
    const idx = 2 + Math.floor(rand() * (pts.length - 4));
    waypoints.push(pts[idx]);
  }

  // Background grid
  const gridLines = [];
  for (let gx = 0; gx <= W; gx += 32) {
    gridLines.push(`<line x1="${gx}" y1="0" x2="${gx}" y2="${H}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`);
  }
  for (let gy = 0; gy <= H; gy += 32) {
    gridLines.push(`<line x1="0" y1="${gy}" x2="${W}" y2="${gy}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`);
  }

  // Decorative ambient dots
  const ambient = [];
  for (let i = 0; i < 14; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = 0.6 + rand() * 1.4;
    const a = 0.08 + rand() * 0.18;
    ambient.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${theme.tint}" opacity="${a.toFixed(2)}"/>`);
  }

  const start = pts[0];
  const end   = pts[pts.length - 1];

  const svg = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="lp-bg-${seed}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stop-color="${theme.sky}"/>
          <stop offset="100%" stop-color="rgba(5,6,13,0.65)"/>
        </linearGradient>
        <linearGradient id="lp-track-${seed}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stop-color="${theme.accent}"/>
          <stop offset="100%" stop-color="${theme.tint}"/>
        </linearGradient>
        <filter id="lp-glow-${seed}">
          <feGaussianBlur stdDeviation="2.2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <rect width="${W}" height="${H}" fill="url(#lp-bg-${seed})"/>
      ${gridLines.join('')}
      ${ambient.join('')}

      <!-- Track shadow -->
      <path d="${d}" stroke="rgba(0,0,0,0.45)" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,2)"/>
      <!-- Track main -->
      <path d="${d}" stroke="url(#lp-track-${seed})" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#lp-glow-${seed})"/>
      <!-- Track centerline dashes -->
      <path d="${d}" stroke="rgba(255,255,255,0.55)" stroke-width="1" fill="none" stroke-linecap="round" stroke-dasharray="3 6"/>

      <!-- Waypoint dots -->
      ${waypoints.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${theme.accent}" opacity="0.85"/>`).join('')}

      <!-- Start marker -->
      <circle cx="${start.x}" cy="${start.y}" r="6" fill="#ffffff" stroke="${theme.tint}" stroke-width="2"/>
      <circle cx="${start.x}" cy="${start.y}" r="2.4" fill="${theme.tint}"/>

      <!-- End marker (checker) -->
      <g transform="translate(${end.x - 6} ${end.y - 6})">
        <rect width="12" height="12" fill="#ffffff" rx="2"/>
        <rect x="0" y="0" width="6" height="6" fill="#000"/>
        <rect x="6" y="6" width="6" height="6" fill="#000"/>
      </g>
    </svg>
  `;

  mount.innerHTML = svg;
}