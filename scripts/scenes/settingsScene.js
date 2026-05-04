// ═══════════════════════════════════════════════════════
// SETTINGS SCENE — Audio, display, controls.
// Fully wired into core/audio.js so toggles take effect live.
// ─────────────────────────────────────────────────────
// Setting          │ playerData key │ audio.js call
// ─────────────────┼────────────────┼─────────────────────
// Sound on/off     │ soundOn        │ setMuted(!on)
// SFX volume       │ sfxVolume      │ setSfxVolume(v/100)
// Music on/off     │ musicOn        │ startMenuMusic / stopMusic
// Music volume     │ musicVolume    │ setMusicVolume(v/100)
// Fullscreen       │ fullscreen     │ requestFullscreen / exit
// Vibration        │ vibration      │ navigator.vibrate(60) test
// Graphics preset  │ graphics       │ (read by render layer)
// Controls scheme  │ controls       │ (read by input layer)
// ═══════════════════════════════════════════════════════
import { show }                                    from '../systems/gameState.js';
import {
  getSetting, updateSetting, resetPlayerData,
} from '../player/playerData.js';
import {
  setMuted, setSfxVolume, setMusicVolume,
  startMenuMusic, stopMusic, playSfx,
} from '../core/audio.js';
import { toast } from '../ui/uiFX.js';

export class SettingsScene {
  constructor(sceneManager) {
    this.scenes = sceneManager;
    this._wired = false;
  }

  enter() {
    show('settings');
    this._sync();
    this._wireOnce();
  }

  exit() {}

  _sync() {
    // Toggles
    const setTog = (id, on) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('on', !!on);
    };
    setTog('tog-sound',      getSetting('soundOn'));
    setTog('tog-music',      getSetting('musicOn'));
    setTog('tog-fullscreen', !!document.fullscreenElement);
    setTog('tog-vibration',  getSetting('vibration'));

    // Sliders
    const sfx = document.getElementById('sl-sfx');
    if (sfx) sfx.value = getSetting('sfxVolume') ?? 75;
    const mus = document.getElementById('sl-music');
    if (mus) mus.value = getSetting('musicVolume') ?? 35;

    // Segmented controls
    this._setSeg('seg-graphics', 'data-q', getSetting('graphics') || 'med');
    this._setSeg('seg-controls', 'data-c', getSetting('controls') || 'auto');

    // Apply current values to live audio engine
    setMuted(!getSetting('soundOn'));
    setSfxVolume((getSetting('sfxVolume') ?? 75) / 100);
    setMusicVolume((getSetting('musicVolume') ?? 35) / 100);
  }

  _setSeg(segId, attr, value) {
    const seg = document.getElementById(segId);
    if (!seg) return;
    seg.querySelectorAll('button').forEach(b => {
      b.classList.toggle('on', b.getAttribute(attr) === value);
    });
  }

  _wireOnce() {
    if (this._wired) return;
    this._wired = true;

    // ─ Sound toggle ─
    document.getElementById('tog-sound')?.addEventListener('click', (e) => {
      const on = !getSetting('soundOn');
      updateSetting('soundOn', on);
      e.currentTarget.classList.toggle('on', on);
      setMuted(!on);
      if (on) {
        try { playSfx('button', { volume: 0.6, force: true }); } catch (_) {}
      }
    });

    // ─ Music toggle ─
    document.getElementById('tog-music')?.addEventListener('click', (e) => {
      const on = !getSetting('musicOn');
      updateSetting('musicOn', on);
      e.currentTarget.classList.toggle('on', on);
      try {
        if (on) startMenuMusic();
        else    stopMusic();
      } catch (_) {}
    });

    // ─ Fullscreen toggle ─
    const fsTog = document.getElementById('tog-fullscreen');
    fsTog?.addEventListener('click', () => {
      try {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().then(() => {
            updateSetting('fullscreen', true);
          }).catch(() => toast('Fullscreen not supported in this browser'));
        } else {
          document.exitFullscreen?.();
          updateSetting('fullscreen', false);
        }
      } catch (_) {
        toast('Fullscreen not supported in this browser');
      }
    });
    document.addEventListener('fullscreenchange', () => {
      const on = !!document.fullscreenElement;
      updateSetting('fullscreen', on);
      fsTog?.classList.toggle('on', on);
    });

    // ─ Vibration toggle ─
    document.getElementById('tog-vibration')?.addEventListener('click', (e) => {
      const on = !getSetting('vibration');
      updateSetting('vibration', on);
      e.currentTarget.classList.toggle('on', on);
      if (on && navigator.vibrate) {
        try { navigator.vibrate(60); } catch (_) {}
      }
    });

    // ─ SFX volume slider ─
    const sfx = document.getElementById('sl-sfx');
    sfx?.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      updateSetting('sfxVolume', v);
      setSfxVolume(v / 100);
    });
    sfx?.addEventListener('change', () => {
      try { playSfx('coin', { volume: (getSetting('sfxVolume') / 100) }); } catch (_) {}
    });

    // ─ Music volume slider ─
    const mus = document.getElementById('sl-music');
    mus?.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      updateSetting('musicVolume', v);
      setMusicVolume(v / 100);
    });

    // ─ Graphics segmented ─
    document.getElementById('seg-graphics')
      ?.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const q = btn.getAttribute('data-q');
          updateSetting('graphics', q);
          this._setSeg('seg-graphics', 'data-q', q);
        });
      });

    // ─ Controls segmented ─
    document.getElementById('seg-controls')
      ?.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const c = btn.getAttribute('data-c');
          updateSetting('controls', c);
          this._setSeg('seg-controls', 'data-c', c);
        });
      });

    // ─ Reset ─
    document.getElementById('btn-reset-data')?.addEventListener('click', () => {
      if (confirm('Reset all progress, coins, cars and settings? This cannot be undone.')) {
        resetPlayerData();
        toast('Progress reset.');
        this._sync();
      }
    });

    document.getElementById('btn-settings-back')?.addEventListener('click', () => this.scenes.go('hub'));
  }
}