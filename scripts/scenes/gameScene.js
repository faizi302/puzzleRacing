import { sizeCanvas } from '../core/canvas.js';
import { readInput, lockInput, K } from '../core/inputController.js';
import {
  P, resetPhys, updatePhys, best, setReverseHintCallback, setReverseUnlockCallback,
} from '../systems/roadSystem.js';
import { buildTrack, trackLen } from '../core/roadMap.js';
import { setActiveLevel } from '../core/activeLevel.js';
import { buildScenery, sceneryObjs } from '../visuals/sceneryRender.js';
import {
  resetParts, tickParts, checkSceneryCollisions, tickEdgeScrape, spawnSkid,
} from '../systems/collisionSystem.js';
import { renderFrame } from '../visuals/render.js';
import { fmtT } from '../visuals/playerRender.js';
import { show } from '../systems/gameState.js';
import {
  notify, countdown, playIntro, playOutro, tickCamAnim,
} from '../player/playerAnimation.js';
import { getCarAnchor } from '../player/player.js';
import {
  unlockAudio, playSfx, stopAll, startMusic, stopMusic, setEngineSpeed,
} from '../core/audio.js';
import { C } from '../configs/roadConfig.js';
import {
  addCoins, addKeys, completeLevel, getSetting,
} from '../player/playerData.js';
import { setLevelImages } from '../visuals/objectRender.js';

import {
  buildRaceHUD, updateRaceHUD, showRaceHUD, hideRaceHUD,
  showRaceHint, hideRaceHint,
} from '../visuals/uiRender.js';

import {
  resetOpponents,
  updateOpponents,
  getOpponentCount,
  getPlayerRacePosition,
} from '../systems/opponentSystem.js';

import { loadOpponentSprites } from '../visuals/opponentSprites.js';

import { renderInGameMinimap, clearMinimapCache } from '../ui/levelPreview.js';


