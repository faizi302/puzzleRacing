// ═══════════════════════════════════════════════════════
// LEVEL 1 SCENERY — "THE GHOST START" (v4 — wall trigger)
// ─────────────────────────────────────────────────────
// Pure object placement. All puzzle BEHAVIOUR lives in
// ./logic.js — this file just decides WHERE the props sit.
//
// LAYOUT:
//
//   ROAD 1 (the LIE)
//   ─ Spawn ──────────── … long ride … ─── FAKE DOOR ─ FINISH
//                                            ↑
//                                     GORILLA BOSS (lethal)
//   ─ FAKE WALL  (no collision) ← ~100 m BEHIND spawn
//
//   ROAD 2 (the REAL path — opened by walking through the wall)
//   ─ Spawn ──────────── … long ride … ─── BIG JUMP ─ GORILLA ─ FINISH
//                                            ↑
//                                     fly OVER it
//
// Object flags this file emits:
//
//   isFakeWall    → looks 100 % solid stone behind spawn, NO
//                   collision. Walking through it unlocks Road 2.
//   isFakeDoor    → red-skull stone arch at end of Road 1.
//                   ALWAYS a trap. Never opens.
//   isMonster     → SINGLE Gorilla Boss patrolling near finish.
//
// Note: NO `isRealKey`, NO `isPressurePlate` (the v4 design
// triggers Road 2 the moment the player drives through the
// wall; there is no key to grab and no plate to hold).
// ═══════════════════════════════════════════════════════
import { C } from '../../configs/roadConfig.js';
import { trackLen, getActiveTrack } from '../../core/roadMap.js';
import { P } from '../../systems/roadSystem.js';
import { buildMonsters } from './monster.js';

