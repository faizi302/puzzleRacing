// ═══════════════════════════════════════════════════════
// BACKGROUND RENDER — Forward HorizonE, Backward HorizonC
// Smooth fake 180° camera turn
// ═══════════════════════════════════════════════════════
import { getCtx, getW, getH } from '../core/canvas.js';
import { clamp, P } from '../systems/roadSystem.js';
import { C, HORIZON_FRAMES } from '../configs/roadConfig.js';
import { IMG } from './objectRender.js';
import { getActiveLevel } from '../core/activeLevel.js';

let _panE = 0;
let _panC = 0;

function wrap(v, size) {
  return ((v % size) + size) % size;
}

function easeInOut(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

function drawCoverFrame(ctx, img, frame, dx, dy, dw, dh, offPx = 0, alpha = 1) {
  if (!img?.ready) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(dx, dy, dw, dh);
    ctx.restore();
    return;
  }

  const sw = frame.sw;
  const sh = frame.sh;
  const scale = Math.max(dh / sh, dw / sw);
  const tw = sw * scale;
  const th = sh * scale;
  const startX = -wrap(offPx, tw) - tw;
  const yPos = dy + (dh - th) * 0.5;

  ctx.save();
  ctx.globalAlpha = alpha;
  for (let x = startX; x < dw + tw; x += tw) {
    ctx.drawImage(img, frame.sx, frame.sy, sw, sh, dx + x, yPos, tw, th);
  }
  ctx.restore();
}

function drawGroundBase(secretT) {
  const ctx = getCtx();
  const W = getW();
  const H = getH();
  const horizonY = H * 0.43;

  const g = ctx.createLinearGradient(0, horizonY, 0, H);

  const lvl = getActiveLevel();
  const isLevel2 = lvl?.id === 'level2';

  if (isLevel2) {
    g.addColorStop(0, '#BAB7B4');
    g.addColorStop(0.45, '#C6C3BE');
    g.addColorStop(1, '#676767');
  } else if (secretT > 0.55) {
    g.addColorStop(0, '#25472f');
    g.addColorStop(0.5, '#1f3928');
    g.addColorStop(1, '#172b20');
  } else {
    g.addColorStop(0, '#5a8a3a');
    g.addColorStop(0.5, '#4a7c2e');
    g.addColorStop(1, '#3f6c25');
  }

  ctx.fillStyle = g;
  ctx.fillRect(0, horizonY, W, H - horizonY);

  const fog = ctx.createLinearGradient(0, horizonY, 0, horizonY + H * 0.12);
  fog.addColorStop(0, 'rgba(180, 210, 195, 0.55)');
  fog.addColorStop(1, 'rgba(180, 210, 195, 0)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, horizonY, W, H * 0.14);
}

function drawCameraTurnOverlay(t) {
  const ctx = getCtx();
  const W = getW();
  const H = getH();

  if (t <= 0.001 || t >= 0.999) return;

  const k = Math.sin(t * Math.PI);

  ctx.save();

  // cinematic dark sweep
  ctx.globalAlpha = 0.18 * k;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // center light line during rotation
  ctx.globalAlpha = 0.20 * k;
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, H * 0.40, W, H * 0.045);

  ctx.restore();
}

export function drawBG() {
  const ctx = getCtx();
  const W = getW();
  const H = getH();
  const skyH = (H * 0.43) | 0;

  const speed01 = clamp(Math.abs(P.speed) / C.NORMAL_MAX, 0, 1.2);
  const curve = P.cameraCurve ?? P.roadCurve;

  const turnT = easeInOut(P.cameraFlip || 0);

  _panE += -curve * W * 0.0035 * speed01;
  _panC += curve * W * 0.0035 * speed01;

  const lvl = getActiveLevel();

  const forwardKey = lvl?.horizonForward || 'E';
  const backwardKey = lvl?.horizonBackward || 'C';

  const forwardFrame = HORIZON_FRAMES[forwardKey] || HORIZON_FRAMES.E;
  const backwardFrame = HORIZON_FRAMES[backwardKey] || HORIZON_FRAMES.C;

  drawCoverFrame(ctx, IMG.horizon, forwardFrame, 0, 0, W, skyH, _panE, 1 - turnT);
  drawCoverFrame(ctx, IMG.horizon, backwardFrame, 0, 0, W, skyH, _panC, turnT);

  drawGroundBase(turnT);
  drawCameraTurnOverlay(turnT);
}