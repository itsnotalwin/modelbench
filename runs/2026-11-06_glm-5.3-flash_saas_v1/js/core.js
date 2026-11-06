/* ClearLink core domain logic — pure functions, no DOM.
   Loaded as a classic script in the browser (window.CDCore) and via
   require() in Node for the test suite. */
(function (root) {
  'use strict';
  var CORE = {};

  /* ---------------- utilities ---------------- */

  CORE.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  CORE.round2 = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };

  CORE.num = function (v, fb) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : (fb || 0);
  };

  var CUR_SYMBOLS = { ZAR: 'R', USD: '$', EUR: '\u20AC', GBP: '\u00A3', NGN: '\u20A6', KES: 'KSh ' };
  CORE.fmtMoney = function (n, currency) {
    var sym = CUR_SYMBOLS[currency] || 'R';
    var neg = n < 0;
    var v = Math.abs(CORE.round2(CORE.num(n))).toFixed(2);
    v = v.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + sym + ' ' + v;
  };

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  CORE.fmtDate = function (iso) {
    if (!iso) return '\u2014';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
    if (!m) return String(iso);
    return m[3] + ' ' + MONTHS[parseInt(m[2], 10) - 1] + ' ' + m[1];
  };
  CORE.fmtDateTime = function (iso) {
    if (!iso) return '\u2014';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return CORE.fmtDate(d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  };
  CORE.todayISO = function () {
    var d = new Date();
    var p = function (x) { return (x < 10 ? '0' : '') + x; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };
  CORE.parseDate = function (iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return null;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  };
  CORE.diffDays = function (a, b) {
    var da = CORE.parseDate(a), db = CORE.parseDate(b);
    if (!da || !db) return 0;
    return Math.round((db.getTime() - da.getTime()) / 86400000);
  };

  /* ---------------- SHA-256 (compact, public-domain style) ----------------
     Used only to avoid storing demo passwords in plain text; not a substitute
     for real server-side auth (see README limitations). */
  CORE.sha256 = function sha256(ascii) {
    function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var len = 'length';
    var i, j;
    var result = '';
    var words = [];
    var asciiBitLength = ascii[len] * 8;
    var hash = sha256.h = sha256.h || [];
    var k = sha256.k = sha256.k || [];
    var primeCounter = k[len];
    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while (ascii[len] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[len]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[len]] = (asciiBitLength / maxWord) | 0;
    words[words[len]] = asciiBitLength;
    for (j = 0; j < words[len];) {
      var w = words.slice(j, j += 16);
      var oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], b = hash[1], c = hash[2], d = hash[3],
            e = hash[4], f = hash[5], g = hash[6], h = hash[7];
        var tmp1 = h + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & f) ^ (~e & g))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0);
        var tmp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & b) ^ (a & c) ^ (b & c));
        hash[7] = hash[6]; hash[6] = hash[5]; hash[5] = hash[4];
        hash[4] = (hash[3] + tmp1) | 0;
        hash[3] = hash[2]; hash[2] = hash[1]; hash[1] = hash[0];
        hash[0] = (tmp1 + tmp2) | 0;
      }
      hash[0] = (hash[0] + oldHash[0]) | 0;
      hash[1] = (hash[1] + oldHash[1]) | 0;
      hash[2] = (hash[2] + oldHash[2]) | 0;
      hash[3] = (hash[3] + oldHash[3]) | 0;
      hash[4] = (hash[4] + oldHash[4]) | 0;
      hash[5] = (hash[5] + oldHash[5]) | 0;
      hash[6] = (hash[6] + oldHash[6]) | 0;
      hash[7] = (hash[7] + oldHash[7]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? 0 : '') + b.toString(16);
      }
    }
    return result;
  };
  CORE.hashPassword = function (salt, password) {
    return CORE.sha256(unescape(encodeURIComponent(salt + '::' + password)));
  };

  /* ---------------- status workflow ---------------- */

  CORE.STATUSES = [
    { id: 'draft',        label: 'Draft',          hint: 'Being captured, nothing lodged yet.' },
    { id: 'docs_pending', label: 'Docs pending',   hint: 'Awaiting required documents from the importer.' },
    { id: 'lodged',       label: 'Lodged',         hint: 'Declaration lodged with customs.' },
    { id: 'assessed',     label: 'Assessed',       hint: 'Customs has assessed duty, excise and VAT.' },
    { id: 'duty_paid',    label: 'Duty paid',      hint: 'Government charges settled in full.' },
    { id: 'released',     label: 'Released',       hint: 'Cargo released by customs.' },
    { id: 'delivered',    label: 'Delivered',      hint: 'Cargo delivered to the client.' },
    { id: 'closed',       label: 'Closed',         hint: 'Delivered and invoiced.' },
    { id: 'query',        label: 'Customs query',  hint: 'Blocked by a customs query or inspection.' },
    { id: 'cancelled',    label: 'Cancelled',      hint: 'Abandoned or withdrawn.' }
  ];

  CORE.TRANSITIONS = {
    draft:        ['docs_pending', 'cancelled'],
    docs_pending: ['lodged', 'draft', 'cancelled'],
    lodged:       ['assessed', 'query', 'cancelled'],
    assessed:     ['duty_paid', 'query', 'cancelled'],
    duty_paid:    ['released', 'query', 'cancelled'],
    released:     ['delivered', 'query', 'cancelled'],
    delivered:    ['closed', 'query', 'cancelled'],
    closed:       [],
    query:        [],
    cancelled:    []
  };

  CORE.REQUIRED_DOCS = [
    { key: 'commercialInvoice', label: 'Commercial invoice' },
    { key: 'packingList',       label: 'Packing list' },
    { key: 'billOfLading',      label: 'Bill of lading / AWB' }
  ];
  CORE.OPTIONAL_DOCS = [
    { key: 'coo',    label: 'Certificate of origin' },
    { key: 'permit', label: 'Import permit / LOA' }
  ];

  CORE.statusLabel = function (id) {
    var s = CORE.STATUSES.filter(function (x) { return x.id === id; })[0];
    return s ? s.label : id;
  };

  CORE.docsComplete = function (entry) {
    var missing = CORE.REQUIRED_DOCS.filter(function (d) { return !entry.docs || !entry.docs[d.key]; })
      .map(function (d) { return d.label; });
    return { ok: missing.length === 0, missing: missing };
  };

  /* Guarded transition. ctx = { totals, entry } (totals from computeTotals). */
  CORE.canTransition = function (entry, to, ctx) {
    ctx = ctx || {};
    var from = entry.status;
    if (to === from) return { ok: false, reason: 'Already in this status.' };

    if (from === 'query') {
      if (to === entry.queryFrom || to === 'cancelled') return { ok: true };
      return { ok: false, reason: 'Resolve the query first: return it to "' +
        CORE.statusLabel(entry.queryFrom || 'docs_pending') + '" or cancel.' };
    }
    if (to === 'query') {
      if (['closed', 'cancelled', 'draft', 'query'].indexOf(from) !== -1) {
        return { ok: false, reason: 'Only active consignments can be placed under query.' };
      }
      return { ok: true };
    }

    var allowed = CORE.TRANSITIONS[from] || [];
    if (allowed.indexOf(to) === -1) {
      return { ok: false, reason: 'Cannot move from "' + CORE.statusLabel(from) + '" to "' + CORE.statusLabel(to) + '".' };
    }

    if (to === 'lodged') {
      var d = CORE.docsComplete(entry);
      if (!d.ok) return { ok: false, reason: 'Required documents missing: ' + d.missing.join(', ') + '.' };
      if (!CORE.num(entry.exchangeRate)) return { ok: false, reason: 'Capture an exchange rate before lodging.' };
      return { ok: true };
    }
    if (to === 'assessed') {
      if (!entry.items || !entry.items.length) return { ok: false, reason: 'Add at least one item before assessment.' };
      if (!CORE.num(entry.exchangeRate)) return { ok: false, reason: 'Capture an exchange rate before assessment.' };
      return { ok: true };
    }
    if (to === 'duty_paid') {
      var t = ctx.totals;
      if (!t) return { ok: false, reason: 'Compute charges first.' };
      var paid = CORE.num(t.govPaid);
      if (paid + 0.005 < CORE.num(t.govTotal)) {
        return { ok: false, reason: 'Duty & VAT of ' + CORE.fmtMoney(t.govTotal, ctx.currency || 'ZAR') +
          ' not fully covered by recorded payments (outstanding ' +
          CORE.fmtMoney(t.govTotal - paid, ctx.currency || 'ZAR') + ').' };
      }
      return { ok: true };
    }
    if (to === 'closed') {
      if (!entry.invoice) return { ok: false, reason: 'Generate the client invoice before closing.' };
      return { ok: true };
    }
    return { ok: true };
  };

  /* ---------------- exchange rates ---------------- */
  /* rates: [{date:'YYYY-MM-DD', usdZar:number}] sorted ascending. Returns the
     latest rate on or before `date`, or null. */
  CORE.effectiveRate = function (rates, date) {
    if (!date) return null;
    var best = null;
    (rates || []).forEach(function (r) {
      if (r.date <= date && (!best || r.date > best.date)) best = r;
    });
    return best ? CORE.num(best.usdZar) : null;
  };

  /* ---------------- landed cost ---------------- */

  CORE.findTariff = function (tariff, hsCode) {
    var code = String(hsCode || '').trim();
    var lines = tariff || [];
    for (var i = 0; i < lines.length; i++) if (lines[i].hsCode === code) return lines[i];
    return null;
  };

  /* Demurrage / storage accrual. Sea containers bill per container-size per
     day after the free period; air and LCL bill per kg per day. */
  CORE.demurrage = function (entry, settings, asOf) {
    var zero = { days: 0, freeDays: 0, chargeableDays: 0, cost: 0, breakdown: [], accruing: false };
    if (!entry || !entry.arrivalDate || entry.status === 'cancelled') return zero;

    var dm = (settings && settings.demurrage) || {};
    var isAir = entry.mode === 'air';
    var lcl = !isAir && entry.containerSize === 'LCL';
    var perKg = isAir || lcl;
    var freeDays = CORE.num(isAir ? dm.airFreeDays : dm.seaFreeDays, 4);
    var tiers = perKg ? (dm.airTiers || []) : (dm.seaTiers || []);
    var weight = Math.max(0, CORE.num(entry.grossKg));

    var end;
    if (['released', 'delivered', 'closed'].indexOf(entry.status) !== -1) {
      end = entry.releasedDate || entry.deliveredDate || asOf;
    } else {
      end = asOf;
    }
    var days = Math.max(0, CORE.diffDays(entry.arrivalDate, end));
    var chargeable = Math.max(0, days - freeDays);
    var accruing = chargeable > 0 && ['released', 'delivered', 'closed'].indexOf(entry.status) === -1;

    var cost = 0;
    var breakdown = [];
    for (var d = 1; d <= chargeable; d++) {
      var dayNo = freeDays + d; /* tier boundaries count absolute days in the yard */
      var tier = null;
      for (var i = 0; i < tiers.length; i++) {
        if (tiers[i].upTo == null || dayNo <= tiers[i].upTo) { tier = tiers[i]; break; }
      }
      var per = tier ? (perKg ? CORE.num(tier.perKg) * weight
        : CORE.num(entry.containerSize === '40' ? tier.day40 : tier.day20, 0)) : 0;
      cost += per;
      var last = breakdown[breakdown.length - 1];
      if (last && last.perDay === CORE.round2(per)) {
        last.to = dayNo; last.days += 1; last.amount = CORE.round2(last.amount + per);
      } else {
        breakdown.push({ from: dayNo, to: dayNo, days: 1, perDay: CORE.round2(per), amount: CORE.round2(per) });
      }
    }
    return {
      days: days, freeDays: freeDays, chargeableDays: chargeable,
      cost: CORE.round2(cost), breakdown: breakdown, accruing: accruing
    };
  };

  /* Agent fee schedule applied to a consignment. */
  CORE.agentFees = function (entry, settings, govTotal) {
    var f = (settings && settings.fees) || {};
    var lines = [{ desc: 'Clearing fee (per consignment)', amount: CORE.num(f.perEntry) }];
    var n = entry.items ? entry.items.length : 0;
    if (n > 0 && CORE.num(f.perLine) > 0) {
      lines.push({ desc: 'Line handling (' + n + ' line' + (n > 1 ? 's' : '') + ' \u00D7 ' + CORE.fmtMoney(f.perLine, settings.currency) + ')',
        amount: CORE.round2(n * CORE.num(f.perLine)) });
    }
    if (CORE.num(govTotal) > 0 && CORE.num(f.disbursement) > 0) {
      lines.push({ desc: 'Customs disbursement fee', amount: CORE.num(f.disbursement) });
    }
    var total = 0;
    lines.forEach(function (l) { total += l.amount; });
    return { lines: lines, total: CORE.round2(total) };
  };

  /* Full landed-cost computation for a consignment.
     entry: {items[], freightUsd, insuranceUsd, otherChargesUsd, exchangeRate,
             mode, containerSize, grossKg, arrivalDate, status, transportZar, payments[]} */
  CORE.computeTotals = function (entry, settings, tariff, asOf) {
    settings = settings || {};
    var rate = CORE.num(entry.exchangeRate);
    var items = entry.items || [];

    var fobUsd = 0;
    var lines = items.map(function (it) {
      var fob = CORE.round2(CORE.num(it.qty) * CORE.num(it.unitValueUsd));
      fobUsd += fob;
      return {
        id: it.id, hsCode: it.hsCode, description: it.description,
        qty: CORE.num(it.qty), unit: it.unit, unitValueUsd: CORE.num(it.unitValueUsd),
        fobUsd: fob, cifZar: 0, dutyRate: 0, exciseRate: 0, vatRate: 0,
        duty: 0, excise: 0, vat: 0, unknown: false
      };
    });
    fobUsd = CORE.round2(fobUsd);
    var freight = CORE.num(entry.freightUsd);
    var insurance = CORE.num(entry.insuranceUsd);
    var other = CORE.num(entry.otherChargesUsd);
    var cifUsd = CORE.round2(fobUsd + freight + insurance + other);
    var cifZar = CORE.round2(cifUsd * rate);

    var duty = 0, excise = 0, vat = 0, vatRate = 0;
    var unknownHs = [];
    lines.forEach(function (ln) {
      var t = CORE.findTariff(tariff, ln.hsCode);
      if (!t) { ln.unknown = true; unknownHs.push(ln.hsCode); }
      var dr = t ? CORE.num(t.dutyRate) : 0;
      var er = t ? CORE.num(t.exciseRate) : 0;
      var vr = t && t.vatRate != null ? CORE.num(t.vatRate) : CORE.num(settings.vatRate, 0.15);
      var share = fobUsd > 0 ? ln.fobUsd / fobUsd : 0;
      var lineCif = CORE.round2(cifZar * share);
      var d = CORE.round2(lineCif * dr);
      var e = CORE.round2((lineCif + d) * er);
      var v = CORE.round2((lineCif + d + e) * vr);
      ln.cifZar = lineCif; ln.dutyRate = dr; ln.exciseRate = er; ln.vatRate = vr;
      ln.duty = d; ln.excise = e; ln.vat = v;
      duty += d; excise += e; vat += v;
    });
    duty = CORE.round2(duty); excise = CORE.round2(excise); vat = CORE.round2(vat);
    var govTotal = CORE.round2(duty + excise + vat);

    var dm = CORE.demurrage(entry, settings, asOf || CORE.todayISO());
    var fees = CORE.agentFees(entry, settings, govTotal);
    var transport = CORE.round2(CORE.num(entry.transportZar));
    var total = CORE.round2(govTotal + dm.cost + fees.total + transport);

    var govPaid = CORE.round2((entry.payments || []).reduce(function (s, p) {
      return s + CORE.num(p.amount); }, 0));
    govPaid = Math.min(govPaid, govTotal > 0 ? govTotal : govPaid);

    return {
      fobUsd: fobUsd, freightUsd: CORE.round2(freight), insuranceUsd: CORE.round2(insurance),
      otherChargesUsd: CORE.round2(other), cifUsd: cifUsd, rate: rate,
      customsValueZar: cifZar, lines: lines, unknownHs: unknownHs,
      duty: duty, excise: excise, vat: vat, govTotal: govTotal, govPaid: govPaid,
      govOutstanding: CORE.round2(Math.max(0, govTotal - govPaid)),
      demurrage: dm, fees: fees, transportZar: transport, total: total
    };
  };

  /* ---------------- validation ---------------- */

  CORE.validateClient = function (c) {
    var errs = [];
    if (!String(c.name || '').trim()) errs.push('Client name is required.');
    if (String(c.name || '').trim().length > 80) errs.push('Client name must be 80 characters or fewer.');
    if (!String(c.email || '').trim()) errs.push('Contact email is required.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email.trim())) errs.push('Contact email is not a valid address.');
    if (c.creditDays != null && (!Number.isFinite(+c.creditDays) || +c.creditDays < 0 || +c.creditDays > 180)) {
      errs.push('Credit terms must be between 0 and 180 days.');
    }
    return errs;
  };

  CORE.validateEntry = function (e, tariff) {
    var errs = [];
    if (!e.clientId) errs.push('Select the importer (client) for this consignment.');
    if (!e.arrivalDate) errs.push('Arrival date is required.');
    else if (!CORE.parseDate(e.arrivalDate)) errs.push('Arrival date must be a valid date (YYYY-MM-DD).');
    if (!e.items || !e.items.length) errs.push('Add at least one cargo item.');
    if (e.items) {
      e.items.forEach(function (it, i) {
        var n = i + 1;
        if (!String(it.hsCode || '').trim()) errs.push('Item ' + n + ': HS tariff code is required.');
        else if (!CORE.findTariff(tariff, it.hsCode)) errs.push('Item ' + n + ': HS code "' + it.hsCode + '" is not in the tariff schedule \u2014 add it under Tariff first.');
        if (!(CORE.num(it.qty) > 0)) errs.push('Item ' + n + ': quantity must be greater than zero.');
        if (!(CORE.num(it.unitValueUsd) >= 0)) errs.push('Item ' + n + ': unit value cannot be negative.');
        if (CORE.num(it.qty) > 0 && CORE.num(it.unitValueUsd) <= 0 && !String(it.description || '').toLowerCase().match(/sample|free|gift/)) {
          errs.push('Item ' + n + ': unit value must be greater than zero (mark "sample" goods explicitly in the description).');
        }
      });
    }
    if (!(CORE.num(e.exchangeRate) > 0)) errs.push('Exchange rate (ZAR per USD) must be greater than zero.');
    if (CORE.num(e.freightUsd) < 0 || CORE.num(e.insuranceUsd) < 0) errs.push('Freight and insurance cannot be negative.');
    return errs;
  };

  /* ---------------- documents (printable HTML) ---------------- */

  function docShell(title, body) {
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + CORE.esc(title) + '</title><style>' +
      '*{box-sizing:border-box;margin:0;padding:0}' +
      'body{font:12.5px/1.45 -apple-system,"Segoe UI",Arial,sans-serif;color:#0a0a0a;padding:34px 40px}' +
      'h1{font-size:17px;letter-spacing:.04em;text-transform:uppercase}' +
      '.hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px double #0a0a0a;padding-bottom:14px;margin-bottom:18px}' +
      '.hd .org{font-size:15px;font-weight:800}' + '.hd .meta{text-align:right;font-size:11px;color:#4d4d4d}' +
      'table{width:100%;border-collapse:collapse;font-size:11.5px;margin-top:10px}' +
      'th{border:1px solid #0a0a0a;background:#f0f0f0;padding:5px 7px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em}' +
      'td{border:1px solid #0a0a0a;padding:5px 7px;vertical-align:top}' +
      'td.r,th.r{text-align:right;font-variant-numeric:tabular-nums}' +
      'tr.t td{font-weight:800;background:#f0f0f0}' +
      'dl{display:grid;grid-template-columns:150px 1fr 150px 1fr;gap:4px 10px;font-size:11.5px;margin-top:10px}' +
      'dt{font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:#4d4d4d;padding-top:2px}' +
      'dd{font-weight:600}' +
      '.note{margin-top:16px;font-size:11px;color:#262626;border:1px solid #0a0a0a;padding:10px 12px}' +
      '.sig{display:flex;gap:60px;margin-top:44px}' +
      '.sig div{flex:1;border-top:1px solid #0a0a0a;padding-top:5px;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:#4d4d4d}' +
      '.small{font-size:10px;color:#4d4d4d}' +
      '@media print{body{padding:10mm 12mm}@page{margin:0}}' +
      '</style></head><body>' + body +
      '<div class="small" style="margin-top:30px">Generated by ClearLink on ' + CORE.fmtDateTime(new Date().toISOString()) +
      ' \u00B7 Document data is illustrative and must be verified against the underlying source documents before submission.</div>' +
      '</body></html>';
  }

  CORE.declarationHTML = function (entry, client, settings, tariff) {
    var t = CORE.computeTotals(entry, settings, tariff);
    var e = CORE.esc, f = function (n) { return CORE.fmtMoney(n, settings.currency); };
    var rows = t.lines.map(function (ln) {
      return '<tr><td class="mono">' + e(ln.hsCode) + '</td><td>' + e(ln.description) + '</td>' +
        '<td class="r">' + ln.qty + ' ' + e(ln.unit || '') + '</td>' +
        '<td class="r">' + CORE.fmtMoney(ln.unitValueUsd, 'USD') + '</td>' +
        '<td class="r">' + CORE.fmtMoney(ln.fobUsd, 'USD') + '</td>' +
        '<td class="r">' + f(ln.cifZar) + '</td>' +
        '<td class="r">' + (ln.dutyRate * 100).toFixed(1) + '%</td>' +
        '<td class="r">' + f(ln.duty) + '</td><td class="r">' + f(ln.vat) + '</td></tr>';
    }).join('');
    var body =
      '<div class="hd"><div><div class="org">' + e(settings.orgName) + '</div>' +
      '<div class="small">Customs Clearing &amp; Freight Forwarding \u00B7 Reg. ' + e(settings.regNo || '\u2014') + '</div></div>' +
      '<div class="meta"><b>BILL OF ENTRY \u2014 IMPORT</b><br>Ref: <b>' + e(entry.ref) + '</b><br>Date: ' + CORE.fmtDate(entry.arrivalDate) +
      '<br>Status: ' + CORE.statusLabel(entry.status) + '</div></div>' +
      '<dl>' +
      '<dt>Importer</dt><dd>' + e(client ? client.name : '') + '</dd>' +
      '<dt>Tax reference</dt><dd>' + e(client ? (client.taxNo || '\u2014') : '\u2014') + '</dd>' +
      '<dt>Declarant</dt><dd>' + e(entry.assignee || settings.orgName) + '</dd>' +
      '<dt>Currency / rate</dt><dd>USD \u2192 ' + e(settings.currency) + ' @ ' + t.rate.toFixed(4) + '</dd>' +
      '<dt>Mode</dt><dd>' + e((entry.mode || 'sea').toUpperCase()) + (entry.containerSize ? ' \u00B7 ' + e(entry.containerSize) : '') + '</dd>' +
      '<dt>Bill of lading</dt><dd>' + e(entry.blNo || '\u2014') + '</dd>' +
      '<dt>Carrier / vessel</dt><dd>' + e(entry.vessel || '\u2014') + '</dd>' +
      '<dt>Container</dt><dd>' + e(entry.containerNo || '\u2014') + '</dd>' +
      '<dt>Port of loading</dt><dd>' + e(entry.pol || '\u2014') + '</dd>' +
      '<dt>Port of discharge</dt><dd>' + e(entry.pod || '\u2014') + '</dd>' +
      '<dt>Country of origin</dt><dd>' + e(entry.originCountry || '\u2014') + '</dd>' +
      '<dt>Arrival date</dt><dd>' + CORE.fmtDate(entry.arrivalDate) + '</dd>' +
      '</dl>' +
      '<table><thead><tr><th>HS code</th><th>Description of goods</th><th class="r">Quantity</th><th class="r">Unit value</th><th class="r">FOB (USD)</th><th class="r">Customs value</th><th class="r">Duty %</th><th class="r">Duty</th><th class="r">VAT</th></tr></thead><tbody>' +
      rows +
      '<tr class="t"><td colspan="5">Totals \u2014 FOB USD ' + CORE.fmtMoney(t.fobUsd, 'USD') +
      ' \u00B7 Freight ' + CORE.fmtMoney(t.freightUsd, 'USD') + ' \u00B7 Insurance ' + CORE.fmtMoney(t.insuranceUsd, 'USD') +
      ' \u00B7 CIF USD ' + CORE.fmtMoney(t.cifUsd, 'USD') + '</td>' +
      '<td class="r">' + f(t.customsValueZar) + '</td><td></td><td class="r">' + f(t.duty) + '</td><td class="r">' + f(t.vat) + '</td></tr>' +
      '</tbody></table>' +
      '<table style="width:60%;margin-left:auto"><tbody>' +
      '<tr><td>Customs value (CIF)</td><td class="r">' + f(t.customsValueZar) + '</td></tr>' +
      '<tr><td>Import duty</td><td class="r">' + f(t.duty) + '</td></tr>' +
      '<tr><td>Excise duty</td><td class="r">' + f(t.excise) + '</td></tr>' +
      '<tr><td>Import VAT</td><td class="r">' + f(t.vat) + '</td></tr>' +
      '<tr class="t"><td>Total government charges</td><td class="r">' + f(t.govTotal) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="note">I declare that the particulars given above are true and correct, and that all duties, taxes and charges due on the goods described have been or will be paid in accordance with the applicable customs legislation.</div>' +
      '<div class="sig"><div>Declared by (importer)</div><div>For and on behalf of the declarant</div><div>Date</div></div>';
    return docShell('Bill of Entry ' + entry.ref, body);
  };

  CORE.invoiceHTML = function (entry, client, settings) {
    var e = CORE.esc;
    var inv = entry.invoice;
    var f = function (n) { return CORE.fmtMoney(n, settings.currency); };
    var rows = (inv ? inv.lines : []).map(function (l) {
      return '<tr><td>' + e(l.desc) + '</td><td class="r">' + f(l.amount) + '</td></tr>';
    }).join('');
    var body =
      '<div class="hd"><div><div class="org">' + e(settings.orgName) + '</div>' +
      '<div class="small">' + e(settings.orgAddress || '') + '<br>' + e(settings.orgEmail || '') + ' \u00B7 ' + e(settings.orgPhone || '') + '</div></div>' +
      '<div class="meta"><b>TAX INVOICE</b><br>No: <b>' + e(inv ? inv.no : '\u2014') + '</b><br>Date: ' + CORE.fmtDate(inv ? inv.date : '') +
      '<br>' + (inv && inv.paid ? 'PAID in full' : 'Payable within ' + CORE.num(client ? client.creditDays : 30) + ' days') + '</div></div>' +
      '<dl><dt>Invoice to</dt><dd>' + e(client ? client.name : '') + '</dd>' +
      '<dt>Attn</dt><dd>' + e(client ? (client.contactName || '\u2014') : '\u2014') + '</dd>' +
      '<dt>Email</dt><dd>' + e(client ? (client.email || '\u2014') : '\u2014') + '</dd>' +
      '<dt>VAT no.</dt><dd>' + e(client ? (client.taxNo || '\u2014') : '\u2014') + '</dd>' +
      '<dt>Consignment</dt><dd>' + e(entry.ref) + ' \u00B7 ' + e(entry.blNo || '') + '</dd>' +
      '<dt>Arrival</dt><dd>' + CORE.fmtDate(entry.arrivalDate) + '</dd></dl>' +
      '<table><thead><tr><th>Description</th><th class="r">Amount</th></tr></thead><tbody>' + rows +
      '<tr class="t"><td>Total due</td><td class="r">' + f(inv ? inv.total : 0) + '</td></tr></tbody></table>' +
      '<div class="note"><b>Banking details:</b> ' + e(settings.bankName || '\u2014') + ' \u00B7 Acc ' + e(settings.bankAcc || '\u2014') +
      ' \u00B7 Branch ' + e(settings.bankBranch || '\u2014') + '.<br>Disbursements (duty, VAT, port charges) are recharged at cost with supporting proof of payment attached. Clearing fees are ' +
      'payable on presentation of this invoice.</div>' +
      '<div class="sig"><div>Authorised signature</div><div>Received &amp; accepted by</div></div>';
    return docShell('Invoice ' + (inv ? inv.no : ''), body);
  };

  CORE.quoteHTML = function (q, client, settings, tariff) {
    var e = CORE.esc;
    var t = CORE.computeTotals(q, settings, tariff);
    var f = function (n) { return CORE.fmtMoney(n, settings.currency); };
    var rows = t.lines.map(function (ln) {
      return '<tr><td class="mono">' + e(ln.hsCode) + '</td><td>' + e(ln.description) + '</td>' +
        '<td class="r">' + ln.qty + ' ' + e(ln.unit || '') + '</td>' +
        '<td class="r">' + CORE.fmtMoney(ln.fobUsd, 'USD') + '</td>' +
        '<td class="r">' + f(ln.cifZar) + '</td>' +
        '<td class="r">' + (ln.dutyRate * 100).toFixed(1) + '%</td>' +
        '<td class="r">' + f(ln.duty) + '</td><td class="r">' + f(ln.vat) + '</td></tr>';
    }).join('');
    var body =
      '<div class="hd"><div><div class="org">' + e(settings.orgName) + '</div>' +
      '<div class="small">Clearing &amp; forwarding cost estimate</div></div>' +
      '<div class="meta"><b>QUOTATION</b><br>No: <b>' + e(q.ref) + '</b><br>Date: ' + CORE.fmtDate(q.date) +
      '<br>Valid until: ' + CORE.fmtDate(q.validUntil) + '</div></div>' +
      '<dl><dt>For</dt><dd>' + e(client ? client.name : '') + '</dd>' +
      '<dt>Mode</dt><dd>' + e((q.mode || 'sea').toUpperCase()) + (q.containerSize ? ' \u00B7 ' + e(q.containerSize) : '') + '</dd>' +
      '<dt>Route</dt><dd>' + e(q.pol || '\u2014') + ' \u2192 ' + e(q.pod || '\u2014') + '</dd>' +
      '<dt>FX rate used</dt><dd>USD \u2192 ' + e(settings.currency) + ' @ ' + CORE.num(q.exchangeRate).toFixed(4) + '</dd></dl>' +
      '<table><thead><tr><th>HS code</th><th>Description</th><th class="r">Qty</th><th class="r">FOB (USD)</th><th class="r">Customs value</th><th class="r">Duty %</th><th class="r">Duty</th><th class="r">VAT</th></tr></thead><tbody>' +
      rows + '</tbody></table>' +
      '<table style="width:60%;margin-left:auto"><tbody>' +
      '<tr><td>Customs value (CIF)</td><td class="r">' + f(t.customsValueZar) + '</td></tr>' +
      '<tr><td>Import duty + excise</td><td class="r">' + f(t.duty + t.excise) + '</td></tr>' +
      '<tr><td>Import VAT</td><td class="r">' + f(t.vat) + '</td></tr>' +
      '<tr><td>Port storage / demurrage (est.)</td><td class="r">' + f(t.demurrage.cost) + '</td></tr>' +
      '<tr><td>Clearing fees</td><td class="r">' + f(t.fees.total) + '</td></tr>' +
      '<tr class="t"><td>Estimated total landed cost</td><td class="r">' + f(t.total) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="note">Rates are based on the tariff schedule on file and the exchange rate shown above. Government charges are estimates pending ' +
      'customs assessment; port storage assumes release within the free period shown. Quotation valid until ' + CORE.fmtDate(q.validUntil) + '.</div>' +
      '<div class="sig"><div>Prepared by</div><div>Accepted by (client)</div><div>Date</div></div>';
    return docShell('Quotation ' + q.ref, body);
  };

  /* ---------------- CSV ---------------- */

  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  CORE.csvCell = csvCell;
  CORE.csv = function (rows) {
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
  };

  CORE.entriesCSV = function (entries, clientsById, settings, tariff, asOf) {
    var rows = [['Ref', 'Client', 'Status', 'Mode', 'Container', 'POD', 'Arrival', 'Customs value (' + settings.currency + ')',
      'Duty', 'Excise', 'VAT', 'Gov total', 'Demurrage', 'Fees', 'Transport', 'Landed total', 'Invoiced']];
    entries.forEach(function (en) {
      var t = CORE.computeTotals(en, settings, tariff, asOf);
      var c = clientsById[en.clientId];
      rows.push([en.ref, c ? c.name : '', CORE.statusLabel(en.status), en.mode, en.containerSize || '',
        en.pod || '', en.arrivalDate || '', t.customsValueZar, t.duty, t.excise, t.vat, t.govTotal,
        t.demurrage.cost, t.fees.total, t.transportZar, t.total, en.invoice ? 'yes' : 'no']);
    });
    return CORE.csv(rows);
  };

  CORE.invoiceCSV = function (entries, clientsById, settings) {
    var rows = [['Invoice no', 'Date', 'Client', 'Entry', 'Total (' + settings.currency + ')', 'Paid']];
    entries.forEach(function (en) {
      if (!en.invoice) return;
      var c = clientsById[en.clientId];
      rows.push([en.invoice.no, en.invoice.date, c ? c.name : '', en.ref, en.invoice.total, en.invoice.paid ? 'yes' : 'no']);
    });
    return CORE.csv(rows);
  };

  CORE.statementCSV = function (entries, client, settings) {
    var rows = [['Client statement \u2014 ' + client.name], [],
      ['Invoice no', 'Date', 'Entry ref', 'Total (' + settings.currency + ')', 'Paid', 'Outstanding']];
    var out = 0;
    entries.forEach(function (en) {
      if (!en.invoice) return;
      var o = en.invoice.paid ? 0 : CORE.round2(en.invoice.total);
      out += o;
      rows.push([en.invoice.no, en.invoice.date, en.ref, en.invoice.total, en.invoice.paid ? 'yes' : 'no', o]);
    });
    rows.push([]);
    rows.push(['', '', '', '', 'Total outstanding:', CORE.round2(out)]);
    return CORE.csv(rows);
  };

  /* ---------------- export ---------------- */
  CORE.CUR_SYMBOLS = CUR_SYMBOLS;
  if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
  else root.CDCore = CORE;
})(typeof window !== 'undefined' ? window : globalThis);
