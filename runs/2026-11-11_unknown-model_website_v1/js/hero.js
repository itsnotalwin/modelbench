/*
 * Ordered · hero
 * A dotted planet redrawn every frame. Each cell is shaded analytically
 * (Lambert diffuse, a Blinn-style highlight, surface noise), then rendered as
 * halftone dots, ordered 4 × 4 squares or engraved lines.
 */
(function (global) {
  'use strict';

  var NS = global.Ordered = global.Ordered || {};
  var TAU = Math.PI * 2;
  var SCREENS = ['Halftone', 'Ordered 4×4', 'Engraving'];
  var BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  function init() {
    var canvas = document.getElementById('hero-canvas');
    if (!canvas || !canvas.getContext) return;

    var hero = canvas.parentElement;
    var ctx = canvas.getContext('2d');
    var modeButton = document.getElementById('hero-mode');
    var saveButton = document.getElementById('hero-save');
    var readout = document.getElementById('hero-readout');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var t0 = performance.now();

    var s = {
      screen: 0,
      W: 1, H: 1, dpr: 1, cell: 10,
      cols: 1, rows: 1,
      sx: 0, sy: 0, R: 1,
      target: { x: 0.9, y: 0.45 },
      light: { x: 0.9, y: 0.45 },
      lastInput: -1e9,
      dirty: true,
      cells: 0,
      readoutAt: 0
    };
    var L = [0, 0, 1];
    var Hv = [0, 0, 1];

    function clampTarget() {
      var m = Math.sqrt(s.target.x * s.target.x + s.target.y * s.target.y);
      if (m > 1.4) {
        s.target.x *= 1.4 / m;
        s.target.y *= 1.4 / m;
      }
    }

    function aimAt(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      var px = clientX - rect.left, py = clientY - rect.top;
      s.target.x = (px - s.sx) / s.R;
      s.target.y = -(py - s.sy) / s.R;
      clampTarget();
      s.lastInput = performance.now();
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      s.W = Math.max(1, rect.width);
      s.H = Math.max(1, rect.height);
      s.dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(s.W * s.dpr);
      canvas.height = Math.round(s.H * s.dpr);
      s.cell = Math.max(6, Math.min(12, Math.round(s.W / 140)));
      s.cols = Math.ceil(s.W / s.cell);
      s.rows = Math.ceil(s.H / s.cell);
      if (s.W < 700 || s.W < s.H * 0.8) {
        s.sx = s.W * 0.5;
        s.sy = s.H * 0.36;
        s.R = Math.min(s.W * 0.36, s.H * 0.22);
      } else {
        s.sx = s.W * 0.66;
        s.sy = s.H * 0.42;
        s.R = Math.min(s.W * 0.27, s.H * 0.42);
      }
      s.dirty = true;
    }

    // Light and half-vector (between light and view) as unit vectors.
    function lightVectors() {
      var lx = s.light.x, ly = s.light.y, lz = 0.9;
      var m = Math.sqrt(lx * lx + ly * ly + lz * lz);
      L[0] = lx / m; L[1] = ly / m; L[2] = lz / m;
      var hx = L[0], hy = L[1], hz = L[2] + 1;
      m = Math.sqrt(hx * hx + hy * hy + hz * hz);
      Hv[0] = hx / m; Hv[1] = hy / m; Hv[2] = hz / m;
    }

    // Tone 0..1 for the screen position (px, py) of cell (i, j) at time t.
    function tone(px, py, i, j, t) {
      var dx = (px - s.sx) / s.R, dy = (py - s.sy) / s.R;
      var r2 = dx * dx + dy * dy;
      if (r2 < 1) {
        var dz = Math.sqrt(1 - r2);
        var ny = -dy; // screen y points down; the surface normal points up
        var diffuse = dx * L[0] + ny * L[1] + dz * L[2];
        if (diffuse < 0) diffuse = 0;
        var gloss = dx * Hv[0] + ny * Hv[1] + dz * Hv[2];
        gloss = gloss > 0 ? Math.pow(gloss, 40) : 0;
        var surface = NS.fbm(dx * 2.6 + 3.7, ny * 2.6 + dz * 0.9 + 1.3, 3);
        var v = 0.035 + diffuse * (0.8 + 0.36 * (surface - 0.5)) + 0.4 * gloss;
        return v < 0 ? 0 : v > 1 ? 1 : v;
      }
      var d = Math.sqrt(r2);
      var halo = 0.09 * Math.exp(-(d - 1) * 3.4);
      var seed = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
      seed -= Math.floor(seed);
      if (seed > 0.994) {
        var twinkle = 0.55 + 0.45 * Math.sin(t * (1.1 + seed * 3) + seed * 60);
        return Math.max(halo, 0.9 * twinkle);
      }
      return halo;
    }

    function draw(t) {
      var c = s.cell, cols = s.cols, rows = s.rows, screen = s.screen;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.fillStyle = NS.INK;
      ctx.fillRect(0, 0, s.W, s.H);
      ctx.fillStyle = NS.PAPER;
      ctx.beginPath();
      var drawn = 0;
      for (var j = 0; j < rows; j++) {
        var py = j * c + c / 2;
        for (var i = 0; i < cols; i++) {
          var px = i * c + c / 2;
          var v = tone(px, py, i, j, t);
          if (v < 0.02) continue;
          if (screen === 0) {
            var r = Math.min(c * 0.62, c * 0.65 * Math.sqrt(v));
            ctx.moveTo(px + r, py);
            ctx.arc(px, py, r, 0, TAU);
            drawn++;
          } else if (screen === 1) {
            if (v * 255 > (BAYER4[((j & 3) << 2) + (i & 3)] + 0.5) * (255 / 16)) {
              ctx.rect(i * c, j * c, c, c);
              drawn++;
            }
          } else {
            var hh = c * v;
            ctx.rect(i * c, py - hh / 2, c, hh);
            drawn++;
          }
        }
      }
      ctx.fill();
      s.cells = drawn;
    }

    function updateReadout() {
      var az = Math.round((Math.atan2(L[1], L[0]) * 180 / Math.PI + 360) % 360);
      var el = Math.round(Math.asin(NS.clamp(L[2], -1, 1)) * 180 / Math.PI);
      readout.textContent = 'Light azimuth ' + az + '° · elevation ' + el + '° · ' +
        SCREENS[s.screen] + ' · ' + s.cells.toLocaleString('en-US') + ' marks';
    }

    function cycleScreen() {
      s.screen = (s.screen + 1) % SCREENS.length;
      modeButton.textContent = 'Screen: ' + SCREENS[s.screen];
      s.dirty = true;
    }

    function frame(now) {
      var t = (now - t0) / 1000;
      var idle = now - s.lastInput > 4000;
      if (!reduce && idle) {
        s.target.x = Math.cos(t * 0.22);
        s.target.y = Math.sin(t * 0.22) * 0.6;
      }
      var dx = s.target.x - s.light.x, dy = s.target.y - s.light.y;
      var moving = Math.abs(dx) + Math.abs(dy) > 0.0004;
      if (moving) {
        s.light.x += dx * 0.12;
        s.light.y += dy * 0.12;
      }
      if (moving || s.dirty || !reduce) {
        lightVectors();
        draw(t);
        s.dirty = false;
      }
      if (now - s.readoutAt > 180) {
        s.readoutAt = now;
        updateReadout();
      }
      requestAnimationFrame(frame);
    }

    hero.addEventListener('pointermove', function (e) { aimAt(e.clientX, e.clientY); });
    hero.addEventListener('pointerdown', function (e) { aimAt(e.clientX, e.clientY); });

    canvas.addEventListener('keydown', function (e) {
      var step = 0.12;
      var handled = true;
      if (e.key === 'ArrowLeft') s.target.x -= step;
      else if (e.key === 'ArrowRight') s.target.x += step;
      else if (e.key === 'ArrowUp') s.target.y += step;
      else if (e.key === 'ArrowDown') s.target.y -= step;
      else handled = false;
      if (handled) {
        e.preventDefault();
        clampTarget();
        s.lastInput = performance.now();
      }
    });

    modeButton.addEventListener('click', cycleScreen);

    saveButton.addEventListener('click', function () {
      var slug = SCREENS[s.screen].toLowerCase().replace(/[^a-z0-9]+/g, '-');
      NS.saveCanvas(canvas, 'ordered-hero-' + slug + '.png', 1);
    });

    document.addEventListener('keydown', function (e) {
      if ((e.key !== 'd' && e.key !== 'D') || e.metaKey || e.ctrlKey || e.altKey) return;
      var el = document.activeElement;
      var tag = el && el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (el && el.isContentEditable)) return;
      e.preventDefault();
      cycleScreen();
    });

    window.addEventListener('resize', resize);

    resize();
    lightVectors();
    modeButton.textContent = 'Screen: ' + SCREENS[s.screen];
    requestAnimationFrame(frame);
  }

  NS.hero = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
