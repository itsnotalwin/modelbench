const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../assets/core.js");

test("calcDutyLine computes duty and vat", () => {
  const r = C.calcDutyLine({ value: 1000, dutyRate: 5, vatRate: 5 });
  assert.equal(r.customsValue, 1000);
  assert.equal(r.duty, 50);
  assert.equal(r.vat, 52.5);
  assert.equal(r.total, 1102.5);
});

test("calcDutyTotals aggregates", () => {
  const t = C.calcDutyTotals([{ value: 1000, dutyRate: 5, vatRate: 5 }, { value: 500, dutyRate: 10, vatRate: 5 }]);
  assert.equal(t.value, 1500);
  assert.ok(t.duty > 0);
});

test("demurrageCost chargeable days", () => {
  const d = C.demurrageCost("2026-11-01", 7, 50, "2026-11-12");
  // elapsed 11 days, free 7 => 4 chargeable
  assert.equal(d.elapsedDays, 11);
  assert.equal(d.chargeableDays, 4);
  assert.equal(d.cost, 200);
});

test("demurrageCost no charge within free", () => {
  const d = C.demurrageCost("2026-11-10", 7, 50, "2026-11-12");
  assert.equal(d.chargeableDays, 0);
  assert.equal(d.cost, 0);
});

test("canTransition valid/invalid", () => {
  assert.equal(C.canTransition("draft", "booked"), true);
  assert.equal(C.canTransition("draft", "cleared"), false);
  assert.equal(C.canTransition("closed", "draft"), false);
});

test("validateJob requires fields", () => {
  const v = C.validateJob({});
  assert.equal(v.ok, false);
  assert.ok(v.errors.clientId);
});

test("validateJob passes valid", () => {
  const v = C.validateJob({ clientId: "c1", mode: "sea", type: "import", shipper: "Acme", consignee: "Buyer" });
  assert.equal(v.ok, true);
});

test("filterJobs search & status", () => {
  const jobs = [{ ref: "JOB-1", shipper: "X", consignee: "Y", status: "draft", mode: "sea", type: "import", clientId: "c1" }];
  assert.equal(C.filterJobs(jobs, { q: "job-1" }).length, 1);
  assert.equal(C.filterJobs(jobs, { status: "cleared" }).length, 0);
});

test("convert currency", () => {
  const r = C.convert(100, "EUR", "USD", { USD: 1, EUR: 1.08 });
  assert.equal(r, 108);
});

test("toCSV escapes", () => {
  const csv = C.toCSV([{ a: 'x,y', b: 2 }], ["a","b"]);
  assert.match(csv, /"x,y"/);
});

test("genJobRef format", () => {
  assert.match(C.genJobRef(5, "JOB"), /JOB-\d{4}-0005/);
});

test("chargeTotals multi-currency", () => {
  const t = C.chargeTotals([{ amount: 100, currency: "USD" }, { amount: 100, currency: "EUR" }], { USD: 1, EUR: 1.08 }, "USD");
  assert.equal(t, 208);
});

test("allowedTransitions terminal empty", () => {
  assert.deepEqual(C.allowedTransitions("closed"), []);
});
