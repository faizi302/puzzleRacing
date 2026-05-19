// Level 1 — "The Ghost Start". Single lap, wall-crossing unlocks Road 2.

import { LEVEL_META }          from './levelConfig.js';
import { buildRoads }          from './roadMap.js';
import { buildSceneryObjects } from './scenery.js';
import { buildMonsters, updateMonsters } from './monster.js';
import {
  resetLevel1Puzzle, updateLevel1Puzzle,
  isLevel1TrapActive, isLevel1MonsterLethal, isLevel1Road2Unlocked,
  triggerLevel1MonsterKill, triggerLevel1Win, collectLevel1Key,
  nudgeFakeDoorTrap, isFakeWallPassThrough, getLevel1Phase,
  setLevel1HintCallback, setLevel1Road2UnlockCallback, setLevel1DeathCallback,
} from './logic.js';

export default {
  ...LEVEL_META,

  // Locked to one lap regardless of meta — see logic.js.
  totalLaps: 1,

  startMessage:       'GHOST START',
  hintMessage:        'Looks easy. Try driving BACKWARD…',
  road2UnlockMessage: 'SECRET ROAD UNLOCKED — HEAD FOR THE FINISH!',

  buildRoads,
  buildSceneryObjects,

  buildMonsters,
  updateMonsters,

  resetPuzzle:        resetLevel1Puzzle,
  updatePuzzle:       updateLevel1Puzzle,
  isTrapActive:       isLevel1TrapActive,
  isMonsterLethal:    isLevel1MonsterLethal,
  isRoad2Unlocked:    isLevel1Road2Unlocked,
  triggerMonsterKill: triggerLevel1MonsterKill,
  triggerWin:         triggerLevel1Win,
  collectKey:         collectLevel1Key,
  nudgeFakeDoor:      nudgeFakeDoorTrap,
  isFakeWallPassThrough,
  getPhase:           getLevel1Phase,

  setHintCallback:        setLevel1HintCallback,
  setRoad2UnlockCallback: setLevel1Road2UnlockCallback,
  setDeathCallback:       setLevel1DeathCallback,
};