/* ============================================================
   GRAIN — A Specimen Book of Dithering
   Engine: procedural scenes, halftone algorithms, live plates.
   No dependencies. Everything below is plain, hand-set JavaScript.
   ============================================================ */
'use strict';
(function () {

  /* ------------------------------ utilities ------------------------------ */

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const fract = (v) => v - Math.floor(v);
  function hash2(x, y, s) {
    return fract(Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453);
  }

  /* Deterministic value noise + fbm, seeded per plate. */
  function makeValueNoise(seed) {
    const rnd = mulberry32(seed);
    const vals = new Float32Array(65536);
    for (let i = 0; i < 65536; i++) vals[i] = rnd();
    const at = (x, y) => vals[((y & 255) << 8) | (x & 255)];
    const fade = (t) => t * t * (3 - 2 * t);
    function noise(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const u = fade(x - xi), v = fade(y - yi);
      const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    function fbm(x, y, oct) {
      let sum = 0, amp = 0.5, f = 1, norm = 0;
      for (let o = 0; o < oct; o++) {
        sum += amp * noise(x * f, y * f);
        norm += amp; amp *= 0.5; f *= 2.03;
      }
      return sum / norm;
    }
    return { noise, fbm };
  }

  /* ------------------------------ scenes ------------------------------
     Each scene returns a Float32Array of luminance in [0,1].
     p = { light: radians (0 = from the right, CCW), seed: integer }      */

  const SCENES = {

    ramp(w, h) {
      const lum = new Float32Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          lum[y * w + x] = clamp01(0.04 + 0.92 * (x / (w - 1)) + 0.03 * (y / (h - 1)));
        }
      }
      return lum;
    },

    sphere(w, h, p) {
      const lum = new Float32Array(w * h);
      const cx = 0.5, cy = 0.46, r = 0.33;
      const asp = w / h;
      const lx = Math.cos(p.light), ly = -Math.sin(p.light);
      for (let y = 0; y < h; y++) {
        const ny = (y + 0.5) / h - cy;
        for (let x = 0; x < w; x++) {
          const nx = (x + 0.5) / w - cx;
          let v = 0.12 + 0.15 * (y / h);
          if (ny > 0.38) { // contact shadow on the floor
            const sw = Math.exp(-(nx * nx) / 0.05) * Math.exp(-((ny - 0.38) * (ny - 0.38)) / 0.012);
            v -= 0.11 * sw;
          }
          const px = nx * asp;
          const d = Math.hypot(px, ny);
          if (d < r) {
            const nz = Math.sqrt(1 - (d / r) * (d / r));
            const dot = (px / r) * lx + (ny / r) * ly + nz * 0.85;
            v = clamp01(0.05 + 0.95 * Math.pow(Math.max(0, dot), 1.15));
          }
          lum[y * w + x] = clamp01(v);
        }
      }
      return lum;
    },

    moon(w, h, p) {
      const lum = new Float32Array(w * h);
      const asp = w / h;
      const cx = 0.5, cy = 0.5, r = 0.40;
      const rnd = mulberry32(p.seed);
      const craters = [];
      for (let i = 0; i < 22; i++) {
        const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 0.9;
        craters.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, r: 0.03 + rnd() * 0.11, s: rnd() });
      }
      const maria = [
        { x: -0.25, y: -0.22, r: 0.40 },
        { x: 0.16, y: 0.10, r: 0.48 },
        { x: 0.34, y: -0.38, r: 0.26 }
      ];
      const lx = Math.cos(p.light), ly = -Math.sin(p.light);
      const nz = makeValueNoise(p.seed ^ 0x9e37);
      for (let y = 0; y < h; y++) {
        const uy = (y + 0.5) / h - cy;
        for (let x = 0; x < w; x++) {
          const ux = (x + 0.5) / w - cx;
          const px = ux * asp;
          const d = Math.hypot(px, uy);
          let v = 0.06 + 0.05 * (1 - (y / h));
          if (d < r) {
            const qx = px / r, qy = uy / r;
            let surf = 0.62 - 0.16 * nz.fbm(qx * 3 + 9, qy * 3 + 9, 3);
            for (let m = 0; m < 3; m++) {
              const mo = maria[m];
              const md = Math.hypot(qx - mo.x, qy - mo.y) / mo.r;
              if (md < 1.6) surf -= 0.20 * Math.pow(Math.max(0, 1 - md), 1.5);
            }
            for (let c = 0; c < craters.length; c++) {
              const cr = craters[c];
              const cdx = qx - cr.x, cdy = qy - cr.y;
              if (Math.abs(cdx) > cr.r * 1.5 || Math.abs(cdy) > cr.r * 1.5) continue;
              const cd = Math.hypot(cdx, cdy) / cr.r;
              if (cd < 1) surf -= 0.30 * (1 - cd * cd) * (0.7 + 0.5 * cr.s);
              else if (cd < 1.35) surf += 0.15 * (1 - (cd - 1) / 0.35) * (0.6 + 0.5 * cr.s);
            }
            const nzZ = Math.sqrt(Math.max(0, 1 - (d / r) * (d / r)));
            const dot = (px / r) * lx + (uy / r) * ly + nzZ * 0.85;
            const lit = Math.pow(Math.max(0, dot), 1.05);
            v = clamp01(0.05 + surf * (0.25 + 0.95 * lit));
          } else if (hash2(x, y, 3) > 0.9965) {
            v = 0.55; // rare stars in the void
          }
          lum[y * w + x] = clamp01(v);
        }
      }
      return lum;
    },

    waves(w, h, p) {
      const lum = new Float32Array(w * h);
      const asp = w / h;
      const horizon = 0.44;
      const sunX = clamp01(0.5 - Math.cos(p.light) * 0.42);
      const sunY = 0.20;
      const ph = (p.seed % 100) * 0.7;
      for (let y = 0; y < h; y++) {
        const t = (y + 0.5) / h;
        for (let x = 0; x < w; x++) {
          const px = (x + 0.5) / w;
          let v;
          if (t < horizon) {
            const s = t / horizon;
            v = 0.28 + 0.56 * s * s;
            const sd = Math.hypot((px - sunX) * asp, t - sunY);
            v += 0.3 * Math.exp(-(sd * sd) / 0.002);
            if (sd < 0.055) v = 1;
          } else {
            const tt = (t - horizon) / (1 - horizon);
            const freq = 18 + 70 * tt;
            const amp = (0.05 + 0.13 * tt) * (0.6 + 0.4 * Math.sin(px * 7 + ph + tt * 9));
            v = 0.30 + 0.16 * tt + amp * Math.sin(px * freq * 6.283 + ph * 3);
            const spread = 0.02 + 0.10 * tt;
            const g = Math.exp(-((px - sunX) * (px - sunX)) / (2 * spread * spread));
            v += g * (0.22 + 0.34 * tt) * (0.55 + 0.45 * Math.sin(px * freq * 6.283 * 2.7 + ph));
          }
          lum[y * w + x] = clamp01(v);
        }
      }
      return lum;
    },

    terrain(w, h, p) {
      const lum = new Float32Array(w * h);
      const nz = makeValueNoise(p.seed);
      const LAYERS = 4;
      const crest = [0.20, 0.38, 0.55, 0.72];
      const amp = [0.09, 0.075, 0.06, 0.05];
      const tone = [0.84, 0.64, 0.46, 0.22];
      // ridge heights per layer, precomputed along x
      const ridges = [];
      for (let k = 0; k < LAYERS; k++) {
        const r = new Float32Array(w);
        for (let x = 0; x < w; x++) {
          const n = nz.fbm((x / w) * (2.2 + k * 1.4) + k * 13.7, 4.2 + k * 7.3, 4);
          r[x] = crest[k] + amp[k] * (n - 0.5) * 2;
        }
        ridges.push(r);
      }
      const sunX = clamp01(0.5 - Math.cos(p.light) * 0.44);
      for (let y = 0; y < h; y++) {
        const t = (y + 0.5) / h;
        for (let x = 0; x < w; x++) {
          const px = (x + 0.5) / w;
          // sky with a low sun
          let v = 0.88 - 0.38 * t;
          const sd = Math.hypot((px - sunX) * (w / h), t - 0.10);
          v += 0.30 * Math.exp(-(sd * sd) / 0.02);
          if (sd < 0.05) v = 1;
          // far-to-near ridges; the nearest covering layer wins
          for (let k = 0; k < LAYERS; k++) {
            if (t >= ridges[k][x]) {
              v = tone[k];
              // rim of light along the crest
              const rim = t - ridges[k][x];
              if (rim < 0.02) v += 0.14 * (1 - rim / 0.02);
            }
          }
          lum[y * w + x] = clamp01(v);
        }
      }
      return lum;
    }
  };

  /* ------------------------ halftone algorithms ------------------------
     Every algorithm maps a luminance field to quantisation indices
     0..levels-1 (levels = 2 gives strict black and white).               */

  const bayerCache = new Map();
  function bayerMatrix(n) {
    if (bayerCache.has(n)) return bayerCache.get(n);
    let m = [[0]];
    while (m.length < n) {
      const s = m.length;
      const nm = new Array(s * 2);
      for (let y = 0; y < s * 2; y++) nm[y] = new Array(s * 2);
      for (let y = 0; y < s; y++) {
        for (let x = 0; x < s; x++) {
          const v = m[y][x] * 4;
          nm[y][x] = v;
          nm[y][x + s] = v + 2;
          nm[y + s][x] = v + 3;
          nm[y + s][x + s] = v + 1;
        }
      }
      m = nm;
    }
    bayerCache.set(n, m);
    return m;
  }

  /* The classic 8x8 clustered-dot (halftone) screen, values 0..63. */
  const CLUSTER8 = [
    [24, 10, 12, 26, 35, 47, 49, 37],
    [8, 0, 2, 14, 45, 59, 61, 51],
    [22, 6, 4, 16, 43, 57, 63, 53],
    [30, 20, 18, 28, 33, 41, 55, 39],
    [34, 46, 48, 36, 25, 11, 13, 27],
    [44, 58, 60, 50, 9, 1, 3, 15],
    [42, 56, 62, 52, 23, 7, 5, 17],
    [32, 40, 54, 38, 31, 21, 19, 29]
  ];

  function quantOrdered(lum, w, h, matrix, mn, levels) {
    const out = new Uint8Array(w * h);
    const scale = levels - 1;
    for (let y = 0; y < h; y++) {
      const row = matrix[y % mn];
      for (let x = 0; x < w; x++) {
        const t = (row[x % mn] + 0.5) / (mn * mn);
        const v = lum[y * w + x] * scale + t;
        out[y * w + x] = v >= scale ? scale : (v <= 0 ? 0 : v | 0);
      }
    }
    return out;
  }

  function quantStochastic(lum, w, h, levels, seed) {
    const out = new Uint8Array(w * h);
    const scale = levels - 1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const t = hash2(x, y, seed * 7.31 + 3.7);
        const v = lum[y * w + x] * scale + t;
        out[y * w + x] = v >= scale ? scale : (v <= 0 ? 0 : v | 0);
      }
    }
    return out;
  }

  function errDiffuse(lum, w, h, kernel, levels, serpentine) {
    const buf = Float32Array.from(lum);
    const out = new Uint8Array(w * h);
    const scale = levels - 1;
    for (let y = 0; y < h; y++) {
      const ltr = !serpentine || (y & 1) === 0;
      const dir = ltr ? 1 : -1;
      for (let i = 0; i < w; i++) {
        const x = ltr ? i : w - 1 - i;
        const p = y * w + x;
        const old = buf[p];
        const k = Math.min(scale, Math.max(0, Math.round(old * scale)));
        out[p] = k;
        const err = old - k / scale;
        if (err === 0) continue;
        for (let j = 0; j < kernel.length; j++) {
          const nx = x + kernel[j][0] * dir;
          const ny = y + kernel[j][1];
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          buf[ny * w + nx] += err * kernel[j][2];
        }
      }
    }
    return out;
  }

  /* Void-and-cluster (Ulichney, 1993) — builds a blue-noise threshold
     screen by always moving ink to the largest emptiness. Computed once,
     lazily; 32x32, toroidal so it tiles seamlessly. */
  let _blue = null;
  function voidAndCluster(size, sigma) {
    const N = size * size;
    const ones = new Uint8Array(N);
    const energy = new Float64Array(N);
    const rank = new Int32Array(N).fill(-1);
    const K = 5;
    const wgt = [];
    for (let dy = -K; dy <= K; dy++) {
      for (let dx = -K; dx <= K; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > K * K) continue;
        wgt.push([dx, dy, Math.exp(-d2 / (2 * sigma * sigma))]);
      }
    }
    const id = (x, y) => (((y % size) + size) % size) * size + (((x % size) + size) % size);
    function setOne(x, y, val) {
      ones[id(x, y)] = val;
      const s = val ? 1 : -1;
      for (let i = 0; i < wgt.length; i++) {
        energy[id(x + wgt[i][0], y + wgt[i][1])] += s * wgt[i][2];
      }
    }
    // The tightest cluster is the inked pixel with the most inked company
    // (maximum Gaussian energy); the largest void is the empty pixel with
    // the least (minimum energy).
    const findCluster = () => {
      let bi = -1, be = -Infinity;
      for (let i = 0; i < N; i++) if (ones[i] && energy[i] > be) { be = energy[i]; bi = i; }
      return bi;
    };
    const findVoid = () => {
      let bi = -1, be = Infinity;
      for (let i = 0; i < N; i++) if (!ones[i] && energy[i] < be) { be = energy[i]; bi = i; }
      return bi;
    };

    // Phase A: grow a sparse pattern, one dot at a time, into the largest void.
    let count = 0;
    setOne(size >> 1, size >> 1, 1); count = 1;
    const target = Math.max(2, Math.floor(N * 0.1));
    while (count < target) {
      const v = findVoid();
      setOne(v % size, (v / size) | 0, 1);
      count++;
    }
    // Phase B: homogenise — move the tightest cluster into the largest void.
    for (let iter = 0; iter < N * 4; iter++) {
      const c = findCluster();
      if (c < 0) break;
      const cx = c % size, cy = (c / size) | 0;
      setOne(cx, cy, 0);
      const v = findVoid();
      const vx = v % size, vy = (v / size) | 0;
      setOne(vx, vy, 1);
      // If the pixel we just filled is itself the tightest cluster, the
      // pattern is even: stop.
      if (findCluster() === id(vx, vy)) break;
    }
    // Phase C: remove dots from the tightest cluster, darkest ranks first.
    while (count > 0) {
      const c = findCluster();
      rank[c] = count - 1;
      setOne(c % size, (c / size) | 0, 0);
      count--;
    }
    // Phase D: refill every void, brightest ranks last.
    while (count < N) {
      const v = findVoid();
      rank[v] = count;
      setOne(v % size, (v / size) | 0, 1);
      count++;
    }
    // Shape as a 2-D screen so it matches the other ordered matrices.
    const screen = new Array(size);
    for (let y = 0; y < size; y++) {
      screen[y] = new Array(size);
      for (let x = 0; x < size; x++) screen[y][x] = rank[y * size + x];
    }
    return screen;
  }

  function blueMatrix() {
    if (!_blue) _blue = voidAndCluster(32, 1.5);
    return _blue;
  }

  const KERNEL_FS = [[1, 0, 7 / 16], [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16]];
  const KERNEL_ATKINSON = [[1, 0, 1 / 8], [2, 0, 1 / 8], [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8], [0, 2, 1 / 8]];
  const KERNEL_SIERRA = [[1, 0, 1 / 2], [-1, 1, 1 / 4], [0, 1, 1 / 4]];

  const ALGOS = {
    threshold: { run: (l, w, h, p, o) => quantOrdered(l, w, h, [[0]], 1, o.levels) },
    bayer2: { run: (l, w, h, p, o) => quantOrdered(l, w, h, bayerMatrix(2), 2, o.levels) },
    bayer4: { run: (l, w, h, p, o) => quantOrdered(l, w, h, bayerMatrix(4), 4, o.levels) },
    bayer8: { run: (l, w, h, p, o) => quantOrdered(l, w, h, bayerMatrix(8), 8, o.levels) },
    cluster8: { run: (l, w, h, p, o) => quantOrdered(l, w, h, CLUSTER8, 8, o.levels) },
    noise: { run: (l, w, h, p, o) => quantStochastic(l, w, h, o.levels, p.seed) },
    blue: { run: (l, w, h, p, o) => quantOrdered(l, w, h, blueMatrix(), 32, o.levels) },
    floyd: { run: (l, w, h, p, o) => errDiffuse(l, w, h, KERNEL_FS, o.levels, true) },
    atkinson: { run: (l, w, h, p, o) => errDiffuse(l, w, h, KERNEL_ATKINSON, o.levels, false) },
    sierra: { run: (l, w, h, p, o) => errDiffuse(l, w, h, KERNEL_SIERRA, o.levels, true) }
  };

  /* ---------------------------- plate renderer ---------------------------- */

  const plates = new Map(); // canvas element -> entry

  function definePlate(canvas, opts) {
    const entry = { canvas, opts, inView: false, off: null, queued: false };
    plates.set(canvas, entry);
    return entry;
  }

  function renderPlate(entry) {
    const { canvas, opts } = entry;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(rect.width * dpr);
    const H = Math.round(rect.height * dpr);
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;

    const cell = opts.cell || 4;
    const gw = Math.max(16, Math.min(420, Math.round(rect.width / cell)));
    const gh = Math.max(16, Math.min(420, Math.round(rect.height / cell)));

    const p = {
      light: ((opts.light == null ? 135 : opts.light) * Math.PI) / 180,
      seed: opts.seed || 1
    };
    const lum = (SCENES[opts.scene] || SCENES.ramp)(gw, gh, p);

    const ev = opts.exposure || 0;
    if (ev !== 0) {
      const m = Math.pow(2, ev);
      for (let i = 0; i < lum.length; i++) lum[i] = clamp01(lum[i] * m);
    }

    const algo = ALGOS[opts.algo] || ALGOS.threshold;
    opts.levels = Math.max(2, opts.levels || 2);
    const out = algo.run(lum, gw, gh, p, opts);

    if (!entry.off) entry.off = document.createElement('canvas');
    if (entry.off.width !== gw) entry.off.width = gw;
    if (entry.off.height !== gh) entry.off.height = gh;
    const octx = entry.off.getContext('2d');
    const img = octx.createImageData(gw, gh);
    const data = img.data;
    const den = opts.levels - 1;
    for (let i = 0, n = gw * gh; i < n; i++) {
      const g = Math.round((255 * out[i]) / den);
      const j = i << 2;
      data[j] = g; data[j + 1] = g; data[j + 2] = g; data[j + 3] = 255;
    }
    octx.putImageData(img, 0, 0);

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(entry.off, 0, 0, gw, gh, 0, 0, W, H);
  }

  function scheduleRender(entry) {
    if (entry.queued) return;
    entry.queued = true;
    requestAnimationFrame(() => {
      entry.queued = false;
      if (entry.inView) renderPlate(entry);
    });
  }

  /* ------------------------------ DOM wiring ------------------------------ */

  function initDOM() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* ----- register every canvas marked as a plate ----- */
    document.querySelectorAll('canvas[data-plate]').forEach((canvas) => {
      const raw = canvas.getAttribute('data-plate');
      const rawOpts = canvas.getAttribute('data-plate-opts');
      let opts = {};
      try { opts = JSON.parse(raw && raw.trim() ? raw : rawOpts || '{}'); }
      catch (e) { opts = {}; }
      const entry = definePlate(canvas, opts);

      if ('IntersectionObserver' in window) {
        const lazy = new IntersectionObserver((es) => {
          es.forEach((e) => {
            entry.inView = e.isIntersecting;
            if (e.isIntersecting) scheduleRender(entry);
          });
        }, { rootMargin: '160px' });
        lazy.observe(canvas);
      } else {
        entry.inView = true;
        scheduleRender(entry);
      }

      if ('ResizeObserver' in window) {
        let t = 0;
        new ResizeObserver(() => {
          clearTimeout(t);
          t = setTimeout(() => scheduleRender(entry), 120);
        }).observe(canvas);
      } else {
        window.addEventListener('resize', () => scheduleRender(entry));
      }
    });

    /* ----- hero: the light follows the pointer ----- */
    const heroCanvas = document.querySelector('.hero-plate canvas');
    if (heroCanvas && plates.has(heroCanvas)) {
      const entry = plates.get(heroCanvas);
      let target = null;
      const setFromPointer = (e) => {
        const r = heroCanvas.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        if (dx * dx + dy * dy > 25) {
          target = (Math.atan2(-dy, dx) * 180) / Math.PI;
          if (target < 0) target += 360;
        }
      };
      heroCanvas.addEventListener('pointermove', setFromPointer);
      heroCanvas.addEventListener('pointerleave', () => { target = null; });
      if (!reduced.matches) {
        let last = 0;
        const tick = (ts) => {
          if (entry.inView && ts - last > 42) {
            last = ts;
            const idle = 135 + 14 * Math.sin(ts / 9000);
            const goal = target == null ? idle : target;
            const cur = entry.opts.light == null ? 135 : entry.opts.light;
            let diff = goal - cur;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;
            entry.opts.light = (cur + diff * 0.08 + 360) % 360;
            renderPlate(entry);
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }

    /* ----- the line-up: one exposure slider, five plates ----- */
    const luSlider = document.getElementById('lu-exposure');
    const luOut = document.getElementById('lu-exposure-value');
    if (luSlider) {
      const apply = () => {
        const ev = parseFloat(luSlider.value);
        if (luOut) luOut.textContent = (ev >= 0 ? '+' : '') + ev.toFixed(2) + '\u00A0EV';
        document.querySelectorAll('.lu-row canvas').forEach((c) => {
          const entry = plates.get(c);
          if (entry) { entry.opts.exposure = ev; scheduleRender(entry); }
        });
      };
      luSlider.addEventListener('input', apply);
    }

    /* ----- the plate room ----- */
    const prCanvas = document.getElementById('plate-canvas');
    const readout = document.getElementById('plate-readout');
    if (prCanvas && plates.has(prCanvas)) {
      const entry = plates.get(prCanvas);
      const el = {
        scene: document.getElementById('ctl-scene'),
        algo: document.getElementById('ctl-algo'),
        grain: document.getElementById('ctl-grain'),
        shades: document.getElementById('ctl-shades'),
        light: document.getElementById('ctl-light'),
        ev: document.getElementById('ctl-ev'),
        oGrain: document.getElementById('out-grain'),
        oShades: document.getElementById('out-shades'),
        oLight: document.getElementById('out-light'),
        oEv: document.getElementById('out-ev')
      };

      const grainWord = (c) =>
        c <= 2.5 ? 'very fine' : c <= 3.5 ? 'fine' : c <= 5 ? 'medium' : c <= 6.5 ? 'coarse' : 'very coarse';
      const sceneNames = { ramp: 'Gradient ramp', sphere: 'Sphere', moon: 'Moon', waves: 'Open sea', terrain: 'Hill country' };
      const algoNames = {
        threshold: 'Threshold', bayer2: 'Bayer 2\u00D72', bayer4: 'Bayer 4\u00D74', bayer8: 'Bayer 8\u00D78',
        cluster8: 'Clustered dot', noise: 'White noise', blue: 'Blue noise',
        floyd: 'Floyd\u2013Steinberg', atkinson: 'Atkinson', sierra: 'Sierra Lite'
      };

      const syncOutputs = () => {
        const cell = parseFloat(el.grain.value);
        const shades = parseInt(el.shades.value, 10);
        const light = parseInt(el.light.value, 10);
        const ev = parseFloat(el.ev.value);
        el.oGrain.textContent = grainWord(cell) + ' \u00B7 ' + cell + 'px';
        el.oShades.textContent = shades === 2 ? '2 \u2014 pure black & white' : String(shades);
        el.oLight.textContent = light + '\u00B0';
        el.oEv.textContent = (ev >= 0 ? '+' : '') + ev.toFixed(2) + '\u00A0EV';
      };

      const updateReadout = () => {
        if (!readout) return;
        const cell = parseFloat(el.grain.value);
        const shades = parseInt(el.shades.value, 10);
        const light = parseInt(el.light.value, 10);
        const ev = parseFloat(el.ev.value);
        readout.textContent =
          'Plate 88 \u00B7 ' + sceneNames[el.scene.value] + ' \u00D7 ' + algoNames[el.algo.value] +
          ' \u00B7 ' + shades + ' shades \u00B7 grain ' + grainWord(cell) +
          ' \u00B7 light ' + light + '\u00B0 \u00B7 ' + (ev >= 0 ? '+' : '') + ev.toFixed(2) + '\u00A0EV';
      };

      const apply = () => {
        entry.opts.scene = el.scene.value;
        entry.opts.algo = el.algo.value;
        entry.opts.cell = parseFloat(el.grain.value);
        entry.opts.levels = parseInt(el.shades.value, 10);
        entry.opts.light = parseInt(el.light.value, 10);
        entry.opts.exposure = parseFloat(el.ev.value);
        syncOutputs();
        updateReadout();
        scheduleRender(entry);
      };

      [el.scene, el.algo].forEach((s) => s.addEventListener('change', apply));
      [el.grain, el.shades, el.light, el.ev].forEach((s) => s.addEventListener('input', apply));

      document.getElementById('ctl-reseed').addEventListener('click', () => {
        entry.opts.seed = 1 + Math.floor(Math.random() * 999983);
        apply();
      });

      document.getElementById('ctl-download').addEventListener('click', () => {
        const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        const name = 'grain-plate-' + slug(el.scene.value) + '-' + slug(el.algo.value) +
          '-' + el.shades.value + 'shades.png';
        const save = (url) => {
          const a = document.createElement('a');
          a.href = url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          if (url.indexOf('blob:') === 0) setTimeout(() => URL.revokeObjectURL(url), 5000);
        };
        if (prCanvas.toBlob) {
          prCanvas.toBlob((b) => { if (b) save(URL.createObjectURL(b)); }, 'image/png');
        } else {
          save(prCanvas.toDataURL('image/png'));
        }
      });

      syncOutputs();
      updateReadout();

      /* specimens offer themselves to the press */
      document.querySelectorAll('[data-open-plate]').forEach((btn) => {
        btn.addEventListener('click', () => {
          el.scene.value = btn.dataset.scene;
          el.algo.value = btn.dataset.algo;
          apply();
          const room = document.getElementById('plate-room');
          room.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
          room.focus({ preventScroll: true });
        });
      });
    }

    /* ----- theme toggle ----- */
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      const root = document.documentElement;
      const paint = () => {
        const dark = root.dataset.theme === 'dark';
        toggle.setAttribute('aria-pressed', String(dark));
      };
      paint();
      toggle.addEventListener('click', () => {
        root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem('grain-theme', root.dataset.theme); } catch (e) { /* private mode */ }
        paint();
      });
    }

    /* ----- scroll spy ----- */
    const links = document.querySelectorAll('.site-nav a[data-spy]');
    if (links.length && 'IntersectionObserver' in window) {
      const setCurrent = (id) => {
        links.forEach((a) => {
          if (a.dataset.spy === id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      };
      const spy = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) setCurrent(e.target.id); });
      }, { rootMargin: '-40% 0px -55% 0px' });
      document.querySelectorAll('main section[id]').forEach((s) => spy.observe(s));
    }

    /* ----- reveals ----- */
    const revealEls = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !reduced.matches) {
      let batch = 0;
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.style.transitionDelay = (batch % 3) * 70 + 'ms';
            batch++;
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealEls.forEach((el) => el.classList.add('in'));
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDOM);
    } else {
      initDOM();
    }
  }

  /* Exposed for testing outside the browser. */
  globalThis.GRAIN = {
    SCENES, ALGOS, CLUSTER8,
    bayerMatrix, voidAndCluster, blueMatrix,
    quantOrdered, quantStochastic, errDiffuse,
    makeValueNoise, mulberry32, hash2
  };

})();
