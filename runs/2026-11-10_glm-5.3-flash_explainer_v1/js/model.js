/* =============================================================
   model.js — the single source of physical truth.
   Every moving part, readout, chart and label in the app derives
   from the functions in this file. Nothing else integrates time.

   A zero-dimensional (teaching-grade) model of a single-cylinder
   four-stroke gasoline engine, in the tradition of Heywood's
   "Internal Combustion Engine Fundamentals":
     - exact slider-crank kinematics
     - valve lift from an analytic cam profile (cam = crank/2)
     - polytropic closed-chamber model + Wiebe heat release
     - empirical wall-heat decay, blow-down, pumping loop
     - gas + reciprocating-inertia crank torque
   All pressures absolute (bar), angles in crank degrees, 0° = TDC
   overlap (start of intake), 360° = firing TDC.
   ============================================================= */
(function (global) {
'use strict';

/* ---------------- tunable calibration constants ---------------- */
const CFG = {
  BETA0: 6.3,          // burned-gas pressure multiplier at reference load
  BURN_DUR: 40,        // Wiebe burn duration, crank degrees
  N_COMP: 1.32,        // polytropic exponent, compression (unburned)
  N_EXP: 1.25,         // polytropic exponent, expansion (burned)
  WALL_BURN: 0.005,    // wall-heat decay per deg after burn end
  WALL_MOTOR: 0.0025,  // wall-heat decay per deg, motored expansion
  BD_TAU: 18,          // blow-down time constant, crank degrees
  PUMP_DIP: 0.06,      // mid-stroke intake depression fraction
  EXH_BUMP: 0.22,      // exhaust-stroke pressure bump, bar
  KNOCK_P: 72,         // peak-pressure knock threshold, bar
  M_REC: 0.62          // reciprocating mass, kg (piston assy + ~1/3 rod)
};

/* ---------------- fixed geometry (SI) ---------------- */
const BORE = 0.086, STROKE = 0.086, ROD = 0.150;
const R = STROKE / 2;                       // 0.043 m crank radius
const LAM = R / ROD;                        // 0.2867
const AREA = Math.PI / 4 * BORE * BORE;     // 5.811e-3 m^2
const VD = AREA * STROKE;                   // 4.996e-4 m^3 = 499.6 cc
const P_ATM = 1.013;                        // bar
const P_EXH = 1.08;                         // exhaust back pressure, bar
const BLOWBY = 0.0016;                      // worn-ring leak, per deg
const D2R = Math.PI / 180;

/* Valve timing (crank degrees). 0 = TDC overlap, 360 = firing TDC. */
const VALVE = {
  in: { open: 708, close: 220, dur: 232, maxLift: 9.2, peak: 104, name: 'intake' },
  ex: { open: 495, close: 8,   dur: 233, maxLift: 8.0, peak: 611.5, name: 'exhaust' }
};

/* ---------------- small math helpers ---------------- */
const clamp = (x, a, b) => x < a ? a : (x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function wrap720(a) { a %= 720; return a < 0 ? a + 720 : a; }

/* ---------------- slider-crank kinematics ---------------- */
/* Axial distance of piston pin from crank centre. */
function pinDist(thDeg) {
  const t = thDeg * D2R, s = Math.sin(t), c = Math.cos(t);
  return R * c + Math.sqrt(ROD * ROD - R * R * s * s);
}
/* Piston position from TDC (metres, positive down the liner). */
function pistonX(thDeg) { return R + ROD - pinDist(thDeg); }
/* dx/dtheta (m per radian of crank angle). */
function pistonX1(thDeg) {
  const t = thDeg * D2R, s = Math.sin(t), c = Math.cos(t);
  const q = Math.sqrt(1 - LAM * LAM * s * s);
  return R * s * (1 + LAM * c / q);
}
/* d2x/dtheta2 (m per rad^2) — central difference, plenty smooth. */
function pistonX2(thDeg) {
  const h = 0.5;
  return (pistonX1(thDeg + h) - pistonX1(thDeg - h)) / (2 * h * D2R);
}
/* Rod inclination from the cylinder axis, radians (0 = straight). */
function rodAngle(thDeg) {
  const t = thDeg * D2R, s = Math.sin(t);
  return Math.asin(clamp(LAM * s, -1, 1));
}

/* ---------------- cam / valve lift (mm) ---------------- */
/* Profile: f(s) = sin(pi*s)^1.5 — zero lift and zero velocity at seat. */
function camProfile(s) { return Math.pow(Math.sin(Math.PI * clamp(s, 0, 1)), 1.5); }
function baseLift(v, thDeg) {
  const d = wrap720(thDeg - v.open);
  if (d > v.dur) return 0;
  return v.maxLift * camProfile(d / v.dur);
}
function flutter(thDeg, v) {           // broken spring: valve hangs partly open
  return Math.max(0.6, v.maxLift * 0.52 + 0.8 * Math.sin(thDeg * Math.PI / 26));
}
function liftIn(thDeg, faults) {
  return faults && faults.intakeSpring ? flutter(thDeg, VALVE.in) : baseLift(VALVE.in, thDeg);
}
function liftEx(thDeg, faults) {
  return faults && faults.exhaustSpring ? flutter(thDeg, VALVE.ex) : baseLift(VALVE.ex, thDeg);
}

/* ---------------- combustion ---------------- */
/* Wiebe mass-fraction burned. */
function wiebe(thDeg, burnStart, dur) {
  const s = (thDeg - burnStart) / dur;
  if (s <= 0) return 0;
  if (s >= 1) return 1;
  return 1 - Math.exp(-5 * s * s * s);
}

/* ---------------- parameter preparation ---------------- */
/* cfg = { throttle:0-100, advance:0-40 (deg BTDC), cr:8-13, rpm,
           faults:{spark,exhaustSpring,intakeSpring,rings} } */
function prepare(cfg) {
  const f = cfg.faults || {};
  const throttle = clamp(cfg.throttle, 0, 100);
  const Pman = 0.28 + 0.70 * Math.pow(throttle / 100, 1.35);   // bar abs
  const Vc = VD / (cfg.cr - 1);
  const V220 = Vc + AREA * pistonX(220);
  const P220 = Pman * (0.94 - CFG.PUMP_DIP);                    // pressure trapped at IVC
  const effCR = V220 / Vc;
  const motPeak = P220 * Math.pow(effCR, CFG.N_COMP);           // motored TDC pressure
  const burnStart = 360 - clamp(cfg.advance, 0, 40);
  const burnEnd = burnStart + CFG.BURN_DUR;
  const th50 = burnStart + 0.517 * CFG.BURN_DUR;                // 50 % burned point
  const fp = clamp(1 - 0.00045 * Math.pow(th50 - 372, 2), 0.22, 1); // phasing penalty

  let burnEff = 1;
  if (f.spark) burnEff = 0;
  if (f.exhaustSpring || f.intakeSpring) burnEff = 0;           // no compression → no flame
  const beta = CFG.BETA0 * fp * Math.pow(P220 / 0.90, 0.92) * burnEff;

  return {
    cfg, f, throttle, Pman, Vc, V220, P220, effCR, motPeak,
    burnStart, burnEnd, th50, fp, beta, burnEff,
    omega: (cfg.rpm || 0) * 2 * Math.PI / 60
  };
}

/* ---------------- cylinder pressure (bar abs) ---------------- */
/* Continuous in theta over the whole 720° cycle. */
function pressure(thDeg, pre, peakInfo) {
  const th = wrap720(thDeg);
  const f = pre.f, Vc = pre.Vc;
  const vol = t => Vc + AREA * pistonX(t);
  const baseIntake = t => pre.Pman * (0.94 - CFG.PUMP_DIP * Math.sin(Math.PI * t / 220));
  /* worn-ring leak factors (closed-chamber phases only) */
  const leakC = t => f.rings ? Math.exp(-BLOWBY * Math.max(0, t - 220)) : 1;
  const leakE = t => f.rings ? Math.exp(-BLOWBY * 0.6 * Math.max(0, t - 220)) : 1;

  let P;

  if (f.exhaustSpring) {
    /* exhaust valve held open from EVO (495) all the way to next IVC (220) */
    if (th >= 495) {                                  // exhaust stroke (normal-ish)
      const Pevo = motoredExpansionEnd(pre);
      P = Math.max(P_EXH, Pevo * Math.exp(-(th - 495) / CFG.BD_TAU))
        + CFG.EXH_BUMP * Math.sin(Math.PI * (th - 495) / 225) * smooth((th - 495) / 30);
    } else if (th < 220) {                            // intake stroke, both ports open
      P = lerp(P_EXH, baseIntake(th), smooth(th / 35));
    } else if (th < 360) {                            // compression, leaking to exhaust
      P = P_EXH * (1 + 0.12 * Math.sin(Math.PI * (th - 220) / 140));
    } else {                                          // power stroke, sucking on exhaust
      P = P_EXH * (1 - 0.10 * Math.sin(Math.PI * (th - 360) / 135));
    }
    return P;
  }

  if (f.intakeSpring) {
    /* intake valve held open all cycle */
    if (th >= 495) {                                  // exhaust stroke + stuck intake
      P = lerp(P_EXH, pre.Pman, 0.45)
        + CFG.EXH_BUMP * 0.6 * Math.sin(Math.PI * (th - 495) / 225);
    } else if (th < 220) {                            // intake stroke (normal fill)
      P = baseIntake(th);
    } else if (th < 360) {                            // compression, leaking to intake
      P = pre.Pman * (1 + 0.12 * Math.sin(Math.PI * (th - 220) / 140));
    } else {                                          // power stroke, still open intake
      P = pre.Pman * (1 - 0.10 * Math.sin(Math.PI * (th - 360) / 135));
    }
    return P;
  }

  /* ----- healthy valves ----- */
  if (th < 220) {                                     // intake stroke
    P = baseIntake(th);
    if (th < 14) P = lerp(P_EXH, P, smooth(th / 14)); // overlap tail into intake
    return P;
  }
  if (pre.burnEff <= 0) {                             // motored: no combustion at all
    if (th < 495) {
      return pre.P220 * Math.pow(pre.V220 / vol(th), 1.30)
        * Math.exp(-CFG.WALL_MOTOR * Math.max(0, th - 360)) * leakE(th);
    }
    const PevoMot = pre.P220 * Math.pow(pre.V220 / vol(495), 1.30)
      * Math.exp(-CFG.WALL_MOTOR * 135);
    return Math.max(P_EXH, PevoMot * Math.exp(-(th - 495) / CFG.BD_TAU))
      + CFG.EXH_BUMP * Math.sin(Math.PI * (th - 495) / 225) * smooth((th - 495) / 30);
  }
  if (th <= pre.burnEnd) {                            // compression + burn (IVC → burn end)
    const nb = th > pre.burnStart
      ? lerp(CFG.N_COMP, CFG.N_EXP, smooth((th - pre.burnStart) / CFG.BURN_DUR))
      : CFG.N_COMP;
    P = pre.P220 * Math.pow(pre.V220 / vol(th), nb) * leakC(th);
    if (th > pre.burnStart) {
      P *= 1 + pre.beta * wiebe(th, pre.burnStart, CFG.BURN_DUR);
    }
    return P;
  }
  {                                                   // expansion, anchored at burn end
    const Vbe = vol(pre.burnEnd);
    const Pbe = pre.P220 * Math.pow(pre.V220 / Vbe, CFG.N_EXP) * (1 + pre.beta) * leakC(pre.burnEnd);
    P = Pbe * Math.pow(Vbe / vol(th), CFG.N_EXP)
      * Math.exp(-CFG.WALL_BURN * (th - pre.burnEnd)) * leakE(th);
  }
  if (th >= 495) {                                    // blow-down + exhaust stroke
    const Pevo = peakInfo && peakInfo.Pevo !== undefined ? peakInfo.Pevo : P;
    P = Math.max(P_EXH, Pevo * Math.exp(-(th - 495) / CFG.BD_TAU))
      + CFG.EXH_BUMP * Math.sin(Math.PI * (th - 495) / 225) * smooth((th - 495) / 30);
  }
  /* knock: ring-down pressure oscillation after the peak (end-gas autoignition) */
  if (peakInfo && peakInfo.knock && pre.burnEff > 0 && peakInfo.peakTh !== undefined) {
    const dth = th - peakInfo.peakTh;
    if (dth > 0 && dth < 70) {
      P += peakInfo.sev * 5 * Math.sin(dth * Math.PI / 7)
        * Math.exp(-dth / 16) * clamp(P / 40, 0.3, 1.4);
    }
  }
  return P;
}

/* Motored expansion pressure at EVO (495°) — used by fault branches. */
function motoredExpansionEnd(pre) {
  const Vc = pre.Vc, vol = t => Vc + AREA * pistonX(t);
  const Vbe = vol(360);
  const Pbe = pre.P220 * Math.pow(pre.V220 / Vbe, 1.30);
  return Pbe * Math.pow(Vbe / vol(495), 1.28) * Math.exp(-CFG.WALL_MOTOR * 135);
}

/* ---------------- one-sample state ---------------- */
function point(thDeg, cfg, pre, peakInfo) {
  if (!pre) pre = prepare(cfg);
  const th = wrap720(thDeg);
  const P = pressure(th, pre, peakInfo);
  const Vcc = (pre.Vc + AREA * pistonX(th)) * 1e6;           // cc
  const li = liftIn(th, pre.f), le = liftEx(th, pre.f);
  const xb = pre.burnEff > 0 && th >= 495 ? 1
           : wiebe(th, pre.burnStart, CFG.BURN_DUR) * pre.burnEff;
  const omega = pre.omega;
  const Tg = (P - P_ATM) * 1e5 * AREA * pistonX1(th);        // gas torque, N·m
  const Ti = -CFG.M_REC * omega * omega * pistonX2(th) * pistonX1(th); // inertia torque
  const Fg = (P - P_ATM) * 1e5 * AREA;                       // gas force on crown, N
  const v = pistonX1(th) * omega;                            // piston speed, m/s
  return {
    th, P, Vcc, li, le, xb,
    x: pistonX(th) * 1000,             // mm from TDC
    v,                                 // m/s (signed)
    a: pistonX2(th) * omega * omega,   // m/s²
    Tg, Ti, Fg,
    rod: rodAngle(th),
    phase: Math.floor(th / 180)
  };
}

/* ---------------- whole-cycle build (for charts & means) ---------------- */
function build(cfg) {
  const pre = prepare(cfg);
  const N = 720;
  const arr = { P: new Array(N), V: new Array(N), Tg: new Array(N),
                Ti: new Array(N), li: new Array(N), le: new Array(N),
                xb: new Array(N), x: new Array(N) };
  /* pass 1 — find Pevo, peak pressure, decide knock */
  const peakInfo = { knock: false, Pevo: undefined };
  let peakP = -1, peakTh = 0, Pevo = 0;
  for (let i = 0; i < N; i++) {
    const s = point(i, cfg, pre, { knock: false });
    if (i === 495) Pevo = s.P;
    if (s.P > peakP) { peakP = s.P; peakTh = i; }
  }
  peakInfo.Pevo = Pevo;
  /* knock decision (healthy burn only) */
  const c = pre.cfg;
  if (pre.burnEff > 0) {
    if (peakP > CFG.KNOCK_P) peakInfo.knock = true;
    else if (c.throttle >= 80 && c.cr >= 11 && c.advance >= 26) peakInfo.knock = true;
  }
  if (peakInfo.knock) peakInfo.sev = clamp((peakP - 55) / 25, 0.35, 1.2);
  /* pass 2 — the canonical arrays (identical to per-frame point() calls) */
  for (let i = 0; i < N; i++) {
    const s = point(i, cfg, pre, peakInfo);
    arr.P[i] = s.P; arr.V[i] = s.Vcc; arr.Tg[i] = s.Tg; arr.Ti[i] = s.Ti;
    arr.li[i] = s.li; arr.le[i] = s.le; arr.xb[i] = s.xb; arr.x[i] = s.x;
  }
  peakP = -1; peakTh = 0;
  for (let i = 0; i < N; i++) if (arr.P[i] > peakP) { peakP = arr.P[i]; peakTh = i; }
  peakInfo.peakTh = peakTh;
  /* net indicated work over the full cycle:  W = ∮ P dV  */
  const volOf = i => pre.Vc + AREA * pistonX(i);
  let W = 0;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    W += (arr.P[i] + arr.P[j]) * 0.5 * 1e5 * (volOf(j) - volOf(i));
  }
  const IMEPbar = W / VD / 1e5;
  const torqueMean = W / (4 * Math.PI);
  const omega = pre.omega;
  /* gross (closed-chamber) work for reference */
  let Wg = 0;
  for (let i = 220; i < 495; i++) {
    Wg += (arr.P[i] + arr.P[i + 1]) * 0.5 * 1e5 * (volOf(i + 1) - volOf(i));
  }
  return {
    pre, cfg: pre.cfg, arrays: arr, N, peakInfo,
    peakP, peakTh, knock: !!peakInfo.knock, knockSev: peakInfo.sev || 0,
    Pevo, IMEPbar, torqueMean, grossIMEP: Wg / VD / 1e5,
    powerKw: torqueMean * omega / 1000,
    motPeak: pre.motPeak, P220: pre.P220, Pman: pre.Pman, effCR: pre.effCR,
    minP: Math.min.apply(null, arr.P),
    meanPistonSpeed: 2 * STROKE * (cfg.rpm || 0) / 60
  };
}

/* ---------------- cycle events (for flags / countdowns) ---------------- */
const EVENTS = [
  { th: 8,   id: 'EVC',   label: 'EVC — exhaust valve closes' },
  { th: 104, id: 'Ipk',   label: 'intake lift peak' },
  { th: 220, id: 'IVC',   label: 'IVC — intake valve closes' },
  { th: 348, id: 'SPARK', label: 'spark (default 12° BTDC)', dynamic: 'spark' },
  { th: 372, id: 'θ50',   label: 'half the charge burned', dynamic: 'th50' },
  { th: 495, id: 'EVO',   label: 'EVO — exhaust valve opens' },
  { th: 611.5, id: 'Epk', label: 'exhaust lift peak' },
  { th: 708, id: 'IVO',   label: 'IVO — intake valve opens' }
];
function nextEvent(th, cfg) {
  const thw = wrap720(th);
  const list = EVENTS.map(e => ({
    th: e.id === 'SPARK' ? 360 - cfg.advance : (e.id === 'θ50' ? 360 - cfg.advance + 0.517 * CFG.BURN_DUR : e.th),
    id: e.id, label: e.label
  })).sort((a, b) => a.th - b.th);
  for (const e of list) if (e.th > thw + 1e-6) return e;
  return list[0];
}
const PHASES = ['intake', 'compression', 'power', 'exhaust'];

/* ---------------- public API ---------------- */
const EngineModel = {
  CFG, BORE, STROKE, ROD, R, LAM, AREA, VD, P_ATM, P_EXH, VALVE, EVENTS, PHASES,
  clamp, lerp, smooth, wrap720,
  pistonX, pistonX1, pistonX2, rodAngle, pinDist,
  liftIn, liftEx, baseLift, camProfile, wiebe,
  prepare, pressure, point, build, nextEvent,
  displacementCc: VD * 1e6,
  compHeight: 0.035, squish: 0.0015,
  /* millimetre constants for drawing code */
  MM: { bore: 86, stroke: 86, rod: 150, r: 43, compHeight: 35, squish: 1.5 }
};
if (typeof module !== 'undefined' && module.exports) module.exports = EngineModel;
global.EngineModel = EngineModel;
})(typeof window !== 'undefined' ? window : globalThis);
