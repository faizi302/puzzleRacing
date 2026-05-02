// ═══════════════════════════════════════════════════════
// MAIN — Boot, scene registration, button wiring.
// ─────────────────────────────────────────────────────
// New flow:
//   Menu → Hub → (Career → Game) | Garage | Settings
// All progress is stored in localStorage via playerData.
// ═══════════════════════════════════════════════════════
import { initRenderer, sizeCanvas } from './core/canvas.js';
import { initInput, bindTouch }     from './core/inputController.js';
import { SceneManager }             from './core/sceneManager.js';
import { setActiveLevel }           from './core/activeLevel.js';
import { loadPlayerData }           from './player/playerData.js';

import { MenuScene }     from './scenes/MenuScene.js';
import { HubScene }      from './scenes/HubScene.js';
import { CareerScene }   from './scenes/CareerScene.js';
import { GarageScene }   from './scenes/GarageScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { GameScene }     from './scenes/GameScene.js';

import { initGlobalAudioButtons, startMenuMusic } from './core/audio.js';

// ── Levels ─────────────────────────────────────────────
import level1 from './levels/level1/index.js';
// import level2 from './levels/level2/index.js';   // ← uncomment when ready
// import level3 from './levels/level3/index.js';   // ← uncomment when ready

// ── Boot ───────────────────────────────────────────────
loadPlayerData();   // Restore saved progress before anything else

const cv = document.getElementById('gc');
initRenderer(cv);
sizeCanvas();
window.addEventListener('resize', sizeCanvas);

initInput();

initGlobalAudioButtons();
startMenuMusic();

bindTouch('tc-l', 'left');
bindTouch('tc-r', 'right');
bindTouch('tc-a', 'up');
bindTouch('tc-b', 'down');

// Default level loaded so any pre-game code (HUD, etc.) has a level.
setActiveLevel(level1);

// ── Scenes ─────────────────────────────────────────────
const scenes = new SceneManager();

const menuScene     = new MenuScene(scenes);
const hubScene      = new HubScene(scenes);
const careerScene   = new CareerScene(scenes);
const garageScene   = new GarageScene(scenes);
const settingsScene = new SettingsScene(scenes);
const gameScene     = new GameScene(scenes);

scenes.register('menu',     menuScene);
scenes.register('hub',      hubScene);
scenes.register('career',   careerScene);
scenes.register('garage',   garageScene);
scenes.register('settings', settingsScene);
scenes.register('game',     gameScene);

// ── Buttons ────────────────────────────────────────────
// Title screen
document.getElementById('btn-start')?.addEventListener('click', () => scenes.go('hub'));
document.getElementById('btn-howto')?.addEventListener('click', () => menuScene.showHowTo());
document.getElementById('btn-back') ?.addEventListener('click', () => menuScene.showMain());

// In-game / pause / win
document.getElementById('btn-resume')?.addEventListener('click', () => gameScene.resume());
document.getElementById('btn-quit')  ?.addEventListener('click', () => { gameScene.quit(); scenes.go('hub'); });
document.getElementById('btn-again') ?.addEventListener('click', () => scenes.go('career'));
document.getElementById('btn-tomenu')?.addEventListener('click', () => { gameScene.quit(); scenes.go('hub'); });
document.getElementById('pbtn')      ?.addEventListener('click', () => gameScene.pause());

// Pause hotkeys
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