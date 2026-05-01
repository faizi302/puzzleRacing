// ═══════════════════════════════════════════════════════
// ACTIVE LEVEL — Holds reference to the currently loaded level.
// ─────────────────────────────────────────────────────
// Set once when a level is loaded (from main.js or GameScene).
// Read by core/roadMap.js (for road geometry) and
// visuals/sceneryRender.js (for scenery objects).
// ═══════════════════════════════════════════════════════
let _level = null;

export function setActiveLevel(lvl) { _level = lvl; }
export function getActiveLevel()    { return _level; }