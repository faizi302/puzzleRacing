
export const K = {
  up: false, down: false, left: false, right: false,
  hand: false, nitro: false, pause: false,
  _locked: false, downPressed: false,

  // ── Edge-detected one-shot flag for Space (nitro) ──
  // Set true on keydown, cleared by consumeNitroPress().
  nitroPressed: false,
};

const DEFAULT_KEYMAP = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  nitro: ['Space'],
  hand: ['ShiftLeft', 'ShiftRight'],
  pause: ['Escape', 'KeyP'],
};

let USER_KEYMAP = loadKeyMap();

function loadKeyMap() {
  try {
    const raw = localStorage.getItem('puzzleracing_keymap_v1');
    const saved = raw ? JSON.parse(raw) : {};

    return {
      up: saved.up || DEFAULT_KEYMAP.up,
      down: saved.down || DEFAULT_KEYMAP.down,
      left: saved.left || DEFAULT_KEYMAP.left,
      right: saved.right || DEFAULT_KEYMAP.right,
      nitro: saved.nitro || DEFAULT_KEYMAP.nitro,
      hand: saved.hand || DEFAULT_KEYMAP.hand,
      pause: saved.pause || DEFAULT_KEYMAP.pause,
    };
  } catch {
    return structuredClone(DEFAULT_KEYMAP);
  }
}

function actionForCode(code) {
  for (const [action, codes] of Object.entries(USER_KEYMAP)) {
    if (codes.includes(code)) return action;
  }
  return null;
}

export function setControlKey(action, code) {
  if (!DEFAULT_KEYMAP[action]) return false;

  // remove this key from other actions
  for (const a of Object.keys(USER_KEYMAP)) {
    USER_KEYMAP[a] = USER_KEYMAP[a].filter(c => c !== code);
  }

  USER_KEYMAP[action] = [code];
  localStorage.setItem('puzzleracing_keymap_v1', JSON.stringify(USER_KEYMAP));
  return true;
}

export function resetControls() {
  USER_KEYMAP = structuredClone(DEFAULT_KEYMAP);
  localStorage.setItem('puzzleracing_keymap_v1', JSON.stringify(USER_KEYMAP));
}

export function getControlKeys() {
  return USER_KEYMAP;
}

function shouldBlock(code) {
  return !!actionForCode(code);
}

export function readInput() {
  if (K._locked) {
    return { up: false, down: false, left: false, right: false, hand: false, pause: false };
  }
  return { up: K.up, down: K.down, left: K.left, right: K.right, hand: K.hand, pause: K.pause };
}

export function lockInput(v = true) { K._locked = !!v; }
export function isInputLocked() { return K._locked; }

export function consumeNitroPress() {
  if (K._locked) { K.nitroPressed = false; return false; }
  const v = K.nitroPressed;
  K.nitroPressed = false;
  return v;
}

export function initInput() {
  window.addEventListener('keydown', e => {
    if (shouldBlock(e.code)) e.preventDefault();

    const action = actionForCode(e.code);
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
    const action = actionForCode(e.code);
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

  const on = (e) => {
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

  el.addEventListener('touchstart', on, { passive: false });
  el.addEventListener('touchend', off, { passive: false });
  el.addEventListener('touchcancel', off, { passive: false });
  el.addEventListener('mousedown', on);
  el.addEventListener('mouseup', off);
  el.addEventListener('mouseleave', off);
}