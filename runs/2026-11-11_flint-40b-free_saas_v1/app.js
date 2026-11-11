/* ==========================================================================
   ClearLane — customs clearance operations console (static build)

   Core domain logic is intentionally framework-free and pure so it can be
   self-tested in any JS runtime. UI wiring is guarded and only runs in a DOM.
   All persistence goes through try/catch-wrapped localStorage helpers.
   ========================================================================== */

/* ------------------------------- helpers ------------------------------ */

function uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function toNum(v) {
  if (v === null || v === undefined || v === "") return 0;
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

function pad2(n) { return n < 10 ? "0" + n : String(n); }

function todayISO() {
  var d = new Date();
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

function fmtMoney(n) {
  return "$" + toNum(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) { return d || "—"; }

function normUpper(v) { return typeof v === "string" ? v.trim().toUpperCase() : ""; }

function isValidCountry(v) { return typeof v === "string" && /^[A-Z]{2}$/.test(v.trim().toUpperCase()); }

function isValidHsCode(v) {
  if (typeof v !== "string") return false;
  var cleaned = v.trim().replace(/\./g, "");
  return /^[0-9]{6,10}$/.test(cleaned);
}

/* ------------------------------ constants ----------------------------- */

function getIncoterms() {
  return ["EXW", "FCA", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];
}

function isValidIncoterm(v) {
  if (typeof v !== "string") return false;
  return getIncoterms().indexOf(v.trim().toUpperCase()) !== -1;
}

function getStatuses() {
  return ["pending", "documents", "entry_submitted", "under_review", "cleared", "rejected"];
}

function getStatusLabel(s) {
  var map = {
    pending: "Pending",
    documents: "Documents",
    entry_submitted: "Entry submitted",
    under_review: "Under review",
    cleared: "Cleared",
    rejected: "Rejected"
  };
  return map[s] || s;
}

function getStatusHint(s) {
  var map = {
    pending: "Booking received — documentation not started.",
    documents: "Commercial invoice / packing list in preparation.",
    entry_submitted: "Customs entry declaration filed.",
    under_review: "Customs examination in progress.",
    cleared: "Released by customs.",
    rejected: "Entry rejected — rework required."
  };
  return map[s] || "";
}

/* ---------------------------- validation ------------------------------ */

function validateShipment(s) {
  s = s || {};
  var errors = {};
  var consignee = s.consignee || {};
  var consignor = s.consignor || {};

  if (!s.reference || !/^[A-Z]{2,4}-[0-9]{3,6}$/.test(String(s.reference).trim().toUpperCase())) {
    errors.reference = "Format must be CLN-0000 (two-letter prefix, dash, numeric id).";
  }
  if (!consignee.name || consignee.name.trim().length < 2) errors["consignee.name"] = "Consignee name is required.";
  if (!isValidCountry(consignee.country)) errors["consignee.country"] = "Enter a 2-letter ISO country code.";
  if (!consignor.name || consignor.name.trim().length < 2) errors["consignor.name"] = "Exporter name is required.";
  if (!isValidCountry(consignor.country)) errors["consignor.country"] = "Enter a 2-letter ISO country code.";
  if (!isValidHsCode(s.hsCode)) errors.hsCode = "HS code must be numeric, 6 to 10 digits (e.g. 847130 or 8471.30).";
  if (!isValidIncoterm(s.incoterm)) errors.incoterm = "Select a valid Incoterm.";
  if (!s.goodsDescription || s.goodsDescription.trim().length < 3) errors.goodsDescription = "Goods description is required.";

  var qty = toNum(s.quantity);
  if (isNaN(qty) || qty < 1 || Math.floor(qty) !== qty) errors.quantity = "Quantity must be a whole number ≥ 1.";

  var uw = toNum(s.unitWeightKg);
  if (isNaN(uw) || uw <= 0) errors.unitWeightKg = "Unit weight must be greater than 0.";

  var dv = toNum(s.declaredValueUsd);
  if (isNaN(dv) || dv <= 0) errors.declaredValueUsd = "Declared value must be greater than 0.";

  var fr = toNum(s.freightUsd);
  if (isNaN(fr) || fr < 0) errors.freightUsd = "Freight must be ≥ 0.";

  var ins = toNum(s.insuranceUsd);
  if (isNaN(ins) || ins < 0) errors.insuranceUsd = "Insurance must be ≥ 0.";

  var pkg = s.packageCount === null || s.packageCount === undefined || s.packageCount === "" ? 1 : toNum(s.packageCount);
  if (isNaN(pkg) || pkg < 1) errors.packageCount = "Package count must be ≥ 1.";

  return { ok: Object.keys(errors).length === 0, errors: errors };
}

/* --------------------------- status workflow -------------------------- */

function canTransition(from, to) {
  var allowed = {
    pending: ["documents"],
    documents: ["entry_submitted"],
    entry_submitted: ["under_review", "rejected"],
    under_review: ["cleared", "rejected"],
    cleared: [],
    rejected: ["documents"]
  };
  var list = allowed[from] || [];
  return list.indexOf(to) !== -1;
}

function getNextActions(from) {
  if (from === "pending") return [{ status: "documents", label: "Start document preparation" }];
  if (from === "documents") return [{ status: "entry_submitted", label: "File customs entry" }];
  if (from === "entry_submitted") return [{ status: "under_review", label: "Send to customs review" }, { status: "rejected", label: "Mark rejected" }];
  if (from === "under_review") return [{ status: "cleared", label: "Mark cleared" }, { status: "rejected", label: "Mark rejected" }];
  if (from === "rejected") return [{ status: "documents", label: "Rework documents" }];
  if (from === "cleared") return [];
  return [];
}

/* ---------------------------- calculations ---------------------------- */

function computeCustomsValue(s) {
  s = s || {};
  return toNum(s.declaredValueUsd) + toNum(s.freightUsd) + toNum(s.insuranceUsd);
}

function dutyRateFor(hsCode) {
  var prefix = String(hsCode || "").split(".")[0].slice(0, 4);
  var rates = {
    "0302": 0.05,
    "0401": 0.1,
    "4802": 0.17,
    "6109": 0.12,
    "8456": 0.027,
    "8517": 0.0,
    "9403": 0.06
  };
  var r = rates[prefix];
  return r === undefined ? 0.06 : r;
}

function estimateDuty(s) {
  s = s || {};
  var cv = computeCustomsValue(s);
  var duty = cv * dutyRateFor(s.hsCode);
  return Math.round(duty * 100) / 100;
}

function computeGrossWeight(s) {
  s = s || {};
  return Math.round(toNum(s.quantity) * toNum(s.unitWeightKg) * 100) / 100;
}

function computeUnitValue(s) {
  s = s || {};
  var qty = toNum(s.quantity);
  return qty > 0 ? toNum(s.declaredValueUsd) / qty : 0;
}

/* ------------------------------ documents ----------------------------- */

function buildCommercialInvoice(s) {
  s = s || {};
  var cv = computeCustomsValue(s);
  var num = parseInt(String(s.reference || "").split("-")[1], 10) || 0;
  var invNum = "INV-" + String(num).padStart(4, "0");
  var buyer = s.consignee || {};
  var seller = s.consignor || {};
  var qty = toNum(s.quantity);
  return {
    kind: "commercial_invoice",
    number: invNum,
    date: todayISO(),
    seller: seller,
    buyer: buyer,
    goodsDescription: s.goodsDescription,
    hsCode: s.hsCode,
    incoterm: s.incoterm,
    quantity: qty,
    unitValueUsd: computeUnitValue(s),
    lineTotalUsd: toNum(s.declaredValueUsd),
    freightUsd: toNum(s.freightUsd),
    insuranceUsd: toNum(s.insuranceUsd),
    customsValueUsd: cv,
    dutyEstimateUsd: estimateDuty(s)
  };
}

function commercialInvoiceText(inv) {
  var seller = inv.seller || {};
  var buyer = inv.buyer || {};
  return [
    "CLEARLANE COMMERCIAL INVOICE",
    "Invoice No: " + inv.number,
    "Date: " + inv.date,
    "Incoterms: " + (inv.incoterm || "-"),
    "",
    "Seller: " + (seller.name || "-") + " (" + (seller.country || "-") + ")",
    "Buyer: " + (buyer.name || "-") + " (" + (buyer.country || "-") + ")",
    "",
    "Description of Goods: " + (inv.goodsDescription || "-"),
    "HS Code: " + (inv.hsCode || "-"),
    "Quantity: " + inv.quantity,
    "Unit Value (USD): " + inv.unitValueUsd.toFixed(2),
    "Line Total (USD): " + inv.lineTotalUsd.toFixed(2),
    "Freight (USD): " + inv.freightUsd.toFixed(2),
    "Insurance (USD): " + inv.insuranceUsd.toFixed(2),
    "------------------------------",
    "Total Invoice Value (USD): " + inv.lineTotalUsd.toFixed(2),
    "Customs Value (USD): " + inv.customsValueUsd.toFixed(2),
    "Estimated Duty (USD): " + inv.dutyEstimateUsd.toFixed(2)
  ].join("\n");
}

function buildPackingList(s) {
  s = s || {};
  var buyer = s.consignee || {};
  var seller = s.consignor || {};
  return {
    kind: "packing_list",
    reference: s.reference,
    date: todayISO(),
    seller: seller,
    buyer: buyer,
    hsCode: s.hsCode,
    incoterm: s.incoterm,
    packageCount: toNum(s.packageCount) || 1,
    quantity: toNum(s.quantity),
    grossWeightKg: computeGrossWeight(s),
    declaredValueUsd: toNum(s.declaredValueUsd)
  };
}

function packingListText(pl) {
  var seller = pl.seller || {};
  var buyer = pl.buyer || {};
  return [
    "CLEARLANE PACKING LIST",
    "Reference: " + pl.reference,
    "Date: " + pl.date,
    "Consignee: " + (buyer.name || "-") + " (" + (buyer.country || "-") + ")",
    "Exporter: " + (seller.name || "-") + " (" + (seller.country || "-") + ")",
    "",
    "HS Code: " + (pl.hsCode || "-"),
    "Incoterms: " + (pl.incoterm || "-"),
    "Packages: " + pl.packageCount,
    "Total Quantity: " + pl.quantity,
    "Gross Weight (kg): " + pl.grossWeightKg.toFixed(2),
    "Declared Value (USD): " + pl.declaredValueUsd.toFixed(2)
  ].join("\n");
}

function buildCustomsEntry(s) {
  s = s || {};
  var num = parseInt(String(s.reference || "").split("-")[1], 10) || 0;
  var buyer = s.consignee || {};
  var seller = s.consignor || {};
  var cv = computeCustomsValue(s);
  return {
    kind: "customs_entry",
    entryId: "CNS-" + String(num).padStart(4, "0"),
    reference: s.reference,
    hsCode: s.hsCode,
    hsDescription: s.goodsDescription,
    incoterm: s.incoterm,
    countryOfOrigin: seller.country || "",
    countryOfImport: buyer.country || "",
    goodsDescription: s.goodsDescription,
    quantity: toNum(s.quantity),
    unitWeightKg: toNum(s.unitWeightKg),
    grossWeightKg: computeGrossWeight(s),
    customsValueUsd: cv,
    declaredValueUsd: toNum(s.declaredValueUsd),
    freightUsd: toNum(s.freightUsd),
    insuranceUsd: toNum(s.insuranceUsd),
    estimatedDutyUsd: estimateDuty(s),
    dutyRate: dutyRateFor(s.hsCode),
    status: s.status || "pending"
  };
}

/* --------------------------------- CSV -------------------------------- */

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  var str = String(v);
  if (/[",\r\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

function shipmentsToCSV(list) {
  var header = ["reference", "date", "consignee", "consignor", "country_of_origin", "country_of_import", "hs_code", "incoterm", "goods_description", "quantity", "unit_weight_kg", "gross_weight_kg", "declared_value_usd", "freight_usd", "insurance_usd", "customs_value_usd", "estimated_duty_usd", "status"];
  var rows = [header.join(",")];
  (list || []).forEach(function(s) {
    var buyer = s.consignee || {};
    var seller = s.consignor || {};
    var row = [
      s.reference, s.createdAt, buyer.name, seller.name, seller.country, buyer.country,
      s.hsCode, s.incoterm, s.goodsDescription, s.quantity, s.unitWeightKg, computeGrossWeight(s),
      s.declaredValueUsd, s.freightUsd, s.insuranceUsd, computeCustomsValue(s), estimateDuty(s), s.status
    ];
    rows.push(row.map(csvEscape).join(","));
  });
  return rows.join("\r\n");
}

/* ------------------------------ self tests ---------------------------- */

function runSelfTests() {
  var results = [];
  function test(name, fn) {
    var r = { name: name, pass: false, error: null };
    try { fn(); r.pass = true; } catch (e) { r.error = String(e); }
    results.push(r);
  }
  test("HS code validation accepts 6 digits + optional suffix", function () { if (!isValidHsCode("8471.30")) throw new Error("8471.30 should be valid"); });
  test("HS code validation rejects malformed values", function () { if (isValidHsCode("8471")) throw new Error("8471 should be invalid"); if (isValidHsCode("")) throw new Error("empty should be invalid"); });
  test("Incoterm validation accepts known terms", function () { if (!isValidIncoterm("CIF")) throw new Error("CIF should be valid"); });
  test("Incoterm validation rejects unknown terms", function () { if (isValidIncoterm("ZZZ")) throw new Error("ZZZ should be invalid"); });
  test("Status workflow allows documented path only", function () {
    if (!canTransition("pending", "documents")) throw new Error("pending -> documents must be allowed");
    if (canTransition("pending", "cleared")) throw new Error("pending -> cleared must be forbidden");
    if (!canTransition("under_review", "rejected")) throw new Error("under_review -> rejected must be allowed");
  });
  test("Customs value equals declared + freight + insurance", function () {
    var s = { declaredValueUsd: 1000, freightUsd: 100, insuranceUsd: 50 };
    if (Math.abs(computeCustomsValue(s) - 1150) > 1e-9) throw new Error("customs value mismatch");
  });
  test("Shipment validation fails on empty payload", function () {
    var v = validateShipment({});
    if (v.ok) throw new Error("empty shipment should not validate");
    if (!v.errors["consignee.name"]) throw new Error("consignee.name error missing");
  });
  test("Shipment validation passes on complete payload", function () {
    var v = validateShipment({
      reference: "CLN-0001",
      consignee: { name: "Buyer GmbH", country: "DE" },
      consignor: { name: "Seller AG", country: "DE" },
      hsCode: "8471.30",
      incoterm: "CIF",
      goodsDescription: "Hydraulic pumps",
      quantity: 4,
      unitWeightKg: 12,
      declaredValueUsd: 8000,
      freightUsd: 900,
      insuranceUsd: 80,
      packageCount: 2
    });
    if (!v.ok) throw new Error("valid shipment rejected: " + JSON.stringify(v.errors));
  });
  test("Duty estimate scales with customs value", function () {
    var a = estimateDuty({ hsCode: "8471.30", declaredValueUsd: 1000, freightUsd: 0, insuranceUsd: 0 });
    var b = estimateDuty({ hsCode: "8471.30", declaredValueUsd: 2000, freightUsd: 0, insuranceUsd: 0 });
    if (Math.abs(a * 2 - b) > 0.0001) throw new Error("duty estimate not linear");
  });
  test("CSV export escapes quoted fields", function () {
    var csv = shipmentsToCSV([{ reference: 'CLN-0001', createdAt: "2026-11-11", consignee: { name: 'Doe, Jane' }, consignor: { name: "Acme", country: "US" }, hsCode: "8471.30", incoterm: "CIF", goodsDescription: "Pumps \"pro\"", quantity: 2, unitWeightKg: 5, declaredValueUsd: 100, freightUsd: 10, insuranceUsd: 1, status: "pending" }]);
    if (csv.indexOf('"Doe, Jane"') === -1) throw new Error("CSV escaping failed");
  });
  return results;
}

/* --------------------------- storage / auth --------------------------- */

function storageGet(key, fallback) {
  try {
    var raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (e) { return fallback; }
}
function storageSet(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}
function storageRemove(key) {
  try { window.localStorage.removeItem(key); return true; } catch (e) { return false; }
}

function hashPassword(password, salt) {
  var str = String(salt) + "::" + String(password);
  var h1 = 0xdeadbeef ^ str.length;
  var h2 = 0x41c6ce57 ^ str.length;
  for (var i = 0; i < str.length; i++) {
    var ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
}

function seedUsers() {
  return [
    { name: "Maya Chen", email: "demo@clarlane.io", passHash: hashPassword("demo1234", "clarlane"), salt: "clarlane", createdAt: todayISO() }
  ];
}

function findUser(users, email) {
  var target = String(email || "").trim().toLowerCase();
  for (var i = 0; i < (users || []).length; i++) {
    if (String(users[i].email || "").toLowerCase() === target) return users[i];
  }
  return null;
}

function signIn(email, password) {
  var users = storageGet("clarlane.users", null);
  if (!users) users = seedUsers();
  var user = findUser(users, email);
  if (!user) return { ok: false, error: "No account found for that email." };
  if (user.passHash !== hashPassword(password, user.salt)) return { ok: false, error: "Incorrect password. Please try again." };
  storageSet("clarlane.session", user.email);
  if (user.email === "demo@clarlane.io" && storageGet(shipmentsKey(user.email), null) === null) { saveShipments(user.email, seedShipments()); }
  return { ok: true, user: user };
}

function signUp(name, email, password) {
  var users = storageGet("clarlane.users", null);
  if (!users) users = seedUsers();
  if (findUser(users, email)) return { ok: false, error: "An account with that email already exists." };
  var user = { name: String(name || "").trim(), email: String(email || "").trim().toLowerCase(), passHash: hashPassword(password, "clarlane"), salt: "clarlane", createdAt: todayISO() };
  users.push(user);
  storageSet("clarlane.users", users);
  storageSet("clarlane.session", user.email);
  if (user.email === "demo@clarlane.io" && storageGet(shipmentsKey(user.email), null) === null) { saveShipments(user.email, seedShipments()); }
  return { ok: true, user: user };
}

function getSessionEmail() { return storageGet("clarlane.session", null); }

/* ---------------------------- shipments ------------------------------- */

function shipmentsKey(email) { return "clarlane.shipments." + String(email || "").toLowerCase(); }

function loadShipments(email) { return storageGet(shipmentsKey(email), null) || []; }
function saveShipments(email, list) { return storageSet(shipmentsKey(email), list); }

function seedShipments() {
  var now = todayISO();
  return [
    { id: uid("shp"), reference: "CLN-0001", status: "cleared", createdAt: "2026-10-14", updatedAt: "2026-10-21", consignee: { name: "Nordvik Trading GmbH", country: "DE" }, consignor: { name: "Alpine Bearings AB", country: "SE" }, hsCode: "8431.21", incoterm: "CIF", goodsDescription: "Precision ball bearings 6204-2RS", quantity: 400, unitWeightKg: 1.2, declaredValueUsd: 18400, freightUsd: 3200, insuranceUsd: 400, packageCount: 6 },
    { id: uid("shp"), reference: "CLN-0002", status: "under_review", createdAt: "2026-11-02", updatedAt: "2026-11-09", consignee: { name: "Kobayashi Components Ltd", country: "JP" }, consignor: { name: "Shenzhen BrightMfg Co.", country: "CN" }, hsCode: "8517.62", incoterm: "FOB", goodsDescription: "Smartphone camera modules", quantity: 250, unitWeightKg: 0.08, declaredValueUsd: 96000, freightUsd: 12800, insuranceUsd: 960, packageCount: 12 },
    { id: uid("shp"), reference: "CLN-0003", status: "entry_submitted", createdAt: "2026-11-06", updatedAt: "2026-11-10", consignee: { name: "Andes Foods S.A.", country: "CL" }, consignor: { name: "Lactosur SA", country: "AR" }, hsCode: "0401.10", incoterm: "CIF", goodsDescription: "Whole milk powder", quantity: 120, unitWeightKg: 25, declaredValueUsd: 54000, freightUsd: 8600, insuranceUsd: 540, packageCount: 4 },
    { id: uid("shp"), reference: "CLN-0004", status: "documents", createdAt: "2026-11-09", updatedAt: "2026-11-09", consignee: { name: "Helvetia Machinery AG", country: "CH" }, consignor: { name: "Muller Werke", country: "DE" }, hsCode: "8456.71", incoterm: "DAP", goodsDescription: "Industrial hydraulic gear pumps", quantity: 6, unitWeightKg: 45, declaredValueUsd: 31200, freightUsd: 5400, insuranceUsd: 312, packageCount: 3 },
    { id: uid("shp"), reference: "CLN-0005", status: "pending", createdAt: "2026-11-11", updatedAt: "2026-11-11", consignee: { name: "Pacific Retail Group", country: "US" }, consignor: { name: "Guangzhou HomeTextiles", country: "CN" }, hsCode: "6302.42", incoterm: "FOB", goodsDescription: "Cotton table linens", quantity: 1500, unitWeightKg: 0.35, declaredValueUsd: 22500, freightUsd: 3900, insuranceUsd: 225, packageCount: 20 },
    { id: uid("shp"), reference: "CLN-0006", status: "rejected", createdAt: "2026-10-28", updatedAt: "2026-11-04", consignee: { name: "Nordvik Trading GmbH", country: "DE" }, consignor: { name: "Bunker Supplies A/S", country: "DK" }, hsCode: "2712.19", incoterm: "CIF", goodsDescription: "Marine diesel fuel HVO", quantity: 40, unitWeightKg: 200, declaredValueUsd: 88000, freightUsd: 21000, insuranceUsd: 880, packageCount: 2 }
  ];
}

function nextReference(list) {
  var max = 0;
  (list || []).forEach(function(s) {
    var m = /^CLN-(\d+)$/.exec(String(s.reference || ""));
    if (m) { var n = parseInt(m[1], 10); if (n > max) max = n; }
  });
  return "CLN-" + String(max + 1).padStart(4, "0");
}

function createShipment(email, data) {
  var list = loadShipments(email);
  var now = todayISO();
  var shipment = {
    id: uid("shp"),
    reference: nextReference(list),
    status: "pending",
    createdAt: now,
    updatedAt: now,
    consignee: { name: data.consigneeName, country: normUpper(data.consigneeCountry) },
    consignor: { name: data.consignorName, country: normUpper(data.consignorCountry) },
    hsCode: String(data.hsCode || "").trim(),
    incoterm: normUpper(data.incoterm),
    goodsDescription: data.goodsDescription,
    quantity: toNum(data.quantity),
    unitWeightKg: toNum(data.unitWeightKg),
    declaredValueUsd: toNum(data.declaredValueUsd),
    freightUsd: toNum(data.freightUsd),
    insuranceUsd: toNum(data.insuranceUsd),
    packageCount: toNum(data.packageCount) || 1
  };
  list.unshift(shipment);
  saveShipments(email, list);
  return shipment;
}

function updateShipment(email, id, patch) {
  var list = loadShipments(email);
  var next = null;
  var updated = (list || []).map(function(s) {
    if (s.id === id) { next = Object.assign({}, s, patch, { updatedAt: todayISO() }); return next; }
    return s;
  });
  if (next) saveShipments(email, updated);
  return next;
}

function deleteShipment(email, id) {
  var list = (loadShipments(email) || []).filter(function(s) { return s.id !== id; });
  saveShipments(email, list);
  return list;
}

function getFilteredShipments(list, query, status, country) {
  var q = String(query || "").trim().toLowerCase();
  return (list || []).filter(function(s) {
    if (status && s.status !== status) return false;
    if (country && normUpper(s.consignee && s.consignee.country) !== country) return false;
    if (!q) return true;
    var hay = [
      s.reference,
      s.goodsDescription,
      s.consignee && s.consignee.name,
      s.consignor && s.consignor.name,
      s.hsCode,
      s.consignee && s.consignee.country,
      s.consignor && s.consignor.country
    ].join(" ").toLowerCase();
    return hay.indexOf(q) !== -1;
  });
}

/* ------------------------------ downloads ----------------------------- */

function downloadTextFile(filename, text, mime) {
  try {
    var blob = new Blob([text], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) { /* noop */ } }, 1000);
    return true;
  } catch (e) { return false; }
}

function downloadJSONFile(filename, obj) { return downloadTextFile(filename, JSON.stringify(obj, null, 2), "application/json"); }

function downloadDocument(shipment, kind) {
  var inv = buildCommercialInvoice(shipment);
  var pl = buildPackingList(shipment);
  var entry = buildCustomsEntry(shipment);
  if (kind === "invoice") {
    var ok = downloadTextFile("invoice-" + shipment.reference + ".txt", commercialInvoiceText(inv), "text/plain");
    return ok ? "Commercial invoice downloaded." : "Could not start download.";
  }
  if (kind === "packing") {
    var ok2 = downloadTextFile("packing-list-" + shipment.reference + ".txt", packingListText(pl), "text/plain");
    return ok2 ? "Packing list downloaded." : "Could not start download.";
  }
  var ok3 = downloadJSONFile("customs-entry-" + shipment.reference + ".json", entry);
  return ok3 ? "Customs entry exported." : "Could not start download.";
}

/* =========================================================================
   UI
   ========================================================================= */

var currentSessionEmail = null;
var currentUserProfile = null;
var shipmentsCache = [];
var filterState = { query: "", status: "", country: "" };
var lastDeleteId = null;

function el(id) { return document.getElementById(id); }

function showToast(message, type) {
  var region = el("toast-region");
  if (!region) return;
  var toast = document.createElement("div");
  toast.className = "toast" + (type === "error" ? " toast--error" : "");
  toast.setAttribute("role", "status");
  toast.textContent = message;
  region.appendChild(toast);
  setTimeout(function () {
    toast.classList.add("toast--leaving");
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 200);
  }, 3200);
}

function getUser() {
  var users = storageGet("clarlane.users", null);
  var list = users || [];
  return findUser(list, currentSessionEmail);
}

function loadActiveShipments() {
  var list = loadShipments(currentSessionEmail);
  shipmentsCache = list || [];
  return list || [];
}

function renderStats() {
  var list = shipmentsCache;
  var count = list.length;
  var awaiting = list.filter(function(s) { return s.status === "pending"; }).length;
  var inProcess = list.filter(function(s) { return s.status === "documents" || s.status === "entry_submitted" || s.status === "under_review"; }).length;
  var cleared = list.filter(function(s) { return s.status === "cleared"; }).length;
  setStat("stats-total", count);
  setStat("stats-awaiting", awaiting);
  setStat("stats-inprogress", inProcess);
  setStat("stats-cleared", cleared);
}

function setStat(id, value) { var node = el(id); if (node) node.textContent = String(value); }

function renderCountryOptions() {
  var select = el("country-filter");
  if (!select) return;
  var countries = {};
  shipmentsCache.forEach(function(s) {
    var cc = normUpper(s.consignee && s.consignee.country);
    if (cc) countries[cc] = true;
  });
  var keys = Object.keys(countries).sort();
  select.innerHTML = '<option value="">All countries</option>';
  keys.forEach(function(cc) { var opt = document.createElement("option"); opt.value = cc; opt.textContent = cc; select.appendChild(opt); });
}

function renderTable() {
  var body = el("table-body");
  var countNode = el("result-count");
  var list = getFilteredShipments(shipmentsCache, filterState.query, filterState.status, filterState.country);
  if (countNode) countNode.textContent = list.length + " of " + shipmentsCache.length + " shipment" + (shipmentsCache.length === 1 ? "" : "s");

  if (list.length === 0) {
    el("empty-state").hidden = false;
    body.innerHTML = "";
    return;
  }
  el("empty-state").hidden = true;

  var html = "";
  list.forEach(function(s) {
    var actions = "";
    var nextActions = getNextActions(s.status);
    nextActions.forEach(function(a) {
      actions += '<button type="button" class="btn btn--sm" data-action="transition" data-id="' + s.id + '" data-next="' + a.status + '">' + a.label + "</button>";
    });
    html += "<tr>" +
      "<td class='nowrap mono'>" + (s.reference || "-") + "</td>" +
      "<td>" + ((s.consignee && s.consignee.name) || "-") + "<div class='cell-sub'>" + ((s.consignee && s.consignee.country) || "-") + "</div>" + "</td>" +
      "<td>" + ((s.consignor && s.consignor.name) || "-") + "<div class='cell-sub'>" + ((s.consignor && s.consignor.country) || "-") + "</div>" + "</td>" +
      "<td><span class='mono'>" + (s.hsCode || "-") + "</span><div class='cell-sub'>" + (s.incoterm || "-") + "</div>" + "</td>" +
      "<td class='num'>" + fmtMoney(s.declaredValueUsd) + "</td>" +
      "<td><span class='badge badge--" + (s.status || "pending") + "'><span class='dot'></span>" + getStatusLabel(s.status) + "</span></td>" +
      "<td class='nowrap mono cell-sub'>" + (s.updatedAt || "-") + "</td>" +
      "<td><div class='row-actions'>" +
        (nextActions.length ? '<button type="button" class="btn btn--sm" data-action="transition" data-id="' + s.id + '" data-next="' + nextActions[0].status + '">' + nextActions[0].label + "</button>" : "") +
        '<button type="button" class="btn btn--sm btn--secondary" data-action="edit" data-id="' + s.id + '">Edit</button>' +
        '<button type="button" class="btn btn--sm btn--secondary" data-action="doc" data-id="' + s.id + '" data-kind="invoice">Invoice</button>' +
        '<button type="button" class="btn btn--sm btn--secondary" data-action="doc" data-id="' + s.id + '" data-kind="packing">Packing</button>' +
        '<button type="button" class="btn btn--sm btn--secondary" data-action="doc" data-id="' + s.id + '" data-kind="entry">Entry</button>' +
        '<button type="button" class="btn btn--sm btn--ghost" data-action="delete" data-id="' + s.id + '" aria-label="Delete shipment">Delete</button>' +
      "</div></td>" +
      "</tr>";
    });
  body.innerHTML = html;
}

function render() {
  renderStats();
  renderCountryOptions();
  renderTable();
}

/* --------------------------- modal handling --------------------------- */

function openShipmentModal(shipment) {
  var overlay = el("shipment-modal-overlay");
  var form = el("shipment-form");
  var title = el("shipment-modal-title");
  var id = el("f-shipment-id");
  if (!overlay || !form) return;
  clearFieldErrors();
  if (shipment) {
    title.textContent = "Edit shipment";
    id.value = shipment.id;
    setFieldValue("f-reference", shipment.reference);
    setFieldValue("f-consignee-name", shipment.consignee ? shipment.consignee.name : "");
    setFieldValue("f-consignee-country", shipment.consignee ? shipment.consignee.country : "");
    setFieldValue("f-consignor-name", shipment.consignor ? shipment.consignor.name : "");
    setFieldValue("f-consignor-country", shipment.consignor ? shipment.consignor.country : "");
    setFieldValue("f-hs-code", shipment.hsCode);
    setFieldValue("f-incoterm", shipment.incoterm);
    setFieldValue("f-goods", shipment.goodsDescription);
    setFieldValue("f-quantity", String(shipment.quantity));
    setFieldValue("f-unit-weight", String(shipment.unitWeightKg));
    setFieldValue("f-declared", String(shipment.declaredValueUsd));
    setFieldValue("f-freight", String(shipment.freightUsd));
    setFieldValue("f-insurance", String(shipment.insuranceUsd));
    setFieldValue("f-packages", String(shipment.packageCount || 1));
  } else {
    title.textContent = "New shipment";
    id.value = "";
    setFieldValue("f-reference", nextReference(shipmentsCache));
    setFieldValue("f-consignee-name", "");
    setFieldValue("f-consignee-country", "");
    setFieldValue("f-consignor-name", "");
    setFieldValue("f-consignor-country", "");
    setFieldValue("f-hs-code", "");
    setFieldValue("f-incoterm", "CIF");
    setFieldValue("f-goods", "");
    setFieldValue("f-quantity", "1");
    setFieldValue("f-unit-weight", "1");
    setFieldValue("f-declared", "");
    setFieldValue("f-freight", "0");
    setFieldValue("f-insurance", "0");
    setFieldValue("f-packages", "1");
  }
  overlay.hidden = false;
  document.body.classList.add("no-scroll");
  var modal = overlay.querySelector(".modal");
  if (modal) modal.focus();
}

function setFieldValue(id, value) {
  var node = document.getElementById(id);
  if (!node) return;
  if (node.tagName === "SELECT") { node.value = value || ""; }
  else { node.value = value === null || value === undefined ? "" : String(value); }
}

function closeShipmentModal() {
  var overlay = el("shipment-modal-overlay");
  if (overlay) overlay.hidden = true;
  document.body.classList.remove("no-scroll");
}

function readShipmentForm() {
  return {
    id: (el("f-shipment-id") || {}).value || "",
    reference: (el("f-reference") || {}).value || "",
    consigneeName: (el("f-consignee-name") || {}).value || "",
    consigneeCountry: (el("f-consignee-country") || {}).value || "",
    consignorName: (el("f-consignor-name") || {}).value || "",
    consignorCountry: (el("f-consignor-country") || {}).value || "",
    hsCode: (el("f-hs-code") || {}).value || "",
    incoterm: (el("f-incoterm") || {}).value || "",
    goodsDescription: (el("f-goods") || {}).value || "",
    quantity: (el("f-quantity") || {}).value || "1",
    unitWeightKg: (el("f-unit-weight") || {}).value || "1",
    declaredValueUsd: (el("f-declared") || {}).value || "",
    freightUsd: (el("f-freight") || {}).value || "0",
    insuranceUsd: (el("f-insurance") || {}).value || "0",
    packageCount: (el("f-packages") || {}).value || "1"
  };
}

function fieldErrorId(key) {
  return "err-" + String(key).replace(/\./g, "-").replace(/([a-z])([A-Z])/g, function (m, a, b) { return a + "-" + b; }).toLowerCase();
}

function showFieldErrors(errors) {
  Object.keys(errors).forEach(function(key) {
    var fieldEl = document.querySelector('[data-field="' + key + '"]');
    var errEl = document.getElementById(fieldErrorId(key));
    if (fieldEl && errEl) {
      fieldEl.setAttribute("aria-invalid", "true");
      fieldEl.setAttribute("aria-describedby", errEl.id);
      errEl.hidden = false;
      errEl.textContent = errors[key];
    }
  });
}

function clearFieldErrors() {
  var fields = document.querySelectorAll("[data-field]");
  fields.forEach(function(f) {
    f.removeAttribute("aria-invalid");
    var key = f.getAttribute("data-field") || "";
    var errEl = document.getElementById(fieldErrorId(key));
    if (errEl) errEl.hidden = true;
  });
}

/* --------------------------- event binding ---------------------------- */

function bindEvents() {
  var authForm = el("auth-form");
  if (authForm) authForm.addEventListener("submit", onAuthFormSubmit);

  var form = el("shipment-form");
  if (form) {
    form.addEventListener("submit", onShipmentFormSubmit);
    form.addEventListener("reset", function (e) { e.preventDefault(); });
  }

  var overlay = el("shipment-modal-overlay");
  if (overlay) overlay.addEventListener("click", function (e) { if (e.target === overlay) closeShipmentModal(); });
  var closeBtn = el("shipment-modal-close");
  if (closeBtn) closeBtn.addEventListener("click", closeShipmentModal);

  var deleteOverlay = el("delete-modal-overlay");
  if (deleteOverlay) deleteOverlay.addEventListener("click", function (e) { if (e.target === deleteOverlay) closeDeleteModal(); });
  var deleteCancel = el("delete-cancel");
  if (deleteCancel) deleteCancel.addEventListener("click", closeDeleteModal);

  var deleteConfirm = el("delete-confirm");
  if (deleteConfirm) deleteConfirm.addEventListener("click", onDeleteConfirm);

  var authTabSignin = el("auth-tab-signin");
  var authTabSignup = el("auth-tab-signup");
  if (authTabSignin) authTabSignin.addEventListener("click", function () { setAuthMode("signin"); });
  if (authTabSignup) authTabSignup.addEventListener("click", function () { setAuthMode("signup"); });

  var emptyNew = el("empty-new");
  if (emptyNew) emptyNew.addEventListener("click", function () { openShipmentModal(null); });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var overlay = el("shipment-modal-overlay");
    if (overlay && !overlay.hidden) { closeShipmentModal(); return; }
    var deleteOverlay = el("delete-modal-overlay");
    if (deleteOverlay && !deleteOverlay.hidden) { closeDeleteModal(); }
  });

  var signOutBtn = el("sign-out-btn");
  if (signOutBtn) signOutBtn.addEventListener("click", onSignOut);

  var newBtn = el("btn-new");
  if (newBtn) newBtn.addEventListener("click", function () { openShipmentModal(null); });

  var exportBtn = el("btn-export-csv");
  if (exportBtn) exportBtn.addEventListener("click", onExportCsv);

  var searchInput = el("search-input");
  if (searchInput) searchInput.addEventListener("input", function (e) { filterState.query = e.target.value; renderTable(); });

  var statusFilter = el("status-filter");
  if (statusFilter) statusFilter.addEventListener("change", function (e) { filterState.status = e.target.value; renderTable(); });

  var countryFilter = el("country-filter");
  if (countryFilter) countryFilter.addEventListener("change", function (e) { filterState.country = e.target.value; renderTable(); });

  var table = el("shipments-table");
  if (table) {
    table.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("button") : null;
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      var id = btn.getAttribute("data-id");
      if (action === "transition") {
        var next = btn.getAttribute("data-next");
        doTransition(id, next);
      } else if (action === "edit") {
        openShipmentModal(shipmentsCache.find(function(s) { return s.id === id; }) || null);
      } else if (action === "doc") {
        var kind = btn.getAttribute("data-kind");
        var shipment = shipmentsCache.find(function(s) { return s.id === id; });
        if (shipment) { showToast(downloadDocument(shipment, kind)); }
      } else if (action === "delete") {
        openDeleteModal(id);
      }
    });
  }
}

