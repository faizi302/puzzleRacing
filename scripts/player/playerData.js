// ═══════════════════════════════════════════════════════
// PLAYER DATA — localStorage manager (v2 schema)
// ─────────────────────────────────────────────────────
// Backwards-compatible upgrade of the original v1 file:
//  • Same STORAGE_KEY so existing saves load (no progress wipe)
//  • Old saves are deep-merged with new defaults on load, so
//    fields like `gems`, `sfxVolume`, `vibration`, `_missions`
//    appear automatically without needing a reset.
//
// All function signatures used elsewhere are preserved:
//   loadPlayerData, savePlayerData, getPlayerData, addCoins,
//   addKeys, spendCoins, isLevelUnlocked, unlockLevel,
//   completeLevel, selectCar, unlockCar, updateSetting,
//   getSetting, resetPlayerData
//
// New helpers exported for the redesigned scenes:
//   addGems, claimDaily, hasClaimedDaily, updateMission,
//   getMissions
// ═══════════════════════════════════════════════════════

const STORAGE_KEY = 'racingGame_playerData_v1';   // unchanged on purpose

const DEFAULT_DATA = {
  // currencies
  coins: 0,
  keys : 0,
  gems : 0,

  // progression
  totalRaces     : 0,
  unlockedLevels : [1],
  completedLevels: [],
  bestTimes      : {},          // { level1: 45.2, ... }

  // garage
  selectedCar  : 'car1',
  unlockedCars : ['car1'],
  carUpgrades  : {},            // { car1: { speed: 0, grip: 0, nitro: 0, dura: 0 } }

  // profile / meta
  profileName : 'RACER',
  loginStreak : 1,
  lastLoginISO: '',
  _dailyClaimed: '',            // ISO date string of last claim (yyyy-mm-dd)

  // daily missions (resets when date rolls over)
  _missions: {
    date  : '',
    race1 : { done: false, claimed: false },
    keys5 : { done: false, claimed: false, progress: 0 },
    beatBest: { done: false, claimed: false },
  },

  // settings
  settings: {
    soundOn    : true,
    musicOn    : true,
    sfxVolume  : 75,            // 0–100
    musicVolume: 35,            // 0–100
    fullscreen : false,
    vibration  : true,
    graphics   : 'med',         // low | med | high
    controls   : 'auto',        // auto | kb | touch
  },
};

let _data = null;


// ─── Deep merge helper ────────────────────────────────
function deepMerge(target, src) {
  const out = Array.isArray(target) ? target.slice() : { ...target };
  for (const k of Object.keys(src || {})) {
    const sv = src[k];
    const tv = out[k];
    if (sv && typeof sv === 'object' && !Array.isArray(sv)
        && tv && typeof tv === 'object' && !Array.isArray(tv)) {
      out[k] = deepMerge(tv, sv);
    } else {
      out[k] = (sv === undefined) ? tv : sv;
    }
  }
  return out;
}

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function ensureDailyReset(d) {
  const today = todayISO();
  if (!d._missions || d._missions.date !== today) {
    d._missions = {
      date  : today,
      race1 : { done: false, claimed: false },
      keys5 : { done: false, claimed: false, progress: 0 },
      beatBest: { done: false, claimed: false },
    };
  }
}


// ─── Load / Save ──────────────────────────────────────
export function loadPlayerData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Deep-merge so old saves get new fields without losing data.
      _data = deepMerge(DEFAULT_DATA, parsed);
    } else {
      _data = deepMerge({}, DEFAULT_DATA);
    }
  } catch (e) {
    console.warn('[playerData] load failed, using defaults', e);
    _data = deepMerge({}, DEFAULT_DATA);
  }

  ensureDailyReset(_data);

  // Login streak handling — increments at most once per day
  const today = todayISO();
  if (_data.lastLoginISO !== today) {
    if (_data.lastLoginISO) {
      // Crude streak: if last login was yesterday, +1; else reset
      const last = new Date(_data.lastLoginISO);
      const diff = Math.round((Date.now() - last.getTime()) / 86400000);
      _data.loginStreak = (diff === 1) ? (_data.loginStreak + 1) : 1;
    } else {
      _data.loginStreak = 1;
    }
    _data.lastLoginISO = today;
  }

  savePlayerData();
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


// ─── Currencies ───────────────────────────────────────
export function addCoins(amount) {
  const d = getPlayerData();
  d.coins = Math.max(0, d.coins + amount);
  savePlayerData();
}

export function addKeys(amount) {
  const d = getPlayerData();
  d.keys = Math.max(0, d.keys + amount);
  // Daily mission progress
  if (amount > 0) {
    ensureDailyReset(d);
    d._missions.keys5.progress = Math.min(5, d._missions.keys5.progress + amount);
    if (d._missions.keys5.progress >= 5) d._missions.keys5.done = true;
  }
  savePlayerData();
}

export function addGems(amount) {
  const d = getPlayerData();
  d.gems = Math.max(0, d.gems + amount);
  savePlayerData();
}

export function spendCoins(amount) {
  const d = getPlayerData();
  if (d.coins < amount) return false;
  d.coins -= amount;
  savePlayerData();
  return true;
}


// ─── Levels ───────────────────────────────────────────
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
  ensureDailyReset(d);

  if (!d.completedLevels.includes(levelNum)) {
    d.completedLevels.push(levelNum);
  }

  const key = 'level' + levelNum;
  const prevBest = d.bestTimes[key];
  if (!prevBest || timeSec < prevBest) {
    if (prevBest) d._missions.beatBest.done = true;
    d.bestTimes[key] = timeSec;
  }

  // Daily missions
  d._missions.race1.done = true;

  unlockLevel(levelNum + 1);
  d.totalRaces++;
  savePlayerData();
}


// ─── Garage ───────────────────────────────────────────
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


// ─── Settings ─────────────────────────────────────────
export function updateSetting(key, value) {
  const d = getPlayerData();
  d.settings[key] = value;
  savePlayerData();
}

export function getSetting(key) {
  return getPlayerData().settings[key];
}


// ─── Daily / Missions ─────────────────────────────────
export function hasClaimedDaily() {
  const d = getPlayerData();
  return d._dailyClaimed === todayISO();
}

export function claimDaily() {
  const d = getPlayerData();
  if (hasClaimedDaily()) return false;
  d._dailyClaimed = todayISO();
  d.coins += 100;
  savePlayerData();
  return true;
}

export function getMissions() {
  const d = getPlayerData();
  ensureDailyReset(d);
  return d._missions;
}

export function updateMission(name, patch) {
  const d = getPlayerData();
  ensureDailyReset(d);
  if (!d._missions[name]) return;
  d._missions[name] = { ...d._missions[name], ...patch };
  savePlayerData();
}


// ─── Reset ────────────────────────────────────────────
export function resetPlayerData() {
  _data = deepMerge({}, DEFAULT_DATA);
  savePlayerData();
}