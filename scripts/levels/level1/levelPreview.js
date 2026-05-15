// ═══════════════════════════════════════════════════════
// LEVEL PREVIEW / MINIMAP  —  Real-road-shape renderer
// ─────────────────────────────────────────────────────
// Two public functions:
//
//   renderLevelPreview(mountEl, opts)
//     Static SVG minimap used by Career level cards. Reads
//     `level.buildRoads()` to build a real shape; supports
//     biome tinting and a "FINISH" pin.
//
//   renderInGameMinimap(canvasEl, snapshot)
//     Per-frame canvas-2D minimap painted into a fixed-size
//     <canvas>. Shows the real road shape, finish line, end
//     points, the player's position, and AI opponents.
//
// Both use the same coordinate transform so the shape on the
// card matches what the player sees in-game.
// ═══════════════════════════════════════════════════════

// ── Biome palette (used by the card preview) ───────────
const BIOME_COLORS = {
  forest:  { road: '#5fd17a', grass: '#1b3a1f', accent: '#a0ff8c' },
  city:    { road: '#7ec8ff', grass: '#1f2735', accent: '#9be1ff' },
  desert:  { road: '#ffd07a', grass: '#3a2c14', accent: '#ffe2a0' },
  ice:     { road: '#a9e8ff', grass: '#1c2b3a', accent: '#dff4ff' },
  default: { road: '#a0c0ff', grass: '#1f2630', accent: '#d4e3ff' },
};

// ═══════════════════════════════════════════════════════
// SHAPE EXTRACTOR
// ─────────────────────────────────────────────────────
// Walks the segments produced by a level's buildRoads()
// (road1 or road2) and integrates the per-segment curvature
// to produce a 2-D polyline. The polyline is then scaled to
// fit `box` and centered.
// ═══════════════════════════════════════════════════════
function extractRoadShape(segs) {
  if (!segs || !segs.length) return [];

  // Each segment contributes one length step in the local
  // forward direction. Curve values rotate the forward
  // direction proportionally. The constants below are
  // empirical — they produce shapes that look like the
  // in-game track without doing full 3-D projection.
  const FWD_STEP    = 1.0;
  const CURVE_RATE  = 0.018;

  let x = 0, y = 0, ang = -Math.PI / 2;   // pointing "up"
  const pts = [[x, y]];

  for (let i = 0; i < segs.length; i++) {
    const cv = segs[i].curve || 0;
    ang += cv * CURVE_RATE;
    x += Math.cos(ang) * FWD_STEP;
    y += Math.sin(ang) * FWD_STEP;
    pts.push([x, y]);
  }
  return pts;
}

function fitShape(pts, boxW, boxH, pad = 14) {
  if (!pts.length) return { pts: [], scale: 1, ox: 0, oy: 0 };

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const scale = Math.min((boxW - pad * 2) / w, (boxH - pad * 2) / h);

  const ox = (boxW - w * scale) / 2 - minX * scale;
  const oy = (boxH - h * scale) / 2 - minY * scale;

  const scaled = pts.map(([x, y]) => [x * scale + ox, y * scale + oy]);
  return { pts: scaled, scale, ox, oy, bounds: { minX, maxX, minY, maxY } };
}

