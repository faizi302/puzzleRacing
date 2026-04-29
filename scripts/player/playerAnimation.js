// ═══════════════════════════════════════════════════════
// PLAYER ANIMATION — Countdown & notification helpers
// ═══════════════════════════════════════════════════════
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
    const steps = ['3','2','1','GO!'];
    let i = 0;
    const tick = () => {
      el.textContent = steps[i];
      el.classList.remove('pop');
      void el.offsetWidth; // force reflow
      el.classList.add('pop');
      i++;
      if (i < steps.length) setTimeout(tick, 850);
      else setTimeout(() => { el.classList.remove('pop'); res(); }, 650);
    };
    tick();
  });
}
