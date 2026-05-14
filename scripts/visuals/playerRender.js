// ═══════════════════════════════════════════════════════
// PLAYER RENDER — HUD & lap time display
// ─────────────────────────────────────────────────────
// LEVEL 1 — "THE GHOST START" HUD (REWORKED):
//   • Track name flips through these phases:
//        - "GHOST START"  default / driving on Road1
//        - "ON PLATE…"    while charging the pressure plate
//        - "REAL ROAD!"   once the plate has fired and Road2
//                         is unlocked
//        - "FINISH AHEAD" while actually driving Road2
//   • The keys panel doubles as the Ghost Start progress
//     indicator:
//        - "FAKE"   before the player has done anything
//        - "PLATE NN%"  while the player is on the pressure plate
//        - "OPEN!"  once the plate is fully activated
//   • There is intentionally no "key collected" state —
//     the reworked puzzle has no real key to grab; the
//     pressure plate directly unlocks the winning road.
// ═══════════════════════════════════════════════════════
import { P, kmh, best } from '../systems/roadSystem.js';
import { C } from '../configs/roadConfig.js';

export function fmtT(t) {
  if (!t || t < 0) return '--:--.---';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t - Math.floor(t)) * 1000);
  return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function updHUD(fps, trackLen) {
  document.getElementById('h-spd').textContent  = kmh();
  document.getElementById('h-lap').textContent  = fmtT(P.lapTime);
  document.getElementById('h-best').textContent = best() ? fmtT(best()) : '--:--.---';
  document.getElementById('h-fps').textContent  = fps | 0;

  const pct = trackLen > 0 ? (P.pos / trackLen) * 100 : 0;
  document.getElementById('pf').style.width      = pct.toFixed(1) + '%';
  document.getElementById('pl').textContent      = pct.toFixed(0) + '%';
  document.getElementById('ow').style.opacity    = P.isOffTrack ? '1' : '0';

  // ── Ghost Start progress indicator (uses keys HUD slot) ──
  const keysEl = document.getElementById('h-keys');
  if (keysEl) {
    if (P.ghostPlateActive) {
      keysEl.textContent = 'OPEN!';
      keysEl.style.color = '#9ee36b';
    } else if (P.ghostPlateHeld > 0) {
      const pctPlate = Math.min(1, P.ghostPlateHeld / (C.GHOST_PLATE_HOLD_TIME || 0.6));
      keysEl.textContent = `PLATE ${Math.floor(pctPlate * 100)}%`;
      keysEl.style.color = '#ffd54a';
    } else {
      keysEl.textContent = 'FAKE';
      keysEl.style.color = '#a0c0ff';
    }
  }

  // ── Track name ────────────────────────────────────────
  const trackEl = document.getElementById('h-track');
  if (trackEl) {
    if (P.onRoad2) {
      trackEl.textContent = 'FINISH AHEAD';
      trackEl.style.color = '#9ee36b';
    } else if (P.ghostPlateActive) {
      trackEl.textContent = 'REAL ROAD!';
      trackEl.style.color = '#9ee36b';
    } else if (P.ghostPlateHeld > 0) {
      trackEl.textContent = 'ON PLATE…';
      trackEl.style.color = '#ffd54a';
    } else {
      trackEl.textContent = 'GHOST START';
      trackEl.style.color = '#a0c0ff';
    }
  }
}

export function updLaps() {
  const laps = P.lapTimes;
  const b = best();

  document.getElementById('ll').innerHTML =
    [...laps].reverse().slice(0, 5).map((t, i) => {
      const n = laps.length - i;
      return `<div class="lr${t === b ? ' best' : ''}">` +
             `<span>L${n}</span><span>${fmtT(t)}</span></div>`;
    }).join('');
}