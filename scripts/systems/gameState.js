// ═══════════════════════════════════════════════════════
// GAME STATE — Screen manager + scene sound
// ═══════════════════════════════════════════════════════
import { playSfx } from '../core/audio.js';

let _active = null;

export function show(id) {
  if (_active) _active.classList.remove('on');

  _active = document.getElementById('s-' + id);

  if (_active) {
    _active.classList.add('on');
    playSfx('sceneOpen', { volume: 0.55 });
  }
}