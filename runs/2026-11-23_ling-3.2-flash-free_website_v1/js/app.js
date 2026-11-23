/* MONO® — a grayscale practice
   All imagery is procedural. Vanilla ES2019, zero dependencies. */
(() => {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var TAU = Math.PI * 2;

  var live = document.getElementById('live');
  var liveCount = 0;
  function say(msg) {
    if (live) { live.textContent = msg + ' (' + (++liveCount) + ')'; }
  }

  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function gray(v) {
    var g = Math.max(0, Math.min(255, Math.round(v)));
    return 'rgb(' + g + ',' + g + ',' + g + ')';
  }

  function fit(canvas) {
    var r = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width));
    var h = Math.max(1, Math.round(r.height));
    var W = Math.round(w * DPR), H = Math.round(h * DPR);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  /* ── artwork renderers (deterministic per seed) ───────────── */

  function renderRidgeline(ctx, w, h, rand) {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    var lines = 64 + Math.floor(rand() * 36);
    var ph = [rand() * TAU, rand() * TAU, rand() * TAU];
    var fr = [0.006 + rand() * 0.008, 0.013 + rand() * 0.012, 0.03 + rand() * 0.03];
    for (var i = 0; i < lines; i++) {
      var t = i / (lines - 1);
      var baseY = h * 0.12 + (h * 0.78) * Math.pow(t, 1.15);
      var amp = h * 0.015 + h * 0.05 * rand();
      var g = Math.round(25 + t * 190);
      ctx.strokeStyle = 'rgba(' + g + ',' + g + ',' + g + ',0.92)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var x = 0; x <= w; x += 4) {
        var y = baseY
          + Math.sin(x * fr[0] + ph[0] + i * 0.05) * amp
          + Math.sin(x * fr[1] + ph[1]) * amp * 0.55
          + Math.sin(x * fr[2] + ph[2]) * amp * 0.22;
        if (x === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
      }
      ctx.stroke();
    }
  }

  function renderHarmonograph(ctx, w, h, rand) {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2, s = Math.min(w, h) * 0.42;
    var f1 = 2 + (rand() < 0.5 ? 0 : 1) + rand() * 0.03;
    var f2 = f1 + 1 + rand() * 0.03;
    var f3 = 2 + (rand() < 0.5 ? 0 : 1) + rand() * 0.03;
    var f4 = f3 + 1 + rand() * 0.03;
    var d = 0.0035 + rand() * 0.0025;
    var p1 = rand() * TAU, p2 = rand() * TAU, p3 = rand() * TAU, p4 = rand() * TAU;
    var T = 720, steps = 2600, k = 0.02;
    var prevX = 0, prevY = 0;
    ctx.lineWidth = 0.8;
    for (var i = 0; i <= steps; i++) {
      var t = i / steps * T;
      var e = Math.exp(-d * t);
      var x = cx + s * e * (0.55 * Math.sin(f1 * t * k + p1) + 0.3 * Math.sin(f2 * t * k + p2));
      var y = cy + s * e * (0.55 * Math.sin(f3 * t * k + p3) + 0.3 * Math.sin(f4 * t * k + p4));
      if (i > 0) {
        var a = 0.06 + 0.6 * (1 - i / steps);
        ctx.strokeStyle = 'rgba(12,12,12,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke();
      }
      prevX = x; prevY = y;
    }
  }

  function renderMoire(ctx, w, h, rand) {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.44;
    var d = R * (0.1 + rand() * 0.08);
    var N = 90;
    function set(ox, oy, g, alpha) {
      ctx.strokeStyle = 'rgba(' + g + ',' + g + ',' + g + ',' + alpha + ')';
      ctx.lineWidth = 1;
      for (var k = 1; k <= N; k++) {
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, k * R / N, 0, TAU);
        ctx.stroke();
      }
    }
    set(-d, 0, 15, 0.5);
    set(d, 0, 15, 0.5);
    set(0, -R * 0.08, 90, 0.22);
    set(0, R * 0.08, 90, 0.22);
  }

  function blobField(rand, w, h) {
    var blobs = [];
    var n = 5 + Math.floor(rand() * 3);
    var m = Math.min(w, h);
    for (var i = 0; i < n; i++) {
      blobs.push({
        x: rand() * w, y: rand() * h,
        r: (0.25 + rand() * 0.45) * m,
        s: rand() < 0.5 ? 1 : -1,
        a: 0.6 + rand() * 0.7
      });
    }
    return function (x, y) {
      var sum = 0;
      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i];
        var dx = x - b.x, dy = y - b.y;
        sum += b.s * b.a * Math.exp(-(dx * dx + dy * dy) / (2 * b.r * b.r));
      }
      return sum;
    };
  }

  function renderBloom(ctx, w, h, rand) {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    var field = blobField(rand, w, h);
    var step = 7;
    for (var y = step / 2; y < h; y += step) {
      for (var x = step / 2; x < w; x += step) {
        var v = clamp01(0.5 + 0.42 * field(x, y));
        if (v < 0.03) { continue; }
        var r = step * 0.58 * Math.sqrt(v);
        var g = Math.round(245 - 225 * v);
        ctx.fillStyle = gray(g);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
    }
  }

  var B8 = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21]
  ];

  function renderDither(ctx, w, h, rand) {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    var p1 = rand() * TAU, p2 = rand() * TAU;
    var blobs = [];
    var n = 3 + Math.floor(rand() * 3);
    for (var i = 0; i < n; i++) {
      blobs.push({ x: rand(), y: rand(), r: 0.12 + rand() * 0.3, s: rand() < 0.5 ? -1 : 1, a: 0.25 + rand() * 0.3 });
    }
    var step = 4;
    ctx.fillStyle = '#111';
    for (var j = 0, cy = 0; cy < h; j++, cy += step) {
      for (var k = 0, cx = 0; cx < w; k++, cx += step) {
        var u = cx / w, v = cy / h;
        var L = 0.5 + 0.32 * Math.sin(u * TAU * 1.5 + p1) * Math.cos(v * TAU * 1.2 + p2);
        for (var b = 0; b < blobs.length; b++) {
          var bl = blobs[b];
          var dx = u - bl.x, dy = v - bl.y;
          L += bl.s * bl.a * Math.exp(-(dx * dx + dy * dy) / (2 * bl.r * bl.r));
        }
        L = clamp01(L);
        var th = B8[j % 8][k % 8] / 64;
        if (L < th) { ctx.fillRect(cx, cy, step, step); }
      }
    }
  }

  function renderWeave(ctx, w, h, rand) {
    ctx.fillStyle = '#f2f2f2'; ctx.fillRect(0, 0, w, h);
    var n = 14, m = 12;
    var vw = w / n, hh = h / m;
    var i, j;
    for (i = 0; i < n; i++) {
      var g1 = Math.round(228 - i * 15);
      ctx.fillStyle = gray(g1);
      ctx.fillRect(i * vw, 0, vw + 0.5, h);
    }
    for (j = 0; j < m; j++) {
      var g2 = Math.round(26 + j * 15);
      for (i = 0; i < n; i++) {
        if ((i + j) % 2 !== 0) { continue; }
        var x = i * vw, y = j * hh;
        ctx.fillStyle = gray(g2);
        ctx.fillRect(x, y, vw + 0.5, hh + 0.5);
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(x, y + hh - 1, vw + 0.5, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(x, y, vw + 0.5, 1);
      }
    }
    rand(); rand();
  }

  var RENDERERS = {
    ridgeline: renderRidgeline,
    harmonograph: renderHarmonograph,
    moire: renderMoire,
    bloom: renderBloom,
    dither: renderDither,
    weave: renderWeave
  };

  /* ── works grid ─────────────────────────────────────────── */

  var works = Array.prototype.slice.call(document.querySelectorAll('.work'));
  var rendered = new WeakSet();

  function renderWork(fig) {
    var c = fig.querySelector('canvas');
    var f = fit(c);
    RENDERERS[fig.dataset.work](f.ctx, f.w, f.h, mulberry(+fig.dataset.seed));
  }

  var workIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting && !rendered.has(e.target)) {
        rendered.add(e.target);
        renderWork(e.target);
        workIO.unobserve(e.target);
      }
    });
  }, { rootMargin: '200px' });
  works.forEach(function (fig) { workIO.observe(fig); });

  var worksGrid = document.getElementById('works-grid');
  worksGrid.addEventListener('click', function (ev) {
    var btn = ev.target.closest('button');
    if (!btn) { return; }
    var fig = btn.closest('.work');
    if (btn.dataset.action === 'rerun') {
      fig.dataset.seed = String(Math.floor(Math.random() * 899999 + 100000));
      renderWork(fig);
      fig.querySelector('.seed-val').textContent = fig.dataset.seed;
      say('Re-run ' + fig.querySelector('h3').textContent + ', seed ' + fig.dataset.seed);
    } else if (btn.dataset.action === 'expand') {
      var on = fig.classList.toggle('is-expanded');
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? 'Collapse' : 'Expand';
      requestAnimationFrame(function () { renderWork(fig); });
    }
  });

  /* ── hero flow field ────────────────────────────────────── */

  var heroSec = document.getElementById('top');
  var heroC = document.getElementById('hero-canvas');
  var heroSeedEl = document.getElementById('hero-seed');
  var heroCtx, heroW, heroH, parts = [];
  var heroVisible = true, heroRAF = 0, heroT = 0;
  var mx = -9999, my = -9999;

  function newP() {
    return {
      x: Math.random() * heroW, y: Math.random() * heroH,
      life: 30 + Math.random() * 140,
      g: 150 + Math.random() * 105
    };
  }

  function heroField(x, y, t) {
    return (Math.sin(x * 0.0021 + t * 0.4)
      + Math.cos(y * 0.0024 - t * 0.3)
      + Math.sin((x + y) * 0.0011 + t * 0.18)) * Math.PI;
  }

  function heroSetup() {
    var f = fit(heroC);
    heroCtx = f.ctx; heroW = f.w; heroH = f.h;
    heroCtx.fillStyle = '#000';
    heroCtx.fillRect(0, 0, f.w, f.h);
    parts = [];
    var n = Math.min(1300, Math.round(f.w * f.h / 850));
    for (var i = 0; i < n; i++) { parts.push(newP()); }
  }

  function heroTick() {
    heroRAF = requestAnimationFrame(heroTick);
    heroT += 0.008;
    heroCtx.fillStyle = 'rgba(0,0,0,0.055)';
    heroCtx.fillRect(0, 0, heroW, heroH);
    heroCtx.lineWidth = 1;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var a = heroField(p.x, p.y, heroT);
      var dx = p.x - mx, dy = p.y - my;
      var d2 = dx * dx + dy * dy;
      if (d2 < 16900) { a += (1 - Math.sqrt(d2) / 130) * 1.1 * (dx >= 0 ? 1 : -1); }
      var nx = p.x + Math.cos(a) * 1.5;
      var ny = p.y + Math.sin(a) * 1.5;
      heroCtx.strokeStyle = 'rgba(' + p.g + ',' + p.g + ',' + p.g + ',0.55)';
      heroCtx.beginPath(); heroCtx.moveTo(p.x, p.y); heroCtx.lineTo(nx, ny); heroCtx.stroke();
      p.px = nx; p.py = ny; p.x = nx; p.y = ny;
      if (--p.life < 0 || nx < 0 || ny < 0 || nx > heroW || ny > heroH) {
        parts[i] = newP();
      }
    }
  }

  function heroStatic() {
    for (var i = 0; i < 320; i++) {
      var x = Math.random() * heroW, y = Math.random() * heroH;
      var g = Math.round(120 + Math.random() * 120);
      heroCtx.strokeStyle = 'rgba(' + g + ',' + g + ',' + g + ',0.5)';
      heroCtx.lineWidth = 1;
      heroCtx.beginPath(); heroCtx.moveTo(x, y);
      for (var s = 0; s < 28; s++) {
        var a = heroField(x, y, 0);
        x += Math.cos(a) * 3; y += Math.sin(a) * 3;
        heroCtx.lineTo(x, y);
      }
      heroCtx.stroke();
    }
  }

  heroSec.addEventListener('pointermove', function (e) {
    var r = heroSec.getBoundingClientRect();
    mx = e.clientX - r.left; my = e.clientY - r.top;
  });
  heroSec.addEventListener('pointerleave', function () { mx = -9999; my = -9999; });

  var heroIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      heroVisible = e.isIntersecting;
      if (heroVisible && !reduceMotion) {
        if (!heroRAF) { heroTick(); }
      } else if (!heroVisible && heroRAF) {
        cancelAnimationFrame(heroRAF); heroRAF = 0;
      }
    });
  }, { threshold: 0.05 });
  heroIO.observe(heroSec);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (heroRAF) { cancelAnimationFrame(heroRAF); heroRAF = 0; }
    } else if (heroVisible && !reduceMotion && !heroRAF) {
      heroTick();
    }
  });

  document.getElementById('hero-rerun').addEventListener('click', function () {
    heroSetup();
    if (reduceMotion) { heroStatic(); } else { heroTick(); }
    var seed = Math.floor(Math.random() * 899999 + 100000);
    heroSeedEl.textContent = String(seed);
    say('Flow field reseeded, seed ' + seed);
  });

  /* ── halftone lab ───────────────────────────────────────── */

  var labC = document.getElementById('lab-canvas');
  var SW = 760, SH = 540;
  var labSrc = document.createElement('canvas');
  labSrc.width = SW; labSrc.height = SH;
  var labSrcCtx = labSrc.getContext('2d', { willReadFrequently: true });
  var labImg = null;
  var labSeed = 48113;
  var labPending = false;

  var conI = document.getElementById('c-contrast');
  var gamI = document.getElementById('c-gamma');
  var cellI = document.getElementById('c-cell');
  var angI = document.getElementById('c-angle');
  var oCon = document.getElementById('o-contrast');
  var oGam = document.getElementById('o-gamma');
  var oCell = document.getElementById('o-cell');
  var oAng = document.getElementById('o-angle');
  var labSeedEl = document.getElementById('lab-seed');

  function ridge(x, rand, baseY, amp, fill) {
    var p1 = rand() * TAU, p2 = rand() * TAU;
    var f1 = 0.008 + rand() * 0.01, f2 = 0.02 + rand() * 0.015;
    x.fillStyle = fill;
    x.beginPath();
    x.moveTo(0, baseY + Math.sin(p1) * amp);
    for (var px = 0; px <= SW; px += 5) {
      x.lineTo(px, baseY + Math.sin(px * f1 + p1) * amp + Math.sin(px * f2 + p2) * amp * 0.4);
    }
    x.lineTo(SW, SH); x.lineTo(0, SH);
    x.closePath();
    x.fill();
  }

  function paintSource(rand) {
    var x = labSrcCtx;
    var light = 200 + Math.floor(rand() * 40);
    var grd = x.createLinearGradient(0, 0, 0, SH);
    grd.addColorStop(0, gray(Math.min(255, light + 25)));
    grd.addColorStop(1, gray(light - 55));
    x.fillStyle = grd;
    x.fillRect(0, 0, SW, SH);

    var sx = SW * (0.22 + rand() * 0.56);
    var sy = SH * (0.18 + rand() * 0.24);
    var sr = SH * (0.10 + rand() * 0.12);
    x.fillStyle = gray(18 + Math.floor(rand() * 30));
    x.beginPath(); x.arc(sx, sy, sr, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 2;
    x.beginPath(); x.arc(sx, sy, sr * 1.35, 0, TAU); x.stroke();

    ridge(x, rand, SH * 0.58, SH * 0.10, gray(70 + Math.floor(rand() * 30)));
    ridge(x, rand, SH * 0.72, SH * 0.14, gray(30 + Math.floor(rand() * 20)));

    x.fillStyle = gray(16);
    x.fillRect(0, SH * 0.9, SW, SH * 0.1);

    var n = 3 + Math.floor(rand() * 4);
    for (var i = 0; i < n; i++) {
      x.strokeStyle = 'rgba(20,20,20,' + (0.35 + rand() * 0.4).toFixed(2) + ')';
      x.lineWidth = 1.5 + rand() * 2;
      x.beginPath();
      x.arc(rand() * SW, SH * 0.15 + rand() * SH * 0.6, 8 + rand() * 46, 0, TAU);
      x.stroke();
    }
    x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 2;
    for (var j = 0; j < 3; j++) {
      x.beginPath();
      x.arc(rand() * SW, rand() * SH, 30 + rand() * 120, rand() * TAU, rand() * TAU + 2);
      x.stroke();
    }
    labImg = x.getImageData(0, 0, SW, SH).data;
  }

  function sample(sx, sy) {
    sx = sx | 0; sy = sy | 0;
    if (sx < 0) { sx = 0; } else if (sx >= SW) { sx = SW - 1; }
    if (sy < 0) { sy = 0; } else if (sy >= SH) { sy = SH - 1; }
    return labImg[(sy * SW + sx) * 4] / 255;
  }

  function renderLab() {
    if (!labImg) { return; }
    var f = fit(labC);
    var ctx = f.ctx, w = f.w, h = f.h;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    var cell = +cellI.value;
    var gamma = +gamI.value / 100;
    var con = +conI.value / 100;
    var ang = +angI.value * Math.PI / 180;
    var cos = Math.cos(ang), sin = Math.sin(ang);
    var cx = w / 2, cy = h / 2;
    var pat = document.querySelector('input[name="pattern"]:checked').value;
    ctx.fillStyle = '#0a0a0a';
    for (var py = cell / 2; py < h; py += cell) {
      for (var px = cell / 2; px < w; px += cell) {
        var dx = px - cx, dy = py - cy;
        var rx = cx + dx * cos + dy * sin;
        var ry = cy - dx * sin + dy * cos;
        var v = sample(rx / w * SW, ry / h * SH);
        v = Math.pow(v, gamma);
        v = clamp01((v - 0.5) * con + 0.5);
        var ink = 1 - v;
        if (ink < 0.03) { continue; }
        if (pat === 'dot') {
          var r = cell * 0.62 * Math.sqrt(ink);
          ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
        } else if (pat === 'square') {
          var s = cell * 0.92 * ink;
          ctx.fillRect(px - s / 2, py - s / 2, s, s);
        } else if (pat === 'diamond') {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(Math.PI / 4);
          var s2 = cell * 0.8 * ink;
          ctx.fillRect(-s2 / 2, -s2 / 2, s2, s2);
          ctx.restore();
        } else {
          ctx.fillRect(px - cell / 2, py - cell * ink / 2, cell, Math.max(0.6, cell * ink));
        }
      }
    }
  }

  function scheduleLab() {
    if (labPending) { return; }
    labPending = true;
    requestAnimationFrame(function () { labPending = false; renderLab(); });
  }

  function syncOutputs() {
    oCon.textContent = conI.value + '%';
    oGam.textContent = (+gamI.value / 100).toFixed(2);
    oCell.textContent = cellI.value + ' px';
    oAng.textContent = angI.value + '°';
  }

  [conI, gamI, cellI, angI].forEach(function (el) {
    el.addEventListener('input', function () { syncOutputs(); scheduleLab(); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('input[name="pattern"]'), function (r) {
    r.addEventListener('change', scheduleLab);
  });

  document.getElementById('lab-new').addEventListener('click', function () {
    labSeed = Math.floor(Math.random() * 899999 + 100000);
    labSeedEl.textContent = String(labSeed);
    paintSource(mulberry(labSeed));
    renderLab();
    say('New composition, seed ' + labSeed);
  });

  document.getElementById('lab-dl').addEventListener('click', function () {
    labC.toBlob(function (blob) {
      if (!blob) { say('Download failed in this browser'); return; }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'mono-halftone-' + labSeed + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      say('PNG downloaded, seed ' + labSeed);
    }, 'image/png');
  });

  /* ── scroll reveals & nav state ─────────────────────────── */

  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reduceMotion) {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); revIO.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { revIO.observe(el); });
  }

  var navLinks = {};
  Array.prototype.forEach.call(document.querySelectorAll('.main-nav a[data-link]'), function (a) {
    navLinks[a.dataset.link] = a;
  });
  var secIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) { return; }
      Object.keys(navLinks).forEach(function (k) {
        if (k === e.target.id) { navLinks[k].setAttribute('aria-current', 'true'); }
        else { navLinks[k].removeAttribute('aria-current'); }
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  ['works', 'lab', 'manifesto', 'colophon'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) { secIO.observe(el); }
  });

  /* ── mobile menu ────────────────────────────────────────── */

  var header = document.getElementById('site-header');
  var menuBtn = document.getElementById('menu-btn');
  function setMenu(open) {
    header.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
  }
  menuBtn.addEventListener('click', function () {
    setMenu(!header.classList.contains('nav-open'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('nav-open')) {
      setMenu(false);
      menuBtn.focus();
    }
  });
  Array.prototype.forEach.call(document.querySelectorAll('.mobile-nav a'), function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });

  /* ── resize ─────────────────────────────────────────────── */

  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      works.forEach(function (fig) { if (rendered.has(fig)) { renderWork(fig); } });
      heroSetup();
      if (reduceMotion) { heroStatic(); } else { heroTick(); }
      renderLab();
    }, 200);
  });

  /* ── boot ───────────────────────────────────────────────── */

  heroSeedEl.textContent = String(Math.floor(Math.random() * 899999 + 100000));
  heroSetup();
  if (reduceMotion) { heroStatic(); } else { heroTick(); }
  paintSource(mulberry(labSeed));
  renderLab();
  syncOutputs();
})();
