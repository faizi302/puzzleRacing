// ═══════════════════════════════════════════════════════
// MAIN — Boot, scene registration, button wiring.
// ─────────────────────────────────────────────────────
// All loop logic moved to scenes/. To add Level 2/3 later,
// import the level module and pass it to scenes.go('game', lvl).
// ═══════════════════════════════════════════════════════
import { initRenderer, sizeCanvas } from './core/canvas.js';
import { initInput, bindTouch }     from './core/inputController.js';
import { SceneManager }             from './core/sceneManager.js';
import { setActiveLevel }           from './core/activeLevel.js';

import { MenuScene }                from './scenes/MenuScene.js';
import { GameScene }                from './scenes/GameScene.js';

// ── Levels ─────────────────────────────────────────────
import level1 from './levels/level1/index.js';
// import level2 from './levels/level2/index.js';   // ← uncomment when ready
// import level3 from './levels/level3/index.js';   // ← uncomment when ready

// ── Boot ───────────────────────────────────────────────
const cv = document.getElementById('gc');
initRenderer(cv);
sizeCanvas();
window.addEventListener('resize', sizeCanvas);

initInput();
bindTouch('tc-l', 'left');
bindTouch('tc-r', 'right');
bindTouch('tc-a', 'up');
bindTouch('tc-b', 'down');

// Default level loaded so any pre-game code (HUD, etc.) has a level.
setActiveLevel(level1);

// ── Scenes ─────────────────────────────────────────────
const scenes    = new SceneManager();
const menuScene = new MenuScene(scenes);
const gameScene = new GameScene(scenes);

scenes.register('menu', menuScene);
scenes.register('game', gameScene);

// ── Buttons ────────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', () => scenes.go('game', level1));
document.getElementById('btn-howto').addEventListener('click', () => menuScene.showHowTo());
document.getElementById('btn-back')  ?.addEventListener('click', () => menuScene.showMain());
document.getElementById('btn-resume')?.addEventListener('click', () => gameScene.resume());
document.getElementById('btn-quit')  ?.addEventListener('click', () => { gameScene.quit(); scenes.go('menu'); });
document.getElementById('btn-again') ?.addEventListener('click', () => scenes.go('game', level1));
document.getElementById('btn-tomenu')?.addEventListener('click', () => { gameScene.quit(); scenes.go('menu'); });
document.getElementById('pbtn')      ?.addEventListener('click', () => gameScene.pause());

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (scenes.is('game')) {
      if (gameScene.isPaused()) gameScene.resume();
      else                       gameScene.pause();
    }
  }
});

// ── Start at menu ──────────────────────────────────────
scenes.go('menu');