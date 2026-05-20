// Opponent system — Asphalt-style average-speed AI, dynamic race positions.

import { C } from '../configs/roadConfig.js';
import { P, clamp } from './roadSystem.js';
import { findSegOnTrack, trackLen, getTrackLen } from '../core/roadMap.js';
import { JUMP_SPR } from '../configs/sceneryConfig.js';

export let opponents = [];
export let raceOrder = [];

// Race tracking (player)
let _playerLap = 0;
let _lastPlayerPos = 0;
let _playerTotalDist = 0;
let _raceTimeAccum = 0;

// Roster — `boss: true` still drives AI behavior, but render no longer shows it.
const LEVEL1_OPPONENTS = [
  { id: 'op_1', name: 'THUNDER', team: 'red',    type: 'normal',   number: 1, x: -0.55, z: C.SEG_LEN * 10,  speedKmh: 92,  skill: 0.62, aggression: 0.35 },
  { id: 'op_2', name: 'VIPER',   team: 'green',  type: 'normal',   number: 2, x:  0.00, z: C.SEG_LEN * 10,  speedKmh: 96,  skill: 0.68, aggression: 0.45 },
  { id: 'op_3', name: 'STEEL',   team: 'yellow', type: 'fakeFast', number: 3, x:  0.55, z: C.SEG_LEN * 10,  speedKmh: 108, skill: 0.55, aggression: 0.65 },
  { id: 'boss', name: 'ZERO',    team: 'silver', type: 'rival',    number: 4, x: -0.30, z: C.SEG_LEN * 4.5, speedKmh: 101, skill: 0.92, aggression: 0.78, boss: true },
  { id: 'op_4', name: 'PHOENIX', team: 'purple', type: 'smart',    number: 5, x:  0.30, z: C.SEG_LEN * 4.5, speedKmh: 90,  skill: 0.82, aggression: 0.55 },
];

const LANES = [-0.58, -0.29, 0, 0.29, 0.58];

// Per-position "you need this avg km/h to beat me" threshold
// position 1 = hardest opponent, position N = easiest
const OPPONENT_BEAT_SPEEDS = [92, 83, 78, 70, 60];

// Helpers

const kmhToWorld = (kmh) => kmh * (C.KMH_TO_WORLD || 1);
const worldToKmh = (v)   => v / (C.KMH_TO_WORLD || 1);

function wrapZ(z, len = trackLen) {
  if (!len) return z;
  if (z < 0)    return ((z % len) + len) % len;
  if (z >= len) return z % len;
  return z;
}

function wrapDz(objZ, baseZ, len = trackLen) {
  if (!len) return objZ - baseZ;
  let dz = objZ - baseZ;
  const half = len * 0.5;
  if (dz < -half) dz += len;
  else if (dz > half) dz -= len;
  return dz;
}

function smoothDamp(current, target, power, dt) {
  const k = 1 - Math.pow(0.001, dt * power);
  return current + (target - current) * k;
}

function getCurveAt(z, track = 1) {
  const a = findSegOnTrack(z,                track)?.curve || 0;
  const b = findSegOnTrack(z + C.SEG_LEN * 4, track)?.curve || 0;
  const c = findSegOnTrack(z + C.SEG_LEN * 10,track)?.curve || 0;
  const d = findSegOnTrack(z + C.SEG_LEN * 20,track)?.curve || 0;
  const e = findSegOnTrack(z + C.SEG_LEN * 35,track)?.curve || 0;
  return a * 0.30 + b * 0.30 + c * 0.20 + d * 0.12 + e * 0.08;
}

function getCurveStrength(z, track = 1) {
  let max = 0;
  for (let i = 0; i < 25; i += 4) {
    const cv = Math.abs(findSegOnTrack(z + C.SEG_LEN * i, track)?.curve || 0);
    if (cv > max) max = cv;
  }
  return max;
}

function objX(o) {
  if (o.isHurdle || o.isJump || o.isCoin || o.isBooster || o.isKey) return o.offset || 0;
  return (o.side || 0) * (o.offset || 1);
}

