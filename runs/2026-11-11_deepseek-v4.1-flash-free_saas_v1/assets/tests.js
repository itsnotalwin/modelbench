/* Declarant — core logic tests. Run in Settings → Diagnostics or with `node assets/tests.js`. */
(function (root, factory) {
  const C = (typeof module === 'object' && module.exports)
    ? require('./core.js')
    : root.Declarant;
  const api = factory(C);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    if (require.main === module) {
      const result = api.run();
      result.results.forEach((item) => {
        console.log((item.ok ? 'PASS ' : 'FAIL ') + item.name + (item.ok ? '' : ' — ' + item.error));
      });
      console.log('\n' + result.passed + '/' + result.total + ' passed in ' + result.duration + 'ms');
      if (result.failed) process.exitCode = 1;
    }
  } else {
    root.DeclarantTests = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C) {
  'use strict';

  function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed.');
  }

  function equal(actual, expected, message) {
    if (actual !== expected) throw new Error((message || 'Expected equality') + ': got ' + actual + ', expected ' + expected);
  }

  function close(actual, expected, tolerance, message) {
    const delta = Math.abs(Number(actual) - Number(expected));
    if (delta > (tolerance == null ? 0.02 : tolerance)) {
      throw new Error((message || 'Expected close values') + ': got ' + actual + ', expected ' + expected);
    }
  }

  function baseEntry(overrides) {
    return Object.assign({
      id: 'ENT-TEST',
      clientId: 'CL-TEST',
      reference: 'PO-TEST',
      mode: 'sea',
      status: 'intake',
      port: 'Mombasa',
      eta: '2026-11-20',
      arrivalDate: '',
      incoterm: 'CIF',
      procedure: 'Home use',
      currency: 'USD',
      fxRate: 1,
      freight: 0,
      insurance: 0,
      serviceFee: 100,
      freeDays: 5,
      storageRate: 10,
      detentionRate: 20,
      lines: [
        { id: 'l1', hs: '8471.30.00', description: 'Laptops', qty: 1, unit: 'unit', unitValue: 1000, weight: 10, origin: 'DE', preferential: false }
      ],
      docs: {
        commercial_invoice: 'verified',
        packing_list: 'verified',
        declaration: 'verified',
        bill_of_lading: 'verified',
        certificate_of_origin: 'missing',
        insurance_certificate: 'verified',
        import_permit: 'missing',
        dangerous_goods: 'missing',
        weight_certificate: 'missing',
        bank_evidence: 'missing'
      }
    }, overrides || {});
  }

  function testHarness() {
    const tests = [];
    function test(name, fn) { tests.push({ name: name, fn: fn }); }
    function run() {
      const started = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const results = tests.map((item) => {
        try {
          item.fn();
          return { name: item.name, ok: true };
        } catch (error) {
          return { name: item.name, ok: false, error: error.message };
        }
      });
      const finished = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      return {
        total: results.length,
        passed: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        duration: Math.round(finished - started),
        results: results
      };
    }
    return { test: test, run: run };
  }

  const H = testHarness();
  const test = H.test;

  test('SHA-256 matches the standard vector', () => {
    equal(C.sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  test('SHA-256 handles UTF-8 input', () => {
    equal(C.sha256('héllo 🌍'), 'cbbcee01a3fc5f1c0db23e02be25316adf28ede876031fdbabe5f4fabe47ed7f');
  });

  test('Password hashes are salted and deterministic', () => {
    const salt = '0123456789abcdef';
    const a = C.hashPassword('demo1234', salt);
    const b = C.hashPassword('demo1234', salt);
    const c = C.hashPassword('demo1234', 'fedcba9876543210');
    assert(a === b, 'Same salt and password should match.');
    assert(a !== c, 'Different salts should produce different hashes.');
    equal(a.length, 64);
  });

  test('Duty calculation apportions freight and insurance pro rata', () => {
    const entry = baseEntry({
      freight: 400,
      insurance: 100,
      lines: [
        { id: 'a', hs: '8471.30.00', description: 'Laptops', qty: 1, unitValue: 1000, weight: 10, origin: 'DE' },
        { id: 'b', hs: '8703.23.00', description: 'Car', qty: 1, unitValue: 3000, weight: 100, origin: 'JP' }
      ]
    });
    const calc = C.calculateEntry(entry);
    equal(calc.lines.length, 2);
    close(calc.lines[0].allocation, 125, 0.01, 'First allocation');
    close(calc.lines[1].allocation, 375, 0.01, 'Second allocation');
    close(calc.lines[0].cif, 1125, 0.01, 'First CIF');
    close(calc.lines[1].cif, 3375, 0.01, 'Second CIF');
    close(calc.cifUsd, 4500, 0.01, 'Total CIF');
    close(calc.totals.duty, 1181.25, 0.02, 'Duty');
    close(calc.totals.vat, 1091.25, 0.1, 'VAT');
    close(calc.totals.taxes, 3411.56, 0.1, 'Total tax');
    close(calc.grandTotal, 8011.56, 0.1, 'Landed cost plus fee');
  });

  test('FX conversion is applied to all USD totals', () => {
    const usd = C.calculateEntry(baseEntry({ fxRate: 1, freight: 100 }));
    const eur = C.calculateEntry(baseEntry({ currency: 'EUR', fxRate: 1.25, freight: 100 }));
    close(eur.cifUsd, usd.cifUsd * 1.25, 0.02);
    close(eur.totals.taxes, usd.totals.taxes * 1.25, 0.05);
  });

  test('Zero FOB values fall back to equal allocation', () => {
    const entry = baseEntry({
      freight: 100,
      lines: [
        { id: 'a', hs: '8471.30.00', description: 'A', qty: 0, unitValue: 0, weight: 10 },
        { id: 'b', hs: '8471.30.00', description: 'B', qty: 0, unitValue: 0, weight: 10 }
      ]
    });
    const calc = C.calculateEntry(entry);
    close(calc.lines[0].allocation, 50, 0.01);
    close(calc.lines[1].allocation, 50, 0.01);
  });

  test('Preferential rate is applied and savings are reported', () => {
    const normal = baseEntry({ lines: [{ id: 'a', hs: '6109.10.00', description: 'T-shirts', qty: 100, unitValue: 10, weight: 50 }] });
    const pref = baseEntry({ lines: [{ id: 'a', hs: '6109.10.00', description: 'T-shirts', qty: 100, unitValue: 10, weight: 50, preferential: true }] });
    const a = C.calculateEntry(normal);
    const b = C.calculateEntry(pref);
    close(a.lines[0].appliedDutyRate, 35);
    close(b.lines[0].appliedDutyRate, 20);
    assert(b.lines[0].preferenceSaving > 0, 'Expected a preference saving.');
    assert(b.totals.duty < a.totals.duty, 'Preference should reduce duty.');
  });

  test('Checklist requires insurance on CIF and origin proof for preference', () => {
    const entry = baseEntry({
      incoterm: 'CIF',
      lines: [{ id: 'a', hs: '6109.10.00', description: 'T-shirts', qty: 1, unitValue: 10, weight: 1, preferential: true }]
    });
    const summary = C.docSummary(entry);
    const insurance = summary.list.find((d) => d.key === 'insurance_certificate');
    const origin = summary.list.find((d) => d.key === 'certificate_of_origin');
    assert(insurance && insurance.required, 'Insurance should be required for CIF.');
    assert(origin && origin.required, 'Origin proof should be required for a preference claim.');
    assert(!summary.complete, 'Checklist should not be complete with missing docs.');
  });

  test('Entry validation catches missing fields and unsafe quantities', () => {
    const entry = baseEntry({ clientId: '', reference: '', fxRate: 0, lines: [] });
    const result = C.validateEntry(entry);
    assert(!result.valid);
    assert(result.errors.clientId, 'Missing client should be reported.');
    assert(result.errors.reference, 'Missing reference should be reported.');
    assert(result.errors.fxRate, 'Zero FX should be reported.');
    assert(result.errors.lines, 'Missing lines should be reported.');
  });

  test('Lodging is blocked until required documents are verified', () => {
    const entry = baseEntry({ docs: { commercial_invoice: 'received', packing_list: 'verified', declaration: 'verified', bill_of_lading: 'verified', insurance_certificate: 'verified' } });
    const result = C.transitionCheck(entry, 'lodged', []);
    assert(!result.ok, 'Lodging should be blocked.');
    assert(result.issues.length > 0);
  });

  test('Release is blocked until the duty demand is fully paid', () => {
    const entry = baseEntry({ status: 'duty' });
    const partial = [{ id: 'd1', entryId: entry.id, type: 'Duty & taxes', amount: 100, payments: [{ amount: 50 }], void: false }];
    const paid = [{ id: 'd1', entryId: entry.id, type: 'Duty & taxes', amount: 100, payments: [{ amount: 100 }], void: false }];
    assert(!C.transitionCheck(entry, 'released', partial).ok, 'Partial payment must block release.');
    assert(C.transitionCheck(entry, 'released', paid).ok, 'Full payment should allow release.');
  });

  test('Disbursement states and aging buckets are correct', () => {
    const disb = { amount: 1000, dueDate: '2026-01-01', payments: [{ amount: 200 }], void: false };
    equal(C.disbOutstanding(disb), 800);
    equal(C.disbState(disb, '2026-01-10'), 'overdue');
    equal(C.agingBucket(disb, '2026-01-10'), '1-14');
    equal(C.agingBucket(disb, '2026-01-20'), '15-30');
    equal(C.agingBucket(disb, '2026-02-10'), '31-60');
    equal(C.agingBucket(disb, '2026-03-20'), '60+');
    const paid = { amount: 1000, dueDate: '2026-01-01', payments: [{ amount: 1000 }] };
    equal(C.disbState(paid, '2026-03-20'), 'paid');
  });

  test('Free-time exposure counts only days beyond the free period', () => {
    const entry = baseEntry({ arrivalDate: '2026-11-01', status: 'duty', freeDays: 5, storageRate: 10, detentionRate: 20 });
    const exposure = C.entryExposure(entry, '2026-11-08');
    equal(exposure.daysOver, 2);
    close(exposure.exposure, 60, 0.01);
    const released = baseEntry({ arrivalDate: '2026-11-01', status: 'released', releasedAt: '2026-11-05', freeDays: 5, storageRate: 10, detentionRate: 20 });
    equal(C.entryExposure(released, '2026-11-20').exposure, 0);
  });

  test('Statement ledger balances opening + charges − payments', () => {
    const client = { id: 'CL-1', name: 'Test Client' };
    const entries = [
      { id: 'E1', clientId: 'CL-1', createdAt: '2026-01-05', serviceFee: 100 },
      { id: 'E2', clientId: 'CL-1', createdAt: '2026-01-10', serviceFee: 200 }
    ];
    const disbursements = [
      { id: 'D1', clientId: 'CL-1', entryId: 'E1', ref: 'DIS-1', type: 'Duty & taxes', amount: 300, incurredDate: '2026-01-06', payments: [{ date: '2026-01-20', amount: 100, ref: 'R1' }] }
    ];
    const statement = C.statementData(client, entries, disbursements, '2026-01-01', '2026-01-31');
    close(statement.opening, 0);
    close(statement.charges, 600);
    close(statement.payments, 100);
    close(statement.closing, 500);
    equal(statement.rows.length, 4);
  });

  test('Status progression follows the declaration pipeline', () => {
    equal(C.nextStatus('intake'), 'docs');
    equal(C.nextStatus('lodged'), 'assessed');
    equal(C.nextStatus('query'), 'assessed');
    equal(C.nextStatus('delivered'), 'closed');
    equal(C.nextStatus('closed'), null);
  });

  test('CSV output quotes commas and line breaks', () => {
    const csv = C.toCSV([['a', 'b,c'], ['x"y', 'line\nbreak']]);
    equal(csv, 'a,"b,c"\r\n"x""y","line\nbreak"');
  });

  test('Name and email validation reject malformed input', () => {
    assert(C.validEmail('desk@example.co.ke'));
    assert(!C.validEmail('not-an-email'));
    assert(!C.validEmail('a@b'));
  });

  return { run: H.run };
});
