
// ── Biome palette ──────────────────────────────────────
const BIOME_COLORS = {
  forest:  { road: '#5fd17a', grass: '#1b3a1f', accent: '#a0ff8c' },
  city:    { road: '#7ec8ff', grass: '#1f2735', accent: '#9be1ff' },
  desert:  { road: '#ffd07a', grass: '#3a2c14', accent: '#ffe2a0' },
  ice:     { road: '#a9e8ff', grass: '#1c2b3a', accent: '#dff4ff' },
  default: { road: '#a0c0ff', grass: '#1f2630', accent: '#d4e3ff' },
};

// ═══════════════════════════════════════════════════════
// SHAPE EXTRACTOR

function extractRoadShape(segs) {
  if (!segs || !segs.length) return [];

  const FWD_STEP   = 1.0;
  const CURVE_RATE = 0.018;

  let x = 0, y = 0, ang = -Math.PI / 2;     // start heading "up"
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
  return { pts: scaled, scale, ox, oy };
}

// ═══════════════════════════════════════════════════════
// CAREER CARD PREVIEW (SVG)
// ═══════════════════════════════════════════════════════
export function renderLevelPreview(mountEl, opts = {}) {
  if (!mountEl) return;

  const biome    = opts.biome    || 'default';
  const palette  = BIOME_COLORS[biome] || BIOME_COLORS.default;
  const levelNum = opts.levelNum || 1;
  const module   = opts.module   || null;

  const W = mountEl.clientWidth  || 320;
  const H = mountEl.clientHeight || 180;

  // Try the real shape from the level module.
  let segs = null;
  try {
    if (module && typeof module.buildRoads === 'function') {
      const roads = module.buildRoads();
      segs = roads?.road1?.segs || null;
    }
  } catch (e) { segs = null; }

  // Fallback if level didn't provide buildRoads.
  if (!segs) segs = fallbackShape(opts.seed || levelNum * 17);

  const rawPts = extractRoadShape(segs);
  const fit    = fitShape(rawPts, W, H, 18);
  const pts    = fit.pts;

  let d = '';
  for (let i = 0; i < pts.length; i++) {
    d += (i === 0 ? 'M' : 'L') + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) + ' ';
  }

  const startPt  = pts[0]              || [W / 2, H - 16];
  const finishPt = pts[pts.length - 1] || [W / 2, 16];

  // Preserve the badge elements the card builder appended.
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

      <!-- Start dot -->
      <circle cx="${startPt[0].toFixed(1)}" cy="${startPt[1].toFixed(1)}"
              r="4.5" fill="#3df56a" stroke="#fff" stroke-width="1.2" />

      <!-- Finish pin -->
      <g transform="translate(${finishPt[0].toFixed(1)},${finishPt[1].toFixed(1)})">
        <circle r="6" fill="#1a1a1a" stroke="#fff" stroke-width="1.5"/>
        <path d="M-3,-3 h3 v3 h-3 z M0,0 h3 v3 h-3 z" fill="#fff"/>
      </g>
    </svg>
  `;
}

const _miniCache = new Map();

// ═══════════════════════════════════════════════════════
// IN-GAME MINIMAP (Canvas 2D)  — painted each frame.
// ─────────────────────────────────────────────────────

function getOrBuildMiniShape(snapshot, canvasW, canvasH) {
  const lvlId = snapshot.level?.id || 'level1';
  const key   = lvlId + '|' + (snapshot.onRoad2 ? 'r2' : 'r1') + '|' + canvasW + 'x' + canvasH;
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
  const built = { pts: fit.pts };
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

  const built = getOrBuildMiniShape(snapshot, W, H);
  const pts = built.pts;
  if (!pts.length) return;

  const trackLen = snapshot.trackLen || 1;
  const playerPos = Math.max(0, Math.min(trackLen, snapshot.playerPos || 0));

  // Asphalt-style local map window:
  // 8% total visible = 4% behind + 4% forward
  const VIEW_PCT = 0.08;
  const HALF_VIEW = VIEW_PCT / 2;

  const playerT = playerPos / trackLen;
  const startT = Math.max(0, playerT - HALF_VIEW);
  const endT = Math.min(1, playerT + HALF_VIEW);

  const startIndex = Math.floor(startT * (pts.length - 1));
  const endIndex = Math.ceil(endT * (pts.length - 1));
  const localPts = pts.slice(startIndex, Math.max(startIndex + 2, endIndex + 1));

  if (localPts.length < 2) return;

  // Fit only local 8% segment into minimap canvas
  const fit = fitShape(
    localPts.map(([x, y]) => [x, y]),
    W,
    H,
    12
  );

  const viewPts = fit.pts;

  const drawPath = (lineWidth, strokeStyle) => {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(viewPts[0][0], viewPts[0][1]);
    for (let i = 1; i < viewPts.length; i++) {
      ctx.lineTo(viewPts[i][0], viewPts[i][1]);
    }
    ctx.stroke();
  };

  // Glow + bold road
  drawPath(11, 'rgba(80, 220, 255, 0.28)');
  drawPath(6, snapshot.onRoad2 ? '#9eff9e' : '#a0d8ff');

  function localPosToPt(zPos) {
    const t = Math.max(startT, Math.min(endT, zPos / trackLen));
    const globalF = t * (pts.length - 1);
    const globalI = Math.floor(globalF);
    const localI = Math.max(0, Math.min(viewPts.length - 1, globalI - startIndex));

    return viewPts[localI] || viewPts[0];
  }

  // Opponents only if inside visible 8%
  if (Array.isArray(snapshot.opponents)) {
    ctx.fillStyle = '#ffd14a';
    for (const op of snapshot.opponents) {
      const z = typeof op === 'number' ? op : (op?.pos ?? op?.z ?? 0);
      const t = z / trackLen;
      if (t < startT || t > endT) continue;

      const [x, y] = localPosToPt(z);
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Player always near center of local map
  const playerLocalT = (playerT - startT) / Math.max(0.0001, endT - startT);
  const playerIndex = Math.round(playerLocalT * (viewPts.length - 1));
  const p = viewPts[Math.max(0, Math.min(viewPts.length - 1, playerIndex))];

  const p2 = viewPts[Math.min(viewPts.length - 1, playerIndex + 1)] || p;
  const p1 = viewPts[Math.max(0, playerIndex - 1)] || p;
  const ang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);

  ctx.save();
  ctx.translate(p[0], p[1]);
  ctx.rotate(ang + Math.PI / 2);

  ctx.fillStyle = 'rgba(0, 232, 255, 0.32)';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#00e8ff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(7, 8);
  ctx.lineTo(0, 4);
  ctx.lineTo(-7, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // Small progress label
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = 'bold 9px Rajdhani, Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.round(playerT * 100)}%`, 4, 4);
}

// ── Helpers ────────────────────────────────────────────
function drawCheckerPin(ctx, x, y) {
  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

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