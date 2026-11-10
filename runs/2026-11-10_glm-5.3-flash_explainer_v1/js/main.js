/* =============================================================
   main.js — state owner and conductor.
   One clock (crank angle), one parameter object, one loop.
   Nothing else in the app integrates time or caches state.
   ============================================================= */
(function () {
'use strict';
const M = EngineModel;
const $ = id => document.getElementById(id);
const DURS = [2, 4, 8, 16, 32];
const PHASE_NAMES = ['INTAKE', 'COMPRESSION', 'POWER', 'EXHAUST'];

const STOCK = {
  throttle: 72, advance: 12, cr: 10.5, rpm: 2200,
  faults: { spark: false, exhaustSpring: false, intakeSpring: false, rings: false }
};
function cloneCfg(c) {
  return { throttle: c.throttle, advance: c.advance, cr: c.cr, rpm: c.rpm,
    faults: Object.assign({}, c.faults) };
}
function cfgEquals(a, b) {
  return a.throttle === b.throttle && a.advance === b.advance && a.cr === b.cr &&
    a.rpm === b.rpm && Object.keys(a.faults).every(k => !!a.faults[k] === !!b.faults[k]);
}

let reducedMotion = false;
try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

const state = {
  theta: 40,
  playing: !reducedMotion,
  speedIdx: 2,
  cfg: cloneCfg(STOCK),
  compare: false,
  labels: true,
  exploded: false,
  explodeAmt: 0,
  selected: null,
  scrubbing: false,
  wasPlaying: false
};

/* restore prefs (guarded — storage may be unavailable) */
try {
  const raw = localStorage.getItem('engine-explainer-v1');
  if (raw) {
    const p = JSON.parse(raw);
    if (p && typeof p === 'object') {
      if (Number.isInteger(p.speedIdx) && p.speedIdx >= 0 && p.speedIdx < DURS.length) state.speedIdx = p.speedIdx;
      if (typeof p.labels === 'boolean') state.labels = p.labels;
      if (typeof p.exploded === 'boolean') state.exploded = p.exploded;
      if (p.cfg) {
        const c = cloneCfg(STOCK);
        ['throttle', 'advance', 'cr', 'rpm'].forEach(k => { if (typeof p.cfg[k] === 'number') c[k] = p.cfg[k]; });
        if (p.cfg.faults) Object.keys(c.faults).forEach(k => { c.faults[k] = !!p.cfg.faults[k]; });
        state.cfg = c;
      }
    }
  }
} catch (e) { /* private mode etc. — run on defaults */ }

/* ---------------- core data ---------------- */
const stockCycle = M.build(STOCK);
let curCycle = M.build(state.cfg);

/* ---------------- build scene ---------------- */
const svg = $('engine');
const scene = window.Scene.build(svg);
const reduced = () => reducedMotion;

/* ---------------- charts ---------------- */
window.Charts.init({
  onScrub: th => { setTheta(th); if (state.playing) { state.playing = false; syncPlayBtn(); } }
});
window.Charts.setCycles(curCycle, null);
window.Charts.watchResize();

/* ---------------- transport ---------------- */
const btnPlay = $('btnPlay');
function syncPlayBtn() {
  btnPlay.setAttribute('aria-pressed', String(state.playing));
  btnPlay.querySelector('.icoPlay').hidden = state.playing;
  btnPlay.querySelector('.icoPause').hidden = !state.playing;
  btnPlay.setAttribute('aria-label', state.playing ? 'Pause (Space)' : 'Play (Space)');
}
btnPlay.addEventListener('click', () => { state.playing = !state.playing; syncPlayBtn(); savePrefs(); });
$('btnStart').addEventListener('click', () => setTheta(0));
$('btnFwd').addEventListener('click', () => setTheta(state.theta + 1));
$('btnBack').addEventListener('click', () => setTheta(state.theta - 1));

function setSpeed(i) {
  state.speedIdx = Math.max(0, Math.min(DURS.length - 1, i));
  updateSpeedUI();
  savePrefs();
}
$('speedUp').addEventListener('click', () => setSpeed(state.speedIdx - 1));
$('speedDown').addEventListener('click', () => setSpeed(state.speedIdx + 1));
function updateSpeedUI() {
  const d = DURS[state.speedIdx];
  $('speedRead').textContent = d + ' s / cycle';
  const factor = Math.round(d * state.cfg.rpm / 120);
  $('slowmo').textContent = '≈ 1/' + factor + ' × real time';
  $('slowmoBadge').innerHTML = 'PLAYBACK <b>1/' + factor + '×</b> REAL SPEED · ' +
    f0(state.cfg.rpm) + ' RPM · ' + d + ' S/CYCLE';
}

/* ---------------- timeline ---------------- */
const track = $('track');
const playhead = $('playhead');
function trackScrub(clientX) {
  const r = track.getBoundingClientRect();
  const fx = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  setTheta(fx * 719.9);
}
track.addEventListener('pointerdown', e => {
  track.setPointerCapture && track.setPointerCapture(e.pointerId);
  state.scrubbing = true; state.wasPlaying = state.playing; state.playing = false; syncPlayBtn();
  trackScrub(e.clientX);
});
track.addEventListener('pointermove', e => { if (state.scrubbing) trackScrub(e.clientX); });
window.addEventListener('pointerup', () => {
  if (state.scrubbing) { state.scrubbing = false; state.playing = state.wasPlaying; syncPlayBtn(); }
});
track.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') { setTheta(state.theta - (e.shiftKey ? 10 : 1)); e.preventDefault(); }
  if (e.key === 'ArrowRight') { setTheta(state.theta + (e.shiftKey ? 10 : 1)); e.preventDefault(); }
  if (e.key === 'Home') { setTheta(0); e.preventDefault(); }
  if (e.key === 'End') { setTheta(719.9); e.preventDefault(); }
});
document.querySelectorAll('.flag').forEach(b => {
  b.addEventListener('click', () => setTheta(parseFloat(b.dataset.jump)));
});
document.querySelectorAll('.band').forEach(b => {
  b.addEventListener('click', () => setTheta(parseFloat(b.dataset.jump)));
});
function updateSparkFlag() {
  const sp = 360 - state.cfg.advance;
  const f = $('flagSpark');
  f.style.left = (sp / 720 * 100).toFixed(2) + '%';
  f.dataset.jump = sp;
  f.title = 'Spark ' + f0(state.cfg.advance) + '° BTDC';
}

