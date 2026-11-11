/* ==========================================================================
   Umbra — application
   One animation loop, one renderer per plate, no dependencies.
   ========================================================================== */

(function () {
  'use strict';

  var STUDIES = window.UMBRA_STUDIES || [];
  if (!STUDIES.length) return;

  var BAYER = window.UMBRA_BAYER;
  var FRAME = 1 / 30;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };

  var rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var motion = !rmq.matches;

  var instances = [];
  var fps = 0;

  /* ---------------------------------------------------------------- plate */

  function Plate(canvas, study, seed) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.study = study;
    this.seed = seed;
    this.params = { density: 0.5, speed: 1 };
    this.t = 0;
    this.state = null;
    this.w = 0;
    this.h = 0;
    this.dirty = true;
    this.visible = true;

    var self = this;
    if ('ResizeObserver' in window) {
      this.ro = new ResizeObserver(function () { self.resize(); });
      this.ro.observe(canvas);
    }
    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          self.visible = entries[i].isIntersecting;
        }
      }, { rootMargin: '120px' });
      this.io.observe(canvas);
    }
    this.resize();
    instances.push(this);
  }

  Plate.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) {
      this.state = null;
      return;
    }
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = Math.max(1, Math.round(r.width * dpr));
    var H = Math.max(1, Math.round(r.height * dpr));
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = r.width;
    this.h = r.height;
    this.state = this.study.init ? this.study.init(this.w, this.h, this.seed) : {};
    if (!this.state) this.state = {};
    this.state.seed = this.seed;
    this.dirty = true;
  };

  Plate.prototype.setStudy = function (study, seed) {
    this.study = study;
    this.seed = seed;
    this.t = 0;
    this.params = { density: 0.5, speed: 1 };
    this.state = null;
    this.resize();
  };

  Plate.prototype.reseed = function (seed) {
    this.seed = seed;
    this.t = 0;
    this.resize();
  };

  Plate.prototype.render = function (dt) {
    if (!this.state || !this.w || !this.h) return;
    this.state.dt = dt;
    this.study.draw(this.ctx, this.w, this.h, this.t, this.params, this.state);
  };

  Plate.prototype.tick = function (dt) {
    this.t += dt * this.params.speed;
    this.render(dt * this.params.speed);
    this.dirty = false;
  };

  /* ----------------------------------------------------------------- loop */

  var last = 0, acc = 0, fpsFrames = 0, fpsTime = 0;

  function loop(ts) {
    window.requestAnimationFrame(loop);

    if (!last) last = ts;
    var d = (ts - last) / 1000;
    last = ts;
    if (d > 0.2) d = 0.2;
    if (d < 0) d = 0;

    if (!motion) {
      for (var i = 0; i < instances.length; i++) {
        var p = instances[i];
        if (p.dirty && p.visible) {
          p.render(FRAME);
          p.dirty = false;
        }
      }
      if (demo.dirty && demo.visible) { drawDemo(); demo.dirty = false; }
      return;
    }

    acc += d;
    if (acc < FRAME) return;
    var step = Math.min(acc, 0.1);
    acc = 0;

    for (var k = 0; k < instances.length; k++) {
      var q = instances[k];
      if (q.visible && q.state) q.tick(step);
    }

    if (demo.visible) {
      demo.t += step;
      if (demo.auto) {
        demo.lx = 0.5 + 0.24 * Math.cos(demo.t * 0.32);
        demo.ly = 0.46 + 0.18 * Math.sin(demo.t * 0.24);
      }
      drawDemo();
      demo.dirty = false;
    }

    fpsFrames++;
    fpsTime += d;
    if (fpsTime >= 1) {
      fps = Math.round(fpsFrames / fpsTime);
      fpsFrames = 0;
      fpsTime = 0;
      paintSys();
    }
  }

  /* ------------------------------------------------------------------ ui */

  var live = $('#live');
  var announceTimer = 0;

  function announce(msg) {
    if (!live) return;
    window.clearTimeout(announceTimer);
    live.textContent = '';
    announceTimer = window.setTimeout(function () { live.textContent = msg; }, 40);
  }

  var topbar = $('#topbar');
  var progressBar = $('#progressBar');
  function onScroll() {
    if (topbar) topbar.classList.toggle('is-stuck', window.scrollY > 24);
    if (progressBar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progressBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ticker: duplicate once for a seamless loop */
  var track = $('#tickerTrack');
  if (track) track.innerHTML = track.innerHTML + track.innerHTML;

  /* reveal */
  if ('IntersectionObserver' in window) {
    var rev = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('is-in');
          rev.unobserve(entries[i].target);
        }
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    window.__umbraReveal = function (el) { rev.observe(el); };
  } else {
    window.__umbraReveal = function (el) { el.classList.add('is-in'); };
  }

  var revealNodes = document.querySelectorAll('[data-reveal]');
  for (var ri = 0; ri < revealNodes.length; ri++) window.__umbraReveal(revealNodes[ri]);

  /* --------------------------------------------------------------- system */

  function paintSys() {
    var vp = $('#sysViewport');
    if (!vp) return;
    vp.textContent = window.innerWidth + ' × ' + window.innerHeight;
    $('#sysDpr').textContent = (window.devicePixelRatio || 1).toFixed(1) + '×';
    $('#sysRm').textContent = rmq.matches ? 'requested' : 'not requested';
    $('#sysMotion').textContent = motion ? 'running' : 'paused';
    $('#sysFps').textContent = motion ? (fps ? fps + ' fps' : 'measuring') : '0 fps';
    var st = $('#statusText');
    if (st) st.textContent = motion ? 'Live' : 'Still';
  }

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      paintSys();
      for (var i = 0; i < instances.length; i++) instances[i].resize();
      resizeDemo();
      demo.dirty = true;
    }, 160);
  });

  /* ---------------------------------------------------------------- hero */

  var heroCanvas = $('#heroCanvas');
  var heroStudy = null;
  for (var hi = 0; hi < STUDIES.length; hi++) {
    if (STUDIES[hi].id === 'interference') heroStudy = STUDIES[hi];
  }
  if (heroCanvas && heroStudy) {
    var hero = new Plate(heroCanvas, heroStudy, 20261111);
    hero.params.density = 0.34;
  }

  /* ---------------------------------------------------------------- wall */

  var grid = $('#wallGrid');
  var wall = [];

  function defaultSeed(i) { return 1013 + i * 7919; }

  function buildWall() {
    if (!grid) return;
    for (var i = 0; i < STUDIES.length; i++) {
      (function (i) {
        var st = STUDIES[i];
        var li = document.createElement('li');
        li.className = 'cell';
        li.style.setProperty('--i', String(i));

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cell-btn';
        btn.setAttribute('aria-label', 'Open plate ' + st.num + ', ' + st.title + ' — ' + st.method);

        var cv = document.createElement('canvas');
        cv.setAttribute('aria-hidden', 'true');

        var meta = document.createElement('span');
        meta.className = 'cell-meta';
        var num = document.createElement('span');
        num.className = 'cell-num';
        num.textContent = st.num;
        var title = document.createElement('span');
        title.className = 'cell-title';
        title.textContent = st.title;
        meta.appendChild(num);
        meta.appendChild(title);

        var open = document.createElement('span');
        open.className = 'cell-open';
        open.setAttribute('aria-hidden', 'true');
        open.textContent = '↗';

        btn.appendChild(cv);
        btn.appendChild(meta);
        btn.appendChild(open);
        btn.addEventListener('click', function () { openPlate(i); });

        li.appendChild(btn);
        grid.appendChild(li);

        var inst = new Plate(cv, st, defaultSeed(i));
        wall.push({ li: li, btn: btn, inst: inst });
        window.__umbraReveal(li);
      })(i);
    }
  }

  function reseedAll() {
    for (var i = 0; i < wall.length; i++) {
      var inst = wall[i].inst;
      inst.reseed(1013 + Math.floor(Math.random() * 999000));
    }
    announce('Wall reseeded. Twelve new editions.');
  }

  var reseedBtn = $('#reseedAll');
  if (reseedBtn) reseedBtn.addEventListener('click', reseedAll);

  /* --------------------------------------------------------------- motion */

  var motionBtn = $('#motionToggle');

  function setMotion(on, silent) {
    motion = on;
    if (motionBtn) motionBtn.textContent = on ? 'Pause' : 'Play';
    if (motionBtn) motionBtn.setAttribute('aria-label', on ? 'Pause all motion' : 'Play all motion');
    for (var i = 0; i < instances.length; i++) instances[i].dirty = true;
    if (demo) demo.dirty = true;
    last = 0;
    acc = 0;
    paintSys();
    if (!silent) announce(on ? 'Motion running.' : 'Motion paused.');
  }

  if (motionBtn) {
    motionBtn.addEventListener('click', function () { setMotion(!motion); });
  }
  if (!motion) setMotion(false, true);
  paintSys();

  function onMotionPreference(e) {
    setMotion(!e.matches, true);
  }
  if (rmq.addEventListener) rmq.addEventListener('change', onMotionPreference);
  else if (rmq.addListener) rmq.addListener(onMotionPreference);

  /* --------------------------------------------------------------- dialog */

  var dlg = $('#plate');
  var dCanvas = $('#plateCanvas');
  var plate = null;
  var current = -1;
  var returnFocus = null;

  function ensurePlate(study) {
    if (!plate && dCanvas) plate = new Plate(dCanvas, study, defaultSeed(0));
    return plate;
  }

  function setHash(h) {
    try { window.history.replaceState(null, '', h); } catch (e) { /* file:// */ }
  }

  function clearHash() {
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) { /* file:// */ }
  }

  function buildControls() {
    var host = $('#plateControls');
    if (!host || !plate) return;
    host.textContent = '';

    var defs = [
      { key: 'density', label: 'Density', min: 0, max: 100, value: Math.round(plate.params.density * 100), fmt: function (v) { return v < 10 ? '0' + v : String(v); } },
      { key: 'speed', label: 'Tempo', min: 20, max: 200, value: Math.round(plate.params.speed * 100), fmt: function (v) { return (v / 100).toFixed(2) + '×'; } }
    ];

    for (var i = 0; i < defs.length; i++) {
      (function (d) {
        var wrap = document.createElement('div');
        wrap.className = 'control';

        var head = document.createElement('div');
        head.className = 'control-head';

        var lab = document.createElement('label');
        lab.setAttribute('for', 'ctl-' + d.key);
        lab.textContent = d.label;

        var out = document.createElement('output');
        out.setAttribute('for', 'ctl-' + d.key);
        out.textContent = d.fmt(d.value);

        head.appendChild(lab);
        head.appendChild(out);

        var input = document.createElement('input');
        input.type = 'range';
        input.id = 'ctl-' + d.key;
        input.min = String(d.min);
        input.max = String(d.max);
        input.step = '1';
        input.value = String(d.value);
        input.addEventListener('input', function () {
          var v = Number(input.value);
          if (d.key === 'speed') plate.params.speed = v / 100;
          else plate.params.density = v / 100;
          out.textContent = d.fmt(v);
          plate.dirty = true;
        });

        wrap.appendChild(head);
        wrap.appendChild(input);
        host.appendChild(wrap);
      })(defs[i]);
    }
  }

  function fillPlate(i) {
    var st = STUDIES[i];
    if (!st) return;

    $('#plateNum').textContent = st.num;
    $('#plateMethod').textContent = st.method;
    $('#plateTitle').textContent = st.title;
    $('#plateDesc').textContent = st.blurb;
    $('#plateSeedValue').textContent = String(plate.seed);
    if (dCanvas) dCanvas.setAttribute('aria-label', st.title + ' — ' + st.method + '. ' + st.blurb);
    buildControls();
  }

  function openPlate(i) {
    if (!dlg) return;
    var n = STUDIES.length;
    current = ((i % n) + n) % n;
    var st = STUDIES[current];

    if (!dlg.open) {
      returnFocus = document.activeElement;
      dlg.showModal();
      document.body.classList.add('is-locked');
    }

    ensurePlate(st);
    if (!plate) return;
    plate.setStudy(st, defaultSeed(current));
    fillPlate(current);

    window.requestAnimationFrame(function () {
      if (plate) plate.resize();
      var closeBtn = $('#plateClose');
      if (closeBtn) closeBtn.focus();
    });

    setHash('#plate-' + st.num);
    announce('Plate ' + st.num + ', ' + st.title + '.');
  }

  function stepPlate(dir) {
    if (!dlg || !dlg.open) return;
    openPlate(current + dir);
  }

  function finishClose() {
    document.body.classList.remove('is-locked');
    clearHash();
    if (returnFocus && returnFocus.focus) {
      try { returnFocus.focus(); } catch (e) { /* element gone */ }
    }
    returnFocus = null;
  }

  function closePlate() {
    if (!dlg) return;
    if (dlg.open) dlg.close();
    finishClose();
  }

  if (dlg) {
    var closeBtn = $('#plateClose');
    if (closeBtn) closeBtn.addEventListener('click', closePlate);

    /* Esc and the backdrop both end up here; the work is idempotent. */
    dlg.addEventListener('close', finishClose);
    dlg.addEventListener('cancel', function () { finishClose(); });

    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) closePlate();
    });

    dlg.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); stepPlate(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepPlate(-1); }
    });
  }

  var prevBtn = $('#platePrev');
  var nextBtn = $('#plateNext');
  if (prevBtn) prevBtn.addEventListener('click', function () { stepPlate(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { stepPlate(1); });

  var reseedPlateBtn = $('#plateReseed');
  if (reseedPlateBtn) {
    reseedPlateBtn.addEventListener('click', function () {
      if (!plate) return;
      plate.reseed(1013 + Math.floor(Math.random() * 999000));
      var sv = $('#plateSeedValue');
      if (sv) sv.textContent = String(plate.seed);
      announce('New seed. Plate redrawn.');
    });
  }

  var saveBtn = $('#plateSave');
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      if (!plate || !plate.state) return;
      plate.render(FRAME);
      var name = 'umbra-' + STUDIES[current].num + '-' + STUDIES[current].id + '.png';
      var done = function (blob) {
        if (!blob) { announce('The still could not be saved in this browser.'); return; }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
        announce('Saved ' + name + '.');
      };
      if (plate.canvas.toBlob) plate.canvas.toBlob(done, 'image/png');
      else announce('The still could not be saved in this browser.');
    });
  }

  var linkBtn = $('#plateLink');
  if (linkBtn) {
    linkBtn.addEventListener('click', function () {
      if (current < 0) return;
      var url = window.location.href.split('#')[0] + '#plate-' + STUDIES[current].num;
      var ok = function () { announce('Link copied.'); linkBtn.textContent = 'Link copied'; window.setTimeout(function () { linkBtn.textContent = 'Copy link to this plate'; }, 1800); };
      var fail = function () {
        announce('Copy failed. The link is ' + url);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(ok, function () { legacyCopy(url) ? ok() : fail(); });
      } else {
        legacyCopy(url) ? ok() : fail();
      }
    });
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  /* pointer readout in the plate */
  var stage = $('#plateStage');
  var hudXY = $('#hudXY');
  var hudL = $('#hudL');
  var hudTick = false;

  if (stage && hudXY && hudL) {
    stage.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch' || !plate || !plate.w) return;
      var r = dCanvas.getBoundingClientRect();
      var nx = clamp((e.clientX - r.left) / r.width, 0, 1);
      var ny = clamp((e.clientY - r.top) / r.height, 0, 1);
      if (hudTick) return;
      hudTick = true;
      window.requestAnimationFrame(function () {
        hudTick = false;
        hudXY.textContent = 'x ' + nx.toFixed(2) + ' · y ' + ny.toFixed(2);
        try {
          var px = Math.min(plate.canvas.width - 1, Math.max(0, Math.round(nx * plate.canvas.width)));
          var py = Math.min(plate.canvas.height - 1, Math.max(0, Math.round(ny * plate.canvas.height)));
          var d = plate.ctx.getImageData(px, py, 1, 1).data;
          var L = (0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255;
          hudL.textContent = 'L ' + L.toFixed(2);
        } catch (err) { /* ignore */ }
      });
    });
  }

  /* hash deep links */
  function indexFromHash() {
    var m = /^#plate-(\d{2})$/.exec(window.location.hash);
    if (!m) return -1;
    for (var i = 0; i < STUDIES.length; i++) {
      if (STUDIES[i].num === m[1]) return i;
    }
    return -1;
  }

  window.addEventListener('hashchange', function () {
    var i = indexFromHash();
    if (i >= 0 && (!dlg || !dlg.open || current !== i)) openPlate(i);
  });

  window.setTimeout(function () {
    var i = indexFromHash();
    if (i >= 0 && dlg && !dlg.open) openPlate(i);
  }, 80);

  /* keyboard: R reseeds the wall */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
    if (dlg && dlg.open) return;
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      reseedAll();
    }
  });

  /* ---------------------------------------------------------------- demo */

  var demoCanvas = $('#demoCanvas');
  var demo = {
    canvas: demoCanvas,
    ctx: demoCanvas ? demoCanvas.getContext('2d', { alpha: false }) : null,
    w: 0, h: 0,
    levels: 5,
    dither: true,
    lx: 0.5, ly: 0.46,
    t: 0,
    auto: true,
    dirty: true,
    visible: true,
    off: null, octx: null, img: null
  };

  function resizeDemo() {
    if (!demo.canvas) return;
    var r = demo.canvas.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    demo.w = r.width;
    demo.h = r.height;
    demo.canvas.width = Math.round(r.width * dpr);
    demo.canvas.height = Math.round(r.height * dpr);
    demo.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    demo.dirty = true;
  }

  function drawDemo() {
    if (!demo.ctx || !demo.w || !demo.h) return;
    var ctx = demo.ctx, w = demo.w, h = demo.h;
    var block = 5;
    var cw = Math.max(1, Math.ceil(w / block));
    var ch = Math.max(1, Math.ceil(h / block));

    if (!demo.off || demo.off.width !== cw || demo.off.height !== ch) {
      demo.off = document.createElement('canvas');
      demo.off.width = cw;
      demo.off.height = ch;
      demo.octx = demo.off.getContext('2d');
      demo.img = demo.octx.createImageData(cw, ch);
    }

    var d = demo.img.data;
    var n = demo.levels;
    var lx = demo.lx * w;
    var ly = demo.ly * h;
    var maxD = Math.sqrt(w * w + h * h) * 0.6;

    for (var y = 0; y < ch; y++) {
      for (var x = 0; x < cw; x++) {
        var px = x * block, py = y * block;
        var v = 1 - Math.sqrt((px - lx) * (px - lx) + (py - ly) * (py - ly)) / maxD;
        v += 0.08 * Math.sin((px * 0.7 + py) * 0.012 + demo.t * 0.4);
        if (v < 0) v = 0; else if (v > 1) v = 1;

        var q = v * (n - 1);
        if (demo.dither) q += (BAYER[(y & 7) * 8 + (x & 7)] / 64 - 0.5) * 0.95;
        q = clamp(Math.round(q), 0, n - 1) / (n - 1);

        var c = Math.round(q * 255);
        var i = (y * cw + x) * 4;
        d[i] = c; d[i + 1] = c; d[i + 2] = c; d[i + 3] = 255;
      }
    }

    demo.octx.putImageData(demo.img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(demo.off, 0, 0, cw, ch, 0, 0, cw * block, ch * block);
    ctx.imageSmoothingEnabled = true;
  }

  function updateDemoReadout() {
    var r = $('#demoReadout');
    if (r) r.textContent = demo.levels + ' levels · ' + (demo.dither ? 'ordered 8×8' : 'hard cut');
    var o = $('#demoLevelsOut');
    if (o) o.textContent = String(demo.levels);
  }

  if (demoCanvas) {
    resizeDemo();
    updateDemoReadout();

    if ('ResizeObserver' in window) {
      new ResizeObserver(function () { resizeDemo(); }).observe(demoCanvas);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        demo.visible = entries[0].isIntersecting;
      }, { rootMargin: '120px' }).observe(demoCanvas);
    }

    demoCanvas.addEventListener('pointermove', function (e) {
      var r = demoCanvas.getBoundingClientRect();
      demo.lx = clamp((e.clientX - r.left) / r.width, 0, 1);
      demo.ly = clamp((e.clientY - r.top) / r.height, 0, 1);
      demo.auto = false;
      demo.dirty = true;
    });

    var levelsInput = $('#demoLevels');
    if (levelsInput) {
      levelsInput.addEventListener('input', function () {
        demo.levels = Number(levelsInput.value);
        updateDemoReadout();
        demo.dirty = true;
      });
    }

    var ditherInput = $('#demoDither');
    if (ditherInput) {
      ditherInput.addEventListener('change', function () {
        demo.dither = ditherInput.checked;
        updateDemoReadout();
        demo.dirty = true;
      });
    }

    drawDemo();
  }

  /* ---------------------------------------------------------------- boot */

  buildWall();
  window.requestAnimationFrame(loop);
  paintSys();
})();