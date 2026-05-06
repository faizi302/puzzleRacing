// ═══════════════════════════════════════════════════════
// OBJECT RENDER — Image loader with level-safe switching
// FIX: every level always gets its own segments/scenery.
// No old Level 2 image can remain when going back to Level 1.
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

const LEVEL1_SEGMENTS = [
  'assets/level/level1/LocationESegments.jpg',
  'assets/LocationESegments.jpg',
  'LocationESegments.jpg',
];

const LEVEL1_SCENERY = [
  'assets/level/level1/LocationEScenery.png',
  'assets/LocationEScenery.png',
  'LocationEScenery.png',
];

export const IMG = {
  horizon: loadImage([
    'assets/backgrounds/Horizons.jpg',
    'assets/Horizons.jpg',
    'Horizons.jpg',
  ]),

  segments: loadImage(LEVEL1_SEGMENTS),
  scenery: loadImage(LEVEL1_SCENERY),

  effects: loadImage([
    'assets/player/Effects.png',
    'assets/Effects.png',
    'Effects.png',
  ]),
};

let imageLoadToken = 0;
let activeLevelId = 'level1';

export function getActiveLevelImageId() {
  return activeLevelId;
}

export async function setLevelImages(levelMeta) {
  const token = ++imageLoadToken;

  activeLevelId = levelMeta?.id || levelMeta?.key || 'level1';

  // IMPORTANT:
  // If current level has no custom image paths, use Level 1 defaults.
  // This prevents Level 2 image from staying active.
  const segmentPaths = levelMeta?.segmentsImage || LEVEL1_SEGMENTS;
  const sceneryPaths = levelMeta?.sceneryImage || LEVEL1_SCENERY;

  const nextSegments = loadImage(segmentPaths);
  const nextScenery = loadImage(sceneryPaths);

  await Promise.all([
    nextSegments.promise,
    nextScenery.promise,
  ]);

  // If another level started loading meanwhile, ignore this result.
  if (token !== imageLoadToken) return false;

  IMG.segments = nextSegments;
  IMG.scenery = nextScenery;

  return true;
}