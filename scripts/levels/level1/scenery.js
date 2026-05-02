// ═══════════════════════════════════════════════════════
// LEVEL 1 SCENERY — Reverse Gate story
// Road1 = fake forward race
// Road2 = secret backward road
// ═══════════════════════════════════════════════════════
import { C } from '../../configs/roadConfig.js';
import { trackLen, getActiveTrack } from '../../core/roadMap.js';
import { P } from '../../systems/roadSystem.js';

export function buildSceneryObjects() {
  const objs = [];
  const onRoad2 = getActiveTrack() === 2;
  const total = Math.max(1, Math.floor(trackLen / C.SEG_LEN));

  // When secret road is discovered, left/right scenery is mirrored.
  const sideFlip = P.reverseMode ? -1 : 1;

  const trees = ['pineTall', 'tallTree', 'pineBig', 'pineSmall'];
  const rocks = ['rockLow', 'rockBig', 'totem'];

  // Trees on both sides
  for (let i = 30; i < total - 30; i += 28) {
    const z = i * C.SEG_LEN;
    objs.push({
      kind: trees[(i * 3) % trees.length],
      z: z + 40,
      side: -1 * sideFlip,
      offset: onRoad2 ? 1.40 : 1.65,
    });
    objs.push({
      kind: trees[(i * 5 + 2) % trees.length],
      z: z + 260,
      side: 1 * sideFlip,
      offset: onRoad2 ? 1.40 : 1.65,
    });
  }

  // Rocks / totems
  for (let i = 40; i < total - 20; i += 38) {
    const z = i * C.SEG_LEN;
    objs.push({
      kind: rocks[(i * 7) % rocks.length],
      z: z + 20,
      side: -1 * sideFlip,
      offset: onRoad2 ? 1.12 : 1.25,
      small: true,
    });
    objs.push({
      kind: rocks[(i * 11 + 2) % rocks.length],
      z: z + 280,
      side: 1 * sideFlip,
      offset: onRoad2 ? 1.25 : 1.48,
      small: true,
    });
  }

  // Bridges / side structures
  for (let i = 40; i < total - 20; i += 110) {
    const z = i * C.SEG_LEN;
    objs.push({
      kind: 'bridge',
      z,
      side: -1 * sideFlip,
      offset: onRoad2 ? 2.55 : 3.0,
    });
    objs.push({
      kind: 'bridge',
      z: z + 240,
      side: 1 * sideFlip,
      offset: onRoad2 ? 2.35 : 2.62,
    });
  }

  // Coins
  for (let i = 35; i < total - 20; i += 28) {
    const z = i * C.SEG_LEN;
    const lanes = [-0.60, 0, 0.60];
    const laneOff = lanes[Math.floor(i / 28) % lanes.length];

    for (let k = 0; k < 5; k++) {
      objs.push({
        kind: 'coin',
        side: 0,
        offset: laneOff,
        z: z + k * 300,
        isCoin: true,
      });
    }
  }

  // Boosters
  for (let i = 80; i < total - 40; i += 115) {
    const z = i * C.SEG_LEN;
    const lanes = [-0.60, 0, 0.60];
    const laneOff = lanes[Math.floor(i / 95) % lanes.length];

    objs.push({
      kind: 'booster',
      z: z + 120,
      side: 0,
      offset: laneOff,
      isBooster: true,
    });
  }

  // Road1 fake impossible forward gate
  if (!onRoad2) {
    const blockZ = Math.max(C.SEG_LEN * 40, trackLen - C.SEG_LEN * 18);

    objs.push({
      kind: 'stoneArch',
      z: blockZ,
      side: 0,
      offset: 0,
      overhead: true,
      isForkGate: true,
      forkTint: 'road1',
    });

    objs.push({
      kind: 'totem',
      z: blockZ + C.SEG_LEN * 3,
      side: -1,
      offset: 1.10,
      small: false,
      isForkMarker: true,
    });

    objs.push({
      kind: 'totem',
      z: blockZ + C.SEG_LEN * 5,
      side: 1,
      offset: 1.10,
      small: false,
      isForkMarker: true,
    });
  }

  // Road2 secret entrance / secret-road markers
  if (onRoad2) {
    for (let i = 45; i < total - 20; i += 170) {
      objs.push({
        kind: 'woodArch',
        z: i * C.SEG_LEN,
        side: 0,
        offset: 0,
        overhead: true,
        isForkGate: true,
        forkTint: 'road2',
      });
    }

    for (let i = 70; i < total - 30; i += 130) {
      objs.push({
        kind: 'totem',
        z: i * C.SEG_LEN,
        side: 1 * sideFlip,
        offset: 1.15,
        small: false,
        isForkMarker: true,
      });
    }
  }

  return objs;
}