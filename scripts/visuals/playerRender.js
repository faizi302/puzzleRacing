// ═══════════════════════════════════════════════════════
// PLAYER RENDER — HUD & lap time display
// Adds keys-collected & active-track readouts (optional HTML).
// ═══════════════════════════════════════════════════════
import { P, kmh, best }  from '../systems/roadSystem.js';
import { C }             from '../configs/roadConfig.js';

export function fmtT(t) {
  if (!t || t<0) return '--:--.---';
  const m  = Math.floor(t/60);
  const s  = Math.floor(t%60);
  const ms = Math.floor((t-Math.floor(t))*1000);
  return `${m}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
}

export function updHUD(fps, trackLen) {
  document.getElementById('h-spd').textContent  = kmh();
  document.getElementById('h-lap').textContent  = fmtT(P.lapTime);
  document.getElementById('h-best').textContent = best() ? fmtT(best()) : '--:--.---';
  document.getElementById('h-fps').textContent  = fps|0;
  const pct = trackLen > 0 ? (P.pos/trackLen)*100 : 0;
  document.getElementById('pf').style.width      = pct.toFixed(1)+'%';
  document.getElementById('pl').textContent      = pct.toFixed(0)+'%';
  document.getElementById('ow').style.opacity    = P.isOffTrack ? '1' : '0';

  // ── Optional: keys progress (#h-keys) ──────────────
  const keysEl = document.getElementById('h-keys');
  if (keysEl) {
    keysEl.textContent = `${P.keysCollected}/${C.KEYS_REQUIRED}`;
    // light up green once full
    keysEl.style.color = (P.keysCollected >= C.KEYS_REQUIRED) ? '#9ee36b' : '';
  }

  // ── Optional: which track the player is on (#h-track) ──
  const trackEl = document.getElementById('h-track');
  if (trackEl) {
    trackEl.textContent = P.onRoad2 ? 'ROAD 2' : 'ROAD 1';
    trackEl.style.color = P.onRoad2 ? '#ffd54a' : '';
  }
}

export function updLaps() {
  const laps = P.lapTimes, b = best();
  document.getElementById('ll').innerHTML =
    [...laps].reverse().slice(0,5).map((t,i) => {
      const n = laps.length - i;
      return `<div class="lr${t===b?' best':''}">`+
             `<span>L${n}</span><span>${fmtT(t)}</span></div>`;
    }).join('');
}