// Shared road-view helpers used by scenery/monster/opponent renderers.
import { wrapDz } from './math.js';

// Find the visible segment slot for a world Z, given an array of
// _visibleSegs from roadRender. Returns null if not visible.
//
// _visibleSegs entries look like:
//   { index, y1, y2, x1, x2, w1, w2, z1, z2, camZ }
export function visibleForZ(visibleSegs, z) {
  if (!visibleSegs || !visibleSegs.length) return null;

  for (let i = 0; i < visibleSegs.length; i++) {
    const s = visibleSegs[i];
    // p1.z is the far edge; p2.z is the near edge.
    // visibleSegs are produced in draw order (far -> near per segment iteration),
    // but z1/z2 cover [z2, z1].
    const zNear = Math.min(s.z1, s.z2);
    const zFar  = Math.max(s.z1, s.z2);
    if (z >= zNear && z < zFar) return s;
  }
  return null;
}

// Wrap-aware dz from player to a world Z.
export function dzFromPlayer(z, playerPos, trackLen) {
  return wrapDz(z - playerPos, trackLen);
}

// Quick test: is a world Z within `maxAhead` segments of the player?
export function isWithinRange(z, playerPos, trackLen, maxAhead, segLen) {
  const dz = wrapDz(z - playerPos, trackLen);
  return dz > -segLen * 2 && dz < maxAhead * segLen;
}