// Opponent factory

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
    lap: 0,
    totalDist: 0,   // cumulative — used for ranking + AI target
    pos: startZ,    // mirror of z, kept current for minimap consumers

    x: cfg.x || 0,
    targetX: cfg.x || 0,
    formationX: cfg.x || 0,
    formationZ: cfg.z || 0,
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

    position: i + 1,
    rankNumber: i + 1,

    seed: 1000 + i * 77,
    thinkT: Math.random() * 10,
    laneChangeT: 1.5 + Math.random() * 2.0,

    hitCooldown: 0,
    boostT: 0,

    isAirborne: false,
    airY: 0,
    airVy: 0,
    jumpCooldown: 0,
  };
}

// Public API

export function resetOpponents(levelId = 'level1') {
  _playerLap = 0;
  _lastPlayerPos = P.pos || 0;
  _playerTotalDist = 0;
  _raceTimeAccum = 0;

  // Mirror onto P so other systems can read it
  P.lap = 0;
  P.totalDistance = 0;
  P.avgSpeedKmh = 0;
  P.racePosition = 1;

  const list = (levelId === 'level1') ? LEVEL1_OPPONENTS : LEVEL1_OPPONENTS;
  opponents = list.map(makeOpponent);
  raceOrder = [];

  // Initial sort: opponents start in their config order ahead of player.
  // Rank gets recomputed first frame.
  updateRacePositions();
}

export function getOpponentCount() {
  return opponents.length + 1;
}

export function getPlayerRacePosition() {
  return P.racePosition || 1;
}

export function getRaceOrder() {
  return raceOrder;
}

// Used by gameScene/minimap — returns the live opponents array.
export function getOpponents() {
  return opponents;
}

// Player progress tracking

function tickPlayerProgress(dt) {
  if (!trackLen) return;

  // Wrap-aware delta
  const curPos = P.pos || 0;
  let moved = curPos - _lastPlayerPos;

  if (moved < -trackLen * 0.5) {
    moved += trackLen;
    _playerLap += 1;   // forward lap wrap
  } else if (moved > trackLen * 0.5) {
    moved -= trackLen;
  }

  // Only count forward motion toward total distance
  if ((P.speed || 0) >= 0 && moved > 0) {
    _playerTotalDist += moved;
  }

  _lastPlayerPos = curPos;

  // Race time accumulator (separate from P.raceTime in case it's reset elsewhere)
  if (P.endPhase < 1) _raceTimeAccum += dt;

  // Publish to P so other systems can read
  P.lap = _playerLap;
  P.totalDistance = _playerTotalDist;

  // Average speed in km/h
  // Convert world units to km/h via KMH_TO_WORLD
  // distance is in world units; divide by elapsed seconds, then convert
  const elapsed = Math.max(0.5, _raceTimeAccum);
  const worldPerSec = _playerTotalDist / elapsed;
  P.avgSpeedKmh = worldToKmh(worldPerSec);
}

function getPlayerProgress() {
  // Cumulative non-wrapping distance — what we sort by
  return (_playerLap * trackLen) + (P.pos || 0);
}

function getAIProgress(ai) {
  // Use the AI's totalDist (set in driving tick)
  return ai.totalDist;
}

// Puzzle brain

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

// Jump AI

function launchAIJump(ai, jumpObj, spr = {}) {
  if (ai.isAirborne || ai.jumpCooldown > 0) return false;

  const speed01 = clamp(Math.abs(ai.speed) / (C.NORMAL_MAX || 1), 0, 1);
  if (speed01 < (C.JUMP_MIN_SPEED_FRAC ?? 0.15)) return false;

  const lift         = spr.liftFactor    ?? jumpObj.liftFactor    ?? 1;
  const baseVy       = spr.jumpBaseVy    ?? jumpObj.jumpBaseVy    ?? C.JUMP_BASE_VY  ?? 380;
  const speedVy      = spr.jumpSpeedVy   ?? jumpObj.jumpSpeedVy   ?? C.JUMP_SPEED_VY ?? 420;
  const speedKickKmh = spr.speedKickKmh  ?? jumpObj.speedKickKmh  ?? 25;
  const forwardKick  = spr.forwardKick   ?? jumpObj.forwardKick   ?? 1.08;

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

  ai.airY  += ai.airVy * dt;
  ai.airVy -= C.JUMP_GRAVITY * dt;
  ai.speed *= Math.max(0.96, 1 - C.JUMP_AIR_DRAG * dt);

  if (ai.airY <= 0 && ai.airVy < 0) {
    ai.airY = 0;
    ai.airVy = 0;
    ai.isAirborne = false;
  }
}

