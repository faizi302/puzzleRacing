// ═══════════════════════════════════════════════════════
// OBJECT RENDER — Image loader & particle renderer
// ═══════════════════════════════════════════════════════
import { parts } from '../systems/collisionSystem.js';

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

// Asset paths to drop in your project:
//   assets/backgrounds/Horizons.jpg     <-- atlas, HorizonE frame is used
//   assets/road/LocationESegments.png   <-- road texture atlas
//   assets/road/LocationEScenery.png    <-- scenery atlas (unchanged)
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
};

export function drawParts(ctx) {
  for (const p of parts) {
    ctx.save();
    ctx.globalAlpha = p.life * .9;
    if (p.t === 's') {
      ctx.fillStyle = p.life > .6 ? '#ffdd44' : p.life > .3 ? '#ff8800' : '#ff3300';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = `rgba(180,155,110,${p.life * .45})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}