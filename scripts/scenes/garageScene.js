// ═══════════════════════════════════════════════════════
// GARAGE SCENE — JSON sprite car selection + color selector
// Player selection is used by player.js through playerCarSprites.js
// ═══════════════════════════════════════════════════════

import { show } from '../systems/gameState.js';
import {
  getPlayerData,
  selectCar,
  unlockCar,
  spendCoins,
  savePlayerData,
} from '../player/playerData.js';

import { toast, shake, tweenNumber, rewardBurst } from '../ui/uiFX.js';

import {
  setSelectedPlayerCar,
  setSelectedPlayerColor,
  loadPlayerCarSprites,
} from '../visuals/playerCarSprites.js';

const TEAM_PATHS = {
  none:   { label: 'NONE',   img: 'assets/player/UnitsNone.png',  json: 'assets/player/UnitsNone.json' },
  red:    { label: 'RED',    img: 'assets/player/UnitsTeamA.png', json: 'assets/player/UnitsTeamA.json' },
  blue:   { label: 'BLUE',   img: 'assets/player/UnitsTeamB.png', json: 'assets/player/UnitsTeamB.json' },
  green:  { label: 'GREEN',  img: 'assets/player/UnitsTeamC.png', json: 'assets/player/UnitsTeamC.json' },
  purple: { label: 'PURPLE', img: 'assets/player/UnitsTeamD.png', json: 'assets/player/UnitsTeamD.json' },
  silver: { label: 'SILVER', img: 'assets/player/UnitsTeamE.png', json: 'assets/player/UnitsTeamE.json' },
};

const COLORS = ['blue', 'red', 'green', 'purple', 'silver', 'none'];

const CARS = [
  {
    id: 'car1',
    unit: 'UnitA',
    name: 'RACER ONE',
    cls: 'CLASS · STARTER',
    speed: 3,
    grip: 3,
    nitro: 3,
    dura: 3,
    price: 0,
  },
  {
    id: 'car2',
    unit: 'UnitB',
    name: 'NITRO BEAST',
    cls: 'CLASS · SPORT',
    speed: 5,
    grip: 2,
    nitro: 5,
    dura: 3,
    price: 1500,
  },
  {
    id: 'car3',
    unit: 'UnitC',
    name: 'DRIFT KING',
    cls: 'CLASS · DRIFT',
    speed: 4,
    grip: 5,
    nitro: 3,
    dura: 4,
    price: 3500,
  },
  {
    id: 'car4',
    unit: 'UnitD',
    name: 'STREET HAWK',
    cls: 'CLASS · PRO',
    speed: 4,
    grip: 4,
    nitro: 4,
    dura: 4,
    price: 5000,
  },
  {
    id: 'car5',
    unit: 'UnitE',
    name: 'ROAD PHANTOM',
    cls: 'CLASS · ELITE',
    speed: 5,
    grip: 5,
    nitro: 5,
    dura: 4,
    price: 7500,
  },
];

const UPGRADE_COST = 500;
const STAT_KEYS = ['speed', 'grip', 'nitro', 'dura'];

const _imgCache = {};
const _jsonCache = {};

function pct(v) {
  return Math.max(0, Math.min(100, v * 20));
}

function readStoredSelection() {
  try {
    const raw = localStorage.getItem('puzzleracing_progress_v1');
    const d = raw ? JSON.parse(raw) : {};
    return {
      selectedCar: d.selectedCar || 'car1',
      selectedColor: d.selectedColor || 'blue',
    };
  } catch {
    return {
      selectedCar: 'car1',
      selectedColor: 'blue',
    };
  }
}

function writeStoredSelection({ selectedCar, selectedColor }) {
  try {
    const raw = localStorage.getItem('puzzleracing_progress_v1');
    const d = raw ? JSON.parse(raw) : {};

    if (selectedCar) d.selectedCar = selectedCar;
    if (selectedColor) d.selectedColor = selectedColor;

    localStorage.setItem('puzzleracing_progress_v1', JSON.stringify(d));
  } catch (e) {
    console.warn('[GarageScene] selection save failed:', e);
  }
}

function loadImage(src) {
  if (_imgCache[src]) return _imgCache[src];

  const img = new Image();
  img.ready = false;

  img.promise = new Promise((resolve) => {
    img.onload = () => {
      img.ready = true;
      resolve(img);
    };

    img.onerror = () => {
      console.warn('[GarageScene] image not found:', src);
      resolve(img);
    };
  });

  img.src = src;
  _imgCache[src] = img;
  return img;
}

async function loadJson(src) {
  if (_jsonCache[src]) return _jsonCache[src];

  try {
    const r = await fetch(src);
    if (!r.ok) throw new Error(src);
    const json = await r.json();
    _jsonCache[src] = json;
    return json;
  } catch (e) {
    console.warn('[GarageScene] json not found:', src);
    return null;
  }
}

