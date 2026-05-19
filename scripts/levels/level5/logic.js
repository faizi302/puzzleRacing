// ─────────────────────────────────────────────────────────────
//  Level 5 – THE KEY OF SURVIVAL
//  logic.js
//
//  Owns the complete puzzle state machine:
//    • Tracks which keys the player has collected
//    • Decides correct vs. wrong picks
//    • Opens / locks hurdles accordingly
//    • Drives HUD overlays (flash, banner, camera shake)
//    • Detects win / fail conditions
//    • Exposes a tick() for the main game-loop
// ─────────────────────────────────────────────────────────────
import { LEVEL_META } from './levelConfig.js';

// ── Constants ─────────────────────────────────────────────────
const {
  SAFE_KEY_SEQUENCE,
  HURDLE_TYPES,
} = LEVEL_META;

const TOTAL_SECTIONS = SAFE_KEY_SEQUENCE.length;   // 5

// ── Camera-shake helper ───────────────────────────────────────
function startShake(state, duration = 400, magnitude = 12) {
  state.shake.active    = true;
  state.shake.end       = performance.now() + duration;
  state.shake.magnitude = magnitude;
}

// ── Banner helper ─────────────────────────────────────────────
function showBanner(state, text, color = '#ffe84d', duration = 2200) {
  state.banner = { text, color, hideAt: performance.now() + duration };
}

// ── Red-flash helper ──────────────────────────────────────────
function startRedFlash(state, duration = 600) {
  state.redFlash = { active: true, hideAt: performance.now() + duration };
}

// ─────────────────────────────────────────────────────────────
//  createPuzzleState()
//  Called once at level init.  Returns the shared state object
//  that scenery.js, the renderer, and tick() all reference.
// ─────────────────────────────────────────────────────────────
export function createPuzzleState() {
  return {
    // Which lane is safe for each section
    safeKeySequence: [...SAFE_KEY_SEQUENCE],

    // Per-section outcome: null | 'correct' | 'wrong'
    keyPicked: Array(TOTAL_SECTIONS).fill(null),

    // Whether each hurdle's path is open (correct key picked)
    hurdleOpen: Array(TOTAL_SECTIONS).fill(false),

    // Whether each hurdle has been triggered (player reached it)
    hurdleTriggered: Array(TOTAL_SECTIONS).fill(false),

    // Current section the player is approaching (0-4)
    currentSection: 0,

    // Overall outcome
    levelComplete: false,
    levelFailed:   false,
    failReason:    '',

    // ── HUD effects ─────────────────────────────────────────
    shake:    { active: false, end: 0, magnitude: 0 },
    redFlash: { active: false, hideAt: 0 },
    banner:   null,   // { text, color, hideAt }

    // ── Pending events (consumed by the audio / fx system) ──
    events:   [],     // array of event strings, drained each frame
  };
}

// ─────────────────────────────────────────────────────────────
//  onKeyCollected(puzzleState, sectionIndex, laneIndex)
//  Called by the collision system when the player drives over
//  a key object.
// ─────────────────────────────────────────────────────────────
export function onKeyCollected(ps, sectionIndex, laneIndex) {
  // Ignore if already picked for this section or level decided
  if (ps.keyPicked[sectionIndex] !== null)  return;
  if (ps.levelComplete || ps.levelFailed)   return;

  const isCorrect = laneIndex === ps.safeKeySequence[sectionIndex];

  ps.keyPicked[sectionIndex] = isCorrect ? 'correct' : 'wrong';

  if (isCorrect) {
    ps.hurdleOpen[sectionIndex] = true;
    showBanner(ps,
      `🗝️ Correct Key! ${_hurdleName(sectionIndex)} unlocked!`,
      '#44ff88',
    );
    ps.events.push('sfx:correct_key');
    ps.events.push(`hurdle_open:${sectionIndex}`);
  } else {
    showBanner(ps,
      `❌ Wrong Key! ${_hurdleName(sectionIndex)} is LOCKED!`,
      '#ff4422',
    );
    startRedFlash(ps);
    startShake(ps, 500, 14);
    ps.events.push('sfx:wrong_key');
    ps.events.push(`hurdle_locked:${sectionIndex}`);
  }
}

