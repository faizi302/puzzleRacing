// ═══════════════════════════════════════════════════════
// SCENERY RENDER — Trees, arches, coins, bridges
// ═══════════════════════════════════════════════════════
import { C }                  from '../configs/roadConfig.js';
import { SPR }                from '../configs/sceneryConfig.js';
import { segs, trackLen }     from '../core/roadMap.js';
import { P, clamp }           from '../systems/roadSystem.js';
import { getCtx, getW, getH, getRes } from '../systems/projectionSystem.js';
import { IMG }                from './objectRender.js';
import { _visibleSegs }       from './roadRender.js';

export let sceneryObjs = [];

export function buildScenery() {
  sceneryObjs = [];
  const trees = ['pineTall','tallTree','pineBig','pineSmall','roundTree'];
  const rocks  = ['rockLow','rockBig','totem'];
  const total  = Math.max(1, Math.floor(trackLen / C.SEG_LEN));

  // Trees: alternating left/right
  for (let i=20; i<total-15; i+=9) {
    const z = i * C.SEG_LEN;
    sceneryObjs.push({kind:trees[(i*3)%trees.length],    z:z+40,  side:-1, offset:1.28+((i%4)*.10)});
    sceneryObjs.push({kind:trees[(i*5+2)%trees.length],  z:z+180, side: 1, offset:1.28+(((i+2)%4)*.10)});
  }
  // Rocks / totems
  for (let i=40; i<total-20; i+=38) {
    const z = i * C.SEG_LEN;
    sceneryObjs.push({kind:rocks[(i*7)%rocks.length],    z:z+80,  side:-1, offset:1.18, small:true});
    sceneryObjs.push({kind:rocks[(i*11+2)%rocks.length], z:z+280, side: 1, offset:1.18, small:true});
  }
  // Bridges
  for (let i=70; i<total-20; i+=90) {
    const z = i * C.SEG_LEN;
    sceneryObjs.push({kind:'bridge', z:z,     side:-1, offset:1.32});
    sceneryObjs.push({kind:'bridge', z:z+240, side: 1, offset:1.32});
  }
  // Coins
  for (let i=35; i<total-20; i+=28) {
    const z = i * C.SEG_LEN;
    for (let k=0; k<5; k++) {
      sceneryObjs.push({kind:'coin', z:z+k*80, side:0, offset:0, isCoin:true});
    }
  }
  // Overhead arches
  for (let i=120; i<total-20; i+=220) {
    sceneryObjs.push({kind:'woodArch',  z:i*C.SEG_LEN, side:0, offset:0, overhead:true});
  }
  for (let i=230; i<total-20; i+=260) {
    sceneryObjs.push({kind:'stoneArch', z:i*C.SEG_LEN, side:0, offset:0, overhead:true});
  }
}

function visibleForZ(z) {
  if (!_visibleSegs.length) return null;
  let best=null, bestDz=Infinity;
  for (const v of _visibleSegs) {
    let z1=v.z1, z2=v.z2, zz=z;
    if (z2<z1) z2 += trackLen;
    if (zz<z1) zz += trackLen;
    if (zz>=z1 && zz<=z2) return {v, pct:(zz-z1)/(z2-z1)};
    const d = Math.abs(zz-z1); if (d<bestDz){ bestDz=d; best=v; }
  }
  return best ? {v:best, pct:0} : null;
}

export function drawScenery() {
  if (!IMG.scenery.ready || !_visibleSegs.length) return;
  const ctx = getCtx();
  const _W  = getW(), _H = getH(), _res = getRes();
  const horizonY = _H * 0.44;
  const list = [];

  for (const o of sceneryObjs) {
    let dz = o.z - P.pos;
    while (dz < 0) dz += trackLen;
    if (dz < 200 || dz > C.DRAW_D * C.SEG_LEN * 0.80) continue;
    const hit = visibleForZ(o.z);
    if (!hit) continue;
    const {v, pct} = hit;
    const y  = v.y1 + (v.y2-v.y1)*pct;
    const cx = v.x1 + (v.x2-v.x1)*pct;
    const rw = v.w1 + (v.w2-v.w1)*pct;
    if (y < horizonY-4 || y > _H*0.98) continue;
    const scale = C.CAM_DEPTH / dz;
    list.push({o, y, cx, rw, scale, dz});
  }

  list.sort((a,b) => b.dz - a.dz);

  for (const it of list) {
    const s = SPR[it.o.kind];
    if (!s) continue;
    let drawW, drawH, x, y;

    if (it.o.overhead) {
      drawW = it.rw * 2.6 * s.scale;
      drawH = drawW * (s.sh/s.sw);
      x = it.cx - drawW/2;
      y = it.y  - drawH * s.anchorY;

    } else if (it.o.isCoin) {
      const worldSize = C.SEG_LEN * 0.18 * s.scale;
      drawW = clamp(worldSize * it.scale * _W, 8*_res, 38*_res);
      drawH = drawW;
      x = it.cx - drawW/2;
      y = it.y  - drawH * 2.2;

    } else {
      const side   = it.o.side || 1;
      const worldR = it.o.small ? C.ROAD_W*0.28*s.scale : C.ROAD_W*0.82*s.scale;
      drawW = worldR * (C.CAM_DEPTH/it.dz) * _W;
      const minW = it.o.small ? 16*_res : 48*_res;
      const maxW = it.o.small ? 0.20*_W : 0.55*_W;
      drawW = clamp(drawW, minW, maxW);
      drawH = drawW * (s.sh/s.sw);
      const groundX = it.cx + side * it.rw * it.o.offset;
      x = groundX - drawW/2;
      y = it.y    - drawH * s.anchorY;
      if (side < 0 && x+drawW > it.cx-it.rw*0.94) x = it.cx-it.rw*0.94-drawW;
      if (side > 0 && x       < it.cx+it.rw*0.94) x = it.cx+it.rw*0.94;
    }

    if (y > _H || x > _W+drawW || x < -drawW) continue;
    if (y+drawH < horizonY) continue;

    const fade = clamp(1 - it.dz/(C.DRAW_D*C.SEG_LEN*0.65), 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.20 + fade*0.80;
    ctx.drawImage(IMG.scenery, s.sx, s.sy, s.sw, s.sh, x, y, drawW, drawH);
    ctx.restore();
  }
}
