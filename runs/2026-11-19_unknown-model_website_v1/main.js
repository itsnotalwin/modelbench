/* ==========================================================================
   STATIC — main.js
   All interactivity, generative canvases, Web Audio tuner.
   ========================================================================== */
(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  /* ============================================================
     Utility: canvas setup with DPR
     ============================================================ */
  function setupCanvas(canvas, w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const width = w || rect.width;
    const height = h || rect.height;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width, height, dpr };
  }

  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  /* ============================================================
     Top-bar clock
     ============================================================ */
  function initClock() {
    const el = document.querySelector('[data-clock]');
    if (!el) return;
    const tick = () => {
      const d = new Date();
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      const ss = String(d.getUTCSeconds()).padStart(2, '0');
      el.textContent = `${hh}:${mm}:${ss} UTC`;
    };
    tick();
    if (!prefersReducedMotion) setInterval(tick, 1000);
  }

  /* ============================================================
     HERO static canvas — grain / TV static + horizontal band sweep
     Uses a 1x1 scaled ImageData trick for performance.
     ============================================================ */
  function initHero() {
    const canvas = document.querySelector('[data-hero-canvas]');
    if (!canvas) return;

    let ctx, buf, buf32, fullW, fullH, rafId, frame = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1); // keep DPR=1 for speed on big hero
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      ctx = canvas.getContext('2d', { alpha: false });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fullW = canvas.width;
      fullH = canvas.height;
      buf = ctx.createImageData(fullW, fullH);
      buf32 = new Uint32Array(buf.data.buffer);
    }
    resize();

    // Use a coarser grid for speed: generate at 1/2 resolution then scale
    const PIXEL_SIZE = 2;
    let lowW, lowH, lowBuf, low32;
    function resizeLow() {
      lowW = Math.ceil(fullW / PIXEL_SIZE);
      lowH = Math.ceil(fullH / PIXEL_SIZE);
      lowBuf = ctx.createImageData(lowW, lowH);
      low32 = new Uint32Array(lowBuf.data.buffer);
    }
    resizeLow();
    const off = document.createElement('canvas');
    const offCtx = off.getContext('2d');

    function draw() {
      frame++;
      const bandCenter = 0.5 + Math.sin(frame * 0.005) * 0.12;
      for (let y = 0; y < lowH; y++) {
        const yn = y / lowH;
        const bandWeight = Math.exp(-Math.pow((yn - bandCenter) * 2.4, 2));
        for (let x = 0; x < lowW; x++) {
          let v = (Math.random() * 255) | 0;
          v = (v * (0.55 + bandWeight * 0.9)) | 0;
          if (v < 0) v = 0;
          if (v > 255) v = 255;
          low32[y * lowW + x] = 0xff000000 | (v << 16) | (v << 8) | v;
        }
      }
      off.width = lowW;
      off.height = lowH;
      offCtx.putImageData(lowBuf, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, fullW, fullH);

      if (!prefersReducedMotion) {
        rafId = requestAnimationFrame(draw);
      } else {
        // One static render
      }
    }

    draw();

    let resizeT;
    window.addEventListener('resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        cancelAnimationFrame(rafId);
        resize();
        resizeLow();
        draw();
      }, 150);
    });
  }

  /* ============================================================
     TUNER — canvas (visual frequency spectrum / scan line)
     + Web Audio radio with noise + simulated stations
     ============================================================ */
  function initTuner() {
    const canvas = document.querySelector('[data-tuner-canvas]');
    if (!canvas) return;
    const slider = document.querySelector('[data-tuner-slider]');
    const freqLabel = document.querySelector('[data-tuner-freq]');
    const stationLabel = document.querySelector('[data-tuner-station]');
    const audioBtn = document.querySelector('[data-tuner-audio]');
    const stationButtons = document.querySelectorAll('[data-station]');
    if (!slider || !freqLabel) return;

    let ctx;

    // Stations — frequencies in MHz (530–1700 kHz AM-ish scaled to 53–170 display)
    const stations = [
      { freq: 62, name: 'Noise', kind: 'noise' },
      { freq: 71, name: 'Carrier', kind: 'carrier' },
      { freq: 88, name: 'Numbers', kind: 'numbers' },
      { freq: 103, name: 'Sweep', kind: 'sweep' },
      { freq: 120, name: 'Silence', kind: 'silence' },
      { freq: 145, name: 'Pulse', kind: 'pulse' },
      { freq: 160, name: 'Drift', kind: 'drift' },
    ];

    let tunedFreq = 62;
    function setTunedFreq(f, fromButton) {
      tunedFreq = Math.max(53, Math.min(170, f));
      slider.value = String(tunedFreq);
      freqLabel.textContent = tunedFreq.toFixed(1) + ' MHz';
      // Find nearest station
      const nearest = stations.reduce((best, s) => {
        const d = Math.abs(s.freq - tunedFreq);
        return d < best.d ? { s, d } : best;
      }, { s: null, d: Infinity });
      const locked = nearest.d < 2.2;
      if (locked) {
        stationLabel.textContent = nearest.s.name;
        stationLabel.classList.add('live');
      } else {
        stationLabel.textContent = '— off the air —';
        stationLabel.classList.remove('live');
      }
      // Highlight station button if match
      stationButtons.forEach(btn => {
        const ff = parseFloat(btn.dataset.station);
        btn.classList.toggle('active', ff === nearest.s?.freq && locked);
      });
      // Update audio
      if (audio) {
        tuneAudio(tunedFreq, locked ? nearest.s : null);
      }
    }

    slider.addEventListener('input', () => {
      setTunedFreq(parseFloat(slider.value));
    });
    stationButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        setTunedFreq(parseFloat(btn.dataset.station), true);
      });
    });

    // Keyboard: arrow nudge
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { setTunedFreq(tunedFreq - 0.5); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setTunedFreq(tunedFreq + 0.5); e.preventDefault(); }
    });

    /* ---------- Web Audio ---------- */
    let audio = null;
    let audioNodes = {};
    let isAudioOn = false;
    let currentAudioStation = null;
    let modInterval = null;

    function createNoiseBuffer(aCtx, seconds, color) {
      const length = aCtx.sampleRate * seconds;
      const buffer = aCtx.createBuffer(1, length, aCtx.sampleRate);
      const data = buffer.getChannelData(0);
      if (color === 'white') {
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      } else if (color === 'pink') {
        let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
        for (let i = 0; i < length; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.96900 * b2 + w * 0.1538520;
          b3 = 0.86650 * b3 + w * 0.3104856;
          b4 = 0.55000 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        }
      } else if (color === 'brown') {
        let last = 0;
        for (let i = 0; i < length; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + 0.02 * w) / 1.02;
          data[i] = last * 3.5;
        }
      }
      return buffer;
    }

    function startAudio() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const aCtx = new AC();
      const master = aCtx.createGain();
      master.gain.value = 0.0;
      master.connect(aCtx.destination);

      // Noise sources
      const whiteSrc = aCtx.createBufferSource();
      whiteSrc.buffer = createNoiseBuffer(aCtx, 3, 'white');
      whiteSrc.loop = true;
      const whiteGain = aCtx.createGain();
      whiteGain.gain.value = 0.0;
      const whiteFilter = aCtx.createBiquadFilter();
      whiteFilter.type = 'bandpass';
      whiteFilter.frequency.value = 2000;
      whiteFilter.Q.value = 0.8;
      whiteSrc.connect(whiteFilter).connect(whiteGain).connect(master);

      // Pink noise (between-station static)
      const pinkSrc = aCtx.createBufferSource();
      pinkSrc.buffer = createNoiseBuffer(aCtx, 4, 'pink');
      pinkSrc.loop = true;
      const pinkGain = aCtx.createGain();
      pinkGain.gain.value = 0.6;
      pinkSrc.connect(pinkGain).connect(master);

      // Oscillator for carriers/signal
      const osc = aCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 440;
      const oscGain = aCtx.createGain();
      oscGain.gain.value = 0;
      const oscLFO = aCtx.createOscillator();
      oscLFO.frequency.value = 0;
      const oscLFOGain = aCtx.createGain();
      oscLFOGain.gain.value = 0;
      oscLFO.connect(oscLFOGain).connect(osc.frequency);
      osc.connect(oscGain).connect(master);

      // Second oscillator for numbers/tremolo
      const osc2 = aCtx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.value = 800;
      const osc2Gain = aCtx.createGain();
      osc2Gain.gain.value = 0;
      const trem = aCtx.createOscillator();
      trem.frequency.value = 0;
      const tremGain = aCtx.createGain();
      tremGain.gain.value = 0.5;
      trem.connect(tremGain).connect(osc2Gain.gain);
      osc2.connect(osc2Gain).connect(master);

      whiteSrc.start();
      pinkSrc.start();
      osc.start();
      oscLFO.start();
      osc2.start();
      trem.start();

      audio = aCtx;
      audioNodes = {
        master, whiteGain, pinkGain, whiteFilter,
        osc, oscGain, oscLFO, oscLFOGain,
        osc2, osc2Gain, trem, tremGain,
      };
      // Fade master up
      master.gain.linearRampToValueAtTime(0.28, aCtx.currentTime + 0.4);
      startModulation();
    }

    function stopAudio() {
      if (!audio) return;
      stopModulation();
      const m = audioNodes.master;
      m.gain.cancelScheduledValues(audio.currentTime);
      m.gain.linearRampToValueAtTime(0, audio.currentTime + 0.2);
      setTimeout(() => {
        try { audio.close(); } catch (e) {}
        audio = null;
        audioNodes = {};
        currentAudioStation = null;
      }, 260);
    }

    function tuneAudio(freq, station) {
      if (!audio) return;
      const n = audioNodes;
      const t = audio.currentTime;
      // Map freq (53-170) to filter center (200-4500)
      const norm = (freq - 53) / (170 - 53);
      const centerFreq = 200 + norm * 4200;
      n.whiteFilter.frequency.setTargetAtTime(centerFreq, t, 0.05);
      // Signal strength
      const nearest = stations.reduce((best, s) => {
        const d = Math.abs(s.freq - freq);
        return d < best.d ? { s, d } : best;
      }, { s: null, d: Infinity });
      const signalStrength = Math.max(0, 1 - nearest.d / 10);
      const staticGain = Math.max(0.1, 1 - signalStrength * 0.85);
      n.pinkGain.gain.setTargetAtTime(staticGain * 0.4, t, 0.1);
      n.whiteGain.gain.setTargetAtTime(signalStrength > 0.5 ? (signalStrength - 0.5) * 0.8 : 0, t, 0.1);

      currentAudioStation = (station && signalStrength > 0.6) ? station : null;

      if (currentAudioStation) {
        // Reset modulation LFOs before applying per-station settings
        n.oscLFO.frequency.setTargetAtTime(0, t, 0.05);
        n.oscLFOGain.gain.setTargetAtTime(0, t, 0.05);
        n.trem.frequency.setTargetAtTime(0, t, 0.05);

        switch (currentAudioStation.kind) {
          case 'noise':
            n.oscGain.gain.setTargetAtTime(0, t, 0.05);
            n.osc2Gain.gain.setTargetAtTime(0, t, 0.05);
            n.whiteGain.gain.setTargetAtTime(0.6, t, 0.05);
            n.whiteFilter.Q.value = 4;
            break;
          case 'carrier':
            n.oscGain.gain.setTargetAtTime(0.25, t, 0.05);
            n.osc.type = 'sine';
            n.osc.frequency.setTargetAtTime(440, t, 0.05);
            n.osc2Gain.gain.setTargetAtTime(0, t, 0.05);
            break;
          case 'numbers':
            n.oscGain.gain.setTargetAtTime(0, t, 0.05);
            n.osc2.type = 'square';
            n.osc2Gain.gain.setTargetAtTime(0.18, t, 0.05);
            n.trem.frequency.setTargetAtTime(8, t, 0.05);
            n.osc2.frequency.setTargetAtTime(500 + Math.random() * 800, t, 0.05);
            break;
          case 'sweep':
            n.oscGain.gain.setTargetAtTime(0.2, t, 0.05);
            n.osc.type = 'sawtooth';
            n.osc2Gain.gain.setTargetAtTime(0, t, 0.05);
            // Use a slow saw LFO (0.3 Hz) modulating frequency from ~200 to ~2200
            n.osc.frequency.setValueAtTime(1100, t);
            n.oscLFO.type = 'sawtooth';
            n.oscLFO.frequency.setTargetAtTime(0.35, t, 0.05);
            n.oscLFOGain.gain.setTargetAtTime(900, t, 0.05);
            break;
          case 'silence':
            n.oscGain.gain.setTargetAtTime(0, t, 0.05);
            n.osc2Gain.gain.setTargetAtTime(0, t, 0.05);
            n.pinkGain.gain.setTargetAtTime(0.02, t, 0.1);
            n.whiteGain.gain.setTargetAtTime(0, t, 0.05);
            break;
          case 'pulse':
            n.oscGain.gain.setTargetAtTime(0.2, t, 0.05);
            n.osc.type = 'sine';
            n.osc.frequency.setTargetAtTime(120, t, 0.05);
            n.oscLFO.type = 'sine';
            n.oscLFO.frequency.setTargetAtTime(1.6, t, 0.05);
            n.oscLFOGain.gain.setTargetAtTime(90, t, 0.05);
            n.osc2Gain.gain.setTargetAtTime(0, t, 0.05);
            break;
          case 'drift':
            n.oscGain.gain.setTargetAtTime(0.12, t, 0.05);
            n.osc.type = 'sine';
            n.osc.frequency.setTargetAtTime(330, t, 0.05);
            n.oscLFO.type = 'sine';
            n.oscLFO.frequency.setTargetAtTime(0.12, t, 0.05);
            n.oscLFOGain.gain.setTargetAtTime(35, t, 0.05);
            n.osc2.type = 'sine';
            n.osc2Gain.gain.setTargetAtTime(0.08, t, 0.05);
            n.osc2.frequency.setTargetAtTime(332, t, 0.05);
            break;
        }
      } else {
        n.oscGain.gain.setTargetAtTime(0, t, 0.1);
        n.osc2Gain.gain.setTargetAtTime(0, t, 0.1);
        n.oscLFOGain.gain.setTargetAtTime(0, t, 0.1);
      }
    }

    // Periodic modulation for stations that need it (numbers pitch changes)
    function startModulation() {
      if (modInterval) return;
      modInterval = setInterval(() => {
        if (!audio || !currentAudioStation) return;
        const n = audioNodes;
        const t = audio.currentTime;
        if (currentAudioStation.kind === 'numbers') {
          n.osc2.frequency.setTargetAtTime(450 + Math.random() * 900, t + 0.02);
          n.osc2Gain.gain.setTargetAtTime(Math.random() < 0.3 ? 0 : 0.18, t + 0.02);
        }
      }, 220);
    }
    function stopModulation() {
      if (modInterval) { clearInterval(modInterval); modInterval = null; }
    }

    audioBtn.addEventListener('click', () => {
      if (isAudioOn) {
        stopAudio();
        audioBtn.textContent = 'Enable audio';
        audioBtn.setAttribute('aria-pressed', 'false');
        isAudioOn = false;
      } else {
        startAudio();
        audioBtn.textContent = 'Mute';
        audioBtn.setAttribute('aria-pressed', 'true');
        isAudioOn = true;
        tuneAudio(tunedFreq, findNearestStation());
      }
    });

    function findNearestStation() {
      const nearest = stations.reduce((best, s) => {
        const d = Math.abs(s.freq - tunedFreq);
        return d < best.d ? { s, d } : best;
      }, { s: null, d: Infinity });
      return nearest.d < 2.2 ? nearest.s : null;
    }

    /* ---------- Visual: scanning line + waterfall ---------- */
    // We work in physical pixels for speed (direct ImageData).
    let physW = 0, physH = 0, dpr = 1;
    let imgData, img32;
    function rebuildBuf() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      physW = canvas.width;
      physH = canvas.height;
      ctx = canvas.getContext('2d', { alpha: false });
      imgData = ctx.createImageData(physW, physH);
      img32 = new Uint32Array(imgData.data.buffer);
    }
    rebuildBuf();
    window.addEventListener('resize', () => {
      cancelAnimationFrame(drawRaf);
      rebuildBuf();
      draw();
    });

    const WF_ROWS = 160;
    const WF_COLS = 512;
    const waterfall = new Uint8Array(WF_ROWS * WF_COLS);
    let wfWrite = 0;

    function generateSpectrum() {
      const arr = new Uint8Array(WF_COLS);
      const normFreq = (tunedFreq - 53) / (170 - 53);
      const peakCol = normFreq * WF_COLS;
      const nearest = stations.reduce((best, s) => {
        const d = Math.abs(s.freq - tunedFreq);
        return d < best.d ? { s, d } : best;
      }, { s: null, d: Infinity });
      const signalStrength = Math.max(0, 1 - nearest.d / 8);
      const stationCol = nearest.s ? ((nearest.s.freq - 53) / 117) * WF_COLS : -999;

      for (let i = 0; i < WF_COLS; i++) {
        // noise floor (dark grey)
        let v = 14 + (Math.random() * 20) | 0;
        // wide hump at tuned position (filter response)
        const dist = Math.abs(i - peakCol) / WF_COLS;
        v += (Math.exp(-dist * 10) * 60) | 0;
        // sharp station peak
        if (nearest.s && signalStrength > 0.05) {
          const sd = Math.abs(i - stationCol) / WF_COLS;
          v += (Math.exp(-sd * 180) * signalStrength * 180) | 0;
        }
        // random sparkles
        if (Math.random() < 0.008) v += (Math.random() * 120) | 0;
        if (v > 255) v = 255;
        arr[i] = v;
      }
      return arr;
    }

    let drawRaf;
    function draw() {
      const spec = generateSpectrum();
      // write new row into waterfall ring buffer
      for (let i = 0; i < WF_COLS; i++) {
        waterfall[wfWrite * WF_COLS + i] = spec[i];
      }
      wfWrite = (wfWrite + 1) % WF_ROWS;

      // Fill image buffer with black
      const black = 0xff000000;
      for (let i = 0; i < img32.length; i++) img32[i] = black;

      // Waterfall occupies the top portion, spectrum trace sits near bottom.
      const wfPhysH = Math.floor(physH * 0.82);
      const rowH = wfPhysH / WF_ROWS;

      for (let py = 0; py < physW; py++) {
        const wfCol = Math.floor((py / physW) * WF_COLS);
        for (let r = 0; r < WF_ROWS; r++) {
          const bufferRow = (wfWrite - 1 - r + WF_ROWS) % WF_ROWS;
          const v = waterfall[bufferRow * WF_COLS + wfCol];
          const yStart = Math.floor((WF_ROWS - 1 - r) * rowH);
          const yEnd = Math.floor((WF_ROWS - r) * rowH);
          const grey = 0xff000000 | (v << 16) | (v << 8) | v;
          for (let y = yStart; y < yEnd; y++) {
            if (y >= 0 && y < wfPhysH) {
              img32[y * physW + py] = grey;
            }
          }
        }
      }

      // Spectrum trace area: draw bright line over bottom
      const traceBaseY = wfPhysH + 4;
      const traceHeight = Math.min(physH - traceBaseY - 14, 90);
      for (let py = 0; py < physW; py++) {
        const col = Math.floor((py / physW) * WF_COLS);
        const v = spec[col] / 255;
        const yPeak = traceBaseY + Math.floor((1 - v) * traceHeight);
        // vertical tick down
        for (let y = yPeak; y < traceBaseY + traceHeight; y++) {
          if (y < physH - 14) {
            // keep a dimmer trail
            const existing = img32[y * physW + py];
            const r = (existing >>> 16) & 0xff;
            const newR = Math.max(r, 80);
            img32[y * physW + py] = 0xff000000 | (newR << 16) | (newR << 8) | newR;
          }
        }
        // bright peak dot
        if (yPeak >= 0 && yPeak < physH - 14) {
          img32[yPeak * physW + py] = 0xffffffff;
        }
      }

      // Bottom tick bar (slate)
      for (let y = physH - 12; y < physH; y++) {
        for (let x = 0; x < physW; x++) {
          img32[y * physW + x] = 0xff080808;
        }
      }

      // Frequency ticks on bottom bar
      const ticks = [55, 75, 100, 125, 150, 170];
      for (const t of ticks) {
        const x = Math.floor(((t - 53) / 117) * physW);
        for (let y = physH - 12; y < physH - 4; y++) {
          if (x >= 0 && x < physW && y >= 0 && y < physH) {
            img32[y * physW + x] = 0xff888888;
          }
        }
      }

      // Tuned vertical line
      const tx = Math.floor(((tunedFreq - 53) / 117) * physW);
      for (let y = 0; y < physH - 4; y++) {
        if (tx >= 0 && tx < physW) {
          // chequer / dashed
          if ((y >> 2) % 2 === 0) {
            img32[y * physW + tx] = 0xffffffff;
          }
        }
      }
      // Triangle at bottom
      for (let dx = -4; dx <= 4; dx++) {
        const yy = physH - 1 - Math.abs(dx);
        const xx = tx + dx;
        if (xx >= 0 && xx < physW && yy >= 0 && yy < physH) {
          img32[yy * physW + xx] = 0xffffffff;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Draw labels as text (these are small, fast)
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `${Math.max(9, 10 * dpr)}px ui-monospace, monospace`;
      ctx.textBaseline = 'bottom';
      for (const t of ticks) {
        const x = Math.floor(((t - 53) / 117) * physW) + 3 * dpr;
        ctx.fillText(String(t), x, physH - 1);
      }

      if (!prefersReducedMotion) {
        drawRaf = requestAnimationFrame(draw);
      }
    }

    setTunedFreq(62);
    draw();
  }

  /* ============================================================
     STUDIES
     ============================================================ */
  const studies = [];

  function makeStudy(canvasEl, initFn) {
    const ctx2d = canvasEl.getContext('2d');
    let w, h;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvasEl.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvasEl.width = Math.floor(w * dpr);
      canvasEl.height = Math.floor(h * dpr);
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const api = initFn(ctx2d, () => ({ w, h }), () => resize());
    studies.push(api);
    window.addEventListener('resize', () => {
      resize();
      api.resize && api.resize(w, h);
    });
    // Only animate when near viewport
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) api.start && api.start();
          else api.stop && api.stop();
        });
      }, { threshold: 0.05 });
      io.observe(canvasEl);
    } else {
      api.start && api.start();
    }
    return api;
  }

  /* ---------- Study 01: Grain field (white noise + adjustable density) ---------- */
  function initStudy1(canvasEl) {
    return makeStudy(canvasEl, (ctx, size, resizeFn) => {
      let raf;
      let running = false;
      let density = 1;
      let mode = 'white'; // white | grey | binary

      function draw() {
        const { w, h } = size();
        // Fill base
        ctx.fillStyle = '#f5f5f5';
        if (prefersDark) ctx.fillStyle = '#141414';
        ctx.fillRect(0, 0, w, h);

        const step = Math.max(1, Math.round(2 / density));
        const img = ctx.createImageData(Math.floor(w / step), Math.floor(h / step));
        const d32 = new Uint32Array(img.data.buffer);
        for (let i = 0; i < d32.length; i++) {
          let v;
          if (mode === 'binary') v = Math.random() < 0.5 ? 20 : 235;
          else if (mode === 'grey') v = 90 + Math.floor(Math.random() * 75);
          else v = Math.floor(Math.random() * 255);
          d32[i] = 0xff000000 | (v << 16) | (v << 8) | v;
        }
        // Draw scaled
        const tmp = document.createElement('canvas');
        tmp.width = img.width;
        tmp.height = img.height;
        tmp.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tmp, 0, 0, w, h);
        ctx.imageSmoothingEnabled = true;

        if (running && !prefersReducedMotion) raf = requestAnimationFrame(draw);
      }

      function start() { if (running) return; running = true; draw(); }
      function stop() { running = false; cancelAnimationFrame(raf); }

      // Controls
      const root = canvasEl.closest('.study');
      root.querySelectorAll('[data-density]').forEach(btn => {
        btn.addEventListener('click', () => {
          root.querySelectorAll('[data-density]').forEach(b => b.setAttribute('aria-pressed', 'false'));
          btn.setAttribute('aria-pressed', 'true');
          density = parseFloat(btn.dataset.density);
          if (running) draw();
        });
      });
      root.querySelectorAll('[data-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          root.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', 'false'));
          btn.setAttribute('aria-pressed', 'true');
          mode = btn.dataset.mode;
          if (running) draw();
        });
      });

      return { start, stop, resize: () => { if (running) draw(); } };
    });
  }

  /* ---------- Study 02: Drifting particles that connect (constellation mini) ---------- */
  function initStudy2(canvasEl) {
    return makeStudy(canvasEl, (ctx, size) => {
      let raf;
      let running = false;
      let particles = [];
      const count = 55;
      let mouse = { x: -999, y: -999, active: false };

      function reset() {
        const { w, h } = size();
        particles = [];
        for (let i = 0; i < count; i++) {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
          });
        }
      }
      reset();

      canvasEl.addEventListener('pointermove', (e) => {
        const r = canvasEl.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
        mouse.active = true;
      });
      canvasEl.addEventListener('pointerleave', () => { mouse.active = false; });

      function draw() {
        const { w, h } = size();
        const bg = prefersDark ? '#141414' : '#f5f5f5';
        const fg = prefersDark ? '#e0e0e0' : '#1a1a1a';
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
          // Mouse repulsion
          if (mouse.active) {
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const d2 = dx*dx + dy*dy;
            if (d2 < 80*80) {
              const d = Math.sqrt(d2) || 1;
              p.vx += (dx/d) * 0.05;
              p.vy += (dy/d) * 0.05;
            }
          }
          // dampen
          p.vx *= 0.995;
          p.vy *= 0.995;
        }

        // Lines
        ctx.strokeStyle = fg;
        ctx.lineWidth = 0.6;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i+1; j < particles.length; j++) {
            const a = particles[i], b = particles[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const d2 = dx*dx + dy*dy;
            if (d2 < 60*60) {
              const alpha = 1 - Math.sqrt(d2) / 60;
              ctx.globalAlpha = alpha * 0.6;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;

        // Dots
        ctx.fillStyle = fg;
        for (const p of particles) {
          ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
        }

        if (running && !prefersReducedMotion) raf = requestAnimationFrame(draw);
        else if (running) {
          ctx.fillStyle = fg;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('(motion reduced — refresh for static view)', 12, 20);
        }
      }

      function start() { if (running) return; running = true; draw(); }
      function stop() { running = false; cancelAnimationFrame(raf); }
      return { start, stop, resize: reset };
    });
  }

  /* ---------- Study 03: Rorschach (symmetrical noise blots, evolving) ---------- */
  function initStudy3(canvasEl) {
    return makeStudy(canvasEl, (ctx, size) => {
      let raf;
      let running = false;
      let t = 0;
      let scale = 0.008;

      function draw() {
        const { w, h } = size();
        const bg = prefersDark ? '#141414' : '#f5f5f5';
        const fg = prefersDark ? '#e0e0e0' : '#1a1a1a';
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        const halfW = w / 2;
        const cellSize = 2;
        const cols = Math.ceil(halfW / cellSize);
        const rows = Math.ceil(h / cellSize);

        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            // Multi-octave pseudo-noise
            let v = 0;
            let amp = 1, freq = scale;
            for (let o = 0; o < 3; o++) {
              const nx = x * freq;
              const ny = y * freq + t * 0.2;
              v += amp * Math.abs(Math.sin(nx * 12.9898 + ny * 78.233 + o * 1.7));
              amp *= 0.5;
              freq *= 2;
            }
            v /= 1.75;
            if (v > 0.55) {
              ctx.fillStyle = fg;
              ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
              ctx.fillRect(w - x * cellSize - cellSize, y * cellSize, cellSize, cellSize);
            }
          }
        }

        // Axis
        ctx.strokeStyle = prefersDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(halfW, 0);
        ctx.lineTo(halfW, h);
        ctx.stroke();

        t += 0.015;
        if (running && !prefersReducedMotion) raf = requestAnimationFrame(draw);
      }
      function start() { if (running) return; running = true; draw(); }
      function stop() { running = false; cancelAnimationFrame(raf); }

      const root = canvasEl.closest('.study');
      root.querySelectorAll('[data-scale]').forEach(btn => {
        btn.addEventListener('click', () => {
          root.querySelectorAll('[data-scale]').forEach(b => b.setAttribute('aria-pressed', 'false'));
          btn.setAttribute('aria-pressed', 'true');
          scale = parseFloat(btn.dataset.scale);
        });
      });

      return { start, stop, resize: () => {} };
    });
  }

  /* ---------- Study 04: Seismograph (stacked drifting waveforms) ---------- */
  function initStudy4(canvasEl) {
    return makeStudy(canvasEl, (ctx, size) => {
      let raf;
      let running = false;
      let t = 0;

      function draw() {
        const { w, h } = size();
        const bg = prefersDark ? '#141414' : '#f5f5f5';
        const fg = prefersDark ? '#e0e0e0' : '#1a1a1a';
        // Fade previous for trail
        ctx.fillStyle = bg + 'cc';
        ctx.fillRect(0, 0, w, h);

        const lines = 7;
        ctx.lineWidth = 1;
        for (let l = 0; l < lines; l++) {
          const yCenter = (h / (lines + 1)) * (l + 1);
          const amp = 6 + (l * 3);
          ctx.strokeStyle = fg;
          ctx.globalAlpha = 0.35 + (l / lines) * 0.4;
          ctx.beginPath();
          for (let x = 0; x < w; x += 2) {
            const nx = x * 0.01 + l * 2;
            const y = yCenter
              + Math.sin(nx + t * 0.6 + l) * amp
              + Math.sin(nx * 2.3 + t * 0.9 + l * 0.5) * amp * 0.4
              + Math.sin(nx * 0.6 + t * 0.2) * amp * 0.7;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        t += 0.05;
        if (running && !prefersReducedMotion) raf = requestAnimationFrame(draw);
        else if (running) {
          // Static render when reduced motion
          ctx.fillStyle = fg;
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('(motion reduced)', 12, 20);
        }
      }
      function start() { if (running) return; running = true; draw(); }
      function stop() { running = false; cancelAnimationFrame(raf); }
      return { start, stop, resize: () => {} };
    });
  }

  /* ---------- Study 05: Grid warp (follows cursor) ---------- */
  function initStudy5(canvasEl) {
    return makeStudy(canvasEl, (ctx, size) => {
      let raf;
      let running = false;
      let mouse = { x: 0.5, y: 0.5, active: false };
      let spacing = 18;

      canvasEl.addEventListener('pointermove', (e) => {
        const r = canvasEl.getBoundingClientRect();
        mouse.x = (e.clientX - r.left) / r.width;
        mouse.y = (e.clientY - r.top) / r.height;
        mouse.active = true;
      });
      canvasEl.addEventListener('pointerleave', () => { mouse.active = false; });

      function draw() {
        const { w, h } = size();
        const bg = prefersDark ? '#141414' : '#f5f5f5';
        const fg = prefersDark ? '#c9c9c9' : '#2a2a2a';
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = fg;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        const cols = Math.ceil(w / spacing) + 2;
        const rows = Math.ceil(h / spacing) + 2;
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            let x = i * spacing;
            let y = j * spacing;
            if (mouse.active) {
              const dx = x - mouse.x * w;
              const dy = y - mouse.y * h;
              const d2 = dx*dx + dy*dy;
              const falloff = Math.max(0, 1 - Math.sqrt(d2) / 160);
              x -= dx * falloff * 0.5;
              y -= dy * falloff * 0.5;
            }
            ctx.moveTo(x - 1, y);
            ctx.lineTo(x + 1, y);
            ctx.moveTo(x, y - 1);
            ctx.lineTo(x, y + 1);
          }
        }
        ctx.stroke();
        if (running && !prefersReducedMotion) raf = requestAnimationFrame(draw);
      }
      function start() { if (running) return; running = true; draw(); }
      function stop() { running = false; cancelAnimationFrame(raf); }

      const root = canvasEl.closest('.study');
      root.querySelectorAll('[data-grid-spacing]').forEach(btn => {
        btn.addEventListener('click', () => {
          root.querySelectorAll('[data-grid-spacing]').forEach(b => b.setAttribute('aria-pressed', 'false'));
          btn.setAttribute('aria-pressed', 'true');
          spacing = parseInt(btn.dataset.gridSpacing, 10);
        });
      });

      return { start, stop, resize: () => {} };
    });
  }

  /* ---------- Study 06: Typewriter / printed transmission ---------- */
  function initStudy6(canvasEl) {
    return makeStudy(canvasEl, (ctx, size) => {
      let raf;
      let running = false;
      const messages = [
        'CQ CQ CQ DE K1L',
        'THE STATION IS ON THE AIR',
        'NOTHING IS LOST, ONLY SCATTERED',
        '— TRANSMISSION 007 —',
        'IF YOU ARE READING THIS, YOU ARE TOO CLOSE',
        'STATIC IS THE TEXTURE OF DISTANCE',
        'QSL?',
        '... .--. -- .--.',
      ];
      let msgIdx = 0;
      let charIdx = 0;
      let holdTimer = 0;
      let page = 0;

      function draw() {
        const { w, h } = size();
        const bg = prefersDark ? '#141414' : '#f5f5f5';
        const fg = prefersDark ? '#e0e0e0' : '#111';
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = fg;
        ctx.font = '13px ui-monospace, Menlo, Consolas, monospace';
        ctx.textBaseline = 'top';

        const linesShown = Math.floor(h / 20) - 1;
        const lines = [];
        // Build buffer of last N lines (we just render the current message repeated for now)
        let y = 12;
        for (let ln = 0; ln < linesShown; ln++) {
          const mi = (msgIdx - (linesShown - 1 - ln) + messages.length * 10) % messages.length;
          let txt;
          if (ln === linesShown - 1) {
            txt = messages[mi].slice(0, charIdx);
          } else {
            txt = messages[mi];
          }
          // jitter the text slightly for static effect
          const jitterX = (Math.random() - 0.5) * 0.6;
          ctx.fillText(txt, 18 + jitterX, y);
          y += 20;
        }

        // Cursor
        ctx.fillRect(18 + Math.ceil(ctx.measureText(messages[msgIdx].slice(0, charIdx)).width), 12 + (linesShown - 1) * 20, 7, 14);

        if (!prefersReducedMotion) {
          holdTimer--;
          if (holdTimer <= 0) {
            charIdx++;
            if (charIdx > messages[msgIdx].length + 10) {
              charIdx = 0;
              msgIdx = (msgIdx + 1) % messages.length;
              holdTimer = 40;
              page++;
            } else {
              holdTimer = 2 + Math.floor(Math.random() * 4);
            }
          }
          raf = requestAnimationFrame(draw);
        }
      }

      function start() { if (running) return; running = true; draw(); }
      function stop() { running = false; cancelAnimationFrame(raf); }
      return { start, stop, resize: () => {} };
    });
  }

  function initAllStudies() {
    const map = [
      ['[data-study-1]', initStudy1],
      ['[data-study-2]', initStudy2],
      ['[data-study-3]', initStudy3],
      ['[data-study-4]', initStudy4],
      ['[data-study-5]', initStudy5],
      ['[data-study-6]', initStudy6],
    ];
    for (const [sel, fn] of map) {
      const el = document.querySelector(sel);
      if (el) fn(el);
    }
  }

  /* ============================================================
     CONSTELLATION STAGE — big, full-width
     ============================================================ */
  function initConstellation() {
    const canvas = document.querySelector('[data-constellation-canvas]');
    if (!canvas) return;
    const countLabel = document.querySelector('[data-constellation-count]');
    const distLabel = document.querySelector('[data-constellation-dist]');
    let ctx, w, h;
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      const d = dpr();
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.floor(w * d);
      canvas.height = Math.floor(h * d);
      ctx = canvas.getContext('2d');
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const count = 180;
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      });
    }
    const mouse = { x: w / 2, y: h / 2, active: false };
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.active = true;
    });
    canvas.addEventListener('pointerleave', () => { mouse.active = false; });
    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect();
      for (let i = 0; i < 5; i++) {
        particles.push({
          x: e.clientX - r.left,
          y: e.clientY - r.top,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
        });
      }
    });

    let running = true;
    let raf;

    function draw() {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      // Wrap count
      while (particles.length > 400) particles.shift();

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x += w;
        if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h;
        if (p.y > h) p.y -= h;
        // slow down
        p.vx *= 0.999;
        p.vy *= 0.999;
      }

      const maxDist = 110;
      let connections = 0;
      ctx.strokeStyle = '#e0e0e0';
      for (let i = 0; i < particles.length; i++) {
        for (let j = i+1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          let dx = Math.abs(a.x - b.x);
          let dy = Math.abs(a.y - b.y);
          if (dx > w/2) dx = w - dx;
          if (dy > h/2) dy = h - dy;
          const d2 = dx*dx + dy*dy;
          if (d2 < maxDist*maxDist) {
            const alpha = 1 - Math.sqrt(d2) / maxDist;
            ctx.globalAlpha = alpha * 0.5;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            connections++;
          }
        }
      }
      // Mouse halo connections
      if (mouse.active) {
        for (const p of particles) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx*dx + dy*dy;
          if (d2 < 160*160) {
            const alpha = 1 - Math.sqrt(d2) / 160;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#f5f5f5';
      for (const p of particles) {
        ctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6);
      }
      // Mouse
      if (mouse.active) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (countLabel) countLabel.textContent = String(particles.length).padStart(3, '0');
      if (distLabel) distLabel.textContent = String(connections).padStart(3, '0');

      if (running && !prefersReducedMotion) raf = requestAnimationFrame(draw);
    }

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) { running = true; draw(); }
          else { running = false; cancelAnimationFrame(raf); }
        });
      }, { threshold: 0.05 });
      io.observe(canvas);
    } else {
      draw();
    }
  }

  /* ============================================================
     Scroll reveal
     ============================================================ */
  function initReveal() {
    if (prefersReducedMotion) {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
      return;
    }
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('is-visible'), i * 40);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

  /* ============================================================
     Boot
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    initClock();
    if (typeof initHero === 'function') initHero();
    initTuner();
    initAllStudies();
    initConstellation();
    initReveal();
  });
})();
