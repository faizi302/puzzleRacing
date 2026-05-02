// ═══════════════════════════════════════════════════════
// GARAGE SCENE — Car selection. Cycles through unlocked cars.
// ═══════════════════════════════════════════════════════
import { show }                                  from '../systems/gameState.js';
import { getPlayerData, selectCar }              from '../player/playerData.js';

const CARS = [
  { id: 'car1', name: 'RACER ONE',  speed: 3, grip: 3, nitro: 3 },
  { id: 'car2', name: 'NITRO BEAST',speed: 5, grip: 2, nitro: 5 },
  { id: 'car3', name: 'DRIFT KING', speed: 4, grip: 5, nitro: 3 },
];

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
    this._render();
    this._wireOnce();
  }

  exit() {}

  _render() {
    const car   = CARS[this._idx];
    const data  = getPlayerData();
    const owned = data.unlockedCars.includes(car.id);
    const isSel = data.selectedCar === car.id;

    const nameEl = document.getElementById('garage-car-name');
    if (nameEl) nameEl.textContent = car.name + (owned ? '' : ' 🔒');

    const statsEl = document.querySelector('.garage-car-stats');
    if (statsEl) {
      const star = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
      statsEl.innerHTML = `
        <span>⚡ ${star(car.speed)}</span>
        <span>🛞 ${star(car.grip)}</span>
        <span>💨 ${star(car.nitro)}</span>
      `;
    }

    const selBtn = document.getElementById('btn-car-select');
    if (selBtn) {
      if (!owned)      { selBtn.textContent = 'Locked'; selBtn.disabled = true;  }
      else if (isSel)  { selBtn.textContent = 'Selected ✓'; selBtn.disabled = true; }
      else             { selBtn.textContent = 'Select'; selBtn.disabled = false; }
    }
  }

  _wireOnce() {
    if (this._wired) return;
    this._wired = true;

    document.getElementById('btn-car-prev')  ?.addEventListener('click', () => {
      this._idx = (this._idx - 1 + CARS.length) % CARS.length;
      this._render();
    });
    document.getElementById('btn-car-next')  ?.addEventListener('click', () => {
      this._idx = (this._idx + 1) % CARS.length;
      this._render();
    });
    document.getElementById('btn-car-select')?.addEventListener('click', () => {
      const car = CARS[this._idx];
      if (selectCar(car.id)) this._render();
    });
    document.getElementById('btn-garage-back')?.addEventListener('click', () => this.scenes.go('hub'));
  }
}