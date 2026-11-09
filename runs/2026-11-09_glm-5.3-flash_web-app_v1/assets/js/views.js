/* ============================================================
   Galley — views.js — every screen. Views read store state
   directly and rebuild on notify; inputs commit on change.
   ============================================================ */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.domain;
  const { h, icon } = G.ui;

  const S = () => G.store.state;
  let draggedStory = null;

  function ctx() {
    const state = S();
    const map = new Map(state.writers.map((w) => [w.id, w]));
    return {
      state,
      writerById: (id) => (map.has(id) ? map.get(id).name : ''),
    };
  }

  /* ================= shared: story card (board + pool) ================= */
  function storyCard(story, opts) {
    opts = opts || {};
    const state = S();
    const w = state.writers.find((x) => x.id === story.writerId);
    const card = h('article', {
      class: 'card storycard' + (story.priority === 'lead' ? ' storycard-lead' : ''),
      tabindex: '0',
      'data-story-id': story.id,
      draggable: opts.draggable === false ? null : 'true',
      'aria-label': story.headline + ' (' + D.STATUS_MAP[story.status].label + ')',
    },
      h('div', { class: 'card-rule', style: { background: w ? w.color : '#c9c2b2' }, 'aria-hidden': 'true' }),
      h('div', { class: 'card-slugline' },
        h('span', { class: 'mono card-slug' }, story.slug),
        story.priority === 'lead' ? h('span', { class: 'leadflag', title: 'Lead story' }, icon('bolt', 12)) : null,
        story.priority === 'high' ? h('span', { class: 'highflag', title: 'High priority' }, '\u25B2') : null,
      ),
      h('h4', { class: 'card-headline' }, story.headline),
      h('div', { class: 'card-meta' },
        G.ui.writerChip(state, story, true),
        G.ui.duePill(story),
        G.ui.wordBar(story)
      )
    );
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      openStory(story.id);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); openStory(story.id); }
      if (e.key === 'm') { e.preventDefault(); moveMenu(story, card); }
    });
    if (opts.draggable !== false) {
      card.addEventListener('dragstart', (e) => {
        draggedStory = story;
        try { e.dataTransfer.setData('text/plain', story.id); e.dataTransfer.effectAllowed = 'move'; } catch (err) { /* older engines */ }
        card.classList.add('is-dragging');
        document.body.classList.add('is-dragging-any');
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        document.body.classList.remove('is-dragging-any');
        draggedStory = null;
        document.querySelectorAll('.drop-ok,.drop-bad').forEach((x) => x.classList.remove('drop-ok', 'drop-bad'));
      });
    }
    return card;
  }

  /* ---------- move menu (transitions with reasons) ---------- */
  function moveMenu(story, anchor) {
    const moves = D.movesFor(story);
    const items = moves.map((m) => {
      const target = D.STATUS_MAP[m.to];
      return {
        label: m.to === 'archived' ? 'Archive' : 'Move to ' + target.label,
        icon: target.icon,
        disabled: !!m.reason,
        reason: m.reason || '',
        onClick: () => {
          try {
            G.store.setStatus(story.id, m.to);
            G.ui.toast('success', '\u201C' + story.headline + '\u201D moved to ' + target.label.toLowerCase() + '.');
          } catch (e) { G.ui.toast('error', e.userMessage || e.message); }
        },
      };
    });
    items.push({ separator: true });
    items.push({
      label: 'Duplicate', icon: 'copy',
      onClick: () => {
        try {
          const copy = G.store.duplicateStory(story.id);
          G.ui.toast('success', 'Duplicated as \u201C' + copy.slug + '\u201D (a fresh pitch).', { label: 'Open', run: () => openStory(copy.id) });
        } catch (e) { G.ui.toast('error', e.userMessage || e.message); }
      },
    });
    if (!['published', 'archived'].includes(story.status)) {
      items.push({
        label: 'Kill\u2026', icon: 'cross', danger: true,
        onClick: () => killFlow([story.id]),
      });
    }
    G.ui.popover(anchor, items, { align: 'left' });
  }

  /* ---------- kill flow (confirm + reason) ---------- */
  function killFlow(ids) {
    const state = S();
    const stories = ids.map((id) => state.stories.find((x) => x.id === id)).filter(Boolean);
    if (!stories.length) return;
    const one = stories.length === 1;
    let reasonInput;
    G.ui.openModal({
      title: one ? 'Kill \u201C' + stories[0].headline + '\u201D?' : 'Kill ' + stories.length + ' stories?',
      body: (body) => {
        body.appendChild(h('p', { class: 'modal-msg' },
          one ? 'The story leaves the pipeline and returns to nothing \u2014 you can revive it later from its card, or archive it.'
              : 'These stories leave the pipeline. Each can be revived later from its card, or archived.'));
        if (!one) body.appendChild(h('ul', { class: 'modal-list' }, stories.slice(0, 6).map((s) => h('li', null, s.headline))));
        reasonInput = h('textarea', { class: 'input textarea', rows: '2', maxlength: '160', placeholder: 'Why? (optional, kept in the story\u2019s history) \u2014 e.g. \u201Csuperseded by the council follow-up\u201D' });
        body.appendChild(reasonInput);
      },
      actions: [
        { label: 'Keep it', onClick: () => {} },
        {
          label: one ? 'Kill story' : 'Kill ' + stories.length + ' stories', kind: 'danger', autofocus: true,
          onClick: () => {
            const reason = (reasonInput.value || '').trim();
            stories.forEach((st) => {
              try { G.store.killStory(st.id, reason); }
              catch (e) { G.ui.toast('error', '\u201C' + st.headline + '\u201D: ' + (e.userMessage || e.message)); }
            });
            G.ui.toast('success', one ? 'Killed \u201C' + stories[0].headline + '\u201D.' : 'Killed ' + stories.length + ' stories.',
              G.store.canUndo ? { label: 'Undo', run: () => doUndo() } : null);
          },
        },
      ],
    });
  }

  function doUndo() {
    const label = G.store.undo();
    if (label) G.ui.toast('info', 'Undone: ' + label);
    else G.ui.toast('info', 'Nothing left to undo.');
  }

  /* ================= BOARD ================= */
  let boardEl = null;

  function renderBoard(container) {
    const state = S();
    G.ui.clear(container);
    boardEl = h('div', { class: 'board', role: 'list', 'aria-label': 'Story board by status' });
    const counts = {};
    D.BOARD_STATUSES.forEach((st) => { counts[st] = 0; });
    state.stories.forEach((s) => { if (counts[s.status] !== undefined) counts[s.status]++; });

    D.BOARD_STATUSES.forEach((statusId) => {
      const meta = D.STATUS_MAP[statusId];
      const col = h('section', { class: 'board-col', 'data-status': statusId, 'aria-label': meta.label + ' column' });
      const head = h('div', { class: 'board-col-head' },
        h('span', { class: 'board-col-title' }, icon(meta.icon, 13), meta.label),
        h('span', { class: 'board-col-count' }, counts[statusId]),
        statusId === 'edit' && counts.edit > 4 ? h('span', { class: 'board-col-warn', title: 'The edit desk is crowded \u2014 ' + counts.edit + ' stories waiting' }, 'crowded') : null,
        statusId === 'pitch' ? h('button', { class: 'iconbtn iconbtn-sm', type: 'button', 'aria-label': 'New story', title: 'New story (N)', onclick: () => storyFormModal() }, icon('plus', 14)) : null
      );
      head.title = meta.hint;
      const body = h('div', { class: 'board-col-body', role: 'list' });
      const list = state.stories.filter((s) => s.status === statusId);
      D.sortStories(list, { key: 'due', dir: 'asc' }, ctx()).forEach((s) => body.appendChild(storyCard(s)));
      if (!list.length) {
        const hints = {
          pitch: 'The idea pile is empty \u2014 press N to pitch something.',
          assigned: 'Nothing waiting on writers.',
          draft: 'Nothing in draft \u2014 stories arrive here when writers start.',
          edit: 'The edit desk is clear.',
          ready: 'Nothing approved \u2014 the Edition desk will go hungry.',
          slotted: 'Nothing slotted yet \u2014 fill No. ' + (D.activeEdition(state) || { number: '\u2013' }).number + ' from the ready pile.',
        };
        body.appendChild(h('div', { class: 'board-col-empty' }, hints[statusId]));
      }
      col.appendChild(head);
      col.appendChild(body);
      wireColumnDnD(col, body, statusId);
      boardEl.appendChild(col);
    });

    container.appendChild(boardEl);
  }

  function wireColumnDnD(col, body, statusId) {
    col.addEventListener('dragover', (e) => {
      if (!draggedStory) return;
      e.preventDefault();
      const reason = D.transitionReason(draggedStory, statusId);
      col.classList.toggle('drop-ok', !reason);
      col.classList.toggle('drop-bad', !!reason && reason !== 'Already ' + D.STATUS_MAP[draggedStory.status].label.toLowerCase() + '.');
    });
    col.addEventListener('dragleave', (e) => {
      if (!col.contains(e.relatedTarget)) col.classList.remove('drop-ok', 'drop-bad');
    });
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drop-ok', 'drop-bad');
      if (!draggedStory) return;
      const story = draggedStory;
      draggedStory = null;
      if (story.status === statusId) return;
      const reason = D.transitionReason(story, statusId);
      if (reason) { G.ui.toast('error', 'Can\u2019t move \u201C' + story.headline + '\u201D: ' + reason); return; }
      try {
        G.store.setStatus(story.id, statusId);
        G.ui.toast('success', '\u201C' + story.headline + '\u201D moved to ' + D.STATUS_MAP[statusId].label.toLowerCase() + '.');
      } catch (err) { G.ui.toast('error', err.userMessage || err.message); }
    });
  }

  /* ================= LEDGER ================= */
  let ledgerPage = 1;
  let selection = new Set();
  let rangeAnchor = null;

  function ledgerFiltered() {
    const c = ctx();
    const f = c.state.ui.filters;
    const list = c.state.stories.filter((s) => s.status !== 'archived' && D.storyMatches(s, f, c));
    return D.sortStories(list, c.state.ui.sort, c);
  }

  function renderLedger(container, partial) {
    const state = S();
    G.ui.withFocusPreserve(container, () => {
      G.ui.clear(container);
      container.appendChild(buildLedgerToolbar());
      const body = h('div', { class: 'ledger-body' });
      container.appendChild(body);

      const f = state.ui.filters;
      const list = ledgerFiltered();
      const pageSize = state.ui.pageSize || 60;
      const pages = Math.max(1, Math.ceil(list.length / pageSize));
      if (ledgerPage > pages) ledgerPage = pages;
      const pageList = list.slice((ledgerPage - 1) * pageSize, ledgerPage * pageSize);
      selection = new Set([...selection].filter((id) => list.some((s) => s.id === id)));

      if (!state.stories.filter((s) => s.status !== 'archived').length) {
        body.appendChild(G.ui.emptyState({
          icon: 'paper',
          title: 'The desk is empty',
          body: 'No stories yet. Pitch the first one \u2014 it lands on the board as an idea, then works its way to print.',
          actions: [{ label: 'Pitch a story', kind: 'primary', onClick: () => storyFormModal() }],
        }));
        return;
      }
      if (!list.length) {
        body.appendChild(G.ui.emptyState({
          icon: 'search',
          title: 'Nothing matches this view',
          body: f.q ? 'No stories match \u201C' + f.q + '\u201D with the current filters.' : 'The filters are too narrow for the stories on the desk.',
          actions: [
            { label: 'Clear search & filters', kind: 'primary', onClick: () => clearFilters() },
            { label: 'Save this view anyway', onClick: () => saveViewFlow() },
          ],
        }));
        return;
      }

      body.appendChild(buildLedgerTable(pageList));
      if (pages > 1) body.appendChild(buildPager(pages, list.length));
      if (selection.size) body.appendChild(buildBulkBar(list));
    });
  }

  function buildLedgerToolbar() {
    const state = S();
    const f = state.ui.filters;
    const bar = h('div', { class: 'ledger-toolbar' });

    /* search */
    const searchWrap = h('div', { class: 'searchbox' });
    const search = h('input', {
      class: 'input search-input', type: 'search', placeholder: 'Search headline, slug, notes, writer\u2026',
      value: f.q, 'aria-label': 'Search stories', 'data-focuskey': 'ledger-search',
    });
    search.addEventListener('input', () => {
      f.q = search.value;
      G.store.state.ui.viewId = null;
      ledgerPage = 1;
      scheduleLedgerBodyRefresh();
      updateViewChip();
    });
    searchWrap.appendChild(icon('search', 15));
    searchWrap.appendChild(search);
    bar.appendChild(searchWrap);

    /* saved views */
    const viewBtn = h('button', { class: 'btn btn-ghost view-btn', type: 'button' },
      icon('rows', 14),
      h('span', { class: 'view-btn-label' }, viewLabel()),
      icon('chevronDown', 13)
    );
    viewBtn.addEventListener('click', () => viewsMenu(viewBtn));
    bar.appendChild(viewBtn);

    /* status */
    bar.appendChild(G.ui.selectEl({ class: 'input select-sm', 'aria-label': 'Filter by status', onchange: (e) => { f.status = e.target.value; ledgerPage = 1; state.ui.viewId = null; refreshView(); } },
      [{ value: '', label: 'All statuses' }, { value: 'active', label: 'On the desk (active)' }].concat(D.STATUSES.filter((s) => s.id !== 'archived').map((s) => ({ value: s.id, label: s.label }))),
      f.status));

    /* writer */
    bar.appendChild(G.ui.selectEl({ class: 'input select-sm', 'aria-label': 'Filter by writer', onchange: (e) => { f.writer = e.target.value; ledgerPage = 1; state.ui.viewId = null; refreshView(); } },
      [{ value: '', label: 'All writers' }, { value: '__none', label: '\u2014 unassigned' }].concat(
        state.writers.slice().sort((a, b) => a.name.localeCompare(b.name)).map((w) => ({ value: w.id, label: w.name + (w.active ? '' : ' (off desk)') }))),
      f.writer));

    /* tag */
    const tags = new Set();
    state.stories.forEach((s) => s.tags.forEach((t) => tags.add(t)));
    bar.appendChild(G.ui.selectEl({ class: 'input select-sm', 'aria-label': 'Filter by tag', onchange: (e) => { f.tag = e.target.value; ledgerPage = 1; state.ui.viewId = null; refreshView(); } },
      [{ value: '', label: 'All tags' }].concat([...tags].sort().map((t) => ({ value: t, label: '#' + t }))), f.tag));

    /* overdue toggle */
    const over = h('button', {
      class: 'btn btn-toggle' + (f.overdue ? ' is-on' : ''), type: 'button',
      'aria-pressed': f.overdue ? 'true' : 'false',
      onclick: () => { f.overdue = !f.overdue; ledgerPage = 1; state.ui.viewId = null; refreshView(); },
    }, icon('alert', 13), 'Overdue only');
    bar.appendChild(over);

    /* section chips */
    const chips = h('div', { class: 'sectionchips', role: 'group', 'aria-label': 'Filter by section' });
    D.SECTIONS.forEach((sec) => {
      const on = f.sections.includes(sec);
      chips.appendChild(h('button', {
        class: 'sectionchip' + (on ? ' is-on' : ''), type: 'button', 'aria-pressed': on ? 'true' : 'false',
        onclick: () => {
          const i = f.sections.indexOf(sec);
          if (i >= 0) f.sections.splice(i, 1); else f.sections.push(sec);
          ledgerPage = 1; state.ui.viewId = null;
          refreshView();
        },
      }, sec));
    });
    bar.appendChild(chips);

    bar.appendChild(h('button', {
      class: 'iconbtn', type: 'button', title: 'Save this search as a view', 'aria-label': 'Save this search as a view',
      onclick: () => saveViewFlow(),
    }, icon('plus', 14)));
    return bar;
  }

  function viewLabel() {
    const state = S();
    if (state.ui.viewId) {
      const v = state.views.find((x) => x.id === state.ui.viewId);
      if (v) return 'View: ' + v.name;
    }
    return 'All stories';
  }
  function updateViewChip() {
    const el = document.querySelector('.view-btn-label');
    if (el) el.textContent = viewLabel();
  }

  function viewsMenu(anchor) {
    const state = S();
    const items = [];
    state.views.forEach((v) => {
      items.push({
        label: v.name + (v.builtin ? '' : ''),
        icon: v.builtin ? 'pin' : 'rows',
        hint: viewSummary(v),
        onClick: () => {
          const s = S();
          s.ui.filters = JSON.parse(JSON.stringify(v.filters));
          s.ui.sort = JSON.parse(JSON.stringify(v.sort));
          s.ui.viewId = v.id;
          ledgerPage = 1;
          G.store.scheduleSaveRemote();
          refreshView(true);
        },
      });
    });
    items.push({ separator: true });
    items.push({ label: 'Save current as view\u2026', icon: 'plus', onClick: () => saveViewFlow() });
    const cur = state.views.find((v) => v.id === state.ui.viewId);
    if (cur && !cur.builtin) {
      items.push({ label: 'Delete \u201C' + cur.name + '\u201D', icon: 'trash', danger: true, onClick: () => {
        G.ui.confirmModal({
          title: 'Delete view \u201C' + cur.name + '\u201D?',
          message: 'The stories stay; only the saved search goes away.',
          confirmLabel: 'Delete view', danger: true,
        }).then((ok) => { if (ok) { try { G.store.deleteView(cur.id); } catch (e) { G.ui.toast('error', e.userMessage); } } });
      } });
    }
    G.ui.popover(anchor, items, { align: 'left' });
  }

  function viewSummary(v) {
    const bits = [];
    if (v.filters.status === 'active') bits.push('on the desk');
    else if (v.filters.status) bits.push(D.STATUS_MAP[v.filters.status] ? D.STATUS_MAP[v.filters.status].label.toLowerCase() : v.filters.status);
    if (v.filters.overdue) bits.push('overdue');
    if (v.filters.sections && v.filters.sections.length) bits.push(v.filters.sections.join(' + ').toLowerCase());
    if (v.filters.q) bits.push('\u201C' + v.filters.q + '\u201D');
    return bits.join(' \u00b7 ') || 'everything';
  }

  function saveViewFlow() {
    const state = S();
    G.ui.promptModal({
      title: 'Save this as a view',
      message: 'Views remember the search, filters and sort \u2014 they live in the \u201CAll stories\u201D menu.',
      value: suggestViewName(),
      placeholder: 'e.g. Overdue Business',
      confirmLabel: 'Save view',
      validate: (v) => {
        if (!v.trim()) return 'Give the view a name.';
        if (state.views.some((x) => x.name.toLowerCase() === v.trim().toLowerCase())) return 'A view called \u201C' + v.trim() + '\u201D already exists.';
        return null;
      },
    }).then((name) => {
      if (!name) return;
      try {
        G.store.saveView(name, S().ui.filters, S().ui.sort);
        S().ui.viewId = G.store.state.views[G.store.state.views.length - 1].id;
        updateViewChip();
        G.ui.toast('success', 'View \u201C' + name + '\u201D saved.');
      } catch (e) { G.ui.toast('error', e.userMessage || e.message); }
    });
  }
  function suggestViewName() {
    const f = S().ui.filters;
    const bits = [];
    if (f.overdue) bits.push('Overdue');
    if (f.sections.length) bits.push(f.sections.join(' '));
    if (f.status === 'active') bits.push('On desk');
    else if (f.status) bits.push(D.STATUS_MAP[f.status] ? D.STATUS_MAP[f.status].label : f.status);
    return bits.join(' ') || (f.q ? '\u201C' + f.q + '\u201D' : 'My view');
  }

  function clearFilters() {
    const s = S();
    s.ui.filters = D.defaultFilters();
    s.ui.viewId = null;
    ledgerPage = 1;
    refreshView(true);
  }

  function buildLedgerTable(pageList) {
    const state = S();
    const c = ctx();
    const sort = state.ui.sort;
    const wrap = h('div', { class: 'tablewrap' });
    const table = h('table', { class: 'ledger' });
    const thead = h('thead', null, h('tr', null,
      h('th', { class: 'col-check' }, h('input', {
        type: 'checkbox', 'aria-label': 'Select all on this page',
        checked: pageList.length && pageList.every((s) => selection.has(s.id)) ? true : null,
        onchange: (e) => {
          if (e.target.checked) pageList.forEach((s) => selection.add(s.id));
          else pageList.forEach((s) => selection.delete(s.id));
          refreshView();
        },
      })),
      colHead('headline', 'Story'),
      colHead('section', 'Section'),
      colHead('writer', 'Writer'),
      colHead('status', 'Status'),
      colHead('due', 'Due'),
      colHead('words', 'Words'),
      colHead('updated', 'Updated'),
      h('th', { class: 'col-menu', 'aria-label': 'Actions' })
    ));
    function colHead(key, label) {
      const active = sort.key === key;
      const th = h('th', { 'aria-sort': active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : null },
        h('button', {
          class: 'th-sort' + (active ? ' is-active' : ''), type: 'button',
          onclick: () => {
            const s = S();
            s.ui.viewId = null;
            if (s.ui.sort.key === key) s.ui.sort.dir = s.ui.sort.dir === 'asc' ? 'desc' : 'asc';
            else s.ui.sort = { key, dir: key === 'updated' || key === 'due' ? 'asc' : 'asc' };
            refreshView();
          },
        }, label, active ? h('span', { class: 'sort-dir' }, sort.dir === 'asc' ? '\u2191' : '\u2193') : null)
      );
      return th;
    }
    table.appendChild(thead);
    const tbody = h('tbody');
    pageList.forEach((story, idx) => {
      const w = state.writers.find((x) => x.id === story.writerId);
      const sel = selection.has(story.id);
      const tr = h('tr', {
        class: 'ledger-row' + (sel ? ' is-selected' : ''),
        tabindex: '0', 'data-story-id': story.id, 'data-idx': idx,
        'aria-selected': sel ? 'true' : 'false',
      },
        h('td', { class: 'col-check' }, h('input', {
          type: 'checkbox', checked: sel ? true : null, 'aria-label': 'Select \u201C' + story.headline + '\u201D',
          onclick: (e) => e.stopPropagation(),
          onchange: (e) => { if (e.target.checked) selection.add(story.id); else selection.delete(story.id); rangeAnchor = idx; refreshView(); },
        })),
        h('td', { class: 'col-story' },
          h('span', { class: 'ledger-headline' }, story.headline),
          h('span', { class: 'mono ledger-slug' }, story.slug,
            story.tags.length ? h('span', { class: 'ledger-tags' }, story.tags.map((t) => ' #' + t).join('')) : null)
        ),
        h('td', null, G.ui.sectionTag(story.section)),
        h('td', null, G.ui.writerChip(state, story)),
        h('td', null, G.ui.statusChip(story.status)),
        h('td', null, G.ui.duePill(story)),
        h('td', { class: 'col-words' },
          h('span', { class: 'mono words-n' }, (story.wordCount || 0).toLocaleString()),
          G.ui.wordBar(story)
        ),
        h('td', { class: 'col-updated mono' }, D.relTime(story.updatedAt)),
        h('td', { class: 'col-menu' }, h('button', {
          class: 'iconbtn iconbtn-sm', type: 'button', 'aria-label': 'Actions for \u201C' + story.headline + '\u201D',
          onclick: (e) => { e.stopPropagation(); moveMenu(story, e.currentTarget); },
        }, icon('more', 15)))
      );
      tr.addEventListener('click', (e) => {
        if (e.target.closest('input,button')) return;
        if (e.shiftKey && rangeAnchor != null) {
          const list = ledgerFiltered();
          const a = Math.min(rangeAnchor, idx), b = Math.max(rangeAnchor, idx);
          for (let i = a; i <= b; i++) { const s = list[i]; if (s) selection.add(s.id); }
          refreshView();
          return;
        }
        rangeAnchor = idx;
        openStory(story.id);
      });
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); openStory(story.id); }
        if (e.key === 'x') { e.preventDefault(); if (selection.has(story.id)) selection.delete(story.id); else selection.add(story.id); refreshView(); }
        if (e.key === 'm') { e.preventDefault(); moveMenu(story, tr.querySelector('.col-menu .iconbtn')); }
        if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); const next = tbody.querySelectorAll('.ledger-row')[idx + 1]; if (next) next.focus(); }
        if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); const prev = tbody.querySelectorAll('.ledger-row')[idx - 1]; if (prev) prev.focus(); }
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function buildPager(pages, total) {
    const state = S();
    return h('div', { class: 'pager' },
      h('span', { class: 'pager-info' }, total.toLocaleString() + ' stories \u00b7 page ' + ledgerPage + ' of ' + pages),
      h('div', { class: 'pager-btns' },
        h('button', { class: 'btn btn-ghost', type: 'button', disabled: ledgerPage <= 1 ? '' : null, onclick: () => { ledgerPage--; refreshView(); } }, icon('chevronLeft', 13), 'Prev'),
        h('button', { class: 'btn btn-ghost', type: 'button', disabled: ledgerPage >= pages ? '' : null, onclick: () => { ledgerPage++; refreshView(); } }, 'Next', icon('chevronRight', 13))
      )
    );
  }

  function buildBulkBar(list) {
    const state = S();
    const allFilteredSelected = list.length && list.every((s) => selection.has(s.id));
    const bar = h('div', { class: 'bulkbar', role: 'toolbar', 'aria-label': 'Bulk actions' },
      h('span', { class: 'bulkbar-count' }, selection.size + ' selected'),
      allFilteredSelected ? null : h('button', { class: 'bulkbar-link', type: 'button', onclick: () => { list.forEach((s) => selection.add(s.id)); refreshView(); } }, 'Select all ' + list.length + ' matching'),
      h('span', { class: 'bulkbar-sep' }),
      bulkMenuBtn('Status \u25BE', (anchor) => {
        const items = ['pitch', 'assigned', 'draft', 'edit', 'ready'].map((to) => ({
          label: 'Move to ' + D.STATUS_MAP[to].label.toLowerCase(), icon: D.STATUS_MAP[to].icon,
          onClick: () => runBulk(() => G.store.bulkSetStatus([...selection], to)),
        }));
        items.push({ label: 'Move to slotted', icon: 'layout', disabled: true, reason: 'Slotting goes through the Edition desk, one slot at a time.' });
        items.push({ label: 'Publish', icon: 'press', disabled: true, reason: 'Publishing happens when an edition publishes.' });
        items.push({ separator: true });
        items.push({ label: 'Archive (published & killed only)', icon: 'archive', onClick: () => runBulkArchive([...selection]) });
        G.ui.popover(anchor, items, { align: 'left' });
      }),
      bulkMenuBtn('Reassign \u25BE', (anchor) => {
        const items = state.writers.filter((w) => w.active).sort((a, b) => a.name.localeCompare(b.name)).map((w) => ({
          label: w.name, hint: w.beat, icon: 'user',
          onClick: () => runBulk(() => G.store.bulkReassign([...selection], w.id)),
        }));
        if (!items.length) items.push({ label: 'No active writers \u2014 add one in People', disabled: true });
        G.ui.popover(anchor, items, { align: 'left' });
      }),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => runBulk(() => G.store.bumpDue([...selection], 1)) }, 'Due +1d'),
      h('button', { class: 'btn btn-ghost btn-sm btn-danger-text', type: 'button', onclick: () => killFlow([...selection]) }, 'Kill\u2026'),
      h('span', { class: 'bulkbar-sep' }),
      h('button', { class: 'iconbtn iconbtn-sm', type: 'button', 'aria-label': 'Clear selection', title: 'Clear selection', onclick: () => { selection.clear(); refreshView(); } }, icon('cross', 14))
    );
    return bar;
  }
  function bulkMenuBtn(label, open) {
    return h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: (e) => open(e.currentTarget) }, label);
  }
  function runBulk(fn) {
    try {
      const r = fn();
      let msg = 'Moved ' + r.moved + ' ' + (r.moved === 1 ? 'story' : 'stories') + '.';
      if (r.blocked && r.blocked.length) msg += ' Skipped ' + r.blocked.length + ': ' + r.blocked[0].reason;
      G.ui.toast(r.blocked && r.blocked.length ? 'warn' : 'success', msg, G.store.canUndo ? { label: 'Undo', run: doUndo } : null);
      selection.clear();
    } catch (e) {
      G.ui.toast('error', e.userMessage || e.message);
    }
  }
  function runBulkArchive(ids) {
    try {
      const r = G.store.archiveStories(ids);
      let msg = 'Archived ' + r.moved.length + '.';
      if (r.blocked.length) msg += ' Skipped ' + r.blocked.length + ': ' + r.blocked[0].reason;
      G.ui.toast('success', msg, G.store.canUndo ? { label: 'Undo', run: doUndo } : null);
      selection.clear();
    } catch (e) { G.ui.toast('error', e.userMessage || e.message); }
  }

  /* ================= EDITION ================= */
  let editionPoolQuery = '';
  function renderEdition(container) {
    const state = S();
    G.ui.clear(container);
    container.appendChild(buildEditionHead());
    const body = h('div', { class: 'edition-body' });
    container.appendChild(body);
    const ed = D.activeEdition(state);

    if (!ed) {
      body.appendChild(G.ui.emptyState({
        icon: 'layout',
        title: 'No edition open',
        body: 'Editions are the paper\u2019s print runs. Open one, drag ready stories into slots, and publish when the pages are full.',
        actions: [{ label: 'Open the first edition', kind: 'primary', onClick: () => { G.store.createEdition(); refreshView(); } }],
      }));
      return;
    }

    const grid = h('div', { class: 'edition-grid' });

    /* ----- ready pool ----- */
    const poolPanel = h('aside', { class: 'pool', 'aria-label': 'Ready stories waiting for a slot' });
    const poolSearchWrap = h('div', { class: 'searchbox searchbox-sm' });
    const poolSearch = h('input', {
      class: 'input search-input', type: 'search', placeholder: 'Filter ready stories\u2026',
      value: editionPoolQuery, 'aria-label': 'Filter ready stories', 'data-focuskey': 'pool-search',
    });
    poolSearch.addEventListener('input', () => {
      editionPoolQuery = poolSearch.value;
      refreshPoolList();
    });
    poolSearchWrap.appendChild(icon('search', 14));
    poolSearchWrap.appendChild(poolSearch);

    function refreshPoolList() {
      const list = poolList();
      G.ui.clear(poolBody);
      if (!list.length) {
        poolBody.appendChild(h('div', { class: 'board-col-empty' },
          readyCount() ? 'No ready stories match \u201C' + editionPoolQuery + '\u201D.' : 'Nothing is ready \u2014 approve stories on the board (In edit \u2192 Ready) and they\u2019ll queue here.'));
        return;
      }
      list.forEach((s) => poolBody.appendChild(poolCard(s)));
    }
    function poolList() {
      const all = S().stories.filter((s) => s.status === 'ready');
      if (!editionPoolQuery) return D.sortStories(all, { key: 'due', dir: 'asc' }, ctx());
      const toks = editionPoolQuery.toLowerCase().split(/\s+/).filter(Boolean);
      return all.filter((s) => {
        const hay = (s.headline + ' ' + s.slug + ' ' + s.section + ' ' + s.tags.join(' ')).toLowerCase();
        return toks.every((t) => hay.includes(t));
      });
    }
    function readyCount() { return S().stories.filter((s) => s.status === 'ready').length; }

    function poolCard(story) {
      const card = storyCard(story, { draggable: true });
      card.classList.add('pool-card');
      /* assign via menu too (keyboard + touch path) */
      card.appendChild(h('button', {
        class: 'card-quickmenu iconbtn iconbtn-sm', type: 'button', 'aria-label': 'Assign \u201C' + story.headline + '\u201D to a slot',
        onclick: (e) => { e.stopPropagation(); assignMenu(story, e.currentTarget); },
      }, icon('more', 14)));
      return card;
    }

    function assignMenu(story, anchor) {
      const s = S();
      const ed2 = D.activeEdition(s);
      if (!ed2) { G.ui.toast('warn', 'No edition open.'); return; }
      const items = ed2.slots.map((slot) => {
        const problem = D.slotProblem(s, slot, story);
        const cur = slot.storyId ? s.stories.find((x) => x.id === slot.storyId) : null;
        return {
          label: slot.label + (slot.section === 'any' ? '' : ' \u00b7 ' + slot.section) + (cur ? ' (holds \u201C' + cur.slug + '\u201D)' : slot.hold ? ' (empty)' : ''),
          icon: 'layout',
          disabled: !!problem,
          reason: problem || '',
          onClick: () => { try { G.store.assignSlot(slot.id, story.id); G.ui.toast('success', '\u201C' + story.headline + '\u201D slotted into ' + slot.label + '.'); } catch (e) { G.ui.toast('error', e.userMessage); } },
        };
      });
      G.ui.popover(anchor, items, { align: 'left' });
    }

    const poolHead = h('div', { class: 'pool-head' },
      h('h3', null, 'Ready to slot'),
      h('span', { class: 'pool-count' }, readyCount())
    );
    const poolBody = h('div', { class: 'pool-body' });
    poolPanel.appendChild(poolHead);
    poolPanel.appendChild(poolSearchWrap);
    poolPanel.appendChild(poolBody);

    /* drop back on pool = pull from slot */
    poolPanel.addEventListener('dragover', (e) => { if (draggedStory && draggedStory.status === 'slotted') { e.preventDefault(); poolPanel.classList.add('drop-ok'); } });
    poolPanel.addEventListener('dragleave', (e) => { if (!poolPanel.contains(e.relatedTarget)) poolPanel.classList.remove('drop-ok'); });
    poolPanel.addEventListener('drop', (e) => {
      e.preventDefault();
      poolPanel.classList.remove('drop-ok');
      if (!draggedStory || draggedStory.status !== 'slotted') return;
      const st = draggedStory; draggedStory = null;
      const found = D.editionOfStory(S(), st);
      if (!found) return;
      try { G.store.unslot(found.slot.id); G.ui.toast('success', '\u201C' + st.headline + '\u201D pulled \u2014 back to Ready.'); }
      catch (e2) { G.ui.toast('error', e2.userMessage); }
    });

    /* ----- slots ----- */
    const slotsPanel = h('div', { class: 'slots' });
    const slotsHead = h('div', { class: 'slots-head' },
      h('h3', null, 'Slots \u2014 ' + ed.name),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: (e) => addSlotMenu(e.currentTarget, ed) }, icon('plus', 13), 'Add slot')
    );
    const slotsGrid = h('div', { class: 'slots-grid' });
    ed.slots.forEach((slot) => slotsGrid.appendChild(slotCard(ed, slot, assignMenu)));
    slotsPanel.appendChild(slotsHead);
    slotsPanel.appendChild(slotsGrid);

    grid.appendChild(poolPanel);
    grid.appendChild(slotsPanel);
    body.appendChild(grid);
    refreshPoolList();
  }

  function addSlotMenu(anchor, ed) {
    const items = [{ label: 'Slot name first\u2026', icon: 'plus', onClick: () => addSlotFlow(ed) }];
    G.ui.popover(anchor, items, { align: 'left' });
  }
  function addSlotFlow(ed) {
    G.ui.promptModal({
      title: 'Add a slot to ' + ed.name,
      message: 'Name it like a page element: \u201CFront \u2014 lead\u201D, \u201CPage 7 \u2014 photo\u201D, \u201CBack page\u201D.',
      placeholder: 'Slot name',
      confirmLabel: 'Add slot',
      validate: (v) => (!v.trim() ? 'Give the slot a name.' : (v.trim().length > 40 ? 'Slot names are capped at 40 characters.' : null)),
    }).then((label) => {
      if (!label) return;
      const state = S();
      const edNow = state.editions.find((e) => e.id === ed.id);
      if (!edNow || edNow.status === 'published') { G.ui.toast('error', 'That edition is published and locked.'); return; }
      const sections = new Set(edNow.slots.map((s) => s.section));
      const free = ['any'].concat(D.SECTIONS).find((sec) => !sections.has(sec)) || 'any';
      try { G.store.addSlot(ed.id, label, free); } catch (e) { G.ui.toast('error', e.userMessage); }
    });
  }

  function slotCard(ed, slot, assignMenu) {
    const state = S();
    const story = slot.storyId ? state.stories.find((x) => x.id === slot.storyId) : null;
    const published = ed.status === 'published';
    const el = h('div', {
      class: 'slot' + (story ? ' is-filled' : '') + (slot.hold ? ' is-held' : '') + (published ? ' is-locked' : ''),
      'data-slot-id': slot.id,
    });
    const head = h('div', { class: 'slot-head' },
      h('span', { class: 'slot-label' }, slot.label),
      h('span', { class: 'slot-section' }, slot.section === 'any' ? 'any section' : slot.section),
      h('span', { class: 'slot-actions' },
        !published ? h('button', {
          class: 'iconbtn iconbtn-sm', type: 'button', 'aria-label': 'Slot options for ' + slot.label,
          onclick: (e) => { e.stopPropagation(); slotMenu(e.currentTarget, ed, slot, story, assignMenu); },
        }, icon('more', 14)) : null
      )
    );
    el.appendChild(head);
    const zone = h('div', { class: 'slot-zone' });
    if (story) {
      zone.appendChild(storyCard(story, { draggable: !published }));
      if (slot.hold) {
        zone.appendChild(h('div', { class: 'slot-holdflag' }, icon('hold', 12), ' On hold \u2014 blocks publishing'));
      }
      if (!published) {
        zone.appendChild(h('div', { class: 'slot-zoneactions' },
          h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: () => { try { G.store.unslot(slot.id); G.ui.toast('info', '\u201C' + story.headline + '\u201D pulled \u2014 back to Ready.'); } catch (e) { G.ui.toast('error', e.userMessage); } } }, icon('restore', 12), 'Pull to Ready'),
          h('button', {
            class: 'btn btn-ghost btn-xs' + (slot.hold ? ' is-on' : ''), type: 'button', 'aria-pressed': slot.hold ? 'true' : 'false',
            onclick: () => { try { G.store.toggleHold(slot.id); } catch (e) { G.ui.toast('error', e.userMessage); } },
          }, icon('hold', 12), slot.hold ? 'Clear hold' : 'Hold')
        ));
      }
    } else {
      zone.classList.add('is-empty');
      zone.appendChild(h('div', { class: 'slot-emptytext' },
        published ? 'Ran empty in this edition.' : 'Empty \u2014 drop a ready story here, or use its \u22EF menu.'));
    }
    el.appendChild(zone);
    if (!published) {
      el.addEventListener('dragover', (e) => {
        if (!draggedStory) return;
        e.preventDefault();
        const problem = D.slotProblem(S(), slot, draggedStory);
        el.classList.toggle('drop-ok', !problem);
        el.classList.toggle('drop-bad', !!problem);
      });
      el.addEventListener('dragleave', (e) => { if (!el.contains(e.relatedTarget)) el.classList.remove('drop-ok', 'drop-bad'); });
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drop-ok', 'drop-bad');
        if (!draggedStory) return;
        const st = draggedStory; draggedStory = null;
        const problem = D.slotProblem(S(), slot, st);
        if (problem) { G.ui.toast('error', problem); return; }
        try { G.store.assignSlot(slot.id, st.id); G.ui.toast('success', '\u201C' + st.headline + '\u201D slotted into ' + slot.label + '.'); }
        catch (err) { G.ui.toast('error', err.userMessage || err.message); }
      });
    }
    return el;
  }

  function slotMenu(anchor, ed, slot, story, assignMenu) {
    const items = [];
    if (story) {
      items.push({ label: slot.hold ? 'Clear hold' : 'Put on hold', icon: 'hold', onClick: () => { try { G.store.toggleHold(slot.id); } catch (e) { G.ui.toast('error', e.userMessage); } } });
      items.push({ label: 'Pull story to Ready', icon: 'restore', onClick: () => { try { G.store.unslot(slot.id); } catch (e) { G.ui.toast('error', e.userMessage); } } });
      items.push({ label: 'Open story', icon: 'paper', onClick: () => openStory(story.id) });
      items.push({ separator: true });
    }
    items.push({ label: 'Rename slot\u2026', icon: 'pen', onClick: () => {
      G.ui.promptModal({ title: 'Rename slot', value: slot.label, confirmLabel: 'Rename', validate: (v) => (!v.trim() ? 'Give the slot a name.' : null) })
        .then((v) => { if (v) { try { G.store.renameSlot(slot.id, v); } catch (e) { G.ui.toast('error', e.userMessage); } } });
    } });
    items.push({
      label: 'Change section\u2026', icon: 'layout', onClick: () => {
        const s = S();
        const live = s.editions.find((e) => e.id === ed.id).slots.find((x) => x.id === slot.id);
        const items2 = ['any'].concat(D.SECTIONS).map((sec) => ({
          label: sec === 'any' ? 'Any section (wildcard)' : sec,
          icon: 'layout',
          disabled: live.section === sec,
          onClick: () => { try { G.store.setSlotSection(slot.id, sec); } catch (e) { G.ui.toast('error', e.userMessage); } },
        }));
        G.ui.popover(anchor, items2, { align: 'left' });
      },
    });
    items.push({ separator: true });
    items.push({ label: 'Remove slot', icon: 'trash', danger: true, onClick: () => {
      G.ui.confirmModal({
        title: 'Remove \u201C' + slot.label + '\u201D?',
        message: story ? '\u201C' + story.headline + '\u201D goes back to Ready \u2014 it won\u2019t be lost.' : 'An empty slot just goes away.',
        confirmLabel: 'Remove slot', danger: true,
      }).then((ok) => { if (ok) { try { G.store.removeSlot(slot.id); } catch (e) { G.ui.toast('error', e.userMessage); } } });
    } });
    G.ui.popover(anchor, items, { align: 'right' });
  }

  function buildEditionHead() {
    const state = S();
    const head = h('div', { class: 'edition-head' });
    const ed = D.activeEdition(state);
    const switcher = G.ui.selectEl({
      class: 'input select-sm edition-switch', 'aria-label': 'Choose edition',
      onchange: (e) => { try { G.store.switchEdition(e.target.value); } catch (err) { G.ui.toast('error', err.userMessage); } },
    },
      state.editions.map((e2) => ({ value: e2.id, label: e2.name + ' \u00b7 ' + D.fmtDate(e2.date) + (e2.status === 'published' ? ' \u00b7 printed' : '') })),
      ed ? ed.id : '');
    head.appendChild(switcher);
    head.appendChild(h('button', {
      class: 'iconbtn iconbtn-sm', type: 'button', 'aria-label': 'New edition', title: 'Open a new edition',
      onclick: () => {
        G.ui.confirmModal({
          title: 'Open a new edition?',
          message: 'A fresh edition opens with the paper\u2019s standard slots \u2014 front lead, front secondary, page 3, business, culture, opinion and back page. The current one stays exactly as it is.',
          confirmLabel: 'Open new edition',
        }).then((ok) => { if (ok) { G.store.createEdition(); refreshView(); } });
      },
    }, icon('plus', 14)));
    if (ed) {
      const days = D.daysUntil(ed.date);
      head.appendChild(h('span', { class: 'edition-when' },
        ed.status === 'published'
          ? 'Printed ' + D.fmtDate(ed.date) + ' \u00b7 ' + D.relTime(ed.publishedAt)
          : 'Prints ' + D.fmtDate(ed.date) + ' \u00b7 ' + (days === 0 ? 'today' : days === 1 ? 'tomorrow' : 'in ' + days + ' days')
      ));
      const filled = ed.slots.filter((s) => s.storyId).length;
      const held = ed.slots.filter((s) => s.storyId && s.hold).length;
      head.appendChild(h('span', { class: 'edition-counts' }, filled + '/' + ed.slots.length + ' slots filled' + (held ? ' \u00b7 ' + held + ' on hold' : '')));
      head.appendChild(h('span', { class: 'spacer' }));
      if (ed.status === 'draft') {
        head.appendChild(h('button', { class: 'btn btn-primary', type: 'button', onclick: (e) => publishFlow(e.currentTarget, ed) }, icon('press', 14), 'Publish ' + ed.name));
      } else {
        head.appendChild(h('span', { class: 'chip chip-published' }, icon('press', 12), 'Published'));
      }
    }
    return head;
  }

  function publishFlow(anchor, ed) {
    const state = S();
    const problems = D.publishProblems(state, ed);
    const blocks = problems.filter((p) => p.level === 'block');
    const warns = problems.filter((p) => p.level === 'warn');
    const filled = ed.slots.filter((s) => s.storyId);
    G.ui.openModal({
      title: 'Publish ' + ed.name + ' \u2014 ' + D.fmtDate(ed.date),
      wide: true,
      body: (body) => {
        body.appendChild(h('p', { class: 'modal-msg' },
          'Publishing is the point of no return: ' + filled.length + ' stor' + (filled.length === 1 ? 'y goes' : 'ies go') + ' to print and lock forever.'));
        const list = h('ul', { class: 'checklist' });
        if (!blocks.length && !warns.length) {
          list.appendChild(h('li', { class: 'check-ok' }, icon('checkCircle', 15), 'Every slot is filled and clear of holds. Clean edition.'));
        }
        blocks.forEach((p) => list.appendChild(h('li', { class: 'check-block' }, icon('cross', 15), p.text)));
        warns.forEach((p) => list.appendChild(h('li', { class: 'check-warn' }, icon('alert', 15), p.text)));
        body.appendChild(list);
        if (!blocks.length) {
          body.appendChild(h('p', { class: 'modal-note' }, 'The edition locks after publishing \u2014 pulls and holds stop working, stories read as published.'));
        }
      },
      actions: [
        { label: 'Back to the desk' },
        {
          label: blocks.length ? 'Blocked \u2014 fix the red items' : 'Publish: ' + filled.length + ' stories to print',
          kind: blocks.length ? '' : 'primary', autofocus: true,
          disabled: blocks.length ? true : null,
          onClick: () => {
            try {
              G.store.publishEdition(ed.id);
              G.ui.toast('success', ed.name + ' published \u2014 ' + filled.length + ' stories went to print.', G.store.canUndo ? { label: 'Undo', run: doUndo } : null);
            } catch (e) { G.ui.toast('error', e.userMessage || e.message); }
          },
        },
      ],
    });
  }

  /* ================= PEOPLE ================= */
  function renderPeople(container) {
    const state = S();
    G.ui.clear(container);
    if (!state.writers.length) {
      container.appendChild(G.ui.emptyState({
        icon: 'users',
        title: 'Nobody on the desk yet',
        body: 'Writers hold the bylines. Add your first one, then pitch a story and put it in their name.',
        actions: [{ label: 'Add a writer', kind: 'primary', onClick: () => writerFormModal(null) }],
      }));
      return;
    }
    const grid = h('div', { class: 'people-grid' });
    const sorted = state.writers.slice().sort((a, b) => (b.active - a.active) || a.name.localeCompare(b.name));
    sorted.forEach((w) => grid.appendChild(writerCard(w)));
    container.appendChild(grid);
    container.appendChild(h('div', { class: 'people-foot' },
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => writerFormModal(null) }, icon('plus', 14), 'Add writer')
    ));
  }

  function writerCard(w) {
    const state = S();
    const load = D.writerLoad(state, w);
    const block = w.active ? null : 'off desk';
    const card = h('article', { class: 'person' + (w.active ? '' : ' person-inactive') });
    card.appendChild(h('div', { class: 'person-head' },
      h('span', { class: 'writer-avatar', style: { background: w.color }, 'aria-hidden': 'true' }, D.initials(w.name)),
      h('div', { class: 'person-id' },
        h('h3', null, w.name),
        h('span', { class: 'person-beat' }, w.beat || 'No beat listed')
      ),
      h('span', { class: 'chip ' + (w.active ? 'chip-ready' : 'chip-killed') }, w.active ? 'On desk' : 'Off desk')
    ));
    const stats = h('div', { class: 'person-stats' },
      h('div', { class: 'person-stat' }, h('strong', null, String(load.count)), h('span', null, 'on desk')),
      h('div', { class: 'person-stat' + (load.overdue ? ' stat-bad' : '') }, h('strong', null, String(load.overdue)), h('span', null, 'overdue')),
      h('div', { class: 'person-stat' }, h('strong', null, load.owed.toLocaleString()), h('span', null, 'words owed')),
      h('div', { class: 'person-stat' }, h('strong', null, w.capacity.toLocaleString()), h('span', null, 'capacity/wk'))
    );
    card.appendChild(stats);
    const bar = h('div', { class: 'loadbar' + (load.pct > 100 ? ' loadbar-over' : ''), title: load.owed.toLocaleString() + ' of ' + w.capacity.toLocaleString() + ' weekly words (' + load.pct + '%)' },
      h('span', { class: 'loadbar-fill', style: { width: Math.min(100, load.pct) + '%' } })
    );
    card.appendChild(bar);
    if (load.stories.length) {
      const list = h('ul', { class: 'person-stories' });
      load.stories.slice(0, 4).forEach((s) => {
        list.appendChild(h('li', null,
          h('button', { class: 'person-storylink', type: 'button', onclick: () => openStory(s.id) }, s.headline),
          G.ui.duePill(s)
        ));
      });
      card.appendChild(list);
      if (load.count > 4) card.appendChild(h('button', { class: 'bulkbar-link person-more', type: 'button', onclick: () => {
        const s = S();
        s.ui.filters = Object.assign(D.defaultFilters(), { writer: w.id, status: 'active' });
        s.ui.viewId = null;
        G.app.navigate('stories');
      } }, 'See all ' + load.count + ' \u2192'));
    } else {
      card.appendChild(h('p', { class: 'person-none' }, block ? 'Nothing while off the desk.' : 'Nothing on their plate.'));
    }
    const actions = h('div', { class: 'person-actions' },
      h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: () => writerFormModal(w) }, icon('pen', 12), 'Edit'),
      w.active
        ? h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: () => deactivateFlow(w) }, 'Deactivate')
        : h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: () => { try { G.store.reactivateWriter(w.id); G.ui.toast('success', w.name + ' is back on the desk.'); } catch (e) { G.ui.toast('error', e.userMessage); } } }, icon('restore', 12), 'Reactivate'),
      h('button', {
        class: 'btn btn-ghost btn-xs', type: 'button', title: 'Move all their stories to another writer',
        onclick: () => reassignAllFlow(w),
      }, icon('arrowRight', 12), 'Reassign all'),
      h('button', { class: 'btn btn-ghost btn-xs btn-danger-text', type: 'button', onclick: () => deleteWriterFlow(w) }, icon('trash', 12), 'Delete')
    );
    card.appendChild(actions);
    return card;
  }

  function deactivateFlow(w) {
    const block = D.writerDeactivationBlock(S(), w);
    if (block) {
      G.ui.openModal({
        title: 'Can\u2019t deactivate ' + w.name + ' yet',
        body: (body) => {
          body.appendChild(h('p', { class: 'modal-msg' }, block));
          body.appendChild(h('p', { class: 'modal-note' }, 'Use \u201CReassign all\u201D to move their stories to someone else \u2014 deactivating then is one click.'));
        },
        actions: [
          { label: 'Close' },
          { label: 'Reassign all now\u2026', kind: 'primary', onClick: () => { reassignAllFlow(w); } },
        ],
      });
      return;
    }
    G.ui.confirmModal({
      title: 'Deactivate ' + w.name + '?',
      message: 'They come off the writer lists and can\u2019t take new assignments. Their past stories keep their byline.',
      confirmLabel: 'Deactivate',
    }).then((ok) => {
      if (!ok) return;
      try { G.store.deactivateWriter(w.id); G.ui.toast('success', w.name + ' moved off the desk.'); }
      catch (e) { G.ui.toast('error', e.userMessage); }
    });
  }

  function reassignAllFlow(w) {
    const state = S();
    const active = state.stories.filter((s) => s.writerId === w.id && D.ACTIVE_STATUSES.includes(s.status));
    const targets = state.writers.filter((x) => x.id !== w.id && x.active).sort((a, b) => a.name.localeCompare(b.name));
    let select;
    G.ui.openModal({
      title: 'Reassign ' + w.name + '\u2019s stories',
      body: (body) => {
        if (!active.length) {
          body.appendChild(h('p', { class: 'modal-msg' }, w.name + ' has no active stories \u2014 nothing to move.'));
        } else {
          body.appendChild(h('p', { class: 'modal-msg' }, 'Moving ' + active.length + ' active stor' + (active.length === 1 ? 'y' : 'ies') + ' to:'));
          if (!targets.length) body.appendChild(h('p', { class: 'modal-msg' }, 'No other active writers \u2014 add or reactivate one in People first.'));
          else {
            select = G.ui.selectEl({ class: 'input' }, targets.map((t) => ({ value: t.id, label: t.name + ' (' + D.writerLoad(state, t).count + ' on desk)' })), targets[0] && targets[0].id);
            body.appendChild(select);
          }
        }
      },
      actions: [
        { label: 'Cancel' },
        {
          label: 'Reassign', kind: 'primary', autofocus: true, disabled: !active.length || !targets.length ? true : null,
          onClick: () => {
            try {
              const r = G.store.bulkReassign(active.map((s) => s.id), select.value);
              G.ui.toast('success', 'Moved ' + r.moved + ' stor' + (r.moved === 1 ? 'y' : 'ies') + ' to ' + state.writers.find((x) => x.id === select.value).name + '.');
            } catch (e) { G.ui.toast('error', e.userMessage || e.message); }
          },
        },
      ],
    });
  }

  function deleteWriterFlow(w) {
    const block = D.writerDeleteBlock(S(), w);
    if (block) {
      G.ui.openModal({
        title: 'Can\u2019t delete ' + w.name,
        body: (body) => {
          body.appendChild(h('p', { class: 'modal-msg' }, block));
        },
        actions: [{ label: 'Close' }, { label: 'Deactivate instead', kind: 'primary', onClick: () => deactivateFlow(w) }],
      });
      return;
    }
    G.ui.confirmModal({
      title: 'Delete ' + w.name + '?',
      message: 'They have no stories on record, so nothing points at them. This can\u2019t be undone (but it also erases nothing).',
      confirmLabel: 'Delete writer', danger: true,
    }).then((ok) => { if (ok) { try { G.store.deleteWriter(w.id); G.ui.toast('success', w.name + ' removed from the desk.'); } catch (e) { G.ui.toast('error', e.userMessage); } } });
  }

  function writerFormModal(w) {
    const state = S();
    let name, beat, cap, errName;
    G.ui.openModal({
      title: w ? 'Edit ' + w.name : 'Add a writer',
      body: (body) => {
        const mk = (labelText, input) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, labelText), input);
        name = h('input', { class: 'input', type: 'text', value: w ? w.name : '', maxlength: '60', placeholder: 'Full name \u2014 e.g. Priya Raman' });
        beat = h('input', { class: 'input', type: 'text', value: w ? w.beat : '', maxlength: '60', placeholder: 'Beat \u2014 e.g. City Hall' });
        cap = h('input', { class: 'input', type: 'number', value: w ? w.capacity : 2500, min: '100', max: '40000', step: '100' });
        errName = h('div', { class: 'field-error', role: 'alert' });
        name.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
        body.appendChild(mk('Name', name));
        body.appendChild(errName);
        body.appendChild(mk('Beat', beat));
        body.appendChild(mk('Weekly word capacity', cap));
      },
      actions: [
        { label: 'Cancel' },
        {
          label: w ? 'Save changes' : 'Add writer', kind: 'primary', autofocus: true,
          onClick: () => submit(),
        },
      ],
    });
    function submit() {
      try {
        if (w) G.store.updateWriter(w.id, { name: name.value, beat: beat.value, capacity: Number(cap.value) });
        else G.store.createWriter({ name: name.value, beat: beat.value, capacity: Number(cap.value) });
        G.ui.toast('success', w ? 'Details saved for \u201C' + name.value.trim() + '\u201D.' : name.value.trim() + ' joined the desk.');
      } catch (e) {
        errName.textContent = e.userMessage || e.message;
        name.classList.add('input-bad');
        return false;
      }
    }
  }

  /* ================= ACTIVITY ================= */
  let activityKind = '';
  function renderActivity(container, partial) {
    const state = S();
    let body;
    if (partial && container.querySelector('.activity-toolbar')) {
      body = container.querySelector('.activity-body');
      G.ui.clear(body);
    } else {
      G.ui.clear(container);
      const bar = h('div', { class: 'activity-toolbar' },
        h('span', { class: 'muted' }, 'Everything that happened on the desk, newest first \u2014 ' + state.activity.length + ' entries.'),
        h('span', { class: 'spacer' }),
        G.ui.selectEl({ class: 'input select-sm', 'aria-label': 'Filter activity', onchange: (e) => { activityKind = e.target.value; renderActivity(container, true); } },
          [{ value: '', label: 'All kinds' }, { value: 'story', label: 'Stories' }, { value: 'edition', label: 'Editions' }, { value: 'note', label: 'Notes' }, { value: 'people', label: 'People' }, { value: 'data', label: 'Data' }],
          activityKind)
      );
      container.appendChild(bar);
      body = h('div', { class: 'activity-body' });
      container.appendChild(body);
    }
    if (!state.activity.length) {
      body.appendChild(G.ui.emptyState({
        icon: 'pulse', title: 'Nothing has happened yet',
        body: 'Create a story, move a card, slot an edition \u2014 it\u2019ll all show up here with times, so you can see the week at a glance.',
        actions: [{ label: 'Pitch a story', kind: 'primary', onClick: () => storyFormModal() }],
      }));
      return;
    }
    const list = h('ol', { class: 'activity-list' });
    state.activity.filter((a) => !activityKind || a.kind === activityKind).slice(0, 120).forEach((a) => {
      list.appendChild(h('li', { class: 'activity-item activity-' + a.kind },
        h('time', { class: 'mono activity-time', dateTime: a.at, title: D.fmtDateTime(a.at) }, D.relTime(a.at)),
        h('span', { class: 'activity-dot' }, icon(a.kind === 'edition' ? 'layout' : a.kind === 'note' ? 'pen' : a.kind === 'people' ? 'users' : a.kind === 'data' ? 'download' : 'paper', 12)),
        h('span', { class: 'activity-text' }, a.text)
      ));
    });
    body.appendChild(list);
  }

  /* ================= ARCHIVE ================= */
  function renderArchive(container) {
    const state = S();
    G.ui.clear(container);
    const archived = state.stories.filter((s) => s.status === 'archived').sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    if (!archived.length) {
      container.appendChild(G.ui.emptyState({
        icon: 'archive', title: 'The archive is empty',
        body: 'Published and killed stories can be archived from the ledger\u2019s bulk bar or a story\u2019s own menu. They wait here, restorable, out of the way.',
        actions: [{ label: 'Open the ledger', onClick: () => G.app.navigate('stories') }],
      }));
      return;
    }
    const wrap = h('div', { class: 'tablewrap' });
    const table = h('table', { class: 'ledger' }, h('thead', null, h('tr', null,
      h('th', null, 'Story'), h('th', null, 'Section'), h('th', null, 'Writer'), h('th', null, 'Was'), h('th', null, 'Archived'), h('th', { 'aria-label': 'Actions' })
    )));
    const tbody = h('tbody');
    archived.forEach((story) => {
      tbody.appendChild(h('tr', { class: 'ledger-row', tabindex: '0' },
        h('td', { class: 'col-story' }, h('span', { class: 'ledger-headline' }, story.headline), h('span', { class: 'mono ledger-slug' }, story.slug)),
        h('td', null, G.ui.sectionTag(story.section)),
        h('td', null, G.ui.writerChip(state, story)),
        h('td', null, G.ui.statusChip(story.archivedFrom || 'killed')),
        h('td', { class: 'mono' }, D.relTime(story.updatedAt)),
        h('td', { class: 'col-menu' },
          h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: () => { try { G.store.restoreStories([story.id]); G.ui.toast('success', '\u201C' + story.headline + '\u201D restored to ' + D.STATUS_MAP[story.archivedFrom || 'killed'].label.toLowerCase() + '.'); } catch (e) { G.ui.toast('error', e.userMessage); } } }, icon('restore', 12), 'Restore'),
          h('button', { class: 'btn btn-ghost btn-xs btn-danger-text', type: 'button', onclick: () => {
            G.ui.confirmModal({
              title: 'Delete \u201C' + story.headline + '\u201D for good?',
              message: 'This erases the story, its notes and its history. There is no undo \u2014 export a backup first if there\u2019s any doubt.',
              confirmLabel: 'Delete forever', danger: true,
            }).then((ok) => { if (ok) { try { G.store.deleteForever([story.id]); G.ui.toast('success', '\u201C' + story.headline + '\u201D deleted for good.'); } catch (e) { G.ui.toast('error', e.userMessage); } } });
          } }, icon('trash', 12), 'Delete forever')
        )
      ));
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(h('p', { class: 'muted archive-note' }, archived.length + ' stora' + (archived.length === 1 ? 'y' : 'ies') + ' archived. Restoring returns a story to what it was \u2014 published stays published.'));
    container.appendChild(wrap);
  }

  /* ================= DRAWER (story detail) ================= */
  let drawerStoryId = null;

  function openStory(id) {
    drawerStoryId = id;
    renderDrawer();
    const root = document.getElementById('drawer-root');
    if (root) root.classList.add('is-open');
  }
  function closeDrawer() {
    drawerStoryId = null;
    const root = document.getElementById('drawer-root');
    if (root) root.classList.remove('is-open');
  }
  function drawerOpen() { return drawerStoryId != null; }

  function renderDrawer() {
    const root = document.getElementById('drawer-root');
    if (!root) return;
    const state = S();
    const story = state.stories.find((x) => x.id === drawerStoryId);
    if (!story) { closeDrawer(); return; }
    /* Don't stomp on someone typing mid-sentence; targeted bits update instead. */
    const active = document.activeElement;
    if (root.contains(active) && /input|textarea/i.test(active.tagName || '')) { updateDrawerBits(story); return; }
    G.ui.clear(root);
    root.appendChild(drawerContent(story, state));
  }

  function updateDrawerBits(story) {
    const root = document.getElementById('drawer-root');
    if (!root) return;
    const row = root.querySelector('.drawer-statusrow');
    const bar = root.querySelector('.drawer-wordbar');
    const slot = root.querySelector('.drawer-slotbox');
    if (row) row.replaceWith(drawerStatusRow(story));
    if (bar) {
      const target = story.wordTarget || 0;
      const count = story.wordCount || 0;
      const pct = target ? Math.min(100, Math.round((count / target) * 100)) : 0;
      const st = count === 0 ? 'empty' : pct >= 100 ? 'done' : 'partial';
      bar.className = 'wordbar drawer-wordbar wordbar-' + st;
      bar.querySelector('.wordbar-fill').style.width = pct + '%';
      bar.title = count.toLocaleString() + ' of ' + target.toLocaleString() + ' words';
    }
    if (slot) {
      const fresh = drawerSlotBox(story);
      if (fresh) slot.replaceWith(fresh); else slot.remove();
    } else {
      const fresh = drawerSlotBox(story);
      const scroll = root.querySelector('.drawer-scroll');
      if (fresh && scroll) scroll.insertBefore(fresh, root.querySelector('.drawer-notes'));
    }
  }

  function drawerStatusRow(story) {
    const row = h('div', { class: 'drawer-statusrow' });
    row.appendChild(G.ui.statusChip(story.status));
    D.movesFor(story).forEach((m) => {
      if (m.reason) return;
      row.appendChild(h('button', {
        class: 'btn btn-ghost btn-xs', type: 'button',
        onclick: () => { try { G.store.setStatus(story.id, m.to); } catch (e) { G.ui.toast('error', e.userMessage); } },
      }, '\u2192 ' + D.STATUS_MAP[m.to].label));
    });
    if (!D.TERMINAL_STATUSES.includes(story.status)) {
      row.appendChild(h('span', { class: 'spacer' }));
      row.appendChild(h('button', {
        class: 'iconbtn iconbtn-sm', type: 'button', 'aria-label': 'More actions',
        onclick: (e) => moveMenu(story, e.currentTarget),
      }, icon('more', 15)));
    }
    return row;
  }

  function drawerSlotBox(story) {
    const state = S();
    const found = D.editionOfStory(state, story);
    if (!found) return null;
    return h('div', { class: 'drawer-slotbox' },
      icon('layout', 14),
      h('span', null, 'Slotted: ' + found.ed.name + ' \u00b7 ' + found.slot.label + (found.slot.hold ? ' \u00b7 on hold' : '')),
      h('button', { class: 'bulkbar-link', type: 'button', onclick: () => G.app.navigate('edition') }, 'Open edition')
    );
  }

  function drawerContent(story, state) {
    const c = ctx();
    const wrap = h('div', { class: 'drawer' });
    const scroll = h('div', { class: 'drawer-scroll' });

    /* head */
    scroll.appendChild(h('div', { class: 'drawer-head' },
      h('span', { class: 'mono drawer-slug' }, story.slug),
      h('span', { class: 'spacer' }),
      h('button', { class: 'iconbtn iconbtn-sm', type: 'button', 'aria-label': 'Copy slug', title: 'Copy slug', onclick: (e) => {
        copyText(story.slug).then(() => G.ui.toast('info', 'Slug copied: ' + story.slug));
      } }, icon('copy', 13)),
      h('button', { class: 'iconbtn iconbtn-sm', type: 'button', 'aria-label': 'Close story panel', title: 'Close (Esc)', onclick: () => closeDrawer() }, icon('cross', 15))
    ));

    /* headline */
    const counter = h('span', { class: 'charcount' }, '');
    const headline = h('textarea', {
      class: 'drawer-headline', rows: '2', maxlength: '400', 'aria-label': 'Headline',
    });
    headline.value = story.headline;
    headline.addEventListener('input', () => {
      const n = headline.value.length;
      counter.textContent = n + '/120';
      counter.classList.toggle('count-bad', n > 120);
    });
    headline.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); headline.blur(); }
    });
    headline.addEventListener('change', () => {
      const v = headline.value;
      const msg = D.validateField('headline', v, { state });
      if (msg) { G.ui.toast('error', msg); headline.value = story.headline; return; }
      try { G.store.updateStory(story.id, { headline: v }); } catch (e) { G.ui.toast('error', e.userMessage); headline.value = story.headline; }
    });
    const headWrap = h('div', { class: 'drawer-headlinewrap' }, headline, counter);
    scroll.appendChild(headWrap);

    /* standfirst */
    const standfirst = h('input', { class: 'input drawer-standfirst', type: 'text', maxlength: '260', placeholder: 'Standfirst \u2014 the one-sentence sell (optional)', 'aria-label': 'Standfirst' });
    standfirst.value = story.standfirst;
    standfirst.addEventListener('change', () => {
      try { G.store.updateStory(story.id, { standfirst: standfirst.value }); } catch (e) { G.ui.toast('error', e.userMessage); standfirst.value = story.standfirst; }
    });
    scroll.appendChild(standfirst);

    /* status row */
    scroll.appendChild(drawerStatusRow(story));

    /* slot box */
    const slotBox = drawerSlotBox(story);
    if (slotBox) scroll.appendChild(slotBox);

    /* meta grid */
    const mk = (labelText, input) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, labelText), input);
    const sectionSel = G.ui.selectEl({ class: 'input', 'aria-label': 'Section', onchange: (e) => {
      try { G.store.updateStory(story.id, { section: e.target.value }); } catch (err) { G.ui.toast('error', err.userMessage); e.target.value = story.section; }
    } }, D.SECTIONS.map((s) => ({ value: s, label: s })), story.section);
    const writerSel = G.ui.selectEl({ class: 'input', 'aria-label': 'Writer', onchange: (e) => {
      const wid = e.target.value;
      try {
        if (wid && story.status === 'pitch') {
          G.store.updateStory(story.id, { writerId: wid });
          G.store.setStatus(story.id, 'assigned');
          G.ui.toast('success', 'Assigned to ' + S().writers.find((w) => w.id === wid).name + '.');
        } else {
          G.store.updateStory(story.id, { writerId: wid });
        }
      } catch (err) { G.ui.toast('error', err.userMessage); e.target.value = story.writerId; }
    } },
      [{ value: '', label: '\u2014 no writer (pitch) \u2014' }].concat(
        state.writers.slice().sort((a, b) => (b.active - a.active) || a.name.localeCompare(b.name)).map((w) => ({ value: w.id, label: w.name + (w.active ? '' : ' (off desk)') }))),
      story.writerId);
    const prioSel = G.ui.selectEl({ class: 'input', 'aria-label': 'Priority', onchange: (e) => { try { G.store.updateStory(story.id, { priority: e.target.value }); } catch (err) { G.ui.toast('error', err.userMessage); } } },
      D.PRIORITIES.map((p) => ({ value: p.id, label: p.label })), story.priority);
    const dueInput = h('input', { class: 'input', type: 'date', value: story.due || '', 'aria-label': 'Due date', onchange: () => {
      try { G.store.updateStory(story.id, { due: dueInput.value || '' }); } catch (e) { G.ui.toast('error', e.userMessage); dueInput.value = story.due || ''; }
    } });
    const targetInput = h('input', { class: 'input', type: 'number', min: '100', max: '10000', step: '50', value: String(story.wordTarget || ''), 'aria-label': 'Word target', onchange: () => {
      try { G.store.updateStory(story.id, { wordTarget: Number(targetInput.value) }); } catch (e) { G.ui.toast('error', e.userMessage); targetInput.value = story.wordTarget; }
    } });
    const countInput = h('input', { class: 'input', type: 'number', min: '0', max: '100000', step: '10', value: String(story.wordCount || ''), 'aria-label': 'Current word count', onchange: () => {
      try { G.store.updateStory(story.id, { wordCount: Number(countInput.value) }); } catch (e) { G.ui.toast('error', e.userMessage); countInput.value = story.wordCount; }
    } });
    const tagsInput = h('input', { class: 'input', type: 'text', value: story.tags.join(', '), placeholder: 'comma,separated,tags', 'aria-label': 'Tags', onchange: () => {
      try { G.store.updateStory(story.id, { tags: tagsInput.value }); } catch (e) { G.ui.toast('error', e.userMessage); tagsInput.value = story.tags.join(', '); }
    } });

    const meta = h('div', { class: 'drawer-meta' },
      mk('Section', sectionSel), mk('Writer', writerSel), mk('Priority', prioSel), mk('Due', dueInput),
      mk('Word target', targetInput), mk('Words written', countInput), mk('Tags', tagsInput)
    );
    scroll.appendChild(meta);

    /* word bar */
    const target = story.wordTarget || 0;
    const count = story.wordCount || 0;
    const pct = target ? Math.min(100, Math.round((count / target) * 100)) : 0;
    const wstate = count === 0 ? 'empty' : pct >= 100 ? 'done' : 'partial';
    scroll.appendChild(h('div', { class: 'drawer-progress' },
      h('span', { class: 'wordbar drawer-wordbar wordbar-' + wstate, title: count.toLocaleString() + ' of ' + target.toLocaleString() + ' words' }, h('span', { class: 'wordbar-fill', style: { width: pct + '%' } })),
      h('span', { class: 'mono drawer-progresslabel' }, count.toLocaleString() + ' / ' + target.toLocaleString() + ' words')
    ));

    /* notes */
    const notesWrap = h('div', { class: 'drawer-notes' });
    notesWrap.appendChild(h('h3', { class: 'drawer-subhead' }, 'Edit notes ', h('span', { class: 'muted' }, '(' + story.notes.length + ')')));
    if (story.notes.length) {
      const list = h('ul', { class: 'notelist' });
      story.notes.slice().reverse().forEach((n) => {
        list.appendChild(h('li', { class: 'note' },
          h('div', { class: 'note-top' },
            h('time', { class: 'mono', dateTime: n.at, title: D.fmtDateTime(n.at) }, D.relTime(n.at)),
            h('button', { class: 'iconbtn iconbtn-sm', type: 'button', 'aria-label': 'Delete note', onclick: () => {
              try { G.store.deleteNote(story.id, n.id); G.ui.toast('info', 'Note deleted.', G.store.canUndo ? { label: 'Undo', run: doUndo } : null); } catch (e) { G.ui.toast('error', e.userMessage); }
            } }, icon('trash', 12))
          ),
          h('p', { class: 'note-text' }, n.text)
        ));
      });
      notesWrap.appendChild(list);
    } else {
      notesWrap.appendChild(h('p', { class: 'muted note-empty' }, 'No notes. The desk leaves line edits, sourcing reminders and hold reasons here.'));
    }
    const noteInput = h('textarea', { class: 'input textarea', rows: '2', maxlength: '700', placeholder: 'Add a note for the file\u2026 (max 600 characters)', 'aria-label': 'New note' });
    const noteErr = h('div', { class: 'field-error', role: 'alert' });
    const noteCount = h('span', { class: 'charcount' }, '0/600');
    noteInput.addEventListener('input', () => {
      const n = noteInput.value.length;
      noteCount.textContent = n + '/600';
      noteCount.classList.toggle('count-bad', n > 600);
      noteErr.textContent = '';
    });
    const addNote = () => {
      try {
        G.store.addNote(story.id, noteInput.value);
        noteInput.value = '';
        noteCount.textContent = '0/600';
      } catch (e) {
        noteErr.textContent = e.userMessage || e.message;
        noteInput.classList.add('input-bad');
      }
    };
    noteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addNote(); }
    });
    notesWrap.appendChild(h('div', { class: 'note-compose' }, noteInput,
      h('div', { class: 'note-composefoot' }, noteErr, h('span', { class: 'spacer' }), noteCount,
        h('button', { class: 'btn btn-primary btn-xs', type: 'button', onclick: addNote }, 'Add note ', icon('arrowRight', 12)))));
    scroll.appendChild(notesWrap);

    /* history */
    const hist = h('details', { class: 'drawer-history' },
      h('summary', null, 'History ', h('span', { class: 'muted' }, '(' + story.history.length + ')')));
    const hlist = h('ul', { class: 'histlist' });
    story.history.slice().reverse().forEach((ev) => {
      hlist.appendChild(h('li', null,
        h('time', { class: 'mono', dateTime: ev.at, title: D.fmtDateTime(ev.at) }, D.fmtDateTime(ev.at)),
        h('span', null, ev.detail)
      ));
    });
    hist.appendChild(hlist);
    scroll.appendChild(hist);

    /* foot */
    const foot = h('div', { class: 'drawer-foot' },
      h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: () => {
        try {
          const copy = G.store.duplicateStory(story.id);
          G.ui.toast('success', 'Duplicated as \u201C' + copy.slug + '\u201D.', { label: 'Open', run: () => openStory(copy.id) });
        } catch (e) { G.ui.toast('error', e.userMessage); }
      } }, icon('copy', 12), 'Duplicate'),
      h('span', { class: 'spacer' })
    );
    if (story.status === 'published' || story.status === 'killed') {
      foot.appendChild(h('button', { class: 'btn btn-ghost btn-xs', type: 'button', onclick: () => {
        try { G.store.archiveStories([story.id]); G.ui.toast('success', '\u201C' + story.headline + '\u201D archived.'); } catch (e) { G.ui.toast('error', e.userMessage); }
      } }, icon('archive', 12), 'Archive'));
    }
    if (!D.TERMINAL_STATUSES.includes(story.status)) {
      foot.appendChild(h('button', { class: 'btn btn-ghost btn-xs btn-danger-text', type: 'button', onclick: () => killFlow([story.id]) }, icon('cross', 12), 'Kill\u2026'));
    }
    scroll.appendChild(foot);

    wrap.appendChild(scroll);
    return wrap;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(() => Promise.resolve());
    }
    return Promise.resolve();
  }

  /* ================= CREATE STORY MODAL ================= */
  function storyFormModal() {
    const state = S();
    const f = { headline: '', slug: '', slugTouched: false, standfirst: '', section: 'News', writerId: '', priority: 'normal', due: '', wordTarget: 1200, tags: '' };
    const errs = {};
    let els = {};

    G.ui.openModal({
      title: 'Pitch a story',
      wide: true,
      body: (body) => {
        const grid = h('div', { class: 'formgrid' });
        const mk = (labelText, input, errKey) => {
          const err = h('div', { class: 'field-error', role: 'alert' });
          errs[errKey] = err;
          input.addEventListener('blur', () => checkField(errKey, input));
          return h('div', { class: 'field' }, h('span', { class: 'field-label' }, labelText), input, err);
        };
        els.headline = h('input', { class: 'input', type: 'text', maxlength: '200', placeholder: 'The headline as you\u2019d run it' });
        els.headline.addEventListener('input', () => {
          if (!f.slugTouched) { els.slug.value = G.store.suggestSlug(els.headline.value); }
        });
        els.slug = h('input', { class: 'input mono-input', type: 'text', maxlength: '40', placeholder: 'kebab-case-slug' });
        els.slug.addEventListener('input', () => { f.slugTouched = !!els.slug.value; });
        els.standfirst = h('input', { class: 'input', type: 'text', maxlength: '260', placeholder: 'One-line sell (optional)' });
        els.section = G.ui.selectEl({ class: 'input' }, D.SECTIONS.map((s) => ({ value: s, label: s })), f.section);
        els.writer = G.ui.selectEl({ class: 'input' },
          [{ value: '', label: '\u2014 leave as pitch \u2014' }].concat(state.writers.filter((w) => w.active).sort((a, b) => a.name.localeCompare(b.name)).map((w) => ({ value: w.id, label: w.name + ' \u00b7 ' + (w.beat || 'no beat') }))),
          f.writerId);
        els.priority = G.ui.selectEl({ class: 'input' }, D.PRIORITIES.map((p) => ({ value: p.id, label: p.label })), f.priority);
        els.due = h('input', { class: 'input', type: 'date', value: D.todayStr() });
        els.target = h('input', { class: 'input', type: 'number', min: '100', max: '10000', step: '50', value: '1200' });
        els.tags = h('input', { class: 'input', type: 'text', placeholder: 'council, housing (max 6)', maxlength: '120' });

        grid.appendChild(h('div', { class: 'formgrid-span2' }, mk('Headline', els.headline, 'headline')));
        grid.appendChild(mk('Slug (the desk\u2019s file name)', els.slug, 'slug'));
        grid.appendChild(mk('Section', els.section, 'section'));
        grid.appendChild(mk('Writer', els.writer, 'writerId'));
        grid.appendChild(mk('Priority', els.priority, 'priority'));
        grid.appendChild(mk('Due', els.due, 'due'));
        grid.appendChild(mk('Word target', els.target, 'wordTarget'));
        grid.appendChild(h('div', { class: 'formgrid-span2' }, mk('Standfirst', els.standfirst, 'standfirst')));
        grid.appendChild(h('div', { class: 'formgrid-span2' }, mk('Tags', els.tags, 'tags')));
        body.appendChild(grid);
        body.appendChild(h('p', { class: 'modal-note' }, 'Pitches land on the board immediately. Give it a writer and it starts assigned; leave the writer off and it waits in the idea pile.'));
      },
      actions: [
        { label: 'Cancel' },
        { label: 'Add to the desk', kind: 'primary', autofocus: true, onClick: () => submit() },
      ],
    });

    function collect() {
      return {
        headline: els.headline.value,
        slug: els.slug.value,
        standfirst: els.standfirst.value,
        section: els.section.value,
        writerId: els.writer.value,
        priority: els.priority.value,
        due: els.due.value || '',
        wordTarget: Number(els.target.value),
        tags: els.tags.value,
      };
    }
    function checkField(key, input) {
      const vals = collect();
      const msg = D.validateField(key, vals[key], { state });
      errs[key].textContent = msg || '';
      input.classList.toggle('input-bad', !!msg);
      return !msg;
    }
    function submit() {
      const vals = collect();
      let firstBad = null;
      Object.keys(errs).forEach((k) => {
        const map = { headline: els.headline, slug: els.slug, section: els.section, writerId: els.writer, priority: els.priority, due: els.due, wordTarget: els.target, standfirst: els.standfirst };
        const msg = D.validateField(k, vals[k], { state });
        errs[k].textContent = msg || '';
        map[k].classList.toggle('input-bad', !!msg);
        if (msg && !firstBad) firstBad = map[k];
      });
      if (firstBad) { firstBad.focus(); return false; }
      try {
        const st = G.store.createStory(vals);
        G.ui.toast('success', '\u201C' + st.headline + '\u201D is on the desk as ' + D.STATUS_MAP[st.status].label.toLowerCase() + '.', { label: 'Open', run: () => openStory(st.id) });
      } catch (e) {
        G.ui.toast('error', e.userMessage || e.message);
        return false;
      }
    }
  }

  /* ================= SETTINGS ================= */
  function settingsModal() {
    const state = S();
    const health = G.store.storageHealth();
    let fileInput;
    G.ui.openModal({
      title: 'Settings',
      wide: true,
      body: (body) => {
        /* paper name */
        const paperInput = h('input', { class: 'input', type: 'text', value: state.meta.paperName, maxlength: '60', 'aria-label': 'Paper name' });
        body.appendChild(h('div', { class: 'settings-row' },
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Paper name (shown in the folio line)'), paperInput),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { try { G.store.setPaperName(paperInput.value); G.ui.toast('success', 'Paper renamed.'); } catch (e) { G.ui.toast('error', e.userMessage); } } }, 'Rename')
        ));

        body.appendChild(h('h3', { class: 'settings-subhead' }, 'Your data'));
        body.appendChild(h('p', { class: 'settings-line' }, 'Everything lives in this browser\u2019s local storage \u2014 ' + D.fmtBytes(health.bytes) + ' used of roughly 5 MB, last saved ' + (health.lastSavedAt ? D.fmtTime(health.lastSavedAt.toISOString()) : 'not yet this session') + '. Nothing leaves your machine unless you export it.'));
        if (!health.ok) body.appendChild(h('p', { class: 'settings-warn' }, icon('alert', 13), ' ' + health.msg));

        const dataBtns = h('div', { class: 'btnrow' },
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { try { G.store.exportJson(); G.ui.toast('success', 'Backup exported as JSON.'); } catch (e) { G.ui.toast('error', e.userMessage); } } }, icon('download', 14), 'Export JSON'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { try { G.store.exportCsv(); G.ui.toast('success', 'Stories exported as CSV.'); } catch (e) { G.ui.toast('error', e.userMessage); } } }, icon('download', 14), 'Export CSV'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { if (fileInput) fileInput.click(); } }, icon('upload', 14), 'Import backup\u2026')
        );
        body.appendChild(dataBtns);
        fileInput = h('input', { type: 'file', accept: '.json,application/json', class: 'visually-hidden' });
        fileInput.addEventListener('change', () => {
          const file = fileInput.files && fileInput.files[0];
          fileInput.value = '';
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => importFlow(String(reader.result));
          reader.onerror = () => G.ui.toast('error', 'The file couldn\u2019t be read — try re-saving or re-exporting it.');
          reader.readAsText(file);
        });
        body.appendChild(fileInput);

        body.appendChild(h('h3', { class: 'settings-subhead' }, 'Start over'));
        const resetBtns = h('div', { class: 'btnrow' },
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => {
            G.ui.confirmModal({
              title: 'Reset to the sample desk?',
              message: 'The Calder Weekly demo returns and your current desk is replaced. Undo history clears.',
              confirmLabel: 'Reset to sample', danger: true, requireCheck: 'Download a JSON backup of the current desk first',
            }).then((ok) => { if (ok) { try { G.store.resetSample(true); G.ui.toast('success', 'Sample desk restored.'); } catch (e) { G.ui.toast('error', e.userMessage); } } });
          } }, icon('restore', 14), 'Reset to sample desk'),
          h('button', { class: 'btn btn-ghost btn-danger-text', type: 'button', onclick: () => {
            G.ui.confirmModal({
              title: 'Start an empty desk?',
              message: 'Everything is removed: stories, writers, editions, views, the log. Undo history clears too.',
              confirmLabel: 'Start empty', danger: true, requireCheck: 'Download a JSON backup of the current desk first',
            }).then((ok) => { if (ok) { try { G.store.startEmpty(true); G.ui.toast('success', 'Fresh desk started \u2014 pitch your first story (N).'); G.app.navigate('board'); } catch (e) { G.ui.toast('error', e.userMessage); } } });
          } }, icon('trash', 14), 'Wipe everything')
        );
        body.appendChild(resetBtns);

        body.appendChild(h('h3', { class: 'settings-subhead' }, 'About'));
        body.appendChild(h('p', { class: 'settings-line' }, 'Galley \u00b7 story desk for small newsrooms. Runs entirely offline in one page \u2014 no server, no account, no telemetry. Type is set in Fraunces and Inter (SIL Open Font License).'));
      },
      actions: [{ label: 'Close' }],
    });
  }

  function importFlow(text) {
    let parsed;
    try { parsed = G.store.inspectImport(text); }
    catch (e) { G.ui.toast('error', e.userMessage || e.message); return; }
    const c = parsed.counts;
    let mode = 'merge';
    G.ui.openModal({
      title: 'Import backup',
      wide: true,
      body: (body) => {
        body.appendChild(h('p', { class: 'modal-msg' },
          'The file holds ' + c.stories + ' stories, ' + c.writers + ' writers, ' + c.editions + ' editions' + (c.exportedAt ? ', exported ' + D.fmtDateTime(c.exportedAt) : '') + '.'));
        const radios = h('div', { class: 'radiogroup', role: 'radiogroup', 'aria-label': 'Import mode' });
        [
          { v: 'merge', t: 'Merge into the current desk', d: 'New stories are added; where a story exists on both, the newer edit wins. Nothing is deleted.' },
          { v: 'replace', t: 'Replace the whole desk', d: 'The current desk is swapped for the backup \u2014 export first if there\u2019s anything here worth keeping.' },
        ].forEach((o, i) => {
          const input = h('input', { type: 'radio', name: 'import-mode', value: o.v, checked: i === 0 ? true : null });
          input.addEventListener('change', () => { mode = o.v; });
          radios.appendChild(h('label', { class: 'radioline' }, input,
            h('span', { class: 'radioline-text' }, h('strong', null, o.t), h('small', null, o.d))));
        });
        body.appendChild(radios);
      },
      actions: [
        { label: 'Cancel' },
        {
          label: mode === 'merge' ? 'Merge import' : 'Replace desk', kind: 'primary', autofocus: true,
          onClick: (close) => {
            try {
              const r = G.store.applyImport(parsed, mode);
              G.ui.toast('success', 'Import applied: ' + r.added + ' added, ' + r.updated + ' updated, ' + r.kept + ' kept.',
                G.store.canUndo ? { label: 'Undo', run: doUndo } : null);
              refreshView(true);
            } catch (e) { G.ui.toast('error', e.userMessage || e.message); return false; }
          },
        },
      ],
    });
  }

  /* ================= WELCOME ================= */
  function welcomeOverlay() {
    const root = document.getElementById('welcome-root');
    if (!root) return;
    G.ui.clear(root);
    const steps = [
      { icon: 'board', title: 'Triage the pile', text: 'Pitches, drafts and edits live on one board. Drag cards forward; the desk refuses illegal moves and tells you why.' },
      { icon: 'layout', title: 'Slot the edition', text: 'Ready stories queue for the next print run. Slots have sections, holds block publishing, and the checklist checks your work.' },
      { icon: 'press', title: 'Publish & file', text: 'Publishing prints the edition, locks the stories and logs the day. Archive or revive \u2014 nothing is ever silently lost.' },
    ];
    root.appendChild(h('div', { class: 'welcome', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Welcome to Galley' },
      h('div', { class: 'welcome-inner' },
        h('p', { class: 'welcome-kicker' }, 'Story desk for small newsrooms'),
        h('h1', { class: 'welcome-brand' }, 'Galley'),
        h('p', { class: 'welcome-lede' }, 'One page that takes a paper from pitch to print: the board, the ledger and the edition desk share the same truth, so a change in one place is the change everywhere.'),
        h('div', { class: 'welcome-steps' }, steps.map((s) =>
          h('div', { class: 'welcome-step' }, icon(s.icon, 20), h('h3', null, s.title), h('p', null, s.text)))),
        h('div', { class: 'welcome-ctas' },
          h('button', { class: 'btn btn-primary btn-lg', type: 'button', 'data-autofocus': '1', onclick: () => finishSample() }, 'Open the sample desk'),
          h('button', { class: 'btn btn-ghost btn-lg', type: 'button', onclick: () => { G.store.startEmpty(false); G.ui.toast('info', 'Fresh desk started \u2014 press N to pitch your first story.'); } }, 'Start with an empty desk'),
          h('button', { class: 'btn btn-ghost btn-lg', type: 'button', onclick: () => importFromFilePicker() }, 'Import a backup\u2026')
        ),
        h('p', { class: 'welcome-foot' }, 'The sample paper (The Calder Weekly) is real, editable data \u2014 reset or wipe it any time in Settings. Press ? for keyboard shortcuts, ' + (navigator.platform.indexOf('Mac') >= 0 ? '\u2318K' : 'Ctrl+K') + ' for the command palette.')
      )
    ));
    function finishSample() {
      G.store.markOnboarded();
      G.ui.toast('info', 'This is the sample desk \u2014 every card is real data you can edit, move, slot or kill.');
    }
    function importFromFilePicker() {
      const input = h('input', { type: 'file', accept: '.json,application/json', class: 'visually-hidden' });
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          let parsed;
          try { parsed = G.store.inspectImport(String(reader.result)); }
          catch (e) { G.ui.toast('error', e.userMessage || e.message); return; }
          try {
            G.store.applyImport(parsed, 'replace');
            G.ui.toast('success', 'Backup restored: ' + parsed.counts.stories + ' stories.');
          } catch (e) { G.ui.toast('error', e.userMessage || e.message); }
        };
        reader.readAsText(file);
      });
      document.body.appendChild(input);
      input.click();
      setTimeout(() => input.remove(), 5000);
    }
  }

  /* ================= dispatcher ================= */
  function renderRoute(container, route) {
    const fresh = container.dataset.route !== route;
    container.dataset.route = route;
    if (fresh) { selection.clear(); ledgerPage = 1; G.ui.closePopovers(); }
    switch (route) {
      case 'board': renderBoard(container); break;
      case 'stories': renderLedger(container, !fresh); break;
      case 'edition': renderEdition(container, !fresh); break;
      case 'people': renderPeople(container); break;
      case 'activity': renderActivity(container, !fresh); break;
      case 'archive': renderArchive(container); break;
      default: renderBoard(container);
    }
  }
  function refreshView(forcePartial) {
    const main = document.getElementById('view-root');
    if (main && G.app) G.app.renderCurrentView(main, forcePartial);
  }
  let ledgerBodyTimer = null;
  function scheduleLedgerBodyRefresh() {
    clearTimeout(ledgerBodyTimer);
    ledgerBodyTimer = setTimeout(() => {
      const container = document.getElementById('view-root');
      if (container && container.dataset.route === 'stories') renderLedger(container, true);
    }, 140);
  }

  /* keyboard 'g' handled in app.js; expose needed bits */
  G.views = {
    renderRoute, openStory, closeDrawer, renderDrawer, drawerOpen,
    storyFormModal, settingsModal, welcomeOverlay, killFlow,
    get selection() { return selection; },
    set selection(v) { selection = v; },
    doUndo,
  };
})();
