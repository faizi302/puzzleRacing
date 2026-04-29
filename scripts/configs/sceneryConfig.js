// ═══════════════════════════════════════════════════════
// SCENERY SPRITE ATLAS CONFIGURATION
// Manual atlas for LocationEScenery.png (2048×2048)
// anchorY: fraction from top where "ground contact" point is
// ═══════════════════════════════════════════════════════
export const SPR = {
  // Arches: scale tuned so opening spans road but pillars stay outside road edge.
  woodArch:  {sx:  10, sy:  10, sw:1285, sh: 315, scale:1.10, anchorY:.93},
  stoneArch: {sx:   8, sy: 380, sw:1290, sh: 365, scale:1.00, anchorY:.93},
  tunnel:    {sx:   5, sy: 830, sw: 565, sh: 430, scale:1.20, anchorY:.93},
  // Trees
  tallTree:  {sx: 1020, sy: 860, sw: 335, sh: 470, scale:1.10, anchorY:1.00},
  pineTall:  {sx:990, sy: 780, sw: 280, sh: 540, scale:1.15, anchorY:1.00},
  pineBig:   {sx:1270, sy: 1000, sw: 250, sh: 580, scale:1.0, anchorY:1.00},
  pineSmall: {sx:1320, sy:1190, sw: 260, sh: 400, scale:1.00, anchorY:1.00},
  roundTree: {sx:1690, sy:1390, sw: 310, sh: 410, scale:1.05, anchorY:1.00},
  rockBig:   {sx:   5, sy:1805, sw: 330, sh: 170, scale: .85, anchorY:1.00},
  rockLow:   {sx:   5, sy:1625, sw: 420, sh: 130, scale: .70, anchorY:1.00},
  bridge:    {sx: 395, sy:1375, sw: 390, sh: 235, scale: 1.05, anchorY:1.00},
  totem:     {sx:1325, sy:  45, sw: 500, sh: 490, scale: .95, anchorY:1.00},
  coin:      {sx:1680, sy: 760, sw: 128, sh: 128, scale: 1, anchorY: 1}
};