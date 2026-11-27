/* ============================================================
   Vectra Studio — UI: panels, toolbars, layers, modals, toasts
   ============================================================ */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const state = App.state;
  const docApi = App.docApi;
  const hist = App.hist;
  const S = App.S;
  const R = App.R;
  const U = App.U;
  let modalOpen = false;

  /* ---------------- icons ---------------- */
  const IC = {
    select: '<path d="M7 3 L17.5 13.2 L12.4 13.8 L15.2 20 L12.8 21 L10 14.8 L7 17.5 Z" fill="currentColor" stroke="none"/>',
    node: '<path d="M5.5 16.5 C9 7.5 15 7.5 18.5 16.5"/><rect x="3.5" y="14.5" width="4" height="4" fill="currentColor" stroke="none"/><rect x="10" y="5" width="4" height="4" fill="currentColor" stroke="none"/><rect x="16.5" y="14.5" width="4" height="4" fill="currentColor" stroke="none"/>',
    pan: '<path d="M12 4v16M4 12h16"/><path d="M12 4l-2.2 2.2M12 4l2.2 2.2M12 20l-2.2-2.2M12 20l2.2-2.2M4 12l2.2-2.2M4 12l2.2 2.2M20 12l-2.2-2.2M20 12l-2.2 2.2"/>',
    rect: '<rect x="4" y="6" width="16" height="12" rx="1.5"/>',
    ellipse: '<ellipse cx="12" cy="12" rx="8" ry="6.5"/>',
    line: '<path d="M5 19 L19 5"/>',
    polygon: '<path d="M12 4 L20 10 L17 19 L7 19 L4 10 Z"/>',
    pen: '<path d="M5 19 L6.5 13.5 L14.5 5.5 L18.5 9.5 L10.5 17.5 Z"/><path d="M13 7 L17 11"/>',
    pencil: '<path d="M5 19 L6 15 L15.5 5.5 L18.5 8.5 L9 18 Z"/><path d="M5 19 L6 15 L8 17 Z" fill="currentColor" stroke="none"/>',
    new: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M12 11v6M9 14h6"/>',
    open: '<path d="M3 6h6l2 2h10v11H3z"/><path d="M3 6v-2h7l2 2"/>',
    save: '<path d="M12 4v10M8 10l4 4 4-4"/><path d="M4 16v4h16v-4"/>',
    image: '<rect x="4" y="5" width="16" height="14" rx="1.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-5 4 4 3-3 4 4"/>',
    undo: '<path d="M8 6 L4 10 L8 14"/><path d="M4 10 H14 a4.5 4.5 0 0 1 0 9 H10"/>',
    redo: '<path d="M16 6 L20 10 L16 14"/><path d="M20 10 H10 a4.5 4.5 0 0 0 0 9 H14"/>',
    zoomin: '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5 L20 20"/><path d="M8.5 11h5M11 8.5v5"/>',
    zoomout: '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5 L20 20"/><path d="M8.5 11h5"/>',
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    grid: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M9.3 4v16M14.6 4v16M4 9.3h16M4 14.6h16"/>',
    panel: '<rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M14 5v14"/>',
    eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/>',
    eyeoff: '<path d="M2.5 12s3.5-6 9.5-6c1.8 0 3.4.6 4.7 1.4M21.5 12s-3.5 6-9.5 6c-1.8 0-3.4-.6-4.7-1.4"/><path d="M4 4l16 16"/>',
    lock: '<rect x="6" y="11" width="12" height="8" rx="1.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
    unlock: '<rect x="6" y="11" width="12" height="8" rx="1.5"/><path d="M8.5 11V8a3.5 3.5 0 0 1 6.8-1.2"/>',
    up: '<path d="M6 14l6-5 6 5"/>',
    down: '<path d="M6 10l6 5 6-5"/>',
    zfront: '<rect x="4" y="4" width="9" height="9" rx="1.5"/><rect x="8" y="8" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>',
    zback: '<rect x="11" y="11" width="9" height="9" rx="1.5"/><rect x="4" y="4" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>',
    zforward: '<rect x="4" y="10" width="10" height="10" rx="1.5"/><path d="M17 13V6M14.5 8.5L17 6l2.5 2.5"/>',
    zbackward: '<rect x="10" y="4" width="10" height="10" rx="1.5"/><path d="M7 11v7M4.5 15.5L7 18l2.5-2.5"/>',
    al_l: '<path d="M5 4v16"/><rect x="8" y="6" width="11" height="5" rx="1" fill="currentColor" stroke="none" opacity=".85"/><rect x="8" y="14" width="7" height="5" rx="1" fill="currentColor" stroke="none" opacity=".45"/>',
    al_cx: '<path d="M12 4v16"/><rect x="6" y="6" width="12" height="5" rx="1" fill="currentColor" stroke="none" opacity=".85"/><rect x="8" y="14" width="8" height="5" rx="1" fill="currentColor" stroke="none" opacity=".45"/>',
    al_r: '<path d="M19 4v16"/><rect x="5" y="6" width="11" height="5" rx="1" fill="currentColor" stroke="none" opacity=".85"/><rect x="9" y="14" width="7" height="5" rx="1" fill="currentColor" stroke="none" opacity=".45"/>',
    al_t: '<path d="M4 5h16"/><rect x="6" y="8" width="5" height="11" rx="1" fill="currentColor" stroke="none" opacity=".85"/><rect x="14" y="8" width="5" height="7" rx="1" fill="currentColor" stroke="none" opacity=".45"/>',
    al_cy: '<path d="M4 12h16"/><rect x="6" y="6" width="5" height="12" rx="1" fill="currentColor" stroke="none" opacity=".85"/><rect x="14" y="8" width="5" height="8" rx="1" fill="currentColor" stroke="none" opacity=".45"/>',
    al_b: '<path d="M4 19h16"/><rect x="6" y="5" width="5" height="11" rx="1" fill="currentColor" stroke="none" opacity=".85"/><rect x="14" y="9" width="5" height="7" rx="1" fill="currentColor" stroke="none" opacity=".45"/>',
    dist_h: '<rect x="3" y="9" width="5" height="6" rx="1"/><rect x="10" y="9" width="5" height="6" rx="1" opacity=".45"/><rect x="17" y="9" width="5" height="6" rx="1"/>',
    dist_v: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="9" y="10" width="6" height="5" rx="1" opacity=".45"/><rect x="9" y="17" width="6" height="5" rx="1"/>'
  };
  const icon = n => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>';

  /* ---------------- toasts ---------------- */
  function toast(msg, kind) {
    const c = $('toasts');
    const d = document.createElement('div');
    d.className = 'toast' + (kind ? ' ' + kind : '');
    d.textContent = msg;
    c.appendChild(d);
    while (c.children.length > 4) c.firstChild.remove();
    setTimeout(() => { d.classList.add('leaving'); setTimeout(() => d.remove(), 300); }, 3000);
  }

  /* ---------------- modals ---------------- */
  function openModal(build) {
    const root = $('modalRoot');
    root.innerHTML = '';
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    const m = document.createElement('div');
    m.className = 'modal';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    back.appendChild(m);
    root.appendChild(back);
    modalOpen = true;
    const api = {
      modal: m,
      close() {
        root.innerHTML = '';
        modalOpen = false;
        window.removeEventListener('keydown', onEsc, true);
      }
    };
    function onEsc(ev) {
      if (ev.key === 'Escape') { ev.stopPropagation(); ev.preventDefault(); api.close(); }
    }
    window.addEventListener('keydown', onEsc, true);
    back.addEventListener('pointerdown', e => { if (e.target === back) api.close(); });
    build(api);
    const f = m.querySelector('button:not([disabled])');
    if (f) f.focus();
    return api;
  }

  function confirm(title, msg, okLabel) {
    return new Promise(resolve => {
      openModal(api => {
        m2(api.modal, title, msg, okLabel || 'OK', ok => { api.close(); resolve(ok); });
      });
    });
    function m2(modal, t, msg, okLabel2, done) {
      const h = document.createElement('h2'); h.textContent = t;
      const p = document.createElement('p'); p.className = 'msub'; p.textContent = msg;
      const foot = document.createElement('div'); foot.className = 'mfoot';
      const cancel = document.createElement('button'); cancel.className = 'mbtn'; cancel.textContent = 'Cancel';
      const ok = document.createElement('button'); ok.className = 'mbtn primary'; ok.textContent = okLabel2;
      cancel.addEventListener('click', () => done(false));
      ok.addEventListener('click', () => done(true));
      foot.append(cancel, ok);
      modal.append(h, p, foot);
      ok.focus();
    }
  }

  function helpModal() {
    openModal(api => {
      const rows = [
        ['V · H · R · O · L · G · P · B', 'Tools: select, pan, rectangle, ellipse, line, polygon, pen, pencil'],
        ['N', 'Node editing on the selected shape'],
        ['Ctrl+Z / Ctrl+Shift+Z', 'Undo / redo'],
        ['Ctrl+C · Ctrl+V · Ctrl+D', 'Copy · paste · duplicate'],
        ['Ctrl+G / Ctrl+Shift+G', 'Group / ungroup'],
        ['Delete', 'Delete selection, or the active node while node editing'],
        ['Arrow keys', 'Nudge by 1 px (Shift = 10 px)'],
        ['[ / ]', 'Send backward / bring forward (Shift = all the way)'],
        ['Ctrl+A', 'Select all'],
        ['Alt+drag', 'Drag a copy of the selection'],
        ['Escape', 'Cancel action · deselect · exit node editing'],
        ['Enter', 'Close the pen path · toggle node editing'],
        ['Space + drag · middle-drag', 'Pan the canvas'],
        ['Scroll · Ctrl+scroll', 'Pan · zoom (two-finger pinch on touch)'],
        ['Ctrl+0 · Ctrl+= · Ctrl+−', 'Zoom 100% · in · out'],
        ['Shift+1 / Shift+2', 'Fit artboard / fit selection'],
        ['Ctrl+S / Ctrl+O', 'Export SVG / open an SVG file'],
        ['?', 'This shortcut list']
      ];
      const h = document.createElement('h2'); h.textContent = 'Keyboard & pointer shortcuts';
      const body = document.createElement('div'); body.className = 'mbody';
      const table = document.createElement('table'); table.className = 'kbd-table';
      for (const [k, d] of rows) {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td'); const kb = document.createElement('kbd'); kb.textContent = k;
        const td2 = document.createElement('td'); td2.textContent = d;
        td1.appendChild(kb); tr.append(td1, td2); table.appendChild(tr);
      }
      body.appendChild(table);
      const foot = document.createElement('div'); foot.className = 'mfoot';
      const close = document.createElement('button'); close.className = 'mbtn primary'; close.textContent = 'Close';
      close.addEventListener('click', api.close);
      foot.appendChild(close);
      api.modal.append(h, body, foot);
    });
  }

  function newModal() {
    openModal(api => {
      const h = document.createElement('h2'); h.textContent = 'New document';
      const p = document.createElement('p'); p.className = 'msub';
      p.textContent = 'The current drawing will be replaced — undo (Ctrl+Z) can bring it back.';
      const body = document.createElement('div'); body.className = 'mbody';
      const blank = document.createElement('button'); blank.className = 'mbtn bigchoice';
      blank.innerHTML = '<strong>Blank document</strong><span>An empty 1080 × 720 artboard</span>';
      blank.addEventListener('click', () => { api.close(); App.F.newDoc('blank'); });
      const sample = document.createElement('button'); sample.className = 'mbtn bigchoice';
      sample.innerHTML = '<strong>Sample artwork</strong><span>The “Harbor morning” demo drawing</span>';
      sample.addEventListener('click', () => { api.close(); App.F.newDoc('sample'); });
      body.append(blank, sample);
      const foot = document.createElement('div'); foot.className = 'mfoot';
      const cancel = document.createElement('button'); cancel.className = 'mbtn'; cancel.textContent = 'Cancel';
      cancel.addEventListener('click', api.close);
      foot.appendChild(cancel);
      api.modal.append(h, p, body, foot);
    });
  }

  /* ---------------- tool rail & topbar ---------------- */
  const TOOLS = [
    { id: 'select', key: 'V', ic: 'select', label: 'Select & transform' },
    { id: 'node', key: 'N', ic: 'node', label: 'Edit nodes (Bézier)' },
    { id: 'hand', key: 'H', ic: 'pan', label: 'Pan view' },
    { sep: true },
    { id: 'rect', key: 'R', ic: 'rect', label: 'Rectangle' },
    { id: 'ellipse', key: 'O', ic: 'ellipse', label: 'Ellipse' },
    { id: 'line', key: 'L', ic: 'line', label: 'Line' },
    { id: 'polygon', key: 'G', ic: 'polygon', label: 'Polygon' },
    { sep: true },
    { id: 'pen', key: 'P', ic: 'pen', label: 'Pen — Bézier paths' },
    { id: 'pencil', key: 'B', ic: 'pencil', label: 'Pencil — freehand' }
  ];

  function buildRail() {
    const rail = $('toolrail');
    rail.innerHTML = '';
    for (const t of TOOLS) {
      if (t.sep) {
        const s = document.createElement('div');
        s.className = 'rail-sep';
        rail.appendChild(s);
        continue;
      }
      const b = document.createElement('button');
      b.className = 'tool-btn';
      b.dataset.tool = t.id;
      b.innerHTML = icon(t.ic);
      b.title = t.label + ' (' + t.key + ')';
      b.setAttribute('aria-label', t.label);
      b.setAttribute('aria-pressed', state.tool === t.id ? 'true' : 'false');
      b.addEventListener('click', () => {
        state.setTool(t.id);
        if (t.id === 'node') {
          const sh = docApi.singleSel();
          if (sh && !state.editing) App.NE.enter(sh.id);
        }
      });
      rail.appendChild(b);
    }
  }

  function refreshRail() {
    document.querySelectorAll('.tool-btn').forEach(b => {
      b.setAttribute('aria-pressed', b.dataset.tool === state.tool ? 'true' : 'false');
    });
  }

  function initTopbar() {
    $('btnNew').innerHTML = icon('new');
    $('btnOpen').innerHTML = icon('open');
    $('btnSaveSvg').innerHTML = icon('save');
    $('btnExportPng').innerHTML = icon('image');
    $('btnUndo').innerHTML = icon('undo');
    $('btnRedo').innerHTML = icon('redo');
    $('btnZoomOut').innerHTML = icon('zoomout');
    $('btnZoomIn').innerHTML = icon('zoomin');
    $('btnGrid').innerHTML = icon('grid');
    $('btnTogglePanel').innerHTML = icon('panel');

    $('btnNew').addEventListener('click', newModal);
    $('btnOpen').addEventListener('click', () => App.F.openDialog());
    $('btnSaveSvg').addEventListener('click', () => App.F.exportSvg());
    $('btnExportPng').addEventListener('click', () => App.F.exportPng());
    $('btnUndo').addEventListener('click', () => hist.undo());
    $('btnRedo').addEventListener('click', () => hist.redo());
    $('btnZoomOut').addEventListener('click', () => R.zoomBy(0.8));
    $('btnZoomIn').addEventListener('click', () => R.zoomBy(1.25));
    $('btnZoomLvl').addEventListener('click', () => R.setZoom(1));
    $('stZoom').addEventListener('click', () => R.setZoom(1));
    $('btnFitPage').addEventListener('click', () => R.fitPage());
    $('btnGrid').addEventListener('click', () => {
      state.grid = !state.grid;
      App.events.emit('grid');
    });
    $('btnTogglePanel').addEventListener('click', () => {
      const p = $('sidepanel');
      p.classList.toggle('hidden');
      $('btnTogglePanel').setAttribute('aria-pressed', p.classList.contains('hidden') ? 'false' : 'true');
    });
    $('btnHelp').addEventListener('click', helpModal);
    $('btnGrid').setAttribute('aria-pressed', state.grid ? 'true' : 'false');
  }

  /* ---------------- numeric helpers ---------------- */
  const numVal = (id, fallback) => {
    const el = $(id);
    const v = parseFloat(el.value);
    return isFinite(v) ? v : fallback;
  };
  function setNum(id, v, disabled) {
    const el = $(id);
    el.disabled = !!disabled;
    if (disabled) { el.value = ''; el.placeholder = '—'; }
    else { el.value = String(Math.round(v * 100) / 100); el.placeholder = ''; }
  }
  const commonNum = vals => {
    if (!vals.length) return null;
    return vals.every(v => Math.abs(v - vals[0]) < 1e-6) ? vals[0] : null;
  };
  const commonStr = vals => {
    if (!vals.length) return null;
    return vals.every(v => v === vals[0]) ? vals[0] : null;
  };

  /* ---------------- properties panel ---------------- */
  function styleRow(rowId, colorId, hexId, noneId, vals, hide) {
    const row = $(rowId);
    row.style.display = hide ? 'none' : '';
    if (hide) return;
    const cv = commonStr(vals);
    const color = $(colorId), hex = $(hexId), none = $(noneId);
    none.setAttribute('aria-pressed', cv === 'none' ? 'true' : 'false');
    const usable = cv && cv !== 'none' && /^#[0-9a-fA-F]{6}$/.test(cv);
    color.disabled = !usable;
    color.value = usable ? cv : '#888888';
    hex.disabled = !cv;
    hex.value = cv && cv !== 'none' ? cv : '';
    hex.placeholder = cv === 'none' ? 'none' : (cv ? '' : 'mixed');
  }

  function refreshProps() {
    const sel = docApi.selShapes();
    const sp = $('shapePanel'), dp = $('docPanel');
    sp.hidden = sel.length === 0;
    dp.hidden = sel.length > 0;
    if (!sel.length) { refreshDocPanel(); return; }

    const single = sel.length === 1 ? sel[0] : null;
    const inName = $('inName');
    inName.disabled = !single;
    inName.value = single ? single.name : '';
    inName.placeholder = single ? '' : sel.length + ' shapes selected';
    $('selType').textContent = single ? S.label(single.type) : sel.length + ' shapes';

    const bb = App.G.unionBB(sel.map(S.worldBBox));
    setNum('inX', bb.x, false);
    setNum('inY', bb.y, false);
    setNum('inW', bb.w, !single);
    setNum('inH', bb.h, !single);
    // groups don't carry their own rotation
    const groupish = sel.some(s => s.type === 'group');
    setNum('inAngle', single ? (single.angle || 0) : 0, !single || (single && single.type === 'group'));
    $('rowAngle').style.opacity = groupish ? '.45' : '';

    const isRect = single && single.type === 'rect';
    $('rowRadius').style.display = isRect ? '' : 'none';
    if (isRect) setNum('inRadius', single.radius || 0, false);
    const isPoly = single && single.type === 'polygon';
    $('rowSides').hidden = !isPoly;
    if (isPoly) setNum('inSides', single.sides || single.pts.length, false);

    // groups don't paint — hide paint controls when the selection is group-only
    const groupsOnly = sel.every(s => s.type === 'group');
    styleRow('rowFill', 'fillColor', 'fillHex', 'fillNone', sel.map(s => s.fill), (single && single.type === 'line') || groupsOnly);
    styleRow('rowStroke', 'strokeColor', 'strokeHex', 'strokeNone', sel.map(s => s.stroke), groupsOnly);

    const sw = commonNum(sel.map(s => s.strokeWidth));
    const swEl = $('inStrokeW');
    ['rowStrokeW', 'rowDash', 'rowOpacity'].forEach(id => { $(id).style.display = groupsOnly ? 'none' : ''; });
    swEl.disabled = groupsOnly || sw === null;
    swEl.value = sw === null ? '' : String(sw);
    const dash = commonStr(sel.map(s => s.dash || ''));
    $('inDash').value = dash === null ? '' : dash;
    $('inDash').disabled = groupsOnly;

    const op = commonNum(sel.map(s => Math.round((s.opacity || 1) * 100)));
    $('inOpacity').value = op === null ? 100 : op;
    $('inOpacityVal').textContent = op === null ? '—' : op + '%';

    // path controls
    const editableTypes = ['rect', 'ellipse', 'line', 'polygon', 'path'];
    const pathLike = sel.every(s => editableTypes.indexOf(s.type) !== -1);
    $('rowPath').style.display = pathLike ? '' : 'none';
    if (pathLike) {
      const canNode = single && editableTypes.indexOf(single.type) !== -1;
      $('btnNodeEdit').disabled = !canNode;
      $('btnNodeEdit').setAttribute('aria-pressed',
        single && state.editing === single.id ? 'true' : 'false');
      $('btnToPath').style.display = single && ['rect', 'ellipse', 'line', 'polygon'].indexOf(single.type) !== -1 ? '' : 'none';
      const closeBtn = $('btnToggleClose');
      closeBtn.style.display = single && single.type === 'path' ? '' : 'none';
      if (single && single.type === 'path') closeBtn.textContent = single.closed ? 'Open path' : 'Close path';
    }

    $('btnGroup').disabled = sel.length < 2;
    $('btnUngroup').disabled = !sel.some(s => s.type === 'group');
    $('alignNote').textContent = sel.length === 1
      ? 'With one shape selected, alignment uses the artboard.'
      : 'Multiple shapes align to their combined bounds.';
  }

  function refreshDocPanel() {
    const d = state.doc;
    $('inTitle').value = d.title || 'Untitled artwork';
    setNum('inDocW', d.w, false);
    setNum('inDocH', d.h, false);
    const bg = /^#[0-9a-fA-F]{6}$/.test(d.bg || '') ? d.bg : '#ffffff';
    $('inDocBg').value = bg;
    $('inDocBgHex').value = bg;
  }

  /* geometry edits from the panel */
  function applyGeom(kind, commit) {
    const sel = docApi.selShapes();
    if (!sel.length) return;
    const bb = App.G.unionBB(sel.map(S.worldBBox));
    if (!bb) return;
    if (kind === 'x') {
      const dx = numVal('inX', bb.x) - bb.x;
      for (const sh of sel) S.translate(sh, dx, 0);
    } else if (kind === 'y') {
      const dy = numVal('inY', bb.y) - bb.y;
      for (const sh of sel) S.translate(sh, 0, dy);
    } else if (kind === 'w' && sel.length === 1) {
      const nw = Math.max(1, numVal('inW', bb.w));
      if (bb.w > 0.01) {
        const sx = nw / bb.w;
        S.scaleGeom(sel[0], sx, 1, bb.x, bb.y + bb.h / 2);
      }
    } else if (kind === 'h' && sel.length === 1) {
      const nh = Math.max(1, numVal('inH', bb.h));
      if (bb.h > 0.01) {
        const sy = nh / bb.h;
        S.scaleGeom(sel[0], 1, sy, bb.x + bb.w / 2, bb.y);
      }
    }
    docApi.docChanged();
    if (commit) hist.push(kind === 'x' || kind === 'y' ? 'Move' : 'Resize');
  }

  function applyAlign(kind) {
    const sel = docApi.selShapes();
    if (!sel.length) return;
    const ref = sel.length === 1
      ? { x: 0, y: 0, w: state.doc.w, h: state.doc.h }
      : App.G.unionBB(sel.map(S.worldBBox));
    for (const sh of sel) {
      const bb = S.worldBBox(sh);
      let dx = 0, dy = 0;
      if (kind === 'l') dx = ref.x - bb.x;
      else if (kind === 'r') dx = ref.x + ref.w - (bb.x + bb.w);
      else if (kind === 'cx') dx = ref.x + ref.w / 2 - (bb.x + bb.w / 2);
      else if (kind === 't') dy = ref.y - bb.y;
      else if (kind === 'b') dy = ref.y + ref.h - (bb.y + bb.h);
      else if (kind === 'cy') dy = ref.y + ref.h / 2 - (bb.y + bb.h / 2);
      S.translate(sh, dx, dy);
    }
    docApi.docChanged();
    hist.push('Align');
  }

  function applyDistribute(axis) {
    const sel = docApi.selShapes();
    if (sel.length < 3) { toast('Select at least three shapes to distribute', 'error'); return; }
    const bbs = sel.map(S.worldBBox);
    const idx = sel.map((_, i) => i);
    idx.sort((a, b) => (axis === 'h' ? bbs[a].x - bbs[b].x : bbs[a].y - bbs[b].y));
    const first = bbs[idx[0]], last = bbs[idx[idx.length - 1]];
    const n = idx.length;
    for (let i = 1; i < n - 1; i++) {
      const k = i / (n - 1);
      const sh = sel[idx[i]];
      const bb = bbs[idx[i]];
      if (axis === 'h') {
        const target = first.x + (last.x - first.x) * k;
        S.translate(sh, target - bb.x, 0);
      } else {
        const target = first.y + (last.y - first.y) * k;
        S.translate(sh, 0, target - bb.y);
      }
    }
    docApi.docChanged();
    hist.push('Distribute');
  }

  /* ---------------- layers panel ---------------- */
  function countAll(list) {
    let n = 0;
    for (const s of list) { n++; if (s.type === 'group') n += countAll(s.children); }
    return n;
  }

  function layerRow(sh, depth) {
    const row = document.createElement('div');
    row.className = 'layer-row' + (docApi.isSel(sh.id) ? ' sel' : '');
    row.setAttribute('role', 'listitem');
    row.style.paddingLeft = (4 + depth * 14) + 'px';

    const eye = document.createElement('button');
    eye.className = 'u-btn' + (sh.visible === false ? ' dim' : '');
    eye.innerHTML = icon(sh.visible === false ? 'eyeoff' : 'eye');
    eye.title = sh.visible === false ? 'Show shape' : 'Hide shape';
    eye.setAttribute('aria-label', eye.title);
    eye.setAttribute('aria-pressed', sh.visible === false ? 'true' : 'false');
    eye.addEventListener('click', () => {
      sh.visible = sh.visible === false;
      docApi.docChanged();
      hist.push('Visibility');
    });

    const name = document.createElement('button');
    name.className = 'lname';
    name.textContent = sh.name || S.label(sh.type);
    name.title = sh.name + ' — double-click to rename';
    name.addEventListener('click', ev => {
      if (ev.shiftKey) {
        const set = new Set(state.sel);
        if (set.has(sh.id)) set.delete(sh.id); else set.add(sh.id);
        docApi.setSel(Array.from(set));
      } else {
        docApi.setSel([sh.id]);
      }
    });
    name.addEventListener('dblclick', () => startRename(row, name, sh));

    const lock = document.createElement('button');
    lock.className = 'u-btn' + (sh.locked ? ' dim' : '');
    lock.innerHTML = icon(sh.locked ? 'lock' : 'unlock');
    lock.title = sh.locked ? 'Unlock shape' : 'Lock shape';
    lock.setAttribute('aria-label', lock.title);
    lock.setAttribute('aria-pressed', sh.locked ? 'true' : 'false');
    lock.addEventListener('click', () => {
      sh.locked = !sh.locked;
      docApi.docChanged();
      hist.push('Lock');
    });

    const up = document.createElement('button');
    up.className = 'u-btn';
    up.innerHTML = icon('up');
    up.title = 'Raise (later in stacking order)';
    up.setAttribute('aria-label', 'Raise layer');
    up.addEventListener('click', () => moveLayer(sh, 1));

    const down = document.createElement('button');
    down.className = 'u-btn';
    down.innerHTML = icon('down');
    down.title = 'Lower (earlier in stacking order)';
    down.setAttribute('aria-label', 'Lower layer');
    down.addEventListener('click', () => moveLayer(sh, -1));

    row.append(eye, name, lock, up, down);
    return row;
  }

  function moveLayer(sh, dir) {
    const loc = docApi.locate(sh.id);
    if (!loc) return;
    const j = loc.index + dir;
    if (j < 0 || j >= loc.container.length) return;
    loc.container.splice(loc.index, 1);
    loc.container.splice(j, 0, sh);
    docApi.docChanged();
    hist.push('Reorder');
  }

  function startRename(row, nameBtn, sh) {
    const input = document.createElement('input');
    input.className = 'rename';
    input.type = 'text';
    input.value = sh.name || '';
    input.maxLength = 60;
    input.setAttribute('aria-label', 'Layer name');
    nameBtn.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const commit = () => {
      if (done) return;
      done = true;
      const v = input.value.trim();
      if (v && v !== sh.name) {
        sh.name = v;
        docApi.docChanged();
        hist.push('Rename');
      } else {
        docApi.selChanged();
      }
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
      if (ev.key === 'Escape') { input.value = sh.name; input.blur(); }
    });
  }

  function refreshLayers() {
    const list = $('layersList');
    list.innerHTML = '';
    const n = countAll(state.doc.shapes);
    $('layerCount').textContent = n ? n + ' shape' + (n > 1 ? 's' : '') : '';
    if (!n) {
      const d = document.createElement('div');
      d.className = 'layers-empty';
      d.textContent = 'Nothing drawn yet — the layer list fills up as you create shapes.';
      list.appendChild(d);
      return;
    }
    const rows = [];
    (function walk(shapes, depth) {
      for (let i = shapes.length - 1; i >= 0; i--) {
        const sh = shapes[i];
        rows.push({ sh, depth });
        if (sh.type === 'group') walk(sh.children, depth + 1);
      }
    })(state.doc.shapes, 0);
    for (const r of rows) list.appendChild(layerRow(r.sh, r.depth));
  }

  /* ---------------- status bar ---------------- */
  function updateCoords(w) {
    $('stCoords').textContent = 'x ' + U.fmt1(w.x) + ' · y ' + U.fmt1(w.y);
  }
  function refreshStatus() {
    const sel = docApi.selShapes();
    $('stSel').textContent = sel.length ? sel.length + ' selected' : '';
    $('stSize').textContent = state.doc.w + ' × ' + state.doc.h;
  }
  function refreshZoom() {
    const pct = Math.round(state.view.k * 100) + '%';
    $('btnZoomLvl').textContent = pct;
    $('stZoom').textContent = pct;
  }

  /* ---------------- panel input wiring ---------------- */
  function wireProps() {
    $('inName').addEventListener('change', () => {
      const sh = docApi.singleSel();
      if (!sh) return;
      const v = $('inName').value.trim();
      if (v && v !== sh.name) { sh.name = v; docApi.docChanged(); hist.push('Rename'); }
      else refreshProps();
    });

    for (const kind of ['x', 'y', 'w', 'h']) {
      const el = $('in' + kind.toUpperCase());
      el.addEventListener('input', () => applyGeom(kind, false));
      el.addEventListener('change', () => applyGeom(kind, true));
    }

    const angle = $('inAngle');
    angle.addEventListener('input', () => {
      const sh = docApi.singleSel();
      if (!sh) return;
      const v = numVal('inAngle', null);
      if (v === null) return;
      sh.angle = U.clamp(v, -360, 360);
      R.updateShape(sh);
      R.renderOverlay();
    });
    angle.addEventListener('change', () => {
      const sh = docApi.singleSel();
      if (!sh) return;
      sh.angle = U.clamp(numVal('inAngle', 0), -360, 360);
      docApi.docChanged();
      hist.push('Rotate');
    });

    $('inRadius').addEventListener('change', () => {
      const sh = docApi.singleSel();
      if (!sh || sh.type !== 'rect') return;
      sh.radius = U.clamp(numVal('inRadius', 0), 0, Math.min(sh.w, sh.h) / 2);
      docApi.docChanged();
      hist.push('Corner radius');
    });

    $('inSides').addEventListener('change', () => {
      const sh = docApi.singleSel();
      if (!sh || sh.type !== 'polygon') return;
      const sides = Math.round(U.clamp(numVal('inSides', sh.sides || 5), 3, 24));
      sh.sides = sides;
      const bb = S.localBBox(sh);
      const c = { x: bb.x + bb.w / 2, y: bb.y + bb.h / 2 };
      const r = Math.max(bb.w, bb.h) / 2 || 40;
      sh.pts = S.regularPolygon(c.x, c.y, r, sides, -90);
      docApi.docChanged();
      hist.push('Polygon sides');
    });

    // fill / stroke
    const paintWire = (kind) => {
      const colorId = kind === 'fill' ? 'fillColor' : 'strokeColor';
      const hexId = kind === 'fill' ? 'fillHex' : 'strokeHex';
      const noneId = kind === 'fill' ? 'fillNone' : 'strokeNone';
      const key = kind === 'fill' ? 'fill' : 'stroke';
      const apply = v => {
        for (const sh of docApi.selShapes()) {
          if (kind === 'fill' && sh.type === 'line') continue;
          sh[key] = v;
        }
        docApi.docChanged();
      };
      $(colorId).addEventListener('input', () => apply($(colorId).value));
      $(colorId).addEventListener('change', () => hist.push(kind === 'fill' ? 'Fill' : 'Stroke'));
      $(hexId).addEventListener('change', () => {
        const v = U.hex6($(hexId).value);
        if (v && v !== 'none') { apply(v); hist.push(kind === 'fill' ? 'Fill' : 'Stroke'); }
        else refreshProps();
      });
      $(noneId).addEventListener('click', () => {
        const cur = commonStr(docApi.selShapes().map(s => s[key]));
        if (cur === 'none') apply($(colorId).value);
        else apply('none');
        hist.push(kind === 'fill' ? 'Fill' : 'Stroke');
        refreshProps();
      });
    };
    paintWire('fill');
    paintWire('stroke');

    $('inStrokeW').addEventListener('input', () => {
      const v = U.clamp(numVal('inStrokeW', null), 0, 500);
      if (v === null) return;
      for (const sh of docApi.selShapes()) sh.strokeWidth = v;
      docApi.docChanged();
    });
    $('inStrokeW').addEventListener('change', () => hist.push('Stroke width'));

    $('inDash').addEventListener('change', () => {
      const v = $('inDash').value;
      for (const sh of docApi.selShapes()) sh.dash = v;
      docApi.docChanged();
      hist.push('Dash');
    });

    const op = $('inOpacity');
    op.addEventListener('input', () => {
      const v = U.clamp(parseInt(op.value, 10) || 0, 0, 100);
      $('inOpacityVal').textContent = v + '%';
      for (const sh of docApi.selShapes()) sh.opacity = v / 100;
      docApi.docChanged();
    });
    op.addEventListener('change', () => hist.push('Opacity'));

    // z-order + align + distribute
    document.querySelectorAll('[data-z]').forEach(b => {
      b.innerHTML = icon('z' + b.dataset.z);
      b.addEventListener('click', () => docApi.zorder(b.dataset.z));
    });
    document.querySelectorAll('[data-align]').forEach(b => {
      b.innerHTML = icon('al_' + b.dataset.align);
      b.addEventListener('click', () => applyAlign(b.dataset.align));
    });
    document.querySelectorAll('[data-dist]').forEach(b => {
      b.innerHTML = icon('dist_' + b.dataset.dist);
      b.addEventListener('click', () => applyDistribute(b.dataset.dist));
    });

    // path actions
    $('btnNodeEdit').addEventListener('click', () => {
      const sh = docApi.singleSel();
      if (!sh) return;
      App.NE.toggle(sh.id);
    });
    $('btnToPath').addEventListener('click', () => {
      const sh = docApi.singleSel();
      if (!sh) return;
      const p = S.toPath(sh);
      if (!p) return;
      const loc = docApi.locate(sh.id);
      if (!loc) return;
      loc.container[loc.index] = p;
      docApi.setSel([p.id]);
      docApi.docChanged();
      hist.push('Convert to path');
      toast('Converted to an editable path');
    });
    $('btnToggleClose').addEventListener('click', () => {
      const sh = docApi.singleSel();
      if (!sh) return;
      if (App.NE.toggleClosed(sh)) {
        docApi.docChanged();
        hist.push('Edit nodes');
      }
    });

    // actions
    $('btnGroup').addEventListener('click', () => docApi.groupSel());
    $('btnUngroup').addEventListener('click', () => docApi.ungroupSel());
    $('btnDuplicate').addEventListener('click', () => docApi.duplicateSel());
    $('btnDelete').addEventListener('click', () => docApi.deleteSel());

    // doc panel
    $('inTitle').addEventListener('change', () => {
      state.doc.title = $('inTitle').value.trim() || 'Untitled artwork';
      docApi.docChanged();
    });
    const docDim = commit => {
      state.doc.w = Math.round(U.clamp(numVal('inDocW', state.doc.w), 16, 8000));
      state.doc.h = Math.round(U.clamp(numVal('inDocH', state.doc.h), 16, 8000));
      docApi.docChanged();
      if (commit) hist.push('Artboard size');
    };
    $('inDocW').addEventListener('input', () => docDim(false));
    $('inDocH').addEventListener('input', () => docDim(false));
    $('inDocW').addEventListener('change', () => docDim(true));
    $('inDocH').addEventListener('change', () => docDim(true));
    $('inDocBg').addEventListener('input', () => {
      state.doc.bg = $('inDocBg').value;
      $('inDocBgHex').value = state.doc.bg;
      docApi.docChanged();
    });
    $('inDocBg').addEventListener('change', () => hist.push('Background'));
    $('inDocBgHex').addEventListener('change', () => {
      const v = U.hex6($('inDocBgHex').value);
      if (v && v !== 'none') {
        state.doc.bg = v;
        docApi.docChanged();
        hist.push('Background');
      } else refreshDocPanel();
    });
  }

  /* ---------------- init ---------------- */
  function refreshHistButtons() {
    $('btnUndo').disabled = !hist.canUndo();
    $('btnRedo').disabled = !hist.canRedo();
  }

  function refreshAll() {
    refreshProps();
    refreshLayers();
    refreshStatus();
    refreshZoom();
    refreshHistButtons();
    refreshRail();
    $('btnGrid').setAttribute('aria-pressed', state.grid ? 'true' : 'false');
  }

  function init() {
    buildRail();
    initTopbar();
    wireProps();
    if (window.innerWidth < 900) {
      $('sidepanel').classList.add('hidden');
      $('btnTogglePanel').setAttribute('aria-pressed', 'false');
    }
    App.events.on('doc', () => { refreshProps(); refreshLayers(); refreshStatus(); });
    App.events.on('sel', () => { refreshProps(); refreshLayers(); refreshStatus(); });
    App.events.on('view', refreshZoom);
    App.events.on('hist', refreshHistButtons);
    App.events.on('tool', refreshRail);
    App.events.on('mode', refreshProps);
    App.events.on('grid', () => $('btnGrid').setAttribute('aria-pressed', state.grid ? 'true' : 'false'));
  }

  App.UI = {
    init, refreshAll, refreshProps, refreshLayers,
    toast, confirm, helpModal, newModal, openModal,
    isModal: () => modalOpen,
    updateCoords, setHint: t => { const el = document.getElementById('stHint'); if (el) el.textContent = t; },
    icon
  };
})();