/* ---------------- bench ---------------- */
function bindSlider(id, out, key, fmt) {
  const el = $(id);
  el.value = state.cfg[key];
  $(out).textContent = fmt(state.cfg[key]);
  el.addEventListener('input', () => {
    state.cfg[key] = parseFloat(el.value);
    $(out).textContent = fmt(state.cfg[key]);
    onCfgChanged();
    if (key === 'rpm') updateSpeedUI();
    if (key === 'advance') updateSparkFlag();
  });
}
bindSlider('sThrottle', 'oThrottle', 'throttle', v => f0(v) + ' %');
bindSlider('sAdvance', 'oAdvance', 'advance', v => f0(v) + '° BTDC');
bindSlider('sCr', 'oCr', 'cr', v => v.toFixed(1) + ' : 1');
bindSlider('sRpm', 'oRpm', 'rpm', v => f0(v) + ' rpm');

const FAULTS = [
  ['fSpark', 'spark', 'No spark'],
  ['fExhSpring', 'exhaustSpring', 'Exhaust spring'],
  ['fIntSpring', 'intakeSpring', 'Intake spring'],
  ['fRings', 'rings', 'Worn rings']
];
FAULTS.forEach(([id, key]) => {
  const el = $(id);
  el.setAttribute('aria-pressed', String(!!state.cfg.faults[key]));
  el.addEventListener('click', () => {
    state.cfg.faults[key] = !state.cfg.faults[key];
    el.setAttribute('aria-pressed', String(!!state.cfg.faults[key]));
    onCfgChanged();
    rebuildInspector();
  });
});
$('btnReset').addEventListener('click', () => {
  state.cfg = cloneCfg(STOCK);
  ['sThrottle', 'sAdvance', 'sCr', 'sRpm'].forEach((id, i) => {
    const keys = ['throttle', 'advance', 'cr', 'rpm'];
    $(id).value = STOCK[keys[i]];
  });
  $('oThrottle').textContent = f0(STOCK.throttle) + ' %';
  $('oAdvance').textContent = f0(STOCK.advance) + '° BTDC';
  $('oCr').textContent = STOCK.cr.toFixed(1) + ' : 1';
  $('oRpm').textContent = f0(STOCK.rpm) + ' rpm';
  FAULTS.forEach(([id, key]) => $(id).setAttribute('aria-pressed', 'false'));
  state.compare = false;
  $('btnCompare').setAttribute('aria-pressed', 'false');
  updateSparkFlag();
  updateSpeedUI();
  onCfgChanged();
  rebuildInspector();
  savePrefs();
});
$('btnCompare').addEventListener('click', () => {
  state.compare = !state.compare;
  $('btnCompare').setAttribute('aria-pressed', String(state.compare));
  refreshCharts();
  savePrefs();
});

