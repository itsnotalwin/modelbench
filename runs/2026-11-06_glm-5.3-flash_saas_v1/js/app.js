/* ClearLink — clearing & freight operations desk.
   Vanilla JS SPA. Persists to localStorage; works from file:// or any static host. */
(function () {
  'use strict';
  var CORE = window.CDCore;
  var SEED = window.CDSeed;
  var esc = CORE.esc;

  /* ================= storage (every access guarded) ================= */
  var K = { USERS: 'clearlink.users.v1', DATA: 'clearlink.data.v1', SESSION: 'clearlink.session.v1' };
  var storageOK = true;
  function lsGet(key, fb) {
    try { var raw = localStorage.getItem(key); return raw == null ? fb : JSON.parse(raw); }
    catch (e) { return fb; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { storageOK = false; return false; }
  }
  function lsDel(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } }

  /* ================= helpers ================= */
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function uid(p) { return (p || 'x') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }
  function num(v, fb) { return CORE.num(v, fb); }
  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
  function today() { return CORE.todayISO(); }
  function money(n) { return CORE.fmtMoney(n, state.db ? state.db.settings.currency : 'ZAR'); }
  function fdate(iso) { return CORE.fmtDate(iso); }
  function fdt(iso) { return CORE.fmtDateTime(iso); }
  function pct(r) { return (num(r) * 100).toFixed(r && r * 100 % 1 ? 1 : 0) + '%'; }
  function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0] || null; }
  function clientName(id) { var c = byId(state.db.clients, id); return c ? c.name : '\u2014'; }

  var BADGE = {
    draft: 'badge muted', docs_pending: 'badge', lodged: 'badge', assessed: 'badge',
    duty_paid: 'badge solid', released: 'badge solid', delivered: 'badge solid',
    closed: 'badge muted', query: 'badge dark', cancelled: 'badge muted'
  };
  function statusBadge(id) { return '<span class="' + (BADGE[id] || 'badge') + ' dot">' + esc(CORE.statusLabel(id)) + '</span>'; }

  function toast(msg, err) {
    var box = $('#toasts'); if (!box) return;
    var t = document.createElement('div');
    t.className = 'toast' + (err ? ' err' : '');
    t.setAttribute('role', 'status');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, err ? 5200 : 3400);
  }

  /* ================= state ================= */
  var state = {
    users: [], session: null, db: null,
    route: { name: 'dashboard', id: null },
    authTab: 'signin', authErr: '',
    modal: null,          // {type, data, errs}
    f: {                  // per-view filters
      entries: { q: '', status: '', client: '', mode: '', sort: 'ref', dir: 1 },
      clients: { q: '' },
      tariff: { q: '' },
      quotes: { q: '', status: '' }
    }
  };

  function save() { return lsSet(K.DATA, state.db); }

  function loadData() {
    var db = lsGet(K.DATA, null);
    if (!db || !db.entries) {
      db = SEED.build(today());
      state.db = db;   // assign before save(): save() serialises state.db
      save();
    } else {
      state.db = db;
    }
  }

  function totalsFor(entry, asOf) {
    return CORE.computeTotals(entry, state.db.settings, state.db.tariff, asOf || today());
  }

  function logEvent(entry, text) {
    entry.timeline = entry.timeline || [];
    entry.timeline.push({ ts: new Date().toISOString(), text: text, by: state.session ? state.session.name : 'system' });
  }

  /* ================= auth ================= */
  function findUser(email) {
    return state.users.filter(function (u) { return u.email.toLowerCase() === String(email || '').toLowerCase(); })[0] || null;
  }
  function signIn(email, password) {
    var u = findUser(email);
    if (!u || u.hash !== CORE.hashPassword(u.salt, password)) return 'Invalid email or password.';
    state.session = u; lsSet(K.SESSION, u.id); return '';
  }
  function signUp(name, email, password) {
    if (!String(name || '').trim()) return 'Your name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim())) return 'Enter a valid email address.';
    if (findUser(email)) return 'An account with that email already exists.';
    if (!password || password.length < 8) return 'Password must be at least 8 characters.';
    var u = {
      id: uid('u'), name: String(name).trim(), email: String(email).trim().toLowerCase(),
      salt: uid('s'), hash: CORE.hashPassword(uid('s'), password), createdAt: new Date().toISOString()
    };
    u.hash = CORE.hashPassword(u.salt, password);
    state.users.push(u); lsSet(K.USERS, state.users);
    state.session = u; lsSet(K.SESSION, u.id); return '';
  }
  function signOut() { state.session = null; lsDel(K.SESSION); state.modal = null; go('dashboard'); render(); }

  /* ================= refs ================= */
  function nextRef(prefix, key) {
    state.db.seq[key] = (state.db.seq[key] || 0) + 1;
    return prefix + pad(state.db.seq[key], 4);
  }

  /* ================= routing ================= */
  var ROUTES = ['dashboard', 'entries', 'entry', 'clients', 'tariff', 'quotes', 'settings'];
  function go(name, id) {
    location.hash = '#/' + name + (id ? '/' + id : '');
  }
  function routeFromHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/');
    var name = ROUTES.indexOf(parts[0]) !== -1 ? parts[0] : 'dashboard';
    return { name: name, id: parts[1] || null };
  }

  /* ================= documents & downloads ================= */
  function printDoc(html) {
    try {
      var f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true');
      f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      document.body.appendChild(f);
      f.onload = function () {
        try { f.contentWindow.focus(); f.contentWindow.print(); }
        catch (e) { toast('Could not open the print dialog.', true); }
        setTimeout(function () { f.remove(); }, 1200);
      };
      f.srcdoc = html;
    } catch (e) {
      toast('Printing is not available here.', true);
    }
  }
  function download(name, text, mime) {
    try {
      var blob = new Blob([text], { type: mime || 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      toast('Downloaded ' + name);
    } catch (e) { toast('Download failed in this browser.', true); }
  }

  /* ================= layout ================= */
  function brandHTML(light) {
    return '<div class="brand"><div class="brand-mark">CL</div><div><div class="brand-name">ClearLink</div>' +
      '<div class="brand-sub">Clearing desk</div></div></div>';
  }

  function navItem(route, label, count) {
    return '<button class="nav-item' + (state.route.name === route || (route === 'entries' && state.route.name === 'entry') ? ' active' : '') +
      '" data-action="nav" data-route="' + route + '">' + label +
      (count != null ? '<span class="count">' + count + '</span>' : '') + '</button>';
  }

  function shell(content) {
    var db = state.db;
    var active = db.entries.filter(function (e) { return ['closed', 'cancelled'].indexOf(e.status) === -1; }).length;
    var openInv = db.entries.filter(function (e) { return e.invoice && !e.invoice.paid; }).length;
    var u = state.session;
    var initials = (u.name || '?').split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
    return '<nav class="sidebar" aria-label="Primary">' +
      brandHTML() +
      '<div class="nav">' +
      navItem('dashboard', 'Dashboard') +
      navItem('entries', 'Consignments', active) +
      navItem('clients', 'Clients', db.clients.length) +
      navItem('tariff', 'Tariff', db.tariff.length) +
      navItem('quotes', 'Quotations', db.quotes.filter(function (q) { return q.status === 'sent'; }).length) +
      navItem('settings', 'Settings') +
      '</div>' +
      '<div class="sidebar-foot">Shortcuts<br><span class="k">/</span> search &nbsp; <span class="k">N</span> new &nbsp; <span class="k">Esc</span> close</div>' +
      '</nav>' +
      '<div class="main">' +
      (storageOK ? '' : '<div class="storage-banner">Storage is blocked in this browser profile \u2014 changes will be lost when the tab closes.</div>') +
      '<header class="topbar"><div class="page-title">' + pageTitle() + '</div><div class="topbar-spacer"></div>' +
      '<div class="search-wrap"><input id="gSearch" type="search" placeholder="Search consignments\u2026" aria-label="Search consignments by reference, client, BL or container">' +
      '<span class="search-kbd">/</span></div>' +
      '<div class="user-chip"><div class="avatar" aria-hidden="true">' + esc(initials) + '</div>' +
      '<div class="user-meta"><div class="n">' + esc(u.name) + '</div><div class="e">' + esc(u.email) + '</div></div>' +
      '<button class="btn ghost sm" data-action="logout">Sign out</button></div>' +
      '</header>' +
      '<div class="content">' + content + '</div>' +
      '</div>' + modalHTML();
  }

  function pageTitle() {
    switch (state.route.name) {
      case 'dashboard': return 'Dashboard';
      case 'entries': return 'Consignments';
      case 'entry': {
        var e = state.db && state.route.id ? byId(state.db.entries, state.route.id) : null;
        return e ? 'Consignment ' + e.ref : 'Consignment not found';
      }
      case 'clients': return 'Clients';
      case 'tariff': return 'Tariff schedule';
      case 'quotes': return 'Quotations';
      case 'settings': return 'Settings';
      default: return '';
    }
  }

  /* ================= auth view ================= */
  function authView() {
    var sign = state.authTab === 'signin';
    var err = state.authErr ? '<div class="auth-err" role="alert">' + esc(state.authErr) + '</div>' : '';
    return '<div class="auth-wrap">' +
      '<div class="auth-side">' + brandHTML() +
      '<h1>Run every consignment from arrival to invoice.</h1>' +
      '<p class="lead">ClearLink is the operations desk for customs clearing agents: landed-cost and duty calculation against your tariff schedule, a guarded clearance workflow, demurrage exposure tracking, and declaration, invoice and quotation documents you can issue the same day.</p>' +
      '<ul class="auth-feats">' +
      '<li><span class="tick">\u2713</span><span><b>Landed cost you can defend.</b> HS-coded duty, excise and import VAT per line, at the exchange rate captured on arrival.</span></li>' +
      '<li><span class="tick">\u2713</span><span><b>A workflow with teeth.</b> Nothing lodges without its documents; nothing closes before the client invoice exists.</span></li>' +
      '<li><span class="tick">\u2713</span><span><b>Demurrage before it hurts.</b> Free days and tiered storage accrue automatically against every shipment in the yard.</span></li>' +
      '<li><span class="tick">\u2713</span><span><b>Documents, not spreadsheets.</b> Print-ready bills of entry, tax invoices and quotations, plus CSV exports for your ledger.</span></li>' +
      '</ul></div>' +
      '<div class="auth-main"><div class="auth-card">' +
      '<h2>' + (sign ? 'Sign in' : 'Create your account') + '</h2>' +
      '<p class="sub">' + (sign ? 'Welcome back. Your workspace is waiting.' : 'Join the desk and start clearing.') + '</p>' +
      '<div class="auth-tabs" role="tablist"><button type="button" class="' + (sign ? 'active' : '') + '" data-action="authTab" data-tab="signin" role="tab" aria-selected="' + sign + '">Sign in</button>' +
      '<button type="button" class="' + (!sign ? 'active' : '') + '" data-action="authTab" data-tab="signup" role="tab" aria-selected="' + !sign + '">Create account</button></div>' +
      err +
      (sign
        ? '<form data-form="signin"><div class="field"><label for="ai_email">Email</label><input id="ai_email" type="email" autocomplete="email" required></div>' +
          '<div class="field"><label for="ai_pass">Password</label><input id="ai_pass" type="password" autocomplete="current-password" required></div>' +
          '<div class="form-foot" style="border:0;padding-top:8px"><button class="btn primary" type="submit">Sign in</button></div></form>'
        : '<form data-form="signup"><div class="field"><label for="au_name">Full name</label><input id="au_name" type="text" autocomplete="name" required></div>' +
          '<div class="field"><label for="au_email">Work email</label><input id="au_email" type="email" autocomplete="email" required></div>' +
          '<div class="field"><label for="au_pass">Password</label><input id="au_pass" type="password" autocomplete="new-password" required minlength="8">' +
          '<div class="hint">At least 8 characters.</div></div>' +
          '<div class="form-foot" style="border:0;padding-top:8px"><button class="btn primary" type="submit">Create account</button></div></form>') +
      '<div class="demo-box"><b>Try the demo desk</b><br><span class="mono">demo@clearlink.co.za / demo1234</span><br>' +
      '<button type="button" class="btn primary sm" style="margin-top:8px" data-action="demoLogin">Use demo account</button></div>' +
      '</div></div></div>';
  }

  /* ================= dashboard ================= */
  function dashboardView() {
    var db = state.db, T = today();
    var entries = db.entries;
    var active = entries.filter(function (e) { return ['closed', 'cancelled'].indexOf(e.status) === -1; });
    var lodged = entries.filter(function (e) { return e.status === 'lodged'; });
    var govOut = 0, dmExp = 0, invOut = 0, thisMonth = 0;
    var monthPrefix = T.slice(0, 7);
    entries.forEach(function (e) {
      var t = totalsFor(e, T);
      if (['cancelled', 'draft', 'docs_pending'].indexOf(e.status) === -1) govOut += t.govOutstanding;
      if (t.demurrage.accruing) dmExp += t.demurrage.cost;
      if (e.invoice && !e.invoice.paid) invOut += num(e.invoice.total);
      if ((e.arrivalDate || '').slice(0, 7) === monthPrefix) thisMonth++;
    });
    function kpi(lbl, val, sub) {
      return '<div class="kpi"><div class="lbl">' + lbl + '</div><div class="val">' + val + '</div><div class="sub">' + sub + '</div></div>';
    }
    var kpis = '<div class="kpis">' +
      kpi('Active consignments', active.length, entries.length + ' total on file') +
      kpi('Awaiting assessment', lodged.length, 'lodged with customs') +
      kpi('Duty &amp; VAT outstanding', money(govOut), 'across all open consignments') +
      kpi('Demurrage accruing', money(dmExp), 'storage accruing in the yard') +
      kpi('Client invoices open', money(invOut), db.entries.filter(function (e) { return e.invoice && !e.invoice.paid; }).length + ' unpaid invoices') +
      kpi('Arrivals this month', thisMonth, 'import consignments') +
      '</div>';

    var segs = '', legend = '';
    CORE.STATUSES.forEach(function (s, i) {
      var n = entries.filter(function (e) { return e.status === s.id; }).length;
      if (!n) return;
      segs += '<div class="seg' + (i === 0 ? ' dark' : '') + '" style="width:' + (n / entries.length * 100).toFixed(2) + '%" title="' + esc(s.label) + ': ' + n + '"></div>';
      legend += '<span><span class="sw' + (i === 0 ? ' dark' : '') + '"></span>' + esc(s.label) + ' \u00B7 ' + n + '</span>';
    });
    var pipeline = '<div class="card"><div class="card-h"><h2>Pipeline</h2></div><div class="card-b">' +
      (entries.length ? '<div class="pipeline" role="img" aria-label="Consignment pipeline">' + segs + '</div><div class="legend">' + legend + '</div>'
        : '<div class="empty"><div class="big">No consignments yet</div>Capture your first arrival to see the pipeline.</div>') +
      '</div></div>';

    var accruing = entries.filter(function (e) { return totalsFor(e, T).demurrage.accruing; })
      .map(function (e) { return { e: e, t: totalsFor(e, T) }; })
      .sort(function (a, b) { return b.t.demurrage.days - a.t.demurrage.days; });
    var agingRows = accruing.map(function (r) {
      return '<tr class="rowlink" data-action="viewEntry" data-id="' + r.e.id + '">' +
        '<td class="mono">' + esc(r.e.ref) + '</td><td>' + esc(clientName(r.e.clientId)) + '</td>' +
        '<td>' + fdate(r.e.arrivalDate) + '</td><td class="num">' + r.t.demurrage.days + '</td>' +
        '<td class="num">' + r.t.demurrage.chargeableDays + '</td><td class="num">' + money(r.t.demurrage.cost) + '</td>' +
        '<td>' + statusBadge(r.e.status) + '</td></tr>';
    }).join('');
    var aging = '<div class="card"><div class="card-h"><h2>Demurrage exposure</h2><div class="spacer"></div><span class="legend" style="margin:0">' +
      'accruing yard storage, oldest first</span></div>' +
      (accruing.length
        ? '<div class="card-b flush tbl-wrap"><table><thead><tr><th>Ref</th><th>Client</th><th>Arrival</th><th class="num">Days in yard</th><th class="num">Billable</th><th class="num">Accrued</th><th>Status</th></tr></thead><tbody>' + agingRows + '</tbody></table></div>'
        : '<div class="empty"><div class="big">Nothing accruing</div>Every consignment is inside its free period or released.</div>') +
      '</div>';

    var events = [];
    entries.forEach(function (e) { (e.timeline || []).forEach(function (ev) { events.push({ ev: ev, ref: e.ref, id: e.id }); }); });
    events.sort(function (a, b) { return String(b.ev.ts).localeCompare(String(a.ev.ts)); });
    var feed = events.slice(0, 10).map(function (x) {
      return '<li><span class="t">' + fdt(x.ev.ts) + '</span><span><a href="#/entry/' + x.id + '" class="mono">' + esc(x.ref) + '</a> \u2014 ' + esc(x.ev.text) + '</span></li>';
    }).join('');
    var activity = '<div class="card"><div class="card-h"><h2>Recent activity</h2></div><div class="card-b">' +
      (feed ? '<ul class="timeline">' + feed + '</ul>' : '<div class="empty">No activity recorded yet.</div>') + '</div></div>';

    return kpis + '<div class="two-col"><div>' + pipeline + aging + '</div><div>' + activity + '</div></div>';
  }

  /* ================= entries list ================= */
  function filteredEntries() {
    var f = state.f.entries;
    var q = f.q.trim().toLowerCase();
    var list = state.db.entries.filter(function (e) {
      if (f.status && e.status !== f.status) return false;
      if (f.client && e.clientId !== f.client) return false;
      if (f.mode && e.mode !== f.mode) return false;
      if (q) {
        var hay = [e.ref, e.blNo, e.containerNo, e.vessel, clientName(e.clientId), e.pod, e.originCountry]
          .join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    var dir = f.dir;
    list.sort(function (a, b) {
      var va, vb;
      if (f.sort === 'arrival') { va = a.arrivalDate || ''; vb = b.arrivalDate || ''; }
      else if (f.sort === 'gov') { va = totalsFor(a).govTotal; vb = totalsFor(b).govTotal; }
      else if (f.sort === 'total') { va = totalsFor(a).total; vb = totalsFor(b).total; }
      else if (f.sort === 'status') { va = a.status; vb = b.status; }
      else { va = a.ref; vb = b.ref; }
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
    return list;
  }

  function entriesResultsHTML() {
    var list = filteredEntries();
    if (!list.length) {
      var anyAtAll = state.db.entries.length > 0;
      return '<div class="empty"><div class="big">' + (anyAtAll ? 'Nothing matches those filters' : 'No consignments yet') + '</div>' +
        (anyAtAll ? 'Try clearing the search or filters.' : 'Capture your first arrival to start the clearance workflow.') +
        '<div><button class="btn primary" data-action="newEntry">+ New consignment</button></div></div>';
    }
    var rows = list.map(function (e) {
      var t = totalsFor(e);
      return '<tr class="rowlink" data-action="viewEntry" data-id="' + esc(e.id) + '">' +
        '<td class="mono">' + esc(e.ref) + '</td>' +
        '<td>' + esc(clientName(e.clientId)) + '</td>' +
        '<td>' + esc((e.mode || '').toUpperCase()) + (e.containerSize ? ' \u00B7 ' + esc(e.containerSize) : '') + '</td>' +
        '<td>' + fdate(e.arrivalDate) + '</td>' +
        '<td>' + esc(e.pod || '\u2014') + '</td>' +
        '<td>' + statusBadge(e.status) + '</td>' +
        '<td class="num">' + money(t.govTotal) + '</td>' +
        '<td class="num">' + money(t.total) + '</td>' +
        '<td class="num">' + (t.demurrage.accruing ? '<span title="Demurrage accruing">' + money(t.demurrage.cost) + '</span>' : '\u2014') + '</td>' +
        '</tr>';
    }).join('');
    return '<div class="tbl-wrap"><table><thead><tr>' +
      '<th class="sortable" data-action="sortEntries" data-sort="ref">Ref <span class="dir">' + (state.f.entries.sort === 'ref' ? (state.f.entries.dir > 0 ? '\u25B2' : '\u25BC') : '') + '</span></th>' +
      '<th>Client</th><th>Mode</th>' +
      '<th class="sortable" data-action="sortEntries" data-sort="arrival">Arrival <span class="dir">' + (state.f.entries.sort === 'arrival' ? (state.f.entries.dir > 0 ? '\u25B2' : '\u25BC') : '') + '</span></th>' +
      '<th>Discharge</th><th>Status</th>' +
      '<th class="sortable num" data-action="sortEntries" data-sort="gov">Gov charges <span class="dir">' + (state.f.entries.sort === 'gov' ? (state.f.entries.dir > 0 ? '\u25B2' : '\u25BC') : '') + '</span></th>' +
      '<th class="sortable num" data-action="sortEntries" data-sort="total">Landed total <span class="dir">' + (state.f.entries.sort === 'total' ? (state.f.entries.dir > 0 ? '\u25B2' : '\u25BC') : '') + '</span></th>' +
      '<th class="num">Demurrage</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="result-count" style="padding:9px 16px;color:var(--mut);font-size:11.5px">' + list.length + ' consignment' + (list.length > 1 ? 's' : '') + '</div>';
  }

  function entriesView() {
    var f = state.f.entries;
    var clientOpts = '<option value="">All clients</option>' + state.db.clients.map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (f.client === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
    var statusOpts = '<option value="">All statuses</option>' + CORE.STATUSES.map(function (s) {
      return '<option value="' + s.id + '"' + (f.status === s.id ? ' selected' : '') + '>' + esc(s.label) + '</option>';
    }).join('');
    return '<div class="card"><div class="card-h"><h2>Consignments</h2><div class="spacer"></div>' +
      '<button class="btn primary" data-action="newEntry">+ New consignment</button>' +
      '<button class="btn ghost" data-action="exportEntries" title="Export the filtered list as CSV">Export CSV</button></div>' +
      '<div class="filters">' +
      '<input id="eSearch" type="search" placeholder="Search ref, client, BL, container\u2026" value="' + esc(f.q) + '" aria-label="Search consignments">' +
      '<select data-change="entryFilter" data-k="status" aria-label="Filter by status">' + statusOpts + '</select>' +
      '<select data-change="entryFilter" data-k="client" aria-label="Filter by client">' + clientOpts + '</select>' +
      '<select data-change="entryFilter" data-k="mode" aria-label="Filter by mode">' +
      '<option value="">All modes</option><option value="sea"' + (f.mode === 'sea' ? ' selected' : '') + '>Sea</option>' +
      '<option value="air"' + (f.mode === 'air' ? ' selected' : '') + '>Air</option></select>' +
      '<span class="result-count" id="entriesCount">' + filteredEntries().length + ' shown</span>' +
      '</div>' +
      '<div id="entriesResults">' + entriesResultsHTML() + '</div>' +
      '</div>';
  }

  /* ================= entry detail ================= */
  function chargesRows(t) {
    var cur = function (n) { return money(n); };
    var h = '<table class="charges"><tbody>';
    h += '<tr><td>Customs value (CIF \u00B7 ' + CORE.fmtMoney(t.cifUsd, 'USD') + ' @ ' + t.rate.toFixed(4) + ')</td><td class="num">' + cur(t.customsValueZar) + '</td></tr>';
    h += '<tr class="grp"><td colspan="2">Government charges</td></tr>';
    h += '<tr><td>Import duty</td><td class="num">' + cur(t.duty) + '</td></tr>';
    h += '<tr><td>Excise duty</td><td class="num">' + cur(t.excise) + '</td></tr>';
    h += '<tr><td>Import VAT</td><td class="num">' + cur(t.vat) + '</td></tr>';
    h += '<tr><td><b>Subtotal</b></td><td class="num"><b>' + cur(t.govTotal) + '</b></td></tr>';
    h += '<tr class="grp"><td colspan="2">Port storage / demurrage \u2014 ' + t.demurrage.days + ' day' + (t.demurrage.days === 1 ? '' : 's') +
      ' in yard, ' + t.demurrage.freeDays + ' free, ' + t.demurrage.chargeableDays + ' billable' +
      (t.demurrage.accruing ? ' (still accruing)' : '') + '</td></tr>';
    if (!t.demurrage.chargeableDays) {
      h += '<tr><td>Within free period</td><td class="num">' + cur(0) + '</td></tr>';
    } else {
      t.demurrage.breakdown.forEach(function (b) {
        h += '<tr><td>Day ' + b.from + (b.to > b.from ? '\u2013' + b.to : '') + ' @ ' + money(b.perDay) + '/day</td><td class="num">' + cur(b.amount) + '</td></tr>';
      });
      h += '<tr><td><b>Subtotal</b></td><td class="num"><b>' + cur(t.demurrage.cost) + '</b></td></tr>';
    }
    h += '<tr class="grp"><td colspan="2">Clearing fees</td></tr>';
    t.fees.lines.forEach(function (l) {
      h += '<tr><td>' + esc(l.desc) + '</td><td class="num">' + cur(l.amount) + '</td></tr>';
    });
    h += '<tr><td><b>Subtotal</b></td><td class="num"><b>' + cur(t.fees.total) + '</b></td></tr>';
    if (t.transportZar > 0) h += '<tr><td>Road transport / delivery</td><td class="num">' + cur(t.transportZar) + '</td></tr>';
    h += '<tr class="tot"><td>Total landed cost</td><td class="num">' + cur(t.total) + '</td></tr>';
    h += '</tbody></table>';
    return h;
  }

  function statusActionsHTML(e) {
    var t = totalsFor(e);
    var ctx = { totals: t, currency: state.db.settings.currency };
    var targets;
    if (e.status === 'query') {
      targets = [e.queryFrom || 'docs_pending', 'cancelled'];
    } else {
      targets = (CORE.TRANSITIONS[e.status] || []).slice();
    }
    var btns = targets.map(function (to) {
      var res = CORE.canTransition(e, to, ctx);
      var label = to === (e.queryFrom || 'docs_pending') && e.status === 'query'
        ? 'Return to ' + CORE.statusLabel(to) : '\u2192 ' + CORE.statusLabel(to);
      return '<button class="btn ' + (res.ok ? '' : 'ghost') + '" data-action="setStatus" data-to="' + to + '"' +
        (res.ok ? '' : ' disabled title="' + esc(res.reason) + '"') + '>' + label + '</button>';
    }).join('');
    return '<div class="status-actions">' + btns + '</div>';
  }

  function docChecklistHTML(e) {
    var all = CORE.REQUIRED_DOCS.concat(CORE.OPTIONAL_DOCS);
    return all.map(function (d) {
      return '<label class="doc-check"><input type="checkbox" data-change="docToggle" data-key="' + d.key + '"' +
        (e.docs && e.docs[d.key] ? ' checked' : '') + '> <span>' + esc(d.label) + '</span>' +
        (CORE.REQUIRED_DOCS.indexOf(d) !== -1 ? '<span class="req">required to lodge</span>' : '<span class="req">optional</span>') +
        '</label>';
    }).join('');
  }

  function paymentsHTML(e, t) {
    var rows = (e.payments || []).map(function (p, i) {
      return '<li><span class="t">' + fdate(p.date) + '</span><span>' + money(p.amount) + ' \u00B7 ' +
        esc(p.method || 'eft').toUpperCase() + ' \u00B7 <span class="mono">' + esc(p.ref || '') + '</span></span></li>';
    }).join('');
    var pctPaid = t.govTotal > 0 ? Math.min(100, t.govPaid / t.govTotal * 100) : 100;
    return '<div class="card"><div class="card-h"><h2>Duty &amp; VAT payments</h2><div class="spacer"></div>' +
      '<button class="btn ghost sm" data-action="addPayment">+ Record payment</button></div><div class="card-b">' +
      '<div class="coverage" role="progressbar" aria-valuenow="' + Math.round(pctPaid) + '" aria-valuemin="0" aria-valuemax="100" aria-label="Duty payment coverage">' +
      '<div class="fill" style="width:' + pctPaid.toFixed(1) + '%"></div></div>' +
      '<div class="coverage-lbl">' + money(t.govPaid) + ' of ' + money(t.govTotal) + ' government charges covered' +
      (t.govOutstanding > 0 ? ' \u00B7 ' + money(t.govOutstanding) + ' outstanding' : ' \u00B7 fully covered') + '</div>' +
      ((e.payments || []).length ? '<ul class="timeline" style="margin-top:10px">' + rows + '</ul>'
        : '<p class="coverage-lbl" style="margin-top:8px">No payments recorded yet.</p>') +
      '</div></div>';
  }

  function invoiceHTML(e, t) {
    var db = state.db;
    var client = byId(db.clients, e.clientId);
    if (e.invoice) {
      var inv = e.invoice;
      return '<div class="card"><div class="card-h"><h2>Client invoice</h2><div class="spacer"></div>' +
        '<span class="badge ' + (inv.paid ? 'solid' : 'dark') + ' dot">' + (inv.paid ? 'Paid' : 'Open') + '</span></div><div class="card-b">' +
        '<dl class="kv" style="margin-bottom:10px">' +
        '<dt>Invoice no</dt><dd class="mono">' + esc(inv.no) + '</dd>' +
        '<dt>Date</dt><dd>' + fdate(inv.date) + '</dd>' +
        '<dt>Client</dt><dd>' + esc(clientName(e.clientId)) + '</dd>' +
        '<dt>Total</dt><dd>' + money(inv.total) + '</dd></dl>' +
        '<div class="btn-row">' +
        '<button class="btn" data-action="printInv">Print invoice</button>' +
        '<button class="btn ghost" data-action="invoicePaid">' + (inv.paid ? 'Mark unpaid' : 'Mark paid') + '</button>' +
        '</div></div></div>';
    }
    var canGen = ['released', 'delivered'].indexOf(e.status) !== -1;
    return '<div class="card"><div class="card-h"><h2>Client invoice</h2></div><div class="card-b">' +
      (canGen
        ? '<p class="coverage-lbl">Cargo is released \u2014 issue the tax invoice recharging government charges, demurrage and fees at cost.</p>' +
          '<div class="btn-row" style="margin-top:10px"><button class="btn primary" data-action="genInvoice">Generate invoice</button></div>'
        : '<p class="coverage-lbl">The invoice can be generated once customs releases the cargo.</p>') +
      '</div></div>';
  }

  function entryDetailView(id) {
    var e = byId(state.db.entries, id);
    if (!e) return '<div class="empty"><div class="big">Consignment not found</div><a class="btn ghost" href="#/entries">Back to consignments</a></div>';
    var client = byId(state.db.clients, e.clientId);
    var t = totalsFor(e);
    var docs = CORE.docsComplete(e);

    var itemsRows = t.lines.map(function (ln, i) {
      return '<tr><td class="mono">' + esc(ln.hsCode) + (ln.unknown ? ' <span class="badge muted" title="Not in tariff schedule">?</span>' : '') + '</td>' +
        '<td>' + esc(ln.description || '\u2014') + '</td>' +
        '<td class="num">' + ln.qty + ' ' + esc(ln.unit || '') + '</td>' +
        '<td class="num">' + CORE.fmtMoney(ln.unitValueUsd, 'USD') + '</td>' +
        '<td class="num">' + CORE.fmtMoney(ln.fobUsd, 'USD') + '</td>' +
        '<td class="num">' + money(ln.cifZar) + '</td>' +
        '<td class="num">' + pct(ln.dutyRate) + '</td>' +
        '<td class="num">' + money(ln.duty) + '</td>' +
        '<td class="num">' + money(ln.vat) + '</td></tr>';
    }).join('');

    var timeline = (e.timeline || []).slice().sort(function (a, b) { return String(b.ts).localeCompare(String(a.ts)); })
      .map(function (ev) { return '<li><span class="t">' + fdt(ev.ts) + '</span><span>' + esc(ev.text) + '</span></li>'; }).join('');

    var head = '<div class="detail-head"><a class="backlink" href="#/entries">\u2190 Consignments</a>' +
      '<h1>' + esc(e.ref) + '</h1>' + statusBadge(e.status) +
      (e.queryFrom ? '<span class="badge muted">from ' + esc(CORE.statusLabel(e.queryFrom)) + '</span>' : '') +
      '<div class="spacer" style="flex:1"></div>' +
      '<div class="btn-row">' +
      '<button class="btn ghost" data-action="editEntry" data-id="' + esc(e.id) + '">Edit</button>' +
      '<button class="btn ghost" data-action="printDecl">Print declaration</button>' +
      '<button class="btn ghost" data-action="deleteEntry" data-id="' + esc(e.id) + '">Delete</button>' +
      '</div></div>' + statusActionsHTML(e);

    var left =
      '<div class="card"><div class="card-h"><h2>Shipment</h2></div><div class="card-b"><dl class="kv">' +
      '<dt>Importer</dt><dd>' + esc(clientName(e.clientId)) + '</dd>' +
      '<dt>Assignee</dt><dd>' + esc(e.assignee || '\u2014') + '</dd>' +
      '<dt>Mode</dt><dd>' + esc((e.mode || 'sea').toUpperCase()) + (e.containerSize ? ' \u00B7 ' + esc(e.containerSize) : '') + (e.grossKg ? ' \u00B7 ' + e.grossKg + ' kg' : '') + '</dd>' +
      '<dt>Route</dt><dd>' + esc(e.originCountry || '\u2014') + ' \u00B7 ' + esc(e.pol || '\u2014') + ' \u2192 ' + esc(e.pod || '\u2014') + '</dd>' +
      '<dt>Vessel / flight</dt><dd>' + esc(e.vessel || '\u2014') + '</dd>' +
      '<dt>Bill of lading</dt><dd class="mono">' + esc(e.blNo || '\u2014') + '</dd>' +
      '<dt>Container</dt><dd class="mono">' + esc(e.containerNo || '\u2014') + '</dd>' +
      '<dt>Arrival</dt><dd>' + fdate(e.arrivalDate) + '</dd>' +
      '<dt>FX rate</dt><dd>USD \u2192 ' + esc(state.db.settings.currency) + ' @ ' + num(e.exchangeRate).toFixed(4) + '</dd>' +
      '<dt>Released</dt><dd>' + (e.releasedDate ? fdate(e.releasedDate) : '\u2014') + '</dd>' +
      '<dt>Delivered</dt><dd>' + (e.deliveredDate ? fdate(e.deliveredDate) : '\u2014') + '</dd>' +
      '</dl>' + (e.notes ? '<p style="margin-top:12px;font-size:12.5px;color:var(--ink-3)">' + esc(e.notes) + '</p>' : '') + '</div></div>' +

      '<div class="card"><div class="card-h"><h2>Cargo items &amp; assessment</h2></div>' +
      (t.lines.length
        ? '<div class="card-b flush tbl-wrap"><table><thead><tr><th>HS code</th><th>Description</th><th class="num">Qty</th><th class="num">Unit value</th><th class="num">FOB USD</th><th class="num">Customs value</th><th class="num">Duty %</th><th class="num">Duty</th><th class="num">VAT</th></tr></thead><tbody>' +
          itemsRows + '</tbody>' +
          '<tfoot><tr><td colspan="5">FOB ' + CORE.fmtMoney(t.fobUsd, 'USD') + ' \u00B7 Freight ' + CORE.fmtMoney(t.freightUsd, 'USD') +
          ' \u00B7 Insurance ' + CORE.fmtMoney(t.insuranceUsd, 'USD') + '</td><td class="num">' + money(t.customsValueZar) + '</td><td></td><td class="num">' + money(t.duty) + '</td><td class="num">' + money(t.vat) + '</td></tr></tfoot></table></div>'
        : '<div class="empty">No cargo items yet \u2014 edit the consignment to add them.</div>') +
      '</div>' +

      '<div class="card"><div class="card-h"><h2>Landed cost breakdown</h2></div><div class="card-b flush">' + chargesRows(t) + '</div></div>';

    var right =
      '<div class="card"><div class="card-h"><h2>Document checklist</h2>' +
      '<span class="badge ' + (docs.ok ? 'solid' : 'dark') + ' dot">' + (docs.ok ? 'Ready to lodge' : docs.missing.length + ' missing') + '</span></div>' +
      '<div class="card-b">' + docChecklistHTML(e) + '</div></div>' +
      paymentsHTML(e, t) +
      invoiceHTML(e, t) +
      '<div class="card"><div class="card-h"><h2>Timeline</h2></div><div class="card-b">' +
      (timeline ? '<ul class="timeline">' + timeline + '</ul>' : '<div class="empty">No events yet.</div>') + '</div></div>';

    return head + '<div class="two-col"><div>' + left + '</div><div>' + right + '</div></div>';
  }

  /* ================= clients ================= */
  function clientsResultsHTML() {
    var f = state.f.clients;
    var q = f.q.trim().toLowerCase();
    var list = state.db.clients.filter(function (c) {
      if (!q) return true;
      return [c.name, c.contactName, c.email, c.taxNo].join(' ').toLowerCase().indexOf(q) !== -1;
    });
    if (!list.length) {
      return '<div class="empty"><div class="big">' + (state.db.clients.length ? 'Nothing matches that search' : 'No clients yet') + '</div>' +
        (state.db.clients.length ? 'Try a different search.' : 'Add your first importer to start capturing consignments.') +
        '<div><button class="btn primary" data-action="newClient">+ New client</button></div></div>';
    }
    var T = today();
    var rows = list.map(function (c) {
      var ents = state.db.entries.filter(function (e) { return e.clientId === c.id; });
      var open = ents.filter(function (e) { return e.invoice && !e.invoice.paid; })
        .reduce(function (s, e) { return s + num(e.invoice.total); }, 0);
      return '<tr><td><b>' + esc(c.name) + '</b></td>' +
        '<td>' + esc(c.contactName || '\u2014') + '</td>' +
        '<td>' + esc(c.email || '\u2014') + '</td>' +
        '<td class="mono">' + esc(c.taxNo || '\u2014') + '</td>' +
        '<td class="num">' + (c.creditDays || 0) + '</td>' +
        '<td class="num">' + ents.length + '</td>' +
        '<td class="num">' + money(open) + '</td>' +
        '<td><div class="btn-row">' +
        '<button class="btn ghost sm" data-action="clientFilter" data-id="' + esc(c.id) + '">Consignments</button>' +
        '<button class="btn ghost sm" data-action="exportStatement" data-id="' + esc(c.id) + '">Statement</button>' +
        '<button class="btn ghost sm" data-action="editClient" data-id="' + esc(c.id) + '">Edit</button>' +
        '<button class="btn ghost sm" data-action="deleteClient" data-id="' + esc(c.id) + '">Delete</button>' +
        '</div></td></tr>';
    }).join('');
    return '<div class="tbl-wrap"><table><thead><tr><th>Client</th><th>Contact</th><th>Email</th><th>Tax ref</th>' +
      '<th class="num">Credit days</th><th class="num">Consignments</th><th class="num">Open invoices</th><th></th></tr></thead><tbody>' +
      rows + '</tbody></table></div><div class="result-count" style="padding:9px 16px;color:var(--mut);font-size:11.5px">' +
      list.length + ' client' + (list.length > 1 ? 's' : '') + '</div>';
  }

  function clientsView() {
    return '<div class="card"><div class="card-h"><h2>Clients</h2><div class="spacer"></div>' +
      '<button class="btn ghost" data-action="exportInvoices" title="Export all client invoices as CSV">Invoices CSV</button>' +
      '<button class="btn primary" data-action="newClient">+ New client</button></div>' +
      '<div class="filters"><input id="cSearch" type="search" placeholder="Search clients\u2026" value="' + esc(state.f.clients.q) + '" aria-label="Search clients"></div>' +
      '<div id="clientsResults">' + clientsResultsHTML() + '</div></div>';
  }

  /* ================= tariff ================= */
  function tariffResultsHTML() {
    var f = state.f.tariff;
    var q = f.q.trim().toLowerCase();
    var list = state.db.tariff.filter(function (t) {
      if (!q) return true;
      return [t.hsCode, t.description].join(' ').toLowerCase().indexOf(q) !== -1;
    });
    if (!list.length) {
      return '<div class="empty"><div class="big">' + (state.db.tariff.length ? 'No tariff lines match' : 'Tariff schedule is empty') + '</div>' +
        (state.db.tariff.length ? 'Search by HS code or description.' : 'Add HS lines so consignments can be assessed.') +
        '<div><button class="btn primary" data-action="newTariff">+ New tariff line</button></div></div>';
    }
    var rows = list.map(function (t) {
      var used = state.db.entries.some(function (e) { return (e.items || []).some(function (i) { return i.hsCode === t.hsCode; }); });
      return '<tr><td class="mono">' + esc(t.hsCode) + '</td><td>' + esc(t.description) + '</td>' +
        '<td class="num">' + pct(t.dutyRate) + '</td><td class="num">' + pct(t.exciseRate) + '</td>' +
        '<td class="num">' + (t.vatRate != null ? pct(t.vatRate) : pct(state.db.settings.vatRate) + ' <span style="color:var(--mut)">(default)</span>') + '</td>' +
        '<td>' + (used ? '<span class="badge muted">in use</span>' : '') + '</td>' +
        '<td><div class="btn-row">' +
        '<button class="btn ghost sm" data-action="editTariff" data-id="' + esc(t.id) + '">Edit</button>' +
        '<button class="btn ghost sm" data-action="deleteTariff" data-id="' + esc(t.id) + '">Delete</button>' +
        '</div></td></tr>';
    }).join('');
    return '<div class="tbl-wrap"><table><thead><tr><th>HS code</th><th>Description</th><th class="num">Duty</th>' +
      '<th class="num">Excise</th><th class="num">VAT</th><th></th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="result-count" style="padding:9px 16px;color:var(--mut);font-size:11.5px">' + list.length + ' tariff line' + (list.length > 1 ? 's' : '') + '</div>';
  }

  function tariffView() {
    return '<div class="card"><div class="card-h"><h2>Tariff schedule</h2><div class="spacer"></div>' +
      '<button class="btn primary" data-action="newTariff">+ New tariff line</button></div>' +
      '<div class="filters"><input id="tSearch" type="search" placeholder="Search HS code or description\u2026" value="' + esc(state.f.tariff.q) + '" aria-label="Search tariff"></div>' +
      '<div id="tariffResults">' + tariffResultsHTML() + '</div></div>';
  }

  /* ================= quotations ================= */
  function quoteTotals(q) { return CORE.computeTotals(q, state.db.settings, state.db.tariff, today()); }

  function quotesResultsHTML() {
    var f = state.f.quotes;
    var q = f.q.trim().toLowerCase();
    var list = state.db.quotes.filter(function (qt) {
      if (f.status && qt.status !== f.status) return false;
      if (!q) return true;
      return [qt.ref, clientName(qt.clientId)].join(' ').toLowerCase().indexOf(q) !== -1;
    });
    if (!list.length) {
      return '<div class="empty"><div class="big">' + (state.db.quotes.length ? 'Nothing matches those filters' : 'No quotations yet') + '</div>' +
        (state.db.quotes.length ? 'Try clearing the search or status filter.' : 'Build a landed-cost estimate before the goods even ship.') +
        '<div><button class="btn primary" data-action="newQuote">+ New quotation</button></div></div>';
    }
    var rows = list.map(function (qt) {
      var t = quoteTotals(qt);
      var actions = '<div class="btn-row">';
      if (qt.status === 'draft') actions += '<button class="btn sm" data-action="quoteStatus" data-id="' + qt.id + '" data-to="sent">Send</button>';
      if (qt.status === 'sent') {
        actions += '<button class="btn sm" data-action="quoteStatus" data-id="' + qt.id + '" data-to="accepted">Accept</button>' +
          '<button class="btn ghost sm" data-action="quoteStatus" data-id="' + qt.id + '" data-to="declined">Decline</button>';
      }
      if (qt.status === 'accepted') actions += '<button class="btn sm" data-action="convertQuote" data-id="' + qt.id + '">Convert to consignment</button>';
      actions += '<button class="btn ghost sm" data-action="printQt" data-id="' + qt.id + '">Print</button>' +
        '<button class="btn ghost sm" data-action="editQuote" data-id="' + qt.id + '">Edit</button>' +
        '<button class="btn ghost sm" data-action="deleteQuote" data-id="' + qt.id + '">Delete</button></div>';
      var qbadge = { draft: 'badge muted', sent: 'badge', accepted: 'badge solid', declined: 'badge muted', converted: 'badge solid' }[qt.status] || 'badge';
      return '<tr><td class="mono">' + esc(qt.ref) + '</td><td>' + esc(clientName(qt.clientId)) + '</td>' +
        '<td>' + fdate(qt.date) + '</td><td>' + fdate(qt.validUntil) + '</td>' +
        '<td><span class="' + qbadge + ' dot">' + esc(qt.status) + '</span></td>' +
        '<td class="num">' + money(t.total) + '</td><td>' + actions + '</td></tr>';
    }).join('');
    return '<div class="tbl-wrap"><table><thead><tr><th>Ref</th><th>Client</th><th>Date</th><th>Valid until</th><th>Status</th>' +
      '<th class="num">Est. landed total</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="result-count" style="padding:9px 16px;color:var(--mut);font-size:11.5px">' + list.length + ' quotation' + (list.length > 1 ? 's' : '') + '</div>';
  }

  function quotesView() {
    var f = state.f.quotes;
    return '<div class="card"><div class="card-h"><h2>Quotations</h2><div class="spacer"></div>' +
      '<button class="btn primary" data-action="newQuote">+ New quotation</button></div>' +
      '<div class="filters">' +
      '<input id="qSearch" type="search" placeholder="Search quotations\u2026" value="' + esc(f.q) + '" aria-label="Search quotations">' +
      '<select data-change="quoteFilter" data-k="status" aria-label="Filter quotations by status">' +
      '<option value="">All statuses</option>' +
      ['draft', 'sent', 'accepted', 'declined', 'converted'].map(function (s) {
        return '<option value="' + s + '"' + (f.status === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('') + '</select></div>' +
      '<div id="quotesResults">' + quotesResultsHTML() + '</div></div>';
  }

  /* ================= settings ================= */
  function settingsView() {
    var s = state.db.settings;
    var d = s.demurrage;
    var rateRows = state.db.rates.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).map(function (r) {
      return '<tr><td>' + fdate(r.date) + '</td><td class="num">' + num(r.usdZar).toFixed(4) + '</td>' +
        '<td><button class="btn ghost sm" data-action="deleteRate" data-id="' + esc(r.id) + '">Delete</button></td></tr>';
    }).join('');
    return '<div class="two-col"><div>' +
      '<div class="card"><div class="card-h"><h2>Organisation</h2></div><div class="card-b">' +
      '<form data-form="settings"><div class="form-grid">' +
      '<div class="field span2"><label for="st_orgName">Practising name</label><input id="st_orgName" value="' + esc(s.orgName) + '" required></div>' +
      '<div class="field"><label for="st_regNo">Registration no</label><input id="st_regNo" value="' + esc(s.regNo || '') + '"></div>' +
      '<div class="field"><label for="st_orgEmail">Operations email</label><input id="st_orgEmail" value="' + esc(s.orgEmail || '') + '"></div>' +
      '<div class="field"><label for="st_orgPhone">Phone</label><input id="st_orgPhone" value="' + esc(s.orgPhone || '') + '"></div>' +
      '<div class="field span2"><label for="st_orgAddress">Address</label><input id="st_orgAddress" value="' + esc(s.orgAddress || '') + '"></div>' +
      '<div class="field"><label for="st_bankName">Bank</label><input id="st_bankName" value="' + esc(s.bankName || '') + '"></div>' +
      '<div class="field"><label for="st_bankAcc">Account no</label><input id="st_bankAcc" value="' + esc(s.bankAcc || '') + '"></div>' +
      '<div class="field"><label for="st_bankBranch">Branch code</label><input id="st_bankBranch" value="' + esc(s.bankBranch || '') + '"></div>' +
      '<div class="field"><label for="st_vat">VAT rate %</label><input id="st_vat" type="number" step="0.1" min="0" max="30" value="' + (num(s.vatRate) * 100).toFixed(1) + '"></div>' +
      '</div><div class="form-foot"><button class="btn primary" type="submit">Save settings</button></div></form></div></div>' +

      '<div><div class="card"><div class="card-h"><h2>Fee schedule</h2></div><div class="card-b">' +
      '<form data-form="settings"><div class="form-grid">' +
      '<div class="field"><label for="st_feeEntry">Clearing fee per consignment</label><input id="st_feeEntry" type="number" step="1" min="0" value="' + num(s.fees.perEntry) + '"></div>' +
      '<div class="field"><label for="st_feeLine">Line handling fee</label><input id="st_feeLine" type="number" step="1" min="0" value="' + num(s.fees.perLine) + '"></div>' +
      '<div class="field"><label for="st_feeDisb">Customs disbursement fee</label><input id="st_feeDisb" type="number" step="1" min="0" value="' + num(s.fees.disbursement) + '"></div>' +
      '</div>' +
      '<h3 style="margin:14px 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--mut)">Yard storage tiers</h3>' +
      '<div class="form-grid">' +
      '<div class="field"><label for="st_dmFreeSea">Sea free days</label><input id="st_dmFreeSea" type="number" step="1" min="0" max="60" value="' + num(d.seaFreeDays) + '"></div>' +
      '<div class="field"><label for="st_dmFreeAir">Air / LCL free days</label><input id="st_dmFreeAir" type="number" step="1" min="0" max="60" value="' + num(d.airFreeDays) + '"></div>' +
      '<div class="field"><label for="st_dmT1_20">Tier 1 (day 1\u20137) 20ft / day</label><input id="st_dmT1_20" type="number" step="1" min="0" value="' + num(d.seaTiers[0].day20) + '"></div>' +
      '<div class="field"><label for="st_dmT1_40">Tier 1 (day 1\u20137) 40ft / day</label><input id="st_dmT1_40" type="number" step="1" min="0" value="' + num(d.seaTiers[0].day40) + '"></div>' +
      '<div class="field"><label for="st_dmT2_20">Tier 2 (day 8\u201314) 20ft / day</label><input id="st_dmT2_20" type="number" step="1" min="0" value="' + num(d.seaTiers[1].day20) + '"></div>' +
      '<div class="field"><label for="st_dmT2_40">Tier 2 (day 8\u201314) 40ft / day</label><input id="st_dmT2_40" type="number" step="1" min="0" value="' + num(d.seaTiers[1].day40) + '"></div>' +
      '<div class="field"><label for="st_dmT3_20">Tier 3 (day 15+) 20ft / day</label><input id="st_dmT3_20" type="number" step="1" min="0" value="' + num(d.seaTiers[2].day20) + '"></div>' +
      '<div class="field"><label for="st_dmT3_40">Tier 3 (day 15+) 40ft / day</label><input id="st_dmT3_40" type="number" step="1" min="0" value="' + num(d.seaTiers[2].day40) + '"></div>' +
      '<div class="field"><label for="st_dmA1">Air tier 1 (day 1\u20133) per kg</label><input id="st_dmA1" type="number" step="0.05" min="0" value="' + num(d.airTiers[0].perKg) + '"></div>' +
      '<div class="field"><label for="st_dmA2">Air tier 2 (day 4\u20137) per kg</label><input id="st_dmA2" type="number" step="0.05" min="0" value="' + num(d.airTiers[1].perKg) + '"></div>' +
      '<div class="field"><label for="st_dmA3">Air tier 3 (day 8+) per kg</label><input id="st_dmA3" type="number" step="0.05" min="0" value="' + num(d.airTiers[2].perKg) + '"></div>' +
      '</div><div class="form-foot"><button class="btn primary" type="submit">Save fee schedule</button></div></form></div></div>' +

      '<div class="card"><div class="card-h"><h2>Exchange rates (USD \u2192 ' + esc(s.currency) + ')</h2></div>' +
      '<div class="card-b flush tbl-wrap"><table><thead><tr><th>Effective from</th><th class="num">Rate</th><th></th></tr></thead><tbody>' +
      (rateRows || '<tr><td colspan="3" class="empty">No rates captured.</td></tr>') +
      '</tbody></table></div><div class="card-b">' +
      '<form data-form="rate" class="btn-row" style="align-items:flex-end">' +
      '<div class="field" style="flex:1"><label for="rf_date">Effective from</label><input id="rf_date" type="date" required></div>' +
      '<div class="field" style="flex:1"><label for="rf_usdZar">Rate (' + esc(s.currency) + ' per USD)</label><input id="rf_usdZar" type="number" step="0.0001" min="0.0001" required></div>' +
      '<button class="btn" type="submit">+ Add rate</button></form>' +
      '<p class="hint" style="margin-top:8px">New consignments pick up the latest rate on or before their arrival date; the captured rate can still be edited per consignment.</p>' +
      '</div></div>' +

      '<div class="card"><div class="card-h"><h2>Data</h2></div><div class="card-b"><div class="btn-row">' +
      '<button class="btn ghost" data-action="exportBackup">Download backup (JSON)</button>' +
      '<button class="btn ghost" data-action="resetDemo">Reset demo data</button>' +
      '</div><p class="hint" style="margin-top:8px">All data lives in this browser\u2019s localStorage. Resetting restores the seeded demo desk and clears every change you made.</p>' +
      '</div></div>' +
      '</div></div>';
  }

  /* ================= modals ================= */
  function modalHTML() {
    if (!state.modal) return '';
    var m = state.modal;
    var body = '';
    if (m.type === 'confirm') {
      body = '<div class="modal-b"><p style="font-size:13.5px">' + esc(m.data.message) + '</p>' +
        '<div class="form-foot"><button class="btn ghost" data-action="closeModal">Cancel</button>' +
        '<button class="btn primary" data-action="confirmOk">' + esc(m.data.okLabel || 'Confirm') + '</button></div></div>';
    } else {
      body = '<div class="modal-b">' + formBody(m) + '</div>';
    }
    return '<div class="overlay" data-action="overlayClick"><div class="modal' +
      (m.type === 'entryForm' || m.type === 'quoteForm' ? ' wide' : m.type === 'confirm' ? ' narrow' : '') +
      '" role="dialog" aria-modal="true" aria-label="' + esc(m.title || 'Dialog') + '">' +
      '<div class="modal-h"><h2>' + esc(m.title || '') + '</h2>' +
      '<button class="x" data-action="closeModal" aria-label="Close dialog">\u00D7</button></div>' + body + '</div></div>';
  }

  function itemRowsHTML(items, prefix) {
    var hsList = '<datalist id="hsList"><option value=""></option>' + state.db.tariff.map(function (t) {
      return '<option value="' + esc(t.hsCode) + '">' + esc(t.hsCode + ' \u2014 ' + t.description.slice(0, 60)) + '</option>';
    }).join('') + '</datalist>';
    var rows = items.map(function (it, i) {
      return '<tr>' +
        '<td style="width:130px"><input list="hsList" name="it_hs" data-i="' + i + '" value="' + esc(it.hsCode) + '" placeholder="HS code" aria-label="HS code"></td>' +
        '<td><input name="it_desc" data-i="' + i + '" value="' + esc(it.description) + '" placeholder="Description of goods" aria-label="Description"></td>' +
        '<td style="width:86px"><input name="it_qty" data-i="' + i + '" type="number" step="any" min="0" value="' + it.qty + '" aria-label="Quantity"></td>' +
        '<td style="width:76px"><input name="it_unit" data-i="' + i + '" value="' + esc(it.unit) + '" placeholder="Unit" aria-label="Unit"></td>' +
        '<td style="width:110px"><input name="it_val" data-i="' + i + '" type="number" step="any" min="0" value="' + it.unitValueUsd + '" aria-label="Unit value USD"></td>' +
        '<td style="width:44px"><button type="button" class="rm" data-action="itemRemove" data-i="' + i + '" aria-label="Remove item">\u00D7</button></td>' +
        '</tr>';
    }).join('');
    return hsList + '<table class="items-tbl"><thead><tr><th>HS code</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit value (USD)</th><th></th></tr></thead><tbody id="draftItems">' +
      rows + '</tbody></table>' +
      '<button type="button" class="btn ghost sm" data-action="itemAdd" style="margin-top:8px">+ Add line</button>';
  }

  function formBody(m) {
    var errs = (m.errs || []).length
      ? '<div class="form-errors" role="alert"><b>Please fix the following:</b><ul>' +
        m.errs.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul></div>' : '';

    if (m.type === 'entryForm') {
      var e = m.data;
      var clientOpts = '<option value="">Select client\u2026</option>' + state.db.clients.map(function (c) {
        return '<option value="' + esc(c.id) + '"' + (e.clientId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>';
      }).join('');
      return '<form data-form="entry"><div class="form-grid">' +
        '<div class="field"><label for="ef_client">Importer (client) *</label><select id="ef_client">' + clientOpts + '</select></div>' +
        '<div class="field"><label for="ef_assignee">Clearing clerk</label><input id="ef_assignee" value="' + esc(e.assignee || '') + '"></div>' +
        '<div class="field"><label for="ef_mode">Mode</label><select id="ef_mode">' +
        '<option value="sea"' + (e.mode === 'sea' ? ' selected' : '') + '>Sea</option>' +
        '<option value="air"' + (e.mode === 'air' ? ' selected' : '') + '>Air</option></select></div>' +
        '<div class="field"><label for="ef_size">Container / consignment type</label><select id="ef_size">' +
        ['20', '40', '40RF', 'LCL'].map(function (s) {
          return '<option value="' + s + '"' + (e.containerSize === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label for="ef_grossKg">Gross weight (kg)</label><input id="ef_grossKg" type="number" step="1" min="0" value="' + (e.grossKg || '') + '"></div>' +
        '<div class="field"><label for="ef_origin">Country of origin</label><input id="ef_origin" value="' + esc(e.originCountry || '') + '"></div>' +
        '<div class="field"><label for="ef_pol">Port of loading</label><input id="ef_pol" value="' + esc(e.pol || '') + '"></div>' +
        '<div class="field"><label for="ef_pod">Port of discharge</label><input id="ef_pod" value="' + esc(e.pod || '') + '"></div>' +
        '<div class="field"><label for="ef_vessel">Vessel / flight</label><input id="ef_vessel" value="' + esc(e.vessel || '') + '"></div>' +
        '<div class="field"><label for="ef_bl">Bill of lading / AWB</label><input id="ef_bl" value="' + esc(e.blNo || '') + '"></div>' +
        '<div class="field"><label for="ef_container">Container no</label><input id="ef_container" value="' + esc(e.containerNo || '') + '"></div>' +
        '<div class="field"><label for="ef_arrival">Arrival date *</label><input id="ef_arrival" type="date" value="' + esc(e.arrivalDate || '') + '"></div>' +
        '<div class="field"><label for="ef_rate">FX rate (' + esc(state.db.settings.currency) + ' per USD) *</label><input id="ef_rate" type="number" step="0.0001" min="0.0001" value="' + (e.exchangeRate || '') + '">' +
        '<div class="hint">Auto-filled from the rate effective on arrival.</div></div>' +
        '<div class="field"><label for="ef_freight">Freight (USD)</label><input id="ef_freight" type="number" step="any" min="0" value="' + (e.freightUsd || '') + '"></div>' +
        '<div class="field"><label for="ef_insurance">Insurance (USD)</label><input id="ef_insurance" type="number" step="any" min="0" value="' + (e.insuranceUsd || '') + '"></div>' +
        '<div class="field"><label for="ef_other">Other charges (USD)</label><input id="ef_other" type="number" step="any" min="0" value="' + (e.otherChargesUsd || '') + '"></div>' +
        '<div class="field"><label for="ef_transport">Road transport (' + esc(state.db.settings.currency) + ')</label><input id="ef_transport" type="number" step="any" min="0" value="' + (e.transportZar || '') + '"></div>' +
        '<div class="field span2"><label>Cargo items *</label>' + itemRowsHTML(e.items || [], 'ef') + '</div>' +
        '<div class="field span2"><label for="ef_notes">Notes</label><textarea id="ef_notes">' + esc(e.notes || '') + '</textarea></div>' +
        '</div>' + errs +
        '<div class="form-foot"><button type="button" class="btn ghost" data-action="closeModal">Cancel</button>' +
        '<button class="btn primary" type="submit">' + (m.id ? 'Save changes' : 'Capture consignment') + '</button></div></form>';
    }

    if (m.type === 'clientForm') {
      var c = m.data;
      return '<form data-form="client"><div class="form-grid">' +
        '<div class="field span2"><label for="cf_name">Client name *</label><input id="cf_name" value="' + esc(c.name || '') + '"></div>' +
        '<div class="field"><label for="cf_tax">Tax reference no</label><input id="cf_tax" value="' + esc(c.taxNo || '') + '"></div>' +
        '<div class="field"><label for="cf_contact">Contact person</label><input id="cf_contact" value="' + esc(c.contactName || '') + '"></div>' +
        '<div class="field"><label for="cf_email">Email *</label><input id="cf_email" type="email" value="' + esc(c.email || '') + '"></div>' +
        '<div class="field"><label for="cf_phone">Phone</label><input id="cf_phone" value="' + esc(c.phone || '') + '"></div>' +
        '<div class="field span2"><label for="cf_address">Address</label><input id="cf_address" value="' + esc(c.address || '') + '"></div>' +
        '<div class="field"><label for="cf_credit">Credit terms (days)</label><input id="cf_credit" type="number" min="0" max="180" value="' + (c.creditDays != null ? c.creditDays : 30) + '"></div>' +
        '<div class="field span2"><label for="cf_notes">Notes</label><textarea id="cf_notes">' + esc(c.notes || '') + '</textarea></div>' +
        '</div>' + errs +
        '<div class="form-foot"><button type="button" class="btn ghost" data-action="closeModal">Cancel</button>' +
        '<button class="btn primary" type="submit">' + (m.id ? 'Save changes' : 'Add client') + '</button></div></form>';
    }

    if (m.type === 'tariffForm') {
      var t = m.data;
      return '<form data-form="tariff"><div class="form-grid">' +
        '<div class="field"><label for="tf_hs">HS tariff code *</label><input id="tf_hs" class="mono" value="' + esc(t.hsCode || '') + '" placeholder="e.g. 6109.10.00">' +
        '<div class="hint">Format: 4.2.2 digits.</div></div>' +
        '<div class="field"><label for="tf_desc">Description *</label><input id="tf_desc" value="' + esc(t.description || '') + '"></div>' +
        '<div class="field"><label for="tf_duty">Import duty %</label><input id="tf_duty" type="number" step="0.1" min="0" max="100" value="' + (t.dutyRate != null ? (t.dutyRate * 100).toFixed(1) : '0') + '"></div>' +
        '<div class="field"><label for="tf_excise">Excise duty %</label><input id="tf_excise" type="number" step="0.1" min="0" max="100" value="' + (t.exciseRate != null ? (t.exciseRate * 100).toFixed(1) : '0') + '"></div>' +
        '<div class="field"><label for="tf_vat">Import VAT %</label><input id="tf_vat" type="number" step="0.1" min="0" max="30" value="' + (t.vatRate != null ? (t.vatRate * 100).toFixed(1) : (state.db.settings.vatRate * 100).toFixed(1)) + '">' +
        '<div class="hint">Leave at 15% unless the code is zero-rated or exempt.</div></div>' +
        '</div>' + errs +
        '<div class="form-foot"><button type="button" class="btn ghost" data-action="closeModal">Cancel</button>' +
        '<button class="btn primary" type="submit">' + (m.id ? 'Save changes' : 'Add tariff line') + '</button></div></form>';
    }

    if (m.type === 'quoteForm') {
      var q = m.data;
      var qcOpts = '<option value="">Select client\u2026</option>' + state.db.clients.map(function (c2) {
        return '<option value="' + esc(c2.id) + '"' + (q.clientId === c2.id ? ' selected' : '') + '>' + esc(c2.name) + '</option>';
      }).join('');
      return '<form data-form="quote"><div class="form-grid">' +
        '<div class="field"><label for="qf_client">Client *</label><select id="qf_client">' + qcOpts + '</select></div>' +
        '<div class="field"><label for="qf_valid">Valid until *</label><input id="qf_valid" type="date" value="' + esc(q.validUntil || '') + '"></div>' +
        '<div class="field"><label for="qf_mode">Mode</label><select id="qf_mode">' +
        '<option value="sea"' + (q.mode === 'sea' ? ' selected' : '') + '>Sea</option>' +
        '<option value="air"' + (q.mode === 'air' ? ' selected' : '') + '>Air</option></select></div>' +
        '<div class="field"><label for="qf_size">Container / type</label><select id="qf_size">' +
        ['20', '40', '40RF', 'LCL'].map(function (s) {
          return '<option value="' + s + '"' + (q.containerSize === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label for="qf_grossKg">Gross weight (kg)</label><input id="qf_grossKg" type="number" step="1" min="0" value="' + (q.grossKg || '') + '"></div>' +
        '<div class="field"><label for="qf_pol">Port of loading</label><input id="qf_pol" value="' + esc(q.pol || '') + '"></div>' +
        '<div class="field"><label for="qf_pod">Port of discharge</label><input id="qf_pod" value="' + esc(q.pod || '') + '"></div>' +
        '<div class="field"><label for="qf_rate">FX rate (' + esc(state.db.settings.currency) + ' per USD) *</label><input id="qf_rate" type="number" step="0.0001" min="0.0001" value="' + (q.exchangeRate || '') + '"></div>' +
        '<div class="field"><label for="qf_freight">Freight (USD)</label><input id="qf_freight" type="number" step="any" min="0" value="' + (q.freightUsd || '') + '"></div>' +
        '<div class="field"><label for="qf_insurance">Insurance (USD)</label><input id="qf_insurance" type="number" step="any" min="0" value="' + (q.insuranceUsd || '') + '"></div>' +
        '<div class="field span2"><label>Cargo items *</label>' + itemRowsHTML(q.items || [], 'qf') + '</div>' +
        '</div>' +
        '<div id="quotePreview" class="card" style="margin-top:14px;background:var(--wash-2)"></div>' +
        errs +
        '<div class="form-foot"><button type="button" class="btn ghost" data-action="closeModal">Cancel</button>' +
        '<button class="btn primary" type="submit">' + (m.id ? 'Save quotation' : 'Create quotation') + '</button></div></form>';
    }

    if (m.type === 'paymentForm') {
      return '<form data-form="payment"><div class="form-grid">' +
        '<div class="field"><label for="pf_date">Payment date</label><input id="pf_date" type="date" value="' + today() + '"></div>' +
        '<div class="field"><label for="pf_amount">Amount (' + esc(state.db.settings.currency) + ') *</label><input id="pf_amount" type="number" step="0.01" min="0.01"></div>' +
        '<div class="field"><label for="pf_ref">Reference</label><input id="pf_ref" placeholder="e.g. SARS-EFT-88213"></div>' +
        '<div class="field"><label for="pf_method">Method</label><select id="pf_method">' +
        '<option value="eft">EFT</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="card">Card</option></select></div>' +
        '</div>' + errs +
        '<div class="form-foot"><button type="button" class="btn ghost" data-action="closeModal">Cancel</button>' +
        '<button class="btn primary" type="submit">Record payment</button></div></form>';
    }
    return '';
  }

  /* Capture the entry form's scalar fields into the working copy so modal
     re-renders (adding lines, validation errors) never lose typed values. */
  function captureEntryForm() {
    var m = state.modal; if (!m || m.type !== 'entryForm') return;
    var e = m.data;
    var g = function (id) { var el = document.getElementById(id); return el ? el.value : null; };
    if (g('ef_client') != null) e.clientId = g('ef_client');
    e.assignee = (g('ef_assignee') || '').trim();
    e.mode = g('ef_mode') || 'sea';
    e.containerSize = e.mode === 'air' ? '' : (g('ef_size') || '40');
    e.grossKg = num(g('ef_grossKg'));
    e.originCountry = (g('ef_origin') || '').trim();
    e.pol = (g('ef_pol') || '').trim();
    e.pod = (g('ef_pod') || '').trim();
    e.vessel = (g('ef_vessel') || '').trim();
    e.blNo = (g('ef_bl') || '').trim();
    e.containerNo = (g('ef_container') || '').trim();
    e.arrivalDate = g('ef_arrival') || '';
    e.exchangeRate = num(g('ef_rate'));
    e.freightUsd = num(g('ef_freight'));
    e.insuranceUsd = num(g('ef_insurance'));
    e.otherChargesUsd = num(g('ef_other'));
    e.transportZar = num(g('ef_transport'));
    e.notes = (g('ef_notes') || '').trim();
  }

  function openModal(type, title, data, id) {
    state.modal = { type: type, title: title, data: data, id: id, errs: [] };
    render();
    var first = $('.modal input, .modal select, .modal textarea');
    if (first) first.focus();
  }
  function closeModal() { state.modal = null; render(); }

  /* ---- draft items for the form editors ---- */
  function updateQuotePreview() {
    var box = $('#quotePreview'); if (!box) return;
    var m = state.modal; if (!m) return;
    var q = readQuoteForm(false);
    if (!q.items.length || !num(q.exchangeRate)) { box.innerHTML = '<div class="card-b" style="font-size:12px;color:var(--mut)">Add cargo lines and an FX rate to see the estimate.</div>'; return; }
    var t = CORE.computeTotals(q, state.db.settings, state.db.tariff, today());
    box.innerHTML = '<div class="card-b"><b style="font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--mut)">Live estimate</b>' +
      '<table class="charges"><tbody>' +
      '<tr><td>Customs value (CIF)</td><td class="num">' + money(t.customsValueZar) + '</td></tr>' +
      '<tr><td>Import duty + excise</td><td class="num">' + money(t.duty + t.excise) + '</td></tr>' +
      '<tr><td>Import VAT</td><td class="num">' + money(t.vat) + '</td></tr>' +
      '<tr><td>Clearing fees</td><td class="num">' + money(t.fees.total) + '</td></tr>' +
      '<tr class="tot"><td>Estimated landed total</td><td class="num">' + money(t.total) + '</td></tr>' +
      '</tbody></table></div>';
  }
  function readQuoteForm(withErrors) {
    var m = state.modal;
    var q = m.data;
    q.clientId = $('#qf_client') ? $('#qf_client').value : q.clientId;
    q.validUntil = $('#qf_valid') ? $('#qf_valid').value : q.validUntil;
    q.mode = $('#qf_mode') ? $('#qf_mode').value : 'sea';
    q.containerSize = $('#qf_size') ? $('#qf_size').value : '40';
    q.grossKg = num($('#qf_grossKg') ? $('#qf_grossKg').value : q.grossKg);
    q.pol = $('#qf_pol') ? $('#qf_pol').value : '';
    q.pod = $('#qf_pod') ? $('#qf_pod').value : '';
    q.exchangeRate = num($('#qf_rate') ? $('#qf_rate').value : q.exchangeRate);
    q.freightUsd = num($('#qf_freight') ? $('#qf_freight').value : q.freightUsd);
    q.insuranceUsd = num($('#qf_insurance') ? $('#qf_insurance').value : q.insuranceUsd);
    var errs = [];
    if (!q.clientId) errs.push('Select a client.');
    if (!q.validUntil) errs.push('Set a valid-until date.');
    if (!(num(q.exchangeRate) > 0)) errs.push('FX rate must be greater than zero.');
    if (!q.items.length) errs.push('Add at least one cargo line.');
    q.items.forEach(function (it, i) {
      var n = i + 1;
      if (!String(it.hsCode || '').trim()) errs.push('Item ' + n + ': HS code required.');
      else if (!CORE.findTariff(state.db.tariff, it.hsCode)) errs.push('Item ' + n + ': HS code "' + it.hsCode + '" is not in the tariff schedule.');
      if (!(num(it.qty) > 0)) errs.push('Item ' + n + ': quantity must be greater than zero.');
    });
    if (withErrors) return errs;
    return q;
  }

  /* ================= forms ================= */
  function handleForm(kind, formEl) {
    if (kind === 'signin') {
      var err = signIn($('#ai_email').value, $('#ai_pass').value);
      if (err) { state.authErr = err; render(); return; }
      state.authErr = ''; toast('Signed in as ' + state.session.name);
      go('dashboard'); render(); return;
    }
    if (kind === 'signup') {
      var err2 = signUp($('#au_name').value, $('#au_email').value, $('#au_pass').value);
      if (err2) { state.authErr = err2; render(); return; }
      state.authErr = ''; toast('Welcome to ClearLink, ' + state.session.name.split(' ')[0]);
      go('dashboard'); render(); return;
    }
    if (!state.session || !state.db) return;

    if (kind === 'entry') {
      var m = state.modal, e = m.data;
      e.clientId = $('#ef_client').value;
      e.assignee = $('#ef_assignee').value.trim();
      e.mode = $('#ef_mode').value;
      e.containerSize = $('#ef_mode').value === 'air' ? '' : $('#ef_size').value;
      e.grossKg = num($('#ef_grossKg').value);
      e.originCountry = $('#ef_origin').value.trim();
      e.pol = $('#ef_pol').value.trim();
      e.pod = $('#ef_pod').value.trim();
      e.vessel = $('#ef_vessel').value.trim();
      e.blNo = $('#ef_bl').value.trim();
      e.containerNo = $('#ef_container').value.trim();
      e.arrivalDate = $('#ef_arrival').value;
      e.exchangeRate = num($('#ef_rate').value);
      e.freightUsd = num($('#ef_freight').value);
      e.insuranceUsd = num($('#ef_insurance').value);
      e.otherChargesUsd = num($('#ef_other').value);
      e.transportZar = num($('#ef_transport').value);
      e.notes = $('#ef_notes').value.trim();
      var errs = CORE.validateEntry(e, state.db.tariff);
      if (errs.length) { m.errs = errs; render(); return; }
      if (m.id) {
        var orig = byId(state.db.entries, m.id);
        e.id = orig.id; e.ref = orig.ref; e.status = orig.status;
        e.payments = orig.payments; e.invoice = orig.invoice; e.timeline = orig.timeline;
        e.docs = orig.docs; e.createdAt = orig.createdAt;
        e.releasedDate = orig.releasedDate; e.deliveredDate = orig.deliveredDate;
        e.queryFrom = orig.queryFrom;
        logEvent(e, 'Consignment details updated.');
        var idx = state.db.entries.indexOf(orig);
        state.db.entries[idx] = e;
        toast('Consignment ' + e.ref + ' updated.');
      } else {
        e.id = uid('en'); e.ref = nextRef('CL-26-', 'entry');
        e.status = 'draft'; e.docs = {}; e.payments = []; e.invoice = null;
        e.queryFrom = null; e.releasedDate = null; e.deliveredDate = null;
        e.createdAt = new Date().toISOString();
        logEvent(e, 'Consignment captured.');
        state.db.entries.push(e);
        toast('Consignment ' + e.ref + ' captured.');
      }
      save(); state.modal = null; go('entry', e.id); render(); return;
    }

    if (kind === 'client') {
      var mc = state.modal, c = mc.data;
      c.name = $('#cf_name').value.trim();
      c.taxNo = $('#cf_tax').value.trim();
      c.contactName = $('#cf_contact').value.trim();
      c.email = $('#cf_email').value.trim();
      c.phone = $('#cf_phone').value.trim();
      c.address = $('#cf_address').value.trim();
      c.creditDays = $('#cf_credit').value === '' ? 30 : num($('#cf_credit').value);
      c.notes = $('#cf_notes').value.trim();
      var errsC = CORE.validateClient(c);
      if (errsC.length) { mc.errs = errsC; render(); return; }
      if (mc.id) {
        var origC = byId(state.db.clients, mc.id);
        var iC = state.db.clients.indexOf(origC);
        c.id = origC.id; c.createdAt = origC.createdAt;
        state.db.clients[iC] = c;
        toast('Client updated.');
      } else {
        c.id = uid('cl'); c.createdAt = new Date().toISOString();
        state.db.clients.push(c);
        toast('Client added.');
      }
      save(); closeModal(); return;
    }

    if (kind === 'tariff') {
      var mt = state.modal, tf = mt.data;
      tf.hsCode = $('#tf_hs').value.trim();
      tf.description = $('#tf_desc').value.trim();
      tf.dutyRate = num($('#tf_duty').value) / 100;
      tf.exciseRate = num($('#tf_excise').value) / 100;
      tf.vatRate = $('#tf_vat').value === '' ? null : num($('#tf_vat').value) / 100;
      var errsT = [];
      if (!/^\d{4}\.\d{2}\.\d{2}$/.test(tf.hsCode)) errsT.push('HS code must look like 6109.10.00 (4.2.2 digits).');
      if (!tf.description) errsT.push('Description is required.');
      if (tf.dutyRate > 1 || tf.exciseRate > 1) errsT.push('Duty and excise rates cannot exceed 100%.');
      var dup = state.db.tariff.filter(function (x) { return x.hsCode === tf.hsCode && x.id !== mt.id; });
      if (dup.length) errsT.push('That HS code already exists in the schedule.');
      if (errsT.length) { mt.errs = errsT; render(); return; }
      if (mt.id) {
        var origT = byId(state.db.tariff, mt.id);
        var iT = state.db.tariff.indexOf(origT);
        tf.id = origT.id;
        state.db.tariff[iT] = tf;
        toast('Tariff line updated.');
      } else {
        tf.id = uid('t');
        state.db.tariff.push(tf);
        toast('Tariff line added.');
      }
      save(); closeModal(); return;
    }

    if (kind === 'quote') {
      var mq = state.modal;
      var errsQ = readQuoteForm(true);
      if (errsQ.length) { mq.errs = errsQ; render(); return; }
      var q = readQuoteForm(false);
      if (mq.id) {
        var origQ = byId(state.db.quotes, mq.id);
        q.id = origQ.id; q.ref = origQ.ref; q.status = origQ.status;
        q.date = origQ.date; q.createdAt = origQ.createdAt;
        q.convertedEntryId = origQ.convertedEntryId; q.timeline = origQ.timeline;
        var iQ = state.db.quotes.indexOf(origQ);
        state.db.quotes[iQ] = q;
        toast('Quotation ' + q.ref + ' updated.');
      } else {
        q.id = uid('qt'); q.ref = nextRef('QT-26-', 'quote');
        q.date = today(); q.status = 'draft'; q.convertedEntryId = null;
        q.createdAt = new Date().toISOString();
        q.timeline = [{ ts: new Date().toISOString(), text: 'Quotation drafted.', by: state.session.name }];
        state.db.quotes.push(q);
        toast('Quotation ' + q.ref + ' created.');
      }
      save(); state.modal = null; go('quotes'); render(); return;
    }

    if (kind === 'payment') {
      var mp = state.modal, pe = byId(state.db.entries, mp.data.entryId);
      var amt = num($('#pf_amount').value);
      var errsP = [];
      if (!(amt > 0)) errsP.push('Payment amount must be greater than zero.');
      if (!$('#pf_date').value) errsP.push('Payment date is required.');
      if (errsP.length) { mp.errs = errsP; render(); return; }
      pe.payments = pe.payments || [];
      pe.payments.push({ id: uid('p'), date: $('#pf_date').value, amount: amt, ref: $('#pf_ref').value.trim(), method: $('#pf_method').value });
      logEvent(pe, 'Payment of ' + money(amt) + ' recorded' + ($('#pf_ref').value.trim() ? ' (ref ' + $('#pf_ref').value.trim() + ')' : '') + '.');
      var tt = totalsFor(pe);
      if (tt.govOutstanding <= 0.005 && tt.govTotal > 0) {
        toast('Government charges now fully covered \u2014 ready to mark Duty paid.');
      } else {
        toast('Payment recorded.');
      }
      save(); closeModal(); render(); return;
    }

    if (kind === 'rate') {
      var date = $('#rf_date').value, rate = num($('#rf_usdZar').value);
      if (!date || !(rate > 0)) { toast('Rate needs a date and a value greater than zero.', true); return; }
      var dupR = state.db.rates.filter(function (r) { return r.date === date; });
      if (dupR.length) { toast('A rate already exists for that date \u2014 delete it first.', true); return; }
      state.db.rates.push({ id: uid('r'), date: date, usdZar: rate });
      toast('Exchange rate captured.');
      save(); render(); return;
    }

    if (kind === 'settings') {
      var s = state.db.settings;
      var orgName = $('#st_orgName').value.trim();
      var vat = num($('#st_vat').value) / 100;
      if (!orgName) { toast('Practising name is required.', true); return; }
      if (vat < 0 || vat > 0.3) { toast('VAT rate must be between 0 and 30%.', true); return; }
      var feeEntry = num($('#st_feeEntry').value), feeLine = num($('#st_feeLine').value), feeDisb = num($('#st_feeDisb').value);
      var fs = num($('#st_dmFreeSea').value), fa = num($('#st_dmFreeAir').value);
      var d = s.demurrage;
      d.seaFreeDays = fs; d.airFreeDays = fa;
      d.seaTiers = [
        { upTo: 7, day20: num($('#st_dmT1_20').value), day40: num($('#st_dmT1_40').value) },
        { upTo: 14, day20: num($('#st_dmT2_20').value), day40: num($('#st_dmT2_40').value) },
        { upTo: null, day20: num($('#st_dmT3_20').value), day40: num($('#st_dmT3_40').value) }
      ];
      d.airTiers = [
        { upTo: 3, perKg: num($('#st_dmA1').value) },
        { upTo: 7, perKg: num($('#st_dmA2').value) },
        { upTo: null, perKg: num($('#st_dmA3').value) }
      ];
      s.orgName = orgName; s.regNo = $('#st_regNo').value.trim();
      s.orgEmail = $('#st_orgEmail').value.trim(); s.orgPhone = $('#st_orgPhone').value.trim();
      s.orgAddress = $('#st_orgAddress').value.trim();
      s.bankName = $('#st_bankName').value.trim(); s.bankAcc = $('#st_bankAcc').value.trim(); s.bankBranch = $('#st_bankBranch').value.trim();
      s.vatRate = vat;
      s.fees = { perEntry: feeEntry, perLine: feeLine, disbursement: feeDisb };
      toast('Settings saved.');
      save(); render(); return;
    }
  }

  /* ================= actions ================= */
  function handleAction(action, ds, el) {
    if (!state.session && ['demoLogin', 'authTab'].indexOf(action) === -1) {
      if (action !== 'overlayClick') return;
    }
    var db = state.db;
    switch (action) {
      case 'demoLogin':
        state.authTab = 'signin';
        var e1 = signIn('demo@clearlink.co.za', 'demo1234');
        if (e1) { state.authErr = e1; state.authTab = 'signin'; render(); }
        else { state.authErr = ''; toast('Signed in to the demo desk.'); go('dashboard'); render(); }
        return;
      case 'authTab':
        state.authTab = ds.tab; state.authErr = ''; render(); return;
      case 'logout': signOut(); return;
      case 'nav': go(ds.route); return;

      /* entries */
      case 'newEntry': {
        var today2 = today();
        var rate = CORE.effectiveRate(db.rates, today2) || 18.5;
        openModal('entryForm', 'New consignment', {
          clientId: '', mode: 'sea', containerSize: '40', grossKg: '', originCountry: '',
          pol: '', pod: 'Durban', vessel: '', blNo: '', containerNo: '',
          arrivalDate: today2, exchangeRate: rate,
          freightUsd: '', insuranceUsd: '', otherChargesUsd: '', transportZar: '',
          assignee: state.session.name, notes: '', items: []
        });
        return;
      }
      case 'editEntry': {
        var orig = byId(db.entries, ds.id);
        if (!orig) return;
        var copy = JSON.parse(JSON.stringify(orig));
        openModal('entryForm', 'Edit consignment ' + orig.ref, copy, orig.id);
        return;
      }
      case 'deleteEntry': {
        var del = byId(db.entries, ds.id);
        if (!del) return;
        state.modal = { type: 'confirm', title: 'Delete consignment', errs: [], data: {
          message: 'Delete consignment ' + del.ref + '? Its payments, invoice and timeline are removed with it. This cannot be undone.',
          okLabel: 'Delete consignment', action: 'deleteEntry', arg: ds.id } };
        render(); return;
      }
      case 'viewEntry': go('entry', ds.id); return;
      case 'setStatus': {
        var se = byId(db.entries, state.route.name === 'entry' ? state.route.id : ds.id);
        if (!se || se.status === ds.to) return;
        var tt = totalsFor(se);
        var res = CORE.canTransition(se, ds.to, { totals: tt, currency: db.settings.currency });
        if (!res.ok) { toast(res.reason, true); return; }
        var from = se.status;
        se.status = ds.to;
        if (ds.to === 'query') se.queryFrom = from;
        if (ds.to === 'released' && !se.releasedDate) se.releasedDate = today();
        if (ds.to === 'delivered' && !se.deliveredDate) se.deliveredDate = today();
        if (from === 'query') se.queryFrom = null;
        logEvent(se, 'Status changed: ' + CORE.statusLabel(from) + ' \u2192 ' + CORE.statusLabel(ds.to) + '.');
        save(); render();
        toast('Consignment ' + se.ref + ' marked ' + CORE.statusLabel(ds.to) + '.');
        return;
      }
      case 'addPayment': {
        var pe = byId(db.entries, state.route.id);
        if (!pe) return;
        state.modal = { type: 'paymentForm', title: 'Record duty / VAT payment \u2014 ' + pe.ref, errs: [], data: { entryId: pe.id } };
        render(); return;
      }
      case 'genInvoice': {
        var ge = byId(db.entries, state.route.id);
        if (!ge || ge.invoice) return;
        var gt = totalsFor(ge);
        var lines = [];
        if (gt.duty > 0) lines.push({ desc: 'Import duty (recharge at cost)', amount: gt.duty });
        if (gt.excise > 0) lines.push({ desc: 'Excise duty (recharge at cost)', amount: gt.excise });
        if (gt.vat > 0) lines.push({ desc: 'Import VAT (recharge at cost)', amount: gt.vat });
        if (gt.demurrage.cost > 0) lines.push({ desc: 'Port storage / demurrage (recharge at cost)', amount: gt.demurrage.cost });
        gt.fees.lines.forEach(function (l) { lines.push({ desc: l.desc, amount: l.amount }); });
        if (gt.transportZar > 0) lines.push({ desc: 'Road transport / delivery', amount: gt.transportZar });
        if (!lines.length) { toast('Nothing to invoice \u2014 no charges computed for this consignment.', true); return; }
        ge.invoice = {
          no: 'INV-26-' + pad((db.seq.invoice = (db.seq.invoice || 0) + 1), 4),
          date: today(), paid: false, paidDate: null, lines: lines,
          total: CORE.round2(lines.reduce(function (s, l) { return s + l.amount; }, 0))
        };
        logEvent(ge, 'Client invoice ' + ge.invoice.no + ' generated (' + money(ge.invoice.total) + ').');
        save(); render();
        toast('Invoice ' + ge.invoice.no + ' generated.');
        return;
      }
      case 'invoicePaid': {
        var ie = byId(db.entries, state.route.id);
        if (!ie || !ie.invoice) return;
        ie.invoice.paid = !ie.invoice.paid;
        ie.invoice.paidDate = ie.invoice.paid ? today() : null;
        logEvent(ie, ie.invoice.paid ? 'Client invoice marked paid.' : 'Client invoice reopened.');
        if (ie.invoice.paid && ie.status === 'delivered') {
          toast('Invoice paid \u2014 the consignment can now be closed.');
        }
        save(); render(); return;
      }
      case 'printDecl': {
        var de = byId(db.entries, state.route.id);
        if (!de) return;
        printDoc(CORE.declarationHTML(de, byId(db.clients, de.clientId), db.settings, db.tariff));
        return;
      }
      case 'printInv': {
        var pve = byId(db.entries, state.route.id);
        if (!pve || !pve.invoice) return;
        printDoc(CORE.invoiceHTML(pve, byId(db.clients, pve.clientId), db.settings));
        return;
      }
      case 'printQt': {
        var pq = byId(db.quotes, ds.id);
        if (!pq) return;
        printDoc(CORE.quoteHTML(pq, byId(db.clients, pq.clientId), db.settings, db.tariff));
        return;
      }
      case 'exportEntries': {
        var list = filteredEntries();
        if (!list.length) { toast('Nothing to export.', true); return; }
        var map = {};
        db.clients.forEach(function (c) { map[c.id] = c; });
        download('clearlink-consignments-' + today() + '.csv',
          CORE.entriesCSV(list, map, db.settings, db.tariff, today()));
        return;
      }
      case 'exportInvoices': {
        var map2 = {};
        db.clients.forEach(function (c) { map2[c.id] = c; });
        download('clearlink-invoices-' + today() + '.csv',
          CORE.invoiceCSV(db.entries, map2, db.settings));
        return;
      }
      case 'exportStatement': {
        var cS = byId(db.clients, ds.id);
        if (!cS) return;
        download('statement-' + cS.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-' + today() + '.csv',
          CORE.statementCSV(db.entries.filter(function (e) { return e.clientId === cS.id; }), cS, db.settings));
        return;
      }
      case 'exportBackup':
        download('clearlink-backup-' + today() + '.json', JSON.stringify(db, null, 2), 'application/json');
        return;

      /* clients */
      case 'newClient':
        openModal('clientForm', 'New client', { name: '', taxNo: '', contactName: '', email: '', phone: '', address: '', creditDays: 30, notes: '' });
        return;
      case 'editClient': {
        var oc = byId(db.clients, ds.id);
        if (!oc) return;
        openModal('clientForm', 'Edit client', JSON.parse(JSON.stringify(oc)), oc.id);
        return;
      }
      case 'deleteClient': {
        var dc = byId(db.clients, ds.id);
        if (!dc) return;
        var n = db.entries.filter(function (e) { return e.clientId === ds.id; }).length;
        if (n > 0) { toast('Cannot delete ' + dc.name + ' \u2014 ' + n + ' consignment(s) are linked to this client.', true); return; }
        state.modal = { type: 'confirm', title: 'Delete client', errs: [], data: {
          message: 'Delete client ' + dc.name + '? This cannot be undone.',
          okLabel: 'Delete client', action: 'deleteClient', arg: ds.id } };
        render(); return;
      }
      case 'clientFilter':
        state.f.entries.client = ds.id;
        state.f.entries.q = ''; state.f.entries.status = ''; state.f.entries.mode = '';
        go('entries'); return;

      /* tariff */
      case 'newTariff':
        openModal('tariffForm', 'New tariff line', { hsCode: '', description: '', dutyRate: 0, exciseRate: 0, vatRate: null });
        return;
      case 'editTariff': {
        var ot = byId(db.tariff, ds.id);
        if (!ot) return;
        openModal('tariffForm', 'Edit tariff line', JSON.parse(JSON.stringify(ot)), ot.id);
        return;
      }
      case 'deleteTariff': {
        var dt = byId(db.tariff, ds.id);
        if (!dt) return;
        var used = db.entries.some(function (e) { return (e.items || []).some(function (i) { return i.hsCode === dt.hsCode; }); });
        if (used) { toast('Cannot delete HS ' + dt.hsCode + ' \u2014 it is used by existing consignments.', true); return; }
        state.modal = { type: 'confirm', title: 'Delete tariff line', errs: [], data: {
          message: 'Delete tariff line ' + dt.hsCode + ' (' + dt.description + ')?',
          okLabel: 'Delete line', action: 'deleteTariff', arg: ds.id } };
        render(); return;
      }

      /* quotations */
      case 'newQuote': {
        openModal('quoteForm', 'New quotation', {
          clientId: '', date: today(), validUntil: '', mode: 'sea', containerSize: '40',
          grossKg: '', pol: '', pod: 'Durban', exchangeRate: CORE.effectiveRate(db.rates, today()) || 18.5,
          freightUsd: '', insuranceUsd: '', items: []
        });
        setTimeout(updateQuotePreview, 30);
        return;
      }
      case 'editQuote': {
        var oq = byId(db.quotes, ds.id);
        if (!oq) return;
        openModal('quoteForm', 'Edit quotation ' + oq.ref, JSON.parse(JSON.stringify(oq)), oq.id);
        setTimeout(updateQuotePreview, 30);
        return;
      }
      case 'deleteQuote': {
        var dq = byId(db.quotes, ds.id);
        if (!dq) return;
        state.modal = { type: 'confirm', title: 'Delete quotation', errs: [], data: {
          message: 'Delete quotation ' + dq.ref + '?',
          okLabel: 'Delete quotation', action: 'deleteQuote', arg: ds.id } };
        render(); return;
      }
      case 'quoteStatus': {
        var qs = byId(db.quotes, ds.id);
        if (!qs) return;
        qs.status = ds.to;
        (qs.timeline = qs.timeline || []).push({ ts: new Date().toISOString(), text: 'Quotation ' + ds.to + '.', by: state.session.name });
        save(); render();
        toast('Quotation ' + qs.ref + ' marked ' + ds.to + '.');
        return;
      }
      case 'convertQuote': {
        var cq = byId(db.quotes, ds.id);
        if (!cq || cq.status !== 'accepted') return;
        var ne = {
          id: uid('en'), ref: nextRef('CL-26-', 'entry'), clientId: cq.clientId,
          mode: cq.mode, containerSize: cq.containerSize, grossKg: cq.grossKg,
          originCountry: '', pol: cq.pol, pod: cq.pod, vessel: '', blNo: '', containerNo: '',
          arrivalDate: today(), exchangeRate: cq.exchangeRate,
          freightUsd: cq.freightUsd, insuranceUsd: cq.insuranceUsd, otherChargesUsd: 0, transportZar: 0,
          items: cq.items.map(function (it) {
            return { id: uid('i'), hsCode: it.hsCode, description: it.description, qty: it.qty, unit: it.unit, unitValueUsd: it.unitValueUsd };
          }),
          docs: {}, status: 'draft', queryFrom: null, assignee: state.session.name,
          payments: [], invoice: null, releasedDate: null, deliveredDate: null,
          notes: 'Created from quotation ' + cq.ref + '.',
          createdAt: new Date().toISOString(),
          timeline: [{ ts: new Date().toISOString(), text: 'Created from accepted quotation ' + cq.ref + '.', by: state.session.name }]
        };
        db.entries.push(ne);
        cq.status = 'converted';
        cq.convertedEntryId = ne.id;
        (cq.timeline = cq.timeline || []).push({ ts: new Date().toISOString(), text: 'Converted to consignment ' + ne.ref + '.', by: state.session.name });
        save(); go('entry', ne.id); render();
        toast('Quotation converted \u2014 consignment ' + ne.ref + ' captured as draft.');
        return;
      }

      /* rates, data */
      case 'newRate': return;
      case 'deleteRate': {
        var dr = byId(db.rates, ds.id);
        if (!dr) return;
        state.modal = { type: 'confirm', title: 'Delete rate', errs: [], data: {
          message: 'Delete the exchange rate effective ' + fdate(dr.date) + '?',
          okLabel: 'Delete rate', action: 'deleteRate', arg: ds.id } };
        render(); return;
      }
      case 'resetDemo':
        state.modal = { type: 'confirm', title: 'Reset demo data', errs: [], data: {
          message: 'Reset the whole workspace to the seeded demo desk? Every client, consignment, quotation and payment you captured will be replaced. Your account stays.',
          okLabel: 'Reset workspace', action: 'resetDemo' } };
        render(); return;

      /* items editor + confirm + modal */
      case 'itemAdd': {
        var m1 = state.modal;
        if (m1.type === 'entryForm') captureEntryForm();
        else if (m1.type === 'quoteForm') readQuoteForm(false);
        m1.data.items.push({ id: uid('i'), hsCode: '', description: '', qty: '', unit: '', unitValueUsd: '' });
        render();
        var lastInput = $$('.modal .items-tbl input').pop();
        if (lastInput) lastInput.focus();
        return;
      }
      case 'itemRemove': {
        var m2 = state.modal;
        if (m2.type === 'entryForm') captureEntryForm();
        else if (m2.type === 'quoteForm') readQuoteForm(false);
        m2.data.items.splice(+ds.i, 1);
        render();
        return;
      }
      case 'confirmOk': {
        var cf = state.modal ? state.modal.data : null;
        state.modal = null;
        if (cf && cf.action === 'deleteEntry') {
          var de3 = byId(db.entries, cf.arg);
          if (de3) {
            db.entries.splice(db.entries.indexOf(de3), 1);
            toast('Consignment ' + de3.ref + ' deleted.');
            if (state.route.name === 'entry') go('entries');
            save(); render();
          }
        } else if (cf && cf.action === 'deleteClient') {
          var dc3 = byId(db.clients, cf.arg);
          if (dc3) { db.clients.splice(db.clients.indexOf(dc3), 1); toast('Client deleted.'); save(); render(); }
        } else if (cf && cf.action === 'deleteTariff') {
          var dt3 = byId(db.tariff, cf.arg);
          if (dt3) { db.tariff.splice(db.tariff.indexOf(dt3), 1); toast('Tariff line deleted.'); save(); render(); }
        } else if (cf && cf.action === 'deleteQuote') {
          var dq3 = byId(db.quotes, cf.arg);
          if (dq3) { db.quotes.splice(db.quotes.indexOf(dq3), 1); toast('Quotation deleted.'); save(); render(); }
        } else if (cf && cf.action === 'deleteRate') {
          var dr3 = byId(db.rates, cf.arg);
          if (dr3) { db.rates.splice(db.rates.indexOf(dr3), 1); toast('Rate deleted.'); save(); render(); }
        } else if (cf && cf.action === 'resetDemo') {
          lsDel(K.DATA);
          loadData();
          toast('Workspace reset to the seeded demo desk.');
          go('dashboard'); render();
        } else {
          render();
        }
        return;
      }
      case 'closeModal': closeModal(); return;
      case 'sortEntries': {
        var f = state.f.entries;
        if (f.sort === ds.sort) f.dir = -f.dir; else { f.sort = ds.sort; f.dir = 1; }
        $('#entriesResults').innerHTML = entriesResultsHTML();
        return;
      }
      default: return;
    }
  }

  /* ================= delegated events ================= */
  function bindOnce() {
    var app = $('#app');

    app.addEventListener('click', function (ev) {
      var el = ev.target.closest('[data-action]');
      if (!el) return;
      var action = el.getAttribute('data-action');
      if (action === 'overlayClick' && el !== ev.target) return; // only backdrop itself
      var ds = {};
      Array.prototype.forEach.call(el.attributes, function (a) {
        if (a.name.indexOf('data-') === 0) ds[a.name.slice(5)] = a.value;
      });
      handleAction(action, ds, el);
    });

    app.addEventListener('submit', function (ev) {
      var f = ev.target.closest('[data-form]');
      if (!f) return;
      ev.preventDefault();
      handleForm(f.getAttribute('data-form'), f);
    });

    app.addEventListener('change', function (ev) {
      var t = ev.target;
      if (!state.session || !state.db) return;
      var dc = t.closest ? t.closest('[data-change]') : null;
      // keep the working copy in sync so re-renders never lose typed values
      if (state.modal && state.modal.type === 'entryForm' &&
          ((t.id && t.id.indexOf('ef_') === 0) || (t.name && t.name.indexOf('it_') === 0))) {
        captureEntryForm();
      }
      if (t.name && t.name.indexOf('it_') === 0 && state.modal && state.modal.data && state.modal.data.items) {
        var i = +t.getAttribute('data-i');
        var it = state.modal.data.items[i];
        if (it) {
          var field = { it_hs: 'hsCode', it_desc: 'description', it_qty: 'qty', it_unit: 'unit', it_val: 'unitValueUsd' }[t.name];
          it[field] = (field === 'qty' || field === 'unitValueUsd') ? (t.value === '' ? '' : num(t.value)) : t.value;
          if ($('#quotePreview')) updateQuotePreview();
        }
        return;
      }
      if (!dc) return;
      var kind = dc.getAttribute('data-change');
      if (kind === 'docToggle') {
        var e = byId(state.db.entries, state.route.id);
        if (e) {
          e.docs = e.docs || {};
          e.docs[dc.getAttribute('data-key')] = t.checked;
          save(); render();
          if (CORE.docsComplete(e).ok) toast('Document checklist complete \u2014 ready to lodge.');
        }
        return;
      }
      if (kind === 'entryFilter') {
        state.f.entries[dc.getAttribute('data-k')] = t.value;
        $('#entriesResults').innerHTML = entriesResultsHTML();
        var cnt = $('#entriesCount');
        if (cnt) cnt.textContent = filteredEntries().length + ' shown';
        return;
      }
      if (kind === 'quoteFilter') {
        state.f.quotes[dc.getAttribute('data-k')] = t.value;
        $('#quotesResults').innerHTML = quotesResultsHTML();
        return;
      }
    });

    app.addEventListener('input', function (ev) {
      var t = ev.target;
      if (t.id === 'eSearch') { state.f.entries.q = t.value; $('#entriesResults').innerHTML = entriesResultsHTML(); return; }
      if (t.id === 'cSearch') { state.f.clients.q = t.value; $('#clientsResults').innerHTML = clientsResultsHTML(); return; }
      if (t.id === 'tSearch') { state.f.tariff.q = t.value; $('#tariffResults').innerHTML = tariffResultsHTML(); return; }
      if (t.id === 'qSearch') { state.f.quotes.q = t.value; $('#quotesResults').innerHTML = quotesResultsHTML(); return; }
      if (t.id === 'gSearch') return;
    });

    document.addEventListener('keydown', function (ev) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName || '');
      if (ev.key === 'Escape' && state.modal) { closeModal(); return; }
      if (!state.session) return;
      if (ev.key === '/' && !typing) {
        ev.preventDefault();
        var g = $('#gSearch'); if (g) g.focus();
        return;
      }
      if (ev.key === 'Enter' && document.activeElement && document.activeElement.id === 'gSearch') {
        state.f.entries.q = $('#gSearch').value;
        state.f.entries.status = ''; state.f.entries.client = ''; state.f.entries.mode = '';
        go('entries'); render();
        return;
      }
      if ((ev.key === 'n' || ev.key === 'N') && !typing && !state.modal) {
        ev.preventDefault();
        var r = state.route.name;
        if (r === 'entries' || r === 'entry' || r === 'dashboard') handleAction('newEntry', {});
        else if (r === 'clients') handleAction('newClient', {});
        else if (r === 'tariff') handleAction('newTariff', {});
        else if (r === 'quotes') handleAction('newQuote', {});
      }
    });

    window.addEventListener('hashchange', function () {
      state.route = routeFromHash();
      if (state.modal) state.modal = null;
      render();
    });
  }

  /* ================= render & boot ================= */
  function render() {
    var app = $('#app');
    if (!state.session || !state.db) {
      app.innerHTML = authView();
      document.title = 'ClearLink \u2014 Sign in';
      return;
    }
    var route = state.route;
    var content = '';
    if (route.name === 'dashboard') content = dashboardView();
    else if (route.name === 'entries') content = entriesView();
    else if (route.name === 'entry') content = entryDetailView(route.id);
    else if (route.name === 'clients') content = clientsView();
    else if (route.name === 'tariff') content = tariffView();
    else if (route.name === 'quotes') content = quotesView();
    else if (route.name === 'settings') content = settingsView();
    else content = dashboardView();
    app.innerHTML = shell(content);
    if (route.name === 'quotes' && state.modal && state.modal.type === 'quoteForm') updateQuotePreview();
    document.title = 'ClearLink \u2014 ' + pageTitle();
  }

  function boot() {
    var users = lsGet(K.USERS, null);
    if (!users || !users.length) { users = SEED.defaultUsers(); lsSet(K.USERS, users); }
    state.users = users;
    var sid = lsGet(K.SESSION, null);
    state.session = sid ? users.filter(function (u) { return u.id === sid; })[0] || null : null;
    loadData();
    state.route = routeFromHash();
    bindOnce();
    render();
    if (!storageOK) toast('Browser storage is unavailable \u2014 data will not persist between sessions.', true);
  }

  boot();
})();
