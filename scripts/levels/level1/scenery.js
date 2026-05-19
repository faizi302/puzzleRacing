// Level 1 scenery. Trees, hurdles, coins, plus Ghost-Start puzzle props.

import { C, START_PRE_FINISH } from '../../configs/roadConfig.js';
import { trackLen, getActiveTrack } from '../../core/roadMap.js';
import { P } from '../../systems/roadSystem.js';
import { clamp } from '../../utils/math.js';
import { buildMonsters } from './monster.js';

const TREES = ['pineTall', 'tallTree', 'pineBig', 'pineSmall'];

const HURDLES = [
  { kind: 'gorillaRock', seg: 55,   offset: -0.85, size: 0.40 },
  { kind: 'gorillaRock', seg: 400,  offset: -0.85, size: 0.40 },
  { kind: 'gorillaRock', seg: 1080, offset:  0.00, size: 0.40 },
  { kind: 'gorillaRock', seg: 1260, offset:  0.00, size: 0.40 },
  { kind: 'gorillaRock', seg: 1760, offset:  0.00, size: 0.40 },

  { kind: 'stoneWall', seg: 170, offset:  0.00, size: 0.40 },
  { kind: 'stoneWall', seg: 700, offset:  0.90, size: 0.40 },
  { kind: 'stoneWall', seg: 840, offset:  0.00, size: 0.40 },
  { kind: 'stoneWall', seg: 930, offset:  0.00, size: 0.40 },

  { kind: 'woodFence', seg: 95,   offset:  0.83, size: 0.70 },
  { kind: 'woodFence', seg: 365,  offset:  0.83, size: 0.70 },
  { kind: 'woodFence', seg: 600,  offset: -0.83, size: 0.70 },
  { kind: 'woodFence', seg: 1190, offset: -0.83, size: 0.70 },
  { kind: 'woodFence', seg: 1190, offset:  0.83, size: 0.70 },
  { kind: 'woodFence', seg: 1520, offset:  0.83, size: 0.70 },

  { kind: 'stoneBlock', seg: 320,  offset:  0.00, size: 0.45 },
  { kind: 'stoneBlock', seg: 670,  offset:  0.83, size: 0.45 },
  { kind: 'stoneBlock', seg: 970,  offset: -0.77, size: 0.45 },
  { kind: 'stoneBlock', seg: 1390, offset:  0.00, size: 0.45 },
  { kind: 'stoneBlock', seg: 1560, offset:  0.00, size: 0.45 },
];

