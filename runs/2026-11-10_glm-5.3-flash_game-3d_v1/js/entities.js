/* Emberwake — beacons, embers, thermals, storms, the Dawn Gate. */
(function () {
  'use strict';
  const EW = (globalThis.EW = globalThis.EW || {});
  const M = EW.M;
  const E = (EW.Ent = {});

  E.beacons = [];
  E.embers = [];
  E.litCount = 0;

  let flareT = 0, lightningSeed = 0;

  const BEACON_DEFS = [
    { name: 'Emberrest Spire', hint: 'The valley watches. Fly.' },
    { name: 'Westgate Arch', hint: 'Beneath the western gate.' },
    { name: 'Lakewatch Islet', hint: 'Out on the dark water.' },
    { name: 'Twin Spires', hint: 'High on the eastern wall.' },
    { name: 'The Floating Isle', hint: 'Where the ground gave up.' },
    { name: 'Butte of Echoes', hint: 'South, where the wind hollows.' },
    { name: 'Dawnspire Foothill', hint: 'Below the great summit.' },
    { name: 'The Hollow', hint: 'In the ring of sleeping stones.' }
  ];

  E.init = function () {
    const P = EW.Props, T = EW.Terrain;
    E.beacons = [];
    P.mounts.forEach((m, i) => {
      const baseY = m.y;
      E.beacons.push({
        i,
        name: BEACON_DEFS[i].name,
        hint: BEACON_DEFS[i].hint,
        base: { x: m.x, y: baseY, z: m.z },
        flame: { x: m.x, y: baseY + P.PEDESTAL_TOP + 1.3, z: m.z },
        lit: false, beamA: 0, crystalSpin: Math.random() * 6,
        flare: 0, igniteT: 0
      });
    });
    E.litCount = 0;

    // ember trails (points as [x, groundOffset, z] resolved to world y)
    const T2 = EW.Terrain;
    const G = (x, z, off) => ({ x, y: T2.sampleGround(x, z) + off, z });
    const trails = [
      [G(0, 900, 30), G(0, 800, 30), G(-40, 640, 36), G(-20, 520, 34)],
      [G(-540, 150, 24), G(-600, 100, 20), G(-620, 60, 22), G(-650, 10, 20), G(-690, -50, 24)],
      { spiral: { x: -180, z: -60, y0: 70, y1: 290, r: 15, n: 8 } },
      [G(100, 320, 14), G(160, 200, 12), G(220, 80, 12), G(280, -20, 12), G(330, -80, 12)],
      [G(600, -160, 22), G(650, -210, 24), G(690, -270, 26), G(730, -330, 24)],
      [G(30, -900, 34), G(60, -820, 40), G(110, -680, 46), G(150, -540, 40), G(170, -420, 32)],
      [G(300, -60, 8), G(370, -90, 7), G(430, -110, 7), G(500, -130, 7), G(560, -150, 8)],
      [G(-300, 460, 30), G(-330, 490, 32), G(-360, 520, 34), G(-400, 560, 32)],
      // high arc between the floating isles (absolute heights)
      { abs: [[240, 356, -420], [120, 380, -500], [0, 400, -560], [-160, 405, -620], [-300, 405, -660], [-455, 402, -676]] },
      [G(-480, -470, 18), G(-520, -515, 16), G(-560, -560, 15), G(-600, -610, 16), G(-640, -650, 18)]
    ];
    E.embers = [];
    for (const tr of trails) {
      if (tr.spiral) {
        const s = tr.spiral;
        for (let i = 0; i < s.n; i++) {
          const a = (i / s.n) * Math.PI * 2.6;
          const rr = s.r * (0.7 + 0.5 * (i / s.n));
          E.embers.push({
            x: s.x + Math.cos(a) * rr,
            y: M.lerp(s.y0, s.y1, i / (s.n - 1)),
            z: s.z + Math.sin(a) * rr,
            taken: false, phase: Math.random() * 6, mag: false
          });
        }
      } else if (tr.abs) {
        for (const p of tr.abs) {
          E.embers.push({ x: p[0], y: p[1], z: p[2], taken: false, phase: Math.random() * 6, mag: false });
        }
      } else {
        // distribute along the polyline
        let segs = 0;
        for (let i = 0; i < tr.length - 1; i++) segs += 1;
        const n = tr.length + 2;
        for (let i = 0; i < n; i++) {
          const t = (i / (n - 1)) * (tr.length - 1);
          const idx = Math.min(Math.floor(t), tr.length - 2);
          const f = t - idx;
          const a = tr[idx], b = tr[idx + 1];
          E.embers.push({
            x: M.lerp(a.x, b.x, f), y: M.lerp(a.y, b.y, f), z: M.lerp(a.z, b.z, f),
            taken: false, phase: Math.random() * 6, mag: false
          });
        }
      }
    }
    // ring of three around each beacon flame
    for (const b of E.beacons) {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + b.i;
        E.embers.push({
          x: b.flame.x + Math.cos(a) * 8, y: b.flame.y + 1, z: b.flame.z + Math.sin(a) * 8,
          taken: false, phase: Math.random() * 6, mag: false
        });
      }
    }
    E.totalEmbers = E.embers.length;

    // thermals
    const th = [];
    for (const isl of P.isles) {
      th.push({ x: isl.x, y: T2.sampleGround(isl.x, isl.z), z: isl.z, r: 30, lift: 13, top: isl.y + 34 });
    }
    th.push({ x: 430, y: 0, z: -110, r: 22, lift: 9, top: 150 });       // lake updraft
    th.push({ x: -360, y: 0, z: 520, r: 20, lift: 9, top: 210 });       // butte
    th.push({ x: 120, y: 0, z: -680, r: 22, lift: 10, top: 380 });      // massif face
    E.thermals = th;
    EW.Sim.thermals = th;

    // storm cells
    const storms = [
      { x: 0, z: 0, y: 155, r: 78, seed: 1.3, boltT: 4 },
      { x: -350, z: -200, y: 175, r: 66, seed: 4.1, boltT: 7 },
      { x: 300, z: 260, y: 160, r: 70, seed: 7.7, boltT: 5.5 },
      { x: 80, z: -520, y: 185, r: 60, seed: 2.9, boltT: 6 }
    ];
    E.storms = storms;
    EW.Sim.storms = storms;

    // gate
    const gate = P.gate;
    E.gate = {
      x: gate.x, y: gate.y + 24, z: gate.z,
      active: false, spin: 0, passed: false, glow: 0
    };

    flareT = 0;
    return true;
  };

  E.reset = function () {
    for (const b of E.beacons) { b.lit = false; b.beamA = 0; b.flare = 0; }
    for (const e of E.embers) { e.taken = false; e.mag = false; }
    E.litCount = 0;
    E.gate.active = false; E.gate.passed = false; E.gate.glow = 0;
  };

  E.nextBeacon = function () {
    const P = EW.Sim.player;
    let best = null, bd = Infinity;
    for (const b of E.beacons) {
      if (b.lit) continue;
      const d = M.v3dist(P.pos, b.flame);
      if (d < bd) { bd = d; best = b; }
    }
    if (!best && E.gate.active) return { gate: true, d: M.v3dist(P.pos, E.gate) };
    return best ? { beacon: best, d: bd } : null;
  };

  /* ---------- per-frame update ---------- */
  E.update = function (dt, hooks) {
    const S = EW.Sim, p = S.player, t = S.time;
    const T = EW.Terrain;

    // --- beacons ---
    for (const b of E.beacons) {
      b.crystalSpin += dt * (b.lit ? 1.6 : 0.4);
      if (b.flare > 0) b.flare = Math.max(0, b.flare - dt * 0.8);
      if (b.lit) {
        b.beamA = Math.min(1, b.beamA + dt * 0.7);
        b.igniteT += dt;
        // fire emission
        if (Math.random() < 0.85) {
          EW.Sprites.emit('glow', {
            x: b.flame.x + (Math.random() - 0.5) * 1.6,
            y: b.flame.y + Math.random() * 0.8,
            z: b.flame.z + (Math.random() - 0.5) * 1.6,
            vx: (Math.random() - 0.5) * 1.5, vy: 5 + Math.random() * 4, vz: (Math.random() - 0.5) * 1.5,
            size: 1.5 + Math.random() * 1.3, grow: -0.4, life: 0.55 + Math.random() * 0.35,
            r: 1.0, g: 0.45 + Math.random() * 0.2, b: 0.12, a: 0.85, drag: 1.2, fadeIn: 0.08
          });
        }
        if (Math.random() < 0.12) {
          EW.Sprites.emit('glow', {
            x: b.flame.x + (Math.random() - 0.5) * 2,
            y: b.flame.y, z: b.flame.z + (Math.random() - 0.5) * 2,
            vx: (Math.random() - 0.5) * 4, vy: 9 + Math.random() * 6, vz: (Math.random() - 0.5) * 4,
            size: 0.9, life: 1.1, r: 1, g: 0.7, b: 0.3, a: 0.9, drag: 0.8
          });
        }
        if (Math.random() < 0.05) {
          EW.Sprites.emit('puff', {
            x: b.flame.x, y: b.flame.y + 4, z: b.flame.z,
            vx: 0, vy: 4, vz: 0, size: 3, grow: 2.5, life: 2.2,
            r: 0.16, g: 0.15, b: 0.17, a: 0.28, drag: 0.6
          });
        }
      } else if (S.state === 'play') {
        const d = M.v3dist(p.pos, b.flame);
        if (d < 16) igniteBeacon(b, hooks);
      }
    }

    // wisp flare ping at the next target
    flareT -= dt;
    if (flareT <= 0 && S.state === 'play') {
      flareT = 7;
      const nx = E.nextBeacon();
      if (nx && nx.beacon) { nx.beacon.flare = 1; EW.Sfx.graze(); }
      else if (nx && nx.gate) { E.gate.glow = 1; EW.Sfx.graze(); }
    }

    // --- embers ---
    if (S.state === 'play') {
      for (const e of E.embers) {
        if (e.taken) continue;
        const dx = p.pos.x - e.x, dy = p.pos.y - e.y, dz = p.pos.z - e.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 144) {
          e.mag = true;
        }
        if (e.mag) {
          const d = Math.sqrt(d2) || 1;
          const pull = 60;
          e.x += (dx / d) * pull * dt;
          e.y += (dy / d) * pull * dt;
          e.z += (dz / d) * pull * dt;
        }
        if (d2 < 20) {
          e.taken = true;
          p.embers++;
          p.fuel = Math.min(100, p.fuel + 14);
          p.comboT = 3;
          EW.Sfx.ember(p.combo++);
          EW.Sprites.burst(e.x, e.y, e.z, 6, { r: 1, g: 0.72, b: 0.3, size: 1.2, life: 0.45, speed: 7 });
          if (hooks && hooks.onEmber) hooks.onEmber(p.embers, E.totalEmbers);
        }
      }
    }

    // --- storms ---
    for (const st of E.storms) {
      st.x += Math.sin(t * 0.02 + st.seed) * 3.2 * dt;
      st.z += Math.cos(t * 0.017 + st.seed * 2) * 3.2 * dt;
      st.boltT -= dt;
      if (st.boltT <= 0) {
        st.boltT = 4 + Math.random() * 6;
        const d = M.v3dist(p.pos, st);
        if (d < 520) {
          if (EW.UI) EW.UI.flash(0.5);
          EW.Sfx.thunder();
          const a = Math.random() * Math.PI * 2, rr = Math.random() * st.r * 0.6;
          EW.Sprites.burst(st.x + Math.cos(a) * rr, st.y, st.z + Math.sin(a) * rr, 8, {
            r: 0.8, g: 0.85, b: 1.0, size: 4, life: 0.3, speed: 3
          });
        }
      }
      // cloud puffs (drawn every frame)
      if (M.v3dist(p.pos, st) < 900) {
        for (let i = 0; i < 9; i++) {
          const a = st.seed + i * 2.4 + t * 0.05;
          const rr = st.r * (0.25 + 0.5 * ((i * 37 % 10) / 10));
          EW.Sprites.push('puff',
            st.x + Math.cos(a) * rr, st.y + Math.sin(st.seed * 3 + i * 1.7) * 14, st.z + Math.sin(a) * rr,
            26 + (i % 3) * 10, 0.13, 0.13, 0.17, 0.55, 3, st.seed + i, 1);
        }
      }
    }
    if (S.stormIn) {
      // rain streaks around the player
      for (let i = 0; i < 5; i++) {
        EW.Sprites.emit('vert', {
          x: p.pos.x + (Math.random() - 0.5) * 60,
          y: p.pos.y + 20 + Math.random() * 20,
          z: p.pos.z + (Math.random() - 0.5) * 60,
          vx: 0, vy: -70, vz: 0,
          size: 4 + Math.random() * 3, life: 0.4,
          r: 0.45, g: 0.55, b: 0.7, a: 0.35, shape: 4
        });
      }
    }

    // --- thermal dust near the player ---
    for (const th of E.thermals) {
      const d = Math.hypot(p.pos.x - th.x, p.pos.z - th.z);
      if (d < 260) {
        if (Math.random() < 0.5) {
          const a = Math.random() * Math.PI * 2, rr = Math.random() * th.r;
          EW.Sprites.emit('vert', {
            x: th.x + Math.cos(a) * rr, y: th.y + 6 + Math.random() * 40, z: th.z + Math.sin(a) * rr,
            vx: 0, vy: 9, vz: 0,
            size: 5 + Math.random() * 4, life: 2.4,
            r: 0.75, g: 0.9, b: 0.95, a: 0.10, shape: 4
          });
        }
        // thermal ground ring
        const vis = M.clamp(1 - d / 260, 0, 1);
        EW.Sprites.push('glow', th.x, th.y + 4, th.z, th.r, 0.5, 0.85, 0.9, 0.05 + 0.06 * vis, 2, 0, 1);
      }
    }

    // --- gate ---
    const g = E.gate;
    g.spin += dt * (g.active ? 0.9 : 0.08);
    if (g.glow > 0) g.glow = Math.max(0, g.glow - dt * 0.8);
    if (g.active && !g.passed && S.state === 'play') {
      const dx = p.pos.x - g.x, dy = p.pos.y - g.y, dz = p.pos.z - g.z;
      if (Math.abs(dz) < 6) {
        const rad = Math.hypot(dx, dy);
        if (rad < 8.5) {
          g.passed = true;
          if (hooks && hooks.onGateEnter) hooks.onGateEnter();
        }
      }
    }

    // player lantern trail + wingtips (in play / tumble)
    if (S.state === 'play' || S.state === 'tumble') {
      const r = S.camRight;
      const lw = { x: 0, y: 0, z: 0 }, rw = { x: 0, y: 0, z: 0 };
      const f = p.fwd;
      // approximate wingtips: pos ± right*4.3 + up (fwd-based)
      lw.x = p.pos.x - r.x * 4.3; lw.y = p.pos.y + 0.8 - r.y * 4.3; lw.z = p.pos.z - r.z * 4.3;
      rw.x = p.pos.x + r.x * 4.3; rw.y = p.pos.y + 0.8 + r.y * 4.3; rw.z = p.pos.z + r.z * 4.3;
      const spd = p.speed;
      if (spd > 52 && Math.random() < 0.75) {
        for (const w of [lw, rw]) {
          EW.Sprites.emit('glow', {
            x: w.x, y: w.y, z: w.z,
            vx: -f.x * spd * 0.12, vy: -f.y * spd * 0.12 + 1.5, vz: -f.z * spd * 0.12,
            size: p.boostOn ? 1.5 : 0.9, grow: 1.2, life: 0.5,
            r: 1, g: p.boostOn ? 0.5 : 0.65, b: p.boostOn ? 0.25 : 0.35, a: 0.5, drag: 2.5
          });
        }
      }
      // lantern motes
      if (Math.random() < 0.3) {
        EW.Sprites.emit('glow', {
          x: p.pos.x - f.x * 0.5, y: p.pos.y - 0.6, z: p.pos.z - f.z * 0.5,
          vx: (Math.random() - 0.5) * 2 - f.x * 6, vy: 2.5, vz: (Math.random() - 0.5) * 2 - f.z * 6,
          size: 0.8, grow: 0.6, life: 0.9,
          r: 1, g: 0.66, b: 0.28, a: 0.55, drag: 1.5
        });
      }
    }
  };

  function igniteBeacon(b, hooks) {
    b.lit = true;
    b.igniteT = 0;
    E.litCount++;
    const S = EW.Sim, p = S.player;
    p.fuel = Math.min(100, p.fuel + 20);
    S.checkpoint.pos.x = b.flame.x;
    S.checkpoint.pos.y = b.flame.y + 24;
    S.checkpoint.pos.z = b.flame.z + 26;
    S.checkpoint.yaw = Math.atan2(-b.flame.x, b.flame.z); // face valley centre
    EW.Sfx.beacon();
    EW.Sfx.padChord(E.litCount);
    EW.Sprites.burst(b.flame.x, b.flame.y, b.flame.z, 30, {
      r: 1, g: 0.6, b: 0.25, size: 2.4, life: 1.1, speed: 16, spread: 2
    });
    EW.Sprites.burst(b.flame.x, b.flame.y + 2, b.flame.z, 10, {
      r: 1, g: 0.85, b: 0.5, size: 3.2, life: 1.4, speed: 5, grow: 1.5
    });
    for (let i = 0; i < 3; i++) {
      EW.Sprites.push('glow', b.flame.x, b.flame.y + 1, b.flame.z, 6 + i * 5, 1, 0.7, 0.35, 0.9, 2, 0, 1);
    }
    if (EW.UI) EW.UI.flash(0.25);
    if (hooks && hooks.onIgnite) hooks.onIgnite(b, E.litCount);
    if (E.litCount >= 8) {
      E.gate.active = true;
      if (hooks && hooks.onAllLit) hooks.onAllLit();
    }
  }

  /* ---------- persistent sprite pushes (called between reset & draw) ---------- */
  E.pushSprites = function (t) {
    const S = EW.Sim;
    for (const b of E.beacons) {
      const bob = Math.sin(t * 1.7 + b.i) * 0.35;
      if (b.lit) {
        // flame core + crystal
        EW.Sprites.push('glow', b.flame.x, b.flame.y + bob, b.flame.z, 3.2 + Math.sin(t * 6 + b.i) * 0.4, 1, 0.55, 0.2, 0.95, 0, b.i);
        EW.Sprites.push('glow', b.flame.x, b.flame.y + bob, b.flame.z, 1.4, 1, 0.85, 0.55, 0.95, 0, b.i + 1);
        EW.Sprites.push('glow', b.base.x, b.base.y + 9.2 + bob, b.base.z, 1.1, 1, 0.7, 0.35, 0.8, 0, b.i);
      } else {
        const pulse = 0.35 + 0.3 * Math.sin(t * 2 + b.i * 2) + b.flare * 1.6;
        EW.Sprites.push('glow', b.base.x, b.base.y + 9.2 + bob, b.base.z, 1.5 + b.flare * 2.5, 0.55, 0.75, 0.95, Math.min(1, pulse), 0, b.i);
      }
    }
    // embers
    for (const e of E.embers) {
      if (e.taken) continue;
      const bob = Math.sin(t * 2.2 + e.phase) * 0.9;
      const tw = 0.75 + 0.25 * Math.sin(t * 5 + e.phase * 3);
      EW.Sprites.push('glow', e.x, e.y + bob, e.z, 1.9, 1, 0.62, 0.22, 0.85 * tw, 0, e.phase);
      EW.Sprites.push('glow', e.x, e.y + bob, e.z, 0.7, 1, 0.9, 0.6, tw, 0, e.phase + 1);
    }
    // gate
    const g = E.gate;
    if (g.active || EW.Ent.litCount >= 6) {
      const a = g.active ? 0.85 : 0.25;
      EW.Sprites.push('glow', g.x, g.y, g.z, 12, 0.95, 0.8, 0.5, a * (0.7 + 0.3 * Math.sin(t * 3)), 2, 0, 1);
      EW.Sprites.push('glow', g.x, g.y, g.z, 5, 1, 0.9, 0.65, a, 0, 3);
    }
  };

  E.litLights = function () {
    const S = EW.Sim, p = S.player.pos;
    const arr = [];
    for (const b of E.beacons) {
      if (b.lit) {
        const d = (b.flame.x - p.x) ** 2 + (b.flame.y - p.y) ** 2 + (b.flame.z - p.z) ** 2;
        arr.push({ b, d });
      }
    }
    arr.sort((a, b) => a.d - b.d);
    return arr.slice(0, 4).map(o => o.b.flame);
  };
})();
