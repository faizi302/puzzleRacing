// ════════════════════════════════════════════════════════════════════
// UI RENDER — Combined module
// ─────────────────────────────────────────────────────────────────────
// Contains:
//   • Menu starfield / sky background           (drawMenuStars)
//   • Reward bursts, toasts, pop, shake, tween  (FX helpers, ex-uiFX)
//   • Asphalt-Legends-style in-race HUD          (build/update/destroy)
//   • Race start hint banner (auto-hides)        (showRaceHint, hideRaceHint)
//
// REPLACES BOTH:  uiRender.js  +  Uifx.js
// All ex-Uifx exports are re-exported from this file so existing
// `import { toast } from '../ui/uiFX.js'` paths can be redirected
// here, OR keep a tiny `uiFX.js` shim that just re-exports from this.
// ════════════════════════════════════════════════════════════════════
import { sizeMenuCanvas, getMenuCtx } from '../core/canvas.js';

/* ════════════════════════════════════════════════════════════════════
 * 1. MENU BACKGROUND  (unchanged from your original uiRender.js)
 * ════════════════════════════════════════════════════════════════════ */
export function drawMenuStars() {
  const cv = sizeMenuCanvas();
  if (!cv) return;
  const c = getMenuCtx();
  const W = cv.width, H = cv.height;

  // sky gradient
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0,  '#040810');
  g.addColorStop(.6, '#091428');
  g.addColorStop(1,  '#0b1a0a');
  c.fillStyle = g; c.fillRect(0, 0, W, H);

  // stars
  for (let i = 0; i < 220; i++) {
    const x = (Math.sin(i * 2.399) * .5 + .5) * W;
    const y = (Math.cos(i * 1.618) * .5 + .5) * H * .8;
    const r = .4 + ((i * 7919) % 5) * .3;
    const a = .28 + ((i * 1301) % 10) * .065;
    c.fillStyle = `rgba(255,255,235,${a})`;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }

  // moon
  const mx = W * .76, my = H * .12, mr = Math.max(18, W * .028);
  const mg = c.createRadialGradient(mx, my, mr * .3, mx, my, mr * 2.5);
  mg.addColorStop(0, 'rgba(220,220,175,0.18)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = mg; c.beginPath(); c.arc(mx, my, mr * 2.5, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#e8e0c0'; c.beginPath(); c.arc(mx, my, mr, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(4,8,20,.67)'; c.beginPath(); c.arc(mx + mr * .3, my, mr * .84, 0, Math.PI * 2); c.fill();

  // hill silhouettes
  c.fillStyle = '#0f3a0a'; c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W; x += 4) c.lineTo(x, H * .82 - Math.abs(Math.sin(x * .006)) * (H * .18));
  c.lineTo(W, H); c.closePath(); c.fill();

  c.fillStyle = '#1a5c12'; c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W; x += 4) c.lineTo(x, H * .9 - Math.abs(Math.sin(x * .009 + 1)) * (H * .13));
  c.lineTo(W, H); c.closePath(); c.fill();
}

/* ════════════════════════════════════════════════════════════════════
 * 2. FX HELPERS  (ex-Uifx.js — unchanged behaviour, same exports)
 * ════════════════════════════════════════════════════════════════════ */
let _toastTimer = 0;

/** Show a top-of-screen notification toast. */
export function toast(message, ms = 2200) {
  const el = document.getElementById('nf');
  if (!el) return;
  el.textContent = message;
  el.classList.add('on');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('on'), ms);
}

/** Big center-screen reward popup ("+50 🪙", "LEVEL UP", etc.) */
export function rewardBurst(text) {
  const el = document.getElementById('reward-burst');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('on');
  void el.offsetWidth; // restart anim
  el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), 1500);
}

/** Pulse a stat-pill icon (coins/keys gain feedback). */
export function popStat(valueElId) {
  const v = document.getElementById(valueElId);
  if (!v) return;
  const ico = v.parentElement?.querySelector('.ico');
  if (!ico) return;
  ico.classList.remove('pop');
  void ico.offsetWidth;
  ico.classList.add('pop');
}

/** Tween a number from current → target over `ms`. */
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

/** Briefly shake any element. */
export function shake(elOrId) {
  const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
  if (!el) return;
  el.classList.remove('fx-shake');
  void el.offsetWidth;
  el.classList.add('fx-shake');
}

