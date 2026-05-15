// ═══════════════════════════════════════════════════════
// SCENERY SPRITE ATLAS CONFIGURATION
// Manual atlas for LocationEScenery.png (2048×2048)
// anchorY: fraction from top where "ground contact" point is
// ═══════════════════════════════════════════════════════
import { SPR_L2 } from './sceneryConfigLevel2.js';
import { SPR_L3 } from '../levels/level3/sceneryConfig.js';
import { SPR_L4 } from '../levels/level4/sceneryConfig.js';
import { SPR_L5 } from '../levels/level5/sceneryConfig.js';

export const SPR = {
  // Arches
  woodArch:  { sx: 10,  sy: 10,   sw: 1285, sh: 315, scale: 1.10, anchorY: .93 },
  stoneArch: { sx: 8,   sy: 380,  sw: 1290, sh: 365, scale: 1.00, anchorY: .93 },
  tunnel:    { sx: 5,   sy: 830,  sw: 565,  sh: 430, scale: 1.20, anchorY: .93 },

  // Trees
  tallTree:  { sx: 1020, sy: 860,  sw: 335, sh: 470, scale: 1.10, anchorY: 1.00 },
  pineTall:  { sx: 990,  sy: 780,  sw: 280, sh: 540, scale: 1.15, anchorY: 0.99 },
  pineBig:   { sx: 1270, sy: 1000, sw: 250, sh: 580, scale: 1.0,  anchorY: 0.96 },
  pineSmall: { sx: 1320, sy: 1190, sw: 260, sh: 400, scale: 1.00, anchorY: 1.00 },
  roundTree: { sx: 1690, sy: 1390, sw: 310, sh: 410, scale: 1.05, anchorY: 1.00 },

  bridge:    { sx: 395, sy: 1340, sw: 390, sh: 295, scale: 1.05, anchorY: 0.88 },

  // Hurdles
  gorillaRock: { sx: 0,   sy: 1108, sw: 344, sh: 260, scale: 1.00, anchorY: 1.00 },
  woodFence:   { sx: 808, sy: 1421, sw: 445, sh: 100, scale: 0.65, anchorY: 1.00 },
  stoneWall:   { sx: 5,   sy: 1625, sw: 420, sh: 130, scale: 1.00, anchorY: 1.00 },
  stoneBlock:  { sx: 5,   sy: 1805, sw: 330, sh: 170, scale: 1.00, anchorY: 1.00 },

  // Poles / banner
  poleStump:   { sx: 1560, sy: 1017, sw: 95,  sh: 250, scale: 0.22, anchorY: 1.00 },
  startBanner: { sx: 0,    sy: 800,  sw: 640, sh: 300, scale: 1.0,  anchorY: 0.95 },

  // Totem & booster
  totemOnly: { sx: 1325, sy: 12,   sw: 500, sh: 525, scale: .60, anchorY: 1.00 },
  booster:   { sx: 368,  sy: 1090, sw: 210, sh: 260, scale: 1,   anchorY: 1 },

  // ── KEYS (legacy — Level 1 no longer spawns these) ──
  key: { sx: 1680, sy: 760, sw: 128, sh: 128, scale: 1, anchorY: 1,
         renderBase: 80, renderMin: 22, renderMax: 130 },

  realKey: {
    sx: 1680, sy: 760, sw: 128, sh: 128,
    scale: 1, anchorY: 1,
    renderBase: 110, renderMin: 30, renderMax: 200,
  },

  // ── PRESSURE PLATE (legacy, kept for renderer safety) ──
  pressurePlate: {
    sx: 0, sy: 800, sw: 640, sh: 300,
    scale: 0.7, anchorY: 0.92,
  },

  // Coin
  coin: {
    sx: 1680, sy: 760, sw: 128, sh: 128,
    scale: 1, anchorY: 1,
    renderBase: 58, renderMin: 12, renderMax: 80,
  },
};

