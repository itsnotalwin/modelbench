/* Fieldwork — not-found view. */
(function (App) {
  'use strict';
  var ui = App.ui;
  App.views = App.views || {};
  App.views.notfound = function (main) {
    ui.clear(main);
    main.appendChild(ui.el('div', { class: 'empty', role: 'note' }, [
      ui.el('h1', { class: 'page-title', text: 'Page not found' }),
      ui.el('p', { class: 'muted', text: 'That link doesn\u2019t match anything here.' }),
      ui.el('div', { class: 'empty__action' }, [
        ui.el('button', { type: 'button', class: 'btn btn-primary', text: 'Go to dashboard', on: { click: function () { App.router.navigate('#/'); } } })
      ])
    ]));
  };
})(window.App = window.App || {});
