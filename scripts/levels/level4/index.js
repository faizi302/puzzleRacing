import { LEVEL_META } from './levelConfig.js';
import { buildRoads } from './roadMap.js';
import { buildSceneryObjects } from './scenery.js';
import { resetLevel4Puzzle, updateLevel4Puzzle } from './logic.js';

export default {
  ...LEVEL_META,
  buildRoads,
  buildSceneryObjects,
  resetPuzzle: resetLevel4Puzzle,
  updatePuzzle: updateLevel4Puzzle,
};