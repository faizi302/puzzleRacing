// ═══════════════════════════════════════════════════════
// HUB SCENE — Central nav. Shows currencies, mission cards,
// daily login reward panel, and 4 routes:
//   Career, Garage, Settings, How-to-play
// ═══════════════════════════════════════════════════════
import { show } from '../systems/gameState.js';
import { getPlayerData, getMissions } from '../player/playerData.js';
import { tweenNumber } from '../ui/uiFX.js';

export class HubScene {
  constructor(sceneManager) {
    this.scenes = sceneManager;
    this._wired = false;
  }

  enter() {
    show('hub');
    this._refresh();
    this._wireOnce();
  }

  exit() { }

  _refresh() {
    const d = getPlayerData();

    tweenNumber('hub-coins', d.coins);
    tweenNumber('hub-keys', d.keys);
    tweenNumber('hub-gems', d.gems);

    const TOTAL_LEVELS = 5;
    const prog = document.getElementById('hub-career-progress');

    if (prog) {
      prog.textContent = `${d.completedLevels.length} / ${TOTAL_LEVELS} LEVELS`;
    }

    const streak = document.getElementById('login-streak');
    if (streak) streak.textContent = String(d.loginStreak || 1);

    const m = getMissions();
    this._setMission('mr-1', m.race1.done);
    this._setMission('mr-2', m.keys5.done, `Collect 5 keys (${m.keys5.progress || 0}/5)`);
    this._setMission('mr-3', m.beatBest.done);
  }

  _setMission(rowId, done, overrideLabel) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const check = row.querySelector('.check');
    if (check) check.textContent = done ? '✓' : '○';
    row.classList.toggle('done', !!done);
    if (overrideLabel) {
      const span = row.querySelector('span:not(.reward):not(.check)');
      if (span) span.textContent = overrideLabel;
    }
  }

  _wireOnce() {
    if (this._wired) return;
    this._wired = true;

    document.getElementById('hub-career')?.addEventListener('click', () => this.scenes.go('career'));
    document.getElementById('hub-garage')?.addEventListener('click', () => this.scenes.go('garage'));
    document.getElementById('hub-settings')?.addEventListener('click', () => this.scenes.go('settings'));
    document.getElementById('hub-help')?.addEventListener('click', () => show('howto'));
    document.getElementById('btn-hub-back')?.addEventListener('click', () => this.scenes.go('menu'));
  }
}