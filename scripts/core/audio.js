// ═══════════════════════════════════════════════════════
// AUDIO MANAGER 
// ═══════════════════════════════════════════════════════

const BASE = 'assets/audio/';

const BANK = {
  menuMusic: ['MusicMenu.ogg'],
  raceMusic: ['MusicGameModeRace.ogg'],
  raceOutro: ['MusicGameModeRaceOutro.ogg'],

  button: ['ButtonClick.ogg'],
  sceneOpen: ['ModalIn.ogg'],
  sceneClose: ['ModalOut.ogg'],
  invalid: ['ButtonInvalid.ogg'],

  start: ['GameStart1.ogg', 'GameStart2.ogg', 'GameStart3.ogg'],
  coin: ['Coin1.ogg', 'Coin2.ogg', 'Coin3.ogg', 'Coin4.ogg'],
  nitro: ['BoostActivate1.ogg', 'BoostActivate2.ogg', 'BoostActivate3.ogg', 'BoostActivate4.ogg'],

  engine: ['UnitBIgnition.ogg'],
  brake: ['HudDriftLoop.ogg'],
  screech: ['HudDriftLoop.ogg'],
  crash: ['UnitCollision1.ogg', 'UnitCollision2.ogg', 'UnitCollision3.ogg', 'UnitCollision4.ogg'],

  win: ['Stars3.ogg'],
};

const _cache = new Map();
const _loops = new Map();

let _unlocked = false;
let _muted = false;
let _musicVolume = 0.22;
let _sfxVolume = 0.35;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function preloadAudioBank() {
  for (const key of Object.keys(BANK)) {
    const files = BANK[key];

    for (const file of files) {
      const src = BASE + file;

      if (!_cache.has(src)) {
        const a = makeAudio(src);
        a.load();
        _cache.set(src, a);
      }
    }
  }
}

function getFile(name) {
  const files = BANK[name];
  if (!files) {
    console.warn('[audio] Missing BANK key:', name);
    return null;
  }
  return BASE + pick(files);
}

function makeAudio(src) {
  const a = new Audio(src);
  a.preload = 'auto';
  return a;
}

function getBaseAudio(name) {
  const src = getFile(name);
  if (!src) return null;

  if (!_cache.has(src)) {
    _cache.set(src, makeAudio(src));
  }

  return _cache.get(src);
}

export function unlockAudio() {
  _unlocked = true;

  preloadAudioBank();

  // tiny silent unlock attempt
  const a = getBaseAudio('button');
  if (a) {
    const oldVol = a.volume;
    a.volume = 0;
    a.play().then(() => {
      a.pause();
      a.currentTime = 0;
      a.volume = oldVol;
    }).catch(() => {
      a.volume = oldVol;
    });
  }
}

export function setMuted(v) {
  _muted = !!v;

  for (const [, a] of _loops) {
    a.muted = _muted;
  }
}

export function isMuted() {
  return _muted;
}

export function setMusicVolume(v) {
  _musicVolume = Math.max(0, Math.min(1, v));
  const bg = _loops.get('music');
  if (bg) bg.volume = _musicVolume;
}

export function setSfxVolume(v) {
  _sfxVolume = Math.max(0, Math.min(1, v));
}

// Public: is the loop tagged with this key currently playing?
export function isLoopPlaying(key) {
  const a = _loops.get(key);
  return !!(a && !a.paused && !a.ended);
}

export function playSfx(name, opts = {}) {
  if (_muted) return;
  if (!_unlocked && !opts.force) return;

  const key = opts.key || name;

  // ── Stop branch: hard-kill the named loop ──
  if (opts.stop) {
    const loop = _loops.get(key);
    if (loop) {
      try {
        loop.pause();
        loop.currentTime = 0;
      } catch (e) { }
      _loops.delete(key);
    }
    return;
  }

  const base = getBaseAudio(name);
  if (!base) return;

  // ── Loop branch ──
  // CRITICAL: if a loop with this key already exists, we DO NOT
  // create a second clone. We just update volume / rate. This is
  // what prevents the nitro loop (and engine loop) from stacking
  // on top of itself when callers ping the same key every frame.
  if (opts.loop) {
    let loop = _loops.get(key);

    if (!loop) {
      loop = base.cloneNode(true);
      loop.loop = true;
      loop.volume = opts.volume ?? _sfxVolume;
      loop.muted = _muted;
      _loops.set(key, loop);
    }

    if (opts.volume !== undefined) loop.volume = opts.volume;
    if (opts.rate) loop.playbackRate = opts.rate;

    if (loop.paused) {
      loop.play().catch(() => { });
    }

    return loop;
  }

  // ── One-shot branch ──
  const inst = base.cloneNode(true);
  inst.volume = opts.volume ?? _sfxVolume;
  inst.playbackRate = opts.rate ?? 1;
  inst.muted = _muted;
  inst.play().catch(() => { });
}

export function startMenuMusic() {
  stopMusic();
  const a = playSfx('menuMusic', {
    loop: true,
    key: 'music',
    volume: _musicVolume,
  });
  return a;
}

export function startMusic() {
  stopMusic();
  const a = playSfx('raceMusic', {
    loop: true,
    key: 'music',
    volume: _musicVolume,
  });
  return a;
}

export function stopMusic() {
  playSfx('raceMusic', { stop: true, key: 'music' });
  playSfx('menuMusic', { stop: true, key: 'music' });
}

export function stopAll() {
  for (const [, a] of _loops) {
    try {
      a.pause();
      a.currentTime = 0;
    } catch (e) { }
  }
  _loops.clear();
}

// ─── Engine loop: speed-driven ───────────────────────────
// Below the dead-zone, the engine sound is fully stopped so it
// can never run silently in the background. Above the dead-zone
// the existing loop just has its volume/rate updated — we never
// spawn a second engine source.
export function setEngineSpeed(speed01) {
  // Completely disable engine sound on movement / key press
  playSfx('engine', {
    stop: true,
    key: 'engine',
  });
}

export function setBrakeLoop(active) {
  if (active) {
    playSfx('brake', {
      loop: true,
      key: 'brake',
      volume: 0.06,
    });
  } else {
    playSfx('brake', {
      stop: true,
      key: 'brake',
    });
  }
}

export function initGlobalAudioButtons() {
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  document.addEventListener('click', (e) => {
    const el = e.target.closest('button, .btn, [data-sound="button"]');
    if (!el) return;
    playSfx('button', { volume: 0.16 });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      setBrakeLoop(false);
      setEngineSpeed(0);
      // Also kill the nitro loop if the tab is hidden mid-burn —
      // otherwise it would keep playing while hidden.
      playSfx('nitro', { stop: true, key: 'nitroLoop' });
    }
  });
}