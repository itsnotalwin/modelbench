/* Fiscus — application shell: hash router, primary navigation, the shared
   month selector, global keyboard shortcuts and boot. Views render into
   #view and re-render on every store change. */
window.F = window.F || {};

F.app = (function () {
  'use strict';

  const U = F.util;
  const UI_STATE_KEY = 'fiscus.ui.v1';

  const VIEWS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', view: () => F.views.dashboard },
    { id: 'transactions', label: 'Transactions', icon: 'list', view: () => F.views.transactions },
    { id: 'budgets', label: 'Budgets', icon: 'target', view: () => F.views.budgets },
    { id: 'reports', label: 'Reports', icon: 'chart', view: () => F.views.reports },
    { id: 'settings', label: 'Settings', icon: 'sliders', view: () => F.views.settings }
  ];

  let currentView = 'dashboard';
  let month = U.currentMonth(); // shared month selection, persisted across reloads

  /* ---------- persisted UI state ---------- */

  function loadUiState() {
    try {
      const raw = window.localStorage.getItem(UI_STATE_KEY);
      if (raw) {
        const v = JSON.parse(raw);
        if (v && U.isMonth(v.month)) month = v.month;
      }
    } catch (e) { /* fall back to the current month */ }
  }

  function saveUiState() {
    try {
      window.localStorage.setItem(UI_STATE_KEY, JSON.stringify({ month: month }));
    } catch (e) { /* non-fatal */ }
  }

  function getMonth() { return month; }

  function setMonth(m) {
    if (!U.isMonth(m)) return;
    month = m;
    saveUiState();
  }

  /* ---------- shared month bar ---------- */

  function monthBar() {
    const wrap = document.createElement('div');
    wrap.className = 'month-bar';
    wrap.innerHTML =
      '<button type="button" class="icon-btn" data-m-prev aria-label="Previous month">' + F.ui.icon('chevL') + '</button>' +
      '<div class="month-label" aria-live="polite">' + U.esc(U.monthLabel(month)) + '</div>' +
      '<button type="button" class="icon-btn" data-m-next aria-label="Next month">' + F.ui.icon('chevR') + '</button>' +
      (month !== U.currentMonth()
        ? '<button type="button" class="btn btn-ghost btn-sm" data-m-today>Today</button>'
        : '');

    wrap.querySelector('[data-m-prev]').addEventListener('click', () => { setMonth(U.addMonths(month, -1)); rerender(); });
    wrap.querySelector('[data-m-next]').addEventListener('click', () => { setMonth(U.addMonths(month, 1)); rerender(); });
    const today = wrap.querySelector('[data-m-today]');
    if (today) today.addEventListener('click', () => { setMonth(U.currentMonth()); rerender(); });
    return wrap;
  }

  /* ---------- router ---------- */

  function currentRoute() {
    const h = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase();
    return VIEWS.some(v => v.id === h) ? h : 'dashboard';
  }

  function renderRoute(focusMain) {
    F.ui.closeAllModals();
    const id = currentRoute();
    currentView = id;

    document.querySelectorAll('.nav-item').forEach(a => {
      const active = a.getAttribute('data-route') === id;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    const container = document.getElementById('view');
    container.innerHTML = '';
    const view = VIEWS.find(x => x.id === id).view();
    view.render(container);
    document.title = 'Fiscus — ' + view.title();
    if (focusMain) container.focus({ preventScroll: true });
  }

  function rerender() { renderRoute(false); }

  /* ---------- shared flows ---------- */

  function openTransactionForm(existing, defaultType) {
    F.views.transactions.openForm(existing || null, defaultType || null);
  }

  /* ---------- boot ---------- */

  function buildNav() {
    const nav = document.getElementById('main-nav');
    nav.innerHTML = VIEWS.map(v =>
      '<a class="nav-item" data-route="' + v.id + '" href="#/' + v.id + '">' +
      F.ui.icon(v.icon) + '<span class="nav-label">' + v.label + '</span></a>').join('');
  }

  function boot() {
    F.storage.detect();
    loadUiState();
    const init = F.store.init();
    buildNav();

    // Any committed store mutation re-renders the active view.
    F.store.subscribe(() => rerender());

    window.addEventListener('hashchange', () => renderRoute(true));
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    if (!F.storage.isPersistent()) {
      const banner = document.getElementById('storage-banner');
      banner.hidden = false;
      banner.querySelector('[data-dismiss]').addEventListener('click', () => { banner.hidden = true; });
    }

    if (init.corrupted) {
      setTimeout(() => {
        F.ui.toast('Saved data could not be read and has been reset. If you kept a backup, import it from Settings.',
          { type: 'error', timeout: 9000 });
      }, 300);
    }

    // "N" opens the add-transaction form when not typing in a field.
    document.addEventListener('keydown', e => {
      if (e.key !== 'n' && e.key !== 'N') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (F.ui.modalOpen()) return;
      e.preventDefault();
      openTransactionForm();
    });

    renderRoute(false);
  }

  document.addEventListener('DOMContentLoaded', boot);

  return {
    getMonth: getMonth,
    setMonth: setMonth,
    monthBar: monthBar,
    rerender: rerender,
    openTransactionForm: openTransactionForm
  };
})();
