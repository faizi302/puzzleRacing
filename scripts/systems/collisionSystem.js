import { IMG } from '../visuals/objectRender.js';
import { P, applyCollisionImpact } from './roadSystem.js';
import { addNitroBottle } from '../player/player.js';
import { C } from '../configs/roadConfig.js';
import { trackLen } from '../core/roadMap.js';
import { playSfx } from '../core/audio.js';
import { addCoins } from '../player/playerData.js';

import { getActiveLevel } from '../core/activeLevel.js';
import { pressSymbolSwitch } from '../levels/level3/logic.js';
import { punishMemoryMistake } from '../levels/level4/logic.js';

import { rewardCheckpoint, punishCheckpoint } from '../levels/level2/logic.js';
import { triggerGatePass } from '../levels/level2/checkpointRender.js';
import { JUMP_SPR } from '../configs/sceneryConfig.js';
import { launchPlayerJump } from '../player/player.js';
import { onKeyCollected, onHurdleReached, onGapFall, respawnAfterWrongKey } from '../levels/level5/logic.js';

// ─── Effects atlas frame data ──────────────────────────
const BURST = [
  { x: 1920, y: 624, w: 127, h: 127 },
  { x: 1907, y: 752, w: 128, h: 128 },
  { x: 824, y: 814, w: 128, h: 128 },
  { x: 222, y: 935, w: 127, h: 127 },
  { x: 222, y: 1063, w: 126, h: 126 },
  { x: 1925, y: 251, w: 122, h: 122 },
  { x: 449, y: 1393, w: 100, h: 104 },
  { x: 668, y: 1376, w: 107, h: 112 },
  { x: 1257, y: 1340, w: 112, h: 119 },
  { x: 553, y: 1376, w: 114, h: 124 },
  { x: 214, y: 1311, w: 114, h: 126 },
  { x: 1925, y: 374, w: 117, h: 127 },
  { x: 1925, y: 1, w: 120, h: 126 },
  { x: 214, y: 1190, w: 122, h: 120 },
  { x: 1023, y: 1457, w: 123, h: 107 },
  { x: 898, y: 1370, w: 124, h: 107 },
];

const SKID = [
  { x: 1172, y: 1027, w: 401, h: 113 },
  { x: 411, y: 934, w: 408, h: 115 },
  { x: 411, y: 814, w: 412, h: 119 },
  { x: 1194, y: 543, w: 418, h: 121 },
  { x: 1194, y: 665, w: 415, h: 120 },
  { x: 1187, y: 907, w: 414, h: 119 },
  { x: 1187, y: 786, w: 411, h: 120 },
  { x: 1, y: 814, w: 409, h: 120 },
];

const CHARGE = [
  { x: 1838, y: 881, w: 197, h: 197 },
  { x: 1, y: 935, w: 220, h: 196 },
  { x: 1610, y: 754, w: 227, h: 200 },
  { x: 1602, y: 955, w: 225, h: 201 },
  { x: 1814, y: 1286, w: 223, h: 197 },
  { x: 1613, y: 543, w: 220, h: 210 },
  { x: 963, y: 778, w: 223, h: 206 },
  { x: 949, y: 985, w: 222, h: 203 },
  { x: 1585, y: 1356, w: 219, h: 199 },
  { x: 1, y: 1132, w: 212, h: 197 },
  { x: 1398, y: 1141, w: 191, h: 196 },
];

const COIN_SPARK = [
  { x: 1139, y: 1340, w: 117, h: 116 },
  { x: 1925, y: 128, w: 122, h: 122 },
  { x: 1925, y: 502, w: 121, h: 121 },
  { x: 789, y: 1171, w: 121, h: 120 },
  { x: 1, y: 1330, w: 119, h: 120 },
  { x: 779, y: 1292, w: 118, h: 121 },
  { x: 121, y: 1438, w: 115, h: 122 },
  { x: 1, y: 1451, w: 113, h: 121 },
  { x: 329, y: 1393, w: 119, h: 118 },
  { x: 1147, y: 1460, w: 125, h: 103 },
  { x: 1141, y: 1565, w: 128, h: 98 },
  { x: 1402, y: 1529, w: 128, h: 99 },
  { x: 1273, y: 1529, w: 128, h: 100 },
  { x: 883, y: 1478, w: 128, h: 101 },
  { x: 1012, y: 1565, w: 128, h: 99 },
  { x: 1531, y: 1556, w: 128, h: 97 },
];

