// Opponent render — sprite + dynamic position tag.

import { C } from '../configs/roadConfig.js';
import { P } from '../systems/roadSystem.js';
import { opponents } from '../systems/opponentSystem.js';
import { getOpponentSprite } from './opponentSprites.js';
import { getCtx, getW, getH } from '../core/canvas.js';
import { trackLen, getTrackLen } from '../core/roadMap.js';
import { _visibleSegs } from './roadRender.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Anchor an AI car onto the rendered road surface
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
      const pct = (zz - z1) / Math.max(1, z2 - z1);
      return {
        y:  v.y1 + (v.y2 - v.y1) * pct,
        cx: v.x1 + (v.x2 - v.x1) * pct,
        rw: v.w1 + (v.w2 - v.w1) * pct,
      };
    }
  }
  return null;
}

function wrapDz(objZ, playerZ, len) {
  let dz = objZ - playerZ;
  const half = len * 0.5;
  if (dz < -half) dz += len;
  else if (dz > half) dz -= len;
  return dz;
}

// Number tag — same style for everyone, no boss treatment
function drawNumberTag(ctx, x, y, scale, position) {
  const tagW = clamp(46 * scale, 30, 82);
  const tagH = clamp(22 * scale, 16, 34);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${clamp(13 * scale, 10, 22)}px Orbitron, Arial`;
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 8;

  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x - tagW / 2, y - tagH / 2, tagW, tagH, tagH * 0.4);
    ctx.fill();
  } else {
    ctx.fillRect(x - tagW / 2, y - tagH / 2, tagW, tagH);
  }

  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x - tagW / 2, y - tagH / 2, tagW, tagH, tagH * 0.4);
    ctx.stroke();
  }

  ctx.fillStyle = '#fff';
  ctx.fillText(`#${position}`, x, y + 1);
  ctx.restore();
}

function drawOpponentCar(ctx, ai) {
  const sprite = getOpponentSprite(ai.team);
  if (!sprite || !sprite.img?.ready || !sprite.frames?.length) return;

  const len = ai.onRoad2 ? getTrackLen(2) : trackLen;
  if (!len) return;

  if (!!ai.onRoad2 !== !!P.onRoad2) return;

  const W = getW();
  const H = getH();

  const playerZ = P.pos + (P.playerZ || 0);
  const dz = wrapDz(ai.z, playerZ, len);
  if (dz < 80) return;
  if (dz > C.SEG_LEN * C.DRAW_D * 0.5) return;

  const hit = visibleForZ(ai.z);
  if (!hit) return;

  const horizonY = H * 0.44;
  if (hit.y < horizonY - 4) return;
  if (hit.y > H * 1.05) return;

  // Frame selection
  const straight = sprite.straightIndex ?? Math.floor(sprite.frames.length / 2);
  const target = straight + clamp(ai.steerVisual || 0, -1, 1) * straight;
  ai.frameFloat = ai.frameFloat ?? straight;
  ai.frameFloat += (target - ai.frameFloat) * 0.22;

  const frameIndex = clamp(Math.round(ai.frameFloat), 0, sprite.frames.length - 1);
  const f = sprite.frames[frameIndex];
  if (!f) return;

  const srcW = f.srcW || 140;
  const srcH = f.srcH || 173;

  // Size scaling based on screen Y (near vs far)
  const NEAR_CAR_HEIGHT = 400;
  const FAR_SIZE_FACTOR = 0.18;
  const nearY = H * 0.70;
  const farY  = H * 0.43;

  let t = (nearY - hit.y) / Math.max(1, nearY - farY);
  t = clamp(t, 0, 1);
  const sizeFactor = 1 - t * (1 - FAR_SIZE_FACTOR);
  const drawScale = (NEAR_CAR_HEIGHT / srcH) * sizeFactor;

  const carW = srcW * drawScale;
  const carH = srcH * drawScale;

  const anchorX = hit.cx + (ai.x || 0) * hit.rw;
  const anchorY = hit.y;

  const dx = anchorX - carW * (f.anchorX ?? 0.5);
  const dy = anchorY - carH * (f.anchorY ?? 0.65);

  const airLift = (ai.airY || 0) * (C.JUMP_VISUAL_SCALE || 0.9);
  const finalDy = dy - airLift;

  if (dy + carH < horizonY - 30) return;
  if (dy > H + 100) return;
  if (dx + carW < -50) return;
  if (dx > W + 50) return;

  const fade = clamp(1 - dz / (C.DRAW_D * C.SEG_LEN * 0.55), 0.15, 1);

  ctx.save();
  ctx.globalAlpha = fade;

  // Ground shadow (no air lift)
  ctx.globalAlpha = clamp(0.38 * fade, 0.10, 0.42);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(anchorX, anchorY + carH * 0.04, carW * 0.34, carH * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sprite (with lift)
  ctx.globalAlpha = fade;
  ctx.drawImage(
    sprite.img,
    f.x, f.y, f.w, f.h,
    dx + (f.sx / srcW) * carW,
    finalDy + (f.sy / srcH) * carH,
    (f.w / srcW) * carW,
    (f.h / srcH) * carH
  );

  // Number tag — uses dynamic position
  if (drawScale > 0.20) {
    drawNumberTag(ctx, anchorX, finalDy + carH * 0.18, drawScale, ai.position || ai.number);
  }

  ctx.restore();
}

export function drawOpponents() {
  const ctx = getCtx();
  if (!ctx || !opponents.length) return;

  // Painter's algorithm — far first
  const playerZ = P.pos + (P.playerZ || 0);
  const list = opponents
    .filter((ai) => ai.active)
    .slice()
    .sort((a, b) => {
      const lenA = a.onRoad2 ? getTrackLen(2) : trackLen;
      const lenB = b.onRoad2 ? getTrackLen(2) : trackLen;
      const dzA = wrapDz(a.z, playerZ, lenA || trackLen);
      const dzB = wrapDz(b.z, playerZ, lenB || trackLen);
      return dzB - dzA;
    });

  for (let i = 0; i < list.length; i++) {
    drawOpponentCar(ctx, list[i]);
  }
}