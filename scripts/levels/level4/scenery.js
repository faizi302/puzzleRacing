import { C } from '../../configs/roadConfig.js';
import { trackLen } from '../../core/roadMap.js';

// ═════════════════════════════════════════════════════════════════
// LEVEL 4 — MEMORY SPRINT scenery
//
// ── Memory checkpoint design ──
// 9 checkpoints are placed evenly along the road. At each checkpoint
// THREE platforms are spawned — one in each lane (left, center, right).
// Exactly ONE of those three is the SAFE platform; the other two are
// DANGER platforms.
//
// Visuals during preview phase:
//   safe   → visible
//   danger → also visible, so the player can memorise the SAFE lane
//
// After the preview window expires, ALL platforms become hidden and
// the player has to drive the safe lane from memory. Detection of
// "did the player pass through the safe lane" is done in logic.js by
// reading the player's lateral X at the moment they cross each
// checkpoint's z position.
//
// Lane offsets MUST match logic.js (LANES constant).
// ═════════════════════════════════════════════════════════════════

const LANES = [-0.55, 0.0, 0.55];  // left, center, right

// Deterministic per-checkpoint "safe lane" so the level plays the
// same way every run. Tweak this array to change the puzzle.
//                          checkpoint:  1  2  3  4  5  6  7  8  9
const SAFE_LANE_INDEX_BY_CHECKPOINT = [1, 0, 2, 1, 0, 2, 1, 2, 0];

// Exported so logic.js can read it without duplicating constants.
export const L4_LAYOUT = {
  LANES,
  SAFE_LANE_INDEX_BY_CHECKPOINT,
  CHECKPOINT_FRACTIONS: [0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72, 0.82, 0.90],
};

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
    addRoad('Tunnel1', i, 0, 1.08, { overhead: true, noCollision: true });
    addRoad('Tunnel2', i + 120, 0, 1.08, { overhead: true, noCollision: true });
  }

  const lanes = [-0.6, 0, 0.6];

  // ─── Compute checkpoint segments first so we can avoid clutter near them ───
  const checkpointSegs = L4_LAYOUT.CHECKPOINT_FRACTIONS.map(f => Math.floor(total * f));
  const nearCheckpoint = (seg) => checkpointSegs.some(cs => Math.abs(cs - seg) < 8);

  // coins — skip segments near memory checkpoints so they don't
  // clutter the lanes the player needs to read.
  for (let i = 35; i < total - 40; i += 26) {
    if (nearCheckpoint(i)) continue;
    const lane = lanes[Math.floor(i / 26) % lanes.length];
    addRoad('Coin', i, lane, 1.0, { isCoin: true });
    addRoad('Coin', i + 2, lane, 1.0, { isCoin: true });
    addRoad('Coin', i + 4, lane, 1.0, { isCoin: true });
  }

  // boosters
  for (let i = 100; i < total - 50; i += 135) {
    if (nearCheckpoint(i)) continue;
    const lane = lanes[Math.floor(i / 135) % lanes.length];
    addRoad('Boost', i, lane, 1.0, { isBooster: true });
  }

  // ─── Hard obstacles ───
  // Skip any that fall inside a checkpoint window — we don't want
  // a Barricade obscuring or duplicating the memory platforms.
  const HURDLES = [
    { kind: 'Barricade1', seg: 150, offset: -0.6, size: 0.72 },
    { kind: 'Barricade2', seg: 230, offset: 0.6, size: 0.72 },
    { kind: 'Barricade3', seg: 340, offset: 0, size: 0.70 },
    { kind: 'Barricade4', seg: 520, offset: -0.6, size: 0.70 },
    { kind: 'Barricade1', seg: 610, offset: 0.6, size: 0.72 },
    { kind: 'Barricade2', seg: 780, offset: -0.6, size: 0.72 },
    { kind: 'Barricade3', seg: 860, offset: 0, size: 0.70 },
    { kind: 'Barricade4', seg: 940, offset: 0.6, size: 0.70 },
    { kind: 'Barricade1', seg: 1130, offset: -0.6, size: 0.72 },
    { kind: 'Barricade2', seg: 1230, offset: 0, size: 0.72 },
    { kind: 'Barricade3', seg: 1340, offset: 0.6, size: 0.70 },
    { kind: 'Barricade4', seg: 1510, offset: -0.6, size: 0.70 },
    { kind: 'Barricade1', seg: 1620, offset: 0.6, size: 0.72 },
    { kind: 'Barricade2', seg: 1760, offset: 0, size: 0.72 },
  ];

  for (const h of HURDLES) {
    if (nearCheckpoint(h.seg)) continue;
    addRoad(h.kind, h.seg, h.offset, h.size, { isHurdle: true });
  }

  addRoad('Finish', 1, 0, 1.15, {
    overhead: true,
    noCollision: true,
  });

  // ═════════════════════════════════════════════════════════════════
  // MEMORY CHECKPOINTS — 9 rows × 3 lanes (one safe per row)
  // ═════════════════════════════════════════════════════════════════
  function addMemoryPad(checkpointIdx, laneIdx, seg, offset, isSafe) {
    addRoad('boostPad', seg, offset, 1.10, {
      isJump: true,
      noCollision: false,

      isMemoryPlatform: true,
      checkpointIdx,
      laneIdx,

      isSafePlatform: isSafe,
      isDangerPlatform: !isSafe,

      // safe jump is glowing/visible
      // danger jump is also visible but marked as danger
      memoryHidden: false,
      previewVisible: true,

      // use these in renderer if needed
      glowSafe: isSafe,
      glowDanger: !isSafe,

      roadFrac: 0.72,
      heightMul: 0.85,
    });

  }


   L4_LAYOUT.CHECKPOINT_FRACTIONS.forEach((frac, cpIdx) => {
    const seg = Math.floor(total * frac);
    const safeLane = SAFE_LANE_INDEX_BY_CHECKPOINT[cpIdx];

    for (let laneIdx = 0; laneIdx < LANES.length; laneIdx++) {
      addMemoryPad(
        cpIdx,
        laneIdx,
        seg,
        LANES[laneIdx],
        laneIdx === safeLane
      );
    }
  });

  return objs;
}