// ═══════════════════════════════════════════════════════
// MONSTER RENDER — Gorilla Boss
// ─────────────────────────────────────────────────────
// Reads frame layout from MONSTER_SPR in configs/sceneryConfig.js
// rather than hand-coded coordinates. This keeps the renderer
// in sync with whatever spritesheet you swap in: change cols /
// rows / frameW / frameH there and the renderer follows.
//
// The insetL / insetR / insetT / insetB fields crop empty
// transparent padding around the gorilla art inside each cell
// so the sprite scales without surrounding blue/empty space.
// ═══════════════════════════════════════════════════════
import { C } from '../configs/roadConfig.js';
import { trackLen } from '../core/roadMap.js';
import { P, clamp } from '../systems/roadSystem.js';
import { getCtx, getW, getH, getRes } from '../core/canvas.js';
import { IMG } from './objectRender.js';
import { _visibleSegs } from './roadRender.js';
import { sceneryObjs } from './sceneryRender.js';
import { MONSTER_SPR } from '../configs/sceneryConfig.js';

// ── Frame lookup ───────────────────────────────────────
function frameRect(i) {
  const cols   = MONSTER_SPR.cols;
  const rows   = MONSTER_SPR.rows;
  const fw     = MONSTER_SPR.frameW;
  const fh     = MONSTER_SPR.frameH;
  const insetL = MONSTER_SPR.insetL || 0;
  const insetR = MONSTER_SPR.insetR || 0;
  const insetT = MONSTER_SPR.insetT || 0;
  const insetB = MONSTER_SPR.insetB || 0;

  const total = cols * rows;
  const idx   = Math.max(0, Math.min(total - 1, i | 0));
  const col   = idx % cols;
  const row   = (idx / cols) | 0;

  // Cell origin in the sheet.
  const cellX = MONSTER_SPR.sx + col * fw;
  const cellY = MONSTER_SPR.sy + row * fh;

  // Apply insets so we draw only the visible gorilla.
  return {
    sx: cellX + insetL,
    sy: cellY + insetT,
    sw: Math.max(1, fw - insetL - insetR),
    sh: Math.max(1, fh - insetT - insetB),
  };
}

function visibleForZ(z) {
  if (!_visibleSegs.length) return null;

  let zz = z;
  if (zz < P.pos) zz += trackLen;

  for (const v of _visibleSegs) {
    let z1 = v.z1;
    let z2 = v.z2;

    if (z1 < P.pos) z1 += trackLen;
    if (z2 < z1)    z2 += trackLen;

    if (zz >= z1 && zz <= z2) {
      return { v, pct: (zz - z1) / Math.max(1, z2 - z1) };
    }
  }

  return null;
}

export function drawMonsters() {
  if (!_visibleSegs.length) return;
  if (!IMG.monsters?.ready) return;

  const ctx = getCtx();
  const W   = getW();
  const H   = getH();
  const res = getRes();
  const horizonY = H * 0.44;
  const now = performance.now();

  // ── Collect visible monsters ───────────────────────
  const list = [];

  for (const o of sceneryObjs) {
    if (!o.isMonster || o._dead) continue;

    let dz = o.z - P.pos;
    while (dz < 0) dz += trackLen;

    if (dz < C.SEG_LEN * 0.25) continue;
    if (dz > C.DRAW_D * C.SEG_LEN * 0.50) continue;

    const hit = visibleForZ(o.z);
    if (!hit) continue;

    const { v, pct } = hit;
    const roadY = v.y1 + (v.y2 - v.y1) * pct;
    const cx    = v.x1 + (v.x2 - v.x1) * pct;
    const rw    = v.w1 + (v.w2 - v.w1) * pct;

    if (roadY < horizonY - 4 || roadY > H * 1.15) continue;

    list.push({ o, roadY, cx, rw, dz });
  }

  // Furthest-first → closer monsters render on top.
  list.sort((a, b) => b.dz - a.dz);

  // ── Draw ───────────────────────────────────────────
  for (const it of list) {
    const { o, roadY, cx, rw, dz } = it;
    const f = frameRect(o.frame || 0);

    // Size projection: world height → screen height.
    // The gorilla is big — scale relative to road width.
    const scale   = C.CAM_DEPTH / dz;
    const rawH    = C.ROAD_W * 1.15 * (o.size ?? 1) * scale * W;
    const screenH = clamp(rawH, 48 * res, H * 0.85);
    const screenW = screenH * (f.sw / f.sh);

    // Ground anchor at the road point at this depth.
    const groundX = cx + (o.offset || 0) * rw;
    let yBase     = roadY;

    // Subtle bob while not attacking (so idle/chase feel alive).
    if (o.aiState !== 'attack') {
      const bob = Math.sin(now * 0.011 + o.z * 0.0002) * (screenH * 0.012);
      yBase += bob;
    }

    const dx = groundX - screenW * 0.5;
    const dy = yBase - screenH;

    // Frustum cull.
    if (dy > H) continue;
    if (dx + screenW < 0 || dx > W) continue;

    const fade = clamp(1 - dz / (C.DRAW_D * C.SEG_LEN * 0.60), 0.25, 1);

    ctx.save();
    ctx.globalAlpha = fade;

    // ── Ground shadow (below feet) ────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.50)';
    ctx.beginPath();
    ctx.ellipse(
      groundX,
      yBase + 3 * res,
      screenW * 0.33,
      Math.max(4, screenH * 0.045),
      0, 0, Math.PI * 2
    );
    ctx.fill();

    // ── Red threat halo when active ───────────────────
    if (o.aiState === 'chase' || o.aiState === 'attack' || o.aiState === 'alert') {
      const pulse     = 0.55 + 0.45 * Math.sin(now * 0.009 + o.z * 0.0005);
      const isAttack  = o.aiState === 'attack';
      const isChasing = o.aiState === 'chase';
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (isAttack ? 0.32 : isChasing ? 0.22 : 0.14) * fade * pulse;
      ctx.fillStyle = isAttack
        ? 'rgba(255, 30, 30, 1)'
        : isChasing
          ? 'rgba(255, 80, 30, 1)'
          : 'rgba(255, 180, 40, 1)';
      ctx.beginPath();
      ctx.ellipse(
        groundX,
        yBase - screenH * 0.50,
        screenW * 0.50,
        screenH * 0.26,
        0, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade;
    }

    // ── Sprite ────────────────────────────────────────
    // Disable image-smoothing for crisp pixels at very close
    // range. Browsers default to "high" smoothing which makes
    // the gorilla look blurry up close.
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      IMG.monsters,
      f.sx, f.sy, f.sw, f.sh,
      dx, dy, screenW, screenH
    );

    // ── Ground-pound flash on impact frames ───────────
    if (o.aiState === 'attack' && o.isPunchHitFrame) {
      const flashAlpha = 0.55 * fade;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = 'rgba(255, 220, 180, 1)';
      ctx.beginPath();
      ctx.ellipse(
        groundX,
        yBase + 2 * res,
        screenW * 0.55,
        Math.max(6, screenH * 0.07),
        0, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.imageSmoothingEnabled = prevSmoothing;
    ctx.restore();
  }
}