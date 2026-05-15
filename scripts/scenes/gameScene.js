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

import {
  resetOpponents,
  updateOpponents,
  getOpponentCount,
  getPlayerRacePosition,
} from '../systems/opponentSystem.js';

import { loadOpponentSprites } from '../visuals/opponentSprites.js';

// ── Minimap (real-road-shape mini map painted each frame) ──
import { renderInGameMinimap, clearMinimapCache } from '../ui/levelPreview.js';

// Try to import a "list opponents" helper without breaking on
// engines that don't expose one. Resolved lazily so a missing
// export doesn't crash the module-load phase.
let _listOpponents = null;
import('../systems/opponentSystem.js').then((mod) => {
  // Recognize any of these export names; first one wins.
  _listOpponents = mod.getOpponents
                || mod.listOpponents
                || mod.getOpponentList
                || null;
}).catch(() => { /* fine — fall back to count-only */ });

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
    this._position = 1;


    this._raceDistance = 0;
    this._lastProgressPos = 0;

    // ── Minimap canvas (built on first enter, painted each frame) ──
    this._minimapCanvas = null;
    this._minimapCtx    = null;

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

  _tickRaceDistance() {
    if (!trackLen) return;

    const curPos = P.pos || 0;
    let moved = curPos - this._lastProgressPos;

    // Lap wrap: player crossed finish/start line forward
    if (moved < -trackLen * 0.5) {
      moved += trackLen;

      // NEW LAP: reset HUD progress back to 0
      this._raceDistance = 0;
    }

    // Reverse wrap protection
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
    this._raceCoins = 0;
    this._raceKeys = 0;
    this._lastKeyCount = 0;
    this._lastCoinCount = 0;
    this._position = 1;

    document.getElementById('s-win')?.classList.remove('on');
    document.getElementById('s-pause')?.classList.remove('on');
    document.getElementById('s-gameover')?.classList.remove('on');

    buildTrack(buildScenery);
    resetPhys();
    resetParts();

    if (this.level?.resetPuzzle) {
      this.level.resetPuzzle();
    }

    // ── Wire up Level-1-style callbacks (defensive — no-op
    //    for levels that don't expose these hooks) ───────────
    if (this.level?.setRoad2UnlockCallback) {
      this.level.setRoad2UnlockCallback(() => {
        try {
          notify(this.level.road2UnlockMessage
            || 'SECRET ROAD UNLOCKED — HEAD FOR THE FINISH!');
        } catch (e) {}
        try {
          if (getSetting('soundOn')) playSfx('nitro');
        } catch (e) {}
      });
    }
    if (this.level?.setDeathCallback) {
      this.level.setDeathCallback(() => this.endGameOver());
    }
    this._gameOverShown = false;

    // ── Rebuild minimap cache (road shape may differ per
    //    level / per active road) ─────────────────────────
    try { clearMinimapCache(); } catch (e) {}
    this._ensureMinimap();
    this._raceDistance = 0;
    this._lastProgressPos = P.pos || 0;

    await loadOpponentSprites();
    resetOpponents(this.level?.id || 'level1');

    this._opponents = getOpponentCount();
    this._opponents = getOpponentCount();
    this._position = getPlayerRacePosition();

    show('game');
    sizeCanvas();

    // ── Build & show the new HUD ──
    buildRaceHUD({ onPause: () => this.pause() });
    showRaceHUD();
    hideRaceHint();

    // Show the minimap (created in _ensureMinimap() earlier).
    this._showMinimap();

    // Force countdown ranking: 6/6
    this._showStartRank = true;
    updateRaceHUD(this._hudSnapshot());

    lockInput(true);
    renderFrame(0);

    await playIntro();
    if (getSetting('soundOn')) playSfx('start');
    await countdown();

    this._showStartRank = false;
    updateRaceHUD(this._hudSnapshot());

    lockInput(false);
    if (getSetting('musicOn')) startMusic();

    // ── Race-start HINT (one-shot, replaces the old notify call) ──
    // Title  = the dramatic headline
    // Sub    = the explanatory line
    // Auto-hides after 4.2s.
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

  // ════════════════════════════════════════════════════
  // MINIMAP — create the canvas element once, then paint
  // it from the loop with a snapshot of player/opponent
  // positions. Positioned top-right by default; the inline
  // styles keep it self-contained so no CSS changes needed.
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
      cv.width  = 180;
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
        'image-rendering:auto',
      ].join(';');
      host.appendChild(cv);
    }
    this._minimapCanvas = cv;
    this._minimapCtx    = cv.getContext('2d');
  }

  _hideMinimap() {
    if (this._minimapCanvas) this._minimapCanvas.style.display = 'none';
  }
  _showMinimap() {
    if (this._minimapCanvas) this._minimapCanvas.style.display = 'block';
  }

  _paintMinimap() {
    if (!this._minimapCanvas) return;

    // Best-effort opponent listing. If opponentSystem.js exposes
    // a function that returns the raw opponent array, we use it
    // for accurate map dots; otherwise the map just omits them.
    let opps = [];
    if (_listOpponents) {
      try {
        const raw = _listOpponents();
        if (Array.isArray(raw)) opps = raw;
      } catch (e) { opps = []; }
    }

    renderInGameMinimap(this._minimapCanvas, {
      level:      this.level,
      trackLen,
      playerPos:  P.pos || 0,
      playerLane: P.playerX || 0,
      onRoad2:    !!P.onRoad2,
      opponents:  opps,
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
    this._gameOverShown = false;
    this._showStartRank = false;

    stopAll();
    stopMusic();
    hideRaceHUD();
    hideRaceHint();
    this._hideMinimap();

    document.getElementById('s-pause')?.classList.remove('on');
    document.getElementById('s-win')?.classList.remove('on');
    document.getElementById('s-gameover')?.classList.remove('on');

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

  // ════════════════════════════════════════════════════
  // GAME OVER — shown when the player is killed (e.g. by
  // the gorilla on Level 1).  Distinct from endRace():
  //   • Does NOT mark the level as complete.
  //   • Does NOT persist coins/keys earned this run.
  //   • Shows the #s-gameover modal which offers ONLY
  //     Restart + Menu — no "next level" button.
  // ════════════════════════════════════════════════════
  endGameOver() {
    if (this._gameOverShown) return;
    this._gameOverShown = true;

    lockInput(true);
    stopMusic();
    try { stopAll(); } catch (e) {}
    if (getSetting('soundOn')) {
      try { playSfx('crash', { volume: 1.0 }); } catch (e) {}
    }

    hideRaceHint();
    hideRaceHUD();
    this._hideMinimap();

    // Belt-and-suspenders: directly toggle the .on class in
    // case the SceneManager doesn't have 'gameover' registered.
    document.getElementById('s-gameover')?.classList.add('on');
    try { show('gameover'); } catch (e) { /* not a registered scene */ }
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
    const lap = Math.max(1, Math.min(totalLaps, (P.lapCount || 0) + 1));

    // Distance through the CURRENT lap.
    // P.pos is a forward distance accumulator in your engine;
    // use modulo-trackLen for safety.
    const distPct = trackLen > 0 ? this._raceDistance / trackLen : 0;

    return {
      speed: Math.abs(P.speed || 0),
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
    setEngineSpeed(Math.min(1, P.speed / C.NITRO_MAX));

    const steerVisual = (K.left ? -1 : 0) + (K.right ? 1 : 0);
    renderFrame(steerVisual);

    // ── DOM HUD is the only source of truth now. ──
    // (Old in-canvas updHUD/updLaps writers removed — they wrote to
    //  #h-spd/#h-lap/#ll which no longer exist in index.html.)

    // ── Drive the Asphalt-style HUD ──
    updateRaceHUD(this._hudSnapshot());

    // ── Drive the minimap (real-road shape) ──
    this._paintMinimap();

    this.fpsT += dtRaw; this.fpsN++;
    if (this.fpsT >= 0.5) { this.fps = (this.fpsN / this.fpsT) | 0; this.fpsT = 0; this.fpsN = 0; }

    // ── End-of-race resolution ──────────────────────────
    //   • P.ghostDead     → Game Over modal (Restart / Menu)
    //   • P.raceFinished  → Win modal
    // Death is checked FIRST so a simultaneous death+finish
    // never credits a win.
    if (P.ghostDead && !this._gameOverShown) {
      this.endGameOver();
    } else if (P.raceFinished && !this.winShown && !P.ghostDead) {
      this.endRace();
    }

    requestAnimationFrame(this.loop);
  };
}