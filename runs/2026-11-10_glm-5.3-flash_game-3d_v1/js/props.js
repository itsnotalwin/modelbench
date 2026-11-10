/* Emberwake — authored props: spires, arches, islands, gate, beacons, glider. */
(function () {
  'use strict';
  const EW = (globalThis.EW = globalThis.EW || {});
  const M = EW.M;
  const P = (EW.Props = {});
  const B = () => new EW.GLC.Builder();

  /* ---------- primitive appenders (all into a Builder, world coords) ---------- */
  function frustum(b, x, y, z, r0, r1, h, seg, col, jitter, rng) {
    // ring of vertices at y (radius r0) and y+h (radius r1)
    const pts0 = [], pts1 = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const j0 = jitter ? 1 + (rng() - 0.5) * jitter : 1;
      const j1 = jitter ? 1 + (rng() - 0.5) * jitter : 1;
      pts0.push([x + Math.cos(a) * r0 * j0, y, z + Math.sin(a) * r0 * j0]);
      pts1.push([x + Math.cos(a) * r1 * j1, y + h, z + Math.sin(a) * r1 * j1]);
    }
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg;
      b.tri(pts0[i], pts0[j], pts1[j], col);
      b.tri(pts0[i], pts1[j], pts1[i], col);
    }
    if (r0 > 0.4) { // cap ring facing down where visible
      for (let i = 0; i < seg; i++) {
        const j = (i + 1) % seg;
        b.tri([x, y - 0.05, z], pts0[j], pts0[i], [col[0] * 0.7, col[1] * 0.7, col[2] * 0.7]);
      }
    }
    if (r1 > 0.4) {
      for (let i = 0; i < seg; i++) {
        const j = (i + 1) % seg;
        b.tri([x, y + h + 0.05, z], pts1[i], pts1[j], [col[0] * 1.06, col[1] * 1.06, col[2] * 1.06]);
      }
    }
  }

  function boxW(b, cx, cy, cz, w, h, d, col, yaw) {
    const c = Math.cos(yaw || 0), s = Math.sin(yaw || 0);
    const pt = (lx, ly, lz) => [cx + c * lx + s * lz, cy + ly, cz - s * lx + c * lz];
    const v = [
      pt(-w / 2, 0, -d / 2), pt(w / 2, 0, -d / 2), pt(w / 2, 0, d / 2), pt(-w / 2, 0, d / 2),
      pt(-w / 2, h, -d / 2), pt(w / 2, h, -d / 2), pt(w / 2, h, d / 2), pt(-w / 2, h, d / 2)
    ];
    const dk = [col[0] * 0.55, col[1] * 0.55, col[2] * 0.55];
    const dx = [col[0] * 0.78, col[1] * 0.78, col[2] * 0.78];
    b.quad(v[0], v[1], v[5], v[4], dx);          // -z face? (local front)
    b.quad(v[2], v[3], v[7], v[6], dx);
    b.quad(v[3], v[0], v[4], v[7], dk);
    b.quad(v[1], v[2], v[6], v[5], dk);
    b.quad(v[4], v[5], v[6], v[7], col);          // top
    b.quad(v[0], v[3], v[2], v[1], dk);           // bottom
  }

  function blob(b, x, y, z, r, col, rng, squash) {
    const LA = 7, LO = 5;
    const grid = [];
    for (let i = 0; i <= LA; i++) {
      const row = [];
      const th = (i / LA) * Math.PI;
      for (let j = 0; j < LO; j++) {
        const ph = (j / LO) * Math.PI * 2;
        const jit = 0.75 + rng() * 0.5;
        const rr = r * jit;
        row.push([
          x + Math.sin(th) * Math.cos(ph) * rr,
          y + Math.cos(th) * rr * (squash || 1) * 0.8,
          z + Math.sin(th) * Math.sin(ph) * rr
        ]);
      }
      grid.push(row);
    }
    for (let i = 0; i < LA; i++) {
      for (let j = 0; j < LO; j++) {
        const j2 = (j + 1) % LO;
        const a = grid[i][j], bb = grid[i][j2], c = grid[i + 1][j], d = grid[i + 1][j2];
        const shade = 0.85 + (i / LA) * 0.3;
        const cc = [col[0] * shade, col[1] * shade, col[2] * shade];
        b.tri(a, bb, d, cc); b.tri(a, d, c, cc);
      }
    }
  }

  function torusArc(b, cx, cy, cz, R, r, segU, segV, arcLen, yaw, col) {
    // torus in the local xy plane (hole along z), arc centered at the bottom (-90°)
    const start = -Math.PI / 2 - arcLen / 2;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw);
    const pt = (a, v) => {
      const lx = (R + r * Math.cos(v)) * Math.cos(a);
      const ly = (R + r * Math.cos(v)) * Math.sin(a);
      const lz = r * Math.sin(v);
      return [cx + cyw * lx + syw * lz, cy + ly, cz - syw * lx + cyw * lz];
    };
    for (let i = 0; i < segU; i++) {
      for (let j = 0; j < segV; j++) {
        const a0 = start + (i / segU) * arcLen, a1 = start + ((i + 1) / segU) * arcLen;
        const v0 = (j / segV) * Math.PI * 2, v1 = ((j + 1) / segV) * Math.PI * 2;
        const p00 = pt(a0, v0), p01 = pt(a0, v1), p10 = pt(a1, v0), p11 = pt(a1, v1);
        const shade = 0.9 + 0.2 * Math.cos((a0 + start) * 0.5);
        const cc = [col[0] * shade, col[1] * shade, col[2] * shade];
        b.tri(p00, p10, p11, cc); b.tri(p00, p11, p01, cc);
      }
    }
  }

  function octa(b, x, y, z, r, col) {
    const t = [x, y + r * 1.35, z], bo = [x, y - r * 1.35, z];
    const ring = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ring.push([x + Math.cos(a) * r, y, z + Math.sin(a) * r]);
    }
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      b.tri(t, ring[i], ring[j], col);
      b.tri(bo, ring[j], ring[i], [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8]);
    }
  }

  /* ---------- world placement ---------- */
  const ROCK = [0.33, 0.32, 0.37];
  const ROCK_D = [0.24, 0.23, 0.28];
  const GRASS = [0.14, 0.23, 0.14];
  const STONE = [0.45, 0.43, 0.47];

  P.build = function () {
    const T = EW.Terrain;
    const G = (x, z) => T.sampleGround(x, z);
    const colliders = P.colliders = [];
    const mounts = P.mounts = [];
    const rng = M.mulberry32(9001);

    /* ---- spires (with beacon mounts) ---- */
    const sb = B();
    function spire(x, z, h, leanYaw) {
      const gy = G(x, z);
      let px = x, pz = z, py = gy - 3;
      const levels = 5;
      for (let i = 0; i < levels; i++) {
        const r0 = M.lerp(7.5, 1.4, i / levels);
        const r1 = M.lerp(6.2, 1.0, (i + 1) / levels);
        const lh = h / levels;
        const shade = 0.85 + i * 0.07;
        const col = [ROCK[0] * shade, ROCK[1] * shade, ROCK[2] * shade + 0.02];
        frustum(sb, px, py, pz, r0, r1, lh, 7, col, 0.28, rng);
        py += lh;
        const dx = Math.sin(leanYaw || 0) * (i + 1) * 0.8;
        const dz = Math.cos(leanYaw || 0) * (i + 1) * 0.8;
        px = x + dx; pz = z + dz;
      }
      const topY = py;
      colliders.push({ type: 'cyl', x, z, r: 6.5, y0: gy - 2, y1: gy + h * 0.55 });
      colliders.push({ type: 'cyl', x: px, z: pz, r: 3.2, y0: gy + h * 0.5, y1: topY + 2 });
      return { x: px, y: topY, z: pz, gy };
    }
    // beacon 1 — Emberrest Spire near launch
    const m1 = spire(0, 640, 62, 0.6);
    // beacon 4 — Twin Spires on the east wall (second spire is decorative)
    const m4 = spire(680, -260, 74, -0.4);
    spire(720, -300, 56, 0.9);
    // decorative mid-field spires
    spire(-260, 180, 48, 2.2);
    spire(180, 320, 42, -1.5);
    spire(-80, -420, 58, 0.3);
    spire(420, 380, 44, -2.6);
    P._spireMeshData = sb;

    /* ---- buttes (south) ---- */
    const bb = B();
    function butte(x, z, h, r) {
      const gy = G(x, z);
      const strata = 3;
      for (let i = 0; i < strata; i++) {
        const r0 = M.lerp(r, r * 0.55, i / strata);
        const r1 = M.lerp(r, r * 0.55, (i + 1) / strata);
        const shade = i % 2 === 0 ? 1.0 : 0.82;
        const col = [ROCK[0] * 1.06 * shade, ROCK[1] * 0.95 * shade, ROCK[2] * 0.9 * shade];
        frustum(bb, x, gy + (h / strata) * i, z, r0, r1, h / strata, 9, col, 0.18, rng);
      }
      frustum(bb, x, gy + h, z, r * 0.55, r * 0.4, 3, 9, GRASS, 0.1, rng);
      colliders.push({ type: 'cyl', x, z, r: r * 0.8, y0: gy - 2, y1: gy + h + 2 });
      return { x, y: gy + h + 3, z, gy };
    }
    const m6 = butte(-360, 520, 56, 14);
    butte(-300, 460, 34, 10);
    butte(-430, 590, 30, 9);

    /* ---- islet in the lake (beacon 3) ---- */
    const ib = B();
    const isletGy = -8;
    frustum(ib, 430, isletGy, -110, 15, 9, 30, 9, ROCK, 0.2, rng);
    frustum(ib, 430, isletGy + 30, -110, 9, 7.5, 3, 9, GRASS, 0.1, rng);
    colliders.push({ type: 'cyl', x: 430, z: -110, r: 11, y0: isletGy, y1: isletGy + 33 });
    const m3 = { x: 430, y: isletGy + 33, z: -110, gy: isletGy };

    /* ---- arches ---- */
    const ab = B();
    function arch(x, z, yaw, R) {
      const gy = G(x, z);
      torusArc(ab, x, gy + R - 6, z, R, 3.4, 22, 7, Math.PI * 1.16, yaw, ROCK);
      for (const s of [-1, 1]) {
        const lx = x + Math.cos(yaw) * s * R * 0.99;
        const lz = z - Math.sin(yaw) * s * R * 0.99;
        frustum(ab, lx, gy - 3, lz, 5.2, 3.6, 12, 7, ROCK_D, 0.22, rng);
        colliders.push({ type: 'cyl', x: lx, z: lz, r: 4.6, y0: gy - 3, y1: gy + 16 });
      }
      return { x, y: gy + R - 6 + R, z, gy, R, yaw };
    }
    const archW = arch(-620, 60, 0.4, 26);   // Westgate Arch
    const archN = arch(260, -560, 1.2, 22);  // Needle Arch (north-east mid field)

    /* ---- floating isles ---- */
    const flb = B();
    const isles = [{ x: -180, y: 330, z: -60 }, { x: 240, y: 350, z: -420 }, { x: -460, y: 400, z: -680 }];
    for (const isl of isles) {
      frustum(flb, isl.x, isl.y - 42, isl.z, 1.2, 23, 42, 10, ROCK_D, 0.3, rng);   // inverted cone body
      frustum(flb, isl.x, isl.y - 1.5, isl.z, 24, 23, 2.6, 10, GRASS, 0.12, rng);  // grass cap
      for (let i = 0; i < 3; i++) {
        const a = rng() * Math.PI * 2, rr = rng() * 14;
        blob(flb, isl.x + Math.cos(a) * rr, isl.y + 1 + rng() * 1.5, isl.z + Math.sin(a) * rr, 1.5 + rng() * 2, ROCK, rng, 0.7);
      }
      // hanging rocklets
      for (let i = 0; i < 3; i++) {
        const a = rng() * Math.PI * 2, rr = 8 + rng() * 12;
        blob(flb, isl.x + Math.cos(a) * rr, isl.y - 40 - rng() * 8, isl.z + Math.sin(a) * rr, 1 + rng() * 2.4, ROCK_D, rng, 1.4);
      }
      colliders.push({ type: 'sph', x: isl.x, y: isl.y - 20, z: isl.z, r: 17 });
      colliders.push({ type: 'cyl', x: isl.x, z: isl.z, r: 22.5, y0: isl.y - 2, y1: isl.y + 3.5 });
    }
    P.isles = isles;

    /* ---- the Hollow (beacon 8 ring of rocks) ---- */
    const hb = B();
    const hx = -560, hz = -560, hgy = G(hx, hz);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      blob(hb, hx + Math.cos(a) * 26, hgy + 2, hz + Math.sin(a) * 26, 5 + rng() * 4, ROCK, rng, 1.6);
    }
    P._hollowData = hb;

    /* ---- the Dawn Gate ---- */
    const gateX = 20, gateZ = -930;
    const gateY = G(gateX, gateZ);
    P.gate = { x: gateX, y: gateY, z: gateZ };
    const gb = B();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const sx = gateX + Math.cos(a) * 13, sz = gateZ + Math.sin(a) * 13;
      const sg = G(sx, sz);
      boxW(gb, sx, sg - 1, sz, 2.6, 9 + rng() * 3, 1.8, STONE, a + Math.PI / 2);
      colliders.push({ type: 'cyl', x: sx, z: sz, r: 1.9, y0: sg - 1, y1: sg + 12 });
    }
    P._gateStonesData = gb;
    // floating ring (separate mesh, spins when active) — local coords around origin
    const rb = B();
    torusArc(rb, 0, 0, 0, 9, 1.0, 40, 8, Math.PI * 2, 0, [0.95, 0.78, 0.45]);
    P._gateRingData = rb;

    /* ---- beacon pedestals (shared geometry, local coords) ---- */
    const pb = B();
    frustum(pb, 0, 0, 0, 2.7, 2.1, 1.6, 8, STONE, 0.1, rng);
    frustum(pb, 0, 1.6, 0, 1.05, 0.82, 6.4, 6, STONE, 0.08, rng);
    frustum(pb, 0, 8.0, 0, 1.5, 1.15, 0.9, 6, STONE, 0.08, rng);
    frustum(pb, 0, 8.9, 0, 1.95, 1.55, 1.05, 8, [0.17, 0.16, 0.19], 0.05, rng);
    P._pedestalData = pb;
    P.PEDESTAL_TOP = 9.95;

    // register pedestal colliders per beacon (positions from mounts, filled below)
    const crystal = B();
    octa(crystal, 0, 0, 0, 0.95, [1, 1, 1]);
    P._crystalData = crystal;

    P._butteMeshData = bb;
    P._isletMeshData = ib;
    P._archMeshData = ab;
    P._isleMeshData = flb;

    /* ---- beacon mounts list ---- */
    // order matters: [spire1, westArch, islet, twinSpires, isleA, butte, foothill, hollow]
    const m2 = { x: archW.x, y: G(archW.x, archW.z) + 0.2, z: archW.z, gy: G(archW.x, archW.z) };
    const m7 = { x: 140, y: G(140, -780), z: -780, gy: G(140, -780) };
    const m8 = { x: hx, y: hgy, z: hz, gy: hgy };
    mounts.push(m1, m2, m3, m4, { x: isles[0].x, y: isles[0].y + 1.1, z: isles[0].z, gy: isles[0].y }, m6, m7, m8);
    for (const m of mounts) {
      colliders.push({ type: 'cyl', x: m.x, z: m.z, r: 2.9, y0: m.gy - 1, y1: m.gy + 11 });
    }

    /* ---- launch platform ---- */
    const lb = B();
    const sx0 = 0, sz0 = 980, sg = G(sx0, sz0);
    boxW(lb, sx0, sg - 2, sz0, 26, 3.4, 16, STONE, 0);
    for (const s of [-1, 1]) {
      boxW(lb, sx0 + s * 11, sg - 5, sz0, 3, 9, 3, ROCK, 0.2);
    }
    P.launch = { x: sx0, y: sg + 1.4, z: sz0 };
    P._launchData = lb;
    P.startHeight = sg;

    /* ---- the glider ---- */
    P._gliderData = buildGlider();

    /* ---- merged static batch (one draw call for all authored world props) ---- */
    const sB = B();
    const merge = (b) => {
      sB.pos = sB.pos.concat(b.pos);
      sB.nrm = sB.nrm.concat(b.nrm);
      sB.col = sB.col.concat(b.col);
      sB.aux = sB.aux.concat(b.aux);
    };
    merge(P._spireMeshData);
    merge(P._butteMeshData);
    merge(P._isletMeshData);
    merge(P._archMeshData);
    merge(P._isleMeshData);
    merge(P._hollowData);
    merge(P._gateStonesData);
    merge(P._launchData);
    P._staticData = sB;
    return true;
  };

  function buildGlider() {
    const b = B();
    const BODY = [0.20, 0.22, 0.29];
    const BODY_D = [0.12, 0.13, 0.18];
    // fuselage: nose -> tail diamond
    const nose = [0, 0.12, -3.5], tail = [0, 0.5, 3.0];
    const wl = [-0.42, 0.30, -0.3], wr = [0.42, 0.30, -0.3];
    const bl = [-0.30, -0.28, 0.2], br = [0.30, -0.28, 0.2];
    const tt = [0, 0.55, 3.0];
    b.tri(nose, wl, wr, BODY);
    b.tri(nose, bl, wl, BODY_D);
    b.tri(nose, wr, br, BODY_D);
    b.tri(wl, bl, tt, BODY);
    b.tri(wr, tt, br, BODY);
    b.tri(bl, br, tt, BODY_D);
    // wings: 3 segments each, ember gradient root->tip, slight dihedral
    const cols = [[0.17, 0.18, 0.25], [0.55, 0.26, 0.15], [1.0, 0.60, 0.26]];
    for (const s of [-1, 1]) {
      let prevX = s * 0.40, prevZ0 = -1.1, prevZ1 = 0.7, prevY = 0.30;
      for (let i = 0; i < 3; i++) {
        const t0 = (i + 1) / 3;
        const tipX = s * M.lerp(0.4, 4.7, t0);
        const tipY = 0.30 + t0 * 0.5;
        const tipZ0 = M.lerp(-1.1, 1.4, t0), tipZ1 = M.lerp(0.7, 2.0, t0);
        const col = cols[i];
        b.tri([prevX, prevY, prevZ0], [tipX, tipY, tipZ0], [tipX, tipY, tipZ1], col);
        b.tri([prevX, prevY, prevZ0], [tipX, tipY, tipZ1], [prevX, prevY, prevZ1], col);
        // underside (darker)
        const dc = [col[0] * 0.45, col[1] * 0.45, col[2] * 0.45];
        b.tri([prevX, prevY - 0.09, prevZ0], [tipX, tipY - 0.09, tipZ1], [tipX, tipY - 0.09, tipZ0], dc);
        b.tri([prevX, prevY - 0.09, prevZ0], [prevX, prevY - 0.09, prevZ1], [tipX, tipY - 0.09, tipZ1], dc);
        prevX = tipX; prevY = tipY; prevZ0 = tipZ0; prevZ1 = tipZ1;
      }
    }
    // tail fin + tailplane
    b.tri([0, 0.45, 1.6], [0, 1.5, 2.9], [0, 0.45, 3.0], [0.85, 0.5, 0.22]);
    b.tri([0, 0.45, 1.6], [0, 0.45, 3.0], [0, 0.4, 2.9], [0.4, 0.25, 0.14]);
    b.tri([0, 0.45, 2.2], [0.9, 0.55, 3.0], [0, 0.5, 2.7], BODY);
    b.tri([0, 0.45, 2.2], [0, 0.5, 2.7], [-0.9, 0.55, 3.0], BODY);
    // lantern housing
    octa(b, 0, -0.55, -0.2, 0.34, [1.0, 0.72, 0.35]);
    return b;
  }
})();
