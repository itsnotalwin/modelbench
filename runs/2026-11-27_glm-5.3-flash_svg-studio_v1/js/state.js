/* ============================================================
   Vectra Studio — application state, selection, history, storage
   ============================================================ */
'use strict';
(() => {
  const listeners = {};
  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
  }
  function emit(evt, data) {
    const arr = listeners[evt];
    if (arr) for (const fn of arr) fn(data);
  }

  const state = {
    doc: { title: 'Untitled artwork', w: 1080, h: 720, bg: '#ffffff', shapes: [] },
    sel: [],            // selected shape ids
    tool: 'select',
    view: { k: 1, x: 0, y: 0 },
    style: { fill: '#dfe7f2', stroke: '#3c4c63', strokeWidth: 2, opacity: 1, dash: '', sides: 5 },
    editing: null,      // node-edit shape id
    grid: true,
    hover: null,        // hovered shape id
    overlayState: {},   // transient preview data (marquee / pen / pencil)
    clipboard: null
  };

  /* ---------------- doc lookup ---------------- */
  function shapeById(id, list) {
    const arr = list || state.doc.shapes;
    for (const sh of arr) {
      if (sh.id === id) return sh;
      if (sh.type === 'group') {
        const f = shapeById(id, sh.children);
        if (f) return f;
      }
    }
    return null;
  }

  function locate(id, list, parent) {
    const arr = list || state.doc.shapes;
    for (let i = 0; i < arr.length; i++) {
      const sh = arr[i];
      if (sh.id === id) return { shape: sh, container: arr, index: i, parent: parent || null };
      if (sh.type === 'group') {
        const f = locate(id, sh.children, sh);
        if (f) return f;
      }
    }
    return null;
  }

  function selShapes() {
    const out = [];
    for (const id of state.sel) {
      const sh = shapeById(id);
      if (sh) out.push(sh);
    }
    return out;
  }
  const singleSel = () => state.sel.length === 1 ? shapeById(state.sel[0]) : null;
  const isSel = id => state.sel.indexOf(id) !== -1;

  function setSel(ids) {
    state.sel = (ids || []).slice();
    if (state.editing && !isSel(state.editing)) state.editing = null;
    emit('sel');
  }

  /* ---------------- change notifications ---------------- */
  let autosaveTimer = null;
  function docChanged() {
    // Drop selection entries that no longer exist.
    if (state.sel.length) {
      const valid = state.sel.filter(id => shapeById(id));
      if (valid.length !== state.sel.length) state.sel = valid;
    }
    if (state.editing && !shapeById(state.editing)) state.editing = null;
    emit('doc');
    emit('sel');
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveNow, 400);
  }
  function selChanged() { emit('sel'); }
  function viewChanged() { emit('view'); }
  function setTool(t) {
    if (state.tool === t) return;
    state.tool = t;
    // switching away from the node tool ends node editing
    if (t !== 'node' && state.editing) state.editing = null;
    emit('tool');
    emit('mode');
  }
  function setEditing(id) {
    state.editing = id;
    emit('mode');
    emit('sel');
  }

  function saveNow() {
    try {
      localStorage.setItem('vectra.studio.v1', JSON.stringify({
        doc: state.doc, view: state.view, savedAt: Date.now()
      }));
    } catch (e) { /* storage unavailable (e.g. some file:// setups) */ }
  }
  function loadSaved() {
    try {
      const raw = localStorage.getItem('vectra.studio.v1');
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && data.doc && Array.isArray(data.doc.shapes)) return data;
    } catch (e) { /* corrupted -> ignore */ }
    return null;
  }
  function clearSaved() {
    try { localStorage.removeItem('vectra.studio.v1'); } catch (e) { }
  }

  /* ---------------- history (snapshot based) ---------------- */
  const hist = {
    arr: [], i: -1, max: 100, _labels: [],
    snap() {
      const d = state.doc;
      return JSON.stringify({ title: d.title, w: d.w, h: d.h, bg: d.bg, shapes: d.shapes });
    },
    apply(json) {
      const d = JSON.parse(json);
      state.doc = { title: d.title, w: d.w, h: d.h, bg: d.bg, shapes: d.shapes };
      // keep node-editing alive if the edited shape still exists (docChanged validates)
      docChanged();
    },
    init() {
      this.arr = [this.snap()];
      this.i = 0;
      this._labels = ['Start'];
      emit('hist');
    },
    push(label, opts) {
      const o = opts || {};
      const now = Date.now();
      // Coalesce rapid same-label changes (e.g. arrow-key nudges).
      if (o.coalesce && this.i === this.arr.length - 1 &&
          this._labels[this.i] === label &&
          now - (this._lastPush || 0) < o.coalesce) {
        this.arr[this.i] = this.snap();
      } else {
        this.arr.length = this.i + 1;
        this._labels.length = this.i + 1;
        this.arr.push(this.snap());
        this._labels.push(label || 'Change');
        this.i = this.arr.length - 1;
        if (this.arr.length > this.max) {
          const drop = this.arr.length - this.max;
          this.arr.splice(0, drop);
          this._labels.splice(0, drop);
          this.i -= drop;
        }
      }
      this._lastPush = now;
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(saveNow, 400);
      emit('hist');
    },
    undo() {
      if (this.i > 0) { this.i--; this.apply(this.arr[this.i]); emit('hist'); }
    },
    redo() {
      if (this.i < this.arr.length - 1) { this.i++; this.apply(this.arr[this.i]); emit('hist'); }
    },
    canUndo() { return this.i > 0; },
    canRedo() { return this.i < this.arr.length - 1; }
  };

  /* ---------------- selection-level mutations ---------------- */
  function updateSelShapes(fn, histLabel, opts) {
    const shapes = selShapes();
    if (!shapes.length) return;
    for (const sh of shapes) fn(sh);
    docChanged();
    if (histLabel) hist.push(histLabel, opts);
  }

  function deleteSel() {
    if (!state.sel.length) return;
    const ids = state.sel.slice();
    let removed = 0;
    for (const id of ids) {
      const loc = locate(id);
      if (loc) { loc.container.splice(loc.index, 1); removed++; }
    }
    state.sel = [];
    state.editing = null;
    docChanged();
    hist.push('Delete');
    return removed;
  }

  function duplicateSel() {
    const shapes = selShapes();
    if (!shapes.length) return;
    const newIds = [];
    for (const sh of shapes) {
      const loc = locate(sh.id);
      if (!loc) continue;
      const copy = App.S.clone(sh);
      copy.id = App.U.uid();
      if (copy.type === 'group') {
        const reid = c => { c.id = App.U.uid(); if (c.type === 'group') c.children.forEach(reid); };
        copy.children.forEach(reid);
      }
      copy.name = sh.name + ' copy';
      loc.container.splice(loc.index + 1, 0, copy);
      newIds.push(copy.id);
    }
    state.sel = newIds;
    docChanged();
    hist.push('Duplicate');
  }

  function groupSel() {
    const shapes = selShapes();
    if (shapes.length < 2) return;
    // Collect in document order using top-level ordering of the topmost member.
    const members = [];
    const walk = list => {
      for (const sh of list) {
        if (isSel(sh.id)) members.push(sh);
        else if (sh.type === 'group') walk(sh.children);
      }
    };
    walk(state.doc.shapes);
    if (members.length < 2) return;
    // Top-level index of the first top-level ancestor of any member.
    let insertAt = state.doc.shapes.length;
    for (const m of members) {
      let node = m, par = null;
      const loc = locate(node.id);
      par = loc.parent;
      let topLevel = par ? par : node;
      const tl = locate(topLevel.id);
      if (tl && tl.index < insertAt) insertAt = tl.index;
    }
    // Remove members from their containers.
    for (const m of members) {
      const loc = locate(m.id);
      if (loc) loc.container.splice(loc.index, 1);
    }
    const group = App.S.create('group', { name: 'Group', style: {} });
    group.children = members;
    state.doc.shapes.splice(Math.min(insertAt, state.doc.shapes.length), 0, group);
    state.sel = [group.id];
    state.editing = null;
    docChanged();
    hist.push('Group');
  }

  function ungroupSel() {
    const groups = selShapes().filter(s => s.type === 'group');
    if (!groups.length) return;
    const newIds = [];
    for (const g of groups) {
      const loc = locate(g.id);
      if (!loc) continue;
      loc.container.splice(loc.index, 1, ...g.children);
      for (const c of g.children) newIds.push(c.id);
    }
    state.sel = newIds;
    state.editing = null;
    docChanged();
    hist.push('Ungroup');
  }

  function copySel() {
    const shapes = selShapes();
    if (!shapes.length) return;
    state.clipboard = shapes.map(App.S.clone);
    return shapes.length;
  }

  function paste() {
    if (!state.clipboard || !state.clipboard.length) return;
    const newIds = [];
    for (const sh of state.clipboard) {
      const copy = App.S.clone(sh);
      copy.id = App.U.uid();
      if (copy.type === 'group') {
        const reid = c => { c.id = App.U.uid(); if (c.type === 'group') c.children.forEach(reid); };
        copy.children.forEach(reid);
      }
      App.S.translate(copy, 24, 24);
      state.doc.shapes.push(copy);
      newIds.push(copy.id);
    }
    state.sel = newIds;
    state.editing = null;
    docChanged();
    hist.push('Paste');
  }

  function selectAll() {
    state.sel = state.doc.shapes.filter(s => !s.locked && s.visible !== false).map(s => s.id);
    emit('sel');
  }

  /* z-order: works inside whatever container the selection lives in */
  function zorder(op) {
    const sel = selShapes();
    if (!sel.length) return;
    const byContainer = new Map();
    for (const sh of sel) {
      const loc = locate(sh.id);
      if (!loc) continue;
      if (!byContainer.has(loc.container)) byContainer.set(loc.container, new Set());
      byContainer.get(loc.container).add(sh.id);
    }
    for (const [container, ids] of byContainer) {
      const picked = container.filter(s => ids.has(s.id));
      const rest = container.filter(s => !ids.has(s.id));
      if (op === 'front') container.length = 0, container.push(...rest, ...picked);
      else if (op === 'back') container.length = 0, container.push(...picked, ...rest);
      else if (op === 'forward') {
        for (let i = container.length - 2; i >= 0; i--) {
          if (ids.has(container[i].id) && !ids.has(container[i + 1].id)) {
            const t = container[i]; container[i] = container[i + 1]; container[i + 1] = t;
          }
        }
      } else if (op === 'backward') {
        for (let i = 1; i < container.length; i++) {
          if (ids.has(container[i].id) && !ids.has(container[i - 1].id)) {
            const t = container[i]; container[i] = container[i - 1]; container[i - 1] = t;
          }
        }
      }
    }
    docChanged();
    hist.push('Reorder');
  }

  App.state = state;
  state.setTool = setTool;      // convenience alias used by tools/UI
  state.setEditing = setEditing;
  App.hist = hist;
  App.events = { on, emit };
  App.store = { saveNow, loadSaved, clearSaved };
  App.docApi = {
    shapeById, locate, selShapes, singleSel, isSel, setSel,
    docChanged, selChanged, viewChanged, setTool, setEditing,
    updateSelShapes, deleteSel, duplicateSel, groupSel, ungroupSel,
    copySel, paste, selectAll, zorder
  };
})();
