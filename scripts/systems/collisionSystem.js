// ═══════════════════════════════════════════════════════
// COLLISION SYSTEM — Particles, Dust, Crash FX
//
// Uses Effects.png sprite atlas for realistic dust clouds.
//
// DUST SYSTEM (Boost frames used as smoke/dust puffs):
//   • Spawns behind each rear tyre when car is moving
//   • Larger + more opaque when braking (Skid mark style)
//   • Uses Boost_00–Boost_15 from Effects.png (white smoke puffs)
//
// CRASH SPARKS:
//   • Canvas-drawn sparks on wall hit (no sprite needed)
//
// PHYSICS TERMS IMPLEMENTED:
//   • Trigger Collision   — coin/pickup zone
//   • Crash FX            — spark particles on wall impact
//   • Off-Road Friction   — handled in roadSystem
//   • Velocity-Based Collision Response — speed scaled knockback
// ═══════════════════════════════════════════════════════

// ── Effects spritesheet ─────────────────────────────────
const _fx = new Image();
_fx.ready  = false;
_fx.onload = () => { _fx.ready = true; };
_fx.onerror= () => { console.warn('[collisionSystem] Effects.png not found'); };
_fx.src    = 'assets/Effects.png';

// ── Boost frames from Effects.json (dust/smoke puffs) ──
// 16 frames, each ~120×120 in a 128×128 sourceSize
const BOOST_FRAMES = [
  { x:1139, y:1340, w:117, h:116, sx: 6, sy: 6 }, // 00
  { x:1925, y: 128, w:122, h:122, sx: 3, sy: 3 }, // 01
  { x:1925, y: 502, w:121, h:121, sx: 4, sy: 3 }, // 02
  { x: 789, y:1171, w:121, h:120, sx: 4, sy: 4 }, // 03
  { x:   1, y:1330, w:119, h:120, sx: 5, sy: 4 }, // 04
  { x: 779, y:1292, w:118, h:121, sx: 5, sy: 5 }, // 05
  { x: 121, y:1438, w:115, h:122, sx: 7, sy: 6 }, // 06
  { x:   1, y:1451, w:113, h:121, sx: 8, sy: 7 }, // 07
  { x: 329, y:1393, w:119, h:118, sx: 5, sy:10 }, // 08
  { x:1147, y:1460, w:125, h:103, sx: 2, sy:10 }, // 09
  { x:1141, y:1565, w:128, h: 98, sx: 0, sy:11 }, // 10
  { x:1402, y:1529, w:128, h: 99, sx: 0, sy:11 }, // 11
  { x:1273, y:1529, w:128, h:100, sx: 0, sy:10 }, // 12
  { x: 883, y:1478, w:128, h:101, sx: 0, sy:10 }, // 13
  { x:1012, y:1565, w:128, h: 99, sx: 0, sy:11 }, // 14
  { x:1531, y:1556, w:128, h: 97, sx: 0, sy:10 }, // 15
];
const BOOST_SRC = 128; // sourceSize (square)
const BOOST_LEN = BOOST_FRAMES.length;

// ── Particle pool ───────────────────────────────────────
export let parts = [];

export function resetParts() {
  parts = [];
}

// ── Spawn a sprite-based dust puff ─────────────────────
// x, y      : world-screen position (canvas pixels)
// isBrake   : braking = bigger, more opaque puff
export function spawnDust(x, y, isBrake = false) {
  if (Math.random() > (isBrake ? 0.85 : 0.55)) return;

  const size  = isBrake
    ? 55 + Math.random() * 40   // big brake dust
    : 28 + Math.random() * 28;  // normal rolling dust

  parts.push({
    type  : 'dust',
    x     : x + (Math.random() - 0.5) * 14,
    y,
    vx    : (Math.random() - 0.5) * 0.8,
    vy    : -0.6 - Math.random() * 0.9,
    size,
    life  : 1.0,
    decay : (isBrake ? 0.022 : 0.030) + Math.random() * 0.012,
    frame : Math.floor(Math.random() * BOOST_LEN),   // random start frame
    frameT: 0,
    fps   : 18,   // animation fps
  });
}

// ── Spawn canvas-drawn crash sparks (wall hit) ─────────
export function spawnCrash(x, y) {
  for (let i = 0; i < 22; i++) {
    const a  = Math.random() * Math.PI * 2;
    const sp = 1.8 + Math.random() * 4.5;
    parts.push({
      type : 'spark',
      x, y,
      vx   : Math.cos(a) * sp,
      vy   : Math.sin(a) * sp - 1.8,
      life : 1.0,
      decay: 0.038 + Math.random() * 0.042,
      r    : 2.5 + Math.random() * 3.5,
    });
  }
}

// ── Tick (physics step) ─────────────────────────────────
export function tickParts(dt) {
  const inv = 1 / 60;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.x    += p.vx;
    p.y    += p.vy;
    p.vy   += 0.10;            // gravity
    p.life -= p.decay;

    if (p.type === 'dust') {
      p.frameT += dt;
      if (p.frameT >= 1 / p.fps) {
        p.frameT -= 1 / p.fps;
        p.frame   = (p.frame + 1) % BOOST_LEN;
      }
      // Dust floats up and fades — slow horizontal drift to a stop
      p.vx *= 0.96;
    } else {
      // Sparks: gravity-pulled
      p.vy += 0.08;
    }

    if (p.life <= 0) parts.splice(i, 1);
  }
}

// ── Draw all particles ──────────────────────────────────
export function drawParts(ctx) {
  for (const p of parts) {
    ctx.save();

    if (p.type === 'dust' && _fx.ready) {
      // ── Sprite dust puff ───────────────────────────────
      const f    = BOOST_FRAMES[p.frame];
      const size = p.size * p.life * 1.6 + p.size * 0.4; // grows then fades
      const half = size / 2;

      ctx.globalAlpha = Math.min(0.72, p.life * 1.1);
      ctx.drawImage(
        _fx,
        f.x, f.y, f.w, f.h,
        p.x - half, p.y - half, size, size
      );

    } else if (p.type === 'dust') {
      // ── Fallback dust (no sheet loaded) ───────────────
      ctx.globalAlpha = p.life * 0.5;
      ctx.fillStyle   = `rgba(200,185,160,1)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life * 0.5, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // ── Canvas sparks ─────────────────────────────────
      ctx.globalAlpha = p.life * 0.95;
      ctx.fillStyle   = p.life > 0.6 ? '#ffdd44' : p.life > 0.3 ? '#ff8800' : '#ff3300';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}