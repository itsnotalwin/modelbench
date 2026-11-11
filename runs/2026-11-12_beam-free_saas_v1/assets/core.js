/* core.js — pure domain logic for ClearDesk. No DOM, no storage. */
(function (root) {
  "use strict";

  const JOB_STATUSES = [
    "draft", "booked", "in-transit", "arrived", "customs-filed",
    "cleared", "delivered", "closed", "cancelled"
  ];

  const STATUS_TRANSITIONS = {
    "draft": ["booked", "cancelled"],
    "booked": ["in-transit", "cancelled"],
    "in-transit": ["arrived", "cancelled"],
    "arrived": ["customs-filed", "cancelled"],
    "customs-filed": ["cleared", "cancelled"],
    "cleared": ["delivered", "cancelled"],
    "delivered": ["closed"],
    "closed": [],
    "cancelled": []
  };

  const MODES = ["sea", "air", "road", "rail"];
  const JOB_TYPES = ["import", "export", "transit", "re-export"];
  const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "INR", "CNY", "SGD", "JPY"];
  const CHARGE_CATEGORIES = [
    "freight", "customs-duty", "vat", "handling", "storage", "demurrage",
    "documentation", "agency-fee", "transport", "insurance", "other"
  ];
  const ROLES = ["admin", "agent", "clerk", "viewer"];

  function uid(prefix) {
    prefix = prefix || "id";
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function nowISO() { return new Date().toISOString(); }

  function parseDate(s) {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  function daysBetween(a, b) {
    const da = parseDate(a), db = parseDate(b);
    if (!da || !db) return 0;
    return Math.floor((db.getTime() - da.getTime()) / 86400000);
  }

  function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function clamp(n, min, max) {
    n = Number(n) || 0;
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function money(n, currency) {
    currency = currency || "USD";
    const v = round2(n);
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currency, minimumFractionDigits: 2 }).format(v);
    } catch (e) {
      return currency + " " + v.toFixed(2);
    }
  }

  function convert(amount, from, to, rates) {
    amount = Number(amount) || 0;
    if (from === to) return round2(amount);
    rates = rates || {};
    const rFrom = rates[from] || 1;
    const rTo = rates[to] || 1;
    if (!rTo) return round2(amount);
    return round2(amount * (rFrom / rTo));
  }

  function calcDutyLine(line) {
    const value = Number(line.value) || 0;
    const dutyRate = Number(line.dutyRate) || 0;
    const vatRate = Number(line.vatRate) || 0;
    const duty = round2(value * dutyRate / 100);
    const vatBase = value + duty;
    const vat = round2(vatBase * vatRate / 100);
    return {
      customsValue: round2(value),
      duty: duty,
      vat: vat,
      total: round2(value + duty + vat)
    };
  }

  function calcDutyTotals(lines) {
    const out = { value: 0, duty: 0, vat: 0, total: 0 };
    (lines || []).forEach(function (l) {
      const r = calcDutyLine(l);
      out.value += r.customsValue;
      out.duty += r.duty;
      out.vat += r.vat;
      out.total += r.total;
    });
    out.value = round2(out.value);
    out.duty = round2(out.duty);
    out.vat = round2(out.vat);
    out.total = round2(out.total);
    return out;
  }

  function demurrageCost(dischargeDate, freeDays, perDay, asOfDate) {
    freeDays = Number(freeDays) || 0;
    perDay = Number(perDay) || 0;
    asOfDate = asOfDate || nowISO();
    const elapsed = Math.max(0, daysBetween(dischargeDate, asOfDate));
    const chargeable = Math.max(0, elapsed - freeDays);
    return {
      elapsedDays: elapsed,
      freeDays: freeDays,
      chargeableDays: chargeable,
      cost: round2(chargeable * perDay)
    };
  }

  function chargeTotals(charges, rates, baseCurrency) {
    baseCurrency = baseCurrency || "USD";
    rates = rates || {};
    let total = 0;
    (charges || []).forEach(function (c) {
      const amt = convert(c.amount, c.currency || baseCurrency, baseCurrency, rates);
      total += amt;
    });
    return round2(total);
  }

  function genJobRef(seq, prefix) {
    prefix = prefix || "JOB";
    const y = new Date().getFullYear();
    const n = String(seq || 1).padStart(4, "0");
    return prefix + "-" + y + "-" + n;
  }

  function canTransition(from, to) {
    if (!from || !to) return false;
    const allowed = STATUS_TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.indexOf(to) !== -1;
  }

  function allowedTransitions(from) {
    return (STATUS_TRANSITIONS[from] || []).slice();
  }

  function validateUser(u) {
    const errors = {};
    u = u || {};
    if (!u.name || String(u.name).trim().length < 2) errors.name = "Name must be at least 2 characters.";
    if (!u.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email)) errors.email = "Valid email required.";
    if (!u.password || String(u.password).length < 6) errors.password = "Password must be at least 6 characters.";
    if (u.role && ROLES.indexOf(u.role) === -1) errors.role = "Invalid role.";
    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  function validateClient(c) {
    const errors = {};
    c = c || {};
    if (!c.name || String(c.name).trim().length < 2) errors.name = "Client name required.";
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) errors.email = "Invalid email.";
    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  function validateJob(j) {
    const errors = {};
    j = j || {};
    if (!j.clientId) errors.clientId = "Client required.";
    if (!j.mode || MODES.indexOf(j.mode) === -1) errors.mode = "Valid mode required.";
    if (!j.type || JOB_TYPES.indexOf(j.type) === -1) errors.type = "Valid type required.";
    if (!j.shipper || String(j.shipper).trim().length < 2) errors.shipper = "Shipper required.";
    if (!j.consignee || String(j.consignee).trim().length < 2) errors.consignee = "Consignee required.";
    if (j.weightKg != null && (isNaN(j.weightKg) || Number(j.weightKg) < 0)) errors.weightKg = "Invalid weight.";
    if (j.volumeCbm != null && (isNaN(j.volumeCbm) || Number(j.volumeCbm) < 0)) errors.volumeCbm = "Invalid volume.";
    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  function validateEntryLine(l) {
    const errors = {};
    l = l || {};
    if (!l.hs || String(l.hs).trim().length < 4) errors.hs = "HS code required (min 4 chars).";
    if (!l.description || String(l.description).trim().length < 2) errors.description = "Description required.";
    if (isNaN(l.value) || Number(l.value) < 0) errors.value = "Valid value required.";
    if (isNaN(l.dutyRate) || Number(l.dutyRate) < 0 || Number(l.dutyRate) > 100) errors.dutyRate = "Duty rate 0-100.";
    if (isNaN(l.vatRate) || Number(l.vatRate) < 0 || Number(l.vatRate) > 100) errors.vatRate = "VAT rate 0-100.";
    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  function validateCharge(c) {
    const errors = {};
    c = c || {};
    if (!c.category || CHARGE_CATEGORIES.indexOf(c.category) === -1) errors.category = "Valid category required.";
    if (isNaN(c.amount) || Number(c.amount) < 0) errors.amount = "Valid amount required.";
    if (!c.currency || CURRENCIES.indexOf(c.currency) === -1) errors.currency = "Valid currency required.";
    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  function filterJobs(jobs, f) {
    f = f || {};
    let out = (jobs || []).slice();
    if (f.q) {
      const q = String(f.q).toLowerCase();
      out = out.filter(function (j) {
        return [j.ref, j.shipper, j.consignee, j.blNumber, j.containerNo, j.vessel]
          .some(function (v) { return v && String(v).toLowerCase().indexOf(q) !== -1; });
      });
    }
    if (f.status) out = out.filter(function (j) { return j.status === f.status; });
    if (f.mode) out = out.filter(function (j) { return j.mode === f.mode; });
    if (f.type) out = out.filter(function (j) { return j.type === f.type; });
    if (f.clientId) out = out.filter(function (j) { return j.clientId === f.clientId; });
    return out;
  }

  function filterClients(clients, q) {
    if (!q) return (clients || []).slice();
    const s = String(q).toLowerCase();
    return (clients || []).filter(function (c) {
      return [c.name, c.email, c.phone, c.country].some(function (v) { return v && String(v).toLowerCase().indexOf(s) !== -1; });
    });
  }

  function toCSV(rows, columns) {
    columns = columns || Object.keys(rows[0] || {});
    const esc = function (v) {
      if (v == null) return "";
      const s = String(v);
      if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const lines = [columns.map(esc).join(",")];
    rows.forEach(function (r) {
      lines.push(columns.map(function (c) { return esc(r[c]); }).join(","));
    });
    return lines.join("\r\n");
  }

  function csvDownload(filename, csv) {
    // browser helper; returns a data URL
    return "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  }

  function buildCommercialInvoice(job, client, lines, company) {
    company = company || {};
    const totals = calcDutyTotals(lines);
    const rows = (lines || []).map(function (l, i) {
      const r = calcDutyLine(l);
      return "<tr><td>" + (i + 1) + "</td><td>" + escHtml(l.hs) + "</td><td>" + escHtml(l.description) + "</td>" +
        "<td class='num'>" + (l.qty || 1) + "</td><td class='num'>" + money(l.value, l.currency || "USD") + "</td>" +
        "<td class='num'>" + money(r.duty, l.currency || "USD") + "</td><td class='num'>" + money(r.vat, l.currency || "USD") + "</td>" +
        "<td class='num'>" + money(r.total, l.currency || "USD") + "</td></tr>";
    }).join("");
    return "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Commercial Invoice " + escHtml(job.ref) + "</title>" +
      "<style>body{font-family:Arial,sans-serif;margin:24px;color:#000}h1{font-size:20px;margin:0 0 4px}.muted{color:#555;font-size:12px}" +
      "table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #999;padding:6px 8px;font-size:12px}" +
      "th{background:#eee}.num{text-align:right} .tot{font-weight:bold;background:#f5f5f5}</style></head><body>" +
      "<h1>COMMERCIAL INVOICE</h1><div class='muted'>" + escHtml(company.name || "Clearing Agent") + "</div>" +
      "<table style='border:none;margin-top:8px'><tr><td><b>Invoice No:</b> " + escHtml(job.ref) + "</td><td><b>Date:</b> " + new Date().toLocaleDateString() + "</td></tr>" +
      "<tr><td><b>Shipper:</b> " + escHtml(job.shipper) + "</td><td><b>Consignee:</b> " + escHtml(job.consignee) + "</td></tr>" +
      "<tr><td><b>Client:</b> " + escHtml(client ? client.name : "") + "</td><td><b>Mode:</b> " + escHtml(job.mode) + " / " + escHtml(job.type) + "</td></tr>" +
      "<tr><td><b>Vessel/Flight:</b> " + escHtml(job.vessel || "-") + "</td><td><b>B/L or AWB:</b> " + escHtml(job.blNumber || "-") + "</td></tr>" +
      "<tr><td><b>Port of Loading:</b> " + escHtml(job.pol || "-") + "</td><td><b>Port of Discharge:</b> " + escHtml(job.pod || "-") + "</td></tr>" +
      "<tr><td><b>Container No:</b> " + escHtml(job.containerNo || "-") + "</td><td><b>Packages:</b> " + (job.packages || 0) + " / " + (job.weightKg || 0) + " kg / " + (job.volumeCbm || 0) + " cbm</td></tr></table>" +
      "<table><thead><tr><th>#</th><th>HS Code</th><th>Description</th><th>Qty</th><th>Value</th><th>Duty</th><th>VAT</th><th>Total</th></tr></thead><tbody>" + rows + "</tbody>" +
      "<tfoot><tr class='tot'><td colspan='4'>TOTAL</td><td class='num'>" + money(totals.value, "USD") + "</td><td class='num'>" + money(totals.duty, "USD") + "</td>" +
      "<td class='num'>" + money(totals.vat, "USD") + "</td><td class='num'>" + money(totals.total, "USD") + "</td></tr></tfoot></table>" +
      "<p class='muted' style='margin-top:16px'>Generated by ClearDesk. Values are estimates pending customs assessment.</p></body></html>";
  }

  function buildPackingList(job, lines, company) {
    company = company || {};
    const rows = (lines || []).map(function (l, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + escHtml(l.description) + "</td><td>" + escHtml(l.hs) + "</td>" +
        "<td class='num'>" + (l.qty || 1) + "</td><td class='num'>" + (l.weightKg || 0) + " kg</td><td class='num'>" + (l.volumeCbm || 0) + " cbm</td></tr>";
    }).join("");
    return "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Packing List " + escHtml(job.ref) + "</title>" +
      "<style>body{font-family:Arial,sans-serif;margin:24px;color:#000}h1{font-size:20px;margin:0 0 4px}.muted{color:#555;font-size:12px}" +
      "table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #999;padding:6px 8px;font-size:12px}th{background:#eee}.num{text-align:right}</style></head><body>" +
      "<h1>PACKING LIST</h1><div class='muted'>" + escHtml(company.name || "Clearing Agent") + "</div>" +
      "<table style='border:none;margin-top:8px'><tr><td><b>Job Ref:</b> " + escHtml(job.ref) + "</td><td><b>Date:</b> " + new Date().toLocaleDateString() + "</td></tr>" +
      "<tr><td><b>Shipper:</b> " + escHtml(job.shipper) + "</td><td><b>Consignee:</b> " + escHtml(job.consignee) + "</td></tr>" +
      "<tr><td><b>Vessel/Flight:</b> " + escHtml(job.vessel || "-") + "</td><td><b>B/L or AWB:</b> " + escHtml(job.blNumber || "-") + "</td></tr>" +
      "<tr><td><b>Port of Loading:</b> " + escHtml(job.pol || "-") + "</td><td><b>Port of Discharge:</b> " + escHtml(job.pod || "-") + "</td></tr>" +
      "<tr><td><b>Container No:</b> " + escHtml(job.containerNo || "-") + "</td><td><b>Total Packages:</b> " + (job.packages || 0) + "</td></tr></table>" +
      "<table><thead><tr><th>#</th><th>Description</th><th>HS Code</th><th>Qty</th><th>Weight</th><th>Volume</th></tr></thead><tbody>" + rows + "</tbody></table>" +
      "<p class='muted' style='margin-top:16px'>Total weight: " + (job.weightKg || 0) + " kg &nbsp; Total volume: " + (job.volumeCbm || 0) + " cbm</p></body></html>";
  }

  function buildDeliveryOrder(job, client, company) {
    company = company || {};
    return "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Delivery Order " + escHtml(job.ref) + "</title>" +
      "<style>body{font-family:Arial,sans-serif;margin:24px;color:#000}h1{font-size:20px;margin:0 0 4px}.muted{color:#555;font-size:12px}" +
      "table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #999;padding:8px 10px;font-size:13px}</style></head><body>" +
      "<h1>DELIVERY ORDER</h1><div class='muted'>" + escHtml(company.name || "Clearing Agent") + "</div>" +
      "<table><tr><td><b>Job Ref:</b> " + escHtml(job.ref) + "</td><td><b>Date:</b> " + new Date().toLocaleDateString() + "</td></tr>" +
      "<tr><td><b>Consignee:</b> " + escHtml(job.consignee) + "</td><td><b>Client:</b> " + escHtml(client ? client.name : "") + "</td></tr>" +
      "<tr><td><b>Vessel/Flight:</b> " + escHtml(job.vessel || "-") + "</td><td><b>B/L or AWB:</b> " + escHtml(job.blNumber || "-") + "</td></tr>" +
      "<tr><td><b>Port of Discharge:</b> " + escHtml(job.pod || "-") + "</td><td><b>Container No:</b> " + escHtml(job.containerNo || "-") + "</td></tr>" +
      "<tr><td><b>Packages:</b> " + (job.packages || 0) + "</td><td><b>Weight:</b> " + (job.weightKg || 0) + " kg</td></tr>" +
      "<tr><td colspan='2'><b>Instructions:</b> Please release cargo to the consignee upon presentation of this order and original B/L.</td></tr></table>" +
      "<p style='margin-top:24px'>Authorised signature: ____________________ &nbsp;&nbsp; Date: ____________</p></body></html>";
  }

  function buildChargeSheet(job, charges, company, rates, baseCurrency) {
    company = company || {};
    baseCurrency = baseCurrency || "USD";
    rates = rates || {};
    const rows = (charges || []).map(function (c, i) {
      const amt = convert(c.amount, c.currency, baseCurrency, rates);
      return "<tr><td>" + (i + 1) + "</td><td>" + escHtml(c.category) + "</td><td>" + escHtml(c.description || "") + "</td>" +
        "<td class='num'>" + money(c.amount, c.currency) + "</td><td class='num'>" + money(amt, baseCurrency) + "</td></tr>";
    }).join("");
    const total = chargeTotals(charges, rates, baseCurrency);
    return "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Charge Sheet " + escHtml(job.ref) + "</title>" +
      "<style>body{font-family:Arial,sans-serif;margin:24px;color:#000}h1{font-size:20px;margin:0 0 4px}.muted{color:#555;font-size:12px}" +
      "table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #999;padding:6px 8px;font-size:12px}th{background:#eee}.num{text-align:right}.tot{font-weight:bold;background:#f5f5f5}</style></head><body>" +
      "<h1>CHARGE SHEET / INVOICE</h1><div class='muted'>" + escHtml(company.name || "Clearing Agent") + "</div>" +
      "<table style='border:none;margin-top:8px'><tr><td><b>Job Ref:</b> " + escHtml(job.ref) + "</td><td><b>Date:</b> " + new Date().toLocaleDateString() + "</td></tr>" +
      "<tr><td><b>Client:</b> " + escHtml(job.clientName || "") + "</td><td><b>Mode:</b> " + escHtml(job.mode) + "</td></tr></table>" +
      "<table><thead><tr><th>#</th><th>Category</th><th>Description</th><th>Amount</th><th>In " + escHtml(baseCurrency) + "</th></tr></thead><tbody>" + rows + "</tbody>" +
      "<tfoot><tr class='tot'><td colspan='3'>TOTAL</td><td></td><td class='num'>" + money(total, baseCurrency) + "</td></tr></tfoot></table>" +
      "<p class='muted' style='margin-top:16px'>Payment due within 14 days. Thank you for your business.</p></body></html>";
  }

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Storage helpers (safe)
  function safeParse(str, fallback) {
    try { return JSON.parse(str); } catch (e) { return fallback; }
  }

  function safeGet(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      if (v == null) return fallback;
      return safeParse(v, fallback);
    } catch (e) { return fallback; }
  }

  function safeSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }

  function safeRemove(key) {
    try { localStorage.removeItem(key); return true; } catch (e) { return false; }
  }

  const api = {
    JOB_STATUSES, STATUS_TRANSITIONS, MODES, JOB_TYPES, CURRENCIES,
    CHARGE_CATEGORIES, ROLES,
    uid, nowISO, parseDate, daysBetween, round2, clamp, money, convert,
    calcDutyLine, calcDutyTotals, demurrageCost, chargeTotals, genJobRef,
    canTransition, allowedTransitions,
    validateUser, validateClient, validateJob, validateEntryLine, validateCharge,
    filterJobs, filterClients, toCSV, csvDownload,
    buildCommercialInvoice, buildPackingList, buildDeliveryOrder, buildChargeSheet,
    escHtml, safeParse, safeGet, safeSet, safeRemove
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.CDCore = api;
  if (typeof globalThis !== "undefined") globalThis.CDCore = api;
})(typeof self !== "undefined" ? self : (typeof global !== "undefined" ? global : this));
