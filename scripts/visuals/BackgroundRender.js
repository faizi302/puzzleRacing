// ═══════════════════════════════════════════════════════
// BACKGROUND RENDER — Persistent horizon + moving ground
// ═══════════════════════════════════════════════════════
import { getCtx, getW, getH } from '../systems/projectionSystem.js';
import { clamp, P }           from '../systems/roadSystem.js';
import { C }                  from '../configs/roadConfig.js';
import { IMG }                from './objectRender.js';

let _horizonPan = 0;
let _groundScroll = 0;
let _lastPos = 0;

function wrap(v, size) {
  return ((v % size) + size) % size;
}

export function drawCover(ctx, img, dx, dy, dw, dh, offPx = 0, verticalShift = 0) {
  if (!img.ready) {
    ctx.fillStyle = '#83b66a';
    ctx.fillRect(dx, dy, dw, dh);
    return;
  }

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  const scale = Math.max(dh / ih, dw / iw);
  const sw = iw * scale;
  const sh = ih * scale;

  const startX = -wrap(offPx, sw) - sw;

  for (let x = startX; x < dw + sw * 2; x += sw) {
    ctx.drawImage(
      img,
      dx + x,
      dy + (dh - sh) * 0.5 + verticalShift,
      sw,
      sh
    );
  }
}

export function drawGroundLayer() {
  const ctx = getCtx();
  const W   = getW();
  const H   = getH();

  const horizonY = H * 0.43;
  const h = H - horizonY;

  const posDelta = P.pos >= _lastPos
    ? P.pos - _lastPos
    : P.pos;

  _lastPos = P.pos;

  // This makes ground.png move backward with real speed.
  _groundScroll += posDelta * 0.22;

  // Add small curve sideways motion so it matches road/scenery.
  const curveSide = P.roadCurve * W * 0.12;

  if (IMG.ground.ready) {
    const iw = IMG.ground.naturalWidth;
    const ih = IMG.ground.naturalHeight;

    const scale = Math.max(W / iw, h / ih);
    const tw = iw * scale;
    const th = ih * scale;

    const off = wrap(_groundScroll + curveSide, tw);

    for (let x = -off - tw; x < W + tw * 2; x += tw) {
      ctx.drawImage(IMG.ground, x, horizonY, tw, th);
    }

    const g = ctx.createLinearGradient(0, horizonY, 0, horizonY + H * 0.08);
    g.addColorStop(0, 'rgba(150,190,95,.45)');
    g.addColorStop(1, 'rgba(150,190,95,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, horizonY, W, H * 0.1);
  } else {
    ctx.fillStyle = '#7aad47';
    ctx.fillRect(0, horizonY, W, h);
  }
}

export function drawBG() {
  const ctx = getCtx();
  const W   = getW();
  const H   = getH();

  const skyH = H * 0.43 | 0;

  // Persistent horizon movement:
  // Left turn  roadCurve < 0 → horizon moves right.
  // Right turn roadCurve > 0 → horizon moves left.
  // It does NOT reset to original position after curve ends.
  const speed01 = Math.min(1, Math.max(0, P.speed / C.MAX_SPD));
  const panSpeed = -P.roadCurve * W * 0.010 * speed01;

  _horizonPan += panSpeed;

  // small camera vertical reaction for hills
  const hillShift = clamp(P.cameraY * 0.018, -H * 0.045, H * 0.045);

  drawCover(ctx, IMG.horizon, 0, 0, W, skyH, _horizonPan, hillShift);
  drawGroundLayer();
}