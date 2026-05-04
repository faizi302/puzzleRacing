// ═══════════════════════════════════════════════════════
// PLAYER — Car renderer + Asphalt-9 style Nitro System
// ═══════════════════════════════════════════════════════
// Effects atlas: Charge / Boost / Streaks / Skid / Burst / Lensflare
//
// NITRO SYSTEM:
//   • Storage: 0..3 seconds, segmented bar, +1s per bottle.
//   • Pickup → plays Charge once + nitro pickup SFX.
//   • Space (edge-triggered) → activates if stored > 0:
//        - Boost burst plays once
//        - Long rear flame (Streaks + Boost stacked) drains bar
//        - Activation SFX once, looping nitro SFX while active
//   • Down arrow during active nitro → cancels burn,
//     remaining nitro stays in bar; loop SFX fades out.
//
// COLLISION-SYSTEM HOOK — three ways, all working together:
//   1. Import + call `addNitroBottle()` directly (preferred).
//   2. Call the global `window.addNitroBottle()` (zero-import).
//   3. Set `P.nitroBottlePickedUp = true` from anywhere — we
//      watch it every frame and auto-consume it.
//   Also watches `window.__pickedNitroBottle` as an alt global.
// ═══════════════════════════════════════════════════════
import { P } from '../systems/roadSystem.js';
import { C } from '../configs/roadConfig.js';
import { getCtx, getW, getH, getRes } from '../core/canvas.js';
import { IMG } from '../visuals/objectRender.js';
import { consumeNitroPress, K } from '../core/inputController.js';

// Audio — defensive: missing helpers become no-ops.
import * as Audio from '../core/audio.js';

const sfx = (name, opts) => {
  try { Audio.playSfx?.(name, opts); } catch (_) {}
};
const sfxLoopStart = (name, opts) => {
  try {
    if (Audio.playLoop)        return Audio.playLoop(name, opts);
    if (Audio.startLoop)       return Audio.startLoop(name, opts);
    if (Audio.playSfx)         return Audio.playSfx(name, { ...(opts||{}), loop: true });
  } catch (_) {}
};
const sfxLoopStop = (name) => {
  try {
    if (Audio.stopLoop)        return Audio.stopLoop(name);
    if (Audio.fadeOut)         return Audio.fadeOut(name, 0.25);
    if (Audio.stopSfx)         return Audio.stopSfx(name);
  } catch (_) {}
};

// ═══════════════════════════════════════════════════════
// CAMERA INTRO/OUTRO (untouched)
// ═══════════════════════════════════════════════════════
export const camAnim = { intro:false, t:1.0, outro:false, outroT:0 };

export function startIntroAnim() {
  camAnim.intro = true;
  camAnim.t = 0;
  camAnim.outro = false;
  camAnim.outroT = 0;
}

export function startOutroAnim() {
  camAnim.outro = true;
  camAnim.outroT = 0;
}

export function tickCamAnim(dt) {
  if (camAnim.intro) {
    camAnim.t = Math.min(1, camAnim.t + dt / 1.6);
    if (camAnim.t >= 1) camAnim.intro = false;
  }
  if (camAnim.outro) camAnim.outroT += dt;
}

export function getCamCarScale() {
  let s = 1;
  if (camAnim.intro) s = 0.55 + 0.45 * camAnim.t;
  if (camAnim.outro) s = Math.max(0.40, 1 - camAnim.outroT * 0.20);
  return s;
}

export function getCamCarYOff() {
  return camAnim.intro ? (1 - camAnim.t) * -120 : 0;
}

export function getFadeAlpha() {
  return camAnim.intro ? Math.max(0, 1 - camAnim.t * 1.4) : 0;
}

