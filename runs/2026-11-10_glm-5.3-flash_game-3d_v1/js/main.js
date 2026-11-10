/* Emberwake — boot, renderer, game state, main loop. */
(function () {
  'use strict';
  const EW = (globalThis.EW = globalThis.EW || {});
  const M = EW.M;
  const Gm = (EW.Game = {});

  Gm.reduceMotion = false;
  Gm.dawnF = 0;            // 0 dusk .. 1 dawn
  Gm.dawnTarget = 0;
  Gm.state = 'boot';

  const canvas = document.getElementById('game');
  let aspect = 1;
  const mProj = M.m4(), mView = M.m4(), mVP = M.m4(), mIdent = M.m4Ident(M.m4());
  const mModel = M.m4();
  const PL = new Float32Array(16);
  let litP = null, litITrees = null, litIRocks = null, waterP = null, skyP = null, spriteP = null, beamP = null;
  let skyMesh = null, gliderMesh = null;
  let meshes = {};
  let instTreesT = null, instTreesC = null, instRocks = null;
  let beamMesh = null;
  let lastT = 0, rafId = 0, running = false;
  let slowFrames = 0, qLevel = 2; // 2 high, 1 med, 0 low
  let hintStep = 0, playT = 0;
  const stats = { t0: 0, grazes: 0, maxSpeed: 0 };

  const QUALITY = [
    { dpr: 1.0, trees: 1100, fogMul: 1.3 },
    { dpr: 1.5, trees: 1900, fogMul: 1.12 },
    { dpr: 2.0, trees: 2800, fogMul: 1.0 }
  ];

  /* ================= diagnostics (used by automated tests, harmless in play) ================= */
  const diag = (window.__diagnostics = window.__diagnostics || { errors: [], frames: 0, fps: 0 });
  window.addEventListener('error', (e) => {
    diag.errors.push(String(e.message || e));
    console.error(e.message || e);
  });
  window.addEventListener('unhandledrejection', (e) => {
    diag.errors.push('unhandledrejection: ' + String(e.reason));
  });

  /* ================= GL resources ================= */
  function buildGL() {
    const SH = EW.Shaders, GLC = EW.GLC;
    litP = GLC.program('lit', SH.litVS, SH.litFS);
    litITrees = GLC.program('litT', SH.litVS, SH.litFS, ['INSTANCED']);
    litIRocks = GLC.program('litR', SH.litVS, SH.litFS, ['INSTANCED']);
    waterP = GLC.program('water', SH.waterVS, SH.waterFS);
    skyP = GLC.program('sky', SH.skyVS, SH.skyFS);
    spriteP = GLC.program('sprite', SH.spriteVS, SH.spriteFS);
    beamP = GLC.program('beam', SH.beamVS, SH.beamFS);

    const T = EW.Terrain;
    meshes.terrain = GLC.createMesh(T._terrainData);
    meshes.water = GLC.createMesh(T._waterData);
    meshes.disc = GLC.createMesh({ pos: T._discData.pos, idx: T._discData.idx, nrm: flatUp(T._discData.pos), col: flatCol(T._discData.pos.length / 3, [0.06, 0.07, 0.09]) });
    // spires/buttes/islet/arches/isles/hollow/gate stones/launch merged into one static batch
    meshes.staticBatch = GLC.createMesh(EW.Props._staticData);
    meshes.gateRing = GLC.createMesh(EW.Props._gateRingData);
    meshes.pedestal = GLC.createMesh(EW.Props._pedestalData);
    meshes.crystal = GLC.createMesh(EW.Props._crystalData);
    gliderMesh = GLC.createMesh(EW.Props._gliderData);
    skyMesh = GLC.createMesh(EW.Sky._data);

    // trees: two base meshes sharing instance data
    const trunkB = new EW.GLC.Builder();
    frustumInto(trunkB, 0, 0, 0, 0.34, 0.22, 2.9, 5, [0.42, 0.30, 0.20]);
    const canopyB = new EW.GLC.Builder();
    frustumInto(canopyB, 0, 2.4, 0, 2.4, 1.7, 3.4, 6, [1, 1, 1]);
    frustumInto(canopyB, 0, 4.6, 0, 1.7, 1.1, 2.6, 6, [1.15, 1.12, 1.05]);
    const trunkMesh = GLC.createMesh(trunkB);
    const canopyMesh = GLC.createMesh(canopyB);
    instTreesT = GLC.createInstanced(trunkMesh, new Float32Array(T._treeTrunkInst), T._treeCount);
    instTreesC = GLC.createInstanced(canopyMesh, new Float32Array(T._treeCanopyInst), T._treeCount);
    const rockB = new EW.GLC.Builder();
    blobInto(rockB, 0, 0, 0, 1.0, [1, 1, 1]);
    instRocks = GLC.createInstanced(GLC.createMesh(rockB), new Float32Array(T._rockInst), T._rockCount);

    // beam: unit cylinder, origin at bottom, aux.y = 0..1
    const bb = new EW.GLC.Builder();
    const SEG = 10;
    for (let i = 0; i < SEG; i++) {
      const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
      const n0 = [Math.cos(a0), 0, Math.sin(a0)], n1 = [Math.cos(a1), 0, Math.sin(a1)];
      const p00 = [Math.cos(a0), 0, Math.sin(a0)], p10 = [Math.cos(a1), 0, Math.sin(a1)];
      const p01 = [Math.cos(a0), 1, Math.sin(a0)], p11 = [Math.cos(a1), 1, Math.sin(a1)];
      pushBeamQuad(bb, p00, p10, p11, p01, n0, n1);
    }
    beamMesh = GLC.createMesh(bb);

    EW.Sprites.attach();
    applyQuality();
  }

  function flatUp(pos) { const n = []; for (let i = 0; i < pos.length / 3; i++) n.push(0, 1, 0); return n; }
  function flatCol(n, c) { const a = []; for (let i = 0; i < n; i++) a.push(c[0], c[1], c[2]); return a; }

  function frustumInto(b, x, y, z, r0, r1, h, seg, col) {
    const pts0 = [], pts1 = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pts0.push([x + Math.cos(a) * r0, y, z + Math.sin(a) * r0]);
      pts1.push([x + Math.cos(a) * r1, y + h, z + Math.sin(a) * r1]);
    }
    for (let i = 0; i < seg; i++) {
      const j = (i + 1) % seg;
      b.tri(pts0[i], pts0[j], pts1[j], col);
      b.tri(pts0[i], pts1[j], pts1[i], col);
    }
  }
  function blobInto(b, x, y, z, r, col) {
    const LA = 6, LO = 5;
    const grid = [];
    for (let i = 0; i <= LA; i++) {
      const row = [];
      const th = (i / LA) * Math.PI;
      for (let j = 0; j < LO; j++) {
        const ph = (j / LO) * Math.PI * 2;
        const jit = 0.78 + ((i * 7 + j * 13) % 5) * 0.08;
        row.push([x + Math.sin(th) * Math.cos(ph) * r * jit, y + Math.cos(th) * r * jit * 0.85, z + Math.sin(th) * Math.sin(ph) * r * jit]);
      }
      grid.push(row);
    }
    for (let i = 0; i < LA; i++) {
      for (let j = 0; j < LO; j++) {
        const j2 = (j + 1) % LO;
        b.tri(grid[i][j], grid[i][j2], grid[i + 1][j2], col);
        b.tri(grid[i][j], grid[i + 1][j2], grid[i + 1][j], col);
      }
    }
  }
  function pushBeamQuad(b, p00, p10, p11, p01, n0, n1) {
    // two tris; per-vertex outward normals for a soft silhouette; aux.x = 0 bottom / 1 top
    const A = p00, Bp = p10, C = p11, D = p01;
    b.pos.push(A[0], A[1], A[2], Bp[0], Bp[1], Bp[2], C[0], C[1], C[2]);
    b.nrm.push(n0[0], n0[1], n0[2], n1[0], n1[1], n1[2], n1[0], n1[1], n1[2]);
    b.col.push(1, 1, 1, 1, 1, 1, 1, 1, 1);
    b.aux.push(0, 1, 0, 1, 1, 1);
    b.pos.push(A[0], A[1], A[2], C[0], C[1], C[2], D[0], D[1], D[2]);
    b.nrm.push(n0[0], n0[1], n0[2], n1[0], n1[1], n1[2], n0[0], n0[1], n0[2]);
    b.col.push(1, 1, 1, 1, 1, 1, 1, 1, 1);
    b.aux.push(0, 1, 1, 1, 1, 1);
  }

  /* ================= quality ================= */
  function qIndex() {
    const s = EW.UI.settings.quality;
    if (s === 'high') return 2;
    if (s === 'medium') return 1;
    if (s === 'low') return 0;
    return qLevel; // auto
  }
  function applyQuality() {
    const q = QUALITY[qIndex()];
    instTreesT.setCount(q.trees);
    instTreesC.setCount(q.trees);
  }

  /* ================= boot ================= */
  function buildWorldCPU() {
    EW.Terrain.build();
    // props.build() merges all authored statics into Props._staticData
  }

  Gm.boot = function () {
    if (!EW.GLC.init(canvas)) {
      EW.UI.fatalError('This game needs WebGL2. Please use a current version of Chrome, Edge, Firefox or Safari.');
      return;
    }
    try {
      buildWorldCPU();
      EW.Sky.build();
      EW.Sprites.build();
      EW.Props.build();
      EW.Ent.init();
      buildGL();
    } catch (e) {
      console.error(e);
      EW.UI.fatalError('Something went wrong while shaping the valley: ' + e.message);
      return;
    }
    EW.UI.init(hooks);
    EW.Sim.bindInput(canvas);
    EW.Sim.state = 'title';
    Gm.state = 'title';
    EW.UI.showScreen('title');
    EW.UI.setObjective('Light the eight beacons');

    // context loss handling
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      running = false;
      EW.UI.toast('Graphics context lost — recovering…', 6000);
    });
    canvas.addEventListener('webglcontextrestored', () => {
      try { buildGL(); running = true; lastT = performance.now(); requestFrame(); EW.UI.toast('Graphics restored.', 2000); }
      catch (e) { EW.UI.fatalError('Could not restore graphics: ' + e.message); }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && EW.Sim.state === 'play') Gm.togglePause(true);
    });
    window.addEventListener('blur', () => {
      if (EW.Sim.state === 'play') Gm.togglePause(true);
    });

    lastT = performance.now();
    running = true;
    requestFrame();
  };

  /* ================= hooks ================= */
  const hooks = {
    onBegin() {
      EW.Sfx.init();
      EW.Sfx.resume();
      EW.Ent.reset();
      EW.Sim.resetFlight();
      Gm.dawnF = 0; Gm.dawnTarget = 0;
      stats.t0 = performance.now();
      stats.grazes = 0; stats.maxSpeed = 0;
      hintStep = 0; playT = 0;
      EW.UI.showScreen(null);
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      EW.UI.setObjective('Light the beacons · 0/8');
      EW.Sim.state = 'play';
      Gm.state = 'play';
      tryLockPointer();
    },
    onResume() {
      EW.Sim.state = 'play';
      Gm.state = 'play';
      EW.UI.showScreen(null);
      EW.Sfx.resume();
      tryLockPointer();
    },
    onRestart() { hooks.onBegin(); },
    onKeepSoaring() {
      EW.Sim.state = 'play';
      Gm.state = 'play';
      EW.UI.showScreen(null);
      EW.UI.setObjective('The valley is awake — fly free');
      EW.Sfx.resume();
      tryLockPointer();
    },
    onQuitToTitle() {
      EW.Sim.state = 'title';
      Gm.state = 'title';
      EW.UI.showScreen('title');
      EW.Sfx.suspend();
    },
    onIgnite(b, lit) {
      EW.UI.setObjective('Light the beacons · ' + lit + '/8');
      EW.UI.toast('Beacon lit — ' + b.name + ' (' + lit + '/8)', 3000);
      Gm.dawnTarget = Math.max(Gm.dawnTarget, lit / 8 * 0.42);
    },
    onAllLit() {
      EW.UI.setObjective('Climb to the Dawn Gate');
      EW.UI.toast('All beacons burn. The Dawn Gate is waking on the summit.', 5200);
      Gm.dawnTarget = 0.5;
    },
    onGateEnter() {
      EW.Sfx.gate();
      EW.Sfx.dawn();
      EW.Sim.startFinale();
      Gm.state = 'finale';
      Gm.dawnTarget = 1;
      EW.Sim.firstPerson = false;
      EW.UI.setObjective('Dawn');
      EW.UI.toast('', 1);
      setTimeout(() => {
        if (EW.Sim.state === 'finale') {
          Gm.state = 'done';
          EW.Sim.state = 'done';
          EW.UI.showDone({
            time: formatTime((performance.now() - stats.t0) / 1000),
            embers: EW.Sim.player.embers + ' / ' + EW.Ent.totalEmbers,
            speed: Math.round(stats.maxSpeed) + ' m/s',
            grazes: String(stats.grazes)
          });
        }
      }, 9500);
    },
    onEmber(n, total) {
      if (n === 1) EW.UI.toast('Embers feed the lantern — boost fuel restored.', 2600);
      if (n === Math.floor(total * 0.5)) EW.UI.toast('Half the embers gathered.', 2400);
      if (n === total) EW.UI.toast('Every ember in the valley is yours.', 3200);
    },
    onHardCrash() {
      EW.UI.toast('The valley is hard. Rising from the last beacon…', 2600);
    }
  };

  // track stats inside Sim events
  const _scrape = EW.Sfx.scrape;
  EW.Sfx.scrape = function () {
    if (EW.Sim.state === 'play') stats.grazes++;
    _scrape();
  };

  function formatTime(s) {
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + String(r).padStart(2, '0');
  }

  function tryLockPointer() {
    if (EW.Sim.input.touch.active) return;
    try {
      const p = canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => { /* headless / unsupported */ });
    } catch (e) { /* fine without */ }
  }

  Gm.togglePause = function (forcePause) {
    const S = EW.Sim;
    if (S.state === 'play' && forcePause !== false) {
      S.state = 'pause';
      Gm.state = 'pause';
      EW.UI.showScreen('pause');
      EW.Sfx.suspend();
      try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {}
    } else if (S.state === 'pause' && !forcePause) {
      hooks.onResume();
    }
  };
  EW.Sim.onPauseRequest = () => Gm.togglePause();
  EW.Sim.onHardCrash = () => hooks.onHardCrash();
  EW.Sim.onRespawn = () => {
    EW.Sim.respawn(EW.Sim.checkpoint.pos, EW.Sim.checkpoint.yaw, false);
    EW.UI.flash(0.35);
  };

  /* ================= frame ================= */
  function requestFrame() {
    rafId = requestAnimationFrame(frame);
  }

  function frame(now) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    let dt = (now - lastT) / 1000;
    lastT = now;
    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) dt = 0.016;

    // adaptive quality (auto mode)
    const ms = dt * 1000;
    if (EW.UI.settings.quality === 'auto') {
      if (ms > 21.5) { slowFrames++; if (slowFrames > 110 && qLevel > 0) { qLevel--; slowFrames = 0; applyQuality(); } }
      else slowFrames = Math.max(0, slowFrames - 2);
    }

    const S = EW.Sim, E = EW.Ent;
    S.update(dt);
    if (S.state !== 'pause') {
      E.update(dt, { onIgnite: hooks.onIgnite, onAllLit: hooks.onAllLit, onGateEnter: hooks.onGateEnter, onEmber: hooks.onEmber });
    }

    // stats & dawn
    if (S.state === 'play') {
      playT += dt;
      stats.maxSpeed = Math.max(stats.maxSpeed, S.player.speed);
      tutorialHints();
    }
    Gm.dawnF = M.damp(Gm.dawnF, Gm.dawnTarget, S.state === 'finale' ? 0.55 : 0.4, dt);

    // audio
    if (EW.Sfx.ready() && S.state !== 'pause') {
      EW.Sfx.update(dt, S.player.speed, S.player.boostOn, S.stormIn, Gm.dawnF);
      // beacon hum by proximity
      let bd = Infinity, blit = false;
      for (const b of E.beacons) {
        const d = M.v3dist(S.player.pos, b.flame);
        if (d < bd) { bd = d; blit = b.lit; }
      }
      const hg = M.clamp(1 - bd / 320, 0, 1) * 0.05;
      EW.Sfx.setHum(blit ? 196 : 131, S.state === 'play' ? hg : 0);
    }

    render(now / 1000, dt);

    if (S.state === 'play' || S.state === 'finale') EW.UI.updateHUD(dt);
    diag.frames++;
    diag.fps = Math.round(1 / Math.max(dt, 0.001));
  }

  function tutorialHints() {
    const steps = [
      [1.5, 'Dive to gain speed, climb to spend it — speed is life.'],
      [9, 'Follow the ember trails; each mote feeds your lantern.'],
      [18, 'Hold Shift to boost. Graze the stone for extra fuel — carefully.'],
      [30, 'Thermal columns shimmer — circle inside one to climb.']
    ];
    if (hintStep < steps.length && playT > steps[hintStep][0]) {
      EW.UI.toast(steps[hintStep][1], 4200);
      hintStep++;
    }
  }

  /* ================= render ================= */
  const palf = {};
  function render(time, dt) {
    const gl = EW.GLC.get();
    aspect = EW.GLC.resize(canvas, QUALITY[qIndex()].dpr);
    const S = EW.Sim, E = EW.Ent;
    const pal = EW.Sky.palette(Gm.dawnF);
    palf.pal = pal;

    M.m4Persp(mProj, S.camera.fov * Math.PI / 180, aspect, 0.6, 6200);
    M.m4LookAt(mView, S.camera.pos, S.camera.look, S.camera.up);
    M.m4Mul(mVP, mProj, mView);

    const q = QUALITY[qIndex()];
    const fogK = pal.fogK * q.fogMul * (EW.Terrain.fogOverride || 1);

    gl.clearColor(pal.fog[0], pal.fog[1], pal.fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // ---- sky ----
    gl.disable(gl.DEPTH_TEST);
    gl.depthMask(false);
    skyP.use();
    EW.GLC.setMat4(skyP, 'uVP', mVP);
    EW.GLC.set3f(skyP, 'uCam', S.camera.pos.x, S.camera.pos.y, S.camera.pos.z);
    EW.GLC.set3v(skyP, 'uSunDir', pal.sunDir);
    EW.GLC.set1f(skyP, 'uNight', pal.night);
    EW.GLC.set1f(skyP, 'uTime', time);
    EW.GLC.set3v(skyP, 'uZenA', [0.040, 0.055, 0.130]);
    EW.GLC.set3v(skyP, 'uHorA', [0.255, 0.135, 0.185]);
    EW.GLC.set3v(skyP, 'uZenB', [0.300, 0.500, 0.720]);
    EW.GLC.set3v(skyP, 'uHorB', [1.000, 0.830, 0.620]);
    gl.disable(gl.CULL_FACE);
    skyMesh.draw();
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);

    // ---- lit world ----
    litP.use();
    EW.GLC.setMat4(litP, 'uVP', mVP);
    EW.GLC.setMat4(litP, 'uModel', mIdent);
    EW.GLC.set3v(litP, 'uSunDir', pal.sunDir);
    EW.GLC.set3v(litP, 'uSunCol', pal.sun);
    EW.GLC.set3v(litP, 'uSkyAmb', pal.skyAmb);
    EW.GLC.set3v(litP, 'uGndAmb', pal.gndAmb);
    EW.GLC.set3v(litP, 'uFogCol', pal.fog);
    EW.GLC.set1f(litP, 'uFogK', fogK);
    EW.GLC.set3f(litP, 'uCam', S.camera.pos.x, S.camera.pos.y, S.camera.pos.z);
    EW.GLC.set3f(litP, 'uTint', 1, 1, 1);
    EW.GLC.set1f(litP, 'uRim', 0.18);
    EW.GLC.set1f(litP, 'uTime', time);
    // beacon point lights
    const lights = E.litLights();
    PL.fill(0);
    for (let i = 0; i < Math.min(4, lights.length); i++) {
      PL[i * 4] = lights[i].x; PL[i * 4 + 1] = lights[i].y; PL[i * 4 + 2] = lights[i].z; PL[i * 4 + 3] = 240;
    }
    EW.GLC.set4v(litP, 'uPL', PL);
    EW.GLC.set3f(litP, 'uPLC', 1.0, 0.55, 0.25);

    gl.disable(gl.CULL_FACE);
    meshes.terrain.draw();
    meshes.disc.draw();
    gl.enable(gl.CULL_FACE);
    meshes.staticBatch.draw();

    // pedestals + crystals + glider use uModel
    E.beacons.forEach((b, i) => {
      M.m4Compose(mModel, b.base.x, b.base.y, b.base.z, i * 0.7, 0, 0, 1);
      EW.GLC.setMat4(litP, 'uModel', mModel);
      meshes.pedestal.draw();
      const bob = Math.sin(time * 1.7 + i) * 0.35;
      M.m4Compose(mModel, b.base.x, b.base.y + 10.6 + bob, b.base.z, b.crystalSpin, 0, 0, 1);
      EW.GLC.setMat4(litP, 'uModel', mModel);
      if (b.lit) EW.GLC.set3f(litP, 'uTint', 1.0, 0.66, 0.3);
      else EW.GLC.set3f(litP, 'uTint', 0.5, 0.62, 0.85);
      meshes.crystal.draw();
      EW.GLC.set3f(litP, 'uTint', 1, 1, 1);
    });
    M.m4Ident(mModel);
    EW.GLC.setMat4(litP, 'uModel', mModel);

    // water
    waterP.use();
    EW.GLC.setMat4(waterP, 'uVP', mVP);
    EW.GLC.set1f(waterP, 'uTime', time);
    EW.GLC.set1f(waterP, 'uLakeY', EW.Terrain.LAKE_Y);
    EW.GLC.set3f(waterP, 'uCam', S.camera.pos.x, S.camera.pos.y, S.camera.pos.z);
    EW.GLC.set3v(waterP, 'uSunDir', pal.sunDir);
    EW.GLC.set3v(waterP, 'uSkyCol', [pal.zen[0] * 0.6 + pal.hor[0] * 0.4, pal.zen[1] * 0.6 + pal.hor[1] * 0.4, pal.zen[2] * 0.6 + pal.hor[2] * 0.4]);
    EW.GLC.set3v(waterP, 'uDeepCol', [0.03, 0.07, 0.09]);
    EW.GLC.set3v(waterP, 'uFogCol', pal.fog);
    EW.GLC.set1f(waterP, 'uFogK', fogK);
    meshes.water.draw();

    // glider
    if (S.state !== 'title' && !S.firstPerson) {
      litP.use();
      const p = S.player;
      M.m4Compose(mModel, p.pos.x, p.pos.y, p.pos.z, p.yaw, p.pitch, p.roll, 1);
      EW.GLC.setMat4(litP, 'uModel', mModel);
      EW.GLC.set1f(litP, 'uRim', 0.5);
      gl.disable(gl.CULL_FACE);
      gliderMesh.draw();
      gl.enable(gl.CULL_FACE);
      EW.GLC.set1f(litP, 'uRim', 0.18);
      M.m4Ident(mModel);
      EW.GLC.setMat4(litP, 'uModel', mModel);
    }

    // trees & rocks (instanced)
    litITrees.use();
    EW.GLC.setMat4(litITrees, 'uVP', mVP);
    EW.GLC.setMat4(litITrees, 'uModel', mIdent);
    EW.GLC.set3v(litITrees, 'uSunDir', pal.sunDir);
    EW.GLC.set3v(litITrees, 'uSunCol', pal.sun);
    EW.GLC.set3v(litITrees, 'uSkyAmb', pal.skyAmb);
    EW.GLC.set3v(litITrees, 'uGndAmb', pal.gndAmb);
    EW.GLC.set3v(litITrees, 'uFogCol', pal.fog);
    EW.GLC.set1f(litITrees, 'uFogK', fogK);
    EW.GLC.set3f(litITrees, 'uCam', S.camera.pos.x, S.camera.pos.y, S.camera.pos.z);
    EW.GLC.set3f(litITrees, 'uTint', 1, 1, 1);
    EW.GLC.set1f(litITrees, 'uRim', 0.12);
    EW.GLC.set1f(litITrees, 'uTime', time);
    EW.GLC.set1f(litITrees, 'uWindAmp', S.stormIn ? 1.4 : 0.55);
    gl.uniform4fv(litITrees.u.uPL, PL);
    EW.GLC.set3f(litITrees, 'uPLC', 1.0, 0.55, 0.25);
    instTreesT.draw();
    instTreesC.draw();

    litIRocks.use();
    EW.GLC.setMat4(litIRocks, 'uVP', mVP);
    EW.GLC.setMat4(litIRocks, 'uModel', mIdent);
    EW.GLC.set3v(litIRocks, 'uSunDir', pal.sunDir);
    EW.GLC.set3v(litIRocks, 'uSunCol', pal.sun);
    EW.GLC.set3v(litIRocks, 'uSkyAmb', pal.skyAmb);
    EW.GLC.set3v(litIRocks, 'uGndAmb', pal.gndAmb);
    EW.GLC.set3v(litIRocks, 'uFogCol', pal.fog);
    EW.GLC.set1f(litIRocks, 'uFogK', fogK);
    EW.GLC.set3f(litIRocks, 'uCam', S.camera.pos.x, S.camera.pos.y, S.camera.pos.z);
    EW.GLC.set3f(litIRocks, 'uTint', 1, 1, 1);
    EW.GLC.set1f(litIRocks, 'uRim', 0.12);
    EW.GLC.set1f(litIRocks, 'uTime', time);
    EW.GLC.set1f(litIRocks, 'uWindAmp', 0);
    gl.uniform4fv(litIRocks.u.uPL, PL);
    EW.GLC.set3f(litIRocks, 'uPLC', 1.0, 0.55, 0.25);
    instRocks.draw();

    // ---- beams ----
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    beamP.use();
    EW.GLC.setMat4(beamP, 'uVP', mVP);
    EW.GLC.set1f(beamP, 'uTime', time);
    EW.GLC.set3f(beamP, 'uCam', S.camera.pos.x, S.camera.pos.y, S.camera.pos.z);
    const camD = M.v3dist(S.camera.pos, S.player.pos);
    for (const b of E.beacons) {
      const litA = b.lit ? b.beamA * (0.55 + 0.2 * Math.sin(time * 2 + b.i)) : 0;
      const unlitA = b.lit ? 0 : (0.11 + 0.05 * Math.sin(time * 1.6 + b.i * 2) + b.flare * 0.85);
      const a = Math.max(litA, unlitA);
      if (a < 0.01) continue;
      const R = b.lit ? 3.2 : 1.5;
      M.m4Compose(mModel, b.flame.x, b.flame.y - 1, b.flame.z, 0, 0, 0, 1);
      mModel[0] = R; mModel[5] = 820; mModel[10] = R;
      EW.GLC.setMat4(beamP, 'uModel', mModel);
      EW.GLC.set3f(beamP, 'uColor', b.lit ? 1.0 : 0.45, b.lit ? 0.62 : 0.6, b.lit ? 0.3 : 0.9);
      EW.GLC.set1f(beamP, 'uAlpha', a * M.clamp(1.2 - camD / 3200, 0.3, 1));
      beamMesh.draw();
    }
    // gate beam
    const g = E.gate;
    if (E.litCount >= 6) {
      const a = g.active ? 0.5 + 0.2 * Math.sin(time * 2.4) : 0.12;
      M.m4Compose(mModel, g.x, g.y - 20, g.z, 0, 0, 0, 1);
      mModel[0] = 5; mModel[5] = 700; mModel[10] = 5;
      EW.GLC.setMat4(beamP, 'uModel', mModel);
      EW.GLC.set3f(beamP, 'uColor', 0.95, 0.85, 0.6);
      EW.GLC.set1f(beamP, 'uAlpha', a);
      beamMesh.draw();
    }
    // gate ring
    litP.use();
    EW.GLC.setMat4(litP, 'uModel', mIdent);
    if (E.litCount >= 6) {
      M.m4Compose(mModel, g.x, g.y, g.z, g.spin, 0, 0, 1);
      EW.GLC.setMat4(litP, 'uModel', mModel);
      EW.GLC.set3f(litP, 'uTint', g.active ? 1.3 : 0.5, g.active ? 1.05 : 0.48, g.active ? 0.7 : 0.55);
      EW.GLC.set1f(litP, 'uRim', 0.6);
      meshes.gateRing.draw();
      EW.GLC.set1f(litP, 'uRim', 0.18);
      EW.GLC.set3f(litP, 'uTint', 1, 1, 1);
      M.m4Ident(mModel);
      EW.GLC.setMat4(litP, 'uModel', mModel);
    }
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);

    // ---- sprites ----
    EW.Sprites.resetFrame();
    E.pushSprites(time);
    // finale fireflies
    if (Gm.dawnF > 0.3) {
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2, rr = 10 + Math.random() * 30;
        EW.Sprites.emit('glow', {
          x: S.player.pos.x + Math.cos(a) * rr, y: S.player.pos.y + (Math.random() - 0.4) * 20, z: S.player.pos.z + Math.sin(a) * rr,
          vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 3,
          size: 0.8, life: 2.5, r: 1, g: 0.8, b: 0.45, a: 0.5, drag: 0.4
        });
      }
      if (Math.random() < 0.02) EW.Sfx.chirp();
    }
    EW.Sprites.update(dt, S.camera.pos, S.player.fwd);
    spriteP.use();
    EW.GLC.setMat4(spriteP, 'uVP', mVP);
    EW.GLC.set1f(spriteP, 'uTime', time);
    const cr = S.camRight || { x: 1, y: 0, z: 0 }, cu = S.camUp || { x: 0, y: 1, z: 0 };
    EW.Sprites.drawAll(spriteP, cr, cu, time);

    // storm screen shade handled via DOM (UI.setStorm)
  }

  /* ================= test hooks (automation only) ================= */
  window.__EW = {
    state: () => ({ state: EW.Sim.state, lit: EW.Ent.litCount, embers: EW.Sim.player.embers, pos: { ...EW.Sim.player.pos }, speed: EW.Sim.player.speed, fps: diag.fps, errors: diag.errors.length }),
    errors: () => diag.errors,
    warp(i) {
      const b = EW.Ent.beacons[i];
      const S = EW.Sim;
      S.player.pos.x = b.flame.x; S.player.pos.y = b.flame.y + 8; S.player.pos.z = b.flame.z + 14;
      S.player.speed = 40;
      S.state = 'play';
    },
    lightAll() {
      for (const b of EW.Ent.beacons) if (!b.lit) {
        EW.Sim.player.pos.x = b.flame.x; EW.Sim.player.pos.y = b.flame.y + 6; EW.Sim.player.pos.z = b.flame.z;
        EW.Ent.update(0.05, { onIgnite: hooks.onIgnite, onAllLit: hooks.onAllLit });
      }
    },
    toGate() {
      const g = EW.Ent.gate;
      EW.Sim.player.pos.x = g.x; EW.Sim.player.pos.y = g.y; EW.Sim.player.pos.z = g.z + 60;
      EW.Sim.player.speed = 55;
      EW.Sim.state = 'play';
    }
  };

  /* ================= go ================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Gm.boot());
  } else {
    Gm.boot();
  }
})();
