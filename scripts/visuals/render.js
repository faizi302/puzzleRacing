// ═══════════════════════════════════════════════════════
// RENDER — Frame orchestrator
// ═══════════════════════════════════════════════════════
import { getCtx, getW, getH }     from '../core/canvas.js';
import { drawBG }                 from './BackgroundRender.js';
import { drawRoad }               from './roadRender.js';
import { drawScenery }            from './sceneryRender.js';
import { drawCar }                from '../player/player.js';
import { drawParts }              from '../systems/collisionSystem.js';
import { drawFadeOverlay }        from '../player/playerAnimation.js';

export function renderFrame(steerVisual) {
  const ctx = getCtx();
  const W   = getW();
  const H   = getH();
  if (!W || !H) return;

  ctx.clearRect(0, 0, W, H);

  drawBG(steerVisual);
  drawRoad();
  drawScenery();
  drawParts(ctx);
  drawCar(steerVisual);
  drawFadeOverlay();   // intro/outro fade — drawn LAST, on top of everything
}