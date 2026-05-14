// ═══════════════════════════════════════════════════════
// SCENERY RENDER — Drawing only. Building delegated to active level.
// ─────────────────────────────────────────────────────
// Renders:
//   • Static scenery (trees, totems, bridges, arches…)
//   • Pickups (coins, keys, boosters)
//   • Hurdles + Jump ramps
//   • Fork-gate / fork-marker tinting
//   • GHOST START puzzle objects:
//       - Fake door            → PERMANENT red-skull trap.
//                                Never opens, never turns green.
//       - Pressure plate       → ground disc, pulses, turns
//                                green once activated
//       - Fake wall            → full opacity normal stone wall;
//                                fades to ~40% once dissolved
//                                so the player can see the trick
//                                is broken
//       - Real key             → legacy renderer (kept harmless
//                                in case any external level still
//                                emits it). The reworked Level 1
//                                no longer places one.
//
// DEBUG: window.DEBUG_JUMPS = true logs jump info every second.
// ═══════════════════════════════════════════════════════
import { C } from '../configs/roadConfig.js';
import { segs, trackLen, getActiveTrack } from '../core/roadMap.js';
import { P, clamp } from '../systems/roadSystem.js';
import { getCtx, getW, getH, getRes } from '../core/canvas.js';
import { IMG } from './objectRender.js';
import { _visibleSegs } from './roadRender.js';
import { getActiveLevel } from '../core/activeLevel.js';

import { SPR, SPR_BY_LEVEL, JUMP_SPR, JUMP_KINDS } from '../configs/sceneryConfig.js';

function getScenerySPR() {
  const levelId = getActiveLevel?.()?.id || 'level1';
  return SPR_BY_LEVEL[levelId] || SPR;
}

// Live binding — re-assigned by buildScenery() to whatever the
// active level returns.
export let sceneryObjs = [];

export function buildScenery() {
  const lvl = getActiveLevel();
  if (lvl && typeof lvl.buildSceneryObjects === 'function') {
    sceneryObjs = lvl.buildSceneryObjects();
    if (typeof window !== 'undefined' && window.DEBUG_JUMPS) {
      const jumps = sceneryObjs.filter(o => o.isJump);
      console.log(`[scenery] built ${sceneryObjs.length} objs, ${jumps.length} jumps`);
      jumps.slice(0, 5).forEach(j => console.log('  jump:', j.kind, 'z=', j.z));
    }
  } else {
    sceneryObjs = [];
  }
}

// ── Fast Z-to-visibleSeg lookup ────────────────────────
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
      return {
        v,
        pct: (zz - z1) / Math.max(1, z2 - z1),
      };
    }
  }

  return null;
}

