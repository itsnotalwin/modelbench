/* ==========================================================================
   Grey Matter — everything on this page that moves or computes.
   No dependencies. No image files. Canvas 2D + SVG.
   ========================================================================== */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var INK = '#101010';
  var PAPER = '#ffffff';
  var NIGHT = '#0e0e0e';
  var NIGHT_INK = '#f2f2f2';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ------------------------------------------------------------------ noise */
  function mulberry32(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function noise1D(seed) {
    var rnd = mulberry32(seed);
    var N = 1024;
    var table = new Float32Array(N);
    for (var i = 0; i < N; i++) table[i] = rnd();
    return function (x) {
      var i = Math.floor(x);
      var f = x - i;
      var i0 = ((i % N) + N) % N;
      var i1 = (((i + 1) % N) + N) % N;
      var s = f * f * f * (f * (f * 6 - 15) + 10);
      return table[i0] + (table[i1] - table[i0]) * s;
    };
  }

  function fbm(noise, x, octaves) {
    var v = 0, amp = 0.5, freq = 1, norm = 0;
    for (var i = 0; i < octaves; i++) {
      v += amp * noise(x * freq);
      norm += amp;
      freq *= 2.07;
      amp *= 0.5;
    }
    return v / norm;
  }

  /* ------------------------------------------------------------------ scene */
  /* One landscape, computed once, sampled by every plate on the page. */
  var SCENE_W = 960;
  var SCENE_H = 600;
  var scene = null;

  function buildScene() {
    var cv = document.createElement('canvas');
    cv.width = SCENE_W;
    cv.height = SCENE_H;
    var g = cv.getContext('2d');
    var W = SCENE_W, H = SCENE_H;

    /* sky — kept light: a coarse screen turns solid black into a dead slab */
    var sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0.00, '#c2c2c2');
    sky.addColorStop(0.20, '#d6d6d6');
    sky.addColorStop(0.36, '#ededed');
    sky.addColorStop(0.48, '#fafafa');
    sky.addColorStop(1.00, '#f4f4f4');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);

    /* sun: halo, disc, a flattened flare */
    var sx = W * 0.66;
    var sy = H * 0.385;
    var halo = g.createRadialGradient(sx, sy, 0, sx, sy, H * 0.52);
    halo.addColorStop(0.00, 'rgba(255,255,255,1)');
    halo.addColorStop(0.05, 'rgba(255,255,255,.94)');
    halo.addColorStop(0.15, 'rgba(255,255,255,.50)');
    halo.addColorStop(0.40, 'rgba(255,255,255,.15)');
    halo.addColorStop(0.74, 'rgba(255,255,255,.04)');
    halo.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = halo;
    g.fillRect(0, 0, W, H);

    g.beginPath();
    g.arc(sx, sy, H * 0.074, 0, TAU);
    g.fillStyle = '#ffffff';
    g.fill();

    g.save();
    g.translate(sx, sy);
    g.scale(1, 0.05);
    var flare = g.createRadialGradient(0, 0, 0, 0, 0, H * 0.6);
    flare.addColorStop(0, 'rgba(255,255,255,.5)');
    flare.addColorStop(0.45, 'rgba(255,255,255,.16)');
    flare.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = flare;
    g.beginPath();
    g.arc(0, 0, H * 0.6, 0, TAU);
    g.fill();
    g.restore();

    /* ridges, far to near. tone is the ink value at the crest. */
    var layers = [
      { y: 0.442, amp: 0.052, tone: 168, freq: 1.2, seed: 11 },
      { y: 0.566, amp: 0.105, tone: 118, freq: 1.7, seed: 23 },
      { y: 0.722, amp: 0.155, tone: 68,  freq: 1.4, seed: 37 },
      { y: 0.940, amp: 0.120, tone: 38,  freq: 1.1, seed: 53 }
    ];

    var step = 2;

    function ridgePath(pts) {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.lineTo(W + 9, H + 10);
      g.lineTo(-9, H + 10);
      g.closePath();
    }

    layers.forEach(function (L, li) {
      var n1 = noise1D(7000 + L.seed);
      var n2 = noise1D(4200 + L.seed * 3);
      var noise = function (u) {
        return fbm(n1, u * L.freq + 0.11 * li, 3) * 0.84 +
               (fbm(n2, u * L.freq * 2.6, 2) - 0.5) * 0.16;
      };

      var pts = [];
      for (var x = -10; x <= W + 10; x += step) {
        var u = x / W;
        pts.push([x, (L.y + (noise(u) - 0.5) * L.amp * 2.4) * H]);
      }

      var t = L.tone;
      var fill = g.createLinearGradient(0, L.y * H - L.amp * H * 2, 0, H);
      fill.addColorStop(0, 'rgb(' + (t + 14) + ',' + (t + 14) + ',' + (t + 14) + ')');
      fill.addColorStop(0.22, 'rgb(' + Math.round(t * 0.9) + ',' + Math.round(t * 0.9) + ',' + Math.round(t * 0.9) + ')');
      fill.addColorStop(1, 'rgb(' + Math.round(t * 0.66) + ',' + Math.round(t * 0.66) + ',' + Math.round(t * 0.66) + ')');

      /* a backlit rim: light spilling over the crest before the ridge is filled */
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (var q = 1; q < pts.length; q++) g.lineTo(pts[q][0], pts[q][1]);
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(255,255,255,' + (0.19 - li * 0.015).toFixed(3) + ')';
      g.lineWidth = 18;
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,' + (0.34 - li * 0.025).toFixed(3) + ')';
      g.lineWidth = 8;
      g.stroke();

      ridgePath(pts);
      g.fillStyle = fill;
      g.fill();

      /* the shadow just below a crest — what makes a ridge read as a shape */
      g.save();
      ridgePath(pts);
      g.clip();
      var sh = g.createLinearGradient(0, L.y * H - L.amp * H * 2.2, 0, L.y * H + H * 0.115);
      sh.addColorStop(0, 'rgba(0,0,0,0)');
      sh.addColorStop(0.34, 'rgba(0,0,0,.22)');
      sh.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = sh;
      g.fillRect(0, 0, W, H);
      g.restore();

      /* sunlit crest */
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (var k = 1; k < pts.length; k++) g.lineTo(pts[k][0], pts[k][1]);
      var rim = Math.min(255, t + 34);
      g.strokeStyle = 'rgba(' + rim + ',' + rim + ',' + rim + ',.62)';
      g.lineWidth = li > 4 ? 1.5 : 1;
      g.stroke();

      /* haze settles in front of the far ridges only */
      if (li === 1) {
        var fog = g.createLinearGradient(0, H * 0.36, 0, H * 0.66);
        fog.addColorStop(0, 'rgba(255,255,255,0)');
        fog.addColorStop(0.45, 'rgba(255,255,255,.16)');
        fog.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = fog;
        g.fillRect(0, H * 0.36, W, H * 0.3);
      }
    });

    /* vignette, gentle */
    var vig = g.createRadialGradient(W * 0.5, H * 0.42, H * 0.34, W * 0.5, H * 0.42, H * 1.0);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,.14)');
    g.fillStyle = vig;
    g.fillRect(0, 0, W, H);

    /* grain, neutral on every channel */
    var img = g.getImageData(0, 0, W, H);
    var d = img.data;
    var gr = mulberry32(20261124);
    for (var p = 0; p < d.length; p += 4) {
      var n = (gr() - 0.5) * 7;
      d[p] += n; d[p + 1] += n; d[p + 2] += n;
    }
    g.putImageData(img, 0, 0);

    return { w: W, h: H, data: d };
  }

  function sampleScene(sc, u, v) {
    var x = clamp(u, 0, 1) * (sc.w - 1);
    var y = clamp(v, 0, 1) * (sc.h - 1);
    var x0 = x | 0, y0 = y | 0;
    var x1 = Math.min(x0 + 1, sc.w - 1);
    var y1 = Math.min(y0 + 1, sc.h - 1);
    var fx = x - x0, fy = y - y0;
    var d = sc.data, w = sc.w;
    var i00 = (y0 * w + x0) * 4, i10 = (y0 * w + x1) * 4;
    var i01 = (y1 * w + x0) * 4, i11 = (y1 * w + x1) * 4;
    var a = d[i00] * (1 - fx) + d[i10] * fx;
    var b = d[i01] * (1 - fx) + d[i11] * fx;
    return (a * (1 - fy) + b * fy) / 255;
  }

  /* ------------------------------------------------------------- halftoning */
  function drawHalftone(g, W, H, opt) {
    var pitch = opt.pitch;
    var angle = opt.angle * Math.PI / 180;
    var ca = Math.cos(angle), sa = Math.sin(angle);
    var cx = W / 2, cy = H / 2;
    var reach = Math.hypot(W, H) * 0.5 + pitch * 2;
    var k = 1 / Math.sqrt(Math.PI * 0.25);   /* area-correct dot radius */

    g.save();
    g.fillStyle = opt.paper;
    g.fillRect(0, 0, W, H);
    g.fillStyle = opt.ink;

    g.beginPath();
    for (var v = -reach; v <= reach; v += pitch) {
      for (var u = -reach; u <= reach; u += pitch) {
        var x = cx + u * ca - v * sa;
        var y = cy + u * sa + v * ca;
        if (x < -pitch || x > W + pitch || y < -pitch || y > H + pitch) continue;

        var lum = sampleScene(scene, x / W, y / H);
        var cover = clamp((1 - lum) * opt.gain, 0, 1);
        var r = pitch * 0.5 * Math.sqrt(cover) * k;
        if (r < 0.16) continue;
        if (r > pitch * 0.82) r = pitch * 0.82;

        g.moveTo(x + r, y);
        g.arc(x, y, r, 0, TAU);
      }
    }
    g.fill();
    g.restore();
  }

  /* ---------------------------------------------------------------- dithers */
  var BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  function ditherBinary(lum, w, h, algo, threshold) {
    var out = new Uint8Array(w * h);
    var t = threshold == null ? 0.5 : threshold;
    var x, y, i, err, old;

    if (algo === 'bayer') {
      for (y = 0; y < h; y++) {
        for (x = 0; x < w; x++) {
          i = y * w + x;
          var m = BAYER4[(y & 3) * 4 + (x & 3)];
          out[i] = lum[i] + (m / 16 - 0.5) * (1 / 8) * 2 > t ? 1 : 0;
        }
      }
      return out;
    }

    var buf = Float32Array.from(lum);
    var reverse = false;

    for (y = 0; y < h; y++) {
      var leftToRight = !(reverse && (algo === 'fs'));
      for (var n = 0; n < w; n++) {
        x = leftToRight ? n : w - 1 - n;
        i = y * w + x;
        old = buf[i];
        var nv = old > t ? 1 : 0;
        out[i] = nv;
        err = old - nv;
        var s = leftToRight ? 1 : -1;

        if (algo === 'fs') {
          if (x + s >= 0 && x + s < w) buf[i + s] += err * 7 / 16;
          if (y + 1 < h) {
            if (x - s >= 0 && x - s < w) buf[i + w - s] += err * 3 / 16;
            buf[i + w] += err * 5 / 16;
            if (x + s >= 0 && x + s < w) buf[i + w + s] += err * 1 / 16;
          }
        } else { /* atkinson: three quarters of the error is discarded */
          var e = err / 8;
          if (x + s >= 0 && x + s < w) buf[i + s] += e;
          if (x + 2 * s >= 0 && x + 2 * s < w) buf[i + 2 * s] += e;
          if (y + 1 < h) {
            if (x - s >= 0 && x - s < w) buf[i + w - s] += e;
            buf[i + w] += e;
            if (x + s >= 0 && x + s < w) buf[i + w + s] += e;
            if (x + 2 * s >= 0 && x + 2 * s < w) buf[i + w + 2 * s] += e;
          }
        }
      }
      reverse = !reverse;
    }
    return out;
  }

  function hexRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }

  function paintBits(bits, w, h, light, dark) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    var img = g.createImageData(w, h);
    var d = img.data;
    var A = hexRgb(light), B = hexRgb(dark);
    for (var i = 0, p = 0; i < bits.length; i++, p += 4) {
      var col = bits[i] ? A : B;
      d[p] = col[0]; d[p + 1] = col[1]; d[p + 2] = col[2]; d[p + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  function drawDither(g, W, H, opt) {
    var cell = Math.max(2, Math.round(opt.pitch));
    var rw = Math.ceil(W / cell);
    var rh = Math.ceil(H / cell);
    if (rw * rh > 260000) { cell *= 2; rw = Math.ceil(W / cell); rh = Math.ceil(H / cell); }

    var lum = new Float32Array(rw * rh);
    for (var y = 0; y < rh; y++) {
      for (var x = 0; x < rw; x++) {
        lum[y * rw + x] = sampleScene(scene, (x + 0.5) / rw, (y + 0.5) / rh);
      }
    }
    var bits = ditherBinary(lum, rw, rh, opt.algo || 'fs', opt.threshold);
    var small = paintBits(bits, rw, rh, opt.light, opt.dark);

    g.save();
    g.imageSmoothingEnabled = false;
    g.drawImage(small, 0, 0, W, H);
    g.restore();
  }

  /* ------------------------------------------------------------- plate 01 */
  var stage = $('#stage');
  var plate = $('#canvas-plate');
  var lens = $('#lens');
  var lensCanvas = $('#canvas-lens');
  var state = { method: 'halftone', angle: 45, pitch: 4, gain: 100 };
  var lensPos = { x: 0, y: 0, active: false };
  var frame = 0;

  function plateGeometry() {
    var cssW = Math.max(240, Math.round(stage.clientWidth));
    var cssH = Math.round(cssW * 5 / 8);
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    return { cssW: cssW, cssH: cssH, scale: dpr };
  }

  function renderPlate() {
    frame = 0;
    if (!scene) return;
    var geo = plateGeometry();
    var w = Math.round(geo.cssW * geo.scale);
    var h = Math.round(geo.cssH * geo.scale);
    if (plate.width !== w || plate.height !== h) {
      plate.width = w;
      plate.height = h;
    }
    var g = plate.getContext('2d');
    g.setTransform(geo.scale, 0, 0, geo.scale, 0, 0);

    /* keep the same number of dots per column as the plate gets narrower */
    var fit = Math.min(1, Math.max(0.55, geo.cssW / 940));
    var pitch = Math.max(2.2, state.pitch * fit);
    var cellPx = Math.max(1, Math.round(pitch * 0.5));

    if (state.method === 'halftone') {
      drawHalftone(g, geo.cssW, geo.cssH, {
        pitch: pitch,
        angle: state.angle,
        gain: state.gain / 100,
        ink: INK,
        light: PAPER,
        paper: PAPER
      });
    } else {
      drawDither(g, geo.cssW, geo.cssH, {
        pitch: cellPx,
        algo: 'fs',
        threshold: 0.5 - (state.gain / 100 - 1) * 0.4,
        light: PAPER,
        dark: INK
      });
    }

    /* header note about the plate */
    plate.setAttribute('aria-label',
      'A greyscale landscape of dunes and a low sun, rendered ' +
      (state.method === 'halftone'
        ? 'as a halftone dot screen at ' + state.angle + ' degrees, ' + state.pitch + ' pixel pitch.'
        : 'as a dithered two-tone image with ' + state.pitch + ' pixel cells.'));

    if (lensPos.active) paintLens();
  }

  function schedulePlate() {
    if (!frame) frame = requestAnimationFrame(renderPlate);
  }

  function paintLens() {
    if (!state || !lensPos.active) return;
    var rect = stage.getBoundingClientRect();
    if (!rect.width) return;
    var z = 3;
    var lensCss = lens.offsetWidth || 168;
    var srcCss = lensCss / z;
    var scale = plate.width / rect.width;

    var sx = (lensPos.x - srcCss / 2) * scale;
    var sy = (lensPos.y - srcCss / 2) * scale;
    var ss = srcCss * scale;
    var lg = lensCanvas.getContext('2d');
    var lw = lensCanvas.width;

    lg.setTransform(1, 0, 0, 1, 0, 0);
    lg.fillStyle = PAPER;
    lg.fillRect(0, 0, lw, lw);
    lg.imageSmoothingEnabled = false;
    lg.drawImage(plate, sx, sy, ss, ss, 0, 0, lw, lw);
  }

  function moveLens(x, y) {
    var rect = stage.getBoundingClientRect();
    lensPos.x = clamp(x, 0, rect.width);
    lensPos.y = clamp(y, 0, rect.height);
    lensPos.active = true;
    stage.classList.add('is-lens');
    lens.style.transform = 'translate3d(' + lensPos.x + 'px,' + lensPos.y + 'px,0)';
    paintLens();
  }

  function hideLens() {
    lensPos.active = false;
    stage.classList.remove('is-lens');
  }

  var readout = $('#plate-readout');
  var readTimer = 0;

  function updateReadout() {
    var txt = state.method === 'halftone'
      ? 'Halftone · round dots · ' + state.angle + '° · ' + state.pitch + ' px pitch · ' + state.gain + ' % gain'
      : 'Dither · Floyd–Steinberg · ' + Math.max(1, Math.round(state.pitch * 0.5)) + ' px cells · ' + state.gain + ' % gain';
    readout.textContent = txt;
  }

  function syncControls() {
    $('#out-angle').textContent = state.angle + '°';
    $('#out-pitch').textContent = state.pitch + ' px';
    $('#out-gain').textContent = state.gain + ' %';
    $$('#angle, #pitch, #gain').forEach(function (el) {
      var min = +el.min, max = +el.max;
      el.style.setProperty('--fill', ((el.value - min) / (max - min) * 100) + '%');
    });
    var dis = state.method === 'dither';
    var angleInput = $('#angle');
    angleInput.disabled = dis;
    angleInput.closest('.control').style.opacity = dis ? '.45' : '1';
    clearTimeout(readTimer);
    readTimer = setTimeout(updateReadout, 420);
  }

  function initPlate() {
    if (!stage || !plate) return;

    var mHalftone = $('#m-halftone');
    var mDither = $('#m-dither');
    [mHalftone, mDither].forEach(function (r) {
      r.addEventListener('change', function () {
        if (!r.checked) return;
        state.method = r.value;
        syncControls();
        schedulePlate();
      });
    });

    ['angle', 'pitch', 'gain'].forEach(function (id) {
      var el = $('#' + id);
      el.addEventListener('input', function () {
        state[id] = +el.value;
        syncControls();
        schedulePlate();
      });
    });

    $('#reset').addEventListener('click', function () {
      state.method = 'halftone';
      state.angle = 45;
      state.pitch = 4;
      state.gain = 100;
      mHalftone.checked = true;
      $('#angle').value = 45;
      $('#pitch').value = 4;
      $('#gain').value = 100;
      syncControls();
      updateReadout();
      schedulePlate();
    });

    stage.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var rect = stage.getBoundingClientRect();
      moveLens(e.clientX - rect.left, e.clientY - rect.top);
    });
    stage.addEventListener('pointerleave', hideLens);

    stage.addEventListener('focus', function () {
      if (lensPos.active) return;
      var rect = stage.getBoundingClientRect();
      moveLens(rect.width * 0.62, rect.height * 0.42);
    });
    stage.addEventListener('blur', hideLens);

    stage.addEventListener('keydown', function (e) {
      var stepPx = e.shiftKey ? 40 : 14;
      var dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -stepPx;
      else if (e.key === 'ArrowRight') dx = stepPx;
      else if (e.key === 'ArrowUp') dy = -stepPx;
      else if (e.key === 'ArrowDown') dy = stepPx;
      else if (e.key === 'Escape') { hideLens(); return; }
      else return;
      e.preventDefault();
      if (!lensPos.active) {
        var r = stage.getBoundingClientRect();
        moveLens(r.width / 2, r.height / 2);
      }
      moveLens(lensPos.x + dx, lensPos.y + dy);
    });

    if ('ResizeObserver' in window) {
      var lastW = 0;
      new ResizeObserver(function (entries) {
        var w = Math.round(entries[0].contentRect.width);
        if (!w || w === lastW) return;
        lastW = w;
        schedulePlate();
      }).observe(stage);
    } else {
      window.addEventListener('resize', schedulePlate);
    }

    syncControls();
    updateReadout();
  }

  /* ------------------------------------------------------------- plate 02 */
  var triptych = [
    { id: 'p-bayer', algo: 'bayer' },
    { id: 'p-fs', algo: 'fs' },
    { id: 'p-atkinson', algo: 'atkinson' }
  ];
  var tripInkOnPaper = false;

  function renderTriptych() {
    if (!scene) return;
    triptych.forEach(function (item) {
      var cv = $('#' + item.id);
      if (!cv) return;
      var w = cv.width, h = cv.height;
      var lum = new Float32Array(w * h);
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          lum[y * w + x] = sampleScene(scene, (x + 0.5) / w, (y + 0.5) / h);
        }
      }
      var bits = ditherBinary(lum, w, h, item.algo, 0.5);
      var light = tripInkOnPaper ? '#ffffff' : NIGHT_INK;
      var dark = tripInkOnPaper ? '#000000' : NIGHT;
      var c = paintBits(bits, w, h, light, dark);
      var g = cv.getContext('2d');
      g.clearRect(0, 0, w, h);
      g.drawImage(c, 0, 0);
    });
  }

  function initTriptych() {
    if (!scene) return;
    var host = $('.triptych');
    if (!host) return;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          renderTriptych();
          io.disconnect();
        });
      }, { rootMargin: '400px 0px' });
      io.observe(host);
    } else {
      renderTriptych();
    }
  }

  /* ---------------------------------------------------------------- moiré */
  function initMoire() {
    var range = $('#moire-angle');
    var out = $('#out-moire');
    var rotor = $('#moire-rotor');
    var status = $('#moire-readout');
    if (!range || !rotor) return;
    var timer = 0;

    function apply(v) {
      rotor.setAttribute('patternTransform', 'rotate(' + v + ' 300 190)');
      out.textContent = v.toFixed(1) + '°';
      range.style.setProperty('--fill', (v / 45 * 100) + '%');
      clearTimeout(timer);
      timer = setTimeout(function () {
        status.textContent = v === 0
          ? 'Screens locked at zero degrees.'
          : 'Screens separated by ' + v.toFixed(1) + ' degrees.';
      }, 380);
    }

    range.addEventListener('input', function () { apply(parseFloat(range.value)); });
    apply(parseFloat(range.value));
  }

  /* ------------------------------------------------------- page furniture */
  function initProgress() {
    var bar = $('#progress-bar');
    if (!bar) return;
    var queued = false;
    function paint() {
      queued = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
    }
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(paint);
    }, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  function initReveals() {
    var items = $$('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  }

  function initPrint() {
    var btn = $('#print');
    if (btn) btn.addEventListener('click', function () { window.print(); });
    window.addEventListener('beforeprint', function () {
      tripInkOnPaper = true;
      renderTriptych();
    });
    window.addEventListener('afterprint', function () {
      tripInkOnPaper = false;
      renderTriptych();
    });
  }

  /* ---------------------------------------------------------------- boot */
  function boot() {
    scene = buildScene();
    initPlate();
    initTriptych();
    initMoire();
    initProgress();
    initReveals();
    initPrint();
    schedulePlate();
  }

  function safeBoot() {
    try {
      boot();
    } catch (err) {
      /* never leave the sheet blank if a canvas call fails */
      $('.reveal').forEach(function (el) { el.classList.add('is-in'); });
      if (window.console && console.error) console.error(err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeBoot);
  } else {
    safeBoot();
  }
})();
