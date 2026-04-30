// ═══════════════════════════════════════════════════════
// PLAYER ANIMATION — Countdown, notifications, fade overlays
// ═══════════════════════════════════════════════════════
import {
  startIntroAnim, startOutroAnim, tickCamAnim, getFadeAlpha, camAnim,
} from './player.js';
import { getCtx, getW, getH } from '../core/canvas.js';

let _nT = null;

export function notify(msg, dur = 2400) {
  const el = document.getElementById('nf');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(_nT);
  _nT = setTimeout(() => el.classList.remove('on'), dur);
}

export function countdown() {
  return new Promise(res => {
    const el    = document.getElementById('cdn');
    if (!el) { res(); return; }
    const steps = ['3','2','1','GO!'];
    let i = 0;
    const tick = () => {
      el.textContent = steps[i];
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
      i++;
      if (i < steps.length) setTimeout(tick, 850);
      else setTimeout(() => { el.classList.remove('pop'); res(); }, 650);
    };
    tick();
  });
}

// Camera intro — player & camera "fade in" from far. Resolves when fade-in done.
export function playIntro() {
  return new Promise(res => {
    startIntroAnim();
    setTimeout(res, 1600);
  });
}

// Race-end fly-away — non-blocking, just kicks off the animation.
// Returns a promise that resolves after a few seconds so caller can show the
// win card with a fade-in.
export function playOutro() {
  return new Promise(res => {
    startOutroAnim();
    setTimeout(res, 3200);
  });
}

// Black overlay drawn AFTER everything (last in render pipeline).
export function drawFadeOverlay() {
  const a = getFadeAlpha();
  if (a <= 0.001) return;
  const ctx = getCtx();
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.fillRect(0, 0, getW(), getH());
  ctx.restore();
}

export { tickCamAnim, camAnim };