function drawSprite(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh) {
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function resolveSprite(kind) {
  if (JUMP_KINDS.has(kind)) {
    const spr = JUMP_SPR[kind];
    if (!spr) return null;
    return { spr, atlas: IMG.jumps, isJumpAtlas: true };
  }

  const spr = getScenerySPR()[kind];
  if (!spr) return null;

  if (spr.puzzleSymbolAtlas) {
    return { spr, atlas: IMG.puzzleSymbols, isJumpAtlas: false };
  }

  return { spr, atlas: IMG.scenery, isJumpAtlas: false };
}

// ── Debug helpers ──────────────────────────────────────
let _debugFrame = 0;
let _debugReportedAtlasLoaded = false;

function debugTick(jumpsTotal, jumpsVisible, jumpsCulled, atlasReady) {
  if (typeof window === 'undefined' || !window.DEBUG_JUMPS) return;
  _debugFrame++;
  if (_debugFrame % 60 !== 0) return;
  console.log(
    `[scenery] sceneryObjs:${sceneryObjs.length} | ` +
    `jumps total:${jumpsTotal} visible:${jumpsVisible} culled:${jumpsCulled} | ` +
    `IMG.jumps.ready:${atlasReady} | P.pos:${(P.pos | 0)}`
  );
}

// ── Main scenery draw ──────────────────────────────────
export function drawScenery() {
  if (!_visibleSegs.length) return;
  if (!IMG.scenery?.ready && !IMG.jumps?.ready) return;

  // One-shot atlas-loaded log
  if (typeof window !== 'undefined' && window.DEBUG_JUMPS &&
    IMG.jumps.ready && !_debugReportedAtlasLoaded) {
    console.log('[scenery] IMG.jumps loaded:',
      IMG.jumps.naturalWidth + 'x' + IMG.jumps.naturalHeight,
      'src:', IMG.jumps.src);
    _debugReportedAtlasLoaded = true;
  }

  const ctx = getCtx();
  const _W = getW();
  const _H = getH();
  const _res = getRes();
  const horizonY = _H * 0.44;
  const now = performance.now();

  const list = [];
  let jumpsTotal = 0;
  let jumpsCulled = 0;

  for (const o of sceneryObjs) {
    // Monsters are drawn by their own pass — skip them here.
    if (o.isMonster) continue;

    if (o.hidden) continue;
    if (o._dead && (o.isCoin || o.isBooster || o.isKey)) continue;

    if (o.isJump) jumpsTotal++;

    let dz = o.z - P.pos;
    while (dz < 0) dz += trackLen;
    if (dz < 120 || dz > C.DRAW_D * C.SEG_LEN * 0.45) {
      if (o.isJump) jumpsCulled++;
      continue;
    }

    const hit = visibleForZ(o.z);
    if (!hit) {
      if (o.isJump) jumpsCulled++;
      continue;
    }

    const { v, pct } = hit;
    const y = v.y1 + (v.y2 - v.y1) * pct;
    const cx = v.x1 + (v.x2 - v.x1) * pct;
    const rw = v.w1 + (v.w2 - v.w1) * pct;

    if (!o.isCoin && !o.isBooster && !o.isKey && !o.isHurdle && !o.isJump &&
        !o.isPressurePlate && !o.isFakeWall && !o.isRealKey &&
      (y < horizonY - 4 || y > _H * 0.98)) continue;
    if ((o.isCoin || o.isBooster || o.isKey || o.isRealKey) &&
      (y < horizonY * 0.5 || y > _H * 0.98)) continue;
    if (o.isHurdle && y > _H * 1.10) continue;
    if (o.isFakeWall && y > _H * 1.10) continue;
    if (o.isJump && y > _H * 1.10) {
      jumpsCulled++;
      continue;
    }

    const scale = C.CAM_DEPTH / dz;
    list.push({ o, y, cx, rw, scale, dz });
  }

  const jumpsVisible = list.filter(it => it.o.isJump).length;
  debugTick(jumpsTotal, jumpsVisible, jumpsCulled, IMG.jumps.ready);

  list.sort((a, b) => b.dz - a.dz);

  for (const it of list) {
    const resolved = resolveSprite(it.o.kind);
    if (!resolved) continue;
    const { spr: s, atlas } = resolved;
    if (!atlas || !atlas.ready) continue;

    let drawW, drawH, x, y;

    if (it.o.isJump) {
      // ═══════════════════════════════════════════════════
      // JUMP RAMP — physical-size projection (BIGGER & BOLDER)
      // ═══════════════════════════════════════════════════
      const jumpSize = it.o.size ?? 1.00;
      const roadFrac = it.o.roadFrac ?? s.roadFrac ?? 0.78;
      const heightMul = it.o.heightMul ?? s.heightMul ?? 0.85;

      drawW = it.rw * roadFrac * jumpSize;
      drawH = drawW * (s.sh / s.sw) * heightMul;

      const groundX = it.cx + (it.o.offset || 0) * it.rw;
      x = groundX - drawW / 2;

      const anchor = s.anchorY ?? 1.0;
      y = it.y - drawH * anchor;

      if (y > _H || x > _W + drawW || x < -drawW) continue;
      if (y + drawH < horizonY - 50) continue;

    } else if (it.o.isPressurePlate) {
      // ═══════════════════════════════════════════════════
      // PRESSURE PLATE — flat disc on the road, glows.
      // ═══════════════════════════════════════════════════
      const plateSize = 0.78;
      drawW = it.rw * plateSize;
      drawH = drawW * 0.22;   // very flat — it's a floor plate

      const groundX = it.cx + (it.o.offset || 0) * it.rw;
      x = groundX - drawW / 2;
      y = it.y - drawH * 0.85;

      if (y > _H || x > _W + drawW || x < -drawW) continue;

    } else if (it.o.overhead) {
      drawW = it.rw * 2.6 * s.scale;
      drawH = drawW * (s.sh / s.sw);
      x = it.cx - drawW / 2;
      y = it.y - drawH * s.anchorY;

    } else if (it.o.isCoin || it.o.isBooster || it.o.isKey || it.o.isPuzzleSymbol || it.o.isRealKey) {
      const perspective = clamp(it.scale * 1800, 0.04, 1.45);

      let baseSize, minSize, maxSize;

      if (it.o.isKey || it.o.isRealKey) {
        baseSize = s.renderBase ?? 130;
        minSize  = (s.renderMin ?? 32) * _res;
        maxSize  = (s.renderMax ?? 240) * _res;
      } else if (it.o.isBooster) {
        baseSize = s.renderBase ?? 92;
        minSize  = (s.renderMin ?? 14) * _res;
        maxSize  = (s.renderMax ?? 100) * _res;
      } else {
        baseSize = s.renderBase ?? 58;
        minSize  = (s.renderMin ?? 10) * _res;
        maxSize  = (s.renderMax ?? 78) * _res;
      }

      const objSize = it.o.size ?? 1;
      const spriteScale = s.scale ?? 1;

      drawW = baseSize * perspective * spriteScale * objSize * _res;
      drawH = drawW * (s.sh / s.sw);

      drawW = clamp(drawW, minSize, maxSize);
      drawH = drawW * (s.sh / s.sw);

      x = it.cx + it.o.offset * it.rw - drawW / 2;
      y = it.y - drawH * (s.anchorY ?? 0.88);

      if (y + drawH < horizonY) continue;
      if (y > _H || x > _W + drawW || x < -drawW) continue;

    } else if (it.o.isHurdle || it.o.isFakeWall) {
      // Fake walls use the same sizing math as hurdles — they're
      // visually identical to a stoneWall hurdle, just no collision.
      const hurdleSize = it.o.size ?? 0.45;
      const HURDLE_WORLD_W = C.ROAD_W * hurdleSize * s.scale;
      drawW = HURDLE_WORLD_W * (C.CAM_DEPTH / it.dz) * _W;

      drawW = clamp(drawW, 40 * _res, 0.80 * _W);
      drawH = drawW * (s.sh / s.sw);

      const groundX = it.cx + it.o.offset * it.rw;
      x = groundX - drawW / 2;
      const anchor = it.o.anchorY ?? 1.0;
      y = it.y - drawH * anchor;

      if (y > _H || x > _W + drawW || x < -drawW) continue;
      if (y + drawH < horizonY) continue;

    } else {
      const side = it.o.side || 1;
      let worldR;

      if (it.o.isBoundaryPole && it.o.fixedSize) {
        const poleSize = it.o.screenSize ?? 70;

        drawW = poleSize * _res * (it.o.size ?? 1);
        drawH = drawW * (s.sh / s.sw);

        const groundX = it.cx + side * it.rw * it.o.offset;
        x = groundX - drawW / 2;
        y = it.y - drawH * s.anchorY;

        if (y > _H + drawH) continue;
        if (x > _W + drawW || x < -drawW) continue;
      } else {
        const objSize = it.o.size ?? 1;

        worldR = it.o.small
          ? C.ROAD_W * 0.20 * s.scale * objSize
          : C.ROAD_W * 0.82 * s.scale * objSize;
      }
      drawW = worldR * (C.CAM_DEPTH / it.dz) * _W;

      let minW, maxW;

      if (it.o.isBoundaryPole) {
        const nearT = clamp(1 - it.dz / 9000, 0, 1);
        minW = 0.34 * _res;
        maxW = (18 + nearT * 70) * _res;
      } else {
        minW = it.o.small ? 16 * _res : 48 * _res;
        maxW = it.o.small ? 0.20 * _W : 0.55 * _W;
      }

      drawW = clamp(drawW, minW, maxW);
      drawH = drawW * (s.sh / s.sw);
      drawW = clamp(drawW, minW, maxW);
      drawH = drawW * (s.sh / s.sw);

      const groundX = it.cx + side * it.rw * it.o.offset;
      x = groundX - drawW / 2;
      y = it.y - drawH * s.anchorY;

      if (!it.o.backgroundProp) {
        if (side < 0 && x + drawW > it.cx - it.rw * 0.94) {
          x = it.cx - it.rw * 0.94 - drawW;
        }
        if (side > 0 && x < it.cx + it.rw * 0.94) {
          x = it.cx + it.rw * 0.94;
        }
      }

      if (y > _H || x > _W + drawW || x < -drawW) continue;
      if (y + drawH < horizonY) continue;
    }

    const fade = clamp(1 - it.dz / (C.DRAW_D * C.SEG_LEN * 0.65), 0, 1);

    ctx.save();
    let alpha = 0.20 + fade * 0.80;

    // ═══════════════════════════════════════════════════
    // GHOST START — visual logic per design diagram
    // ─────────────────────────────────────────────────
    // The fake wall and fake door LOOK 100% real (no cyan
    // tint, no shimmer). Only the pressure plate has a glow,
    // because the diagram shows it as the only "magical"
    // element. After plate activation:
    //   • Plate halo turns green (was blue)
    //   • Fake door swaps from red skull tint to green safe
    //   • Real key appears with gold glow
    //   • Fake walls fade slightly to hint they've dissolved
    // ═══════════════════════════════════════════════════
    const plateActive = !!P.ghostPlateActive;

    if (it.o.isMemoryPlatform) {
      if (it.o.memoryHidden) alpha = 0.0;
      if (it.o.isFakePlatform && !it.o.memoryHidden)
        alpha = 0.45 + 0.35 * Math.sin(now * 0.012);
      if (it.o.justShifted)
        alpha = 0.75 + 0.25 * Math.sin(now * 0.02);
    }

    // Fake wall: full opacity before plate. After plate, fade
    // to ~40% so the player can see they've dissolved.
    if (it.o.isFakeWall) {
      alpha = it.o.dissolved ? 0.40 + 0.10 * Math.sin(now * 0.005) : 1.0;
    }

    ctx.globalAlpha = alpha;

    // ──── Branch by render-mode ────────────────────────
    if (it.o.isPressurePlate) {
      // ═══════════════════════════════════════════════════
      // PRESSURE PLATE — blue glowing floor disc
      // (matches the diagram exactly: blue gem-like square
      //  on the road, turns green when activated)
      // ═══════════════════════════════════════════════════
      const activated = !!it.o.activated || plateActive;
      const pulse = 0.55 + 0.45 * Math.sin(now * 0.006);

      // Outer glow halo
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (activated ? 0.65 : 0.45) * fade * pulse;
      ctx.fillStyle = activated
        ? 'rgba(80, 255, 130, 1)'
        : 'rgba(80, 160, 255, 1)';   // BLUE before activation (per diagram)
      ctx.beginPath();
      ctx.ellipse(
        x + drawW / 2, y + drawH / 2,
        drawW * 0.72, drawH * 1.5,
        0, 0, Math.PI * 2
      );
      ctx.fill();

      // Plate base — dark stone disc
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = (0.65 + fade * 0.35);
      ctx.fillStyle = activated ? '#1f4d22' : '#1a2540';
      ctx.beginPath();
      ctx.ellipse(
        x + drawW / 2, y + drawH / 2,
        drawW * 0.50, drawH * 1.10,
        0, 0, Math.PI * 2
      );
      ctx.fill();

      // Ring stroke
      ctx.strokeStyle = activated
        ? `rgba(120, 255, 160, ${0.65 + 0.35 * pulse})`
        : `rgba(120, 200, 255, ${0.65 + 0.35 * pulse})`;
      ctx.lineWidth = Math.max(2, drawW * 0.030);
      ctx.beginPath();
      ctx.ellipse(
        x + drawW / 2, y + drawH / 2,
        drawW * 0.50, drawH * 1.10,
        0, 0, Math.PI * 2
      );
      ctx.stroke();

      // Inner glowing gem
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (activated ? 0.95 : 0.85) * fade * pulse;
      ctx.fillStyle = activated
        ? 'rgba(180, 255, 200, 1)'
        : 'rgba(160, 220, 255, 1)';
      ctx.beginPath();
      ctx.ellipse(
        x + drawW / 2, y + drawH / 2,
        drawW * 0.22, drawH * 0.55,
        0, 0, Math.PI * 2
      );
      ctx.fill();

    } else if (it.o.isFakeWall) {
      // ═══════════════════════════════════════════════════
      // FAKE WALL — looks 100% SOLID, real stone
      // ─────────────────────────────────────────────────
      // No tint, no shimmer, no glow. Just a normal stone
      // wall sprite at full opacity. The "lie" is that it
      // has no collision — visually it must read as real.
      // After plate activation we add a tiny dust/shimmer
      // hint so the player notices it's dissolved.
      // ═══════════════════════════════════════════════════
      drawSprite(ctx, atlas, s.sx, s.sy, s.sw, s.sh, x, y, drawW, drawH);

      if (it.o.dissolved) {
        const pulse = 0.50 + 0.50 * Math.sin(now * 0.004 + it.o.z * 0.0001);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.18 * fade * pulse;
        ctx.fillStyle = 'rgba(255, 255, 220, 1)';
        ctx.fillRect(x, y, drawW, drawH);
      }

    } else if (it.o.isFakeDoor) {
      // ═══════════════════════════════════════════════════
      // FAKE DOOR (PERMANENT TRAP) — stone arch with skull
      // ─────────────────────────────────────────────────
      // Diagram invariant: the fake door is ALWAYS a trap.
      // It never opens. It never turns green. The pressure
      // plate does NOT change this — the plate's job is to
      // unlock Road2, not to disarm this door.
      //
      // Renderer always shows the red skull warning tint and
      // ignores any `isDoorOpen` / `plateActive` state.
      // ═══════════════════════════════════════════════════
      drawSprite(ctx, atlas, s.sx, s.sy, s.sw, s.sh, x, y, drawW, drawH);

      const pulse = 0.55 + 0.45 * Math.sin(now * 0.005);

      // Red trap tint — always.
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.42 * fade * pulse;
      ctx.fillStyle = 'rgba(220, 40, 30, 1)';
      ctx.fillRect(x, y, drawW, drawH);

      // Skull warning icon — always.
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = (0.85 + 0.15 * pulse) * fade;
      ctx.font = `bold ${Math.max(20, drawW * 0.12)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ff5050';
      ctx.fillText('💀', x + drawW / 2, y + drawH * 0.18);

    } else if (it.o.isRealKey) {
      // ═══════════════════════════════════════════════════
      // REAL KEY — pre-placed but `hidden:true` until plate
      // activates. Once visible, gold key + bright halo.
      // ═══════════════════════════════════════════════════
      drawSprite(ctx, atlas, s.sx, s.sy, s.sw, s.sh, x, y, drawW, drawH);

      const pulse = 0.85 + 0.15 * Math.sin(now * 0.006);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.30 + fade * 0.70) * 0.65 * pulse;
      ctx.fillStyle = 'rgba(255, 210, 60, 1)';
      ctx.beginPath();
      ctx.ellipse(
        x + drawW / 2, y + drawH / 2,
        drawW * 0.55, drawH * 0.55,
        0, 0, Math.PI * 2
      );
      ctx.fill();

      // Vertical light beam up from the key
      ctx.globalAlpha = (0.30 + fade * 0.50) * 0.35 * pulse;
      ctx.fillStyle = 'rgba(255, 220, 120, 1)';
      ctx.fillRect(x + drawW * 0.42, y - drawH * 0.5,
                   drawW * 0.16, drawH * 0.9);

    } else if (it.o.isKey) {
      const pulse = 0.85 + 0.15 * Math.sin(now * 0.006);
      ctx.shadowBlur = 0;
      drawSprite(ctx, atlas, s.sx, s.sy, s.sw, s.sh, x, y, drawW, drawH);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.20 + fade * 0.80) * 0.45 * pulse;
      ctx.fillStyle = 'rgba(255, 200, 50, 1)';
      ctx.beginPath();
      ctx.ellipse(x + drawW / 2, y + drawH / 2, drawW * 0.42, drawH * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (it.o.isForkGate) {
      drawSprite(ctx, atlas, s.sx, s.sy, s.sw, s.sh, x, y, drawW, drawH);
      const pulse = 0.80 + 0.20 * Math.sin(now * 0.0035);
      const tintClr = it.o.forkTint === 'road2'
        ? `rgba(255, 210, 50, ${0.30 * pulse})`
        : `rgba(255, 80,  40, ${0.25 * pulse})`;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.55 * fade * pulse;
      ctx.fillStyle = tintClr;
      ctx.fillRect(x, y, drawW, drawH);

    } else if (it.o.isForkMarker) {
      drawSprite(ctx, atlas, s.sx, s.sy, s.sw, s.sh, x, y, drawW, drawH);
      const pulse = 0.75 + 0.25 * Math.sin(now * 0.004 + it.o.z * 0.001);
      const tintClr = (getActiveTrack() === 2)
        ? `rgba(255, 220, 60, 0.4)`
        : `rgba(255, 70,  30, 0.3)`;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.45 * fade * pulse;
      ctx.fillStyle = tintClr;
      ctx.fillRect(x, y, drawW, drawH);

    } else if (it.o.isJump) {
      if (it.o.isMemoryPlatform) {
        if (it.o.memoryHidden) {
          ctx.globalAlpha = 0.0;
        } else if (it.o.isFakePlatform) {
          ctx.globalAlpha = 0.45 + 0.35 * Math.sin(now * 0.012);
        } else if (it.o.justShifted) {
          ctx.globalAlpha = 0.75 + 0.25 * Math.sin(now * 0.02);
        } else {
          ctx.globalAlpha = 0.55 + fade * 0.45;
        }
      } else {
        ctx.globalAlpha = 0.55 + fade * 0.45;
      }
      drawSprite(ctx, atlas, s.sx, s.sy, s.sw, s.sh, x, y, drawW, drawH);

      if (it.o.kind !== 'rockArch') {
        const pulse = 0.55 + 0.45 * Math.sin(now * 0.005 + it.o.z * 0.0007);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.18 * fade * pulse;
        ctx.fillStyle = 'rgba(255, 150, 220, 1)';
        ctx.fillRect(x + drawW * 0.05, y + drawH * 0.78, drawW * 0.90, drawH * 0.20);
      }

    } else if (it.o.isHurdle) {
      drawSprite(ctx, atlas, s.sx, s.sy, s.sw, s.sh, x, y, drawW, drawH);

    } else {
      drawSprite(ctx, atlas, s.sx, s.sy, s.sw, s.sh, x, y, drawW, drawH);
    }

    // ═══════════════════════════════════════════════
    // LEVEL 3 PUZZLE SYMBOLS (kept from original)
    // ═══════════════════════════════════════════════
    if (it.o.isMural) {
      const symbolMap = {
        star: '⭐',
        moon: '🌙',
        fire: '💎',
        water: '🗝️',
      };

      const symbolText = it.o.isMural
        ? it.o.symbol
        : symbolMap[it.o.symbol];

      if (symbolText) {
        ctx.save();
        const fontSize = Math.max(22, drawW * 0.30);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(255,255,255,0.65)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.95;
        ctx.fillText(symbolText, x + drawW * 0.5, y + drawH * 0.38);
        ctx.restore();
      }
    }

    ctx.restore();
  }
}