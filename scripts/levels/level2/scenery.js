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

  // LANDMARKS / CITY OBJECTS

  // CITY BUILDINGS — many buildings, full map coverage, far from road
  const BUILDING_KINDS = [
    'building',
    'cityBuilding',
    'cathedral',
  ];

  const BUILDING_START_SEG = 10;
  const BUILDING_END_SEG = total - 8;

  const BUILDING_STEP_SEG = 2; // smaller = more buildings, 6 very dense, 10 normal
  for (let i = BUILDING_START_SEG, n = 0; i < BUILDING_END_SEG; i += BUILDING_STEP_SEG, n++) {
    const kind = BUILDING_KINDS[n % BUILDING_KINDS.length];

    // alternate left/right so they do not stack on same side
    const side = n % 2 === 0 ? -1 : 1;

    // far from road, little natural variation
    const offset = side === -1
      ? 4.70 + ((n % 3) * 0.20)
      : 4.90 + ((n % 3) * 0.20);

    const size = 0.58 + ((n % 4) * 0.04);

    addSide(
      kind,
      i * C.SEG_LEN,
      side,
      offset,
      size,
      {
        noCollision: true,
        small: false,
      }
    );
  }


  // Same idea as buildings, but slightly farther.
  function getLandmarkOffset(side, n = 0) {
    return side === -1
      ? 4.70 + ((n % 3) * 0.20)
      : 5.10 + ((n % 2) * 0.15);
  }

  // LONG TOWER / POLE — curve safe
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
      addSide(
        'tower',
        t.seg * C.SEG_LEN,
        t.side,
        getLandmarkOffset(t.side),
        t.size,
        {
          noCollision: true,
          small: false,
        }
      );
    }
  }

  // FERRIS WHEEL — curve safe
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
      addSide(
        'ferrisWheel',
        f.seg * C.SEG_LEN,
        f.side,
        getLandmarkOffset(f.side, 1),
        f.size,
        {
          noCollision: true,
          small: false,
        }
      );
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

  // COINS
  const lanes = [-0.60, 0, 0.60];

  for (let i = 35; i < total - 30; i += 30) {
    const lane = lanes[Math.floor(i / 30) % lanes.length];

    for (let k = 0; k < 4; k++) {
      addRoad('coin', i + k * 2, lane, 1.0, {
        isCoin: true,
      });
    }
  }

  // BOOSTERS
  for (let i = 95; i < total - 40; i += 125) {
    const lane = lanes[Math.floor(i / 125) % lanes.length];

    addRoad('booster', i, lane, 1.0, {
      isBooster: true,
    });
  }

  // HURDLES / BARRICADES
  const HURDLES = [
    { kind: 'barricade1', seg: 110, offset: -0.99, size: 0.88 },
    { kind: 'barricade1', seg: 200, offset: -0.99, size: 0.88 },
    { kind: 'barricade1', seg: 310, offset: -0.99, size: 0.88 },
    { kind: 'barricade1', seg: 945, offset: -0.99, size: 0.83 },
    { kind: 'barricade1', seg: 2150, offset: -0.99, size: 0.83 },
    { kind: 'barricade1', seg: 2750, offset: 0.00, size: 0.83 },

    { kind: 'barricade2', seg: 265, offset: 0.00, size: 0.62 },
    { kind: 'barricade2', seg: 480, offset: 0.00, size: 0.62 },
    { kind: 'barricade2', seg: 670, offset: 0.00, size: 0.62 },
    { kind: 'barricade2', seg: 900, offset: 0.00, size: 0.62 },
    { kind: 'barricade2', seg: 1730, offset: 0.00, size: 0.62 },
    { kind: 'barricade2', seg: 2180, offset: 0.00, size: 0.62 },
    { kind: 'barricade2', seg: 2550, offset: -0.58, size: 0.62 },
    { kind: 'barricade2', seg: 2550, offset: 0.00, size: 0.62 },

    { kind: 'barricade3', seg: 290, offset: 0.88, size: 0.60 },
    { kind: 'barricade3', seg: 1100, offset: 1.00, size: 0.60 },
    { kind: 'barricade3', seg: 1300, offset: -1.00, size: 0.60 },
    { kind: 'barricade3', seg: 1300, offset: 1.00, size: 0.60 },
    { kind: 'barricade3', seg: 2200, offset: 0.00, size: 0.60 },
    { kind: 'barricade3', seg: 2200, offset: 1.00, size: 0.60 },

    { kind: 'barricade4', seg: 230, offset: -0.99, size: 0.56 },
    { kind: 'barricade4', seg: 560, offset: 1.00, size: 0.56 },
    { kind: 'barricade4', seg: 1650, offset: -1.00, size: 0.60 },
    { kind: 'barricade4', seg: 1650, offset: 1.00, size: 0.60 },
    { kind: 'barricade4', seg: 2300, offset: -1.00, size: 0.60 },
  ];

  for (const h of HURDLES) {
    addRoad(h.kind, h.seg, h.offset, h.size, {
      isHurdle: true,
    });
  }

  // BIRDS
  // for (let i = 60; i < total - 40; i += 150) {
  //   const z = i * C.SEG_LEN;

  //   addSide('bird1', z + 80, -1, 1.45, 0.65);
  //   addSide('bird2', z + 360, 1, 1.45, 0.65);
  // }

  // FINISH BANNER
  addRoad('finishBanner', 1, 0, 1.15, {
    overhead: true,
    noCollision: true,
  });

  return objs;
}