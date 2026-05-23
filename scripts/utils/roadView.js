import { wrapDz } from './math.js';

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

export function dzFromPlayer(z, playerPos, trackLen) {
  return wrapDz(z - playerPos, trackLen);
}

export function isWithinRange(z, playerPos, trackLen, maxAhead, segLen) {
  const dz = wrapDz(z - playerPos, trackLen);
  return dz > -segLen * 2 && dz < maxAhead * segLen;
}