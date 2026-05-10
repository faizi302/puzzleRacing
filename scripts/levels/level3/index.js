import { LEVEL_META } from './levelConfig.js';
import { buildRoads } from './roadMap.js';
import { buildSceneryObjects } from './scenery.js';
import { resetLevel3Puzzle, updateLevel3Puzzle } from './logic.js';

export default {
  ...LEVEL_META,
  buildRoads,
  buildSceneryObjects,
  resetPuzzle: resetLevel3Puzzle,
  updatePuzzle: updateLevel3Puzzle,
};