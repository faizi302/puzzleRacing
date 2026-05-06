// ═══════════════════════════════════════════════════════
// GAME SCENE — Race loop. Now saves progress on completion
// and tracks coins/keys collected during the race.
// ═══════════════════════════════════════════════════════
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
import { updHUD, updLaps, fmtT } from '../visuals/playerRender.js';
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
    this.level = null;

    // Track stats for THIS race only — committed on win.
    this._raceCoins = 0;
    this._raceKeys = 0;
    this._lastKeyCount = 0;
    this._lastCoinCount = 0;

    setReverseHintCallback(() => {
      try {
        notify(this.level?.hintMessage || 'Sometimes the only way forward is backward.');
      } catch (e) { }
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

    window.addEventListener('blur', () => {
      if (this.running && !this.paused) {
        this._autoPausedByTab = true;
        this.pause();
      }
    });
  }

  isPaused() { return this.paused; }

  async enter(level) {
    if (level) {
      this.level = level;
      setActiveLevel(level);
      await setLevelImages(level);
    }
    if (!this.level) return;

    unlockAudio();
    this.winShown = false;
    this._raceCoins = 0;
    this._raceKeys = 0;
    this._lastKeyCount = 0;
    this._lastCoinCount = 0;

    document.getElementById('s-win')?.classList.remove('on');
    document.getElementById('s-pause')?.classList.remove('on');

    buildTrack(buildScenery);
    resetPhys();
    resetParts();

    show('game');
    sizeCanvas();

    lockInput(true);
    renderFrame(0);

    await playIntro();
    if (getSetting('soundOn')) playSfx('start');
    await countdown();

    lockInput(false);
    if (getSetting('musicOn')) startMusic();
    notify(this.level.startMessage || 'LAP 1');

    this.running = true;
    this.paused = false;
    this.last = performance.now();
    this.accum = 0;
    requestAnimationFrame(this.loop);
  }

  exit() { }

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
    P.endPhase = 2;
  }

  // Track coin/key gain during the race
  _trackPickups() {
    // P.keysCollected and (if you have it) coin counter
    // Adjust according to your existing collision system
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

  loop = (now) => {
    if (!this.running || this.paused) return;

    const dtRaw = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    this.accum += dtRaw;
    const STEP = C.STEP;
    const inp = readInput();

    while (this.accum >= STEP) {
      updatePhys(inp, STEP, trackLen);

      const a = getCarAnchor();
      checkSceneryCollisions(sceneryObjs, a.anchorX, a.anchorY);

      if ((inp.hand || inp.down) && P.speed > C.NORMAL_MAX * 0.35) {
        if (Math.random() < 0.45) {
          spawnSkid(a.anchorX - a.drawW * 0.30, a.anchorY + a.drawH * 0.06);
          spawnSkid(a.anchorX + a.drawW * 0.30, a.anchorY + a.drawH * 0.06);
        }
      }

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
    setEngineSpeed(Math.min(1, P.speed / C.NITRO_MAX));

    const steerVisual = (K.left ? -1 : 0) + (K.right ? 1 : 0);
    renderFrame(steerVisual);
    updHUD(this.fps, trackLen);
    updLaps();

    this.fpsT += dtRaw; this.fpsN++;
    if (this.fpsT >= 0.5) { this.fps = (this.fpsN / this.fpsT) | 0; this.fpsT = 0; this.fpsN = 0; }

    if (P.raceFinished && !this.winShown) this.endRace();

    requestAnimationFrame(this.loop);
  };
}