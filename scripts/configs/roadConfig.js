// ═══════════════════════════════════════════════════════
// ROAD & PHYSICS CONFIGURATION
// ═══════════════════════════════════════════════════════
export const C = {
  ROAD_W    : 2100,   // road half-width (world units)
  SEG_LEN   :  200,   // segment length  (world units)
  RUMBLE    :    3,   // segments per rumble colour band
  LANES     :    3,   // number of lanes
  DRAW_D    :  620,   // draw distance in segments
  CAM_H     :  980,   // camera height
  FOV       :   88,   // field-of-view (degrees)
  TOTAL_LAPS:    3,   // laps to finish the race
  FOG_D     :   12,   // fog density exponent
  STAR_N    :  200,   // (legacy — menu stars drawn procedurally)
  FPS       :   60,   // fixed physics rate
};

// Derived constants (computed once at load time)
C.STEP      = 1 / C.FPS;
C.CAM_DEPTH = 1 / Math.tan(C.FOV / 2 * Math.PI / 180);
C.MAX_SPD   = C.SEG_LEN / C.STEP;
C.ACCEL     =  C.MAX_SPD / 5;
C.BRAKE     = -C.MAX_SPD;
C.DECEL     = -C.MAX_SPD / 5;
C.OFFRD_DC  = -C.MAX_SPD / 2;
C.OFFRD_LIM =  C.MAX_SPD / 4;
C.STEER_SPD =  2;

export const COL = {
  SKY0   : '#040810', SKY1   : '#091428', SKY2   : '#0b1a0a',
  HILL_A : '#1a5c12', HILL_B : '#0f3a0a',
  TREE   : '#0b330a',
  GRASS_A: '#10611a', GRASS_B: '#0c4d14',
  RUM_A  : '#bb2222', RUM_B  : '#dddddd',
  ROAD_A : '#424242', ROAD_B : '#3a3a3a',
  ROAD_S : '#cccccc',
  FOG    : '#091428',
  LANE   : 'rgba(255,255,255,0.72)',
};

export const LCOL = {
  LIGHT: { road:COL.ROAD_A, grass:COL.GRASS_A, rum:COL.RUM_A, lane:COL.LANE  },
  DARK : { road:COL.ROAD_B, grass:COL.GRASS_B, rum:COL.RUM_B, lane:null       },
  START: { road:COL.ROAD_S, grass:COL.GRASS_A, rum:COL.RUM_A, lane:COL.LANE  },
};

// ═══════════════════════════════════════════════════════
// TEXTURE ATLAS FRAMES
// ═══════════════════════════════════════════════════════

// HorizonE frame from Horizons.json
export const HORIZON_FRAME = { sx: 2, sy: 1362, sw: 1536, sh: 336 };

// Road segment frames from LocationESegments.json
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

// Cycle these for the regular running road. Pick the variants you like best.
export const SEG_TEX_CYCLE = [
  SEG_TEX.Segment_1,
  SEG_TEX.Segment_2,
  SEG_TEX.Segment_3,
  SEG_TEX.Segment_4,
];

// How many track segments share the same texture before switching.
// Higher = longer runs of the same dirt look.
export const SEG_TEX_RUN = 6;

// What fraction of the segment-texture WIDTH is the actual road
// (the rest is grass/border on each side). Tweak this if the road looks
// too narrow (raise it) or the grass border looks too thin (lower it).
export const ROAD_TEX_FRAC = 0.42;