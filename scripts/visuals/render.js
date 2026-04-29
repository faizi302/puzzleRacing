// ═══════════════════════════════════════════════════════
// RENDER — Frame orchestrator
// ═══════════════════════════════════════════════════════
import { getCtx, getW, getH } from '../core/canvas.js';
import { drawBG }             from './BackgroundRender.js';
import { drawRoad }           from './roadRender.js';
import { drawScenery }        from './sceneryRender.js';
import { drawCar }            from '../player/player.js';
import { drawParts }          from '../systems/collisionSystem.js';

// steerVisual: float  -1 = full LEFT lean … 0 = straight … +1 = full RIGHT lean
// Passed to drawCar for sprite frame selection and to drawBG for parallax.
export function renderFrame(steerVisual) {
  const ctx = getCtx();
  const W   = getW();
  const H   = getH();
  if (!W || !H) return;

  ctx.clearRect(0, 0, W, H);

  // 1. Background (sky + ground with parallax)
  drawBG(steerVisual);

  // 2. Road segments + rumble strips + lane markings
  drawRoad();

  // 3. Roadside scenery (trees, arches, coins …)
  drawScenery();

  // 4. Particles — drawn BEFORE car so dust appears under it
  drawParts(ctx);

  // 5. Player car (on top of dust)
  drawCar(steerVisual);
}