// ═══════════════════════════════════════════════════════
// CAREER SCENE — Level select screen. Locked levels can't
// be played until previous one is completed.
// ═══════════════════════════════════════════════════════
import { show }                              from '../systems/gameState.js';
import { getPlayerData, isLevelUnlocked }    from '../player/playerData.js';

import level1 from '../levels/level1/index.js';
// import level2 from '../levels/level2/index.js';
// import level3 from '../levels/level3/index.js';

const LEVELS = [
  { num: 1, name: 'Forest Fork',  module: level1 },
  { num: 2, name: 'Desert Drift', module: null   }, // null = not available yet
  { num: 3, name: 'Ice Canyon',   module: null   },
];

export class CareerScene {
  constructor(sceneManager) {
    this.scenes = sceneManager;
    this._wired = false;
  }

  enter() {
    show('career');
    this._refreshStats();
    this._buildGrid();
    this._wireOnce();
  }

  exit() {}

  _refreshStats() {
    const d = getPlayerData();
    const c = document.getElementById('career-coins');
    const k = document.getElementById('career-keys');
    if (c) c.textContent = d.coins.toLocaleString();
    if (k) k.textContent = d.keys.toLocaleString();
  }

  _buildGrid() {
    const grid = document.getElementById('level-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const data = getPlayerData();

    for (const lvl of LEVELS) {
      const card = document.createElement('div');
      card.className = 'level-card';

      const unlocked  = isLevelUnlocked(lvl.num) && lvl.module !== null;
      const completed = data.completedLevels.includes(lvl.num);

      if (!unlocked) {
        card.classList.add('locked');
        card.innerHTML = `
          <div class="lock-ico">🔒</div>
          <div class="name">Level ${lvl.num}</div>
        `;
        card.addEventListener('click', () => {
          card.classList.remove('shake');
          void card.offsetWidth;
          card.classList.add('shake');
        });
      } else {
        if (completed) card.classList.add('completed');
        const best = data.bestTimes['level' + lvl.num];
        card.innerHTML = `
          <div class="num">${lvl.num}</div>
          <div class="name">${lvl.name}</div>
          ${best ? `<div class="best-time">★ ${best.toFixed(1)}s</div>` : ''}
        `;
        card.addEventListener('click', () => {
          this.scenes.go('game', lvl.module);
        });
      }
      grid.appendChild(card);
    }
  }

  _wireOnce() {
    if (this._wired) return;
    this._wired = true;
    document.getElementById('btn-career-back')?.addEventListener('click', () => this.scenes.go('hub'));
  }
}