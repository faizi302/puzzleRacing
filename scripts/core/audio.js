// ═══════════════════════════════════════════════════════
// AUDIO MANAGER — All game SFX & music
// ═══════════════════════════════════════════════════════
// Place audio files in: assets/audio/
//   bg.mp3       — looping background music (in-race)
//   start.mp3    — countdown / "GO!"
//   coin.mp3     — coin pickup
//   nitro.mp3    — booster pickup / nitro engage
//   crash.mp3    — wall / scenery crash
//   screech.mp3  — looping tyre screech (off-road / handbrake)
//   engine.mp3   — looping engine hum (volume tracks speed)
//   win.mp3      — race finished jingle
//
// Multiple file extensions are tried per name. Missing files → silent.
// ═══════════════════════════════════════════════════════

const EXT = ['.mp3','.ogg','.wav','.m4a'];
const DIRS = ['assets/fassets/audio','audio/','assets/'];

const _cache = new Map();   // key → HTMLAudioElement (or array for instances)
const _active = new Map();  // key id → currently-playing instance (loops)

let _muted = false;
let _ready = false;

export function unlockAudio() {
  // Browsers require a user gesture before audio can play. Call this from
  // any click handler (the START button is a good place).
  _ready = true;
}

export function setMuted(v) { _muted = !!v; }

function tryLoad(name) {
  return new Promise((resolve) => {
    let i = 0;
    const tryNext = () => {
      if (i >= DIRS.length * EXT.length) return resolve(null);
      const dir = DIRS[(i / EXT.length) | 0];
      const ext = EXT[i % EXT.length];
      i++;
      const a = new Audio();
      a.preload = 'auto';
      a.addEventListener('canplaythrough', () => resolve(a), { once:true });
      a.addEventListener('error', tryNext, { once:true });
      a.src = dir + name + ext;
    };
    tryNext();
  });
}

async function getAudio(name) {
  if (_cache.has(name)) return _cache.get(name);
  const p = tryLoad(name);
  _cache.set(name, p);
  const audio = await p;
  _cache.set(name, audio); // replace promise with element (or null)
  return audio;
}

// Play a one-shot SFX or control a looping channel.
//
//   playSfx('coin');                                 // one-shot
//   playSfx('bg',     { loop:true, volume:.45 });    // start music
//   playSfx('engine', { loop:true, key:'engine' });  // tracked loop
//   playSfx('engine', { stop:true, key:'engine' });  // stop tracked loop
//   playSfx('engine', { volume:0.7, key:'engine' }); // adjust volume
export async function playSfx(name, opts = {}) {
  if (_muted) return;
  const key = opts.key || name;

  if (opts.stop) {
    const cur = _active.get(key);
    if (cur) { try { cur.pause(); cur.currentTime = 0; } catch(e){} _active.delete(key); }
    return;
  }

  const base = await getAudio(name);
  if (!base) return;

  if (opts.loop) {
    let inst = _active.get(key);
    if (!inst) {
      inst = base.cloneNode(true);
      inst.loop = true;
      _active.set(key, inst);
    }
    inst.volume = opts.volume ?? 0.6;
    if (inst.paused) {
      try { await inst.play(); } catch(e){}
    }
    return;
  }

  // One-shot — clone so concurrent plays don't cut each other off.
  const inst = base.cloneNode(true);
  inst.volume = opts.volume ?? 0.7;
  try { inst.play(); } catch(e){}
}

export function stopAll() {
  for (const [, inst] of _active) {
    try { inst.pause(); inst.currentTime = 0; } catch(e){}
  }
  _active.clear();
}

// Convenience helpers for common loops.
export function setEngineSpeed(speed01) {
  // speed01: 0..1 (player speed / NITRO_MAX). Mute below 0.05.
  if (_muted) return;
  if (speed01 < 0.05) {
    playSfx('engine', { stop:true, key:'engine' });
    return;
  }
  const vol = 0.15 + speed01 * 0.45;
  playSfx('engine', { loop:true, volume:vol, key:'engine' });
  const inst = _active.get('engine');
  if (inst) inst.playbackRate = 0.85 + speed01 * 0.55;
}

export function startMusic() {
  playSfx('bg', { loop:true, volume:0.35, key:'bg' });
}
export function stopMusic() { playSfx('bg', { stop:true, key:'bg' }); }