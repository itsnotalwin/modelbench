/* ACHROMA — app.js
   Zero dependencies. All imagery generated in-browser.
   Strictly monochrome output. */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isFine = window.matchMedia('(pointer: fine)').matches;

  function storeGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function storeSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* file:// may block */ } }

  function copyText(text, statusEl, okMsg) {
    function done() { if (statusEl) { statusEl.textContent = okMsg || ('Copied: ' + text); } }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); done();
    }
  }

  function downloadCanvas(canvas, filename) {
    function save(url) {
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    if (canvas.toBlob) {
      canvas.toBlob(function (blob) {
        if (blob) { save(URL.createObjectURL(blob)); }
        else { save(canvas.toDataURL('image/png')); }
      }, 'image/png');
    } else { save(canvas.toDataURL('image/png')); }
  }

  /* ---------- Theme ---------- */
  var themeBtns = $$('[data-set-theme]');
  function setTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    themeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-set-theme') === name)); });
    storeSet('achroma-theme', name);
  }
  themeBtns.forEach(function (b) { b.addEventListener('click', function () { setTheme(b.getAttribute('data-set-theme')); }); });
  var savedTheme = storeGet('achroma-theme');
  if (savedTheme === 'paper' || savedTheme === 'ash' || savedTheme === 'negative') setTheme(savedTheme);

  /* ---------- Mobile menu ---------- */
  var menuToggle = $('#menu-toggle'), primaryNav = $('#primary-nav');
  if (menuToggle && primaryNav) {
    menuToggle.addEventListener('click', function () {
      var open = primaryNav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.textContent = open ? 'Close' : 'Menu';
    });
    $$('a', primaryNav).forEach(function (a) {
      a.addEventListener('click', function () {
        if (window.innerWidth <= 736) {
          primaryNav.classList.remove('is-open');
          menuToggle.setAttribute('aria-expanded', 'false');
          menuToggle.textContent = 'Menu';
        }
      });
    });
  }

  /* ---------- Scroll progress ---------- */
  var progressBar = $('#scroll-progress-bar');
  if (progressBar) {
    var ticking = false;
    function updateProgress() {
      var h = document.documentElement;
      var max = (h.scrollHeight - h.clientHeight) || 1;
      progressBar.style.width = (window.scrollY / max * 100) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(updateProgress); }
    }, { passive: true });
    updateProgress();
  }

  /* ---------- Footer ---------- */
  var yearEl = $('#footer-year'); if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  var toTop = $('#back-to-top');
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' }); });
  var printBtn = $('#print-page');
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

  /* ---------- Hero canvas (decorative dot field) ---------- */
  (function hero() {
    var cv = $('#hero-canvas'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var W = 0, H = 0, raf = 0, running = false, visible = true;
    var pointer = { x: -9999, y: -9999 };
    function resize() {
      var r = cv.parentElement.getBoundingClientRect();
      W = cv.width = Math.max(1, Math.floor(r.width));
      H = cv.height = Math.max(1, Math.floor(r.height));
      draw(0);
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      var pitch = 16, mx = pointer.x, my = pointer.y;
      ctx.fillStyle = '#000';
      for (var y = 0; y < H; y += pitch) {
        for (var x = 0; x < W; x += pitch) {
          var dx = x - mx, dy = y - my, d = Math.sqrt(dx * dx + dy * dy);
          var wave = prefersReduced ? 0 : Math.sin((x + t * 0.02) * 0.02) * 0.5 + 0.5;
          var near = d < 170 ? (1 - d / 170) : 0;
          var r = 0.6 + wave * 1.1 + near * 3.2;
          ctx.beginPath(); ctx.arc(x + pitch / 2, y + pitch / 2, r, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    function loop(t) { if (!running) return; draw(t || 0); raf = window.requestAnimationFrame(loop); }
    function start() { if (running || prefersReduced) { draw(0); return; } running = true; raf = window.requestAnimationFrame(loop); }
    function stop() { running = false; if (raf) window.cancelAnimationFrame(raf); }
    cv.parentElement.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
      if (prefersReduced) draw(0);
    });
    cv.parentElement.addEventListener('pointerleave', function () { pointer.x = -9999; pointer.y = -9999; if (prefersReduced) draw(0); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); else stop(); }, { threshold: 0 }).observe(cv);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible) start(); });
    if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(cv.parentElement);
    window.addEventListener('resize', resize);
    resize(); start();
  })();

  /* ---------- Timeline ---------- */
  var TIMELINE = [
    { year: '1826', title: 'The first photograph', desc: 'Nicéphore Niépce exposes a pewter plate coated in bitumen for eight hours. The result is not a picture of the world in colour — it is a map of light and dark, grey by necessity.', note: 'A bitumen plate. Eight hours of sun become four greys.', svg: '<svg viewBox="0 0 200 120" focusable="false"><rect x="10" y="10" width="180" height="100" fill="none" stroke="currentColor" stroke-width="2"/><rect x="30" y="30" width="60" height="40" fill="currentColor" opacity="0.85"/><rect x="100" y="30" width="30" height="40" fill="currentColor" opacity="0.5"/><rect x="140" y="50" width="30" height="40" fill="currentColor" opacity="0.2"/><line x1="10" y1="90" x2="190" y2="90" stroke="currentColor" stroke-width="1"/></svg>' },
    { year: '1839', title: 'Daguerreotype', desc: 'Louis Daguerre announces a silvered copper plate that records a view in minutes. The image is a mirror: polished, fragile, and entirely a negotiation between black and white.', note: 'A mirror that remembers. Shadows are literal silver, highlights are polished plate.', svg: '<svg viewBox="0 0 200 120" focusable="false"><rect x="40" y="14" width="120" height="92" fill="none" stroke="currentColor" stroke-width="2"/><rect x="52" y="26" width="96" height="68" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="80" cy="52" r="16" fill="currentColor" opacity="0.8"/><rect x="106" y="44" width="26" height="30" fill="currentColor" opacity="0.35"/><path d="M52 84 L148 84" stroke="currentColor" stroke-width="4"/></svg>' },
    { year: 'c. 1881', title: 'Halftone screen', desc: 'William Henry Fox Talbot patents the idea of printing tone with dots — a photographic screen that breaks a continuous grey into a grid of black points. Every newspaper photograph since is this trick.', note: 'Grey, faked. A screen of dots the eye averages into tone at reading distance.', svg: '<svg viewBox="0 0 200 120" focusable="false"><g fill="currentColor"><circle cx="40" cy="30" r="3"/><circle cx="55" cy="30" r="3"/><circle cx="70" cy="30" r="5"/><circle cx="85" cy="30" r="7"/><circle cx="100" cy="30" r="9"/><circle cx="40" cy="47" r="4"/><circle cx="55" cy="47" r="6"/><circle cx="70" cy="47" r="8"/><circle cx="85" cy="47" r="9"/><circle cx="100" cy="47" r="10"/><circle cx="115" cy="47" r="7"/><circle cx="40" cy="64" r="6"/><circle cx="55" cy="64" r="8"/><circle cx="70" cy="64" r="10"/><circle cx="85" cy="64" r="10"/><circle cx="100" cy="64" r="8"/><circle cx="115" cy="64" r="5"/><circle cx="130" cy="64" r="3"/></g><rect x="10" y="10" width="180" height="100" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
    { year: '1928', title: 'Television in grey', desc: 'Mechanical and then electronic television arrives as pure luminance. For thirty years, the living room receives the world in flickering greys — and nobody misses colour, because it was never promised.', note: 'A cathode ray painting in phosphor grey. Scanlines are the first dither most people ever saw.', svg: '<svg viewBox="0 0 200 120" focusable="false"><rect x="30" y="18" width="140" height="84" fill="none" stroke="currentColor" stroke-width="2"/><rect x="42" y="30" width="116" height="60" fill="none" stroke="currentColor" stroke-width="1"/><g stroke="currentColor" stroke-width="1" opacity="0.6"><line x1="42" y1="40" x2="158" y2="40"/><line x1="42" y1="50" x2="158" y2="50"/><line x1="42" y1="60" x2="158" y2="60"/><line x1="42" y1="70" x2="158" y2="70"/><line x1="42" y1="80" x2="158" y2="80"/></g><circle cx="100" cy="60" r="14" fill="currentColor"/></svg>' },
    { year: '1959', title: 'The photocopy', desc: 'The Xerox 914 puts xerography on every office desk. Toner is black, paper is white, and the machine’s entire intelligence is deciding, pixel by pixel, which side of the line a grey falls on.', note: 'A million copies, each one a halftone argument about where light ends.', svg: '<svg viewBox="0 0 200 120" focusable="false"><rect x="20" y="20" width="160" height="12" fill="currentColor"/><rect x="20" y="40" width="120" height="12" fill="currentColor" opacity="0.7"/><rect x="20" y="60" width="145" height="12" fill="currentColor" opacity="0.45"/><rect x="20" y="80" width="80" height="12" fill="currentColor" opacity="0.25"/><rect x="10" y="10" width="180" height="100" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
    { year: '1994', title: 'QR code', desc: 'Denso Wave encodes a URL as black modules on white. It must work in bad light, at an angle, on a dirty sticker — so it uses the maximum contrast the world allows: black versus white, nothing in between.', note: 'Three finder squares and a grid of modules. The most reliable colour is no colour.', svg: '<svg viewBox="0 0 200 120" focusable="false"><g fill="currentColor"><rect x="30" y="20" width="20" height="20"/><rect x="34" y="24" width="12" height="12" fill="#fff"/><rect x="38" y="28" width="4" height="4"/><rect x="90" y="20" width="20" height="20"/><rect x="94" y="24" width="12" height="12" fill="#fff"/><rect x="30" y="80" width="20" height="20"/><rect x="34" y="84" width="12" height="12" fill="#fff"/><rect x="60" y="20" width="8" height="8"/><rect x="60" y="36" width="8" height="8"/><rect x="122" y="20" width="8" height="8"/><rect x="60" y="60" width="8" height="8"/><rect x="78" y="60" width="8" height="8"/><rect x="122" y="44" width="8" height="8"/><rect x="122" y="80" width="8" height="8"/><rect x="140" y="80" width="8" height="8"/><rect x="60" y="80" width="8" height="8"/></g><rect x="20" y="10" width="160" height="100" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
    { year: '2026', title: 'This website', desc: 'ACHROMA is the current state of the art: no colour, no images, no fonts loaded — only 101 greys and code that draws everything live. The exhibition is also the artefact.', note: 'You are in it. Scroll down; every canvas below is drawing itself right now.', svg: '<svg viewBox="0 0 200 120" focusable="false"><rect x="10" y="10" width="180" height="100" fill="none" stroke="currentColor" stroke-width="2"/><g><rect x="26" y="26" width="20" height="72" fill="currentColor"/><rect x="52" y="26" width="20" height="72" fill="currentColor" opacity="0.85"/><rect x="78" y="26" width="20" height="72" fill="currentColor" opacity="0.7"/><rect x="104" y="26" width="20" height="72" fill="currentColor" opacity="0.5"/><rect x="130" y="26" width="20" height="72" fill="currentColor" opacity="0.25"/><rect x="156" y="26" width="20" height="72" fill="currentColor" opacity="0.08"/></g></svg>' }
  ];
  var tlBtns = $$('.timeline-btn');
  var detailYear = $('#detail-year'), detailTitle = $('#detail-title'), detailDesc = $('#detail-desc'), detailNote = $('#detail-note'), detailFig = $('#detail-figure');
  function setTimeline(i) {
    var d = TIMELINE[i]; if (!d) return;
    tlBtns.forEach(function (b, j) {
      var on = j === i;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    if (detailYear) detailYear.textContent = d.year;
    if (detailTitle) detailTitle.textContent = d.title;
    if (detailDesc) detailDesc.textContent = d.desc;
    if (detailNote) detailNote.textContent = d.note;
    if (detailFig) detailFig.innerHTML = d.svg;
  }
  tlBtns.forEach(function (btn, i) {
    btn.addEventListener('click', function () { setTimeline(i); });
    btn.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % tlBtns.length;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + tlBtns.length) % tlBtns.length;
      if (n !== null) { e.preventDefault(); tlBtns[n].focus(); setTimeline(n); }
    });
  });
  if (tlBtns.length) setTimeline(0);

  /* ---------- Halftone lab ---------- */
  (function halftone() {
    var cv = $('#halftone-canvas'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var state = { pitch: 14, angle: 22, ink: 0.65, invert: false, animate: !prefersReduced, seed: 7, pointer: { x: -9999, y: -9999, active: false } };
    var raf = 0, running = false, visible = true;
    var pitch = $('#halftone-pitch'), angle = $('#halftone-angle'), ink = $('#halftone-ink');
    var pitchOut = $('#halftone-pitch-out'), angleOut = $('#halftone-angle-out'), inkOut = $('#halftone-ink-out');
    var status = $('#halftone-status');
    var W = cv.width, H = cv.height, t = 0;

    function pseudo(x, y, s) { var n = Math.sin(x * 12.9898 + y * 78.233 + s * 37.719) * 43758.5453; return n - Math.floor(n); }
    function draw() {
      var bg = state.invert ? '#000' : '#fff';
      var fg = state.invert ? '#fff' : '#000';
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = fg;
      var rad = state.angle * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
      var cx = W / 2, cy = H / 2, maxR = state.pitch * 0.62;
      for (var y = 0; y < H + state.pitch; y += state.pitch) {
        for (var x = 0; x < W + state.pitch; x += state.pitch) {
          var rx = x - cx, ry = y - cy;
          var gx = rx * cos - ry * sin + cx, gy = rx * sin + ry * cos + cy;
          var wave = Math.sin((x * 0.012) + t * 0.9 + Math.cos(y * 0.01)) * 0.4 + 0.6;
          var tone = state.ink * wave * (0.75 + pseudo(x, y, state.seed) * 0.5);
          if (state.pointer.active) {
            var dx = x - state.pointer.x, dy = y - state.pointer.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < 160) tone = clamp(tone + (1 - d / 160) * 0.9, 0, 1.15);
          }
          var r = tone * maxR;
          if (r > 0.25) { ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      if (status) status.textContent = 'Halftone: pitch ' + state.pitch + ' pixels, angle ' + state.angle + ' degrees, ink ' + Math.round(state.ink * 100) + ' percent' + (state.invert ? ', inverted' : '');
    }
    function loop() { if (!running) return; t += 0.016; draw(); raf = window.requestAnimationFrame(loop); }
    function start() { if (running || !state.animate) return; running = true; raf = window.requestAnimationFrame(loop); }
    function stop() { running = false; if (raf) window.cancelAnimationFrame(raf); }
    function sync() {
      state.pitch = +pitch.value; state.angle = +angle.value; state.ink = +ink.value / 100;
      pitchOut.textContent = state.pitch + ' px'; angleOut.textContent = state.angle + '°'; inkOut.textContent = ink.value + '%';
      draw();
    }
    [pitch, angle, ink].forEach(function (el) { if (el) el.addEventListener('input', sync); });
    cv.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect();
      state.pointer.x = (e.clientX - r.left) * (W / r.width); state.pointer.y = (e.clientY - r.top) * (H / r.height); state.pointer.active = true;
      if (!state.animate) draw();
    });
    cv.addEventListener('pointerleave', function () { state.pointer.active = false; if (!state.animate) draw(); });
    cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
    var inv = $('#halftone-invert');
    if (inv) inv.addEventListener('click', function () { state.invert = !state.invert; inv.setAttribute('aria-pressed', String(state.invert)); inv.textContent = state.invert ? 'Uninvert field' : 'Invert field'; draw(); });
    var animBtn = $('#halftone-animate');
    function syncAnimBtn() { if (animBtn) { animBtn.setAttribute('aria-pressed', String(!state.animate)); animBtn.textContent = state.animate ? 'Pause motion' : 'Resume motion'; } }
    if (animBtn) animBtn.addEventListener('click', function () { state.animate = !state.animate; syncAnimBtn(); if (state.animate) start(); else { stop(); draw(); } });
    var rnd = $('#halftone-random');
    if (rnd) rnd.addEventListener('click', function () { state.seed = (state.seed + 1) % 1000; draw(); });
    var dl = $('#halftone-download');
    if (dl) dl.addEventListener('click', function () { downloadCanvas(cv, 'achroma-halftone.png'); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible && state.animate) start(); else stop(); }, { threshold: 0.05 }).observe(cv);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible && state.animate) start(); });
    syncAnimBtn(); sync();
  })();

  /* ---------- Optical rooms ---------- */
  /* Mach bands */
  (function mach() {
    var bar = $('#mach-bar'), range = $('#mach-strength'), out = $('#mach-strength-out');
    if (!bar || !range) return;
    function update() {
      var s = +range.value / 100;
      var edge = clamp(0.55 * s, 0, 1), mid = clamp(0.62 - 0.18 * s, 0, 1);
      function g(v) { return Math.round(v * 255); }
      var stops = [g(edge), g(mid), g(mid), g(edge)].map(function (v) { return 'rgb(' + v + ',' + v + ',' + v + ')'; });
      bar.style.background = 'linear-gradient(90deg,' + stops[0] + ' 0%,' + stops[1] + ' 22%,' + stops[2] + ' 78%,' + stops[3] + ' 100%)';
      out.textContent = range.value + '%';
    }
    range.addEventListener('input', update); update();
  })();

  /* Hermann grid */
  (function hermann() {
    var grid = $('#hermann'), dotsWrap = $('#hermann-dots'), range = $('#hermann-gap'), out = $('#hermann-gap-out'), toggle = $('#hermann-dots-toggle');
    if (!grid || !range) return;
    var cols = 5, rows = 5, dotsShown = true;
    for (var i = 0; i < cols * rows; i++) grid.appendChild(document.createElement('i'));
    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      if (!dotsShown) return;
      var r = grid.getBoundingClientRect(), wr = dotsWrap.getBoundingClientRect();
      for (var c = 1; c < cols; c++) for (var rr = 1; rr < rows; rr++) {
        var b = document.createElement('b');
        var gx = (r.left - wr.left) + (r.width / cols) * c;
        var gy = (r.top - wr.top) + (r.height / rows) * rr;
        b.style.left = gx + 'px'; b.style.top = gy + 'px';
        dotsWrap.appendChild(b);
      }
    }
    function update() {
      grid.style.gap = range.value + 'px';
      grid.style.inset = (10 + (+range.value)) + 'px';
      out.textContent = range.value + ' px';
      buildDots();
    }
    range.addEventListener('input', update);
    if (toggle) toggle.addEventListener('click', function () { dotsShown = !dotsShown; toggle.setAttribute('aria-pressed', String(dotsShown)); toggle.textContent = dotsShown ? 'Show intersection dots' : 'Hide intersection dots'; buildDots(); });
    if (window.ResizeObserver && dotsWrap) new ResizeObserver(buildDots).observe(grid);
    window.addEventListener('resize', buildDots);
    update();
  })();

  /* Checker shadow — same centre grey, contrasting surrounds */
  (function shadow() {
    var range = $('#shadow-opacity'), out = $('#shadow-opacity-out'), tileA = $('#shadow-tile-a'), tileB = $('#shadow-tile-b'), reveal = $('#shadow-reveal'), readout = $('#shadow-readout');
    if (!range || !tileA || !tileB) return;
    function grey(v) { v = Math.round(clamp(v, 0, 255)); return 'rgb(' + v + ',' + v + ',' + v + ')'; }
    function update() {
      var depth = +range.value / 100; /* 0..0.8 */
      var light = 128 + depth * 127;  /* surround A: #808080 → white */
      var dark = 128 - depth * 128;   /* surround B: #808080 → black */
      tileA.style.background = grey(light);
      tileB.style.background = grey(dark);
      if (out) out.textContent = range.value + '%';
    }
    range.addEventListener('input', update);
    if (reveal) reveal.addEventListener('click', function () {
      var on = reveal.getAttribute('aria-pressed') !== 'true';
      reveal.setAttribute('aria-pressed', String(on));
      reveal.textContent = on ? 'Hide the truth' : 'Reveal the truth';
      if (on) { tileA.style.background = '#808080'; tileB.style.background = '#808080'; if (readout) readout.textContent = 'Revealed: with both surrounds at #808080 the squares merge into one field. The difference was never in the ink.'; }
      else { update(); if (readout) readout.textContent = 'Centre A and centre B are both #808080 — only their surrounds differ.'; }
    });
    update();
  })();

  /* Explanations */
  $$('[data-explain]').forEach(function (btn) {
    var id = btn.getAttribute('data-explain'), panel = id && document.getElementById(id);
    if (!panel) return;
    btn.addEventListener('click', function () {
      var open = panel.hasAttribute('hidden');
      if (open) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Hide explanation' : 'How it works';
    });
  });

  /* ---------- Dither engine ---------- */
  (function dither() {
    var cv = $('#dither-canvas'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var DW = cv.width, DH = cv.height;
    var state = { scene: 'hills', method: 'bayer4', threshold: 0.5, invert: false, animate: !prefersReduced, phase: 0 };
    var threshold = $('#dither-threshold'), thresholdOut = $('#dither-threshold-out');
    var caption = $('#dither-caption'), status = $('#dither-status');
    var raf = 0, running = false, visible = true, last = 0;
    var SCENE_NAMES = { hills: 'Hills', wave: 'Wave', rings: 'Rings', grid: 'Grid' };
    var METHOD_NAMES = { threshold: 'Threshold', bayer2: 'Bayer 2×2', bayer4: 'Bayer 4×4', bayer8: 'Bayer 8×8', floyd: 'Floyd–Steinberg' };

    function bayer(n) {
      if (n === 2) return [[0, 2], [3, 1]];
      if (n === 4) return [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      var m4 = bayer(4), m8 = [];
      for (var y = 0; y < 8; y++) { m8[y] = []; for (var x = 0; x < 8; x++) { m8[y][x] = m4[y % 4][x % 4] * 4 + m4[Math.floor(y / 4)][Math.floor(x / 4)]; } }
      return m8;
    }
    var MATRICES = { bayer2: bayer(2), bayer4: bayer(4), bayer8: bayer(8) };

    function source(x, y, scene, phase) {
      var u = x / DW, v = y / DH;
      if (scene === 'hills') return clamp(0.5 + Math.sin(u * 6 + phase) * 0.22 + Math.cos(v * 9 + phase * 0.6) * 0.18 + (0.5 - v) * 0.45, 0, 1);
      if (scene === 'wave') return clamp(0.5 + Math.sin(u * 14 + phase * 1.4 + Math.sin(v * 10) * 2.2) * 0.48, 0, 1);
      if (scene === 'rings') { var d = Math.sqrt(Math.pow(u - 0.5, 2) + Math.pow((v - 0.5) * 1.6, 2)); return clamp(0.5 + Math.sin(d * 26 - phase * 1.1) * 0.5, 0, 1); }
      /* grid */
      var gx = (Math.floor(u * 8) % 2), gy = (Math.floor(v * 6) % 2);
      var checker = (gx + gy) % 2 ? 0.82 : 0.18;
      return clamp(checker * 0.7 + Math.sin(u * 6 + phase) * 0.15 + 0.12, 0, 1);
    }

    function render() {
      var img = ctx.createImageData(DW, DH);
      var buf = new Float32Array(DW * DH);
      for (var y = 0; y < DH; y++) for (var x = 0; x < DW; x++) buf[y * DW + x] = source(x, y, state.scene, state.phase);
      var out = new Uint8Array(DW * DH);
      if (state.method === 'floyd') {
        var work = new Float32Array(buf);
        for (var y2 = 0; y2 < DH; y2++) for (var x2 = 0; x2 < DW; x2++) {
          var idx = y2 * DW + x2, old = work[idx];
          var nv = old >= state.threshold ? 1 : 0;
          out[idx] = nv;
          var err = old - nv;
          if (x2 + 1 < DW) work[idx + 1] += err * 7 / 16;
          if (y2 + 1 < DH) {
            if (x2 > 0) work[idx + DW - 1] += err * 3 / 16;
            work[idx + DW] += err * 5 / 16;
            if (x2 + 1 < DW) work[idx + DW + 1] += err * 1 / 16;
          }
        }
      } else if (state.method === 'threshold') {
        for (var i = 0; i < buf.length; i++) out[i] = buf[i] >= state.threshold ? 1 : 0;
      } else {
        var m = MATRICES[state.method], n = m.length, maxv = n * n - 1;
        for (var y3 = 0; y3 < DH; y3++) for (var x3 = 0; x3 < DW; x3++) {
          var idx3 = y3 * DW + x3;
          var t = (m[y3 % n][x3 % n] + 0.5) / (maxv + 1) - 0.5;
          var adj = buf[idx3] + t * 1.1;
          out[idx3] = adj >= state.threshold ? 1 : 0;
        }
      }
      for (var k = 0; k < out.length; k++) {
        var on = out[k] === 1;
        if (state.invert) on = !on;
        var v = on ? 255 : 0, p = k * 4;
        img.data[p] = v; img.data[p + 1] = v; img.data[p + 2] = v; img.data[p + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      if (caption) caption.textContent = 'Fig. 02 — ' + SCENE_NAMES[state.scene] + ', ' + METHOD_NAMES[state.method] + '. Two inks, infinite suggestion.';
      if (status) status.textContent = 'Dither: ' + SCENE_NAMES[state.scene] + ' with ' + METHOD_NAMES[state.method] + ' at threshold ' + Math.round(state.threshold * 100) + ' percent';
    }
    function loop(ts) { if (!running) return; if (ts - last > 66) { state.phase += 0.05; last = ts; render(); } raf = window.requestAnimationFrame(loop); }
    function start() { if (running || !state.animate) return; running = true; last = 0; raf = window.requestAnimationFrame(loop); }
    function stop() { running = false; if (raf) window.cancelAnimationFrame(raf); }
    function sync() { state.threshold = +threshold.value / 100; thresholdOut.textContent = threshold.value + '%'; render(); }
    if (threshold) threshold.addEventListener('input', sync);
    $$('.scene-btn').forEach(function (b) { b.addEventListener('click', function () { state.scene = b.getAttribute('data-scene'); $$('.scene-btn').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); render(); }); });
    $$('.dither-btn').forEach(function (b) { b.addEventListener('click', function () { state.method = b.getAttribute('data-method'); $$('.dither-btn').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); render(); }); });
    var inv = $('#dither-invert');
    if (inv) inv.addEventListener('click', function () { state.invert = !state.invert; inv.setAttribute('aria-pressed', String(state.invert)); render(); });
    var animBtn = $('#dither-animate');
    function syncAnim() { if (animBtn) { animBtn.setAttribute('aria-pressed', String(!state.animate)); animBtn.textContent = state.animate ? 'Pause motion' : 'Resume motion'; } }
    if (animBtn) animBtn.addEventListener('click', function () { state.animate = !state.animate; syncAnim(); if (state.animate) start(); else { stop(); render(); } });
    var dl = $('#dither-download');
    if (dl) dl.addEventListener('click', function () { downloadCanvas(cv, 'achroma-dither-' + state.scene + '-' + state.method + '.png'); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible && state.animate) start(); else stop(); }, { threshold: 0.05 }).observe(cv);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible && state.animate) start(); });
    syncAnim(); render(); start();
  })();

  /* ---------- Grey scale ---------- */
  (function scale() {
    var rail = $('#scale-rail'), cells = $('#scale-cells'), cursor = $('#scale-cursor');
    if (!rail || !cells) return;
    var N = 101, value = 50;
    for (var i = 0; i < N; i++) {
      var c = document.createElement('i');
      var v = Math.round(i * 255 / 100);
      c.style.background = 'rgb(' + v + ',' + v + ',' + v + ')';
      cells.appendChild(c);
    }
    var hexEl = $('#scale-hex'), nameEl = $('#scale-name'), lightEl = $('#scale-light');
    var vsBlack = $('#scale-vs-black'), vsWhite = $('#scale-vs-white'), aaW = $('#scale-aa-white'), aaB = $('#scale-aa-black');
    function hexOf(v) { var h = v.toString(16).padStart(2, '0'); return ('#' + h + h + h).toUpperCase(); }
    function lum(v) {
      var c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    function ratio(a, b) { var l1 = Math.max(lum(a), lum(b)), l2 = Math.min(lum(a), lum(b)); return (l1 + 0.05) / (l2 + 0.05); }
    function nameFor(p) {
      if (p === 0) return 'Pure black';
      if (p === 100) return 'Pure white';
      if (p < 12) return 'Near black';
      if (p < 30) return 'Charcoal';
      if (p < 45) return 'Dark grey';
      if (p < 58) return 'Neutral grey';
      if (p < 75) return 'Mid grey';
      if (p < 90) return 'Light grey';
      return 'Near white';
    }
    function aaText(r) { if (r >= 7) return 'AAA — excellent for all text'; if (r >= 4.5) return 'AA — fine for body text'; if (r >= 3) return 'AA for large text only'; return 'Fails — do not set text in this grey'; }
    function update() {
      var v = Math.round(value * 255 / 100);
      var hex = hexOf(v);
      rail.setAttribute('aria-valuenow', String(value));
      rail.setAttribute('aria-valuetext', hex + ', ' + value + ' percent light');
      cursor.style.left = 'calc(' + value + '% / 100 * 100%)';
      if (hexEl) hexEl.textContent = hex;
      if (nameEl) nameEl.textContent = nameFor(value);
      if (lightEl) lightEl.textContent = value + '%';
      var rb = ratio(v, 0), rw = ratio(v, 255);
      if (vsBlack) vsBlack.textContent = rb.toFixed(2) + ' : 1';
      if (vsWhite) vsWhite.textContent = rw.toFixed(2) + ' : 1';
      if (aaW) aaW.textContent = aaText(rw);
      if (aaB) aaB.textContent = aaText(rb);
    }
    function setVal(n) { value = clamp(Math.round(n), 0, 100); update(); }
    rail.addEventListener('click', function (e) {
      var r = cells.getBoundingClientRect();
      setVal((e.clientX - r.left) / r.width * 100);
      rail.focus();
    });
    rail.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 1, handled = true;
      if (e.key === 'ArrowRight') setVal(value + step);
      else if (e.key === 'ArrowLeft') setVal(value - step);
      else if (e.key === 'ArrowUp') setVal(value + step);
      else if (e.key === 'ArrowDown') setVal(value - step);
      else if (e.key === 'Home') setVal(0);
      else if (e.key === 'End') setVal(100);
      else if (e.key === 'PageUp') setVal(value + 10);
      else if (e.key === 'PageDown') setVal(value - 10);
      else handled = false;
      if (handled) e.preventDefault();
    });
    var copyB = $('#scale-copy');
    if (copyB) copyB.addEventListener('click', function () { copyText(hexEl.textContent, $('#scale-copy-status')); });
    var rnd = $('#scale-random');
    if (rnd) rnd.addEventListener('click', function () { setVal(Math.floor(Math.random() * 101)); });
    var blk = $('#scale-black'); if (blk) blk.addEventListener('click', function () { setVal(0); });
    var wht = $('#scale-white'); if (wht) wht.addEventListener('click', function () { setVal(100); });
    update();
  })();

  /* ---------- Type tester ---------- */
  (function typeTester() {
    var text = $('#type-text'), preview = $('#type-preview'), cssOut = $('#type-css');
    if (!text || !preview || !cssOut) return;
    var size = $('#type-size'), weight = $('#type-weight'), tracking = $('#type-tracking'), leading = $('#type-leading');
    var sizeOut = $('#type-size-out'), weightOut = $('#type-weight-out'), trackingOut = $('#type-tracking-out'), leadingOut = $('#type-leading-out');
    function update() {
      var str = text.value.trim() || 'Grey is not a colour. It is a decision.';
      preview.textContent = str;
      var lh = (+leading.value / 100).toFixed(2), ls = (+tracking.value / 100).toFixed(2);
      preview.style.fontSize = size.value + 'px';
      preview.style.fontWeight = weight.value;
      preview.style.letterSpacing = ls + 'em';
      preview.style.lineHeight = lh;
      if (sizeOut) sizeOut.textContent = size.value + ' px';
      if (weightOut) weightOut.textContent = weight.value;
      if (trackingOut) trackingOut.textContent = (ls > 0 ? '+' : '') + ls + ' em';
      if (leadingOut) leadingOut.textContent = lh;
      cssOut.textContent = '.specimen {\n' +
        '  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;\n' +
        '  font-size: ' + size.value + 'px;\n' +
        '  font-weight: ' + weight.value + ';\n' +
        '  letter-spacing: ' + ls + 'em;\n' +
        '  line-height: ' + lh + ';\n' +
        '  color: #111;\n' +
        '  background: #fff;\n' +
        '}';
    }
    [size, weight, tracking, leading].forEach(function (el) { if (el) el.addEventListener('input', update); });
    text.addEventListener('input', update);
    $$('.type-preset').forEach(function (b) { b.addEventListener('click', function () { text.value = b.getAttribute('data-preset'); update(); text.focus(); }); });
    var copyB = $('#type-copy');
    if (copyB) copyB.addEventListener('click', function () { copyText(cssOut.textContent, $('#type-copy-status'), 'CSS copied to clipboard.'); });
    update();
  })();

})();
