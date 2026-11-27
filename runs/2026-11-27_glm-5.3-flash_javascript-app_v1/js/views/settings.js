/* Fiscus — Settings view: currency preference, category management with
   duplicate guards, JSON backup import/export with preview & validation,
   CSV export, storage status, and a guarded danger zone. */
window.F = window.F || {};
F.views = F.views || {};

F.views.settings = (function () {
  'use strict';

  const U = F.util;
  let pendingImport = null; // parsed & validated payload awaiting the Import click

  function title() { return 'Settings'; }

  function render(el) {
    el.innerHTML =
      '<div class="view-head"><div><h1>Settings</h1>' +
      '<p class="view-sub">Preferences, categories and your data — everything stays on this device.</p></div></div>' +
      '<div class="stack">' +
        currencySection() +
        categoriesSection() +
        dataSection() +
        storageSection() +
        dangerSection() +
        aboutSection() +
      '</div>';
    bind(el);
  }

  /* ---------- currency ---------- */

  function currencySection() {
    const code = F.store.currency();
    const opts = U.CURRENCIES.map(c =>
      '<option value="' + c.code + '"' + (c.code === code ? ' selected' : '') + '>' +
      U.esc(c.label + ' (' + c.symbol + ') — ' + c.code) + '</option>').join('');
    return '<section class="card"><div class="card-head"><h2>Currency</h2></div>' +
      '<div class="field field-narrow"><label for="set-currency">Display currency</label>' +
      '<select id="set-currency" class="select">' + opts + '</select>' +
      '<p class="hint">Changes how amounts are shown and entered. Existing amounts keep their value — nothing is converted.</p></div></section>';
  }

  /* ---------- categories ---------- */

  function swatchGroup(name, checkedHex) {
    return '<div class="swatches">' + U.SEED_COLORS.map(c =>
      '<label class="swatch" title="' + c.name + '">' +
      '<input type="radio" name="' + name + '" value="' + c.hex + '"' + (c.hex === checkedHex ? ' checked' : '') +
      ' aria-label="Color: ' + c.name + '"><span style="background:' + c.hex + '"></span></label>').join('') + '</div>';
  }

  function categoriesSection() {
    const cats = F.store.listCategories();
    const groups = ['expense', 'income'].map(type => {
      const list = cats.filter(c => c.type === type);
      const rows = list.map(c =>
        '<li class="cat-row"><span class="chip"><span class="dot" style="background:' + c.color + '"></span>' +
        U.esc(c.name) + '</span><span class="row-actions">' +
        '<button type="button" class="icon-btn" data-cat-edit="' + c.id + '" aria-label="Edit category ' + U.esc(c.name) + '">' + F.ui.icon('edit') + '</button>' +
        '<button type="button" class="icon-btn" data-cat-delete="' + c.id + '" aria-label="Delete category ' + U.esc(c.name) + '">' + F.ui.icon('trash') + '</button>' +
        '</span></li>').join('');
      return '<div class="cat-group"><h3 class="cat-group-title">' +
        (type === 'expense' ? 'Expense categories' : 'Income categories') +
        ' <span class="muted">(' + list.length + ')</span></h3>' +
        (list.length ? '<ul class="cat-list">' + rows + '</ul>' : '<p class="muted">None yet.</p>') + '</div>';
    }).join('');

    return '<section class="card"><div class="card-head"><h2>Categories</h2></div>' +
      '<form id="cat-form" class="cat-form" novalidate>' +
        '<div class="cat-form-row">' +
          '<div class="field"><label for="cat-name">Name</label>' +
          '<input id="cat-name" class="input" maxlength="32" placeholder="e.g. Coffee runs" autocomplete="off">' +
          '<p class="error-text" id="cat-name-err" hidden></p></div>' +
          '<div class="field"><label for="cat-type">Type</label>' +
          '<select id="cat-type" class="select"><option value="expense">Expense</option><option value="income">Income</option></select></div>' +
        '</div>' +
        '<div class="field"><span class="field-label">Color</span>' + swatchGroup('new-cat-color', U.SEED_COLORS[0].hex) + '</div>' +
        '<button type="submit" class="btn btn-primary btn-sm">' + F.ui.icon('plus') + 'Add category</button>' +
      '</form>' +
      '<hr class="rule">' + groups + '</section>';
  }

  function openCategoryModal(cat) {
    F.ui.openModal({
      title: 'Edit category',
      build(body, close) {
        body.innerHTML =
          '<form id="ed-cat-form" novalidate>' +
            '<p class="hint">' + (cat.type === 'expense' ? 'Expense' : 'Income') +
            ' category — the type cannot change after creation.</p>' +
            '<div class="field"><label for="ed-cat-name">Name</label>' +
            '<input id="ed-cat-name" class="input" maxlength="32" value="' + U.esc(cat.name) + '" data-autofocus autocomplete="off">' +
            '<p class="error-text" id="ed-cat-name-err" hidden></p></div>' +
            '<div class="field"><span class="field-label">Color</span>' + swatchGroup('ed-cat-color', cat.color) + '</div>' +
            '<div class="modal-actions">' +
              '<button type="button" class="btn btn-ghost" data-cancel>Cancel</button>' +
              '<button type="submit" class="btn btn-primary">Save changes</button>' +
            '</div>' +
          '</form>';

        body.querySelector('[data-cancel]').addEventListener('click', close);
        body.querySelector('#ed-cat-form').addEventListener('submit', e => {
          e.preventDefault();
          const nameEl = body.querySelector('#ed-cat-name');
          const errEl = body.querySelector('#ed-cat-name-err');
          const color = body.querySelector('input[name="ed-cat-color"]:checked').value;
          const res = F.store.updateCategory(cat.id, { name: nameEl.value, color: color });
          if (!res.ok) {
            errEl.textContent = (res.errors && res.errors.name) || 'Could not save the category.';
            errEl.hidden = false;
            nameEl.setAttribute('aria-invalid', 'true');
            nameEl.focus();
            return;
          }
          close();
          F.ui.toast('Category updated.', { type: 'success' });
        });
      }
    });
  }

  /* ---------- data portability ---------- */

  function download(filename, mime, content) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function dataSection() {
    return '<section class="card"><div class="card-head"><h2>Data portability</h2></div>' +
      '<div class="data-actions">' +
        '<button type="button" id="exp-json" class="btn btn-ghost">' + F.ui.icon('download') + 'Export backup (JSON)</button>' +
        '<button type="button" id="exp-csv" class="btn btn-ghost">' + F.ui.icon('download') + 'Export transactions (CSV)</button>' +
      '</div>' +
      '<div class="import-box">' +
        '<div class="import-row">' +
          '<label class="btn btn-ghost btn-sm">' + F.ui.icon('upload') + 'Choose backup file' +
          '<input id="imp-file" type="file" accept=".json,application/json" class="sr-only"></label>' +
          '<span id="imp-name" class="muted">No file chosen</span>' +
        '</div>' +
        '<fieldset class="import-mode"><legend class="field-label">Import mode</legend>' +
          '<label class="radio"><input type="radio" name="imp-mode" value="merge" checked>' +
          '<span><strong>Merge</strong> — add records from the file, keep everything already here</span></label>' +
          '<label class="radio"><input type="radio" name="imp-mode" value="replace">' +
          '<span><strong>Replace</strong> — erase current data, import the file</span></label>' +
        '</fieldset>' +
        '<div id="imp-preview" class="import-preview" hidden></div>' +
        '<button type="button" id="imp-go" class="btn btn-primary btn-sm" disabled>Import</button>' +
        '<p class="hint">Backups are plain JSON exported from this app. CSV opens in any spreadsheet application.</p>' +
      '</div></section>';
  }

  function previewMessage(preview, kind, message) {
    preview.className = 'import-preview ' + kind;
    preview.hidden = false;
    preview.innerHTML = F.ui.icon(kind === 'ok' ? 'check' : 'alert') + '<div></div>';
    preview.querySelector('div').textContent = message;
  }

  /* ---------- storage status ---------- */

  function storageSection() {
    const persistent = F.storage.isPersistent();
    const fp = F.store.dataFootprint();
    const saved = F.store.lastSavedAt();
    const status = persistent
      ? '<span class="status-pill ok">' + F.ui.icon('check') + 'Browser storage active</span>' +
        '<p class="hint">Your ledger is saved in this browser (localStorage) and survives refreshes and restarts.</p>'
      : '<span class="status-pill warn">' + F.ui.icon('alert') + 'Session-only mode</span>' +
        '<p class="hint">This browser is blocking storage (private window or site settings), so data lives in memory ' +
        'and will be lost when the tab closes. Export a backup to keep anything important.</p>';
    const savedText = saved ? ' · last saved at ' + new Date(saved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    return '<section class="card"><div class="card-head"><h2>Storage</h2></div>' + status +
      '<p class="hint">Footprint: ' + (fp.bytes / 1024).toFixed(1) + ' KB · ' +
      fp.transactions + ' transactions · ' + fp.categories + ' categories' + U.esc(savedText) + '</p></section>';
  }

  /* ---------- danger zone & about ---------- */

  function dangerSection() {
    return '<section class="card card-danger"><div class="card-head"><h2>Danger zone</h2></div>' +
      '<div class="data-actions">' +
        '<button type="button" id="load-sample" class="btn btn-ghost">' + F.ui.icon('info') + 'Load sample data</button>' +
        '<button type="button" id="erase-all" class="btn btn-danger">' + F.ui.icon('trash') + 'Erase everything</button>' +
      '</div>' +
      '<p class="hint">Loading sample data replaces current data with three months of demo entries. Erasing resets ' +
      'Fiscus to a blank ledger (default categories remain). Both actions cannot be undone.</p></section>';
  }

  function aboutSection() {
    return '<section class="card about"><div class="card-head"><h2>About</h2></div>' +
      '<p>Fiscus v1 — a local-first personal ledger. It runs entirely in your browser with no server, no account ' +
      'and no network calls; nothing you enter ever leaves this device.</p></section>';
  }

  /* ---------- bindings ---------- */

  function bind(el) {
    // currency
    el.querySelector('#set-currency').addEventListener('change', e => {
      const res = F.store.setCurrency(e.target.value);
      if (!res.ok) {
        F.ui.toast(res.error, { type: 'error' });
        return;
      }
      const cur = U.currencyByCode(e.target.value);
      F.ui.toast('Currency set to ' + cur.label + ' (' + cur.symbol + ').', { type: 'success' });
    });

    // add category (inline form)
    el.querySelector('#cat-form').addEventListener('submit', e => {
      e.preventDefault();
      const nameEl = el.querySelector('#cat-name');
      const errEl = el.querySelector('#cat-name-err');
      const type = el.querySelector('#cat-type').value;
      const color = el.querySelector('input[name="new-cat-color"]:checked').value;
      const res = F.store.addCategory({ name: nameEl.value, type: type, color: color });
      if (!res.ok) {
        errEl.textContent = (res.errors && res.errors.name) || 'Could not add the category.';
        errEl.hidden = false;
        nameEl.setAttribute('aria-invalid', 'true');
        nameEl.focus();
        return;
      }
      F.ui.toast('Category "' + res.category.name + '" added.', { type: 'success' });
    });

    // edit category
    el.querySelectorAll('[data-cat-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = F.store.categoryById(btn.getAttribute('data-cat-edit'));
        if (cat) openCategoryModal(cat);
      });
    });

    // delete category
    el.querySelectorAll('[data-cat-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cat = F.store.categoryById(btn.getAttribute('data-cat-delete'));
        if (!cat) return;
        const usage = F.store.categoryUsage(cat.id);
        const bits = [];
        if (usage.transactions) bits.push(U.plural(usage.transactions, 'transaction', 'transactions') + ' use this category and will become Uncategorised');
        if (usage.budgetMonths) bits.push('its limits in ' + U.plural(usage.budgetMonths, 'month', 'months') + ' of budgets will be removed');
        const detail = bits.length ? bits.join(', and ') + '.' : 'Nothing is using it.';
        const ok = await F.ui.confirmDialog({
          title: 'Delete "' + cat.name + '"?',
          message: detail,
          confirmLabel: 'Delete category',
          danger: true
        });
        if (!ok) return;
        const res = F.store.deleteCategory(cat.id);
        if (res.ok) {
          F.ui.toast(res.moved
            ? 'Category deleted. ' + U.plural(res.moved, 'transaction', 'transactions') + ' moved to Uncategorised.'
            : 'Category deleted.', { type: 'success' });
        }
      });
    });

    // exports
    el.querySelector('#exp-json').addEventListener('click', () => {
      const payload = JSON.stringify(F.store.exportBundle(), null, 2);
      download('fiscus-backup-' + U.todayISO() + '.json', 'application/json', payload);
      F.ui.toast('Backup downloaded. Keep it somewhere safe.', { type: 'success' });
    });
    el.querySelector('#exp-csv').addEventListener('click', () => {
      download('fiscus-transactions-' + U.todayISO() + '.csv', 'text/csv;charset=utf-8', F.store.toCSV());
      F.ui.toast('CSV downloaded.', { type: 'success' });
    });

    // import: file pick → validate → preview → confirm → apply
    const fileInput = el.querySelector('#imp-file');
    const preview = el.querySelector('#imp-preview');
    const goBtn = el.querySelector('#imp-go');
    const nameEl = el.querySelector('#imp-name');

    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      pendingImport = null;
      goBtn.disabled = true;
      nameEl.textContent = f ? f.name : 'No file chosen';
      preview.hidden = true;
      preview.innerHTML = '';
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) {
        previewMessage(preview, 'error', 'File is larger than 5 MB — bigger than any Fiscus backup needs to be.');
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => previewMessage(preview, 'error', 'The file could not be read.');
      reader.onload = () => {
        let parsed;
        try {
          parsed = JSON.parse(String(reader.result));
        } catch (e) {
          previewMessage(preview, 'error', 'Not valid JSON: ' + e.message);
          return;
        }
        const v = F.store.validateBundle(parsed);
        if (!v.ok) {
          previewMessage(preview, 'error', v.error);
          return;
        }
        pendingImport = parsed;
        goBtn.disabled = false;
        const bits = ['Valid backup — ' + U.plural(v.summary.transactions, 'transaction', 'transactions') +
          ', ' + U.plural(v.summary.categories, 'category', 'categories') +
          ', budgets for ' + U.plural(v.summary.budgetMonths, 'month', 'months') + '.'];
        if (v.summary.uncategorised) bits.push(v.summary.uncategorised + ' record(s) reference unknown categories and will be saved as Uncategorised.');
        if (v.warnings.length) bits.push(U.plural(v.warnings.length, 'record', 'records') + ' will be skipped: ' + v.warnings.slice(0, 3).join(' '));
        previewMessage(preview, 'ok', bits.join(' '));
      };
      reader.readAsText(f);
    });

    goBtn.addEventListener('click', async () => {
      if (!pendingImport) return;
      const mode = el.querySelector('input[name="imp-mode"]:checked').value;
      if (mode === 'replace') {
        const ok = await F.ui.confirmDialog({
          title: 'Replace all current data?',
          message: 'Everything currently stored — transactions, categories, budgets — will be replaced by the file. This cannot be undone.',
          confirmLabel: 'Replace data',
          danger: true
        });
        if (!ok) return;
      }
      const res = F.store.importBundle(pendingImport, mode);
      if (!res.ok) {
        F.ui.toast(res.error, { type: 'error' });
        return;
      }
      const r = res.report;
      let msg;
      if (r.mode === 'replace') {
        msg = 'Replaced all data: ' + r.addedTransactions + ' transaction(s), ' + r.addedCategories + ' categories imported.';
      } else {
        msg = 'Imported ' + r.addedTransactions + ' transaction(s)';
        if (r.skippedTransactions) msg += ' (' + r.skippedTransactions + ' duplicate(s) skipped)';
        msg += ', ' + r.addedCategories + ' new categor' + (r.addedCategories === 1 ? 'y' : 'ies') +
          ', ' + r.addedBudgetMonths + ' budget month(s).';
      }
      if (r.warnings.length) msg += ' ' + r.warnings.length + ' record(s) skipped.';
      F.ui.toast(msg, { type: 'success', timeout: 7000 });
      pendingImport = null;
      fileInput.value = '';
      nameEl.textContent = 'No file chosen';
      preview.hidden = true;
      goBtn.disabled = true;
    });

    // danger zone
    el.querySelector('#load-sample').addEventListener('click', async () => {
      const ok = await F.ui.confirmDialog({
        title: 'Load sample data?',
        message: 'This replaces your current data with three months of sample transactions and budgets.',
        confirmLabel: 'Load sample data'
      });
      if (!ok) return;
      F.store.loadSampleData();
      F.app.setMonth(U.currentMonth());
      F.app.rerender();
      F.ui.toast('Sample data loaded.', { type: 'success' });
    });

    el.querySelector('#erase-all').addEventListener('click', async () => {
      const ok = await F.ui.confirmDialog({
        title: 'Erase everything?',
        message: 'All transactions, custom categories, budgets and preferences will be permanently deleted from this browser.',
        confirmLabel: 'Erase all data',
        danger: true,
        requireText: 'ERASE'
      });
      if (!ok) return;
      F.store.eraseAll();
      F.app.setMonth(U.currentMonth());
      F.app.rerender();
      F.ui.toast('All data erased. Starting fresh.', { type: 'success' });
    });
  }

  return { title: title, render: render };
})();
