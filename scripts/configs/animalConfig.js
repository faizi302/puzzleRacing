// ═══════════════════════════════════════════════════════
// ANIMAL CONFIG — rabbit / mouse / crocodile sprite frames
// Put images in:
// assets/animals/rabbit.png
// assets/animals/mouse.png
// assets/animals/crocodile.png
// ═══════════════════════════════════════════════════════

export const ANIMAL_SHEETS = {
  rabbit: {
    imgKey: 'rabbit',
    cols: 4,
    rows: 3,
    sheetW: 4560,
    sheetH: 5399,
    scale: 0.95,
    speedMin: 260,
    speedMax: 420,
    anchorY: 0.92,
    frameTime: 0.11,
  },

  mouse: {
    imgKey: 'mouse',
    cols: 5,
    rows: 2,
    sheetW: 3000,
    sheetH: 2000,
    scale: 0.42,
    speedMin: 300,
    speedMax: 520,
    anchorY: 0.88,
    frameTime: 0.09,
  },

  crocodile: {
    imgKey: 'crocodile',
    cols: 5,
    rows: 2,
    sheetW: 3000,
    sheetH: 2000,
    scale: 0.85,
    speedMin: 160,
    speedMax: 260,
    anchorY: 0.82,
    frameTime: 0.16,
  },
};

export const ANIMAL_SPAWN = [
  { kind: 'rabbit',    startSeg: 60,  everySeg: 90,  side: -1 },
  { kind: 'mouse',     startSeg: 105, everySeg: 115, side:  1 },
  { kind: 'crocodile', startSeg: 170, everySeg: 180, side: -1 },
];