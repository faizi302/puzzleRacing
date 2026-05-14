// ═══════════════════════════════════════════════════════
// LEVEL 1 — GORILLA BOSS MONSTER
// Spritesheet: gorila.png — 1215×1425, 4 rows × 3 cols = 10 frames
//
//   Row 1  →  frames  0, 1, 2   (idle / roar)
//   Row 2  →  frames  3, 4, 5   (fists-up / threaten)
//   Row 3  →  frames  6, 7, 8   (charge / lunge)
//   Row 4  →  frame   9         (single standing idle)
// ═══════════════════════════════════════════════════════
import { C } from '../../configs/roadConfig.js';
import { trackLen, getActiveTrack } from '../../core/roadMap.js';

const MONSTER_LANE_OFFSETS = [-0.60, 0.00, 0.60];

const PATROL_RANGE_SEGS  = 5;
const PATROL_SPEED_MULT  = 0.55;
const CHASE_SPEED_MULT   = 1.65;
const RETURN_SPEED_MULT  = 1.20;

const ALERT_SEGS   = 12;
const DETECT_SEGS  = 9;
const ATTACK_SEGS  = 4.2;
const ESCAPE_SEGS  = 18;

const PATROL  = 'patrol';
const CHASE   = 'chase';
const RETURN_ = 'return';
const ATTACK  = 'attack';

// ── Animation sequences (0-based frame indices) ────────
//
//  IDLE   : cycle rows 1 and 4 — roar + stand
//  CHASE  : cycle row 3 — charge / lunge frames
//  ATTACK : rows 2 → 3 — fists up then slam
//
const IDLE_FRAMES   = [0, 1, 2, 9];      // row1 roar + row4 stand
const CHASE_FRAMES  = [6, 7, 8];          // row3 charge
const ATTACK_FRAMES = [3, 4, 5, 6, 7, 8]; // row2 threaten → row3 slam

// Frames where the gorilla's fist/body actually contacts the ground
const PUNCH_HIT_FRAMES = new Set([7, 8]);

export function buildMonsters() {
  const out   = [];
  const total = Math.max(1, Math.floor(trackLen / C.SEG_LEN));
  if (total < 60) return out;

  const onRoad2 = getActiveTrack() === 2;

  const fromEnd  = onRoad2
    ? (C.GHOST_ROAD2_MONSTER_SEG_FROM_END ?? -10)
    : (C.GHOST_MONSTER_SEG_FROM_END       ?? -14);

  const anchorSeg = Math.max(8, total + fromEnd);

  for (let i = 0; i < MONSTER_LANE_OFFSETS.length; i++) {
    const lane    = MONSTER_LANE_OFFSETS[i];
    const stagger = i === 1 ? 0 : 2;
    const seg     = Math.min(total - 4, anchorSeg + stagger);

    const patrolMinSeg = Math.max(2, seg - PATROL_RANGE_SEGS);
    const patrolMaxSeg = Math.min(total - 2, seg + PATROL_RANGE_SEGS);

    out.push({
      kind:        'monster',
      monsterName: 'Gorilla Boss',

      z:           seg * C.SEG_LEN,
      spawnZ:      seg * C.SEG_LEN,
      side:        0,
      offset:      lane,
      spawnOffset: lane,

      isMonster:   true,
      isLethal:    true,
      noCollision: false,
      onRoad2,

      // Start on a different idle frame per lane so they don't sync-blink
      frame:      IDLE_FRAMES[i % IDLE_FRAMES.length],
      frameTimer: Math.random() * 0.1,
      frameRate:  0.14,                 // seconds per idle frame

      attackFrameIndex: 0,
      attackTimer:      0,
      attackCooldown:   0,
      hasHitPlayer:     false,
      isPunchHitFrame:  false,

      aiState:    PATROL,
      patrolMinZ: patrolMinSeg * C.SEG_LEN,
      patrolMaxZ: patrolMaxSeg * C.SEG_LEN,
      patrolDir:  i % 2 === 0 ? 1 : -1,
      crawlSpeed: C.SEG_LEN * 1.05,

      size:   onRoad2 ? 1.38 : 1.32,
      active: false,
    });
  }

  return out;
}

// ── Internal helpers ────────────────────────────────────

function wrapTrackZ(m) {
  if (m.z < 0)          m.z += trackLen;
  if (m.z > trackLen)   m.z -= trackLen;
}

function resetAttack(m) {
  m.attackFrameIndex = 0;
  m.attackTimer      = 0;
  m.hasHitPlayer     = false;
  m.isPunchHitFrame  = false;
}

