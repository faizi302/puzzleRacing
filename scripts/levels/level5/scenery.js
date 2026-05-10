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

  // light side decoration, not too dense
  for (let i = 20; i < total - 30; i += 18) {
    addSide(trees[i % trees.length], i, -1, 2.05, 1.0);
    addSide(trees[(i + 1) % trees.length], i + 7, 1, 2.05, 1.0);
  }

  // coastal landmarks farther from road
  for (let i = 120; i < total - 80; i += 260) {
    addSide('Landmark1', i, -1, 3.00, 0.95);
    addSide('Landmark2', i + 70, 1, 3.15, 0.95);
    addSide('Landmark3', i + 135, -1, 3.25, 0.90);
  }

  // massive objects, spaced far apart
  for (let i = 220; i < total - 100; i += 420) {
    addSide('Massive1', i, -1, 2.65, 1.0);
    addSide('Massive2', i + 180, 1, 2.75, 1.0);
  }

  // road side bumpers / boundary poles
  for (let i = 6; i < total - 20; i += 10) {
    addSide('Bumper1', i, -1, 1.18, 0.75, {
      small: true,
      isBoundaryPole: true,
    });

    addSide('Bumper2', i + 5, 1, 1.18, 0.75, {
      small: true,
      isBoundaryPole: true,
    });
  }

  // few tunnels only, because level is long and open
  for (let i = 180; i < total - 80; i += 520) {
    addRoad('Tunnel1', i, 0, 1.08, {
      overhead: true,
      noCollision: true,
    });

    addRoad('Tunnel2', i + 260, 0, 1.08, {
      overhead: true,
      noCollision: true,
    });
  }

  const lanes = [-0.60, 0, 0.60];

  // long coin trails
  for (let i = 50; i < total - 60; i += 38) {
    const lane = lanes[Math.floor(i / 38) % lanes.length];

    for (let k = 0; k < 5; k++) {
      addRoad('Coin', i + k * 2, lane, 1.0, {
        isCoin: true,
      });
    }
  }

  // boosters are less frequent because road is long
  for (let i = 160; i < total - 80; i += 230) {
    const lane = lanes[Math.floor(i / 230) % lanes.length];

    addRoad('Boost', i, lane, 1.0, {
      isBooster: true,
    });
  }

  // fewer hurdles than level 4
  const HURDLES = [
    { kind: 'Barricade1', seg: 260, offset: -0.60, size: 0.68 },
    { kind: 'Barricade2', seg: 480, offset: 0.60, size: 0.68 },
    { kind: 'Barricade3', seg: 760, offset: 0.00, size: 0.72 },

    { kind: 'Barricade4', seg: 1120, offset: -0.60, size: 0.70 },
    { kind: 'Barricade1', seg: 1450, offset: 0.60, size: 0.68 },
    { kind: 'Barricade2', seg: 1780, offset: 0.00, size: 0.68 },

    { kind: 'Barricade3', seg: 2200, offset: -0.60, size: 0.72 },
    { kind: 'Barricade4', seg: 2650, offset: 0.60, size: 0.70 },
    { kind: 'Barricade1', seg: 3100, offset: 0.00, size: 0.68 },
  ];

  for (const h of HURDLES) {
    addRoad(h.kind, h.seg, h.offset, h.size, {
      isHurdle: true,
    });
  }

  // start / finish arch
  addRoad('Finish', 1, 0, 1.15, {
    overhead: true,
    noCollision: true,
  });

  return objs;
}