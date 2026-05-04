// ═══════════════════════════════════════════════════════
// SCENERY RENDER — Drawing only. Building delegated to active level.
// ═══════════════════════════════════════════════════════
import { C } from '../configs/roadConfig.js';
import { SPR } from '../configs/sceneryConfig.js';
import { segs, trackLen, getActiveTrack } from '../core/roadMap.js';
import { P, clamp } from '../systems/roadSystem.js';
import { getCtx, getW, getH, getRes } from '../core/canvas.js';
import { IMG } from './objectRender.js';
import { _visibleSegs } from './roadRender.js';
import { getActiveLevel } from '../core/activeLevel.js';

// Live binding — re-assigned by buildScenery() to whatever the
// active level returns. Importers (collisionSystem, GameScene)
// continue to see the latest array automatically.
export let sceneryObjs = [];

/**
 * Re-builds scenery for the currently active level + currently
 * active track. Called once at start, and again whenever the
 * track hot-swaps (Road1 → Road2).
 */
export function buildScenery() {
  const lvl = getActiveLevel();
  if (lvl && typeof lvl.buildSceneryObjects === 'function') {
    sceneryObjs = lvl.buildSceneryObjects();
  } else {
    sceneryObjs = [];
  }
}

// ── Fast Z-to-visibleSeg lookup ────────────────────────
function visibleForZ(z) {
  if (!_visibleSegs.length) return null;

  let zz = z;
  if (zz < P.pos) zz += trackLen;

  for (let i = 0; i < _visibleSegs.length; i++) {
    const v = _visibleSegs[i];

    let z1 = v.z1;
    let z2 = v.z2;

    if (z1 < P.pos) z1 += trackLen;
    if (z2 < z1) z2 += trackLen;

    if (zz >= z1 && zz <= z2) {
      return {
        v,
        pct: (zz - z1) / Math.max(1, z2 - z1),
      };
    }
  }

  return null;
}

