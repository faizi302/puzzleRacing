// ═══════════════════════════════════════════════════════
// COLLISION SYSTEM — Sprite-based FX + scenery hit detection
//
// FX library (from Effects.png atlas):
//   • BURST  — explosion puff (used on wall/scenery impact)
//   • SKID   — tyre skid mark (under car when braking hard / handbraking)
//   • SHINE  — coin/booster pickup sparkle (Charge frames)
//
// Scenery hits:
//   • detected each frame against booster, coin, tunnel/arch, trees, rocks
//   • coin/booster → consumed (removed from active list)
//   • tunnel/arch  → bounce back via roadSystem.applyBounce()
//   • tree/rock/totem → bounce back when player drifts to that road edge
// ═══════════════════════════════════════════════════════
import { IMG }                        from '../visuals/objectRender.js';
import { P, applyBounce, activateNitro } from './roadSystem.js';
import { C }                          from '../configs/roadConfig.js';
import { trackLen }                   from '../core/roadMap.js';
import { playSfx }                    from '../core/audio.js';

// ─── Effects atlas frame data (from Effects.json) ──────
const BURST = [
  { x:1920, y: 624, w:127, h:127 }, // 00
  { x:1907, y: 752, w:128, h:128 }, // 01
  { x: 824, y: 814, w:128, h:128 }, // 02
  { x: 222, y: 935, w:127, h:127 }, // 03
  { x: 222, y:1063, w:126, h:126 }, // 04
  { x:1925, y: 251, w:122, h:122 }, // 05
  { x: 449, y:1393, w:100, h:104 }, // 06
  { x: 668, y:1376, w:107, h:112 }, // 07
  { x:1257, y:1340, w:112, h:119 }, // 08
  { x: 553, y:1376, w:114, h:124 }, // 09
  { x: 214, y:1311, w:114, h:126 }, // 10
  { x:1925, y: 374, w:117, h:127 }, // 11
  { x:1925, y:   1, w:120, h:126 }, // 12
  { x: 214, y:1190, w:122, h:120 }, // 13
  { x:1023, y:1457, w:123, h:107 }, // 14
  { x: 898, y:1370, w:124, h:107 }, // 15
];

const SKID = [
  { x:1172, y:1027, w:401, h:113 }, // 00
  { x: 411, y: 934, w:408, h:115 },
  { x: 411, y: 814, w:412, h:119 },
  { x:1194, y: 543, w:418, h:121 },
  { x:1194, y: 665, w:415, h:120 },
  { x:1187, y: 907, w:414, h:119 },
  { x:1187, y: 786, w:411, h:120 },
  { x:   1, y: 814, w:409, h:120 }, // 07
];

const CHARGE = [
  { x:1838, y: 881, w:197, h:197 }, // 00
  { x:   1, y: 935, w:220, h:196 },
  { x:1610, y: 754, w:227, h:200 },
  { x:1602, y: 955, w:225, h:201 },
  { x:1814, y:1286, w:223, h:197 },
  { x:1613, y: 543, w:220, h:210 },
  { x: 963, y: 778, w:223, h:206 },
  { x: 949, y: 985, w:222, h:203 },
  { x:1585, y:1356, w:219, h:199 },
  { x:   1, y:1132, w:212, h:197 },
  { x:1398, y:1141, w:191, h:196 }, // 10
];

// ─── Particle pool ─────────────────────────────────────
export let parts = [];
export function resetParts() { parts = []; }

// Spawn a sprite-based burst (impact explosion)
export function spawnCrash(x, y) {
  // Center burst
  parts.push({
    type:'burst', frames:BURST, frame:0, fps:32,
    x, y, vx:0, vy:-0.4, life:1.0, decay:0.038,
    size:140, growth:1.6, alpha0:0.95,
  });
  // Side puffs
  for (let i=0;i<4;i++){
    const a = Math.random()*Math.PI*2;
    parts.push({
      type:'burst', frames:BURST,
      frame: Math.floor(Math.random()*BURST.length), fps:24,
      x: x + Math.cos(a)*18, y: y + Math.sin(a)*12,
      vx: Math.cos(a)*1.6, vy: Math.sin(a)*1.6 - 0.6,
      life:1.0, decay:0.052,
      size:80 + Math.random()*40,
      growth: 1.3, alpha0:0.75,
    });
  }
}

