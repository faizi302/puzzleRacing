'use strict';
// ═══════════════════════════════════════════════════════
// ROAD SYSTEM — Ready Player One style reverse puzzle
// Forward road is fake. Secret road opens by reversing.
// ═══════════════════════════════════════════════════════
import { C, START_PRE_FINISH } from '../configs/roadConfig.js';
import {
  findSeg, trackLen, switchToTrack,
} from '../core/roadMap.js';

import { setEngineSpeed, setBrakeLoop, playSfx } from '../core/audio.js';

export const P = {
  pos: 0,
  speed: 0,
  playerX: 0,
  cameraX: 0,
  cameraCurve: 0,
  lapTime: 0,
  lapTimes: [],
  lapCount: 0,
  raceTime: 0,
  raceFinished: false,
  isOffTrack: false,
  isBraking: false,
  roadCurve: 0,
  playerZ: 0,
  cameraTurning: false,
  cameraTurnTime: 0,

  nitroTime: 0,
  nitroActive: false,

  _firstCrossing: true,
  _prevPos: 0,

  endPhase: 0,
  endTime: 0,

  keysCollected: 0,
  coinsCollected: 0,

  onRoad2: false,
  _needsTrackSwitch: false,

  // ── NEW REVERSE PUZZLE STATE ────────────────────────
  reverseDistance: 0,
  reverseHintFired: false,
  secretUnlocked: false,
  reverseMode: false,

  // 0 = normal camera, 1 = fully rotated 180 feeling
  cameraFlip: 0,
  cameraFlipTarget: 0,

  // ── Collision reaction state ────────────────────────
  hitCooldown: 0,
  damage: 0,
  cameraShake: 0,
  cameraShakeTime: 0,
  bumpVX: 0,
  impactFlash: 0,
};

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

let _reverseHintCb = null;
let _reverseUnlockCb = null;

export function setReverseHintCallback(cb) {
  _reverseHintCb = cb;
}

export function setReverseUnlockCallback(cb) {
  _reverseUnlockCb = cb;
}

// Backward compatibility for old GameScene import.
export function setForkWarnCallback(cb) {
  _reverseHintCb = cb;
}

export function resetPhys() {
  P.pos = Math.max(0, (trackLen || 0) - START_PRE_FINISH);
  P.speed = 0;
  P.playerX = 0;
  P.cameraX = 0;
  P.cameraCurve = 0;
  P.lapTime = 0;
  P.lapTimes = [];
  P.lapCount = 0;
  P.raceTime = 0;
  P.raceFinished = false;
  P.isOffTrack = false;
  P.isBraking = false;
  P.roadCurve = 0;
  P.playerZ = C.CAM_H / C.CAM_DEPTH;
  P.cameraTurning = false;
  P.cameraTurnTime = 0;

  P.nitroTime = 0;
  P.nitroActive = false;

  P._firstCrossing = true;
  P._prevPos = P.pos;

  P.endPhase = 0;
  P.endTime = 0;

  P.keysCollected = 0;
  P.coinsCollected = 0;

  P.onRoad2 = false;
  P._needsTrackSwitch = false;

  P.reverseDistance = 0;
  P.reverseHintFired = false;
  P.secretUnlocked = false;
  P.reverseMode = false;
  P.cameraFlip = 0;
  P.cameraFlipTarget = 0;

  P.hitCooldown = 0;
  P.damage = 0;
  P.cameraShake = 0;
  P.cameraShakeTime = 0;
  P.bumpVX = 0;
  P.impactFlash = 0;
}

export function activateNitro(durationSec = 2.0) {
  P.nitroTime = Math.max(P.nitroTime, durationSec);
  P.nitroActive = true;
  playSfx('nitro', { volume: 0.9 });
}

export function cancelNitro() {
  P.nitroTime = 0;
  P.nitroActive = false;
}

export function addCameraShake(amount = 0.3, time = 0.18) {
  P.cameraShake = Math.max(P.cameraShake, amount);
  P.cameraShakeTime = Math.max(P.cameraShakeTime, time);
  P.impactFlash = Math.max(P.impactFlash, amount * 0.8);
}

