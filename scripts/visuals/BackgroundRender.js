// ═══════════════════════════════════════════════════════
// BACKGROUND RENDER — Sky, horizon image, ground layer
// ═══════════════════════════════════════════════════════
import { getCtx, getW, getH } from '../systems/projectionSystem.js';
import { clamp, P }           from '../systems/roadSystem.js';
import { IMG }                from './objectRender.js';

export function drawCover(ctx, img, dx, dy, dw, dh, offX=0) {
  if (!img.ready) { ctx.fillStyle='#83b66a'; ctx.fillRect(dx,dy,dw,dh); return; }
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(dh/ih, dw/iw);
  const sw = iw*scale, sh = ih*scale;
  const startX = ((offX*dw) % sw + sw) % sw - sw;
  for (let x = startX; x < dw+sw; x += sw) {
    ctx.drawImage(img, dx+x, dy+(dh-sh)*0.5, sw, sh);
  }
}

export function drawGroundLayer(steerAcc) {
  const ctx = getCtx();
  const W   = getW(), H = getH();
  const horizonY = H * 0.43;
  const h = H - horizonY;
  if (IMG.ground.ready) {
    const iw = IMG.ground.naturalWidth, ih = IMG.ground.naturalHeight;
    const scale = Math.max(W/iw, h/ih);
    const tw = iw*scale, th = ih*scale;
    const off = ((-steerAcc*W*0.10 + P.pos*0.010) % tw + tw) % tw;
    for (let x = -off-tw; x < W+tw; x += tw) {
      ctx.drawImage(IMG.ground, x, horizonY, tw, th);
    }
    const g = ctx.createLinearGradient(0, horizonY, 0, horizonY+H*.08);
    g.addColorStop(0, 'rgba(150,190,95,.45)');
    g.addColorStop(1, 'rgba(150,190,95,0)');
    ctx.fillStyle = g; ctx.fillRect(0, horizonY, W, H*.1);
  } else {
    ctx.fillStyle = '#7aad47'; ctx.fillRect(0, horizonY, W, h);
  }
}

export function drawBG(steerAcc) {
  const W   = getW(), H = getH(), ctx = getCtx();
  const skyH = H*0.43|0;
  const parallax = clamp(-steerAcc*0.28, -0.9, 0.9);
  drawCover(ctx, IMG.horizon, 0, 0, W, skyH, parallax);
  drawGroundLayer(steerAcc);
}
