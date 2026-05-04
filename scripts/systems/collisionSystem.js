// ═══════════════════════════════════════════════════════
// COLLISION SYSTEM — Pickups + solid scenery collision
// Tunnel / arch now works as REAL BLOCKER:
//   ✅ tunnel never disappears
//   ✅ player cannot pass through center line
//   ✅ player is pushed back + sideways
//   ✅ if player drives again in same line, collision happens again
// ═══════════════════════════════════════════════════════
import { IMG } from '../visuals/objectRender.js';
import { P, applyCollisionImpact, activateNitro } from './roadSystem.js';
import { C } from '../configs/roadConfig.js';
import { trackLen } from '../core/roadMap.js';
import { playSfx } from '../core/audio.js';

// ─── Effects atlas frame data ──────────────────────────
const BURST = [
  { x:1920, y: 624, w:127, h:127 },
  { x:1907, y: 752, w:128, h:128 },
  { x: 824, y: 814, w:128, h:128 },
  { x: 222, y: 935, w:127, h:127 },
  { x: 222, y:1063, w:126, h:126 },
  { x:1925, y: 251, w:122, h:122 },
  { x: 449, y:1393, w:100, h:104 },
  { x: 668, y:1376, w:107, h:112 },
  { x:1257, y:1340, w:112, h:119 },
  { x: 553, y:1376, w:114, h:124 },
  { x: 214, y:1311, w:114, h:126 },
  { x:1925, y: 374, w:117, h:127 },
  { x:1925, y:   1, w:120, h:126 },
  { x: 214, y:1190, w:122, h:120 },
  { x:1023, y:1457, w:123, h:107 },
  { x: 898, y:1370, w:124, h:107 },
];

const SKID = [
  { x:1172, y:1027, w:401, h:113 },
  { x: 411, y: 934, w:408, h:115 },
  { x: 411, y: 814, w:412, h:119 },
  { x:1194, y: 543, w:418, h:121 },
  { x:1194, y: 665, w:415, h:120 },
  { x:1187, y: 907, w:414, h:119 },
  { x:1187, y: 786, w:411, h:120 },
  { x:   1, y: 814, w:409, h:120 },
];

const CHARGE = [
  { x:1838, y: 881, w:197, h:197 },
  { x:   1, y: 935, w:220, h:196 },
  { x:1610, y: 754, w:227, h:200 },
  { x:1602, y: 955, w:225, h:201 },
  { x:1814, y:1286, w:223, h:197 },
  { x:1613, y: 543, w:220, h:210 },
  { x: 963, y: 778, w:223, h:206 },
  { x: 949, y: 985, w:222, h:203 },
  { x:1585, y:1356, w:219, h:199 },
  { x:   1, y:1132, w:212, h:197 },
  { x:1398, y:1141, w:191, h:196 },
];

// ─── Particle pool ─────────────────────────────────────
export let parts = [];

export function resetParts() {
  parts = [];
}

export function spawnCrash(x, y) {
  parts.push({
    type:'burst',
    frames:BURST,
    frame:0,
    fps:32,
    x,
    y,
    vx:0,
    vy:-0.4,
    life:1.0,
    decay:0.038,
    size:140,
    growth:1.6,
    alpha0:0.95,
  });

  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2;

    parts.push({
      type:'burst',
      frames:BURST,
      frame:Math.floor(Math.random() * BURST.length),
      fps:24,
      x:x + Math.cos(a) * 18,
      y:y + Math.sin(a) * 12,
      vx:Math.cos(a) * 1.6,
      vy:Math.sin(a) * 1.6 - 0.6,
      life:1.0,
      decay:0.052,
      size:80 + Math.random() * 40,
      growth:1.3,
      alpha0:0.75,
    });
  }
}

export function spawnSkid(x, y) {
  parts.push({
    type:'skid',
    frames:SKID,
    frame:Math.floor(Math.random() * SKID.length),
    fps:0,
    x,
    y,
    vx:0,
    vy:0,
    life:1.0,
    decay:0.018,
    size:110,
    growth:1.0,
    alpha0:0.55,
  });
}

export function spawnPickup(x, y, isBooster = false) {
  parts.push({
    type:'shine',
    frames:CHARGE,
    frame:0,
    fps:30,
    x,
    y,
    vx:0,
    vy:-0.8,
    life:1.0,
    decay:0.040,
    size:isBooster ? 150 : 90,
    growth:1.6,
    alpha0:isBooster ? 1.0 : 0.85,
  });
}

