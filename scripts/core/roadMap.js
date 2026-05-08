// ═══════════════════════════════════════════════════════
// ROAD MAP — Facade that delegates road geometry to the
//            currently active level (levels/levelN/roadMap.js).
// ─────────────────────────────────────────────────────
// Importers (roadSystem, roadRender, sceneryRender, etc.) keep
// using `segs` and `trackLen` as live bindings — they update
// automatically when buildTrack() loads new level data and when
// switchToTrack() hot-swaps Road1↔Road2.
// ═══════════════════════════════════════════════════════
import { C } from '../configs/roadConfig.js';
import { getActiveLevel } from './activeLevel.js';

// ── Live exports — re-assigned when a level is loaded ─
export let segs     = [];
export let trackLen = 0;

// ── Internal storage for both tracks of the active level ─
let _t1Segs = [], _t1Len = 0;
let _t2Segs = [], _t2Len = 0;
let _activeTrack = 1;

/**
 * Build (or re-build) both tracks for the currently active level.
 * Calls the level's buildRoads() to get the geometry.
 */
export function buildTrack(buildSceneryCb) {
  const lvl = getActiveLevel();
  if (!lvl || typeof lvl.buildRoads !== 'function') {
    console.warn('[roadMap] No active level. Call setActiveLevel() first.');
    return;
  }

  const built = lvl.buildRoads();
  _t1Segs = built.road1.segs;
  _t1Len  = built.road1.len;
  _t2Segs = built.road2.segs;
  _t2Len  = built.road2.len;

  // Race always begins on Road1
  segs         = _t1Segs;
  trackLen     = _t1Len;
  _activeTrack = 1;

  if (typeof buildSceneryCb === 'function') buildSceneryCb();
}

/**
 * Hot-swap the live track. Called from roadSystem when keys are
 * collected and the player crosses the finish line.
 */
export function switchToTrack(n) {
  if (n === 2) {
    segs         = _t2Segs;
    trackLen     = _t2Len;
    _activeTrack = 2;
  } else {
    segs         = _t1Segs;
    trackLen     = _t1Len;
    _activeTrack = 1;
  }
}

export function getActiveTrack() { return _activeTrack; }
export function getTrackLen(n)   { return n === 2 ? _t2Len : _t1Len; }

// ── Lookup / projection helpers (unchanged math) ───────
export const findSeg = (z) => {
  if (!segs.length) return null;
  const i = Math.floor(z / C.SEG_LEN);
  return segs[((i % segs.length) + segs.length) % segs.length];
};

export const findSegOnTrack = (z, track = 1) => {
  const arr = track === 2 ? _t2Segs : _t1Segs;
  if (!arr.length) return null;

  const i = Math.floor(z / C.SEG_LEN);
  return arr[((i % arr.length) + arr.length) % arr.length];
};

export const project = (p, camX, camY, camZ, W, H) => {
  p.cam.x = (p.world.x || 0) - camX;
  p.cam.y = (p.world.y || 0) - camY;
  p.cam.z = (p.world.z || 0) - camZ;
  if (p.cam.z <= 0) { p.scr.scale = 0; return; }
  p.scr.scale = C.CAM_DEPTH / p.cam.z;
  p.scr.x     = (W / 2)    + (p.scr.scale * p.cam.x * W / 2);
  p.scr.y     = (H * 0.43) - (p.scr.scale * p.cam.y * H / 2);
  p.scr.w     =  p.scr.scale * C.ROAD_W * W / 2;
};