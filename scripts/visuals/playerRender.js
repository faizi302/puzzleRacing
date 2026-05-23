import { P, kmh, best } from '../systems/roadSystem.js';
import { C } from '../configs/roadConfig.js';

export function fmtT(t) {
  if (!t || t < 0) return '--:--.---';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const ms = Math.floor((t - Math.floor(t)) * 1000);
  return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

const _el = {};
function $(id) {
  return _el[id] || (_el[id] = document.getElementById(id));
}

export function updHUD(fps, trackLen) {
  const spd = $('h-spd');     if (spd)  spd.textContent  = kmh();
  const lap = $('h-lap');     if (lap)  lap.textContent  = fmtT(P.lapTime);
  const bst = $('h-best');    if (bst)  bst.textContent  = best() ? fmtT(best()) : '--:--.---';
  const fp  = $('h-fps');     if (fp)   fp.textContent   = fps | 0;

  const pct = trackLen > 0 ? (P.pos / trackLen) * 100 : 0;
  const pf  = $('pf'); if (pf) pf.style.width = pct.toFixed(1) + '%';
  const pl  = $('pl'); if (pl) pl.textContent = pct.toFixed(0) + '%';
  const ow  = $('ow'); if (ow) ow.style.opacity = P.isOffTrack ? '1' : '0';

  // Ghost Start status in keys slot
  const keysEl = $('h-keys');
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

  // Track name
  const trackEl = $('h-track');
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
  const ll = $('ll');
  if (!ll) return;

  ll.innerHTML = [...laps].reverse().slice(0, 5).map((t, i) => {
    const n = laps.length - i;
    return `<div class="lr${t === b ? ' best' : ''}"><span>L${n}</span><span>${fmtT(t)}</span></div>`;
  }).join('');
}