/* Emberwake — terrain: analytic heightfield, mesh, scatter, water. */
(function () {
  'use strict';
  const EW = (globalThis.EW = globalThis.EW || {});
  const M = EW.M;
  const T = (EW.Terrain = {});

  const SIZE = 2400;           // full extent (x and z in [-1200, 1200])
  const GRID = 288;            // segments per side
  const STEP = SIZE / GRID;    // 8.333u
  const LAKE_Y = 14;
  const LAKE = { x: 430, z: -110, r: 250 };
  T.LAKE_Y = LAKE_Y;
  T.LAKE = LAKE;
  T.SIZE = SIZE;
  T.GRID = GRID;

  T.height = function (x, z) {
    const d = Math.abs(x);
    let h = 12 + 10 * M.fbm(x * 0.006, z * 0.006, 3);
    // south launch plateau
    h += 46 * M.smooth(650, 1000, z);
    // east/west valley walls
    const wall = M.smooth(240, 860, d);
    h += wall * wall * (170 + 150 * M.ridge(x * 0.0035 + 9.7, z * 0.0035, 4));
    // north massif
    const nm = M.smooth(420, 1120, -z);
    h += nm * (250 + 190 * M.ridge(x * 0.003 + 4.2, z * 0.003, 4));
    // the Dawnspire cone
    const ddx = x - 120, ddz = z + 1010;
    const dd2 = ddx * ddx + ddz * ddz;
    h += 210 * Math.exp(-dd2 / (2 * 130 * 130));
    // lake basin
    const ldx = x - LAKE.x, ldz = z - LAKE.z;
    const ld = Math.sqrt(ldx * ldx + ldz * ldz);
    h -= 30 * M.smooth(260, 40, ld);
    // mid-field hills
    h += 18 * M.fbm(x * 0.011 + 3.1, z * 0.011 - 2.7, 3) * (0.35 + 0.65 * wall);
    // rim rise at the border so edges never read as void
    const r = Math.max(Math.abs(x), Math.abs(z));
    h += M.smooth(1080, 1300, r) * 60;
    return h;
  };

  T.normal = function (x, z, out) {
    const e = 1.5;
    const hL = T.height(x - e, z), hR = T.height(x + e, z);
    const hD = T.height(x, z - e), hU = T.height(x, z + e);
    let nx = hL - hR, ny = 2 * e, nz = hD - hU;
    const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    out = out || { x: 0, y: 1, z: 0 };
    out.x = nx / l; out.y = ny / l; out.z = nz / l;
    return out;
  };

  // Grid-bilinear ground sample (matches the rendered mesh surface).
  let heights = null;
  T.sampleGround = function (x, z) {
    if (!heights) return T.height(x, z);
    const gx = M.clamp((x + SIZE / 2) / STEP, 0, GRID - 0.001);
    const gz = M.clamp((z + SIZE / 2) / STEP, 0, GRID - 0.001);
    const ix = Math.floor(gx), iz = Math.floor(gz);
    const fx = gx - ix, fz = gz - iz;
    const i00 = iz * (GRID + 1) + ix;
    const h00 = heights[i00], h10 = heights[i00 + 1];
    const h01 = heights[i00 + GRID + 1], h11 = heights[i00 + GRID + 2];
    return h00 + (h10 - h00) * fx + (h01 - h00) * fz + (h00 - h10 - h01 + h11) * fx * fz;
  };

  T.slope = function (x, z) {
    const e = 3;
    const hL = T.sampleGround(x - e, z), hR = T.sampleGround(x + e, z);
    const hD = T.sampleGround(x, z - e), hU = T.sampleGround(x, z + e);
    const dx = (hR - hL) / (2 * e), dz = (hU - hD) / (2 * e);
    return Math.sqrt(dx * dx + dz * dz);
  };

  /* ---------------- mesh build ---------------- */
  function vertexColor(x, z, h, slopeV) {
    const n1 = M.fbm(x * 0.02 + 7, z * 0.02 - 3, 3);
    const n2 = M.fbm(x * 0.06 - 5, z * 0.06 + 11, 2);
    let r, g, b;
    if (h < LAKE_Y - 1.5) {
      // submerged
      r = 0.07; g = 0.11; b = 0.11;
    } else if (h < LAKE_Y + 3.5 && slopeV < 0.5) {
      // shoreline sand
      r = 0.48; g = 0.41; b = 0.30;
    } else {
      // grass band
      const dry = M.clamp(n1 * 1.4 - 0.2, 0, 1);
      r = M.lerp(0.11, 0.20, dry); g = M.lerp(0.19, 0.26, dry); b = M.lerp(0.12, 0.13, dry);
      // high altitude snow
      const snow = M.smooth(250, 330, h) * (1 - M.smooth(0.55, 0.95, slopeV));
      // rock by slope
      const rock = M.smooth(0.45, 0.85, slopeV);
      const rr = 0.30 + 0.10 * n2, rg = 0.29 + 0.10 * n2, rb = 0.33 + 0.10 * n2;
      r = M.lerp(r, rr, rock); g = M.lerp(g, rg, rock); b = M.lerp(b, rb, rock);
      r = M.lerp(r, 0.80 + 0.05 * n2, snow);
      g = M.lerp(g, 0.82 + 0.05 * n2, snow);
      b = M.lerp(b, 0.87 + 0.05 * n2, snow);
    }
    // subtle variation
    const v = 0.9 + 0.2 * n2;
    return [M.clamp(r * v, 0, 1), M.clamp(g * v, 0, 1), M.clamp(b * v, 0, 1)];
  }

  T.build = function () {
    const N = GRID + 1;
    heights = new Float32Array(N * N);
    for (let iz = 0; iz < N; iz++) {
      const z = -SIZE / 2 + iz * STEP;
      for (let ix = 0; ix < N; ix++) {
        heights[iz * N + ix] = T.height(-SIZE / 2 + ix * STEP, z);
      }
    }

    const pos = new Float32Array(N * N * 3);
    const nrm = new Float32Array(N * N * 3);
    const col = new Float32Array(N * N * 3);
    const idx = new Uint32Array(GRID * GRID * 6);
    const nrmTmp = { x: 0, y: 1, z: 0 };
    for (let iz = 0; iz < N; iz++) {
      const z = -SIZE / 2 + iz * STEP;
      for (let ix = 0; ix < N; ix++) {
        const x = -SIZE / 2 + ix * STEP;
        const vi = (iz * N + ix) * 3;
        const h = heights[iz * N + ix];
        pos[vi] = x; pos[vi + 1] = h; pos[vi + 2] = z;
        T.normal(x, z, nrmTmp);
        nrm[vi] = nrmTmp.x; nrm[vi + 1] = nrmTmp.y; nrm[vi + 2] = nrmTmp.z;
        // baked AO: darken in concavities
        let hs = 0, cnt = 0;
        if (ix > 0) { hs += heights[iz * N + ix - 1]; cnt++; }
        if (ix < GRID) { hs += heights[iz * N + ix + 1]; cnt++; }
        if (iz > 0) { hs += heights[(iz - 1) * N + ix]; cnt++; }
        if (iz < GRID) { hs += heights[(iz + 1) * N + ix]; cnt++; }
        const conc = M.clamp((hs / cnt - h) * 0.012, 0, 0.32);
        const slopeV = M.clamp(1 - nrmTmp.y, 0, 1) * 2.2;
        const c = vertexColor(x, z, h, slopeV);
        const dark = 1 - conc;
        col[vi] = c[0] * dark; col[vi + 1] = c[1] * dark; col[vi + 2] = c[2] * dark;
      }
    }
    let k = 0;
    for (let iz = 0; iz < GRID; iz++) {
      for (let ix = 0; ix < GRID; ix++) {
        const a = iz * N + ix, b = a + 1, c = a + N, d = c + 1;
        idx[k++] = a; idx[k++] = c; idx[k++] = b;
        idx[k++] = b; idx[k++] = c; idx[k++] = d;
      }
    }
    T._terrainData = { pos, nrm, col, idx };

    /* ---- water grid over the lake ---- */
    const WN = 40;
    const WSPAN = 620;
    const wpos = [], widx = [];
    for (let iz = 0; iz <= WN; iz++) {
      for (let ix = 0; ix <= WN; ix++) {
        const x = LAKE.x - WSPAN / 2 + (WSPAN / WN) * ix;
        const z = LAKE.z - WSPAN / 2 + (WSPAN / WN) * iz;
        wpos.push(x, LAKE_Y, z);
      }
    }
    for (let iz = 0; iz < WN; iz++) {
      for (let ix = 0; ix < WN; ix++) {
        const a = iz * (WN + 1) + ix, b = a + 1, c = a + WN + 1, d = c + 1;
        widx.push(a, c, b, b, c, d);
      }
    }
    T._waterData = { pos: wpos, idx: widx };

    /* ---- safety ground disc far below everything ---- */
    const dn = 48, dr = 2700;
    const dpos = [], didx = [];
    for (let i = 0; i < dn; i++) {
      const a = (i / dn) * Math.PI * 2;
      dpos.push(Math.cos(a) * dr, -34, Math.sin(a) * dr);
    }
    dpos.push(0, -34, 0);
    const cIdx = dn;
    for (let i = 0; i < dn; i++) {
      didx.push(cIdx, (i + 1) % dn, i);
    }
    T._discData = { pos: dpos, idx: didx };

    scatter();
    return true;
  };

  /* ---------------- scatter: trees & rocks ---------------- */
  function scatter() {
    const rng = M.mulberry32(1337);
    const maxTrees = 2800, maxRocks = 380;
    const trunkI = new Float32Array(maxTrees * 12);
    const canopyI = new Float32Array(maxTrees * 12);
    const rockI = new Float32Array(maxRocks * 12);
    let nt = 0, nr = 0;
    let guard = 0;
    while (nt < maxTrees && guard < maxTrees * 40) {
      guard++;
      const x = (rng() * 2 - 1) * 1150;
      const z = (rng() * 2 - 1) * 1150;
      const h = T.sampleGround(x, z);
      if (h < 13.2 || h > 175) continue;
      const sl = T.slope(x, z);
      if (sl > 0.75) continue;
      const ldx = x - LAKE.x, ldz = z - LAKE.z;
      if (ldx * ldx + ldz * ldz < 255 * 255) continue;
      const density = M.fbm(x * 0.004 + 21, z * 0.004 - 13, 3);
      if (density < 0.40) continue;
      const s = 0.8 + rng() * 1.5;
      const yaw = rng() * Math.PI * 2;
      const phase = rng() * Math.PI * 2;
      // canopy tint
      let r, g, b;
      if (rng() < 0.14) { r = 0.42; g = 0.20; b = 0.10; } // ember pine
      else { const v = 0.7 + rng() * 0.65; r = 0.08 * v; g = 0.19 * v; b = 0.13 * v; }
      const shade = 0.85 + rng() * 0.3;
      const o = nt * 12;
      trunkI[o] = x; trunkI[o + 1] = h - 0.5; trunkI[o + 2] = z; trunkI[o + 3] = s;
      trunkI[o + 4] = yaw; trunkI[o + 5] = 0.75 + rng() * 0.35; trunkI[o + 6] = 0.62; trunkI[o + 7] = 0.5;
      trunkI[o + 8] = 0.22; trunkI[o + 9] = phase; trunkI[o + 10] = 0; trunkI[o + 11] = 0;
      canopyI[o] = x; canopyI[o + 1] = h - 0.5; canopyI[o + 2] = z; canopyI[o + 3] = s;
      canopyI[o + 4] = yaw; canopyI[o + 5] = r * shade; canopyI[o + 6] = g * shade; canopyI[o + 7] = b * shade;
      canopyI[o + 8] = 0.5; canopyI[o + 9] = phase; canopyI[o + 10] = 0; canopyI[o + 11] = 0;
      nt++;
    }
    guard = 0;
    while (nr < maxRocks && guard < maxRocks * 60) {
      guard++;
      const x = (rng() * 2 - 1) * 1150;
      const z = (rng() * 2 - 1) * 1150;
      const h = T.sampleGround(x, z);
      if (h < LAKE_Y - 2) continue;
      const ldx = x - LAKE.x, ldz = z - LAKE.z;
      if (ldx * ldx + ldz * ldz < 250 * 250) continue;
      const rocky = M.smooth(0.30, 0.62, T.slope(x, z)) + M.smooth(120, 220, h);
      if (rng() > 0.15 + rocky * 0.55) continue;
      const s = 1.2 + rng() * 4.2;
      const v = 0.75 + rng() * 0.5;
      const o = nr * 12;
      rockI[o] = x; rockI[o + 1] = h - s * 0.35; rockI[o + 2] = z; rockI[o + 3] = s;
      rockI[o + 4] = rng() * Math.PI * 2; rockI[o + 5] = 0.5 * v; rockI[o + 6] = 0.49 * v; rockI[o + 7] = 0.54 * v;
      rockI[o + 8] = 0; rockI[o + 9] = rng() * Math.PI * 2; rockI[o + 10] = 0; rockI[o + 11] = 0;
      nr++;
    }
    T._treeTrunkInst = trunkI.subarray(0, nt * 12);
    T._treeCanopyInst = canopyI.subarray(0, nt * 12);
    T._treeCount = nt;
    T._rockInst = rockI.subarray(0, nr * 12);
    T._rockCount = nr;
  }
})();
