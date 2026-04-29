// ═══════════════════════════════════════════════════════
// SCENERY SPRITE ATLAS CONFIGURATION
// Manual atlas for LocationEScenery.png (2048×2048)
// anchorY: fraction from top where "ground contact" point is
// ═══════════════════════════════════════════════════════
export const SPR = {
  // ── Overhead arches & tunnels ─────────────────────────
  woodArch : { sx:   10, sy:   10, sw:1285, sh: 315, scale:1.10, anchorY:.93 },
  stoneArch: { sx:    8, sy:  380, sw:1095, sh: 365, scale:1.00, anchorY:.93 },
  tunnel   : { sx:    5, sy:  830, sw: 565, sh: 430, scale:1.20, anchorY:.93 },
  // ── Trees ─────────────────────────────────────────────
  tallTree : { sx:  735, sy:  860, sw: 335, sh: 470, scale:1.10, anchorY:1.00 },
  pineTall : { sx: 1050, sy:  780, sw: 265, sh: 565, scale:1.15, anchorY:1.00 },
  pineBig  : { sx: 1410, sy:  700, sw: 360, sh: 515, scale:1.12, anchorY:1.00 },
  pineSmall: { sx: 1320, sy: 1190, sw: 260, sh: 400, scale:1.00, anchorY:1.00 },
  roundTree: { sx: 1690, sy: 1390, sw: 310, sh: 410, scale:1.05, anchorY:1.00 },
  // ── Rocks & props ─────────────────────────────────────
  rockBig  : { sx:    5, sy: 1805, sw: 330, sh: 170, scale: .85, anchorY:1.00 },
  rockLow  : { sx:    5, sy: 1625, sw: 420, sh: 130, scale: .70, anchorY:1.00 },
  bridge   : { sx:  395, sy: 1375, sw: 390, sh: 235, scale:1.05, anchorY:1.00 },
  totem    : { sx: 1325, sy:   15, sw: 225, sh: 490, scale: .95, anchorY:1.00 },
  coin     : { sx: 1760, sy:  860, sw:  60, sh:  60, scale: .50, anchorY:1.00 },
};