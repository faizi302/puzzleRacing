// ═══════════════════════════════════════════════════════
// SCENE MANAGER — Tracks which scene is active.
// ─────────────────────────────────────────────────────
// Each scene exposes optional enter()/exit() lifecycle hooks.
// HTML screens (#s-menu / #s-game / #s-pause / #s-win) are
// still managed by gameState.js — scenes call show() inside
// their own enter() if they need a specific HTML view.
// ═══════════════════════════════════════════════════════
export class SceneManager {
  constructor() {
    this.scenes = {};
    this.active = null;
  }

  register(name, scene) {
    this.scenes[name] = scene;
  }

  go(name, ...args) {
    if (this.active && typeof this.active.exit === 'function') {
      this.active.exit();
    }
    this.active = this.scenes[name] || null;
    if (this.active && typeof this.active.enter === 'function') {
      this.active.enter(...args);
    }
  }

  current() { return this.active; }
  is(name)  { return this.active === this.scenes[name]; }
}