export let parts = [];

export function resetParts() {
  parts = [];
}

export function spawnCrash(x, y) {
  parts.push({
    type: 'burst', frames: BURST, frame: 0, fps: 32,
    x, y, vx: 0, vy: -0.4,
    life: 1.0, decay: 0.038, size: 140, growth: 1.6, alpha0: 0.95,
  });

  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2;
    parts.push({
      type: 'burst', frames: BURST,
      frame: Math.floor(Math.random() * BURST.length), fps: 24,
      x: x + Math.cos(a) * 18, y: y + Math.sin(a) * 12,
      vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6 - 0.6,
      life: 1.0, decay: 0.052,
      size: 80 + Math.random() * 40,
      growth: 1.3, alpha0: 0.75,
    });
  }
}

export function spawnSkid(x, y) {
  parts.push({
    type: 'skid', frames: SKID,
    frame: Math.floor(Math.random() * SKID.length), fps: 0,
    x, y, vx: 0, vy: 0,
    life: 1.0, decay: 0.018, size: 110, growth: 1.0, alpha0: 0.55,
  });
}

export function spawnPickup(x, y, isBooster = false) {
  parts.push({
    type: 'shine',
    frames: isBooster ? CHARGE : COIN_SPARK,
    frame: 0, fps: 30,
    x, y, vx: 0, vy: -0.8,
    life: 1.0, decay: 0.040,
    size: isBooster ? 150 : 120,
    growth: 1.6,
    alpha0: isBooster ? 1.0 : 0.95,
  });
}

export function spawnKeyPickup(x, y) {
  parts.push({
    type: 'shine', frames: CHARGE, frame: 0, fps: 30,
    x, y, vx: 0, vy: -1.2,
    life: 1.2, decay: 0.030, size: 200, growth: 2.0, alpha0: 1.0,
  });
}

export function tickParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];

    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.vx *= 0.96;
    p.life -= p.decay;

    if (p.fps > 0) {
      p.frameT = (p.frameT || 0) + dt;
      const step = 1 / p.fps;
      while (p.frameT >= step) {
        p.frameT -= step;
        p.frame = Math.min(p.frames.length - 1, p.frame + 1);
      }
    }

    if (p.life <= 0) parts.splice(i, 1);
  }
}

export function drawParts(ctx) {
  if (!IMG.effects?.ready) return;

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const f = p.frames[Math.min(p.frame, p.frames.length - 1)];
    if (!f) continue;

    const grow = 1 + (1 - p.life) * (p.growth - 1);
    const w = p.size * grow;
    const h = w * (f.h / f.w);
    const a = Math.max(0, p.alpha0 * p.life);

    ctx.save();
    ctx.globalAlpha = a;
    if (p.type === 'shine') ctx.globalCompositeOperation = 'lighter';

    ctx.drawImage(
      IMG.effects,
      f.x, f.y, f.w, f.h,
      p.x - w / 2, p.y - h / 2, w, h
    );

    ctx.restore();
  }
}

const HIT = {
  PLAYER_Z_BACK: -135,
  PLAYER_Z_AHEAD: 210,
};

const PREFILTER_Z = 320;

function safeSfx(name, opts) {
  try { playSfx(name, opts); } catch (e) {}
}

function wrapDz(objZ, playerZ) {
  const len = trackLen;
  if (!len) return objZ - playerZ;
  const half = len * 0.5;
  const dz = objZ - playerZ;
  if (dz < -half) return dz + len;
  if (dz >  half) return dz - len;
  return dz;
}

function isPickup(o) {
  return (
    o?.isCoin ||
    o?.isBooster ||
    o?.isKey ||
    o?.isPuzzleSwitch
  );
}

function resetPickupWhenBehind(o, dz) {
  if (!o || !o._dead) return;
  if (o.isCoin || o.isKey) return;
  if (o.isBooster && dz < -320) {
    o._dead = false;
  }
}

