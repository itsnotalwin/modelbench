/* Emberwake — sky dome and the dusk-to-dawn palette. */
(function () {
  'use strict';
  const EW = (globalThis.EW = globalThis.EW || {});
  const M = EW.M;
  const S = (EW.Sky = {});

  const NIGHT = {
    zen: [0.040, 0.055, 0.130], hor: [0.255, 0.135, 0.185],
    fog: [0.110, 0.100, 0.170],
    sun: [0.98, 0.55, 0.30],
    skyAmb: [0.150, 0.180, 0.280], gndAmb: [0.090, 0.080, 0.120],
    night: 1.0, fogK: 1 / 1150,
    sunDir: [-0.52, 0.15, -0.42]
  };
  const DAWN = {
    zen: [0.300, 0.500, 0.720], hor: [1.000, 0.830, 0.620],
    fog: [0.820, 0.720, 0.620],
    sun: [1.00, 0.86, 0.62],
    skyAmb: [0.440, 0.500, 0.580], gndAmb: [0.280, 0.250, 0.220],
    night: 0.05, fogK: 1 / 1600,
    sunDir: [-0.30, 0.44, -0.50]
  };

  S.build = function () {
    // dome sphere, non-indexed
    const b = new EW.GLC.Builder();
    const R = 4200, LA = 18, LO = 30;
    const pt = (i, j) => {
      const th = (i / LA) * Math.PI, ph = (j / LO) * Math.PI * 2;
      return [Math.sin(th) * Math.cos(ph) * R, Math.cos(th) * R, Math.sin(th) * Math.sin(ph) * R];
    };
    for (let i = 0; i < LA; i++) {
      for (let j = 0; j < LO; j++) {
        const j2 = (j + 1) % LO;
        const a = pt(i, j), bb = pt(i, j2), c = pt(i + 1, j), d = pt(i + 1, j2);
        b.tri(a, bb, d, [1, 1, 1]); b.tri(a, d, c, [1, 1, 1]);
      }
    }
    S._data = b;
    return true;
  };

  const out = {};
  S.palette = function (dawn) {
    const t = M.clamp(dawn, 0, 1);
    const L = (a, b) => [M.lerp(a[0], b[0], t), M.lerp(a[1], b[1], t), M.lerp(a[2], b[2], t)];
    out.zen = L(NIGHT.zen, DAWN.zen);
    out.hor = L(NIGHT.hor, DAWN.hor);
    out.fog = L(NIGHT.fog, DAWN.fog);
    out.sun = L(NIGHT.sun, DAWN.sun);
    out.skyAmb = L(NIGHT.skyAmb, DAWN.skyAmb);
    out.gndAmb = L(NIGHT.gndAmb, DAWN.gndAmb);
    out.night = M.lerp(1.0, DAWN.night, t);
    out.fogK = M.lerp(NIGHT.fogK, DAWN.fogK, t);
    let sx = M.lerp(NIGHT.sunDir[0], DAWN.sunDir[0], t);
    let sy = M.lerp(NIGHT.sunDir[1], DAWN.sunDir[1], t);
    let sz = M.lerp(NIGHT.sunDir[2], DAWN.sunDir[2], t);
    const l = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
    out.sunDir = [sx / l, sy / l, sz / l];
    return out;
  };
})();
