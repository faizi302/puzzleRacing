// Game scene — orchestrates a single race from intro to win/lose.

import { sizeCanvas } from '../core/canvas.js';
import { readInput, lockInput, K } from '../core/inputController.js';
import {
  P, resetPhys, updatePhys, best,
  setReverseHintCallback, setReverseUnlockCallback,
} from '../systems/roadSystem.js';
import { buildTrack, trackLen } from '../core/roadMap.js';
import { setActiveLevel } from '../core/activeLevel.js';
import { buildScenery, sceneryObjs } from '../visuals/sceneryRender.js';
import {
  resetParts, tickParts, checkSceneryCollisions, tickEdgeScrape,
} from '../systems/collisionSystem.js';
import { renderFrame } from '../visuals/render.js';
import { fmtT } from '../visuals/playerRender.js';
import { show } from '../systems/gameState.js';
import {
  notify, countdown, playIntro, playOutro, tickCamAnim,
} from '../player/playerAnimation.js';
import { getCarAnchor } from '../player/player.js';
import {
  unlockAudio, playSfx, stopAll, startMusic, stopMusic,
} from '../core/audio.js';
import { C } from '../configs/roadConfig.js';
import {
  addCoins, addKeys, completeLevel, getSetting,
} from '../player/playerData.js';
import { setLevelImages } from '../visuals/objectRender.js';
import { clamp } from '../utils/math.js';
import { safeCall, isDebugPerf, updateDebugHUD } from '../utils/debug.js';

import {
  buildRaceHUD, updateRaceHUD, showRaceHUD, hideRaceHUD,
  showRaceHint, hideRaceHint,
} from '../visuals/uiRender.js';

import {
  resetOpponents, updateOpponents,
  getOpponentCount, getPlayerRacePosition,
} from '../systems/opponentSystem.js';

import { loadOpponentSprites } from '../visuals/opponentSprites.js';
import { renderInGameMinimap, clearMinimapCache } from '../ui/levelPreview.js';

// Optional opponent enumeration (loaded async, optional)
let _listOpponents = null;
import('../systems/opponentSystem.js').then((mod) => {
  _listOpponents = mod.getOpponents || mod.listOpponents || mod.getOpponentList || null;
}).catch(() => { });

// Throttle intervals (ms)
const HUD_UPDATE_MS = 60;
const MINIMAP_UPDATE_MS = 100;

// Hard cap on physics steps per frame — prevents death spiral after tab switch.
const MAX_PHYS_STEPS = 5;
const MAX_DT_RAW = 0.05;

