// scripts/levels/level3/sceneryConfig.js

export const SPR_L3 = {
  Tree1: { sx: 6, sy: 388, sw: 269, sh: 553, scale: 0.95, anchorY: 0.97 },
  Tree2: { sx: 295, sy: 710, sw: 241, sh: 371, scale: 0.95, anchorY: 0.97 },
  Tree3: { sx: 1141, sy: 656, sw: 301, sh: 279, scale: 0.90, anchorY: 0.97 },

  Massive1: { sx: 295, sy: 388, sw: 431, sh: 302, scale: 1.10, anchorY: 0.97 },
  Massive2: { sx: 746, sy: 388, sw: 285, sh: 420, scale: 1.10, anchorY: 0.97 },

  Landmark1: { sx: 925, sy: 1106, sw: 434, sh: 188, scale: 1.00, anchorY: 0.97 },
  Landmark2: { sx: 1462, sy: 656, sw: 279, sh: 257, scale: 1.00, anchorY: 0.97 },
  Landmark3: { sx: 691, sy: 828, sw: 313, sh: 172, scale: 1.00, anchorY: 0.97 },

  HayArch: { sx: 0, sy: 0, sw: 1130, sh: 305, scale: 1.80, anchorY: 1.0 },
  BarnGate: { sx: 1165, sy: 5, sw: 650, sh: 280, scale: 1.30, anchorY: 1.0 },
  RallyArch: { sx: 1144, sy: 319, sw: 612, sh: 317, scale: 1.15, anchorY: 0.97 },

  Finish: { sx: 1144, sy: 319, sw: 612, sh: 317, scale: 1.15, anchorY: 0.97 },

  Coin: { sx: 556, sy: 845, sw: 83, sh: 88, scale: 1, anchorY: 0.90, renderBase: 48, renderMin: 8, renderMax: 66, },
  Boost: { sx: 6, sy: 961, sw: 220, sh: 225, scale: 0.80, anchorY: 0.97 },


  HayRoll: { sx: 372, sy: 1175, sw: 480, sh: 160, scale: 0.73, anchorY: 1.00 },
  HayBlocks: { sx: 1200, sy: 1300, sw: 440, sh: 100, scale: 0.80, anchorY: 0.97 },
  Fence: { sx: 1622, sy: 1392, sw: 550, sh: 100, scale: 0.80, anchorY: 1.00 },
  RockFlowers: { sx: 825, sy: 1290, sw: 360, sh: 170, scale: 0.90, anchorY: 1.00 },

  Bumper1: { sx: 1957, sy: 226, sw: 34, sh: 194, scale: 0.40, anchorY: 0.97 },
  Bumper2: { sx: 1776, sy: 319, sw: 101, sh: 249, scale: 0.40, anchorY: 0.97 },

  TallGrass1: { sx: 1970, sy: 0, sw: 70, sh: 245, scale: 0.65, anchorY: 0.97 },
  TallGrass2: { sx: 1900, sy: 500, sw: 120, sh: 265, scale: 0.65, anchorY: 0.97 },

  PuzzleStar: {
    sx: 70, sy: 45, sw: 170, sh: 170,
    anchorY: 0.90,
    scale: 1.25,
    renderBase: 64,
    renderMin: 18,
    renderMax: 70,
    puzzleSymbolAtlas: true,
  },

  PuzzleMoon: {
    sx: 355, sy: 45, sw: 170, sh: 170,
    anchorY: 0.90,
    scale: 1.25,
    renderBase: 64,
    renderMin: 18,
    renderMax: 70,
    puzzleSymbolAtlas: true,
  },

  PuzzleDiamond: {
    sx: 65, sy: 255, sw: 180, sh: 145,
    anchorY: 0.90,
    scale: 1.25,
    renderBase: 64,
    renderMin: 18,
    renderMax: 70,
    puzzleSymbolAtlas: true,
  },

  PuzzleKey: {
    sx: 380, sy: 240, sw: 140, sh: 150,
    anchorY: 0.90,
    scale: 1.25,
    renderBase: 64,
    renderMin: 18,
    renderMax: 70,
    puzzleSymbolAtlas: true,
  },
};