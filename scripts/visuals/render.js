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

const _shake = { x: 0, y: 0 };

function computeShake(now) {
  if (P.cameraShakeTime <= 0 || P.cameraShake <= 0) {
    _shake.x = 0;
    _shake.y = 0;
    return _shake;
  }
  const t = now * 0.055;
  const amp = P.cameraShake * 3;
  _shake.x = Math.sin(t * 1.7) * amp + Math.sin(t * 0.7) * amp * 0.35;
  _shake.y = Math.cos(t * 1.3) * amp * 0.55;
  return _shake;
}

export function renderFrame(steerVisual) {
  const ctx = getCtx();
  const W = getW();
  const H = getH();
  if (!W || !H) return;

  const now = performance.now();
  ctx.clearRect(0, 0, W, H);

  drawBG(steerVisual);

  const s = computeShake(now);
  ctx.save();
  ctx.translate(s.x, s.y);

  if (P.cameraTurning) {
    const t = Math.sin((P.cameraFlip || 0) * Math.PI);
    ctx.translate(Math.sin(now * 0.01) * 10 * t, 0);
  }

  // World layers — order matters
  drawRoad();
  drawCheckpoints(ctx, sceneryObjs);
  drawScenery();
  drawOpponents();
  drawMonsters();
  drawParts(ctx);
  drawCar(steerVisual);

  ctx.restore();

  // Collision white flash
  if (P.impactFlash > 0.01) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.12, P.impactFlash * 0.10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  drawNitroSpeedLines(ctx, W, H);
  drawFadeOverlay();
}