// ═══════════════════════════════════════════════════════
// ROAD & PHYSICS CONFIGURATION
// ═══════════════════════════════════════════════════════
export const C = {
  ROAD_W    : 2100,
  SEG_LEN   :  200,
  RUMBLE    :    3,
  LANES     :    3,
  DRAW_D    :  620,
  CAM_H     :  980,
  FOV       :   88,
  TOTAL_LAPS:    3,
  FOG_D     :   12,
  STAR_N    :  200,
  FPS       :   60,

  // ── Road2 unlock condition ───────────────────────────
  // Player must collect this many keys on road1. On the very
  // next finish-line crossing afterwards, the game hot-swaps
  // to road2 (the RIGHT fork). One road2 lap = race win.
  KEYS_REQUIRED : 3,

  // ── Fork geometry ────────────────────────────────────
  // How many segments from the start before the fork diverges.
  // Road1 turns HARD LEFT here; Road2 turns HARD RIGHT.
  // Used by sceneryRender to place fork-gate signs.
  FORK_SEG : 69,   // = RUMBLE*2+1 + 60 (start block + approach straight)
};

// Derived constants
C.STEP      = 1 / C.FPS;
C.CAM_DEPTH = 1 / Math.tan(C.FOV / 2 * Math.PI / 180);

// MAX_SPD is the THEORETICAL world max (used for fog scale and road math).
C.MAX_SPD   = C.SEG_LEN / C.STEP;          // 12000 world u/s

// ═══════════════════════════════════════════════════════
// SPEED MAPPING (km/h → world units)
// ═══════════════════════════════════════════════════════
C.NORMAL_KMH    = 100;
C.NITRO_KMH     = 120;
C.KMH_TO_WORLD  = (C.MAX_SPD * 0.45) / C.NORMAL_KMH;     // ~54 world u/s per km/h
C.NORMAL_MAX    = C.NORMAL_KMH * C.KMH_TO_WORLD;          // ~5400
C.NITRO_MAX     = C.NITRO_KMH  * C.KMH_TO_WORLD;          // ~6480

C.ACCEL     =  C.NORMAL_MAX / 5.0;
C.BRAKE     = -C.NORMAL_MAX * 1.6;
C.DECEL     = -C.NORMAL_MAX / 4.0;
C.OFFRD_DC  = -C.NORMAL_MAX / 1.5;
C.OFFRD_LIM =  C.NORMAL_MAX / 4.0;
C.STEER_SPD =  2.0;

C.STEER_MIN_FAC = 0.35;

// Fork world-Z — where the two roads diverge visually.
C.FORK_Z = C.FORK_SEG * C.SEG_LEN;

export const COL = {
  SKY0:'#040810', SKY1:'#091428', SKY2:'#0b1a0a',
  HILL_A:'#1a5c12', HILL_B:'#0f3a0a',
  TREE:'#0b330a',
  GRASS_A:'#10611a', GRASS_B:'#0c4d14',
  RUM_A:'#bb2222',  RUM_B:'#dddddd',
  ROAD_A:'#424242', ROAD_B:'#3a3a3a', ROAD_S:'#cccccc',
  FOG:'#091428',
  LANE:'rgba(255,255,255,0.72)',
};

export const LCOL = {
  LIGHT: { road:COL.ROAD_A, grass:COL.GRASS_A, rum:COL.RUM_A, lane:COL.LANE },
  DARK : { road:COL.ROAD_B, grass:COL.GRASS_B, rum:COL.RUM_B, lane:null    },
  START: { road:COL.ROAD_S, grass:COL.GRASS_A, rum:COL.RUM_A, lane:COL.LANE },
};

// ═══════════════════════════════════════════════════════
// TEXTURE ATLAS FRAMES
// ═══════════════════════════════════════════════════════
export const HORIZON_FRAME = { sx: 2, sy: 1362, sw: 1536, sh: 336 };

export const SEG_TEX = {
  Segment_1:  { sx: 1,   sy: 131,  sw: 1024, sh: 128 },
  Segment_2:  { sx: 1,   sy: 781,  sw: 1024, sh: 128 },
  Segment_3:  { sx: 1,   sy: 911,  sw: 1024, sh: 128 },
  Segment_4:  { sx: 1,   sy: 1041, sw: 1024, sh: 128 },
  Segment_5:  { sx: 1,   sy: 1171, sw: 1024, sh: 128 },
  Segment_6:  { sx: 1,   sy: 1301, sw: 1024, sh: 128 },
  Segment_7:  { sx: 1,   sy: 1431, sw: 1024, sh: 128 },
  Segment_8:  { sx: 1,   sy: 1561, sw: 1024, sh: 128 },
  Segment_9:  { sx: 1,   sy: 1691, sw: 1024, sh: 128 },
  Segment_10: { sx: 1,   sy: 261,  sw: 1024, sh: 128 },
  Segment_11: { sx: 1,   sy: 391,  sw: 1024, sh: 128 },
  Segment_12: { sx: 1,   sy: 521,  sw: 1024, sh: 128 },
  Segment_13: { sx: 1,   sy: 651,  sw: 1024, sh: 128 },
  FinishLine: { sx: 1,   sy: 1,    sw: 1024, sh: 128 },
  Boost:      { sx: 1,   sy: 1821, sw: 512,  sh: 128 },
  Grid:       { sx: 515, sy: 1821, sw: 512,  sh: 128 },
};

// ── Per-track surface cycles ──────────────────────────
// Road1 → Segments 1-4 (darker, tighter feel)
// Road2 → Segments 5-9 (visually distinct — player knows they switched)
export const SEG_TEX_CYCLE_ROAD1 = [
  SEG_TEX.Segment_1,
  SEG_TEX.Segment_2,
  SEG_TEX.Segment_3,
  SEG_TEX.Segment_4,
];
export const SEG_TEX_CYCLE_ROAD2 = [
  SEG_TEX.Segment_5,
  SEG_TEX.Segment_6,
  SEG_TEX.Segment_7,
  SEG_TEX.Segment_8,
  SEG_TEX.Segment_9,
];
// Backward-compat alias
export const SEG_TEX_CYCLE = SEG_TEX_CYCLE_ROAD1;

export const SEG_TEX_RUN    = 6;
export const ROAD_TEX_FRAC  = 0.42;

// How many world units BEFORE the lap-finish line the player starts.
export const START_PRE_FINISH = 1800;