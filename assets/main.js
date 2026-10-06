// Background: ink-drawn cells that drift, divide and die (apoptosis),
// above a Raman spectrum that keeps being re-measured.

(() => {
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FONT = '"American Typewriter", "Cutive", "Courier New", monospace';
  const TAU = Math.PI * 2;

  let W, H, wide, ink, accent, dim;
  let cells = [];
  let time = 0;
  let nextEvent = 2.5;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (x) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));

  function readColors() {
    const s = getComputedStyle(canvas.parentElement);
    ink = s.getPropertyValue("--ink").trim();
    accent = s.getPropertyValue("--accent").trim();
    dim = s.getPropertyValue("--dim").trim();
  }

  // ---------- layout ----------

  function cellBox() {
    return wide
      ? { x0: W * 0.58, x1: W * 0.95, y0: H * 0.1, y1: H * 0.64 }
      : { x0: W * 0.08, x1: W * 0.92, y0: H * 0.06, y1: H * 0.27 };
  }

  function specBox() {
    return wide
      ? { x0: W * 0.58, x1: W * 0.95, y0: H * 0.72, y1: H * 0.9 }
      : { x0: W * 0.06, x1: W * 0.94, y0: H * 0.85, y1: H * 0.95 };
  }

  const population = () => (wide ? 7 : 5);
  const baseR = () => (wide ? Math.min(W, H) * 0.05 : W * 0.065);

  // ---------- cells ----------

  function makeCell(x, y, r, born) {
    const seed = Math.random() * 100;
    const grains = Array.from({ length: 7 }, () => [Math.random() * TAU, rnd(0.55, 0.85)]);
    return {
      x, y, r, R: baseR() * rnd(0.85, 1.15),
      vx: 0, vy: 0, seed, grains,
      nx: rnd(-0.12, 0.12), ny: rnd(-0.12, 0.12),
      state: born ? "born" : "live", t: 0, ang: Math.random() * TAU,
    };
  }

  function spawn(born) {
    const b = cellBox();
    return makeCell(rnd(b.x0, b.x1), rnd(b.y0, b.y1), baseR() * rnd(0.85, 1.1), born);
  }

  function wobblyPath(cx, cy, r, seed, amp, bleb) {
    const p = new Path2D();
    const n = 72;
    for (let i = 0; i <= n; i++) {
      const th = (i / n) * TAU;
      const k =
        1 +
        amp * (0.05 * Math.sin(3 * th + seed + time * 0.7) + 0.035 * Math.sin(5 * th - time * 1.1 + seed * 2)) +
        bleb * (0.1 * Math.max(0, Math.sin(9 * th + seed + time * 2.4)) + 0.06 * Math.sin(13 * th - time * 3));
      const x = cx + Math.cos(th) * r * k;
      const y = cy + Math.sin(th) * r * k;
      i ? p.lineTo(x, y) : p.moveTo(x, y);
    }
    p.closePath();
    return p;
  }

  function drawNucleus(c, cx, cy, r, color, condense) {
    const nr = r * (0.42 - 0.16 * condense);
    const p = wobblyPath(cx + c.nx * r, cy + c.ny * r, nr, c.seed + 7, 0.6, 0);
    const a = ctx.globalAlpha;
    ctx.globalAlpha = a * (0.08 + 0.35 * condense);
    ctx.fillStyle = color;
    ctx.fill(p);
    ctx.globalAlpha = a * 0.85;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke(p);
    ctx.beginPath();
    ctx.arc(cx + c.nx * r + nr * 0.25, cy + c.ny * r - nr * 0.2, Math.max(1, r * 0.06), 0, TAU);
    ctx.globalAlpha = a * 0.9;
    ctx.fill();
    ctx.globalAlpha = a;
  }

  function drawGrains(c, cx, cy, r, color, alpha) {
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    for (const [a, d] of c.grains) {
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a + time * 0.05) * r * d, cy + Math.sin(a + time * 0.05) * r * d, 1.1, 0, TAU);
      ctx.fill();
    }
  }

  function drawMembrane(path, color, alpha) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1.3;
    ctx.stroke(path);
  }

  function drawLive(c, alpha = 1) {
    drawMembrane(wobblyPath(c.x, c.y, c.r, c.seed, 1, 0), ink, 0.9 * alpha);
    drawMembrane(wobblyPath(c.x, c.y, c.r * 0.92, c.seed + 3, 1, 0), ink, 0.18 * alpha);
    drawGrains(c, c.x, c.y, c.r, ink, 0.45 * alpha);
    ctx.globalAlpha = alpha;
    drawNucleus(c, c.x, c.y, c.r, ink, 0);
  }

  // Mitosis: nucleus dissolves into chromosomes on the equator,
  // they split to the poles and the membrane pinches into two cells.
  function drawDividing(c) {
    const p = c.t / 5;
    const s = ease((p - 0.3) / 0.7);
    const ax = Math.cos(c.ang), ay = Math.sin(c.ang);
    const d = s * c.r * 0.95;
    const rd = c.r * (1 - 0.2 * s);
    const A = [c.x + ax * d, c.y + ay * d];
    const B = [c.x - ax * d, c.y - ay * d];

    if (s < 0.02) {
      drawMembrane(wobblyPath(c.x, c.y, c.r, c.seed, 1, 0), ink, 0.9);
    } else {
      const sides = [[A, c.seed], [B, c.seed + 1.7]];
      for (let i = 0; i < 2; i++) {
        const [[x, y], sd] = sides[i];
        const [[ox, oy], osd] = sides[1 - i];
        ctx.save();
        const clip = new Path2D();
        clip.rect(0, 0, W, H);
        clip.addPath(wobblyPath(ox, oy, rd * 0.97, osd, 1, 0));
        ctx.clip(clip, "evenodd");
        drawMembrane(wobblyPath(x, y, rd, sd, 1, 0), ink, 0.9);
        ctx.restore();
      }
    }
    drawGrains(c, c.x, c.y, c.r, ink, 0.3);

    // nucleus fades out as chromosomes condense
    const fade = 1 - ease(p / 0.25);
    if (fade > 0) {
      ctx.globalAlpha = fade;
      drawNucleus(c, c.x, c.y, c.r, ink, 0);
    }
    const show = ease((p - 0.1) / 0.2);
    if (show > 0) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.6;
      const px = -ay, py = ax;
      const la = c.r * 0.09;
      for (let i = 0; i < 6; i++) {
        const off = (i - 2.5) * c.r * 0.11;
        const jitter = Math.sin(c.seed + i * 3.1) * c.r * 0.04;
        for (const sgn of [1, -1]) {
          const along = sgn * (c.r * 0.06 + d * 0.75) + jitter;
          const cx = c.x + px * off + ax * along;
          const cy = c.y + py * off + ay * along;
          ctx.globalAlpha = 0.85 * show;
          ctx.beginPath();
          ctx.moveTo(cx - ax * la * 0.5 - px * la * 0.3, cy - ay * la * 0.5 - py * la * 0.3);
          ctx.lineTo(cx + ax * la * 0.5 + px * la * 0.3, cy + ay * la * 0.5 + py * la * 0.3);
          ctx.stroke();
        }
      }
    }
    return { A, B, rd };
  }

  // Apoptosis: blebbing, shrinking, condensed nucleus, then apoptotic bodies.
  function drawDying(c) {
    const p = c.t / 6;
    const q = ease(p / 0.55);
    const r = c.r * (1 - 0.3 * q);
    if (p < 0.6) {
      const out = 1 - ease((p - 0.5) / 0.1);
      drawMembrane(wobblyPath(c.x, c.y, r, c.seed, 1, q), accent, 0.9 * out);
      drawGrains(c, c.x, c.y, r, accent, 0.5 * out);
      ctx.globalAlpha = out;
      drawNucleus(c, c.x, c.y, r, accent, q);
    }
    const f = ease((p - 0.5) / 0.5);
    if (f > 0) {
      if (!c.bodies) {
        c.bodies = Array.from({ length: 7 }, (_, i) => ({
          a: (i / 7) * TAU + rnd(-0.3, 0.3), rr: rnd(0.14, 0.26), dist: rnd(0.5, 1.1), nuc: i % 2 === 0,
        }));
      }
      const alpha = 1 - ease((p - 0.75) / 0.25);
      for (const b of c.bodies) {
        const dd = r * (0.35 + b.dist * f * 1.3);
        const bx = c.x + Math.cos(b.a) * dd, by = c.y + Math.sin(b.a) * dd;
        drawMembrane(wobblyPath(bx, by, c.r * b.rr, c.seed + b.a, 0.8, 0), accent, 0.85 * alpha);
        if (b.nuc) {
          ctx.globalAlpha = 0.8 * alpha;
          ctx.fillStyle = accent;
          ctx.beginPath();
          ctx.arc(bx, by, c.r * b.rr * 0.35, 0, TAU);
          ctx.fill();
        }
      }
    }
  }

  function stepCells(dt) {
    const b = cellBox();
    for (const c of cells) {
      c.t += dt;
      if (c.state === "live" || c.state === "born") {
        c.r += (c.R - c.r) * Math.min(1, dt * 0.25);
        c.vx += rnd(-1, 1) * 6 * dt;
        c.vy += rnd(-1, 1) * 6 * dt;
      }
      // keep inside the box
      if (c.x < b.x0) c.vx += (b.x0 - c.x) * 0.6 * dt;
      if (c.x > b.x1) c.vx -= (c.x - b.x1) * 0.6 * dt;
      if (c.y < b.y0) c.vy += (b.y0 - c.y) * 0.6 * dt;
      if (c.y > b.y1) c.vy -= (c.y - b.y1) * 0.6 * dt;
      c.vx *= 1 - Math.min(1, dt * 0.9);
      c.vy *= 1 - Math.min(1, dt * 0.9);
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.state === "born" && c.t > 1.5) c.state = "live";
    }
    // soft repulsion so cells don't pile up
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i], c = cells[j];
        const dx = c.x - a.x, dy = c.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const min = (a.state === "dividing" ? a.r * 2 : a.r) + (c.state === "dividing" ? c.r * 2 : c.r) + 10;
        if (dist < min) {
          const push = ((min - dist) / dist) * 0.8 * dt;
          a.vx -= dx * push; a.vy -= dy * push;
          c.vx += dx * push; c.vy += dy * push;
        }
      }
    }

    nextEvent -= dt;
    if (nextEvent <= 0) {
      nextEvent = rnd(2.2, 4);
      const live = cells.filter((c) => c.state === "live" && c.r > c.R * 0.9);
      if (live.length) {
        const c = live[(Math.random() * live.length) | 0];
        const n = cells.length;
        const target = population();
        const divide = n < target ? Math.random() < 0.75 : n > target ? Math.random() < 0.2 : Math.random() < 0.5;
        c.state = divide ? "dividing" : "dying";
        c.t = 0;
        c.ang = Math.random() * TAU;
      }
    }
    if (cells.length < population() - 1) cells.push(spawn(true));
  }

  function drawCells() {
    const next = [];
    for (const c of cells) {
      if (c.state === "live") drawLive(c);
      else if (c.state === "born") drawLive(c, ease(c.t / 1.5));
      else if (c.state === "dividing") {
        const { A, B, rd } = drawDividing(c);
        if (c.t >= 5) {
          for (const [x, y] of [A, B]) {
            const d = makeCell(x, y, rd, false);
            d.vx = (x - c.x) * 0.4;
            d.vy = (y - c.y) * 0.4;
            next.push(d);
          }
          continue;
        }
      } else if (c.state === "dying") {
        drawDying(c);
        if (c.t >= 6) continue;
      }
      next.push(c);
    }
    cells = next;
  }

  // ---------- spectrum ----------

  // [Raman shift cm^-1, half-width, height, group: p protein, n nucleic acid, l lipid]
  const PEAKS = [
    [621, 6, 0.14, "p"], [643, 6, 0.16, "p"], [720, 8, 0.22, "n"], [785, 7, 0.32, "n"],
    [853, 9, 0.22, "p"], [937, 10, 0.18, "p"], [1004, 4, 0.85, "p"], [1090, 10, 0.3, "n"],
    [1128, 8, 0.22, "l"], [1250, 18, 0.32, "p"], [1340, 12, 0.45, "n"], [1450, 14, 0.68, "l"],
    [1580, 10, 0.28, "n"], [1655, 16, 0.62, "p"],
  ];
  const LABELS = [785, 1004, 1340, 1450, 1655];
  const X0 = 600, X1 = 1800, N = 480;
  const SWEEP_SECONDS = 4.5;
  let scans = [];
  let sweep = 0;

  function measure() {
    // each run shifts the nucleic-acid / lipid balance a little
    const nuc = rnd(0.7, 1.7), lip = rnd(0.75, 1.15);
    const ys = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = X0 + ((X1 - X0) * i) / (N - 1);
      let y = 0.06 + 0.05 * Math.sin(x / 260) + ((x - X0) / (X1 - X0)) * 0.04;
      for (const [c, w, h, g] of PEAKS) {
        const k = g === "n" ? nuc : g === "l" ? lip : 1;
        y += (h * k) / (1 + ((x - c) / w) ** 2);
      }
      ys[i] = y + rnd(-0.008, 0.008);
    }
    return ys;
  }

  function stepSpectrum(dt) {
    sweep += dt / SWEEP_SECONDS;
    if (sweep > 1.6) {
      scans.unshift(measure());
      scans.length = Math.min(scans.length, 3);
      sweep = 0;
    }
  }

  function drawSpectrum() {
    const b = specBox();
    const sx = (i) => b.x0 + ((b.x1 - b.x0) * i) / (N - 1);
    const sy = (v) => b.y1 - (v / 1.25) * (b.y1 - b.y0);

    // axis
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(b.x0, b.y1 + 0.5);
    ctx.lineTo(b.x1, b.y1 + 0.5);
    ctx.stroke();
    ctx.font = `${wide ? 11 : 10}px ${FONT}`;
    ctx.fillStyle = dim;
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    for (let v = 600; v <= 1800; v += 400) {
      const x = b.x0 + ((v - X0) / (X1 - X0)) * (b.x1 - b.x0);
      ctx.fillRect(x, b.y1, 1, 4);
      ctx.fillText(v, x, b.y1 + 16);
    }
    ctx.textAlign = "right";
    ctx.fillText("raman shift / cm⁻¹", b.x1, b.y1 + (wide ? 32 : 30));

    // older runs as faint ghosts
    for (let s = scans.length - 1; s >= 1; s--) {
      ctx.globalAlpha = s === 1 ? 0.28 : 0.12;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      scans[s].forEach((v, i) => (i ? ctx.lineTo(sx(i), sy(v)) : ctx.moveTo(sx(i), sy(v))));
      ctx.stroke();
    }

    // current run, drawn up to the sweep line
    const cur = scans[0];
    const upto = Math.min(N - 1, Math.floor(Math.min(1, sweep) * (N - 1)));
    ctx.globalAlpha = 1;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= upto; i++) (i ? ctx.lineTo(sx(i), sy(cur[i])) : ctx.moveTo(sx(i), sy(cur[i])));
    ctx.stroke();

    if (sweep < 1) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = accent;
      ctx.fillRect(sx(upto), b.y0 - 6, 1, b.y1 - b.y0 + 6);
    }

    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    for (const L of LABELS) {
      const i = Math.round(((L - X0) / (X1 - X0)) * (N - 1));
      if (i > upto) continue;
      let top = cur[i];
      for (let k = i - 4; k <= i + 4; k++) if (cur[k] > top) top = cur[k];
      ctx.globalAlpha = 0.7;
      ctx.fillText(L, sx(i), sy(top) - 6);
    }
  }

  // ---------- loop ----------

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    wide = W > 820;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // the typed intro moves at the same speed as the spectrum's scan line
    const sb = specBox();
    window.scanSpeed = (sb.x1 - sb.x0) / SWEEP_SECONDS; // px per second
    cells = Array.from({ length: population() }, () => spawn(false));
    // settle positions before the first frame, without triggering events
    for (let i = 0; i < 120; i++) { nextEvent = 99; stepCells(1 / 30); }
    nextEvent = 1.5;
    scans = [measure(), measure()];
    sweep = reduce ? 1 : 0;
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    drawCells();
    drawSpectrum();
    ctx.globalAlpha = 1;
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (scrollY < H) {
      time += dt;
      stepCells(dt);
      stepSpectrum(dt);
      frame();
    }
    requestAnimationFrame(loop);
  }

  let rt;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { resize(); frame(); }, 200);
  });

  readColors();
  resize();
  if (reduce) {
    frame();
    if (document.fonts) document.fonts.ready.then(frame);
  } else {
    requestAnimationFrame(loop);
  }
})();

