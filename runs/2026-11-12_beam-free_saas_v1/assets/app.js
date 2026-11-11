/* app.js — ClearDesk UI */
(function () {
  "use strict";
  const C = window.CDCore;
  const D = window.CDData;
  if (!C || !D) { console.error("missing core/data"); return; }

  const state = {
    view: "dashboard",
    params: {},
    jobFilter: { q: "", status: "", mode: "", type: "", clientId: "" },
    clientQuery: "",
    modal: null
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(s) { return C.escHtml(s); }

  // ---------- Toast ----------
  function toast(msg, type) {
    const wrap = $("#toastWrap");
    if (!wrap) return;
    const t = document.createElement("div");
    t.className = "toast" + (type === "error" ? " error" : "");
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 200); }, 2800);
  }

  // ---------- Modal ----------
  function openModal(title, bodyHtml, footHtml) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = bodyHtml;
    $("#modalFoot").innerHTML = footHtml || "";
    $("#modalBackdrop").classList.add("open");
  }
  function closeModal() { $("#modalBackdrop").classList.remove("open"); }

  // ---------- Auth ----------
  function renderAuth(mode) {
    mode = mode || "signin";
    const root = $("#root");
    root.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-card">
          <div class="brand" style="border:none;margin-bottom:6px;padding:0">
            <div class="brand-mark">C</div>
            <div><div class="brand-name">ClearDesk</div><div class="brand-sub">Clearing & freight operations</div></div>
          </div>
          <h1 class="auth-title">${mode === "signin" ? "Sign in" : "Create account"}</h1>
          <p class="auth-sub">${mode === "signin" ? "Welcome back. Enter your credentials." : "Set up your workspace account."}</p>
          <div class="auth-tabs">
            <button class="auth-tab ${mode === "signin" ? "active" : ""}" data-auth="signin">Sign in</button>
            <button class="auth-tab ${mode === "signup" ? "active" : ""}" data-auth="signup">Sign up</button>
          </div>
          <div id="authFormWrap"></div>
          <div class="auth-demo">
            <div><b>Demo accounts</b> (password: <code>demo123</code>)</div>
            <div>admin@cleardesk.demo · agent@cleardesk.demo · clerk@cleardesk.demo</div>
          </div>
        </div>
      </div>`;
    renderAuthForm(mode);
    $$(".auth-tab").forEach(b => b.addEventListener("click", () => renderAuth(b.dataset.auth)));
  }

  function renderAuthForm(mode) {
    const wrap = $("#authFormWrap");
    if (mode === "signin") {
      wrap.innerHTML = `
        <form class="auth-form" id="signinForm">
          <div class="form-group"><label>Email</label><input type="email" name="email" required autocomplete="username"></div>
          <div class="form-group"><label>Password</label><input type="password" name="password" required autocomplete="current-password"></div>
          <button type="submit" class="btn primary" style="justify-content:center">Sign in</button>
        </form>`;
      $("#signinForm").addEventListener("submit", e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const r = D.authenticate(fd.get("email"), fd.get("password"));
        if (!r.ok) { toast(r.error, "error"); return; }
        D.setSession(r.user);
        toast("Welcome back, " + r.user.name);
        renderApp();
      });
    } else {
      wrap.innerHTML = `
        <form class="auth-form" id="signupForm">
          <div class="form-group"><label>Full name</label><input name="name" required></div>
          <div class="form-group"><label>Email</label><input type="email" name="email" required></div>
          <div class="form-group"><label>Password</label><input type="password" name="password" required></div>
          <div class="form-group"><label>Role</label>
            <select name="role">${C.ROLES.map(r => `<option value="${r}">${r}</option>`).join("")}</select></div>
          <div class="form-group"><label>Company</label><input name="company" value="Clearing House Ltd."></div>
          <button type="submit" class="btn primary" style="justify-content:center">Create account</button>
        </form>`;
      $("#signupForm").addEventListener("submit", e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        const r = D.createUser(data);
        if (!r.ok) {
          const msgs = Object.values(r.errors).join(" ");
          toast(msgs || "Validation failed", "error");
          return;
        }
        D.setSession(r.user);
        toast("Account created. Welcome, " + r.user.name);
        renderApp();
      });
    }
  }

  // ---------- App shell ----------
  function renderApp() {
    const user = D.currentUser();
    if (!user) { renderAuth("signin"); return; }
    const root = $("#root");
    root.innerHTML = `
      <div class="app">
        <aside class="sidebar">
          <div class="brand">
            <div class="brand-mark">C</div>
            <div><div class="brand-name">ClearDesk</div><div class="brand-sub">${esc(user.company)}</div></div>
          </div>
          <nav class="nav">
            <div class="nav-section">Workspace</div>
            <button class="nav-item" data-view="dashboard"><span class="ico"> </span>Dashboard</button>
            <button class="nav-item" data-view="jobs"><span class="ico"> </span>Jobs</button>
            <button class="nav-item" data-view="clients"><span class="ico"> </span>Clients</button>
            <div class="nav-section">Operations</div>
            <button class="nav-item" data-view="reports"><span class="ico"> </span>Reports</button>
            <button class="nav-item" data-view="settings"><span class="ico"> </span>Settings</button>
          </nav>
          <div class="sidebar-foot">
            <div style="font-weight:600;color:var(--text)">${esc(user.name)}</div>
            <div>${esc(user.role)} · ${esc(user.email)}</div>
            <button class="btn ghost sm" style="margin-top:6px" id="logoutBtn">Sign out</button>
          </div>
        </aside>
        <div class="main">
          <header class="topbar">
            <button class="btn icon menu-btn" id="menuBtn">☰</button>
            <div class="topbar-title" id="topTitle">Dashboard</div>
            <div class="searchbox">
              <span class="ico">⌕</span>
              <input id="globalSearch" placeholder="Search jobs, clients, refs… ( / )" autocomplete="off">
            </div>
            <div class="topbar-actions">
              <button class="btn sm" id="cmdBtn">Commands <span class="kbd">⌘K</span></button>
              <button class="btn primary sm" id="newBtn">+ New</button>
            </div>
          </header>
          <div class="content" id="content"></div>
        </div>
      </div>
      <div class="modal-backdrop" id="modalBackdrop">
        <div class="modal">
          <div class="modal-head"><div class="modal-title" id="modalTitle"></div><button class="btn ghost sm" id="modalClose">✕</button></div>
          <div class="modal-body" id="modalBody"></div>
          <div class="modal-foot" id="modalFoot"></div>
        </div>
      </div>
      <div class="toast-wrap" id="toastWrap"></div>
      <div class="palette-backdrop" id="paletteBackdrop">
        <div class="palette">
          <input id="paletteInput" placeholder="Type a command or search…">
          <div class="palette-list" id="paletteList"></div>
        </div>
      </div>`;
    // nav
    $$(".nav-item").forEach(b => b.addEventListener("click", () => { state.view = b.dataset.view; state.params = {}; renderView(); updateNav(); if (window.innerWidth <= 900) { const sb = document.querySelector('.sidebar'); if (sb) sb.classList.remove('open'); } }));
    const mb = $("#menuBtn"); if (mb) mb.addEventListener("click", () => { const sb = document.querySelector('.sidebar'); if (sb) sb.classList.toggle('open'); });
    $("#logoutBtn").addEventListener("click", () => { D.logout(); toast("Signed out"); renderAuth("signin"); });
    $("#modalClose").addEventListener("click", closeModal);
    $("#modalBackdrop").addEventListener("click", e => { if (e.target.id === "modalBackdrop") closeModal(); });
    $("#cmdBtn").addEventListener("click", openPalette);
    $("#newBtn").addEventListener("click", handleNew);
    $("#globalSearch").addEventListener("input", e => {
      if (state.view === "jobs") { state.jobFilter.q = e.target.value; renderJobs(); }
      else if (state.view === "clients") { state.clientQuery = e.target.value; renderClients(); }
    });
    $("#globalSearch").addEventListener("keydown", e => { if (e.key === "Enter") { state.view = "jobs"; state.jobFilter.q = e.target.value; renderView(); updateNav(); } });
    document.addEventListener("keydown", globalKeys);
    updateNav();
    renderView();
  }

  function updateNav() {
    $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === state.view));
    const titles = { dashboard: "Dashboard", jobs: "Jobs", clients: "Clients", reports: "Reports", settings: "Settings" };
    const t = $("#topTitle");
    if (t) t.textContent = titles[state.view] || state.view;
  }

  function renderView() {
    const c = $("#content");
    if (!c) return;
    switch (state.view) {
      case "dashboard": renderDashboard(c); break;
      case "jobs": if (state.params.jobId) renderJobDetail(c, state.params.jobId); else renderJobs(c); break;
      case "clients": renderClients(c); break;
      case "reports": renderReports(c); break;
      case "settings": renderSettings(c); break;
      default: renderDashboard(c);
    }
  }

  // ---------- Dashboard ----------
  function renderDashboard(c) {
    const jobs = D.getJobs();
    const clients = D.getClients();
    const now = new Date().toISOString();
    const active = jobs.filter(j => !["closed","cancelled","delivered"].includes(j.status));
    const inTransit = jobs.filter(j => j.status === "in-transit").length;
    const cleared = jobs.filter(j => j.status === "cleared" || j.status === "delivered" || j.status === "closed").length;
    const overdue = jobs.filter(j => {
      if (!j.dischargeDate) return false;
      const d = C.demurrageCost(j.dischargeDate, j.freeDays, j.demurrageRate, now);
      return d.chargeableDays > 0 && !["closed","cancelled","delivered"].includes(j.status);
    });
    const demCost = overdue.reduce((s,j) => s + C.demurrageCost(j.dischargeDate, j.freeDays, j.demurrageRate, now).cost, 0);

    let html = `
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Active jobs</div><div class="kpi-value">${active.length}</div><div class="kpi-hint">${jobs.length} total</div></div>
        <div class="kpi"><div class="kpi-label">In transit</div><div class="kpi-value">${inTransit}</div><div class="kpi-hint">Across modes</div></div>
        <div class="kpi"><div class="kpi-label">Cleared / delivered</div><div class="kpi-value">${cleared}</div><div class="kpi-hint">Lifetime</div></div>
        <div class="kpi"><div class="kpi-label">Demurrage at risk</div><div class="kpi-value">${C.money(demCost)}</div><div class="kpi-hint">${overdue.length} job(s) overdue</div></div>
      </div>
      <div class="card">
        <div class="card-head"><div><div class="card-title">Recent jobs</div><div class="card-sub">Latest activity</div></div>
          <button class="btn sm" data-action="goto" data-view="jobs">View all</button></div>
        ${jobs.length ? renderJobsTable(jobs.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,8)) : emptyState("No jobs yet", "Create your first job to get started.")}
      </div>
      <div class="card">
        <div class="card-head"><div><div class="card-title">Demurrage alerts</div><div class="card-sub">Jobs past free time</div></div></div>
        ${overdue.length ? renderJobsTable(overdue) : `<div class="empty"><div class="empty-ico">✓</div><div class="empty-title">No demurrage exposure</div><div>All jobs within free time.</div></div>`}
      </div>`;
    c.innerHTML = html;
    wireJobTable(c);
  }

  // ---------- Jobs list ----------
  function renderJobs(c) {
    const jobs = D.getJobs();
    const filtered = C.filterJobs(jobs, state.jobFilter);
    const clients = D.getClients();
    let html = `
      <div class="card" style="padding:10px 14px;margin-bottom:12px">
        <div class="row between" style="flex-wrap:wrap;gap:8px">
          <div class="row" style="flex-wrap:wrap;gap:6px">
            <select id="fStatus" style="width:150px"><option value="">All statuses</option>${C.JOB_STATUSES.map(s=>`<option value="${s}" ${state.jobFilter.status===s?"selected":""}>${s}</option>`).join("")}</select>
            <select id="fMode" style="width:120px"><option value="">All modes</option>${C.MODES.map(m=>`<option value="${m}" ${state.jobFilter.mode===m?"selected":""}>${m}</option>`).join("")}</select>
            <select id="fType" style="width:130px"><option value="">All types</option>${C.JOB_TYPES.map(t=>`<option value="${t}" ${state.jobFilter.type===t?"selected":""}>${t}</option>`).join("")}</select>
            <select id="fClient" style="width:180px"><option value="">All clients</option>${clients.map(cl=>`<option value="${cl.id}" ${state.jobFilter.clientId===cl.id?"selected":""}>${esc(cl.name)}</option>`).join("")}</select>
          </div>
          <div class="row">
            <span class="text-muted text-sm">${filtered.length} of ${jobs.length}</span>
            <button class="btn primary sm" data-action="newJob">+ New job</button>
          </div>
        </div>
      </div>
      <div class="card" style="padding:0">
        ${filtered.length ? renderJobsTable(filtered) : emptyState("No jobs match", "Adjust filters or create a new job.")}
      </div>`;
    c.innerHTML = html;
    // filters
    ["fStatus","fMode","fType","fClient"].forEach(id => {
      const el = $("#"+id);
      if (el) el.addEventListener("change", () => {
        state.jobFilter.status = $("#fStatus").value;
        state.jobFilter.mode = $("#fMode").value;
        state.jobFilter.type = $("#fType").value;
        state.jobFilter.clientId = $("#fClient").value;
        renderJobs();
      });
    });
    wireJobTable(c);
    // search input sync
    const gs = $("#globalSearch"); if (gs) gs.value = state.jobFilter.q || "";
  }

  function renderJobsTable(jobs) {
    return `<div class="table-wrap"><table>
      <thead><tr>
        <th>Ref</th><th>Client</th><th>Shipper → Consignee</th><th>Mode</th><th>Type</th>
        <th>Status</th><th>ETA</th><th>Demurrage</th><th></th>
      </tr></thead><tbody>
      ${jobs.map(j => {
        const d = j.dischargeDate ? C.demurrageCost(j.dischargeDate, j.freeDays, j.demurrageRate, new Date().toISOString()) : null;
        return `<tr data-job="${j.id}" style="cursor:pointer">
          <td class="mono">${esc(j.ref)}</td>
          <td>${esc(j.clientName || "")}</td>
          <td>${esc(j.shipper)} → ${esc(j.consignee)}</td>
          <td>${esc(j.mode)}</td>
          <td>${esc(j.type)}</td>
          <td><span class="badge status-${j.status}">${esc(j.status)}</span></td>
          <td>${esc(j.eta || "-")}</td>
          <td class="num">${d ? (d.chargeableDays > 0 ? C.money(d.cost) : "—") : "—"}</td>
          <td><button class="btn ghost sm" data-action="openJob" data-id="${j.id}">Open</button></td>
        </tr>`;
      }).join("")}
      </tbody></table></div>`;
  }

  function wireJobTable(root) {
    root.querySelectorAll("[data-action='openJob']").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); openJob(b.dataset.id); }));
    root.querySelectorAll("tr[data-job]").forEach(tr => tr.addEventListener("click", e => {
      if (e.target.closest("button")) return;
      openJob(tr.dataset.job);
    }));
    root.querySelectorAll("[data-action='goto']").forEach(b => b.addEventListener("click", () => { state.view = b.dataset.view; state.params = {}; renderView(); updateNav(); }));
    root.querySelectorAll("[data-action='newJob']").forEach(b => b.addEventListener("click", newJobModal));
  }

  function openJob(id) {
    state.view = "jobs";
    state.params = { jobId: id };
    renderView();
    updateNav();
  }

  // ---------- Job detail ----------
  function renderJobDetail(c, id) {
    const job = D.getJob(id);
    if (!job) { c.innerHTML = emptyState("Job not found", ""); return; }
    const client = job.clientId ? D.getClient(job.clientId) : null;
    const entries = D.getEntries(id);
    const charges = D.getCharges(id);
    const totals = C.calcDutyTotals(entries);
    const dem = job.dischargeDate ? C.demurrageCost(job.dischargeDate, job.freeDays, job.demurrageRate, new Date().toISOString()) : null;
    const chargeTotal = C.chargeTotals(charges, D.getSettings().rates, D.getSettings().currency);
    const tab = state.params.tab || "overview";
    let html = `
      <div class="row between" style="margin-bottom:12px">
        <div>
          <button class="btn ghost sm" data-action="backJobs">← Jobs</button>
          <span class="mono" style="margin-left:8px;font-size:15px;font-weight:600">${esc(job.ref)}</span>
          <span class="badge status-${job.status}" style="margin-left:8px">${esc(job.status)}</span>
        </div>
        <div class="row">
          <button class="btn sm" data-action="printDoc" data-type="invoice">Invoice</button>
          <button class="btn sm" data-action="printDoc" data-type="packing">Packing list</button>
          <button class="btn sm" data-action="printDoc" data-type="do">Delivery order</button>
          <button class="btn sm" data-action="printDoc" data-type="charges">Charge sheet</button>
          <button class="btn primary sm" data-action="editJob" data-id="${job.id}">Edit</button>
        </div>
      </div>
      <div class="tabs">
        ${["overview","customs","charges","documents"].map(t => `<button class="tab ${tab===t?"active":""}" data-tab="${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join("")}
      </div>`;
    if (tab === "overview") {
      html += `
        <div class="detail-grid">
          <div class="card">
            <div class="card-title" style="margin-bottom:8px">Shipment</div>
            ${detailRow("Client", job.clientName)}
            ${detailRow("Shipper", job.shipper)}
            ${detailRow("Consignee", job.consignee)}
            ${detailRow("Mode", job.mode)}
            ${detailRow("Type", job.type)}
            ${detailRow("Vessel/Flight", job.vessel)}
            ${detailRow("B/L or AWB", job.blNumber)}
            ${detailRow("Container", job.containerNo)}
            ${detailRow("Packages", job.packages)}
            ${detailRow("Weight", job.weightKg + " kg")}
            ${detailRow("Volume", job.volumeCbm + " cbm")}
          </div>
          <div class="card">
            <div class="card-title" style="margin-bottom:8px">Route & dates</div>
            ${detailRow("POL", job.pol)}
            ${detailRow("POD", job.pod)}
            ${detailRow("ETD", job.etd)}
            ${detailRow("ETA", job.eta)}
            ${detailRow("Discharge", job.dischargeDate)}
            ${detailRow("Free days", job.freeDays)}
            ${detailRow("Demurrage/day", C.money(job.demurrageRate, D.getSettings().currency))}
            ${dem ? detailRow("Demurrage", dem.chargeableDays + " chargeable days · " + C.money(dem.cost)) : ""}
            <div class="divider"></div>
            <div class="card-title" style="margin-bottom:6px">Status transition</div>
            <div class="row" style="flex-wrap:wrap;gap:6px">
              ${C.allowedTransitions(job.status).map(s => `<button class="btn sm" data-action="transition" data-id="${job.id}" data-to="${s}">${s}</button>`).join("") || `<span class="text-muted text-sm">No further transitions</span>`}
            </div>
          </div>
        </div>
        ${job.notes ? `<div class="card"><div class="card-title" style="margin-bottom:6px">Notes</div><div>${esc(job.notes)}</div></div>` : ""}
        <div class="card">
          <div class="card-head"><div class="card-title">Customs totals</div></div>
          <div class="detail-row"><span class="k">Customs value</span><span class="v">${C.money(totals.value)}</span></div>
          <div class="detail-row"><span class="k">Duty</span><span class="v">${C.money(totals.duty)}</span></div>
          <div class="detail-row"><span class="k">VAT</span><span class="v">${C.money(totals.vat)}</span></div>
          <div class="detail-row"><span class="k">Total</span><span class="v">${C.money(totals.total)}</span></div>
        </div>`;
    } else if (tab === "customs") {
      html += `
        <div class="card" style="padding:0">
          <div class="card-head" style="padding:12px 14px"><div><div class="card-title">Customs entry lines</div><div class="card-sub">HS codes, values and computed duty/VAT</div></div>
            <button class="btn primary sm" data-action="newEntry" data-job="${job.id}">+ Add line</button></div>
          ${entries.length ? `<div class="table-wrap"><table>
            <thead><tr><th>HS</th><th>Description</th><th>Qty</th><th>Value</th><th>Duty %</th><th>VAT %</th><th>Duty</th><th>VAT</th><th>Total</th><th></th></tr></thead><tbody>
            ${entries.map(l => {
              const r = C.calcDutyLine(l);
              return `<tr>
                <td class="mono">${esc(l.hs)}</td><td>${esc(l.description)}</td><td class="num">${l.qty||1}</td>
                <td class="num">${C.money(l.value, l.currency)}</td><td class="num">${l.dutyRate}</td><td class="num">${l.vatRate}</td>
                <td class="num">${C.money(r.duty, l.currency)}</td><td class="num">${C.money(r.vat, l.currency)}</td><td class="num">${C.money(r.total, l.currency)}</td>
                <td><button class="btn ghost sm" data-action="editEntry" data-job="${job.id}" data-id="${l.id}">Edit</button>
                    <button class="btn ghost sm" data-action="delEntry" data-job="${job.id}" data-id="${l.id}">Del</button></td>
              </tr>`;
            }).join("")}
            </tbody><tfoot><tr style="font-weight:600;background:var(--bg-2)"><td colspan="3">TOTAL</td><td class="num">${C.money(totals.value)}</td><td></td><td></td><td class="num">${C.money(totals.duty)}</td><td class="num">${C.money(totals.vat)}</td><td class="num">${C.money(totals.total)}</td><td></td></tr></tfoot></table></div>` : emptyState("No entry lines", "Add HS lines to compute duty and VAT.")}
        </div>`;
    } else if (tab === "charges") {
      html += `
        <div class="card" style="padding:0">
          <div class="card-head" style="padding:12px 14px"><div><div class="card-title">Charges</div><div class="card-sub">Costs and fees for this job (total ${C.money(chargeTotal)})</div></div>
            <button class="btn primary sm" data-action="newCharge" data-job="${job.id}">+ Add charge</button></div>
          ${charges.length ? `<div class="table-wrap"><table>
            <thead><tr><th>Category</th><th>Description</th><th>Amount</th><th>Currency</th><th>In ${esc(D.getSettings().currency)}</th><th></th></tr></thead><tbody>
            ${charges.map(ch => {
              const amt = C.convert(ch.amount, ch.currency, D.getSettings().currency, D.getSettings().rates);
              return `<tr>
                <td>${esc(ch.category)}</td><td>${esc(ch.description||"")}</td>
                <td class="num">${C.money(ch.amount, ch.currency)}</td><td>${esc(ch.currency)}</td>
                <td class="num">${C.money(amt, D.getSettings().currency)}</td>
                <td><button class="btn ghost sm" data-action="editCharge" data-job="${job.id}" data-id="${ch.id}">Edit</button>
                    <button class="btn ghost sm" data-action="delCharge" data-job="${job.id}" data-id="${ch.id}">Del</button></td>
              </tr>`;
            }).join("")}
            </tbody><tfoot><tr style="font-weight:600;background:var(--bg-2)"><td colspan="4">TOTAL</td><td class="num">${C.money(chargeTotal)}</td><td></td></tr></tfoot></table></div>` : emptyState("No charges", "Add charges to build an invoice.")}
        </div>`;
    } else if (tab === "documents") {
      html += `
        <div class="card">
          <div class="card-title" style="margin-bottom:8px">Generate documents</div>
          <div class="row" style="flex-wrap:wrap;gap:8px">
            <button class="btn" data-action="printDoc" data-type="invoice">Commercial invoice</button>
            <button class="btn" data-action="printDoc" data-type="packing">Packing list</button>
            <button class="btn" data-action="printDoc" data-type="do">Delivery order</button>
            <button class="btn" data-action="printDoc" data-type="charges">Charge sheet / invoice</button>
            <button class="btn" data-action="exportJobCsv">Export job CSV</button>
            <button class="btn" data-action="exportEntriesCsv">Export entries CSV</button>
          </div>
          <p class="text-muted text-sm" style="margin-top:8px">Documents open in a new tab for printing or saving as PDF.</p>
        </div>`;
    }
    c.innerHTML = html;
    // wire tabs
    c.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => { state.params.tab = b.dataset.tab; renderJobDetail(c, id); }));
    c.querySelectorAll("[data-action='backJobs']").forEach(b => b.addEventListener("click", () => { state.params = {}; state.view = "jobs"; renderView(); updateNav(); }));
    c.querySelectorAll("[data-action='editJob']").forEach(b => b.addEventListener("click", () => editJobModal(b.dataset.id)));
    c.querySelectorAll("[data-action='transition']").forEach(b => b.addEventListener("click", () => {
      const r = D.transitionJob(b.dataset.id, b.dataset.to);
      if (!r.ok) { toast(r.error, "error"); return; }
      toast("Status → " + b.dataset.to);
      renderJobDetail(c, id);
    }));
    c.querySelectorAll("[data-action='newEntry']").forEach(b => b.addEventListener("click", () => newEntryModal(b.dataset.job)));
    c.querySelectorAll("[data-action='editEntry']").forEach(b => b.addEventListener("click", () => editEntryModal(b.dataset.job, b.dataset.id)));
    c.querySelectorAll("[data-action='delEntry']").forEach(b => b.addEventListener("click", () => {
      if (!confirm("Delete this entry line?")) return;
      D.deleteEntryLine(b.dataset.job, b.dataset.id);
      toast("Deleted");
      renderJobDetail(c, id);
    }));
    c.querySelectorAll("[data-action='newCharge']").forEach(b => b.addEventListener("click", () => newChargeModal(b.dataset.job)));
    c.querySelectorAll("[data-action='editCharge']").forEach(b => b.addEventListener("click", () => editChargeModal(b.dataset.job, b.dataset.id)));
    c.querySelectorAll("[data-action='delCharge']").forEach(b => b.addEventListener("click", () => {
      if (!confirm("Delete this charge?")) return;
      D.deleteCharge(b.dataset.job, b.dataset.id);
      toast("Deleted");
      renderJobDetail(c, id);
    }));
    c.querySelectorAll("[data-action='printDoc']").forEach(b => b.addEventListener("click", () => printDoc(b.dataset.type, job)));
    c.querySelectorAll("[data-action='exportJobCsv']").forEach(b => b.addEventListener("click", () => exportJobCsv(job)));
    c.querySelectorAll("[data-action='exportEntriesCsv']").forEach(b => b.addEventListener("click", () => exportEntriesCsv(job, entries)));
  }

  function detailRow(k, v) {
    return `<div class="detail-row"><span class="k">${esc(k)}</span><span class="v">${esc(v == null ? "-" : v)}</span></div>`;
  }

  // ---------- Clients ----------
  function renderClients(c) {
    const clients = D.getClients();
    const filtered = C.filterClients(clients, state.clientQuery);
    c.innerHTML = `
      <div class="card" style="padding:10px 14px;margin-bottom:12px">
        <div class="row between">
          <input id="clientSearch" placeholder="Search clients…" value="${esc(state.clientQuery)}" style="max-width:320px">
          <button class="btn primary sm" data-action="newClient">+ New client</button>
        </div>
      </div>
      <div class="card" style="padding:0">
        ${filtered.length ? `<div class="table-wrap"><table>
          <thead><tr><th>Name</th><th>Contact</th><th>Email</th><th>Phone</th><th>Country</th><th>Jobs</th><th></th></tr></thead><tbody>
          ${filtered.map(cl => {
            const jobs = D.getJobs().filter(j => j.clientId === cl.id).length;
            return `<tr>
              <td style="font-weight:500">${esc(cl.name)}</td>
              <td>${esc(cl.contact)}</td>
              <td>${esc(cl.email)}</td>
              <td>${esc(cl.phone)}</td>
              <td>${esc(cl.country)}</td>
              <td class="num">${jobs}</td>
              <td>
                <button class="btn ghost sm" data-action="editClient" data-id="${cl.id}">Edit</button>
                <button class="btn ghost sm" data-action="delClient" data-id="${cl.id}">Del</button>
              </td>
            </tr>`;
          }).join("")}
          </tbody></table></div>` : emptyState("No clients", "Add your first client.")}
      </div>`;
    const cs = $("#clientSearch");
    if (cs) cs.addEventListener("input", e => { state.clientQuery = e.target.value; renderClients(); });
    c.querySelectorAll("[data-action='newClient']").forEach(b => b.addEventListener("click", newClientModal));
    c.querySelectorAll("[data-action='editClient']").forEach(b => b.addEventListener("click", () => editClientModal(b.dataset.id)));
    c.querySelectorAll("[data-action='delClient']").forEach(b => b.addEventListener("click", () => {
      const r = D.deleteClient(b.dataset.id);
      if (!r.ok) { toast(r.error, "error"); return; }
      toast("Client deleted");
      renderClients();
    }));
  }

  // ---------- Reports ----------
  function renderReports(c) {
    const jobs = D.getJobs();
    const clients = D.getClients();
    const charges = {};
    let totalCharges = 0;
    const settings = D.getSettings();
    jobs.forEach(j => {
      const ch = D.getCharges(j.id);
      const t = C.chargeTotals(ch, settings.rates, settings.currency);
      charges[j.id] = t;
      totalCharges += t;
    });
    const byStatus = {};
    C.JOB_STATUSES.forEach(s => byStatus[s] = jobs.filter(j => j.status === s).length);
    const byMode = {};
    C.MODES.forEach(m => byMode[m] = jobs.filter(j => j.mode === m).length);
    c.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Total jobs</div><div class="kpi-value">${jobs.length}</div></div>
        <div class="kpi"><div class="kpi-label">Clients</div><div class="kpi-value">${clients.length}</div></div>
        <div class="kpi"><div class="kpi-label">Charges (total)</div><div class="kpi-value">${C.money(totalCharges)}</div></div>
        <div class="kpi"><div class="kpi-label">Avg charges/job</div><div class="kpi-value">${jobs.length ? C.money(totalCharges/jobs.length) : C.money(0)}</div></div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:8px">Jobs by status</div>
        <div class="table-wrap"><table><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>
          ${C.JOB_STATUSES.map(s => `<tr><td>${esc(s)}</td><td class="num">${byStatus[s]}</td></tr>`).join("")}
        </tbody></table></div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:8px">Jobs by mode</div>
        <div class="table-wrap"><table><thead><tr><th>Mode</th><th>Count</th></tr></thead><tbody>
          ${C.MODES.map(m => `<tr><td>${esc(m)}</td><td class="num">${byMode[m]}</td></tr>`).join("")}
        </tbody></table></div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:8px">Export</div>
        <div class="row" style="gap:8px">
          <button class="btn" data-action="exportAllJobs">Export all jobs CSV</button>
          <button class="btn" data-action="exportAllClients">Export clients CSV</button>
        </div>
      </div>`;
    c.querySelectorAll("[data-action='exportAllJobs']").forEach(b => b.addEventListener("click", exportAllJobsCsv));
    c.querySelectorAll("[data-action='exportAllClients']").forEach(b => b.addEventListener("click", exportAllClientsCsv));
  }

  // ---------- Settings ----------
  function renderSettings(c) {
    const s = D.getSettings();
    c.innerHTML = `
      <div class="card">
        <div class="card-title" style="margin-bottom:10px">Company profile</div>
        <div class="form-grid">
          <div class="form-group"><label>Company</label><input id="sCompany" value="${esc(s.company)}"></div>
          <div class="form-group"><label>Address</label><input id="sAddress" value="${esc(s.address)}"></div>
          <div class="form-group"><label>Phone</label><input id="sPhone" value="${esc(s.phone)}"></div>
          <div class="form-group"><label>Email</label><input id="sEmail" value="${esc(s.email)}"></div>
          <div class="form-group"><label>Base currency</label><select id="sCurrency">${C.CURRENCIES.map(x=>`<option value="${x}" ${s.currency===x?"selected":""}>${x}</option>`).join("")}</select></div>
          <div class="form-group"><label>Job ref prefix</label><input id="sPrefix" value="${esc(s.jobPrefix)}"></div>
          <div class="form-group"><label>Default free days</label><input type="number" id="sFree" value="${s.freeDays}"></div>
          <div class="form-group"><label>Default demurrage rate/day</label><input type="number" id="sDem" value="${s.demurrageRate}"></div>
        </div>
        <div class="mt12"><button class="btn primary" id="saveSettings">Save settings</button></div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:8px">FX rates (base ${esc(s.currency)})</div>
        <p class="text-muted text-sm">Rates used to convert charges. 1 unit of currency = rate in base currency? Stored as relative. Adjust as needed.</p>
        <div class="form-grid">
          ${C.CURRENCIES.map(cur => `<div class="form-group"><label>${cur}</label><input type="number" step="0.0001" data-rate="${cur}" value="${s.rates[cur] || 1}"></div>`).join("")}
        </div>
        <div class="mt12"><button class="btn" id="saveRates">Save rates</button></div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom:8px">Data management</div>
        <div class="row" style="gap:8px">
          <button class="btn" id="resetSeed">Reset to demo data</button>
          <button class="btn danger" id="clearAll">Clear all data</button>
        </div>
        <p class="text-muted text-sm" style="margin-top:6px">Reset restores seeded demo data. Clear removes everything (including users) and returns to sign-in.</p>
      </div>`;
    $("#saveSettings").addEventListener("click", () => {
      const s2 = D.getSettings();
      s2.company = $("#sCompany").value.trim();
      s2.address = $("#sAddress").value.trim();
      s2.phone = $("#sPhone").value.trim();
      s2.email = $("#sEmail").value.trim();
      s2.currency = $("#sCurrency").value;
      s2.jobPrefix = $("#sPrefix").value.trim() || "JOB";
      s2.freeDays = Number($("#sFree").value) || 7;
      s2.demurrageRate = Number($("#sDem").value) || 50;
      D.saveSettings(s2);
      toast("Settings saved");
    });
    $("#saveRates").addEventListener("click", () => {
      const s2 = D.getSettings();
      s2.rates = s2.rates || {};
      $$("input[data-rate]").forEach(inp => { s2.rates[inp.dataset.rate] = Number(inp.value) || 1; });
      D.saveSettings(s2);
      toast("Rates saved");
    });
    $("#resetSeed").addEventListener("click", () => {
      if (!confirm("Reset all data to demo seed?")) return;
      // clear keys
      Object.keys(localStorage).filter(k=>k.startsWith("cd_")).forEach(k=>{try{localStorage.removeItem(k);}catch(e){}});
      D.seedIfEmpty();
      toast("Reset complete");
      renderApp();
    });
    $("#clearAll").addEventListener("click", () => {
      if (!confirm("Clear ALL data including users?")) return;
      Object.keys(localStorage).filter(k=>k.startsWith("cd_")).forEach(k=>{try{localStorage.removeItem(k);}catch(e){}});
      toast("Cleared");
      renderAuth("signin");
    });
  }

  // ---------- Modals: Job ----------
  function newJobModal() {
    const clients = D.getClients();
    const s = D.getSettings();
    openModal("New job", `
      <form id="jobForm" class="form-grid">
        <div class="form-group"><label>Client *</label>
          <select name="clientId" required><option value="">Select client…</option>${clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Mode *</label><select name="mode">${C.MODES.map(m=>`<option value="${m}">${m}</option>`).join("")}</select></div>
        <div class="form-group"><label>Type *</label><select name="type">${C.JOB_TYPES.map(t=>`<option value="${t}">${t}</option>`).join("")}</select></div>
        <div class="form-group"><label>Status</label><select name="status">${C.JOB_STATUSES.map(st=>`<option value="${st}" ${st==="draft"?"selected":""}>${st}</option>`).join("")}</select></div>
        <div class="form-group"><label>Shipper *</label><input name="shipper" required></div>
        <div class="form-group"><label>Consignee *</label><input name="consignee" required></div>
        <div class="form-group"><label>POL</label><input name="pol"></div>
        <div class="form-group"><label>POD</label><input name="pod"></div>
        <div class="form-group"><label>Vessel/Flight</label><input name="vessel"></div>
        <div class="form-group"><label>B/L or AWB</label><input name="blNumber"></div>
        <div class="form-group"><label>Container No</label><input name="containerNo"></div>
        <div class="form-group"><label>Packages</label><input type="number" name="packages" value="0"></div>
        <div class="form-group"><label>Weight (kg)</label><input type="number" step="0.01" name="weightKg" value="0"></div>
        <div class="form-group"><label>Volume (cbm)</label><input type="number" step="0.01" name="volumeCbm" value="0"></div>
        <div class="form-group"><label>ETD</label><input type="date" name="etd"></div>
        <div class="form-group"><label>ETA</label><input type="date" name="eta"></div>
        <div class="form-group"><label>Discharge date</label><input type="date" name="dischargeDate"></div>
        <div class="form-group"><label>Free days</label><input type="number" name="freeDays" value="${s.freeDays}"></div>
        <div class="form-group"><label>Demurrage rate/day</label><input type="number" name="demurrageRate" value="${s.demurrageRate}"></div>
        <div class="form-group full"><label>Notes</label><textarea name="notes"></textarea></div>
      </form>`, `<button class="btn" id="mCancel">Cancel</button><button class="btn primary" id="mSave">Create job</button>`);
    $("#mCancel").addEventListener("click", closeModal);
    $("#mSave").addEventListener("click", () => {
      const fd = new FormData($("#jobForm"));
      const data = Object.fromEntries(fd.entries());
      data.packages = Number(data.packages); data.weightKg = Number(data.weightKg); data.volumeCbm = Number(data.volumeCbm);
      data.freeDays = Number(data.freeDays); data.demurrageRate = Number(data.demurrageRate);
      const r = D.upsertJob(data);
      if (!r.ok) { toast(Object.values(r.errors).join(" "), "error"); return; }
      closeModal();
      toast("Job created: " + r.job.ref);
      state.view = "jobs"; state.params = { jobId: r.job.id };
      renderView(); updateNav();
    });
  }

  function editJobModal(id) {
    const job = D.getJob(id);
    if (!job) return;
    const clients = D.getClients();
    openModal("Edit job", `
      <form id="jobForm" class="form-grid">
        <div class="form-group"><label>Client *</label>
          <select name="clientId" required>${clients.map(c=>`<option value="${c.id}" ${job.clientId===c.id?"selected":""}>${esc(c.name)}</option>`).join("")}</select></div>
        <div class="form-group"><label>Mode *</label><select name="mode">${C.MODES.map(m=>`<option value="${m}" ${job.mode===m?"selected":""}>${m}</option>`).join("")}</select></div>
        <div class="form-group"><label>Type *</label><select name="type">${C.JOB_TYPES.map(t=>`<option value="${t}" ${job.type===t?"selected":""}>${t}</option>`).join("")}</select></div>
        <div class="form-group"><label>Status</label><select name="status">${C.JOB_STATUSES.map(st=>`<option value="${st}" ${job.status===st?"selected":""}>${st}</option>`).join("")}</select></div>
        <div class="form-group"><label>Shipper *</label><input name="shipper" required value="${esc(job.shipper)}"></div>
        <div class="form-group"><label>Consignee *</label><input name="consignee" required value="${esc(job.consignee)}"></div>
        <div class="form-group"><label>POL</label><input name="pol" value="${esc(job.pol)}"></div>
        <div class="form-group"><label>POD</label><input name="pod" value="${esc(job.pod)}"></div>
        <div class="form-group"><label>Vessel/Flight</label><input name="vessel" value="${esc(job.vessel)}"></div>
        <div class="form-group"><label>B/L or AWB</label><input name="blNumber" value="${esc(job.blNumber)}"></div>
        <div class="form-group"><label>Container No</label><input name="containerNo" value="${esc(job.containerNo)}"></div>
        <div class="form-group"><label>Packages</label><input type="number" name="packages" value="${job.packages}"></div>
        <div class="form-group"><label>Weight (kg)</label><input type="number" step="0.01" name="weightKg" value="${job.weightKg}"></div>
        <div class="form-group"><label>Volume (cbm)</label><input type="number" step="0.01" name="volumeCbm" value="${job.volumeCbm}"></div>
        <div class="form-group"><label>ETD</label><input type="date" name="etd" value="${job.etd}"></div>
        <div class="form-group"><label>ETA</label><input type="date" name="eta" value="${job.eta}"></div>
        <div class="form-group"><label>Discharge date</label><input type="date" name="dischargeDate" value="${job.dischargeDate}"></div>
        <div class="form-group"><label>Free days</label><input type="number" name="freeDays" value="${job.freeDays}"></div>
        <div class="form-group"><label>Demurrage rate/day</label><input type="number" name="demurrageRate" value="${job.demurrageRate}"></div>
        <div class="form-group full"><label>Notes</label><textarea name="notes">${esc(job.notes)}</textarea></div>
        <input type="hidden" name="id" value="${job.id}">
      </form>`, `<button class="btn" id="mCancel">Cancel</button><button class="btn danger" id="mDelete">Delete</button><button class="btn primary" id="mSave">Save</button>`);
    $("#mCancel").addEventListener("click", closeModal);
    $("#mDelete").addEventListener("click", () => {
      if (!confirm("Delete this job and all its data?")) return;
      D.deleteJob(job.id);
      closeModal();
      toast("Job deleted");
      state.params = {}; state.view = "jobs";
      renderView(); updateNav();
    });
    $("#mSave").addEventListener("click", () => {
      const fd = new FormData($("#jobForm"));
      const data = Object.fromEntries(fd.entries());
      data.id = job.id;
      data.packages = Number(data.packages); data.weightKg = Number(data.weightKg); data.volumeCbm = Number(data.volumeCbm);
      data.freeDays = Number(data.freeDays); data.demurrageRate = Number(data.demurrageRate);
      const r = D.upsertJob(data);
      if (!r.ok) { toast(Object.values(r.errors).join(" "), "error"); return; }
      closeModal();
      toast("Job updated");
      renderJobDetail($("#content"), job.id);
    });
  }

  // ---------- Entry modal ----------
  function newEntryModal(jobId) {
    openModal("Add customs line", `
      <form id="entryForm" class="form-grid">
        <div class="form-group"><label>HS code *</label><input name="hs" required placeholder="8517.12"></div>
        <div class="form-group"><label>Description *</label><input name="description" required></div>
        <div class="form-group"><label>Qty</label><input type="number" name="qty" value="1"></div>
        <div class="form-group"><label>Value *</label><input type="number" step="0.01" name="value" required></div>
        <div class="form-group"><label>Currency</label><select name="currency">${C.CURRENCIES.map(x=>`<option value="${x}">${x}</option>`).join("")}</select></div>
        <div class="form-group"><label>Duty rate %</label><input type="number" step="0.01" name="dutyRate" value="5"></div>
        <div class="form-group"><label>VAT rate %</label><input type="number" step="0.01" name="vatRate" value="5"></div>
        <div class="form-group"><label>Weight (kg)</label><input type="number" step="0.01" name="weightKg" value="0"></div>
        <div class="form-group"><label>Volume (cbm)</label><input type="number" step="0.01" name="volumeCbm" value="0"></div>
      </form>`, `<button class="btn" id="mCancel">Cancel</button><button class="btn primary" id="mSave">Add</button>`);
    $("#mCancel").addEventListener("click", closeModal);
    $("#mSave").addEventListener("click", () => {
      const fd = new FormData($("#entryForm"));
      const data = Object.fromEntries(fd.entries());
      data.value = Number(data.value); data.qty = Number(data.qty); data.dutyRate = Number(data.dutyRate); data.vatRate = Number(data.vatRate);
      data.weightKg = Number(data.weightKg); data.volumeCbm = Number(data.volumeCbm);
      const r = D.upsertEntryLine(jobId, data);
      if (!r.ok) { toast(Object.values(r.errors).join(" "), "error"); return; }
      closeModal();
      toast("Line added");
      renderJobDetail($("#content"), jobId);
    });
  }

  function editEntryModal(jobId, lineId) {
    const lines = D.getEntries(jobId);
    const l = lines.find(x => x.id === lineId);
    if (!l) return;
    openModal("Edit customs line", `
      <form id="entryForm" class="form-grid">
        <div class="form-group"><label>HS code *</label><input name="hs" required value="${esc(l.hs)}"></div>
        <div class="form-group"><label>Description *</label><input name="description" required value="${esc(l.description)}"></div>
        <div class="form-group"><label>Qty</label><input type="number" name="qty" value="${l.qty||1}"></div>
        <div class="form-group"><label>Value *</label><input type="number" step="0.01" name="value" required value="${l.value}"></div>
        <div class="form-group"><label>Currency</label><select name="currency">${C.CURRENCIES.map(x=>`<option value="${x}" ${l.currency===x?"selected":""}>${x}</option>`).join("")}</select></div>
        <div class="form-group"><label>Duty rate %</label><input type="number" step="0.01" name="dutyRate" value="${l.dutyRate}"></div>
        <div class="form-group"><label>VAT rate %</label><input type="number" step="0.01" name="vatRate" value="${l.vatRate}"></div>
        <input type="hidden" name="id" value="${l.id}">
      </form>`, `<button class="btn" id="mCancel">Cancel</button><button class="btn primary" id="mSave">Save</button>`);
    $("#mCancel").addEventListener("click", closeModal);
    $("#mSave").addEventListener("click", () => {
      const fd = new FormData($("#entryForm"));
      const data = Object.fromEntries(fd.entries());
      data.id = l.id;
      data.value = Number(data.value); data.qty = Number(data.qty); data.dutyRate = Number(data.dutyRate); data.vatRate = Number(data.vatRate);
      const r = D.upsertEntryLine(jobId, data);
      if (!r.ok) { toast(Object.values(r.errors).join(" "), "error"); return; }
      closeModal();
      toast("Updated");
      renderJobDetail($("#content"), jobId);
    });
  }

  // ---------- Charge modal ----------
  function newChargeModal(jobId) {
    openModal("Add charge", `
      <form id="chargeForm" class="form-grid">
        <div class="form-group"><label>Category *</label><select name="category">${C.CHARGE_CATEGORIES.map(x=>`<option value="${x}">${x}</option>`).join("")}</select></div>
        <div class="form-group"><label>Description</label><input name="description"></div>
        <div class="form-group"><label>Amount *</label><input type="number" step="0.01" name="amount" required></div>
        <div class="form-group"><label>Currency</label><select name="currency">${C.CURRENCIES.map(x=>`<option value="${x}">${x}</option>`).join("")}</select></div>
      </form>`, `<button class="btn" id="mCancel">Cancel</button><button class="btn primary" id="mSave">Add</button>`);
    $("#mCancel").addEventListener("click", closeModal);
    $("#mSave").addEventListener("click", () => {
      const fd = new FormData($("#chargeForm"));
      const data = Object.fromEntries(fd.entries());
      data.amount = Number(data.amount);
      const r = D.upsertCharge(jobId, data);
      if (!r.ok) { toast(Object.values(r.errors).join(" "), "error"); return; }
      closeModal();
      toast("Charge added");
      renderJobDetail($("#content"), jobId);
    });
  }

  function editChargeModal(jobId, chargeId) {
    const ch = D.getCharges(jobId).find(x => x.id === chargeId);
    if (!ch) return;
    openModal("Edit charge", `
      <form id="chargeForm" class="form-grid">
        <div class="form-group"><label>Category *</label><select name="category">${C.CHARGE_CATEGORIES.map(x=>`<option value="${x}" ${ch.category===x?"selected":""}>${x}</option>`).join("")}</select></div>
        <div class="form-group"><label>Description</label><input name="description" value="${esc(ch.description)}"></div>
        <div class="form-group"><label>Amount *</label><input type="number" step="0.01" name="amount" required value="${ch.amount}"></div>
        <div class="form-group"><label>Currency</label><select name="currency">${C.CURRENCIES.map(x=>`<option value="${x}" ${ch.currency===x?"selected":""}>${x}</option>`).join("")}</select></div>
        <input type="hidden" name="id" value="${ch.id}">
      </form>`, `<button class="btn" id="mCancel">Cancel</button><button class="btn primary" id="mSave">Save</button>`);
    $("#mCancel").addEventListener("click", closeModal);
    $("#mSave").addEventListener("click", () => {
      const fd = new FormData($("#chargeForm"));
      const data = Object.fromEntries(fd.entries());
      data.id = ch.id;
      data.amount = Number(data.amount);
      const r = D.upsertCharge(jobId, data);
      if (!r.ok) { toast(Object.values(r.errors).join(" "), "error"); return; }
      closeModal();
      toast("Updated");
      renderJobDetail($("#content"), jobId);
    });
  }

  // ---------- Client modal ----------
  function newClientModal() {
    openModal("New client", clientFormHtml({}), `<button class="btn" id="mCancel">Cancel</button><button class="btn primary" id="mSave">Create</button>`);
    wireClientForm(null);
  }
  function editClientModal(id) {
    const cl = D.getClient(id);
    if (!cl) return;
    openModal("Edit client", clientFormHtml(cl), `<button class="btn" id="mCancel">Cancel</button><button class="btn primary" id="mSave">Save</button>`);
    wireClientForm(id);
  }
  function clientFormHtml(cl) {
    cl = cl || {};
    return `<form id="clientForm" class="form-grid">
      <div class="form-group"><label>Name *</label><input name="name" required value="${esc(cl.name||"")}"></div>
      <div class="form-group"><label>Contact</label><input name="contact" value="${esc(cl.contact||"")}"></div>
      <div class="form-group"><label>Email</label><input type="email" name="email" value="${esc(cl.email||"")}"></div>
      <div class="form-group"><label>Phone</label><input name="phone" value="${esc(cl.phone||"")}"></div>
      <div class="form-group"><label>Country</label><input name="country" value="${esc(cl.country||"")}"></div>
      <div class="form-group"><label>Tax ID</label><input name="taxId" value="${esc(cl.taxId||"")}"></div>
      <div class="form-group full"><label>Address</label><input name="address" value="${esc(cl.address||"")}"></div>
      <div class="form-group full"><label>Notes</label><textarea name="notes">${esc(cl.notes||"")}</textarea></div>
      ${cl.id ? `<input type="hidden" name="id" value="${cl.id}">` : ""}
    </form>`;
  }
  function wireClientForm(id) {
    $("#mCancel").addEventListener("click", closeModal);
    $("#mSave").addEventListener("click", () => {
      const fd = new FormData($("#clientForm"));
      const data = Object.fromEntries(fd.entries());
      if (id) data.id = id;
      const r = D.upsertClient(data);
      if (!r.ok) { toast(Object.values(r.errors).join(" "), "error"); return; }
      closeModal();
      toast(id ? "Client updated" : "Client created");
      if (state.view === "clients") renderClients($("#content"));
    });
  }

  // ---------- Documents ----------
  function printDoc(type, job) {
    const client = job.clientId ? D.getClient(job.clientId) : null;
    const entries = D.getEntries(job.id);
    const charges = D.getCharges(job.id);
    const company = D.getSettings();
    let html = "";
    if (type === "invoice") html = C.buildCommercialInvoice(job, client, entries, company);
    else if (type === "packing") html = C.buildPackingList(job, entries, company);
    else if (type === "do") html = C.buildDeliveryOrder(job, client, company);
    else if (type === "charges") html = C.buildChargeSheet(job, charges, company, D.getSettings().rates, D.getSettings().currency);
    const w = window.open("", "_blank");
    if (!w) { toast("Popup blocked. Allow popups for this site.", "error"); return; }
    const printable = html.replace("</body>", "<button onclick=\"window.print()\" style=\"position:fixed;top:12px;right:12px;padding:8px 12px;background:#000;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px\" class=\"noprint\">Print / Save PDF</button><style>@media print{.noprint{display:none}}</style></body>");
    w.document.write(printable);
    w.document.close();
    w.focus();
  }

  function exportJobCsv(job) {
    const rows = [job];
    const cols = ["ref","clientName","shipper","consignee","mode","type","pol","pod","vessel","blNumber","containerNo","packages","weightKg","volumeCbm","etd","eta","status"];
    const csv = C.toCSV(rows, cols);
    downloadCsv(job.ref + ".csv", csv);
  }
  function exportEntriesCsv(job, entries) {
    const rows = entries.map(e => {
      const r = C.calcDutyLine(e);
      return { hs: e.hs, description: e.description, qty: e.qty, value: e.value, currency: e.currency, dutyRate: e.dutyRate, vatRate: e.vatRate, duty: r.duty, vat: r.vat, total: r.total };
    });
    const cols = ["hs","description","qty","value","currency","dutyRate","vatRate","duty","vat","total"];
    const csv = C.toCSV(rows.length ? rows : [{}], cols);
    downloadCsv(job.ref + "_entries.csv", csv);
  }
  function exportAllJobsCsv() {
    const jobs = D.getJobs();
    const cols = ["ref","clientName","shipper","consignee","mode","type","pol","pod","vessel","blNumber","status","eta"];
    const csv = C.toCSV(jobs, cols);
    downloadCsv("jobs.csv", csv);
  }
  function exportAllClientsCsv() {
    const clients = D.getClients();
    const cols = ["name","contact","email","phone","country","taxId"];
    const csv = C.toCSV(clients, cols);
    downloadCsv("clients.csv", csv);
  }
  function downloadCsv(name, csv) {
    const url = C.csvDownload(name, csv);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("Downloaded " + name);
  }

  // ---------- Command palette ----------
  function openPalette() {
    const bd = $("#paletteBackdrop");
    bd.classList.add("open");
    const input = $("#paletteInput");
    input.value = "";
    renderPalette("");
    input.oninput = () => renderPalette(input.value);
    input.focus();
  }
  function closePalette() { $("#paletteBackdrop").classList.remove("open"); }
  function renderPalette(q) {
    const items = [
      { ico: "⌂", label: "Dashboard", action: () => { state.view="dashboard"; state.params={}; } },
      { ico: "Jobs", label: "Jobs list", action: () => { state.view="jobs"; state.params={}; } },
      { ico: "+", label: "New job", action: () => { state.view="jobs"; state.params={}; newJobModal(); } },
      { ico: "Clients", label: "Clients", action: () => { state.view="clients"; state.params={}; } },
      { ico: "+", label: "New client", action: () => { state.view="clients"; state.params={}; newClientModal(); } },
      { ico: "Reports", label: "Reports", action: () => { state.view="reports"; state.params={}; } },
      { ico: "⚙", label: "Settings", action: () => { state.view="settings"; state.params={}; } },
    ];
    // add jobs
    D.getJobs().forEach(j => {
      items.push({ ico: "→", label: j.ref + " — " + j.clientName, action: () => { state.view="jobs"; state.params={jobId:j.id}; } });
    });
    const ql = q.toLowerCase();
    const filtered = ql ? items.filter(i => i.label.toLowerCase().includes(ql)) : items;
    const list = $("#paletteList");
    list.innerHTML = filtered.map((it, i) => `<div class="palette-item ${i===0?"sel":""}" data-i="${i}"><span class="pi-ico">${it.ico}</span>${esc(it.label)}</div>`).join("");
    list.querySelectorAll(".palette-item").forEach((el, i) => {
      el.addEventListener("click", () => { filtered[i].action(); closePalette(); renderView(); updateNav(); });
    });
  }
  $("#paletteBackdrop") && $("#paletteBackdrop").addEventListener("click", e => { if (e.target.id === "paletteBackdrop") closePalette(); });

  // ---------- Keyboard ----------
  function globalKeys(e) {
    if (e.key === "Escape") { closeModal(); closePalette(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); return; }
    if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      e.preventDefault();
      const gs = $("#globalSearch"); if (gs) gs.focus();
    }
    if (e.key === "n" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      // context new
      if (state.view === "clients") newClientModal();
      else newJobModal();
    }
  }

  // ---------- New button ----------
  function handleNew() {
    if (state.view === "clients") newClientModal();
    else newJobModal();
  }

  // ---------- Helpers ----------
  function emptyState(title, sub) {
    return `<div class="empty"><div class="empty-ico">∅</div><div class="empty-title">${esc(title)}</div><div>${esc(sub)}</div></div>`;
  }

  // ---------- Boot ----------
  function boot() {
    // seed
    try { D.seedIfEmpty(); } catch (e) { console.error(e); }
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
    // modal backdrop etc appended by renderApp; ensure toast wrap exists for auth? renderAuth doesn't have toast wrap. Add minimal.
    if (D.currentUser()) renderApp();
    else renderAuth("signin");
  }

  // Wait for DOM
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