export function buildSceneryObjects() {
  const objs = [];
  const onRoad2 = getActiveTrack() === 2;
  const total   = Math.max(1, Math.floor(trackLen / C.SEG_LEN));
  const sideFlip = P.reverseMode ? -1 : 1;

  // Trap zone seg index — where the fake door / jump ramp sits.
  // Keep coins/hurdles/boosts out of this zone so the player
  // has a clean sight line + clean approach.
  const trapAnchorSeg = onRoad2
    ? Math.max(8, total + (C.GHOST_ROAD2_JUMP_SEG_FROM_END ?? -16))
    : Math.max(8, total + (C.GHOST_FAKE_DOOR_SEG_FROM_END ?? -8));
  const TRAP_CLEAR_BEFORE = 22;
  const TRAP_CLEAR_AFTER  = 6;
  const isInTrapZone = (seg) =>
    seg > (trapAnchorSeg - TRAP_CLEAR_BEFORE) &&
    seg < (trapAnchorSeg + TRAP_CLEAR_AFTER);

  // Wall zone — keep clutter away from the wall so it reads
  // as a clear stone wall from the start line.
  const wallSeg = computeFakeWallSeg(total);
  const isNearWall = (seg) => Math.abs(seg - wallSeg) < 4;

  // ── Boundary poles ──────────────────────────────────
  function addBoundaryPoles(startSeg, endSeg, stepSeg, offset = 1.30) {
    for (let i = startSeg, n = 0; i < Math.min(total - 10, endSeg); i += stepSeg, n++) {
      const z = i * C.SEG_LEN;
      objs.push({
        kind: 'poleStump', z: z + 40, side: -1 * sideFlip,
        offset, small: true, isBoundaryPole: true,
      });
      objs.push({
        kind: 'poleStump', z: z + 95, side: 1 * sideFlip,
        offset, small: true, isBoundaryPole: true,
      });
    }
  }
  addBoundaryPoles(-25, total - 25, 1, 1.30);

  // ── START BANNER (Road 1 only) ──────────────────────
  if (!onRoad2) {
    objs.push({
      kind: 'startBanner', z: 0, side: 0, offset: 0,
      overhead: true, noCollision: true, size: 1.15,
    });
  }

  // ── Trees ───────────────────────────────────────────
  const trees = ['pineTall', 'tallTree', 'pineBig', 'pineSmall'];
  for (let i = 10; i < total - 30; i += 10) {
    if (isInTrapZone(i)) continue;
    if (isNearWall(i)) continue;
    const z = i * C.SEG_LEN;
    objs.push({
      kind: trees[(i * 3) % trees.length],
      z: z + 40, side: -1 * sideFlip,
      offset: onRoad2 ? 1.40 : 1.65,
    });
    objs.push({
      kind: trees[(i * 5 + 2) % trees.length],
      z: z + 260, side: 1 * sideFlip,
      offset: onRoad2 ? 1.40 : 1.65,
    });
  }

  // ── Totems ──────────────────────────────────────────
  for (let i = 35; i < total - 25; i += 45) {
    if (isInTrapZone(i)) continue;
    const z = i * C.SEG_LEN;
    objs.push({
      kind: 'totemOnly', z: z + 40, side: -1 * sideFlip,
      offset: onRoad2 ? 1.70 : 1.55, small: false, isTotem: true,
    });
    objs.push({
      kind: 'totemOnly', z: z + 220, side: 1 * sideFlip,
      offset: onRoad2 ? 1.70 : 1.55, small: false, isTotem: true,
    });
  }

  // ── Bridges ─────────────────────────────────────────
  for (let i = 40; i < total - 20; i += 110) {
    if (isInTrapZone(i)) continue;
    const z = i * C.SEG_LEN;
    objs.push({
      kind: 'bridge', z, side: -1 * sideFlip,
      offset: onRoad2 ? 3.99 : 3.0,
    });
    objs.push({
      kind: 'bridge', z: z + 240, side: 1 * sideFlip,
      offset: onRoad2 ? 3.78 : 2.62,
    });
  }

  // ── Coins ───────────────────────────────────────────
  for (let i = 35; i < total - 20; i += 28) {
    if (isInTrapZone(i)) continue;
    const z = i * C.SEG_LEN;
    const lanes = [-0.60, 0, 0.60];
    const laneOff = lanes[Math.floor(i / 28) % lanes.length];
    for (let k = 0; k < 5; k++) {
      objs.push({
        kind: 'coin', side: 0, offset: laneOff,
        z: z + k * 300, isCoin: true,
      });
    }
  }

  // ── Boosters ────────────────────────────────────────
  for (let i = 80; i < total - 40; i += 115) {
    if (isInTrapZone(i)) continue;
    const z = i * C.SEG_LEN;
    const lanes = [-0.60, 0, 0.60];
    const laneOff = lanes[Math.floor(i / 95) % lanes.length];
    objs.push({
      kind: 'booster', z: z + 120, side: 0,
      offset: laneOff, isBooster: true,
    });
  }

  // ═════════════════════════════════════════════════════
  // GHOST START PUZZLE OBJECTS
  // ═════════════════════════════════════════════════════
  if (!onRoad2) {
    buildGhostStartObjects(objs, total, wallSeg);
  } else {
    buildRoad2WinPath(objs, total);
  }

  // ── On-road hurdles ─────────────────────────────────
  const HURDLES = [
    { kind: 'gorillaRock', seg: 220,  offset: -0.58, size: 0.40 },
    { kind: 'gorillaRock', seg: 400,  offset: -0.58, size: 0.40 },
    { kind: 'gorillaRock', seg: 1080, offset:  0.00, size: 0.40 },
    { kind: 'gorillaRock', seg: 1260, offset:  0.00, size: 0.40 },
    { kind: 'stoneWall',   seg: 700,  offset:  0.70, size: 0.40 },
    { kind: 'stoneWall',   seg: 930,  offset:  0.00, size: 0.40 },
    { kind: 'woodFence',   seg: 365,  offset:  0.70, size: 0.70 },
    { kind: 'woodFence',   seg: 600,  offset: -0.58, size: 0.70 },
    { kind: 'woodFence',   seg: 1190, offset: -0.58, size: 0.70 },
    { kind: 'woodFence',   seg: 1190, offset:  0.70, size: 0.70 },
    { kind: 'stoneBlock',  seg: 320,  offset:  0.00, size: 0.45 },
    { kind: 'stoneBlock',  seg: 670,  offset:  0.70, size: 0.45 },
    { kind: 'stoneBlock',  seg: 970,  offset: -0.58, size: 0.45 },
    { kind: 'stoneBlock',  seg: 1390, offset:  0.00, size: 0.45 },
  ];
  for (const h of HURDLES) {
    if (h.seg >= total - 30) continue;
    if (isInTrapZone(h.seg))  continue;
    if (isNearWall(h.seg))    continue;
    objs.push({
      kind: h.kind, z: h.seg * C.SEG_LEN, side: 0,
      offset: h.offset, isHurdle: true, size: h.size,
    });
  }

  // ── Boost pads (mid-track) ──────────────────────────
  const BOOSTPAD_SPACING = 70;
  const BOOSTPAD_FIRST   = 100;
  const BOOSTPAD_LAST    = total - 100;
  const lanePattern = [0.00, -0.55, 0.55];
  let padIdx = 0;
  for (let s = BOOSTPAD_FIRST; s < BOOSTPAD_LAST; s += BOOSTPAD_SPACING) {
    if (isInTrapZone(s)) { padIdx++; continue; }
    objs.push({
      kind: 'boostPad', z: s * C.SEG_LEN, side: 0,
      offset: lanePattern[padIdx % lanePattern.length],
      isJump: true, size: 1.10,
    });
    padIdx++;
  }

  // ── Road 2 ambience (overhead arches) ───────────────
  if (onRoad2) {
    for (let i = 45; i < total - 40; i += 170) {
      if (isInTrapZone(i)) continue;
      objs.push({
        kind: 'woodArch', z: i * C.SEG_LEN, side: 0, offset: 0,
        overhead: true, isForkGate: true, forkTint: 'road2',
      });
    }
  }

  // ═════════════════════════════════════════════════════
  // GORILLA BOSS — SINGLE monster (user requested only ONE).
  // ═════════════════════════════════════════════════════
  const monsters = buildMonsters();
  for (const m of monsters) objs.push(m);

  return objs;
}

