/* ═══════════════════════════════════════════════════════════════
   PENUMBRA — interaction layer
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── 1 · scroll progress ──────────────────────────────────── */
  (function progress() {
    var bar = $('#progress');
    if (!bar) return;
    var ticking = false;
    function update() {
      var el = document.documentElement;
      var max = el.scrollHeight - el.clientHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      ticking = false;
    }
    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  })();

  /* ── 2 · hero field ───────────────────────────────────────── */
  (function hero() {
    var canvas = $('#heroField');
    if (!canvas || !window.Art) return;
    var ctx = canvas.getContext('2d');
    var seed = 20261123;
    var opts = window.Art.setup(seed, {});
    var raf = null;
    var running = false;
    var last = 0;
    var visible = true;

    function paint(t) {
      var size = window.Art.fit(canvas, 1);
      window.Art.draw(ctx, size.w, size.h, 'field', opts, t);
    }

    function loop(now) {
      raf = null;
      if (!running) return;
      if (now - last > 32) { // ~30fps cap
        last = now;
        paint(now);
      }
      raf = window.requestAnimationFrame(loop);
    }

    function start() {
      if (running || reduceMotion.matches || !visible) return;
      running = true;
      last = 0;
      raf = window.requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      if (raf) { window.cancelAnimationFrame(raf); raf = null; }
    }

    paint(0);
    if (!reduceMotion.matches) start();

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      }, { threshold: 0 }).observe(canvas);
    }

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        paint(window.performance ? performance.now() : Date.now());
      }, 180);
    }, { passive: true });

    if (reduceMotion.addEventListener) {
      reduceMotion.addEventListener('change', function () {
        if (reduceMotion.matches) { stop(); paint(0); } else { start(); }
      });
    }
  })();

  /* ── 3 · split statement into words ───────────────────────── */
  (function splitLede() {
    var lede = $('#lede');
    if (!lede) return;
    var text = lede.textContent;
    var words = text.split(/(\s+)/);
    var frag = document.createDocumentFragment();
    var index = 0;
    words.forEach(function (tok) {
      if (!tok) return;
      if (/^\s+$/.test(tok)) {
        frag.appendChild(document.createTextNode(tok));
      } else {
        var span = document.createElement('span');
        span.className = 'wd';
        span.style.setProperty('--wi', index);
        span.textContent = tok;
        frag.appendChild(span);
        index++;
      }
    });
    lede.textContent = '';
    lede.appendChild(frag);
  })();

  /* ── 4 · reveal on scroll ─────────────────────────────────── */
  (function reveals() {
    var lede = $('#lede');
    var items = $$('.reveal, .note, .lede');
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });

    items.forEach(function (el) {
      if (el === lede) return;
      io.observe(el);
    });
    if (lede) io.observe(lede);
  })();

  /* ── 5 · gallery cards ────────────────────────────────────── */
  (function gallery() {
    var cards = $$('.work-btn');
    if (!cards.length || !window.Art) return;

    function paintCard(card) {
      var canvas = $('canvas', card);
      if (!canvas) return;
      var mode = card.getAttribute('data-mode');
      var seed = parseInt(card.getAttribute('data-seed'), 10) || 1;
      var ctx = canvas.getContext('2d');
      var size = window.Art.fit(canvas, 2);
      window.Art.draw(ctx, size.w, size.h, mode, window.Art.setup(seed, {}));
    }

    var pending = null;
    function paintAll() {
      cards.forEach(paintCard);
    }
    function schedule() {
      if (pending) return;
      pending = window.requestAnimationFrame(function () {
        pending = null;
        paintAll();
      });
    }

    // initial paint after layout settles
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(paintAll);
    });

    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(function () { schedule(); });
      cards.forEach(function (c) {
        var frame = $('.frame', c);
        if (frame) ro.observe(frame);
      });
    } else {
      window.addEventListener('resize', schedule, { passive: true });
    }

    // expose for the dialog
    window.__paintCard = paintCard;
  })();

  /* ── 6 · work dialog ──────────────────────────────────────── */
  (function dialog() {
    var dlg = $('#dlg');
    if (!dlg || !window.Art) return;

    var canvas = $('#dlgCanvas');
    var ctx = canvas.getContext('2d');
    var stage = $('#dlgStage');
    var titleEl = $('#dlg-title');
    var medEl = $('#dlg-med');
    var seedInput = $('#seedInput');
    var scaleInput = $('#scaleInput');
    var contrastInput = $('#contrastInput');
    var scaleOut = $('#scaleOut');
    var contrastOut = $('#contrastOut');
    var invertBtn = $('#invertBtn');
    var closeBtn = $('#closeBtn');
    var saveBtn = $('#saveBtn');
    var reseedBtn = $('#reseedBtn');
    var resetBtn = $('#resetBtn');

    var state = { mode: 'contour', seed: 1841, scale: 1, contrast: 1, invert: false };
    var lastFocus = null;

    function readState() {
      state.scale = parseInt(scaleInput.value, 10) / 100;
      state.contrast = parseInt(contrastInput.value, 10) / 100;
      state.seed = parseInt(seedInput.value, 10);
      if (!isFinite(state.seed) || state.seed < 1) state.seed = 1;
      if (state.seed > 99999) state.seed = 99999;
    }

    function syncOutputs() {
      scaleOut.textContent = state.scale.toFixed(2);
      contrastOut.textContent = state.contrast.toFixed(2);
      invertBtn.setAttribute('aria-checked', state.invert ? 'true' : 'false');
    }

    function paint() {
      var size = window.Art.fit(canvas, 2);
      window.Art.draw(ctx, size.w, size.h, state.mode, window.Art.setup(state.seed, state));
      canvas.setAttribute('aria-label', window.Art.label(state.mode) +
        ' Seed ' + state.seed + '. Scale ' + state.scale.toFixed(2) +
        ', contrast ' + state.contrast.toFixed(2) + (state.invert ? ', inverted.' : '.'));
    }

    function open(card) {
      var mode = card.getAttribute('data-mode');
      var seed = parseInt(card.getAttribute('data-seed'), 10) || 1;
      var name = $('.work-name', card);
      var med = $('.work-med', card);

      lastFocus = document.activeElement;
      state = { mode: mode, seed: seed, scale: 1, contrast: 1, invert: false };

      titleEl.textContent = name ? name.textContent : 'Study';
      medEl.textContent = med ? med.textContent : '';

      seedInput.value = String(state.seed);
      scaleInput.value = '100';
      contrastInput.value = '100';
      syncOutputs();

      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
      document.body.classList.add('is-locked');

      window.requestAnimationFrame(function () {
        paint();
        closeBtn.focus();
      });
    }

    function close() {
      if (typeof dlg.close === 'function') dlg.close();
      else { dlg.removeAttribute('open'); document.body.classList.remove('is-locked'); }
    }

    dlg.addEventListener('close', function () {
      document.body.classList.remove('is-locked');
      if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus();
      }
    });

    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) close();
    });

    $$('.work-btn').forEach(function (card) {
      card.addEventListener('click', function () { open(card); });
    });

    closeBtn.addEventListener('click', close);

    seedInput.addEventListener('input', function () {
      readState();
      syncOutputs();
      paint();
    });

    [scaleInput, contrastInput].forEach(function (input) {
      input.addEventListener('input', function () {
        readState();
        syncOutputs();
        paint();
      });
    });

    invertBtn.addEventListener('click', function () {
      state.invert = !state.invert;
      syncOutputs();
      paint();
    });

    reseedBtn.addEventListener('click', function () {
      var next = Math.floor(Math.random() * 99998) + 1;
      seedInput.value = String(next);
      readState();
      syncOutputs();
      paint();
      seedInput.focus();
      seedInput.select();
    });

    resetBtn.addEventListener('click', function () {
      state.scale = 1; state.contrast = 1; state.invert = false; state.seed = 1841;
      scaleInput.value = '100';
      contrastInput.value = '100';
      seedInput.value = '1841';
      syncOutputs();
      paint();
    });

    saveBtn.addEventListener('click', function () {
      try {
        var url = canvas.toDataURL('image/png');
        var a = document.createElement('a');
        a.href = url;
        a.download = 'penumbra-' + state.mode + '-' + state.seed + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        var old = saveBtn.textContent;
        saveBtn.textContent = 'Saved';
        window.setTimeout(function () { saveBtn.textContent = old; }, 1400);
      } catch (err) {
        saveBtn.textContent = 'Unavailable';
        window.setTimeout(function () { saveBtn.textContent = 'Save PNG'; }, 1600);
      }
    });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (!dlg.hasAttribute('open')) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(paint, 140);
    }, { passive: true });

    // keep an external handle for potential reuse
    window.__openWork = open;
  })();

  /* ── 7 · grey scale ───────────────────────────────────────── */
  (function scale() {
    var list = $('#scaleList');
    if (!list) return;

    var swatches = $$('.swatch', list);
    var preview = $('#roPreview');
    var nameEl = $('#roName');
    var hexEl = $('#roHex');
    var noteEl = $('#roNote');
    var aaEl = $('#roAa');

    function luminance(hex) {
      var r = parseInt(hex.substr(1, 2), 16) / 255;
      var g = parseInt(hex.substr(3, 2), 16) / 255;
      var b = parseInt(hex.substr(5, 2), 16) / 255;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function select(btn, moveFocus) {
      swatches.forEach(function (s) {
        s.setAttribute('aria-pressed', s === btn ? 'true' : 'false');
      });
      var hex = btn.getAttribute('data-hex');
      var name = btn.getAttribute('data-name');
      var note = btn.getAttribute('data-note');

      preview.style.setProperty('--v', hex);
      var dark = luminance(hex) < 0.5;
      preview.style.color = dark ? '#f2f2f2' : '#0d0d0d';
      aaEl.style.color = dark ? '#f2f2f2' : '#0d0d0d';

      nameEl.textContent = name;
      hexEl.textContent = hex.toUpperCase();
      noteEl.textContent = note;

      if (moveFocus) btn.focus();
    }

    swatches.forEach(function (btn, i) {
      btn.addEventListener('click', function () { select(btn, false); });
      btn.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % swatches.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + swatches.length) % swatches.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = swatches.length - 1;
        if (next !== null) {
          e.preventDefault();
          select(swatches[next], true);
          swatches[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      });
    });

    // initial readout from markup
    var first = swatches[0];
    if (first) select(first, false);
  })();

  /* ── 8 · footer year ──────────────────────────────────────── */
  (function noop() {
    /* the edition line is fixed to the exhibition, not the clock */
  })();

  /* ── 9 · guard: hash links land below the fixed header ────── */
  (function anchors() {
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function () {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (target && !reduceMotion.matches) {
          // CSS handles smooth scrolling; nothing else to do.
        }
      });
    });
  })();

})();