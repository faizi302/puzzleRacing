// ═══════════════════════════════════════════════════════
// BACKGROUND RENDER — HorizonE sky + flat grass base
// (the road's segment textures supply their own grass borders)
// ═══════════════════════════════════════════════════════
import { getCtx, getW, getH }       from '../core/canvas.js';
import { clamp, P }                 from '../systems/roadSystem.js';
import { C, HORIZON_FRAME }         from '../configs/roadConfig.js';
import { IMG }                      from './objectRender.js';

let _horizonPan = 0;

function wrap(v, size) {
  return ((v % size) + size) % size;
}

// Draw a single frame from a sprite atlas as a tiled "cover-fit" strip.
// The frame is repeated horizontally to fill dw, scaled to fit dh.
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
  const yPos   = dy + (dh - th) * 0.5;

  for (let x = startX; x < dw + tw; x += tw) {
    ctx.drawImage(img, frame.sx, frame.sy, sw, sh, dx + x, yPos, tw, th);
  }
}

// Flat green ground beneath horizon. The road textures (with grass borders)
// are drawn on top of this in roadRender.
function drawGroundBase() {
  const ctx = getCtx();
  const W   = getW();
  const H   = getH();

  const horizonY = H * 0.43;
  const h        = H - horizonY;

  const g = ctx.createLinearGradient(0, horizonY, 0, H);
  g.addColorStop(0,   '#5a8a3a');
  g.addColorStop(0.5, '#4a7c2e');
  g.addColorStop(1,   '#3f6c25');
  ctx.fillStyle = g;
  ctx.fillRect(0, horizonY, W, h);

  // Soft haze right at the horizon to blend with the sky.
  const fog = ctx.createLinearGradient(0, horizonY, 0, horizonY + H * 0.10);
  fog.addColorStop(0, 'rgba(180, 210, 195, 0.55)');
  fog.addColorStop(1, 'rgba(180, 210, 195, 0)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, horizonY, W, H * 0.12);
}

export function drawBG() {
  const ctx = getCtx();
  const W   = getW();
  const H   = getH();

  const skyH    = (H * 0.43) | 0;
  const speed01 = clamp(P.speed / C.MAX_SPD, 0, 1);

  _horizonPan += -P.roadCurve * W * 0.010 * speed01;

  // 1. Sky / horizon — HorizonE frame from Horizons.jpg
  drawCoverFrame(ctx, IMG.horizon, HORIZON_FRAME, 0, 0, W, skyH, _horizonPan);

  // 2. Plain grass base behind the textured road.
  drawGroundBase();
}