// ═══════════════════════════════════════════════════════
// GHOST START PUZZLE BUILDER — Road 1 only
// ─────────────────────────────────────────────────────
// Behind spawn (≈100 m back, which wraps to near end-of-track):
//   • Fake wall (3 lanes, looks solid, NO collision)
// End of Road 1 (the trap zone):
//   • Fake door (red-skull stone arch) — permanent trap
// ═══════════════════════════════════════════════════════
function buildGhostStartObjects(objs, total, wallSeg) {
  // Fake door at end of Road 1.
  const fakeDoorSeg = clampSeg(
    total + (C.GHOST_FAKE_DOOR_SEG_FROM_END ?? -8),
    total
  );

  // ── FAKE WALL — three lanes wide so it looks like a real
  // continuous stone wall blocking the whole road back. The
  // renderer fades it once `dissolved` is set (logic.js sets
  // that flag the moment the player crosses through).
  const wallLanes = [-0.66, 0.00, 0.66];
  for (const lane of wallLanes) {
    objs.push({
      kind:        'stoneWall',
      z:           wallSeg * C.SEG_LEN,
      side:        0,
      offset:      lane,
      isFakeWall:  true,
      noCollision: true,
      size:        0.95,
      hidden:      false,
    });
  }

  // ── FAKE DOOR — permanent red-skull trap ──
  objs.push({
    kind:            'stoneArch',
    z:               fakeDoorSeg * C.SEG_LEN,
    side:            0,
    offset:          0,
    overhead:        true,
    isFakeDoor:      true,
    isDoorOpen:      false,        // INVARIANT — stays false forever
    isPermanentTrap: true,
    noCollision:     true,
    forkTint:        'road1',
  });
}

// ═══════════════════════════════════════════════════════
// ROAD 2 WIN PATH — big jump ramp + finish-line arch
// ═══════════════════════════════════════════════════════
function buildRoad2WinPath(objs, total) {
  const monsterSeg = clampSeg(
    total + (C.GHOST_ROAD2_MONSTER_SEG_FROM_END ?? -10),
    total
  );

  const jumpBefore = C.GHOST_ROAD2_JUMP_BEFORE_MONSTER_SEGS ?? 5;
  const rampSeg = clampSeg(monsterSeg - jumpBefore, total);

  const lanes = [-0.66, 0.00, 0.66];

  for (const lane of lanes) {
    objs.push({
      kind: 'megaRamp',
      z: rampSeg * C.SEG_LEN,
      side: 0,
      offset: lane,
      isJump: true,

      size: 1.55,

      hitBackZ: -180,
      hitFrontZ: 340,
      hitHalfW: 0.46,

      liftFactor: 1.50,
      jumpBaseVy: 200,
      jumpSpeedVy: 900,
      speedKickKmh: 95,
      forwardKick: 1.75,
    });
  }

  const finishArchSeg = clampSeg(total - 3, total);
  objs.push({
    kind: 'woodArch',
    z: finishArchSeg * C.SEG_LEN,
    side: 0,
    offset: 0,
    overhead: true,
    isWinGate: true,
    noCollision: true,
    forkTint: 'road2',
  });
}
// ═══════════════════════════════════════════════════════
// Resolve the fake wall segment index.
// ─────────────────────────────────────────────────────
// User wants ≈100 m behind the start line. We pick the
// `GHOST_FAKE_WALL_SEG_BEHIND` config value (default -6
// segments). With SEG_LEN = 240 world-units and our
// world↔metres rough scaling, that lands in the right area.
// `wrapBehind()` converts "negative offset from start" into
// an absolute segment near the end of the track (because the
// track wraps).
// ═══════════════════════════════════════════════════════
function computeFakeWallSeg(total) {
  const segBehind = C.GHOST_FAKE_WALL_SEG_BEHIND ?? -6;
  return wrapBehind(segBehind, total);
}

// ── Helpers ────────────────────────────────────────────
function clampSeg(seg, total) {
  if (seg < 1) return 1;
  if (seg > total - 2) return total - 2;
  return seg;
}

function wrapBehind(negOffset, total) {
  const target = total + negOffset;
  if (target < 4) return 4;
  if (target > total - 4) return total - 4;
  return target;
}