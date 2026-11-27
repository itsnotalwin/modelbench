/* Fieldwork — global search across projects, sources, excerpts, notes, tags. */
(function (App) {
  'use strict';
  var ui = App.ui; var models = App.models; var store = App.store; var router = App.router;
  var el = ui.el;

  App.views = App.views || {};

  function hay(/*...strings*/) {
    var parts = [];
    for (var i = 0; i < arguments.length; i++) parts.push(arguments[i] == null ? '' : String(arguments[i]));
    return parts.join(' ').toLowerCase();
  }

  App.views.search = function (main, query) {
    query = query || {};
    var state = store.getState();
    var container = el('div', { class: 'view view--search' });
    container.appendChild(el('div', { class: 'page-header' }, [
      el('div', {}, [el('h1', { class: 'page-title', text: 'Search' }), el('p', { class: 'page-sub', text: 'Search everything in your workspace.' })])
    ]));

    var input = el('input', { type: 'search', class: 'input input--lg', id: 'global-search', name: 'q', placeholder: 'Search projects, sources, excerpts, notes…', 'aria-label': 'Search', autocomplete: 'off', value: query.q || '' });
    var form = el('form', { class: 'search-form', role: 'search', on: { submit: function (e) { e.preventDefault(); router.navigate(router.build(['search'], { q: input.value.trim() })); } } }, [
      el('label', { class: 'visually-hidden', for: 'global-search', text: 'Search' }),
      input,
      el('button', { type: 'submit', class: 'btn btn-primary', text: 'Search' })
    ]);
    container.appendChild(form);

    var resultsWrap = el('div', { class: 'search-results', role: 'region', 'aria-label': 'Results', 'aria-live': 'polite' });
    container.appendChild(resultsWrap);
    main.appendChild(container);

    renderResults(input.value.trim());
    input.addEventListener('input', function () { renderResults(input.value.trim()); });

    function renderResults(qRaw) {
      var q = qRaw.trim().toLowerCase();
      ui.clear(resultsWrap);
      if (!q) {
        resultsWrap.appendChild(el('p', { class: 'muted', text: 'Type to search. Press Enter to update the results link.' }));
        return;
      }

      var groups = [];

      // projects
      var projects = state.projects.filter(function (p) { return hay(p.name, p.description).indexOf(q) !== -1; });
      if (projects.length) groups.push(group('Projects', projects.map(function (p) {
        return item(router.build(['project', p.id]), p.name, p.description || '', 'Project', null);
      })));

      // sources + excerpts
      var sourceItems = []; var excerptItems = [];
      state.sources.forEach(function (s) {
        var project = models.getProject(state, s.projectId);
        var projectName = project ? project.name : '';
        if (hay(s.title, s.author, s.publisher, s.notes, (s.tags || []).join(' '), s.url).indexOf(q) !== -1) {
          sourceItems.push(item(router.build(['project', s.projectId, 'source', s.id]), s.title, [s.author, s.year, s.publisher].filter(Boolean).join(' · '), 'Source', projectName));
        }
        (s.excerpts || []).forEach(function (ex) {
          if (hay(ex.text, ex.note, ex.page, (ex.tags || []).join(' ')).indexOf(q) !== -1) {
            excerptItems.push(item(router.build(['project', s.projectId, 'source', s.id]), s.title, ex.text, 'Excerpt', projectName));
          }
        });
      });
      if (sourceItems.length) groups.push(group('Sources', sourceItems));
      if (excerptItems.length) groups.push(group('Excerpts', excerptItems));

      // notes
      var noteItems = [];
      state.notes.forEach(function (n) {
        var project = models.getProject(state, n.projectId);
        if (hay(n.title, n.body, (n.tags || []).join(' ')).indexOf(q) !== -1) {
          noteItems.push(item(router.build(['project', n.projectId, 'note', n.id]), n.title, (n.body || '').slice(0, 140), 'Note', project ? project.name : ''));
        }
      });
      if (noteItems.length) groups.push(group('Notes', noteItems));

      // tags
      var tagItems = models.allTags(state).filter(function (t) { return t.name.indexOf(q) !== -1; }).map(function (t) {
        return item(router.build(['tags', t.name]), t.name, t.count + ' use' + (t.count === 1 ? '' : 's'), 'Tag', null);
      });
      if (tagItems.length) groups.push(group('Tags', tagItems));

      if (groups.length === 0) {
        resultsWrap.appendChild(el('div', { class: 'empty' }, [el('h3', { class: 'empty__title', text: 'No results' }), el('p', { class: 'muted', text: 'Nothing matches \u201C' + qRaw + '\u201D.' })]));
      } else {
        groups.forEach(function (g) { resultsWrap.appendChild(g); });
      }
    }

    function group(title, items) {
      return el('section', { class: 'search-group' }, [
        el('h2', { class: 'search-group__title', text: title + ' (' + items.length + ')' }),
        el('ul', { class: 'search-group__list' }, items)
      ]);
    }
    function item(href, title, snippet, kind, projectName) {
      return el('li', { class: 'search-item' }, [
        el('a', { class: 'search-item__link', href: href }, [
          el('span', { class: 'badge', text: kind }),
          el('span', { class: 'search-item__title', text: title })
        ]),
        snippet ? el('p', { class: 'search-item__snippet muted', text: snippet }) : null,
        projectName ? el('span', { class: 'muted search-item__project', text: projectName }) : null
      ]);
    }
  };
})(window.App = window.App || {});
