// ═══════════════════════════════════════════════════════
// PLAYER DATA — localStorage manager for progress, coins,
// keys, settings, unlocked levels, and selected car.
// ═══════════════════════════════════════════════════════
const STORAGE_KEY = 'racingGame_playerData_v1';

const DEFAULT_DATA = {
  coins         : 0,
  keys          : 0,
  totalRaces    : 0,
  unlockedLevels: [1],          // Level 1 always unlocked
  completedLevels: [],
  bestTimes     : {},           // { level1: 45.2, level2: 60.5 }
  selectedCar   : 'car1',
  unlockedCars  : ['car1'],
  settings      : {
    soundOn   : true,
    musicOn   : true,
    fullscreen: false,
  },
};

let _data = null;

// ── Load / Save ────────────────────────────────────────
export function loadPlayerData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults so missing keys don't break things
      _data = { ...DEFAULT_DATA, ...parsed,
        settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) } };
    } else {
      _data = { ...DEFAULT_DATA };
      savePlayerData();
    }
  } catch (e) {
    console.warn('[playerData] load failed, using defaults', e);
    _data = { ...DEFAULT_DATA };
  }
  return _data;
}

export function savePlayerData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_data));
  } catch (e) {
    console.warn('[playerData] save failed', e);
  }
}

export function getPlayerData() {
  if (!_data) loadPlayerData();
  return _data;
}

// ── Coins / Keys ───────────────────────────────────────
export function addCoins(amount) {
  const d = getPlayerData();
  d.coins = Math.max(0, d.coins + amount);
  savePlayerData();
}

export function addKeys(amount) {
  const d = getPlayerData();
  d.keys = Math.max(0, d.keys + amount);
  savePlayerData();
}

export function spendCoins(amount) {
  const d = getPlayerData();
  if (d.coins < amount) return false;
  d.coins -= amount;
  savePlayerData();
  return true;
}

// ── Levels ─────────────────────────────────────────────
export function isLevelUnlocked(levelNum) {
  return getPlayerData().unlockedLevels.includes(levelNum);
}

export function unlockLevel(levelNum) {
  const d = getPlayerData();
  if (!d.unlockedLevels.includes(levelNum)) {
    d.unlockedLevels.push(levelNum);
    savePlayerData();
  }
}

export function completeLevel(levelNum, timeSec) {
  const d = getPlayerData();
  if (!d.completedLevels.includes(levelNum)) {
    d.completedLevels.push(levelNum);
  }
  // Save best time
  const key = 'level' + levelNum;
  if (!d.bestTimes[key] || timeSec < d.bestTimes[key]) {
    d.bestTimes[key] = timeSec;
  }
  // Unlock next level
  unlockLevel(levelNum + 1);
  d.totalRaces++;
  savePlayerData();
}

// ── Car selection ──────────────────────────────────────
export function selectCar(carId) {
  const d = getPlayerData();
  if (d.unlockedCars.includes(carId)) {
    d.selectedCar = carId;
    savePlayerData();
    return true;
  }
  return false;
}

export function unlockCar(carId) {
  const d = getPlayerData();
  if (!d.unlockedCars.includes(carId)) {
    d.unlockedCars.push(carId);
    savePlayerData();
  }
}

// ── Settings ───────────────────────────────────────────
export function updateSetting(key, value) {
  const d = getPlayerData();
  d.settings[key] = value;
  savePlayerData();
}

export function getSetting(key) {
  return getPlayerData().settings[key];
}

// ── Reset (debug) ──────────────────────────────────────
export function resetPlayerData() {
  _data = { ...DEFAULT_DATA };
  savePlayerData();
}