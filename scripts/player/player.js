// ═══════════════════════════════════════════════════════
// PLAYER — UnitA spritesheet car renderer + tire dust FX
// ═══════════════════════════════════════════════════════
import { P }                          from '../systems/roadSystem.js';
import { getCtx, getW, getH, getRes } from '../core/canvas.js';

// ── Car frames ─────────────────────────────────────────
const FRAMES_A = [
  { x:   1, y:  1, w:119, h:101, sx:17, sy:40 },
  { x:   1, y:104, w:117, h:101, sx:19, sy:40 },
  { x:   1, y:308, w:115, h:100, sx:20, sy:40 },
  { x:   1, y:410, w:114, h:100, sx:21, sy:40 },
  { x: 475, y:  1, w:111, h: 99, sx:23, sy:40 },
  { x:1490, y:  1, w:109, h: 97, sx:24, sy:41 },
  { x:1712, y:  1, w:108, h: 97, sx:24, sy:41 },
  { x:1042, y:  1, w:110, h: 96, sx:21, sy:41 },
  { x:1154, y:  1, w:110, h: 96, sx:19, sy:41 },
  { x: 701, y:  1, w:112, h: 95, sx:16, sy:41 },
  { x: 815, y:  1, w:112, h: 94, sx:14, sy:41 },
  { x: 929, y:  1, w:111, h: 95, sx:12, sy:41 },
  { x:1266, y:  1, w:110, h: 96, sx:11, sy:41 },
  { x:1378, y:  1, w:110, h: 96, sx: 9, sy:41 },
  { x: 701, y: 98, w:108, h: 97, sx: 8, sy:41 },
  { x:1601, y:  1, w:109, h: 97, sx: 7, sy:42 },
  { x: 588, y:  1, w:111, h: 97, sx: 6, sy:42 },
  { x: 360, y:  1, w:113, h: 98, sx: 5, sy:42 },
  { x: 243, y:  1, w:115, h: 98, sx: 5, sy:42 },
  { x:   1, y:207, w:117, h: 99, sx: 4, sy:42 },
  { x: 122, y:  1, w:119, h: 99, sx: 4, sy:42 },
];

const SRC_W = 140;
const SRC_H = 173;
const ANCHOR_X = 0.5;
const ANCHOR_Y = 0.65;
const STRAIGHT = 9;
const TOTAL = FRAMES_A.length;

let _frameFloat = STRAIGHT;

// ── Car image ──────────────────────────────────────────
const _sheet = new Image();
_sheet.ready = false;
_sheet.onload = () => { _sheet.ready = true; };
_sheet.onerror = () => console.warn('[player] UnitsTeamB.png not found');
_sheet.src = 'assets/player/UnitsTeamB.png';

// ── Effects image ──────────────────────────────────────
const _fx = new Image();
_fx.ready = false;
_fx.onload = () => { _fx.ready = true; };
_fx.onerror = () => console.warn('[effects] Effects.png not found');
_fx.src = 'assets/player/Effects.png';

// Streak frames from Effects.json
const STREAKS = [
  { x:1,    y:1,   w:480, h:270 },
  { x:482,  y:1,   w:480, h:270 },
  { x:963,  y:1,   w:480, h:270 },
  { x:1444, y:1,   w:480, h:270 },
  { x:1,    y:272, w:480, h:270 },
  { x:482,  y:272, w:480, h:270 },
  { x:963,  y:272, w:480, h:270 },
  { x:1444, y:272, w:480, h:270 },
  { x:1,    y:543, w:480, h:270 },
  { x:482,  y:543, w:480, h:270 },
];

let _fxTick = 0;

