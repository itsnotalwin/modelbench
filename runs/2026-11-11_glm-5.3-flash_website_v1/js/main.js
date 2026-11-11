/* ============================================================
   NOCTURNE — engine
   Split-flap board, atlas state, diagram sync, board sound.
   Plain script (no modules) so it runs from file:// as-is.
   ============================================================ */
(function () {
  'use strict';

  /* Marks the document as JS-capable: reveal-on-scroll styles only
     apply when this class exists, so no-JS visitors lose nothing. */
  document.documentElement.classList.add('js');

  var REDUCED_MQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(REDUCED_MQ && REDUCED_MQ.matches); }

  /* ---------------------------------------------------------
     The atlas: twelve services. Copy compiled from timetables,
     guidebooks and memory; times indicative.
     --------------------------------------------------------- */
  var SERVICES = [
    {
      id: 'orient', no: '01', name: 'ORIENT EXPRESS',
      line: 'N01 ORIENT EXPRESS→ISTANBUL',
      from: 'PARIS EST', to: 'ISTANBUL SIRKECI',
      fromNode: 'paris', toNode: 'istanbul',
      nights: '3', years: '1883–1977', status: 'ENDED',
      cls: 'PULLMAN / WAGON-LITS', operator: 'WAGONS-LITS, PARIS',
      outlook: 'Revived as expensive specials; the real thing died with the 1977 season.',
      blurb: 'The first train to carry its own name like a flag, and the one that taught Europe that borders were something you could sleep through. Its later years were shabbier than its legend — the through carriages were nicknamed “the Polytechnique” for the student traffic — and in 1977 the last Wagons-Lits service was withdrawn. Everything sold today as luxury rail was invented in these carriages.',
      beats: [
        ['18:55', 'PARIS, GARE DE L’EST', 'The iron hall, the goodbyes, the smell of other people’s holidays.'],
        ['DAY 2, 07:20', 'VIENNA', 'Coffee, and the first new consonants.'],
        ['DAY 2, 23:40', 'BELGRADE', 'The border takes longer than the river.'],
        ['DAY 3, 19:10', 'ISTANBUL, SIRKECI', 'Arrival under seagulls, in a station built as a promise.']
      ]
    },
    {
      id: 'vostok', no: '02', name: 'TRANS-SIBERIAN · VOSTOK',
      line: 'N02 TRANS-SIBERIAN→BEIJING',
      from: 'MOSCOW YAROSLAVSKAYA', to: 'BEIJING',
      fromNode: 'moscow', toNode: 'beijing',
      nights: '6', years: 'SINCE 1960', status: 'RUNS',
      cls: '4- & 2-BERTH SLEEPERS', operator: 'RUSSIAN & CHINESE STATE RAILWAYS',
      outlook: 'Weekly, unhurried, and very much alive.',
      blurb: 'Six nights, two railways, one bogie change in the dark at the border. The Vostok — “the East” — is the longest scheduled sleeper running anywhere, and it behaves like a small vertical nation: samovar at the end of the car, a carriage attendant ruling the clock, birch forest for scenery. You do not arrive so much as surface.',
      beats: [
        ['19:55', 'MOSCOW, YAROSLAVSKAYA', 'Kilometre zero of the longest night on rails.'],
        ['DAY 3', 'LAKE BAIKAL', 'The lake goes by for most of a working day.'],
        ['DAY 4, 07:00', 'MANZHOULI', 'The bogie change: the train lifted, the country beneath swapped.'],
        ['DAY 6, 08:20', 'BEIJING', 'You surface into a different clock and a different alphabet.']
      ]
    },
    {
      id: 'caledonian', no: '03', name: 'CALEDONIAN SLEEPER',
      line: 'N03 CALEDONIAN SLEEPER→INVERNESS',
      from: 'LONDON EUSTON', to: 'INVERNESS',
      fromNode: 'london', toNode: 'inverness',
      nights: '1', years: 'SINCE 1873', status: 'RUNS',
      cls: 'CLUB & CLASSIC ROOMS', operator: 'CALEDONIAN SLEEPER LTD',
      outlook: 'Booked out through every Highland summer.',
      blurb: 'You board among the Friday suits and the hillwalkers and wake where the bus comes twice a day. The train divides itself in the dark somewhere north of Edinburgh — Highlands, Aberdeenshire and Inverness-shire each taking their own engine — and by morning the windows are doing the work of a picture gallery. It has run in one form or another since 1873: the night shift between the capital and the Highlands.',
      beats: [
        ['21:15', 'LONDON, EUSTON', 'The platforms fill with boots and good manners.'],
        ['23:50', 'EDINBURGH WAVERLEY', 'The train divides itself in the dark.'],
        ['03:20', 'AVIEMORE', 'The Cairngorms make their point about weather.'],
        ['08:10', 'INVERNESS', 'Coffee on the platform; the Moray Firth does the rest.']
      ]
    },
    {
      id: 'riviera', no: '04', name: 'NIGHT RIVIERA',
      line: 'N04 NIGHT RIVIERA→PENZANCE',
      from: 'LONDON PADDINGTON', to: 'PENZANCE',
      fromNode: 'london', toNode: 'penzance',
      nights: '1', years: 'SINCE 1904', status: 'RUNS',
      cls: 'FIRST & STANDARD SLEEPERS', operator: 'GREAT WESTERN RAILWAY',
      outlook: 'Six nights a week, with the weather on its side.',
      blurb: 'The last mainline sleeper in Britain with a name and a sea view. It leaves Paddington after the evening rush, carries the theatre-dressed and the surf-checked, and crosses Brunel’s bridge over the Tamar before the gulls are awake. Cornwall arrives the way it should: slowly, then all at once.',
      beats: [
        ['23:45', 'LONDON, PADDINGTON', 'The last train of the day, and the best dressed.'],
        ['03:05', 'EXETER ST DAVIDS', 'Devon in three minutes of platform light.'],
        ['05:50', 'THE TAMAR', 'Brunel’s bridge, crossed before the gulls are up.'],
        ['07:55', 'PENZANCE', 'Sea first. Then tea.']
      ]
    },
    {
      id: 'njberlin', no: '05', name: 'NIGHTJET BERLIN–PARIS',
      line: 'N05 NIGHTJET BERLIN→PARIS',
      from: 'BERLIN HBF', to: 'PARIS EST',
      fromNode: 'berlin', toNode: 'paris',
      nights: '1', years: 'SINCE 2023', status: 'RUNS',
      cls: 'SLEEPER BERTHS & COUCHETTES', operator: 'ÖBB NIGHTJET',
      outlook: 'The corridor reopened in 2023; the politics are still boarding.',
      blurb: 'A direct sleeper between Berlin and Paris ran until 2007, then the night was handed to the airlines; in December 2023 the corridor reopened. It is the most political train in Europe: twelve hours of countryside agreeing, quietly, to be one place again.',
      beats: [
        ['20:20', 'BERLIN, HBF', 'The glass station files you away like a letter.'],
        ['23:55', 'FRANKFURT AM MAIN', 'Marshalling yards, then vineyards you will never see.'],
        ['03:10', 'THE FRENCH BORDER', 'Passports in a corridor lit like an aquarium.'],
        ['10:24', 'PARIS, GARE DE L’EST', 'You arrive in time for lunch, which is the point.']
      ]
    },
    {
      id: 'njvenice', no: '06', name: 'NIGHTJET VIENNA–VENICE',
      line: 'N06 NIGHTJET VIENNA→VENICE',
      from: 'WIEN HBF', to: 'VENEZIA S. LUCIA',
      fromNode: 'vienna', toNode: 'venice',
      nights: '1', years: 'SINCE 1990S', status: 'RUNS',
      cls: 'SLEEPER BERTHS & COUCHETTES', operator: 'ÖBB NIGHTJET',
      outlook: 'Modest, reliable, and underpriced for the Alps it crosses.',
      blurb: 'The Alps do their best work unlit. This one threads Carinthia, the Tarvisio line and the fog of the Po plain while you sleep at walking pace, and delivers you to a station whose platforms end in water. Cheaper than the flights it replaced and far better scored: the pantograph in the fog is the percussion section.',
      beats: [
        ['22:20', 'VIENNA, HBF', 'Vienna keeps its goodbyes short.'],
        ['02:05', 'VILLACH', 'Carinthia at walking pace.'],
        ['05:30', 'UDINE', 'Fog on the plain; the pantograph sparks in it.'],
        ['08:05', 'VENEZIA S. LUCIA', 'You step off into water. The platform does it daily.']
      ]
    },
    {
      id: 'nordland', no: '07', name: 'NORDLAND LINE SLEEPER',
      line: 'N07 NORDLAND LINE→BODØ',
      from: 'TRONDHEIM', to: 'BODØ',
      fromNode: 'trondheim', toNode: 'bodo',
      nights: '1', years: 'SINCE 1962', status: 'RUNS',
      cls: 'SEATS & SLEEPER BERTHS', operator: 'SJ NORGE',
      outlook: 'Wins the argument every June; graceful in December.',
      blurb: 'Norway’s longest railway leaves Trondheim after dark and crosses the Arctic Circle in the small hours, marked by nothing but a post in the snow. In June the sun waits for you at Bodø; in December it politely declines. The carriage heater is the star of the production.',
      beats: [
        ['23:00', 'TRONDHEIM', 'The longest line in Norway leaves after the last ferry.'],
        ['06:05', 'POLARSIRKELEN', 'The Arctic Circle goes by as a post in the snow.'],
        ['08:55', 'BODØ', 'The line ends where the ferries begin.']
      ]
    },
    {
      id: 'lapland', no: '08', name: 'LAPLAND SLEEPER',
      line: 'N08 LAPLAND SLEEPER→NARVIK',
      from: 'STOCKHOLM C', to: 'NARVIK',
      fromNode: 'stockholm', toNode: 'narvik',
      nights: '1', years: 'SINCE 1950S', status: 'RUNS',
      cls: 'SLEEPER BERTHS', operator: 'SJ, SWEDEN',
      outlook: 'Aurora at sleeper fares, northbound only.',
      blurb: 'Sweden’s longest night: out of the capital’s daylight, up through the iron-ore country where the freight trains have right of way and always will, into Norway by the back door. In winter the aurora goes past the window at a walking pace, which is the only correct speed for it.',
      beats: [
        ['18:35', 'STOCKHOLM, CENTRAL', 'Leave the summer city in daylight; you will not see much more of it.'],
        ['04:10', 'KIRUNA', 'Ore trains have right of way here, and always will.'],
        ['09:00', 'ABISKO', 'Tundra, then birch, then nothing to compare it to.'],
        ['12:35', 'NARVIK', 'Norway, by the back door.']
      ]
    },
    {
      id: 'bluetrain', no: '09', name: 'THE BLUE TRAIN',
      line: 'N09 BLUE TRAIN→CAPE TOWN',
      from: 'PRETORIA', to: 'CAPE TOWN',
      fromNode: 'pretoria', toNode: 'capetown',
      nights: '1', years: 'SINCE 1923', status: 'RUNS',
      cls: 'DELUXE SUITES', operator: 'TRANSNET, SOUTH AFRICA',
      outlook: 'Five stars, and the platform coffee is included.',
      blurb: 'Pretoria to Cape Town in a night and a day, with the Highveld cooling behind you and the Karoo’s unpunctuated horizon ahead. It stops at Matjiesfontein, a platform from 1890, to serve you coffee — which tells you the priorities. The Blue Train has been in the timetable, in one livery or another, since 1923.',
      beats: [
        ['17:50', 'PRETORIA', 'Highveld afternoon; the suites are already cool.'],
        ['00:30', 'KIMBERLEY', 'Diamond country, asleep on its own history.'],
        ['08:35', 'MATJIESFONTEIN', 'A platform from 1890, served with coffee.'],
        ['12:30', 'CAPE TOWN', 'The mountain signs for the whole journey.']
      ]
    },
    {
      id: 'watania', no: '10', name: 'WATANIA NILE SLEEPER',
      line: 'N10 WATANIA SLEEPER→LUXOR',
      from: 'CAIRO, GIZA STN', to: 'LUXOR',
      fromNode: 'cairo', toNode: 'luxor',
      nights: '1', years: 'SINCE 1980S', status: 'RUNS',
      cls: 'TWIN CABINS', operator: 'WATANIA SLEEPING TRAINS',
      outlook: 'The cheapest bed near the pharaohs.',
      blurb: 'Cairo to Luxor along the Nile at eye level. The pyramids go by in the dark, on trust; the river keeps the window seat until dawn; you wake to temple walls and the first carts. It is the cheapest bed within walking distance of pharaohs, and the arrival light is worth the whole fare.',
      beats: [
        ['20:15', 'CAIRO, GIZA STATION', 'The pyramids go by in the dark, on trust.'],
        ['01:40', 'THE NILE VALLEY', 'The river keeps the window seat all night.'],
        ['05:30', 'LUXOR', 'Wake to temple walls and the first carts.']
      ]
    },
    {
      id: 'nightstar', no: '11', name: 'NIGHTSTAR',
      line: 'N11 NIGHTSTAR→NOWHERE',
      from: 'LONDON WATERLOO', to: 'PARIS NORD',
      fromNode: 'london', toNode: 'paris',
      nights: '0', years: '1994–2000', status: 'NEVER RAN',
      cls: 'BUILT, NEVER BERTHED', operator: 'EUROPEAN NIGHT STARWAYS',
      outlook: 'Three trainsets survive; most now work in Canada.',
      blurb: 'Three complete sleeper trainsets were built in the 1990s to run London–Paris, London–Brussels and London–Amsterdam through the new Channel Tunnel. Timetables were drafted, crews trained, cars painted; competition from cheap flights and the tunnel’s own day trains killed the project, and the fleet sat. Most of the carriages now haul Canadians through the Rockies as VIA Rail’s Renaissance cars — the most complete ghost on this board: fully built, fully funded, never once in public service.',
      beats: [
        ['21:15', 'LONDON, WATERLOO — TIMETABLED', 'Printed, staffed, sold. Never hauled.'],
        ['21:52', 'THE TUNNEL — TIMETABLED', 'Thirty-seven undersea minutes, seen only on test runs.'],
        ['06:05', 'PARIS, NORD — TIMETABLED', 'An arrival that exists only in a press kit.']
      ]
    },
    {
      id: 'indianpacific', no: '12', name: 'INDIAN PACIFIC',
      line: 'N12 INDIAN PACIFIC→PERTH',
      from: 'SYDNEY CENTRAL', to: 'PERTH',
      fromNode: 'sydney', toNode: 'perth',
      nights: '3', years: 'SINCE 1970', status: 'RUNS',
      cls: 'GOLD & PLATINUM CABINS', operator: 'JOURNEY BEYOND',
      outlook: '478 km of dead-straight proof, still running.',
      blurb: 'Sydney to Perth across a continent: the Blue Mountains disposed of on the first afternoon, the Nullarbor’s 478-kilometre straightaway — the longest in the world — on the second day, and the Indian Ocean’s light arriving with the third dawn. Named for the two oceans it joins; ridden for the desert between them, which is the actual attraction.',
      beats: [
        ['DAY 1', 'SYDNEY', 'The Blue Mountains disposed of before dark.'],
        ['DAY 2', 'THE NULLARBOR', '478 kilometres without a curve. Straight enough to see yesterday’s dust.'],
        ['DAY 3, 09:10', 'PERTH', 'The Indian meets the Pacific at walking pace.']
      ]
    }
  ];

  var byId = {};
  SERVICES.forEach(function (s) { byId[s.id] = s; });

  /* ---------------- Board sound (Web Audio, off by default) ---------------- */
  var SFX = {
    ctx: null, on: false, master: null, noise: null, last: 0,
    ensure: function () {
      if (!this.ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        var len = Math.floor(this.ctx.sampleRate * 0.08);
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        var d = this.noise.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },
    click: function () {
      if (!this.on || !this.ctx) return;
      var now = performance.now();
      if (now - this.last < 28) return;
      this.last = now;
      var t = this.ctx.currentTime;
      var src = this.ctx.createBufferSource(); src.buffer = this.noise;
      var bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1400 + Math.random() * 900; bp.Q.value = 1.4;
      var g = this.ctx.createGain();
      g.gain.setValueAtTime(0.2 + Math.random() * 0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      src.connect(bp); bp.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + 0.08);
    },
    tick: function () {
      if (!this.on || !this.ctx) return;
      var t = this.ctx.currentTime;
      var o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = 1046;
      var g = this.ctx.createGain();
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 0.08);
    }
  };

  /* ---------------- Split-flap engine ----------------
     A single rAF loop drives every cell through a two-phase
     state machine (fall, rise). No promise chains, no queues:
     each cell simply converges on its target character. */
  var CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ·—→Ø';
  var FALL_MS = 95, RISE_MS = 95;

  function flapHalf(cls, txt) {
    var f = document.createElement('span');
    f.className = cls;
    var c = document.createElement('span');
    c.className = 'sf-ch';
    c.textContent = txt;
    f.appendChild(c);
    return f;
  }

  function SplitFlap(container, cols, isReduced) {
    this.cols = cols;
    this.reduced = isReduced;
    this.cells = [];
    this.raf = null;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < cols; i++) {
      var cellEl = document.createElement('span');
      cellEl.className = 'sf';
      function mkHalf(cls) {
        var h = document.createElement('span');
        h.className = cls;
        var c = document.createElement('span');
        c.className = 'sf-ch';
        c.textContent = ' ';
        h.appendChild(c);
        cellEl.appendChild(h);
        return c;
      }
      this.cells.push({
        el: cellEl,
        top: mkHalf('sf-h sf-hT'),
        bot: mkHalf('sf-h sf-hB'),
        display: ' ',
        target: ' ',
        riseChar: ' ',
        phase: 'idle',
        when: 0,
        t0: 0,
        ft: null,
        fb: null,
        ftGo: false,
        fbGo: false
      });
      frag.appendChild(cellEl);
    }
    container.appendChild(frag);
  }

  SplitFlap.prototype.set = function (word, opts) {
    var stagger = (opts && opts.stagger) || 14;
    var delay = (opts && opts.delay) || 0;
    var text = String(word).toUpperCase();
    var chars = text.split('');
    while (chars.length < this.cols) chars.push(' ');
    chars = chars.slice(0, this.cols);
    var t0 = Date.now();
    for (var i = 0; i < chars.length; i++) {
      var ch = CHARSET.indexOf(chars[i]) >= 0 ? chars[i] : '·';
      var cell = this.cells[i];
      cell.target = ch;
      cell.when = t0 + delay + i * stagger;
      if (this.reduced) this._settle(cell, ch);
    }
    this._wake();
  };

  SplitFlap.prototype._settle = function (cell, ch) {
    if (cell.ft && cell.ft.parentNode) cell.ft.remove();
    if (cell.fb && cell.fb.parentNode) cell.fb.remove();
    cell.ft = null; cell.fb = null;
    cell.display = ch;
    cell.phase = 'idle';
    cell.top.textContent = ch;
    cell.bot.textContent = ch;
  };

  SplitFlap.prototype.settleAll = function () {
    for (var i = 0; i < this.cells.length; i++) this._settle(this.cells[i], this.cells[i].target);
  };

  SplitFlap.prototype._wake = function () {
    if (this.reduced || this.raf !== null) return;
    var self = this;
    /* A coarse ticker is enough: CSS transitions interpolate the
       flaps, the ticker only flips state at the phase boundaries.
       Unlike rAF it also keeps converging in background tabs. */
    function frame() {
      var now = Date.now();
      var active = false;
      for (var i = 0; i < self.cells.length; i++) {
        var c = self.cells[i];
        if (c.phase === 'idle') {
          if (c.display !== c.target) {
            if (now < c.when) { active = true; continue; }
            SFX.click();
            c.ft = flapHalf('sf-f sf-fT', c.display);
            c.ft.style.transform = 'rotateX(0deg)';
            c.ft.style.transition = 'transform ' + FALL_MS + 'ms cubic-bezier(.55,.06,.68,.19)';
            c.el.appendChild(c.ft);
            c.ftGo = false;
            c.phase = 'falling';
            c.t0 = now;
            active = true;
          }
        } else if (c.phase === 'falling') {
          if (!c.ftGo) { c.ftGo = true; c.ft.style.transform = 'rotateX(-90deg)'; }
          if (now - c.t0 >= FALL_MS) {
            c.riseChar = c.target;
            c.top.textContent = c.riseChar;
            c.fb = flapHalf('sf-f sf-fB', c.riseChar);
            c.fb.style.transform = 'rotateX(90deg)';
            c.fb.style.transition = 'transform ' + RISE_MS + 'ms cubic-bezier(.22,.61,.36,1)';
            c.el.appendChild(c.fb);
            c.fbGo = false;
            if (c.ft && c.ft.parentNode) c.ft.remove();
            c.ft = null;
            c.phase = 'rising';
            c.t0 = now;
          }
          active = true;
        } else if (c.phase === 'rising') {
          if (!c.fbGo) { c.fbGo = true; c.fb.style.transform = 'rotateX(0deg)'; }
          if (now - c.t0 >= RISE_MS) {
            c.bot.textContent = c.riseChar;
            c.display = c.riseChar;
            if (c.fb && c.fb.parentNode) c.fb.remove();
            c.fb = null;
            c.phase = 'idle';
          }
          active = true;
        }
      }
      if (active) self.raf = setTimeout(frame, 33);
      else self.raf = null;
    }
    this.raf = setTimeout(frame, 33);
  };

  /* ---------------- Hero board wiring ---------------- */
  var MSGS = [
    'AN ATLAS OF THE NIGHT TRAIN',
    'TWELVE SERVICES · FOUR CONTINENTS',
    'DEPARTURES 1883 — TODAY',
    'THE NIGHT IS A MODE OF TRANSPORT'
  ];

  var rowA = null, rowB = null;
  var cycle = 0, lastUserSelect = 0;

  function startCycler() {
    setTimeout(function tick() {
      if (!document.hidden) {
        cycle++;
        if (rowA) rowA.set(MSGS[cycle % MSGS.length]);
        if (rowB && Date.now() - lastUserSelect > 9000) {
          rowB.set(SERVICES[cycle % SERVICES.length].line);
        }
      }
      setTimeout(tick, 6400);
    }, 2600);
  }

  /* ---------------- Atlas state ---------------- */
  var rows = Array.prototype.slice.call(document.querySelectorAll('#serviceList .svc'));
  var legendBtns = Array.prototype.slice.call(document.querySelectorAll('.legend .lg'));
  var routeGroups = Array.prototype.slice.call(document.querySelectorAll('#nightMap .rt'));
  var endLabels = Array.prototype.slice.call(document.querySelectorAll('#nightMap .st-label'));
  var detailEl = document.getElementById('detail');
  var counterEl = document.getElementById('svcCounter');
  var liveEl = document.getElementById('svcLive');
  var current = null;

  function renderDetail(s) {
    if (!detailEl) return;
    var chips = '<span class="chip ' +
      (s.status === 'RUNS' ? 'chip--runs' : s.status === 'ENDED' ? 'chip--ended' : 'chip--ghost') +
      '">' + s.status + '</span>' +
      '<span class="chip chip--plain">' + s.nights + (s.nights === '1' ? ' NIGHT' : ' NIGHTS') + '</span>';
    var meta =
      '<dl class="d-meta">' +
      '<div><dt>ERA</dt><dd>' + s.years + '</dd></div>' +
      '<div><dt>CLASS</dt><dd>' + s.cls + '</dd></div>' +
      '<div><dt>OPERATOR</dt><dd>' + s.operator + '</dd></div>' +
      '<div><dt>STATUS</dt><dd>' + s.status + '</dd></div>' +
      '<div class="wide"><dt>OUTLOOK</dt><dd>' + s.outlook + '</dd></div>' +
      '</dl>';
    var beats = s.beats.map(function (b) {
      return '<li><span class="b-t">' + b[0] + '</span><span class="b-p">' + b[1] + '</span><span class="b-n">' + b[2] + '</span></li>';
    }).join('');
    detailEl.innerHTML =
      '<p class="d-kicker">PLAQUE Nº ' + s.no + '</p>' +
      '<h3 class="d-name">' + s.name + '</h3>' +
      '<p class="d-route">' + s.from + ' <span class="arr">→</span> ' + s.to + '</p>' +
      '<p class="d-chips">' + chips + '</p>' +
      meta +
      '<p class="d-blurb">' + s.blurb + '</p>' +
      '<h4 class="d-sub">THE NIGHT SEQUENCE</h4>' +
      '<ol class="beats">' + beats + '</ol>' +
      '<div class="d-nav">' +
      '<button type="button" id="prevSvc">← PREVIOUS</button>' +
      '<p id="svcCounter" class="mono">' + s.no + ' / 12</p>' +
      '<button type="button" id="nextSvc">NEXT →</button>' +
      '</div>';
    if (counterEl) counterEl = document.getElementById('svcCounter');
  }

  function select(id) {
    var s = byId[id];
    if (!s || !detailEl) return;
    current = id;
    rows.forEach(function (li) {
      var btn = li.querySelector('.svc-row');
      if (btn) btn.setAttribute('aria-current', li.dataset.id === id ? 'true' : 'false');
    });
    legendBtns.forEach(function (b) {
      var on = b.dataset.id === id;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    routeGroups.forEach(function (g) {
      var on = g.dataset.id === id;
      g.classList.toggle('is-selected', on);
      g.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    endLabels.forEach(function (l) { l.classList.remove('is-end'); });
    var fl = document.getElementById('lb-' + s.fromNode);
    var tl = document.getElementById('lb-' + s.toNode);
    if (fl) fl.classList.add('is-end');
    if (tl) tl.classList.add('is-end');
    renderDetail(s);
    if (rowB) rowB.set(s.line);
    if (liveEl) liveEl.textContent = 'Showing Nº ' + s.no + ', ' + s.name + ', ' + s.from + ' to ' + s.to + '.';
    lastUserSelect = Date.now();
  }

  /* Board rows */
  rows.forEach(function (li) {
    var btn = li.querySelector('.svc-row');
    if (!btn) return;
    btn.addEventListener('click', function () { select(li.dataset.id); SFX.tick(); });
  });

  /* Legend */
  legendBtns.forEach(function (b) {
    b.addEventListener('click', function () { select(b.dataset.id); SFX.tick(); });
  });

  /* Diagram routes */
  routeGroups.forEach(function (g) {
    g.addEventListener('click', function () { select(g.dataset.id); SFX.tick(); });
    g.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select(g.dataset.id);
        SFX.tick();
      }
    });
  });

  /* Prev / next (delegated: the buttons are re-rendered) */
  if (detailEl) {
    detailEl.addEventListener('click', function (e) {
      var prev = e.target.closest ? e.target.closest('#prevSvc') : null;
      var next = e.target.closest ? e.target.closest('#nextSvc') : null;
      if (!prev && !next) return;
      var idx = SERVICES.findIndex(function (s) { return s.id === current; });
      if (idx < 0) idx = 0;
      var n = (idx + (next ? 1 : -1) + SERVICES.length) % SERVICES.length;
      select(SERVICES[n].id);
      var btn = document.getElementById(next ? 'nextSvc' : 'prevSvc');
      if (btn) btn.focus();
      SFX.tick();
    });
  }

  /* Filters */
  var filterBtns = Array.prototype.slice.call(document.querySelectorAll('.filters .fbtn'));
  filterBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      filterBtns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var f = b.dataset.filter;
      rows.forEach(function (li) {
        var show = f === 'ALL' || li.dataset.status === f;
        li.hidden = !show;
      });
    });
  });

  /* Sound toggle */
  var soundBtn = document.getElementById('soundToggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', function () {
      if (!SFX.on) {
        SFX.ensure();
        SFX.on = true;
        soundBtn.setAttribute('aria-pressed', 'true');
        soundBtn.textContent = 'SOUND · ON';
        SFX.click();
      } else {
        SFX.on = false;
        soundBtn.setAttribute('aria-pressed', 'false');
        soundBtn.textContent = 'SOUND · OFF';
      }
    });
  }

  /* Clock */
  var clockH = document.getElementById('clock-h');
  var clockM = document.getElementById('clock-m');
  function tickClock() {
    if (!clockH || !clockM) return;
    var d = new Date();
    clockH.textContent = String(d.getHours()).padStart(2, '0');
    clockM.textContent = String(d.getMinutes()).padStart(2, '0');
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* Reveal on scroll */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window && !reduced()) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* Reduced-motion changes apply to the board live */
  if (REDUCED_MQ && rowA && rowB) {
    var applyReduced = function () {
      rowA.reduced = REDUCED_MQ.matches;
      rowB.reduced = REDUCED_MQ.matches;
      if (REDUCED_MQ.matches) { rowA.settleAll(); rowB.settleAll(); }
    };
    if (REDUCED_MQ.addEventListener) REDUCED_MQ.addEventListener('change', applyReduced);
    else if (REDUCED_MQ.addListener) REDUCED_MQ.addListener(applyReduced);
  }

  /* Boot */
  var flapA = document.getElementById('flapA');
  var flapB = document.getElementById('flapB');
  if (flapA) rowA = new SplitFlap(flapA, 36, reduced());
  if (flapB) rowB = new SplitFlap(flapB, 36, reduced());
  if (rowA) rowA.set(MSGS[0], { stagger: 10 });
  if (rowB) rowB.set(SERVICES[0].line, { stagger: 10, delay: 260 });
  select('orient');
  startCycler();
})();
