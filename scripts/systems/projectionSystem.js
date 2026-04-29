// ═══════════════════════════════════════════════════════
// PROJECTION SYSTEM — Canvas sizing, DPR, resolution
// ═══════════════════════════════════════════════════════
export let _cv = null;
export let _cx = null;
export let _W  = 0;
export let _H  = 0;
export let _dpr = 1;
export let _res = 1;

export function initRenderer(canvas) {
  _cv = canvas;
  _cx = canvas.getContext('2d', {alpha: false});
  _cx.imageSmoothingEnabled = true;
}

export function sizeCanvas() {
  _dpr = Math.min(window.devicePixelRatio || 1, 2);
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
}

export function getCtx()  { return _cx; }
export function getW()    { return _W;  }
export function getH()    { return _H;  }
export function getRes()  { return _res; }
export function getDpr()  { return _dpr; }