function getAnimFrames(json, unitName) {
  const ids = json?.animations?.[unitName] || [];

  return ids
    .map(id => {
      const data = json.frames?.[id];
      if (!data || data.rotated) return null;

      return {
        id,
        x: data.frame.x,
        y: data.frame.y,
        w: data.frame.w,
        h: data.frame.h,
        sx: data.spriteSourceSize.x,
        sy: data.spriteSourceSize.y,
        srcW: data.sourceSize.w,
        srcH: data.sourceSize.h,
        anchorX: data.anchor?.x ?? 0.5,
        anchorY: data.anchor?.y ?? 0.65,
      };
    })
    .filter(Boolean);
}

async function drawGarageCarPreview(canvas, car, color) {
  if (!canvas || !car) return;

  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  const team = TEAM_PATHS[color] || TEAM_PATHS.blue;
  const img = loadImage(team.img);
  const json = await loadJson(team.json);

  await img.promise;

  const frames = getAnimFrames(json, car.unit);
  const f = frames[Math.floor(frames.length / 2)];

  if (!img.ready || !f) {
    ctx.save();
    ctx.fillStyle = '#1a88ff';
    ctx.fillRect(W * 0.25, H * 0.32, W * 0.50, H * 0.34);
    ctx.restore();
    return;
  }

  const srcW = f.srcW || 140;
  const srcH = f.srcH || 173;

  const maxW = W * 0.78;
  const maxH = H * 0.78;
  const scale = Math.min(maxW / srcW, maxH / srcH);

  const drawW = srcW * scale;
  const drawH = srcH * scale;

  const anchorX = W / 2;
  const anchorY = H * 0.74;

  const dx = anchorX - drawW * (f.anchorX ?? 0.5);
  const dy = anchorY - drawH * (f.anchorY ?? 0.65);

  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(anchorX, anchorY + drawH * 0.07, drawW * 0.42, drawH * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.drawImage(
    img,
    f.x,
    f.y,
    f.w,
    f.h,
    dx + (f.sx / srcW) * drawW,
    dy + (f.sy / srcH) * drawH,
    (f.w / srcW) * drawW,
    (f.h / srcH) * drawH
  );
}

function ensureGarageCanvas() {
  const stage = document.querySelector('.garage-stage');
  if (!stage) return null;

  let canvas = document.getElementById('garage-car-canvas');

  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'garage-car-canvas';
    canvas.width = 420;
    canvas.height = 240;
    canvas.style.width = '100%';
    canvas.style.maxWidth = '520px';
    canvas.style.height = '220px';
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    canvas.style.filter = 'drop-shadow(0 16px 32px rgba(0,232,255,0.45))';

    const oldIcon = document.getElementById('garage-car-icon');
    if (oldIcon) oldIcon.style.display = 'none';

    stage.appendChild(canvas);
  }

  return canvas;
}

function ensureColorControls() {
  const display = document.querySelector('.garage-display');
  if (!display) return null;

  let wrap = document.getElementById('garage-color-row');

  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'garage-color-row';
    wrap.style.position = 'relative';
    wrap.style.zIndex = '5';
    wrap.style.display = 'flex';
    wrap.style.justifyContent = 'center';
    wrap.style.flexWrap = 'wrap';
    wrap.style.gap = '8px';
    wrap.style.marginTop = '14px';

    display.appendChild(wrap);
  }

  return wrap;
}

export class GarageScene {
  constructor(sceneManager) {
    this.scenes = sceneManager;
    this._wired = false;
    this._idx = 0;
    this._color = 'blue';
    this._previewToken = 0;
  }

  async enter() {
    show('garage');

    await loadPlayerCarSprites();

    const d = getPlayerData();
    const sel = readStoredSelection();

    const selectedCar = d.selectedCar || sel.selectedCar || 'car1';
    const selectedColor = sel.selectedColor || 'blue';

    const i = CARS.findIndex(c => c.id === selectedCar);
    this._idx = i >= 0 ? i : 0;
    this._color = COLORS.includes(selectedColor) ? selectedColor : 'blue';

    this._wireOnce();
    this._render(false);
    tweenNumber('garage-coins', d.coins);
  }

  exit() {}

  _statsFor(carId) {
    const base = CARS.find(c => c.id === carId) || CARS[0];
    const upg = (getPlayerData().carUpgrades || {})[carId] || {};
    const out = {};

    for (const k of STAT_KEYS) {
      out[k] = Math.min(5, (base[k] || 0) + (upg[k] || 0));
    }

    return out;
  }

  _owned(car, data = getPlayerData()) {
    if (car.price <= 0) return true;
    return Array.isArray(data.unlockedCars) && data.unlockedCars.includes(car.id);
  }

