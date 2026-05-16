// ═══════════════════════════════════════════════════════
// LEVEL 1 — "THE GHOST START" — Entry point
// ─────────────────────────────────────────────────────
// Exports the level interface consumed by:
//   • core/roadMap.js          → buildRoads()
//   • visuals/sceneryRender.js → buildSceneryObjects()
//   • systems/roadSystem.js    → meta + puzzle hooks
//   • systems/collisionSystem  → puzzle hooks (via logic.js)
//
// REWORKED DESIGN (v4):
//   • Wall pass-through unlocks ROAD 2 (the real winning path).
//   • Fake door is a permanent trap — it never opens.
//   • ONE gorilla guards the trap zone at end of both roads.
//     Road 2 has a big jump ramp so the player can fly over.
//   • ONE LAP ONLY — the engine wins on the first Road 2
//     finish-line crossing; totalLaps:1 is exported below so
//     the HUD reads "1 / 1" and never bumps to lap 2.
// ═══════════════════════════════════════════════════════
import { LEVEL_META }          from './levelConfig.js';
import { buildRoads }          from './roadMap.js';
import { buildSceneryObjects } from './scenery.js';
import { buildMonsters,
         updateMonsters }      from './monster.js';
import {
  resetLevel1Puzzle,
  updateLevel1Puzzle,
  isLevel1TrapActive,
  isLevel1MonsterLethal,
  isLevel1Road2Unlocked,
  triggerLevel1MonsterKill,
  triggerLevel1Win,
  collectLevel1Key,            // legacy no-op; kept for safety
  nudgeFakeDoorTrap,
  isFakeWallPassThrough,
  getLevel1Phase,
  setLevel1HintCallback,
  setLevel1Road2UnlockCallback,
  setLevel1DeathCallback,
} from './logic.js';

export default {
  ...LEVEL_META,

  // Lock Level 1 to a single lap regardless of what
  // levelConfig.js says — the user explicitly asked for
  // "only one lap in forward as well as backward". This
  // is read by gameScene.js's HUD snapshot.
  totalLaps: 1,

  // UI strings used by gameScene's race-start banner & lose modal.
  startMessage:       'GHOST START',
  hintMessage:        'Looks easy. Try driving BACKWARD…',
  road2UnlockMessage: 'SECRET ROAD UNLOCKED — HEAD FOR THE FINISH!',

  // Geometry / props
  buildRoads,
  buildSceneryObjects,

  // Monster spawner + per-tick AI
  buildMonsters,
  updateMonsters,

  // Puzzle hooks — called by roadSystem / collisionSystem
  resetPuzzle:        resetLevel1Puzzle,
  updatePuzzle:       updateLevel1Puzzle,
  isTrapActive:       isLevel1TrapActive,
  isMonsterLethal:    isLevel1MonsterLethal,
  isRoad2Unlocked:    isLevel1Road2Unlocked,
  triggerMonsterKill: triggerLevel1MonsterKill,
  triggerWin:         triggerLevel1Win,
  collectKey:         collectLevel1Key,        // legacy
  nudgeFakeDoor:      nudgeFakeDoorTrap,
  isFakeWallPassThrough,
  getPhase:           getLevel1Phase,

  // UI callbacks
  setHintCallback:        setLevel1HintCallback,
  setRoad2UnlockCallback: setLevel1Road2UnlockCallback,
  setDeathCallback:       setLevel1DeathCallback,
};