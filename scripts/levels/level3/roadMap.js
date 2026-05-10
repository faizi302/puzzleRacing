import { C, LCOL } from '../../configs/roadConfig.js';

const eIO = (a, b, p) =>
  a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5);

function addSegTo(target, curve, hill) {
  const n = target.length;
  const isStart = n < C.RUMBLE * 2;

  target.push({
    index: n,

    p1: {
      world: { x: 0, y: 0, z: n * C.SEG_LEN },
      cam: {},
      scr: {},
    },

    p2: {
      world: { x: 0, y: 0, z: (n + 1) * C.SEG_LEN },
      cam: {},
      scr: {},
    },

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
  const addStretch = (
    enter,
    hold,
    leave,
    curveValue,
    hillValue = 0
  ) => {
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
  };

  return {
    straight(n = 100, hill = 0) {
      addStretch(20, 60, 20, 0, hill);
    },

    curve(n = 120, curveValue = 1, hill = 0) {
      addStretch(30, 60, 30, curveValue, hill);
    },

    sCurve(n = 240, left = -1, right = 1) {
      this.curve(n / 2, left);
      this.curve(n / 2, right);
    },
  };
}

function buildLevel3MainRoad() {
  const out = [];
  const b = makeBuilder(out);

  for (let i = 0; i < C.RUMBLE * 2; i++) {
    addSegTo(out, 0, 0);
  }

  // LEVEL 3 = much different than Level 2

  b.straight(200);

  b.curve(240, -1.25);

  b.straight(140);

  b.sCurve(320, 1.40, -1.30);

  b.straight(180);

  b.curve(280, 1.60);

  b.straight(150);

  b.curve(220, -1.10);

  b.sCurve(380, -1.50, 1.50);

  b.straight(250);

  return out;
}

export function buildRoads() {
  const road1 = buildLevel3MainRoad();
  const road2 = buildSecretRoad();

  return {
    road1: {
      segs: road1,
      len: road1.length * C.SEG_LEN,
    },

    road2: {
      segs: road2,
      len: road2.length * C.SEG_LEN,
    },
  };
}


function buildSecretRoad() {
  const out = [];
  const b = makeBuilder(out);

  b.straight(100);
  b.curve(180, 1.6);
  b.sCurve(260, -1.3, 1.4);
  b.curve(180, -1.5);
  b.straight(220);

  return out;
}