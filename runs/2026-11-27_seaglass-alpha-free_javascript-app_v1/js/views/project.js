/* Fieldwork — single project workspace with Sources / Notes tabs. */
(function (App) {
  'use strict';
  var ui = App.ui; var models = App.models; var store = App.store; var router = App.router;
  var el = ui.el;

  App.views = App.views || {};
  App.views.project = function (main, params) {
    params = params || {};
    var state = store.getState();
    var project = models.getProject(state, params.projectId);

    if (!project) {
      ui.renderEmpty(main, { title: 'Project not found', message: 'It may have been deleted.', actionLabel: 'Back to projects', headingTag: 'h1', onAction: function () { router.navigate('#/projects'); } });
      return;
    }

    var tab = params.tab === 'notes' ? 'notes' : 'sources';
    var container = el('div', { class: 'view view--project' });

    // header
    var header = el('header', { class: 'project-header' }, [
      el('a', { class: 'back-link', href: router.build(['projects']), text: '\u2190 Projects' }),
      el('div', { class: 'project-header__main' }, [
        el('div', { class: 'project-header__title' }, [
          el('span', { class: 'project-dot project-dot--' + project.color + ' project-dot--lg', 'aria-hidden': 'true' }),
          el('h1', { class: 'page-title', text: project.name }),
          project.archived ? el('span', { class: 'badge badge--muted', text: 'Archived' }) : null
        ]),
        project.description ? el('p', { class: 'page-sub', text: project.description }) : null,
        el('p', { class: 'muted', text: 'Created ' + App.util.formatDate(project.createdAt) + ' · updated ' + App.util.relativeTime(project.updatedAt) })
      ]),
      el('div', { class: 'project-header__actions' }, [
        el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Edit', on: { click: function () { App.forms.openProjectForm({ project: project, onSaved: function () { App.renderRoute(); } }); } } }),
        el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: project.archived ? 'Restore' : 'Archive', on: { click: function () { store.setProjectArchived(project.id, !project.archived); App.renderRoute(); ui.toast(project.archived ? 'Project restored.' : 'Project archived.', 'success'); } } }),
        el('button', { type: 'button', class: 'btn btn-danger btn-sm', text: 'Delete', on: { click: function () { confirmDeleteProject(project); } } })
      ])
    ]);
    container.appendChild(header);

    // tabs
    var sourcesHref = router.build(['project', project.id, 'sources']);
    var notesHref = router.build(['project', project.id, 'notes']);
    var tabs = el('nav', { class: 'tabs', 'aria-label': 'Project sections' }, [
      el('a', { class: 'tab' + (tab === 'sources' ? ' is-active' : ''), href: sourcesHref, 'aria-current': tab === 'sources' ? 'page' : null, text: 'Sources' }),
      el('a', { class: 'tab' + (tab === 'notes' ? ' is-active' : ''), href: notesHref, 'aria-current': tab === 'notes' ? 'page' : null, text: 'Notes' })
    ]);
    container.appendChild(tabs);

    var panel = el('section', { class: 'tab-panel', role: 'region', 'aria-label': tab === 'notes' ? 'Notes' : 'Sources' });
    container.appendChild(panel);
    main.appendChild(container);

    if (tab === 'notes') {
      if (App.views.notesPanel) App.views.notesPanel(panel, project.id);
    } else {
      if (App.views.sourcesPanel) App.views.sourcesPanel(panel, project.id);
    }
  };

  function confirmDeleteProject(project) {
    var state = store.getState();
    ui.confirmDialog({
      title: 'Delete project?',
      message: 'Delete \u201C' + project.name + '\u201D and all of its sources and notes? This cannot be undone.',
      detail: models.sourcesForProject(state, project.id).length + ' sources and ' + models.notesForProject(state, project.id).length + ' notes will be removed.',
      confirmLabel: 'Delete project', danger: true
    }).then(function (ok) {
      if (!ok) return;
      store.deleteProject(project.id);
      router.navigate('#/projects');
      ui.toast('Project deleted.', 'success');
    });
  }
})(window.App = window.App || {});
