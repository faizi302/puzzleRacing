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
  function addStretch(enter, hold, leave, curveValue, hillValue = 0) {
    for (let i = 0; i < enter; i++) {
      addSegTo(
        target,
        eIO(0, curveValue, i / Math.max(1, enter)),
        eIO(0, hillValue, i / Math.max(1, enter))
      );
    }

    for (let i = 0; i < hold; i++) {
      addSegTo(target, curveValue, hillValue);
    }

    for (let i = 0; i < leave; i++) {
      addSegTo(
        target,
        eIO(curveValue, 0, i / Math.max(1, leave)),
        eIO(hillValue, 0, i / Math.max(1, leave))
      );
    }
  }

  return {
    straight(n = 80, hill = 0) {
      addStretch(Math.floor(n * 0.2), Math.floor(n * 0.6), Math.floor(n * 0.2), 0, hill);
    },

    curve(n = 120, curveValue = 1, hill = 0) {
      addStretch(Math.floor(n * 0.25), Math.floor(n * 0.5), Math.floor(n * 0.25), curveValue, hill);
    },

    longCurve(n = 280, curveValue = 0.55, hill = 0) {
      addStretch(
        Math.floor(n * 0.30),
        Math.floor(n * 0.40),
        Math.floor(n * 0.30),
        curveValue,
        hill
      );
    },

    sharp(n = 90, curveValue = 1.5, hill = 0) {
      addStretch(Math.floor(n * 0.18), Math.floor(n * 0.64), Math.floor(n * 0.18), curveValue, hill);
    },

    chainLeft() {
      this.curve(130, -1.05, 0.15);
      this.straight(35, 0.05);
      this.sharp(105, -1.55, -0.1);
    },

    chainRight() {
      this.curve(130, 1.10, -0.08);
      this.straight(30, 0);
      this.sharp(110, 1.65, 0.12);
    },

    sCurve(n = 220, first = -1.1, second = 1.1) {
      this.curve(Math.floor(n * 0.5), first, 0.08);
      this.curve(Math.floor(n * 0.5), second, -0.08);
    },
  };
}

function buildLevel4MainRoad() {
  const out = [];
  const b = makeBuilder(out);

  for (let i = 0; i < C.RUMBLE * 2; i++) {
    addSegTo(out, 0, 0);
  }

  // smooth start
  b.straight(180);

  // soft left snowy bend
  b.curve(220, -0.65, 0.10);
  b.straight(220);

  // long right ice section
  b.longCurve(300, 0.55, -0.08);
  b.straight(260);

  // smooth S road
  b.curve(180, -0.70, 0.05);
  b.curve(180, 0.65, -0.05);
  b.straight(200);

  // mountain turn
  b.longCurve(320, -0.50, 0.12);
  b.straight(240);

  // controlled right bend
  b.curve(200, 0.75, 0);
  b.straight(280);

  // final snow valley section
  b.longCurve(340, 0.45, -0.08);
  b.curve(180, -0.60, 0.06);
  b.straight(320);

  return out;
}

export function buildRoads() {
  const road = buildLevel4MainRoad();

  return {
    road1: {
      segs: road,
      len: road.length * C.SEG_LEN,
    },

    road2: {
      segs: road,
      len: road.length * C.SEG_LEN,
    },
  };
}