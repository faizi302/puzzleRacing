// ═══════════════════════════════════════════════════════
// LEVEL 1 — "THE GHOST START" — Entry point
// ─────────────────────────────────────────────────────
// Exports the level interface consumed by:
//   • core/roadMap.js          → buildRoads()
//   • visuals/sceneryRender.js → buildSceneryObjects()
//   • systems/roadSystem.js    → meta + puzzle hooks
//   • systems/collisionSystem  → puzzle hooks (via logic.js)
//
// The dedicated logic.js (similar to level2's) holds ALL
// puzzle state and transitions. Other engine files just
// call into the exported functions instead of re-implementing
// the rules themselves.
//
// REWORKED DESIGN (diagram-accurate):
//   • Pressure plate unlocks ROAD2 (the real winning path).
//   • Fake door is a permanent trap — it never opens.
//   • Monsters guard the end of BOTH roads, but Road2 has
//     a big jump ramp so the player can fly over them.
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