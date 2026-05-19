// Shared math helpers — pure functions, no side effects.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp  = (a, b, t)   => a + (b - a) * t;
export const sign  = (v)         => (v > 0 ? 1 : v < 0 ? -1 : 0);

export const smooth01 = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

export const easeInOut = (a, b, p) =>
  a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5);

export function smoothDamp(cur, target, vel, smoothTime, dt, maxSpeed = Infinity) {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = cur - target;
  const maxChange = maxSpeed * smoothTime;
  change = clamp(change, -maxChange, maxChange);
  const temp = (vel.value + omega * change) * dt;
  vel.value = (vel.value - omega * temp) * exp;
  return (cur - change) + (change + temp) * exp;
}

// Wrap a position into [0, len)
export function wrap(v, len) {
  if (!len) return v;
  let r = v % len;
  if (r < 0) r += len;
  return r;
}

// Wrap-aware delta along a looping track.
export function wrapDz(dz, trackLen) {
  if (!trackLen) return dz;
  const half = trackLen / 2;
  while (dz < -half) dz += trackLen;
  while (dz >  half) dz -= trackLen;
  return dz;
}

// Alias for clarity in road code.
export const wrapZ = wrap;