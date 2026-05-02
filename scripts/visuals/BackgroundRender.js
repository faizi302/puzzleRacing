// ═══════════════════════════════════════════════════════
// BACKGROUND RENDER — Horizon + reverse camera feeling
// ═══════════════════════════════════════════════════════
import { getCtx, getW, getH } from '../core/canvas.js';
import { clamp, P } from '../systems/roadSystem.js';
import { C, HORIZON_FRAME } from '../configs/roadConfig.js';
import { IMG } from './objectRender.js';

let _horizonPan = 0;

function wrap(v, size) {
  return ((v % size) + size) % size;
}

export function drawCoverFrame(ctx, img, frame, dx, dy, dw, dh, offPx = 0) {
  if (!img.ready) {
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(dx, dy, dw, dh);
    return;
  }

  const sw = frame.sw;
  const sh = frame.sh;
  const scale = Math.max(dh / sh, dw / sw);
  const tw = sw * scale;
  const th = sh * scale;
  const startX = -wrap(offPx, tw) - tw;
  const yPos = dy + (dh - th) * 0.5;

  for (let x = startX; x < dw + tw; x += tw) {
    ctx.drawImage(img, frame.sx, frame.sy, sw, sh, dx + x, yPos, tw, th);
  }
}

function drawGroundBase() {
  const ctx = getCtx();
  const W = getW();
  const H = getH();
  const horizonY = H * 0.43;
  const h = H - horizonY;

  const secret = P.cameraFlip || 0;

  const g = ctx.createLinearGradient(0, horizonY, 0, H);
  if (secret > 0.5) {
    g.addColorStop(0, '#314d2e');
    g.addColorStop(0.5, '#263f25');
    g.addColorStop(1, '#1d321d');
  } else {
    g.addColorStop(0, '#5a8a3a');
    g.addColorStop(0.5, '#4a7c2e');
    g.addColorStop(1, '#3f6c25');
  }

  ctx.fillStyle = g;
  ctx.fillRect(0, horizonY, W, h);

  const fog = ctx.createLinearGradient(0, horizonY, 0, horizonY + H * 0.10);
  fog.addColorStop(0, 'rgba(180, 210, 195, 0.55)');
  fog.addColorStop(1, 'rgba(180, 210, 195, 0)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, horizonY, W, H * 0.12);
}

export function drawBG() {
  const ctx = getCtx();
  const W = getW();
  const H = getH();
  const skyH = (H * 0.43) | 0;

  const speed01 = clamp(Math.abs(P.speed) / C.NORMAL_MAX, 0, 1.2);
  const smoothCurve = P.cameraCurve ?? P.roadCurve;

  // During reverse camera mode, pan opposite for 180° feeling.
  const flip = P.cameraFlip || 0;
  const dir = flip > 0.5 ? 1 : -1;

  _horizonPan += dir * smoothCurve * W * 0.0035 * speed01;

  drawCoverFrame(ctx, IMG.horizon, HORIZON_FRAME, 0, 0, W, skyH, _horizonPan);
  drawGroundBase();

  // Soft dark flash during camera rotation
  if (flip > 0.02 && flip < 0.98) {
    ctx.save();
    ctx.globalAlpha = Math.sin(flip * Math.PI) * 0.28;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}