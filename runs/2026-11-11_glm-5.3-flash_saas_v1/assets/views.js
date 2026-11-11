/* ============================================================
   ClearDesk — views: entries list, entry editor, clients,
   client detail, tariff schedule, disbursement ledger, reports,
   shared modals (client / payment / tariff / HS picker) and the
   printable computation & entry sheets.
   ============================================================ */
window.CDViews = (function () {
  'use strict';

  var C = window.CDCore, U = window.CDUI, A = null;
  function bind() { A = window.CDA; }
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function go(hash) {
    bind();
    if (A.App.route.name === 'entry' && A.draftDirty() && hash !== location.hash) {
      U.confirmDialog({
        title: 'Discard unsaved changes?',
        message: 'This entry has edits that have not been saved. Leaving now will discard them.',
        confirmLabel: 'Discard changes', danger: true
      }).then(function (yes) { if (yes) { A.clearDraft(); A.nav(hash); } });
      return;
    }
    A.nav(hash);
  }

  function refresh() { bind(); A.rerender(); }
  function cur() { bind(); return A.currentUser(); }

  /* ================= shared modals ================= */

  function openClientModal(existing, afterSave) {
    bind();
    var c = existing || { code: nextClientCode(), name: '', taxId: '', country: '', email: '', phone: '', terms: 'credit30', permitType: '', permitExpiry: '', notes: '' };
    U.modal({
      title: existing ? 'Edit client — ' + c.name : 'New client',
      wide: true,
      body:
        '<div class="form-row">' +
        '  <div class="field"><label>Client code</label><input class="input" id="cf-code" value="' + U.esc(c.code) + '"><div class="err-msg" data-e="code" hidden></div></div>' +
        '  <div class="field"><label>Client name <span class="req">*</span></label><input class="input" id="cf-name" value="' + U.esc(c.name) + '"><div class="err-msg" data-e="name" hidden></div></div>' +
        '</div>' +
        '<div class="form-row">' +
        '  <div class="field"><label>Tax ID / PIN <span class="req">*</span></label><input class="input" id="cf-taxid" value="' + U.esc(c.taxId) + '" placeholder="P051234567X"><div class="err-msg" data-e="taxId" hidden></div></div>' +
        '  <div class="field"><label>Country</label><input class="input" id="cf-country" value="' + U.esc(c.country) + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
        '  <div class="field"><label>Email</label><input class="input" id="cf-email" type="email" value="' + U.esc(c.email) + '"><div class="err-msg" data-e="email" hidden></div></div>' +
        '  <div class="field"><label>Phone</label><input class="input" id="cf-phone" value="' + U.esc(c.phone) + '"></div>' +
        '</div>' +
        '<div class="form-row">' +
        '  <div class="field"><label>Payment terms <span class="req">*</span></label><select class="input" id="cf-terms">' +
        Object.keys(C.PAY_TERMS).map(function (t) { return '<option value="' + t + '"' + (c.terms === t ? ' selected' : '') + '>' + C.PAY_TERMS[t] + '</option>'; }).join('') +
        '  </select><div class="err-msg" data-e="terms" hidden></div></div>' +
        '  <div class="field"><label>Permit / licence type</label><input class="input" id="cf-permittype" value="' + U.esc(c.permitType) + '"></div>' +
        '  <div class="field"><label>Permit expiry</label><input class="input" id="cf-permitexpiry" type="date" value="' + U.esc(c.permitExpiry) + '"><div class="err-msg" data-e="permitExpiry" hidden></div></div>' +
        '</div>' +
        '<div class="field"><label>Notes</label><textarea class="input" id="cf-notes">' + U.esc(c.notes) + '</textarea></div>',
      footer:
        '<button class="btn ghost" data-act="cancel">Cancel</button>' +
        '<button class="btn" data-act="save" data-autofocus>' + (existing ? 'Save client' : 'Create client') + '</button>',
      onMount: function (box, close) {
        box.querySelector('[data-act="cancel"]').addEventListener('click', function () { close(null); });
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var v = {
            code: $('#cf-code', box).value.trim().toUpperCase(), name: $('#cf-name', box).value.trim(),
            taxId: $('#cf-taxid', box).value.trim().toUpperCase(), country: $('#cf-country', box).value.trim(),
            email: $('#cf-email', box).value.trim(), phone: $('#cf-phone', box).value.trim(),
            terms: $('#cf-terms', box).value, permitType: $('#cf-permittype', box).value.trim(),
            permitExpiry: $('#cf-permitexpiry', box).value, notes: $('#cf-notes', box).value.trim()
          };
          var res = C.validateClient(v, { existingCodes: A.App.db.clients.filter(function (x) { return !existing || x.id !== existing.id; }).map(function (x) { return x.code; }) });
          showErrs(box, res.errors);
          if (!res.ok) return;
          if (existing) {
            Object.keys(v).forEach(function (k) { existing[k] = v[k]; });
            U.toast('Client saved.');
          } else {
            v.id = C.uid('c'); v.createdAt = C.todayIso();
            A.App.db.clients.push(v);
            U.toast('Client created.');
          }
          A.persist();
          close(true);
          if (afterSave) afterSave(v); else refresh();
        });
      }
    });
  }

  function nextClientCode() {
    bind();
    var max = 0;
    A.App.db.clients.forEach(function (c) {
      var m = /^CL-(\d+)$/.exec(c.code || '');
      if (m) max = Math.max(max, Number(m[1]));
    });
    return 'CL-' + String(max + 1).padStart(2, '0');
  }

  function showErrs(root, errors) {
    $$('[data-e]', root).forEach(function (el) { el.hidden = true; el.textContent = ''; });
    Object.keys(errors || {}).forEach(function (k) {
      var el = root.querySelector('[data-e="' + k + '"]');
      if (el) { el.hidden = false; el.textContent = errors[k]; }
    });
    if (errors && Object.keys(errors).length) {
      var first = root.querySelector('[data-e]:not([hidden])');
      if (first) first.scrollIntoView({ block: 'nearest' });
    }
  }

  function entryBalanceOf(entryId) {
    bind();
    var e = A.entryById(entryId);
    if (!e) return 0;
    var c = A.computeFor(e);
    return C.round2(c.totalDue - C.paidFor(e.id, A.App.db.payments));
  }

  function openPaymentModal(entryId, fixedClientId, afterSave) {
    bind();
    var db = A.App.db;
    var clients = db.clients;
    var presetClientId = fixedClientId || (entryId ? (A.entryById(entryId) || {}).clientId : '') || '';
    var today = A.todayIso();
    var openEntries = function (cid) {
      return db.entries.filter(function (e) { return e.clientId === cid && e.status !== 'cancelled'; });
    };
    var body =
      '<div class="form-row">' +
      '  <div class="field"><label>Client <span class="req">*</span></label><select class="input" id="pf-client"' + (fixedClientId ? ' disabled' : '') + '>' +
      '    <option value="">— choose —</option>' +
      clients.map(function (cl) { return '<option value="' + cl.id + '"' + (cl.id === presetClientId ? ' selected' : '') + '>' + U.esc(cl.name) + '</option>'; }).join('') +
      '  </select><div class="err-msg" data-e="clientId" hidden></div></div>' +
      '  <div class="field"><label>Against entry</label><select class="input" id="pf-entry"><option value="">— client account (unallocated) —</option></select></div>' +
      '</div>' +
      '<div class="form-row">' +
      '  <div class="field"><label>Amount <span class="req">*</span></label><input class="input" id="pf-amount" type="number" min="0.01" step="0.01" data-autofocus><div class="err-msg" data-e="amount" hidden></div><div class="hint" id="pf-balance-hint"></div></div>' +
      '  <div class="field"><label>Date <span class="req">*</span></label><input class="input" id="pf-date" type="date" value="' + today + '"><div class="err-msg" data-e="date" hidden></div></div>' +
      '</div>' +
      '<div class="form-row">' +
      '  <div class="field"><label>Method <span class="req">*</span></label><select class="input" id="pf-method">' + C.PAY_METHODS.map(function (m) { return '<option>' + m + '</option>'; }).join('') + '</select><div class="err-msg" data-e="method" hidden></div></div>' +
      '  <div class="field"><label>Note</label><input class="input" id="pf-note" placeholder="Optional reference"></div>' +
      '</div>';

    U.modal({
      title: 'Record payment',
      body: body,
      footer: '<button class="btn ghost" data-act="cancel">Cancel</button><button class="btn" data-act="save" data-autofocus>Record payment</button>',
      onMount: function (box, close) {
        var selEntry = $('#pf-entry', box), selClient = $('#pf-client', box);
        var amount = $('#pf-amount', box);
        function fillEntries() {
          var cid = fixedClientId || selClient.value;
          var list = openEntries(cid);
          selEntry.innerHTML = '<option value="">— client account (unallocated) —</option>' + list.map(function (e) {
            var bal = entryBalanceOf(e.id);
            return '<option value="' + e.id + '"' + (entryId && e.id === entryId ? ' selected' : '') + '>' + U.esc(e.ref) + ' — balance ' + U.money(bal, db.org.currency) + '</option>';
          }).join('');
          updateHint();
        }
        function updateHint() {
          var eid = selEntry.value;
          if (!eid) { $('#pf-balance-hint', box).textContent = ''; return; }
          var bal = entryBalanceOf(eid);
          $('#pf-balance-hint', box).textContent = 'Outstanding balance: ' + U.money(bal, db.org.currency);
          if (bal > 0 && !amount.value) amount.value = bal.toFixed(2);
        }
        selClient.addEventListener('change', fillEntries);
        selEntry.addEventListener('change', updateHint);
        fillEntries();

        box.querySelector('[data-act="cancel"]').addEventListener('click', function () { close(null); });
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var eid = selEntry.value || '';
          var p = {
            clientId: fixedClientId || selClient.value,
            entryId: eid,
            amount: Number(amount.value),
            date: $('#pf-date', box).value,
            method: $('#pf-method', box).value,
            note: $('#pf-note', box).value.trim()
          };
          var bal = eid ? entryBalanceOf(eid) : null;
          var res = C.validatePayment(p, bal == null ? undefined : bal);
          showErrs(box, res.errors);
          if (!res.ok) return;
          p.id = C.uid('p');
          p.createdAt = new Date().toISOString();
          p.createdBy = cur().id;
          db.payments.push(p);
          if (eid) {
            var e = A.entryById(eid);
            e.timeline = (e.timeline || []).concat([{ ts: p.createdAt, who: cur().name, action: 'pay', text: 'Payment recorded: ' + U.money(p.amount, db.org.currency) + ' — ' + p.method + (p.note ? ' (' + p.note + ')' : '') }]);
            e.updatedAt = p.createdAt;
          }
          A.persist();
          U.toast('Payment of ' + U.money(p.amount, db.org.currency) + ' recorded.');
          close(true);
          if (afterSave) afterSave(p); else refresh();
        });
      }
    });
  }

  function openTariffModal(existing, afterSave) {
    bind();
    var t = existing || { code: '', description: '', dutyRate: 0, exciseRate: 0, vatExempt: false };
    U.modal({
      title: existing ? 'Edit tariff line — ' + t.code : 'Add tariff line',
      wide: true,
      body:
        '<div class="form-row">' +
        '  <div class="field"><label>HS code <span class="req">*</span></label><input class="input mono" id="tf-code" value="' + U.esc(t.code) + '" placeholder="8703.23.00"><div class="err-msg" data-e="code" hidden></div></div>' +
        '  <div class="field grow"><label>Description <span class="req">*</span></label><input class="input" id="tf-desc" value="' + U.esc(t.description) + '"><div class="err-msg" data-e="desc" hidden></div></div>' +
        '</div>' +
        '<div class="form-row">' +
        '  <div class="field"><label>Duty rate %</label><input class="input" id="tf-duty" type="number" min="0" max="100" step="0.5" value="' + t.dutyRate + '"><div class="err-msg" data-e="duty" hidden></div></div>' +
        '  <div class="field"><label>Excise rate %</label><input class="input" id="tf-excise" type="number" min="0" max="100" step="0.5" value="' + t.exciseRate + '"><div class="err-msg" data-e="excise" hidden></div></div>' +
        '  <div class="field"><label>VAT treatment</label><select class="input" id="tf-vat"><option value="0"' + (t.vatExempt ? '' : ' selected') + '>Standard VAT applies</option><option value="1"' + (t.vatExempt ? ' selected' : '') + '>VAT-exempt heading</option></select></div>' +
        '</div>',
      footer: '<button class="btn ghost" data-act="cancel">Cancel</button><button class="btn" data-act="save" data-autofocus>' + (existing ? 'Save line' : 'Add line') + '</button>',
      onMount: function (box, close) {
        box.querySelector('[data-act="cancel"]').addEventListener('click', function () { close(null); });
        box.querySelector('[data-act="save"]').addEventListener('click', function () {
          var code = $('#tf-code', box).value.trim().toUpperCase();
          var v = { code: code, description: $('#tf-desc', box).value.trim(), dutyRate: Number($('#tf-duty', box).value), exciseRate: Number($('#tf-excise', box).value), vatExempt: $('#tf-vat', box).value === '1' };
          var errs = {};
          if (!/^\d{4}(\.\d{2}){1,3}$/.test(code)) errs.code = 'Use HS format like 8703.23.00.';
          else if (A.App.db.tariff.some(function (x) { return x.code === code && (!existing || x !== existing); })) errs.code = 'This HS code already exists.';
          if (!v.description) errs.desc = 'Description is required.';
          if (!(v.dutyRate >= 0 && v.dutyRate <= 100)) errs.duty = '0–100.';
          if (!(v.exciseRate >= 0 && v.exciseRate <= 100)) errs.excise = '0–100.';
          showErrs(box, errs);
          if (Object.keys(errs).length) return;
          if (existing) Object.assign(existing, v);
          else A.App.db.tariff.push(v);
          A.persist();
          U.toast('Tariff saved.');
          close(true);
          if (afterSave) afterSave(); else refresh();
        });
      }
    });
  }

  function openHsPicker(lineIdx, onPick) {
    bind();
    var chosen = null;
    U.modal({
      title: 'Pick HS tariff line',
      wide: true,
      body:
        '<div class="field"><input class="input" id="hs-search" placeholder="Filter by code or description…" data-autofocus></div>' +
        '<div class="table-scroll" style="max-height:46vh; border:1px solid var(--line); border-radius:6px" id="hs-list"></div>',
      footer: '<button class="btn ghost" data-act="cancel">Cancel</button><button class="btn" data-act="ok">Use selected code</button>',
      onMount: function (box, close) {
        var listEl = $('#hs-list', box), q = $('#hs-search', box);
        function renderList() {
          var query = q.value.trim().toLowerCase();
          var rows = A.App.db.tariff.filter(function (t) {
            return !query || (t.code + ' ' + t.description).toLowerCase().indexOf(query) !== -1;
          }).slice(0, 300);
          listEl.innerHTML = '<table class="tbl"><thead><tr><th>HS code</th><th>Description</th><th class="num">Duty %</th><th class="num">Excise %</th><th>VAT</th></tr></thead><tbody>' +
            rows.map(function (t, i) {
              return '<tr class="hs-row" data-code="' + U.esc(t.code) + '" style="cursor:pointer' + (chosen === t.code ? ';background:var(--hover)' : '') + '">' +
                '<td class="mono">' + U.esc(t.code) + '</td><td>' + U.esc(t.description) + '</td>' +
                '<td class="num">' + t.dutyRate + '</td><td class="num">' + t.exciseRate + '</td>' +
                '<td>' + (t.vatExempt ? 'Exempt' : 'Standard') + '</td></tr>';
            }).join('') +
            '</tbody></table>' + (rows.length ? '' : '<div class="empty" style="padding:18px"><p>No tariff line matches.</p></div>');
          $$('.hs-row', listEl).forEach(function (tr) {
            tr.addEventListener('click', function () {
              chosen = tr.getAttribute('data-code');
              $$('.hs-row', listEl).forEach(function (x) { x.style.background = ''; });
              tr.style.background = 'var(--hover)';
            });
            tr.addEventListener('dblclick', function () { chosen = tr.getAttribute('data-code'); close(chosen); });
          });
        }
        q.addEventListener('input', renderList);
        renderList();
        box.querySelector('[data-act="cancel"]').addEventListener('click', function () { close(null); });
        box.querySelector('[data-act="ok"]').addEventListener('click', function () {
          if (!chosen) { U.toast('Select a tariff line first.', 'err'); return; }
          close(chosen);
        });
      }
    })._onClose = function (v) { if (v && onPick) onPick(v); };
  }

  /* ================= CSV builders ================= */

  function entriesCsv(list) {
    bind();
    var org = A.App.db.org;
    var rows = list.map(function (r) {
      var c = r.computed || A.computeFor(r.entry);
      var paid = C.paidFor(r.entry.id, A.App.db.payments);
      return [r.entry.ref, r.clientName, r.entry.mode, C.label(r.entry.status), r.entry.transportRef, r.entry.originCountry,
        r.entry.currency, r.entry.fxRate, c.goods, c.cifCur, c.cifBase, c.duty, c.excise, c.vat, c.otherCharges, c.fee, c.totalDue, paid, C.round2(c.totalDue - paid)];
    });
    return C.toCsv(
      ['Ref', 'Client', 'Mode', 'Status', 'Transport doc', 'Origin', 'Currency', 'FX rate', 'FOB (base)', 'CIF (entry cur)', 'CIF (base)', 'Duty', 'Excise', 'VAT', 'Local charges', 'Agency fee', 'Total due', 'Paid', 'Balance'],
      rows);
  }

  function statementCsv(clientId) {
    bind();
    var db = A.App.db;
    var client = A.clientById(clientId);
    var led = C.clientLedger(clientId, db.entries, db.payments, A.tariffIdx(), db.org);
    var events = [];
    led.rows.forEach(function (r) {
      var date = r.entry.assessedDate || r.entry.lodgedDate || (r.entry.createdAt || '').slice(0, 10) || A.todayIso();
      events.push({ date: date, ref: r.entry.ref, desc: 'Clearance ' + r.entry.ref + ' — duties, taxes, charges & agency fee', debit: r.billed, credit: 0 });
    });
    db.payments.filter(function (p) { return p.clientId === clientId; }).forEach(function (p) {
      var e = p.entryId ? A.entryById(p.entryId) : null;
      events.push({ date: p.date, ref: e ? e.ref : 'ACCOUNT', desc: 'Payment received — ' + p.method + (p.note ? ' (' + p.note + ')' : ''), debit: 0, credit: p.amount });
    });
    events.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var running = 0;
    var rows = events.map(function (ev) {
      running = C.round2(running + ev.debit - ev.credit);
      return [ev.date, ev.ref, ev.desc, ev.debit ? ev.debit.toFixed(2) : '', ev.credit ? ev.credit.toFixed(2) : '', running.toFixed(2)];
    });
    rows.push(['', '', 'CLOSING BALANCE', led.billed.toFixed(2), led.paid.toFixed(2), led.balance.toFixed(2)]);
    return C.toCsv(['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'], rows) ;
  }

  /* ================= view: entries list ================= */

  function viewEntries(el) {
    bind();
    var f = A.App.filters;
    var db = A.App.db;
    var clients = db.clients;

    var clientOptions = '<option value="">All clients</option>' + clients.map(function (c) {
      return '<option value="' + c.id + '"' + (f.client === c.id ? ' selected' : '') + '>' + U.esc(c.name) + '</option>';
    }).join('');
    var statusOptions = '<option value="">All statuses</option>' + C.STATUS_ORDER.map(function (s) {
      return '<option value="' + s + '"' + (f.status === s ? ' selected' : '') + '>' + C.label(s) + '</option>';
    }).join('');

    el.innerHTML =
      '<div class="page-head"><div><div class="page-title">Entries</div><div class="page-sub">Clearance files from intake to release. Press <kbd>N</kbd> for a new entry.</div></div>' +
      '<div class="btn-row"><button class="btn ghost" id="e-export">Export CSV</button><button class="btn" id="e-new">+ New entry</button></div></div>' +
      '<div class="filters">' +
      '  <div class="field grow"><label>Search</label><input class="input" id="f-q" placeholder="Ref, client, BL/AWB, notes…" value="' + U.esc(f.q) + '"></div>' +
      '  <div class="field"><label>Status</label><select class="input" id="f-status">' + statusOptions + '</select></div>' +
      '  <div class="field"><label>Client</label><select class="input" id="f-client">' + clientOptions + '</select></div>' +
      '  <div class="field"><label>Mode</label><select class="input" id="f-mode"><option value="">All modes</option>' + Object.keys(C.MODES).map(function (m) { return '<option value="' + m + '"' + (f.mode === m ? ' selected' : '') + '>' + C.MODES[m].label + '</option>'; }).join('') + '</select></div>' +
      '  <div class="field"><label>&nbsp;</label><label class="checkline" style="padding:7px 0"><input type="checkbox" id="f-unpaid"' + (f.unpaid ? ' checked' : '') + '> Outstanding only</label></div>' +
      '  <div class="field"><label>&nbsp;</label><button class="btn ghost" id="f-clear">Clear</button></div>' +
      '</div>' +
      '<div class="card"><div class="card-body flush"><div class="table-scroll" id="entries-table"></div></div></div>';

    function filtered() {
      var q = f.q.trim().toLowerCase();
      var rows = db.entries.map(function (e) {
        return { entry: e, client: A.clientById(e.clientId), computed: A.computeFor(e), paid: C.paidFor(e.id, db.payments) };
      });
      rows = rows.filter(function (r) {
        if (q && C.entrySearchText(r.entry, r.client).indexOf(q) === -1) return false;
        if (f.status && r.entry.status !== f.status) return false;
        if (f.client && r.entry.clientId !== f.client) return false;
        if (f.mode && r.entry.mode !== f.mode) return false;
        if (f.unpaid && (r.entry.status === 'cancelled' || C.round2(r.computed.totalDue - r.paid) <= 0.009)) return false;
        return true;
      });
      var dir = f.dir === 'asc' ? 1 : -1;
      var keyFn = {
        ref: function (r) { return r.entry.ref; },
        client: function (r) { return (r.client ? r.client.name : '').toLowerCase(); },
        total: function (r) { return r.computed.totalDue; },
        balance: function (r) { return C.round2(r.computed.totalDue - r.paid); },
        status: function (r) { return C.STATUS_ORDER.indexOf(r.entry.status); },
        updated: function (r) { return r.entry.updatedAt || r.entry.createdAt || ''; }
      }[f.sort] || function (r) { return r.entry.updatedAt || ''; };
      rows.sort(function (a, b) {
        var ka = keyFn(a), kb = keyFn(b);
        return ka < kb ? -dir : ka > kb ? dir : 0;
      });
      return rows;
    }

    function renderTable() {
      var rows = filtered();
      var org = db.org;
      function th(key, label, numCls) {
        var ind = f.sort === key ? U.sortIndicator(f.dir) : '';
        return '<th class="sortable' + (numCls ? ' num' : '') + '" data-sort="' + key + '">' + label + ind + '</th>';
      }
      $('#entries-table', el).innerHTML = rows.length ? (
        '<table class="tbl"><thead><tr>' +
        th('ref', 'Ref') + '<th>Client</th><th>Mode</th>' +
        th('total', 'Total due', true) + th('balance', 'Balance', true) +
        th('status', 'Status') + th('updated', 'Updated') +
        '</tr></thead><tbody>' +
        rows.map(function (r) {
          var bal = C.round2(r.computed.totalDue - r.paid);
          return '<tr data-go="#/entries/' + r.entry.id + '" style="cursor:pointer">' +
            '<td><a class="ref" href="#/entries/' + r.entry.id + '">' + U.esc(r.entry.ref) + '</a><div class="cell-sub">' + U.esc(r.entry.transportRef || '—') + '</div></td>' +
            '<td>' + U.esc(r.client ? r.client.name : '—') + '</td>' +
            '<td>' + U.modeChip(r.entry.mode) + '</td>' +
            '<td class="num">' + U.money(r.computed.totalDue, org.currency) + '</td>' +
            '<td class="num">' + (bal > 0.009 ? U.money(bal, org.currency) : '<span class="dim">settled</span>') + '</td>' +
            '<td>' + U.statusChip(r.entry.status) + '</td>' +
            '<td class="small muted nowrap">' + U.timeAgo(r.entry.updatedAt || r.entry.createdAt) + '</td>' +
            '</tr>';
        }).join('') +
        '</tbody></table>'
      ) : U.emptyState('No entries match', 'Adjust the filters or clear them to see the full pipeline.', '<button class="btn ghost" id="empty-clear">Clear filters</button>');

      $$('[data-go]', $('#entries-table', el)).forEach(function (tr) {
        tr.addEventListener('click', function (e) {
          if (e.target.closest('a')) return;
          go(tr.getAttribute('data-go'));
        });
      });
      var ec = $('#empty-clear', el);
      if (ec) ec.addEventListener('click', clearFilters);
      $$('th[data-sort]', el).forEach(function (h) {
        h.addEventListener('click', function () {
          var k = h.getAttribute('data-sort');
          if (f.sort === k) f.dir = f.dir === 'asc' ? 'desc' : 'asc';
          else { f.sort = k; f.dir = k === 'ref' || k === 'client' ? 'asc' : 'desc'; }
          renderTable();
        });
      });
    }

    function clearFilters() {
      f.q = ''; f.status = ''; f.client = ''; f.mode = ''; f.unpaid = false;
      $('#f-q', el).value = ''; $('#f-status', el).value = ''; $('#f-client', el).value = ''; $('#f-mode', el).value = '';
      $('#f-unpaid', el).checked = false;
      renderTable();
    }

    $('#f-q', el).addEventListener('input', function (e) { f.q = e.target.value; renderTable(); });
    $('#f-status', el).addEventListener('change', function (e) { f.status = e.target.value; renderTable(); });
    $('#f-client', el).addEventListener('change', function (e) { f.client = e.target.value; renderTable(); });
    $('#f-mode', el).addEventListener('change', function (e) { f.mode = e.target.value; renderTable(); });
    $('#f-unpaid', el).addEventListener('change', function (e) { f.unpaid = e.target.checked; renderTable(); });
    $('#f-clear', el).addEventListener('click', clearFilters);
    $('#e-new', el).addEventListener('click', function () { go('#/entries/new'); });
    $('#e-export', el).addEventListener('click', function () {
      var rows = filtered().map(function (r) { return { entry: r.entry, clientName: r.client ? r.client.name : '', computed: r.computed }; });
      var ok = U.download('cleardesk-entries-' + A.todayIso() + '.csv', entriesCsv(rows), 'text/csv;charset=utf-8');
      if (ok) U.toast('Exported ' + rows.length + ' entries to CSV.');
    });
    renderTable();
  }

  /* ================= view: entry editor ================= */

  function viewEntry(el, route) {
    bind();
    var db = A.App.db;
    var isNew = route.id === 'new';
    var stored = isNew ? null : A.entryById(route.id);
    if (!isNew && !stored) {
      el.innerHTML = U.emptyState('Entry not found', 'It may have been deleted.', '<a class="btn ghost" href="#/entries">Back to entries</a>');
      return;
    }

    var draft;
    if (isNew) {
      draft = {
        id: null, ref: C.nextRef(db.entries), clientId: route.params ? (route.params.get('client') || '') : '',
        mode: 'sea', transportRef: '', incoterm: 'FOB', originCountry: '', arrivalDate: '',
        currency: 'USD', fxRate: 1, freight: 0, insurance: 0,
        charges: { port: 0, handling: 0, transport: 0, other: 0 },
        feeMode: 'percent', feePercent: db.org.feePercent, feeValue: 0,
        lines: [], docs: [], status: 'new', notes: '',
        lodgedDate: '', assessedDate: '', paidDate: '', releasedDate: '', deliveredDate: '', closedDate: '', cancelledReason: ''
      };
      C.ensureDocs(draft);
    } else {
      draft = A.deep(stored);
      C.ensureDocs(draft);
    }
    A.markDraft(draft);

    var readOnly = draft.status === 'cancelled' || draft.status === 'closed';
    var clientOpts = '<option value="">— choose client —</option>' + db.clients.map(function (cl) {
      return '<option value="' + cl.id + '"' + (draft.clientId === cl.id ? ' selected' : '') + '>' + U.esc(cl.name) + '</option>';
    }).join('');

    el.innerHTML =
      '<div class="page-head">' +
      '  <div class="grow"><div class="page-title">' + (isNew ? 'New entry' : U.esc(draft.ref)) + ' <span id="dirty-flag" class="tiny dim" hidden>· unsaved changes</span></div>' +
      '  <div class="page-sub flex">' + (isNew ? 'Draft clearance file' : 'Status: ') + (isNew ? '' : U.statusChip(draft.status)) +
      (readOnly ? ' <span class="chip">Read-only</span>' : '') + '</div></div>' +
      '  <div class="btn-row" id="head-actions">' +
      '    <button class="btn ghost" id="bt-cancel">Back</button>' +
      (readOnly ? '' : '<button class="btn" id="bt-save">Save entry</button>') +
      '  </div>' +
      '</div>' +

      (readOnly && draft.status === 'cancelled' ? '<div class="notice">This entry was cancelled — ' + U.esc(draft.cancelledReason || 'no reason recorded') + '. The file is read-only.</div>' : '') +
      '<div id="save-errors" hidden></div>' +

      '<div class="grid-2">' +
      '  <div>' +
      '    <fieldset class="fs"><legend>Shipment</legend>' +
      '      <div class="form-row">' +
      '        <div class="field"><label>Entry reference <span class="req">*</span></label><input class="input mono" data-f="ref" value="' + U.esc(draft.ref) + '"' + (readOnly ? ' disabled' : '') + '></div>' +
      '        <div class="field"><label>Client <span class="req">*</span></label><select class="input" data-f="clientId"' + (readOnly ? ' disabled' : '') + '>' + clientOpts + '</select></div>' +
      '        <div class="field"><label>Mode <span class="req">*</span></label><select class="input" data-f="mode"' + (readOnly ? ' disabled' : '') + '>' + Object.keys(C.MODES).map(function (m) { return '<option value="' + m + '"' + (draft.mode === m ? ' selected' : '') + '>' + C.MODES[m].label + '</option>'; }).join('') + '</select></div>' +
      '      </div>' +
      '      <div class="form-row">' +
      '        <div class="field"><label>BL / AWB / CMR no.</label><input class="input mono" data-f="transportRef" value="' + U.esc(draft.transportRef) + '" placeholder="Transport document ref"></div>' +
      '        <div class="field"><label>Incoterm</label><select class="input" data-f="incoterm">' + C.INCOTERMS.map(function (t) { return '<option' + (draft.incoterm === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
      '        <div class="field"><label>Origin country</label><input class="input" data-f="originCountry" value="' + U.esc(draft.originCountry) + '"></div>' +
      '        <div class="field"><label>Arrival date</label><input class="input" type="date" data-f="arrivalDate" value="' + U.esc(draft.arrivalDate) + '"></div>' +
      '      </div>' +
      '    </fieldset>' +

      '    <fieldset class="fs"><legend>Cargo lines</legend>' +
      '      <div class="table-scroll" id="lines-wrap"></div>' +
      '      <div class="btn-row mt"><button class="btn ghost small" id="bt-add-line" ' + (readOnly ? 'disabled' : '') + '>+ Add cargo line</button></div>' +
      '    </fieldset>' +

      '    <fieldset class="fs"><legend>Documents <span id="docs-chip"></span></legend>' +
      '      <div id="docs-list"></div>' +
      (readOnly ? '' : '<div class="btn-row mt"><button class="btn ghost small" id="bt-docs-all">Mark all received</button><button class="btn ghost small" id="bt-docs-clear">Clear received</button></div>') +
      '    </fieldset>' +

      '    <fieldset class="fs"><legend>Notes</legend>' +
      '      <div class="field"><textarea class="input" data-f="notes" rows="2" placeholder="Internal notes, follow-ups, query responses…">' + U.esc(draft.notes) + '</textarea></div>' +
      '    </fieldset>' +
      '  </div>' +

      '  <div>' +
      '    <div class="card" id="compute-card"></div>' +
      (readOnly ? '' :
      '    <div class="card mt"><div class="card-head"><div class="card-title">Status</div></div><div class="card-body">' +
      '      <div class="btn-row" id="status-actions"></div>' +
      '      <div class="hint mt">Lodging is blocked until every required document is received and the cargo lines are valued.</div>' +
      '    </div></div>') +
      (isNew ? '' :
      '    <div class="card mt"><div class="card-head"><div class="card-title">Timeline</div>' +
      '      <div class="btn-row"><button class="btn ghost small" id="bt-print-comp">Computation sheet</button><button class="btn ghost small" id="bt-print-entry">Entry summary</button></div></div>' +
      '      <div class="card-body"><ul class="timeline" id="timeline-list"></ul></div>' +
      '    </div>') +
      (isNew || readOnly ? '' :
      '    <div class="card mt"><div class="card-head"><div class="card-title">File actions</div></div><div class="card-body btn-row">' +
      '      <button class="btn ghost small" id="bt-pay">Record payment</button>' +
      '      <button class="btn danger small" id="bt-delete" ' + (A.isManager() ? '' : 'disabled title="Manager role required"') + '>Delete entry</button>' +
      '    </div></div>') +
      '  </div>' +
      '</div>';

    /* ---- rendering helpers ---- */

    function renderLines(lineErrors) {
      lineErrors = lineErrors || [];
      var wrap = $('#lines-wrap', el);
      if (!draft.lines.length) {
        wrap.innerHTML = '<div class="empty" style="padding:20px"><h3>No cargo lines</h3><p>Add the goods on this declaration, then pick an HS code for each line.</p></div>';
        return;
      }
      wrap.innerHTML = '<table class="tbl lines-table"><thead><tr>' +
        '<th class="col-hs">HS code</th><th class="col-desc">Description</th><th class="col-pkg">Pkgs</th><th class="col-unit">Pkg unit</th><th class="col-w">Kg</th><th class="col-qty">Qty</th><th class="col-price">Unit price</th><th class="col-ext num">Value</th><th class="col-rm"></th>' +
        '</tr></thead><tbody>' +
        draft.lines.map(function (l, i) {
          var le = lineErrors[i] || {};
          var t = A.tariffIdx()[l.hsCode];
          var ext = C.round2(C.num(l.qty, 0) * C.num(l.unitPrice, 0));
          return '<tr>' +
            '<td class="col-hs"><div class="col-hs-wrap"><input class="mono" data-lf="hsCode" data-li="' + i + '" value="' + U.esc(l.hsCode) + '" readonly placeholder="pick…" title="' + U.esc(t ? t.description : '') + '">' +
            '<button type="button" class="icon-btn" data-pick="' + i + '" title="Pick HS code" aria-label="Pick HS code">⋯</button></div>' +
            (le.hsCode ? '<span class="line-err">' + U.esc(le.hsCode) + '</span>' : '') + '</td>' +
            '<td class="col-desc"><input data-lf="desc" data-li="' + i + '" value="' + U.esc(l.desc) + '">' + (le.desc ? '<span class="line-err">' + U.esc(le.desc) + '</span>' : '') + '</td>' +
            '<td class="col-pkg"><input type="number" min="0" data-lf="packages" data-li="' + i + '" value="' + U.esc(l.packages) + '"></td>' +
            '<td class="col-unit"><input data-lf="pkgUnit" data-li="' + i + '" value="' + U.esc(l.pkgUnit) + '"></td>' +
            '<td class="col-w"><input type="number" min="0" step="0.1" data-lf="weight" data-li="' + i + '" value="' + U.esc(l.weight) + '"></td>' +
            '<td class="col-qty"><input type="number" min="0" step="0.01" data-lf="qty" data-li="' + i + '" value="' + U.esc(l.qty) + '">' + (le.qty ? '<span class="line-err">' + U.esc(le.qty) + '</span>' : '') + '</td>' +
            '<td class="col-price"><input type="number" min="0" step="0.01" data-lf="unitPrice" data-li="' + i + '" value="' + U.esc(l.unitPrice) + '">' + (le.unitPrice ? '<span class="line-err">' + U.esc(le.unitPrice) + '</span>' : '') + '</td>' +
            '<td class="num" data-ext="' + i + '">' + U.money(ext, draft.currency) + '</td>' +
            '<td class="col-rm"><button type="button" class="icon-btn" data-rm="' + i + '" title="Remove line" aria-label="Remove line ' + (i + 1) + '">✕</button></td>' +
            '</tr>';
        }).join('') +
        '</tbody></table>';

      $$('[data-pick]', wrap).forEach(function (b) {
        b.addEventListener('click', function () {
          var i = Number(b.getAttribute('data-pick'));
          openHsPicker(i, function (code) {
            draft.lines[i].hsCode = code;
            renderLines();
            updateCompute();
            syncDirty();
          });
        });
      });
      $$('[data-rm]', wrap).forEach(function (b) {
        b.addEventListener('click', function () {
          var i = Number(b.getAttribute('data-rm'));
          draft.lines.splice(i, 1);
          renderLines();
          updateCompute();
          syncDirty();
        });
      });
      $$('[data-lf]', wrap).forEach(function (inp) {
        inp.addEventListener('input', function () {
          var i = Number(inp.getAttribute('data-li')), fld = inp.getAttribute('data-lf');
          var numeric = fld === 'packages' || fld === 'weight' || fld === 'qty' || fld === 'unitPrice';
          draft.lines[i][fld] = numeric ? Number(inp.value) : inp.value;
          if (fld === 'qty' || fld === 'unitPrice') {
            var extCell = $('[data-ext="' + i + '"]', wrap);
            if (extCell) extCell.textContent = U.money(C.round2(C.num(draft.lines[i].qty, 0) * C.num(draft.lines[i].unitPrice, 0)), draft.currency);
          }
          updateCompute();
          syncDirty();
        });
      });
    }

    function renderDocs() {
      var list = $('#docs-list', el);
      var ds = C.docsStatus(draft);
      $('#docs-chip', el).innerHTML = ' <span class="chip' + (ds.complete ? ' fill' : ' dark-outline') + '">' + ds.receivedRequired + '/' + ds.requiredCount + ' required received</span>';
      list.innerHTML = draft.docs.map(function (d, i) {
        return '<div class="doc-row">' +
          '<input type="checkbox" data-doc-i="' + i + '"' + (d.received ? ' checked' : '') + (readOnly ? ' disabled' : '') + ' aria-label="Received: ' + U.esc(d.label) + '">' +
          '<div class="doc-name">' + U.esc(d.label) + (d.required ? '<span class="req-tag">required</span>' : '') + (d.received ? '<span class="ok-tag">received</span>' : '') + '</div>' +
          '<input class="input" data-doc-ref="' + i + '" placeholder="Doc reference" value="' + U.esc(d.ref) + '"' + (readOnly ? ' disabled' : '') + '>' +
          '<span class="tiny dim">' + (d.received ? '✓' : '') + '</span>' +
          '</div>';
      }).join('');
      $$('[data-doc-i]', list).forEach(function (cb) {
        cb.addEventListener('change', function () {
          draft.docs[Number(cb.getAttribute('data-doc-i'))].received = cb.checked;
          renderDocs();
          updateCompute();
          syncDirty();
        });
      });
      $$('[data-doc-ref]', list).forEach(function (inp) {
        inp.addEventListener('input', function () {
          draft.docs[Number(inp.getAttribute('data-doc-ref'))].ref = inp.value;
          syncDirty();
        });
      });
    }

    function renderCompute() {
      var comp = A.computeFor(draft);
      var org = db.org;
      var paid = draft.id ? C.paidFor(draft.id, db.payments) : 0;
      var bal = C.round2(comp.totalDue - paid);
      var c = $('#compute-card', el);
      c.innerHTML =
        '<div class="card-head"><div class="card-title">Computation <span class="tiny dim">live</span></div>' +
        '<span class="tiny dim">' + U.esc(draft.currency) + ' @ ' + U.esc(String(draft.fxRate || 0)) + '</span></div>' +
        '<div class="card-body">' +
        '  <div class="kv"><span class="k">FOB goods value</span><span class="v">' + U.money(comp.goods, org.currency) + '</span></div>' +
        '  <div class="kv"><span class="k">Freight + insurance</span><span class="v">' + U.money(comp.freight + comp.insurance, org.currency) + '</span></div>' +
        '  <div class="kv"><span class="k">CIF (entry currency)</span><span class="v">' + U.money(comp.cifCur, draft.currency) + '</span></div>' +
        '  <div class="kv"><span class="k">CIF (converted)</span><span class="v">' + U.money(comp.cifBase, org.currency) + '</span></div>' +
        '  <hr>' +
        '  <div class="kv"><span class="k">Import duty</span><span class="v">' + U.money(comp.duty, org.currency) + '</span></div>' +
        '  <div class="kv"><span class="k">Excise</span><span class="v">' + U.money(comp.excise, org.currency) + '</span></div>' +
        '  <div class="kv"><span class="k">VAT @ ' + org.vatRate + '%</span><span class="v">' + U.money(comp.vat, org.currency) + '</span></div>' +
        '  <div class="kv"><span class="k">Local charges (port/handling/transport)</span><span class="v">' + U.money(comp.otherCharges, org.currency) + '</span></div>' +
        '  <div class="kv"><span class="k">Disbursements</span><span class="v">' + U.money(comp.disbursements, org.currency) + '</span></div>' +
        '  <div class="kv"><span class="k">Agency fee' + (comp.feePercentApplied != null ? ' (' + comp.feePercentApplied + '% of CIF)' : ' (flat)') + '</span><span class="v">' + U.money(comp.fee, org.currency) + '</span></div>' +
        '  <div class="kv total"><span class="k">Total due from client</span><span class="v">' + U.money(comp.totalDue, org.currency) + '</span></div>' +
        (draft.id ? '<div class="kv"><span class="k">Paid to date</span><span class="v">' + U.money(paid, org.currency) + '</span></div>' +
        '  <div class="kv total"><span class="k">Balance</span><span class="v">' + U.money(bal, org.currency) + '</span></div>' : '') +
        (comp.warnings.length ? '<ul class="warn-list">' + comp.warnings.map(function (w) { return '<li>' + U.esc(w) + '</li>'; }).join('') + '</ul>' : '') +
        '</div>';
    }

    function renderStatusActions() {
      var wrap = $('#status-actions', el);
      if (!wrap) return;
      wrap.innerHTML = A.statusActionButtons(draft);
      $$('[data-status]', wrap).forEach(function (b) {
        b.addEventListener('click', function () { onStatus(b.getAttribute('data-status')); });
      });
    }

    function renderTimeline() {
      var list = $('#timeline-list', el);
      if (!list) return;
      var tl = (draft.timeline || []).slice().sort(function (a, b) { return a.ts < b.ts ? 1 : -1; });
      list.innerHTML = tl.length ? tl.map(function (t, i) {
        return '<li class="tl-item' + (i === 0 ? ' first' : '') + '"><span class="tl-dot"></span><div class="tl-text">' + U.esc(t.text) + '</div><div class="tl-meta">' + U.esc(t.who) + ' · ' + U.esc(U.fmtDateTime(t.ts)) + '</div></li>';
      }).join('') : '<li class="tl-item first"><span class="tl-dot"></span><div class="tl-text dim">No activity yet — the timeline starts when the entry is saved.</div></li>';
    }

    function syncDirty() {
      var flag = $('#dirty-flag', el);
      if (flag) flag.hidden = !A.draftDirty();
    }

    function updateCompute() {
      renderCompute();
      var ds = C.docsStatus(draft);
      $('#docs-chip', el).innerHTML = ' <span class="chip' + (ds.complete ? ' fill' : ' dark-outline') + '">' + ds.receivedRequired + '/' + ds.requiredCount + ' required received</span>';
      renderStatusActions();
      syncDirty();
    }

    /* ---- field wiring ---- */

    var NUM_FIELDS = { fxRate: 1, freight: 1, insurance: 1, feePercent: 1, feeValue: 1 };
    $$('[data-f]', el).forEach(function (inp) {
      inp.addEventListener('input', function () {
        var fld = inp.getAttribute('data-f');
        if (NUM_FIELDS[fld]) draft[fld] = Number(inp.value);
        else draft[fld] = inp.value;
        if (fld === 'currency') renderLines();
        if (fld === 'feeMode') {
          $('[data-feewrap="percent"]', el).hidden = draft.feeMode !== 'percent';
          $('[data-feewrap="flat"]', el).hidden = draft.feeMode !== 'flat';
        }
        updateCompute();
      });
      inp.addEventListener('change', function () {
        var fld = inp.getAttribute('data-f');
        if (fld === 'mode' && !readOnly) {
          C.ensureDocs(draft);
          renderDocs();
          updateCompute();
          U.toast('Document checklist updated for ' + C.MODES[draft.mode].label.toLowerCase() + ' freight.');
        }
        updateCompute();
      });
    });

    $('#bt-add-line', el).addEventListener('click', function () {
      draft.lines.push({ id: C.uid('l'), hsCode: '', desc: '', packages: 1, pkgUnit: 'cartons', weight: 0, qty: 0, unitPrice: 0 });
      renderLines();
      updateCompute();
      var inputs = $$('#lines-wrap [data-li="' + (draft.lines.length - 1) + '"]', el);
      if (inputs[1]) inputs[1].focus();
    });

    var docsAllBtn = $('#bt-docs-all', el), docsClearBtn = $('#bt-docs-clear', el);
    if (docsAllBtn) docsAllBtn.addEventListener('click', function () {
      draft.docs.forEach(function (d) { d.received = true; });
      renderDocs(); updateCompute();
    });
    if (docsClearBtn) docsClearBtn.addEventListener('click', function () {
      draft.docs.forEach(function (d) { d.received = false; });
      renderDocs(); updateCompute();
    });

    /* ---- save & validation ---- */

    function vctx() {
      return {
        clients: db.clients,
        existingRefs: db.entries.filter(function (e) { return !draft.id || e.id !== draft.id; }).map(function (e) { return e.ref; }),
        tariffIdx: A.tariffIdx()
      };
    }

    function showSaveErrors(v) {
      var box = $('#save-errors', el);
      var msgs = [];
      Object.keys(v.errors).forEach(function (k) { msgs.push(v.errors[k]); });
      v.lineErrors.forEach(function (le, i) {
        if (le) Object.keys(le).forEach(function (k) { msgs.push('Cargo line ' + (i + 1) + ': ' + le[k]); });
      });
      if (!msgs.length) { box.hidden = true; box.innerHTML = ''; return; }
      box.hidden = false;
      box.innerHTML = '<div class="notice"><b>' + msgs.length + ' problem' + (msgs.length > 1 ? 's' : '') + ' to fix:</b><ul style="margin:6px 0 0 18px">' + msgs.map(function (m) { return '<li>' + U.esc(m) + '</li>'; }).join('') + '</ul></div>';
      box.scrollIntoView({ block: 'nearest' });
    }

    function saveDraft() {
      var v = C.validateEntry(draft, vctx());
      showSaveErrors(v);
      if (!v.ok) { U.toast('Fix the highlighted problems before saving.', 'err'); return false; }
      var now = new Date().toISOString();
      var user = cur();
      if (!draft.id) {
        draft.id = C.uid('e');
        draft.createdAt = now;
        draft.createdBy = user.id;
        draft.updatedAt = now;
        draft.timeline = [{ ts: now, who: user.name, action: 'create', text: 'Entry created' }];
        db.entries.push(draft);
        A.clearDraft();
        A.persist();
        U.toast('Entry ' + draft.ref + ' created.');
        location.hash = '#/entries/' + draft.id;
        return true;
      }
      var storedE = A.entryById(draft.id);
      var before = A.deep(storedE);
      ['ref', 'clientId', 'mode', 'transportRef', 'incoterm', 'originCountry', 'arrivalDate', 'currency', 'fxRate',
       'freight', 'insurance', 'charges', 'feeMode', 'feePercent', 'feeValue', 'lines', 'docs', 'notes', 'cancelledReason']
        .forEach(function (k) { storedE[k] = draft[k]; });
      storedE.updatedAt = now;
      var b2 = A.deep(storedE);
      delete b2.updatedAt; delete before.updatedAt;
      if (JSON.stringify(before) !== JSON.stringify(b2)) {
        storedE.timeline = (storedE.timeline || []).concat([{ ts: now, who: user.name, action: 'edit', text: 'Entry details updated' }]);
      }
      A.clearDraft();
      A.persist();
      U.toast('Entry saved.');
      A.rerender();
      return true;
    }

    $('#bt-save', el).addEventListener('click', function () { saveDraft(); });
    $('#bt-cancel', el).addEventListener('click', function () { go('#/entries'); });

    /* ---- status transitions ---- */

    function onStatus(to) {
      var v = C.validateEntry(draft, vctx());
      showSaveErrors(v);
      if (!v.ok) { U.toast('Fix the highlighted problems before changing status.', 'err'); return; }
      if (!saveDraft()) return;
      var entry = A.entryById(draft.id);
      var comp = A.computeFor(entry);
      var user = cur();
      var res = C.canTransition(entry, to, { computed: comp });

      if (!res.ok && res.confirm === 'zero') {
        U.confirmDialog({
          title: 'No duties payable?',
          message: 'The assessed amount on this entry is zero. Confirm that no duties or taxes are payable (e.g. exempt goods, charges only).',
          confirmLabel: 'Confirm — no duties payable'
        }).then(function (yes) {
          if (!yes) return;
          var r2 = C.canTransition(entry, to, { computed: comp, confirmZero: true });
          if (r2.ok) finish(r2, null);
          else U.alertDialog('Cannot change status', U.esc(r2.reason));
        });
        return;
      }
      if (!res.ok && res.confirm === 'reason') {
        U.promptDialog({
          title: 'Cancel entry', label: 'Cancellation reason (for the audit trail)',
          required: true, requiredMsg: 'A reason is required.', confirmLabel: 'Cancel entry',
          hint: 'The entry becomes read-only and its line items are excluded from all ledgers and reports.'
        }).then(function (reason) {
          if (reason == null) return;
          var r2 = C.canTransition(entry, to, { computed: comp, reason: reason });
          if (r2.ok) finish(r2, reason);
          else U.alertDialog('Cannot change status', U.esc(r2.reason));
        });
        return;
      }
      if (!res.ok) { U.alertDialog('Cannot change status', U.esc(res.reason)); return; }
      finish(res, null);

      function finish(_res, reason) {
        var upd = C.applyTransition(entry, to, { userName: user.name, reason: reason || '' });
        Object.keys(upd).forEach(function (k) { entry[k] = upd[k]; });
        A.persist();
        U.toast('Status: ' + C.label(entry.status));
        A.clearDraft();
        A.rerender();
      }
    }

    /* ---- file actions ---- */

    var payBtn = $('#bt-pay', el);
    if (payBtn) payBtn.addEventListener('click', function () { openPaymentModal(draft.id); });

    var delBtn = $('#bt-delete', el);
    if (delBtn) delBtn.addEventListener('click', function () {
      if (!A.isManager()) { U.toast('Manager role required.', 'err'); return; }
      var linked = A.App.db.payments.filter(function (p) { return p.entryId === draft.id; }).length;
      U.confirmDialog({
        title: 'Delete entry ' + draft.ref + '?',
        message: 'This permanently removes the clearance file' + (linked ? ' and its ' + linked + ' payment record' + (linked > 1 ? 's' : '') : '') + '. Consider cancelling it instead to keep the audit trail.',
        confirmLabel: 'Delete entry', danger: true
      }).then(function (yes) {
        if (!yes) return;
        A.App.db.entries = A.App.db.entries.filter(function (e) { return e.id !== draft.id; });
        A.App.db.payments = A.App.db.payments.filter(function (p) { return p.entryId !== draft.id; });
        A.clearDraft();
        A.persist();
        U.toast('Entry deleted.');
        A.nav('#/entries');
        A.rerender();
      });
    });

    /* ---- print ---- */

    var pc = $('#bt-print-comp', el);
    if (pc) pc.addEventListener('click', function () { printSheet(draft.id, 'computation'); });
    var pe = $('#bt-print-entry', el);
    if (pe) pe.addEventListener('click', function () { printSheet(draft.id, 'entry'); });

    /* ---- initial paint ---- */
    renderLines();
    renderDocs();
    updateCompute();
    renderTimeline();
  }

  /* ================= print sheets ================= */

  function printSheet(entryId, kind) {
    bind();
    var db = A.App.db, org = db.org;
    var e = A.entryById(entryId);
    if (!e) return;
    var cl = A.clientById(e.clientId) || {};
    var comp = A.computeFor(e);
    var ds = C.docsStatus(e);
    var title = kind === 'computation' ? 'Duty &amp; Tax Computation' : 'Customs Entry Summary';
    var packages = e.lines.reduce(function (s, l) { return s + C.num(l.packages, 0); }, 0);
    var weight = e.lines.reduce(function (s, l) { return s + C.num(l.weight, 0); }, 0);

    var box = function (k, v) { return '<div class="box"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'; };
    var kv = function (k, v, total) { return '<div class="kv' + (total ? ' total' : '') + '"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; };

    var linesRows = comp.lines.map(function (l, i) {
      if (kind === 'computation') {
        return '<tr><td>' + (i + 1) + '</td><td class="mono">' + U.esc(l.hsCode) + '</td><td>' + U.esc(l.desc) + '</td>' +
          '<td class="num">' + U.numFmt(l.qty, 0) + '</td><td class="num">' + U.numFmt(l.unitPrice, 2) + '</td>' +
          '<td class="num">' + U.numFmt(l.extValue, 2) + '</td><td class="num">' + U.numFmt(l.cifBase, 2) + '</td>' +
          '<td class="num">' + l.dutyRate + '%</td><td class="num">' + U.numFmt(l.duty, 2) + '</td><td class="num">' + U.numFmt(l.excise, 2) + '</td></tr>';
      }
      return '<tr><td>' + (i + 1) + '</td><td class="mono">' + U.esc(l.hsCode) + '</td><td>' + U.esc(l.desc) + '</td>' +
        '<td>' + U.esc(l.pkgUnit) + '</td><td class="num">' + U.numFmt(l.packages, 0) + '</td><td class="num">' + U.numFmt(l.weight, 0) + '</td>' +
        '<td class="num">' + U.numFmt(l.qty, 0) + '</td><td class="num">' + U.numFmt(l.unitPrice, 2) + '</td><td class="num">' + U.numFmt(l.extValue, 2) + '</td></tr>';
    }).join('');

    var docsHtml = (e.docs || []).map(function (d) {
      return '<div style="font-size:11px;margin:2px 0">' + (d.received ? '☑' : '☐') + ' ' + U.esc(d.label) + (d.ref ? ' — ' + U.esc(d.ref) : '') + '</div>';
    }).join('');

    var html =
      '<div class="sheet">' +
      '<div class="sh-head"><div><div class="sh-org">' + U.esc(org.name) + '</div>' +
      '<div class="sh-meta">' + U.esc(org.address) + ' · ' + U.esc(org.email) + ' · ' + U.esc(org.phone) + ' · Customs licence ' + U.esc(org.licenseNo) + '</div></div>' +
      '<div style="text-align:right"><div class="sh-title">' + title + '</div><div class="sh-ref">' + U.esc(e.ref) + '</div>' +
      '<div class="sh-meta">Printed ' + U.fmtDate(A.todayIso()) + '</div></div></div>' +

      '<div class="box-grid">' +
      box('Client', U.esc(cl.name || '—') + '<br><span style="font-weight:400;font-size:10px">Tax ID ' + U.esc(cl.taxId || '—') + '</span>') +
      box('Transport mode', C.MODES[e.mode] ? C.MODES[e.mode].label : e.mode) +
      box('Transport doc', U.esc(e.transportRef || '—') + '<br><span style="font-weight:400;font-size:10px">' + U.esc(e.incoterm) + ' · ' + U.esc(e.originCountry || '—') + '</span>') +
      box('Currency & FX', U.esc(e.currency) + ' @ ' + U.esc(String(e.fxRate))) +
      box('Packages / weight', U.numFmt(packages, 0) + ' pkgs · ' + U.numFmt(weight, 0) + ' kg') +
      box('Arrival', U.fmtDate(e.arrivalDate)) +
      box('Lodged', U.fmtDate(e.lodgedDate)) +
      box('Assessed / released', U.fmtDate(e.assessedDate) + ' / ' + U.fmtDate(e.releasedDate)) +
      '</div>' +

      '<table><thead><tr>' +
      (kind === 'computation'
        ? '<th>#</th><th>HS code</th><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">FOB value</th><th class="num">Allocated CIF</th><th class="num">Duty %</th><th class="num">Duty</th><th class="num">Excise</th>'
        : '<th>#</th><th>HS code</th><th>Description of goods</th><th>Unit</th><th class="num">Pkgs</th><th class="num">Kg</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Value</th>') +
      '</tr></thead><tbody>' + (linesRows || '<tr><td colspan="10">No cargo lines.</td></tr>') + '</tbody></table>' +

      '<div class="tot-grid">' +
      '<div class="tot-box"><b>Valuation</b>' +
      kv('FOB goods value', U.money(comp.goods, org.currency)) +
      kv('Freight', U.money(comp.freight, org.currency)) +
      kv('Insurance', U.money(comp.insurance, org.currency)) +
      kv('CIF — entry currency (' + U.esc(e.currency) + ')', U.money(comp.cifCur, e.currency)) +
      kv('CIF — ' + U.esc(org.currency), U.money(comp.cifBase, org.currency)) +
      '</div>' +
      '<div class="tot-box"><b>Duties, taxes &amp; fees</b>' +
      kv('Import duty', U.money(comp.duty, org.currency)) +
      kv('Excise', U.money(comp.excise, org.currency)) +
      kv('VAT @ ' + org.vatRate + '%', U.money(comp.vat, org.currency)) +
      kv('Local charges', U.money(comp.otherCharges, org.currency)) +
      kv('Agency fee', U.money(comp.fee, org.currency)) +
      kv('TOTAL DUE FROM CLIENT', U.money(comp.totalDue, org.currency), true) +
      '</div>' +
      '</div>' +

      '<div style="margin-top:16px"><b style="font-size:11px;text-transform:uppercase;letter-spacing:.08em">Document checklist — ' + ds.receivedRequired + '/' + ds.requiredCount + ' required received</b>' + docsHtml + '</div>' +

      '<div class="sign-row"><div class="sign">Declared by (client) — name, signature, date</div><div class="sign">For ' + U.esc(org.name) + ' — clearing officer, signature, date</div></div>' +
      '<div class="sh-foot">' + (kind === 'entry' ? 'I declare that the particulars given above are true and complete and that the goods described qualify under the stated tariff headings. ' : '') +
      'Generated by ClearDesk · entry ' + U.esc(e.ref) + ' · status: ' + U.esc(C.label(e.status)) + ' · indicative tariff rates — verify against the current gazetted schedule.</div>' +
      '</div>';
    U.printHtml(html);
  }

  /* ================= view: clients ================= */

  function viewClients(el) {
    bind();
    var db = A.App.db;
    el.innerHTML =
      '<div class="page-head"><div><div class="page-title">Clients</div><div class="page-sub">Importers and exporters on the book, with permit validity and account standing.</div></div>' +
      '<button class="btn" id="c-new">+ New client</button></div>' +
      '<div class="filters"><div class="field grow"><label>Search</label><input class="input" id="c-q" placeholder="Name, code, tax ID, country…"></div></div>' +
      '<div class="card"><div class="card-body flush"><div class="table-scroll" id="clients-table"></div></div></div>';

    function renderTable() {
      var q = ($('#c-q', el).value || '').trim().toLowerCase();
      var rows = db.clients.filter(function (c) {
        return !q || (c.name + ' ' + c.code + ' ' + c.taxId + ' ' + c.country).toLowerCase().indexOf(q) !== -1;
      }).map(function (c) {
        var led = C.clientLedger(c.id, db.entries, db.payments, A.tariffIdx(), db.org);
        var count = db.entries.filter(function (e) { return e.clientId === c.id; }).length;
        return { c: c, led: led, count: count };
      });
      $('#clients-table', el).innerHTML = rows.length ? '<table class="tbl"><thead><tr>' +
        '<th>Code</th><th>Client</th><th>Tax ID</th><th>Terms</th><th class="num">Balance</th><th>Permit</th><th class="num">Files</th>' +
        '</tr></thead><tbody>' +
        rows.map(function (r) {
          return '<tr data-go="#/clients/' + r.c.id + '" style="cursor:pointer">' +
            '<td class="mono small">' + U.esc(r.c.code) + '</td>' +
            '<td><b>' + U.esc(r.c.name) + '</b><div class="cell-sub">' + U.esc(r.c.country) + (r.c.email ? ' · ' + U.esc(r.c.email) : '') + '</div></td>' +
            '<td class="mono small">' + U.esc(r.c.taxId) + '</td>' +
            '<td class="small">' + U.esc(C.PAY_TERMS[r.c.terms] || r.c.terms) + '</td>' +
            '<td class="num">' + (r.led.balance > 0.009 ? U.money(r.led.balance, db.org.currency) : '<span class="dim">settled</span>') + '</td>' +
            '<td>' + U.permitChip(r.c, A.todayIso(), C) + '</td>' +
            '<td class="num">' + r.count + '</td></tr>';
        }).join('') + '</tbody></table>'
        : U.emptyState('No clients', 'Add your first importer or exporter to start clearing.', '<button class="btn" id="c-empty-new">+ New client</button>');
      $$('[data-go]', $('#clients-table', el)).forEach(function (tr) {
        tr.addEventListener('click', function () { go(tr.getAttribute('data-go')); });
      });
      var nb = $('#c-empty-new', el);
      if (nb) nb.addEventListener('click', function () { openClientModal(null); });
    }
    $('#c-q', el).addEventListener('input', renderTable);
    $('#c-new', el).addEventListener('click', function () { openClientModal(null); });
    renderTable();
  }

  /* ================= view: client detail ================= */

  function viewClient(el, route) {
    bind();
    var db = A.App.db;
    var c = A.clientById(route.id);
    if (!c) { el.innerHTML = U.emptyState('Client not found', 'It may have been deleted.', '<a class="btn ghost" href="#/clients">Back to clients</a>'); return; }
    var led = C.clientLedger(c.id, db.entries, db.payments, A.tariffIdx(), db.org);
    var ps = C.permitStatus(c, A.todayIso());

    el.innerHTML =
      '<div class="page-head"><div><div class="page-title">' + U.esc(c.name) + '</div>' +
      '<div class="page-sub">' + U.esc(c.code) + ' · Tax ID ' + U.esc(c.taxId) + ' · ' + U.esc(c.country) + ' · ' + U.esc(C.PAY_TERMS[c.terms] || c.terms) + ' · ' + U.permitChip(c, A.todayIso(), C) + '</div></div>' +
      '<div class="btn-row"><button class="btn ghost" id="cd-edit">Edit client</button>' +
      '<button class="btn ghost" id="cd-pay">Record payment</button>' +
      '<button class="btn" id="cd-newentry">+ New entry</button></div></div>' +

      '<div class="kpis">' +
      '  <div class="kpi"><div class="kpi-num">' + U.money(led.billed, db.org.currency) + '</div><div class="kpi-label">Billed to date</div></div>' +
      '  <div class="kpi"><div class="kpi-num">' + U.money(led.paid, db.org.currency) + '</div><div class="kpi-label">Collected</div></div>' +
      '  <div class="kpi"><div class="kpi-num">' + U.money(led.balance, db.org.currency) + '</div><div class="kpi-label">Outstanding balance</div></div>' +
      '  <div class="kpi"><div class="kpi-num">' + led.rows.length + '</div><div class="kpi-label">Clearance files</div></div>' +
      '</div>' +

      (ps.state === 'expired' || ps.state === 'expiring' ?
        '<div class="notice">Permit <b>' + U.esc(c.permitType) + '</b> ' + (ps.state === 'expired' ? 'expired on ' + U.fmtDate(c.permitExpiry) + ' — goods for this client cannot be lodged until it is renewed.' : 'expires on ' + U.fmtDate(c.permitExpiry) + ' — remind the client to renew.') + '</div>' : '') +

      '<div class="grid-r">' +
      '  <div class="card"><div class="card-head"><div class="card-title">Clearance files</div></div><div class="card-body flush"><div class="table-scroll">' +
      (led.rows.length ? '<table class="tbl"><thead><tr><th>Ref</th><th>Status</th><th class="num">Billed</th><th class="num">Paid</th><th class="num">Balance</th></tr></thead><tbody>' +
        led.rows.map(function (r) {
          return '<tr data-go="#/entries/' + r.entry.id + '" style="cursor:pointer"><td><a class="ref" href="#/entries/' + r.entry.id + '">' + U.esc(r.entry.ref) + '</a> ' + U.modeChip(r.entry.mode) + '</td>' +
            '<td>' + U.statusChip(r.entry.status) + '</td><td class="num">' + U.money(r.billed, db.org.currency) + '</td>' +
            '<td class="num">' + U.money(r.paid, db.org.currency) + '</td>' +
            '<td class="num">' + (r.balance > 0.009 ? U.money(r.balance, db.org.currency) : '<span class="dim">—</span>') + '</td></tr>';
        }).join('') + '</tbody></table>'
        : U.emptyState('No files yet', 'Create the first clearance entry for this client.', '')) +
      '  </div></div></div>' +

      '  <div class="card"><div class="card-head"><div class="card-title">Payments</div><button class="btn ghost small" id="cd-stmt">Statement CSV</button></div><div class="card-body flush">' +
      (db.payments.filter(function (p) { return p.clientId === c.id; }).length ?
        '<div class="table-scroll"><table class="tbl"><thead><tr><th>Date</th><th>Entry</th><th>Method</th><th class="num">Amount</th></tr></thead><tbody>' +
        db.payments.filter(function (p) { return p.clientId === c.id; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }).map(function (p) {
          var e = p.entryId ? A.entryById(p.entryId) : null;
          return '<tr><td>' + U.fmtDate(p.date) + '</td><td class="mono small">' + U.esc(e ? e.ref : 'account') + '</td><td class="small">' + U.esc(p.method) + '</td><td class="num">' + U.money(p.amount, db.org.currency) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="empty" style="padding:24px"><h3>No payments yet</h3><p>Recorded payments appear here and on the client statement.</p></div>') +
      '  </div></div>' +

      '  <div class="card"><div class="card-head"><div class="card-title">Profile</div></div><div class="card-body small">' +
      '    <div class="kv"><span class="k">Email</span><span class="v" style="font-weight:500">' + U.esc(c.email || '—') + '</span></div>' +
      '    <div class="kv"><span class="k">Phone</span><span class="v" style="font-weight:500">' + U.esc(c.phone || '—') + '</span></div>' +
      '    <div class="kv"><span class="k">Permit</span><span class="v" style="font-weight:500">' + U.esc(c.permitType || '—') + '</span></div>' +
      '    <div class="kv"><span class="k">Client since</span><span class="v" style="font-weight:500">' + U.fmtDate(c.createdAt) + '</span></div>' +
      (c.notes ? '<hr><p class="muted">' + U.esc(c.notes) + '</p>' : '') +
      (A.isManager() ? '<div class="btn-row mt"><button class="btn danger small" id="cd-delete">Delete client</button></div>' : '') +
      '  </div></div>' +
      '</div>';

    $$('[data-go]', el).forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        go(tr.getAttribute('data-go'));
      });
    });
    $('#cd-edit', el).addEventListener('click', function () { openClientModal(c); });
    $('#cd-pay', el).addEventListener('click', function () { openPaymentModal(null, c.id); });
    $('#cd-newentry', el).addEventListener('click', function () { go('#/entries/new?client=' + c.id); });
    $('#cd-stmt', el).addEventListener('click', function () {
      var ok = U.download('statement-' + c.code + '-' + A.todayIso() + '.csv', statementCsv(c.id), 'text/csv;charset=utf-8');
      if (ok) U.toast('Statement exported.');
    });
    var del = $('#cd-delete', el);
    if (del) del.addEventListener('click', function () {
      var n = db.entries.filter(function (e) { return e.clientId === c.id; }).length;
      if (n > 0) { U.alertDialog('Cannot delete client', U.esc(c.name + ' still has ' + n + ' clearance file' + (n > 1 ? 's' : '') + '. Reassign or delete those entries first.')); return; }
      U.confirmDialog({ title: 'Delete ' + c.name + '?', message: 'The client record will be removed from the directory.', confirmLabel: 'Delete client', danger: true })
        .then(function (yes) {
          if (!yes) return;
          db.clients = db.clients.filter(function (x) { return x.id !== c.id; });
          db.payments = db.payments.filter(function (p) { return p.clientId !== c.id; });
          A.persist();
          U.toast('Client deleted.');
          A.nav('#/clients');
          A.rerender();
        });
    });
  }

  /* ================= view: tariff ================= */

  function viewTariff(el) {
    bind();
    var db = A.App.db;
    var manager = A.isManager();
    el.innerHTML =
      '<div class="page-head"><div><div class="page-title">Tariff schedule</div><div class="page-sub">HS headings used for classification and duty computation.</div></div>' +
      '<div class="btn-row"><button class="btn ghost" id="t-export">Export CSV</button>' + (manager ? '<button class="btn" id="t-new">+ Add HS line</button>' : '') + '</div></div>' +
      '<div class="notice">Rates below are <b>indicative demo values</b> — replace them with your customs authority\'s gazetted schedule. Duty is charged on the value-allocated CIF per line; VAT applies on CIF + duty + excise unless a heading is exempt.</div>' +
      '<div class="filters"><div class="field grow"><label>Search</label><input class="input" id="t-q" placeholder="HS code or description…"></div></div>' +
      '<div class="card"><div class="card-body flush"><div class="table-scroll" id="t-table"></div></div></div>';

    function usage(code) {
      var n = 0;
      db.entries.forEach(function (e) { e.lines.forEach(function (l) { if (l.hsCode === code) n++; }); });
      return n;
    }
    function renderTable() {
      var q = ($('#t-q', el).value || '').trim().toLowerCase();
      var rows = db.tariff.filter(function (t) { return !q || (t.code + ' ' + t.description).toLowerCase().indexOf(q) !== -1; });
      $('#t-table', el).innerHTML = rows.length ? '<table class="tbl"><thead><tr><th>HS code</th><th>Description</th><th class="num">Duty %</th><th class="num">Excise %</th><th>VAT</th><th class="num">Lines in use</th>' + (manager ? '<th></th>' : '') + '</tr></thead><tbody>' +
        rows.map(function (t) {
          return '<tr><td class="mono"><b>' + U.esc(t.code) + '</b></td><td>' + U.esc(t.description) + '</td>' +
            '<td class="num">' + t.dutyRate + '</td><td class="num">' + t.exciseRate + '</td>' +
            '<td>' + (t.vatExempt ? '<span class="chip">Exempt</span>' : '<span class="chip dark-outline">Standard</span>') + '</td>' +
            '<td class="num">' + usage(t.code) + '</td>' +
            (manager ? '<td><div class="btn-row"><button class="icon-btn" data-edit="' + U.esc(t.code) + '" title="Edit">✎</button><button class="icon-btn" data-del="' + U.esc(t.code) + '" title="Delete">✕</button></div></td>' : '') +
            '</tr>';
        }).join('') + '</tbody></table>'
        : U.emptyState('No tariff lines', 'Add the HS headings you clear most often.', manager ? '<button class="btn" id="t-empty-new">+ Add HS line</button>' : '');
      $$('[data-edit]', el).forEach(function (b) {
        b.addEventListener('click', function () {
          var t = db.tariff.filter(function (x) { return x.code === b.getAttribute('data-edit'); })[0];
          if (t) openTariffModal(t);
        });
      });
      $$('[data-del]', el).forEach(function (b) {
        b.addEventListener('click', function () {
          var code = b.getAttribute('data-del');
          var used = usage(code);
          if (used > 0) { U.alertDialog('Cannot delete HS line', U.esc(code + ' is used by ' + used + ' cargo line' + (used > 1 ? 's' : '') + '. Remove those lines first.')); return; }
          U.confirmDialog({ title: 'Delete ' + code + '?', message: 'The tariff line will be removed from the schedule.', confirmLabel: 'Delete', danger: true })
            .then(function (yes) {
              if (!yes) return;
              db.tariff = db.tariff.filter(function (x) { return x.code !== code; });
              A.persist();
              U.toast('Tariff line deleted.');
              renderTable();
            });
        });
      });
      var nb = $('#t-empty-new', el);
      if (nb) nb.addEventListener('click', function () { openTariffModal(null); });
    }
    $('#t-q', el).addEventListener('input', renderTable);
    var newBtn = $('#t-new', el);
    if (newBtn) newBtn.addEventListener('click', function () { openTariffModal(null); });
    $('#t-export', el).addEventListener('click', function () {
      var ok = U.download('tariff-' + A.todayIso() + '.csv', C.toCsv(
        ['HS code', 'Description', 'Duty %', 'Excise %', 'VAT exempt'],
        db.tariff.map(function (t) { return [t.code, t.description, t.dutyRate, t.exciseRate, t.vatExempt ? 'yes' : 'no']; })), 'text/csv;charset=utf-8');
      if (ok) U.toast('Tariff exported.');
    });
    renderTable();
  }

  /* ================= view: ledger ================= */

  function viewLedger(el) {
    bind();
    var db = A.App.db;
    var idx = A.tariffIdx();
    var org = db.org;

    var rows = db.entries.filter(function (e) { return e.status !== 'cancelled'; }).map(function (e) {
      var comp = A.computeFor(e);
      var paid = C.paidFor(e.id, db.payments);
      return { entry: e, client: A.clientById(e.clientId), billed: comp.totalDue, paid: paid, balance: C.round2(comp.totalDue - paid), age: C.entryAgeDays(e, A.todayIso()) };
    });
    var billed = C.round2(rows.reduce(function (s, r) { return s + r.billed; }, 0));
    var paidT = C.round2(rows.reduce(function (s, r) { return s + r.paid; }, 0));
    var outstanding = C.round2(billed - paidT);
    var aging = C.agingFor(db.entries, db.payments, idx, org, A.todayIso());
    var overdue = C.round2(aging['31-60'] + aging['61-90'] + aging['90+']);
    var maxAge = Math.max(1, aging['0-30'], aging['31-60'], aging['61-90'], aging['90+']);

    var payments = db.payments.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 30);

    el.innerHTML =
      '<div class="page-head"><div><div class="page-title">Disbursement ledger</div><div class="page-sub">Duties, taxes, charges and agency fees advanced on behalf of clients — and what is still to recover.</div></div>' +
      '<div class="btn-row"><button class="btn ghost" id="l-export">Balances CSV</button><button class="btn" id="l-pay">Record payment</button></div></div>' +

      '<div class="kpis">' +
      '  <div class="kpi"><div class="kpi-num">' + U.money(billed, org.currency) + '</div><div class="kpi-label">Total billed</div></div>' +
      '  <div class="kpi"><div class="kpi-num">' + U.money(paidT, org.currency) + '</div><div class="kpi-label">Collected</div></div>' +
      '  <div class="kpi"><div class="kpi-num">' + U.money(outstanding, org.currency) + '</div><div class="kpi-label">Outstanding</div></div>' +
      '  <div class="kpi"><div class="kpi-num">' + U.money(overdue, org.currency) + '</div><div class="kpi-label">Overdue &gt; 30 days</div></div>' +
      '</div>' +

      '<div class="card mb"><div class="card-head"><div class="card-title">Receivables aging</div></div><div class="card-body"><div class="aging-grid">' +
      [['0-30', 'Current'], ['31-60', '31–60 days'], ['61-90', '61–90 days'], ['90+', '90+ days']].map(function (b) {
        return '<div class="aging-cell' + (b[0] !== '0-30' && aging[b[0]] > 0 ? ' over' : '') + '"><b>' + U.money(aging[b[0]], org.currency) + '</b><div class="lbl">' + b[1] + '</div></div>';
      }).join('') +
      '</div></div></div>' +

      '<div class="filters">' +
      '  <div class="field grow"><label>Client</label><select class="input" id="l-client"><option value="">All clients</option>' + db.clients.map(function (c) { return '<option value="' + c.id + '">' + U.esc(c.name) + '</option>'; }).join('') + '</select></div>' +
      '  <div class="field"><label>&nbsp;</label><label class="checkline" style="padding:7px 0"><input type="checkbox" id="l-out" checked> Outstanding only</label></div>' +
      '</div>' +
      '<div class="card mb"><div class="card-body flush"><div class="table-scroll" id="l-table"></div></div></div>' +

      '<div class="card"><div class="card-head"><div class="card-title">Payment history</div><span class="tiny dim">last ' + payments.length + '</span></div><div class="card-body flush">' +
      (payments.length ? '<div class="table-scroll"><table class="tbl"><thead><tr><th>Date</th><th>Client</th><th>Entry</th><th>Method</th><th>Note</th><th class="num">Amount</th></tr></thead><tbody>' +
        payments.map(function (p) {
          var cl = A.clientById(p.clientId);
          var e = p.entryId ? A.entryById(p.entryId) : null;
          return '<tr><td>' + U.fmtDate(p.date) + '</td><td>' + U.esc(cl ? cl.name : '—') + '</td>' +
            '<td>' + (e ? '<a class="ref" href="#/entries/' + e.id + '">' + U.esc(e.ref) + '</a>' : '<span class="dim">account</span>') + '</td>' +
            '<td class="small">' + U.esc(p.method) + '</td><td class="small dim">' + U.esc(p.note || '') + '</td>' +
            '<td class="num">' + U.money(p.amount, org.currency) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : U.emptyState('No payments recorded', 'Use “Record payment” to log collections against entries.', '')) +
      '</div></div>';

    function renderTable() {
      var cid = $('#l-client', el).value;
      var onlyOut = $('#l-out', el).checked;
      var list = rows.filter(function (r) {
        if (cid && r.entry.clientId !== cid) return false;
        if (onlyOut && r.balance <= 0.009) return false;
        return true;
      });
      $('#l-table', el).innerHTML = list.length ? '<table class="tbl"><thead><tr><th>Ref</th><th>Client</th><th>Status</th><th class="num">Billed</th><th class="num">Paid</th><th class="num">Balance</th><th class="num">Age</th></tr></thead><tbody>' +
        list.map(function (r) {
          return '<tr data-go="#/entries/' + r.entry.id + '" style="cursor:pointer">' +
            '<td><a class="ref" href="#/entries/' + r.entry.id + '">' + U.esc(r.entry.ref) + '</a></td>' +
            '<td>' + U.esc(r.client ? r.client.name : '—') + '</td>' +
            '<td>' + U.statusChip(r.entry.status) + '</td>' +
            '<td class="num">' + U.money(r.billed, org.currency) + '</td>' +
            '<td class="num">' + U.money(r.paid, org.currency) + '</td>' +
            '<td class="num">' + (r.balance > 0.009 ? '<b>' + U.money(r.balance, org.currency) + '</b>' : '<span class="dim">settled</span>') + '</td>' +
            '<td class="num' + (r.balance > 0.009 && r.age > 30 ? '' : ' muted') + '">' + (r.balance > 0.009 ? r.age + 'd' : '—') + '</td></tr>';
        }).join('') + '</tbody></table>'
        : U.emptyState('Nothing outstanding', 'Every billed entry has been collected — or no client is selected.', '');
      $$('[data-go]', $('#l-table', el)).forEach(function (tr) {
        tr.addEventListener('click', function (e) { if (e.target.closest('a')) return; go(tr.getAttribute('data-go')); });
      });
    }
    $('#l-client', el).addEventListener('change', renderTable);
    $('#l-out', el).addEventListener('change', renderTable);
    $('#l-pay', el).addEventListener('click', function () { openPaymentModal(null); });
    $('#l-export', el).addEventListener('click', function () {
      var ok = U.download('ledger-' + A.todayIso() + '.csv', C.toCsv(
        ['Ref', 'Client', 'Status', 'Billed', 'Paid', 'Balance', 'Age days', 'Aging bucket'],
        rows.map(function (r) {
          return [r.entry.ref, r.client ? r.client.name : '', C.label(r.entry.status), r.billed.toFixed(2), r.paid.toFixed(2), r.balance.toFixed(2), r.age, C.agingBucket(r.age)];
        })), 'text/csv;charset=utf-8');
      if (ok) U.toast('Ledger exported.');
    });
    renderTable();
  }

  /* ================= view: reports ================= */

  function viewReports(el) {
    bind();
    var db = A.App.db;
    var idx = A.tariffIdx();
    var org = db.org;
    var months = C.lastMonths(6, A.todayIso());
    var series = C.monthlyDuty(db.entries, months, idx, org);
    var maxSeries = Math.max(1, series.reduce(function (m, s) { return Math.max(m, s.duty + s.vat + s.fee); }, 0));

    var totals = C.clientTotals(db.entries, db.payments, idx, org);
    var top = db.clients.map(function (c) { return { c: c, total: totals[c.id] || 0 }; })
      .sort(function (a, b) { return b.total - a.total; }).slice(0, 6);
    var maxTop = Math.max(1, top[0] ? top[0].total : 0);

    var kpis = C.computeKpis(db.entries, db.payments, idx, org, A.todayIso());
    var maxStatus = Math.max(1, Math.max.apply(null, C.STATUS_ORDER.map(function (s) { return kpis.byStatus[s] || 0; })));

    var aging = C.agingFor(db.entries, db.payments, idx, org, A.todayIso());
    var dutyTotal = C.round2(series.reduce(function (s, m) { return s + m.duty + m.vat; }, 0));

    el.innerHTML =
      '<div class="page-head"><div><div class="page-title">Reports</div><div class="page-sub">Where the work and the money are, over the last six months.</div></div>' +
      '<div class="btn-row"><button class="btn ghost" id="r-export">Monthly CSV</button></div></div>' +

      '<div class="kpis">' +
      '  <div class="kpi"><div class="kpi-num">' + U.money(dutyTotal, org.currency) + '</div><div class="kpi-label">Duty + VAT (6 mo)</div></div>' +
      '  <div class="kpi"><div class="kpi-num">' + db.entries.length + '</div><div class="kpi-label">Total entries</div></div>' +
      '  <div class="kpi"><div class="kpi-num">' + kpis.activeCount + '</div><div class="kpi-label">Active now</div></div>' +
      '</div>' +

      '<div class="grid-r">' +
      '  <div class="card"><div class="card-head"><div class="card-title">Duties &amp; taxes by month</div></div><div class="card-body">' +
      series.map(function (m) {
        return U.barRow(m.month, m.duty, maxSeries, '', U.money(m.duty, org.currency)) +
               U.barRow('· VAT', m.vat, maxSeries, 'l2', U.money(m.vat, org.currency)) +
               U.barRow('· Agency fee', m.fee, maxSeries, 'l3', U.money(m.fee, org.currency));
      }).join('') +
      '  </div></div>' +

      '  <div class="card"><div class="card-head"><div class="card-title">Top clients by billed</div></div><div class="card-body">' +
      top.map(function (r) {
        return U.barRow(r.c.name, r.total, maxTop, '', U.money(r.total, org.currency));
      }).join('') +
      '  </div></div>' +

      '  <div class="card"><div class="card-head"><div class="card-title">Pipeline by status</div></div><div class="card-body">' +
      C.STATUS_ORDER.map(function (s) { return U.barRow(C.label(s), kpis.byStatus[s] || 0, maxStatus, s === 'cancelled' ? 'l3' : '', String(kpis.byStatus[s] || 0)); }).join('') +
      '  </div></div>' +
      '</div>' +

      '<div class="card mt"><div class="card-head"><div class="card-title">Receivables aging</div><a class="tiny linklike" href="#/ledger">Open ledger →</a></div><div class="card-body"><div class="aging-grid">' +
      [['0-30', 'Current'], ['31-60', '31–60 days'], ['61-90', '61–90 days'], ['90+', '90+ days']].map(function (b) {
        return '<div class="aging-cell' + (b[0] !== '0-30' && aging[b[0]] > 0 ? ' over' : '') + '"><b>' + U.money(aging[b[0]], org.currency) + '</b><div class="lbl">' + b[1] + '</div></div>';
      }).join('') +
      '</div></div></div>';

    $('#r-export', el).addEventListener('click', function () {
      var ok = U.download('monthly-report-' + A.todayIso() + '.csv', C.toCsv(
        ['Month', 'Duty + excise', 'VAT', 'Agency fee'],
        series.map(function (m) { return [m.month, m.duty.toFixed(2), m.vat.toFixed(2), m.fee.toFixed(2)]; })), 'text/csv;charset=utf-8');
      if (ok) U.toast('Report exported.');
    });
  }

  return {
    viewEntries: viewEntries, viewEntry: viewEntry, viewClients: viewClients, viewClient: viewClient,
    viewTariff: viewTariff, viewLedger: viewLedger, viewReports: viewReports,
    openClientModal: openClientModal, openPaymentModal: openPaymentModal, openTariffModal: openTariffModal,
    printSheet: printSheet, statementCsv: statementCsv, entriesCsv: entriesCsv, go: go
  };
})();
