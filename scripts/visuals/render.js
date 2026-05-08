// ═══════════════════════════════════════════════════════
// RENDER — Frame orchestrator
// Added: Opponent Cars Rendering Layer
// ═══════════════════════════════════════════════════════

import { getCtx, getW, getH } from '../core/canvas.js';
import { drawBG } from './BackgroundRender.js';
import { drawRoad } from './roadRender.js';
import { drawScenery } from './sceneryRender.js';
import { drawCar } from '../player/player.js';
import { drawParts } from '../systems/collisionSystem.js';
import { drawFadeOverlay } from '../player/playerAnimation.js';
import { drawOpponents } from './opponentRender.js'; // NEW
import { P } from '../systems/roadSystem.js';

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

  // Clear screen
  ctx.clearRect(0, 0, W, H);

  // Background / horizon
  drawBG(steerVisual);

  // Camera shake
  const s = getShakeOffset();

  ctx.save();
  ctx.translate(s.x, s.y);

  // During reverse-camera turning animation
  if (P.cameraTurning) {
    const t = Math.sin((P.cameraFlip || 0) * Math.PI);

    ctx.translate(
      Math.sin(performance.now() * 0.01) * 10 * t,
      0
    );
  }

  // ─────────────────────────────────────────
  // WORLD RENDER ORDER (VERY IMPORTANT)
  // ─────────────────────────────────────────

  // 1. Road base
  drawRoad();

  // 2. World scenery / trees / arches / objects
  drawScenery();

  // 3. Opponent AI Cars (NEW)
  drawOpponents();

  // 4. Collision particles / sparks / impacts
  drawParts(ctx);

  // 5. Player Car (always last)
  drawCar(steerVisual);

  ctx.restore();

  // White flash on collision
  if (P.impactFlash > 0.01) {
    ctx.save();

    ctx.globalAlpha = Math.min(
      0.12,
      P.impactFlash * 0.10
    );

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }

  // Fade overlay / intro / outro
  drawFadeOverlay();
}