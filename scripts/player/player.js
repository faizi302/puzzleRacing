// ═══════════════════════════════════════════════════════
// PLAYER — JSON car renderer + Asphalt-LEGENDS Nitro System
// ═══════════════════════════════════════════════════════

import { P } from '../systems/roadSystem.js';
import { C } from '../configs/roadConfig.js';
import { getCtx, getW, getH, getRes } from '../core/canvas.js';
import { IMG } from '../visuals/objectRender.js';
import { consumeNitroPress, K } from '../core/inputController.js';

import {
  loadPlayerCarSprites,
  getSelectedPlayerSprite,
} from '../visuals/playerCarSprites.js';

import * as Audio from '../core/audio.js';

const sfx = (name, opts) => {
  try { Audio.playSfx?.(name, opts); } catch (_) { }
};

const NITRO_LOOP_KEY = 'nitroLoop';

function nitroLoopStart(volume = 0.85) {
  try {
    Audio.playSfx?.('nitro', { loop: true, key: NITRO_LOOP_KEY, volume });
  } catch (_) { }
}

function nitroLoopStop() {
  try {
    Audio.playSfx?.('nitro', { stop: true, key: NITRO_LOOP_KEY });
  } catch (_) { }
}

// ═══════════════════════════════════════════════════════
// LOAD PLAYER JSON SPRITES
// ═══════════════════════════════════════════════════════
let _playerSpritesStarted = false;

export function ensurePlayerSpritesLoaded() {
  if (_playerSpritesStarted) return;
  _playerSpritesStarted = true;
  loadPlayerCarSprites();
}

ensurePlayerSpritesLoaded();

// ═══════════════════════════════════════════════════════
// CAMERA INTRO/OUTRO
// ═══════════════════════════════════════════════════════
export const camAnim = { intro: false, t: 1.0, outro: false, outroT: 0 };

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
  return 1;
}

export function getCamCarYOff() {
  return 0;
}

export function getFadeAlpha() {
  return camAnim.intro ? Math.max(0, 1 - camAnim.t * 1.4) : 0;
}

// ═══════════════════════════════════════════════════════
// JSON CAR FRAME STATE
// ═══════════════════════════════════════════════════════
let _frameFloat = 9;
let _frameTarget = 9;

function getPlayerSpriteSafe() {
  ensurePlayerSpritesLoaded();
  return getSelectedPlayerSprite();
}

function getBaseCarSize() {
  const sprite = getPlayerSpriteSafe();
  return {
    srcW: sprite?.srcW || 140,
    srcH: sprite?.srcH || 173,
  };
}

function getStraightIndex(sprite) {
  if (!sprite?.frames?.length) return 9;
  return sprite.straightIndex ?? Math.floor(sprite.frames.length / 2);
}

// ═══════════════════════════════════════════════════════
// EFFECTS.JSON ATLAS
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
      } catch { }
    }
    console.warn('[player] Effects.json not found');
  })();
}
loadEffectsJsonOnce();

function fxAnim(name) { return FX_ATLAS?.animations?.[name] || []; }
function fxFrame(id) { return FX_ATLAS?.frames?.[id] || null; }

