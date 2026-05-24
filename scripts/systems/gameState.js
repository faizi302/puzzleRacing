import { playSfx } from '../core/audio.js';

let _active = null;

function isOverlayId(id) {
  const el = document.getElementById('s-' + id);
  return !!(el && el.classList.contains('ov'));
}

function closeOverlays() {
  document.querySelectorAll('.scr.ov.on').forEach((el) => {
    el.classList.remove('on');
    el.classList.remove('from-pause');
  });
}

export function show(id) {
  const el = document.getElementById('s-' + id);
  if (!el) return;

  if (el.classList.contains('ov')) {
    // Overlay (pause / win / lose / settings) — stack on top, keep _active scene visible.
    el.classList.add('on');
    playSfx('sceneOpen', { volume: 0.55 });
    return;
  }

  // Full scene switch — clear any open overlays, then hide previous scene.
  closeOverlays();
  if (_active && _active !== el) _active.classList.remove('on');
  _active = el;
  el.classList.add('on');
  playSfx('sceneOpen', { volume: 0.55 });
}
// ✅ FIX: Allow external code to restore a scene as _active without
// triggering a full scene switch (no closeOverlays, no sfx).
// Used when returning from settings back to the paused game scene.
export function restoreActive(id) {
  const el = document.getElementById('s-' + id);
  if (!el) return;
  el.classList.add('on');
  _active = el;
}