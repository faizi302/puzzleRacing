// ═══════════════════════════════════════════════════════
// LEVEL 1 — "THE GHOST START" PUZZLE LOGIC  (REWORKED)
// ─────────────────────────────────────────────────────
// Mirrors the structure of levels/level2/logic.js so the
// rest of the engine has a consistent place to plug into.
//
// ─── THE CORRECT STORY (diagram-accurate) ─────────────
//
//   1. Player spawns FACING FORWARD on Road1. Road looks
//      completely normal and safe.
//   2. Most players drive forward expecting the goal.
//   3. At the END of Road1 (near finish), a wall of IRON
//      BRUTE monsters stands in front of a FAKE DOOR.
//      The fake door is ALWAYS A TRAP — it never opens,
//      it never becomes safe.  Touching the monsters or
//      crossing into the trap zone = GAME OVER.
//   4. The real solution: TURN AROUND.
//   5. Behind the start line is a FAKE WALL — looks 100%
//      real, but has NO COLLISION. Drive straight through.
//   6. Behind the wall: a hidden PRESSURE PLATE. Drive over
//      it and hold for ~0.6 s.
//   7. Plate activates → the SECRET ROAD (Road2) opens.
//      This is the REAL winning path.
//   8. Player drives FORWARD on Road2. Road2 ALSO has
//      monsters near the finish — but Road2 has a BIG JUMP
//      RAMP. Use the ramp to fly OVER the monsters and land
//      safely past them.
//   9. Crossing Road2's finish line = WIN.
//
// IMPORTANT INVARIANTS (do not regress):
//   • The fake door NEVER opens. It is purely decorative
//     red-skull warning art. The monster does the killing.
//   • Monsters are ONLY lethal inside the trap zone (the
//     segments around the fake door / Road2 finish). If
//     the player jumps over them in the air, they survive.
//   • The plate's job is to UNLOCK ROAD2, nothing else.
//
// STATE MACHINE
// ─────────────────────────────────────────────────────
//   spawn         → just dropped in; no movement yet
//   exploring     → driving (forward or backward)
//   plate-held    → wheels on the plate; accumulating time
//   road2-open    → plate hit; Road2 (secret path) unlocked
//   complete      → crossed the win line on Road2
//   dead          → killed by a monster (Game Over)
// ═══════════════════════════════════════════════════════
import { P, addCameraShake, applyCollisionImpact } from '../../systems/roadSystem.js';
import { trackLen } from '../../core/roadMap.js';
import { C } from '../../configs/roadConfig.js';
import { playSfx } from '../../core/audio.js';

// ── Public state container ─────────────────────────────
export const L1_GHOST = {
  phase     : 'spawn',
  timer     : 0,
  plateHeld : 0,
  hintShown : false,
  monsterTriggered : false,
};

// ── Reset (called when entering Level 1) ───────────────
export function resetLevel1Puzzle() {
  L1_GHOST.phase     = 'spawn';
  L1_GHOST.timer     = 0;
  L1_GHOST.plateHeld = 0;
  L1_GHOST.hintShown = false;
  L1_GHOST.monsterTriggered = false;

  // Mirror onto P for HUD / render / collision.
  P.ghostPhase        = 'spawn';
  P.ghostPlateHeld    = 0;
  P.ghostPlateActive  = false;     // plate fully activated?
  P.ghostKeyRevealed  = false;     // legacy: always false now
  P.ghostKeyCollected = false;     // legacy: always false now
  P.ghostDoorOpen     = false;     // INVARIANT: stays false FOREVER
  P.ghostRoad2Open    = false;     // NEW: Road2 unlocked?
  P.ghostDead         = false;
  P.ghostWon          = false;
}