function drawFxFrame(ctx, animName, frameIndex, cx, cy, size, opt = {}) {
  if (!FX_READY || !IMG.effects?.ready) return;

  const list = fxAnim(animName);
  if (!list.length) return;

  const id = list[Math.floor(frameIndex) % list.length];
  const data = fxFrame(id);
  if (!data || data.rotated) return;

  const fr = data.frame;
  const ss = data.spriteSourceSize;
  const src = data.sourceSize;
  const anchor = data.anchor || { x: 0.5, y: 0.5 };

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
const NITRO_MAX_PERCENT     = 100;
const NITRO_PER_BOTTLE      = 25;
const NITRO_FULL_BURN_TIME  = 5.0;
const NITRO_DRAIN_PER_SEC   = NITRO_MAX_PERCENT / NITRO_FULL_BURN_TIME;
const NITRO_SPEED_BONUS     = 30;
const PICKUP_FX_DURATION    = 0.70;
const ACTIVATION_GRACE      = 0.08;

function ensureNitroState() {
  if (P._nitroInit) return;

  P._nitroInit         = true;
  P.nitroMax           = NITRO_MAX_PERCENT;
  P.nitroStored        = P.nitroStored ?? 0;
  P.nitroActive        = false;
  P.nitroPickupFxTime  = 0;

  P._nitroActivationT  = 0;
  P._nitroLoopOn       = false;
  P._lastDownForCancel = false;

  P._nitroTargetSpeed  = 0;
  P.nitroBottlePickedUp = false;
}

export function addNitroBottle() {
  ensureNitroState();

  if (P.nitroStored >= P.nitroMax) return false;

  P.nitroStored = Math.min(P.nitroMax, P.nitroStored + NITRO_PER_BOTTLE);
  P.nitroPickupFxTime = PICKUP_FX_DURATION;
  return true;
}

if (typeof window !== 'undefined') {
  window.addNitroBottle = addNitroBottle;
}

function tryActivateNitro(anchorX, anchorY, drawW, drawH) {
  ensureNitroState();

  if (P.nitroActive) return false;
  if ((P.nitroStored || 0) <= 0) return false;

  P.nitroActive       = true;
  P._nitroActivationT = 0;

  const normalMax = C.NORMAL_MAX || 100;
  const nitroMax  = C.NITRO_MAX  || normalMax + NITRO_SPEED_BONUS;

  P._nitroTargetSpeed = P._nitroTargetSpeed = nitroMax;

  P.speed = Math.max(P.speed || 0, P._nitroTargetSpeed);

  spawnFx('Boost', anchorX, anchorY + drawH * 0.05, drawW * 1.9, 32, 0.95, 'lighter');

  if (!P._nitroLoopOn) {
    nitroLoopStart(0.85);
    P._nitroLoopOn = true;
  }

  return true;
}

function stopNitro() {
  if (!P.nitroActive) {
    if (P._nitroLoopOn) {
      nitroLoopStop();
      P._nitroLoopOn = false;
    }
    return;
  }

  P.nitroActive       = false;
  P._nitroTargetSpeed = 0;

  if (P._nitroLoopOn) {
    nitroLoopStop();
    P._nitroLoopOn = false;
  }
}

function watchExternalPickupSignals() {
  ensureNitroState();

  if (P.nitroBottlePickedUp) {
    P.nitroBottlePickedUp = false;
    addNitroBottle();
    return;
  }

  if (typeof window !== 'undefined' && window.__pickedNitroBottle) {
    window.__pickedNitroBottle = false;
    addNitroBottle();
  }
}

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
    const { srcW, srcH } = getBaseCarSize();

    const SCALE = 1.5 * getCamCarScale();
    const drawW = (srcW * res * SCALE) | 0;
    const drawH = (srcH * res * SCALE) | 0;

    const ax = W / 2;
    const ay = ((H * 0.89) + getCamCarYOff() * res) | 0;

    tryActivateNitro(ax, ay, drawW, drawH);
  }

  if (P.nitroActive) {
    P._nitroActivationT += dt;

    P.nitroStored = Math.max(0, P.nitroStored - NITRO_DRAIN_PER_SEC * dt);

    if (P._nitroTargetSpeed > 0) {
      P.speed = Math.max(P.speed || 0, P._nitroTargetSpeed);
    }

    const downNow  = !!K.down;
    const downEdge = downNow && !P._lastDownForCancel;
    P._lastDownForCancel = downNow;

    if (downEdge && P._nitroActivationT > ACTIVATION_GRACE) {
      stopNitro();
    } else if (P.nitroStored <= 0) {
      P.nitroStored = 0;
      stopNitro();
    }
  } else {
    P._lastDownForCancel = !!K.down;

    if (P._nitroLoopOn) {
      nitroLoopStop();
      P._nitroLoopOn = false;
    }
  }
}

