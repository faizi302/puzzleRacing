import { C } from '../../configs/roadConfig.js';
import { trackLen } from '../../core/roadMap.js';
import { P } from '../../systems/roadSystem.js';

export function buildSceneryObjects() {
  const objs = [];
  const total = Math.max(1, Math.floor(trackLen / C.SEG_LEN));

  function addSide(kind, seg, side, offset = 1.8, size = 1.0, extra = {}) {
    if (seg < 1 || seg >= total - 10) return;

    objs.push({
      kind,
      z: seg * C.SEG_LEN,
      side,
      offset,
      size,
      noCollision: true,
      small: false,
      ...extra,
    });
  }

  function addRoad(kind, seg, offset = 0, size = 1.0, extra = {}) {
    if (seg < 1 || seg >= total - 10) return;

    objs.push({
      kind,
      z: seg * C.SEG_LEN,
      side: 0,
      offset,
      size,
      ...extra,
    });
  }

  function addFar(kind, seg, side, offset = 4.2, size = 0.8, extra = {}) {
    addSide(kind, seg, side, offset, size, {
      backgroundProp: true,
      noCollision: true,
      small: false,
      ...extra,
    });
  }

  // =====================================================
  // 1) BIG FAR TREES — like screenshot, away from road
  // =====================================================
  for (let i = 25; i < total - 120; i += 80) {
    addFar('Tree1', i, -1, 6.50, 0.95);
    addFar('Tree2', i + 70, -1, 6.50, 0.75);

    addFar('Tree1', i + 35, 1, 6.50, 0.95);
    addFar('Tree2', i + 105, 1, 6.50, 0.75);
  }

  // Extra far small trees for depth
  for (let i = 35; i < total - 40; i += 34) {
    addFar('Tree3', i, -1, 2.30, 0.60);
    addFar('Tree3', i + 14, 1, 2.30, 0.60);
  }

  // =====================================================
  // 2) BIG LANDMARKS / FAR DECOR — not near road
  // =====================================================
  for (let i = 40; i < total - 100; i += 260) {
    // RIGHT SIDE — large spacing
    addFar('Massive1', i, 1, 10.0, 2.00);
    addFar('Massive2', i + 80, 1, 10.0, 2.00);
    addFar('Landmark2', i + 170, 1, 10.0, 2.00);
    addFar('Landmark3', i + 260, 1, 10.0, 2.00);

    // LEFT SIDE — shifted so both sides don’t align exactly
    addFar('Massive1', i + 40, -1, 10.0, 2.00);
    addFar('Massive2', i + 130, -1, 10.0, 2.00);
    addFar('Landmark2', i + 220, -1, 10.0, 2.00);
    addFar('Landmark3', i + 310, -1, 10.0, 2.00);
  }


  // =====================================================
  // HAY ARCH + BARN GATE — ON ROAD like starting banner
  // =====================================================
  for (let i = 100; i < total - 200; i += 420) {
    // Hay Arch centered on road
    addRoad('HayArch', i, 0, 1.20, {
      overhead: true,
      noCollision: true,
    });

    // Barn Gate centered on road
    addRoad('BarnGate', i + 180, 0, 1.10, {
      overhead: true,
      noCollision: true,
    });
  }

  // =====================================================
  // 3) SMALL WOODEN POLES / SIDE OBJECTS — close to road
  // =====================================================
  for (let i = 6; i < total - 25; i += 8) {
    addSide('Bumper2', i, -1, 1.15, 0.62, {
      small: true,
      isBoundaryPole: true,
    });

    addSide('Bumper2', i + 4, 1, 1.15, 0.62, {
      small: true,
      isBoundaryPole: true,
    });
  }

  // second outer row, slightly farther, gives natural border
  for (let i = 12; i < total - 25; i += 16) {
    addSide('Bumper1', i, -1, 1.55, 0.52, {
      small: true,
      isBoundaryPole: true,
    });

    addSide('Bumper1', i + 8, 1, 1.55, 0.52, {
      small: true,
      isBoundaryPole: true,
    });
  }

  // =====================================================
  // 4) OVERHEAD ARCHES
  // =====================================================
  addRoad('Finish', 1, 0, 1.15, {
    overhead: true,
    noCollision: true,
  });

  // =====================================================
  // 5) PUZZLE CLUES — placed on sides but not huge
  // =====================================================
  const q1 = Math.floor(total * 0.20);
  const q2 = Math.floor(total * 0.42);
  const q3 = Math.floor(total * 0.66);
  const q4 = Math.floor(total * 0.86);

  addSide('Landmark1', q1 - 18, -1, 2.55, 0.95, {
    isMural: true,
    symbol: '⭐',
  });

  addSide('Landmark1', q2 - 18, 1, 2.55, 0.95, {
    isMural: true,
    symbol: '🌙',
  });

  addSide('Landmark1', q3 - 18, -1, 2.55, 0.95, {
    isMural: true,
    symbol: '💎',
  });

  addSide('Landmark1', q4 - 18, 1, 2.55, 0.95, {
    isMural: true,
    symbol: '🗝️',
  });

  // Only show puzzle symbols before puzzle is solved
  if (!P.level3PuzzleSolved) {
    addRoad('PuzzleStar', q1, -0.42, 1, {
      isPuzzleSwitch: true,
      isPuzzleSymbol: true,
      symbol: 'star',
      noCollision: false,
      screenSize: 52,
    });

    addRoad('PuzzleDiamond', q2, 0.42, 1, {
      isPuzzleSwitch: true,
      isPuzzleSymbol: true,
      symbol: 'moon',
      noCollision: false,
      screenSize: 52,
    });

    addRoad('PuzzleKey', q3, 0, 1, {
      isPuzzleSwitch: true,
      isPuzzleSymbol: true,
      symbol: 'diamond',
      noCollision: false,
      screenSize: 52,
    });

    addRoad('PuzzleMoon', q4, -0.42, 1, {
      isPuzzleSwitch: true,
      isPuzzleSymbol: true,
      symbol: 'key',
      noCollision: false,
      screenSize: 52,
    });
  }

  // =====================================================
  // 6) COINS — clean road lanes
  // =====================================================
  const lanes = [-0.55, 0, 0.55];

  for (let i = 38; i < total - 40; i += 34) {
    const lane = lanes[Math.floor(i / 34) % lanes.length];

    addRoad('Coin', i, lane, 1.0, { isCoin: true });
    addRoad('Coin', i + 2, lane, 1.0, { isCoin: true });
    addRoad('Coin', i + 4, lane, 1.0, { isCoin: true });
  }

  // coin groups
  for (let i = 95; i < total - 50; i += 140) {
    addRoad('Coin', i, -0.55, 1.0, { isCoin: true });
    addRoad('Coin', i + 2, 0, 1.0, { isCoin: true });
    addRoad('Coin', i + 4, 0.55, 1.0, { isCoin: true });
  }

  // =====================================================
  // 7) BOOSTERS
  // =====================================================
  for (let i = 110; i < total - 50; i += 150) {
    const lane = lanes[Math.floor(i / 150) % lanes.length];

    addRoad('Boost', i, lane, 1.0, {
      isBooster: true,
    });
  }

  // =====================================================
  // 8) HURDLES / TRAPS
  // =====================================================

  const HURDLES = [
    // Left lane hay roll
    // { kind: 'HayRoll', seg: 10, offset: -0.42, size: 0.72 },

    // Center hay blocks
    // { kind: 'HayBlocks', seg: 10, offset: 0.00, size: 0.70 },

    // // Right lane fence
    // { kind: 'Fence', seg: 10, offset: 0.55, size: 0.68 },

    // // Double side rocks
    // { kind: 'RockFlowers', seg: 10, offset: -0.75, size: 0.75 },
    // { kind: 'RockFlowers', seg: 520, offset: 0.75, size: 0.75 },

    // // Mixed manual placements
    // { kind: 'HayRoll', seg: 700, offset: 0.00, size: 0.72 },
    // { kind: 'Fence', seg: 860, offset: -0.55, size: 0.68 },
    // { kind: 'HayBlocks', seg: 1020, offset: 0.55, size: 0.70 },

    // // Later race harder section
    // { kind: 'RockFlowers', seg: 1280, offset: 0.00, size: 0.78 },
    // { kind: 'Fence', seg: 1460, offset: -0.55, size: 0.68 },
    // { kind: 'HayRoll', seg: 1640, offset: 0.55, size: 0.72 },
  ];

  for (const h of HURDLES) {
    addRoad(h.kind, h.seg, h.offset, h.size, {
      isHurdle: true,
      clearAirHeight: 999,
    });
  }

  return objs;
}