// ═══════════════════════════════════════════════════════
// LEVEL 2 — Entry point. Exports the level interface that
// core/roadMap.js and visuals/sceneryRender.js consume.
// ═══════════════════════════════════════════════════════
import { LEVEL_META }          from './levelConfig.js';
import { buildRoads }          from './roadMap.js';
// import { buildSceneryObjects } from './scenery.js';

export default {
  ...LEVEL_META,
  buildRoads,
  // buildSceneryObjects,
};