// ═══════════════════════════════════════════════════════
// MAIN PUZZLE UPDATE — called every physics tick.
// ═══════════════════════════════════════════════════════
export function updateLevel1Puzzle(dt, sceneryObjs = []) {
  if (!sceneryObjs || !sceneryObjs.length) return;
  if (L1_GHOST.phase === 'dead' || L1_GHOST.phase === 'complete') return;

  L1_GHOST.timer += dt;

  // ─────────────────────────────────────────────────────
  // 1) PRESSURE PLATE handling
  // ─────────────────────────────────────────────────────
  if (L1_GHOST.phase !== 'road2-open') {
    let plate = null;
    for (const o of sceneryObjs) {
      if (o.isPressurePlate) { plate = o; break; }
    }

    if (plate) {
      // Wrap-aware distance to plate.
      let dz = plate.z - P.pos;
      while (dz < -trackLen / 2) dz += trackLen;
      while (dz >  trackLen / 2) dz -= trackLen;

      const onPlateZ = Math.abs(dz) < C.SEG_LEN * 1.5;
      const onPlateX = Math.abs((P.playerX || 0) - (plate.offset || 0)) < 0.48;

      if (onPlateZ && onPlateX) {
        plate.held         = (plate.held || 0) + dt;
        L1_GHOST.plateHeld = plate.held;
        P.ghostPlateHeld   = plate.held;
        L1_GHOST.phase     = 'plate-held';
        P.ghostPhase       = 'plate-held';

        const need = plate.activateHoldTime || C.GHOST_PLATE_HOLD_TIME || 0.6;
        if (plate.held >= need) {
          activatePlate(sceneryObjs);
        }
      } else {
        // Decay if rolled off (don't reset to 0 instantly).
        plate.held = Math.max(0, (plate.held || 0) - dt * 1.5);
        L1_GHOST.plateHeld = plate.held;
        P.ghostPlateHeld   = plate.held;
        if (L1_GHOST.phase === 'plate-held' && plate.held <= 0.01) {
          L1_GHOST.phase = 'exploring';
          P.ghostPhase   = 'exploring';
        }
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

  // Move out of 'spawn' as soon as player starts moving.
  if (L1_GHOST.phase === 'spawn' && Math.abs(P.speed) > 5) {
    L1_GHOST.phase = 'exploring';
    P.ghostPhase   = 'exploring';
  }
}

// ═══════════════════════════════════════════════════════
// PLATE ACTIVATION — fires once when the plate hold completes.
// ─────────────────────────────────────────────────────
// CORRECT behaviour (diagram-accurate):
//   • Plate visually turns green (handled by renderer reading
//     `o.activated`).
//   • Fake wall behind it becomes "dissolved" — semi-transparent
//     so the player can see the trick is broken.
//   • Road2 is UNLOCKED. This is what `P.ghostRoad2Open` does.
//     The road switcher (roadSystem) reads this flag to allow
//     the secret-road transition.
//   • The FAKE DOOR is NOT touched. It stays red. It stays a
//     trap. It NEVER becomes safe. This is intentional.
// ═══════════════════════════════════════════════════════
function activatePlate(sceneryObjs) {
  L1_GHOST.phase     = 'road2-open';
  P.ghostPhase       = 'road2-open';
  P.ghostPlateActive = true;
  P.ghostRoad2Open   = true;

  // ── Hook into the existing road-fork / win pipeline ──
  // The engine's race-loop wins the race when the player crosses
  // the finish line WHILE `P.onRoad2 && P.secretUnlocked` is true.
  // We piggy-back on `secretUnlocked` so we don't have to duplicate
  // that wiring — pressing the plate is what unlocks the "secret"
  // road in the reworked design. The road-fork itself is still
  // handled by the engine when the player drives onto Road2.
  P.secretUnlocked = true;

  // INVARIANT: do NOT open the fake door.
  // INVARIANT: do NOT reveal a "real key".
  // The plate's only job is to unlock Road2.

  for (const o of sceneryObjs) {
    if (o.isPressurePlate) o.activated  = true;
    if (o.isFakeWall)      o.dissolved  = true;
    // Do NOT touch o.isFakeDoor here. It stays a trap.
  }

  try { playSfx('nitro', { volume: 0.85 }); } catch (e) {}
  addCameraShake(0.25, 0.35);

  if (_road2UnlockCb) {
    try { _road2UnlockCb(); } catch (e) {}
  }
}

// ═══════════════════════════════════════════════════════
// LEGACY KEY HOOK — kept so collisionSystem.js doesn't crash
// if it still calls level.collectKey. In the new design there
// is no real key, so this is a no-op.
// ═══════════════════════════════════════════════════════
export function collectLevel1Key() {
  // Intentionally empty in the reworked design.
  // The pressure plate is what unlocks the win condition,
  // not a key pickup.
}

// ═══════════════════════════════════════════════════════
// MONSTER KILL — called when a monster touches the player.
// ─────────────────────────────────────────────────────
// In the new design the monster is lethal whenever the player
// is inside the trap zone AND not airborne. Whether the plate
// has been pressed does NOT save them — they still have to
// physically clear the monsters via the Road2 jump ramp.
// ═══════════════════════════════════════════════════════
export function triggerLevel1MonsterKill() {
  if (P.ghostDead || P.ghostWon) return;

  // Airborne players (mid-jump) are immune — they're flying
  // over the monster.
  if (P.isAirborne || (P.airY || 0) > 30) return;

  P.ghostDead       = true;
  L1_GHOST.phase    = 'dead';
  P.ghostPhase      = 'dead';
  P.speed           = 0;
  P.impactFlash     = 1.0;
  P.cameraShake     = 1.0;
  P.cameraShakeTime = 1.5;

  // Stop the race loop (gameScene reads these and shows
  // the Game Over modal because P.ghostDead is true).
  P.endPhase     = 1;
  P.endTime      = 0;
  P.raceFinished = true;

  try { playSfx('crash', { volume: 1.0 }); } catch (e) {}
  try { applyCollisionImpact('deadly', 0); } catch (e) {}

  if (_deathCb) try { _deathCb(); } catch (e) {}
}

// ═══════════════════════════════════════════════════════
// WIN — called by roadSystem when the player crosses Road2's
// finish line. The fake door is never a win condition.
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
// FAKE-DOOR proximity — collisionSystem calls this when the
// player approaches the fake door. There is nothing for us
// to "open" — the door is a permanent trap. We just mark
// the monsters as triggered so they lunge more aggressively.
// ═══════════════════════════════════════════════════════
export function nudgeFakeDoorTrap(o) {
  if (!L1_GHOST.monsterTriggered) {
    L1_GHOST.monsterTriggered = true;
  }
}

// ═══════════════════════════════════════════════════════
// FAKE-WALL is always pass-through.
// ═══════════════════════════════════════════════════════
export function isFakeWallPassThrough(/* o */) {
  return true;
}

// ═══════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════

/** True while the monster should still be lethal.
 *  Diagram rule: the monster is the trap guard.
 *  - Always lethal while the player is alive and not yet won.
 *  - The plate does NOT make the monster harmless; the player
 *    must JUMP OVER them via the Road2 ramp.
 */
export function isLevel1MonsterLethal() {
  return !P.ghostDead && !P.ghostWon;
}

/** True if the trap zone (forward end / fake door) is deadly.
 *  Always true in the new design — the fake door never opens.
 */
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
let _hintCb         = null;
let _road2UnlockCb  = null;
let _deathCb        = null;

export function setLevel1HintCallback(cb)        { _hintCb        = cb; }
export function setLevel1Road2UnlockCallback(cb) { _road2UnlockCb = cb; }
export function setLevel1DeathCallback(cb)       { _deathCb       = cb; }