/* Fiscus — shared view helpers: category chips, amount cells and the
   transaction row used by both the dashboard and the transactions list. */
window.F = window.F || {};
F.views = F.views || {};

F.views.util = (function () {
  'use strict';

  const U = F.util;

  function catOf(tx) {
    if (tx.categoryId) {
      const c = F.store.categoryById(tx.categoryId);
      if (c) return c;
    }
    return null;
  }

  function catName(tx) {
    const c = catOf(tx);
    return c ? c.name : 'Uncategorised';
  }

  function catColor(tx) {
    const c = catOf(tx);
    return c ? c.color : '#9aa39b';
  }

  function chip(tx) {
    return '<span class="chip"><span class="dot" style="background:' + catColor(tx) + '"></span>' +
      U.esc(catName(tx)) + '</span>';
  }

  function amountCell(tx) {
    const code = F.store.currency();
    const cls = tx.type === 'income' ? 'amt-in' : 'amt-out';
    const sign = tx.type === 'income' ? '+' : '\u2212';
    return '<span class="amt ' + cls + '">' + sign + U.esc(U.formatMoney(tx.amount, code)) + '</span>';
  }

  // One list row. opts: { actions: bool, showDate: bool }
  function txRow(tx, opts) {
    const o = opts || {};
    const dateBit = o.showDate ? '<span class="tx-date">' + U.esc(U.dayLabel(tx.date)) + '</span>' : '';
    const actions = o.actions
      ? '<div class="row-actions">' +
        '<button type="button" class="icon-btn" data-edit="' + tx.id + '" aria-label="Edit transaction">' + F.ui.icon('edit') + '</button>' +
        '<button type="button" class="icon-btn" data-delete="' + tx.id + '" aria-label="Delete transaction">' + F.ui.icon('trash') + '</button>' +
        '</div>'
      : '';
    return '<li class="tx-row" data-tx-id="' + tx.id + '">' +
      '<div class="tx-main">' +
        '<div class="tx-top">' + chip(tx) + dateBit + '</div>' +
        '<div class="tx-note">' + (tx.note ? U.esc(tx.note) : '<span class="muted">No description</span>') + '</div>' +
      '</div>' +
      '<div class="tx-side">' + amountCell(tx) + actions + '</div>' +
      '</li>';
  }

  return { catOf, catName, catColor, chip, amountCell, txRow };
})();
