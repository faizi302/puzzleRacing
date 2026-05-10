import { P, clamp, addCameraShake } from '../../systems/roadSystem.js';
import { switchToTrack } from '../../core/roadMap.js';
import { notify } from '../../player/playerAnimation.js';
import { playSfx } from '../../core/audio.js';

const CORRECT_ORDER = ['star', 'moon', 'fire', 'water'];

let sequence = [];
let solved = false;
let started = false;
let timer = 0;

export function resetLevel3Puzzle() {
  sequence = [];
  solved = false;
  started = false;
  timer = 0;

  P.level3PuzzleSolved = false;
  P.level3PuzzleStarted = false;
}

export function updateLevel3Puzzle(dt) {
  if (!started || solved) return;
  timer += dt;
}

export function pressSymbolSwitch(symbol) {
  if (solved) return { solved: true };

  if (!started) {
    started = true;
    P.level3PuzzleStarted = true;
    notify('🔢 Symbol code started!');
  }

  const expected = CORRECT_ORDER[sequence.length];

  if (symbol !== expected) {
    sequence = [];

    P.damage = clamp((P.damage || 0) + 20, 0, 100);
    P.impactFlash = 1;
    addCameraShake(0.75, 0.45);

    try { playSfx('crash', { volume: 0.75 }); } catch (e) {}

    notify('❌ Wrong symbol! Sequence reset. -20% HP');

    return {
      wrong: true,
      reset: true,
      spawnTraps: true,
    };
  }

  sequence.push(symbol);

  try { playSfx('coin', { volume: 0.45 }); } catch (e) {}

  notify(`✅ ${symbol.toUpperCase()} accepted`);

  if (sequence.length >= CORRECT_ORDER.length) {
    solved = true;

    P.level3PuzzleSolved = true;
    P.secretUnlocked = true;
    P.onRoad2 = true;
    P._needsTrackSwitch = true;

    switchToTrack(2);

    P.pos = 8 * 240;
    P.playerX = 0;
    P.speed = Math.max(700, Math.abs(P.speed) * 0.65);

    notify('🔓 Symbol Code solved! Hidden path opened!');

    try { playSfx('nitro', { volume: 0.9 }); } catch (e) {}

    return {
      solved: true,
      openPath: true,
    };
  }

  return {
    correct: true,
    progress: sequence.length,
  };
}