// Skid streak when handbraking / hard braking
export function spawnSkid(x, y) {
  parts.push({
    type:'skid', frames:SKID,
    frame: Math.floor(Math.random()*SKID.length), fps:0,
    x, y, vx:0, vy:0,
    life:1.0, decay:0.018,
    size: 110, growth:1.0, alpha0:0.55,
  });
}

// Coin / booster pickup shimmer
export function spawnPickup(x, y, isBooster=false) {
  parts.push({
    type:'shine', frames:CHARGE, frame:0, fps:30,
    x, y, vx:0, vy:-0.8,
    life:1.0, decay:0.040,
    size: isBooster ? 150 : 90,
    growth: 1.6, alpha0: isBooster ? 1.0 : 0.85,
  });
}

// ─── Tick particles (called every render frame) ────────
export function tickParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.x    += p.vx;
    p.y    += p.vy;
    p.vy   += 0.12;            // gravity
    p.vx   *= 0.96;
    p.life -= p.decay;
    if (p.fps > 0) {
      p.frameT = (p.frameT || 0) + dt;
      const step = 1 / p.fps;
      while (p.frameT >= step) {
        p.frameT -= step;
        p.frame   = Math.min(p.frames.length - 1, p.frame + 1);
      }
    }
    if (p.life <= 0) parts.splice(i, 1);
  }
}