function objCat(o) {
  if (!o || o._dead) return null;
  if (o.isMonster) return "hurdle";
  if (o.isPressurePlate) return null;
  if (o.isFakeWall) return null;
  if (o.isFakeDoor) return null;
  if (o.isRealKey) {
    if (o.hidden) return null;
    return 'realkey';
  }

  if (o.isKey) return 'key';
  if (o.isCoin) return 'coin';
  if (o.isBooster) return 'booster';
  if (o.isPuzzleSwitch) return 'puzzle';

  if (o.kind === 'bridge') return null;

  if (o.kind === 'rallyArch' || o.kind === 'HayArch') {
    return null;
  }

  if (
    o.overhead ||
    o.kind === 'tunnel' ||
    o.kind === 'woodArch' ||
    o.kind === 'stoneArch' ||
    o.kind === 'arch'
  ) {
    return 'arch';
  }

  if (o.isHurdle) return 'hurdle';

  if (
    o.kind === 'rockBig' ||
    o.kind === 'rockLow' ||
    o.kind === 'rock' ||
    o.kind === 'totem'
  ) {
    return 'hardSide';
  }

  return 'sideScenery';
}

function objLateralX(o) {
  if (
    o.isCoin ||
    o.isBooster ||
    o.isKey ||
    o.isRealKey ||
    o.isPuzzleSwitch
  ) return o.offset || 0;
  if (o.isHurdle) return o.offset || 0;
  return (o.side || 0) * (o.offset || 1.0);
}

let _frameNow = 0;

function canFx(o, ms = 450) {
  if (o._fxCooldown && _frameNow - o._fxCooldown < ms) return false;
  o._fxCooldown = _frameNow;
  return true;
}

function clampPlayerX() {
  P.playerX = Math.max(-1.32, Math.min(1.32, P.playerX || 0));
}

function resolveTunnelGateCollision(o, dz, objX, screenAnchorX, screenAnchorY) {
  const px = P.playerX || 0;
  const openingHalfW = o.openingHalfW ?? 0.88;
  const tunnelOuterHalfW = o.outerHalfW ?? 1.25;
  const playerHalfW = 0.22;

  const hitBackZ = o.hitBackZ ?? -70;
  const hitFrontZ = o.hitFrontZ ?? 85;

  const zHit = dz > hitBackZ && dz < hitFrontZ;
  if (!zHit) return;

  const dist = Math.abs(px - objX);
  if (dist < openingHalfW - playerHalfW) return;

  const hitPillar =
    dist > openingHalfW - playerHalfW &&
    dist < tunnelOuterHalfW + playerHalfW;
  if (!hitPillar) return;

  const pushDir = px < objX ? 1 : -1;

  P.pos -= 42;
  if (P.pos < 0) P.pos += trackLen;

  P.speed = Math.min(P.speed * 0.20, C.NORMAL_MAX * 0.18);

  clampPlayerX();

  try { applyCollisionImpact('medium', pushDir); } catch (e) {}

  if (canFx(o, 450)) {
    spawnSkid(screenAnchorX, screenAnchorY + 20);
    safeSfx('screech', { volume: 0.18 });
  }
}

function resolveSideSceneryCollision(o, cat, dz, screenAnchorX, screenAnchorY) {
  if (dz < -45 || dz > 80) return;

  const px = P.playerX || 0;
  const side = o.side || 0;

  if (o.noCollision && !o.isBoundaryPole) return;

  const edge = o.isBoundaryPole ? 1.20 : 1.24;

  const hitLeft = side < 0 && px < -edge;
  const hitRight = side > 0 && px > edge;
  if (!hitLeft && !hitRight) return;

  const pushDir = hitLeft ? 1 : -1;

  P.pos -= 0.2;
  if (P.pos < 0) P.pos += trackLen;

  P.playerX = px + pushDir * 0.001;
  clampPlayerX();

  const normalMax = C.NORMAL_MAX || C.MAX_SPEED || 70;
  P.speed = Math.min(P.speed * 0.98, normalMax);

  spawnCrash(
    screenAnchorX + (hitLeft ? -35 : 35),
    screenAnchorY - 20
  );

  if (canFx(o, 250)) {
    safeSfx('crash');
  }
}

const HURDLE_SPR_SCALE = {
  gorillaRock: 1.00,
  woodFence: 0.65,
  stoneWall: 1.00,
  stoneBlock: 1.00,
};

