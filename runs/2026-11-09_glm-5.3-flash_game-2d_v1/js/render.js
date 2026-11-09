/* ============================================================
   HIVEMOTHER — renderer: layered 2D canvas, storybook meadow.
   ============================================================ */
var HM = window.HM = window.HM || {};

HM.render = (function () {
  var W = HM.W, H = HM.H;
  var clamp = HM.clamp, lerp = HM.lerp;
  var ctx = null;
  var vis = { night: 0 };            // 0 day .. 1 deep night (main tweens)
  var aim = { x: -999, y: -999, on: false };
  var glowCache = {};

  /* ---------- cached glow sprites ---------- */
  function glow(col) {
    if (glowCache[col]) return glowCache[col];
    var c = document.createElement('canvas');
    c.width = c.height = 96;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(48, 48, 4, 48, 48, 48);
    gr.addColorStop(0, col);
    gr.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 96, 96);
    glowCache[col] = c;
    return c;
  }

  /* ---------- sky palettes ---------- */
  // dayT: 0 dawn → 1 dusk. Three keyed skies, lerped.
  var SKY = [
    { top: '#f7cf8f', mid: '#fbe3b8', hor: '#fff2d4' },  // dawn
    { top: '#a9d4c2', mid: '#cfe8cd', hor: '#f6eec0' },  // midday
    { top: '#d98a54', mid: '#efb47c', hor: '#f9dda6' }   // dusk
  ];
  var NIGHT = { top: '#191627', mid: '#241d38', hor: '#322748' };
  var GROUND_DAY = { a: '#5c8a3e', b: '#3f6729' };
  var GROUND_NIGHT = { a: '#22301d', b: '#141f10' };

  function skyAt(t) {
    var a, b, k;
    if (t < 0.5) { a = SKY[0]; b = SKY[1]; k = t / 0.5; }
    else { a = SKY[1]; b = SKY[2]; k = (t - 0.5) / 0.5; }
    // blend hex pairs per channel (single pass — never re-mix rgb() strings)
    function ch(h) { var v = parseInt(h.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
    function stop(c1, c2, cn) {
      var x = ch(c1), y = ch(c2), n = ch(cn);
      var r = Math.round(lerp(lerp(x[0], y[0], k), n[0], vis.night));
      var g = Math.round(lerp(lerp(x[1], y[1], k), n[1], vis.night));
      var bl = Math.round(lerp(lerp(x[2], y[2], k), n[2], vis.night));
      return 'rgb(' + r + ',' + g + ',' + bl + ')';
    }
    return { top: stop(a.top, b.top, NIGHT.top), mid: stop(a.mid, b.mid, NIGHT.mid), hor: stop(a.hor, b.hor, NIGHT.hor) };
  }

  /* ---------- helpers ---------- */
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* ============================================================
     LAYERS
     ============================================================ */
  function drawSky(t, par) {
    var s = skyAt(t);
    var top = s.top, mid = s.mid, hor = s.hor;
    var g = ctx.createLinearGradient(0, 0, 0, 330);
    g.addColorStop(0, top); g.addColorStop(0.62, mid); g.addColorStop(1, hor);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 340);

    // sun / moon
    var sx = lerp(140, W - 140, t);
    var sy = 150 - Math.sin(Math.PI * t) * 66;
    if (vis.night < 0.9) {
      ctx.drawImage(glow('rgba(255,214,120,0.85)'), sx - 66, sy - 66, 132, 132);
      ctx.fillStyle = '#ffe9ad';
      ctx.beginPath(); ctx.arc(sx, sy, 22, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,244,214,0.8)';
      ctx.beginPath(); ctx.arc(sx, sy, 15, 0, 6.283); ctx.fill();
    }
    if (vis.night > 0.05) {
      var mx = lerp(W - 140, 140, t), my = 130 - Math.sin(Math.PI * t) * 40;
      ctx.globalAlpha = vis.night;
      ctx.drawImage(glow('rgba(214,222,255,0.5)'), mx - 52, my - 52, 104, 104);
      ctx.fillStyle = '#e8ecff';
      ctx.beginPath(); ctx.arc(mx, my, 16, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(190,200,240,0.55)';
      ctx.beginPath(); ctx.arc(mx - 5, my - 4, 3.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + 6, my + 5, 2.4, 0, 6.283); ctx.fill();
      // stars
      ctx.fillStyle = 'rgba(240,240,255,0.85)';
      for (var i = 0; i < 26; i++) {
        var ang = i * 2.399;
        var stx = W / 2 + Math.cos(ang) * (i * 37 % (W / 2 - 60));
        var sty = 20 + (i * 53 % 170);
        ctx.globalAlpha = vis.night * (0.35 + 0.55 * Math.abs(Math.sin(HM.lerp(0, 6, i) + t * 8)));
        ctx.fillRect(stx, sty, 1.6, 1.6);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawClouds(t, dt, par) {
    ctx.fillStyle = vis.night > 0.5 ? 'rgba(150,150,190,0.25)' : 'rgba(255,255,255,0.82)';
    var fl = HM.world.field.clouds;
    for (var i = 0; i < fl.length; i++) {
      var c = fl[i];
      if (dt) { c.x += c.v * dt * (HM.fx.motion() ? 1 : 0.35); if (c.x > W + 220) c.x = -220; }
      var px = c.x + par * 6;
      for (var p = 0; p < c.puffs; p++) {
        var ox = (p - c.puffs / 2) * 46 * c.s;
        var oy = Math.sin(c.seed + p * 1.7) * 10 * c.s;
        var r = (34 - Math.abs(p - c.puffs / 2) * 8) * c.s;
        ctx.beginPath();
        ctx.ellipse(px + ox, c.y + oy, r * 1.5, r, 0, 0, 6.283);
        ctx.fill();
      }
    }
  }

  function drawHills(par) {
    // far band
    ctx.fillStyle = HM.mix('#4d7434', '#1d2b17', vis.night);
    ctx.beginPath();
    ctx.moveTo(0, 268);
    for (var x = 0; x <= W; x += 40) ctx.lineTo(x, 232 + Math.sin(x * 0.0042 + 1.7) * 22 - par * 8);
    ctx.lineTo(W, 340); ctx.lineTo(0, 340); ctx.closePath(); ctx.fill();
    // near band
    ctx.fillStyle = HM.mix('#40642c', '#16230f', vis.night);
    ctx.beginPath();
    ctx.moveTo(0, 306);
    for (x = 0; x <= W; x += 40) ctx.lineTo(x, 280 + Math.sin(x * 0.006 + 4.2) * 16 - par * 14);
    ctx.lineTo(W, 360); ctx.lineTo(0, 360); ctx.closePath(); ctx.fill();
    // trees
    var trees = HM.world.field.trees;
    for (var i = 0; i < trees.length; i++) {
      var tr = trees[i];
      var tx = tr.x - par * 12, ty = tr.y - par * 6;
      ctx.fillStyle = tr.col;
      ctx.beginPath();
      ctx.ellipse(tx, ty, 15 * tr.s, 13 * tr.s, 0, 0, 6.283);
      ctx.ellipse(tx - 9 * tr.s, ty + 5 * tr.s, 10 * tr.s, 9 * tr.s, 0, 0, 6.283);
      ctx.ellipse(tx + 10 * tr.s, ty + 4 * tr.s, 11 * tr.s, 9 * tr.s, 0, 0, 6.283);
      ctx.fill();
    }
  }

  function drawMeadow() {
    var a = HM.mix(GROUND_DAY.a, GROUND_NIGHT.a, vis.night);
    var b = HM.mix(GROUND_DAY.b, GROUND_NIGHT.b, vis.night);
    var g = ctx.createLinearGradient(0, 300, 0, H);
    g.addColorStop(0, a); g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 328, W, H - 328);
    if (field_tile_ok()) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = ctx.createPattern(HM.world.field.tile, 'repeat');
      ctx.fillRect(0, 328, W, H - 328);
      ctx.restore();
    }
    // soft mown bands
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (var y = 380; y < H; y += 90) ctx.fillRect(0, y, W, 34);
  }
  function field_tile_ok() { return HM.world.field.tile; }

  function drawGrass(layer, t, wind, par) {
    var arr = layer === 0 ? HM.world.field.grassMid : HM.world.field.grassFore;
    var base = layer === 0 ? '#497431' : '#2f4d1f';
    var hi = layer === 0 ? '#557f39' : '#3a5c26';
    var off = layer === 0 ? 18 : 34;
    ctx.lineCap = 'round';
    for (var i = 0; i < arr.length; i++) {
      var g = arr[i];
      var sway = Math.sin(t * 1.4 + g.ph) * (layer === 0 ? 3 : 6) + wind * (layer === 0 ? 16 : 30) * (0.7 + 0.3 * Math.sin(g.ph * 3));
      var bend = g.x + sway - par * off;
      ctx.strokeStyle = g.tone > 0.5 ? base : hi;
      ctx.lineWidth = g.w;
      ctx.beginPath();
      ctx.moveTo(g.x - par * off, g.y);
      ctx.quadraticCurveTo(g.x - par * off, g.y - g.len * 0.6, bend, g.y - g.len);
      ctx.stroke();
    }
  }

  /* ---------- flowers ---------- */
  function drawFlowers(t, wind) {
    var fl = HM.world.field.flowers;
    for (var i = 0; i < fl.length; i++) {
      var f = fl[i];
      var sway = Math.sin(t * 1.15 + f.ph) * 3.4 + wind * 14;
      var hx = f.x + sway, hy = f.y - 34 - (f.golden ? 8 : 0);
      // stem
      ctx.strokeStyle = HM.mix('#3d6128', '#1c2c13', vis.night);
      ctx.lineWidth = f.golden ? 3.4 : 2.6;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.quadraticCurveTo(f.x + sway * 0.4, f.y - 18, hx, hy);
      ctx.stroke();
      // leaf
      ctx.fillStyle = HM.mix('#486e2f', '#203016', vis.night);
      ctx.beginPath();
      ctx.ellipse(f.x + sway * 0.25 + 6, f.y - 14, 7, 3, -0.5 + sway * 0.02, 0, 6.283);
      ctx.fill();
      // nectar glow
      var ripe = f.nectar > 0;
      if (ripe) {
        var gl = 0.3 + 0.14 * Math.sin(t * 2.2 + f.ph);
        ctx.globalAlpha = gl;
        ctx.drawImage(glow(f.golden ? 'rgba(255,214,110,0.9)' : 'rgba(255,235,250,0.55)'), hx - 34, hy - 34, 68, 68);
        ctx.globalAlpha = 1;
      }
      // petals
      var n = f.petals;
      var dim = ripe ? 1 : 0.42;
      ctx.globalAlpha = dim;
      for (var p = 0; p < n; p++) {
        var ang = p / n * 6.283 + sway * 0.012 + (f.golden ? t * 0.12 : 0);
        var px = hx + Math.cos(ang) * f.r * 0.72;
        var py = hy + Math.sin(ang) * f.r * 0.72;
        ctx.fillStyle = f.golden ? '#ffcf5c' : f.col;
        ctx.beginPath();
        ctx.ellipse(px, py, f.r * 0.52, f.r * 0.34, ang, 0, 6.283);
        ctx.fill();
      }
      if (f.golden) {
        for (p = 0; p < n; p++) {
          ang = (p + 0.5) / n * 6.283 - sway * 0.012 - t * 0.12;
          px = hx + Math.cos(ang) * f.r * 1.02;
          py = hy + Math.sin(ang) * f.r * 1.02;
          ctx.fillStyle = '#e8a52e';
          ctx.beginPath();
          ctx.ellipse(px, py, f.r * 0.4, f.r * 0.26, ang, 0, 6.283);
          ctx.fill();
        }
      }
      // disc
      ctx.fillStyle = ripe ? (f.golden ? '#a86e1c' : '#c98a3a') : '#6e5b34';
      ctx.beginPath(); ctx.arc(hx, hy, f.r * 0.34, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,200,0.5)';
      ctx.beginPath(); ctx.arc(hx - f.r * 0.09, hy - f.r * 0.09, f.r * 0.14, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- hive ---------- */
  function drawHive(t) {
    var hv = HM.world.hive;
    var x = hv.x, y = hv.y;
    var S = HM.sim.getState();
    var honey = S ? S.honey : 0;
    // mound
    ctx.fillStyle = HM.mix('#7c5a30', '#241a10', vis.night);
    ctx.beginPath();
    ctx.ellipse(x, y + 26, 92, 30, 0, 0, 6.283);
    ctx.fill();
    // glow when holding honey
    var gl = Math.min(1, 0.25 + honey / 120);
    ctx.globalAlpha = 0.35 * gl * (1 - vis.night * 0.4);
    ctx.drawImage(glow('rgba(255,196,80,0.9)'), x - 80, y - 78, 160, 160);
    ctx.globalAlpha = 1;
    // skep: three stacked ellipsoids
    var tiers = [[0, 34, 46], [0, 62, 36], [0, 84, 24]];
    for (var i = 0; i < 3; i++) {
      var ty = y - tiers[i][1] + 0;
      var tr = tiers[i][2];
      var grd = ctx.createLinearGradient(x - tr, ty - tr, x + tr, ty + tr);
      grd.addColorStop(0, HM.mix('#d9a648', '#3d2c14', vis.night));
      grd.addColorStop(0.55, HM.mix('#b9822f', '#2c1f0e', vis.night));
      grd.addColorStop(1, HM.mix('#8a5c1e', '#1d1409', vis.night));
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(x, ty, tr, tr * 0.82, 0, 0, 6.283);
      ctx.fill();
      // wattle lines
      ctx.strokeStyle = 'rgba(60,38,10,0.35)';
      ctx.lineWidth = 1.6;
      for (var l = -2; l <= 2; l++) {
        ctx.beginPath();
        ctx.ellipse(x, ty + l * 7, tr * (0.94 - Math.abs(l) * 0.1), tr * 0.6 * (0.94 - Math.abs(l) * 0.08), 0, Math.PI * 0.12, Math.PI * 0.88);
        ctx.stroke();
      }
    }
    // entrance
    var pulse = 0.75 + 0.25 * Math.sin(t * 2.4);
    ctx.fillStyle = 'rgba(30,18,6,0.9)';
    ctx.beginPath(); ctx.ellipse(x, y + 6, 13, 9, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.55 * pulse;
    ctx.drawImage(glow('rgba(255,190,70,0.8)'), x - 26, y - 18, 52, 52);
    ctx.globalAlpha = 1;
    // honeycomb progress: 12 cells fill with total honey
    var cells = Math.min(12, Math.floor(honey / 6));
    var cx0 = x - 44, cy0 = y - 108;
    for (var c = 0; c < 12; c++) {
      var col = c % 4, row = (c / 4) | 0;
      var hx = cx0 + col * 29 + (row % 2) * 14.5;
      var hy = cy0 + row * 25;
      ctx.strokeStyle = 'rgba(246,236,214,0.35)';
      ctx.lineWidth = 1.4;
      hexPath(hx, hy, 11);
      ctx.stroke();
      if (c < cells) {
        ctx.fillStyle = 'rgba(255,196,80,0.85)';
        hexPath(hx, hy, 8.2);
        ctx.fill();
      }
    }
  }
  function hexPath(x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * 6.283 + 0.5236;
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  /* ---------- critters ---------- */
  function drawBee(b, t) {
    var ang = Math.atan2(b.vy, b.vx);
    if (Math.abs(b.vx) + Math.abs(b.vy) < 6) ang = Math.sin(b.phase) > 0 ? 0 : Math.PI;
    var bob = Math.sin(b.bob) * 2.2;
    var x = b.x, y = b.y + bob;
    // glow when carrying
    if (b.carry > 0) {
      var a = 0.25 + 0.2 * b.carry / 3;
      ctx.globalAlpha = a;
      var s = 44 + b.carry * 8;
      ctx.drawImage(glow('rgba(255,205,95,0.9)'), x - s / 2, y - s / 2, s, s);
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    // wings
    var flap = Math.sin(t * 46 + b.phase) * 0.7;
    ctx.fillStyle = 'rgba(250,250,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(-1, -5 - flap * 1.4, 5.4, 2.6 + flap, -0.5, 0, 6.283);
    ctx.ellipse(-1, 5 + flap * 1.4, 5.4, 2.6 - flap, 0.5, 0, 6.283);
    ctx.fill();
    // body
    ctx.fillStyle = '#2c1e10';
    ctx.beginPath(); ctx.ellipse(0, 0, 7.4, 4.6, 0, 0, 6.283); ctx.fill();
    // stripes
    ctx.strokeStyle = '#f0a832';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-1.6, -4.1); ctx.quadraticCurveTo(-0.4, 0, -1.6, 4.1);
    ctx.moveTo(2.4, -3.6); ctx.quadraticCurveTo(3.4, 0, 2.4, 3.6);
    ctx.stroke();
    // pollen load
    for (var i = 0; i < b.carry; i++) {
      ctx.fillStyle = i === 2 ? '#ffe08a' : '#ffd166';
      ctx.beginPath();
      ctx.arc(-4.5 + i * 4.4, 0, 2.5, 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawQueen(q, t) {
    var ang = Math.atan2(q.vy * 0.6, q.vx);
    if (Math.abs(q.vx) + Math.abs(q.vy) < 8) ang = 0;
    var flap = Math.sin(t * 40) * 0.9;
    // soft aura
    ctx.globalAlpha = 0.3 + 0.08 * Math.sin(t * 2.1);
    ctx.drawImage(glow('rgba(255,214,120,0.85)'), q.x - 58, q.y - 58, 116, 116);
    ctx.globalAlpha = 1;
    // scent ring (subtle)
    var S = HM.sim.getState();
    if (S && !S.attract) {
      ctx.strokeStyle = 'rgba(255,214,130,0.22)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([7, 9]);
      ctx.beginPath();
      ctx.arc(q.x, q.y, HM.sim.getCfg().scentR * (1 + 0.012 * Math.sin(t * 1.7)), 0, 6.283);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.save();
    ctx.translate(q.x, q.y);
    ctx.rotate(ang);
    // wings
    ctx.fillStyle = 'rgba(252,252,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(-2, -8 - flap * 1.8, 9, 3.6 + flap, -0.5, 0, 6.283);
    ctx.ellipse(-2, 8 + flap * 1.8, 9, 3.6 - flap, 0.5, 0, 6.283);
    ctx.fill();
    // body
    var g = ctx.createLinearGradient(0, -7, 0, 7);
    g.addColorStop(0, '#4a3318'); g.addColorStop(1, '#241708');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, 13.5, 8, 0, 0, 6.283); ctx.fill();
    // stripes
    ctx.strokeStyle = '#f2b23e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-3, -7.3); ctx.quadraticCurveTo(-1, 0, -3, 7.3);
    ctx.moveTo(3.6, -6.6); ctx.quadraticCurveTo(5, 0, 3.6, 6.6);
    ctx.stroke();
    // crown
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(9.5, -3.4); ctx.lineTo(13.5, -6.4); ctx.lineTo(12.4, -1.6);
    ctx.lineTo(16.4, -3.2); ctx.lineTo(13.8, 0.6);
    ctx.lineTo(16.4, 4.2); ctx.lineTo(12, 3); ctx.lineTo(12.6, 6.8); ctx.lineTo(9.3, 3.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawWasp(w, t) {
    if (w.t < 0) return;
    var ang = Math.atan2(w.vy, w.vx);
    var x = w.x, y = w.y;
    ctx.save();
    ctx.translate(x, y);
    if (w.state === 'stun') ctx.rotate(Math.sin(t * 26) * 0.5);
    else ctx.rotate(ang);
    var flap = Math.sin(t * 54 + w.phase) * 0.8;
    // wings
    ctx.fillStyle = 'rgba(220,220,235,0.5)';
    ctx.beginPath();
    ctx.ellipse(-1, -6 - flap * 1.4, 6.4, 2.7 + flap, -0.45, 0, 6.283);
    ctx.ellipse(-1, 6 + flap * 1.4, 6.4, 2.7 - flap, 0.45, 0, 6.283);
    ctx.fill();
    // body
    ctx.fillStyle = '#231b12';
    ctx.beginPath(); ctx.ellipse(0, 0, 9.4, 4.6, 0, 0, 6.283); ctx.fill();
    // crimson bands
    ctx.strokeStyle = w.state === 'stun' ? '#8f6a4a' : '#c2402f';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-2.2, -4.2); ctx.quadraticCurveTo(-0.8, 0, -2.2, 4.2);
    ctx.moveTo(2.8, -3.8); ctx.quadraticCurveTo(4, 0, 2.8, 3.8);
    ctx.stroke();
    // stinger
    ctx.strokeStyle = '#e8d9b8';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-13.5, 0); ctx.stroke();
    // eyes
    ctx.fillStyle = w.state === 'stun' ? '#777' : '#ff5b45';
    ctx.beginPath(); ctx.arc(7.4, -2, 1.7, 0, 6.283); ctx.arc(7.4, 2, 1.7, 0, 6.283); ctx.fill();
    ctx.restore();
    // stun stars
    if (w.state === 'stun') {
      for (var i = 0; i < 3; i++) {
        var a = t * 7 + i * 2.09;
        ctx.fillStyle = '#ffe08a';
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * 14, y + Math.sin(a) * 8 - 12, 1.9, 0, 6.283);
        ctx.fill();
      }
    }
  }

  function drawDecoys(t) {
    var S = HM.sim.getState();
    if (!S) return;
    for (var i = 0; i < S.decoys.length; i++) {
      var d = S.decoys[i];
      var pul = 0.8 + 0.2 * Math.sin(t * 8);
      ctx.globalAlpha = Math.min(1, d.life * 2);
      ctx.drawImage(glow('rgba(255,205,95,0.95)'), d.x - 44, d.y - 44, 88, 88);
      ctx.fillStyle = '#e8a52e';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y + 3, 9 * pul, 7.4 * pul, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(d.x, d.y - 12);
      ctx.quadraticCurveTo(d.x + 6.4, d.y - 3, d.x + 4.4, d.y + 1);
      ctx.quadraticCurveTo(d.x, d.y + 4, d.x - 4.4, d.y + 1);
      ctx.quadraticCurveTo(d.x - 6.4, d.y - 3, d.x, d.y - 12);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawPulses(t) {
    var S = HM.sim.getState();
    if (!S) return;
    for (var i = 0; i < S.pulses.length; i++) {
      var p = S.pulses[i];
      var k = p.t / 0.5;
      var r = HM.lerp(26, HM.sim.getCfg().pulse.r1, 1 - Math.pow(1 - k, 2.2));
      ctx.strokeStyle = 'rgba(255,209,102,' + (1 - k) * 0.8 + ')';
      ctx.lineWidth = 3.4 * (1 - k) + 0.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,246,220,' + (1 - k) * 0.4 + ')';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.82, 0, 6.283); ctx.stroke();
    }
  }

  /* ---------- fx particles ---------- */
  function drawFx(t) {
    var list = HM.fx.list;
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var k = p.t / p.life;
      var a = 1 - k;
      if (p.kind === 'dot') {
        ctx.globalAlpha = a * (p.add ? 1 : 0.9);
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + 0.4 * (1 - k)), 0, 6.283); ctx.fill();
      } else if (p.kind === 'spark') {
        ctx.strokeStyle = p.col; ctx.globalAlpha = a; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
      } else if (p.kind === 'ring') {
        var r = HM.lerp(p.r0, p.r1, 1 - Math.pow(1 - k, 2));
        ctx.strokeStyle = p.col; ctx.globalAlpha = a * 0.9; ctx.lineWidth = 2.4 * a + 0.4;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.stroke();
      } else if (p.kind === 'orb') {
        ctx.globalAlpha = 1 - k * k;
        ctx.drawImage(glow('rgba(255,205,95,0.95)'), p.cx - 12, p.cy - 12, 24, 24);
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.cx, p.cy, 3.4, 0, 6.283); ctx.fill();
      } else if (p.kind === 'streak') {
        ctx.strokeStyle = p.col; ctx.globalAlpha = a * 0.8; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.06, p.y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawMotes(t, dt) {
    var ms = HM.world.field.motes;
    ctx.fillStyle = 'rgba(255,238,190,0.5)';
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (dt) {
        m.x += Math.sin(t * 0.5 + m.ph) * m.sp * dt;
        m.y += Math.cos(t * 0.4 + m.ph * 1.3) * m.sp * 0.6 * dt - 4 * dt;
        if (m.y < 120) m.y = H - 40;
        if (m.x < 0) m.x = W; else if (m.x > W) m.x = 0;
      }
      ctx.globalAlpha = 0.25 + 0.3 * Math.sin(t * 2 + m.ph);
      ctx.beginPath(); ctx.arc(m.x, m.y, m.s, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFireflies(t) {
    if (vis.night < 0.15) return;
    var hv = HM.world.hive;
    ctx.fillStyle = 'rgba(220,255,150,0.9)';
    for (var i = 0; i < 15; i++) {
      var a = i * 2.51 + t * 0.22;
      var r = 60 + (i * 37 % 190);
      var fx = hv.x + Math.cos(a) * r * 1.4;
      var fy = hv.y - 60 + Math.sin(a * 1.31) * r * 0.7;
      var fl = Math.max(0, Math.sin(t * 2.2 + i * 1.9));
      ctx.globalAlpha = vis.night * fl;
      ctx.beginPath(); ctx.arc(fx, fy, 2, 0, 6.283); ctx.fill();
      ctx.globalAlpha = vis.night * fl * 0.4;
      ctx.drawImage(glow('rgba(210,255,140,0.8)'), fx - 12, fy - 12, 24, 24);
    }
    ctx.globalAlpha = 1;
  }

  function drawVignette() {
    var g = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.86);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(10,5,1,0.32)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    var dgr = HM.fx.getDanger();
    if (dgr > 0.01) {
      var rg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
      rg.addColorStop(0, 'rgba(160,40,20,0)');
      rg.addColorStop(1, 'rgba(160,40,20,' + 0.3 * dgr + ')');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawAim(t) {
    if (!aim.on) return;
    ctx.strokeStyle = 'rgba(255,240,210,0.75)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(aim.x, aim.y, 5.4 + Math.sin(t * 6) * 0.8, 0, 6.283); ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,210,0.9)';
    ctx.beginPath(); ctx.arc(aim.x, aim.y, 1.4, 0, 6.283); ctx.fill();
  }

  /* ============================================================
     MAIN DRAW
     ============================================================ */
  var raf_t = 0;
  function draw(c, dt) {
    ctx = c;
    raf_t += dt;
    var t = raf_t;
    var S = HM.sim.getState();
    var dayT = S ? clamp(S.dayT / S.dayLen, 0, 1) : 0.35;
    if (S && S.attract) dayT = 0.3;
    var par = S ? clamp((S.queen.x - W / 2) * -0.02, -14, 14) : 0;
    if (!HM.fx.motion()) par = 0;
    var wind = S ? S.gust.lean : 0;
    var shk = HM.fx.shake;
    var shx = 0, shy = 0;
    if (shk.dur > 0) {
      var sk = 1 - shk.t / shk.dur;
      shx = (Math.random() - 0.5) * 2 * shk.amp * sk;
      shy = (Math.random() - 0.5) * 2 * shk.amp * sk;
    }

    ctx.save();
    ctx.translate(shx, shy);

    drawSky(dayT, par);
    drawClouds(t, dt, par);
    drawHills(par);
    drawMeadow();
    drawGrass(0, t, wind, par);
    drawFlowers(t, wind);

    // sort drawables by y for depth: flowers already drawn; hive, decoys, bees, wasps, queen
    drawHive(t);
    drawDecoys(t);
    drawMotes(t, dt);

    if (S) {
      var i, q = S.queen;
      // bees behind queen sorted loosely by y
      var bs = S.bees;
      for (i = 0; i < bs.length; i++) drawBee(bs[i], t);
      for (i = 0; i < S.wasps.length; i++) drawWasp(S.wasps[i], t);
      if (!S.dusk || true) drawQueen(q, t);
      drawPulses(t);
    }

    drawGrass(1, t, wind, par);
    drawFireflies(t);
    drawFx(t);
    drawAim(t);
    drawVignette();

    ctx.restore();
  }

  return {
    draw: draw,
    vis: vis,
    aim: aim,
    setNight: function (v) { vis.night = clamp(v, 0, 1); }
  };
})();
