// ═══════════════════════════════════════════════════════
// SCENERY SPRITE ATLAS CONFIGURATION
// Manual atlas for LocationEScenery.png (2048×2048)
// anchorY: fraction from top where "ground contact" point is
// ═══════════════════════════════════════════════════════
import { SPR_L2 } from './sceneryConfigLevel2.js';
export const SPR = {
  // Arches: scale tuned so opening spans road but pillars stay outside road edge.
  woodArch:  {sx:  10, sy:  10, sw:1285, sh: 315, scale:1.10, anchorY:.93},
  stoneArch: {sx:   8, sy: 380, sw:1290, sh: 365, scale:1.00, anchorY:.93},
  tunnel:    {sx:   5, sy: 830, sw: 565, sh: 430, scale:1.20, anchorY:.93},
  // Trees
  tallTree:  {sx: 1020, sy: 860, sw: 335, sh: 470, scale:1.10, anchorY:1.00},
  pineTall:  {sx:990, sy: 780, sw: 280, sh: 540, scale:1.15, anchorY:0.99},
  pineBig:   {sx:1270, sy: 1000, sw: 250, sh: 580, scale:1.0, anchorY:0.96},
  pineSmall: {sx:1320, sy:1190, sw: 260, sh: 400, scale:1.00, anchorY:1.00},
  roundTree: {sx:1690, sy:1390, sw: 310, sh: 410, scale:1.05, anchorY:1.00},

  bridge:    {sx: 395, sy:1340, sw: 390, sh: 295, scale: 1.05, anchorY:0.88},
   // ── HURDLES / BLOCKERS — blue marked assets ─────────
  gorillaRock: { sx: 0,   sy: 1108, sw: 344, sh: 260, scale: 1.00, anchorY: 1.00 },
  woodFence:   { sx: 808, sy: 1421, sw: 445, sh: 100, scale: 0.65, anchorY: 1.00 },
  stoneWall:   { sx: 5,   sy: 1625, sw: 420, sh: 130, scale: 1.00, anchorY: 1.00 },
  stoneBlock:  { sx: 5,   sy: 1805, sw: 330, sh: 170, scale: 1.00, anchorY: 1.00 },

  // ── SIDE POLES — yellow marked assets ───────────────
  poleStump:   { sx: 1560, sy: 1017, sw: 95,  sh: 250, scale: 0.22, anchorY: 1.00 },

  // ── START BANNER — yellow marked assets ───────────────
  startBanner: { sx: 0, sy: 800, sw: 640, sh: 300, scale: 1.0, anchorY: 0.95},

  // ── Separate totem render-only entity ───────────────
  totemOnly:   { sx: 1325, sy: 12, sw: 500, sh: 525, scale: .60, anchorY: 1.00 },
  coin:      {sx:1680, sy: 760, sw: 128, sh: 128, scale: 1, anchorY: 1},
  booster: {sx: 368, sy: 1090, sw: 210, sh: 260, scale: 1, anchorY: 1},
  // ── KEY pickup ───────────────────────────────────────
  key:  {sx:1680, sy: 760, sw: 128, sh: 128, scale: 1, anchorY: 1},
};

// ═══════════════════════════════════════════════════════
// JUMP RAMP ATLAS — uses IMG.jumps (loaded by objectRender.js)
// Source image: 1536 × 1024
// ─────────────────────────────────────────────────────────
// Each ramp has:
//   sx, sy, sw, sh   → source rect inside jumps.png
//   scale            → world-render scale multiplier (per kind)
//   anchorY          → fraction from top where the BASE sits.
//                      MUST be 1.00 for ramps because the yellow
//                      chevron strip is at the bottom edge.
//   liftFactor       → vertical launch strength (0 = no jump, 1 = normal,
//                      >1 = bigger launch).
//   rampLengthZ      → ramp length along the road in world units.
//
// Rendering: handled by sceneryRender.js's drawScenery() — a
// jump branch detects o.isJump and uses IMG.jumps + JUMP_SPR.
// ═══════════════════════════════════════════════════════
export const JUMP_SPR = {
  // Row 1 — small to extra-large flat-top launch ramps.
  rampSmall: { sx: 160,  sy: 220, sw: 331, sh: 124, scale: 0.45, anchorY: 1.00, liftFactor: 0.85, rampLengthZ: 320 },
  rampMed:   { sx: 535,  sy: 157, sw: 272, sh: 181, scale: 0.55, anchorY: 1.00, liftFactor: 1.00, rampLengthZ: 360 },
  rampLarge: { sx: 844,  sy: 111, sw: 278, sh: 227, scale: 0.65, anchorY: 1.00, liftFactor: 1.20, rampLengthZ: 400 },
  rampXL:    { sx: 1160, sy:  58, sw: 290, sh: 280, scale: 0.75, anchorY: 1.00, liftFactor: 1.45, rampLengthZ: 440 },

  // Row 2 — special ramps.
  halfPipe:  { sx: 166,  sy: 441, sw: 357, sh: 152, scale: 0.55, anchorY: 1.00, liftFactor: 0.55, rampLengthZ: 380 },
boostPad: {
  sx: 582,
  sy: 490,
  sw: 379,
  sh: 102,

  scale: 0.80,

  // best controls
  roadFrac: 0.78,    // width relative to current road width
  heightMul: 0.85,   // height control

  hitHalfW: 0.42,
  hitBackZ: -70,
  hitFrontZ: 160,

  liftFactor: 1.15,
  speedKickKmh: 30,
  jumpBaseVy: 380,
  jumpSpeedVy: 420,
  forwardKick: 1.12,
  airForwardBoost: 1.45,
airHoldTime: 1.35,

  anchorY: 1.00,
  rampLengthZ: 420,
},
  megaRamp:  { sx: 924,  sy: 414, sw: 580, sh: 501, scale: 0.85, anchorY: 1.00, liftFactor: 1.85, rampLengthZ: 520 },

  // Row 3 — decorative rock arch (overhead, no launch).
  rockArch:  { sx: 95,   sy: 803, sw: 481, sh: 108, scale: 0.85, anchorY: 0.95, liftFactor: 0.00, rampLengthZ: 0 },
};

// Convenient set used by collision/render code to know which kinds
// belong to the jump atlas (different image source than SPR).
export const JUMP_KINDS = new Set(Object.keys(JUMP_SPR));

// Path the renderer uses (must match objectRender.js's IMG.jumps path).
// objectRender.js currently tries:
//   'assets/level/level2/jumps.png'
//   'assets/jumps.png'
//   'jumps.png'
// — so put your jumps.png at any of these paths.
export const JUMP_ATLAS_PATH = 'assets/level/level2/jumps.png';

export const SPR_BY_LEVEL = {
  level1: SPR,
  level2: SPR_L2,
};