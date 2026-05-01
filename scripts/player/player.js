// ═══════════════════════════════════════════════════════
// PLAYER — Car renderer with smooth steering animation
//          + intro/outro camera offset hooks
// ═══════════════════════════════════════════════════════
import { P }                          from '../systems/roadSystem.js';
import { C }                          from '../configs/roadConfig.js';
import { getCtx, getW, getH, getRes } from '../core/canvas.js';
import { IMG }                        from '../visuals/objectRender.js';

// ── Camera animation state (set from playerAnimation.js) ──
//   camAnim.t        : 0..1       (intro animation progress, 1 = done)
//   camAnim.outroT   : 0..N seconds since race ended
//   camAnim.intro    : true while playing the intro fade-in
//   camAnim.outro    : true while playing the race-end fly-away
export const camAnim = {
  intro:false, t:1.0,
  outro:false, outroT:0,
};

export function startIntroAnim() {
  camAnim.intro  = true;
  camAnim.t      = 0;
  camAnim.outro  = false;
  camAnim.outroT = 0;
}
export function startOutroAnim() {
  camAnim.outro  = true;
  camAnim.outroT = 0;
}
export function tickCamAnim(dt) {
  if (camAnim.intro) {
    camAnim.t = Math.min(1, camAnim.t + dt / 1.6); // 1.6 sec
    if (camAnim.t >= 1) camAnim.intro = false;
  }
  if (camAnim.outro) {
    camAnim.outroT += dt;
  }
}
// Returns the visual scale for the player car (1 = normal, smaller = farther).
export function getCamCarScale() {
  let s = 1;
  if (camAnim.intro)  s = 0.55 + 0.45 * camAnim.t;          // grows in
  if (camAnim.outro)  s = Math.max(0.40, 1 - camAnim.outroT * 0.20); // shrinks out
  return s;
}
// Vertical offset for the player car (px-equiv) — gives a subtle "rise into view" feel.
export function getCamCarYOff() {
  if (camAnim.intro) return (1 - camAnim.t) * -120;
  return 0;
}
// Black overlay alpha for fade-in / fade-out.
export function getFadeAlpha() {
  if (camAnim.intro) return Math.max(0, 1 - camAnim.t * 1.4);
  return 0;
}

// ── Sprite frames (UnitsTeamB.png) ─────────────────────
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
let _frameTarget = STRAIGHT;

const _sheet = new Image();
_sheet.ready  = false;
_sheet.onload = () => { _sheet.ready = true; };
_sheet.onerror= () => console.warn('[player] UnitsTeamB.png not found');
_sheet.src    = 'assets/player/UnitsTeamB.png';

// ── Nitro streak FX (uses Effects.png Streaks frames) ─
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

function drawNitroBoost(ctx, anchorX, anchorY, drawW, drawH) {
  if (!IMG.effects?.ready || !P.nitroActive) return;

  const speed01 = Math.min(1, Math.max(0, P.speed / C.NITRO_MAX));

  _fxTick += 0.35 + speed01 * 0.55;
  const f = STREAKS[Math.floor(_fxTick) % STREAKS.length];

  const sw = drawW * 1.45;
  const sh = drawH * 1.15;

  // move effect lower so it emits from car, not above it
  const dx = anchorX - sw / 2;
  const dy = anchorY - drawH * 0.68;

  ctx.save();
  ctx.globalAlpha = 0.16 + speed01 * 0.18;
  ctx.globalCompositeOperation = "lighter";

  ctx.drawImage(
    IMG.effects,
    f.x,
    f.y,
    f.w,
    f.h,
    dx,
    dy,
    sw,
    sh
  );

  ctx.restore();
}

function drawTireDust(ctx, anchorX, anchorY, drawW, drawH) {
  if (P.nitroActive) return;
  const speed01 = Math.min(1, Math.max(0, P.speed / C.NORMAL_MAX));
  if (speed01 < 0.08) return;
  const rearY = anchorY + drawH * 0.05;
  const leftX = anchorX - drawW * 0.30;
  const rightX = anchorX + drawW * 0.30;
  const len = drawH * (0.30 + speed01 * 0.60);
  const spread = drawW * 0.10;
  const alpha = 0.08 + speed01 * 0.22;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const tireX of [leftX, rightX]) {
    for (let i = 0; i < 6; i++) {
      const r = Math.random() - 0.5;
      const sx = tireX + r * spread;
      const sy = rearY + Math.random() * drawH * 0.04;
      const ex = sx + r * spread * 1.2;
      const ey = sy + len * (0.45 + Math.random() * 0.65);
      ctx.globalAlpha = alpha * (0.45 + Math.random() * 0.55);
      ctx.strokeStyle = 'rgba(190,170,125,1)';
      ctx.lineWidth = 1 + Math.random() * 1.8;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + r * spread, sy + len * 0.45, ex, ey);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── Main car render ────────────────────────────────────
export function drawCar(steerVisual = 0) {
  // Smoother frame interpolation — slower lerp = silkier turns.
  _frameTarget = STRAIGHT + steerVisual * STRAIGHT;
  _frameFloat += (_frameTarget - _frameFloat) * 0.14;

  const idx = Math.max(0, Math.min(TOTAL - 1, Math.round(_frameFloat)));

  const ctx = getCtx();
  const W = getW();
  const H = getH();
  const res = getRes();

  const SCALE_BASE = 1.5;
  const camScale   = getCamCarScale();
  const SCALE      = SCALE_BASE * camScale;

  const drawH = (SRC_H * res * SCALE) | 0;
  const drawW = (SRC_W * res * SCALE) | 0;

  const anchorX = W / 2;
  const anchorY = ((H * 0.89) + getCamCarYOff() * res) | 0;

  const dx = anchorX - drawW * ANCHOR_X;
  const dy = anchorY - drawH * ANCHOR_Y;

  if (P.nitroActive) drawNitroBoost(ctx, anchorX, anchorY, drawW, drawH);
  else               drawTireDust(ctx, anchorX, anchorY, drawW, drawH);

  if (_sheet.ready) {
    const f = FRAMES_A[idx];

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.40;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY + drawH * 0.06,
                drawW * 0.46, drawH * 0.06, 0, 0, Math.PI * 2);
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
    ctx.fillRect(dx + drawW*0.08, dy + drawH*0.28, drawW*0.84, drawH*0.65);
  }
}

export function getCarAnchor() {
  const res = getRes();
  const SCALE = 1.5 * getCamCarScale();
  const drawW = (SRC_W * res * SCALE) | 0;
  const drawH = (SRC_H * res * SCALE) | 0;
  return {
    anchorX: getW() / 2,
    anchorY: ((getH() * 0.89) + getCamCarYOff() * res) | 0,
    drawW, drawH,
  };
}