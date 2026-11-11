/*
 * Ordered · step wedge
 * Eleven flat tones drawn as 45° halftone screens. The dot-gain slider adds ink
 * the way a press does, mostly in the midtones, and the readout compares the
 * intended tone with the printed one.
 */
(function (global) {
  'use strict';

  var NS = global.Ordered = global.Ordered || {};
  var STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  var SIZE = 240;
  var PITCH = 12;
  var TAU = Math.PI * 2;

  // Printed coverage for intended coverage p (0..1) and gain g (0..0.3).
  // The gain term peaks at 50% and vanishes at the solids.
  function printed(p, g) {
    return NS.clamp(p + g * 4 * p * (1 - p), 0, 1);
  }

  function drawStep(canvas, p, g) {
    var ctx = canvas.getContext('2d');
    var e = printed(p, g);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = NS.PAPER;
    ctx.fillRect(0, 0, SIZE, SIZE);
    if (e <= 0.002) return;
    if (e >= 0.998) {
      ctx.fillStyle = NS.INK;
      ctx.fillRect(0, 0, SIZE, SIZE);
      return;
    }

    var solid = e > 0.785; // past this, dots would touch, so draw paper holes instead
    var radius = PITCH * Math.sqrt((solid ? 1 - e : e) / Math.PI);
    var n = Math.ceil(SIZE * 0.75 / PITCH) + 1;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, SIZE, SIZE);
    ctx.clip();
    if (solid) {
      ctx.fillStyle = NS.INK;
      ctx.fillRect(0, 0, SIZE, SIZE);
    }
    ctx.fillStyle = solid ? NS.PAPER : NS.INK;
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    for (var j = -n; j <= n; j++) {
      for (var i = -n; i <= n; i++) {
        var x = i * PITCH, y = j * PITCH;
        ctx.moveTo(x + radius, y);
        ctx.arc(x, y, radius, 0, TAU);
      }
    }
    ctx.fill();
    ctx.restore();
  }

  function init() {
    var strip = document.getElementById('wedge-strip');
    var gain = document.getElementById('gain');
    if (!strip || !gain) return;

    var gainOut = document.getElementById('gain-out');
    var sentence = document.getElementById('wedge-sentence');
    var barPrinted = document.getElementById('wedge-bar-printed');
    var barIntended = document.getElementById('wedge-bar-intended');
    var selected = 50;

    var steps = STEPS.map(function (p) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wedge-step';
      btn.setAttribute('aria-pressed', 'false');

      var canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      canvas.setAttribute('aria-hidden', 'true');

      var label = document.createElement('span');
      label.textContent = p + '%';

      btn.appendChild(canvas);
      btn.appendChild(label);
      btn.addEventListener('click', function () { select(p); });
      strip.appendChild(btn);
      return { p: p, btn: btn, canvas: canvas };
    });

    function gainValue() {
      return Number(gain.value) / 100;
    }

    function readout() {
      var printedPct = Math.round(printed(selected / 100, gainValue()) * 100);
      var diff = printedPct - selected;
      sentence.textContent = 'Intended ' + selected + '%. Printed ' + printedPct + '%. ' +
        (diff === 0 ? 'No dot gain at this step.' : 'The press adds ' + diff + ' points.');
      barPrinted.style.width = printedPct + '%';
      barIntended.style.left = selected + '%';
    }

    function select(p) {
      selected = p;
      steps.forEach(function (s) {
        s.btn.setAttribute('aria-pressed', String(s.p === p));
      });
      readout();
    }

    function redraw() {
      var g = gainValue();
      steps.forEach(function (s) {
        drawStep(s.canvas, s.p / 100, g);
        var e = Math.round(printed(s.p / 100, g) * 100);
        s.btn.setAttribute('aria-label', 'Step ' + s.p + ' percent, printed at ' + e + ' percent');
      });
      gainOut.textContent = '+' + gain.value + ' pts';
      readout();
    }

    gain.addEventListener('input', redraw);

    strip.addEventListener('keydown', function (e) {
      var cur = -1;
      for (var i = 0; i < steps.length; i++) {
        if (steps[i].btn === document.activeElement) cur = i;
      }
      if (cur < 0) return;
      var next = -1;
      if (e.key === 'ArrowRight') next = Math.min(cur + 1, steps.length - 1);
      else if (e.key === 'ArrowLeft') next = Math.max(cur - 1, 0);
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = steps.length - 1;
      if (next < 0) return;
      e.preventDefault();
      steps[next].btn.focus();
      select(steps[next].p);
    });

    select(50);
    redraw();
  }

  NS.wedge = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
