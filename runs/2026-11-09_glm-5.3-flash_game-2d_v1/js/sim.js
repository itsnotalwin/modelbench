/* ============================================================
   HIVEMOTHER — simulation: queen, swarm, wasps, season.
   Fixed-substep integration; all units are world px & seconds.
   ============================================================ */
var HM = window.HM = window.HM || {};

HM.sim = (function () {
  var W = HM.W, H = HM.H;
  var clamp = HM.clamp, lerp = HM.lerp, dist = HM.dist, dist2 = HM.dist2;

  var CFG = {
    queen: { r: 15, maxSpeed: 330, accel: 2300, keyAccel: 1900, friction: 5.5, bound: 30 },
    scentR: 235,
    bee: {
      maxSpeed: 245, fleeSpeed: 315, accel: 1150, carryMax: 3,
      gatherTick: 0.75, gatherR: 30, depR: 40,
      sepR: 21, sepW: 780, alignR: 46, alignW: 2.2,
      followR: 86, fleeR: 150, rally: 1.65, rallyT: 1.7
    },
    wasp: {
      r: 8, baseSpeed: 238, speedPerDay: 5, maxSpeed: 310,
      aggroBase: 175, aggroPerDay: 12, catchR: 12.5,
      stunT: 1.4, digestT: 2.6, weave: 46, retarget: 0.25
    },
    pulse: { cd: 3.0, r1: 255, knock: 470 },
    decoy: { cost: 12, cd: 6, life: 5, r: 350 },
    day: {
      len:   [70, 70, 68, 66, 64, 60, 56],
      quota: [52, 66, 76, 84, 90, 94, 96],
      wasps: [2, 2, 3, 3, 4, 4, 5],
      golden: [0, 2, 2, 3, 3, 3, 3]
    },
    gust: { fromDay: 4, ivMin: 8, ivMax: 13, tele: 0.9, dur: 1.5, force: 310 },
    hatch: 4, maxBees: 32
  };

  var events = {}; // wired by main: onBeeLost,onDeposit,onQuota,onGustTele,onGustBlow,onWaspStun

  var S = null;

  function freshState() {
    return {
      active: false, attract: false, dusk: false,
      day: 1, dayT: 0, dayLen: 70, quota: 30, dayPollen: 0, quotaMet: false,
      honey: 0, honeyTotal: 0, beesLost: 0, waspsScattered: 0,
      runSeed: 1, time: 0,
      queen: { x: W / 2, y: H * 0.58, vx: 0, vy: 0, aimX: W / 2, aimY: H * 0.58, mode: 'pointer', keys: {} },
      bees: [], wasps: [], decoys: [], pulses: [],
      pulseCd: 0, decoyCd: 0, pulseUsed: false, decoyUsed: false,
      spawnAt: 0, waspSeq: 0,
      gust: { stage: 'idle', t: 0, dir: 1, nextAt: 7, lean: 0 },
      aiT: 0, aiTX: W / 2, aiTY: H * 0.5
    };
  }

  function start(opts) {
    opts = opts || {};
    var keep = S && opts.continue;
    if (!keep) S = freshState();
    S.active = true;
    S.attract = !!opts.attract;
    if (opts.seed != null) S.runSeed = opts.seed;
    if (!keep) {
      S.day = 1;
      S.honey = 0; S.honeyTotal = 0; S.beesLost = 0; S.waspsScattered = 0;
    }
    if (opts.day != null) S.day = HM.clamp(opts.day, 1, 7);
    S.dayLen = CFG.day.len[S.day - 1];
    S.quota = CFG.day.quota[S.day - 1];
    S.dayPollen = 0; S.quotaMet = false; S.dayT = 0; S.dusk = false;
    S.pulses.length = 0; S.decoys.length = 0;
    S.pulseCd = 0; S.decoyCd = 0;
    S.gust.stage = 'idle'; S.gust.lean = 0; S.gust.nextAt = CFG.gust.ivMin + Math.random() * (CFG.gust.ivMax - CFG.gust.ivMin);
    HM.world.buildFlowers(S.day, S.runSeed);
    var q = S.queen;
    if (!keep) {
      q.x = W / 2; q.y = H * 0.58; q.vx = 0; q.vy = 0;
      q.aimX = q.x; q.aimY = q.y; q.mode = 'pointer';
    }
    S.bees.length = 0;
    var n = keep ? Math.min(CFG.maxBees, opts.beeCount || 12) : 12;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * 6.283, r = 46 + (i % 3) * 16;
      S.bees.push(mkBee(q.x + Math.cos(a) * r, q.y + Math.sin(a) * r, i));
    }
    S.wasps.length = 0;
    S.spawnAt = 2.5;
    if (!S.attract) {
      var w0 = CFG.day.wasps[S.day - 1];
      for (i = 0; i < w0; i++) spawnWasp(1.5 + i * 2.2);
    }
    HM.fx.reset();
  }

  function mkBee(x, y, id) {
    return {
      id: id, x: x, y: y, vx: 0, vy: 0,
      state: 'follow', flower: null, carry: 0, carryVal: 0,
      gT: 0, phase: Math.random() * 6.283, homeA: Math.random() * 6.283,
      bob: Math.random() * 6.283, rallyT: 0, threat: null
    };
  }

  function spawnWasp(delay) {
    // delayed entry: mark t negative; the wasp waits off-screen
    var side = Math.random() < 0.5 ? -1 : 1;
    var top = Math.random() < 0.4;
    var x = top ? (80 + Math.random() * (W - 160)) : (side < 0 ? -40 : W + 40);
    var y = top ? -40 : (120 + Math.random() * (H - 300));
    S.wasps.push({
      x: x, y: y, vx: 0, vy: 0, phase: Math.random() * 6.283,
      state: 'enter', t: -(delay || 0), stun: 0, digest: 0, cool: 0, patience: 0,
      target: null, reT: 0, seedA: Math.random() * 6.283, dead: false
    });
  }

  /* ---------------- public actions ---------------- */
  function doPulse() {
    if (!S.active || S.dusk || S.pulseCd > 0) return false;
    var q = S.queen;
    S.pulseCd = CFG.pulse.cd;
    S.pulseUsed = true;
    S.pulses.push({ x: q.x, y: q.y, t: 0 });
    var hit = 0;
    for (var i = 0; i < S.wasps.length; i++) {
      var w = S.wasps[i];
      if (w.state === 'leave') continue;
      var d = dist(w.x, w.y, q.x, q.y);
      if (d < CFG.pulse.r1) {
        w.state = 'stun'; w.stun = CFG.wasp.stunT;
        w.stunCount = (w.stunCount || 0) + 1;
        if (w.stunCount >= 2) w.leaving = true; // twice-stung wasps give up the raid
        var k = Math.max(0.25, 1 - d / CFG.pulse.r1);
        var dx = w.x - q.x, dy = w.y - q.y, m = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        w.vx = dx / m * CFG.pulse.knock * k;
        w.vy = dy / m * CFG.pulse.knock * k;
        w.target = null;
        hit++;
        HM.fx.burst(w.x, w.y, 5, { col: '#ffe08a', sp: 150, size: 2.4, life: 0.4, grav: 0 });
        if (events.onWaspStun) events.onWaspStun();
      }
    }
    if (hit) S.waspsScattered += hit;
    for (i = 0; i < S.bees.length; i++) {
      var b = S.bees[i];
      if (dist(b.x, b.y, q.x, q.y) < CFG.pulse.r1) b.rallyT = CFG.bee.rallyT;
    }
    HM.audio.pulse();
    if (hit) HM.audio.waspStun(); else HM.audio.rally();
    HM.fx.ring(q.x, q.y, CFG.pulse.r1, '#ffd166', 0.42);
    HM.fx.burst(q.x, q.y, 10, { col: '#ffe9a8', sp: 260, size: 2.2, life: 0.4, grav: 0, add: true });
    return true;
  }

  function doDecoy() {
    if (!S.active || S.dusk || S.decoyCd > 0) return false;
    if (S.honey < CFG.decoy.cost) { HM.audio.deny(); return false; }
    S.honey -= CFG.decoy.cost;
    S.decoyCd = CFG.decoy.cd;
    S.decoyUsed = true;
    var q = S.queen;
    S.decoys.push({ x: q.x, y: q.y, t: 0, life: CFG.decoy.life });
    HM.audio.decoy();
    HM.fx.burst(q.x, q.y, 8, { col: '#ffd166', sp: 90, size: 3, life: 0.5, grav: 60 });
    return true;
  }

  function beginDusk() {
    if (!S.active) return;
    S.dusk = true;
    S.gust.stage = 'idle'; S.gust.lean = 0;
    // grace: bank everything being carried right now
    var i, b;
    for (i = 0; i < S.bees.length; i++) {
      b = S.bees[i];
      if (b.carryVal > 0) {
        S.honey += b.carryVal; S.honeyTotal += b.carryVal; S.dayPollen += b.carryVal;
        b.carry = 0; b.carryVal = 0;
      }
      b.state = 'return'; b.flower = null;
    }
    for (i = 0; i < S.wasps.length; i++) S.wasps[i].state = 'leave';
    HM.audio.dusk();
  }

  function hatchMorning() {
    var add = CFG.hatch + (S.bees.length < 8 ? 3 : 0);
    var n = Math.min(CFG.maxBees, S.bees.length + add) - S.bees.length;
    var q = S.queen;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283;
      S.bees.push(mkBee(q.x + Math.cos(a) * 40, q.y + Math.sin(a) * 40 - 30, S.bees.length));
    }
    return n;
  }

  /* ---------------- helpers ---------------- */
  function clampMag(vx, vy, m) {
    var d = Math.sqrt(vx * vx + vy * vy);
    if (d > m && d > 0) { var s = m / d; return [vx * s, vy * s]; }
    return [vx, vy];
  }
  function softBounds(o, r, damp) {
    if (o.x < r) { o.x = r; o.vx = Math.abs(o.vx) * damp; }
    else if (o.x > W - r) { o.x = W - r; o.vx = -Math.abs(o.vx) * damp; }
    if (o.y < 120 + r) { o.y = 120 + r; o.vy = Math.abs(o.vy) * damp; }
    else if (o.y > H - r - 8) { o.y = H - r - 8; o.vy = -Math.abs(o.vy) * damp; }
  }

  /* ---------------- queen ---------------- */
  function updQueen(h) {
    var q = S.queen, C = CFG.queen;
    if (S.attract) {
      S.aiT -= h;
      if (S.aiT <= 0) {
        S.aiT = 3.5 + Math.random() * 3;
        var fl = HM.world.field.flowers;
        if (fl.length) {
          var f = fl[(Math.random() * fl.length) | 0];
          S.aiTX = f.x + (Math.random() - 0.5) * 60;
          S.aiTY = f.y - 40;
        }
        if (Math.random() < 0.3 && S.pulseCd <= 0) { // silent show-pulse on the title screen
          S.pulseCd = CFG.pulse.cd;
          S.pulses.push({ x: q.x, y: q.y, t: 0 });
          HM.fx.ring(q.x, q.y, CFG.pulse.r1, '#ffd166', 0.42);
        }
      }
      q.aimX = S.aiTX; q.aimY = S.aiTY;
    }
    if (S.dusk) { q.aimX = HM.world.hive.x; q.aimY = HM.world.hive.y - 90; q.mode = 'pointer'; }

    var dvx, dvy;
    if (q.mode === 'pointer') {
      var dx = q.aimX - q.x, dy = q.aimY - q.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      var sp = C.maxSpeed * clamp(d / 60, 0, 1);
      dvx = d > 1 ? dx / d * sp : 0; dvy = d > 1 ? dy / d * sp : 0;
    } else {
      var k = q.keys;
      var ix = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      var iy = (k.down ? 1 : 0) - (k.up ? 1 : 0);
      if (ix || iy) {
        var m = Math.sqrt(ix * ix + iy * iy);
        dvx = ix / m * C.maxSpeed; dvy = iy / m * C.maxSpeed;
      } else { dvx = 0; dvy = 0; }
      if (!ix && !iy) {
        var fr = Math.exp(-C.friction * h);
        q.vx *= fr; q.vy *= fr;
        dvx = q.vx; dvy = q.vy;
      }
    }
    var acc = clampMag(dvx - q.vx, dvy - q.vy, C.accel);
    q.vx += acc[0] * h; q.vy += acc[1] * h;
    if (S.gust.stage === 'blow') { q.vx += S.gust.dir * CFG.gust.force * h; }
    q.x += q.vx * h; q.y += q.vy * h;
    softBounds(q, C.bound, 0.4);
    // scent trail
    if (!S.attract && Math.hypot(q.vx, q.vy) > 90 && Math.random() < h * 14) {
      HM.fx.spawn({ kind: 'dot', x: q.x + (Math.random() - 0.5) * 14, y: q.y + 8 + Math.random() * 8, vx: 0, vy: -14, size: 2.2, life: 0.6, col: 'rgba(255,214,130,0.5)', grav: 0, drag: 1 });
    }
  }

  /* ---------------- bees ---------------- */
  function flowerValid(f) {
    return f && f.nectar > 0 && dist(f.x, f.y, S.queen.x, S.queen.y) < CFG.scentR + 130;
  }
  function releaseFlower(b) {
    if (b.flower) { b.flower.claims = Math.max(0, b.flower.claims - 1); b.flower = null; }
  }
  function pickFlower(b) {
    var fl = HM.world.field.flowers, q = S.queen;
    var best = null, bestScore = -1e9;
    for (var i = 0; i < fl.length; i++) {
      var f = fl[i];
      if (f.nectar <= 0 || f.claims >= 3) continue;
      var d = dist(f.x, f.y, q.x, q.y);
      if (d > CFG.scentR + 120) continue;
      var score = f.nectar * 14 + (f.golden ? 18 : 0) - d * 0.075 - f.claims * 42 + Math.random() * 9;
      if (score > bestScore) { bestScore = score; best = f; }
    }
    return best;
  }

  function updBee(b, h, idx) {
    var q = S.queen, C = CFG.bee, hive = HM.world.hive;
    b.phase += h * 9;
    b.bob += h * 7;
    if (b.rallyT > 0) b.rallyT -= h;

    // ---- threat sense ----
    var thr = null, td2 = 1e9;
    for (var i = 0; i < S.wasps.length; i++) {
      var w = S.wasps[i];
      if (w.state === 'stun' || w.state === 'leave' || w.t < 0) continue;
      var d2 = dist2(w.x, w.y, b.x, b.y);
      if (d2 < td2) { td2 = d2; thr = w; }
    }
    var fleeing = false;
    if (thr && td2 < C.fleeR * C.fleeR) {
      fleeing = true;
      b.threat = thr;
      if (b.state !== 'flee') {
        if (b.state === 'gather') releaseFlower(b);
        b.state = 'flee';
      }
    }
    if (b.state === 'flee' && !fleeing) { b.state = b.carry >= C.carryMax ? 'return' : 'follow'; b.threat = null; }

    var maxV = C.maxSpeed * (b.rallyT > 0 ? C.rally : 1) * (b.carry > 0 ? 0.94 : 1);
    var tx = q.x, ty = q.y, arrive = 0;
    var desiredX = 0, desiredY = 0;

    if (S.dusk) { tx = hive.x; ty = hive.y - 60; arrive = 24; maxV *= 1.1; }
    else if (b.state === 'flee' && b.threat) {
      var t = b.threat;
      var fx = b.x - t.x, fy = b.y - t.y, fm = Math.max(1, Math.sqrt(fx * fx + fy * fy));
      // run from the wasp, but shade toward the queen so the swarm shelters together
      var hx = q.x - b.x, hy = q.y - b.y, hm = Math.max(1, Math.sqrt(hx * hx + hy * hy));
      desiredX = fx / fm * C.fleeSpeed * 0.85 + hx / hm * C.fleeSpeed * 0.25 + Math.cos(b.phase * 2.3) * 50;
      desiredY = fy / fm * C.fleeSpeed * 0.85 + hy / hm * C.fleeSpeed * 0.25 + Math.sin(b.phase * 2.1) * 50;
      maxV = C.fleeSpeed * (b.rallyT > 0 ? 1.2 : 1);
      if (dist2(b.x, b.y, t.x, t.y) > 200 * 200) {
        b.state = b.carry >= C.carryMax ? 'return' : (flowerValid(b.flower) ? 'seek' : 'follow');
        b.threat = null;
      }
    } else if (b.state === 'seek') {
      if (!flowerValid(b.flower)) {
        releaseFlower(b);
        var f2 = pickFlower(b);
        if (f2) { b.flower = f2; f2.claims++; }
        else { b.state = b.carry > 0 ? 'return' : 'follow'; }
      }
      if (b.state === 'seek' && b.flower) {
        tx = b.flower.x; ty = b.flower.y - 6;
        arrive = C.gatherR;
        if (dist2(b.x, b.y, tx, ty) < arrive * arrive) { b.state = 'gather'; b.gT = 0; }
      }
    } else if (b.state === 'gather') {
      var f = b.flower;
      if (!f || f.nectar <= 0 || dist(f.x, f.y, q.x, q.y) > CFG.scentR + 150) {
        releaseFlower(b);
        b.state = b.carry > 0 ? 'return' : 'follow';
      } else {
        tx = f.x + Math.cos(b.phase * 1.4) * 9;
        ty = f.y - 8 + Math.sin(b.phase * 1.7) * 7;
        arrive = 6;
        b.gT += h;
        if (b.gT >= C.gatherTick) {
          b.gT = 0;
          f.nectar--;
          b.carry++;
          b.carryVal += f.golden ? 2 : 1;
          if (!S.attract) HM.audio.gatherTick(S.time);
          HM.fx.burst(f.x, f.y - 6, 3, { col: f.golden ? '#ffe08a' : '#ffd6e2', sp: 46, size: 1.8, life: 0.5, grav: -30, up: 20 });
          if (b.carry >= C.carryMax || f.nectar <= 0) {
            releaseFlower(b);
            if (b.carry >= 2) b.state = 'return';
            else {
              var f3 = pickFlower(b);
              if (f3) { b.flower = f3; f3.claims++; b.state = 'seek'; }
              else b.state = 'return';
            }
          }
        }
      }
    } else if (b.state === 'return') {
      tx = hive.x; ty = hive.y - 58;
      arrive = C.depR;
      if (dist2(b.x, b.y, tx, ty) < arrive * arrive) {
        depositBee(b);
      }
    } else { // follow
      b.homeA += h * (0.5 + (b.id % 5) * 0.07);
      var rr = 44 + 20 * Math.sin(b.phase * 0.8 + b.id);
      tx = q.x + Math.cos(b.homeA) * rr;
      ty = q.y + Math.sin(b.homeA) * rr - 14;
      arrive = 10;
      releaseFlower(b);
      if (!S.dusk && b.carry === 0) {
        // re-evaluate periodically: head to the best ripe flower near the queen
        b.seekT = (b.seekT || 0) - h;
        if (b.seekT <= 0) {
          b.seekT = 0.35 + Math.random() * 0.4;
          var f4 = pickFlower(b);
          if (f4 && dist(f4.x, f4.y, b.x, b.y) < 280) { b.flower = f4; f4.claims++; b.state = 'seek'; }
        }
      }
    }

    // ---- steering ----
    if (!fleeing && (tx != null || arrive != null)) {
      var ddx = tx - b.x, ddy = ty - b.y;
      var dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      var sp = maxV * (arrive > 0 ? clamp(dd / (arrive * 2.4), 0, 1) : 1);
      desiredX = ddx / dd * sp;
      desiredY = ddy / dd * sp;
    }
    var acc = clampMag(desiredX - b.vx, desiredY - b.vy, C.accel);
    b.vx += acc[0] * h; b.vy += acc[1] * h;

    // ---- boids: separation + alignment ----
    var sx = 0, sy = 0, axv = 0, ayv = 0, nb = 0;
    for (i = 0; i < S.bees.length; i++) {
      if (i === idx) continue;
      var o = S.bees[i];
      var dx2 = b.x - o.x, dy2 = b.y - o.y;
      var dq2 = dx2 * dx2 + dy2 * dy2;
      if (dq2 < C.sepR * C.sepR && dq2 > 0.01) {
        var dq = Math.sqrt(dq2);
        var push = (1 - dq / C.sepR) / dq;
        sx += dx2 * push; sy += dy2 * push;
      }
      if (dq2 < C.alignR * C.alignR) { axv += o.vx; ayv += o.vy; nb++; }
    }
    b.vx += sx * C.sepW * h;
    b.vy += sy * C.sepW * h;
    if (nb > 0) {
      b.vx += (axv / nb - b.vx) * C.alignW * h;
      b.vy += (ayv / nb - b.vy) * C.alignW * h;
    }
    if (S.gust.stage === 'blow') { b.vx += S.gust.dir * CFG.gust.force * 0.8 * h; }

    var spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (spd > maxV * 1.12) { b.vx *= maxV * 1.12 / spd; b.vy *= maxV * 1.12 / spd; }
    b.x += b.vx * h; b.y += b.vy * h;
    softBounds(b, 12, 0.5);
  }

  function depositBee(b) {
    if (b.carryVal > 0) {
      S.honey += b.carryVal; S.honeyTotal += b.carryVal; S.dayPollen += b.carryVal;
      HM.fx.burst(b.x, b.y, 4, { col: '#ffd166', sp: 60, size: 2.2, life: 0.4, grav: -60 });
      // orb to hive
      HM.fx.spawn({ kind: 'orb', x0: b.x, y0: b.y, x1: HM.world.hive.x, y1: HM.world.hive.y - 30, cx: b.x, cy: b.y, dur: 0.5, col: '#ffd166', life: 1 });
      if (!S.attract) {
        HM.audio.deposit(b.carryVal);
        if (events.onDeposit) events.onDeposit(b.carryVal);
        if (!S.quotaMet && S.dayPollen >= S.quota) {
          S.quotaMet = true;
          if (events.onQuota) events.onQuota();
        }
      }
      b.carry = 0; b.carryVal = 0;
    }
    b.state = S.dusk ? 'return' : 'follow';
  }

  function killBee(b, by) {
    b.dead = true;
    releaseFlower(b);
    S.beesLost++;
    HM.fx.burst(b.x, b.y, 14, { col: '#f2b23e', sp: 190, size: 2.6, life: 0.6, grav: 260 });
    HM.fx.burst(b.x, b.y, 5, { col: '#2a1c10', sp: 120, size: 2, life: 0.5, grav: 200 });
    HM.fx.ring(b.x, b.y, 40, 'rgba(224,85,63,0.8)', 0.35);
    HM.fx.doShake(7, 0.28);
    HM.fx.setDanger(1);
    HM.audio.beeLost();
    if (events.onBeeLost) events.onBeeLost();
  }

  /* ---------------- wasps ---------------- */
  function updWasp(w, h) {
    var q = S.queen, C = CFG.wasp;
    w.t += h;
    if (w.t < 0) return; // still waiting off-screen

    if (w.state === 'stun') {
      w.stun -= h;
      w.vx *= Math.exp(-3.2 * h); w.vy *= Math.exp(-3.2 * h);
      w.x += w.vx * h; w.y += w.vy * h;
      if (w.stun <= 0) { w.state = w.leaving ? 'leave' : 'hunt'; w.reT = 0; }
      return;
    }
    if (w.digest > 0) w.digest -= h;

    var speed = Math.min(C.maxSpeed, C.baseSpeed + (S.day - 1) * C.speedPerDay);
    var aggro = Math.min(300, C.aggroBase + (S.day - 1) * C.aggroPerDay);
    var tx = null, ty = null, sp = speed * 0.55;

    if (w.state === 'leave' || S.dusk) {
      w.state = 'leave';
      tx = w.x < W / 2 ? -80 : W + 80; ty = -60; sp = speed * 0.9;
      if (w.x < -60 || w.x > W + 60 || w.y < -80) w.dead = true;
    } else if (w.state === 'enter') {
      tx = 200 + Math.random() * (W - 400); ty = 260 + Math.random() * (H - 380);
      tx = w.entryX == null ? (w.entryX = tx, w.entryY = ty, tx) : w.entryX;
      ty = w.entryY;
      sp = speed * 0.8;
      if (w.x > 60 && w.x < W - 60 && w.y > 140 && w.y < H - 120 && w.t > 0.6) { w.state = 'hunt'; w.entryX = null; }
    } else {
      // choose target
      if (w.leaving) w.state = 'leave';
      w.reT -= h;
      var decoy = S.decoys.length ? S.decoys[0] : null;
      var dd = decoy ? dist(w.x, w.y, decoy.x, decoy.y) : 1e9;
      if (decoy && dd < CFG.decoy.r) {
        tx = decoy.x; ty = decoy.y; sp = speed;
        if (dd < 24 && w.digest <= 0) { w.digest = 2.6; HM.fx.burst(decoy.x, decoy.y, 6, { col: '#ffd166', sp: 70, size: 2.4, life: 0.4, grav: -40 }); decoy.life -= 1.2; }
      } else {
        if (w.cool > 0) w.cool -= h;
        if (w.reT <= 0 && !(w.cool > 0)) {
          w.reT = C.retarget;
          var best = null, bd = aggro * aggro;
          for (var i = 0; i < S.bees.length; i++) {
            var b = S.bees[i];
            var d2v = dist2(w.x, w.y, b.x, b.y);
            if (d2v < bd) { bd = d2v; best = b; }
          }
          if (best && w.target === best && bd > 60 * 60) {
            w.patience = (w.patience || 0) + C.retarget;
            if (w.patience > 5) { w.target = null; w.patience = 0; w.cool = 1.8; best = null; }
          } else w.patience = 0;
          if (best) w.target = best;
          else if (!w.cool || w.cool <= 0) w.target = null;
        }
        if (w.target && w.target.dead) w.target = null;
        if (w.target) {
          tx = w.target.x; ty = w.target.y; sp = speed;
          var dtd = Math.sqrt(dist2(w.x, w.y, tx, ty));
          if (dtd < 70) sp = speed * 1.38; // lunge
        } else {
          // lazy patrol
          w.seedA += h * 0.6;
          tx = W / 2 + Math.cos(w.seedA) * 420;
          ty = 380 + Math.sin(w.seedA * 0.8) * 200;
          sp = speed * 0.45;
        }
      }
      if (w.digest > 0) sp *= 0.35;
    }

    if (tx != null) {
      var dx = tx - w.x, dy = ty - w.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var weave = Math.sin(w.t * 7 + w.phase) * C.weave;
      var dvx = dx / d * sp - dy / d * (weave * 0.02) * sp * 0.1;
      var dvy = dy / d * sp + dx / d * (weave * 0.02) * sp * 0.1;
      var acc = clampMag(dvx - w.vx, dvy - w.vy, 1500);
      w.vx += acc[0] * h; w.vy += acc[1] * h;
    }
    w.x += w.vx * h; w.y += w.vy * h;
    if (w.state === 'hunt' || w.state === 'enter') {
      if (w.x < 8) { w.x = 8; w.vx = Math.abs(w.vx) * 0.4; }
      if (w.x > W - 8) { w.x = W - 8; w.vx = -Math.abs(w.vx) * 0.4; }
      if (w.y < 130) { w.y = 130; w.vy = Math.abs(w.vy) * 0.4; }
      if (w.y > H - 20) { w.y = H - 20; w.vy = -Math.abs(w.vy) * 0.4; }
    }

    // catch check
    if ((w.state === 'hunt' || w.state === 'enter') && w.digest <= 0 && !S.dusk) {
      for (var j = 0; j < S.bees.length; j++) {
        var bb = S.bees[j];
        if (dist2(w.x, w.y, bb.x, bb.y) < C.catchR * C.catchR) {
          killBee(bb, w);
          w.digest = C.digestT;
          w.kills = (w.kills || 0) + 1;
          if (w.kills >= 1) w.leaving = true; // fed: it trundles off with its prize
          w.vx *= 0.25; w.vy *= 0.25;
          break;
        }
      }
    }
  }

  /* ---------------- day / gust / spawns ---------------- */
  function updGust(h) {
    var g = S.gust;
    if (S.attract || S.dusk || S.day < CFG.gust.fromDay) { g.lean = 0; return; }
    if (g.stage === 'idle') {
      g.nextAt -= h;
      if (g.nextAt <= 0) {
        g.stage = 'tele'; g.t = 0;
        g.dir = Math.random() < 0.5 ? -1 : 1;
        HM.audio.gustTele();
        if (events.onGustTele) events.onGustTele(g.dir);
      }
    } else if (g.stage === 'tele') {
      g.t += h;
      g.lean = g.dir * 0.25 * (g.t / CFG.gust.tele);
      if (g.t >= CFG.gust.tele) {
        g.stage = 'blow'; g.t = 0;
        HM.audio.gustBlow();
        if (events.onGustBlow) events.onGustBlow(g.dir);
        for (var i = 0; i < 12; i++) {
          HM.fx.spawn({
            kind: 'streak', x: g.dir < 0 ? W + 20 : -20, y: 200 + Math.random() * 600,
            vx: g.dir * (600 + Math.random() * 300), vy: (Math.random() - 0.5) * 60,
            size: 20 + Math.random() * 40, life: 1.2, col: 'rgba(255,255,255,0.35)', prio: true
          });
        }
      }
    } else if (g.stage === 'blow') {
      g.t += h;
      var p = g.t / CFG.gust.dur;
      g.lean = g.dir * Math.sin(clamp(p, 0, 1) * Math.PI);
      if (p >= 1) { g.stage = 'idle'; g.lean = 0; g.nextAt = CFG.gust.ivMin + Math.random() * (CFG.gust.ivMax - CFG.gust.ivMin); }
    }
  }

  function updWorldBits(h, dt) {
    // flowers regrow
    var fl = HM.world.field.flowers;
    for (var i = 0; i < fl.length; i++) {
      var f = fl[i];
      if (f.nectar < f.max) {
        f.regrowT -= dt;
        if (f.regrowT <= 0) { f.nectar++; f.regrowT = 18; }
      } else f.regrowT = 18;
    }
    // decoys
    for (i = S.decoys.length - 1; i >= 0; i--) {
      var d = S.decoys[i];
      d.t += dt; d.life -= dt;
      if (d.life <= 0) {
        HM.fx.burst(d.x, d.y, 6, { col: '#c9962e', sp: 60, size: 2, life: 0.4, grav: 40 });
        S.decoys.splice(i, 1);
      }
    }
    // pulses
    for (i = S.pulses.length - 1; i >= 0; i--) {
      S.pulses[i].t += dt;
      if (S.pulses[i].t > 0.5) S.pulses.splice(i, 1);
    }
    // wasp upkeep
    for (i = S.wasps.length - 1; i >= 0; i--) {
      if (S.wasps[i].dead) S.wasps.splice(i, 1);
    }
    // spawn maintenance
    if (!S.attract && !S.dusk) {
      var want = CFG.day.wasps[S.day - 1];
      var live = 0;
      for (i = 0; i < S.wasps.length; i++) if (!S.wasps[i].dead && S.wasps[i].state !== 'leave') live++;
      S.spawnAt -= h;
      if (live < want && S.spawnAt <= 0) {
        spawnWasp(0);
        S.spawnAt = 6 + Math.random() * 3;
      }
    }
  }

  /* ---------------- main update ---------------- */
  function update(dt) {
    if (!S || !S.active) return;
    var steps = Math.max(1, Math.min(4, Math.ceil(dt / 0.0125)));
    var h = dt / steps;
    for (var s = 0; s < steps; s++) {
      S.time += h;
      updQueen(h);
      if (!S.dusk) { S.dayT += h; }
      var i;
      for (i = 0; i < S.bees.length; i++) updBee(S.bees[i], h, i);
      // remove dead bees
      for (i = S.bees.length - 1; i >= 0; i--) if (S.bees[i].dead) S.bees.splice(i, 1);
      for (i = 0; i < S.wasps.length; i++) updWasp(S.wasps[i], h);
      if (S.pulseCd > 0) S.pulseCd -= h;
      if (S.decoyCd > 0) S.decoyCd -= h;
      updGust(h);
    }
    updWorldBits(h, dt);
  }

  /* ---------------- queries for UI/audio ---------------- */
  function nearestWaspDist() {
    if (!S || !S.bees.length || !S.wasps.length) return null;
    var best = null;
    for (var i = 0; i < S.wasps.length; i++) {
      var w = S.wasps[i];
      if (w.state === 'leave' || w.t < 0) continue;
      for (var j = 0; j < S.bees.length; j++) {
        var d = dist(w.x, w.y, S.bees[j].x, S.bees[j].y);
        if (best == null || d < best) best = d;
      }
    }
    return best;
  }
  function anyCarrier() {
    if (!S) return false;
    for (var i = 0; i < S.bees.length; i++) if (S.bees[i].carry > 0) return true;
    return false;
  }
  function anyWasp() { return S && S.wasps.length > 0; }

  function getState() { return S; }
  function getCfg() { return CFG; }

  return {
    start: start, update: update, beginDusk: beginDusk, hatchMorning: hatchMorning,
    doPulse: doPulse, doDecoy: doDecoy,
    nearestWaspDist: nearestWaspDist, anyCarrier: anyCarrier, anyWasp: anyWasp,
    getState: getState, getCfg: getCfg, events: events
  };
})();
