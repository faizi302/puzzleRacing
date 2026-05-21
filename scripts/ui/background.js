// ════════════════════════════════════════════════════════════════
// BACKGROUND SYSTEM — Slideshow + Parallax + Particles
// ════════════════════════════════════════════════════════════════

const DEFAULT_IMAGES = [
  'bg1.jpg',
  'bg2.jpg',
  'bg3.jpg',
];

let _state = {
  layers: [],
  current: 0,
  interval: null,
  intervalMs: 7500,
  parallaxOn: true,
  paused: false,
};

export function initBackground({
  basePath = 'assets/menuBackgrounds/',
  images   = DEFAULT_IMAGES,
  intervalMs = 7500,
  parallax = true,
} = {}) {
  const stage = document.getElementById('bg-stage');
  if (!stage) return;

  const layers = Array.from(stage.querySelectorAll('.bg-layer'));
  // Apply image to each layer; ensure we have one layer per image
  images.forEach((file, i) => {
    if (!layers[i]) return;
    layers[i].style.backgroundImage = `url('${basePath}${file}')`;
  });

  _state.layers      = layers;
  _state.intervalMs  = intervalMs;
  _state.parallaxOn  = parallax;
  _state.current     = 0;
  _state.paused      = false;

  // Activate first layer
  layers[0]?.classList.add('is-active');

  // Start auto-advance
  _state.interval = setInterval(advance, intervalMs);

  // Parallax (pointer-driven, throttled via requestAnimationFrame)
  if (parallax) wireParallax(stage);

  // Particle field
  spawnParticles();
}

function advance() {
  if (_state.paused || _state.layers.length < 2) return;

  const cur  = _state.current;
  const next = (cur + 1) % _state.layers.length;

  _state.layers[cur].classList.remove('is-active');
  _state.layers[next].classList.add('is-active');
  _state.current = next;
}

let _parallaxRaf = 0;
let _parallaxTarget = { x: 0, y: 0 };
function wireParallax(stage) {
  const onMove = (e) => {
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    const px = (e.clientX - cx) / cx;     // -1 .. 1
    const py = (e.clientY - cy) / cy;
    _parallaxTarget.x = px * 14;          // max 14px drift
    _parallaxTarget.y = py * 10;
    if (!_parallaxRaf) _parallaxRaf = requestAnimationFrame(applyParallax);
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  // Device tilt (mobile)
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (e) => {
      if (e.gamma == null || e.beta == null) return;
      _parallaxTarget.x = Math.max(-14, Math.min(14, (e.gamma / 30) * 14));
      _parallaxTarget.y = Math.max(-10, Math.min(10, ((e.beta - 45) / 30) * 10));
      if (!_parallaxRaf) _parallaxRaf = requestAnimationFrame(applyParallax);
    }, { passive: true });
  }
}

let _parallaxCur = { x: 0, y: 0 };
function applyParallax() {
  // Smooth lerp toward target
  _parallaxCur.x += (_parallaxTarget.x - _parallaxCur.x) * 0.08;
  _parallaxCur.y += (_parallaxTarget.y - _parallaxCur.y) * 0.08;

  for (const l of _state.layers) {
    // Preserve scale animation; just nudge translate
    if (l.classList.contains('is-active')) {
      l.style.translate = `${_parallaxCur.x}px ${_parallaxCur.y}px`;
    } else {
      l.style.translate = `${_parallaxCur.x * 0.3}px ${_parallaxCur.y * 0.3}px`;
    }
  }

  if (Math.abs(_parallaxTarget.x - _parallaxCur.x) > 0.05 ||
      Math.abs(_parallaxTarget.y - _parallaxCur.y) > 0.05) {
    _parallaxRaf = requestAnimationFrame(applyParallax);
  } else {
    _parallaxRaf = 0;
  }
}

function spawnParticles(count = 22) {
  const host = document.getElementById('bg-particles');
  if (!host) return;
  host.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    const size  = 1 + Math.random() * 3;
    const left  = Math.random() * 100;
    const delay = Math.random() * 9;
    const dur   = 7 + Math.random() * 8;
    const hue   = Math.random() < 0.5 ? '#00e8ff' : '#ff2dd1';
    p.style.cssText = `
      left:${left}vw;
      bottom:-8px;
      width:${size}px;
      height:${size}px;
      background:${hue};
      box-shadow:0 0 ${size*3}px ${hue};
      animation-duration:${dur}s;
      animation-delay:-${delay}s;
    `;
    host.appendChild(p);
  }
}

export function pauseBackground()  { _state.paused = true; }
export function resumeBackground() { _state.paused = false; }