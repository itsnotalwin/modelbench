/* Emberwake — flight model, input, camera, collisions. */
(function () {
  'use strict';
  const EW = (globalThis.EW = globalThis.EW || {});
  const M = EW.M;
  const S = (EW.Sim = {});

  const TAU = Math.PI * 2;

  S.state = 'boot';   // boot | title | play | pause | tumble | finale | done
  S.colliders = [];
  S.thermals = [];
  S.storms = [];
  S.firstPerson = false;
  S.shake = 0;
  S.stormIn = false;
  S.thermalIn = null;
  S.waterIn = false;
  S.time = 0;

  S.player = {
    pos: { x: 0, y: 200, z: 940 },
    vel: { x: 0, y: 0, z: -48 },
    fwd: { x: 0, y: 0, z: -1 },
    right: { x: 1, y: 0, z: 0 },
    yaw: 0, pitch: 0, roll: 0,
    speed: 48, fuel: 60, embers: 0,
    boostOn: false, combo: 0, comboT: 0
  };

  S.camera = {
    pos: { x: 0, y: 220, z: 980 },
    look: { x: 0, y: 100, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    fov: 62, roll: 0
  };

  S.input = {
    keys: Object.create(null),
    mx: 0, my: 0,            // -1..1 steering (virtual stick or cursor)
    locked: false,
    invertY: false,
    sens: 1.0,
    vStick: { x: 0, y: 0 },  // pointer-lock accumulated stick
    touch: { active: false, x: 0, y: 0, boost: false },
    gamepad: false
  };

  S.checkpoint = { pos: { x: 0, y: 200, z: 940 }, yaw: 0 };

  /* ---------- hooks (wired by main) ---------- */
  S.onHardCrash = null;   // ()
  S.onRespawn = null;
  S.onPauseRequest = null;
  S.onCameraToggle = null;

  /* ================= input ================= */
  S.bindInput = function (canvas) {
    const I = S.input;
    window.addEventListener('keydown', (e) => {
      // Escape always reaches the game (menus, pause); other keys are ignored
      // while the user is typing in or focused on form controls / buttons.
      const t = e.target && e.target.tagName;
      if (e.code !== 'Escape' && t && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(t)) return;
      I.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'Escape' || e.code === 'KeyP') { if (S.onPauseRequest) S.onPauseRequest(); }
      if (e.code === 'KeyC' && S.state === 'play') {
        S.firstPerson = !S.firstPerson;
        if (S.onCameraToggle) S.onCameraToggle(S.firstPerson);
      }
      if (e.code === 'KeyR' && S.state === 'play') S.respawn(S.checkpoint.pos, S.checkpoint.yaw, true);
      if (e.code === 'KeyM') { EW.UI && EW.UI.toggleMute(); }
      if (e.code === 'KeyF') {
        try {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen();
        } catch (err) { /* ignore */ }
      }
    });
    window.addEventListener('keyup', (e) => { I.keys[e.code] = false; });
    window.addEventListener('blur', () => { I.keys = Object.create(null); });

    // pointer lock steering
    document.addEventListener('pointerlockchange', () => {
      I.locked = document.pointerLockElement === canvas;
      if (!I.locked && S.state === 'play' && !I.touch.active) {
        if (S.onPauseRequest) S.onPauseRequest();
      }
    });
    canvas.addEventListener('mousemove', (e) => {
      if (I.locked) {
        const s = 0.0019 * I.sens;
        I.vStick.x = M.clamp(I.vStick.x + e.movementX * s, -1, 1);
        const dy = e.movementY * s * (I.invertY ? -1 : 1);
        I.vStick.y = M.clamp(I.vStick.y + dy, -1, 1);
      } else if (!I.touch.active && S.state === 'play') {
        const w = window.innerWidth, h = window.innerHeight;
        let nx = (e.clientX / w - 0.5) * 2, ny = (e.clientY / h - 0.5) * 2;
        const dz = 0.07;
        nx = Math.abs(nx) < dz ? 0 : (nx - Math.sign(nx) * dz) / (1 - dz);
        ny = Math.abs(ny) < dz ? 0 : (ny - Math.sign(ny) * dz) / (1 - dz);
        I.mx = M.clamp(nx * 1.35 * I.sens, -1, 1);
        I.my = M.clamp(ny * 1.2 * I.sens * (I.invertY ? -1 : 1), -1, 1);
      }
    });
    canvas.addEventListener('mousedown', (e) => {
      if (S.state === 'play' && !I.locked && !I.touch.active && e.button === 0) {
        try { canvas.requestPointerLock(); } catch (err) { /* unsupported */ }
      }
    });
  };

  S.setTouchStick = function (x, y) {
    const I = S.input;
    I.touch.active = true;
    I.touch.x = x; I.touch.y = y;
  };
  S.setTouchBoost = function (b) { S.input.touch.boost = b; };
  S.clearTouch = function () {
    S.input.touch.active = false;
    S.input.touch.x = 0; S.input.touch.y = 0;
  };

  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.abs(ax) > 0.12 || Math.abs(ay) > 0.12) {
        S.input.gamepad = true;
        return { x: ax, y: ay * (S.input.invertY ? -1 : 1) };
      }
      return { x: 0, y: 0 };
    }
    return null;
  }

  function gatherAxes(dt) {
    const I = S.input;
    let x = 0, y = 0, boost = false;

    if (I.locked) {
      // decay the virtual stick toward neutral
      const d = Math.exp(-2.6 * dt);
      I.vStick.x *= d; I.vStick.y *= d;
      x = I.vStick.x; y = I.vStick.y * (I.invertY ? -1 : 1);
    } else if (I.touch.active) {
      x = I.touch.x; y = I.touch.y * (I.invertY ? -1 : 1);
      boost = I.touch.boost;
    } else {
      x = I.mx; y = I.my;
    }

    const K = I.keys;
    if (K['KeyA'] || K['ArrowLeft']) x -= 1;
    if (K['KeyD'] || K['ArrowRight']) x += 1;
    if (K['KeyW'] || K['ArrowUp']) y += 1;   // climb (non-inverted default)
    if (K['KeyS'] || K['ArrowDown']) y -= 1;
    if (K['ShiftLeft'] || K['ShiftRight'] || K['Space']) boost = true;

    const gp = pollGamepad();
    if (gp) { x += gp.x; y += gp.y; if (padsBoost()) boost = true; }

    return { x: M.clamp(x, -1, 1), y: M.clamp(y, -1, 1), boost };
  }
  function padsBoost() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      if ((p.buttons[0] && p.buttons[0].pressed) || (p.buttons[7] && p.buttons[7].value > 0.4)) return true;
      return false;
    }
    return false;
  }

  /* ================= flight ================= */
  const V = { x: 0, y: 0, z: 0 };
  let splashCD = 0, scrapeCD = 0;

  S.update = function (dt) {
    S.time += dt;
    const p = S.player;

    if (S.state === 'title') { titleCam(dt); return; }
    if (S.state === 'pause') { return; }
    if (S.state === 'finale' || S.state === 'done') { finaleCam(dt); return; }

    if (S.state === 'tumble') { tumble(dt); return; }

    // ---- play ----
    const ax = gatherAxes(dt);
    const wasBoost = p.boostOn;
    p.boostOn = ax.boost && p.fuel > 0.5 && p.speed > 4;
    if (p.boostOn !== wasBoost) EW.Sfx.setBoost(p.boostOn);

    // control authority
    const spdN = M.clamp(p.speed / 38, 0.28, 1.05);
    const pitchAuth = M.clamp((p.speed - 9) / 24, 0.12, 1);
    const yawRate = ax.x * 1.8 * spdN;
    const pitchRate = ax.y * 1.5 * pitchAuth;
    p.yaw = M.wrapAngle(p.yaw + yawRate * dt);
    p.pitch = M.clamp(p.pitch + pitchRate * dt, -1.15, 1.15);

    // stall: mushy controls + nose drop
    if (p.speed < 16) {
      const s = (16 - p.speed) / 16;
      p.pitch -= s * 0.85 * dt;
      p.roll = M.damp(p.roll, Math.sin(S.time * 3.1) * 0.25 * s, 2, dt);
    } else {
      const rollT = -ax.x * 0.95 - yawRate * 0.12;
      p.roll = M.damp(p.roll, M.clamp(rollT, -1.05, 1.05), 5.5, dt);
    }

    M.v3fwd(p.fwd, p.yaw, p.pitch);
    // right vector
    p.right.x = Math.cos(p.yaw); p.right.y = 0; p.right.z = Math.sin(p.yaw);

    // energy: gravity along flight path, drag, ember-lift thrust
    const thrust = 3.6;
    let accel = -p.fwd.y * 13.2 - 0.0011 * p.speed * p.speed + thrust;
    if (p.boostOn) { accel += 55; p.fuel = Math.max(0, p.fuel - 30 * dt); }
    if (p.speed > 95) accel -= (p.speed - 95) * 1.6;
    if (p.speed > 104) p.speed = 104;
    p.speed = Math.max(0, p.speed + accel * dt);

    M.v3scale(p.vel, p.fwd, p.speed);
    if (p.speed < 16) p.vel.y -= (16 - p.speed) * 0.55;

    // thermals
    S.thermalIn = null;
    for (const th of S.thermals) {
      const dx = p.pos.x - th.x, dz = p.pos.z - th.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < th.r * th.r && p.pos.y < th.top && p.pos.y > th.y - 30) {
        S.thermalIn = th;
        const fade = 1 - M.clamp((p.pos.y - (th.top - 40)) / 40, 0, 1);
        p.vel.y += th.lift * fade * dt;
        // gentle centering so circling is forgiving
        const d = Math.sqrt(d2) || 1;
        p.vel.x += (-dx / d) * 2.2 * dt;
        p.vel.z += (-dz / d) * 2.2 * dt;
      }
    }

    // storms
    S.stormIn = false;
    for (const st of S.storms) {
      const dx = p.pos.x - st.x, dy = p.pos.y - st.y, dz = p.pos.z - st.z;
      if (dx * dx + dy * dy + dz * dz < st.r * st.r) {
        S.stormIn = true;
        p.speed = Math.max(6, p.speed - 26 * dt);
        p.fuel = Math.max(0, p.fuel - 10 * dt);
        p.vel.x += (Math.random() - 0.5) * 14 * dt;
        p.vel.y += (Math.random() - 0.5) * 16 * dt;
        p.vel.z += (Math.random() - 0.5) * 14 * dt;
      }
    }

    // integrate (velocity includes thermal/turbulence offsets on top of fwd*speed)
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.pos.z += p.vel.z * dt;

    // ceiling & bounds
    if (p.pos.y > 620) {
      p.pitch -= 1.0 * dt;
      p.pos.y = Math.min(p.pos.y, 640);
    }
    const r2d = Math.hypot(p.pos.x, p.pos.z);
    if (r2d > 1150) {
      const f = (r2d - 1150) * 0.5;
      p.vel.x -= (p.pos.x / r2d) * f * dt;
      p.vel.z -= (p.pos.z / r2d) * f * dt;
    }

    // combo decay
    if (p.comboT > 0) { p.comboT -= dt; if (p.comboT <= 0) p.combo = 0; }
    splashCD -= dt; scrapeCD -= dt;

    collideAndGround(dt);
    updateCamera(dt);
  };

  function collideAndGround(dt) {
    const p = S.player;
    const T = EW.Terrain;

    // --- prop colliders ---
    for (const c of S.colliders) {
      if (c.grazeCD > 0) c.grazeCD -= dt;
      if (c.type === 'cyl') {
        const dx = p.pos.x - c.x, dz = p.pos.z - c.z;
        const d2 = dx * dx + dz * dz;
        const rr = c.r + 1.1;
        if (d2 < rr * rr && p.pos.y > c.y0 - 1 && p.pos.y < c.y1 + 1) {
          const d = Math.sqrt(d2) || 0.001;
          const nx = dx / d, nz = dz / d;
          const vn = p.vel.x * nx + p.vel.z * nz;
          const impact = Math.abs(vn);
          p.pos.x = c.x + nx * rr;
          p.pos.z = c.z + nz * rr;
          if (vn < 0) {
            p.vel.x -= nx * vn * 1.5;
            p.vel.z -= nz * vn * 1.5;
          }
          if (impact > 46 || p.speed > 72) { hardCrash(); return; }
          p.speed *= 0.6;
          p.vel.x += nx * 8; p.vel.z += nz * 8;
          p.fuel = Math.max(0, p.fuel - 6);
          if (scrapeCD <= 0) {
            scrapeCD = 0.5;
            EW.Sfx.scrape();
            S.shake = Math.min(1, S.shake + 0.5);
            EW.Sprites.burst(p.pos.x, p.pos.y, p.pos.z, 10, { r: 1, g: 0.6, b: 0.25, size: 1.6, life: 0.5, speed: 9 });
            if (EW.UI) EW.UI.flashFuel();
          }
          p.speed = Math.max(8, p.speed);
          p.vel.y = Math.max(p.vel.y, 2);
        } else if (p.pos.y > c.y0 - 6 && p.pos.y < c.y1 + 6) {
          // graze bonus
          const d = Math.sqrt(d2);
          const surf = Math.abs(d - c.r);
          if (surf < 5.5 && p.speed > 42 && (!c.grazeCD || c.grazeCD <= 0)) {
            c.grazeCD = 1.2;
            p.fuel = Math.min(100, p.fuel + 3);
            EW.Sfx.graze();
            EW.Sprites.burst(p.pos.x, p.pos.y, p.pos.z, 4, { r: 1, g: 0.75, b: 0.35, size: 1.1, life: 0.4, speed: 4 });
          }
        }
      } else if (c.type === 'sph') {
        const dx = p.pos.x - c.x, dy = p.pos.y - c.y, dz = p.pos.z - c.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        const rr = c.r + 1.2;
        if (d2 < rr * rr) {
          const d = Math.sqrt(d2) || 0.001;
          const nx = dx / d, ny = dy / d, nz = dz / d;
          p.pos.x = c.x + nx * rr; p.pos.y = c.y + ny * rr; p.pos.z = c.z + nz * rr;
          const vn = p.vel.x * nx + p.vel.y * ny + p.vel.z * nz;
          if (vn < 0) {
            p.vel.x -= nx * vn * 1.6; p.vel.y -= ny * vn * 1.6; p.vel.z -= nz * vn * 1.6;
          }
          if (Math.abs(vn) > 46 || p.speed > 72) { hardCrash(); return; }
          p.speed *= 0.62;
          p.fuel = Math.max(0, p.fuel - 5);
          if (scrapeCD <= 0) {
            scrapeCD = 0.5;
            EW.Sfx.scrape();
            S.shake = Math.min(1, S.shake + 0.5);
            EW.Sprites.burst(p.pos.x, p.pos.y, p.pos.z, 10, { r: 1, g: 0.6, b: 0.25, size: 1.6, life: 0.5, speed: 9 });
          }
        }
      }
    }

    // --- water skim ---
    const gh = T.sampleGround(p.pos.x, p.pos.z);
    S.waterIn = false;
    if (gh < EW.Terrain.LAKE_Y - 1.5 && p.pos.y < EW.Terrain.LAKE_Y + 0.9) {
      S.waterIn = true;
      if (p.vel.y < 0) p.vel.y = -p.vel.y * 0.4 + 1.2;
      p.pos.y = EW.Terrain.LAKE_Y + 0.9;
      p.speed *= 0.985;
      if (splashCD <= 0 && p.speed > 18) {
        splashCD = 0.12;
        EW.Sfx.splash();
        EW.Sprites.burst(p.pos.x, EW.Terrain.LAKE_Y + 0.5, p.pos.z, 3, {
          r: 0.55, g: 0.75, b: 0.8, size: 1.4, life: 0.5, speed: 5, up: 4, pool: 'puff', a: 0.5
        });
        EW.Sprites.burst(p.pos.x, EW.Terrain.LAKE_Y + 0.5, p.pos.z, 2, {
          r: 0.7, g: 0.85, b: 0.9, size: 1.0, life: 0.35, speed: 7, up: 5
        });
      }
    }

    // --- terrain ---
    if (p.pos.y < gh + 1.15) {
      const n = T.normal(p.pos.x, p.pos.z, V);
      const vn = p.vel.x * n.x + p.vel.y * n.y + p.vel.z * n.z;
      const impact = -vn;
      p.pos.y = gh + 1.15;
      if (vn < 0) {
        p.vel.x -= n.x * vn * 1.45;
        p.vel.y -= n.y * vn * 1.45;
        p.vel.z -= n.z * vn * 1.45;
      }
      if (impact > 27 || p.speed > 74) { hardCrash(); return; }
      p.speed = Math.max(8, p.speed * 0.72);
      p.fuel = Math.max(0, p.fuel - 6);
      p.vel.y = Math.max(p.vel.y, 3);
      if (scrapeCD <= 0) {
        scrapeCD = 0.5;
        EW.Sfx.scrape();
        S.shake = Math.min(1, S.shake + 0.55);
        EW.Sprites.burst(p.pos.x, p.pos.y, p.pos.z, 12, { r: 1, g: 0.62, b: 0.28, size: 1.6, life: 0.55, speed: 10 });
        if (EW.UI) EW.UI.flashFuel();
      }
    }
  }

  function hardCrash() {
    if (S.state !== 'play') return;
    S.state = 'tumble';
    S._tumbleT = 0;
    S._tumbleSpin = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 4);
    S.shake = 1;
    EW.Sfx.crash();
    EW.Sfx.setBoost(false);
    EW.Sprites.burst(S.player.pos.x, S.player.pos.y, S.player.pos.z, 26, {
      r: 1, g: 0.55, b: 0.2, size: 2.2, life: 1.0, speed: 14, spread: 2
    });
    EW.Sprites.burst(S.player.pos.x, S.player.pos.y, S.player.pos.z, 12, {
      r: 0.3, g: 0.28, b: 0.3, size: 3.5, life: 1.4, speed: 6, pool: 'puff', a: 0.6, grow: 2
    });
    if (S.onHardCrash) S.onHardCrash();
  }

  function tumble(dt) {
    const p = S.player;
    S._tumbleT += dt;
    p.speed = Math.max(0, p.speed - 55 * dt);
    p.roll += S._tumbleSpin * dt;
    p.pitch += 2.2 * dt;
    M.v3fwd(p.fwd, p.yaw, p.pitch);
    M.v3scale(p.vel, p.fwd, p.speed);
    p.vel.y -= 9 * dt;
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.pos.z += p.vel.z * dt;
    const gh = EW.Terrain.sampleGround(p.pos.x, p.pos.z);
    if (p.pos.y < gh + 1.0) {
      p.pos.y = gh + 1.0;
      p.speed *= 0.5;
      p.vel.y = 0;
    }
    if (S.time % 0.1 < dt) {
      EW.Sprites.burst(p.pos.x, p.pos.y, p.pos.z, 2, { r: 1, g: 0.5, b: 0.2, size: 1.4, life: 0.5, speed: 5 });
    }
    updateCamera(dt);
    if (S._tumbleT > 1.45 && S.onRespawn) S.onRespawn();
  }

  S.respawn = function (pos, yaw, manual) {
    const p = S.player;
    p.pos.x = pos.x; p.pos.y = pos.y; p.pos.z = pos.z;
    p.yaw = yaw; p.pitch = -0.04; p.roll = 0;
    M.v3fwd(p.fwd, p.yaw, p.pitch);
    p.speed = 46;
    M.v3scale(p.vel, p.fwd, p.speed);
    p.combo = 0;
    S.state = 'play';
    S.shake = 0;
    if (EW.UI) EW.UI.toast(manual ? 'Back to the last beacon.' : 'The lantern catches — you rise again.', 2600);
  };

  /* ================= camera ================= */
  const camIdeal = { x: 0, y: 0, z: 0 };
  const lookT = { x: 0, y: 0, z: 0 };
  let titleT = 0, finaleT = 0;

  function updateCamera(dt) {
    const p = S.player, cam = S.camera;
    if (S.firstPerson) {
      cam.pos.x = M.damp(cam.pos.x, p.pos.x + p.fwd.x * 1.4, 22, dt);
      cam.pos.y = M.damp(cam.pos.y, p.pos.y + p.fwd.y * 1.4 + 0.9, 22, dt);
      cam.pos.z = M.damp(cam.pos.z, p.pos.z + p.fwd.z * 1.4, 22, dt);
      lookT.x = p.pos.x + p.fwd.x * 40;
      lookT.y = p.pos.y + p.fwd.y * 40;
      lookT.z = p.pos.z + p.fwd.z * 40;
      cam.roll = M.damp(cam.roll, p.roll * 0.9, 8, dt);
      cam.fov = M.damp(cam.fov, 72 + p.speed * 0.14 + (p.boostOn ? 8 : 0), 4, dt);
    } else {
      const dist = 8.5 + p.speed * 0.05 + (p.boostOn ? 1.6 : 0);
      camIdeal.x = p.pos.x - p.fwd.x * dist;
      camIdeal.y = p.pos.y - p.fwd.y * dist + 2.9;
      camIdeal.z = p.pos.z - p.fwd.z * dist;
      // keep out of the ground
      for (let i = 1; i <= 4; i++) {
        const t = i / 4;
        const sx = M.lerp(p.pos.x, camIdeal.x, t);
        const sz = M.lerp(p.pos.z, camIdeal.z, t);
        const sy = M.lerp(p.pos.y, camIdeal.y, t);
        const gh = EW.Terrain.sampleGround(sx, sz);
        if (sy < gh + 2.2) camIdeal.y = Math.max(camIdeal.y, gh + 2.6);
      }
      const k = 7.5;
      cam.pos.x = M.damp(cam.pos.x, camIdeal.x, k, dt);
      cam.pos.y = M.damp(cam.pos.y, camIdeal.y, k, dt);
      cam.pos.z = M.damp(cam.pos.z, camIdeal.z, k, dt);
      lookT.x = p.pos.x + p.fwd.x * 7.5;
      lookT.y = p.pos.y + p.fwd.y * 7.5 + 1.0;
      lookT.z = p.pos.z + p.fwd.z * 7.5;
      cam.roll = M.damp(cam.roll, p.roll * 0.38, 6, dt);
      cam.fov = M.damp(cam.fov, 62 + p.speed * 0.15 + (p.boostOn ? 7 : 0), 4, dt);
    }
    cam.look.x = lookT.x; cam.look.y = lookT.y; cam.look.z = lookT.z;

    // shake
    S.shake = Math.max(0, S.shake - dt * 1.8);
    if (S.shake > 0.001 && !(EW.Game && EW.Game.reduceMotion)) {
      const a = S.shake * 0.5;
      cam.pos.x += (Math.random() - 0.5) * a;
      cam.pos.y += (Math.random() - 0.5) * a;
      cam.pos.z += (Math.random() - 0.5) * a;
    }

    // rolled up vector: up' = worldUp*cos(a) + right*sin(a)
    const a = cam.roll;
    const cr = Math.cos(a), sr = Math.sin(a);
    const f = p.fwd;
    // right = cross(f, worldUp=(0,1,0)) = (f.z*0 - ... ) -> (-f.z*1? use f×u formula)
    let rx = f.y * 0 - f.z * 1, ry = f.z * 0 - f.x * 0, rz = f.x * 1 - f.y * 0;
    const rl = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    rx /= rl; ry /= rl; rz /= rl;
    cam.up.x = rx * sr;
    cam.up.y = cr + ry * sr;
    cam.up.z = rz * sr;
    // camera right/up for sprites
    S.camRight = { x: rx, y: ry, z: rz };
    S.camUp = { x: cam.up.x, y: cam.up.y, z: cam.up.z };
  }

  function titleCam(dt) {
    titleT += dt;
    const cam = S.camera;
    const a = titleT * 0.055;
    const cx = Math.cos(a) * 520, cz = Math.sin(a) * 520;
    cam.pos.x = M.damp(cam.pos.x, cx, 1.2, dt);
    cam.pos.y = M.damp(cam.pos.y, 240 + Math.sin(titleT * 0.13) * 40, 1.2, dt);
    cam.pos.z = M.damp(cam.pos.z, cz, 1.2, dt);
    cam.look.x = M.damp(cam.look.x, 0, 2, dt);
    cam.look.y = M.damp(cam.look.y, 90, 2, dt);
    cam.look.z = M.damp(cam.look.z, -60, 2, dt);
    cam.up.x = 0; cam.up.y = 1; cam.up.z = 0;
    cam.fov = M.damp(cam.fov, 58, 2, dt);
    S.camRight = { x: -Math.sin(a + Math.PI / 2), y: 0, z: Math.cos(a + Math.PI / 2) };
    S.camUp = { x: 0, y: 1, z: 0 };
    // park the glider high above the valley for the title shot
    const p = S.player;
    p.pos.x = 0; p.pos.y = 160; p.pos.z = -60;
    p.yaw = a + Math.PI / 2; p.pitch = -0.05; p.roll = 0;
    M.v3fwd(p.fwd, p.yaw, p.pitch);
  }

  function finaleCam(dt) {
    finaleT += dt;
    const cam = S.camera, p = S.player;
    const a = finaleT * 0.22;
    const r = 26;
    cam.pos.x = M.damp(cam.pos.x, p.pos.x + Math.cos(a) * r, 2.5, dt);
    cam.pos.y = M.damp(cam.pos.y, p.pos.y + 9 + Math.sin(finaleT * 0.3) * 3, 2.5, dt);
    cam.pos.z = M.damp(cam.pos.z, p.pos.z + Math.sin(a) * r, 2.5, dt);
    cam.look.x = M.damp(cam.look.x, p.pos.x, 4, dt);
    cam.look.y = M.damp(cam.look.y, p.pos.y, 4, dt);
    cam.look.z = M.damp(cam.look.z, p.pos.z, 4, dt);
    cam.up.x = 0; cam.up.y = 1; cam.up.z = 0;
    cam.fov = M.damp(cam.fov, 55, 2, dt);
    S.camRight = { x: Math.cos(a + Math.PI / 2), y: 0, z: Math.sin(a + Math.PI / 2) };
    S.camUp = { x: 0, y: 1, z: 0 };
    // gentle soar during the finale
    p.pos.y += 6 * dt;
    p.roll = M.damp(p.roll, 0.12, 1, dt);
    p.yaw = M.wrapAngle(p.yaw + 0.14 * dt);
    M.v3fwd(p.fwd, p.yaw, p.pitch);
  }

  S.startFinale = function () {
    finaleT = 0;
    S.state = 'finale';
  };

  S.resetFlight = function () {
    const p = S.player;
    const L = EW.Props.launch;
    p.pos.x = L.x; p.pos.y = L.y + 58; p.pos.z = L.z - 60;
    p.yaw = 0; p.pitch = -0.05; p.roll = 0;
    M.v3fwd(p.fwd, p.yaw, p.pitch);
    p.speed = 50;
    M.v3scale(p.vel, p.fwd, p.speed);
    p.fuel = 60; p.embers = 0; p.combo = 0;
    S.checkpoint.pos.x = L.x; S.checkpoint.pos.y = L.y + 58; S.checkpoint.pos.z = L.z - 60;
    S.checkpoint.yaw = 0;
    S.camera.pos.x = L.x; S.camera.pos.y = L.y + 62; S.camera.pos.z = L.z - 48;
    S.time = 0;
    S.state = 'play';
  };
})();
