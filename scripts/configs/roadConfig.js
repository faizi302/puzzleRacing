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
C.MAX_SPD   = C.SEG_LEN / C.STEP;         // max world-units / sec
C.ACCEL     =  C.MAX_SPD / 5;             // throttle acceleration
C.BRAKE     = -C.MAX_SPD;                 // braking deceleration
C.DECEL     = -C.MAX_SPD / 5;             // engine drag
C.OFFRD_DC  = -C.MAX_SPD / 2;             // off-road speed penalty
C.OFFRD_LIM =  C.MAX_SPD / 4;             // speed above which penalty applies
C.STEER_SPD =  2;                          // lateral steering speed

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