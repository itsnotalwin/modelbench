/* GRAIN — all imagery is generated at runtime with the Canvas 2D API. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LIGHT = '#f2f2f2';
  var DARK = '#0a0a0a';

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeNoise(rng) {
    var p = new Uint8Array(512);
    var i, j, t;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) {
      j = Math.floor(rng() * (i + 1));
      t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (i = 0; i < 256; i++) p[i + 256] = p[i];

    function fade(x) { return x * x * x * (x * (x * 6 - 15) + 10); }
    function grad(h, x, y) {
      h &= 3;
      return ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
    }
    function lerp(a, b, k) { return a + (b - a) * k; }

    return function (x, y) {
      var X = Math.floor(x) & 255;
      var Y = Math.floor(y) & 255;
      x -= Math.floor(x);
      y -= Math.floor(y);
      var u = fade(x), v = fade(y);
      var aa = p[p[X] + Y], ab = p[p[X] + Y + 1];
      var ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
      return lerp(
        lerp(grad(aa, x, y), grad(ba, x - 1, y), u),
        lerp(grad(ab, x, y - 1), grad(bb, x - 1, y - 1), u),
        v
      );
    };
  }

  function surface(canvas) {
    if (!canvas) return null;
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, rect.width);
    var h = Math.max(1, rect.height);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pw = Math.max(1, Math.round(w * dpr));
    var ph = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'butt';
    return { ctx: ctx, w: w, h: h };
  }

  /* --- Plate algorithms ------------------------------------------------- */

  function halftone(ctx, w, h, rng) {
    ctx.fillStyle = DARK;
    ctx.fillRect(0, 0, w, h);
    var s = Math.min(w, h);
    var cx = w / 2, cy = h / 2, radius = s * 0.415;
    var step = Math.max(4, s / 56);
    ctx.fillStyle = LIGHT;
    for (var y = step / 2; y < h; y += step) {
      for (var x = step / 2; x < w; x += step) {
        var dx = (x - cx) / radius, dy = (y - cy) / radius;
        var d = Math.hypot(dx, dy);
        if (d > 1) continue;
        var light = Math.max(0, (1 - d) * 0.82 + (-dy) * 0.22 + (rng() - 0.5) * 0.1);
        var r = Math.min(step * 0.54, light * step * 0.56);
        if (r > 0.15) {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.strokeStyle = 'rgba(242,242,242,0.26)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  function interference(ctx, w, h, rng) {
    ctx.fillStyle = DARK;
    ctx.fillRect(0, 0, w, h);
    var s = Math.min(w, h);
    var gap = Math.max(3, s / 118);
    var reach = Math.hypot(w, h) * 0.75;
    var a = 0.10 + rng() * 0.07;
    var b = -0.09 - rng() * 0.06;

    function comb(angle, alpha, shift) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(angle);
      ctx.strokeStyle = 'rgba(242,242,242,' + alpha + ')';
      ctx.lineWidth = 1;
      for (var y = -reach + shift; y < reach; y += gap) {
        ctx.beginPath();
        ctx.moveTo(-reach, y);
        ctx.lineTo(reach, y);
        ctx.stroke();
      }
      ctx.restore();
    }
    comb(a, 0.5, 0);
    comb(b, 0.42, gap / 2);

    ctx.strokeStyle = 'rgba(242,242,242,0.16)';
    ctx.lineWidth = 1;
    for (var r = gap * 2; r < s * 0.66; r += gap * 2) {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function topography(ctx, w, h, rng) {
    ctx.fillStyle = DARK;
    ctx.fillRect(0, 0, w, h);
    var s = Math.min(w, h);
    var n = 56;
    var cell = s / n;
    var ox = (w - s) / 2, oy = (h - s) / 2;
    var noise = makeNoise(rng);
    var field = new Float32Array((n + 1) * (n + 1));
    var i, j;

    for (j = 0; j <= n; j++) {
      for (i = 0; i <= n; i++) {
        var fx = i / n, fy = j / n;
        field[j * (n + 1) + i] =
          noise(fx * 2.7 + 11.3, fy * 2.7 + 7.1) * 1.1 +
          noise(fx * 5.4 + 3.7, fy * 5.4 + 9.2) * 0.34;
      }
    }

    function interp(a, b, va, vb, level) {
      var t = (level - va) / (vb - va);
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }

    var level = -0.85;
    var index = 0;
    while (level <= 0.86) {
      var major = index % 5 === 0;
      ctx.strokeStyle = major ? 'rgba(242,242,242,0.78)' : 'rgba(242,242,242,0.34)';
      ctx.lineWidth = major ? 1.5 : 0.75;
      ctx.beginPath();
      for (j = 0; j < n; j++) {
        for (i = 0; i < n; i++) {
          var v0 = field[j * (n + 1) + i];
          var v1 = field[j * (n + 1) + i + 1];
          var v2 = field[(j + 1) * (n + 1) + i + 1];
          var v3 = field[(j + 1) * (n + 1) + i];
          var p0 = [ox + i * cell, oy + j * cell];
          var p1 = [ox + (i + 1) * cell, oy + j * cell];
          var p2 = [ox + (i + 1) * cell, oy + (j + 1) * cell];
          var p3 = [ox + i * cell, oy + (j + 1) * cell];
          var cross = [];
          if ((v0 > level) !== (v1 > level)) cross.push(interp(p0, p1, v0, v1, level));
          if ((v1 > level) !== (v2 > level)) cross.push(interp(p1, p2, v1, v2, level));
          if ((v2 > level) !== (v3 > level)) cross.push(interp(p2, p3, v2, v3, level));
          if ((v3 > level) !== (v0 > level)) cross.push(interp(p3, p0, v3, v0, level));
          if (cross.length === 2) {
            ctx.moveTo(cross[0][0], cross[0][1]);
            ctx.lineTo(cross[1][0], cross[1][1]);
          } else if (cross.length === 4) {
            ctx.moveTo(cross[0][0], cross[0][1]);
            ctx.lineTo(cross[1][0], cross[1][1]);
            ctx.moveTo(cross[2][0], cross[2][1]);
            ctx.lineTo(cross[3][0], cross[3][1]);
          }
        }
      }
      ctx.stroke();
      level += 0.085;
      index++;
    }
  }

  function tendrils(ctx, w, h, rng) {
    ctx.fillStyle = DARK;
    ctx.fillRect(0, 0, w, h);
    var s = Math.min(w, h);
    ctx.lineWidth = 0.85;
    ctx.strokeStyle = 'rgba(242,242,242,0.6)';
    for (var k = 0; k < 72; k++) {
      var x = w * (0.16 + rng() * 0.68);
      var y = h * (0.16 + rng() * 0.68);
      var angle = rng() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (var step = 0; step < 170; step++) {
        angle += (rng() - 0.5) * 0.46;
        var len = s * (0.0018 + rng() * 0.0055);
        x += Math.cos(angle) * len;
        y += Math.sin(angle) * len;
        if (x < 0 || x > w || y < 0 || y > h) break;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(242,242,242,0.9)';
    for (var d = 0; d < 90; d++) {
      ctx.fillRect(rng() * w, rng() * h, 1, 1);
    }
  }

  function standingWaves(ctx, w, h, rng) {
    ctx.fillStyle = DARK;
    ctx.fillRect(0, 0, w, h);
    var s = Math.min(w, h);
    var sources = [
      [w * (0.28 + rng() * 0.07), h * (0.32 + rng() * 0.07)],
      [w * (0.68 + rng() * 0.06), h * (0.38 + rng() * 0.07)],
      [w * (0.46 + rng() * 0.08), h * (0.74 + rng() * 0.06)]
    ];
    var outer = s * 0.82;
    var gap = s * 0.018;
    ctx.lineWidth = 1;
    for (var i = 0; i < sources.length; i++) {
      for (var r = s * 0.035; r < outer; r += gap) {
        var alpha = 0.09 + 0.16 * (1 - r / outer);
        ctx.strokeStyle = 'rgba(242,242,242,' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(sources[i][0], sources[i][1], r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function woven(ctx, w, h, rng) {
    ctx.fillStyle = DARK;
    ctx.fillRect(0, 0, w, h);
    var s = Math.min(w, h);
    var n = 22;
    var cell = s / n;
    ctx.save();
    ctx.translate((w - s) / 2, (h - s) / 2);
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        var wave = Math.abs(Math.sin(((i + j) / (2 * n)) * Math.PI * 3));
        var size = cell * (0.28 + 0.55 * wave);
        var angle = (rng() - 0.5) * 0.85 + Math.sin(i * 0.5 + j * 0.33) * 0.22;
        ctx.save();
        ctx.translate(i * cell + cell / 2, j * cell + cell / 2);
        ctx.rotate(angle);
        if ((i + j) % 7 === 0) {
          ctx.fillStyle = 'rgba(242,242,242,0.86)';
          ctx.fillRect(-size / 2, -size / 2, size, size);
        } else {
          ctx.strokeStyle = 'rgba(242,242,242,0.52)';
          ctx.lineWidth = 1;
          ctx.strokeRect(-size / 2, -size / 2, size, size);
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  var plates = [halftone, interference, topography, tendrils, standingWaves, woven];

  function drawPlates() {
    var nodes = document.querySelectorAll('canvas[data-plate]');
    for (var i = 0; i < nodes.length; i++) {
      var canvas = nodes[i];
      var surfaceData = surface(canvas);
      if (!surfaceData) continue;
      var index = parseInt(canvas.getAttribute('data-plate'), 10);
      var seed = parseInt(canvas.getAttribute('data-seed'), 10);
      if (plates[index]) plates[index](surfaceData.ctx, surfaceData.w, surfaceData.h, mulberry32(seed));
    }
  }

  function newSeed() { return Math.floor(1000 + Math.random() * 8999); }

  function wireRegenerate() {
    var buttons = document.querySelectorAll('[data-regen]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        var figure = this.closest('figure');
        var canvas = figure && figure.querySelector('canvas[data-plate]');
        if (!canvas) return;
        canvas.setAttribute('data-seed', String(newSeed()));
        var surfaceData = surface(canvas);
        if (!surfaceData) return;
        var index = parseInt(canvas.getAttribute('data-plate'), 10);
        var seed = parseInt(canvas.getAttribute('data-seed'), 10);
        plates[index](surfaceData.ctx, surfaceData.w, surfaceData.h, mulberry32(seed));
      });
    }
  }

  /* --- Hero grain ------------------------------------------------------- */

  function drawHero() {
    var canvas = document.getElementById('grainCanvas');
    var data = surface(canvas);
    if (!data) return;
    var ctx = data.ctx, w = data.w, h = data.h;
    var rng = mulberry32(20261124);
    ctx.clearRect(0, 0, w, h);
    var count = Math.min(11000, Math.floor((w * h) / 105));
    for (var i = 0; i < count; i++) {
      var x = rng() * w, y = rng() * h;
      var alpha = 0.05 + rng() * 0.19;
      ctx.fillStyle = 'rgba(242,242,242,' + alpha.toFixed(3) + ')';
      var size = rng() < 0.92 ? 1 : 2;
      ctx.fillRect(x, y, size, size);
    }
  }

  /* --- Studio ----------------------------------------------------------- */

  function studioDraw() {
    var canvas = document.getElementById('studioCanvas');
    var data = surface(canvas);
    if (!data) return;
    var ctx = data.ctx, w = data.w, h = data.h;
    var s = Math.min(w, h);
    var density = parseInt(document.getElementById('density').value, 10);
    var scale = parseInt(document.getElementById('scale').value, 10);
    var contrast = parseInt(document.getElementById('contrast').value, 10);
    var seed = parseInt(document.getElementById('seed').value, 10);
    if (!isFinite(seed)) seed = 1;
    seed = Math.max(1, Math.min(9999, Math.floor(seed))) >>> 0;

    var inverted = document.getElementById('invert').checked;
    var rng = mulberry32(seed);
    var noise = makeNoise(rng);
    var rgb = inverted ? '10,10,10' : '242,242,242';

    ctx.fillStyle = inverted ? LIGHT : DARK;
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = Math.max(0.6, scale * 0.12);
    ctx.lineCap = 'round';

    var count = density * 14;
    ctx.fillStyle = 'rgba(' + rgb + ',0.16)';
    for (var d = 0; d < count * 2; d++) {
      ctx.fillRect(rng() * w, rng() * h, 1, 1);
    }
    for (var i = 0; i < count; i++) {
      var x = rng() * w, y = rng() * h;
      var n = noise((x / s) * 2.4, (y / s) * 2.4);
      var angle = n * Math.PI * 2 + rng() * 0.35;
      var len = scale * (0.6 + Math.abs(n) * 2.2);
      var alpha = (contrast / 100) * (0.22 + Math.abs(n) * 0.78);
      ctx.strokeStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    ctx.lineCap = 'butt';
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(' + rgb + ',0.38)';
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.beginPath();
    ctx.moveTo(w / 2 - 6, h / 2);
    ctx.lineTo(w / 2 + 6, h / 2);
    ctx.moveTo(w / 2, h / 2 - 6);
    ctx.lineTo(w / 2, h / 2 + 6);
    ctx.stroke();

    document.getElementById('studioStatus').textContent = 'Rendered. Seed ' + seed + (inverted ? ', inverted.' : '.');
  }

  var queued = false;
  function scheduleStudio() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      var outputs = [['density', 'densityOut'], ['scale', 'scaleOut'], ['contrast', 'contrastOut']];
      for (var i = 0; i < outputs.length; i++) {
        document.getElementById(outputs[i][1]).textContent = document.getElementById(outputs[i][0]).value;
      }
      studioDraw();
    });
  }

  function wireStudio() {
    var inputs = ['density', 'scale', 'contrast'];
    for (var i = 0; i < inputs.length; i++) {
      document.getElementById(inputs[i]).addEventListener('input', scheduleStudio);
    }
    document.getElementById('seed').addEventListener('input', scheduleStudio);
    document.getElementById('invert').addEventListener('change', scheduleStudio);

    document.getElementById('randomSeed').addEventListener('click', function () {
      document.getElementById('seed').value = String(newSeed());
      scheduleStudio();
    });

    document.getElementById('download').addEventListener('click', function () {
      var canvas = document.getElementById('studioCanvas');
      var seed = document.getElementById('seed').value;
      var link = document.createElement('a');
      link.download = 'grain-studio-' + seed + '.png';
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      document.getElementById('studioStatus').textContent = 'Saved ' + link.download;
    });
  }

  /* --- Reveal, resize, init --------------------------------------------- */

  function wireReveal() {
    var items = document.querySelectorAll('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      for (var i = 0; i < items.length; i++) items[i].classList.add('is-visible');
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    for (var j = 0; j < items.length; j++) observer.observe(items[j]);
  }

  function init() {
    wireReveal();
    wireRegenerate();
    wireStudio();
    drawHero();
    drawPlates();
    studioDraw();

    var pending = false;
    window.addEventListener('resize', function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        drawHero();
        drawPlates();
        studioDraw();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