function deviates() { return !cfgEquals(state.cfg, STOCK); }
function onCfgChanged() {
  curCycle = M.build(state.cfg);
  if (deviates() && !state.compare) {
    state.compare = true;
    $('btnCompare').setAttribute('aria-pressed', 'true');
  }
  if (!deviates()) {
    state.compare = false;
    $('btnCompare').setAttribute('aria-pressed', 'false');
  }
  refreshCharts();
  updateDeviations();
  savePrefs();
}
function refreshCharts() {
  window.Charts.setCycles(curCycle, state.compare && deviates() ? stockCycle : null);
}
function updateDeviations() {
  const box = $('deviations');
  const chips = [];
  if (state.cfg.throttle !== STOCK.throttle) chips.push('throttle ' + f0(STOCK.throttle) + '→' + f0(state.cfg.throttle) + ' %');
  if (state.cfg.advance !== STOCK.advance) chips.push('advance ' + f0(STOCK.advance) + '→' + f0(state.cfg.advance) + '°');
  if (state.cfg.cr !== STOCK.cr) chips.push('CR ' + STOCK.cr.toFixed(1) + '→' + state.cfg.cr.toFixed(1));
  if (state.cfg.rpm !== STOCK.rpm) chips.push('rpm ' + f0(STOCK.rpm) + '→' + f0(state.cfg.rpm));
  const faults = Object.keys(state.cfg.faults).filter(k => state.cfg.faults[k]);
  if (faults.length) chips.push('fault: ' + faults.join(', '));
  box.innerHTML = chips.map(c => '<span class="dev">' + c + '</span>').join('');
}

/* ---------------- header toggles ---------------- */
$('btnLabels').addEventListener('click', () => setLabels(!state.labels));
function setLabels(v) {
  state.labels = v;
  $('btnLabels').setAttribute('aria-pressed', String(v));
  document.querySelectorAll('#engine .lbl').forEach(g => g.style.display = v ? '' : 'none');
  savePrefs();
}
$('btnExplode').addEventListener('click', () => {
  state.exploded = !state.exploded;
  $('btnExplode').setAttribute('aria-pressed', String(state.exploded));
  savePrefs();
});

/* dialogs */
$('btnModel').addEventListener('click', () => $('dlgModel').showModal());
$('btnKeys').addEventListener('click', () => $('dlgKeys').showModal());
document.querySelectorAll('dialog [data-close]').forEach(b => {
  b.addEventListener('click', () => b.closest('dialog').close());
});

/* ---------------- component selection ---------------- */
const ENG = () => svg;
function selectPart(id) {
  state.selected = id;
  svg.setAttribute('data-dim', id ? '1' : '0');
  svg.querySelectorAll('.part').forEach(p => p.classList.toggle('sel', p.getAttribute('data-part') === id));
  svg.querySelectorAll('.lbl').forEach(l => l.classList.toggle('selLbl', l.getAttribute('data-for') === id));
  rebuildInspector();
}
function clearSelection() { selectPart(null); }

