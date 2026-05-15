// ═══════════════════════════════════════════════════════
// LEVEL 1 — GORILLA BOSS  (single monster, 5×4 spritesheet)
// ─────────────────────────────────────────────────────
// Spritesheet: gorila.jpeg — 2752 × 1536, 5 cols × 4 rows = 20 frames.
//
//   Row 0 (0..4)   : IDLE / stomp
//   Row 1 (5..9)   : ROAR (arms up)
//   Row 2 (10..14) : CHASE / running
//   Row 3 (15..19) : ATTACK / ground-pound (15 has dust burst)
//
// AI states:
//   PATROL → IDLE animation, walks left/right within ±3 segs.
//   ALERT  → ROAR animation, player just inside detect range.
//   CHASE  → CHASE animation, player inside chase range.
//   ATTACK → ATTACK animation, player inside attack range,
//            briefly holds position and pounds the ground.
//   RETURN → IDLE animation, returning to spawn.
// ═══════════════════════════════════════════════════════
import { C } from '../../configs/roadConfig.js';
import { trackLen, getActiveTrack } from '../../core/roadMap.js';

// Detection ranges (in track segments — small per diagram)
const ALERT_SEGS  = 12;
const DETECT_SEGS = 9;
const ATTACK_SEGS = 4.0;
const ESCAPE_SEGS = 18;

const PATROL_RANGE_SEGS = 3;
const PATROL_SPEED_MULT = 0.55;
const CHASE_SPEED_MULT  = 1.65;
const RETURN_SPEED_MULT = 1.20;

const PATROL = 'patrol';
const ALERT  = 'alert';
const CHASE  = 'chase';
const ATTACK = 'attack';
const RETURN_ = 'return';

// Animation cycles into the 20-frame sheet.
const IDLE_FRAMES   = [0, 1, 2, 3, 4];
const ROAR_FRAMES   = [5, 6, 7, 8, 9];
const CHASE_FRAMES  = [10, 11, 12, 13, 14];
const ATTACK_FRAMES = [15, 16, 17, 18, 19];

// Frames where the ground-pound visually "hits" the floor.
// These are the ones the kill-check piggy-backs on so the
// player is killed at the moment the impact is shown.
const PUNCH_HIT_FRAMES = new Set([15, 16]);

/**
 * Build ONE gorilla boss near the end of the active track.
 * The user explicitly asked for a single monster (not three),
 * with its full original size — so we spawn it dead-center.
 */
export function buildMonsters() {
  const out = [];
  const total = Math.max(1, Math.floor(trackLen / C.SEG_LEN));
  if (total < 60) return out;

  const onRoad2 = getActiveTrack() === 2;

  const fromEnd = onRoad2
    ? (C.GHOST_ROAD2_MONSTER_SEG_FROM_END ?? -10)
    : (C.GHOST_MONSTER_SEG_FROM_END ?? -14);

  const anchorSeg = Math.max(8, Math.min(total - 4, total + fromEnd));

  const patrolMinSeg = Math.max(2, anchorSeg - PATROL_RANGE_SEGS);
  const patrolMaxSeg = Math.min(total - 2, anchorSeg + PATROL_RANGE_SEGS);

  console.log('[L1 BUILD MONSTER]', {
  activeTrack: getActiveTrack(),
  onRoad2,
  totalSegs: total,
  fromEnd,
  anchorSeg,
  monsterZ: anchorSeg * C.SEG_LEN,
  trackLen,
});

  out.push({
    kind: 'monster',
    monsterName: 'Gorilla Boss',

    // World position
    z:          anchorSeg * C.SEG_LEN,
    spawnZ:     anchorSeg * C.SEG_LEN,
    side:       0,
    offset:     0,                 // single gorilla → center lane
    spawnOffset: 0,

    // Flags
    isMonster:   true,
    isLethal:    true,
    noCollision: false,
    onRoad2,

    // Animation
    frame:           IDLE_FRAMES[0],
    frameTimer:      0,
    attackFrameIndex: 0,
    attackCooldown:  0,
    hasHitPlayer:    false,
    isPunchHitFrame: false,

    // AI
    aiState:    PATROL,
    patrolMinZ: patrolMinSeg * C.SEG_LEN,
    patrolMaxZ: patrolMaxSeg * C.SEG_LEN,
    patrolDir:  1,
    crawlSpeed: C.SEG_LEN * 1.05,

    // Visual size — slightly larger on Road2 so the player
    // sees from far that they need to jump.
    size:   onRoad2 ? 1.05 : 1.05,
    active: false,
  });

  return out;
}

