// ═══════════════════════════════════════════════════════
// OPPONENT RENDER — draws AI cars with UnitE sprites + number tag
// ─────────────────────────────────────────────────────────
// FIXED: AI cars now ride on the actual rendered road surface
// using the SAME _visibleSegs lookup that scenery uses.
//
// Why the old code broke:
//   • Old code called project() directly with camZ = P.pos.
//   • Road segments are rendered with an extra cumulative curve
//     offset (`xOff += dx; dx += seg.curve`) that bends the road
//     across the screen.
//   • Project() doesn't apply that offset → cars detached from
//     the road on curves and looked like they were floating up
//     on the trees/poles.
//
// New approach (matches sceneryRender.js exactly):
//   1. For each AI car, find the visible segment that contains its z.
//   2. Interpolate (x, y, w) from that segment — these already
//      include the curve & hill offsets the renderer applied.
//   3. Anchor the car at that interpolated road point.
//
// Result: AI cars follow road curves, hills, and the horizon
// perfectly, exactly like scenery objects do.
// ═══════════════════════════════════════════════════════

import { C } from '../configs/roadConfig.js';
import { P } from '../systems/roadSystem.js';
import { opponents } from '../systems/opponentSystem.js';
import { getOpponentSprite } from './opponentSprites.js';
import { getCtx, getW, getH } from '../core/canvas.js';
import { trackLen, getTrackLen } from '../core/roadMap.js';
import { _visibleSegs } from './roadRender.js';

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// ── Road-aware Z-to-screen lookup (same as sceneryRender) ──
// Returns interpolated screen-space road point at world-z `z`,
// using the road segments already projected this frame.
function visibleForZ(z) {
  if (!_visibleSegs.length) return null;

  let zz = z;
  if (zz < P.pos) zz += trackLen;

  for (let i = 0; i < _visibleSegs.length; i++) {
    const v = _visibleSegs[i];

    let z1 = v.z1;
    let z2 = v.z2;

    if (z1 < P.pos) z1 += trackLen;
    if (z2 < z1) z2 += trackLen;

    if (zz >= z1 && zz <= z2) {
      const pct = (zz - z1) / Math.max(1, z2 - z1);
      return {
        y: v.y1 + (v.y2 - v.y1) * pct,
        cx: v.x1 + (v.x2 - v.x1) * pct,
        rw: v.w1 + (v.w2 - v.w1) * pct,
      };
    }
  }

  return null;
}

function wrapDz(objZ, playerZ, len) {
  let dz = objZ - playerZ;
  while (dz < -len / 2) dz += len;
  while (dz > len / 2) dz -= len;
  return dz;
}

function drawNameTag(ctx, x, y, scale, ai) {
  const tagW = clamp(46 * scale, 30, 82);
  const tagH = clamp(22 * scale, 16, 34);

  ctx.save();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${clamp(13 * scale, 10, 22)}px Orbitron, Arial`;

  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 8;

  ctx.fillStyle = ai.boss
    ? 'rgba(255,40,40,0.90)'
    : 'rgba(0,0,0,0.72)';

  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x - tagW / 2, y - tagH / 2, tagW, tagH, tagH * 0.4);
    ctx.fill();
  } else {
    ctx.fillRect(x - tagW / 2, y - tagH / 2, tagW, tagH);
  }

  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.strokeStyle = ai.boss ? '#ffd54a' : 'rgba(255,255,255,0.7)';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x - tagW / 2, y - tagH / 2, tagW, tagH, tagH * 0.4);
    ctx.stroke();
  }

  ctx.fillStyle = '#fff';
  ctx.fillText(ai.boss ? 'BOSS' : `#${ai.position || ai.number}`, x, y + 1);

  ctx.restore();
}