// Scenery collision

function hitJumpAI(ai, o, dz) {
  const spr = JUMP_SPR[o.kind] || {};
  const hitBackZ  = o.hitBackZ  ?? spr.hitBackZ  ?? -90;
  const hitFrontZ = o.hitFrontZ ?? spr.hitFrontZ ?? 190;
  const hitHalfW  = o.hitHalfW  ?? spr.hitHalfW  ?? 0.48;
  const laneDiff  = Math.abs(ai.x - (o.offset || 0));

  if (dz > hitBackZ && dz < hitFrontZ && laneDiff < hitHalfW &&
      !ai.isAirborne && ai.jumpCooldown <= 0) {
    launchAIJump(ai, o, spr);
    return true;
  }
  return false;
}

function hitHurdleAI(ai, o, dz) {
  const ox = objX(o);
  const hurdleSize  = o.size ?? 0.45;
  const hurdleHalfW = hurdleSize * 0.46;
  const hurdleHalfZ = hurdleSize * 95;
  const aiHalfW = 0.30;
  const aiHalfZ = 95;

  if (ai.isAirborne && ai.airY > (o.clearAirHeight ?? 45)) return false;

  const xOverlap = ai.x + aiHalfW > ox - hurdleHalfW &&
                   ai.x - aiHalfW < ox + hurdleHalfW;
  const zOverlap = dz > -(hurdleHalfZ + aiHalfZ) &&
                   dz <  (hurdleHalfZ + aiHalfZ);
  if (!xOverlap || !zOverlap) return false;

  const push = ai.x < ox ? -1 : 1;
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

  for (let i = 0; i < sceneryObjs.length; i++) {
    const o = sceneryObjs[i];
    if (!o || o._dead) continue;
    if (!o.isHurdle && !o.isJump) continue;

    const dz = wrapDz(o.z, ai.z, len);
    if (dz < -260 || dz > 260) continue;

    if (o.isJump)   { hitJumpAI(ai, o, dz);   continue; }
    if (o.isHurdle) { hitHurdleAI(ai, o, dz); continue; }
  }
}

// Lane planning

function findBestLane(ai, sceneryObjs, len) {
  const SCAN_AHEAD = C.SEG_LEN * 14;
  const SCAN_BEHIND = -60;

  const blockers = [];
  for (let i = 0; i < sceneryObjs.length; i++) {
    const o = sceneryObjs[i];
    if (!o || o._dead) continue;
    if (!o.isHurdle && !o.isJump) continue;

    const dz = wrapDz(o.z, ai.z, len);
    if (dz < SCAN_BEHIND || dz > SCAN_AHEAD) continue;

    if (o.isJump) continue;  // jumps are good — don't avoid them

    blockers.push({
      x: objX(o),
      dz,
      halfW: (o.size ?? 0.45) * 0.46 + 0.22,
    });
  }
  if (!blockers.length) return null;

  let best = null;
  let bestScore = -Infinity;
  for (const lane of LANES) {
    let nearest = SCAN_AHEAD + 1;
    for (const b of blockers) {
      if (Math.abs(lane - b.x) < b.halfW && b.dz < nearest) nearest = b.dz;
    }
    const stickiness = -Math.abs(lane - ai.x) * 30;
    const score = nearest + stickiness;
    if (score > bestScore) { bestScore = score; best = lane; }
  }
  return best;
}

