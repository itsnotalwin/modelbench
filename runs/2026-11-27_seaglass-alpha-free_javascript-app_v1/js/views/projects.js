/* Fieldwork — projects list view. */
(function (App) {
  'use strict';
  var ui = App.ui; var models = App.models; var store = App.store; var router = App.router;
  var el = ui.el;

  App.views = App.views || {};
  App.views.projects = function (main) {
    var state = store.getState();
    var container = el('div', { class: 'view view--projects' });

    container.appendChild(el('div', { class: 'page-header' }, [
      el('div', {}, [
        el('h1', { class: 'page-title', text: 'Projects' }),
        el('p', { class: 'page-sub', text: 'Each project holds its own sources, excerpts and notes.' })
      ]),
      el('button', { type: 'button', class: 'btn btn-primary', text: 'New project', on: { click: function () { App.forms.openProjectForm({ onSaved: function (res) { router.navigate('#/project/' + res.id); } }); } } })
    ]));

    var projects = (state.projects || []).slice();
    if (projects.length === 0) {
      var empty = el('div', {});
      ui.renderEmpty(empty, {
        title: 'No projects yet',
        message: 'Create a project to start collecting sources and notes.',
        actionLabel: 'New project',
        onAction: function () { App.forms.openProjectForm({ onSaved: function (res) { router.navigate('#/project/' + res.id); } }); }
      });
      container.appendChild(empty);
      main.appendChild(container);
      return;
    }

    // controls
    var controls = el('div', { class: 'toolbar', role: 'search' });
    var searchInput = el('input', { type: 'search', class: 'input', id: 'project-filter', name: 'project-filter', placeholder: 'Filter projects…', 'aria-label': 'Filter projects', autocomplete: 'off' });
    var sortSelect = el('select', { class: 'input', id: 'project-sort', name: 'project-sort', 'aria-label': 'Sort projects' }, [
      el('option', { value: 'updated', text: 'Recently updated' }),
      el('option', { value: 'name', text: 'Name (A–Z)' }),
      el('option', { value: 'created', text: 'Newest first' }),
      el('option', { value: 'sources', text: 'Most sources' })
    ]);
    var showArchived = el('input', { type: 'checkbox', id: 'show-archived', name: 'show-archived' });
    var archivedLabel = el('label', { class: 'checkbox', for: 'show-archived' }, [showArchived, el('span', { text: 'Show archived' })]);
    controls.appendChild(el('div', { class: 'field field--inline' }, [el('label', { class: 'visually-hidden', for: 'project-filter', text: 'Filter projects' }), searchInput]));
    controls.appendChild(el('div', { class: 'field field--inline' }, [el('label', { class: 'visually-hidden', for: 'project-sort', text: 'Sort projects' }), sortSelect]));
    controls.appendChild(archivedLabel);
    container.appendChild(controls);

    var listWrap = el('div', { class: 'projects-grid', id: 'projects-list' });
    container.appendChild(listWrap);
    var countRegion = el('p', { class: 'muted result-count', role: 'status', 'aria-live': 'polite' });
    container.appendChild(countRegion);
    main.appendChild(container);

    function renderList() {
      var q = searchInput.value.trim().toLowerCase();
      var showArch = showArchived.checked;
      var sort = sortSelect.value;
      var list = (state.projects || []).slice().filter(function (p) {
        if (!showArch && p.archived) return false;
        if (!q) return true;
        return (p.name + ' ' + p.description).toLowerCase().indexOf(q) !== -1;
      });
      list.sort(function (a, b) {
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (sort === 'created') return String(b.createdAt).localeCompare(String(a.createdAt));
        if (sort === 'sources') return models.sourcesForProject(state, b.id).length - models.sourcesForProject(state, a.id).length;
        return String(b.updatedAt).localeCompare(String(a.updatedAt));
      });

      ui.clear(listWrap);
      if (list.length === 0) {
        var empty = el('div', { class: 'span-all' });
        ui.renderEmpty(empty, { title: 'No matching projects', message: q ? 'Try a different filter.' : 'Create a new project.' });
        listWrap.appendChild(empty);
      } else {
        list.forEach(function (p) { listWrap.appendChild(projectCard(p)); });
      }
      countRegion.textContent = list.length + ' project' + (list.length === 1 ? '' : 's');
    }

    function projectCard(p) {
      var srcCount = models.sourcesForProject(state, p.id).length;
      var noteCount = models.notesForProject(state, p.id).length;
      var card = el('article', { class: 'card project-card' + (p.archived ? ' is-archived' : '') }, [
        el('div', { class: 'project-card__head' }, [
          el('span', { class: 'project-dot project-dot--' + p.color, 'aria-hidden': 'true' }),
          el('h2', { class: 'card__title' }, [el('a', { class: 'card__link', href: router.build(['project', p.id]), text: p.name })]),
          p.archived ? el('span', { class: 'badge badge--muted', text: 'Archived' }) : null
        ]),
        p.description ? el('p', { class: 'project-card__desc', text: p.description }) : el('p', { class: 'project-card__desc muted', text: 'No description.' }),
        el('p', { class: 'muted', text: srcCount + ' sources · ' + noteCount + ' notes · updated ' + App.util.relativeTime(p.updatedAt) }),
        el('div', { class: 'card__actions' }, [
          el('a', { class: 'btn btn-ghost btn-sm', href: router.build(['project', p.id]), text: 'Open' }),
          el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Edit', on: { click: function () { App.forms.openProjectForm({ project: p, onSaved: function () { renderList(); } }); } } }),
          el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: p.archived ? 'Restore' : 'Archive', on: { click: function () { store.setProjectArchived(p.id, !p.archived); renderList(); ui.toast(p.archived ? 'Project restored.' : 'Project archived.', 'success'); } } }),
          el('button', { type: 'button', class: 'btn btn-danger btn-sm', text: 'Delete', on: { click: function () { confirmDelete(p); } } })
        ])
      ]);
      return card;
    }

    function confirmDelete(p) {
      ui.confirmDialog({
        title: 'Delete project?',
        message: 'Delete \u201C' + p.name + '\u201D and all of its sources and notes? This cannot be undone.',
        detail: models.sourcesForProject(state, p.id).length + ' sources and ' + models.notesForProject(state, p.id).length + ' notes will be removed.',
        confirmLabel: 'Delete project', danger: true
      }).then(function (ok) {
        if (!ok) return;
        store.deleteProject(p.id);
        renderList();
        ui.toast('Project deleted.', 'success');
      });
    }

    searchInput.addEventListener('input', renderList);
    sortSelect.addEventListener('change', renderList);
    showArchived.addEventListener('change', renderList);
    renderList();
  };
})(window.App = window.App || {});
