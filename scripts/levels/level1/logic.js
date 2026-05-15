// ═══════════════════════════════════════════════════════
// LEVEL 1 — "THE GHOST START" PUZZLE LOGIC  (v3 — wall trigger)
// ─────────────────────────────────────────────────────
// REWORKED FLOW (this version):
//
//   1. Player spawns on Road1 facing forward. Looks normal.
//   2. Drive forward → at the END of Road1, a Gorilla Boss
//      stands in front of a FAKE DOOR. The door is ALWAYS a
//      trap. Touch the gorilla / cross into its zone = DEAD.
//   3. Real solution: TURN AROUND and drive backward.
//   4. ~100 m behind the start line sits a FAKE WALL — looks
//      100 % solid stone but has NO collision. Drive through.
//   5. The moment the player CROSSES the wall going backward,
//      ROAD 2 OPENS automatically. No hold-button, no plate
//      timer — just walk through and you're in.
//   6. Road 2 forward → big jump ramp launches the car OVER
//      the end-of-road gorillas. Land and cross the finish to
//      win. Touching the gorilla on the ground (not airborne)
//      is still a DEATH.
//
// INVARIANTS:
//   • Fake door NEVER opens. Permanent trap, always red skull.
//   • Gorilla is permanently lethal in trap zone (unless the
//     player clears it via the airborne ramp).
//   • Pressing through the wall is the SOLE Road 2 unlock.
//
// STATE MACHINE
//   spawn        → just dropped in
//   exploring    → driving (either direction)
//   wall-touched → player has crossed the fake wall →
//                  Road 2 unlocked
//   complete     → crossed Road 2 finish line
//   dead         → killed by gorilla
// ═══════════════════════════════════════════════════════
import { P, addCameraShake, applyCollisionImpact } from '../../systems/roadSystem.js';
import { trackLen , switchToTrack } from '../../core/roadMap.js';
import { C } from '../../configs/roadConfig.js';
import { playSfx } from '../../core/audio.js';

// ── Public state container ─────────────────────────────
export const L1_GHOST = {
  phase     : 'spawn',
  timer     : 0,
  hintShown : false,
  wallCrossed : false,
};

// ── Reset (called when entering Level 1) ───────────────
export function resetLevel1Puzzle() {
  L1_GHOST.phase       = 'spawn';
  L1_GHOST.timer       = 0;
  L1_GHOST.hintShown   = false;
  L1_GHOST.wallCrossed = false;

  // Mirror onto P for HUD / render / collision.
  P.ghostPhase        = 'spawn';
  P.ghostPlateHeld    = 0;
  P.ghostPlateActive  = false;
  P.ghostKeyRevealed  = false;
  P.ghostKeyCollected = false;
  P.ghostDoorOpen     = false;     // INVARIANT: stays false forever
  P.ghostRoad2Open    = false;
  P.ghostDead         = false;
  P.ghostWon          = false;
  P.ghostWallCrossed  = false;
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
    P.ghostPhase   = 'exploring';
  }

  // ─────────────────────────────────────────────────────
  // 1) WALL CROSSING — the SOLE Road2 unlock trigger.
  // ─────────────────────────────────────────────────────
  // The fake wall is placed ≈100 m behind the start line
  // (see scenery.js). We detect "the player crossed it" by
  // tracking when their wrap-aware position passes the wall's
  // z coord while moving backward.
  //
  // Using `P.pos` directly is robust because the engine wraps
  // it modulo trackLen — drive-backward from spawn naturally
  // makes pos approach trackLen (the wall sits near end-of-
  // track since "100 m behind spawn" wraps that way).
  if (!L1_GHOST.wallCrossed) {
    let wall = null;
    for (const o of sceneryObjs) {
      if (o.isFakeWall) { wall = o; break; }
    }

    if (wall) {
      // Wrap-aware signed distance from wall to player.
      let dz = wall.z - P.pos;
      while (dz < -trackLen / 2) dz += trackLen;
      while (dz >  trackLen / 2) dz -= trackLen;

      // Player is "past the wall" when they're within a small
      // band BEHIND the wall in track coords. We accept either
      // direction of cross — once they're meaningfully past
      // the wall (within 2 segs on the "behind spawn" side),
      // count the wall as broken.
      const crossThreshold = C.SEG_LEN * 1.2;

      // The wall is reached by driving BACKWARD from spawn.
      // In wrap coords that places the player on the "low z"
      // side of the wall (dz becomes small positive) just
      // before crossing, then negative once they're past it
      // and looping back toward spawn.
      if (Math.abs(dz) < crossThreshold && (P.speed || 0) < -5) {
        triggerWallCrossing(sceneryObjs);
      }
    }
  }

  // ─────────────────────────────────────────────────────
  // 2) REVERSE HINT — first time player reverses noticeably
  // ─────────────────────────────────────────────────────
  if (!L1_GHOST.hintShown &&
      (P.reverseDistance || 0) >= (C.GHOST_HINT_REVERSE_DIST || 250)) {
    L1_GHOST.hintShown = true;
    if (_hintCb) try { _hintCb(); } catch (e) {}
  }
}

