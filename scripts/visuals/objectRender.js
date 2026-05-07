// ═══════════════════════════════════════════════════════
// OBJECT RENDER — Image loader (effects + scenery + horizon)
// ═══════════════════════════════════════════════════════
export function loadImage(src) {
  const img = new Image();
  img.ready = false;

  const list = Array.isArray(src) ? src : [src];
  let i = 0;

  img.promise = new Promise((resolve) => {
    const tryLoad = () => {
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

export const IMG = {
  horizon: loadImage([
    'assets/backgrounds/Horizons.jpg',
    'assets/Horizons.jpg',
    'Horizons.jpg',
  ]),

  segments: loadImage([
    'assets/level/level1/LocationESegments.jpg',
    'assets/LocationESegments.jpg',
    'LocationESegments.jpg',
  ]),

  scenery: loadImage([
    'assets/level/level1/LocationEScenery.png',
    'assets/LocationEScenery.png',
    'LocationEScenery.png',
  ]),

  // ── Jumps atlas — try several locations so it works no matter
  //    where you put jumps.png in the project.
  jumps: loadImage([
    'assets/level/level1/jumps.png',
    'assets/level/level2/jumps.png',
    'assets/scenery/jumps.png',
    'assets/jumps.png',
    'jumps.png',
  ]),

  effects: loadImage([
    'assets/player/Effects.png',
    'assets/Effects.png',
    'Effects.png'
  ]),
};

export function setLevelImages(levelMeta) {
  const waits = [];

  if (levelMeta?.segmentsImage) {
    IMG.segments = loadImage(levelMeta.segmentsImage);
    waits.push(IMG.segments.promise);
  }

  if (levelMeta?.sceneryImage) {
    IMG.scenery = loadImage(levelMeta.sceneryImage);
    waits.push(IMG.scenery.promise);
  }

  if (levelMeta?.jumpsImage) {
    IMG.jumps = loadImage(levelMeta.jumpsImage);
    waits.push(IMG.jumps.promise);
  }

  return Promise.all(waits);
}