// ═══════════════════════════════════════════════════════
// GAME SCENE — Race loop. Now drives the new Asphalt-style
// DOM HUD (uiRender.js) and shows the start hint exactly
// once per race. Position/opponents are placeholder-ready
// so AI rivals can be wired in without touching the HUD.
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
// fmtT is the only thing still needed from playerRender — the old
// updHUD/updLaps wrote into #h-spd/#h-lap/#ll which were removed
// from index.html when the Asphalt-style HUD was added. Calling them
// now would throw on null references and crash the game loop.
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

// ── NEW: Asphalt-style HUD + one-shot hint ──
import {
  buildRaceHUD, updateRaceHUD, showRaceHUD, hideRaceHUD,
  showRaceHint, hideRaceHint,
} from '../visuals/uiRender.js';

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

    // ── Position / opponents (placeholder until AI rivals exist) ──
    // When you add AI cars, set this._opponents = N and update
    // this._position from your race-position system each frame.
    this._opponents = 6;   // shows "1/6" like Asphalt
    this._position  = 1;

    // ── Reverse-road hint trigger ──────────────────────────────
    // The visible reminder for this is the orange race-start banner
    // (showRaceHint) which already shows level.hintMessage. We
    // purposely do NOT call notify() here, otherwise the player
    // would see the same line twice (banner + lower toast card).
    // The audio cue is kept so the trigger still has feedback.
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
    this._position = 1;

    document.getElementById('s-win')?.classList.remove('on');
    document.getElementById('s-pause')?.classList.remove('on');

    buildTrack(buildScenery);
    resetPhys();
    resetParts();

    show('game');
    sizeCanvas();

    // ── Build & show the new HUD ──
    buildRaceHUD({ onPause: () => this.pause() });
    showRaceHUD();
    hideRaceHint(); // make sure no leftover hint is visible

    lockInput(true);
    renderFrame(0);

    await playIntro();
    if (getSetting('soundOn')) playSfx('start');
    await countdown();

    lockInput(false);
    if (getSetting('musicOn')) startMusic();

    // ── Race-start HINT (one-shot, replaces the old notify call) ──
    // Title  = the dramatic headline
    // Sub    = the explanatory line
    // Auto-hides after 4.2s.
    const title = this.level.startMessage || 'LAP 1';
    const sub   = this.level.hintMessage  || '';
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
    P.endPhase = 2;
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
  // Pulls everything the HUD needs from P + trackLen + level meta.
  // Everything here is a read-only snapshot, no mutation.
  _hudSnapshot() {
    const totalLaps = (this.level?.totalLaps) || P.totalLaps || 1;
    const lap       = Math.max(1, Math.min(totalLaps, (P.lapCount || 0) + 1));

    // Distance through the CURRENT lap.
    // P.pos is a forward distance accumulator in your engine;
    // use modulo-trackLen for safety.
    const lapPos = trackLen > 0 ? ((P.pos || 0) % trackLen) : 0;
    const distPct = trackLen > 0 ? lapPos / trackLen : 0;

    return {
      speed:       Math.abs(P.speed || 0),
      distPct,
      lap,
      totalLaps,
      raceTime:    P.raceTime || 0,
      bestTime:    best() || 0,
      position:    this._position,
      opponents:   this._opponents,
      nitroStored: P.nitroStored || 0,
      nitroMax:    P.nitroMax || 3,
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

    // ── DOM HUD is the only source of truth now. ──
    // (Old in-canvas updHUD/updLaps writers removed — they wrote to
    //  #h-spd/#h-lap/#ll which no longer exist in index.html.)

    // ── Drive the Asphalt-style HUD ──
    updateRaceHUD(this._hudSnapshot());

    this.fpsT += dtRaw; this.fpsN++;
    if (this.fpsT >= 0.5) { this.fps = (this.fpsN / this.fpsT) | 0; this.fpsT = 0; this.fpsN = 0; }

    if (P.raceFinished && !this.winShown) this.endRace();

    requestAnimationFrame(this.loop);
  };
}