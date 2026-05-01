// ═══════════════════════════════════════════════════════
// GAME SCENE — Race loop. Loads a level, runs physics +
// rendering, owns pause/quit/win lifecycle.
// ═══════════════════════════════════════════════════════
import { sizeCanvas }                   from '../core/canvas.js';
import { readInput, lockInput, K }      from '../core/inputController.js';
import {
  P, resetPhys, updatePhys, best, setForkWarnCallback,
} from '../systems/roadSystem.js';
import { buildTrack, trackLen }         from '../core/roadMap.js';
import { setActiveLevel }               from '../core/activeLevel.js';
import { buildScenery, sceneryObjs }    from '../visuals/sceneryRender.js';
import {
  resetParts, tickParts, checkSceneryCollisions, tickEdgeScrape, spawnSkid,
} from '../systems/collisionSystem.js';
import { renderFrame }                  from '../visuals/render.js';
import { updHUD, updLaps, fmtT }        from '../visuals/playerRender.js';
import { show }                         from '../systems/gameState.js';
import {
  notify, countdown, playIntro, playOutro, tickCamAnim,
} from '../player/playerAnimation.js';
import { getCarAnchor }                 from '../player/player.js';
import {
  unlockAudio, playSfx, stopAll, startMusic, stopMusic, setEngineSpeed,
} from '../core/audio.js';
import { C }                            from '../configs/roadConfig.js';

export class GameScene {
  constructor(sceneManager) {
    this.scenes   = sceneManager;
    this.running  = false;
    this.paused   = false;
    this.last     = 0;
    this.accum    = 0;
    this.fps      = 60;
    this.fpsT     = 0;
    this.fpsN     = 0;
    this.winShown = false;
    this.level    = null;

    // Fork-warn callback only needs to be wired once.
    setForkWarnCallback(() => {
      try { notify(this.level?.forkWarnMessage || 'TAKE THE RIGHT FORK!'); } catch (e) {}
      try { playSfx('coin'); } catch (e) {}
    });
  }

  isPaused() { return this.paused; }

  // ── Lifecycle ────────────────────────────────────────
  async enter(level) {
    if (level) {
      this.level = level;
      setActiveLevel(level);
    }
    if (!this.level) return;

    unlockAudio();
    this.winShown = false;

    document.getElementById('s-win')  ?.classList.remove('on');
    document.getElementById('s-pause')?.classList.remove('on');

    buildTrack(buildScenery);
    resetPhys();
    resetParts();

    show('game');
    sizeCanvas();

    lockInput(true);
    renderFrame(0);

    await playIntro();
    playSfx('start');
    await countdown();

    lockInput(false);
    startMusic();
    notify(this.level.startMessage || 'LAP 1');

    this.running = true;
    this.paused  = false;
    this.last    = performance.now();
    this.accum   = 0;
    requestAnimationFrame(this.loop);
  }

  exit() { /* nothing — handled by quit()/win flow */ }

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
    startMusic();
    this.last = performance.now();
    requestAnimationFrame(this.loop);
  }

  quit() {
    this.running = false;
    this.paused  = false;
    stopAll();
  }

  async endRace() {
    this.winShown = true;
    lockInput(true);
    stopMusic();
    playSfx('win');

    await playOutro();

    document.getElementById('ws-t').textContent = fmtT(P.raceTime);
    document.getElementById('ws-b').textContent = best() ? fmtT(best()) : '—';
    document.getElementById('ws-l').textContent = String(P.lapCount);
    show('win');
    P.endPhase = 2;
  }

  // ── Main loop ────────────────────────────────────────
  loop = (now) => {
    if (!this.running || this.paused) return;

    const dtRaw = Math.min(0.05, (now - this.last) / 1000);
    this.last   = now;

    this.accum += dtRaw;
    const STEP  = C.STEP;
    const inp   = readInput();

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

    // Deferred track switch (Road1 → Road2)
    if (P._needsTrackSwitch) {
      P._needsTrackSwitch = false;
      buildScenery();
      try { notify(this.level.forkMessage || 'RIGHT FORK! ROAD 2 UNLOCKED — FINISH THE LAP!'); } catch (e) {}
      try { playSfx('nitro'); } catch (e) {}
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