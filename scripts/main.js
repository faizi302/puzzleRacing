// ═══════════════════════════════════════════════════════
// MAIN — Boot, game loop, screen wiring
// (lives at scripts/main.js — paths are relative from there)
// ═══════════════════════════════════════════════════════
import { initRenderer, sizeCanvas, getCanvas, getW, getH } from './core/canvas.js';
import { initInput, K, readInput, lockInput, bindTouch }   from './core/inputController.js';
import { P, resetPhys, updatePhys, kmh, best }             from './systems/roadSystem.js';
import { buildTrack, trackLen }                            from './core/roadMap.js';
import { buildScenery, sceneryObjs }                       from './visuals/sceneryRender.js';
import {
  resetParts, tickParts, checkSceneryCollisions, tickEdgeScrape, spawnSkid,
} from './systems/collisionSystem.js';
import { renderFrame }                                      from './visuals/render.js';
import { updHUD, updLaps, fmtT }                            from './visuals/playerRender.js';
import { drawMenuStars }                                    from './visuals/uiRender.js';
import { show }                                             from  './systems/gameState.js';
import {
  notify, countdown, playIntro, playOutro, tickCamAnim,
} from './player/playerAnimation.js';
import { camAnim, getCarAnchor }                            from './player/player.js';
import {
  unlockAudio, playSfx, stopAll, startMusic, stopMusic, setEngineSpeed,
} from './core/audio.js';
import { C }                                                from './configs/roadConfig.js';

// ── Boot ───────────────────────────────────────────────
const cv = document.getElementById('gc');
initRenderer(cv);
sizeCanvas();
window.addEventListener('resize', sizeCanvas);

initInput();

// Touch controls
bindTouch('tc-l', 'left');
bindTouch('tc-r', 'right');
bindTouch('tc-a', 'up');
bindTouch('tc-b', 'down');

// Build track
buildTrack(buildScenery);

// ── Menu ───────────────────────────────────────────────
let _menuRaf = null;
function loopMenu() {
  drawMenuStars();
  _menuRaf = requestAnimationFrame(loopMenu);
}
function stopMenu() { if (_menuRaf) cancelAnimationFrame(_menuRaf); _menuRaf = null; }
loopMenu();

// ── State ──────────────────────────────────────────────
let _running = false;
let _paused  = false;
let _last    = 0;
let _accum   = 0;
let _fps     = 60;
let _fpsT    = 0;
let _fpsN    = 0;
let _winShown = false;

// ── Buttons ────────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-howto').addEventListener('click', () => show('howto'));
document.getElementById('btn-back') ?.addEventListener('click', () => show('menu'));
document.getElementById('btn-resume')?.addEventListener('click', resumeGame);
document.getElementById('btn-quit')  ?.addEventListener('click', quitToMenu);
document.getElementById('btn-again') ?.addEventListener('click', startGame);
document.getElementById('btn-tomenu')?.addEventListener('click', quitToMenu);
document.getElementById('pbtn')      ?.addEventListener('click', pauseGame);

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (_running && !_paused) pauseGame();
    else if (_paused)         resumeGame();
  }
});

// ═══════════════════════════════════════════════════════
// GAME LIFECYCLE
// ═══════════════════════════════════════════════════════
async function startGame() {
  unlockAudio();          // user gesture → enables audio
  stopMenu();
  _winShown = false;

  document.getElementById('s-win')  ?.classList.remove('on');
  document.getElementById('s-pause')?.classList.remove('on');

  buildTrack(buildScenery);  // rebuild so flagged-dead pickups respawn
  resetPhys();
  resetParts();

  show('game');
  sizeCanvas();

  // Lock input until intro + countdown both finish.
  lockInput(true);

  // Render an idle frame immediately so the screen isn't blank during intro.
  renderFrame(0);

  // 1. Camera fade-in
  await playIntro();

  // 2. Countdown
  playSfx('start');
  await countdown();

  // 3. Launch race
  lockInput(false);
  startMusic();
  notify('LAP 1');
  _running = true;
  _paused  = false;
  _last    = performance.now();
  _accum   = 0;
  requestAnimationFrame(loopGame);
}

function pauseGame() {
  if (!_running) return;
  _paused = true;
  show('pause');
  stopAll();
}

function resumeGame() {
  if (!_running) return;
  _paused = false;
  show('game');
  startMusic();
  _last = performance.now();
  requestAnimationFrame(loopGame);
}

function quitToMenu() {
  _running = false;
  _paused  = false;
  stopAll();
  show('menu');
  loopMenu();
}

async function endRace() {
  _winShown = true;
  // Race-end fly-out (camera shrinks, player coasts forward — input already
  // ignored because P.endPhase >= 1 in roadSystem).
  lockInput(true);
  stopMusic();
  playSfx('win');

  await playOutro();

  // Show win card with fade
  document.getElementById('ws-t').textContent = fmtT(P.raceTime);
  document.getElementById('ws-b').textContent = best() ? fmtT(best()) : '—';
  document.getElementById('ws-l').textContent = String(P.lapCount);
  show('win');
  // Render keeps running underneath until quit/again — pause its physics:
  P.endPhase = 2;
}

// ═══════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════
function loopGame(now) {
  if (!_running || _paused) return;

  const dtRaw = Math.min(0.05, (now - _last) / 1000);
  _last = now;

  // Fixed-step physics
  _accum += dtRaw;
  const STEP = C.STEP;
  const inp = readInput();

  while (_accum >= STEP) {
    updatePhys(inp, STEP, trackLen);

    // Scenery collisions (player vs trees / arches / coins / boosters).
    const a = getCarAnchor();
    checkSceneryCollisions(sceneryObjs, a.anchorX, a.anchorY);

    // Skid marks under car when handbraking or braking hard
    if ((inp.hand || inp.down) && P.speed > C.NORMAL_MAX * 0.35) {
      if (Math.random() < 0.45) {
        spawnSkid(a.anchorX - a.drawW * 0.30, a.anchorY + a.drawH * 0.06);
        spawnSkid(a.anchorX + a.drawW * 0.30, a.anchorY + a.drawH * 0.06);
      }
    }

    _accum -= STEP;
  }

  // Per-frame ticks (animations, audio loops)
  tickParts(dtRaw);
  tickCamAnim(dtRaw);
  tickEdgeScrape();
  setEngineSpeed(Math.min(1, P.speed / C.NITRO_MAX));

  // Steering visual: works even at zero speed (UI keys directly).
  const steerVisual = (K.left ? -1 : 0) + (K.right ? 1 : 0);

  renderFrame(steerVisual);
  updHUD(_fps, trackLen);
  updLaps();

  // FPS
  _fpsT += dtRaw; _fpsN++;
  if (_fpsT >= 0.5) { _fps = (_fpsN / _fpsT) | 0; _fpsT = 0; _fpsN = 0; }

  // Race end trigger
  if (P.raceFinished && !_winShown) {
    endRace();
  }

  requestAnimationFrame(loopGame);
}