/* Emberwake — HUD, menus, settings, touch controls. */
(function () {
  'use strict';
  const EW = (globalThis.EW = globalThis.EW || {});
  const M = EW.M;
  const UI = (EW.UI = {});

  const $ = (id) => document.getElementById(id);
  let els = {};
  let toastTimer = 0;
  let liveThrottle = 0;
  let lastLive = '';
  let compassCtx = null;

  UI.settings = {
    sens: 1.0, invertY: false, volume: 0.8,
    quality: 'auto', reduceMotion: false, showTouch: 'auto'
  };

  UI.init = function (hooks) {
    els = {
      canvas: $('game'),
      hud: $('hud'),
      compass: $('compass'),
      dist: $('compass-dist'),
      objective: $('objective'),
      fuelFill: $('fuel-fill'),
      fuelNum: $('fuel-num'),
      emberNum: $('ember-num'),
      pips: $('pips'),
      spd: $('spd-val'),
      alt: $('alt-val'),
      toasts: $('toasts'),
      vignette: $('vignette'),
      stormShade: $('storm-shade'),
      flashLayer: $('flash'),
      crosshair: $('crosshair'),
      thermalTag: $('thermal-tag'),
      hint: $('hint-bar'),
      touch: $('touch'),
      stick: $('stick'),
      stickKnob: $('stick-knob'),
      btnBoost: $('btn-boost'),
      btnCam: $('btn-cam'),
      title: $('screen-title'),
      pause: $('screen-pause'),
      done: $('screen-done'),
      err: $('screen-err'),
      live: $('aria-live')
    };
    compassCtx = els.compass.getContext('2d');

    // ----- settings persistence -----
    try {
      const raw = localStorage.getItem('emberwake.v1');
      if (raw) {
        const s = JSON.parse(raw);
        if (s && typeof s === 'object') Object.assign(UI.settings, {
          sens: M.clamp(+s.sens || 1, 0.3, 2.5),
          invertY: !!s.invertY,
          volume: M.clamp(s.volume != null ? +s.volume : 0.8, 0, 1),
          quality: ['auto', 'high', 'medium', 'low'].includes(s.quality) ? s.quality : 'auto',
          reduceMotion: !!s.reduceMotion,
          showTouch: ['auto', 'on', 'off'].includes(s.showTouch) ? s.showTouch : 'auto'
        });
      }
    } catch (e) { /* storage unavailable — defaults are fine */ }

    UI.applySettings();
    buildPips();
    bindButtons(hooks);
    bindTouch();
    buildTitleControls();
    return true;
  };

  UI.saveSettings = function () {
    try { localStorage.setItem('emberwake.v1', JSON.stringify(UI.settings)); } catch (e) { /* ignore */ }
  };

  UI.applySettings = function () {
    const s = UI.settings;
    if (EW.Sim) {
      EW.Sim.input.sens = s.sens;
      EW.Sim.input.invertY = s.invertY;
    }
    if (EW.Sfx) EW.Sfx.setVolume(s.volume);
    if (EW.Game) EW.Game.reduceMotion = s.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    updateTouchVisibility();
    // reflect into every settings form
    document.querySelectorAll('[data-setting]').forEach((el) => {
      const k = el.getAttribute('data-setting');
      if (el.type === 'checkbox') el.checked = !!s[k];
      else el.value = s[k];
    });
  };

  function onSettingChange(el) {
    const k = el.getAttribute('data-setting');
    if (!k) return;
    if (el.type === 'checkbox') UI.settings[k] = el.checked;
    else if (el.type === 'range') UI.settings[k] = +el.value;
    else UI.settings[k] = el.value;
    UI.applySettings();
    UI.saveSettings();
  }

  /* ---------- screens ---------- */
  UI.showScreen = function (name) {
    for (const k of ['title', 'pause', 'done', 'err']) {
      els[k].classList.toggle('visible', k === name);
    }
    els.hud.classList.toggle('dimmed', !!name);
    if (name) {
      const btn = els[name].querySelector('button:not([disabled])');
      if (btn) setTimeout(() => btn.focus(), 30);
    }
  };

  /* ---------- toasts & feedback ---------- */
  UI.toast = function (msg, ms) {
    els.toasts.textContent = msg;
    els.toasts.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toasts.classList.remove('show'), ms || 2400);
  };

  UI.flash = function (a) {
    els.flashLayer.style.transition = 'none';
    els.flashLayer.style.opacity = String(Math.min(a, 0.85));
    requestAnimationFrame(() => {
      els.flashLayer.style.transition = 'opacity 0.5s ease-out';
      els.flashLayer.style.opacity = '0';
    });
  };

  UI.flashFuel = function () {
    els.fuelFill.classList.remove('hit');
    void els.fuelFill.offsetWidth;
    els.fuelFill.classList.add('hit');
  };

  UI.setStorm = function (f) {
    els.stormShade.style.opacity = String(M.clamp(f, 0, 0.5));
  };

  UI.fatalError = function (msg) {
    $('err-msg').textContent = msg;
    UI.showScreen('err');
  };

  function buildPips() {
    els.pips.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const d = document.createElement('span');
      d.className = 'pip';
      d.title = 'Beacon ' + (i + 1);
      els.pips.appendChild(d);
    }
  }

  UI.setObjective = function (txt) {
    if (els.objective.textContent !== txt) {
      els.objective.textContent = txt;
    }
  };

  /* ---------- per-frame HUD ---------- */
  UI.updateHUD = function (dt) {
    const S = EW.Sim, E = EW.Ent;
    const p = S.player;
    const gh = EW.Terrain.sampleGround(p.pos.x, p.pos.z);
    els.fuelFill.style.width = M.clamp(p.fuel, 0, 100).toFixed(0) + '%';
    els.fuelNum.textContent = Math.round(p.fuel);
    els.emberNum.textContent = String(p.embers);
    els.spd.textContent = String(Math.max(0, Math.round(p.speed)));
    els.alt.textContent = String(Math.max(0, Math.round(p.pos.y - gh)));

    const pips = els.pips.children;
    for (let i = 0; i < 8; i++) {
      pips[i].classList.toggle('lit', E.beacons[i].lit);
    }

    // storm shade & thermal tag
    UI.setStorm(S.stormIn ? 0.42 : 0);
    els.thermalTag.classList.toggle('show', !!S.thermalIn);
    els.crosshair.classList.toggle('fast', p.speed > 70);

    drawCompass();
  };

  function targetInfo() {
    const S = EW.Sim, p = S.player;
    const nx = EW.Ent.nextBeacon();
    if (!nx) return null;
    if (nx.gate) {
      return { x: EW.Ent.gate.x, y: EW.Ent.gate.y, z: EW.Ent.gate.z, d: nx.d, name: 'The Dawn Gate', gate: true };
    }
    return { x: nx.beacon.flame.x, y: nx.beacon.flame.y, z: nx.beacon.flame.z, d: nx.d, name: nx.beacon.name };
  }

  function drawCompass() {
    const S = EW.Sim, p = S.player;
    const cvs = els.compass;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cvs.clientWidth, h = cvs.clientHeight;
    if (cvs.width !== w * dpr || cvs.height !== h * dpr) {
      cvs.width = w * dpr; cvs.height = h * dpr;
    }
    const c = compassCtx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const mid = w / 2, fov = 1.45; // radians shown either side

    // ticks
    c.strokeStyle = 'rgba(240,230,210,0.28)';
    c.fillStyle = 'rgba(240,230,210,0.55)';
    c.font = '10px system-ui, sans-serif';
    c.textAlign = 'center';
    for (let deg = 0; deg < 360; deg += 15) {
      const b = deg * Math.PI / 180;
      let rel = M.wrapAngle(b - p.yaw);
      if (Math.abs(rel) > fov) continue;
      const x = mid + (rel / fov) * (mid - 8);
      const major = deg % 90 === 0;
      c.globalAlpha = 1 - Math.abs(rel) / fov * 0.7;
      c.beginPath();
      c.moveTo(x, h - (major ? 14 : 9));
      c.lineTo(x, h - 3);
      c.stroke();
      if (major) {
        const names = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
        c.fillText(names[deg], x, h - 18);
      }
    }

    // beacon markers
    const E = EW.Ent;
    const tgt = targetInfo();
    for (const b of E.beacons) {
      const dx = b.flame.x - p.pos.x, dz = b.flame.z - p.pos.z;
      const bearing = Math.atan2(dx, -dz);
      let rel = M.wrapAngle(bearing - p.yaw);
      const clipped = Math.abs(rel) > fov;
      rel = M.clamp(rel, -fov, fov);
      const x = mid + (rel / fov) * (mid - 8);
      c.globalAlpha = clipped ? 0.35 : 0.95;
      c.save();
      c.translate(x, 12);
      c.rotate(Math.PI / 4);
      if (b.lit) {
        c.fillStyle = 'rgba(255,178,84,0.95)';
        c.fillRect(-4, -4, 8, 8);
      } else {
        c.strokeStyle = 'rgba(255,178,84,0.9)';
        c.lineWidth = 1.6;
        c.strokeRect(-4, -4, 8, 8);
      }
      c.restore();
    }
    // gate marker
    if (E.gate.active || E.litCount >= 6) {
      const g = E.gate;
      const bearing = Math.atan2(g.x - p.pos.x, -(g.z - p.pos.z));
      let rel = M.wrapAngle(bearing - p.yaw);
      const clipped = Math.abs(rel) > fov;
      rel = M.clamp(rel, -fov, fov);
      const x = mid + (rel / fov) * (mid - 8);
      c.globalAlpha = clipped ? 0.35 : 0.95;
      c.strokeStyle = 'rgba(245,240,225,0.95)';
      c.lineWidth = 2;
      c.beginPath(); c.arc(x, 12, 5, 0, Math.PI * 2); c.stroke();
    }
    c.globalAlpha = 1;

    // distance line
    if (tgt) {
      const d = Math.round(tgt.d);
      els.dist.textContent = tgt.name + ' · ' + d + ' m';
      // aria live (throttled, rounded)
      liveThrottle -= 1 / 60;
      const rounded = Math.round(d / 50) * 50;
      const live = tgt.name + ', ' + rounded + ' meters';
      if (live !== lastLive && liveThrottle <= 0) {
        lastLive = live;
        liveThrottle = 3;
        els.live.textContent = live;
      }
    }
  }

  /* ---------- touch controls ---------- */
  function updateTouchVisibility() {
    if (!els.touch) return;
    const s = UI.settings.showTouch;
    const coarse = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    const on = s === 'on' || (s === 'auto' && coarse);
    els.touch.classList.toggle('visible', on);
    EW.Sim.input.touch.active = EW.Sim.input.touch.active && on;
  }
  UI.updateTouchVisibility = updateTouchVisibility;

  function bindTouch() {
    const zone = els.stick;
    let stickId = null, ox = 0, oy = 0;
    zone.addEventListener('pointerdown', (e) => {
      stickId = e.pointerId;
      zone.setPointerCapture(stickId);
      const r = zone.getBoundingClientRect();
      ox = r.left + r.width / 2; oy = r.top + r.height / 2;
      moveStick(e);
      e.preventDefault();
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId === stickId) moveStick(e);
    });
    const end = (e) => {
      if (e.pointerId === stickId) {
        stickId = null;
        EW.Sim.setTouchStick(0, 0);
        els.stickKnob.style.transform = 'translate(-50%,-50%)';
      }
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    function moveStick(e) {
      const dx = e.clientX - ox, dy = e.clientY - oy;
      const max = 52;
      const nx = M.clamp(dx / max, -1, 1), ny = M.clamp(dy / max, -1, 1);
      EW.Sim.setTouchStick(nx, -ny); // up on screen = climb
      els.stickKnob.style.transform = `translate(calc(-50% + ${nx * max * 0.6}px), calc(-50% + ${ny * max * 0.6}px))`;
    }

    const bind = (el, on, off) => {
      el.addEventListener('pointerdown', (e) => { on(); el.classList.add('press'); e.preventDefault(); });
      el.addEventListener('pointerup', () => { off(); el.classList.remove('press'); });
      el.addEventListener('pointercancel', () => { off(); el.classList.remove('press'); });
      el.addEventListener('pointerleave', () => { off(); el.classList.remove('press'); });
    };
    bind(els.btnBoost, () => EW.Sim.setTouchBoost(true), () => EW.Sim.setTouchBoost(false));
    bind(els.btnCam,
      () => { EW.Sim.firstPerson = !EW.Sim.firstPerson; },
      () => {});
  }

  /* ---------- menu buttons ---------- */
  function bindButtons(hooks) {
    $('btn-begin').addEventListener('click', () => hooks.onBegin());
    $('btn-resume').addEventListener('click', () => hooks.onResume());
    $('btn-restart').addEventListener('click', () => hooks.onRestart());
    $('btn-again').addEventListener('click', () => hooks.onRestart());
    $('btn-soar').addEventListener('click', () => hooks.onKeepSoaring());
    $('btn-quit-title').addEventListener('click', () => hooks.onQuitToTitle());
    document.querySelectorAll('[data-setting]').forEach((el) => {
      el.addEventListener('change', () => onSettingChange(el));
      el.addEventListener('input', () => { if (el.type === 'range') onSettingChange(el); });
    });
  }

  function buildTitleControls() {
    // fill the "controls" list on the title screen
    const rows = [
      ['Steer', 'Mouse · A/D or ←/→'],
      ['Climb / dive', 'W/S or ↑/↓'],
      ['Boost (burns embers)', 'Shift or Space'],
      ['Camera', 'C'],
      ['Return to beacon', 'R'],
      ['Pause', 'Esc / P'],
      ['Mute', 'M'],
      ['Fullscreen', 'F']
    ];
    const wrap = $('controls-list');
    wrap.innerHTML = '';
    for (const [k, v] of rows) {
      const div = document.createElement('div');
      div.className = 'ctl-row';
      const a = document.createElement('span'); a.textContent = k;
      const b = document.createElement('span'); b.textContent = v; b.className = 'ctl-val';
      div.appendChild(a); div.appendChild(b);
      wrap.appendChild(div);
    }
  }

  UI.showDone = function (stats) {
    $('stat-time').textContent = stats.time;
    $('stat-embers').textContent = stats.embers;
    $('stat-speed').textContent = stats.speed;
    $('stat-graze').textContent = stats.grazes;
    UI.showScreen('done');
  };

  UI.toggleMute = function () {
    UI.settings.volume = UI.settings.volume > 0 ? 0 : 0.8;
    UI.applySettings();
    UI.saveSettings();
    UI.toast(UI.settings.volume > 0 ? 'Sound on.' : 'Sound off.', 1200);
  };

  UI.hint = function (txt) {
    els.hint.textContent = txt;
    els.hint.classList.toggle('show', !!txt);
  };
})();
