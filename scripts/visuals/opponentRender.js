// ═══════════════════════════════════════════════════════
// OPPONENT RENDER — draws AI cars with UnitE sprites + number tag
// ═══════════════════════════════════════════════════════

import { C } from '../configs/roadConfig.js';
import { P } from '../systems/roadSystem.js';
import { opponents } from '../systems/opponentSystem.js';
import { getOpponentSprite } from './opponentSprites.js';
import { getCtx, getW, getH } from '../core/canvas.js';
import { trackLen, getTrackLen, project } from '../core/roadMap.js';

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function wrapDz(objZ, playerZ, len) {
  let dz = objZ - playerZ;
  while (dz < -len / 2) dz += len;
  while (dz > len / 2) dz -= len;
  return dz;
}

function drawNameTag(ctx, x, y, scale, ai) {
  const tagW = clamp(46 * scale, 30, 82);
  const tagH = clamp(22 * scale, 16, 34);

  ctx.save();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${clamp(13 * scale, 10, 22)}px Orbitron, Arial`;

  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 8;

  ctx.fillStyle = ai.boss
    ? 'rgba(255,40,40,0.90)'
    : 'rgba(0,0,0,0.72)';

  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x - tagW / 2, y - tagH / 2, tagW, tagH, tagH * 0.4);
    ctx.fill();
  } else {
    ctx.fillRect(x - tagW / 2, y - tagH / 2, tagW, tagH);
  }

  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.strokeStyle = ai.boss ? '#ffd54a' : 'rgba(255,255,255,0.7)';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x - tagW / 2, y - tagH / 2, tagW, tagH, tagH * 0.4);
    ctx.stroke();
  }

  ctx.fillStyle = '#fff';
  ctx.fillText(ai.boss ? 'BOSS' : `#${ai.position || ai.number}`, x, y + 1);

  ctx.restore();
}

function drawOpponentCar(ctx, ai) {
  const sprite = getOpponentSprite(ai.team);
  if (!sprite || !sprite.img?.ready || !sprite.frames?.length) return;

  const len = ai.onRoad2 ? getTrackLen(2) : trackLen;
  if (!len) return;

  // Only draw AI cars that are on the same active world as player
  if (!!ai.onRoad2 !== !!P.onRoad2) return;

  const playerZ = P.pos + (P.playerZ || 0);
  const dz = wrapDz(ai.z, playerZ, len);

  // Behind camera or too far ahead
  if (dz < C.CAM_DEPTH || dz > C.SEG_LEN * C.DRAW_D) return;

  const W = getW();
  const H = getH();

  const point = {
    world: {
      x: ai.x * C.ROAD_W,
      y: 0,
      z: P.pos + dz,
    },
    cam: {},
    scr: {},
  };

  const camY = C.CAM_H + (P.cameraAirY || 0);
  project(point, P.cameraX * C.ROAD_W, camY, P.pos, W, H);

  if (!point.scr.scale || point.scr.y < H * 0.05 || point.scr.y > H + 180) return;

  // Perspective size
  const perspective = point.scr.scale;
const OPPONENT_SIZE = 3.85;
const drawScale = clamp(perspective * W * 0.55 * OPPONENT_SIZE, 0.34, 3.8);
  // Frame selection
  const straight = sprite.straightIndex ?? Math.floor(sprite.frames.length / 2);
  const maxTurn = straight;
  const target = straight + clamp(ai.steerVisual || 0, -1, 1) * maxTurn;

  ai.frameFloat = ai.frameFloat ?? straight;
  ai.frameFloat += (target - ai.frameFloat) * 0.22;

  const frameIndex = clamp(Math.round(ai.frameFloat), 0, sprite.frames.length - 1);
  const f = sprite.frames[frameIndex];
  if (!f) return;

  const srcW = f.srcW || 140;
  const srcH = f.srcH || 173;

  const carW = srcW * drawScale;
  const carH = srcH * drawScale;

  const anchorX = point.scr.x;
  const anchorY = point.scr.y;

  const dx = anchorX - carW * (f.anchorX ?? 0.5);
  const dy = anchorY - carH * (f.anchorY ?? 0.65);

  // Shadow
  ctx.save();
  ctx.globalAlpha = clamp(0.38 * (1 - perspective * 0.05), 0.15, 0.42);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(
    anchorX,
    anchorY + carH * 0.06,
    carW * 0.34,
    carH * 0.045,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();

  // Car sprite
  ctx.drawImage(
    sprite.img,
    f.x,
    f.y,
    f.w,
    f.h,
    dx + (f.sx / srcW) * carW,
    dy + (f.sy / srcH) * carH,
    (f.w / srcW) * carW,
    (f.h / srcH) * carH
  );

  // Number tag above car
  if (drawScale > 0.22) {
    drawNameTag(
      ctx,
      anchorX,
      dy + carH * 0.18,
      drawScale,
      ai
    );
  }
}

export function drawOpponents() {
  const ctx = getCtx();
  if (!ctx || !opponents.length) return;

  // Draw far cars first, near cars last
  const list = opponents
    .filter(ai => ai.active)
    .slice()
    .sort((a, b) => {
      const lenA = a.onRoad2 ? getTrackLen(2) : trackLen;
      const lenB = b.onRoad2 ? getTrackLen(2) : trackLen;
      const dzA = wrapDz(a.z, P.pos + (P.playerZ || 0), lenA || trackLen);
      const dzB = wrapDz(b.z, P.pos + (P.playerZ || 0), lenB || trackLen);
      return dzB - dzA;
    });

  for (const ai of list) {
    drawOpponentCar(ctx, ai);
  }
}