// ═══════════════════════════════════════════════════════
// JUMP RAMP ATLAS (unchanged)
// ═══════════════════════════════════════════════════════
export const JUMP_SPR = {
  rampSmall: { sx: 160,  sy: 220, sw: 331, sh: 124, scale: 0.45, anchorY: 1.00, liftFactor: 0.85, rampLengthZ: 320 },
  rampMed:   { sx: 535,  sy: 157, sw: 272, sh: 181, scale: 0.55, anchorY: 1.00, liftFactor: 1.00, rampLengthZ: 360 },
  rampLarge: { sx: 844,  sy: 111, sw: 278, sh: 227, scale: 0.65, anchorY: 1.00, liftFactor: 1.20, rampLengthZ: 400 },
  rampXL:    { sx: 1160, sy: 58,  sw: 290, sh: 280, scale: 0.75, anchorY: 1.00, liftFactor: 1.45, rampLengthZ: 440 },
  halfPipe:  { sx: 166, sy: 441, sw: 357, sh: 152, scale: 0.55, anchorY: 1.00, liftFactor: 0.55, rampLengthZ: 380 },
  boostPad: {
    sx: 582, sy: 490, sw: 379, sh: 102,
    scale: 0.80,
    roadFrac: 0.78, heightMul: 0.85,
    hitHalfW: 0.42, hitBackZ: -70, hitFrontZ: 160,
    liftFactor: 1.15, speedKickKmh: 30,
    jumpBaseVy: 380, jumpSpeedVy: 420,
    forwardKick: 1.12, airForwardBoost: 1.45,
    airHoldTime: 1.35,
    anchorY: 1.00, rampLengthZ: 420,
  },
  megaRamp: { sx: 924, sy: 414, sw: 580, sh: 501, scale: 0.85, anchorY: 1.00, liftFactor: 1.85, rampLengthZ: 520 },
  rockArch: { sx: 95,  sy: 803, sw: 481, sh: 108, scale: 0.85, anchorY: 0.95, liftFactor: 0.00, rampLengthZ: 0 },
};

export const JUMP_KINDS = new Set(Object.keys(JUMP_SPR));
export const JUMP_ATLAS_PATH = 'assets/level/level2/jumps.png';

// ═══════════════════════════════════════════════════════
// MONSTER ATLAS — GORILLA BOSS (gorila.jpeg)
// ─────────────────────────────────────────────────────
// Spritesheet is 2752 × 1536, laid out as 5 columns × 4 rows = 20 frames.
//
//   ┌─────┬─────┬─────┬─────┬─────┐
//   │  0  │  1  │  2  │  3  │  4  │   ← Row 0: IDLE / stomp
//   ├─────┼─────┼─────┼─────┼─────┤
//   │  5  │  6  │  7  │  8  │  9  │   ← Row 1: ROAR (arms up)
//   ├─────┼─────┼─────┼─────┼─────┤
//   │ 10  │ 11  │ 12  │ 13  │ 14  │   ← Row 2: CHASE / run
//   ├─────┼─────┼─────┼─────┼─────┤
//   │ 15  │ 16  │ 17  │ 18  │ 19  │   ← Row 3: ATTACK / ground-pound
//   └─────┴─────┴─────┴─────┴─────┘
//
// Each cell is exactly 2752/5 = 550.4 × 1536/4 = 384 px.
// monsterRender.js consumes these dimensions to compute frame
// rectangles automatically; do not hand-edit individual cells.
// ═══════════════════════════════════════════════════════
export const MONSTER_SPR = {
  sx: 0,
  sy: 0,
  cols: 5,
  rows: 4,
  // Sheet is 2752 × 1536 → 550.4 × 384 per frame.
  // We round to 550 / 384 — the 0.4-px difference is invisible
  // and avoids fractional bleed at high zoom.
  frameW: 550,
  frameH: 384,

  // Approximate transparent / blue-background padding inside
  // each cell. The gorilla art doesn't reach the cell edges;
  // these insets crop the visible rectangle so the rendered
  // sprite scales as just the gorilla, not the surrounding
  // empty blue. Tune if you replace the spritesheet.
  insetL: 30,
  insetR: 30,
  insetT: 18,
  insetB: 6,
};

export const MONSTER_ATLAS_PATH = 'assets/monster/gorila.jpeg';

export const SPR_BY_LEVEL = {
  level1: SPR,
  level2: SPR_L2,
  level3: SPR_L3,
  level4: SPR_L4,
  level5: SPR_L5,
};