function setAuthMode(mode) {
  var tabSignin = el("auth-tab-signin");
  var tabSignup = el("auth-tab-signup");
  var nameField = el("auth-name-field");
  var submitBtn = el("auth-submit");
  if (tabSignin) { tabSignin.setAttribute("aria-selected", mode === "signin" ? "true" : "false"); }
  if (tabSignup) { tabSignup.setAttribute("aria-selected", mode === "signup" ? "true" : "false"); }
  if (nameField) nameField.hidden = mode !== "signup";
  if (submitBtn) submitBtn.textContent = mode === "signup" ? "Create account" : "Sign in";
}

function populateStatusFilter() {
  var select = el("status-filter");
  if (!select) return;
  var statuses = getStatuses();
  select.innerHTML = '<option value="">All statuses</option>';
  statuses.forEach(function(s) { var opt = document.createElement("option"); opt.value = s; opt.textContent = getStatusLabel(s); select.appendChild(opt); });
}

function onDeleteConfirm() {
  var id = lastDeleteId;
  closeDeleteModal();
  lastDeleteId = null;
  if (!id) return;
  deleteShipment(currentSessionEmail, id);
  shipmentsCache = loadActiveShipments();
  render();
  showToast("Shipment deleted.");
}

function onAuthFormSubmit(e) {
  e.preventDefault();
  var email = (el("auth-email") || {}).value || "";
  var password = (el("auth-password") || {}).value || "";
  var errorEl = el("auth-error");
  var mode = document.querySelector('.auth-tabs button[aria-selected="true"]');
  var modeVal = mode ? mode.getAttribute("data-mode") : "signin";
  var result;
  if (modeVal === "signup") {
    var name = (el("auth-name") || {}).value || "";
    if (name.trim().length < 2) { if (errorEl) { errorEl.hidden = false; errorEl.textContent = "Please enter your name."; return; } }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { if (errorEl) { errorEl.hidden = false; errorEl.textContent = "Please enter a valid email address."; return; } }
    if (password.length < 6) { if (errorEl) { errorEl.hidden = false; errorEl.textContent = "Password must be at least 6 characters."; return; } }
    result = signUp(name, email, password);
  } else {
    result = signIn(email, password);
  }
  if (!result.ok) {
    if (errorEl) { errorEl.hidden = false; errorEl.textContent = result.error; }
    return;
  }
  if (errorEl) errorEl.hidden = true;
  currentSessionEmail = result.user.email;
  currentUserProfile = result.user;
  loadActiveShipments();
  showApp();
}

