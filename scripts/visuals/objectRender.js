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

// Put these files in your assets folders:
// assets/backgrounds/Horizons1.jpg
// assets/backgrounds/ground.png       (or assets/road/ground-sheet0.webp)
// assets/road/LocationEScenery.png
export const IMG = {
  horizon: loadImage(['assets/backgrounds/Horizons1.jpg','assets/Horizons1.jpg','Horizons1.jpg']),
  ground:  loadImage(['assets/backgrounds/ground.png','assets/road/ground-sheet0.webp','assets/ground.png','ground.png']),
  scenery: loadImage(['assets/road/LocationEScenery.png','assets/LocationEScenery.png','LocationEScenery.png']),
};

export function drawParts(ctx) {
  for (const p of parts) {
    ctx.save();
    ctx.globalAlpha = p.life * .9;
    if (p.t === 's') {
      ctx.fillStyle = p.life>.6 ? '#ffdd44' : p.life>.3 ? '#ff8800' : '#ff3300';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r*p.life, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle = `rgba(180,155,110,${p.life*.45})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
}
