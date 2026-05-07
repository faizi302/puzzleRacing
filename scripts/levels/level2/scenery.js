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

  for (let i = 10; i < total - 30; i += 10) {
    const z = i * C.SEG_LEN;

    addSide(trees[(i * 3) % trees.length], z + 40, -1, 1.85, 1.0);
    addSide(trees[(i * 5 + 2) % trees.length], z + 260, 1, 1.85, 1.0);
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
  for (let i = 35; i < total - 50; i += 120) {
    const z = i * C.SEG_LEN;

    addSide('tower', z + 100, -1, 2.80, 0.85);
    addSide('building', z + 420, 1, 2.65, 0.90);
    addSide('ferrisWheel', z + 760, -1, 3.00, 0.95);
    addSide('cathedral', z + 1120, 1, 2.85, 0.90);
    addSide('cityBuilding', z + 1460, -1, 2.95, 0.90);
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
  const lanes = [-0.58, 0, 0.58];

  for (let i = 35; i < total - 30; i += 30) {
    const lane = lanes[Math.floor(i / 30) % lanes.length];

    for (let k = 0; k < 6; k++) {
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
  // const HURDLES = [
  //   { kind: 'barricade1', seg: 90, offset: 0.00, size: 0.55 },
  //   { kind: 'barricade2', seg: 170, offset: -0.58, size: 0.60 },
  //   { kind: 'barricade3', seg: 260, offset: 0.58, size: 0.70 },
  //   { kind: 'barricade4', seg: 360, offset: 0.00, size: 0.75 },

  //   { kind: 'barricade1', seg: 520, offset: 0.58, size: 0.55 },
  //   { kind: 'barricade2', seg: 690, offset: 0.00, size: 0.60 },
  //   { kind: 'barricade3', seg: 850, offset: -0.58, size: 0.70 },
  //   { kind: 'barricade4', seg: 1040, offset: 0.58, size: 0.75 },
  // ];

  // for (const h of HURDLES) {
  //   addRoad(h.kind, h.seg, h.offset, h.size, {
  //     isHurdle: true,
  //   });
  // }

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