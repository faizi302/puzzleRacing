// ═══════════════════════════════════════════════════════
// OPPONENT SYSTEM — AI racers + collision + jumps + ranking
// ─────────────────────────────────────────────────────────
// REWRITTEN AI BRAIN:
//   • Reads road curvature 4 / 10 / 20 / 35 segments ahead
//     so cars steer BEFORE the curve hits them.
//   • Hurdle avoidance now SCANS upcoming hurdles, picks the
//     biggest free lane, and commits to it early — instead of
//     just nudging away at the last moment.
//   • Cars run a full physics tick every frame regardless of
//     distance from the player → they cover the entire map,
//     stay on the road, and never "freeze" off-screen.
//   • Speed is now curve-aware: AI eases off the throttle on
//     sharp curves like a real driver.
//   • Jumps and hurdle bounces are unchanged (already worked).
//
// Nothing else (collision shape, ranking math, puzzle brain,
// rubber-band) was touched — only the driving model.
// ═══════════════════════════════════════════════════════

import { C } from '../configs/roadConfig.js';
import { P, clamp } from './roadSystem.js';
import { findSegOnTrack, trackLen, getTrackLen } from '../core/roadMap.js';
import { JUMP_SPR } from '../configs/sceneryConfig.js';

export let opponents = [];
export let raceOrder = [];

let _playerTotalProgress = 0;
let _lastPlayerPos = 0;

// ──────────────────────────────────────────────────────
// Opponent setup
// z = distance in front of player at race start
// ──────────────────────────────────────────────────────
const LEVEL1_OPPONENTS = [
  // FRONT ROW
  { id:'op_1', name:'THUNDER', team:'red',    type:'normal',   number:1, x:-0.55, z:C.SEG_LEN * 10, speedKmh:92,  skill:0.62, aggression:0.35 },
  { id:'op_2', name:'VIPER',   team:'green',  type:'normal',   number:2, x: 0.00, z:C.SEG_LEN * 10, speedKmh:96,  skill:0.68, aggression:0.45 },
  { id:'op_3', name:'STEEL',   team:'yellow', type:'fakeFast', number:3, x: 0.55, z:C.SEG_LEN * 10, speedKmh:108, skill:0.55, aggression:0.65 },

  // PLAYER ROW LEFT
  { id:'boss', name:'ZERO', team:'silver', type:'rival', number:4, x:-0.30, z:C.SEG_LEN * 4.5, speedKmh:101, skill:0.92, aggression:0.78, boss:true },

  // PLAYER ROW RIGHT
  { id:'op_4', name:'PHOENIX', team:'purple', type:'smart', number:5, x:0.30, z:C.SEG_LEN * 4.5, speedKmh:90, skill:0.82, aggression:0.55 },
];

// ─── Lane definitions (used by hurdle avoidance) ────────
// AI prefers staying in one of three lanes; if all three are
// blocked, it tries finer offsets between them.
const LANES = [-0.58, -0.29, 0, 0.29, 0.58];

function kmhToWorld(kmh) {
  return kmh * (C.KMH_TO_WORLD || 1);
}

function wrapZ(z, len = trackLen) {
  if (!len) return z;
  while (z < 0) z += len;
  while (z >= len) z -= len;
  return z;
}

function wrapDz(objZ, baseZ, len = trackLen) {
  if (!len) return objZ - baseZ;

  let dz = objZ - baseZ;

  while (dz < -len / 2) dz += len;
  while (dz > len / 2) dz -= len;

  return dz;
}

function smoothDamp(current, target, power, dt) {
  const k = 1 - Math.pow(0.001, dt * power);
  return current + (target - current) * k;
}

