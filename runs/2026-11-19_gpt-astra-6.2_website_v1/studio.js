(() => {
  'use strict';

  const { presets, makeMesh, lightMesh, draw, obj, clamp } = window.StrataTerrain;
  const $ = id => document.getElementById(id);
  const icon = (name, extra = '') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const escapeText = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(6, '0');
  const presetFor = id => presets.find(p => p.id === id) || presets[0];
  const settingsFor = p => ({ id: p.id, seed: p.seed, elevation: p.elevation, roughness: p.roughness, frequency: p.frequency });
  const cameraFor = p => ({ yaw: p.yaw, pitch: p.pitch, zoom: 1, view: 'perspective' });
  const randomInt = (min, max) => {
    const integer = crypto.getRandomValues(new Uint32Array(1))[0];
    return min + Math.floor(integer / 4294967296 * (max - min + 1));
  };
  const canvas = $('terrain-canvas'), viewport = $('viewport'), dialog = $('studio-dialog');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const storeKey = 'strata.terrain-collection.v1';
  let config = settingsFor(presets[0]), camera = cameraFor(presets[0]);
  let render = 'wireframe', sceneName = presets[0].name, rotating = false;
  let mesh = makeMesh(config), morph = null, frameId = 0, geometryDirty = false, shouldMorph = false;
  let lastTick = 0, expanded = false, anchor = null, dialogTrigger = null, toastTimer = 0;
  let storageAvailable = true, saved = [];
  const previews = new Map();
  const pointerMap = new Map();

  function validConfig(c) {
    return c && presets.some(p => p.id === c.id) && Number.isInteger(c.seed) && c.seed >= 0 && c.seed <= 999999
      && Number.isInteger(c.elevation) && c.elevation >= 10 && c.elevation <= 100
      && Number.isInteger(c.roughness) && c.roughness >= 0 && c.roughness <= 100
      && Number.isInteger(c.frequency) && c.frequency >= 40 && c.frequency <= 300;
  }
  function validCamera(c) {
    return c && Number.isFinite(c.yaw) && Number.isFinite(c.pitch) && c.pitch >= .12 && c.pitch <= 1.36
      && Number.isFinite(c.zoom) && c.zoom >= .55 && c.zoom <= 2.5 && ['plan', 'perspective'].includes(c.view);
  }
  try {
    const raw = JSON.parse(localStorage.getItem(storeKey) || '[]');
    if (Array.isArray(raw)) saved = raw.filter(s => s && typeof s.id === 'string' && /^[a-z0-9]+$/.test(s.id)
      && typeof s.name === 'string' && s.name.trim() && s.name.length <= 48 && validConfig(s.config)
      && validCamera(s.camera) && ['wireframe', 'solid'].includes(s.render)).slice(0, 48);
    localStorage.setItem('strata.storage-check', '1');
    localStorage.removeItem('strata.storage-check');
  } catch { storageAvailable = false; }

  function persist() {
    try { localStorage.setItem(storeKey, JSON.stringify(saved)); storageAvailable = true; }
    catch { storageAvailable = false; }
    $('collection-count').textContent = String(saved.length).padStart(2, '0');
  }

  function notify(message) {
    clearTimeout(toastTimer);
    const box = $('notification');
    box.textContent = message;
    box.classList.add('visible');
    toastTimer = setTimeout(() => { box.classList.remove('visible'); }, 3200);
  }

  function queueFrame() {
    if (!frameId && !document.hidden) frameId = requestAnimationFrame(tick);
  }

  function rebuild(animate = false) {
    geometryDirty = true;
    shouldMorph = animate && !motion.matches;
    queueFrame();
  }

  function updateGeometry(now) {
    if (!geometryDirty) return;
    const next = makeMesh(config);
    if (shouldMorph) {
      morph = { from: mesh.h.slice(), to: next, start: now };
      mesh = { ...next, h: mesh.h.slice(), lighting: next.lighting.slice() };
    } else { mesh = next; morph = null; }
    geometryDirty = false;
    shouldMorph = false;
  }

  function actualCamera() {
    return { ...camera, pitch: camera.view === 'plan' ? Math.PI / 2 : camera.pitch };
  }

  function orientGizmo() {
    const gizmo = document.querySelector('.axis-gizmo');
    const lines = gizmo.querySelectorAll('path'), labels = gizmo.querySelectorAll('text');
    const c = actualCamera(), co = Math.cos(c.yaw), si = Math.sin(c.yaw), sp = Math.sin(c.pitch);
    const ends = [[29, 34 - Math.cos(c.pitch) * 26], [29 + co * 24, 34 + si * sp * 24], [29 - si * 24, 34 + co * sp * 24]];
    ends.forEach(([x, y], i) => {
      lines[i].setAttribute('d', `M29 34L${x} ${y}`);
      labels[i].setAttribute('x', clamp(x + (x < 28 ? -6 : 2), 1, 57));
      labels[i].setAttribute('y', clamp(y + (i === 0 ? -2 : 6), 6, 54));
    });
  }

  function tick(now) {
    frameId = 0;
    const running = rotating && !dialog.open && !document.hidden && !motion.matches;
    if (running && now - lastTick < 32 && !geometryDirty) { queueFrame(); return; }
    updateGeometry(now);
    if (morph) {
      const t = clamp((now - morph.start) / 380, 0, 1), eased = t * t * (3 - 2 * t);
      for (let i = 0; i < mesh.h.length; i++) mesh.h[i] = morph.from[i] + (morph.to.h[i] - morph.from[i]) * eased;
      lightMesh(mesh);
      if (t === 1) { mesh = morph.to; morph = null; }
    }
    if (running) camera.yaw += Math.min((now - lastTick) / 1000, .06) * .14;
    const inMotion = running || pointerMap.size > 0 || Boolean(morph);
    const result = draw(canvas, mesh, { ...actualCamera(), render, dpr: inMotion ? 1 : undefined });
    if (result) {
      const meters = 43 / result.scale * 200;
      const rounded = Math.max(5, Math.round(meters / 5) * 5);
      $('scale-label').textContent = `${rounded} m`;
      document.querySelector('.scale-mark').style.width = `${rounded / 200 * result.scale}px`;
    }
    orientGizmo();
    lastTick = now;
    if (morph || running) queueFrame();
  }

  function setRotation(value) {
    rotating = Boolean(value && !motion.matches);
    $('auto-rotate').setAttribute('aria-checked', String(rotating));
    $('auto-rotate').disabled = motion.matches;
    $('auto-rotate').title = motion.matches ? 'Automatic motion is off for your reduced-motion preference' : 'Slowly orbit the landscape';
    queueFrame();
  }

  function syncUI() {
    const p = presetFor(config.id);
    $('terrain-name').textContent = sceneName;
    $('figure-number').textContent = `FIG. ${String(presets.indexOf(p) + 1).padStart(3, '0')}`;
    $('seed').value = pad(config.seed);
    ['elevation', 'roughness', 'frequency'].forEach(key => {
      const input = $(key), value = config[key];
      input.value = value;
      input.style.setProperty('--fill', `${(value - +input.min) / (+input.max - +input.min) * 100}%`);
      $(key + '-value').value = (value / 100).toFixed(2);
      input.setAttribute('aria-valuetext', (value / 100).toFixed(2));
    });
    document.querySelectorAll('[data-render]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.render === render)));
    document.querySelectorAll('[data-preset]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.preset === config.id)));
    $('view-label').textContent = camera.view === 'plan' ? 'Plan view' : 'Perspective';
    $('collection-count').textContent = String(saved.length).padStart(2, '0');
    canvas.setAttribute('aria-label', `${sceneName}, ${render} ${camera.view === 'plan' ? 'top view' : 'perspective'}. ${p.description} Seed ${pad(config.seed)}. Elevation ${(config.elevation / 100).toFixed(2)}, roughness ${(config.roughness / 100).toFixed(2)}, frequency ${(config.frequency / 100).toFixed(2)}.`);
  }

  function swapPreset(p, announce = true) {
    config = settingsFor(p); camera = cameraFor(p); sceneName = p.name;
    syncUI(); rebuild(true);
    if (announce) notify(`${p.name} loaded.`);
  }

  function buildPresets() {
    const grid = $('preset-grid');
    presets.forEach((p, i) => {
      const button = document.createElement('button');
      button.className = 'preset-button'; button.dataset.preset = p.id;
      button.setAttribute('aria-label', `Load ${p.name} preset`);
      button.setAttribute('aria-pressed', String(i === 0));
      button.innerHTML = `<canvas aria-hidden="true"></canvas><span class="preset-number">0${i + 1}</span><span class="preset-selected" aria-hidden="true">${icon('check')}</span><span class="preset-caption"><strong>${p.name}</strong>${icon('up-right')}</span>`;
      button.addEventListener('click', () => swapPreset(p));
      grid.appendChild(button);
      previews.set(p.id, { canvas: button.querySelector('canvas'), mesh: makeMesh(settingsFor(p), 73, 47), preset: p });
    });
  }

  function drawPreviews() {
    previews.forEach(p => draw(p.canvas, p.mesh, { mini: true, yaw: p.preset.yaw, pitch: p.preset.pitch - .10, render: 'wireframe' }));
  }

  function openDialog(kicker, body, focusTarget) {
    if (!dialog.open) dialogTrigger = document.activeElement;
    $('dialog-kicker').textContent = `STRATA / ${kicker}`;
    $('dialog-content').innerHTML = body;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    const focusEl = focusTarget ? dialog.querySelector(focusTarget) : $('dialog-title');
    if (focusEl) {
      if (focusEl.tagName === 'H2') focusEl.setAttribute('tabindex', '-1');
      focusEl.focus({ preventScroll: true });
    }
  }

  function closeDialog() { if (dialog.open) dialog.close(); }
  $('close-dialog').addEventListener('click', closeDialog);
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog();
  });
  dialog.addEventListener('close', () => {
    if (dialogTrigger?.isConnected) dialogTrigger.focus({ preventScroll: true });
    lastTick = performance.now(); queueFrame();
  });

  $('open-guide').addEventListener('click', () => {
    openDialog('FIELD GUIDE', `<h2 id="dialog-title">A field guide to Strata.</h2><p class="dialog-description">Four landforms. One deterministic engine. Every landscape is drawn from mathematics, right here on your device.</p>
      <dl class="guide-list"><div><dt>01 / Choose a landform</dt><dd>Start with a terrain preset. Each uses a different height function: fractured summits, folded dunes, a volcanic rim, or rolling hills.</dd></div>
      <div><dt>02 / Shape the surface</dt><dd>Elevation sets the relief. Roughness breaks up the surface. Frequency changes the scale of its details. The same preset, seed, and parameters always produce the same geometry.</dd></div>
      <div><dt>03 / Find your viewpoint</dt><dd>Drag to orbit and scroll to zoom. On touch screens, drag with one finger or pinch with two. Open the view menu for precise camera controls.</dd></div>
      <div><dt>04 / Keep your landscape</dt><dd>The bookmark saves geometry settings and viewpoint to your local collection. Export a print-ready PNG or a triangulated OBJ surface for a 3D application.</dd></div></dl>
      <div class="keyboard-reference"><span>With the viewport focused</span><span><kbd>Tab</kbd> to focus</span><span>Orbit / tilt</span><span><kbd>&larr;</kbd> <kbd>&rarr;</kbd> <kbd>&uarr;</kbd> <kbd>&darr;</kbd></span><span>Zoom in / out</span><span><kbd>+</kbd> <kbd>-</kbd></span><span>Reset camera</span><span><kbd>0</kbd></span><span>Close dialog or expanded view</span><span><kbd>Esc</kbd></span></div>
      <p class="storage-note">No accounts, network requests, or external assets. Automatic rotation is opt-in and is disabled when reduced motion is requested.</p>`);
  });

  function saveDialog() {
    if (saved.length >= 48) { collectionDialog(); notify('Your collection is full. Remove a terrain before saving another.'); return; }
    openDialog('COLLECTION', `<h2 id="dialog-title">Save terrain</h2><p class="dialog-description">Keep this landscape, its parameters, and its exact viewpoint in your collection.</p>
      <form id="save-form" novalidate><label class="form-label" for="save-name">Landscape name</label><input class="name-input" id="save-name" type="text" required maxlength="48" autocomplete="off" aria-describedby="save-error" value="${escapeText(sceneName)}"><p class="form-error" id="save-error" role="alert" hidden></p><p class="form-note">${storageAvailable ? 'Stored in this browser, on this device.' : 'Persistent storage is unavailable. This save will last for this session only.'}</p><div class="dialog-actions"><button type="button" class="button secondary" id="save-cancel">Cancel</button><button class="button primary" type="submit">${icon('bookmark')}Save terrain</button></div></form>`, '#save-name');
    $('save-name').select();
    $('save-name').addEventListener('input', () => { $('save-name').removeAttribute('aria-invalid'); $('save-error').hidden = true; });
    $('save-cancel').addEventListener('click', closeDialog);
    $('save-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('save-name').value.trim();
      if (!name) {
        $('save-error').hidden = false; $('save-error').textContent = 'Give this landscape a name before saving.';
        $('save-name').setAttribute('aria-invalid', 'true'); $('save-name').focus(); return;
      }
      saved.unshift({ id: Date.now().toString(36) + randomInt(1000, 9999), name, config: { ...config }, camera: { ...camera }, render });
      persist(); closeDialog(); notify(storageAvailable ? `Saved "${name}" to your collection.` : `Saved "${name}" for this session only.`);
    });
  }

  function collectionDialog() {
    const list = saved.length ? `<div class="collection-list">${saved.map(s => `<div class="collection-item"><button class="load-saved" data-load="${s.id}" aria-label="Load ${escapeText(s.name)}"><canvas aria-hidden="true"></canvas><span class="save-copy"><strong>${escapeText(s.name)}</strong><small>${presetFor(s.config.id).name.toUpperCase()} / ${pad(s.config.seed)}</small></span></button><button class="icon-button" data-remove="${s.id}" aria-label="Delete ${escapeText(s.name)}">${icon('trash')}</button></div>`).join('')}</div>`
      : `<div class="empty-collection">${icon('stack')}<h3>Your collection starts here.</h3><p>Bookmark a terrain to keep its seed, surface, and point of view.</p></div>`;
    openDialog('COLLECTION', `<h2 id="dialog-title">Saved terrains</h2><p class="dialog-description">Your personal field archive, kept on this device.</p>${list}
      <div class="dialog-actions spread"><span class="minor">${String(saved.length).padStart(2, '0')} / 48 SAVED</span><button class="button primary" id="collection-save" ${saved.length >= 48 ? 'disabled' : ''}>${icon('plus')}Save current terrain</button></div>${storageAvailable ? '' : '<p class="storage-note">Storage is unavailable. These terrains are kept only for this session.</p>'}`);
    $('collection-save').addEventListener('click', saveDialog);
    dialog.querySelectorAll('[data-load]').forEach(button => {
      const s = saved.find(item => item.id === button.dataset.load);
      draw(button.querySelector('canvas'), makeMesh(s.config, 39, 27), { ...s.camera, pitch: s.camera.view === 'plan' ? Math.PI / 2 : s.camera.pitch, mini: true, zoom: 1, render: s.render });
      button.addEventListener('click', () => {
        config = { ...s.config }; camera = { ...s.camera }; render = s.render; sceneName = s.name;
        setRotation(false); syncUI(); rebuild(true); closeDialog(); notify(`Loaded "${s.name}".`);
      });
    });
    dialog.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => {
      const s = saved.find(item => item.id === button.dataset.remove);
      openDialog('COLLECTION', `<h2 id="dialog-title">Delete terrain?</h2><p class="dialog-description">Remove &ldquo;${escapeText(s.name)}&rdquo; from this collection? Your current workspace and exported files will not change.</p><div class="dialog-actions"><button class="button secondary" id="keep-saved">Keep terrain</button><button class="button primary" id="confirm-remove">Delete terrain</button></div>`, '#keep-saved');
      $('keep-saved').addEventListener('click', collectionDialog);
      $('confirm-remove').addEventListener('click', () => { saved = saved.filter(item => item.id !== s.id); persist(); collectionDialog(); notify('Terrain removed from collection.'); });
    }));
  }
  $('save-terrain').addEventListener('click', saveDialog);
  $('open-collection').addEventListener('click', collectionDialog);

  function download(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  $('open-export').addEventListener('click', () => {
    const filename = `strata-${config.id}-${pad(config.seed)}`;
    openDialog('EXPORT', `<h2 id="dialog-title">Export terrain</h2><p class="dialog-description">Take your landscape out of the studio.</p><form id="export-form"><div class="file-options" role="radiogroup" aria-label="Export file format">
      <label class="file-option">${icon('image')}<span class="option-copy"><strong>Landscape print</strong><small>PNG image &middot; 2400 &times; 1600 pixels</small></span><input type="radio" name="format" value="png" checked aria-label="PNG landscape print"></label>
      <label class="file-option">${icon('cube')}<span class="option-copy"><strong>3D terrain mesh</strong><small>Wavefront OBJ &middot; ${((mesh.nx - 1) * (mesh.nz - 1) * 2).toLocaleString('en-US')} triangles</small></span><input type="radio" name="format" value="obj" aria-label="OBJ terrain mesh"></label></div>
      <div class="dialog-actions spread"><span class="export-filename" id="export-filename">${filename}.png</span><button class="button primary" id="download-file" type="submit">${icon('download')}Download</button></div></form>`);
    const form = $('export-form');
    form.addEventListener('change', () => { $('export-filename').textContent = `${filename}.${new FormData(form).get('format')}`; });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const format = new FormData(form).get('format'), button = $('download-file');
      button.disabled = true; button.textContent = 'Preparing file...';
      try {
        updateGeometry(performance.now());
        const finalMesh = morph ? morph.to : mesh;
        let blob;
        if (format === 'obj') blob = new Blob([obj(finalMesh, config)], { type: 'text/plain;charset=utf-8' });
        else {
          const print = document.createElement('canvas');
          draw(print, finalMesh, { ...actualCamera(), render, width: 1200, height: 800, dpr: 2, background: '#131313' });
          const ctx = print.getContext('2d');
          ctx.fillStyle = '#d2d2d2'; ctx.font = '500 14px Arial, sans-serif'; ctx.fillText('STRATA', 31, 35);
          ctx.fillStyle = '#aaa'; ctx.font = '10px monospace'; ctx.fillText('GENERATIVE LANDSCAPE STUDY', 31, 53);
          ctx.fillStyle = '#e2e2e2'; ctx.font = '24px Arial, sans-serif'; ctx.fillText(sceneName, 31, 764, 780);
          ctx.textAlign = 'right'; ctx.fillStyle = '#aaa'; ctx.font = '11px monospace'; ctx.fillText(`SEED ${pad(config.seed)} / ${render.toUpperCase()}`, 1169, 764);
          blob = await new Promise(resolve => print.toBlob(resolve, 'image/png'));
        }
        if (!blob) throw new Error('The browser did not create the file.');
        download(blob, `${filename}.${format}`); closeDialog(); notify(`${String(format).toUpperCase()} export prepared.`);
      } catch {
        button.disabled = false; button.innerHTML = `${icon('download')}Try again`;
        const error = document.createElement('p'); error.className = 'form-note'; error.setAttribute('role', 'alert'); error.textContent = 'The file could not be created. Try the other format or export again.'; form.append(error);
      }
    });
  });

  function cameraDialog() {
    openDialog('VIEWPORT', `<h2 id="dialog-title">Camera controls</h2><p class="dialog-description">Set a precise point of view. Your terrain geometry stays unchanged.</p><div class="segmented camera-choices" role="group" aria-label="Projection"><button data-view="perspective">Perspective</button><button data-view="plan">Plan view</button></div>
      ${[['yaw', 'Orbit'], ['pitch', 'Tilt'], ['zoom', 'Zoom']].map(([key, label]) => `<div class="camera-controls"><span>${label}</span><div class="stepper"><button data-step="${key}" data-dir="-1" aria-label="Decrease ${label.toLowerCase()}">&minus;</button><output id="camera-${key}" aria-label="${label}"></output><button data-step="${key}" data-dir="1" aria-label="Increase ${label.toLowerCase()}">+</button></div></div>`).join('')}
      <div class="dialog-actions"><button class="button secondary" id="camera-reset">${icon('reset')}Reset view</button><button class="button primary" id="camera-done">Apply view</button></div>`);
    function refresh() {
      $('camera-yaw').textContent = `${Math.round(camera.yaw * 180 / Math.PI) % 360}\u00b0`;
      $('camera-pitch').textContent = `${camera.view === 'plan' ? 90 : Math.round(camera.pitch * 180 / Math.PI)}\u00b0`;
      $('camera-zoom').textContent = `${Math.round(camera.zoom * 100)}%`;
      dialog.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === camera.view)));
      dialog.querySelectorAll('[data-step="pitch"]').forEach(b => b.disabled = camera.view === 'plan');
      syncUI(); queueFrame();
    }
    dialog.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { camera.view = b.dataset.view; refresh(); }));
    dialog.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
      const dir = +b.dataset.dir;
      if (b.dataset.step === 'yaw') camera.yaw += dir * Math.PI / 12;
      if (b.dataset.step === 'pitch') camera.pitch = clamp(camera.pitch + dir * Math.PI / 36, .12, 1.36);
      if (b.dataset.step === 'zoom') camera.zoom = clamp(camera.zoom + dir * .1, .55, 2.5);
      refresh();
    }));
    $('camera-reset').addEventListener('click', () => { camera = cameraFor(presetFor(config.id)); refresh(); });
    $('camera-done').addEventListener('click', closeDialog);
    refresh();
  }
  $('open-camera').addEventListener('click', cameraDialog);

  ['elevation', 'roughness', 'frequency'].forEach(key => $(key).addEventListener('input', e => {
    config[key] = +e.target.value; syncUI(); rebuild();
  }));
  function commitSeed() {
    const value = $('seed').value.trim();
    if (!/^\d{1,6}$/.test(value)) { $('seed').value = pad(config.seed); notify('Use a seed from 0 to 999999. The previous seed was restored.'); return; }
    if (+value !== config.seed) { config.seed = +value; rebuild(true); }
    syncUI();
  }
  $('seed').addEventListener('change', commitSeed);
  $('seed').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commitSeed(); $('seed').select(); } });
  $('shuffle-seed').addEventListener('click', () => { config.seed = (config.seed + randomInt(1, 999999)) % 1000000; syncUI(); rebuild(true); notify(`New seed: ${pad(config.seed)}.`); });
  $('randomize').addEventListener('click', () => {
    const p = presets[randomInt(0, presets.length - 1)];
    config = { id: p.id, seed: randomInt(0, 999999), elevation: randomInt(47, 99), roughness: randomInt(16, 91), frequency: randomInt(70, 240) };
    camera = cameraFor(p); sceneName = p.name; syncUI(); rebuild(true); notify(`${p.name} created from seed ${pad(config.seed)}.`);
  });
  $('reset-parameters').addEventListener('click', () => { config = settingsFor(presetFor(config.id)); sceneName = presetFor(config.id).name; syncUI(); rebuild(true); notify('Preset parameters restored.'); });
  document.querySelectorAll('[data-render]').forEach(b => b.addEventListener('click', () => { render = b.dataset.render; syncUI(); queueFrame(); }));
  $('auto-rotate').addEventListener('click', () => setRotation(!rotating));
  motion.addEventListener('change', () => { setRotation(false); if (motion.matches && morph) { mesh = morph.to; morph = null; } queueFrame(); });

  function toggleExpanded() {
    expanded = !expanded;
    if (expanded) {
      anchor = document.createComment('viewport position');
      viewport.replaceWith(anchor); document.body.appendChild(viewport);
      viewport.setAttribute('role', 'dialog'); viewport.setAttribute('aria-modal', 'true'); viewport.setAttribute('aria-label', 'Expanded terrain viewport');
    } else {
      anchor.replaceWith(viewport); anchor = null;
      viewport.removeAttribute('role'); viewport.removeAttribute('aria-modal'); viewport.removeAttribute('aria-label');
    }
    document.querySelectorAll('.site-header, main, .site-footer, .skip-link').forEach(el => el.inert = expanded);
    viewport.classList.toggle('expanded', expanded); document.body.classList.toggle('viewport-expanded', expanded);
    $('expand-viewport').setAttribute('aria-pressed', String(expanded));
    $('expand-viewport').setAttribute('aria-label', expanded ? 'Exit expanded viewport' : 'Expand viewport');
    $('expand-viewport').title = expanded ? 'Exit expanded viewport (Esc)' : 'Expand viewport';
    $('expand-icon').setAttribute('href', expanded ? '#i-collapse' : '#i-expand');
    $('expand-viewport').focus({ preventScroll: true }); queueFrame();
  }
  $('expand-viewport').addEventListener('click', toggleExpanded);
  document.addEventListener('keydown', e => {
    if (!expanded || dialog.open) return;
    if (e.key === 'Escape') { e.preventDefault(); toggleExpanded(); }
    if (e.key === 'Tab') {
      const focusable = [...viewport.querySelectorAll('button, [tabindex="0"]')];
      if (e.shiftKey && document.activeElement === focusable[0]) { e.preventDefault(); focusable.at(-1).focus(); }
      if (!e.shiftKey && document.activeElement === focusable.at(-1)) { e.preventDefault(); focusable[0].focus(); }
    }
  });

  function pointDistance() {
    const [a, b] = [...pointerMap.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    canvas.focus({ preventScroll: true }); canvas.setPointerCapture(e.pointerId);
    pointerMap.set(e.pointerId, { x: e.clientX, y: e.clientY }); setRotation(false);
  });
  canvas.addEventListener('pointermove', e => {
    const prev = pointerMap.get(e.pointerId); if (!prev) return;
    const prevDist = pointDistance();
    pointerMap.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointerMap.size === 2 && prevDist > 2) camera.zoom = clamp(camera.zoom * pointDistance() / prevDist, .55, 2.5);
    else if (pointerMap.size === 1) {
      camera.yaw -= (e.clientX - prev.x) * .007;
      if (camera.view !== 'plan') camera.pitch = clamp(camera.pitch + (e.clientY - prev.y) * .006, .12, 1.36);
    }
    queueFrame();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => canvas.addEventListener(type, e => { pointerMap.delete(e.pointerId); queueFrame(); }));
  canvas.addEventListener('wheel', e => {
    e.preventDefault(); const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 180 : 1);
    camera.zoom = clamp(camera.zoom * Math.exp(-delta * .0012), .55, 2.5); queueFrame();
  }, { passive: false });
  canvas.addEventListener('keydown', e => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_', '0'].includes(e.key)) return;
    e.preventDefault(); setRotation(false);
    if (e.key === 'ArrowLeft') camera.yaw -= .085;
    if (e.key === 'ArrowRight') camera.yaw += .085;
    if (e.key === 'ArrowUp' && camera.view !== 'plan') camera.pitch = clamp(camera.pitch + .055, .12, 1.36);
    if (e.key === 'ArrowDown' && camera.view !== 'plan') camera.pitch = clamp(camera.pitch - .055, .12, 1.36);
    if (['+', '='].includes(e.key)) camera.zoom = clamp(camera.zoom + .1, .55, 2.5);
    if (['-', '_'].includes(e.key)) camera.zoom = clamp(camera.zoom - .1, .55, 2.5);
    if (e.key === '0') { camera = cameraFor(presetFor(config.id)); syncUI(); }
    queueFrame();
  });

  buildPresets(); syncUI(); setRotation(false);
  const observer = new ResizeObserver(() => queueFrame());
  observer.observe($('terrain-stage'));
  let previewFrame = 0;
  const presetObserver = new ResizeObserver(() => {
    if (!previewFrame) previewFrame = requestAnimationFrame(() => { previewFrame = 0; drawPreviews(); });
  });
  presetObserver.observe($('preset-grid'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; }
    else { lastTick = performance.now(); queueFrame(); }
  });
  if (window.matchMedia('(pointer: coarse)').matches) document.querySelector('.mouse-instruction').textContent = 'Drag to orbit / pinch to zoom';
  queueFrame();
})();