// ═══════════════════════════════════════════════════════
// LEVEL 2 SCENERY — LocationDScenery
// ═══════════════════════════════════════════════════════

import { C } from '../../configs/roadConfig.js';
import { trackLen } from '../../core/roadMap.js';

export function buildSceneryObjects() {
  const objs = [];
  const total = Math.max(1, Math.floor(trackLen / C.SEG_LEN));

  function addSide(kind, seg, side, offset = 1.65, size = 1) {
    if (seg >= total - 10) return;
    objs.push({
      kind,
      z: seg * C.SEG_LEN,
      side,
      offset,
      size,
      noCollision: true,
    });
  }

  function addRoad(kind, seg, offset = 0, size = 1, extra = {}) {
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

  // SIDE BUMPERS / POLES
  for (let i = 5; i < total - 20; i += 3) {
    addSide('bumper1', i, -1, 1.12, 0.75);
    addSide('bumper2', i + 1, 1, 1.12, 0.75);
  }

  // TREES
  const trees = ['tree1', 'tree2', 'tree3'];
  for (let i = 12; i < total - 30; i += 14) {
    addSide(trees[i % trees.length], i, -1, 1.75, 1.05);
    addSide(trees[(i + 1) % trees.length], i + 4, 1, 1.75, 1.05);
  }

  // BIG CITY LANDMARKS
  for (let i = 25; i < total - 40; i += 95) {
    addSide('tower', i, -1, 2.55, 1.00);
    addSide('building', i + 12, 1, 2.35, 1.00);
    addSide('cathedral', i + 26, -1, 2.65, 1.00);
    addSide('ferrisWheel', i + 42, 1, 2.80, 1.00);
    addSide('cityBuilding', i + 60, -1, 2.70, 1.00);
  }

  // ARCHES / TUNNELS
  for (let i = 45; i < total - 30; i += 150) {
    addRoad('stoneArch', i, 0, 1.15, {
      overhead: true,
      noCollision: true,
    });

    addRoad('rallyArch', i + 70, 0, 1.15, {
      overhead: true,
      noCollision: true,
    });
  }

  // COINS
  const lanes = [-0.58, 0, 0.58];

  for (let i = 30; i < total - 30; i += 32) {
    const lane = lanes[Math.floor(i / 32) % lanes.length];

    for (let k = 0; k < 6; k++) {
      addRoad('coin', i + k * 2, lane, 1.00, {
        isCoin: true,
      });
    }
  }

  // BOOSTERS / NITRO
  for (let i = 80; i < total - 40; i += 120) {
    const lane = lanes[Math.floor(i / 120) % lanes.length];

    addRoad('booster', i, lane, 1.00, {
      isBooster: true,
    });
  }

  // ON-ROAD HURDLES
  const HURDLES = [
    { kind: 'barricade1', seg: 65, offset: 0.00, size: 0.62 },
    { kind: 'barricade2', seg: 130, offset: -0.58, size: 0.66 },
    { kind: 'barricade3', seg: 210, offset: 0.58, size: 0.75 },
    { kind: 'barricade4', seg: 285, offset: 0.00, size: 0.78 },

    { kind: 'barricade1', seg: 390, offset: 0.58, size: 0.62 },
    { kind: 'barricade2', seg: 520, offset: 0.00, size: 0.66 },
    { kind: 'barricade3', seg: 680, offset: -0.58, size: 0.75 },
    { kind: 'barricade4', seg: 820, offset: 0.58, size: 0.78 },

    { kind: 'barricade1', seg: 1040, offset: 0.00, size: 0.62 },
    { kind: 'barricade2', seg: 1220, offset: -0.58, size: 0.66 },
    { kind: 'barricade3', seg: 1440, offset: 0.58, size: 0.75 },
    { kind: 'barricade4', seg: 1660, offset: 0.00, size: 0.78 },
  ];

  for (const h of HURDLES) {
    addRoad(h.kind, h.seg, h.offset, h.size, {
      isHurdle: true,
    });
  }

  // BIRDS AS DECORATION
  for (let i = 60; i < total - 40; i += 140) {
    addSide('bird1', i, -1, 1.35, 0.75);
    addSide('bird2', i + 35, 1, 1.35, 0.75);
  }

  // FINISH BANNER NEAR END
  addRoad('finishBanner', total - 18, 0, 1.15, {
    overhead: true,
    noCollision: true,
  });

  return objs;
}