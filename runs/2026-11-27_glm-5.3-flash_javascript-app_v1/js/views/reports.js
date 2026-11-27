/* Fiscus — Reports view: six-month income/expense trend, a category donut for
   the selected month, and derived insights. Every chart ships with a
   screen-reader summary; every metric guards against empty data. */
window.F = window.F || {};
F.views = F.views || {};

F.views.reports = (function () {
  'use strict';

  const U = F.util;

  function title() { return 'Reports'; }

  function render(el) {
    const month = F.app.getMonth();
    const code = F.store.currency();

    el.innerHTML = '';
    el.appendChild(F.app.monthBar());

    if (!F.store.getState().transactions.length) {
      el.insertAdjacentHTML('beforeend',
        '<div class="card"><div class="empty">' + F.ui.icon('chart') +
        '<h2>Nothing to report yet</h2><p>Reports appear once you have recorded some transactions.</p>' +
        '<a class="btn btn-primary" href="#/dashboard">Go to Dashboard</a></div></div>');
      return;
    }

    el.insertAdjacentHTML('beforeend',
      '<div class="view-head"><div><h1>Reports</h1>' +
      '<p class="view-sub">Trends, breakdowns and insights for ' + U.esc(U.monthLabel(month)) + '.</p></div></div>' +
      '<div class="stack">' + trendHtml(month) + breakdownHtml(month, code) + insightCards(month, code) + '</div>');
  }

  /* ---------- six-month trend ---------- */

  function trendHtml(month) {
    const code = F.store.currency();
    const months = F.store.lastMonths(6, month);
    const groups = months.map(m => {
      const s = F.store.monthSummary(m);
      return { label: U.monthLabelShort(m), income: s.income, expense: s.expense };
    });
    const chart = F.charts.bars({
      groups: groups,
      formatValue: v => U.formatCompact(Math.round(v), code),
      ariaLabel: 'Income and expenses for the last six months'
    });
    const totalIn = groups.reduce((a, g) => a + g.income, 0);
    const totalOut = groups.reduce((a, g) => a + g.expense, 0);
    const sr = 'Bar chart, six months ending ' + U.monthLabel(month) + '. Total income ' +
      U.formatMoney(totalIn, code) + ', total expenses ' + U.formatMoney(totalOut, code) + '. ' +
      groups.map(g => g.label + ': income ' + U.formatMoney(g.income, code) + ', expenses ' + U.formatMoney(g.expense, code)).join('; ') + '.';

    return '<section class="card"><div class="card-head"><h2>Six-month trend</h2>' +
      '<div class="chart-key">' +
      '<span class="key-item"><span class="dot" style="background:var(--income)"></span>Income</span>' +
      '<span class="key-item"><span class="dot" style="background:var(--expense)"></span>Expenses</span>' +
      '</div></div>' + chart + '<p class="sr-only">' + U.esc(sr) + '</p></section>';
  }

  /* ---------- category breakdown for the selected month ---------- */

  function breakdownHtml(month, code) {
    const totals = F.store.categoryTotals(month, 'expense');
    let inner;
    if (!totals.grand) {
      inner = '<div class="empty empty-sm">' + F.ui.icon('wallet') +
        '<p>No expenses recorded in ' + U.esc(U.monthLabel(month)) + '.</p></div>';
    } else {
      const top = totals.items.slice(0, 8);
      const rest = totals.items.slice(8);
      const data = top.map(i => ({ label: i.name, value: i.total, color: i.color }));
      if (rest.length) {
        data.push({ label: 'Other', value: rest.reduce((a, r) => a + r.total, 0), color: '#c9c2b2' });
      }
      const donut = F.charts.donut({
        data: data,
        size: 190,
        thickness: 26,
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
      '<span class="muted">' + U.esc(U.monthLabel(month)) + '</span></div>' + inner + '</section>';
  }

  /* ---------- insights ---------- */

  function insightCards(month, code) {
    const s = F.store.monthSummary(month);
    const prevM = U.addMonths(month, -1);
    const prev = F.store.monthSummary(prevM);

    let changeText;
    if (prev.expense === 0) {
      changeText = s.expense > 0
        ? 'No spending was recorded in ' + U.monthLabelShort(prevM) + '.'
        : 'No spending in either month.';
    } else {
      const diff = (s.expense - prev.expense) / prev.expense;
      const pct = Math.round(Math.abs(diff) * 100);
      if (pct === 0) changeText = 'The same as in ' + U.monthLabelShort(prevM) + '.';
      else {
        changeText = (diff > 0 ? 'Up ' : 'Down ') + pct + '% from ' +
          U.formatMoney(prev.expense, code) + ' in ' + U.monthLabelShort(prevM) + '.';
      }
    }

    const big = F.store.biggestExpense(month);
    const bigText = big
      ? F.views.util.catName(big) + ' · ' + U.formatMoney(big.amount, code) + (big.note ? ' — ' + big.note : '')
      : 'No expenses this month.';

    const days = month === U.currentMonth() ? +U.todayISO().slice(8, 10) : U.daysInMonth(month);
    const avg = s.expense && days ? Math.round(s.expense / days) : 0;
    const avgText = avg
      ? U.formatMoney(avg, code) + ' per day across ' + U.plural(days, 'day', 'days')
      : 'No expenses yet.';

    const totals = F.store.categoryTotals(month, 'expense');
    const topText = totals.grand
      ? totals.items[0].name + ' — ' + U.formatMoney(totals.items[0].total, code) + ' (' + totals.items[0].pct + '% of spending)'
      : '—';

    return '<div class="insight-grid">' +
      insightCard('chart', 'Compared with ' + U.monthLabelShort(prevM), changeText) +
      insightCard('wallet', 'Biggest expense', bigText) +
      insightCard('target', 'Daily spend average', avgText) +
      insightCard('list', 'Top spending category', topText) +
      '</div>';
  }

  function insightCard(iconName, label, text) {
    return '<div class="card insight">' + F.ui.icon(iconName, 'insight-icon') +
      '<div><div class="stat-label">' + U.esc(label) + '</div>' +
      '<div class="insight-text">' + U.esc(text) + '</div></div></div>';
  }

  return { title: title, render: render };
})();
