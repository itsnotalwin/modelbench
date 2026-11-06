/* ClearLink core-logic test suite. Runs in Node (run-tests.js) and the browser (tests.html). */
(function (root) {
  'use strict';
  function makeSuite(C) {
    var pass = 0, fail = 0, log = [];
    function ok(cond, name) {
      if (cond) { pass++; log.push('PASS  ' + name); }
      else { fail++; log.push('FAIL  ' + name); }
    }
    function eq(a, b, name) {
      var good = Math.abs(a - b) < 0.005;
      ok(good, name + (good ? '' : '  [got ' + a + ', want ' + b + ']'));
    }
    function eqs(a, b, name) {
      ok(String(a) === String(b), name + (String(a) === String(b) ? '' : '  [got "' + a + '", want "' + b + '"]'));
    }

    var settings = {
      currency: 'ZAR', vatRate: 0.15,
      fees: { perEntry: 850, perLine: 180, disbursement: 420 },
      demurrage: {
        seaFreeDays: 4,
        seaTiers: [
          { upTo: 7, day20: 335, day40: 540 },
          { upTo: 14, day20: 640, day40: 1010 },
          { upTo: null, day20: 1120, day40: 1760 }
        ],
        airFreeDays: 2,
        airTiers: [{ upTo: 3, perKg: 1.35 }, { upTo: 7, perKg: 2.6 }, { upTo: null, perKg: 4.8 }]
      }
    };
    var tariff = [
      { hsCode: '8517.62.00', description: 'routers', dutyRate: 0, exciseRate: 0, vatRate: null },
      { hsCode: '6109.10.00', description: 't-shirts', dutyRate: 0.4, exciseRate: 0.22, vatRate: null },
      { hsCode: '3004.90.00', description: 'medicines', dutyRate: 0, exciseRate: 0, vatRate: 0 }
    ];

    /* ---- money / dates ---- */
    eqs(C.fmtMoney(1234567.891, 'ZAR'), 'R 1,234,567.89', 'fmtMoney thousands separators');
    eqs(C.fmtMoney(-42.5, 'ZAR'), '-R 42.50', 'fmtMoney negative');
    eqs(C.fmtDate('2026-11-06'), '06 Nov 2026', 'fmtDate');
    eqs(C.diffDays('2026-10-01', '2026-10-10'), 9, 'diffDays');

    /* ---- sha256 ---- */
    eqs(C.sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'sha256 known vector (abc)');
    eqs(C.sha256(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'sha256 empty string');
    ok(C.hashPassword('salt', 'demo1234') === C.hashPassword('salt', 'demo1234'), 'hashPassword deterministic');
    ok(C.hashPassword('s1', 'demo1234') !== C.hashPassword('s2', 'demo1234'), 'hashPassword salt matters');

    /* ---- exchange rates ---- */
    var rates = [{ date: '2026-09-30', usdZar: 18.1 }, { date: '2026-10-07', usdZar: 18.4 }];
    eq(C.effectiveRate(rates, '2026-10-05'), 18.1, 'effectiveRate picks latest on-or-before');
    eq(C.effectiveRate(rates, '2026-10-20'), 18.4, 'effectiveRate picks newer rate');
    ok(C.effectiveRate(rates, '2026-09-01') === null, 'effectiveRate returns null before first rate');

    /* ---- landed cost ---- */
    var entry = {
      mode: 'sea', containerSize: '40', arrivalDate: '2026-10-01', exchangeRate: 18,
      freightUsd: 50, insuranceUsd: 10, otherChargesUsd: 0, transportZar: 0,
      items: [{ hsCode: '8517.62.00', description: 'routers', qty: 10, unit: 'pc', unitValueUsd: 100 }]
    };
    var t = C.computeTotals(entry, settings, tariff, '2026-10-10');
    eq(t.fobUsd, 1000, 'computeTotals FOB');
    eq(t.cifUsd, 1060, 'computeTotals CIF');
    eq(t.customsValueZar, 19080, 'computeTotals customs value');
    eq(t.duty, 0, 'computeTotals zero-rated duty');
    eq(t.vat, 2862, 'computeTotals VAT 15% of CIF');
    eq(t.govTotal, 2862, 'computeTotals government total');
    eq(t.demurrage.days, 9, 'demurrage days in yard');
    eq(t.demurrage.chargeableDays, 5, 'demurrage chargeable after 4 free');
    eq(t.demurrage.cost, 3640, 'demurrage tiered 40ft cost (3x540 + 2x1010)');
    eq(t.fees.total, 1450, 'agent fees entry+line+disbursement');
    eq(t.total, 7952, 'total landed cost');

    /* duty + excise compounding */
    var dline = { mode: 'sea', containerSize: '20', arrivalDate: '2026-10-01', exchangeRate: 18,
      freightUsd: 0, insuranceUsd: 0, items: [{ hsCode: '6109.10.00', description: 't', qty: 100, unit: 'ctn', unitValueUsd: 10 }] };
    var t2 = C.computeTotals(dline, settings, tariff, '2026-10-02');
    eq(t2.customsValueZar, 18000, 'mixed-duty customs value');
    eq(t2.duty, 7200, 'duty 40%');
    eq(t2.excise, 5544, 'excise 22% of (value+duty)');
    eq(t2.vat, 4611.6, 'VAT on value+duty+excise');
    eq(t2.govTotal, 17355.6, 'government total sums');

    /* zero-rated VAT per tariff line */
    var t3 = C.computeTotals({ mode: 'air', grossKg: 100, arrivalDate: '2026-10-01', exchangeRate: 18,
      freightUsd: 0, insuranceUsd: 0, items: [{ hsCode: '3004.90.00', description: 'meds', qty: 5, unit: 'ctn', unitValueUsd: 200 }] },
      settings, tariff, '2026-10-04');
    eq(t3.vat, 0, 'tariff-level zero VAT overrides default');
    eq(t3.demurrage.cost, 135, 'air storage per kg on yard day 3 (1.35 x 100)');

    /* unknown HS code */
    var t4 = C.computeTotals({ mode: 'sea', containerSize: '20', arrivalDate: '2026-10-01', exchangeRate: 18,
      freightUsd: 0, insuranceUsd: 0, items: [{ hsCode: '9999.99.99', description: 'x', qty: 1, unit: 'pc', unitValueUsd: 100 }] },
      settings, tariff, '2026-10-02');
    ok(t4.unknownHs.indexOf('9999.99.99') !== -1, 'unknown HS code flagged');
    eq(t4.duty, 0, 'unknown HS defaults to zero duty');

    /* demurrage tiers: 20ft, 6-day stay */
    var dm = C.demurrage({ mode: 'sea', containerSize: '20', arrivalDate: '2026-10-01', status: 'lodged' }, settings, '2026-10-07');
    eq(dm.cost, 670, 'demurrage 20ft tier 1 (2x335)');
    var dm2 = C.demurrage({ mode: 'sea', containerSize: '20', arrivalDate: '2026-10-01', status: 'lodged' }, settings, '2026-10-05');
    eq(dm2.cost, 0, 'demurrage zero inside free period');
    var dm3 = C.demurrage({ mode: 'sea', containerSize: 'LCL', grossKg: 500, arrivalDate: '2026-10-01', status: 'lodged' }, settings, '2026-10-08');
    eq(dm3.cost, 3900, 'LCL billed per kg (yard days 5-7 at tier-2 rate: 3 x 2.6 x 500)');

    /* ---- status workflow ---- */
    var e0 = { status: 'draft', items: [{ hsCode: '8517.62.00', qty: 1, unitValueUsd: 10 }], exchangeRate: 18,
      docs: { commercialInvoice: true, packingList: true, billOfLading: true } };
    ok(C.canTransition(e0, 'docs_pending').ok, 'draft -> docs pending allowed');
    ok(!C.canTransition(e0, 'lodged').ok, 'draft -> lodged not allowed');
    var e1 = { status: 'docs_pending', items: [{ hsCode: '8517.62.00', qty: 1, unitValueUsd: 10 }], exchangeRate: 18,
      docs: { commercialInvoice: true, packingList: false, billOfLading: true } };
    var g1 = C.canTransition(e1, 'lodged');
    ok(!g1.ok && g1.reason.indexOf('Packing list') !== -1, 'lodging blocked by missing packing list');
    e1.docs.packingList = true;
    ok(C.canTransition(e1, 'lodged').ok, 'lodging allowed with complete docs');
    var e2 = { status: 'assessed', items: [{ hsCode: '8517.62.00', qty: 1, unitValueUsd: 10 }], exchangeRate: 18, payments: [] };
    var tE2 = C.computeTotals(e2, settings, tariff, '2026-11-01');
    var g2 = C.canTransition(e2, 'duty_paid', { totals: tE2 });
    ok(!g2.ok && g2.reason.indexOf('Duty & VAT') !== -1, 'duty_paid blocked without payment');
    e2.payments = [{ amount: tE2.govTotal }];
    ok(C.canTransition(e2, 'duty_paid', { totals: C.computeTotals(e2, settings, tariff, '2026-11-01') }).ok, 'duty_paid allowed when fully covered');
    var e3 = { status: 'delivered', items: [], exchangeRate: 18, docs: {}, payments: [] };
    ok(!C.canTransition(e3, 'closed').ok, 'close blocked without invoice');
    e3.invoice = { no: 'INV-1', total: 100 };
    ok(C.canTransition(e3, 'closed').ok, 'close allowed once invoiced');
    ok(!C.canTransition({ status: 'released', invoice: { no: 'I' } }, 'closed').ok, 'close must go through delivered');
    var e4 = { status: 'lodged', items: [], exchangeRate: 18, docs: {} };
    ok(C.canTransition(e4, 'query').ok, 'active consignment can go under query');
    var e5 = { status: 'query', queryFrom: 'lodged', items: [], exchangeRate: 18, docs: {} };
    ok(C.canTransition(e5, 'lodged').ok, 'query returns to its prior status');
    ok(!C.canTransition(e5, 'assessed').ok, 'query cannot skip to other statuses');
    ok(!C.canTransition({ status: 'closed' }, 'cancelled').ok, 'closed consignments are immutable');

    /* ---- validation ---- */
    var v1 = C.validateEntry({ clientId: '', arrivalDate: '', exchangeRate: 0, items: [] }, tariff);
    ok(v1.length >= 3, 'validateEntry catches missing client, date, items, rate');
    var v2 = C.validateEntry({ clientId: 'c', arrivalDate: '2026-11-01', exchangeRate: 18,
      items: [{ hsCode: '1234.56.78', description: 'x', qty: 1, unitValueUsd: 5 }] }, tariff);
    ok(v2.length === 1 && v2[0].indexOf('tariff') !== -1, 'validateEntry flags HS codes not in the schedule');
    var v3 = C.validateEntry({ clientId: 'c', arrivalDate: '2026-11-01', exchangeRate: 18,
      items: [{ hsCode: '8517.62.00', description: 'x', qty: 0, unitValueUsd: 5 }] }, tariff);
    ok(v3.some(function (e) { return e.indexOf('quantity') !== -1; }), 'validateEntry rejects zero quantity');
    ok(C.validateClient({ name: '', email: 'nope' }).length === 2, 'validateClient name + email');
    ok(C.validateClient({ name: 'A', email: 'a@b.co', creditDays: 500 }).length === 1, 'validateClient credit range');

    /* ---- CSV ---- */
    var csv = C.csv([['a', 'b,c', 'say "hi"'], ['x', 'y\nz', '3']]);
    eqs(csv, 'a,"b,c","say ""hi"""\r\nx,"y\nz",3', 'csv escaping');
    ok(C.entriesCSV([{ ref: 'R1', clientId: 'c1', status: 'draft', mode: 'sea', items: [{ hsCode: '8517.62.00', qty: 2, unitValueUsd: 3 }], exchangeRate: 18 }], { c1: { name: 'A,B' } },
      settings, tariff, '2026-11-01').indexOf('"A,B"') !== -1, 'entriesCSV quotes client names containing commas');

    /* ---- documents ---- */
    var decl = C.declarationHTML({ ref: 'CL-26-0001', status: 'lodged', arrivalDate: '2026-10-01', exchangeRate: 18, mode: 'sea', containerSize: '40', blNo: 'BL1', items: [{ hsCode: '6109.10.00', description: 't-shirts', qty: 5, unit: 'ctn', unitValueUsd: 10 }] }, { name: 'Test Client <Ltd>', taxNo: '123' }, settings, tariff);
    ok(decl.indexOf('CL-26-0001') !== -1 && decl.indexOf('6109.10.00') !== -1, 'declaration contains ref and HS code');
    ok(decl.indexOf('Test Client &lt;Ltd&gt;') !== -1, 'declaration escapes client name');
    var inv = C.invoiceHTML({ ref: 'CL-26-0002', status: 'released', arrivalDate: '2026-10-01', exchangeRate: 18, mode: 'sea', containerSize: '20', items: [{ hsCode: '6109.10.00', description: 'x', qty: 5, unit: 'ctn', unitValueUsd: 10 }], invoice: { no: 'INV-26-0099', date: '2026-11-01', total: 1234.5, paid: false, lines: [{ desc: 'Import duty', amount: 1234.5 }] } }, { name: 'C', creditDays: 30 }, settings);
    ok(inv.indexOf('INV-26-0099') !== -1 && inv.indexOf('Import duty') !== -1, 'invoice renders number and lines');
    var qd = C.quoteHTML({ ref: 'QT-26-0001', date: '2026-11-01', validUntil: '2026-11-30', mode: 'sea', containerSize: '40', exchangeRate: 18, freightUsd: 100, insuranceUsd: 10, items: [{ hsCode: '8517.62.00', description: 'x', qty: 2, unit: 'pc', unitValueUsd: 50 }] }, { name: 'C' }, settings, tariff);
    ok(qd.indexOf('QUOTATION') !== -1 && qd.indexOf('Valid until') !== -1, 'quotation document renders');

    return { pass: pass, fail: fail, log: log };
  }

  root.makeClearLinkSuite = makeSuite;
  if (typeof module !== 'undefined' && module.exports) module.exports = makeSuite;
})(typeof window !== 'undefined' ? window : globalThis);
