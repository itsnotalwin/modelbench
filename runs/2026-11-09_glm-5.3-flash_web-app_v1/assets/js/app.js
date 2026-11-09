/* ============================================================
   Galley — app.js — boot, shell, router, keyboard, palette.
   ============================================================ */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.domain;
  const { h, icon } = G.ui;

  const ROUTES = [
    { id: 'board',    label: 'Desk',     icon: 'board' },
    { id: 'stories',  label: 'Ledger',   icon: 'rows' },
    { id: 'edition',  label: 'Edition',  icon: 'layout' },
    { id: 'people',   label: 'People',   icon: 'users' },
    { id: 'activity', label: 'Activity', icon: 'pulse' },
    { id: 'archive',  label: 'Archive',  icon: 'archive' },
  ];
  let route = 'board';
  let gChord = null;      // 'g' chord buffer
  let gTimer = null;

  const S = () => G.store.state;

  /* ---------------- shell ---------------- */
  function buildShell() {
    const topbar = document.getElementById('topbar');
    G.ui.clear(topbar);
    topbar.appendChild(h('a', { class: 'brand', href: '#/board', 'aria-label': 'Galley — go to the desk' },
      h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'G'),
      h('span', { class: 'brand-name' }, 'Galley')
    ));
    topbar.appendChild(folioLine());
    topbar.appendChild(h('span', { class: 'spacer' }));

    const undoBtn = h('button', {
      class: 'iconbtn', type: 'button', id: 'undo-btn', title: 'Undo (\u2318Z)', 'aria-label': 'Undo',
      onclick: () => G.views.doUndo(),
    }, icon('undo', 16));
    const redoBtn = h('button', {
      class: 'iconbtn', type: 'button', id: 'redo-btn', title: 'Redo (Shift+\u2318Z)', 'aria-label': 'Redo',
      onclick: () => {
        const label = G.store.redo();
        if (label) G.ui.toast('info', 'Redone: ' + label); else G.ui.toast('info', 'Nothing to redo.');
      },
    }, icon('redo', 16));
    topbar.appendChild(undoBtn);
    topbar.appendChild(redoBtn);

    topbar.appendChild(h('button', {
      class: 'btn btn-ghost btn-sm palette-btn', type: 'button', onclick: () => openPalette(),
      title: 'Command palette', 'aria-label': 'Open command palette',
    }, icon('command', 14), h('span', { class: 'palette-kbd' }, navigator.platform.indexOf('Mac') >= 0 ? '\u2318K' : 'Ctrl K')));

    topbar.appendChild(h('button', {
      class: 'iconbtn', type: 'button', title: 'Settings', 'aria-label': 'Settings',
      onclick: () => G.views.settingsModal(),
    }, icon('gear', 17)));

    const rail = document.getElementById('rail');
    G.ui.clear(rail);
    ROUTES.forEach((r) => {
      const a = h('a', {
        class: 'rail-item' + (route === r.id ? ' is-active' : ''), href: '#/' + r.id,
        'data-route': r.id, 'aria-current': route === r.id ? 'page' : null,
        title: r.label,
      },
        icon(r.icon, 18),
        h('span', { class: 'rail-label' }, r.label),
        h('span', { class: 'rail-badge', 'data-badge': r.id, hidden: '' })
      );
      rail.appendChild(a);
    });
    updateBadges();
  }

  function folioLine() {
    const state = S();
    const active = state.stories.filter((s) => D.ACTIVE_STATUSES.includes(s.status)).length;
    const ready = state.stories.filter((s) => s.status === 'ready').length;
    const overdue = state.stories.filter((s) => D.isOverdue(s)).length;
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return h('div', { class: 'folio' },
      h('span', { class: 'folio-paper' }, state.meta.paperName),
      h('span', { class: 'folio-sep', 'aria-hidden': 'true' }, '\u00b7'),
      h('span', { class: 'folio-date' }, today),
      h('span', { class: 'folio-sep', 'aria-hidden': 'true' }, '\u00b7'),
      h('span', { class: 'folio-counts' },
        h('strong', null, String(active)), ' on desk',
        overdue ? h('span', { class: 'folio-alert' }, ' \u00b7 ' + overdue + ' overdue') : null,
        ready ? h('span', null, ' \u00b7 ' + ready + ' ready') : null
      )
    );
  }

  function updateBadges() {
    const state = S();
    const set = (id, text, show) => {
      const el = document.querySelector('[data-badge="' + id + '"]');
      if (!el) return;
      if (show && text) { el.textContent = text; el.hidden = false; }
      else { el.hidden = true; }
    };
    set('board', state.stories.filter((s) => D.ACTIVE_STATUSES.includes(s.status)).length, true);
    const ed = D.activeEdition(state);
    const ready = state.stories.filter((s) => s.status === 'ready').length;
    set('edition', ed ? ed.slots.filter((x) => x.storyId).length + '/' + ed.slots.length : '', true);
    set('archive', state.stories.filter((s) => s.status === 'archived').length, true);
    set('people', '', false);
    set('activity', '', false);
    set('stories', state.stories.filter((s) => D.ACTIVE_STATUSES.includes(s.status)).length, true);
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = G.store.canUndo ? null : '';
    if (redoBtn) redoBtn.disabled = G.store.canRedo ? null : '';
    if (undoBtn) undoBtn.title = 'Undo' + (G.store.undoLabel ? ': ' + G.store.undoLabel : ' (\u2318Z)');
    if (redoBtn) redoBtn.title = 'Redo' + (G.store.redoLabel ? ': ' + G.store.redoLabel : ' (Shift+\u2318Z)');
    /* folio refresh */
    const folio = document.querySelector('.folio');
    if (folio) folio.replaceWith(folioLine());
    /* banners */
    updateBanners();
  }

  function updateBanners() {
    let holder = document.getElementById('banners');
    if (!holder) return;
    G.ui.clear(holder);
    const health = G.store.storageHealth();
    if (!health.ok) {
      holder.appendChild(h('div', { class: 'banner banner-error', role: 'alert' },
        icon('alert', 15),
        h('span', null, health.msg),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onclick: () => { try { G.store.exportJson(); } catch (e) { G.ui.toast('error', e.userMessage); } } }, icon('download', 13), 'Export now')
      ));
    }
    const remote = G.store.remoteChange;
    if (remote) {
      holder.appendChild(h('div', { class: 'banner banner-warn', role: 'alert' },
        icon('alert', 15),
        h('span', null, 'This desk changed in another tab \u2014 reload to pick up the newer version, or keep working here and reload later.'),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onclick: () => location.reload() }, 'Reload'),
        h('button', { class: 'btn btn-sm btn-ghost', type: 'button', onclick: () => { G.store.dismissRemote(); } }, 'Keep working')
      ));
    }
  }

  /* ---------------- router ---------------- */
  function navigate(r, skipHash) {
    if (!ROUTES.some((x) => x.id === r)) r = 'board';
    route = r;
    if (!skipHash) {
      const want = '#/' + r;
      if (location.hash !== want) { location.hash = want; return; } // hashchange re-enters
    }
    document.querySelectorAll('.rail-item').forEach((el) => {
      const on = el.dataset.route === r;
      el.classList.toggle('is-active', on);
      if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
    renderCurrentView(document.getElementById('view-root'));
    if (r === 'stories') focusLedgerSearch();
  }

  function renderCurrentView(main, forceFull) {
    if (!main) return;
    if (forceFull) main.dataset.route = '';
    G.views.renderRoute(main, route);
  }

  function focusLedgerSearch() {
    setTimeout(() => {
      const el = document.querySelector('.ledger-toolbar .search-input');
      if (el && document.activeElement === document.body) { /* don't steal focus if user is somewhere */ }
    }, 0);
  }

  window.addEventListener('hashchange', () => {
    const r = (location.hash || '').replace(/^#\//, '');
    if (ROUTES.some((x) => x.id === r) && r !== route) navigate(r, true);
  });

  /* ---------------- command palette ---------------- */
  let paletteEl = null;
  let paletteIndex = 0;
  let paletteItems = [];

  function paletteCommands() {
    const state = S();
    const cmds = [
      { t: 'Pitch a story', k: 'new create pitch story add', icon: 'plus', run: () => G.views.storyFormModal() },
      { t: 'Go to Desk', k: 'board kanban', icon: 'board', run: () => navigate('board'), kbd: 'G B' },
      { t: 'Go to Ledger', k: 'list table stories', icon: 'rows', run: () => navigate('stories'), kbd: 'G L' },
      { t: 'Go to Edition', k: 'slot print publish', icon: 'layout', run: () => navigate('edition'), kbd: 'G E' },
      { t: 'Go to People', k: 'writers staff', icon: 'users', run: () => navigate('people'), kbd: 'G P' },
      { t: 'Go to Activity', k: 'log history feed', icon: 'pulse', run: () => navigate('activity'), kbd: 'G A' },
      { t: 'Go to Archive', k: 'filed old', icon: 'archive', run: () => navigate('archive'), kbd: 'G R' },
      { t: 'Undo last change' + (G.store.undoLabel ? ' — ' + G.store.undoLabel : ''), k: 'undo revert', icon: 'undo', run: () => G.views.doUndo(), kbd: '\u2318Z', disabled: !G.store.canUndo },
      { t: 'Redo', k: 'redo', icon: 'redo', run: () => { const l = G.store.redo(); if (l) G.ui.toast('info', 'Redone: ' + l); }, kbd: '\u21e7\u2318Z', disabled: !G.store.canRedo },
      { t: 'Export desk as JSON', k: 'backup save download export', icon: 'download', run: () => { try { G.store.exportJson(); G.ui.toast('success', 'Backup exported.'); } catch (e) { G.ui.toast('error', e.userMessage); } } },
      { t: 'Export stories as CSV', k: 'spreadsheet csv export', icon: 'download', run: () => { try { G.store.exportCsv(); G.ui.toast('success', 'CSV exported.'); } catch (e) { G.ui.toast('error', e.userMessage); } } },
      { t: 'Import a backup\u2026', k: 'restore upload import json', icon: 'upload', run: () => { G.views.settingsModal(); } },
      { t: 'Settings', k: 'options preferences storage', icon: 'gear', run: () => G.views.settingsModal() },
      { t: 'Keyboard shortcuts', k: 'help keys hotkeys', icon: 'keyboard', run: () => shortcutsModal(), kbd: '?' },
      { t: 'Save current search as a view\u2026', k: 'view save filter', icon: 'rows', run: () => { navigate('stories'); } },
      { t: 'Clear all filters', k: 'reset filters clear', icon: 'filter', run: () => { const s = S(); s.ui.filters = D.defaultFilters(); s.ui.viewId = null; navigate('stories'); G.views.renderRoute(document.getElementById('view-root'), 'stories'); } },
    ];
    const ed = D.activeEdition(state);
    if (ed && ed.status === 'draft') {
      cmds.push({ t: 'Publish ' + ed.name + ' (' + ed.slots.filter((x) => x.storyId).length + ' stories slotted)', k: 'publish print edition', icon: 'press', run: () => { navigate('edition'); } });
    }
    return cmds;
  }

  function fuzzyScore(query, text) {
    const q = query.toLowerCase().replace(/\s+/g, '');
    const t = text.toLowerCase();
    if (!q) return 1;
    let ti = 0, score = 0, streak = 0;
    for (const ch of q) {
      const idx = t.indexOf(ch, ti);
      if (idx < 0) return -1;
      streak = idx === ti ? streak + 1 : 0;
      score += 10 - Math.min(9, idx - ti) + streak * 2;
      ti = idx + 1;
    }
    if (t.startsWith(q)) score += 30;
    return score;
  }

  function openPalette() {
    if (paletteEl) return;
    const input = h('input', {
      class: 'palette-input', type: 'text', placeholder: 'Type a command, or search stories\u2026',
      'aria-label': 'Command palette', autocomplete: 'off', spellcheck: 'false',
    });
    const listEl = h('div', { class: 'palette-list', role: 'listbox', 'aria-label': 'Results' });
    paletteEl = h('div', { class: 'palette-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Command palette' },
      h('div', { class: 'palette' }, input, listEl,
        h('div', { class: 'palette-foot' }, h('span', null, '\u2191\u2193 navigate \u00b7 \u21b5 run \u00b7 esc close'))
      ));
    document.body.appendChild(paletteEl);
    requestAnimationFrame(() => { paletteEl.classList.add('is-open'); input.focus(); });

    function compute() {
      const q = input.value.trim();
      const items = [];
      paletteCommands().forEach((c) => {
        const score = q ? fuzzyScore(q, c.t + ' ' + c.k) : 1;
        if (score > 0) items.push({ kind: 'cmd', score, c });
      });
      if (q.length >= 2) {
        S().stories.forEach((st) => {
          const hay = st.headline + ' ' + st.slug + ' ' + st.section;
          const score = fuzzyScore(q, hay);
          if (score > 0) items.push({ kind: 'story', score: score - 5, st });
        });
      }
      items.sort((a, b) => b.score - a.score);
      paletteItems = items.slice(0, 12);
      paletteIndex = 0;
      renderList();
    }
    function renderList() {
      G.ui.clear(listEl);
      if (!paletteItems.length) {
        listEl.appendChild(h('div', { class: 'palette-empty' }, 'Nothing matches \u201C' + input.value + '\u201D \u2014 try a story slug, \u201Cpublish\u201D, \u201Cexport\u201D\u2026'));
        return;
      }
      paletteItems.forEach((it, i) => {
        const row = it.kind === 'cmd'
          ? h('button', { class: 'palette-item' + (i === paletteIndex ? ' is-active' : ''), type: 'button', role: 'option', 'aria-selected': i === paletteIndex ? 'true' : 'false' },
              icon(it.c.icon || 'bolt', 15),
              h('span', { class: 'palette-item-text' }, it.c.t),
              it.c.kbd ? h('kbd', { class: 'kbd' }, it.c.kbd) : null)
          : h('button', { class: 'palette-item palette-item-story' + (i === paletteIndex ? ' is-active' : ''), type: 'button', role: 'option', 'aria-selected': i === paletteIndex ? 'true' : 'false' },
              icon('paper', 15),
              h('span', { class: 'palette-item-text' }, h('strong', null, it.st.headline), h('small', { class: 'mono' }, ' ' + it.st.slug + ' \u00b7 ' + D.STATUS_MAP[it.st.status].label)),
              h('span', { class: 'palette-item-hint' }, 'open'));
        row.addEventListener('click', () => run(i));
        row.addEventListener('mousemove', () => { if (paletteIndex !== i) { paletteIndex = i; renderList(); } });
        listEl.appendChild(row);
      });
    }
    function run(i) {
      const it = paletteItems[i];
      closePalette();
      if (!it) return;
      if (it.kind === 'cmd') { try { it.c.run(); } catch (e) { G.ui.toast('error', e.userMessage || e.message); } }
      else G.views.openStory(it.st.id);
    }
    input.addEventListener('input', compute);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); paletteIndex = Math.min(paletteItems.length - 1, paletteIndex + 1); renderList(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); paletteIndex = Math.max(0, paletteIndex - 1); renderList(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(paletteIndex); }
      else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    });
    paletteEl.addEventListener('mousedown', (e) => { if (e.target === paletteEl) closePalette(); });
    compute();
  }
  function closePalette() {
    if (!paletteEl) return;
    const el = paletteEl;
    paletteEl = null;
    el.classList.remove('is-open');
    setTimeout(() => el.remove(), 150);
  }

  /* ---------------- shortcuts modal ---------------- */
  function shortcutsModal() {
    const rows = [
      ['\u2318K / Ctrl K', 'Command palette'],
      ['/', 'Search the ledger'],
      ['N', 'Pitch a story'],
      ['J / K or \u2193/\u2191', 'Move through rows and cards'],
      ['Enter', 'Open the focused story'],
      ['X', 'Select / deselect focused row'],
      ['M', 'Move menu on a focused card'],
      ['A', 'Select all rows on the page'],
      ['Esc', 'Close palette, menu, dialog, panel'],
      ['G then B/L/E/P/A/R', 'Go to Desk, Ledger, Edition, People, Activity, Archive'],
      ['\u2318Z / \u21e7\u2318Z', 'Undo / redo'],
      ['?', 'This list'],
    ];
    G.ui.openModal({
      title: 'Keyboard shortcuts',
      body: (body) => {
        body.appendChild(h('table', { class: 'kbd-table' },
          h('tbody', null, rows.map((r) => h('tr', null, h('td', null, h('kbd', { class: 'kbd' }, r[0])), h('td', null, r[1]))))));
        body.appendChild(h('p', { class: 'modal-note' }, 'Every flow works by keyboard \u2014 menus open with Enter, arrows move, Esc backs out.'));
      },
      actions: [{ label: 'Close' }],
    });
  }

  /* ---------------- global keyboard ---------------- */
  document.addEventListener('keydown', (e) => {
    const typing = D.isTyping(e);
    const meta = e.metaKey || e.ctrlKey;

    if (e.key === 'Escape') {
      if (paletteEl) { closePalette(); return; }
      if (document.querySelector('.popover')) { G.ui.closePopovers(); return; }
      if (G.ui.topModal()) { G.ui.closeTopModal(); return; }
      if (typing) { e.target.blur(); return; }
      if (G.views.drawerOpen()) { G.views.closeDrawer(); return; }
      if (G.views.selection.size) { G.views.selection.clear(); renderCurrentView(document.getElementById('view-root')); }
      return;
    }

    if (paletteEl) return; // palette handles its own keys

    if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
    if (meta && e.key.toLowerCase() === 'z') {
      if (typing) return; // inputs keep native undo
      e.preventDefault();
      if (e.shiftKey) { const l = G.store.redo(); if (l) G.ui.toast('info', 'Redone: ' + l); }
      else G.views.doUndo();
      return;
    }
    if (meta && e.key.toLowerCase() === 's') {
      e.preventDefault();
      G.ui.toast('info', 'Galley saves itself \u2014 every change is already in local storage.');
      return;
    }
    if (typing || meta || e.altKey) return;

    /* g-chords */
    if (gChord === 'g') {
      const map = { b: 'board', l: 'stories', e: 'edition', p: 'people', a: 'activity', r: 'archive' };
      const dest = map[e.key.toLowerCase()];
      gChord = null;
      clearTimeout(gTimer);
      if (dest) { e.preventDefault(); navigate(dest); return; }
    }
    if (e.key.toLowerCase() === 'g') { gChord = 'g'; clearTimeout(gTimer); gTimer = setTimeout(() => { gChord = null; }, 900); return; }

    switch (e.key) {
      case '/': {
        e.preventDefault();
        if (route !== 'stories') navigate('stories');
        setTimeout(() => { const el = document.querySelector('.ledger-toolbar .search-input'); if (el) el.focus(); }, 30);
        return;
      }
      case 'n': e.preventDefault(); G.views.storyFormModal(); return;
      case '?': e.preventDefault(); shortcutsModal(); return;
      case 'a': {
        if (route !== 'stories') return;
        e.preventDefault();
        const rows = document.querySelectorAll('.ledger-row');
        rows.forEach((r) => { const id = r.dataset.storyId; if (id) G.views.selection.add(id); });
        renderCurrentView(document.getElementById('view-root'));
        return;
      }
      default: return;
    }
  }, true);

  /* click-away for popovers */
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.popover')) G.ui.closePopovers();
  }, true);

  /* flush saves when the tab hides or closes */
  window.addEventListener('beforeunload', () => G.store.flushSave());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') G.store.flushSave(); });

  /* ---------------- boot ---------------- */
  function boot() {
    const params = new URLSearchParams(location.search);
    if (params.get('reset') === '1') {
      try { localStorage.removeItem('galley.desk.v1'); } catch (e) { /* ignore */ }
    }
    G.store.init();
    G.store.subscribe(() => {
      updateBadges();
      renderCurrentView(document.getElementById('view-root'));
      G.views.renderDrawer();
      /* the welcome overlay only lives until the desk is claimed */
      const wr = document.getElementById('welcome-root');
      if (S().meta.onboarded && wr && wr.childNodes.length) G.ui.clear(wr);
    });

    const hashRoute = (location.hash || '').replace(/^#\//, '');
    route = ROUTES.some((r) => r.id === hashRoute) ? hashRoute : (S().ui.route || 'board');

    buildShell();
    renderCurrentView(document.getElementById('view-root'));
    if (!S().meta.onboarded) G.views.welcomeOverlay();

    /* hide boot splash */
    const splash = document.getElementById('boot');
    if (splash) {
      splash.classList.add('boot-done');
      setTimeout(() => splash.remove(), 500);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  G.app = { navigate, renderCurrentView, openPalette, shortcutsModal };
})();
