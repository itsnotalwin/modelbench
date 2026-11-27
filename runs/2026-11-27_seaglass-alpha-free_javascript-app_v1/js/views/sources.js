/* Fieldwork — sources list (project panel) + source detail view. */
(function (App) {
  'use strict';
  var ui = App.ui; var models = App.models; var store = App.store; var router = App.router; var util = App.util;
  var el = ui.el;

  App.views = App.views || {};

  function sourceHref(s) { return router.build(['project', s.projectId, 'source', s.id]); }

  /* ---------- sources panel inside a project ---------- */
  App.views.sourcesPanel = function (panel, projectId) {
    var state = store.getState();

    var head = el('div', { class: 'panel-header' }, [
      el('h2', { class: 'section-title', text: 'Sources' }),
      el('button', { type: 'button', class: 'btn btn-primary btn-sm', text: 'Add source', on: { click: function () { App.forms.openSourceForm({ projectId: projectId, onSaved: function () { App.renderRoute(); } }); } } })
    ]);
    panel.appendChild(head);

    var all = models.sourcesForProject(state, projectId);
    if (all.length === 0) {
      var empty = el('div', {});
      ui.renderEmpty(empty, {
        title: 'No sources yet',
        message: 'Add books, articles, websites, interviews and more. Then pull out excerpts and link notes.',
        actionLabel: 'Add source',
        onAction: function () { App.forms.openSourceForm({ projectId: projectId, onSaved: function () { App.renderRoute(); } }); }
      });
      panel.appendChild(empty);
      return;
    }

    // filters
    var controls = el('div', { class: 'toolbar' });
    var searchInput = el('input', { type: 'search', class: 'input', id: 'source-filter', name: 'source-filter', placeholder: 'Filter sources…', 'aria-label': 'Filter sources', autocomplete: 'off' });
    var typeSelect = el('select', { class: 'input', id: 'source-type-filter', name: 'source-type-filter', 'aria-label': 'Filter by type' },
      [el('option', { value: '', text: 'All types' })].concat(models.SOURCE_TYPES.map(function (t) { return el('option', { value: t, text: t.charAt(0).toUpperCase() + t.slice(1) }); })));
    var tagSelect = el('select', { class: 'input', id: 'source-tag-filter', name: 'source-tag-filter', 'aria-label': 'Filter by tag' },
      [el('option', { value: '', text: 'All tags' })].concat(models.allTags(state, projectId).map(function (t) { return el('option', { value: t.name, text: t.name + ' (' + t.count + ')' }); })));
    var sortSelect = el('select', { class: 'input', id: 'source-sort', name: 'source-sort', 'aria-label': 'Sort sources' }, [
      el('option', { value: 'updated', text: 'Recently updated' }),
      el('option', { value: 'title', text: 'Title (A–Z)' }),
      el('option', { value: 'year', text: 'Year (newest)' }),
      el('option', { value: 'author', text: 'Author (A–Z)' })
    ]);
    controls.appendChild(el('div', { class: 'field field--inline' }, [el('label', { class: 'visually-hidden', for: 'source-filter', text: 'Filter sources' }), searchInput]));
    controls.appendChild(el('div', { class: 'field field--inline' }, [el('label', { class: 'visually-hidden', for: 'source-type-filter', text: 'Type' }), typeSelect]));
    controls.appendChild(el('div', { class: 'field field--inline' }, [el('label', { class: 'visually-hidden', for: 'source-tag-filter', text: 'Tag' }), tagSelect]));
    controls.appendChild(el('div', { class: 'field field--inline' }, [el('label', { class: 'visually-hidden', for: 'source-sort', text: 'Sort' }), sortSelect]));
    panel.appendChild(controls);

    var listWrap = el('ul', { class: 'source-list', id: 'source-list' });
    panel.appendChild(listWrap);
    var countRegion = el('p', { class: 'muted result-count', role: 'status', 'aria-live': 'polite' });
    panel.appendChild(countRegion);

    function renderList() {
      var q = searchInput.value.trim().toLowerCase();
      var type = typeSelect.value;
      var tag = tagSelect.value;
      var sort = sortSelect.value;
      var list = all.slice().filter(function (s) {
        if (type && s.type !== type) return false;
        if (tag && (s.tags || []).indexOf(tag) === -1) return false;
        if (q) {
          var hay = (s.title + ' ' + s.author + ' ' + s.publisher + ' ' + s.notes + ' ' + (s.tags || []).join(' ')).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
      list.sort(function (a, b) {
        if (sort === 'title') return a.title.localeCompare(b.title);
        if (sort === 'author') return (a.author || '').localeCompare(b.author || '') || a.title.localeCompare(b.title);
        if (sort === 'year') return (b.year || 0) - (a.year || 0);
        return String(b.updatedAt).localeCompare(String(a.updatedAt));
      });

      ui.clear(listWrap);
      if (list.length === 0) {
        listWrap.appendChild(el('li', { class: 'span-all' }, [el('div', { class: 'empty' }, [el('p', { class: 'muted', text: 'No sources match these filters.' })])]));
      } else {
        list.forEach(function (s) { listWrap.appendChild(sourceItem(s)); });
      }
      countRegion.textContent = list.length + ' of ' + all.length + ' source' + (all.length === 1 ? '' : 's');
    }

    function sourceItem(s) {
      var meta = [s.author, s.year != null ? s.year : null, s.publisher].filter(Boolean).join(' · ');
      var safeUrl = util.safeHref(s.url);
      return el('li', { class: 'card source-item' }, [
        el('div', { class: 'source-item__head' }, [
          el('span', { class: 'badge badge--type', text: s.type }),
          el('h3', { class: 'source-item__title' }, [el('a', { href: sourceHref(s), text: s.title })])
        ]),
        meta ? el('p', { class: 'muted', text: meta }) : null,
        safeUrl ? el('p', { class: 'source-item__url' }, [el('a', { href: safeUrl, rel: 'noopener noreferrer', target: '_blank', text: s.url })]) : (s.url ? el('p', { class: 'muted', text: s.url + ' (unsafe link not clickable)' }) : null),
        (s.tags && s.tags.length) ? el('div', { class: 'tag-row' }, s.tags.map(function (t) { return el('a', { class: 'tag', href: router.build(['tags', t]), text: t }); })) : null,
        el('p', { class: 'muted', text: (s.excerpts ? s.excerpts.length : 0) + ' excerpts' }),
        el('div', { class: 'card__actions' }, [
          el('a', { class: 'btn btn-ghost btn-sm', href: sourceHref(s), text: 'Open' }),
          el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Edit', on: { click: function () { App.forms.openSourceForm({ projectId: projectId, source: s, onSaved: function () { App.renderRoute(); } }); } } }),
          el('button', { type: 'button', class: 'btn btn-danger btn-sm', text: 'Delete', on: { click: function () { confirmDeleteSource(s); } } })
        ])
      ]);
    }

    function confirmDeleteSource(s) {
      ui.confirmDialog({
        title: 'Delete source?',
        message: 'Delete \u201C' + s.title + '\u201D? Its excerpts will be removed; linked notes will be kept but unlinked.',
        confirmLabel: 'Delete source', danger: true
      }).then(function (ok) {
        if (!ok) return;
        store.deleteSource(s.id);
        App.renderRoute();
        ui.toast('Source deleted.', 'success');
      });
    }

    searchInput.addEventListener('input', renderList);
    typeSelect.addEventListener('change', renderList);
    tagSelect.addEventListener('change', renderList);
    sortSelect.addEventListener('change', renderList);
    renderList();
  };

  /* ---------- source detail ---------- */
  App.views.source = function (main, params) {
    var state = store.getState();
    var source = models.getSource(state, params.sourceId);
    var project = source ? models.getProject(state, source.projectId) : null;

    if (!source || !project || source.projectId !== params.projectId) {
      ui.renderEmpty(main, { title: 'Source not found', message: 'It may have been deleted or moved.', actionLabel: 'Back to project', headingTag: 'h1', onAction: function () { router.navigate(router.build(['project', params.projectId, 'sources'])); } });
      return;
    }

    var container = el('div', { class: 'view view--source' });
    container.appendChild(el('a', { class: 'back-link', href: router.build(['project', project.id, 'sources']), text: '\u2190 Sources' }));

    var safeUrl = util.safeHref(source.url);
    var header = el('header', { class: 'detail-header' }, [
      el('div', {}, [
        el('span', { class: 'badge badge--type', text: source.type }),
        el('h1', { class: 'page-title', text: source.title }),
        el('p', { class: 'page-sub muted', text: [source.author, source.year != null ? source.year : null, source.publisher].filter(Boolean).join(' · ') || 'No author / year' }),
        safeUrl ? el('p', { class: 'source-url' }, [el('a', { href: safeUrl, rel: 'noopener noreferrer', target: '_blank', text: source.url })]) : (source.url ? el('p', { class: 'muted', text: source.url + ' (not a safe http/https link)' }) : null)
      ]),
      el('div', { class: 'detail-header__actions' }, [
        el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Edit', on: { click: function () { App.forms.openSourceForm({ projectId: project.id, source: source, onSaved: function () { App.renderRoute(); } }); } } }),
        el('button', { type: 'button', class: 'btn btn-danger btn-sm', text: 'Delete', on: { click: function () {
          ui.confirmDialog({ title: 'Delete source?', message: 'Delete \u201C' + source.title + '\u201D?', detail: 'Excerpts are removed; linked notes are kept but unlinked.', confirmLabel: 'Delete source', danger: true }).then(function (ok) {
            if (!ok) return; store.deleteSource(source.id); router.navigate(router.build(['project', project.id, 'sources'])); ui.toast('Source deleted.', 'success');
          });
        } } })
      ])
    ]);
    container.appendChild(header);

    if ((source.tags && source.tags.length)) {
      container.appendChild(el('div', { class: 'tag-row' }, source.tags.map(function (t) { return el('a', { class: 'tag', href: router.build(['tags', t]), text: t }); })));
    }
    if (source.notes) container.appendChild(el('section', { class: 'card', 'aria-label': 'Source notes' }, [el('h2', { class: 'section-title', text: 'Notes' }), el('p', { text: source.notes })]));

    /* excerpts */
    var exSection = el('section', { class: 'card', 'aria-labelledby': 'excerpts-title' }, [
      el('div', { class: 'panel-header' }, [
        el('h2', { id: 'excerpts-title', class: 'section-title', text: 'Excerpts' }),
        el('button', { type: 'button', class: 'btn btn-primary btn-sm', text: 'Add excerpt', on: { click: function () { App.forms.openExcerptForm({ sourceId: source.id, onSaved: function () { App.renderRoute(); } }); } } })
      ])
    ]);
    var excerpts = source.excerpts || [];
    if (excerpts.length === 0) {
      var exEmpty = el('div', {});
      ui.renderEmpty(exEmpty, { title: 'No excerpts', message: 'Capture quotes or passages from this source.', actionLabel: 'Add excerpt', onAction: function () { App.forms.openExcerptForm({ sourceId: source.id, onSaved: function () { App.renderRoute(); } }); } });
      exSection.appendChild(exEmpty);
    } else {
      var exList = el('ul', { class: 'excerpt-list' });
      excerpts.forEach(function (ex) {
        exList.appendChild(el('li', { class: 'excerpt' }, [
          el('blockquote', { class: 'excerpt__text', text: ex.text }),
          el('div', { class: 'excerpt__meta' }, [
            ex.page ? el('span', { class: 'muted', text: ex.page }) : null,
            ex.note ? el('span', { class: 'excerpt__note', text: ex.note }) : null,
            (ex.tags && ex.tags.length) ? el('span', { class: 'tag-row' }, ex.tags.map(function (t) { return el('span', { class: 'tag tag--static', text: t }); })) : null
          ]),
          el('div', { class: 'card__actions' }, [
            el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Edit', on: { click: function () { App.forms.openExcerptForm({ sourceId: source.id, excerpt: ex, onSaved: function () { App.renderRoute(); } }); } } }),
            el('button', { type: 'button', class: 'btn btn-danger btn-sm', text: 'Delete', on: { click: function () {
              ui.confirmDialog({ title: 'Delete excerpt?', message: 'Remove this excerpt?', confirmLabel: 'Delete', danger: true }).then(function (ok) { if (!ok) return; store.deleteExcerpt(source.id, ex.id); App.renderRoute(); ui.toast('Excerpt deleted.', 'success'); });
            } } })
          ])
        ]));
      });
      exSection.appendChild(exList);
    }
    container.appendChild(exSection);

    /* linked notes */
    var linked = models.notesForProject(state, project.id).filter(function (n) { return n.sourceId === source.id; });
    var noteSection = el('section', { class: 'card', 'aria-labelledby': 'linked-notes-title' }, [
      el('div', { class: 'panel-header' }, [
        el('h2', { id: 'linked-notes-title', class: 'section-title', text: 'Linked notes' }),
        el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Add note', on: { click: function () { App.forms.openNoteForm({ projectId: project.id, sourceId: source.id, onSaved: function () { App.renderRoute(); } }); } } })
      ])
    ]);
    if (linked.length === 0) noteSection.appendChild(el('p', { class: 'muted', text: 'No notes linked to this source.' }));
    else {
      var nl = el('ul', { class: 'note-list' });
      linked.forEach(function (n) {
        nl.appendChild(el('li', {}, [el('a', { href: router.build(['project', project.id, 'note', n.id]), text: n.title })]));
      });
      noteSection.appendChild(nl);
    }
    container.appendChild(noteSection);

    main.appendChild(container);
  };
})(window.App = window.App || {});
