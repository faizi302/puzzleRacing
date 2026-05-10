import { C } from '../../configs/roadConfig.js';
import { trackLen } from '../../core/roadMap.js';

export function buildSceneryObjects() {
  const objs = [];
  const total = Math.floor(trackLen / C.SEG_LEN);

  function addSide(kind, seg, side, offset = 2.0, size = 1.0, extra = {}) {
    if (seg >= total - 10) return;

    objs.push({
      kind,
      z: seg * C.SEG_LEN,
      side,
      offset,
      size,
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

  const trees = ['Tree1', 'Tree2', 'Tree3'];

  for (let i = 12; i < total - 20; i += 10) {
    addSide(trees[i % trees.length], i, -1, 1.85, 0.9);
    addSide(trees[(i + 1) % trees.length], i + 3, 1, 1.85, 0.9);
  }

  for (let i = 35; i < total - 40; i += 95) {
    addSide('Massive1', i, -1, 2.45, 0.9);
    addSide('Massive2', i + 30, 1, 2.45, 0.9);
  }

  for (let i = 60; i < total - 50; i += 160) {
    addSide('Landmark1', i, -1, 3.0, 0.95);
    addSide('Landmark2', i + 55, 1, 3.0, 0.95);
  }

  // side boundary poles
  for (let i = 5; i < total - 20; i += 8) {
    addSide('Bumper1', i, -1, 1.18, 0.7, {
      small: true,
      isBoundaryPole: true,
    });

    addSide('Bumper2', i + 4, 1, 1.18, 0.7, {
      small: true,
      isBoundaryPole: true,
    });
  }

  // tunnels / arches
  for (let i = 90; i < total - 60; i += 240) {
    addRoad('Tunnel1', i, 0, 1.08, {
      overhead: true,
      noCollision: true,
    });

    addRoad('Tunnel2', i + 120, 0, 1.08, {
      overhead: true,
      noCollision: true,
    });
  }

  const lanes = [-0.6, 0, 0.6];

  // coins
  for (let i = 35; i < total - 40; i += 26) {
    const lane = lanes[Math.floor(i / 26) % lanes.length];

    addRoad('Coin', i, lane, 1.0, { isCoin: true });
    addRoad('Coin', i + 2, lane, 1.0, { isCoin: true });
    addRoad('Coin', i + 4, lane, 1.0, { isCoin: true });
  }

  // boosters
  for (let i = 100; i < total - 50; i += 135) {
    const lane = lanes[Math.floor(i / 135) % lanes.length];

    addRoad('Boost', i, lane, 1.0, {
      isBooster: true,
    });
  }

  // hard obstacles
  const HURDLES = [
    { kind: 'Barricade1', seg: 150, offset: -0.6, size: 0.72 },
    { kind: 'Barricade2', seg: 230, offset: 0.6, size: 0.72 },
    { kind: 'Barricade3', seg: 340, offset: 0, size: 0.7 },

    { kind: 'Barricade4', seg: 520, offset: -0.6, size: 0.7 },
    { kind: 'Barricade1', seg: 610, offset: 0.6, size: 0.72 },

    { kind: 'Barricade2', seg: 780, offset: -0.6, size: 0.72 },
    { kind: 'Barricade3', seg: 860, offset: 0, size: 0.7 },
    { kind: 'Barricade4', seg: 940, offset: 0.6, size: 0.7 },

    { kind: 'Barricade1', seg: 1130, offset: -0.6, size: 0.72 },
    { kind: 'Barricade2', seg: 1230, offset: 0, size: 0.72 },
    { kind: 'Barricade3', seg: 1340, offset: 0.6, size: 0.7 },

    { kind: 'Barricade4', seg: 1510, offset: -0.6, size: 0.7 },
    { kind: 'Barricade1', seg: 1620, offset: 0.6, size: 0.72 },
    { kind: 'Barricade2', seg: 1760, offset: 0, size: 0.72 },
  ];

  for (const h of HURDLES) {
    addRoad(h.kind, h.seg, h.offset, h.size, {
      isHurdle: true,
    });
  }

  addRoad('Finish', 1, 0, 1.15, {
    overhead: true,
    noCollision: true,
  });

  return objs;
}