// ---------- the opening, typed out ----------
(() => {
  const lines = [...document.querySelectorAll("[data-type]")];
  const texts = lines.map((el) => el.textContent);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cursor = document.createElement("span");
  cursor.className = "cursor";
  cursor.setAttribute("aria-hidden", "true");

  const finishAll = () => {
    lines.forEach((el, i) => {
      el.textContent = texts[i];
      el.classList.add("on");
    });
    lines[lines.length - 1].append(cursor);
  };

  if (reduce) return finishAll();

  // any key, click or scroll finishes the typing at once
  let skipped = false;
  const skip = () => { skipped = true; };
  for (const ev of ["keydown", "pointerdown", "wheel", "touchmove"]) {
    addEventListener(ev, skip, { once: true, passive: true });
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // one struck key: slightly uneven ink and alignment, like a real typewriter
  const strike = (ch) => {
    const s = document.createElement("span");
    s.className = "ch";
    s.textContent = ch;
    s.style.opacity = (0.72 + Math.random() * 0.28).toFixed(2);
    s.style.transform = `translateY(${(Math.random() - 0.5).toFixed(2)}px) rotate(${((Math.random() - 0.5) * 2.4).toFixed(2)}deg)`;
    return s;
  };

  async function type() {
    await wait(500);
    for (let li = 0; li < lines.length; li++) {
      const el = lines[li];
      const text = texts[li];
      el.setAttribute("aria-label", text);
      el.textContent = "";
      el.classList.add("on");
      el.append(cursor);
      let word = null;
      for (const ch of text) {
        if (skipped) return finishAll();
        let width;
        if (ch === " ") {
          word = null;
          cursor.before(document.createTextNode(" "));
          width = parseFloat(getComputedStyle(el).fontSize) * 0.3;
        } else {
          if (!word) {
            word = document.createElement("span");
            word.className = "w";
            cursor.before(word);
          }
          const key = strike(ch);
          word.append(key);
          width = key.getBoundingClientRect().width;
        }
        // wait as long as the scan line takes to cover the same width
        const speed = window.scanSpeed || 120;
        await wait((width / speed) * 1000 * (0.8 + Math.random() * 0.4));
      }
      await wait(500);
    }
  }

  type();
})();

// ---------- gallery: repeat each row so the loop is seamless at any width ----------
(() => {
  const tracks = [...document.querySelectorAll(".marquee .track")];
  const originals = tracks.map((t) => [...t.children]);

  const clone = (el) => {
    const c = el.cloneNode(true);
    c.setAttribute("aria-hidden", "true");
    c.querySelectorAll("img").forEach((img) => (img.alt = ""));
    return c;
  };

  function build() {
    tracks.forEach((track, i) => {
      const items = originals[i];
      track.replaceChildren(...items);
      // one "unit" must be at least as wide as the screen; the track is two units
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const setWidth = track.scrollWidth + gap;
      const reps = Math.max(1, Math.ceil(innerWidth / setWidth));
      for (let r = 1; r < reps * 2; r++) items.forEach((el) => track.append(clone(el)));
      // keep the drift at roughly the same speed whatever the width
      track.style.animationDuration = `${((setWidth * reps) / (i % 2 ? 32 : 38)).toFixed(1)}s`;
    });
  }

  build();
  let rt;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(build, 250);
  });
})();

