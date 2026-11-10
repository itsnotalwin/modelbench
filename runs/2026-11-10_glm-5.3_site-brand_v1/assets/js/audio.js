/* ============================================================
   LONGSHORE — audio.js
   The listening room: three scenes synthesised with Web Audio.
   Honest imitations — never excerpts, never sent anywhere.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  /* ------------------------------------------------------------ engine */
  var LongshoreAudio = {
    ctx: null,
    master: null,
    analyser: null,
    available: null,
    current: null,
    lastTouched: null,
    _scene: null,
    _noise: null,
    _volume: 0.7,
    _onState: null,
    _onError: null,
  };

  function Ctor() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  function ensureCtx() {
    if (LongshoreAudio.ctx) return LongshoreAudio.ctx;
    var AC = Ctor();
    if (!AC) {
      LongshoreAudio.available = false;
      return null;
    }
    try {
      var ctx = new AC();
      var master = ctx.createGain();
      master.gain.value = LongshoreAudio._volume;
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 6;
      var analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.55;
      master.connect(comp);
      comp.connect(analyser);
      analyser.connect(ctx.destination);
      LongshoreAudio.ctx = ctx;
      LongshoreAudio.master = master;
      LongshoreAudio.analyser = analyser;
      LongshoreAudio.available = true;
      return ctx;
    } catch (err) {
      LongshoreAudio.available = false;
      return null;
    }
  }

  /* pink noise, 2 decorrelated channels, 4 s */
  function noiseBuffer(ctx) {
    if (LongshoreAudio._noise) return LongshoreAudio._noise;
    var len = Math.floor(ctx.sampleRate * 4);
    var buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        b6 = w * 0.115926;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.1;
      }
    }
    LongshoreAudio._noise = buf;
    return buf;
  }

  function noiseSrc(ctx, rate, offset) {
    var s = ctx.createBufferSource();
    s.buffer = noiseBuffer(ctx);
    s.loop = true;
    if (rate) s.playbackRate.value = rate;
    s.start(0, offset !== undefined ? offset : Math.random() * 3);
    return s;
  }

  function lfo(ctx, hz, depth, param) {
    var o = ctx.createOscillator();
    o.frequency.value = hz;
    var g = ctx.createGain();
    g.gain.value = depth;
    o.connect(g);
    g.connect(param);
    o.start();
    return o;
  }

  function newScene(ctx) {
    var out = ctx.createGain();
    out.gain.value = 0;
    out.connect(LongshoreAudio.master);
    return {
      ctx: ctx,
      out: out,
      nodes: [],
      timers: [],
      startedAt: 0,
      add: function (n) { this.nodes.push(n); return n; },
      every: function (minMs, maxMs, fn) {
        var self = this;
        var tick = function () {
          fn();
          self.timers.push(setTimeout(tick, minMs + Math.random() * (maxMs - minMs)));
        };
        this.timers.push(setTimeout(tick, 300 + Math.random() * 900));
      },
      stop: function () {
        var ctx2 = this.ctx;
        var scene = this;
        scene.timers.forEach(clearTimeout);
        scene.timers = [];
        try {
          scene.out.gain.cancelScheduledValues(ctx2.currentTime);
          scene.out.gain.setValueAtTime(scene.out.gain.value, ctx2.currentTime);
          scene.out.gain.linearRampToValueAtTime(0, ctx2.currentTime + 0.18);
        } catch (e) { /* already gone */ }
        setTimeout(function () {
          scene.nodes.forEach(function (n) {
            try { if (n.stop) n.stop(); } catch (e) { /* finished */ }
            try { n.disconnect(); } catch (e) { /* fine */ }
          });
          try { scene.out.disconnect(); } catch (e) { /* fine */ }
        }, 260);
      },
    };
  }

  /* ------------------------------------------------- scene: shingle */
  function buildShingle(ctx) {
    var s = newScene(ctx);
    var panL = s.add(ctx.createStereoPanner());
    var panR = s.add(ctx.createStereoPanner());
    panL.pan.value = -0.4;
    panR.pan.value = 0.4;
    panL.connect(s.out);
    panR.connect(s.out);

    [ [panL, 640, 1.02], [panR, 700, 0.98] ].forEach(function (cfg) {
      var bp = s.add(ctx.createBiquadFilter());
      bp.type = "bandpass";
      bp.frequency.value = cfg[1];
      bp.Q.value = 0.5;
      var g = s.add(ctx.createGain());
      g.gain.value = 0.14;
      var src = s.add(noiseSrc(ctx, cfg[2]));
      src.connect(bp); bp.connect(g); g.connect(cfg[0]);
      s.add(lfo(ctx, 0.052 + Math.random() * 0.02, 0.05, g.gain));
    });
    s.add(lfo(ctx, 0.078, 0.03, s.out.gain));

    /* sets that arrive without warning */
    s.every(8000, 20000, function () {
      var t = ctx.currentTime + 0.1;
      var src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
      src.loop = true;
      var lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1100 + Math.random() * 700;
      lp.Q.value = 0.4;
      var g = ctx.createGain();
      var p = ctx.createStereoPanner();
      p.pan.value = Math.random() * 1.4 - 0.7;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.34 + Math.random() * 0.22, t + 2.1 + Math.random() * 1.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 6.5 + Math.random() * 2);
      src.connect(lp); lp.connect(g); g.connect(p); p.connect(s.out);
      src.start(t, Math.random() * 3);
      src.stop(t + 9.5);
    });
    return s;
  }

  /* ------------------------------------------------- scene: saltmarsh */
  function chirp(ctx, dest, when, base) {
    var o = ctx.createOscillator();
    o.type = "sine";
    var g = ctx.createGain();
    var p = ctx.createStereoPanner();
    p.pan.value = Math.random() * 1.6 - 0.8;
    var f = base * (0.85 + Math.random() * 0.4);
    var dur = 0.07 + Math.random() * 0.2;
    o.frequency.setValueAtTime(f, when);
    o.frequency.exponentialRampToValueAtTime(f * (1.12 + Math.random() * 0.3), when + dur * 0.4);
    o.frequency.exponentialRampToValueAtTime(f * 0.84, when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.07 + Math.random() * 0.06, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(p); p.connect(dest);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  function buildSaltmarsh(ctx) {
    var s = newScene(ctx);

    /* wind laying the grass flat */
    var windBP = s.add(ctx.createBiquadFilter());
    windBP.type = "bandpass";
    windBP.frequency.value = 520;
    windBP.Q.value = 6.5;
    var windG = s.add(ctx.createGain());
    windG.gain.value = 0.09;
    var windSrc = s.add(noiseSrc(ctx, 1.01));
    windSrc.connect(windBP); windBP.connect(windG); windG.connect(s.out);
    s.add(lfo(ctx, 0.028, 240, windBP.frequency));
    s.add(lfo(ctx, 0.061, 0.035, windG.gain));

    /* grass rustle, a step above */
    var rustBP = s.add(ctx.createBiquadFilter());
    rustBP.type = "bandpass";
    rustBP.frequency.value = 2400;
    rustBP.Q.value = 1.1;
    var rustG = s.add(ctx.createGain());
    rustG.gain.value = 0.03;
    var rustSrc = s.add(noiseSrc(ctx, 0.97));
    rustSrc.connect(rustBP); rustBP.connect(rustG); rustG.connect(s.out);
    s.every(2200, 5200, function () {
      var t = ctx.currentTime;
      rustG.gain.cancelScheduledValues(t);
      rustG.gain.setValueAtTime(rustG.gain.value, t);
      rustG.gain.linearRampToValueAtTime(0.02 + Math.random() * 0.05, t + 0.9);
    });

    /* water finding the creeks */
    var hp = s.add(ctx.createBiquadFilter());
    hp.type = "highpass";
    hp.frequency.value = 3200;
    var waterG = s.add(ctx.createGain());
    waterG.gain.value = 0.02;
    var waterSrc = s.add(noiseSrc(ctx, 1.05));
    waterSrc.connect(hp); hp.connect(waterG); waterG.connect(s.out);
    s.every(1500, 3800, function () {
      var t = ctx.currentTime;
      waterG.gain.cancelScheduledValues(t);
      waterG.gain.setValueAtTime(waterG.gain.value, t);
      waterG.gain.linearRampToValueAtTime(0.012 + Math.random() * 0.045, t + 0.7);
    });

    /* a warbler improvising over both */
    s.every(3800, 11000, function () {
      var t = ctx.currentTime + 0.05;
      var n = 2 + Math.floor(Math.random() * 5);
      var base = 2700 + Math.random() * 2300;
      for (var i = 0; i < n; i++) {
        chirp(ctx, s.out, t + i * (0.13 + Math.random() * 0.22), base);
      }
    });
    return s;
  }

  /* ------------------------------------------------- scene: fog signal */
  function buildFog(ctx) {
    var s = newScene(ctx);

    /* the sea running underneath */
    var lp = s.add(ctx.createBiquadFilter());
    lp.type = "lowpass";
    lp.frequency.value = 300;
    lp.Q.value = 0.4;
    var seaG = s.add(ctx.createGain());
    seaG.gain.value = 0.1;
    var seaSrc = s.add(noiseSrc(ctx, 0.9));
    seaSrc.connect(lp); lp.connect(seaG); seaG.connect(s.out);
    s.add(lfo(ctx, 0.043, 0.05, seaG.gain));

    /* a polite distance: delay network */
    var wetIn = ctx.createGain();
    var delay = s.add(ctx.createDelay(4));
    delay.delayTime.value = 1.12;
    var fb = s.add(ctx.createGain());
    fb.gain.value = 0.42;
    var fbLP = s.add(ctx.createBiquadFilter());
    fbLP.type = "lowpass";
    fbLP.frequency.value = 800;
    var wetOut = s.add(ctx.createGain());
    wetOut.gain.value = 0.5;
    wetIn.connect(delay);
    delay.connect(fbLP); fbLP.connect(fb); fb.connect(delay);
    delay.connect(wetOut);
    wetOut.connect(s.out);

    /* the horn itself */
    s.every(26000, 34000, function () {
      var t = ctx.currentTime + 0.15;
      var g = ctx.createGain();
      var dryLP = ctx.createBiquadFilter();
      dryLP.type = "lowpass";
      dryLP.frequency.value = 950;
      var f1 = ctx.createOscillator();
      var f2 = ctx.createOscillator();
      f1.frequency.value = 64;
      f2.frequency.value = 64.7;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.4, t + 0.6);
      g.gain.setValueAtTime(0.4, t + 3.6);
      g.gain.linearRampToValueAtTime(0.0001, t + 6.6);
      f1.connect(g); f2.connect(g);
      g.connect(dryLP); dryLP.connect(s.out);
      g.connect(wetIn);
      f1.start(t); f2.start(t);
      f1.stop(t + 7); f2.stop(t + 7);
    });
    return s;
  }

  var BUILDERS = {
    shingle: buildShingle,
    saltmarsh: buildSaltmarsh,
    fog: buildFog,
  };

  /* ------------------------------------------------------------ api */
  function stopCurrent() {
    if (LongshoreAudio._scene) {
      LongshoreAudio._scene.stop();
      LongshoreAudio._scene = null;
    }
    LongshoreAudio.current = null;
  }

  function play(id) {
    if (!BUILDERS[id]) return;
    var ctx = ensureCtx();
    if (!ctx) {
      if (LongshoreAudio._onError) LongshoreAudio._onError(id);
      return;
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(function () {
        if (LongshoreAudio._onError) LongshoreAudio._onError(id);
      });
    }
    if (LongshoreAudio.current === id) { stopCurrent(); notify(); return; }
    stopCurrent();
    try {
      var scene = BUILDERS[id](ctx);
      scene.out.gain.setValueAtTime(0.0001, ctx.currentTime);
      scene.out.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.45);
      scene.startedAt = ctx.currentTime;
      LongshoreAudio._scene = scene;
      LongshoreAudio.current = id;
      LongshoreAudio.lastTouched = id;
      notify();
    } catch (err) {
      LongshoreAudio.available = false;
      stopCurrent();
      if (LongshoreAudio._onError) LongshoreAudio._onError(id);
    }
  }

  function notify() {
    if (LongshoreAudio._onState) LongshoreAudio._onState(LongshoreAudio.current);
  }

  LongshoreAudio.play = play;
  LongshoreAudio.toggle = play;
  LongshoreAudio.toggleLast = function () {
    if (LongshoreAudio.lastTouched) play(LongshoreAudio.lastTouched);
  };
  LongshoreAudio.isPlaying = function (id) { return LongshoreAudio.current === id; };
  LongshoreAudio.setVolume = function (v) {
    LongshoreAudio._volume = v;
    if (LongshoreAudio.master) {
      LongshoreAudio.master.gain.setTargetAtTime(v, LongshoreAudio.ctx.currentTime, 0.05);
    }
  };
  LongshoreAudio.elapsed = function (id) {
    if (LongshoreAudio.current !== id || !LongshoreAudio._scene) return 0;
    return Math.max(0, LongshoreAudio.ctx.currentTime - LongshoreAudio._scene.startedAt);
  };
  LongshoreAudio.onState = function (fn) { LongshoreAudio._onState = fn; };
  LongshoreAudio.onError = function (fn) { LongshoreAudio._onError = fn; };

  window.LongshoreAudio = LongshoreAudio;

  /* ----------------------------------------------------- room UI */
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    var cards = Array.prototype.slice.call(document.querySelectorAll("[data-scene]"));
    if (!cards.length) return;

    var canvases = {};
    var buttons = {};
    var timeEls = {};
    var stateEls = {};
    var rafId = null;
    var tickId = null;

    cards.forEach(function (card) {
      var id = card.getAttribute("data-scene");
      canvases[id] = card.querySelector(".scene-canvas");
      buttons[id] = card.querySelector("[data-scene-play]");
      timeEls[id] = card.querySelector('[data-scene-time]');
      stateEls[id] = card.querySelector('[data-scene-state]');
    });

    function fmt(sec) {
      sec = Math.floor(sec);
      var m = Math.floor(sec / 60);
      var s = sec % 60;
      return (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
    }

    function sizeCanvas(cv) {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var w = cv.clientWidth || 300;
      if (cv.width !== Math.round(w * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(84 * dpr);
      }
      return dpr;
    }

    function drawStatic(cv) {
      if (!cv) return;
      var dpr = sizeCanvas(cv);
      var g = cv.getContext("2d");
      g.clearRect(0, 0, cv.width, cv.height);
      g.strokeStyle = "rgba(165,198,189,0.4)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, cv.height / 2);
      g.lineTo(cv.width, cv.height / 2);
      g.stroke();
    }

    function drawLive(id) {
      var cv = canvases[id];
      if (!cv || !LongshoreAudio.analyser) return;
      var dpr = sizeCanvas(cv);
      var g = cv.getContext("2d");
      var data = new Uint8Array(LongshoreAudio.analyser.fftSize);
      LongshoreAudio.analyser.getByteTimeDomainData(data);
      g.clearRect(0, 0, cv.width, cv.height);
      g.strokeStyle = "rgba(165,198,189,0.28)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, cv.height / 2);
      g.lineTo(cv.width, cv.height / 2);
      g.stroke();
      g.strokeStyle = "#A5C6BD";
      g.lineWidth = 1.6 * dpr;
      g.beginPath();
      var step = cv.width / (data.length - 1);
      for (var i = 0; i < data.length; i++) {
        var v = (data[i] - 128) / 128;
        var y = cv.height / 2 + v * cv.height * 0.42;
        if (i === 0) g.moveTo(0, y);
        else g.lineTo(i * step, y);
      }
      g.stroke();
    }

    function loop() {
      if (!LongshoreAudio.current) { rafId = null; return; }
      drawLive(LongshoreAudio.current);
      rafId = requestAnimationFrame(loop);
    }

    function startVisual() {
      if (reduceMotion) { drawLive(LongshoreAudio.current); return; }
      if (rafId == null) rafId = requestAnimationFrame(loop);
    }

    function stopVisual() {
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
      Object.keys(canvases).forEach(function (k) { drawStatic(canvases[k]); });
    }

    function startTick() {
      if (tickId != null) return;
      tickId = setInterval(function () {
        if (!LongshoreAudio.current) return;
        var el = timeEls[LongshoreAudio.current];
        if (el) el.textContent = fmt(LongshoreAudio.elapsed(LongshoreAudio.current));
      }, 500);
    }

    LongshoreAudio.onState(function (current) {
      Object.keys(buttons).forEach(function (id) {
        var on = current === id;
        var btn = buttons[id];
        var card = btn.closest(".scene");
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.setAttribute("aria-label", (on ? "Pause " : "Play ") + id + " preview");
        card.classList.toggle("is-playing", on);
        if (!on && timeEls[id]) timeEls[id].textContent = "00:00";
        if (!on && stateEls[id]) stateEls[id].textContent = "";
      });
      if (current) { startVisual(); startTick(); }
      else { stopVisual(); if (tickId != null) { clearInterval(tickId); tickId = null; } }
    });

    LongshoreAudio.onError(function (id) {
      var el = stateEls[id];
      if (el) {
        el.textContent =
          "The preview didn’t start — the browser said no to Web Audio. " +
          "The libraries are ordinary WAV files; they play in anything. These toys are optional.";
      }
      var btn = buttons[id];
      if (btn) { btn.setAttribute("aria-pressed", "false"); btn.disabled = true; }
    });

    cards.forEach(function (card) {
      var id = card.getAttribute("data-scene");
      var btn = buttons[id];
      if (!btn) return;
      btn.setAttribute("aria-label", "Play " + id + " preview");
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        LongshoreAudio.play(id);
      });
      drawStatic(canvases[id]);
    });

    var vol = document.getElementById("roomVolume");
    var volOut = document.getElementById("roomVolumeValue");
    if (vol) {
      vol.addEventListener("input", function () {
        var v = parseInt(vol.value, 10) / 100;
        LongshoreAudio.setVolume(v);
        if (volOut) volOut.textContent = vol.value + "%";
      });
    }

    /* if the engine can never exist, say so politely */
    if (!Ctor()) {
      cards.forEach(function (card) {
        var id = card.getAttribute("data-scene");
        var btn = buttons[id];
        if (btn) { btn.disabled = true; }
        if (stateEls[id]) {
          stateEls[id].textContent =
            "Web Audio is switched off in this browser, so the synth previews can’t run here. " +
            "The libraries themselves are plain WAV files — they play anywhere.";
        }
        var cv = canvases[id];
        if (cv) { cv.style.display = "none"; }
      });
    }
  });
})();
