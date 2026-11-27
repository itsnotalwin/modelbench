/* Fieldwork — data model, normalisation, validation, duplicate detection.

   Concept: a local-first research workspace.
   Entities:
     Project  { id, name, description, color, archived, createdAt, updatedAt }
     Source   { id, projectId, title, type, author, year, url, publisher, notes,
                tags[], excerpts[], createdAt, updatedAt }
     Excerpt  { id, text, page, note, tags[], createdAt }   (nested in Source)
     Note     { id, projectId, sourceId|null, title, body, tags[], createdAt, updatedAt }

   All user data is treated as untrusted: it is normalised on load and on
   import, lengths are clamped, references are re-checked, and we only ever
   rebuild known fields (no __proto__ / prototype pollution). */
(function (App) {
  'use strict';

  var util = App.util;
  var models = (App.models = App.models || {});

  var SCHEMA_VERSION = (models.SCHEMA_VERSION = 1);
  var APP_NAME = (models.APP_NAME = 'fieldwork');

  var SOURCE_TYPES = (models.SOURCE_TYPES = [
    'article', 'book', 'website', 'paper', 'interview', 'video', 'dataset', 'other'
  ]);

  var PROJECT_COLORS = (models.PROJECT_COLORS = [
    'teal', 'amber', 'rose', 'indigo', 'green', 'slate', 'violet', 'orange'
  ]);

  /* ---------- small helpers ---------- */
  function str(v, max) {
    var s = util.norm(v == null ? '' : String(v));
    if (max && s.length > max) s = s.slice(0, max);
    return s;
  }
  function optStr(v, max) { return str(v, max); }
  function bool(v) { return v === true || v === 'true' || v === 1 || v === '1'; }

  function normTags(input) {
    if (input == null) return [];
    var arr = Array.isArray(input) ? input : String(input).split(',');
    var seen = {}; var out = [];
    arr.forEach(function (t) {
      var tag = util.normalizeTag(t);
      if (!tag) return;
      if (tag.length > 50) tag = tag.slice(0, 50);
      if (seen[tag]) return;
      seen[tag] = 1; out.push(tag);
    });
    return out.slice(0, 30);
  }
  models.normalizeTags = normTags;

  function normType(t) {
    var s = util.lower(t);
    return SOURCE_TYPES.indexOf(s) !== -1 ? s : 'other';
  }

  function normColor(c) {
    var s = util.lower(c);
    return PROJECT_COLORS.indexOf(s) !== -1 ? s : 'teal';
  }

  function parseYear(v) {
    if (v === '' || v == null) return null;
    var n = Number(v);
    if (!isFinite(n)) return NaN;
    return n;
  }

  /* ---------- factories ---------- */
  models.newProject = function (data) {
    var now = util.nowIso();
    data = data || {};
    return {
      id: util.id(),
      name: str(data.name, 120),
      description: optStr(data.description, 2000),
      color: normColor(data.color),
      archived: false,
      createdAt: now,
      updatedAt: now
    };
  };

  models.newSource = function (data) {
    var now = util.nowIso();
    data = data || {};
    return {
      id: util.id(),
      projectId: String(data.projectId || ''),
      title: str(data.title, 300),
      type: normType(data.type),
      author: optStr(data.author, 200),
      year: parseYear(data.year) || null,
      url: optStr(data.url, 2048),
      publisher: optStr(data.publisher, 200),
      notes: optStr(data.notes, 5000),
      tags: normTags(data.tags),
      excerpts: [],
      createdAt: now,
      updatedAt: now
    };
  };

  models.newExcerpt = function (data) {
    data = data || {};
    return {
      id: util.id(),
      text: str(data.text, 5000),
      page: optStr(data.page, 50),
      note: optStr(data.note, 2000),
      tags: normTags(data.tags),
      createdAt: util.nowIso()
    };
  };

  models.newNote = function (data) {
    var now = util.nowIso();
    data = data || {};
    return {
      id: util.id(),
      projectId: String(data.projectId || ''),
      sourceId: data.sourceId ? String(data.sourceId) : null,
      title: str(data.title, 300),
      body: optStr(data.body, 100000),
      tags: normTags(data.tags),
      createdAt: now,
      updatedAt: now
    };
  };

  /* ---------- normalisation of untrusted data ---------- */
  function normalizeExcerpt(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var text = str(raw.text, 5000);
    if (!text) return null;
    return {
      id: raw.id ? String(raw.id) : util.id(),
      text: text,
      page: optStr(raw.page, 50),
      note: optStr(raw.note, 2000),
      tags: normTags(raw.tags),
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : util.nowIso()
    };
  }

  function normalizeProject(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var name = str(raw.name, 120);
    if (!name) return null;
    return {
      id: raw.id ? String(raw.id) : util.id(),
      name: name,
      description: optStr(raw.description, 2000),
      color: normColor(raw.color),
      archived: bool(raw.archived),
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : util.nowIso(),
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : (typeof raw.createdAt === 'string' ? raw.createdAt : util.nowIso())
    };
  }

  function normalizeSource(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var title = str(raw.title, 300);
    if (!title) return null;
    var year = parseYear(raw.year);
    if (year != null && (!isFinite(year) || year < 0 || year > 3000)) year = null;
    var excerpts = [];
    if (Array.isArray(raw.excerpts)) {
      raw.excerpts.forEach(function (e) { var n = normalizeExcerpt(e); if (n) excerpts.push(n); });
    }
    return {
      id: raw.id ? String(raw.id) : util.id(),
      projectId: raw.projectId ? String(raw.projectId) : '',
      title: title,
      type: normType(raw.type),
      author: optStr(raw.author, 200),
      year: year == null ? null : Math.round(year),
      url: optStr(raw.url, 2048),
      publisher: optStr(raw.publisher, 200),
      notes: optStr(raw.notes, 5000),
      tags: normTags(raw.tags),
      excerpts: excerpts,
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : util.nowIso(),
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : (typeof raw.createdAt === 'string' ? raw.createdAt : util.nowIso())
    };
  }

  function normalizeNote(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var title = str(raw.title, 300);
    if (!title) return null;
    return {
      id: raw.id ? String(raw.id) : util.id(),
      projectId: raw.projectId ? String(raw.projectId) : '',
      sourceId: raw.sourceId ? String(raw.sourceId) : null,
      title: title,
      body: optStr(raw.body, 100000),
      tags: normTags(raw.tags),
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : util.nowIso(),
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : (typeof raw.createdAt === 'string' ? raw.createdAt : util.nowIso())
    };
  }

  models.defaultState = function () {
    return {
      schemaVersion: SCHEMA_VERSION,
      app: APP_NAME,
      projects: [],
      sources: [],
      notes: [],
      settings: { theme: 'system', lastProjectId: null },
      lastSavedAt: null
    };
  };

  /* Build a clean state object from arbitrary input. Enforces referential
     integrity (orphan sources/notes dropped, dangling sourceId nulled). */
  models.normalizeState = function (raw) {
    var base = models.defaultState();
    if (!raw || typeof raw !== 'object') return base;

    var projects = [];
    if (Array.isArray(raw.projects)) {
      raw.projects.forEach(function (p) { var n = normalizeProject(p); if (n) projects.push(n); });
    }

    // de-duplicate project ids
    var projectIds = {}; var cleanProjects = [];
    projects.forEach(function (p) {
      if (projectIds[p.id]) return; projectIds[p.id] = 1; cleanProjects.push(p);
    });
    projects = cleanProjects;

    var sources = [];
    if (Array.isArray(raw.sources)) {
      raw.sources.forEach(function (s) { var n = normalizeSource(s); if (n) sources.push(n); });
    }
    // keep only sources whose project exists; de-dup ids
    var sourceIds = {}; var cleanSources = [];
    sources.forEach(function (s) {
      if (!projectIds[s.projectId]) return;            // orphan source
      if (sourceIds[s.id]) return; sourceIds[s.id] = 1; cleanSources.push(s);
    });
    sources = cleanSources;

    var notes = [];
    if (Array.isArray(raw.notes)) {
      raw.notes.forEach(function (n) { var x = normalizeNote(n); if (x) notes.push(x); });
    }
    var noteIds = {}; var cleanNotes = [];
    notes.forEach(function (n) {
      if (!projectIds[n.projectId]) return;            // orphan note
      if (noteIds[n.id]) return; noteIds[n.id] = 1;
      // dangling source reference -> null (note kept, link removed)
      if (n.sourceId && !sourceIds[n.sourceId]) n.sourceId = null;
      // source must belong to same project
      if (n.sourceId) {
        var src = sources.filter(function (s) { return s.id === n.sourceId; })[0];
        if (!src || src.projectId !== n.projectId) n.sourceId = null;
      }
      cleanNotes.push(n);
    });
    notes = cleanNotes;

    var settings = base.settings;
    if (raw.settings && typeof raw.settings === 'object') {
      var theme = raw.settings.theme;
      settings.theme = (theme === 'light' || theme === 'dark' || theme === 'system') ? theme : 'system';
      settings.lastProjectId = raw.settings.lastProjectId ? String(raw.settings.lastProjectId) : null;
    }
    if (settings.lastProjectId && !projectIds[settings.lastProjectId]) settings.lastProjectId = null;

    return {
      schemaVersion: SCHEMA_VERSION,
      app: APP_NAME,
      projects: projects,
      sources: sources,
      notes: notes,
      settings: settings,
      lastSavedAt: typeof raw.lastSavedAt === 'string' ? raw.lastSavedAt : null
    };
  };

  /* ---------- validation (returns {ok, errors, values}) ---------- */
  models.validateProject = function (input, state, excludeId) {
    input = input || {};
    var errors = {};
    var name = str(input.name, 120);
    if (!name) errors.name = 'Project name is required.';
    else {
      var dup = models.findDuplicateProject(state, name, excludeId);
      if (dup) errors.name = 'A project named \u201C' + dup.name + '\u201D already exists.';
    }
    var description = optStr(input.description, 2000);
    if (input.description != null && String(input.description).length > 2000) {
      errors.description = 'Keep the description under 2000 characters.';
    }
    var color = normColor(input.color);
    return { ok: Object.keys(errors).length === 0, errors: errors, values: { name: name, description: description, color: color } };
  };

  models.validateSource = function (input, state, projectId, excludeId) {
    input = input || {};
    var errors = {};
    var title = str(input.title, 300);
    if (!title) errors.title = 'Source title is required.';

    var type = normType(input.type);

    var author = optStr(input.author, 200);
    if (input.author != null && String(input.author).length > 200) errors.author = 'Keep the author under 200 characters.';

    var publisher = optStr(input.publisher, 200);

    var yearRaw = input.year;
    var year = parseYear(yearRaw);
    var currentYear = new Date().getFullYear();
    if (yearRaw !== '' && yearRaw != null) {
      if (isNaN(year)) errors.year = 'Year must be a number.';
      else if (!isFinite(year)) errors.year = 'Year must be a number.';
      else if (year < 0 || year > currentYear + 1) errors.year = 'Enter a year between 0 and ' + (currentYear + 1) + '.';
      else if (Math.floor(year) !== year) errors.year = 'Year must be a whole number.';
    } else { year = null; }
    var yearValue = errors.year ? null : (year == null ? null : Math.round(year));

    var url = optStr(input.url, 2048);
    if (url && !util.isValidUrl(url)) errors.url = 'Enter a valid http:// or https:// URL.';

    var notes = optStr(input.notes, 5000);
    if (input.notes != null && String(input.notes).length > 5000) errors.notes = 'Keep notes under 5000 characters.';

    var tags = normTags(input.tags);

    // duplicate detection within the project
    if (title && !errors.title) {
      var dup = models.findDuplicateSource(state, projectId, { title: title, author: author, year: year, url: url }, excludeId);
      if (dup) errors.title = 'A matching source already exists in this project: \u201C' + dup.title + '\u201D.';
    }

    return {
      ok: Object.keys(errors).length === 0,
      errors: errors,
      values: { title: title, type: type, author: author, year: yearValue, url: url, publisher: publisher, notes: notes, tags: tags }
    };
  };

  models.validateNote = function (input, state, projectId, excludeId) {
    input = input || {};
    var errors = {};
    var title = str(input.title, 300);
    if (!title) errors.title = 'Note title is required.';
    var body = optStr(input.body, 100000);
    var tags = normTags(input.tags);
    var sourceId = input.sourceId ? String(input.sourceId) : null;
    if (sourceId) {
      var src = (state.sources || []).filter(function (s) { return s.id === sourceId; })[0];
      if (!src || src.projectId !== projectId) { errors.sourceId = 'Selected source no longer exists in this project.'; sourceId = null; }
    }
    return { ok: Object.keys(errors).length === 0, errors: errors, values: { title: title, body: body, tags: tags, sourceId: sourceId } };
  };

  models.validateExcerpt = function (input) {
    input = input || {};
    var errors = {};
    var text = str(input.text, 5000);
    if (!text) errors.text = 'Excerpt text is required.';
    var page = optStr(input.page, 50);
    var note = optStr(input.note, 2000);
    var tags = normTags(input.tags);
    return { ok: Object.keys(errors).length === 0, errors: errors, values: { text: text, page: page, note: note, tags: tags } };
  };

  /* ---------- duplicate detection ---------- */
  models.findDuplicateProject = function (state, name, excludeId) {
    var key = util.lower(name);
    return (state.projects || []).filter(function (p) {
      return p.id !== excludeId && util.lower(p.name) === key;
    })[0] || null;
  };

  models.findDuplicateSource = function (state, projectId, fields, excludeId) {
    var titleKey = util.lower(fields.title || '');
    var authorKey = util.lower(fields.author || '');
    var urlKey = util.lower((fields.url || '').trim());
    var year = fields.year == null ? null : fields.year;
    return (state.sources || []).filter(function (s) {
      if (s.id === excludeId) return false;
      if (s.projectId !== projectId) return false;
      // exact match on title + author + year
      if (util.lower(s.title) === titleKey && util.lower(s.author || '') === authorKey && s.year === year) return true;
      // url match (non-empty)
      if (urlKey && util.lower((s.url || '').trim()) === urlKey) return true;
      return false;
    })[0] || null;
  };

  /* ---------- lookups ---------- */
  models.getProject = function (state, id) { return (state.projects || []).filter(function (p) { return p.id === id; })[0] || null; };
  models.getSource = function (state, id) { return (state.sources || []).filter(function (s) { return s.id === id; })[0] || null; };
  models.getNote = function (state, id) { return (state.notes || []).filter(function (n) { return n.id === id; })[0] || null; };

  models.sourcesForProject = function (state, projectId) { return (state.sources || []).filter(function (s) { return s.projectId === projectId; }); };
  models.notesForProject = function (state, projectId) { return (state.notes || []).filter(function (n) { return n.projectId === projectId; }); };

  /* ---------- tags ---------- */
  models.allTags = function (state, projectId) {
    var counts = {}; var order = {};
    function add(tag, weight) {
      tag = util.normalizeTag(tag);
      if (!tag) return;
      if (!counts[tag]) { counts[tag] = 0; order[tag] = Object.keys(order).length; }
      counts[tag] += (weight || 1);
    }
    (state.sources || []).forEach(function (s) {
      if (projectId && s.projectId !== projectId) return;
      (s.tags || []).forEach(function (t) { add(t, 1); });
      (s.excerpts || []).forEach(function (e) { (e.tags || []).forEach(function (t) { add(t, 1); }); });
    });
    (state.notes || []).forEach(function (n) {
      if (projectId && n.projectId !== projectId) return;
      (n.tags || []).forEach(function (t) { add(t, 1); });
    });
    return Object.keys(counts).map(function (name) { return { name: name, count: counts[name], order: order[name] }; })
      .sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name); });
  };
})(window.App = window.App || {});
