/*
 * Ordered · resolve
 * A dune landscape generated from noise and lit low. The section is scroll-linked:
 * the continuous-tone picture gives way to halftone dots as you move through it.
 * With reduced motion the landscape is shown once, fully resolved, with no pinning.
 */
(function (global) {
  'use strict';

  var NS = global.Ordered = global.Ordered || {};
  var TAU = Math.PI * 2;

  function init() {
    var section = document.getElementById('resolve');
    var canvas = document.getElementById('resolve-canvas');
    if (!section || !canvas || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    var readout = document.getElementById('resolve-readout');
    var meter = section.querySelector('.resolve-meter');
    var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var smooth = document.createElement('canvas');
    var smoothCtx = smooth.getContext('2d');

    var W = 1, H = 1, dpr = 1, gw = 1, gh = 1, gray = null;
    var lastP = -1, queued = false, resizeTimer = 0;

    function ease(t) {
      return t * t * (3 - 2 * t);
    }

    function build() {
      var rect = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);

      gw = Math.min(400, Math.max(160, Math.round(W / 3)));
      gh = Math.max(90, Math.round(gw * H / W));
      gray = NS.sources.dunes(gw, gh, 7.3);

      smooth.width = gw;
      smooth.height = gh;
      var img = smoothCtx.createImageData(gw, gh);
      for (var i = 0; i < gray.length; i++) {
        var o = i * 4;
        img.data[o] = gray[i];
        img.data[o + 1] = gray[i];
        img.data[o + 2] = gray[i];
        img.data[o + 3] = 255;
      }
      smoothCtx.putImageData(img, 0, 0);

      lastP = -1;
      schedule();
    }

    // Draw the dots for progress p; alpha lets the dots fade in over the smooth image.
    function drawDots(p, alpha) {
      var e = ease(p);
      var c0 = Math.max(5, W / 240), c1 = Math.max(14, W / 50);
      var c = c0 + (c1 - c0) * e;
      var cols = Math.ceil(W / c), rows = Math.ceil(H / c);
      var count = 0;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = NS.PAPER;
      ctx.beginPath();
      for (var j = 0; j < rows; j++) {
        var y = j * c + c / 2;
        var gy = Math.min(gh - 1, Math.floor(y / H * gh));
        for (var i = 0; i < cols; i++) {
          var x = i * c + c / 2;
          var gx = Math.min(gw - 1, Math.floor(x / W * gw));
          var v = gray[gy * gw + gx] / 255;
          if (v < 0.03) continue;
          var r = Math.min(c * 0.62, c * 0.65 * Math.sqrt(v));
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, TAU);
          count++;
        }
      }
      ctx.fill();
      ctx.globalAlpha = 1;
      readout.textContent = 'Cell ' + c.toFixed(1) + ' px · ' + count.toLocaleString('en-US') + ' dots';
    }

    function render(p) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = NS.INK;
      ctx.fillRect(0, 0, W, H);

      var k = ease(NS.clamp((p - 0.03) / 0.22, 0, 1));
      if (k < 1) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.globalAlpha = 1 - k;
        ctx.drawImage(smooth, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }
      if (k > 0) drawDots(p, k);
    }

    function progress() {
      if (reduceQuery.matches) return 1;
      var span = section.offsetHeight - window.innerHeight;
      if (span <= 0) return 1;
      return NS.clamp(-section.getBoundingClientRect().top / span, 0, 1);
    }

    function update() {
      queued = false;
      var p = progress();
      if (Math.abs(p - lastP) < 0.0005) return;
      lastP = p;
      if (meter) meter.style.setProperty('--p', p.toFixed(4));
      render(p);
    }

    function schedule() {
      if (!queued) {
        queued = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 200);
    });
    if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', schedule);

    build();
  }

  NS.resolve = { init: init };
})(typeof window !== 'undefined' ? window : globalThis);
