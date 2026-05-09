// ════════════════════════════════════════════════════════════════
// MAIN (v2) — Boot, scene registration, global UI wiring
// ─────────────────────────────────────────────────────────────────
// Flow:    Menu → Hub → (Career → Game) | Garage | Settings | HowTo
// Adds:    cinematic background slideshow (always-on)
//          UI fx helpers (toasts / reward bursts / particle field)
//          full audio-settings binding (sound, music, volumes)
// ════════════════════════════════════════════════════════════════
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
import { initBackground } from './ui/background.js';

// ── Levels ─────────────────────────────────────────────
import level1 from './levels/level1/index.js';
import level2 from './levels/level2/index.js';
import level3 from './levels/level3/index.js';

// ── Boot ───────────────────────────────────────────────
loadPlayerData();   // restore saved progress before anything reads it

const cv = document.getElementById('gc');
initRenderer(cv);
sizeCanvas();
window.addEventListener('resize', sizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(sizeCanvas, 200));

initInput();
initGlobalAudioButtons();
startMenuMusic();

// Cinematic always-on background (slideshow + parallax + particles)
initBackground({
  basePath:   'assets/fassets/',
  images:     ['gambg1.jpg', 'gambg2.jpg', 'gambg3.jpg', 'gambg4.png', 'gambg5.jpg'],
  intervalMs: 7500,
  parallax:   true,
});

bindTouch('tc-l', 'left');
bindTouch('tc-r', 'right');
bindTouch('tc-a', 'up');
bindTouch('tc-b', 'down');

// Default level so any pre-game code (HUD, etc.) has a level reference.
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

// ── Pause / Win modal buttons ──────────────────────────
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