// ═══════════════════════════════════════════════════════
// WALL CROSSING — fires once when the player drives through
// the fake wall. This is what unlocks Road 2.
// ─────────────────────────────────────────────────────
// Side effects:
//   • The wall's `dissolved` flag is set so the renderer
//     shows it semi-transparent (visual feedback).
//   • P.ghostRoad2Open + P.secretUnlocked → engine treats
//     the next forward lap on Road 2 as the win lap.
//   • The fake door is NOT touched. It stays a trap.
// ═══════════════════════════════════════════════════════
function triggerWallCrossing(sceneryObjs) {
  if (L1_GHOST.wallCrossed) return;

  L1_GHOST.wallCrossed = true;
  L1_GHOST.phase       = 'wall-touched';
  P.ghostPhase         = 'wall-touched';
  P.ghostWallCrossed   = true;
  P.ghostPlateActive   = true;    // legacy flag — keeps HUD compatible
  P.ghostRoad2Open     = true;

  // Hook into the existing engine win pipeline. The engine
  // grants the win when the player crosses the finish line on
  // Road 2 AND `secretUnlocked` is set, so we set it here.
  P.secretUnlocked = true;

  switchToTrack(2);

P.onRoad2 = true;
P.reverseMode = false;
P.cameraFlip = 0;
P.cameraFlipTarget = 0;
P.cameraTurning = false;

P.pos = C.SEG_LEN * 3;
P.speed = 0;
P.playerX = 0;
P.cameraX = 0;
P.roadCurve = 0;
P.cameraCurve = 0;

P._firstCrossing = false;
P.lapCount = 0;
P.lapTime = 0;
P.reverseDistance = 0;

  for (const o of sceneryObjs) {
    if (o.isFakeWall) o.dissolved = true;
    // Do NOT touch o.isFakeDoor — the door stays a trap.
  }

  try { playSfx('nitro', { volume: 0.85 }); } catch (e) {}
  addCameraShake(0.25, 0.35);

  if (_road2UnlockCb) {
    try { _road2UnlockCb(); } catch (e) {}
  }
}

// ═══════════════════════════════════════════════════════
// LEGACY KEY HOOK — no-op in the v3 design.
// ═══════════════════════════════════════════════════════
export function collectLevel1Key() { /* no real key any more */ }

// ═══════════════════════════════════════════════════════
// MONSTER KILL — called when the gorilla touches the player.
// ─────────────────────────────────────────────────────
// Airborne players (mid-jump) are immune so the Road 2 ramp
// strategy works. Otherwise the gorilla is permanently lethal.
// ═══════════════════════════════════════════════════════
export function triggerLevel1MonsterKill() {
  if (P.ghostDead || P.ghostWon) return;

  // Airborne immunity — fly over the gorilla.
  if (P.isAirborne || (P.airY || 0) > 30) return;

  P.ghostDead       = true;
  L1_GHOST.phase    = 'dead';
  P.ghostPhase      = 'dead';
  P.speed           = 0;
  P.impactFlash     = 1.0;
  P.cameraShake     = 1.0;
  P.cameraShakeTime = 1.5;

  // Stop the race loop. gameScene.loop notices P.ghostDead and
  // shows the Game Over modal (NOT the win modal).
  P.endPhase     = 1;
  P.endTime      = 0;
  P.raceFinished = true;

  try { playSfx('crash', { volume: 1.0 }); } catch (e) {}
  try { applyCollisionImpact('deadly', 0); } catch (e) {}

  if (_deathCb) try { _deathCb(); } catch (e) {}
}

// ═══════════════════════════════════════════════════════
// WIN — called by roadSystem when Road 2 finish line is crossed.
// ═══════════════════════════════════════════════════════
export function triggerLevel1Win() {
  if (P.ghostWon || P.ghostDead) return;

  P.ghostWon     = true;
  L1_GHOST.phase = 'complete';
  P.ghostPhase   = 'complete';
  P.raceFinished = true;
  P.endPhase     = 1;
  P.endTime      = 0;

  try { playSfx('win', { volume: 1.0 }); } catch (e) {}
}

// ═══════════════════════════════════════════════════════
// FAKE-DOOR proximity — engine hook that does nothing
// special in the v3 design; the gorilla is what kills.
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
let _hintCb        = null;
let _road2UnlockCb = null;
let _deathCb       = null;

export function setLevel1HintCallback(cb)        { _hintCb        = cb; }
export function setLevel1Road2UnlockCallback(cb) { _road2UnlockCb = cb; }
export function setLevel1DeathCallback(cb)       { _deathCb       = cb; }