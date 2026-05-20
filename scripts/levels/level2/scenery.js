import { C } from '../../configs/roadConfig.js';
import { trackLen } from '../../core/roadMap.js';

// ═══════════════════════════════════════════════════════
// LEVEL 2 — THE SHIFTING MAZE — SCENERY
// ═══════════════════════════════════════════════════════

export function buildSceneryObjects() {
  const objs = [];
  const total = Math.max(1, Math.floor(trackLen / C.SEG_LEN));

  // ─── helpers ────────────────────────────────────────
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

  // ─── TREES ──────────────────────────────────────────
  const trees = ['tree1', 'tree2', 'tree3'];
  for (let i = 15; i < total - 30; i += 20) {
    const z = i * C.SEG_LEN;
    addSide(trees[(i * 3) % trees.length], z + 40,  -1, 3.99, 1.0);
    addSide(trees[(i * 5 + 2) % trees.length], z + 260, 1, 3.99, 1.0);
  }

  // ─── SIDE BUMPERS / POLES ────────────────────────────
  for (let i = 3; i < total - 25; i += 10) {
    const z = i * C.SEG_LEN;
    addSide('bumper1', z + 30,  -1, 1.38, 1.00, { small: true, isBoundaryPole: true });
    addSide('bumper2', z + 110,  1, 1.38, 1.00, { small: true, isBoundaryPole: true });
  }

  // ─── CITY BUILDINGS ──────────────────────────────────
  const BUILDING_KINDS = ['building', 'cityBuilding', 'cathedral'];
  for (let i = 10, n = 0; i < total - 8; i += 2, n++) {
    const kind   = BUILDING_KINDS[n % BUILDING_KINDS.length];
    const side   = n % 2 === 0 ? -1 : 1;
    const offset = side === -1
      ? 4.70 + ((n % 3) * 0.20)
      : 4.90 + ((n % 3) * 0.20);
    const size   = 0.58 + ((n % 4) * 0.04);
    addSide(kind, i * C.SEG_LEN, side, offset, size, { noCollision: true, small: false });
  }

  function getLandmarkOffset(side, n = 0) {
    return side === -1
      ? 4.70 + ((n % 3) * 0.20)
      : 5.10 + ((n % 2) * 0.15);
  }

  // ─── TOWERS ──────────────────────────────────────────
  const TOWERS = [
    { seg: 236, side: -1, size: 0.58 },
    { seg: 510, side: -1, size: 0.58 },
    { seg: 470, side:  1, size: 0.58 },
    { seg: 600, side:  1, size: 0.58 },
    { seg: 680, side: -1, size: 0.58 },
    { seg: 1000, side: -1, size: 0.58 },
    { seg: 1360, side:  1, size: 0.58 },
    { seg: 1800, side:  1, size: 0.58 },
    { seg: 1930, side: -1, size: 0.58 },
    { seg: 2330, side: -1, size: 0.58 },
    { seg: 2880, side: -1, size: 0.58 },
  ];
  for (const t of TOWERS) {
    if (t.seg < total - 30) {
      addSide('tower', t.seg * C.SEG_LEN, t.side,
        getLandmarkOffset(t.side), t.size, { noCollision: true, small: false });
    }
  }

  // ─── FERRIS WHEELS ───────────────────────────────────
  const FERRIS_WHEELS = [
    { seg: 241, side: -1, size: 0.62 },
    { seg: 476, side:  1, size: 0.58 },
    { seg: 517, side: -1, size: 0.58 },
    { seg: 608, side:  1, size: 0.58 },
    { seg: 687, side: -1, size: 0.58 },
    { seg: 1006, side: -1, size: 0.58 },
    { seg: 1010, side:  1, size: 0.62 },
    { seg: 1366, side:  1, size: 0.58 },
    { seg: 1806, side:  1, size: 0.58 },
    { seg: 1885, side: -1, size: 0.62 },
    { seg: 2335, side: -1, size: 0.58 },
    { seg: 2825, side:  1, size: 0.62 },
    { seg: 2887, side: -1, size: 0.58 },
  ];
  for (const f of FERRIS_WHEELS) {
    if (f.seg < total - 30) {
      addSide('ferrisWheel', f.seg * C.SEG_LEN, f.side,
        getLandmarkOffset(f.side, 1), f.size, { noCollision: true, small: false });
    }
  }

  // ─── ARCHES / TUNNELS ────────────────────────────────
  for (let i = 70; i < total - 40; i += 180) {
    addRoad('stoneArch', i, 0, 1.10, { overhead: true, noCollision: true });
    addRoad('rallyArch', i + 90, 0, 1.10, { overhead: true, noCollision: true });
  }

  // ─── COINS ───────────────────────────────────────────
  const lanes = [-0.60, 0, 0.60];
  for (let i = 35; i < total - 30; i += 30) {
    const lane = lanes[Math.floor(i / 30) % lanes.length];
    for (let k = 0; k < 4; k++) {
      addRoad('coin', i + k * 2, lane, 1.0, { isCoin: true });
    }
  }

  // ─── BOOSTERS ────────────────────────────────────────
  for (let i = 95; i < total - 40; i += 180) {
    const lane = lanes[Math.floor(i / 180) % lanes.length];
    addRoad('booster', i, lane, 0.85, { isBooster: true });
  }

  // ─── NORMAL HURDLES ──────────────────────────────────
  const HURDLES = [
    { kind: 'barricade1', seg: 110, offset: -1.10, size: 0.76 },
    { kind: 'barricade1', seg: 200, offset: -1.10, size: 0.80 },
    { kind: 'barricade1', seg: 310, offset: -0.99, size: 0.80 },
    { kind: 'barricade2', seg: 265, offset:  0.00, size: 0.62 },
    { kind: 'barricade2', seg: 480, offset:  0.00, size: 0.62 },
    { kind: 'barricade3', seg: 290, offset:  0.88, size: 0.60 },
    { kind: 'barricade4', seg: 560, offset:  1.00, size: 0.56 },
  ];
  for (const h of HURDLES) {
    addRoad(h.kind, h.seg, h.offset, h.size, { isHurdle: true });
  }

  // ─── FINISH BANNER ───────────────────────────────────
  addRoad('finishBanner', 1, 0, 1.15, { overhead: true, noCollision: true });

  // ═══════════════════════════════════════════════════════
  // SHADOW CHECKPOINTS — THE SHIFTING MAZE CORE MECHANIC
  // ═══════════════════════════════════════════════════════
  //
  // Each checkpoint set = 3 gates, one per lane.
  // isSafeGate  → RED shadow  (actually safe, rewards player)
  // isDangerGate → GREEN shadow (actually dangerous, punishes)
  //
  // The hint says: "GREEN = safe | RED = danger" (WRONG on purpose)
  // After the glitch the truth message says: "RED = safe!"
  //
  // Spacing: every ~65 segments in maze zone (18%–78% of track).
  // ═══════════════════════════════════════════════════════

  const mazeStart = Math.floor(total * 0.18);
  const mazeEnd   = Math.floor(total * 0.78);

  // Which lane index is SAFE (red) per checkpoint group.
  // 0 = left,  1 = center,  2 = right
  const SAFE_LANE_PATTERN = [0, 2, 1, 2, 0, 1, 2, 0, 1, 0];
  const LANE_OFFSETS = [-0.60, 0.00, 0.60];

  let cpIndex = 0;

  for (let seg = mazeStart; seg < mazeEnd; seg += 65) {
    const safeLane = SAFE_LANE_PATTERN[cpIndex % SAFE_LANE_PATTERN.length];
    cpIndex++;

    for (let laneIdx = 0; laneIdx < 3; laneIdx++) {
      const laneOffset = LANE_OFFSETS[laneIdx];
      const isSafe     = laneIdx === safeLane;

      objs.push({
        // 'checkpoint' is a virtual kind rendered by the
        // dedicated checkpoint renderer in checkpointRender.js,
        // NOT by the standard objectRender sprite system.
        kind         : 'checkpoint',
        z            : seg * C.SEG_LEN,
        side         : 0,
        offset       : laneOffset,
        size         : 1.0,

        isCheckpoint : true,
        isSafeGate   : isSafe,
        isDangerGate : !isSafe,

        // Visual state
        hidden       : false,
        passed       : false,   // set true once player drives through
        _flashTimer  : 0,       // used by renderer for pass-flash animation

        // Collision handled in collisionSystem checkSceneryCollisions
        noCollision  : false,

        // Group metadata — gates in same group share cpGroup
        // so renderer can draw connecting perspective crossbar
        cpGroup      : cpIndex - 1,
        cpLane       : laneIdx,
        cpSafeLane   : safeLane,  // which lane is safe in this group
      });
    }
  }

  return objs;
}