import { LEVEL_META } from './levelConfig.js';
import { buildRoads } from './roadMap.js';
import { buildSceneryObjects } from './scenery.js';
import { createPuzzleState, tick, renderHUD, onFinishReached } from './logic.js';

const puzzleState = createPuzzleState();

export default {
  ...LEVEL_META,
  totalLaps: 1,

  puzzleState,

  buildRoads,

  buildSceneryObjects() {
    return buildSceneryObjects(puzzleState);
  },

  resetPuzzle() {
    const fresh = createPuzzleState();
    Object.assign(puzzleState, fresh);
  },

  updatePuzzle(dt) {
    tick(puzzleState);
  },

  renderPuzzleHUD(ctx, canvas) {
    renderHUD(ctx, canvas, puzzleState);
  },

  onFinishReached,
};