// ─────────────────────────────────────────────────────────────
//  onHurdleReached(puzzleState, sectionIndex)
//  Called by the collision system when the player reaches the
//  Z-position of a hurdle object.
// ─────────────────────────────────────────────────────────────
export function onHurdleReached(ps, sectionIndex) {
  if (ps.hurdleTriggered[sectionIndex]) return;
  if (ps.levelComplete || ps.levelFailed) return;

  ps.hurdleTriggered[sectionIndex] = true;

  const open      = ps.hurdleOpen[sectionIndex];
  const keyPicked = ps.keyPicked[sectionIndex];

  if (open) {
    // ── Safe passage ────────────────────────────────────────
    showBanner(ps, `✅ ${_hurdleName(sectionIndex)} cleared!`, '#44ff88', 1500);
    ps.events.push('sfx:hurdle_pass');

    // Advance section pointer
    if (sectionIndex >= TOTAL_SECTIONS - 1) {
      // Last hurdle passed → mark win (finish line still needed)
      // Actual win fires in onFinishReached(); nothing more here.
    } else {
      ps.currentSection = sectionIndex + 1;
    }

  } else {
    // ── Locked obstacle → player dies ───────────────────────
    const reason = _failMessage(sectionIndex, keyPicked);
    _triggerFail(ps, reason, sectionIndex);
  }
}

// ─────────────────────────────────────────────────────────────
//  onFinishReached(puzzleState)
//  Called when the player crosses the finish line.
// ─────────────────────────────────────────────────────────────
export function onFinishReached(ps) {
  if (ps.levelFailed) return;

  const allOpen = ps.hurdleOpen.every(Boolean);

  if (allOpen) {
    ps.levelComplete = true;
    showBanner(ps, '🏆 You Survived! Level 5 Complete!', '#ffd700', 6000);
    ps.events.push('sfx:win');
    ps.events.push('level:complete');
  } else {
    // Player skipped keys or reached finish before all hurdles
    _triggerFail(ps, '🚧 You skipped a key! Run failed.', -1);
  }
}

// ─────────────────────────────────────────────────────────────
//  onGapFall(puzzleState, sectionIndex)
//  Called by the physics system when the player falls into the
//  BrokenRoad gap without the correct key having joined it.
// ─────────────────────────────────────────────────────────────
export function onGapFall(ps, sectionIndex) {
  if (ps.hurdleTriggered[sectionIndex]) return;
  ps.hurdleTriggered[sectionIndex] = true;

  _triggerFail(ps, '💀 You fell into the gap!', sectionIndex);
}

// ─────────────────────────────────────────────────────────────
//  tick(puzzleState, now)
//  Called every frame from the main update loop.
//  Expires timed HUD effects.
// ─────────────────────────────────────────────────────────────
export function tick(ps, now = performance.now()) {
  // Expire banner
  if (ps.banner && now >= ps.banner.hideAt) {
    ps.banner = null;
  }

  // Expire red flash
  if (ps.redFlash.active && now >= ps.redFlash.hideAt) {
    ps.redFlash.active = false;
  }

  // Expire camera shake
  if (ps.shake.active && now >= ps.shake.end) {
    ps.shake.active = false;
  }
}

// ─────────────────────────────────────────────────────────────
//  drainEvents(puzzleState)
//  Returns pending event strings and clears the queue.
//  Call once per frame in the main loop.
// ─────────────────────────────────────────────────────────────
export function drainEvents(ps) {
  const evts  = [...ps.events];
  ps.events   = [];
  return evts;
}

// ─────────────────────────────────────────────────────────────
//  getShakeOffset(puzzleState)
//  Returns { dx, dy } for camera shake this frame.
// ─────────────────────────────────────────────────────────────
export function getShakeOffset(ps) {
  if (!ps.shake.active) return { dx: 0, dy: 0 };
  const m = ps.shake.magnitude;
  return {
    dx: (Math.random() - 0.5) * m * 2,
    dy: (Math.random() - 0.5) * m * 2,
  };
}

