/* Emberwake — math, noise & RNG utilities. No dependencies. */
(function () {
  'use strict';
  const EW = (globalThis.EW = globalThis.EW || {});
  const M = (EW.M = EW.M || {});
  const TAU = Math.PI * 2;
  M.TAU = TAU;

  /* ---------- scalars ---------- */
  M.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  M.lerp = function (a, b, t) { return a + (b - a) * t; };
  M.smooth = function (a, b, x) {
    const t = M.clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  // Frame-rate independent exponential smoothing.
  M.damp = function (cur, target, k, dt) {
    return cur + (target - cur) * (1 - Math.exp(-k * dt));
  };
  M.wrapAngle = function (a) {
    a = (a + Math.PI) % TAU;
    if (a < 0) a += TAU;
    return a - Math.PI;
  };

  /* ---------- vec3 (plain objects) ---------- */
  M.v3 = function (x, y, z) { return { x: x || 0, y: y || 0, z: z || 0 }; };
  M.v3set = function (o, x, y, z) { o.x = x; o.y = y; o.z = z; return o; };
  M.v3copy = function (o, a) { o.x = a.x; o.y = a.y; o.z = a.z; return o; };
  M.v3add = function (o, a, b) { o.x = a.x + b.x; o.y = a.y + b.y; o.z = a.z + b.z; return o; };
  M.v3sub = function (o, a, b) { o.x = a.x - b.x; o.y = a.y - b.y; o.z = a.z - b.z; return o; };
  M.v3scale = function (o, a, s) { o.x = a.x * s; o.y = a.y * s; o.z = a.z * s; return o; };
  M.v3addScaled = function (o, a, s) { o.x += a.x * s; o.y += a.y * s; o.z += a.z * s; return o; };
  M.v3dot = function (a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; };
  M.v3cross = function (o, a, b) {
    const x = a.y * b.z - a.z * b.y, y = a.z * b.x - a.x * b.z, z = a.x * b.y - a.y * b.x;
    o.x = x; o.y = y; o.z = z; return o;
  };
  M.v3len = function (a) { return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z); };
  M.v3dist = function (a, b) {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };
  M.v3norm = function (o, a) {
    const l = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) || 1;
    o.x = a.x / l; o.y = a.y / l; o.z = a.z / l; return o;
  };
  M.v3lerp = function (o, a, b, t) {
    o.x = a.x + (b.x - a.x) * t; o.y = a.y + (b.y - a.y) * t; o.z = a.z + (b.z - a.z) * t;
    return o;
  };
  // Forward vector for yaw (0 = -Z / north, positive = rightward/clockwise) and pitch (+ up).
  M.v3fwd = function (out, yaw, pitch) {
    const cp = Math.cos(pitch);
    out.x = Math.sin(yaw) * cp; out.y = Math.sin(pitch); out.z = -Math.cos(yaw) * cp;
    return out;
  };

  /* ---------- mat4 (Float32Array, column-major) ---------- */
  M.m4 = function () { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; };

  M.m4Ident = function (o) {
    o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o;
  };

  M.m4Persp = function (o, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    o.fill(0);
    o[0] = f / aspect; o[5] = f;
    o[10] = (far + near) * nf; o[11] = -1;
    o[14] = 2 * far * near * nf;
    return o;
  };

  M.m4Mul = function (o, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
      a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
      a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
      a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      o[c * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      o[c * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      o[c * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      o[c * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    }
    return o;
  };

  M.m4LookAt = function (o, eye, center, up) {
    let zx = eye.x - center.x, zy = eye.y - center.y, zz = eye.z - center.z;
    let l = Math.sqrt(zx * zx + zy * zy + zz * zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = up.y * zz - up.z * zy, xy = up.z * zx - up.x * zz, xz = up.x * zy - up.y * zx;
    l = Math.sqrt(xx * xx + xy * xy + xz * xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
    o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
    o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * eye.x + xy * eye.y + xz * eye.z);
    o[13] = -(yx * eye.x + yy * eye.y + yz * eye.z);
    o[14] = -(zx * eye.x + zy * eye.y + zz * eye.z);
    o[15] = 1;
    return o;
  };

  // Compose translate * Ry(yaw) * Rx(pitch) * Rz(roll) * uniform-scale(s).
  M.m4Compose = function (o, px, py, pz, yaw, pitch, roll, s) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    // R = Ry * Rx * Rz, derived symbolically:
    // m00 = cy*cr + sy*sp*sr ; m10 = sy*cr - cy*sp*sr ; m20 = cp*sr
    // m01 = -cy*sr + sy*sp*cr ; m11 = sy*sr + cy*sp*cr ; m21 = cp*cr
    // m02 = sy*cp ; m12 = -cy*cp ; m22 = sp
    const m00 = cy * cr + sy * sp * sr, m01 = -cy * sr + sy * sp * cr, m02 = sy * cp;
    const m10 = sy * cr - cy * sp * sr, m11 = sy * sr + cy * sp * cr, m12 = -cy * cp;
    const m20 = cp * sr, m21 = cp * cr, m22 = sp;
    o[0] = m00 * s; o[1] = m10 * s; o[2] = m20 * s; o[3] = 0;
    o[4] = m01 * s; o[5] = m11 * s; o[6] = m21 * s; o[7] = 0;
    o[8] = m02 * s; o[9] = m12 * s; o[10] = m22 * s; o[11] = 0;
    o[12] = px; o[13] = py; o[14] = pz; o[15] = 1;
    return o;
  };

  M.m4Invert = function (o, m) {
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3],
      a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7],
      a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11],
      a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10,
      b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11,
      b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12,
      b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30,
      b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31,
      b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return M.m4Ident(o);
    det = 1 / det;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return o;
  };

  /* ---------- hashing / value noise ---------- */
  function h2(ix, iz) {
    let n = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263)) | 0;
    n = (n ^ (n >>> 13)) | 0;
    n = Math.imul(n, 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  M.h2 = h2;

  function vnoise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    let fx = x - ix, fz = z - iz;
    fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
    const a = h2(ix, iz), b = h2(ix + 1, iz), c = h2(ix, iz + 1), d = h2(ix + 1, iz + 1);
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  }
  M.vnoise = vnoise;

  M.fbm = function (x, z, oct) {
    let v = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
      v += vnoise(x * f, z * f) * amp;
      norm += amp; amp *= 0.5; f *= 2.03;
    }
    return v / norm;
  };

  // Ridged noise: sharp crests in [0,1].
  M.ridge = function (x, z, oct) {
    let v = 0, amp = 0.55, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
      const n = 1 - Math.abs(2 * vnoise(x * f, z * f) - 1);
      v += n * n * amp;
      norm += amp; amp *= 0.5; f *= 2.11;
    }
    return v / norm;
  };

  /* ---------- seeded RNG ---------- */
  M.mulberry32 = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Catmull-Rom point on a polyline of {x,y,z}, t in [0, n-1].
  M.catmull = function (out, pts, t) {
    const n = pts.length;
    const i = M.clamp(Math.floor(t), 0, n - 2);
    const f = M.clamp(t - i, 0, 1);
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[Math.min(n - 1, i + 1)], p3 = pts[Math.min(n - 1, i + 2)];
    const f2 = f * f, f3 = f2 * f;
    for (const k of ['x', 'y', 'z']) {
      out[k] = 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * f +
        (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f2 +
        (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f3);
    }
    return out;
  };
})();
