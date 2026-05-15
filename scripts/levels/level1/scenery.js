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

  function addBoundaryPoles(startSeg, endSeg, stepSeg, offset = 1.35) {
    const poleKinds = ['poleStump'];

    for (let i = startSeg, n = 0; i < Math.min(total - 10, endSeg); i += stepSeg, n++) {
      const z = i * C.SEG_LEN;
      const leftKind = poleKinds[n % poleKinds.length];
      const rightKind = poleKinds[(n + 1) % poleKinds.length];

      objs.push({
        kind: leftKind,
        z: z + 40,
        side: -1 * sideFlip,
        offset,
        small: true,
        isBoundaryPole: true,
      });

      objs.push({
        kind: rightKind,
        z: z + 95,
        side: 1 * sideFlip,
        offset,
        small: true,
        isBoundaryPole: true,
      });
    }
  }

  // Boundary poles for Road1 fake road and Road2 winning road
  addBoundaryPoles(-25, total - 25, onRoad2 ? 1 : 1, onRoad2 ? 1.30 : 1.30);

  // ── START BANNER exactly above starting line ─────────────
  if (!onRoad2) {
    objs.push({
      kind: 'startBanner',
      z: 0,
      side: 0,
      offset: 0,
      overhead: true,
      noCollision: true,
      size: 1.15,
    });
  }

  const trees = ['pineTall', 'tallTree', 'pineBig', 'pineSmall'];

  // Trees on both sides
  for (let i = 10; i < total - 30; i += 10) {
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

  // Totems on both road sides
  for (let i = 35; i < total - 25; i += 45) {
    const z = i * C.SEG_LEN;

    objs.push({
      kind: 'totemOnly',
      z: z + 40,
      side: -1 * sideFlip,
      offset: onRoad2 ? 1.70 : 1.70,
      small: false,
      isTotem: true,
    });

    objs.push({
      kind: 'totemOnly',
      z: z + 220,
      side: 1 * sideFlip,
      offset: onRoad2 ? 1.70 : 1.70,
      small: false,
      isTotem: true,
    });
  }

  // Bridges / side structures
  for (let i = 40; i < total - 20; i += 110) {
    const z = i * C.SEG_LEN;
    objs.push({
      kind: 'bridge',
      z,
      side: -1 * sideFlip,
      offset: onRoad2 ? 3.99 : 3.99,
    });
    objs.push({
      kind: 'bridge',
      z: z + 240,
      side: 1 * sideFlip,
      offset: onRoad2 ? 3.78 : 3.78,
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

  // ── ON-ROAD HURDLES ──────────────────────────────────
  const HURDLES = [
    { kind: 'gorillaRock', seg: 55, offset: -0.58, size: 0.40, clearAirHeight: 10 },
    { kind: 'gorillaRock', seg: 400, offset: -0.58, size: 0.40, clearAirHeight: 10 },
    { kind: 'gorillaRock', seg: 1080, offset: 0.00, size: 0.40, clearAirHeight: 10 },
    { kind: 'gorillaRock', seg: 1260, offset: 0.00, size: 0.40, clearAirHeight: 10 },
    { kind: 'gorillaRock', seg: 1760, offset: 0.00, size: 0.40, clearAirHeight: 10 },
    { kind: 'stoneWall', seg: 170, offset: 0.00, size: 0.40, clearAirHeight: 10 },
    { kind: 'stoneWall', seg: 700, offset: 0.70, size: 0.40, clearAirHeight: 10 },
    { kind: 'stoneWall', seg: 840, offset: 0.00, size: 0.40, clearAirHeight: 10 },
    { kind: 'stoneWall', seg: 930, offset: 0.00, size: 0.40, clearAirHeight: 10 },
    { kind: 'woodFence', seg: 95, offset: 0.70, size: 0.70, clearAirHeight: 10 },
    { kind: 'woodFence', seg: 365, offset: 0.70, size: 0.70, clearAirHeight: 10 },
    { kind: 'woodFence', seg: 600, offset: -0.58, size: 0.70, clearAirHeight: 10 },
    { kind: 'woodFence', seg: 1190, offset: -0.58, size: 0.70, clearAirHeight: 10 },
    { kind: 'woodFence', seg: 1190, offset: 0.70, size: 0.70, clearAirHeight: 10 },
    { kind: 'woodFence', seg: 1520, offset: 0.70, size: 0.70, clearAirHeight: 10 },
    { kind: 'stoneBlock', seg: 320, offset: 0.00, size: 0.45, clearAirHeight: 10 },
    { kind: 'stoneBlock', seg: 670, offset: 0.70, size: 0.45, clearAirHeight: 10 },
    { kind: 'stoneBlock', seg: 970, offset: -0.58, size: 0.45, clearAirHeight: 10 },
    { kind: 'stoneBlock', seg: 1390, offset: 0.00, size: 0.45, clearAirHeight: 10 },
    { kind: 'stoneBlock', seg: 1560, offset: 0.00, size: 0.45, clearAirHeight: 10 },
  ];

  for (const h of HURDLES) {
    if (h.seg >= total - 30) continue;
    objs.push({
      kind: h.kind,
      z: h.seg * C.SEG_LEN,
      side: 0,
      offset: h.offset,
      isHurdle: true,
      size: h.size,
    });
  }

  // ═════════════════════════════════════════════════════
  // ON-ROAD JUMPS — boostPad ONLY, evenly spread
  // ─────────────────────────────────────────────────────
  // ONLY boostPad is used (per request). One every ~70 segments.
  // Lanes alternate: center → left → right → center, so the
  // player must steer to take them.
  // ═════════════════════════════════════════════════════
  const BOOSTPAD_SPACING = 70;     // segments between pads
  const BOOSTPAD_FIRST = 100;    // first pad position
  const BOOSTPAD_LAST = total - 30;

  const lanePattern = [0.00, -0.55, 0.55];   // center, left, right (loops)

  const JUMPS = [];
  let padIdx = 0;
  for (let s = BOOSTPAD_FIRST; s < BOOSTPAD_LAST; s += BOOSTPAD_SPACING) {
    JUMPS.push({
      kind: 'boostPad',
      seg: s,
      offset: lanePattern[padIdx % lanePattern.length],
      size: 1.10,
    });
    padIdx++;
  }

  for (const j of JUMPS) {
    if (j.seg >= total - 8) continue;
    if (j.seg < 5) continue;
    objs.push({
      kind: j.kind,
      z: j.seg * C.SEG_LEN,
      side: 0,
      offset: j.offset || 0,
      isJump: true,
      size: j.size ?? 1.00,
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