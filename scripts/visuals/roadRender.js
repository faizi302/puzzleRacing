// Road render — textured segments built from atlas frames.

import {
  C, COL, START_PRE_FINISH,
  SEG_TEX, SEG_TEX_CYCLE_ROAD1, SEG_TEX_CYCLE_ROAD2,
  SEG_TEX_RUN, ROAD_TEX_FRAC,
} from '../configs/roadConfig.js';
import {
  segs, trackLen, findSeg, project, getActiveTrack,
} from '../core/roadMap.js';
import { P } from '../systems/roadSystem.js';
import { clamp } from '../utils/math.js';
import { fillTrapezoid } from '../utils/rendering.js';
import { getCtx, getW, getH } from '../core/canvas.js';
import { IMG } from './objectRender.js';
import { getActiveLevel } from '../core/activeLevel.js';

export let _visibleSegs = [];

const MAX_SLICES = 10;
const TEXTURE_REPEAT_SEGMENTS = 10;

// Pick the texture frame for a given segment index.
function pickSegTex(segIndex) {
  if (segIndex === 0) return SEG_TEX.Grid;
  const cycle = getActiveTrack() === 2 ? SEG_TEX_CYCLE_ROAD2 : SEG_TEX_CYCLE_ROAD1;
  const i = Math.floor(segIndex / SEG_TEX_RUN) % cycle.length;
  return cycle[i];
}

// Main draw
export function drawRoad() {
  const ctx = getCtx();
  const W = getW();
  const H = getH();

  _visibleSegs.length = 0;

  const base = findSeg(P.pos + P.playerZ);
  if (!base) return;

  const basePct = (P.pos % C.SEG_LEN) / C.SEG_LEN;

  let maxY = H;
  let xOff = 0;
  let dx = -(base.curve * basePct);

  const camY = C.CAM_H + (P.cameraAirY || 0);
  const camX = P.cameraX * C.ROAD_W;
  const segLen = segs.length;

  for (let n = 0; n < C.DRAW_D; n++) {
    const seg = segs[(base.index + n) % segLen];
    const camZ = P.pos - (seg.p1.world.z < P.pos ? trackLen : 0);

    project(seg.p1, camX, camY, camZ, W, H);
    project(seg.p2, camX, camY, camZ, W, H);

    xOff += dx;
    dx += seg.curve;
    seg.p1.scr.x += xOff;
    seg.p2.scr.x += xOff;

    if (seg.p1.cam.z <= C.CAM_DEPTH) continue;
    if (seg.p2.scr.y >= maxY) continue;
    if (seg.p1.scr.y <= seg.p2.scr.y) continue;

    const fogA = Math.min(1, Math.pow(n / C.DRAW_D, C.FOG_D));

    drawSegTextured(
      ctx,
      seg.p1.scr.x, seg.p1.scr.y, seg.p1.scr.w,
      seg.p2.scr.x, seg.p2.scr.y, seg.p2.scr.w,
      seg.index, fogA
    );

    _visibleSegs.push({
      index: seg.index,
      y1: seg.p1.scr.y, y2: seg.p2.scr.y,
      x1: seg.p1.scr.x, x2: seg.p2.scr.x,
      w1: seg.p1.scr.w, w2: seg.p2.scr.w,
      z1: seg.p1.world.z, z2: seg.p2.world.z,
      camZ: seg.p1.cam.z,
    });

    maxY = seg.p2.scr.y;
  }

  drawNearestRoadExtension(ctx, W, H);
  drawRoad2UnlockCircleBehindStart(ctx, W, H);
}