function drawSpeedStreaks(ctx, W, H, res, anchorX, anchorY, drawW, drawH) {
  const speed01 = Math.min(1, Math.max(0, P.speed / 34));
  if (!_fx.ready || speed01 < 0.55) return;

  _fxTick += 0.35 + speed01 * 0.55;
  const f = STREAKS[Math.floor(_fxTick) % STREAKS.length];

  const SIZE_MULT = 1.50;
  const Y_OFFSET  = 0.50;
  const ALPHA     = 0.14 + speed01 * 0.18;

  const sw = drawW * SIZE_MULT;
  const sh = sw * 0.56;

  const dx = anchorX - sw / 2;
  const dy = anchorY - drawH * Y_OFFSET;

  const off = document.createElement('canvas');
  off.width = Math.ceil(sw);
  off.height = Math.ceil(sh);
  const octx = off.getContext('2d');

  octx.drawImage(
    _fx,
    f.x, f.y, f.w, f.h,
    0, 0, off.width, off.height
  );

  octx.globalCompositeOperation = 'destination-in';

  const grad = octx.createLinearGradient(0, 0, off.width, 0);
  grad.addColorStop(0.00, 'rgba(255,255,255,0)');
  grad.addColorStop(0.16, 'rgba(255,255,255,1)');
  grad.addColorStop(0.84, 'rgba(255,255,255,1)');
  grad.addColorStop(1.00, 'rgba(255,255,255,0)');
  octx.fillStyle = grad;
  octx.fillRect(0, 0, off.width, off.height);

  const vgrad = octx.createLinearGradient(0, 0, 0, off.height);
  vgrad.addColorStop(0.00, 'rgba(255,255,255,0)');
  vgrad.addColorStop(0.18, 'rgba(255,255,255,1)');
  vgrad.addColorStop(0.82, 'rgba(255,255,255,1)');
  vgrad.addColorStop(1.00, 'rgba(255,255,255,0)');
  octx.fillStyle = vgrad;
  octx.fillRect(0, 0, off.width, off.height);

  ctx.save();
  ctx.globalAlpha = ALPHA;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(off, dx, dy, sw, sh);
  ctx.restore();
}

function drawTireDust(ctx, anchorX, anchorY, drawW, drawH) {
  const speed01 = Math.min(1, Math.max(0, P.speed / 34));
  if (speed01 < 0.12) return;

  const rearY = anchorY + drawH * 0.05;
  const leftX = anchorX - drawW * 0.30;
  const rightX = anchorX + drawW * 0.30;

  const len = drawH * (0.35 + speed01 * 0.75);
  const spread = drawW * 0.13;
  const alpha = 0.10 + speed01 * 0.28;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const tireX of [leftX, rightX]) {
    for (let i = 0; i < 9; i++) {
      const r = (Math.random() - 0.5);
      const sx = tireX + r * spread;
      const sy = rearY + Math.random() * drawH * 0.06;
      const ex = sx + r * spread * 1.4;
      const ey = sy + len * (0.45 + Math.random() * 0.65);

      ctx.globalAlpha = alpha * (0.35 + Math.random() * 0.65);
      ctx.strokeStyle = 'rgba(190,170,125,1)';
      ctx.lineWidth = 1 + Math.random() * 2.2;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(
        sx + r * spread,
        sy + len * 0.45,
        ex,
        ey
      );
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function drawCar(steerVisual) {
  const targetIdx = STRAIGHT + steerVisual * STRAIGHT;

  _frameFloat += (targetIdx - _frameFloat) * 0.20;
  const idx = Math.max(0, Math.min(TOTAL - 1, Math.round(_frameFloat)));

  const ctx = getCtx();
  const W = getW();
  const H = getH();
  const res = getRes();

  const SCALE = 1.5;
  const drawH = (SRC_H * res * SCALE) | 0;
  const drawW = (SRC_W * res * SCALE) | 0;

  const anchorX = W / 2;
  const anchorY = (H * 0.89) | 0;

  const dx = anchorX - drawW * ANCHOR_X;
  const dy = anchorY - drawH * ANCHOR_Y;

  drawSpeedStreaks(ctx, W, H, res, anchorX, anchorY, drawW, drawH);
  drawTireDust(ctx, anchorX, anchorY, drawW, drawH);

  if (_sheet.ready) {
    const f = FRAMES_A[idx];

    ctx.save();
    ctx.globalAlpha = 0.40;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + drawH * 0.06, drawW * 0.46, drawH * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(
      _sheet,
      f.x, f.y, f.w, f.h,
      dx + (f.sx / SRC_W) * drawW,
      dy + (f.sy / SRC_H) * drawH,
      (f.w / SRC_W) * drawW,
      (f.h / SRC_H) * drawH
    );
  } else {
    ctx.fillStyle = '#1a88ff';
    ctx.fillRect(dx + drawW * 0.08, dy + drawH * 0.28, drawW * 0.84, drawH * 0.65);
  }
}

export function getCarAnchor() {
  const res = getRes();
  const SCALE = 1.5;
  const drawW = (SRC_W * res * SCALE) | 0;
  const drawH = (SRC_H * res * SCALE) | 0;

  return {
    anchorX: getW() / 2,
    anchorY: (getH() * 0.89) | 0,
    drawW,
    drawH,
  };
}