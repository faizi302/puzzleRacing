import { C, LCOL } from '../../configs/roadConfig.js';

const eIO = (a, b, p) =>
  a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5);

function addSegTo(target, curve, hill) {
  const n = target.length;
  const isStart = n < C.RUMBLE * 2;

  target.push({
    index: n,
    p1: { world: { x: 0, y: 0, z: n * C.SEG_LEN }, cam: {}, scr: {} },
    p2: { world: { x: 0, y: 0, z: (n + 1) * C.SEG_LEN }, cam: {}, scr: {} },
    curve,
    hill,
    col: isStart
      ? LCOL.START
      : Math.floor(n / C.RUMBLE) % 2
        ? LCOL.DARK
        : LCOL.LIGHT,
  });
}

function makeBuilder(target) {
  const addStretch = (enter, hold, leave, curveValue, hillValue = 0) => {
    for (let i = 0; i < enter; i++) {
      addSegTo(target, eIO(0, curveValue, i / Math.max(1, enter)), eIO(0, hillValue, i / Math.max(1, enter)));
    }

    for (let i = 0; i < hold; i++) {
      addSegTo(target, curveValue, hillValue);
    }

    for (let i = 0; i < leave; i++) {
      addSegTo(target, eIO(curveValue, 0, i / Math.max(1, leave)), eIO(hillValue, 0, i / Math.max(1, leave)));
    }
  };

  return {
    straight(n = 80, hill = 0) {
      addStretch(Math.floor(n * 0.20), Math.floor(n * 0.60), Math.floor(n * 0.20), 0, hill);
    },

    curve(n = 100, curveValue = 1, hill = 0) {
      addStretch(Math.floor(n * 0.25), Math.floor(n * 0.50), Math.floor(n * 0.25), curveValue, hill);
    },

    sCurve(n = 180, left = -0.8, right = 0.8) {
      this.curve(Math.floor(n * 0.50), left, 0);
      this.curve(Math.floor(n * 0.50), right, 0);
    },
  };
}

function buildLevel2MainRoad() {
  const out = [];
  const b = makeBuilder(out);

  // start area
  for (let i = 0; i < C.RUMBLE * 2; i++) addSegTo(out, 0, 0);

  // LEVEL 2: same city rhythm, only smoother curves
  b.straight(170);
  b.curve(190, 0.72);
  b.straight(140);

  b.sCurve(280, -0.78, 0.74);
  b.straight(210);

  b.curve(240, -0.68);
  b.straight(160);

  b.curve(280, 0.82);
  b.straight(240);

  b.sCurve(320, 0.62, -0.78);
  b.straight(200);

  b.curve(260, -0.88);
  b.straight(280);

  b.curve(230, 0.58);
  b.straight(360);

  return out;
}

export function buildRoads() {
  const road = buildLevel2MainRoad();

  return {
    road1: {
      segs: road,
      len: road.length * C.SEG_LEN,
    },

    // no back road / no secret road in Level 2
    road2: {
      segs: road,
      len: road.length * C.SEG_LEN,
    },
  };
}