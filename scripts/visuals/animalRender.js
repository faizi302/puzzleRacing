// ═══════════════════════════════════════════════════════
// ANIMAL RENDER — 2D animals crossing road left/right
// ═══════════════════════════════════════════════════════
import { C } from '../configs/roadConfig.js';
import { ANIMAL_SHEETS, ANIMAL_SPAWN } from '../configs/animalConfig.js';
import { trackLen } from '../core/roadMap.js';
import { P, clamp } from '../systems/roadSystem.js';
import { getCtx, getW, getH, getRes } from '../core/canvas.js';
import { IMG } from './objectRender.js';
import { _visibleSegs } from './roadRender.js';

export let animalObjs = [];

export function buildAnimals() {
  animalObjs = [];

  const total = Math.max(1, Math.floor(trackLen / C.SEG_LEN));

  for (const sp of ANIMAL_SPAWN) {
    for (let i = sp.startSeg; i < total - 40; i += sp.everySeg) {
      const cfg = ANIMAL_SHEETS[sp.kind];
      const dir = sp.side < 0 ? 1 : -1;

      animalObjs.push({
        kind: sp.kind,
        z: i * C.SEG_LEN + 80,
        dir,
        progress: Math.random() * 0.25,
        speed: cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin),
        frame: 0,
        frameT: 0,
      });
    }
  }
}

export function updateAnimals(dt) {
  for (const a of animalObjs) {
    a.progress += (a.speed * dt) / 2200;

    if (a.progress > 1.18) {
      a.progress = -0.18;
    }

    const cfg = ANIMAL_SHEETS[a.kind];
    a.frameT += dt;

    if (a.frameT >= cfg.frameTime) {
      a.frameT = 0;
      a.frame = (a.frame + 1) % (cfg.cols * cfg.rows);
    }
  }
}

function visibleForZ(z) {
  if (!_visibleSegs.length) return null;

  for (const v of _visibleSegs) {
    let z1 = v.z1;
    let z2 = v.z2;
    let zz = z;

    if (z2 < z1) z2 += trackLen;
    if (zz < z1) zz += trackLen;

    if (zz >= z1 && zz <= z2) {
      return { v, pct: (zz - z1) / (z2 - z1) };
    }
  }

  return null;
}

function drawAnimalSprite(ctx, img, cfg, a, x, y, w, h) {
  const fw = cfg.sheetW / cfg.cols;
  const fh = cfg.sheetH / cfg.rows;

  const col = a.frame % cfg.cols;
  const row = Math.floor(a.frame / cfg.cols);

  const sx = col * fw;
  const sy = row * fh;

  ctx.save();

  if (a.dir < 0) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, fw, fh, 0, 0, w, h);
  } else {
    ctx.drawImage(img, sx, sy, fw, fh, x, y, w, h);
  }

  ctx.restore();
}

export function drawAnimals() {
  if (!_visibleSegs.length) return;

  const ctx = getCtx();
  const W = getW();
  const H = getH();
  const res = getRes();
  const horizonY = H * 0.44;

  const list = [];

  for (const a of animalObjs) {
    const cfg = ANIMAL_SHEETS[a.kind];
    const img = IMG[cfg.imgKey];

    if (!img || !img.ready) continue;

    let dz = a.z - P.pos;
    while (dz < 0) dz += trackLen;

    if (dz < 260 || dz > C.DRAW_D * C.SEG_LEN * 0.70) continue;

    const hit = visibleForZ(a.z);
    if (!hit) continue;

    const { v, pct } = hit;

    const y = v.y1 + (v.y2 - v.y1) * pct;
    const cx = v.x1 + (v.x2 - v.x1) * pct;
    const rw = v.w1 + (v.w2 - v.w1) * pct;

    if (y < horizonY || y > H * 0.98) continue;

    list.push({ a, cfg, img, dz, y, cx, rw });
  }

  list.sort((a, b) => b.dz - a.dz);

  for (const it of list) {
    const { a, cfg, img } = it;

    const roadLeft = it.cx - it.rw * 1.45;
    const roadRight = it.cx + it.rw * 1.45;

    const t = clamp(a.progress, -0.18, 1.18);

    const xCenter = a.dir > 0
      ? roadLeft + (roadRight - roadLeft) * t
      : roadRight - (roadRight - roadLeft) * t;

    const perspective = clamp((C.CAM_DEPTH / it.dz) * 2500, 0.12, 1.35);

    let drawW = 130 * cfg.scale * perspective * res;
    drawW = clamp(drawW, 24 * res, 180 * res);

    const fw = cfg.sheetW / cfg.cols;
    const fh = cfg.sheetH / cfg.rows;

    const drawH = drawW * (fh / fw);

    const x = xCenter - drawW / 2;
    const y = it.y - drawH * cfg.anchorY;

    if (x > W + drawW || x < -drawW || y > H || y + drawH < horizonY) continue;

    const fade = clamp(1 - it.dz / (C.DRAW_D * C.SEG_LEN * 0.55), 0, 1);

    ctx.save();
    ctx.globalAlpha = 0.18 + fade * 0.82;

    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(
      xCenter,
      it.y + drawH * 0.05,
      drawW * 0.38,
      drawH * 0.09,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    drawAnimalSprite(ctx, img, cfg, a, x, y, drawW, drawH);

    ctx.restore();
  }
}