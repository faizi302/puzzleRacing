// ═══════════════════════════════════════════════════════
// OPPONENT SYSTEM — AI racers + collision + jumps + ranking
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
  { id:'op_1', name:'RAX',  team:'red',    type:'normal',   number:2, x:-0.45, z:420,  speedKmh:92,  skill:0.62, aggression:0.35 },
  { id:'op_2', name:'BOLT', team:'blue',   type:'normal',   number:3, x: 0.35, z:720,  speedKmh:96,  skill:0.68, aggression:0.45 },
  { id:'op_3', name:'NOVA', team:'green',  type:'fakeFast', number:4, x:-0.15, z:1040, speedKmh:108, skill:0.55, aggression:0.65 },
  { id:'op_4', name:'SYNC', team:'purple', type:'smart',    number:5, x: 0.55, z:1360, speedKmh:90,  skill:0.82, aggression:0.55 },
  { id:'boss', name:'ZERO', team:'silver', type:'rival',    number:6, x: 0.05, z:1720, speedKmh:101, skill:0.92, aggression:0.78, boss:true },
];

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

function getCurveAt(z, track = 1) {
  const a = findSegOnTrack(z, track)?.curve || 0;
  const b = findSegOnTrack(z + C.SEG_LEN * 8, track)?.curve || 0;
  const c = findSegOnTrack(z + C.SEG_LEN * 18, track)?.curve || 0;
  return a * 0.55 + b * 0.30 + c * 0.15;
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
    laneChangeT: 0,
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

  return ai.forwardTravel;
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
// ═══════════════════════════════════════════════════════
function tickAIDriving(ai, dt) {
  ai.thinkT += dt;
  ai.hitCooldown = Math.max(0, ai.hitCooldown - dt);
  ai.boostT = Math.max(0, ai.boostT - dt);

  const len = ai.onRoad2 ? getTrackLen(2) : trackLen;
  const track = ai.onRoad2 ? 2 : 1;
  const curve = getCurveAt(ai.z, track);

  const curveCompensation = -curve * (0.50 + ai.skill * 0.56);

  const wobble =
    Math.sin(ai.thinkT * (0.8 + ai.skill) + ai.seed) *
    (0.025 + (1 - ai.skill) * 0.075);

  ai.laneChangeT -= dt;

  if (ai.laneChangeT <= 0) {
    ai.laneChangeT = 1.5 + Math.random() * 2.5;
    ai.avoidX = (Math.random() - 0.5) * ai.aggression * 0.28;
  }

  // keep target inside road
  ai.targetX = clamp(
    curveCompensation + wobble + ai.avoidX,
    -0.62,
    0.62
  );

  const oldX = ai.x;
  const steerPower = 3.2 + ai.skill * 5.2;

  ai.x = smoothDamp(ai.x, ai.targetX, steerPower, dt);
  ai.x = clamp(ai.x, -0.92, 0.92);

  ai.steerVisual = clamp((ai.x - oldX) * 10, -1, 1);

  // Strong road-side collision / correction
  if (Math.abs(ai.x) > 0.82) {
    const dirBack = ai.x > 0 ? -1 : 1;

    ai.x += dirBack * 0.045;
    ai.targetX += dirBack * 0.10;

    ai.speed *= Math.pow(0.78, dt * 60);
    ai.hitCooldown = Math.max(ai.hitCooldown, 0.25);

    ai.x = clamp(ai.x, -0.90, 0.90);
    ai.targetX = clamp(ai.targetX, -0.62, 0.62);
  }

  if (ai.failedFakeRoad) {
    ai.speed = smoothDamp(ai.speed, ai.baseSpeed * 0.38, 1.8, dt);
  } else if (ai.onRoad2) {
    ai.speed = smoothDamp(ai.speed, ai.baseSpeed * (ai.boss ? 1.08 : 0.98), 1.2, dt);
  } else if (ai.discoveredPuzzle && !ai.onRoad2) {
    ai.speed = -Math.abs(
      smoothDamp(Math.abs(ai.speed), ai.baseSpeed * 0.72, 1.5, dt)
    );
  } else {
    ai.speed = smoothDamp(ai.speed, ai.baseSpeed, 1.0, dt);
  }

  ai.speed = clamp(ai.speed, -ai.maxSpeed, ai.maxSpeed);

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
  const all = [
    {
      id: 'player',
      name: 'YOU',
      isPlayer: true,
      raceProgress: getPlayerProgress(),
    },

    ...opponents.map(ai => ({
      id: ai.id,
      name: ai.name,
      isPlayer: false,
      ai,
      raceProgress: getAIProgress(ai),
    })),
  ];

  all.sort((a, b) => b.raceProgress - a.raceProgress);

  raceOrder = all;

  for (let i = 0; i < all.length; i++) {
    if (all[i].isPlayer) {
      P.racePosition = i + 1;
    } else {
      all[i].ai.position = i + 1;
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

    tickAIDriving(ai, d);
    tickAIJump(ai, d);

    // after movement: catches fast movement crossing hurdles/jumps
    tickAISceneryCollision(ai, sceneryObjs);

    tickRubberBand(ai, d);
  }

  tickOpponentSeparation();
  tickPlayerAICollision();
  updateRacePositions();
}