/* Fieldwork — tags view + tag filtering. */
(function (App) {
  'use strict';
  var ui = App.ui; var models = App.models; var store = App.store; var router = App.router;
  var el = ui.el;

  App.views = App.views || {};
  App.views.tags = function (main, params) {
    params = params || {};
    var state = store.getState();
    var tags = models.allTags(state);
    var active = params.tag ? App.util.normalizeTag(params.tag) : null;

    var container = el('div', { class: 'view view--tags' });
    container.appendChild(el('div', { class: 'page-header' }, [
      el('div', {}, [el('h1', { class: 'page-title', text: 'Tags' }), el('p', { class: 'page-sub', text: 'Tags span sources, excerpts and notes across all projects.' })])
    ]));

    if (tags.length === 0) {
      var empty = el('div', {});
      ui.renderEmpty(empty, { title: 'No tags yet', message: 'Add tags to sources, excerpts or notes and they will appear here.', actionLabel: 'Go to projects', onAction: function () { router.navigate('#/projects'); } });
      container.appendChild(empty);
      main.appendChild(container);
      return;
    }

    // tag cloud
    var cloud = el('ul', { class: 'tag-cloud', 'aria-label': 'All tags' });
    tags.forEach(function (t) {
      cloud.appendChild(el('li', {}, [
        el('a', { class: 'tag tag--cloud' + (active === t.name ? ' is-active' : ''), href: router.build(['tags', t.name]), 'aria-current': active === t.name ? 'true' : null, text: t.name + ' (' + t.count + ')' })
      ]));
    });
    container.appendChild(cloud);

    // filtered results
    if (active) {
      var results = el('section', { class: 'card', 'aria-labelledby': 'tag-results-title' }, [el('h2', { id: 'tag-results-title', class: 'section-title', text: 'Tagged “' + active + '”' })]);
      var items = [];

      state.sources.forEach(function (s) {
        var project = models.getProject(state, s.projectId);
        if ((s.tags || []).indexOf(active) !== -1) {
          items.push(el('li', { class: 'tag-result' }, [
            el('span', { class: 'badge badge--source', text: 'Source' }),
            el('a', { href: router.build(['project', s.projectId, 'source', s.id]), text: s.title }),
            project ? el('span', { class: 'muted', text: ' · ' + project.name }) : null
          ]));
        }
        (s.excerpts || []).forEach(function (ex) {
          if ((ex.tags || []).indexOf(active) !== -1) {
            items.push(el('li', { class: 'tag-result' }, [
              el('span', { class: 'badge badge--muted', text: 'Excerpt' }),
              el('a', { href: router.build(['project', s.projectId, 'source', s.id]), text: s.title }),
              el('span', { class: 'muted', text: ' — ' + ex.text.slice(0, 80) + (ex.text.length > 80 ? '…' : '') })
            ]));
          }
        });
      });
      state.notes.forEach(function (n) {
        var project = models.getProject(state, n.projectId);
        if ((n.tags || []).indexOf(active) !== -1) {
          items.push(el('li', { class: 'tag-result' }, [
            el('span', { class: 'badge badge--note', text: 'Note' }),
            el('a', { href: router.build(['project', n.projectId, 'note', n.id]), text: n.title }),
            project ? el('span', { class: 'muted', text: ' · ' + project.name }) : null
          ]));
        }
      });

      if (items.length === 0) results.appendChild(el('p', { class: 'muted', text: 'Nothing tagged with this.' }));
      else results.appendChild(el('ul', { class: 'tag-results' }, items));
      results.appendChild(el('p', { class: 'tag-results__footer' }, [el('a', { class: 'btn btn-ghost btn-sm', href: router.build(['tags']), text: 'Clear filter' })]));
      container.appendChild(results);
    }

    main.appendChild(container);
  };
})(window.App = window.App || {});
