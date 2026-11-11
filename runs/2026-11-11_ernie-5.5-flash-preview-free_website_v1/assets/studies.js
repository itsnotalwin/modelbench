/* ==========================================================================
   Umbra — the twelve plates
   Each study is a pure function of (canvas, width, height, time, params, state).
   Nothing is loaded, nothing is stored. Everything is drawn.
   ========================================================================== */

(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var BG = '#0b0b0b';
  var MONO = 'ui-monospace, Menlo, Consolas, monospace';

  /* ---------------------------------------------------------------- random */

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function ihash(x, y, s) {
    var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function vnoise(x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf);
    var v = yf * yf * (3 - 2 * yf);
    var a = ihash(xi, yi, s), b = ihash(xi + 1, yi, s);
    var c = ihash(xi, yi + 1, s), d = ihash(xi + 1, yi + 1, s);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }

  function fbm(x, y, s) {
    var f = 0, amp = 0.5, fr = 1;
    for (var i = 0; i < 4; i++) {
      f += amp * vnoise(x * fr, y * fr, s + i * 131);
      fr *= 2;
      amp *= 0.5;
    }
    return f / 0.9375;
  }

  function clear(ctx, w, h) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
  }

  var BAYER8 = [
    0, 32, 8, 40, 2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44, 4, 36, 14, 46, 6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
    3, 35, 11, 43, 1, 33, 9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47, 7, 39, 13, 45, 5, 37,
    63, 31, 55, 23, 61, 29, 53, 21
  ];

  /* ---------------------------------------------------------------- plates */

  var STUDIES = [

    /* 01 ---------------------------------------------------------------- */
    {
      id: 'interference',
      num: '01',
      title: 'Interference',
      method: 'Concentric superposition',
      blurb: 'Three ring systems drift across one another at different rates. Where their wavelengths disagree, a fourth pattern appears — one that belongs to neither. The interference is not drawn. It is the only thing that is.',
      init: function () { return {}; },
      draw: function (ctx, w, h, t, p, s) {
        clear(ctx, w, h);
        if (w < 8 || h < 8) return;
        var R = Math.sqrt(w * w + h * h);
        var gap = 11 - p.density * 7;
        var drift = t * 9;
        var cx = [
          w * (0.30 + 0.05 * Math.sin(t * 0.070)),
          w * (0.70 + 0.04 * Math.cos(t * 0.052)),
          w * (0.50 + 0.07 * Math.sin(t * 0.037 + 1.7))
        ];
        var cy = [
          h * (0.42 + 0.05 * Math.cos(t * 0.061)),
          h * (0.58 + 0.06 * Math.sin(t * 0.083)),
          h * (0.26 + 0.05 * Math.cos(t * 0.047))
        ];
        ctx.lineWidth = 1;
        for (var k = 0; k < 3; k++) {
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.26 + k * 0.08).toFixed(3) + ')';
          ctx.beginPath();
          var off = (drift * (0.55 + k * 0.3) + k * 53) % gap;
          for (var r = off; r < R; r += gap) {
            ctx.moveTo(cx[k] + r, cy[k]);
            ctx.arc(cx[k], cy[k], r, 0, TAU);
          }
          ctx.stroke();
        }
        var g = ctx.createRadialGradient(w * 0.5, h * 0.5, R * 0.14, w * 0.5, h * 0.5, R * 0.62);
        g.addColorStop(0, 'rgba(11,11,11,0)');
        g.addColorStop(1, 'rgba(11,11,11,0.72)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    },

    /* 02 ---------------------------------------------------------------- */
    {
      id: 'halftone',
      num: '02',
      title: 'Halftone Field',
      method: 'Noise-modulated dot screen',
      blurb: 'A single value-noise field is cut into a grid of dots. Radius carries the tone, spacing carries the resolution. At any size the image resolves into the same picture, which is the point.',
      init: function () { return {}; },
      draw: function (ctx, w, h, t, p, s) {
        clear(ctx, w, h);
        if (w < 8 || h < 8) return;
        var sp = 26 - p.density * 16;
        var minSp = Math.sqrt((w * h) / 2400);
        if (sp < minSp) sp = minSp;
        var ox = t * 9, oy = -t * 6;
        ctx.fillStyle = '#fff';
        for (var y = sp * 0.5; y < h + sp; y += sp) {
          for (var x = sp * 0.5; x < w + sp; x += sp) {
            var n = fbm((x + ox) * 0.006, (y + oy) * 0.006, s.seed);
            var v = (n - 0.33) * 2.35;
            if (v < 0) v = 0; else if (v > 1) v = 1;
            var r = sp * 0.53 * v;
            if (r > 0.35) {
              ctx.globalAlpha = 0.32 + 0.68 * v;
              ctx.beginPath();
              ctx.arc(x, y, r, 0, TAU);
              ctx.fill();
            }
          }
        }
        ctx.globalAlpha = 1;
      }
    },

    /* 03 ---------------------------------------------------------------- */
    {
      id: 'drift',
      num: '03',
      title: 'Drift',
      method: 'Curl-noise flow field',
      blurb: 'Nine hundred particles are released into a noise field and left to find their own paths. Nothing is steered. The drawing is the sum of small, repeated decisions, made thirty times a second.',
      init: function (w, h, seed) {
        var rnd = mulberry32(seed);
        var n = 900;
        var ps = new Float32Array(n * 2);
        for (var i = 0; i < n; i++) {
          ps[i * 2] = rnd() * w;
          ps[i * 2 + 1] = rnd() * h;
        }
        return { ps: ps, n: n, rnd: rnd };
      },
      draw: function (ctx, w, h, t, p, s) {
        if (w < 8 || h < 8) return;
        ctx.fillStyle = 'rgba(11,11,11,0.075)';
        ctx.fillRect(0, 0, w, h);
        var count = Math.min(s.n, Math.round(280 + p.density * 880));
        var step = 1.15 * Math.min(2.4, (s.dt || 0.033) * 60);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var i = 0; i < count; i++) {
          var x = s.ps[i * 2], y = s.ps[i * 2 + 1];
          var a = fbm(x * 0.0031, y * 0.0031 + t * 0.02, s.seed) * TAU * 2;
          var nx = x + Math.cos(a) * step;
          var ny = y + Math.sin(a) * step;
          ctx.moveTo(x, y);
          ctx.lineTo(nx, ny);
          if (nx < -6 || nx > w + 6 || ny < -6 || ny > h + 6) {
            s.ps[i * 2] = s.rnd() * w;
            s.ps[i * 2 + 1] = s.rnd() * h;
          } else {
            s.ps[i * 2] = nx;
            s.ps[i * 2 + 1] = ny;
          }
        }
        ctx.stroke();
      }
    },

    /* 04 ---------------------------------------------------------------- */
    {
      id: 'ordered',
      num: '04',
      title: 'Ordered',
      method: '8 × 8 Bayer threshold',
      blurb: 'A smooth gradient is reduced to one bit by an ordered matrix. The eye rebuilds the tone from the pattern; the file never stores it. Move the light and watch the threshold travel across the field.',
      init: function () {
        return { off: document.createElement('canvas') };
      },
      draw: function (ctx, w, h, t, p, s) {
        if (w < 8 || h < 8) return;
        var block = Math.max(2, Math.round(7 - p.density * 5));
        var cw = Math.max(1, Math.ceil(w / block));
        var ch = Math.max(1, Math.ceil(h / block));
        if (!s.off || s.off.width !== cw || s.off.height !== ch) {
          s.off.width = cw;
          s.off.height = ch;
          s.octx = s.off.getContext('2d');
          s.img = s.octx.createImageData(cw, ch);
        }
        var d = s.img.data;
        var lx = w * (0.5 + 0.27 * Math.cos(t * 0.33));
        var ly = h * (0.5 + 0.23 * Math.sin(t * 0.26));
        var maxD = Math.sqrt(w * w + h * h) * 0.6;
        for (var y = 0; y < ch; y++) {
          for (var x = 0; x < cw; x++) {
            var px = x * block, py = y * block;
            var v = 1 - Math.sqrt((px - lx) * (px - lx) + (py - ly) * (py - ly)) / maxD;
            v += 0.11 * Math.sin((px + py) * 0.02 - t * 0.55);
            if (v < 0) v = 0; else if (v > 0.999) v = 0.999;
            var th = (BAYER8[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
            var c = v > th ? 255 : 11;
            var i = (y * cw + x) * 4;
            d[i] = c; d[i + 1] = c; d[i + 2] = c; d[i + 3] = 255;
          }
        }
        s.octx.putImageData(s.img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.off, 0, 0, cw, ch, 0, 0, cw * block, ch * block);
        ctx.imageSmoothingEnabled = true;
      }
    },

    /* 05 ---------------------------------------------------------------- */
    {
      id: 'harmonograph',
      num: '05',
      title: 'Harmonograph',
      method: 'Damped harmonic curve',
      blurb: 'Two damped harmonic oscillators, one for each axis. The curve spends its energy slowly, and what remains at the end is a shape no single frequency could describe.',
      init: function () { return {}; },
      draw: function (ctx, w, h, t, p, s) {
        clear(ctx, w, h);
        if (w < 8 || h < 8) return;
        var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.44;
        var damp = 0.004 + p.density * 0.011;
        var f1 = 2.01 + 0.02 * Math.sin(t * 0.11);
        var f2 = 3.02 + 0.02 * Math.cos(t * 0.09);
        var f3 = 1.99 + 0.02 * Math.cos(t * 0.07);
        var f4 = 3.01 + 0.02 * Math.sin(t * 0.13);
        var N = 3200;
        var upto = Math.floor(((t * 0.2) % 1.22) * N);
        if (upto < 2) upto = 2;
        if (upto > N) upto = N;
        ctx.strokeStyle = 'rgba(255,255,255,0.72)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var i = 0; i < upto; i++) {
          var u = (i / N) * 46;
          var e1 = Math.exp(-damp * u * 6);
          var e2 = Math.exp(-damp * u * 7.5);
          var x = cx + R * (0.55 * Math.sin(f1 * u + 1.2) * e1 + 0.45 * Math.sin(f2 * u) * e2);
          var y = cy + R * (0.55 * Math.sin(f3 * u + 2.1) * e1 + 0.45 * Math.sin(f4 * u + 0.4) * e2);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },

    /* 06 ---------------------------------------------------------------- */
    {
      id: 'phyllotaxis',
      num: '06',
      title: 'Phyllotaxis',
      method: 'Golden-angle seed packing',
      blurb: 'Seeds are placed at the golden angle, 137.5°. The packing is as tight as a circle allows, and the eye reads the spiral arms that the maths never drew.',
      init: function () { return {}; },
      draw: function (ctx, w, h, t, p, s) {
        clear(ctx, w, h);
        if (w < 8 || h < 8) return;
        var cx = w / 2, cy = h / 2;
        var N = Math.round(600 + p.density * 1500);
        var c = (Math.min(w, h) * 0.47) / Math.sqrt(N);
        var rot = t * 0.1;
        var GA = Math.PI * (3 - Math.sqrt(5));
        ctx.fillStyle = '#fff';
        for (var i = 0; i < N; i++) {
          var a = i * GA + rot;
          var r = c * Math.sqrt(i);
          var x = cx + Math.cos(a) * r;
          var y = cy + Math.sin(a) * r * 0.98;
          var tw = 0.5 + 0.5 * Math.sin(i * 0.055 - t * 1.7);
          var size = (0.7 + 2.1 * (i / N)) * (0.55 + 0.75 * tw);
          ctx.globalAlpha = 0.22 + 0.78 * tw;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    },

    /* 07 ---------------------------------------------------------------- */
    {
      id: 'contours',
      num: '07',
      title: 'Contours',
      method: 'Marching squares',
      blurb: 'A scalar field is cut into contour lines at regular intervals, the way a mapmaker cuts a hillside. Each level is a promise that the ground beneath it is level too.',
      init: function () { return {}; },
      draw: function (ctx, w, h, t, p, s) {
        clear(ctx, w, h);
        if (w < 8 || h < 8) return;
        var step = 14;
        var cols = Math.max(2, Math.ceil(w / step) + 1);
        var rows = Math.max(2, Math.ceil(h / step) + 1);
        if (!s.vals || s.vals.length !== cols * rows) s.vals = new Float32Array(cols * rows);
        if (!s.px) s.px = new Float32Array(8);
        var V = s.vals, PX = s.px;
        for (var j = 0; j < rows; j++) {
          var y = j * step;
          for (var i = 0; i < cols; i++) {
            var x = i * step;
            V[j * cols + i] = fbm(x * 0.0072, y * 0.0072 + t * 0.02, s.seed) * 0.78 +
              0.22 * (0.5 + 0.5 * Math.sin(x * 0.016 + t * 0.35) * Math.cos(y * 0.019 - t * 0.22));
          }
        }
        var levels = 6 + Math.round(p.density * 8);
        ctx.lineWidth = 1;
        for (var L = 1; L <= levels; L++) {
          var th = L / (levels + 1);
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.2 + 0.5 * (L / levels)).toFixed(3) + ')';
          ctx.beginPath();
          for (var jj = 0; jj < rows - 1; jj++) {
            for (var ii = 0; ii < cols - 1; ii++) {
              var v0 = V[jj * cols + ii];
              var v1 = V[jj * cols + ii + 1];
              var v2 = V[(jj + 1) * cols + ii + 1];
              var v3 = V[(jj + 1) * cols + ii];
              var x0 = ii * step, y0 = jj * step;
              var n = 0;
              if ((v0 < th) !== (v1 < th)) { PX[0] = x0 + step * (th - v0) / (v1 - v0); PX[1] = y0; n = 1; }
              if ((v1 < th) !== (v2 < th)) { PX[n * 2] = x0 + step; PX[n * 2 + 1] = y0 + step * (th - v1) / (v2 - v1); n++; }
              if ((v3 < th) !== (v2 < th)) { PX[n * 2] = x0 + step * (th - v3) / (v2 - v3); PX[n * 2 + 1] = y0 + step; n++; }
              if ((v0 < th) !== (v3 < th)) { PX[n * 2] = x0; PX[n * 2 + 1] = y0 + step * (th - v0) / (v3 - v0); n++; }
              if (n === 2) {
                ctx.moveTo(PX[0], PX[1]);
                ctx.lineTo(PX[2], PX[3]);
              } else if (n === 4) {
                ctx.moveTo(PX[0], PX[1]);
                ctx.lineTo(PX[2], PX[3]);
                ctx.moveTo(PX[4], PX[5]);
                ctx.lineTo(PX[6], PX[7]);
              }
            }
          }
          ctx.stroke();
        }
      }
    },

    /* 08 ---------------------------------------------------------------- */
    {
      id: 'rule30',
      num: '08',
      title: 'Rule 30',
      method: 'One-dimensional automaton',
      blurb: 'Rule 30 takes one row of cells and produces the next. From a single black pixel, a wedge of apparent randomness. The pattern is deterministic; only our reading of it is not.',
      init: function (w, h, seed) {
        var cell = 2;
        var cols = Math.max(2, Math.floor(w / cell));
        var rows = Math.max(2, Math.floor(h / cell));
        var off = document.createElement('canvas');
        off.width = cols;
        off.height = rows;
        var octx = off.getContext('2d');
        octx.fillStyle = BG;
        octx.fillRect(0, 0, cols, rows);
        var state = new Uint8Array(cols);
        state[cols >> 1] = 1;
        return { cell: cell, cols: cols, rows: rows, off: off, octx: octx, state: state, next: new Uint8Array(cols), y: 0 };
      },
      draw: function (ctx, w, h, t, p, s) {
        if (w < 8 || h < 8) return;
        var gens = 1 + Math.round(p.density * 3);
        for (var g = 0; g < gens; g++) {
          if (s.y >= s.rows) {
            s.octx.fillStyle = BG;
            s.octx.fillRect(0, 0, s.cols, s.rows);
            s.state.fill(0);
            s.state[s.cols >> 1] = 1;
            s.y = 0;
          }
          var st = s.state, nx = s.next;
          for (var i = 0; i < s.cols; i++) {
            var l = st[(i - 1 + s.cols) % s.cols];
            var c = st[i];
            var r = st[(i + 1) % s.cols];
            nx[i] = l ^ (c | r);
          }
          st.set(nx);
          s.octx.fillStyle = '#fff';
          for (var k = 0; k < s.cols; k++) {
            if (st[k]) s.octx.fillRect(k, s.y, 1, 1);
          }
          s.y++;
        }
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(s.off, 0, 0, s.cols, s.rows, 0, 0, s.cols * s.cell, s.rows * s.cell);
        ctx.imageSmoothingEnabled = true;
      }
    },

    /* 09 ---------------------------------------------------------------- */
    {
      id: 'slit',
      num: '09',
      title: 'Slit',
      method: 'Stacked sine scan',
      blurb: 'Ninety sine waves, each a little out of phase with its neighbour. The banding is the sum of small differences — a moiré made of time rather than space.',
      init: function () { return {}; },
      draw: function (ctx, w, h, t, p, s) {
        clear(ctx, w, h);
        if (w < 8 || h < 8) return;
        var n = Math.round(28 + p.density * 84);
        ctx.lineWidth = 1;
        for (var i = 0; i < n; i++) {
          var y0 = ((i + 0.5) * h) / n;
          var env = Math.sin((i / n) * Math.PI);
          var amp = h * 0.1 * env * (0.5 + 0.5 * Math.sin(i * 0.19 + t * 0.5));
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.14 + 0.62 * env).toFixed(3) + ')';
          ctx.beginPath();
          for (var x = 0; x <= w; x += 6) {
            var y = y0 +
              Math.sin(x * 0.011 + i * 0.16 + t * 0.9) * amp +
              Math.sin(x * 0.0035 - t * 0.35) * amp * 0.6;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    },

    /* 10 ---------------------------------------------------------------- */
    {
      id: 'glyphs',
      num: '10',
      title: 'Glyphs',
      method: 'Typographic density field',
      blurb: 'A density field selects glyphs from a fixed alphabet and sets them at a size the field allows. Typography becomes texture. The text says nothing, which is the difficulty.',
      init: function () { return {}; },
      draw: function (ctx, w, h, t, p, s) {
        clear(ctx, w, h);
        if (w < 8 || h < 8) return;
        var ALPHA = 'UMBRA0123456789/·—+*';
        var sp = 44 - p.density * 24;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        for (var y = sp * 0.6; y < h; y += sp) {
          for (var x = sp * 0.6; x < w; x += sp) {
            var n = fbm((x + t * 9) * 0.0072, (y - t * 5) * 0.0072, s.seed);
            if (n < 0.4) continue;
            var idx = Math.floor(n * 131) % ALPHA.length;
            ctx.font = '600 ' + (8 + n * 19).toFixed(1) + 'px ' + MONO;
            ctx.globalAlpha = 0.18 + 0.82 * Math.min(1, (n - 0.4) * 3);
            ctx.fillText(ALPHA.charAt(idx), x, y);
          }
        }
        ctx.globalAlpha = 1;
      }
    },

    /* 11 ---------------------------------------------------------------- */
    {
      id: 'moire',
      num: '11',
      title: 'Moiré',
      method: 'Two gratings, one angle apart',
      blurb: 'Two line gratings, rotated a few degrees apart. The beat frequency between them is far coarser than either pattern, and it is the only thing large enough to see.',
      init: function () { return {}; },
      draw: function (ctx, w, h, t, p, s) {
        clear(ctx, w, h);
        if (w < 8 || h < 8) return;
        var R = Math.sqrt(w * w + h * h);
        var gap = 9 - p.density * 5;
        var a1 = -0.36 + Math.sin(t * 0.05) * 0.13;
        var a2 = 0.36 + Math.cos(t * 0.041) * 0.13;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = 1;
        for (var k = 0; k < 2; k++) {
          ctx.save();
          ctx.rotate(k ? a2 : a1);
          var off = (t * (k ? 6 : -4.5)) % gap;
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.beginPath();
          for (var r = -R; r < R; r += gap) {
            var y = r + off;
            ctx.moveTo(-R, y);
            ctx.lineTo(R, y);
          }
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
        var g = ctx.createRadialGradient(w * 0.5, h * 0.5, R * 0.12, w * 0.5, h * 0.5, R * 0.6);
        g.addColorStop(0, 'rgba(11,11,11,0)');
        g.addColorStop(1, 'rgba(11,11,11,0.7)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    },

    /* 12 ---------------------------------------------------------------- */
    {
      id: 'sphere',
      num: '12',
      title: 'Sphere',
      method: 'Lambert shading, halftoned',
      blurb: 'A sphere lit by a moving lamp, then reduced to a dot screen. The halftone is the shading. Move the light and the surface turns, though the geometry never changes.',
      init: function () { return {}; },
      draw: function (ctx, w, h, t, p, s) {
        clear(ctx, w, h);
        if (w < 8 || h < 8) return;
        var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.43;
        var sp = 16 - p.density * 9;
        var lx = Math.cos(t * 0.4);
        var ly = -0.34 + 0.24 * Math.sin(t * 0.31);
        var lz = 0.76;
        var ll = Math.sqrt(lx * lx + ly * ly + lz * lz);
        ctx.fillStyle = '#fff';
        for (var y = -R; y <= R; y += sp) {
          for (var x = -R; x <= R; x += sp) {
            var r2 = (x * x + y * y) / (R * R);
            if (r2 > 1) continue;
            var z = Math.sqrt(1 - r2);
            var lam = (x / R * lx + y / R * ly + z * lz) / ll;
            if (lam < 0) lam = 0; else if (lam > 1) lam = 1;
            var rad = sp * 0.64 * Math.pow(lam, 0.85);
            if (rad < 0.3) continue;
            ctx.globalAlpha = 0.2 + 0.8 * lam;
            ctx.beginPath();
            ctx.arc(cx + x, cy + y, rad, 0, TAU);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }
    }
  ];

  global.UMBRA_STUDIES = STUDIES;
  global.UMBRA_BAYER = BAYER8;
})(window);