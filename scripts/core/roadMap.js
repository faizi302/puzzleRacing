// ═══════════════════════════════════════════════════════
// ROAD MAP — Track generation & segment projection
// ═══════════════════════════════════════════════════════
import { C, COL, LCOL } from '../configs/roadConfig.js';

export let segs = [];
export let trackLen = 0;

const addSeg = (curve, hill) => {
  const n = segs.length;
  const isS = n < C.RUMBLE * 2;
  segs.push({
    index: n,
    p1:{world:{x:0,y:0,z: n    *C.SEG_LEN}, cam:{}, scr:{}},
    p2:{world:{x:0,y:0,z:(n+1)*C.SEG_LEN}, cam:{}, scr:{}},
    curve, hill,
    col: isS ? LCOL.START : (Math.floor(n/C.RUMBLE)%2 ? LCOL.DARK : LCOL.LIGHT),
  });
};

const eIO = (a,b,p) => a+(b-a)*((-Math.cos(p*Math.PI)/2)+.5);

const addRoad = (nE,nH,nL,cv,hl) => {
  for(let i=0;i<nE;i++) addSeg(eIO(0,cv,i/nE), eIO(0,hl,i/nE));
  for(let i=0;i<nH;i++) addSeg(cv, hl);
  for(let i=0;i<nL;i++) addSeg(eIO(cv,0,i/nL), eIO(hl,0,i/nL));
};
const straight = (n=25)  => addRoad(n/4|0,n/2|0,n/4|0, 0,  0);
const curve    = (n=25,cv=2,hl=0) => addRoad(n/4|0,n/2|0,n/4|0,cv,hl);

export function buildTrack(buildSceneryCb) {
  segs = [];
  addRoad(1, C.RUMBLE*2, 1, 0, 0);
  straight(260);
  curve(95,   0.28, 0);
  straight(230);
  curve(110, -0.34, 0);
  straight(280);
  curve(105,  0.30, 0);
  straight(260);
  curve(120, -0.24, 0);
  straight(320);
  trackLen = segs.length * C.SEG_LEN;
  if (typeof buildSceneryCb === 'function') buildSceneryCb();
}

export const findSeg = (z) => segs[Math.floor(z/C.SEG_LEN) % segs.length];

export const project = (p, camX, camY, camZ, W, H) => {
  p.cam.x = (p.world.x||0) - camX;
  p.cam.y = (p.world.y||0) - camY;
  p.cam.z = (p.world.z||0) - camZ;
  if(p.cam.z <= 0){ p.scr.scale=0; return; }
  p.scr.scale = C.CAM_DEPTH / p.cam.z;
  p.scr.x = ((W/2) + (p.scr.scale * p.cam.x * W/2));
  p.scr.y = ((H*0.43) - (p.scr.scale * p.cam.y * H/2));
  p.scr.w = (p.scr.scale * C.ROAD_W * W/2);
};
