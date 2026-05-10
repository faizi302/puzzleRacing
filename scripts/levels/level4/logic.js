import { P, clamp, addCameraShake } from '../../systems/roadSystem.js';
import { playSfx } from '../../core/audio.js';

import { trackLen } from '../../core/roadMap.js';

export const L4_MEMORY = {
  phase: 'preview', // preview | run | solved
  previewTime: 4.0,
  timer: 0,
  shifted: false,
};

export function resetLevel4Puzzle() {
  L4_MEMORY.phase = 'preview';
  L4_MEMORY.timer = 0;
  L4_MEMORY.shifted = false;

  P.level4MemoryStarted = true;
  P.level4MemorySolved = false;
}

export function updateLevel4Puzzle(dt, sceneryObjs = []) {
  L4_MEMORY.timer += dt;

  if (L4_MEMORY.phase === 'preview' && L4_MEMORY.timer >= L4_MEMORY.previewTime) {
    L4_MEMORY.phase = 'run';

    for (const o of sceneryObjs) {
      if (o.isMemoryPlatform) {
        o.memoryHidden = !o.keepVisible;
      }
    }

    try { playSfx('whoosh', { volume: 0.6 }); } catch (e) {}
  }

  // Mid-run twist: one safe platform becomes fake
  if (L4_MEMORY.phase === 'run' && !L4_MEMORY.shifted &&P.pos > 0.52 * trackLen) {
    L4_MEMORY.shifted = true;

    const target = sceneryObjs.find(o =>
      o.isMemoryPlatform &&
      o.memoryId === 'p7' &&
      !o.isFakePlatform
    );

    if (target) {
      target.isFakePlatform = true;
      target.justShifted = true;
      target.memoryHidden = false; // show cue briefly
    }

    // WIN CONDITION — player reaches final safe memory platform
const finalPad = sceneryObjs.find(o =>
  o.isMemoryPlatform &&
  o.memoryId === 'p9'
);

if (
  finalPad &&
  !P.level4MemorySolved &&
  Math.abs(P.pos - finalPad.z) < 220
) {
  P.level4MemorySolved = true;
  L4_MEMORY.phase = 'solved';

  P.raceFinished = true;
  P.endPhase = 1;
  P.endTime = 0;

  try {
    playSfx('win', { volume: 0.8 });
  } catch (e) {}
}

    try { playSfx('screech', { volume: 0.4 }); } catch (e) {}
  }
}

export function punishMemoryMistake() {
  P.damage = clamp((P.damage || 0) + 20, 0, 100);
  P.impactFlash = 1;
  addCameraShake(0.65, 0.45);

  P.speed *= 0.35;
  P.pos -= 240;
  if (P.pos < 0) P.pos = 0;

  try { playSfx('crash', { volume: 0.8 }); } catch (e) {}
}