// ── Curve reader: weighted look-ahead at multiple horizons ──
// Same idea as the player's getLookAheadCurve, but tuned for
// AI: gives more weight to far-ahead curves so the AI starts
// turning EARLY (which is what makes it look like it's actually
// driving the road instead of reacting to it).
function getCurveAt(z, track = 1) {
  const a = findSegOnTrack(z, track)?.curve || 0;
  const b = findSegOnTrack(z + C.SEG_LEN * 4, track)?.curve || 0;
  const c = findSegOnTrack(z + C.SEG_LEN * 10, track)?.curve || 0;
  const d = findSegOnTrack(z + C.SEG_LEN * 20, track)?.curve || 0;
  const e = findSegOnTrack(z + C.SEG_LEN * 35, track)?.curve || 0;
  return a * 0.30 + b * 0.30 + c * 0.20 + d * 0.12 + e * 0.08;
}

// Sharper curve detector — used to slow the car on tight bends.
function getCurveStrength(z, track = 1) {
  let max = 0;
  for (let i = 0; i < 25; i += 4) {
    const cv = Math.abs(findSegOnTrack(z + C.SEG_LEN * i, track)?.curve || 0);
    if (cv > max) max = cv;
  }
  return max;
}

function makeOpponent(cfg, i) {

  const baseSpeed = kmhToWorld(cfg.speedKmh);
  const startZ = wrapZ((P.pos || 0) + (cfg.z || 0), trackLen);


  return {
    ...cfg,

    active: true,
    onRoad2: false,
    discoveredPuzzle: false,
    failedFakeRoad: false,

    z: startZ,
    startZ,

    x: cfg.x || 0,
    targetX: cfg.x || 0,
    formationX: cfg.x || 0,
    formationZ: cfg.z || 0,

    // Lane "intent" — the lane the AI is currently committed to.
    // Updated by hurdle avoidance and lane-changing logic.
    laneTargetX: cfg.x || 0,

    speed: baseSpeed,
    baseSpeed,
    maxSpeed: baseSpeed * 1.18,
    minSpeed: baseSpeed * 0.55,

    steerVisual: 0,
    frameFloat: 10,

    reverseDistance: 0,
    road2Progress: 0,
    forwardTravel: 0,

    raceProgress: 0,
    position: i + 2,

    seed: 1000 + i * 77,
    thinkT: Math.random() * 10,
    laneChangeT: 1.5 + Math.random() * 2.0,
    avoidX: 0,

    hitCooldown: 0,
    boostT: 0,

    isAirborne: false,
    airY: 0,
    airVy: 0,
    jumpCooldown: 0,
  };
}

// ═══════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════
export function resetOpponents(levelId = 'level1') {
  _playerTotalProgress = 0;
  _lastPlayerPos = P.pos || 0;

  const list = levelId === 'level1' ? LEVEL1_OPPONENTS : LEVEL1_OPPONENTS;
  opponents = list.map(makeOpponent);

  raceOrder = [];
  updateRacePositions();
}

export function getOpponentCount() {
  return opponents.length + 1;
}

export function getPlayerRacePosition() {
  updateRacePositions();
  return P.racePosition || 1;
}

export function getRaceOrder() {
  updateRacePositions();
  return raceOrder;
}

// ═══════════════════════════════════════════════════════
// PLAYER PROGRESS — fixes wrong 6/6 after second lap
// ═══════════════════════════════════════════════════════
function tickPlayerProgress() {
  if (!trackLen) return;

  let moved = (P.pos || 0) - _lastPlayerPos;

  // Forward lap wrap
  if (moved < -trackLen * 0.5) moved += trackLen;

  // Reverse wrap
  if (moved > trackLen * 0.5) moved -= trackLen;

  if ((P.speed || 0) >= 0) {
    _playerTotalProgress += Math.max(0, moved);
  }

  _lastPlayerPos = P.pos || 0;
}

function getPlayerProgress() {
  if (P.onRoad2 || P.secretUnlocked) {
    return 100000 + _playerTotalProgress;
  }

  if ((P.reverseDistance || 0) > 0 && !P.secretUnlocked) {
    return 25000 + P.reverseDistance;
  }

  return _playerTotalProgress;
}

function getAIProgress(ai) {
  if (ai.onRoad2) {
    return 100000 + (ai.road2Progress || 0);
  }

  if (ai.discoveredPuzzle) {
    return 25000 + (ai.reverseDistance || 0);
  }

  if (ai.failedFakeRoad) {
    return ai.forwardTravel * 0.12;
  }

  // AI starts ahead of player according to its formation z
  return (ai.formationZ || 0) + ai.forwardTravel;
}

