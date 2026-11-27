/* Fieldwork — application bootstrap, routing, theming, error boundaries. */
(function (App) {
  'use strict';

  var store = App.store;
  var router = App.router;
  var ui = App.ui;

  var main = null;
  var nav = null;
  var menuBtn = null;
  var lastRouteKey = null;

  /* ---------- route resolution ---------- */
  function resolve(route) {
    var p = (route && route.parts) || [];
    if (p.length === 0) return { name: 'dashboard' };
    switch (p[0]) {
      case 'dashboard': return { name: 'dashboard' };
      case 'projects': return { name: 'projects' };
      case 'project':
        if (!p[1]) return { name: 'projects' };
        var sub = p[2] || 'sources';
        if (sub === 'source') return { name: 'source', params: { projectId: p[1], sourceId: p[3] } };
        if (sub === 'note') return { name: 'note', params: { projectId: p[1], noteId: p[3] } };
        if (sub === 'notes') return { name: 'project', params: { projectId: p[1], tab: 'notes' } };
        return { name: 'project', params: { projectId: p[1], tab: 'sources' } };
      case 'tags': return { name: 'tags', params: { tag: p[1] || null } };
      case 'search': return { name: 'search', query: route.query || {} };
      case 'settings': return { name: 'settings' };
      default: return { name: 'notfound' };
    }
  }

  function titleFor(r) {
    switch (r.name) {
      case 'dashboard': return 'Dashboard';
      case 'projects': return 'Projects';
      case 'project': return 'Project';
      case 'source': return 'Source';
      case 'note': return 'Note';
      case 'tags': return 'Tags';
      case 'search': return 'Search';
      case 'settings': return 'Settings';
      default: return 'Not found';
    }
  }

  /* ---------- rendering ---------- */
  function renderRoute(opts) {
    opts = opts || {};
    if (!main) return;
    var route = router.current();
    var r = resolve(route);
    var key = (route.parts || []).join('/') + '?' + Object.keys(route.query || {}).sort().map(function (k) { return k + '=' + route.query[k]; }).join('&');
    var routeChanged = key !== lastRouteKey;
    lastRouteKey = key;

    applyTheme();
    ui.clear(main);

    try {
      switch (r.name) {
        case 'dashboard': App.views.dashboard(main); break;
        case 'projects': App.views.projects(main); break;
        case 'project': App.views.project(main, r.params); break;
        case 'source': App.views.source(main, r.params); break;
        case 'note': App.views.note(main, r.params); break;
        case 'tags': App.views.tags(main, r.params); break;
        case 'search': App.views.search(main, r.query); break;
        case 'settings': App.views.settings(main); break;
        default: App.views.notfound(main); break;
      }
    } catch (e) {
      ui.clear(main);
      main.appendChild(ui.el('div', { class: 'notice notice--error', role: 'alert' }, [
        ui.el('h1', { class: 'page-title', text: 'Something went wrong' }),
        ui.el('p', { text: 'This view could not be displayed. Your data has not been changed.' }),
        ui.el('div', { class: 'btn-row' }, [
          ui.el('button', { type: 'button', class: 'btn btn-primary', text: 'Reload', on: { click: function () { window.location.reload(); } } }),
          ui.el('a', { class: 'btn btn-ghost', href: '#/', text: 'Go to dashboard' })
        ])
      ]));
      if (window.console && console.error) console.error('Render error:', e);
    }

    updateNav(r.name);
    document.title = titleFor(r) + ' \u00B7 Fieldwork';

    // focus + scroll management on real route changes
    if (opts.focus || routeChanged) {
      if (opts.scroll) { try { window.scrollTo(0, 0); } catch (e) {} }
      // move keyboard focus to the main region for screen-reader + keyboard users
      try { main.focus({ preventScroll: true }); } catch (e) { try { main.focus(); } catch (e2) {} }
    }
    closeMenu();
  }
  App.renderRoute = renderRoute;

  function updateNav(activeName) {
    if (!nav) return;
    var links = nav.querySelectorAll('[data-nav]');
    var map = { dashboard: '#/', projects: '#/projects', tags: '#/tags', search: '#/search', settings: '#/settings' };
    Array.prototype.slice.call(links).forEach(function (a) {
      var key = a.getAttribute('data-nav');
      var href = map[key];
      // project pages count as "projects" section
      var isActive = (key === activeName) || (key === 'projects' && (activeName === 'project' || activeName === 'source' || activeName === 'note'));
      if (isActive) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      a.classList.toggle('is-active', !!isActive);
    });
  }

  /* ---------- theming ---------- */
  function systemDark() { try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; } }
  function applyTheme() {
    var pref = (store.getState().settings && store.getState().settings.theme) || 'system';
    var effective = pref === 'system' ? (systemDark() ? 'dark' : 'light') : pref;
    var root = document.documentElement;
    root.setAttribute('data-theme', effective);
    root.setAttribute('data-theme-pref', pref);
  }
  App.applyTheme = applyTheme;

  /* ---------- mobile menu ---------- */
  function closeMenu() {
    if (!nav || !menuBtn) return;
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  function toggleMenu() {
    if (!nav || !menuBtn) return;
    var open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /* ---------- global keyboard ---------- */
  function onKeydown(e) {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !App.util.isTypingTarget(e.target)) {
      var searchLink = document.querySelector('[data-nav="search"]');
      e.preventDefault();
      router.navigate('#/search');
      // focus search input after render
      setTimeout(function () { var inp = document.getElementById('global-search'); if (inp) inp.focus(); }, 0);
      return;
    }
  }

  /* ---------- error boundaries ---------- */
  function installErrorHandlers() {
    window.addEventListener('error', function (e) {
      if (window.console && console.error) console.error(e.error || e.message);
      ui.toast('Something went wrong. Your data is safe.', 'error');
    });
    window.addEventListener('unhandledrejection', function (e) {
      if (window.console && console.error) console.error(e.reason);
      ui.toast('An action could not be completed.', 'error');
    });
  }

  /* ---------- cross-tab sync ---------- */
  function installStorageSync() {
    window.addEventListener('storage', function (e) {
      if (e.key === store.KEY) { try { store.reload(); renderRoute(); } catch (err) {} }
    });
  }

  /* ---------- init ---------- */
  function init() {
    main = document.getElementById('main');
    nav = document.getElementById('primary-nav');
    menuBtn = document.getElementById('menu-toggle');

    if (menuBtn) menuBtn.addEventListener('click', toggleMenu);
    // close menu when a nav link is chosen
    if (nav) nav.addEventListener('click', function (e) { if (e.target && e.target.tagName === 'A') closeMenu(); });
    document.addEventListener('keydown', onKeydown);

    // close mobile menu on Escape
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

    installErrorHandlers();
    installStorageSync();

    // theme system changes
    try {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () { if (((store.getState().settings || {}).theme) === 'system') applyTheme(); };
      if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
    } catch (e) {}

    try { store.load(); } catch (e) { if (window.console) console.error(e); }
    applyTheme();

    router.start(function () { renderRoute({ focus: true, scroll: true }); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.App = window.App || {});
