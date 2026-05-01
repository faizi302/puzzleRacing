// ═══════════════════════════════════════════════════════
// LEVEL 1 SCENERY — Trees, arches, coins, keys, fork markers.
// ─────────────────────────────────────────────────────
// Returns the scenery-objects array. The shared
// visuals/sceneryRender.js consumes it via getActiveLevel().
// ═══════════════════════════════════════════════════════
import { C } from '../../configs/roadConfig.js';
import { trackLen, getActiveTrack } from '../../core/roadMap.js';

export function buildSceneryObjects() {
  const objs    = [];
  const onRoad2 = getActiveTrack() === 2;
  const total   = Math.max(1, Math.floor(trackLen / C.SEG_LEN));

  const trees = ['pineTall', 'tallTree', 'pineBig', 'pineSmall'];
  const rocks = ['rockLow', 'rockBig', 'totem'];

  // Trees on both sides
  for (let i = 30; i < total - 30; i += 28) {
    const z = i * C.SEG_LEN;
    objs.push({ kind: trees[(i * 3) % trees.length],     z: z + 40,  side: -1, offset: 1.65 });
    objs.push({ kind: trees[(i * 5 + 2) % trees.length], z: z + 260, side:  1, offset: 1.65 });
  }

  // Rocks / totems
  for (let i = 40; i < total - 20; i += 38) {
    const z = i * C.SEG_LEN;
    objs.push({ kind: rocks[(i * 7)      % rocks.length], z: z + 20,  side: -1, offset: 1.25, small: true });
    objs.push({ kind: rocks[(i * 11 + 2) % rocks.length], z: z + 280, side:  1, offset: 1.48, small: true });
  }

  // Bridges
  for (let i = 40; i < total - 20; i += 110) {
    const z = i * C.SEG_LEN;
    objs.push({ kind: 'bridge', z: z,       side: -1, offset: 3.0  });
    objs.push({ kind: 'bridge', z: z + 240, side:  1, offset: 2.62 });
  }

  // Coin pickups
  for (let i = 35; i < total - 20; i += 28) {
    const z       = i * C.SEG_LEN;
    const lanes   = [-0.60, 0, 0.60];
    const laneOff = lanes[Math.floor(i / 28) % lanes.length];
    for (let k = 0; k < 5; k++) {
      objs.push({ kind: 'coin', side: 0, offset: laneOff, z: z + k * 300, isCoin: true });
    }
  }

  // Boosters
  for (let i = 80; i < total - 40; i += 115) {
    const z       = i * C.SEG_LEN;
    const lanes   = [-0.60, 0, 0.60];
    const laneOff = lanes[Math.floor(i / 95) % lanes.length];
    objs.push({ kind: 'booster', z: z + 120, side: 0, offset: laneOff, isBooster: true });
  }

  // Wood / stone arches
  for (let i = 120; i < total - 20; i += 220) {
    objs.push({ kind: 'woodArch',  z: i * C.SEG_LEN, side: 0, offset: 0, overhead: true });
  }
  for (let i = 230; i < total - 20; i += 260) {
    objs.push({ kind: 'stoneArch', z: i * C.SEG_LEN, side: 0, offset: 0, overhead: true });
  }

  // Fork visual markers
  const forkZ = C.FORK_Z;
  if (!onRoad2) {
    objs.push({
      kind: 'stoneArch', z: forkZ - C.SEG_LEN * 8,
      side: 0, offset: 0, overhead: true,
      isForkGate: true, forkTint: 'road1',
    });
    objs.push({ kind: 'totem', z: forkZ + C.SEG_LEN * 4,  side: -1, offset: 1.20, small: false, isForkMarker: true });
    objs.push({ kind: 'totem', z: forkZ + C.SEG_LEN * 10, side: -1, offset: 1.20, small: false, isForkMarker: true });
  } else {
    objs.push({
      kind: 'woodArch', z: forkZ - C.SEG_LEN * 8,
      side: 0, offset: 0, overhead: true,
      isForkGate: true, forkTint: 'road2',
    });
    objs.push({ kind: 'totem', z: forkZ + C.SEG_LEN * 4,  side: 1, offset: 1.20, small: false, isForkMarker: true });
    objs.push({ kind: 'totem', z: forkZ + C.SEG_LEN * 10, side: 1, offset: 1.20, small: false, isForkMarker: true });
  }

  // Keys — Road1 only
  if (!onRoad2) {
    const keyCount = C.KEYS_REQUIRED;
    const lanes    = [-0.55, 0, 0.55];
    for (let k = 0; k < keyCount; k++) {
      const t      = (k + 1) / (keyCount + 1);
      const segIdx = Math.floor(total * t);
      const z      = segIdx * C.SEG_LEN;
      objs.push({ kind: 'key', z, side: 0, offset: lanes[k % lanes.length], isKey: true });
    }
  }

  return objs;
}