/* ============================================================
   HIVEMOTHER — world: seeded meadow generation + particles.
   ============================================================ */
var HM = window.HM = window.HM || {};

/* ---------- shared math ---------- */
HM.W = 1600; HM.H = 900;
HM.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
HM.lerp = function (a, b, t) { return a + (b - a) * t; };
HM.dist = function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); };
HM.dist2 = function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
HM.hex = function (c) { return '#' + c; };
function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
HM.rng = mulberry32;
// mix two hex colors, t in [0,1]
HM.mix = function (c1, c2, t) {
  var a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
  var r = Math.round(HM.lerp((a >> 16) & 255, (b >> 16) & 255, t));
  var g = Math.round(HM.lerp((a >> 8) & 255, (b >> 8) & 255, t));
  var bl = Math.round(HM.lerp(a & 255, b & 255, t));
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
};

/* ============================================================
   WORLD
   ============================================================ */
HM.world = (function () {
  var W = HM.W, H = HM.H;
  var hive = { x: W / 2, y: 802, r: 52 };
  var field = {
    hive: hive,
    flowers: [], grassMid: [], grassFore: [], clouds: [], trees: [],
    tile: null, motes: []
  };

  var PETALS = ['#ef9bb8', '#93b7e8', '#f3ead2', '#c9a0e8', '#f0a86a'];
  var PETAL_DARK = ['#d4769a', '#6f93cf', '#d8cbb0', '#a97fce', '#d68a4c'];

  function buildField(runSeed) {
    var R = mulberry32(runSeed);
    // --- grass, two depth layers ---
    field.grassMid.length = 0; field.grassFore.length = 0;
    var i, g;
    for (i = 0; i < 150; i++) {
      g = {
        x: R() * W, y: 330 + R() * 520,
        len: 20 + R() * 24, w: 2.6 + R() * 2.2,
        ph: R() * 6.28, tone: R()
      };
      field.grassMid.push(g);
    }
    for (i = 0; i < 85; i++) {
      g = {
        x: R() * W, y: 815 + R() * 95,
        len: 60 + R() * 62, w: 4.5 + R() * 4,
        ph: R() * 6.28, tone: R()
      };
      field.grassFore.push(g);
    }
    // --- clouds ---
    field.clouds.length = 0;
    for (i = 0; i < 5; i++) {
      field.clouds.push({
        x: R() * W, y: 50 + R() * 150, s: 0.7 + R() * 1.1,
        v: 4 + R() * 7, puffs: 3 + (R() * 3 | 0), seed: R() * 10
      });
    }
    // --- trees on far hills (deterministic) ---
    field.trees.length = 0;
    var bands = [
      { y: 208, amp: 14, n: 9, s: 1.0, col: '#33511f' },
      { y: 262, amp: 12, n: 12, s: 1.35, col: '#2b451b' }
    ];
    for (var b = 0; b < bands.length; b++) {
      var bd = bands[b];
      for (i = 0; i < bd.n; i++) {
        var tx = (i + 0.5 + (R() - 0.5) * 0.7) / bd.n * W;
        field.trees.push({ x: tx, y: bd.y + Math.sin(tx * 0.004 + b) * bd.amp - 6, s: bd.s * (0.75 + R() * 0.5), col: bd.col });
      }
    }
    // --- drifting pollen motes ---
    field.motes.length = 0;
    for (i = 0; i < 26; i++) {
      field.motes.push({ x: R() * W, y: 140 + R() * 700, ph: R() * 6.28, sp: 5 + R() * 9, s: 1 + R() * 2 });
    }
    // --- speckle tile for meadow texture ---
    var tc = document.createElement('canvas');
    tc.width = 256; tc.height = 256;
    var tctx = tc.getContext('2d');
    for (i = 0; i < 340; i++) {
      var a = 0.04 + R() * 0.07;
      tctx.fillStyle = R() < 0.55 ? 'rgba(30,50,16,' + a + ')' : 'rgba(190,220,120,' + a + ')';
      var rr = 0.8 + R() * 1.8;
      tctx.beginPath();
      tctx.arc(R() * 256, R() * 256, rr, 0, 6.283);
      tctx.fill();
    }
    for (i = 0; i < 60; i++) {
      tctx.strokeStyle = 'rgba(24,42,12,0.08)';
      tctx.lineWidth = 1;
      var sx = R() * 256, sy = R() * 256;
      tctx.beginPath(); tctx.moveTo(sx, sy); tctx.lineTo(sx + (R() - 0.5) * 8, sy - 4 - R() * 6); tctx.stroke();
    }
    field.tile = tc;
  }

  /* Flowers: rejection-sampled clusters, golden upgrades far from hive. */
  function buildFlowers(day, runSeed) {
    var R = mulberry32((runSeed ^ (day * 0x9E3779B9)) >>> 0);
    var flowers = [];
    var clusters = [];
    var ci;
    for (ci = 0; ci < 5; ci++) clusters.push({ x: 140 + R() * (W - 280), y: 380 + R() * 400 });
    var guard = 0;
    while (flowers.length < 26 && guard++ < 4000) {
      var x, y;
      if (R() < 0.62) {
        var c = clusters[(R() * clusters.length) | 0];
        x = c.x + (R() - 0.5) * 300; y = c.y + (R() - 0.5) * 220;
      } else { x = 90 + R() * (W - 180); y = 350 + R() * 460; }
      x = HM.clamp(x, 80, W - 80); y = HM.clamp(y, 340, 830);
      if (HM.dist(x, y, hive.x, hive.y) < 170) continue;
      var ok = true;
      for (var k = 0; k < flowers.length; k++) {
        if (HM.dist2(x, y, flowers[k].x, flowers[k].y) < 88 * 88) { ok = false; break; }
      }
      if (!ok) continue;
      var pi = (R() * PETALS.length) | 0;
      flowers.push({
        x: x, y: y,
        r: 13 + R() * 6, petals: 5 + ((R() * 2) | 0),
        col: PETALS[pi], colD: PETAL_DARK[pi],
        ph: R() * 6.28,
        nectar: 3 + ((R() * 2) | 0), max: 4,
        golden: false, claims: 0, regrowT: 8 + R() * 12
      });
    }
    // golden blossoms: upgrade far ones (double pollen value)
    var goldWant = [0, 0, 2, 2, 3, 3, 3, 3][HM.clamp(day, 1, 7)];
    var tries = 0;
    while (goldWant > 0 && tries++ < 200) {
      var f = flowers[(R() * flowers.length) | 0];
      if (f && !f.golden && HM.dist(f.x, f.y, hive.x, hive.y) > 380) {
        f.golden = true; f.nectar = 8; f.max = 8; f.r += 3;
        goldWant--;
      }
    }
    field.flowers = flowers;
    return flowers;
  }

  function init(runSeed) { buildField(runSeed); }

  return { init: init, buildField: buildField, buildFlowers: buildFlowers, field: field, hive: hive };
})();

