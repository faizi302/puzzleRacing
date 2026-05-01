'use strict';
// ═══════════════════════════════════════════════════════
// ROAD SYSTEM — Physics, Player State, Lap Logic, Nitro
// ═══════════════════════════════════════════════════════
import { C, START_PRE_FINISH } from '../configs/roadConfig.js';
import { segs, findSeg, trackLen } from '../core/roadMap.js';

export const P = {
  pos: 0,
  speed: 0,
  playerX: 0,
  lapTime: 0,
  lapTimes: [],
  lapCount: 0,
  raceTime: 0,
  raceFinished: false,
  isOffTrack: false,
  isBraking: false,
  roadCurve: 0,
  playerZ: 0,

  // ── Nitro / boost ─────────────────────────────────────
  nitroTime: 0,         // seconds remaining
  nitroActive: false,

  // ── Lap detection helpers ─────────────────────────────
  _firstCrossing: true,     // skip lap count on the very first cross
  _prevPos: 0,

  // ── Race-end coast / camera fly-out ───────────────────
  endPhase: 0,         // 0 = racing, 1 = end coast (no input), 2 = win shown
  endTime: 0,         // seconds spent in end-phase
};

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function resetPhys() {
  // Player starts BEHIND the visible finish line so it's some distance ahead.
  // trackLen exists once roadMap built the track.
  P.pos = Math.max(0, (trackLen || 0) - START_PRE_FINISH);
  P.speed = 0;
  P.playerX = 0;
  P.lapTime = 0;
  P.lapTimes = [];
  P.lapCount = 0;
  P.raceTime = 0;
  P.raceFinished = false;
  P.isOffTrack = false;
  P.isBraking = false;
  P.roadCurve = 0;
  P.playerZ = C.CAM_H / C.CAM_DEPTH;

  P.nitroTime = 0;
  P.nitroActive = false;

  P._firstCrossing = true;
  P._prevPos = P.pos;

  P.endPhase = 0;
  P.endTime = 0;
}

// ── Nitro API ─────────────────────────────────────────
export function activateNitro(durationSec = 3.0) {
  P.nitroTime = Math.max(P.nitroTime, durationSec);
  P.nitroActive = true;
}

// ── Bounce-back from collision ────────────────────────
// kind: 'wall' (off-road), 'scenery' (tunnel/tree/rock), 'bumper'
// dir : -1 = bounce LEFT, +1 = bounce RIGHT, 0 = straight back
export function applyBounce(kind = 'scenery', dir = 0) {
  if (kind === 'wall') {
    P.speed *= 0.55;
    P.playerX += dir * 0.06;
  } else if (kind === 'bumper') {
    P.speed *= 0.40;
    P.playerX += dir * 0.20;
    if (P.speed < 600) P.speed = 600;
  } else { // scenery / tunnel
    P.speed *= 0.20;            // big drop
    P.playerX += dir * 0.18;
    if (P.speed > -300) P.speed = Math.min(P.speed, 0);  // brief reverse feel
  }
}

function getLookAheadCurve(z) {
  const c0 = findSeg(z)?.curve || 0;
  const c1 = findSeg(z + C.SEG_LEN * 12)?.curve || 0;
  const c2 = findSeg(z + C.SEG_LEN * 28)?.curve || 0;
  return c0 * 0.55 + c1 * 0.30 + c2 * 0.15;
}

// ── Lap counter — handles wraparound smoothly ─────────
function checkLap(prev, next, len) {
  // prev → next must have crossed the lap boundary going forward.
  // The boundary IS pos == len (which then wraps to 0).
  // After wrap, next < prev (because pos was decremented by len).
  return next < prev && (prev <= len) && (next >= 0);
}

