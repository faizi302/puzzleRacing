import { P, clamp, addCameraShake } from '../../systems/roadSystem.js';
import { switchToTrack } from '../../core/roadMap.js';
import { notify } from '../../player/playerAnimation.js';
import { playSfx } from '../../core/audio.js';

const CORRECT_ORDER = ['star', 'moon', 'diamond', 'key'];

const MAX_LAPS = 2;

let sequence = [];
let solved = false;
let started = false;
let timer = 0;
let lapCrossings = 0;
let lastPos = 0;

export function resetLevel3Puzzle() {
  sequence = [];
  solved = false;
  started = false;
  timer = 0;
  lapCrossings = 0;
  lastPos = P.pos || 0;

  P.level3PuzzleSolved = false;
  P.level3PuzzleStarted = false;
  P.level3LapCrossings = 0;
  P.totalLaps = MAX_LAPS;
  P.lapCount = 0;
  P.raceFailed = false;
  P._failReason = null;
}

export function updateLevel3Puzzle(dt) {
  if (solved || P.raceFailed || P.raceFinished) return;

  timer += dt;

  const curPos = P.pos || 0;

  // Detect finish-line crossing / new lap
  if (curPos < lastPos - 500) {
    lapCrossings++;
    P.level3LapCrossings = lapCrossings;
    P.lapCount = Math.min(lapCrossings, MAX_LAPS);

    if (lapCrossings >= MAX_LAPS && !solved) {
      P.raceFailed = true;
      P._failReason = 'You failed to complete the symbol sequence in 2 laps';
      P.endPhase = 1;
      P.endTime = 0;
      P.speed = Math.max(120, (P.speed || 0) * 0.35);
      notify('❌ Symbol Code failed! Sequence was not completed in 2 laps.');
      return;
    }
  }

  lastPos = curPos;
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