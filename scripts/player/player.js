// ═══════════════════════════════════════════════════════
// PLAYER — UnitB spritesheet car renderer
// ═══════════════════════════════════════════════════════
// Spritesheet: assets/UnitsTeamB.png  (1901 × 511)
// UnitB has 21 frames: UnitB_055 … UnitB_075
//   Frames 055–063 (idx 0–8 ) = turning right → car faces right
//   Frame  064     (idx 9   ) = straight ahead (dead-centre)
//   Frames 065–075 (idx 10–20) = turning left  → car faces left
//
// We map the player's lateral position + steering input
// to a frame index so the car visually turns with the road.
// ═══════════════════════════════════════════════════════
import { P }                        from '../systems/roadSystem.js';
import { K }                        from '../core/inputController.js';
import { getCtx, getW, getH, getRes } from '../systems/projectionSystem.js';

// ── UnitB atlas data (exact values from JSON) ───────────
const UNIT_B_FRAMES = [
  // idx  name          x    y    w    h   ssX  ssY
  { x:228, y:102, w: 99, h:101, sx:33, sy:38 }, // 055 → turning right (most)
  { x:330, y:202, w:100, h:101, sx:32, sy:38 }, // 056
  { x:432, y:202, w:100, h:101, sx:31, sy:38 }, // 057
  { x:117, y:410, w:102, h:100, sx:29, sy:38 }, // 058
  { x:118, y:308, w:102, h:100, sx:28, sy:38 }, // 059
  { x:120, y:201, w:103, h: 99, sx:26, sy:38 }, // 060
  { x:329, y:101, w:103, h: 99, sx:25, sy:38 }, // 061
  { x:588, y:100, w:104, h: 98, sx:23, sy:38 }, // 062
  { x:225, y:205, w:103, h: 98, sx:22, sy:38 }, // 063
  { x:122, y:102, w:104, h: 97, sx:20, sy:38 }, // 064 ← STRAIGHT (index 9)
  { x:434, y:102, w:104, h: 97, sx:18, sy:38 }, // 065
  { x:430, y:406, w:104, h: 97, sx:16, sy:38 }, // 066
  { x:222, y:305, w:104, h: 98, sx:14, sy:38 }, // 067
  { x:328, y:305, w:104, h: 98, sx:13, sy:38 }, // 068
  { x:325, y:405, w:103, h: 99, sx:12, sy:38 }, // 069
  { x:434, y:305, w:102, h: 99, sx:11, sy:38 }, // 070
  { x:221, y:410, w:102, h:100, sx:10, sy:38 }, // 071
  { x:640, y:302, w:102, h: 99, sx: 9, sy:39 }, // 072
  { x:534, y:201, w:101, h:100, sx: 8, sy:39 }, // 073
  { x:538, y:303, w:100, h:100, sx: 8, sy:39 }, // 074
  { x:637, y:200, w: 99, h:100, sx: 8, sy:39 }, // 075 → turning left (most)
];

// sourceSize is always 140×173, anchor (0.5, 0.65)
const SRC_W  = 140;
const SRC_H  = 173;
const ANCHOR_X = 0.5;   // horizontal centre
const ANCHOR_Y = 0.65;  // anchor 65% from top = ground contact

const STRAIGHT_IDX = 9; // UnitB_064
const TOTAL_FRAMES  = UNIT_B_FRAMES.length; // 21

// Smooth visual frame index (float, updated every render frame)
let _frameFloat = STRAIGHT_IDX;

// ── Load spritesheet ─────────────────────────────────────
const _sheet = new Image();
_sheet.ready = false;
_sheet.onload = () => { _sheet.ready = true; };
_sheet.onerror= () => { console.warn('UnitsTeamB.png not found'); };
_sheet.src = 'assets/UnitsTeamB.png';

// ── Public: call every render frame ─────────────────────
export function drawCar(steerVisual) {
  // steerVisual: smoothed float  -1 (full left) … 0 … +1 (full right)
  // Map to frame index:
  //   steer = -1  → idx 20 (hardest left)
  //   steer =  0  → idx  9 (straight)
  //   steer = +1  → idx  0 (hardest right)
  // We use only the outer ~60 % of the range so slight inputs still look natural.
  const targetIdx = STRAIGHT_IDX - steerVisual * STRAIGHT_IDX;
  // Smooth the frame float so it doesn't snap (lerp at ~12 fps influence)
  _frameFloat += (targetIdx - _frameFloat) * 0.22;
  const idx = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(_frameFloat)));

  const ctx = getCtx();
  const W   = getW();
  const H   = getH();
  const res = getRes();   // _W / 1024  — DPR-aware scale factor

  // Desired rendered height of the car (in canvas pixels)
  const drawH = (SRC_H * res * 0.62) | 0;
  const drawW = (SRC_W * res * 0.62) | 0;

  // Car anchor point on screen: horizontally centred, near bottom
  const anchorX = W / 2;
  const anchorY = (H * 0.91) | 0;

  // Draw position: shift by anchor so the car sits on the road surface
  const dx = anchorX - drawW * ANCHOR_X;
  const dy = anchorY - drawH * ANCHOR_Y;

  if (_sheet.ready) {
    const f = UNIT_B_FRAMES[idx];
    // Shadow ellipse under car
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.fillStyle   = '#000';
    ctx.beginPath();
    ctx.ellipse(
      anchorX, anchorY + drawH * 0.08,
      drawW * 0.44, drawH * 0.07,
      0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    // Brake-light red glow overlay
    if (P.isBraking && P.speed > 2) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle   = '#ff2200';
      ctx.fillRect(dx + drawW*0.1, dy + drawH*0.55, drawW*0.8, drawH*0.15);
      ctx.restore();
    }

    // Draw sprite from sheet
    ctx.drawImage(
      _sheet,
      f.x, f.y, f.w, f.h,   // source rect (trimmed frame)
      dx + (f.sx / SRC_W) * drawW,   // compensate for trimmed offset
      dy + (f.sy / SRC_H) * drawH,
      (f.w / SRC_W) * drawW,
      (f.h / SRC_H) * drawH
    );

  } else {
    // Fallback: coloured rectangle while sheet loads
    ctx.fillStyle = '#1a88ff';
    ctx.fillRect(dx + drawW*0.1, dy + drawH*0.3, drawW*0.8, drawH*0.6);
    ctx.fillStyle = '#0055cc';
    ctx.fillRect(dx + drawW*0.2, dy + drawH*0.15, drawW*0.6, drawH*0.35);
  }
}
