/* =============================================================
   charts.js — four derived charts, all fed from EngineModel.build.
   Static layers rebuild on parameter/resize change; the playhead
   and current-value dots update per frame from the same state.
   ============================================================= */
(function (global) {
'use strict';
const NS = 'http://www.w3.org/2000/svg';

function E(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) {
    if (k === 'text') n.textContent = attrs[k];
    else n.setAttribute(k, attrs[k]);
  }
  if (parent) parent.appendChild(n);
  return n;
}
function niceMax(v) {
  if (v <= 0) return 10;
  const steps = [10, 20, 30, 40, 60, 80, 100, 120, 160, 200, 300, 400];
  for (const s of steps) if (v <= s) return s;
  return Math.ceil(v / 100) * 100;
}
function fmt(x, d) { return x.toFixed(d === undefined ? 1 : d); }

const PHASE_COLORS = ['rgba(63,210,199,0.16)', 'rgba(143,168,255,0.14)',
                      'rgba(245,165,36,0.15)', 'rgba(154,167,181,0.14)'];
const PHASE_LETTERS = ['I', 'C', 'P', 'E'];

/* ------------- one chart ------------- */
function makeChart(container, spec) {
  /* spec: {title, yLabel, series:[{id,color,label,dash}], markers:[{th,color,label}],
             kind:'line'|'loop', sym:false, band:true, onScrub} */
  const head = document.createElement('div');
  head.className = 'chartHead';
  const h3 = document.createElement('h3');
  h3.textContent = spec.title;
  head.appendChild(h3);
  const legend = document.createElement('div');
  legend.className = 'legend';
  head.appendChild(legend);
  const cur = document.createElement('span');
  cur.className = 'cur';
  head.appendChild(cur);
  container.appendChild(head);

  const svg = E('svg', { role: 'img', 'aria-label': spec.title + ' chart', class: 'chartSvg' }, container);
  const PAD = { l: 46, r: 14, t: 18, b: 30 };
  let W = 300, H = 200;
  const st = {
    data: {},           // id -> array (or {x,y} pairs for loop)
    baseline: null,     // {data, color}
    visible: {},        // id -> bool
    peak: null, mean: null, note: null,
    th: 0, pt: null
  };
  spec.series.forEach(s => { st.visible[s.id] = true; });

  /* legend chips */
  const chips = {};
  spec.series.forEach(s => {
    if (s.noLegend) return;
    const b = document.createElement('button');
    b.className = 'chip';
    b.setAttribute('aria-pressed', 'true');
    b.innerHTML = `<i style="background:${s.color}"></i>${s.label}`;
    b.addEventListener('click', () => {
      st.visible[s.id] = !st.visible[s.id];
      b.setAttribute('aria-pressed', String(st.visible[s.id]));
      b.classList.toggle('off', !st.visible[s.id]);
      rebuild();
    });
    legend.appendChild(b);
    chips[s.id] = b;
  });

  /* scales (set on rebuild) */
  let xmax = 720, xmin = 0, ymin = 0, ymax = 100;

  function sx(x) { return PAD.l + (x - xmin) / (xmax - xmin) * (W - PAD.l - PAD.r); }
  function sy(y) { return H - PAD.b - (y - ymin) / (ymax - ymin) * (H - PAD.t - PAD.b); }

  let gStatic = null, gPlay = null, playLine = null, dots = {};

  function rebuild() {
    svg.innerHTML = '';
    const rect = container.getBoundingClientRect();
    W = Math.max(240, rect.width);
    H = Math.max(150, rect.height - head.offsetHeight - 8);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);

    /* y range */
    let m = spec.floor || 20;
    Object.values(st.data).forEach(arr => {
      if (!arr) return;
      if (spec.kind === 'loop') arr.forEach(p => m = Math.max(m, p.y));
      else arr.forEach(v => m = Math.max(m, Math.abs(v)));
    });
    if (st.baseline) (spec.kind === 'loop' ? st.baseline.data : st.baseline.data)
      .forEach(v => m = Math.max(m, spec.kind === 'loop' ? v.y : Math.abs(v)));
    if (st.mean) m = Math.max(m, Math.abs(st.mean));
    ymax = niceMax(m * 1.06);
    if (spec.sym) { ymin = -ymax; } else { ymin = 0; }
    xmax = spec.xmax || 720; xmin = spec.xmin || 0;

    gStatic = E('g', null, svg);
    /* grid */
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const yv = ymin + (ymax - ymin) * i / ySteps;
      E('line', { x1: PAD.l, y1: sy(yv), x2: W - PAD.r, y2: sy(yv), stroke: '#1c2637', 'stroke-width': 1 }, gStatic);
      E('text', { x: PAD.l - 6, y: sy(yv) + 3.5, fill: '#647689', 'font-size': 10.5,
        'text-anchor': 'end', text: fmt(yv, Math.abs(yv) < 10 ? 1 : 0) }, gStatic);
    }
    const xSteps = spec.kind === 'loop' ? 4 : 8;
    for (let i = 0; i <= xSteps; i++) {
      const xv = xmin + (xmax - xmin) * i / xSteps;
      E('line', { x1: sx(xv), y1: PAD.t, x2: sx(xv), y2: H - PAD.b, stroke: '#1c2637' }, gStatic);
      E('text', { x: sx(xv), y: H - PAD.b + 14, fill: '#647689', 'font-size': 10.5,
        'text-anchor': 'middle', text: spec.kind === 'loop' ? fmt(xv, 0) : fmt(xv, 0) }, gStatic);
    }
    /* axis unit labels */
    E('text', { x: 6, y: PAD.t + 2, fill: '#647689', 'font-size': 10, text: spec.yLabel }, gStatic);
    E('text', { x: W - PAD.r, y: H - 4, fill: '#647689', 'font-size': 10, 'text-anchor': 'end',
      text: spec.xLabel || '' }, gStatic);

    /* phase bands */
    if (spec.band && spec.kind !== 'loop') {
      for (let p = 0; p < 4; p++) {
        E('rect', { x: sx(p * 180), y: H - PAD.b - 9, width: sx((p + 1) * 180) - sx(p * 180), height: 9,
          fill: PHASE_COLORS[p] }, gStatic);
        E('text', { x: sx(p * 180 + 90), y: H - PAD.b - 2, fill: '#7c8ea3', 'font-size': 8.5,
          'text-anchor': 'middle', text: PHASE_LETTERS[p] }, gStatic);
      }
    }

    /* baseline (dashed) */
    if (st.baseline) {
      const c = spec.kind === 'loop'
        ? loopPath(st.baseline.data)
        : linePath(st.baseline.data);
      E('path', { d: c, fill: 'none', stroke: '#5a6a7e', 'stroke-width': 1.3,
        'stroke-dasharray': '5 5', opacity: 0.85 }, gStatic);
    }

    /* series */
    spec.series.forEach(s => {
      if (!st.visible[s.id] || !st.data[s.id]) return;
      const d = spec.kind === 'loop' ? loopPath(st.data[s.id]) : linePath(st.data[s.id]);
      if (spec.kind === 'loop' && s.fill) {
        E('path', { d, fill: s.fill, stroke: 'none' }, gStatic);
      }
      E('path', { d, fill: 'none', stroke: s.color, 'stroke-width': s.width || 1.8,
        'stroke-dasharray': s.dash || 'none', 'stroke-linejoin': 'round' }, gStatic);
    });

    /* mean line */
    if (st.mean !== null && st.mean !== undefined && spec.kind === 'line') {
      const y = sy(st.mean);
      E('line', { x1: PAD.l, y1: y, x2: W - PAD.r, y2: y, stroke: '#c8d4e4', 'stroke-width': 1,
        'stroke-dasharray': '2 4', opacity: 0.8 }, gStatic);
      E('text', { x: W - PAD.r - 4, y: y - 4, fill: '#c8d4e4', 'font-size': 10.5, 'text-anchor': 'end',
        text: 'mean ' + fmt(st.mean, 1) + (spec.unit ? ' ' + spec.unit : '') }, gStatic);
    }

    /* event markers */
    (spec.markers || []).forEach(mk => {
      const x = sx(mk.th);
      if (x < PAD.l || x > W - PAD.r) return;
      E('line', { x1: x, y1: PAD.t, x2: x, y2: H - PAD.b - 10, stroke: mk.color,
        'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0.9 }, gStatic);
      E('text', { x: x + (mk.flip ? -4 : 4), y: PAD.t + 9, fill: mk.color, 'font-size': 9.5,
        'text-anchor': mk.flip ? 'end' : 'start', text: mk.label }, gStatic);
    });

    /* peak annotation */
    if (st.peak) {
      const x = sx(st.peak.x), y = sy(st.peak.y);
      E('circle', { cx: x, cy: y, r: 3.5, fill: '#ff6b35', stroke: '#0c1117' }, gStatic);
      E('text', { x: x + (x > W * 0.6 ? -6 : 6), y: y - 7, fill: '#ffb08c', 'font-size': 10.5,
        'text-anchor': x > W * 0.6 ? 'end' : 'start', text: st.peak.label }, gStatic);
    }
    if (st.note) {
      E('text', { x: PAD.l + 8, y: H - PAD.b - 14, fill: '#8fa3b8', 'font-size': 11, text: st.note }, gStatic);
    }

    /* playhead layer */
    gPlay = E('g', null, svg);
    playLine = E('line', { y1: PAD.t, y2: H - PAD.b, stroke: '#e8eef6', 'stroke-width': 1, opacity: 0.55 }, gPlay);
    dots = {};
    spec.series.forEach(s => {
      if (!st.visible[s.id]) return;
      dots[s.id] = E('circle', { r: 3.4, fill: s.color, stroke: '#0c1117', 'stroke-width': 1 }, gPlay);
    });
    if (st.baseline) dots._base = E('circle', { r: 2.8, fill: 'none', stroke: '#8fa3b8', 'stroke-width': 1.2 }, gPlay);
    updatePlayhead();
  }

  function linePath(arr) {
    let d = '';
    const n = arr.length;
    for (let i = 0; i < n; i++) {
      const x = sx(i * 720 / n);
      const y = sy(arr[i]);
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
      if (i % 4 === 3) d += ' ';
    }
    return d;
  }
  function loopPath(pts) {
    let d = '';
    for (let i = 0; i < pts.length; i++) {
      d += (i === 0 ? 'M' : 'L') + sx(pts[i].x).toFixed(1) + ' ' + sy(pts[i].y).toFixed(1);
      if (i % 4 === 3) d += ' ';
    }
    return d + 'Z';
  }

  function updatePlayhead() {
    if (!gPlay || !st.pt) return;
    const th = st.th;
    const pt = st.pt;
    if (spec.kind === 'loop') {
      playLine.setAttribute('x1', sx(pt.Vcc)); playLine.setAttribute('x2', sx(pt.Vcc));
      if (dots[spec.series[0].id]) {
        dots[spec.series[0].id].setAttribute('cx', sx(pt.Vcc));
        dots[spec.series[0].id].setAttribute('cy', sy(pt.P));
      }
      if (dots._base && st.baseline) {
        const arr = st.baseline.data;
        const i = Math.floor(th) % arr.length;
        dots._base.setAttribute('cx', sx(arr[i].x));
        dots._base.setAttribute('cy', sy(arr[i].y));
        dots._base.setAttribute('opacity', 1);
      } else if (dots._base) dots._base.setAttribute('opacity', 0);
    } else {
      playLine.setAttribute('x1', sx(th)); playLine.setAttribute('x2', sx(th));
      spec.series.forEach(s => {
        const el = dots[s.id];
        if (!el) return;
        const v = s.value ? s.value(pt, st) : null;
        if (v === null || v === undefined) { el.setAttribute('opacity', 0); return; }
        el.setAttribute('opacity', 1);
        el.setAttribute('cx', sx(th));
        el.setAttribute('cy', sy(v));
      });
    }
    if (spec.curFmt && st.pt) cur.textContent = spec.curFmt(st.pt, st);
  }

  /* hover scrub */
  svg.addEventListener('pointerdown', e => {
    svg.setPointerCapture && svg.setPointerCapture(e.pointerId);
    scrubTo(e);
  });
  svg.addEventListener('pointermove', e => { if (e.buttons) scrubTo(e); });
  function scrubTo(e) {
    if (!spec.onScrub) return;
    const rect = svg.getBoundingClientRect();
    const fx = (e.clientX - rect.left - PAD.l / W * rect.width) / (rect.width * (1 - (PAD.l + PAD.r) / W));
    const th = Math.max(0, Math.min(719.9, fx * (xmax - xmin) + xmin));
    spec.onScrub(th);
  }

  return {
    setData(id, arr) { st.data[id] = arr; },
    setBaseline(arr) { st.baseline = arr ? { data: arr } : null; },
    setPeak(p) { st.peak = p; },
    setMean(v) { st.mean = v; },
    setNote(t) { st.note = t; },
    setPlayhead(th, pt) { st.th = th; st.pt = pt; updatePlayhead(); },
    rebuild,
    el: svg
  };
}

/* ------------- the four charts ------------- */
let chartP, chartT, chartV, chartPV;

function init(hooks) {
  chartP = makeChart(document.getElementById('chartP'), {
    title: 'Cylinder pressure — one cycle', yLabel: 'bar', unit: 'bar',
    series: [{ id: 'p', color: '#ffb454', label: 'current tune', value: pt => pt.P }],
    markers: [
      { th: 708, color: '#3fd2c7', label: 'IVO' },
      { th: 220, color: '#3fd2c7', label: 'IVC' },
      { th: 495, color: '#ef6f4c', label: 'EVO' },
      { th: 8, color: '#ef6f4c', label: 'EVC' }
    ],
    curFmt: pt => fmt(pt.P, 1) + ' bar @ ' + Math.round(pt.th) + '°',
    onScrub: hooks.onScrub
  });

  chartT = makeChart(document.getElementById('chartT'), {
    title: 'Crank torque — gas & inertia', yLabel: 'N·m', unit: 'N·m', sym: true, floor: 100,
    series: [
      { id: 'tg', color: '#ffb454', label: 'gas torque', value: pt => pt.Tg },
      { id: 'ti', color: '#8fa8ff', label: 'inertia torque', dash: '4 4', value: pt => pt.Ti }
    ],
    curFmt: pt => fmt(pt.Tg, 0) + ' N·m gas',
    onScrub: hooks.onScrub
  });

  chartV = makeChart(document.getElementById('chartV'), {
    title: 'Valve lift — cam profile', yLabel: 'mm', unit: 'mm', floor: 10.5,
    series: [
      { id: 'li', color: '#3fd2c7', label: 'intake', value: pt => pt.li },
      { id: 'le', color: '#ef6f4c', label: 'exhaust', value: pt => pt.le }
    ],
    markers: [
      { th: 708, color: '#3fd2c7', label: 'IVO' },
      { th: 220, color: '#3fd2c7', label: 'IVC' },
      { th: 495, color: '#ef6f4c', label: 'EVO' },
      { th: 8, color: '#ef6f4c', label: 'EVC' }
    ],
    curFmt: pt => 'I ' + fmt(pt.li, 1) + ' · E ' + fmt(pt.le, 1) + ' mm',
    onScrub: hooks.onScrub
  });

  chartPV = makeChart(document.getElementById('chartPV'), {
    title: 'P–V diagram — indicated work', yLabel: 'bar', unit: 'bar', floor: 20,
    kind: 'loop', xmax: 540, xmin: 20, band: false,
    series: [{ id: 'loop', color: '#ffb454', label: 'cycle', fill: 'rgba(245,165,36,0.10)' }],
    xLabel: 'cm³',
    curFmt: pt => fmt(pt.Vcc, 0) + ' cm³ · ' + fmt(pt.P, 1) + ' bar',
    onScrub: hooks.onScrub
  });
}

/* rebuild all static layers from cycles */
function setCycles(cycle, baselineCycle) {
  const A = cycle.arrays, N = cycle.N;
  chartP.setData('p', A.P);
  chartP.setBaseline(baselineCycle ? baselineCycle.arrays.P : null);
  chartP.setPeak({ x: cycle.peakTh, y: cycle.peakP, label: 'peak ' + fmt(cycle.peakP, 1) + ' bar @ ' + cycle.peakTh + '°' });
  chartP.setNote('spark ' + Math.round(360 - cycle.cfg.advance) + '° BTDC' + (cycle.knock ? '  ·  KNOCK' : ''));

  chartT.setData('tg', A.Tg);
  chartT.setData('ti', A.Ti);
  chartT.setBaseline(baselineCycle ? baselineCycle.arrays.Tg : null);
  chartT.setMean(cycle.torqueMean);
  chartT.setPeak(null);
  chartT.setNote('piston mass ' + 0.62 + ' kg · inertia grows with rpm²');

  chartV.setData('li', A.li);
  chartV.setData('le', A.le);
  chartV.setBaseline(null);
  chartV.setPeak(null);
  chartV.setNote('lift ' + Mmax(A.li) + ' / ' + Mmax(A.le) + ' mm');

  const loop = A.V.map((v, i) => ({ x: v, y: A.P[i] }));
  chartPV.setData('loop', loop);
  chartPV.setBaseline(baselineCycle ? baselineCycle.arrays.V.map((v, i) => ({ x: v, y: baselineCycle.arrays.P[i] })) : null);
  chartPV.setPeak(null);
  chartPV.setNote('net IMEP ' + fmt(cycle.IMEPbar, 1) + ' bar · gross ' + fmt(cycle.grossIMEP, 1) + ' bar' +
    (baselineCycle ? '  ·  stock: ' + fmt(baselineCycle.IMEPbar, 1) : ''));

  [chartP, chartT, chartV, chartPV].forEach(c => c.rebuild());
}
function Mmax(a) { let m = 0; for (const v of a) if (v > m) m = v; return m.toFixed(1); }

function setPlayhead(th, pt) {
  chartP.setPlayhead(th, pt);
  chartT.setPlayhead(th, pt);
  chartV.setPlayhead(th, pt);
  chartPV.setPlayhead(th, pt);
}

function watchResize() {
  let t = null;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => [chartP, chartT, chartV, chartPV].forEach(c => c.rebuild()), 150);
  });
}

global.Charts = { init, setCycles, setPlayhead, watchResize };
})(typeof window !== 'undefined' ? window : globalThis);