/* ============================================================
   FX — pooled particles, screen shake, danger flash
   ============================================================ */
HM.fx = (function () {
  var list = [];
  var MAX = 620;
  var shake = { t: 0, dur: 0, amp: 0 };
  var danger = 0;
  var motion = true; // set by main (reduced-motion aware)

  function cap() { return motion ? MAX : 260; }

  function spawn(o) {
    if (list.length >= cap()) {
      if (o.prio) list.shift(); else return;
    }
    o.t = 0;
    o.life = o.life || 0.6;
    list.push(o);
  }

  function burst(x, y, n, opts) {
    opts = opts || {};
    n = Math.round(n * (motion ? 1 : 0.5));
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, sp = (opts.sp || 120) * (0.4 + Math.random());
      spawn({
        kind: opts.kind || 'dot', x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up || 0),
        size: (opts.size || 3) * (0.6 + Math.random() * 0.9),
        life: (opts.life || 0.55) * (0.7 + Math.random() * 0.6),
        col: opts.col || '#ffd166', grav: opts.grav == null ? 220 : opts.grav,
        drag: opts.drag == null ? 2.4 : opts.drag, add: !!opts.add, prio: true
      });
    }
  }

  function ring(x, y, r1, col, life) {
    spawn({ kind: 'ring', x: x, y: y, r0: 14, r1: r1, life: life || 0.4, col: col || '#ffd166', prio: true });
  }

  function doShake(amp, dur) {
    if (!motion) return;
    if (amp >= shake.amp * (1 - shake.t / Math.max(0.001, shake.dur))) {
      shake.amp = amp; shake.dur = dur; shake.t = 0;
    }
  }

  function update(dt) {
    for (var i = list.length - 1; i >= 0; i--) {
      var p = list[i];
      p.t += dt;
      if (p.t >= p.life) { list[i] = list[list.length - 1]; list.pop(); continue; }
      if (p.kind === 'dot' || p.kind === 'leaf' || p.kind === 'spark' || p.kind === 'streak') {
        p.vy += (p.grav || 0) * dt;
        var dr = Math.exp(-(p.drag || 0) * dt);
        p.vx *= dr; p.vy *= dr;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.kind === 'leaf') p.rot += (p.vr || 3) * dt;
      } else if (p.kind === 'orb') {
        // honey orb flying home
        p.tt = (p.tt || 0) + dt / (p.dur || 0.6);
        var e = p.tt * p.tt * (3 - 2 * p.tt);
        p.cx = HM.lerp(p.x0, p.x1, e); p.cy = HM.lerp(p.y0, p.y1, e) - Math.sin(e * Math.PI) * (p.arc || 90);
      }
    }
    if (shake.dur > 0) { shake.t += dt; if (shake.t >= shake.dur) { shake.dur = 0; shake.amp = 0; } }
    danger = Math.max(0, danger - dt * 1.4);
  }

  function reset() { list.length = 0; shake.dur = 0; danger = 0; }

  return {
    list: list, spawn: spawn, burst: burst, ring: ring,
    doShake: doShake, update: update, reset: reset,
    shake: shake, danger: danger, setDanger: function (v) { danger = v; },
    getDanger: function () { return danger; },
    setMotion: function (m) { motion = m; },
    motion: function () { return motion; }
  };
})();
