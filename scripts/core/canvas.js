// ═══════════════════════════════════════════════════════
// CORE CANVAS — Single source of truth for ALL canvases
// ═══════════════════════════════════════════════════════
// This file replaces the old `systems/projectionSystem.js` and the
// inline canvas access in `visuals/uiRender.js`.
//
// Two canvases are managed here:
//   1. GAME CANVAS (#gc)         — main 3D race view, DPR-aware
//   2. MENU CANVAS (#menu-stars) — decorative title-screen background
//
// All renderers should import accessors from THIS file and nowhere else.
// ═══════════════════════════════════════════════════════

// ── Game canvas state ───────────────────────────────────
let _cv  = null;   // <canvas> element
let _cx  = null;   // 2d context
let _W   = 0;      // canvas width  (device pixels)
let _H   = 0;      // canvas height (device pixels)
let _dpr = 1;      // device pixel ratio (capped at 2)
let _res = 1;      // resolution scale relative to a 1024 reference

// ── Menu canvas state ───────────────────────────────────
let _menuCv = null;
let _menuCx = null;


// ════════════════════════════════════════════════════════
// GAME CANVAS
// ════════════════════════════════════════════════════════

/**
 * Bind to the main game <canvas>. Called once at boot from main.js.
 */
export function initRenderer(canvas) {
  _cv = canvas;
  _cx = canvas.getContext('2d', { alpha: false });
  _cx.imageSmoothingEnabled = true;
  _cx.imageSmoothingQuality = 'low';
}

/**
 * Resize the game canvas to viewport, accounting for device pixel ratio.
 * Call this on first render and on every resize event.
 */
export function sizeCanvas() {
  _dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const W = window.innerWidth;
  const H = window.innerHeight;

  _W = Math.round(W * _dpr);
  _H = Math.round(Math.max(260, H) * _dpr);

  _cv.width  = _W;
  _cv.height = _H;
  _cv.style.width  = W + 'px';
  _cv.style.height = H + 'px';

  _res = _W / 1024;
  _cx.imageSmoothingEnabled = true;
  _cx.imageSmoothingQuality = 'high';
}

export function getCanvas() { return _cv;  }
export function getCtx()    { return _cx;  }
export function getW()      { return _W;   }
export function getH()      { return _H;   }
export function getRes()    { return _res; }
export function getDpr()    { return _dpr; }


// ════════════════════════════════════════════════════════
// MENU CANVAS  (title-screen decorative stars background)
// ════════════════════════════════════════════════════════

/**
 * Lazily fetch the menu canvas, size it to its CSS box, return it.
 * Returns null if the element is missing from the DOM.
 */
export function sizeMenuCanvas() {
  if (!_menuCv) {
    _menuCv = document.getElementById('menu-stars');
    if (!_menuCv) return null;
    _menuCx = _menuCv.getContext('2d');
  }
  _menuCv.width  = _menuCv.offsetWidth  || window.innerWidth;
  _menuCv.height = _menuCv.offsetHeight || window.innerHeight;
  return _menuCv;
}

export function getMenuCanvas() { return _menuCv; }
export function getMenuCtx()    { return _menuCx; }