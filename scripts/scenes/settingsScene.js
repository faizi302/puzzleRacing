// ═══════════════════════════════════════════════════════
// SETTINGS SCENE — Sound, music, fullscreen toggles +
// help / controls reference + reset progress.
// ═══════════════════════════════════════════════════════
import { show }                             from '../systems/gameState.js';
import { getSetting, updateSetting,
         resetPlayerData }                  from '../player/playerData.js';

export class SettingsScene {
  constructor(sceneManager) {
    this.scenes = sceneManager;
    this._wired = false;
  }

  enter() {
    show('settings');
    this._syncToggles();
    this._wireOnce();
  }

  exit() {}

  _syncToggles() {
    const set = (id, on) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('on', !!on);
    };
    set('tog-sound',     getSetting('soundOn'));
    set('tog-music',     getSetting('musicOn'));
    set('tog-fullscreen',getSetting('fullscreen'));
  }

  _wireOnce() {
    if (this._wired) return;
    this._wired = true;

    const flip = (id, key, onChange) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', () => {
        const next = !getSetting(key);
        updateSetting(key, next);
        el.classList.toggle('on', next);
        if (onChange) onChange(next);
      });
    };

    flip('tog-sound', 'soundOn');
    flip('tog-music', 'musicOn', (on) => {
      // Hook into your audio system here if desired
      try {
        if (!on) {
          import('../core/audio.js').then(m => m.stopMusic && m.stopMusic());
        }
      } catch (e) {}
    });
    flip('tog-fullscreen', 'fullscreen', (on) => {
      try {
        if (on && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        } else if (!on && document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen();
        }
      } catch (e) {}
    });

    document.getElementById('btn-settings-back')?.addEventListener('click', () => this.scenes.go('hub'));

    document.getElementById('btn-reset-data')?.addEventListener('click', () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        resetPlayerData();
        alert('Progress reset.');
        this._syncToggles();
      }
    });
  }
}