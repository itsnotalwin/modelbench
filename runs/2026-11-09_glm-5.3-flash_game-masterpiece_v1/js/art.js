/* ============================================================
   THE LONG LIGHT — art.js
   painted scenes: title, the island by day, the lamp room by night,
   the open sea at dawn. Everything drawn, nothing loaded.
   ============================================================ */
"use strict";
window.Art = (function () {

  let cv = null, ctx = null, W = 0, H = 0, dpr = 1;
  let t = 0;                 // seconds clock
  let scene = "none";
  let params = {};           // scene params (set by main)

  let stars = [];
  let drops = [];            // rain
  let fogs = [];             // fog banks
  let gulls = [];
  let flashes = [];          // lightning ghosts

  /* landmark anchors in normalized coords — the DOM hotspots sit on these */
  const LANDMARKS = {
    jetty:  { x: 0.150, y: 0.645 },
    skiff:  { x: 0.245, y: 0.660 },
    store:  { x: 0.330, y: 0.580 },
    tower:  { x: 0.400, y: 0.425 },
    bell:   { x: 0.485, y: 0.605 },
    house:  { x: 0.570, y: 0.550 },
    cliff:  { x: 0.720, y: 0.535 },
  };

  const HORIZON = 0.575;     // normalized horizon line (day)
  const NIGHT_HORIZON = 0.52;

  /* ---------------- palettes: colour scripting ---------------- */
  // (chapter, slot) -> sky/sea/land colours. Slot: 0 morning,1 forenoon,2 afternoon,3 evening
  function dayPalette(ch, slot, weather) {
    const base = {
      0: { top: "#25384d", mid: "#5d7f9a", low: "#c9b287", seaFar: "#33506a", seaNear: "#203548", sun: "#f2d9a0", land1: "#3d4a56", land2: "#2b3540", land3: "#1d252d" },
      1: { top: "#3f6278", mid: "#7fa3b8", low: "#d9c9a2", seaFar: "#3f5f77", seaNear: "#27404f", sun: "#f6e7c0", land1: "#46545f", land2: "#313c46", land3: "#222a32" },
      2: { top: "#48687c", mid: "#88a7b8", low: "#c9c4a6", seaFar: "#436075", seaNear: "#2a4352", sun: "#f2e2b8", land1: "#46525c", land2: "#313b45", land3: "#212930" },
      3: { top: "#3a4b66", mid: "#8a7f88", low: "#dfa077", seaFar: "#3c5066", seaNear: "#263a4a", sun: "#eec08a", land1: "#3f4854", land2: "#2c353f", land3: "#1e252d" },
    };
    const foggy = { top: "#5c6d7a", mid: "#8fa0a8", low: "#c2c5c0", seaFar: "#5d707c", seaNear: "#42545f", sun: "#e5e2d5", land1: "#57646d", land2: "#46535d", land3: "#36434d" };
    const wet = { top: "#33475c", mid: "#668096", low: "#a8b3ad", seaFar: "#3a5266", seaNear: "#243a4a", sun: "#d8dcd2", land1: "#3c4751", land2: "#2a333d", land3: "#1c232b" };
    const dusk = { top: "#2c3552", mid: "#6a6a8c", low: "#c78d72", seaFar: "#38445e", seaNear: "#232d42", sun: "#e0b090", land1: "#3a4152", land2: "#293040", land3: "#1b202c" };
    const ember = { top: "#2b2436", mid: "#5c4658", low: "#a86a55", seaFar: "#332f44", seaNear: "#1f2333", sun: "#c98a63", land1: "#332e3d", land2: "#252230", land3: "#181622" };
    const evening = { top: "#2e3d5c", mid: "#7f7a95", low: "#e0a377", seaFar: "#3a4a62", seaNear: "#243650", sun: "#f0c68e", land1: "#3d4454", land2: "#2b3340", land3: "#1d242e" };

    let p = base[Math.max(0, Math.min(3, slot))];
    if (weather === "fog") p = foggy;
    else if (weather === "mist") p = mix(base[Math.max(0, Math.min(3, slot))], foggy, 0.55);
    else if (weather === "rain") p = wet;
    else if (weather === "squall") p = mix(wet, ember, 0.45);
    else if (weather === "storm") p = ember;
    if (ch === 4 && slot >= 2) p = mix(p, dusk, 0.5);
    if (ch === 5) p = mix(p, ember, slot === 3 ? 0.8 : 0.4);
    if (ch === 2 && weather === "fog") p = foggy;
    return p;
  }

  function mix(a, b, k) {
    const out = {};
    for (const key in a) out[key] = lerpColor(a[key], b[key], k);
    return out;
  }
  function lerpColor(c1, c2, k) {
    const p1 = hex(c1), p2 = hex(c2);
    const r = Math.round(p1[0] + (p2[0] - p1[0]) * k);
    const g = Math.round(p1[1] + (p2[1] - p1[1]) * k);
    const b = Math.round(p1[2] + (p2[2] - p1[2]) * k);
    return "rgb(" + r + "," + g + "," + b + ")";
  }
  function hex(c) {
    if (c[0] === "#") {
      const n = parseInt(c.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = c.match(/rgb\((\d+),(\d+),(\d+)\)/);
    return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
  }

  /* ---------------- init / fit ---------------- */

  function init(canvas) {
    cv = canvas;
    ctx = cv.getContext("2d");
    fit();
    window.addEventListener("resize", fit);
  }

  function fit() {
    if (!cv) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.max(2, Math.floor(W * dpr));
    cv.height = Math.max(2, Math.floor(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    stars = [];
    for (let i = 0; i < 150; i++) {
      stars.push({ x: Math.random(), y: Math.random() * 0.55, s: Math.random() * 1.4 + 0.4, ph: Math.random() * 6.28, sp: 0.5 + Math.random() });
    }
    drops = [];
    for (let i = 0; i < 160; i++) {
      drops.push({ x: Math.random(), y: Math.random(), l: 0.02 + Math.random() * 0.045, v: 0.5 + Math.random() * 0.8 });
    }
    fogs = [];
    for (let i = 0; i < 6; i++) {
      fogs.push({ x: Math.random(), y: 0.45 + Math.random() * 0.3, w: 0.5 + Math.random() * 0.5, h: 0.1 + Math.random() * 0.12, v: 0.008 + Math.random() * 0.02, a: 0.3 + Math.random() * 0.4 });
    }
    gulls = [];
    for (let i = 0; i < 3; i++) {
      gulls.push({ x: Math.random(), y: 0.2 + Math.random() * 0.25, v: 0.01 + Math.random() * 0.015, ph: Math.random() * 6.28, dir: Math.random() < 0.5 ? -1 : 1 });
    }
  }

  function setScene(name, p) {
    scene = name;
    params = p || {};
    if (name === "day") seedIfNeeded();
  }
  function seedIfNeeded() { /* deterministic enough; keep seeded arrays */ }
  function getScene() { return scene; }

  /* ---------------- draw dispatch ---------------- */

  function draw(dt) {
    if (!ctx) return;
    t += dt;
    ctx.clearRect(0, 0, W, H);
    try {
      if (scene === "title") drawTitle();
      else if (scene === "day") drawDay();
      else if (scene === "night") drawNight();
      else if (scene === "sea") drawSea();
      else drawVoid();
    } catch (e) { drawVoid(); }
  }

  function drawVoid() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0d1115"); g.addColorStop(1, "#05070a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /* ============================================================
     TITLE — the light seen from the water
     ============================================================ */
  function drawTitle() {
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0a0f1c"); g.addColorStop(0.55, "#14203a"); g.addColorStop(0.78, "#1d2c44"); g.addColorStop(1, "#0a0f18");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // stars
    for (const s of stars) {
      const a = 0.35 + 0.5 * Math.abs(Math.sin(t * s.sp + s.ph));
      ctx.fillStyle = "rgba(230,238,250," + (a * 0.8).toFixed(3) + ")";
      ctx.fillRect(s.x * W, s.y * H, s.s, s.s);
    }
    // moon
    const mx = W * 0.22, my = H * 0.2, mr = Math.min(W, H) * 0.045;
    ctx.save();
    ctx.globalAlpha = 0.9;
    const mg = ctx.createRadialGradient(mx, my, mr * 0.2, mx, my, mr * 4);
    mg.addColorStop(0, "rgba(220,228,244,0.5)"); mg.addColorStop(1, "rgba(220,228,244,0)");
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr * 4, 0, 7); ctx.fill();
    ctx.fillStyle = "#e8ecf5"; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(160,172,196,0.5)";
    ctx.beginPath(); ctx.arc(mx - mr * 0.3, my - mr * 0.15, mr * 0.22, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + mr * 0.25, my + mr * 0.3, mr * 0.15, 0, 7); ctx.fill();
    ctx.restore();

    const hy = H * NIGHT_HORIZON;
    drawNightSea(hy, "#16263e", "#0c1626", 0.9);
    drawDistantLight(0.045, hy, 0.75, "#9fc6b8"); // widow's reach, far left
    drawIslet(hy);
    drawLighthouse(W * 0.74, hy, Math.min(W, H) * 0.34, "#0b0f16", true);
    drawBeam(W * 0.74, hy - Math.min(W, H) * 0.3, 1);
    drawWaveFoam(hy);
  }

  function drawNightSea(hy, cFar, cNear, k) {
    const g = ctx.createLinearGradient(0, hy, 0, H);
    g.addColorStop(0, cFar); g.addColorStop(1, cNear);
    ctx.fillStyle = g; ctx.fillRect(0, hy, W, H - hy);
    // moving swell lines
    ctx.strokeStyle = "rgba(140,180,210,0.10)";
    for (let i = 0; i < 5; i++) {
      const y = hy + (H - hy) * (0.12 + i * 0.17);
      ctx.lineWidth = 1 + i * 0.4;
      ctx.beginPath();
      const amp = 2 + i * 2, spd = 0.25 + i * 0.12;
      for (let x = 0; x <= W; x += 14) {
        const yy = y + Math.sin(x * 0.012 + t * spd + i * 2) * amp;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // moon path shimmer
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 26; i++) {
      const y = hy + 6 + i * ((H - hy) / 30);
      const wob = Math.sin(t * 1.3 + i * 0.7) * (4 + i * 1.6);
      const wdt = 8 + i * 2.2;
      ctx.fillStyle = "rgba(200,214,238," + (0.028 * k) + ")";
      ctx.fillRect(W * 0.22 - wdt / 2 + wob, y, wdt, 2);
    }
    ctx.restore();
  }

  function drawWaveFoam(hy) {
    ctx.strokeStyle = "rgba(214,228,240,0.10)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const y = hy + (H - hy) * (0.06 + i * 0.3);
      ctx.beginPath();
      for (let x = 0; x <= W; x += 10) {
        const yy = y + Math.sin(x * 0.02 - t * (0.5 + i * 0.2)) * 3;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }

  function drawIslet(hy) {
    // rocky islet under the lighthouse
    const bx = W * 0.74, bw = W * 0.2;
    ctx.fillStyle = "#080c12";
    ctx.beginPath();
    ctx.moveTo(bx - bw / 2, hy);
    ctx.quadraticCurveTo(bx - bw * 0.25, hy - H * 0.05, bx - bw * 0.1, hy - H * 0.075);
    ctx.lineTo(bx + bw * 0.18, hy - H * 0.07);
    ctx.quadraticCurveTo(bx + bw * 0.42, hy - H * 0.03, bx + bw / 2, hy);
    ctx.closePath(); ctx.fill();
  }

  function drawLighthouse(cx, groundY, hgt, color, lit) {
    const bw = hgt * 0.16, tw = hgt * 0.10;
    const topY = groundY - hgt;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - bw / 2, groundY);
    ctx.lineTo(cx - tw / 2, topY);
    ctx.lineTo(cx + tw / 2, topY);
    ctx.lineTo(cx + bw / 2, groundY);
    ctx.closePath(); ctx.fill();
    // gallery
    const gw = tw * 2.1, gh = hgt * 0.045;
    ctx.fillRect(cx - gw / 2, topY - gh, gw, gh);
    // lantern room
    const lw = tw * 1.5, lh = hgt * 0.10;
    ctx.fillStyle = lit ? "#131a22" : color;
    ctx.fillRect(cx - lw / 2, topY - gh - lh, lw, lh);
    // the light itself
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const lg = ctx.createRadialGradient(cx, topY - gh - lh / 2, 1, cx, topY - gh - lh / 2, lw * 2.2);
    lg.addColorStop(0, "rgba(255,214,140,0.95)");
    lg.addColorStop(0.4, "rgba(240,170,80,0.35)");
    lg.addColorStop(1, "rgba(240,170,80,0)");
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(cx, topY - gh - lh / 2, lw * 2.2, 0, 7); ctx.fill();
    ctx.restore();
    // cap
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - lw / 2 - lw * 0.12, topY - gh - lh);
    ctx.lineTo(cx, topY - gh - lh - lh * 0.7);
    ctx.lineTo(cx + lw / 2 + lw * 0.12, topY - gh - lh);
    ctx.closePath(); ctx.fill();
    return { topY: topY - gh - lh / 2 };
  }

  function drawBeam(cx, cy, strength) {
    const sweep = t * 0.22;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const dir of [0, Math.PI]) {
      const a = sweep + dir;
      const len = W * 0.95;
      const spread = 0.045;
      const x1 = cx + Math.cos(a - spread) * len, y1 = cy + Math.sin(a - spread) * len;
      const x2 = cx + Math.cos(a + spread) * len, y2 = cy + Math.sin(a + spread) * len;
      const gr = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      gr.addColorStop(0, "rgba(255,216,150," + (0.30 * strength) + ")");
      gr.addColorStop(0.5, "rgba(255,206,130," + (0.12 * strength) + ")");
      gr.addColorStop(1, "rgba(255,206,130,0)");
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawDistantLight(nx, hy, strength, color) {
    const x = nx * W;
    const flick = 0.55 + 0.45 * Math.abs(Math.sin(t * 0.8));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(x, hy - 2, 1, x, hy - 2, 16);
    g.addColorStop(0, "rgba(159,198,184," + (0.8 * flick * strength) + ")");
    g.addColorStop(1, "rgba(159,198,184,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, hy - 2, 16, 0, 7); ctx.fill();
    ctx.restore();
  }

  /* ============================================================
     DAY — the island of Halden Point
     ============================================================ */
  function drawDay() {
    const ch = params.chapter || 1, slot = params.slot || 0, weather = params.weather || "clear";
    const p = dayPalette(ch, slot, weather);
    const hy = H * HORIZON;

    // sky
    const g = ctx.createLinearGradient(0, 0, 0, hy * 1.15);
    g.addColorStop(0, p.top); g.addColorStop(0.62, p.mid); g.addColorStop(1, p.low);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy * 1.15);

    // clouds
    drawClouds(p, weather, hy);

    // sun glow
    const sx = W * (slot === 0 ? 0.78 : slot === 3 ? 0.18 : 0.5);
    const sy = hy * (slot === 0 || slot === 3 ? 0.72 : 0.3);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const sg = ctx.createRadialGradient(sx, sy, 8, sx, sy, Math.min(W, H) * (weather === "clear" ? 0.5 : 0.3));
    sg.addColorStop(0, rgba(p.sun, 0.5)); sg.addColorStop(1, rgba(p.sun, 0));
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, Math.min(W, H) * 0.5, 0, 7); ctx.fill();
    ctx.restore();

    // stars faint at dawn/dusk
    if (slot === 0 || slot === 3) {
      for (const s of stars) {
        const a = (slot === 0 ? 0.25 : 0.18) * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
        ctx.fillStyle = "rgba(230,238,250," + a.toFixed(3) + ")";
        ctx.fillRect(s.x * W, s.y * hy * 0.7, s.s, s.s);
      }
    }

    // sea
    const sea = ctx.createLinearGradient(0, hy, 0, H);
    sea.addColorStop(0, p.seaFar); sea.addColorStop(1, p.seaNear);
    ctx.fillStyle = sea; ctx.fillRect(0, hy, W, H - hy);
    // swell
    for (let i = 0; i < 4; i++) {
      const y = hy + (H - hy) * (0.1 + i * 0.24);
      ctx.strokeStyle = rgba(p.sun, 0.07 + i * 0.02);
      ctx.lineWidth = 1 + i * 0.5;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 16) {
        const yy = y + Math.sin(x * 0.011 + t * (0.3 + i * 0.15) + i * 1.7) * (2 + i * 2.4);
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // sun path on water
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 18; i++) {
      const y = hy + 4 + i * ((H - hy) / 22);
      const wob = Math.sin(t * 1.1 + i * 0.6) * (3 + i * 1.4);
      ctx.fillStyle = rgba(p.sun, 0.03);
      ctx.fillRect(sx - (4 + i * 1.6) + wob, y, 8 + i * 3.2, 2);
    }
    ctx.restore();

    // far headland (atmosphere)
    ctx.fillStyle = p.land1;
    drawHeadland(0.86, hy, H * 0.10, W * 0.3);
    // Widow's Reach light far right
    drawTinyTower(W * 0.895, hy - H * 0.085, H * 0.05, p.land2);

    // the island
    drawIsland(p, hy, ch, slot, weather);

    // birds
    drawGulls(p, weather);

    // weather overlays
    drawWeatherOverlays(p, weather, hy);

    // low haze line
    const hz = ctx.createLinearGradient(0, hy - H * 0.06, 0, hy);
    hz.addColorStop(0, rgba(p.low, 0)); hz.addColorStop(1, rgba(p.low, 0.22));
    ctx.fillStyle = hz; ctx.fillRect(0, hy - H * 0.06, W, H * 0.06);
  }

  function rgba(hexC, a) {
    const p = hex(hexC);
    return "rgba(" + p[0] + "," + p[1] + "," + p[2] + "," + a + ")";
  }

  function drawClouds(p, weather, hy) {
    const n = weather === "clear" ? 4 : weather === "mist" ? 6 : 8;
    const dark = weather === "squall" || weather === "storm";
    for (let i = 0; i < n; i++) {
      const cx = ((i * 0.19 + 0.05) + Math.sin(t * 0.008 + i * 2.3) * 0.02) * W;
      const cy = hy * (0.12 + (i % 3) * 0.2);
      const cw = W * (0.14 + (i % 4) * 0.05);
      const chh = H * 0.028;
      ctx.fillStyle = dark ? "rgba(30,32,44,0.55)" : "rgba(235,238,242,0.10)";
      for (let b = 0; b < 3; b++) {
        ctx.beginPath();
        ctx.ellipse(cx + b * cw * 0.22 - cw * 0.2, cy + (b % 2) * chh * 0.5, cw * (0.3 - b * 0.06), chh * (1.2 - b * 0.2), 0, 0, 7);
        ctx.fill();
      }
    }
  }

  function drawHeadland(cxN, hy, h, w) {
    const cx = cxN * W;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, hy);
    ctx.quadraticCurveTo(cx - w * 0.3, hy - h * 0.6, cx - w * 0.05, hy - h);
    ctx.quadraticCurveTo(cx + w * 0.15, hy - h * 0.7, cx + w * 0.3, hy - h * 0.35);
    ctx.quadraticCurveTo(cx + w * 0.4, hy - h * 0.1, cx + w / 2, hy);
    ctx.closePath(); ctx.fill();
  }

  function drawTinyTower(cx, gy, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(cx - h * 0.09, gy, h * 0.18, h);
    ctx.fillRect(cx - h * 0.14, gy - h * 0.12, h * 0.28, h * 0.12);
  }

  function drawIsland(p, hy, ch, slot, weather) {
    // normalized geometry: skyline (top edge) and shoreline (near water edge)
    const low = params.tide === "low" ? 0.02 : 0;
    // skyline control points (x, y)
    const sky = [
      [-0.05, 0.615], [0.10, 0.600], [0.24, 0.585], [0.36, 0.570],
      [0.47, 0.578], [0.55, 0.585], [0.62, 0.600], [0.68, 0.585],
      [0.73, 0.548], [0.79, 0.522], [0.82, 0.555], [0.835, 0.575],
    ];
    // shoreline (near water edge, in front of the land)
    const shorePts = [
      [0.835, 0.575], [0.62, 0.640 + low], [0.40, 0.668 + low], [0.18, 0.690 + low], [-0.05, 0.705 + low],
    ];
    const X = (n) => n * W, Y = (n) => n * H;

    // land silhouette: skyline out, shoreline back
    ctx.fillStyle = p.land3;
    ctx.beginPath();
    ctx.moveTo(X(sky[0][0]), Y(sky[0][1]));
    for (let i = 1; i < sky.length - 1; i++) {
      const xc = (sky[i][0] + sky[i + 1][0]) / 2, yc = (sky[i][1] + sky[i + 1][1]) / 2;
      ctx.quadraticCurveTo(X(sky[i][0]), Y(sky[i][1]), X(xc), Y(yc));
    }
    ctx.lineTo(X(sky[sky.length - 1][0]), Y(sky[sky.length - 1][1]));
    for (let i = 0; i < shorePts.length - 1; i++) {
      const xc = (shorePts[i][0] + shorePts[i + 1][0]) / 2, yc = (shorePts[i][1] + shorePts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(X(shorePts[i][0]), Y(shorePts[i][1]), X(xc), Y(yc));
    }
    ctx.lineTo(X(shorePts[shorePts.length - 1][0]), Y(shorePts[shorePts.length - 1][1]));
    ctx.closePath(); ctx.fill();

    // cliff-face tone: a lighter band under the skyline
    ctx.fillStyle = p.land2;
    ctx.beginPath();
    ctx.moveTo(X(sky[0][0]), Y(sky[0][1]));
    for (let i = 1; i < sky.length - 1; i++) {
      const xc = (sky[i][0] + sky[i + 1][0]) / 2, yc = (sky[i][1] + sky[i + 1][1]) / 2;
      ctx.quadraticCurveTo(X(sky[i][0]), Y(sky[i][1]), X(xc), Y(yc));
    }
    ctx.lineTo(X(sky[sky.length - 1][0]), Y(sky[sky.length - 1][1]));
    ctx.lineTo(X(0.80), Y(0.640 + low));
    ctx.quadraticCurveTo(X(0.5), Y(0.608 + low), X(0.2), Y(0.625 + low));
    ctx.lineTo(X(-0.05), Y(0.635 + low));
    ctx.closePath(); ctx.fill();

    // wet sand line at the water's edge
    ctx.strokeStyle = rgba(p.sun, 0.18);
    ctx.lineWidth = Math.max(1.5, H * 0.004);
    ctx.beginPath();
    ctx.moveTo(X(-0.05), Y(0.705 + low));
    for (let i = 0; i < shorePts.length - 1; i++) {
      const xc = (shorePts[i][0] + shorePts[i + 1][0]) / 2, yc = (shorePts[i][1] + shorePts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(X(shorePts[i][0]), Y(shorePts[i][1]), X(xc), Y(yc));
    }
    ctx.stroke();

    // jetty planks reaching into the water (from the foreshore out to sea)
    const jx = LANDMARKS.jetty.x * W, jy = LANDMARKS.jetty.y * H;
    ctx.strokeStyle = p.land3; ctx.lineWidth = Math.max(3, H * 0.011);
    ctx.beginPath(); ctx.moveTo(jx + W * 0.02, Y(0.700 + low)); ctx.lineTo(jx - W * 0.045, Y(0.612)); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = rgba(p.sun, 0.3);
    for (let i = 0; i < 5; i++) {
      const k = i / 4;
      const px1 = jx + W * 0.02 - k * W * 0.065, py1 = Y(0.700 + low) - k * H * 0.088;
      ctx.beginPath(); ctx.moveTo(px1 + 2, py1); ctx.lineTo(px1 + W * 0.004, py1 + H * 0.010); ctx.stroke();
    }

    // Bo's Tern at anchor by the jetty (when called for)
    if (params.tern) {
      drawBoat(Y(0.640), jx - W * 0.085, p);
    }

    // keeper's skiff hauled above the tide line
    if (params.skiff !== false) {
      drawSkiff(LANDMARKS.skiff.x * W, Y(0.655 + low * 0.5), p, params.skiff === "broken");
    }

    // the tower on the plateau
    const tx = LANDMARKS.tower.x * W;
    const th = H * 0.30;
    drawDayTower(tx, Y(0.585), th, p, slot);

    // keeper's house on the near slope
    const hx = LANDMARKS.house.x * W;
    drawHouse(hx, Y(0.585), p, slot);

    // fog bell stand between tower and house
    const bx2 = LANDMARKS.bell.x * W;
    drawBellStand(bx2, Y(0.625 + low * 0.4), p, params.bellRepaired);

    // oil store shed at the tower's foot
    const stx = LANDMARKS.store.x * W;
    drawStoreShed(stx, Y(0.605), p);

    // cliff path winding up the headland
    ctx.strokeStyle = rgba(p.land1, 0.95);
    ctx.lineWidth = Math.max(1.4, H * 0.006);
    ctx.beginPath();
    ctx.moveTo(X(0.615), Y(0.600));
    ctx.quadraticCurveTo(X(0.655), Y(0.588), X(0.675), Y(0.565));
    ctx.quadraticCurveTo(X(0.695), Y(0.548), X(0.745), Y(0.538));
    ctx.stroke();
  }

  function drawDayTower(cx, groundY, hgt, p, slot) {
    const bw = hgt * 0.22, tw = hgt * 0.13;
    const topY = groundY - hgt;
    // body — cream stone catching the light
    const bodyG = ctx.createLinearGradient(cx - bw, 0, cx + bw, 0);
    bodyG.addColorStop(0, rgba(p.sun, 0.75));
    bodyG.addColorStop(0.55, rgba(p.sun, 0.95));
    bodyG.addColorStop(1, rgba(p.land1, 0.9));
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.moveTo(cx - bw / 2, groundY);
    ctx.lineTo(cx - tw / 2, topY);
    ctx.lineTo(cx + tw / 2, topY);
    ctx.lineTo(cx + bw / 2, groundY);
    ctx.closePath(); ctx.fill();
    // dark band
    ctx.fillStyle = rgba(p.land2, 0.85);
    ctx.beginPath();
    ctx.moveTo(cx - (bw * 0.5 + (bw - tw) * 0.28), groundY - hgt * 0.28);
    ctx.lineTo(cx - (tw * 0.5 + (bw - tw) * 0.18), topY + hgt * 0.28);
    ctx.lineTo(cx + (tw * 0.5 + (bw - tw) * 0.18), topY + hgt * 0.28);
    ctx.lineTo(cx + (bw * 0.5 + (bw - tw) * 0.28), groundY - hgt * 0.28);
    ctx.closePath(); ctx.fill();
    // gallery
    ctx.fillStyle = rgba(p.land3, 0.95);
    ctx.fillRect(cx - tw * 1.15, topY - hgt * 0.05, tw * 2.3, hgt * 0.05);
    // lantern room (dark) with warm glint
    ctx.fillStyle = "#10151c";
    ctx.fillRect(cx - tw * 0.8, topY - hgt * 0.14, tw * 1.6, hgt * 0.09);
    if (slot >= 2) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const lg = ctx.createRadialGradient(cx, topY - hgt * 0.1, 1, cx, topY - hgt * 0.1, tw * 1.6);
      lg.addColorStop(0, "rgba(255,208,130,0.55)"); lg.addColorStop(1, "rgba(255,208,130,0)");
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(cx, topY - hgt * 0.1, tw * 1.6, 0, 7); ctx.fill();
      ctx.restore();
    }
    // cap
    ctx.fillStyle = rgba(p.land3, 1);
    ctx.beginPath();
    ctx.moveTo(cx - tw, topY - hgt * 0.14);
    ctx.lineTo(cx, topY - hgt * 0.20);
    ctx.lineTo(cx + tw, topY - hgt * 0.14);
    ctx.closePath(); ctx.fill();
  }

  function drawHouse(cx, gy, p, slot) {
    const w = W * 0.055, h = H * 0.055;
    ctx.fillStyle = p.land2;
    ctx.fillRect(cx - w / 2, gy - h, w, h);
    // roof
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.6, gy - h);
    ctx.lineTo(cx, gy - h - h * 0.55);
    ctx.lineTo(cx + w * 0.6, gy - h);
    ctx.closePath(); ctx.fill();
    // chimney
    ctx.fillRect(cx + w * 0.22, gy - h - h * 0.5, w * 0.12, h * 0.4);
    // window glow late in the day
    if (slot >= 2) {
      ctx.fillStyle = "rgba(255,196,110,0.85)";
      ctx.fillRect(cx - w * 0.18, gy - h * 0.72, w * 0.14, h * 0.2);
    } else {
      ctx.fillStyle = rgba(p.land3, 0.9);
      ctx.fillRect(cx - w * 0.18, gy - h * 0.72, w * 0.14, h * 0.2);
    }
    // smoke
    if (slot <= 2) {
      ctx.strokeStyle = "rgba(220,225,232,0.10)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + w * 0.28, gy - h - h * 0.55);
      ctx.quadraticCurveTo(cx + w * 0.32 + Math.sin(t) * 4, gy - h - h * 0.8, cx + w * 0.3 + Math.sin(t * 0.7) * 6, gy - h - h * 1.05);
      ctx.stroke();
    }
  }

  function drawBellStand(cx, gy, p, repaired) {
    ctx.strokeStyle = p.land3;
    ctx.lineWidth = Math.max(1.5, H * 0.006);
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.012, gy);
    ctx.lineTo(cx, gy - H * 0.05);
    ctx.lineTo(cx + W * 0.012, gy);
    ctx.stroke();
    // the bell
    ctx.fillStyle = repaired ? "#b98a4a" : rgba(p.land1, 0.95);
    ctx.beginPath();
    ctx.arc(cx, gy - H * 0.038, H * 0.011, Math.PI, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(cx - H * 0.013, gy - H * 0.038, H * 0.026, H * 0.005);
  }

  function drawStoreShed(cx, gy, p) {
    const w = W * 0.042, h = H * 0.04;
    ctx.fillStyle = p.land2;
    ctx.fillRect(cx - w / 2, gy - h, w, h);
    ctx.fillStyle = p.land3;
    ctx.fillRect(cx - w * 0.55, gy - h - h * 0.3, w * 1.1, h * 0.32);
  }

  function drawBoat(wy, bx, p) {
    const bw = W * 0.07, bh = H * 0.016;
    const bob = Math.sin(t * 1.4) * 2;
    ctx.fillStyle = "#10151c";
    ctx.beginPath();
    ctx.moveTo(bx - bw / 2, wy + bob);
    ctx.quadraticCurveTo(bx, wy + bh * 1.6 + bob, bx + bw / 2, wy + bob);
    ctx.closePath(); ctx.fill();
    // mast
    ctx.strokeStyle = "#10151c"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(bx, wy + bob); ctx.lineTo(bx, wy - bh * 3.4 + bob); ctx.stroke();
    // pennant
    ctx.fillStyle = rgba("#c06a3e", 0.9);
    const flap = Math.sin(t * 3) * 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, wy - bh * 3.4 + bob);
    ctx.lineTo(bx + bw * 0.16, wy - bh * 3.4 + 3 + flap + bob);
    ctx.lineTo(bx, wy - bh * 3.2 + bob);
    ctx.closePath(); ctx.fill();
  }

  function drawSkiff(sx, sy, p, broken) {
    const sw = W * 0.045;
    ctx.fillStyle = p.land3;
    ctx.beginPath();
    if (broken) {
      // keel, keeled over
      ctx.moveTo(sx - sw / 2, sy);
      ctx.quadraticCurveTo(sx, sy - H * 0.012, sx + sw / 2, sy - H * 0.004);
      ctx.lineTo(sx + sw / 2 - 2, sy + H * 0.006);
      ctx.quadraticCurveTo(sx, sy + H * 0.004, sx - sw / 2, sy + H * 0.008);
    } else {
      ctx.moveTo(sx - sw / 2, sy);
      ctx.quadraticCurveTo(sx, sy + H * 0.014, sx + sw / 2, sy);
      ctx.quadraticCurveTo(sx, sy + H * 0.006, sx - sw / 2, sy);
    }
    ctx.closePath(); ctx.fill();
  }

  function drawGulls(p, weather) {
    if (weather === "storm" || weather === "squall") return;
    for (const g of gulls) {
      g.x += g.v * g.dir * 0.016;
      if (g.x > 1.05) g.x = -0.05; if (g.x < -0.05) g.x = 1.05;
      const flap = Math.sin(t * 6 + g.ph) * 0.5 + 0.5;
      const x = g.x * W, y = g.y * H;
      ctx.strokeStyle = "rgba(28,36,44,0.8)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - 7, y - 2 + flap * 3);
      ctx.quadraticCurveTo(x - 3, y, x, y);
      ctx.quadraticCurveTo(x + 3, y, x + 7, y - 2 + flap * 3);
      ctx.stroke();
    }
  }

  function drawWeatherOverlays(p, weather, hy) {
    if (weather === "fog" || weather === "mist") {
      const strength = weather === "fog" ? 0.85 : 0.45;
      for (const f of fogs) {
        f.x += f.v * 0.016;
        if (f.x > 1.4) f.x = -0.4;
        const cx = f.x * W, cy = f.y * H;
        const grd = ctx.createRadialGradient(cx, cy, 10, cx, cy, f.w * W * 0.6);
        grd.addColorStop(0, "rgba(214,222,228," + (f.a * strength * 0.5) + ")");
        grd.addColorStop(1, "rgba(214,222,228,0)");
        ctx.fillStyle = grd;
        ctx.save();
        ctx.translate(cx, cy); ctx.scale(1.6, 0.6); ctx.translate(-cx, -cy);
        ctx.beginPath(); ctx.arc(cx, cy, f.w * W * 0.6, 0, 7); ctx.fill();
        ctx.restore();
      }
    }
    if (weather === "rain" || weather === "squall" || weather === "storm") {
      const n = weather === "rain" ? 90 : 160;
      const slant = weather === "storm" ? 0.35 : 0.18;
      ctx.strokeStyle = "rgba(190,205,220,0.28)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const d = drops[i];
        d.y += d.v * 0.02; d.x += d.v * 0.02 * slant;
        if (d.y > 1.02) { d.y = -0.05; d.x = Math.random() * 1.1 - 0.05; }
        if (d.x > 1.05) d.x = -0.05;
        const x = d.x * W, y = d.y * H;
        ctx.moveTo(x, y); ctx.lineTo(x + slant * d.l * H, y + d.l * H);
      }
      ctx.stroke();
    }
    if (weather === "storm") {
      if (Math.random() < 0.004 && flashes.length < 2) flashes.push({ a: 0.8, x: Math.random() * W });
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.a -= 0.06;
        if (f.a <= 0) { flashes.splice(i, 1); continue; }
        ctx.fillStyle = "rgba(226,232,244," + (f.a * 0.35) + ")";
        ctx.fillRect(0, 0, W, H);
      }
    }
  }

  /* ============================================================
     NIGHT — inside the lamp room, looking out
     ============================================================ */
  function drawNight() {
    const P = params;
    const bright = P.brightness || "full";
    const oil = P.oil === undefined ? 70 : P.oil;
    const wick = P.wick === undefined ? 100 : P.wick;
    const lens = P.lens === undefined ? 100 : P.lens;
    const weather = P.weather || "clear";
    const swell = P.swell === undefined ? 0 : P.swell;      // 0..1 proximity
    const ch = P.chapter || 1;

    // room
    const room = ctx.createLinearGradient(0, 0, 0, H);
    room.addColorStop(0, "#0a0d12"); room.addColorStop(1, "#05070a");
    ctx.fillStyle = room; ctx.fillRect(0, 0, W, H);

    // window opening (big, center-right)
    const wx = W * 0.30, wy = H * 0.10, ww = W * 0.52, wh = H * 0.62;
    ctx.save();
    ctx.beginPath();
    roundRect(wx, wy, ww, wh, 14);
    ctx.clip();

    // night sky through the glass
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh * 0.62);
    if (weather === "storm" || weather === "squall") {
      sky.addColorStop(0, "#0b0e16"); sky.addColorStop(1, "#141a26");
    } else {
      sky.addColorStop(0, "#0a1120"); sky.addColorStop(1, "#182338");
    }
    ctx.fillStyle = sky; ctx.fillRect(wx, wy, ww, wh);
    // stars (only in fair weather)
    if (weather !== "storm" && weather !== "squall" && weather !== "rain") {
      for (const s of stars) {
        if (s.y > 0.45) continue;
        const a = 0.3 + 0.4 * Math.abs(Math.sin(t * s.sp + s.ph));
        ctx.fillStyle = "rgba(220,230,246," + (a * 0.7).toFixed(3) + ")";
        ctx.fillRect(wx + s.x * ww, wy + s.y * wh * 0.9, s.s, s.s);
      }
    }
    // sea
    const nhy = wy + wh * 0.52;
    const sea = ctx.createLinearGradient(0, nhy, 0, wy + wh);
    sea.addColorStop(0, "#101a2b"); sea.addColorStop(1, "#070b12");
    ctx.fillStyle = sea; ctx.fillRect(wx, nhy, ww, wy + wh - nhy);
    // moving swells
    ctx.strokeStyle = "rgba(120,160,200,0.10)";
    for (let i = 0; i < 4; i++) {
      const y = nhy + (wy + wh - nhy) * (0.14 + i * 0.26);
      ctx.lineWidth = 1 + i * 0.5;
      ctx.beginPath();
      for (let x = 0; x <= ww; x += 12) {
        const yy = y + Math.sin(x * 0.015 + t * (0.35 + i * 0.18) + i * 2) * (1.5 + i * 1.8 + (weather === "storm" ? 4 : 0));
        if (x === 0) ctx.moveTo(wx + x, yy); else ctx.lineTo(wx + x, yy);
      }
      ctx.stroke();
    }

    // the Swell — green light under the water
    if (swell > 0.02) {
      const gx = wx + ww * (0.5 + Math.sin(t * 0.1) * 0.12);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const pulse = 0.6 + 0.4 * Math.sin(t * (0.9 + swell));
      const gr = ctx.createRadialGradient(gx, nhy + 8, 4, gx, nhy + 8, ww * (0.14 + swell * 0.3));
      gr.addColorStop(0, "rgba(120,255,190," + (0.34 * swell * pulse) + ")");
      gr.addColorStop(0.5, "rgba(80,200,150," + (0.16 * swell * pulse) + ")");
      gr.addColorStop(1, "rgba(80,200,150,0)");
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(gx, nhy + 8, ww * (0.14 + swell * 0.3), 0, 7); ctx.fill();
      // shimmering columns
      for (let i = 0; i < 6; i++) {
        const colx = gx + Math.sin(t * 0.6 + i * 1.3) * ww * 0.05;
        ctx.fillStyle = "rgba(140,255,200," + (0.05 * swell * pulse) + ")";
        ctx.fillRect(colx - 2, nhy + 4, 4, (wy + wh - nhy) * (0.3 + 0.1 * ((i * 7 + Math.floor(t * 3)) % 5)));
      }
      ctx.restore();
    }

    // ships: little lights on the water
    if (P.ships) {
      for (const s of P.ships) {
        const x = wx + ww * s.x, y = nhy + (wy + wh - nhy) * (0.18 + s.row * 0.2) + Math.sin(t * 1.2 + s.row * 2) * 2;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const g2 = ctx.createRadialGradient(x, y, 0.5, x, y, 9);
        g2.addColorStop(0, s.color); g2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g2; ctx.globalAlpha = s.gone ? 0.15 : 0.9;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
        // hull hint
        ctx.fillStyle = "rgba(6,10,16,0.9)";
        ctx.beginPath();
        ctx.moveTo(x - 9, y);
        ctx.quadraticCurveTo(x, y + 4, x + 9, y);
        ctx.lineTo(x + 6, y - 1); ctx.lineTo(x - 6, y - 1);
        ctx.closePath(); ctx.fill();
        // reflection
        ctx.fillStyle = s.color; ctx.globalAlpha = 0.12;
        ctx.fillRect(x - 1.5, y + 3, 3, 10);
        ctx.globalAlpha = 1;
      }
    }

    // rain on the glass
    if (weather === "rain" || weather === "squall" || weather === "storm") {
      ctx.strokeStyle = "rgba(180,200,220,0.20)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const n = weather === "storm" ? 70 : 40;
      for (let i = 0; i < n; i++) {
        const d = drops[(i * 3 + 1) % drops.length];
        const x = wx + ((d.x + t * 0.03 * d.v) % 1) * ww;
        const y = wy + ((d.y + t * (0.14 * d.v)) % 1) * wh;
        ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 9);
      }
      ctx.stroke();
      // droplets
      ctx.fillStyle = "rgba(190,210,230,0.10)";
      for (let i = 0; i < 24; i++) {
        const x = wx + ((stars[i].x * 7.3) % 1) * ww, y = wy + ((stars[i].y * 11.7) % 1) * wh;
        ctx.beginPath(); ctx.arc(x, y, 1.6 + stars[i].s, 0, 7); ctx.fill();
      }
    }
    ctx.restore(); // unclip window

    // window frame (stone reveal)
    ctx.strokeStyle = "#1c242e";
    ctx.lineWidth = 10;
    roundRectStroke(wx, wy, ww, wh, 14);
    // cross bars
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh * 0.45); ctx.lineTo(wx + ww, wy + wh * 0.45);
    ctx.stroke();

    // the lens on the left — fresnel rings around the flame
    const lx = W * 0.155, ly = H * 0.44, lr = Math.min(W, H) * 0.17;
    drawLens(lx, ly, lr, bright, oil, wick, lens, ch);

    // apparatus sill
    ctx.fillStyle = "#12171e";
    ctx.fillRect(0, H * 0.845, W, H * 0.16);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, H * 0.845, W, 2);

    // storm shakes the room — subtle frame jitter handled by main via canvas translate
    if (P.shake && P.shake > 0) {
      // drawn as edge darkening pulses
      const s = P.shake;
      ctx.fillStyle = "rgba(0,0,0," + (0.2 * s) + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawLens(cx, cy, r, bright, oil, wick, lens, ch) {
    const flareBase = bright === "beacon" ? 1 : bright === "low" ? 0.45 : 0.72;
    const oilF = oil / 100;
    const wickF = wick / 100;
    const gutter = oilF < 0.12 || wickF < 0.25;
    const flick = gutter
      ? (Math.sin(t * 17) * 0.5 + Math.sin(t * 31) * 0.5) * 0.5 + 0.5 // erratic
      : (Math.sin(t * 3.1) * 0.06 + Math.sin(t * 7.7) * 0.04 + 0.9);
    const flame = flareBase * flick * (0.35 + 0.65 * Math.min(1, wickF * 1.4)) * (0.4 + 0.6 * Math.min(1, oilF * 2.2));

    // glow
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 1.9);
    g.addColorStop(0, "rgba(255,220,150," + (0.9 * flame) + ")");
    g.addColorStop(0.3, "rgba(250,180,90," + (0.4 * flame) + ")");
    g.addColorStop(1, "rgba(250,180,90,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.9, 0, 7); ctx.fill();

    // the flame
    const fh = r * 0.5 * (0.7 + 0.3 * flick) * (0.5 + 0.5 * wickF);
    const fw = r * 0.16;
    const fg = ctx.createLinearGradient(cx, cy - fh, cx, cy + fh * 0.3);
    fg.addColorStop(0, "rgba(255,246,214," + (0.95 * flame) + ")");
    fg.addColorStop(0.5, "rgba(255,204,110," + (0.9 * flame) + ")");
    fg.addColorStop(1, "rgba(230,140,50," + (0.8 * flame) + ")");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(cx, cy - fh);
    ctx.quadraticCurveTo(cx + fw, cy - fh * 0.3, cx + fw * 0.7, cy + fh * 0.25);
    ctx.quadraticCurveTo(cx, cy + fh * 0.45, cx - fw * 0.7, cy + fh * 0.25);
    ctx.quadraticCurveTo(cx - fw, cy - fh * 0.3, cx, cy - fh);
    ctx.fill();
    ctx.restore();

    // fresnel prisms: concentric arc rings, glassy
    for (let i = 0; i < 5; i++) {
      const rr = r * (0.36 + i * 0.16);
      ctx.strokeStyle = "rgba(190,214,226," + (0.16 - i * 0.02) + ")";
      ctx.lineWidth = 2.4 - i * 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, -Math.PI * 0.86, Math.PI * 0.86);
      ctx.stroke();
    }
    // rotating lens bands (when trued, smooth; when off-true, wobble)
    const wobble = (1 - lens / 100) * 0.5;
    const rot = t * 0.6 + Math.sin(t * 2.3) * wobble;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = "rgba(200,226,240,0.07)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(r * 0.42, 0); ctx.lineTo(r * 0.92, 0); ctx.stroke();
    }
    ctx.restore();
    // brass frame
    ctx.strokeStyle = "rgba(180,140,70,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function roundRectStroke(x, y, w, h, r) {
    roundRect(x, y, w, h, r);
    ctx.stroke();
  }

  /* ============================================================
     SEA — endings: open water at first light
     ============================================================ */
  function drawSea() {
    const v = params.variant || "dawn";
    const hy = H * 0.55;
    const g = ctx.createLinearGradient(0, 0, 0, hy);
    if (v === "dawn" || v === "two") {
      g.addColorStop(0, "#1d2b44"); g.addColorStop(0.6, "#5a6c8a"); g.addColorStop(1, "#e8b184");
    } else {
      g.addColorStop(0, "#101a2e"); g.addColorStop(1, "#3c4a66");
    }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hy);
    // sun
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const sg = ctx.createRadialGradient(W * 0.5, hy * 0.88, 4, W * 0.5, hy * 0.88, Math.min(W, H) * 0.4);
    sg.addColorStop(0, "rgba(255,226,170,0.8)"); sg.addColorStop(1, "rgba(255,226,170,0)");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(W * 0.5, hy * 0.88, Math.min(W, H) * 0.4, 0, 7); ctx.fill();
    ctx.restore();
    // sea
    const s = ctx.createLinearGradient(0, hy, 0, H);
    s.addColorStop(0, "#48597a"); s.addColorStop(1, "#232e46");
    ctx.fillStyle = s; ctx.fillRect(0, hy, W, H - hy);
    for (let i = 0; i < 5; i++) {
      const y = hy + (H - hy) * (0.08 + i * 0.2);
      ctx.strokeStyle = "rgba(255,220,170," + (0.10 - i * 0.015) + ")";
      ctx.lineWidth = 1 + i * 0.6;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 14) {
        const yy = y + Math.sin(x * 0.01 + t * (0.22 + i * 0.1) + i * 1.9) * (2 + i * 2.2);
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // sun path
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 20; i++) {
      const y = hy + 4 + i * ((H - hy) / 24);
      const wob = Math.sin(t * 0.9 + i * 0.5) * (4 + i * 1.4);
      ctx.fillStyle = "rgba(255,214,150,0.05)";
      ctx.fillRect(W * 0.5 - (6 + i * 2) + wob, y, 12 + i * 4, 2);
    }
    ctx.restore();

    if (v === "two") {
      // two lights across the water
      drawTinyTower(W * 0.16, hy - H * 0.03, H * 0.09, "#0b0f16");
      drawTinyTower(W * 0.84, hy - H * 0.03, H * 0.09, "#0b0f16");
      const pulse1 = 0.6 + 0.4 * Math.sin(t * 0.7);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      [[0.16, "#ffd88f"], [0.84, "#9fc6b8"]].forEach((L, idx) => {
        const pulse = 0.6 + 0.4 * Math.sin(t * (idx ? 0.8 : 0.7));
        const g2 = ctx.createRadialGradient(L[0] * W, hy - H * 0.035, 1, L[0] * W, hy - H * 0.035, 26);
        g2.addColorStop(0, hexA(L[1], 0.8 * pulse)); g2.addColorStop(1, hexA(L[1], 0));
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(L[0] * W, hy - H * 0.035, 26, 0, 7); ctx.fill();
      });
      ctx.restore();
    }
    if (v === "skiff" || v === "dawn") {
      // a small boat, far out
      const bx = W * (0.5 + Math.sin(t * 0.05) * 0.02), by = hy + (H - hy) * 0.3 + Math.sin(t * 0.8) * 3;
      const bw = W * 0.05;
      ctx.fillStyle = "rgba(12,16,22,0.95)";
      ctx.beginPath();
      ctx.moveTo(bx - bw / 2, by);
      ctx.quadraticCurveTo(bx, by + H * 0.014, bx + bw / 2, by);
      ctx.lineTo(bx + bw * 0.4, by - 2);
      ctx.quadraticCurveTo(bx, by + 3, bx - bw * 0.4, by - 2);
      ctx.closePath(); ctx.fill();
      // a figure and a lantern
      ctx.strokeStyle = "rgba(12,16,22,0.95)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, by - 2); ctx.lineTo(bx, by - H * 0.02); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by - H * 0.016); ctx.lineTo(bx + bw * 0.18, by - H * 0.024); ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const lg = ctx.createRadialGradient(bx + bw * 0.18, by - H * 0.024, 1, bx + bw * 0.18, by - H * 0.024, 14);
      lg.addColorStop(0, "rgba(255,216,150,0.85)"); lg.addColorStop(1, "rgba(255,216,150,0)");
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(bx + bw * 0.18, by - H * 0.024, 14, 0, 7); ctx.fill();
      ctx.restore();
    }
  }

  function hexA(hexC, a) {
    const p = hex(hexC);
    return "rgba(" + p[0] + "," + p[1] + "," + p[2] + "," + a + ")";
  }

  /* ---------------- public ---------------- */
  return {
    init, fit, draw, setScene, getScene,
    LANDMARKS,
    params: () => params,
    setParams: (p) => { params = Object.assign({}, params, p); },
    clearParams: () => { params = {}; },
  };
})();
