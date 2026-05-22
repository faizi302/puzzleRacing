// ═══════════════════════════════════════════════════════
// LEVEL 1 — "THE GHOST START"
// ═══════════════════════════════════════════════════════
export const LEVEL_META = {
  id:   'level1',
  name: 'THE GHOST START',

  startMessage:
    '👁️ THE GHOST START — What you see is a beautiful lie.',

  hintMessage:
    '🧩 The visible road is lying to you...',

    repeatHints: [
  '🧩 Go where racers never look',
  '🧩 Road 2 exists. It is not in front of you.',
  '🧩 Your wheels know the way. Your eyes do not',
  '🧩 The finish is not on the main road.',
  '🧩 The finish is behind you',
],

  // Triggered when player drives over the pressure plate
  // for GHOST_PLATE_HOLD_TIME seconds.
  plateMessage:
    '⬜ PRESSURE PLATE ACTIVATED — The fake key becomes real.',

  // Triggered when the fake key transforms into the real key.
  keyRealMessage:
    '🔑 The key is REAL now. The safe path is open.',

  // Triggered when the player hits the trap dead-end.
  trapMessage:
    '💀 DEAD END — The visible path was a lie. Restart and try going back.',

  // Triggered when the player's reverse distance crosses the
  // secret-road threshold (legacy reverse-road puzzle).
  reverseMessage:
    '✨ SECRET FOUND — The world is turning behind you.',

  forkMessage:
    '🔄 180° CAMERA TURN — BACK ROAD UNLOCKED!',

  // Triggered when monsters wake up just before the finish.
  monsterWarning:
    '⚠️ THEY HEARD YOU — Three guardians block the finish line.',

  winMessage:
    '🏆 You saw through the lie. THE GHOST START is solved.',
};