// ═══════════════════════════════════════════════════════
// JUMP PHYSICS
// ═══════════════════════════════════════════════════════
export function launchPlayerJump(jumpObj, jumpSpr = {}) {
  if (P.isAirborne) return false;

  const normalMax = C.NORMAL_MAX || 100;
  const nitroMax  = C.NITRO_MAX  || normalMax * 1.5;

  const speed01 = Math.max(0, Math.min(1, Math.abs(P.speed) / normalMax));
  const minSpeedFrac = C.JUMP_MIN_SPEED_FRAC ?? 0.15;

  if (speed01 < minSpeedFrac) return false;

  const lift     = jumpSpr.liftFactor   ?? jumpObj.liftFactor   ?? 1;
  const baseVy   = jumpSpr.jumpBaseVy   ?? jumpObj.jumpBaseVy   ?? C.JUMP_BASE_VY  ?? 900;
  const speedVy  = jumpSpr.jumpSpeedVy  ?? jumpObj.jumpSpeedVy  ?? C.JUMP_SPEED_VY ?? 350;
  const speedKickKmh = jumpSpr.speedKickKmh ?? jumpObj.speedKickKmh ?? 30;
  const forwardKick  = jumpSpr.forwardKick  ?? jumpObj.forwardKick  ?? 1.08;

  P.isAirborne   = true;
  P.airY         = 0;
  P.airVy        = (baseVy + speed01 * speedVy) * lift;
  P.jumpPitch    = 0;
  P._jumpCooldown = 0.45;

  P.speed = Math.min(
    nitroMax,
    Math.max(P.speed * forwardKick, P.speed + speedKickKmh)
  );

  return true;
}

export function updateJumpPhysics(dt) {
  if (P._jumpCooldown > 0) {
    P._jumpCooldown = Math.max(0, P._jumpCooldown - dt);
  }

  if (!P.isAirborne) return;

  P.airY  += P.airVy * dt;
  P.airVy -= C.JUMP_GRAVITY * dt;

  P.speed *= Math.max(0.96, 1 - C.JUMP_AIR_DRAG * dt);

  if (P.airY <= 0 && P.airVy < 0) {
    P.airY = 0;
    P.airVy = 0;
    P.isAirborne = false;
    P.jumpPitch = 0;
  }
}

// ═══════════════════════════════════════════════════════
// VISUAL HELPERS
// ═══════════════════════════════════════════════════════
let _fxClock = 0;

