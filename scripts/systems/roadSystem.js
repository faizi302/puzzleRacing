'use strict';
// ═══════════════════════════════════════════════════════
// ROAD SYSTEM — Physics & Player State
//
// REAL-WORLD CURVE DRIFT:
//   Every road segment has a `curve` value.  When the car
//   is moving, that curve pushes the player laterally —
//   exactly like a real car on a banked road that drifts
//   to the outside if you don't counter-steer.
//
//   On a RIGHT-turn segment  (curve > 0):
//     → car drifts LEFT  unless player steers right
//   On a LEFT-turn segment   (curve < 0):
//     → car drifts RIGHT unless player steers left
//
//   Strength is proportional to speed AND curve magnitude,
//   so gentle curves need gentle corrections and sharp
//   ones need more steering input.
// ═══════════════════════════════════════════════════════
import { C }        from '../configs/roadConfig.js';
import { segs, findSeg } from '../core/roadMap.js';

export const P = {
  pos:0, speed:0, playerX:0,
  lapTime:0, lapTimes:[], lapCount:0,
  raceTime:0, raceFinished:false,
  isOffTrack:false, isBraking:false,
  playerZ:0,
  // Current road curve felt by the car (for steering frame selection)
  roadCurve: 0,
};

export const clamp = (v,lo,hi) => Math.max(lo, Math.min(hi, v));

export function resetPhys() {
  P.pos=0; P.speed=0; P.playerX=0;
  P.lapTime=0; P.lapTimes=[]; P.lapCount=0;
  P.raceTime=0; P.raceFinished=false;
  P.isOffTrack=false; P.isBraking=false;
  P.roadCurve = 0;
  P.playerZ = C.CAM_H / C.CAM_DEPTH;
}

export function updatePhys(inp, dt, trackLen) {
  if (P.raceFinished) return;
  const d = Math.min(dt, 0.05);
  P.isBraking = false;

  // ── Throttle / Brake ─────────────────────────────────
  if      (inp.up)   P.speed += C.ACCEL * d;
  else if (inp.down) { P.speed += C.BRAKE * d; P.isBraking = true; }
  else               P.speed += C.DECEL * d;
  if (inp.hand) P.speed *= 0.96;

  P.speed = clamp(P.speed, 0, C.MAX_SPD);

  // ── Road curve at current car position ───────────────
  // We look up the segment the player is on and read its curve value.
  // Positive curve = road bends RIGHT → car drifts LEFT (playerX decreases).
  // Negative curve = road bends LEFT  → car drifts RIGHT (playerX increases).
  const seg = findSeg(P.pos + P.playerZ);
  const curveDrift = seg ? seg.curve : 0;
  P.roadCurve = curveDrift; // expose for visual frame selection

  const speedFraction = P.speed / C.MAX_SPD; // 0..1

  // ── Drift: road pushes car to outside of curve ───────
  // Scale: at full speed on a curve of magnitude 1, drift is ~0.45 units/sec
  // This is strong enough to require active steering but not impossible.
  const DRIFT_STRENGTH = 0.45;
  P.playerX -= curveDrift * speedFraction * DRIFT_STRENGTH * d;

  // ── Player steering ──────────────────────────────────
  const steerDx = d * C.STEER_SPD * speedFraction;
  if (inp.left)  P.playerX -= steerDx;
  if (inp.right) P.playerX += steerDx;

  // ── Wall collision ───────────────────────────────────
  const hitL = P.playerX < -1;
  const hitR = P.playerX >  1;
  P.isOffTrack = hitL || hitR;
  if (hitL) { P.playerX += 0.08; if (P.speed > C.OFFRD_LIM) P.speed += C.OFFRD_DC * d; }
  if (hitR) { P.playerX -= 0.08; if (P.speed > C.OFFRD_LIM) P.speed += C.OFFRD_DC * d; }

  P.playerX = clamp(P.playerX, -1.15, 1.15);

  // ── Advance position ─────────────────────────────────
  P.pos      += P.speed * d;
  P.lapTime  += d;
  P.raceTime += d;

  if (P.pos >= trackLen && trackLen > 0) {
    P.pos -= trackLen;
    P.lapCount++;
    P.lapTimes.push(P.lapTime);
    P.lapTime = 0;
    if (P.lapCount >= C.TOTAL_LAPS) P.raceFinished = true;
  }
}

export const kmh  = () => Math.round((P.speed / C.MAX_SPD) * 220);
export const best = () => P.lapTimes.length ? Math.min(...P.lapTimes) : null;