// ─── Render all particles ──────────────────────────────
export function drawParts(ctx) {
  if (!IMG.effects.ready) return;
  for (const p of parts) {
    const f = p.frames[Math.min(p.frame, p.frames.length-1)];
    if (!f) continue;
    const grow = 1 + (1 - p.life) * (p.growth - 1);
    const w    = p.size * grow;
    const h    = w * (f.h / f.w);
    const a    = Math.max(0, p.alpha0 * p.life);
    ctx.save();
    ctx.globalAlpha = a;
    if (p.type === 'shine') ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(IMG.effects, f.x, f.y, f.w, f.h,
                  p.x - w/2, p.y - h/2, w, h);
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════
// SCENERY COLLISION — checked per frame from main loop
// ═══════════════════════════════════════════════════════
// Approximate world-space radii (in normalized road-half-widths) for the
// player ↔ object overlap test. Expressed as fraction of ROAD_W.
const HIT = {
  PLAYER_RADIUS_X : 0.18,    // car half-width as fraction of road half-width
  PLAYER_Z_AHEAD  : 200,     // forward bump distance (world units)
};

// Categorise scenery objects → collision response.
//
// Earlier this function early-returned `null` for any `o.small === true`
// object, which silently disabled collision for every rock and totem in the
// game. We now route them through the same handler as trees so the player
// actually crashes into them when drifting off the road. Decorative `bridge`
// props sit at offset 3.0+ (well outside the road) and were previously
// routed through the arch-pillar branch, producing phantom hits at the road
// edge with no visible structure — they now return null.
function objCat(o) {
  // Arches are permanent obstacles — never skip them via _dead.
  if (o.overhead) return 'arch';
  if (o._dead)              return null;
  if (o.isCoin)             return 'coin';
  if (o.isBooster)          return 'booster';
  if (o.kind === 'bridge')  return null;        // far-off side decoration
  // Trees, rocks, totems → all roadside obstacles.
  return 'tree';
}

// Rough object lateral position: side(-1/0/+1) * offset * roadWidth.
// We compare to player's playerX (which is in [-1..1] of road half-width).
function objLateralX(o) {
  if (o.isCoin || o.isBooster) return o.offset || 0; // already in [-1..1]
  // trees: side*offset*~1.0+ — they sit just outside the road edge
  return (o.side || 0) * (o.offset || 1.0);
}

// Carry a callback for "object eaten / hit" so sceneryRender can react
// (e.g. fade it out or hide). We just flag o._dead = true on consumption.
export function checkSceneryCollisions(sceneryObjs, screenAnchorX, screenAnchorY) {
  if (!sceneryObjs || !sceneryObjs.length) return;
  if (P.endPhase >= 1) return;

  const playerZ = P.pos + P.playerZ;
  const px      = P.playerX;

  for (const o of sceneryObjs) {
    const cat = objCat(o);
    if (!cat) continue;

    // Skip far objects fast.
    let dz = o.z - playerZ;
    while (dz < -trackLen / 2) dz += trackLen;
    while (dz >  trackLen / 2) dz -= trackLen;
    if (dz < -120 || dz > HIT.PLAYER_Z_AHEAD) continue;

    const objX = objLateralX(o);

    // Coin pickup — generous lateral window
    if (cat === 'coin') {
      if (Math.abs(px - objX) < 0.32 && dz < 80 && dz > -120) {
        o._dead = true;
        spawnPickup(screenAnchorX, screenAnchorY - 80);
        playSfx('coin');
      }
      continue;
    }

    // Booster pickup — bigger window, gives nitro
    if (cat === 'booster') {
      if (Math.abs(px - objX) < 0.45 && dz < 100 && dz > -120) {
        o._dead = true;
        spawnPickup(screenAnchorX, screenAnchorY - 90, true);
        activateNitro(3.0);
        playSfx('nitro');
      }
      continue;
    }

    // Arch / tunnel — central span; pillars on each side.
    // The arch is a PERMANENT obstacle — never set _dead on it.
    // A per-arch cooldown (_hitCooldown) prevents the bounce from firing
    // every single physics tick while the player is overlapping the pillar.
    //
    // Pillar positions derived from the sprite sheet:
    //   stoneArch sw:1290 — inner pillar edges are ~22% from each side
    //   → opening spans roughly ±0.56 of road half-width
    //   woodArch  sw:1285 — similar proportions, use same threshold
    // Player car half-width in road coords ≈ 0.18, so collision fires when
    //   |px| + 0.18 > 0.56  →  |px| > 0.38
    // We use 0.42 as the threshold (a touch generous to feel fair).
    if (cat === 'arch') {
      if (dz > -60 && dz < 110) {
        // Pillar inner edges at roughly ±0.56 road half-width.
        // Car half-width ~0.18 → hit when |px| > 0.56 - 0.18 = 0.38
        const PILLAR_X = 0.42;
        if (Math.abs(px) > PILLAR_X) {
          // Per-arch hit cooldown: only bounce once per 400 ms passage
          const now = performance.now();
          if (!o._hitCooldown || now - o._hitCooldown > 400) {
            o._hitCooldown = now;
            const dir = px > 0 ? -1 : 1;
            applyBounce('scenery', dir);
            spawnCrash(screenAnchorX + (px > 0 ? 120 : -120), screenAnchorY - 40);
            playSfx('crash');
          }
        }
      }
      continue;
    }

    // Tree / rock / totem — roadside. Collide only if player is drifting
    // OFF the road on the same side. Small props (rocks, totems at offset
    // ~1.25) sit closer to the road edge than full trees (offset ~1.65),
    // so they get a slightly lenient threshold so the contact actually
    // registers when the player clips them. Window widened to ~150u for
    // reliable per-frame hits at full speed.
    if (cat === 'tree') {
      if (dz > -50 && dz < 100) {
        const side = o.side || 0;
        const edge = o.small ? 0.90 : 0.92;
        if (side < 0 && px < -edge) {
          o._dead = true;
          applyBounce('scenery', 1);
          spawnCrash(screenAnchorX - 60, screenAnchorY - 40);
          playSfx('crash');
        } else if (side > 0 && px > edge) {
          o._dead = true;
          applyBounce('scenery', -1);
          spawnCrash(screenAnchorX + 60, screenAnchorY - 40);
          playSfx('crash');
        }
      }
    }
  }
}

// Continuous scrape sound when scraping the road edge / driving off.
let _scrapeWasOn = false;
export function tickEdgeScrape() {
  const isScraping = P.isOffTrack && P.speed > C.OFFRD_LIM * 0.5;
  if (isScraping && !_scrapeWasOn) {
    playSfx('screech', { loop: true, volume: 0.55, key: 'screech' });
    _scrapeWasOn = true;
  } else if (!isScraping && _scrapeWasOn) {
    playSfx('screech', { stop: true, key: 'screech' });
    _scrapeWasOn = false;
  }
}