import { P, clamp, addCameraShake } from '../../systems/roadSystem.js';
import { playSfx } from '../../core/audio.js';
import { trackLen } from '../../core/roadMap.js';
import { notify } from '../../player/playerAnimation.js';
import { L4_LAYOUT } from './scenery.js';

// ═════════════════════════════════════════════════════════════════
// LEVEL 4 — MEMORY SPRINT logic
// ─────────────────────────────────────────────────────────────────
// Phases
//   "waiting"  → race not yet started (countdown in progress)
//                timer does NOT tick; no checkpoint logic runs
//   "preview"  → race started; all platforms visible; player memorises
//                the safe lane in each of the 9 checkpoints
//   "run"      → preview time elapsed; all platforms hidden;
//                player drives by memory
//   "finished" → terminal, win/lose already decided
//
// Checkpoint resolution
//   When P.pos crosses a checkpoint's z position, we sample the
//   player's lateral X to find which lane they're in, and compare
//   it to that checkpoint's safe lane index. The result is recorded
//   in `L4_MEMORY.cleared[cpIdx]` (true = safe, false = danger).
//
// Win / lose decision
//   ONLY triggered when the player actually reaches the finish line
//   (P.pos >= trackLen * FINISH_TRIGGER_FRAC). Opponent car positions
//   are never read here — this logic only ever touches P.*
// ═════════════════════════════════════════════════════════════════

const PREVIEW_TIME = 4.0;    // seconds of preview once race starts
const LANE_HALF_WIDTH = 0.275;  // half the gap between lanes (0.55 / 2)
const FINISH_TRIGGER_FRAC = 0.97;   // fraction of track where outcome is decided

export const L4_MEMORY = {
  phase: 'waiting',   // 'waiting' | 'preview' | 'run' | 'finished'
  timer: 0,
  cleared: [],        // boolean per checkpoint: true=safe pass, false=danger pass
  visited: [],        // boolean per checkpoint: did we even register a pass?
  lastSfxAt: -1,
  startPos: 0,
};

// ─────────────────────────────────────────────────────────────────
// Detect whether the countdown / start-formation is still active.
// Once all of these flags are clear the race is truly running.
// ─────────────────────────────────────────────────────────────────
function raceIsRunning() {
  return (
    !P.countdownActive &&
    !(P.countdownT > 0) &&
    !P.starting &&
    !P.readyState
  );
}

// Resolves where the player is laterally. The pseudo-3D engine in
// this codebase stores it on P.x (range ~ -1..+1).  Fallbacks are
// provided for builds where the property name was tweaked.
function getPlayerLateral() {
  if (typeof P.playerX === 'number') return P.playerX;
  if (typeof P.x === 'number') return P.x;
  if (typeof P.lat === 'number') return P.lat;
  return 0;
}

// 0=left, 1=center, 2=right   (-1 = not in any lane / off-road)
function laneIndexFromX(x) {
  const [L, M, R] = L4_LAYOUT.LANES;
  let best = 1, bestDist = Math.abs(x - M);
  const dL = Math.abs(x - L);
  const dR = Math.abs(x - R);
  if (dL < bestDist) { best = 0; bestDist = dL; }
  if (dR < bestDist) { best = 2; bestDist = dR; }

  // Nowhere near any lane (crashed off-road) → danger pass
  if (bestDist > LANE_HALF_WIDTH * 2.2) return -1;
  return best;
}

export function resetLevel4Puzzle() {
  const n = L4_LAYOUT.CHECKPOINT_FRACTIONS.length;

  // Start in "waiting" so the timer does NOT tick during the
  // countdown — this was the root cause of the instant-fail bug.
  L4_MEMORY.phase = 'waiting';
  L4_MEMORY.timer = 0;
  L4_MEMORY.cleared = new Array(n).fill(false);
  L4_MEMORY.visited = new Array(n).fill(false);
  L4_MEMORY.lastSfxAt = -1;
  L4_MEMORY.startPos = 0;

  // Clear the lazily-built checkpoint-z cache. trackLen may have
  // changed since the last race (different level, rebuilt track),
  // so stale entries would point to the wrong positions.
  _checkpointZ.length = 0;

  P.level4MemoryStarted = true;
  P.level4MemorySolved = false;
  P.raceFinished = false;
  P.raceFailed = false;
  P._failReason = null;
}

// Hide every memory platform's visual once the preview ends.
function hideAllPlatforms(sceneryObjs) {
  for (const o of sceneryObjs) {
    if (o.isMemoryPlatform) {
      // Keep all 3 jumps visible, but remove safe/danger hint after preview
      o.memoryHidden = false;
      o.previewVisible = false;
    }
  }
}

// Returns the cached z-position for checkpoint cpIdx (lazy build).
const _checkpointZ = [];
function checkpointZ(cpIdx) {
  if (_checkpointZ[cpIdx] != null) return _checkpointZ[cpIdx];
  const z = trackLen * L4_LAYOUT.CHECKPOINT_FRACTIONS[cpIdx];
  _checkpointZ[cpIdx] = z;
  return z;
}

// ─────────────────────────────────────────────────────────────────
// evaluateOutcome
// Called ONLY when the player has reached the finish trigger.
// Flips P.raceFinished or P.raceFailed exactly once.
// Opponent car state is never consulted here.
// ─────────────────────────────────────────────────────────────────
function evaluateOutcome() {
  if (L4_MEMORY.phase === 'finished') return;
  L4_MEMORY.phase = 'finished';

  const total = L4_MEMORY.cleared.length;
  const safeN = L4_MEMORY.cleared.filter(Boolean).length;
  const allOK = safeN === total;

  if (allOK) {
    P.level4MemorySolved = true;
    P.raceFinished = true;
    P.endPhase = 1;
    P.endTime = 0;
    try { playSfx('win', { volume: 0.85 }); } catch (e) { }
  } else {
    P.raceFailed = true;
    P.endPhase = -1;
    P.endTime = 0;
    const missed = total - safeN;
    P._failReason = missed === 1
      ? 'You missed 1 safe platform'
      : `You missed ${missed} safe platforms`;
    try { playSfx('crash', { volume: 0.6 }); } catch (e) { }
  }
}

