/*
 * Ordered · core
 * Dithering kernels, paint helpers and small browser utilities.
 *
 * Each kernel is self-contained on purpose: the "Copy source" buttons in the
 * Atlas Lab send Function.prototype.toString() of these functions to the
 * clipboard, so every method on the page can be lifted out and run as-is.
 *
 * Conventions
 *   gray  Float32Array, row-major, tone values 0 (black) .. 255 (white)
 *   bits  Uint8Array,   row-major, 1 = paper (light), 0 = ink (dark)
 */
(function (global) {
  'use strict';

  var NS = global.Ordered = global.Ordered || {};

  NS.INK = '#0b0b0b';
  NS.PAPER = '#efefef';

  NS.clamp = function (v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  };

  NS.algorithms = {
    // One fixed cut-off for every pixel.
    threshold: function threshold(gray, w, h) {
      var out = new Uint8Array(w * h);
      for (var i = 0; i < out.length; i++) {
        out[i] = gray[i] >= 128 ? 1 : 0;
      }
      return out;
    },

    // 8 x 8 Bayer matrix: interleave the bits of x and y to get each threshold.
    ordered: function ordered(gray, w, h) {
      var out = new Uint8Array(w * h);
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var bx = x & 7, by = y & 7, index = 0;
          for (var b = 0; b < 3; b++) {
            var xb = (bx >> b) & 1, yb = (by >> b) & 1;
            index = index * 4 + (((xb ^ yb) << 1) | yb);
          }
          var t = (index + 0.5) * (255 / 64);
          out[y * w + x] = gray[y * w + x] > t ? 1 : 0;
        }
      }
      return out;
    },

    // Floyd–Steinberg error diffusion: 7/16, 3/16, 5/16, 1/16.
    floyd: function floyd(gray, w, h) {
      var buf = new Float32Array(gray);
      var out = new Uint8Array(w * h);
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var i = y * w + x;
          var old = buf[i];
          var nv = old >= 128 ? 255 : 0;
          var e = old - nv;
          out[i] = nv ? 1 : 0;
          if (x + 1 < w) buf[i + 1] += e * 7 / 16;
          if (y + 1 < h) {
            if (x > 0) buf[i + w - 1] += e * 3 / 16;
            buf[i + w] += e * 5 / 16;
            if (x + 1 < w) buf[i + w + 1] += e / 16;
          }
        }
      }
      return out;
    },

    // Atkinson diffusion: each pixel passes 1/8 of its error to six neighbours,
    // so a quarter of the error is discarded. Highlights stay clean, shadows open.
    atkinson: function atkinson(gray, w, h) {
      var buf = new Float32Array(gray);
      var out = new Uint8Array(w * h);
      function spread(x, y, v) {
        if (x >= 0 && x < w && y < h) buf[y * w + x] += v;
      }
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var i = y * w + x;
          var old = buf[i];
          var nv = old >= 128 ? 255 : 0;
          var e = (old - nv) / 8;
          out[i] = nv ? 1 : 0;
          spread(x + 1, y, e);
          spread(x + 2, y, e);
          spread(x - 1, y + 1, e);
          spread(x, y + 1, e);
          spread(x + 1, y + 1, e);
          spread(x, y + 2, e);
        }
      }
      return out;
    }
  };

  // Share of the page that is ink, 0..1.
  NS.inkShare = function (bits) {
    var ink = 0;
    for (var i = 0; i < bits.length; i++) {
      if (!bits[i]) ink++;
    }
    return ink / bits.length;
  };

  // Paint a bit mask onto a canvas context using the site's two inks.
  NS.paintBits = function (ctx, bits, w, h) {
    var img = ctx.createImageData(w, h);
    var d = img.data;
    for (var i = 0; i < bits.length; i++) {
      var v = bits[i] ? 239 : 11;
      var o = i * 4;
      d[o] = v;
      d[o + 1] = v;
      d[o + 2] = v;
      d[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  };

  // Download a canvas as a PNG, scaled up with nearest-neighbour sampling.
  NS.saveCanvas = function (canvas, filename, scale) {
    var k = scale || 1;
    var out = document.createElement('canvas');
    out.width = canvas.width * k;
    out.height = canvas.height * k;
    var octx = out.getContext('2d');
    octx.imageSmoothingEnabled = false;
    octx.drawImage(canvas, 0, 0, out.width, out.height);
    out.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }, 'image/png');
  };

  // Clipboard API first, with a textarea fallback for browsers that block it.
  NS.copyText = function (text) {
    function fallback() {
      return new Promise(function (resolve, reject) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try {
          ok = document.execCommand('copy');
        } catch (err) {
          ok = false;
        }
        ta.remove();
        if (ok) resolve();
        else reject(new Error('Clipboard blocked'));
      });
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(fallback);
    }
    return fallback();
  };
})(typeof window !== 'undefined' ? window : globalThis);
