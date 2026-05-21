// Boot. Wires renderer, input, audio, scenes, and global UI buttons.

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

import level1 from './levels/level1/index.js';
import level2 from './levels/level2/index.js';
import level3 from './levels/level3/index.js';

// Boot
loadPlayerData();

const cv = document.getElementById('gc');
initRenderer(cv);
sizeCanvas();
window.addEventListener('resize', sizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(sizeCanvas, 200));

initInput();
initGlobalAudioButtons();
startMenuMusic();

initBackground({
  basePath  : 'assets/menuBackgrounds/',
  images    : ['bg1.jpg', 'bg2.jpg', 'bg3.jpg', 'bg4.jpg', 'bg5.jpg'],
  intervalMs: 7500,
  parallax  : true,
});

bindTouch('tc-l', 'left');
bindTouch('tc-r', 'right');
bindTouch('tc-a', 'up');
bindTouch('tc-b', 'down');
bindTouch('tc-n', 'nitro');
bindTouch('tc-ib', 'down');


const TOUCH_LAYOUT_KEY = 'formula_touch_layout_v1';
const TOUCH_IDS = ['tc-l', 'tc-r', 'tc-a', 'tc-b', 'tc-n', 'tc-ib'];

function readTouchLayout() {
  try {
    return JSON.parse(localStorage.getItem(TOUCH_LAYOUT_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveTouchLayout(layout) {
  localStorage.setItem(TOUCH_LAYOUT_KEY, JSON.stringify(layout));
}

function applyTouchLayout() {
  const saved = readTouchLayout();

  for (const id of TOUCH_IDS) {
    const btn = document.getElementById(id);
    if (!btn || !saved[id]) continue;

    btn.style.position = 'fixed';
    btn.style.left = saved[id].left;
    btn.style.top = saved[id].top;
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
  }
}

function setupTouchEditor() {
  const stageBtns = document.querySelectorAll('.touch-edit-btn');
  const saved = readTouchLayout();

  stageBtns.forEach((ghostBtn, index) => {
    const targetId = ghostBtn.dataset.target;

    if (saved[targetId]) {
      ghostBtn.style.left = saved[targetId].left;
      ghostBtn.style.top = saved[targetId].top;
    } else {
      const defaults = [
        { left: '22px', top: `${window.innerHeight - 95}px` },
        { left: '96px', top: `${window.innerHeight - 95}px` },
        { left: `${window.innerWidth - 158}px`, top: `${window.innerHeight - 168}px` },
        { left: `${window.innerWidth - 84}px`, top: `${window.innerHeight - 168}px` },
        { left: `${window.innerWidth - 158}px`, top: `${window.innerHeight - 94}px` },
        { left: `${window.innerWidth - 84}px`, top: `${window.innerHeight - 94}px` },
      ];

      ghostBtn.style.left = defaults[index].left;
      ghostBtn.style.top = defaults[index].top;
    }

    let dragging = false;
    let dx = 0;
    let dy = 0;

    ghostBtn.addEventListener('pointerdown', (e) => {
      dragging = true;
      ghostBtn.setPointerCapture(e.pointerId);

      const r = ghostBtn.getBoundingClientRect();
      dx = e.clientX - r.left;
      dy = e.clientY - r.top;

      e.preventDefault();
    });

    ghostBtn.addEventListener('pointermove', (e) => {
      if (!dragging) return;

      const size = ghostBtn.offsetWidth;
      const x = Math.max(6, Math.min(window.innerWidth - size - 6, e.clientX - dx));
      const y = Math.max(6, Math.min(window.innerHeight - size - 6, e.clientY - dy));

      ghostBtn.style.left = `${x}px`;
      ghostBtn.style.top = `${y}px`;
    });

    ghostBtn.addEventListener('pointerup', () => {
      dragging = false;
    });
  });
}

function saveEditorPositionsToGameButtons() {
  const layout = {};

  document.querySelectorAll('.touch-edit-btn').forEach((ghostBtn) => {
    const targetId = ghostBtn.dataset.target;
    layout[targetId] = {
      left: ghostBtn.style.left,
      top: ghostBtn.style.top,
    };
  });

  saveTouchLayout(layout);
  applyTouchLayout();
}

applyTouchLayout();
setupTouchEditor();

setActiveLevel(level1);

// Scenes
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

// Modal buttons
const $ = (id) => document.getElementById(id);

$('btn-resume')?.addEventListener('click', () => gameScene.resume());
$('btn-restart')?.addEventListener('click', () => gameScene.restart());
$('btn-quit')?.addEventListener('click',    () => { gameScene.quit(); scenes.go('hub'); });
$('btn-again')?.addEventListener('click',   () => scenes.go('career'));
$('btn-tomenu')?.addEventListener('click',  () => { gameScene.quit(); scenes.go('hub'); });
$('pbtn')?.addEventListener('click',        () => gameScene.pause());

$('btn-lose-restart')?.addEventListener('click', () => gameScene.restart());
$('btn-lose-menu')?.addEventListener('click',    () => { gameScene.quit(); scenes.go('menu'); });

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (scenes.is('game')) {
      if (gameScene.isPaused()) gameScene.resume();
      else                       gameScene.pause();
    }
  }
});

scenes.go('menu');


$('btn-pause-settings')?.addEventListener('click', () => {
  document.getElementById('s-pause')?.classList.remove('on');
  showSettingsFromPause();
});

function showSettingsFromPause() {
  document.getElementById('s-settings')?.classList.add('on');
  document.getElementById('s-settings')?.classList.add('from-pause');
}

function backToPauseFromSettings() {
  document.getElementById('s-settings')?.classList.remove('on');
  document.getElementById('s-touch-editor')?.classList.remove('on');
  document.getElementById('s-pause')?.classList.add('on');
}

$('btn-settings-back')?.addEventListener('click', () => {
  if (document.getElementById('s-settings')?.classList.contains('from-pause')) {
    document.getElementById('s-settings')?.classList.remove('from-pause');
    backToPauseFromSettings();
  }
});

$('btn-edit-touch')?.addEventListener('click', () => {
  document.getElementById('s-settings')?.classList.remove('on');
  setupTouchEditor();
  document.getElementById('s-touch-editor')?.classList.add('on');
});

$('btn-touch-ok')?.addEventListener('click', () => {
  saveEditorPositionsToGameButtons();
  document.getElementById('s-touch-editor')?.classList.remove('on');
  document.getElementById('s-pause')?.classList.add('on');
});

$('btn-touch-cancel')?.addEventListener('click', () => {
  document.getElementById('s-touch-editor')?.classList.remove('on');
  document.getElementById('s-settings')?.classList.add('on');
});

$('btn-touch-reset-editor')?.addEventListener('click', () => {
  localStorage.removeItem(TOUCH_LAYOUT_KEY);
  setupTouchEditor();
  applyTouchLayout();
});

$('btn-reset-touch')?.addEventListener('click', () => {
  localStorage.removeItem(TOUCH_LAYOUT_KEY);
  applyTouchLayout();
});