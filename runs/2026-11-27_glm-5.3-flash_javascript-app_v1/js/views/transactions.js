/* Fiscus — Transactions view: searchable, filterable, grouped transaction
   list with full add/edit/delete workflows and undo. The toolbar persists
   between list refreshes so typing in search never loses focus. */
window.F = window.F || {};
F.views = F.views || {};

F.views.transactions = (function () {
  'use strict';

  const U = F.util;
  const PAGE = 50;

  const defaultFilters = () => ({ search: '', month: 'all', type: 'all', categoryId: 'all', sort: 'date-desc' });
  let filters = defaultFilters();
  let limit = PAGE;

  function title() { return 'Transactions'; }

  /* ---------- shell ---------- */

  function render(el) {
    // Guard against filters pointing at data that no longer exists.
    if (filters.month !== 'all' && F.store.monthsPresent().indexOf(filters.month) === -1 &&
        filters.month !== U.currentMonth()) {
      filters.month = 'all';
    }
    if (filters.categoryId !== 'all' && filters.categoryId !== '_none' && !F.store.categoryById(filters.categoryId)) {
      filters.categoryId = 'all';
    }

    el.innerHTML = viewHeadHtml() + toolbarHtml() + '<div id="tx-listwrap"></div>';
    bindToolbar(el);
    updateList(el);
  }

  function viewHeadHtml() {
    return '<div class="view-head"><div>' +
      '<h1>Transactions</h1>' +
      '<p class="view-sub">Everything you have recorded — search, filter, edit and organise.</p>' +
      '</div><button type="button" id="tx-add" class="btn btn-primary">' + F.ui.icon('plus') + 'Add transaction</button></div>';
  }

  function toolbarHtml() {
    const months = F.store.monthsPresent();
    const cur = U.currentMonth();
    if (months.indexOf(cur) === -1) months.unshift(cur);

    const monthOpts = ['<option value="all">All months</option>']
      .concat(months.map(m => '<option value="' + m + '"' + (filters.month === m ? ' selected' : '') + '>' +
        U.esc(U.monthLabel(m)) + '</option>'))
      .join('');

    const cats = F.store.listCategories();
    const exp = cats.filter(c => c.type === 'expense');
    const inc = cats.filter(c => c.type === 'income');
    const opt = c => '<option value="' + c.id + '"' + (filters.categoryId === c.id ? ' selected' : '') + '>' + U.esc(c.name) + '</option>';
    const catOpts = '<option value="all">All categories</option>' +
      '<option value="_none"' + (filters.categoryId === '_none' ? ' selected' : '') + '>Uncategorised</option>' +
      (exp.length ? '<optgroup label="Expenses">' + exp.map(opt).join('') + '</optgroup>' : '') +
      (inc.length ? '<optgroup label="Income">' + inc.map(opt).join('') + '</optgroup>' : '');

    const segBtn = v => '<button type="button" class="seg-btn" data-tf="' + v + '" aria-pressed="' +
      (filters.type === v) + '">' + (v === 'all' ? 'All' : v === 'expense' ? 'Expenses' : 'Income') + '</button>';

    const sortOpts = [
      ['date-desc', 'Newest first'], ['date-asc', 'Oldest first'],
      ['amount-desc', 'Amount: high to low'], ['amount-asc', 'Amount: low to high']
    ].map(s => '<option value="' + s[0] + '"' + (filters.sort === s[0] ? ' selected' : '') + '>' + s[1] + '</option>').join('');

    return '<div class="toolbar card">' +
      '<div class="search-wrap">' +
        '<span class="search-icon">' + F.ui.icon('search') + '</span>' +
        '<input id="f-search" class="input" type="search" placeholder="Search notes or categories" aria-label="Search transactions" value="' + U.esc(filters.search) + '">' +
        '<button type="button" id="f-search-clear" class="icon-btn" aria-label="Clear search" hidden>' + F.ui.icon('x') + '</button>' +
      '</div>' +
      '<select id="f-month" class="select" aria-label="Filter by month">' + monthOpts + '</select>' +
      '<div class="seg" role="group" aria-label="Filter by type">' + segBtn('all') + segBtn('expense') + segBtn('income') + '</div>' +
      '<select id="f-cat" class="select" aria-label="Filter by category">' + catOpts + '</select>' +
      '<select id="f-sort" class="select" aria-label="Sort order">' + sortOpts + '</select>' +
      '</div>';
  }

  /* ---------- list ---------- */

  function updateList(el) {
    const wrap = el.querySelector('#tx-listwrap');
    const res = F.store.queryTransactions(filters);
    wrap.innerHTML = summaryHtml(res) + listHtml(res);
    bindList(wrap);
  }

  function summaryHtml(res) {
    if (!F.store.getState().transactions.length) return '';
    const code = F.store.currency();
    return '<div class="list-meta">' + U.plural(res.stats.count, 'transaction', 'transactions') +
      ' &middot; <span class="pos">in ' + U.esc(U.formatMoney(res.stats.income, code)) + '</span>' +
      ' &middot; <span class="neg">out ' + U.esc(U.formatMoney(res.stats.expense, code)) + '</span></div>';
  }

  function listHtml(res) {
    if (!F.store.getState().transactions.length) {
      return '<div class="card"><div class="empty">' + F.ui.icon('list') +
        '<h2>No transactions yet</h2><p>Add your first income or expense to get started.</p>' +
        '<button type="button" id="tx-empty-add" class="btn btn-primary">' + F.ui.icon('plus') + 'Add transaction</button>' +
        '<p class="hint">Tip: "Explore with sample data" on the Dashboard fills three months of entries.</p></div></div>';
    }
    if (!res.items.length) {
      return '<div class="card"><div class="empty">' + F.ui.icon('search') +
        '<h2>No matches</h2><p>Nothing matches the current search and filters.</p>' +
        '<button type="button" id="tx-clear-filters" class="btn btn-ghost btn-sm">Clear all filters</button></div></div>';
    }

    const items = res.items.slice(0, limit);
    const grouped = filters.sort === 'date-desc' || filters.sort === 'date-asc';
    const rows = [];

    if (grouped) {
      let lastDate = null;
      items.forEach(t => {
        if (t.date !== lastDate) {
          lastDate = t.date;
          const dayCount = res.items.filter(x => x.date === t.date).length;
          rows.push('<li class="tx-day-head">' + U.esc(U.dayLabel(t.date)) +
            (dayCount > 1 ? '<span class="muted"> &middot; ' + dayCount + '</span>' : '') + '</li>');
        }
        rows.push(F.views.util.txRow(t, { actions: true, showDate: false }));
      });
    } else {
      items.forEach(t => rows.push(F.views.util.txRow(t, { actions: true, showDate: true })));
    }

    const remaining = res.items.length - items.length;
    const more = remaining > 0
      ? '<button type="button" id="tx-more" class="btn btn-ghost btn-block">Show ' + Math.min(PAGE, remaining) +
        ' more &middot; ' + remaining + ' remaining</button>'
      : '';

    return '<div class="card"><ul class="tx-list">' + rows.join('') + '</ul>' + more + '</div>';
  }

  /* ---------- bindings ---------- */

  function bindToolbar(el) {
    el.querySelector('#tx-add').addEventListener('click', () => openForm(null));

    const search = el.querySelector('#f-search');
    const clearBtn = el.querySelector('#f-search-clear');
    search.value = filters.search;
    clearBtn.hidden = !filters.search;

    search.addEventListener('input', U.debounce(() => {
      filters.search = search.value;
      clearBtn.hidden = !filters.search;
      limit = PAGE;
      updateList(el);
    }, 220));
    search.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        search.value = '';
        filters.search = '';
        clearBtn.hidden = true;
        limit = PAGE;
        updateList(el);
      }
    });
    clearBtn.addEventListener('click', () => {
      search.value = '';
      filters.search = '';
      clearBtn.hidden = true;
      limit = PAGE;
      updateList(el);
      search.focus();
    });

    el.querySelector('#f-month').addEventListener('change', e => {
      filters.month = e.target.value;
      limit = PAGE;
      updateList(el);
    });
    el.querySelector('#f-cat').addEventListener('change', e => {
      filters.categoryId = e.target.value;
      limit = PAGE;
      updateList(el);
    });
    el.querySelector('#f-sort').addEventListener('change', e => {
      filters.sort = e.target.value;
      limit = PAGE;
      updateList(el);
    });
    el.querySelectorAll('[data-tf]').forEach(btn => {
      btn.addEventListener('click', () => {
        filters.type = btn.getAttribute('data-tf');
        el.querySelectorAll('[data-tf]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        limit = PAGE;
        updateList(el);
      });
    });
  }

  function bindList(wrap) {
    const emptyAdd = wrap.querySelector('#tx-empty-add');
    if (emptyAdd) emptyAdd.addEventListener('click', () => openForm(null));

    const clearFilters = wrap.querySelector('#tx-clear-filters');
    if (clearFilters) clearFilters.addEventListener('click', () => {
      filters = defaultFilters();
      limit = PAGE;
      render(document.getElementById('view'));
    });

    const more = wrap.querySelector('#tx-more');
    if (more) more.addEventListener('click', () => { limit += PAGE; updateList(document.getElementById('view')); });

    wrap.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tx = F.store.getTransaction(btn.getAttribute('data-edit'));
        if (tx) openForm(tx);
      });
    });

    wrap.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tx = F.store.getTransaction(btn.getAttribute('data-delete'));
        if (!tx) return;
        const ok = await F.ui.confirmDialog({
          title: 'Delete transaction?',
          message: 'This permanently removes ' + describeTx(tx) + '.',
          confirmLabel: 'Delete',
          danger: true
        });
        if (!ok) return;
        const res = F.store.deleteTransaction(tx.id);
        if (res.ok) {
          F.ui.toast('Transaction deleted.', {
            type: 'success',
            action: {
              label: 'Undo',
              fn: () => {
                const r = F.store.restoreLastDeleted();
                if (r.ok) F.ui.toast('Transaction restored.', { type: 'success' });
              }
            }
          });
        }
        updateList(document.getElementById('view'));
      });
    });
  }

  function describeTx(tx) {
    const code = F.store.currency();
    return (tx.type === 'income' ? 'income of ' : 'an expense of ') +
      U.formatMoney(tx.amount, code) + ' from ' + U.formatDate(tx.date);
  }

  /* ---------- add / edit form (shared with other views via F.app) ---------- */

  function openForm(existing, defaultType) {
    const isEdit = !!existing;
    const code = F.store.currency();
    const cur = U.currencyByCode(code);
    let type = existing ? existing.type : (defaultType || 'expense');
    let selectedCat = existing ? (existing.categoryId || '') : '';

    F.ui.openModal({
      title: isEdit ? 'Edit transaction' : 'Add transaction',
      build(body, close) {
        body.innerHTML =
          '<form id="tx-form" novalidate>' +
            '<div class="field">' +
              '<span class="field-label" id="tx-type-label">Type</span>' +
              '<div class="seg seg-full" role="group" aria-labelledby="tx-type-label">' +
                '<button type="button" class="seg-btn" data-type="expense" aria-pressed="' + (type === 'expense') + '">Expense</button>' +
                '<button type="button" class="seg-btn" data-type="income" aria-pressed="' + (type === 'income') + '">Income</button>' +
              '</div>' +
            '</div>' +
            '<div class="field">' +
              '<label for="tx-amount">Amount (' + U.esc(cur.symbol) + ')</label>' +
              '<div class="amount-wrap"><span class="amount-symbol" aria-hidden="true">' + U.esc(cur.symbol) + '</span>' +
              '<input id="tx-amount" class="input" inputmode="decimal" autocomplete="off" data-autofocus placeholder="' +
              (cur.decimals ? '0.00' : '0') + '" value="' +
              (existing ? U.esc(U.minorToInput(existing.amount, code)) : '') + '"></div>' +
              '<p class="error-text" id="err-amount" hidden></p>' +
            '</div>' +
            '<div class="field-row">' +
              '<div class="field">' +
                '<label for="tx-date">Date</label>' +
                '<input id="tx-date" class="input" type="date" value="' + (existing ? existing.date : U.todayISO()) + '">' +
                '<p class="error-text" id="err-date" hidden></p>' +
              '</div>' +
              '<div class="field">' +
                '<label for="tx-cat">Category</label>' +
                '<select id="tx-cat" class="select"></select>' +
                '<p class="error-text" id="err-cat" hidden></p>' +
              '</div>' +
            '</div>' +
            '<div class="field">' +
              '<label for="tx-note">Note <span class="muted">(optional)</span></label>' +
              '<input id="tx-note" class="input" maxlength="300" placeholder="e.g. Weekly groceries" value="' +
              (existing ? U.esc(existing.note || '') : '') + '">' +
              '<p class="error-text" id="err-note" hidden></p>' +
            '</div>' +
            '<div class="modal-actions">' +
              '<button type="button" class="btn btn-ghost" data-cancel>Cancel</button>' +
              '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Save changes' : 'Add transaction') + '</button>' +
            '</div>' +
          '</form>';

        const form = body.querySelector('#tx-form');
        const seg = body.querySelector('.seg');
        const catSel = body.querySelector('#tx-cat');
        const catHint = document.createElement('p');
        catHint.className = 'hint';
        catHint.hidden = true;
        catSel.insertAdjacentElement('afterend', catHint);

        function fillCats() {
          const cats = F.store.listCategories(type);
          catSel.innerHTML = '<option value="">Uncategorised</option>' +
            cats.map(c => '<option value="' + c.id + '">' + U.esc(c.name) + '</option>').join('');
          if (selectedCat && cats.some(c => c.id === selectedCat)) {
            catSel.value = selectedCat;
          } else {
            selectedCat = '';
            catSel.value = '';
          }
          if (!F.store.listCategories().length) {
            catHint.textContent = 'No categories yet — this entry will be saved as Uncategorised. You can add categories in Settings.';
            catHint.hidden = false;
          } else if (!cats.length) {
            catHint.textContent = 'No ' + type + ' categories yet — pick one in Settings or leave it Uncategorised.';
            catHint.hidden = false;
          } else {
            catHint.hidden = true;
          }
        }
        fillCats();

        seg.querySelectorAll('.seg-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            type = btn.getAttribute('data-type');
            seg.querySelectorAll('.seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
            if (selectedCat) {
              const c = F.store.categoryById(selectedCat);
              if (!c || c.type !== type) selectedCat = '';
            }
            fillCats();
          });
        });
        catSel.addEventListener('change', () => { selectedCat = catSel.value; });
        body.querySelector('[data-cancel]').addEventListener('click', close);

        form.addEventListener('submit', e => {
          e.preventDefault();
          clearErrors(form);

          const amountRes = U.parseAmountInput(body.querySelector('#tx-amount').value, cur.decimals);
          const fields = {
            type: type,
            amount: amountRes.ok ? amountRes.minor : 0,
            date: body.querySelector('#tx-date').value,
            categoryId: selectedCat || null,
            note: body.querySelector('#tx-note').value
          };

          const result = isEdit ? F.store.updateTransaction(existing.id, fields) : F.store.addTransaction(fields);
          if (!result.ok) {
            const errs = result.errors || {};
            if (!amountRes.ok) errs.amount = amountRes.error; // the parse error is the precise one
            showErr(form, 'amount', errs.amount);
            showErr(form, 'date', errs.date);
            showErr(form, 'cat', errs.category);
            showErr(form, 'note', errs.note);
            const firstInvalid = form.querySelector('[aria-invalid="true"]');
            if (firstInvalid) firstInvalid.focus();
            return;
          }
          close();
          F.ui.toast(isEdit ? 'Transaction updated.' : 'Transaction added.', { type: 'success' });
          // The store emits a change, which re-renders the current view.
        });
      }
    });
  }

  function showErr(form, key, msg) {
    const el = form.querySelector('#err-' + key);
    if (!el) return;
    const input = form.querySelector('#tx-' + key);
    if (msg) {
      el.textContent = msg;
      el.hidden = false;
      if (input) input.setAttribute('aria-invalid', 'true');
    } else {
      el.hidden = true;
      if (input) input.removeAttribute('aria-invalid');
    }
  }

  function clearErrors(form) {
    ['amount', 'date', 'cat', 'note'].forEach(k => showErr(form, k, null));
  }

  return { title: title, render: render, openForm: openForm };
})();
