// Background: ink-drawn cells that drift, divide and die (apoptosis),
// above a Raman spectrum that keeps being re-measured.

(() => {
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FONT = '"Special Elite", "Courier New", monospace';
  const TAU = Math.PI * 2;

  let W, H, wide, ink, accent, dim;
  let cells = [];
  let time = 0;
  let nextEvent = 2.5;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (x) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));

  function readColors() {
    const s = getComputedStyle(document.documentElement);
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
    sweep += dt / 4.5;
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
    W = innerWidth;
    H = innerHeight;
    wide = W > 820;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    if (scrollY < innerHeight * 1.4) {
      time += dt;
      stepCells(dt);
      stepSpectrum(dt);
      frame();
    }
    requestAnimationFrame(loop);
  }

  // Let the drawing recede once you scroll into the text.
  const fade = () => {
    canvas.style.opacity = Math.max(0.07, 1 - (scrollY / innerHeight) * 1.3).toFixed(3);
  };
  addEventListener("scroll", fade, { passive: true });

  let rt;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { resize(); frame(); }, 200);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { readColors(); frame(); });

  readColors();
  resize();
  fade();
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
        if (ch === " ") {
          word = null;
          cursor.before(document.createTextNode(" "));
        } else {
          if (!word) {
            word = document.createElement("span");
            word.className = "w";
            cursor.before(word);
          }
          word.append(strike(ch));
        }
        let delay = (li === 0 ? 110 : 24) * (0.6 + Math.random() * 0.9);
        if (",.".includes(ch)) delay += 180;
        await wait(delay);
      }
      await wait(li === 0 ? 600 : 350);
    }
  }

  type();
})();
