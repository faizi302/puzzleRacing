import { C } from '../configs/roadConfig.js';
import { trackLen } from '../core/roadMap.js';
import { P, clamp } from '../systems/roadSystem.js';
import { getCtx, getW, getH, getRes } from '../core/canvas.js';
import { IMG } from './objectRender.js';
import { _visibleSegs } from './roadRender.js';
import { sceneryObjs } from './sceneryRender.js';

// const GORILLA = {
//   cols: 6,
//   rows: 5,
//   sheetW: 2752,
//   sheetH: 1536,
//   frameW: 2752 / 5,
//   frameH: 1536 / 3,
// };

// function frameRect(i) {
//   i = Math.max(0, Math.min(14, i | 0));
//   const col = i % GORILLA.cols;
//   const row = Math.floor(i / GORILLA.cols);

//   return {
//     sx: col * GORILLA.frameW,
//     sy: row * GORILLA.frameH,
//     sw: GORILLA.frameW,
//     sh: GORILLA.frameH,
//   };
// }

const GORILLA_FRAMES = [
  // ROW 1
  { sx: 20,   sy: 30,  sw: 430, sh: 420 }, // 0 idle
  { sx: 500,  sy: 25,  sw: 430, sh: 420 }, // 1
  { sx: 980,  sy: 20,  sw: 430, sh: 420 }, // 2
  { sx: 1460, sy: 20,  sw: 430, sh: 420 }, // 3
  { sx: 1940, sy: 10,  sw: 430, sh: 430 }, // 4

  // ROW 2
  { sx: 20,   sy: 500, sw: 430, sh: 430 }, // 5
  { sx: 500,  sy: 500, sw: 430, sh: 430 }, // 6
  { sx: 980,  sy: 500, sw: 430, sh: 430 }, // 7
  { sx: 1460, sy: 500, sw: 430, sh: 430 }, // 8
  { sx: 1940, sy: 500, sw: 430, sh: 430 }, // 9

  // ROW 3
  { sx: 20,   sy: 980, sw: 430, sh: 430 }, // 10
  { sx: 500,  sy: 980, sw: 430, sh: 430 }, // 11
  { sx: 980,  sy: 980, sw: 430, sh: 430 }, // 12
  { sx: 1460, sy: 980, sw: 430, sh: 430 }, // 13
  { sx: 1940, sy: 980, sw: 430, sh: 430 }, // 14
];

function frameRect(i) {
  i = Math.max(0, Math.min(14, i | 0));
  return GORILLA_FRAMES[i];
}

function visibleForZ(z) {
  if (!_visibleSegs.length) return null;

  let zz = z;
  if (zz < P.pos) zz += trackLen;

  for (const v of _visibleSegs) {
    let z1 = v.z1;
    let z2 = v.z2;

    if (z1 < P.pos) z1 += trackLen;
    if (z2 < z1) z2 += trackLen;

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
  const W = getW();
  const H = getH();
  const res = getRes();
  const horizonY = H * 0.44;

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
    const cx = v.x1 + (v.x2 - v.x1) * pct;
    const rw = v.w1 + (v.w2 - v.w1) * pct;

    if (roadY < horizonY - 4 || roadY > H * 1.15) continue;

    list.push({ o, roadY, cx, rw, dz });
  }

  list.sort((a, b) => b.dz - a.dz);

  for (const it of list) {
    const { o, roadY, cx, rw, dz } = it;
    const f = frameRect(o.frame || 0);

    const scale = C.CAM_DEPTH / dz;
    const rawH = C.ROAD_W * 1.25 * (o.size ?? 1) * scale * W;
    const screenH = clamp(rawH, 42 * res, H * 0.82);
    const screenW = screenH * (f.sw / f.sh);

    const groundX = cx + (o.offset || 0) * rw;
    const yBase = roadY;

    const dx = groundX - screenW * 0.5;
    const dy = yBase - screenH;

    const fade = clamp(1 - dz / (C.DRAW_D * C.SEG_LEN * 0.60), 0.25, 1);

    ctx.save();
    ctx.globalAlpha = fade;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(
      groundX,
      yBase + 4 * res,
      screenW * 0.34,
      Math.max(4, screenH * 0.045),
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    if (o.aiState === 'attack') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.18 * fade;
      ctx.fillStyle = 'rgba(255,40,30,1)';
      ctx.beginPath();
      ctx.ellipse(
        groundX,
        yBase - screenH * 0.50,
        screenW * 0.55,
        screenH * 0.28,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fade;
    }

    ctx.drawImage(
      IMG.monsters,
      f.sx,
      f.sy,
      f.sw,
      f.sh,
      dx,
      dy,
      screenW,
      screenH
    );

    ctx.restore();
  }
}