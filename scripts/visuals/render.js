// ═══════════════════════════════════════════════════════
// RENDER — Frame orchestrator
// ═══════════════════════════════════════════════════════
import { getCtx, getW, getH } from '../systems/projectionSystem.js';
import { drawBG }       from './BackgroundRender.js';
import { drawRoad }     from './roadRender.js';
import { drawScenery }  from './sceneryRender.js';
import { drawCar }      from '../player/player.js';
import { drawParts }    from './objectRender.js';

// steerVisual: float -1…+1 combining input steering + road curve lean
export function renderFrame(steerVisual) {
  const W = getW(), H = getH(), ctx = getCtx();
  if (!W || !H) return;
  ctx.clearRect(0, 0, W, H);
  drawBG(steerVisual);
  drawRoad();
  drawScenery();
  drawCar(steerVisual);   // pass steer to sprite selector
  drawParts(ctx);
}
