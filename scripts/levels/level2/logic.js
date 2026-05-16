import { P, clamp, addCameraShake } from '../../systems/roadSystem.js';
import { playSfx } from '../../core/audio.js';

// ═══════════════════════════════════════════════════════
// LEVEL 2 — THE SHIFTING MAZE — LOGIC
// ─────────────────────────────────────────────────────
// MECHANIC OVERVIEW:
//
//   Shadow checkpoints painted on the road surface.
//   Each checkpoint group has 3 gates (L / C / R lane).
//
//   COLOR DECEPTION:
//     RED  gate  → actually SAFE   (score a checkpoint)
//     GREEN gate → actually DANGER  (take damage + slow)
//
//   HINT (shown in HUD before glitch):
//     "🟢 GREEN = safe path! 🔴 RED = danger!"  ← WRONG on purpose
//
//   After the GLITCH phase, truth is revealed:
//     "⚠️ Wait... RED was safe all along!"
//
//   Phases:
//     preview  (0 → previewTime) : hint is shown, gates visible
//     glitch   (0 → glitchTime)  : screen glitch, colors flash
//     run      (ongoing)         : truth revealed, player must
//                                  now choose correctly
//
// CHECKPOINT COMPLETION:
//   Player must pass through at least REQUIRED_CP safe gates
//   to "complete" the maze section. Progress tracked in
//   P.level2CpPassed. Race end condition is handled externally.
// ═══════════════════════════════════════════════════════

export const L2_MAZE = {
  phase: 'preview',  // preview | glitch | run
  timer: 0,
  previewTime: 5.0,
  glitchTime: 1.2,
};

// How many safe checkpoints the player must pass to "beat" the maze.
// Set to 0 to make it purely punishing (no required count).
export const REQUIRED_CP = 5;

export function resetLevel2Puzzle() {
  L2_MAZE.phase = 'preview';
  L2_MAZE.timer = 0;

  P.level2MazePhase = 'preview';
  P.level2MazeShifted = false;
  P.level2Glitch = 0;
  P.level2CpPassed = 0;   // safe gates passed
  P.level2CpHit = 0;   // danger gates hit (for scoring/penalty tracking)
  P.level2Solved = false;
  P.raceFinished = false;
  P.endPhase = 0;
  P.endTime = 0;
}

export function updateLevel2Puzzle(dt, sceneryObjs = []) {
  L2_MAZE.timer += dt;

  // ── Phase 1 → Phase 2 (preview → glitch) ──────────
  if (L2_MAZE.phase === 'preview' && L2_MAZE.timer >= L2_MAZE.previewTime) {
    L2_MAZE.phase = 'glitch';
    L2_MAZE.timer = 0;

    P.level2MazePhase = 'glitch';
    P.level2Glitch = 1;

    try { playSfx('screech', { volume: 0.6 }); } catch (e) { }
  }

  // ── Phase 2 → Phase 3 (glitch → run) ──────────────
  if (L2_MAZE.phase === 'glitch' && L2_MAZE.timer >= L2_MAZE.glitchTime) {
    L2_MAZE.phase = 'run';
    L2_MAZE.timer = 0;

    P.level2MazePhase = 'run';
    P.level2MazeShifted = true;
    P.level2Glitch = 0;

    // No visual changes needed — the checkpoints keep their
    // colors. The SHIFT is in the HUD hint message only.
    // Players who trusted "green=safe" now realise the truth.

    try { playSfx('nitro', { volume: 0.5 }); } catch (e) { }
  }

  // ── Decay glitch effect ────────────────────────────
  if (P.level2Glitch > 0) {
    P.level2Glitch = Math.max(0, P.level2Glitch - dt * 1.7);
  }
}

// ─── Called when player drives through a SAFE (red) gate ──
export function rewardCheckpoint() {
  P.level2CpPassed = (P.level2CpPassed || 0) + 1;

  P.speed = Math.min((P.speed || 0) + 8, (P.maxSpeed || 220));
  P.pickupFlash = 0.6;

  try { playSfx('coin', { volume: 0.55 }); } catch (e) { }

  // COMPLETE LEVEL AFTER REQUIRED RED CHECKPOINTS
  if (P.level2CpPassed >= REQUIRED_CP) {
    completeLevel2();
  }
}

function completeLevel2() {
  if (P.level2Solved || P.raceFinished) return;

  P.level2Solved = true;

  P.raceFinished = true;
  P.endPhase = 1;
  P.endTime = 0;

  try { playSfx('win', { volume: 0.8 }); } catch (e) { }
}

// ─── Called when player drives through a DANGER (green) gate ──
export function punishCheckpoint() {
  P.level2CpHit = (P.level2CpHit || 0) + 1;

  P.damage = clamp((P.damage || 0) + 18, 0, 100);
  P.impactFlash = 1;
  addCameraShake(0.55, 0.40);

  P.speed *= 0.40;
  P.playerX = (P.playerX || 0) - 0.20;

  try { playSfx('crash', { volume: 0.75 }); } catch (e) { }
}

// ─── Accessors used by collisionSystem ────────────────
export function isLevel2Active() {
  return true;  // checkpoints are always live once built
}

export function getLevel2Phase() {
  return L2_MAZE.phase;
}

// ─── Legacy exports kept for collisionSystem.js imports ─
// (collisionSystem imports these names; map them to new fns)
export const isLevel2TrapActive = isLevel2Active;
export const punishMazeTrap = punishCheckpoint;