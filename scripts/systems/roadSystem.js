'use strict';
// ═══════════════════════════════════════════════════════
// ROAD SYSTEM — Physics & Player State
// ═══════════════════════════════════════════════════════
import { C }             from '../configs/roadConfig.js';
import { segs, findSeg } from '../core/roadMap.js';

export const P = {
  pos          : 0,
  speed        : 0,
  playerX      : 0,
  lapTime      : 0,
  lapTimes     : [],
  lapCount     : 0,
  raceTime     : 0,
  raceFinished : false,
  isOffTrack   : false,
  isBraking    : false,
  roadCurve    : 0,
  playerZ      : 0,
};

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function resetPhys() {
  P.pos          = 0;
  P.speed        = 0;
  P.playerX      = 0;
  P.lapTime      = 0;
  P.lapTimes     = [];
  P.lapCount     = 0;
  P.raceTime     = 0;
  P.raceFinished = false;
  P.isOffTrack   = false;
  P.isBraking    = false;
  P.roadCurve    = 0;
  P.playerZ      = C.CAM_H / C.CAM_DEPTH;
}

function getLookAheadCurve(z) {
  const c0 = findSeg(z)?.curve || 0;
  const c1 = findSeg(z + C.SEG_LEN * 12)?.curve || 0;
  const c2 = findSeg(z + C.SEG_LEN * 28)?.curve || 0;

  // Smooth upcoming curve value for camera/road visual movement
  return c0 * 0.55 + c1 * 0.30 + c2 * 0.15;
}

export function updatePhys(inp, dt, trackLen) {
  if (P.raceFinished) return;

  const d = Math.min(dt, 0.05);

  // ── Speed ─────────────────────────────────────────────
  P.isBraking = false;

  if (inp.up) {
    P.speed += C.ACCEL * d;
  } else if (inp.down) {
    P.speed += C.BRAKE * d;
    P.isBraking = true;
  } else {
    P.speed += C.DECEL * d;
  }

  if (inp.hand) P.speed *= 0.965;

  P.speed = clamp(P.speed, 0, C.MAX_SPD);
  const speedFrac = P.speed / C.MAX_SPD;

  // ── Road curve / centrifugal drift ────────────────────
  const z = P.pos + P.playerZ;
  const curveNow = getLookAheadCurve(z);

  P.roadCurve += (curveNow - P.roadCurve) * 0.12;

  // IMPORTANT:
  // curve > 0 = road turns RIGHT, car drifts LEFT
  // curve < 0 = road turns LEFT, car drifts RIGHT
  const CENTRIFUGAL_STRENGTH = 5.15;
  P.playerX -= P.roadCurve * speedFrac * CENTRIFUGAL_STRENGTH * d;

  // ── Player steering ───────────────────────────────────
  const steerDx = d * C.STEER_SPD * speedFrac;

  if (inp.left)  P.playerX -= steerDx;
  if (inp.right) P.playerX += steerDx;

  // ── Road side collision / off-road ────────────────────
  const hitL = P.playerX < -1;
  const hitR = P.playerX >  1;

  P.isOffTrack = hitL || hitR;

  if (hitL) {
    P.playerX += 0.10;
    if (P.speed > C.OFFRD_LIM) P.speed += C.OFFRD_DC * d;
  }

  if (hitR) {
    P.playerX -= 0.10;
    if (P.speed > C.OFFRD_LIM) P.speed += C.OFFRD_DC * d;
  }

  P.playerX = clamp(P.playerX, -1.18, 1.18);

  // ── Forward movement ──────────────────────────────────
  P.pos      += P.speed * d;
  P.lapTime  += d;
  P.raceTime += d;

  if (trackLen > 0 && P.pos >= trackLen) {
    P.pos -= trackLen;
    P.lapCount++;
    P.lapTimes.push(P.lapTime);
    P.lapTime = 0;

    if (P.lapCount >= C.TOTAL_LAPS) {
      P.raceFinished = true;
    }
  }
}

export const kmh  = () => Math.round((P.speed / C.MAX_SPD) * 220);
export const best = () => P.lapTimes.length ? Math.min(...P.lapTimes) : null;