function onSignOut() {
  storageRemove("clarlane.session");
  currentSessionEmail = null;
  currentUserProfile = null;
  shipmentsCache = [];
  filterState = { query: "", status: "", country: "" };
  showAuth();
}

function showAuth() {
  var auth = el("auth-screen");
  var app = el("app-shell");
  if (auth) auth.hidden = false;
  if (app) app.hidden = true;
  if (auth) auth.querySelector("form").reset();
  var errorEl = el("auth-error");
  if (errorEl) { errorEl.hidden = true; errorEl.textContent = ""; }
}

function showApp() {
  var auth = el("auth-screen");
  var app = el("app-shell");
  var emailEl = el("topbar-email");
  if (auth) auth.hidden = true;
  if (app) app.hidden = false;
  if (emailEl) emailEl.textContent = (currentUserProfile ? currentUserProfile.name + " · " : "") + (currentSessionEmail || "");
  loadActiveShipments();
  render();
}

function onShipmentFormSubmit(e) {
  e.preventDefault();
  var data = readShipmentForm();
  var payload = {
    reference: data.reference,
    consignee: { name: data.consigneeName, country: data.consigneeCountry },
    consignor: { name: data.consignorName, country: data.consignorCountry },
    hsCode: data.hsCode,
    incoterm: data.incoterm,
    goodsDescription: data.goodsDescription,
    quantity: data.quantity,
    unitWeightKg: data.unitWeightKg,
    declaredValueUsd: data.declaredValueUsd,
    freightUsd: data.freightUsd,
    insuranceUsd: data.insuranceUsd,
    packageCount: data.packageCount
  };
  var validation = validateShipment(payload);
  if (!validation.ok) {
    clearFieldErrors();
    showFieldErrors(validation.errors);
    return;
  }
  var dup = (shipmentsCache || []).some(function (s) { return s.reference && s.reference.toLowerCase() === String(data.reference).trim().toLowerCase() && s.id !== (data.id || ""); });
  if (dup) { showToast("A shipment with that reference already exists.", "error"); return; }
  if (data.id) {
    var patch = {
      reference: String(data.reference || "").trim().toUpperCase(),
      consignee: { name: data.consigneeName, country: normUpper(data.consigneeCountry) },
      consignor: { name: data.consignorName, country: normUpper(data.consignorCountry) },
      hsCode: String(data.hsCode || "").trim(),
      incoterm: normUpper(data.incoterm),
      goodsDescription: data.goodsDescription,
      quantity: toNum(data.quantity),
      unitWeightKg: toNum(data.unitWeightKg),
      declaredValueUsd: toNum(data.declaredValueUsd),
      freightUsd: toNum(data.freightUsd),
      insuranceUsd: toNum(data.insuranceUsd),
      packageCount: toNum(data.packageCount) || 1
    };
    var updated = updateShipment(currentSessionEmail, data.id, patch);
    shipmentsCache = loadActiveShipments();
    showToast("Shipment " + updated.reference + " updated.");
  } else {
    var created = createShipment(currentSessionEmail, data);
    shipmentsCache = loadActiveShipments();
    showToast("Shipment " + created.reference + " created.");
  }
  closeShipmentModal();
  render();
}

