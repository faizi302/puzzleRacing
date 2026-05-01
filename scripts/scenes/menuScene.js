// ═══════════════════════════════════════════════════════
// MENU SCENE — Animates star background until the player
// hits Start (which transitions to GameScene).
// ═══════════════════════════════════════════════════════
import { drawMenuStars } from '../visuals/uiRender.js';
import { show }          from '../systems/gameState.js';

export class MenuScene {
  constructor(sceneManager) {
    this.scenes = sceneManager;
    this.raf    = null;
  }

  enter() {
    show('menu');
    this._startLoop();
  }

  exit() {
    this._stopLoop();
  }

  _startLoop() {
    const tick = () => {
      drawMenuStars();
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  _stopLoop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  showHowTo() { show('howto'); }
  showMain()  { show('menu');  }
}