/* ════════════════════════════════════════════════════════════════════
 * 3. ASPHALT-STYLE RACE HUD
 * ─────────────────────────────────────────────────────────────────────
 * Layout (matches the screenshot you provided):
 *
 *   ┌─ TOP-LEFT ──────────────┐         ┌─── TOP-CENTER ────┐         ┌─ TOP-RIGHT ──┐
 *   │  ⏸  POS 1/6             │         │  ▱▱▱▱▱▱▱▱▱▱▱      │         │  KM/H  109   │
 *   │     DIST 28%            │         │   (distance bar)  │         │  ⏱ 00:21.104│
 *   └─────────────────────────┘         └───────────────────┘         └──────────────┘
 *
 *                                  NITRO  ▮▮▮       (top-right, under timer)
 *
 *                ┌──────────── HINT BANNER (auto-hides) ────────────┐
 *                │   THE FINISH IS A TRAP                            │
 *                │   Drive forward first, then discover the clue.    │
 *                └───────────────────────────────────────────────────┘
 *
 * The HUD lives in a single root <div id="race-hud"> so we can show/hide
 * it cleanly when entering/leaving the game scene. It is built once,
 * re-used between races, and updated each frame by updateRaceHUD().
 * ════════════════════════════════════════════════════════════════════ */

let _hudRoot = null;
let _hudEls  = null;
let _hintTimer = 0;
let _bestSeen  = 0;

/**
 * Build the HUD DOM (idempotent — safe to call on every race enter).
 * Looks for a host element, creating one if absent.
 * Pause button click is forwarded via the optional onPause callback.
 */
export function buildRaceHUD({ onPause } = {}) {
  if (_hudRoot && document.body.contains(_hudRoot)) {
    if (onPause) _hudRoot._onPause = onPause;
    showRaceHUD();
    return _hudEls;
  }

  const root = document.createElement('div');
  root.id = 'race-hud';
  root.className = 'race-hud';
  root.innerHTML = `
    <!-- TOP-LEFT cluster: pause + position + distance -->
    <div class="hud-tl">
      <button class="hud-pause" id="hud-pause" aria-label="Pause">
        <span class="bar"></span><span class="bar"></span>
      </button>
      <div class="hud-tl-info">
        <div class="hud-row">
          <span class="hud-label">POS.</span>
          <span class="hud-value" id="hud-pos">1<span class="hud-sep">/</span>6</span>
        </div>
        <div class="hud-row">
          <span class="hud-label">DIST.</span>
          <span class="hud-value hud-dist" id="hud-dist">0%</span>
        </div>
      </div>
    </div>

    <!-- TOP-CENTER: distance bar with leading triangle -->
    <div class="hud-tc">
      <div class="hud-bar-track">
        <div class="hud-bar-fill" id="hud-bar"></div>
        <div class="hud-bar-tip"  id="hud-bar-tip"></div>
      </div>
      <div class="hud-lap" id="hud-lap">LAP 1/1</div>
    </div>

    <!-- TOP-RIGHT: speed + lap timer + nitro -->
    <div class="hud-tr">
      <div class="hud-speed-box">
        <span class="hud-speed-unit">KM/H</span>
        <span class="hud-speed-val" id="hud-speed">0</span>
      </div>
      <div class="hud-time-box">
        <span class="hud-time-ico">⏱</span>
        <span class="hud-time-val" id="hud-time">00:00.000</span>
      </div>
      <div class="hud-nitro">
        <span class="hud-nitro-label">NITRO</span>
        <div class="hud-nitro-bar">
          <div class="hud-nitro-seg" data-i="0"></div>
          <div class="hud-nitro-seg" data-i="1"></div>
          <div class="hud-nitro-seg" data-i="2"></div>
        </div>
      </div>
      <div class="hud-best" id="hud-best">BEST —</div>
    </div>

    <!-- Race-start hint (auto-hides) -->
    <div class="race-hint" id="race-hint">
      <div class="race-hint-title" id="race-hint-title"></div>
      <div class="race-hint-sub"   id="race-hint-sub"></div>
    </div>
  `;

  // Mount inside the game container if present, else on body.
  const host = document.getElementById('s-game') || document.body;
  host.appendChild(root);

  root._onPause = onPause;
  root.querySelector('#hud-pause').addEventListener('click', () => {
    root._onPause?.();
  });

  _hudRoot = root;
  _hudEls = {
    pos:    root.querySelector('#hud-pos'),
    dist:   root.querySelector('#hud-dist'),
    bar:    root.querySelector('#hud-bar'),
    barTip: root.querySelector('#hud-bar-tip'),
    lap:    root.querySelector('#hud-lap'),
    speed:  root.querySelector('#hud-speed'),
    time:   root.querySelector('#hud-time'),
    best:   root.querySelector('#hud-best'),
    nitro:  Array.from(root.querySelectorAll('.hud-nitro-seg')),
    hint:   root.querySelector('#race-hint'),
    hintT:  root.querySelector('#race-hint-title'),
    hintS:  root.querySelector('#race-hint-sub'),
  };

  return _hudEls;
}

