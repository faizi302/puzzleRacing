// ═══════════════════════════════════════════════════════
// COLLISION SYSTEM — Particles (sparks & dust)
// ═══════════════════════════════════════════════════════
export let parts = [];

export function resetParts() {
  parts = [];
}

export function spawnCrash(x, y) {
  for (let i = 0; i < 18; i++) {
    const a  = Math.random() * Math.PI * 2;
    const sp = 1.5 + Math.random() * 4;
    parts.push({
      x, y,
      vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 1.5,
      life: 1, dc: .04 + Math.random()*.04,
      r: 3 + Math.random()*3, t: 's',
    });
  }
}

export function spawnDust(x, y) {
  if (Math.random() > .4) return;
  parts.push({
    x: x + (Math.random()-.5)*18, y,
    vx: (Math.random()-.5)*.7,
    vy: -.4 - Math.random()*.6,
    life: 1, dc: .025 + Math.random()*.02,
    r: 5 + Math.random()*6, t: 'd',
  });
}

export function tickParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= p.dc;
    if (p.life <= 0) parts.splice(i, 1);
  }
}
