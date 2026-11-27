/* Fieldwork — notes list (project panel) + note detail view. */
(function (App) {
  'use strict';
  var ui = App.ui; var models = App.models; var store = App.store; var router = App.router; var util = App.util;
  var el = ui.el;

  App.views = App.views || {};

  function noteHref(n) { return router.build(['project', n.projectId, 'note', n.id]); }

  function sourceTitle(state, sourceId) {
    var s = models.getSource(state, sourceId);
    return s ? s.title : null;
  }

  /* ---------- notes panel inside a project ---------- */
  App.views.notesPanel = function (panel, projectId) {
    var state = store.getState();

    var head = el('div', { class: 'panel-header' }, [
      el('h2', { class: 'section-title', text: 'Notes' }),
      el('button', { type: 'button', class: 'btn btn-primary btn-sm', text: 'Add note', on: { click: function () { App.forms.openNoteForm({ projectId: projectId, onSaved: function () { App.renderRoute(); } }); } } })
    ]);
    panel.appendChild(head);

    var all = models.notesForProject(state, projectId);
    if (all.length === 0) {
      var empty = el('div', {});
      ui.renderEmpty(empty, {
        title: 'No notes yet',
        message: 'Capture ideas, observations and synthesis. Link a note to a source to keep provenance.',
        actionLabel: 'Add note',
        onAction: function () { App.forms.openNoteForm({ projectId: projectId, onSaved: function () { App.renderRoute(); } }); }
      });
      panel.appendChild(empty);
      return;
    }

    var controls = el('div', { class: 'toolbar' });
    var searchInput = el('input', { type: 'search', class: 'input', id: 'note-filter', name: 'note-filter', placeholder: 'Filter notes…', 'aria-label': 'Filter notes', autocomplete: 'off' });
    var tagSelect = el('select', { class: 'input', id: 'note-tag-filter', name: 'note-tag-filter', 'aria-label': 'Filter by tag' },
      [el('option', { value: '', text: 'All tags' })].concat(models.allTags(state, projectId).map(function (t) { return el('option', { value: t.name, text: t.name + ' (' + t.count + ')' }); })));
    var sortSelect = el('select', { class: 'input', id: 'note-sort', name: 'note-sort', 'aria-label': 'Sort notes' }, [
      el('option', { value: 'updated', text: 'Recently updated' }),
      el('option', { value: 'created', text: 'Newest first' }),
      el('option', { value: 'title', text: 'Title (A–Z)' })
    ]);
    controls.appendChild(el('div', { class: 'field field--inline' }, [el('label', { class: 'visually-hidden', for: 'note-filter', text: 'Filter notes' }), searchInput]));
    controls.appendChild(el('div', { class: 'field field--inline' }, [el('label', { class: 'visually-hidden', for: 'note-tag-filter', text: 'Tag' }), tagSelect]));
    controls.appendChild(el('div', { class: 'field field--inline' }, [el('label', { class: 'visually-hidden', for: 'note-sort', text: 'Sort' }), sortSelect]));
    panel.appendChild(controls);

    var listWrap = el('ul', { class: 'note-list note-list--cards', id: 'note-list' });
    panel.appendChild(listWrap);
    var countRegion = el('p', { class: 'muted result-count', role: 'status', 'aria-live': 'polite' });
    panel.appendChild(countRegion);

    function renderList() {
      var q = searchInput.value.trim().toLowerCase();
      var tag = tagSelect.value;
      var sort = sortSelect.value;
      var list = all.slice().filter(function (n) {
        if (tag && (n.tags || []).indexOf(tag) === -1) return false;
        if (q) {
          var hay = (n.title + ' ' + n.body + ' ' + (n.tags || []).join(' ')).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
      list.sort(function (a, b) {
        if (sort === 'title') return a.title.localeCompare(b.title);
        if (sort === 'created') return String(b.createdAt).localeCompare(String(a.createdAt));
        return String(b.updatedAt).localeCompare(String(a.updatedAt));
      });

      ui.clear(listWrap);
      if (list.length === 0) listWrap.appendChild(el('li', { class: 'span-all muted', text: 'No notes match these filters.' }));
      else list.forEach(function (n) { listWrap.appendChild(noteItem(state, n)); });
      countRegion.textContent = list.length + ' of ' + all.length + ' note' + (all.length === 1 ? '' : 's');
    }

    function noteItem(state, n) {
      var src = n.sourceId ? sourceTitle(state, n.sourceId) : null;
      var preview = (n.body || '').slice(0, 160);
      return el('li', { class: 'card note-item' }, [
        el('h3', { class: 'note-item__title' }, [el('a', { href: noteHref(n), text: n.title })]),
        preview ? el('p', { class: 'note-item__preview', text: preview + (n.body.length > 160 ? '…' : '') }) : el('p', { class: 'muted', text: 'Empty note.' }),
        el('p', { class: 'muted', text: (src ? 'Source: ' + src + ' · ' : '') + 'updated ' + util.relativeTime(n.updatedAt) }),
        (n.tags && n.tags.length) ? el('div', { class: 'tag-row' }, n.tags.map(function (t) { return el('a', { class: 'tag', href: router.build(['tags', t]), text: t }); })) : null,
        el('div', { class: 'card__actions' }, [
          el('a', { class: 'btn btn-ghost btn-sm', href: noteHref(n), text: 'Open' }),
          el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Edit', on: { click: function () { App.forms.openNoteForm({ projectId: projectId, note: n, onSaved: function () { App.renderRoute(); } }); } } }),
          el('button', { type: 'button', class: 'btn btn-danger btn-sm', text: 'Delete', on: { click: function () { confirmDeleteNote(n); } } })
        ])
      ]);
    }

    function confirmDeleteNote(n) {
      ui.confirmDialog({ title: 'Delete note?', message: 'Delete \u201C' + n.title + '\u201D? This cannot be undone.', confirmLabel: 'Delete note', danger: true })
        .then(function (ok) { if (!ok) return; store.deleteNote(n.id); App.renderRoute(); ui.toast('Note deleted.', 'success'); });
    }

    searchInput.addEventListener('input', renderList);
    tagSelect.addEventListener('change', renderList);
    sortSelect.addEventListener('change', renderList);
    renderList();
  };

  /* ---------- note detail ---------- */
  App.views.note = function (main, params) {
    var state = store.getState();
    var note = models.getNote(state, params.noteId);
    var project = note ? models.getProject(state, note.projectId) : null;

    if (!note || !project || note.projectId !== params.projectId) {
      ui.renderEmpty(main, { title: 'Note not found', message: 'It may have been deleted.', actionLabel: 'Back to notes', headingTag: 'h1', onAction: function () { router.navigate(router.build(['project', params.projectId, 'notes'])); } });
      return;
    }

    var src = note.sourceId ? models.getSource(state, note.sourceId) : null;
    var container = el('div', { class: 'view view--note' });
    container.appendChild(el('a', { class: 'back-link', href: router.build(['project', project.id, 'notes']), text: '\u2190 Notes' }));

    container.appendChild(el('header', { class: 'detail-header' }, [
      el('div', {}, [
        el('h1', { class: 'page-title', text: note.title }),
        el('p', { class: 'muted', text: 'Created ' + util.formatDate(note.createdAt) + ' · updated ' + util.formatDateTime(note.updatedAt) }),
        src ? el('p', { class: 'muted' }, ['Source: ', el('a', { href: router.build(['project', project.id, 'source', src.id]), text: src.title })]) : el('p', { class: 'muted', text: 'Not linked to a source.' })
      ]),
      el('div', { class: 'detail-header__actions' }, [
        el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Edit', on: { click: function () { App.forms.openNoteForm({ projectId: project.id, note: note, onSaved: function () { App.renderRoute(); } }); } } }),
        el('button', { type: 'button', class: 'btn btn-danger btn-sm', text: 'Delete', on: { click: function () {
          ui.confirmDialog({ title: 'Delete note?', message: 'Delete \u201C' + note.title + '\u201D?', confirmLabel: 'Delete note', danger: true }).then(function (ok) {
            if (!ok) return; store.deleteNote(note.id); router.navigate(router.build(['project', project.id, 'notes'])); ui.toast('Note deleted.', 'success');
          });
        } } })
      ])
    ]));

    if ((note.tags && note.tags.length)) container.appendChild(el('div', { class: 'tag-row' }, note.tags.map(function (t) { return el('a', { class: 'tag', href: router.build(['tags', t]), text: t }); })));

    // body rendered as plain text paragraphs (no HTML injection)
    var bodyWrap = el('div', { class: 'card note-body' });
    var body = note.body || '';
    if (body.trim() === '') bodyWrap.appendChild(el('p', { class: 'muted', text: 'This note has no body.' }));
    else body.split(/\n{2,}/).forEach(function (para) { bodyWrap.appendChild(el('p', { text: para })); });
    container.appendChild(bodyWrap);

    main.appendChild(container);
  };
})(window.App = window.App || {});
