// ─────────────────────────────────────────────────────────────
//  Level 5 – THE KEY OF SURVIVAL
//  levelConfig.js
// ─────────────────────────────────────────────────────────────

export const LEVEL_META = {
  id: 'level5',
  name: 'THE KEY OF SURVIVAL',

  // Horizon theme (reuse C scenery — coastal mountain cliffs)
  horizonForward: 'C',
  horizonBackward: 'C',

  sceneryImage: [
    'assets/level/level5/LocationCScenery.png',
  ],

  puzzleSymbolsImage: [
    'assets/level/level5/keys_sprite.png',
  ],

  policeCarsImage: [
    'assets/level/level5/police_sprite.png',
  ],

  segmentsImage: [
    'assets/level/level5/LocationDSegments.jpg',
  ],

  // ── UI Messages ──────────────────────────────────────────────
  startMessage: '🏁 Level 5: The Key of Survival – Choose wisely!',
  hintMessage: '🗝️ Pick the correct key before each obstacle!',
  reverseMessage: '✨ Secret mountain route discovered!',
  forkMessage: '🔄 Hidden survival path opened!',
  winMessage: '🏆 You survived! Level 5 complete!',

  // ── Puzzle identity ──────────────────────────────────────────
  puzzleId: 'survival_keys',

  // ── Safe key lane for each of the 5 hurdle sections ─────────
  //   0 = left lane  |  1 = center lane  |  2 = right lane
  SAFE_KEY_SEQUENCE: [0, 2, 1, 0, 1],

  // ── Hurdle types in order ────────────────────────────────────
  HURDLE_TYPES: [
    'StoneBlock',     // 1 – giant stone wall
    'BrokenRoad',     // 2 – road gap
    'GiantWall',      // 3 – wall → jump ramp appears on correct key
    'FireGate',       // 4 – fire / laser gate
    'PoliceBlockade', // 5 – final police / mountain barrier
  ],
};