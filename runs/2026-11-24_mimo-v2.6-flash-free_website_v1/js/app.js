/* ============================================================
   ACHROMA — instruments
   No dependencies. No build. Everything here is local.
   ============================================================ */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reduced() { return mqReduce.matches; }
  function $(id) { return doc.getElementById(id); }

  function pad(n, w) {
    var s = String(Math.round(n));
    while (s.length < w) { s = '0' + s; }
    return s;
  }

  /* ---------------------------------------------------------
     1. Theme — black/white inversion only. Never a colour.
     --------------------------------------------------------- */
  var themeBtn = $('theme-toggle');
  var themeLabel = $('theme-label');
  var themeMeta = doc.querySelector('meta[name="theme-color"]');

  function applyTheme(t, persist) {
    root.setAttribute('data-theme', t);
    if (themeLabel) { themeLabel.textContent = t === 'dark' ? 'Dark' : 'Light'; }
    if (themeBtn) {
      themeBtn.setAttribute('aria-label',
        t === 'dark' ? 'Dark theme — switch to light' : 'Light theme — switch to dark');
    }
    if (themeMeta) { themeMeta.setAttribute('content', t === 'dark' ? '#0b0b0b' : '#f1f1f1'); }
    if (persist) { try { localStorage.setItem('achroma-theme', t); } catch (e) {} }
    buildShadow();
    refreshContrast();
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }

  /* ---------------------------------------------------------
     2. Film grain — four tiled noise plates, cycled at 10 fps.
     --------------------------------------------------------- */
  var grainCanvas = $('grain');
  var grainCtx = grainCanvas ? grainCanvas.getContext('2d') : null;
  var grainTiles = [];
  var grainPatterns = [];
  var grainIndex = 0;
  var grainLast = 0;
  var grainRAF = 0;

  function buildGrain() {
    if (!grainCtx) { return; }
    var S = 128;
    grainTiles = [];
    grainPatterns = [];
    for (var k = 0; k < 4; k++) {
      var c = doc.createElement('canvas');
      c.width = S; c.height = S;
      var cx = c.getContext('2d');
      var img = cx.createImageData(S, S);
      var d = img.data;
      for (var i = 0; i < d.length; i += 4) {
        var v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = 255;
        d[i + 3] = v;
      }
      cx.putImageData(img, 0, 0);
      grainTiles.push(c);
      grainPatterns.push(grainCtx.createPattern(c, 'repeat'));
    }
  }

  function sizeGrain() {
    if (!grainCanvas) { return; }
    grainCanvas.width = Math.max(1, window.innerWidth);
    grainCanvas.height = Math.max(1, window.innerHeight);
  }

  function paintGrain() {
    if (!grainCtx || !grainPatterns.length) { return; }
    grainCtx.clearRect(0, 0, grainCanvas.width, grainCanvas.height);
    grainCtx.fillStyle = grainPatterns[grainIndex];
    grainCtx.fillRect(0, 0, grainCanvas.width, grainCanvas.height);
  }

  function grainTick(ts) {
    grainRAF = window.requestAnimationFrame(grainTick);
    if (ts - grainLast < 95) { return; }
    grainLast = ts;
    grainIndex = (grainIndex + 1) % grainPatterns.length;
    paintGrain();
  }

  function startGrain() {
    if (!grainCtx || reduced() || grainRAF) { return; }
    grainRAF = window.requestAnimationFrame(grainTick);
  }
  function stopGrain() {
    if (grainRAF) { window.cancelAnimationFrame(grainRAF); grainRAF = 0; }
  }

  if (grainCtx) {
    buildGrain();
    sizeGrain();
    paintGrain();
    if (!reduced()) { startGrain(); }
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) { stopGrain(); } else { startGrain(); }
    });
    var grainResize;
    window.addEventListener('resize', function () {
      window.clearTimeout(grainResize);
      grainResize = window.setTimeout(function () {
        sizeGrain();
        paintGrain();
      }, 180);
    });
  }

  /* ---------------------------------------------------------
     3. Scroll progress + active movement in the index
     --------------------------------------------------------- */
  var progressBar = $('progress-bar');
  var scrollQueued = false;

  function paintProgress() {
    var h = doc.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? Math.min(1, Math.max(0, window.pageYOffset / h)) : 0;
    if (progressBar) { progressBar.style.transform = 'scaleX(' + p.toFixed(4) + ')'; }
    scrollQueued = false;
  }

  window.addEventListener('scroll', function () {
    if (scrollQueued) { return; }
    scrollQueued = true;
    window.requestAnimationFrame(paintProgress);
  }, { passive: true });
  paintProgress();

  var navLinks = [].slice.call(doc.querySelectorAll('.site-nav a[data-nav]'));

  function setActive(id) {
    for (var i = 0; i < navLinks.length; i++) {
      var on = navLinks[i].getAttribute('href') === '#' + id;
      if (on) { navLinks[i].setAttribute('aria-current', 'true'); }
      else { navLinks[i].removeAttribute('aria-current'); }
    }
  }

  if ('IntersectionObserver' in window) {
    var sectionObs = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { setActive(entries[i].target.id); }
      }
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    var secs = doc.querySelectorAll('main section[id]');
    for (var s = 0; s < secs.length; s++) { sectionObs.observe(secs[s]); }
  }

  /* ---------------------------------------------------------
     4. Index overlay
     --------------------------------------------------------- */
  var menu = $('index-menu');
  var menuToggle = $('menu-toggle');
  var menuClose = $('menu-close');
  var menuShields = [doc.getElementById('main'), doc.querySelector('.site-head')];

  function shield(on) {
    for (var i = 0; i < menuShields.length; i++) {
      var el = menuShields[i];
      if (el && ('inert' in el)) { el.inert = on; }
    }
  }

  function openMenu() {
    if (!menu) { return; }
    menu.classList.add('is-open');
    if (menuToggle) { menuToggle.setAttribute('aria-expanded', 'true'); }
    doc.body.style.overflow = 'hidden';
    shield(true);
    window.requestAnimationFrame(function () {
      var first = menu.querySelector('a');
      if (first) { first.focus(); }
    });
  }
  function closeMenu(returnFocus) {
    if (!menu) { return; }
    menu.classList.remove('is-open');
    if (menuToggle) { menuToggle.setAttribute('aria-expanded', 'false'); }
    doc.body.style.overflow = '';
    shield(false);
    if (returnFocus) {
      if (menuToggle) { menuToggle.focus(); }
      if (doc.activeElement !== menuToggle) {
        var nav = doc.querySelector('.site-nav a');
        if (nav) { nav.focus(); }
      }
    }
  }

  if (menuToggle) { menuToggle.addEventListener('click', openMenu); }
  if (menuClose) { menuClose.addEventListener('click', function () { closeMenu(true); }); }
  if (menu) {
    menu.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== menu && t.tagName !== 'A') { t = t.parentNode; }
      if (t && t.tagName === 'A') { closeMenu(false); }
    });
  }
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu && menu.classList.contains('is-open')) { closeMenu(true); }
  });

  /* ---------------------------------------------------------
     5. Reveal on scroll
     --------------------------------------------------------- */
  var revealEls = [].slice.call(doc.querySelectorAll('[data-reveal]'));

  function revealAll() {
    for (var i = 0; i < revealEls.length; i++) { revealEls[i].classList.add('is-in'); }
  }

  if (revealEls.length) {
    if (reduced() || !('IntersectionObserver' in window)) {
      revealAll();
    } else {
      var revealObs = new IntersectionObserver(function (entries, obs) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            entries[i].target.classList.add('is-in');
            obs.unobserve(entries[i].target);
          }
        }
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
      for (var r = 0; r < revealEls.length; r++) { revealObs.observe(revealEls[r]); }
    }
  }

  /* ---------------------------------------------------------
     6. Hero dial — pointer-driven incident-light needle
     --------------------------------------------------------- */
  var hero = doc.querySelector('.hero');
  var needle = $('dial-needle');
  var dialAngle = $('dial-angle');
  var dialSvg = doc.querySelector('.dial');

  if (hero) {
    window.requestAnimationFrame(function () { hero.classList.add('is-in'); });
  }

  function setDial(a) {
    var v = ((a % 360) + 360) % 360;
    if (needle) { needle.style.transform = 'rotate(' + v.toFixed(2) + 'deg)'; }
    if (dialAngle) { dialAngle.textContent = pad(v, 3); }
  }

  if (dialSvg && needle && window.matchMedia('(pointer: fine)').matches) {
    dialSvg.addEventListener('pointermove', function (e) {
      if (reduced()) { return; }
      var r = dialSvg.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      setDial(Math.atan2(dx, -dy) * 180 / Math.PI);
      dialSvg.style.transform = 'translate(' + (dx * 0.018).toFixed(2) + 'px,' +
        (dy * 0.018).toFixed(2) + 'px)';
    });
    dialSvg.addEventListener('pointerleave', function () {
      dialSvg.style.transform = '';
    });
  }

  /* ---------------------------------------------------------
     7. The ladder — 24 even steps, roving focus, adopt + copy
     --------------------------------------------------------- */
  var rail = $('ladder-rail');
  var ldHex = $('ld-hex');
  var ldStep = $('ld-step');
  var ldVal = $('ld-val');
  var ldLum = $('ld-lum');
  var ldCr = $('ld-cr');
  var ldStatus = $('ld-status');
  var STEPS = 24;
  var steps = [];
  var current = 11;
  var adopted = -1;

  function stepValue(i) { return Math.round(i * 255 / (STEPS - 1)); }

  function hexOf(v) {
    var h = v.toString(16).toUpperCase();
    if (h.length < 2) { h = '0' + h; }
    return '#' + h + h + h;
  }

  function lin(c) {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function pageLuminance() {
    /* read the theme token, not the animated background — the token switches
       instantly while body background cross-fades over .45s */
    var token = (getComputedStyle(root).getPropertyValue('--bg') || '').trim();
    var hex = token.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    var col;
    if (hex) {
      var h = hex[1];
      if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
      col = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    } else {
      col = (getComputedStyle(doc.body).backgroundColor || '').match(/\d+(\.\d+)?/g);
    }
    if (!col || col.length < 3) { return 0.0033; }
    return 0.2126 * lin(+col[0]) + 0.7152 * lin(+col[1]) + 0.0722 * lin(+col[2]);
  }

  function contrast(a, b) {
    var hi = Math.max(a, b), lo = Math.min(a, b);
    return (hi + 0.05) / (lo + 0.05);
  }

  function showStep(i) {
    var v = stepValue(i);
    if (ldHex) { ldHex.textContent = hexOf(v); }
    if (ldStep) { ldStep.textContent = pad(i + 1, 2) + ' / ' + STEPS; }
    if (ldVal) { ldVal.textContent = pad(v, 3); }
    if (ldLum) { ldLum.textContent = (lin(v) * 100).toFixed(1) + ' %'; }
    refreshContrast(i);
  }

  function refreshContrast(i) {
    if (!ldCr) { return; }
    if (typeof i !== 'number') { i = adopted >= 0 ? adopted : current; }
    var bg = pageLuminance();
    var l = lin(stepValue(i));
    ldCr.textContent = contrast(l, bg).toFixed(2) + ' : 1';
  }

  function focusStep(i, move) {
    if (i < 0) { i = 0; }
    if (i > STEPS - 1) { i = STEPS - 1; }
    current = i;
    for (var k = 0; k < steps.length; k++) { steps[k].tabIndex = k === i ? 0 : -1; }
    showStep(i);
    if (move && steps[i]) { steps[i].focus(); }
  }

  function copyText(text) {
    function legacy() {
      try {
        var ta = doc.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        ta.style.opacity = '0';
        doc.body.appendChild(ta);
        ta.select();
        var ok = doc.execCommand('copy');
        doc.body.removeChild(ta);
        return ok;
      } catch (e) { return false; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacy(); }
      );
    }
    try { return Promise.resolve(legacy()); } catch (e) { return Promise.resolve(false); }
  }

  function adopt(i) {
    var v = stepValue(i);
    var hex = hexOf(v);
    adopted = i;
    for (var k = 0; k < steps.length; k++) {
      steps[k].classList.toggle('is-adopted', k === i);
    }
    root.style.setProperty('--tone', hex);
    showStep(i);
    copyText(hex).then(function (ok) {
      if (ldStatus) {
        ldStatus.textContent = ok
          ? 'Adopted ' + hex + ' as the working tone. Hex copied to the clipboard.'
          : 'Adopted ' + hex + ' as the working tone. Copying is unavailable here — the value is shown above.';
      }
    });
  }

  if (rail) {
    for (var si = 0; si < STEPS; si++) {
      (function (i) {
        var v = stepValue(i);
        var b = doc.createElement('button');
        b.type = 'button';
        b.className = 'step';
        b.tabIndex = -1;
        b.style.background = 'rgb(' + v + ',' + v + ',' + v + ')';
        b.setAttribute('data-i', String(i));
        b.setAttribute('aria-label', 'Step ' + (i + 1) + ' of 24, code ' + v + ', ' + hexOf(v));
        rail.appendChild(b);
        steps.push(b);
      })(si);
    }
    steps[current].tabIndex = 0;
    showStep(current);

    rail.addEventListener('mouseover', function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains('step')) {
        showStep(+t.getAttribute('data-i'));
      }
    });
    rail.addEventListener('focusin', function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains('step')) {
        focusStep(+t.getAttribute('data-i'), false);
      }
    });
    rail.addEventListener('mouseleave', function () { showStep(adopted >= 0 ? adopted : current); });
    rail.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains('step')) {
        adopt(+t.getAttribute('data-i'));
      }
    });
    rail.addEventListener('keydown', function (e) {
      var t = e.target;
      if (!t || !t.classList || !t.classList.contains('step')) { return; }
      var i = +t.getAttribute('data-i');
      var next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { next = Math.min(STEPS - 1, i + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { next = Math.max(0, i - 1); }
      else if (e.key === 'Home') { next = 0; }
      else if (e.key === 'End') { next = STEPS - 1; }
      if (next !== null) { e.preventDefault(); focusStep(next, true); }
    });
  }

  /* ---------------------------------------------------------
     8. The dot — a landscape screened one cell at a time
     --------------------------------------------------------- */
  var htCanvas = $('ht-canvas');
  var htCell = $('ht-cell');
  var htAngle = $('ht-angle');
  var htCellOut = $('ht-cell-out');
  var htAngleOut = $('ht-angle-out');
  var htStat = $('ht-stat');
  var htW = 960;
  var htH = 600;
  var htSrc = null;

  function ridge(ctx, seed, base, amp, color) {
    ctx.beginPath();
    ctx.moveTo(0, htH);
    for (var px = 0; px <= htW; px += 3) {
      var t = px / htW;
      var y = base - amp * (
        Math.sin(t * Math.PI * 2.2 + seed) * 0.55 +
        Math.sin(t * Math.PI * 5.1 + seed * 1.7) * 0.28 +
        Math.sin(t * Math.PI * 1.1 + seed * 2.9) * 0.42
      );
      ctx.lineTo(px, y);
    }
    ctx.lineTo(htW, htH);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function buildLandscape() {
    var c = doc.createElement('canvas');
    c.width = htW; c.height = htH;
    var ctx = c.getContext('2d');

    var sky = ctx.createLinearGradient(0, 0, 0, htH);
    sky.addColorStop(0, '#3d3d3d');
    sky.addColorStop(0.40, '#8c8c8c');
    sky.addColorStop(0.58, '#cfcfcf');
    sky.addColorStop(1, '#efefef');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, htW, htH);

    var sx = htW * 0.72, sy = htH * 0.30;
    var glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 250);
    glow.addColorStop(0, 'rgba(255,255,255,0.95)');
    glow.addColorStop(0.30, 'rgba(255,255,255,0.42)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, htW, htH);

    ctx.beginPath();
    ctx.arc(sx, sy, 46, 0, Math.PI * 2);
    ctx.fillStyle = '#fbfbfb';
    ctx.fill();

    ridge(ctx, 0.9, htH * 0.60, 44, '#9d9d9d');
    ridge(ctx, 2.3, htH * 0.70, 58, '#6b6b6b');
    ridge(ctx, 4.1, htH * 0.82, 50, '#3a3a3a');
    ridge(ctx, 6.7, htH * 0.94, 34, '#151515');

    return ctx.getImageData(0, 0, htW, htH);
  }

  function lumAt(px, py) {
    if (px < 0) { px = 0; } else if (px >= htW) { px = htW - 1; }
    if (py < 0) { py = 0; } else if (py >= htH) { py = htH - 1; }
    var d = htSrc.data;
    var o = (py * htW + px) * 4;
    return (d[o] * 0.2126 + d[o + 1] * 0.7152 + d[o + 2] * 0.0722) / 255;
  }

  function avgLum(cx, cy, half) {
    var x0 = Math.round(cx - half), x1 = Math.round(cx + half);
    var y0 = Math.round(cy - half), y1 = Math.round(cy + half);
    return (lumAt(x0, y0) + lumAt(x1, y0) + lumAt(x0, y1) + lumAt(x1, y1)) / 4;
  }

  function drawHalftone() {
    if (!htCanvas || !htSrc || !htCell || !htAngle) { return; }
    var ctx = htCanvas.getContext('2d');
    var cell = +htCell.value;
    var deg = +htAngle.value;
    var shapeInput = doc.querySelector('input[name="ht-shape"]:checked');
    var shape = shapeInput ? shapeInput.value : 'circle';
    var shapeName = shape === 'circle' ? 'Circle' : (shape === 'square' ? 'Square' : 'Line');
    var ang = deg * Math.PI / 180;
    var cos = Math.cos(ang), sin = Math.sin(ang);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ededed';
    ctx.fillRect(0, 0, htW, htH);
    ctx.fillStyle = '#141414';

    var R = Math.sqrt(htW * htW + htH * htH) / 2 + cell;
    var half = Math.max(1, cell / 3);
    var drawn = 0;

    for (var qy = -R; qy <= R; qy += cell) {
      for (var qx = -R; qx <= R; qx += cell) {
        var wx = cos * qx - sin * qy + htW / 2;
        var wy = sin * qx + cos * qy + htH / 2;
        if (wx < -cell || wx > htW + cell || wy < -cell || wy > htH + cell) { continue; }
        var r = (1 - avgLum(wx, wy, half)) * cell * 0.72;
        if (r < 0.4) { continue; }
        drawn++;
        if (shape === 'square') {
          ctx.fillRect(wx - r, wy - r, r * 2, r * 2);
        } else if (shape === 'line') {
          ctx.fillRect(wx - cell * 0.62, wy - r * 0.6, cell * 1.24, Math.max(1, r * 1.2));
        } else {
          ctx.beginPath();
          ctx.arc(wx, wy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (htCellOut) { htCellOut.textContent = cell + ' px'; }
    if (htAngleOut) { htAngleOut.textContent = deg + '\u00b0'; }
    if (htStat) {
      htStat.textContent = 'Cell ' + pad(cell, 2) + ' px \u00b7 Angle ' + pad(deg, 3) +
        '\u00b0 \u00b7 ' + shapeName + ' \u00b7 ' + drawn + ' cells';
    }
  }

  function onHtInput() { drawHalftone(); }
  if (htCell) { htCell.addEventListener('input', onHtInput); }
  if (htAngle) { htAngle.addEventListener('input', onHtInput); }
  var htShapes = doc.querySelectorAll('input[name="ht-shape"]');
  for (var hs = 0; hs < htShapes.length; hs++) {
    htShapes[hs].addEventListener('change', onHtInput);
  }

  /* ---------------------------------------------------------
     9. The error — threshold, Bayer matrix, Floyd–Steinberg
     --------------------------------------------------------- */
  var dsCanvas = $('ds-canvas');
  var dsBias = $('ds-bias');
  var dsBiasOut = $('ds-bias-out');
  var dsStat = $('ds-stat');
  var DS = 400;
  var dsField = null;

  var BAYER8 = [
     0, 32,  8, 40,  2, 34, 10, 42,
    48, 16, 56, 24, 50, 18, 58, 26,
    12, 44,  4, 36, 14, 46,  6, 38,
    60, 28, 52, 20, 62, 30, 54, 22,
     3, 35, 11, 43,  1, 33,  9, 41,
    51, 19, 59, 27, 49, 17, 57, 25,
    15, 47,  7, 39, 13, 45,  5, 37,
    63, 31, 55, 23, 61, 29, 53, 21
  ];

  function buildSphere() {
    var f = new Float32Array(DS * DS);
    var cx = DS * 0.42, cy = DS * 0.44, r = DS * 0.26;
    var groundY = DS * 0.66;

    var Lx = -0.52, Ly = -0.62, Lz = 0.59;
    var ln = Math.sqrt(Lx * Lx + Ly * Ly + Lz * Lz);
    Lx /= ln; Ly /= ln; Lz /= ln;

    var Hx = Lx, Hy = Ly, Hz = Lz + 1;
    var hn = Math.sqrt(Hx * Hx + Hy * Hy + Hz * Hz);
    Hx /= hn; Hy /= hn; Hz /= hn;

    for (var y = 0; y < DS; y++) {
      for (var x = 0; x < DS; x++) {
        var i = y * DS + x;
        var dx = x - cx, dy = y - cy;
        var d2 = dx * dx + dy * dy;
        var v;

        if (d2 <= r * r) {
          var nx = dx / r, ny = dy / r;
          var nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
          var lam = nx * Lx + ny * Ly + nz * Lz;
          if (lam < 0) { lam = 0; }
          v = 0.03 + 0.90 * Math.pow(lam, 0.85);
          var sp = nx * Hx + ny * Hy + nz * Hz;
          if (sp > 0) { v += 0.55 * Math.pow(sp, 52); }
          if (ny > 0.25) { v += 0.09 * (ny - 0.25); }
        } else if (y < groundY) {
          v = 0.15 + 0.27 * (y / groundY);
          var gx = x - DS * 0.24, gy = y - DS * 0.14;
          var gd = Math.sqrt(gx * gx + gy * gy) / (DS * 0.72);
          if (gd < 1) { v += 0.18 * (1 - gd); }
        } else {
          var t = (y - groundY) / (DS - groundY);
          v = 0.31 - 0.17 * t;
          var scx = cx + r * 0.78, scy = groundY + r * 0.30;
          var srx = r * 1.45, sry = r * 0.52;
          var qx = (x - scx) / srx, qy = (y - scy) / sry;
          var q = qx * qx + qy * qy;
          if (q < 1) {
            var soft = (1 - q) * 2.6;
            if (soft > 1) { soft = 1; }
            v *= (1 - 0.74 * soft);
          }
        }

        var n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        n = n - Math.floor(n);
        v += (n - 0.5) * 0.03;

        f[i] = v < 0 ? 0 : (v > 1 ? 1 : v);
      }
    }
    return f;
  }

  function applyDither() {
    if (!dsCanvas || !dsField || !dsBias) { return; }
    var modeInput = doc.querySelector('input[name="ds-mode"]:checked');
    var mode = modeInput ? modeInput.value : 'threshold';
    var T = +dsBias.value;
    var out = new Uint8ClampedArray(DS * DS);
    var name;

    if (mode === 'fs') {
      name = 'Floyd\u2013Steinberg';
      var buf = new Float32Array(DS * DS);
      for (var b = 0; b < DS * DS; b++) { buf[b] = dsField[b] * 255; }
      for (var y = 0; y < DS; y++) {
        for (var x = 0; x < DS; x++) {
          var idx = y * DS + x;
          var old = buf[idx];
          var nv = old >= T ? 255 : 0;
          out[idx] = nv;
          var err = old - nv;
          if (x + 1 < DS) { buf[idx + 1] += err * 7 / 16; }
          if (y + 1 < DS) {
            if (x > 0) { buf[idx + DS - 1] += err * 3 / 16; }
            buf[idx + DS] += err * 5 / 16;
            if (x + 1 < DS) { buf[idx + DS + 1] += err * 1 / 16; }
          }
        }
      }
    } else if (mode === 'bayer') {
      name = 'Bayer 8\u00d78';
      for (var y2 = 0; y2 < DS; y2++) {
        for (var x2 = 0; x2 < DS; x2++) {
          var j = y2 * DS + x2;
          var tv = dsField[j] * 255 + (BAYER8[(y2 & 7) * 8 + (x2 & 7)] / 64 - 0.5) * 165;
          out[j] = tv >= T ? 255 : 0;
        }
      }
    } else {
      name = 'Threshold';
      for (var k = 0; k < DS * DS; k++) {
        out[k] = dsField[k] * 255 >= T ? 255 : 0;
      }
    }

    var ctx = dsCanvas.getContext('2d');
    var img = ctx.createImageData(DS, DS);
    var dd = img.data;
    for (var p = 0, q = 0; p < out.length; p++, q += 4) {
      var c = out[p];
      dd[q] = c; dd[q + 1] = c; dd[q + 2] = c; dd[q + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);

    if (dsBiasOut) { dsBiasOut.textContent = pad(T, 3); }
    if (dsStat) {
      var px = (DS * DS).toLocaleString('en-US');
      dsStat.textContent = name + ' \u00b7 ' + px + ' px \u00b7 2 levels \u00b7 T ' + T;
    }
  }

  if (dsBias) { dsBias.addEventListener('input', applyDither); }
  var dsModes = doc.querySelectorAll('input[name="ds-mode"]');
  for (var dm = 0; dm < dsModes.length; dm++) {
    dsModes[dm].addEventListener('change', applyDither);
  }

  /* ---------------------------------------------------------
     10. The shadow — forty stacked copies of one word
     --------------------------------------------------------- */
  var sw = $('shadow-word');
  var sa = $('shadow-angle');
  var saOut = $('shadow-angle-out');
  var sRead = $('shadow-read');
  var shadowQueued = false;

  function cssVar(name) {
    return getComputedStyle(root).getPropertyValue(name);
  }

  function parseColor(c) {
    c = (c || '').trim();
    if (c.charAt(0) === '#') {
      var h = c.slice(1);
      if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    var m = c.match(/\d+(\.\d+)?/g);
    if (m && m.length >= 3) { return [+m[0], +m[1], +m[2]]; }
    return [242, 242, 242];
  }

  var COMPASS = ['to the right', 'to the lower right', 'below', 'to the lower left',
                 'to the left', 'to the upper left', 'above', 'to the upper right'];

  function compass(a) {
    var i = Math.round((((a % 360) + 360) % 360) / 45) % 8;
    return 'Shadow falls ' + COMPASS[i] + '.';
  }

  function buildShadow() {
    if (!sw || !sa) { return; }
    var fg = parseColor(cssVar('--fg'));
    var bg = parseColor(cssVar('--bg'));
    var a = +sa.value;
    var rad = a * Math.PI / 180;
    var dx = Math.cos(rad), dy = Math.sin(rad);
    var parts = [];

    for (var i = 1; i <= 40; i++) {
      var t = i / 40;
      var r = Math.round(fg[0] + (bg[0] - fg[0]) * t);
      var g = Math.round(fg[1] + (bg[1] - fg[1]) * t);
      var bl = Math.round(fg[2] + (bg[2] - fg[2]) * t);
      var off = i * 1.4;
      parts.push((dx * off).toFixed(1) + 'px ' + (dy * off).toFixed(1) +
        'px 0 rgb(' + r + ',' + g + ',' + bl + ')');
    }

    sw.style.textShadow = parts.join(',');
    if (saOut) { saOut.textContent = pad(a, 3) + '\u00b0'; }
    if (sRead) { sRead.textContent = compass(a); }
  }

  function scheduleShadow() {
    if (shadowQueued) { return; }
    shadowQueued = true;
    window.requestAnimationFrame(function () {
      buildShadow();
      shadowQueued = false;
    });
  }

  if (sa) { sa.addEventListener('input', buildShadow); }

  var shadowLab = doc.querySelector('.shadow-lab');
  if (shadowLab && sw && window.matchMedia('(pointer: fine)').matches) {
    shadowLab.addEventListener('pointermove', function (e) {
      if (reduced()) { return; }
      var r = sw.getBoundingClientRect();
      var a = Math.atan2(e.clientY - (r.top + r.height / 2),
                         e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
      var v = Math.round(((a % 360) + 360) % 360);
      if (+sa.value !== v) { sa.value = String(v); scheduleShadow(); }
    });
  }

  /* ---------------------------------------------------------
     11. Lazy plate construction + first paint
     --------------------------------------------------------- */
  function whenNear(el, fn) {
    if (!el) { return; }
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { io.disconnect(); fn(); }
      }
    }, { rootMargin: '300px 0px' });
    io.observe(el);
  }

  whenNear(htCanvas, function () {
    htSrc = buildLandscape();
    drawHalftone();
  });

  whenNear(dsCanvas, function () {
    dsField = buildSphere();
    applyDither();
  });

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  applyTheme(root.getAttribute('data-theme') || 'dark', false);
  paintProgress();

}());

