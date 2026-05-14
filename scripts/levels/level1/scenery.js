// ═══════════════════════════════════════════════════════
// LEVEL 1 SCENERY — "THE GHOST START" (layout only)
// ─────────────────────────────────────────────────────
// All puzzle BEHAVIOUR lives in ./logic.js — this file is
// pure object placement, exactly mirroring the design
// diagram:
//
//   Forward (toward trackLen):  NORMAL ROAD → FAKE DOOR + MONSTER
//   Backward (behind spawn)  :  FAKE WALL → PRESSURE PLATE → (track loop)
//
// Object flags this file emits (read by sceneryRender.js,
// collisionSystem.js and logic.js):
//
//   isFakeWall        → solid-looking stone wall behind spawn,
//                       NO COLLISION (drive through it)
//   isPressurePlate   → flat floor decal, blue glow, activates
//                       puzzle when held for GHOST_PLATE_HOLD_TIME
//   isFakeDoor        → stone arch with skull at end of forward
//                       path. Looks like the goal but is a TRAP
//                       (monster spawns in front of it).
//   isRealKey         → golden key, hidden until plate is hit,
//                       then becomes pickable mid-road
//   isMonster         → patrol guard, lethal until key collected
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

  // ── Boundary poles ──────────────────────────────────
  for (let i = -25, n = 0; i < Math.min(total - 10, total - 25); i += 1, n++) {
    const z = i * C.SEG_LEN;
    objs.push({
      kind: 'poleStump', z: z + 40, side: -1 * sideFlip,
      offset: 1.10, small: true, isBoundaryPole: true,
    });
    objs.push({
      kind: 'poleStump', z: z + 95, side: 1 * sideFlip,
      offset: 1.10, small: true, isBoundaryPole: true,
    });
  }

  // ── START BANNER ────────────────────────────────────
  if (!onRoad2) {
    objs.push({
      kind: 'startBanner', z: 0, side: 0, offset: 0,
      overhead: true, noCollision: true, size: 1.15,
    });
  }

  // ── Trees ───────────────────────────────────────────
  const trees = ['pineTall', 'tallTree', 'pineBig', 'pineSmall'];
  for (let i = 10; i < total - 30; i += 10) {
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
    const z = i * C.SEG_LEN;
    objs.push({
      kind: 'totemOnly', z: z + 40, side: -1 * sideFlip,
      offset: onRoad2 ? 1.45 : 1.55, small: false, isTotem: true,
    });
    objs.push({
      kind: 'totemOnly', z: z + 220, side: 1 * sideFlip,
      offset: onRoad2 ? 1.45 : 1.55, small: false, isTotem: true,
    });
  }

  // ── Bridges ─────────────────────────────────────────
  for (let i = 40; i < total - 20; i += 110) {
    const z = i * C.SEG_LEN;
    objs.push({ kind: 'bridge', z, side: -1 * sideFlip,
                offset: onRoad2 ? 2.55 : 3.0 });
    objs.push({ kind: 'bridge', z: z + 240, side: 1 * sideFlip,
                offset: onRoad2 ? 2.35 : 2.62 });
  }

  // ── Coins ───────────────────────────────────────────
  for (let i = 35; i < total - 20; i += 28) {
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
    const z = i * C.SEG_LEN;
    const lanes = [-0.60, 0, 0.60];
    const laneOff = lanes[Math.floor(i / 95) % lanes.length];
    objs.push({
      kind: 'booster', z: z + 120, side: 0,
      offset: laneOff, isBooster: true,
    });
  }

  // ═════════════════════════════════════════════════════
  // GHOST START PUZZLE OBJECTS (Road1 only)
  // ═════════════════════════════════════════════════════
  if (!onRoad2) {
    buildGhostStartObjects(objs, total);
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
    objs.push({
      kind: h.kind, z: h.seg * C.SEG_LEN, side: 0,
      offset: h.offset, isHurdle: true, size: h.size,
    });
  }

  // ── Boost pads ──────────────────────────────────────
  const BOOSTPAD_SPACING = 70;
  const BOOSTPAD_FIRST = 100;
  const BOOSTPAD_LAST = total - 100;   // keep clear near trap zone
  const lanePattern = [0.00, -0.55, 0.55];
  let padIdx = 0;
  for (let s = BOOSTPAD_FIRST; s < BOOSTPAD_LAST; s += BOOSTPAD_SPACING) {
    objs.push({
      kind: 'boostPad', z: s * C.SEG_LEN, side: 0,
      offset: lanePattern[padIdx % lanePattern.length],
      isJump: true, size: 1.10,
    });
    padIdx++;
  }

  // ── Road2 secret markers ────────────────────────────
  if (onRoad2) {
    for (let i = 45; i < total - 20; i += 170) {
      objs.push({
        kind: 'woodArch', z: i * C.SEG_LEN, side: 0, offset: 0,
        overhead: true, isForkGate: true, forkTint: 'road2',
      });
    }
    for (let i = 70; i < total - 30; i += 130) {
      objs.push({
        kind: 'totem', z: i * C.SEG_LEN, side: 1 * sideFlip,
        offset: 1.15, small: false, isForkMarker: true,
      });
    }
  }

  // ═════════════════════════════════════════════════════
  // MONSTERS — patrol the trap zone (Road1 only)
  // ═════════════════════════════════════════════════════
