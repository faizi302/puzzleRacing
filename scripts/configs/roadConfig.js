// ═══════════════════════════════════════════════════════
// ROAD & PHYSICS CONFIGURATION
// Ready Player One style reverse-road puzzle
// ═══════════════════════════════════════════════════════
export const C = {
  ROAD_W    : 1200,
  SEG_LEN   : 240,
  RUMBLE    : 0.2,
  LANES     : 3,
  DRAW_D    : 720,
  CAM_H     : 980,
  FOV       : 88,
  TOTAL_LAPS: 1,
  FOG_D     : 12,
  STAR_N    : 200,
  FPS       : 60,

  // ── NEW PUZZLE LOGIC ────────────────────────────────
  // Player must reverse this much distance on Road1.
  // After this, camera "turns 180" and Road2 secret path unlocks.
REVERSE_SECRET_DISTANCE: 2200,
REVERSE_HINT_DISTANCE: 700,
REVERSE_CAMERA_TIME: 2.2,

  // Old key system disabled but kept for HUD compatibility.
  KEYS_REQUIRED: 0,

  // Fake fork point / story gate marker
  FORK_SEG: 69,
};

C.STEP      = 1 / C.FPS;
C.CAM_DEPTH = 1 / Math.tan(C.FOV / 2 * Math.PI / 180);

C.MAX_SPD = C.SEG_LEN / C.STEP;

C.NORMAL_KMH   = 100;
C.NITRO_KMH    = 120;
C.KMH_TO_WORLD = (C.MAX_SPD * 0.45) / C.NORMAL_KMH;
C.NORMAL_MAX   = C.NORMAL_KMH * C.KMH_TO_WORLD;
C.NITRO_MAX    = C.NITRO_KMH  * C.KMH_TO_WORLD;

C.REVERSE_MAX   = C.NORMAL_MAX * 0.42;
C.REVERSE_ACCEL = C.ACCEL ? C.ACCEL * 0.6 : C.NORMAL_MAX / 7.0;

C.ACCEL     = C.NORMAL_MAX / 5.0;
C.BRAKE     = -C.NORMAL_MAX * 1.6;
C.DECEL     = -C.NORMAL_MAX / 4.0;
C.OFFRD_DC  = -C.NORMAL_MAX / 1.5;
C.OFFRD_LIM = C.NORMAL_MAX / 4.0;
C.STEER_SPD = 3.0;
C.STEER_MIN_FAC = 0.35;

C.FORK_Z = C.FORK_SEG * C.SEG_LEN;

// ═══════════════════════════════════════════════════════
// JUMP PHYSICS — tune these to change how jumping feels.
// ─────────────────────────────────────────────────────
// JUMP_BASE_VY        : minimum upward velocity when player just
//                       barely rolls over a ramp at low speed.
// JUMP_SPEED_VY       : extra upward velocity at full normal speed.
//                       Total takeoff Vy = BASE + (speed01 * SPEED) * liftFactor
// JUMP_GRAVITY        : pulls car back down. Bigger = shorter air time.
// JUMP_MIN_SPEED_FRAC : fraction of NORMAL_MAX below which the ramp
//                       is treated as a small bump (no real launch).
// JUMP_AIR_STEER      : how much the player can steer mid-air (0..1).
// JUMP_AIR_DRAG       : forward speed loss per second while airborne.
// JUMP_LANDING_BOUNCE : bounce ratio on first landing.
// BOOSTPAD_KICK       : multiplier on speed when crossing a boost
//                       arrow pad (no jump, just nitro-style kick).
// ═══════════════════════════════════════════════════════
C.JUMP_BASE_VY        = 50;
C.JUMP_SPEED_VY       = 420;
C.JUMP_GRAVITY        = 1750;
C.JUMP_MIN_SPEED_FRAC = 0.15;
C.JUMP_AIR_STEER      = 0.40;
C.JUMP_AIR_DRAG       = 0.06;
C.JUMP_LANDING_BOUNCE = 0.18;
C.BOOSTPAD_KICK       = 5.18;

// Visual scale: airborne Y in pixels = P.airY * JUMP_VISUAL_SCALE.
// The renderer multiplies by getRes() automatically.
C.JUMP_VISUAL_SCALE   = 0.90;

// ═══════════════════════════════════════════════════════
// JUMP CAMERA FOLLOW (AAA camera jump system)
// ═══════════════════════════════════════════════════════

C.JUMP_CAMERA_FOLLOW = 7.15;
C.JUMP_CAMERA_VISUAL_SCALE = 0.10;

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
  DARK : { road:COL.ROAD_B, grass:COL.GRASS_B, rum:COL.RUM_B, lane:null },
  START: { road:COL.ROAD_S, grass:COL.GRASS_A, rum:COL.RUM_A, lane:COL.LANE },
};

export const HORIZON_FRAMES = {
  A: { sx: 2, sy: 2,    sw: 1536, sh: 336 },
  B: { sx: 2, sy: 342,  sw: 1536, sh: 336 },
  C: { sx: 2, sy: 682,  sw: 1536, sh: 336 }, // backward secret road
  D: { sx: 2, sy: 1022, sw: 1536, sh: 336 },
  E: { sx: 2, sy: 1362, sw: 1536, sh: 336 }, // forward road
};

export const HORIZON_FRAME = HORIZON_FRAMES.E;

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

export const SEG_TEX_CYCLE_ROAD1 = [
  SEG_TEX.Segment_1,
];

export const SEG_TEX_CYCLE_ROAD2 = [
  SEG_TEX.Segment_5,
];

export const SEG_TEX_CYCLE = SEG_TEX_CYCLE_ROAD1;
export const SEG_TEX_RUN   = 10;
export const ROAD_TEX_FRAC = 0.38;

export const START_PRE_FINISH = 3000;