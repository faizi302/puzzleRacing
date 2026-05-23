import { C } from '../configs/roadConfig.js';
import { getActiveLevel } from './activeLevel.js';

export let segs     = [];
export let trackLen = 0;

let _t1Segs = [], _t1Len = 0;
let _t2Segs = [], _t2Len = 0;
let _activeTrack = 1;

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

  segs         = _t1Segs;
  trackLen     = _t1Len;
  _activeTrack = 1;

  if (typeof buildSceneryCb === 'function') buildSceneryCb();
}

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

export const getActiveTrack = () => _activeTrack;
export const getTrackLen    = (n) => (n === 2 ? _t2Len : _t1Len);

export function findSeg(z) {
  if (!segs.length) return null;
  const i = Math.floor(z / C.SEG_LEN);
  const len = segs.length;
  return segs[((i % len) + len) % len];
}

export function findSegOnTrack(z, track = 1) {
  const arr = track === 2 ? _t2Segs : _t1Segs;
  if (!arr.length) return null;
  const i = Math.floor(z / C.SEG_LEN);
  const len = arr.length;
  return arr[((i % len) + len) % len];
}

export function project(p, camX, camY, camZ, W, H) {
  p.cam.x = (p.world.x || 0) - camX;
  p.cam.y = (p.world.y || 0) - camY;
  p.cam.z = (p.world.z || 0) - camZ;
  if (p.cam.z <= 0) { p.scr.scale = 0; return; }

  const scale = C.CAM_DEPTH / p.cam.z;
  p.scr.scale = scale;
  p.scr.x = (W / 2)   + (scale * p.cam.x * W / 2);
  p.scr.y = (H * 0.43) - (scale * p.cam.y * H / 2);
  p.scr.w =  scale * C.ROAD_W * W / 2;
}