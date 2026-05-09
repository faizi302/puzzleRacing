// ═══════════════════════════════════════════════════════
// LEVEL 3 ENTRY
// ═══════════════════════════════════════════════════════

import { LEVEL_META } from './levelConfig.js';
import { buildRoads } from './roadMap.js';
import { buildSceneryObjects } from './scenery.js';

export default {
  ...LEVEL_META,
  buildRoads,
  buildSceneryObjects,
};