export function applyCollisionImpact(type = 'medium', dir = 0) {
  if (P.hitCooldown > 0 && type !== 'soft') return false;

  const speed01 = clamp(Math.abs(P.speed) / C.NITRO_MAX, 0.15, 1.0);
  const table = {
    soft: { keep: 0.88, push: 0.025, dmg: 0, shake: 0.08, cd: 0.10, nitro: false, min: 0 },
    medium: { keep: 0.62, push: 0.090, dmg: 8, shake: 0.25, cd: 0.35, nitro: false, min: 350 },
    hard: { keep: 0.38, push: 0.150, dmg: 18, shake: 0.45, cd: 0.50, nitro: true, min: 250 },
    wall: { keep: 0.28, push: 0.220, dmg: 25, shake: 0.60, cd: 0.65, nitro: true, min: 120 },
    traffic: { keep: 0.45, push: 0.170, dmg: 20, shake: 0.50, cd: 0.55, nitro: true, min: 200 },
    deadly: { keep: 0.06, push: 0.260, dmg: 45, shake: 0.85, cd: 0.90, nitro: true, min: 0 },
  };

  const r = table[type] || table.medium;
  const sign = P.speed < 0 ? -1 : 1;

  P.speed = sign * Math.max(r.min, Math.abs(P.speed) * (r.keep - speed01 * 0.08));
  P.playerX += dir * r.push;
  P.bumpVX += dir * r.push * 5.0;
  P.damage = clamp(P.damage + r.dmg * speed01, 0, 100);
  P.hitCooldown = r.cd;

  if (r.nitro) cancelNitro();
  addCameraShake(r.shake * speed01, 0.16 + r.shake * 0.20);
  return true;
}

export function applyBounce(kind = 'scenery', dir = 0) {
  if (kind === 'wall') return applyCollisionImpact('wall', dir);
  if (kind === 'bumper') return applyCollisionImpact('medium', dir);
  return applyCollisionImpact('hard', dir);
}

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
    P.bumpVX *= Math.pow(0.05, d);
  } else {
    P.bumpVX = 0;
  }
}

