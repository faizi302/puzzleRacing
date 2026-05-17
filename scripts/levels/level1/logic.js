// ═══════════════════════════════════════════════════════
// LEVEL 1 — "THE GHOST START" PUZZLE LOGIC  (v4 — wall + lose)
// ─────────────────────────────────────────────────────
// FLOW:
//
//   1. Player spawns on Road1 facing forward. Looks normal.
//   2. Drive forward → at the END of Road1, a Gorilla Boss
//      stands in front of a FAKE DOOR. Door is ALWAYS a trap;
//      touching the gorilla on the ground = race FAILED.
//   3. Real solution: TURN AROUND and drive backward.
//   4. ~100 m behind the start line sits a FAKE WALL — looks
//      100 % solid stone but has NO collision. Drive through.
//   5. Crossing the wall flips the engine's "secret road"
//      pipeline: the track auto-switches to Road 2, the
//      camera does its slow 180° flip, and the player resumes
//      driving forward on the real winning path.
//   6. Road 2 forward → big jump ramp launches the car OVER
//      the end-of-road gorilla. Land and cross the finish to
//      win. Touching the gorilla on the ground (not airborne)
//      is still a FAIL.
//   7. ONLY ONE LAP — the engine already wins on the first
//      Road 2 crossing, so Level 1 = 1 lap forward OR 1 lap
//      backward-through-the-wall-then-forward. No multi-lap.
//
// INVARIANTS:
//   • Fake door NEVER opens.
//   • Gorilla is permanently lethal on the ground.
//   • Wall pass-through is the SOLE Road 2 unlock trigger.
//   • Player death → P.raceFailed (engine's lose modal).
// ═══════════════════════════════════════════════════════
import {
  P,
  addCameraShake,
  applyCollisionImpact,
  forceUnlockReverseSecret,
} from '../../systems/roadSystem.js';
import { trackLen, switchToTrack } from '../../core/roadMap.js';
import { C } from '../../configs/roadConfig.js';
import { playSfx } from '../../core/audio.js';

// ── Public state container ─────────────────────────────
export const L1_GHOST = {
  phase: 'spawn',
  timer: 0,
  hintShown: false,
  wallCrossed: false,
  prevDz: null,    // wrap-aware dz from last tick (sign-change → crossed)
};

// ── Reset (called when entering Level 1) ───────────────
export function resetLevel1Puzzle() {
  L1_GHOST.phase = 'spawn';
  L1_GHOST.timer = 0;
  L1_GHOST.hintShown = false;
  L1_GHOST.wallCrossed = false;
  L1_GHOST.prevDz = null;

  // Mirror onto P for HUD / render / collision.
  P.ghostPhase = 'spawn';
  P.ghostPlateHeld = 0;
  P.ghostPlateActive = false;
  P.ghostKeyRevealed = false;
  P.ghostKeyCollected = false;
  P.ghostDoorOpen = false;     // INVARIANT: stays false forever
  P.ghostRoad2Open = false;
  P.ghostDead = false;
  P.ghostWon = false;
  P.ghostWallCrossed = false;
}

// ═══════════════════════════════════════════════════════
// MAIN PUZZLE UPDATE — called every physics tick.
// ═══════════════════════════════════════════════════════
export function updateLevel1Puzzle(dt, sceneryObjs = []) {
  if (!sceneryObjs || !sceneryObjs.length) return;
  if (L1_GHOST.phase === 'dead' || L1_GHOST.phase === 'complete') return;

  L1_GHOST.timer += dt;

  // Move out of 'spawn' as soon as player starts moving.
  if (L1_GHOST.phase === 'spawn' && Math.abs(P.speed) > 5) {
    L1_GHOST.phase = 'exploring';
    P.ghostPhase = 'exploring';
  }

  // ─────────────────────────────────────────────────────
  // 1) WALL CROSSING — the SOLE Road2 unlock trigger.
  // ─────────────────────────────────────────────────────
  // The fake wall sits ~100 m behind the start line. Because
  // P.pos wraps modulo trackLen, "behind spawn" maps to near
  // end-of-track in seg space.
  //
  // We detect a crossing by watching the sign of the wrap-aware
  // dz (wall.z − player.pos). When `prevDz` and `currDz` have
  // opposite signs AND the magnitude is small (we didn't just
  // wrap teleport), the player has just passed the wall plane.
  // This is direction-agnostic — works whether they reverse INTO
  // the wall and through it, or come back forward later.
  if (!L1_GHOST.wallCrossed && !P.onRoad2 && !P.secretUnlocked) {
    let wall = null;
    for (const o of sceneryObjs) {
      if (o.isFakeWallButton || o.isFakeWall) {
        wall = o;
        break;
      }
    }

    if (wall) {
      let dz = wall.z - P.pos;
      while (dz < -trackLen / 2) dz += trackLen;
      while (dz > trackLen / 2) dz -= trackLen;

      const prev = L1_GHOST.prevDz;
      const crossingWindow = C.SEG_LEN * 2.0;  // accept ±2 segs of slop

      let crossed = false;

      // Sign-change detection — most reliable.
      if (prev != null && Math.sign(prev) !== Math.sign(dz)
        && Math.abs(prev) < crossingWindow
        && Math.abs(dz) < crossingWindow) {
        crossed = true;
      }

      // Fallback: very close to the wall AND moving.
      if (!crossed && Math.abs(dz) < C.SEG_LEN * 1.8 && Math.abs(P.speed || 0) > 1) {
        crossed = true;
      }
      if (crossed) {
        triggerWallCrossing(sceneryObjs);
      }

      L1_GHOST.prevDz = dz;
    }
  }

  // ─────────────────────────────────────────────────────
  // 2) REVERSE HINT — first time player reverses noticeably
  // ─────────────────────────────────────────────────────
  if (!L1_GHOST.hintShown &&
    (P.reverseDistance || 0) >= (C.GHOST_HINT_REVERSE_DIST || 250)) {
    L1_GHOST.hintShown = true;
    if (_hintCb) try { _hintCb(); } catch (e) { }
  }
}

