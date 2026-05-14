// ═══════════════════════════════════════════════════════
// OBJECT RENDER — Level-safe image loader
// Fix: when returning Level2 → Level1, images are reset correctly.
// ═══════════════════════════════════════════════════════

export function loadImage(src) {
  const img = new Image();
  img.ready = false;

  const list = Array.isArray(src) ? src : [src];
  let i = 0;

  img.promise = new Promise((resolve) => {
    const tryLoad = () => {
      img.ready = false;
      img.src = list[i];
    };

    img.onload = () => {
      img.ready = true;
      resolve(img);
    };

    img.onerror = () => {
      i++;
      if (i < list.length) {
        tryLoad();
      } else {
        console.warn('Image not loaded:', list);
        resolve(img);
      }
    };

    tryLoad();
  });

  return img;
}

// ── DEFAULT LEVEL 1 IMAGES ─────────────────────────────
// These are used whenever the active level does not provide custom paths.
const DEFAULT_LEVEL_IMAGES = {
  horizon: [
    'assets/backgrounds/Horizons.jpg',
    'assets/Horizons.jpg',
    'Horizons.jpg',
  ],

  segments: [
    'assets/level/level1/LocationESegments.jpg',
    'assets/LocationESegments.jpg',
    'LocationESegments.jpg',
  ],

  scenery: [
    'assets/level/level1/LocationEScenery.png',
    'assets/LocationEScenery.png',
    'LocationEScenery.png',
  ],

  jumps: [
    'assets/level/level1/jumps.png',
    'assets/level/level2/jumps.png',
    'assets/scenery/jumps.png',
    'assets/jumps.png',
    'jumps.png',
  ],

  puzzleSymbols: [
    'assets/level/level3/puzzle_sequence.png',
  ],

  // ── LEVEL 1 — Ghost Start monster spritesheet (2×3, 512×512) ──
monsters: [
  'assets/monster/gorila.jpeg',
  'assets/gorila.jpeg',
  'gorila.jpeg',
],
};

export const IMG = {
  horizon: loadImage(DEFAULT_LEVEL_IMAGES.horizon),
  segments: loadImage(DEFAULT_LEVEL_IMAGES.segments),
  scenery: loadImage(DEFAULT_LEVEL_IMAGES.scenery),
  jumps: loadImage(DEFAULT_LEVEL_IMAGES.jumps),
  puzzleSymbols: loadImage(DEFAULT_LEVEL_IMAGES.puzzleSymbols),

  // Monster spritesheet used by visuals/monsterRender.js.
  monsters: loadImage(DEFAULT_LEVEL_IMAGES.monsters),

  effects: loadImage([
    'assets/player/Effects.png',
    'assets/Effects.png',
    'Effects.png',
  ]),
};

export async function setLevelImages(levelMeta) {
  const waits = [];

  // IMPORTANT:
  // Always reset to Level 1 defaults when a level does not provide
  // its own image paths. This fixes Level2 → Level1 wrong atlas issue.
  const segmentsSrc = levelMeta?.segmentsImage || DEFAULT_LEVEL_IMAGES.segments;
  const scenerySrc = levelMeta?.sceneryImage || DEFAULT_LEVEL_IMAGES.scenery;
  const jumpsSrc = levelMeta?.jumpsImage || DEFAULT_LEVEL_IMAGES.jumps;
  const monstersSrc = levelMeta?.monstersImage || DEFAULT_LEVEL_IMAGES.monsters;

  const puzzleSymbolsSrc = levelMeta?.puzzleSymbolsImage || DEFAULT_LEVEL_IMAGES.puzzleSymbols;
  IMG.puzzleSymbols = loadImage(puzzleSymbolsSrc);
  waits.push(IMG.puzzleSymbols.promise);

  IMG.segments = loadImage(segmentsSrc);
  IMG.scenery = loadImage(scenerySrc);
  IMG.jumps = loadImage(jumpsSrc);
  IMG.monsters = loadImage(monstersSrc);

  waits.push(IMG.segments.promise);
  waits.push(IMG.scenery.promise);
  waits.push(IMG.jumps.promise);
  waits.push(IMG.monsters.promise);

  return Promise.all(waits);
}