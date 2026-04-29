// ═══════════════════════════════════════════════════════
// ROAD RENDER — Segment polygons, rumble, lanes
// ═══════════════════════════════════════════════════════
import { C, COL, LCOL }              from '../configs/roadConfig.js';
import { segs, trackLen, findSeg, project } from '../core/roadMap.js';
import { P, clamp }                  from '../systems/roadSystem.js';
import { getCtx, getW, getH }        from '../systems/projectionSystem.js';
import { IMG }                        from './objectRender.js';

export let _visibleSegs = [];

export function drawRoad() {
  const ctx = getCtx(), W = getW(), H = getH();
  const skyH = H*0.44|0;
  _visibleSegs = [];

  const base    = findSeg(P.pos + P.playerZ);
  const basePct = (P.pos % C.SEG_LEN) / C.SEG_LEN;

  let maxY = H;
  let xOff = 0;
  let dx   = -(base.curve * basePct);

  for (let n = 0; n < C.DRAW_D; n++) {
    const seg  = segs[(base.index+n) % segs.length];
    const camZ = P.pos - (base.index > seg.index ? trackLen : 0);

    project(seg.p1, P.playerX*C.ROAD_W, C.CAM_H, camZ, W, H);
    project(seg.p2, P.playerX*C.ROAD_W, C.CAM_H, camZ, W, H);

    xOff += dx;
    dx   += seg.curve;

    seg.p1.scr.x = (seg.p1.scr.x + xOff)|0;
    seg.p2.scr.x = (seg.p2.scr.x + xOff)|0;

    if (seg.p1.cam.z <= C.CAM_DEPTH || seg.p2.scr.y >= maxY) continue;

    const fogA = Math.min(1, Math.pow(n/C.DRAW_D, C.FOG_D));
    drawSeg(ctx, W,
      seg.p1.scr.x, seg.p1.scr.y, seg.p1.scr.w,
      seg.p2.scr.x, seg.p2.scr.y, seg.p2.scr.w,
      seg.col, COL.FOG, fogA);

    _visibleSegs.push({
      index: seg.index,
      y1:seg.p1.scr.y, y2:seg.p2.scr.y,
      x1:seg.p1.scr.x, x2:seg.p2.scr.x,
      w1:seg.p1.scr.w, w2:seg.p2.scr.w,
      z1:seg.p1.world.z, z2:seg.p2.world.z,
      camZ: seg.p1.cam.z,
    });
    maxY = seg.p2.scr.y;
  }

  // Extend nearest road segment to bottom of screen
  if (_visibleSegs.length) {
    const near = _visibleSegs[0];
    const y    = near.y1;
    if (y < H) {
      const grow    = Math.max(W*0.10, near.w1*0.24);
      const roadCol = near.index < C.RUMBLE*2 ? LCOL.START.road : COL.ROAD_A;
      poly(ctx, near.x1-near.w1, y, near.x1+near.w1, y, W+grow, H+4, -grow, H+4, roadCol, COL.FOG, 0);
      const rw = near.w1*.13;
      poly(ctx, near.x1-near.w1-rw, y, near.x1-near.w1, y, -grow*.35, H+4, -grow, H+4, COL.RUM_A, COL.FOG, 0);
      poly(ctx, near.x1+near.w1,   y, near.x1+near.w1+rw, y, W+grow, H+4, W+grow*.35, H+4, COL.RUM_A, COL.FOG, 0);
    }
  }
}

function drawSeg(ctx, W, x1,y1,w1, x2,y2,w2, col, fog, fogA) {
  const {road,rum,lane} = col;
  poly(ctx, x1-w1,y1, x1+w1,y1, x2+w2,y2, x2-w2,y2, road,fog,fogA);
  const rw1=w1*.13, rw2=w2*.13;
  poly(ctx, x1-w1-rw1,y1, x1-w1,y1, x2-w2,y2, x2-w2-rw2,y2, rum,fog,fogA);
  poly(ctx, x1+w1,y1, x1+w1+rw1,y1, x2+w2+rw2,y2, x2+w2,y2, rum,fog,fogA);

  if (lane && Math.abs(y1-y2) > 2 && w1 > 24) {
    for (let i=1; i<C.LANES; i++) {
      const lx1 = x1-w1+(w1*2/C.LANES)*i;
      const lx2 = x2-w2+(w2*2/C.LANES)*i;
      const lw  = Math.max(1,(w1*2*.006)|0);
      const lw2 = Math.max(1,(w2*2*.006)|0);
      poly(ctx, lx1-lw,y1, lx1+lw,y1, lx2+lw2,y2, lx2-lw2,y2, lane,fog,fogA*.8);
    }
  }
}

export function poly(ctx, x1,y1,x2,y2,x3,y3,x4,y4, clr, fog, fogA) {
  ctx.fillStyle = clr;
  ctx.beginPath();
  ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.lineTo(x4,y4);
  ctx.closePath(); ctx.fill();
  if (fogA > .01) {
    ctx.fillStyle  = fog;
    ctx.globalAlpha = fogA;
    ctx.beginPath();
    ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.lineTo(x4,y4);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
