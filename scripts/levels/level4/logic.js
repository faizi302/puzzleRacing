import { P, clamp, addCameraShake } from '../../systems/roadSystem.js';
import { playSfx } from '../../core/audio.js';
import { trackLen } from '../../core/roadMap.js';
import { notify } from '../../player/playerAnimation.js';
import { L4_LAYOUT } from './scenery.js';

// ═════════════════════════════════════════════════════════════════


const PREVIEW_TIME = 4.0;   
const LANE_HALF_WIDTH = 0.275; 
const FINISH_TRIGGER_FRAC = 0.97;   

export const L4_MEMORY = {
  phase: 'waiting',  
  timer: 0,
  cleared: [],       
  visited: [],        
  lastSfxAt: -1,
  startPos: 0,


  prevPos: 0,
  farSideReached: false,
  finishCrossed: false,
};


function raceIsRunning() {
  return (
    !P.countdownActive &&
    !(P.countdownT > 0) &&
    !P.starting &&
    !P.readyState
  );
}


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
  L4_MEMORY.prevPos = 0;
  L4_MEMORY.farSideReached = false;
  L4_MEMORY.finishCrossed = false;


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


  if (L4_MEMORY.phase === 'waiting') {
    if (!raceIsRunning()) return;   // still in countdown → do nothing

    // Countdown just finished → begin the actual preview phase
    L4_MEMORY.phase = 'preview';
    L4_MEMORY.timer = 0;
    L4_MEMORY.startPos = P.pos || 0;
    L4_MEMORY.prevPos = P.pos || 0;
    L4_MEMORY.farSideReached = false;
    L4_MEMORY.finishCrossed = false;
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

  // ── 3) Decide outcome — ONLY when the player actually crosses

  const prevPos = L4_MEMORY.prevPos;

  // Stage (a): mark that the player has reached the far side of the track.
  if (!L4_MEMORY.farSideReached &&
      playerPos > trackLen * 0.40 &&
      playerPos < trackLen * 0.60) {
    L4_MEMORY.farSideReached = true;
  }

  // Stage (b): detect the wrap from end-of-track → start-of-track.
  const wrapped =
    prevPos > trackLen * 0.70 &&
    playerPos < trackLen * 0.30 &&
    P.speed > 0;

  // Update prevPos for the next tick.
  L4_MEMORY.prevPos = playerPos;

  if (!wrapped) return;
  if (!L4_MEMORY.farSideReached) return;   
  if (L4_MEMORY.finishCrossed) return;    

  L4_MEMORY.finishCrossed = true;

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
export function punishMemoryMistake() {
  P.damage = clamp((P.damage || 0) + 20, 0, 100);
  P.impactFlash = 1;
  addCameraShake(0.65, 0.45);
  P.speed *= 0.35;
  P.pos = Math.max(0, P.pos - 240);
  try { playSfx('crash', { volume: 0.8 }); } catch (e) { }
}