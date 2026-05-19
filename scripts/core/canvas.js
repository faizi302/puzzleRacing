// Core canvas — single source of truth for game + menu canvases.

let _cv = null, _cx = null;
let _W = 0, _H = 0, _dpr = 1, _res = 1;

let _menuCv = null, _menuCx = null;

// Game canvas

export function initRenderer(canvas) {
  _cv = canvas;
  _cx = canvas.getContext('2d', { alpha: false });
  _cx.imageSmoothingEnabled = true;
  _cx.imageSmoothingQuality = 'low';
}

export function sizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const cssW = window.innerWidth;
  const cssH = Math.max(260, window.innerHeight);
  const newW = Math.round(cssW * dpr);
  const newH = Math.round(cssH * dpr);

  // Skip if nothing changed — avoids GPU buffer reallocation on no-op resizes.
  if (newW === _W && newH === _H && dpr === _dpr) return;

  _dpr = dpr;
  _W = newW;
  _H = newH;

  _cv.width = _W;
  _cv.height = _H;
  _cv.style.width = cssW + 'px';
  _cv.style.height = cssH + 'px';

  _res = _W / 1024;
  _cx.imageSmoothingEnabled = true;
  // 'low' is fast and visually fine for our scaling profile.
  _cx.imageSmoothingQuality = 'low';
}

export const getCanvas = () => _cv;
export const getCtx    = () => _cx;
export const getW      = () => _W;
export const getH      = () => _H;
export const getRes    = () => _res;
export const getDpr    = () => _dpr;

// Menu canvas

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

export const getMenuCanvas = () => _menuCv;
export const getMenuCtx    = () => _menuCx;