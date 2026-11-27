/* Fiscus — Budgets view: monthly limit per expense category, tracked against
   actual spending. Row edits save instantly without stealing focus; a summary
   line and progress bars update in place. */
window.F = window.F || {};
F.views = F.views || {};

F.views.budgets = (function () {
  'use strict';

  const U = F.util;

  function title() { return 'Budgets'; }

  function render(el) {
    const month = F.app.getMonth();
    const code = F.store.currency();
    const cats = F.store.listCategories('expense');
    const rows = F.store.budgetRows(month);

    el.innerHTML = '';
    el.appendChild(F.app.monthBar());
    el.insertAdjacentHTML('beforeend',
      '<div class="view-head"><div><h1>Budgets</h1>' +
      '<p class="view-sub">Set a monthly limit per expense category and track it against actual spending.</p></div></div>');

    if (!cats.length) {
      el.insertAdjacentHTML('beforeend',
        '<div class="card"><div class="empty">' + F.ui.icon('target') +
        '<h2>No expense categories yet</h2><p>Budgets are set per expense category. Create a few first.</p>' +
        '<a class="btn btn-primary" href="#/settings">Create categories</a></div></div>');
      return;
    }

    const budgeted = rows.filter(r => r.limit != null);
    const totLimit = budgeted.reduce((a, r) => a + r.limit, 0);
    const totSpent = budgeted.reduce((a, r) => a + r.spent, 0);
    const prevMonth = U.addMonths(month, -1);
    const prevHas = F.store.monthsWithBudgets().indexOf(prevMonth) !== -1;

    el.insertAdjacentHTML('beforeend',
      '<section class="card">' +
        '<div class="budget-summary" id="budget-summary">' + summaryHtml(totLimit, totSpent, code) + '</div>' +
        (budgeted.length === 0
          ? '<div class="hint-row">' + F.ui.icon('info') +
            '<span>No limits set for ' + U.esc(U.monthLabel(month)) + ' — type an amount next to a category below.</span></div>'
          : '') +
        '<ul class="budget-list" id="budget-list">' +
          rows.map(r => rowHtml(r, code)).join('') +
        '</ul>' +
        '<div class="card-foot">' +
          '<button type="button" id="budget-copy" class="btn btn-ghost btn-sm"' + (prevHas ? '' : ' disabled') + '>' +
            (prevHas ? 'Copy from ' + U.esc(U.monthLabelShort(prevMonth)) : 'Previous month has no budgets to copy') +
          '</button>' +
          '<button type="button" id="budget-clear" class="btn btn-ghost btn-sm"' + (budgeted.length ? '' : ' disabled') + '>Clear month</button>' +
        '</div>' +
      '</section>');

    bind(el, month);
  }

  function summaryHtml(limit, spent, code) {
    const remaining = limit - spent;
    const cls = remaining < 0 ? 'neg' : 'pos';
    return '<div class="budget-summ">' +
      '<div><span class="stat-label">Budgeted</span><span class="stat-sub">' + U.esc(U.formatMoney(limit, code)) + '</span></div>' +
      '<div><span class="stat-label">Spent</span><span class="stat-sub">' + U.esc(U.formatMoney(spent, code)) + '</span></div>' +
      '<div><span class="stat-label">Remaining</span><span class="stat-sub ' + cls + '">' +
      (remaining >= 0 ? '' : '\u2212') + U.esc(U.formatMoney(Math.abs(remaining), code)) + '</span></div>' +
      '</div>';
  }

  function rowHtml(r, code) {
    const pct = r.limit ? Math.round((r.spent / r.limit) * 100) : null;
    const status = r.over ? 'over' : (pct != null && pct >= 75 ? 'warn' : 'ok');
    let statusText;
    if (r.limit == null) {
      statusText = r.spent > 0 ? U.formatMoney(r.spent, code) + ' spent · no limit' : 'No limit set';
    } else if (r.over) {
      statusText = 'Over by ' + U.formatMoney(r.spent - r.limit, code);
    } else {
      statusText = U.formatMoney(r.spent, code) + ' of ' + U.formatMoney(r.limit, code) + ' · ' + pct + '%';
    }
    return '<li class="budget-row" data-cat="' + r.category.id + '">' +
      '<div class="budget-info">' +
        '<span class="chip"><span class="dot" style="background:' + r.category.color + '"></span>' + U.esc(r.category.name) + '</span>' +
        '<span class="budget-status' + (r.over ? ' neg' : '') + '">' + U.esc(statusText) + '</span>' +
      '</div>' +
      '<div class="budget-edit">' +
        '<label class="sr-only" for="bl-' + r.category.id + '">Monthly limit for ' + U.esc(r.category.name) + '</label>' +
        '<input id="bl-' + r.category.id + '" class="input input-money" data-budget-input="' + r.category.id +
        '" inputmode="decimal" placeholder="No limit" value="' + (r.limit != null ? U.esc(U.minorToInput(r.limit, code)) : '') + '">' +
      '</div>' +
      '<div class="progress budget-progress"><div class="progress-fill ' + status + '" style="width:' +
      (pct != null ? Math.min(pct, 100) : 0) + '%"></div></div>' +
      '</li>';
  }

  function bind(el, month) {
    const code = F.store.currency();
    const cur = U.currencyByCode(code);

    el.querySelectorAll('[data-budget-input]').forEach(input => {
      input.addEventListener('change', () => {
        const catId = input.getAttribute('data-budget-input');
        const raw = input.value.trim();
        if (!raw) {
          F.store.setBudget(month, catId, null, { silent: true });
          refreshRow(el, month, catId, input);
          refreshSummary(el, month);
          return;
        }
        const res = U.parseAmountInput(raw, cur.decimals);
        if (!res.ok) {
          F.ui.toast(res.error, { type: 'error' });
          input.select();
          return;
        }
        F.store.setBudget(month, catId, res.minor, { silent: true });
        input.value = U.minorToInput(res.minor, code);
        refreshRow(el, month, catId, input);
        refreshSummary(el, month);
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') input.blur(); // commit on Enter
      });
    });

    const copy = el.querySelector('#budget-copy');
    if (copy) copy.addEventListener('click', () => {
      const prev = U.addMonths(month, -1);
      const r = F.store.copyBudgets(prev, month);
      if (r.ok) {
        F.ui.toast('Copied ' + U.plural(r.copied, 'budget', 'budgets') + ' from ' + U.monthLabelShort(prev) + '.', { type: 'success' });
      } else {
        F.ui.toast(r.error, { type: 'error' });
      }
    });

    const clearBtn = el.querySelector('#budget-clear');
    if (clearBtn) clearBtn.addEventListener('click', async () => {
      const ok = await F.ui.confirmDialog({
        title: 'Clear all budgets?',
        message: 'Removes every limit for ' + U.monthLabel(month) + '. Spending history is not touched.',
        confirmLabel: 'Clear budgets',
        danger: true
      });
      if (!ok) return;
      F.store.clearBudgets(month);
      F.ui.toast('Budgets cleared for ' + U.monthLabel(month) + '.', { type: 'success' });
    });
  }

  // Targeted in-place refresh for one row (no full re-render → no focus loss).
  function refreshRow(el, month, catId, input) {
    const row = el.querySelector('[data-cat="' + catId + '"]');
    const r = F.store.budgetRows(month).find(x => x.category.id === catId);
    if (!row || !r) return;
    const code = F.store.currency();
    const pct = r.limit ? Math.round((r.spent / r.limit) * 100) : null;
    const status = r.over ? 'over' : (pct != null && pct >= 75 ? 'warn' : 'ok');

    const statusEl = row.querySelector('.budget-status');
    let statusText;
    if (r.limit == null) {
      statusText = r.spent > 0 ? U.formatMoney(r.spent, code) + ' spent · no limit' : 'No limit set';
    } else if (r.over) {
      statusText = 'Over by ' + U.formatMoney(r.spent - r.limit, code);
    } else {
      statusText = U.formatMoney(r.spent, code) + ' of ' + U.formatMoney(r.limit, code) + ' · ' + pct + '%';
    }
    statusEl.textContent = statusText;
    statusEl.classList.toggle('neg', !!r.over);

    const fill = row.querySelector('.progress-fill');
    fill.className = 'progress-fill ' + status;
    fill.style.width = (pct != null ? Math.min(pct, 100) : 0) + '%';

    if (input) input.value = r.limit != null ? U.minorToInput(r.limit, code) : '';
  }

  function refreshSummary(el, month) {
    const rows = F.store.budgetRows(month).filter(r => r.limit != null);
    const totLimit = rows.reduce((a, r) => a + r.limit, 0);
    const totSpent = rows.reduce((a, r) => a + r.spent, 0);
    const box = el.querySelector('#budget-summary');
    if (box) box.innerHTML = summaryHtml(totLimit, totSpent, F.store.currency());
  }

  return { title: title, render: render };
})();
