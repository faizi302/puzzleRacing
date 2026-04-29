// ═══════════════════════════════════════════════════════
// PLAYER RENDER — HUD & lap time display
// ═══════════════════════════════════════════════════════
import { P, kmh, best }  from '../systems/roadSystem.js';

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
