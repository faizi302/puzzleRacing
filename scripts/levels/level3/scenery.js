import { C } from '../../configs/roadConfig.js';
import { trackLen } from '../../core/roadMap.js';

export function buildSceneryObjects() {
  const objs = [];
  const total = Math.floor(trackLen / C.SEG_LEN);

  function addSide(kind, seg, side, offset = 1.8, size = 1.0) {
    objs.push({
      kind,
      z: seg * C.SEG_LEN,
      side,
      offset,
      size,
      noCollision: true,
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

  // Trees

  for (let i = 20; i < total - 20; i += 14) {
    addSide('Tree1', i, -1, 1.9, 1.0);
    addSide('Tree2', i + 2, 1, 1.9, 1.0);
  }

  // Massive objects

  for (let i = 80; i < total - 40; i += 220) {
    addSide('Massive1', i, -1, 2.4, 1.0);
    addSide('Massive2', i + 40, 1, 2.4, 1.0);
  }

  // Coins

  for (let i = 40; i < total - 40; i += 32) {
    addRoad('Coin', i, -0.55, 1.0, { isCoin: true });
    addRoad('Coin', i + 2, 0, 1.0, { isCoin: true });
    addRoad('Coin', i + 4, 0.55, 1.0, { isCoin: true });
  }

  // Boosters

  for (let i = 90; i < total - 50; i += 130) {
    addRoad('Boost', i, 0, 1.0, {
      isBooster: true,
    });
  }

  return objs;
}