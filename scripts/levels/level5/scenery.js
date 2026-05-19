// ─────────────────────────────────────────────────────────────
//  Level 5 – THE KEY OF SURVIVAL
//  scenery.js
//
//  Spawns all static and dynamic scenery objects for the level.
//  Puzzle state (which key is safe, which hurdle is open) is
//  read from the shared `puzzleState` object that logic.js owns.
//  The scenery builder is called once at level load; objects
//  whose visibility depends on puzzle state carry an
//  `isConditional` flag so the renderer can toggle them live.
// ─────────────────────────────────────────────────────────────
import { C } from '../../configs/roadConfig.js';
import { trackLen } from '../../core/roadMap.js';

// ── Lane offsets ─────────────────────────────────────────────
const LANES = [-0.60, 0.00, 0.60];   // left / center / right

// ── Percentage positions along the track ─────────────────────
//   Each section:  KEY_PCT  (3 keys spread over ~30 segs)
//                  HURDLE_PCT (hurdle obstacle)
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

  // const trees = ['Tree1', 'Tree2', 'Tree3'];
  // for (let i = 20; i < total - 30; i += 16) {
  //   addSide(trees[i % 3], i, -1, 2.05, 1.0);
  //   addSide(trees[(i + 1) % 3], i + 6, 1, 2.05, 1.0);
  // }

  // for (let i = 200; i < total - 100; i += 400) {
  //   addSide('Massive1', i, -1, 2.65, 1.0);
  //   addSide('Massive2', i + 180, 1, 2.75, 1.0);
  // }

  // for (let i = 300; i < total - 120; i += 500) {
  //   addSide('Landmark1', i, -1, 3.10, 0.95);
  //   addSide('Landmark2', i + 100, 1, 3.20, 0.90);
  // }

  // ── 2. Boundary poles ─────────────────────────────────────
  // for (let i = 6; i < total - 20; i += 10) {
  //   addSide('Bumper1', i, -1, 1.38, 1.0, { small: true, isBoundaryPole: true });
  //   addSide('Bumper2', i + 5, 1, 1.38, 1.0, { small: true, isBoundaryPole: true });
  // }

  // ── 3. Atmospheric tunnels (overhead, no collision) ───────
  // for (let i = 150; i < total - 80; i += 480) {
  //   addRoad('Tunnel1', i, 0, 1.08, { overhead: true, noCollision: true });
  //   addRoad('Tunnel2', i + 240, 0, 1.08, { overhead: true, noCollision: true });
  // }

  // ── 4. Coin trails ────────────────────────────────────────
  // for (let i = 40; i < total - 60; i += 35) {
  //   const lane = LANES[Math.floor(i / 35) % 3];
  //   for (let k = 0; k < 5; k++) {
  //     addRoad('Coin', i + k * 2, lane, 1.0, { isCoin: true });
  //   }
  // }

  // ── 5. Boost pads ─────────────────────────────────────────
  // for (let i = 140; i < total - 80; i += 220) {
  //   const lane = LANES[Math.floor(i / 220) % 3];
  //   addRoad('Boost', i, lane, 1.0, { isBooster: true });
  // }

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
        addRoad('StoneBlock', hurdleSeg, 0, 1.20, {
          isHurdle: true,
          hurdleType: 'StoneBlock',
          sectionIndex: idx,
          isConditional: true,
          noCollision: false,
          clearAirHeight: 0,
        });

        addRoad('boostPad', hurdleSeg - 22, 0, 1.10, {
          isJump: true,
          isJumpRamp: true,
          sectionIndex: idx,
          isConditional: true,
          hidden: true,
          noCollision: false,

          hitBackZ: -120,
          hitFrontZ: 220,
          hitHalfW: 0.55,

          liftFactor: 1.35,
          jumpBaseVy: 180,
          jumpSpeedVy: 820,
          speedKickKmh: 70,
          forwardKick: 1.45,
        });
        break;

      // ── HURDLE 2: Broken Road (gap) ──────────────────────
      case 'BrokenRoad':
        // giant rock/tunnel blocking full road
        addRoad('StoneBlock', hurdleSeg, 0, 1.00, {
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

        // appears only after correct key
        addRoad('boostPad', hurdleSeg - 26, 0, 1.15, {
          isJump: true,
          isJumpRamp: true,
          sectionIndex: idx,
          isConditional: true,
          hidden: true,
          noCollision: false,

          hitBackZ: -140,
          hitFrontZ: 270,
          hitHalfW: 0.62,

          liftFactor: 2.05,
          jumpBaseVy: 280,
          jumpSpeedVy: 1150,
          speedKickKmh: 105,
          forwardKick: 1.85,
        });
        break;

      // ── HURDLE 3: Giant Wall + conditional Jump Ramp ─────
      case 'GiantWall':
        // Tunnel at hurdle 3
        addRoad('Tunnel2', hurdleSeg, 0, 1.18, {
          overhead: true,
          noCollision: true,
        });

        // Gorilla monster slightly behind tunnel
        addRoad('monster', hurdleSeg + 2, 0, 0.80, {
          isMonster: true,
          isLethal: true,
          noCollision: false,
          sectionIndex: idx,

          monsterName: 'Level 5 Tunnel Gorilla',
          spawnZ: (hurdleSeg + 2) * C.SEG_LEN,
          spawnOffset: 0,

          frameIdx: 0,
          frame: 0,
          frameTimer: 0,
          aiState: 'attack',

          patrolMinZ: (hurdleSeg + 2) * C.SEG_LEN,
          patrolMaxZ: (hurdleSeg + 2) * C.SEG_LEN,
          patrolDir: 1,
          crawlSpeed: 0,
          attackCooldown: 0,

          size: 1.20,
          active: true,
        });

        // Invisible collision blocker at tunnel/monster zone
        // addRoad('GiantWall', hurdleSeg + 1, 0, 1.25, {
        //   isHurdle: true,
        //   hurdleType: 'GiantWall',
        //   sectionIndex: idx,
        //   isConditional: true,
        //   noCollision: false,
        //   clearAirHeight: 999,
        // });

        // Jump appears only after correct key
        addRoad('boostPad', hurdleSeg - 30, 0, 1.10, {
          isJump: true,
          isJumpRamp: true,
          sectionIndex: idx,
          isConditional: true,
          hidden: true,
          noCollision: false,

          hitBackZ: -120,
          hitFrontZ: 240,
          hitHalfW: 0.55,

          liftFactor: 2.10,
          jumpBaseVy: 300,
          jumpSpeedVy: 1200,
          speedKickKmh: 110,
          forwardKick: 1.90,
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
        addRoad('boostPad', hurdleSeg - 26, 0, 1.15, {
          isJump: true,
          isJumpRamp: true,
          sectionIndex: idx,
          isConditional: true,
          hidden: true,
          noCollision: false,

          hitBackZ: -140,
          hitFrontZ: 270,
          hitHalfW: 0.62,

          liftFactor: 8.00,
          jumpBaseVy: 280,
          jumpSpeedVy: 1150,
          speedKickKmh: 105,
          forwardKick: 1.85,
        });
        break;

      // ── HURDLE 5: Police Blockade ─────────────────────────
      case 'PoliceBlockade':
        addRoad('PoliceBlockade', hurdleSeg, 0, 1.10, {
          isHurdle: true,
          hurdleType: 'PoliceBlockade',
          sectionIndex: idx,
          isConditional: true,
          noCollision: false,
        });
        addSide('Barricade4', hurdleSeg - 8, -1, 1.60, 0.85, { noCollision: true });
        addSide('Barricade4', hurdleSeg - 8, 1, 1.60, 0.85, { noCollision: true });
        break;

      default:
        break;
    }
  });

  // ── 7. Start / Finish arches ──────────────────────────────
  addRoad('Finish', 1, 0, 1.15, { overhead: true, noCollision: true });

  return objs;
}