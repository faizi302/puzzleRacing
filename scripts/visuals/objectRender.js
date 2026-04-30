// ═══════════════════════════════════════════════════════
// OBJECT RENDER — Image loader (effects + scenery + horizon)
// ═══════════════════════════════════════════════════════
function loadImage(src) {
  const img  = new Image();
  img.ready  = false;
  const list = Array.isArray(src) ? src : [src];
  let i = 0;
  const tryLoad = () => { img.src = list[i]; };
  img.onload  = () => { img.ready = true; };
  img.onerror = () => { i++; if (i < list.length) tryLoad(); else console.warn('Image not loaded:', list); };
  tryLoad();
  return img;
}

export const IMG = {
  horizon: loadImage([
    'assets/backgrounds/Horizons.jpg',
    'assets/Horizons.jpg',
    'Horizons.jpg',
  ]),
  segments: loadImage([
    'assets/road/LocationESegments.png',
    'assets/road/LocationESegments.jpg',
    'assets/LocationESegments.png',
    'assets/LocationESegments.jpg',
    'LocationESegments.png',
    'LocationESegments.jpg',
  ]),
  scenery: loadImage([
    'assets/road/LocationEScenery.png',
    'assets/LocationEScenery.png',
    'LocationEScenery.png',
  ]),
  effects: loadImage([
    'assets/player/Effects.png',
    'assets/effects/Effects.png',
    'assets/Effects.png',
    'Effects.png',
  ]),
};