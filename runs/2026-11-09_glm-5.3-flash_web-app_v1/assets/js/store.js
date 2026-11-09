/* ============================================================
   Galley — store.js — state, persistence, undo, import/export.
   Every mutation goes through commit(): one undo step, one save,
   one notify. Rules live in domain.js; store enforces them.
   ============================================================ */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.domain;

  const STORAGE_KEY = 'galley.desk.v1';
  const SCHEMA_VERSION = 1;
  const UNDO_MAX = 50;
  const SAVE_DEBOUNCE = 250;

  /* Migration ladder: each entry upgrades state of key `n` to `n+1`. */
  const MIGRATIONS = {
    // 1: (s) => s   — v1 is the first schema; ladder demonstrates the upgrade path.
  };

  let state = null;
  let listeners = [];
  let undoStack = [];
  let redoStack = [];
  let storageOk = true;
  let storageMsg = '';
  let saveTimer = null;
  let lastSavedAt = null;
  let remoteChange = null; // {rev, at} when another tab saved a different revision
  let chan = null;

  /* ---------------- normalization / repair ---------------- */
  /* Defensive repair runs on every load and import: missing fields get
     sane values, impossible statuses fall back with a note. */
  function normalize(s) {
    if (!s || typeof s !== 'object') throw new Error('not an object');
    if (!Array.isArray(s.writers)) s.writers = [];
    if (!Array.isArray(s.stories)) s.stories = [];
    if (!Array.isArray(s.editions)) s.editions = [];
    if (!Array.isArray(s.views)) s.views = [];
    if (!Array.isArray(s.activity)) s.activity = [];
    s.meta = s.meta || {};
    s.meta.createdAt = s.meta.createdAt || D.now();
    s.meta.updatedAt = s.meta.updatedAt || D.now();
    s.meta.rev = Number.isFinite(s.meta.rev) ? s.meta.rev : 1;
    s.meta.onboarded = !!s.meta.onboarded;
    s.meta.isSample = !!s.meta.isSample;
    s.meta.paperName = typeof s.meta.paperName === 'string' && s.meta.paperName ? s.meta.paperName : 'My Paper';
    const repairs = [];

    const writerIds = new Set(s.writers.map((w) => w.id));
    s.writers.forEach((w) => {
      w.name = String(w.name || 'Unnamed writer');
      w.beat = String(w.beat || '');
      w.capacity = Number.isFinite(w.capacity) ? w.capacity : 2000;
      w.color = w.color || '#3a3a3a';
      w.active = w.active !== false;
      w.createdAt = w.createdAt || D.now();
    });

    const storyIds = new Set();
    s.stories.forEach((st) => {
      if (!st.id || storyIds.has(st.id)) { st.id = D.uid('st'); }
      storyIds.add(st.id);
      st.slug = String(st.slug || '');
      st.headline = String(st.headline || '');
      st.standfirst = String(st.standfirst || '');
      if (!D.SECTIONS.includes(st.section)) { st.section = 'News'; repairs.push('Story ' + st.slug + ' had an unknown section.'); }
      if (!D.STATUS_MAP[st.status]) { st.status = 'pitch'; repairs.push('Story ' + st.slug + ' had an unknown status.'); }
      st.priority = ['normal', 'high', 'lead'].includes(st.priority) ? st.priority : 'normal';
      st.wordTarget = Number.isFinite(st.wordTarget) ? st.wordTarget : 1200;
      st.wordCount = Number.isFinite(st.wordCount) ? st.wordCount : 0;
      st.due = typeof st.due === 'string' ? st.due : '';
      st.tags = Array.isArray(st.tags) ? st.tags.map(String) : [];
      st.notes = Array.isArray(st.notes) ? st.notes : [];
      st.history = Array.isArray(st.history) ? st.history : [];
      st.createdAt = st.createdAt || D.now();
      st.updatedAt = st.updatedAt || st.createdAt;
      st.publishedAt = st.publishedAt || null;
      st.slotId = typeof st.slotId === 'string' ? st.slotId : null;
      st.archivedFrom = st.archivedFrom || null;
      if (!writerIds.has(st.writerId)) st.writerId = '';
    });

    s.editions.forEach((ed) => {
      ed.id = ed.id || D.uid('ed');
      ed.number = Number.isFinite(ed.number) ? ed.number : 1;
      ed.name = String(ed.name || 'No. ' + ed.number);
      ed.date = typeof ed.date === 'string' ? ed.date : D.todayStr();
      ed.status = ed.status === 'published' ? 'published' : 'draft';
      ed.createdAt = ed.createdAt || D.now();
      ed.publishedAt = ed.publishedAt || null;
      ed.slots = Array.isArray(ed.slots) ? ed.slots : [];
      ed.slots.forEach((sl) => {
        sl.id = sl.id || D.uid('sl');
        sl.label = String(sl.label || 'Slot');
        sl.section = sl.section === 'any' || D.SECTIONS.includes(sl.section) ? sl.section : 'any';
        sl.storyId = sl.storyId || null;
        sl.hold = !!sl.hold;
        if (sl.storyId && !storyIds.has(sl.storyId)) { sl.storyId = null; repairs.push('Slot ' + sl.label + ' pointed at a missing story.'); }
      });
      if (ed.status === 'published') {
        ed.slots.forEach((sl) => {
          if (sl.storyId) {
            const st = s.stories.find((x) => x.id === sl.storyId);
            if (st) st.slotId = sl.id;
          }
        });
      }
    });

    // Consistency: a story with slotId must be slotted in a live (unpublished or published) slot.
    const liveSlots = new Map();
    s.editions.forEach((ed) => ed.slots.forEach((sl) => liveSlots.set(sl.id, sl)));
    s.stories.forEach((st) => {
      if (st.slotId && !liveSlots.has(st.slotId)) { st.slotId = null; repairs.push('Story ' + st.slug + ' pointed at a missing slot.'); }
    });
    s.views.forEach((v) => {
      v.id = v.id || D.uid('vw');
      v.name = String(v.name || 'View');
      v.filters = Object.assign(D.defaultFilters(), v.filters || {});
      v.sort = v.sort && v.sort.key ? v.sort : { key: 'due', dir: 'asc' };
    });
    s.activity.forEach((a) => { a.id = a.id || D.uid('ac'); a.at = a.at || D.now(); a.kind = a.kind || 'data'; a.text = String(a.text || ''); });
    s.activity.sort((a, b) => (a.at < b.at ? 1 : -1));

    s.ui = s.ui || {};
    s.ui.route = ['board', 'stories', 'edition', 'people', 'activity', 'archive'].includes(s.ui.route) ? s.ui.route : 'board';
    s.ui.filters = Object.assign(D.defaultFilters(), s.ui.filters || {});
    s.ui.filters.sections = Array.isArray(s.ui.filters.sections) ? s.ui.filters.sections : [];
    s.ui.sort = s.ui.sort && s.ui.sort.key ? s.ui.sort : { key: 'due', dir: 'asc' };
    s.ui.viewId = s.ui.viewId || null;
    s.ui.editionId = s.ui.editionId || (s.editions.find((e) => e.status === 'draft') || s.editions[0] || {}).id || null;
    s.ui.pageSize = Number.isFinite(s.ui.pageSize) ? s.ui.pageSize : 60;

    return repairs;
  }

  /* ---------------- persistence ---------------- */
  function readStorage() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      storageOk = false;
      storageMsg = 'This browser refused storage access (' + (e && e.name ? e.name : 'error') + '). The desk still works, but nothing will survive closing the tab — export a backup before you leave.';
      return null;
    }
  }

  function persistNow() {
    if (!state) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageOk = true;
      lastSavedAt = new Date();
      if (chan && state.meta) {
        try { chan.postMessage({ rev: state.meta.rev, id: state.meta.createdAt }); } catch (e) { /* channel closed */ }
      }
    } catch (e) {
      storageOk = false;
      if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
        storageMsg = 'The browser ran out of local storage (quota exceeded). Nothing was saved from this change — export your desk or archive old stories to free space.';
      } else {
        storageMsg = 'Saving failed (' + (e && e.name ? e.name : 'error') + '). The desk still works in memory, but changes will not survive closing the tab.';
      }
      notify();
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistNow, SAVE_DEBOUNCE);
  }

  function flushSave() {
    clearTimeout(saveTimer);
    persistNow();
  }

  /* ---------------- undo (snapshot based) ---------------- */
  function dataSnapshot() {
    return JSON.stringify({
      schemaVersion: state.schemaVersion,
      meta: state.meta,
      writers: state.writers,
      stories: state.stories,
      editions: state.editions,
      views: state.views,
      activity: state.activity,
    });
  }
  function pushUndo(label) {
    undoStack.push({ label, snap: dataSnapshot() });
    if (undoStack.length > UNDO_MAX) undoStack.shift();
    redoStack.length = 0;
  }
  function restoreSnap(snap) {
    const obj = JSON.parse(snap);
    state.schemaVersion = obj.schemaVersion;
    state.meta = obj.meta;
    state.writers = obj.writers;
    state.stories = obj.stories;
    state.editions = obj.editions;
    state.views = obj.views;
    state.activity = obj.activity;
  }
  function undo() {
    if (!undoStack.length) return false;
    redoStack.push({ label: undoStack[undoStack.length - 1].label, snap: dataSnapshot() });
    const entry = undoStack.pop();
    restoreSnap(entry.snap);
    touch();
    scheduleSave();
    notify();
    return entry.label;
  }
  function redo() {
    if (!redoStack.length) return false;
    undoStack.push({ label: redoStack[redoStack.length - 1].label, snap: dataSnapshot() });
    const entry = redoStack.pop();
    restoreSnap(entry.snap);
    touch();
    scheduleSave();
    notify();
    return entry.label;
  }
  function clearHistory() { undoStack.length = 0; redoStack.length = 0; }

  /* ---------------- core commit ---------------- */
  function touch() {
    state.meta.updatedAt = D.now();
    state.meta.rev = (state.meta.rev || 0) + 1;
  }

  function commit(label, fn) {
    pushUndo(label);
    try {
      fn(state);
    } catch (e) {
      // Roll back to the pre-commit snapshot so a failed mutation never half-applies.
      restoreSnap(undoStack.pop().snap);
      throw e;
    }
    touch();
    scheduleSave();
    notify();
  }

  function log(kind, text) {
    state.activity.unshift({ id: D.uid('ac'), at: D.now(), kind, text });
    if (state.activity.length > 300) state.activity.length = 300;
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter((f) => f !== fn); };
  }
  function notify() { listeners.forEach((fn) => { try { fn(); } catch (e) { /* listener errors must not break the desk */ } }); }

  /* ---------------- boot ---------------- */
  function init() {
    const raw = readStorage();
    let loaded = null;
    if (raw != null) {
      try {
        loaded = JSON.parse(raw);
        if (!loaded || typeof loaded !== 'object' || !Array.isArray(loaded.stories)) loaded = null;
      } catch (e) {
        loaded = null;
        storageMsg = 'Your saved desk could not be read (corrupt data). Start a fresh desk below — nothing from the old save could be recovered.';
      }
    }
    if (loaded) {
      // Migration ladder: upgrade older schemas step by step.
      let v = Number(loaded.schemaVersion) || 0;
      while (v < SCHEMA_VERSION) {
        const step = MIGRATIONS[v + 1];
        if (typeof step === 'function') loaded = step(loaded);
        v++;
      }
      loaded.schemaVersion = SCHEMA_VERSION;
      const repairs = normalize(loaded);
      state = loaded;
      if (repairs.length) {
        log('data', 'Desk repaired on load: ' + repairs.join(' '));
      }
    } else {
      state = G.data.sample();
      normalize(state);
      scheduleSave();
    }
    if ('BroadcastChannel' in window) {
      try {
        chan = new BroadcastChannel('galley-desk-sync');
        chan.onmessage = (e) => {
          const msg = e.data || {};
          if (msg.rev && state.meta && msg.rev !== state.meta.rev) {
            remoteChange = { rev: msg.rev, at: D.now() };
            notify();
          }
        };
      } catch (e) { chan = null; }
    }
    notify();
    return state;
  }

  function dismissRemote() { remoteChange = null; notify(); }

  /* ---------------- stories ---------------- */
  function findStory(id) {
    const st = state.stories.find((s) => s.id === id);
    if (!st) throw D.err('That story is no longer on the desk.');
    return st;
  }

  function suggestSlug(headline) {
    let base = String(headline || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 32) || 'story';
    if (!SLUG_RE.test(base)) base = 'story';
    const taken = new Set(state.stories.filter((s) => s.status !== 'archived').map((s) => s.slug));
    if (!taken.has(base)) return base;
    for (let i = 2; i < 100; i++) { if (!taken.has(base + '-' + i)) return base + '-' + i; }
    return base + '-' + Date.now().toString(36);
  }

  function createStory(fields) {
    const f = fields || {};
    const problems = validateAll(f, null, { requireWriterForStatus: true });
    if (problems) {
      const first = Object.keys(problems).map((k) => problems[k])[0];
      throw D.err(first);
    }
    let status = 'pitch';
    if (f.writerId) {
      const w = state.writers.find((x) => x.id === f.writerId);
      if (!w || !w.active) throw D.err('That writer is inactive — pick someone on the desk.');
      status = 'assigned';
    }
    const id = D.uid('st');
    const at = D.now();
    const st = {
      id,
      slug: String(f.slug || '').trim().toLowerCase(),
      headline: String(f.headline || '').trim(),
      standfirst: String(f.standfirst || '').trim(),
      section: f.section,
      writerId: f.writerId || '',
      status,
      priority: ['normal', 'high', 'lead'].includes(f.priority) ? f.priority : 'normal',
      wordTarget: Number(f.wordTarget) || 1200,
      wordCount: Number(f.wordCount) || 0,
      due: f.due || '',
      tags: D.normalizeTags(f.tags),
      slotId: null, publishedAt: null, archivedFrom: null,
      notes: [], history: [],
      createdAt: at, updatedAt: at,
    };
    st.history.push({ at, kind: 'created', detail: status === 'assigned' ? 'Created and assigned to ' + (state.writers.find((w) => w.id === f.writerId) || {}).name : 'Created as a pitch' });
    commit('Create story', (s) => {
      s.stories.push(st);
      log('story', 'New ' + (status === 'assigned' ? 'assignment' : 'pitch') + ': \u201C' + st.headline + '\u201D' + (st.due ? ', due ' + D.fmtDate(st.due) : ''));
    });
    return st;
  }

  function validateAll(f, selfId, opts) {
    const ctx = { state, selfId };
    const out = {};
    let bad = false;
    ['headline', 'slug', 'section', 'writerId', 'wordTarget', 'wordCount', 'due', 'standfirst'].forEach((k) => {
      if (f[k] === undefined && !(opts && opts.requireAll)) return;
      const msg = D.validateField(k, f[k], ctx);
      if (msg) { out[k] = msg; bad = true; }
    });
    if (bad) return out;
    return null;
  }

  function updateStory(id, patch, label) {
    const st = findStory(id);
    const ctx = { state, selfId: id };
    const msgs = [];
    Object.keys(patch).forEach((k) => {
      const msg = D.validateField(k, patch[k], ctx);
      if (msg) msgs.push(msg);
    });
    if (msgs.length) throw D.err(msgs[0]);

    commit(label || 'Edit story', (s) => {
      const story = s.stories.find((x) => x.id === id);
      const at = D.now();
      Object.keys(patch).forEach((k) => {
        const before = story[k];
        let after = patch[k];
        if (k === 'slug') after = String(after).trim().toLowerCase();
        if (k === 'headline' || k === 'standfirst') after = String(after).trim();
        if (k === 'tags') after = D.normalizeTags(after);
        if (k === 'wordTarget' || k === 'wordCount') after = Math.round(Number(after) || 0);
        if (String(before) !== String(after)) {
          story[k] = after;
          story.history.push({ at, kind: 'field', detail: k + ': \u201C' + String(before).slice(0, 60) + '\u201D \u2192 \u201C' + String(after).slice(0, 60) + '\u201D' });
        }
      });
      if (story.history.length > 40) story.history.splice(0, story.history.length - 40);
      story.updatedAt = at;
    });
    return findStory(id);
  }

  /* Single status move with the full rule book applied. */
  function setStatus(id, to, why) {
    const st = findStory(id);
    const reason = D.transitionReason(st, to);
    if (reason) throw D.err(reason);
    const from = st.status;
    commit('Move ' + st.slug + ' to ' + to, (s) => {
      const story = s.stories.find((x) => x.id === id);
      const at = D.now();
      story.status = to;
      if (from === 'slotted' && to !== 'slotted') {
        for (const ed of s.editions) {
          const slot = ed.slots.find((x) => x.id === story.slotId);
          if (slot) {
            slot.storyId = null;
            slot.hold = false;
            log('edition', '\u201C' + story.headline + '\u201D pulled from ' + slot.label + ' (' + ed.name + ').');
            break;
          }
        }
        story.slotId = null;
      }
      if (from === 'killed' && to === 'pitch') { story.slotId = null; }
      if (to === 'archived') { story.archivedFrom = from; }
      const labelTxt = D.STATUS_MAP[from].label + ' \u2192 ' + D.STATUS_MAP[to].label + (why ? ' \u2014 ' + why : '');
      story.history.push({ at, kind: 'status', detail: labelTxt });
      if (story.history.length > 40) story.history.splice(0, story.history.length - 40);
      story.updatedAt = at;
      log('story', '\u201C' + story.headline + '\u201D: ' + labelTxt.toLowerCase());
    });
    return findStory(id);
  }

  function killStory(id, reason) {
    const st = findStory(id);
    if (D.transitionReason(st, 'killed')) throw D.err(D.transitionReason(st, 'killed'));
    commit('Kill story', (s) => {
      const story = s.stories.find((x) => x.id === id);
      const at = D.now();
      if (story.status === 'slotted') {
        for (const ed of s.editions) {
          const slot = ed.slots.find((x) => x.id === story.slotId);
          if (slot) { slot.storyId = null; slot.hold = false; log('edition', '\u201C' + story.headline + '\u201D pulled from ' + slot.label + ' (' + ed.name + ').'); break; }
        }
        story.slotId = null;
      }
      story.status = 'killed';
      story.history.push({ at, kind: 'status', detail: 'Killed' + (reason ? ' \u2014 ' + reason : '') });
      story.updatedAt = at;
      log('story', '\u201C' + story.headline + '\u201D killed' + (reason ? ' — ' + reason : ''));
    });
  }

  function archiveStories(ids) {
    const results = { moved: [], blocked: [] };
    const blockedIds = new Set();
    // Validate everything first so one bad id doesn't half-apply.
    ids.forEach((id) => {
      const st = state.stories.find((x) => x.id === id);
      if (!st) { results.blocked.push({ headline: '(missing story)', reason: 'Story no longer exists.' }); blockedIds.add(id); return; }
      if (!['published', 'killed'].includes(st.status)) {
        results.blocked.push({ headline: st.headline, reason: 'Only published or killed stories can be archived — \u201C' + st.headline + '\u201D is still ' + D.STATUS_MAP[st.status].label.toLowerCase() + '.' });
        blockedIds.add(id);
      }
    });
    const movable = ids.filter((id) => !blockedIds.has(id));
    if (!movable.length) throw D.err(results.blocked[0].reason);
    commit('Archive stories', (s) => {
      movable.forEach((id) => {
        const story = s.stories.find((x) => x.id === id);
        const at = D.now();
        story.archivedFrom = story.status;
        story.status = 'archived';
        story.history.push({ at, kind: 'status', detail: 'Archived' });
        story.updatedAt = at;
        results.moved.push(story.headline);
      });
      log('story', results.moved.length === 1 ? '\u201C' + results.moved[0] + '\u201D archived.' : results.moved.length + ' stories archived.');
    });
    return results;
  }

  function restoreStories(ids) {
    const moved = [];
    commit('Restore from archive', (s) => {
      ids.forEach((id) => {
        const story = s.stories.find((x) => x.id === id);
        if (!story || story.status !== 'archived') return;
        const back = story.archivedFrom && D.STATUS_MAP[story.archivedFrom] ? story.archivedFrom : 'killed';
        story.status = back;
        story.archivedFrom = null;
        story.history.push({ at: D.now(), kind: 'status', detail: 'Restored from archive \u2192 ' + D.STATUS_MAP[back].label });
        story.updatedAt = D.now();
        moved.push(story.headline);
      });
      if (moved.length) log('story', moved.length === 1 ? '\u201C' + moved[0] + '\u201D restored from the archive.' : moved.length + ' stories restored from the archive.');
    });
    return moved;
  }

  function deleteForever(ids) {
    const blocked = [];
    const deletable = [];
    ids.forEach((id) => {
      const st = state.stories.find((x) => x.id === id);
      if (!st) return;
      if (!['archived', 'killed'].includes(st.status)) {
        blocked.push('\u201C' + st.headline + '\u201D is ' + D.STATUS_MAP[st.status].label.toLowerCase() + ' — archive it first; live stories can\u2019t be destroyed.');
      } else deletable.push(st);
    });
    if (blocked.length) throw D.err(blocked[0]);
    if (!deletable.length) throw D.err('Nothing selected can be deleted.');
    commit('Delete forever', (s) => {
      const kill = new Set(deletable.map((x) => x.id));
      deletable.forEach((st) => {
        s.editions.forEach((ed) => ed.slots.forEach((sl) => { if (sl.storyId === st.id) { sl.storyId = null; sl.hold = false; } }));
      });
      const names = deletable.map((x) => '\u201C' + x.headline + '\u201D').join(', ');
      s.stories = s.stories.filter((x) => !kill.has(x.id));
      log('story', 'Deleted for good: ' + names + '.');
    });
  }

  function duplicateStory(id) {
    const src = findStory(id);
    let copy = null;
    commit('Duplicate story', (s) => {
      const at = D.now();
      const slug = suggestSlug(src.slug);
      copy = JSON.parse(JSON.stringify(src));
      copy.id = D.uid('st');
      copy.slug = slug;
      copy.status = 'pitch';
      copy.slotId = null;
      copy.publishedAt = null;
      copy.archivedFrom = null;
      copy.notes = [];
      copy.history = [{ at, kind: 'created', detail: 'Duplicated from \u201C' + src.slug + '\u201D' }];
      copy.createdAt = at;
      copy.updatedAt = at;
      s.stories.push(copy);
      log('story', '\u201C' + src.headline + '\u201D duplicated as pitch \u201C' + slug + '\u201D.');
    });
    return copy;
  }

  function addNote(storyId, text) {
    const st = findStory(storyId);
    const msg = D.validateField('note', text, { state });
    if (msg) throw D.err(msg);
    const note = { id: D.uid('nt'), at: D.now(), text: String(text).trim() };
    commit('Add note', (s) => {
      const story = s.stories.find((x) => x.id === storyId);
      story.notes.push(note);
      story.updatedAt = D.now();
      log('note', 'Note added on \u201C' + story.headline + '\u201D: \u201C' + note.text.slice(0, 60) + (note.text.length > 60 ? '\u2026' : '') + '\u201D');
    });
    return note;
  }

  function deleteNote(storyId, noteId) {
    commit('Delete note', (s) => {
      const story = s.stories.find((x) => x.id === storyId);
      const n = story.notes.find((x) => x.id === noteId);
      if (!n) throw D.err('That note is already gone.');
      story.notes = story.notes.filter((x) => x.id !== noteId);
      story.updatedAt = D.now();
      log('note', 'Note removed from \u201C' + story.headline + '\u201D.');
    });
  }

  /* ---------------- bulk operations ---------------- */
  function bulkSetStatus(ids, to, why) {
    const moved = [], blocked = [];
    ids.forEach((id) => {
      const st = state.stories.find((x) => x.id === id);
      if (!st) return;
      if (to === 'slotted') { blocked.push({ headline: st.headline, reason: 'Slotting goes through the Edition desk, one slot at a time.' }); return; }
      if (to === 'published') { blocked.push({ headline: st.headline, reason: 'Publishing happens when an edition publishes.' }); return; }
      const reason = D.transitionReason(st, to);
      if (reason) blocked.push({ headline: st.headline, reason });
      else moved.push(st);
    });
    if (!moved.length) throw D.err(blocked[0] ? blocked[0].reason : 'Nothing selected can move.');
    commit('Bulk move', (s) => {
      const byId = new Map(moved.map((m) => [m.id, m]));
      s.stories.forEach((story) => {
        if (!byId.has(story.id)) return;
        const from = story.status;
        const at = D.now();
        story.status = to;
        if (from === 'slotted') {
          for (const ed of s.editions) {
            const slot = ed.slots.find((x) => x.id === story.slotId);
            if (slot) { slot.storyId = null; slot.hold = false; break; }
          }
          story.slotId = null;
        }
        if (to === 'archived') story.archivedFrom = from;
        story.history.push({ at, kind: 'status', detail: D.STATUS_MAP[from].label + ' \u2192 ' + D.STATUS_MAP[to].label + ' (bulk)' });
        story.updatedAt = at;
      });
      log('story', moved.length + ' stories moved to ' + D.STATUS_MAP[to].label.toLowerCase() + (why ? ' — ' + why : '') + '.');
    });
    return { moved: moved.length, blocked };
  }

  function bulkReassign(ids, writerId) {
    const w = state.writers.find((x) => x.id === writerId);
    if (!w) throw D.err('Pick a writer to reassign to.');
    if (!w.active) throw D.err(w.name + ' is inactive — reactivate them in People first.');
    const moved = [], blocked = [];
    ids.forEach((id) => {
      const st = state.stories.find((x) => x.id === id);
      if (!st) return;
      if (['published', 'archived'].includes(st.status)) blocked.push({ headline: st.headline, reason: '\u201C' + st.headline + '\u201D is ' + st.status + ' — the credit line is history now.' });
      else if (st.writerId === writerId) blocked.push({ headline: st.headline, reason: '\u201C' + st.headline + '\u201D is already ' + w.name + '\u2019s.' });
      else moved.push(st);
    });
    if (!moved.length) throw D.err(blocked[0] ? blocked[0].reason : 'Nothing to reassign.');
    commit('Reassign stories', (s) => {
      const byId = new Set(moved.map((m) => m.id));
      s.stories.forEach((story) => {
        if (!byId.has(story.id)) return;
        story.writerId = writerId;
        story.updatedAt = D.now();
        story.history.push({ at: D.now(), kind: 'field', detail: 'writerId \u2192 ' + w.name });
      });
      log('people', moved.length + ' ' + (moved.length === 1 ? 'story' : 'stories') + ' reassigned to ' + w.name + '.');
    });
    return { moved: moved.length, blocked };
  }

  function bumpDue(ids, days) {
    const moved = [], blocked = [];
    ids.forEach((id) => {
      const st = state.stories.find((x) => x.id === id);
      if (!st) return;
      if (!st.due) { blocked.push({ headline: st.headline, reason: '\u201C' + st.headline + '\u201D has no due date to push.' }); return; }
      if (st.status === 'published' || st.status === 'archived') blocked.push({ headline: st.headline, reason: '\u201C' + st.headline + '\u201D is finished — its deadline is history.' });
      else moved.push(st);
    });
    if (!moved.length) throw D.err(blocked[0] ? blocked[0].reason : 'Nothing selected has a movable due date.');
    commit('Push due dates', (s) => {
      const byId = new Set(moved.map((m) => m.id));
      s.stories.forEach((story) => {
        if (!byId.has(story.id)) return;
        const d = D.parseDate(story.due);
        d.setDate(d.getDate() + days);
        story.due = D.dateToStr(d);
        story.updatedAt = D.now();
        story.history.push({ at: D.now(), kind: 'field', detail: 'due pushed ' + (days > 0 ? '+' : '') + days + ' days \u2192 ' + story.due });
      });
      log('story', 'Due date pushed ' + (days > 0 ? 'back ' + days + ' days' : 'forward ' + Math.abs(days) + ' days') + ' on ' + moved.length + ' stories.');
    });
    return { moved: moved.length, blocked };
  }

  /* ---------------- writers ---------------- */
  function createWriter(fields) {
    const name = String(fields.name || '').trim();
    if (!name) throw D.err('A writer needs a name.');
    if (name.length > 60) throw D.err('Names are capped at 60 characters — initials work fine.');
    if (state.writers.some((w) => w.name.toLowerCase() === name.toLowerCase())) throw D.err('There\u2019s already a ' + name + ' on the desk — add a middle initial to tell them apart.');
    const capacity = Number(fields.capacity);
    if (!Number.isFinite(capacity) || capacity < 100 || capacity > 40000) throw D.err('Weekly capacity is between 100 and 40,000 words.');
    const colors = ['#7c4a2d', '#34547a', '#58652e', '#7a3a63', '#2e5f52', '#6b5a26', '#4a3d78', '#6d2f2f', '#3a3a3a'];
    const w = {
      id: D.uid('w'), name, beat: String(fields.beat || '').trim().slice(0, 60),
      capacity: Math.round(capacity), active: true,
      color: colors[state.writers.length % colors.length], createdAt: D.now(),
    };
    commit('Add writer', (s) => {
      s.writers.push(w);
      log('people', w.name + ' joined the desk' + (w.beat ? ' (' + w.beat + ')' : '') + '.');
    });
    return w;
  }

  function updateWriter(id, patch) {
    const w = state.writers.find((x) => x.id === id);
    if (!w) throw D.err('That writer is no longer on the desk.');
    if (patch.name !== undefined) {
      const name = String(patch.name).trim();
      if (!name) throw D.err('A writer needs a name.');
      if (state.writers.some((x) => x.id !== id && x.name.toLowerCase() === name.toLowerCase())) throw D.err('There\u2019s already a ' + name + ' on the desk.');
      w.name = name;
    }
    if (patch.beat !== undefined) w.beat = String(patch.beat).trim().slice(0, 60);
    if (patch.capacity !== undefined) {
      const c = Number(patch.capacity);
      if (!Number.isFinite(c) || c < 100 || c > 40000) throw D.err('Weekly capacity is between 100 and 40,000 words.');
      w.capacity = Math.round(c);
    }
    commit('Edit writer', (s) => {
      const story = s.writers.find((x) => x.id === id);
      Object.assign(story, patch);
      log('people', 'Details updated for ' + story.name + '.');
    });
  }

  function deactivateWriter(id) {
    const w = state.writers.find((x) => x.id === id);
    if (!w) throw D.err('That writer is no longer on the desk.');
    const block = D.writerDeactivationBlock(state, w);
    if (block) throw D.err(block);
    if (!w.active) throw D.err(w.name + ' is already inactive.');
    commit('Deactivate writer', (s) => {
      const story = s.writers.find((x) => x.id === id);
      story.active = false;
      log('people', story.name + ' moved off the desk (deactivated).');
    });
  }

  function reactivateWriter(id) {
    const w = state.writers.find((x) => x.id === id);
    if (!w) throw D.err('That writer is no longer on the desk.');
    if (w.active) throw D.err(w.name + ' is already on the desk.');
    commit('Reactivate writer', (s) => {
      const story = s.writers.find((x) => x.id === id);
      story.active = true;
      log('people', story.name + ' is back on the desk.');
    });
  }

  function deleteWriter(id) {
    const w = state.writers.find((x) => x.id === id);
    if (!w) throw D.err('That writer is no longer on the desk.');
    const block = D.writerDeleteBlock(state, w);
    if (block) throw D.err(block);
    commit('Delete writer', (s) => {
      const name = w.name;
      s.writers = s.writers.filter((x) => x.id !== id);
      log('people', name + ' removed from the desk (no stories were credited).');
    });
  }

  /* ---------------- editions ---------------- */
  function defaultSlots() {
    return [
      { id: D.uid('sl'), label: 'Front \u2014 lead', section: 'News', storyId: null, hold: false },
      { id: D.uid('sl'), label: 'Front \u2014 secondary', section: 'any', storyId: null, hold: false },
      { id: D.uid('sl'), label: 'Page 3 \u2014 News', section: 'News', storyId: null, hold: false },
      { id: D.uid('sl'), label: 'Business', section: 'Business', storyId: null, hold: false },
      { id: D.uid('sl'), label: 'Culture \u2014 spread', section: 'Culture', storyId: null, hold: false },
      { id: D.uid('sl'), label: 'Opinion \u2014 column', section: 'Opinion', storyId: null, hold: false },
      { id: D.uid('sl'), label: 'Back page', section: 'any', storyId: null, hold: false },
    ];
  }

  function createEdition(fields) {
    const number = state.editions.reduce((m, e) => Math.max(m, e.number), 126) + 1;
    const date = fields && fields.date && D.parseDate(fields.date) ? fields.date : D.todayStr();
    const ed = {
      id: D.uid('ed'), number, name: 'No. ' + number, date, status: 'draft',
      createdAt: D.now(), publishedAt: null, slots: defaultSlots(),
    };
    commit('Create edition', (s) => {
      s.editions.unshift(ed);
      s.ui.editionId = ed.id;
      log('edition', ed.name + ' opened for ' + D.fmtDate(ed.date) + ' with 7 slots.');
    });
    return ed;
  }

  function switchEdition(id) {
    if (!state.editions.some((e) => e.id === id)) throw D.err('That edition doesn\u2019t exist.');
    state.ui.editionId = id;
    scheduleSave();
    notify();
  }

  function addSlot(editionId, label, section) {
    const ed = state.editions.find((e) => e.id === editionId);
    if (!ed) throw D.err('That edition doesn\u2019t exist.');
    if (ed.status === 'published') throw D.err('No. ' + ed.number + ' is published and locked — open a new edition.');
    const lbl = String(label || '').trim();
    if (!lbl) throw D.err('Give the slot a name — \u201CFront \u2014 lead\u201D or \u201CPage 7\u201D works.');
    if (lbl.length > 40) throw D.err('Slot names are capped at 40 characters.');
    if (!['any'].concat(D.SECTIONS).includes(section)) throw D.err('Slots run a section, or \u201Cany\u201D for wildcard.');
    let slot = null;
    commit('Add slot', (s) => {
      const edition = s.editions.find((e) => e.id === editionId);
      slot = { id: D.uid('sl'), label: lbl, section, storyId: null, hold: false };
      edition.slots.push(slot);
      log('edition', slot.label + ' added to ' + edition.name + '.');
    });
    return slot;
  }

  function removeSlot(slotId) {
    const found = findSlot(slotId);
    if (found.ed.status === 'published') throw D.err('No. ' + found.ed.number + ' is published and locked.');
    commit('Remove slot', (s) => {
      const edition = s.editions.find((e) => e.id === found.ed.id);
      const slot = edition.slots.find((x) => x.id === slotId);
      if (slot.storyId) {
        const st = s.stories.find((x) => x.id === slot.storyId);
        if (st) {
          st.slotId = null;
          st.status = 'ready';
          st.history.push({ at: D.now(), kind: 'status', detail: 'Unslotted \u2014 ' + slot.label + ' removed from ' + edition.name });
          st.updatedAt = D.now();
        }
      }
      edition.slots = edition.slots.filter((x) => x.id !== slotId);
      log('edition', slot.label + ' removed from ' + edition.name + '.');
    });
  }

  function renameSlot(slotId, label) {
    const found = findSlot(slotId);
    if (found.ed.status === 'published') throw D.err('No. ' + found.ed.number + ' is published and locked.');
    const lbl = String(label || '').trim();
    if (!lbl) throw D.err('Give the slot a name.');
    if (lbl.length > 40) throw D.err('Slot names are capped at 40 characters.');
    commit('Rename slot', (s) => {
      const slot = s.editions.find((e) => e.id === found.ed.id).slots.find((x) => x.id === slotId);
      const before = slot.label;
      slot.label = lbl;
      log('edition', 'Slot \u201C' + before + '\u201D renamed to \u201C' + lbl + '\u201D in ' + found.ed.name + '.');
    });
  }

  function setSlotSection(slotId, section) {
    const found = findSlot(slotId);
    if (found.ed.status === 'published') throw D.err('No. ' + found.ed.number + ' is published and locked.');
    if (!['any'].concat(D.SECTIONS).includes(section)) throw D.err('Slots run a section, or \u201Cany\u201D for wildcard.');
    commit('Set slot section', (s) => {
      const slot = s.editions.find((e) => e.id === found.ed.id).slots.find((x) => x.id === slotId);
      if (slot.storyId) {
        const st = s.stories.find((x) => x.id === slot.storyId);
        if (st && slot.section !== 'any' && section !== 'any' && st.section !== section) {
          throw D.err(slot.label + ' currently holds \u201C' + st.headline + '\u201D (' + st.section + ') — pull it before switching this slot to ' + section + '.');
        }
      }
      slot.section = section;
      log('edition', slot.label + ' now runs ' + (section === 'any' ? 'any section' : section) + '.');
    });
  }

  function findSlot(slotId) {
    for (const ed of state.editions) {
      const slot = ed.slots.find((x) => x.id === slotId);
      if (slot) return { ed, slot };
    }
    throw D.err('That slot no longer exists.');
  }

  function assignSlot(slotId, storyId) {
    const found = findSlot(slotId);
    const st = state.stories.find((x) => x.id === storyId);
    if (!st) throw D.err('That story is no longer on the desk.');
    const problem = D.slotProblem(state, found.slot, st);
    if (problem) throw D.err(problem);
    commit('Slot story', (s) => {
      const edition = s.editions.find((e) => e.id === found.ed.id);
      const slot = edition.slots.find((x) => x.id === slotId);
      const story = s.stories.find((x) => x.id === storyId);
      slot.storyId = story.id;
      slot.hold = false;
      story.status = 'slotted';
      story.slotId = slot.id;
      story.updatedAt = D.now();
      story.history.push({ at: D.now(), kind: 'status', detail: 'Ready \u2192 Slotted \u2014 ' + slot.label + ' (' + edition.name + ')' });
      log('edition', '\u201C' + story.headline + '\u201D slotted \u2014 ' + slot.label + ' (' + edition.name + ').');
    });
  }

  function unslot(slotId) {
    const found = findSlot(slotId);
    if (!found.slot.storyId) throw D.err('That slot is already empty.');
    commit('Pull from slot', (s) => {
      const edition = s.editions.find((e) => e.id === found.ed.id);
      const slot = edition.slots.find((x) => x.id === slotId);
      const story = s.stories.find((x) => x.id === slot.storyId);
      slot.storyId = null;
      slot.hold = false;
      if (story) {
        story.status = 'ready';
        story.slotId = null;
        story.updatedAt = D.now();
        story.history.push({ at: D.now(), kind: 'status', detail: 'Slotted \u2192 Ready \u2014 pulled from ' + slot.label });
        log('edition', '\u201C' + story.headline + '\u201D pulled from ' + slot.label + ' (' + edition.name + ') — back to Ready.');
      }
    });
  }

  function toggleHold(slotId) {
    const found = findSlot(slotId);
    if (found.ed.status === 'published') throw D.err('No. ' + found.ed.number + ' is published and locked.');
    if (!found.slot.storyId) throw D.err('Holds apply to slotted stories — this slot is empty.');
    commit('Toggle hold', (s) => {
      const slot = s.editions.find((e) => e.id === found.ed.id).slots.find((x) => x.id === slotId);
      slot.hold = !slot.hold;
      const st = s.stories.find((x) => x.id === slot.storyId);
      log('edition', (slot.hold ? 'Hold set on ' : 'Hold cleared on ') + slot.label + ' (' + (st ? st.headline : '') + ').');
    });
  }

  function publishEdition(editionId) {
    const ed = state.editions.find((e) => e.id === editionId);
    if (!ed) throw D.err('That edition doesn\u2019t exist.');
    if (ed.status === 'published') throw D.err('No. ' + ed.number + ' is already published.');
    const problems = D.publishProblems(state, ed);
    const block = problems.find((p) => p.level === 'block');
    if (block) throw D.err(block.text);
    commit('Publish ' + ed.name, (s) => {
      const edition = s.editions.find((e) => e.id === editionId);
      const at = D.now();
      const ids = [];
      edition.slots.forEach((slot) => {
        if (!slot.storyId) return;
        const st = s.stories.find((x) => x.id === slot.storyId);
        st.status = 'published';
        st.publishedAt = at;
        st.updatedAt = at;
        st.history.push({ at, kind: 'status', detail: 'Slotted \u2192 Published \u2014 ' + edition.name + ' published' });
        ids.push(st.headline);
      });
      edition.status = 'published';
      edition.publishedAt = at;
      const empties = edition.slots.filter((x) => !x.storyId).length;
      log('edition', edition.name + ' published for ' + D.fmtDate(edition.date) + ' \u2014 ' + ids.length + ' stories went to print' + (empties ? ', ' + empties + ' slot' + (empties > 1 ? 's' : '') + ' left empty' : '') + '.');
    });
  }

  /* ---------------- saved views ---------------- */
  function saveView(name, filters, sort) {
    const nm = String(name || '').trim();
    if (!nm) throw D.err('Give the view a name — \u201COverdue Sport\u201D tells you more than \u201CView 1\u201D.');
    if (nm.length > 40) throw D.err('View names are capped at 40 characters.');
    if (state.views.some((v) => v.name.toLowerCase() === nm.toLowerCase())) throw D.err('A view called \u201C' + nm + '\u201D already exists — pick a fresh name.');
    const v = { id: D.uid('vw'), name: nm, builtin: false, filters: JSON.parse(JSON.stringify(filters)), sort: JSON.parse(JSON.stringify(sort)) };
    commit('Save view', (s) => {
      s.views.push(v);
      log('data', 'View \u201C' + nm + '\u201D saved.');
    });
    state.ui.viewId = v.id;
    scheduleSave();
    notify();
    return v;
  }

  function deleteView(id) {
    const v = state.views.find((x) => x.id === id);
    if (!v) throw D.err('That view is already gone.');
    if (v.builtin) throw D.err('Built-in views can\u2019t be deleted — they\u2019re the desk\u2019s muscle memory.');
    commit('Delete view', (s) => {
      s.views = s.views.filter((x) => x.id !== id);
      if (s.ui.viewId === id) s.ui.viewId = null;
      log('data', 'View \u201C' + v.name + '\u201D deleted.');
    });
  }

  /* ---------------- global data ops ---------------- */
  function exportPayload() {
    return {
      app: 'galley',
      name: 'Galley story desk export',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: D.now(),
      paperName: state.meta.paperName,
      data: {
        meta: state.meta,
        writers: state.writers,
        stories: state.stories,
        editions: state.editions,
        views: state.views.filter((v) => !v.builtin),
        activity: state.activity,
      },
    };
  }

  function storiesCsv() {
    const head = ['slug', 'headline', 'standfirst', 'section', 'writer', 'status', 'priority', 'due', 'wordTarget', 'wordCount', 'tags', 'edition', 'createdAt', 'updatedAt'];
    const rows = [head.join(',')];
    const byId = new Map(state.stories.map((s) => [s.id, s]));
    state.stories.forEach((st) => {
      const w = state.writers.find((x) => x.id === st.writerId);
      const ed = st.slotId ? state.editions.find((e) => e.slots.some((s) => s.id === st.slotId)) : null;
      rows.push([st.slug, st.headline, st.standfirst, st.section, w ? w.name : '', st.status, st.priority, st.due,
        st.wordTarget, st.wordCount, st.tags.join(' '), ed ? ed.name : '', st.createdAt, st.updatedAt].map(D.csvCell).join(','));
    });
    return rows.join('\r\n');
  }

  function download(filename, text, mime) {
    try {
      const blob = new Blob([text], { type: (mime || 'application/octet-stream') + ';charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
      return true;
    } catch (e) {
      throw D.err('The browser blocked the download (' + (e && e.name ? e.name : 'error') + ') — copy the JSON from the export dialog instead.');
    }
  }

  function exportJson() {
    const payload = exportPayload();
    const stamp = D.todayStr();
    download('galley-desk-' + stamp + '.json', JSON.stringify(payload, null, 2), 'application/json');
    log('data', 'Desk exported as JSON (' + state.stories.length + ' stories).');
    scheduleSave();
    notify();
  }

  function exportCsv() {
    const stamp = D.todayStr();
    download('galley-stories-' + stamp + '.csv', storiesCsv(), 'text/csv');
    log('data', 'Stories exported as CSV.');
    scheduleSave();
    notify();
  }

  /* Import: validates, optionally migrates, then merges or replaces.
     Returns a report; nothing is applied until applyImport runs. */
  function inspectImport(text) {
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      throw D.err('That file isn\u2019t valid JSON — line ' + ((/position (\d+)/.exec(e.message) || [])[1] ? 'near byte ' + (/position (\d+)/.exec(e.message) || [])[1] : 'unknown') + '. If you edited it by hand, a comma or quote probably went missing.');
    }
    if (!payload || typeof payload !== 'object') throw D.err('That file parsed, but it isn\u2019t an object — a Galley export looks like { "app": "galley", \u2026 }.');
    if (payload.app !== 'galley' || !payload.data) {
      throw D.err('That\u2019s valid JSON, but not a Galley export (expected "app": "galley" and a "data" block).');
    }
    const version = Number(payload.schemaVersion);
    if (!Number.isFinite(version) || version > SCHEMA_VERSION) {
      throw D.err('That export is from a newer Galley (schema ' + version + ' — this build reads up to ' + SCHEMA_VERSION + '). Update Galley, or re-export from the older version.');
    }
    if (version < SCHEMA_VERSION) {
      let v = version;
      let data = payload;
      while (v < SCHEMA_VERSION) {
        const step = MIGRATIONS[v + 1];
        if (typeof step !== 'function') break;
        data = step(data);
        v++;
      }
      payload = data;
    }
    const d = payload.data;
    const counts = {
      stories: Array.isArray(d.stories) ? d.stories.length : 0,
      writers: Array.isArray(d.writers) ? d.writers.length : 0,
      editions: Array.isArray(d.editions) ? d.editions.length : 0,
      views: Array.isArray(d.views) ? d.views.length : 0,
      exportedAt: payload.exportedAt || null,
      paperName: payload.paperName || '',
    };
    return { payload, counts };
  }

  function applyImport(parsed, mode) {
    const d = parsed.payload.data;
    const report = { added: 0, updated: 0, kept: 0 };
    commit(mode === 'replace' ? 'Import — replace desk' : 'Import — merge desk', (s) => {
      if (mode === 'replace') {
        s.writers = d.writers || [];
        s.stories = d.stories || [];
        s.editions = d.editions || [];
        s.views = (d.views || []).map((v) => Object.assign({}, v, { builtin: false }));
        if (Array.isArray(d.activity)) s.activity = d.activity;
        if (d.meta && d.meta.paperName) s.meta.paperName = d.meta.paperName;
        report.added = s.stories.length;
        s.ui.viewId = null;
        s.ui.editionId = (s.editions.find((e) => e.status === 'draft') || s.editions[0] || {}).id || null;
        normalize(s);
      } else {
        const storyById = new Map(s.stories.map((x) => [x.id, x]));
        (d.stories || []).forEach((st) => {
          const cur = storyById.get(st.id);
          if (!cur) { s.stories.push(st); report.added++; }
          else if ((st.updatedAt || '') > (cur.updatedAt || '')) {
            Object.assign(cur, st); report.updated++;
          } else report.kept++;
        });
        const writerById = new Map(s.writers.map((x) => [x.id, x]));
        (d.writers || []).forEach((w) => {
          if (!writerById.has(w.id)) s.writers.push(w);
        });
        const edById = new Set(s.editions.map((x) => x.id));
        (d.editions || []).forEach((ed) => {
          if (!edById.has(ed.id)) s.editions.push(ed);
        });
        const viewNames = new Set(s.views.map((x) => x.name.toLowerCase()));
        (d.views || []).forEach((v) => {
          if (!viewNames.has(String(v.name).toLowerCase())) s.views.push(Object.assign({}, v, { builtin: false }));
        });
        normalize(s);
      }
      log('data', 'Import (' + mode + ') applied: ' + report.added + ' added, ' + report.updated + ' updated from file, ' + report.kept + ' kept as-is.');
    });
    return report;
  }

  function resetSample(backupFirst) {
    if (backupFirst) {
      try { exportJson(); } catch (e) { throw D.err('Couldn\u2019t write the backup: ' + e.userMessage); }
    }
    commit('Reset to sample desk', (s) => {
      const fresh = G.data.sample();
      fresh.meta.onboarded = true;
      fresh.meta.createdAt = s.meta.createdAt;
      s.schemaVersion = fresh.schemaVersion;
      s.meta = fresh.meta;
      s.writers = fresh.writers;
      s.stories = fresh.stories;
      s.editions = fresh.editions;
      s.views = fresh.views;
      s.activity = fresh.activity;
      s.ui = fresh.ui;
      clearHistory();
      log('data', 'Desk reset to the sample paper (The Calder Weekly).');
    });
  }

  function startEmpty(backupFirst) {
    if (backupFirst) {
      try { exportJson(); } catch (e) { throw D.err('Couldn\u2019t write the backup: ' + e.userMessage); }
    }
    commit('Start empty desk', (s) => {
      const fresh = G.data.blank();
      fresh.meta.onboarded = true;
      fresh.meta.createdAt = s.meta.createdAt;
      s.schemaVersion = fresh.schemaVersion;
      s.meta = fresh.meta;
      s.writers = fresh.writers;
      s.stories = fresh.stories;
      s.editions = fresh.editions;
      s.views = fresh.views;
      s.activity = fresh.activity;
      s.ui = fresh.ui;
      clearHistory();
      log('data', 'Fresh desk started.');
    });
  }

  function markOnboarded() {
    state.meta.onboarded = true;
    touch();
    scheduleSave();
    notify();
  }

  /* Persist UI-only tweaks (filters, sort, view picks) without a full commit. */
  function scheduleSaveRemote() {
    scheduleSave();
    notify();
  }

  function setPaperName(name) {
    const n = String(name || '').trim().slice(0, 60);
    if (!n) throw D.err('The paper needs a name — even \u201CUntitled Weekly\u201D beats blank.');
    commit('Rename paper', (s) => {
      s.meta.paperName = n;
      log('data', 'Paper renamed to \u201C' + n + '\u201D.');
    });
  }

  /* ---------------- introspection for UI ---------------- */
  function storageHealth() {
    let bytes = 0;
    try { bytes = (window.localStorage.getItem(STORAGE_KEY) || '').length * 2; } catch (e) { bytes = 0; }
    return { ok: storageOk, msg: storageMsg, bytes, lastSavedAt, quota: 5 * 1024 * 1024 };
  }

  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  /* ---------------- export ---------------- */
  G.store = {
    init, subscribe, commit, touch,
    get state() { return state; },
    get canUndo() { return undoStack.length > 0; },
    get canRedo() { return redoStack.length > 0; },
    get undoLabel() { return undoStack.length ? undoStack[undoStack.length - 1].label : null; },
    get redoLabel() { return redoStack.length ? redoStack[redoStack.length - 1].label : null; },
    get remoteChange() { return remoteChange; },
    undo, redo, clearHistory, dismissRemote,
    flushSave, storageHealth, scheduleSaveRemote,
    suggestSlug, validateAll,
    createStory, updateStory, setStatus, killStory, archiveStories, restoreStories, deleteForever,
    duplicateStory, addNote, deleteNote,
    bulkSetStatus, bulkReassign, bumpDue,
    createWriter, updateWriter, deactivateWriter, reactivateWriter, deleteWriter,
    createEdition, switchEdition, addSlot, removeSlot, renameSlot, setSlotSection,
    assignSlot, unslot, toggleHold, publishEdition,
    saveView, deleteView,
    exportPayload, storiesCsv, exportJson, exportCsv, inspectImport, applyImport,
    resetSample, startEmpty, markOnboarded, setPaperName,
  };
})();
