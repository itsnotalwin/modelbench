/* Fiscus — application store: state shape, validation, CRUD, budgets,
   derived statistics and import/export. Single source of truth; views
   subscribe and re-render on every committed mutation. */
window.F = window.F || {};

F.store = (function () {
  'use strict';

  const U = F.util;
  const TYPES = ['expense', 'income'];

  let state = null;
  const listeners = new Set();
  let undoTx = null; // last deleted transaction, kept for the Undo toast action

  /* ---------- state shape ---------- */

  function defaultCategories() {
    const defs = [
      ['cat_groceries', 'Groceries', 'expense', '#3f8f5c'],
      ['cat_rent', 'Rent & Home', 'expense', '#7c5cd6'],
      ['cat_transport', 'Transport', 'expense', '#2f7fbf'],
      ['cat_dining', 'Dining & Cafés', 'expense', '#d97706'],
      ['cat_utilities', 'Utilities', 'expense', '#0e9aa7'],
      ['cat_health', 'Health', 'expense', '#cf5f4e'],
      ['cat_fun', 'Entertainment', 'expense', '#c2477f'],
      ['cat_shopping', 'Shopping', 'expense', '#8a6d3b'],
      ['cat_salary', 'Salary', 'income', '#1f6f54'],
      ['cat_freelance', 'Freelance', 'income', '#5c8f3f'],
      ['cat_other_income', 'Other income', 'income', '#64748b']
    ];
    return defs.map(d => ({ id: d[0], name: d[1], type: d[2], color: d[3] }));
  }

  function defaultState() {
    return {
      schema_version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      settings: { currency: 'USD' },
      categories: defaultCategories(),
      transactions: [],
      budgets: {} // "YYYY-MM" -> { categoryId: minorUnits }
    };
  }

  // Defensive rebuild of a state object loaded from storage or import.
  function normalizeState(raw) {
    const s = defaultState();
    if (!raw || typeof raw !== 'object') return s;

    if (raw.settings && typeof raw.settings === 'object' &&
        U.currencyByCode(raw.settings.currency).code === raw.settings.currency) {
      s.settings.currency = raw.settings.currency;
    }
    if (Array.isArray(raw.categories)) {
      s.categories = raw.categories
        .filter(c => c && typeof c === 'object' && typeof c.id === 'string' &&
                     typeof c.name === 'string' && TYPES.indexOf(c.type) !== -1)
        .map(c => ({
          id: c.id,
          name: c.name.slice(0, 32),
          type: c.type,
          color: U.hexColorValid(c.color) ? c.color : '#64748b'
        }));
    }
    if (Array.isArray(raw.transactions)) {
      s.transactions = raw.transactions
        .filter(t => t && typeof t === 'object' && typeof t.id === 'string' &&
                     TYPES.indexOf(t.type) !== -1 && Number.isInteger(t.amount) &&
                     t.amount > 0 && t.amount <= U.MAX_AMOUNT_MINOR && U.isValidISODate(t.date))
        .map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          date: t.date,
          categoryId: typeof t.categoryId === 'string' ? t.categoryId : null,
          note: typeof t.note === 'string' ? t.note.slice(0, 300) : '',
          createdAt: typeof t.createdAt === 'string' ? t.createdAt : null,
          updatedAt: typeof t.updatedAt === 'string' ? t.updatedAt : null
        }));
    }
    if (raw.budgets && typeof raw.budgets === 'object' && !Array.isArray(raw.budgets)) {
      Object.keys(raw.budgets).forEach(m => {
        const inner = raw.budgets[m];
        if (!U.isMonth(m) || !inner || typeof inner !== 'object') return;
        const clean = {};
        Object.keys(inner).forEach(cid => {
          const v = inner[cid];
          if (Number.isInteger(v) && v > 0 && v <= U.MAX_AMOUNT_MINOR) clean[cid] = v;
        });
        if (Object.keys(clean).length) s.budgets[m] = clean;
      });
    }
    return s;
  }

  /* ---------- lifecycle ---------- */

  function init() {
    const res = F.storage.loadRaw();
    if (res.corrupted) {
      state = defaultState();
      commit();
      return { fresh: true, corrupted: true };
    }
    if (res.state && typeof res.state === 'object') {
      state = normalizeState(res.state);
      return { fresh: false, corrupted: false };
    }
    state = defaultState();
    commit();
    return { fresh: true, corrupted: false };
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function emit() {
    listeners.forEach(fn => {
      try { fn(); } catch (e) { /* one broken listener must not break the rest */ }
    });
  }

  function commit() {
    state.updatedAt = new Date().toISOString();
    const res = F.storage.save(state);
    if (!res.ok && F.ui && F.ui.toast) {
      F.ui.toast('The browser refused to save your changes (storage full or blocked).', { type: 'error', timeout: 8000 });
    }
    emit();
  }

  // Persist without notifying views — used when a view applies its own
  // targeted DOM update (keeps focus while editing several budget rows).
  function persistOnly() {
    state.updatedAt = new Date().toISOString();
    F.storage.save(state);
  }

  function getState() { return state; }
  function currency() { return state.settings.currency; }
  function lastSavedAt() { return state.updatedAt; }

  function setCurrency(code) {
    if (U.currencyByCode(code).code !== code) return { ok: false, error: 'Unknown currency.' };
    if (state.settings.currency !== code) {
      state.settings.currency = code;
      commit();
    }
    return { ok: true };
  }

  /* ---------- categories ---------- */

  function listCategories(type) {
    const cats = state.categories.slice();
    return type ? cats.filter(c => c.type === type) : cats;
  }

  function categoryById(id) {
    return state.categories.find(c => c.id === id) || null;
  }

  function validateCategoryFields(fields, existingId) {
    const errors = {};
    const nm = String(fields.name == null ? '' : fields.name).trim();
    if (!nm) errors.name = 'Enter a category name.';
    else if (nm.length > 32) errors.name = 'Keep the name under 32 characters.';
    else if (state.categories.some(c => c.id !== existingId && c.name.toLowerCase() === nm.toLowerCase())) {
      errors.name = 'A category with this name already exists.';
    }
    if (TYPES.indexOf(fields.type) === -1) errors.type = 'Choose a type.';
    if (fields.color && !U.hexColorValid(fields.color)) errors.color = 'Pick a color.';
    return { errors, name: nm };
  }

  function addCategory(fields) {
    const v = validateCategoryFields(fields, null);
    if (Object.keys(v.errors).length) return { ok: false, errors: v.errors };
    const cat = { id: U.uid('cat'), name: v.name, type: fields.type, color: fields.color || '#64748b' };
    state.categories.push(cat);
    commit();
    return { ok: true, category: cat };
  }

  function updateCategory(id, fields) {
    const cat = categoryById(id);
    if (!cat) return { ok: false, errors: { name: 'This category no longer exists.' } };
    const v = validateCategoryFields({ name: fields.name, type: cat.type, color: fields.color }, id);
    if (Object.keys(v.errors).length) return { ok: false, errors: v.errors };
    cat.name = v.name;
    if (fields.color) cat.color = fields.color;
    commit();
    return { ok: true, category: cat };
  }

  // How many records reference a category — shown before deletion.
  function categoryUsage(id) {
    const transactions = state.transactions.filter(t => t.categoryId === id).length;
    let budgetMonths = 0;
    Object.keys(state.budgets).forEach(m => {
      if (state.budgets[m] && state.budgets[m][id] != null) budgetMonths++;
    });
    return { transactions, budgetMonths };
  }

  function deleteCategory(id) {
    const cat = categoryById(id);
    if (!cat) return { ok: false, error: 'Category not found.' };
    const usage = categoryUsage(id);
    let moved = 0;
    const now = new Date().toISOString();
    state.transactions.forEach(t => {
      if (t.categoryId === id) { t.categoryId = null; t.updatedAt = now; moved++; }
    });
    Object.keys(state.budgets).forEach(m => {
      if (!state.budgets[m]) return;
      delete state.budgets[m][id];
      if (!Object.keys(state.budgets[m]).length) delete state.budgets[m];
    });
    state.categories = state.categories.filter(c => c.id !== id);
    commit();
    return { ok: true, moved, budgetMonths: usage.budgetMonths };
  }

  /* ---------- transactions ---------- */

  function getTransaction(id) {
    return state.transactions.find(t => t.id === id) || null;
  }

  function validateTransactionFields(f) {
    const errors = {};
    if (TYPES.indexOf(f.type) === -1) errors.type = 'Choose a type.';
    if (!Number.isInteger(f.amount) || f.amount <= 0) {
      errors.amount = f.amount === 0 ? 'Amount must be greater than zero.' : 'Enter a valid amount.';
    } else if (f.amount > U.MAX_AMOUNT_MINOR) {
      errors.amount = 'Amount is too large.';
    }
    if (!U.isValidISODate(f.date)) errors.date = 'Enter a real date.';
    if (f.categoryId != null) {
      const c = categoryById(f.categoryId);
      if (!c) errors.category = 'This category no longer exists.';
      else if (c.type !== f.type) errors.category = 'Pick a ' + f.type + ' category.';
    }
    const note = String(f.note == null ? '' : f.note).trim();
    if (note.length > 300) errors.note = 'Keep the note under 300 characters.';
    return { errors, note };
  }

  function addTransaction(fields) {
    const v = validateTransactionFields(fields);
    if (Object.keys(v.errors).length) return { ok: false, errors: v.errors };
    const now = new Date().toISOString();
    const tx = {
      id: U.uid('tx'),
      type: fields.type,
      amount: fields.amount,
      date: fields.date,
      categoryId: fields.categoryId || null,
      note: v.note,
      createdAt: now,
      updatedAt: now
    };
    state.transactions.push(tx);
    undoTx = null;
    commit();
    return { ok: true, transaction: tx };
  }

  function updateTransaction(id, fields) {
    const tx = getTransaction(id);
    if (!tx) return { ok: false, errors: { _form: 'This transaction no longer exists.' } };
    const v = validateTransactionFields(fields);
    if (Object.keys(v.errors).length) return { ok: false, errors: v.errors };
    tx.type = fields.type;
    tx.amount = fields.amount;
    tx.date = fields.date;
    tx.categoryId = fields.categoryId || null;
    tx.note = v.note;
    tx.updatedAt = new Date().toISOString();
    commit();
    return { ok: true, transaction: tx };
  }

  function deleteTransaction(id) {
    const i = state.transactions.findIndex(t => t.id === id);
    if (i === -1) return { ok: false, error: 'Transaction not found.' };
    const removed = state.transactions.splice(i, 1)[0];
    undoTx = JSON.parse(JSON.stringify(removed));
    commit();
    return { ok: true, transaction: removed };
  }

  function restoreLastDeleted() {
    if (!undoTx) return { ok: false };
    const tx = undoTx;
    undoTx = null;
    state.transactions.push(tx);
    commit();
    return { ok: true, transaction: tx };
  }

  function hasUndo() { return !!undoTx; }

  /* ---------- budgets ---------- */

  function getBudget(month, categoryId) {
    const m = state.budgets[month];
    if (!m) return null;
    const v = m[categoryId];
    return Number.isInteger(v) && v > 0 ? v : null;
  }

  function setBudget(month, categoryId, minor, opts) {
    if (!U.isMonth(month)) return { ok: false, error: 'Invalid month.' };
    const cat = categoryById(categoryId);
    if (!cat || cat.type !== 'expense') return { ok: false, error: 'Budgets apply to expense categories.' };
    if (minor != null && (!Number.isInteger(minor) || minor < 0)) return { ok: false, error: 'Enter a valid limit.' };
    if (!state.budgets[month]) state.budgets[month] = {};
    if (minor == null || minor === 0) delete state.budgets[month][categoryId];
    else state.budgets[month][categoryId] = minor;
    if (!Object.keys(state.budgets[month]).length) delete state.budgets[month];
    if (opts && opts.silent) persistOnly();
    else commit();
    return { ok: true };
  }

  function monthsWithBudgets() {
    return Object.keys(state.budgets)
      .filter(m => state.budgets[m] && Object.keys(state.budgets[m]).length)
      .sort()
      .reverse();
  }

  function copyBudgets(fromMonth, toMonth) {
    const src = state.budgets[fromMonth];
    const entries = src ? Object.keys(src).filter(k => getBudget(fromMonth, k) != null) : [];
    if (!entries.length) {
      return { ok: false, error: 'No budgets to copy from ' + U.monthLabelShort(fromMonth) + '.' };
    }
    state.budgets[toMonth] = {};
    entries.forEach(k => { state.budgets[toMonth][k] = src[k]; });
    commit();
    return { ok: true, copied: entries.length };
  }

  function clearBudgets(month) {
    const n = state.budgets[month] ? Object.keys(state.budgets[month]).length : 0;
    if (n) {
      delete state.budgets[month];
      commit();
    }
    return { ok: true, cleared: n };
  }

  // One row per expense category for the given month, sorted sensibly.
  function budgetRows(month) {
    return listCategories('expense')
      .map(cat => {
        const limit = getBudget(month, cat.id);
        let spent = 0;
        state.transactions.forEach(t => {
          if (t.type === 'expense' && t.categoryId === cat.id && U.monthOfISO(t.date) === month) spent += t.amount;
        });
        const pct = limit ? Math.round((spent / limit) * 100) : null;
        return {
          category: cat,
          limit: limit,
          spent: spent,
          pct: pct,
          over: limit != null && spent > limit,
          remaining: limit != null ? limit - spent : null
        };
      })
      .sort((a, b) => {
        if (a.limit != null && b.limit != null) return b.pct - a.pct;
        if (a.limit != null) return -1;
        if (b.limit != null) return 1;
        return b.spent - a.spent || a.category.name.localeCompare(b.category.name);
      });
  }

  /* ---------- derived statistics ---------- */

  function monthSummary(month) {
    let income = 0, expense = 0, count = 0;
    state.transactions.forEach(t => {
      if (U.monthOfISO(t.date) !== month) return;
      count++;
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income: income, expense: expense, net: income - expense, count: count };
  }

  // Per-category totals for one month and type; null categoryId → "Uncategorised".
  function categoryTotals(month, type) {
    const totals = new Map();
    let grand = 0;
    state.transactions.forEach(t => {
      if (t.type !== type || U.monthOfISO(t.date) !== month) return;
      const key = (t.categoryId && categoryById(t.categoryId)) ? t.categoryId : '_none';
      const cur = totals.get(key) || { total: 0, count: 0 };
      cur.total += t.amount;
      cur.count++;
      totals.set(key, cur);
      grand += t.amount;
    });
    const items = [];
    totals.forEach((v, key) => {
      const cat = key === '_none' ? null : categoryById(key);
      items.push({
        categoryId: key,
        name: cat ? cat.name : 'Uncategorised',
        color: cat ? cat.color : '#9aa39b',
        total: v.total,
        count: v.count,
        pct: grand ? Math.round((v.total / grand) * 1000) / 10 : 0
      });
    });
    items.sort((a, b) => b.total - a.total);
    return { items: items, grand: grand };
  }

  function monthsPresent() {
    const set = new Set(state.transactions.map(t => U.monthOfISO(t.date)));
    return Array.from(set).sort().reverse();
  }

  function lastMonths(n, endMonth) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(U.addMonths(endMonth, -i));
    return out;
  }

  function sortedByDateDesc(list) {
    return list.slice().sort((a, b) =>
      b.date.localeCompare(a.date) ||
      String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  function recentTransactions(n) {
    return sortedByDateDesc(state.transactions).slice(0, n);
  }

  function queryTransactions(filters) {
    const f = filters || {};
    let items = state.transactions.slice();

    if (f.month && f.month !== 'all') items = items.filter(t => U.monthOfISO(t.date) === f.month);
    if (f.type && f.type !== 'all') items = items.filter(t => t.type === f.type);
    if (f.categoryId && f.categoryId !== 'all') {
      if (f.categoryId === '_none') {
        items = items.filter(t => t.categoryId == null || !categoryById(t.categoryId));
      } else {
        items = items.filter(t => t.categoryId === f.categoryId);
      }
    }
    if (f.search && f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      items = items.filter(t => {
        if ((t.note || '').toLowerCase().indexOf(q) !== -1) return true;
        const c = t.categoryId && categoryById(t.categoryId);
        return c ? c.name.toLowerCase().indexOf(q) !== -1 : 'uncategorised'.indexOf(q) !== -1;
      });
    }

    const sort = f.sort || 'date-desc';
    items.sort((a, b) => {
      if (sort === 'date-asc') return a.date.localeCompare(b.date) || String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
      if (sort === 'amount-desc') return b.amount - a.amount || b.date.localeCompare(a.date);
      if (sort === 'amount-asc') return a.amount - b.amount || b.date.localeCompare(a.date);
      return b.date.localeCompare(a.date) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });

    let income = 0, expense = 0;
    items.forEach(t => { if (t.type === 'income') income += t.amount; else expense += t.amount; });
    return { items: items, stats: { count: items.length, income: income, expense: expense } };
  }

  function biggestExpense(month) {
    let best = null;
    state.transactions.forEach(t => {
      if (t.type === 'expense' && U.monthOfISO(t.date) === month && (!best || t.amount > best.amount)) best = t;
    });
    return best;
  }

  /* ---------- export / import ---------- */

  function exportBundle() {
    return {
      app: 'fiscus',
      kind: 'fiscus-backup',
      schema_version: 1,
      exported_at: new Date().toISOString(),
      data: {
        settings: { currency: state.settings.currency },
        categories: state.categories.map(c => Object.assign({}, c)),
        transactions: state.transactions.map(t => Object.assign({}, t)),
        budgets: JSON.parse(JSON.stringify(state.budgets))
      }
    };
  }

  function toCSV() {
    const cur = U.currencyByCode(state.settings.currency);
    const div = Math.pow(10, cur.decimals);
    const field = s => {
      const v = String(s == null ? '' : s);
      return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    const rows = [['date', 'type', 'category', 'amount', 'note']];
    sortedByDateDesc(state.transactions).reverse().forEach(t => {
      const cat = t.categoryId && categoryById(t.categoryId);
      rows.push([
        t.date,
        t.type,
        cat ? cat.name : 'Uncategorised',
        (t.amount / div).toFixed(cur.decimals),
        t.note || ''
      ]);
    });
    return '\uFEFF' + rows.map(r => r.map(field).join(',')).join('\r\n');
  }

  // Full structural validation of an import payload. Returns either
  // {ok:true, ...normalized data} or {ok:false, error}. Never mutates state.
  function validateBundle(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'The file does not contain Fiscus data (expected a JSON object).' };
    }
    if (parsed.app && parsed.app !== 'fiscus') {
      return { ok: false, error: 'This backup was made by a different application ("' + String(parsed.app).slice(0, 40) + '").' };
    }
    const src = (parsed.data && typeof parsed.data === 'object') ? parsed.data : parsed;
    if (!src || typeof src !== 'object') return { ok: false, error: 'The file does not contain Fiscus data.' };

    const warnings = [];
    if (!Array.isArray(src.categories)) return { ok: false, error: 'Missing "categories" list in the backup.' };
    if (!Array.isArray(src.transactions)) return { ok: false, error: 'Missing "transactions" list in the backup.' };

    // categories
    const usedIds = new Set();
    const usedNames = new Set();
    const catMap = new Map(); // original id in the file → normalized category
    const categories = [];
    src.categories.forEach((c, i) => {
      if (!c || typeof c !== 'object') { warnings.push('Skipped malformed category #' + (i + 1) + '.'); return; }
      const name = typeof c.name === 'string' ? c.name.trim() : '';
      if (!name || name.length > 32) { warnings.push('Skipped category #' + (i + 1) + ' (invalid name).'); return; }
      if (TYPES.indexOf(c.type) === -1) { warnings.push('Skipped category "' + name + '" (invalid type).'); return; }
      if (usedNames.has(name.toLowerCase())) { warnings.push('Skipped duplicate category "' + name + '".'); return; }
      const origId = (typeof c.id === 'string' && c.id && !usedIds.has(c.id)) ? c.id : U.uid('cat');
      usedIds.add(origId);
      usedNames.add(name.toLowerCase());
      const cat = {
        id: origId,
        name: name,
        type: c.type,
        color: U.hexColorValid(c.color) ? c.color : U.SEED_COLORS[categories.length % U.SEED_COLORS.length].hex
      };
      catMap.set(origId, cat);
      categories.push(cat);
    });

    // transactions
    const txIds = new Set();
    const transactions = [];
    let uncategorised = 0;
    src.transactions.forEach((t, i) => {
      if (!t || typeof t !== 'object') { warnings.push('Skipped malformed transaction #' + (i + 1) + '.'); return; }
      if (TYPES.indexOf(t.type) === -1) { warnings.push('Skipped transaction #' + (i + 1) + ' (invalid type).'); return; }
      if (!Number.isInteger(t.amount) || t.amount <= 0 || t.amount > U.MAX_AMOUNT_MINOR) {
        warnings.push('Skipped transaction #' + (i + 1) + ' (invalid amount).'); return;
      }
      if (!U.isValidISODate(t.date)) { warnings.push('Skipped transaction #' + (i + 1) + ' (invalid date).'); return; }
      let categoryId = null;
      if (typeof t.categoryId === 'string' && catMap.has(t.categoryId)) {
        categoryId = catMap.get(t.categoryId).id;
      } else if (t.categoryId != null) {
        uncategorised++;
      }
      const id = (typeof t.id === 'string' && t.id && !txIds.has(t.id)) ? t.id : U.uid('tx');
      txIds.add(id);
      transactions.push({
        id: id,
        type: t.type,
        amount: t.amount,
        date: t.date,
        categoryId: categoryId,
        note: typeof t.note === 'string' ? t.note.slice(0, 300) : '',
        createdAt: typeof t.createdAt === 'string' ? t.createdAt : null,
        updatedAt: typeof t.updatedAt === 'string' ? t.updatedAt : null
      });
    });

    // budgets
    const budgets = {};
    if (src.budgets && typeof src.budgets === 'object' && !Array.isArray(src.budgets)) {
      Object.keys(src.budgets).forEach(m => {
        const inner = src.budgets[m];
        if (!U.isMonth(m) || !inner || typeof inner !== 'object') {
          warnings.push('Skipped budgets for "' + String(m).slice(0, 12) + '" (invalid month).');
          return;
        }
        const clean = {};
        Object.keys(inner).forEach(cid => {
          const mapped = catMap.get(cid);
          const v = inner[cid];
          if (!mapped) { warnings.push('Skipped a budget entry for an unknown category.'); return; }
          if (!Number.isInteger(v) || v <= 0 || v > U.MAX_AMOUNT_MINOR) { warnings.push('Skipped an invalid budget amount.'); return; }
          clean[mapped.id] = v;
        });
        if (Object.keys(clean).length) budgets[m] = clean;
      });
    }

    // settings
    let settings = null;
    if (src.settings && typeof src.settings === 'object' &&
        U.currencyByCode(src.settings.currency).code === src.settings.currency) {
      settings = { currency: src.settings.currency };
    }

    if (!categories.length && !transactions.length) {
      return { ok: false, error: 'The backup contains no usable records.' };
    }
    return {
      ok: true,
      categories: categories,
      transactions: transactions,
      budgets: budgets,
      settings: settings,
      warnings: warnings,
      summary: {
        categories: categories.length,
        transactions: transactions.length,
        budgetMonths: Object.keys(budgets).length,
        uncategorised: uncategorised
      }
    };
  }

  // Two-phase import: validateBundle first, then apply. mode is 'merge'|'replace'.
  function importBundle(parsed, mode) {
    const v = validateBundle(parsed);
    if (!v.ok) return v;
    const report = {
      mode: mode === 'replace' ? 'replace' : 'merge',
      warnings: v.warnings.slice(),
      addedCategories: 0,
      addedTransactions: 0,
      skippedTransactions: 0,
      addedBudgetMonths: 0,
      uncategorised: v.summary.uncategorised
    };

    if (mode === 'replace') {
      if (v.settings) state.settings = v.settings;
      state.categories = v.categories;
      state.transactions = v.transactions;
      state.budgets = v.budgets;
      report.addedCategories = v.categories.length;
      report.addedTransactions = v.transactions.length;
      report.addedBudgetMonths = Object.keys(v.budgets).length;
    } else {
      // Merge: add non-conflicting categories, remap name collisions, skip dup ids.
      const byName = new Map(state.categories.map(c => [c.name.toLowerCase(), c]));
      const idRemap = new Map();
      v.categories.forEach(c => {
        const existing = byName.get(c.name.toLowerCase());
        if (existing) {
          idRemap.set(c.id, existing.id);
        } else {
          state.categories.push(c);
          byName.set(c.name.toLowerCase(), c);
          report.addedCategories++;
        }
      });
      const existingTx = new Set(state.transactions.map(t => t.id));
      v.transactions.forEach(t => {
        if (existingTx.has(t.id)) { report.skippedTransactions++; return; }
        if (t.categoryId && idRemap.has(t.categoryId)) t.categoryId = idRemap.get(t.categoryId);
        state.transactions.push(t);
        report.addedTransactions++;
      });
      Object.keys(v.budgets).forEach(m => {
        if (state.budgets[m]) return; // merge never overwrites an existing month
        state.budgets[m] = v.budgets[m];
        report.addedBudgetMonths++;
      });
    }

    undoTx = null;
    commit();
    return { ok: true, report: report };
  }

  /* ---------- sample data & reset ---------- */

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function loadSampleData() {
    const rnd = mulberry32(20261127);
    const now = new Date().toISOString();
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const rint = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
    // lo/hi are already minor units (cents).
    const money = (lo, hi) => lo + Math.round(rnd() * (hi - lo));
    const mk = (type, catId, day, m, minor, note) => ({
      id: U.uid('tx'),
      type: type,
      amount: minor,
      categoryId: catId,
      date: m + '-' + U.pad2(day),
      note: note,
      createdAt: now,
      updatedAt: now
    });

    const st = defaultState();
    st.settings.currency = state.settings.currency;
    const txs = [];
    const months = [U.addMonths(U.currentMonth(), -2), U.addMonths(U.currentMonth(), -1), U.currentMonth()];

    months.forEach(m => {
      const dim = U.daysInMonth(m);
      const day = d => Math.min(d, dim);

      txs.push(mk('income', 'cat_salary', 1, m, 320000, 'Monthly salary'));
      if (rnd() < 0.6) txs.push(mk('income', 'cat_freelance', day(rint(8, 22)), m, money(25000, 90000), pick(['Logo design gig', 'Website overhaul', 'Consulting session', 'Freelance invoice'])));
      if (rnd() < 0.35) txs.push(mk('income', 'cat_other_income', day(rint(5, 26)), m, money(2000, 15000), pick(['Marketplace sale', 'Cashback', 'Gift from family'])));

      txs.push(mk('expense', 'cat_rent', 1, m, 160000, 'Apartment rent'));
      txs.push(mk('expense', 'cat_utilities', day(6), m, money(5500, 12500), pick(['Electricity bill', 'Water & power'])));
      txs.push(mk('expense', 'cat_utilities', day(14), m, 4500, 'Home internet'));

      for (let i = 0, n = rint(5, 7); i < n; i++) txs.push(mk('expense', 'cat_groceries', day(rint(2, 28)), m, money(2200, 11000), pick(['Weekly groceries', 'Corner shop', 'Farmers market', 'Supermarket run', 'Bread & milk'])));
      for (let i = 0, n = rint(4, 8); i < n; i++) txs.push(mk('expense', 'cat_dining', day(rint(2, 28)), m, money(900, 6500), pick(['Lunch with team', 'Pizza night', 'Coffee & pastry', 'Ramen bar', 'Weekend brunch'])));
      for (let i = 0, n = rint(5, 9); i < n; i++) txs.push(mk('expense', 'cat_transport', day(rint(1, 28)), m, money(250, 4200), pick(['Metro card top-up', 'Fuel', 'Bus ticket', 'Taxi ride', 'Parking'])));
      for (let i = 0, n = rint(2, 4); i < n; i++) txs.push(mk('expense', 'cat_fun', day(rint(3, 28)), m, money(1000, 6000), pick(['Cinema tickets', 'Concert', 'Board game', 'Streaming service'])));
      for (let i = 0, n = rint(1, 3); i < n; i++) txs.push(mk('expense', 'cat_shopping', day(rint(3, 28)), m, money(2000, 15000), pick(['New sneakers', 'Household items', 'Bookstore', 'Kitchen gadget'])));
      if (rnd() < 0.6) txs.push(mk('expense', 'cat_health', day(rint(3, 27)), m, money(1500, 20000), pick(['Pharmacy', 'Dentist visit', 'Gym membership'])));
    });

    st.transactions = txs;
    const curMonth = U.currentMonth();
    const prevMonth = U.addMonths(curMonth, -1);
    st.budgets[curMonth] = {
      cat_groceries: 60000, cat_rent: 160000, cat_transport: 15000,
      cat_utilities: 22000, cat_dining: 25000, cat_fun: 12000,
      cat_shopping: 15000, cat_health: 10000
    };
    st.budgets[prevMonth] = {
      cat_groceries: 60000, cat_rent: 160000, cat_transport: 15000,
      cat_utilities: 22000, cat_dining: 20000, cat_fun: 12000,
      cat_shopping: 12000, cat_health: 10000
    };

    state = st;
    undoTx = null;
    commit();
    return { ok: true, count: txs.length };
  }

  function eraseAll() {
    const cur = state.settings.currency;
    state = defaultState();
    state.settings.currency = cur;
    undoTx = null;
    F.storage.clear();
    commit();
    return { ok: true };
  }

  function dataFootprint() {
    let bytes = 0;
    try { bytes = JSON.stringify(state).length; } catch (e) { /* ignore */ }
    return {
      bytes: bytes,
      transactions: state.transactions.length,
      categories: state.categories.length
    };
  }

  return {
    init, subscribe, getState, currency, lastSavedAt, setCurrency,
    listCategories, categoryById, addCategory, updateCategory, deleteCategory, categoryUsage,
    getTransaction, addTransaction, updateTransaction, deleteTransaction, restoreLastDeleted, hasUndo,
    setBudget, getBudget, copyBudgets, clearBudgets, monthsWithBudgets, budgetRows,
    monthSummary, categoryTotals, monthsPresent, lastMonths,
    recentTransactions, queryTransactions, biggestExpense,
    exportBundle, toCSV, validateBundle, importBundle,
    loadSampleData, eraseAll, dataFootprint
  };
})();
