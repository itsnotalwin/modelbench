/* Fieldwork — shared, accessible form dialogs. */
(function (App) {
  'use strict';
  var ui = App.ui;
  var models = App.models;
  var store = App.store;
  var router = App.router;

  var AppForms = (App.forms = App.forms || {});
  var uid = 0;

  function field(opts) {
    var id = opts.id || ('f-' + (++uid) + '-' + opts.name);
    var errId = ui.fieldErrorId(opts.name);
    var hintId = id + '-hint';
    var describedBy = [];
    if (opts.hint) describedBy.push(hintId);
    describedBy.push(errId);

    var input;
    var label = ui.el('label', { class: 'field__label', for: id }, [
      opts.label,
      opts.required ? ui.el('span', { class: 'req', 'aria-hidden': 'true', text: ' *' }) : null,
      opts.required ? ui.srOnly(' (required)') : null
    ]);

    var common = {
      id: id, name: opts.name, class: 'field__input',
      'aria-describedby': describedBy.join(' '),
      'aria-invalid': null
    };

    if (opts.type === 'textarea') {
      input = ui.el('textarea', merge(common, { rows: opts.rows || 4, maxlength: opts.maxlength, placeholder: opts.placeholder, required: opts.required }));
      input.value = opts.value || '';
    } else if (opts.type === 'select') {
      input = ui.el('select', merge(common, { required: opts.required }), (opts.options || []).map(function (o) {
        return ui.el('option', { value: o.value, selected: String(opts.value) === String(o.value), text: o.label });
      }));
    } else {
      var attrs = merge(common, {
        type: opts.type || 'text', value: opts.value == null ? '' : opts.value,
        placeholder: opts.placeholder, required: opts.required, maxlength: opts.maxlength,
        min: opts.min, max: opts.max, step: opts.step, inputmode: opts.inputmode, autocomplete: opts.autocomplete
      });
      input = ui.el('input', attrs);
      if (opts.list) input.setAttribute('list', opts.list);
    }

    var wrap = ui.el('div', { class: 'field' }, [
      label, input,
      opts.hint ? ui.el('p', { class: 'field__hint', id: hintId, text: opts.hint }) : null,
      ui.el('p', { class: 'field__error', id: errId, role: 'alert', hidden: true, text: '' })
    ]);
    wrap._input = input;
    return wrap;
  }

  function merge(a, b) {
    var out = {}; var k;
    for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) out[k] = a[k];
    for (k in b) if (Object.prototype.hasOwnProperty.call(b, k) && b[k] != null) out[k] = b[k];
    return out;
  }

  /* ---------- project form ---------- */
  AppForms.openProjectForm = function (opts) {
    opts = opts || {};
    var project = opts.project || null;
    var isEdit = !!project;

    var nameF = field({ name: 'name', label: 'Project name', type: 'text', required: true, maxlength: 120, value: project ? project.name : '', placeholder: 'e.g. Climate policy review' });
    var descF = field({ name: 'description', label: 'Description', type: 'textarea', maxlength: 2000, value: project ? project.description : '', placeholder: 'What is this project about?', rows: 3 });
    var colorF = field({
      name: 'color', label: 'Accent colour', type: 'select', value: project ? project.color : 'teal',
      options: models.PROJECT_COLORS.map(function (c) { return { value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }; })
    });

    var submitBtn = ui.el('button', { type: 'submit', class: 'btn btn-primary', text: isEdit ? 'Save changes' : 'Create project' });
    var cancelBtn = ui.el('button', { type: 'button', class: 'btn btn-ghost', text: 'Cancel' });

    var form = ui.el('form', { class: 'form', noValidate: 'true' }, [
      ui.el('div', { class: 'form-error-summary', role: 'alert', hidden: true, text: '' }),
      nameF, descF, colorF,
      ui.el('div', { class: 'modal__actions' }, [cancelBtn, submitBtn])
    ]);

    var modal = ui.openModal(form, { title: isEdit ? 'Edit project' : 'New project', initialFocus: nameF._input });

    cancelBtn.addEventListener('click', modal.close);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.dataset.submitting === '1') return;
      var data = { name: nameF._input.value, description: descF._input.value, color: colorF._input.value };
      form.dataset.submitting = '1'; submitBtn.disabled = true;
      var res = isEdit ? store.updateProject(project.id, data) : store.createProject(data);
      form.dataset.submitting = '0'; submitBtn.disabled = false;
      if (!res.ok) { ui.applyErrors(form, res.errors || {}); if (res.error) ui.toast(res.error, 'error'); return; }
      ui.clearFieldErrors(form);
      ui.toast(isEdit ? 'Project saved.' : 'Project created.', 'success');
      modal.close();
      if (typeof opts.onSaved === 'function') opts.onSaved(res);
    });
    return modal;
  };

  /* ---------- source form ---------- */
  AppForms.openSourceForm = function (opts) {
    opts = opts || {};
    var source = opts.source || null;
    var projectId = opts.projectId || (source ? source.projectId : null);
    var isEdit = !!source;
    if (!projectId) { ui.toast('Open a project first.', 'error'); return null; }

    var state = store.getState();
    var existingTags = models.allTags(state, projectId).map(function (t) { return t.name; });
    var tagListId = 'tag-options-' + (++uid);

    var titleF = field({ name: 'title', label: 'Title', type: 'text', required: true, maxlength: 300, value: source ? source.title : '', placeholder: 'Source title' });
    var typeF = field({ name: 'type', label: 'Type', type: 'select', value: source ? source.type : 'article', options: models.SOURCE_TYPES.map(function (t) { return { value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }; }) });
    var authorF = field({ name: 'author', label: 'Author', type: 'text', maxlength: 200, value: source ? source.author : '', placeholder: 'Author or creator' });
    var yearF = field({ name: 'year', label: 'Year', type: 'number', inputmode: 'numeric', min: '0', max: String(new Date().getFullYear() + 1), step: '1', value: source && source.year != null ? source.year : '', placeholder: 'e.g. 2024' });
    var urlF = field({ name: 'url', label: 'URL', type: 'url', maxlength: 2048, value: source ? source.url : '', placeholder: 'https://example.com', hint: 'Optional. Only http:// and https:// links are clickable.' });
    var publisherF = field({ name: 'publisher', label: 'Publisher / site', type: 'text', maxlength: 200, value: source ? source.publisher : '' });
    var notesF = field({ name: 'notes', label: 'Notes', type: 'textarea', maxlength: 5000, value: source ? source.notes : '', rows: 3, placeholder: 'Why this source matters, reliability, etc.' });
    var tagsF = field({ name: 'tags', label: 'Tags', type: 'text', value: source ? (source.tags || []).join(', ') : '', placeholder: 'comma, separated, tags', hint: 'Separate tags with commas.', list: tagListId });

    var tagList = ui.el('datalist', { id: tagListId }, existingTags.map(function (t) { return ui.el('option', { value: t }); }));

    var submitBtn = ui.el('button', { type: 'submit', class: 'btn btn-primary', text: isEdit ? 'Save changes' : 'Add source' });
    var cancelBtn = ui.el('button', { type: 'button', class: 'btn btn-ghost', text: 'Cancel' });

    var form = ui.el('form', { class: 'form', noValidate: 'true' }, [
      ui.el('div', { class: 'form-error-summary', role: 'alert', hidden: true, text: '' }),
      titleF, typeF, authorF, yearF, urlF, publisherF, notesF, tagsF, tagList,
      ui.el('div', { class: 'modal__actions' }, [cancelBtn, submitBtn])
    ]);

    var modal = ui.openModal(form, { title: isEdit ? 'Edit source' : 'Add source', initialFocus: titleF._input });
    cancelBtn.addEventListener('click', modal.close);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.dataset.submitting === '1') return;
      var data = {
        title: titleF._input.value, type: typeF._input.value, author: authorF._input.value,
        year: yearF._input.value, url: urlF._input.value, publisher: publisherF._input.value,
        notes: notesF._input.value, tags: tagsF._input.value
      };
      form.dataset.submitting = '1'; submitBtn.disabled = true;
      var res = isEdit ? store.updateSource(source.id, data) : store.createSource(projectId, data);
      form.dataset.submitting = '0'; submitBtn.disabled = false;
      if (!res.ok) { ui.applyErrors(form, res.errors || {}); if (res.error) ui.toast(res.error, 'error'); return; }
      ui.toast(isEdit ? 'Source saved.' : 'Source added.', 'success');
      modal.close();
      if (typeof opts.onSaved === 'function') opts.onSaved(res);
    });
    return modal;
  };

  /* ---------- note form ---------- */
  AppForms.openNoteForm = function (opts) {
    opts = opts || {};
    var note = opts.note || null;
    var projectId = opts.projectId || (note ? note.projectId : null);
    var isEdit = !!note && !!note.id;
    if (!projectId) { ui.toast('Open a project first.', 'error'); return null; }

    var state = store.getState();
    var sources = models.sourcesForProject(state, projectId);
    var existingTags = models.allTags(state, projectId).map(function (t) { return t.name; });
    var tagListId = 'note-tags-' + (++uid);

    var titleF = field({ name: 'title', label: 'Title', type: 'text', required: true, maxlength: 300, value: note ? note.title : '', placeholder: 'Note title' });
    var bodyF = field({ name: 'body', label: 'Body', type: 'textarea', maxlength: 100000, value: note ? note.body : '', rows: 6, placeholder: 'Write your note…' });
    var sourceOptions = [{ value: '', label: '— No linked source —' }].concat(sources.map(function (s) { return { value: s.id, label: s.title }; }));
    var sourceF = field({ name: 'sourceId', label: 'Linked source', type: 'select', value: (note && note.sourceId) ? note.sourceId : (opts.sourceId || ''), options: sourceOptions });
    var tagsF = field({ name: 'tags', label: 'Tags', type: 'text', value: note ? (note.tags || []).join(', ') : '', placeholder: 'comma, separated, tags', list: tagListId });
    var tagList = ui.el('datalist', { id: tagListId }, existingTags.map(function (t) { return ui.el('option', { value: t }); }));

    var submitBtn = ui.el('button', { type: 'submit', class: 'btn btn-primary', text: isEdit ? 'Save changes' : 'Add note' });
    var cancelBtn = ui.el('button', { type: 'button', class: 'btn btn-ghost', text: 'Cancel' });

    var form = ui.el('form', { class: 'form', noValidate: 'true' }, [
      ui.el('div', { class: 'form-error-summary', role: 'alert', hidden: true, text: '' }),
      titleF, bodyF, sourceF, tagsF, tagList,
      ui.el('div', { class: 'modal__actions' }, [cancelBtn, submitBtn])
    ]);

    var modal = ui.openModal(form, { title: isEdit ? 'Edit note' : 'Add note', initialFocus: titleF._input });
    cancelBtn.addEventListener('click', modal.close);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.dataset.submitting === '1') return;
      var data = { title: titleF._input.value, body: bodyF._input.value, sourceId: sourceF._input.value || null, tags: tagsF._input.value };
      form.dataset.submitting = '1'; submitBtn.disabled = true;
      var res = isEdit ? store.updateNote(note.id, data) : store.createNote(projectId, data);
      form.dataset.submitting = '0'; submitBtn.disabled = false;
      if (!res.ok) { ui.applyErrors(form, res.errors || {}); if (res.error) ui.toast(res.error, 'error'); return; }
      ui.toast(isEdit ? 'Note saved.' : 'Note added.', 'success');
      modal.close();
      if (typeof opts.onSaved === 'function') opts.onSaved(res);
    });
    return modal;
  };

  /* ---------- excerpt form ---------- */
  AppForms.openExcerptForm = function (opts) {
    opts = opts || {};
    var sourceId = opts.sourceId;
    var excerpt = opts.excerpt || null;
    var isEdit = !!excerpt;
    if (!sourceId) return null;

    var state = store.getState();
    var source = models.getSource(state, sourceId);
    var tagListId = 'exc-tags-' + (++uid);
    var existingTags = source ? models.allTags(state, source.projectId).map(function (t) { return t.name; }) : [];

    var textF = field({ name: 'text', label: 'Excerpt', type: 'textarea', required: true, maxlength: 5000, value: excerpt ? excerpt.text : '', rows: 4, placeholder: 'Copy a quote or passage…' });
    var pageF = field({ name: 'page', label: 'Page / location', type: 'text', maxlength: 50, value: excerpt ? excerpt.page : '', placeholder: 'e.g. p. 42' });
    var noteF = field({ name: 'note', label: 'Your note', type: 'textarea', maxlength: 2000, value: excerpt ? excerpt.note : '', rows: 2 });
    var tagsF = field({ name: 'tags', label: 'Tags', type: 'text', value: excerpt ? (excerpt.tags || []).join(', ') : '', list: tagListId });
    var tagList = ui.el('datalist', { id: tagListId }, existingTags.map(function (t) { return ui.el('option', { value: t }); }));

    var submitBtn = ui.el('button', { type: 'submit', class: 'btn btn-primary', text: isEdit ? 'Save excerpt' : 'Add excerpt' });
    var cancelBtn = ui.el('button', { type: 'button', class: 'btn btn-ghost', text: 'Cancel' });

    var form = ui.el('form', { class: 'form', noValidate: 'true' }, [
      ui.el('div', { class: 'form-error-summary', role: 'alert', hidden: true, text: '' }),
      textF, pageF, noteF, tagsF, tagList,
      ui.el('div', { class: 'modal__actions' }, [cancelBtn, submitBtn])
    ]);

    var modal = ui.openModal(form, { title: isEdit ? 'Edit excerpt' : 'Add excerpt', initialFocus: textF._input });
    cancelBtn.addEventListener('click', modal.close);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.dataset.submitting === '1') return;
      var data = { text: textF._input.value, page: pageF._input.value, note: noteF._input.value, tags: tagsF._input.value };
      form.dataset.submitting = '1'; submitBtn.disabled = true;
      var res = isEdit ? store.updateExcerpt(sourceId, excerpt.id, data) : store.addExcerpt(sourceId, data);
      form.dataset.submitting = '0'; submitBtn.disabled = false;
      if (!res.ok) { ui.applyErrors(form, res.errors || {}); if (res.error) ui.toast(res.error, 'error'); return; }
      ui.toast(isEdit ? 'Excerpt saved.' : 'Excerpt added.', 'success');
      modal.close();
      if (typeof opts.onSaved === 'function') opts.onSaved(res);
    });
    return modal;
  };
})(window.App = window.App || {});