// ═══════════════════════════════════════════════════════
// CAR SPRITE FRAMES
// ═══════════════════════════════════════════════════════
const FRAMES_A = [
  { x:1,y:1,w:119,h:101,sx:17,sy:40 }, { x:1,y:104,w:117,h:101,sx:19,sy:40 },
  { x:1,y:308,w:115,h:100,sx:20,sy:40 }, { x:1,y:410,w:114,h:100,sx:21,sy:40 },
  { x:475,y:1,w:111,h:99,sx:23,sy:40 }, { x:1490,y:1,w:109,h:97,sx:24,sy:41 },
  { x:1712,y:1,w:108,h:97,sx:24,sy:41 }, { x:1042,y:1,w:110,h:96,sx:21,sy:41 },
  { x:1154,y:1,w:110,h:96,sx:19,sy:41 }, { x:701,y:1,w:112,h:95,sx:16,sy:41 },
  { x:815,y:1,w:112,h:94,sx:14,sy:41 }, { x:929,y:1,w:111,h:95,sx:12,sy:41 },
  { x:1266,y:1,w:110,h:96,sx:11,sy:41 }, { x:1378,y:1,w:110,h:96,sx:9,sy:41 },
  { x:701,y:98,w:108,h:97,sx:8,sy:41 }, { x:1601,y:1,w:109,h:97,sx:7,sy:42 },
  { x:588,y:1,w:111,h:97,sx:6,sy:42 }, { x:360,y:1,w:113,h:98,sx:5,sy:42 },
  { x:243,y:1,w:115,h:98,sx:5,sy:42 }, { x:1,y:207,w:117,h:99,sx:4,sy:42 },
  { x:122,y:1,w:119,h:99,sx:4,sy:42 },
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
_sheet.ready = false;
_sheet.onload  = () => { _sheet.ready = true; };
_sheet.onerror = () => console.warn('[player] UnitsTeamB.png not found');
_sheet.src = 'assets/player/UnitsTeamB.png';

// ═══════════════════════════════════════════════════════
// EFFECTS.JSON ATLAS — load exactly once
// ═══════════════════════════════════════════════════════
let FX_ATLAS = null;
let FX_READY = false;
let _fxLoadStarted = false;

function loadEffectsJsonOnce() {
  if (_fxLoadStarted) return;
  _fxLoadStarted = true;

  const paths = [
    'assets/player/Effects.json',
    'assets/Effects.json',
    'Effects.json',
  ];

  (async () => {
    for (const p of paths) {
      try {
        const r = await fetch(p);
        if (!r.ok) continue;
        FX_ATLAS = await r.json();
        FX_READY = true;
        return;
      } catch {}
    }
    console.warn('[player] Effects.json not found');
  })();
}
loadEffectsJsonOnce();

function fxAnim(name)   { return FX_ATLAS?.animations?.[name] || []; }
function fxFrame(id)    { return FX_ATLAS?.frames?.[id]      || null; }

function drawFxFrame(ctx, animName, frameIndex, cx, cy, size, opt = {}) {
  if (!FX_READY || !IMG.effects?.ready) return;

  const list = fxAnim(animName);
  if (!list.length) return;

  const id = list[Math.floor(frameIndex) % list.length];
  const data = fxFrame(id);
  if (!data || data.rotated) return;

  const fr  = data.frame;
  const ss  = data.spriteSourceSize;
  const src = data.sourceSize;
  const anchor = data.anchor || { x:0.5, y:0.5 };

  const scale = size / Math.max(src.w, src.h);
  const dw = fr.w * scale;
  const dh = fr.h * scale;

  const baseX = cx - src.w * scale * (opt.ax ?? anchor.x);
  const baseY = cy - src.h * scale * (opt.ay ?? anchor.y);

  const dx = baseX + ss.x * scale;
  const dy = baseY + ss.y * scale;

  ctx.save();
  ctx.globalAlpha = opt.alpha ?? 1;
  ctx.globalCompositeOperation = opt.blend || 'source-over';

  if (opt.rotation) {
    ctx.translate(cx, cy);
    ctx.rotate(opt.rotation);
    ctx.drawImage(IMG.effects, fr.x, fr.y, fr.w, fr.h, dx - cx, dy - cy, dw, dh);
  } else if (opt.flipX) {
    ctx.translate(cx, cy);
    ctx.scale(-1, 1);
    ctx.drawImage(IMG.effects, fr.x, fr.y, fr.w, fr.h, -(dx - cx) - dw, dy - cy, dw, dh);
  } else {
    ctx.drawImage(IMG.effects, fr.x, fr.y, fr.w, fr.h, dx, dy, dw, dh);
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════
// ONE-SHOT FX QUEUE
// ═══════════════════════════════════════════════════════
const oneShots = [];

function spawnFx(type, x, y, size, fps = 28, alpha = 1, blend = 'lighter') {
  oneShots.push({ type, x, y, size, fps, alpha, blend, t: 0 });
}

function updateOneShots(dt) {
  for (let i = oneShots.length - 1; i >= 0; i--) {
    const fx = oneShots[i];
    fx.t += dt;
    const total = fxAnim(fx.type).length || 1;
    if (fx.t * fx.fps >= total) oneShots.splice(i, 1);
  }
}

function drawOneShots(ctx) {
  for (const fx of oneShots) {
    drawFxFrame(ctx, fx.type, fx.t * fx.fps, fx.x, fx.y, fx.size, {
      alpha: fx.alpha,
      blend: fx.blend,
    });
  }
}

// ═══════════════════════════════════════════════════════
// NITRO STATE MACHINE
// ═══════════════════════════════════════════════════════
const NITRO_MAX_SECONDS    = 3;
const NITRO_PER_BOTTLE     = 1;
const NITRO_DRAIN_PER_SEC  = 1;
const PICKUP_FX_DURATION   = 0.70;
const ACTIVATION_GRACE     = 0.08;

function ensureNitroState() {
  if (P._nitroInit) return;
  P._nitroInit          = true;
  P.nitroMax            = NITRO_MAX_SECONDS;
  P.nitroStored         = P.nitroStored ?? 0;
  P.nitroActive         = false;
  P.nitroPickupFxTime   = 0;
  P._nitroActivationT   = 0;
  P._lastDownForCancel  = false;
  P._nitroLoopOn        = false;
  P.nitroBottlePickedUp = false; // collision systems can flip true
}

/**
 * PUBLIC — call from collision when player grabs a nitro bottle.
 * +1s, capped at 3s. Returns true if stored, false if rejected.
 */
export function addNitroBottle() {
  ensureNitroState();

  if (P.nitroStored >= P.nitroMax) return false;

  P.nitroStored = Math.min(P.nitroMax, P.nitroStored + NITRO_PER_BOTTLE);
  P.nitroPickupFxTime = PICKUP_FX_DURATION;

  sfx('nitroPickup', { volume: 0.85 });

  // Uncomment for debug:
  // console.log('[nitro] +1 → stored =', P.nitroStored.toFixed(2));

  return true;
}

// Expose globally so collision code without an import can fire it.
if (typeof window !== 'undefined') {
  window.addNitroBottle = addNitroBottle;
}

function tryActivateNitro(anchorX, anchorY, drawW, drawH) {
  ensureNitroState();
  if (P.nitroActive)        return false;
  if (P.nitroStored <= 0)   return false;

  P.nitroActive       = true;
  P._nitroActivationT = 0;

  spawnFx('Boost', anchorX, anchorY + drawH * 0.05, drawW * 1.9, 32, 0.95, 'lighter');

  sfx('nitroStart', { volume: 0.95 });
  if (!P._nitroLoopOn) {
    sfxLoopStart('nitroLoop', { volume: 0.65 });
    P._nitroLoopOn = true;
  }
  return true;
}

function stopNitro(reason = 'empty') {
  if (!P.nitroActive) return;
  P.nitroActive = false;

  if (P._nitroLoopOn) {
    sfxLoopStop('nitroLoop');
    P._nitroLoopOn = false;
  }
  if (reason === 'empty') sfx('nitroEnd', { volume: 0.55 });
}

// ═══════════════════════════════════════════════════════
// PICKUP DETECTOR — watches signals from collision system
// every frame and turns them into addNitroBottle() calls.
// This makes the nitro system work even if your collision
// code wasn't refactored to import addNitroBottle directly.
// ═══════════════════════════════════════════════════════
function watchExternalPickupSignals() {
  ensureNitroState();

  // 1) Explicit boolean flag from collision code.
  if (P.nitroBottlePickedUp) {
    P.nitroBottlePickedUp = false;
    addNitroBottle();
    return;
  }

  // 2) Alternative global flag.
  if (typeof window !== 'undefined' && window.__pickedNitroBottle) {
    window.__pickedNitroBottle = false;
    addNitroBottle();
    return;
  }
}

/**
 * PUBLIC — main per-frame nitro update. Called from drawCar.
 */
export function updateNitro(dt) {
  ensureNitroState();

  watchExternalPickupSignals();

  if (P.nitroPickupFxTime > 0) {
    P.nitroPickupFxTime = Math.max(0, P.nitroPickupFxTime - dt);
  }

  if (consumeNitroPress()) {
    const W = getW();
    const H = getH();
    const res = getRes();
    const SCALE = 1.5 * getCamCarScale();
    const drawW = (SRC_W * res * SCALE) | 0;
    const drawH = (SRC_H * res * SCALE) | 0;
    const ax = W / 2;
    const ay = ((H * 0.89) + getCamCarYOff() * res) | 0;
    tryActivateNitro(ax, ay, drawW, drawH);
  }

  if (P.nitroActive) {
    P._nitroActivationT += dt;
    P.nitroStored = Math.max(0, P.nitroStored - NITRO_DRAIN_PER_SEC * dt);

    const downNow = !!K.down;
    const downEdge = downNow && !P._lastDownForCancel;
    P._lastDownForCancel = downNow;

    if (downEdge && P._nitroActivationT > ACTIVATION_GRACE) {
      stopNitro('cancel');
    } else if (P.nitroStored <= 0) {
      stopNitro('empty');
    }
  } else {
    P._lastDownForCancel = !!K.down;
  }
}

// ═══════════════════════════════════════════════════════
// VISUAL HELPERS
// ═══════════════════════════════════════════════════════
let _fxClock = 0;

function drawRearNitroFlame(ctx, anchorX, anchorY, drawW, drawH) {
  if (!P.nitroActive || P.nitroStored <= 0) return;

  const ramp = Math.min(1, P._nitroActivationT * 6);

  const flameW = drawW * 2.20;
  const flameH = drawH * 3.10;

  const flameX = anchorX;
  const flameY = anchorY + drawH * 0.10;

  drawFxFrame(ctx, 'Streaks', _fxClock * 22, flameX, flameY + flameH * 0.50, flameH * 1.20, {
    alpha: 0.55 * ramp,
    blend: 'screen',
    ax: 0.5,
    ay: 0.05,
  });

  drawFxFrame(ctx, 'Boost', _fxClock * 38, flameX, flameY + flameH * 0.22, flameW * 1.30, {
    alpha: 1.0 * ramp,
    blend: 'lighter',
    ax: 0.5,
    ay: 0.02,
  });

  drawFxFrame(ctx, 'Boost', _fxClock * 30 + 1.2, flameX, flameY + flameH * 0.62, flameW * 1.50, {
    alpha: 0.78 * ramp,
    blend: 'lighter',
    ax: 0.5,
    ay: 0.04,
  });
}

function drawNitroPickupCharge(ctx, anchorX, anchorY, drawW, drawH) {
  if ((P.nitroPickupFxTime || 0) <= 0) return;

  const a = Math.min(1, P.nitroPickupFxTime / PICKUP_FX_DURATION);
  const totalFrames = fxAnim('Charge').length || 1;
  const phase = (1 - a) * totalFrames;

  drawFxFrame(ctx, 'Charge', phase, anchorX, anchorY - drawH * 0.10, drawW * 1.95, {
    alpha: 0.85 * a,
    blend: 'lighter',
    ax: 0.5,
    ay: 0.5,
  });
}

function drawNitroBar(ctx, W, H, res) {
  const max    = P.nitroMax || NITRO_MAX_SECONDS;
  const stored = Math.max(0, Math.min(max, P.nitroStored || 0));

  const x = W - 250 * res;
  const y = 32  * res;
  const w = 190 * res;
  const h = 18  * res;
  const gap  = 6 * res;
  const segW = (w - gap * 2) / 3;

  ctx.save();

  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x - 10 * res, y - 10 * res, w + 20 * res, h + 34 * res, 14 * res);
    ctx.fill();
  } else {
    ctx.fillRect(x - 10 * res, y - 10 * res, w + 20 * res, h + 34 * res);
  }

  ctx.fillStyle = '#fff';
  ctx.font = `700 ${13 * res}px system-ui, Arial`;
  ctx.textAlign = 'left';
  ctx.fillText('NITRO', x, y - 4 * res);

  for (let i = 0; i < 3; i++) {
    const sx = x + i * (segW + gap);

    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(sx, y, segW, h);

    const fill = Math.max(0, Math.min(1, stored - i));
    if (fill > 0) {
      ctx.fillStyle = P.nitroActive
        ? 'rgba(255,210,60,0.95)'
        : 'rgba(60,210,255,0.95)';
      ctx.fillRect(sx, y, segW * fill, h);
    }
  }

  ctx.restore();
}

function drawDriftSkid(ctx, anchorX, anchorY, drawW, drawH) {
  const power = Math.max(0, Math.min(1, P.driftSmokePower || 0));
  if (power <= 0.04) return;

  const dir = Math.sign(P.manualDriftVelocity || P.sideVelocity || P.steerVisual || 1);
  const size = drawW * 2.35;
  const y = anchorY + drawH * 0.20;

  drawFxFrame(ctx, 'Skid', _fxClock * 16, anchorX - dir * drawW * 0.20, y, size, {
    alpha: 0.45 * power,
    blend: 'multiply',
    flipX: dir < 0,
  });
}

function drawLensFlare(ctx, anchorX, anchorY, drawW, drawH) {
  if (!P.nitroActive && !(P.driftSmokePower > 0.25)) return;

  drawFxFrame(ctx, 'Lensflare', _fxClock * 6, anchorX, anchorY - drawH * 0.43, drawW * 1.2, {
    alpha: P.nitroActive ? 0.30 : 0.16,
    blend: 'lighter',
    ax: 0.5,
    ay: 0.5,
  });
}

function drawBaseDust(ctx, anchorX, anchorY, drawW, drawH) {
  if (P.nitroActive || P.driftSmokePower > 0.12) return;

  const speed01 = Math.min(1, Math.max(0, Math.abs(P.speed) / C.NORMAL_MAX));
  if (speed01 < 0.08) return;

  const rearY = anchorY + drawH * 0.07;
  const alpha = 0.08 + speed01 * 0.15;

  ctx.save();
  ctx.lineCap = 'round';

  for (const tireX of [anchorX - drawW * 0.30, anchorX + drawW * 0.30]) {
    for (let i = 0; i < 4; i++) {
      const r = Math.random() - 0.5;
      const sx = tireX + r * drawW * 0.08;
      const sy = rearY;
      const ey = sy + drawH * (0.22 + speed01 * 0.35);

      ctx.globalAlpha = alpha * Math.random();
      ctx.strokeStyle = 'rgba(190,170,125,1)';
      ctx.lineWidth = 1 + Math.random() * 1.4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(
        sx + r * drawW * 0.08,
        sy + drawH * 0.18,
        sx + r * drawW * 0.18,
        ey
      );
      ctx.stroke();
    }
  }

  ctx.restore();
}

let _lastImpact = 0;
let _lastTime = 0;

// ═══════════════════════════════════════════════════════
// MAIN CAR RENDER
// ═══════════════════════════════════════════════════════
export function drawCar(steerVisual = 0) {
  const now = performance.now() / 1000;
  let dt = _lastTime ? (now - _lastTime) : 1 / 60;
  if (!isFinite(dt) || dt < 0) dt = 1 / 60;
  if (dt > 1 / 15) dt = 1 / 15;
  _lastTime = now;

  _fxClock += dt;

  updateNitro(dt);
  updateOneShots(dt);

  const visual = Math.max(-1, Math.min(1, steerVisual || 0));
  _frameTarget = STRAIGHT + visual * STRAIGHT;
  const k = 1 - Math.pow(0.001, dt * 8);
  _frameFloat += (_frameTarget - _frameFloat) * k;

  const idx = Math.max(0, Math.min(TOTAL - 1, Math.round(_frameFloat)));

  const ctx = getCtx();
  const W   = getW();
  const H   = getH();
  const res = getRes();

  const SCALE = 1.5 * getCamCarScale();
  const drawH = (SRC_H * res * SCALE) | 0;
  const drawW = (SRC_W * res * SCALE) | 0;

  const anchorX = W / 2;
  const anchorY = ((H * 0.89) + getCamCarYOff() * res) | 0;

  if ((P.impactFlash || 0) > 0.15 && _lastImpact <= 0.15) {
    spawnFx('Burst', anchorX, anchorY - drawH * 0.28, drawW * 1.1, 34, 0.75, 'lighter');
  }
  _lastImpact = P.impactFlash || 0;

  // BEHIND CAR
  drawDriftSkid(ctx, anchorX, anchorY, drawW, drawH);
  drawNitroPickupCharge(ctx, anchorX, anchorY, drawW, drawH);
  drawRearNitroFlame(ctx, anchorX, anchorY, drawW, drawH);
  drawBaseDust(ctx, anchorX, anchorY, drawW, drawH);

  // CAR SPRITE
  const driftShift = P.isManualDrifting ? -visual * drawW * 0.045 : 0;
  const dx = anchorX - drawW * ANCHOR_X + driftShift;
  const dy = anchorY - drawH * ANCHOR_Y;

  if (_sheet.ready) {
    const f = FRAMES_A[idx];

    ctx.save();
    ctx.globalAlpha = 0.40;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(
      anchorX,
      anchorY + drawH * 0.06,
      drawW * 0.48,
      drawH * 0.06,
      0, 0, Math.PI * 2
    );
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

  // OVER CAR
  drawLensFlare(ctx, anchorX, anchorY, drawW, drawH);
  drawOneShots(ctx);

  // HUD
  drawNitroBar(ctx, W, H, res);
}

// ═══════════════════════════════════════════════════════
// PUBLIC ANCHOR / COLLISION HELPERS (unchanged contracts)
// ═══════════════════════════════════════════════════════
export function getCarAnchor() {
  const res = getRes();
  const SCALE = 1.5 * getCamCarScale();
  const drawW = (SRC_W * res * SCALE) | 0;
  const drawH = (SRC_H * res * SCALE) | 0;

  return {
    anchorX: getW() / 2,
    anchorY: ((getH() * 0.89) + getCamCarYOff() * res) | 0,
    drawW,
    drawH,
  };
}

export function getPlayerCollisionInfo() {
  const car = getCarAnchor();

  return {
    x: P.playerX || 0,
    z: P.pos + (P.playerZ || 0),

    screenX: car.anchorX,
    screenY: car.anchorY,
    screenW: car.drawW,
    screenH: car.drawH,

    halfW: C.SIDE_BODY_HALF_WIDTH || 0.18,
    halfZ: 90,
  };
}

export function forceStopNitro() { stopNitro('forced'); }