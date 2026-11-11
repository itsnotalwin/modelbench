/*
 * Ordered · sources
 * Every picture on the site is generated here: no image files, no fonts loaded
 * over the network. Each source returns a Float32Array of tone values from
 * 0 (black) to 255 (white), row-major.
 */
(function (global) {
  'use strict';

  var NS = global.Ordered = global.Ordered || {};
  var FONT = '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif';

  // Hash-based value noise and fractal sum built on it.
  function hash(x, y) {
    var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function valueNoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi), b = hash(xi + 1, yi);
    var c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function fbm(x, y, octaves) {
    var sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (var o = 0; o < octaves; o++) {
      sum += amp * valueNoise(x * freq, y * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  }

  NS.fbm = fbm;
  NS.sources = {};

  // A lit sphere on a soft backdrop, with a specular highlight and faint bands.
  NS.sources.sphere = function (w, h) {
    var out = new Float32Array(w * h);
    var cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.38;
    var lx = -0.52, ly = 0.58, lz = 0.63;
    var n = Math.sqrt(lx * lx + ly * ly + lz * lz);
    lx /= n; ly /= n; lz /= n;
    var hx = lx, hy = ly, hz = lz + 1;
    n = Math.sqrt(hx * hx + hy * hy + hz * hz);
    hx /= n; hy /= n; hz /= n;

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var dx = (x + 0.5 - cx) / R, dy = (y + 0.5 - cy) / R;
        var r2 = dx * dx + dy * dy;
        var v;
        if (r2 < 1) {
          var dz = Math.sqrt(1 - r2);
          var ny = -dy;
          var diffuse = Math.max(0, dx * lx + ny * ly + dz * lz);
          var gloss = Math.pow(Math.max(0, dx * hx + ny * hy + dz * hz), 32);
          v = 0.04 + 0.78 * diffuse + 0.45 * gloss;
          v *= 0.9 + 0.1 * Math.cos(Math.asin(NS.clamp(ny, -1, 1)) * 26);
        } else {
          v = 0.09 + 0.1 * (1 - y / h) + 0.07 * Math.exp(-(Math.sqrt(r2) - 1) * 4);
        }
        out[y * w + x] = 255 * NS.clamp(v, 0, 1);
      }
    }
    return out;
  };

  // Left-to-right ramp with a gentle wave, so every tone and every pattern is visible.
  NS.sources.ramp = function (w, h) {
    var out = new Float32Array(w * h);
    for (var y = 0; y < h; y++) {
      var v = y / (h - 1);
      for (var x = 0; x < w; x++) {
        var u = x / (w - 1);
        var t = 0.04 + 0.92 * u + 0.05 * Math.sin(v * Math.PI * 2 + u * Math.PI * 3);
        out[y * w + x] = 255 * NS.clamp(t, 0, 1);
      }
    }
    return out;
  };

  // A wind-carved dune field: domain-warped fBm height, shaded by a low sun.
  NS.sources.dunes = function (w, h, seed) {
    var s = seed || 0;
    var height = new Float32Array(w * h);
    var x, y;
    for (y = 0; y < h; y++) {
      var v = y / h;
      for (x = 0; x < w; x++) {
        var u = x / w;
        var px = u * 3.0 + s;
        var py = v * 2.6 + s * 0.37;
        var warp = fbm(px * 0.9 + 4.1, py * 0.9 + 1.7, 3) * 1.6;
        height[y * w + x] = fbm(px + warp, py * 1.8 + warp * 0.6, 5);
      }
    }

    var lx = -0.6, ly = -0.5, lz = 0.62;
    var ln = Math.sqrt(lx * lx + ly * ly + lz * lz);
    lx /= ln; ly /= ln; lz /= ln;
    var k = w * 0.22;
    var out = new Float32Array(w * h);
    var lo = Infinity, hi = -Infinity;

    for (y = 0; y < h; y++) {
      var ym = y > 0 ? y - 1 : 0, yp = y < h - 1 ? y + 1 : h - 1;
      for (x = 0; x < w; x++) {
        var xm = x > 0 ? x - 1 : 0, xp = x < w - 1 ? x + 1 : w - 1;
        var dzdx = (height[y * w + xp] - height[y * w + xm]) * 0.5 * k;
        var dzdy = (height[yp * w + x] - height[ym * w + x]) * 0.5 * k;
        var d = (-dzdx * lx - dzdy * ly + lz) / Math.sqrt(dzdx * dzdx + dzdy * dzdy + 1);
        out[y * w + x] = d;
      }
    }

    // Measure the range from the stored (Float32) values so the stretch is exact.
    for (var q = 0; q < out.length; q++) {
      if (out[q] < lo) lo = out[q];
      if (out[q] > hi) hi = out[q];
    }

    var span = hi - lo || 1;
    for (var i = 0; i < out.length; i++) {
      out[i] = (out[i] - lo) / span * 255;
    }
    return out;
  };

  // The user's word, set large with a soft glow and a vertical tone gradient.
  NS.sources.type = function (w, h, word) {
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    var text = (word || '').toUpperCase().slice(0, 12) || ' ';

    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(0, 0, w, h);

    var size = h * 0.5;
    ctx.font = '800 ' + size + 'px ' + FONT;
    var width = ctx.measureText(text).width;
    var maxWidth = w * 0.86;
    if (width > maxWidth) {
      size = size * maxWidth / width;
      ctx.font = '800 ' + size + 'px ' + FONT;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var gradient = ctx.createLinearGradient(0, h * 0.25, 0, h * 0.75);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#6a6a6a');
    ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
    ctx.shadowBlur = size * 0.16;
    ctx.fillStyle = gradient;
    ctx.fillText(text, w / 2, h / 2 + size * 0.04);

    var data = ctx.getImageData(0, 0, w, h).data;
    var out = new Float32Array(w * h);
    for (var i = 0; i < w * h; i++) {
      out[i] = data[i * 4];
    }
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