// Asphalt-style speed scaling based on player's average speed.
//
// position = the opponent's *current* rank (1 = leader)
// playerAvg = player's average km/h since race start
// returns scale multiplier in [0.92, 1.10]
function getRubberbandScale(position, playerAvg) {
  // Map rank → beat-speed threshold.
  // Top-ranked opponent uses the toughest threshold (92).
  const idx = clamp(position - 1, 0, OPPONENT_BEAT_SPEEDS.length - 1);
  const required = OPPONENT_BEAT_SPEEDS[idx];
  const diff = playerAvg - required;

  if (diff < -8) return 1.08;   // player is way below required → opponent pulls ahead
  if (diff <  0) return 1.03;
  if (diff > 10) return 0.94;   // player is way above required → opponent eases off
  if (diff >  4) return 0.97;
  return 1.0;
}

// AI driving tick

function tickAIDriving(ai, dt, sceneryObjs = []) {
  // Lock during countdown/start formation
  if (P.countdownActive || P.countdownT > 0 || P.starting || P.readyState) {
    ai.x = ai.formationX;
    ai.targetX = ai.formationX;
    ai.laneTargetX = ai.formationX;
    ai.speed = 0;
    return;
  }

  ai.thinkT += dt;
  ai.hitCooldown = Math.max(0, ai.hitCooldown - dt);
  ai.boostT     = Math.max(0, ai.boostT     - dt);

  const len   = ai.onRoad2 ? getTrackLen(2) : trackLen;
  const track = ai.onRoad2 ? 2 : 1;

  // Asphalt-style rubber-band: scale speed based on player's avg vs this opp's required.
  const rubberSpeedScale = getRubberbandScale(ai.position, P.avgSpeedKmh || 0);

  // Curve handling
  const curveAhead = getCurveAt(ai.z, track);
  const curveSteer = -curveAhead * (1.20 + ai.skill * 0.60);
  const curveSharpness = getCurveStrength(ai.z, track);
  const curveSpeedScale = clamp(1 - curveSharpness * 0.30, 0.65, 1.0);

  // Lane planning
  ai.laneChangeT -= dt;
  const bestLane = findBestLane(ai, sceneryObjs, len);

  if (bestLane !== null) {
    const currentLaneBlocked = Math.abs(bestLane - ai.laneTargetX) > 0.05;
    if (currentLaneBlocked || ai.laneChangeT <= 0) {
      ai.laneTargetX = bestLane;
      ai.laneChangeT = 0.6 + Math.random() * 0.6;
    }
  } else if (ai.laneChangeT <= 0) {
    ai.laneChangeT = 2.2 + Math.random() * 2.4;
    const driftLanes = [-0.40, 0, 0.40];
    const pick = driftLanes[(Math.random() * driftLanes.length) | 0];
    ai.laneTargetX = pick * (0.35 + ai.aggression * 0.45);
  }

  const wobble =
    Math.sin(ai.thinkT * (0.75 + ai.skill * 0.8) + ai.seed) *
    (0.012 + (1 - ai.skill) * 0.025);

  ai.targetX = clamp(ai.laneTargetX + curveSteer + wobble, -0.78, 0.78);

  // Steering
  const oldX = ai.x;
  const steerPower = 3.8 + ai.skill * 6.5;
  ai.x = smoothDamp(ai.x, ai.targetX, steerPower, dt);
  ai.x = clamp(ai.x, -0.90, 0.90);
  ai.steerVisual = clamp((ai.x - oldX) * 9, -1, 1);

  // Road edge correction
  if (Math.abs(ai.x) > 0.82) {
    const dirBack = ai.x > 0 ? -1 : 1;
    ai.x += dirBack * 0.055;
    ai.targetX += dirBack * 0.14;
    ai.laneTargetX = clamp(ai.laneTargetX + dirBack * 0.10, -0.65, 0.65);
    ai.speed *= Math.pow(0.80, dt * 60);
    ai.hitCooldown = Math.max(ai.hitCooldown, 0.25);
    ai.x = clamp(ai.x, -0.90, 0.90);
    ai.targetX = clamp(ai.targetX, -0.78, 0.78);
  }

  // Target speed
  let targetSpeed;
  if (ai.failedFakeRoad) {
    targetSpeed = ai.baseSpeed * 0.38 * rubberSpeedScale;
  } else if (ai.onRoad2) {
    targetSpeed = ai.baseSpeed * (ai.boss ? 1.08 : 0.98) * curveSpeedScale * rubberSpeedScale;
  } else if (ai.discoveredPuzzle && !ai.onRoad2) {
    ai.speed = -Math.abs(smoothDamp(Math.abs(ai.speed), ai.baseSpeed * 0.72, 1.5, dt));
    targetSpeed = null;
  } else {
    targetSpeed = ai.baseSpeed * curveSpeedScale * rubberSpeedScale;
  }

  if (targetSpeed !== null) {
    if (ai.boostT > 0) targetSpeed *= 1.10;
    if (ai.hitCooldown > 0.20) targetSpeed *= 0.65;
    ai.speed = smoothDamp(ai.speed, targetSpeed, 1.4, dt);
  }

  ai.speed = clamp(ai.speed, -ai.maxSpeed, ai.maxSpeed);

  // Move + lap tracking
  const before = ai.z;
  ai.z += ai.speed * dt;

  if (!ai.onRoad2 && ai.speed > 0) {
    let moved = ai.z - before;
    if (moved < -len * 0.5) {
      moved += len;
      ai.lap += 1;
    }
    if (moved > 0) {
      ai.forwardTravel += moved;
      ai.totalDist += moved;
    }
  } else if (ai.onRoad2 && ai.speed > 0) {
    let moved = ai.z - before;
    if (moved < -len * 0.5) {
      moved += len;
      ai.lap += 1;
    }
    if (moved > 0) {
      ai.road2Progress += moved;
      ai.totalDist += moved;
    }
  }

  if (ai.discoveredPuzzle && !ai.onRoad2 && ai.speed < 0) {
    ai.reverseDistance += Math.abs(ai.speed) * dt;
    if (ai.reverseDistance >= C.REVERSE_SECRET_DISTANCE * 0.95) {
      unlockAiRoad2(ai);
    }
  }

  ai.z = wrapZ(ai.z, len);
  ai.pos = ai.z;  // mirror for minimap consumers
}