Object.keys(window.Parts.PARTS).forEach(id => {
  const p = scene.parts[id];
  if (!p || !p.hit) return;
  const meta = window.Parts.PARTS[id];
  [p.hit].forEach(el => {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', meta.name + ' — inspect');
    el.addEventListener('click', () => selectPart(id));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { selectPart(id); e.preventDefault(); e.stopPropagation(); }
    });
  });
});
/* the visible groups themselves are also clickable */
svg.querySelectorAll('.part[data-part]').forEach(g => {
  const id = g.getAttribute('data-part');
  if (!window.Parts.PARTS[id]) return;
  g.addEventListener('click', () => selectPart(id));
});
svg.querySelectorAll('.lbl').forEach(l => {
  l.setAttribute('tabindex', '0');
  l.setAttribute('role', 'button');
  const id = l.getAttribute('data-for');
  const meta = window.Parts.PARTS[id];
  l.setAttribute('aria-label', (meta ? meta.name : id) + ' — inspect');
  l.addEventListener('click', () => selectPart(id));
  l.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { selectPart(id); e.preventDefault(); e.stopPropagation(); }
  });
});

/* ---------------- inspector ---------------- */
const inspBody = $('inspBody');
let inspRefs = null;   // {rows: [[tdLabel, tdValue]...], sayEl}

function rebuildInspector() {
  const id = state.selected;
  if (id && window.Parts.PARTS[id]) {
    const meta = window.Parts.PARTS[id];
    inspBody.innerHTML =
      '<h3 class="inspTitle"></h3><span class="inspTag"></span>' +
      '<p class="inspSpec"></p><p class="inspBody"></p>' +
      '<table class="inspRows"><tbody></tbody></table>' +
      '<p class="inspSay"></p>';
    inspBody.querySelector('.inspTitle').textContent = meta.name;
    inspBody.querySelector('.inspTag').textContent = meta.tag;
    inspBody.querySelector('.inspSpec').textContent = meta.spec;
    inspBody.querySelector('.inspBody').textContent = meta.body.replace(/\s+/g, ' ').trim();
  } else if (anyFault()) {
    const d = window.Parts.diagnosis(state.cfg.faults, curCycle, stockCycle);
    inspBody.innerHTML =
      '<h3 class="inspTitle inspDiagTitle"></h3><span class="inspTag" style="border-color:rgba(239,111,76,.5);color:#ffb08c">fault active</span>' +
      '<table class="inspRows"><tbody></tbody></table>' +
      '<p class="inspSay inspDiag"></p>';
    inspBody.querySelector('.inspTitle').textContent = d.title;
  } else {
    inspBody.innerHTML =
      '<h3 class="inspTitle">The cycle, right now</h3><span class="inspTag">nothing selected</span>' +
      '<p class="inspHint">Click any part of the drawing — piston, valves, plug, ports — to see precisely what it is doing at this crank angle. Hover any chart to scrub.</p>' +
      '<table class="inspRows"><tbody></tbody></table>' +
      '<p class="inspSay"></p>';
  }
  const tbody = inspBody.querySelector('tbody');
  inspRefs = {
    tbody,
    rows: [],
    sayEl: inspBody.querySelector('.inspSay'),
    titleEl: inspBody.querySelector('.inspTitle')
  };
  updateInspector();
}
function setRows(rowDefs) {
  const tbody = inspRefs.tbody;
  while (inspRefs.rows.length < rowDefs.length) {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    const td2 = document.createElement('td');
    tr.appendChild(td1); tr.appendChild(td2);
    tbody.appendChild(tr);
    inspRefs.rows.push([td1, td2]);
  }
  while (inspRefs.rows.length > rowDefs.length) {
    tbody.removeChild(tbody.lastChild);
    inspRefs.rows.pop();
  }
  rowDefs.forEach((r, i) => {
    if (inspRefs.rows[i][0].textContent !== r[0]) inspRefs.rows[i][0].textContent = r[0];
    if (inspRefs.rows[i][1].textContent !== r[1]) inspRefs.rows[i][1].textContent = r[1];
  });
}
function anyFault() { return Object.keys(state.cfg.faults).some(k => state.cfg.faults[k]); }