function populateIncotermOptions() {
  var select = el("f-incoterm");
  if (!select) return;
  var incoterms = getIncoterms();
  select.innerHTML = "";
  incoterms.forEach(function(v) { var opt = document.createElement("option"); opt.value = v; opt.textContent = v; select.appendChild(opt); });
}

function doTransition(id, next) {
  var shipment = shipmentsCache.find(function(s) { return s.id === id; });
  if (!shipment) return;
  if (!canTransition(shipment.status, next)) { showToast("That status change is not allowed.", "error"); return; }
  var updated = updateShipment(currentSessionEmail, id, { status: next });
  shipmentsCache = loadActiveShipments();
  showToast("Shipment " + updated.reference + " moved to " + getStatusLabel(next) + ".");
  render();
}

function openDeleteModal(id) {
  var shipment = shipmentsCache.find(function(s) { return s.id === id; });
  lastDeleteId = id;
  var overlay = el("delete-modal-overlay");
  var message = el("delete-modal-message");
  if (!shipment) return;
  if (message) message.textContent = "Delete shipment " + shipment.reference + "? This removes the record and its documents from this workspace.";
  overlay.hidden = false;
  document.body.classList.add("no-scroll");
}

function closeDeleteModal() {
  var overlay = el("delete-modal-overlay");
  if (overlay) overlay.hidden = true;
  document.body.classList.remove("no-scroll");
}

