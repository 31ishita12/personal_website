// Peter de Jong attractor, rendered as a density map:
//   x' = sin(a·y) − cos(b·x)
//   y' = sin(c·x) − cos(d·y)
// Points that take long jumps are tinted with the accent colour.

(() => {
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");
  const paramsEl = document.getElementById("params");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const PRESETS = [
    [1.641, 1.902, 0.316, 1.525],
    [-2.24, 0.43, -0.65, -2.43],
    [2.01, -2.53, 1.61, -0.33],
    [-2.7, -0.09, -0.86, -2.2],
    [1.4, -2.3, 2.4, -2.1],
    [-2.0, -2.0, -1.2, 2.0],
  ];

  const TOTAL = reduceMotion ? 1_500_000 : 2_400_000;
  const PER_FRAME = reduceMotion ? TOTAL : 60_000;

  let W, H, dpr, density, heat, img, params, x, y, done, frame, raf;
  let ink = [11, 11, 11], accent = [255, 59, 31];

  function readColors() {
    const s = getComputedStyle(document.documentElement);
    ink = hex(s.getPropertyValue("--ink"));
    accent = hex(s.getPropertyValue("--accent"));
  }

  function hex(v) {
    v = v.trim().replace("#", "");
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  }

  // Reject parameter sets that collapse to a point or a short cycle.
  function interesting([a, b, c, d]) {
    let px = 0.1, py = 0.1;
    const seen = new Set();
    for (let i = 0; i < 4000; i++) {
      const nx = Math.sin(a * py) - Math.cos(b * px);
      py = Math.sin(c * px) - Math.cos(d * py);
      px = nx;
      if (i > 200) seen.add(((px * 40) | 0) + "," + ((py * 40) | 0));
    }
    return seen.size > 1800;
  }

  function randomParams() {
    for (let k = 0; k < 200; k++) {
      const p = Array.from({ length: 4 }, () => +(Math.random() * 6 - 3).toFixed(3));
      if (interesting(p)) return p;
    }
    return PRESETS[(Math.random() * PRESETS.length) | 0];
  }

  // Where the attractor sits on screen: right-weighted on wide screens.
  function layout() {
    const wide = W > H * 1.1;
    const size = wide ? Math.min(W * 0.55, H * 0.95) : Math.min(W * 0.92, H * 0.42);
    const cx = wide ? W * 0.66 : W * 0.5;
    const cy = wide ? H * 0.5 : H * 0.27;
    return { s: size / 4.2, cx, cy };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.floor(innerWidth * dpr);
    H = Math.floor(innerHeight * dpr);
    canvas.width = W;
    canvas.height = H;
    restart(params);
  }

  function restart(p) {
    params = p || params || PRESETS[0];
    density = new Float32Array(W * H);
    heat = new Float32Array(W * H);
    img = ctx.createImageData(W, H);
    x = 0.1; y = 0.1; done = 0; frame = 0;
    showParams();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(step);
  }

  function showParams() {
    const [a, b, c, d] = params;
    paramsEl.textContent = `a = ${a.toFixed(2)}, b = ${b.toFixed(2)}, c = ${c.toFixed(2)}, d = ${d.toFixed(2)}`;
  }

  function step() {
    const [a, b, c, d] = params;
    const { s, cx, cy } = layout();
    const n = Math.min(PER_FRAME, TOTAL - done);
    for (let i = 0; i < n; i++) {
      const nx = Math.sin(a * y) - Math.cos(b * x);
      const ny = Math.sin(c * x) - Math.cos(d * y);
      const jump = Math.abs(nx - x) + Math.abs(ny - y);
      x = nx; y = ny;
      const px = (cx + x * s) | 0;
      const py = (cy + y * s) | 0;
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const k = py * W + px;
      density[k] += 1;
      if (jump > 3.2) heat[k] += 1;
    }
    done += n;
    frame++;
    if (frame % 3 === 0 || done >= TOTAL) paint();
    if (done < TOTAL) raf = requestAnimationFrame(step);
  }

  function paint() {
    let max = 0;
    for (let i = 0; i < density.length; i++) if (density[i] > max) max = density[i];
    const norm = 1 / Math.log1p(max || 1);
    const data = img.data;
    for (let i = 0, j = 0; i < density.length; i++, j += 4) {
      const v = density[i];
      if (v === 0) { data[j + 3] = 0; continue; }
      const t = Math.min(1, (heat[i] / v) * 1.6);
      data[j] = ink[0] + (accent[0] - ink[0]) * t;
      data[j + 1] = ink[1] + (accent[1] - ink[1]) * t;
      data[j + 2] = ink[2] + (accent[2] - ink[2]) * t;
      data[j + 3] = 235 * Math.pow(Math.log1p(v) * norm, 0.9);
    }
    ctx.putImageData(img, 0, 0);
  }

  document.getElementById("regen").addEventListener("click", () => restart(randomParams()));

  // Let the drawing recede once you scroll past the name.
  const fade = () => {
    canvas.style.opacity = Math.max(0.1, 1 - (scrollY / innerHeight) * 1.2).toFixed(3);
  };
  addEventListener("scroll", fade, { passive: true });
  fade();

  let rt;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(resize, 200);
  });

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    readColors();
    paint();
  });

  readColors();
  params = PRESETS[(Math.random() * PRESETS.length) | 0];
  resize();
})();

