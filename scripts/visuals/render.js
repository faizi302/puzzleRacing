// ═══════════════════════════════════════════════════════
// RENDER — Frame orchestrator
// Added: Opponent Cars Rendering Layer + MONSTER Rendering Layer
// ═══════════════════════════════════════════════════════

import { getCtx, getW, getH } from '../core/canvas.js';
import { drawBG } from './BackgroundRender.js';
import { drawRoad } from './roadRender.js';
import { drawScenery, sceneryObjs } from './sceneryRender.js';
import { drawCar, drawNitroSpeedLines } from '../player/player.js';
import { drawParts } from '../systems/collisionSystem.js';
import { drawFadeOverlay } from '../player/playerAnimation.js';
import { drawOpponents } from './opponentRender.js';
import { drawMonsters } from './monsterRender.js';
import { P } from '../systems/roadSystem.js';
import { drawCheckpoints } from '../levels/level2/checkpointRender.js';

function getShakeOffset() {
  if (P.cameraShakeTime <= 0 || P.cameraShake <= 0) {
    return { x: 0, y: 0 };
  }

  const t = performance.now() * 0.055;
  const amp = P.cameraShake * 3;

  return {
    x:
      Math.sin(t * 1.7) * amp +
      Math.sin(t * 0.7) * amp * 0.35,

    y:
      Math.cos(t * 1.3) * amp * 0.55,
  };
}

export function renderFrame(steerVisual) {
  const ctx = getCtx();
  const W = getW();
  const H = getH();

  if (!W || !H) return;

  ctx.clearRect(0, 0, W, H);

  // 1. Background / horizon
  drawBG(steerVisual);

  const s = getShakeOffset();

  ctx.save();
  ctx.translate(s.x, s.y);

  // Reverse-camera turning shake
  if (P.cameraTurning) {
    const t = Math.sin((P.cameraFlip || 0) * Math.PI);

    ctx.translate(
      Math.sin(performance.now() * 0.01) * 10 * t,
      0
    );
  }

  // ─────────────────────────────────────────
  // WORLD RENDER ORDER
  // ─────────────────────────────────────────

  // 2. Road base
  drawRoad();

  // 3. Level 2 checkpoint arrows / marks
  drawCheckpoints(ctx, sceneryObjs);

  // 4. World scenery / trees / arches / puzzle objects
  drawScenery();

  // 5. Opponent AI cars
  drawOpponents();

  // 6. Level 1 monsters
  drawMonsters();

  // 7. Collision particles / sparks / impacts
  drawParts(ctx);

  // 8. Player car always last
  drawCar(steerVisual);

  ctx.restore();

  // Collision white flash
// Collision white flash
  if (P.impactFlash > 0.01) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.12, P.impactFlash * 0.10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // 9. Fullscreen nitro speed-lines (over world, under fade/HUD)
  drawNitroSpeedLines(ctx, W, H);

  // Fade overlay / intro / outro
  drawFadeOverlay();
}