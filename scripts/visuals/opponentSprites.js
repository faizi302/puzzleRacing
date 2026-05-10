// ═══════════════════════════════════════════════════════
// OPPONENT SPRITES — JSON based UnitE loader
// Uses UnitE from each team spritesheet
// ═══════════════════════════════════════════════════════

const TEAM_SHEETS = {
  red: {
    img: 'assets/player/UnitsTeamA.png',
    json: 'assets/player/UnitsTeamA.json',
    unit: 'UnitE',
  },

  yellow: {
    img: 'assets/player/UnitsNone.png',
    json: 'assets/player/UnitsNone.json',
    unit: 'UnitD',
  },

  blue: {
    img: 'assets/player/UnitsTeamB.png',
    json: 'assets/player/UnitsTeamB.json',
    unit: 'UnitC',
  },

  green: {
    img: 'assets/player/UnitsTeamC.png',
    json: 'assets/player/UnitsTeamC.json',
    unit: 'UnitB',
  },

  purple: {
    img: 'assets/player/UnitsTeamD.png',
    json: 'assets/player/UnitsTeamD.json',
    unit: 'UnitE',
  },

  silver: {
    img: 'assets/player/UnitsTeamE.png',
    json: 'assets/player/UnitsTeamE.json',
    unit: 'UnitA',
  },
};

export const OPP_SPRITES = {};

function loadImage(src) {
  const img = new Image();
  img.ready = false;

  img.promise = new Promise((resolve) => {
    img.onload = () => {
      img.ready = true;
      resolve(img);
    };

    img.onerror = () => {
      console.warn('[opponentSprites] image not found:', src);
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
    console.warn('[opponentSprites] json not found:', src);
    return null;
  }
}

export async function loadOpponentSprites() {
  const keys = Object.keys(TEAM_SHEETS);

  await Promise.all(keys.map(async (key) => {
    const cfg = TEAM_SHEETS[key];

    const img = loadImage(cfg.img);
    await img.promise;
    const json = await loadJson(cfg.json);

    const anim = json?.animations?.[cfg.unit] || [];
    const frames = anim
      .map(id => {
        const data = json.frames[id];
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

    OPP_SPRITES[key] = {
      key,
      img,
      frames,
      straightIndex: Math.floor(frames.length / 2),
      total: frames.length,
    };
  }));

  console.log('[opponentSprites] loaded:', OPP_SPRITES);
}

export function getOpponentSprite(team = 'red') {
  return OPP_SPRITES[team] || OPP_SPRITES.red;
}