// ═══════════════════════════════════════════════════════
// CARD PREVIEW (SVG) — used by CareerScene
// ═══════════════════════════════════════════════════════
export function renderLevelPreview(mountEl, opts = {}) {
  if (!mountEl) return;

  const biome   = opts.biome   || 'default';
  const palette = BIOME_COLORS[biome] || BIOME_COLORS.default;
  const levelNum = opts.levelNum || 1;
  const module   = opts.module || null;

  const W = mountEl.clientWidth  || 320;
  const H = mountEl.clientHeight || 180;

  // Try to derive a real shape from the level module.
  let segs = null;
  try {
    if (module && typeof module.buildRoads === 'function') {
      const roads = module.buildRoads();
      segs = roads?.road1?.segs || null;
    }
  } catch (e) { segs = null; }

  // Fallback shape if level didn't provide buildRoads.
  if (!segs) segs = fallbackShape(opts.seed || levelNum * 17);

  const rawPts = extractRoadShape(segs);
  const fit    = fitShape(rawPts, W, H, 18);
  const pts    = fit.pts;

  // Build polyline path string.
  let d = '';
  for (let i = 0; i < pts.length; i++) {
    d += (i === 0 ? 'M' : 'L') + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) + ' ';
  }

  const startPt  = pts[0]            || [W / 2, H - 16];
  const finishPt = pts[pts.length-1] || [W / 2, 16];

  // Hold the old data-preview number badge if present.
  const numBadge  = mountEl.querySelector('.num-badge')?.outerHTML  || '';
  const biomeTag  = mountEl.querySelector('.biome-tag')?.outerHTML  || '';

  mountEl.innerHTML = `
    ${biomeTag}
    ${numBadge}
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"
         xmlns="http://www.w3.org/2000/svg"
         style="position:absolute;inset:0;width:100%;height:100%;display:block">
      <defs>
        <radialGradient id="lp-bg-${levelNum}" cx="50%" cy="50%" r="65%">
          <stop offset="0%"  stop-color="${palette.grass}" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#0a0e15"        stop-opacity="0.95"/>
        </radialGradient>
        <filter id="lp-glow-${levelNum}" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      <rect x="0" y="0" width="${W}" height="${H}"
            fill="url(#lp-bg-${levelNum})" />

      <!-- Glow underlay -->
      <path d="${d}" fill="none"
            stroke="${palette.road}" stroke-opacity="0.35"
            stroke-width="9" stroke-linecap="round"
            stroke-linejoin="round"
            filter="url(#lp-glow-${levelNum})" />

      <!-- Main road -->
      <path d="${d}" fill="none"
            stroke="${palette.road}" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round" />

      <!-- Center dashes -->
      <path d="${d}" fill="none"
            stroke="${palette.accent}" stroke-opacity="0.75"
            stroke-width="1" stroke-dasharray="3 5"
            stroke-linecap="round" stroke-linejoin="round" />

      <!-- Start marker (green dot) -->
      <circle cx="${startPt[0].toFixed(1)}" cy="${startPt[1].toFixed(1)}"
              r="4.5" fill="#3df56a" stroke="#fff" stroke-width="1.2" />

      <!-- Finish marker (checkered pin) -->
      <g transform="translate(${finishPt[0].toFixed(1)},${finishPt[1].toFixed(1)})">
        <circle r="6" fill="#1a1a1a" stroke="#fff" stroke-width="1.5"/>
        <path d="M-3,-3 h3 v3 h-3 z M0,0 h3 v3 h-3 z" fill="#fff"/>
      </g>
    </svg>
  `;
}

// ═══════════════════════════════════════════════════════
// IN-GAME MINIMAP (Canvas 2D) — drawn each frame by GameScene.
// ─────────────────────────────────────────────────────
// snapshot = {
//   level,                 // the active level module
//   trackLen,              // total Z length
//   playerPos,             // P.pos
//   playerLane,            // P.playerX  (-1..1)
//   onRoad2,               // bool
//   opponents,             // [{pos, lane?}, …]
// }
// ═══════════════════════════════════════════════════════
const _miniCache = new Map();   // levelId → {pts, ox, oy, scale}

function getOrBuildMiniShape(snapshot, canvasW, canvasH) {
  const key = (snapshot.level?.id || 'level1') + '|' + (snapshot.onRoad2 ? 'r2' : 'r1') + '|' + canvasW + 'x' + canvasH;
  if (_miniCache.has(key)) return _miniCache.get(key);

  let segs = null;
  try {
    if (snapshot.level?.buildRoads) {
      const roads = snapshot.level.buildRoads();
      segs = snapshot.onRoad2 ? roads?.road2?.segs : roads?.road1?.segs;
    }
  } catch (e) { segs = null; }

  if (!segs) segs = fallbackShape(11);

  const raw = extractRoadShape(segs);
  const fit = fitShape(raw, canvasW, canvasH, 10);
  const built = { pts: fit.pts, segCount: segs.length };
  _miniCache.set(key, built);
  return built;
}

