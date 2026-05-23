import { show } from '../systems/gameState.js';
import { getPlayerData, isLevelUnlocked } from '../player/playerData.js';
import { renderLevelPreview } from '../ui/levelPreview.js';
import { toast, shake, tweenNumber } from '../ui/Uifx.js';

import level1 from '../levels/level1/index.js';
import level2 from '../levels/level2/index.js';
import level3 from '../levels/level3/index.js';
import level4 from '../levels/level4/index.js';
import level5 from '../levels/level5/index.js';

const LEVELS = [
  {
    num: 1, name: 'Forest Fork', biome: 'forest',
    module: level1,
    difficulty: 'EASY',
    mission: 'Reach the finish line — find the secret fork',
    reward: '100+ 🪙',
    gold: 100, silver: 80,
  },
  {
    num: 2, name: 'Canada Rally', biome: 'city',
    module: level2,
    difficulty: 'MEDIUM',
    mission: 'Drift without crashing',
    reward: '200+ 🪙',
    gold: 200, silver: 95,
  },
  {
    num: 3, name: 'Desert Rally', biome: 'desert',
    module: level3,
    difficulty: 'HARD',
    mission: 'Master traction in desert roads',
    reward: '300+ 🪙',
    gold: 300, silver: 110,
  },
  {
    num: 4, name: 'Ice Canyon', biome: 'ice',
    module: level4,
    difficulty: 'VERY HARD',
    mission: 'Master the final frozen road',
    reward: '350+ 🪙',
    gold: 400, silver: 130,
  },
  {
    num: 5, name: 'The Blue Route', biome: 'city canon',
    module: level5,
    difficulty: 'EXTREME',
    mission: 'Over come the hurldles to be Champ',
    reward: '400+ 🪙',
    gold: 500, silver: 150,
  },
];

function diffClass(d) {
  if (d === 'EASY') return 'diff-easy';
  if (d === 'MEDIUM') return 'diff-medium';
  return 'diff-hard';
}

function starsForTime(t, level) {
  if (!t) return 0;
  if (t <= level.gold) return 3;
  if (t <= level.silver) return 2;
  return 1;
}

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

  exit() { }

  _refreshStats() {
    const d = getPlayerData();
    tweenNumber('career-coins', d.coins);
    tweenNumber('career-keys', d.keys);
  }

  _buildGrid() {
    const grid = document.getElementById('level-grid');
    if (!grid) return;
    grid.innerHTML = '';

    grid.parentElement?.querySelector('.level-nav-left')?.remove();
    grid.parentElement?.querySelector('.level-nav-right')?.remove();

    const leftBtn = document.createElement('button');
    leftBtn.className = 'level-nav level-nav-left';
    leftBtn.textContent = '◀';

    const rightBtn = document.createElement('button');
    rightBtn.className = 'level-nav level-nav-right';
    rightBtn.textContent = '▶';

    leftBtn.addEventListener('click', () => {
      grid.scrollTo({ left: 0, behavior: 'smooth' });
    });

    rightBtn.addEventListener('click', () => {
      grid.scrollTo({ left: grid.scrollWidth, behavior: 'smooth' });
    });

    grid.parentElement?.appendChild(leftBtn);
    grid.parentElement?.appendChild(rightBtn);

    const data = getPlayerData();

    const LEVEL_UNLOCK_MODE = 'progress'; // 'all_open' | 'progress' | 'manual' | 'hybrid'

    const MANUAL_UNLOCKED_LEVELS = [1, 2,5];

    for (const lvl of LEVELS) {
      const card = document.createElement('div');
      card.className = 'level-card';

      let unlocked = false;

      if (LEVEL_UNLOCK_MODE === 'all_open') {
        unlocked = true;
      } else if (LEVEL_UNLOCK_MODE === 'progress') {
        unlocked = isLevelUnlocked(lvl.num);
      } else if (LEVEL_UNLOCK_MODE === 'manual') {
        unlocked = MANUAL_UNLOCKED_LEVELS.includes(lvl.num);
      } else if (LEVEL_UNLOCK_MODE === 'hybrid') {
        unlocked =
          MANUAL_UNLOCKED_LEVELS.includes(lvl.num) ||
          isLevelUnlocked(lvl.num);
      }

      unlocked = unlocked && lvl.module !== null;
      const completed = data.completedLevels.includes(lvl.num);
      const best = data.bestTimes['level' + lvl.num];
      const stars = starsForTime(best, lvl);

      if (completed) card.classList.add('completed');

      card.innerHTML = `
        <div class="lc-preview" data-preview="${lvl.num}">
          <div class="biome-tag">${lvl.biome.toUpperCase()}</div>
          <div class="num-badge">${lvl.num}</div>
        </div>
        <div class="lc-body">
          <div class="lc-head">
            <div class="lc-name">${lvl.name}</div>
            <div class="lc-chips">
              <span class="lc-chip ${diffClass(lvl.difficulty)}">${lvl.difficulty}</span>
              <span class="lc-chip reward">${lvl.reward}</span>
            </div>
          </div>
          <div class="lc-mission">${lvl.mission}</div>
          <div class="lc-stars">
            <span class="star ${stars >= 1 ? 'on' : ''}">★</span>
            <span class="star ${stars >= 2 ? 'on' : ''}">★</span>
            <span class="star ${stars >= 3 ? 'on' : ''}">★</span>
          </div>
          <div class="lc-best">${best ? `BEST · ${best.toFixed(2)}s` : 'NO RECORD'}</div>
          <div class="lc-cta">${unlocked ? '▶ START RACE' : '🔒 LOCKED'}</div>
        </div>
        ${!unlocked ? `
          <div class="lock-overlay">
            <div class="lk">🔒</div>
            <div class="lk-text">Complete previous level to unlock</div>
          </div>` : ''}
      `;

      // Render the procedural mini-map (now uses the real
      // road shape from `lvl.module.buildRoads()` when available).
      const mount = card.querySelector('.lc-preview');
      renderLevelPreview(mount, {
        seed: lvl.num * 17 + 3,
        biome: lvl.biome,
        levelNum: lvl.num,
        module: lvl.module,
      });

      if (unlocked) {
        card.addEventListener('click', () => {
          this.scenes.go('game', lvl.module);
        });
      } else {
        card.classList.add('locked');
        card.addEventListener('click', () => {
          shake(card);
          toast(`Level ${lvl.num} is locked. Finish level ${lvl.num - 1} first.`);
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