let _listOpponents = null;
import('../systems/opponentSystem.js').then((mod) => {
  _listOpponents = mod.getOpponents
    || mod.listOpponents
    || mod.getOpponentList
    || null;
}).catch(() => { /* no enumeration available */ });

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

    this._raceCoins = 0;
    this._raceKeys = 0;
    this._lastKeyCount = 0;
    this._lastCoinCount = 0;

    this._opponents = 6;
    this._position = 1;

    this._minimapCanvas = null;
    this._minimapCtx = null;


    this._raceDistance = 0;
    this._lastProgressPos = 0;

    this._minimapCanvas = null;
    this._minimapCtx = null;


    setReverseHintCallback(() => {
      try {
        if (getSetting('soundOn')) playSfx('coin');
      } catch (e) { }
    });

    setReverseUnlockCallback(() => {
      try {
        notify(this.level?.reverseMessage || 'SECRET ROAD DISCOVERED!');
      } catch (e) { }
      try {
        if (getSetting('soundOn')) playSfx('nitro');
      } catch (e) { }
    });

    this._autoPausedByTab = false;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.running && !this.paused) {
          this._autoPausedByTab = true;
          this.pause();
        }
      } else {
        if (this.running && this._autoPausedByTab) {
          this._autoPausedByTab = false;
          this.resume();
        }
      }
    });
  }

  isPaused() { return this.paused; }

  _tickRaceDistance() {
    if (!trackLen) return;

    const curPos = P.pos || 0;
    let moved = curPos - this._lastProgressPos;

    if (moved < -trackLen * 0.5) {
      moved += trackLen;

      // NEW LAP: reset HUD progress back to 0
      this._raceDistance = 0;
    }
    if (moved > trackLen * 0.5) {
      moved -= trackLen;
    }

    if ((P.speed || 0) > 0) {
      this._raceDistance += Math.max(0, moved);
    }

    this._raceDistance = Math.max(0, Math.min(trackLen, this._raceDistance));
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
    this.winShown = false;
    this.loseShown = false;
    this._failReason = null;
    this._raceCoins = 0;
    this._raceKeys = 0;
    this._lastKeyCount = 0;
    this._lastCoinCount = 0;
    this._position = 1;

    document.getElementById('s-win')?.classList.remove('on');
    document.getElementById('s-lose')?.classList.remove('on');
    document.getElementById('s-pause')?.classList.remove('on');
    document.getElementById('s-gameover')?.classList.remove('on');

    buildTrack(buildScenery);
    resetPhys();
    resetParts();

    if (this.level?.resetPuzzle) {
      this.level.resetPuzzle();
    }

    if (this.level?.setRoad2UnlockCallback) {
      this.level.setRoad2UnlockCallback(() => {
        try {
          notify(this.level.road2UnlockMessage
            || 'SECRET ROAD UNLOCKED — HEAD FOR THE FINISH!');
        } catch (e) { }
        try { if (getSetting('soundOn')) playSfx('nitro'); } catch (e) { }
      });
    }
    if (this.level?.setDeathCallback) {

      this.level.setDeathCallback(() => { /* lose-modal handled via P.raceFailed */ });
    }

    try { clearMinimapCache(); } catch (e) { }
    this._ensureMinimap();
    this._showMinimap();

    this._raceDistance = 0;
    this._lastProgressPos = P.pos || 0;

    await loadOpponentSprites();
    resetOpponents(this.level?.id || 'level1');

    this._opponents = getOpponentCount();
    this._opponents = getOpponentCount();
    this._position = getPlayerRacePosition();

    show('game');
    sizeCanvas();

    buildRaceHUD({ onPause: () => this.pause() });
    showRaceHUD();
    hideRaceHint();

    this._showMinimap();

    this._showStartRank = true;
    updateRaceHUD(this._hudSnapshot());

    lockInput(true);
    renderFrame(0);

    await playIntro();

    if (getSetting('soundOn')) {
      playSfx('engine', {
        volume: 0.35
      });
    }

    await countdown();

    this._showStartRank = false;
    updateRaceHUD(this._hudSnapshot());

    lockInput(false);

    if (getSetting('musicOn')) {
      startMusic();
    }

    const title = this.level.startMessage || 'LAP 1';
    const sub = this.level.hintMessage || '';
    showRaceHint(title, sub, 4200);

    this.running = true;
    this.paused = false;
    this.last = performance.now();
    this.accum = 0;
    requestAnimationFrame(this.loop);
  }

  exit() {
    hideRaceHUD();
  }

  // MINIMAP — create one canvas element, then paint it
  // ════════════════════════════════════════════════════
  _ensureMinimap() {
    if (this._minimapCanvas && document.body.contains(this._minimapCanvas)) {
      return;
    }
    const host = document.getElementById('s-game') || document.body;
    let cv = document.getElementById('mini-map');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.id = 'mini-map';
      cv.width = 180;
      cv.height = 120;
      cv.style.cssText = [
        'position:absolute',
        'right:14px',
        'top:64px',
        'width:180px',
        'height:120px',
        'pointer-events:none',
        'z-index:40',
        'border-radius:10px',
        'box-shadow:0 4px 14px rgba(0,0,0,0.45)',
      ].join(';');
      host.appendChild(cv);
    }
    this._minimapCanvas = cv;
    this._minimapCtx = cv.getContext('2d');
  }

  _showMinimap() {
    if (this._minimapCanvas) this._minimapCanvas.style.display = 'block';
  }

  _hideMinimap() {
    if (this._minimapCanvas) this._minimapCanvas.style.display = 'none';
  }

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

    document.getElementById('s-pause')?.classList.remove('on');
    document.getElementById('s-win')?.classList.remove('on');
    document.getElementById('s-lose')?.classList.remove('on');

    this.enter(this.level);
  }

  async endRace() {
    this.winShown = true;
    lockInput(true);
    stopMusic();
    if (getSetting('soundOn')) playSfx('win');

    // ── Persist to player data ──
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
    if (getSetting('soundOn')) {
      try { playSfx('coin'); } catch (e) { }
    }

    const totalLaps = (this.level?.totalLaps) || P.totalLaps || 1;
    const lapsDone = Math.max(0, P.lapCount || 0);
    const lapFrac = trackLen > 0 ? Math.min(1, this._raceDistance / trackLen) : 0;
    const progress = Math.min(1, (lapsDone + lapFrac) / totalLaps);
    const pct = Math.round(progress * 100);

    // Stats
    const lapShown = Math.max(1, Math.min(totalLaps, lapsDone + 1));
    const posTxt = `${this._position} / ${this._opponents}`;

    // Populate DOM
    const reasonEl = document.getElementById('ls-reason');
    if (reasonEl && reason) reasonEl.textContent = reason;
    else if (reasonEl) reasonEl.textContent = "You didn't make it this time";

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

  // Track coin/key gain during the race
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

  // ── HUD data assembler ──────────────────────────────────────
  _hudSnapshot() {
    const totalLaps = (this.level?.totalLaps) || P.totalLaps || 1;
    const lap = Math.max(1, Math.min(totalLaps, (P.lapCount || 0) + 1));

    const distPct = trackLen > 0 ? this._raceDistance / trackLen : 0;

    return {
      speed: Math.round(
        (Math.abs(P.speed || 0)) / C.KMH_TO_WORLD
      ),
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

    const dtRaw = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    this.accum += dtRaw;
    const STEP = C.STEP;
    const inp = readInput();


    while (this.accum >= STEP) {
      updatePhys(inp, STEP, trackLen);

      this._tickRaceDistance();

      if (this.level?.updatePuzzle) {
        this.level.updatePuzzle(STEP, sceneryObjs);
      }

      updateOpponents(STEP, sceneryObjs);

      this._position = getPlayerRacePosition();
      this._opponents = getOpponentCount();

      const a = getCarAnchor();
      checkSceneryCollisions(sceneryObjs, a.anchorX, a.anchorY);

      this.accum -= STEP;
    }

    this._trackPickups();

    if (P._needsTrackSwitch) {
      P._needsTrackSwitch = false;
      buildScenery();
      try { notify(this.level.forkMessage || 'RIGHT FORK! ROAD 2 UNLOCKED — FINISH THE LAP!'); } catch (e) { }
      try { if (getSetting('soundOn')) playSfx('nitro'); } catch (e) { }
    }

    tickParts(dtRaw);
    tickCamAnim(dtRaw);
    tickEdgeScrape();

    const steerVisual = (K.left ? -1 : 0) + (K.right ? 1 : 0);
    renderFrame(steerVisual);

    // ── Drive the Asphalt-style HUD ──
    updateRaceHUD(this._hudSnapshot());

    // ── Drive the minimap (real-road shape) ──
    this._paintMinimap();

    this.fpsT += dtRaw; this.fpsN++;
    if (this.fpsT >= 0.5) { this.fps = (this.fpsN / this.fpsT) | 0; this.fpsT = 0; this.fpsN = 0; }

    if (P.raceFinished && !this.winShown) this.endRace();
    else if (P.raceFailed && !this.loseShown && !this.winShown) {
      const reason = P._failReason || this._failReason;
      this.loseRace(reason);
    }

    requestAnimationFrame(this.loop);
  };
}