export function spawnKeyPickup(x, y) {
  parts.push({
    type:'shine',
    frames:CHARGE,
    frame:0,
    fps:30,
    x,
    y,
    vx:0,
    vy:-1.2,
    life:1.2,
    decay:0.030,
    size:200,
    growth:2.0,
    alpha0:1.0,
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

  for (const p of parts) {
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
      f.x,
      f.y,
      f.w,
      f.h,
      p.x - w / 2,
      p.y - h / 2,
      w,
      h
    );

    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════
// COLLISION HELPERS
// ═══════════════════════════════════════════════════════
const HIT = {
  PLAYER_Z_BACK: -135,
  PLAYER_Z_AHEAD: 210,
};

function safeSfx(name, opts) {
  try {
    playSfx(name, opts);
  } catch (e) {}
}

function wrapDz(objZ, playerZ) {
  let dz = objZ - playerZ;

  while (dz < -trackLen / 2) dz += trackLen;
  while (dz >  trackLen / 2) dz -= trackLen;

  return dz;
}

function objCat(o) {
  if (!o || o._dead) return null;

  if (o.isKey) return 'key';
  if (o.isCoin) return 'coin';
  if (o.isBooster) return 'booster';

  if (o.kind === 'bridge') return null;

  if (
    o.overhead ||
    o.kind === 'tunnel' ||
    o.kind === 'woodArch' ||
    o.kind === 'stoneArch' ||
    o.kind === 'arch'
  ) {
    return 'arch';
  }

  // On-road hurdles have their own positional collision logic.
  // Must be checked BEFORE the generic sideScenery/hardSide fallback.
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
  if (o.isCoin || o.isBooster || o.isKey) return o.offset || 0;
  // Hurdles store their lane position directly in offset (no side multiplier).
  if (o.isHurdle) return o.offset || 0;
  return (o.side || 0) * (o.offset || 1.0);
}

function canFx(o, ms = 450) {
  const now = performance.now();

  if (o._fxCooldown && now - o._fxCooldown < ms) return false;

  o._fxCooldown = now;
  return true;
}

function clampPlayerX() {
  P.playerX = Math.max(-1.18, Math.min(1.18, P.playerX || 0));
}

function resolveTunnelGateCollision(o, dz, objX, screenAnchorX, screenAnchorY) {
  const px = P.playerX || 0;

  // Tunnel opening in center where player is allowed to pass
  const openingHalfW = o.openingHalfW ?? 0.62;

  // Pillar/body collision area outside opening
  const tunnelOuterHalfW = o.outerHalfW ?? 1.15;
  const playerHalfW = 0.26;

  const zHit = dz > -95 && dz < 115;
  if (!zHit) return;

  const dist = Math.abs(px - objX);

  // ✅ Player is inside tunnel gap, allow passing
  if (dist < openingHalfW - playerHalfW) {
    return;
  }

  // ✅ Collision only with left/right tunnel pillars
  const hitPillar =
    dist > openingHalfW - playerHalfW &&
    dist < tunnelOuterHalfW + playerHalfW;

  if (!hitPillar) return;

// Collision with tunnel pillar:
// do NOT auto-fix player direction.
// Player must manually reverse + turn.

const pushDir = px < objX ? 1 : -1;

// Push player slightly backward in road depth
P.pos -= 42;
if (P.pos < 0) P.pos += trackLen;

// Strong speed reduction
P.speed = Math.min(
  P.speed * 0.20,
  C.NORMAL_MAX * 0.18
);

// Keep current lane position.
// No auto side correction.
clampPlayerX();

try {
  applyCollisionImpact('medium', pushDir);
} catch (e) {}

  if (canFx(o, 450)) {
    spawnSkid(screenAnchorX, screenAnchorY + 20);
    safeSfx('screech');
  }
}

function resolveSideSceneryCollision(o, cat, dz, screenAnchorX, screenAnchorY) {
  if (dz < -55 || dz > 105) return;

  const px = P.playerX || 0;
  const side = o.side || 0;

  const edge = o.small ? 0.93 : 0.96;
  const hitLeft = side < 0 && px < -edge;
  const hitRight = side > 0 && px > edge;

  if (!hitLeft && !hitRight) return;

  const pushDir = hitLeft ? 1 : -1;

  // Side collision also pushes back but less than tunnel.
  P.pos -= cat === 'hardSide' ? 38 : 26;
  if (P.pos < 0) P.pos += trackLen;

  P.playerX = px + pushDir * 0.10;
  clampPlayerX();

  const normalMax = C.NORMAL_MAX || C.MAX_SPEED || 70;
  P.speed = Math.min(P.speed * 0.55, normalMax * 0.45);

  try {
    applyCollisionImpact(cat === 'hardSide' ? 'hard' : 'medium', pushDir);
  } catch (e) {}

  if (canFx(o, 500)) {
    spawnCrash(
      screenAnchorX + (hitLeft ? -70 : 70),
      screenAnchorY - 40
    );
    safeSfx('crash');
  }
}

// ═══════════════════════════════════════════════════════
// HURDLE COLLISION — positional, only blocks where the
// hurdle physically sits. Player can freely pass any
// clear gap beside or between hurdles.
//
// CRITICAL: hurdleHalfW MUST match the renderer formula
// exactly: C.ROAD_W * o.size * s.scale  (full width).
// Half of that = o.size * s.scale * 0.5 in road-X units
// (road half-width = 1.0 by convention).
//
// Per-sprite scale values mirror sceneryConfig.js SPR:
//   gorillaRock: scale 1.00
//   woodFence:   scale 0.65   ← wide sprite, small scale
//   stoneWall:   scale 1.00
//   stoneBlock:  scale 1.00
// Without per-sprite scale the fence hitbox was 2× too
// wide, making the center gap impassable even though the
// visual showed clear space.
// ═══════════════════════════════════════════════════════

// Mirror of SPR.scale from sceneryConfig — kept local so
// collisionSystem has zero import dependency on sceneryConfig.
const HURDLE_SPR_SCALE = {
  gorillaRock : 1.00,
  woodFence   : 0.65,
  stoneWall   : 1.00,
  stoneBlock  : 1.00,
};

function resolveHurdleCollision(o, dz, objX, screenAnchorX, screenAnchorY) {
  // ── Hitbox dimensions ──────────────────────────────────
  // X  : match renderer (o.size * sprScale * 0.5) × tightening 0.82
  // Z  : depth half-extent in road units, derived from o.size so
  //      smaller hurdles have shallower boxes (gorillaRock ~32,
  //      woodFence ~23, stoneBlock ~37).
  const sprScale    = HURDLE_SPR_SCALE[o.kind] ?? 1.00;
  const hurdleSize  = o.size ?? 0.45;
  const hurdleHalfW = hurdleSize * sprScale * 0.5 * 0.82;
  const hurdleHalfZ = hurdleSize * sprScale * 80;   // depth half-extent (road units)

  const playerHalfW = 0.28;
  const playerHalfZ = 80;   // matches getPlayerCollisionInfo().halfZ

  // ── 2-D AABB overlap test ─────────────────────────────
  const xOverlap = (P.playerX + playerHalfW) > (objX - hurdleHalfW) &&
                   (P.playerX - playerHalfW) < (objX + hurdleHalfW);
  const zOverlap = dz > -(hurdleHalfZ + playerHalfZ) &&
                   dz <  (hurdleHalfZ + playerHalfZ);

  if (!xOverlap || !zOverlap) return;

  // ── Minimum Separation Vector ─────────────────────────
  // Penetration depths are in different units (X: road fractions 0-1,
  // Z: world units ~0-3200). Normalize each to 0-1 relative to the
  // combined half-extents so the axis comparison is scale-independent.
  const penXraw = (playerHalfW + hurdleHalfW) - Math.abs(P.playerX - objX);
  const penZraw = (playerHalfZ + hurdleHalfZ) - Math.abs(dz);

  // Normalized penetration: 1.0 = fully inside, 0 = just touching edge.
  const penXnorm = penXraw / (playerHalfW + hurdleHalfW);
  const penZnorm = penZraw / (playerHalfZ + hurdleHalfZ);

  const lateralPushDir = P.playerX < objX ? -1 : 1;
  // dz > 0 → hurdle is ahead → push player backward (pos--)
  // dz < 0 → hurdle is behind → push player forward  (pos++)
  const zPushSign = dz > 0 ? -1 : 1;

  if (penXnorm <= penZnorm) {
    // ── Side hit (left or right face of hurdle) ──────────
    P.playerX += lateralPushDir * (penXraw + 0.02);
    clampPlayerX();

    const normalMax = C.NORMAL_MAX || 70;
    P.speed = Math.min(P.speed * 0.60, normalMax * 0.50);

    try { applyCollisionImpact('medium', lateralPushDir); } catch (e) {}

    if (canFx(o, 350)) {
      spawnCrash(screenAnchorX + lateralPushDir * 60, screenAnchorY - 30);
      safeSfx('crash');
    }

  } else {
    // ── Front / back hit ─────────────────────────────────
    const posDelta = (penZraw + C.SEG_LEN * 0.18) * zPushSign;
    P.pos += posDelta;
    if (P.pos < 0) P.pos += trackLen;
    while (P.pos >= trackLen) P.pos -= trackLen;

    // Preserve speed direction (reversers stay reversing, just slower).
    const normalMax = C.NORMAL_MAX || 70;
    const sign = P.speed < 0 ? -1 : 1;
    P.speed = sign * Math.min(Math.abs(P.speed) * 0.45, normalMax * 0.38);

    P.playerX += lateralPushDir * 0.04;
    clampPlayerX();

    try { applyCollisionImpact('medium', lateralPushDir); } catch (e) {}

    if (canFx(o, 480)) {
      spawnCrash(screenAnchorX, screenAnchorY - 40);
      safeSfx('crash');
    }
  }
}


export function checkSceneryCollisions(sceneryObjs, screenAnchorX, screenAnchorY) {
  if (!sceneryObjs || !sceneryObjs.length) return;
  if (P.endPhase >= 1) return;

  const playerZ = P.pos + (P.playerZ || 0);
  const px = P.playerX || 0;

  for (const o of sceneryObjs) {
    const cat = objCat(o);
    if (!cat) continue;

    const dz = wrapDz(o.z, playerZ);

    if (dz < HIT.PLAYER_Z_BACK || dz > HIT.PLAYER_Z_AHEAD) continue;

    const objX = objLateralX(o);

    // KEY
    if (cat === 'key') {
      if (Math.abs(px - objX) < 0.42 && dz < 100 && dz > -120) {
        o._dead = true;
        P.keysCollected++;
        spawnKeyPickup(screenAnchorX, screenAnchorY - 100);
        safeSfx('key');
      }
      continue;
    }

    // COIN
    if (cat === 'coin') {
      if (Math.abs(px - objX) < 0.32 && dz < 80 && dz > -120) {
        o._dead = true;
        spawnPickup(screenAnchorX, screenAnchorY - 80);
        safeSfx('coin');
      }
      continue;
    }

    // BOOSTER
    if (cat === 'booster') {
      if (Math.abs(px - objX) < 0.45 && dz < 100 && dz > -120) {
        o._dead = true;
        spawnPickup(screenAnchorX, screenAnchorY - 90, true);
        activateNitro(2.0);
        safeSfx('nitro');
      }
      continue;
    }

    // TUNNEL / ARCH / CENTER HURDLE
    // Important: no o._dead here.
    // This remains solid forever.
if (cat === 'arch') {
  resolveTunnelGateCollision(
    o,
    dz,
    objX,
    screenAnchorX,
    screenAnchorY
  );
  continue;
}

    // ON-ROAD HURDLE — positional collision only where the sprite sits.
    if (cat === 'hurdle') {
      resolveHurdleCollision(o, dz, objX, screenAnchorX, screenAnchorY);
      continue;
    }

    // SIDE OBJECTS
    if (cat === 'sideScenery' || cat === 'hardSide') {
      resolveSideSceneryCollision(
        o,
        cat,
        dz,
        screenAnchorX,
        screenAnchorY
      );
    }
  }
}

// ═══════════════════════════════════════════════════════
// EDGE SCRAPE SOUND
// ═══════════════════════════════════════════════════════
let _scrapeWasOn = false;

export function tickEdgeScrape() {
  const isScraping = P.isOffTrack && P.speed > C.OFFRD_LIM * 0.5;

  if (isScraping && !_scrapeWasOn) {
    safeSfx('screech', {
      loop:true,
      volume:0.35,
      key:'screech',
    });

    _scrapeWasOn = true;
  } else if (!isScraping && _scrapeWasOn) {
    safeSfx('screech', {
      stop:true,
      key:'screech',
    });

    _scrapeWasOn = false;
  }
}