function smooth01(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

function unlockReverseSecret() {
  if (P.secretUnlocked) return;

  P.secretUnlocked = true;
  P.reverseMode = true;
  P.onRoad2 = true;

  // Start slow 180 camera rotation
  P.cameraFlipTarget = 1;
  P.cameraTurnTime = 0;
  P.cameraTurning = true;

  switchToTrack(2);

  P.pos = C.SEG_LEN * (C.RUMBLE * 2 + 3);
  P.speed = Math.max(700, Math.abs(P.speed) * 0.45);
  P.playerX = 0;
  P.cameraX = 0;
  P.roadCurve = 0;
  P.cameraCurve = 0;

  P._needsTrackSwitch = true;
  P._firstCrossing = true;
  P.lapTime = 0;

  addCameraShake(0.35, 0.35);
  playSfx('nitro', { volume: 0.9 });

  if (_reverseUnlockCb) _reverseUnlockCb();
}

function tickReversePuzzle(d) {
  if (P.secretUnlocked || P.onRoad2) return;

  if (P.speed < -40) {
    P.reverseDistance += Math.abs(P.speed) * d;

    if (!P.reverseHintFired && P.reverseDistance >= C.REVERSE_HINT_DISTANCE) {
      P.reverseHintFired = true;
      if (_reverseHintCb) _reverseHintCb();
    }

    if (P.reverseDistance >= C.REVERSE_SECRET_DISTANCE) {
      unlockReverseSecret();
    }
  }
}

export function updatePhys(inp, dt, len) {
  const d = Math.min(dt, 0.05);
  tickCollisionState(d);

  // Smooth fake 180 camera transition.
  if (P.cameraTurning) {
    P.cameraTurnTime += d;
    const t = smooth01(P.cameraTurnTime / C.REVERSE_CAMERA_TIME);
    P.cameraFlip = t;

    // During rotation, reduce speed so it feels cinematic, not instant.
    P.speed *= 0.985;

    if (P.cameraTurnTime >= C.REVERSE_CAMERA_TIME) {
      P.cameraFlip = 1;
      P.cameraTurning = false;
    }
  } else {
    const flipFollow = 1 - Math.pow(0.02, d);
    P.cameraFlip += (P.cameraFlipTarget - P.cameraFlip) * flipFollow;
  }

  if (P.endPhase >= 1) {
    P.endTime += d;
    P.speed *= 0.992;
    if (P.speed < 200) P.speed = 200;
    if (P.endTime > 4.0) P.speed *= 0.94;
    if (P.speed < 30) P.speed = 0;

    P.pos += P.speed * d;
    if (len > 0 && P.pos >= len) P.pos -= len;
    return;
  }

  if (P.nitroTime > 0) {
    P.nitroTime -= d;
    P.nitroActive = true;
    if (P.nitroTime <= 0) {
      P.nitroTime = 0;
      P.nitroActive = false;
    }
  } else {
    P.nitroActive = false;
  }

  const speedCap = P.nitroActive ? C.NITRO_MAX : C.NORMAL_MAX;
  const reverseMax = -(C.REVERSE_MAX || C.NORMAL_MAX * 0.35);
  const reverseAccel = C.REVERSE_ACCEL || C.ACCEL * 0.55;
  const brakePower = Math.abs(C.BRAKE || C.ACCEL * 1.4);

  P.isBraking = false;

  function moveToward(v, target, step) {
    if (v < target) return Math.min(target, v + step);
    if (v > target) return Math.max(target, v - step);
    return target;
  }

  if (inp.up) {
    P.speed += C.ACCEL * d * (P.nitroActive ? 1.35 : 1.0);
  } else if (inp.down && !P.secretUnlocked) {
    // Before secret unlock, ArrowDown means true reverse.
    P.speed -= reverseAccel * d;
  } else if (inp.down && P.secretUnlocked) {
    // After secret unlock, ArrowDown becomes brake.
    P.isBraking = true;
    P.speed = moveToward(P.speed, 0, brakePower * d);
  } else if (inp.hand) {
    P.isBraking = true;
    P.speed = moveToward(P.speed, 0, brakePower * d);
  } else {
    P.speed = moveToward(P.speed, 0, Math.abs(C.DECEL) * d);
  }

  P.speed = clamp(P.speed, reverseMax, speedCap);

  tickReversePuzzle(d);

  setEngineSpeed(Math.abs(P.speed) / C.NITRO_MAX);
  setBrakeLoop(P.isBraking || inp.hand);

  const speedFrac = P.speed / C.NORMAL_MAX;
  const z = P.pos + P.playerZ;
  const curveNow = getLookAheadCurve(z);

  P.roadCurve += (curveNow - P.roadCurve) * 0.10;

  const CENTRIFUGAL_STRENGTH = 0.85;
  const curvePush = P.roadCurve * Math.min(Math.abs(speedFrac), 1) * CENTRIFUGAL_STRENGTH * d;
  P.playerX -= curvePush;

  const speedAbsFrac = Math.min(1, Math.abs(P.speed) / C.NORMAL_MAX);
  const effSteer = Math.max(speedAbsFrac, C.STEER_MIN_FAC);
  const steerDx = d * C.STEER_SPD * effSteer;

  // LEFT / RIGHT only change car frame.
  // They do NOT move car position.
  // Steering rule:
  // left/right alone = only visual frame change
  // up + left/right = car position moves
  const canMoveSide = inp.up && P.speed > 20;

  if (canMoveSide) {
    if (inp.left) P.playerX -= steerDx;
    if (inp.right) P.playerX += steerDx;
  }

  const camFollow = 1 - Math.pow(0.001, d);
  P.cameraX += (P.playerX - P.cameraX) * camFollow;

  const curveFollow = 1 - Math.pow(0.015, d);
  P.cameraCurve += (P.roadCurve - P.cameraCurve) * curveFollow;

  const hitL = P.playerX < -1;
  const hitR = P.playerX > 1;
  P.isOffTrack = hitL || hitR;

  if (P.isOffTrack) {
    const dirBack = hitL ? 1 : -1;
    const outside = Math.abs(P.playerX) - 1;

    P.playerX += dirBack * (0.020 + outside * 0.018);
    if (P.speed > C.OFFRD_LIM) {
      P.speed += C.OFFRD_DC * d * (0.28 + outside * 0.5);
    }

    if (Math.abs(P.playerX) > 1.12 && P.hitCooldown <= 0) {
      applyCollisionImpact('wall', dirBack);
    }
  }

  P.playerX = clamp(P.playerX, -1.18, 1.18);

  P._prevPos = P.pos;

  const rawPos = P.pos + P.speed * d;
  const crossedForward = len > 0 && rawPos >= len;

  P.pos = rawPos;

  if (len > 0) {
    while (P.pos < 0) P.pos += len;
    while (P.pos >= len) P.pos -= len;
  }

  P.lapTime += d;
  P.raceTime += d;

  // ── Win logic ───────────────────────────────────────
  // Road1 never wins. Road2 wins after one full secret-road lap.
  if (crossedForward) {
    if (P._firstCrossing) {
      P._firstCrossing = false;
      P.lapTime = 0;
    } else {
      P.lapCount++;
      P.lapTimes.push(P.lapTime);
      P.lapTime = 0;

      if (P.onRoad2 && P.secretUnlocked) {
        P.raceFinished = true;
        P.endPhase = 1;
        P.endTime = 0;
      }
    }
  }
}

export const kmh = () => {
  const v = Math.max(0, P.speed);
  return Math.round(Math.min(v, C.NITRO_MAX) / C.KMH_TO_WORLD);
};

export const best = () => P.lapTimes.length ? Math.min(...P.lapTimes) : null;