function drawRearNitroFlame(ctx, anchorX, anchorY, drawW, drawH) {
  if (!P.nitroActive || P.nitroStored <= 0) return;

  // Smooth ramp-in when nitro first activates (same as before)
  const ramp = Math.min(1, P._nitroActivationT * 7);

  // Subtle size pulse so the flame "breathes"
  const pulse = 0.92 + Math.sin(_fxClock * 40) * 0.08;

  // Anchor at the rear/exhaust point of the car (same as before)
  const baseX = anchorX;
  const baseY = anchorY + drawH * 0.16;

  // ── Stack of boost-sprite puffs behind the car ──
  // Each puff is a separate boost animation, staggered in time so they
  // overlap into a continuous streaming flame jet (instead of one
  // synchronized pulse).
  //
  //   dy   — distance behind the car (multiplied by drawH)
  //   size — width/height of this puff (multiplied by drawW)
  //   a    — opacity multiplier for this puff
  //   off  — phase shift into the 16-frame loop (in frames)
  const puffs = [
    { dy: 0.10, size: 1.10, a: 1.00, off: 0  },
    { dy: 0.55, size: 1.30, a: 0.95, off: 4  },
    { dy: 1.10, size: 1.45, a: 0.85, off: 8  },
    { dy: 1.70, size: 1.40, a: 0.65, off: 12 },
    { dy: 2.30, size: 1.25, a: 0.45, off: 14 },
  ];

  // Boost animation plays back at ~26 fps and loops continuously.
  // FX_ATLAS.animations.Boost has 16 frames.
  const fps       = 26;
  const totalFr   = 16;
  const baseFrame = _fxClock * fps;

  for (const p of puffs) {
    const cx   = baseX;
    const cy   = baseY + drawH * p.dy * pulse;
    const size = drawW * p.size * pulse;

    // Each puff loops independently; the offset is what makes the
    // stream look continuous instead of a single synchronized burst.
    const frame = (baseFrame + p.off) % totalFr;

    drawFxFrame(ctx, 'Boost', frame, cx, cy, size, {
      alpha: ramp * p.a,
      blend: 'lighter',
    });
  }
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

function drawDriftTyreLines(ctx, anchorX, anchorY, drawW, drawH) {
  if (!P.driftLines?.length) return;

  ctx.save();
  ctx.lineCap = 'round';

  for (const mark of P.driftLines) {
    const ageAlpha = Math.max(0, Math.min(1, mark.life || 0));
    const dz = P.pos - mark.z;

    // only draw recent marks behind car
    if (dz < -100 || dz > 2600) continue;

    const t = Math.max(0, Math.min(1, dz / 2600));

    const y = anchorY + drawH * 0.26 + t * drawH * 2.2;
    const x = anchorX + (mark.x - P.playerX) * getW() * 0.42 * (1 - t * 0.45);

    const w = drawW * (0.12 + t * 0.10);
    const gap = drawW * 0.27;

    ctx.globalAlpha = 0.45 * ageAlpha * (1 - t * 0.35);

    // black road = black tyre marks
    // soil/offroad = brown/dusty tyre marks
    ctx.strokeStyle = mark.off
      ? 'rgba(130, 92, 45, 1)'
      : 'rgba(20, 20, 20, 1)';

    ctx.lineWidth = Math.max(2, 5 * getRes() * (1 - t * 0.35));

    ctx.beginPath();
    ctx.moveTo(x - gap, y);
    ctx.lineTo(x - gap - w, y + drawH * 0.16);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + gap, y);
    ctx.lineTo(x + gap + w, y + drawH * 0.16);
    ctx.stroke();
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
  updateJumpPhysics(dt);

  const ctx = getCtx();
  const W = getW();
  const H = getH();
  const res = getRes();

  const sprite = getPlayerSpriteSafe();
  const frames = sprite?.frames || [];
  const straight = getStraightIndex(sprite);
  const total = frames.length || 21;

  const visual = Math.max(-1, Math.min(1, steerVisual || 0));
  _frameTarget = straight + visual * straight;

  const k = 1 - Math.pow(0.001, dt * 8);
  _frameFloat += (_frameTarget - _frameFloat) * k;

  const idx = Math.max(0, Math.min(total - 1, Math.round(_frameFloat)));
  const f = frames[idx];

  const srcW = sprite?.srcW || 140;
  const srcH = sprite?.srcH || 173;

  const SCALE = 1.5 * getCamCarScale();
  const drawH = (srcH * res * SCALE) | 0;
  const drawW = (srcW * res * SCALE) | 0;

  const roadOffsetX = (P.playerX - P.cameraX) * W * 0.42;
  const anchorX = W / 2 + roadOffsetX;


const airOffset = (P.airY || 0) * (C.JUMP_VISUAL_SCALE || 1) * res;
const camJumpOffset = (P.cameraAirY || 0) * (C.JUMP_CAMERA_VISUAL_SCALE ?? 0.35) * res;

const anchorY =
  (((H * 0.89) + getCamCarYOff() * res) - airOffset + camJumpOffset) | 0;

  if ((P.impactFlash || 0) > 0.15 && _lastImpact <= 0.15) {
    spawnFx('Burst', anchorX, anchorY - drawH * 0.28, drawW * 1.1, 34, 0.75, 'lighter');
  }
  _lastImpact = P.impactFlash || 0;

  // BEHIND CAR
  drawDriftSkid(ctx, anchorX, anchorY, drawW, drawH);
  drawNitroPickupCharge(ctx, anchorX, anchorY, drawW, drawH);
  drawRearNitroFlame(ctx, anchorX, anchorY, drawW, drawH);
  drawBaseDust(ctx, anchorX, anchorY, drawW, drawH);

  const anchorFrameX = f?.anchorX ?? sprite?.anchorX ?? 0.5;
  const anchorFrameY = f?.anchorY ?? sprite?.anchorY ?? 0.65;

  const driftShift = P.isManualDrifting ? -visual * drawW * 0.045 : 0;
  const dx = anchorX - drawW * anchorFrameX + driftShift;
  const dy = anchorY - drawH * anchorFrameY;

 

  if (sprite?.img?.ready && f) {
    ctx.drawImage(
      sprite.img,
      f.x,
      f.y,
      f.w,
      f.h,
      dx + (f.sx / srcW) * drawW,
      dy + (f.sy / srcH) * drawH,
      (f.w / srcW) * drawW,
      (f.h / srcH) * drawH
    );
  } else {
    ctx.fillStyle = '#1a88ff';
    ctx.fillRect(
      dx + drawW * 0.08,
      dy + drawH * 0.28,
      drawW * 0.84,
      drawH * 0.65
    );
  }

  // OVER CAR
  drawLensFlare(ctx, anchorX, anchorY, drawW, drawH);
  drawOneShots(ctx);
}

// ═══════════════════════════════════════════════════════
// PUBLIC ANCHOR / COLLISION HELPERS
// ═══════════════════════════════════════════════════════
export function getCarAnchor() {
  const res = getRes();
  const { srcW, srcH } = getBaseCarSize();

  const SCALE = 1.5 * getCamCarScale();
  const drawW = (srcW * res * SCALE) | 0;
  const drawH = (srcH * res * SCALE) | 0;

  const W = getW();
  const H = getH();

  const roadOffsetX = (P.playerX - P.cameraX) * W * 0.42;
  const airOffset = (P.airY || 0) * (C.JUMP_VISUAL_SCALE || 1) * res;

  return {
    anchorX: W / 2 + roadOffsetX,
    anchorY: (((H * 0.89) + getCamCarYOff() * res) - airOffset) | 0,
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

export function forceStopNitro() {
  stopNitro();
}

// ═══════════════════════════════════════════════════════
// FULLSCREEN NITRO SPEED-LINE OVERLAY
// Called by render.js once per frame, AFTER the world has
// been drawn but BEFORE the HUD / fade overlay.
// ═══════════════════════════════════════════════════════
let _nitroStreakAlpha = 0;   // fades in/out so it doesn't pop

export function drawNitroSpeedLines(ctx, W, H) {
  // Target visibility: visible while nitro is active, hidden otherwise
  const target = (P.nitroActive && P.nitroStored > 0) ? 1 : 0;

  // Smooth fade in (~150 ms) / fade out (~250 ms)
  const fadeSpeed = target > _nitroStreakAlpha ? 7 : 4;
  // We don't have dt here, so approximate using _fxClock delta.
  // _fxClock is incremented every frame in updateNitro() via dt,
  // so the difference between calls is one frame.
  // For a stable 60fps that's ~0.016s; we just clamp the step.
  const step = 1 / 60 * fadeSpeed;
  if (_nitroStreakAlpha < target)      _nitroStreakAlpha = Math.min(target, _nitroStreakAlpha + step);
  else if (_nitroStreakAlpha > target) _nitroStreakAlpha = Math.max(target, _nitroStreakAlpha - step);

  if (_nitroStreakAlpha <= 0.001) return;
  if (!FX_READY || !IMG.effects?.ready) return;

  // The Streaks sprite is 480x270 (16:9). We want it to cover the
  // ENTIRE screen and overflow a bit on every side so the radial
  // streaks reach all the way to the edges.
  // Pick whichever scale makes the sprite cover the screen, then
  // multiply by an overscan factor so edges are guaranteed covered.
  const SPRITE_W = 480;
  const SPRITE_H = 270;
  const overscan = 1.15;
  const scale = Math.max(W / SPRITE_W, H / SPRITE_H) * overscan;

  const dispW = SPRITE_W * scale;
  const dispH = SPRITE_H * scale;

  // Anchor point on screen — the player car is around 78% down
  // the canvas, horizontally centered. The Streaks center will sit
  // exactly there, so the lines look like they radiate from the car.
  const cx = W * 0.5;
  const cy = H * 0.78;

  // ── Subtle pulse so streaks "breathe" while boosting ──
  const pulse = 0.97 + Math.sin(_fxClock * 18) * 0.03;
  const drawW = dispW * pulse;
  const drawH = dispH * pulse;

  // Animation: 10 frames at ~24 fps, looping
  const FPS = 24;
  const TOTAL = 10;
  const frame = (_fxClock * FPS) % TOTAL;

  // Use drawFxFrame's `size` arg only handles square sizing, so for
  // the wide 16:9 sprite we draw it directly to control aspect ratio.
  const list = FX_ATLAS?.animations?.Streaks || [];
  if (!list.length) return;
  const id = list[Math.floor(frame) % list.length];
  const data = FX_ATLAS.frames[id];
  if (!data) return;

  const fr = data.frame;
  const ss = data.spriteSourceSize;
  const src = data.sourceSize;

  // Match the math used by drawFxFrame so trimmed sprites still align
  const sx = drawW / src.w;
  const sy = drawH / src.h;
  const baseX = cx - drawW * 0.5;
  const baseY = cy - drawH * 0.5;
  const dx = baseX + ss.x * sx;
  const dy = baseY + ss.y * sy;
  const dw = fr.w * sx;
  const dh = fr.h * sy;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.55 * _nitroStreakAlpha;   // overall intensity
  ctx.drawImage(IMG.effects, fr.x, fr.y, fr.w, fr.h, dx, dy, dw, dh);
  ctx.restore();
}