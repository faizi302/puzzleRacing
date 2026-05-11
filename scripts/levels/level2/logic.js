import { P, clamp, addCameraShake } from '../../systems/roadSystem.js';
import { playSfx } from '../../core/audio.js';

export const L2_MAZE = {
  phase: 'preview', // preview | glitch | run
  timer: 0,
  previewTime: 5.0,
  glitchTime: 1.0,
};

export function resetLevel2Puzzle() {
  L2_MAZE.phase = 'preview';
  L2_MAZE.timer = 0;

  P.level2MazePhase = 'preview';
  P.level2MazeShifted = false;
  P.level2Glitch = 0;
}

export function updateLevel2Puzzle(dt, sceneryObjs = []) {
  L2_MAZE.timer += dt;

  // Phase 1 → Phase 2
  if (L2_MAZE.phase === 'preview' && L2_MAZE.timer >= L2_MAZE.previewTime) {
    L2_MAZE.phase = 'glitch';
    L2_MAZE.timer = 0;

    P.level2MazePhase = 'glitch';
    P.level2Glitch = 1;

    try { playSfx('screech', { volume: 0.6 }); } catch (e) {}
  }

  // Phase 2 → Phase 3
  if (L2_MAZE.phase === 'glitch' && L2_MAZE.timer >= L2_MAZE.glitchTime) {
    L2_MAZE.phase = 'run';
    L2_MAZE.timer = 0;

    P.level2MazePhase = 'run';
    P.level2MazeShifted = true;
    P.level2Glitch = 0;

    for (const o of sceneryObjs) {
      if (o.isFakeDanger) {
        o.hidden = true;
      }

      if (o.isMazeTrap) {
        o.active = true;
        o.hidden = false;
      }
    }

    try { playSfx('nitro', { volume: 0.5 }); } catch (e) {}
  }

  if (P.level2Glitch > 0) {
    P.level2Glitch = Math.max(0, P.level2Glitch - dt * 1.7);
  }
}

export function isLevel2TrapActive() {
  return L2_MAZE.phase === 'run';
}

export function punishMazeTrap() {
  P.damage = clamp((P.damage || 0) + 20, 0, 100);
  P.impactFlash = 1;
  addCameraShake(0.65, 0.45);

  P.speed *= 0.35;
  P.playerX -= 0.25;

  try { playSfx('crash', { volume: 0.8 }); } catch (e) {}
}