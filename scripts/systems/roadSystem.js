'use strict';
// ═══════════════════════════════════════════════════════
// ROAD SYSTEM — Physics, Player State, Lap Logic, Nitro,
//               KEY-PUZZLE / TWO-TRACK FORK BRANCHING
//               + PRO RACING COLLISION REACTIONS
// ─────────────────────────────────────────────────────
// CHANGES vs previous build:
//   • roadCurve lerp factor 0.12 → 0.22 for tighter, stutter-free
//     curve following. The old value caused the background horizon
//     and centrifugal force to lag visibly behind the actual road
//     curve, producing a "lurch" at curve entry/exit.
//   • Fork-approach notification: player is warned "TAKE RIGHT FORK!"
//     when they have all keys and are within FORK_WARN_Z of the
//     finish line (which is also the fork junction).
//   • Road1 win guard: raceFinished never fires unless P.onRoad2.
// ═══════════════════════════════════════════════════════
import { C, START_PRE_FINISH } from '../configs/roadConfig.js';
import {
  findSeg, trackLen,
  switchToTrack,
} from '../core/roadMap.js';

// Distance from the finish line at which the "take right fork"
// warning fires (world units). Roughly 4 seconds at normal speed.
const FORK_WARN_Z = C.NORMAL_MAX * 4.0;

export const P = {
  pos          : 0,
  speed        : 0,
  playerX      : 0,
  lapTime      : 0,
  lapTimes     : [],
  lapCount     : 0,
  raceTime     : 0,
  raceFinished : false,
  isOffTrack   : false,
  isBraking    : false,
  roadCurve    : 0,
  playerZ      : 0,

  nitroTime    : 0,
  nitroActive  : false,

  _firstCrossing    : true,
  _prevPos          : 0,
  _forkWarnFired    : false,   // ← new: prevents double-firing the fork warn

  endPhase : 0,
  endTime  : 0,

  keysCollected    : 0,
  onRoad2          : false,
  _needsTrackSwitch: false,

  // ── Collision reaction state ────────────────────────
  hitCooldown    : 0,
  damage         : 0,
  cameraShake    : 0,
  cameraShakeTime: 0,
  bumpVX         : 0,
  impactFlash    : 0,
};

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function resetPhys() {
  P.pos        = Math.max(0, (trackLen || 0) - START_PRE_FINISH);
  P.speed      = 0;
  P.playerX    = 0;
  P.lapTime    = 0;
  P.lapTimes   = [];
  P.lapCount   = 0;
  P.raceTime   = 0;
  P.raceFinished = false;
  P.isOffTrack   = false;
  P.isBraking    = false;
  P.roadCurve    = 0;
  P.playerZ      = C.CAM_H / C.CAM_DEPTH;

  P.nitroTime  = 0;
  P.nitroActive = false;

  P._firstCrossing  = true;
  P._prevPos        = P.pos;
  P._forkWarnFired  = false;

  P.endPhase = 0;
  P.endTime  = 0;

  P.keysCollected     = 0;
  P.onRoad2           = false;
  P._needsTrackSwitch = false;

  P.hitCooldown     = 0;
  P.damage          = 0;
  P.cameraShake     = 0;
  P.cameraShakeTime = 0;
  P.bumpVX          = 0;
  P.impactFlash     = 0;
}

export function activateNitro(durationSec = 2.0) {
  P.nitroTime  = Math.max(P.nitroTime, durationSec);
  P.nitroActive = true;
}

export function cancelNitro() {
  P.nitroTime   = 0;
  P.nitroActive = false;
}

export function addCameraShake(amount = 0.3, time = 0.18) {
  P.cameraShake     = Math.max(P.cameraShake, amount);
  P.cameraShakeTime = Math.max(P.cameraShakeTime, time);
  P.impactFlash     = Math.max(P.impactFlash, amount * 0.8);
}

/**
 * Professional racing impact.
 * type: 'soft' | 'medium' | 'hard' | 'wall' | 'traffic' | 'deadly'
 * dir: -1 pushes left, +1 right, 0 speed loss only
 */
