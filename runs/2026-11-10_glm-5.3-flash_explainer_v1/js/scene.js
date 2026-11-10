/* =============================================================
   scene.js — procedural SVG cutaway of the engine.
   Nothing here stores its own time: every transform is computed
   from the crank angle handed to Scene.render() by main.js.
   ============================================================= */
(function (global) {
'use strict';
const NS = 'http://www.w3.org/2000/svg';
const M = global.EngineModel;

/* ---------------- layout constants (px, S = 2 px per mm) --------- */
const S = 2, W = 1040, H = 1260, CX = 500, CY = 900;
const mm = v => v * S;                  // mm -> px
const rPx = mm(M.MM.r);                 // 86   crank radius
const lPx = mm(M.MM.rod);               // 300  rod length
const halfBore = mm(M.MM.bore / 2);     // 86
const compH = mm(M.MM.compHeight);      // 70   pin -> crown top
const squish = mm(M.MM.squish);         // 3
const deckY = CY - (rPx + lPx + compH + squish);   // 441
const roofApexY = deckY - 32;                      // 409
const roofRise = 32;
const roofSlope = Math.atan2(roofRise, halfBore) * 180 / Math.PI;  // ~20.4°
const linerTop = deckY, linerBot = CY - 90;
const wallT = 14;
const boreL = CX - halfBore, boreR = CX + halfBore;
const valveLen = 95, springLo = 40, baseR = 28, bucketH = 12;
const retTop = -(valveLen + 9);                    // retainer top, local y
const camOffLocal = retTop - bucketH - 2 - baseR;  // -146, cam centre above seat
const sprocketR = 36, crankSprocketR = 20;
const tilt = roofSlope;

/* seat points on the pent roof (t = 0.55 along each roof face) */
const seatIn = { x: boreL + halfBore * 0.9 * 0.55, y: deckY - roofRise * 0.9 * 0.55 };
const seatEx = { x: CX + (CX - seatIn.x), y: seatIn.y };
const angIn = -tilt * Math.PI / 180, angEx = tilt * Math.PI / 180;
function rotP(a, lx, ly) { return { x: lx * Math.cos(a) - ly * Math.sin(a), y: lx * Math.sin(a) + ly * Math.cos(a) }; }
function seatPlus(side, lx, ly) {
  const seat = side === 'in' ? seatIn : seatEx;
  const r = rotP(side === 'in' ? angIn : angEx, lx, ly);
  return { x: seat.x + r.x, y: seat.y + r.y };
}
function alongAxis(side, d) { return rotP(side === 'in' ? angIn : angEx, 0, -d); }
const camInG = seatPlus('in', 0, camOffLocal);
const camExG = seatPlus('ex', 0, camOffLocal);

/* ---------------- tiny DOM helper ---------------- */
function E(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) {
    if (k === 'text') n.textContent = attrs[k];
    else n.setAttribute(k, attrs[k]);
  }
  if (parent) parent.appendChild(n);
  return n;
}

/* ---------------- palette ---------------- */
const C = {
  bgGrid: '#16202e', voidBg: '#0a0f16',
  steel: '#425062', steelHi: '#74889f', steelLo: '#2a3442',
  alu: '#52627a', aluHi: '#8fa2bd',
  hatch: '#3c4a5e', hatchHead: '#414f63',
  coolant: '#12333d', port: '#0b1018',
  oil: '#59401a', oilHi: '#7a5a24',
  intake: '#3fd2c7', exhaust: '#ef6f4c', amber: '#f5a524',
  label: '#9fb0c3'
};

/* ================================================================ */
function buildScene(svg) {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const parts = {};          // id -> {g?, hit, label, labelDef}
  const dyn = {};            // dynamic element refs
  const s = {};              // per-frame scratch shared with label anchors
  const xwRefs = {};         // explode wrappers for valve assemblies

  /* ---------------- defs ---------------- */
  const defs = E('defs', null, svg);
  function grad(id, stops) {
    const g = E('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    stops.forEach(st => E('stop', { offset: st[0], 'stop-color': st[1],
      'stop-opacity': st[2] === undefined ? 1 : st[2] }, g));
  }
  grad('metalV', [[0, C.steelHi], [0.18, '#5c6e85'], [0.5, C.steel], [0.82, '#39455a'], [1, C.steelLo]]);
  grad('aluV', [[0, C.aluHi], [0.22, '#6b7d97'], [0.55, C.alu], [0.85, '#3d4a5e'], [1, '#2e3949']]);
  grad('rodV', [[0, '#5d6e86'], [0.5, '#46536b'], [1, '#333e50']]);
  grad('valveInG', [[0, '#9fdcd6'], [0.5, '#5aa8a2'], [1, '#2e6a68']]);
  grad('valveExG', [[0, '#f2a58c'], [0.5, '#c96a4c'], [1, '#7e3d2a']]);
  grad('oilG', [[0, C.oilHi], [1, '#3a2a10']]);
  const flame = E('radialGradient', { id: 'flameG' }, defs);
  [['0', '#fff6d8', 1], ['0.3', '#ffd27a', 0.95], ['0.6', '#ff9a3c', 0.75],
   ['0.85', 'rgba(255,110,40,0.35)', 1], ['1', 'rgba(255,90,30,0)', 1]]
    .forEach(st => E('stop', { offset: st[0], 'stop-color': st[1], 'stop-opacity': st[2] }, flame));
  const glow = E('radialGradient', { id: 'glowG' }, defs);
  [['0', 'rgba(255,170,80,0.5)'], ['1', 'rgba(255,170,80,0)']]
    .forEach(st => E('stop', { offset: st[0], 'stop-color': st[1] }, glow));
  const spark = E('radialGradient', { id: 'sparkG' }, defs);
  [['0', '#ffffff', 1], ['0.4', '#cfeaff', 0.9], ['1', 'rgba(140,200,255,0)', 1]]
    .forEach(st => E('stop', { offset: st[0], 'stop-color': st[1], 'stop-opacity': st[2] }, spark));
  function hatch(id, stroke, size, angle) {
    const p = E('pattern', { id, width: size, height: size, patternUnits: 'userSpaceOnUse',
      patternTransform: `rotate(${angle})` }, defs);
    E('line', { x1: 0, y1: 0, x2: 0, y2: size, stroke, 'stroke-width': 1 }, p);
    E('line', { x1: 0, y1: 0, x2: size, y2: 0, stroke, 'stroke-width': 1, opacity: 0.25 }, p);
  }
  hatch('hatchBlock', C.hatch, 9, 45);
  hatch('hatchHead', C.hatchHead, 9, -45);
  hatch('hatchFine', '#4a5a70', 6, 45);
  const dots = E('pattern', { id: 'dotGrid', width: 26, height: 26, patternUnits: 'userSpaceOnUse' }, defs);
  E('circle', { cx: 13, cy: 13, r: 1, fill: C.bgGrid }, dots);
  const clip = E('clipPath', { id: 'chamberClip' }, defs);
  dyn.chamberClip = E('path', { d: '' }, clip);

  /* ---------------- paint-order containers ----------------
     backdrop → chain → lowA (crankcase) → mid (liner+gas)
     → lowB (piston/rod/crank) → head → hits → labels        */
  const back = E('g', { class: 'backdrop' }, svg);
  const zoom = E('g', { class: 'zoomWrap' }, svg);
  const chainG = E('g', { class: 'part', 'data-part': 'chain' }, zoom);
  const lowA = E('g', { class: 'xLowA' }, zoom);
  const mid = E('g', { class: 'xMid' }, zoom);
  const lowB = E('g', { class: 'xLowB' }, zoom);
  const head = E('g', { class: 'xHead' }, zoom);
  const midGas = E('g', { class: 'xMidGas' }, zoom);   // gas paints over head voids
  const hits = E('g', { class: 'hits' }, zoom);
  const hHitHead = E('g', { class: 'xHitHead' }, hits);
  const hHitLow = E('g', { class: 'xHitLow' }, hits);
  const hHitMid = E('g', { class: 'xHitMid' }, hits);
  const hitHome = { head: hHitHead, low: hHitLow, mid: hHitMid };
  const labelWrap = E('g', { class: 'labelWrap' }, svg);

  /* ---------------- backdrop ---------------- */
  E('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#dotGrid)' }, back);
  const dial = E('g', { opacity: 0.55 }, back);
  E('circle', { cx: CX, cy: CY, r: 170, fill: 'none', stroke: '#263349', 'stroke-width': 1.5 }, dial);
  E('circle', { cx: CX, cy: CY, r: 154, fill: 'none', stroke: '#1d2838', 'stroke-width': 1 }, dial);
  for (let a = 0; a < 720; a += 15) {
    const maj = a % 90 === 0, t = a * Math.PI / 180;
    const r1 = maj ? 147 : 153;
    E('line', { x1: CX + r1 * Math.sin(t), y1: CY - r1 * Math.cos(t),
      x2: CX + 160 * Math.sin(t), y2: CY - 160 * Math.cos(t),
      stroke: maj ? '#3a4c68' : '#263349', 'stroke-width': maj ? 1.6 : 1 }, dial);
    if (maj) E('text', { x: CX + 178 * Math.sin(t), y: CY - 178 * Math.cos(t) + 4,
      fill: '#5a6a7e', 'font-size': 13, text: a === 0 ? '0·720' : String(a),
      'text-anchor': 'middle' }, dial);
  }
  [{ th: 708, c: C.intake, h: 0 }, { th: 220, c: C.intake, h: 1 },
   { th: 495, c: C.exhaust, h: 0 }, { th: 8, c: C.exhaust, h: 1 }].forEach(ev => {
    const t = ev.th * Math.PI / 180;
    E('circle', { cx: CX + 170 * Math.sin(t), cy: CY - 170 * Math.cos(t), r: 4.5,
      fill: ev.h ? 'none' : ev.c, stroke: ev.c, 'stroke-width': 1.5 }, dial);
  });
  dyn.dialSparkDot = E('circle', { r: 4.5, fill: C.amber }, dial);
  dyn.needle = E('g', null, back);
  E('line', { x1: 0, y1: 4, x2: 0, y2: -26, stroke: C.amber, 'stroke-width': 2.5, 'stroke-linecap': 'round' }, dyn.needle);
  E('circle', { r: 5, fill: C.amber }, dyn.needle);

  const tb = E('g', null, back);
  E('rect', { x: 26, y: H - 96, width: 392, height: 66, fill: 'rgba(10,15,22,0.72)', stroke: '#263349', rx: 4 }, tb);
  E('line', { x1: 26, y1: H - 74, x2: 418, y2: H - 74, stroke: '#263349' }, tb);
  E('text', { x: 38, y: H - 79, fill: '#c8d4e4', 'font-size': 14, 'font-weight': 600, 'letter-spacing': 1.5,
    text: 'FIG. 01 — SECTION A-A' }, tb);
  E('text', { x: 38, y: H - 55, fill: '#8fa3b8', 'font-size': 11.5, 'font-family': 'var(--mono)',
    text: '499.6 cm³ DOHC single · bore 86.0 · stroke 86.0 · rod 150.0' }, tb);
  E('text', { x: 38, y: H - 39, fill: '#5a6a7e', 'font-size': 11, 'font-family': 'var(--mono)',
    text: 'dimensions mm · drawing scale 2 px = 1 mm' }, tb);
  [[26, 26], [W - 26, 26], [26, H - 26], [W - 26, H - 26]].forEach(p => {
    E('path', { d: `M${p[0] - 8} ${p[1]} H${p[0] + 8} M${p[0]} ${p[1] - 8} V${p[1] + 8}`,
      stroke: '#2a3850', 'stroke-width': 1.2 }, back);
  });

  /* ---------------- chain ---------------- */
  (function chain() {
    const ex = camExG, inx = camInG, rS = sprocketR + 2, rC = crankSprocketR + 2;
    const d = `M ${CX + rC + 4} ${CY + 6}
      C ${CX + 150} ${CY - 180}, ${ex.x + rS + 26} ${ex.y + 220}, ${ex.x + rS * 0.74} ${ex.y + rS * 0.74}
      A ${rS} ${rS} 0 1 0 ${ex.x - rS * 0.74} ${ex.y + rS * 0.74}
      L ${inx.x + rS * 0.74} ${inx.y + rS * 0.74}
      A ${rS} ${rS} 0 1 0 ${inx.x - rS * 0.74} ${inx.y + rS * 0.74}
      C ${inx.x - rS - 40} ${inx.y + 240}, ${CX - 150} ${CY - 170}, ${CX - rC - 4} ${CY + 6}
      A ${rC} ${rC} 0 0 0 ${CX + rC + 4} ${CY + 6} Z`;
    E('path', { d, fill: 'none', stroke: '#1b2534', 'stroke-width': 9, 'stroke-linejoin': 'round' }, chainG);
    dyn.chainDash = E('path', { d, fill: 'none', stroke: '#566d8c', 'stroke-width': 6,
      'stroke-dasharray': '5 9', 'stroke-linejoin': 'round' }, chainG);
    E('rect', { x: inx.x - 44, y: inx.y + 300, width: 16, height: 56, rx: 7,
      fill: '#2a3442', stroke: '#4a5a70' }, chainG);
    E('rect', { x: inx.x - 40, y: inx.y + 262, width: 8, height: 44, rx: 3, fill: '#39455a' }, chainG);
  })();

  /* ---------------- crankcase + sump (lowA) ---------------- */
  const crankcaseG = E('g', { class: 'part ctx', 'data-part': 'crankcase' }, lowA);
  const caseOutline = `M ${boreL - wallT} ${linerBot} L ${boreL - wallT - 6} ${CY - 40}
     C ${boreL - wallT - 10} ${CY + 90}, ${CX - 152} ${CY + 150}, ${CX - 130} ${CY + 152}
     L ${CX + 130} ${CY + 152} C ${CX + 152} ${CY + 150}, ${boreR + wallT + 10} ${CY + 90}, ${boreR + wallT + 6} ${CY - 40}
     L ${boreR + wallT} ${linerBot} Z`;
  E('path', { d: caseOutline, fill: 'url(#metalV)', stroke: '#1a2230', 'stroke-width': 1.5 }, crankcaseG);
  E('path', { d: caseOutline, fill: 'url(#hatchBlock)' }, crankcaseG);
  E('ellipse', { cx: CX, cy: CY + 6, rx: 148, ry: 142, fill: C.voidBg, stroke: '#222d3f', 'stroke-width': 1.5 }, crankcaseG);
  E('path', { d: `M ${CX - 130} ${CY + 118} L ${CX + 130} ${CY + 118} L ${CX + 98} ${CY + 152} L ${CX - 98} ${CY + 152} Z`,
    fill: C.voidBg, stroke: '#222d3f' }, crankcaseG);
  E('path', { d: `M ${CX - 118} ${CY + 132} L ${CX + 118} ${CY + 132} L ${CX + 98} ${CY + 150} L ${CX - 98} ${CY + 150} Z`,
    fill: 'url(#oilG)', stroke: C.oilHi, 'stroke-width': 1 }, crankcaseG);
  E('rect', { x: CX - 162, y: CY - 26, width: 28, height: 52, rx: 4, fill: 'url(#metalV)', stroke: '#1a2230' }, crankcaseG);
  E('rect', { x: CX + 134, y: CY - 26, width: 28, height: 52, rx: 4, fill: 'url(#metalV)', stroke: '#1a2230' }, crankcaseG);

  /* ---------------- liner + bore + gas (mid) ---------------- */
  const linerG = E('g', { class: 'part ctx', 'data-part': 'liner' }, mid);
  E('rect', { x: boreL, y: deckY - 34, width: halfBore * 2, height: linerBot - deckY + 34, fill: C.voidBg }, linerG);
  [[boreL - wallT, boreL], [boreR, boreR + wallT]].forEach(w => {
    E('rect', { x: w[0], y: deckY - 4, width: wallT, height: linerBot - deckY + 4,
      fill: 'url(#metalV)', stroke: '#1a2230', 'stroke-width': 1 }, linerG);
    E('rect', { x: w[0], y: deckY - 4, width: wallT, height: linerBot - deckY + 4, fill: 'url(#hatchFine)' }, linerG);
  });
  E('rect', { x: boreL - wallT - 12, y: deckY - 4, width: 12, height: linerBot - deckY + 4, fill: C.coolant, opacity: 0.85 }, linerG);
  E('rect', { x: boreR + wallT, y: deckY - 4, width: 12, height: linerBot - deckY + 4, fill: C.coolant, opacity: 0.85 }, linerG);
  E('rect', { x: boreL - wallT - 12, y: deckY - 8, width: halfBore * 2 + wallT * 2 + 24, height: 8, fill: '#39455a' }, linerG);

  /* gas layer is appended into midGas (after head) so it paints over the
     head's chamber void; see the gasG block further down */

  /* ---------------- piston / rings / rod / crank (lowB) ---------------- */
  const pistonG = E('g', { class: 'part', 'data-part': 'piston' }, lowB);
  const pistonInner = E('g', null, pistonG);
  const pw = halfBore * 2 - 5;
  E('path', { d: `M ${-pw / 2} ${-compH} H ${pw / 2} V ${-compH + 26} L ${pw / 2 - 4} ${-compH + 30}
     V 44 L ${pw / 2 - 12} 52 V 104 L ${-pw / 2 + 12} 104 V 52 L ${-pw / 2 + 4} 44 V ${-compH + 30} L ${-pw / 2} ${-compH + 26} Z`,
    fill: 'url(#aluV)', stroke: '#1a2230', 'stroke-width': 1.2 }, pistonInner);
  E('path', { d: `M ${-pw / 2 + 8} ${-compH + 7} Q 0 ${-compH + 12} ${pw / 2 - 8} ${-compH + 7}`,
    fill: 'none', stroke: '#1f2937', 'stroke-width': 1.4, opacity: 0.8 }, pistonInner);
  E('circle', { r: 21, fill: '#39455a', stroke: '#1f2937' }, pistonInner);
  E('circle', { r: 11, fill: '#8fa2bd', stroke: '#1f2937' }, pistonInner);
  dyn.ringWear = E('path', { d: `M ${pw / 2 - 6} ${-compH + 8} l 7 0`, stroke: '#ffd27a', 'stroke-width': 2.5,
    opacity: 0, 'stroke-linecap': 'round' }, pistonInner);
  const ringsG = E('g', { class: 'part', 'data-part': 'rings' }, lowB);
  dyn.rings = [];
  for (let i = 0; i < 3; i++) {
    dyn.rings.push(E('rect', { x: -halfBore + 1.5, y: -compH + 8 + i * 9, width: halfBore * 2 - 4, height: 4,
      rx: 1.5, fill: i === 2 ? '#8a6d3f' : '#aebacb', stroke: '#1f2937', 'stroke-width': 0.7 }, ringsG));
  }
  const rodG = E('g', { class: 'part', 'data-part': 'rod' }, lowB);
  const rodInner = E('g', null, rodG);
  E('path', { d: `M -9 6 L -6 ${lPx - 16} L -22 ${lPx - 8} L -22 ${lPx + 8} L 22 ${lPx + 8} L 22 ${lPx - 8} L 6 ${lPx - 16} L 9 6 Z`,
    fill: 'url(#rodV)', stroke: '#1a2230', 'stroke-width': 1.2 }, rodInner);
  E('line', { x1: -3, y1: 22, x2: -3, y2: lPx - 22, stroke: '#74889f', 'stroke-width': 2, opacity: 0.5 }, rodInner);
  E('circle', { r: 13, fill: 'none', stroke: '#8fa2bd', 'stroke-width': 7 }, rodInner);
  E('circle', { cy: lPx, r: 15, fill: 'none', stroke: '#8fa2bd', 'stroke-width': 9 }, rodInner);
  E('line', { x1: -19, y1: lPx - 12, x2: 19, y2: lPx + 12, stroke: '#1f2937', 'stroke-width': 2 }, rodInner);
  const crankG = E('g', { class: 'part', 'data-part': 'crank' }, lowB);
  const crankInner = E('g', null, crankG);
  E('path', { d: `M 0 ${rPx} L -14 ${rPx - 10} L -20 30 L -34 44 A 118 118 0 0 0 34 44 L 20 30 L 14 ${rPx - 10} Z`,
    fill: 'url(#metalV)', stroke: '#1a2230', 'stroke-width': 1.4 }, crankInner);
  E('path', { d: `M -34 44 A 118 118 0 0 0 34 44 L 44 66 A 104 104 0 0 1 -44 66 Z`,
    fill: 'url(#hatchBlock)', opacity: 0.9 }, crankInner);
  E('rect', { x: -16, y: -rPx - 6, width: 32, height: rPx + 30, rx: 8,
    fill: 'url(#metalV)', stroke: '#1a2230', 'stroke-width': 1.2 }, crankInner);
  E('circle', { cy: -rPx, r: 16, fill: '#8fa2bd', stroke: '#1f2937', 'stroke-width': 1.5 }, crankInner);
  E('circle', { cy: -rPx, r: 6, fill: '#39455a' }, crankInner);
  E('circle', { r: 17, fill: '#5c6e85', stroke: '#1f2937', 'stroke-width': 1.5 }, crankInner);
  E('circle', { r: 5, fill: '#1f2937' }, crankInner);

  /* ---------------- head assembly (head) ---------------- */
  const headG = E('g', { class: 'part ctx', 'data-part': 'head' }, head);
  const headOutline = `M ${boreL - wallT - 12} ${deckY} L 375 ${deckY} L 375 268 Q 375 244 399 244 L 601 244
     Q 625 244 625 268 L 625 ${deckY} L ${boreR + wallT + 12} ${deckY} Z`;
  E('path', { d: headOutline, fill: 'url(#metalV)', stroke: '#1a2230', 'stroke-width': 1.5 }, headG);
  E('path', { d: headOutline, fill: 'url(#hatchHead)' }, headG);
  E('rect', { x: 383, y: 224, width: 234, height: 34, rx: 10, fill: '#33404f', stroke: '#1a2230', 'stroke-width': 1.4 }, headG);
  E('line', { x1: 383, y1: 250, x2: 617, y2: 250, stroke: '#1a2230', 'stroke-width': 1.4 }, headG);
  E('path', { d: `M ${boreL} ${deckY} L ${CX} ${roofApexY} L ${boreR} ${deckY} Z`,
    fill: C.voidBg, stroke: '#39455a', 'stroke-width': 1 }, headG);
  const portInD = `M ${seatIn.x - 6} ${seatIn.y - 4} C ${seatIn.x - 26} ${seatIn.y - 14}, 424 396, 408 376 L 370 356`;
  const portExD = `M ${seatEx.x + 6} ${seatEx.y - 4} C ${seatEx.x + 26} ${seatEx.y - 14}, 576 396, 592 376 L 630 356`;
  E('path', { d: portInD, fill: 'none', stroke: C.port, 'stroke-width': 24, 'stroke-linecap': 'round' }, headG);
  E('path', { d: portExD, fill: 'none', stroke: C.port, 'stroke-width': 24, 'stroke-linecap': 'round' }, headG);
  E('line', { x1: 372, y1: 357, x2: 268, y2: 322, stroke: C.port, 'stroke-width': 30, 'stroke-linecap': 'round' }, headG);
  E('line', { x1: 628, y1: 357, x2: 732, y2: 322, stroke: C.port, 'stroke-width': 30, 'stroke-linecap': 'round' }, headG);
  E('line', { x1: 372, y1: 357, x2: 268, y2: 322, stroke: 'url(#metalV)', 'stroke-width': 10, 'stroke-linecap': 'round', opacity: 0.35 }, headG);
  E('line', { x1: 628, y1: 357, x2: 732, y2: 322, stroke: 'url(#metalV)', 'stroke-width': 10, 'stroke-linecap': 'round', opacity: 0.35 }, headG);
  E('rect', { x: 250, y: 300, width: 12, height: 46, rx: 3, fill: 'url(#metalV)', stroke: '#1a2230' }, headG);
  E('rect', { x: 738, y: 300, width: 12, height: 46, rx: 3, fill: 'url(#metalV)', stroke: '#1a2230' }, headG);
  E('line', { x1: boreL - wallT - 12, y1: deckY + 1.5, x2: boreR + wallT + 12, y2: deckY + 1.5,
    stroke: '#c9a24a', 'stroke-width': 3, opacity: 0.8, 'stroke-dasharray': '14 7' }, headG);
  E('rect', { x: CX - 9, y: 336, width: 18, height: 76, fill: C.port }, headG);
  [camInG, camExG].forEach(c => {
    E('circle', { cx: c.x, cy: c.y, r: 44, fill: C.port, stroke: '#39455a', 'stroke-width': 1.5 }, headG);
    E('circle', { cx: c.x, cy: c.y, r: 33, fill: 'none', stroke: '#2a3850', 'stroke-width': 4 }, headG);
  });
  ['in', 'ex'].forEach(side => {
    const a = seatPlus(side, 0, -springLo - 6), b = seatPlus(side, 0, -valveLen + 4);
    E('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: C.port, 'stroke-width': 26, 'stroke-linecap': 'round' }, headG);
    const ga = seatPlus(side, 0, -34), gb = seatPlus(side, 0, -62);
    E('line', { x1: ga.x, y1: ga.y, x2: gb.x, y2: gb.y, stroke: '#2a3850', 'stroke-width': 12 }, headG);
    E('line', { x1: ga.x, y1: ga.y, x2: gb.x, y2: gb.y, stroke: 'url(#hatchFine)', 'stroke-width': 12 }, headG);
  });

  /* throttle body on the intake runner */
  const throttleG = E('g', { class: 'part', 'data-part': 'throttle' }, head);
  dyn.thrPivot = { x: 292, y: 336 };
  E('rect', { x: 272, y: 312, width: 40, height: 48, rx: 6, fill: '#2c3745', stroke: '#1a2230', 'stroke-width': 1.3 }, throttleG);
  E('circle', { cx: 292, cy: 336, r: 4, fill: '#8fa2bd' }, throttleG);
  dyn.thrPlate = E('rect', { x: 289, y: 319, width: 6, height: 34, rx: 2.5,
    fill: '#aebacb', stroke: '#1f2937', 'stroke-width': 1 }, throttleG);

  /* ---------------- valves + springs + cams ---------------- */
  ['in', 'ex'].forEach(side => {
    const seat = side === 'in' ? seatIn : seatEx;
    const rot = side === 'in' ? -tilt : tilt;
    const asm = E('g', { transform: `translate(${seat.x.toFixed(1)} ${seat.y.toFixed(1)}) rotate(${rot.toFixed(2)})` }, head);
    const xw = E('g', { class: 'xValve' }, asm);   // explode offset lives here (local frame)
    xwRefs[side] = xw;

    const vg = E('g', { class: 'part', 'data-part': 'valve' + side }, xw);
    const vi = E('g', null, vg);
    const headR = side === 'in' ? 18 : 15.5;
    const colG = side === 'in' ? 'url(#valveInG)' : 'url(#valveExG)';
    E('path', { d: `M ${-headR} 6 L ${-headR * 0.72} -1 L -4 -1 L -4 ${-valveLen} L 4 ${-valveLen} L 4 -1 L ${headR * 0.72} -1 L ${headR} 6 Z`,
      fill: colG, stroke: '#101820', 'stroke-width': 1.1 }, vi);
    E('path', { d: `M ${-headR} 6 A ${headR} ${headR} 0 0 0 ${headR} 6 L ${headR * 0.72} 2.5 L ${-headR * 0.72} 2.5 Z`,
      fill: colG, stroke: '#101820', 'stroke-width': 1.1 }, vi);
    E('line', { x1: 0, y1: -valveLen + 4, x2: 0, y2: -6, stroke: 'rgba(255,255,255,0.28)', 'stroke-width': 1.6 }, vi);
    E('rect', { x: -11, y: retTop, width: 22, height: 9, rx: 2, fill: '#74889f', stroke: '#1a2230', 'stroke-width': 1 }, vi);
    E('rect', { x: -14, y: retTop - bucketH, width: 28, height: bucketH + 2, rx: 3,
      fill: 'url(#metalV)', stroke: '#1a2230', 'stroke-width': 1.1 }, vi);
    dyn['valve' + side] = vi;

    const sg = E('g', { class: 'part', 'data-part': 'spring' + side }, xw);
    dyn['spring' + side] = E('path', { d: '', fill: 'none', stroke: side === 'in' ? '#6fc7bd' : '#d98d70',
      'stroke-width': 3.4, 'stroke-linecap': 'round' }, sg);
    dyn['springBroken' + side] = E('g', { opacity: 0 }, sg);
    E('path', { d: 'M -10 -46 L 2 -36 M 6 -52 L -4 -42', stroke: '#ffd27a', 'stroke-width': 2.4, 'stroke-linecap': 'round' },
      dyn['springBroken' + side]);

    const cg = E('g', { class: 'part', 'data-part': 'cam' + side }, xw);
    const camPos = E('g', { transform: `translate(0 ${camOffLocal})` }, cg);
    const camRot = E('g', null, camPos);
    dyn['camRot' + side] = camRot;
    E('circle', { r: sprocketR, fill: '#2c3745', stroke: '#4a5a70', 'stroke-width': 2 }, camRot);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      E('circle', { cx: (sprocketR - 7) * Math.cos(a), cy: (sprocketR - 7) * Math.sin(a), r: 2.6, fill: '#4a5a70' }, camRot);
    }
    let d = '';
    for (let a = -97; a <= 97; a += 2) {
      const t = a * Math.PI / 180;
      let r = baseR;
      const aa = Math.abs(a);
      if (aa <= 58) r = baseR + (side === 'in' ? M.VALVE.in : M.VALVE.ex).maxLift * S
        * Math.pow(Math.sin(Math.PI * (0.5 + aa / 116)), 1.5);
      d += (a === -97 ? 'M' : 'L') + (r * Math.sin(t)).toFixed(1) + ' ' + (r * Math.cos(t)).toFixed(1) + ' ';
    }
    E('path', { d: d + 'Z', fill: 'url(#metalV)', stroke: '#1a2230', 'stroke-width': 1.4 }, camRot);
    E('circle', { r: 8, fill: '#2a3442', stroke: '#1f2937' }, camRot);
    E('circle', { cy: -baseR + 7, r: 3, fill: '#aebacb' }, camRot);
  });

  /* ---------------- spark plug ---------------- */
  const plugG = E('g', { class: 'part', 'data-part': 'plug' }, head);
  const plugXw = E('g', { class: 'xPlug' }, plugG);
  (function plug() {
    const x = CX;
    E('rect', { x: x - 8, y: 300, width: 16, height: 44, rx: 3, fill: '#2c3745', stroke: '#1a2230' }, plugXw);
    E('rect', { x: x - 6, y: 342, width: 12, height: 40, rx: 2, fill: '#e8e2d6', stroke: '#8a8578', 'stroke-width': 1 }, plugXw);
    for (let i = 0; i < 3; i++) E('line', { x1: x - 6, y1: 348 + i * 11, x2: x + 6, y2: 348 + i * 11, stroke: '#b5ad9c', 'stroke-width': 1.6 }, plugXw);
    E('rect', { x: x - 9, y: 382, width: 18, height: 16, rx: 2, fill: 'url(#metalV)', stroke: '#1a2230' }, plugXw);
    E('path', { d: `M ${x - 5} 398 L ${x + 5} 398 L ${x + 3} 412 L ${x - 3} 412 Z`, fill: '#8fa2bd', stroke: '#1a2230', 'stroke-width': 1 }, plugXw);
    E('line', { x1: x, y1: 412, x2: x, y2: roofApexY + 8, stroke: '#c8d4e4', 'stroke-width': 2 }, plugXw);
    E('path', { d: `M ${x - 7} ${roofApexY + 12} L ${x - 3.5} ${roofApexY + 8}`, stroke: '#c8d4e4', 'stroke-width': 2 }, plugXw);
    E('path', { d: `M ${x - 3} ${roofApexY + 9} L ${x + 5} ${roofApexY + 13}`, stroke: '#e8eef6', 'stroke-width': 1.6 }, plugXw);
  })();
  dyn.sparkFlash = E('g', { opacity: 0, 'pointer-events': 'none' }, svg);
  E('circle', { cx: CX, cy: roofApexY + 10, r: 16, fill: 'url(#sparkG)' }, dyn.sparkFlash);
  for (let i = 0; i < 4; i++) {
    const a = -0.6 + i * 0.4;
    E('line', { x1: CX + 6 * Math.sin(a), y1: roofApexY + 10 + 6 * Math.cos(a),
      x2: CX + 15 * Math.sin(a), y2: roofApexY + 10 + 15 * Math.cos(a),
      stroke: '#dff2ff', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, dyn.sparkFlash);
  }

  /* ---------------- port flow indicators ---------------- */
  dyn.flowIn = E('path', { d: portInD, fill: 'none', 'pointer-events': 'none', stroke: C.intake,
    'stroke-width': 7, 'stroke-dasharray': '4 12', 'stroke-linecap': 'round', opacity: 0 }, head);
  dyn.flowEx = E('path', { d: portExD, fill: 'none', 'pointer-events': 'none', stroke: C.exhaust,
    'stroke-width': 7, 'stroke-dasharray': '4 12', 'stroke-linecap': 'round', opacity: 0 }, head);
  dyn.flowInPipe = E('line', { x1: 372, y1: 357, x2: 268, y2: 322, 'pointer-events': 'none', stroke: C.intake,
    'stroke-width': 9, 'stroke-dasharray': '4 14', 'stroke-linecap': 'round', opacity: 0 }, head);
  dyn.flowExPipe = E('line', { x1: 628, y1: 357, x2: 732, y2: 322, 'pointer-events': 'none', stroke: C.exhaust,
    'stroke-width': 9, 'stroke-dasharray': '4 14', 'stroke-linecap': 'round', opacity: 0 }, head);

  /* ---------------- gas: clip + particles + flame (over head voids) ------ */
  const gasG = E('g', { class: 'part', 'data-part': 'chamber' }, midGas);
  const gasInner = E('g', { 'clip-path': 'url(#chamberClip)' }, gasG);
  dyn.chamberBg = E('path', { d: '', fill: 'rgba(8,12,20,0.55)' }, gasInner);
  dyn.particles = [];
  const pGroup = E('g', null, gasInner);
  for (let i = 0; i < 110; i++) {
    dyn.particles.push({
      u: (i * 0.61803) % 1 - 0.5,
      v: (i * 0.7548) % 1,
      el: E('circle', { r: 2.3, opacity: 0.8, fill: '#5a6a7e' }, pGroup)
    });
  }
  dyn.glowC = E('circle', { cx: CX, cy: roofApexY + 8, r: 60, fill: 'url(#glowG)', opacity: 0 }, gasInner);
  dyn.flameC = E('circle', { cx: CX, cy: roofApexY + 6, r: 0, fill: 'url(#flameG)', opacity: 0 }, gasInner);

  /* ---------------- hit areas ---------------- */
  function addHit(id, home, attrs) {
    const h = E('rect', Object.assign({ fill: 'transparent', 'pointer-events': 'all' }, attrs), hitHome[home]);
    parts[id] = parts[id] || {};
    parts[id].hit = h;
  }
  addHit('piston', 'low', { x: boreL, y: 0, width: halfBore * 2, height: 1 });
  addHit('rings', 'low', { x: boreL, y: 0, width: halfBore * 2, height: 1 });
  addHit('rod', 'low', { x: 0, y: 0, width: 1, height: 1 });
  addHit('crank', 'low', { x: CX - 130, y: CY - 130, width: 260, height: 260 });
  addHit('liner', 'mid', { x: boreL - wallT, y: deckY, width: wallT * 2 + halfBore * 2, height: linerBot - deckY });
  addHit('head', 'head', { x: 375, y: 218, width: 250, height: deckY - 218 });
  addHit('chamber', 'mid', { x: boreL, y: deckY - 42, width: halfBore * 2, height: 62 });
  addHit('plug', 'head', { x: CX - 14, y: 296, width: 28, height: 126 });
  addHit('valvein', 'head', { x: 0, y: 0, width: 1, height: 1 });
  addHit('valveex', 'head', { x: 0, y: 0, width: 1, height: 1 });
  addHit('springin', 'head', { x: 0, y: 0, width: 1, height: 1 });
  addHit('springex', 'head', { x: 0, y: 0, width: 1, height: 1 });
  addHit('camin', 'head', { x: 0, y: 0, width: 1, height: 1 });
  addHit('camex', 'head', { x: 0, y: 0, width: 1, height: 1 });
  addHit('throttle', 'head', { x: 268, y: 308, width: 48, height: 56 });
  addHit('portin', 'head', { x: 252, y: 300, width: 220, height: 100 });
  addHit('portex', 'head', { x: 568, y: 300, width: 220, height: 100 });
  addHit('chain', 'low', { x: 384, y: 300, width: 52, height: 540 });
  addHit('crankcase', 'low', { x: boreL - wallT, y: linerBot, width: (boreR + wallT) - (boreL - wallT), height: CY + 152 - linerBot });

  /* ---------------- labels ---------------- */
  const labels = [
    { id: 'piston',    side: 'L', text: 'PISTON',              af: () => ({ x: CX - 30, y: s._crownY + 30 + s._lowDy }) },
    { id: 'rings',     side: 'R', text: 'RING PACK',           af: () => ({ x: CX + 62, y: s._crownY + 14 + s._lowDy }) },
    { id: 'rod',       side: 'L', text: 'CONNECTING ROD',      af: () => ({ x: CX - 20, y: s._rodMidY + s._lowDy }) },
    { id: 'crank',     side: 'R', text: 'CRANK & COUNTERWEIGHT', af: () => ({ x: CX + 92, y: CY + 52 + s._lowDy }) },
    { id: 'crankcase', side: 'R', text: 'CRANKCASE & SUMP',    af: () => ({ x: CX + 122, y: CY + 122 + s._lowDy }) },
    { id: 'liner',     side: 'L', text: 'CYLINDER LINER',      af: () => ({ x: boreL - 6, y: deckY + 210 }) },
    { id: 'head',      side: 'R', text: 'CYLINDER HEAD',       af: () => ({ x: 618, y: deckY - 120 + s._headDy }) },
    { id: 'chamber',   side: 'L', text: 'COMBUSTION CHAMBER',  af: () => ({ x: CX - 26, y: Math.max(s._crownY - 8, roofApexY + 14) }) },
    { id: 'portin',    side: 'L', text: 'INTAKE PORT',         af: () => ({ x: 316, y: 342 + s._headDy }) },
    { id: 'portex',    side: 'R', text: 'EXHAUST PORT',        af: () => ({ x: 684, y: 342 + s._headDy }) },
    { id: 'throttle',  side: 'L', text: 'THROTTLE',            af: () => ({ x: 292, y: 354 + s._headDy }) },
    { id: 'valvein',   side: 'L', text: 'INTAKE VALVE',        af: () => addDelta(seatPlus('in', 0, -8), 'in', 46) },
    { id: 'valveex',   side: 'R', text: 'EXHAUST VALVE',       af: () => addDelta(seatPlus('ex', 0, -8), 'ex', 46) },
    { id: 'springin',  side: 'L', text: 'VALVE SPRING',        af: () => addDelta(seatPlus('in', 0, -58), 'in', 46) },
    { id: 'camin',     side: 'L', text: 'CAM LOBE',            af: () => addDelta({ x: camInG.x - 30, y: camInG.y }, 'in', 46) },
    { id: 'camex',     side: 'R', text: 'CAMSHAFT (½ CRANK SPEED)', af: () => addDelta({ x: camExG.x + 30, y: camExG.y }, 'ex', 46) },
    { id: 'plug',      side: 'R', text: 'SPARK PLUG',          af: () => ({ x: CX + 12, y: 352 + s._headDy - s._amt * 64 }) },
    { id: 'chain',     side: 'L', text: 'TIMING CHAIN 2:1',    af: () => ({ x: 420, y: 640 }) }
  ];
  function addDelta(p, side, d) {
    const o = alongAxis(side, d * s._amt);
    return { x: p.x + o.x, y: p.y + o.y + s._headDy };
  }
  labels.forEach(L => {
    const g = E('g', { class: 'lbl', 'data-for': L.id }, labelWrap);
    L.leader = E('path', { d: '', fill: 'none', stroke: '#33415a', 'stroke-width': 1.2 }, g);
    L.el = E('text', { text: L.text, fill: C.label, 'font-size': 12.5, 'letter-spacing': 1.6,
      'font-weight': 600, 'paint-order': 'stroke', stroke: 'rgba(8,12,18,0.85)', 'stroke-width': 3 }, g);
    parts[L.id] = parts[L.id] || {};
    parts[L.id].label = g;
    parts[L.id].labelDef = L;
  });

  /* ---------------- render ---------------- */
  function render(pt, opts) {
    const th = pt.th, faults = opts.faults, amt = opts.explodeAmt || 0;
    const cycle = opts.cycle;
    s._amt = amt;
    s._headDy = -150 * amt;
    s._lowDy = 70 * amt;

    /* explode wrappers (scale eases 1 → 0.84) */
    const sc = 1 - 0.16 * amt;
    zoom.setAttribute('transform', `translate(${CX * (1 - sc)} ${620 * (1 - sc)}) scale(${sc})`);
    head.setAttribute('transform', `translate(0 ${s._headDy})`);
    lowA.setAttribute('transform', `translate(0 ${s._lowDy})`);
    lowB.setAttribute('transform', `translate(0 ${s._lowDy})`);
    mid.setAttribute('transform', '');
    hHitHead.setAttribute('transform', `translate(0 ${s._headDy})`);
    hHitLow.setAttribute('transform', `translate(0 ${s._lowDy})`);
    hHitMid.setAttribute('transform', '');
    ['in', 'ex'].forEach(side => {
      xwRefs[side].setAttribute('transform', `translate(0 ${(-46 * amt).toFixed(2)})`);
    });
    plugXw.setAttribute('transform', `translate(0 ${-64 * amt})`);
    chainG.setAttribute('opacity', (1 - amt * 0.92).toFixed(2));

    /* kinematics (model metres -> px: m · 1000 mm/m · S px/mm) */
    const pinY = CY - M.pinDist(th) * 1000 * S;
    const crownY = pinY - compH;
    const thR = th * Math.PI / 180;
    const cpx = CX + rPx * Math.sin(thR), cpy = CY - rPx * Math.cos(thR);
    pistonInner.setAttribute('transform', `translate(${CX} ${pinY})`);
    ringsG.setAttribute('transform', `translate(${CX} ${pinY})`);
    const rodAng = Math.atan2(cpx - CX, cpy - pinY);
    rodInner.setAttribute('transform', `translate(${CX} ${pinY}) rotate(${(rodAng * 180 / Math.PI).toFixed(2)})`);
    crankInner.setAttribute('transform', `translate(${CX} ${CY}) rotate(${th})`);
    s._crownY = crownY; s._pinY = pinY;
    s._rodMidY = (pinY + cpy) / 2;

    /* valves + springs */
    const liPx = pt.li * S, lePx = pt.le * S;
    dyn.valvein.setAttribute('transform', `translate(0 ${liPx.toFixed(1)})`);
    dyn.valveex.setAttribute('transform', `translate(0 ${lePx.toFixed(1)})`);
    ['in', 'ex'].forEach(side => {
      const lift = side === 'in' ? liPx : lePx;
      const top = retTop + lift, bot = -springLo;
      const turns = 7, amp = 11;
      let d = '';
      for (let i = 0; i <= turns * 2; i++) {
        const t2 = i / (turns * 2);
        const y = bot + (top - bot) * t2;
        const x = (i % 2 === 0 ? -amp : amp) * Math.sin(Math.PI * Math.min(1, t2 * 1.15));
        d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
      }
      dyn['spring' + side].setAttribute('d', d);
      const broken = side === 'in' ? faults.intakeSpring : faults.exhaustSpring;
      dyn['spring' + side].setAttribute('opacity', broken ? 0.25 : 1);
      dyn['springBroken' + side].setAttribute('opacity', broken ? 1 : 0);
    });

    /* cams (half crank speed, nose at follower at each valve's peak) */
    dyn.camRotin.setAttribute('transform', `rotate(${((th - M.VALVE.in.peak) / 2).toFixed(2)})`);
    dyn.camRotex.setAttribute('transform', `rotate(${((th - M.VALVE.ex.peak) / 2).toFixed(2)})`);

    /* chamber clip + gas */
    let clipD;
    if (crownY >= deckY) {
      clipD = `M ${boreL} ${deckY} L ${CX} ${roofApexY} L ${boreR} ${deckY} L ${boreR} ${crownY} L ${boreL} ${crownY} Z`;
    } else {
      const f = (crownY - roofApexY) / roofRise;
      const xl = CX - f * halfBore, xr = CX + f * halfBore;
      clipD = `M ${xl.toFixed(1)} ${crownY.toFixed(1)} L ${CX} ${roofApexY} L ${xr.toFixed(1)} ${crownY.toFixed(1)} Z`;
    }
    dyn.chamberClip.setAttribute('d', clipD);
    dyn.chamberBg.setAttribute('d', clipD);

    /* particles — deterministic; density, colour & agitation from state */
    const That = (pt.P * pt.Vcc) / (0.9 * 500);
    const amp = Math.min(6, 0.8 + Math.sqrt(Math.max(That, 0.15)) * 2.1) * (opts.reducedMotion ? 0.35 : 1);
    const kf = Math.floor(th / 9), ft = (th / 9) % 1;
    const heat = clamp((That - 0.8) / 6, 0, 1);
    const burnGlow = clamp(pt.xb, 0, 1);
    for (let i = 0; i < dyn.particles.length; i++) {
      const p = dyn.particles[i];
      const roofYu = Math.max(deckY - roofRise * (1 - Math.abs(p.u) * 2), roofApexY + 2);
      const yBase = crownY - p.v * (crownY - roofYu) * 0.94;
      const n1 = frac(Math.sin(i * 127.1 + kf * 311.7) * 43758.5453);
      const n2 = frac(Math.sin(i * 127.1 + (kf + 1) * 311.7) * 43758.5453);
      const n3 = frac(Math.sin(i * 269.5 + kf * 183.3) * 43758.5453);
      const n4 = frac(Math.sin(i * 269.5 + (kf + 1) * 183.3) * 43758.5453);
      const x = CX + p.u * (halfBore * 2 - 10) + ((n1 * (1 - ft) + n2 * ft) - 0.5) * 2 * amp;
      const y = yBase + ((n3 * (1 - ft) + n4 * ft) - 0.5) * 2 * amp;
      p.el.setAttribute('cx', x.toFixed(1));
      p.el.setAttribute('cy', y.toFixed(1));
      const warm = mixCol([112, 128, 150], [238, 158, 96], heat);
      const col = mixCol(warm, [255, 185, 115], burnGlow * 0.75);
      p.el.setAttribute('fill', `rgb(${col[0]},${col[1]},${col[2]})`);
      p.el.setAttribute('opacity', (0.62 + 0.32 * burnGlow).toFixed(2));
    }

    /* flame + spark */
    const sparkTh = 360 - opts.cfg.advance;
    const burnEnd = sparkTh + M.CFG.BURN_DUR;
    let fo = 0;
    if (pt.xb > 0.02) {
      fo = smooth((th - sparkTh) / 6) * (1 - smooth((th - burnEnd - 6) / 36));
      if (cycle && cycle.knock && th > cycle.peakTh && th < cycle.peakTh + 40 && !opts.reducedMotion) {
        fo = Math.min(1, fo + 0.3 * Math.abs(Math.sin(th * 2.4)));
      }
    }
    dyn.flameC.setAttribute('r', (6 + 92 * Math.pow(pt.xb, 0.42)).toFixed(1));
    dyn.flameC.setAttribute('opacity', (fo * 0.92).toFixed(2));
    dyn.glowC.setAttribute('r', (30 + 120 * clamp(pt.xb, 0, 1)).toFixed(1));
    dyn.glowC.setAttribute('opacity', (fo * 0.5).toFixed(2));
    let so = 0;
    if (!faults.spark && th >= sparkTh && th < sparkTh + 8) so = 1 - (th - sparkTh) / 8;
    dyn.sparkFlash.setAttribute('opacity', so.toFixed(2));
    dyn.needle.setAttribute('transform',
      `translate(${(CX + 170 * Math.sin(thR)).toFixed(1)} ${(CY - 170 * Math.cos(thR)).toFixed(1)}) rotate(${th})`);
    const spTh = sparkTh * Math.PI / 180;
    dyn.dialSparkDot.setAttribute('cx', (CX + 170 * Math.sin(spTh)).toFixed(1));
    dyn.dialSparkDot.setAttribute('cy', (CY - 170 * Math.cos(spTh)).toFixed(1));

    /* port flow */
    const Pman = cycle ? cycle.Pman : 1;
    const fIn = (pt.li > 0.3) ? clamp((Pman - pt.P) * 5 + 0.35, -1, 1) * Math.min(1, pt.li / 6) : 0;
    const fEx = (pt.le > 0.3) ? clamp((pt.P - M.P_EXH) * 5 + 0.1, -1, 1) * Math.min(1, pt.le / 5) : 0;
    setFlow(dyn.flowIn, fIn, th);
    setFlow(dyn.flowInPipe, fIn * 0.8, th);
    setFlow(dyn.flowEx, fEx, th);
    setFlow(dyn.flowExPipe, fEx * 0.8, th);

    /* throttle plate */
    dyn.thrPlate.setAttribute('transform',
      `rotate(${(-8 - 74 * opts.cfg.throttle / 100).toFixed(1)} 292 336)`);

    /* chain dashes */
    dyn.chainDash.setAttribute('stroke-dashoffset', (-(th * 0.62) % 14).toFixed(1));

    /* hit areas that follow moving parts */
    parts.piston.hit.setAttribute('x', boreL);
    parts.piston.hit.setAttribute('y', crownY - 6);
    parts.piston.hit.setAttribute('height', 122);
    parts.rings.hit.setAttribute('x', boreL);
    parts.rings.hit.setAttribute('y', crownY + 2);
    parts.rings.hit.setAttribute('height', 30);
    parts.rod.hit.setAttribute('x', Math.min(CX, cpx) - 34);
    parts.rod.hit.setAttribute('y', Math.min(pinY, cpy));
    parts.rod.hit.setAttribute('width', Math.abs(cpx - CX) + 68);
    parts.rod.hit.setAttribute('height', Math.abs(cpy - pinY) + 30);
    parts.chamber.hit.setAttribute('y', Math.min(crownY, deckY - 42));
    dyn.ringWear.setAttribute('opacity', faults.rings ? 1 : 0);
    ['in', 'ex'].forEach(side => {
      const seat = side === 'in' ? seatIn : seatEx;
      const ax = alongAxis(side, 1);
      const lift = side === 'in' ? liPx : lePx;
      const co = alongAxis(side, 46 * amt);          // valvetrain explode offset
      const h = parts['valve' + side].hit;
      const bx = seat.x + ax.x * (10 + lift) + co.x, by = seat.y + ax.y * (10 + lift) + co.y;
      const tx = seat.x + ax.x * 128 + co.x, ty = seat.y + ax.y * 128 + co.y;
      h.setAttribute('x', Math.min(bx, tx) - 22); h.setAttribute('y', Math.min(by, ty) - 6);
      h.setAttribute('width', 44 + Math.abs(ax.x) * 118); h.setAttribute('height', Math.abs(ty - by) + 24);
      const sh = parts['spring' + side].hit;
      const bs = seatPlus(side, 0, -springLo), ts = seatPlus(side, 0, -valveLen + lift);
      sh.setAttribute('x', Math.min(bs.x, ts.x) - 16 + co.x); sh.setAttribute('y', Math.min(bs.y, ts.y) - 8 + co.y);
      sh.setAttribute('width', 32 + Math.abs(ax.x) * 64); sh.setAttribute('height', Math.abs(ts.y - bs.y) + 24);
      const ch = parts['cam' + side].hit;
      const cgp = side === 'in' ? camInG : camExG;
      ch.setAttribute('x', cgp.x + co.x - sprocketR - 2); ch.setAttribute('y', cgp.y + co.y - sprocketR - 2);
      ch.setAttribute('width', (sprocketR + 2) * 2); ch.setAttribute('height', (sprocketR + 2) * 2);
    });
    parts.plug.hit.setAttribute('y', 296 - 64 * amt);
    parts.head.hit.setAttribute('y', 218);
    parts.portin.hit.setAttribute('y', 300);
    parts.portex.hit.setAttribute('y', 300);
    parts.throttle.hit.setAttribute('y', 308);
    parts.crankcase.hit.setAttribute('y', linerBot);
    parts.piston.hit.setAttribute('y', crownY - 6);
    parts.rings.hit.setAttribute('y', crownY + 2);
    parts.rod.hit.setAttribute('y', Math.min(pinY, cpy));
    parts.crank.hit.setAttribute('y', CY - 130);

    layoutLabels();
  }

  /* ------- label layout: two y-sorted columns, no collisions ------- */
  function layoutLabels() {
    const sc = 1 - 0.16 * s._amt, ox = CX * (1 - sc), oy = 620 * (1 - sc);
    const colX = { L: 128, R: 912 };
    ['L', 'R'].forEach(side => {
      const list = labels.filter(l => l.side === side)
        .map(l => ({ l, a: l.af() }))
        .sort((p, q) => p.a.y - q.a.y);
      let lastY = -1e9;
      list.forEach(o => {
        const a = o.a, l = o.l;
        const ax = ox + sc * a.x, ay = oy + sc * a.y;
        const slot = Math.max(ay, lastY + 27, 40);
        lastY = slot;
        const x = colX[side];
        const elbow = x + (side === 'L' ? 18 : -18);
        l.leader.setAttribute('d',
          `M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${elbow} ${slot.toFixed(1)} L ${x} ${slot.toFixed(1)}`);
        l.el.setAttribute('x', side === 'L' ? x + 5 : x - 5);
        l.el.setAttribute('y', slot + 4.5);
        l.el.setAttribute('text-anchor', side === 'L' ? 'start' : 'end');
      });
    });
  }

  /* ---------------- helpers ---------------- */
  function setFlow(el, strength, th) {
    const m = Math.abs(strength);
    el.setAttribute('opacity', Math.min(0.9, m * 1.1).toFixed(2));
    if (m > 0.02) el.setAttribute('stroke-dashoffset', ((strength >= 0 ? 1 : -1) * th * 0.55 % 16).toFixed(1));
  }
  function frac(x) { return x - Math.floor(x); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function mixCol(a, b, t) {
    t = clamp(t, 0, 1);
    return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
  }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  return { parts, labels, render, CONST: { W, H } };
}

global.Scene = { build: buildScene };
})(typeof window !== 'undefined' ? window : globalThis);
