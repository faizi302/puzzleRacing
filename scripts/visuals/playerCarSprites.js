// ═══════════════════════════════════════════════════════
// PLAYER CAR SPRITES — JSON based player car loader
// Supports same car unit with different team/color sheets
// ═══════════════════════════════════════════════════════

const TEAM_PATHS = {
  none: {
    img: 'assets/player/UnitsNone.png',
    json: 'assets/player/UnitsNone.json',
  },
  red: {
    img: 'assets/player/UnitsTeamA.png',
    json: 'assets/player/UnitsTeamA.json',
  },
  blue: {
    img: 'assets/player/UnitsTeamB.png',
    json: 'assets/player/UnitsTeamB.json',
  },
  green: {
    img: 'assets/player/UnitsTeamC.png',
    json: 'assets/player/UnitsTeamC.json',
  },
  purple: {
    img: 'assets/player/UnitsTeamD.png',
    json: 'assets/player/UnitsTeamD.json',
  },
  silver: {
    img: 'assets/player/UnitsTeamE.png',
    json: 'assets/player/UnitsTeamE.json',
  },
};

// Level/car unlock rule:
// level1 car = UnitA
// later level2 can become UnitB, level3 UnitC, etc.
export const PLAYER_CAR_UNITS = {
  car1: 'UnitA',
  car2: 'UnitB',
  car3: 'UnitC',
  car4: 'UnitD',
  car5: 'UnitE',
};

const DEFAULT_STATE = {
  selectedCar: 'car1',
  selectedColor: 'blue',
};

export const PLAYER_SPRITES = {};

function loadImage(src) {
  const img = new Image();
  img.ready = false;

  img.promise = new Promise((resolve) => {
    img.onload = () => {
      img.ready = true;
      resolve(img);
    };

    img.onerror = () => {
      console.warn('[playerCarSprites] image not found:', src);
      resolve(img);
    };
  });

  img.src = src;
  return img;
}

async function loadJson(src) {
  try {
    const r = await fetch(src);
    if (!r.ok) throw new Error(src);
    return await r.json();
  } catch (e) {
    console.warn('[playerCarSprites] json not found:', src);
    return null;
  }
}

function readPlayerSelection() {
  try {
    const raw = localStorage.getItem('puzzleracing_progress_v1');
    const data = raw ? JSON.parse(raw) : {};

    return {
      selectedCar: data.selectedCar || DEFAULT_STATE.selectedCar,
      selectedColor: data.selectedColor || DEFAULT_STATE.selectedColor,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function savePlayerCarSelection({ selectedCar, selectedColor }) {
  try {
    const raw = localStorage.getItem('puzzleracing_progress_v1');
    const data = raw ? JSON.parse(raw) : {};

    if (selectedCar) data.selectedCar = selectedCar;
    if (selectedColor) data.selectedColor = selectedColor;

    localStorage.setItem('puzzleracing_progress_v1', JSON.stringify(data));
  } catch (e) {
    console.warn('[playerCarSprites] failed to save selection', e);
  }
}

function parseFrames(json, unitName) {
  const anim = json?.animations?.[unitName] || [];

  return anim
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

export async function loadPlayerCarSprites() {
  const colors = Object.keys(TEAM_PATHS);

  await Promise.all(colors.map(async (color) => {
    const cfg = TEAM_PATHS[color];

    const img = loadImage(cfg.img);
    await img.promise;

    const json = await loadJson(cfg.json);
    if (!json) return;

    PLAYER_SPRITES[color] = {
      color,
      img,
      json,
    };
  }));

  console.log('[playerCarSprites] loaded:', PLAYER_SPRITES);
}

export function getSelectedPlayerSprite() {
  const sel = readPlayerSelection();

  const color = sel.selectedColor || 'blue';
  const carId = sel.selectedCar || 'car1';
  const unitName = PLAYER_CAR_UNITS[carId] || 'UnitA';

  const pack = PLAYER_SPRITES[color] || PLAYER_SPRITES.blue || PLAYER_SPRITES.red;

  if (!pack?.img?.ready || !pack?.json) return null;

  const frames = parseFrames(pack.json, unitName);

  return {
    color,
    carId,
    unitName,
    img: pack.img,
    frames,
    straightIndex: Math.floor(frames.length / 2),
    total: frames.length,

    // same defaults as your old player.js
    srcW: frames[0]?.srcW || 140,
    srcH: frames[0]?.srcH || 173,
    anchorX: frames[0]?.anchorX ?? 0.5,
    anchorY: frames[0]?.anchorY ?? 0.65,
  };
}

export function setSelectedPlayerColor(color) {
  if (!TEAM_PATHS[color]) return false;
  savePlayerCarSelection({ selectedColor: color });
  return true;
}

export function setSelectedPlayerCar(carId) {
  if (!PLAYER_CAR_UNITS[carId]) return false;
  savePlayerCarSelection({ selectedCar: carId });
  return true;
}

export function getAvailablePlayerColors() {
  return Object.keys(TEAM_PATHS);
}