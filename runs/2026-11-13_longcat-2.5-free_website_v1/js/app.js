/* ==========================================================================
   HALFTONE — an interactive almanac of the monochrome image
   One bit, many greys. No libraries, no images, no colour.
   ========================================================================== */

(() => {
  'use strict';

  document.documentElement.classList.add('js');

  /* ---------------------------------------------------------------- helpers */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionOverride = null;
  const motionOn = () => (motionOverride === null ? !REDUCED.matches : motionOverride);

  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

  function setupCanvas(canvas, w, h, ratio) {
    const d = ratio || dpr();
    const W = Math.max(1, Math.round(w * d));
    const H = Math.max(1, Math.round(h * d));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(d, 0, 0, d, 0, 0);
    return ctx;
  }

  function sizeOf(el) {
    const r = el.getBoundingClientRect();
    return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
  }

  function debounce(fn, ms) {
    let t = null;
    return function () {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, arguments), ms);
    };
  }

  /* ------------------------------------------------------- halftone engine */

  // A sprite atlas: one tile per quantised dot area, so a screen is stamped
  // with drawImage instead of re-stroking thousands of arcs per frame.
  let atlasCache = { key: '', atlas: null };
  function getAtlas(cell, levels, shape) {
    const key = cell + '|' + levels + '|' + shape;
    if (atlasCache.key !== key) {
      atlasCache = { key, atlas: makeAtlas(cell, levels, shape) };
    }
    return atlasCache.atlas;
  }

  function makeAtlas(cell, levels, shape) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(cell * levels));
    c.height = Math.max(1, Math.ceil(cell));
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    const cc = c.height;
    for (let i = 0; i < levels; i++) {
      const area = i / (levels - 1);
      const x = i * cc + cc / 2;
      const y = cc / 2;
      g.beginPath();
      if (shape === 'square') {
        const s = Math.sqrt(area) * cc;
        g.rect(x - s / 2, y - s / 2, s, s);
      } else {
        g.arc(x, y, (cc / 2) * Math.sqrt(area), 0, TAU);
      }
      g.fill();
    }
    return c;
  }

  // field(u, v) -> 0..1 (1 = paper white, 0 = solid ink), u/v in [-1, 1].
  function halftone(ctx, W, H, field, opts) {
    const cell = Math.max(2, Math.round(opts.cell));
    const levels = opts.levels || 64;
    const shape = opts.shape || 'circle';
    const gain = opts.gain || 0;
    const angle = opts.angle || 0;
    const skip = opts.skip == null ? 0.004 : opts.skip;
    const clear = opts.clear !== false;
    const atlas = getAtlas(cell, levels, shape);
    const diag = Math.ceil(Math.hypot(W, H)) + cell * 2;
    const cols = Math.ceil(diag / cell);
    const rows = Math.ceil(diag / cell);
    const ox = -Math.floor(diag / 2);
    const oy = -Math.floor(diag / 2);
    const ca = Math.cos(-angle);
    const sa = Math.sin(-angle);

    ctx.save();
    if (clear) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.translate(W / 2, H / 2);
    ctx.rotate(angle);
    ctx.imageSmoothingEnabled = true;

    for (let j = 0; j < rows; j++) {
      const dy = oy + j * cell;
      const gy = dy + cell / 2;
      for (let i = 0; i < cols; i++) {
        const dx = ox + i * cell;
        const gx = dx + cell / 2;
        const ix = gx * ca - gy * sa;
        const iy = gx * sa + gy * ca;
        const dark = 1 - field(ix, iy);
        let area = dark;
        if (gain) area = clamp(dark + gain * 4 * dark * (1 - dark), 0, 1);
        if (area < skip) continue;
        const lvl = Math.round(area * (levels - 1));
        ctx.drawImage(atlas, lvl * cell, 0, cell, cell, dx, dy, cell, cell);
      }
    }
    ctx.restore();
  }

  /* -------------------------------------------------------- dither engines */

  function bayer(n) {
    let m = [[0, 2], [3, 1]];
    while (m.length < n) {
      const s = m.length;
      const M = Array.from({ length: s * 2 }, () => new Array(s * 2));
      for (let y = 0; y < s * 2; y++) {
        for (let x = 0; x < s * 2; x++) {
          const add = (y < s ? 0 : 2) + (x < s ? 0 : 1);
          const q = add === 0 ? 0 : add === 1 ? 2 : add === 2 ? 3 : 1;
          M[y][x] = 4 * m[y % s][x % s] + q;
        }
      }
      m = M;
    }
    return m;
  }

  function ditherBayer(tones, w, h, n) {
    const m = bayer(n);
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const t = (m[y % n][x % n] + 0.5) / (n * n);
        out[i] = tones[i] < t ? 0 : 1;
      }
    }
    return out;
  }

  function ditherFS(tones, w, h, factor) {
    const err = new Float32Array(w * h);
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const old = clamp(tones[i] + err[i], 0, 1);
        const nv = old < 0.5 ? 0 : 1;
        out[i] = nv;
        const e = (old - nv) * factor;
        if (x + 1 < w) err[i + 1] += e * 7 / 16;
        if (y + 1 < h) {
          if (x > 0) err[i + w - 1] += e * 3 / 16;
          err[i + w] += e * 5 / 16;
          if (x + 1 < w) err[i + w + 1] += e * 1 / 16;
        }
      }
    }
    return out;
  }

  function ditherAtkinson(tones, w, h, factor) {
    const err = new Float32Array(w * h);
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const old = clamp(tones[i] + err[i], 0, 1);
        const nv = old < 0.5 ? 0 : 1;
        out[i] = nv;
        const e = ((old - nv) * factor) / 8;
        if (x + 1 < w) err[i + 1] += e;
        if (x + 2 < w) err[i + 2] += e;
        if (y + 1 < h) {
          if (x > 0) err[i + w - 1] += e;
          err[i + w] += e;
          if (x + 1 < w) err[i + w + 1] += e;
        }
        if (y + 2 < h) err[i + 2 * w] += e;
      }
    }
    return out;
  }

  /* ------------------------------------------------------------ field makers */

  // A soft radial relief with a ripple — the shared "photograph" of the almanac.
  function makeRelief() {
    return (u, v) => {
      const d = Math.hypot(u, v);
      let tone = 0.88 - 0.62 * Math.exp(-d * d * 1.6);
      tone += 0.04 * Math.sin(u * 4.0) * Math.sin(v * 3.4);
      return clamp(tone, 0, 1);
    };
  }

  function makeGrainField() {
    return (u, v) => {
      const d = Math.hypot(u, v);
      return clamp(0.62 + 0.34 * Math.cos(d * 3.0), 0, 1);
    };
  }

  function makeDitherField() {
    return (u, v) => {
      const d = Math.hypot(u, v);
      let tone = 0.52 + 0.26 * Math.sin(u * 3.1 + 0.6) * Math.cos(v * 2.4 - 0.3);
      tone += 0.22 * Math.exp(-d * d * 1.4);
      tone -= 0.1 * d;
      return clamp(tone, 0, 1);
    };
  }

  // Paint a continuous-tone field into a canvas, scaled to fit.
  function paintField(canvas, field, w, h) {
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const octx = off.getContext('2d');
    const img = octx.createImageData(w, h);
    const data = img.data;
    for (let y = 0; y < h; y++) {
      const v = (y / h - 0.5) * 2;
      for (let x = 0; x < w; x++) {
        const u = (x / w - 0.5) * 2;
        const g = Math.round(clamp(field(u, v), 0, 1) * 255);
        const i = (y * w + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = g;
        data[i + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    const s = sizeOf(canvas);
    const ctx = setupCanvas(canvas, s.w, s.h);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, s.w, s.h);
  }

  // Stochastic (FM) screening: fixed dot, varying density.
  function renderFM(ctx, W, H, field, opts) {
    const cell = opts.cell;
    const dotR = opts.dotR;
    const seed = opts.seed || 1;
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    let st = seed >>> 0;
    const rand = () => {
      st = (st * 1664525 + 1013904223) >>> 0;
      return st / 4294967296;
    };
    for (let y = 0; y < H; y += cell) {
      const v = (y / H - 0.5) * 2;
      for (let x = 0; x < W; x += cell) {
        const u = (x / W - 0.5) * 2;
        if (rand() < 1 - field(u, v)) {
          ctx.fillRect(x + cell / 2 - dotR, y + cell / 2 - dotR, dotR * 2, dotR * 2);
        }
      }
    }
    ctx.restore();
  }

  /* -------------------------------------------------------- frame loop / io */

  const frames = new Set();
  let rafId = null;
  function loop(ts) {
    frames.forEach((fn) => fn(ts / 1000));
    rafId = requestAnimationFrame(loop);
  }
  function ensureLoop() {
    if (rafId === null) rafId = requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    } else {
      ensureLoop();
    }
  });

  const resizers = [];
  window.addEventListener('resize', debounce(() => {
    resizers.forEach((fn) => fn());
  }, 120));

  function observe(el, cb) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => cb(e.isIntersecting));
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    io.observe(el);
  }

  /* ------------------------------------------------------------------ hero */

  function initHero() {
    const canvas = $('#hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const light = { x: 0.45, y: -0.35, tx: 0.45, ty: -0.35 };
    let W = 1, H = 1, cx = 0, cy = 0, cell = 8;
    let t = 0, last = 0, lastRender = 0;
    let active = false, dirty = true;

    function layout() {
      const s = sizeOf(canvas);
      W = s.w; H = s.h;
      cx = (W > 900 ? 0.68 : 0.5) * W - W / 2;
      cy = (W > 900 ? 0.52 : 0.3) * H - H / 2;
      cell = clamp(Math.round(Math.min(W, H) / 100), 5, 10);
      setupCanvas(canvas, W, H, Math.min(dpr(), 1.5));
      dirty = true;
    }

    function render() {
      const m = Math.min(W, H);
      halftone(ctx, W, H, (ix, iy) => {
        const dx = ix - cx;
        const dy = iy - cy;
        const r = m * 0.36;
        const d2 = dx * dx + dy * dy;
        let tone;
        if (d2 < r * r) {
          const nz = Math.sqrt(1 - d2 / (r * r));
          const nx = dx / r;
          const ny = dy / r;
          const Lx = light.x, Ly = light.y, Lz = 0.85;
          const ll = Math.hypot(Lx, Ly, Lz) || 1;
          const diff = Math.max(0, (nx * Lx + ny * Ly + nz * Lz) / ll);
          const spec = Math.pow(diff, 40) * 0.95;
          tone = 0.15 + 0.62 * diff + spec;
        } else {
          tone = 0.97;
        }
        tone += 0.02 * Math.sin(dx * 0.012 + t * 0.55) * Math.sin(dy * 0.01 - t * 0.42);
        return clamp(tone, 0, 1);
      }, { cell, levels: 64, shape: 'circle', skip: 0.085 });
    }

    function frame(ts) {
      if (!active) return;
      const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
      last = ts;
      if (!motionOn()) {
        if (dirty) { render(); dirty = false; }
        return;
      }
      t += dt;
      light.x = lerp(light.x, light.tx, clamp(dt * 3.5, 0, 1));
      light.y = lerp(light.y, light.ty, clamp(dt * 3.5, 0, 1));
      if (ts - lastRender > 1 / 30) {
        render();
        lastRender = ts;
      }
    }

    const parent = canvas.parentElement;
    parent.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      const px = (e.clientX - r.left - W / 2 - cx) / (Math.min(W, H) * 0.5);
      const py = (e.clientY - r.top - H / 2 - cy) / (Math.min(W, H) * 0.5);
      light.tx = clamp(px * 0.9, -1, 1);
      light.ty = clamp(py * 0.9, -1, 1);
      if (!motionOn()) dirty = true;
    });
    parent.addEventListener('pointerleave', () => {
      light.tx = 0.45;
      light.ty = -0.35;
      if (!motionOn()) dirty = true;
    });

    layout();
    render();
    resizers.push(layout);
    observe(canvas, (isIn) => { active = isIn; last = performance.now() / 1000; });
    frames.add(frame);
  }

  /* ------------------------------------------------------- 01 · the screen */

  function initScreen() {
    const strip = $('#screen-strip');
    const zoom = $('#screen-zoom');
    if (!strip || !zoom) return;
    const sctx = strip.getContext('2d');
    const zctx = zoom.getContext('2d');
    const toneIn = $('#screen-tone');
    const toneOut = $('#screen-tone-out');
    const readout = $('#screen-readout');
    const zoomOut = $('#screen-zoom-readout');
    const btnRound = $('#screen-shape-round');
    const btnSquare = $('#screen-shape-square');
    let tone = 50;
    let shape = 'circle';

    function dot(c, x, y, size, area, sh) {
      c.beginPath();
      if (sh === 'square') {
        const s = Math.sqrt(area) * size;
        c.rect(x - s / 2, y - s / 2, s, s);
      } else {
        c.arc(x, y, (size / 2) * Math.sqrt(area), 0, TAU);
      }
      c.fill();
    }

    function render() {
      // ramp
      const ss = sizeOf(strip);
      setupCanvas(strip, ss.w, ss.h);
      sctx.fillStyle = '#fff';
      sctx.fillRect(0, 0, ss.w, ss.h);
      const cols = clamp(Math.round(ss.w / 36), 10, 32);
      const cw = ss.w / cols;
      sctx.fillStyle = '#000';
      for (let i = 0; i < cols; i++) {
        const dark = cols === 1 ? 0 : i / (cols - 1);
        dot(sctx, (i + 0.5) * cw, ss.h / 2, Math.min(cw, ss.h) * 0.96, dark, shape);
      }
      const mx = (tone / 100) * ss.w;
      sctx.fillStyle = '#000';
      sctx.fillRect(mx - 1.5, 0, 3, ss.h);
      sctx.fillStyle = '#fff';
      sctx.fillRect(mx - 0.5, 0, 1, ss.h);

      // magnified cell
      const zs = sizeOf(zoom);
      setupCanvas(zoom, zs.w, zs.h);
      zctx.fillStyle = '#fff';
      zctx.fillRect(0, 0, zs.w, zs.h);
      const ZS = Math.min(zs.w, zs.h);
      const pad = Math.round(ZS * 0.08);
      const cSize = ZS - pad * 2;
      const zx = (zs.w - cSize) / 2;
      const zy = (zs.h - cSize) / 2;
      zctx.strokeStyle = '#b8b8b8';
      zctx.lineWidth = 1;
      zctx.beginPath();
      zctx.moveTo(zx + cSize / 2, zy);
      zctx.lineTo(zx + cSize / 2, zy + cSize);
      zctx.moveTo(zx, zy + cSize / 2);
      zctx.lineTo(zx + cSize, zy + cSize / 2);
      zctx.stroke();
      zctx.strokeStyle = '#000';
      zctx.strokeRect(zx + 0.5, zy + 0.5, cSize - 1, cSize - 1);
      zctx.fillStyle = '#000';
      dot(zctx, zx + cSize / 2, zy + cSize / 2, cSize * 0.98, tone / 100, shape);

      const dia = Math.sqrt(tone / 100) * cSize * 0.98;
      toneOut.textContent = `${tone}%`;
      readout.textContent = `Tone ${tone}% · Dot area ${tone}%`;
      zoomOut.textContent = `Cell ${Math.round(cSize)}px · Ø ${dia.toFixed(0)}px`;
      toneIn.setAttribute('aria-valuetext', `${tone} percent tone`);
    }

    toneIn.addEventListener('input', () => { tone = +toneIn.value; render(); });
    function setShape(sh) {
      shape = sh;
      btnRound.setAttribute('aria-pressed', String(sh === 'circle'));
      btnSquare.setAttribute('aria-pressed', String(sh === 'square'));
      render();
    }
    btnRound.addEventListener('click', () => setShape('circle'));
    btnSquare.addEventListener('click', () => setShape('square'));

    resizers.push(render);
    render();
  }

  /* ----------------------------------------------------- 02 · frequency */

  function initFrequency() {
    const canvas = $('#freq-canvas');
    const src = $('#freq-source');
    const input = $('#freq-lpi');
    if (!canvas || !input) return;
    const ctx = canvas.getContext('2d');
    const out = $('#freq-lpi-out');
    const readout = $('#freq-readout');
    const MAG = 8;
    const relief = makeRelief();

    function render() {
      const s = sizeOf(canvas);
      const lpi = +input.value;
      const cell = Math.max(2, Math.round((96 / lpi) * MAG));
      setupCanvas(canvas, s.w, s.h);
      halftone(ctx, s.w, s.h, (ix, iy) => relief(ix / (s.w / 2), iy / (s.h / 2)), { cell, levels: 48, skip: 0.004 });
      if (src) paintField(src, relief, 180, 180);
      out.textContent = `${lpi} LPI`;
      readout.textContent = `Screen ${lpi} LPI · cell ${(96 / lpi).toFixed(2)}px · loupe ×${MAG} → ${cell}px`;
      input.setAttribute('aria-valuetext', `${lpi} lines per inch`);
    }

    input.addEventListener('input', render);
    resizers.push(render);
    render();
  }

  /* ------------------------------------------------------- 03 · dot gain */

  function initGain() {
    const canvas = $('#gain-canvas');
    const tvi = $('#gain-tvi');
    const gainIn = $('#gain-gain');
    const probeIn = $('#gain-probe');
    if (!canvas || !gainIn || !probeIn) return;
    const ctx = canvas.getContext('2d');
    const gainOut = $('#gain-gain-out');
    const probeOut = $('#gain-probe-out');
    const readout = $('#gain-readout');
    const STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    let gain = 0.12;
    let probe = 50;

    const printed = (aim) => clamp(aim + gain * 4 * aim * (1 - aim), 0, 1);

    function render() {
      const s = sizeOf(canvas);
      const W = s.w, H = s.h;
      setupCanvas(canvas, W, H);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);

      const pad = Math.round(W * 0.02);
      const gap = Math.max(2, Math.round(W * 0.004));
      const pw = (W - pad * 2 - gap * (STEPS.length - 1)) / STEPS.length;
      const labelH = 14;
      const rowGap = Math.round(H * 0.06);
      const rowH = Math.round((H - pad * 2 - labelH * 2 - rowGap) / 2);
      const topY = pad + labelH;
      const botY = topY + rowH + rowGap + labelH;

      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#000';
      ctx.fillText('AIM', pad, topY - 5);
      ctx.fillText(`PRINTED · GAIN ${Math.round(gain * 100)}%`, pad, botY - 5);

      for (let i = 0; i < STEPS.length; i++) {
        const aim = STEPS[i] / 100;
        const x = pad + i * (pw + gap);

        const g = Math.round((1 - aim) * 255);
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(x, topY, pw, rowH);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, topY + 0.5, pw - 1, rowH - 1);

        const area = printed(aim);
        const r = (Math.min(pw, rowH) / 6) * Math.sqrt(area);
        ctx.fillStyle = '#000';
        for (let gy = 0; gy < 3; gy++) {
          for (let gx = 0; gx < 3; gx++) {
            const cxp = x + (pw * (gx + 0.5)) / 3;
            const cyp = botY + (rowH * (gy + 0.5)) / 3;
            if (r > 0.2) {
              ctx.beginPath();
              ctx.arc(cxp, cyp, r, 0, TAU);
              ctx.fill();
            }
          }
        }

        if (STEPS[i] === probe) {
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 2, topY - 2, pw + 4, rowH + 4);
          ctx.strokeRect(x - 2, botY - 2, pw + 4, rowH + 4);
        }
      }

      gainOut.textContent = `${Math.round(gain * 100)}%`;
      probeOut.textContent = `${probe}%`;
      readout.textContent = `Aim ${probe}% → Printed ${Math.round(printed(probe / 100) * 100)}%`;
      gainIn.setAttribute('aria-valuetext', `${Math.round(gain * 100)} percent dot gain`);
      probeIn.setAttribute('aria-valuetext', `${probe} percent aim`);

      if (tvi) renderTVI(tvi, printed, probe);
    }

    function renderTVI(canvas, fn, probeVal) {
      const s = sizeOf(canvas);
      const W = s.w, H = s.h;
      const c = setupCanvas(canvas, W, H);
      c.fillStyle = '#fff';
      c.fillRect(0, 0, W, H);
      const x0 = 22, y0 = H - 20, x1 = W - 8, y1 = 8;
      c.strokeStyle = '#000';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x0, y1);
      c.lineTo(x0, y0);
      c.lineTo(x1, y0);
      c.stroke();
      c.setLineDash([3, 3]);
      c.strokeStyle = '#8c8c8c';
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
      c.setLineDash([]);
      c.strokeStyle = '#000';
      c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i <= 100; i++) {
        const aim = i / 100;
        const px = x0 + aim * (x1 - x0);
        const py = y0 - fn(aim) * (y0 - y1);
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.stroke();
      const px = x0 + (probeVal / 100) * (x1 - x0);
      const py = y0 - fn(probeVal / 100) * (y0 - y1);
      c.fillStyle = '#000';
      c.beginPath();
      c.arc(px, py, 3, 0, TAU);
      c.fill();
      c.font = '8px ui-monospace, monospace';
      c.fillStyle = '#000';
      c.textAlign = 'right';
      c.fillText('100', x0 - 3, y1 + 8);
      c.fillText('0', x0 - 3, y0 + 3);
      c.textAlign = 'left';
      c.fillText('AIM 100', x1 - 34, y0 + 10);
    }

    gainIn.addEventListener('input', () => { gain = +gainIn.value / 100; render(); });
    probeIn.addEventListener('input', () => { probe = +probeIn.value; render(); });
    resizers.push(render);
    render();
  }

  /* ------------------------------------------------------- 04 · rosettes */

  function initRosette() {
    const canvas = $('#rosette-canvas');
    const angleIn = $('#rosette-angle');
    const rotateBtn = $('#rosette-rotate');
    if (!canvas || !angleIn) return;
    const ctx = canvas.getContext('2d');
    const out = $('#rosette-angle-out');
    const readout = $('#rosette-readout');
    const flat = () => 0.5;
    let angle = 15;
    let auto = false;
    let t = 0;
    let last = 0;
    let active = false;

    function render() {
      const s = sizeOf(canvas);
      const W = s.w, H = s.h;
      const cell = clamp(Math.round(Math.min(W, H) / 70), 3, 8);
      setupCanvas(canvas, W, H);
      halftone(ctx, W, H, flat, { cell, levels: 8, angle: 0, skip: 0 });
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      halftone(ctx, W, H, flat, {
        cell, levels: 8, angle: (angle * Math.PI) / 180, skip: 0, clear: false
      });
      ctx.restore();

      const rad = (angle * Math.PI) / 180;
      const s2 = Math.abs(Math.sin(rad / 2));
      const beat = s2 < 1e-4 ? '∞' : (cell / (2 * s2)).toFixed(1) + 'px';
      out.textContent = `${Math.round(angle)}°`;
      readout.textContent = angle < 0.5
        ? 'Δθ 0° · screens in register'
        : `Δθ ${Math.round(angle)}° · beat ≈ ${beat}`;
      angleIn.value = String(Math.round(angle));
      angleIn.setAttribute('aria-valuetext', `${Math.round(angle)} degrees`);
    }

    function frame(ts) {
      if (!active || !auto || !motionOn()) return;
      const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
      last = ts;
      t += dt;
      angle = 22.5 + 22.5 * Math.sin(t * 0.7);
      render();
    }

    angleIn.addEventListener('input', () => {
      angle = +angleIn.value;
      auto = false;
      rotateBtn.setAttribute('aria-pressed', 'false');
      render();
    });
    rotateBtn.addEventListener('click', () => {
      auto = !auto;
      rotateBtn.setAttribute('aria-pressed', String(auto));
      if (auto) t = Math.asin(clamp((angle - 22.5) / 22.5, -1, 1)) / 0.7;
      last = performance.now() / 1000;
      render();
    });

    resizers.push(render);
    observe(canvas, (isIn) => { active = isIn; last = performance.now() / 1000; });
    frames.add(frame);
    render();
  }

  /* ------------------------------------------------------- 05 · dithering */

  function initDither() {
    const canvas = $('#dither-canvas');
    const src = $('#dither-source');
    const group = $('#dither-algo');
    const paramIn = $('#dither-param');
    const paramOut = $('#dither-param-out');
    const paramLabel = $('#dither-param-label');
    const readout = $('#dither-readout');
    if (!canvas || !group || !paramIn) return;
    const ctx = canvas.getContext('2d');
    const SW = 260, SH = 156;
    const buttons = $$('button', group);
    const field = makeDitherField();
    let algo = 'bayer';
    let param = 8;

    const tones = new Float32Array(SW * SH);
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        tones[y * SW + x] = field((x / SW - 0.5) * 2, (y / SH - 0.5) * 2);
      }
    }

    function bits() {
      if (algo === 'bayer') return ditherBayer(tones, SW, SH, param);
      if (algo === 'fs') return ditherFS(tones, SW, SH, param);
      if (algo === 'atkinson') return ditherAtkinson(tones, SW, SH, param);
      return null;
    }

    function render() {
      const s = sizeOf(canvas);
      const off = document.createElement('canvas');
      off.width = SW;
      off.height = SH;
      const octx = off.getContext('2d');
      const img = octx.createImageData(SW, SH);
      const data = img.data;
      const b = bits();
      for (let i = 0; i < SW * SH; i++) {
        const v = b ? (b[i] ? 255 : 0) : Math.round(tones[i] * 255);
        const j = i * 4;
        data[j] = data[j + 1] = data[j + 2] = v;
        data[j + 3] = 255;
      }
      octx.putImageData(img, 0, 0);
      setupCanvas(canvas, s.w, s.h);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, s.w, s.h);
      ctx.imageSmoothingEnabled = true;

      if (src) paintField(src, field, 180, 180);

      const name = {
        none: 'Continuous tone',
        bayer: `Bayer ${param}×${param}`,
        fs: 'Floyd–Steinberg',
        atkinson: 'Atkinson'
      }[algo];
      paramLabel.textContent = algo === 'bayer' ? 'Matrix' : (algo === 'none' ? 'Param' : 'Diffusion');
      paramOut.textContent = algo === 'bayer' ? `${param}×${param}` : (algo === 'none' ? '—' : `${Math.round(param * 100)}%`);
      readout.textContent = b ? `${name} · 1 bit · ${SW}×${SH}` : `Continuous tone · 8 bit · ${SW}×${SH}`;
      paramIn.disabled = algo === 'none';
      paramIn.setAttribute('aria-valuetext', paramOut.textContent);
    }

    function setAlgo(a) {
      algo = a;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.algo === a)));
      if (a === 'bayer') {
        paramIn.min = '2';
        paramIn.max = '16';
        paramIn.step = '2';
        param = clamp(Math.round(param / 2) * 2 || 8, 2, 16);
        if (param < 2) param = 8;
      } else if (a === 'fs' || a === 'atkinson') {
        paramIn.min = '0.4';
        paramIn.max = '1';
        paramIn.step = '0.05';
        param = a === 'fs' ? 1 : 0.85;
      } else {
        param = 0;
      }
      paramIn.value = String(param);
      render();
    }

    buttons.forEach((b) => b.addEventListener('click', () => setAlgo(b.dataset.algo)));
    paramIn.addEventListener('input', () => {
      param = +paramIn.value;
      if (algo === 'bayer') param = clamp(Math.round(param / 2) * 2, 2, 16);
      render();
    });

    resizers.push(render);
    render();
  }

  /* ----------------------------------------------------------- 06 · grain */

  function initGrain() {
    const stage = $('#grain-stage');
    const am = $('#grain-am');
    const fm = $('#grain-fm');
    const divider = $('#grain-divider');
    const wipeIn = $('#grain-wipe');
    const wipeOut = $('#grain-wipe-out');
    const out = $('#grain-out');
    if (!stage || !am || !fm) return;
    const actx = am.getContext('2d');
    const fctx = fm.getContext('2d');
    const field = makeGrainField();
    let x = 50;
    let dragging = false;

    function render() {
      const s = sizeOf(stage);
      setupCanvas(am, s.w, s.h);
      halftone(actx, s.w, s.h, (ix, iy) => field(ix / (s.w / 2), iy / (s.h / 2)), {
        cell: clamp(Math.round(Math.min(s.w, s.h) / 80), 4, 9),
        levels: 48,
        skip: 0.004
      });
      setupCanvas(fm, s.w, s.h);
      renderFM(fctx, s.w, s.h, field, { cell: 2.5, dotR: 1.1, seed: 20261113 });
      updateWipe();
    }

    function updateWipe() {
      fm.style.clipPath = `inset(0 0 0 ${x}%)`;
      divider.style.left = `${x}%`;
      divider.setAttribute('aria-valuenow', String(Math.round(x)));
      divider.setAttribute('aria-valuetext', `${Math.round(x)} percent`);
      if (wipeIn) {
        wipeIn.value = String(Math.round(x));
        wipeIn.setAttribute('aria-valuetext', `${Math.round(x)} percent`);
      }
      if (wipeOut) wipeOut.textContent = `${Math.round(x)}%`;
      if (out) out.textContent = `Wipe ${Math.round(x)}% · AM left · FM right`;
    }

    function setX(clientX) {
      const r = stage.getBoundingClientRect();
      x = clamp(((clientX - r.left) / r.width) * 100, 0, 100);
      updateWipe();
    }

    stage.addEventListener('pointerdown', (e) => {
      dragging = true;
      stage.setPointerCapture(e.pointerId);
      setX(e.clientX);
    });
    stage.addEventListener('pointermove', (e) => { if (dragging) setX(e.clientX); });
    stage.addEventListener('pointerup', () => { dragging = false; });
    stage.addEventListener('pointercancel', () => { dragging = false; });

    divider.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowLeft') { x = clamp(x - step, 0, 100); updateWipe(); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { x = clamp(x + step, 0, 100); updateWipe(); e.preventDefault(); }
      else if (e.key === 'Home') { x = 0; updateWipe(); e.preventDefault(); }
      else if (e.key === 'End') { x = 100; updateWipe(); e.preventDefault(); }
    });

    if (wipeIn) wipeIn.addEventListener('input', () => { x = +wipeIn.value; updateWipe(); });

    resizers.push(render);
    render();
  }

  /* -------------------------------------------------------- 07 · specimen */

  function initSpecimen() {
    const canvas = $('#spec-density');
    if (!canvas) return;
    function render() {
      const s = sizeOf(canvas);
      const W = s.w, H = s.h;
      const c = setupCanvas(canvas, W, H);
      c.fillStyle = '#fff';
      c.fillRect(0, 0, W, H);
      const n = 11;
      const cw = W / n;
      c.fillStyle = '#000';
      for (let i = 0; i < n; i++) {
        const dark = i / (n - 1);
        const r = (Math.min(cw, H) / 2) * Math.sqrt(dark) * 0.98;
        c.beginPath();
        c.arc((i + 0.5) * cw, H / 2, r, 0, TAU);
        c.fill();
      }
    }
    resizers.push(render);
    render();
  }

  /* --------------------------------------------------------------- chrome */

  function initUI() {
    const bar = $('#progressBar');
    const stPos = $('#stPos');
    const stSection = $('#stSection');
    const stScroll = $('#stScroll');
    const stMotion = $('#stMotion');
    const clock = $('#clock');

    let scrollTick = false;
    function onScroll() {
      if (scrollTick) return;
      scrollTick = true;
      requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        const p = max > 0 ? (doc.scrollTop / max) * 100 : 0;
        if (bar) bar.style.width = p.toFixed(2) + '%';
        if (stScroll) stScroll.textContent = `Scroll ${String(Math.round(p)).padStart(3, '0')}%`;
        scrollTick = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();

    let px = 0, py = 0;
    window.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; }, { passive: true });

    let lastUI = 0;
    frames.add((ts) => {
      if (ts - lastUI < 0.1) return;
      lastUI = ts;
      if (stPos) stPos.textContent = `X ${String(Math.round(px)).padStart(4, '0')} · Y ${String(Math.round(py)).padStart(4, '0')}`;
      if (stMotion) stMotion.textContent = motionOn() ? 'Motion On' : 'Motion Off';
    });

    const navLinks = $$('.masthead__nav a');
    const sections = $$('main section[id]');
    if ('IntersectionObserver' in window && sections.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const id = e.target.id;
          navLinks.forEach((a) => {
            a.setAttribute('aria-current', a.getAttribute('href') === '#' + id ? 'true' : 'false');
          });
          if (stSection) stSection.textContent = e.target.getAttribute('data-status') || id;
        });
      }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
      sections.forEach((s) => io.observe(s));
    }

    if (clock) {
      const tick = () => {
        clock.textContent = new Date().toUTCString().slice(17, 25) + ' UTC';
      };
      tick();
      setInterval(tick, 1000);
    }

    // grain, generated locally so it is guaranteed neutral
    const grainEl = $('#grain-overlay');
    if (grainEl) {
      const n = 140;
      const c = document.createElement('canvas');
      c.width = n;
      c.height = n;
      const g = c.getContext('2d');
      const img = g.createImageData(n, n);
      const d = img.data;
      let st = 987654321;
      for (let i = 0; i < n * n; i++) {
        st = (st * 1664525 + 1013904223) >>> 0;
        const v = 128 + Math.round((st / 4294967296 - 0.5) * 90);
        const j = i * 4;
        d[j] = d[j + 1] = d[j + 2] = v;
        d[j + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      grainEl.style.backgroundImage = `url(${c.toDataURL()})`;
    }

    // reveal
    const revealEls = $$('.reveal');
    if ('IntersectionObserver' in window && revealEls.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add('is-in'));
    }

    // glossary
    const glossary = $('#glossary');
    if (glossary) {
      const btns = $$('.glossary__btn', glossary);
      const setAll = (open) => {
        btns.forEach((b) => {
          b.setAttribute('aria-expanded', String(open));
          const panel = document.getElementById(b.getAttribute('aria-controls'));
          if (panel) panel.hidden = !open;
        });
      };
      btns.forEach((b) => {
        b.addEventListener('click', () => {
          const open = b.getAttribute('aria-expanded') === 'true';
          b.setAttribute('aria-expanded', String(!open));
          const panel = document.getElementById(b.getAttribute('aria-controls'));
          if (panel) panel.hidden = open;
        });
      });
      const expand = $('#glossary-expand');
      const collapse = $('#glossary-collapse');
      if (expand) expand.addEventListener('click', () => setAll(true));
      if (collapse) collapse.addEventListener('click', () => setAll(false));
    }

    const printBtn = $('#printBtn');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    const motionBtn = $('#motionBtn');
    if (motionBtn) {
      const sync = () => motionBtn.setAttribute('aria-pressed', String(motionOn()));
      sync();
      motionBtn.addEventListener('click', () => {
        motionOverride = !motionOn();
        sync();
        resizers.forEach((fn) => fn());
      });
    }
  }

  /* ----------------------------------------------------------------- init */

  initHero();
  initScreen();
  initFrequency();
  initGain();
  initRosette();
  initDither();
  initGrain();
  initSpecimen();
  initUI();

  ensureLoop();
})();
