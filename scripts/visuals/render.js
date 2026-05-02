// ═══════════════════════════════════════════════════════
// RENDER — Frame orchestrator + reverse puzzle guidance card
// ═══════════════════════════════════════════════════════
import { getCtx, getW, getH } from '../core/canvas.js';
import { drawBG } from './BackgroundRender.js';
import { drawRoad } from './roadRender.js';
import { drawScenery } from './sceneryRender.js';
import { drawCar } from '../player/player.js';
import { drawParts } from '../systems/collisionSystem.js';
import { drawFadeOverlay } from '../player/playerAnimation.js';
import { P } from '../systems/roadSystem.js';
import { C } from '../configs/roadConfig.js';

function getShakeOffset() {
  if (P.cameraShakeTime <= 0 || P.cameraShake <= 0) return { x: 0, y: 0 };

  const t = performance.now() * 0.055;
  const amp = P.cameraShake * 3;

  return {
    x: Math.sin(t * 1.7) * amp + Math.sin(t * 0.7) * amp * 0.35,
    y: Math.cos(t * 1.3) * amp * 0.55,
  };
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawReversePuzzleCard() {
  const ctx = getCtx();
  const W = getW();
  const H = getH();

  if (P.secretUnlocked && !P.cameraTurning) return;

  const need = C.REVERSE_SECRET_DISTANCE || 2200;
  const dist = Math.min(need, P.reverseDistance || 0);
  const progress = Math.max(0, Math.min(1, dist / need));

  let title = 'THE FINISH IS A TRAP';
  let sub = 'Drive forward first, then discover the hidden clue.';
  let alpha = 0.72;

  if (progress > 0.03 && progress < 1) {
    title = 'KEEP REVERSING';
    sub = `Secret road signal: ${Math.floor(progress * 100)}%`;
    alpha = 0.92;
  }

  if (P.cameraTurning) {
    title = 'CAMERA ROTATING 180°';
    sub = 'The road behind you is becoming the road ahead.';
    alpha = 1;
  }

  const t = performance.now() * 0.003;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.0);

  const cardW = Math.min(W * 0.78, 620);
  const cardH = 92;
  const x = (W - cardW) / 2;
  const y = H * 0.075;

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;

  const g = ctx.createLinearGradient(x, y, x + cardW, y + cardH);
  g.addColorStop(0, 'rgba(8,18,38,0.88)');
  g.addColorStop(0.55, 'rgba(18,38,78,0.86)');
  g.addColorStop(1, 'rgba(52,32,92,0.84)');

  ctx.fillStyle = g;
  roundRect(ctx, x, y, cardW, cardH, 22);
  ctx.fill();

  ctx.shadowBlur = 0;

  ctx.strokeStyle = `rgba(255,220,90,${0.25 + pulse * 0.35})`;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, cardW, cardH, 22);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.max(18, W * 0.022)}px system-ui, Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, W / 2, y + 30);

  ctx.fillStyle = 'rgba(230,240,255,0.90)';
  ctx.font = `500 ${Math.max(13, W * 0.015)}px system-ui, Arial`;
  ctx.fillText(sub, W / 2, y + 58);

  // progress bar
  const barW = cardW * 0.72;
  const barH = 7;
  const bx = W / 2 - barW / 2;
  const by = y + cardH - 18;

  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, bx, by, barW, barH, 99);
  ctx.fill();

  ctx.fillStyle = P.cameraTurning
    ? 'rgba(255,220,80,0.95)'
    : 'rgba(100,220,255,0.90)';

  roundRect(ctx, bx, by, barW * (P.cameraTurning ? P.cameraFlip : progress), barH, 99);
  ctx.fill();

  ctx.restore();
}

export function renderFrame(steerVisual) {
  const ctx = getCtx();
  const W = getW();
  const H = getH();
  if (!W || !H) return;

  ctx.clearRect(0, 0, W, H);

  drawBG(steerVisual);

  const s = getShakeOffset();

  ctx.save();
  ctx.translate(s.x, s.y);

  // During camera rotation, add a small horizontal swing.
  if (P.cameraTurning) {
    const t = Math.sin((P.cameraFlip || 0) * Math.PI);
    ctx.translate(Math.sin(performance.now() * 0.01) * 10 * t, 0);
  }

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

  drawReversePuzzleCard();
  drawFadeOverlay();
}