// ═══════════════════════════════════════════════════════
// PUZZLE AI
// ═══════════════════════════════════════════════════════
function tickPuzzleBrain(ai) {
  if (ai.onRoad2 || ai.discoveredPuzzle) return;

  if (ai.type === 'normal') return;

  if (ai.type === 'fakeFast') {
    if (!ai.failedFakeRoad && ai.forwardTravel > trackLen * 0.42) {
      ai.failedFakeRoad = true;
      ai.speed *= 0.35;
      ai.targetX = ai.x > 0 ? 0.75 : -0.75;
    }
    return;
  }

  if (ai.type === 'smart') {
    if ((P.reverseDistance || 0) > C.REVERSE_SECRET_DISTANCE * 0.65) {
      ai.discoveredPuzzle = true;
      ai.speed = -Math.abs(ai.baseSpeed * 0.72);
      ai.reverseDistance = 0;
    }
    return;
  }

  if (ai.type === 'rival') {
    if (P.secretUnlocked || P.onRoad2) {
      unlockAiRoad2(ai, true);
    }
  }
}

function unlockAiRoad2(ai, bossJump = false) {
  ai.onRoad2 = true;
  ai.discoveredPuzzle = true;

  ai.z = C.SEG_LEN * (bossJump ? 10 : 7);
  ai.startZ = ai.z;
  ai.road2Progress = ai.z;

  ai.speed = Math.abs(ai.baseSpeed * (ai.boss ? 1.04 : 0.98));
  ai.x = ai.boss ? 0.15 : 0;
  ai.targetX = ai.x;
  ai.laneTargetX = ai.x;
}

// ═══════════════════════════════════════════════════════
// AI JUMP
// ═══════════════════════════════════════════════════════
function launchAIJump(ai, jumpObj, spr = {}) {
  if (ai.isAirborne || ai.jumpCooldown > 0) return false;

  const speed01 = clamp(Math.abs(ai.speed) / (C.NORMAL_MAX || 1), 0, 1);
  if (speed01 < (C.JUMP_MIN_SPEED_FRAC ?? 0.15)) return false;

  const lift = spr.liftFactor ?? jumpObj.liftFactor ?? 1;
  const baseVy = spr.jumpBaseVy ?? jumpObj.jumpBaseVy ?? C.JUMP_BASE_VY ?? 380;
  const speedVy = spr.jumpSpeedVy ?? jumpObj.jumpSpeedVy ?? C.JUMP_SPEED_VY ?? 420;
  const speedKickKmh = spr.speedKickKmh ?? jumpObj.speedKickKmh ?? 25;
  const forwardKick = spr.forwardKick ?? jumpObj.forwardKick ?? 1.08;

  ai.isAirborne = true;
  ai.airY = 0;
  ai.airVy = (baseVy + speed01 * speedVy) * lift;
  ai.jumpCooldown = 0.45;

  ai.speed = Math.min(
    ai.maxSpeed * 1.15,
    Math.max(ai.speed * forwardKick, ai.speed + kmhToWorld(speedKickKmh))
  );

  return true;
}

function tickAIJump(ai, dt) {
  ai.jumpCooldown = Math.max(0, ai.jumpCooldown - dt);

  if (!ai.isAirborne) return;

  ai.airY += ai.airVy * dt;
  ai.airVy -= C.JUMP_GRAVITY * dt;

  ai.speed *= Math.max(0.96, 1 - C.JUMP_AIR_DRAG * dt);

  if (ai.airY <= 0 && ai.airVy < 0) {
    ai.airY = 0;
    ai.airVy = 0;
    ai.isAirborne = false;
  }
}

// ═══════════════════════════════════════════════════════
// AI SCENERY COLLISION
// ═══════════════════════════════════════════════════════
function objX(o) {
  if (o.isHurdle || o.isJump || o.isCoin || o.isBooster || o.isKey) {
    return o.offset || 0;
  }

  return (o.side || 0) * (o.offset || 1);
}

