/* ============================================================
   Galley — story desk for small newsrooms
   domain.js — pure rules, validation, search, sort, formatting
   No DOM access in this file.
   ============================================================ */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const DAY = 86400000;

  /* ---------- tiny utils ---------- */
  const uid = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = () => new Date().toISOString();
  function err(msg) {
    const e = new Error(msg);
    e.userMessage = msg;
    return e;
  }
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function pad2(n) { return String(n).padStart(2, '0'); }

  /* Dates are stored as 'YYYY-MM-DD' (local), timestamps as ISO strings. */
  function parseDate(s) {
    if (!s || typeof s !== 'string') return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  function dateToStr(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function todayStr() { return dateToStr(new Date()); }
  function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function daysUntil(dateStr) {
    const d = parseDate(dateStr);
    if (!d) return null;
    return Math.round((d.getTime() - startOfToday().getTime()) / DAY);
  }
  function fmtDate(dateStr) {
    const d = parseDate(dateStr);
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function fmtDateShort(dateStr) {
    const d = parseDate(dateStr);
    if (!d) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  function fmtTime(isoTs) {
    const d = new Date(isoTs);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  function relTime(isoTs) {
    const d = new Date(isoTs);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    if (diff < 45e3) return 'just now';
    if (diff < 3600e3) return Math.round(diff / 60e3) + 'm ago';
    if (diff < 22 * 3600e3) return Math.round(diff / 3600e3) + 'h ago';
    const days = Math.round(diff / DAY);
    if (days === 1) return 'yesterday';
    if (days < 7) return days + 'd ago';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  function fmtDateTime(isoTs) {
    const d = new Date(isoTs);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + fmtTime(isoTs);
  }
  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }
  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/);
    return ((parts[0] || '')[0] || '?') + ((parts[1] || '')[0] || '');
  }
  function isTyping(e) {
    const t = e.target;
    if (!t) return false;
    const tag = (t.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
  }
  function csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /* ---------- desk vocabulary ---------- */
  const SECTIONS = ['News', 'Business', 'Culture', 'Sport', 'Opinion', 'Outdoors'];

  const STATUSES = [
    { id: 'pitch',    label: 'Pitch',     icon: 'lamp',    hint: 'Idea on the books — no writer yet' },
    { id: 'assigned', label: 'Assigned',  icon: 'user',    hint: 'Writer on it, writing not started' },
    { id: 'draft',    label: 'Draft',     icon: 'pen',     hint: 'Being written' },
    { id: 'edit',     label: 'In edit',   icon: 'scissors',hint: 'With the desk' },
    { id: 'ready',    label: 'Ready',     icon: 'check',   hint: 'Approved — waiting for a slot' },
    { id: 'slotted',  label: 'Slotted',   icon: 'layout',  hint: 'Placed in an edition' },
    { id: 'published',label: 'Published', icon: 'press',   hint: 'In the paper' },
    { id: 'killed',   label: 'Killed',    icon: 'cross',   hint: 'Pulled from the desk' },
    { id: 'archived', label: 'Archived',  icon: 'box',     hint: 'Filed away' },
  ];
  const STATUS_MAP = {};
  STATUSES.forEach((s) => { STATUS_MAP[s.id] = s; });

  const ACTIVE_STATUSES = ['pitch', 'assigned', 'draft', 'edit', 'ready', 'slotted'];
  const BOARD_STATUSES = ['pitch', 'assigned', 'draft', 'edit', 'ready', 'slotted'];
  const TERMINAL_STATUSES = ['published', 'killed', 'archived'];

  const PRIORITIES = [
    { id: 'normal', label: 'Normal' },
    { id: 'high',   label: 'High' },
    { id: 'lead',   label: 'Lead' },
  ];

  /* Status machine. A story may only move along these edges. */
  const TRANSITIONS = {
    pitch:     ['assigned', 'killed'],
    assigned:  ['draft', 'killed'],
    draft:     ['edit', 'assigned', 'killed'],
    edit:      ['ready', 'draft', 'killed'],
    ready:     ['slotted', 'killed'],
    slotted:   ['ready', 'killed'],
    published: ['archived'],
    killed:    ['archived', 'pitch'],
    archived:  [],
  };

  /* Plain-language nouns for rejection messages. */
  const STATUS_NOUN = {
    pitch: 'A pitch',
    assigned: 'An assigned story',
    draft: 'A draft',
    edit: 'A story in edit',
    ready: 'A ready story',
    slotted: 'A slotted story',
    published: 'A published story',
    killed: 'A killed story',
    archived: 'An archived story',
  };

  /* Returns null when the move is legal, otherwise a plain-language reason. */
  function transitionReason(story, to) {
    const from = story.status;
    if (from === to) return 'Already ' + STATUS_MAP[from].label.toLowerCase() + '.';
    const allowed = TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      if (to === 'slotted') return 'Stories are slotted from the Edition desk, where a real slot takes them.';
      if (to === 'published') return 'A story publishes when its edition is published — do it from the Edition desk.';
      if (from === 'published') return 'Published stories are finished — archive them instead.';
      return (STATUS_NOUN[from] || 'A story') + ' can\u2019t move straight to \u201C' + STATUS_MAP[to].label.toLowerCase() + '\u201D.';
    }
    if (to === 'assigned' && !story.writerId) return 'Pick a writer first — a story can\u2019t be assigned to nobody.';
    if (to === 'edit' && !(Number(story.wordCount) > 0)) return 'Log a word count before sending it to the desk — the desk edits words, not intentions.';
    return null;
  }

  /* Moves a story may legally make right now (for menus + board drops). */
  function movesFor(story) {
    const targets = [];
    BOARD_STATUSES.forEach((s) => { if (s !== story.status) targets.push(s); });
    if (story.status === 'killed') targets.push('pitch');
    if (story.status === 'published' || story.status === 'killed') targets.push('archived');
    return targets.map((to) => ({ to, reason: transitionReason(story, to) }));
  }

  /* ---------- field validation (specific, plain-language) ---------- */
  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function validateField(field, value, ctx) {
    const state = ctx.state;
    const selfId = ctx.selfId || null;
    switch (field) {
      case 'headline': {
        const v = String(value || '').trim();
        if (!v) return 'A headline is required — even a working one.';
        if (v.length < 5) return 'Headline needs at least 5 characters (this one has ' + v.length + ').';
        if (v.length > 120) return 'Headlines are capped at 120 characters (this one is ' + v.length + ').';
        return null;
      }
      case 'slug': {
        const v = String(value || '').trim();
        if (!v) return 'A slug is required — it\u2019s the story\u2019s file name on the desk.';
        if (v.length < 3) return 'Slug needs at least 3 characters (this one has ' + v.length + ').';
        if (v.length > 40) return 'Slugs are capped at 40 characters (this one is ' + v.length + ').';
        if (!SLUG_RE.test(v)) return 'Slugs are lowercase letters, numbers and single dashes — like \u201Ccouncil-vote\u201D.';
        const clash = state.stories.find((s) => s.slug === v.toLowerCase() && s.id !== selfId && s.status !== 'archived');
        if (clash) return 'Slug \u201C' + v + '\u201D is already taken by \u201C' + (clash.headline || clash.slug) + '\u201D — slugs must be unique.';
        return null;
      }
      case 'section':
        if (!SECTIONS.includes(value)) return 'Pick one of the paper\u2019s sections: ' + SECTIONS.join(', ') + '.';
        return null;
      case 'writerId': {
        if (!value) return null; // pitch may have no writer
        const w = state.writers.find((x) => x.id === value);
        if (!w) return 'That writer doesn\u2019t exist on this desk.';
        if (!w.active) return w.name + ' is inactive — pick someone on the desk, or reactivate them in People.';
        return null;
      }
      case 'wordTarget': {
        const n = Number(value);
        if (!Number.isFinite(n) || !Number.isInteger(n)) return 'Word target must be a whole number.';
        if (n < 100 || n > 10000) return 'Word target is between 100 and 10,000 words (a Weekly story has never run longer).';
        return null;
      }
      case 'wordCount': {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) return 'Word count can\u2019t be negative.';
        if (n > 100000) return 'Word count is capped at 100,000 — this is a weekly, not a novella.';
        return null;
      }
      case 'due': {
        if (!value) return null;
        if (!parseDate(value)) return 'That date didn\u2019t parse — use the date picker (YYYY-MM-DD).';
        return null;
      }
      case 'standfirst': {
        const v = String(value || '');
        if (v.length > 240) return 'Standfirsts are capped at 240 characters (this one is ' + v.length + ').';
        return null;
      }
      case 'note': {
        const v = String(value || '').trim();
        if (!v) return 'Write the note before adding it.';
        if (v.length > 600) return 'Notes are capped at 600 characters (this one is ' + v.length + ') — put the rest in the story itself.';
        return null;
      }
      default:
        return null;
    }
  }

  function normalizeTags(raw) {
    const arr = Array.isArray(raw) ? raw : String(raw || '').split(',');
    const seen = new Set();
    const out = [];
    arr.forEach((t) => {
      const v = String(t).trim().toLowerCase().replace(/\s+/g, '-').slice(0, 24);
      if (v && !seen.has(v)) { seen.add(v); out.push(v); }
    });
    return out.slice(0, 6);
  }

  /* ---------- derived facts ---------- */
  function dueState(story) {
    if (!story.due) return null;
    if (TERMINAL_STATUSES.includes(story.status)) return null;
    const d = daysUntil(story.due);
    if (d == null) return null;
    if (d < 0) return 'overdue';
    if (d === 0) return 'today';
    if (d <= 3) return 'soon';
    return 'later';
  }
  function isOverdue(story) { return dueState(story) === 'overdue'; }
  function isLate(story) {
    const st = dueState(story);
    return st === 'overdue' || st === 'today';
  }

  function editionOfStory(state, story) {
    if (!story.slotId) return null;
    for (const ed of state.editions) {
      const slot = ed.slots.find((s) => s.id === story.slotId);
      if (slot) return { edition: ed, slot };
    }
    return null;
  }
  function activeEdition(state) {
    return state.editions.find((e) => e.id === state.ui.editionId) || state.editions.find((e) => e.status === 'draft') || null;
  }
  function writerOf(state, story) {
    return state.writers.find((w) => w.id === story.writerId) || null;
  }

  /* ---------- filtering / search / sort ---------- */
  function defaultFilters() {
    return { q: '', sections: [], status: '', writer: '', tag: '', overdue: false };
  }

  function statusInFilter(story, f) {
    if (f.status === 'active') return ACTIVE_STATUSES.includes(story.status);
    if (f.status) return story.status === f.status;
    return true;
  }

  function storyMatches(story, f, ctx) {
    if (!statusInFilter(story, f)) return false;
    if (f.sections && f.sections.length && !f.sections.includes(story.section)) return false;
    if (f.writer) {
      if (f.writer === '__none') { if (story.writerId) return false; }
      else if (story.writerId !== f.writer) return false;
    }
    if (f.tag && !story.tags.includes(f.tag)) return false;
    if (f.overdue && !isOverdue(story)) return false;
    if (f.q) {
      const toks = f.q.toLowerCase().split(/\s+/).filter(Boolean);
      if (toks.length) {
        const w = ctx.writerById(story.writerId);
        const ed = editionOfStory(ctx.state, story);
        const hay = [story.headline, story.slug, story.standfirst, story.section, w ? w.name : '',
          story.tags.join(' '), story.notes.map((n) => n.text).join(' '),
          ed ? ed.edition.name : ''].join(' ').toLowerCase();
        for (const t of toks) if (!hay.includes(t)) return false;
      }
    }
    return true;
  }

  const STATUS_ORDER = {};
  STATUSES.forEach((s, i) => { STATUS_ORDER[s.id] = i; });

  function sortStories(list, sort, ctx) {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const key = sort.key || 'due';
    const val = (s) => {
      switch (key) {
        case 'updated': return s.updatedAt;
        case 'created': return s.createdAt;
        case 'due': return s.due || '9999-12-31';
        case 'headline': return (s.headline || '').toLowerCase();
        case 'slug': return s.slug;
        case 'section': return s.section;
        case 'status': return STATUS_ORDER[s.status];
        case 'words': return Number(s.wordCount) || 0;
        case 'target': return Number(s.wordTarget) || 0;
        case 'writer': { const w = ctx.writerById(s.writerId); return w ? w.name.toLowerCase() : '~'; }
        default: return s.updatedAt;
      }
    };
    return list.slice().sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return a.updatedAt < b.updatedAt ? 1 : -1; // stable-ish tiebreak
    });
  }

  /* ---------- writers ---------- */
  function writerLoad(state, writer) {
    const stories = state.stories.filter((s) => s.writerId === writer.id && ACTIVE_STATUSES.includes(s.status));
    const owed = stories.reduce((sum, s) => sum + Math.max(0, (Number(s.wordTarget) || 0) - (Number(s.wordCount) || 0)), 0);
    const overdue = stories.filter(isOverdue).length;
    return {
      stories,
      count: stories.length,
      owed,
      overdue,
      pct: writer.capacity ? Math.min(150, Math.round((owed / writer.capacity) * 100)) : 0,
    };
  }

  function writerDeactivationBlock(state, writer) {
    const active = state.stories.filter((s) => s.writerId === writer.id && ACTIVE_STATUSES.includes(s.status));
    if (!active.length) return null;
    return active.length + ' of ' + writer.name + '\u2019s stories are still on the desk (' +
      active.slice(0, 3).map((s) => '\u201C' + s.headline + '\u201D').join(', ') +
      (active.length > 3 ? ' and ' + (active.length - 3) + ' more' : '') +
      '). Reassign them first — deactivated writers can\u2019t hold stories.';
  }

  function writerDeleteBlock(state, writer) {
    const n = state.stories.filter((s) => s.writerId === writer.id).length;
    if (n) return writer.name + ' is credited on ' + n + ' ' + (n === 1 ? 'story' : 'stories') + ' — writers with stories can be deactivated but never deleted, so the record stays honest.';
    return null;
  }

  /* ---------- edition rules ---------- */
  function slotProblem(state, slot, story) {
    const ed = state.editions.find((e) => e.slots.includes(slot));
    if (!ed) return 'That slot no longer exists.';
    if (ed.status === 'published') return 'This edition is published and locked.';
    if (!story) return null;
    if (story.status !== 'ready') {
      if (story.status === 'slotted') return '\u201C' + story.headline + '\u201D is already in a slot — pull it from its current slot first.';
      if (TERMINAL_STATUSES.includes(story.status)) return '\u201C' + story.headline + '\u201D is ' + STATUS_MAP[story.status].label.toLowerCase() + ' — only ready stories can be slotted.';
      return '\u201C' + story.headline + '\u201D must be approved by the desk (Ready) before it can be slotted.';
    }
    if (slot.storyId) return 'That slot already holds \u201C' + (state.stories.find((s) => s.id === slot.storyId) || {}).headline + '\u201D.';
    if (slot.section !== 'any' && slot.section !== story.section) return slot.label + ' runs ' + slot.section + ' — \u201C' + story.headline + '\u201D is ' + story.section + '.';
    return null;
  }

  function publishProblems(state, edition) {
    const filled = edition.slots.filter((s) => s.storyId);
    if (!filled.length) return [{ level: 'block', text: 'Nothing is slotted yet — an empty edition can\u2019t publish.' }];
    const problems = [];
    filled.forEach((slot) => {
      const story = state.stories.find((s) => s.id === slot.storyId);
      if (!story) { problems.push({ level: 'block', text: slot.label + ' points at a missing story.' }); return; }
      if (slot.hold) problems.push({ level: 'block', text: slot.label + ': \u201C' + story.headline + '\u201D is on hold — clear the hold or pull the story.' });
      if (!(story.headline || '').trim()) problems.push({ level: 'block', text: slot.label + ': story has no headline.' });
      if (!story.writerId) problems.push({ level: 'block', text: slot.label + ': story has no writer credited.' });
    });
    edition.slots.filter((s) => !s.storyId).forEach((slot) => {
      problems.push({ level: 'warn', text: slot.label + ' would run empty.' });
    });
    return problems;
  }

  /* ---------- G export ---------- */
  G.domain = {
    uid, now, err, clamp, pad2,
    parseDate, dateToStr, todayStr, daysUntil, startOfToday,
    fmtDate, fmtDateShort, fmtTime, fmtDateTime, relTime, fmtBytes,
    initials, isTyping, csvCell,
    SECTIONS, STATUSES, STATUS_MAP, ACTIVE_STATUSES, BOARD_STATUSES, TERMINAL_STATUSES,
    PRIORITIES, TRANSITIONS, transitionReason, movesFor,
    validateField, normalizeTags,
    dueState, isOverdue, isLate,
    editionOfStory, activeEdition, writerOf,
    defaultFilters, storyMatches, sortStories, STATUS_ORDER,
    writerLoad, writerDeactivationBlock, writerDeleteBlock,
    slotProblem, publishProblems,
  };
})();
