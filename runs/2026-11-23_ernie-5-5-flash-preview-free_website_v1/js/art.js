/* ═══════════════════════════════════════════════════════════════
   PENUMBRA — drawing engine
   Every mark on the site is produced here, at runtime.
   No images, no dependencies, monochrome only.
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;

  /* ── deterministic randomness ─────────────────────────────── */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ── seeded value/perlin noise ────────────────────────────── */
  function makeNoise(seed) {
    var rand = mulberry32(seed >>> 0);
    var p = new Uint8Array(256);
    var i, j, tmp;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) {
      j = Math.floor(rand() * (i + 1));
      tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    var perm = new Uint8Array(512);
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function grad(hash, x, y) {
      switch (hash & 3) {
        case 0: return x + y;
        case 1: return -x + y;
        case 2: return x - y;
        default: return -x - y;
      }
    }

    return function (x, y) {
      var X = Math.floor(x) & 255;
      var Y = Math.floor(y) & 255;
      var fx = x - Math.floor(x);
      var fy = y - Math.floor(y);
      var u = fade(fx);
      var v = fade(fy);
      var A = perm[X] + Y;
      var B = perm[X + 1] + Y;
      return lerp(
        lerp(grad(perm[A], fx, fy), grad(perm[B], fx - 1, fy), u),
        lerp(grad(perm[A + 1], fx, fy - 1), grad(perm[B + 1], fx - 1, fy - 1), u),
        v
      );
    };
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ── ink helper: monochrome only ──────────────────────────── */
  function ink(o, alpha) {
    var a = clamp(alpha * (o.contrast || 1), 0, 1);
    return o.invert ? 'rgba(12,12,12,' + a.toFixed(4) + ')' : 'rgba(246,246,246,' + a.toFixed(4) + ')';
  }

  /* ── 01 · contour ─────────────────────────────────────────── */
  function contour(ctx, w, h, o) {
    var lines = Math.round(38 + 16 * clamp(o.scale, 0.5, 2));
    var amp = h * 0.085 * o.scale;
    var freq = 0.0017 / o.scale;
    var i, x, p, baseY, n, y;
    ctx.lineWidth = 1;
    for (i = 0; i < lines; i++) {
      p = lines === 1 ? 0.5 : i / (lines - 1);
      baseY = h * (0.06 + p * 0.88);
      ctx.beginPath();
      for (x = -12; x <= w + 12; x += 3) {
        n = o.noise(x * freq, p * 3.4 + 11.7);
        y = baseY + n * amp * (0.35 + p * 1.05);
        if (x === -12) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      var edge = 1 - Math.abs(p - 0.5) * 1.35;
      ctx.strokeStyle = ink(o, 0.1 + 0.52 * clamp(edge, 0, 1));
      ctx.stroke();
    }
  }

  /* ── 02 · halftone ────────────────────────────────────────── */
  function halftone(ctx, w, h, o) {
    var gap = Math.max(5, 13 / o.scale);
    var x, y, n, v, r;
    ctx.fillStyle = ink(o, 0.9);
    for (y = gap * 0.5; y < h + gap; y += gap) {
      for (x = gap * 0.5; x < w + gap; x += gap) {
        n = o.noise(x * 0.0042 * o.scale, y * 0.0042 * o.scale);
        v = clamp((n * 0.5 + 0.5) * 1.25 - 0.12, 0, 1);
        r = v * gap * 0.72;
        if (r < 0.28) continue;
        ctx.globalAlpha = clamp(0.25 + v * 0.85, 0, 1) * (o.invert ? 0.9 : 1);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ── 03 · weave ───────────────────────────────────────────── */
  function weave(ctx, w, h, o) {
    var n = Math.round(72 + 60 * clamp(o.scale, 0.5, 2));
    var i, y, x, dx, a, t, x0, yy;
    for (i = 0; i < n; i++) {
      t = i / n;
      x0 = t * w;
      a = 0.05 + 0.6 * (o.noise(i * 0.085 * o.scale, 3.1) * 0.5 + 0.5);
      ctx.beginPath();
      for (y = -10; y <= h + 10; y += 7) {
        dx = Math.sin(y * 0.0055 + i * 0.32) * (2 + 7 * (o.noise(i * 0.11, y * 0.0022) * 0.5 + 0.5));
        if (y === -10) ctx.moveTo(x0 + dx, y); else ctx.lineTo(x0 + dx, y);
      }
      ctx.lineWidth = (i % 9 === 0) ? 2 : 1;
      ctx.strokeStyle = ink(o, a * (i % 9 === 0 ? 1 : 0.72));
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    for (i = 1; i < 5; i++) {
      yy = (h / 5) * i + o.noise(i * 4.4, 8.2) * h * 0.05;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
      ctx.strokeStyle = ink(o, 0.14);
      ctx.stroke();
    }
  }

  /* ── 04 · orbit ───────────────────────────────────────────── */
  function orbit(ctx, w, h, o) {
    var cx = w * 0.5;
    var cy = h * 0.5;
    var rings = Math.round(52 + 34 * clamp(o.scale, 0.5, 2));
    var maxR = Math.sqrt(w * w + h * h) * 0.5;
    var i, p, rx, ry, rot, a0, a1;
    for (i = 0; i < rings; i++) {
      p = i / rings;
      rx = w * 0.06 + p * w * 0.54;
      ry = rx * (0.22 + 0.66 * Math.pow(o.noise(i * 0.058, 1.7) * 0.5 + 0.5, 1.4));
      rot = o.noise(i * 0.041, 4.2) * Math.PI;
      a0 = o.noise(i * 0.07, 9.1) * TAU;
      a1 = a0 + TAU * (0.55 + 0.45 * (o.noise(i * 0.05, 2.6) * 0.5 + 0.5));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(rx, 1), Math.max(ry, 1), 0, a0, a1);
      ctx.lineWidth = (i % 11 === 0) ? 1.6 : 0.9;
      ctx.strokeStyle = ink(o, 0.08 + 0.42 * (1 - p));
      ctx.stroke();
      ctx.restore();
      if (i % 6 === 0 && maxR > 0) {
        var ex = cx + Math.cos(a0) * rx * Math.cos(rot) - Math.sin(a0) * ry * Math.sin(rot);
        var ey = cy + Math.cos(a0) * rx * Math.sin(rot) + Math.sin(a0) * ry * Math.cos(rot);
        ctx.beginPath();
        ctx.arc(ex, ey, 1.4, 0, TAU);
        ctx.fillStyle = ink(o, 0.5 * (1 - p) + 0.1);
        ctx.fill();
      }
    }
  }

  /* ── 05 · strata (ordered dither) ─────────────────────────── */
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var offCanvas = null;

  function strata(ctx, w, h, o) {
    var div = 6 / clamp(o.scale, 0.5, 2);
    var cw = Math.max(8, Math.round(w / div));
    var ch = Math.max(8, Math.round(h / div));

    if (!offCanvas) offCanvas = document.createElement('canvas');
    if (offCanvas.width !== cw || offCanvas.height !== ch) {
      offCanvas.width = cw;
      offCanvas.height = ch;
    }
    var octx = offCanvas.getContext('2d');
    var img = octx.createImageData(cw, ch);
    var data = img.data;
    var x, y, k, v, amp, f, tot, t, on, g, idx;

    for (y = 0; y < ch; y++) {
      for (x = 0; x < cw; x++) {
        v = 0; amp = 1; f = 0.013 * o.scale; tot = 0;
        for (k = 0; k < 5; k++) {
          v += amp * o.noise(x * f, y * f + k * 7.3);
          tot += amp;
          f *= 2.03;
          amp *= 0.5;
        }
        v = v / tot * 0.5 + 0.5;
        v = clamp(v * 0.78 + (1 - y / ch) * 0.42 - 0.08, 0, 1);
        t = (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
        on = v > t;
        g = o.invert ? (on ? 14 : 244) : (on ? 244 : 14);
        idx = (y * cw + x) * 4;
        data[idx] = g;
        data[idx + 1] = g;
        data[idx + 2] = g;
        data[idx + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(offCanvas, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
  }

  /* ── 06 · aperture ────────────────────────────────────────── */
  function aperture(ctx, w, h, o) {
    var cx = w * 0.5;
    var cy = h * 0.5;
    var rings = Math.round(26 + 22 * clamp(o.scale, 0.5, 2));
    var maxR = Math.sqrt(w * w + h * h) * 0.54;
    var steps = 190;
    var i, s, a, p, baseR, n, r, x, y;
    for (i = 1; i <= rings; i++) {
      p = i / rings;
      baseR = p * maxR;
      ctx.beginPath();
      for (s = 0; s <= steps; s++) {
        a = (s / steps) * TAU;
        n = o.noise(Math.cos(a) * 1.55 + i * 0.105, Math.sin(a) * 1.55 + i * 0.072);
        r = baseR + n * maxR * 0.048 * (0.28 + p);
        x = cx + Math.cos(a) * r;
        y = cy + Math.sin(a) * r;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.lineWidth = (i % 8 === 0) ? 1.5 : 0.8;
      ctx.strokeStyle = ink(o, 0.1 + 0.5 * (1 - p));
      ctx.stroke();
    }
  }

  /* ── 00 · field (hero, animated) ──────────────────────────── */
  function field(ctx, w, h, o, t) {
    var gap = 13;
    var tt = t * 0.00007;
    var cx = w * 0.5;
    var cy = h * 0.44;
    var maxD = Math.sqrt(cx * cx + cy * cy) || 1;
    var x, y, n, r, dx, dy, fall, v;
    ctx.fillStyle = '#ffffff';
    for (y = gap * 0.5; y < h + gap; y += gap) {
      for (x = gap * 0.5; x < w + gap; x += gap) {
        n = o.noise(x * 0.0021, y * 0.0021 + tt) * 0.5 + 0.5;
        dx = (x - cx) / maxD;
        dy = (y - cy) / maxD;
        fall = 1 - Math.min(1, Math.sqrt(dx * dx + dy * dy) * 0.9);
        v = n * (0.5 + 0.85 * fall);
        r = Math.max(0, v - 0.33) * 9.5;
        if (r < 0.35) continue;
        ctx.globalAlpha = Math.min(1, 0.07 + Math.pow(clamp(v, 0, 1), 2) * 0.9);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ── registry ─────────────────────────────────────────────── */
  var MODES = {
    contour: contour,
    halftone: halftone,
    weave: weave,
    orbit: orbit,
    strata: strata,
    aperture: aperture,
    field: field
  };

  var LABELS = {
    contour: 'Contour — a field of drifting horizontal lines.',
    halftone: 'Halftone — a dot grid swelling and thinning like weather.',
    weave: 'Weave — vertical filaments bent by a slow current.',
    orbit: 'Orbit — nested ellipses crossing at odd angles.',
    strata: 'Strata — ordered dithering of a layered noise field.',
    aperture: 'Aperture — concentric rings pulled off centre.',
    field: 'Field — a breathing grid of points.'
  };

  /* ── public ───────────────────────────────────────────────── */
  global.Art = {
    modes: Object.keys(MODES).filter(function (k) { return k !== 'field'; }),
    label: function (m) { return LABELS[m] || 'Generative drawing.'; },

    /* Build a reusable option set for one seed. */
    setup: function (seed, opts) {
      var s = (seed >>> 0) || 1;
      return {
        noise: makeNoise(s),
        rand: mulberry32(s ^ 0x9e3779b9),
        seed: s,
        scale: (opts && opts.scale) || 1,
        contrast: (opts && opts.contrast) || 1,
        invert: !!(opts && opts.invert)
      };
    },

    /* Draw one complete frame. */
    draw: function (ctx, w, h, mode, opts, timeMs) {
      var fn = MODES[mode];
      if (!fn) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      if (mode === 'field') fn(ctx, w, h, opts, timeMs || 0);
      else fn(ctx, w, h, opts);
      ctx.restore();
      ctx.globalAlpha = 1;
    },

    /* Does this mode animate? */
    animated: function (mode) { return mode === 'field'; },

    /* Fit a canvas to its CSS box; returns pixel size. */
    fit: function (canvas, maxDpr) {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(global.devicePixelRatio || 1, maxDpr || 2);
      var w = Math.max(1, Math.round(rect.width * dpr));
      var h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      return { w: w, h: h, dpr: dpr };
    }
  };
})(window);