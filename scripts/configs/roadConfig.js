// ═══════════════════════════════════════════════════════
// ROAD & PHYSICS CONFIGURATION
// ═══════════════════════════════════════════════════════
export const C = {
  ROAD_W:    2100,  // half-width
  SEG_LEN:   200,
  RUMBLE:    3,
  LANES:     3,
  DRAW_D:    620,
  CAM_H:     980,
  FOV:       88,
  TOTAL_LAPS:3,
  FOG_D:     12,
  STAR_N:    200,
  FPS:       60,
};

// Derived constants
C.STEP      = 1 / C.FPS;
C.CAM_DEPTH = 1 / Math.tan(C.FOV / 2 * Math.PI / 180);
C.MAX_SPD   = C.SEG_LEN / C.STEP;
C.ACCEL     = C.MAX_SPD / 5;
C.BRAKE     = -C.MAX_SPD;
C.DECEL     = -C.MAX_SPD / 5;
C.OFFRD_DC  = -C.MAX_SPD / 2;
C.OFFRD_LIM =  C.MAX_SPD / 4;
C.STEER_SPD = 2;

export const COL = {
  SKY0:'#040810', SKY1:'#091428', SKY2:'#0b1a0a',
  HILL_A:'#1a5c12', HILL_B:'#0f3a0a',
  TREE:'#0b330a',
  GRASS_A:'#10611a', GRASS_B:'#0c4d14',
  RUM_A:'#bb2222',   RUM_B:'#dddddd',
  ROAD_A:'#424242',  ROAD_B:'#3a3a3a',
  ROAD_S:'#cccccc',
  FOG:'#091428',
  LANE:'rgba(255,255,255,0.72)',
};

export const LCOL = {
  LIGHT: {road:COL.ROAD_A, grass:COL.GRASS_A, rum:COL.RUM_A, lane:COL.LANE},
  DARK:  {road:COL.ROAD_B, grass:COL.GRASS_B, rum:COL.RUM_B, lane:null},
  START: {road:COL.ROAD_S, grass:COL.GRASS_A, rum:COL.RUM_A, lane:COL.LANE},
};
