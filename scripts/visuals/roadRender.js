// ═══════════════════════════════════════════════════════
// ROAD RENDER — Segment polygons, rumble, lanes
// Better curve camera shift + non-fixed road edges
// ═══════════════════════════════════════════════════════
import { C, COL, LCOL }                    from '../configs/roadConfig.js';
import { segs, trackLen, findSeg, project } from '../core/roadMap.js';
import { P, clamp }                        from '../systems/roadSystem.js';
import { getCtx, getW, getH }              from '../systems/projectionSystem.js';

export let _visibleSegs = [];

let _curveScreenShift = 0;

export function drawRoad() {
  const ctx = getCtx();
  const W   = getW();
  const H   = getH();

  _visibleSegs = [];

  const base    = findSeg(P.pos + P.playerZ);
  const basePct = (P.pos % C.SEG_LEN) / C.SEG_LEN;

  // This is the important part:
  // road turns right  → whole road/camera shifts right visually
  // road turns left   → whole road/camera shifts left visually
  const targetShift = clamp(P.roadCurve, -1, 1) * W * 1.0;
  _curveScreenShift += (targetShift - _curveScreenShift) * 0.10;

  let maxY = H;
  let xOff = 0;
  let dx   = -(base.curve * basePct);

  for (let n = 0; n < C.DRAW_D; n++) {
    const seg  = segs[(base.index + n) % segs.length];
    const camZ = P.pos - (base.index > seg.index ? trackLen : 0);

    project(seg.p1, P.playerX * C.ROAD_W, C.CAM_H, camZ, W, H);
    project(seg.p2, P.playerX * C.ROAD_W, C.CAM_H, camZ, W, H);

    xOff += dx;
    dx   += seg.curve;

    // Classic pseudo-3D curve offset + whole-road curve camera shift
    const curveDepthBoost = n / C.DRAW_D;
    const totalShift = xOff + _curveScreenShift * (1.0 - curveDepthBoost * 0.25);

    seg.p1.scr.x = (seg.p1.scr.x + totalShift) | 0;
    seg.p2.scr.x = (seg.p2.scr.x + totalShift) | 0;

    if (seg.p1.cam.z <= C.CAM_DEPTH || seg.p2.scr.y >= maxY) continue;

    const fogA = Math.min(1, Math.pow(n / C.DRAW_D, C.FOG_D));

    drawSeg(
      ctx, W,
      seg.p1.scr.x, seg.p1.scr.y, seg.p1.scr.w,
      seg.p2.scr.x, seg.p2.scr.y, seg.p2.scr.w,
      seg.col,
      COL.FOG,
      fogA
    );

    _visibleSegs.push({
      index : seg.index,
      y1    : seg.p1.scr.y,
      y2    : seg.p2.scr.y,
      x1    : seg.p1.scr.x,
      x2    : seg.p2.scr.x,
      w1    : seg.p1.scr.w,
      w2    : seg.p2.scr.w,
      z1    : seg.p1.world.z,
      z2    : seg.p2.world.z,
      camZ  : seg.p1.cam.z,
    });

    maxY = seg.p2.scr.y;
  }

  drawNearestRoadExtension(ctx, W, H);
}

function drawNearestRoadExtension(ctx, W, H) {
  if (!_visibleSegs.length) return;

  const near = _visibleSegs[0];
  const next = _visibleSegs[1] || near;

  const yTop = near.y1;
  if (yTop >= H) return;

  // Extrapolate road center to bottom instead of forcing it full-screen.
  // This makes road edges move on left/right curves.
  const centerSlope = near.x1 - next.x1;
  const bottomX = near.x1 + centerSlope * 0.55 + _curveScreenShift * 0.20;

  // Keep straight road wide, but allow curve side/background to show.
  const bottomW = Math.min(W * 1.08, Math.max(near.w1 * 1.35, W * 0.62));

  const roadCol = near.index < C.RUMBLE * 2 ? LCOL.START.road : COL.ROAD_A;

  poly(
    ctx,
    near.x1 - near.w1, yTop,
    near.x1 + near.w1, yTop,
    bottomX + bottomW, H + 4,
    bottomX - bottomW, H + 4,
    roadCol,
    COL.FOG,
    0
  );

  // Side rumble strips follow shifted road edge
  const rwTop = near.w1 * 0.13;
  const rwBot = bottomW * 0.13;

  poly(
    ctx,
    near.x1 - near.w1 - rwTop, yTop,
    near.x1 - near.w1,         yTop,
    bottomX - bottomW,         H + 4,
    bottomX - bottomW - rwBot, H + 4,
    COL.RUM_A,
    COL.FOG,
    0
  );

  poly(
    ctx,
    near.x1 + near.w1,         yTop,
    near.x1 + near.w1 + rwTop, yTop,
    bottomX + bottomW + rwBot, H + 4,
    bottomX + bottomW,         H + 4,
    COL.RUM_A,
    COL.FOG,
    0
  );

  // Bottom lane markers so the near road also follows curve movement
  if (C.LANES > 1) {
    for (let i = 1; i < C.LANES; i++) {
      const t = i / C.LANES;

      const lxTop = (near.x1 - near.w1) + near.w1 * 2 * t;
      const lxBot = (bottomX - bottomW) + bottomW * 2 * t;

      const lwTop = Math.max(2, near.w1 * 0.006);
      const lwBot = Math.max(3, bottomW * 0.006);

      poly(
        ctx,
        lxTop - lwTop, yTop,
        lxTop + lwTop, yTop,
        lxBot + lwBot, H + 4,
        lxBot - lwBot, H + 4,
        COL.LANE,
        COL.FOG,
        0
      );
    }
  }
}

function drawSeg(ctx, W, x1, y1, w1, x2, y2, w2, col, fog, fogA) {
  const { road, rum, lane } = col;

  poly(ctx, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, road, fog, fogA);

  const rw1 = w1 * 0.13;
  const rw2 = w2 * 0.13;

  poly(ctx, x1 - w1 - rw1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - rw2, y2, rum, fog, fogA);
  poly(ctx, x1 + w1, y1, x1 + w1 + rw1, y1, x2 + w2 + rw2, y2, x2 + w2, y2, rum, fog, fogA);

  if (lane && Math.abs(y1 - y2) > 2 && w1 > 24) {
    for (let i = 1; i < C.LANES; i++) {
      const lx1 = x1 - w1 + (w1 * 2 / C.LANES) * i;
      const lx2 = x2 - w2 + (w2 * 2 / C.LANES) * i;

      const lw1 = Math.max(1, (w1 * 2 * 0.006) | 0);
      const lw2 = Math.max(1, (w2 * 2 * 0.006) | 0);

      poly(ctx, lx1 - lw1, y1, lx1 + lw1, y1, lx2 + lw2, y2, lx2 - lw2, y2, lane, fog, fogA * 0.8);
    }
  }
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