export function clearMinimapCache() {
  _miniCache.clear();
}

export function renderInGameMinimap(canvas, snapshot) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // ── Background card ─────────────────────────────────
  ctx.fillStyle = 'rgba(8, 12, 20, 0.72)';
  roundRect(ctx, 0, 0, W, H, 10);
  ctx.fill();

  ctx.strokeStyle = 'rgba(120,180,255,0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 10);
  ctx.stroke();

  // ── Road shape ──────────────────────────────────────
  const built = getOrBuildMiniShape(snapshot, W, H);
  const pts = built.pts;
  if (!pts.length) return;

  // Glow under-stroke
  ctx.strokeStyle = 'rgba(120, 200, 255, 0.30)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();

  // Main road
  ctx.strokeStyle = snapshot.onRoad2 ? '#9eff9e' : '#a0c0ff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();

  // ── Start dot ───────────────────────────────────────
  const start = pts[0];
  ctx.fillStyle = '#3df56a';
  ctx.beginPath();
  ctx.arc(start[0], start[1], 3, 0, Math.PI * 2);
  ctx.fill();

  // ── Finish marker ───────────────────────────────────
  const finish = pts[pts.length - 1];
  drawCheckerPin(ctx, finish[0], finish[1]);

  // ── Helper: map Z pos → point on the polyline ──────
  const posToPt = (zPos) => {
    if (!snapshot.trackLen || snapshot.trackLen <= 0) return start;
    const tn = Math.max(0, Math.min(1, zPos / snapshot.trackLen));
    const f = tn * (pts.length - 1);
    const i = Math.floor(f);
    const t = f - i;
    const a = pts[i] || start;
    const b = pts[Math.min(pts.length - 1, i + 1)] || a;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };

  // ── Opponents (yellow dots) ─────────────────────────
  if (Array.isArray(snapshot.opponents)) {
    ctx.fillStyle = '#ffd14a';
    for (const op of snapshot.opponents) {
      if (op == null) continue;
      const z = (typeof op === 'number') ? op : (op.pos ?? op.z ?? 0);
      const [x, y] = posToPt(z);
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Player (cyan dot with halo) ─────────────────────
  if (typeof snapshot.playerPos === 'number') {
    const [px, py] = posToPt(snapshot.playerPos);

    // Pulsing halo
    const now = performance.now() * 0.005;
    const pulse = 0.7 + 0.3 * Math.sin(now);
    ctx.fillStyle = `rgba(80, 220, 255, ${0.35 * pulse})`;
    ctx.beginPath();
    ctx.arc(px, py, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5cd6ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(px, py, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // ── Label ───────────────────────────────────────────
  ctx.fillStyle = 'rgba(180,210,255,0.78)';
  ctx.font = 'bold 9px Rajdhani, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(snapshot.onRoad2 ? 'MAP · ROAD 2' : 'MAP', 6, 5);
}

// ── Drawing helpers ────────────────────────────────────
function drawCheckerPin(ctx, x, y) {
  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tiny checker pattern
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 2.5, y - 2.5, 1.7, 1.7);
  ctx.fillRect(x - 0.8, y - 0.8, 1.7, 1.7);
  ctx.fillRect(x + 0.9, y - 2.5, 1.7, 1.7);
  ctx.fillRect(x - 2.5, y + 0.9, 1.7, 1.7);
  ctx.fillRect(x + 0.9, y + 0.9, 1.7, 1.7);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Synthetic shape if a level didn't expose buildRoads.
function fallbackShape(seed) {
  const segs = [];
  let phase = (seed % 100) / 100 * Math.PI * 2;
  const total = 280;
  for (let i = 0; i < total; i++) {
    const t = i / total;
    const curve = Math.sin(phase + t * Math.PI * 6) * 1.4
                + Math.cos(phase * 1.3 + t * Math.PI * 4) * 0.7;
    segs.push({ curve });
  }
  return segs;
}