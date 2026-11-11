/*
 * Ordered · Atlas Lab
 * One source, four dithering kernels, live. Each change re-runs the kernels on
 * a 320 × 320 grid (about 100k pixels each) and repaints the four outputs.
 */
(function (global) {
  'use strict';

  var NS = global.Ordered = global.Ordered || {};
  var SIZE = 320;
  var METHODS = [
    { key: 'threshold', title: 'Threshold' },
    { key: 'ordered', title: 'Ordered 8×8' },
    { key: 'floyd', title: 'Floyd–Steinberg' },
    { key: 'atkinson', title: 'Atkinson' }
  ];

  function init() {
    var sourceCanvas = document.getElementById('lab-source');
    if (!sourceCanvas || !sourceCanvas.getContext) return;

    var sourceCtx = sourceCanvas.getContext('2d');
    var status = document.getElementById('lab-status');
    var typeInput = document.getElementById('type-input');
    var toneInput = document.getElementById('tone');
    var toneOut = document.getElementById('tone-out');
    var contrastInput = document.getElementById('contrast');
    var contrastOut = document.getElementById('contrast-out');
    var sourceButtons = [].slice.call(document.querySelectorAll('[data-source]'));

    sourceCanvas.width = SIZE;
    sourceCanvas.height = SIZE;

    var cards = {};
    METHODS.forEach(function (m) {
      var canvas = document.querySelector('canvas[data-out="' + m.key + '"]');
      canvas.width = SIZE;
      canvas.height = SIZE;
      cards[m.key] = {
        title: m.title,
        canvas: canvas,
        ctx: canvas.getContext('2d'),
        stat: document.querySelector('[data-stat="' + m.key + '"]')
      };
    });

    var raw = {
      sphere: NS.sources.sphere(SIZE, SIZE),
      ramp: NS.sources.ramp(SIZE, SIZE)
    };
    var typed = { word: null, data: null };
    var state = { source: 'sphere', word: 'GREY', tone: 0, contrast: 100 };
    var tone = new Float32Array(SIZE * SIZE);
    var queued = false;

    function currentSource() {
      if (state.source !== 'type') return raw[state.source];
      if (typed.word !== state.word) {
        typed.data = NS.sources.type(SIZE, SIZE, state.word);
        typed.word = state.word;
      }
      return typed.data;
    }

    function adjust(src) {
      var k = state.contrast / 100;
      var offset = state.tone;
      for (var i = 0; i < src.length; i++) {
        tone[i] = NS.clamp((src[i] - 128) * k + 128 + offset, 0, 255);
      }
    }

    function paintGray(ctx, values) {
      var img = ctx.createImageData(SIZE, SIZE);
      var d = img.data;
      for (var i = 0; i < values.length; i++) {
        var o = i * 4;
        d[o] = values[i];
        d[o + 1] = values[i];
        d[o + 2] = values[i];
        d[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }

    function render() {
      adjust(currentSource());
      paintGray(sourceCtx, tone);
      METHODS.forEach(function (m) {
        var card = cards[m.key];
        var bits = NS.algorithms[m.key](tone, SIZE, SIZE);
        NS.paintBits(card.ctx, bits, SIZE, SIZE);
        card.stat.textContent = 'Ink coverage ' + (NS.inkShare(bits) * 100).toFixed(1) + '%';
      });
    }

    function schedule() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        render();
      });
    }

    function say(message) {
      status.textContent = message;
    }

    function flash(btn, text) {
      btn.textContent = text;
      clearTimeout(btn.__flash);
      btn.__flash = setTimeout(function () {
        btn.textContent = btn.getAttribute('data-label');
      }, 1600);
    }

    function setSource(name) {
      state.source = name;
      sourceButtons.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.getAttribute('data-source') === name));
      });
      schedule();
    }

    sourceButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setSource(btn.getAttribute('data-source'));
      });
    });

    typeInput.addEventListener('input', function () {
      state.word = (typeInput.value || ' ').toUpperCase().slice(0, 12);
      setSource('type');
    });

    toneInput.addEventListener('input', function () {
      state.tone = Number(toneInput.value);
      toneOut.textContent = (state.tone > 0 ? '+' : '') + state.tone;
      schedule();
    });

    contrastInput.addEventListener('input', function () {
      state.contrast = Number(contrastInput.value);
      contrastOut.textContent = state.contrast + '%';
      schedule();
    });

    document.querySelectorAll('[data-copy]').forEach(function (btn) {
      var key = btn.getAttribute('data-copy');
      btn.setAttribute('data-label', btn.textContent.trim());
      btn.addEventListener('click', function () {
        var method = NS.algorithms[key];
        var title = cards[key].title;
        var code = '// Ordered · ' + title + '\n' + method.toString() + '\n';
        NS.copyText(code).then(function () {
          flash(btn, 'Copied');
          say(title + ' copied to the clipboard as JavaScript.');
        }, function () {
          say('Your browser blocked clipboard access for this page.');
        });
      });
    });

    document.querySelectorAll('[data-save]').forEach(function (btn) {
      var key = btn.getAttribute('data-save');
      btn.setAttribute('data-label', btn.textContent.trim());
      btn.addEventListener('click', function () {
        var card = cards[key];
        NS.saveCanvas(card.canvas, 'ordered-' + key + '-' + state.source + '.png', 3);
        flash(btn, 'Saved');
        say(card.title + ' saved as a 960 × 960 PNG.');
      });
    });

    render();
  }

  NS.lab = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
