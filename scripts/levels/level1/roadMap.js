
import { C, LCOL } from '../../configs/roadConfig.js';
import { easeInOut } from '../../utils/math.js';

function addSegTo(target, curve, hill) {
  const n   = target.length;
  const isS = n < C.RUMBLE * 2;
  target.push({
    index: n,
    p1: { world: { x: 0, y: 0, z:  n      * C.SEG_LEN }, cam: {}, scr: {} },
    p2: { world: { x: 0, y: 0, z: (n + 1) * C.SEG_LEN }, cam: {}, scr: {} },
    curve, hill,
    col: isS ? LCOL.START
             : (Math.floor(n / C.RUMBLE) % 2 ? LCOL.DARK : LCOL.LIGHT),
  });
}

function makeBuilder(target) {
  const addStretch = (nE, nH, nL, cv, hl) => {
    for (let i = 0; i < nE; i++) addSegTo(target, easeInOut(0, cv, i / nE), easeInOut(0, hl, i / nE));
    for (let i = 0; i < nH; i++) addSegTo(target, cv, hl);
    for (let i = 0; i < nL; i++) addSegTo(target, easeInOut(cv, 0, i / nL), easeInOut(hl, 0, i / nL));
  };
  return {
    straight: (n = 25)                 => addStretch(n / 4 | 0, n / 2 | 0, n / 4 | 0, 0, 0),
    curve:    (n = 25, cv = 2, hl = 0) => addStretch(n / 4 | 0, n / 2 | 0, n / 4 | 0, cv, hl),
    addStretch,
  };
}

// Road 1 — trap path
function buildRoad1() {
  const out = [];
  const { straight, curve, addStretch } = makeBuilder(out);

  addStretch(1, C.RUMBLE * 2, 1, 0, 0);

  // Opening straight — spawn area, wall behind, plate behind wall visible.
  straight(80);

  // Winding middle
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

  // Closing straight — trap zone (fake door + monster wall)
  straight(220);
  straight(40);
  return out;
}

// Road 2 — winning path
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
  straight(200);
  curve(80,   0.18, 0);

  // Closing straight — ramp + monsters + finish
  straight(220);
  straight(40);
  return out;
}

export function buildRoads() {
  const r1 = buildRoad1();
  const r2 = buildRoad2();
  return {
    road1: { segs: r1, len: r1.length * C.SEG_LEN },
    road2: { segs: r2, len: r2.length * C.SEG_LEN },
  };
}