// AI vs AI separation

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

// Player vs AI collision

function tickPlayerAICollision() {
  const playerZ = P.pos + (P.playerZ || 0);

  for (let i = 0; i < opponents.length; i++) {
    const ai = opponents[i];
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

// Ranking — dynamic. Updates ai.position every frame.

const _rankScratch = [];

export function updateRacePositions() {
  _rankScratch.length = 0;

  // Player entry
  _rankScratch.push({
    type: 'player',
    progress: getPlayerProgress(),
    ai: null,
  });

  // Opponents
  for (let i = 0; i < opponents.length; i++) {
    const ai = opponents[i];
    _rankScratch.push({
      type: 'ai',
      progress: getAIProgress(ai),
      ai,
    });
  }

  // Highest progress = position 1
  _rankScratch.sort((a, b) => b.progress - a.progress);

  raceOrder.length = 0;
  for (let i = 0; i < _rankScratch.length; i++) {
    const r = _rankScratch[i];
    const pos = i + 1;
    if (r.type === 'player') {
      P.racePosition = pos;
    } else {
      r.ai.position = pos;
      r.ai.rankNumber = pos;
    }
    raceOrder.push(r);
  }
}

// Main update — called once per physics tick from gameScene

export function updateOpponents(dt, sceneryObjs = []) {
  if (!opponents.length) return;
  if (P.endPhase >= 1) return;

  const d = dt > 0.05 ? 0.05 : dt;

  // 1) Player progress + avg-speed
  tickPlayerProgress(d);

  // 2) Per-opponent logic
  for (let i = 0; i < opponents.length; i++) {
    const ai = opponents[i];
    if (!ai.active) continue;

    tickPuzzleBrain(ai);
    tickAISceneryCollision(ai, sceneryObjs);
    tickAIDriving(ai, d, sceneryObjs);
    tickAIJump(ai, d);
    tickAISceneryCollision(ai, sceneryObjs);
  }

  // 3) Pairwise
  tickOpponentSeparation();
  tickPlayerAICollision();

  // 4) Rank — must run AFTER all movement
  updateRacePositions();
}