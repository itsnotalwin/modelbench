/* Emberwake — instanced billboard sprite pools (additive glow, puffs, verticals). */
(function () {
  'use strict';
  const EW = (globalThis.EW = globalThis.EW || {});
  const M = EW.M;
  const SP = (EW.Sprites = {});

  class Pool {
    constructor(cap, additive) {
      this.cap = cap;
      this.additive = additive;
      this.parts = [];
      this.stage = new Float32Array(cap * 12);
      this.cursor = 0;       // write cursor for the current frame
      this.vao = null;
    }
    spawn(p) {
      if (this.parts.length < this.cap) {
        p.age = 0;
        this.parts.push(p);
      }
    }
  }

  let glow, puff, vert;
  SP.pools = {};

  SP.build = function () {
    glow = new Pool(1500, true);
    puff = new Pool(240, false);
    vert = new Pool(480, true);
    SP.pools.glow = glow;
    SP.pools.puff = puff;
    SP.pools.vert = vert;
    return true;
  };

  SP.attach = function () {
    glow.vao = EW.GLC.spriteVAO(glow.cap);
    puff.vao = EW.GLC.spriteVAO(puff.cap);
    vert.vao = EW.GLC.spriteVAO(vert.cap);
  };

  /* ---------- direct appends (drawn this frame only) ---------- */
  function write(poolName, x, y, z, size, r, g, b, a, shape, seed, stretch) {
    const pool = typeof poolName === 'string' ? SP.pools[poolName] : poolName;
    if (!pool || pool.cursor >= pool.cap) return;
    const o = pool.cursor * 12, s = pool.stage;
    s[o] = x; s[o + 1] = y; s[o + 2] = z; s[o + 3] = size;
    s[o + 4] = r; s[o + 5] = g; s[o + 6] = b; s[o + 7] = a;
    s[o + 8] = shape; s[o + 9] = seed; s[o + 10] = stretch || 1; s[o + 11] = 0;
    pool.cursor++;
  }
  SP.push = write;

  /* ---------- particles ---------- */
  SP.emit = function (poolName, p) {
    const pool = SP.pools[poolName];
    if (!pool) return;
    p.vx = p.vx || 0; p.vy = p.vy || 0; p.vz = p.vz || 0;
    p.grav = p.grav || 0;
    p.drag = p.drag || 0;
    p.grow = p.grow || 0;
    p.fadeIn = p.fadeIn || 0;
    p.shape = p.shape || 0;
    p.seed = p.seed || Math.random() * 10;
    p.stretch = p.stretch || 1;
    p.age = 0;
    pool.spawn(p);
  };

  SP.burst = function (x, y, z, n, opts) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 2 - 1;
      const sp = (opts.speed || 6) * (0.4 + Math.random() * 0.9);
      SP.emit(opts.pool || 'glow', {
        x: x + (Math.random() - 0.5) * (opts.spread || 1),
        y: y + (Math.random() - 0.5) * (opts.spread || 1),
        z: z + (Math.random() - 0.5) * (opts.spread || 1),
        vx: Math.cos(a) * sp * Math.sqrt(1 - up * up),
        vy: up * sp + (opts.up || 0),
        vz: Math.sin(a) * sp * Math.sqrt(1 - up * up),
        size: (opts.size || 1.5) * (0.6 + Math.random() * 0.8),
        grow: opts.grow || 0,
        life: (opts.life || 0.8) * (0.7 + Math.random() * 0.6),
        r: opts.r, g: opts.g, b: opts.b, a: opts.a || 1,
        grav: opts.grav || 0, drag: opts.drag || 1.5,
        shape: opts.shape || 0, fadeIn: 0.05
      });
    }
  };

  SP.update = function (dt, camPos, camFwd) {
    for (const key of ['glow', 'puff', 'vert']) {
      const pool = SP.pools[key];
      // integrate + write
      const parts = pool.parts;
      let w = 0;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) continue;
        if (p.drag) {
          const d = Math.exp(-p.drag * dt);
          p.vx *= d; p.vy *= d; p.vz *= d;
        }
        p.vy -= p.grav * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        parts[w++] = p;
        // visibility cull: behind camera
        const dx = p.x - camPos.x, dy = p.y - camPos.y, dz = p.z - camPos.z;
        if (dx * camFwd.x + dy * camFwd.y + dz * camFwd.z < -12) continue;
        const t = p.age / p.life;
        let alpha = p.a * (1 - t);
        if (p.fadeIn && t < p.fadeIn) alpha *= t / p.fadeIn;
        const size = p.size * (1 + p.grow * t);
        if (alpha > 0.004) write(pool, p.x, p.y, p.z, size, p.r, p.g, p.b, alpha, p.shape, p.seed, p.stretch);
      }
      parts.length = w;
    }
  };

  SP.drawAll = function (prog, right, up, time, qualityScale) {
    const gl = EW.GLC.get();
    EW.GLC.set3f(prog, 'uRight', right.x, right.y, right.z);
    EW.GLC.set3f(prog, 'uUp', up.x, up.y, up.z);
    EW.GLC.set1f(prog, 'uAdditive', 1);

    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);

    // additive pools
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (const pool of [glow, vert]) {
      if (pool.cursor) {
        pool.vao.update(pool.stage, pool.cursor);
        gl.bindVertexArray(pool.vao.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, pool.vao.count);
      }
    }
    // alpha puffs
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    EW.GLC.set1f(prog, 'uAdditive', 0);
    if (puff.cursor) {
      puff.vao.update(puff.stage, puff.cursor);
      gl.bindVertexArray(puff.vao.vao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, puff.vao.count);
    }
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  };

  SP.resetFrame = function () {
    glow.cursor = 0; puff.cursor = 0; vert.cursor = 0;
  };
})();