// Textured segment draw — adaptive slice count
function drawSegTextured(ctx, x1, y1, w1, x2, y2, w2, segIndex, fogA) {
  const img = IMG.segments;
  const segH = y1 - y2;
  if (segH <= 0) return;

  if (!img.ready) {
    fillTrapezoid(
      ctx,
      x1 - w1, y1, x1 + w1, y1,
      x2 + w2, y2, x2 - w2, y2,
      COL.ROAD_A
    );
    return;
  }

  const frame = pickSegTex(segIndex);
  const fullW1 = (w1 * 2) / ROAD_TEX_FRAC;
  const fullW2 = (w2 * 2) / ROAD_TEX_FRAC;

  const rawSlices = Math.ceil(segH / Math.max(6, segH * 0.18));
  const slices = clamp(rawSlices, 1, MAX_SLICES);
  const sliceH = segH / slices;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1 - fullW1 * 0.5, y1);
  ctx.lineTo(x1 + fullW1 * 0.5, y1);
  ctx.lineTo(x2 + fullW2 * 0.5, y2);
  ctx.lineTo(x2 - fullW2 * 0.5, y2);
  ctx.closePath();
  ctx.clip();

  const segTexT1 = (segIndex % TEXTURE_REPEAT_SEGMENTS) / TEXTURE_REPEAT_SEGMENTS;
  const segTexT2 = ((segIndex % TEXTURE_REPEAT_SEGMENTS) + 1) / TEXTURE_REPEAT_SEGMENTS;
  const segTexDelta = segTexT2 - segTexT1;

  for (let i = 0; i < slices; i++) {
    const t1 = i / slices;
    const t2 = (i + 1) / slices;
    const tm = (t1 + t2) * 0.5;

    const y = y2 + segH * t1;
    const cx = x2 + (x1 - x2) * tm;
    const cw = w2 + (w1 - w2) * tm;

    const fullW = (cw * 2) / ROAD_TEX_FRAC;
    const dx = cx - fullW * 0.5;

    const texT1 = segTexT1 + segTexDelta * t1;
    const texT2 = segTexT1 + segTexDelta * t2;
    const srcY = frame.sy + frame.sh * texT1;
    const srcH = Math.max(1, frame.sh * (texT2 - texT1));

    ctx.drawImage(img, frame.sx, srcY, frame.sw, srcH, dx, y, fullW, sliceH + 1.0);
  }

  if (fogA > 0.01) {
    ctx.globalAlpha = fogA;
    ctx.fillStyle = COL.FOG;
    ctx.beginPath();
    ctx.moveTo(x1 - fullW1 * 0.5, y1);
    ctx.lineTo(x1 + fullW1 * 0.5, y1);
    ctx.lineTo(x2 + fullW2 * 0.5, y2);
    ctx.lineTo(x2 - fullW2 * 0.5, y2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// Stretch the nearest visible road segment down to fill the bottom of the screen.
function drawNearestRoadExtension(ctx, W, H) {
  if (!_visibleSegs.length) return;

  const near = _visibleSegs[0];
  const next = _visibleSegs[1] || near;

  const yTop = near.y1;
  if (yTop >= H) return;

  const centerSlope = near.x1 - next.x1;
  const bottomX = near.x1 + centerSlope * 0.55;
  const bottomW = Math.min(W * 1.08, Math.max(near.w1 * 1.35, W * 0.62));

  const img = IMG.segments;
  if (!img.ready) {
    fillTrapezoid(
      ctx,
      near.x1 - near.w1, yTop, near.x1 + near.w1, yTop,
      bottomX + bottomW, H + 4, bottomX - bottomW, H + 4,
      COL.ROAD_A
    );
    return;
  }

  const frame = near.index === 0 ? SEG_TEX_CYCLE_ROAD1[0] : pickSegTex(near.index);
  const segH = H + 4 - yTop;
  if (segH <= 0) return;

  const fullTopW = (near.w1 * 2) / ROAD_TEX_FRAC;
  const fullBotW = (bottomW * 2) / ROAD_TEX_FRAC;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(near.x1 - fullTopW * 0.5, yTop);
  ctx.lineTo(near.x1 + fullTopW * 0.5, yTop);
  ctx.lineTo(bottomX + fullBotW * 0.5, H + 4);
  ctx.lineTo(bottomX - fullBotW * 0.5, H + 4);
  ctx.closePath();
  ctx.clip();

  const rawSlices = Math.ceil(segH / Math.max(10, segH * 0.18));
  const slices = clamp(rawSlices, 1, MAX_SLICES);
  const sliceH = segH / slices;

  for (let i = 0; i < slices; i++) {
    const t1 = i / slices;
    const t2 = (i + 1) / slices;
    const tm = (t1 + t2) * 0.5;

    const y = yTop + segH * t1;
    const cx = near.x1 + (bottomX - near.x1) * tm;
    const cw = near.w1 + (bottomW - near.w1) * tm;

    const fullW = (cw * 2) / ROAD_TEX_FRAC;
    const dx = cx - fullW * 0.5;

    const srcY = frame.sy + frame.sh * t1;
    const srcH = Math.max(1, frame.sh * (t2 - t1));

    ctx.drawImage(img, frame.sx, srcY, frame.sw, srcH, dx, y, fullW, sliceH + 1.0);
  }

  ctx.restore();
}

// Reverse-into-wall hint marker behind the spawn line (Level 1, Road 1 only).
function drawRoad2UnlockCircleBehindStart(ctx, W, H) {
  const lvl = getActiveLevel?.();
  if (lvl?.id !== 'level1') return;
  if ((P.speed || 0) >= -10) return;
  if (getActiveTrack() !== 1) return;
  if (P.secretUnlocked || P.onRoad2) return;

  const startZ = trackLen - START_PRE_FINISH;
  const behindSegs = Math.abs(C.GHOST_FAKE_WALL_SEG_BEHIND ?? -6);
  const buttonZ = startZ - behindSegs * C.SEG_LEN;

  let dz = P.pos - buttonZ;
  if (dz < -trackLen / 2) dz += trackLen;
  if (dz >  trackLen / 2) dz -= trackLen;

  if (Math.abs(dz) > C.SEG_LEN * 10) return;

  const near = clamp(1 - Math.abs(dz) / (C.SEG_LEN * 10), 0, 1);
  const cx = W * 0.5;
  const cy = H * (0.63 + 0.12 * near);
  const rx = W * (0.13 + 0.06 * near);
  const ry = H * (0.035 + 0.025 * near);

  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = 'rgba(0, 220, 255, 0.38)';
  ctx.strokeStyle = 'rgba(255,255,255,0.98)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'white';
  ctx.font = `bold ${Math.max(18, W * 0.018)}px Orbitron, Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ROAD 2', cx, cy);
  ctx.restore();
}

// Legacy export — flat coloured trapezoid with optional fog. Some renderers import this.
export function poly(ctx, x1, y1, x2, y2, x3, y3, x4, y4, clr, fog, fogA) {
  fillTrapezoid(ctx, x1, y1, x2, y2, x3, y3, x4, y4, clr);
  if (fogA > 0.01) {
    ctx.save();
    ctx.globalAlpha = fogA;
    fillTrapezoid(ctx, x1, y1, x2, y2, x3, y3, x4, y4, fog);
    ctx.restore();
  }
}