export function safeDrawImage(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh) {
  if (!img || !img.complete || !sw || !sh || dw <= 0 || dh <= 0) return false;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  return true;
}

export function drawAtlasFrame(ctx, img, frame, dx, dy, dw, dh) {
  if (!img || !frame) return false;
  return safeDrawImage(ctx, img, frame.sx, frame.sy, frame.sw, frame.sh, dx, dy, dw, dh);
}

export function withAlpha(ctx, alpha, fn) {
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = alpha;
  fn();
  ctx.globalAlpha = prev;
}

export function withCtxSave(ctx, fn) {
  ctx.save();
  try { fn(); } finally { ctx.restore(); }
}

export function fillTrapezoid(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}