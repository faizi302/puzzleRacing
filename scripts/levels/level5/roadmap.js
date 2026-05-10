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
    straight(n = 180, hill = 0) {
      addStretch(
        Math.floor(n * 0.15),
        Math.floor(n * 0.70),
        Math.floor(n * 0.15),
        0,
        hill
      );
    },

    curve(n = 220, curveValue = 0.75, hill = 0) {
      addStretch(
        Math.floor(n * 0.25),
        Math.floor(n * 0.50),
        Math.floor(n * 0.25),
        curveValue,
        hill
      );
    },

    longCurve(n = 320, curveValue = 0.55, hill = 0) {
      addStretch(
        Math.floor(n * 0.30),
        Math.floor(n * 0.40),
        Math.floor(n * 0.30),
        curveValue,
        hill
      );
    },
  };
}

function buildLevel5MainRoad() {
  const out = [];
  const b = makeBuilder(out);

  for (let i = 0; i < C.RUMBLE * 2; i++) {
    addSegTo(out, 0, 0);
  }

  // LEVEL 5: long endurance road, fewer curves
  b.straight(260);

  b.longCurve(330, 0.55, 0.08);
  b.straight(360);

  b.curve(220, -0.75, -0.05);
  b.straight(420);

  b.longCurve(380, -0.50, 0.12);
  b.straight(300);

  b.curve(240, 0.85, 0);
  b.straight(460);

  b.longCurve(360, 0.45, -0.08);
  b.straight(390);

  b.curve(230, -0.70, 0.1);
  b.straight(520);

  b.longCurve(420, 0.40, 0);
  b.straight(450);

  return out;
}

export function buildRoads() {
  const road = buildLevel5MainRoad();

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