  _renderColorButtons(owned) {
    const wrap = ensureColorControls();
    if (!wrap) return;

    wrap.innerHTML = '';

    for (const color of COLORS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = TEAM_PATHS[color]?.label || color.toUpperCase();

      btn.style.padding = '7px 12px';
      btn.style.borderRadius = '999px';
      btn.style.fontFamily = 'Orbitron, Arial';
      btn.style.fontWeight = '800';
      btn.style.fontSize = '10px';
      btn.style.letterSpacing = '0.10em';
      btn.style.border = color === this._color
        ? '1px solid rgba(255,255,255,0.95)'
        : '1px solid rgba(255,255,255,0.18)';
      btn.style.color = '#fff';
      btn.style.background = color === this._color
        ? 'linear-gradient(135deg, #00e8ff, #7b3dff)'
        : 'rgba(15,22,42,0.72)';
      btn.style.opacity = owned ? '1' : '0.45';

      btn.addEventListener('click', () => {
        if (!owned) {
          toast('Unlock this car first.');
          shake('btn-car-select');
          return;
        }

        this._color = color;

        const car = CARS[this._idx];
        selectCar(car.id);
        setSelectedPlayerCar(car.id);
        setSelectedPlayerColor(color);
        writeStoredSelection({
          selectedCar: car.id,
          selectedColor: color,
        });

        toast(`${car.name} color: ${TEAM_PATHS[color]?.label || color}`);
        this._render(false);
      });

      wrap.appendChild(btn);
    }
  }

  _render(animate = true) {
    const car = CARS[this._idx];
    const data = getPlayerData();

    const owned = this._owned(car, data);
    const sel = readStoredSelection();

    const isSel =
      (data.selectedCar === car.id || sel.selectedCar === car.id) &&
      (sel.selectedColor || 'blue') === this._color;

    const stats = this._statsFor(car.id);

    const canvas = ensureGarageCanvas();
    const token = ++this._previewToken;

    if (animate && canvas) {
      canvas.style.transition = 'transform 220ms ease, opacity 220ms ease';
      canvas.style.transform = 'translateX(-40px) scale(0.96)';
      canvas.style.opacity = '0';

      setTimeout(async () => {
        if (token !== this._previewToken) return;
        await drawGarageCarPreview(canvas, car, this._color);
        canvas.style.transform = 'translateX(0) scale(1)';
        canvas.style.opacity = '1';
      }, 160);
    } else {
      drawGarageCarPreview(canvas, car, this._color);
      if (canvas) {
        canvas.style.transform = 'translateX(0) scale(1)';
        canvas.style.opacity = '1';
      }
    }

    const nameEl = document.getElementById('garage-car-name');
    if (nameEl) nameEl.textContent = `${car.name}${owned ? '' : ' 🔒'}`;

    const clsEl = document.getElementById('garage-car-class');
    if (clsEl) {
      const colorName = TEAM_PATHS[this._color]?.label || this._color.toUpperCase();
      clsEl.textContent = `${car.cls} · ${car.unit} · ${colorName}`;
    }

    for (const k of STAT_KEYS) {
      const v = stats[k];
      const lab = document.getElementById('stat-' + k);
      const bar = document.getElementById('bar-' + k);

      if (lab) lab.textContent = `${v}/5`;
      if (bar) bar.style.width = pct(v) + '%';
    }

    const selBtn = document.getElementById('btn-car-select');
    if (selBtn) {
      if (!owned) {
        selBtn.textContent = `🔓 UNLOCK · ${car.price} 🪙`;
        selBtn.disabled = false;
        selBtn.classList.remove('pr');
      } else if (isSel) {
        selBtn.textContent = 'SELECTED ✓';
        selBtn.disabled = true;
        selBtn.classList.add('pr');
      } else {
        selBtn.textContent = 'SELECT';
        selBtn.disabled = false;
        selBtn.classList.add('pr');
      }
    }

    const upgBtn = document.getElementById('btn-car-upgrade');
    if (upgBtn) {
      const allMax = STAT_KEYS.every(k => stats[k] >= 5);
      upgBtn.disabled = !owned || allMax;
      upgBtn.textContent = allMax ? '★ MAXED' : `⚡ UPGRADE · ${UPGRADE_COST} 🪙`;
    }

    this._renderColorButtons(owned);
  }

  _doSelect() {
    const car = CARS[this._idx];
    const data = getPlayerData();
    const owned = this._owned(car, data);

    if (!owned) {
      if (data.coins < car.price) {
        toast(`Need ${car.price - data.coins} more coins to unlock.`);
        shake('btn-car-select');
        return;
      }

      if (spendCoins(car.price)) {
        unlockCar(car.id);
        selectCar(car.id);

        setSelectedPlayerCar(car.id);
        setSelectedPlayerColor(this._color);
        writeStoredSelection({
          selectedCar: car.id,
          selectedColor: this._color,
        });

        rewardBurst(`UNLOCKED · ${car.name}`);
        tweenNumber('garage-coins', getPlayerData().coins);
        this._render(false);
      }

      return;
    }

    selectCar(car.id);
    setSelectedPlayerCar(car.id);
    setSelectedPlayerColor(this._color);
    writeStoredSelection({
      selectedCar: car.id,
      selectedColor: this._color,
    });

    toast(`${car.name} selected.`);
    this._render(false);
  }

  _doUpgrade() {
    const car = CARS[this._idx];
    const data = getPlayerData();

    if (!this._owned(car, data)) {
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

    document.getElementById('btn-car-select')?.addEventListener('click', () => this._doSelect());
    document.getElementById('btn-car-upgrade')?.addEventListener('click', () => this._doUpgrade());
    document.getElementById('btn-garage-back')?.addEventListener('click', () => this.scenes.go('hub'));
  }
}