function resolveHurdleCollision(o, dz, objX, screenAnchorX, screenAnchorY) {
  const sprScale = HURDLE_SPR_SCALE[o.kind] ?? 1.00;
  const hurdleSize = o.size ?? 0.45;
  const hurdleHalfW = hurdleSize * sprScale * 0.5 * 0.82;
  const hurdleHalfZ = hurdleSize * sprScale * 80;

  const airY = P.airY || 0;
  const clearAirHeight = o.clearAirHeight ?? 55;

  if (P.isAirborne && airY > clearAirHeight) return;

  const playerHalfW = 0.28;
  const playerHalfZ = 80;

  const xOverlap = (P.playerX + playerHalfW) > (objX - hurdleHalfW) &&
                   (P.playerX - playerHalfW) < (objX + hurdleHalfW);
  const zOverlap = dz > -(hurdleHalfZ + playerHalfZ) &&
                   dz <  (hurdleHalfZ + playerHalfZ);
  if (!xOverlap || !zOverlap) return;

  const penXraw = (playerHalfW + hurdleHalfW) - Math.abs(P.playerX - objX);
  const penZraw = (playerHalfZ + hurdleHalfZ) - Math.abs(dz);

  const penXnorm = penXraw / (playerHalfW + hurdleHalfW);
  const penZnorm = penZraw / (playerHalfZ + hurdleHalfZ);

  const lateralPushDir = P.playerX < objX ? -1 : 1;
  const zPushSign = dz > 0 ? -1 : 1;

  if (penXnorm <= penZnorm) {
    P.playerX += lateralPushDir * (penXraw + 0.02);
    clampPlayerX();

    const normalMax = C.NORMAL_MAX || 70;
    P.speed = Math.min(P.speed * 0.60, normalMax * 0.50);

    try { applyCollisionImpact('medium', lateralPushDir); } catch (e) {}

    if (canFx(o, 350)) {
      spawnCrash(screenAnchorX + lateralPushDir * 60, screenAnchorY - 30);
      safeSfx('crash', { volume: 0.28 });
    }
  } else {
    const posDelta = (penZraw + C.SEG_LEN * 0.18) * zPushSign;
    P.pos += posDelta;
    if (P.pos < 0) P.pos += trackLen;
    while (P.pos >= trackLen) P.pos -= trackLen;

    const normalMax = C.NORMAL_MAX || 70;
    const sign = P.speed < 0 ? -1 : 1;
    P.speed = sign * Math.min(Math.abs(P.speed) * 0.45, normalMax * 0.38);

    P.playerX += lateralPushDir * 0.04;
    clampPlayerX();

    try { applyCollisionImpact('medium', lateralPushDir); } catch (e) {}

    if (canFx(o, 480)) {
      spawnCrash(screenAnchorX, screenAnchorY - 40);
      safeSfx('crash', { volume: 0.12 });
    }
  }
}

function _handleLevel5KeyCollect(o, sceneryObjs, lvl, screenAnchorX, screenAnchorY) {
  const sectionIndex = o.sectionIndex;
  onKeyCollected(lvl.puzzleState, sectionIndex, o.laneIndex);

  const hurdleOpen = lvl.puzzleState.hurdleOpen[sectionIndex];
  let foundRamp = false;

  for (let i = 0; i < sceneryObjs.length; i++) {
    const x = sceneryObjs[i];
    if (x.sectionIndex !== sectionIndex) continue;

    if (x.isKey) {
      x._dead = true;
    } else if (hurdleOpen && x.isJumpRamp) {
      x.hidden = false;
      x._dead = false;
      x.forceVisible = true;
      foundRamp = true;
    }
  }

  if (hurdleOpen && !foundRamp) {
    console.warn('L5 RAMP NOT FOUND for section:', sectionIndex);
  }

  spawnKeyPickup(screenAnchorX, screenAnchorY - 100);
  safeSfx('key');
}