export function buildSceneryObjects() {
  const objs = [];
  const onRoad2 = getActiveTrack() === 2;
  const total = Math.max(1, Math.floor(trackLen / C.SEG_LEN));
  const sideFlip = P.reverseMode ? -1 : 1;

  const trapAnchorSeg = onRoad2
    ? Math.max(8, total + (C.GHOST_ROAD2_JUMP_SEG_FROM_END ?? -16))
    : Math.max(8, total + (C.GHOST_FAKE_DOOR_SEG_FROM_END ?? -8));

  const TRAP_BEFORE = 22;
  const TRAP_AFTER  = 6;
  const inTrap = (seg) => seg > trapAnchorSeg - TRAP_BEFORE && seg < trapAnchorSeg + TRAP_AFTER;

  const wallSeg = computeFakeWallSeg(total);
  const nearWall = (seg) => Math.abs(seg - wallSeg) < 4;

  // Boundary poles
  addBoundaryPoles(objs, -25, total - 25, 1, 1.30, sideFlip);

  // Start banner (Road 1)
  if (!onRoad2) {
    objs.push({
      kind: 'startBanner', z: 0, side: 0, offset: 0,
      overhead: true, noCollision: true, size: 1.15,
    });
  }

  // Trees
  for (let i = 10; i < total - 30; i += 10) {
    if (inTrap(i) || nearWall(i)) continue;
    const z = i * C.SEG_LEN;
    objs.push({
      kind: TREES[(i * 3) % TREES.length],
      z: z + 40, side: -1 * sideFlip,
      offset: onRoad2 ? 1.40 : 1.65,
    });
    objs.push({
      kind: TREES[(i * 5 + 2) % TREES.length],
      z: z + 260, side: 1 * sideFlip,
      offset: onRoad2 ? 1.40 : 1.65,
    });
  }

  // Totems
  for (let i = 35; i < total - 25; i += 45) {
    if (inTrap(i)) continue;
    const z = i * C.SEG_LEN;
    objs.push({
      kind: 'totemOnly', z: z + 40, side: -1 * sideFlip,
      offset: onRoad2 ? 1.70 : 1.55, isTotem: true,
    });
    objs.push({
      kind: 'totemOnly', z: z + 220, side: 1 * sideFlip,
      offset: onRoad2 ? 1.70 : 1.55, isTotem: true,
    });
  }

  // Bridges
  for (let i = 40; i < total - 20; i += 110) {
    if (inTrap(i)) continue;
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

  // Coins
  const COIN_LANES = [-0.60, 0, 0.60];
  for (let i = 35; i < total - 20; i += 28) {
    if (inTrap(i)) continue;
    const z = i * C.SEG_LEN;
    const laneOff = COIN_LANES[Math.floor(i / 28) % COIN_LANES.length];
    for (let k = 0; k < 5; k++) {
      objs.push({
        kind: 'coin', side: 0, offset: laneOff,
        z: z + k * 300, isCoin: true,
      });
    }
  }

  // Boosters
  const BOOST_LANES = [-0.60, 0, 0.60];
  for (let i = 80; i < total - 40; i += 115) {
    if (inTrap(i)) continue;
    const z = i * C.SEG_LEN;
    const laneOff = BOOST_LANES[Math.floor(i / 95) % BOOST_LANES.length];
    objs.push({
      kind: 'booster', z: z + 120, side: 0,
      offset: laneOff, isBooster: true,
    });
  }

  // Ghost-Start puzzle props
  if (!onRoad2) buildGhostStartObjects(objs, total, wallSeg);
  else          buildRoad2WinPath(objs, total);

  // On-road hurdles
  for (const h of HURDLES) {
    if (h.seg >= total - 30) continue;
    if (inTrap(h.seg) || nearWall(h.seg)) continue;
    objs.push({
      kind: h.kind, z: h.seg * C.SEG_LEN, side: 0,
      offset: h.offset, isHurdle: true, size: h.size,
    });
  }

  // Boost pads
  const PAD_LANES = [0.00, -0.55, 0.55];
  const PAD_SPACING = 70;
  const PAD_FIRST = 100;
  const PAD_LAST = total - 100;
  let padIdx = 0;
  for (let s = PAD_FIRST; s < PAD_LAST; s += PAD_SPACING) {
    if (inTrap(s)) { padIdx++; continue; }
    objs.push({
      kind: 'boostPad', z: s * C.SEG_LEN, side: 0,
      offset: PAD_LANES[padIdx % PAD_LANES.length],
      isJump: true, size: 1.10,
    });
    padIdx++;
  }

  // Road 2 overhead arches
  if (onRoad2) {
    for (let i = 45; i < total - 40; i += 170) {
      if (inTrap(i)) continue;
      objs.push({
        kind: 'woodArch', z: i * C.SEG_LEN, side: 0, offset: 0,
        overhead: true, isForkGate: true, forkTint: 'road2',
      });
    }
  }

  // Gorillas
  const monsters = buildMonsters();
  for (const m of monsters) objs.push(m);

  return objs;
}

function addBoundaryPoles(objs, startSeg, endSeg, stepSeg, offset, sideFlip) {
  const lastSafe = Math.max(1, (Math.floor(trackLen / C.SEG_LEN)) - 10);
  for (let i = startSeg; i < Math.min(lastSafe, endSeg); i += stepSeg) {
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

// Ghost-Start props (Road 1 only)
function buildGhostStartObjects(objs, total, wallSeg) {
  const fakeDoorSeg = clampSeg(25, total);
  const wallLanes = [-0.66, 0.00, 0.66];

  for (const lane of wallLanes) {
    objs.push({
      kind: 'stoneWall',
      z: wallSeg * C.SEG_LEN,
      side: 0, offset: lane,
      isFakeWall: true, noCollision: true,
      size: 0.95, hidden: false,
    });
  }

  objs.push({
    kind: 'road2UnlockButton',
    z: wallSeg * C.SEG_LEN,
    side: 0, offset: 0,
    isFakeWallButton: true, noCollision: true,
    size: 1.35,
  });

  // Permanent red-skull trap door
  objs.push({
    kind: 'stoneArch',
    z: fakeDoorSeg * C.SEG_LEN,
    side: 0, offset: 0,
    overhead: true,
    isFakeDoor: true, isDoorOpen: false,
    isPermanentTrap: true,
    noCollision: true,
    forkTint: 'road1',
  });
}

// Road 2 winning path — big ramp + finish arch
function buildRoad2WinPath(objs, total) {
  const monsterSeg = clampSeg(total + (C.GHOST_ROAD2_MONSTER_SEG_FROM_END ?? -10), total);
  const jumpBefore = C.GHOST_ROAD2_JUMP_BEFORE_MONSTER_SEGS ?? 5;
  const rampSeg = clampSeg(monsterSeg - jumpBefore, total);

  const lanes = [-0.66, 0.00, 0.66];
  for (const lane of lanes) {
    objs.push({
      kind: 'megaRamp',
      z: rampSeg * C.SEG_LEN,
      side: 0, offset: lane,
      isJump: true,
      size: 1.55,
      hitBackZ: -180, hitFrontZ: 340, hitHalfW: 0.46,
      liftFactor: 1.50,
      jumpBaseVy: 200, jumpSpeedVy: 900,
      speedKickKmh: 95, forwardKick: 1.75,
    });
  }

  const finishArchSeg = clampSeg(total - 3, total);
  objs.push({
    kind: 'woodArch',
    z: finishArchSeg * C.SEG_LEN,
    side: 0, offset: 0,
    overhead: true,
    isWinGate: true,
    noCollision: true,
    forkTint: 'road2',
  });
}

function computeFakeWallSeg(total) {
  const startSeg = Math.floor((trackLen - START_PRE_FINISH) / C.SEG_LEN);
  const behind = C.GHOST_FAKE_WALL_SEG_BEHIND ?? -6;
  let target = startSeg + behind;
  while (target < 1) target += total;
  while (target > total - 2) target -= total;
  return clampSeg(target, total);
}

function clampSeg(seg, total) {
  return clamp(seg, 1, total - 2);
}