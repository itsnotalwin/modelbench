/* Fieldwork — dashboard view. */
(function (App) {
  'use strict';
  var ui = App.ui; var models = App.models; var store = App.store; var router = App.router;
  var el = ui.el;

  function stat(label, value, href, sub) {
    return el('a', { class: 'stat', href: href }, [
      el('span', { class: 'stat__value', text: String(value) }),
      el('span', { class: 'stat__label', text: label }),
      sub ? el('span', { class: 'stat__sub', text: sub }) : null
    ]);
  }

  App.views = App.views || {};
  App.views.dashboard = function (main) {
    var state = store.getState();
    var projects = state.projects || [];
    var sources = state.sources || [];
    var notes = state.notes || [];
    var excerpts = sources.reduce(function (n, s) { return n + ((s.excerpts || []).length); }, 0);
    var tags = models.allTags(state);
    var activeProjects = projects.filter(function (p) { return !p.archived; });

    var container = el('div', { class: 'view view--dashboard' });

    container.appendChild(el('section', { class: 'hero' }, [
      el('h1', { class: 'page-title', text: 'Fieldwork' }),
      el('p', { class: 'page-sub', text: 'A local-first research workspace. Organise projects, sources, excerpts and notes — everything stays in your browser.' }),
      el('div', { class: 'hero__actions' }, [
        el('button', { type: 'button', class: 'btn btn-primary', text: 'New project', on: { click: function () { App.forms.openProjectForm({ onSaved: function (res) { router.navigate('#/project/' + res.id); } }); } } }),
        el('a', { class: 'btn btn-ghost', href: router.build(['projects']), text: 'Browse projects' }),
        el('a', { class: 'btn btn-ghost', href: router.build(['search']), text: 'Search' })
      ])
    ]));

    // empty state for brand-new users
    if (projects.length === 0) {
      var emptyWrap = el('div', {});
      ui.renderEmpty(emptyWrap, {
        title: 'No projects yet',
        message: 'Create your first research project, then add sources, excerpts and notes. Everything is saved in this browser; export any time from Settings.',
        actionLabel: 'Create a project',
        onAction: function () { App.forms.openProjectForm({ onSaved: function (res) { router.navigate('#/project/' + res.id); } }); }
      });
      container.appendChild(emptyWrap);
      main.appendChild(container);
      return;
    }

    // stats
    container.appendChild(el('section', { class: 'stats', 'aria-label': 'Overview' }, [
      stat('Projects', activeProjects.length, router.build(['projects']), projects.length - activeProjects.length + ' archived'),
      stat('Sources', sources.length, projects.length ? router.build(['project', projects[0].id, 'sources']) : router.build(['projects'])),
      stat('Notes', notes.length, projects.length ? router.build(['project', projects[0].id, 'notes']) : router.build(['projects'])),
      stat('Excerpts', excerpts, projects.length ? router.build(['project', projects[0].id, 'sources']) : router.build(['projects'])),
      stat('Tags', tags.length, router.build(['tags']))
    ]));

    // recent activity
    var recent = []
      .concat(sources.map(function (s) { return { kind: 'Source', title: s.title, at: s.updatedAt, href: router.build(['project', s.projectId, 'source', s.id]), project: (models.getProject(state, s.projectId) || {}).name }; }))
      .concat(notes.map(function (n) { return { kind: 'Note', title: n.title, at: n.updatedAt, href: router.build(['project', n.projectId, 'note', n.id]), project: (models.getProject(state, n.projectId) || {}).name }; }))
      .sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); })
      .slice(0, 6);

    var recentWrap = el('section', { class: 'card', 'aria-labelledby': 'recent-title' }, [el('h2', { id: 'recent-title', class: 'card__title', text: 'Recently updated' })]);
    if (recent.length === 0) {
      recentWrap.appendChild(el('p', { class: 'muted', text: 'No sources or notes yet. Add some inside a project.' }));
    } else {
      var list = el('ul', { class: 'recent-list' });
      recent.forEach(function (item) {
        list.appendChild(el('li', {}, [
          el('a', { class: 'recent-list__link', href: item.href }, [
            el('span', { class: 'badge badge--' + (item.kind === 'Note' ? 'note' : 'source'), text: item.kind }),
            el('span', { class: 'recent-list__title', text: item.title })
          ]),
          el('span', { class: 'muted recent-list__meta', text: [item.project, App.util.relativeTime(item.at)].filter(Boolean).join(' · ') })
        ]));
      });
      recentWrap.appendChild(list);
    }
    container.appendChild(recentWrap);

    // projects quick list
    var projWrap = el('section', { class: 'card', 'aria-labelledby': 'projects-title' }, [
      el('div', { class: 'card__header' }, [
        el('h2', { id: 'projects-title', class: 'card__title', text: 'Projects' }),
        el('a', { class: 'card__action', href: router.build(['projects']), text: 'View all' })
      ])
    ]);
    var plist = el('ul', { class: 'project-list project-list--compact' });
    activeProjects.slice(0, 5).forEach(function (p) {
      plist.appendChild(el('li', {}, [
        el('a', { class: 'project-link', href: router.build(['project', p.id]) }, [
          el('span', { class: 'project-dot project-dot--' + p.color, 'aria-hidden': 'true' }),
          el('span', { text: p.name })
        ]),
        el('span', { class: 'muted', text: models.sourcesForProject(state, p.id).length + ' sources · ' + models.notesForProject(state, p.id).length + ' notes' })
      ]));
    });
    if (activeProjects.length === 0) projWrap.appendChild(el('p', { class: 'muted', text: 'No active projects.' }));
    else projWrap.appendChild(plist);
    container.appendChild(projWrap);

    main.appendChild(container);
  };
})(window.App = window.App || {});
