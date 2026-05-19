// Debug helpers. Quiet by default — opt-in via window flags.

const _onceKeys = new Set();

export function isDebugPerf() {
  return typeof window !== 'undefined' && !!window.DEBUG_PERF;
}

export function isDebugJumps() {
  return typeof window !== 'undefined' && !!window.DEBUG_JUMPS;
}

export function debugLog(...args) {
  if (isDebugPerf()) console.log('[perf]', ...args);
}

export function onceLog(key, ...args) {
  if (_onceKeys.has(key)) return;
  _onceKeys.add(key);
  console.log(`[once:${key}]`, ...args);
}

export function safeCall(fn, ...args) {
  if (typeof fn !== 'function') return undefined;
  try { return fn(...args); } catch (e) {
    if (isDebugPerf()) console.warn('[safeCall]', e);
    return undefined;
  }
}

// Lightweight HUD overlay updater (only used when DEBUG_PERF is on).
let _hudEl = null;
function getHudEl() {
  if (!isDebugPerf()) return null;
  if (_hudEl) return _hudEl;
  if (typeof document === 'undefined') return null;
  _hudEl = document.createElement('div');
  _hudEl.id = 'debug-perf-hud';
  _hudEl.style.cssText = [
    'position:fixed', 'left:8px', 'bottom:8px', 'z-index:9999',
    'background:rgba(0,0,0,0.55)', 'color:#9ee36b', 'font:11px monospace',
    'padding:6px 8px', 'border-radius:6px', 'pointer-events:none',
    'white-space:pre',
  ].join(';');
  document.body.appendChild(_hudEl);
  return _hudEl;
}

export function updateDebugHUD(stats) {
  const el = getHudEl();
  if (!el) return;
  el.textContent =
    `fps        ${stats.fps ?? '-'}\n` +
    `segs       ${stats.visibleSegs ?? '-'}\n` +
    `scenery    ${stats.visibleScenery ?? '-'}\n` +
    `particles  ${stats.particles ?? '-'}\n` +
    `opponents  ${stats.opponents ?? '-'}`;
}