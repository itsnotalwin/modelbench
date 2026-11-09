/* ============================================================
   HIVEMOTHER — main: states, input, HUD, persistence, loop.
   ============================================================ */
var HM = window.HM = window.HM || {};

HM.main = (function () {
  var W = HM.W, H = HM.H;
  var D = function (id) { return document.getElementById(id); };

  var canvas, ctx, stage;
  var scale = 1, dpr = 1, rect = null;

  var state = 'title';   // title | play | dusk | night | over | win
  var paused = false;
  var helpOpen = false, helpReturn = 'title';
  var duskT = 0, nightT = 0, nightAuto = 0;
  var hitStop = 0;

  /* ---------------- persistence ---------------- */
  var SAVE_KEY = 'hivemother_v1';
  var DEFAULTS = { bestDay: 0, bestHoney: 0, runs: 0, muted: false, motion: 'auto' };
  var save = loadSave();
  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      var d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return Object.assign({}, DEFAULTS);
      var out = Object.assign({}, DEFAULTS);
      for (var k in DEFAULTS) if (k in d) out[k] = d[k];
      return out;
    } catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable: settings stay for this session only */ } }

  var mqRM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function motionReduced() {
    return save.motion === 'reduce' || (save.motion === 'auto' && mqRM.matches);
  }
  function applyMotion() { HM.fx.setMotion(!motionReduced()); }

  /* ---------------- dom refs ---------------- */
  var el = {};
  function grab() {
    var ids = ['hud','hudDayNum','hudPips','sunFill','sunDot','quotaBox','quotaFill','quotaNow','quotaGoal','quotaLabel',
      'honeyVal','beeVal','btnHelp','btnSound','btnPause','chipPulse','chipDecoy','pulseRing','decoyRing','decoyCost',
      'toast','touchPulse','touchDecoy','banner','bannerTitle','bannerSub',
      'ovTitle','ovPause','ovHelp','ovNight','ovEnd',
      'btnStart','titleBest','btnSoundT','btnMotionT','btnReset',
      'btnResume','btnPRestart','btnPQuit','btnSoundP','btnMotionP',
      'btnHelpClose','nightSub','ngPollen','ngSwarm','ngHatch','nightPips','btnDawn',
      'eTitle','eSub','endGrid','retryLabel','btnRetry','btnEndTitle'];
    for (var i = 0; i < ids.length; i++) el[ids[i]] = D(ids[i]);
  }

  /* ---------------- overlays ---------------- */
  function showOverlay(name) {
    var map = { title: el.ovTitle, pause: el.ovPause, help: el.ovHelp, night: el.ovNight, end: el.ovEnd };
    for (var k in map) {
      var o = map[k];
      if (!o) continue;
      if (k === name) { o.hidden = false; o.classList.add('show'); }
      else { o.classList.remove('show'); o.hidden = true; }
    }
  }

  /* ---------------- toast & banner ---------------- */
  var toastTimer = 0;
  function toast(msg, dur) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('show'); }, dur || 3200);
  }
  var bannerTimer = 0;
  function banner(t, sub, dur) {
    el.bannerTitle.textContent = t;
    el.bannerSub.textContent = sub || '';
    el.banner.hidden = false;
    el.banner.style.animation = 'none';
    void el.banner.offsetWidth;
    el.banner.style.animation = '';
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { el.banner.hidden = true; }, dur || 2400);
  }

  /* ---------------- pips ---------------- */
  function buildPips(container) {
    container.innerHTML = '';
    for (var i = 0; i < 7; i++) {
      var n = document.createElement('i');
      container.appendChild(n);
    }
  }
  function updPips(container, day, doneUpTo) {
    var kids = container.children;
    for (var i = 0; i < kids.length; i++) {
      kids[i].className = i < doneUpTo ? 'done' : (i === day - 1 ? 'now' : '');
    }
  }

  /* ---------------- season flow ---------------- */
  function toTitle() {
    state = 'title'; paused = false; helpOpen = false;
    HM.sim.start({ attract: true, seed: 0xA11CE });
    HM.render.setNight(0);
    el.hud.hidden = true;
    showOverlay('title');
    refreshTitle();
    HM.audio.stopPad();
  }

  function refreshTitle() {
    if (save.bestDay > 0 || save.bestHoney > 0) {
      el.titleBest.innerHTML = 'Best season: <b>Day ' + save.bestDay + '</b> · <b>' + save.bestHoney + '</b> pollen banked';
      el.btnReset.hidden = false;
    } else {
      el.titleBest.textContent = 'No seasons kept yet — the meadow waits.';
      el.btnReset.hidden = true;
    }
    el.btnReset.classList.remove('arm');
    el.btnReset.textContent = 'Reset best season';
  }

  function startRun() {
    save.runs++; persist();
    state = 'play'; paused = false; helpOpen = false;
    var seed = ((Date.now() >>> 0) ^ (save.runs * 2654435761 >>> 0)) >>> 0;
    HM.world.init(seed);
    HM.sim.start({ attract: false, seed: seed });
    resetHints();
    HM.render.setNight(0);
    el.hud.hidden = false;
    showOverlay(null);
    el.banner.hidden = false;
    banner('Day 1', 'Bring home ' + HM.sim.getState().quota + ' pollen before dusk');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    HM.audio.resume();
    HM.audio.startPad();
    HM.audio.dayStart();
  }

  function nextDay() {
    var S = HM.sim.getState();
    var hatched = HM.sim.hatchMorning();
    var count = S.bees.length;
    HM.sim.start({ continue: true, seed: S.runSeed, day: S.day + 1, beeCount: count });
    state = 'play'; paused = false;
    HM.render.setNight(0);
    showOverlay(null);
    var q = HM.sim.getState().quota;
    el.banner.hidden = false;
    banner('Day ' + HM.sim.getState().day, 'Bring home ' + q + ' pollen before dusk');
    if (hatched > 0) toast(hatched + ' workers hatched at dawn.', 2600);
    HM.audio.dayStart();
  }

  function beginDusk() {
    state = 'dusk'; duskT = 0;
    HM.sim.beginDusk();
  }

  function finishDusk() {
    var S = HM.sim.getState();
    if (S.dayPollen < S.quota) { gameOver('starve'); return; }
    if (S.day >= 7) { winGame(); return; }
    // night interlude
    state = 'night'; nightT = 0; nightAuto = 3.4;
    el.nightSub.textContent = 'Day ' + S.day + ' kept. The hive hums in the dark.';
    el.ngPollen.textContent = S.dayPollen;
    el.ngSwarm.textContent = S.bees.length;
    el.hud.hidden = false;
    showOverlay('night');
    updPips(el.nightPips, S.day + 1, S.day);
    HM.audio.show();
  }

  function endStats(S) {
    el.endGrid.innerHTML = '';
    var rows = [
      ['Days kept', S.day + (state === 'win' ? ' / 7' : '')],
      ['Pollen banked', S.honeyTotal],
      ['Bees lost', S.beesLost],
      ['Wasps scattered', S.waspsScattered]
    ];
    for (var i = 0; i < rows.length; i++) {
      var d = document.createElement('div');
      d.className = 'ng';
      var v = document.createElement('span'); v.className = 'ng-v'; v.textContent = rows[i][1];
      var k = document.createElement('span'); k.className = 'ng-k'; k.textContent = rows[i][0];
      d.appendChild(v); d.appendChild(k);
      el.endGrid.appendChild(d);
    }
  }

  function gameOver(reason) {
    state = 'over'; paused = false;
    var S = HM.sim.getState();
    save.bestDay = Math.max(save.bestDay, S.day);
    save.bestHoney = Math.max(save.bestHoney, S.honeyTotal);
    persist();
    el.hud.hidden = true;
    showOverlay('end');
    endStats(S);
    if (reason === 'scatter') {
      el.eTitle.textContent = 'The swarm is scattered';
      el.eSub.textContent = 'Every worker is gone and the meadow falls silent. The queen stands alone in the clover.';
    } else {
      el.eTitle.textContent = 'The comb sits empty';
      el.eSub.textContent = 'Dusk fell on day ' + S.day + ' with ' + S.dayPollen + ' of ' + S.quota + ' pollen banked. The hive cannot winter like this.';
    }
    el.retryLabel.textContent = 'Try again';
    HM.audio.stopPad();
    HM.audio.lose();
  }

  function winGame() {
    state = 'win'; paused = false;
    var S = HM.sim.getState();
    save.bestDay = 7;
    save.bestHoney = Math.max(save.bestHoney, S.honeyTotal);
    persist();
    el.hud.hidden = true;
    showOverlay('end');
    endStats(S);
    el.eTitle.textContent = 'Winter is warm';
    el.eSub.textContent = 'Seven days kept. The comb is full, the swarm is strong, and the meadow sleeps under frost.';
    el.retryLabel.textContent = 'Another season';
    HM.audio.win();
    HM.fx.doShake(0, 0);
    for (var i = 0; i < 40; i++) {
      HM.fx.spawn({
        kind: 'dot', x: HM.world.hive.x + (Math.random() - 0.5) * 240, y: HM.world.hive.y - Math.random() * 60,
        vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 70,
        size: 2 + Math.random() * 2.6, life: 1.6 + Math.random(), col: '#ffd166', grav: -14, drag: 0.6, add: true, prio: true
      });
    }
  }

  /* ---------------- pause / help ---------------- */
  function setPaused(p) {
    if (state !== 'play' && state !== 'dusk') return;
    paused = p;
    showOverlay(p ? 'pause' : null);
    syncToggles();
    if (!p && document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function openHelp(from) {
    helpReturn = from; helpOpen = true;
    showOverlay('help');
  }
  function closeHelp() {
    helpOpen = false;
    if (helpReturn === 'play' && (state === 'play' || state === 'dusk')) { paused = false; showOverlay(null); }
    else if (helpReturn === 'pause') showOverlay('pause');
    else showOverlay('title');
  }

  /* ---------------- toggles ---------------- */
  function syncToggles() {
    var on = !save.muted;
    [el.btnSound, el.btnSoundT, el.btnSoundP].forEach(function (b) { if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    var rm = motionReduced();
    [el.btnMotionT, el.btnMotionP].forEach(function (b) { if (b) b.setAttribute('aria-pressed', rm ? 'true' : 'false'); });
    var lab = rm ? 'Reduced motion: On' : 'Reduced motion: Off';
    if (el.btnMotionT) el.btnMotionT.textContent = lab;
    if (el.btnMotionP) el.btnMotionP.textContent = lab;
  }
  function toggleMute() {
    save.muted = !save.muted;
    persist();
    HM.audio.setMuted(save.muted);
    syncToggles();
    HM.audio.click();
  }
  function toggleMotion() {
    save.motion = motionReduced() ? 'auto' : 'reduce';
    persist();
    applyMotion();
    syncToggles();
    HM.audio.click();
  }

  /* ---------------- input ---------------- */
  var KEYS = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down'
  };
  function onKeyDown(e) {
    HM.audio.resume();
    var c = e.code;
    var inPlay = (state === 'play' || state === 'dusk') && !paused && !helpOpen;
    if (inPlay && (c === 'Space' || KEYS[c])) e.preventDefault();
    if (e.repeat) return;
    if (KEYS[c]) {
      var S = HM.sim.getState();
      if (S) { S.queen.keys[KEYS[c]] = true; S.queen.mode = 'keys'; }
    }
    switch (c) {
      case 'Space':
        if (inPlay) HM.sim.doPulse();
        break;
      case 'KeyE':
        if (inPlay) tryDecoy();
        break;
      case 'KeyM':
        toggleMute();
        break;
      case 'KeyH':
        if (helpOpen) closeHelp();
        else if (state === 'play' || state === 'dusk') { paused = true; openHelp('play'); }
        else if (state === 'title') openHelp('title');
        break;
      case 'KeyP':
        if (inPlay) setPaused(true);
        else if (paused && !helpOpen) setPaused(false);
        break;
      case 'Escape':
        if (helpOpen) closeHelp();
        else if (paused) setPaused(false);
        else if (state === 'play' || state === 'dusk') setPaused(true);
        break;
      case 'Enter':
        if (helpOpen) { closeHelp(); break; }
        if (state === 'title') startRun();
        else if (state === 'night') { clearTimeout(nightAuto); nextDay(); }
        else if (state === 'over' || state === 'win') startRun();
        else if (paused) setPaused(false);
        break;
      case 'KeyR':
        if (state === 'over' || state === 'win') startRun();
        break;
    }
  }
  function onKeyUp(e) {
    var S = HM.sim.getState();
    if (S && KEYS[e.code]) S.queen.keys[KEYS[e.code]] = false;
  }

  function toWorld(e) {
    if (!rect) return null;
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  }
  var touchMode = false;
  function onPointerMove(e) {
    var p = toWorld(e);
    if (!p) return;
    var S = HM.sim.getState();
    if (!S) return;
    var ty = p.y;
    if (e.pointerType === 'touch') { touchMode = true; showTouchButtons(); ty = ty - 78; }
    S.queen.aimX = HM.clamp(p.x, 20, W - 20);
    S.queen.aimY = HM.clamp(ty, 130, H - 30);
    S.queen.mode = 'pointer';
    HM.render.aim.x = p.x; HM.render.aim.y = p.y;
    HM.render.aim.on = e.pointerType !== 'touch';
  }
  function onPointerDown(e) {
    HM.audio.resume();
    if (e.target !== canvas) return; // HUD buttons & panels handle themselves
    var p = toWorld(e);
    var S = HM.sim.getState();
    if (p && S) {
      if (e.pointerType === 'touch') {
        touchMode = true; showTouchButtons();
        S.queen.aimX = HM.clamp(p.x, 20, W - 20);
        S.queen.aimY = HM.clamp(p.y - 78, 130, H - 30);
        S.queen.mode = 'pointer';
      } else if (e.button === 2) {
        if (state === 'play' && !paused && !helpOpen) tryDecoy();
        return;
      } else {
        S.queen.aimX = HM.clamp(p.x, 20, W - 20);
        S.queen.aimY = HM.clamp(p.y, 130, H - 30);
        S.queen.mode = 'pointer';
        HM.render.aim.x = p.x; HM.render.aim.y = p.y; HM.render.aim.on = true;
      }
    }
    if (state === 'play' && !paused && !helpOpen && e.button !== 2) HM.sim.doPulse();
  }
  function tryDecoy() {
    var ok = HM.sim.doDecoy();
    if (!ok) {
      var S = HM.sim.getState();
      if (S && S.honey < 12 && !S.decoyCd) toast('Decoys cost 12 honey — the comb is too light.', 2200);
    }
  }

  function showTouchButtons() {
    el.touchPulse.hidden = false;
    el.touchDecoy.hidden = false;
  }

  /* ---------------- HUD ---------------- */
  var hudCache = {};
  function setTxt(node, v, key) {
    if (hudCache[key] !== v) { hudCache[key] = v; node.textContent = v; }
  }
  function updateHUD(dt) {
    var S = HM.sim.getState();
    if (!S || el.hud.hidden) return;
    setTxt(el.hudDayNum, S.day, 'day');
    var pct = HM.clamp(S.dayT / S.dayLen, 0, 1);
    el.sunFill.style.width = (pct * 100).toFixed(1) + '%';
    el.sunDot.style.left = (pct * 100).toFixed(1) + '%';
    var qp = HM.clamp(S.dayPollen / S.quota, 0, 1);
    el.quotaFill.style.width = (qp * 100).toFixed(1) + '%';
    setTxt(el.quotaNow, S.dayPollen, 'qp');
    setTxt(el.quotaGoal, S.quota, 'qg');
    var met = S.dayPollen >= S.quota;
    if (hudCache.met !== met) {
      hudCache.met = met;
      el.quotaBox.classList.toggle('met', met);
      el.quotaLabel.textContent = met ? 'Quota met — bank extra' : 'Pollen for the hive';
      if (met) { el.quotaBox.classList.remove('flash'); void el.quotaBox.offsetWidth; el.quotaBox.classList.add('flash'); }
    }
    setTxt(el.honeyVal, S.honey, 'honey');
    setTxt(el.beeVal, S.bees.length, 'bees');
    if (hudCache.honeyPop !== S.honey) {
      hudCache.honeyPop = S.honey;
      el.honeyVal.parentElement.classList.remove('pop'); void el.honeyVal.offsetWidth;
      el.honeyVal.parentElement.classList.add('pop');
    }
    // chips
    var pc = HM.clamp(1 - S.pulseCd / HM.sim.getCfg().pulse.cd, 0, 1);
    el.pulseRing.style.background = 'conic-gradient(rgba(242,178,62,0.4) ' + ((1 - pc) * 100).toFixed(0) + '%, transparent 0)';
    el.chipPulse.classList.toggle('cd', S.pulseCd > 0);
    el.chipPulse.classList.toggle('ready', S.pulseCd <= 0);
    var dc = HM.clamp(1 - S.decoyCd / HM.sim.getCfg().decoy.cd, 0, 1);
    el.decoyRing.style.background = 'conic-gradient(rgba(242,178,62,0.4) ' + ((1 - dc) * 100).toFixed(0) + '%, transparent 0)';
    el.chipDecoy.classList.toggle('cd', S.decoyCd > 0);
    el.chipDecoy.classList.toggle('ready', S.decoyCd <= 0 && S.honey >= 12);
    el.chipDecoy.classList.toggle('poor', S.honey < 12);
    updPips(el.hudPips, S.day, S.day - 1);
    // hints
    runHints(S);
  }

  /* ---------------- hints (first runs) ---------------- */
  var hints = {};
  function resetHints() { hints = { move: false, carrier: false, wasp: false, gust: false }; }
  function runHints(S) {
    if (save.runs > 3) return;
    if (!hints.move && S.time > 0.8) {
      hints.move = true;
      toast('Drift toward the blossoms — your workers follow you.', 4200);
    } else if (!hints.carrier && HM.sim.anyCarrier() && S.time > 3) {
      hints.carrier = true;
      toast('A pollen-heavy worker glows — shepherd her back to the hive.', 4200);
    } else if (!hints.wasp && HM.sim.anyWasp() && S.time > 3) {
      hints.wasp = true;
      toast('A wasp! Space (or a click) pulses them away.', 4200);
    } else if (!hints.gust && S.gust.stage !== 'idle') {
      hints.gust = true;
      toast('The wind rises — the whole swarm will be shoved.', 3800);
    }
  }

  /* ---------------- sim event wiring ---------------- */
  function wireEvents() {
    var ev = HM.sim.events;
    ev.onBeeLost = function () { hitStop = motionReduced() ? 0.03 : 0.07; };
    ev.onQuota = function () {
      HM.audio.quotaMet();
      toast('Quota met — bank extra before dusk!', 3000);
    };
  }

  /* ---------------- resize ---------------- */
  function resize() {
    var vw = window.innerWidth, vh = window.innerHeight;
    scale = Math.min((vw - 14) / W, (vh - 14) / H);
    scale = HM.clamp(scale, 0.2, 3);
    var cw = Math.round(W * scale), ch = Math.round(H * scale);
    stage.style.width = cw + 'px';
    stage.style.height = ch + 'px';
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    rect = canvas.getBoundingClientRect();
  }

  /* ---------------- main loop ---------------- */
  var lastT = 0, fpsAcc = 0, fpsN = 0, fps = 60;
  // ?tick=1 drives frames with a timer instead of rAF — for embedded/test
  // contexts that never fire rAF. Normal play always uses requestAnimationFrame.
  var forceTick = /tick=1/.test(location.search);
  function schedule() {
    if (forceTick) setTimeout(function () { frame(performance.now()); }, 15);
    else requestAnimationFrame(frame);
  }
  function frame(now) {
    schedule();
    if (!lastT) lastT = now;
    var dt = (now - lastT) / 1000;
    lastT = now;
    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) return;

    // night tint tween
    var target = 0;
    if (state === 'dusk') target = 0.5;
    else if (state === 'night') target = 0.85;
    else if (state === 'over') target = 0.45;
    else if (state === 'win') target = 0.2;
    var v = HM.render.vis;
    v.night += (target - v.night) * Math.min(1, dt * 2.4);

    var simActive = (state === 'play' || state === 'dusk') && !paused && !helpOpen;
    if (state === 'title') HM.sim.update(dt); // living attract scene
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (simActive) {
      HM.sim.update(dt);
      var S = HM.sim.getState();
      if (state === 'play') {
        if (S.dayT >= S.dayLen) beginDusk();
        else if (S.bees.length === 0 && !S.quotaMet) gameOver('scatter');
      }
    }
    if (state === 'dusk') {
      duskT += dt;
      if (duskT >= 1.7) finishDusk();
    }
    if (state === 'night' && nightAuto > 0) {
      nightAuto -= dt;
      if (nightAuto <= 0) nextDay();
    }
    if (state === 'win') {
      // celebratory drift
      if (Math.random() < dt * 14) {
        HM.fx.spawn({
          kind: 'dot', x: HM.world.hive.x + (Math.random() - 0.5) * 300, y: H - Math.random() * 200,
          vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 50,
          size: 1.6 + Math.random() * 2.4, life: 1.8, col: '#ffd166', grav: -10, drag: 0.4, add: true
        });
      }
    }

    HM.fx.update(dt);
    var S2 = HM.sim.getState();
    var gustAmt = 0;
    if (S2) {
      if (S2.gust.stage === 'blow') gustAmt = Math.sin(HM.clamp(S2.gust.t / 1.5, 0, 1) * Math.PI);
      else if (S2.gust.stage === 'tele') gustAmt = 0.18;
    }
    HM.audio.tick(dt, simActive ? HM.sim.nearestWaspDist() : null, gustAmt);

    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    HM.render.draw(ctx, dt);
    updateHUD(dt);

    fpsAcc += dt; fpsN++;
    if (fpsAcc >= 0.5) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; HM.main.info.fps = Math.round(fps); }
  }

  /* ---------------- boot ---------------- */
  function boot() {
    canvas = D('game');
    ctx = canvas.getContext('2d');
    stage = D('stage');
    grab();
    buildPips(el.hudPips);
    buildPips(el.nightPips);
    applyMotion();
    syncToggles();
    el.decoyCost.textContent = 12;
    if (window.matchMedia && matchMedia('(pointer: coarse)').matches) showTouchButtons();
    wireEvents();
    resize();
    window.addEventListener('resize', function () { resize(); });
    window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('blur', function () {
      var S = HM.sim.getState();
      if (S) S.queen.keys = {};
      if (!forceTick && (state === 'play' || state === 'dusk') && !paused && !helpOpen) setPaused(true);
    });
    document.addEventListener('visibilitychange', function () {
      if (!forceTick && document.hidden && (state === 'play' || state === 'dusk') && !paused && !helpOpen) setPaused(true);
    });

    // buttons
    el.btnStart.addEventListener('click', function () { HM.audio.resume(); HM.audio.click(); startRun(); });
    el.btnResume.addEventListener('click', function () { HM.audio.click(); setPaused(false); });
    el.btnPRestart.addEventListener('click', function () { HM.audio.click(); startRun(); });
    el.btnPQuit.addEventListener('click', function () { HM.audio.click(); toTitle(); });
    el.btnSound.addEventListener('click', toggleMute);
    el.btnSoundT.addEventListener('click', toggleMute);
    el.btnSoundP.addEventListener('click', toggleMute);
    el.btnMotionT.addEventListener('click', toggleMotion);
    el.btnMotionP.addEventListener('click', toggleMotion);
    el.btnPause.addEventListener('click', function () { HM.audio.click(); setPaused(true); });
    el.btnHelp.addEventListener('click', function () {
      HM.audio.click();
      if (state === 'play' || state === 'dusk') { paused = true; openHelp('play'); }
      else openHelp(state === 'pause' ? 'pause' : 'title');
    });
    el.btnHelpClose.addEventListener('click', function () { HM.audio.click(); closeHelp(); });
    el.btnDawn.addEventListener('click', function () { HM.audio.click(); clearTimeout(nightAuto); nextDay(); });
    el.btnRetry.addEventListener('click', function () { HM.audio.click(); startRun(); });
    el.btnEndTitle.addEventListener('click', function () { HM.audio.click(); toTitle(); });
    el.touchPulse.addEventListener('click', function (e) { e.stopPropagation(); if (state === 'play' && !paused) HM.sim.doPulse(); });
    el.touchDecoy.addEventListener('click', function (e) { e.stopPropagation(); if (state === 'play' && !paused) tryDecoy(); });
    var resetArm = 0;
    el.btnReset.addEventListener('click', function () {
      if (el.btnReset.classList.contains('arm')) {
        save.bestDay = 0; save.bestHoney = 0; persist();
        refreshTitle();
        HM.audio.click();
      } else {
        el.btnReset.classList.add('arm');
        el.btnReset.textContent = 'Really reset?';
        clearTimeout(resetArm);
        resetArm = setTimeout(function () {
          el.btnReset.classList.remove('arm');
          el.btnReset.textContent = 'Reset best season';
        }, 3000);
      }
    });

    HM.audio.setMuted(save.muted);
    toTitle();
    schedule();
    setTimeout(resize, 250); // settle late viewport reports in embedded contexts
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  HM.main = {
    info: { fps: 60, state: function () { return state; }, paused: function () { return paused; } },
    __forceDusk: function () { if (state === 'play') beginDusk(); }
  };
  return HM.main;
})();