// ── Sprite draw helper ─────────────────────────────────
function drawSprite(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh) {
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

// ── Main scenery draw (UNCHANGED from original) ────────
export function drawScenery() {
  if (!IMG.scenery.ready || !_visibleSegs.length) return;

  const ctx = getCtx();
  const _W = getW();
  const _H = getH();
  const _res = getRes();
  const horizonY = _H * 0.44;
  const now = performance.now();

  const list = [];

  for (const o of sceneryObjs) {
    let dz = o.z - P.pos;
    while (dz < 0) dz += trackLen;
    if (dz < 120 || dz > C.DRAW_D * C.SEG_LEN * 0.45) continue;

    const hit = visibleForZ(o.z);
    if (!hit) continue;

    const { v, pct } = hit;
    const y = v.y1 + (v.y2 - v.y1) * pct;
    const cx = v.x1 + (v.x2 - v.x1) * pct;
    const rw = v.w1 + (v.w2 - v.w1) * pct;

    if (!o.isCoin && !o.isBooster && !o.isKey && !o.isHurdle &&
      (y < horizonY - 4 || y > _H * 0.98)) continue;
    if ((o.isCoin || o.isBooster || o.isKey) &&
      (y < horizonY * 0.5 || y > _H * 0.98)) continue;
    if (o.isHurdle && y > _H * 1.10) continue;   // only cull if completely off-bottom

    const scale = C.CAM_DEPTH / dz;
    list.push({ o, y, cx, rw, scale, dz });
  }

  list.sort((a, b) => b.dz - a.dz);

  for (const it of list) {
    const s = SPR[it.o.kind];
    if (!s) continue;

    let drawW, drawH, x, y;

    if (it.o.overhead) {
      drawW = it.rw * 2.6 * s.scale;
      drawH = drawW * (s.sh / s.sw);
      x = it.cx - drawW / 2;
      y = it.y - drawH * s.anchorY;

    } else if (it.o.isCoin || it.o.isBooster || it.o.isKey) {
      const perspective = clamp(it.scale * 1800, 0.08, 1.65);
      let baseSize;
      if (it.o.isKey) baseSize = 130;
      else if (it.o.isBooster) baseSize = 92;
      else baseSize = 80;

      drawW = baseSize * perspective * _res;
      drawH = drawW * (s.sh / s.sw);

      let minSize, maxSize;
      if (it.o.isKey) { minSize = 32 * _res; maxSize = 240 * _res; }
      else if (it.o.isBooster) { minSize = 14 * _res; maxSize = 70 * _res; }
      else { minSize = 20 * _res; maxSize = 180 * _res; }

      drawW = clamp(drawW, minSize, maxSize);
      drawH = drawW * (s.sh / s.sw);

      x = it.cx + it.o.offset * it.rw - drawW / 2;
      y = it.y - drawH * 0.88;

      if (y + drawH < horizonY) continue;
      if (y > _H || x > _W + drawW || x < -drawW) continue;

    } else if (it.o.isHurdle) {
      // ── On-road hurdle — FIXED physical size ────────────
      // We define the hurdle's real-world width in road units
      // and project it at the hurdle's ACTUAL distance (dz).
      // Because both numerator and the sprite stay in the same
      // coordinate space, the object grows correctly as you
      // approach and never pops or shrinks unexpectedly.
      //
      // HURDLE_WORLD_W controls how wide each hurdle type is
      // in "road half-widths".  Tune per-sprite via s.scale.
      const hurdleSize = it.o.size ?? 0.45;
      const HURDLE_WORLD_W = C.ROAD_W * hurdleSize * s.scale;
      drawW = HURDLE_WORLD_W * (C.CAM_DEPTH / it.dz) * _W;

      // Clamp only to stop extreme near/far edge cases.
      drawW = clamp(drawW, 40 * _res, 0.80 * _W);
      drawH = drawW * (s.sh / s.sw);

      const groundX = it.cx + it.o.offset * it.rw;
      x = groundX - drawW / 2;
      const anchor = it.o.anchorY ?? 1.0;
      y = it.y - drawH * anchor;

      if (y > _H || x > _W + drawW || x < -drawW) continue;
      if (y + drawH < horizonY) continue;

    } else {
      const side = it.o.side || 1;
      let worldR;

      if (it.o.isBoundaryPole) {
        worldR = C.ROAD_W * 0.11 * s.scale;
      } else {
        worldR = it.o.small
          ? C.ROAD_W * 0.28 * s.scale
          : C.ROAD_W * 0.82 * s.scale;
      }

      drawW = worldR * (C.CAM_DEPTH / it.dz) * _W;
      const minW = it.o.isBoundaryPole ? 4 * _res : (it.o.small ? 16 * _res : 48 * _res);
      const maxW = it.o.isBoundaryPole ? 42 * _res : (it.o.small ? 0.20 * _W : 0.55 * _W);
      drawW = clamp(drawW, minW, maxW);
      drawH = drawW * (s.sh / s.sw);

      const groundX = it.cx + side * it.rw * it.o.offset;
      x = groundX - drawW / 2;
      y = it.y - drawH * s.anchorY;

      if (side < 0 && x + drawW > it.cx - it.rw * 0.94) x = it.cx - it.rw * 0.94 - drawW;
      if (side > 0 && x < it.cx + it.rw * 0.94) x = it.cx + it.rw * 0.94;

      if (y > _H || x > _W + drawW || x < -drawW) continue;
      if (y + drawH < horizonY) continue;
    }

    const fade = clamp(1 - it.dz / (C.DRAW_D * C.SEG_LEN * 0.65), 0, 1);

    ctx.save();
    ctx.globalAlpha = 0.20 + fade * 0.80;

    if (it.o.isKey) {
      const pulse = 0.85 + 0.15 * Math.sin(now * 0.006);
      ctx.shadowBlur = 0;
      drawSprite(ctx, IMG.scenery, s.sx, s.sy, s.sw, s.sh, x, y, drawW, drawH);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.20 + fade * 0.80) * 0.45 * pulse;
      ctx.fillStyle = 'rgba(255, 200, 50, 1)';
      ctx.beginPath();
      ctx.ellipse(x + drawW / 2, y + drawH / 2, drawW * 0.42, drawH * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (it.o.isForkGate) {
      drawSprite(ctx, IMG.scenery, s.sx, s.sy, s.sw, s.sh, x, y, drawW, drawH);
      const pulse = 0.80 + 0.20 * Math.sin(now * 0.0035);
      const tintClr = it.o.forkTint === 'road2'
        ? `rgba(255, 210, 50, ${0.30 * pulse})`
        : `rgba(255, 80,  40, ${0.25 * pulse})`;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.55 * fade * pulse;
      ctx.fillStyle = tintClr;
      ctx.fillRect(x, y, drawW, drawH);

    } else if (it.o.isForkMarker) {
      drawSprite(ctx, IMG.scenery, s.sx, s.sy, s.sw, s.sh, x, y, drawW, drawH);
      const pulse = 0.75 + 0.25 * Math.sin(now * 0.004 + it.o.z * 0.001);
      const tintClr = (getActiveTrack() === 2)
        ? `rgba(255, 220, 60, 0.4)`
        : `rgba(255, 70,  30, 0.3)`;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.45 * fade * pulse;
      ctx.fillStyle = tintClr;
      ctx.fillRect(x, y, drawW, drawH);

    } else if (it.o.isHurdle) {
      drawSprite(ctx, IMG.scenery, s.sx, s.sy, s.sw, s.sh, x, y, drawW, drawH);

    } else {
      drawSprite(ctx, IMG.scenery, s.sx, s.sy, s.sw, s.sh, x, y, drawW, drawH);
    }

    ctx.restore();
  }
}