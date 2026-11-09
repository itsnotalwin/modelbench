/* ============================================================
   HIVEMOTHER — audio: a small WebAudio synthesizer.
   Everything is generated; no assets, no network.
   ============================================================ */
var HM = window.HM = window.HM || {};

HM.audio = (function () {
  var ac = null, master = null, comp = null, noiseBuf = null;
  var ready = false, muted = false;
  var pad = null;                 // ambient meadow drone
  var wasp = null;                // proximity buzz
  var wind = null;                // gust noise loop
  var lastTick = 0;

  function now() { return ac ? ac.currentTime : 0; }

  function init() {
    if (ready) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      comp = ac.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 6;
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(comp); comp.connect(ac.destination);

      // shared noise buffer (2 s)
      var len = ac.sampleRate * 2;
      noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

      buildWaspBuzz();
      buildWind();
      ready = true;
    } catch (e) { ready = false; }
  }

  function resume() {
    if (!ready) init();
    if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
  }

  function setMuted(m) {
    muted = m;
    if (master) { try { master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.05); } catch (e) {} }
  }
  function isMuted() { return muted; }

  /* ---------- primitives ---------- */
  function blip(o) {
    if (!ready || muted) return;
    o = o || {};
    var t0 = now() + (o.delay || 0);
    var dur = o.dur || 0.15;
    var osc = ac.createOscillator();
    var g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0 || 440, t0);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + dur);
    var peak = (o.g == null ? 0.16 : o.g);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (o.atk || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  function noise(o) {
    if (!ready || muted) return;
    o = o || {};
    var t0 = now() + (o.delay || 0);
    var dur = o.dur || 0.2;
    var src = ac.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    var f = ac.createBiquadFilter();
    f.type = o.ftype || 'bandpass';
    f.frequency.setValueAtTime(o.f0 || 800, t0);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.f1), t0 + dur);
    f.Q.value = o.q || 1;
    var g = ac.createGain();
    var peak = (o.g == null ? 0.14 : o.g);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (o.atk || 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  /* ---------- continuous layers ---------- */
  function buildWaspBuzz() {
    var osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 150;
    var lfo = ac.createOscillator(); lfo.frequency.value = 9;
    var lfoG = ac.createGain(); lfoG.gain.value = 18;
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    var filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 900;
    var g = ac.createGain(); g.gain.value = 0;
    osc.connect(filt); filt.connect(g); g.connect(master);
    osc.start(); lfo.start();
    wasp = { g: g, osc: osc };
  }

  function buildWind() {
    var src = ac.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    var f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.6;
    var g = ac.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
    wind = { g: g, f: f };
  }

  function startPad() {
    if (!ready || pad) return;
    var g = ac.createGain(); g.gain.value = 0;
    var filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 420;
    var o1 = ac.createOscillator(); o1.type = 'sine'; o1.frequency.value = 110;
    var o2 = ac.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 164.8; o2.detune.value = 4;
    var o3 = ac.createOscillator(); o3.type = 'sine'; o3.frequency.value = 220; 
    var g3 = ac.createGain(); g3.gain.value = 0.3;
    var lfo = ac.createOscillator(); lfo.frequency.value = 0.07;
    var lfoG = ac.createGain(); lfoG.gain.value = 140;
    lfo.connect(lfoG); lfoG.connect(filt.frequency);
    o1.connect(filt); o2.connect(filt); o3.connect(g3); g3.connect(filt);
    filt.connect(g); g.connect(master);
    o1.start(); o2.start(); o3.start(); lfo.start();
    g.gain.setTargetAtTime(0.045, now(), 2.5);
    pad = { g: g, nodes: [o1, o2, o3, lfo] };
  }
  function stopPad() {
    if (!pad) return;
    var p = pad; pad = null;
    try {
      p.g.gain.setTargetAtTime(0, now(), 0.6);
      setTimeout(function () { p.nodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); }, 2500);
    } catch (e) {}
  }

  /* ---------- one-shot events ---------- */
  function gatherTick(t) {
    if (t - lastTick < 0.12) return;
    lastTick = t;
    blip({ f0: 640 + Math.random() * 120, dur: 0.07, g: 0.045, type: 'sine' });
  }
  function deposit(n) {
    var scale = [523.25, 587.33, 659.25, 783.99, 880];
    var k = Math.min(scale.length - 1, 1 + ((n % 3) | 0));
    blip({ f0: scale[k - 1], dur: 0.16, g: 0.1, type: 'triangle' });
    blip({ f0: scale[k], dur: 0.22, g: 0.1, type: 'triangle', delay: 0.07 });
    blip({ f0: scale[Math.min(scale.length - 1, k + 2)], dur: 0.3, g: 0.07, type: 'sine', delay: 0.15 });
  }
  function pulse() {
    noise({ f0: 1600, f1: 220, dur: 0.34, g: 0.16, q: 0.8 });
    blip({ f0: 300, f1: 90, dur: 0.3, g: 0.13, type: 'sine' });
  }
  function rally() { blip({ f0: 500, f1: 900, dur: 0.12, g: 0.06, type: 'triangle' }); }
  function beeLost() {
    noise({ f0: 500, f1: 120, dur: 0.3, g: 0.2, q: 0.7, ftype: 'lowpass' });
    blip({ f0: 320, f1: 70, dur: 0.32, g: 0.2, type: 'square' });
  }
  function waspStun() { blip({ f0: 900, f1: 2400, dur: 0.1, g: 0.05, type: 'sawtooth' }); }
  function decoy() { blip({ f0: 200, f1: 420, dur: 0.16, g: 0.12, type: 'sine' }); noise({ f0: 900, f1: 300, dur: 0.12, g: 0.05 }); }
  function deny() { blip({ f0: 220, f1: 160, dur: 0.12, g: 0.09, type: 'square' }); }
  function dayStart() {
    blip({ f0: 392, dur: 0.22, g: 0.11, type: 'triangle' });
    blip({ f0: 523.25, dur: 0.34, g: 0.11, type: 'triangle', delay: 0.16 });
  }
  function quotaMet() {
    var s = [523.25, 659.25, 783.99, 1046.5];
    for (var i = 0; i < s.length; i++) blip({ f0: s[i], dur: 0.24, g: 0.09, type: 'triangle', delay: i * 0.09 });
  }
  function gustTele() { noise({ f0: 240, f1: 900, dur: 0.85, g: 0.06, q: 0.5 }); }
  function gustBlow() { noise({ f0: 700, f1: 320, dur: 1.5, g: 0.13, q: 0.5 }); }
  function hatch() { blip({ f0: 620, f1: 980, dur: 0.14, g: 0.08, type: 'sine' }); blip({ f0: 740, f1: 1100, dur: 0.12, g: 0.06, type: 'sine', delay: 0.08 }); }
  function dusk() { blip({ f0: 392, f1: 261, dur: 0.8, g: 0.08, type: 'sine' }); }
  function win() {
    var s = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
    for (var i = 0; i < s.length; i++) blip({ f0: s[i], dur: 0.3, g: 0.1, type: 'triangle', delay: i * 0.14 });
  }
  function lose() {
    var s = [392, 329.6, 261.6, 196];
    for (var i = 0; i < s.length; i++) blip({ f0: s[i], dur: 0.55, g: 0.1, type: 'triangle', delay: i * 0.3 });
  }
  function click() { blip({ f0: 880, dur: 0.05, g: 0.05, type: 'triangle' }); }
  function show() { blip({ f0: 440, dur: 0.1, g: 0.06, type: 'sine' }); }

  /* ---------- per-frame mixing ---------- */
  function tick(dt, nearestWaspD, gustAmt) {
    if (!ready) return;
    var t = now();
    if (wasp) {
      var target = muted ? 0 : (nearestWaspD == null ? 0 : Math.max(0, 1 - nearestWaspD / 460) * 0.075);
      wasp.g.gain.setTargetAtTime(target, t, 0.08);
      if (target > 0.001) {
        var f = 130 + (1 - Math.min(1, nearestWaspD / 460)) * 90;
        wasp.osc.frequency.setTargetAtTime(f, t, 0.1);
      }
    }
    if (wind) {
      wind.g.gain.setTargetAtTime(muted ? 0 : gustAmt * 0.16, t, 0.12);
      wind.f.frequency.setTargetAtTime(420 + gustAmt * 500, t, 0.15);
    }
  }

  return {
    init: init, resume: resume, setMuted: setMuted, isMuted: isMuted,
    startPad: startPad, stopPad: stopPad, tick: tick,
    gatherTick: gatherTick, deposit: deposit, pulse: pulse, rally: rally,
    beeLost: beeLost, waspStun: waspStun, decoy: decoy, deny: deny,
    dayStart: dayStart, quotaMet: quotaMet, gustTele: gustTele, gustBlow: gustBlow,
    hatch: hatch, dusk: dusk, win: win, lose: lose, click: click, show: show
  };
})();
