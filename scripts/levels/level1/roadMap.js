// ═══════════════════════════════════════════════════════
// LEVEL 1 ROAD MAP — Dual-track Road1 (LEFT) + Road2 (RIGHT)
// ─────────────────────────────────────────────────────
// Returns geometry only. The facade in core/roadMap.js handles
// active-track storage, switching, and live bindings.
// ═══════════════════════════════════════════════════════
import { C, LCOL } from '../../configs/roadConfig.js';

const eIO = (a, b, p) => a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5);

function addSegTo(target, curve, hill) {
  const n   = target.length;
  const isS = n < C.RUMBLE * 2;
  target.push({
    index : n,
    p1    : { world: { x: 0, y: 0, z:  n      * C.SEG_LEN }, cam: {}, scr: {} },
    p2    : { world: { x: 0, y: 0, z: (n + 1) * C.SEG_LEN }, cam: {}, scr: {} },
    curve, hill,
    col   : isS ? LCOL.START
                : (Math.floor(n / C.RUMBLE) % 2 ? LCOL.DARK : LCOL.LIGHT),
  });
}

function makeBuilder(target) {
  const addStretch = (nE, nH, nL, cv, hl) => {
    for (let i = 0; i < nE; i++) addSegTo(target, eIO(0, cv, i / nE), eIO(0, hl, i / nE));
    for (let i = 0; i < nH; i++) addSegTo(target, cv, hl);
    for (let i = 0; i < nL; i++) addSegTo(target, eIO(cv, 0, i / nL), eIO(hl, 0, i / nL));
  };
  return {
    straight : (n = 25)              => addStretch(n / 4 | 0, n / 2 | 0, n / 4 | 0, 0, 0),
    curve    : (n = 25, cv = 2, hl = 0) => addStretch(n / 4 | 0, n / 2 | 0, n / 4 | 0, cv, hl),
    addStretch,
  };
}

// ROAD 1 — wrong fork (HARD LEFT, loops forever)
function buildRoad1() {
  const out = [];
  const { straight, curve, addStretch } = makeBuilder(out);

  addStretch(1, C.RUMBLE * 2, 1, 0, 0);
  straight(60);
  curve(80, -0.55, 0);
  straight(190);
  curve(95, -0.32, 0);
  straight(210);
  curve(100,  0.40, 0);
  straight(185);
  curve(90,   0.30, 0);
  straight(210);
  curve(80,  -0.26, 0);
  straight(195);
  curve(75,   0.22, 0);
  straight(200);
  curve(65,  -0.20, 0);
  straight(195);
  straight(40);
  return out;
}

// ROAD 2 — right fork (HARD RIGHT, one lap = win)
function buildRoad2() {
  const out = [];
  const { straight, curve, addStretch } = makeBuilder(out);

  addStretch(1, C.RUMBLE * 2, 1, 0, 0);
  straight(60);
  curve(80, 0.55, 0);
  straight(230);
  curve(110,  0.28, 0);
  straight(260);
  curve(120, -0.24, 0);
  straight(280);
  curve(100,  0.22, 0);
  straight(240);
  curve(90,  -0.20, 0);
  straight(260);
  curve(80,   0.18, 0);
  straight(260);
  straight(40);
  return out;
}

/**
 * Public API: returns geometry for both tracks of this level.
 * Called by core/roadMap.js's buildTrack().
 */
export function buildRoads() {
  const r1 = buildRoad1();
  const r2 = buildRoad2();
  return {
    road1: { segs: r1, len: r1.length * C.SEG_LEN },
    road2: { segs: r2, len: r2.length * C.SEG_LEN },
  };
}