import { C } from '../../configs/roadConfig.js';
import { _visibleSegs } from '../../visuals/roadRender.js';

const COLORS = {
  safeFill: 'rgba(220, 40, 40, 0.72)',     // RED safe
  safeStroke: 'rgba(255, 100, 100, 0.95)',

  dangerFill: 'rgba(40, 210, 80, 0.65)',   // GREEN danger
  dangerStroke: 'rgba(120, 255, 140, 0.95)',

  passedFill: 'rgba(180, 180, 180, 0.22)',
  passedStroke: 'rgba(220, 220, 220, 0.35)',
};

const GATE_HALF_W = 0.18;

function drawGateOnSegment(ctx, gate, seg) {
  const lane = gate.offset || 0;

  const left = lane - GATE_HALF_W;
  const right = lane + GATE_HALF_W;

  const xNearL = seg.x1 + seg.w1 * left;
  const xNearR = seg.x1 + seg.w1 * right;

  const xFarL = seg.x2 + seg.w2 * left;
  const xFarR = seg.x2 + seg.w2 * right;

  const yNear = seg.y1;
  const yFar = seg.y2;

  let fill;
  let stroke;

  if (gate.passed) {
    fill = COLORS.passedFill;
    stroke = COLORS.passedStroke;
  } else if (gate.isSafeGate) {
    fill = COLORS.safeFill;
    stroke = COLORS.safeStroke;
  } else {
    fill = COLORS.dangerFill;
    stroke = COLORS.dangerStroke;
  }

  ctx.save();

  ctx.shadowColor = stroke;
  ctx.shadowBlur = gate.passed ? 0 : 12;

  ctx.beginPath();
  ctx.moveTo(xNearL, yNear);
  ctx.lineTo(xNearR, yNear);
  ctx.lineTo(xFarR, yFar);
  ctx.lineTo(xFarL, yFar);
  ctx.closePath();

  ctx.fillStyle = fill;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(2, Math.abs(yNear - yFar) * 0.12);
  ctx.strokeStyle = stroke;
  ctx.stroke();

  ctx.restore();
}

export function drawCheckpoints(ctx, sceneryObjs) {
  if (!sceneryObjs?.length) return;
  if (!_visibleSegs?.length) return;

  for (const gate of sceneryObjs) {
    if (!gate.isCheckpoint) continue;
    if (gate.hidden) continue;

    const gateSeg = Math.floor(gate.z / C.SEG_LEN);

    const seg = _visibleSegs.find(s => s.index === gateSeg);
    if (!seg) continue;

    drawGateOnSegment(ctx, gate, seg);
  }
}

export function triggerGatePass(gate) {
  gate.passed = true;
}