/* Fieldwork — application store.

   Single source of truth. Immutable-ish updates, validated actions, safe
   persistence, pub/sub, JSON import/export with duplicate-safe merging.
   Every action is defensive: it never throws to the caller; it returns
   { ok, errors?, error? }. */
(function (App) {
  'use strict';

  var util = App.util;
  var models = App.models;
  var storage = App.storage;

  var KEY = 'fieldwork.v1';
  var CORRUPT_KEY = KEY + '.corrupt';

  var state = models.defaultState();
  var listeners = [];

  var status = {
    storageAvailable: storage.isAvailable(),
    persisted: storage.isAvailable(),
    memoryOnly: !storage.isAvailable(),
    lastSaveError: null,
    lastSavedAt: null,
    recovered: false,
    recoveredReason: null
  };

  /* ---------- pub/sub ---------- */
  function emit() {
    var snapshot = state;
    listeners.slice().forEach(function (fn) {
      try { fn(snapshot); } catch (e) { /* a listener error must not break others */ }
    });
  }
  function subscribe(fn) {
    listeners.push(fn);
    return function () { var i = listeners.indexOf(fn); if (i !== -1) listeners.splice(i, 1); };
  }

  /* ---------- persistence ---------- */
  function serialize(s) {
    return {
      schemaVersion: models.SCHEMA_VERSION,
      app: models.APP_NAME,
      projects: s.projects,
      sources: s.sources,
      notes: s.notes,
      settings: s.settings,
      lastSavedAt: s.lastSavedAt
    };
  }

  function persist() {
    state.lastSavedAt = util.nowIso();
    var payload;
    try { payload = JSON.stringify(serialize(state)); }
    catch (e) { status.lastSaveError = 'Could not serialise data.'; status.persisted = false; status.memoryOnly = true; return; }
    var ok = false;
    try { ok = storage.setItem(KEY, payload); } catch (e) { ok = false; }
    status.storageAvailable = storage.isAvailable();
    status.persisted = ok;
    status.memoryOnly = !ok;
    status.lastSaveError = ok ? null : 'Browser storage is unavailable or full; your changes are kept in memory for this session.';
    if (ok) status.lastSavedAt = state.lastSavedAt;
  }

  function unwrap(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    if (payload.projects == null && payload.data && typeof payload.data === 'object') return payload.data;
    if (payload.projects == null && payload.state && typeof payload.state === 'object') return payload.state;
    return payload;
  }

  function load() {
    var raw = null;
    try { raw = storage.raw(KEY); } catch (e) { raw = null; }
    if (raw == null || raw === '') { state = models.defaultState(); return state; }

    var parsed = util.safeJsonParse(raw);
    if (!parsed.ok) {
      try { storage.setItem(CORRUPT_KEY, raw); } catch (e) {}
      status.recovered = true;
      status.recoveredReason = 'Your saved data could not be read; a backup copy was kept separately. Starting fresh.';
      state = models.defaultState();
      return state;
    }
    try {
      state = models.normalizeState(unwrap(parsed.value));
    } catch (e) {
      try { storage.setItem(CORRUPT_KEY, raw); } catch (e2) {}
      status.recovered = true;
      status.recoveredReason = 'Your saved data was malformed; a backup was kept. Starting fresh.';
      state = models.defaultState();
    }
    status.storageAvailable = storage.isAvailable();
    return state;
  }

  function reload() { load(); emit(); }

  /* ---------- mutation core ---------- */
  function mutate(fn) {
    try { fn(state); }
    catch (e) { return { ok: false, error: 'Unexpected error while saving: ' + (e && e.message ? e.message : String(e)) }; }
    try { persist(); } catch (e) { status.lastSaveError = 'Could not save.'; status.persisted = false; }
    emit();
    return { ok: true };
  }

  /* ---------- projects ---------- */
  function createProject(input) {
    var v = models.validateProject(input || {}, state, null);
    if (!v.ok) return { ok: false, errors: v.errors };
    var proj = models.newProject({ name: v.values.name, description: v.values.description, color: v.values.color });
    var res = mutate(function (s) { s.projects.push(proj); s.settings.lastProjectId = proj.id; });
    if (!res.ok) return res;
    return { ok: true, id: proj.id };
  }

  function updateProject(id, input) {
    if (!models.getProject(state, id)) return { ok: false, error: 'Project not found.' };
    var v = models.validateProject(input || {}, state, id);
    if (!v.ok) return { ok: false, errors: v.errors };
    return mutate(function (s) {
      var p = models.getProject(s, id); if (!p) return;
      p.name = v.values.name; p.description = v.values.description; p.color = v.values.color; p.updatedAt = util.nowIso();
    });
  }

  function setProjectArchived(id, archived) {
    if (!models.getProject(state, id)) return { ok: false, error: 'Project not found.' };
    return mutate(function (s) {
      var p = models.getProject(s, id); if (!p) return;
      p.archived = !!archived; p.updatedAt = util.nowIso();
    });
  }

  function deleteProject(id) {
    if (!models.getProject(state, id)) return { ok: false, error: 'Project not found.' };
    return mutate(function (s) {
      s.projects = s.projects.filter(function (p) { return p.id !== id; });
      s.sources = s.sources.filter(function (x) { return x.projectId !== id; });
      s.notes = s.notes.filter(function (n) { return n.projectId !== id; });
      if (s.settings.lastProjectId === id) s.settings.lastProjectId = null;
    });
  }

  /* ---------- sources ---------- */
  function createSource(projectId, input) {
    if (!models.getProject(state, projectId)) return { ok: false, error: 'Project not found.' };
    var v = models.validateSource(input || {}, state, projectId, null);
    if (!v.ok) return { ok: false, errors: v.errors };
    var now = util.nowIso();
    var src = {
      id: util.id(), projectId: projectId, title: v.values.title, type: v.values.type,
      author: v.values.author, year: v.values.year, url: v.values.url, publisher: v.values.publisher,
      notes: v.values.notes, tags: v.values.tags, excerpts: [], createdAt: now, updatedAt: now
    };
    var res = mutate(function (s) { s.sources.push(src); s.settings.lastProjectId = projectId; });
    if (!res.ok) return res;
    return { ok: true, id: src.id };
  }

  function updateSource(id, input) {
    var existing = models.getSource(state, id);
    if (!existing) return { ok: false, error: 'Source not found.' };
    var v = models.validateSource(input || {}, state, existing.projectId, id);
    if (!v.ok) return { ok: false, errors: v.errors };
    return mutate(function (s) {
      var src = models.getSource(s, id); if (!src) return;
      src.title = v.values.title; src.type = v.values.type; src.author = v.values.author;
      src.year = v.values.year; src.url = v.values.url; src.publisher = v.values.publisher;
      src.notes = v.values.notes; src.tags = v.values.tags; src.updatedAt = util.nowIso();
    });
  }

  function deleteSource(id) {
    if (!models.getSource(state, id)) return { ok: false, error: 'Source not found.' };
    return mutate(function (s) {
      s.sources = s.sources.filter(function (x) { return x.id !== id; });
      s.notes.forEach(function (n) { if (n.sourceId === id) n.sourceId = null; });
    });
  }

  /* ---------- excerpts ---------- */
  function addExcerpt(sourceId, input) {
    if (!models.getSource(state, sourceId)) return { ok: false, error: 'Source not found.' };
    var v = models.validateExcerpt(input || {});
    if (!v.ok) return { ok: false, errors: v.errors };
    var ex = models.newExcerpt({ text: v.values.text, page: v.values.page, note: v.values.note, tags: v.values.tags });
    var res = mutate(function (s) { var src = models.getSource(s, sourceId); if (!src) return; src.excerpts.push(ex); src.updatedAt = util.nowIso(); });
    if (!res.ok) return res;
    return { ok: true, id: ex.id };
  }

  function updateExcerpt(sourceId, excerptId, input) {
    var src = models.getSource(state, sourceId);
    if (!src) return { ok: false, error: 'Source not found.' };
    var ex = (src.excerpts || []).filter(function (e) { return e.id === excerptId; })[0];
    if (!ex) return { ok: false, error: 'Excerpt not found.' };
    var v = models.validateExcerpt(input || {});
    if (!v.ok) return { ok: false, errors: v.errors };
    return mutate(function (s) {
      var s2 = models.getSource(s, sourceId); if (!s2) return;
      var e2 = (s2.excerpts || []).filter(function (e) { return e.id === excerptId; })[0]; if (!e2) return;
      e2.text = v.values.text; e2.page = v.values.page; e2.note = v.values.note; e2.tags = v.values.tags; s2.updatedAt = util.nowIso();
    });
  }

  function deleteExcerpt(sourceId, excerptId) {
    var src = models.getSource(state, sourceId);
    if (!src) return { ok: false, error: 'Source not found.' };
    return mutate(function (s) {
      var s2 = models.getSource(s, sourceId); if (!s2) return;
      s2.excerpts = (s2.excerpts || []).filter(function (e) { return e.id !== excerptId; }); s2.updatedAt = util.nowIso();
    });
  }

  /* ---------- notes ---------- */
  function createNote(projectId, input) {
    if (!models.getProject(state, projectId)) return { ok: false, error: 'Project not found.' };
    var v = models.validateNote(input || {}, state, projectId, null);
    if (!v.ok) return { ok: false, errors: v.errors };
    var now = util.nowIso();
    var note = { id: util.id(), projectId: projectId, sourceId: v.values.sourceId, title: v.values.title, body: v.values.body, tags: v.values.tags, createdAt: now, updatedAt: now };
    var res = mutate(function (s) { s.notes.push(note); s.settings.lastProjectId = projectId; });
    if (!res.ok) return res;
    return { ok: true, id: note.id };
  }

  function updateNote(id, input) {
    var existing = models.getNote(state, id);
    if (!existing) return { ok: false, error: 'Note not found.' };
    var v = models.validateNote(input || {}, state, existing.projectId, id);
    if (!v.ok) return { ok: false, errors: v.errors };
    return mutate(function (s) {
      var n = models.getNote(s, id); if (!n) return;
      n.sourceId = v.values.sourceId; n.title = v.values.title; n.body = v.values.body; n.tags = v.values.tags; n.updatedAt = util.nowIso();
    });
  }

  function deleteNote(id) {
    if (!models.getNote(state, id)) return { ok: false, error: 'Note not found.' };
    return mutate(function (s) { s.notes = s.notes.filter(function (n) { return n.id !== id; }); });
  }

  /* ---------- settings ---------- */
  function setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark' && theme !== 'system') theme = 'system';
    return mutate(function (s) { s.settings.theme = theme; });
  }
  function setLastProject(id) {
    return mutate(function (s) { s.settings.lastProjectId = id || null; });
  }

  /* ---------- portability ---------- */
  function counts(s) { return { projects: s.projects.length, sources: s.sources.length, notes: s.notes.length }; }

  function exportJson() {
    return JSON.stringify(serialize(state), null, 2);
  }

  function srcKey(s) {
    return [s.projectId, util.lower(s.title), util.lower(s.author || ''), s.year == null ? '' : s.year, util.lower((s.url || '').trim())].join('|');
  }
  function sourceContent(s) {
    return JSON.stringify({ projectId: s.projectId, title: s.title, type: s.type, author: s.author, year: s.year, url: s.url, publisher: s.publisher, notes: s.notes, tags: s.tags, excerpts: s.excerpts });
  }
  function noteContent(n) {
    return JSON.stringify({ projectId: n.projectId, sourceId: n.sourceId, title: n.title, body: n.body, tags: n.tags });
  }

  function mergeStates(base, incoming) {
    base = models.normalizeState(base);
    incoming = models.normalizeState(incoming);

    var projects = base.projects.slice();
    var sources = base.sources.slice();
    var notes = base.notes.slice();

    var projById = {}; projects.forEach(function (p) { projById[p.id] = p; });
    var projName = {}; projects.forEach(function (p) { projName[util.lower(p.name)] = p; });
    var usedProjIds = {}; projects.forEach(function (p) { usedProjIds[p.id] = 1; });
    var projIdRemap = {};

    incoming.projects.forEach(function (ip) {
      var nameKey = util.lower(ip.name);
      if (projById[ip.id] && util.lower(projById[ip.id].name) === nameKey) { projIdRemap[ip.id] = ip.id; return; }
      if (projName[nameKey]) { projIdRemap[ip.id] = projName[nameKey].id; return; }
      var newId = ip.id; if (usedProjIds[newId]) newId = util.id();
      var clone = util.deepClone(ip); clone.id = newId;
      projById[newId] = clone; projName[nameKey] = clone; usedProjIds[newId] = 1;
      projects.push(clone); projIdRemap[ip.id] = newId;
    });

    var srcById = {}; sources.forEach(function (s) { srcById[s.id] = s; });
    var usedSrcIds = {}; sources.forEach(function (s) { usedSrcIds[s.id] = 1; });
    var srcSig = {}; sources.forEach(function (s) { srcSig[srcKey(s)] = s; });
    var srcIdRemap = {};

    incoming.sources.forEach(function (is) {
      var clone = util.deepClone(is);
      clone.projectId = projIdRemap[is.projectId] || is.projectId;
      if (srcById[is.id] && sourceContent(srcById[is.id]) === sourceContent(clone)) { srcIdRemap[is.id] = is.id; return; }
      var key = srcKey(clone);
      if (srcSig[key]) { srcIdRemap[is.id] = srcSig[key].id; return; }
      var newId = is.id; if (usedSrcIds[newId]) newId = util.id();
      clone.id = newId; usedSrcIds[newId] = 1; srcById[newId] = clone; srcSig[key] = clone;
      sources.push(clone); srcIdRemap[is.id] = newId;
    });

    var noteById = {}; notes.forEach(function (n) { noteById[n.id] = n; });
    var usedNoteIds = {}; notes.forEach(function (n) { usedNoteIds[n.id] = 1; });

    incoming.notes.forEach(function (inn) {
      var clone = util.deepClone(inn);
      clone.projectId = projIdRemap[inn.projectId] || inn.projectId;
      if (inn.sourceId) clone.sourceId = srcIdRemap[inn.sourceId] || inn.sourceId;
      if (clone.sourceId) { var s = srcById[clone.sourceId]; if (!s || s.projectId !== clone.projectId) clone.sourceId = null; }
      if (noteById[inn.id] && noteContent(noteById[inn.id]) === noteContent(clone)) return;
      var newId = inn.id; if (usedNoteIds[newId]) newId = util.id();
      clone.id = newId; usedNoteIds[newId] = 1; noteById[newId] = clone; notes.push(clone);
    });

    return models.normalizeState({ projects: projects, sources: sources, notes: notes, settings: base.settings, lastSavedAt: base.lastSavedAt });
  }

  function importJson(text, options) {
    options = options || {};
    var mode = options.mode === 'replace' ? 'replace' : 'merge';
    if (typeof text !== 'string' || text.trim() === '') return { ok: false, error: 'The selected file is empty.' };
    var parsed = util.safeJsonParse(text);
    if (!parsed.ok) return { ok: false, error: 'That file is not valid JSON.' };
    var payload = unwrap(parsed.value);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { ok: false, error: 'Unrecognised backup format.' };
    var hasContent = Array.isArray(payload.projects) || Array.isArray(payload.sources) || Array.isArray(payload.notes) || payload.app === models.APP_NAME;
    if (!hasContent) return { ok: false, error: 'This does not look like a Fieldwork backup.' };

    var incoming;
    try { incoming = models.normalizeState(payload); }
    catch (e) { return { ok: false, error: 'The backup data could not be read.' }; }

    var before = counts(state);
    var snapshot = util.deepClone(state);
    try {
      state = (mode === 'replace') ? incoming : mergeStates(state, incoming);
      persist(); emit();
    } catch (e) {
      state = snapshot; // roll back; leave current data untouched
      try { persist(); } catch (e2) {}
      return { ok: false, error: 'Import failed; your existing data was not changed.' };
    }
    var after = counts(state);
    return {
      ok: true, mode: mode, before: before, after: after,
      added: { projects: after.projects - before.projects, sources: after.sources - before.sources, notes: after.notes - before.notes }
    };
  }

  function resetAll() {
    state = models.defaultState();
    try { storage.removeItem(KEY); } catch (e) {}
    persist(); emit();
    return { ok: true };
  }

  /* ---------- accessors ---------- */
  function getState() { return state; }
  function getStatus() { return status; }

  App.store = {
    KEY: KEY,
    CORRUPT_KEY: CORRUPT_KEY,
    load: load,
    reload: reload,
    getState: getState,
    getStatus: getStatus,
    subscribe: subscribe,
    emit: emit,
    createProject: createProject,
    updateProject: updateProject,
    setProjectArchived: setProjectArchived,
    deleteProject: deleteProject,
    createSource: createSource,
    updateSource: updateSource,
    deleteSource: deleteSource,
    addExcerpt: addExcerpt,
    updateExcerpt: updateExcerpt,
    deleteExcerpt: deleteExcerpt,
    createNote: createNote,
    updateNote: updateNote,
    deleteNote: deleteNote,
    setTheme: setTheme,
    setLastProject: setLastProject,
    exportJson: exportJson,
    importJson: importJson,
    resetAll: resetAll
  };
})(window.App = window.App || {});
