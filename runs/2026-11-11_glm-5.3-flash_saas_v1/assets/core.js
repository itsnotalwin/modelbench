/* ============================================================
   ClearDesk — core domain logic (pure, no DOM).
   Runs in the browser (window.CDCore) and in Node (module.exports)
   for the automated test suite (assets/core.test.js).
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CDCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------- status model ---------------- */

  var STATUS_META = {
    new:           { label: 'New',            desc: 'Draft created; not yet documented.' },
    awaiting_docs: { label: 'Awaiting docs',  desc: 'Missing required documents from client or supplier.' },
    ready:         { label: 'Ready to lodge', desc: 'Documents complete; declaration can be lodged.' },
    lodged:        { label: 'Lodged',         desc: 'Declaration lodged with customs.' },
    query:         { label: 'Customs query',  desc: 'Held or queried by customs; needs resolution.' },
    assessed:      { label: 'Assessed',       desc: 'Duty/tax assessment issued; awaiting payment.' },
    paid:          { label: 'Duty paid',      desc: 'Duties and taxes settled.' },
    released:      { label: 'Released',       desc: 'Goods released by customs.' },
    delivered:     { label: 'Delivered',      desc: 'Delivered to the client.' },
    closed:        { label: 'Closed',         desc: 'File closed and archived.' },
    cancelled:     { label: 'Cancelled',      desc: 'Entry cancelled before completion.' }
  };
  var STATUS_ORDER = ['new','awaiting_docs','ready','lodged','query','assessed','paid','released','delivered','closed','cancelled'];

  var TRANSITIONS = {
    new:           ['awaiting_docs', 'ready', 'cancelled'],
    awaiting_docs: ['new', 'ready', 'cancelled'],
    ready:         ['awaiting_docs', 'lodged', 'cancelled'],
    lodged:        ['query', 'assessed', 'ready', 'cancelled'],
    query:         ['lodged', 'assessed', 'cancelled'],
    assessed:      ['paid', 'lodged', 'cancelled'],
    paid:          ['released', 'assessed', 'cancelled'],
    released:      ['delivered', 'paid', 'cancelled'],
    delivered:     ['closed', 'released'],
    closed:        [],
    cancelled:     []
  };

  /* ---------------- reference data ---------------- */

  var MODES = { sea: { label: 'Sea freight' }, air: { label: 'Air freight' }, road: { label: 'Road freight' } };

  var DOC_TEMPLATES = {
    sea: [
      { key: 'bl',        label: 'Bill of lading',          required: true  },
      { key: 'invoice',   label: 'Commercial invoice',      required: true  },
      { key: 'packing',   label: 'Packing list',            required: true  },
      { key: 'origin',    label: 'Certificate of origin',   required: false },
      { key: 'insurance', label: 'Insurance certificate',   required: false },
      { key: 'permit',    label: 'Import permit / licence', required: false }
    ],
    air: [
      { key: 'awb',       label: 'Air waybill',             required: true  },
      { key: 'invoice',   label: 'Commercial invoice',      required: true  },
      { key: 'packing',   label: 'Packing list',            required: false },
      { key: 'permit',    label: 'Import permit / licence', required: false }
    ],
    road: [
      { key: 'cmr',       label: 'CMR / consignment note',  required: true  },
      { key: 'invoice',   label: 'Commercial invoice',      required: true  },
      { key: 'packing',   label: 'Packing list',            required: false }
    ]
  };

  var CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY', 'KES', 'AED'];
  var INCOTERMS = ['FOB', 'CIF', 'CFR', 'EXW', 'FCA', 'DAP', 'DDP'];
  var PAY_TERMS = { prepaid: 'Prepaid', credit15: 'Credit 15 days', credit30: 'Credit 30 days', credit45: 'Credit 45 days' };
  var PAY_METHODS = ['Bank transfer', 'Cash', 'Mobile money', 'Cheque'];
  var ROLES = { manager: 'Manager', clerk: 'Clerk' };

  /* ---------------- small utilities ---------------- */

  var _uidSeq = 0;
  function uid(prefix) {
    _uidSeq = (_uidSeq + 1) % 1679616;
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36) +
           ('000' + _uidSeq.toString(36)).slice(-3);
  }

  function num(v, dflt) {
    var n = Number(v);
    return isFinite(n) ? n : (dflt || 0);
  }

  function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function daysBetween(fromIso, toIso) {
    var a = new Date(fromIso + 'T00:00:00Z');
    var b = new Date(toIso + 'T00:00:00Z');
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function lastMonths(n, today) {
    var out = [];
    var base = new Date((today || todayIso()) + 'T00:00:00Z');
    base.setUTCDate(1);
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(base.getTime());
      d.setUTCMonth(d.getUTCMonth() - i);
      out.push(d.toISOString().slice(0, 7));
    }
    return out;
  }

  function label(status) {
    return (STATUS_META[status] && STATUS_META[status].label) || status || '—';
  }

  /* ---------------- SHA-256 (synchronous, byte-based) ---------------- */

  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }

  function utf8(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xc0 | (c >> 6), 0x80 | (c & 63)); }
      else if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) {
        var c2 = str.charCodeAt(++i);
        var cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
      } else { out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
    }
    return new Uint8Array(out);
  }

  function sha256(bytes) {
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var l = bytes.length;
    var total = Math.ceil((l + 9) / 64) * 64;
    var m = new Uint8Array(total);
    m.set(bytes);
    m[l] = 0x80;
    var bitLen = l * 8;                 // inputs here are far below 512 MiB
    m[total - 4] = (bitLen >>> 24) & 255;
    m[total - 3] = (bitLen >>> 16) & 255;
    m[total - 2] = (bitLen >>> 8) & 255;
    m[total - 1] = bitLen & 255;
    var w = new Uint32Array(64);
    for (var off = 0; off < total; off += 64) {
      for (var i0 = 0; i0 < 16; i0++) {
        var j = off + i0 * 4;
        w[i0] = ((m[j] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3]) >>> 0;
      }
      for (var i = 16; i < 64; i++) {
        var x = w[i - 15], y = w[i - 2];
        var s0 = rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
        var s1 = rotr(y, 17) ^ rotr(y, 19) ^ (y >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (var t = 0; t < 64; t++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    var hex = '';
    for (var k = 0; k < 8; k++) hex += H[k].toString(16).padStart(8, '0');
    return hex;
  }

  function hashPassword(password, salt) {
    return sha256(utf8(String(salt) + '::' + String(password)));
  }

  function verifyPassword(password, salt, expectedHash) {
    var got = hashPassword(password, salt);
    if (got.length !== expectedHash.length) return false;
    var diff = 0; // constant-time-ish comparison
    for (var i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    return diff === 0;
  }

  /* ---------------- entry computation ---------------- */
  /*
   * Valuation:  goods (FOB) = Σ line value;  CIF(entry currency) = goods + freight + insurance;
   *             CIF(base) = CIF × fxRate.
   * Duty/levy:  allocated to lines pro-rata by value, then each line pays its HS duty % and excise %.
   * VAT:        org.vatRate × (line CIF + duty + excise) for every line that is not VAT-exempt.
   * Fee:        agency fee — percent of CIF(base) or flat, per entry or org default.
   * Disbursements: duty + excise + VAT + other local charges (money the agent advanced).
   * Total due:  disbursements + agency fee.
   */
  function computeEntry(entry, tariffIndex, org) {
    org = org || { vatRate: 16, feePercent: 2 };
    var warnings = [];
    var fx = num(entry.fxRate, 0);
    var freight = num(entry.freight, 0);
    var insurance = num(entry.insurance, 0);

    var lines = (entry.lines || []).map(function (l) {
      var qty = num(l.qty, 0), unit = num(l.unitPrice, 0);
      var t = tariffIndex ? tariffIndex[l.hsCode] : null;
      if (l.hsCode && !t) warnings.push('HS code ' + l.hsCode + ' is not in the tariff schedule.');
      if (qty <= 0) warnings.push('Line "' + (l.desc || 'untitled') + '" has quantity 0.');
      return Object.assign({}, l, {
        extValue: round2(qty * unit),
        dutyRate: t ? num(t.dutyRate, 0) : 0,
        exciseRate: t ? num(t.exciseRate, 0) : 0,
        vatExempt: !!(t && t.vatExempt),
        cifBase: 0, duty: 0, excise: 0
      });
    });

    var goods = round2(lines.reduce(function (s, l) { return s + l.extValue; }, 0));
    var cifCur = round2(goods + freight + insurance);
    if (fx <= 0) warnings.push('Exchange rate must be greater than zero.');
    if (!lines.length) warnings.push('No cargo lines yet.');
    var cifBase = fx > 0 ? round2(cifCur * fx) : 0;

    // pro-rata CIF allocation by value (fallback: by weight, else evenly)
    var weightSum = lines.reduce(function (s, l) { return s + num(l.weight, 0); }, 0);
    var alloc = lines.map(function (l) {
      if (goods > 0 && l.extValue > 0) return l.extValue / goods;
      if (weightSum > 0 && num(l.weight, 0) > 0) return num(l.weight, 0) / weightSum;
      return lines.length ? 1 / lines.length : 0;
    });
    var sumAlloc = 0;
    lines.forEach(function (l, i) { l.cifBase = round2(cifBase * alloc[i]); sumAlloc += l.cifBase; });
    if (lines.length) {
      var residual = round2(cifBase - sumAlloc);
      if (Math.abs(residual) >= 0.01) {
        var mi = 0;
        lines.forEach(function (l, i) { if (l.extValue > lines[mi].extValue) mi = i; });
        lines[mi].cifBase = round2(lines[mi].cifBase + residual);
      }
    }
    lines.forEach(function (l) {
      l.duty = round2(l.cifBase * l.dutyRate / 100);
      l.excise = round2(l.cifBase * l.exciseRate / 100);
    });

    var duty = round2(lines.reduce(function (s, l) { return s + l.duty; }, 0));
    var excise = round2(lines.reduce(function (s, l) { return s + l.excise; }, 0));
    var vatBase = 0, vat = 0;
    lines.forEach(function (l) {
      if (!l.vatExempt) {
        var b = round2(l.cifBase + l.duty + l.excise);
        vatBase += b;
        vat += round2(b * num(org.vatRate, 0) / 100);
      }
    });
    vat = round2(vat); vatBase = round2(vatBase);

    var ch = entry.charges || {};
    var port = num(ch.port, 0), handling = num(ch.handling, 0), transport = num(ch.transport, 0), other = num(ch.other, 0);
    var otherCharges = round2(port + handling + transport + other);
    var disbursements = round2(duty + excise + vat + otherCharges);

    var feePercentApplied = null;
    var fee = 0;
    if ((entry.feeMode || 'percent') === 'flat') {
      fee = round2(num(entry.feeValue, 0));
    } else {
      feePercentApplied = entry.feePercent != null ? num(entry.feePercent, 0) : num(org.feePercent, 2);
      fee = round2(cifBase * feePercentApplied / 100);
    }
    var totalDue = round2(disbursements + fee);

    return {
      goods: goods, freight: freight, insurance: insurance,
      cifCur: cifCur, cifBase: cifBase, lines: lines,
      duty: duty, excise: excise, vat: vat, vatBase: vatBase,
      port: port, handling: handling, transport: transport, other: other,
      otherCharges: otherCharges, disbursements: disbursements,
      fee: fee, feePercentApplied: feePercentApplied,
      totalDue: totalDue, warnings: warnings
    };
  }

  function tariffIndex(tariffList) {
    var idx = {};
    (tariffList || []).forEach(function (t) { idx[t.code] = t; });
    return idx;
  }

  /* ---------------- documents ---------------- */

  function docsFor(mode) { return DOC_TEMPLATES[mode] || DOC_TEMPLATES.sea; }

  function ensureDocs(entry) {
    var tpl = docsFor(entry.mode);
    var old = {};
    (entry.docs || []).forEach(function (d) { old[d.key] = d; });
    entry.docs = tpl.map(function (t) {
      var o = old[t.key];
      return { key: t.key, label: t.label, required: t.required, received: o ? !!o.received : false, ref: (o && o.ref) || '' };
    });
    return entry;
  }

  function docsStatus(entry) {
    var docs = entry.docs || [];
    var req = docs.filter(function (d) { return d.required; });
    var missing = req.filter(function (d) { return !d.received; });
    return {
      total: docs.length,
      received: docs.filter(function (d) { return d.received; }).length,
      requiredCount: req.length,
      receivedRequired: req.length - missing.length,
      missingRequired: missing.length,
      complete: req.length > 0 && missing.length === 0
    };
  }

  /* ---------------- status transitions ---------------- */

  function canTransition(entry, to, ctx) {
    ctx = ctx || {};
    var from = entry.status;
    var allowed = TRANSITIONS[from] || [];
    if (allowed.indexOf(to) === -1) {
      return { ok: false, reason: 'Cannot move from "' + label(from) + '" to "' + label(to) + '".' };
    }
    if (to === 'lodged') {
      if (!entry.clientId) return { ok: false, reason: 'Assign a client before lodging.' };
      if (!(entry.lines || []).length) return { ok: false, reason: 'Add at least one cargo line before lodging.' };
      if (num(entry.fxRate, 0) <= 0) return { ok: false, reason: 'Set an exchange rate before lodging.' };
      var goods = ctx.computed ? ctx.computed.goods : 0;
      if (!(goods > 0)) return { ok: false, reason: 'Cargo value must be greater than zero before lodging.' };
      var ds = docsStatus(entry);
      if (!ds.complete) return { ok: false, reason: 'All required documents must be received first (' + ds.missingRequired + ' still missing).' };
    }
    if (to === 'assessed') {
      if (!ctx.computed || !(ctx.computed.goods > 0)) return { ok: false, reason: 'A valid valuation (FOB > 0) is required before assessment.' };
    }
    if (to === 'paid') {
      if (!ctx.computed) return { ok: false, reason: 'Compute the assessment before recording payment of duties.' };
      if (!(ctx.computed.totalDue > 0) && !ctx.confirmZero) {
        return { ok: false, reason: 'The assessed amount is zero. Confirm "no duties payable" to proceed.', confirm: 'zero' };
      }
    }
    if (to === 'cancelled' && !ctx.reason) {
      return { ok: false, reason: 'A cancellation reason is required for the audit trail.', confirm: 'reason' };
    }
    return { ok: true };
  }

  function applyTransition(entry, to, opts) {
    opts = opts || {};
    var now = opts.now || new Date().toISOString();
    var stampKeys = { lodged: 'lodgedDate', assessed: 'assessedDate', paid: 'paidDate', released: 'releasedDate', delivered: 'deliveredDate', closed: 'closedDate' };
    var upd = Object.assign({}, entry, { status: to, updatedAt: now });
    var stamp = stampKeys[to];
    if (stamp && !upd[stamp]) upd[stamp] = now.slice(0, 10);
    if (to === 'cancelled') upd.cancelledReason = opts.reason || '';
    upd.timeline = (entry.timeline || []).concat([{
      ts: now, who: opts.userName || 'system', action: 'status',
      text: 'Status: ' + label(entry.status) + ' → ' + label(to) + (opts.reason ? ' — ' + opts.reason : '')
    }]);
    return upd;
  }

  /* ---------------- validation ---------------- */

  var REF_RE = /^[A-Z]{2,4}\/\d{4}\/\d{2,6}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function validateEntry(entry, ctx) {
    ctx = ctx || {};
    var errors = {};
    if (!entry.clientId) errors.clientId = 'Select the importing client.';
    else if (ctx.clients && !ctx.clients.some(function (c) { return c.id === entry.clientId; })) errors.clientId = 'Unknown client.';

    var ref = String(entry.ref || '').trim().toUpperCase();
    if (!ref) errors.ref = 'Entry reference is required.';
    else if (!REF_RE.test(ref)) errors.ref = 'Use the format AE/2026/0101 (2–4 letters / year / number).';
    else if (ctx.existingRefs && ctx.existingRefs.indexOf(ref) !== -1) errors.ref = 'This reference is already used by another entry.';

    if (!MODES[entry.mode]) errors.mode = 'Choose a transport mode.';
    if (CURRENCIES.indexOf(entry.currency) === -1) errors.currency = 'Choose a currency.';
    if (!(num(entry.fxRate, 0) > 0)) errors.fxRate = 'Exchange rate must be greater than 0.';
    if (num(entry.freight, 0) < 0 || num(entry.insurance, 0) < 0) errors.charges = 'Freight and insurance cannot be negative.';
    if (String(entry.arrivalDate || '') && !ISO_DATE_RE.test(entry.arrivalDate)) errors.arrivalDate = 'Use the date picker (YYYY-MM-DD).';

    var ch = entry.charges || {};
    ['port', 'handling', 'transport', 'other'].forEach(function (k) {
      if (num(ch[k], 0) < 0) errors['charges_' + k] = 'Cannot be negative.';
    });
    if ((entry.feeMode || 'percent') === 'percent') { if (num(entry.feePercent, 0) < 0) errors.fee = 'Fee cannot be negative.'; }
    else if (num(entry.feeValue, 0) < 0) errors.fee = 'Fee cannot be negative.';

    if (!(entry.lines || []).length) errors.lines = 'Add at least one cargo line.';
    var lineErrors = (entry.lines || []).map(function (l) {
      var e = {};
      if (!l.hsCode) e.hsCode = 'Pick an HS code.';
      else if (ctx.tariffIdx && !ctx.tariffIdx[l.hsCode]) e.hsCode = 'Not in the tariff schedule.';
      if (!String(l.desc || '').trim()) e.desc = 'Description required.';
      if (!(num(l.qty, 0) > 0)) e.qty = 'Qty must be > 0.';
      if (num(l.unitPrice, 0) < 0) e.unitPrice = 'Cannot be negative.';
      return Object.keys(e).length ? e : null;
    });

    var ok = Object.keys(errors).length === 0 && lineErrors.every(function (e) { return !e; });
    return { ok: ok, errors: errors, lineErrors: lineErrors };
  }

  function validateClient(c, ctx) {
    ctx = ctx || {};
    var errors = {};
    if (!String(c.name || '').trim()) errors.name = 'Client name is required.';
    if (!/^[A-Za-z0-9\-]{5,20}$/.test(String(c.taxId || '').trim())) errors.taxId = 'Tax ID: 5–20 letters/digits/dashes (e.g. P051234567X).';
    if (String(c.email || '') && !EMAIL_RE.test(c.email)) errors.email = 'Not a valid email address.';
    if (!PAY_TERMS[c.terms]) errors.terms = 'Choose payment terms.';
    if (String(c.permitExpiry || '') && !ISO_DATE_RE.test(c.permitExpiry)) errors.permitExpiry = 'Use the date picker (YYYY-MM-DD).';
    var code = String(c.code || '').trim().toUpperCase();
    if (code && ctx.existingCodes && ctx.existingCodes.indexOf(code) !== -1) errors.code = 'Client code already in use.';
    var ok = Object.keys(errors).length === 0;
    return { ok: ok, errors: errors };
  }

  function validatePayment(p, balance) {
    var errors = {};
    if (!(num(p.amount, 0) > 0)) errors.amount = 'Amount must be greater than 0.';
    if (!ISO_DATE_RE.test(String(p.date || ''))) errors.date = 'Use the date picker (YYYY-MM-DD).';
    if (!p.clientId) errors.clientId = 'Choose the client.';
    if (PAY_METHODS.indexOf(p.method) === -1) errors.method = 'Choose a payment method.';
    if (typeof balance === 'number' && p.entryId && num(p.amount, 0) > round2(balance + 0.005)) {
      errors.amount = 'Amount exceeds the outstanding balance (' + round2(balance).toFixed(2) + ') for this entry.';
    }
    var ok = Object.keys(errors).length === 0;
    return { ok: ok, errors: errors };
  }

  /* ---------------- permits ---------------- */

  function permitStatus(client, today) {
    if (!client.permitExpiry || !ISO_DATE_RE.test(client.permitExpiry)) return { state: 'none' };
    var d = daysBetween(today || todayIso(), client.permitExpiry);
    if (d < 0) return { state: 'expired', days: d };
    if (d <= 30) return { state: 'expiring', days: d };
    return { state: 'ok', days: d };
  }

  /* ---------------- ledger ---------------- */

  function paidFor(entryId, payments) {
    return round2((payments || []).filter(function (p) { return p.entryId === entryId; })
      .reduce(function (s, p) { return s + num(p.amount, 0); }, 0));
  }

  function clientLedger(clientId, entries, payments, tariffIdx, org) {
    var rows = (entries || [])
      .filter(function (e) { return e.clientId === clientId && e.status !== 'cancelled'; })
      .map(function (e) {
        var c = computeEntry(e, tariffIdx, org);
        var paid = paidFor(e.id, payments);
        return { entry: e, computed: c, billed: c.totalDue, paid: paid, balance: round2(c.totalDue - paid) };
      });
    var billed = round2(rows.reduce(function (s, r) { return s + r.billed; }, 0));
    var paid = round2(rows.reduce(function (s, r) { return s + r.paid; }, 0));
    return { rows: rows, billed: billed, paid: paid, balance: round2(billed - paid) };
  }

  function agingBucket(days) {
    if (days <= 30) return '0-30';
    if (days <= 60) return '31-60';
    if (days <= 90) return '61-90';
    return '90+';
  }

  function entryAgeDays(entry, today) {
    var anchor = entry.releasedDate || entry.paidDate || entry.assessedDate || entry.lodgedDate ||
                 (entry.createdAt || '').slice(0, 10) || (today || todayIso());
    var d = daysBetween(anchor, today || todayIso());
    return d < 0 ? 0 : d;
  }

  function agingFor(entries, payments, tariffIdx, org, today) {
    today = today || todayIso();
    var buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    (entries || []).forEach(function (e) {
      if (e.status === 'cancelled') return;
      var c = computeEntry(e, tariffIdx, org);
      var paid = paidFor(e.id, payments);
      var bal = round2(c.totalDue - paid);
      if (bal <= 0.009) return;
      var b = agingBucket(entryAgeDays(e, today));
      buckets[b] = round2(buckets[b] + bal);
    });
    return buckets;
  }

  /* ---------------- reporting ---------------- */

  function computeKpis(entries, payments, tariffIdx, org, today) {
    today = today || todayIso();
    var byStatus = {};
    STATUS_ORDER.forEach(function (s) { byStatus[s] = 0; });
    (entries || []).forEach(function (e) { byStatus[e.status] = (byStatus[e.status] || 0) + 1; });
    var toCollect = 0;
    (entries || []).forEach(function (e) {
      if (e.status === 'cancelled') return;
      var c = computeEntry(e, tariffIdx, org);
      var bal = round2(c.totalDue - paidFor(e.id, payments));
      if (bal > 0) toCollect = round2(toCollect + bal);
    });
    var month = today.slice(0, 7);
    return {
      activeCount: (entries || []).filter(function (e) { return e.status !== 'cancelled' && e.status !== 'closed'; }).length,
      awaitingDocs: byStatus.awaiting_docs || 0,
      lodgedCount: (byStatus.lodged || 0) + (byStatus.query || 0),
      toCollect: toCollect,
      releasedThisMonth: (entries || []).filter(function (e) { return (e.releasedDate || '').slice(0, 7) === month; }).length,
      byStatus: byStatus
    };
  }

  function monthlyDuty(entries, months, tariffIdx, org) {
    var out = months.map(function (m) { return { month: m, duty: 0, vat: 0, fee: 0 }; });
    var idx = {};
    months.forEach(function (m, i) { idx[m] = i; });
    (entries || []).forEach(function (e) {
      if (e.status === 'cancelled') return;
      var m = (e.assessedDate || e.lodgedDate || (e.createdAt || '')).slice(0, 7);
      if (!(m in idx)) return;
      var c = computeEntry(e, tariffIdx, org);
      out[idx[m]].duty = round2(out[idx[m]].duty + c.duty + c.excise);
      out[idx[m]].vat = round2(out[idx[m]].vat + c.vat);
      out[idx[m]].fee = round2(out[idx[m]].fee + c.fee);
    });
    return out;
  }

  function clientTotals(entries, payments, tariffIdx, org) {
    var map = {};
    (entries || []).forEach(function (e) {
      if (e.status === 'cancelled' || !e.clientId) return;
      if (!map[e.clientId]) map[e.clientId] = 0;
      var c = computeEntry(e, tariffIdx, org);
      map[e.clientId] = round2(map[e.clientId] + c.totalDue);
    });
    return map;
  }

  /* ---------------- refs & csv ---------------- */

  function nextRef(entries, year) {
    var y = year || new Date().getFullYear();
    var max = 0;
    (entries || []).forEach(function (e) {
      var m = /^AE\/(\d{4})\/(\d+)$/.exec(String(e.ref || ''));
      if (m && Number(m[1]) === y) max = Math.max(max, Number(m[2]));
    });
    return 'AE/' + y + '/' + String(max + 1).padStart(4, '0');
  }

  function csvRow(cells) {
    return cells.map(function (c) {
      var s = String(c == null ? '' : c);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }

  function toCsv(headers, rows) {
    var out = [csvRow(headers)];
    rows.forEach(function (r) { out.push(csvRow(r)); });
    return out.join('\r\n') + '\r\n';
  }

  /* ---------------- search helpers ---------------- */

  function entrySearchText(entry, client) {
    return [entry.ref, client ? client.name : '', client ? client.taxId : '', entry.transportRef, entry.originCountry, entry.notes]
      .join(' ').toLowerCase();
  }

  return {
    STATUS_META: STATUS_META, STATUS_ORDER: STATUS_ORDER, TRANSITIONS: TRANSITIONS,
    MODES: MODES, DOC_TEMPLATES: DOC_TEMPLATES, CURRENCIES: CURRENCIES, INCOTERMS: INCOTERMS,
    PAY_TERMS: PAY_TERMS, PAY_METHODS: PAY_METHODS, ROLES: ROLES,
    uid: uid, num: num, round2: round2, todayIso: todayIso, daysBetween: daysBetween, lastMonths: lastMonths,
    label: label, utf8: utf8, sha256: sha256, hashPassword: hashPassword, verifyPassword: verifyPassword,
    computeEntry: computeEntry, tariffIndex: tariffIndex,
    docsFor: docsFor, ensureDocs: ensureDocs, docsStatus: docsStatus,
    canTransition: canTransition, applyTransition: applyTransition,
    validateEntry: validateEntry, validateClient: validateClient, validatePayment: validatePayment,
    permitStatus: permitStatus,
    paidFor: paidFor, clientLedger: clientLedger, agingBucket: agingBucket, entryAgeDays: entryAgeDays, agingFor: agingFor,
    computeKpis: computeKpis, monthlyDuty: monthlyDuty, clientTotals: clientTotals,
    nextRef: nextRef, csvRow: csvRow, toCsv: toCsv, entrySearchText: entrySearchText
  };
});
