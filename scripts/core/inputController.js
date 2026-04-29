// ═══════════════════════════════════════════════════════
// INPUT CONTROLLER — Keyboard + Touch
// ═══════════════════════════════════════════════════════
export const K = {up:false, down:false, left:false, right:false, hand:false, pause:false};

const KM = {
  ArrowUp:'up',   ArrowDown:'down',
  ArrowLeft:'left', ArrowRight:'right',
  KeyW:'up',  KeyS:'down',
  KeyA:'left', KeyD:'right',
  Space:'hand', Escape:'pause', KeyP:'pause',
};
const BLK = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);

export function initInput() {
  window.addEventListener('keydown', e => {
    if (BLK.has(e.code)) e.preventDefault();
    if (KM[e.code]) K[KM[e.code]] = true;
  });
  window.addEventListener('keyup', e => {
    if (KM[e.code]) K[KM[e.code]] = false;
  });
}

export function bindTouch(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  const on  = (e) => { e.preventDefault(); K[key] = true;  el.classList.add('pr');    };
  const off = (e) => { e.preventDefault(); K[key] = false; el.classList.remove('pr'); };
  el.addEventListener('touchstart',  on,  {passive:false});
  el.addEventListener('touchend',    off, {passive:false});
  el.addEventListener('touchcancel', off, {passive:false});
  el.addEventListener('mousedown',  on);
  el.addEventListener('mouseup',    off);
  el.addEventListener('mouseleave', off);
}