// ─────────────────────────────────────────────────────────────
//  renderHUD(ctx, canvas, puzzleState)
//  Draws all overlay HUD elements onto the canvas.
//  Call AFTER the 3-D scene has been rendered, before the
//  engine's own UI layer.
// ─────────────────────────────────────────────────────────────
export function renderHUD(ctx, canvas, ps, now = performance.now()) {
  const W = canvas.width;
  const H = canvas.height;

  // ── Red flash (wrong key / death) ────────────────────────
  if (ps.redFlash.active) {
    const elapsed  = now - (ps.redFlash.hideAt - 600);
    const alpha    = Math.max(0, 0.45 * (1 - elapsed / 600));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#ff0000';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ── Banner message ────────────────────────────────────────
  if (ps.banner) {
    const elapsed   = now - (ps.banner.hideAt - 2200);
    const fadeStart = ps.banner.hideAt - 400;
    const alpha     = now > fadeStart
      ? Math.max(0, (ps.banner.hideAt - now) / 400)
      : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Semi-transparent backing pill
    const textW  = Math.min(W * 0.78, 640);
    const textH  = 68;
    const bx     = (W - textW) / 2;
    const by     = H * 0.14;
    const radius = 14;

    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    _roundRect(ctx, bx - 12, by - 8, textW + 24, textH + 16, radius);
    ctx.fill();

    // Border glow
    ctx.strokeStyle = ps.banner.color;
    ctx.lineWidth   = 2.5;
    ctx.globalAlpha = alpha * 0.8;
    _roundRect(ctx, bx - 12, by - 8, textW + 24, textH + 16, radius);
    ctx.stroke();

    // Text
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = ps.banner.color;
    ctx.font        = 'bold 26px "Segoe UI", sans-serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur   = 8;
    ctx.fillText(ps.banner.text, W / 2, by + textH / 2);

    ctx.restore();
  }

  // ── Section progress strip (top-left) ────────────────────
  _renderProgress(ctx, ps, 16, 16);

  // ── Death / fail screen ───────────────────────────────────
  if (ps.levelFailed) {
    _renderFailScreen(ctx, canvas, ps);
  }

  // ── Win screen ────────────────────────────────────────────
  if (ps.levelComplete) {
    _renderWinScreen(ctx, canvas, ps);
  }
}

// ── Private helpers ───────────────────────────────────────────

function _triggerFail(ps, reason, sectionIndex) {
  ps.levelFailed = true;
  ps.failReason  = reason;
  showBanner(ps, reason, '#ff4422', 8000);
  startRedFlash(ps, 1200);
  startShake(ps, 900, 20);
  ps.events.push('sfx:death');
  ps.events.push('level:fail');
  if (sectionIndex >= 0) ps.events.push(`death_at:${sectionIndex}`);
}

function _hurdleName(idx) {
  const names = [
    'Stone Block',
    'Broken Road',
    'Giant Wall',
    'Fire Gate',
    'Police Blockade',
  ];
  return names[idx] ?? `Hurdle ${idx + 1}`;
}

function _failMessage(sectionIndex, keyPicked) {
  const hurdleName = _hurdleName(sectionIndex);
  if (keyPicked === 'wrong') {
    const msgs = {
      StoneBlock:     `💥 Wrong key! The stone wall crushed you!`,
      BrokenRoad:     `💀 Wrong key! You fell into the gap!`,
      GiantWall:      `🧱 Wrong key! No ramp – you crashed the wall!`,
      FireGate:       `🔥 Wrong key! The fire gate burned you!`,
      PoliceBlockade: `🚔 Wrong key! The blockade stopped you dead!`,
    };
    return msgs[HURDLE_TYPES[sectionIndex]] ?? `❌ Wrong key! ${hurdleName} killed you!`;
  }
  // No key picked at all
  return `⚠️ You skipped the keys! ${hurdleName} was locked!`;
}

function _renderProgress(ctx, ps, x, y) {
  ctx.save();
  ctx.font         = '13px monospace';
  ctx.textBaseline = 'top';

  for (let i = 0; i < TOTAL_SECTIONS; i++) {
    const picked = ps.keyPicked[i];
    const open   = ps.hurdleOpen[i];
    const icon   = picked === null ? '⬜' : open ? '✅' : '❌';
    ctx.fillStyle = picked === null ? '#aaa' : open ? '#44ff88' : '#ff4422';
    ctx.fillText(`${icon} ${_hurdleName(i)}`, x, y + i * 20);
  }
  ctx.restore();
}

function _renderFailScreen(ctx, canvas, ps) {
  const W = canvas.width;
  const H = canvas.height;

  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.fillStyle   = '#1a0000';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  ctx.fillStyle   = '#ff4422';
  ctx.font        = 'bold 54px "Segoe UI", sans-serif';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💀 LEVEL FAILED', W / 2, H * 0.38);

  ctx.fillStyle = '#ffcccc';
  ctx.font      = '24px "Segoe UI", sans-serif';
  ctx.fillText(ps.failReason, W / 2, H * 0.52);

  ctx.fillStyle = '#ff9977';
  ctx.font      = '18px "Segoe UI", sans-serif';
  ctx.fillText('Press R to retry or ESC for menu', W / 2, H * 0.64);

  ctx.restore();
}

function _renderWinScreen(ctx, canvas, ps) {
  const W = canvas.width;
  const H = canvas.height;

  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.fillStyle   = '#001a00';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  ctx.fillStyle   = '#ffd700';
  ctx.font        = 'bold 52px "Segoe UI", sans-serif';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏆 LEVEL 5 COMPLETE!', W / 2, H * 0.36);

  ctx.fillStyle = '#aaffcc';
  ctx.font      = '24px "Segoe UI", sans-serif';
  ctx.fillText('You survived the Key of Survival!', W / 2, H * 0.50);

  ctx.fillStyle = '#88ffbb';
  ctx.font      = '18px "Segoe UI", sans-serif';
  ctx.fillText('Press ENTER or tap to continue', W / 2, H * 0.62);

  ctx.restore();
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}