// ═══════════════════════════════════════════════════════
// INPUT CONTROLLER — Keyboard + Touch + Lock flag
// ─────────────────────────────────────────────────────────
// CHANGES (Asphalt-9 style nitro):
//   • Added edge-detected `nitroPressed` (true ONLY on the
//     frame Space transitions from up→down). Prevents the
//     player.js nitro logic from re-triggering every tick.
//   • `consumeNitroPress()` clears the edge so it can only
//     be read once per press.
//   • Down arrow remains brake/reverse for normal driving;
//     player.js uses it to *cancel* an active nitro burn
//     while leaving the underlying brake input intact.
// ═══════════════════════════════════════════════════════

export const K = {
  up:false, down:false, left:false, right:false,
  hand:false, nitro:false, pause:false,
  _locked: false,downPressed: false,

  // ── Edge-detected one-shot flag for Space (nitro) ──
  // Set true on keydown, cleared by consumeNitroPress().
  nitroPressed: false,
};

const KM = {
  ArrowUp   : 'up',    ArrowDown  : 'down',
  ArrowLeft : 'left',  ArrowRight : 'right',
  KeyW      : 'up',    KeyS       : 'down',
  KeyA      : 'left',  KeyD       : 'right',
  Space     : 'nitro',
  ShiftLeft : 'hand',
  ShiftRight: 'hand',
  Escape    : 'pause',
  KeyP      : 'pause',
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

// ── Edge-detect helpers ────────────────────────────────
// Call this from player.js once per tick to atomically read &
// clear the "Space just pressed" flag. Guarantees one nitro
// activation per physical key press.
export function consumeNitroPress() {
  if (K._locked) { K.nitroPressed = false; return false; }
  const v = K.nitroPressed;
  K.nitroPressed = false;
  return v;
}

export function initInput() {
  window.addEventListener('keydown', e => {
    if (BLK.has(e.code)) e.preventDefault();

    const action = KM[e.code];
    if (!action) return;

    // Edge detect: only set the one-shot flag on the initial
    // press, not on auto-repeat (e.repeat === true after hold).
    if (action === 'nitro' && !K.nitro && !e.repeat) {
      K.nitroPressed = true;
    }

    if (action === 'down' && !K.down && !e.repeat) {
  K.downPressed = true;
}

    K[action] = true;
  });

  window.addEventListener('keyup', e => {
    const action = KM[e.code];
    if (action) K[action] = false;
  });


}

export function consumeDownPress() {
  if (K._locked) {
    K.downPressed = false;
    return false;
  }

  const v = K.downPressed;
  K.downPressed = false;
  return v;
}

export function bindTouch(id, key) {
  const el = document.getElementById(id);
  if (!el) return;

  const on  = (e) => {
    e.preventDefault();
    // Mirror keydown edge detection for on-screen Space button.
    if (key === 'nitro' && !K.nitro) K.nitroPressed = true;
    K[key] = true;
    el.classList.add('pr');
  };
  const off = (e) => {
    e.preventDefault();
    K[key] = false;
    el.classList.remove('pr');
  };

  el.addEventListener('touchstart',  on,  {passive:false});
  el.addEventListener('touchend',    off, {passive:false});
  el.addEventListener('touchcancel', off, {passive:false});
  el.addEventListener('mousedown',  on);
  el.addEventListener('mouseup',    off);
  el.addEventListener('mouseleave', off);
}