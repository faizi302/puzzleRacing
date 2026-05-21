import { show }                               from '../systems/gameState.js';
import {
  getPlayerData, hasClaimedDaily, claimDaily,
} from '../player/playerData.js';
import {
  toast, rewardBurst, popStat, tweenNumber,
} from '../ui/uifx.js';

function rankFor(completed) {
  if (completed >= 3) return 'LEGEND';
  if (completed >= 2) return 'PRO';
  if (completed >= 1) return 'RACER';
  return 'NOVICE';
}

export class MenuScene {
  constructor(sceneManager) {
    this.scenes = sceneManager;
    this._wired = false;
  }

  enter() {
    show('menu');
    this._refresh();
    this._wireOnce();
  }

  exit() {}

  _refresh() {
    const d = getPlayerData();

    // Profile chip
    const nameEl = document.getElementById('profile-name');
    const lvlEl  = document.getElementById('profile-level');
    const avEl   = document.getElementById('avatar-text');
    if (nameEl) nameEl.textContent = (d.profileName || 'RACER').toUpperCase();
    if (lvlEl)  lvlEl.textContent  = `LV ${Math.max(1, d.completedLevels.length + 1)} · ${rankFor(d.completedLevels.length)}`;
    if (avEl)   avEl.textContent   = (d.profileName || 'P1').slice(0, 2).toUpperCase();

    // Currency tween-in
    tweenNumber('menu-coins', d.coins, 700);
    tweenNumber('menu-gems',  d.gems,  700);

    // Daily badge — hide if already claimed today
    const dailyBadge = document.querySelector('#q-daily .badge');
    if (dailyBadge) dailyBadge.style.display = hasClaimedDaily() ? 'none' : '';
  }

  _wireOnce() {
    if (this._wired) return;
    this._wired = true;

    // ─ Primary actions ─
    document.getElementById('btn-start')?.addEventListener('click', () => {
      this.scenes.go('hub');
    });

    document.getElementById('btn-continue')?.addEventListener('click', () => {
      // Continue = jump straight into career level select
      this.scenes.go('career');
    });

    document.getElementById('btn-howto')?.addEventListener('click', () => {
      show('howto');
    });

    document.getElementById('btn-back')?.addEventListener('click', () => {
      show('menu');
    });

    // ─ Quick-action tiles ─
    document.getElementById('q-daily')?.addEventListener('click', () => {
      if (hasClaimedDaily()) {
        toast('Daily reward already claimed. Come back tomorrow!');
        return;
      }
      const ok = claimDaily();
      if (ok) {
        rewardBurst('+100 🪙  DAILY REWARD');
        popStat('menu-coins');
        this._refresh();
      }
    });

    document.getElementById('q-events')?.addEventListener('click', () => {
      toast('Events coming soon — stay tuned!');
    });
    document.getElementById('q-store')?.addEventListener('click', () => {
      toast('Store coming soon!');
    });
    document.getElementById('q-leaderboard')?.addEventListener('click', () => {
      toast('Leaderboards coming soon!');
    });

    // Profile chip — placeholder edit hook
    document.getElementById('profile-chip')?.addEventListener('click', () => {
      toast('Profile editing coming soon!');
    });
  }

  // Backwards-compat hooks (legacy menuScene exposed these)
  showHowTo() { show('howto'); }
  showMain()  { show('menu');  }
}