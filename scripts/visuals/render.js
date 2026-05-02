// ═══════════════════════════════════════════════════════
// RENDER — Frame orchestrator + collision camera shake
// ═══════════════════════════════════════════════════════
import { getCtx, getW, getH }     from '../core/canvas.js';
import { drawBG }                 from './BackgroundRender.js';
import { drawRoad }               from './roadRender.js';
import { drawScenery }            from './sceneryRender.js';
import { drawCar }                from '../player/player.js';
import { drawParts }              from '../systems/collisionSystem.js';
import { drawFadeOverlay }        from '../player/playerAnimation.js';
import { P }                      from '../systems/roadSystem.js';

function getShakeOffset() {
  if (P.cameraShakeTime <= 0 || P.cameraShake <= 0) return { x:0, y:0 };
  const t = performance.now() * 0.055;
  const amp = P.cameraShake * 3;
  return {
    x: Math.sin(t * 1.7) * amp + Math.sin(t * 0.7) * amp * 0.35,
    y: Math.cos(t * 1.3) * amp * 0.55,
  };
}

export function renderFrame(steerVisual) {
  const ctx = getCtx();
  const W   = getW();
  const H   = getH();
  if (!W || !H) return;

  ctx.clearRect(0, 0, W, H);

  drawBG(steerVisual);

  const s = getShakeOffset();
  ctx.save();
  ctx.translate(s.x, s.y);
  drawRoad();
  drawScenery();
  drawParts(ctx);
  drawCar(steerVisual);
  ctx.restore();

  if (P.impactFlash > 0.01) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.12, P.impactFlash * 0.10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  drawFadeOverlay();
}