function hitJumpAI(ai, o, dz) {
  const spr = JUMP_SPR[o.kind] || {};

  const hitBackZ = o.hitBackZ ?? spr.hitBackZ ?? -90;
  const hitFrontZ = o.hitFrontZ ?? spr.hitFrontZ ?? 190;
  const hitHalfW = o.hitHalfW ?? spr.hitHalfW ?? 0.48;

  const laneDiff = Math.abs(ai.x - (o.offset || 0));

  if (
    dz > hitBackZ &&
    dz < hitFrontZ &&
    laneDiff < hitHalfW &&
    !ai.isAirborne &&
    ai.jumpCooldown <= 0
  ) {
    launchAIJump(ai, o, spr);
    return true;
  }

  return false;
}

function hitHurdleAI(ai, o, dz) {
  const ox = objX(o);

  const hurdleSize = o.size ?? 0.45;
  const hurdleHalfW = hurdleSize * 0.46;
  const hurdleHalfZ = hurdleSize * 95;

  const aiHalfW = 0.30;
  const aiHalfZ = 95;

  if (ai.isAirborne && ai.airY > (o.clearAirHeight ?? 45)) {
    return false;
  }

  const xOverlap =
    ai.x + aiHalfW > ox - hurdleHalfW &&
    ai.x - aiHalfW < ox + hurdleHalfW;

  const zOverlap =
    dz > -(hurdleHalfZ + aiHalfZ) &&
    dz < hurdleHalfZ + aiHalfZ;

  if (!xOverlap || !zOverlap) return false;

  const push = ai.x < ox ? -1 : 1;

  // AI reacts like a real car: slow + side push
  ai.x += push * 0.22;
  ai.targetX += push * 0.35;
  ai.speed *= 0.48;
  ai.hitCooldown = 0.45;

  ai.x = clamp(ai.x, -0.90, 0.90);
  ai.targetX = clamp(ai.targetX, -0.62, 0.62);

  return true;
}

function tickAISceneryCollision(ai, sceneryObjs) {
  if (!sceneryObjs?.length) return;

  const len = ai.onRoad2 ? getTrackLen(2) : trackLen;
  if (!len) return;

  for (const o of sceneryObjs) {
    if (!o || o._dead) continue;

    // Only react to actual on-road obstacles. Decorative
    // scenery (buildings, trees, towers) is always skipped.
    if (!o.isHurdle && !o.isJump) continue;

    const dz = wrapDz(o.z, ai.z, len);

    // wider range so fast AI cannot skip collision
    if (dz < -260 || dz > 260) continue;

    if (o.isJump) {
      hitJumpAI(ai, o, dz);
      continue;
    }

    if (o.isHurdle) {
      hitHurdleAI(ai, o, dz);
      continue;
    }
  }
}

// ═══════════════════════════════════════════════════════
// AI DRIVING
// ─────────────────────────────────────────────────────
// findBestLane — given a list of upcoming hurdles, return the
// lane offset (in [-0.65, 0.65]) that maximises clear distance.
//
// Approach: for each candidate lane, find the nearest hurdle
// that would block it. Pick the lane with the FURTHEST nearest
// blocker. Ties broken by preferring the AI's current lane
// (so the car doesn't zig-zag pointlessly).
// ═══════════════════════════════════════════════════════
function findBestLane(ai, sceneryObjs, len) {
  // Scan window — how far ahead the AI plans its lane.
  // Bigger = more "intelligent"-looking but reacts slower
  // when something appears suddenly.
  const SCAN_AHEAD = C.SEG_LEN * 14;
  const SCAN_BEHIND = -60;

  // Build a list of upcoming hurdles only
  const blockers = [];
  for (const o of sceneryObjs) {
    if (!o || o._dead) continue;
    if (!o.isHurdle && !o.isJump) continue;

    const dz = wrapDz(o.z, ai.z, len);
    if (dz < SCAN_BEHIND || dz > SCAN_AHEAD) continue;

    // Jumps are GOOD (boost) — only avoid if AI already in jump cooldown
    if (o.isJump && !ai.boss) {
      // small AI prefer jumps, just continue
      continue;
    }
    if (o.isJump) continue;

    blockers.push({
      x: objX(o),
      dz,
      halfW: (o.size ?? 0.45) * 0.46 + 0.22, // include AI half-width as buffer
    });
  }

  if (!blockers.length) return null;

  // Score each candidate lane by nearest blocker distance.
  let best = null;
  let bestScore = -Infinity;

  for (const lane of LANES) {
    let nearest = SCAN_AHEAD + 1;

    for (const b of blockers) {
      if (Math.abs(lane - b.x) < b.halfW) {
        if (b.dz < nearest) nearest = b.dz;
      }
    }

    // Prefer current lane on tie — small bonus for staying close
    const stickiness = -Math.abs(lane - ai.x) * 30;
    const score = nearest + stickiness;

    if (score > bestScore) {
      bestScore = score;
      best = lane;
    }
  }

  return best;
}

