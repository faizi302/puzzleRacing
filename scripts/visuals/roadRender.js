// ═══════════════════════════════════════════════════════
// ROAD RENDER — Textured road from LocationESegments atlas
// Smooth-turn version: no integer snapping, cleaner clipping
// ═══════════════════════════════════════════════════════
import {
  C, COL,
  SEG_TEX, SEG_TEX_CYCLE, SEG_TEX_RUN, ROAD_TEX_FRAC,
} from '../configs/roadConfig.js';

import { segs, trackLen, findSeg, project } from '../core/roadMap.js';
import { P }                                from '../systems/roadSystem.js';
import { getCtx, getW, getH }               from '../core/canvas.js';
import { IMG }                              from './objectRender.js';

export let _visibleSegs = [];

function pickSegTex(segIndex) {
  if (segIndex < C.RUMBLE * 2) return SEG_TEX.FinishLine;
  const i = Math.floor(segIndex / SEG_TEX_RUN) % SEG_TEX_CYCLE.length;
  return SEG_TEX_CYCLE[i];
}

export function drawRoad() {
  const ctx = getCtx();
  const W = getW();
  const H = getH();

  _visibleSegs = [];

  const base = findSeg(P.pos + P.playerZ);
  if (!base) return;

  const basePct = (P.pos % C.SEG_LEN) / C.SEG_LEN;

  let maxY = H;
  let xOff = 0;
  let dx = -(base.curve * basePct);

  for (let n = 0; n < C.DRAW_D; n++) {
    const seg = segs[(base.index + n) % segs.length];

    const camZ = P.pos - (seg.p1.world.z < P.pos ? trackLen : 0);

    project(seg.p1, P.playerX * C.ROAD_W, C.CAM_H, camZ, W, H);
    project(seg.p2, P.playerX * C.ROAD_W, C.CAM_H, camZ, W, H);

    xOff += dx;
    dx += seg.curve;

    // IMPORTANT:
    // Do NOT use "| 0" here.
    // Integer snapping causes visible shaking on curves.
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
      seg.index,
      fogA
    );

    _visibleSegs.push({
      index: seg.index,
      y1: seg.p1.scr.y,
      y2: seg.p2.scr.y,
      x1: seg.p1.scr.x,
      x2: seg.p2.scr.x,
      w1: seg.p1.scr.w,
      w2: seg.p2.scr.w,
      z1: seg.p1.world.z,
      z2: seg.p2.world.z,
      camZ: seg.p1.cam.z,
    });

    maxY = seg.p2.scr.y;
  }

  drawNearestRoadExtension(ctx, W, H);
}

function drawSegTextured(ctx, x1, y1, w1, x2, y2, w2, segIndex, fogA) {
  const img = IMG.segments;

  if (!img.ready) {
    poly(ctx, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, COL.ROAD_A, COL.FOG, fogA);
    return;
  }

  const frame = pickSegTex(segIndex);
  const segH = y1 - y2;
  if (segH <= 0) return;

  const fullW1 = (w1 * 2) / ROAD_TEX_FRAC;
  const fullW2 = (w2 * 2) / ROAD_TEX_FRAC;

  ctx.save();

  // Clip the full trapezoid so road texture never bleeds/breaks on turns.
  ctx.beginPath();
  ctx.moveTo(x1 - fullW1 * 0.5, y1);
  ctx.lineTo(x1 + fullW1 * 0.5, y1);
  ctx.lineTo(x2 + fullW2 * 0.5, y2);
  ctx.lineTo(x2 - fullW2 * 0.5, y2);
  ctx.closePath();
  ctx.clip();

  const SLICE_PX = 3;
  const slices = Math.max(1, Math.ceil(segH / SLICE_PX));
  const sliceH = segH / slices;

  for (let i = 0; i < slices; i++) {
    const t1 = i / slices;
    const t2 = (i + 1) / slices;
    const tm = (t1 + t2) * 0.5;

    const y = y2 + segH * t1;
    const cx = x2 + (x1 - x2) * tm;
    const cw = w2 + (w1 - w2) * tm;

    const fullW = (cw * 2) / ROAD_TEX_FRAC;
    const dx = cx - fullW * 0.5;

    const srcY = frame.sy + frame.sh * t1;
    const srcH = Math.max(1, frame.sh * (t2 - t1));

    ctx.drawImage(
      img,
      frame.sx,
      srcY,
      frame.sw,
      srcH,
      dx,
      y,
      fullW,
      sliceH + 1.0
    );
  }

  ctx.restore();

  if (fogA > 0.01) {
    ctx.save();
    ctx.globalAlpha = fogA;
    ctx.fillStyle = COL.FOG;
    ctx.beginPath();
    ctx.moveTo(x1 - fullW1 * 0.5, y1);
    ctx.lineTo(x1 + fullW1 * 0.5, y1);
    ctx.lineTo(x2 + fullW2 * 0.5, y2);
    ctx.lineTo(x2 - fullW2 * 0.5, y2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

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
    poly(
      ctx,
      near.x1 - near.w1, yTop,
      near.x1 + near.w1, yTop,
      bottomX + bottomW, H + 4,
      bottomX - bottomW, H + 4,
      COL.ROAD_A,
      COL.FOG,
      0
    );
    return;
  }

  const frame = pickSegTex(near.index);
  const segH = H + 4 - yTop;
  if (segH <= 0) return;

  ctx.save();

  const fullTopW = (near.w1 * 2) / ROAD_TEX_FRAC;
  const fullBotW = (bottomW * 2) / ROAD_TEX_FRAC;

  ctx.beginPath();
  ctx.moveTo(near.x1 - fullTopW * 0.5, yTop);
  ctx.lineTo(near.x1 + fullTopW * 0.5, yTop);
  ctx.lineTo(bottomX + fullBotW * 0.5, H + 4);
  ctx.lineTo(bottomX - fullBotW * 0.5, H + 4);
  ctx.closePath();
  ctx.clip();

  const SLICE_PX = 4;
  const slices = Math.max(1, Math.ceil(segH / SLICE_PX));
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

    ctx.drawImage(
      img,
      frame.sx,
      srcY,
      frame.sw,
      srcH,
      dx,
      y,
      fullW,
      sliceH + 1.0
    );
  }

  ctx.restore();
}

export function poly(ctx, x1, y1, x2, y2, x3, y3, x4, y4, clr, fog, fogA) {
  ctx.fillStyle = clr;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();

  if (fogA > 0.01) {
    ctx.save();
    ctx.globalAlpha = fogA;
    ctx.fillStyle = fog;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}