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


const FRAME_CYCLE = [
  0, 1, 2, 3, 4,
  5, 6, 7, 8, 9,
  10, 11, 12, 13, 14,
  15, 16, 17, 18, 19,
];
const TOTAL_FRAMES = FRAME_CYCLE.length;


const FRAME_FPS = 12;                  // 12 fps over 20 frames ≈ 1.66s per full loop
const FRAME_RATE = 1 / FRAME_FPS;      // seconds per frame


export function buildMonsters() {
  const out = [];
  const total = Math.max(1, Math.floor(trackLen / C.SEG_LEN));
  if (total < 60) return out;

  const onRoad2 = getActiveTrack() === 2;

  const fromEnd = onRoad2
    ? (C.GHOST_ROAD2_MONSTER_SEG_FROM_END ?? -10)
    : (C.GHOST_MONSTER_SEG_FROM_END ?? -14);

  const anchorSeg = Math.max(8, Math.min(total - 4, total + fromEnd));

  const lanes = [-0.66, 0.00, 0.66];

  for (let i = 0; i < lanes.length; i++) {
    out.push({
      kind: 'monster',
      monsterName: `Gorilla Boss ${i + 1}`,

      z: anchorSeg * C.SEG_LEN,
      spawnZ: anchorSeg * C.SEG_LEN,

      side: 0,
      offset: lanes[i],
      spawnOffset: lanes[i],

      isMonster: true,
      isLethal: true,
      noCollision: false,
      onRoad2,

      frameIdx: 0,
      frame: FRAME_CYCLE[0],
      frameTimer: 0,

      aiState: PATROL,

      // keep them in one blocking line
      patrolMinZ: anchorSeg * C.SEG_LEN,
      patrolMaxZ: anchorSeg * C.SEG_LEN,
      patrolDir: 1,
      crawlSpeed: 0,
      attackCooldown: 0,

      size: onRoad2 ? 1.15 : 1.15,
      active: true,
    });
  }

  return out;
}

// ── Helpers ────────────────────────────────────────────
function wrapTrackZ(m) {
  if (m.z < 0)        m.z += trackLen;
  if (m.z > trackLen) m.z -= trackLen;
}

/**
 * Advance the gorilla's animation by one tick.
 * Always cycles 0 → 1 → … → 19 → 0 → 1 → …, regardless of state.
 */
function tickAnimation(m, dt) {
  m.frameTimer += dt;
  while (m.frameTimer >= FRAME_RATE) {
    m.frameTimer -= FRAME_RATE;
    m.frameIdx = (m.frameIdx + 1) % TOTAL_FRAMES;
    m.frame    = FRAME_CYCLE[m.frameIdx];
  }
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
      } else if (segGap > ESCAPE_SEGS) {
        m.aiState = RETURN_;
      }
    }
    else if (m.aiState === ATTACK) {
      if (segGap > ATTACK_SEGS + 2) {
        m.aiState = CHASE;
        m.attackCooldown = 0.45;
      }
    }
    else if (m.aiState === RETURN_) {
      const distToSpawn = Math.abs(m.z - m.spawnZ);
      if (distToSpawn < C.SEG_LEN * 2) {
        m.z = m.spawnZ;
        m.aiState = PATROL;
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

    // ── Animation — ALL 20 frames in one flat cycle ──
    tickAnimation(m, dt);
  }
}