function tickAIDriving(ai, dt, sceneryObjs = []) {
  // Lock AI cars only during countdown/start formation
  if (P.countdownActive || P.countdownT > 0 || P.starting || P.readyState) {
    ai.x = ai.formationX;
    ai.targetX = ai.formationX;
    ai.laneTargetX = ai.formationX;
    ai.speed = 0;
    return;
  }

  ai.thinkT += dt;
  ai.hitCooldown = Math.max(0, ai.hitCooldown - dt);
  ai.boostT = Math.max(0, ai.boostT - dt);

  const len = ai.onRoad2 ? getTrackLen(2) : trackLen;
  const track = ai.onRoad2 ? 2 : 1;

  // ── Curve steering: turn EARLY into curves ──────────
  // Read curve weighted across multiple look-ahead points.
  const curveAhead = getCurveAt(ai.z, track);

  // Centripetal correction: a curving road pushes the car
  // outward; AI compensates by steering opposite.
  // Bigger skill = more accurate compensation = stays cleaner
  // through curves.
  const curveSteer = -curveAhead * (1.20 + ai.skill * 0.60);

  // Sharp curve detector → slow down before tight bends.
  const curveSharpness = getCurveStrength(ai.z, track);

  // ── Hurdle avoidance: pick the cleanest lane ────────
  // Only re-pick periodically or if currently committed
  // lane just became blocked. This keeps the car from
  // dithering between lanes every frame.
  ai.laneChangeT -= dt;

  const bestLane = findBestLane(ai, sceneryObjs, len);

  if (bestLane !== null) {
    // If the lane I'm aiming at now has a hurdle in it
    // OR my replan timer expired → commit to bestLane.
    const currentLaneBlocked = Math.abs(bestLane - ai.laneTargetX) > 0.05;

    if (currentLaneBlocked || ai.laneChangeT <= 0) {
      ai.laneTargetX = bestLane;
      ai.laneChangeT = 0.6 + Math.random() * 0.6;
    }
  } else if (ai.laneChangeT <= 0) {
    // No hurdles ahead → drift toward a random lane occasionally
    // for visual variety. Lower aggression = stays in middle.
    ai.laneChangeT = 2.2 + Math.random() * 2.4;

    const driftLanes = [-0.40, 0, 0.40];
    const pick = driftLanes[(Math.random() * driftLanes.length) | 0];

    ai.laneTargetX = pick * (0.35 + ai.aggression * 0.45);
  }

  // Tiny natural wobble, scaled inversely to skill.
  const wobble =
    Math.sin(ai.thinkT * (0.75 + ai.skill * 0.8) + ai.seed) *
    (0.012 + (1 - ai.skill) * 0.025);

  // ── Build final target X ────────────────────────────
  // laneTargetX = where the AI wants to be (lane choice)
  // curveSteer  = correction to fight centrifugal force
  // wobble      = micro-jitter so movement isn't robotic
  ai.targetX = clamp(
    ai.laneTargetX + curveSteer + wobble,
    -0.78,
    0.78
  );

  const oldX = ai.x;

  // Higher skill = smoother/faster steering
  const steerPower = 3.8 + ai.skill * 6.5;
  ai.x = smoothDamp(ai.x, ai.targetX, steerPower, dt);
  ai.x = clamp(ai.x, -0.90, 0.90);

  ai.steerVisual = clamp((ai.x - oldX) * 9, -1, 1);

  // ── Road edge correction ────────────────────────────
  // If AI gets pushed toward the rumble, gently nudge it back.
  if (Math.abs(ai.x) > 0.82) {
    const dirBack = ai.x > 0 ? -1 : 1;

    ai.x += dirBack * 0.055;
    ai.targetX += dirBack * 0.14;
    ai.laneTargetX = clamp(ai.laneTargetX + dirBack * 0.10, -0.65, 0.65);

    // Off-road speed penalty (matches player physics feel)
    ai.speed *= Math.pow(0.80, dt * 60);
    ai.hitCooldown = Math.max(ai.hitCooldown, 0.25);

    ai.x = clamp(ai.x, -0.90, 0.90);
    ai.targetX = clamp(ai.targetX, -0.78, 0.78);
  }

  // ── Speed logic (now curve-aware) ───────────────────
  // Sharper curve → AI naturally eases off the throttle.
  // Curve sharpness 0   → full speed
  // Curve sharpness 1+  → reduced to ~70% of base
  const curveSpeedScale = clamp(1 - curveSharpness * 0.30, 0.65, 1.0);

  let targetSpeed;

  if (ai.failedFakeRoad) {
    targetSpeed = ai.baseSpeed * 0.38;
  } else if (ai.onRoad2) {
    targetSpeed = ai.baseSpeed * (ai.boss ? 1.08 : 0.98) * curveSpeedScale;
  } else if (ai.discoveredPuzzle && !ai.onRoad2) {
    // reverse phase
    ai.speed = -Math.abs(
      smoothDamp(Math.abs(ai.speed), ai.baseSpeed * 0.72, 1.5, dt)
    );
    targetSpeed = null;
  } else {
    targetSpeed = ai.baseSpeed * curveSpeedScale;
  }

  if (targetSpeed !== null) {
    // Apply rubber-band boost if active
    if (ai.boostT > 0) targetSpeed *= 1.10;

    // After hit, recover gradually
    if (ai.hitCooldown > 0.20) {
      targetSpeed *= 0.65;
    }

    ai.speed = smoothDamp(ai.speed, targetSpeed, 1.4, dt);
  }

  ai.speed = clamp(ai.speed, -ai.maxSpeed, ai.maxSpeed);

  // ── Move forward along the track ────────────────────
  const before = ai.z;
  ai.z += ai.speed * dt;

  if (!ai.onRoad2 && ai.speed > 0) {
    let moved = ai.z - before;
    if (moved < 0) moved += len;
    ai.forwardTravel += Math.max(0, moved);
  }

  if (ai.discoveredPuzzle && !ai.onRoad2 && ai.speed < 0) {
    ai.reverseDistance += Math.abs(ai.speed) * dt;

    if (ai.reverseDistance >= C.REVERSE_SECRET_DISTANCE * 0.95) {
      unlockAiRoad2(ai);
    }
  }

  if (ai.onRoad2) {
    ai.road2Progress += Math.max(0, ai.speed) * dt;
  }

  ai.z = wrapZ(ai.z, len);
}