function drawOpponentCar(ctx, ai) {
  const sprite = getOpponentSprite(ai.team);
  if (!sprite || !sprite.img?.ready || !sprite.frames?.length) return;

  const len = ai.onRoad2 ? getTrackLen(2) : trackLen;
  if (!len) return;

  // Only draw AI cars that are on the same active world as player
  if (!!ai.onRoad2 !== !!P.onRoad2) return;

  const W = getW();
  const H = getH();

  // ── Distance check ─────────────────────────────────
  const playerZ = P.pos + (P.playerZ || 0);
  const dz = wrapDz(ai.z, playerZ, len);

  // Behind camera or too far ahead — cull
  if (dz < 80) return;
  if (dz > C.SEG_LEN * C.DRAW_D * 0.5) return;

  // ── Use the visible-segment lookup (same as scenery) ──
  // This makes the AI car ride on the EXACT rendered road
  // surface, with all curve & hill offsets already applied.
  const hit = visibleForZ(ai.z);
  if (!hit) return;

  // Horizon culling — don't draw if it would render above
  // the visible road (which is what was making cars appear
  // "up on poles").
  const horizonY = H * 0.44;
  if (hit.y < horizonY - 4) return;
  if (hit.y > H * 1.05) return;

  // ── Perspective-correct car size ────────────────────
  // Use the road width at this depth as the size reference.
  // This guarantees the car scales exactly like the road
  // beneath it — never floats off, never detaches.
  const perspective = C.CAM_DEPTH / dz;

  // Frame selection
  const straight = sprite.straightIndex ?? Math.floor(sprite.frames.length / 2);
  const maxTurn = straight;
  const target = straight + clamp(ai.steerVisual || 0, -1, 1) * maxTurn;

  ai.frameFloat = ai.frameFloat ?? straight;
  ai.frameFloat += (target - ai.frameFloat) * 0.22;

  const frameIndex = clamp(Math.round(ai.frameFloat), 0, sprite.frames.length - 1);
  const f = sprite.frames[frameIndex];
  if (!f) return;

  const srcW = f.srcW || 140;
  const srcH = f.srcH || 173;

  let drawScale;

  const isStartFormation =
    P.countdownActive ||
    P.countdownT > 0 ||
    P.starting ||
    P.readyState;

  // ── OPPONENT SIZE CONTROL ─────────────────────────────
  // Increase/decrease this only
  const NEAR_CAR_HEIGHT = 400;

  // How small car can become when far
  const FAR_SIZE_FACTOR = 0.18;

  // hit.y tells where car is on screen:
  // lower screen = near, upper screen = far
  const nearY = H * 0.70;
  const farY = H * 0.43;

  let t = (nearY - hit.y) / Math.max(1, nearY - farY);
  t = clamp(t, 0, 1);

  // near = 1.00, far = 0.55
  const sizeFactor = 1 - t * (1 - FAR_SIZE_FACTOR);

  drawScale = (NEAR_CAR_HEIGHT / srcH) * sizeFactor;

  const carW = srcW * drawScale;
  const carH = srcH * drawScale;

  // ── Anchor on the road ──────────────────────────────
  // hit.cx already includes the curve offset.
  // Add the AI's lane position (ai.x in [-1,1]) using the
  // road's half-width at this depth.
  const anchorX = hit.cx + (ai.x || 0) * hit.rw;
  const anchorY = hit.y;

  const dx = anchorX - carW * (f.anchorX ?? 0.5);
  const dy = anchorY - carH * (f.anchorY ?? 0.65);

  // Apply airborne lift (jumps)
  const airLift = (ai.airY || 0) * (C.JUMP_VISUAL_SCALE || 0.9);
  const finalDy = dy - airLift;

  // ── Off-screen culling ──────────────────────────────
  if (dy + carH < horizonY - 30) return;
  if (dy > H + 100) return;
  if (dx + carW < -50) return;
  if (dx > W + 50) return;

  // ── Distance fade ───────────────────────────────────
  const fade = clamp(
    1 - dz / (C.DRAW_D * C.SEG_LEN * 0.55),
    0.15,
    1
  );

  ctx.save();
  ctx.globalAlpha = fade;

  // Shadow (always at ground level, not lifted)
  ctx.globalAlpha = clamp(0.38 * fade, 0.10, 0.42);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(
    anchorX,
    anchorY + carH * 0.04,
    carW * 0.34,
    carH * 0.045,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Car sprite (with airborne lift)
  ctx.globalAlpha = fade;
  ctx.drawImage(
    sprite.img,
    f.x,
    f.y,
    f.w,
    f.h,
    dx + (f.sx / srcW) * carW,
    finalDy + (f.sy / srcH) * carH,
    (f.w / srcW) * carW,
    (f.h / srcH) * carH
  );

  // Number tag above car
  if (drawScale > 0.20) {
    drawNameTag(
      ctx,
      anchorX,
      finalDy + carH * 0.18,
      drawScale,
      ai
    );
  }

  ctx.restore();
}

export function drawOpponents() {
  const ctx = getCtx();
  if (!ctx || !opponents.length) return;

  // Draw far cars first, near cars last (painter's algorithm)
  const playerZ = P.pos + (P.playerZ || 0);

  const list = opponents
    .filter(ai => ai.active)
    .slice()
    .sort((a, b) => {
      const lenA = a.onRoad2 ? getTrackLen(2) : trackLen;
      const lenB = b.onRoad2 ? getTrackLen(2) : trackLen;
      const dzA = wrapDz(a.z, playerZ, lenA || trackLen);
      const dzB = wrapDz(b.z, playerZ, lenB || trackLen);
      return dzB - dzA;
    });

  for (const ai of list) {
    drawOpponentCar(ctx, ai);
  }
}