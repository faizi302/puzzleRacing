// ═══════════════════════════════════════════════════════
// HUB SCENE — Central navigation hub.
// Shows coins, keys, and 4 main options:
//   Career, Garage, Settings, How to Play
// ═══════════════════════════════════════════════════════
import { show }            from '../systems/gameState.js';
import { getPlayerData }   from '../player/playerData.js';

export class HubScene {
  constructor(sceneManager) {
    this.scenes = sceneManager;
    this._wired = false;
  }

  enter() {
    show('hub');
    this._refreshStats();
    this._wireOnce();
  }

  exit() {}

  _refreshStats() {
    const d = getPlayerData();
    const coinsEl = document.getElementById('hub-coins');
    const keysEl  = document.getElementById('hub-keys');
    const progEl  = document.getElementById('hub-career-progress');
    if (coinsEl) coinsEl.textContent = d.coins.toLocaleString();
    if (keysEl)  keysEl.textContent  = d.keys.toLocaleString();
    if (progEl)  progEl.textContent  = `${d.completedLevels.length} / 3 Levels`;
  }

  _wireOnce() {
    if (this._wired) return;
    this._wired = true;

    document.getElementById('hub-career')  ?.addEventListener('click', () => this.scenes.go('career'));
    document.getElementById('hub-garage')  ?.addEventListener('click', () => this.scenes.go('garage'));
    document.getElementById('hub-settings')?.addEventListener('click', () => this.scenes.go('settings'));
    document.getElementById('hub-help')    ?.addEventListener('click', () => this.scenes.go('settings'));
    document.getElementById('btn-hub-back')?.addEventListener('click', () => this.scenes.go('menu'));
  }
}