// ═══════════════════════════════════════════════════════
// RUBBER BAND
// ═══════════════════════════════════════════════════════
function tickRubberBand(ai, dt) {
  if (ai.type === 'normal' || ai.failedFakeRoad) return;

  const gap = getPlayerProgress() - getAIProgress(ai);

  if (gap > 1800) {
    ai.speed += ai.baseSpeed * 0.08 * dt;
    ai.boostT = Math.max(ai.boostT, 0.25);
  }

  if (gap < -1400) {
    ai.speed *= Math.pow(0.965, dt * 60);
  }
}

// ═══════════════════════════════════════════════════════
// AI VS AI COLLISION
// ═══════════════════════════════════════════════════════
function tickOpponentSeparation() {
  for (let i = 0; i < opponents.length; i++) {
    const a = opponents[i];
    if (!a.active) continue;

    for (let j = i + 1; j < opponents.length; j++) {
      const b = opponents[j];
      if (!b.active) continue;
      if (a.onRoad2 !== b.onRoad2) continue;

      const len = a.onRoad2 ? getTrackLen(2) : trackLen;
      const dz = Math.abs(wrapDz(a.z, b.z, len));
      const dx = Math.abs(a.x - b.x);

      if (dz < C.SEG_LEN * 1.2 && dx < 0.32) {
        const push = a.x <= b.x ? -1 : 1;

        a.x += push * 0.025;
        b.x -= push * 0.025;

        a.speed *= 0.985;
        b.speed *= 0.985;

        a.x = clamp(a.x, -0.90, 0.90);
        b.x = clamp(b.x, -0.90, 0.90);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════
// PLAYER VS AI COLLISION
// ═══════════════════════════════════════════════════════
function tickPlayerAICollision() {
  const playerZ = P.pos + (P.playerZ || 0);

  for (const ai of opponents) {
    if (!ai.active) continue;
    if (!!P.onRoad2 !== !!ai.onRoad2) continue;

    const len = ai.onRoad2 ? getTrackLen(2) : trackLen;
    const dz = wrapDz(ai.z, playerZ, len);

    if (dz < -100 || dz > 135) continue;

    const dx = Math.abs((P.playerX || 0) - ai.x);
    if (dx > 0.36) continue;

    const push = (P.playerX || 0) < ai.x ? -1 : 1;

    P.playerX += push * 0.035;
    P.speed *= 0.94;

    ai.x -= push * 0.06;
    ai.speed *= 0.86;
    ai.hitCooldown = 0.30;

    ai.x = clamp(ai.x, -0.90, 0.90);
  }
}

// ═══════════════════════════════════════════════════════
// RANKING
// ═══════════════════════════════════════════════════════
export function updateRacePositions() {
  const playerProgress = getPlayerProgress();

  let playerRank = 1;

  for (const ai of opponents) {
    if (!ai.active) continue;

    const aiProgress = getAIProgress(ai);

    // If AI is ahead of player, player rank goes down
    if (aiProgress > playerProgress + 40) {
      playerRank++;
    }
  }

  P.racePosition = clamp(playerRank, 1, opponents.length + 1);

  raceOrder = [
    {
      id: 'player',
      name: 'YOU',
      isPlayer: true,
      raceProgress: playerProgress,
    },
    ...opponents.map(ai => ({
      id: ai.id,
      name: ai.name,
      isPlayer: false,
      ai,
      raceProgress: getAIProgress(ai),
    })),
  ].sort((a, b) => b.raceProgress - a.raceProgress);

  for (let i = 0; i < raceOrder.length; i++) {
    if (!raceOrder[i].isPlayer) {
      raceOrder[i].ai.position = i + 1;
    }
  }
}

// ═══════════════════════════════════════════════════════
// MAIN UPDATE
// IMPORTANT: GameScene must call updateOpponents(STEP, sceneryObjs)
// ═══════════════════════════════════════════════════════
export function updateOpponents(dt, sceneryObjs = []) {
  if (!opponents.length) return;
  if (P.endPhase >= 1) return;

  tickPlayerProgress();

  const d = Math.min(dt, 0.05);

  for (const ai of opponents) {
    if (!ai.active) continue;

    tickPuzzleBrain(ai);

    // before movement: catches collision already overlapping
    tickAISceneryCollision(ai, sceneryObjs);

    tickAIDriving(ai, d, sceneryObjs);
    tickAIJump(ai, d);

    // after movement: catches fast movement crossing hurdles/jumps
    tickAISceneryCollision(ai, sceneryObjs);

    tickRubberBand(ai, d);
  }

  tickOpponentSeparation();
  tickPlayerAICollision();
  updateRacePositions();
}