// ─────────────────────────────────────────────────────────────────
// updateLevel4Puzzle  — called every physics step by GameScene
// ─────────────────────────────────────────────────────────────────
export function updateLevel4Puzzle(dt, sceneryObjs = []) {
  // Terminal phase — nothing to do.
  if (L4_MEMORY.phase === 'finished') return;

  // ── 0) Waiting phase: hold until the countdown is done ──────────
  // The timer must NOT tick while the start countdown plays.
  // Without this guard the preview window expires before the player
  // can even move, and the "all unvisited → all failed" path fires
  // the moment they cross the finish (or, with a short track,
  // immediately at the start line).
  if (L4_MEMORY.phase === 'waiting') {
    if (!raceIsRunning()) return;   // still in countdown → do nothing

    // Countdown just finished → begin the actual preview phase
    L4_MEMORY.phase = 'preview';
    L4_MEMORY.timer = 0;
    L4_MEMORY.startPos = P.pos || 0;
    return;
  }

  // ── 1) Preview phase: tick timer, then hide platforms ───────────
  if (L4_MEMORY.phase === 'preview') {
    L4_MEMORY.timer += dt;

    if (L4_MEMORY.timer >= PREVIEW_TIME) {
      L4_MEMORY.phase = 'run';
      hideAllPlatforms(sceneryObjs);
      try { playSfx('whoosh', { volume: 0.6 }); } catch (e) { }
      try { notify('🌫️ MEMORIZE! Platforms hidden — drive the safe lane'); } catch (e) { }
    }
    // During preview the player can't have passed any checkpoint yet
    // (they haven't seen the road), so we don't evaluate anything.
    return;
  }

  // ── 2) Run phase: check checkpoint crossings ─────────────────────
  // Only P.pos is used — opponent cars have no effect on this logic.

  // Safety net: if trackLen is 0 or unknown, bail — the "nearFinish"
  // calculation would be 0 >= 0 → true and falsely fire the outcome.
  if (!trackLen || trackLen <= 0) return;

  const playerPos = P.pos || 0;

  let levelProgress = playerPos - L4_MEMORY.startPos;
  if (levelProgress < 0) levelProgress += trackLen;
  const playerX = getPlayerLateral();

  for (let i = 0; i < L4_MEMORY.visited.length; i++) {
    if (L4_MEMORY.visited[i]) continue;

    const z = trackLen * L4_LAYOUT.CHECKPOINT_FRACTIONS[i];
    if (levelProgress < z) break;   // checkpoints are ordered; stop at first unvisited

    // Resolve lane at the moment of crossing
    const lane = laneIndexFromX(playerX);
    const safe = L4_LAYOUT.SAFE_LANE_INDEX_BY_CHECKPOINT[i];
    const ok = lane === safe;

    // console.log('L4 CHECK', {
    //   checkpoint: i + 1,
    //   playerX,
    //   lane,
    //   safe,
    //   ok,
    // });

    L4_MEMORY.visited[i] = true;
    L4_MEMORY.cleared[i] = ok;

    // Immediate feedback (the final verdict still waits for the finish)
    if (ok) {
      try { playSfx('coin', { volume: 0.55 }); } catch (e) { }
    } else {
      try { playSfx('crash', { volume: 0.45 }); } catch (e) { }
      // Light punishment — player feels the mistake but can continue
      P.impactFlash = 1;
      addCameraShake(0.35, 0.25);
      P.speed *= 0.7;
      P.damage = clamp((P.damage || 0) + 12, 0, 100);
    }
  }

  // ── 3) Decide outcome — ONLY at the finish line ──────────────────
  //
  // IMPORTANT: We never call evaluateOutcome() just because all
  // checkpoints have been visited.  The player must physically reach
  // the finish trigger.  This prevents any false-positive that could
  // arise from stale state, wrapped positions, or anything else that
  // isn't the player completing the lap.
  //
  // Extra guards (belt-and-suspenders):
  //   • Visited array must be non-empty (allVisited on [] is trivially true).
  //   • Player must have covered at least 5 % of the track so we
  //     never fire on the very first frame of a new race.

  if (L4_MEMORY.visited.length === 0) return;

  const MIN_MOVEMENT = trackLen * 0.05;
  if (levelProgress < MIN_MOVEMENT) return;

  const nearFinish = levelProgress >= trackLen * FINISH_TRIGGER_FRAC;
  if (!nearFinish) return;

  // Mark any checkpoint the player somehow skipped as a miss.
  for (let i = 0; i < L4_MEMORY.visited.length; i++) {
    if (!L4_MEMORY.visited[i]) {
      L4_MEMORY.visited[i] = true;
      L4_MEMORY.cleared[i] = false;
    }
  }

  evaluateOutcome();
}

// ─────────────────────────────────────────────────────────────────
// punishMemoryMistake
// Kept exported for compatibility — call from other systems to flag
// a memory mistake outside the normal checkpoint flow.
// ─────────────────────────────────────────────────────────────────
export function punishMemoryMistake() {
  P.damage = clamp((P.damage || 0) + 20, 0, 100);
  P.impactFlash = 1;
  addCameraShake(0.65, 0.45);
  P.speed *= 0.35;
  P.pos = Math.max(0, P.pos - 240);
  try { playSfx('crash', { volume: 0.8 }); } catch (e) { }
}