function updateInspector() {
  if (!inspRefs) return;
  const ctx = inspectorCtx();
  if (state.selected && window.Parts.PARTS[state.selected]) {
    const dyn = window.Parts.PARTS[state.selected].dyn(lastPt, ctx);
    setRows(dyn.rows);
    if (inspRefs.sayEl.textContent !== dyn.say) inspRefs.sayEl.textContent = dyn.say.replace(/\s+/g, ' ').trim();
  } else if (anyFault()) {
    const d = window.Parts.diagnosis(state.cfg.faults, curCycle, stockCycle);
    setRows(d.rows);
    if (inspRefs.sayEl.textContent !== d.say) inspRefs.sayEl.textContent = d.say.replace(/\s+/g, ' ').trim();
  } else {
    const th = lastPt.th, e = M.nextEvent(th, state.cfg);
    const toNext = (e.th - th + 720) % 720;
    setRows([
      ['stroke', PHASE_NAMES[lastPt.phase]],
      ['crank angle', f1(th) + '°'],
      ['next event', e.id + ' in ' + f1(toNext) + '°'],
      ['pressure', f1(lastPt.P) + ' bar'],
      ['volume', f0(lastPt.Vcc) + ' cm³'],
      ['burned', lastPt.phase === 2 || lastPt.phase === 3 ? f0(lastPt.xb * 100) + ' %' : '—']
    ]);
    const says = [
      'Intake: the falling piston fills the cylinder to manifold pressure while the intake valve sweeps from open toward its seat.',
      'Compression: both valves shut, volume shrinking, pressure climbing as V^1.32 toward the burn.',
      'Power: the burn is over within ~40° and the trapped energy pushes the piston down — watch the torque spike.',
      'Exhaust: the spent charge is swept out; blow-down has already emptied most of it.'
    ];
    const say = says[lastPt.phase] + ' Try clicking the piston or the spark plug.';
    if (inspRefs.sayEl.textContent !== say) inspRefs.sayEl.textContent = say;
  }
}
function inspectorCtx() {
  const fi = -M.CFG.M_REC * lastPt.a;
  const Pman = curCycle.Pman;
  const fIn = (lastPt.li > 0.3) ? M.clamp((Pman - lastPt.P) * 5 + 0.35, -1, 1) * Math.min(1, lastPt.li / 6) : 0;
  const fEx = (lastPt.le > 0.3) ? M.clamp((lastPt.P - M.P_EXH) * 5 + 0.1, -1, 1) * Math.min(1, lastPt.le / 5) : 0;
  return {
    cycle: curCycle, base: stockCycle, cfg: state.cfg, faults: state.cfg.faults,
    fi, fnet: lastPt.Fg + fi,
    flows: { in: fIn, ex: fEx }
  };
}

/* ---------------- readouts ---------------- */
const ro = {
  P: $('roP'), V: $('roV'), F: $('roF'), T: $('roT'),
  Tm: $('roTm'), Power: $('roPower'), Vp: $('roVp'),
  Lv: $('roLv'), IMEP: $('roIMEP'), Peak: $('roPeak')
};
function updateReadouts() {
  ro.P.textContent = f1(lastPt.P);
  ro.V.textContent = f0(lastPt.Vcc);
  ro.F.textContent = f1(Math.abs(lastPt.Fg) / 1000);
  ro.T.textContent = f0(lastPt.Tg + lastPt.Ti);
  ro.Tm.textContent = f1(curCycle.torqueMean);
  ro.Power.textContent = 'N·m · ' + f1(curCycle.powerKw) + ' kW';
  ro.Vp.textContent = f2(Math.abs(lastPt.v));
  ro.Lv.textContent = f2(lastPt.li) + ' / ' + f2(lastPt.le);
  ro.IMEP.textContent = f2(curCycle.IMEPbar);
  ro.Peak.textContent = 'bar · peak ' + f1(curCycle.peakP) + ' @ ' + f0(curCycle.peakTh) + '°' + (curCycle.knock ? ' · KNOCK' : '');
}

/* ---------------- per-frame render ---------------- */
let lastPt = M.point(state.theta, state.cfg, curCycle.pre, curCycle.peakInfo);
function setTheta(th) {
  state.theta = ((th % 720) + 720) % 720;
}
const angleDeg = $('angleDeg'), anglePhase = $('anglePhase');

