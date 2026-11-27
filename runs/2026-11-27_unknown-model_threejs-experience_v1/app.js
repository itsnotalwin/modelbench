/* Lumen Grove — original interactive 3D experience.
 * Pinned Three.js 0.160.0 (global window.THREE). No other libraries. No build step.
 * All rendering work happens locally; no network calls besides the Three.js CDN script.
 */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- helpers */

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };

  /* ------------------------------------------------------------------- DOM */

  var canvas = document.getElementById('scene');
  var stage = document.getElementById('stage');
  var stageWrap = document.getElementById('stage-wrap');
  var hud = document.querySelector('.hud');
  var fallbackEl = document.getElementById('fallback');
  var fallbackTitle = document.getElementById('fallback-title');
  var fallbackMessage = document.getElementById('fallback-message');
  var statusEl = document.getElementById('status');
  var btnPulse = document.getElementById('btn-pulse');
  var btnReset = document.getElementById('btn-reset');
  var btnMotion = document.getElementById('btn-motion');
  var speedInput = document.getElementById('speed');
  var speedValue = document.getElementById('speed-value');
  var btnRetry = document.getElementById('btn-retry');

  function announce(msg) { if (statusEl) { statusEl.textContent = msg; } }

  function showFallback(title, message) {
    if (!fallbackEl) { return; }
    if (fallbackTitle && title) { fallbackTitle.textContent = title; }
    if (fallbackMessage && message) { fallbackMessage.textContent = message; }
    fallbackEl.hidden = false;
    if (canvas) { canvas.style.visibility = 'hidden'; }
    if (hud) { hud.hidden = true; }
    announce((title || '3D view unavailable') + '. ' + (message || ''));
  }

  /* ---------------------------------------------------- reduced-motion pref */

  var reduceMotionQuery = null;
  var prefersReducedMotion = false;
  try {
    reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = !!reduceMotionQuery.matches;
    var onMotionChange = function (e) {
      prefersReducedMotion = !!e.matches;
      if (prefersReducedMotion) { motionSpeed = 0; syncMotionUI(); }
      else if (motionSpeed === 0 && speedInput && +speedInput.value === 0) { /* leave user-set 0 */ }
      resetAmbientState();
      renderOnce();
      announce(prefersReducedMotion ? 'Reduced motion enabled; ambient animation paused.' : 'Reduced motion disabled.');
    };
    if (reduceMotionQuery.addEventListener) { reduceMotionQuery.addEventListener('change', onMotionChange); }
    else if (reduceMotionQuery.addListener) { reduceMotionQuery.addListener(onMotionChange); }
  } catch (e) { prefersReducedMotion = false; }

  /* ------------------------------------------------------- WebGL detection */

  function webglAvailable() {
    try {
      var test = document.createElement('canvas');
      if (!(window.WebGLRenderingContext || window.WebGL2RenderingContext)) { return false; }
      var gl = test.getContext('webgl2') || test.getContext('webgl') || test.getContext('experimental-webgl');
      return !!gl;
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------------- init guard */

  if (typeof window.THREE === 'undefined') {
    showFallback('Could not start 3D view', 'Three.js 0.160.0 failed to load from the CDN. Check your network connection and reload.');
    return;
  }

  var THREE = window.THREE;

  if (!webglAvailable()) {
    showFallback('WebGL is not available', 'Your browser or device does not support WebGL. Try a modern browser with hardware acceleration enabled.');
    return;
  }

  /* --------------------------------------------------------------- renderer */

  var renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    showFallback('WebGLRenderer failed', 'The 3D renderer could not be created in this browser. ' + (e && e.message ? e.message : ''));
    return;
  }

  if (!renderer || !renderer.getContext()) {
    showFallback('WebGLRenderer failed', 'The 3D renderer could not obtain a WebGL context.');
    return;
  }

  renderer.setClearColor(0x0a0f24, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  var MAX_PIXEL_RATIO = 2;
  var currentPixelRatio = 1;

  /* ------------------------------------------------------------------ scene */

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f24);
  scene.fog = new THREE.FogExp2(0x0a0f24, 0.042);

  var camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);

  // lights
  var ambient = new THREE.AmbientLight(0x4a5a8a, 0.55);
  scene.add(ambient);
  var hemi = new THREE.HemisphereLight(0x9db4ff, 0x1a1428, 0.75);
  scene.add(hemi);
  var moon = new THREE.DirectionalLight(0xfff2d8, 1.05);
  moon.position.set(5, 9, 4);
  scene.add(moon);
  var coreLight = new THREE.PointLight(0x88ffd8, 2.2, 14, 2);
  coreLight.position.set(0, 1.4, 0);
  scene.add(coreLight);

  var grove = new THREE.Group();
  scene.add(grove);

  /* -------------------------------------------------- procedural grove build */

  var rng = mulberry32(0xC0FFEE);
  var UP = new THREE.Vector3(0, 1, 0);
  var FORWARD = new THREE.Vector3(0, 0, 1);

  var branchParts = [];
  var leaves = []; // {pos:Vector3, quat:Quaternion, scale:number, phase:number, dist:number, r:number,g:number,b:number}
  var MAX_LEAVES = 360;
  var MAX_BRANCHES = 220;

  var tmpA = new THREE.Vector3();
  var tmpB = new THREE.Vector3();
  var tmpQ = new THREE.Quaternion();

  function randomPerpendicular(dir) {
    var a = tmpA.set(1, 0, 0);
    if (Math.abs(dir.x) > 0.9) { a.set(0, 1, 0); }
    var p = tmpB.copy(a).cross(dir).normalize();
    var angle = rng() * Math.PI * 2;
    p.applyAxisAngle(dir, angle);
    return p.clone();
  }

  function addLeaf(pos, dir) {
    if (leaves.length >= MAX_LEAVES) { return; }
    var n = dir.clone().normalize();
    var q = new THREE.Quaternion().setFromUnitVectors(FORWARD, n);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(FORWARD, rng() * Math.PI * 2));
    var scale = 0.16 + rng() * 0.16;
    var hue = 0.30 + rng() * 0.12; // greenish
    var light = 0.45 + rng() * 0.25;
    // convert HSL-ish to RGB manually for a soft leaf variation
    var base = new THREE.Color().setHSL(hue, 0.55, light);
    leaves.push({
      pos: pos.clone().addScaledVector(n, 0.06),
      quat: q,
      scale: scale,
      phase: rng() * Math.PI * 2,
      dist: pos.length(),
      r: base.r, g: base.g, b: base.b
    });
  }

  function grow(pos, dir, length, radius, depth) {
    var n = dir.clone().normalize();
    var end = pos.clone().addScaledVector(n, length);

    if (branchParts.length < MAX_BRANCHES) {
      var mid = pos.clone().addScaledVector(n, length * 0.5);
      var q = new THREE.Quaternion().setFromUnitVectors(UP, n);
      branchParts.push({ pos: mid, quat: q, r: radius, len: length });
    }

    if (depth <= 0) { addLeaf(end, n); addLeaf(end, n); return; }

    var childCount = depth >= 3 ? 3 : 2;
    var spread = 0.5 + rng() * 0.25;
    for (var i = 0; i < childCount; i++) {
      var axis = randomPerpendicular(n);
      var ang = spread * (0.7 + rng() * 0.5);
      var childDir = n.clone().applyAxisAngle(axis, ang).normalize();
      // slight upward bias so the grove lifts
      childDir.y += 0.12; childDir.normalize();
      grow(end, childDir, length * (0.68 + rng() * 0.1), radius * 0.66, depth - 1);
    }
    if (depth === 1) { addLeaf(end, n); }
  }

  grow(new THREE.Vector3(0, 0, 0), UP.clone(), 1.7, 0.17, 4);

  /* ---- branches: single InstancedMesh */
  var branchGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
  var branchMat = new THREE.MeshStandardMaterial({ color: 0x3b5a4a, roughness: 0.85, metalness: 0.05, flatShading: true });
  var branchMesh = new THREE.InstancedMesh(branchGeo, branchMat, branchParts.length);
  var m = new THREE.Matrix4();
  var s = new THREE.Vector3();
  for (var bi = 0; bi < branchParts.length; bi++) {
    var bp = branchParts[bi];
    s.set(bp.r, bp.len, bp.r);
    m.compose(bp.pos, bp.quat, s);
    branchMesh.setMatrixAt(bi, m);
  }
  branchMesh.instanceMatrix.needsUpdate = true;
  grove.add(branchMesh);

  /* ---- leaves: single InstancedMesh */
  var LEAF_N = leaves.length;
  var leafGeo = new THREE.OctahedronGeometry(1, 0);
  var leafMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.45, metalness: 0.0,
    emissive: 0x1f6b52, emissiveIntensity: 0.85, flatShading: true
  });
  var leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, LEAF_N);
  leafMesh.frustumCulled = true;

  var leafBasePos = new Float32Array(LEAF_N * 3);
  var leafBaseQuat = new Array(LEAF_N);
  var leafBaseScale = new Float32Array(LEAF_N);
  var leafPhase = new Float32Array(LEAF_N);
  var leafDist = new Float32Array(LEAF_N);
  var leafBaseRGB = new Float32Array(LEAF_N * 3);

  var tmpPos = new THREE.Vector3();
  var tmpSwayQ = new THREE.Quaternion();
  var tmpScale = new THREE.Vector3();
  var tmpMat = new THREE.Matrix4();
  var tmpColor = new THREE.Color();

  for (var li = 0; li < LEAF_N; li++) {
    var leaf = leaves[li];
    leafBasePos[li * 3] = leaf.pos.x;
    leafBasePos[li * 3 + 1] = leaf.pos.y;
    leafBasePos[li * 3 + 2] = leaf.pos.z;
    leafBaseQuat[li] = leaf.quat;
    leafBaseScale[li] = leaf.scale;
    leafPhase[li] = leaf.phase;
    leafDist[li] = leaf.dist;
    leafBaseRGB[li * 3] = leaf.r;
    leafBaseRGB[li * 3 + 1] = leaf.g;
    leafBaseRGB[li * 3 + 2] = leaf.b;
    tmpScale.setScalar(leaf.scale);
    tmpMat.compose(leaf.pos, leaf.quat, tmpScale);
    leafMesh.setMatrixAt(li, tmpMat);
    tmpColor.setRGB(leaf.r, leaf.g, leaf.b);
    leafMesh.setColorAt(li, tmpColor);
  }
  leafMesh.instanceMatrix.needsUpdate = true;
  if (leafMesh.instanceColor) { leafMesh.instanceColor.needsUpdate = true; }
  grove.add(leafMesh);

  /* ---- central emissive core */
  var coreGeo = new THREE.SphereGeometry(0.42, 32, 24);
  var coreMat = new THREE.MeshStandardMaterial({
    color: 0x0a3a30, emissive: 0x6fffd4, emissiveIntensity: 1.4, roughness: 0.3, metalness: 0.0
  });
  var core = new THREE.Mesh(coreGeo, coreMat);
  core.position.set(0, 1.4, 0);
  grove.add(core);

  /* ---- ground + ring */
  var groundGeo = new THREE.CircleGeometry(9, 64);
  var groundMat = new THREE.MeshStandardMaterial({ color: 0x0d1430, roughness: 1.0, metalness: 0.0 });
  var ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  var ringGeo = new THREE.RingGeometry(4.2, 4.35, 96);
  var ringMat = new THREE.MeshBasicMaterial({ color: 0x3a4a8a, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  var ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);

  /* ---- drifting motes: single Points object */
  var MOTE_N = 160;
  var moteGeo = new THREE.BufferGeometry();
  var motePos = new Float32Array(MOTE_N * 3);
  var moteSeed = new Float32Array(MOTE_N * 3);
  for (var mi = 0; mi < MOTE_N; mi++) {
    var rr = 2 + rng() * 6;
    var th = rng() * Math.PI * 2;
    var yy = rng() * 4;
    motePos[mi * 3] = Math.cos(th) * rr;
    motePos[mi * 3 + 1] = yy;
    motePos[mi * 3 + 2] = Math.sin(th) * rr;
    moteSeed[mi * 3] = rng() * Math.PI * 2;
    moteSeed[mi * 3 + 1] = 0.3 + rng() * 0.7;
    moteSeed[mi * 3 + 2] = rr;
  }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  var moteMat = new THREE.PointsMaterial({ color: 0xbfe9ff, size: 0.05, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false });
  var motes = new THREE.Points(moteGeo, moteMat);
  scene.add(motes);

  /* --------------------------------------------------------------- pulse */

  var PULSE_DELAY = 0.055;   // seconds of delay per unit distance
  var PULSE_DUR = 0.55;      // seconds a leaf stays lit
  var pulseActive = false;
  var pulseStart = 0;        // seconds
  var pulseOriginDist = 0;
  var colorsDirty = false;
  var CORE_BASE_LIGHT = coreLight.intensity;
  var CORE_BASE_EMISSIVE = coreMat.emissiveIntensity;

  function triggerPulse(originDist, label) {
    pulseActive = true;
    pulseStart = nowSeconds();
    pulseOriginDist = originDist || 0;
    announce(label || 'Pulse sent.');
  }

  /* --------------------------------------------------------------- camera */

  var orbit = {
    theta: Math.PI * 0.25, phi: Math.PI * 0.36, radius: 10.5,
    target: new THREE.Vector3(0, 1.5, 0)
  };
  var DEFAULT = { theta: orbit.theta, phi: orbit.phi, radius: orbit.radius, tx: orbit.target.x, ty: orbit.target.y, tz: orbit.target.z };
  var PHI_MIN = 0.08, PHI_MAX = Math.PI - 0.08;
  var RADIUS_MIN = 3.0, RADIUS_MAX = 24.0;
  var camPos = new THREE.Vector3();
  var camRight = new THREE.Vector3();
  var camUp = new THREE.Vector3();

  function updateCamera() {
    orbit.phi = clamp(orbit.phi, PHI_MIN, PHI_MAX);
    orbit.radius = clamp(orbit.radius, RADIUS_MIN, RADIUS_MAX);
    var sinPhi = Math.sin(orbit.phi);
    camPos.set(
      orbit.target.x + orbit.radius * sinPhi * Math.sin(orbit.theta),
      orbit.target.y + orbit.radius * Math.cos(orbit.phi),
      orbit.target.z + orbit.radius * sinPhi * Math.cos(orbit.theta)
    );
    camera.position.copy(camPos);
    camera.lookAt(orbit.target);
    camera.updateMatrixWorld();
    camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    camUp.setFromMatrixColumn(camera.matrixWorld, 1);
  }

  function resetCamera() {
    orbit.theta = DEFAULT.theta; orbit.phi = DEFAULT.phi; orbit.radius = DEFAULT.radius;
    orbit.target.set(DEFAULT.tx, DEFAULT.ty, DEFAULT.tz);
    updateCamera(); renderOnce(); announce('Camera reset to default view.');
  }

  /* --------------------------------------------------------- pointer input */

  var pointers = new Map(); // id -> {x, y}
  var drag = null;          // active drag
  var pinch = null;         // active pinch
  var CLICK_SLOP = 7;       // px
  var CLICK_TIME = 500;     // ms
  var DRAG_THRESHOLD = 4;   // px before a drag counts as movement

  function canvasPoint(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height };
  }

  function onPointerDown(e) {
    canvas.focus({ preventScroll: true });
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    var p = canvasPoint(e);
    pointers.set(e.pointerId, { x: p.x, y: p.y });

    if (pointers.size === 2) {
      // enter pinch; cancel any single-pointer drag/click
      drag = null;
      var pts = Array.from(pointers.values());
      pinch = {
        startDist: Math.max(1, dist2(pts[0], pts[1])),
        startRadius: orbit.radius,
        lastCx: (pts[0].x + pts[1].x) / 2,
        lastCy: (pts[0].y + pts[1].y) / 2
      };
    } else if (pointers.size === 1) {
      var panMode = e.button === 2 || e.shiftKey;
      drag = {
        pointerId: e.pointerId,
        lastX: p.x, lastY: p.y,
        downX: p.x, downY: p.y,
        downTime: performance.now(),
        moved: 0,
        mode: panMode ? 'pan' : 'orbit',
        multi: false
      };
    } else {
      drag = null;
    }
  }

  function dist2(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

  function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) { return; }
    var p = canvasPoint(e);
    pointers.set(e.pointerId, { x: p.x, y: p.y });

    if (pinch && pointers.size >= 2) {
      var pts = Array.from(pointers.values());
      var d = Math.max(1, dist2(pts[0], pts[1]));
      var scale = pinch.startDist / d;
      orbit.radius = clamp(pinch.startRadius * scale, RADIUS_MIN, RADIUS_MAX);
      // two-finger pan
      var cx = (pts[0].x + pts[1].x) / 2;
      var cy = (pts[0].y + pts[1].y) / 2;
      var dx = cx - pinch.lastCx, dy = cy - pinch.lastCy;
      panBy(dx, dy, p.w || canvas.clientWidth, p.h || canvas.clientHeight);
      pinch.lastCx = cx; pinch.lastCy = cy;
      updateCamera(); renderOnce();
      return;
    }

    if (!drag || drag.pointerId !== e.pointerId || pointers.size > 1) { return; }
    var dx = p.x - drag.lastX;
    var dy = p.y - drag.lastY;
    drag.lastX = p.x; drag.lastY = p.y;
    if (Math.abs(p.x - drag.downX) > DRAG_THRESHOLD || Math.abs(p.y - drag.downY) > DRAG_THRESHOLD) { drag.moved += 1; }

    if (drag.mode === 'pan') { panBy(dx, dy, p.w, p.h); }
    else { orbit.theta -= dx * 0.0085; orbit.phi -= dy * 0.0085; }
    updateCamera(); renderOnce();
  }

  function panBy(dx, dy, w, h) {
    var width = w || canvas.clientWidth || 1;
    var height = h || canvas.clientHeight || 1;
    var k = (orbit.radius * 1.2) / Math.max(width, height);
    orbit.target.addScaledVector(camRight, -dx * k);
    orbit.target.addScaledVector(camUp, dy * k);
  }

  function onPointerUp(e) {
    var wasDrag = drag;
    var wasPinch = !!pinch;
    pointers.delete(e.pointerId);
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}

    if (pointers.size < 2) { pinch = null; }

    // rebuild a drag for the remaining single pointer after a pinch ends
    if (pointers.size === 1) {
      var remaining = Array.from(pointers.entries())[0];
      drag = { pointerId: remaining[0], lastX: remaining[1].x, lastY: remaining[1].y, downX: remaining[1].x, downY: remaining[1].y, downTime: performance.now(), moved: 99, mode: 'orbit', multi: true };
    } else if (pointers.size === 0) {
      drag = null;
    }

    // click / tap detection (single pointer, no drag, no pinch)
    if (!wasPinch && wasDrag && pointers.size === 0 && wasDrag.pointerId === e.pointerId) {
      var p = canvasPoint(e); // canvas-local coords, matching wasDrag.downX/downY
      var moveCanvas = Math.abs(p.x - wasDrag.downX) + Math.abs(p.y - wasDrag.downY);
      var elapsed = performance.now() - wasDrag.downTime;
      var effectivelyMoved = wasDrag.moved || moveCanvas > CLICK_SLOP;
      if (!wasDrag.multi && !effectivelyMoved && elapsed < CLICK_TIME) { pickAt(p); }
    }
  }

  function onPointerCancel(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) { pinch = null; }
    drag = null;
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
  }

  /* ------------------------------------------------------------ picking */

  var raycaster = new THREE.Raycaster();
  var ndc = new THREE.Vector2();
  var pickTargets = [];

  function pickAt(p) {
    var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    ndc.set((p.x / w) * 2 - 1, -(p.y / h) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    pickTargets.length = 0;
    pickTargets.push(leafMesh, core);
    var hits = raycaster.intersectObjects(pickTargets, false);
    if (hits.length > 0) {
      var hit = hits[0];
      if (hit.object === leafMesh && hit.instanceId != null) {
        triggerPulse(leafDist[hit.instanceId], 'Pulse sent from a leaf.');
      } else {
        triggerPulse(0, 'Pulse sent.');
      }
    } else {
      triggerPulse(0, 'Pulse sent.');
    }
  }

  /* ------------------------------------------------------------ keyboard */

  var keysDown = new Set();
  var KEY_ROTATE = 1.6;   // rad/sec
  var KEY_ZOOM = 6.0;     // units/sec
  var KEY_PAN = 3.0;      // units/sec

  var MOVE_KEYS = {
    'ArrowLeft': 1, 'ArrowRight': 1, 'ArrowUp': 1, 'ArrowDown': 1,
    'KeyA': 1, 'KeyD': 1, 'KeyW': 1, 'KeyS': 1,
    'NumpadAdd': 1, 'NumpadSubtract': 1, 'Equal': 1, 'Minus': 1,
    'PageUp': 1, 'PageDown': 1, 'ShiftLeft': 1, 'ShiftRight': 1
  };

  function onKeyDown(e) {
    var k = e.key;
    var code = e.code;

    // one-shot actions
    if (k === ' ' || code === 'Space') { e.preventDefault(); triggerPulse(0, 'Pulse sent.'); return; }
    if (k === 'p' || k === 'P') { e.preventDefault(); triggerPulse(0, 'Pulse sent.'); return; }
    if (k === 'r' || k === 'R' || k === 'Home') { e.preventDefault(); resetCamera(); return; }
    if (k === 'm' || k === 'M') { e.preventDefault(); toggleMotion(); return; }

    // continuous movement keys
    if (MOVE_KEYS[code] || MOVE_KEYS[k]) {
      e.preventDefault();
      if (!e.repeat) { keysDown.add(code || k); }
      else { keysDown.add(code || k); }
    }
  }

  function onKeyUp(e) { keysDown.delete(e.code || e.key); keysDown.delete(e.key); keysDown.delete(e.code); }

  function clearKeys() { keysDown.clear(); }

  function applyKeyboard(dt) {
    if (keysDown.size === 0) { return; }
    var shift = keysDown.has('ShiftLeft') || keysDown.has('ShiftRight');
    var moved = false;

    // zoom keys work regardless of shift
    if (keysDown.has('Equal') || keysDown.has('NumpadAdd')) { orbit.radius -= KEY_ZOOM * dt; moved = true; }
    if (keysDown.has('Minus') || keysDown.has('NumpadSubtract')) { orbit.radius += KEY_ZOOM * dt; moved = true; }
    if (keysDown.has('PageUp')) { orbit.radius -= KEY_ZOOM * dt; moved = true; }
    if (keysDown.has('PageDown')) { orbit.radius += KEY_ZOOM * dt; moved = true; }

    var left = keysDown.has('ArrowLeft') || keysDown.has('KeyA');
    var right = keysDown.has('ArrowRight') || keysDown.has('KeyD');
    var up = keysDown.has('ArrowUp') || keysDown.has('KeyW');
    var down = keysDown.has('ArrowDown') || keysDown.has('KeyS');

    if (shift) {
      // pan
      var panScale = orbit.radius * 0.9 * dt;
      if (left) { orbit.target.addScaledVector(camRight, panScale); moved = true; }
      if (right) { orbit.target.addScaledVector(camRight, -panScale); moved = true; }
      if (up) { orbit.target.addScaledVector(camUp, -panScale); moved = true; }
      if (down) { orbit.target.addScaledVector(camUp, panScale); moved = true; }
    } else {
      if (left) { orbit.theta -= KEY_ROTATE * dt; moved = true; }
      if (right) { orbit.theta += KEY_ROTATE * dt; moved = true; }
      if (up) { orbit.phi -= KEY_ROTATE * dt; moved = true; }
      if (down) { orbit.phi += KEY_ROTATE * dt; moved = true; }
    }

    if (moved) { updateCamera(); }
  }

  /* '+' and '-' keys: code may be 'Equal'/'Minus'; also support bare keys */
  // (handled above via code; '+' itself has code 'Equal' or 'NumpadAdd')

  /* --------------------------------------------------------- motion state */

  var motionSpeed = prefersReducedMotion ? 0 : 100; // percent
  var userPaused = false;
  var animClock = 0;

  function syncMotionUI() {
    if (speedInput) { speedInput.value = String(motionSpeed); }
    if (speedValue) { speedValue.textContent = Math.round(motionSpeed) + '%'; }
  }

  function motionActive() { return !userPaused && !prefersReducedMotion && motionSpeed > 0; }

  function toggleMotion() {
    userPaused = !userPaused;
    if (btnMotion) {
      btnMotion.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
      btnMotion.textContent = userPaused ? 'Resume motion' : 'Pause motion';
      btnMotion.setAttribute('aria-label', userPaused ? 'Resume ambient animation' : 'Pause ambient animation');
    }
    resetAmbientState();
    renderOnce();
    announce(userPaused ? 'Ambient animation paused.' : 'Ambient animation resumed.');
  }

  function resetAmbientState() { /* animClock keeps running; nothing to reset, kept for clarity */ }

  /* --------------------------------------------------------------- update */

  var SWAY_SPEED = 0.8;
  var SWAY_AMP = 0.10;
  var SPIN_SPEED = 0.06;
  var baseGroveSpin = 0;

  function nowSeconds() { return performance.now() / 1000; }

  function update(dt) {
    var speedScale = motionSpeed / 100;
    var animating = motionActive();

    if (animating) { animClock += dt * speedScale; baseGroveSpin += dt * SPIN_SPEED * speedScale; }

    // keyboard camera
    applyKeyboard(dt);

    var t = animClock;

    // ambient spin
    grove.rotation.y = baseGroveSpin;

    // core pulse
    var corePulse = 0;
    var pulseElapsed = -1;

    // pulse state
    if (pulseActive) {
      pulseElapsed = nowSeconds() - pulseStart;
      var maxEnd = PULSE_DELAY * pulseMaxDist() + PULSE_DUR;
      if (pulseElapsed > maxEnd) { pulseActive = false; }
    }

    // leaf sway + pulse color
    var needMatrix = animating || pulseActive;
    var needColor = pulseActive || colorsDirty;

    if (needMatrix || needColor) {
      for (var i = 0; i < LEAF_N; i++) {
        var bx = leafBasePos[i * 3], by = leafBasePos[i * 3 + 1], bz = leafBasePos[i * 3 + 2];
        var baseQ = leafBaseQuat[i];
        var sc = leafBaseScale[i];

        // sway (only when animating)
        tmpSwayQ.identity();
        if (animating) {
          var sway = Math.sin(t * SWAY_SPEED + leafPhase[i]) * SWAY_AMP;
          tmpSwayQ.setFromAxisAngle(UP, sway);
        }

        tmpPos.set(bx, by, bz);
        tmpScale.setScalar(sc);

        // leaf local up-bob
        if (animating) {
          tmpPos.y += Math.sin(t * SWAY_SPEED * 1.3 + leafPhase[i]) * 0.015;
        }

        if (needMatrix) {
          tmpMat.compose(tmpPos, tmpQ.copy(baseQ).multiply(tmpSwayQ), tmpScale);
          leafMesh.setMatrixAt(i, tmpMat);
        }

        if (needColor) {
          var g = pulseGlow(pulseElapsed, leafDist[i]);
          var k = 1 + g * 1.8;
          tmpColor.setRGB(
            clamp(leafBaseRGB[i * 3] * k + g * 0.25, 0, 1),
            clamp(leafBaseRGB[i * 3 + 1] * k + g * 0.35, 0, 1),
            clamp(leafBaseRGB[i * 3 + 2] * k + g * 0.30, 0, 1)
          );
          leafMesh.setColorAt(i, tmpColor);
          if (g > corePulse) { corePulse = g; }
        }
      }
      if (needMatrix) { leafMesh.instanceMatrix.needsUpdate = true; }
      if (needColor && leafMesh.instanceColor) { leafMesh.instanceColor.needsUpdate = true; }
    }

    colorsDirty = pulseActive; // keep updating while pulse runs; reset once when done
    if (!pulseActive && needColor) { /* colors were reset above */ }

    // core emissive + light respond to pulse
    var globalGlow = pulseElapsed >= 0 ? Math.max(0, 1 - pulseElapsed / (PULSE_DUR + PULSE_DELAY * pulseMaxDist())) : 0;
    var coreScale = 1 + 0.12 * Math.sin(t * 1.6) * (animating ? 1 : 0) + 0.18 * corePulse + 0.1 * globalGlow;
    core.scale.setScalar(coreScale);
    coreMat.emissiveIntensity = CORE_BASE_EMISSIVE + 1.6 * corePulse + 0.8 * globalGlow;
    coreLight.intensity = CORE_BASE_LIGHT + 3.0 * corePulse + 2.0 * globalGlow;

    // motes drift
    if (animating) {
      for (var k = 0; k < MOTE_N; k++) {
        var sx = moteSeed[k * 3], sp = moteSeed[k * 3 + 1], r0 = moteSeed[k * 3 + 2];
        var a = sx + t * sp * 0.5;
        motePos[k * 3] = Math.cos(a) * (r0 + Math.sin(t * 0.7 + sx) * 0.3);
        motePos[k * 3 + 1] = ((moteSeed[k * 3 + 1] * 2 + t * sp * 0.25 + sx) % 4.2 + 4.2) % 4.2 + Math.sin(t + sx) * 0.1;
        motePos[k * 3 + 2] = Math.sin(a) * (r0 + Math.sin(t * 0.7 + sx) * 0.3);
      }
      moteGeo.attributes.position.needsUpdate = true;
    }
  }

  function pulseMaxDist() {
    // furthest leaf from origin plus margin
    return pulseMaxDistCache;
  }

  var pulseMaxDistCache = 0;
  (function () {
    var max = 0;
    for (var i = 0; i < LEAF_N; i++) { if (leafDist[i] > max) { max = leafDist[i]; } }
    pulseMaxDistCache = max + 1;
  })();

  function pulseGlow(elapsed, dist) {
    if (elapsed < 0 || !pulseActive) { return 0; }
    var local = elapsed - PULSE_DELAY * Math.abs(dist - pulseOriginDist);
    if (local <= 0 || local >= PULSE_DUR) { return 0; }
    return Math.sin((local / PULSE_DUR) * Math.PI);
  }

  /* --------------------------------------------------------------- render */

  var renderScheduled = false;
  function renderOnce() {
    if (renderScheduled) { return; }
    renderScheduled = true;
    requestAnimationFrame(function () {
      renderScheduled = false;
      renderer.render(scene, camera);
    });
  }

  var rafId = 0;
  var lastTime = 0;
  var running = true;

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (!running) { return; }
    if (document.hidden) { lastTime = now; return; }
    var dt = (now - lastTime) / 1000;
    lastTime = now;
    if (!(dt > 0)) { dt = 0; }
    dt = Math.min(dt, 0.05); // clamp big gaps (tab switches)
    update(dt);
    renderer.render(scene, camera);
  }

  /* --------------------------------------------------------------- resize */

  function resize() {
    var w = stage.clientWidth || stageWrap.clientWidth || window.innerWidth || 1;
    var h = stage.clientHeight || window.innerHeight || 1;
    if (w <= 0 || h <= 0) { return; }
    var dpr = clamp(window.devicePixelRatio || 1, 1, MAX_PIXEL_RATIO);
    if (dpr !== currentPixelRatio) { currentPixelRatio = dpr; renderer.setPixelRatio(dpr); }
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    updateCamera();
    renderOnce();
  }

  /* ---------------------------------------------------------------- events */

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var factor = Math.exp(-(e.deltaY || 0) * 0.0015);
    orbit.radius = clamp(orbit.radius * factor, RADIUS_MIN, RADIUS_MAX);
    updateCamera(); renderOnce();
  }, { passive: false });

  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('blur', clearKeys);
  window.addEventListener('blur', clearKeys);

  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    running = false;
    showFallback('WebGL context lost', 'The graphics context was lost. Retrying may restore the 3D view.');
  });
  canvas.addEventListener('webglcontextrestored', function () {
    // simplest reliable recovery: reload
    window.location.reload();
  });

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });

  if (window.ResizeObserver) {
    try { new ResizeObserver(function () { resize(); }).observe(stage); } catch (e) {}
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { lastTime = performance.now(); renderOnce(); }
  });

  if (btnPulse) { btnPulse.addEventListener('click', function () { triggerPulse(0, 'Pulse sent.'); }); }
  if (btnReset) { btnReset.addEventListener('click', resetCamera); }
  if (btnMotion) { btnMotion.addEventListener('click', toggleMotion); }
  if (btnRetry) { btnRetry.addEventListener('click', function () { window.location.reload(); }); }

  if (speedInput) {
    speedInput.value = String(motionSpeed);
    if (speedValue) { speedValue.textContent = Math.round(motionSpeed) + '%'; }
    speedInput.addEventListener('input', function () {
      motionSpeed = clamp(+speedInput.value || 0, 0, 200);
      if (speedValue) { speedValue.textContent = Math.round(motionSpeed) + '%'; }
      renderOnce();
    });
  }

  /* reduced-motion initial state for UI */
  if (prefersReducedMotion && speedInput) { speedInput.value = '0'; if (speedValue) { speedValue.textContent = '0%'; } }

  /* ------------------------------------------------------------------ start */

  syncMotionUI();
  updateCamera();
  resize();
  lastTime = performance.now();
  rafId = requestAnimationFrame(frame);
  announce('Lumen Grove ready. Focus the 3D view for keyboard controls.');

})();
