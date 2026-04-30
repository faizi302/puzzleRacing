// ═══════════════════════════════════════════════════════
// INPUT CONTROLLER — Keyboard + Touch + Lock flag
// ═══════════════════════════════════════════════════════
export const K = {
  up:false, down:false, left:false, right:false,
  hand:false, pause:false,

  // When true, all read accesses behave as "no input"
  // (used during intro fade-in and race-end fly-out).
  _locked: false,
};

const KM = {
  ArrowUp   : 'up',    ArrowDown  : 'down',
  ArrowLeft : 'left',  ArrowRight : 'right',
  KeyW      : 'up',    KeyS       : 'down',
  KeyA      : 'left',  KeyD       : 'right',
  Space     : 'hand',  Escape     : 'pause',  KeyP : 'pause',
};
const BLK = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);

// Read snapshot — call this once per physics tick. Returns ZEROED input
// when locked so the player car doesn't move during cinematics.
export function readInput() {
  if (K._locked) {
    return { up:false, down:false, left:false, right:false, hand:false, pause:false };
  }
  return { up:K.up, down:K.down, left:K.left, right:K.right, hand:K.hand, pause:K.pause };
}

export function lockInput(v = true)  { K._locked = !!v; }
export function isInputLocked()      { return K._locked; }

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