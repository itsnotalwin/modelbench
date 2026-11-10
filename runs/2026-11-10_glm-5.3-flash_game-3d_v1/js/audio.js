/* Emberwake — synthesised audio: wind, drone pad, event SFX. No samples. */
(function () {
  'use strict';
  const EW = (globalThis.EW = globalThis.EW || {});
  const A = (EW.Sfx = {});
  let ctx = null, master = null;
  let windGain = null, windFilter = null;
  let padOsc = [], padGain = null, padFilter = null;
  let humOsc = null, humGain = null;
  let boostNoise = null, boostGain = null;
  let ready = false, muted = false, volume = 0.8;

  A.ready = () => ready;

  A.init = function () {
    if (ready) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);

      // wind: looping noise through a bandpass
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = last * 0.96 + w * 0.04; // pinkish
        data[i] = last * 3.2;
      }
      const wind = ctx.createBufferSource();
      wind.buffer = buf; wind.loop = true;
      windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass'; windFilter.frequency.value = 500; windFilter.Q.value = 0.6;
      windGain = ctx.createGain(); windGain.gain.value = 0;
      wind.connect(windFilter); windFilter.connect(windGain); windGain.connect(master);
      wind.start();

      // boost whoosh: separate noise channel, gated
      const w2 = ctx.createBufferSource();
      w2.buffer = buf; w2.loop = true;
      const bf = ctx.createBiquadFilter();
      bf.type = 'bandpass'; bf.frequency.value = 900; bf.Q.value = 1.2;
      boostGain = ctx.createGain(); boostGain.gain.value = 0;
      w2.connect(bf); bf.connect(boostGain); boostGain.connect(master);
      w2.start();
      boostNoise = bf;

      // pad: slow warm chord
      padFilter = ctx.createBiquadFilter();
      padFilter.type = 'lowpass'; padFilter.frequency.value = 800;
      padGain = ctx.createGain(); padGain.gain.value = 0.05;
      padFilter.connect(padGain); padGain.connect(master);
      const padNotes = [110, 164.8, 220.0];
      for (const f of padNotes) {
        const o = ctx.createOscillator();
        o.type = 'triangle'; o.frequency.value = f;
        o.detune.value = (Math.random() - 0.5) * 8;
        const g = ctx.createGain(); g.gain.value = 0.33;
        o.connect(g); g.connect(padFilter);
        o.start();
        padOsc.push(o);
      }
      // beacon proximity hum
      humOsc = ctx.createOscillator();
      humOsc.type = 'sine'; humOsc.frequency.value = 196;
      humGain = ctx.createGain(); humGain.gain.value = 0;
      humOsc.connect(humGain); humGain.connect(master);
      humOsc.start();

      ready = true;
      return true;
    } catch (e) {
      console.warn('Audio unavailable:', e);
      return false;
    }
  };

  A.setVolume = function (v) {
    volume = v;
    if (master) master.gain.value = muted ? 0 : volume;
  };
  A.setMuted = function (m) {
    muted = m;
    if (master) master.gain.value = muted ? 0 : volume;
  };
  A.suspend = function () { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); };
  A.resume = function () { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); };

  function env(gainNode, t0, a, peak, d) {
    const g = gainNode.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(peak, 0.0001), t0 + a);
    g.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  function tone(freq, type, a, peak, d, detune) {
    if (!ready) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    const g = ctx.createGain();
    o.connect(g); g.connect(master);
    env(g, t0, a, peak, d);
    o.start(t0); o.stop(t0 + a + d + 0.1);
  }

  const SCALE = [392.0, 440.0, 493.9, 587.3, 659.3, 784.0, 880.0, 987.8, 1174.7];
  A.ember = function (combo) {
    const f = SCALE[Math.min(SCALE.length - 1, combo % SCALE.length)];
    tone(f, 'sine', 0.008, 0.16, 0.5);
    tone(f * 2, 'sine', 0.008, 0.05, 0.3);
  };

  A.graze = function () { tone(1244, 'sine', 0.004, 0.06, 0.12); };
  A.scrape = function () {
    if (!ready) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = windFilter ? null : null;
    // quick noise burst via oscillator trick is poor; use filtered noise
    const len = ctx.sampleRate * 0.25;
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s2 = ctx.createBufferSource(); s2.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g = ctx.createGain(); g.gain.value = 0.35;
    s2.connect(f); f.connect(g); g.connect(master);
    s2.start(t0);
  };
  A.splash = A.scrape;
  A.crash = function () {
    if (!ready) return;
    A.scrape();
    tone(65, 'sine', 0.02, 0.5, 1.2);
  };
  A.beacon = function () {
    if (!ready) return;
    tone(261.6, 'sine', 0.05, 0.22, 2.2);
    tone(392.0, 'sine', 0.25, 0.18, 2.4);
    tone(523.3, 'sine', 0.5, 0.15, 2.6);
    tone(784.0, 'sine', 0.9, 0.10, 2.8);
  };
  A.gate = function () {
    if (!ready) return;
    const notes = [261.6, 329.6, 392.0, 523.3, 659.3, 784.0, 1046.5];
    notes.forEach((f, i) => setTimeout(() => tone(f, 'sine', 0.03, 0.16, 2.5), i * 160));
  };
  A.thunder = function () {
    if (!ready) return;
    const t0 = ctx.currentTime;
    const len = ctx.sampleRate * 1.6;
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = last * 0.985 + (Math.random() * 2 - 1) * 0.15;
      d[i] = last * (1 - i / len);
    }
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
    const g = ctx.createGain(); g.gain.value = 0.9;
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0);
  };
  A.chirp = function () {
    if (!ready) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    const g = ctx.createGain();
    o.connect(g); g.connect(master);
    const f0 = 2200 + Math.random() * 1200;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f0 * 1.6, t0 + 0.06);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t0 + 0.12);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    o.start(t0); o.stop(t0 + 0.2);
  };
  A.dawn = function () {
    if (!ready) return;
    const notes = [130.8, 196.0, 261.6, 329.6, 392.0, 523.3];
    notes.forEach((f, i) => setTimeout(() => tone(f, 'triangle', 0.4, 0.12, 5.0), i * 350));
  };

  A.setBoost = function (on) {
    if (!ready) return;
    const t = ctx.currentTime;
    boostGain.gain.cancelScheduledValues(t);
    boostGain.gain.setTargetAtTime(on ? 0.22 : 0, t, on ? 0.05 : 0.15);
  };

  A.setHum = function (freq, gain) {
    if (!ready) return;
    const t = ctx.currentTime;
    humOsc.frequency.setTargetAtTime(freq, t, 0.2);
    humGain.gain.setTargetAtTime(gain, t, 0.2);
  };

  A.update = function (dt, speed, boostOn, stormIn, dawnF) {
    if (!ready) return;
    const t = ctx.currentTime;
    const sp = Math.min(speed / 95, 1.3);
    windFilter.frequency.setTargetAtTime(320 + sp * 620 + (stormIn ? 260 : 0), t, 0.25);
    windGain.gain.setTargetAtTime(Math.min(0.65, sp * 0.5 + (stormIn ? 0.18 : 0) + (boostOn ? 0.08 : 0)), t, 0.2);
    padFilter.frequency.setTargetAtTime(600 + dawnF * 900, t, 0.5);
    padGain.gain.setTargetAtTime(0.045 + dawnF * 0.02, t, 0.5);
  };

  A.padChord = function (idx) {
    // shift the pad chord up as beacons light
    if (!ready || idx <= 0) return;
    const mult = [1, 1, 1.125, 1.125, 1.25, 1.333, 1.5, 1.5, 1.687][Math.min(idx, 8)];
    const base = [110, 164.8, 220.0];
    padOsc.forEach((o, i) => {
      o.frequency.setTargetAtTime(base[i] * mult, ctx.currentTime, 1.2);
    });
  };
})();