// ---------- background: a dot lattice that is mostly in order ----------
// Slow patches of chaos drift across it, and the pointer scatters nearby
// dots, which find their places again once it moves on.
(() => {
  const canvas = document.getElementById("lattice");
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const S = 26;
  let W, H, t = 0, mx = -1e4, my = -1e4, sx = -1e4, sy = -1e4, frameNo = 0;

  const smooth = (a, b, x) => {
    const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#2a2a2a";
    const scroll = scrollY * 0.35;
    for (let y = S / 2; y < H + S; y += S) {
      for (let x = S / 2; x < W + S; x += S) {
        const Y = y + scroll;
        // where chaos lives: a slow field that is mostly below threshold
        const field =
          Math.sin(x * 0.006 + t * 0.09) * Math.cos(Y * 0.007 - t * 0.07) +
          0.6 * Math.sin((x - Y) * 0.004 + t * 0.05);
        let amp = smooth(0.55, 1.25, field) * 10;
        const d = Math.hypot(x - sx, y - sy);
        if (d < 140) amp += (1 - d / 140) ** 2 * 16;
        if (amp < 0.05) {
          ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
          continue;
        }
        const a = Math.sin(x * 0.05 + Y * 0.031 + t * 0.8) * 3 + Math.cos(Y * 0.043 - x * 0.02 - t * 0.6) * 3;
        ctx.fillRect(x + Math.cos(a) * amp - 0.75, y + Math.sin(a) * amp - 0.75, 1.5, 1.5);
      }
    }
  }

  function loop() {
    t += 1 / 60;
    sx += (mx - sx) * 0.08;
    sy += (my - sy) * 0.08;
    if (++frameNo % 2 === 0) draw();
    requestAnimationFrame(loop);
  }

  addEventListener("pointermove", (e) => {
    if (sx < -1e3) { sx = e.clientX; sy = e.clientY; }
    mx = e.clientX;
    my = e.clientY;
  }, { passive: true });
  document.addEventListener("mouseleave", () => { mx = my = -1e4; });

  let rt;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { resize(); draw(); }, 200);
  });

  resize();
  if (reduce) {
    draw();
    addEventListener("scroll", draw, { passive: true });
  } else {
    loop();
  }
})();

