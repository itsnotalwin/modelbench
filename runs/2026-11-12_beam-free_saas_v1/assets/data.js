/* data.js — storage + seed data for ClearDesk */
(function () {
  "use strict";
  const C = window.CDCore;
  if (!C) { console.error("CDCore missing"); return; }

  const KEYS = {
    users: "cd_users",
    session: "cd_session",
    clients: "cd_clients",
    jobs: "cd_jobs",
    entries: "cd_entries",   // customs entries keyed by jobId
    charges: "cd_charges",   // charges keyed by jobId
    settings: "cd_settings",
    seq: "cd_seq"
  };

  function get(key, fallback) { return C.safeGet(key, fallback); }
  function set(key, val) { return C.safeSet(key, val); }

  // ---- Users ----
  function getUsers() { return get(KEYS.users, []); }
  function saveUsers(u) { set(KEYS.users, u); }
  function findUserByEmail(email) {
    return (getUsers() || []).find(function (u) { return u.email.toLowerCase() === String(email).toLowerCase(); });
  }
  function createUser(data) {
    const v = C.validateUser(data);
    if (!v.ok) return { ok: false, errors: v.errors };
    if (findUserByEmail(data.email)) return { ok: false, errors: { email: "Email already registered." } };
    const user = {
      id: C.uid("usr"),
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password, // demo only; no hashing in client build (disclosed)
      role: data.role || "agent",
      company: data.company || "Clearing House",
      createdAt: C.nowISO()
    };
    const users = getUsers();
    users.push(user);
    saveUsers(users);
    return { ok: true, user: user };
  }
  function authenticate(email, password) {
    const u = findUserByEmail(email);
    if (!u) return { ok: false, error: "No account with that email." };
    if (u.password !== password) return { ok: false, error: "Incorrect password." };
    return { ok: true, user: u };
  }
  function getSession() { return get(KEYS.session, null); }
  function setSession(user) {
    if (!user) { C.safeRemove(KEYS.session); return; }
    set(KEYS.session, { userId: user.id, email: user.email, name: user.name, role: user.role, company: user.company, at: C.nowISO() });
  }
  function currentUser() {
    const s = getSession();
    if (!s) return null;
    const u = (getUsers() || []).find(function (x) { return x.id === s.userId; });
    return u || null;
  }
  function logout() { C.safeRemove(KEYS.session); }

  // ---- Clients ----
  function getClients() { return get(KEYS.clients, []); }
  function saveClients(c) { set(KEYS.clients, c); }
  function getClient(id) { return getClients().find(function (c) { return c.id === id; }); }
  function upsertClient(data) {
    const v = C.validateClient(data);
    if (!v.ok) return { ok: false, errors: v.errors };
    const list = getClients();
    if (data.id) {
      const idx = list.findIndex(function (c) { return c.id === data.id; });
      if (idx === -1) return { ok: false, errors: { id: "Not found." } };
      list[idx] = Object.assign({}, list[idx], data, { updatedAt: C.nowISO() });
      saveClients(list);
      return { ok: true, client: list[idx] };
    }
    const c = {
      id: C.uid("cli"),
      name: data.name.trim(),
      contact: data.contact || "",
      email: data.email || "",
      phone: data.phone || "",
      country: data.country || "",
      address: data.address || "",
      taxId: data.taxId || "",
      notes: data.notes || "",
      createdAt: C.nowISO(),
      updatedAt: C.nowISO()
    };
    list.push(c);
    saveClients(list);
    return { ok: true, client: c };
  }
  function deleteClient(id) {
    // prevent delete if jobs reference
    const jobs = getJobs();
    if (jobs.some(function (j) { return j.clientId === id; })) {
      return { ok: false, error: "Client has jobs; reassign or delete jobs first." };
    }
    saveClients(getClients().filter(function (c) { return c.id !== id; }));
    return { ok: true };
  }

  // ---- Jobs ----
  function getJobs() { return get(KEYS.jobs, []); }
  function saveJobs(j) { set(KEYS.jobs, j); }
  function getJob(id) { return getJobs().find(function (j) { return j.id === id; }); }
  function nextSeq() {
    const s = get(KEYS.seq, { job: 1000 });
    s.job = (s.job || 1000) + 1;
    set(KEYS.seq, s);
    return s.job;
  }
  function upsertJob(data) {
    const v = C.validateJob(data);
    if (!v.ok) return { ok: false, errors: v.errors };
    const list = getJobs();
    const settings = getSettings();
    if (data.id) {
      const idx = list.findIndex(function (j) { return j.id === data.id; });
      if (idx === -1) return { ok: false, errors: { id: "Not found." } };
      const prev = list[idx];
      // status transition check
      if (data.status && data.status !== prev.status) {
        if (!C.canTransition(prev.status, data.status)) {
          return { ok: false, errors: { status: "Cannot transition from " + prev.status + " to " + data.status + "." } };
        }
      }
      list[idx] = Object.assign({}, prev, data, { updatedAt: C.nowISO() });
      // attach client name
      const cl = getClient(list[idx].clientId);
      list[idx].clientName = cl ? cl.name : "";
      saveJobs(list);
      return { ok: true, job: list[idx] };
    }
    const seq = nextSeq();
    const job = {
      id: C.uid("job"),
      ref: data.ref || C.genJobRef(seq, settings.jobPrefix || "JOB"),
      clientId: data.clientId,
      clientName: "",
      shipper: data.shipper.trim(),
      consignee: data.consignee.trim(),
      mode: data.mode,
      type: data.type,
      pol: data.pol || "",
      pod: data.pod || "",
      vessel: data.vessel || "",
      blNumber: data.blNumber || "",
      containerNo: data.containerNo || "",
      packages: Number(data.packages) || 0,
      weightKg: Number(data.weightKg) || 0,
      volumeCbm: Number(data.volumeCbm) || 0,
      etd: data.etd || "",
      eta: data.eta || "",
      dischargeDate: data.dischargeDate || "",
      status: data.status || "draft",
      freeDays: data.freeDays != null ? Number(data.freeDays) : (settings.freeDays || 7),
      demurrageRate: data.demurrageRate != null ? Number(data.demurrageRate) : (settings.demurrageRate || 50),
      notes: data.notes || "",
      createdAt: C.nowISO(),
      updatedAt: C.nowISO()
    };
    const cl = getClient(job.clientId);
    job.clientName = cl ? cl.name : "";
    list.push(job);
    saveJobs(list);
    return { ok: true, job: job };
  }
  function deleteJob(id) {
    saveJobs(getJobs().filter(function (j) { return j.id !== id; }));
    // cleanup entries/charges
    const entries = get(KEYS.entries, {});
    delete entries[id];
    set(KEYS.entries, entries);
    const charges = get(KEYS.charges, {});
    delete charges[id];
    set(KEYS.charges, charges);
    return { ok: true };
  }
  function transitionJob(id, to) {
    const job = getJob(id);
    if (!job) return { ok: false, error: "Not found." };
    if (!C.canTransition(job.status, to)) return { ok: false, error: "Transition not allowed." };
    return upsertJob({ id: id, status: to });
  }

  // ---- Customs entries (per job) ----
  function getEntriesMap() { return get(KEYS.entries, {}); }
  function getEntries(jobId) { const m = getEntriesMap(); return m[jobId] || []; }
  function saveEntries(jobId, lines) { const m = getEntriesMap(); m[jobId] = lines; set(KEYS.entries, m); }
  function upsertEntryLine(jobId, data) {
    const v = C.validateEntryLine(data);
    if (!v.ok) return { ok: false, errors: v.errors };
    const lines = getEntries(jobId).slice();
    if (data.id) {
      const idx = lines.findIndex(function (l) { return l.id === data.id; });
      if (idx === -1) return { ok: false, errors: { id: "Not found." } };
      lines[idx] = Object.assign({}, lines[idx], data, { updatedAt: C.nowISO() });
    } else {
      lines.push(Object.assign({}, data, { id: C.uid("ent"), createdAt: C.nowISO(), updatedAt: C.nowISO() }));
    }
    saveEntries(jobId, lines);
    return { ok: true, lines: lines };
  }
  function deleteEntryLine(jobId, lineId) {
    const lines = getEntries(jobId).filter(function (l) { return l.id !== lineId; });
    saveEntries(jobId, lines);
    return { ok: true };
  }

  // ---- Charges (per job) ----
  function getChargesMap() { return get(KEYS.charges, {}); }
  function getCharges(jobId) { const m = getChargesMap(); return m[jobId] || []; }
  function saveCharges(jobId, list) { const m = getChargesMap(); m[jobId] = list; set(KEYS.charges, m); }
  function upsertCharge(jobId, data) {
    const v = C.validateCharge(data);
    if (!v.ok) return { ok: false, errors: v.errors };
    const list = getCharges(jobId).slice();
    if (data.id) {
      const idx = list.findIndex(function (c) { return c.id === data.id; });
      if (idx === -1) return { ok: false, errors: { id: "Not found." } };
      list[idx] = Object.assign({}, list[idx], data, { updatedAt: C.nowISO() });
    } else {
      list.push(Object.assign({}, data, { id: C.uid("chg"), createdAt: C.nowISO(), updatedAt: C.nowISO() }));
    }
    saveCharges(jobId, list);
    return { ok: true, charges: list };
  }
  function deleteCharge(jobId, chargeId) {
    const list = getCharges(jobId).filter(function (c) { return c.id !== chargeId; });
    saveCharges(jobId, list);
    return { ok: true };
  }

  // ---- Settings ----
  function getSettings() {
    return get(KEYS.settings, {
      company: "Clearing House Ltd.",
      address: "Port District, Dubai, UAE",
      phone: "+971 4 000 0000",
      email: "ops@clearinghouse.example",
      currency: "USD",
      freeDays: 7,
      demurrageRate: 75,
      jobPrefix: "JOB",
      rates: { USD: 1, EUR: 1.08, GBP: 1.27, AED: 0.272, SAR: 0.267, INR: 0.012, CNY: 0.138, SGD: 0.74, JPY: 0.0067 }
    });
  }
  function saveSettings(s) { set(KEYS.settings, s); }

  // ---- Seed ----
  function seedIfEmpty() {
    if (getUsers() && getUsers().length) return false;
    // users
    const users = [
      { id: "usr_admin_seed", name: "Aisha Khan", email: "admin@cleardesk.demo", password: "demo123", role: "admin", company: "Clearing House Ltd.", createdAt: C.nowISO() },
      { id: "usr_agent_seed", name: "Omar Rashed", email: "agent@cleardesk.demo", password: "demo123", role: "agent", company: "Clearing House Ltd.", createdAt: C.nowISO() },
      { id: "usr_clerk_seed", name: "Priya Sharma", email: "clerk@cleardesk.demo", password: "demo123", role: "clerk", company: "Clearing House Ltd.", createdAt: C.nowISO() }
    ];
    saveUsers(users);
    // clients
    const clients = [
      { id: "cli_1", name: "Al Noor Trading LLC", contact: "Hassan Al Noor", email: "hassan@alnoor.example", phone: "+971 50 111 2222", country: "UAE", address: "Dubai, UAE", taxId: "TRN100200", notes: "Regular importer of electronics", createdAt: C.nowISO(), updatedAt: C.nowISO() },
      { id: "cli_2", name: "Gulf Petrochemicals", contact: "Fatima Al Mansoori", email: "fatima@gulfpetro.example", phone: "+971 55 333 4444", country: "UAE", address: "Abu Dhabi, UAE", taxId: "TRN300400", notes: "Bulk chemical shipments", createdAt: C.nowISO(), updatedAt: C.nowISO() },
      { id: "cli_3", name: "EuroTech Imports GmbH", contact: "Klaus Weber", email: "k.weber@eurotech.example", phone: "+49 89 555 1234", country: "Germany", address: "Munich, Germany", taxId: "DE123456", notes: "Machinery & parts", createdAt: C.nowISO(), updatedAt: C.nowISO() },
      { id: "cli_4", name: "Sino Global Freight", contact: "Li Wei", email: "liwei@sinoglobal.example", phone: "+86 21 8888 9999", country: "China", address: "Shanghai, China", taxId: "CN998877", notes: "Consolidated cargo", createdAt: C.nowISO(), updatedAt: C.nowISO() }
    ];
    saveClients(clients);
    // jobs
    const jobs = [
      { id: "job_1", ref: "JOB-2026-1001", clientId: "cli_1", clientName: "Al Noor Trading LLC", shipper: "Shenzhen Electronics Co.", consignee: "Al Noor Trading LLC", mode: "sea", type: "import", pol: "Shenzhen", pod: "Jebel Ali", vessel: "MSC GULSUN", blNumber: "MSCU1234567", containerNo: "MSCU 7654321", packages: 120, weightKg: 4800, volumeCbm: 18.5, etd: "2026-10-20", eta: "2026-11-05", dischargeDate: "2026-11-06", status: "cleared", freeDays: 7, demurrageRate: 75, notes: "Electronics, HS 85", createdAt: C.nowISO(), updatedAt: C.nowISO() },
      { id: "job_2", ref: "JOB-2026-1002", clientId: "cli_2", clientName: "Gulf Petrochemicals", shipper: "BASF SE", consignee: "Gulf Petrochemicals", mode: "sea", type: "import", pol: "Hamburg", pod: "Jebel Ali", vessel: "EVER GIVEN", blNumber: "EGLV9876543", containerNo: "EGLV 1122334", packages: 40, weightKg: 22000, volumeCbm: 24, etd: "2026-10-25", eta: "2026-11-10", dischargeDate: "2026-11-11", status: "customs-filed", freeDays: 5, demurrageRate: 120, notes: "Chemicals, dangerous goods", createdAt: C.nowISO(), updatedAt: C.nowISO() },
      { id: "job_3", ref: "JOB-2026-1003", clientId: "cli_3", clientName: "EuroTech Imports GmbH", shipper: "EuroTech Imports GmbH", consignee: "Al Futtaim Auto", mode: "air", type: "export", pol: "Dubai", pod: "Frankfurt", vessel: "EK 049", blNumber: "AWB 176-12345678", containerNo: "", packages: 8, weightKg: 320, volumeCbm: 2.1, etd: "2026-11-08", eta: "2026-11-09", dischargeDate: "", status: "booked", freeDays: 7, demurrageRate: 50, notes: "Auto parts", createdAt: C.nowISO(), updatedAt: C.nowISO() },
      { id: "job_4", ref: "JOB-2026-1004", clientId: "cli_4", clientName: "Sino Global Freight", shipper: "Sino Global Freight", consignee: "Local Distributor", mode: "sea", type: "transit", pol: "Shanghai", pod: "Jebel Ali", vessel: "COSCO SHIPPING", blNumber: "COSU5555666", containerNo: "COSU 9988776", packages: 200, weightKg: 9500, volumeCbm: 35, etd: "2026-10-15", eta: "2026-11-01", dischargeDate: "2026-11-02", status: "delivered", freeDays: 7, demurrageRate: 60, notes: "Transit cargo", createdAt: C.nowISO(), updatedAt: C.nowISO() },
      { id: "job_5", ref: "JOB-2026-1005", clientId: "cli_1", clientName: "Al Noor Trading LLC", shipper: "Taiwan Semi", consignee: "Al Noor Trading LLC", mode: "air", type: "import", pol: "Taipei", pod: "Dubai", vessel: "CI 751", blNumber: "AWB 297-99887766", containerNo: "", packages: 5, weightKg: 180, volumeCbm: 1.2, etd: "2026-11-10", eta: "2026-11-12", dischargeDate: "", status: "in-transit", freeDays: 7, demurrageRate: 50, notes: "Semiconductors", createdAt: C.nowISO(), updatedAt: C.nowISO() },
      { id: "job_6", ref: "JOB-2026-1006", clientId: "cli_2", clientName: "Gulf Petrochemicals", shipper: "Local Supplier", consignee: "Gulf Petrochemicals", mode: "road", type: "import", pol: "Riyadh", pod: "Dubai", vessel: "Truck", blNumber: "CMR-4455", containerNo: "", packages: 30, weightKg: 1200, volumeCbm: 6, etd: "2026-11-01", eta: "2026-11-03", dischargeDate: "2026-11-03", status: "draft", freeDays: 3, demurrageRate: 40, notes: "Road freight", createdAt: C.nowISO(), updatedAt: C.nowISO() }
    ];
    saveJobs(jobs);
    set(KEYS.seq, { job: 1006 });
    // entries
    const entries = {
      "job_1": [
        { id: "ent_1", hs: "8517.12", description: "Smartphones", value: 45000, currency: "USD", dutyRate: 5, vatRate: 5, qty: 120, createdAt: C.nowISO(), updatedAt: C.nowISO() },
        { id: "ent_2", hs: "8504.40", description: "Power adapters", value: 3000, currency: "USD", dutyRate: 5, vatRate: 5, qty: 500, createdAt: C.nowISO(), updatedAt: C.nowISO() }
      ],
      "job_2": [
        { id: "ent_3", hs: "2905.11", description: "Industrial alcohol", value: 18000, currency: "USD", dutyRate: 10, vatRate: 5, qty: 40, createdAt: C.nowISO(), updatedAt: C.nowISO() }
      ]
    };
    set(KEYS.entries, entries);
    // charges
    const charges = {
      "job_1": [
        { id: "chg_1", category: "freight", description: "Ocean freight", amount: 2400, currency: "USD", createdAt: C.nowISO(), updatedAt: C.nowISO() },
        { id: "chg_2", category: "customs-duty", description: "Import duty", amount: 2400, currency: "USD", createdAt: C.nowISO(), updatedAt: C.nowISO() },
        { id: "chg_3", category: "vat", description: "VAT 5%", amount: 2400, currency: "USD", createdAt: C.nowISO(), updatedAt: C.nowISO() },
        { id: "chg_4", category: "handling", description: "Port handling", amount: 350, currency: "USD", createdAt: C.nowISO(), updatedAt: C.nowISO() },
        { id: "chg_5", category: "agency-fee", description: "Agency fee", amount: 200, currency: "USD", createdAt: C.nowISO(), updatedAt: C.nowISO() }
      ]
    };
    set(KEYS.charges, charges);
    set(KEYS.settings, getSettings());
    return true;
  }

  // Expose
  window.CDData = {
    KEYS, getUsers, saveUsers, findUserByEmail, createUser, authenticate,
    getSession, setSession, currentUser, logout,
    getClients, saveClients, getClient, upsertClient, deleteClient,
    getJobs, saveJobs, getJob, upsertJob, deleteJob, transitionJob, nextSeq,
    getEntries, saveEntries, upsertEntryLine, deleteEntryLine,
    getCharges, saveCharges, upsertCharge, deleteCharge,
    getSettings, saveSettings, seedIfEmpty
  };
})();
