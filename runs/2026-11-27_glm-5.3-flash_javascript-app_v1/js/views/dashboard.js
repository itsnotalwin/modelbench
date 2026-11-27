/* Fiscus — Dashboard view: month summary, quick actions, budget snapshot,
   recent activity and a category breakdown donut. Renders an onboarding
   panel when the ledger has no transactions at all. */
window.F = window.F || {};
F.views = F.views || {};

F.views.dashboard = (function () {
  'use strict';

  const U = F.util;

  function title() { return 'Dashboard'; }

  function render(el) {
    const anyTx = F.store.getState().transactions.length > 0;
    if (!anyTx) {
      renderOnboarding(el);
      return;
    }
    const month = F.app.getMonth();
    const code = F.store.currency();
    const summary = F.store.monthSummary(month);

    el.innerHTML = '';
    el.appendChild(F.app.monthBar());
    el.insertAdjacentHTML('beforeend',
      '<div class="view-head"><div><h1>Dashboard</h1>' +
      '<p class="view-sub">Your money at a glance for ' + U.esc(U.monthLabel(month)) + '.</p></div></div>');

    const grid = document.createElement('div');
    grid.className = 'stack';
    grid.innerHTML =
      statsHtml(summary, code) +
      '<div class="quick-actions">' +
        '<button type="button" id="dash-add" class="btn btn-primary">' + F.ui.icon('plus') + 'Add transaction</button>' +
        '<a class="btn btn-ghost" href="#/transactions">' + F.ui.icon('list') + 'All transactions</a>' +
        '<a class="btn btn-ghost" href="#/reports">' + F.ui.icon('chart') + 'Reports</a>' +
      '</div>' +
      budgetsHtml(month, code) +
      recentHtml() +
      breakdownHtml(month, code);
    el.appendChild(grid);

    el.querySelector('#dash-add').addEventListener('click', () => F.app.openTransactionForm());
    const emptyAdd = el.querySelector('#dash-add2');
    if (emptyAdd) emptyAdd.addEventListener('click', () => F.app.openTransactionForm(null, 'expense'));
  }

  /* ---------- stat cards ---------- */

  function statCard(label, value, cls) {
    return '<div class="card stat"><div class="stat-label">' + U.esc(label) + '</div>' +
      '<div class="stat-value ' + (cls || '') + '">' + U.esc(value) + '</div></div>';
  }

  function statsHtml(s, code) {
    const netCls = s.net > 0 ? 'pos' : s.net < 0 ? 'neg' : '';
    const net = (s.net >= 0 ? '+' : '\u2212') + U.formatMoney(s.net, code);
    return '<div class="stat-grid">' +
      statCard('Income', U.formatMoney(s.income, code), 'pos') +
      statCard('Expenses', U.formatMoney(s.expense, code), 'neg') +
      statCard('Net', net, netCls) +
      statCard('Transactions', String(s.count), '') +
      '</div>';
  }

  /* ---------- budgets snapshot ---------- */

  function budgetsHtml(month, code) {
    const rows = F.store.budgetRows(month).filter(r => r.limit != null).slice(0, 4);
    let inner;
    if (!rows.length) {
      inner = '<div class="empty empty-sm">' + F.ui.icon('target') +
        '<p>No budgets for ' + U.esc(U.monthLabel(month)) + ' yet.</p>' +
        '<a class="btn btn-ghost btn-sm" href="#/budgets">Set up budgets</a></div>';
    } else {
      inner = '<div class="budget-mini">' +
        rows.map(r => miniBudget(r, code)).join('') +
        '</div><div class="card-foot"><a href="#/budgets">Manage budgets &rarr;</a></div>';
    }
    return '<section class="card"><div class="card-head"><h2>Budgets</h2>' +
      '<span class="muted">' + U.esc(U.monthLabel(month)) + '</span></div>' + inner + '</section>';
  }

  function miniBudget(r, code) {
    const pct = r.limit ? Math.round((r.spent / r.limit) * 100) : 0;
    const status = r.over ? 'over' : pct >= 75 ? 'warn' : 'ok';
    return '<div class="budget-mini-row">' +
      '<div class="budget-mini-top"><span class="chip"><span class="dot" style="background:' + r.category.color + '"></span>' +
      U.esc(r.category.name) + '</span><span class="muted">' + U.esc(U.formatMoney(r.spent, code)) +
      ' of ' + U.esc(U.formatMoney(r.limit, code)) + '</span></div>' +
      '<div class="progress"><div class="progress-fill ' + status + '" style="width:' + Math.min(pct, 100) + '%"></div></div>' +
      '</div>';
  }

  /* ---------- recent activity ---------- */

  function recentHtml() {
    const items = F.store.recentTransactions(6);
    if (!items.length) return '';
    return '<section class="card"><div class="card-head"><h2>Recent activity</h2>' +
      '<a href="#/transactions">View all &rarr;</a></div>' +
      '<ul class="tx-list">' +
      items.map(t => F.views.util.txRow(t, { actions: false, showDate: true })).join('') +
      '</ul></section>';
  }

  /* ---------- category breakdown donut ---------- */

  function breakdownHtml(month, code) {
    const totals = F.store.categoryTotals(month, 'expense');
    let inner;
    if (!totals.grand) {
      inner = '<div class="empty empty-sm">' + F.ui.icon('wallet') +
        '<p>No expenses recorded in ' + U.esc(U.monthLabel(month)) + '.</p>' +
        '<button type="button" id="dash-add2" class="btn btn-ghost btn-sm">Add an expense</button></div>';
    } else {
      const top = totals.items.slice(0, 6);
      const rest = totals.items.slice(6);
      const data = top.map(i => ({ label: i.name, value: i.total, color: i.color }));
      if (rest.length) {
        data.push({ label: 'Other', value: rest.reduce((a, r) => a + r.total, 0), color: '#c9c2b2' });
      }
      const donut = F.charts.donut({
        data: data,
        size: 180,
        thickness: 24,
        ariaLabel: 'Expenses by category for ' + U.monthLabel(month)
      });
      const legend = data.map(d =>
        '<div class="legend-row"><span class="dot" style="background:' + d.color + '"></span>' +
        '<span class="legend-name">' + U.esc(d.label) + '</span>' +
        '<span class="legend-val">' + U.esc(U.formatMoney(d.value, code)) + '</span>' +
        '<span class="legend-pct">' + Math.round((d.value / totals.grand) * 100) + '%</span></div>'
      ).join('');
      const sr = 'Spending breakdown for ' + U.monthLabel(month) + ': total ' + U.formatMoney(totals.grand, code) + '. ' +
        data.map(d => d.label + ' ' + U.formatMoney(d.value, code)).join(', ') + '.';
      inner = '<div class="breakdown-grid"><div class="donut-wrap">' +
        '<div class="donut-center"><div class="donut-total">' + U.esc(U.formatMoney(totals.grand, code)) + '</div><div class="muted">spent</div></div>' +
        donut.svg + '</div><div class="legend">' + legend + '</div></div>' +
        '<p class="sr-only">' + U.esc(sr) + '</p>';
    }
    return '<section class="card"><div class="card-head"><h2>Where money went</h2>' +
      '<a href="#/reports">Full reports &rarr;</a></div>' + inner + '</section>';
  }

  /* ---------- onboarding ---------- */

  function renderOnboarding(el) {
    el.innerHTML =
      '<section class="card onboarding">' +
        '<div class="onb-mark">' + F.ui.icon('wallet', 'onb-icon') + '</div>' +
        '<h1>Welcome to Fiscus</h1>' +
        '<p class="onb-lede">A private, local-first ledger for your everyday money. Record expenses and income, ' +
        'set monthly budgets, and see exactly where everything goes — all of it stays in this browser.</p>' +
        '<div class="onb-actions">' +
          '<button type="button" id="onb-add" class="btn btn-primary">' + F.ui.icon('plus') + 'Add your first transaction</button>' +
          '<button type="button" id="onb-sample" class="btn btn-ghost">Explore with sample data</button>' +
        '</div>' +
        '<p class="hint">Sample data fills three months of realistic entries and budgets so every view has something ' +
        'to show. You can erase it anytime from Settings.</p>' +
      '</section>';

    el.querySelector('#onb-add').addEventListener('click', () => F.app.openTransactionForm());
    el.querySelector('#onb-sample').addEventListener('click', async () => {
      const ok = await F.ui.confirmDialog({
        title: 'Load sample data?',
        message: 'This replaces your current data with three months of sample transactions and budgets.',
        confirmLabel: 'Load sample data'
      });
      if (!ok) return;
      F.store.loadSampleData();
      F.app.setMonth(U.currentMonth());
      F.ui.toast('Sample data loaded — explore the views from the menu.', { type: 'success' });
      F.app.rerender();
    });
  }

  return { title: title, render: render };
})();