export function showRaceHUD() {
  if (_hudRoot) _hudRoot.classList.add('on');
}

export function hideRaceHUD() {
  if (_hudRoot) _hudRoot.classList.remove('on');
  hideRaceHint();
}

/** Format seconds → "MM:SS.mmm". */
function fmtTime(s) {
  if (!isFinite(s) || s < 0) s = 0;
  const m  = Math.floor(s / 60);
  const ss = Math.floor(s - m * 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/**
 * Per-frame HUD update.
 *
 * @param {object} d
 * @param {number} d.speed     km/h (current)
 * @param {number} d.distPct   0..1 progress along the lap
 * @param {number} d.lap       current lap (1-based)
 * @param {number} d.totalLaps total laps
 * @param {number} d.raceTime  seconds since start of race
 * @param {number} d.bestTime  best-lap seconds (0 if none)
 * @param {number} d.position  player position (1 = first)
 * @param {number} d.opponents total racers (player + AI)
 * @param {number} d.nitroStored 0..nitroMax
 * @param {number} d.nitroMax  e.g. 3
 * @param {boolean} d.nitroActive
 */
export function updateRaceHUD(d) {
  if (!_hudEls) return;

  // Position (e.g. 1/6) — ready for opponents.
  const pos  = d.position  ?? 1;
  const opps = d.opponents ?? 6;
  _hudEls.pos.innerHTML = `${pos}<span class="hud-sep">/</span>${opps}`;

  // Distance %
  const pct01 = Math.max(0, Math.min(1, d.distPct ?? 0));
  const pctTxt = Math.round(pct01 * 100) + '%';
  if (_hudEls.dist.textContent !== pctTxt) _hudEls.dist.textContent = pctTxt;
  _hudEls.bar.style.width = (pct01 * 100).toFixed(2) + '%';
  _hudEls.barTip.style.left = (pct01 * 100).toFixed(2) + '%';

  // Lap counter
  const lapTxt = `LAP ${d.lap ?? 1}/${d.totalLaps ?? 1}`;
  if (_hudEls.lap.textContent !== lapTxt) _hudEls.lap.textContent = lapTxt;

  // Speed (no decimals — Asphalt-style)
  const speed = Math.max(0, Math.round(d.speed ?? 0));
  if (_hudEls.speed.textContent !== String(speed)) _hudEls.speed.textContent = speed;

  // Race timer
  _hudEls.time.textContent = fmtTime(d.raceTime ?? 0);

  // Best time (only update on change to avoid layout thrash)
  const best = d.bestTime || 0;
  if (best !== _bestSeen) {
    _bestSeen = best;
    _hudEls.best.textContent = best > 0 ? `BEST ${fmtTime(best)}` : 'BEST —';
  }

  // Nitro segments
  const max    = d.nitroMax ?? 3;
  const stored = Math.max(0, Math.min(max, d.nitroStored ?? 0));
  const active = !!d.nitroActive;
for (let i = 0; i < _hudEls.nitro.length; i++) {
  const segSize = max / _hudEls.nitro.length;
  const fill = Math.max(0, Math.min(1, (stored - i * segSize) / segSize));

  const seg = _hudEls.nitro[i];
  seg.style.setProperty('--fill', (fill * 100).toFixed(1) + '%');
  seg.classList.toggle('active', active && fill > 0);
  seg.classList.toggle('empty', fill <= 0);
}
}

/* ════════════════════════════════════════════════════════════════════
 * 4. RACE-START HINT BANNER
 * ─────────────────────────────────────────────────────────────────────
 * One-shot. Auto-fades after `ms`. Used for the "THE FINISH IS A TRAP"
 * style level intro line. Title can be a single short headline; sub is
 * the longer explanation. If you only pass `title`, the sub is hidden.
 * ════════════════════════════════════════════════════════════════════ */
export function showRaceHint(title, sub = '', ms = 4200) {
  if (!_hudEls) return;
  _hudEls.hintT.textContent = title || '';
  _hudEls.hintS.textContent = sub   || '';
  _hudEls.hintS.style.display = sub ? '' : 'none';

  _hudEls.hint.classList.remove('on');
  void _hudEls.hint.offsetWidth; // restart css anim
  _hudEls.hint.classList.add('on');

  if (_hintTimer) clearTimeout(_hintTimer);
  _hintTimer = setTimeout(() => _hudEls.hint.classList.remove('on'), ms);
}

export function hideRaceHint() {
  if (_hudEls) _hudEls.hint.classList.remove('on');
  if (_hintTimer) { clearTimeout(_hintTimer); _hintTimer = 0; }
}