import { C } from '../../configs/roadConfig.js';
import { trackLen } from '../../core/roadMap.js';

export function buildSceneryObjects() {
  const objs = [];
  const total = Math.max(1, Math.floor(trackLen / C.SEG_LEN));

  function addSide(kind, z, side, offset = 1.75, size = 1.0, extra = {}) {
    objs.push({
      kind,
      z,
      side,
      offset,
      size,
      small: false,
      noCollision: true,
      ...extra,
    });
  }

  function addRoad(kind, seg, offset = 0, size = 1.0, extra = {}) {
    if (seg >= total - 10) return;

    objs.push({
      kind,
      z: seg * C.SEG_LEN,
      side: 0,
      offset,
      size,
      ...extra,
    });
  }

  // TREES
  const trees = ['tree1', 'tree2', 'tree3'];

  for (let i = 15; i < total - 30; i += 20) {
    const z = i * C.SEG_LEN;

    addSide(trees[(i * 3) % trees.length], z + 40, -1, 3.99, 1.0);
    addSide(trees[(i * 5 + 2) % trees.length], z + 260, 1, 3.99, 1.0);
  }

  // SIDE BUMPERS / POLES
  for (let i = 3; i < total - 25; i += 10) {
    const z = i * C.SEG_LEN;

    addSide('bumper1', z + 30, -1, 1.20, 0.75, {
      small: true,
      isBoundaryPole: true,
    });

    addSide('bumper2', z + 110, 1, 1.20, 0.75, {
      small: true,
      isBoundaryPole: true,
    });
  }

  // CITY BUILDINGS
  const BUILDING_KINDS = [
    'building',
    'cityBuilding',
    'cathedral',
  ];

  for (let i = 10, n = 0; i < total - 8; i += 2, n++) {
    const kind = BUILDING_KINDS[n % BUILDING_KINDS.length];
    const side = n % 2 === 0 ? -1 : 1;

    const offset = side === -1
      ? 4.70 + ((n % 3) * 0.20)
      : 4.90 + ((n % 3) * 0.20);

    const size = 0.58 + ((n % 4) * 0.04);

    addSide(kind, i * C.SEG_LEN, side, offset, size, {
      noCollision: true,
      small: false,
    });
  }

  function getLandmarkOffset(side, n = 0) {
    return side === -1
      ? 4.70 + ((n % 3) * 0.20)
      : 5.10 + ((n % 2) * 0.15);
  }

  const TOWERS = [
    { seg: 236, side: -1, size: 0.58 },
    { seg: 510, side: -1, size: 0.58 },
    { seg: 470, side: 1, size: 0.58 },
    { seg: 600, side: 1, size: 0.58 },
    { seg: 680, side: -1, size: 0.58 },
    { seg: 1000, side: -1, size: 0.58 },
    { seg: 1360, side: 1, size: 0.58 },
    { seg: 1800, side: 1, size: 0.58 },
    { seg: 1930, side: -1, size: 0.58 },
    { seg: 2330, side: -1, size: 0.58 },
    { seg: 2880, side: -1, size: 0.58 },
  ];

  for (const t of TOWERS) {
    if (t.seg < total - 30) {
      addSide('tower', t.seg * C.SEG_LEN, t.side, getLandmarkOffset(t.side), t.size, {
        noCollision: true,
        small: false,
      });
    }
  }

  const FERRIS_WHEELS = [
    { seg: 241, side: -1, size: 0.62 },
    { seg: 476, side: 1, size: 0.58 },
    { seg: 517, side: -1, size: 0.58 },
    { seg: 608, side: 1, size: 0.58 },
    { seg: 687, side: -1, size: 0.58 },
    { seg: 1006, side: -1, size: 0.58 },
    { seg: 1010, side: 1, size: 0.62 },
    { seg: 1366, side: 1, size: 0.58 },
    { seg: 1806, side: 1, size: 0.58 },
    { seg: 1885, side: -1, size: 0.62 },
    { seg: 2335, side: -1, size: 0.58 },
    { seg: 2825, side: 1, size: 0.62 },
    { seg: 2887, side: -1, size: 0.58 },
  ];

  for (const f of FERRIS_WHEELS) {
    if (f.seg < total - 30) {
      addSide('ferrisWheel', f.seg * C.SEG_LEN, f.side, getLandmarkOffset(f.side, 1), f.size, {
        noCollision: true,
        small: false,
      });
    }
  }

  // ARCHES / TUNNELS
  for (let i = 70; i < total - 40; i += 180) {
    addRoad('stoneArch', i, 0, 1.10, {
      overhead: true,
      noCollision: true,
    });

    addRoad('rallyArch', i + 90, 0, 1.10, {
      overhead: true,
      noCollision: true,
    });
  }

  const lanes = [-0.60, 0, 0.60];

  // COINS
  for (let i = 35; i < total - 30; i += 30) {
    const lane = lanes[Math.floor(i / 30) % lanes.length];

    for (let k = 0; k < 4; k++) {
      addRoad('coin', i + k * 2, lane, 1.0, {
        isCoin: true,
      });
    }
  }

  // REAL BOOSTERS ONLY
  for (let i = 95; i < total - 40; i += 180) {
    const lane = lanes[Math.floor(i / 180) % lanes.length];

    addRoad('booster', i, lane, 0.85, {
      isBooster: true,
    });
  }

  // NORMAL HURDLES
  const HURDLES = [
    { kind: 'barricade1', seg: 110, offset: -0.99, size: 0.88 },
    { kind: 'barricade1', seg: 200, offset: -0.99, size: 0.88 },
    { kind: 'barricade1', seg: 310, offset: -0.99, size: 0.88 },

    { kind: 'barricade2', seg: 265, offset: 0.00, size: 0.62 },
    { kind: 'barricade2', seg: 480, offset: 0.00, size: 0.62 },

    { kind: 'barricade3', seg: 290, offset: 0.88, size: 0.60 },
    { kind: 'barricade4', seg: 560, offset: 1.00, size: 0.56 },
  ];

  for (const h of HURDLES) {
    addRoad(h.kind, h.seg, h.offset, h.size, {
      isHurdle: true,
    });
  }

  // FINISH BANNER
  addRoad('finishBanner', 1, 0, 1.15, {
    overhead: true,
    noCollision: true,
  });

  // =====================================================
  // LEVEL 2 — THE SHIFTING MAZE
  // One road, 3 lanes:
  // LEFT = -0.60
  // CENTER = 0.00
  // RIGHT = 0.60
  //
  // PREVIEW:
  // LEFT shows fake danger.
  // RIGHT looks empty.
  //
  // AFTER GLITCH:
  // LEFT danger disappears.
  // RIGHT traps appear and become active.
  // =====================================================

  function addFakeDanger(seg) {
    addRoad('barricade1', seg, -0.60, 0.62, {
      isFakeDanger: true,
      noCollision: true,
      hidden: false,
    });
  }

  function addRightTrap(seg) {
    addRoad('barricade2', seg, 0.60, 0.68, {
      isMazeTrap: true,
      isHurdle: true,
      active: false,
      hidden: true,
      noCollision: false,
      clearAirHeight: 999,
    });
  }

  const mazeStart = Math.floor(total * 0.18);
  const mazeEnd = Math.floor(total * 0.78);

  for (let i = mazeStart; i < mazeEnd; i += 65) {
    addFakeDanger(i);
    addRightTrap(i + 18);
  }

  return objs;
}