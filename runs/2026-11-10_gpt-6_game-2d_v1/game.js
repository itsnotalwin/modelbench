(() => {
  'use strict';

  const WIDTH = 1920;
  const HEIGHT = 1200;
  const FIXED_DT = 1 / 120;
  const RUN_SECONDS = 190;
  const MOTES_PER_RELAY = 4;
  const RELAY_NAMES = ['North Quay', 'Glass Market', 'Low Lantern'];
  const RELAY_LOCATIONS = ['NORTH QUAY / OUTER WATER', 'GLASS MARKET / EAST CUT', 'LOW LANTERN / SOUTH REACH'];
  const DOCKS = [
    { x: 245, y: 220, name: 'NORTH QUAY', subtitle: 'NORTH BEACON', angle: 0.24 },
    { x: 1670, y: 210, name: 'GLASS MARKET', subtitle: 'EAST BEACON', angle: 2.2 },
    { x: 1650, y: 1000, name: 'LOW LANTERN', subtitle: 'SOUTH BEACON', angle: -2.5 }
  ];
  const RELAY_MOTES = [
    [
      { x: 410, y: 345 }, { x: 705, y: 225 }, { x: 930, y: 390 }, { x: 510, y: 760 }
    ],
    [
      { x: 1280, y: 300 }, { x: 1510, y: 460 }, { x: 1180, y: 785 }, { x: 1650, y: 760 }
    ],
    [
      { x: 1420, y: 680 }, { x: 1190, y: 965 }, { x: 850, y: 850 }, { x: 520, y: 1010 }
    ]
  ];
  const FIELD_SETS = [
    [
      { x: 810, y: 300, radius: 190, force: 54, spin: 1 },
      { x: 520, y: 880, radius: 165, force: 62, spin: -1 }
    ],
    [
      { x: 1260, y: 500, radius: 190, force: 76, spin: -1 },
      { x: 730, y: 315, radius: 160, force: 67, spin: 1 },
      { x: 1110, y: 955, radius: 185, force: 78, spin: 1 }
    ],
    [
      { x: 620, y: 610, radius: 205, force: 88, spin: 1 },
      { x: 1390, y: 390, radius: 190, force: 88, spin: -1 },
      { x: 990, y: 1000, radius: 175, force: 82, spin: -1 },
      { x: 360, y: 250, radius: 145, force: 73, spin: 1 }
    ]
  ];
  const ROCKS = [
    { x: 740, y: 575, r: 29, kind: 0 }, { x: 1125, y: 255, r: 24, kind: 1 },
    { x: 1370, y: 700, r: 31, kind: 0 }, { x: 800, y: 1000, r: 23, kind: 1 },
    { x: 410, y: 910, r: 27, kind: 0 }, { x: 1510, y: 540, r: 22, kind: 1 },
    { x: 1020, y: 740, r: 18, kind: 1 }, { x: 300, y: 570, r: 20, kind: 0 },
    { x: 1780, y: 620, r: 25, kind: 1 }
  ];
  const DEFAULT_RECORDS = { bestScore: 0, bestTime: 0, runs: 0, sound: true, reducedMotion: false };

  const $ = (id) => document.getElementById(id);
  const ui = {
    canvas: $('gameCanvas'), stageFrame: $('stageFrame'), screenLayer: $('screenLayer'),
    titlePanel: $('titlePanel'), pausePanel: $('pausePanel'), winPanel: $('winPanel'), losePanel: $('losePanel'),
    startButton: $('startButton'), pauseButton: $('pauseButton'), resumeButton: $('resumeButton'),
    pauseRestartButton: $('pauseRestartButton'), runAgainButton: $('runAgainButton'), retryButton: $('retryButton'),
    soundToggle: $('soundToggle'), motionToggle: $('motionToggle'),
    missionPhase: $('missionPhase'), missionName: $('missionName'), missionCopy: $('missionCopy'),
    objectiveName: $('objectiveName'), stageCode: $('stageCode'), echoTrack: $('echoTrack'),
    echoCount: $('echoCount'), dockDistance: $('dockDistance'), timerValue: $('timerValue'),
    scoreValue: $('scoreValue'), hullValue: $('hullValue'), hullTrack: $('hullTrack'),
    boostValue: $('boostValue'), boostFill: $('boostFill'), relayList: $('relayList'),
    bestScore: $('bestScore'), bestTime: $('bestTime'), resetRecordsButton: $('resetRecordsButton'),
    resetConfirm: $('resetConfirm'), confirmResetButton: $('confirmResetButton'), cancelResetButton: $('cancelResetButton'),
    storageNote: $('storageNote'), stageLocation: $('stageLocation'), windReadout: $('windReadout'),
    stageStatus: $('stageStatus'), gameToast: $('gameToast'),
    winScore: $('winScore'), winTime: $('winTime'), winHull: $('winHull'), winBest: $('winBest'),
    loseScore: $('loseScore'), loseRelays: $('loseRelays'), loseEchoes: $('loseEchoes'), loseBest: $('loseBest'), lossCopy: $('lossCopy'),
    joystick: $('joystick'), joystickKnob: $('joystickKnob'), touchPulse: $('touchPulse'), touchBoost: $('touchBoost')
  };
  const ctx = ui.canvas.getContext('2d', { alpha: true, desynchronized: true });
  const background = document.createElement('canvas');
  background.width = WIDTH;
  background.height = HEIGHT;
  const bg = background.getContext('2d', { alpha: false });

  let storageOkay = true;
  let records = loadRecords();
  let mode = 'title';
  let stage = 0;
  let stageCollected = 0;
  let totalEchoes = 0;
  let delivered = 0;
  let score = 0;
  let kills = 0;
  let chain = 0;
  let timeLeft = RUN_SECONDS;
  let elapsed = 0;
  let accumulator = 0;
  let previousFrame = 0;
  let visualTime = 0;
  let hitStop = 0;
  let shake = 0;
  let shakeX = 0;
  let shakeY = 0;
  let toastTimer = 0;
  let dockHintCooldown = 0;
  let lastUiTick = 0;
  let gameSeed = 0x4c414e54;
  let rng = makeRng(gameSeed);
  let fxRng = makeRng(gameSeed ^ 0xa5a5f00d);
  let engineSoundTimer = 0;
  let currentFields = FIELD_SETS[0];
  let motes = [];
  let enemies = [];
  let pulses = [];
  let particles = [];
  let floaters = [];
  let dock = DOCKS[0];
  let enemySpawnTimer = 12;
  let titleTime = 0;
  let pointerAim = { x: 1180, y: 600, active: false };
  let joystick = { active: false, pointerId: null, x: 0, y: 0, magnitude: 0 };
  let audio = { context: null, master: null, ambient: [], started: false };
  let resizeObserver = null;
  const keys = new Set();

  const player = {
    x: 960, y: 600, vx: 0, vy: 0, angle: -0.28, radius: 17,
    health: 3, invulnerable: 0, rockCooldown: 0, boostEnergy: 1,
    boostTimer: 0, pulseCooldown: 0, thrusting: 0, wakePhase: 0
  };

  function makeRng(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6D2B79F5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function loadRecords() {
    try {
      const raw = window.localStorage.getItem('tideline-last-light-v1');
      if (!raw) return { ...DEFAULT_RECORDS };
      const parsed = JSON.parse(raw);
      return {
        bestScore: Number.isFinite(parsed.bestScore) && parsed.bestScore >= 0 ? Math.floor(parsed.bestScore) : 0,
        bestTime: Number.isFinite(parsed.bestTime) && parsed.bestTime > 0 ? parsed.bestTime : 0,
        runs: Number.isFinite(parsed.runs) && parsed.runs >= 0 ? Math.floor(parsed.runs) : 0,
        sound: typeof parsed.sound === 'boolean' ? parsed.sound : true,
        reducedMotion: typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : false
      };
    } catch (error) {
      storageOkay = false;
      return { ...DEFAULT_RECORDS };
    }
  }

  function saveRecords() {
    try {
      window.localStorage.setItem('tideline-last-light-v1', JSON.stringify(records));
      storageOkay = true;
    } catch (error) {
      storageOkay = false;
    }
    ui.storageNote.hidden = storageOkay;
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function formatScore(value) {
    return String(Math.max(0, Math.floor(value))).padStart(5, '0');
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function angleDelta(from, to) {
    let diff = (to - from + Math.PI) % (Math.PI * 2);
    if (diff < 0) diff += Math.PI * 2;
    return diff - Math.PI;
  }

  function updateCanvasSize() {
    const rect = ui.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(1.25, Math.max(1, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (ui.canvas.width !== width || ui.canvas.height !== height) {
      ui.canvas.width = width;
      ui.canvas.height = height;
    }
    ctx.setTransform(width / WIDTH, 0, 0, height / HEIGHT, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  function buildBackground() {
    const rand = makeRng(0x71de11e);
    const gradient = bg.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, '#0a2931');
    gradient.addColorStop(.45, '#0a2028');
    gradient.addColorStop(1, '#07171e');
    bg.fillStyle = gradient;
    bg.fillRect(0, 0, WIDTH, HEIGHT);

    const moon = bg.createRadialGradient(1470, 210, 10, 1470, 210, 620);
    moon.addColorStop(0, 'rgba(85, 161, 147, .16)');
    moon.addColorStop(.34, 'rgba(48, 112, 109, .07)');
    moon.addColorStop(1, 'rgba(12, 35, 43, 0)');
    bg.fillStyle = moon;
    bg.fillRect(0, 0, WIDTH, HEIGHT);

    for (let i = 0; i < 16; i++) {
      const y = 100 + i * 67 + rand() * 18;
      bg.beginPath();
      bg.moveTo(0, y);
      bg.bezierCurveTo(480, y - 28 + rand() * 45, 1300, y + 30 - rand() * 50, WIDTH, y - 5 + rand() * 26);
      bg.strokeStyle = `rgba(114, 192, 176, ${.018 + rand() * .026})`;
      bg.lineWidth = .8 + rand() * 1.2;
      bg.stroke();
    }

    bg.save();
    bg.strokeStyle = 'rgba(117, 196, 181, .055)';
    bg.lineWidth = 1;
    for (let x = 70; x < WIDTH; x += 96) {
      bg.beginPath(); bg.moveTo(x, 100); bg.bezierCurveTo(x - 30, 420, x + 35, 820, x + 5, 1100); bg.stroke();
    }
    for (let y = 130; y < HEIGHT; y += 105) {
      bg.beginPath(); bg.moveTo(70, y); bg.bezierCurveTo(550, y + 22, 1320, y - 18, 1850, y + 8); bg.stroke();
    }
    bg.restore();

    drawCityEdge(rand);
    drawBridge();
    drawMapAnnotations();

    for (let i = 0; i < 480; i++) {
      const x = rand() * WIDTH;
      const y = rand() * HEIGHT;
      const r = .5 + rand() * 1.8;
      bg.beginPath();
      bg.arc(x, y, r, 0, Math.PI * 2);
      bg.fillStyle = `rgba(177, 220, 204, ${.035 + rand() * .1})`;
      bg.fill();
    }

    for (const rock of ROCKS) drawRock(rock, 0, bg);

    const edge = bg.createRadialGradient(WIDTH / 2, HEIGHT / 2, 360, WIDTH / 2, HEIGHT / 2, 1120);
    edge.addColorStop(0, 'rgba(0,0,0,0)');
    edge.addColorStop(1, 'rgba(0, 8, 12, .42)');
    bg.fillStyle = edge;
    bg.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function drawCityEdge(rand) {
    const drawBand = (horizontal, edge) => {
      const count = horizontal ? 29 : 19;
      for (let i = 0; i < count; i++) {
        const along = i * (horizontal ? 69 : 64) + rand() * 18;
        const depth = 48 + rand() * 86;
        const breadth = 34 + rand() * 47;
        const x = horizontal ? along : (edge === 'left' ? 0 : WIDTH - depth);
        const y = horizontal ? (edge === 'top' ? 0 : HEIGHT - depth) : along;
        bg.fillStyle = i % 3 === 0 ? '#0a252c' : '#0b2027';
        bg.fillRect(x, y, horizontal ? breadth : depth, horizontal ? depth : breadth);
        bg.fillStyle = 'rgba(92, 155, 145, .13)';
        const rows = Math.max(1, Math.floor(depth / 17));
        const cols = Math.max(1, Math.floor(breadth / 13));
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            if (rand() > .58) {
              const wx = horizontal ? x + 7 + col * 12 : x + 8 + row * 13;
              const wy = horizontal ? y + 7 + row * 14 : y + 7 + col * 13;
              bg.fillStyle = rand() > .76 ? 'rgba(244, 189, 121, .23)' : 'rgba(117, 227, 208, .14)';
              bg.fillRect(wx, wy, 3, 5);
            }
          }
        }
      }
    };
    drawBand(true, 'top');
    drawBand(true, 'bottom');
    drawBand(false, 'left');
    drawBand(false, 'right');
    const topFade = bg.createLinearGradient(0, 0, 0, 155);
    topFade.addColorStop(0, 'rgba(4, 16, 21, .8)');
    topFade.addColorStop(1, 'rgba(4, 16, 21, 0)');
    bg.fillStyle = topFade; bg.fillRect(0, 0, WIDTH, 155);
    const bottomFade = bg.createLinearGradient(0, HEIGHT, 0, HEIGHT - 160);
    bottomFade.addColorStop(0, 'rgba(4, 16, 21, .8)');
    bottomFade.addColorStop(1, 'rgba(4, 16, 21, 0)');
    bg.fillStyle = bottomFade; bg.fillRect(0, HEIGHT - 160, WIDTH, 160);
  }

  function drawBridge() {
    bg.save();
    bg.globalAlpha = .66;
    bg.fillStyle = '#102f37';
    bg.beginPath();
    bg.moveTo(540, 405); bg.quadraticCurveTo(960, 315, 1380, 405); bg.lineTo(1380, 430); bg.quadraticCurveTo(960, 348, 540, 430); bg.closePath(); bg.fill();
    bg.strokeStyle = 'rgba(155, 206, 192, .34)'; bg.lineWidth = 3;
    bg.beginPath(); bg.moveTo(540, 405); bg.quadraticCurveTo(960, 315, 1380, 405); bg.stroke();
    bg.strokeStyle = 'rgba(155, 206, 192, .16)'; bg.lineWidth = 1;
    for (let i = 0; i <= 20; i++) {
      const x = 550 + i * 41;
      const t = (x - 540) / 840;
      const y = 405 - Math.sin(t * Math.PI) * 90;
      bg.beginPath(); bg.moveTo(x, y); bg.lineTo(x, 444); bg.stroke();
    }
    bg.fillStyle = '#143942';
    bg.fillRect(560, 402, 20, 112); bg.fillRect(1340, 402, 20, 112);
    bg.fillStyle = 'rgba(4, 15, 20, .35)';
    bg.fillRect(520, 505, 890, 14);
    bg.restore();
  }

  function drawMapAnnotations() {
    bg.save();
    bg.strokeStyle = 'rgba(124, 194, 178, .17)';
    bg.lineWidth = 1;
    bg.setLineDash([3, 10]);
    bg.beginPath(); bg.arc(960, 600, 410, 0, Math.PI * 2); bg.stroke();
    bg.beginPath(); bg.arc(960, 600, 600, 0, Math.PI * 2); bg.stroke();
    bg.setLineDash([]);
    bg.fillStyle = 'rgba(137, 194, 177, .33)';
    bg.font = '10px monospace';
    bg.fillText('OLD CHANNEL / 06', 105, 520);
    bg.fillText('SILT LINE', 1500, 930);
    bg.fillText('NORTH FLOODGATE', 760, 130);
    bg.fillStyle = 'rgba(244, 189, 121, .32)';
    bg.fillText('NO SIGNAL BEYOND THIS POINT', 1390, 1090);
    bg.restore();
  }

  function makeStageMotes(index) {
    return RELAY_MOTES[index].map((point, i) => ({
      x: point.x, y: point.y, phase: i * 1.7 + index * .8,
      collected: false, pulse: 0, index: i
    }));
  }

  function resetRun() {
    gameSeed = ((Date.now() >>> 0) ^ Math.imul(records.runs + 1, 0x9e3779b1)) >>> 0;
    rng = makeRng(gameSeed);
    fxRng = makeRng(gameSeed ^ 0xa5a5f00d);
    engineSoundTimer = 0;
    stage = 0;
    stageCollected = 0;
    totalEchoes = 0;
    delivered = 0;
    score = 0;
    kills = 0;
    chain = 0;
    timeLeft = RUN_SECONDS;
    elapsed = 0;
    lastUiTick = 0;
    accumulator = 0;
    player.wakePhase = 0;
    hitStop = 0;
    shake = 0;
    toastTimer = 0;
    dockHintCooldown = 0;
    player.x = 960; player.y = 600; player.vx = 0; player.vy = 0; player.angle = -Math.PI / 2;
    player.health = 3; player.invulnerable = 0; player.rockCooldown = 0;
    player.boostEnergy = 1; player.boostTimer = 0; player.pulseCooldown = 0; player.thrusting = 0;
    motes = makeStageMotes(0);
    enemies = [];
    pulses = [];
    particles = [];
    floaters = [];
    dock = DOCKS[0];
    currentFields = FIELD_SETS[0];
    enemySpawnTimer = 14;
    spawnEnemy(0);
    records.runs += 1;
    saveRecords();
    updateUI(true);
    showToast('FOUR ECHOES / THEN THE BEACON', 2.6);
  }

  function beginRun() {
    startAudio();
    resetRun();
    setMode('playing');
    playTone(430, .12, 'sine', .075, 690);
    playTone(650, .18, 'triangle', .045, 880, .08);
    ui.canvas.focus({ preventScroll: true });
  }

  function setMode(nextMode) {
    mode = nextMode;
    document.body.classList.toggle('is-playing', nextMode === 'playing');
    ui.titlePanel.hidden = nextMode !== 'title';
    ui.pausePanel.hidden = nextMode !== 'paused';
    ui.winPanel.hidden = nextMode !== 'won';
    ui.losePanel.hidden = nextMode !== 'lost';
    ui.screenLayer.classList.toggle('is-hidden', nextMode === 'playing');
    ui.pauseButton.hidden = nextMode !== 'playing';
    if (nextMode === 'playing') {
      ui.stageStatus.textContent = stageCollected < MOTES_PER_RELAY ? 'RECOVER THE ECHOES' : 'RETURN / EASE INTO DOCK';
    }
    updateUI(true);
  }

  function pauseRun() {
    if (mode !== 'playing') return;
    keys.clear();
    joystick.active = false;
    joystick.magnitude = 0;
    ui.joystickKnob.style.transform = 'translate(0, 0)';
    setMode('paused');
    playTone(250, .12, 'sine', .045, 190);
  }

  function resumeRun() {
    if (mode !== 'paused') return;
    setMode('playing');
    previousFrame = 0;
    accumulator = 0;
    playTone(320, .11, 'sine', .05, 520);
    ui.canvas.focus({ preventScroll: true });
  }

  function finishRun(won, reason) {
    if (mode !== 'playing') return;
    keys.clear();
    joystick.active = false;
    const elapsedRun = RUN_SECONDS + delivered * 16 - timeLeft;
    if (won) {
      score += Math.max(0, Math.floor(timeLeft * 18)) + player.health * 180 + kills * 35;
      if (score > records.bestScore) records.bestScore = score;
      const clearTime = Math.max(1, elapsedRun);
      if (!records.bestTime || clearTime < records.bestTime) records.bestTime = clearTime;
      ui.winScore.textContent = formatScore(score);
      ui.winTime.textContent = formatTime(clearTime);
      ui.winHull.textContent = `${player.health} / 3`;
      ui.winBest.textContent = formatScore(records.bestScore);
      playWinSound();
      setMode('won');
    } else {
      if (score > records.bestScore) records.bestScore = score;
      ui.loseScore.textContent = formatScore(score);
      ui.loseRelays.textContent = `${delivered} / 3`;
      ui.loseEchoes.textContent = `${totalEchoes} / 12`;
      ui.loseBest.textContent = formatScore(records.bestScore);
      ui.lossCopy.textContent = reason || 'The tide has taken the route. The light is still out there, somewhere.';
      playLoseSound();
      setMode('lost');
    }
    saveRecords();
    updateUI(true);
  }

  function deliverRelay() {
    if (stageCollected < MOTES_PER_RELAY || mode !== 'playing') return;
    const relayBonus = 260 + chain * 45 + Math.floor(timeLeft * 1.6);
    score += relayBonus;
    delivered += 1;
    player.health = Math.min(3, player.health + 1);
    player.boostEnergy = 1;
    timeLeft = Math.min(RUN_SECONDS + 48, timeLeft + 16);
    makeBurst(dock.x, dock.y, '#f4bd79', 34, 230);
    makeBurst(dock.x, dock.y, '#75e3d0', 22, 160);
    playDockSound();
    if (stage === 2) {
      showToast('ALL THREE RELAYS / SIGNAL RESTORED', 3.1);
      finishRun(true, '');
      return;
    }
    stage += 1;
    stageCollected = 0;
    motes = makeStageMotes(stage);
    dock = DOCKS[stage];
    currentFields = FIELD_SETS[stage];
    pulses = [];
    player.vx *= .22; player.vy *= .22;
    player.invulnerable = Math.max(player.invulnerable, 1.2);
    enemies = enemies.slice(0, Math.max(1, enemies.length - 1));
    spawnEnemy(stage);
    enemySpawnTimer = Math.max(8, 13 - stage * 2);
    chain = 0;
    showToast(`RELAY ${String(stage + 1).padStart(2, '0')} / ${RELAY_NAMES[stage].toUpperCase()}`, 2.8);
    updateUI(true);
  }

  function spawnEnemy(stageIndex) {
    const edge = Math.floor(rng() * 4);
    let x, y;
    if (edge === 0) { x = 50 + rng() * (WIDTH - 100); y = 75; }
    else if (edge === 1) { x = WIDTH - 75; y = 130 + rng() * (HEIGHT - 260); }
    else if (edge === 2) { x = 50 + rng() * (WIDTH - 100); y = HEIGHT - 75; }
    else { x = 75; y = 130 + rng() * (HEIGHT - 260); }
    enemies.push({
      x, y, vx: 0, vy: 0, angle: Math.atan2(player.y - y, player.x - x),
      radius: 19 + stageIndex * 1.2, phase: rng() * Math.PI * 2,
      speed: 92 + stageIndex * 19 + rng() * 15, stunned: 0, wobble: rng() * 8
    });
    if (enemies.length > 7) enemies.shift();
  }

  function firePulse(direction) {
    if (mode !== 'playing' || player.pulseCooldown > 0) return;
    let angle = direction;
    if (!Number.isFinite(angle)) angle = player.angle;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const muzzleX = player.x + dx * 25;
    const muzzleY = player.y + dy * 25;
    pulses.push({
      x: muzzleX, y: muzzleY, px: muzzleX, py: muzzleY,
      vx: dx * 760 + player.vx * .28, vy: dy * 760 + player.vy * .28,
      radius: 8, life: .62, angle
    });
    player.pulseCooldown = .48;
    makeBurst(muzzleX, muzzleY, '#75e3d0', 5, 75);
    playPulseSound();
  }

  function tryBoost() {
    if (mode !== 'playing' || player.boostEnergy < .28 || player.boostTimer > .04) return;
    player.boostEnergy = Math.max(0, player.boostEnergy - .34);
    player.boostTimer = .52;
    makeBurst(player.x - Math.cos(player.angle) * 24, player.y - Math.sin(player.angle) * 24, '#f4bd79', 13, 110);
    playBoostSound();
    showToast('BURST / HOLD YOUR LINE', .8);
  }

  function applyFieldForce(body, dt, multiplier = 1) {
    for (const field of currentFields) {
      const dx = field.x - body.x;
      const dy = field.y - body.y;
      const d = Math.hypot(dx, dy);
      if (d > 1 && d < field.radius) {
        const falloff = 1 - d / field.radius;
        const pull = field.force * falloff * falloff;
        const tangentX = -dy / d * field.spin;
        const tangentY = dx / d * field.spin;
        body.vx += (dx / d * pull * .2 + tangentX * pull * .8) * dt * multiplier;
        body.vy += (dy / d * pull * .2 + tangentY * pull * .8) * dt * multiplier;
      }
    }
  }

  function updatePlayer(dt) {
    const left = keys.has('a') || keys.has('arrowleft');
    const right = keys.has('d') || keys.has('arrowright');
    const forward = keys.has('w') || keys.has('arrowup');
    const reverse = keys.has('s') || keys.has('arrowdown');
    const steer = (right ? 1 : 0) - (left ? 1 : 0);
    const speed = Math.hypot(player.vx, player.vy);
    let throttle = forward ? 1 : 0;

    if (joystick.active && joystick.magnitude > .08) {
      const desired = Math.atan2(joystick.y, joystick.x);
      const diff = angleDelta(player.angle, desired);
      player.angle += diff * Math.min(1, dt * 8.5);
      throttle = joystick.magnitude;
    } else if (steer !== 0) {
      const turnRate = 2.6 * (.62 + Math.min(1, speed / 250) * .38);
      player.angle += steer * turnRate * dt;
    }

    const boosted = player.boostTimer > 0;
    const acceleration = boosted ? 690 : 335;
    if (throttle > 0) {
      player.vx += Math.cos(player.angle) * acceleration * throttle * dt;
      player.vy += Math.sin(player.angle) * acceleration * throttle * dt;
    }
    if (reverse) {
      const currentSpeed = Math.hypot(player.vx, player.vy);
      if (currentSpeed > 34) {
        const brake = Math.exp(-3.4 * dt);
        player.vx *= brake;
        player.vy *= brake;
      } else {
        player.vx -= Math.cos(player.angle) * 135 * dt;
        player.vy -= Math.sin(player.angle) * 135 * dt;
      }
    }

    applyFieldForce(player, dt, 1);
    const drag = Math.exp(-.24 * dt);
    player.vx *= drag;
    player.vy *= drag;
    const maxSpeed = boosted ? 455 : 330;
    const velocity = Math.hypot(player.vx, player.vy);
    if (velocity > maxSpeed) {
      const scale = maxSpeed / velocity;
      player.vx *= scale; player.vy *= scale;
    }
    player.thrusting = throttle;
    player.wakePhase += dt * (1.8 + Math.hypot(player.vx, player.vy) * .012);
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    if (player.x < 34) { player.x = 34; player.vx = Math.abs(player.vx) * .58; }
    if (player.x > WIDTH - 34) { player.x = WIDTH - 34; player.vx = -Math.abs(player.vx) * .58; }
    if (player.y < 45) { player.y = 45; player.vy = Math.abs(player.vy) * .58; }
    if (player.y > HEIGHT - 45) { player.y = HEIGHT - 45; player.vy = -Math.abs(player.vy) * .58; }

    for (const rock of ROCKS) {
      const dx = player.x - rock.x;
      const dy = player.y - rock.y;
      const d = Math.hypot(dx, dy);
      const minDistance = player.radius + rock.r;
      if (d < minDistance) {
        const nx = d > .001 ? dx / d : 1;
        const ny = d > .001 ? dy / d : 0;
        player.x = rock.x + nx * minDistance;
        player.y = rock.y + ny * minDistance;
        const into = player.vx * nx + player.vy * ny;
        if (into < 0) {
          player.vx -= 1.55 * into * nx;
          player.vy -= 1.55 * into * ny;
        }
        if (player.rockCooldown <= 0 && Math.hypot(player.vx, player.vy) > 125) {
          damagePlayer(rock.x, rock.y, 'A submerged pylon clipped your hull.');
          player.rockCooldown = .7;
          if (mode !== 'playing') return;
        }
      }
    }

    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.rockCooldown = Math.max(0, player.rockCooldown - dt);
    player.pulseCooldown = Math.max(0, player.pulseCooldown - dt);
    player.boostTimer = Math.max(0, player.boostTimer - dt);
    player.boostEnergy = Math.min(1, player.boostEnergy + .145 * dt);
  }

  function damagePlayer(sourceX, sourceY, message) {
    if (player.invulnerable > 0 || mode !== 'playing') return;
    const dx = player.x - sourceX;
    const dy = player.y - sourceY;
    const d = Math.hypot(dx, dy) || 1;
    player.vx += dx / d * 190;
    player.vy += dy / d * 190;
    player.health -= 1;
    player.invulnerable = 1.42;
    chain = 0;
    hitStop = .055;
    shake = Math.max(shake, 8);
    makeBurst(player.x, player.y, '#ff8277', 18, 180);
    playHitSound();
    showToast(message || 'HULL STRIKE / FIND OPEN WATER', 1.5);
    updateUI(true);
    if (player.health <= 0) finishRun(false, 'The skiff has taken one hit too many. The last beacon is still dark.');
  }

  function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (enemy.stunned > 0) {
        enemy.stunned -= dt;
        enemy.vx *= Math.exp(-1.8 * dt);
        enemy.vy *= Math.exp(-1.8 * dt);
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
        if (enemy.stunned <= 0) enemies.splice(i, 1);
        continue;
      }
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d, ny = dy / d;
      const side = Math.sin(elapsed * 2.1 + enemy.phase) * 24;
      enemy.vx += (nx * 115 - ny * side) * dt;
      enemy.vy += (ny * 115 + nx * side) * dt;
      applyFieldForce(enemy, dt, .3);
      enemy.vx *= Math.exp(-.48 * dt);
      enemy.vy *= Math.exp(-.48 * dt);
      const v = Math.hypot(enemy.vx, enemy.vy);
      const cap = enemy.speed;
      if (v > cap) { enemy.vx *= cap / v; enemy.vy *= cap / v; }
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.angle = Math.atan2(enemy.vy, enemy.vx);
      enemy.x = clamp(enemy.x, 28, WIDTH - 28);
      enemy.y = clamp(enemy.y, 28, HEIGHT - 28);
      if (d < player.radius + enemy.radius + 5) {
        damagePlayer(enemy.x, enemy.y, 'A gloom eel found your wake. Break contact.');
        enemy.vx -= nx * 130;
        enemy.vy -= ny * 130;
      }
    }
  }

  function segmentCircleHit(x1, y1, x2, y2, cx, cy, radius) {
    const vx = x2 - x1;
    const vy = y2 - y1;
    const wx = cx - x1;
    const wy = cy - y1;
    const lenSq = vx * vx + vy * vy;
    const t = lenSq > 0 ? clamp((wx * vx + wy * vy) / lenSq, 0, 1) : 0;
    const px = x1 + vx * t;
    const py = y1 + vy * t;
    const dx = cx - px;
    const dy = cy - py;
    return dx * dx + dy * dy <= radius * radius;
  }

  function updatePulses(dt) {
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pulse = pulses[i];
      pulse.px = pulse.x; pulse.py = pulse.y;
      pulse.x += pulse.vx * dt;
      pulse.y += pulse.vy * dt;
      pulse.life -= dt;
      let hit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        if (segmentCircleHit(pulse.px, pulse.py, pulse.x, pulse.y, enemy.x, enemy.y, pulse.radius + enemy.radius)) {
          makeBurst(enemy.x, enemy.y, '#75e3d0', 25, 210);
          floaters.push({ x: enemy.x, y: enemy.y - 10, text: '+150 / EEL CLEARED', life: 1.1, maxLife: 1.1, color: '#75e3d0' });
          score += 150;
          kills += 1;
          enemies.splice(j, 1);
          playZapSound();
          updateUI(true);
          hit = true;
          break;
        }
      }
      if (hit || pulse.life <= 0 || pulse.x < 0 || pulse.y < 0 || pulse.x > WIDTH || pulse.y > HEIGHT) pulses.splice(i, 1);
    }
  }

  function updateMotes() {
    for (const mote of motes) {
      if (mote.collected) continue;
      const d = Math.hypot(player.x - mote.x, player.y - mote.y);
      if (d < player.radius + 23) {
        mote.collected = true;
        stageCollected += 1;
        totalEchoes += 1;
        chain = Math.min(5, chain + 1);
        const gained = 100 * chain;
        score += gained;
        makeBurst(mote.x, mote.y, '#f4bd79', 22, 150);
        floaters.push({ x: mote.x, y: mote.y - 12, text: `+${gained} / ECHO ×${chain}`, life: 1.15, maxLife: 1.15, color: '#f4bd79' });
        playCollectSound(chain);
        showToast(`${String(stageCollected).padStart(2, '0')} / 04 ECHOES SECURED`, .9);
        updateUI(true);
      }
    }
  }

  function updateDock(dt) {
    dockHintCooldown = Math.max(0, dockHintCooldown - dt);
    if (stageCollected < MOTES_PER_RELAY) return;
    const d = distance(player, dock);
    if (d < 105) {
      const speed = Math.hypot(player.vx, player.vy);
      if (speed < 102) {
        deliverRelay();
      } else if (dockHintCooldown <= 0) {
        showToast('EASE OFF / SLOW TO DOCK', 1.05);
        dockHintCooldown = 1.25;
      }
    }
  }

  function update(dt) {
    if (mode !== 'playing') return;
    if (hitStop > 0) {
      hitStop = Math.max(0, hitStop - dt);
      return;
    }
    elapsed += dt;
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      finishRun(false, 'The high water arrived before the last relay could answer.');
      return;
    }

    updatePlayer(dt);
    if (mode !== 'playing') return;
    updateEnemies(dt);
    if (mode !== 'playing') return;
    updatePulses(dt);
    updateMotes();
    updateDock(dt);
    if (mode !== 'playing') return;

    enemySpawnTimer -= dt;
    const enemyCap = 2 + stage;
    if (enemySpawnTimer <= 0 && enemies.length < enemyCap) {
      spawnEnemy(stage);
      enemySpawnTimer = Math.max(7.5, 15 - stage * 2.2);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-1.9 * dt);
      p.vy *= Math.exp(-1.9 * dt);
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.y -= 28 * dt;
      f.life -= dt;
      if (f.life <= 0) floaters.splice(i, 1);
    }
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) ui.gameToast.hidden = true;
    }
    shake *= Math.exp(-8 * dt);
    if (records.sound && audio.context && audio.context.state === 'running' && player.thrusting > .1) {
      engineSoundTimer -= dt;
      if (engineSoundTimer <= 0) { updateEngineSound(); engineSoundTimer = .12; }
    } else {
      engineSoundTimer = 0;
    }
    if (elapsed - lastUiTick > .08) {
      lastUiTick = elapsed;
      updateUI(false);
    }
  }

  function makeBurst(x, y, color, count, speed) {
    const total = Math.min(count, 48);
    for (let i = 0; i < total; i++) {
      const angle = fxRng() * Math.PI * 2;
      const magnitude = speed * (.24 + fxRng() * .76);
      const life = .28 + fxRng() * .55;
      particles.push({ x, y, vx: Math.cos(angle) * magnitude, vy: Math.sin(angle) * magnitude, life, maxLife: life, radius: 1.2 + fxRng() * 2.5, color });
    }
    if (particles.length > 260) particles.splice(0, particles.length - 260);
  }

  function showToast(message, duration) {
    ui.gameToast.textContent = message;
    ui.gameToast.hidden = false;
    toastTimer = duration;
  }

  function updateUI(force) {
    if (!force && mode === 'title') return;
    ui.timerValue.textContent = formatTime(timeLeft);
    ui.scoreValue.textContent = formatScore(score);
    ui.hullValue.textContent = `${player.health} / 3`;
    ui.boostValue.textContent = `${Math.round(player.boostEnergy * 100)}%`;
    ui.boostFill.style.width = `${player.boostEnergy * 100}%`;
    const hullCells = ui.hullTrack.querySelectorAll('i');
    hullCells.forEach((cell, index) => cell.classList.toggle('is-empty', index >= player.health));
    const echoCells = ui.echoTrack.querySelectorAll('.echo-cell');
    echoCells.forEach((cell, index) => cell.classList.toggle('is-lit', index < stageCollected));
    ui.echoTrack.setAttribute('aria-label', `Echoes collected: ${stageCollected} of ${MOTES_PER_RELAY}`);
    ui.echoCount.textContent = `${stageCollected} / 4 ECHOES`;
    ui.stageCode.textContent = `${String(stage + 1).padStart(2, '0')} / 03`;
    ui.objectiveName.textContent = stageCollected < MOTES_PER_RELAY ? 'Recover the echo motes' : 'Return to the beacon';
    ui.missionPhase.textContent = mode === 'title' ? 'INCOMING TRANSMISSION' : mode === 'won' ? 'SIGNAL RESTORED' : mode === 'lost' ? 'TRANSMISSION ENDED' : mode === 'paused' ? 'VESSEL IDLE' : `RELAY ${String(stage + 1).padStart(2, '0')} / ACTIVE`;
    ui.missionName.innerHTML = mode === 'title' ? 'A city<br><em>under glass.</em>' : `${RELAY_NAMES[stage]}<br><em>${stageCollected === 4 ? 'Come home.' : 'Find the light.'}</em>`;
    ui.missionCopy.textContent = mode === 'title'
      ? 'Three dark relays. Twelve lost echoes. Bring the signal home before the water takes the last of it.'
      : stageCollected < 4
        ? `Four echoes are scattered through ${RELAY_NAMES[stage].toLowerCase()}. The currents are getting restless. Keep your hull between the rocks and the dark.`
        : `All four echoes are aboard. Find the ${dock.name.toLowerCase()} beacon and arrive slowly enough for the light to catch you.`;
    ui.stageLocation.textContent = RELAY_LOCATIONS[stage];
    ui.windReadout.textContent = ['ESE 08', 'NNE 13', 'SW 17'][stage];
    const dockDist = Math.round(distance(player, dock));
    ui.dockDistance.textContent = stageCollected === 4 ? `DOCK: ${dockDist}M` : 'DOCK: LOCKED';
    const statusText = stageCollected < 4 ? 'RECOVER THE ECHOES' : Math.hypot(player.vx, player.vy) > 102 ? 'DOCK / REDUCE SPEED' : 'DOCK / BEACON READY';
    if (ui.stageStatus.textContent !== statusText) ui.stageStatus.textContent = statusText;
    const relayItems = ui.relayList.querySelectorAll('li');
    relayItems.forEach((item, index) => {
      item.classList.toggle('is-done', index < delivered);
      item.classList.toggle('is-current', index === stage && delivered < 3);
      const state = item.querySelector('.relay-state');
      state.textContent = index < delivered ? 'LIT' : index === stage && mode === 'playing' ? 'LIVE' : 'WAIT';
    });
    ui.bestScore.textContent = records.bestScore ? formatScore(records.bestScore) : '—';
    ui.bestTime.textContent = records.bestTime ? formatTime(records.bestTime) : '—';
    ui.winBest.textContent = records.bestScore ? formatScore(records.bestScore) : '—';
    ui.loseBest.textContent = records.bestScore ? formatScore(records.bestScore) : '—';
    ui.soundToggle.setAttribute('aria-pressed', String(records.sound));
    ui.soundToggle.setAttribute('aria-label', records.sound ? 'Turn sound off' : 'Turn sound on');
    ui.soundToggle.title = records.sound ? 'Sound on' : 'Sound off';
    ui.motionToggle.setAttribute('aria-pressed', String(records.reducedMotion));
    ui.motionToggle.setAttribute('aria-label', records.reducedMotion ? 'Use full motion' : 'Reduce motion');
    ui.motionToggle.title = records.reducedMotion ? 'Motion: reduced' : 'Motion: full';
    ui.storageNote.hidden = storageOkay;
  }

  function drawScene(time) {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const activeTime = mode === 'playing' ? elapsed : titleTime;
    const renderTime = records.reducedMotion ? 0 : activeTime;
    if (!records.reducedMotion) drawCurrentFlow(renderTime);
    drawFields(renderTime);
    drawDock(dock, renderTime, stageCollected === MOTES_PER_RELAY);
    for (const mote of motes) if (!mote.collected) drawMote(mote, renderTime);

    ctx.save();
    if (shake > .2 && !records.reducedMotion && mode === 'playing') {
      shakeX = Math.sin(visualTime * 71) * shake * .5;
      shakeY = Math.cos(visualTime * 83) * shake * .35;
    } else { shakeX = 0; shakeY = 0; }
    ctx.translate(shakeX, shakeY);
    for (const pulse of pulses) drawPulse(pulse);
    for (const enemy of enemies) drawEnemy(enemy, renderTime);
    for (const particle of particles) drawParticle(particle);
    for (const floater of floaters) drawFloater(floater);
    if (mode === 'title') {
      const demo = { ...player, x: 960 + Math.sin(time * .28) * 34, y: 640 + Math.sin(time * .55) * 15, angle: -.24 + Math.sin(time * .2) * .08, vx: 35, vy: -6, invulnerable: 0, thrusting: .4, wakePhase: time * 2 };
      drawPlayer(demo, renderTime);
      if (!records.reducedMotion) drawAttractDetails(renderTime);
    } else {
      drawPlayer(player, renderTime);
      if (mode === 'playing' && pointerAim.active) drawAimReticle(pointerAim.x, pointerAim.y, renderTime);
    }
    ctx.restore();
    drawMapOverlay(activeTime);
  }

  function drawCurrentFlow(time) {
    ctx.save();
    ctx.lineWidth = 1;
    for (let i = 0; i < 22; i++) {
      const y = 150 + i * 43;
      const phase = time * .11 + i * .54;
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(phase) * 10);
      ctx.bezierCurveTo(520, y - 30 + Math.sin(phase + 1) * 24, 1290, y + 26 + Math.cos(phase) * 24, WIDTH, y - 8 + Math.sin(phase + 2) * 18);
      ctx.strokeStyle = `rgba(123, 198, 180, ${.022 + (i % 4) * .006})`;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFields(time) {
    for (const field of currentFields) {
      ctx.save();
      const glow = ctx.createRadialGradient(field.x, field.y, 4, field.x, field.y, field.radius);
      glow.addColorStop(0, 'rgba(93, 179, 163, .095)');
      glow.addColorStop(.55, 'rgba(70, 150, 142, .035)');
      glow.addColorStop(1, 'rgba(70, 150, 142, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(field.x, field.y, field.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(117, 227, 208, .11)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(field.x, field.y, field.radius * .7, time * .13, time * .13 + Math.PI * 1.25); ctx.stroke();
      ctx.strokeStyle = 'rgba(117, 227, 208, .08)';
      ctx.beginPath(); ctx.arc(field.x, field.y, field.radius * .43, -time * .18, -time * .18 + Math.PI * 1.45); ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = time * .22 * field.spin + i * Math.PI / 2;
        const r = field.radius * (.28 + (i % 2) * .2);
        const x = field.x + Math.cos(a) * r;
        const y = field.y + Math.sin(a) * r;
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(117, 227, 208, .3)'; ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawRock(rock, time, target = ctx) {
    target.save();
    target.translate(rock.x, rock.y);
    target.fillStyle = 'rgba(1, 9, 13, .34)';
    target.beginPath(); target.ellipse(4, 10, rock.r * 1.35, rock.r * .85, .1, 0, Math.PI * 2); target.fill();
    const grad = target.createRadialGradient(-rock.r * .3, -rock.r * .4, 2, 0, 0, rock.r * 1.2);
    grad.addColorStop(0, rock.kind ? '#44636a' : '#34555c');
    grad.addColorStop(.65, '#1a3a43');
    grad.addColorStop(1, '#0b222a');
    target.fillStyle = grad;
    target.beginPath(); target.arc(0, 0, rock.r, 0, Math.PI * 2); target.fill();
    target.strokeStyle = 'rgba(147, 195, 179, .24)'; target.lineWidth = 1.3; target.stroke();
    target.beginPath(); target.ellipse(0, -rock.r * .12, rock.r * .56, rock.r * .38, -.3, 0, Math.PI * 2);
    target.strokeStyle = 'rgba(175, 208, 186, .16)'; target.stroke();
    if (rock.kind) {
      target.fillStyle = 'rgba(244, 189, 121, .75)';
      target.beginPath(); target.arc(0, -rock.r * .35, 2.2 + Math.sin(time * 2 + rock.x) * .4, 0, Math.PI * 2); target.fill();
    } else {
      target.fillStyle = 'rgba(117, 227, 208, .45)';
      target.beginPath(); target.arc(-rock.r * .25, -rock.r * .4, 2, 0, Math.PI * 2); target.fill();
    }
    target.restore();
  }

  function drawDock(target, time, active) {
    if (!target) return;
    ctx.save();
    const pulse = .5 + .5 * Math.sin(time * 2.1);
    const radius = 70 + pulse * 5;
    const halo = ctx.createRadialGradient(target.x, target.y, 10, target.x, target.y, 170);
    halo.addColorStop(0, active ? 'rgba(117, 227, 208, .2)' : 'rgba(117, 227, 208, .09)');
    halo.addColorStop(1, 'rgba(117, 227, 208, 0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(target.x, target.y, 170, 0, Math.PI * 2); ctx.fill();
    ctx.translate(target.x, target.y);
    ctx.rotate(target.angle);
    ctx.fillStyle = 'rgba(0, 8, 12, .38)';
    ctx.beginPath(); ctx.ellipse(4, 24, 112, 58, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#193a40';
    ctx.beginPath(); ctx.moveTo(-104, -29); ctx.lineTo(82, -29); ctx.lineTo(106, -5); ctx.lineTo(88, 34); ctx.lineTo(-91, 34); ctx.lineTo(-111, 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(164, 203, 187, .34)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(117, 227, 208, .25)'; ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(-84, i * 8); ctx.lineTo(82, i * 8); ctx.stroke();
    }
    ctx.fillStyle = '#2b5358';
    ctx.fillRect(-18, -40, 38, 61);
    ctx.fillStyle = '#b3c8b7';
    ctx.fillRect(-9, -48, 20, 15);
    ctx.fillStyle = active ? '#75e3d0' : '#f4bd79';
    ctx.shadowColor = active ? '#75e3d0' : '#f4bd79'; ctx.shadowBlur = 18 + pulse * 9;
    ctx.beginPath(); ctx.arc(1, -42, 5 + pulse * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = active ? 'rgba(117, 227, 208, .9)' : 'rgba(244, 189, 121, .55)';
    ctx.lineWidth = 2; ctx.setLineDash([7, 7]);
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(180, 223, 204, .24)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-130, -48); ctx.lineTo(-130, 46); ctx.moveTo(130, -48); ctx.lineTo(130, 46); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.letterSpacing = '2px';
    ctx.fillStyle = active ? '#75e3d0' : 'rgba(211, 218, 194, .62)';
    ctx.fillText(target.name, target.x, target.y + 91);
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(142, 178, 166, .54)';
    ctx.fillText(active ? 'BEACON / DOCK SLOWLY' : 'BEACON / SIGNAL WAITING', target.x, target.y + 106);
    ctx.restore();
  }

  function drawMote(mote, time) {
    const bob = Math.sin(time * 2.3 + mote.phase) * 5;
    const spin = time * .5 + mote.phase;
    ctx.save();
    ctx.translate(mote.x, mote.y + bob);
    const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, 46);
    halo.addColorStop(0, 'rgba(244, 189, 121, .22)');
    halo.addColorStop(1, 'rgba(244, 189, 121, 0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, 46, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(244, 189, 121, .32)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 19 + Math.sin(time * 2.6 + mote.phase) * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(spin);
    ctx.shadowColor = '#f4bd79'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#f4bd79';
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 0); ctx.lineTo(0, 12); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff0c7'; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawEnemy(enemy, time) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle);
    const wobble = Math.sin(time * 5 + enemy.phase) * 3;
    ctx.fillStyle = 'rgba(0, 6, 10, .25)';
    ctx.beginPath(); ctx.ellipse(-4, 13, 30, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(88, 165, 158, .28)'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-29, -wobble, -42, Math.sin(time * 4 + enemy.phase) * 10); ctx.stroke();
    const body = ctx.createLinearGradient(-22, -8, 18, 9);
    body.addColorStop(0, '#173b43'); body.addColorStop(.55, '#285c61'); body.addColorStop(1, '#0d292f');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(24, 0); ctx.quadraticCurveTo(7, -15, -14, -9); ctx.quadraticCurveTo(-25, 0, -14, 10); ctx.quadraticCurveTo(9, 17, 24, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(121, 210, 190, .28)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#ff8277'; ctx.shadowColor = '#ff8277'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(11, -4, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11, 4, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawPulse(pulse) {
    ctx.save();
    ctx.strokeStyle = 'rgba(117, 227, 208, .22)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pulse.x - pulse.vx * .045, pulse.y - pulse.vy * .045); ctx.lineTo(pulse.x, pulse.y); ctx.stroke();
    ctx.strokeStyle = '#75e3d0'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(pulse.x - pulse.vx * .018, pulse.y - pulse.vy * .018); ctx.lineTo(pulse.x, pulse.y); ctx.stroke();
    ctx.fillStyle = '#effff0'; ctx.shadowColor = '#75e3d0'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(pulse.x, pulse.y, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawParticle(particle) {
    ctx.save();
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawFloater(floater) {
    ctx.save();
    ctx.globalAlpha = clamp(floater.life / floater.maxLife, 0, 1);
    ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.letterSpacing = '1px';
    ctx.fillStyle = floater.color; ctx.shadowColor = floater.color; ctx.shadowBlur = 8;
    ctx.fillText(floater.text, floater.x, floater.y);
    ctx.restore();
  }

  function drawPlayer(ship, time) {
    if (ship.invulnerable > 0 && Math.floor(time * 18) % 2 === 0 && mode === 'playing') return;
    const speed = Math.hypot(ship.vx, ship.vy);
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.fillStyle = 'rgba(0, 7, 11, .38)';
    ctx.beginPath(); ctx.ellipse(-3, 13, 31, 14, 0, 0, Math.PI * 2); ctx.fill();
    if (speed > 18 || ship.thrusting > .1) {
      const wakeLength = 26 + Math.min(30, speed * .08);
      ctx.strokeStyle = 'rgba(117, 227, 208, .19)'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const y = (i - 1) * 7 + Math.sin(ship.wakePhase + i) * 2;
        ctx.beginPath(); ctx.moveTo(-18, y); ctx.quadraticCurveTo(-wakeLength * .65, y + Math.sin(ship.wakePhase + i) * 4, -wakeLength, y * .5); ctx.stroke();
      }
    }
    if (ship.boostTimer > 0) {
      ctx.fillStyle = 'rgba(244, 189, 121, .85)'; ctx.shadowColor = '#f4bd79'; ctx.shadowBlur = 17;
      ctx.beginPath(); ctx.moveTo(-19, -5); ctx.lineTo(-45 - Math.sin(time * 28) * 8, 0); ctx.lineTo(-19, 5); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
    }
    const hull = ctx.createLinearGradient(0, -17, 0, 17);
    hull.addColorStop(0, '#d8e7d4'); hull.addColorStop(.48, '#78bdb0'); hull.addColorStop(1, '#397d7d');
    ctx.fillStyle = hull;
    ctx.beginPath(); ctx.moveTo(29, 0); ctx.quadraticCurveTo(13, -15, -17, -12); ctx.lineTo(-25, -6); ctx.lineTo(-28, 0); ctx.lineTo(-25, 6); ctx.lineTo(-17, 12); ctx.quadraticCurveTo(13, 15, 29, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(226, 244, 222, .7)'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.fillStyle = '#1b444a';
    ctx.beginPath(); ctx.ellipse(1, 0, 12, 7.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(229, 241, 218, .5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#d3e4ce';
    ctx.beginPath(); ctx.ellipse(1, 0, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4bd79'; ctx.shadowColor = '#f4bd79'; ctx.shadowBlur = 13;
    ctx.beginPath(); ctx.arc(26, 0, 3.1, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1d5157';
    ctx.beginPath(); ctx.moveTo(-20, -8); ctx.lineTo(-28, -13); ctx.lineTo(-24, -3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-20, 8); ctx.lineTo(-28, 13); ctx.lineTo(-24, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawAimReticle(x, y, time) {
    ctx.save();
    ctx.translate(x, y);
    const radius = 13 + Math.sin(time * 5) * 1.5;
    ctx.strokeStyle = 'rgba(117, 227, 208, .72)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-21, 0); ctx.lineTo(-8, 0); ctx.moveTo(8, 0); ctx.lineTo(21, 0);
    ctx.moveTo(0, -21); ctx.lineTo(0, -8); ctx.moveTo(0, 8); ctx.lineTo(0, 21); ctx.stroke();
    ctx.fillStyle = 'rgba(244, 189, 121, .9)'; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawAttractDetails(time) {
    ctx.save();
    ctx.globalAlpha = .58;
    for (let i = 0; i < 6; i++) {
      const x = 1120 + Math.sin(time * .25 + i * 1.3) * (100 + i * 18);
      const y = 500 + Math.cos(time * .31 + i * 1.1) * (75 + i * 9);
      ctx.strokeStyle = 'rgba(117, 227, 208, .24)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 10 + i * 4, time * .15, time * .15 + Math.PI * 1.2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawMapOverlay(time) {
    ctx.save();
    ctx.strokeStyle = 'rgba(154, 207, 190, .28)'; ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, WIDTH - 32, HEIGHT - 32);
    ctx.fillStyle = 'rgba(176, 214, 194, .35)';
    ctx.font = '9px monospace'; ctx.letterSpacing = '2px';
    ctx.fillText('TIDELINE / FLOOD MAP 07', 38, 42);
    ctx.textAlign = 'right';
    const tidePercent = clamp(100 - ((timeLeft - delivered * 16) / RUN_SECONDS) * 100, 0, 100);
    ctx.fillText(`TIDE ${Math.round(tidePercent)}%`, WIDTH - 38, 42);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(132, 185, 171, .3)';
    ctx.fillText('N', WIDTH - 45, 82);
    ctx.strokeStyle = 'rgba(132, 185, 171, .3)';
    ctx.beginPath(); ctx.moveTo(WIDTH - 42, 91); ctx.lineTo(WIDTH - 42, 111); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(WIDTH - 46, 97); ctx.lineTo(WIDTH - 42, 91); ctx.lineTo(WIDTH - 38, 97); ctx.stroke();
    ctx.restore();
  }

  function resizeStage() {
    updateCanvasSize();
  }

  function pointerToWorld(event) {
    const rect = ui.canvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width * WIDTH, 0, WIDTH),
      y: clamp((event.clientY - rect.top) / rect.height * HEIGHT, 0, HEIGHT)
    };
  }

  function startAudio() {
    if (!records.sound || audio.started) {
      if (audio.context && audio.context.state === 'suspended') audio.context.resume().catch(() => {});
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      const context = new AudioContextClass();
      const master = context.createGain();
      master.gain.value = records.sound ? .62 : 0;
      master.connect(context.destination);
      audio.context = context;
      audio.master = master;
      audio.started = true;
      const low = context.createOscillator();
      const high = context.createOscillator();
      const lowGain = context.createGain();
      const highGain = context.createGain();
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 260;
      low.type = 'sine'; low.frequency.value = 48;
      high.type = 'triangle'; high.frequency.value = 73;
      lowGain.gain.value = .12; highGain.gain.value = .035;
      low.connect(lowGain); high.connect(highGain); lowGain.connect(filter); highGain.connect(filter); filter.connect(master);
      low.start(); high.start();
      audio.ambient = [low, high, lowGain, highGain, filter];
      context.resume().catch(() => {});
    } catch (error) {
      audio.started = false;
    }
  }

  function playTone(frequency, duration, type = 'sine', volume = .08, endFrequency = null, delay = 0) {
    if (!records.sound) return;
    startAudio();
    const context = audio.context;
    if (!context || !audio.master || context.state !== 'running') return;
    try {
      const now = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(Math.max(20, frequency), now);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), now + Math.min(.025, duration * .22));
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(gain); gain.connect(audio.master);
      oscillator.start(now); oscillator.stop(now + duration + .02);
    } catch (error) {
      // Audio is optional; gameplay remains fully functional if a browser blocks synthesis.
    }
  }

  function playCollectSound(comboValue) {
    const base = 570 + Math.min(4, comboValue) * 75;
    playTone(base, .16, 'sine', .08, base * 1.45);
    playTone(base * 1.5, .2, 'triangle', .035, base * 1.8, .045);
  }
  function playPulseSound() {
    playTone(240, .22, 'sawtooth', .045, 880);
    playTone(1050, .09, 'sine', .035, 620, .035);
  }
  function playBoostSound() {
    playTone(95, .42, 'sawtooth', .065, 420);
    playTone(190, .24, 'triangle', .04, 620, .08);
  }
  function playHitSound() {
    playTone(105, .3, 'triangle', .12, 42);
    playTone(54, .34, 'sine', .07, 28, .035);
  }
  function playZapSound() {
    playTone(760, .16, 'square', .055, 170);
    playTone(420, .12, 'sine', .05, 1050, .045);
  }
  function playDockSound() {
    playTone(390, .42, 'sine', .07, 590);
    playTone(590, .55, 'triangle', .055, 880, .1);
    playTone(780, .65, 'sine', .04, 1040, .2);
  }
  function playWinSound() {
    playTone(440, .7, 'sine', .08, 660);
    playTone(554, .8, 'sine', .07, 830, .12);
    playTone(660, 1, 'triangle', .06, 990, .25);
  }
  function playLoseSound() {
    playTone(180, .55, 'sine', .08, 85);
    playTone(110, .75, 'triangle', .055, 48, .16);
  }
  function updateEngineSound() {
    if (!audio.context || !audio.ambient.length) return;
    const speed = Math.hypot(player.vx, player.vy);
    const oscillator = audio.ambient[0];
    const target = 48 + speed * .085 + player.thrusting * 13;
    oscillator.frequency.setTargetAtTime(target, audio.context.currentTime, .12);
  }

  function toggleSound() {
    records.sound = !records.sound;
    if (records.sound) {
      startAudio();
      if (audio.master && audio.context) audio.master.gain.setTargetAtTime(.62, audio.context.currentTime, .04);
      playTone(620, .12, 'sine', .05, 800);
    } else if (audio.master && audio.context) {
      audio.master.gain.setTargetAtTime(0, audio.context.currentTime, .04);
    }
    saveRecords();
    updateUI(true);
  }

  function toggleMotion() {
    records.reducedMotion = !records.reducedMotion;
    saveRecords();
    updateUI(true);
  }

  function resetRecords() {
    records.bestScore = 0;
    records.bestTime = 0;
    records.runs = 0;
    saveRecords();
    ui.resetConfirm.hidden = true;
    updateUI(true);
    showToast('LOCAL RECORDS CLEARED', 1.2);
  }

  function bindInput() {
    ui.startButton.addEventListener('click', beginRun);
    ui.resumeButton.addEventListener('click', resumeRun);
    ui.pauseRestartButton.addEventListener('click', beginRun);
    ui.runAgainButton.addEventListener('click', beginRun);
    ui.retryButton.addEventListener('click', beginRun);
    ui.pauseButton.addEventListener('click', pauseRun);
    ui.soundToggle.addEventListener('click', toggleSound);
    ui.motionToggle.addEventListener('click', toggleMotion);
    ui.resetRecordsButton.addEventListener('click', () => { ui.resetConfirm.hidden = false; ui.confirmResetButton.focus(); });
    ui.confirmResetButton.addEventListener('click', resetRecords);
    ui.cancelResetButton.addEventListener('click', () => { ui.resetConfirm.hidden = true; ui.resetRecordsButton.focus(); });

    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      const buttonFocused = document.activeElement instanceof HTMLButtonElement;
      if (key === 'escape' && !ui.resetConfirm.hidden) {
        ui.resetConfirm.hidden = true;
        ui.resetRecordsButton.focus();
        return;
      }
      if (key === 'escape' || key === 'p') {
        if (mode === 'playing') pauseRun();
        else if (mode === 'paused') resumeRun();
        return;
      }
      if (key === 'enter' && buttonFocused) return;
      if (key === 'enter' && (mode === 'title' || mode === 'won' || mode === 'lost')) { beginRun(); return; }
      if (key === 'enter' && mode === 'paused') { resumeRun(); return; }
      if (buttonFocused) return;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
      if (key === ' ' && !event.repeat) { tryBoost(); return; }
      if ((key === 'e' || key === 'f') && !event.repeat && mode === 'playing') { firePulse(player.angle); return; }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) keys.add(key);
    });
    window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
    window.addEventListener('blur', () => { if (mode === 'playing') pauseRun(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'playing') pauseRun(); });

    ui.canvas.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse') {
        const point = pointerToWorld(event);
        pointerAim.x = point.x; pointerAim.y = point.y; pointerAim.active = true;
      }
    });
    ui.canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button === 0 && mode === 'playing') {
        const point = pointerToWorld(event);
        pointerAim.x = point.x; pointerAim.y = point.y; pointerAim.active = true;
        firePulse(Math.atan2(point.y - player.y, point.x - player.x));
      }
    });
    ui.canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    ui.joystick.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      joystick.active = true;
      joystick.pointerId = event.pointerId;
      ui.joystick.setPointerCapture(event.pointerId);
      updateJoystick(event);
    });
    ui.joystick.addEventListener('pointermove', (event) => {
      if (joystick.active && event.pointerId === joystick.pointerId) updateJoystick(event);
    });
    const releaseJoystick = (event) => {
      if (joystick.active && event.pointerId === joystick.pointerId) {
        joystick.active = false; joystick.pointerId = null; joystick.x = 0; joystick.y = 0; joystick.magnitude = 0;
        ui.joystickKnob.style.transform = 'translate(0, 0)';
      }
    };
    ui.joystick.addEventListener('pointerup', releaseJoystick);
    ui.joystick.addEventListener('pointercancel', releaseJoystick);
    ui.touchPulse.addEventListener('click', () => firePulse(player.angle));
    ui.touchBoost.addEventListener('click', () => tryBoost());
  }

  function updateJoystick(event) {
    const rect = ui.joystick.querySelector('.joystick-ring').getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const maxRadius = rect.width * .36;
    const length = Math.hypot(dx, dy);
    const scale = length > maxRadius ? maxRadius / length : 1;
    const nx = dx * scale / maxRadius;
    const ny = dy * scale / maxRadius;
    joystick.x = nx;
    joystick.y = ny;
    joystick.magnitude = clamp(length / maxRadius, 0, 1);
    ui.joystickKnob.style.transform = `translate(${nx * 23}px, ${ny * 23}px)`;
  }

  function loop(timestamp) {
    if (!previousFrame) previousFrame = timestamp;
    const frameDt = Math.min(.05, Math.max(0, (timestamp - previousFrame) / 1000));
    previousFrame = timestamp;
    visualTime = timestamp / 1000;
    if (mode === 'playing') {
      accumulator += frameDt;
      let steps = 0;
      while (accumulator >= FIXED_DT && steps < 8) {
        update(FIXED_DT);
        accumulator -= FIXED_DT;
        steps += 1;
      }
      if (steps === 8 && accumulator > FIXED_DT * 2) accumulator = 0;
    } else {
      accumulator = 0;
      if (mode === 'title') titleTime += frameDt;
      if (toastTimer > 0 && mode !== 'playing') {
        toastTimer = Math.max(0, toastTimer - frameDt);
        if (toastTimer === 0) ui.gameToast.hidden = true;
      }
    }
    drawScene(visualTime);
    requestAnimationFrame(loop);
  }

  function init() {
    buildBackground();
    ui.canvas.style.backgroundImage = `url("${background.toDataURL('image/webp', .94)}")`;
    ui.canvas.style.backgroundSize = '100% 100%';
    ui.canvas.style.backgroundPosition = 'center';
    ui.canvas.style.backgroundRepeat = 'no-repeat';
    const touchCapable = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints || 0) > 0;
    document.body.classList.toggle('touch-capable', Boolean(touchCapable));
    updateCanvasSize();
    bindInput();
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(resizeStage);
      resizeObserver.observe(ui.stageFrame);
    }
    window.addEventListener('resize', resizeStage);
    const reducedMotionPreference = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    if (reducedMotionPreference && !records.reducedMotion) {
      records.reducedMotion = true;
      saveRecords();
    }
    ui.storageNote.hidden = storageOkay;
    updateUI(true);
    setMode('title');
    requestAnimationFrame(loop);
  }

  init();
})();
