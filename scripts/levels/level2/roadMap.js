import { C, LCOL } from '../../configs/roadConfig.js';

const eIO = (a, b, p) =>
  a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5);

function addSegTo(target, curve, hill) {
  const n = target.length;
  const isS = n < C.RUMBLE * 2;

  target.push({
    index: n,
    p1: { world: { x: 0, y: 0, z: n * C.SEG_LEN }, cam: {}, scr: {} },
    p2: { world: { x: 0, y: 0, z: (n + 1) * C.SEG_LEN }, cam: {}, scr: {} },
    curve,
    hill,
    col: isS
      ? LCOL.START
      : Math.floor(n / C.RUMBLE) % 2
        ? LCOL.DARK
        : LCOL.LIGHT,
  });
}

function makeBuilder(target) {
  const addStretch = (nE, nH, nL, cv, hl) => {
    for (let i = 0; i < nE; i++) addSegTo(target, eIO(0, cv, i / nE), eIO(0, hl, i / nE));
    for (let i = 0; i < nH; i++) addSegTo(target, cv, hl);
    for (let i = 0; i < nL; i++) addSegTo(target, eIO(cv, 0, i / nL), eIO(hl, 0, i / nL));
  };

  return {
    straight: (n = 40) => addStretch(n / 4 | 0, n / 2 | 0, n / 4 | 0, 0, 0),
    curve: (n = 60, cv = 1, hl = 0) => addStretch(n / 4 | 0, n / 2 | 0, n / 4 | 0, cv, hl),
    addStretch,
  };
}

function buildRoad1() {
  const out = [];
  const { straight, curve, addStretch } = makeBuilder(out);

  addStretch(1, C.RUMBLE * 2, 1, 0, 0);

  straight(90);
  curve(120, 0.45, 0);
  straight(150);
  curve(140, -0.75, 0);
  straight(180);
  curve(100, 0.95, 0);
  straight(220);
  curve(160, -0.45, 0);
  straight(200);
  curve(120, 0.35, 0);
  straight(260);
  curve(180, -0.65, 0);
  straight(300);

  return out;
}

function buildRoad2() {
  const out = [];
  const { straight, curve, addStretch } = makeBuilder(out);

  addStretch(1, C.RUMBLE * 2, 1, 0, 0);

  straight(100);
  curve(130, -0.60, 0);
  straight(220);
  curve(160, 0.85, 0);
  straight(260);
  curve(190, -0.90, 0);
  straight(300);
  curve(150, 0.55, 0);
  straight(280);
  curve(170, -0.40, 0);
  straight(360);

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