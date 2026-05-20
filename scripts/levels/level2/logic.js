import { P, clamp } from '../../systems/roadSystem.js';
import { C } from '../../configs/roadConfig.js';
import { playSfx } from '../../core/audio.js';

const NORMAL_SPEED = 100;
const RED_BOOST_SPEED = 120;
const GREEN_BOOST_SPEED = 140;
const CHECKPOINT_BOOST_TIME = 3.0;

export const L2_MAZE = {
  phase: 'preview',
  timer: 0,
  previewTime: 5.0,
  glitchTime: 1.2,
};

export const REQUIRED_CP = 33;

export function resetLevel2Puzzle() {
  L2_MAZE.phase = 'preview';
  L2_MAZE.timer = 0;

  P.level2MazePhase = 'preview';
  P.level2MazeShifted = false;
  P.level2Glitch = 0;
  P.level2CpPassed = 0;
  P.level2CpHit = 0;
  P.level2Solved = false;
  P.raceFinished = false;
  P.endPhase = 0;
  P.endTime = 0;

  P.level2SpeedBoostTimer = 0;
  P.level2ReadyToFinish = false;
  P.level2SpeedBoostTarget = NORMAL_SPEED;

  P.raceFailed = false;
  P._failReason = null;
  P.level2RequiredCp = REQUIRED_CP;
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

    try { playSfx('nitro', { volume: 0.5 }); } catch (e) { }
  }

  // ── Decay glitch effect ────────────────────────────
  if (P.level2Glitch > 0) {
    P.level2Glitch = Math.max(0, P.level2Glitch - dt * 1.7);
  }

  if (P.level2SpeedBoostTimer > 0) {
    P.level2SpeedBoostTimer -= dt;

    P.speed = Math.max(
      P.speed || 0,
      P.level2SpeedBoostTarget || (NORMAL_SPEED * C.KMH_TO_WORLD)
    );
    if (P.level2SpeedBoostTimer <= 0) {
      P.level2SpeedBoostTimer = 0;

      // return to normal speed smoothly
      if ((P.speed || 0) > NORMAL_SPEED) {
        P.speed = NORMAL_SPEED * C.KMH_TO_WORLD;
      }
    }
  }
}

// ─── Called when player drives through a SAFE (red) gate ──
export function rewardCheckpoint() {
  P.level2CpPassed = (P.level2CpPassed || 0) + 1;

  P.level2SpeedBoostKmh = RED_BOOST_SPEED;
  P.level2SpeedBoostTarget = RED_BOOST_SPEED * C.KMH_TO_WORLD;
  P.level2SpeedBoostTimer = CHECKPOINT_BOOST_TIME;
  P.speed = Math.max(
    P.speed || 0,
    RED_BOOST_SPEED * C.KMH_TO_WORLD
  );

  P.pickupFlash = 0.35;

  try {
    playSfx('coin', { volume: 0.35 });
  } catch (e) { }

  if (P.level2CpPassed >= REQUIRED_CP) {
    P.level2ReadyToFinish = true;   // ✅ instead of finishing
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

  P.level2SpeedBoostKmh = GREEN_BOOST_SPEED;
  P.level2SpeedBoostTarget = GREEN_BOOST_SPEED * C.KMH_TO_WORLD;
  P.level2SpeedBoostTimer = CHECKPOINT_BOOST_TIME;
  P.speed = Math.max(
    P.speed || 0,
    GREEN_BOOST_SPEED * C.KMH_TO_WORLD
  );

  P.damage = clamp((P.damage || 0) + 10, 0, 100);
  P.pickupFlash = 0.45;

  try {
    playSfx('nitro', { volume: 0.30 });
  } catch (e) { }
}

// ─── Accessors used by collisionSystem ────────────────
export function isLevel2Active() {
  return true;
}

export function getLevel2Phase() {
  return L2_MAZE.phase;
}

export function reachLevel2Finish() {
  if (!P.level2ReadyToFinish) {
    // player reached finish too early
    return;
  }

  completeLevel2();
}

export const isLevel2TrapActive = isLevel2Active;
export const punishMazeTrap = punishCheckpoint;