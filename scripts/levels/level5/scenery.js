import { C } from '../../configs/roadConfig.js';
import { trackLen } from '../../core/roadMap.js';

const LANES = [-0.60, 0.00, 0.60];

const SECTIONS = [
  { keyPct: 0.12, hurdlePct: 0.20, type: 'StoneBlock' },
  { keyPct: 0.26, hurdlePct: 0.33, type: 'BrokenRoad' },
  { keyPct: 0.43, hurdlePct: 0.51, type: 'GiantWall' },
  { keyPct: 0.60, hurdlePct: 0.68, type: 'FireGate' },
  { keyPct: 0.76, hurdlePct: 0.84, type: 'PoliceBlockade' },
];

// ── Helpers ──────────────────────────────────────────────────
export function buildSceneryObjects(puzzleState) {
  const objs = [];
  const total = Math.floor(trackLen / C.SEG_LEN);

  // ── addSide / addRoad wrappers ────────────────────────────
  function addSide(kind, seg, side, offset = 2.0, size = 1.0, extra = {}) {
    if (seg >= total - 10) return;
    objs.push({
      kind, z: seg * C.SEG_LEN, side, offset, size,
      noCollision: true, ...extra
    });
  }

  function addRoad(kind, seg, offset = 0, size = 1.0, extra = {}) {
    if (seg >= total - 10) return;
    objs.push({ kind, z: seg * C.SEG_LEN, side: 0, offset, size, ...extra });
  }

  // ── 1. Environment decoration ─────────────────────────────

  const trees = ['Tree1', 'Tree3'];
  for (let i = 14; i < total - 30; i += 20) {
    addSide(trees[i % 3], i, -1, 9.05, 1.40);
    addSide(trees[(i + 1) % 3], i + 6, 1, 9.05, 1.40);
  }

  for (let i = 8; i < total - 30; i += 16) {
    addSide(trees[i % 3], i, -1, 5.05, 1.40);
    addSide(trees[(i + 1) % 3], i + 6, 1, 5.05, 1.40);
  }

  for (let i = 200; i < total - 100; i += 400) {
    addSide('Massive1', i, -1, 8.50, 3.20);
    addSide('Massive2', i + 180, 1, 8.50, 3.20);
  }

  for (let i = 150; i < total - 120; i += 500) {
    addSide('Landmark1', i, -1, 3.80, 0.95);
    addSide('Landmark2', i + 100, 1, 3.52, 1.00);
  }

  // ── 2. Boundary poles ─────────────────────────────────────
  for (let i = 6; i < total - 20; i += 10) {
    addSide('Bumper1', i, -1, 1.38, 1.0, { small: true, isBoundaryPole: true });
    addSide('Bumper2', i + 5, 1, 1.38, 1.0, { small: true, isBoundaryPole: true });
  }

  // ── 3. Atmospheric tunnels (overhead, no collision) ───────
  for (let i = 150; i < total - 80; i += 480) {
    addRoad('Tunnel1', i, 0, 1.08, { overhead: true, noCollision: true });
    addRoad('Tunnel2', i + 240, 0, 1.08, { overhead: true, noCollision: true });
  }

  // ── 4. Coin trails ────────────────────────────────────────
  for (let i = 40; i < total - 60; i += 35) {
    const lane = LANES[Math.floor(i / 35) % 3];
    for (let k = 0; k < 5; k++) {
      addRoad('Coin', i + k * 2, lane, 1.0, { isCoin: true });
    }
  }

  // ── 5. Boost pads ─────────────────────────────────────────
  for (let i = 140; i < total - 80; i += 220) {
    const lane = LANES[Math.floor(i / 220) % 3];
    addRoad('Boost', i, lane, 1.0, { isBooster: true });
  }

  // ── 6. KEY SETS + HURDLES (5 sections) ───────────────────

  const safeSeq = puzzleState?.safeKeySequence ?? [0, 2, 1, 0, 1];

  SECTIONS.forEach((section, idx) => {
    const keySeg = Math.floor(total * section.keyPct);
    const hurdleSeg = Math.floor(total * section.hurdlePct);
    const safeLane = safeSeq[idx];

    // ── 6a. Three keys ──────────────────────────────────────
    LANES.forEach((laneOffset, laneIdx) => {
      const isCorrect = laneIdx === safeLane;
      // Stagger keys slightly (5 segs apart) so they're distinct pick-ups
      const seg = keySeg;

      // Alternate key sprite by laneIdx for visual variety
      const keyKind = `PuzzleKey${laneIdx}`;

      addRoad(keyKind, seg, laneOffset, 1.0, {
        isKey: true,
        isDecoyKey: !isCorrect,
        isCorrectKey: isCorrect,
        noCollision: false,
        screenSize: 52,
        sectionIndex: idx,
        laneIndex: laneIdx,
        // Glow colour hint for renderer
        glowColor: isCorrect ? '#ffe84d' : '#dd3333',
      });
    });

    // ── 6b. Hurdle / obstacle ───────────────────────────────

    switch (section.type) {

      // ── HURDLE 1: Stone Block ────────────────────────────
      case 'StoneBlock':
        addRoad('StoneBlock', hurdleSeg, 0, 0.50, {
          isHurdle: true,
          hurdleType: 'StoneBlock',
          sectionIndex: idx,
          isConditional: true,
          noCollision: false,
          clearAirHeight: 0,
        });

        // giant rock/tunnel blocking full road
        addRoad('StoneBlock', hurdleSeg, -0.87, 0.50, {
          isHurdle: true,
          hurdleType: 'BrokenRoad',
          sectionIndex: idx,
          isConditional: true,
          noCollision: false,
          clearAirHeight: 999,
        });

        addRoad('StoneBlock', hurdleSeg, 0.87, 0.50, {
          isHurdle: true,
          hurdleType: 'BrokenRoad',
          sectionIndex: idx,
          isConditional: true,
          noCollision: false,
          clearAirHeight: 999,
        });

        // jump appears only after correct key
        addRoad('boostPad', hurdleSeg - 13, 0, 1.18, {
          isJump: true,
          isJumpRamp: true,
          sectionIndex: idx,
          isConditional: true,
          hidden: true,
          noCollision: false,

          hitBackZ: -140,
          hitFrontZ: 280,
          hitHalfW: 0.64,

          liftFactor: 4.25,
          jumpBaseVy: 350,
          jumpSpeedVy: 1270,
          speedKickKmh: 125,
          forwardKick: 2.00,
        });
        break;

      // ── HURDLE 2: Broken Road (gap) ──────────────────────
      case 'BrokenRoad':
        // giant rock/tunnel blocking full road
        addRoad('StoneBlock', hurdleSeg, 0, 0.50, {
          isHurdle: true,
          hurdleType: 'BrokenRoad',
          sectionIndex: idx,
          isConditional: true,
          noCollision: false,
          clearAirHeight: 999,
        });

        // giant rock/tunnel blocking full road
        addRoad('StoneBlock', hurdleSeg, -0.87, 0.50, {
          isHurdle: true,
          hurdleType: 'BrokenRoad',
          sectionIndex: idx,
          isConditional: true,
          noCollision: false,
          clearAirHeight: 999,
        });

        addRoad('StoneBlock', hurdleSeg, 0.87, 0.50, {
          isHurdle: true,
          hurdleType: 'BrokenRoad',
          sectionIndex: idx,
          isConditional: true,
          noCollision: false,
          clearAirHeight: 999,
        });

        addRoad('Tunnel2', hurdleSeg - 1, 0, 1.20, {
          overhead: true,
          noCollision: true,
        });

        // jump appears only after correct key
        addRoad('boostPad', hurdleSeg - 13, 0, 1.18, {
          isJump: true,
          isJumpRamp: true,
          sectionIndex: idx,
          isConditional: true,
          hidden: true,
          noCollision: false,

          hitBackZ: -140,
          hitFrontZ: 280,
          hitHalfW: 0.64,

          liftFactor: 2.50,
          jumpBaseVy: 350,
          jumpSpeedVy: 1270,
          speedKickKmh: 125,
          forwardKick: 2.00,
        });
        break;

      // ── HURDLE 3: Giant Wall + conditional Jump Ramp ─────
      case 'GiantWall':
        // Tunnel at hurdle 3
        addRoad('Tunnel2', hurdleSeg, 0, 1.18, {
          overhead: true,
          noCollision: false,
          isHurdle: true,
        });

        // Gorilla monster slightly behind tunnel
        addRoad('monster', hurdleSeg, 0, 0.08, {
          isMonster: true,
          isLethal: true,
          isHurdle: true,
          noCollision: false,
          sectionIndex: idx,
          hurdleType: 'monster',

          monsterName: 'Level 5 Tunnel Gorilla',
          spawnZ: (hurdleSeg) * C.SEG_LEN,
          spawnOffset: 0,

          frameIdx: 0,
          frame: 0,
          frameTimer: 0,
          aiState: 'attack',

          size: 1.20,
          active: true,
        });

        // jump appears only after correct key
        addRoad('boostPad', hurdleSeg - 13, 0, 1.18, {
          isJump: true,
          isJumpRamp: true,
          sectionIndex: idx,
          isConditional: true,
          hidden: true,
          noCollision: false,

          hitBackZ: -140,
          hitFrontZ: 280,
          hitHalfW: 0.64,

          liftFactor: 2.50,
          jumpBaseVy: 350,
          jumpSpeedVy: 1270,
          speedKickKmh: 125,
          forwardKick: 2.00,
        });
        break;

      // ── HURDLE 4: Fire / Laser Gate ──────────────────────
      case 'FireGate':
        // left police car: covers left lane + left road side
        addRoad('PoliceSideLeft', hurdleSeg, -0.62, 1.15, {
          isHurdle: true,
          hurdleType: 'FireGate',
          sectionIndex: idx,
          isConditional: true,
          noCollision: false,
          clearAirHeight: 999,
        });

        // right police car: covers right lane + right road side
        addRoad('PoliceSideRight', hurdleSeg, 0.62, 1.15, {
          isHurdle: true,
          hurdleType: 'FireGate',
          sectionIndex: idx,
          isConditional: true,
          noCollision: false,
          clearAirHeight: 999,
        });

        // jump appears only after correct key
        addRoad('boostPad', hurdleSeg - 13, 0, 1.18, {
          isJump: true,
          isJumpRamp: true,
          sectionIndex: idx,
          isConditional: true,
          hidden: true,
          noCollision: false,

          hitBackZ: -140,
          hitFrontZ: 280,
          hitHalfW: 0.64,

          liftFactor: 2.25,
          jumpBaseVy: 350,
          jumpSpeedVy: 1270,
          speedKickKmh: 125,
          forwardKick: 2.00,
        });
        break;

      // ── HURDLE 5: Police Blockade ─────────────────────────
      case 'PoliceBlockade':
        // left barricade
        addRoad('barricade3', hurdleSeg, -0.87, 0.50, {
          isHurdle: true,
          hurdleType: 'PoliceBlockade',
          sectionIndex: idx,
          isConditional: true,
          noCollision: false,
          clearAirHeight: 999,
        });

        // center dragon gate
        addRoad('barricade1', hurdleSeg + 1, 0.00, 1.05, {
          isHurdle: true,
          hurdleType: 'PoliceBlockade',
          sectionIndex: idx,
          isConditional: true,
          noCollision: false,
          clearAirHeight: 999,
        });

        // right barricade
        addRoad('barricade3', hurdleSeg, 0.85, 0.50, {
          isHurdle: true,
          hurdleType: 'PoliceBlockade',
          sectionIndex: idx,
          isConditional: true,
          noCollision: false,
          clearAirHeight: 999,
        });

        // jump appears only after correct key
        addRoad('boostPad', hurdleSeg - 13, 0, 1.18, {
          isJump: true,
          isJumpRamp: true,
          sectionIndex: idx,
          isConditional: true,
          hidden: true,
          noCollision: false,

          hitBackZ: -140,
          hitFrontZ: 280,
          hitHalfW: 0.64,

          liftFactor: 2.25,
          jumpBaseVy: 350,
          jumpSpeedVy: 1270,
          speedKickKmh: 125,
          forwardKick: 2.00,
        });
        break;

      default:
        break;
    }
  });

  // ── 7. Start / Finish arches ──────────────────────────────
  addRoad('Finish', 1, 0, 1.15, { overhead: true, noCollision: true });

  return objs;
}