function render() {
  lastPt = M.point(state.theta, state.cfg, curCycle.pre, curCycle.peakInfo);
  scene.render(lastPt, {
    faults: state.cfg.faults,
    explodeAmt: state.explodeAmt,
    cycle: curCycle,
    cfg: state.cfg,
    reducedMotion: reducedMotion
  });
  window.Charts.setPlayhead(state.theta, lastPt);
  updateReadouts();
  updateInspector();
  playhead.style.left = (state.theta / 720 * 100).toFixed(2) + '%';
  angleDeg.textContent = f1(state.theta) + '°';
  anglePhase.textContent = PHASE_NAMES[lastPt.phase];
  track.setAttribute('aria-valuenow', String(Math.round(state.theta)));
  track.setAttribute('aria-valuetext', Math.round(state.theta) + '° ' + PHASE_NAMES[lastPt.phase].toLowerCase());
}

/* ---------------- keyboard ---------------- */
document.addEventListener('keydown', e => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
  if ($('dlgModel').open || $('dlgKeys').open) return;
  switch (e.key) {
    case ' ': state.playing = !state.playing; syncPlayBtn(); e.preventDefault(); break;
    case 'ArrowLeft': setTheta(state.theta - (e.shiftKey ? 10 : 1)); e.preventDefault(); break;
    case 'ArrowRight': setTheta(state.theta + (e.shiftKey ? 10 : 1)); e.preventDefault(); break;
    case 'Home': setTheta(0); e.preventDefault(); break;
    case 'End': setTheta(719.9); e.preventDefault(); break;
    case '1': setTheta(0); break;
    case '2': setTheta(180); break;
    case '3': setTheta(360); break;
    case '4': setTheta(540); break;
    case 'l': case 'L': setLabels(!state.labels); break;
    case 'e': case 'E':
      state.exploded = !state.exploded;
      $('btnExplode').setAttribute('aria-pressed', String(state.exploded)); break;
    case 'b': case 'B': $('btnCompare').click(); break;
    case 'Escape': clearSelection(); break;
    case '-': case '_': setSpeed(state.speedIdx + 1); break;
    case '+': case '=': setSpeed(state.speedIdx - 1); break;
  }
});

/* ---------------- prefs ---------------- */
let saveT = null;
function savePrefs() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem('engine-explainer-v1', JSON.stringify({
      speedIdx: state.speedIdx, labels: state.labels, exploded: state.exploded, cfg: state.cfg
    })); } catch (e) { /* unavailable — fine */ }
  }, 300);
}

/* ---------------- main loop ----------------
   rAF-driven when visible; a self-healing timer fallback keeps the
   single clock alive when the tab is hidden (browsers pause rAF
   there, timers clamp to ~1 Hz — dt clamping prevents jumps). */
let last = performance.now();
let lastFrame = performance.now();
function frame(now) {
  lastFrame = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (state.playing && !state.scrubbing) {
    state.theta = (state.theta + dt * 720 / DURS[state.speedIdx]) % 720;
  }
  const target = state.exploded ? 1 : 0;
  if (reducedMotion) state.explodeAmt = target;
  else {
    state.explodeAmt += (target - state.explodeAmt) * Math.min(1, dt * 6);
    if (Math.abs(target - state.explodeAmt) < 0.004) state.explodeAmt = target;
  }
  render();
  requestAnimationFrame(frame);
  setTimeout(guardTick, 200);
}
function guardTick() {
  /* if a real rAF ran recently this chain deliberately dies;
     in a hidden tab (rAF paused) it becomes the ~1 Hz fallback clock */
  if (performance.now() - lastFrame > 250) frame(performance.now());
}

/* ---------------- init ---------------- */
syncPlayBtn();
updateSpeedUI();
updateSparkFlag();
updateDeviations();
setLabels(state.labels);
$('btnExplode').setAttribute('aria-pressed', String(state.exploded));
$('btnCompare').setAttribute('aria-pressed', 'false');
rebuildInspector();
refreshCharts();
requestAnimationFrame(frame);
setTimeout(guardTick, 300);   /* seed the hidden-tab fallback clock */

function f0(x) { return Math.round(x).toString(); }
function f1(x) { return x.toFixed(1); }
function f2(x) { return x.toFixed(2); }
})();