export function applyCollisionImpact(type = 'medium', dir = 0) {
  if (P.hitCooldown > 0 && type !== 'soft') return false;

  const speed01 = clamp(P.speed / C.NITRO_MAX, 0.15, 1.0);
  const table = {
    soft    : { keep: 0.88, push: 0.025, dmg:  0, shake: 0.08, cd: 0.10, nitro:false, min: 0 },
    medium  : { keep: 0.62, push: 0.090, dmg:  8, shake: 0.25, cd: 0.35, nitro:false, min: 350 },
    hard    : { keep: 0.38, push: 0.150, dmg: 18, shake: 0.45, cd: 0.50, nitro:true,  min: 250 },
    wall    : { keep: 0.28, push: 0.220, dmg: 25, shake: 0.60, cd: 0.65, nitro:true,  min: 120 },
    traffic : { keep: 0.45, push: 0.170, dmg: 20, shake: 0.50, cd: 0.55, nitro:true,  min: 200 },
    deadly  : { keep: 0.06, push: 0.260, dmg: 45, shake: 0.85, cd: 0.90, nitro:true,  min: 0 },
  };

  const r = table[type] || table.medium;
  P.speed    = Math.max(r.min, P.speed * (r.keep - speed01 * 0.08));
  P.playerX += dir * r.push;
  P.bumpVX  += dir * r.push * 5.0;
  P.damage   = clamp(P.damage + r.dmg * speed01, 0, 100);
  P.hitCooldown = r.cd;
  if (r.nitro) cancelNitro();
  addCameraShake(r.shake * speed01, 0.16 + r.shake * 0.20);
  return true;
}

// Kept for older callsites.
export function applyBounce(kind = 'scenery', dir = 0) {
  if (kind === 'wall')   return applyCollisionImpact('wall', dir);
  if (kind === 'bumper') return applyCollisionImpact('medium', dir);
  return applyCollisionImpact('hard', dir);
}

// Blended look-ahead curve: prevents sudden centrifugal lurches on
// sharp curve entry. Uses three sample points at different depths.
function getLookAheadCurve(z) {
  const c0 = findSeg(z)?.curve || 0;
  const c1 = findSeg(z + C.SEG_LEN * 12)?.curve || 0;
  const c2 = findSeg(z + C.SEG_LEN * 28)?.curve || 0;
  return c0 * 0.55 + c1 * 0.30 + c2 * 0.15;
}

function tickCollisionState(d) {
  P.hitCooldown = Math.max(0, P.hitCooldown - d);
  P.impactFlash = Math.max(0, P.impactFlash - d * 3.5);

  if (P.cameraShakeTime > 0) {
    P.cameraShakeTime = Math.max(0, P.cameraShakeTime - d);
    if (P.cameraShakeTime <= 0) P.cameraShake = 0;
  }

  if (Math.abs(P.bumpVX) > 0.0001) {
    P.playerX += P.bumpVX * d;
    P.bumpVX  *= Math.pow(0.05, d); // fast frame-rate-independent damping
  } else {
    P.bumpVX = 0;
  }
}

// ── Fork-approach warning ──────────────────────────────
// When the player has all keys on Road1 and is close to the
// finish line (= fork junction), fire a one-time notification
// so they know to "take the right fork".
// This function is called from updatePhys every tick.
let _forkWarnCb = null;
export function setForkWarnCallback(cb) { _forkWarnCb = cb; }

function checkForkWarn(len) {
  if (P.onRoad2 || P._firstCrossing || P._forkWarnFired) return;
  if (P.keysCollected < C.KEYS_REQUIRED) return;

  // How far from the finish line is the player?
  const distToFinish = len - P.pos;
  if (distToFinish < FORK_WARN_Z && distToFinish > 0) {
    P._forkWarnFired = true;
    if (_forkWarnCb) _forkWarnCb();
  }
}