// ── Helpers ────────────────────────────────────────────
function wrapTrackZ(m) {
  if (m.z < 0)        m.z += trackLen;
  if (m.z > trackLen) m.z -= trackLen;
}

function resetAttack(m) {
  m.attackFrameIndex = 0;
  m.hasHitPlayer     = false;
  m.isPunchHitFrame  = false;
}

function setFrameFromCycle(m, frames, dt, rate) {
  m.frameTimer += dt;
  if (m.frameTimer >= rate) {
    m.frameTimer = 0;
    const cur = frames.indexOf(m.frame);
    const next = cur >= 0 ? (cur + 1) % frames.length : 0;
    m.frame = frames[next];
  }
  m.isPunchHitFrame = false;
}

function updateAttackAnimation(m, dt) {
  const ATTACK_RATE = 0.085;       // ~12 fps — punchy
  m.frameTimer += dt;

  if (m.frameTimer >= ATTACK_RATE) {
    m.frameTimer = 0;
    m.attackFrameIndex++;

    if (m.attackFrameIndex >= ATTACK_FRAMES.length) {
      // End of one swing — cool down and let chase resume.
      m.attackFrameIndex = 0;
      m.hasHitPlayer     = false;
      m.attackCooldown   = 0.45;
    }
  }

  m.frame           = ATTACK_FRAMES[m.attackFrameIndex];
  m.isPunchHitFrame = PUNCH_HIT_FRAMES.has(m.frame);
}

export function updateMonsters(monsters, playerZ, dt) {
  if (!monsters || !monsters.length) return;

  for (const m of monsters) {
    if (!m.isMonster || m._dead) continue;

    if (m.attackCooldown > 0) {
      m.attackCooldown = Math.max(0, m.attackCooldown - dt);
    }

    // Wrap-aware distance.
    let dz = m.z - playerZ;
    while (dz < -trackLen / 2) dz += trackLen;
    while (dz >  trackLen / 2) dz -= trackLen;
    const segGap = Math.abs(dz) / C.SEG_LEN;

    // ── State transitions ─────────────────────────────
    if (m.aiState === PATROL) {
      if (segGap < ATTACK_SEGS) {
        m.aiState = ATTACK;
        m.active  = true;
        resetAttack(m);
      } else if (segGap < DETECT_SEGS) {
        m.aiState = CHASE;
        m.active  = true;
      } else if (segGap < ALERT_SEGS) {
        m.aiState = ALERT;
        m.active  = true;
      } else {
        m.active = false;
      }
    }
    else if (m.aiState === ALERT) {
      if (segGap < DETECT_SEGS) {
        m.aiState = CHASE;
      } else if (segGap > ALERT_SEGS + 2) {
        m.aiState = PATROL;
      }
    }
    else if (m.aiState === CHASE) {
      if (segGap < ATTACK_SEGS && m.attackCooldown <= 0) {
        m.aiState = ATTACK;
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
        m.z = m.spawnZ;
        m.aiState = PATROL;
        resetAttack(m);
      }
    }

    // ── Movement per state ────────────────────────────
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

      // Don't wander too far from the trap zone.
      const maxChaseZ = m.patrolMaxZ + PATROL_RANGE_SEGS * 2 * C.SEG_LEN;
      const minChaseZ = m.patrolMinZ - PATROL_RANGE_SEGS * 2 * C.SEG_LEN;
      if (m.z > maxChaseZ) m.z = maxChaseZ;
      if (m.z < minChaseZ) m.z = minChaseZ;
    }
    else if (m.aiState === RETURN_) {
      const speed = m.crawlSpeed * RETURN_SPEED_MULT;
      const toHome = m.spawnZ - m.z;
      const dir = toHome > 0 ? 1 : -1;
      m.z += dir * speed * dt;
    }
    // ATTACK and ALERT keep position.

    wrapTrackZ(m);

    // ── Animation ─────────────────────────────────────
    if (m.aiState === ATTACK) {
      updateAttackAnimation(m, dt);
    } else if (m.aiState === CHASE) {
      setFrameFromCycle(m, CHASE_FRAMES, dt, 0.085);
    } else if (m.aiState === ALERT) {
      setFrameFromCycle(m, ROAR_FRAMES, dt, 0.13);
    } else {
      setFrameFromCycle(m, IDLE_FRAMES, dt, 0.14);
    }
  }
}