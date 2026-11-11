/* ============================================================
   ClearDesk — core domain test suite.
   Browser: Settings → Diagnostics → "Run tests" (window.CDTests).
   Node:    node assets/core.test.js
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'), require('./seed.js'));
  else root.CDTests = factory(root.CDCore, root.CDSeed);
})(typeof self !== 'undefined' ? self : this, function (C, Seed) {
  'use strict';

  var tests = [];
  function t(name, fn) { tests.push({ name: name, fn: fn }); }
  function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
  function eq(a, b, msg) { if (a !== b) throw new Error((msg || 'eq') + ' — got ' + JSON.stringify(a) + ' expected ' + JSON.stringify(b)); }
  function near(a, b, tol, msg) {
    if (Math.abs(a - b) > (tol == null ? 0.02 : tol)) throw new Error((msg || 'near') + ' — got ' + a + ' expected ' + b + ' (±' + (tol == null ? 0.02 : tol) + ')');
  }
  function has(arr, sub, msg) {
    var found = (arr || []).some(function (s) { return String(s).indexOf(sub) !== -1; });
    if (!found) throw new Error((msg || 'has') + ' — expected something containing "' + sub + '" in ' + JSON.stringify(arr));
  }

  var TODAY = '2026-11-11';

  /* ---------------- crypto ---------------- */

  t('sha256: empty-string vector', function () {
    eq(C.sha256(C.utf8('')), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
  t('sha256: "abc" vector', function () {
    eq(C.sha256(C.utf8('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  t('sha256: long ASCII vector', function () {
    eq(C.sha256(C.utf8('The quick brown fox jumps over the lazy dog')),
       'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592');
  });
  t('sha256: multi-block input (64+ bytes)', function () {
    var s = '';
    for (var i = 0; i < 100; i++) s += 'a';
    eq(C.sha256(C.utf8(s)), '2816597888e4a0d3a36b82b83316ab32680eb8f00f8cd3b904d681246d285a0e');
  });
  t('utf8: encodes é as two bytes and emoji as four', function () {
    eq(C.utf8('é').length, 2);
    eq(C.utf8('😀').length, 4);
  });
  t('password hashing: verify round-trip and reject wrong password', function () {
    var salt = 's1', hash = C.hashPassword('demo1234', salt);
    assert(C.verifyPassword('demo1234', salt, hash));
    assert(!C.verifyPassword('demo1235', salt, hash));
    assert(!C.verifyPassword('demo1234', 's2', hash));
  });

  /* ---------------- computation ---------------- */

  var TARIFF = [
    { code: '1006.30.00', description: 'Rice', dutyRate: 35, exciseRate: 0, vatExempt: false },
    { code: '8703.23.00', description: 'Cars', dutyRate: 25, exciseRate: 20, vatExempt: false },
    { code: '8708.99.00', description: 'Parts', dutyRate: 25, exciseRate: 0, vatExempt: false },
    { code: '9018.39.00', description: 'Catheters', dutyRate: 0, exciseRate: 0, vatExempt: true },
    { code: '8517.13.00', description: 'Phones', dutyRate: 0, exciseRate: 10, vatExempt: false }
  ];
  var IDX = C.tariffIndex(TARIFF);
  var ORG = { vatRate: 16, feePercent: 2, currency: 'USD' };

  function mkEntry(over) {
    var e = {
      ref: 'AE/2026/9999', clientId: 'c1', mode: 'sea', currency: 'USD', fxRate: 1,
      freight: 0, insurance: 0, charges: { port: 0, handling: 0, transport: 0, other: 0 },
      feeMode: 'percent', feePercent: 2, feeValue: 0, lines: [], status: 'new'
    };
    return Object.assign(e, over || {});
  }

  t('compute: single line rice case (exact)', function () {
    var e = mkEntry({ freight: 4200, insurance: 350, charges: { port: 640, handling: 380, transport: 520, other: 0 },
      lines: [{ hsCode: '1006.30.00', qty: 800, unitPrice: 28.5 }] });
    var c = C.computeEntry(e, IDX, ORG);
    eq(c.goods, 22800, 'FOB');
    eq(c.cifCur, 27350, 'CIF cur');
    eq(c.cifBase, 27350, 'CIF base');
    eq(c.duty, 9572.5, 'duty');
    eq(c.excise, 0, 'excise');
    eq(c.vat, 5907.6, 'vat');
    eq(c.otherCharges, 1540, 'charges');
    eq(c.disbursements, 17020.1, 'disbursements');
    eq(c.fee, 547, 'fee');
    eq(c.totalDue, 17567.1, 'total due');
    eq(c.warnings.length, 0, 'no warnings');
  });

  t('compute: multi-line CIF allocation sums to CIF base', function () {
    var e = mkEntry({ freight: 6800, insurance: 900,
      lines: [
        { hsCode: '8703.23.00', qty: 2, unitPrice: 14500 },
        { hsCode: '8708.99.00', qty: 47, unitPrice: 50 }
      ] });
    var c = C.computeEntry(e, IDX, ORG);
    eq(c.goods, 31350);
    eq(c.cifBase, 39050);
    var sum = c.lines.reduce(function (s, l) { return s + l.cifBase; }, 0);
    near(sum, 39050, 0.005, 'allocated CIF sums');
    near(c.duty, 9762.5, 0.05, 'duty');
    near(c.excise, 7224.56, 0.05, 'excise');
  });

  t('compute: VAT-exempt heading pays no VAT, charges-only disbursements', function () {
    var e = mkEntry({ freight: 780, insurance: 40, charges: { port: 120, handling: 80, transport: 140, other: 0 },
      lines: [{ hsCode: '9018.39.00', qty: 24000, unitPrice: 0.42 }] });
    var c = C.computeEntry(e, IDX, ORG);
    eq(c.cifBase, 10900);
    eq(c.duty, 0);
    eq(c.vat, 0);
    eq(c.disbursements, 340);
    eq(c.fee, 218);
    eq(c.totalDue, 558);
  });

  t('compute: FX conversion to base currency', function () {
    var e = mkEntry({ currency: 'EUR', fxRate: 1.08, freight: 1800, insurance: 120,
      lines: [{ hsCode: '8517.13.00', qty: 200, unitPrice: 210 }, { hsCode: '3926.90.99', qty: 2000, unitPrice: 1.4 }] });
    var c = C.computeEntry(e, IDX, ORG);
    eq(c.cifCur, 46720);
    eq(c.cifBase, 50457.6);
    assert(c.cifBase > c.cifCur);
  });

  t('compute: flat agency fee overrides percent', function () {
    var e = mkEntry({ feeMode: 'flat', feeValue: 250, lines: [{ hsCode: '1006.30.00', qty: 10, unitPrice: 100 }] });
    var c = C.computeEntry(e, IDX, ORG);
    eq(c.fee, 250);
    eq(c.feePercentApplied, null);
  });

  t('compute: warnings for missing HS, zero qty, zero FX', function () {
    var e1 = mkEntry({ lines: [{ hsCode: '9999.99.99', qty: 1, unitPrice: 5 }] });
    has(C.computeEntry(e1, IDX, ORG).warnings, 'not in the tariff schedule');
    var e2 = mkEntry({ lines: [{ hsCode: '1006.30.00', qty: 0, unitPrice: 5 }] });
    has(C.computeEntry(e2, IDX, ORG).warnings, 'quantity 0');
    var e3 = mkEntry({ fxRate: 0, lines: [{ hsCode: '1006.30.00', qty: 1, unitPrice: 5 }] });
    has(C.computeEntry(e3, IDX, ORG).warnings, 'Exchange rate');
  });

  /* ---------------- documents ---------------- */

  t('documents: templates per mode and completeness gate', function () {
    var e = mkEntry({ mode: 'sea' });
    C.ensureDocs(e);
    eq(e.docs.length, 6);
    var ds = C.docsStatus(e);
    eq(ds.complete, false);
    e.docs[0].received = true; e.docs[1].received = true; e.docs[2].received = true;
    ds = C.docsStatus(e);
    eq(ds.complete, true, 'all required received');
    eq(ds.missingRequired, 0);
  });

  t('documents: ensureDocs preserves received refs when mode changes sea→air', function () {
    var e = mkEntry({ mode: 'sea' });
    C.ensureDocs(e);
    e.docs.forEach(function (d) { if (d.key === 'invoice') { d.received = true; d.ref = 'INV-1'; } });
    e.mode = 'air';
    C.ensureDocs(e);
    var inv = e.docs.filter(function (d) { return d.key === 'invoice'; })[0];
    assert(inv.received && inv.ref === 'INV-1', 'invoice received state preserved');
    assert(e.docs.some(function (d) { return d.key === 'awb'; }), 'air template applied');
  });

  /* ---------------- transitions ---------------- */

  function lodgedReadyEntry() {
    var e = mkEntry({ clientId: 'c1', status: 'ready', fxRate: 1,
      lines: [{ hsCode: '1006.30.00', desc: 'Rice, 25kg bags', qty: 10, unitPrice: 100 }] });
    C.ensureDocs(e);
    e.docs.forEach(function (d) { d.received = true; });
    return e;
  }

  t('transitions: invalid path rejected', function () {
    var r = C.canTransition(mkEntry({ status: 'new' }), 'paid', {});
    assert(!r.ok);
    has([r.reason], 'Cannot move');
  });

  t('transitions: lodging blocked while required documents missing', function () {
    var e = lodgedReadyEntry();
    e.docs.forEach(function (d) { if (d.key === 'packing') d.received = false; });
    var r = C.canTransition(e, 'lodged', { computed: C.computeEntry(e, IDX, ORG) });
    assert(!r.ok);
    has([r.reason], 'documents');
  });

  t('transitions: lodging allowed when complete and valued', function () {
    var e = lodgedReadyEntry();
    var r = C.canTransition(e, 'lodged', { computed: C.computeEntry(e, IDX, ORG) });
    assert(r.ok, r.reason);
  });

  t('transitions: lodging blocked without cargo lines or FX', function () {
    var e = lodgedReadyEntry();
    e.lines = [];
    var r = C.canTransition(e, 'lodged', { computed: C.computeEntry(e, IDX, ORG) });
    assert(!r.ok);
    has([r.reason], 'cargo line');
    var e2 = lodgedReadyEntry();
    e2.fxRate = 0;
    var r2 = C.canTransition(e2, 'lodged', { computed: C.computeEntry(e2, IDX, ORG) });
    assert(!r2.ok);
    has([r2.reason], 'exchange rate');
  });

  t('transitions: zero-amount assessment requires explicit confirmation', function () {
    var e = mkEntry({ status: 'assessed', lines: [] });
    var r = C.canTransition(e, 'paid', { computed: C.computeEntry(e, IDX, ORG) });
    assert(!r.ok && r.confirm === 'zero', 'zero flag raised');
    var r2 = C.canTransition(e, 'paid', { computed: C.computeEntry(e, IDX, ORG), confirmZero: true });
    assert(r2.ok);
  });

  t('transitions: cancellation requires a reason', function () {
    var e = mkEntry({ status: 'ready' });
    var r = C.canTransition(e, 'cancelled', {});
    assert(!r.ok && r.confirm === 'reason');
    var r2 = C.canTransition(e, 'cancelled', { reason: 'Cargo redirected' });
    assert(r2.ok);
  });

  t('transitions: applyTransition stamps dates and appends timeline', function () {
    var e = mkEntry({ status: 'assessed' });
    e.timeline = [{ ts: '2026-01-01T00:00:00.000Z', who: 'x', action: 'create', text: 'Entry created' }];
    var upd = C.applyTransition(e, 'paid', { now: '2026-06-01T10:00:00.000Z', userName: 'Clara' });
    eq(upd.status, 'paid');
    eq(upd.paidDate, '2026-06-01');
    eq(upd.timeline.length, 2);
    has([upd.timeline[1].text], 'Duty paid');
  });

  t('transitions: every target is a known status and labels exist', function () {
    Object.keys(C.TRANSITIONS).forEach(function (from) {
      assert(C.STATUS_META[from], 'meta for ' + from);
      C.TRANSITIONS[from].forEach(function (to) {
        assert(C.STATUS_META[to], 'meta for target ' + to);
        assert(C.TRANSITIONS[from].indexOf(to) !== -1);
      });
    });
    C.STATUS_ORDER.forEach(function (s) { assert(C.label(s) && C.label(s) !== s, 'label for ' + s); });
  });

  /* ---------------- validation ---------------- */

  t('validateEntry: required fields, ref format and duplicate refs', function () {
    var v = C.validateEntry(mkEntry({ clientId: '', ref: 'xyz' }), { tariffIdx: IDX });
    assert(!v.ok);
    assert(v.errors.clientId && v.errors.ref, 'clientId and ref errors');
    var v2 = C.validateEntry(mkEntry({ ref: 'AE/2026/0101' }), { existingRefs: ['AE/2026/0101'], tariffIdx: IDX });
    has([v2.errors.ref || ''], 'already used');
    var good = lodgedReadyEntry();
    var v3 = C.validateEntry(good, { tariffIdx: IDX });
    assert(v3.ok, JSON.stringify(v3.errors));
  });

  t('validateEntry: line-level errors reported per line', function () {
    var e = mkEntry({ clientId: 'c1', lines: [{ hsCode: '', desc: '', qty: 0, unitPrice: 5 }] });
    var v = C.validateEntry(e, { tariffIdx: IDX });
    assert(!v.ok);
    var le = v.lineErrors[0];
    assert(le && le.hsCode && le.desc && le.qty, 'line errors present');
  });

  t('validateClient: tax id, email and terms', function () {
    var bad = C.validateClient({ name: '', taxId: 'AB', email: 'nope', terms: 'weekly' }, {});
    assert(!bad.ok);
    assert(bad.errors.name && bad.errors.taxId && bad.errors.email && bad.errors.terms);
    var good = C.validateClient({ name: 'Acme Ltd', taxId: 'P051234567X', email: 'a@b.co', terms: 'credit30', permitExpiry: '' }, {});
    assert(good.ok, JSON.stringify(good.errors));
  });

  t('validatePayment: amount, balance cap and method', function () {
    var bad = C.validatePayment({ clientId: 'c1', entryId: 'e1', amount: 0, date: TODAY, method: 'Bank transfer' }, 100);
    assert(!bad.ok && bad.errors.amount);
    var over = C.validatePayment({ clientId: 'c1', entryId: 'e1', amount: 150, date: TODAY, method: 'Bank transfer' }, 100);
    assert(!over.ok && /exceeds/.test(over.errors.amount));
    var ok = C.validatePayment({ clientId: 'c1', entryId: 'e1', amount: 100, date: TODAY, method: 'Bank transfer' }, 100);
    assert(ok.ok, JSON.stringify(ok.errors));
  });

  /* ---------------- refs, dates, permits ---------------- */

  t('nextRef: continues the yearly sequence', function () {
    var entries = [{ ref: 'AE/2025/0099' }, { ref: 'AE/2026/0101' }, { ref: 'AE/2026/0113' }];
    eq(C.nextRef(entries, 2026), 'AE/2026/0114');
    eq(C.nextRef([], 2026), 'AE/2026/0001');
  });

  t('dates: daysBetween and lastMonths', function () {
    eq(C.daysBetween('2026-01-01', '2026-01-31'), 30);
    eq(C.daysBetween('2026-01-31', '2026-01-01'), -30);
    var m = C.lastMonths(3, '2026-11-11');
    eq(m.join(','), '2026-09,2026-10,2026-11');
  });

  t('permits: expired / expiring / ok / none', function () {
    eq(C.permitStatus({ permitExpiry: '2026-11-01' }, TODAY).state, 'expired');
    eq(C.permitStatus({ permitExpiry: '2026-11-21' }, TODAY).state, 'expiring');
    eq(C.permitStatus({ permitExpiry: '2027-02-09' }, TODAY).state, 'ok');
    eq(C.permitStatus({}, TODAY).state, 'none');
    eq(C.permitStatus({ permitExpiry: '2026-11-01' }, TODAY).days, -10);
  });

  /* ---------------- ledger ---------------- */

  function ledgerFixtures() {
    // 35% duty rice schedule, zero VAT/fee: billed amount = duty only
    // (FOB goods are owed to the supplier, not to the clearing agent).
    var org = { vatRate: 0, feePercent: 0 };
    var idx = C.tariffIndex([{ code: '1006.30.00', description: 'Rice', dutyRate: 35, exciseRate: 0, vatExempt: false }]);
    function shift(iso, days) {
      var d = new Date(iso + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    }
    function e(id, goods, releasedDaysAgo) {
      return { id: id, ref: 'AE/2026/0' + id, clientId: 'c1', status: 'released', currency: 'USD', fxRate: 1,
        freight: 0, insurance: 0, charges: { port: 0, handling: 0, transport: 0, other: 0 }, feeMode: 'flat', feeValue: 0,
        lines: [{ hsCode: '1006.30.00', desc: 'goods', qty: 1, unitPrice: goods }],
        releasedDate: releasedDaysAgo == null ? '' : shift(TODAY, -releasedDaysAgo) };
    }
    return { org: org, idx: idx, e: e, shift: shift };
  }

  t('ledger: client totals, payments and balance', function () {
    var F = ledgerFixtures();
    var entries = [F.e('a', 1000, 40), F.e('b', 500, 95), F.e('c', 200, 10)];
    var payments = [{ entryId: 'a', amount: 140 }, { entryId: 'c', amount: 70 }];
    var led = C.clientLedger('c1', entries, payments, F.idx, F.org);
    eq(led.billed, 595);
    eq(led.paid, 210);
    eq(led.balance, 385);
    eq(led.rows[0].balance, 210);
  });

  t('ledger: aging buckets place balances by age', function () {
    var F = ledgerFixtures();
    var entries = [F.e('a', 1000, 40), F.e('b', 500, 95), F.e('c', 200, 10)];
    var payments = [{ entryId: 'a', amount: 140 }, { entryId: 'c', amount: 70 }];
    var ag = C.agingFor(entries, payments, F.idx, F.org, TODAY);
    eq(ag['31-60'], 210);
    eq(ag['90+'], 175);
    eq(ag['0-30'], 0);
  });

  t('ledger: aging bucket boundaries', function () {
    eq(C.agingBucket(30), '0-30');
    eq(C.agingBucket(31), '31-60');
    eq(C.agingBucket(60), '31-60');
    eq(C.agingBucket(61), '61-90');
    eq(C.agingBucket(90), '61-90');
    eq(C.agingBucket(91), '90+');
  });

  t('ledger: entryAgeDays falls back through status dates', function () {
    eq(C.entryAgeDays({ releasedDate: '', assessedDate: '2026-10-12' }, '2026-11-11'), 30);
    eq(C.entryAgeDays({ releasedDate: '', assessedDate: '', createdAt: '2026-11-09T09:00:00.000Z' }, '2026-11-11'), 2);
  });

  /* ---------------- KPIs & reporting ---------------- */

  t('KPIs: status counts, collection and monthly releases', function () {
    var org = { vatRate: 0, feePercent: 0 };
    var F = ledgerFixtures();
    var entries = [
      mkEntry({ id: '1', status: 'new' }),
      mkEntry({ id: '2', status: 'awaiting_docs' }),
      mkEntry({ id: '3', status: 'lodged' }),
      mkEntry({ id: '4', status: 'query' }),
      mkEntry({ id: '5', status: 'closed' }),
      mkEntry({ id: '6', status: 'cancelled' }),
      Object.assign(F.e('7', 300, 2), { releasedDate: TODAY })
    ];
    var k = C.computeKpis(entries, [{ entryId: '1', amount: 50 }], ledgerFixtures().idx, org, TODAY);
    eq(k.activeCount, 5, 'active excludes closed/cancelled');
    eq(k.awaitingDocs, 1);
    eq(k.lodgedCount, 2);
    eq(k.releasedThisMonth, 1);
    near(k.toCollect, 105, 0.01, 'toCollect excludes cancelled and overpaid');
  });

  t('reporting: monthly series accumulates by assessed month', function () {
    var org = { vatRate: 16, feePercent: 0 };
    var e = mkEntry({ assessedDate: '2026-10-05', lines: [{ hsCode: '1006.30.00', qty: 100, unitPrice: 10 }] });
    var s = C.monthlyDuty([e], ['2026-09', '2026-10'], IDX, org);
    eq(s[0].duty, 0);
    eq(s[1].duty, 350);
    near(s[1].vat, (1000 + 350) * 0.16, 0.02);
    var s2 = C.monthlyDuty([mkEntry({ status: 'cancelled', assessedDate: '2026-10-05', lines: [{ hsCode: '1006.30.00', qty: 100, unitPrice: 10 }] })], ['2026-10'], IDX, org);
    eq(s2[0].duty, 0, 'cancelled excluded');
  });

  /* ---------------- CSV ---------------- */

  t('csv: RFC4180 quoting of commas, quotes and newlines', function () {
    var csv = C.toCsv(['a', 'b'], [['x,y', 'He said "hi"'], ['line\nbreak', 'plain']]);
    eq(csv, 'a,b\r\n"x,y","He said ""hi"""\r\n"line\nbreak",plain\r\n');
  });

  t('csv: numbers and nulls render safely', function () {
    var csv = C.toCsv(['n', 'm'], [[42.5, null]]);
    eq(csv, 'n,m\r\n42.5,\r\n');
  });

  /* ---------------- seed integrity ---------------- */

  t('seed: shape, unique refs, consistent payments', function () {
    var db = Seed.buildSeed();
    assert(db.org && Array.isArray(db.users) && db.users.length >= 2, 'users');
    assert(db.clients.length >= 6, 'clients');
    assert(db.tariff.length >= 20, 'tariff');
    assert(db.entries.length >= 10, 'entries');
    var refs = {};
    var idx = C.tariffIndex(db.tariff);
    db.entries.forEach(function (e) {
      assert(!refs[e.ref], 'unique ref ' + e.ref);
      refs[e.ref] = true;
      if (e.status !== 'new') { // fresh drafts legitimately have no cargo lines yet
        assert(C.validateEntry(e, { clients: db.clients, existingRefs: [], tariffIdx: idx }).ok,
          'seed entry passes validation: ' + e.ref);
      }
      var c = C.computeEntry(e, idx, db.org);
      var paid = C.paidFor(e.id, db.payments);
      assert(paid <= c.totalDue + 0.01, 'payment within billed for ' + e.ref);
      assert((e.timeline || []).length >= 1, 'timeline present for ' + e.ref);
    });
    assert(db.users.every(function (u) { return C.verifyPassword('demo1234', u.salt, u.passHash); }), 'demo password works for all users');
    var ag = C.agingFor(db.entries, db.payments, idx, db.org, C.todayIso());
    assert(ag['31-60'] > 0 || ag['61-90'] > 0 || ag['90+'] > 0, 'seed produces overdue receivables for aging demo');
  });

  /* ---------------- runner ---------------- */

  function run() {
    var results = [];
    for (var i = 0; i < tests.length; i++) {
      try { tests[i].fn(); results.push({ name: tests[i].name, ok: true }); }
      catch (e) { results.push({ name: tests[i].name, ok: false, error: e.message }); }
    }
    return {
      passed: results.filter(function (r) { return r.ok; }).length,
      failed: results.filter(function (r) { return !r.ok; }).length,
      results: results
    };
  }

  return { run: run, tests: tests, helpers: { assert: assert, eq: eq, near: near } };
});

if (typeof module !== 'undefined' && module.exports && require.main === module) {
  var res = module.exports.run();
  res.results.forEach(function (r) {
    console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + (r.ok ? '' : '\n      → ' + r.error));
  });
  console.log('\n' + res.passed + ' passed, ' + res.failed + ' failed');
  process.exit(res.failed ? 1 : 0);
}