export class GameScene {
  constructor(sceneManager) {
    this.scenes = sceneManager;
    this.running = false;
    this.paused = false;
    this.last = 0;
    this.accum = 0;
    this.fps = 60;
    this.fpsT = 0;
    this.fpsN = 0;

    this.winShown = false;
    this.loseShown = false;
    this._failReason = null;
    this.level = null;

    // Pickup tracking
    this._raceCoins = 0;
    this._raceKeys = 0;
    this._lastKeyCount = 0;
    this._lastCoinCount = 0;

    // Race position
    this._opponents = 6;
    this._position = 1;
    this._showStartRank = false;

    // Progress
    this._raceDistance = 0;
    this._lastProgressPos = 0;

    // Minimap
    this._minimapCanvas = null;
    this._minimapCtx = null;

    // Throttle timestamps
    this._lastHudUpdate = 0;
    this._lastMinimapUpdate = 0;

    this._autoPausedByTab = false;

    // Hooks
    setReverseHintCallback(() => {
      if (getSetting('soundOn')) safeCall(playSfx, 'coin');
    });
    setReverseUnlockCallback(() => {
      safeCall(() => notify(this.level?.reverseMessage || 'SECRET ROAD DISCOVERED!'));
      if (getSetting('soundOn')) safeCall(playSfx, 'nitro');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.running && !this.paused) {
          this._autoPausedByTab = true;
          this.pause();
        }
      } else if (this.running && this._autoPausedByTab) {
        this._autoPausedByTab = false;
        this.resume();
      }
    });
  }

  isPaused() { return this.paused; }

  // Lap progress (wrap-aware)
  _tickRaceDistance() {
    if (!trackLen) return;
    const curPos = P.pos || 0;
    let moved = curPos - this._lastProgressPos;

    if (moved < -trackLen * 0.5) {
      moved += trackLen;
      this._raceDistance = 0;  // new lap → reset HUD progress
    }
    if (moved > trackLen * 0.5) moved -= trackLen;

    if ((P.speed || 0) > 0) this._raceDistance += Math.max(0, moved);
    this._raceDistance = clamp(this._raceDistance, 0, trackLen);
    this._lastProgressPos = curPos;
  }

  async enter(level) {
    if (level) {
      this.level = level;
      setActiveLevel(level);
      await setLevelImages(level);
    }
    if (!this.level) return;

    unlockAudio();

    // Reset run flags
    this.winShown = false;
    this.loseShown = false;
    this._failReason = null;
    this._raceCoins = 0;
    this._raceKeys = 0;
    this._lastKeyCount = 0;
    this._lastCoinCount = 0;
    this._position = 1;
    this._showStartRank = true;
    this._lastHudUpdate = 0;
    this._lastMinimapUpdate = 0;

    ['s-win', 's-lose', 's-pause', 's-gameover'].forEach((id) => {
      document.getElementById(id)?.classList.remove('on');
    });

    buildTrack(buildScenery);
    resetPhys();
    resetParts();

    this.level?.resetPuzzle?.();

    this.level?.setRoad2UnlockCallback?.(() => {
      safeCall(() => notify(this.level.road2UnlockMessage
        || 'SECRET ROAD UNLOCKED — HEAD FOR THE FINISH!'));
      if (getSetting('soundOn')) safeCall(playSfx, 'nitro');
    });
    this.level?.setDeathCallback?.(() => { /* lose modal handled via P.raceFailed */ });

    safeCall(clearMinimapCache);
    this._ensureMinimap();
    this._showMinimap();

    this._raceDistance = 0;
    this._lastProgressPos = P.pos || 0;

    await loadOpponentSprites();
    resetOpponents(this.level?.id || 'level1');

    this._opponents = getOpponentCount();
    this._position = getPlayerRacePosition();

    show('game');
    sizeCanvas();

    buildRaceHUD({ onPause: () => this.pause() });
    showRaceHUD();
    hideRaceHint();
    this._showMinimap();

    updateRaceHUD(this._hudSnapshot());

    lockInput(true);
    renderFrame(0);

    await playIntro();

    if (getSetting('soundOn')) playSfx('engine', { volume: 0.35 });

    await countdown();

    this._showStartRank = false;
    updateRaceHUD(this._hudSnapshot());
    lockInput(false);

    if (getSetting('musicOn')) startMusic();

    const title = this.level.startMessage || 'LAP 1';
    const sub = this.level.hintMessage || '';
    showRaceHint(title, sub, 4200);

    this.running = true;
    this.paused = false;
    this.last = performance.now();
    this.accum = 0;
    requestAnimationFrame(this.loop);
  }

  exit() { hideRaceHUD(); }

  // Minimap setup
  _ensureMinimap() {
    if (this._minimapCanvas && document.body.contains(this._minimapCanvas)) return;
    const host = document.getElementById('s-game') || document.body;
    let cv = document.getElementById('mini-map');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.id = 'mini-map';
      cv.width = 180;
      cv.height = 120;
      cv.style.cssText = [
        'position:absolute', 'right:14px', 'top:64px',
        'width:180px', 'height:120px', 'pointer-events:none', 'z-index:40',
        'border-radius:0', 'box-shadow:none',
      ].join(';');
      host.appendChild(cv);
    }
    this._minimapCanvas = cv;
    this._minimapCtx = cv.getContext('2d');
  }

  _showMinimap() { if (this._minimapCanvas) this._minimapCanvas.style.display = 'block'; }
  _hideMinimap() { if (this._minimapCanvas) this._minimapCanvas.style.display = 'none'; }

  _paintMinimap() {
    if (!this._minimapCanvas) return;

    let opps = [];
    if (_listOpponents) {
      try {
        const raw = _listOpponents();
        if (Array.isArray(raw)) opps = raw;
      } catch (e) { opps = []; }
    }

    renderInGameMinimap(this._minimapCanvas, {
      level: this.level,
      trackLen,
      playerPos: P.pos || 0,
      playerLane: P.playerX || 0,
      onRoad2: !!P.onRoad2,
      opponents: opps,
    });
  }

  pause() {
    if (!this.running) return;
    this.paused = true;
    show('pause');
    stopAll();
  }

  resume() {
    if (!this.running) return;
    this.paused = false;
    show('game');
    if (getSetting('musicOn')) startMusic();
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }

  quit() {
    this.running = false;
    this.paused = false;
    stopAll();
    hideRaceHUD();
    this._hideMinimap();
  }

  restart() {
    if (!this.level) return;
    this.running = false;
    this.paused = false;
    this.winShown = false;
    this.loseShown = false;
    this._failReason = null;
    this._showStartRank = false;

    P.raceFailed = false;
    P.raceFinished = false;
    P._failReason = null;
    P.ghostDead = false;
    stopAll();
    stopMusic();
    hideRaceHUD();
    hideRaceHint();
    this._hideMinimap();

    ['s-pause', 's-win', 's-lose'].forEach((id) => {
      document.getElementById(id)?.classList.remove('on');
    });

    this.enter(this.level);
  }

  async endRace() {
    this.winShown = true;
    lockInput(true);
    stopMusic();
    if (getSetting('soundOn')) playSfx('win');

    if (this._raceCoins > 0) addCoins(this._raceCoins);
    if (this._raceKeys > 0) addKeys(this._raceKeys);

    const levelNum = parseInt((this.level?.id || 'level1').replace('level', ''), 10) || 1;
    completeLevel(levelNum, P.raceTime);

    await playOutro();

    document.getElementById('ws-t').textContent = fmtT(P.raceTime);
    document.getElementById('ws-b').textContent = best() ? fmtT(best()) : '—';
    document.getElementById('ws-l').textContent = String(P.lapCount);
    show('win');
    hideRaceHUD();
    this._hideMinimap();
    P.endPhase = 2;
  }

  async loseRace(reason) {
    this.loseShown = true;
    lockInput(true);
    stopMusic();
    if (getSetting('soundOn')) safeCall(playSfx, 'coin');

    const totalLaps = this.level?.totalLaps || P.totalLaps || 1;
    const lapsDone = Math.max(0, P.lapCount || 0);
    const lapFrac = trackLen > 0 ? Math.min(1, this._raceDistance / trackLen) : 0;
    const progress = Math.min(1, (lapsDone + lapFrac) / totalLaps);
    const pct = Math.round(progress * 100);

    const lapShown = Math.max(1, Math.min(totalLaps, lapsDone + 1));
    const posTxt = `${this._position} / ${this._opponents}`;

    const reasonEl = document.getElementById('ls-reason');
    if (reasonEl) reasonEl.textContent = reason || "You didn't make it this time";

    document.getElementById('ls-t').textContent = fmtT(P.raceTime || 0);
    document.getElementById('ls-l').textContent = `${lapShown} / ${totalLaps}`;
    document.getElementById('ls-p').textContent = posTxt;
    document.getElementById('ls-prog-pct').textContent = `${pct}%`;

    hideRaceHUD();
    hideRaceHint();
    this._hideMinimap();
    show('lose');

    requestAnimationFrame(() => {
      const fill = document.getElementById('ls-prog-fill');
      if (fill) fill.style.width = `${pct}%`;
    });

    P.endPhase = 2;
  }

  fail(reason) {
    if (this.winShown || this.loseShown) return;
    P.raceFailed = true;
    this._failReason = reason || null;
  }

  _trackPickups() {
    if (typeof P.keysCollected === 'number') {
      const gained = P.keysCollected - this._lastKeyCount;
      if (gained > 0) this._raceKeys += gained;
      this._lastKeyCount = P.keysCollected;
    }
    if (typeof P.coinsCollected === 'number') {
      const gained = P.coinsCollected - this._lastCoinCount;
      if (gained > 0) this._raceCoins += gained;
      this._lastCoinCount = P.coinsCollected;
    }
  }

  _hudSnapshot() {
    const totalLaps = this.level?.totalLaps || P.totalLaps || 1;
    const lap = Math.max(1, Math.min(totalLaps, (P.lapCount || 0) + 1));
    const distPct = trackLen > 0 ? this._raceDistance / trackLen : 0;

    return {
      speed: Math.round(Math.abs(P.speed || 0) / C.KMH_TO_WORLD),
      distPct,
      lap,
      totalLaps,
      raceTime: P.raceTime || 0,
      bestTime: best() || 0,
      position: this._showStartRank ? this._opponents : this._position,
      opponents: this._opponents,
      nitroStored: P.nitroStored || 0,
      nitroMax: P.nitroMax || 3,
      nitroActive: !!P.nitroActive,
    };
  }

  loop = (now) => {
    if (!this.running || this.paused) return;

    const dtRaw = Math.min(MAX_DT_RAW, (now - this.last) / 1000);
    this.last = now;
    this.accum += dtRaw;

    const STEP = C.STEP;
    const inp = readInput();

    // Bounded physics — drop overflow rather than spiraling.
    let steps = 0;
    while (this.accum >= STEP && steps < MAX_PHYS_STEPS) {
      updatePhys(inp, STEP, trackLen);
      this._tickRaceDistance();
      this.level?.updatePuzzle?.(STEP, sceneryObjs);

      updateOpponents(STEP, sceneryObjs);
      this._position = getPlayerRacePosition();
      this._opponents = getOpponentCount();

      const a = getCarAnchor();
      checkSceneryCollisions(sceneryObjs, a.anchorX, a.anchorY);

      this.accum -= STEP;
      steps++;
    }
    if (this.accum >= STEP) this.accum = 0; // drop overflow

    this._trackPickups();

    if (P._needsTrackSwitch) {
      P._needsTrackSwitch = false;
      // Defer the heavy scenery rebuild to the next animation frame so
      // it doesn't hitch the physics tick on low-end devices.
      requestAnimationFrame(() => buildScenery());
      safeCall(() => notify(this.level.forkMessage
        || 'RIGHT FORK! ROAD 2 UNLOCKED — FINISH THE LAP!'));
      if (getSetting('soundOn')) safeCall(playSfx, 'nitro');
    }

    tickParts(dtRaw);
    tickCamAnim(dtRaw);
    tickEdgeScrape();

    const steerVisual = (K.left ? -1 : 0) + (K.right ? 1 : 0);
    renderFrame(steerVisual);

    // Throttled HUD + minimap
    if (now - this._lastHudUpdate >= HUD_UPDATE_MS) {
      updateRaceHUD(this._hudSnapshot());
      this._lastHudUpdate = now;
    }
    if (now - this._lastMinimapUpdate >= MINIMAP_UPDATE_MS) {
      this._paintMinimap();
      this._lastMinimapUpdate = now;
    }

    // FPS counter
    this.fpsT += dtRaw;
    this.fpsN++;
    if (this.fpsT >= 0.5) {
      this.fps = (this.fpsN / this.fpsT) | 0;
      this.fpsT = 0;
      this.fpsN = 0;
      if (isDebugPerf()) {
        updateDebugHUD({
          fps: this.fps,
          opponents: this._opponents,
        });
      }
    }

    if (P.raceFinished && !this.winShown) {
      this.endRace();
    } else if (P.raceFailed && !this.loseShown && !this.winShown) {
      this.loseRace(P._failReason || this._failReason);
    }

    requestAnimationFrame(this.loop);
  };
}