const monsters = buildMonsters();
for (const m of monsters) objs.push(m);

  return objs;
}

// ═══════════════════════════════════════════════════════
// GHOST START PUZZLE BUILDER
// ─────────────────────────────────────────────────────
// Maps directly to the diagram:
//
//   BEHIND SPAWN (wrap-around end of track):
//     • Fake wall (3 lanes — looks solid, no collision)
//     • Pressure plate (~5 segs further back)
//
//   FORWARD (start of track):
//     • Real key (hidden until plate activated) — 8 segs in
//     • Fake door + monster (trap) — ~36-40 segs in
//
// All these segment positions are tunable via roadConfig
// (GHOST_FAKE_WALL_SEG_BEHIND, GHOST_PLATE_SEG_BEHIND,
//  GHOST_KEY_SPAWN_SEG_FORWARD, GHOST_FAKE_DOOR_SEG_FORWARD).
// ═══════════════════════════════════════════════════════
function buildGhostStartObjects(objs, total) {
  // ── Forward objects ────────────────────────────────
  const keySpawnSeg  = clampSeg(C.GHOST_KEY_SPAWN_SEG_FORWARD  ?? 14, total);
  const fakeDoorSeg  = clampSeg(C.GHOST_FAKE_DOOR_SEG_FORWARD  ?? 38, total);

  // ── Backward objects (wrap to near the end of track) ──
  const fakeWallSeg  = wrapBehind(C.GHOST_FAKE_WALL_SEG_BEHIND  ?? -8,  total);
  const plateSeg     = wrapBehind(C.GHOST_PLATE_SEG_BEHIND      ?? -15, total);

  // ── 1) FAKE WALL behind spawn ──────────────────────
  // Three stone wall blocks side by side. They look 100% solid
  // (full opacity, normal stone texture) but `noCollision: true`.
  // After plate activates, they get a `dissolved` flag that the
  // renderer fades for visual feedback.
  const wallLanes = [-0.66, 0.00, 0.66];
  for (const lane of wallLanes) {
    objs.push({
      kind:        'stoneWall',
      z:           fakeWallSeg * C.SEG_LEN,
      side:        0,
      offset:      lane,
      isFakeWall:  true,
      noCollision: true,
      size:        0.90,
      hidden:      false,
    });
  }

  // ── 2) PRESSURE PLATE behind the wall ──────────────
  objs.push({
    kind:            'pressurePlate',
    z:                plateSeg * C.SEG_LEN,
    side:             0,
    offset:           0,
    isPressurePlate:  true,
    noCollision:      true,
    activateHoldTime: C.GHOST_PLATE_HOLD_TIME ?? 0.6,
    held:             0,
    activated:        false,
  });

  // ── 3) FAKE DOOR at trap zone (forward end) ────────
  objs.push({
    kind:        'stoneArch',
    z:           fakeDoorSeg * C.SEG_LEN,
    side:        0,
    offset:      0,
    overhead:    true,
    isFakeDoor:  true,
    isDoorOpen:  false,         // flipped true by logic.js when plate fires
    noCollision: true,
    forkTint:    'road1',       // red skull tint
  });

  // ── 4) REAL KEY (hidden until plate activation) ────
  objs.push({
    kind:        'realKey',
    z:           keySpawnSeg * C.SEG_LEN,
    side:        0,
    offset:      0,
    isKey:       true,
    isRealKey:   true,
    hidden:      true,           // toggled false by logic.js on plate fire
    noCollision: false,
  });
}

// ── Helpers ────────────────────────────────────────────
function clampSeg(seg, total) {
  if (seg < 1) return 1;
  if (seg > total - 4) return total - 4;
  return seg;
}

function wrapBehind(negOffset, total) {
  const target = total + negOffset;
  if (target < 4) return 4;
  if (target > total - 4) return total - 4;
  return target;
}