// ---------- click stats (GoatCounter) ----------
// Every link that leaves the site is counted as an event named after what
// it is, e.g. "click: essay — some people" or "click: instagram".
(() => {
  const kinds = [
    [/ishitagrad\.substack\.com\/p\//, "essay"],
    [/substack\.com/, "substack"],
    [/orderandchaosbyishita/, "older writing"],
    [/doi\.org/, "publication"],
    [/scholar\.google/, "google scholar"],
    [/notion\.site/, "poetry collection"],
    [/instagram\.com/, "instagram"],
    [/linkedin\.com/, "linkedin"],
    [/(^|\/\/)(www\.)?x\.com/, "x"],
    [/luma\.com/, "event"],
    [/torontomu\.ca/, "soapbox science"],
    [/^mailto:/, "email"],
  ];

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || !window.goatcounter || !window.goatcounter.count) return;
    const href = a.getAttribute("href");
    if (!/^(https?:|mailto:)/.test(href)) return;
    const kind = (kinds.find(([re]) => re.test(href)) || [, "link"])[1];
    const text = a.textContent.replace(/\s+/g, " ").trim().slice(0, 80);
    const repeat = ["essay", "older writing", "publication", "event", "soapbox science"].includes(kind);
    window.goatcounter.count({
      path: repeat ? `click: ${kind} — ${text}` : `click: ${kind}`,
      title: href,
      event: true,
    });
  });
})();
