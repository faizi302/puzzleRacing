// ═══════════════════════════════════════════════════════
// GARAGE SCENE — Car selection with animated stat bars,
// swap animation, upgrade purchase, lock/unlock pricing.
// ═══════════════════════════════════════════════════════
import { show }                                from '../systems/gameState.js';
import {
  getPlayerData, selectCar, unlockCar, spendCoins, savePlayerData,
} from '../player/playerData.js';
import { toast, shake, tweenNumber, rewardBurst } from '../ui/uiFX.js';

const CARS = [
  {
    id: 'car1', icon: '🏎️', name: 'RACER ONE', cls: 'CLASS · STARTER',
    speed: 3, grip: 3, nitro: 3, dura: 3,
    price: 0,
  },
  {
    id: 'car2', icon: '🚗', name: 'NITRO BEAST', cls: 'CLASS · SPORT',
    speed: 5, grip: 2, nitro: 5, dura: 3,
    price: 1500,
  },
  {
    id: 'car3', icon: '🏁', name: 'DRIFT KING', cls: 'CLASS · DRIFT',
    speed: 4, grip: 5, nitro: 3, dura: 4,
    price: 3500,
  },
];

const UPGRADE_COST = 500;
const STAT_KEYS    = ['speed', 'grip', 'nitro', 'dura'];

function pct(v) { return Math.max(0, Math.min(100, v * 20)); } // 5 = 100%

export class GarageScene {
  constructor(sceneManager) {
    this.scenes = sceneManager;
    this._wired = false;
    this._idx   = 0;
  }

  enter() {
    show('garage');
    const d = getPlayerData();
    const i = CARS.findIndex(c => c.id === d.selectedCar);
    this._idx = i >= 0 ? i : 0;
    this._render(false);
    this._wireOnce();
    tweenNumber('garage-coins', d.coins);
  }

  exit() {}

  _statsFor(carId) {
    const base = CARS.find(c => c.id === carId);
    const upg  = (getPlayerData().carUpgrades || {})[carId] || {};
    const out  = {};
    for (const k of STAT_KEYS) {
      out[k] = Math.min(5, (base[k] || 0) + (upg[k] || 0));
    }
    return out;
  }

  _render(animate = true) {
    const car   = CARS[this._idx];
    const data  = getPlayerData();
    const owned = data.unlockedCars.includes(car.id);
    const isSel = data.selectedCar === car.id;
    const stats = this._statsFor(car.id);

    // Car icon swap animation
    const iconEl = document.getElementById('garage-car-icon');
    if (iconEl) {
      if (animate) {
        iconEl.classList.add('swap-out');
        setTimeout(() => {
          iconEl.textContent = car.icon;
          iconEl.classList.remove('swap-out');
          iconEl.classList.add('swap-in');
          setTimeout(() => iconEl.classList.remove('swap-in'), 600);
        }, 220);
      } else {
        iconEl.textContent = car.icon;
      }
    }

    // Name + class
    const nameEl = document.getElementById('garage-car-name');
    if (nameEl) nameEl.textContent = car.name + (owned ? '' : ' 🔒');
    const clsEl = document.getElementById('garage-car-class');
    if (clsEl)  clsEl.textContent = car.cls;

    // Stat bars (numeric label + bar fill)
    for (const k of STAT_KEYS) {
      const v = stats[k];
      const lab = document.getElementById('stat-' + k);
      const bar = document.getElementById('bar-' + k);
      if (lab) lab.textContent = `${v}/5`;
      if (bar) bar.style.width = pct(v) + '%';
    }

    // Select button states
    const selBtn = document.getElementById('btn-car-select');
    if (selBtn) {
      if (!owned) {
        selBtn.textContent = `🔓 UNLOCK · ${car.price} 🪙`;
        selBtn.disabled    = false;
        selBtn.classList.remove('pr');
      } else if (isSel) {
        selBtn.textContent = 'SELECTED ✓';
        selBtn.disabled    = true;
        selBtn.classList.add('pr');
      } else {
        selBtn.textContent = 'SELECT';
        selBtn.disabled    = false;
        selBtn.classList.add('pr');
      }
    }

    // Upgrade button — disabled if not owned or all stats maxed
    const upgBtn = document.getElementById('btn-car-upgrade');
    if (upgBtn) {
      const allMax = STAT_KEYS.every(k => stats[k] >= 5);
      upgBtn.disabled    = !owned || allMax;
      upgBtn.textContent = allMax ? '★ MAXED' : `⚡ UPGRADE · ${UPGRADE_COST} 🪙`;
    }
  }

  _doSelect() {
    const car  = CARS[this._idx];
    const data = getPlayerData();
    const owned = data.unlockedCars.includes(car.id);

    if (!owned) {
      // Try to purchase
      if (data.coins < car.price) {
        toast(`Need ${car.price - data.coins} more coins to unlock.`);
        shake('btn-car-select');
        return;
      }
      if (spendCoins(car.price)) {
        unlockCar(car.id);
        selectCar(car.id);
        rewardBurst(`UNLOCKED · ${car.name}`);
        tweenNumber('garage-coins', getPlayerData().coins);
        this._render(false);
      }
      return;
    }

    if (selectCar(car.id)) {
      toast(`${car.name} selected.`);
      this._render(false);
    }
  }

  _doUpgrade() {
    const car  = CARS[this._idx];
    const data = getPlayerData();
    if (!data.unlockedCars.includes(car.id)) {
      toast('Unlock the car first.');
      return;
    }
    if (data.coins < UPGRADE_COST) {
      toast(`Need ${UPGRADE_COST - data.coins} more coins to upgrade.`);
      shake('btn-car-upgrade');
      return;
    }
    const stats = this._statsFor(car.id);
    const candidates = STAT_KEYS.filter(k => stats[k] < 5);
    if (candidates.length === 0) {
      toast('All stats are already maxed!');
      return;
    }

    // Pick a non-maxed stat at random
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (!spendCoins(UPGRADE_COST)) return;

    if (!data.carUpgrades) data.carUpgrades = {};
    if (!data.carUpgrades[car.id]) data.carUpgrades[car.id] = {};
    data.carUpgrades[car.id][pick] = (data.carUpgrades[car.id][pick] || 0) + 1;
    savePlayerData();

    rewardBurst(`+1 ${pick.toUpperCase()}`);
    tweenNumber('garage-coins', getPlayerData().coins);
    this._render(false);
  }

  _wireOnce() {
    if (this._wired) return;
    this._wired = true;

    document.getElementById('btn-car-prev')?.addEventListener('click', () => {
      this._idx = (this._idx - 1 + CARS.length) % CARS.length;
      this._render(true);
    });
    document.getElementById('btn-car-next')?.addEventListener('click', () => {
      this._idx = (this._idx + 1) % CARS.length;
      this._render(true);
    });
    document.getElementById('btn-car-select') ?.addEventListener('click', () => this._doSelect());
    document.getElementById('btn-car-upgrade')?.addEventListener('click', () => this._doUpgrade());
    document.getElementById('btn-garage-back')?.addEventListener('click', () => this.scenes.go('hub'));
  }
}