export function checkSceneryCollisions(sceneryObjs, screenAnchorX, screenAnchorY) {
  if (!sceneryObjs || !sceneryObjs.length) return;
  if (P.endPhase >= 1) return;

  // Cache frame time once, used by canFx() inside this scan
  _frameNow = performance.now();

  const playerZ = P.pos + (P.playerZ || 0);
  const px = P.playerX || 0;
  const len = trackLen;
  const half = len > 0 ? len * 0.5 : 0;

  for (let i = 0; i < sceneryObjs.length; i++) {
    const o = sceneryObjs[i];
    if (!o) continue;

    // Prefilter — compute raw delta first. If outside the wide range AND
    // not near a wrap boundary, skip without doing the wrap math.
    const rawDz = o.z - playerZ;
    let dz = rawDz;
    if (len > 0) {
      if (rawDz < -half) dz = rawDz + len;
      else if (rawDz > half) dz = rawDz - len;
    }

    // Quick reject — anything beyond ~PREFILTER_Z is irrelevant to player
    // collision/pickup, BUT we still need to call resetPickupWhenBehind
    // for boosters that are far behind. Inline that check.
    if (dz < -PREFILTER_Z || dz > PREFILTER_Z) {
      if (o._dead && o.isBooster && dz < -320) o._dead = false;
      continue;
    }

    resetPickupWhenBehind(o, dz);

    const cat = objCat(o);
    if (!cat && !o.isCheckpoint) continue;

    const objX = objLateralX(o);

    if (cat === 'key') {
      const hitKey =
        Math.abs(px - objX) < 0.46 &&
        dz < 280 &&
        dz > -280;

      if (hitKey) {
        o._dead = true;
        P.keysCollected++;

        const lvl = getActiveLevel();

        if (lvl?.id === 'level5' && lvl.puzzleState) {
          _handleLevel5KeyCollect(o, sceneryObjs, lvl, screenAnchorX, screenAnchorY);
        } else {
          spawnKeyPickup(screenAnchorX, screenAnchorY - 100);
          safeSfx('key');
        }
      }
      continue;
    }

    if (dz < HIT.PLAYER_Z_BACK || dz > HIT.PLAYER_Z_AHEAD) continue;

    // ── REAL KEY ──
    if (cat === 'realkey') {
      if (Math.abs(px - objX) < 0.42 && dz < 100 && dz > -120) {
        o._dead = true;
        P.keysCollected++;
        spawnKeyPickup(screenAnchorX, screenAnchorY - 100);
        safeSfx('key');

        const lvl = getActiveLevel();
        if (lvl && typeof lvl.collectKey === 'function') {
          try { lvl.collectKey(); } catch (e) {}
        } else {
          P.ghostKeyCollected = true;
        }
      }
      continue;
    }

    // ── COIN ──
    if (cat === 'coin') {
      if (Math.abs(px - objX) < 0.10 && dz < 30 && dz > -45) {
        o._dead = true;
        addCoins(1);
        spawnPickup(screenAnchorX, screenAnchorY - 80);
        safeSfx('coin', { volume: 0.22 });
      }
      continue;
    }

    if (o.hidden) continue;

    // ── LEVEL 3 PUZZLE SWITCH ──
    if (cat === 'puzzle') {
      if (Math.abs(px - objX) < 0.12 && dz < 30 && dz > -45) {
        if (o._pressed) continue;

        o._pressed = true;
        o._dead = true;

        const result = pressSymbolSwitch(o.symbol);
        spawnPickup(screenAnchorX, screenAnchorY - 80, false);

        if (result?.spawnTraps) {
          // Single pass over sceneryObjs that handles both reveals
          for (let j = 0; j < sceneryObjs.length; j++) {
            const t = sceneryObjs[j];
            if (t.isPuzzleTrap) t.hidden = false;
            if (t.isPuzzleSwitch) {
              t._pressed = false;
              t._dead = false;
            }
          }
        }
      }
      continue;
    }

    // ── BOOSTER ──
    if (cat === 'booster') {
      if (Math.abs(px - objX) < 0.45 && dz < 100 && dz > -120) {
        const stored = addNitroBottle();
        if (!stored) continue;

        o._dead = true;
        spawnPickup(screenAnchorX, screenAnchorY - 90, true);
      }
      continue;
    }

    // ── ARCH / TUNNEL ──
    if (cat === 'arch') {
      resolveTunnelGateCollision(o, dz, objX, screenAnchorX, screenAnchorY);
      continue;
    }

    // ── JUMP RAMP ──
    if (o.isJump) {
      if (o.hidden) continue;

      const spr = JUMP_SPR[o.kind] || {};
      const jumpDz = wrapDz(o.z, playerZ);

      const hitBackZ = o.hitBackZ ?? spr.hitBackZ ?? -70;
      const hitFrontZ = o.hitFrontZ ?? spr.hitFrontZ ?? 160;
      const hitHalfW = o.hitHalfW ?? spr.hitHalfW ?? 0.42;

      const laneDiff = Math.abs((P.playerX || 0) - (o.offset || 0));

      const hitJump =
        jumpDz > hitBackZ &&
        jumpDz < hitFrontZ &&
        laneDiff < hitHalfW &&
        !P.isAirborne &&
        (P._jumpCooldown || 0) <= 0;

      if (!hitJump) continue;

      if (o.isMemoryPlatform && o.isFakePlatform) {
        punishMemoryMistake();
        o.memoryHidden = false;
        o.justShifted = true;
        continue;
      }

      launchPlayerJump(o, spr);
      continue;
    }

    // ── LEVEL 2 CHECKPOINT ──
    if (o.isCheckpoint) {
      if (o.passed) continue;

      const laneDiff = Math.abs((P.playerX || 0) - (o.offset || 0));

      if (laneDiff < 0.36 && dz > -120 && dz < 220) {
        triggerGatePass(o);

        if (o.isSafeGate) {
          rewardCheckpoint();
          spawnPickup(screenAnchorX, screenAnchorY - 80, false);
        } else {
          punishCheckpoint();
          spawnPickup(screenAnchorX, screenAnchorY - 80, true);
        }
      }
      continue;
    }

    // ── HURDLE ──
    if (cat === 'hurdle') {
      const lvl = getActiveLevel();

      if (lvl?.id === 'level5' && lvl.puzzleState && o.sectionIndex != null) {
        const open = lvl.puzzleState.hurdleOpen[o.sectionIndex];

        if (open && P.isAirborne) continue;

        if (open && !P.isAirborne) {
          resolveHurdleCollision(o, dz, objX, screenAnchorX, screenAnchorY);
          continue;
        }

        const pickedForSection = lvl.puzzleState.keyPicked[o.sectionIndex];
        const retryUsed = lvl.puzzleState.retryUsed === true;
        const retrySection = lvl.puzzleState.retrySection;

        if (
          pickedForSection === null &&
          retryUsed &&
          retrySection === o.sectionIndex
        ) {
          continue;
        }

        if (pickedForSection === 'wrong' && !retryUsed) {
          // Single pass over sceneryObjs that collects keys + ramps for
          // this section AND records the earliest key z.
          let keyZ = null;
          // Reuse the temp arrays — these are short-lived, scoped to the
          // collision callback, so per-frame allocation here is acceptable.
          const sectionKeys = [];
          const sectionRamps = [];

          for (let j = 0; j < sceneryObjs.length; j++) {
            const obj = sceneryObjs[j];
            if (obj.sectionIndex !== o.sectionIndex) continue;
            if (obj.isKey) {
              sectionKeys.push(obj);
              if (keyZ == null) keyZ = obj.z;
            }
            if (obj.isJumpRamp) sectionRamps.push(obj);
          }

          if (keyZ != null) {
            const backOffset = 60 * C.SEG_LEN;
            let newPos = keyZ - backOffset;
            while (newPos < 0) newPos += trackLen;
            while (newPos >= trackLen) newPos -= trackLen;
            P.pos = newPos;
          }

          P.playerX = 0;
          P.speed = 0;
          P.airY = 0;
          P.isAirborne = false;
          P.endPhase = 0;
          P.endTime = 0;
          P.raceFailed = false;
          P._failReason = null;

          for (let k = 0; k < sectionKeys.length; k++) {
            sectionKeys[k]._dead = false;
          }

          for (let r = 0; r < sectionRamps.length; r++) {
            const rr = sectionRamps[r];
            rr.hidden = true;
            rr._dead = false;
            rr.forceVisible = false;
          }

          respawnAfterWrongKey(lvl.puzzleState, o.sectionIndex);

          if (canFx(o, 600)) {
            spawnCrash(screenAnchorX, screenAnchorY - 30);
            safeSfx('crash', { volume: 0.20 });
          }

          continue;
        }

        onHurdleReached(lvl.puzzleState, o.sectionIndex);

        P.raceFailed = true;
        P._failReason = lvl.puzzleState.failReason || 'Locked hurdle hit';
        P.endPhase = -1;
        P.endTime = 0;
        P.speed = Math.max(0, P.speed * 0.15);
        continue;
      }

      resolveHurdleCollision(o, dz, objX, screenAnchorX, screenAnchorY);
      continue;
    }

    // ── SIDE OBJECTS ──
    if (cat === 'sideScenery' || cat === 'hardSide') {
      resolveSideSceneryCollision(o, cat, dz, screenAnchorX, screenAnchorY);
    }
  }
}

let _scrapeWasOn = false;

export function tickEdgeScrape() {
  const isScraping = P.isOffTrack && P.speed > C.OFFRD_LIM * 0.5;

  if (isScraping && !_scrapeWasOn) {
    safeSfx('screech', { loop: true, volume: 0.04, key: 'screech' });
    _scrapeWasOn = true;
  } else if (!isScraping && _scrapeWasOn) {
    safeSfx('screech', { stop: true, key: 'screech' });
    _scrapeWasOn = false;
  }
}