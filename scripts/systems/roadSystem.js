'use strict';
// ═══════════════════════════════════════════════════════
// ROAD SYSTEM — Ready Player One style reverse puzzle
// Forward road is fake. Secret road opens by reversing.
// ═══════════════════════════════════════════════════════
import { C, START_PRE_FINISH } from '../configs/roadConfig.js';
import {
  findSeg, trackLen, switchToTrack,
} from '../core/roadMap.js';
import { getActiveLevel } from '../core/activeLevel.js';
import { setEngineSpeed, setBrakeLoop, playSfx } from '../core/audio.js';
import { K, consumeDownPress } from '../core/inputController.js';

export const P = {
  pos: 0,
  speed: 0,
  playerX: 0,
  cameraX: 0,
  cameraAirY: 0,
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

  driftActive: false,
  driftDir: 0,
  driftTimer: 0,
  driftSmokePower: 0,
  manualDriftVelocity: 0,
  steerVisual: 0,
  driftLines: [],

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

  // ── GHOST START PUZZLE STATE (Level 1) ──────────────
  ghostPlateHeld: 0,
  ghostPlateActive: false,
  ghostKeyCollected: false,
  ghostDead: false,
  ghostHiddenWallRevealed: false,
  ghostTrapHit: false,

  raceFailed: false,
  _failReason: null,

  _edgeHitSfxCooldown: 0,
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
  P.cameraAirY = 0;
  P.cameraCurve = 0;
  P.lapTime = 0;
  P.lapTimes = [];
  P.lapCount = 0;
  P.raceTime = 0;
  P.raceFinished = false;
  P.raceFailed = false;
  P._failReason = null;
  P.isOffTrack = false;
  P.isBraking = false;
  P.roadCurve = 0;
  P.playerZ = C.CAM_H / C.CAM_DEPTH;
  P.cameraTurning = false;
  P.cameraTurnTime = 0;

  P.driftActive = false;
  P.driftDir = 0;
  P.driftTimer = 0;
  P.driftSmokePower = 0;
  P.manualDriftVelocity = 0;
  P.steerVisual = 0;
  P.driftLines = [];

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

  // Ghost Start puzzle reset
  P.ghostPlateHeld = 0;
  P.ghostPlateActive = false;
  P.ghostKeyCollected = false;
  P.ghostDead = false;
  P.ghostHiddenWallRevealed = false;
  P.ghostTrapHit = false;
  P.ghostKeyRevealed = false;
  P.ghostDoorOpen = false;
  P.ghostPhase = 'spawn';

  P._edgeHitSfxCooldown = 0;

  // If active level has its own puzzle reset hook, call it.
  // (Used by level1/logic.js — mirrors level2's resetLevel2Puzzle.)
  const lvl = getActiveLevel?.();
  if (lvl && typeof lvl.resetPuzzle === 'function') {
    try { lvl.resetPuzzle(); } catch (e) { }
  }
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
    wall: { keep: 0.72, push: 0.158, dmg: 8, shake: 0.18, cd: 0.22, nitro: true, min: 120 },
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

export function forceUnlockReverseSecret() {
  unlockReverseSecret();
}

function tickReversePuzzle(d) {
  const lvl = getActiveLevel();

  if (lvl?.id === 'level2' || lvl?.id === 'level3' || lvl?.id === 'level4') {
    return;
  }

  if (P.secretUnlocked || P.onRoad2) return;

  if (P.speed < -40) {
    P.reverseDistance += Math.abs(P.speed) * d;

    if (!P.reverseHintFired &&
      P.reverseDistance >= C.REVERSE_HINT_DISTANCE) {
      P.reverseHintFired = true;

      if (_reverseHintCb) {
        _reverseHintCb();
      }
    }
  }
}

let _sceneryObjsRef = null;

async function getSceneryObjs() {
  if (_sceneryObjsRef) return _sceneryObjsRef;
  const mod = await import('../visuals/sceneryRender.js');
  _sceneryObjsRef = mod;
  return mod;
}

// Resolve scenery + level1 logic at module load.
getSceneryObjs().catch(() => { });

function tickLevel1Puzzle(d) {
  const lvl = getActiveLevel();
  if (lvl?.id !== 'level1') return;
  if (!_sceneryObjsRef) return;

  const list = _sceneryObjsRef.sceneryObjs;
  if (!list || !list.length) return;

  // Forward the tick to the level's logic module.
  if (typeof lvl.updatePuzzle === 'function') {
    try { lvl.updatePuzzle(d, list); } catch (e) { }
  }
}

function tickLevel1Monsters(d) {
  const lvl = getActiveLevel();
  if (lvl?.id !== 'level1') return;
  if (!_sceneryObjsRef) return;

  const list = _sceneryObjsRef.sceneryObjs;
  if (!list || !list.length) return;

  // 1) Forward AI update to the level's monster module.
  if (typeof lvl.updateMonsters === 'function') {
    const monsters = [];
    for (const o of list) {
      if (o.isMonster && !o._dead) monsters.push(o);
    }
    if (monsters.length) {
      try { lvl.updateMonsters(monsters, P.pos, d); } catch (e) { }
    }
  }

  // 2) Lethal contact check.
  if (P.ghostDead) return;
  if (typeof lvl.isMonsterLethal === 'function' && !lvl.isMonsterLethal()) {
    return;
  }

  const killZ = C.MONSTER_KILL_RADIUS_Z || 120;
  const killX = C.MONSTER_KILL_RADIUS_X || 0.45;

  for (const m of list) {
    if (!m.isMonster || m._dead) continue;
    if (m.isLethal === false) continue;
    if (!m.active && m.aiState !== 'chase') continue;

    let dz = m.z - P.pos;
    while (dz < -trackLen / 2) dz += trackLen;
    while (dz > trackLen / 2) dz -= trackLen;

    const dxLane = Math.abs((P.playerX || 0) - (m.offset || 0));

    if (
      Math.abs(dz) < killZ &&
      dxLane < killX &&
      !m.hasHitPlayer
    ) {
      m.hasHitPlayer = true;

      if (typeof lvl.triggerMonsterKill === 'function') {
        try { lvl.triggerMonsterKill(); } catch (e) { }
      }

      break;
    }
  }
}

export function updatePhys(inp, dt, len) {
  const d = Math.min(dt, 0.05);
  tickCollisionState(d);

  P._edgeHitSfxCooldown = Math.max(0, (P._edgeHitSfxCooldown || 0) - d);

  // ── LEVEL 1 puzzle + monster updates ────────────────
  tickLevel1Puzzle(d);
  tickLevel1Monsters(d);

  // Smooth camera Y follow when car jumps
  const jumpCamFollow = C.JUMP_CAMERA_FOLLOW ?? 0.45;
  const jumpCamTarget = (P.airY || 0) * jumpCamFollow;

  const jumpCamSmooth = 1 - Math.pow(0.001, d * 4.5);
  P.cameraAirY += (jumpCamTarget - P.cameraAirY) * jumpCamSmooth;

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
    const camFollow = 1 - Math.pow(0.35, d);
    P.cameraX += (P.playerX - P.cameraX) * camFollow;
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

  // Nitro is now controlled by player.js storage/burn system.
  // Do NOT reset P.nitroActive here, otherwise Space nitro stops early.
  if (P.nitroTime > 0) {
    P.nitroTime -= d;

    if (P.nitroTime <= 0) {
      P.nitroTime = 0;
    }
  }

  let speedCap = P.nitroActive ? C.NITRO_MAX : C.NORMAL_MAX;

  if ((P.level2SpeedBoostTimer || 0) > 0) {
    speedCap = Math.max(
      speedCap,
      P.level2SpeedBoostTarget || C.NORMAL_MAX
    );
  }
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

  P.roadCurve += (curveNow - P.roadCurve) * 0.06;

  // ═══════════════════════════════════════════════════════
  // ASPHALT LEGENDS STYLE DRIFT
  // ═══════════════════════════════════════════════════════

  const speedAbsFrac = Math.min(1, Math.abs(P.speed) / C.NORMAL_MAX);
  const steerInput = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  const downTap = consumeDownPress();

  const canDrive = P.speed > 80;
  const canStartDrift =
    canDrive &&
    steerInput !== 0 &&
    downTap &&
    speedAbsFrac > 0.35;

  // start drift from single Down tap
  if (canStartDrift) {
    P.driftActive = true;
    P.driftDir = steerInput;
    P.driftTimer = 0;
  }

  // keep drift while player keeps steering
  if (P.driftActive) {
    P.driftTimer += d;

    if (steerInput !== 0) {
      P.driftDir = steerInput;
    }

    // cancel drift if no steering, too slow, collision, or outside road
    if (
      steerInput === 0 ||
      P.speed < 60 ||
      P.hitCooldown > 0 ||
      Math.abs(P.playerX) > 1.05
    ) {
      P.driftActive = false;
    }
  }

  P.isManualDrifting = P.driftActive;
  P.steerVisual = steerInput;

  // curve force
  const curvePower = Math.min(Math.abs(speedFrac), 1);

  // normal curve push should be controlled
  const CENTRIFUGAL_NORMAL = 1.50;
  const CENTRIFUGAL_DRIFT = 0.75;

  const curvePush =
    P.roadCurve *
    curvePower *
    (P.driftActive ? CENTRIFUGAL_DRIFT : CENTRIFUGAL_NORMAL) *
    d;

  P.playerX -= curvePush;

  // manual steering speed
  // decrease NORMAL_STEER_MULT if left/right still too fast
  const NORMAL_STEER_MULT = 0.72;
  const DRIFT_STEER_MULT = 0.90;

  const baseSteer =
    d *
    C.STEER_SPD *
    Math.max(speedAbsFrac, C.STEER_MIN_FAC);

  const normalSteer = baseSteer * NORMAL_STEER_MULT;
  const driftSteer = baseSteer * DRIFT_STEER_MULT;

  if (canDrive) {
    if (P.driftActive) {
      // drift control
      P.playerX += steerInput * driftSteer;

      // slow down softly during drift
      P.speed *= Math.pow(0.992, d * 60);

      P.manualDriftVelocity = steerInput * driftSteer * 60;

      const targetSmoke = Math.min(1, 0.35 + speedAbsFrac * 0.65);
      P.driftSmokePower += (targetSmoke - (P.driftSmokePower || 0)) * 0.20;

      // small camera yaw feeling
      P.cameraCurve += steerInput * 0.004;

      // save tire line points
      if (!P.driftLines) P.driftLines = [];

      P.driftLines.push({
        x: P.playerX,
        z: P.pos,
        life: 1.0,
        off: P.isOffTrack,
      });

      if (P.driftLines.length > 90) {
        P.driftLines.shift();
      }

    } else {
      // normal lane movement
      P.playerX += steerInput * normalSteer;

      P.manualDriftVelocity *= Math.pow(0.05, d);
      P.driftSmokePower += (0 - (P.driftSmokePower || 0)) * 0.12;
    }
  } else {
    P.driftActive = false;
    P.manualDriftVelocity *= Math.pow(0.05, d);
    P.driftSmokePower += (0 - (P.driftSmokePower || 0)) * 0.12;
  }

  // fade tyre lines
  if (P.driftLines?.length) {
    for (let i = P.driftLines.length - 1; i >= 0; i--) {
      P.driftLines[i].life -= d * 0.22;
      if (P.driftLines[i].life <= 0) {
        P.driftLines.splice(i, 1);
      }
    }
  }

  const camFollow = 1 - Math.pow(0.001, d);
  P.cameraX += (P.playerX - P.cameraX) * camFollow;

  const curveFollow = 1 - Math.pow(0.015, d);
  P.cameraCurve += (P.roadCurve - P.cameraCurve) * curveFollow;

  // Bigger value = collision happens later, when car visually reaches boundary
  const ROAD_EDGE_LIMIT = 1.16;
  const ROAD_HARD_HIT_LIMIT = 1.20;

  const hitL = P.playerX < -ROAD_EDGE_LIMIT;
  const hitR = P.playerX > ROAD_EDGE_LIMIT;
  P.isOffTrack = hitL || hitR;

  if (P.isOffTrack) {
    const dirBack = hitL ? 1 : -1;
    const outside = Math.abs(P.playerX) - ROAD_EDGE_LIMIT;

    P.playerX += dirBack * (0.020 + outside * 0.018);

    if (P.speed > C.OFFRD_LIM) {
      P.speed += C.OFFRD_DC * d * (0.28 + outside * 0.5);
    }

    // continuous side touching sound
    if ((P.speed || 0) > 20) {
      playSfx('crash', {
        loop: true,
        volume: 0.50,
        key: 'edge_screech',
      });
    }

    if (Math.abs(P.playerX) > ROAD_HARD_HIT_LIMIT && P.hitCooldown <= 0) {
      applyCollisionImpact('wall', dirBack);
      playSfx('crash', { volume: 0.28 });
    }
  } else {
    playSfx('crash', {
      stop: true,
      key: 'edge_screech',
    });
  }

  P.playerX = clamp(P.playerX, -1.38, 1.38);

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
  if (crossedForward) {
    const lvl = getActiveLevel?.();

    if (lvl?.id === 'level5') {
      // First crossing is only the start line, not level finish
      if (P._firstCrossing) {
        P._firstCrossing = false;
        P.lapTime = 0;
        return;
      }

      if (typeof lvl.onFinishReached === 'function') {
        try { lvl.onFinishReached(lvl.puzzleState); } catch (e) { }
      }

      if (lvl.puzzleState?.levelComplete) {
        P.raceFinished = true;
        P.endPhase = 1;
        P.endTime = 0;
      } else {
        P.raceFailed = true;
        P._failReason =
          lvl.puzzleState?.failReason ||
          'You did not unlock all hurdles';
        P.endPhase = -1;
        P.endTime = 0;
        P.speed = Math.max(120, P.speed * 0.35);
      }

      return;
    }

    // LEVEL 2 — first crossing is ONLY the start line, not lap complete
    if (lvl?.id === 'level2') {
      if (P._firstCrossing) {
        P._firstCrossing = false;
        P.lapTime = 0;
        return;
      }

      const required = P.level2RequiredCp || 5;
      const passed = P.level2CpPassed || 0;

      if (passed >= required || P.level2Solved) {
        P.lapCount = 1;
        P.lapTimes.push(P.lapTime);
        P.lapTime = 0;

        P.raceFinished = true;
        P.endPhase = 1;
        P.endTime = 0;
        return;
      }

      P.lapCount = 1;
      P.raceFailed = true;
      P._failReason = `You missed ${required - passed} red checkpoint${required - passed === 1 ? '' : 's'}`;
      P.endPhase = 1;
      P.endTime = 0;
      P.speed = Math.max(120, P.speed * 0.35);
      return;
    }

    // LEVEL 1 secret road win
    if (P.onRoad2 && P.secretUnlocked) {
      P.lapCount = 1;
      P.lapTimes.push(P.lapTime);
      P.lapTime = 0;

      P.raceFinished = true;
      P.endPhase = 1;
      P.endTime = 0;
      return;
    }

    // Road1 finish crossing is fake/trap route, not win.
    P._firstCrossing = false;
    P.lapTime = 0;
  }
}

export const kmh = () => {
  const v = Math.max(0, P.speed);
  return Math.round(Math.min(v, C.NITRO_MAX) / C.KMH_TO_WORLD);
};

export const best = () => P.lapTimes.length ? Math.min(...P.lapTimes) : null;