export function updatePhys(inp, dt, len) {
  const d = Math.min(dt, 0.05);
  tickCollisionState(d);

  if (P.endPhase >= 1) {
    P.endTime += d;
    P.speed   *= 0.992;
    if (P.speed < 200) P.speed = 200;
    if (P.endTime > 4.0) P.speed *= 0.94;
    if (P.speed < 30)    P.speed = 0;
    P.pos += P.speed * d;
    if (len > 0 && P.pos >= len) P.pos -= len;
    return;
  }

  // ── Nitro timer ──────────────────────────────────────
  if (P.nitroTime > 0) {
    P.nitroTime  -= d;
    P.nitroActive = true;
    if (P.nitroTime <= 0) { P.nitroTime = 0; P.nitroActive = false; }
  } else {
    P.nitroActive = false;
  }

  const speedCap = P.nitroActive ? C.NITRO_MAX : C.NORMAL_MAX;

 P.isBraking = false;

const reverseMax   = -(C.REVERSE_MAX || C.NORMAL_MAX * 0.35);
const reverseAccel = C.REVERSE_ACCEL || C.ACCEL * 0.55;
const brakePower   = Math.abs(C.BRAKE || C.ACCEL * 1.4);

function moveToward(v, target, step) {
  if (v < target) return Math.min(target, v + step);
  if (v > target) return Math.max(target, v - step);
  return target;
}

// ArrowUp = forward
if (inp.up) {
  P.speed += C.ACCEL * d * (P.nitroActive ? 1.35 : 1.0);
}

// ArrowDown = reverse / move backward
else if (inp.down) {
  P.speed -= reverseAccel * d;
}

// Space = brake
else if (inp.hand) {
  P.isBraking = true;
  P.speed = moveToward(P.speed, 0, brakePower * d);
}

// No input = friction
else {
  P.speed = moveToward(P.speed, 0, Math.abs(C.DECEL) * d);
}

P.speed = clamp(P.speed, reverseMax, speedCap);

  const speedFrac = P.speed / C.NORMAL_MAX;

  // ── Curve / centrifugal force ─────────────────────────
  const z        = P.pos + P.playerZ;
  const curveNow = getLookAheadCurve(z);

  // Lerp factor 0.22 (was 0.12): tighter follow reduces the
  // "lurch" stutter at curve entry/exit. Still smooth, not snappy.
  P.roadCurve += (curveNow - P.roadCurve) * 0.22;

  const CENTRIFUGAL_STRENGTH = 1.85;
  const curvePush = P.roadCurve * Math.min(speedFrac, 1) * CENTRIFUGAL_STRENGTH * d;
  P.playerX -= curvePush;

  // ── Steering ──────────────────────────────────────────
const speedAbsFrac = Math.min(1, Math.abs(P.speed) / C.NORMAL_MAX);
const effSteer = Math.max(speedAbsFrac, C.STEER_MIN_FAC);
const steerDx = d * C.STEER_SPD * effSteer;

if (inp.left)  P.playerX -= steerDx;
if (inp.right) P.playerX += steerDx;

  // ── Road edge: soft scrape → hard wall ───────────────
  const hitL = P.playerX < -1;
  const hitR = P.playerX >  1;
  P.isOffTrack = hitL || hitR;

  if (P.isOffTrack) {
    const dirBack = hitL ? 1 : -1;
    const outside = Math.abs(P.playerX) - 1;

    P.playerX += dirBack * (0.020 + outside * 0.018);
    if (P.speed > C.OFFRD_LIM) P.speed += C.OFFRD_DC * d * (0.28 + outside * 0.5);

    if (Math.abs(P.playerX) > 1.12 && P.hitCooldown <= 0) {
      applyCollisionImpact('wall', dirBack);
    }
  }
  P.playerX = clamp(P.playerX, -1.18, 1.18);

  // ── Position advance ──────────────────────────────────
P._prevPos = P.pos;
P.pos += P.speed * d;

if (len > 0) {
  while (P.pos < 0) P.pos += len;
  while (P.pos >= len) P.pos -= len;
}
  P.lapTime  += d;
  P.raceTime += d;

  // ── Fork-approach warning ─────────────────────────────
  checkForkWarn(len);

  // ── Finish-line crossing ──────────────────────────────
  if (len > 0 && P.pos >= len) {
    P.pos -= len;
    P._forkWarnFired = false; // reset for next lap

    if (P._firstCrossing) {
      // First crossing after race start: just zero the lap timer.
      P._firstCrossing = false;
      P.lapTime        = 0;
    } else {
      P.lapCount++;
      P.lapTimes.push(P.lapTime);
      P.lapTime = 0;

      if (P.onRoad2) {
        // ── WIN: completed one full lap on Road2 ─────────
        P.raceFinished = true;
        P.endPhase     = 1;
        P.endTime      = 0;

      } else if (P.keysCollected >= C.KEYS_REQUIRED) {
        // ── FORK UNLOCK: switch to the RIGHT fork (Road2) ─
        // Player keeps their current speed for a smooth transition.
        P.onRoad2 = true;
        switchToTrack(2);
        // Place player just past Road2's finish-line zone so they
        // don't immediately trigger another crossing.
        P.pos              = C.SEG_LEN * (C.RUMBLE * 2 + 2);
        P._needsTrackSwitch = true;
        // Reset first-crossing guard so Road2 needs a FULL lap.
        P._firstCrossing   = true;

      }
      // If on Road1 without enough keys: lap increments, keep racing.
      // No win condition on Road1 — player loops forever until they
      // collect all keys.
    }
  }
}

export const kmh  = () => Math.round(Math.min(P.speed, C.NITRO_MAX) / C.KMH_TO_WORLD);
export const best = () => P.lapTimes.length ? Math.min(...P.lapTimes) : null;