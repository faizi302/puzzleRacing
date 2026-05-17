// ═══════════════════════════════════════════════════════
// LEVEL 2 SCENERY CONFIG — LocationDScenery.png
// Generated from LocationDScenery.json
// ═══════════════════════════════════════════════════════

export const SPR_L2 = {
  // TUNNELS / ARCHES
  stoneArch: { sx: 488, sy: 6, sw: 922, sh: 235, scale: 1.15, anchorY: 0.97 },
  rallyArch: { sx: 6, sy: 441, sw: 932, sh: 362, scale: 1.99, anchorY: 0.97 },

  // HURDLES / BARRICADES
  barricade1: { sx: 1121, sy: 760, sw: 398, sh: 221, scale: 0.65, anchorY: 0.97 },
  barricade2: { sx: 1121, sy: 1001, sw: 397, sh: 174, scale: 0.70, anchorY: 0.97 },
  barricade3: { sx: 488, sy: 261, sw: 397, sh: 121, scale: 0.80, anchorY: 0.97 },
  barricade4: { sx: 1430, sy: 6, sw: 405, sh: 93, scale: 0.85, anchorY: 0.97 },

  // BOOST / NITRO
  booster: { sx: 386, sy: 1339, sw: 220, sh: 225, scale: 0.75, anchorY: 0.97 },

  // BUMPERS / SIDE POLES
  bumper1: { sx: 1266, sy: 1195, sw: 109, sh: 166, scale: 0.35, anchorY: 0.97 },
  bumper2: { sx: 386, sy: 1584, sw: 102, sh: 168, scale: 0.35, anchorY: 0.97 },

  // TREES
  tree1: { sx: 634, sy: 823, sw: 261, sh: 383, scale: 0.95, anchorY: 0.97 },
  tree2: { sx: 304, sy: 823, sw: 310, sh: 496, scale: 0.90, anchorY: 0.97 },
  tree3: { sx: 6, sy: 823, sw: 278, sh: 527, scale: 0.90, anchorY: 0.97 },

  // LANDMARKS
  tower: { sx: 939, sy: 261, sw: 186, sh: 979, scale: 0.85, anchorY: 0.97 },
  ferrisWheel: { sx: 6, sy: 6, sw: 462, sh: 415, scale: 1.55, anchorY: 0.97 },

  // MASSIVE BUILDINGS
  building: { sx: 1473, sy: 249, sw: 326, sh: 452, scale: 1.33, anchorY: 0.97 },
  cityBuilding: { sx: 6, sy: 1370, sw: 360, sh: 454, scale: 1.33, anchorY: 0.97 },
  cathedral: { sx: 1121, sy: 261, sw: 332, sh: 479, scale: 1.33, anchorY: 0.97 },

  // FINISH / START
  finishBanner: { sx: 640, sy: 1260, sw: 600, sh: 320, scale: 1.0, anchorY: 0.96 },

  // COIN - single frame for normal pickup
  coin: {
    sx: 1555,
    sy: 805,
    sw: 80,
    sh: 95,
    scale: 1.0,
    anchorY: 1,

    // Level 2 coin perspective size
    renderBase: 46,
    renderMin: 8,
    renderMax: 62,
  },

  // BIRDS
  // bird1: { sx: 508, sy: 1584, sw: 103, sh: 141, scale: 0.70, anchorY: 0.97 },
  // bird2: { sx: 1121, sy: 1195, sw: 109, sh: 38, scale: 0.70, anchorY: 0.97 },
};