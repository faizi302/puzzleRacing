import { LEVEL_META } from './levelConfig.js';
import { buildRoads } from './roadMap.js';
import { buildSceneryObjects } from './scenery.js';
import { resetLevel2Puzzle, updateLevel2Puzzle } from './logic.js';

export default {
  ...LEVEL_META,
  buildRoads,
  buildSceneryObjects,
  resetPuzzle: resetLevel2Puzzle,
  updatePuzzle: updateLevel2Puzzle,
};