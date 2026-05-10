import { C } from '../../configs/roadConfig.js';
import { trackLen } from '../../core/roadMap.js';

export function buildSceneryObjects() {
  const objs = [];
  const total = Math.floor(trackLen / C.SEG_LEN);

  function addSide(kind, seg, side, offset = 1.8, size = 1.0, extra = {}) {
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


  function addBackground(kind, seg, side, offset = 4.0, size = 1.0) {
  addSide(kind, seg, side, offset, size, {
    backgroundProp: true,
    noCollision: true,
    small: false,
  });
}

  function addRoad(kind, seg, offset = 0, size = 1.0, extra = {}) {
    objs.push({
      kind,
      z: seg * C.SEG_LEN,
      offset,
      size,
      side: 0,
      ...extra,
    });
  }

  function addMural(symbol, seg, side) {
    addSide('Landmark1', seg, side, 2.35, 1.1, {
      isMural: true,
      symbol,
      noCollision: true,
    });
  }

  function addSwitch(symbol, seg, side) {
    addSide('Bumper2', seg, side, 1.15, 0.75, {
      isPuzzleSwitch: true,
      symbol,
      noCollision: false,
      small: true,
    });
  }

  function addTrap(seg, offset) {
    addRoad('Barricade1', seg, offset, 0.75, {
      isHurdle: true,
      isPuzzleTrap: true,
      hidden: true,
      clearAirHeight: 999,
    });
  }

  // Normal scenery
  for (let i = 20; i < total - 20; i += 14) {
    addSide('Tree1', i, -1, 1.9, 1.0);
    addSide('Tree2', i + 2, 1, 1.9, 1.0);
  }

  for (let i = 80; i < total - 40; i += 220) {
    addSide('Massive1', i, -1, 2.4, 1.0);
    addSide('Massive2', i + 40, 1, 2.4, 1.0);
  }
  // =====================================================
  // PUZZLE SPREAD ACROSS WHOLE ROAD
  // 25% → 50% → 75% → 100% progression
  // =====================================================

  const q1 = Math.floor(total * 0.20);
  const q2 = Math.floor(total * 0.42);
  const q3 = Math.floor(total * 0.66);
  const q4 = Math.floor(total * 0.86);

  // Hidden clue murals
  addMural('⭐', q1 - 25, -1);
  addMural('🌙', q2 - 25, 1);
  addMural('🔥', q3 - 25, -1);
  addMural('🌊', q4 - 25, 1);

  // Switches placed far apart
  addSwitch('star', q1, -1);
  addSwitch('water', q2, 1);
  addSwitch('fire', q3, -1);
  addSwitch('moon', q4, 1);

  // Traps appear only after wrong sequence
  addTrap(430, -0.55);
  addTrap(450, 0.55);
  addTrap(470, 0);

  // Coins
  for (let i = 40; i < total - 40; i += 32) {
    addRoad('Coin', i, -0.55, 1.0, { isCoin: true });
    addRoad('Coin', i + 2, 0, 1.0, { isCoin: true });
    addRoad('Coin', i + 4, 0.55, 1.0, { isCoin: true });
  }

  // Boosters
  for (let i = 90; i < total - 50; i += 130) {
    addRoad('Boost', i, 0, 1.0, { isBooster: true });
  }


  // =====================================================
// FAR BACKGROUND DECORATION — LEVEL 3 DESERT EDGES
// These sit on the wide empty background area, not road edge
// =====================================================

for (let i = 40; i < total - 40; i += 38) {
  addBackground('Tree1', i, -1, 3.8, 0.75);
  addBackground('Tree2', i + 10, 1, 3.8, 0.75);

  addBackground('Tree3', i + 20, -1, 4.7, 0.65);
  addBackground('Tree3', i + 30, 1, 4.7, 0.65);
}

for (let i = 90; i < total - 60; i += 170) {
  addBackground('Massive1', i, -1, 5.2, 0.85);
  addBackground('Massive2', i + 45, 1, 5.2, 0.85);

  addBackground('Landmark2', i + 85, -1, 4.4, 0.80);
  addBackground('Landmark3', i + 120, 1, 4.4, 0.80);
}


  return objs;
}