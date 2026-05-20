// Hint card — wooden plaque drawn at FIXED screen size, anchored to an arch.
//
// The 5 frames below describe the non-green cards in assets/hint.png.
// EDIT these numbers if the cards don't line up — open hint.png in any
// image viewer, hover over a card, and read the pixel coordinates.
//
// Coordinates assume a roughly 2-column layout. If your image is much
// wider or taller, adjust accordingly.

import { IMG } from '../visuals/objectRender.js';

// ── Card sprite frames ──────────────────────────────────────────────────
// Format: { sx, sy, sw, sh, padX, padY }
// padX/padY = inner padding (in pixels of the sprite) where text can live
// without overlapping the wooden border.
export const HINT_CARDS = [
  // Card 1 — oval (row 1 left)
  { sx:   8, sy:   8, sw: 200, sh:  92, padX: 30, padY: 18 },

  // Card 2 — rounded rectangle (row 1 right)
  { sx: 220, sy:  16, sw: 200, sh:  78, padX: 22, padY: 14 },

  // Card 3 — hexagonal pointed (row 2 left)
  { sx:  10, sy: 116, sw: 210, sh: 100, padX: 34, padY: 18 },

  // Card 4 — big rectangle (row 3 left)
  { sx:   8, sy: 232, sw: 220, sh:  98, padX: 22, padY: 16 },

  // Card 5 — arrow rectangle (row 3 right)
  { sx: 232, sy: 232, sw: 220, sh:  96, padX: 22, padY: 16 },
];

// ── Fixed screen size (in CSS px before DPR) ────────────────────────────
// These are the constants you tune for "how big the hint card appears".
// They DO NOT depend on perspective — that's the whole point.
const CARD_BASE_W = 280;       // base width in CSS px
const CARD_BASE_H = 96;        // base height (will be derived from aspect)
const CARD_MIN_W  = 180;       // never smaller than this on tiny screens
const CARD_MAX_W  = 340;       // never larger than this on big screens
const CARD_WIDTH_FRAC = 0.32;  // scales with canvas width (so phones/PCs both look ok)

// ── Text styling ────────────────────────────────────────────────────────
const TEXT_COLOR  = '#fdecbb';   // warm cream — readable on wood
const TEXT_SHADOW = 'rgba(0,0,0,0.55)';
const MAX_LINES   = 2;

// Same hint text always picks the same card (stable hash).
export function pickCardFrame(text) {
  if (!text) return HINT_CARDS[0];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash * 31) + text.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % HINT_CARDS.length;
  return HINT_CARDS[idx];
}

// Word-wrap helper — returns array of strings, max `maxLines`.
function wrapTextLines(ctx, text, maxW, maxLines) {
  const words = text.split(' ');
  const lines = [];
  let line = '';

  for (let i = 0; i < words.length; i++) {
    if (lines.length >= maxLines) break;
    const word = words[i];
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);

  // Truncate last line with '…' if more words were dropped
  if (lines.length === maxLines) {
    const lastIdx = words.indexOf(line.split(' ').pop());
    if (lastIdx >= 0 && lastIdx < words.length - 1) {
      let last = lines[maxLines - 1];
      while (last.length > 0 && ctx.measureText(last + '…').width > maxW) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = last + '…';
    }
  }
  return lines;
}

/**
 * Draw a hint card at fixed screen size, anchored above an arch.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} archCx     - arch center X in screen pixels
 * @param {number} archTopY   - the TOP edge of the arch in screen pixels
 * @param {number} canvasW    - canvas width (for responsive sizing)
 * @param {string} text       - hint text
 * @param {number} fade       - 0..1 distance fade alpha
 * @param {number} now        - performance.now() for pulse animation
 */
export function drawHintCard(ctx, archCx, archTopY, canvasW, text, fade, now) {
  if (!text) return;

  // Resolve card frame (stable per text)
  const frame = pickCardFrame(text);

  // ── Fixed screen size — independent of perspective ───────────────────
  let cardW = canvasW * CARD_WIDTH_FRAC;
  cardW = Math.max(CARD_MIN_W, Math.min(CARD_MAX_W, cardW));

  // Maintain card aspect ratio from the sprite
  const aspect = frame.sh / frame.sw;
  const cardH = cardW * aspect;

  // Position: centered on arch X, sitting just above the arch's top edge
  const cx = archCx;
  const cy = archTopY - cardH * 0.55;  // slight overlap with arch top
  const dx = cx - cardW / 2;
  const dy = cy - cardH / 2;

  // Gentle pulse for visibility
  const pulse = 0.92 + 0.08 * Math.sin(now * 0.004);
  const alpha = Math.max(0, Math.min(1, fade * pulse));

  ctx.save();
  ctx.globalAlpha = alpha;

  // ── Draw card sprite (if image ready) or fallback rect ──────────────
  const img = IMG.hints;
  if (img && img.ready) {
    ctx.drawImage(
      img,
      frame.sx, frame.sy, frame.sw, frame.sh,
      dx, dy, cardW, cardH
    );
  } else {
    // Fallback so text is still readable while hint.png is loading
    ctx.fillStyle = 'rgba(60, 35, 15, 0.92)';
    ctx.strokeStyle = 'rgba(180, 120, 60, 1)';
    ctx.lineWidth = 2;
    roundRectPath(ctx, dx, dy, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();
  }

  // ── Text inside the card ──────────────────────────────────────────────
  // Inner area = card minus the wooden border (padX/padY scaled to draw size)
  const padX = (frame.padX / frame.sw) * cardW;
  const padY = (frame.padY / frame.sh) * cardH;
  const innerW = cardW - padX * 2;

  // Font size scales with card width — but card width is fixed, so font is fixed.
  const fontSize = Math.max(11, Math.min(18, cardW * 0.062));
  const lineH = fontSize + 4;

  ctx.font = `bold ${fontSize}px "Orbitron", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = wrapTextLines(ctx, text, innerW, MAX_LINES);

  // Center the text block vertically inside the card
  const blockH = lines.length * lineH;
  const startY = dy + cardH / 2 - blockH / 2 + lineH / 2;

  // Shadow for readability on light wood
  ctx.shadowColor = TEXT_SHADOW;
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;

  ctx.fillStyle = TEXT_COLOR;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], cx, startY + i * lineH);
  }

  ctx.restore();
}

// Local helper — rounded rect path
function roundRectPath(ctx, x, y, w, h, r) {
  const r2 = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r2, y);
  ctx.lineTo(x + w - r2, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r2);
  ctx.lineTo(x + w, y + h - r2);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r2, y + h);
  ctx.lineTo(x + r2, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r2);
  ctx.lineTo(x, y + r2);
  ctx.quadraticCurveTo(x, y, x + r2, y);
  ctx.closePath();
}