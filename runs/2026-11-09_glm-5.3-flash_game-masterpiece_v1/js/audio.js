/* ============================================================
   THE LONG LIGHT — audio.js
   a sea, a wind, a lamp, a bell, a hum — all built from oscillators
   ============================================================ */
"use strict";
window.Snd = (function () {

  let ctx = null;
  let master = null, musicBus = null, ambBus = null, sfxBus = null;
  let delayNode = null, delayFb = null, delayWet = null;
  let started = false;
  let vol = { music: 0.55, amb: 0.7, sfx: 0.8 };
  let muted = false;

  // ambience nodes
  let sea = null, wind = null, rain = null, hum = null, humGain = null;
  let gullTimer = 0, ambScene = "none", weather = "clear", ambIntensity = 1;
  let watchTimer = null, watchTempo = 1.0;

  // music scheduler
  let musicTimer = null, mood = null, nextChordAt = 0, chordIdx = 0;

  const NOW = () => (ctx ? ctx.currentTime : 0);

  function noiseBuffer(seconds, brown) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      else d[i] = w;
    }
    return buf;
  }
  let nWhite = null, nBrown = null;

  /* ---------------- core ---------------- */

  function ensure() {
    if (started) {
      if (ctx && ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.connect(master);
      ambBus = ctx.createGain(); ambBus.connect(master);
      sfxBus = ctx.createGain(); sfxBus.connect(master);
      // a small shared space: feedback delay as cheap reverb-ish tail
      delayNode = ctx.createDelay(1.2); delayNode.delayTime.value = 0.42;
      delayFb = ctx.createGain(); delayFb.gain.value = 0.34;
      delayWet = ctx.createGain(); delayWet.gain.value = 0.35;
      const dampen = ctx.createBiquadFilter(); dampen.type = "lowpass"; dampen.frequency.value = 1600;
      delayNode.connect(dampen); dampen.connect(delayFb); delayFb.connect(delayNode);
      delayNode.connect(delayWet); delayWet.connect(master);
      nWhite = noiseBuffer(2, false);
      nBrown = noiseBuffer(3, true);
      applyVolumes();
      started = true;
      if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
      return true;
    } catch (e) {
      ctx = null; started = false;
      return false;
    }
  }

  function applyVolumes() {
    if (!started) return;
    musicBus.gain.value = muted ? 0 : vol.music * 0.5;
    ambBus.gain.value = muted ? 0 : vol.amb * 0.8;
    sfxBus.gain.value = muted ? 0 : vol.sfx;
  }

  function setVolumes(m, a, s) {
    if (m !== undefined && m !== null) vol.music = m;
    if (a !== undefined && a !== null) vol.amb = a;
    if (s !== undefined && s !== null) vol.sfx = s;
    applyVolumes();
  }
  function setMuted(v) { muted = !!v; applyVolumes(); }

  function suspend() { if (ctx && ctx.state === "running") { try { ctx.suspend(); } catch (e) {} } }
  function resume() { if (ctx && ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} } }

  /* ---------------- helpers ---------------- */

  function env(g, t0, a, peak, hold, rel, endVal) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    if (hold > 0) g.gain.setValueAtTime(peak, t0 + a + hold);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, endVal !== undefined ? endVal : 0.0001), t0 + a + hold + rel);
  }

  function osc(type, freq, dest, t0, dur, peak, attack, detune) {
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (detune) o.detune.value = detune;
    const g = ctx.createGain();
    env(g, t0, attack || 0.01, peak, 0, dur, 0.0001);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + (attack || 0.01) + 0.1);
    return o;
  }

  /* ---------------- ambience ---------------- */

  function startAmbience() {
    if (!started || sea) return;
    try {
      // sea: brown noise, slow swell LFO
      const src = ctx.createBufferSource(); src.buffer = nBrown; src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
      const g = ctx.createGain(); g.gain.value = 0.5;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.22;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      src.connect(lp); lp.connect(g); g.connect(ambBus);
      src.start(); lfo.start();
      sea = { src: src, g: g, lp: lp };

      // wind: white noise through wandering bandpass
      const wsrc = ctx.createBufferSource(); wsrc.buffer = nWhite; wsrc.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 500; bp.Q.value = 0.8;
      const wg = ctx.createGain(); wg.gain.value = 0.12;
      const wlfo = ctx.createOscillator(); wlfo.frequency.value = 0.05;
      const wlfoG = ctx.createGain(); wlfoG.gain.value = 260;
      wlfo.connect(wlfoG); wlfoG.connect(bp.frequency);
      const glfo = ctx.createOscillator(); glfo.frequency.value = 0.11;
      const glfoG = ctx.createGain(); glfoG.gain.value = 0.06;
      glfo.connect(glfoG); glfoG.connect(wg.gain);
      wsrc.connect(bp); bp.connect(wg); wg.connect(ambBus);
      wsrc.start(); wlfo.start(); glfo.start();
      wind = { src: wsrc, g: wg, bp: bp };

      // rain: white noise, highpassed, silent until weather says otherwise
      const rsrc = ctx.createBufferSource(); rsrc.buffer = nWhite; rsrc.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2400;
      const rg = ctx.createGain(); rg.gain.value = 0.0001;
      rsrc.connect(hp); hp.connect(rg); rg.connect(ambBus);
      rsrc.start();
      rain = { src: rsrc, g: rg };

      // the hum of the Lending: two close sines that beat, plus a sub
      humGain = ctx.createGain(); humGain.gain.value = 0.0001;
      const h1 = ctx.createOscillator(); h1.type = "sine"; h1.frequency.value = 48;
      const h2 = ctx.createOscillator(); h2.type = "sine"; h2.frequency.value = 48.6;
      const h3 = ctx.createOscillator(); h3.type = "sine"; h3.frequency.value = 24;
      const h3g = ctx.createGain(); h3g.gain.value = 0.7;
      h1.connect(humGain); h2.connect(humGain); h3.connect(h3g); h3g.connect(humGain);
      humGain.connect(ambBus);
      h1.start(); h2.start(); h3.start();
      hum = { o1: h1, o2: h2, o3: h3 };
    } catch (e) { sea = null; }
  }

  function setAmbScene(scene) {
    ensure(); if (!started) return;
    startAmbience();
    ambScene = scene;
    gullTimer = performance.now() + 3000 + Math.random() * 8000;
    retuneAmbience();
  }

  function retuneAmbience() {
    if (!sea) return;
    const t = NOW();
    let seaLvl = 0.4, windLvl = 0.1, rainLvl = 0.0001;
    const W = weather;
    if (W === "mist") { seaLvl = 0.34; windLvl = 0.05; }
    else if (W === "fog") { seaLvl = 0.3; windLvl = 0.04; }
    else if (W === "rain") { seaLvl = 0.44; windLvl = 0.16; rainLvl = 0.05; }
    else if (W === "squall") { seaLvl = 0.55; windLvl = 0.24; rainLvl = 0.1; }
    else if (W === "storm") { seaLvl = 0.66; windLvl = 0.34; rainLvl = 0.16; }
    if (ambScene === "title") { seaLvl *= 0.8; windLvl *= 0.8; }
    if (ambScene === "night") { seaLvl *= 0.55; windLvl *= 0.7; }
    if (ambScene === "ending") { seaLvl *= 0.7; windLvl *= 0.5; }
    const k = ambIntensity;
    sea.g.gain.setTargetAtTime(seaLvl * k, t, 1.5);
    wind.g.gain.setTargetAtTime(windLvl * k, t, 1.5);
    rain.g.gain.setTargetAtTime(rainLvl * k, t, 1.5);
  }

  function setWeather(w) { weather = w || "clear"; retuneAmbience(); }
  function setAmbIntensity(k) { ambIntensity = k; retuneAmbience(); }

  function setHum(level) {
    ensure(); if (!started || !humGain) return;
    humGain.gain.setTargetAtTime(level > 0 ? 0.05 + level * 0.22 : 0.0001, NOW(), 0.6);
  }

  function gulls(on) {
    ensure(); if (!started || !on) return;
    gullTimer = performance.now() + 1200;
  }

  function update(now) {
    if (!started || !sea) return;
    // daytime gull cries
    if ((ambScene === "day" || ambScene === "title") && gullTimer && now > gullTimer) {
      const chance = weather === "clear" ? 0.8 : weather === "mist" ? 0.4 : 0.15;
      if (Math.random() < chance) cryGull();
      gullTimer = now + 5000 + Math.random() * 12000;
    }
  }

  function cryGull() {
    if (!sfxBus) return;
    const t = NOW() + Math.random() * 0.3;
    const base = 1500 + Math.random() * 500;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      const t0 = t + i * 0.22;
      const o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(base, t0);
      o.frequency.exponentialRampToValueAtTime(base * 0.55, t0 + 0.18);
      const g = ctx.createGain();
      env(g, t0, 0.02, 0.02, 0, 0.2);
      o.connect(g); g.connect(sfxBus);
      o.start(t0); o.stop(t0 + 0.3);
    }
  }

  /* ---------------- one-shot effects ---------------- */

  function play(name, opt) {
    ensure(); if (!started) return;
    opt = opt || {};
    const t = NOW() + 0.01;
    try {
      switch (name) {
        case "click": {
          osc("triangle", 660, sfxBus, t, 0.05, 0.06, 0.005);
          break;
        }
        case "select": {
          osc("sine", 520, sfxBus, t, 0.12, 0.08, 0.005);
          osc("sine", 780, sfxBus, t + 0.03, 0.14, 0.05, 0.005);
          break;
        }
        case "page": {
          const s = ctx.createBufferSource(); s.buffer = nWhite;
          const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800; bp.Q.value = 0.6;
          const g = ctx.createGain();
          env(g, t, 0.01, 0.1, 0.02, 0.18);
          s.connect(bp); bp.connect(g); g.connect(sfxBus);
          s.start(t); s.stop(t + 0.3);
          break;
        }
        case "telegraph": {
          const n = 4 + Math.floor(Math.random() * 4);
          for (let i = 0; i < n; i++) {
            const t0 = t + i * (0.08 + Math.random() * 0.05);
            const s = ctx.createBufferSource(); s.buffer = nWhite;
            const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3000;
            const g = ctx.createGain();
            env(g, t0, 0.002, 0.14, 0.005, 0.03);
            s.connect(hp); hp.connect(g); g.connect(sfxBus);
            s.start(t0); s.stop(t0 + 0.06);
          }
          break;
        }
        case "bell": {
          const n = opt.times || 1;
          for (let i = 0; i < n; i++) strikeBell(t + i * 1.5, opt.mend === false);
          break;
        }
        case "foghorn": {
          const o = ctx.createOscillator(); o.type = "sawtooth";
          o.frequency.setValueAtTime(62, t);
          o.frequency.linearRampToValueAtTime(58, t + 2.2);
          const o2 = ctx.createOscillator(); o2.type = "sawtooth"; o2.frequency.value = 78;
          const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 220; lp.Q.value = 2;
          const g = ctx.createGain();
          env(g, t, 0.5, 0.4, 0.8, 1.4);
          o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(sfxBus);
          g.connect(delayNode);
          o.start(t); o.stop(t + 3); o2.start(t); o2.stop(t + 3);
          break;
        }
        case "flame": {
          const s = ctx.createBufferSource(); s.buffer = nWhite;
          const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
          const g = ctx.createGain();
          env(g, t, 0.02, 0.08, 0.05, 0.25);
          s.connect(lp); lp.connect(g); g.connect(sfxBus);
          s.start(t); s.stop(t + 0.4);
          break;
        }
        case "pump": {
          for (let i = 0; i < 2; i++) {
            const t0 = t + i * 0.22;
            const o = ctx.createOscillator(); o.type = "triangle";
            o.frequency.setValueAtTime(140, t0);
            o.frequency.exponentialRampToValueAtTime(70, t0 + 0.12);
            const g = ctx.createGain();
            env(g, t0, 0.01, 0.14, 0.02, 0.14);
            o.connect(g); g.connect(sfxBus);
            o.start(t0); o.stop(t0 + 0.3);
          }
          break;
        }
        case "trim": {
          for (let i = 0; i < 3; i++) {
            const t0 = t + i * 0.09;
            const s = ctx.createBufferSource(); s.buffer = nWhite;
            const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2600;
            const g = ctx.createGain();
            env(g, t0, 0.003, 0.07, 0.01, 0.05);
            s.connect(hp); hp.connect(g); g.connect(sfxBus);
            s.start(t0); s.stop(t0 + 0.1);
          }
          break;
        }
        case "creak": {
          const o = ctx.createOscillator(); o.type = "sawtooth";
          o.frequency.setValueAtTime(88, t);
          o.frequency.linearRampToValueAtTime(64, t + 1.4);
          const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 300;
          const g = ctx.createGain();
          env(g, t, 0.3, 0.06, 0.4, 0.8);
          o.connect(lp); lp.connect(g); g.connect(sfxBus);
          o.start(t); o.stop(t + 1.8);
          break;
        }
        case "chime": { // a thing learned, a thing given
          const f = 523.25;
          [1, 1.5, 2].forEach((r, i) => {
            osc("sine", f * r, sfxBus, t + i * 0.09, 1.4 - i * 0.3, 0.09, 0.01);
          });
          break;
        }
        case "wave": {
          const s = ctx.createBufferSource(); s.buffer = nBrown;
          const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
          const g = ctx.createGain();
          env(g, t, 0.3, 0.3, 0.2, 1.6);
          s.connect(lp); lp.connect(g); g.connect(sfxBus);
          s.start(t); s.stop(t + 2.4);
          break;
        }
        case "thunder": {
          const s = ctx.createBufferSource(); s.buffer = nBrown;
          const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 240;
          const g = ctx.createGain();
          env(g, t, 0.08, 0.5, 0.3, 2.6);
          s.connect(lp); lp.connect(g); g.connect(sfxBus);
          s.start(t); s.stop(t + 3.2);
          break;
        }
        case "splash": {
          const s = ctx.createBufferSource(); s.buffer = nWhite;
          const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1200; bp.Q.value = 0.4;
          const g = ctx.createGain();
          env(g, t, 0.02, 0.2, 0.05, 0.5);
          s.connect(bp); bp.connect(g); g.connect(sfxBus);
          s.start(t); s.stop(t + 0.7);
          break;
        }
        case "hornsafe": {
          osc("sine", 392, sfxBus, t, 0.5, 0.08, 0.02);
          osc("sine", 587.33, sfxBus, t + 0.12, 0.6, 0.07, 0.02);
          break;
        }
        case "shipbell": {
          strikeBell(t, false, 880);
          break;
        }
        case "keeper-note": { // rhythm: the lantern answers
          osc("triangle", 220, sfxBus, t, 0.5, 0.2, 0.01);
          osc("sine", 440, sfxBus, t, 0.35, 0.08, 0.01);
          break;
        }
        case "sea-note": { // rhythm: the water asks
          osc("sine", 110, sfxBus, t, 1.1, 0.22, 0.15);
          osc("sine", 164, sfxBus, t + 0.05, 0.8, 0.07, 0.15);
          break;
        }
        case "oar": {
          for (let i = 0; i < 2; i++) {
            const s = ctx.createBufferSource(); s.buffer = nWhite;
            const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 700; bp.Q.value = 0.5;
            const g = ctx.createGain();
            env(g, t + i * 0.7, 0.05, 0.06, 0.1, 0.3);
            s.connect(bp); bp.connect(g); g.connect(sfxBus);
            s.start(t + i * 0.7); s.stop(t + i * 0.7 + 0.5);
          }
          break;
        }
        case "ink": { // signing the log
          const s = ctx.createBufferSource(); s.buffer = nWhite;
          const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3400; bp.Q.value = 1.2;
          const g = ctx.createGain();
          env(g, t, 0.005, 0.05, 0.005, 0.1);
          s.connect(bp); bp.connect(g); g.connect(sfxBus);
          s.start(t); s.stop(t + 0.2);
          break;
        }
      }
    } catch (e) { /* audio must never break the game */ }
  }

  function strikeBell(t0, cracked, base) {
    try {
      const f = base || (cracked ? 415 : 440);
      const parts = [1, 2.01, 2.74, 4.1];
      const amps = [0.3, 0.14, 0.08, 0.04];
      parts.forEach((r, i) => {
        const o = ctx.createOscillator(); o.type = "sine";
        o.frequency.value = f * r * (cracked ? (1 + (i % 2) * 0.011) : 1);
        const g = ctx.createGain();
        env(g, t0, 0.004, amps[i], 0.02, cracked ? 0.9 : 1.6);
        o.connect(g); g.connect(sfxBus);
        if (i === 0) g.connect(delayNode);
        o.start(t0); o.stop(t0 + 2.2);
      });
      const s = ctx.createBufferSource(); s.buffer = nWhite;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2000;
      const g = ctx.createGain(); env(g, t0, 0.002, 0.08, 0.004, 0.03);
      s.connect(hp); hp.connect(g); g.connect(sfxBus);
      s.start(t0); s.stop(t0 + 0.06);
    } catch (e) { /* ignore */ }
  }

  /* ---------------- the ticking watch (Jory's) ---------------- */

  function startWatch() {
    ensure(); if (!started || watchTimer) return;
    const tickFn = () => {
      try {
        const t = NOW() + 0.01;
        osc("sine", 2100, sfxBus, t, 0.03, 0.045, 0.002);
        osc("sine", 1700, sfxBus, t + 0.12, 0.03, 0.035, 0.002);
      } catch (e) {}
    };
    const loop = () => {
      tickFn();
      const base = 1000 / Math.max(0.5, Math.min(2.4, watchTempo));
      watchTimer = setTimeout(loop, base + (Math.random() * 60 - 30));
    };
    loop();
  }
  function setWatchTempo(t) { watchTempo = t; }
  function stopWatch() { if (watchTimer) { clearTimeout(watchTimer); watchTimer = null; } }

  /* ---------------- music ---------------- */
  // slow generative pads; a mood is a scale root + intervals + tempo

  const MOODS = {
    warm:  { root: 146.83, steps: [0, 7, 14, 16, 21], every: 9.0, pluck: 0.4, bright: 1500 },  // D — low water
    grey:  { root: 130.81, steps: [0, 3, 7, 10, 14],  every: 8.0, pluck: 0.25, bright: 1100 }, // C minor — the stowaway
    slate: { root: 110.00, steps: [0, 7, 12, 15, 19], every: 8.5, pluck: 0.3, bright: 1200 },  // A — widow's reach
    dusk:  { root: 98.00,  steps: [0, 3, 7, 10, 15],  every: 7.0, pluck: 0.2, bright: 900 },   // G minor — remembering
    storm: { root: 87.31,  steps: [0, 1, 7, 8, 13],   every: 6.0, pluck: 0.08, bright: 700 },  // F — the last night
    hope:  { root: 146.83, steps: [0, 4, 7, 11, 16],  every: 7.5, pluck: 0.5, bright: 1800 },  // D — first light
  };

  function music(m) {
    ensure(); if (!started) return;
    mood = m;
    if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
    if (!m) return;
    chordIdx = 0; nextChordAt = NOW() + 0.4;
    scheduleMusic();
  }

  function scheduleMusic() {
    if (!mood || !ctx) return;
    const wait = Math.max(200, (nextChordAt - NOW()) * 1000);
    musicTimer = setTimeout(() => {
      if (!mood || !ctx) return;
      try { playChord(); } catch (e) {}
      const cfg = MOODS[mood];
      nextChordAt = NOW() + cfg.every * (0.9 + Math.random() * 0.25);
      scheduleMusic();
    }, wait);
  }

  function semitone(root, steps) {
    return root * Math.pow(2, steps / 12);
  }

  function playChord() {
    const cfg = MOODS[mood];
    const t = NOW() + 0.05;
    const steps = cfg.steps;
    const n = 3 + (Math.random() < 0.4 ? 1 : 0);
    const picked = [];
    for (let i = 0; i < n; i++) {
      const s = steps[Math.floor(Math.random() * steps.length)];
      if (picked.indexOf(s) === -1) picked.push(s);
    }
    if (picked.indexOf(0) === -1) picked.unshift(0);
    picked.forEach((s, i) => {
      const f = semitone(cfg.root, s);
      const o = ctx.createOscillator(); o.type = i === 0 ? "sine" : "triangle";
      o.frequency.value = f * (Math.random() < 0.5 ? 1 : 2);
      o.detune.value = (Math.random() * 10 - 5);
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = cfg.bright;
      const g = ctx.createGain();
      const peak = 0.05 / (1 + i * 0.6);
      env(g, t, 2.8, peak, 2.5, 4.5);
      o.connect(lp); lp.connect(g);
      g.connect(musicBus); g.connect(delayNode);
      o.start(t); o.stop(t + 11);
    });
    if (Math.random() < cfg.pluck) {
      const s = steps[Math.floor(Math.random() * steps.length)] + 12;
      pluckNote(semitone(cfg.root, s), t + 2 + Math.random() * 3);
    }
  }

  function pluckNote(f, t) {
    const o = ctx.createOscillator(); o.type = "triangle";
    o.frequency.value = f;
    const g = ctx.createGain();
    env(g, t, 0.01, 0.08, 0.05, 1.6);
    o.connect(g); g.connect(musicBus); g.connect(delayNode);
    o.start(t); o.stop(t + 2.2);
  }

  function duck(on) {
    if (!started) return;
    musicBus.gain.setTargetAtTime(muted ? 0 : vol.music * (on ? 0.18 : 0.5), NOW(), on ? 0.15 : 0.8);
  }

  /* ---------------- ritual helper ---------------- */
  function note(who) { play(who === "sea" ? "sea-note" : "keeper-note"); }

  return {
    ensure, play, music, duck,
    setVolumes, setMuted, setAmbScene, setWeather, setAmbIntensity, setHum,
    gulls, update, suspend, resume,
    startWatch, setWatchTempo, stopWatch,
    note,
    isStarted: () => started,
  };
})();
