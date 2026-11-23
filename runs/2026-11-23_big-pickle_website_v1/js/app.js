/* THE QUIET INDEX — behaviour. No dependencies, no network calls. */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ *
   * 1. Anechoic chamber probe
   * ------------------------------------------------------------------ */
  var chamber = document.getElementById('chamber');
  var probeLine = document.getElementById('probeLine');
  var probeDot = document.getElementById('probeDot');
  var probeHalo = document.getElementById('probeHalo');
  var dbValue = document.getElementById('dbValue');
  var distValue = document.getElementById('distValue');
  var envValue = document.getElementById('envValue');
  var meterFill = document.getElementById('meterFill');
  var readoutNote = document.getElementById('readoutNote');
  var probeAnnounce = document.getElementById('probeAnnounce');

  var CX = 500, CY = 326, MAXR = 400;
  var px = 500, py = 200;
  var audioCtx = null, tone = null, gainNode = null, filter = null;

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function fmtDb(v) {
    var s = v.toFixed(1);
    return v < 0 ? '\u2212' + s.slice(1) : s;
  }

  function fmtInt(v) {
    return v < 0 ? '\u2212' + Math.abs(v) : String(v);
  }

  function updateProbe(x, y, source) {
    px = clamp(x, 110, 890);
    py = clamp(y, 104, 548);
    var dx = px - CX, dy = py - CY;
    var r = Math.min(MAXR, Math.sqrt(dx * dx + dy * dy));
    var norm = r / MAXR;
    var db = -20.3 + norm * 40.3;

    probeLine.setAttribute('x2', px);
    probeLine.setAttribute('y2', py);
    probeDot.setAttribute('cx', px);
    probeDot.setAttribute('cy', py);
    probeHalo.setAttribute('cx', px);
    probeHalo.setAttribute('cy', py);
    probeHalo.setAttribute('r', (12 + norm * 26).toFixed(1));

    dbValue.textContent = fmtDb(db);
    distValue.textContent = (r / 218).toFixed(2) + ' m';
    meterFill.style.width = clamp(norm * 100, 4, 100).toFixed(1) + '%';

    if (norm < 0.22) {
      envValue.textContent = 'Anechoic';
      readoutNote.textContent = 'The quietest measurable place is never the quietest felt place. Your body is the loudest thing in the room.';
    } else if (norm < 0.62) {
      envValue.textContent = 'Transition';
      readoutNote.textContent = 'Halfway out, reflections return. The room stops being an idea and becomes a normal, forgiving space.';
    } else {
      envValue.textContent = 'Ordinary air';
      readoutNote.textContent = 'At the wedge edge, sound bounces again. Silence turns out to be a technology, not a natural state.';
    }

    if (audioCtx && gainNode && filter) {
      var now = audioCtx.currentTime;
      gainNode.gain.setTargetAtTime(0.0006 + norm * norm * 0.016, now, 0.08);
      filter.frequency.setTargetAtTime(180 + norm * 2600, now, 0.08);
    }
    if (source === 'key') {
      probeAnnounce.textContent = fmtDb(db) + ' decibels, ' + distValue.textContent + ' from the listener. ' + envValue.textContent + '.';
    }
    if (source && reduce === false) chamber.classList.add('is-active');
  }

  function pointFromEvent(e) {
    var rect = chamber.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * 1000,
      y: (e.clientY - rect.top) / rect.height * 600
    };
  }

  if (chamber) {
    chamber.addEventListener('pointermove', function (e) {
      var p = pointFromEvent(e);
      updateProbe(p.x, p.y, 'pointer');
    });
    chamber.addEventListener('pointerenter', function () { chamber.classList.add('is-active'); });
    chamber.addEventListener('pointerleave', function () { chamber.classList.remove('is-active'); });
    chamber.addEventListener('blur', function () { chamber.classList.remove('is-active'); });
    chamber.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 36 : 12;
      var handled = true;
      switch (e.key) {
        case 'ArrowLeft':  px -= step; break;
        case 'ArrowRight': px += step; break;
        case 'ArrowUp':    py -= step; break;
        case 'ArrowDown':  py += step; break;
        case 'Home':       px = CX; py = CY - 120; break;
        default: handled = false;
      }
      if (handled) {
        e.preventDefault();
        updateProbe(px, py, 'key');
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 2. Sound: optional, user-gesture-only, generated with Web Audio
   * ------------------------------------------------------------------ */
  var toggle = document.getElementById('soundToggle');
  var toggleText = toggle && toggle.querySelector('.toggle-text');

  function startAudio() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    if (!audioCtx) {
      audioCtx = new Ctx();
      tone = audioCtx.createOscillator();
      gainNode = audioCtx.createGain();
      filter = audioCtx.createBiquadFilter();
      tone.type = 'sine';
      tone.frequency.value = 62;
      filter.type = 'lowpass';
      filter.frequency.value = 180;
      filter.Q.value = 0.6;
      gainNode.gain.value = 0.0006;
      tone.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      tone.start();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return true;
  }

  function setSound(on) {
    if (on && !startAudio()) {
      toggle.setAttribute('aria-pressed', 'false');
      toggle.setAttribute('aria-label', 'Sound unavailable');
      toggleText.textContent = 'Sound unavailable';
      return;
    }
    if (audioCtx && gainNode) {
      gainNode.gain.setTargetAtTime(on ? 0.0008 : 0, audioCtx.currentTime, 0.08);
    }
    toggle.setAttribute('aria-pressed', String(on));
    toggle.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
    toggleText.textContent = on ? 'Sound on' : 'Sound off';
    document.body.classList.toggle('sound-on', on);
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setSound(toggle.getAttribute('aria-pressed') !== 'true');
    });
  }

  /* ------------------------------------------------------------------ *
   * 3. Field-note ledger + hand-drawn SVG illustrations
   * ------------------------------------------------------------------ */
  var entries = [
    {
      title: 'Anechoic chamber', place: 'Orfield Labs, Minneapolis',
      foot: 'Measured: −20.3 dB FS · Category: constructed', art: 'chamber',
      body: 'Up to thirty minutes, the room is a curiosity. After that it becomes a mirror. The walls remove every reflection, so the only sound left is the blood in your ears and the click of your own joints. Most people ask to leave. The record for staying is not a matter of endurance but of learning to accept that you are the noise.'
    },
    {
      title: 'Snow, after falling', place: 'Finnish Lapland',
      foot: 'Measured: −12 dB · Category: weather', art: 'snow',
      body: 'Fresh snow is a lattice of ice and air, and air is what it traps. Each crystal is a tiny obstacle; together they make a soft, porous ceiling over the ground. Footsteps arrive as a dull pressure rather than a click. The effect lasts until the surface crusts over, when the old sharpness returns in a single afternoon.'
    },
    {
      title: 'Reading room', place: 'Stockholm Public Library',
      foot: 'Measured: 28 dBA · Category: architecture', art: 'room',
      body: 'This quiet is made of rules as much as materials. Wood, cork and heavy paper absorb what they can; the rest is handled by agreement. A door closes with a hand on the latch. Nobody says why. The room is loud enough to be usable and soft enough to think in — the most successful kind of silence is a social technology.'
    },
    {
      title: 'Frozen lake, dawn', place: 'Lake Baikal, Siberia',
      foot: 'Measured: −9 dB · Category: season', art: 'lake',
      body: 'Before the ice, the lake was a machine for making sound: waves, wind, the crack of shifting plates. At −40°C the surface becomes a single sheet, and the landscape loses its echo. What remains is the occasional long groan from below — the ice adjusting to its own weight, a sound you feel in the teeth before you hear it.'
    },
    {
      title: 'Desert, after wind', place: 'Namib, Namibia',
      foot: 'Measured: 16 dBA · Category: terrain', art: 'desert',
      body: 'A dune field is quiet for the same reason a cathedral is loud: geometry. Slip faces catch and scatter, gravel absorbs, and the empty air carries nothing to bounce from. When the wind stops, the hush arrives within seconds. It is not absolute — your breath is very loud here — but distance becomes visible.'
    },
    {
      title: 'Under thick ice', place: 'Antarctic shelf',
      foot: 'Measured: −4 dB · Category: depth', art: 'ice',
      body: 'Three hundred metres of ice is an excellent wall. Above it, the world is weather; below, sound travels for kilometres through water with almost no loss. Divers describe the silence as heavy rather than empty. The absence of noise makes a low frequency from far away feel close, and closeness is not always comfort.'
    },
    {
      title: 'The moment before', place: 'Anywhere, held breath',
      foot: 'Measured: 0.0 s · Category: human', art: 'breath',
      body: 'Every silence you remember is a silence with an ending. The pause before a first note, before a door opens, before someone says the difficult thing. Nothing acoustic changes. Everything else does. This is the quiet we actually seek — not a measurement but an interval in which the next sound has not yet decided what it will be.'
    }
  ];

  function art(kind) {
    var lines = [];
    var i;
    if (kind === 'chamber') {
      for (i = 0; i < 14; i++) lines.push('<path d="M' + (i * 40) + ' 180l20 -20 20 20" fill="none" stroke="#000" stroke-width="1" opacity="0.55"/>');
      lines.push('<circle cx="280" cy="110" r="34" fill="#111"/>');
      lines.push('<circle cx="280" cy="110" r="62" fill="none" stroke="#000" stroke-width="0.7"/>');
    } else if (kind === 'snow') {
      for (i = 0; i < 46; i++) {
        var sx = (i * 71) % 580, sy = (i * 43) % 170;
        lines.push('<circle cx="' + sx + '" cy="' + sy + '" r="' + (1 + (i % 3)) + '" fill="#111" opacity="' + (0.25 + (i % 4) * 0.12) + '"/>');
      }
      lines.push('<path d="M0 176Q145 150 290 174T580 168V180H0Z" fill="#d8d8d8"/>');
    } else if (kind === 'room') {
      lines.push('<rect x="130" y="34" width="320" height="130" fill="none" stroke="#000" stroke-width="1.2"/>');
      lines.push('<path d="M130 34l160 66 160 -66M290 100v64" fill="none" stroke="#000" stroke-width="0.8"/>');
      lines.push('<path d="M180 150v30M400 150v30" stroke="#000" stroke-width="1"/>');
      lines.push('<path d="M0 176h580" stroke="#000" stroke-width="1.2"/>');
    } else if (kind === 'lake') {
      for (i = 0; i < 9; i++) lines.push('<path d="M0 ' + (120 + i * 7) + 'h580" stroke="#000" stroke-width="0.7" opacity="' + (0.12 + i * 0.05) + '"/>');
      lines.push('<path d="M0 118Q145 112 290 118T580 116" fill="none" stroke="#000" stroke-width="1.5"/>');
      lines.push('<circle cx="410" cy="52" r="26" fill="none" stroke="#000" stroke-width="1"/>');
    } else if (kind === 'desert') {
      lines.push('<path d="M0 168Q90 96 190 168T380 168T580 168" fill="#d8d8d8" stroke="#000" stroke-width="1"/>');
      lines.push('<path d="M0 180Q130 130 280 180T580 180" fill="#111" opacity="0.18"/>');
      for (i = 0; i < 30; i++) lines.push('<path d="M' + ((i * 97) % 580) + ' ' + (60 + (i * 31) % 100) + 'h2" stroke="#000" opacity="0.4"/>');
    } else if (kind === 'ice') {
      for (i = 0; i < 11; i++) lines.push('<path d="M' + (i * 58) + ' 0l-38 180" stroke="#000" stroke-width="0.7" opacity="0.35"/>');
      lines.push('<path d="M0 96h580" stroke="#000" stroke-width="1.4"/>');
      lines.push('<circle cx="290" cy="140" r="17" fill="none" stroke="#000" stroke-width="1"/>');
    } else {
      lines.push('<path d="M0 120Q145 108 290 120T580 120" fill="none" stroke="#000" stroke-width="1"/>');
      lines.push('<path d="M0 138Q145 126 290 138T580 138" fill="none" stroke="#000" stroke-width="0.7" opacity="0.5"/>');
      for (i = 0; i < 5; i++) lines.push('<circle cx="' + (250 + i * 20) + '" cy="' + (94 - i * 12) + '" r="' + (2 + i) + '" fill="none" stroke="#000" opacity="' + (0.15 + i * 0.12) + '"/>');
    }
    return '<svg viewBox="0 0 580 180" preserveAspectRatio="xMidYMid slice" role="presentation" aria-hidden="true">' + lines.join('') + '</svg>';
  }

  var rows = Array.prototype.slice.call(document.querySelectorAll('.ledger-row'));
  var panel = document.getElementById('entryPanel');
  var artEl = document.getElementById('entryArt');
  var entryIndex = document.getElementById('entryIndex');
  var entryTitle = document.getElementById('entryTitle');
  var entryPlace = document.getElementById('entryPlace');
  var entryBody = document.getElementById('entryBody');
  var entryFoot = document.getElementById('entryFoot');

  function showEntry(n) {
    var e = entries[n];
    if (!e) return;
    rows.forEach(function (r, i) {
      var active = i === n;
      r.classList.toggle('is-active', active);
      r.setAttribute('aria-expanded', String(active));
    });
    entryIndex.textContent = 'Entry ' + String(n + 1).padStart(2, '0') + ' / 07';
    entryTitle.textContent = e.title;
    entryPlace.textContent = e.place;
    entryBody.textContent = e.body;
    entryFoot.textContent = e.foot;
    artEl.innerHTML = art(e.art);
    if (!reduce) {
      panel.classList.remove('is-changing');
      void panel.offsetWidth;
      panel.classList.add('is-changing');
    }
  }

  rows.forEach(function (r) {
    r.addEventListener('click', function () { showEntry(Number(r.dataset.index)); });
  });

  /* ------------------------------------------------------------------ *
   * 4. Decibel scale — pointer and keyboard slider
   * ------------------------------------------------------------------ */
  var scale = document.getElementById('scale');
  var scaleFill = document.getElementById('scaleFill');
  var scaleHandle = document.getElementById('scaleHandle');
  var handleLabel = document.getElementById('handleLabel');
  var scaleNumber = document.getElementById('scaleNumber');
  var scaleName = document.getElementById('scaleName');
  var scaleDetail = document.getElementById('scaleDetail');
  var scaleMarks = document.getElementById('scaleMarks');
  var MIN = -20, MAX = 120, value = 0;

  var points = [
    { db: -20, name: 'Below threshold', detail: 'An anechoic chamber at its quietest. Even here, your pulse is audible.' },
    { db: 0, name: 'Threshold of hearing', detail: 'The softest sound a healthy young ear can detect. Not silence — a reference point.' },
    { db: 10, name: 'Rustling leaves', detail: 'A leaf moving in a light breeze, measured a metre away.' },
    { db: 20, name: 'A quiet room', detail: 'A library reading room, or a bedroom with the window shut.' },
    { db: 30, name: 'Whisper', detail: 'Close, deliberate speech. Ten times the energy of a quiet room.' },
    { db: 40, name: 'A calm evening', detail: 'Residential background at night, with no traffic nearby.' },
    { db: 50, name: 'Refrigerator hum', detail: 'The mechanical floor of an ordinary kitchen.' },
    { db: 60, name: 'Conversation', detail: 'Two people talking across a table. Comfortably audible, not loud.' },
    { db: 70, name: 'Busy street', detail: 'Traffic at a distance. Long exposure here begins to feel tiring.' },
    { db: 80, name: 'City traffic', detail: 'A busy road at close range. The threshold of genuine annoyance.' },
    { db: 90, name: 'A shout', detail: 'Close and insistent. Sustained exposure is harmful.' },
    { db: 100, name: 'Live music', detail: 'A small amplified room. The body starts to feel the low end.' },
    { db: 110, name: 'Nightclub', detail: 'Pain threshold is close. Hearing protection is not optional.' },
    { db: 120, name: 'Threshold of pain', detail: 'A jet at takeoff, thirty metres away. Damage happens quickly.' }
  ];

  function tickMarks() {
    var html = '';
    for (var db = -20; db <= 120; db += 10) {
      var pct = (db - MIN) / (MAX - MIN) * 100;
      var major = db % 40 === 0 || db === -20;
      html += '<span class="scale-mark' + (major ? ' major' : '') + '" style="left:' + pct.toFixed(3) + '%">' + (major ? '<span>' + fmtInt(db) + '</span>' : '') + '</span>';
    }
    scaleMarks.innerHTML = html;
  }

  function setValue(v, fromPointer) {
    value = clamp(Math.round(v), MIN, MAX);
    var pct = (value - MIN) / (MAX - MIN) * 100;
    scaleFill.style.width = pct + '%';
    scaleHandle.style.left = pct + '%';
    handleLabel.textContent = (value > 0 ? '+' : '') + fmtInt(value) + ' dB';
    scaleNumber.textContent = (value > 0 ? '+' : '') + fmtInt(value);
    var nearest = points[0];
    points.forEach(function (p) { if (Math.abs(p.db - value) <= Math.abs(nearest.db - value)) nearest = p; });
    scaleName.textContent = nearest.name;
    scaleDetail.textContent = nearest.detail;
    scale.setAttribute('aria-valuenow', String(value));
    scale.setAttribute('aria-valuetext', value + (Math.abs(value) === 1 ? ' decibel' : ' decibels') + ', ' + nearest.name);
    if (fromPointer && audioCtx && gainNode) {
      var g = clamp(Math.pow((value + 20) / 140, 3) * 0.006, 0, 0.006);
      gainNode.gain.setTargetAtTime(g, audioCtx.currentTime, 0.05);
    }
  }

  function valueFromPointer(e) {
    var rect = scale.getBoundingClientRect();
    return MIN + clamp((e.clientX - rect.left) / rect.width, 0, 1) * (MAX - MIN);
  }

  if (scale) {
    tickMarks();
    setValue(0, false);
    scale.addEventListener('pointerdown', function (e) {
      scale.classList.add('is-dragging');
      if (scale.setPointerCapture) scale.setPointerCapture(e.pointerId);
      setValue(valueFromPointer(e), true);
    });
    scale.addEventListener('pointermove', function (e) {
      if (e.buttons) setValue(valueFromPointer(e), true);
    });
    scale.addEventListener('pointerup', function () { scale.classList.remove('is-dragging'); });
    scale.addEventListener('pointercancel', function () { scale.classList.remove('is-dragging'); });
    scale.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 10 : 1;
      var handled = true;
      switch (e.key) {
        case 'ArrowLeft': case 'ArrowDown': setValue(value - step, false); break;
        case 'ArrowRight': case 'ArrowUp': setValue(value + step, false); break;
        case 'PageDown': setValue(value - 10, false); break;
        case 'PageUp': setValue(value + 10, false); break;
        case 'Home': setValue(MIN, false); break;
        case 'End': setValue(MAX, false); break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    });
  }

  /* ------------------------------------------------------------------ *
   * 5. One restrained page-load reveal
   * ------------------------------------------------------------------ */
  if (!reduce && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll('.section-head, .readout, .entry-panel, .scale-wrap, .about-inner');
    var io = new IntersectionObserver(function (items) {
      items.forEach(function (item) {
        if (item.isIntersecting) {
          item.target.style.transition = 'opacity .8s var(--ease), transform .8s var(--ease)';
          item.target.style.opacity = '1';
          item.target.style.transform = 'none';
          io.unobserve(item.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (t) {
      t.style.opacity = '0';
      t.style.transform = 'translateY(14px)';
      io.observe(t);
    });
  }
})();