function onExportCsv() {
  var list = shipmentsCache;
  var csv = shipmentsToCSV(list);
  var ok = downloadTextFile("clearlane-shipments.csv", csv, "text/csv");
  showToast(ok ? "Shipment CSV exported (" + list.length + " rows)." : "Export failed.");
}

/* ------------------------------ bootstrap ----------------------------- */

function init() {
  ensureSeed();
  bindEvents();
  populateStatusFilter();
  populateIncotermOptions();
  var sessionEmail = getSessionEmail();
  if (sessionEmail) {
    currentSessionEmail = sessionEmail;
    currentUserProfile = getUser();
    loadActiveShipments();
    showApp();
  } else {
    showAuth();
  }
}

function ensureSeed() {
  var users = storageGet("clarlane.users", null);
  if (!users) { storageSet("clarlane.users", seedUsers()); }
}

function boot() {
  if (typeof document === "undefined") return;
  var start = function () {
    if (typeof window !== "undefined") {
      window.ClareLane = { runSelfTests: runSelfTests };
      var results = runSelfTests();
      var failed = results.filter(function(r) { return !r.pass; });
      if (typeof console !== "undefined") console.log("[ClearLane] self-tests", JSON.stringify(results));
      if (failed.length) console.warn("[ClearLane] self-tests FAILED: " + failed.map(function(f) { return f.name; }).join(", "));
    }
    init();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}
