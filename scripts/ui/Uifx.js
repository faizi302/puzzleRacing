// ════════════════════════════════════════════════════════════════
// UI FX — Reward bursts, currency pop animations, toasts, shake
// ─────────────────────────────────────────────────────────────────
// Small DOM-only animation helpers used across scenes.
// All effects are CSS-class-driven for performance.
//
// NOTE on filename casing: this file is `uiFX.js` (camel-case FX).
// Scenes import it as `../ui/uiFX.js`. On case-sensitive servers
// (Linux / GitHub Pages) the casing must match exactly. If your
// repo currently has `Uifx.js`, rename it to `uiFX.js`.
// ════════════════════════════════════════════════════════════════

let _toastTimer = 0;

/**
 * Show a top-of-screen notification toast.
 * Re-uses #nf and toggles `.on` class. Auto-hides after `ms`.
 */
export function toast(message, ms = 2200) {
  const el = document.getElementById('nf');
  if (!el) return;
  el.textContent = message;
  el.classList.add('on');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('on'), ms);
}

/**
 * Big center-screen reward popup ("+50 🪙", "LEVEL UP", etc.)
 */
export function rewardBurst(text) {
  const el = document.getElementById('reward-burst');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('on');
  // Force reflow to restart animation
  void el.offsetWidth;
  el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), 1500);
}

/**
 * Trigger a "pop" pulse on a stat-pill icon (coins/keys gain feedback).
 * Pass an element id (e.g. 'hub-coins') and we'll find its sibling .ico.
 */
export function popStat(valueElId) {
  const v = document.getElementById(valueElId);
  if (!v) return;
  const ico = v.parentElement?.querySelector('.ico');
  if (!ico) return;
  ico.classList.remove('pop');
  void ico.offsetWidth;
  ico.classList.add('pop');
}

/**
 * Animate a number from current → target over `ms` (counter tween).
 * Used when coin/key totals change so the value "rolls up".
 */
export function tweenNumber(elId, target, ms = 600) {
  const el = document.getElementById(elId);
  if (!el) return;
  const from = parseInt((el.textContent || '0').replace(/[^\d-]/g, ''), 10) || 0;
  if (from === target) {
    el.textContent = target.toLocaleString();
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = Math.round(from + (target - from) * eased);
    el.textContent = v.toLocaleString();
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * Briefly shake any element by id (used for locked-card / invalid action feedback).
 */
export function shake(elOrId) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  el.classList.remove('fx-shake');
  void el.offsetWidth;
  el.classList.add('fx-shake');
}