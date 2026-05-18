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
  straight(n = 120, hill = 0) {
    addStretch(
      Math.floor(n * 0.15),
      Math.floor(n * 0.70),
      Math.floor(n * 0.15),
      0,
      hill
    );
  },

  curve(n = 150, curveValue = 0.85, hill = 0) {
    addStretch(
      Math.floor(n * 0.28),
      Math.floor(n * 0.44),
      Math.floor(n * 0.28),
      curveValue,
      hill
    );
  },

  longCurve(n = 260, curveValue = 0.55, hill = 0) {
    addStretch(
      Math.floor(n * 0.34),
      Math.floor(n * 0.32),
      Math.floor(n * 0.34),
      curveValue,
      hill
    );
  },

  sCurve(n = 260, left = -0.85, right = 0.85) {
    this.curve(Math.floor(n * 0.5), left, 0.06);
    this.curve(Math.floor(n * 0.5), right, -0.06);
  },
};
}

function buildLevel3MainRoad() {
  const out = [];
  const b = makeBuilder(out);

  for (let i = 0; i < C.RUMBLE * 2; i++) {
    addSegTo(out, 0, 0);
  }

  // LEVEL 3: Symbol Code road
  // Exciting, flowing, but not impossible

  b.straight(220);

  // first symbol zone: gentle warm-up
  b.longCurve(300, -0.55, 0.08);
  b.straight(180);

  // second symbol zone: smooth S rhythm
  b.sCurve(320, 0.75, -0.70);
  b.straight(210);

  // third symbol zone: stronger but controlled bend
  b.curve(240, 0.95, -0.06);
  b.straight(180);

  // memory/puzzle mid-section, exciting but readable
  b.longCurve(360, -0.70, 0.10);
  b.straight(220);

  // final rhythm section, no impossible sharp edges
  b.sCurve(360, -0.85, 0.80);
  b.straight(260);

  // final road before finish
  b.curve(220, 0.65, 0.04);
  b.straight(300);

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