// ═══════════════════════════════════════════════════════
// MAIN PHYSICS UPDATE
// ═══════════════════════════════════════════════════════
export function updatePhys(inp, dt, len) {
  const d = Math.min(dt, 0.05);

  // ── Race finished? Coast camera-fly-out, ignore inputs ──
  if (P.endPhase >= 1) {
    P.endTime += d;
    // Gentle coast: hold ~70% of speed at end, then decay slowly.
    P.speed *= 0.992;
    if (P.speed < 200) P.speed = 200;     // keep moving for the camera fly
    if (P.endTime > 4.0) P.speed *= 0.94; // fade to a stop after 4s
    if (P.speed < 30) P.speed = 0;
    P.pos += P.speed * d;
    if (len > 0 && P.pos >= len) P.pos -= len;
    return;
  }

  // ── Nitro tick ───────────────────────────────────────
  if (P.nitroTime > 0) {
    P.nitroTime -= d;
    P.nitroActive = true;
    if (P.nitroTime <= 0) { P.nitroTime = 0; P.nitroActive = false; }
  } else {
    P.nitroActive = false;
  }
  const speedCap = P.nitroActive ? C.NITRO_MAX : C.NORMAL_MAX;

  // ── Throttle / brake / drag ──────────────────────────
  P.isBraking = false;

  if (inp.up) {
    P.speed += C.ACCEL * d * (P.nitroActive ? 1.35 : 1.0);
  } else if (inp.down) {
    P.speed += C.BRAKE * d;
    P.isBraking = true;
  } else {
    P.speed += C.DECEL * d;
  }

  if (inp.hand) P.speed *= 0.965;

  P.speed = clamp(P.speed, 0, speedCap);
  const speedFrac = P.speed / C.NORMAL_MAX;   // 0..1+ (nitro can exceed 1)

  // ── Curve / centrifugal drift ────────────────────────
  const z = P.pos + P.playerZ;
  const curveNow = getLookAheadCurve(z);
  P.roadCurve += (curveNow - P.roadCurve) * 0.12;

  // ── Smooth curve drift ─────────────────────────────────
  // Old value 5.15 was too strong, so on long turns the car
  // felt like it was being pushed into road edges.
  const CENTRIFUGAL_STRENGTH = 1.85;

  // Softens drift at high speed and prevents side-collision feeling.
  const curvePush = P.roadCurve * Math.min(speedFrac, 1) * CENTRIFUGAL_STRENGTH * d;

  // Smooth, controlled road-side pull
  P.playerX -= curvePush;

  // ── Steering ─────────────────────────────────────────
  // Allow turning even when stopped IF throttle is held — helps the player
  // line the car up before launching. Visual frames respond regardless.
  const effSteer = inp.up
    ? Math.max(speedFrac, C.STEER_MIN_FAC)
    : speedFrac;
  const steerDx = d * C.STEER_SPD * effSteer;

  if (inp.left) P.playerX -= steerDx;
  if (inp.right) P.playerX += steerDx;

  // ── Off-road wall collision (road edge) ──────────────
  const hitL = P.playerX < -1;
  const hitR = P.playerX > 1;
  P.isOffTrack = hitL || hitR;

  if (hitL) {
    P.playerX += 0.035;
    if (P.speed > C.OFFRD_LIM) P.speed += C.OFFRD_DC * d * 0.35;
  }

  if (hitR) {
    P.playerX -= 0.035;
    if (P.speed > C.OFFRD_LIM) P.speed += C.OFFRD_DC * d * 0.35;
  }
  P.playerX = clamp(P.playerX, -1.18, 1.18);

  // ── Forward integration & lap detection ──────────────
  P._prevPos = P.pos;
  P.pos += P.speed * d;
  P.lapTime += d;
  P.raceTime += d;

  if (len > 0 && P.pos >= len) {
    P.pos -= len;

    if (P._firstCrossing) {
      // Race officially STARTS now — first crossing of the finish line.
      P._firstCrossing = false;
      P.lapTime = 0;
    } else {
      P.lapCount++;
      P.lapTimes.push(P.lapTime);
      P.lapTime = 0;

      if (P.lapCount >= C.TOTAL_LAPS) {
        // Begin race-end fly-out.
        P.raceFinished = true;
        P.endPhase = 1;
        P.endTime = 0;
      }
    }
  }
}

export const kmh = () =>
  Math.round(Math.min(P.speed, C.NITRO_MAX) / C.KMH_TO_WORLD);

export const best = () => P.lapTimes.length ? Math.min(...P.lapTimes) : null;