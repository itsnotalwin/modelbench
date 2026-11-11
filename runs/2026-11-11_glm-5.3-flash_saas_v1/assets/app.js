/* ============================================================
   ClearDesk — application shell: persistence (localStorage with
   try/catch everywhere + in-memory fallback), auth, router,
   navigation shell, global search, keyboard shortcuts and the
   login / dashboard / settings views.
   ============================================================ */
(function () {
  'use strict';

  var C = window.CDCore, Seed = window.CDSeed, U = window.CDUI;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var DB_KEY = 'cleardesk.db.v1';
  var SESSION_KEY = 'cleardesk.session.v1';

  var App = {
    db: null,
    session: null,
    storageOk: true,
    route: { name: 'dashboard' },
    filters: { q: '', status: '', client: '', mode: '', unpaid: false, sort: 'updated', dir: 'desc' },
    draft: null,
    draftSnap: null
  };

  /* ================= persistence (all accesses guarded) ================= */

  function probeStorage() {
    try {
      localStorage.setItem('cleardesk.__probe', '1');
      localStorage.removeItem('cleardesk.__probe');
      return true;
    } catch (e) { return false; }
  }

  function loadDb() {
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (!raw) return null;
      var db = JSON.parse(raw);
      if (!db || !db.org || !Array.isArray(db.entries) || !Array.isArray(db.clients) ||
          !Array.isArray(db.tariff) || !Array.isArray(db.users) || !Array.isArray(db.payments)) return null;
      return db;
    } catch (e) { return null; }
  }

  function persist() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(App.db));
      App.storageOk = true;
    } catch (e) {
      App.storageOk = false;
      showStorageBanner();
    }
  }

  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function persistSession() {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(App.session)); } catch (e) { /* non-fatal */ }
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* non-fatal */ }
  }

  var _bannerShown = false;
  function showStorageBanner() {
    if (_bannerShown) return;
    _bannerShown = true;
    var b = document.createElement('div');
    b.className = 'storage-banner';
    b.setAttribute('role', 'alert');
    b.innerHTML = '<b>Storage unavailable.</b> ClearDesk will run but changes will not persist after this page closes.';
    document.body.insertBefore(b, document.body.firstChild);
  }

  /* ================= auth ================= */

  function currentUser() {
    if (!App.session) return null;
    return App.db.users.filter(function (u) { return u.id === App.session.userId; })[0] || null;
  }

  function isManager() {
    var u = currentUser();
    return !!u && u.role === 'manager';
  }

  function signIn(email, pass) {
    var u = App.db.users.filter(function (x) { return x.email.toLowerCase() === String(email || '').trim().toLowerCase(); })[0];
    if (!u) return { ok: false, error: 'No account exists with that email.' };
    if (!C.verifyPassword(pass, u.salt, u.passHash)) return { ok: false, error: 'Incorrect password — try again.' };
    App.session = { userId: u.id, ts: Date.now() };
    persistSession();
    return { ok: true };
  }

  function signUp(name, email, pass) {
    name = String(name || '').trim();
    email = String(email || '').trim().toLowerCase();
    if (!name) return { ok: false, error: 'Your name is required.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid email address.' };
    if (String(pass || '').length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    var exists = App.db.users.some(function (x) { return x.email.toLowerCase() === email; });
    if (exists) return { ok: false, error: 'An account with that email already exists — sign in instead.' };
    var salt = C.uid('s');
    var user = {
      id: C.uid('u'), name: name, email: email, role: 'clerk',
      salt: salt, passHash: C.hashPassword(pass, salt), createdAt: C.todayIso()
    };
    App.db.users.push(user);
    persist();
    App.session = { userId: user.id, ts: Date.now() };
    persistSession();
    return { ok: true };
  }

  function signOut() {
    clearSession();
    App.session = null;
    App.draft = null;
    location.hash = '#/login';
    render();
  }

  /* ================= shared helpers exposed to views ================= */

  function tariffIdx() { return C.tariffIndex(App.db.tariff); }
  function computeFor(entry) { return C.computeEntry(entry, tariffIdx(), App.db.org); }
  function clientById(id) { return App.db.clients.filter(function (c) { return c.id === id; })[0] || null; }
  function entryById(id) { return App.db.entries.filter(function (e) { return e.id === id; })[0] || null; }
  function todayIso() { return C.todayIso(); }

  function nav(hash) { location.hash = hash; }

  function rerender() { render(); }

  function deep(o) { return JSON.parse(JSON.stringify(o)); }

  function statusActionButtons(entry, compact) {
    var targets = (C.TRANSITIONS[entry.status] || []);
    var hints = {
      lodged: 'Requires: client, ≥1 cargo line, FX rate set, all required documents received.',
      assessed: 'Requires: a valid valuation (FOB > 0).',
      paid: 'Confirms the duty/tax assessment has been settled with customs.',
      cancelled: 'Requires a reason; the entry becomes read-only.'
    };
    return targets.map(function (t) {
      var lbl = t === 'cancelled' ? 'Cancel entry' : 'Mark ' + C.label(t);
      return '<button class="btn ghost small" data-status="' + t + '" title="' + U.esc(hints[t] || 'Move to ' + C.label(t)) + '">' + U.esc(lbl) + '</button>';
    }).join('');
  }

  window.CDA = {
    App: App, C: C, U: U, $: $, $$: $$,
    persist: persist, nav: nav, rerender: rerender, deep: deep,
    currentUser: currentUser, isManager: isManager, signOut: signOut,
    tariffIdx: tariffIdx, computeFor: computeFor, clientById: clientById, entryById: entryById,
    todayIso: todayIso, statusActionButtons: statusActionButtons,
    setRoute: function (r) { App.route = r; },
    markDraft: function (d) { App.draft = d; App.draftSnap = deep(d); },
    draftDirty: function () {
      return !!(App.draft && App.draftSnap && JSON.stringify(stripVolatile(App.draft)) !== JSON.stringify(stripVolatile(App.draftSnap)));
    },
    clearDraft: function () { App.draft = null; App.draftSnap = null; }
  };

  function stripVolatile(e) {
    var c = deep(e);
    delete c.timeline; delete c.updatedAt; delete c.createdAt; delete c.id;
    return c;
  }

  /* ================= router ================= */

  function parseRoute() {
    var h = location.hash.replace(/^#\/?/, '');
    var q = '';
    var qi = h.indexOf('?');
    if (qi !== -1) { q = h.slice(qi + 1); h = h.slice(0, qi); }
    var parts = h.split('/').filter(Boolean);
    if (parts.length === 0) return { name: 'dashboard' };
    if (parts[0] === 'login') return { name: 'login' };
    if (parts[0] === 'dashboard') return { name: 'dashboard' };
    if (parts[0] === 'entries') {
      if (parts.length === 1) return { name: 'entries' };
      if (parts[1] === 'new') return { name: 'entry', id: 'new', params: new URLSearchParams(q) };
      return { name: 'entry', id: parts[1] };
    }
    if (parts[0] === 'clients') {
      if (parts.length === 1) return { name: 'clients' };
      return { name: 'client', id: parts[1] };
    }
    if (parts[0] === 'tariff') return { name: 'tariff' };
    if (parts[0] === 'ledger') return { name: 'ledger' };
    if (parts[0] === 'reports') return { name: 'reports' };
    if (parts[0] === 'settings') return { name: 'settings' };
    return { name: 'dashboard' };
  }

  var TITLES = {
    dashboard: ['Dashboard', ''], entries: ['Entries', 'Clearance files'], entry: ['Entry', 'Clearance files'],
    clients: ['Clients', 'Directory'], client: ['Client', 'Directory'], tariff: ['Tariff schedule', 'Reference'],
    ledger: ['Disbursement ledger', 'Finance'], reports: ['Reports', 'Analytics'], settings: ['Settings', 'System']
  };

  function onRoute() {
    var r = parseRoute();
    App.route = r;
    render();
  }

  /* ================= dirty-draft guard on internal links ================= */

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (!a) return;
    var target = a.getAttribute('href');
    var onEntryPage = App.route.name === 'entry';
    if (onEntryPage && CDA.draftDirty() && target !== location.hash) {
      e.preventDefault();
      e.stopPropagation();
      U.confirmDialog({
        title: 'Discard unsaved changes?',
        message: 'This entry has edits that have not been saved. Leaving now will discard them.',
        confirmLabel: 'Discard changes', danger: true
      }).then(function (yes) {
        if (yes) { CDA.clearDraft(); location.hash = target; }
      });
    }
  }, true);

  /* ================= keyboard shortcuts ================= */

  function isTyping(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var ov = $('#search-overlay');
      if (ov) { closeSearch(); return; }
      return; // modals handle their own Escape
    }
    if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
      return;
    }
    if ($('.modal-backdrop')) return; // a dialog owns the keyboard
    if (e.key === '/') { e.preventDefault(); openSearch(); }
    else if (e.key === '?') { openShortcuts(); }
    else if (e.key.toLowerCase() === 'n' && App.route.name === 'entries') { e.preventDefault(); nav('#/entries/new'); }
    else if (e.key.toLowerCase() === 'k' && !e.ctrlKey && !e.metaKey) { openSearch(); }
  });

  function openShortcuts() {
    U.modal({
      title: 'Keyboard shortcuts',
      body:
        '<table class="tbl"><tbody>' +
        '<tr><td><kbd>/</kbd> or <kbd>K</kbd></td><td>Global search</td></tr>' +
        '<tr><td><kbd>Ctrl</kbd>+<kbd>K</kbd></td><td>Global search (anywhere)</td></tr>' +
        '<tr><td><kbd>N</kbd></td><td>New entry (on the Entries page)</td></tr>' +
        '<tr><td><kbd>Esc</kbd></td><td>Close dialogs / search</td></tr>' +
        '<tr><td><kbd>Tab</kbd></td><td>Move between fields; forms submit with <kbd>Enter</kbd></td></tr>' +
        '</tbody></table>',
      footer: '<button class="btn" data-autofocus>Close</button>',
      onMount: function (box, close) { box.querySelector('.modal-foot .btn').addEventListener('click', function () { close(true); }); }
    });
  }

  /* ================= global search ================= */

  function openSearch(prefill) {
    if ($('#search-overlay')) return;
    var ov = document.createElement('div');
    ov.className = 'search-overlay';
    ov.id = 'search-overlay';
    ov.innerHTML =
      '<div class="search-box" role="dialog" aria-modal="true" aria-label="Global search">' +
      '<div class="search-input-row"><span aria-hidden="true">⌕</span>' +
      '<input id="search-input" type="text" placeholder="Search entries, clients, HS codes…" aria-label="Search" value="' + U.esc(prefill || '') + '">' +
      '<kbd>Esc</kbd></div>' +
      '<div class="search-results" id="search-results" role="listbox"></div>' +
      '<div class="search-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>' +
      '</div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('open'); });
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) closeSearch(); });

    var input = $('#search-input', ov);
    var results = $('#search-results', ov);
    var items = [];
    var sel = -1;

    function runSearch() {
      var q = input.value.trim().toLowerCase();
      items = [];
      if (q.length >= 1) {
        App.db.entries.forEach(function (en) {
          var cl = clientById(en.clientId);
          var hay = C.entrySearchText(en, cl);
          if (hay.indexOf(q) !== -1) {
            items.push({ type: 'Entry', main: en.ref, sub: (cl ? cl.name : '') + ' · ' + C.label(en.status), hash: '#/entries/' + en.id });
          }
        });
        App.db.clients.forEach(function (cl) {
          if ((cl.name + ' ' + cl.code + ' ' + cl.taxId + ' ' + cl.country).toLowerCase().indexOf(q) !== -1) {
            items.push({ type: 'Client', main: cl.name, sub: cl.code + ' · ' + cl.taxId, hash: '#/clients/' + cl.id });
          }
        });
        App.db.tariff.forEach(function (t) {
          if ((t.code + ' ' + t.description).toLowerCase().indexOf(q) !== -1) {
            items.push({ type: 'HS', main: t.code, sub: t.description + ' — duty ' + t.dutyRate + '%', hash: '#/tariff' });
          }
        });
        items = items.slice(0, 14);
      }
      renderResults();
    }

    function renderResults() {
      if (!items.length) {
        results.innerHTML = '<div class="sr-empty">' + (input.value.trim() ? 'No matches — try an entry ref, client name or HS code.' : 'Type to search across entries, clients and the tariff schedule.') + '</div>';
        return;
      }
      results.innerHTML = items.map(function (it, i) {
        return '<div class="sr-item' + (i === sel ? ' sel' : '') + '" role="option" data-i="' + i + '">' +
          '<span class="sr-type">' + it.type + '</span>' +
          '<span class="grow"><div class="sr-main">' + U.esc(it.main) + '</div><div class="sr-sub">' + U.esc(it.sub) + '</div></span></div>';
      }).join('');
      $$('.sr-item', results).forEach(function (el) {
        el.addEventListener('click', function () { go(items[Number(el.dataset.i)]); });
      });
    }

    function go(item) {
      closeSearch();
      if (item) nav(item.hash);
    }

    input.addEventListener('input', function () { sel = -1; runSearch(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); renderResults(); scrollSel(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); renderResults(); scrollSel(); }
      else if (e.key === 'Enter') { e.preventDefault(); go(sel >= 0 ? items[sel] : items[0]); }
    });
    function scrollSel() {
      var el = $('.sr-item.sel', results);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
    runSearch();
    input.focus();
  }

  function closeSearch() {
    var ov = $('#search-overlay');
    if (ov) ov.remove();
  }

  /* ================= shell ================= */

  var ICONS = {
    dashboard: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1"/><rect x="9" y="1.5" width="5.5" height="5.5" rx="1"/><rect x="1.5" y="9" width="5.5" height="5.5" rx="1"/><rect x="9" y="9" width="5.5" height="5.5" rx="1"/></svg>',
    entries: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 2h7l3 3v9H3z"/><path d="M10 2v3h3M5.5 8h5M5.5 11h5"/></svg>',
    clients: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="5.5" cy="5" r="2.5"/><path d="M1.5 14c0-2.5 1.8-4 4-4s4 1.5 4 4"/><circle cx="11.5" cy="5.5" r="2"/><path d="M11 10.2c2 .1 3.5 1.5 3.5 3.8"/></svg>',
    tariff: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4.5h12M2 8h12M2 11.5h8"/><circle cx="4" cy="4.5" r="0.9" fill="currentColor" stroke="none"/><circle cx="7" cy="8" r="0.9" fill="currentColor" stroke="none"/><circle cx="5" cy="11.5" r="0.9" fill="currentColor" stroke="none"/></svg>',
    ledger: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="1.5" width="12" height="13" rx="1.5"/><path d="M5 5h6M5 8h6M5 11h3.5"/></svg>',
    reports: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 13.5V7M6 13.5V3.5M10 13.5V9M14 13.5V5.5"/></svg>',
    settings: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M12.4 3.6L11 5M5 11l-1.4 1.4"/></svg>'
  };

  function brandMark() {
    return '<svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true"><path d="M8 11h16M8 16h16M8 21h9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  }

  function sideLink(name, icon, label, hash, badge) {
    var active = (App.route.name === name || (name === 'entries' && App.route.name === 'entry')) ? ' active' : '';
    return '<button class="side-link' + active + '" data-nav="' + hash + '" aria-current="' + (active ? 'page' : 'false') + '">' +
      icon + '<span>' + U.esc(label) + '</span>' + (badge ? '<span class="side-badge">' + badge + '</span>' : '') + '</button>';
  }

  function renderShell(user) {
    var kpis = C.computeKpis(App.db.entries, App.db.payments, tariffIdx(), App.db.org, todayIso());
    var app = $('#app');
    app.innerHTML =
      '<div class="shell">' +
      '<aside class="sidebar">' +
      '  <div class="side-brand"><div class="brand-mark">' + brandMark() + '</div><div><div class="brand-name">ClearDesk</div><div class="brand-sub">Clearing ops</div></div></div>' +
      '  <nav class="side-scroll" aria-label="Primary">' +
      '    <div class="side-section"><div class="side-label">Operations</div>' +
             sideLink('dashboard', ICONS.dashboard, 'Dashboard', '#/dashboard') +
             sideLink('entries', ICONS.entries, 'Entries', '#/entries', String(kpis.activeCount)) +
             sideLink('ledger', ICONS.ledger, 'Ledger', '#/ledger') +
             sideLink('reports', ICONS.reports, 'Reports', '#/reports') +
      '    </div>' +
      '    <div class="side-section"><div class="side-label">Reference</div>' +
             sideLink('clients', ICONS.clients, 'Clients', '#/clients', String(App.db.clients.length)) +
             sideLink('tariff', ICONS.tariff, 'Tariff', '#/tariff', String(App.db.tariff.length)) +
      '    </div>' +
      '    <div class="side-section"><div class="side-label">System</div>' +
             sideLink('settings', ICONS.settings, 'Settings', '#/settings') +
      '    </div>' +
      '  </nav>' +
      '  <div class="side-user">' +
      '    <button class="side-link" id="user-btn" style="padding:4px 6px" aria-haspopup="true" aria-expanded="false">' +
      '      <span class="grow" style="min-width:0"><span class="who">' + U.esc(user.name) + '</span><br><span class="role">' + U.esc(C.ROLES[user.role] || user.role) + '</span></span>' +
      '      <span aria-hidden="true" style="color:#8b8b93">▲</span></button>' +
      '    <div class="user-menu" id="user-menu" role="menu">' +
      '      <button class="btn" data-nav="#/settings" role="menuitem">Settings</button>' +
      '      <button class="btn" data-act="shortcuts" role="menuitem">Keyboard shortcuts</button>' +
      '      <button class="btn" data-act="signout" role="menuitem">Sign out</button>' +
      '    </div>' +
      '  </div>' +
      '</aside>' +
      '<div class="main">' +
      '  <div class="topbar">' +
      '    <div class="crumb"><span>' + U.esc(TITLES[App.route.name] ? TITLES[App.route.name][1] : '') + '</span><span aria-hidden="true">›</span><b>' + U.esc(TITLES[App.route.name] ? TITLES[App.route.name][0] : '') + '</b></div>' +
      '    <button class="top-search" id="top-search" aria-label="Search"><span aria-hidden="true">⌕</span><span class="lbl">Search everything</span><kbd>/</kbd></button>' +
      '    <button class="btn" id="new-entry-btn">+ New entry</button>' +
      '  </div>' +
      '  <main class="view" id="view" tabindex="-1"></main>' +
      '</div>' +
      '</div>';

    $$('[data-nav]', app).forEach(function (el) {
      el.addEventListener('click', function () { nav(el.getAttribute('data-nav')); });
    });
    $('#top-search').addEventListener('click', function () { openSearch(); });
    $('#new-entry-btn').addEventListener('click', function () { nav('#/entries/new'); });
    var ub = $('#user-btn'), um = $('#user-menu');
    ub.addEventListener('click', function () {
      var open = um.classList.toggle('open');
      ub.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $('[data-act="signout"]', um).addEventListener('click', function () { um.classList.remove('open'); signOut(); });
    $('[data-act="shortcuts"]', um).addEventListener('click', function () { um.classList.remove('open'); openShortcuts(); });
    document.addEventListener('click', function onDoc(e) {
      if (!um.isConnected) { document.removeEventListener('click', onDoc); return; }
      if (!um.contains(e.target) && e.target !== ub && !ub.contains(e.target)) um.classList.remove('open');
    });
  }

  /* ================= view: login ================= */

  function viewLogin(el) {
    var mode = 'in';
    el.innerHTML =
      '<div class="login-wrap">' +
      '<div class="login-card">' +
      '  <div class="login-left">' +
      '    <div class="flex"><div class="brand-mark" style="background:#fff;color:var(--dark)">' + brandMark() + '</div><div><div class="brand-name" style="color:#fff">ClearDesk</div><div class="brand-sub">Clearing ops</div></div></div>' +
      '    <div class="login-pitch">' +
      '      <h2>Run every clearance file from arrival to release.</h2>' +
      '      <p>ClearDesk keeps declarations, tariff computations, document checklists and disbursement recoveries in one dense, keyboard-first workspace built for customs clearing agents.</p>' +
      '    </div>' +
      '    <div class="login-points">' +
      '      <div><span class="tick">—</span> Tariff-driven duty, excise &amp; VAT computation with FX</div>' +
      '      <div><span class="tick">—</span> Document checklists that gate lodging with customs</div>' +
      '      <div><span class="tick">—</span> Disbursement ledger, aging and client statements</div>' +
      '      <div><span class="tick">—</span> Printable computation sheets and CSV exports</div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="login-right">' +
      '    <div class="login-tabs" role="tablist">' +
      '      <button id="tab-in" role="tab" aria-selected="true">Sign in</button>' +
      '      <button id="tab-up" role="tab" aria-selected="false">Create account</button>' +
      '    </div>' +
      '    <div id="login-err" class="login-err" hidden></div>' +
      '    <form id="login-form" novalidate>' +
      '      <div class="field" data-only-up hidden><label>Your name</label><input class="input" name="name" autocomplete="name" placeholder="e.g. Amina Yusuf"></div>' +
      '      <div class="field"><label>Email</label><input class="input" name="email" type="email" autocomplete="email" placeholder="you@company.com" required></div>' +
      '      <div class="field"><label>Password</label><input class="input" name="password" type="password" autocomplete="current-password" placeholder="••••••••" required></div>' +
      '      <div class="field" data-only-up hidden><label>Confirm password</label><input class="input" name="confirm" type="password" autocomplete="new-password" placeholder="••••••••"></div>' +
      '      <button class="btn block" type="submit" id="login-submit">Sign in</button>' +
      '    </form>' +
      '    <div class="demo-box">' +
      '      <b>Demo data included.</b> Open a seeded workspace straight away:' +
      '      <div class="mt mono small">clara.otien@atlasfreight.app · demo1234 <span class="dim">(Manager)</span></div>' +
      '      <div class="mono small dim">james.mwangi@atlasfreight.app · demo1234 <span class="dim">(Clerk)</span></div>' +
      '      <button class="btn ghost small mt" id="demo-btn" type="button">Use demo account →</button>' +
      '    </div>' +
      '    <div class="login-foot">ClearDesk stores everything locally in your browser — no server, no install, no accounts in the cloud. Open <span class="mono">index.html</span> directly or host statically.</div>' +
      '  </div>' +
      '</div>' +
      '</div>';

    var err = $('#login-err', el);
    function fail(msg) { err.hidden = false; err.textContent = msg; }
    function switchMode(m) {
      mode = m;
      $('#tab-in', el).classList.toggle('on', m === 'in');
      $('#tab-up', el).classList.toggle('on', m === 'up');
      $('#tab-in', el).setAttribute('aria-selected', m === 'in' ? 'true' : 'false');
      $('#tab-up', el).setAttribute('aria-selected', m === 'up' ? 'true' : 'false');
      $$('[data-only-up]', el).forEach(function (d) { d.hidden = m !== 'up'; });
      $('#login-submit', el).textContent = m === 'in' ? 'Sign in' : 'Create account';
      err.hidden = true;
    }
    $('#tab-in', el).addEventListener('click', function () { switchMode('in'); });
    $('#tab-up', el).addEventListener('click', function () { switchMode('up'); });
    $('#demo-btn', el).addEventListener('click', function () {
      var r = signIn('clara.otien@atlasfreight.app', 'demo1234');
      if (r.ok) { U.toast('Welcome back, Clara.'); nav('#/dashboard'); render(); }
    });
    $('#login-form', el).addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      var email = f.email.value.trim(), pass = f.password.value;
      if (mode === 'in') {
        if (!email || !pass) { fail('Enter your email and password.'); return; }
        var r = signIn(email, pass);
        if (!r.ok) { fail(r.error); return; }
        U.toast('Signed in.');
      } else {
        if (f.confirm.value !== pass) { fail('Passwords do not match.'); return; }
        var r2 = signUp(f.name.value, email, pass);
        if (!r2.ok) { fail(r2.error); return; }
        U.toast('Account created — welcome to ClearDesk.');
      }
      nav('#/dashboard');
      render();
    });
    $('input[name="email"]', el).focus();
  }

  /* ================= view: dashboard ================= */

  function viewDashboard(el) {
    var kpis = C.computeKpis(App.db.entries, App.db.payments, tariffIdx(), App.db.org, todayIso());
    var cur = U.money(kpis.toCollect, App.db.org.currency);

    // needs attention
    var att = [];
    App.db.entries.filter(function (e) { return e.status === 'query'; }).forEach(function (e) {
      att.push({ sev: 'hi', text: 'Customs query on ' + e.ref + ' — respond before goods move to bond', hash: '#/entries/' + e.id });
    });
    App.db.clients.forEach(function (cl) {
      var ps = C.permitStatus(cl, todayIso());
      if (ps.state === 'expired') att.push({ sev: 'hi', text: cl.name + ' — permit expired ' + Math.abs(ps.days) + ' days ago (' + cl.permitType + ')', hash: '#/clients/' + cl.id });
      else if (ps.state === 'expiring') att.push({ sev: 'mid', text: cl.name + ' — permit expires in ' + ps.days + ' days', hash: '#/clients/' + cl.id });
    });
    App.db.entries.filter(function (e) { return e.status === 'awaiting_docs'; }).forEach(function (e) {
      att.push({ sev: 'mid', text: e.ref + ' is waiting for documents from ' + (clientById(e.clientId) || {}).name, hash: '#/entries/' + e.id });
    });
    var aging = C.agingFor(App.db.entries, App.db.payments, tariffIdx(), App.db.org, todayIso());
    if (aging['31-60'] > 0 || aging['61-90'] > 0 || aging['90+'] > 0) {
      att.push({ sev: 'mid', text: 'Disbursements overdue: ' + U.money(aging['31-60'] + aging['61-90'] + aging['90+'], App.db.org.currency) + ' beyond 30 days', hash: '#/ledger' });
    }
    att = att.slice(0, 9);

    // activity feed
    var acts = [];
    App.db.entries.forEach(function (e) {
      var cl = clientById(e.clientId);
      (e.timeline || []).forEach(function (t) {
        acts.push({ ts: t.ts, ref: e.ref, text: t.text, hash: '#/entries/' + e.id });
      });
    });
    acts.sort(function (a, b) { return a.ts < b.ts ? 1 : -1; });
    acts = acts.slice(0, 9);

    // pipeline bars
    var maxStatus = Math.max(1, Math.max.apply(null, C.STATUS_ORDER.map(function (s) { return kpis.byStatus[s] || 0; })));
    var pipe = C.STATUS_ORDER.map(function (s) {
      return U.barRow(C.label(s), kpis.byStatus[s] || 0, maxStatus, s === 'cancelled' ? 'l3' : '', String(kpis.byStatus[s] || 0));
    }).join('');

    el.innerHTML =
      '<div class="page-head"><div><div class="page-title">Dashboard</div>' +
      '<div class="page-sub">' + U.esc(App.db.org.name) + ' · ' + U.esc(App.db.org.port) + ' · ' + U.fmtDate(todayIso()) + '</div></div>' +
      '<div class="btn-row"><button class="btn ghost" id="dash-pay">Record payment</button><button class="btn" id="dash-new">+ New entry</button></div></div>' +

      '<div class="kpis">' +
      '  <button class="kpi link" id="k-active"><div class="kpi-num">' + kpis.activeCount + '</div><div class="kpi-label">Active entries</div><div class="kpi-sub">not closed or cancelled</div></button>' +
      '  <button class="kpi link" id="k-docs"><div class="kpi-num">' + kpis.awaitingDocs + '</div><div class="kpi-label">Awaiting docs</div><div class="kpi-sub">blocking lodgement</div></button>' +
      '  <button class="kpi link" id="k-lodged"><div class="kpi-num">' + kpis.lodgedCount + '</div><div class="kpi-label">In customs</div><div class="kpi-sub">lodged + under query</div></button>' +
      '  <button class="kpi link" id="k-collect"><div class="kpi-num">' + cur + '</div><div class="kpi-label">To collect</div><div class="kpi-sub">duties, taxes &amp; fees</div></button>' +
      '  <button class="kpi link" id="k-released"><div class="kpi-num">' + kpis.releasedThisMonth + '</div><div class="kpi-label">Released this month</div><div class="kpi-sub">files completed</div></button>' +
      '</div>' +

      '<div class="grid-r">' +
      '  <div class="card"><div class="card-head"><div class="card-title">Needs attention</div></div><div class="card-body flush" style="padding:4px 14px">' +
             (att.length ? att.map(function (a) {
               return '<div class="att-item" data-go="' + a.hash + '"><span class="att-sev' + (a.sev === 'mid' ? ' mid' : '') + '">!</span><span class="grow">' + U.esc(a.text) + '</span></div>';
             }).join('') : '<div class="empty" style="padding:22px"><h3>All clear</h3><p>No queries, expiring permits or missing documents right now.</p></div>') +
      '  </div></div>' +
      '  <div class="card"><div class="card-head"><div class="card-title">Pipeline by status</div><a class="tiny linklike" href="#/entries">View entries →</a></div><div class="card-body">' + pipe + '</div></div>' +
      '</div>' +
      '<div class="card mt"><div class="card-head"><div class="card-title">Recent activity</div></div><div class="card-body flush" style="padding:2px 16px">' +
             (acts.length ? acts.map(function (a) {
               return '<div class="act-item" data-go="' + a.hash + '"><span class="act-ref">' + U.esc(a.ref) + '</span><span class="act-text grow">' + U.esc(a.text) + '</span><span class="act-when">' + U.esc(U.timeAgo(a.ts)) + '</span></div>';
             }).join('') : '<div class="empty" style="padding:22px"><h3>Nothing yet</h3><p>Activity will appear here as entries move.</p></div>') +
      '  </div></div>';

    $$('[data-go]', el).forEach(function (a) { a.addEventListener('click', function () { nav(a.dataset.go); }); });
    $('#dash-new', el).addEventListener('click', function () { nav('#/entries/new'); });
    $('#dash-pay', el).addEventListener('click', function () { window.CDViews.openPaymentModal(null); });
    $('#k-active', el).addEventListener('click', function () { nav('#/entries'); });
    $('#k-docs', el).addEventListener('click', function () { App.filters.status = 'awaiting_docs'; nav('#/entries'); });
    $('#k-lodged', el).addEventListener('click', function () { App.filters.status = 'lodged'; nav('#/entries'); });
    $('#k-collect', el).addEventListener('click', function () { nav('#/ledger'); });
    $('#k-released', el).addEventListener('click', function () { App.filters.status = 'released'; nav('#/entries'); });
  }

  /* ================= view: settings ================= */

  function viewSettings(el) {
    var org = App.db.org;
    var manager = isManager();
    el.innerHTML =
      '<div class="page-head"><div><div class="page-title">Settings</div><div class="page-sub">Organisation profile, data tools and diagnostics.</div></div></div>' +
      '<div class="settings-grid">' +

      '<div class="card"><div class="card-head"><div class="card-title">Organisation</div></div><div class="card-body">' +
      '  <div class="form-row">' +
      '    <div class="field"><label>Company name</label><input class="input" id="set-name" value="' + U.esc(org.name) + '"></div>' +
      '    <div class="field"><label>Customs licence no.</label><input class="input" id="set-license" value="' + U.esc(org.licenseNo || '') + '"></div>' +
      '  </div>' +
      '  <div class="form-row">' +
      '    <div class="field"><label>Country</label><input class="input" id="set-country" value="' + U.esc(org.country) + '"></div>' +
      '    <div class="field"><label>Main port / border</label><input class="input" id="set-port" value="' + U.esc(org.port) + '"></div>' +
      '  </div>' +
      '  <div class="form-row">' +
      '    <div class="field"><label>Base currency</label><select class="input" id="set-currency">' + C.CURRENCIES.map(function (c) { return '<option' + (c === org.currency ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>' +
      '    <div class="field"><label>VAT rate %</label><input class="input" id="set-vat" type="number" min="0" max="100" step="0.5" value="' + org.vatRate + '"></div>' +
      '    <div class="field"><label>Default agency fee % of CIF</label><input class="input" id="set-fee" type="number" min="0" max="100" step="0.25" value="' + org.feePercent + '"></div>' +
      '  </div>' +
      '  <div class="field"><label>Address</label><input class="input" id="set-address" value="' + U.esc(org.address || '') + '"></div>' +
      '  <div class="btn-row"><button class="btn" id="set-save">Save organisation</button></div>' +
      '</div></div>' +

      '<div class="card"><div class="card-head"><div class="card-title">Team</div></div><div class="card-body flush"><div class="table-scroll"><table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>' +
      App.db.users.map(function (u) {
        return '<tr><td>' + U.esc(u.name) + (currentUser() && currentUser().id === u.id ? ' <span class="tiny dim">(you)</span>' : '') + '</td><td class="small">' + U.esc(u.email) + '</td><td>' + U.esc(C.ROLES[u.role] || u.role) + '</td></tr>';
      }).join('') +
      '</tbody></table></div><div class="card-body small muted">New sign-ups join with the Clerk role. Clerks cannot delete records, edit the tariff or reset data.</div></div></div>' +

      '<div class="card"><div class="card-head"><div class="card-title">Your account</div></div><div class="card-body">' +
      '  <div class="field"><label>Display name</label><input class="input" id="acc-name" value="' + U.esc(currentUser().name) + '"></div>' +
      '  <hr>' +
      '  <div class="form-row">' +
      '    <div class="field"><label>Current password</label><input class="input" id="acc-cur" type="password" autocomplete="current-password"></div>' +
      '    <div class="field"><label>New password (min 6)</label><input class="input" id="acc-new" type="password" autocomplete="new-password"></div>' +
      '    <div class="field"><label>Confirm new</label><input class="input" id="acc-conf" type="password" autocomplete="new-password"></div>' +
      '  </div>' +
      '  <div class="btn-row"><button class="btn" id="acc-save">Save changes</button><button class="btn ghost" id="acc-signout">Sign out</button></div>' +
      '</div></div>' +

      '<div class="card"><div class="card-head"><div class="card-title">Data</div></div><div class="card-body">' +
      '  <p class="small muted mb">Everything lives in this browser\'s localStorage. Export a JSON backup regularly — clearing site data wipes the workspace.</p>' +
      '  <div class="btn-row">' +
      '    <button class="btn ghost" id="data-export">Export backup (JSON)</button>' +
      '    <label class="btn ghost" style="cursor:pointer"><input type="file" id="data-import" accept="application/json" hidden>Import backup…</label>' +
      '    <button class="btn danger" id="data-reset" ' + (manager ? '' : 'disabled title="Manager role required"') + '>Reset to demo data</button>' +
      '  </div>' +
      '  <div class="mt small muted">Storage: ' + (App.storageOk ? 'available ✓' : 'UNAVAILABLE — running in-memory only') + ' · workspace size ' + U.numFmt(Math.round(JSON.stringify(App.db).length / 1024)) + ' KB</div>' +
      '</div></div>' +

      '<div class="card"><div class="card-head"><div class="card-title">Diagnostics — core logic tests</div><button class="btn ghost small" id="tests-run">Run tests</button></div>' +
      '  <div class="card-body" id="tests-out"><span class="small dim">Runs the domain-logic suite (computation, validation, transitions, ledger, CSV) against this build.</span></div>' +
      '</div>' +

      '<div class="card"><div class="card-head"><div class="card-title">About ClearDesk</div></div><div class="card-body small muted">' +
      '  <p class="mb"><b>ClearDesk</b> is a monochrome operations workspace for customs clearing agents. Version 1 · built ' + '2026-11-11' + '.</p>' +
      '  <p class="mb">Tariff rates are <b>indicative</b> — replace them with your authority\'s published schedule before production use. Duty = tariff rate × allocated CIF; VAT applies on CIF + duty + excise unless the line\'s HS heading is VAT-exempt.</p>' +
      '  <p>Press <kbd>?</kbd> anywhere to see keyboard shortcuts.</p>' +
      '</div></div>' +

      '</div>';

    $('#set-save', el).addEventListener('click', function () {
      var v = Number($('#set-vat', el).value), f = Number($('#set-fee', el).value);
      if (!(v >= 0 && v <= 100)) { U.toast('VAT rate must be 0–100.', 'err'); return; }
      if (!(f >= 0 && f <= 100)) { U.toast('Fee must be 0–100%.', 'err'); return; }
      org.name = $('#set-name', el).value.trim() || org.name;
      org.licenseNo = $('#set-license', el).value.trim();
      org.country = $('#set-country', el).value.trim();
      org.port = $('#set-port', el).value.trim();
      org.currency = $('#set-currency', el).value;
      org.vatRate = v;
      org.feePercent = f;
      org.address = $('#set-address', el).value.trim();
      persist();
      U.toast('Organisation saved.');
      rerender();
    });

    $('#acc-save', el).addEventListener('click', function () {
      var u = currentUser();
      var name = $('#acc-name', el).value.trim();
      var cur = $('#acc-cur', el).value, nw = $('#acc-new', el).value, conf = $('#acc-conf', el).value;
      if (cur || nw || conf) {
        if (!C.verifyPassword(cur, u.salt, u.passHash)) { U.toast('Current password is incorrect.', 'err'); return; }
        if (nw.length < 6) { U.toast('New password must be at least 6 characters.', 'err'); return; }
        if (nw !== conf) { U.toast('New passwords do not match.', 'err'); return; }
        u.salt = C.uid('s');
        u.passHash = C.hashPassword(nw, u.salt);
      }
      if (name) u.name = name;
      persist();
      U.toast('Account updated.');
      rerender();
    });
    $('#acc-signout', el).addEventListener('click', signOut);

    $('#data-export', el).addEventListener('click', function () {
      var ok = U.download('cleardesk-backup-' + todayIso() + '.json', JSON.stringify(App.db, null, 2), 'application/json');
      if (ok) U.toast('Backup exported.');
    });
    $('#data-import', el).addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var db = JSON.parse(String(reader.result));
          if (!db || !db.org || !Array.isArray(db.entries) || !Array.isArray(db.clients)) throw new Error('not a ClearDesk backup');
          U.confirmDialog({ title: 'Import backup?', message: 'This replaces the current workspace (' + App.db.entries.length + ' entries, ' + App.db.clients.length + ' clients) with the backup (' + db.entries.length + ' entries, ' + db.clients.length + ' clients).', confirmLabel: 'Import', danger: true })
            .then(function (yes) {
              if (!yes) return;
              App.db = db;
              persist();
              U.toast('Backup imported.');
              rerender();
            });
        } catch (err) { U.toast('Import failed: ' + err.message, 'err'); }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
    $('#data-reset', el).addEventListener('click', function () {
      if (!isManager()) { U.toast('Manager role required.', 'err'); return; }
      U.confirmDialog({ title: 'Reset to demo data?', message: 'All current entries, clients, payments and settings will be replaced with the seeded demo workspace.', confirmLabel: 'Reset workspace', danger: true })
        .then(function (yes) {
          if (!yes) return;
          App.db = Seed.buildSeed();
          persist();
          U.toast('Workspace reset to demo data.');
          rerender();
        });
    });

    $('#tests-run', el).addEventListener('click', function () {
      var out = $('#tests-out', el);
      out.innerHTML = '<span class="small dim">Running…</span>';
      setTimeout(function () {
        try {
          var res = window.CDTests.run();
          out.innerHTML =
            '<div class="spread mb"><b>' + res.passed + ' passed · ' + res.failed + ' failed</b><span class="tiny dim">suite: assets/core.test.js</span></div>' +
            res.results.map(function (r) {
              return '<div class="test-row"><span class="' + (r.ok ? 'test-ok">✓' : 'test-no">✕') + '</span><span class="grow">' + U.esc(r.name) +
                     (r.ok ? '' : '<div class="test-err">' + U.esc(r.error) + '</div>') + '</span></div>';
            }).join('');
        } catch (e) {
          out.innerHTML = '<div class="err-msg">Test runner crashed: ' + U.esc(e.message) + '</div>';
        }
      }, 30);
    });
  }

  /* ================= render ================= */

  function render() {
    var boot = $('#boot');
    if (boot) boot.remove();
    var user = currentUser();
    var view = $('#view');
    var r = App.route;

    if (!user) {
      if (r.name !== 'login') { location.hash = '#/login'; return; }
      document.title = 'Sign in — ClearDesk';
      renderLoginOnly();
      return;
    }
    if (r.name === 'login') { location.hash = '#/dashboard'; return; }

    renderShell(user);
    view = $('#view');
    document.title = (TITLES[r.name] ? TITLES[r.name][0] : 'ClearDesk') + ' — ClearDesk';
    try {
      switch (r.name) {
        case 'dashboard': viewDashboard(view); break;
        case 'entries': window.CDViews.viewEntries(view); break;
        case 'entry': window.CDViews.viewEntry(view, r); break;
        case 'clients': window.CDViews.viewClients(view); break;
        case 'client': window.CDViews.viewClient(view, r); break;
        case 'tariff': window.CDViews.viewTariff(view); break;
        case 'ledger': window.CDViews.viewLedger(view); break;
        case 'reports': window.CDViews.viewReports(view); break;
        case 'settings': viewSettings(view); break;
        default: viewDashboard(view);
      }
    } catch (err) {
      view.innerHTML = '<div class="notice"><b>Something went wrong rendering this page.</b><br>' + U.esc(err.message) + '</div>';
      if (window.console && console.error) console.error(err);
    }
  }

  function renderLoginOnly() {
    var app = $('#app');
    app.innerHTML = '<main class="view" id="view"></main>';
    viewLogin($('#view'));
  }

  /* ================= boot ================= */

  function boot() {
    if (!probeStorage()) { App.storageOk = false; showStorageBanner(); }
    App.db = loadDb();
    if (!App.db) { App.db = Seed.buildSeed(); persist(); }
    App.session = loadSession();
    window.addEventListener('hashchange', onRoute);
    onRoute();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
