// Level 1 puzzle logic. Wall pass-through unlocks Road 2; gorilla is lethal on ground.

import {
  P,
  addCameraShake,
  applyCollisionImpact,
  forceUnlockReverseSecret,
} from '../../systems/roadSystem.js';
import { trackLen } from '../../core/roadMap.js';
import { C } from '../../configs/roadConfig.js';
import { playSfx } from '../../core/audio.js';
import { wrapDz, sign } from '../../utils/math.js';
import { safeCall } from '../../utils/debug.js';

export const L1_GHOST = {
  phase: 'spawn',
  timer: 0,
  hintShown: false,
  wallCrossed: false,
  prevDz: null,
};

export function resetLevel1Puzzle() {
  L1_GHOST.phase = 'spawn';
  L1_GHOST.timer = 0;
  L1_GHOST.hintShown = false;
  L1_GHOST.wallCrossed = false;
  L1_GHOST.prevDz = null;

  // Mirror onto P for HUD / collision visibility.
  P.ghostPhase         = 'spawn';
  P.ghostPlateHeld     = 0;
  P.ghostPlateActive   = false;
  P.ghostKeyRevealed   = false;
  P.ghostKeyCollected  = false;
  P.ghostDoorOpen      = false;
  P.ghostRoad2Open     = false;
  P.ghostDead          = false;
  P.ghostWon           = false;
  P.ghostWallCrossed   = false;
}

// Main puzzle tick — called every physics step.
export function updateLevel1Puzzle(dt, sceneryObjs = []) {
  if (!sceneryObjs.length) return;
  if (L1_GHOST.phase === 'dead' || L1_GHOST.phase === 'complete') return;

  L1_GHOST.timer += dt;

  if (L1_GHOST.phase === 'spawn' && Math.abs(P.speed) > 5) {
    L1_GHOST.phase = 'exploring';
    P.ghostPhase = 'exploring';
  }

  // Detect wall crossing via wrap-aware dz sign-change.
  if (!L1_GHOST.wallCrossed && !P.onRoad2 && !P.secretUnlocked) {
    const wall = findFakeWall(sceneryObjs);
    if (wall) {
      const dz = wrapDz(wall.z - P.pos, trackLen);
      const prev = L1_GHOST.prevDz;
      const window = C.SEG_LEN * 2.0;

      let crossed =
        prev != null &&
        sign(prev) !== sign(dz) &&
        Math.abs(prev) < window &&
        Math.abs(dz) < window;

      // Fallback: very close + moving
      if (!crossed && Math.abs(dz) < C.SEG_LEN * 1.8 && Math.abs(P.speed || 0) > 1) {
        crossed = true;
      }

      if (crossed) triggerWallCrossing(sceneryObjs);
      L1_GHOST.prevDz = dz;
    }
  }

  // Reverse hint
  if (!L1_GHOST.hintShown &&
      (P.reverseDistance || 0) >= (C.GHOST_HINT_REVERSE_DIST || 250)) {
    L1_GHOST.hintShown = true;
    safeCall(_hintCb);
  }
}

function findFakeWall(sceneryObjs) {
  for (let i = 0; i < sceneryObjs.length; i++) {
    const o = sceneryObjs[i];
    if (o.isFakeWallButton || o.isFakeWall) return o;
  }
  return null;
}

// Wall crossing — sole Road 2 unlock trigger.
function triggerWallCrossing(sceneryObjs) {
  if (L1_GHOST.wallCrossed) return;

  L1_GHOST.wallCrossed = true;
  L1_GHOST.phase = 'wall-touched';
  P.ghostPhase = 'wall-touched';
  P.ghostWallCrossed = true;
  P.ghostPlateActive = true;
  P.ghostRoad2Open = true;

  // Engine threshold trigger — auto-fires unlockReverseSecret on next tick.
  forceUnlockReverseSecret();

  for (let i = 0; i < sceneryObjs.length; i++) {
    if (sceneryObjs[i].isFakeWall) sceneryObjs[i].dissolved = true;
  }

  safeCall(playSfx, 'nitro', { volume: 0.85 });
  addCameraShake(0.25, 0.35);
  safeCall(_road2UnlockCb);
}

// Legacy no-op — no real key in v4.
export function collectLevel1Key() {}

// Monster contact → fail (engine's lose pipeline).
export function triggerLevel1MonsterKill() {
  if (P.ghostDead || P.ghostWon) return;
  if (P.isAirborne || (P.airY || 0) > 30) return;  // immune mid-jump

  P.ghostDead = true;
  L1_GHOST.phase = 'dead';
  P.ghostPhase = 'dead';
  P.speed = 0;
  P.impactFlash = 1.0;
  P.cameraShake = 1.0;
  P.cameraShakeTime = 1.5;

  P.raceFailed = true;
  P._failReason = 'The Gorilla Boss caught you.';
  P.endPhase = 1;
  P.endTime = 0;

  safeCall(playSfx, 'crash', { volume: 1.0 });
  safeCall(applyCollisionImpact, 'deadly', 0);
  safeCall(_deathCb);
}

// Win — engine already wins on Road 2 finish; this is for completeness.
export function triggerLevel1Win() {
  if (P.ghostWon || P.ghostDead) return;
  P.ghostWon = true;
  L1_GHOST.phase = 'complete';
  P.ghostPhase = 'complete';
  P.raceFinished = true;
  P.endPhase = 1;
  P.endTime = 0;
  safeCall(playSfx, 'win', { volume: 1.0 });
}

// Legacy hooks
export function nudgeFakeDoorTrap() {}
export function isFakeWallPassThrough() { return true; }

// Queries
export const isLevel1MonsterLethal = () => !P.ghostDead && !P.ghostWon;
export const isLevel1TrapActive    = () => !P.ghostDead && !P.ghostWon;
export const isLevel1Road2Unlocked = () => !!P.ghostRoad2Open;
export const getLevel1Phase        = () => L1_GHOST.phase;

// Callbacks
let _hintCb = null;
let _road2UnlockCb = null;
let _deathCb = null;

export const setLevel1HintCallback        = (cb) => { _hintCb = cb; };
export const setLevel1Road2UnlockCallback = (cb) => { _road2UnlockCb = cb; };
export const setLevel1DeathCallback       = (cb) => { _deathCb = cb; };