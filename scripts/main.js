'use strict';
// ═══════════════════════════════════════════════════════
// MAIN — Entry point, game loop, screen wiring
// ═══════════════════════════════════════════════════════
import { K, initInput, bindTouch }              from './core/inputController.js';
import { buildTrack, segs }                      from './core/roadMap.js';
import { P, resetPhys, updatePhys, best, clamp } from './systems/roadSystem.js';
import { C }                                     from './configs/roadConfig.js';
import { show }                                  from './systems/gameState.js';
import { initRenderer, sizeCanvas,
         getW, getH, getRes }                    from './systems/projectionSystem.js';
import { resetParts, tickParts,
         spawnCrash, spawnDust }                 from './systems/collisionSystem.js';
import { buildScenery }                          from './visuals/sceneryRender.js';
import { renderFrame }                           from './visuals/render.js';
import { updHUD, updLaps, fmtT }                 from './visuals/playerRender.js';
import { notify, countdown }                     from './player/playerAnimation.js';
import { drawMenuStars }                         from './visuals/uiRender.js';

// ── Track length ─────────────────────────────────────────
let _trackLen = 0;

// ── Game loop state ──────────────────────────────────────
let _raf     = null;
let _last    = 0;
let _paused  = false;
let _running = false;
let _prevLap = 0;
let _fpsBuf  = [];
let _fps     = 60;

// Visual steer: combines player input lean + road curve lean
// Range roughly -1…+1; drives both camera parallax & sprite frame
let _steerVisual = 0;
let _hillOff     = 0;
let _accum       = 0;

// ── Fixed-step game loop ─────────────────────────────────
function loop(ts) {
  _raf = requestAnimationFrame(loop);
  const rawDt = Math.min((ts - _last) / 1000, .05);
  _last = ts;

  if (rawDt > 0) {
    _fpsBuf.push(1/rawDt);
    if (_fpsBuf.length > 30) _fpsBuf.shift();
    _fps = _fpsBuf.reduce((a,b) => a+b, 0) / _fpsBuf.length;
  }

  if (_paused) return;
  if (K.pause) { K.pause=false; doPause(); return; }

  // ── Fixed physics steps ────────────────────────────────
  _accum += rawDt;
  const step = C.STEP;
  let guard  = 0;
  while (_accum >= step && guard++ < 4) {
    updatePhys(K, step, _trackLen);
    tickParts(step);
    _accum -= step;
  }

  // ── Visual steer (once per render frame) ──────────────
  // Combines:
  //  a) explicit key input lean (+/- based on key held)
  //  b) road curve lean (so car sprite tilts into bends automatically)
  //     — this is VISUAL ONLY; physics drift is handled in roadSystem
  const speedFrac = P.speed / C.MAX_SPD;

  // Input-based lean: +1 = right, -1 = left
  const inputLean  = (K.left ? -1 : K.right ? 1 : 0) * speedFrac;
  // Road curve lean: curve > 0 = right bend → car leans right visually
  // Multiply by speed so it's zero at standstill
  const curveLean  = P.roadCurve * speedFrac * 0.55;

  // Combined target for the visual steer value
  const targetSteer = clamp(inputLean + curveLean, -1, 1);

  // Low-pass smooth — avoids instant snapping
  _steerVisual += (targetSteer - _steerVisual) * Math.min(1, rawDt * 7);
  // Decay back when no input and no curve
  if (!K.left && !K.right && Math.abs(P.roadCurve) < 0.05) {
    _steerVisual *= Math.pow(0.90, rawDt * 60);
  }

  _hillOff += (K.left ? -1 : K.right ? 1 : 0) * speedFrac * rawDt * 38;

  // ── Collision effects ──────────────────────────────────
  if (P.isOffTrack) {
    spawnCrash(getW()/2 + (K.left ? -60 : 60), getH()*.72|0);
    if (P.speed > 10) notify('⚠ WALL HIT!', 700);
  }
  if (P.isBraking && P.speed > C.MAX_SPD*.12) {
    spawnDust(getW()/2 - 30*getRes(), getH()*.78|0);
    spawnDust(getW()/2 + 30*getRes(), getH()*.78|0);
  }

  renderFrame(_steerVisual);
  updHUD(_fps, _trackLen);

  if (P.lapCount > _prevLap && P.lapCount > 0) {
    _prevLap = P.lapCount;
    updLaps();
    const lt = P.lapTimes[P.lapTimes.length-1];
    notify(lt === best()
      ? `🏆 LAP ${P.lapCount} — BEST! ${fmtT(lt)}`
      : `✓ LAP ${P.lapCount} — ${fmtT(lt)}`);
  }

  if (P.raceFinished && _running) { _running=false; onWin(); }
}

// ── Race flow ────────────────────────────────────────────
async function startRace() {
  show('game');
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  buildTrack(buildScenery);
  _trackLen = segs.length * C.SEG_LEN;

  resetPhys();
  resetParts();
  sizeCanvas();
  _prevLap=0; _steerVisual=0; _hillOff=0;
  _paused=false; _running=true;

  await countdown();
  notify('🏁 RACE START!', 2000);
  _fpsBuf=[]; _accum=0; _last=performance.now();
  cancelAnimationFrame(_raf);
  _raf = requestAnimationFrame(loop);
}

function doPause()  { _paused=true;  show('pause'); }
function doResume() { _paused=false; _last=performance.now(); show('game'); }
function doQuit()   { cancelAnimationFrame(_raf); _running=false; _paused=false; show('menu'); }

function onWin() {
  cancelAnimationFrame(_raf);
  notify('🏆 RACE COMPLETE!', 4500);
  setTimeout(() => {
    const b = best();
    document.getElementById('ws-t').textContent = fmtT(P.raceTime);
    document.getElementById('ws-b').textContent = b ? fmtT(b) : '--';
    document.getElementById('ws-l').textContent = P.lapCount;
    show('win');
  }, 1800);
}

// ── Resize ───────────────────────────────────────────────
let _rT;
window.addEventListener('resize', () => {
  clearTimeout(_rT);
  _rT = setTimeout(() => {
    if (document.getElementById('s-game').classList.contains('on')) sizeCanvas();
  }, 100);
});

// ── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gc');
  initRenderer(canvas);
  initInput();

  bindTouch('tc-a', 'up');
  bindTouch('tc-b', 'down');
  bindTouch('tc-l', 'left');
  bindTouch('tc-r', 'right');

  document.getElementById('btn-start') .addEventListener('click', startRace);
  document.getElementById('btn-howto') .addEventListener('click', () => show('howto'));
  document.getElementById('btn-back')  .addEventListener('click', () => show('menu'));
  document.getElementById('pbtn')      .addEventListener('click', doPause);
  document.getElementById('btn-resume').addEventListener('click', doResume);
  document.getElementById('btn-quit')  .addEventListener('click', doQuit);
  document.getElementById('btn-again') .addEventListener('click', startRace);
  document.getElementById('btn-tomenu').addEventListener('click', doQuit);

  requestAnimationFrame(drawMenuStars);
  window.addEventListener('resize', drawMenuStars);
});