/** Advance through a fixed frame list at a constant rate. */
function setFrameFromCycle(m, frames, dt, rate) {
  m.frameTimer += dt;

  if (m.frameTimer >= rate) {
    m.frameTimer = 0;
    const cur  = frames.indexOf(m.frame);
    const next = cur >= 0 ? (cur + 1) % frames.length : 0;
    m.frame    = frames[next];
  }

  m.isPunchHitFrame = false;
}

/** Advance the attack animation; loops back and resets cooldown. */
function updateAttackAnimation(m, dt) {
  const ATTACK_RATE = 0.075; // seconds per attack frame (faster than idle)

  m.frameTimer  += dt;
  m.attackTimer += dt;

  if (m.frameTimer >= ATTACK_RATE) {
    m.frameTimer = 0;
    m.attackFrameIndex++;

    if (m.attackFrameIndex >= ATTACK_FRAMES.length) {
      m.attackFrameIndex = 0;
      m.hasHitPlayer     = false;
      m.attackCooldown   = 0.35;      // brief pause between combos
    }
  }

  m.frame           = ATTACK_FRAMES[m.attackFrameIndex];
  m.isPunchHitFrame = PUNCH_HIT_FRAMES.has(m.frame);
}

// ── Main update ─────────────────────────────────────────

export function updateMonsters(monsters, playerZ, dt) {
  if (!monsters?.length) return;

  for (const m of monsters) {
    if (!m.isMonster || m._dead) continue;

    // Cool down attack pause
    if (m.attackCooldown > 0) {
      m.attackCooldown = Math.max(0, m.attackCooldown - dt);
    }

    // Signed distance to player (shortest path around the loop)
    let dz = m.z - playerZ;
    while (dz < -trackLen / 2) dz += trackLen;
    while (dz >  trackLen / 2) dz -= trackLen;
    const segGap = Math.abs(dz) / C.SEG_LEN;

    // ── State transitions ─────────────────────────────
    if (m.aiState === PATROL) {
      if (segGap < DETECT_SEGS) {
        m.aiState = CHASE;
        m.active  = true;
        resetAttack(m);
      } else {
        m.active = segGap < ALERT_SEGS;
      }
    }

    else if (m.aiState === CHASE) {
      if (segGap < ATTACK_SEGS && m.attackCooldown <= 0) {
        m.aiState = ATTACK;
        m.active  = true;
        resetAttack(m);
      } else if (segGap > ESCAPE_SEGS) {
        m.aiState = RETURN_;
        resetAttack(m);
      }
    }

    else if (m.aiState === ATTACK) {
      if (segGap > ATTACK_SEGS + 2) {
        m.aiState = CHASE;
        resetAttack(m);
      }
    }

    else if (m.aiState === RETURN_) {
      const distToSpawn = Math.abs(m.z - m.spawnZ);
      if (distToSpawn < C.SEG_LEN * 2) {
        m.z       = m.spawnZ;
        m.aiState = PATROL;
        resetAttack(m);
      }
    }

    // ── Movement ──────────────────────────────────────
    if (m.aiState === PATROL) {
      const speed = m.crawlSpeed * PATROL_SPEED_MULT;
      m.z += m.patrolDir * speed * dt;

      if (m.z > m.patrolMaxZ) { m.z = m.patrolMaxZ; m.patrolDir = -1; }
      if (m.z < m.patrolMinZ) { m.z = m.patrolMinZ; m.patrolDir =  1; }
    }

    else if (m.aiState === CHASE) {
      const speed = m.crawlSpeed * CHASE_SPEED_MULT;
      const dir   = dz < 0 ? -1 : 1;
      m.z += dir * speed * dt;

      // Don't let gorilla chase infinitely far from its territory
      const maxChaseZ = m.patrolMaxZ + PATROL_RANGE_SEGS * C.SEG_LEN;
      const minChaseZ = m.patrolMinZ - PATROL_RANGE_SEGS * C.SEG_LEN;
      if (m.z > maxChaseZ) m.z = maxChaseZ;
      if (m.z < minChaseZ) m.z = minChaseZ;
    }

    else if (m.aiState === RETURN_) {
      const speed  = m.crawlSpeed * RETURN_SPEED_MULT;
      const toHome = m.spawnZ - m.z;
      m.z += (toHome > 0 ? 1 : -1) * speed * dt;
    }

    // During attack the gorilla stays planted and swings.
    // (m.speed = 0 is a no-op here; kept for clarity)

    wrapTrackZ(m);

    // ── Animation ─────────────────────────────────────
    if (m.aiState === ATTACK) {
      updateAttackAnimation(m, dt);
    } else if (m.aiState === CHASE) {
      setFrameFromCycle(m, CHASE_FRAMES, dt, 0.10);   // faster legs
    } else {
      setFrameFromCycle(m, IDLE_FRAMES,  dt, 0.14);   // relaxed idle
    }
  }
}