// ═══════════════════════════════════════════════════════
// WALL CROSSING — fires once when the player passes through
// the fake wall. This is what unlocks Road 2.
// ─────────────────────────────────────────────────────
// Side effects:
//   • Wall's `dissolved` flag is set so the renderer fades it.
//   • P.reverseDistance is bumped past REVERSE_SECRET_DISTANCE,
//     which makes the ENGINE's tickReversePuzzle() trigger
//     `unlockReverseSecret()` on the next physics tick. That
//     function handles the actual track switch (Road 2), the
//     camera 180° flip, and resetting the lap counter — we get
//     all of that for free instead of re-implementing it.
//   • Local flags also set in case the engine's threshold was
//     tweaked or removed.
//   • The fake door is NOT touched. It stays a trap.
// ═══════════════════════════════════════════════════════
function triggerWallCrossing(sceneryObjs) {
  if (L1_GHOST.wallCrossed) return;

  L1_GHOST.wallCrossed = true;
  L1_GHOST.phase = 'wall-touched';
  P.ghostPhase = 'wall-touched';
  P.ghostWallCrossed = true;
  P.ghostPlateActive = true;     // legacy flag — keeps HUD compatible
  P.ghostRoad2Open = true;

  // ── Engine-pipeline trigger ──
  // The engine auto-unlocks the secret road when
  // P.reverseDistance ≥ C.REVERSE_SECRET_DISTANCE while the
  // player is reversing. Bumping the counter past the threshold
  // forces unlockReverseSecret() to fire on the next tick.
  forceUnlockReverseSecret();

  for (const o of sceneryObjs) {
    if (o.isFakeWall) o.dissolved = true;
  }

  try { playSfx('nitro', { volume: 0.85 }); } catch (e) { }
  addCameraShake(0.25, 0.35);

  if (_road2UnlockCb) {
    try { _road2UnlockCb(); } catch (e) { }
  }
}

// ═══════════════════════════════════════════════════════
// LEGACY KEY HOOK — no-op in v4.
// ═══════════════════════════════════════════════════════
export function collectLevel1Key() { /* no real key any more */ }

// ═══════════════════════════════════════════════════════
// MONSTER KILL — called when the gorilla touches the player.
// ─────────────────────────────────────────────────────
// Airborne players (mid-jump on the Road 2 ramp) are immune so
// the intended strategy works. Otherwise the gorilla is lethal.
//
// Death → engine's LOSE pipeline (P.raceFailed). gameScene.js
// already polls P.raceFailed and shows the #s-lose modal with
// progress %, lap count, etc.
// ═══════════════════════════════════════════════════════
export function triggerLevel1MonsterKill() {
  if (P.ghostDead || P.ghostWon) return;

  // Airborne immunity — fly over the gorilla.
  if (P.isAirborne || (P.airY || 0) > 30) return;

  P.ghostDead = true;
  L1_GHOST.phase = 'dead';
  P.ghostPhase = 'dead';
  P.speed = 0;
  P.impactFlash = 1.0;
  P.cameraShake = 1.0;
  P.cameraShakeTime = 1.5;

  // Fire the engine's LOSE flow (not the win flow).
  // gameScene.loop() reads P.raceFailed and shows #s-lose.
  P.raceFailed = true;
  P._failReason = 'The Gorilla Boss caught you.';
  P.endPhase = 1;
  P.endTime = 0;

  try { playSfx('crash', { volume: 1.0 }); } catch (e) { }
  try { applyCollisionImpact('deadly', 0); } catch (e) { }

  if (_deathCb) try { _deathCb(); } catch (e) { }
}

// ═══════════════════════════════════════════════════════
// WIN — called explicitly if needed (engine already wins on
// Road 2 finish-line cross). Kept for completeness.
// ═══════════════════════════════════════════════════════
export function triggerLevel1Win() {
  if (P.ghostWon || P.ghostDead) return;

  P.ghostWon = true;
  L1_GHOST.phase = 'complete';
  P.ghostPhase = 'complete';
  P.raceFinished = true;
  P.endPhase = 1;
  P.endTime = 0;

  try { playSfx('win', { volume: 1.0 }); } catch (e) { }
}

// ═══════════════════════════════════════════════════════
// FAKE-DOOR proximity — no-op in v4.
// ═══════════════════════════════════════════════════════
export function nudgeFakeDoorTrap(/* o */) { /* no-op */ }

// ═══════════════════════════════════════════════════════
// FAKE-WALL pass-through — always true.
// ═══════════════════════════════════════════════════════
export function isFakeWallPassThrough(/* o */) { return true; }

// ═══════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════
export function isLevel1MonsterLethal() {
  return !P.ghostDead && !P.ghostWon;
}
export function isLevel1TrapActive() {
  return !P.ghostDead && !P.ghostWon;
}
export function isLevel1Road2Unlocked() {
  return !!P.ghostRoad2Open;
}
export function getLevel1Phase() {
  return L1_GHOST.phase;
}

// ═══════════════════════════════════════════════════════
// CALLBACK HOOKS — UI / banner display
// ═══════════════════════════════════════════════════════
let _hintCb = null;
let _road2UnlockCb = null;
let _deathCb = null;

export function setLevel1HintCallback(cb) { _hintCb = cb; }
export function setLevel1Road2UnlockCallback(cb) { _road2UnlockCb = cb; }
export function setLevel1DeathCallback(cb) { _deathCb = cb; }