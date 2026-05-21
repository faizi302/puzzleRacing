
// ─────────────────────────────────────────────────────────────
import { C, LCOL } from '../../configs/roadConfig.js';

// ── Ease-in/out interpolator ─────────────────────────────────
const eIO = (a, b, p) =>
  a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5);

// ── Core segment builder ─────────────────────────────────────
function addSegTo(target, curve, hill, extra = {}) {
  const n       = target.length;
  const isStart = n < C.RUMBLE * 2;

  target.push({
    index: n,
    p1:    { world: { x: 0, y: 0, z: n       * C.SEG_LEN }, cam: {}, scr: {} },
    p2:    { world: { x: 0, y: 0, z: (n + 1) * C.SEG_LEN }, cam: {}, scr: {} },
    curve,
    hill,
    col: isStart
      ? LCOL.START
      : Math.floor(n / C.RUMBLE) % 2
        ? LCOL.DARK
        : LCOL.LIGHT,
    // Carry any extra payload (e.g. gapSegment flag for BrokenRoad)
    ...extra,
  });
}

// ── Stretch factory ──────────────────────────────────────────
function makeBuilder(target) {
  function addStretch(enter, hold, leave, cv, hv = 0, extra = {}) {
    for (let i = 0; i < enter; i++)
      addSegTo(target, eIO(0, cv, i / Math.max(1, enter)),
                       eIO(0, hv, i / Math.max(1, enter)), extra);

    for (let i = 0; i < hold; i++)
      addSegTo(target, cv, hv, extra);

    for (let i = 0; i < leave; i++)
      addSegTo(target, eIO(cv, 0, i / Math.max(1, leave)),
                       eIO(hv, 0, i / Math.max(1, leave)), extra);
  }

  return {
    straight(n = 180, hill = 0, extra = {}) {
      addStretch(
        Math.floor(n * 0.15), Math.floor(n * 0.70), Math.floor(n * 0.15),
        0, hill, extra,
      );
    },

    curve(n = 220, cv = 0.75, hill = 0, extra = {}) {
      addStretch(
        Math.floor(n * 0.25), Math.floor(n * 0.50), Math.floor(n * 0.25),
        cv, hill, extra,
      );
    },

    longCurve(n = 320, cv = 0.55, hill = 0, extra = {}) {
      addStretch(
        Math.floor(n * 0.30), Math.floor(n * 0.40), Math.floor(n * 0.30),
        cv, hill, extra,
      );
    },

    // A gap section: road colour becomes transparent-black to simulate void
    gap(n = 30) {
      for (let i = 0; i < n; i++) {
        const idx = target.length;
        target.push({
          index: idx,
          p1:    { world: { x: 0, y: 0, z: idx       * C.SEG_LEN }, cam: {}, scr: {} },
          p2:    { world: { x: 0, y: 0, z: (idx + 1) * C.SEG_LEN }, cam: {}, scr: {} },
          curve:      0,
          hill:       0,
          col:        LCOL.GAP ?? { road: '#000000', grass: '#000010', rumble: '#111111', lane: '#000000' },
          isGapSeg:   true,
        });
      }
    },
  };
}

// ── Level 5 road layout ──────────────────────────────────────
//
//  Structure (each block = straight + curve + key zone + hurdle):
//
//  START rumble
//  Opening straight
//  [KEY SET 1]  →  HURDLE 1 (StoneBlock)
//  curve right
//  [KEY SET 2]  →  HURDLE 2 (BrokenRoad gap)
//  long curve left + mild hill
//  [KEY SET 3]  →  HURDLE 3 (GiantWall)
//  curve right + descent
//  [KEY SET 4]  →  HURDLE 4 (FireGate)
//  long curve left
//  [KEY SET 5]  →  HURDLE 5 (PoliceBlockade)
//  Final straight to finish
//
function buildLevel5MainRoad() {
  const out = [];
  const b   = makeBuilder(out);

  // Start rumble
  for (let i = 0; i < C.RUMBLE * 2; i++) addSegTo(out, 0, 0);

  // ── Opening straight ────────────────────────────────────────
  b.straight(200);

  // ── Section 1 ── Key zone approach → StoneBlock hurdle ──────
  b.straight(160);               // key zone (scenery will place keys here)
  b.straight(80);                // hurdle approach
  b.curve(180, -0.60, 0.05);

  // ── Section 2 ── Key zone → BrokenRoad gap ──────────────────
  b.straight(200);               // key zone
  b.straight(60);                // gap approach
  // The gap itself: ~25 invisible/void segments
  b.gap(25);
  b.straight(60);                // landing strip after gap

  // ── Section 3 ── Key zone → GiantWall ───────────────────────
  b.longCurve(300, 0.50, 0.10);
  b.straight(180);               // key zone
  b.straight(80);                // wall approach
  b.curve(200, 0.70, -0.06);

  // ── Section 4 ── Key zone → FireGate ────────────────────────
  b.straight(240);               // key zone
  b.straight(80);                // gate approach
  b.longCurve(280, -0.45, 0.08);

  // ── Section 5 ── Key zone → PoliceBlockade ──────────────────
  b.straight(200);               // key zone
  b.straight(80);                // blockade approach
  b.curve(180, 0.55, -0.05);

  // ── Final straight to finish ─────────────────────────────────
  b.straight(280);

  return out;
}

// ── Public export ────────────────────────────────────────────
export function buildRoads() {
  const road = buildLevel5MainRoad();
  const len  = road.length * C.SEG_LEN;

  return {
    road1: { segs: road, len },
    road2: { segs: road, len },   // reverse / mirror road reuses same geometry
  };
}