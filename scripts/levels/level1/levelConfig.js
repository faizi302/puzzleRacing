// ═══════════════════════════════════════════════════════
// LEVEL 1 — "THE GHOST START"
// ─────────────────────────────────────────────────────
// "What you see is a beautiful lie."
//
// Layered puzzle:
//   1. Player spawns and sees: FAKE KEY 🔑, FAKE DOOR 🚪, clear path 🟢
//   2. Wrong-but-obvious play: grab key → drive through door → TRAP
//   3. Real solution:
//        • Ignore the fake key
//        • Reverse the car
//        • Find the HIDDEN WALL behind the spawn
//        • Cross the PRESSURE PLATE  ⬜
//        • Fake key turns REAL, the safe path opens 🟢
//        • The original reverse-road secret (Road2) still unlocks
//          afterward for full completion.
//
// And at the end of the first lap: THREE monsters block the
// finish line — one per lane — crawling toward the player.
// ═══════════════════════════════════════════════════════
export const LEVEL_META = {
  id:   'level1',
  name: 'THE GHOST START',

  startMessage:
    '👁️ THE GHOST START — What you see is a beautiful lie.',

  hintMessage:
    '🧩 Don\'t trust the key. Try going BACKWARD instead...',

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