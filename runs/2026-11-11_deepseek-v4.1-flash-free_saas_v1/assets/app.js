/* Declarant — interface and interactions. Vanilla JS, no build step. */
(function () {
  'use strict';

  const C = window.Declarant;
  const Tests = window.DeclarantTests;
  const app = document.getElementById('app');
  const printRoot = document.getElementById('print-root');
  const now = () => new Date();
  const today = () => C.isoDate(now());

  const state = {
    data: null,
    user: null,
    route: null,
    currentRouteKey: '',
    storageWarning: '',
    storageAvailable: true,
    ui: {
      authMode: 'signin',
      authError: '',
      authNotice: '',
      authEmail: '',
      authName: '',
      sidebarOpen: false,
      entryTab: 'overview',
      notifOpen: false,
      accountOpen: false,
      paletteOpen: false,
      paletteQuery: '',
      paletteIndex: 0,
      paletteResults: [],
      diagnostics: null,
      statementPreview: null,
      reportRange: '90',
      filters: {
        entries: { q: '', tab: 'all', mode: 'all', client: 'all', sort: 'urgency' },
        disbursements: { q: '', status: 'all', type: 'all', client: 'all' },
        clients: { q: '' },
        tariff: { q: '', chapter: 'all', pref: false }
      }
    }
  };

  /* ------------------------------------------------------------------ *
   * Icons and small components
   * ------------------------------------------------------------------ */

  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="0.5"/><rect x="14" y="3" width="7" height="7" rx="0.5"/><rect x="3" y="14" width="7" height="7" rx="0.5"/><rect x="14" y="14" width="7" height="7" rx="0.5"/>',
    entries: '<path d="M6 3.5h8.5L18 7v13.5H6z"/><path d="M14 3.5V7h4"/><path d="M9 11h6M9 14.5h6M9 18h3.5"/>',
    tariff: '<path d="M4 6h16M4 12h16M4 18h9"/><circle cx="7" cy="6" r="0.6" fill="currentColor" stroke="none"/><circle cx="7" cy="12" r="0.6" fill="currentColor" stroke="none"/>',
    bank: '<rect x="3" y="6" width="18" height="13" rx="1"/><path d="M3 10h18"/><path d="M7 15h3M15 15h2"/>',
    clients: '<circle cx="9" cy="8" r="3.2"/><path d="M3.8 20c0-3.2 2.3-5.5 5.2-5.5s5.2 2.3 5.2 5.5"/><path d="M16.5 5.8a3 3 0 0 1 0 5.7M17 14.8c2.1.4 3.6 2.3 3.6 5.2"/>',
    reports: '<path d="M4 20V9M10 20V4M16 20v-7M22 20H2"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    bell: '<path d="M18 9a6 6 0 1 0-12 0c0 7-2.5 7-2.5 8.5h17C20.5 16 18 16 18 9Z"/><path d="M10 21h4"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    close: '<path d="m5 5 14 14M19 5 5 19"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    minus: '<path d="M4 12h16"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>',
    print: '<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="9" rx="1"/><path d="M7 14h10v7H7z"/>',
    chevronRight: '<path d="m9 5 7 7-7 7"/>',
    chevronDown: '<path d="m5 9 7 7 7-7"/>',
    chevronLeft: '<path d="m15 5-7 7 7 7"/>',
    arrowRight: '<path d="M4 12h16M14 6l6 6-6 6"/>',
    arrowUpRight: '<path d="M6 18 18 6M8 6h10v10"/>',
    check: '<path d="m4 12.5 5 5L20 6.5"/>',
    alert: '<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17.5h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    file: '<path d="M6 3.5h8.5L18 7v13.5H6z"/><path d="M14 3.5V7h4"/><path d="M9 11h6M9 14.5h6M9 18h3.5"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="1"/><path d="M16 8V3H4v13h4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 14h9l1-14M10 11v6M14 11v6"/>',
    edit: '<path d="m4 20 4.5-1L20 7.5 16.5 4 5 15.5 4 20Z"/><path d="m14.5 6 3.5 3.5"/>',
    dots: '<circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m4 6 8 7 8-7"/>',
    logout: '<path d="M10 4H4v16h6M14 8l4 4-4 4M8 12h10"/>',
    shield: '<path d="M12 3 4.5 6v6c0 5 3.3 8.1 7.5 9 4.2-.9 7.5-4 7.5-9V6L12 3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
    database: '<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="1"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 13h.01M9 13h.01M12 13h.01M15 13h.01M18 13h.01M7 16h10"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 21c0-4.1 3.2-6.8 7.5-6.8s7.5 2.7 7.5 6.8"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    ship: '<path d="M4 15.5 12 18l8-2.5-2-7.5H6l-2 7.5Z"/><path d="M12 10V5M8 5h8M4 19c2 1.2 4 1.2 6 0 2 1.2 4 1.2 6 0 1.3.8 2.6 1 4 .6"/>',
    plane: '<path d="m3 13 18-7-5 14-3.8-5.2L3 13Z"/><path d="m12.2 14.8 2.1-4.4"/>',
    truck: '<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18.5" r="1.6"/><circle cx="17" cy="18.5" r="1.6"/>',
    train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 10h14M9 21l2-4M15 21l-2-4"/><circle cx="9" cy="13" r=".8" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r=".8" fill="currentColor" stroke="none"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="1"/><path d="M7 10V7a5 5 0 0 1 10 0v3M12 14v3"/>',
    refresh: '<path d="M20 8a8 8 0 1 0 .5 7M20 3v5h-5"/>',
    alertCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/>',
    command: '<path d="M9 6V5a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v14a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z"/>',
    package: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
    scale: '<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7h6L5 7ZM19 7l-3 7h6l-3-7Z"/>',
    paperclip: '<path d="m20 11.5-7.6 7.6a5 5 0 0 1-7.1-7.1l8.2-8.2a3.4 3.4 0 0 1 4.8 4.8l-8.2 8.2a1.8 1.8 0 0 1-2.6-2.6l7.5-7.5"/>'
  };

  function icon(name, className) {
    return '<svg class="icon ' + (className || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  function esc(value) { return C.esc(value); }

  function initials(name) {
    return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }

  function statusMeta(id) {
    return C.STATUS_MAP[id] || { id: id, label: C.titleCase(id), short: id, hint: '' };
  }

  function statusBadge(status, extraClass) {
    const meta = statusMeta(status);
    return '<span class="status status--' + esc(status) + (extraClass ? ' ' + extraClass : '') + '"><span class="status__dot" aria-hidden="true"></span>' + esc(meta.label) + '</span>';
  }

  function modeIcon(mode, className) {
    return icon(C.MODES[mode] ? mode : 'package', className);
  }

  function avatar(user, size, dark) {
    const label = user && user.initials ? user.initials : initials(user && user.name);
    return '<span class="avatar' + (dark ? ' avatar--dark' : '') + (size ? ' avatar--' + size : '') + '" aria-hidden="true">' + esc(label) + '</span>';
  }

  function money(value, digits) { return C.money(value, 'USD', digits == null ? 0 : digits); }
  function money2(value) { return C.money(value, 'USD', 2); }

  function clientOf(entry) {
    return state.data.clients.find((c) => c.id === entry.clientId) || { name: 'Unknown client', short: 'Unknown', id: entry.clientId };
  }

  function userOf(id) {
    return state.data.users.find((u) => u.id === id) || { name: 'Unknown', initials: '?', role: 'clerk' };
  }

  function disbursementById(id) {
    return state.data.disbursements.find((d) => d.id === id);
  }

  function entryById(id) {
    return state.data.entries.find((e) => e.id === id);
  }

  function isManager() {
    return state.user && state.user.role === 'manager';
  }

  function activeEntries() {
    return state.data.entries.filter((e) => C.OPEN_STATUSES.indexOf(e.status) !== -1);
  }

  function allEntriesSorted() {
    return state.data.entries.slice().sort((a, b) => (a.id < b.id ? 1 : -1));
  }

  function pageHead(options) {
    return '<header class="page-head">' +
      '<div class="page-head__copy">' +
        '<p class="eyebrow">' + options.eyebrow + '</p>' +
        '<h1>' + options.title + '</h1>' +
        (options.lede ? '<p class="page-head__lede">' + options.lede + '</p>' : '') +
      '</div>' +
      (options.actions ? '<div class="page-head__actions">' + options.actions + '</div>' : '') +
    '</header>';
  }

  function emptyState(iconName, title, copy, action) {
    return '<div class="empty-state">' +
      '<div class="empty-state__icon">' + icon(iconName || 'file') + '</div>' +
      '<h3>' + esc(title) + '</h3>' +
      '<p>' + esc(copy) + '</p>' +
      (action || '') +
    '</div>';
  }

  function progress(value, max, className, label) {
    const pct = max > 0 ? C.clamp(Math.round((value / max) * 100), 0, 100) : 0;
    return '<div class="progress ' + (className || '') + '" role="progressbar" aria-label="' + esc(label || 'Progress') + '" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + pct + '%"></span></div>';
  }

  /* ------------------------------------------------------------------ *
   * Derived figures and attention queue
   * ------------------------------------------------------------------ */

  function entryFacts(entry) {
    const calc = C.calculateEntry(entry);
    const docs = C.docSummary(entry);
    const exposure = C.entryExposure(entry, today());
    const balance = C.entryBalance(entry, state.data.disbursements);
    return { calc: calc, docs: docs, exposure: exposure, balance: balance };
  }

  function dutyDisbursements(entry) {
    return state.data.disbursements.filter((d) => d.entryId === entry.id && d.type === 'Duty & taxes' && !d.void);
  }

  function dutyOutstanding(entry) {
    return C.round(dutyDisbursements(entry).reduce((sum, d) => sum + C.disbOutstanding(d), 0));
  }

  function totalOutstanding(entry) {
    return C.entryBalance(entry, state.data.disbursements).outstanding;
  }

  function attentionFor(entry) {
    const facts = entryFacts(entry);
    const reasons = [];
    let score = 0;
    if (entry.status === 'query') {
      score += 90;
      reasons.push({ label: 'Customs query', kind: 'query' });
    }
    if (entry.status === 'duty') {
      const outstanding = dutyOutstanding(entry);
      if (outstanding > 0.009) {
        score += 78;
        reasons.push({ label: 'Duty unpaid', kind: 'duty' });
      }
    }
    if (['intake', 'docs'].indexOf(entry.status) !== -1 && !facts.docs.complete) {
      score += 44;
      reasons.push({ label: facts.docs.missing + ' docs missing', kind: 'docs' });
    }
    if (!facts.exposure.released && facts.exposure.daysOver > 0) {
      score += 70 + Math.min(90, facts.exposure.daysOver * 6);
      reasons.push({ label: facts.exposure.daysOver + ' days over free time', kind: 'exposure' });
    }
    if (facts.exposure.state === 'due' && !facts.exposure.released) {
      score += 18;
      reasons.push({ label: 'Free time ends in ' + facts.exposure.daysRemaining + 'd', kind: 'due' });
    }
    const overdueCharges = state.data.disbursements.filter((d) => d.entryId === entry.id && !d.void && C.disbState(d, today()) === 'overdue');
    if (overdueCharges.length) {
      score += 24;
      reasons.push({ label: 'Client balance overdue', kind: 'aging' });
    }
    return { entry: entry, facts: facts, reasons: reasons, score: score };
  }

  function attentionEntries() {
    return activeEntries()
      .map(attentionFor)
      .filter((item) => item.reasons.length)
      .sort((a, b) => b.score - a.score || (a.entry.eta < b.entry.eta ? -1 : 1));
  }

  function overviewMetrics() {
    const open = activeEntries();
    const openIds = new Set(open.map((e) => e.id));
    const duty = state.data.disbursements
      .filter((d) => d.type === 'Duty & taxes' && !d.void && openIds.has(d.entryId))
      .reduce((sum, d) => sum + C.disbOutstanding(d), 0);
    const demurrage = open.reduce((sum, e) => sum + C.entryExposure(e, today()).exposure, 0);
    const receivables = state.data.entries.reduce((sum, e) => sum + totalOutstanding(e), 0);
    const aging = C.agingSummary(state.data.disbursements, today());
    const docs = state.data.entries.filter((e) => ['intake', 'docs'].indexOf(e.status) !== -1 && !C.docSummary(e).complete);
    const pastFree = open.filter((e) => C.entryExposure(e, today()).daysOver > 0);
    const dutyFiles = state.data.disbursements.filter((d) => d.type === 'Duty & taxes' && !d.void && openIds.has(d.entryId) && C.disbOutstanding(d) > 0.009);
    return {
      open: open,
      openClients: new Set(open.map((e) => e.clientId)).size,
      duty: C.round(duty),
      demurrage: C.round(demurrage),
      receivables: C.round(receivables),
      overdueReceivables: aging.overdue,
      docsFiles: docs,
      pastFree: pastFree,
      dutyFiles: dutyFiles
    };
  }

  function allAlerts() {
    const alerts = attentionEntries().map((item) => ({
      id: 'entry_' + item.entry.id,
      href: '#/entries/' + item.entry.id,
      title: item.entry.id + ' · ' + clientOf(item.entry).short,
      copy: item.reasons.map((r) => r.label).join(' · '),
      when: item.entry.eta,
      severity: item.score
    }));
    const overdue = state.data.disbursements.filter((d) => !d.void && C.disbState(d, today()) === 'overdue');
    overdue.slice(0, 3).forEach((d) => {
      alerts.push({
        id: 'disb_' + d.id,
        href: d.entryId ? '#/entries/' + d.entryId : '#/disbursements',
        title: d.ref + ' · ' + clientOf({ clientId: d.clientId }).short,
        copy: C.money(C.disbOutstanding(d), 'USD', 2) + ' overdue',
        when: d.dueDate,
        severity: 50
      });
    });
    return alerts.sort((a, b) => b.severity - a.severity).slice(0, 8);
  }

  function greeting() {
    const hour = now().getHours();
    if (hour < 5) return 'Working late';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function currentDateLong() {
    return C.fmtDate(today(), { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  /* ------------------------------------------------------------------ *
   * Boot and persistence
   * ------------------------------------------------------------------ */

  function boot() {
    const loaded = C.loadWorkspace();
    state.storageAvailable = C.storageAvailable();
    if (loaded.warning) state.storageWarning = loaded.warning;
    if (!loaded.data) {
      state.data = window.buildDeclarantSeed();
      const saved = C.saveWorkspace(state.data);
      if (!saved.ok) state.storageWarning = 'Browser storage is unavailable. Changes will last for this tab only.';
    } else {
      state.data = loaded.data;
    }
    const session = C.loadSession();
    if (session && session.userId) {
      const user = state.data.users.find((u) => u.id === session.userId && u.active !== false);
      if (user) state.user = user;
    }
    bindEvents();
    if (state.user) renderApp();
    else renderAuth();
  }

  function persist(successMessage) {
    state.data.updatedAt = new Date().toISOString();
    const result = C.saveWorkspace(state.data);
    if (!result.ok) {
      state.storageAvailable = false;
      state.storageWarning = 'Browser storage is unavailable. Changes will last for this tab only.';
    }
    if (successMessage) toast(successMessage);
  }

  function setUser(user, remember) {
    state.user = user;
    if (remember !== false) C.saveSession({ userId: user.id, at: new Date().toISOString() });
  }

  function signOut() {
    C.clearSession();
    state.user = null;
    state.route = null;
    state.currentRouteKey = '';
    state.ui.notifOpen = false;
    state.ui.accountOpen = false;
    closeModal();
    closePalette();
    renderAuth();
    toast('Signed out.');
  }

  /* ------------------------------------------------------------------ *
   * Authentication
   * ------------------------------------------------------------------ */

  function renderAuth() {
    document.body.className = 'is-auth';
    document.title = 'Declarant · Customs operations';
    const metrics = state.data ? overviewMetrics() : { open: [], pastFree: [], dutyFiles: [], docsFiles: [] };
    const manager = state.data ? state.data.users.find((u) => u.role === 'manager') : null;
    const clerk = state.data ? state.data.users.find((u) => u.role === 'clerk') : null;
    const isSignup = state.ui.authMode === 'signup';
    const logs = state.data ? state.data.entries.filter((e) => e.status === 'query').length : 0;
    const title = isSignup ? 'Create your seat.' : 'Open your desk.';
    const sub = isSignup
      ? 'A local account for this demo desk. No email will be sent, and nothing leaves this browser.'
      : 'Sign in to Meridian Customs. Everything below is live demo data, saved locally.';
    const error = state.ui.authError ? '<div class="auth-error" role="alert">' + icon('alertCircle') + '<span>' + esc(state.ui.authError) + '</span></div>' : '';
    const notice = state.ui.authNotice ? '<div class="auth-notice" role="status">' + esc(state.ui.authNotice) + '</div>' : '';

    const signinForm = '<form data-form="signin" class="auth-form" novalidate>' +
      '<label class="field"><span class="field__label">Work email</span><input class="input" type="email" name="email" id="auth-email" autocomplete="username" value="' + esc(state.ui.authEmail || '') + '" placeholder="you@company.com" required></label>' +
      '<label class="field"><span class="field__label">Password</span><span class="input-wrap"><input class="input" type="password" name="password" id="auth-password" autocomplete="current-password" placeholder="Your password" required><button type="button" class="input-action" data-act="toggle-password" aria-label="Show password">Show</button></span></label>' +
      error +
      '<button class="btn btn--primary btn--full btn--lg" type="submit">' + icon('arrowRight') + ' Sign in</button>' +
    '</form>';

    const signupForm = '<form data-form="signup" class="auth-form" novalidate>' +
      '<label class="field"><span class="field__label">Full name</span><input class="input" type="text" name="name" autocomplete="name" value="' + esc(state.ui.authName || '') + '" placeholder="Your name" required></label>' +
      '<label class="field"><span class="field__label">Work email</span><input class="input" type="email" name="email" autocomplete="email" value="' + esc(state.ui.authEmail || '') + '" placeholder="you@company.com" required></label>' +
      '<div class="field-row">' +
        '<label class="field"><span class="field__label">Password</span><input class="input" type="password" name="password" autocomplete="new-password" placeholder="8+ characters" minlength="8" required></label>' +
        '<label class="field"><span class="field__label">Confirm</span><input class="input" type="password" name="confirm" autocomplete="new-password" placeholder="Repeat password" minlength="8" required></label>' +
      '</div>' +
      '<label class="field"><span class="field__label">Role</span><select class="select" name="role"><option value="clerk">Clearance officer</option><option value="manager">Manager</option></select></label>' +
      error +
      '<button class="btn btn--primary btn--full btn--lg" type="submit">' + icon('plus') + ' Create account</button>' +
    '</form>';

    app.innerHTML = '<main class="auth">' +
      '<section class="auth-brand">' +
        '<div class="auth-brand__top">' +
          '<a class="brand brand--light" href="#/overview">' +
            '<span class="brand__mark" aria-hidden="true"><i></i><i></i><i></i></span>' +
            '<span class="brand__text">DECLARANT<span>Customs operations</span></span>' +
          '</a>' +
          '<span class="auth-brand__edition">EST. 2026 · MSA</span>' +
        '</div>' +
        '<div class="auth-brand__main">' +
          '<p class="eyebrow eyebrow--light">Meridian Customs · Mombasa</p>' +
          '<h1>Every entry.<br><em>Under control.</em></h1>' +
          '<p class="auth-brand__lede">Declarations, duty, documents and recovery. One precise desk for the work that clears cargo.</p>' +
          '<div class="auth-board">' +
            '<div class="auth-board__head"><span>Live desk</span><span>' + C.fmtDate(today(), { day: '2-digit', month: 'short' }) + '</span></div>' +
            '<div class="auth-board__row"><span class="auth-board__num">' + String(metrics.open.length).padStart(2, '0') + '</span><span>Open files</span><span class="auth-board__line"></span><span>' + metrics.openClients + ' clients</span></div>' +
            '<div class="auth-board__row"><span class="auth-board__num">' + String(metrics.pastFree.length).padStart(2, '0') + '</span><span>Past free time</span><span class="auth-board__line"></span><span>' + money(metrics.demurrage) + ' exposure</span></div>' +
            '<div class="auth-board__row"><span class="auth-board__num">' + String(logs).padStart(2, '0') + '</span><span>Customs queries</span><span class="auth-board__line"></span><span>' + metrics.dutyFiles.length + ' duty demands</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="auth-brand__foot">' +
          '<span>Mombasa · Nairobi · Namanga</span>' +
          '<span>Local-first · No cloud required</span>' +
        '</div>' +
      '</section>' +
      '<section class="auth-panel">' +
        '<div class="auth-panel__top"><span><span class="signal-dot" aria-hidden="true"></span> Systems nominal</span><span>v' + C.VERSION + '</span></div>' +
        '<div class="auth-card">' +
          '<div class="auth-card__mobile-brand">' +
            '<a class="brand" href="#/overview"><span class="brand__mark" aria-hidden="true"><i></i><i></i><i></i></span><span class="brand__text">DECLARANT<span>Customs operations</span></span></a>' +
          '</div>' +
          '<p class="eyebrow">' + (isSignup ? 'Local account' : 'Secure workspace') + '</p>' +
          '<h2>' + title + '</h2>' +
          '<p class="auth-card__lede">' + sub + '</p>' +
          notice +
          (isSignup ? signupForm : signinForm) +
          '<div class="demo-access">' +
            '<div class="demo-access__head"><span>Demo access</span><span class="mono">password · demo1234</span></div>' +
            '<button type="button" class="demo-access__row" data-act="fill-demo" data-role="manager">' +
              '<span class="demo-access__who"><span class="avatar avatar--dark">AN</span><span><strong>Amara Njoroge</strong><small>Manager</small></span></span>' +
              '<span class="demo-access__email">' + (manager ? esc(manager.email) : 'amara@meridian.co.ke') + '</span>' +
              icon('arrowRight') +
            '</button>' +
            '<button type="button" class="demo-access__row" data-act="fill-demo" data-role="clerk">' +
              '<span class="demo-access__who"><span class="avatar">DK</span><span><strong>Daniel Kimani</strong><small>Clearance officer</small></span></span>' +
              '<span class="demo-access__email">' + (clerk ? esc(clerk.email) : 'daniel@meridian.co.ke') + '</span>' +
              icon('arrowRight') +
            '</button>' +
          '</div>' +
          '<p class="auth-switch">' + (isSignup ? 'Already have a seat?' : 'Need a seat on this desk?') + ' ' +
            '<button type="button" class="link-button" data-act="auth-mode" data-mode="' + (isSignup ? 'signin' : 'signup') + '">' + (isSignup ? 'Sign in' : 'Create an account') + '</button>' +
          '</p>' +
        '</div>' +
        '<div class="auth-panel__foot"><span>© 2026 Meridian Customs</span><span>Data stays in this browser</span></div>' +
      '</section>' +
    '</main>';
  }

  function handleSignin(form) {
    const email = String(form.elements.email.value || '').trim().toLowerCase();
    const password = String(form.elements.password.value || '');
    state.ui.authEmail = email;
    state.ui.authError = '';
    const user = state.data.users.find((u) => String(u.email).toLowerCase() === email && u.active !== false);
    if (!user) {
      state.ui.authError = 'That email is not on this desk. Use a demo account below.';
      renderAuth();
      return;
    }
    if (C.hashPassword(password, user.salt) !== user.passwordHash) {
      state.ui.authError = 'That password does not match. Demo accounts use demo1234.';
      renderAuth();
      return;
    }
    setUser(user);
    state.ui.authError = '';
    state.ui.authNotice = '';
    renderApp();
    toast('Welcome back, ' + user.name.split(' ')[0] + '.');
  }

  function handleSignup(form) {
    const name = String(form.elements.name.value || '').trim();
    const email = String(form.elements.email.value || '').trim().toLowerCase();
    const password = String(form.elements.password.value || '');
    const confirm = String(form.elements.confirm.value || '');
    const role = form.elements.role.value === 'manager' ? 'manager' : 'clerk';
    const errors = [];
    if (name.length < 2) errors.push('Enter your full name.');
    if (!C.validEmail(email)) errors.push('Enter a valid email address.');
    if (state.data.users.some((u) => String(u.email).toLowerCase() === email)) errors.push('That email already has a seat. Sign in instead.');
    if (password.length < 8) errors.push('Use at least 8 characters for the password.');
    if (password !== confirm) errors.push('The passwords do not match.');
    if (errors.length) {
      state.ui.authError = errors.join(' ');
      state.ui.authName = name;
      state.ui.authEmail = email;
      renderAuth();
      return;
    }
    const user = {
      id: C.uid('usr'),
      name: name,
      initials: initials(name),
      email: email,
      role: role,
      title: role === 'manager' ? 'Manager' : 'Clearance officer',
      active: true,
      salt: C.makeSalt(16),
      createdAt: new Date().toISOString()
    };
    user.passwordHash = C.hashPassword(password, user.salt);
    state.data.users.push(user);
    persist();
    setUser(user);
    state.ui.authError = '';
    state.ui.authNotice = '';
    renderApp();
    toast('Seat created. You are signed in.');
  }

  /* ------------------------------------------------------------------ *
   * Shell
   * ------------------------------------------------------------------ */

  const NAV = [
    {
      label: 'Operations',
      items: [
        { id: 'overview', label: 'Overview', icon: 'grid' },
        { id: 'entries', label: 'Entries', icon: 'entries' },
        { id: 'tariff', label: 'Tariff schedule', icon: 'tariff' }
      ]
    },
    {
      label: 'Finance',
      items: [
        { id: 'disbursements', label: 'Disbursements', icon: 'bank' },
        { id: 'reports', label: 'Reports', icon: 'reports' }
      ]
    },
    {
      label: 'Workspace',
      items: [
        { id: 'clients', label: 'Clients', icon: 'clients' },
        { id: 'settings', label: 'Settings', icon: 'settings' }
      ]
    }
  ];

  function navCounts() {
    return {
      entries: activeEntries().length,
      disbursements: state.data.disbursements.filter((d) => !d.void && C.disbOutstanding(d) > 0.009).length
    };
  }

  function renderShell(pageHTML) {
    document.body.className = 'is-app';
    const route = state.route || { name: 'overview' };
    const counts = navCounts();
    const alerts = allAlerts();
    const user = state.user;
    const navHTML = NAV.map((group) => '<div class="nav__group">' +
      '<p class="nav__label">' + group.label + '</p>' +
      group.items.map((item) => {
        const active = route.name === item.id || (route.name === 'client' && item.id === 'clients');
        const badge = item.id === 'entries' ? counts.entries : (item.id === 'disbursements' ? counts.disbursements : null);
        return '<a class="nav__link' + (active ? ' is-active' : '') + '" href="#/' + item.id + '"' + (active ? ' aria-current="page"' : '') + '>' +
          icon(item.icon) +
          '<span>' + item.label + '</span>' +
          (badge ? '<span class="nav__count">' + badge + '</span>' : '') +
        '</a>';
      }).join('') +
    '</div>').join('');

    const notifications = state.ui.notifOpen ? '<div class="popover popover--notifications" role="dialog" aria-label="Attention queue">' +
      '<div class="popover__head"><div><p class="eyebrow">Attention queue</p><h3>' + alerts.length + ' open exception' + (alerts.length === 1 ? '' : 's') + '</h3></div><button class="icon-btn" type="button" data-act="toggle-notifications" aria-label="Close notifications">' + icon('close') + '</button></div>' +
      (alerts.length ? '<div class="popover__list">' + alerts.slice(0, 7).map((a) => '<a class="alert-row" href="' + a.href + '">' +
        '<span class="alert-row__mark">' + icon(a.id.indexOf('disb_') === 0 ? 'bank' : 'file') + '</span>' +
        '<span class="alert-row__copy"><strong>' + esc(a.title) + '</strong><small>' + esc(a.copy) + '</small></span>' +
        '<span class="alert-row__time">' + C.fmtShortDate(a.when) + '</span>' +
      '</a>').join('') + '</div>' : '<div class="popover__empty">' + icon('check') + '<p>No exceptions. The desk is clear.</p></div>') +
      '<a class="popover__foot" href="#/entries">Open the entry register ' + icon('arrowRight') + '</a>' +
    '</div>' : '';

    const account = state.ui.accountOpen ? '<div class="popover popover--account" role="dialog" aria-label="Account menu">' +
      '<div class="account-card"><span class="avatar avatar--lg avatar--dark">' + esc(user.initials) + '</span><div><strong>' + esc(user.name) + '</strong><span>' + esc(user.title || user.role) + '</span><small>' + esc(user.email) + '</small></div></div>' +
      '<div class="popover__menu">' +
        '<a href="#/settings">' + icon('user') + ' Account & settings</a>' +
        '<button type="button" data-act="open-shortcuts">' + icon('keyboard') + ' Keyboard shortcuts <kbd>?</kbd></button>' +
        '<button type="button" data-act="signout">' + icon('logout') + ' Sign out</button>' +
      '</div>' +
    '</div>' : '';

    const storage = state.storageAvailable
      ? '<span class="sidebar__status"><span class="signal-dot"></span> Saved locally</span>'
      : '<span class="sidebar__status is-warning">' + icon('alertCircle') + ' Memory only</span>';

    app.innerHTML = '<a class="skip-link" href="#main">Skip to content</a>' +
      '<div class="app-shell">' +
        '<aside class="sidebar' + (state.ui.sidebarOpen ? ' is-open' : '') + '" id="sidebar" aria-label="Workspace">' +
          '<div class="sidebar__top">' +
            '<a class="brand brand--light" href="#/overview">' +
              '<span class="brand__mark" aria-hidden="true"><i></i><i></i><i></i></span>' +
              '<span class="brand__text">DECLARANT<span>Customs operations</span></span>' +
            '</a>' +
            '<button class="icon-btn icon-btn--dark sidebar__close" type="button" data-act="close-sidebar" aria-label="Close navigation">' + icon('close') + '</button>' +
          '</div>' +
          '<nav class="nav" aria-label="Primary">' + navHTML + '</nav>' +
          '<div class="sidebar__bottom">' +
            '<div class="sidebar__org"><span class="org-mark">' + esc(state.data.org.initials || 'MC') + '</span><div><strong>' + esc(state.data.org.name) + '</strong><span>' + esc(state.data.org.address) + '</span></div></div>' +
            '<div class="sidebar__meta">' + storage + '<span class="mono">v' + C.VERSION + '</span></div>' +
          '</div>' +
        '</aside>' +
        '<button class="scrim" type="button" data-act="close-sidebar" aria-label="Close navigation" tabindex="-1"></button>' +
        '<div class="app-body">' +
          '<header class="topbar">' +
            '<div class="topbar__left">' +
              '<button class="icon-btn topbar__menu" type="button" data-act="open-sidebar" aria-label="Open navigation">' + icon('menu') + '</button>' +
              '<div class="breadcrumbs"><a href="#/overview">' + esc(state.data.org.name) + '</a><span>/</span><strong>' + esc(breadcrumb(route)) + '</strong></div>' +
            '</div>' +
            '<div class="topbar__right">' +
              '<button class="search-trigger" type="button" data-act="open-palette">' + icon('search') + '<span>Search entries, clients, HS codes</span><kbd>' + modKey() + ' K</kbd></button>' +
              '<div class="topbar__actions">' +
                '<button class="icon-btn topbar__bell" type="button" data-act="toggle-notifications" aria-expanded="' + (state.ui.notifOpen ? 'true' : 'false') + '" aria-label="Attention queue' + (alerts.length ? ', ' + alerts.length + ' open' : '') + '">' + icon('bell') + (alerts.length ? '<span class="badge-count">' + alerts.length + '</span>' : '') + '</button>' +
                '<button class="user-button" type="button" data-act="toggle-account" aria-expanded="' + (state.ui.accountOpen ? 'true' : 'false') + '">' + avatar(user, 'sm', true) + '<span>' + esc(user.name.split(' ')[0]) + '</span><span class="sr-only">Account menu</span>' + icon('chevronDown') + '</button>' +
              '</div>' +
              notifications + account +
            '</div>' +
          '</header>' +
          '<main id="main" class="main" tabindex="-1">' +
            (state.storageWarning ? '<div class="banner banner--storage" role="status">' + icon('alertCircle') + '<div><strong>Local saving is unavailable.</strong><span>' + esc(state.storageWarning) + '</span></div></div>' : '') +
            pageHTML +
          '</main>' +
        '</div>' +
      '</div>' +
      '<div id="modal-root"></div>' +
      '<div id="palette-root"></div>';

    if (state.ui.paletteOpen) renderPalette();
  }

  function breadcrumb(route) {
    if (route.name === 'entries') return 'Entries';
    if (route.name === 'entry') return route.id;
    if (route.name === 'clients') return 'Clients';
    if (route.name === 'client') return 'Client file';
    if (route.name === 'tariff') return 'Tariff schedule';
    if (route.name === 'disbursements') return 'Disbursements';
    if (route.name === 'reports') return 'Reports';
    if (route.name === 'settings') return 'Settings';
    return 'Overview';
  }

  function modKey() {
    return /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl';
  }

  /* ------------------------------------------------------------------ *
   * Routing
   * ------------------------------------------------------------------ */

  function parseRoute() {
    const raw = String(location.hash || '').replace(/^#\/?/, '');
    const clean = raw.split('?')[0];
    const parts = clean.split('/').filter(Boolean);
    if (!parts.length) return { name: 'overview', id: null };
    if (parts[0] === 'entries') return { name: parts[1] ? 'entry' : 'entries', id: parts[1] || null };
    if (parts[0] === 'clients') return { name: parts[1] ? 'client' : 'clients', id: parts[1] || null };
    if (['overview', 'tariff', 'disbursements', 'reports', 'settings'].indexOf(parts[0]) !== -1) return { name: parts[0], id: null };
    return { name: 'overview', id: null };
  }

  function navigate(path) {
    const target = '#/' + String(path).replace(/^#?\/?/, '');
    if (location.hash === target) renderApp();
    else location.hash = target;
  }

  function renderApp() {
    if (!state.user) { renderAuth(); return; }
    state.route = parseRoute();
    const routeKey = state.route.name + ':' + (state.route.id || '');
    const changed = state.currentRouteKey !== routeKey;
    let page = '';
    if (state.route.name === 'overview') page = viewOverview();
    else if (state.route.name === 'entries') page = viewEntries();
    else if (state.route.name === 'entry') page = viewEntryDetail(state.route.id);
    else if (state.route.name === 'tariff') page = viewTariff();
    else if (state.route.name === 'disbursements') page = viewDisbursements();
    else if (state.route.name === 'clients') page = viewClients();
    else if (state.route.name === 'client') page = viewClientDetail(state.route.id);
    else if (state.route.name === 'reports') page = viewReports();
    else if (state.route.name === 'settings') page = viewSettings();
    else page = viewOverview();
    renderShell(page);
    state.currentRouteKey = routeKey;
    document.title = breadcrumb(state.route) + ' · Declarant';
    if (changed) {
      window.scrollTo(0, 0);
      const main = document.getElementById('main');
      if (main) main.focus({ preventScroll: true });
    }
  }

  /* ------------------------------------------------------------------ *
   * Overview
   * ------------------------------------------------------------------ */

  function viewOverview() {
    const m = overviewMetrics();
    const attention = attentionEntries();
    const pipeline = C.PIPELINE.map((id) => ({ id: id, count: state.data.entries.filter((e) => e.status === id).length })).concat([{ id: 'query', count: state.data.entries.filter((e) => e.status === 'query').length }]);
    const totalPipeline = pipeline.reduce((sum, p) => sum + p.count, 0) || 1;
    const arrivals = activeEntries()
      .filter((e) => e.eta)
      .sort((a, b) => (a.eta < b.eta ? -1 : 1))
      .filter((e) => C.daysBetween(today(), e.eta) >= -3)
      .slice(0, 5);
    const aging = C.agingSummary(state.data.disbursements, today());
    const activity = state.data.activity.slice(0, 5);
    const briefCount = attention.length;
    const briefLine = briefCount
      ? 'There ' + (briefCount === 1 ? 'is' : 'are') + ' <strong>' + briefCount + '</strong> ' + (briefCount === 1 ? 'file' : 'files') + ' needing a decision. ' +
        (m.pastFree.length ? m.pastFree.length + ' ' + (m.pastFree.length === 1 ? 'consignment is' : 'consignments are') + ' past free time. ' : '') +
        (m.docsFiles.length ? m.docsFiles.length + ' ' + (m.docsFiles.length === 1 ? 'file is' : 'files are') + ' waiting on documents.' : '')
      : 'No exceptions on the board. Every open file is within its free period and clear of missing documents.';
    const totalReceivable = state.data.entries.reduce((sum, e) => sum + totalOutstanding(e), 0);

    return pageHead({
      eyebrow: 'Desk / ' + C.fmtDate(today(), { weekday: 'long', day: '2-digit', month: 'long' }),
      title: greeting() + ', ' + esc(state.user.name.split(' ')[0]) + '.',
      lede: 'The operational picture across ' + m.open.length + ' open ' + (m.open.length === 1 ? 'file' : 'files') + ', ' + m.openClients + ' clients and every duty position.',
      actions: '<button class="btn btn--ghost" type="button" data-act="open-palette">' + icon('search') + ' Find anything</button><button class="btn btn--primary" type="button" data-act="new-entry">' + icon('plus') + ' New entry</button>'
    }) +
    '<section class="kpi-grid" aria-label="Desk metrics">' +
      '<article class="kpi kpi--dark">' +
        '<div class="kpi__top"><span class="kpi__label">Open files</span><span class="kpi__index">01</span></div>' +
        '<div class="kpi__value">' + String(m.open.length).padStart(2, '0') + '</div>' +
        '<div class="kpi__foot"><span>' + m.openClients + ' clients</span><span class="kpi__split"><i style="width:' + Math.round((m.open.filter((e) => ['lodged', 'query', 'assessed', 'duty'].indexOf(e.status) !== -1).length / Math.max(1, m.open.length)) * 100) + '%"></i></span><span>' + m.open.filter((e) => ['lodged', 'query', 'assessed', 'duty'].indexOf(e.status) !== -1).length + ' in customs</span></div>' +
      '</article>' +
      '<article class="kpi">' +
        '<div class="kpi__top"><span class="kpi__label">Duty & tax at risk</span><span class="kpi__index">02</span></div>' +
        '<div class="kpi__value">' + money(m.duty) + '</div>' +
        '<div class="kpi__foot"><span>' + m.dutyFiles.length + ' outstanding ' + (m.dutyFiles.length === 1 ? 'demand' : 'demands') + '</span><span class="kpi__trend">' + icon('shield') + ' customs held</span></div>' +
      '</article>' +
      '<article class="kpi">' +
        '<div class="kpi__top"><span class="kpi__label">Free-time exposure</span><span class="kpi__index">03</span></div>' +
        '<div class="kpi__value">' + money(m.demurrage) + '</div>' +
        '<div class="kpi__foot"><span>' + m.pastFree.length + ' ' + (m.pastFree.length === 1 ? 'file' : 'files') + ' past free time</span><span class="kpi__trend">' + icon('clock') + ' accruing daily</span></div>' +
      '</article>' +
      '<article class="kpi">' +
        '<div class="kpi__top"><span class="kpi__label">Client receivables</span><span class="kpi__index">04</span></div>' +
        '<div class="kpi__value">' + money(totalReceivable) + '</div>' +
        '<div class="kpi__foot"><span>' + money(aging.overdue) + ' overdue</span><span class="kpi__trend">' + icon('bank') + ' across 8 clients</span></div>' +
      '</article>' +
    '</section>' +
    '<section class="overview-grid">' +
      '<article class="brief-card">' +
        '<div class="brief-card__head"><p class="eyebrow eyebrow--light">Operations brief</p><span class="brief-card__date">' + C.fmtDate(today(), { day: '2-digit', month: 'short', year: 'numeric' }) + '</span></div>' +
        '<h2>' + (briefCount ? briefCount + ' files need attention.' : 'The desk is in order.') + '</h2>' +
        '<p>' + briefLine + '</p>' +
        '<div class="brief-card__actions"><a class="btn btn--paper" href="#/entries">Review the queue ' + icon('arrowRight') + '</a><button class="btn btn--line-light" type="button" data-act="open-shortcuts">' + icon('keyboard') + ' Shortcuts</button></div>' +
        '<div class="brief-card__grid">' +
          '<div><span>Documents</span><strong>' + m.docsFiles.length + '</strong><small>files waiting</small></div>' +
          '<div><span>Customs</span><strong>' + state.data.entries.filter((e) => e.status === 'query').length + '</strong><small>queries open</small></div>' +
          '<div><span>Duty</span><strong>' + m.dutyFiles.length + '</strong><small>demands open</small></div>' +
          '<div><span>Free time</span><strong>' + m.pastFree.length + '</strong><small>files over</small></div>' +
        '</div>' +
      '</article>' +
      '<article class="card queue-card">' +
        '<div class="card__head"><div><p class="eyebrow">Priority</p><h2>Action queue</h2></div><a class="text-link" href="#/entries">All entries ' + icon('arrowRight') + '</a></div>' +
        (attention.length ? '<div class="queue-list">' + attention.slice(0, 6).map((item, index) => {
          const e = item.entry;
          const facts = item.facts;
          return '<a class="queue-row" href="#/entries/' + e.id + '">' +
            '<span class="queue-row__index">' + C.pad(index + 1) + '</span>' +
            '<span class="queue-row__main"><span class="queue-row__id">' + esc(e.id) + ' <small>' + esc(clientOf(e).short) + '</small></span><span class="queue-row__reasons">' + item.reasons.slice(0, 2).map((r) => '<span class="tag tag--' + r.kind + '">' + esc(r.label) + '</span>').join('') + '</span></span>' +
            '<span class="queue-row__metric"><strong>' + (facts.exposure.daysOver > 0 ? '+' + facts.exposure.daysOver + 'd' : (facts.calc.totals.taxes ? money(facts.calc.totals.taxes) : C.fmtShortDate(e.eta))) + '</strong><small>' + (facts.exposure.daysOver > 0 ? 'free time' : (facts.calc.totals.taxes ? 'duty & tax' : 'ETA')) + '</small></span>' +
            icon('chevronRight') +
          '</a>';
        }).join('') + '</div>' : emptyState('check', 'Queue clear', 'No entry is waiting on documents, duty, a query or free time.', '<a class="btn btn--small" href="#/entries">Open entries</a>')) +
      '</article>' +
      '<article class="card pipeline-card">' +
        '<div class="card__head"><div><p class="eyebrow">Throughput</p><h2>Entry pipeline</h2></div><span class="card__meta">' + totalPipeline + ' files</span></div>' +
        '<div class="pipeline-bar" role="img" aria-label="Entry pipeline distribution">' + pipeline.map((p) => '<span class="pipeline-bar__seg pipeline-bar__seg--' + p.id + '" style="width:' + Math.max(0.8, (p.count / totalPipeline) * 100) + '%" title="' + statusMeta(p.id).label + ': ' + p.count + '"></span>').join('') + '</div>' +
        '<div class="pipeline-legend">' + pipeline.map((p) => '<a href="#/entries" class="pipeline-legend__item"><span class="pipeline-legend__dot pipeline-legend__dot--' + p.id + '"></span><span>' + statusMeta(p.id).label + '</span><strong>' + p.count + '</strong></a>').join('') + '</div>' +
        '<div class="pipeline-foot"><div><strong>' + state.data.entries.filter((e) => e.status === 'closed').length + '</strong><span>closed files</span></div><div><strong>' + C.money(state.data.entries.reduce((sum, e) => sum + C.calculateEntry(e).totals.taxes, 0), 'USD', 0) + '</strong><span>duty & tax computed</span></div></div>' +
      '</article>' +
      '<aside class="overview-side">' +
        '<article class="card arrivals-card">' +
          '<div class="card__head"><div><p class="eyebrow">Next in</p><h2>Arrivals</h2></div><a class="text-link" href="#/entries">Register ' + icon('arrowRight') + '</a></div>' +
          (arrivals.length ? '<div class="arrival-list">' + arrivals.map((e) => {
            const ex = C.entryExposure(e, today());
            const overdue = ex.daysOver > 0;
            return '<a class="arrival-row" href="#/entries/' + e.id + '">' +
              '<span class="arrival-row__date"><strong>' + C.fmtDate(e.eta, { day: '2-digit' }) + '</strong><small>' + C.fmtDate(e.eta, { month: 'short' }) + '</small></span>' +
              '<span class="arrival-row__copy"><strong>' + esc(clientOf(e).short) + '</strong><small>' + esc(e.id) + ' · ' + esc(e.port) + '</small></span>' +
              '<span class="arrival-row__status">' + (overdue ? '<span class="tag tag--exposure">+' + ex.daysOver + 'd</span>' : statusBadge(e.status)) + '</span>' +
            '</a>';
          }).join('') + '</div>' : emptyState('calendar', 'No arrivals', 'Arrivals due in the next week will appear here.')) +
        '</article>' +
        '<article class="card aging-card">' +
          '<div class="card__head"><div><p class="eyebrow">Recovery</p><h2>Receivables aging</h2></div><a class="text-link" href="#/disbursements">Ledger ' + icon('arrowRight') + '</a></div>' +
          '<div class="aging-total"><span>Total open</span><strong>' + money(aging.total) + '</strong><small>' + money(aging.overdue) + ' overdue</small></div>' +
          '<div class="aging-bars">' + [['current', 'Current'], ['1-14', '1–14d'], ['15-30', '15–30d'], ['31-60', '31–60d'], ['60+', '60+d']].map(([key, label]) => {
            const value = aging[key] || 0;
            const pct = aging.total ? Math.round((value / aging.total) * 100) : 0;
            return '<div class="aging-row"><span class="aging-row__label">' + label + '</span><span class="aging-row__track"><i style="width:' + pct + '%"></i></span><span class="aging-row__value">' + money(value) + '</span></div>';
          }).join('') + '</div>' +
        '</article>' +
        '<article class="card activity-card">' +
          '<div class="card__head"><div><p class="eyebrow">Log</p><h2>Recent activity</h2></div><span class="card__meta">Live</span></div>' +
          (activity.length ? '<div class="activity-list">' + activity.map((a) => '<a class="activity-row" href="' + (a.entryId ? '#/entries/' + a.entryId : '#/entries') + '">' +
            '<span class="activity-row__dot" aria-hidden="true"></span>' +
            '<span class="activity-row__copy"><span>' + esc(a.text) + '</span><small>' + esc(a.meta) + ' · ' + C.relativeTime(a.at) + '</small></span>' +
          '</a>').join('') + '</div>' : emptyState('clock', 'No activity yet', 'Entry movements and payments will appear here.')) +
        '</article>' +
      '</aside>' +
    '</section>';
  }

  /* ------------------------------------------------------------------ *
   * Entries list
   * ------------------------------------------------------------------ */

  function entryFilterTabMatches(entry, tab) {
    if (tab === 'all') return true;
    if (tab === 'attention') return attentionFor(entry).reasons.length > 0;
    if (tab === 'customs') return ['lodged', 'query', 'assessed', 'duty'].indexOf(entry.status) !== -1;
    if (tab === 'clearance') return ['released', 'delivered'].indexOf(entry.status) !== -1;
    if (tab === 'closed') return entry.status === 'closed';
    return true;
  }

  function filteredEntries() {
    const f = state.ui.filters.entries;
    const q = f.q.trim().toLowerCase();
    let rows = state.data.entries.filter((entry) => {
      if (!entryFilterTabMatches(entry, f.tab)) return false;
      if (f.mode !== 'all' && entry.mode !== f.mode) return false;
      if (f.client !== 'all' && entry.clientId !== f.client) return false;
      if (!q) return true;
      const client = clientOf(entry);
      const haystack = [entry.id, entry.reference, entry.bl, entry.container, entry.carrier, entry.voyage, entry.port, entry.origin, client.name, state.data.users.find((u) => u.id === entry.ownerId)?.name].join(' ').toLowerCase();
      return haystack.indexOf(q) !== -1;
    });
    if (f.sort === 'newest') rows = rows.sort((a, b) => (a.id < b.id ? 1 : -1));
    else if (f.sort === 'eta') rows = rows.sort((a, b) => (a.eta < b.eta ? -1 : 1));
    else if (f.sort === 'value') rows = rows.sort((a, b) => C.calculateEntry(b).totals.taxes - C.calculateEntry(a).totals.taxes);
    else rows = rows.sort((a, b) => {
      const aa = attentionFor(a).score;
      const bb = attentionFor(b).score;
      if (bb !== aa) return bb - aa;
      return a.eta < b.eta ? -1 : 1;
    });
    return rows;
  }

  function entryTableBody(rows) {
    if (!rows.length) {
      return '<tr><td colspan="7">' + emptyState('search', 'No files match', 'Try a different search, tab or filter combination.', '<button class="btn btn--small" type="button" data-act="clear-entry-filters">Clear filters</button>') + '</td></tr>';
    }
    return rows.map((entry) => {
      const facts = entryFacts(entry);
      const client = clientOf(entry);
      const exposure = facts.exposure;
      const duty = facts.calc.totals.taxes;
      const docsLabel = facts.docs.complete ? 'Complete' : facts.docs.verified + '/' + facts.docs.required;
      return '<tr class="entry-row" data-href="#/entries/' + entry.id + '" tabindex="0">' +
        '<td class="cell-file"><span class="file-id">' + esc(entry.id) + '</span><span class="file-client">' + esc(client.short) + '</span><span class="file-ref">' + esc(entry.reference) + '</span></td>' +
        '<td class="cell-route"><span class="route-mode">' + modeIcon(entry.mode) + C.MODES[entry.mode].short + '</span><span class="route-copy">' + esc(entry.origin) + ' → ' + esc(entry.port) + '</span><span class="route-ref">' + esc(entry.bl) + '</span></td>' +
        '<td class="cell-date"><span>' + C.fmtDate(entry.eta, { day: '2-digit', month: 'short' }) + '</span><span class="' + (exposure.daysOver > 0 ? 'text-alert' : 'cell-sub') + '">' + (exposure.released ? 'Released' : (exposure.daysOver > 0 ? '+' + exposure.daysOver + 'd over free time' : (exposure.daysRemaining != null ? exposure.daysRemaining + 'd free time' : 'Awaiting arrival'))) + '</span></td>' +
        '<td class="cell-status">' + statusBadge(entry.status) + '<span class="cell-sub">' + C.statusAge(entry, today()) + 'd in status</span></td>' +
        '<td class="cell-docs"><span class="doc-meter"><i style="width:' + facts.docs.percent + '%"></i></span><span class="cell-sub">' + docsLabel + ' docs</span></td>' +
        '<td class="cell-money"><span>' + (duty ? money(duty) : '—') + '</span><span class="cell-sub">' + (facts.balance.outstanding ? money(facts.balance.outstanding) + ' open' : 'settled') + '</span></td>' +
        '<td class="cell-owner">' + avatar(userOf(entry.ownerId), 'sm') + '<span>' + esc(userOf(entry.ownerId).name.split(' ')[0]) + '</span>' + icon('chevronRight') + '</td>' +
      '</tr>';
    }).join('');
  }

  function entryTabs() {
    const counts = {
      all: state.data.entries.length,
      attention: state.data.entries.filter((e) => attentionFor(e).reasons.length).length,
      customs: state.data.entries.filter((e) => ['lodged', 'query', 'assessed', 'duty'].indexOf(e.status) !== -1).length,
      clearance: state.data.entries.filter((e) => ['released', 'delivered'].indexOf(e.status) !== -1).length,
      closed: state.data.entries.filter((e) => e.status === 'closed').length
    };
    const labels = { all: 'All files', attention: 'Needs attention', customs: 'In customs', clearance: 'Released', closed: 'Closed' };
    return Object.keys(labels).map((key) => '<button class="segmented__item' + (state.ui.filters.entries.tab === key ? ' is-active' : '') + '" type="button" data-act="entry-tab" data-tab="' + key + '">' + labels[key] + '<span>' + counts[key] + '</span></button>').join('');
  }

  function viewEntries() {
    const f = state.ui.filters.entries;
    const rows = filteredEntries();
    const clients = state.data.clients.filter((c) => c.status !== 'archived');
    return pageHead({
      eyebrow: 'Operations / ' + state.data.entries.length + ' files',
      title: 'Entries',
      lede: 'Every declaration, document, duty position and release in one register.',
      actions: '<button class="btn btn--ghost" type="button" data-act="export-entries">' + icon('download') + ' Export CSV</button><button class="btn btn--primary" type="button" data-act="new-entry">' + icon('plus') + ' New entry</button>'
    }) +
    '<section class="card list-card">' +
      '<div class="segmented segmented--wide" role="group" aria-label="Filter entries by status">' + entryTabs() + '</div>' +
      '<div class="filter-bar">' +
        '<label class="search-field">' + icon('search') + '<input id="entry-search" type="search" placeholder="Search entry, reference, BL or client" value="' + esc(f.q) + '" data-filter="entries.q" aria-label="Search entries"></label>' +
        '<label class="mini-select"><span>Mode</span><select data-filter="entries.mode" aria-label="Filter by mode"><option value="all">All modes</option>' + C.MODE_LIST.map((m) => '<option value="' + m.id + '"' + (f.mode === m.id ? ' selected' : '') + '>' + m.label + '</option>').join('') + '</select></label>' +
        '<label class="mini-select"><span>Client</span><select data-filter="entries.client" aria-label="Filter by client"><option value="all">All clients</option>' + clients.map((c) => '<option value="' + c.id + '"' + (f.client === c.id ? ' selected' : '') + '>' + esc(c.short) + '</option>').join('') + '</select></label>' +
        '<label class="mini-select"><span>Sort</span><select data-filter="entries.sort" aria-label="Sort entries"><option value="urgency"' + (f.sort === 'urgency' ? ' selected' : '') + '>Urgency</option><option value="newest"' + (f.sort === 'newest' ? ' selected' : '') + '>Newest</option><option value="eta"' + (f.sort === 'eta' ? ' selected' : '') + '>Arrival</option><option value="value"' + (f.sort === 'value' ? ' selected' : '') + '>Duty value</option></select></label>' +
        '<span class="filter-bar__count" id="entry-result-count">' + rows.length + ' result' + (rows.length === 1 ? '' : 's') + '</span>' +
      '</div>' +
      '<div class="table-wrap" id="entries-table-wrap">' +
        '<table class="data-table entry-table"><caption class="sr-only">Customs clearance entries</caption><thead><tr><th scope="col">File / client</th><th scope="col">Route</th><th scope="col">Arrival / free time</th><th scope="col">Status</th><th scope="col">Documents</th><th scope="col" class="align-right">Duty & tax</th><th scope="col">Owner</th></tr></thead>' +
        '<tbody id="entry-rows">' + entryTableBody(rows) + '</tbody></table>' +
      '</div>' +
      '<div class="list-foot"><span>Showing ' + rows.length + ' of ' + state.data.entries.length + ' files</span><span class="mono">USD · local workspace</span></div>' +
    '</section>';
  }

  function refreshEntryRows() {
    const rows = filteredEntries();
    const body = document.getElementById('entry-rows');
    if (body) body.innerHTML = entryTableBody(rows);
    const count = document.getElementById('entry-result-count');
    if (count) count.textContent = rows.length + ' result' + (rows.length === 1 ? '' : 's');
    const tabs = document.querySelector('.segmented--wide');
    if (tabs) tabs.innerHTML = entryTabs();
  }

  /* ------------------------------------------------------------------ *
   * Entry detail
   * ------------------------------------------------------------------ */

  function primaryAction(entry) {
    if (entry.status === 'intake' || entry.status === 'docs') return { label: 'Lodge entry', act: 'status-lodge', icon: 'arrowRight' };
    if (entry.status === 'lodged') return { label: 'Record assessment', act: 'status-assess', icon: 'file' };
    if (entry.status === 'query') return { label: 'Resolve query', act: 'status-resolve', icon: 'check' };
    if (entry.status === 'assessed') return { label: 'Raise duty demand', act: 'status-demand', icon: 'bank' };
    if (entry.status === 'duty') {
      if (dutyOutstanding(entry) > 0.009) {
        const disb = dutyDisbursements(entry).find((d) => C.disbOutstanding(d) > 0.009);
        return { label: 'Record duty payment', act: 'open-payment', id: disb ? disb.id : '', icon: 'bank' };
      }
      return { label: 'Release consignment', act: 'status-release', icon: 'check' };
    }
    if (entry.status === 'released') return { label: 'Mark delivered', act: 'status-delivered', icon: 'truck' };
    if (entry.status === 'delivered') return { label: 'Close file', act: 'status-close', icon: 'check' };
    return { label: 'Print file', act: 'print-entry', kind: 'summary', icon: 'print' };
  }

  function stepDates(entry) {
    const map = {};
    (entry.timeline || []).forEach((event) => {
      if (event.status && !map[event.status]) map[event.status] = event.at;
    });
    return map;
  }

  function pipelineStepper(entry) {
    const dates = stepDates(entry);
    let steps = C.PIPELINE.slice();
    let activeStatus = entry.status;
    if (entry.status === 'query') {
      steps.splice(steps.indexOf('lodged') + 1, 0, 'query');
      activeStatus = 'query';
    }
    const activeIndex = steps.indexOf(activeStatus);
    return '<div class="stepper" role="list" aria-label="Entry progress">' + steps.map((step, index) => {
      const meta = statusMeta(step);
      const done = index < activeIndex || entry.status === 'closed';
      const active = step === activeStatus;
      return '<div class="step' + (done ? ' is-done' : '') + (active ? ' is-active' : '') + '" role="listitem" aria-current="' + (active ? 'step' : 'false') + '">' +
        '<span class="step__dot">' + (done ? icon('check') : String(index + 1).padStart(2, '0')) + '</span>' +
        '<span class="step__copy"><strong>' + esc(meta.label) + '</strong><small>' + (dates[step] ? C.fmtShortDate(dates[step]) : '—') + '</small></span>' +
      '</div>';
    }).join('') + '</div>';
  }

  function detailAlert(entry, facts) {
    if (entry.status === 'query') {
      return '<div class="detail-alert detail-alert--strong">' + icon('alert') + '<div><strong>Customs query ' + esc(entry.query ? entry.query.ref : '') + ' is open.</strong><span>' + esc(entry.query ? entry.query.text : 'The authority has raised a query on this declaration.') + '</span></div><button class="btn btn--paper btn--small" type="button" data-act="status-resolve">Resolve query</button></div>';
    }
    if (!facts.exposure.released && facts.exposure.daysOver > 0) {
      return '<div class="detail-alert">' + icon('clock') + '<div><strong>' + facts.exposure.daysOver + ' days past free time.</strong><span>Storage and detention are accruing at ' + money(facts.exposure.daily) + ' per day. Current exposure ' + money(facts.exposure.exposure) + '.</span></div><button class="btn btn--ghost btn--small" type="button" data-act="new-disbursement" data-entry="' + entry.id + '">Add a charge</button></div>';
    }
    if (['intake', 'docs'].indexOf(entry.status) !== -1 && !facts.docs.complete) {
      return '<div class="detail-alert">' + icon('paperclip') + '<div><strong>' + facts.docs.missing + ' required documents remain.</strong><span>Lodging is blocked until every required document is verified.</span></div><button class="btn btn--ghost btn--small" type="button" data-act="entry-tab" data-tab="documents">Open checklist</button></div>';
    }
    if (entry.status === 'duty' && dutyOutstanding(entry) > 0.009) {
      return '<div class="detail-alert">' + icon('bank') + '<div><strong>Duty and taxes are unpaid.</strong><span>' + money2(dutyOutstanding(entry)) + ' remains outstanding. Release is blocked until settlement.</span></div><button class="btn btn--ghost btn--small" type="button" data-act="open-payment" data-id="' + (dutyDisbursements(entry)[0] || {}).id + '">Record payment</button></div>';
    }
    return '';
  }

  function entryMenu(entry) {
    return '<details class="menu">' +
      '<summary class="btn btn--ghost">' + icon('dots') + ' More</summary>' +
      '<div class="menu__panel">' +
        '<button type="button" data-act="edit-entry" data-id="' + entry.id + '">' + icon('edit') + ' Edit entry</button>' +
        '<button type="button" data-act="duplicate-entry" data-id="' + entry.id + '">' + icon('copy') + ' Duplicate file</button>' +
        '<button type="button" data-act="add-note" data-id="' + entry.id + '">' + icon('file') + ' Add note</button>' +
        (['intake', 'docs', 'lodged', 'assessed'].indexOf(entry.status) !== -1 ? '<button type="button" data-act="status-query" data-id="' + entry.id + '">' + icon('alertCircle') + ' Log customs query</button>' : '') +
        '<hr>' +
        '<button type="button" data-act="print-entry" data-id="' + entry.id + '" data-kind="summary">' + icon('print') + ' Entry summary</button>' +
        '<button type="button" data-act="print-entry" data-id="' + entry.id + '" data-kind="worksheet">' + icon('print') + ' Duty worksheet</button>' +
        (['released', 'delivered', 'closed'].indexOf(entry.status) !== -1 ? '<button type="button" data-act="print-entry" data-id="' + entry.id + '" data-kind="delivery">' + icon('truck') + ' Delivery order</button>' : '') +
        (isManager() ? '<hr><button type="button" class="menu__danger" data-act="delete-entry" data-id="' + entry.id + '">' + icon('trash') + ' Delete file</button>' : '') +
      '</div>' +
    '</details>';
  }

  function viewEntryDetail(id) {
    const entry = entryById(id);
    if (!entry) {
      return pageHead({ eyebrow: 'Operations', title: 'File not found', lede: 'That entry is not on this desk.' }) +
        emptyState('search', 'No such file', 'It may have been deleted or the link is incomplete.', '<a class="btn btn--primary" href="#/entries">Back to entries</a>');
    }
    const facts = entryFacts(entry);
    const client = clientOf(entry);
    const calc = facts.calc;
    const action = primaryAction(entry);
    const owner = userOf(entry.ownerId);
    const tab = ['overview', 'items', 'documents', 'activity'].indexOf(state.ui.entryTab) === -1 ? 'overview' : state.ui.entryTab;
    const status = statusMeta(entry.status);
    const dutyPaid = C.round(C.disbPaid(dutyDisbursements(entry)[0] || { amount: 0, payments: [] }));
    const outstanding = facts.balance.outstanding;

    return '<div class="detail-nav"><a class="back-link" href="#/entries">' + icon('chevronLeft') + ' Entries</a><span class="detail-nav__sep">/</span><span class="mono">' + esc(entry.id) + '</span></div>' +
    '<header class="detail-head">' +
      '<div class="detail-head__copy">' +
        '<div class="detail-head__badges">' + statusBadge(entry.status) + '<span class="detail-head__age">' + C.statusAge(entry, today()) + ' days in status</span>' + (facts.exposure.daysOver > 0 && !facts.exposure.released ? '<span class="tag tag--exposure">' + facts.exposure.daysOver + 'd over free time</span>' : '') + '</div>' +
        '<h1>' + esc(client.name) + '</h1>' +
        '<p class="detail-head__sub"><span>' + esc(entry.reference) + '</span><span>' + modeIcon(entry.mode) + ' ' + esc(C.MODES[entry.mode].label) + '</span><span>' + esc(entry.origin) + ' → ' + esc(entry.port) + '</span></p>' +
      '</div>' +
      '<div class="detail-head__actions">' +
        '<button class="btn btn--ghost" type="button" data-act="entry-tab" data-tab="documents">' + icon('paperclip') + ' Documents <span class="btn__count">' + facts.docs.verified + '/' + facts.docs.required + '</span></button>' +
        '<button class="btn btn--primary" type="button" data-act="' + action.act + '" data-id="' + entry.id + '"' + (action.id ? ' data-disb="' + action.id + '"' : '') + '>' + icon(action.icon || 'arrowRight') + ' ' + action.label + '</button>' +
        entryMenu(entry) +
      '</div>' +
    '</header>' +
    '<div class="detail-meta">' +
      '<div><span>Client</span><a href="#/clients/' + client.id + '">' + esc(client.name) + '</a></div>' +
      '<div><span>Arrival</span><strong>' + (entry.arrivalDate ? C.fmtDate(entry.arrivalDate) : 'ETA ' + C.fmtDate(entry.eta)) + '</strong></div>' +
      '<div><span>Carrier / BL</span><strong>' + esc(entry.carrier || '—') + '</strong><small>' + esc(entry.bl || '') + '</small></div>' +
      '<div><span>Owner</span><strong class="meta-user">' + avatar(owner, 'xs') + esc(owner.name) + '</strong></div>' +
      '<div><span>Customs value</span><strong>' + money2(calc.cifUsd) + '</strong></div>' +
    '</div>' +
    detailAlert(entry, facts) +
    pipelineStepper(entry) +
    '<div class="detail-grid">' +
      '<section class="card detail-main">' +
        '<div class="tabbar" role="tablist" aria-label="Entry sections">' +
          '<button class="tabbar__item' + (tab === 'overview' ? ' is-active' : '') + '" type="button" role="tab" aria-selected="' + (tab === 'overview') + '" data-act="entry-tab" data-tab="overview">Overview</button>' +
          '<button class="tabbar__item' + (tab === 'items' ? ' is-active' : '') + '" type="button" role="tab" aria-selected="' + (tab === 'items') + '" data-act="entry-tab" data-tab="items">Items & duty <span>' + calc.lines.length + '</span></button>' +
          '<button class="tabbar__item' + (tab === 'documents' ? ' is-active' : '') + '" type="button" role="tab" aria-selected="' + (tab === 'documents') + '" data-act="entry-tab" data-tab="documents">Documents <span>' + facts.docs.verified + '/' + facts.docs.required + '</span></button>' +
          '<button class="tabbar__item' + (tab === 'activity' ? ' is-active' : '') + '" type="button" role="tab" aria-selected="' + (tab === 'activity') + '" data-act="entry-tab" data-tab="activity">Activity <span>' + (entry.timeline || []).length + '</span></button>' +
        '</div>' +
        '<div class="tab-panel" id="panel-overview"' + (tab === 'overview' ? '' : ' hidden') + '>' + panelOverview(entry, facts) + '</div>' +
        '<div class="tab-panel" id="panel-items"' + (tab === 'items' ? '' : ' hidden') + '>' + panelItems(entry, facts) + '</div>' +
        '<div class="tab-panel" id="panel-documents"' + (tab === 'documents' ? '' : ' hidden') + '>' + panelDocuments(entry, facts) + '</div>' +
        '<div class="tab-panel" id="panel-activity"' + (tab === 'activity' ? '' : ' hidden') + '>' + panelActivity(entry) + '</div>' +
      '</section>' +
      '<aside class="detail-side">' +
        '<article class="card money-card">' +
          '<div class="card__head"><div><p class="eyebrow">Position</p><h2>Money</h2></div><span class="card__meta">USD</span></div>' +
          '<div class="money-rows">' +
            '<div><span>Customs duty & tax</span><strong>' + money2(calc.totals.taxes) + '</strong></div>' +
            '<div><span>Agency fee</span><strong>' + money2(calc.fee) + '</strong></div>' +
            '<div><span>Recovered</span><strong>' + money2(facts.balance.paid) + '</strong></div>' +
            '<div class="money-rows__total"><span>Outstanding</span><strong>' + money2(outstanding) + '</strong></div>' +
          '</div>' +
          '<div class="money-card__actions">' +
            '<button class="btn btn--ghost btn--small" type="button" data-act="new-disbursement" data-entry="' + entry.id + '">' + icon('plus') + ' Add charge</button>' +
            (outstanding > 0 ? '<button class="btn btn--dark btn--small" type="button" data-act="open-payments" data-entry="' + entry.id + '">' + icon('bank') + ' Payments</button>' : '<span class="settled">' + icon('check') + ' Settled</span>') +
          '</div>' +
          '<p class="money-card__note">Duty paid to ' + esc(state.data.org.taxAuthority) + ': ' + money2(dutyPaid) + (dutyOutstanding(entry) > 0 ? ' · ' + money2(dutyOutstanding(entry)) + ' still due' : ' · settled') + '</p>' +
        '</article>' +
        '<article class="card free-card' + (facts.exposure.daysOver > 0 && !facts.exposure.released ? ' is-over' : '') + '">' +
          '<div class="card__head"><div><p class="eyebrow">Clock</p><h2>Free time</h2></div>' + (facts.exposure.released ? '<span class="tag">Cleared</span>' : '<span class="tag">' + (facts.exposure.state === 'overdue' ? 'Over' : 'Running') + '</span>') + '</div>' +
          (facts.exposure.hasArrival ? '<div class="free-card__hero"><strong>' + (facts.exposure.released ? C.fmtShortDate(entry.releasedAt || entry.deliveredAt) : (facts.exposure.daysOver > 0 ? '+' + facts.exposure.daysOver : Math.max(0, facts.exposure.daysRemaining))) + '</strong><span>' + (facts.exposure.released ? 'released' : (facts.exposure.daysOver > 0 ? 'days over' : 'days left')) + '</span></div>' +
            progress(Math.min(facts.exposure.daysAtPort, Math.max(1, entry.freeDays)), Math.max(1, entry.freeDays), facts.exposure.daysOver ? 'progress--dark' : '', 'Free-time usage') +
            '<div class="free-card__rows"><div><span>Arrived</span><strong>' + C.fmtDate(facts.exposure.arrival) + '</strong></div><div><span>Free until</span><strong>' + C.fmtDate(facts.exposure.freeUntil) + '</strong></div><div><span>Daily accrual</span><strong>' + money(facts.exposure.daily) + '</strong></div><div><span>Exposure</span><strong>' + money(facts.exposure.exposure) + '</strong></div></div>' : '<p class="muted-copy">Arrival not recorded. Add an arrival date to start the free-time clock.</p>') +
          '<button class="text-link text-link--full" type="button" data-act="edit-entry" data-id="' + entry.id + '">Adjust free time ' + icon('arrowRight') + '</button>' +
        '</article>' +
        '<article class="card docs-mini">' +
          '<div class="card__head"><div><p class="eyebrow">Readiness</p><h2>Documents</h2></div><strong class="mini-stat">' + facts.docs.percent + '%</strong></div>' +
          progress(facts.docs.verified, Math.max(1, facts.docs.required), facts.docs.complete ? '' : 'progress--dark', 'Required documents verified') +
          '<p class="docs-mini__copy">' + (facts.docs.complete ? 'All ' + facts.docs.required + ' required documents verified.' : facts.docs.missing + ' of ' + facts.docs.required + ' required documents still open.') + '</p>' +
          '<button class="text-link text-link--full" type="button" data-act="entry-tab" data-tab="documents">Open checklist ' + icon('arrowRight') + '</button>' +
        '</article>' +
        '<article class="card client-mini">' +
          '<div class="client-mini__top"><span class="client-mark">' + esc(initials(client.name)) + '</span><div><strong>' + esc(client.name) + '</strong><span>' + esc(client.terms) + ' day terms</span></div></div>' +
          '<div class="client-mini__rows"><div><span>Contact</span><strong>' + esc(client.contact) + '</strong></div><div><span>Email</span><a href="mailto:' + encodeURIComponent(client.email) + '">' + esc(client.email) + '</a></div><div><span>Phone</span><strong>' + esc(client.phone) + '</strong></div></div>' +
          '<a class="text-link text-link--full" href="#/clients/' + client.id + '">Open client file ' + icon('arrowRight') + '</a>' +
        '</article>' +
      '</aside>' +
    '</div>';
  }

  function panelOverview(entry, facts) {
    const calc = facts.calc;
    const timeline = (entry.timeline || []).slice(-4).reverse();
    return '<div class="panel-section">' +
      '<div class="panel-heading"><div><p class="eyebrow">Declaration</p><h2>Shipment & customs</h2></div><button class="btn btn--ghost btn--small" type="button" data-act="edit-entry" data-id="' + entry.id + '">' + icon('edit') + ' Edit</button></div>' +
      '<div class="definition-grid">' +
        defItem('Client reference', entry.reference) +
        defItem('Transport mode', C.MODES[entry.mode].label) +
        defItem('Customs procedure', entry.procedure) +
        defItem('Incoterm', entry.incoterm) +
        defItem('Origin', entry.origin) +
        defItem('Port / border', entry.port + (entry.facility ? ' · ' + entry.facility : '')) +
        defItem('Carrier', entry.carrier || '—') +
        defItem('Voyage / flight', entry.voyage || '—') +
        defItem('Transport document', entry.bl || '—') +
        defItem('Container', entry.container || '—') +
        defItem('ETA', C.fmtDate(entry.eta)) +
        defItem('Arrival', entry.arrivalDate ? C.fmtDate(entry.arrivalDate) : 'Not recorded') +
        defItem('Invoice currency', entry.currency + ' · FX ' + entry.fxRate.toFixed(4) + ' to USD') +
        defItem('Assessment', entry.assessment ? entry.assessment.ref + ' · ' + C.fmtDate(entry.assessment.date) : 'Not assessed') +
        defItem('Declaration ref', entry.declarationRef || '—') +
        defItem('Owner', userOf(entry.ownerId).name) +
      '</div>' +
      '<div class="panel-split">' +
        '<div class="note-block"><div class="note-block__head"><p class="eyebrow">Desk note</p><button class="text-link" type="button" data-act="add-note" data-id="' + entry.id + '">Add note ' + icon('plus') + '</button></div><p>' + (entry.notes ? esc(entry.notes) : 'No desk note on this file.') + '</p></div>' +
        '<div class="basis-block"><div class="note-block__head"><p class="eyebrow">Duty basis</p><span class="mono">USD</span></div>' +
          '<div class="mini-ledger"><div><span>FOB</span><strong>' + money2(calc.fobUsd) + '</strong></div><div><span>Freight + insurance</span><strong>' + money2(calc.otherChargesUsd) + '</strong></div><div><span>CIF customs value</span><strong>' + money2(calc.cifUsd) + '</strong></div><div class="mini-ledger__total"><span>Duty & tax</span><strong>' + money2(calc.totals.taxes) + '</strong></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="panel-subhead"><p class="eyebrow">Latest movement</p><button class="text-link" type="button" data-act="entry-tab" data-tab="activity">Full activity ' + icon('arrowRight') + '</button></div>' +
      '<div class="timeline timeline--compact">' + (timeline.length ? timeline.map((event) => timelineEvent(event)).join('') : '<p class="muted-copy">No movement recorded.</p>') + '</div>' +
    '</div>';
  }

  function defItem(label, value) {
    return '<div class="def-item"><span>' + esc(label) + '</span><strong>' + esc(value == null || value === '' ? '—' : value) + '</strong></div>';
  }

  function panelItems(entry, facts) {
    const calc = facts.calc;
    return '<div class="panel-section">' +
      '<div class="panel-heading"><div><p class="eyebrow">Commodities</p><h2>' + calc.lines.length + ' line' + (calc.lines.length === 1 ? '' : 's') + ' on the declaration</h2></div><div class="button-row"><button class="btn btn--ghost btn--small" type="button" data-act="print-entry" data-id="' + entry.id + '" data-kind="worksheet">' + icon('print') + ' Worksheet</button><button class="btn btn--ghost btn--small" type="button" data-act="edit-entry" data-id="' + entry.id + '">' + icon('edit') + ' Edit items</button></div></div>' +
      '<div class="table-wrap table-wrap--flush"><table class="data-table duty-table"><caption class="sr-only">Duty computation by line</caption><thead><tr><th scope="col">HS code / goods</th><th scope="col" class="align-right">Qty</th><th scope="col" class="align-right">Unit value</th><th scope="col" class="align-right">FOB</th><th scope="col" class="align-right">CIF</th><th scope="col" class="align-right">Duty</th><th scope="col" class="align-right">Excise</th><th scope="col" class="align-right">VAT</th><th scope="col" class="align-right">Tax</th></tr></thead><tbody>' +
      calc.lines.map((line) => '<tr>' +
        '<td class="cell-goods"><span class="mono hs-code">' + esc(line.hs) + '</span><strong>' + esc(line.description) + '</strong><small>' + esc(line.origin || 'Origin not stated') + (line.prefApplied ? ' · <span class="pref-mark">' + esc(line.prefBloc || 'Preferential') + ' rate</span>' : '') + '</small></td>' +
        '<td class="align-right">' + C.num(line.qty).toLocaleString('en-US') + '<small>' + esc(line.unit) + '</small></td>' +
        '<td class="align-right">' + money2(line.unitValue) + '</td>' +
        '<td class="align-right">' + money2(line.fob * calc.fx) + '</td>' +
        '<td class="align-right">' + money2(line.cifUsd) + '</td>' +
        '<td class="align-right">' + money2(line.duty) + '<small>' + C.pct(line.appliedDutyRate) + '</small></td>' +
        '<td class="align-right">' + money2(line.excise) + '</td>' +
        '<td class="align-right">' + money2(line.vat) + '<small>' + C.pct(line.vatRate) + '</small></td>' +
        '<td class="align-right cell-strong">' + money2(line.taxes) + '</td>' +
      '</tr>').join('') +
      '</tbody><tfoot><tr><td>Totals</td><td class="align-right">' + C.num(calc.weight).toLocaleString('en-US') + '<small>kg</small></td><td></td><td class="align-right">' + money2(calc.fobUsd) + '</td><td class="align-right">' + money2(calc.cifUsd) + '</td><td class="align-right">' + money2(calc.totals.duty) + '</td><td class="align-right">' + money2(calc.totals.excise) + '</td><td class="align-right">' + money2(calc.totals.vat) + '</td><td class="align-right">' + money2(calc.totals.taxes) + '</td></tr></tfoot></table></div>' +
      '<div class="calc-notes">' +
        '<div><p class="eyebrow">Calculation basis</p><ul><li>Freight and insurance allocated pro rata by line FOB value.</li><li>Invoice currency ' + esc(entry.currency) + ' converted at ' + C.num(entry.fxRate).toFixed(4) + ' to USD.</li><li>Duty uses the tariff rate; excise is charged on CIF plus duty; VAT follows the applicable tariff line.</li>' + (calc.totals.preferenceSaving > 0 ? '<li>Preferential origin reduces duty by ' + money2(calc.totals.preferenceSaving) + ' on this entry.</li>' : '') + '</ul></div>' +
        '<div class="calc-totals"><div><span>CIF customs value</span><strong>' + money2(calc.cifUsd) + '</strong></div><div><span>Duty, excise & levies</span><strong>' + money2(calc.totals.duty + calc.totals.excise + calc.totals.levy) + '</strong></div><div><span>VAT</span><strong>' + money2(calc.totals.vat) + '</strong></div><div><span>Effective tax rate</span><strong>' + C.pct(calc.effectiveRate) + '</strong></div><div class="calc-totals__total"><span>Total duty & tax</span><strong>' + money2(calc.totals.taxes) + '</strong></div></div>' +
      '</div>' +
    '</div>';
  }

  function panelDocuments(entry, facts) {
    const required = facts.docs.list.filter((d) => d.required);
    const optional = facts.docs.list.filter((d) => !d.required);
    return '<div class="panel-section">' +
      '<div class="panel-heading"><div><p class="eyebrow">Lodgement gate</p><h2>' + facts.docs.verified + ' of ' + facts.docs.required + ' required documents verified</h2></div><div class="button-row"><button class="btn btn--ghost btn--small" type="button" data-act="doc-request" data-id="' + entry.id + '">' + icon('mail') + ' Request missing</button><button class="btn btn--ghost btn--small" type="button" data-act="edit-entry" data-id="' + entry.id + '">' + icon('plus') + ' Add a document</button></div></div>' +
      progress(facts.docs.verified, Math.max(1, facts.docs.required), facts.docs.complete ? '' : 'progress--dark', 'Required documents verified') +
      '<div class="doc-block"><div class="doc-block__head"><p class="eyebrow">Required</p><span class="mono">' + required.length + ' documents</span></div>' + required.map((d) => docRow(entry, d)).join('') + '</div>' +
      '<div class="doc-block"><div class="doc-block__head"><p class="eyebrow">Conditional & optional</p><span class="mono">' + optional.length + ' documents</span></div>' + optional.map((d) => docRow(entry, d)).join('') + '</div>' +
      '<div class="generated-block"><div class="generated-block__intro"><p class="eyebrow">Outputs</p><h3>Documents you can use</h3><p>Print or save to PDF from your browser. Every output carries the live entry data, computed duty and document status.</p></div><div class="generated-list">' +
        '<button class="generated-item" type="button" data-act="print-entry" data-id="' + entry.id + '" data-kind="worksheet"><span>' + icon('scale') + '</span><strong>Duty worksheet</strong><small>Line-by-line CIF, duty, excise and VAT</small>' + icon('arrowUpRight') + '</button>' +
        '<button class="generated-item" type="button" data-act="print-entry" data-id="' + entry.id + '" data-kind="summary"><span>' + icon('file') + '</span><strong>Entry summary</strong><small>Declaration cover sheet and audit trail</small>' + icon('arrowUpRight') + '</button>' +
        (['released', 'delivered', 'closed'].indexOf(entry.status) !== -1 ? '<button class="generated-item" type="button" data-act="print-entry" data-id="' + entry.id + '" data-kind="delivery"><span>' + icon('truck') + '</span><strong>Delivery order</strong><small>Release authority and consignee receipt</small>' + icon('arrowUpRight') + '</button>' : '') +
      '</div></div>' +
    '</div>';
  }

  function docRow(entry, doc) {
    const status = doc.status || 'missing';
    const stateLabel = status === 'verified' ? 'Verified' : (status === 'received' ? 'Received' : 'Missing');
    return '<div class="doc-row doc-row--' + status + '">' +
      '<button class="doc-row__check" type="button" data-act="doc-cycle" data-id="' + entry.id + '" data-doc="' + doc.key + '" aria-label="Update ' + esc(doc.label) + '">' + (status === 'verified' ? icon('check') : (status === 'received' ? icon('clock') : icon('plus'))) + '</button>' +
      '<div class="doc-row__copy"><strong>' + esc(doc.label) + (doc.required ? '<span class="req-mark">Required</span>' : '<span class="opt-mark">Optional</span>') + '</strong><span>' + esc(doc.hint) + '</span></div>' +
      '<span class="doc-row__status">' + stateLabel + '</span>' +
      '<button class="btn btn--ghost btn--tiny" type="button" data-act="doc-cycle" data-id="' + entry.id + '" data-doc="' + doc.key + '">' + (status === 'missing' ? 'Mark received' : (status === 'received' ? 'Verify' : 'Reopen')) + '</button>' +
    '</div>';
  }

  function timelineEvent(event) {
    const actor = userOf(event.by);
    return '<div class="timeline-event">' +
      '<span class="timeline-event__rail"><i></i></span>' +
      '<div class="timeline-event__copy"><div><strong>' + esc(event.text) + '</strong>' + (event.status ? statusBadge(event.status, 'status--tiny') : '') + '</div><small>' + esc(actor.name) + ' · ' + C.fmtDateTime(event.at) + ' <span>(' + C.relativeTime(event.at) + ')</span></small></div>' +
    '</div>';
  }

  function panelActivity(entry) {
    const events = (entry.timeline || []).slice().sort((a, b) => (a.at < b.at ? 1 : -1));
    return '<div class="panel-section">' +
      '<div class="panel-heading"><div><p class="eyebrow">Audit trail</p><h2>File activity</h2></div><button class="btn btn--ghost btn--small" type="button" data-act="add-note" data-id="' + entry.id + '">' + icon('plus') + ' Add note</button></div>' +
      '<div class="timeline">' + events.map((event) => timelineEvent(event)).join('') + '</div>' +
    '</div>';
  }

  /* ------------------------------------------------------------------ *
   * Modal helpers
   * ------------------------------------------------------------------ */

  let modalDialog = null;

  function showModal(html, options) {
    const opts = options || {};
    const root = document.getElementById('modal-root');
    if (!root) return;
    if (modalDialog) closeModal();
    root.innerHTML = '<dialog class="modal-dialog' + (opts.wide ? ' modal-dialog--wide' : '') + '" aria-labelledby="modal-title"><div class="modal-frame' + (opts.wide ? ' modal-frame--wide' : '') + '">' + html + '</div></dialog>';
    modalDialog = root.querySelector('dialog');
    const dialog = modalDialog;
    document.body.classList.add('modal-open');
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeModal();
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      if (modalDialog === dialog) {
        root.innerHTML = '';
        modalDialog = null;
      }
    });
    modalDialog.showModal();
    const focusTarget = modalDialog.querySelector('[autofocus]') || modalDialog.querySelector('input:not([type="hidden"]), select, textarea, button');
    if (focusTarget) window.setTimeout(() => focusTarget.focus(), 30);
  }

  function closeModal() {
    if (!modalDialog) return;
    const dialog = modalDialog;
    modalDialog = null;
    if (dialog.open) dialog.close();
    document.body.classList.remove('modal-open');
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
  }

  function modalHeader(eyebrow, title, copy) {
    return '<div class="modal-head"><div><p class="eyebrow">' + esc(eyebrow) + '</p><h2 id="modal-title">' + esc(title) + '</h2>' + (copy ? '<p>' + esc(copy) + '</p>' : '') + '</div><button class="icon-btn" type="button" data-act="close-modal" aria-label="Close dialog">' + icon('close') + '</button></div>';
  }

  function modalFooter(submitLabel, secondaryLabel) {
    return '<div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">' + esc(secondaryLabel || 'Cancel') + '</button><button class="btn btn--primary" type="submit">' + esc(submitLabel) + '</button></div>';
  }

  function showFormError(form, message) {
    const box = form.querySelector('[data-form-error]');
    if (!box) return;
    box.hidden = false;
    box.innerHTML = icon('alertCircle') + '<div>' + (Array.isArray(message) ? '<strong>Check these details</strong><ul>' + message.slice(0, 8).map((m) => '<li>' + esc(m) + '</li>').join('') + '</ul>' : '<span>' + esc(message) + '</span>') + '</div>';
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function inputField(o) {
    const id = o.id || ('field-' + o.name);
    return '<label class="field ' + (o.span ? 'field--span' : '') + '">' +
      '<span class="field__label">' + esc(o.label) + (o.required ? ' <em>*</em>' : '') + '</span>' +
      '<input class="input" id="' + id + '" name="' + esc(o.name) + '" type="' + esc(o.type || 'text') + '" value="' + esc(o.value == null ? '' : o.value) + '"' +
        (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') +
        (o.required ? ' required' : '') +
        (o.min != null ? ' min="' + esc(o.min) + '"' : '') +
        (o.max != null ? ' max="' + esc(o.max) + '"' : '') +
        (o.step != null ? ' step="' + esc(o.step) + '"' : '') +
        (o.list ? ' list="' + esc(o.list) + '"' : '') +
        (o.autofocus ? ' autofocus' : '') +
        (o.inputmode ? ' inputmode="' + esc(o.inputmode) + '"' : '') +
      '>' +
      (o.help ? '<span class="field__help">' + esc(o.help) + '</span>' : '') +
    '</label>';
  }

  function selectField(o) {
    return '<label class="field ' + (o.span ? 'field--span' : '') + '">' +
      '<span class="field__label">' + esc(o.label) + (o.required ? ' <em>*</em>' : '') + '</span>' +
      '<select class="select" name="' + esc(o.name) + '"' + (o.required ? ' required' : '') + (o.autofocus ? ' autofocus' : '') + '>' +
      o.options.map((opt) => {
        const value = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        return '<option value="' + esc(value) + '"' + (String(o.value) === String(value) ? ' selected' : '') + '>' + esc(label) + '</option>';
      }).join('') +
      '</select>' +
      (o.help ? '<span class="field__help">' + esc(o.help) + '</span>' : '') +
    '</label>';
  }

  function textareaField(o) {
    return '<label class="field ' + (o.span ? 'field--span' : '') + '">' +
      '<span class="field__label">' + esc(o.label) + (o.required ? ' <em>*</em>' : '') + '</span>' +
      '<textarea class="textarea" name="' + esc(o.name) + '" rows="' + (o.rows || 3) + '"' + (o.required ? ' required' : '') + (o.autofocus ? ' autofocus' : '') + ' placeholder="' + esc(o.placeholder || '') + '">' + esc(o.value || '') + '</textarea>' +
      (o.help ? '<span class="field__help">' + esc(o.help) + '</span>' : '') +
    '</label>';
  }

  /* ------------------------------------------------------------------ *
   * Entry editor
   * ------------------------------------------------------------------ */

  function nextEntryNumber() {
    return 'ENT-' + state.data.counters.entry;
  }

  function lineEditorRow(line, index) {
    const t = line && line.hs ? C.tariffFor(line.hs) : null;
    return '<div class="line-editor" data-line-row>' +
      '<div class="line-editor__head"><span class="line-editor__number">Line <strong>' + String(index + 1).padStart(2, '0') + '</strong></span><button class="icon-btn icon-btn--small" type="button" data-act="remove-line" aria-label="Remove line">' + icon('trash') + '</button></div>' +
      '<div class="line-editor__grid">' +
        '<label class="field line-editor__hs"><span class="field__label">HS code <em>*</em></span><input class="input" data-line-field="hs" list="hs-code-list" value="' + esc(line && line.hs || '') + '" placeholder="0000.00.00" autocomplete="off"><span class="field__help">' + (t ? esc(t.desc) : 'Start typing a code') + '</span></label>' +
        '<label class="field line-editor__desc"><span class="field__label">Goods description <em>*</em></span><input class="input" data-line-field="description" value="' + esc(line && line.description || '') + '" placeholder="What is moving"></label>' +
        '<label class="field"><span class="field__label">Quantity <em>*</em></span><input class="input" data-line-field="qty" type="number" min="0" step="0.01" value="' + esc(line && line.qty != null ? line.qty : 1) + '"></label>' +
        '<label class="field"><span class="field__label">Unit</span><input class="input" data-line-field="unit" value="' + esc(line && line.unit || (t ? t.unit : 'unit')) + '"></label>' +
        '<label class="field"><span class="field__label">Unit value <em>*</em></span><input class="input" data-line-field="unitValue" type="number" min="0" step="0.01" value="' + esc(line && line.unitValue != null ? line.unitValue : '') + '"></label>' +
        '<label class="field"><span class="field__label">Weight kg</span><input class="input" data-line-field="weight" type="number" min="0" step="0.01" value="' + esc(line && line.weight != null ? line.weight : '') + '"></label>' +
        '<label class="field"><span class="field__label">Origin</span><input class="input" data-line-field="origin" value="' + esc(line && line.origin || '') + '" placeholder="ISO country" maxlength="3"></label>' +
        '<label class="check-field"><input type="checkbox" data-line-field="preferential"' + (line && line.preferential ? ' checked' : '') + '><span><strong>Preferential origin</strong><small>Apply the tariff preference and require origin proof</small></span></label>' +
      '</div>' +
    '</div>';
  }

  function entryEditor(entry, options) {
    const opts = options || {};
    const isNew = !entry;
    const defaults = {
      id: nextEntryNumber(),
      clientId: opts.clientId || (state.data.clients.filter((c) => c.status !== 'archived')[0] || {}).id,
      reference: '',
      mode: 'sea',
      status: 'intake',
      origin: '',
      port: 'Mombasa',
      facility: 'Kilindini Terminal',
      carrier: '',
      voyage: '',
      bl: '',
      container: '',
      eta: C.addDays(today(), 7),
      arrivalDate: '',
      incoterm: 'CIF',
      procedure: 'Home use',
      currency: 'USD',
      fxRate: 1,
      freight: 0,
      insurance: 0,
      serviceFee: 500,
      ownerId: state.user.id,
      freeDays: state.data.org.defaultFreeDays || 5,
      storageRate: state.data.org.defaultStorageRate || 85,
      detentionRate: state.data.org.defaultDetentionRate || 150,
      notes: '',
      lines: [{ hs: '', description: '', qty: 1, unit: 'unit', unitValue: '', weight: '', origin: '', preferential: false }]
    };
    const e = isNew ? defaults : entry;
    const clients = state.data.clients.filter((c) => c.status !== 'archived' || c.id === e.clientId);
    const lines = (e.lines && e.lines.length ? e.lines : defaults.lines);
    return '<form class="modal" data-form="entry" data-id="' + esc(isNew ? '' : e.id) + '" novalidate>' +
      modalHeader(isNew ? 'New clearance file' : 'Edit ' + e.id, isNew ? 'Open an entry' : 'Amend entry', isNew ? 'Create the file, then work through documents and lodgement.' : 'Changes are recorded in the file activity.') +
      '<div class="modal-body">' +
        '<div data-form-error class="form-error" hidden></div>' +
        '<div class="form-section"><div class="form-section__head"><p class="eyebrow">01 / Parties</p><h3>Client & reference</h3></div><div class="form-grid">' +
          selectField({ label: 'Client', name: 'clientId', value: e.clientId, required: true, options: clients.map((c) => ({ value: c.id, label: c.name })) }) +
          inputField({ label: 'Client / supplier reference', name: 'reference', value: e.reference, required: true, placeholder: 'PO, invoice or file reference' }) +
          selectField({ label: 'Owner', name: 'ownerId', value: e.ownerId, options: state.data.users.filter((u) => u.active !== false).map((u) => ({ value: u.id, label: u.name + ' · ' + (u.role === 'manager' ? 'Manager' : 'Officer') })) }) +
          selectField({ label: 'Customs procedure', name: 'procedure', value: e.procedure, required: true, options: C.PROCEDURES }) +
        '</div></div>' +
        '<div class="form-section"><div class="form-section__head"><p class="eyebrow">02 / Movement</p><h3>Route & timing</h3></div><div class="form-grid">' +
          selectField({ label: 'Transport mode', name: 'mode', value: e.mode, required: true, options: C.MODE_LIST.map((m) => ({ value: m.id, label: m.label })) }) +
          selectField({ label: 'Incoterm', name: 'incoterm', value: e.incoterm, required: true, options: C.INCOTERMS }) +
          inputField({ label: 'Origin country', name: 'origin', value: e.origin, placeholder: 'e.g. Germany' }) +
          inputField({ label: 'Port or border post', name: 'port', value: e.port, required: true, placeholder: 'Mombasa, JKIA Cargo…' }) +
          inputField({ label: 'Terminal / facility', name: 'facility', value: e.facility, placeholder: 'Kilindini Terminal' }) +
          inputField({ label: 'Carrier', name: 'carrier', value: e.carrier, placeholder: 'Maersk, Lufthansa…' }) +
          inputField({ label: 'Voyage or flight', name: 'voyage', value: e.voyage, placeholder: 'Vessel / flight number' }) +
          inputField({ label: 'BL / AWB / T1', name: 'bl', value: e.bl, placeholder: 'Transport document' }) +
          inputField({ label: 'Container', name: 'container', value: e.container, placeholder: 'Container or seal number' }) +
          inputField({ label: 'ETA', name: 'eta', type: 'date', value: e.eta, required: true }) +
          inputField({ label: 'Actual arrival', name: 'arrivalDate', type: 'date', value: e.arrivalDate, help: 'Starts the free-time clock' }) +
        '</div></div>' +
        '<div class="form-section"><div class="form-section__head"><p class="eyebrow">03 / Value</p><h3>Invoice & charges</h3></div><div class="form-grid form-grid--four">' +
          selectField({ label: 'Currency', name: 'currency', value: e.currency, required: true, options: C.CURRENCIES }) +
          inputField({ label: 'FX to USD', name: 'fxRate', type: 'number', min: '0.0001', step: '0.0001', value: e.fxRate, required: true, help: '1 unit of invoice currency in USD' }) +
          inputField({ label: 'Freight', name: 'freight', type: 'number', min: '0', step: '0.01', value: e.freight, help: 'In invoice currency' }) +
          inputField({ label: 'Insurance', name: 'insurance', type: 'number', min: '0', step: '0.01', value: e.insurance, help: 'In invoice currency' }) +
          inputField({ label: 'Clearance fee', name: 'serviceFee', type: 'number', min: '0', step: '0.01', value: e.serviceFee, help: 'USD, billed to client' }) +
          inputField({ label: 'Free days', name: 'freeDays', type: 'number', min: '0', step: '1', value: e.freeDays, help: 'From arrival' }) +
          inputField({ label: 'Storage / day', name: 'storageRate', type: 'number', min: '0', step: '0.01', value: e.storageRate, help: 'USD per day' }) +
          inputField({ label: 'Detention / day', name: 'detentionRate', type: 'number', min: '0', step: '0.01', value: e.detentionRate, help: 'USD per day' }) +
        '</div></div>' +
        '<div class="form-section"><div class="form-section__head"><p class="eyebrow">04 / Commodities</p><h3>Declaration lines</h3><div class="form-section__aside"><span class="mono" data-line-count>' + lines.length + ' lines</span></div></div>' +
          '<datalist id="hs-code-list">' + C.TARIFF.map((t) => '<option value="' + t.code + '">' + esc(t.code + ' · ' + t.desc) + '</option>').join('') + '</datalist>' +
          '<div class="line-editor-list" id="line-editor-list">' + lines.map((line, index) => lineEditorRow(line, index)).join('') + '</div>' +
          '<div class="line-editor__actions"><button class="btn btn--ghost btn--small" type="button" data-act="add-line">' + icon('plus') + ' Add line</button><div class="estimate" data-estimate></div></div>' +
        '</div>' +
        textareaField({ label: 'Desk note', name: 'notes', value: e.notes, rows: 3, placeholder: 'Anything the next person needs to know…' }) +
      '</div>' +
      '<div class="modal-foot"><span class="modal-foot__meta">' + (isNew ? 'File ' + esc(defaults.id) + ' will be created' : 'All amounts in USD after FX') + '</span><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">' + (isNew ? 'Create entry' : 'Save changes') + '</button></div>' +
    '</form>';
  }

  function openEntryEditor(entry, options) {
    showModal(entryEditor(entry, options), { wide: true });
    const form = modalDialog && modalDialog.querySelector('form');
    if (!form) return;
    form.addEventListener('input', () => updateEntryEstimate(form));
    form.addEventListener('change', (event) => {
      if (event.target && event.target.name === 'currency') {
        const rates = { USD: 1, EUR: 1.084, GBP: 1.272, KES: 0.0077, ZAR: 0.054, AED: 0.2723, CNY: 0.1385, INR: 0.012 };
        const fx = form.elements.fxRate;
        if (fx) fx.value = rates[form.elements.currency.value] || 1;
      }
      updateEntryEstimate(form);
    });
    updateEntryEstimate(form);
  }

  function readLines(form) {
    return Array.from(form.querySelectorAll('[data-line-row]')).map((row) => {
      const field = (name) => {
        const el = row.querySelector('[data-line-field="' + name + '"]');
        return el ? el.value : '';
      };
      const checkbox = row.querySelector('[data-line-field="preferential"]');
      return {
        id: row.dataset.lineId || C.uid('ln'),
        hs: field('hs').trim(),
        description: field('description').trim(),
        qty: C.parseAmount(field('qty')),
        unit: field('unit').trim() || 'unit',
        unitValue: C.parseAmount(field('unitValue')),
        weight: C.parseAmount(field('weight')),
        origin: field('origin').trim().toUpperCase(),
        preferential: !!(checkbox && checkbox.checked)
      };
    });
  }

  function readEntryForm(form) {
    const value = (name) => form.elements[name] ? form.elements[name].value : '';
    return {
      id: form.dataset.id || nextEntryNumber(),
      clientId: value('clientId'),
      reference: value('reference').trim(),
      mode: value('mode'),
      status: 'intake',
      origin: value('origin').trim(),
      port: value('port').trim(),
      facility: value('facility').trim(),
      carrier: value('carrier').trim(),
      voyage: value('voyage').trim(),
      bl: value('bl').trim(),
      container: value('container').trim(),
      eta: value('eta'),
      arrivalDate: value('arrivalDate'),
      incoterm: value('incoterm'),
      procedure: value('procedure'),
      currency: value('currency'),
      fxRate: C.parseAmount(value('fxRate')),
      freight: C.parseAmount(value('freight')),
      insurance: C.parseAmount(value('insurance')),
      serviceFee: C.parseAmount(value('serviceFee')),
      ownerId: value('ownerId'),
      freeDays: C.parseAmount(value('freeDays')),
      storageRate: C.parseAmount(value('storageRate')),
      detentionRate: C.parseAmount(value('detentionRate')),
      notes: value('notes').trim(),
      lines: readLines(form)
    };
  }

  function updateEntryEstimate(form) {
    const entry = readEntryForm(form);
    const calc = C.calculateEntry(entry);
    const estimate = form.querySelector('[data-estimate]');
    const count = form.querySelector('[data-line-count]');
    if (count) count.textContent = entry.lines.length + ' line' + (entry.lines.length === 1 ? '' : 's');
    if (!estimate) return;
    estimate.innerHTML = '<span>Estimated duty & tax</span><strong>' + money2(calc.totals.taxes) + '</strong><small>CIF ' + money2(calc.cifUsd) + ' · landed ' + money2(calc.totals.landed) + '</small>';
  }

  function submitEntryForm(form) {
    const isNew = !form.dataset.id;
    const entry = readEntryForm(form);
    const existing = isNew ? null : entryById(form.dataset.id);
    const merged = existing ? Object.assign({}, existing, entry, { id: existing.id, status: existing.status }) : Object.assign({}, entry, {
      id: nextEntryNumber(),
      status: 'intake',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [],
      docs: {},
      billedAt: new Date().toISOString(),
      assessment: null,
      query: null,
      delivery: null,
      releasedAt: '',
      closedAt: ''
    });
    const validation = C.validateEntry(merged);
    if (!validation.valid) {
      showFormError(form, validation.list.map((item) => item.message));
      return;
    }
    if (!state.data.clients.some((c) => c.id === merged.clientId)) {
      showFormError(form, 'Select a client that is active on this desk.');
      return;
    }
    if (isNew) {
      C.checklist(merged).forEach((doc) => { merged.docs[doc.key] = 'missing'; });
      merged.timeline.push({
        id: C.uid('evt'), at: merged.createdAt, status: 'intake', by: state.user.id, type: 'status',
        text: 'File opened. Supplier documents requested.'
      });
      state.data.entries.push(merged);
      state.data.counters.entry += 1;
      logActivity(merged, 'File ' + merged.id + ' opened for ' + clientOf(merged).short + '.');
      closeModal();
      persist('Entry ' + merged.id + ' created.');
      state.ui.entryTab = 'documents';
      navigate('entries/' + merged.id);
    } else {
      if (!existing) { closeModal(); toast('That entry no longer exists.'); return; }
      merged.timeline = existing.timeline || [];
      merged.docs = existing.docs || {};
      merged.assessment = existing.assessment || null;
      merged.query = existing.query || null;
      merged.delivery = existing.delivery || null;
      merged.releasedAt = existing.releasedAt || '';
      merged.closedAt = existing.closedAt || '';
      merged.createdAt = existing.createdAt;
      merged.billedAt = existing.billedAt || existing.createdAt;
      merged.timeline.push({
        id: C.uid('evt'), at: new Date().toISOString(), status: existing.status, by: state.user.id, type: 'edit',
        text: 'Entry details updated.'
      });
      merged.updatedAt = new Date().toISOString();
      merged.statusSince = existing.statusSince || existing.createdAt;
      Object.keys(merged).forEach((key) => {
        if (key.indexOf('_') === 0) delete merged[key];
      });
      const index = state.data.entries.findIndex((e) => e.id === existing.id);
      state.data.entries[index] = merged;
      logActivity(merged, 'Entry ' + merged.id + ' updated.');
      closeModal();
      persist('Entry ' + merged.id + ' saved.');
      renderApp();
    }
  }

  function addLineToForm() {
    const form = modalDialog && modalDialog.querySelector('form[data-form="entry"]');
    if (!form) return;
    const list = form.querySelector('#line-editor-list');
    const index = list.querySelectorAll('[data-line-row]').length;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = lineEditorRow({ hs: '', description: '', qty: 1, unit: 'unit', unitValue: '', weight: '', origin: '', preferential: false }, index);
    list.appendChild(wrapper.firstElementChild);
    renumberLines(form);
    updateEntryEstimate(form);
    const lastHs = list.querySelector('[data-line-row]:last-child [data-line-field="hs"]');
    if (lastHs) lastHs.focus();
  }

  function renumberLines(form) {
    form.querySelectorAll('[data-line-row]').forEach((row, index) => {
      const label = row.querySelector('.line-editor__number strong');
      if (label) label.textContent = String(index + 1).padStart(2, '0');
    });
  }

  function removeLine(row) {
    const form = modalDialog && modalDialog.querySelector('form[data-form="entry"]');
    if (!form) return;
    const rows = form.querySelectorAll('[data-line-row]');
    if (rows.length <= 1) { toast('An entry needs at least one commodity line.'); return; }
    row.remove();
    renumberLines(form);
    updateEntryEstimate(form);
  }

  function onLineHsInput(input) {
    const row = input.closest('[data-line-row]');
    if (!row) return;
    const t = C.tariffFor(input.value.trim());
    const help = row.querySelector('.line-editor__hs .field__help');
    if (help) help.textContent = t ? t.desc : 'Unknown code — pick from the list';
    if (t) {
      const desc = row.querySelector('[data-line-field="description"]');
      const unit = row.querySelector('[data-line-field="unit"]');
      if (desc && !desc.value.trim()) desc.value = t.desc;
      if (unit && (!unit.value.trim() || unit.value === 'unit')) unit.value = t.unit;
    }
    const form = input.closest('form');
    if (form) updateEntryEstimate(form);
  }

  /* ------------------------------------------------------------------ *
   * Status workflows
   * ------------------------------------------------------------------ */

  function blockerModal(title, issues, entryId) {
    showModal('<div class="modal">' + modalHeader('Cannot continue', title, 'Resolve the points below before moving this file forward.') +
      '<div class="modal-body"><div class="blocker-list">' + issues.map((issue) => '<div class="blocker-item">' + icon('alertCircle') + '<span>' + esc(issue) + '</span></div>').join('') + '</div></div>' +
      '<div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Close</button><button class="btn btn--primary" type="button" data-act="entry-tab" data-tab="documents" data-close-modal="1">Review documents</button></div>' +
    '</div>');
  }

  function openLodgeModal(entry) {
    const check = C.transitionCheck(entry, 'lodged', state.data.disbursements);
    if (!check.ok) { blockerModal('Lodgement is blocked', check.issues, entry.id); return; }
    const year = now().getFullYear();
    const station = entry.port;
    showModal('<form class="modal" data-form="lodge" data-id="' + entry.id + '" novalidate>' +
      modalHeader('Lodgement', 'Lodge ' + entry.id, 'File the declaration with ' + station + '. Documents are already verified.') +
      '<div class="modal-body"><div data-form-error class="form-error" hidden></div>' +
        '<div class="confirm-summary"><div><span>Client</span><strong>' + esc(clientOf(entry).name) + '</strong></div><div><span>Goods value</span><strong>' + money2(C.calculateEntry(entry).cifUsd) + '</strong></div><div><span>Documents</span><strong>' + C.docSummary(entry).verified + ' verified</strong></div></div>' +
        '<div class="form-grid">' +
          inputField({ label: 'Declaration reference', name: 'declarationRef', value: (state.data.org.declarationPrefix || 'MCD') + '/' + year + '/' + entry.id.replace(/\D/g, ''), required: true, autofocus: true }) +
          inputField({ label: 'Lodgement date', name: 'date', type: 'date', value: today(), required: true }) +
          inputField({ label: 'Customs station', name: 'station', value: station, required: true }) +
          inputField({ label: 'Lodging officer', name: 'officer', value: state.user.name, required: true }) +
        '</div>' +
        textareaField({ label: 'Lodgement note', name: 'note', rows: 2, placeholder: 'Optional note for the file…' }) +
      '</div><div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">Lodge declaration</button></div>' +
    '</form>');
  }

  function submitLodge(form, entry) {
    const ref = form.elements.declarationRef.value.trim();
    const date = form.elements.date.value;
    if (!ref) { showFormError(form, 'A declaration reference is required.'); return; }
    if (!date) { showFormError(form, 'A lodgement date is required.'); return; }
    const check = C.transitionCheck(entry, 'lodged', state.data.disbursements);
    if (!check.ok) { closeModal(); blockerModal('Lodgement is blocked', check.issues, entry.id); return; }
    entry.status = 'lodged';
    entry.declarationRef = ref;
    entry.lodgedAt = date;
    entry.timeline.push({ id: C.uid('evt'), at: new Date().toISOString(), status: 'lodged', by: state.user.id, type: 'status', text: 'Declaration ' + ref + ' lodged at ' + form.elements.station.value.trim() + '.' });
    entry.statusSince = new Date().toISOString();
    entry.updatedAt = new Date().toISOString();
    logActivity(entry, 'Lodged ' + entry.id + ' with customs.');
    closeModal();
    persist('Declaration lodged.');
    renderApp();
  }

  function openAssessmentModal(entry) {
    const calc = C.calculateEntry(entry);
    showModal('<form class="modal" data-form="assess" data-id="' + entry.id + '" novalidate>' +
      modalHeader('Customs', 'Record assessment', 'Capture the assessment reference and amount issued by customs.') +
      '<div class="modal-body"><div data-form-error class="form-error" hidden></div>' +
        '<div class="confirm-summary"><div><span>Entry</span><strong>' + entry.id + '</strong></div><div><span>Computed duty & tax</span><strong>' + money2(calc.totals.taxes) + '</strong></div><div><span>Client</span><strong>' + esc(clientOf(entry).short) + '</strong></div></div>' +
        '<div class="form-grid">' +
          inputField({ label: 'Assessment reference', name: 'ref', value: (entry.assessment && entry.assessment.ref) || '', placeholder: 'ASM/2026/…', required: true, autofocus: true }) +
          inputField({ label: 'Assessment date', name: 'date', type: 'date', value: today(), required: true }) +
          inputField({ label: 'Assessed amount', name: 'amount', type: 'number', min: '0', step: '0.01', value: calc.totals.taxes.toFixed(2), required: true, help: 'USD, customs duty and tax' }) +
          inputField({ label: 'Customs officer', name: 'officer', value: '', placeholder: 'Officer name' }) +
        '</div>' +
        textareaField({ label: 'Assessment note', name: 'note', rows: 2, placeholder: 'Valuation notes, adjustments, dispute…' }) +
      '</div><div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">Save assessment</button></div>' +
    '</form>');
  }

  function submitAssessment(form, entry) {
    const ref = form.elements.ref.value.trim();
    const date = form.elements.date.value;
    const amount = C.parseAmount(form.elements.amount.value);
    if (!ref) { showFormError(form, 'An assessment reference is required.'); return; }
    if (!date) { showFormError(form, 'An assessment date is required.'); return; }
    if (amount < 0) { showFormError(form, 'The assessed amount cannot be negative.'); return; }
    entry.assessment = {
      ref: ref, date: date, amount: C.round(amount), officer: form.elements.officer.value.trim(), note: form.elements.note.value.trim()
    };
    entry.status = 'assessed';
    entry.timeline.push({ id: C.uid('evt'), at: new Date().toISOString(), status: 'assessed', by: state.user.id, type: 'status', text: 'Assessment ' + ref + ' received. Duty and tax assessed at ' + money2(amount) + '.' });
    entry.statusSince = new Date().toISOString();
    entry.updatedAt = new Date().toISOString();
    logActivity(entry, 'Recorded assessment ' + ref + ' for ' + entry.id + '.');
    closeModal();
    persist('Assessment recorded.');
    renderApp();
  }

  function openQueryModal(entry) {
    showModal('<form class="modal" data-form="query" data-id="' + entry.id + '" novalidate>' +
      modalHeader('Customs', 'Log a customs query', 'Record the authority reference and exactly what they have asked for.') +
      '<div class="modal-body"><div data-form-error class="form-error" hidden></div><div class="form-grid">' +
        inputField({ label: 'Query reference', name: 'ref', value: '', placeholder: 'QRY/2026/…', required: true, autofocus: true }) +
        inputField({ label: 'Customs officer', name: 'officer', value: '', placeholder: 'Officer name' }) +
        inputField({ label: 'Raised on', name: 'date', type: 'date', value: today(), required: true, span: true }) +
      '</div>' +
      textareaField({ label: 'What has customs asked for?', name: 'text', rows: 4, required: true, placeholder: 'e.g. Transaction value evidence, bank remittance, valuation report…' }) +
      '</div><div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">Log query</button></div>' +
    '</form>');
  }

  function submitQuery(form, entry) {
    const ref = form.elements.ref.value.trim();
    const text = form.elements.text.value.trim();
    if (!ref) { showFormError(form, 'A query reference is required.'); return; }
    if (text.length < 8) { showFormError(form, 'Describe what customs has requested.'); return; }
    entry.query = {
      ref: ref,
      text: text,
      raisedAt: new Date().toISOString(),
      officer: form.elements.officer.value.trim(),
      raisedBy: state.user.id
    };
    entry.status = 'query';
    entry.timeline.push({ id: C.uid('evt'), at: new Date().toISOString(), status: 'query', by: state.user.id, type: 'status', text: 'Query ' + ref + ' raised: ' + text });
    entry.statusSince = new Date().toISOString();
    entry.updatedAt = new Date().toISOString();
    logActivity(entry, 'Customs query ' + ref + ' logged on ' + entry.id + '.');
    closeModal();
    persist('Customs query logged.');
    renderApp();
  }

  function openResolveModal(entry) {
    showModal('<form class="modal" data-form="resolve" data-id="' + entry.id + '" novalidate>' +
      modalHeader('Customs', 'Resolve query', 'Record the response lodged with customs and close the query.') +
      '<div class="modal-body"><div data-form-error class="form-error" hidden></div>' +
        (entry.query ? '<div class="query-quote"><p class="eyebrow">' + esc(entry.query.ref) + '</p><p>' + esc(entry.query.text) + '</p></div>' : '') +
        textareaField({ label: 'Resolution note', name: 'note', rows: 4, required: true, autofocus: true, placeholder: 'What was provided and what did customs accept?' }) +
        '<div class="form-grid">' + inputField({ label: 'Resolved on', name: 'date', type: 'date', value: today(), required: true }) + inputField({ label: 'Response reference', name: 'ref', value: '', placeholder: 'Optional letter or upload ref' }) + '</div>' +
      '</div><div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">Resolve & return to lodged</button></div>' +
    '</form>');
  }

  function submitResolve(form, entry) {
    const note = form.elements.note.value.trim();
    if (note.length < 5) { showFormError(form, 'Add a resolution note.'); return; }
    entry.query = Object.assign({}, entry.query || {}, {
      resolvedAt: new Date().toISOString(),
      resolution: note,
      resolutionRef: form.elements.ref.value.trim()
    });
    entry.timeline.push({ id: C.uid('evt'), at: new Date().toISOString(), status: 'lodged', by: state.user.id, type: 'status', text: 'Query resolved. Response lodged: ' + note });
    entry.status = 'lodged';
    entry.statusSince = new Date().toISOString();
    entry.updatedAt = new Date().toISOString();
    logActivity(entry, 'Resolved the customs query on ' + entry.id + '.');
    closeModal();
    persist('Query resolved. The file is back with customs.');
    renderApp();
  }

  function openDemandModal(entry) {
    const calc = C.calculateEntry(entry);
    const assessmentAmount = entry.assessment ? entry.assessment.amount : calc.totals.taxes;
    const existing = dutyDisbursements(entry).find((d) => !d.void);
    if (existing) { toast('A duty demand already exists for this entry.'); return; }
    showModal('<form class="modal" data-form="demand" data-id="' + entry.id + '" novalidate>' +
      modalHeader('Duty', 'Raise duty demand', 'Create the customs charge and issue it to the client for settlement.') +
      '<div class="modal-body"><div data-form-error class="form-error" hidden></div>' +
        '<div class="demand-breakdown">' +
          '<div><span>Duty</span><strong>' + money2(calc.totals.duty) + '</strong></div><div><span>Excise</span><strong>' + money2(calc.totals.excise) + '</strong></div><div><span>Levies</span><strong>' + money2(calc.totals.levy) + '</strong></div><div><span>VAT</span><strong>' + money2(calc.totals.vat) + '</strong></div><div class="demand-breakdown__total"><span>Total demand</span><strong>' + money2(calc.totals.taxes) + '</strong></div>' +
        '</div>' +
        '<div class="form-grid">' +
          inputField({ label: 'Demand amount', name: 'amount', type: 'number', min: '0', step: '0.01', value: assessmentAmount.toFixed(2), required: true }) +
          inputField({ label: 'Client due date', name: 'dueDate', type: 'date', value: C.addDays(today(), 5), required: true, help: 'Collect from client by this date' }) +
          inputField({ label: 'Paid to', name: 'paidTo', value: state.data.org.taxAuthority, required: true, span: true }) +
        '</div>' +
        textareaField({ label: 'Note to client', name: 'note', rows: 2, placeholder: 'Reference the assessment and payment instructions…' }) +
      '</div><div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">Issue demand</button></div>' +
    '</form>');
  }

  function submitDemand(form, entry) {
    const amount = C.parseAmount(form.elements.amount.value);
    const dueDate = form.elements.dueDate.value;
    if (!(amount >= 0)) { showFormError(form, 'Enter a valid demand amount.'); return; }
    if (!dueDate) { showFormError(form, 'Choose a client due date.'); return; }
    if (dutyDisbursements(entry).some((d) => !d.void)) { showFormError(form, 'A duty demand already exists.'); return; }
    const seq = state.data.counters.disbursement++;
    const disb = {
      id: 'dsb_' + seq,
      ref: 'DIS-' + seq,
      entryId: entry.id,
      clientId: entry.clientId,
      type: 'Duty & taxes',
      description: 'Customs duty, excise, VAT and levies — ' + entry.id,
      amount: C.round(amount),
      incurredDate: today(),
      dueDate: dueDate,
      paidTo: form.elements.paidTo.value.trim() || state.data.org.taxAuthority,
      receiptNo: '',
      billable: true,
      void: false,
      createdAt: new Date().toISOString(),
      payments: [],
      notes: form.elements.note.value.trim()
    };
    state.data.disbursements.push(disb);
    entry.status = 'duty';
    entry.timeline.push({ id: C.uid('evt'), at: new Date().toISOString(), status: 'duty', by: state.user.id, type: 'status', text: 'Duty demand ' + disb.ref + ' issued for ' + money2(amount) + ', due ' + C.fmtDate(dueDate) + '.' });
    entry.statusSince = new Date().toISOString();
    entry.updatedAt = new Date().toISOString();
    logActivity(entry, 'Raised duty demand ' + disb.ref + ' for ' + entry.id + '.');
    closeModal();
    persist('Duty demand issued.');
    renderApp();
  }

  function openPaymentModal(disbId) {
    const disb = disbursementById(disbId);
    if (!disb) { toast('Charge not found.'); return; }
    const outstanding = C.disbOutstanding(disb);
    showModal('<form class="modal" data-form="payment" data-disb="' + disb.id + '" novalidate>' +
      modalHeader('Recovery', 'Record payment', disb.ref + ' · ' + C.money(disb.amount, 'USD', 2)) +
      '<div class="modal-body"><div data-form-error class="form-error" hidden></div>' +
        '<div class="confirm-summary"><div><span>Client</span><strong>' + esc(clientOf({ clientId: disb.clientId }).name) + '</strong></div><div><span>Outstanding</span><strong>' + C.money(outstanding, 'USD', 2) + '</strong></div><div><span>Due</span><strong>' + C.fmtDate(disb.dueDate) + '</strong></div></div>' +
        '<div class="form-grid">' +
          inputField({ label: 'Payment amount', name: 'amount', type: 'number', min: '0.01', max: outstanding.toFixed(2), step: '0.01', value: outstanding.toFixed(2), required: true, autofocus: true }) +
          inputField({ label: 'Payment date', name: 'date', type: 'date', value: today(), required: true }) +
          selectField({ label: 'Method', name: 'method', value: 'Bank transfer', options: ['Bank transfer', 'M-Pesa', 'Cheque', 'Cash', 'Offset'] }) +
          inputField({ label: 'Receipt / reference', name: 'ref', value: '', placeholder: 'Bank or receipt reference' }) +
        '</div>' +
        textareaField({ label: 'Payment note', name: 'note', rows: 2 }) +
      '</div><div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">Record payment</button></div>' +
    '</form>');
  }

  function submitPayment(form) {
    const disb = disbursementById(form.dataset.disb);
    if (!disb) { showFormError(form, 'That charge no longer exists.'); return; }
    const amount = C.parseAmount(form.elements.amount.value);
    const date = form.elements.date.value;
    const outstanding = C.disbOutstanding(disb);
    if (!(amount > 0)) { showFormError(form, 'Enter a payment amount above zero.'); return; }
    if (amount - outstanding > 0.009) { showFormError(form, 'The payment exceeds the outstanding balance.'); return; }
    if (!date) { showFormError(form, 'Choose the payment date.'); return; }
    if (!Array.isArray(disb.payments)) disb.payments = [];
    disb.payments.push({
      id: C.uid('pay'), date: date, amount: C.round(amount), method: form.elements.method.value, ref: form.elements.ref.value.trim()
    });
    const entry = entryById(disb.entryId);
    if (entry) {
      entry.timeline.push({ id: C.uid('evt'), at: new Date().toISOString(), status: entry.status, by: state.user.id, type: 'payment', text: 'Payment of ' + money2(amount) + ' recorded against ' + disb.ref + '.' });
      entry.updatedAt = new Date().toISOString();
      logActivity(entry, 'Payment of ' + money2(amount) + ' recorded for ' + disb.ref + '.');
    }
    closeModal();
    persist('Payment recorded.');
    renderApp();
  }

  function openReleaseModal(entry) {
    const check = C.transitionCheck(entry, 'released', state.data.disbursements);
    if (!check.ok) { blockerModal('Release is blocked', check.issues, entry.id); return; }
    showModal('<form class="modal" data-form="release" data-id="' + entry.id + '" novalidate>' +
      modalHeader('Release', 'Release consignment', 'Record the customs release reference and release the cargo to the client.') +
      '<div class="modal-body"><div data-form-error class="form-error" hidden></div>' +
        '<div class="confirm-summary"><div><span>Entry</span><strong>' + entry.id + '</strong></div><div><span>Duty</span><strong>Paid</strong></div><div><span>Client</span><strong>' + esc(clientOf(entry).short) + '</strong></div></div>' +
        '<div class="form-grid">' +
          inputField({ label: 'Release date', name: 'date', type: 'date', value: today(), required: true }) +
          inputField({ label: 'Release reference', name: 'ref', value: (entry.assessment && entry.assessment.ref ? entry.assessment.ref : ''), placeholder: 'Customs release number', required: true, autofocus: true }) +
          inputField({ label: 'Released to', name: 'releasedTo', value: clientOf(entry).contact, required: true, span: true }) +
        '</div>' +
        textareaField({ label: 'Release note', name: 'note', rows: 2 }) +
      '</div><div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">Confirm release</button></div>' +
    '</form>');
  }

  function submitRelease(form, entry) {
    const check = C.transitionCheck(entry, 'released', state.data.disbursements);
    if (!check.ok) { closeModal(); blockerModal('Release is blocked', check.issues, entry.id); return; }
    const date = form.elements.date.value;
    const ref = form.elements.ref.value.trim();
    if (!date) { showFormError(form, 'Choose the release date.'); return; }
    if (!ref) { showFormError(form, 'Add the release reference.'); return; }
    entry.status = 'released';
    entry.releasedAt = date;
    entry.releaseRef = ref;
    entry.releasedTo = form.elements.releasedTo.value.trim();
    entry.billedAt = date;
    entry.timeline.push({ id: C.uid('evt'), at: new Date().toISOString(), status: 'released', by: state.user.id, type: 'status', text: 'Customs release ' + ref + ' granted to ' + entry.releasedTo + '.' });
    entry.statusSince = new Date().toISOString();
    entry.updatedAt = new Date().toISOString();
    logActivity(entry, 'Released ' + entry.id + ' to ' + entry.releasedTo + '.');
    closeModal();
    persist('Consignment released.');
    renderApp();
  }

  function openDeliveredModal(entry) {
    showModal('<form class="modal" data-form="delivered" data-id="' + entry.id + '" novalidate>' +
      modalHeader('Delivery', 'Mark delivered', 'Capture proof of delivery. This closes the port clock.') +
      '<div class="modal-body"><div data-form-error class="form-error" hidden></div><div class="form-grid">' +
        inputField({ label: 'Recipient', name: 'recipient', value: clientOf(entry).contact, required: true, autofocus: true }) +
        inputField({ label: 'Delivery date', name: 'date', type: 'date', value: today(), required: true }) +
        inputField({ label: 'POD reference', name: 'ref', value: '', placeholder: 'Proof of delivery number', required: true, span: true }) +
      '</div>' + textareaField({ label: 'Delivery note', name: 'note', rows: 2 }) +
      '</div><div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">Confirm delivery</button></div>' +
    '</form>');
  }

  function submitDelivered(form, entry) {
    const recipient = form.elements.recipient.value.trim();
    const date = form.elements.date.value;
    const ref = form.elements.ref.value.trim();
    if (!recipient) { showFormError(form, 'Add the recipient.'); return; }
    if (!date) { showFormError(form, 'Choose the delivery date.'); return; }
    if (!ref) { showFormError(form, 'Add the proof of delivery reference.'); return; }
    entry.delivery = { recipient: recipient, date: date, ref: ref, note: form.elements.note.value.trim() };
    entry.status = 'delivered';
    entry.deliveredAt = date;
    entry.timeline.push({ id: C.uid('evt'), at: new Date().toISOString(), status: 'delivered', by: state.user.id, type: 'status', text: 'Cargo delivered to ' + recipient + ' under ' + ref + '.' });
    entry.statusSince = new Date().toISOString();
    entry.updatedAt = new Date().toISOString();
    logActivity(entry, 'Delivered ' + entry.id + ' to ' + recipient + '.');
    closeModal();
    persist('Delivery recorded.');
    renderApp();
  }

  function openCloseModal(entry) {
    const outstanding = totalOutstanding(entry);
    showModal('<form class="modal" data-form="close" data-id="' + entry.id + '" novalidate>' +
      modalHeader('Close file', 'Close ' + entry.id, 'Reconcile the operational file. Financial balances stay on the client ledger.') +
      '<div class="modal-body"><div data-form-error class="form-error" hidden></div>' +
        (outstanding > 0.009 ? '<div class="close-warning">' + icon('alertCircle') + '<div><strong>' + money2(outstanding) + ' is still outstanding.</strong><span>Closing the file does not write off the client balance. It will remain in receivables.</span></div></div>' : '<div class="confirm-summary"><div><span>Balance</span><strong>Settled</strong></div><div><span>Documents</span><strong>' + C.docSummary(entry).verified + ' verified</strong></div><div><span>Status</span><strong>Delivered</strong></div></div>') +
        textareaField({ label: 'Close note', name: 'note', rows: 3, placeholder: 'Reconciliation note, credit note reference…' }) +
      '</div><div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">Close file</button></div>' +
    '</form>');
  }

  function submitClose(form, entry) {
    const note = form.elements.note.value.trim();
    entry.status = 'closed';
    entry.closedAt = today();
    entry.timeline.push({ id: C.uid('evt'), at: new Date().toISOString(), status: 'closed', by: state.user.id, type: 'status', text: 'File reconciled and closed.' + (note ? ' ' + note : '') });
    entry.statusSince = new Date().toISOString();
    entry.updatedAt = new Date().toISOString();
    logActivity(entry, 'Closed ' + entry.id + '.');
    closeModal();
    persist('File closed.');
    renderApp();
  }

  function openNoteModal(entry) {
    showModal('<form class="modal" data-form="note" data-id="' + entry.id + '" novalidate>' +
      modalHeader('Desk note', 'Add a note', entry.id + ' · ' + clientOf(entry).short) +
      '<div class="modal-body"><div data-form-error class="form-error" hidden></div>' +
        textareaField({ label: 'Note', name: 'note', rows: 5, required: true, autofocus: true, placeholder: 'What should the next person know?' }) +
      '</div><div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">Add note</button></div>' +
    '</form>');
  }

  function submitNote(form, entry) {
    const note = form.elements.note.value.trim();
    if (note.length < 2) { showFormError(form, 'Write a note before saving.'); return; }
    entry.timeline.push({ id: C.uid('evt'), at: new Date().toISOString(), status: entry.status, by: state.user.id, type: 'note', text: note });
    entry.updatedAt = new Date().toISOString();
    entry.notes = entry.notes ? entry.notes + '\n' + note : note;
    logActivity(entry, 'Note added to ' + entry.id + '.');
    closeModal();
    persist('Note added.');
    renderApp();
  }

  function cycleDocument(entry, key) {
    const current = (entry.docs && entry.docs[key]) || 'missing';
    const next = current === 'missing' ? 'received' : (current === 'received' ? 'verified' : 'missing');
    entry.docs = entry.docs || {};
    entry.docs[key] = next;
    entry.timeline.push({
      id: C.uid('evt'), at: new Date().toISOString(), status: entry.status, by: state.user.id, type: 'document',
      text: (C.DOC_DEFS[key] ? C.DOC_DEFS[key].label : key) + ' marked ' + next + '.'
    });
    entry.updatedAt = new Date().toISOString();
    persist();
    renderApp();
    toast((C.DOC_DEFS[key] ? C.DOC_DEFS[key].label : 'Document') + ' · ' + next + '.');
  }

  function openDocRequest(entry) {
    const missing = C.docSummary(entry).list.filter((d) => d.required && d.status !== 'verified');
    const client = clientOf(entry);
    const body = 'Dear ' + client.contact + ',\n\nWe are preparing ' + entry.id + ' (' + entry.reference + ') for lodgement and need the following documents verified:\n\n' +
      (missing.length ? missing.map((d) => '— ' + d.label + (d.status === 'received' ? ' (received, pending verification)' : '')).join('\n') : '— No documents outstanding.') +
      '\n\nPlease send them at your earliest convenience so we can avoid free-time charges.\n\nRegards,\n' + state.user.name + '\n' + state.data.org.name + '\n' + state.data.org.phone;
    showModal('<div class="modal">' + modalHeader('Document request', missing.length + ' document' + (missing.length === 1 ? '' : 's') + ' outstanding', 'Copy this request into email or your client channel.') +
      '<div class="modal-body"><div class="request-meta"><span>To</span><strong>' + esc(client.contact) + ' · ' + esc(client.email) + '</strong></div><pre class="request-copy" id="doc-request-text">' + esc(body) + '</pre></div>' +
      '<div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Close</button><a class="btn btn--ghost" href="mailto:' + encodeURIComponent(client.email) + '?subject=' + encodeURIComponent('Documents required · ' + entry.id) + '&body=' + encodeURIComponent(body) + '">' + icon('mail') + ' Open email</a><button class="btn btn--primary" type="button" data-act="copy-doc-request">' + icon('copy') + ' Copy request</button></div>' +
    '</div>');
  }

  /* ------------------------------------------------------------------ *
   * Client, tariff, finance, report and settings views follow
   * ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ *
   * Clients
   * ------------------------------------------------------------------ */

  function clientFacts(client) {
    const entries = state.data.entries.filter((e) => e.clientId === client.id);
    const open = entries.filter((e) => C.OPEN_STATUSES.indexOf(e.status) !== -1);
    const disbs = state.data.disbursements.filter((d) => d.clientId === client.id && !d.void);
    const outstanding = entries.reduce((sum, e) => sum + totalOutstanding(e), 0);
    const lifetimeTax = entries.reduce((sum, e) => sum + C.calculateEntry(e).totals.taxes, 0);
    const aging = C.agingSummary(disbs, today());
    return {
      entries: entries,
      open: open,
      disbs: disbs,
      outstanding: C.round(outstanding),
      lifetimeTax: C.round(lifetimeTax),
      aging: aging,
      creditUsed: client.creditLimit > 0 ? Math.round((outstanding / client.creditLimit) * 100) : 0,
      lastEntry: entries.slice().sort((a, b) => (a.id < b.id ? 1 : -1))[0]
    };
  }

  function filteredClients() {
    const q = state.ui.filters.clients.q.trim().toLowerCase();
    return state.data.clients.filter((client) => {
      if (!q) return true;
      const facts = clientFacts(client);
      return [client.name, client.contact, client.email, client.phone, client.address, facts.lastEntry ? facts.lastEntry.id : ''].join(' ').toLowerCase().indexOf(q) !== -1;
    }).sort((a, b) => clientFacts(b).outstanding - clientFacts(a).outstanding || a.name.localeCompare(b.name));
  }

  function clientTableBody(rows) {
    if (!rows.length) return '<tr><td colspan="6">' + emptyState('search', 'No clients match', 'Try a different name, contact or email.', '<button class="btn btn--small" type="button" data-act="clear-client-filters">Clear search</button>') + '</td></tr>';
    return rows.map((client) => {
      const facts = clientFacts(client);
      return '<tr class="entry-row" data-href="#/clients/' + client.id + '" tabindex="0">' +
        '<td class="cell-client"><span class="client-mark client-mark--sm">' + esc(initials(client.name)) + '</span><span class="file-client">' + esc(client.name) + '<small>' + esc(client.contact) + ' · ' + esc(client.email) + '</small></span></td>' +
        '<td><span>' + client.terms + ' days</span><span class="cell-sub">' + money(client.creditLimit) + ' limit</span></td>' +
        '<td><span>' + facts.open.length + ' open</span><span class="cell-sub">' + facts.entries.length + ' total files</span></td>' +
        '<td class="cell-money"><span>' + money(facts.outstanding) + '</span><span class="cell-sub">' + (facts.aging.overdue ? money(facts.aging.overdue) + ' overdue' : 'current') + '</span></td>' +
        '<td class="cell-credit"><span class="doc-meter"><i style="width:' + Math.min(100, facts.creditUsed) + '%"></i></span><span class="cell-sub">' + facts.creditUsed + '% of limit</span></td>' +
        '<td><span>' + (facts.lastEntry ? esc(facts.lastEntry.id) : '—') + '</span><span class="cell-sub">' + (facts.lastEntry ? C.fmtShortDate(facts.lastEntry.createdAt) : 'No files') + '</span></td>' +
      '</tr>';
    }).join('');
  }

  function viewClients() {
    const rows = filteredClients();
    const facts = state.data.clients.map(clientFacts);
    const outstanding = facts.reduce((sum, f) => sum + f.outstanding, 0);
    const overdue = facts.reduce((sum, f) => sum + f.aging.overdue, 0);
    const active = state.data.clients.filter((c) => c.status !== 'archived').length;
    return pageHead({
      eyebrow: 'Directory / ' + active + ' active clients',
      title: 'Clients',
      lede: 'The commercial picture behind the declarations: terms, exposure and every file in one place.',
      actions: '<button class="btn btn--ghost" type="button" data-act="open-palette">' + icon('search') + ' Find a client</button><button class="btn btn--primary" type="button" data-act="new-client">' + icon('plus') + ' New client</button>'
    }) +
    '<section class="stat-strip">' +
      '<div><span>Active clients</span><strong>' + active + '</strong></div>' +
      '<div><span>Total receivables</span><strong>' + money(outstanding) + '</strong></div>' +
      '<div><span>Overdue</span><strong>' + money(overdue) + '</strong></div>' +
      '<div><span>Average terms</span><strong>' + Math.round(state.data.clients.reduce((sum, c) => sum + C.num(c.terms), 0) / Math.max(1, state.data.clients.length)) + 'd</strong></div>' +
    '</section>' +
    '<section class="card list-card">' +
      '<div class="filter-bar filter-bar--top"><label class="search-field">' + icon('search') + '<input id="client-search" type="search" placeholder="Search name, contact, email or file" value="' + esc(state.ui.filters.clients.q) + '" data-filter="clients.q" aria-label="Search clients"></label><span class="filter-bar__count" id="client-count">' + rows.length + ' client' + (rows.length === 1 ? '' : 's') + '</span></div>' +
      '<div class="table-wrap" id="clients-table-wrap"><table class="data-table"><caption class="sr-only">Client directory</caption><thead><tr><th scope="col">Client</th><th scope="col">Terms / limit</th><th scope="col">Files</th><th scope="col" class="align-right">Receivables</th><th scope="col">Credit used</th><th scope="col">Last file</th></tr></thead><tbody id="client-rows">' + clientTableBody(rows) + '</tbody></table></div>' +
    '</section>';
  }

  function refreshClientRows() {
    const rows = filteredClients();
    const body = document.getElementById('client-rows');
    if (body) body.innerHTML = clientTableBody(rows);
    const count = document.getElementById('client-count');
    if (count) count.textContent = rows.length + ' client' + (rows.length === 1 ? '' : 's');
  }

  function clientEntryTable(entries) {
    if (!entries.length) return emptyState('file', 'No files yet', 'Open an entry for this client to start the relationship.', '<button class="btn btn--small" type="button" data-act="new-entry">New entry</button>');
    return '<div class="table-wrap table-wrap--flush"><table class="data-table"><caption class="sr-only">Client entries</caption><thead><tr><th scope="col">File</th><th scope="col">Route</th><th scope="col">Status</th><th scope="col">Arrival</th><th scope="col" class="align-right">Duty & tax</th><th scope="col" class="align-right">Balance</th></tr></thead><tbody>' +
      entries.slice().sort((a, b) => (a.id < b.id ? 1 : -1)).map((entry) => {
        const facts = entryFacts(entry);
        return '<tr class="entry-row" data-href="#/entries/' + entry.id + '" tabindex="0"><td><span class="file-id">' + entry.id + '</span><span class="cell-sub">' + esc(entry.reference) + '</span></td><td><span>' + modeIcon(entry.mode) + ' ' + C.MODES[entry.mode].short + '</span><span class="cell-sub">' + esc(entry.port) + '</span></td><td>' + statusBadge(entry.status) + '</td><td><span>' + C.fmtShortDate(entry.eta) + '</span><span class="cell-sub">' + (facts.exposure.daysOver > 0 && !facts.exposure.released ? '+' + facts.exposure.daysOver + 'd over' : C.fmtDate(entry.eta, { year: 'numeric' })) + '</span></td><td class="align-right">' + money(facts.calc.totals.taxes) + '</td><td class="align-right">' + money(facts.balance.outstanding) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function viewClientDetail(id) {
    const client = state.data.clients.find((c) => c.id === id);
    if (!client) {
      return pageHead({ eyebrow: 'Clients', title: 'Client not found', lede: 'That client is not in this workspace.' }) + emptyState('search', 'No such client', 'The link may be old or the client may have been removed.', '<a class="btn btn--primary" href="#/clients">Back to clients</a>');
    }
    const facts = clientFacts(client);
    const recentDisbs = facts.disbs.slice().sort((a, b) => (a.incurredDate < b.incurredDate ? 1 : -1)).slice(0, 6);
    const openEntries = facts.entries.filter((e) => C.OPEN_STATUSES.indexOf(e.status) !== -1);
    return '<div class="detail-nav"><a class="back-link" href="#/clients">' + icon('chevronLeft') + ' Clients</a><span class="detail-nav__sep">/</span><span class="mono">' + client.id + '</span></div>' +
    '<header class="detail-head client-head">' +
      '<div class="detail-head__copy"><div class="detail-head__badges"><span class="tag">' + (client.status === 'archived' ? 'Archived' : 'Active client') + '</span><span class="detail-head__age">Since ' + C.fmtDate(client.since, { month: 'short', year: 'numeric' }) + '</span></div><h1>' + esc(client.name) + '</h1><p class="detail-head__sub"><span>' + esc(client.contact) + '</span><span>' + esc(client.email) + '</span><span>' + esc(client.phone) + '</span></p></div>' +
      '<div class="detail-head__actions"><button class="btn btn--ghost" type="button" data-act="edit-client" data-id="' + client.id + '">' + icon('edit') + ' Edit</button><button class="btn btn--ghost" type="button" data-act="open-statement" data-client="' + client.id + '">' + icon('print') + ' Statement</button><button class="btn btn--primary" type="button" data-act="new-entry" data-client="' + client.id + '">' + icon('plus') + ' New entry</button><details class="menu"><summary class="btn btn--ghost">' + icon('dots') + '</summary><div class="menu__panel">' + (isManager() ? (client.status === 'archived' ? '<button type="button" data-act="restore-client" data-id="' + client.id + '">' + icon('refresh') + ' Restore client</button>' : '<button type="button" data-act="archive-client" data-id="' + client.id + '">' + icon('lock') + ' Archive client</button>') : '') + (isManager() && !facts.entries.length ? '<button type="button" class="menu__danger" data-act="delete-client" data-id="' + client.id + '">' + icon('trash') + ' Delete client</button>' : '') + '</div></details></div>' +
    '</header>' +
    '<div class="client-stats">' +
      '<div><span>Open files</span><strong>' + facts.open.length + '</strong><small>' + facts.entries.length + ' lifetime</small></div>' +
      '<div><span>Receivables</span><strong>' + money(facts.outstanding) + '</strong><small>' + money(facts.aging.overdue) + ' overdue</small></div>' +
      '<div><span>Lifetime duty & tax</span><strong>' + money(facts.lifetimeTax) + '</strong><small>computed on all files</small></div>' +
      '<div><span>Credit used</span><strong>' + facts.creditUsed + '%</strong><small>' + money(client.creditLimit) + ' limit</small></div>' +
    '</div>' +
    '<div class="client-grid">' +
      '<div class="client-main">' +
        '<article class="card"><div class="card__head"><div><p class="eyebrow">Operations</p><h2>Open files</h2></div><button class="btn btn--ghost btn--small" type="button" data-act="new-entry" data-client="' + client.id + '">' + icon('plus') + ' New entry</button></div>' + clientEntryTable(openEntries) + '</article>' +
        '<article class="card"><div class="card__head"><div><p class="eyebrow">Recovery</p><h2>Recent charges</h2></div><a class="text-link" href="#/disbursements">Full ledger ' + icon('arrowRight') + '</a></div>' +
          (recentDisbs.length ? '<div class="table-wrap table-wrap--flush"><table class="data-table"><caption class="sr-only">Recent client charges</caption><thead><tr><th scope="col">Charge</th><th scope="col">Entry</th><th scope="col">Due</th><th scope="col" class="align-right">Amount</th><th scope="col" class="align-right">Outstanding</th><th scope="col">Status</th></tr></thead><tbody>' + recentDisbs.map((d) => {
            const st = C.disbState(d, today());
            return '<tr class="entry-row" data-href="#/disbursements" tabindex="0"><td><span class="mono">' + esc(d.ref) + '</span><span class="cell-sub">' + esc(d.type) + '</span></td><td><span class="mono">' + esc(d.entryId) + '</span></td><td>' + C.fmtDate(d.dueDate) + '</td><td class="align-right">' + money2(d.amount) + '</td><td class="align-right">' + money2(C.disbOutstanding(d)) + '</td><td>' + disbBadge(st) + '</td></tr>';
          }).join('') + '</tbody></table></div>' : emptyState('bank', 'No charges', 'Duty and operational charges will appear here.')) +
        '</article>' +
        '<article class="card"><div class="card__head"><div><p class="eyebrow">All files</p><h2>File history</h2></div><span class="card__meta">' + facts.entries.length + ' files</span></div>' + clientEntryTable(facts.entries) + '</article>' +
      '</div>' +
      '<aside class="client-side">' +
        '<article class="card"><div class="card__head"><div><p class="eyebrow">Profile</p><h2>Contact & terms</h2></div><span class="client-mark">' + esc(initials(client.name)) + '</span></div><div class="client-profile"><div><span>Contact</span><strong>' + esc(client.contact) + '</strong></div><div><span>Email</span><a href="mailto:' + encodeURIComponent(client.email) + '">' + esc(client.email) + '</a></div><div><span>Phone</span><strong>' + esc(client.phone) + '</strong></div><div><span>Address</span><strong>' + esc(client.address) + '</strong></div><div><span>Terms</span><strong>' + client.terms + ' days</strong></div><div><span>Credit limit</span><strong>' + money(client.creditLimit) + '</strong></div></div>' + progress(facts.outstanding, Math.max(1, client.creditLimit), facts.creditUsed > 80 ? 'progress--dark' : '', 'Credit limit used') + '<p class="profile-caption">' + facts.creditUsed + '% of credit limit used</p></article>' +
        '<article class="card"><div class="card__head"><div><p class="eyebrow">Recovery</p><h2>Aging</h2></div><span class="card__meta">' + money(facts.aging.total) + '</span></div><div class="aging-bars aging-bars--compact">' + [['current', 'Current'], ['1-14', '1–14d'], ['15-30', '15–30d'], ['31-60', '31–60d'], ['60+', '60+d']].map(([key, label]) => {
          const value = facts.aging[key] || 0;
          const pct = facts.aging.total ? Math.round((value / facts.aging.total) * 100) : 0;
          return '<div class="aging-row"><span class="aging-row__label">' + label + '</span><span class="aging-row__track"><i style="width:' + pct + '%"></i></span><span class="aging-row__value">' + money(value) + '</span></div>';
        }).join('') + '</div></article>' +
        '<article class="card"><div class="card__head"><div><p class="eyebrow">Relationship</p><h2>Desk note</h2></div><button class="text-link" type="button" data-act="edit-client" data-id="' + client.id + '">Edit</button></div><p class="client-note">' + (client.notes ? esc(client.notes) : 'No relationship note yet.') + '</p><button class="text-link text-link--full" type="button" data-act="open-statement" data-client="' + client.id + '">Generate statement ' + icon('arrowRight') + '</button></article>' +
      '</aside>' +
    '</div>';
  }

  function openClientForm(client, options) {
    const isNew = !client;
    const c = client || {
      id: 'CL-' + C.pad(state.data.counters.client, 3), name: '', contact: '', email: '', phone: '', address: '',
      terms: 30, creditLimit: 50000, status: 'active', since: today(), notes: ''
    };
    showModal('<form class="modal" data-form="client" data-id="' + (isNew ? '' : c.id) + '" novalidate>' +
      modalHeader(isNew ? 'Directory' : 'Client file', isNew ? 'New client' : 'Edit ' + c.name, isNew ? 'Open a commercial file for a new importer.' : 'Update contact and credit terms.') +
      '<div class="modal-body"><div data-form-error class="form-error" hidden></div>' +
        '<div class="form-grid">' +
          inputField({ label: 'Legal name', name: 'name', value: c.name, required: true, autofocus: true }) +
          inputField({ label: 'Contact person', name: 'contact', value: c.contact, required: true }) +
          inputField({ label: 'Email', name: 'email', type: 'email', value: c.email, required: true }) +
          inputField({ label: 'Phone', name: 'phone', value: c.phone }) +
          inputField({ label: 'Address', name: 'address', value: c.address, span: true }) +
          inputField({ label: 'Payment terms (days)', name: 'terms', type: 'number', min: '0', step: '1', value: c.terms, required: true }) +
          inputField({ label: 'Credit limit (USD)', name: 'creditLimit', type: 'number', min: '0', step: '1000', value: c.creditLimit, required: true }) +
          inputField({ label: 'Client since', name: 'since', type: 'date', value: c.since }) +
          selectField({ label: 'Status', name: 'status', value: c.status, options: [{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }] }) +
        '</div>' +
        textareaField({ label: 'Relationship note', name: 'notes', value: c.notes, rows: 3 }) +
      '</div><div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">' + (isNew ? 'Create client' : 'Save client') + '</button></div>' +
    '</form>');
  }

  function submitClient(form) {
    const isNew = !form.dataset.id;
    const client = {
      id: form.dataset.id || ('CL-' + C.pad(state.data.counters.client, 3)),
      name: form.elements.name.value.trim(),
      contact: form.elements.contact.value.trim(),
      email: form.elements.email.value.trim().toLowerCase(),
      phone: form.elements.phone.value.trim(),
      address: form.elements.address.value.trim(),
      terms: C.parseAmount(form.elements.terms.value),
      creditLimit: C.parseAmount(form.elements.creditLimit.value),
      since: form.elements.since.value || today(),
      status: form.elements.status.value,
      notes: form.elements.notes.value.trim()
    };
    const issues = [];
    if (client.name.length < 2) issues.push('Add the client name.');
    if (client.contact.length < 2) issues.push('Add a contact person.');
    if (!C.validEmail(client.email)) issues.push('Enter a valid email address.');
    if (client.terms < 0) issues.push('Terms cannot be negative.');
    if (client.creditLimit < 0) issues.push('Credit limit cannot be negative.');
    if (issues.length) { showFormError(form, issues); return; }
    if (isNew) {
      state.data.clients.push(client);
      state.data.counters.client += 1;
      logActivity(null, 'Client ' + client.name + ' added to the directory.');
      closeModal();
      persist('Client created.');
      navigate('clients/' + client.id);
    } else {
      const index = state.data.clients.findIndex((c) => c.id === client.id);
      state.data.clients[index] = client;
      closeModal();
      persist('Client saved.');
      renderApp();
    }
  }

  function archiveClient(clientId, restore) {
    const client = state.data.clients.find((c) => c.id === clientId);
    if (!client) return;
    if (!isManager()) { toast('Only a manager can change client status.'); return; }
    client.status = restore ? 'active' : 'archived';
    closeModal();
    persist(restore ? 'Client restored.' : 'Client archived.');
    renderApp();
  }

  function confirmDeleteClient(client) {
    const facts = clientFacts(client);
    if (facts.entries.length) { toast('This client has files. Archive the client instead.'); return; }
    if (!isManager()) { toast('Only a manager can delete a client.'); return; }
    showModal('<div class="modal">' + modalHeader('Directory', 'Delete client?', 'This permanently removes ' + client.name + ' from this local workspace.') +
      '<div class="modal-body"><div class="close-warning">' + icon('alertCircle') + '<div><strong>This cannot be undone.</strong><span>The client has no entries, so no operational history will be lost.</span></div></div></div>' +
      '<div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="button" data-act="confirm-delete-client" data-id="' + client.id + '">Delete client</button></div>' +
    '</div>');
  }

  /* ------------------------------------------------------------------ *
   * Tariff
   * ------------------------------------------------------------------ */

  function filteredTariff() {
    const f = state.ui.filters.tariff;
    const q = f.q.trim().toLowerCase();
    return C.TARIFF.filter((t) => {
      if (f.chapter !== 'all' && t.chapter !== f.chapter) return false;
      if (f.pref && t.prefDuty == null) return false;
      if (!q) return true;
      return [t.code, t.desc, t.notes, C.CHAPTER_NAMES[t.chapter] || ''].join(' ').toLowerCase().indexOf(q) !== -1;
    });
  }

  function tariffBody(rows) {
    if (!rows.length) return '<tr><td colspan="8">' + emptyState('search', 'No tariff lines match', 'Try a different HS code or chapter.', '<button class="btn btn--small" type="button" data-act="clear-tariff-filters">Clear filters</button>') + '</td></tr>';
    return rows.map((t) => '<tr class="tariff-row" data-code="' + t.code + '">' +
      '<td><span class="mono hs-code">' + t.code + '</span></td>' +
      '<td class="cell-goods"><strong>' + esc(t.desc) + '</strong><small>' + esc(t.notes) + '</small></td>' +
      '<td><span>' + C.pad(t.chapter) + '</span><span class="cell-sub">' + esc(C.CHAPTER_NAMES[t.chapter] || '') + '</span></td>' +
      '<td class="align-right"><strong>' + C.pct(t.duty) + '</strong>' + (t.prefDuty != null ? '<span class="cell-sub pref-text">' + C.pct(t.prefDuty) + ' ' + esc(t.prefBloc) + '</span>' : '') + '</td>' +
      '<td class="align-right">' + (t.excise ? C.pct(t.excise) : '—') + '</td>' +
      '<td class="align-right">' + C.pct(t.vat) + '</td>' +
      '<td class="align-right">' + (t.levy ? C.pct(t.levy) : '—') + '</td>' +
      '<td>' + (t.permit ? '<span class="tag tag--docs">Permit</span>' : '') + (t.dangerous ? '<span class="tag tag--query">DG</span>' : '') + (!t.permit && !t.dangerous ? '<span class="cell-sub">Open</span>' : '') + '</td>' +
    '</tr>').join('');
  }

  function quickEstimateMarkup() {
    return '<div class="quick-calc">' +
      '<div class="quick-calc__head"><div><p class="eyebrow">Calculator</p><h2>Duty estimator</h2></div><span class="tag">CIF basis</span></div>' +
      '<div class="quick-calc__fields">' +
        '<label class="field"><span class="field__label">HS code</span><select class="select" id="quick-hs">' + C.TARIFF.map((t) => '<option value="' + t.code + '"' + (t.code === '8703.23.00' ? ' selected' : '') + '>' + t.code + ' · ' + esc(t.desc) + '</option>').join('') + '</select></label>' +
        '<label class="field"><span class="field__label">CIF value (USD)</span><input class="input" id="quick-cif" type="number" min="0" step="100" value="25000"></label>' +
        '<label class="check-field check-field--inline"><input type="checkbox" id="quick-pref"><span><strong>Preferential</strong><small>Use treaty rate</small></span></label>' +
      '</div>' +
      '<div class="quick-calc__result" id="quick-result">' + quickResultHTML() + '</div>' +
      '<p class="quick-calc__note">Estimate only. Classification, valuation and origin evidence determine the final assessment.</p>' +
    '</div>';
  }

  function quickResultHTML() {
    const code = '8703.23.00';
    const t = C.tariffFor(code);
    const entry = {
      currency: 'USD', fxRate: 1, freight: 0, insurance: 0, serviceFee: 0, incoterm: 'CIF',
      lines: [{ hs: code, description: t.desc, qty: 1, unitValue: 25000, weight: 0, preferential: false }]
    };
    const calc = C.calculateEntry(entry);
    return '<div><span>Duty</span><strong>' + money2(calc.totals.duty) + '</strong></div><div><span>Excise</span><strong>' + money2(calc.totals.excise) + '</strong></div><div><span>VAT</span><strong>' + money2(calc.totals.vat) + '</strong></div><div><span>Levies</span><strong>' + money2(calc.totals.levy) + '</strong></div><div class="quick-calc__total"><span>Total tax</span><strong>' + money2(calc.totals.taxes) + '</strong></div>';
  }

  function updateQuickEstimate() {
    const codeEl = document.getElementById('quick-hs');
    const valueEl = document.getElementById('quick-cif');
    const prefEl = document.getElementById('quick-pref');
    const resultEl = document.getElementById('quick-result');
    if (!codeEl || !valueEl || !resultEl) return;
    const t = C.tariffFor(codeEl.value);
    if (prefEl) {
      const hasPref = t && t.prefDuty != null;
      prefEl.disabled = !hasPref;
      if (!hasPref) prefEl.checked = false;
      const label = prefEl.closest('.check-field');
      if (label) label.classList.toggle('is-disabled', !hasPref);
    }
    const entry = {
      currency: 'USD', fxRate: 1, freight: 0, insurance: 0, serviceFee: 0, incoterm: 'CIF',
      lines: [{ hs: codeEl.value, description: t ? t.desc : '', qty: 1, unitValue: C.parseAmount(valueEl.value), weight: 0, preferential: !!(prefEl && prefEl.checked) }]
    };
    const calc = C.calculateEntry(entry);
    resultEl.innerHTML = '<div><span>Duty</span><strong>' + money2(calc.totals.duty) + '</strong></div><div><span>Excise</span><strong>' + money2(calc.totals.excise) + '</strong></div><div><span>VAT</span><strong>' + money2(calc.totals.vat) + '</strong></div><div><span>Levies</span><strong>' + money2(calc.totals.levy) + '</strong></div><div class="quick-calc__total"><span>Total tax</span><strong>' + money2(calc.totals.taxes) + '</strong><small>' + C.pct(calc.effectiveRate) + ' effective</small></div>';
  }

  function viewTariff() {
    const rows = filteredTariff();
    const chapters = Array.from(new Set(C.TARIFF.map((t) => t.chapter))).sort();
    return pageHead({
      eyebrow: 'Reference / 2026 schedule',
      title: 'Tariff schedule',
      lede: 'A working schedule for classification and duty estimates. Illustrative rates must be checked against the current authority tariff before lodgement.',
      actions: '<button class="btn btn--ghost" type="button" data-act="export-tariff">' + icon('download') + ' Export CSV</button><a class="btn btn--ghost" href="#/settings">' + icon('shield') + ' Rate profile</a>'
    }) +
    '<div class="tariff-layout">' +
      '<section class="card list-card">' +
        '<div class="filter-bar filter-bar--top"><label class="search-field">' + icon('search') + '<input id="tariff-search" type="search" placeholder="Search HS code, goods or chapter" value="' + esc(state.ui.filters.tariff.q) + '" data-filter="tariff.q" aria-label="Search tariff"></label><label class="mini-select"><span>Chapter</span><select data-filter="tariff.chapter" aria-label="Filter chapter"><option value="all">All chapters</option>' + chapters.map((ch) => '<option value="' + ch + '"' + (state.ui.filters.tariff.chapter === ch ? ' selected' : '') + '>' + ch + ' · ' + esc(C.CHAPTER_NAMES[ch] || '') + '</option>').join('') + '</select></label><label class="check-field check-field--compact"><input type="checkbox" data-filter="tariff.pref"' + (state.ui.filters.tariff.pref ? ' checked' : '') + '><span><strong>Preferential only</strong></span></label><span class="filter-bar__count" id="tariff-count">' + rows.length + ' lines</span></div>' +
        '<div class="table-wrap" id="tariff-table-wrap"><table class="data-table tariff-table"><caption class="sr-only">HS tariff schedule</caption><thead><tr><th scope="col">HS code</th><th scope="col">Goods</th><th scope="col">Chapter</th><th scope="col" class="align-right">Duty</th><th scope="col" class="align-right">Excise</th><th scope="col" class="align-right">VAT</th><th scope="col" class="align-right">Levy</th><th scope="col">Controls</th></tr></thead><tbody id="tariff-rows">' + tariffBody(rows) + '</tbody></table></div>' +
        '<div class="list-foot"><span>Illustrative schedule · ' + C.TARIFF.length + ' lines</span><span class="mono">Rates in percent · CIF basis</span></div>' +
      '</section>' +
      '<aside class="tariff-side">' + quickEstimateMarkup() +
        '<article class="card tariff-note"><p class="eyebrow">Classification note</p><h3>Rate is not the whole answer</h3><p>Duty depends on the correct commodity code, the customs value, the origin evidence and any controls attached to the goods. A preferential rate without valid origin proof will be rejected.</p><a class="text-link text-link--full" href="#/entries">Open entries ' + icon('arrowRight') + '</a></article>' +
      '</aside>' +
    '</div>';
  }

  function refreshTariffRows() {
    const rows = filteredTariff();
    const body = document.getElementById('tariff-rows');
    if (body) body.innerHTML = tariffBody(rows);
    const count = document.getElementById('tariff-count');
    if (count) count.textContent = rows.length + ' lines';
  }

  /* ------------------------------------------------------------------ *
   * Disbursements
   * ------------------------------------------------------------------ */

  function disbBadge(status) {
    const labels = { paid: 'Paid', due: 'Due', partial: 'Part paid', overdue: 'Overdue', void: 'Void' };
    return '<span class="status status--disb-' + status + '"><span class="status__dot"></span>' + (labels[status] || C.titleCase(status)) + '</span>';
  }

  function filteredDisbursements() {
    const f = state.ui.filters.disbursements;
    const q = f.q.trim().toLowerCase();
    let rows = state.data.disbursements.filter((d) => {
      if (f.status !== 'all' && C.disbState(d, today()) !== f.status) return false;
      if (f.type !== 'all' && d.type !== f.type) return false;
      if (f.client !== 'all' && d.clientId !== f.client) return false;
      if (!q) return true;
      const client = clientOf({ clientId: d.clientId });
      return [d.ref, d.entryId, d.type, d.description, d.paidTo, d.receiptNo, client.name].join(' ').toLowerCase().indexOf(q) !== -1;
    });
    const rank = { overdue: 0, partial: 1, due: 2, paid: 3, void: 4 };
    return rows.sort((a, b) => {
      const ra = rank[C.disbState(a, today())] == null ? 9 : rank[C.disbState(a, today())];
      const rb = rank[C.disbState(b, today())] == null ? 9 : rank[C.disbState(b, today())];
      if (ra !== rb) return ra - rb;
      return a.dueDate < b.dueDate ? -1 : 1;
    });
  }

  function disbursementTableBody(rows) {
    if (!rows.length) return '<tr><td colspan="9">' + emptyState('bank', 'No charges match', 'Try a different status, type or client.', '<button class="btn btn--small" type="button" data-act="clear-disb-filters">Clear filters</button>') + '</td></tr>';
    return rows.map((d) => {
      const st = C.disbState(d, today());
      const entry = d.entryId ? entryById(d.entryId) : null;
      const client = clientOf({ clientId: d.clientId });
      return '<tr class="disb-row">' +
        '<td><span class="mono">' + esc(d.ref) + '</span><span class="cell-sub">' + (entry ? '<a href="#/entries/' + entry.id + '">' + entry.id + '</a>' : 'No entry') + '</span></td>' +
        '<td><span>' + esc(client.short) + '</span><span class="cell-sub">' + esc(d.type) + '</span></td>' +
        '<td class="cell-goods"><span>' + esc(d.description) + '</span><span class="cell-sub">' + esc(d.paidTo || '') + '</span></td>' +
        '<td><span>' + C.fmtShortDate(d.incurredDate) + '</span><span class="cell-sub">' + C.fmtDate(d.dueDate) + ' due</span></td>' +
        '<td class="align-right">' + money2(d.amount) + '</td>' +
        '<td class="align-right">' + money2(C.disbPaid(d)) + '</td>' +
        '<td class="align-right cell-strong">' + money2(C.disbOutstanding(d)) + '</td>' +
        '<td>' + disbBadge(st) + (st === 'overdue' ? '<span class="cell-sub">' + C.daysBetween(d.dueDate, today()) + 'd overdue</span>' : '') + '</td>' +
        '<td class="cell-actions"><button class="btn btn--ghost btn--tiny" type="button" data-act="open-disbursement" data-id="' + d.id + '">' + (C.disbOutstanding(d) > 0.009 ? 'Recover' : 'View') + '</button></td>' +
      '</tr>';
    }).join('');
  }

  function recoveredInLast(days) {
    const from = C.addDays(today(), -days);
    let total = 0;
    state.data.disbursements.forEach((d) => {
      if (d.void) return;
      (d.payments || []).forEach((p) => {
        if (C.isoDate(p.date) >= from) total += C.num(p.amount);
      });
    });
    return C.round(total);
  }

  function viewDisbursements() {
    const rows = filteredDisbursements();
    const all = state.data.disbursements.filter((d) => !d.void);
    const aging = C.agingSummary(all, today());
    const open = all.filter((d) => C.disbOutstanding(d) > 0.009);
    const overdue = all.filter((d) => C.disbState(d, today()) === 'overdue');
    const types = Array.from(new Set(all.map((d) => d.type))).sort();
    const clients = state.data.clients.filter((c) => c.status !== 'archived');
    const f = state.ui.filters.disbursements;
    return pageHead({
      eyebrow: 'Finance / cash recovery',
      title: 'Disbursements',
      lede: 'Every cost advanced on a client’s behalf, how old it is, and what has been recovered.',
      actions: '<button class="btn btn--ghost" type="button" data-act="export-disbursements">' + icon('download') + ' Export CSV</button><button class="btn btn--primary" type="button" data-act="new-disbursement">' + icon('plus') + ' Add charge</button>'
    }) +
    '<section class="kpi-grid kpi-grid--three">' +
      '<article class="kpi kpi--dark"><div class="kpi__top"><span class="kpi__label">Outstanding</span><span class="kpi__index">01</span></div><div class="kpi__value">' + money(aging.total) + '</div><div class="kpi__foot"><span>' + open.length + ' open charges</span><span class="kpi__trend">' + icon('bank') + ' client recovery</span></div></article>' +
      '<article class="kpi"><div class="kpi__top"><span class="kpi__label">Overdue</span><span class="kpi__index">02</span></div><div class="kpi__value">' + money(aging.overdue) + '</div><div class="kpi__foot"><span>' + overdue.length + ' charges past due</span><span class="kpi__trend">' + icon('clock') + ' chase now</span></div></article>' +
      '<article class="kpi"><div class="kpi__top"><span class="kpi__label">Recovered / 30d</span><span class="kpi__index">03</span></div><div class="kpi__value">' + money(recoveredInLast(30)) + '</div><div class="kpi__foot"><span>payments received</span><span class="kpi__trend">' + icon('check') + ' last 30 days</span></div></article>' +
    '</section>' +
    '<section class="card aging-strip"><div class="aging-strip__head"><div><p class="eyebrow">Aging</p><h2>Receivables by bucket</h2></div><span class="mono">' + money(aging.total) + ' total</span></div><div class="aging-bars aging-bars--wide">' + [['current', 'Current'], ['1-14', '1–14 days'], ['15-30', '15–30 days'], ['31-60', '31–60 days'], ['60+', '60+ days']].map(([key, label]) => {
      const value = aging[key] || 0;
      const pct = aging.total ? Math.round((value / aging.total) * 100) : 0;
      return '<div class="aging-row"><span class="aging-row__label">' + label + '</span><span class="aging-row__track"><i style="width:' + pct + '%"></i></span><span class="aging-row__value">' + money(value) + '</span><span class="aging-row__pct">' + pct + '%</span></div>';
    }).join('') + '</div></section>' +
    '<section class="card list-card">' +
      '<div class="filter-bar">' +
        '<label class="search-field">' + icon('search') + '<input id="disb-search" type="search" placeholder="Search charge, entry, client or receipt" value="' + esc(f.q) + '" data-filter="disbursements.q" aria-label="Search disbursements"></label>' +
        '<label class="mini-select"><span>Status</span><select data-filter="disbursements.status" aria-label="Filter status"><option value="all">All statuses</option>' + ['overdue', 'due', 'partial', 'paid'].map((s) => '<option value="' + s + '"' + (f.status === s ? ' selected' : '') + '>' + C.titleCase(s) + '</option>').join('') + '</select></label>' +
        '<label class="mini-select"><span>Type</span><select data-filter="disbursements.type" aria-label="Filter type"><option value="all">All types</option>' + types.map((t) => '<option value="' + esc(t) + '"' + (f.type === t ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select></label>' +
        '<label class="mini-select"><span>Client</span><select data-filter="disbursements.client" aria-label="Filter client"><option value="all">All clients</option>' + clients.map((c) => '<option value="' + c.id + '"' + (f.client === c.id ? ' selected' : '') + '>' + esc(c.short) + '</option>').join('') + '</select></label>' +
        '<span class="filter-bar__count" id="disb-count">' + rows.length + ' charges</span>' +
      '</div>' +
      '<div class="table-wrap" id="disb-table-wrap"><table class="data-table disb-table"><caption class="sr-only">Disbursement ledger</caption><thead><tr><th scope="col">Charge</th><th scope="col">Client / type</th><th scope="col">Description</th><th scope="col">Incurred / due</th><th scope="col" class="align-right">Amount</th><th scope="col" class="align-right">Recovered</th><th scope="col" class="align-right">Outstanding</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody id="disb-rows">' + disbursementTableBody(rows) + '</tbody></table></div>' +
      '<div class="list-foot"><span>Showing ' + rows.length + ' of ' + all.length + ' charges</span><span class="mono">USD · aging by due date</span></div>' +
    '</section>';
  }

  function refreshDisbRows() {
    const rows = filteredDisbursements();
    const body = document.getElementById('disb-rows');
    if (body) body.innerHTML = disbursementTableBody(rows);
    const count = document.getElementById('disb-count');
    if (count) count.textContent = rows.length + ' charges';
  }

  function openDisbursementForm(disb, options) {
    const opts = options || {};
    const isNew = !disb;
    const entries = state.data.entries.filter((e) => e.status !== 'closed' || (disb && disb.entryId === e.id));
    const defaultEntry = opts.entryId || (entries[0] || {}).id;
    const d = disb || {
      id: '', ref: '', entryId: defaultEntry, type: 'Terminal handling', description: '', amount: '',
      incurredDate: today(), dueDate: C.addDays(today(), 15), paidTo: '', receiptNo: '', notes: ''
    };
    const types = ['Duty & taxes', 'Terminal handling', 'Transport', 'Storage', 'Documentation', 'Dangerous goods', 'Other'];
    showModal('<form class="modal" data-form="disbursement" data-id="' + (isNew ? '' : d.id) + '" novalidate>' +
      modalHeader(isNew ? 'Finance' : 'Ledger', isNew ? 'Add a charge' : 'Edit ' + d.ref, isNew ? 'Record a cost advanced for a client.' : 'Amend the charge. Payments already recorded are preserved.') +
      '<div class="modal-body"><div data-form-error class="form-error" hidden></div>' +
        '<div class="form-grid">' +
          selectField({ label: 'Entry', name: 'entryId', value: d.entryId, required: true, options: entries.map((e) => ({ value: e.id, label: e.id + ' · ' + clientOf(e).short + ' · ' + e.reference })) }) +
          selectField({ label: 'Charge type', name: 'type', value: d.type, required: true, options: types }) +
          inputField({ label: 'Amount (USD)', name: 'amount', type: 'number', min: '0', step: '0.01', value: d.amount, required: true }) +
          inputField({ label: 'Paid to', name: 'paidTo', value: d.paidTo, placeholder: 'Terminal, carrier, authority…' }) +
          inputField({ label: 'Incurred', name: 'incurredDate', type: 'date', value: d.incurredDate, required: true }) +
          inputField({ label: 'Client due date', name: 'dueDate', type: 'date', value: d.dueDate, required: true }) +
          inputField({ label: 'Receipt / invoice', name: 'receiptNo', value: d.receiptNo, placeholder: 'Supplier reference' }) +
        '</div>' +
        inputField({ label: 'Description', name: 'description', value: d.description, placeholder: 'What was the cost for?', required: true, span: true }) +
        textareaField({ label: 'Internal note', name: 'notes', value: d.notes, rows: 2 }) +
      '</div><div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">' + (isNew ? 'Add charge' : 'Save charge') + '</button></div>' +
    '</form>');
  }

  function submitDisbursement(form) {
    const isNew = !form.dataset.id;
    const entry = entryById(form.elements.entryId.value);
    if (!entry) { showFormError(form, 'Select a valid entry.'); return; }
    const amount = C.parseAmount(form.elements.amount.value);
    const description = form.elements.description.value.trim();
    const incurred = form.elements.incurredDate.value;
    const due = form.elements.dueDate.value;
    if (!(amount > 0)) { showFormError(form, 'Enter a charge amount above zero.'); return; }
    if (!description) { showFormError(form, 'Add a description for the charge.'); return; }
    if (!incurred || !due) { showFormError(form, 'Add both incurred and due dates.'); return; }
    if (due < incurred) { showFormError(form, 'The due date cannot be before the incurred date.'); return; }
    if (isNew) {
      const seq = state.data.counters.disbursement++;
      const disb = {
        id: 'dsb_' + seq,
        ref: 'DIS-' + seq,
        entryId: entry.id,
        clientId: entry.clientId,
        type: form.elements.type.value,
        description: description,
        amount: C.round(amount),
        incurredDate: incurred,
        dueDate: due,
        paidTo: form.elements.paidTo.value.trim(),
        receiptNo: form.elements.receiptNo.value.trim(),
        billable: true,
        void: false,
        createdAt: new Date().toISOString(),
        payments: [],
        notes: form.elements.notes.value.trim()
      };
      state.data.disbursements.push(disb);
      entry.timeline.push({ id: C.uid('evt'), at: new Date().toISOString(), status: entry.status, by: state.user.id, type: 'charge', text: 'Charge ' + disb.ref + ' added: ' + disb.type + ' ' + money2(amount) + '.' });
      entry.updatedAt = new Date().toISOString();
      logActivity(entry, 'Added charge ' + disb.ref + ' to ' + entry.id + '.');
      closeModal();
      persist('Charge added.');
      renderApp();
    } else {
      const disb = disbursementById(form.dataset.id);
      if (!disb) { showFormError(form, 'That charge no longer exists.'); return; }
      if (amount < C.disbPaid(disb)) { showFormError(form, 'The amount cannot be below payments already recorded (' + C.money(C.disbPaid(disb), 'USD', 2) + ').'); return; }
      Object.assign(disb, {
        entryId: entry.id, clientId: entry.clientId, type: form.elements.type.value, description: description,
        amount: C.round(amount), incurredDate: incurred, dueDate: due,
        paidTo: form.elements.paidTo.value.trim(), receiptNo: form.elements.receiptNo.value.trim(),
        notes: form.elements.notes.value.trim(), updatedAt: new Date().toISOString()
      });
      closeModal();
      persist('Charge saved.');
      renderApp();
    }
  }

  function openDisbursementDetail(id) {
    const disb = disbursementById(id);
    if (!disb) return;
    const st = C.disbState(disb, today());
    const entry = entryById(disb.entryId);
    const client = clientOf({ clientId: disb.clientId });
    const payments = (disb.payments || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    showModal('<div class="modal">' + modalHeader('Ledger ' + esc(disb.ref), disb.type, disb.description) +
      '<div class="modal-body">' +
        '<div class="charge-detail"><div><span>Entry</span><strong>' + (entry ? '<a href="#/entries/' + entry.id + '">' + entry.id + '</a>' : '—') + '</strong></div><div><span>Client</span><strong>' + esc(client.name) + '</strong></div><div><span>Amount</span><strong>' + money2(disb.amount) + '</strong></div><div><span>Outstanding</span><strong>' + money2(C.disbOutstanding(disb)) + '</strong></div><div><span>Incurred</span><strong>' + C.fmtDate(disb.incurredDate) + '</strong></div><div><span>Due</span><strong>' + C.fmtDate(disb.dueDate) + '</strong></div><div><span>Paid to</span><strong>' + esc(disb.paidTo || '—') + '</strong></div><div><span>Status</span><strong>' + disbBadge(st) + '</strong></div></div>' +
        '<div class="panel-subhead"><p class="eyebrow">Payment history</p><span class="mono">' + payments.length + ' receipt' + (payments.length === 1 ? '' : 's') + '</span></div>' +
        (payments.length ? '<div class="payment-list">' + payments.map((p) => '<div class="payment-row"><span class="payment-row__icon">' + icon('check') + '</span><span><strong>' + money2(p.amount) + '</strong><small>' + C.fmtDate(p.date) + ' · ' + esc(p.method || 'Payment') + (p.ref ? ' · ' + esc(p.ref) : '') + '</small></span></div>').join('') + '</div>' : '<p class="muted-copy">No payment has been recorded.</p>') +
        (disb.notes ? '<div class="charge-note"><p class="eyebrow">Note</p><p>' + esc(disb.notes) + '</p></div>' : '') +
      '</div>' +
      '<div class="modal-foot modal-foot--split"><div class="modal-foot__actions">' +
        (isManager() && !payments.length ? '<button class="btn btn--ghost btn--small" type="button" data-act="delete-disbursement" data-id="' + disb.id + '">' + icon('trash') + ' Delete</button>' : '') +
        (st !== 'paid' && !disb.void && isManager() ? '<button class="btn btn--ghost btn--small" type="button" data-act="void-disbursement" data-id="' + disb.id + '">' + icon('lock') + ' Void</button>' : '') +
        (st !== 'paid' && !disb.void ? '<button class="btn btn--ghost btn--small" type="button" data-act="edit-disbursement" data-id="' + disb.id + '">' + icon('edit') + ' Edit</button>' : '') +
      '</div><div class="modal-foot__actions"><button class="btn btn--ghost" type="button" data-act="close-modal">Close</button>' +
        (C.disbOutstanding(disb) > 0.009 && !disb.void ? '<button class="btn btn--primary" type="button" data-act="open-payment" data-disb="' + disb.id + '">' + icon('bank') + ' Record payment</button>' : '') +
      '</div></div>' +
    '</div>');
  }

  function openEntryPayments(entryId) {
    const entry = entryById(entryId);
    if (!entry) return;
    const disbs = state.data.disbursements.filter((d) => d.entryId === entryId && !d.void);
    showModal('<div class="modal">' + modalHeader('Recovery', 'Charges on ' + entry.id, 'Record a payment against any open charge.') +
      '<div class="modal-body">' + (disbs.length ? '<div class="charge-list">' + disbs.map((d) => '<div class="charge-list__row"><div><strong>' + esc(d.type) + '</strong><span class="mono">' + esc(d.ref) + '</span><small>' + esc(d.description) + '</small></div><div class="charge-list__money"><strong>' + money2(d.amount) + '</strong><span>' + money2(C.disbOutstanding(d)) + ' open</span></div><button class="btn btn--ghost btn--tiny" type="button" data-act="open-payment" data-disb="' + d.id + '">' + (C.disbOutstanding(d) > 0.009 ? 'Pay' : 'View') + '</button></div>').join('') + '</div>' : '<p class="muted-copy">No charges on this entry yet.</p>') + '</div>' +
      '<div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Close</button><button class="btn btn--primary" type="button" data-act="new-disbursement" data-entry="' + entry.id + '">' + icon('plus') + ' Add charge</button></div>' +
    '</div>');
  }

  /* ------------------------------------------------------------------ *
   * Client statements
   * ------------------------------------------------------------------ */

  function openStatementModal(clientId) {
    const client = state.data.clients.find((c) => c.id === clientId);
    if (!client) return;
    showModal('<form class="modal" data-form="statement" data-client="' + client.id + '" novalidate>' +
      modalHeader('Statements', 'Client statement', client.name + ' · choose the ledger period.') +
      '<div class="modal-body"><div data-form-error class="form-error" hidden></div><div class="form-grid">' +
        inputField({ label: 'From', name: 'from', type: 'date', value: C.addDays(today(), -30), required: true }) +
        inputField({ label: 'To', name: 'to', type: 'date', value: today(), required: true }) +
      '</div><div class="statement-intro"><p class="eyebrow">What is included</p><p>Professional fees, disbursements and payments recorded in the period, with the opening balance carried forward.</p></div></div>' +
      '<div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">Build statement</button></div>' +
    '</form>');
  }

  function submitStatement(form) {
    const from = form.elements.from.value;
    const to = form.elements.to.value;
    if (!from || !to) { showFormError(form, 'Choose both dates.'); return; }
    if (from > to) { showFormError(form, 'The from date must be before the to date.'); return; }
    const client = state.data.clients.find((c) => c.id === form.dataset.client);
    if (!client) { showFormError(form, 'Client not found.'); return; }
    const statement = C.statementData(client, state.data.entries, state.data.disbursements, from, to);
    showStatementResult(statement);
  }

  function showStatementResult(statement) {
    const rows = statement.rows;
    showModal('<div class="modal modal--statement">' + modalHeader('Statement of account', statement.client.name, C.fmtDate(statement.from) + ' — ' + C.fmtDate(statement.to)) +
      '<div class="modal-body">' +
        '<div class="statement-summary"><div><span>Opening</span><strong>' + money2(statement.opening) + '</strong></div><div><span>Charges</span><strong>' + money2(statement.charges) + '</strong></div><div><span>Payments</span><strong>' + money2(statement.payments) + '</strong></div><div class="statement-summary__total"><span>Closing balance</span><strong>' + money2(statement.closing) + '</strong></div></div>' +
        (rows.length ? '<div class="table-wrap table-wrap--flush statement-table"><table class="data-table"><caption class="sr-only">Statement ledger</caption><thead><tr><th scope="col">Date</th><th scope="col">Reference</th><th scope="col">Description</th><th scope="col" class="align-right">Charge</th><th scope="col" class="align-right">Payment</th><th scope="col" class="align-right">Balance</th></tr></thead><tbody>' + rows.map((row) => '<tr><td>' + C.fmtShortDate(row.date) + '</td><td class="mono">' + esc(row.ref) + '</td><td><span>' + esc(row.description) + '</span><span class="cell-sub">' + esc(row.kind) + '</span></td><td class="align-right">' + (row.charge ? money2(row.charge) : '—') + '</td><td class="align-right">' + (row.payment ? money2(row.payment) : '—') + '</td><td class="align-right">' + money2(row.balance) + '</td></tr>').join('') + '</tbody></table></div>' : emptyState('file', 'No movement in period', 'There are no fees or payments recorded for this date range.')) +
      '</div>' +
      '<div class="modal-foot modal-foot--split"><div class="modal-foot__actions"><button class="btn btn--ghost btn--small" type="button" data-act="statement-change" data-client="' + statement.client.id + '">' + icon('calendar') + ' Change period</button></div><div class="modal-foot__actions"><button class="btn btn--ghost" type="button" data-act="close-modal">Close</button><button class="btn btn--ghost" type="button" data-act="statement-csv" data-client="' + statement.client.id + '" data-from="' + statement.from + '" data-to="' + statement.to + '">' + icon('download') + ' CSV</button><button class="btn btn--primary" type="button" data-act="statement-print" data-client="' + statement.client.id + '" data-from="' + statement.from + '" data-to="' + statement.to + '">' + icon('print') + ' Print / PDF</button></div></div>' +
    '</div>', { wide: true });
  }

  function statementFor(clientId, from, to) {
    const client = state.data.clients.find((c) => c.id === clientId);
    if (!client) return null;
    return C.statementData(client, state.data.entries, state.data.disbursements, from, to);
  }

  /* ------------------------------------------------------------------ *
   * Reports
   * ------------------------------------------------------------------ */

  function reportRangeDays() {
    if (state.ui.reportRange === 'all') return null;
    return C.num(state.ui.reportRange, 90);
  }

  function reportMetrics() {
    const days = reportRangeDays();
    const from = days == null ? '2000-01-01' : C.addDays(today(), -days);
    const entries = state.data.entries.filter((e) => C.isoDate(e.createdAt) >= from);
    const released = state.data.entries.filter((e) => e.releasedAt && C.isoDate(e.releasedAt) >= from);
    let dutyPaid = 0;
    state.data.disbursements.forEach((d) => {
      if (d.type !== 'Duty & taxes' || d.void) return;
      (d.payments || []).forEach((p) => { if (C.isoDate(p.date) >= from) dutyPaid += C.num(p.amount); });
    });
    let cycleTotal = 0;
    let cycleCount = 0;
    let onTime = 0;
    released.forEach((e) => {
      const events = e.timeline || [];
      const lodged = events.find((ev) => ev.status === 'lodged');
      const release = e.releasedAt;
      if (release) {
        const start = lodged ? C.isoDate(lodged.at) : C.isoDate(e.createdAt);
        cycleTotal += Math.max(0, C.daysBetween(start, release));
        cycleCount += 1;
        const exposure = C.entryExposure(e, release);
        if (exposure.daysOver === 0) onTime += 1;
      }
    });
    const dutyByClient = {};
    entries.forEach((e) => {
      const client = clientOf(e);
      dutyByClient[client.id] = dutyByClient[client.id] || { client: client, duty: 0, files: 0 };
      dutyByClient[client.id].duty += C.calculateEntry(e).totals.taxes;
      dutyByClient[client.id].files += 1;
    });
    return {
      from: from,
      days: days,
      entries: entries,
      released: released,
      dutyPaid: C.round(dutyPaid),
      avgCycle: cycleCount ? Math.round(cycleTotal / cycleCount) : 0,
      onTimePct: released.length ? Math.round((onTime / released.length) * 100) : 0,
      topClients: Object.values(dutyByClient).sort((a, b) => b.duty - a.duty).slice(0, 5),
      dutyTotal: C.round(entries.reduce((sum, e) => sum + C.calculateEntry(e).totals.taxes, 0))
    };
  }

  function monthSeries() {
    const buckets = [];
    const base = new Date(now().getFullYear(), now().getMonth(), 1);
    for (let i = 5; i >= 0; i--) {
      const start = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const end = new Date(base.getFullYear(), base.getMonth() - i + 1, 0);
      const label = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(start);
      let duty = 0;
      state.data.disbursements.forEach((d) => {
        if (d.type !== 'Duty & taxes' || d.void) return;
        (d.payments || []).forEach((p) => {
          const date = C.isoDate(p.date);
          if (date >= C.isoDate(start) && date <= C.isoDate(end)) duty += C.num(p.amount);
        });
      });
      buckets.push({
        label: label + (start.getMonth() === 0 ? ' ' + String(start.getFullYear()).slice(2) : ''),
        full: new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(start),
        created: state.data.entries.filter((e) => {
          const date = C.isoDate(e.createdAt);
          return date >= C.isoDate(start) && date <= C.isoDate(end);
        }).length,
        released: state.data.entries.filter((e) => {
          const date = e.releasedAt ? C.isoDate(e.releasedAt) : '';
          return date && date >= C.isoDate(start) && date <= C.isoDate(end);
        }).length,
        duty: C.round(duty)
      });
    }
    return buckets;
  }

  function dutyChartSVG(series) {
    const width = 760;
    const height = 250;
    const left = 54;
    const bottom = 205;
    const plotWidth = 670;
    const plotHeight = 150;
    const max = Math.max(1, ...series.map((s) => s.duty));
    const step = plotWidth / series.length;
    const barWidth = Math.min(64, step * 0.48);
    let bars = '';
    let labels = '';
    series.forEach((s, i) => {
      const h = Math.max(2, (s.duty / max) * plotHeight);
      const x = left + i * step + (step - barWidth) / 2;
      const y = bottom - h;
      bars += '<rect x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' + h + '" fill="#171717"></rect>';
      bars += '<text x="' + (x + barWidth / 2) + '" y="' + (y - 8) + '" text-anchor="middle" class="chart-value">' + C.moneyCompact(s.duty) + '</text>';
      labels += '<text x="' + (x + barWidth / 2) + '" y="228" text-anchor="middle" class="chart-label">' + esc(s.label) + '</text>';
    });
    let grid = '';
    [0, 0.5, 1].forEach((f) => {
      const y = bottom - plotHeight * f;
      grid += '<line x1="' + left + '" x2="' + (left + plotWidth) + '" y1="' + y + '" y2="' + y + '" class="chart-grid"></line>';
      grid += '<text x="' + (left - 10) + '" y="' + (y + 4) + '" text-anchor="end" class="chart-axis">' + C.moneyCompact(max * f) + '</text>';
    });
    return '<svg class="report-chart" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Duty collected by month"><title>Duty collected by month</title>' + grid + bars + labels + '</svg>';
  }

  function viewReports() {
    const m = reportMetrics();
    const series = monthSeries();
    const modeCounts = C.MODE_LIST.map((mode) => ({ mode: mode, count: m.entries.filter((e) => e.mode === mode.id).length }));
    const maxMode = Math.max(1, ...modeCounts.map((x) => x.count));
    const returnCount = state.data.entries.filter((e) => e.status === 'query').length;
    const agingRows = activeEntries().map((e) => ({ entry: e, age: C.statusAge(e, today()), facts: entryFacts(e) })).sort((a, b) => b.age - a.age).slice(0, 6);
    const rangeLabel = m.days == null ? 'All time' : 'Last ' + m.days + ' days';
    return pageHead({
      eyebrow: 'Intelligence / ' + rangeLabel,
      title: 'Reports',
      lede: 'Throughput, duty collected and the operational friction hiding inside the file register.',
      actions: '<button class="btn btn--ghost" type="button" data-act="export-report">' + icon('download') + ' Export report</button><button class="btn btn--ghost" type="button" data-act="print-report">' + icon('print') + ' Print</button>'
    }) +
    '<div class="report-range" role="group" aria-label="Report period">' + [['30', '30 days'], ['90', '90 days'], ['365', '12 months'], ['all', 'All time']].map(([value, label]) => '<button class="segmented__item' + (state.ui.reportRange === value ? ' is-active' : '') + '" type="button" data-act="set-report-range" data-range="' + value + '">' + label + '</button>').join('') + '</div>' +
    '<section class="kpi-grid kpi-grid--four">' +
      '<article class="kpi"><div class="kpi__top"><span class="kpi__label">Files opened</span><span class="kpi__index">01</span></div><div class="kpi__value">' + m.entries.length + '</div><div class="kpi__foot"><span>' + m.released.length + ' released</span><span class="kpi__trend">' + icon('entries') + ' throughput</span></div></article>' +
      '<article class="kpi"><div class="kpi__top"><span class="kpi__label">Duty collected</span><span class="kpi__index">02</span></div><div class="kpi__value">' + money(m.dutyPaid) + '</div><div class="kpi__foot"><span>' + money(m.dutyTotal) + ' computed</span><span class="kpi__trend">' + icon('bank') + ' receipts</span></div></article>' +
      '<article class="kpi"><div class="kpi__top"><span class="kpi__label">Average cycle</span><span class="kpi__index">03</span></div><div class="kpi__value">' + m.avgCycle + '<small>d</small></div><div class="kpi__foot"><span>lodged to release</span><span class="kpi__trend">' + icon('clock') + ' calendar days</span></div></article>' +
      '<article class="kpi"><div class="kpi__top"><span class="kpi__label">Cleared in free time</span><span class="kpi__index">04</span></div><div class="kpi__value">' + m.onTimePct + '<small>%</small></div><div class="kpi__foot"><span>' + m.released.length + ' released files</span><span class="kpi__trend">' + icon('check') + ' no demurrage</span></div></article>' +
    '</section>' +
    '<div class="report-grid">' +
      '<article class="card report-card report-card--wide"><div class="card__head"><div><p class="eyebrow">Treasury</p><h2>Duty collected</h2></div><span class="card__meta">6 months</span></div>' + dutyChartSVG(series) + '</article>' +
      '<article class="card report-card"><div class="card__head"><div><p class="eyebrow">Volume</p><h2>Files opened</h2></div><span class="card__meta">6 months</span></div><div class="volume-list">' + series.map((s) => '<div class="volume-row"><span class="volume-row__label">' + esc(s.label) + '</span><span class="volume-row__bars"><i class="volume-row__bar volume-row__bar--new" style="width:' + Math.max(2, (s.created / Math.max(1, ...series.map((x) => x.created))) * 100) + '%"></i><i class="volume-row__bar volume-row__bar--rel" style="width:' + Math.max(2, (s.released / Math.max(1, ...series.map((x) => x.created))) * 100) + '%"></i></span><span class="volume-row__value">' + s.created + ' / ' + s.released + '</span></div>').join('') + '</div><div class="chart-key"><span><i class="key-dark"></i>Opened</span><span><i class="key-light"></i>Released</span></div></article>' +
      '<article class="card report-card"><div class="card__head"><div><p class="eyebrow">Modes</p><h2>Mix</h2></div><span class="card__meta">' + m.entries.length + ' files</span></div><div class="mode-list">' + modeCounts.map((item) => '<div class="mode-row"><span>' + icon(item.mode.id) + ' ' + esc(item.mode.label) + '</span><span class="mode-row__track"><i style="width:' + Math.round((item.count / maxMode) * 100) + '%"></i></span><strong>' + item.count + '</strong></div>').join('') + '</div><div class="report-footnote">' + returnCount + ' customs quer' + (returnCount === 1 ? 'y' : 'ies') + ' currently open across the desk.</div></article>' +
      '<article class="card report-card"><div class="card__head"><div><p class="eyebrow">Friction</p><h2>Oldest open stages</h2></div><span class="card__meta">Days in status</span></div>' + (agingRows.length ? '<div class="age-list">' + agingRows.map((row) => '<a class="age-row" href="#/entries/' + row.entry.id + '"><span class="age-row__id">' + row.entry.id + '<small>' + esc(clientOf(row.entry).short) + '</small></span><span class="age-row__status">' + statusBadge(row.entry.status, 'status--tiny') + '</span><span class="age-row__bar"><i style="width:' + Math.min(100, (row.age / 30) * 100) + '%"></i></span><strong>' + row.age + 'd</strong></a>').join('') + '</div>' : emptyState('check', 'No open files', 'The register is fully closed.')) +
      '</article>' +
      '<article class="card report-card report-card--wide"><div class="card__head"><div><p class="eyebrow">Clients</p><h2>Top duty accounts</h2></div><a class="text-link" href="#/clients">Directory ' + icon('arrowRight') + '</a></div><div class="table-wrap table-wrap--flush"><table class="data-table"><caption class="sr-only">Top clients by duty</caption><thead><tr><th scope="col">Client</th><th scope="col" class="align-right">Files</th><th scope="col" class="align-right">Duty & tax</th><th scope="col" class="align-right">Share</th></tr></thead><tbody>' + m.topClients.map((row) => '<tr><td><a class="table-link" href="#/clients/' + row.client.id + '">' + esc(row.client.name) + '</a></td><td class="align-right">' + row.files + '</td><td class="align-right">' + money(row.duty) + '</td><td class="align-right">' + (m.dutyTotal ? C.pct((row.duty / m.dutyTotal) * 100, 0) : '0%') + '</td></tr>').join('') + '</tbody></table></div></article>' +
    '</div>';
  }

  /* ------------------------------------------------------------------ *
   * Settings
   * ------------------------------------------------------------------ */

  function diagnosticsHTML() {
    const result = state.ui.diagnostics;
    if (!result) {
      return '<div class="diagnostics-empty">' + icon('shield') + '<div><strong>Core logic diagnostics</strong><p>Run the test suite against calculations, validation, gating, statements and auth.</p></div><button class="btn btn--dark btn--small" type="button" data-act="run-diagnostics">Run tests</button></div>';
    }
    return '<div class="diagnostics-summary ' + (result.failed ? 'has-failures' : '') + '"><div><span class="diag-big">' + result.passed + '/' + result.total + '</span><span>tests passed · ' + result.duration + 'ms</span></div><button class="btn btn--ghost btn--small" type="button" data-act="run-diagnostics">' + icon('refresh') + ' Run again</button></div><div class="diag-list">' + result.results.map((r) => '<div class="diag-row ' + (r.ok ? 'is-pass' : 'is-fail') + '">' + icon(r.ok ? 'check' : 'close') + '<span>' + esc(r.name) + '</span><small>' + (r.ok ? 'pass' : esc(r.error)) + '</small></div>').join('') + '</div>';
  }

  function viewSettings() {
    const org = state.data.org;
    const manager = isManager();
    const tests = state.ui.diagnostics;
    const stats = {
      entries: state.data.entries.length,
      clients: state.data.clients.length,
      disbs: state.data.disbursements.length,
      users: state.data.users.length
    };
    return pageHead({
      eyebrow: 'Workspace / configuration',
      title: 'Settings',
      lede: 'Your desk profile, team, local data and the controls that keep the workspace honest.',
      actions: '<button class="btn btn--ghost" type="button" data-act="open-shortcuts">' + icon('keyboard') + ' Shortcuts</button><button class="btn btn--ghost" type="button" data-act="export-data">' + icon('download') + ' Backup JSON</button>'
    }) +
    '<div class="settings-layout">' +
      '<div class="settings-main">' +
        '<section class="card settings-card"><div class="card__head"><div><p class="eyebrow">01 / Organisation</p><h2>Desk profile</h2></div>' + (manager ? '' : '<span class="tag">Manager only</span>') + '</div>' +
          '<form data-form="org" class="settings-form"' + (manager ? '' : ' data-readonly="1"') + '><fieldset' + (manager ? '' : ' disabled') + '><div class="form-grid">' +
            inputField({ label: 'Trading name', name: 'name', value: org.name, required: true }) +
            inputField({ label: 'Legal name', name: 'legalName', value: org.legalName }) +
            inputField({ label: 'Email', name: 'email', type: 'email', value: org.email }) +
            inputField({ label: 'Phone', name: 'phone', value: org.phone }) +
            inputField({ label: 'Address', name: 'address', value: org.address, span: true }) +
            inputField({ label: 'Tax authority', name: 'taxAuthority', value: org.taxAuthority }) +
            inputField({ label: 'Declaration prefix', name: 'declarationPrefix', value: org.declarationPrefix, help: 'Used to prefill lodgement references' }) +
            inputField({ label: 'Default free days', name: 'defaultFreeDays', type: 'number', min: '0', step: '1', value: org.defaultFreeDays }) +
            inputField({ label: 'Default storage / day', name: 'defaultStorageRate', type: 'number', min: '0', step: '0.01', value: org.defaultStorageRate }) +
            inputField({ label: 'Default detention / day', name: 'defaultDetentionRate', type: 'number', min: '0', step: '0.01', value: org.defaultDetentionRate }) +
          '</div>' + (manager ? '<div class="form-actions"><button class="btn btn--primary btn--small" type="submit">Save desk profile</button></div>' : '') + '</fieldset></form>' +
        '</section>' +
        '<section class="card settings-card"><div class="card__head"><div><p class="eyebrow">02 / Team</p><h2>Seats on this desk</h2></div>' + (manager ? '<button class="btn btn--ghost btn--small" type="button" data-act="add-teammate">' + icon('plus') + ' Add teammate</button>' : '<span class="tag">' + state.data.users.length + ' seats</span>') + '</div>' +
          '<div class="team-list">' + state.data.users.map((user) => '<div class="team-row">' + avatar(user, 'md', user.role === 'manager') + '<div class="team-row__copy"><strong>' + esc(user.name) + '</strong><span>' + esc(user.title || user.role) + ' · ' + esc(user.email) + '</span></div><span class="tag">' + (user.role === 'manager' ? 'Manager' : 'Officer') + '</span><span class="team-row__you">' + (user.id === state.user.id ? 'You' : '') + '</span></div>').join('') + '</div>' +
          '<p class="settings-note">Accounts are local to this browser. Passwords are salted and hashed; no email is sent.</p>' +
        '</section>' +
        '<section class="card settings-card"><div class="card__head"><div><p class="eyebrow">03 / Account</p><h2>Your seat</h2></div><span class="tag">' + (manager ? 'Manager' : 'Officer') + '</span></div>' +
          '<form data-form="profile" class="settings-form"><div class="form-grid">' +
            inputField({ label: 'Full name', name: 'name', value: state.user.name, required: true }) +
            inputField({ label: 'Title', name: 'title', value: state.user.title || '' }) +
            inputField({ label: 'Email', name: 'email', value: state.user.email, type: 'email', required: true }) +
          '</div><div class="form-actions"><button class="btn btn--primary btn--small" type="submit">Save my details</button><button class="btn btn--ghost btn--small" type="button" data-act="change-password">' + icon('lock') + ' Change password</button></div></form>' +
        '</section>' +
        '<section class="card settings-card"><div class="card__head"><div><p class="eyebrow">04 / Diagnostics</p><h2>Core logic tests</h2></div><span class="tag">' + (tests ? (tests.failed ? tests.failed + ' failed' : 'All passing') : 'Not run') + '</span></div>' +
          '<div id="diagnostics-panel">' + diagnosticsHTML() + '</div>' +
          '<p class="settings-note">The same suite runs with <code>node assets/tests.js</code>. It covers duty apportionment, FX, preference, validation, lodgement gating, release gating, aging, free time and statement balancing.</p>' +
        '</section>' +
      '</div>' +
      '<aside class="settings-side">' +
        '<section class="card settings-card"><div class="card__head"><div><p class="eyebrow">Local data</p><h2>Workspace</h2></div><span class="signal-dot"></span></div>' +
          '<div class="data-stats"><div><span>Entries</span><strong>' + stats.entries + '</strong></div><div><span>Clients</span><strong>' + stats.clients + '</strong></div><div><span>Charges</span><strong>' + stats.disbs + '</strong></div><div><span>Seats</span><strong>' + stats.users + '</strong></div></div>' +
          '<div class="data-actions"><button class="btn btn--ghost btn--small" type="button" data-act="export-data">' + icon('download') + ' Backup JSON</button><label class="btn btn--ghost btn--small file-button">' + icon('download') + ' Import JSON<input type="file" accept="application/json,.json" id="import-file" hidden></label></div>' +
          '<p class="settings-note">Storage: ' + (state.storageAvailable ? 'localStorage, this browser' : 'memory only, this tab') + '. Last saved ' + (state.data.updatedAt ? C.relativeTime(state.data.updatedAt) : '—') + '.</p>' +
          (manager ? '<div class="danger-zone"><p class="eyebrow">Reset</p><p>Replace this workspace with a fresh demo dataset.</p><button class="btn btn--ghost btn--small" type="button" data-act="reset-data">' + icon('refresh') + ' Reset demo data</button></div>' : '') +
        '</section>' +
        '<section class="card settings-card"><div class="card__head"><div><p class="eyebrow">Keyboard</p><h2>Work quickly</h2></div>' + icon('command') + '</div><div class="shortcut-list">' +
          '<div><span>Search anything</span><kbd>' + modKey() + ' K</kbd></div><div><span>New entry</span><kbd>N</kbd></div><div><span>Go to overview</span><kbd>G O</kbd></div><div><span>Go to entries</span><kbd>G E</kbd></div><div><span>Go to tariff</span><kbd>G T</kbd></div><div><span>Go to clients</span><kbd>G C</kbd></div><div><span>Shortcuts</span><kbd>?</kbd></div>' +
        '</div><button class="text-link text-link--full" type="button" data-act="open-shortcuts">Full shortcut sheet ' + icon('arrowRight') + '</button></section>' +
        '<section class="card settings-card about-card"><div class="brand-mark-large" aria-hidden="true"><i></i><i></i><i></i></div><h3>Declarant v' + C.VERSION + '</h3><p>Customs operations for clearing agents. Local-first, monochrome and built for the desk.</p><span class="mono">Mombasa · 2026</span></section>' +
      '</aside>' +
    '</div>';
  }

  function openTeammateModal() {
    if (!isManager()) { toast('Only a manager can add a seat.'); return; }
    showModal('<form class="modal" data-form="teammate" novalidate>' + modalHeader('Team', 'Add a teammate', 'Create a local seat. Share the password with them directly.') +
      '<div class="modal-body"><div data-form-error class="form-error" hidden></div><div class="form-grid">' +
        inputField({ label: 'Full name', name: 'name', value: '', required: true, autofocus: true }) +
        inputField({ label: 'Email', name: 'email', type: 'email', value: '', required: true }) +
        inputField({ label: 'Temporary password', name: 'password', type: 'password', value: '', required: true, help: 'At least 8 characters' }) +
        selectField({ label: 'Role', name: 'role', value: 'clerk', options: [{ value: 'clerk', label: 'Clearance officer' }, { value: 'manager', label: 'Manager' }] }) +
      '</div></div><div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">Add seat</button></div>' +
    '</form>');
  }

  function submitTeammate(form) {
    if (!isManager()) { showFormError(form, 'Only a manager can add a seat.'); return; }
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim().toLowerCase();
    const password = form.elements.password.value;
    const role = form.elements.role.value === 'manager' ? 'manager' : 'clerk';
    const issues = [];
    if (name.length < 2) issues.push('Add the teammate name.');
    if (!C.validEmail(email)) issues.push('Enter a valid email.');
    if (state.data.users.some((u) => String(u.email).toLowerCase() === email)) issues.push('That email already has a seat.');
    if (password.length < 8) issues.push('Use at least 8 characters for the password.');
    if (issues.length) { showFormError(form, issues); return; }
    const salt = C.makeSalt(16);
    state.data.users.push({
      id: C.uid('usr'), name: name, initials: initials(name), email: email, role: role,
      title: role === 'manager' ? 'Manager' : 'Clearance officer', active: true,
      salt: salt, passwordHash: C.hashPassword(password, salt), createdAt: new Date().toISOString()
    });
    closeModal();
    persist('Teammate added.');
    renderApp();
  }

  function openPasswordModal() {
    showModal('<form class="modal" data-form="password" novalidate>' + modalHeader('Security', 'Change password', 'Update the password for ' + state.user.email + '.') +
      '<div class="modal-body"><div data-form-error class="form-error" hidden></div><div class="form-grid">' +
        inputField({ label: 'Current password', name: 'current', type: 'password', value: '', required: true, autofocus: true }) +
        inputField({ label: 'New password', name: 'next', type: 'password', value: '', required: true, help: 'At least 8 characters' }) +
        inputField({ label: 'Confirm new password', name: 'confirm', type: 'password', value: '', required: true, span: true }) +
      '</div></div><div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="submit">Update password</button></div>' +
    '</form>');
  }

  function submitPassword(form) {
    const current = form.elements.current.value;
    const next = form.elements.next.value;
    const confirm = form.elements.confirm.value;
    if (C.hashPassword(current, state.user.salt) !== state.user.passwordHash) { showFormError(form, 'The current password is not correct.'); return; }
    if (next.length < 8) { showFormError(form, 'Use at least 8 characters for the new password.'); return; }
    if (next !== confirm) { showFormError(form, 'The new passwords do not match.'); return; }
    state.user.salt = C.makeSalt(16);
    state.user.passwordHash = C.hashPassword(next, state.user.salt);
    const stored = state.data.users.find((u) => u.id === state.user.id);
    if (stored) Object.assign(stored, { salt: state.user.salt, passwordHash: state.user.passwordHash });
    closeModal();
    persist('Password updated.');
    renderApp();
  }

  /* ------------------------------------------------------------------ *
   * Events and actions
   * ------------------------------------------------------------------ */

  let goPending = false;
  let goTimer = null;
  let pendingImport = null;
  let previousFocus = null;

  function bindEvents() {
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onChange);
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('afterprint', cleanupPrint);
  }

  function actionEntry(el) {
    const chosen = el && el.dataset && el.dataset.id ? entryById(el.dataset.id) : null;
    if (chosen) return chosen;
    return state.route && state.route.name === 'entry' ? entryById(state.route.id) : null;
  }

  function onClick(event) {
    const actionEl = event.target.closest('[data-act]');
    if (actionEl) {
      event.preventDefault();
      runAction(actionEl.dataset.act, actionEl);
      return;
    }
    const paletteRow = event.target.closest('[data-palette-index]');
    if (paletteRow) {
      event.preventDefault();
      choosePaletteResult(C.num(paletteRow.dataset.paletteIndex, 0));
      return;
    }
    const row = event.target.closest('[data-href]');
    if (row) {
      if (event.target.closest('a, button, input, select, textarea, label, summary')) return;
      event.preventDefault();
      navigate(String(row.dataset.href || '').replace(/^#?\/?/, ''));
      return;
    }
    if ((state.ui.notifOpen || state.ui.accountOpen) && !event.target.closest('.topbar__right')) {
      state.ui.notifOpen = false;
      state.ui.accountOpen = false;
      renderApp();
    }
  }

  function onSubmit(event) {
    const form = event.target;
    if (!form || !form.dataset || !form.dataset.form) return;
    event.preventDefault();
    const kind = form.dataset.form;
    if (kind === 'signin') { handleSignin(form); return; }
    if (kind === 'signup') { handleSignup(form); return; }
    if (kind === 'entry') { submitEntryForm(form); return; }
    if (kind === 'client') { submitClient(form); return; }
    if (kind === 'disbursement') { submitDisbursement(form); return; }
    if (kind === 'statement') { submitStatement(form); return; }
    if (kind === 'teammate') { submitTeammate(form); return; }
    if (kind === 'password') { submitPassword(form); return; }
    if (kind === 'org') { submitOrg(form); return; }
    if (kind === 'profile') { submitProfile(form); return; }
    if (kind === 'payment') { submitPayment(form); return; }

    const entry = entryById(form.dataset.id);
    if (!entry) { closeModal(); toast('That file no longer exists.'); return; }
    if (kind === 'lodge') submitLodge(form, entry);
    else if (kind === 'assess') submitAssessment(form, entry);
    else if (kind === 'query') submitQuery(form, entry);
    else if (kind === 'resolve') submitResolve(form, entry);
    else if (kind === 'demand') submitDemand(form, entry);
    else if (kind === 'release') submitRelease(form, entry);
    else if (kind === 'delivered') submitDelivered(form, entry);
    else if (kind === 'close') submitClose(form, entry);
    else if (kind === 'note') submitNote(form, entry);
  }

  function onInput(event) {
    const el = event.target;
    if (el.matches('[data-filter]') && el.type !== 'checkbox') { applyFilter(el); return; }
    if (el.id === 'palette-input') {
      state.ui.paletteQuery = el.value;
      state.ui.paletteIndex = 0;
      renderPaletteResults();
      return;
    }
    if (el.matches('[data-line-field="hs"]')) { onLineHsInput(el); return; }
    if (el.id === 'quick-cif') updateQuickEstimate();
  }

  function onChange(event) {
    const el = event.target;
    if (el.matches('[data-filter]')) { applyFilter(el); return; }
    if (el.id === 'import-file') { importWorkspaceFile(el); return; }
    if (el.id === 'quick-hs' || el.id === 'quick-pref') updateQuickEstimate();
  }

  function applyFilter(el) {
    const parts = String(el.dataset.filter || '').split('.');
    const group = parts[0];
    const key = parts[1];
    if (!group || !key || !state.ui.filters[group]) return;
    state.ui.filters[group][key] = el.type === 'checkbox' ? !!el.checked : el.value;
    if (group === 'entries') refreshEntryRows();
    else if (group === 'clients') refreshClientRows();
    else if (group === 'tariff') refreshTariffRows();
    else if (group === 'disbursements') refreshDisbRows();
  }

  function runAction(act, el) {
    const id = el.dataset.id || '';
    switch (act) {
      case 'close-modal': closeModal(); break;
      case 'open-sidebar': state.ui.sidebarOpen = true; renderApp(); break;
      case 'close-sidebar': state.ui.sidebarOpen = false; renderApp(); break;
      case 'toggle-notifications':
        state.ui.notifOpen = !state.ui.notifOpen;
        state.ui.accountOpen = false;
        renderApp();
        break;
      case 'toggle-account':
        state.ui.accountOpen = !state.ui.accountOpen;
        state.ui.notifOpen = false;
        renderApp();
        break;
      case 'open-palette': openPalette(); break;
      case 'close-palette': closePalette(); break;
      case 'open-shortcuts': openShortcuts(); break;
      case 'signout': signOut(); break;
      case 'toggle-password': {
        const wrap = el.closest('.input-wrap');
        const input = wrap && wrap.querySelector('input');
        if (!input) break;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        el.textContent = show ? 'Hide' : 'Show';
        el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        break;
      }
      case 'auth-mode':
        state.ui.authMode = el.dataset.mode === 'signup' ? 'signup' : 'signin';
        state.ui.authError = '';
        state.ui.authNotice = '';
        renderAuth();
        break;
      case 'fill-demo': {
        const user = state.data.users.find((u) => u.role === el.dataset.role && u.active !== false);
        if (!user) { toast('That demo seat is not available.'); break; }
        state.ui.authError = '';
        state.ui.authNotice = '';
        setUser(user);
        renderApp();
        toast('Signed in as ' + user.name + '.');
        break;
      }
      case 'new-entry': openEntryEditor(null, { clientId: el.dataset.client || '' }); break;
      case 'edit-entry': {
        const entry = entryById(id);
        if (entry) openEntryEditor(entry);
        break;
      }
      case 'duplicate-entry': duplicateEntry(id); break;
      case 'delete-entry': confirmDeleteEntry(id); break;
      case 'confirm-delete-entry': deleteEntryNow(id); break;
      case 'add-note': {
        const entry = entryById(id);
        if (entry) openNoteModal(entry);
        break;
      }
      case 'entry-tab': {
        const tab = el.dataset.tab || 'overview';
        if (state.route && state.route.name === 'entries') {
          state.ui.filters.entries.tab = tab;
          refreshEntryRows();
        } else if (state.route && state.route.name === 'entry') {
          state.ui.entryTab = tab;
          if (el.dataset.closeModal === '1') closeModal();
          renderApp();
        }
        break;
      }
      case 'doc-cycle': {
        const entry = entryById(id);
        if (entry && el.dataset.doc) cycleDocument(entry, el.dataset.doc);
        break;
      }
      case 'doc-request': {
        const entry = entryById(id);
        if (entry) openDocRequest(entry);
        break;
      }
      case 'copy-doc-request': {
        const block = document.getElementById('doc-request-text');
        if (block) copyText(block.textContent);
        break;
      }
      case 'new-client': openClientForm(null); break;
      case 'edit-client': {
        const client = state.data.clients.find((c) => c.id === id);
        if (client) openClientForm(client);
        break;
      }
      case 'archive-client': archiveClient(id, false); break;
      case 'restore-client': archiveClient(id, true); break;
      case 'delete-client': {
        const client = state.data.clients.find((c) => c.id === id);
        if (client) confirmDeleteClient(client);
        break;
      }
      case 'confirm-delete-client': deleteClientNow(id); break;
      case 'new-disbursement': openDisbursementForm(null, { entryId: el.dataset.entry || '' }); break;
      case 'edit-disbursement': {
        const disb = disbursementById(id);
        if (disb) openDisbursementForm(disb);
        break;
      }
      case 'open-disbursement': openDisbursementDetail(id); break;
      case 'open-payment': openPaymentModal(el.dataset.disb || id); break;
      case 'open-payments': openEntryPayments(el.dataset.entry || (state.route && state.route.name === 'entry' ? state.route.id : '')); break;
      case 'delete-disbursement': confirmDeleteDisbursement(id); break;
      case 'confirm-delete-disbursement': deleteDisbursementNow(id); break;
      case 'void-disbursement': voidDisbursement(id); break;
      case 'open-statement': openStatementModal(el.dataset.client || id); break;
      case 'statement-change': openStatementModal(el.dataset.client || id); break;
      case 'statement-csv': exportStatementCSV(el.dataset.client || id, el.dataset.from, el.dataset.to); break;
      case 'statement-print': printStatementDocument(el.dataset.client || id, el.dataset.from, el.dataset.to); break;
      case 'print-entry': printEntry(el.dataset.id || (state.route && state.route.id), el.dataset.kind || 'summary'); break;
      case 'print-report': printReportDocument(); break;
      case 'export-entries': exportEntries(); break;
      case 'export-disbursements': exportDisbursements(); break;
      case 'export-tariff': exportTariff(); break;
      case 'export-report': exportReportCSV(); break;
      case 'export-data': exportWorkspace(); break;
      case 'reset-data': openResetModal(); break;
      case 'confirm-reset': resetWorkspace(); break;
      case 'confirm-import': confirmImport(); break;
      case 'set-report-range': state.ui.reportRange = el.dataset.range || '90'; renderApp(); break;
      case 'run-diagnostics': runDiagnostics(); break;
      case 'add-teammate': openTeammateModal(); break;
      case 'change-password': openPasswordModal(); break;
      case 'add-line': addLineToForm(); break;
      case 'remove-line': {
        const row = el.closest('[data-line-row]');
        if (row) removeLine(row);
        break;
      }
      case 'clear-entry-filters':
        state.ui.filters.entries = { q: '', tab: 'all', mode: 'all', client: 'all', sort: 'urgency' };
        renderApp();
        break;
      case 'clear-client-filters': state.ui.filters.clients.q = ''; renderApp(); break;
      case 'clear-tariff-filters':
        state.ui.filters.tariff = { q: '', chapter: 'all', pref: false };
        renderApp();
        break;
      case 'clear-disb-filters':
        state.ui.filters.disbursements = { q: '', status: 'all', type: 'all', client: 'all' };
        renderApp();
        break;
      case 'status-lodge':
      case 'status-assess':
      case 'status-query':
      case 'status-resolve':
      case 'status-demand':
      case 'status-release':
      case 'status-delivered':
      case 'status-close': {
        const entry = actionEntry(el);
        if (!entry) { toast('No file is open for that action.'); break; }
        if (act === 'status-lodge') {
          if (['intake', 'docs'].indexOf(entry.status) === -1) { toast('This file is already lodged.'); break; }
          openLodgeModal(entry);
        } else if (act === 'status-assess') {
          if (entry.status !== 'lodged') { toast('An assessment can only be recorded on a lodged file.'); break; }
          openAssessmentModal(entry);
        } else if (act === 'status-query') {
          if (entry.status === 'query') { toast('A query is already open on this file.'); break; }
          if (['intake', 'docs', 'lodged', 'assessed'].indexOf(entry.status) === -1) { toast('A query cannot be raised at this stage.'); break; }
          openQueryModal(entry);
        } else if (act === 'status-resolve') {
          if (entry.status !== 'query') { toast('There is no open query on this file.'); break; }
          openResolveModal(entry);
        } else if (act === 'status-demand') {
          if (entry.status !== 'assessed') { toast('Record the customs assessment before raising a demand.'); break; }
          openDemandModal(entry);
        } else if (act === 'status-release') {
          if (entry.status !== 'duty') { toast('This file is not ready for release.'); break; }
          openReleaseModal(entry);
        } else if (act === 'status-delivered') {
          if (entry.status !== 'released') { toast('Only a released consignment can be delivered.'); break; }
          openDeliveredModal(entry);
        } else if (act === 'status-close') {
          if (entry.status !== 'delivered') { toast('Mark the consignment delivered before closing the file.'); break; }
          openCloseModal(entry);
        }
        break;
      }
      default:
        break;
    }
  }

  /* ------------------------------------------------------------------ *
   * Keyboard, routing and global feedback
   * ------------------------------------------------------------------ */

  function isTypingTarget(target) {
    if (!target) return false;
    const tag = String(target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
  }

  function onKeydown(event) {
    const key = event.key;

    if (state.ui.paletteOpen) {
      if (key === 'Escape') { event.preventDefault(); closePalette(); return; }
      if (key === 'ArrowDown') {
        event.preventDefault();
        const results = state.ui.paletteResults;
        if (results.length) {
          state.ui.paletteIndex = (state.ui.paletteIndex + 1) % results.length;
          paintPaletteSelection();
        }
        return;
      }
      if (key === 'ArrowUp') {
        event.preventDefault();
        const results = state.ui.paletteResults;
        if (results.length) {
          state.ui.paletteIndex = (state.ui.paletteIndex - 1 + results.length) % results.length;
          paintPaletteSelection();
        }
        return;
      }
      if (key === 'Enter') {
        if (state.ui.paletteResults.length) {
          event.preventDefault();
          choosePaletteResult(state.ui.paletteIndex);
        }
        return;
      }
      if (key === 'Tab') {
        const nodes = Array.from(document.querySelectorAll('.palette input, .palette button')).filter((node) => !node.disabled);
        if (nodes.length) {
          const first = nodes[0];
          const last = nodes[nodes.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
        return;
      }
      return;
    }

    if ((event.metaKey || event.ctrlKey) && String(key).toLowerCase() === 'k') {
      event.preventDefault();
      openPalette();
      return;
    }

    if (key === 'Escape') {
      if (modalDialog) { event.preventDefault(); closeModal(); return; }
      if (state.ui.notifOpen || state.ui.accountOpen) {
        state.ui.notifOpen = false;
        state.ui.accountOpen = false;
        renderApp();
        return;
      }
      if (state.ui.sidebarOpen) { state.ui.sidebarOpen = false; renderApp(); }
      return;
    }

    if (isTypingTarget(event.target)) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (key === '?') { event.preventDefault(); openShortcuts(); return; }

    if (goPending) {
      goPending = false;
      if (goTimer) { window.clearTimeout(goTimer); goTimer = null; }
      const routes = { o: 'overview', e: 'entries', t: 'tariff', c: 'clients', d: 'disbursements', r: 'reports', s: 'settings' };
      const route = routes[String(key).toLowerCase()];
      if (route) { event.preventDefault(); navigate(route); }
      return;
    }

    if (String(key).toLowerCase() === 'g') {
      goPending = true;
      if (goTimer) window.clearTimeout(goTimer);
      goTimer = window.setTimeout(() => { goPending = false; goTimer = null; }, 900);
      return;
    }

    if (String(key).toLowerCase() === 'n' && state.user) {
      event.preventDefault();
      openEntryEditor(null, {});
      return;
    }

    if (key === '/') {
      event.preventDefault();
      const search = document.getElementById('entry-search') || document.getElementById('client-search') || document.getElementById('tariff-search') || document.getElementById('disb-search');
      if (search) search.focus();
      else openPalette();
      return;
    }

    if (key === 'Enter') {
      const row = event.target.closest('tr[data-href]');
      if (row) {
        event.preventDefault();
        navigate(String(row.dataset.href || '').replace(/^#?\/?/, ''));
      }
    }
  }

  function onHashChange() {
    state.ui.sidebarOpen = false;
    state.ui.notifOpen = false;
    state.ui.accountOpen = false;
    state.ui.paletteOpen = false;
    if (modalDialog) closeModal();
    if (state.user) renderApp();
    else renderAuth();
  }

  function toast(message) {
    let root = document.getElementById('toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toast-root';
      root.className = 'toast-root';
      root.setAttribute('aria-live', 'polite');
      root.setAttribute('aria-atomic', 'false');
      document.body.appendChild(root);
    }
    const item = document.createElement('div');
    item.className = 'toast';
    item.innerHTML = icon('check') + '<span>' + esc(message) + '</span>';
    root.appendChild(item);
    window.setTimeout(() => item.classList.add('is-in'), 20);
    window.setTimeout(() => {
      item.classList.remove('is-in');
      window.setTimeout(() => {
        if (item.parentNode) item.parentNode.removeChild(item);
      }, 260);
    }, 3600);
  }

  function logActivity(entry, text) {
    if (!Array.isArray(state.data.activity)) state.data.activity = [];
    if (!state.data.counters.activity) state.data.counters.activity = 1;
    const event = {
      id: 'act_' + (state.data.counters.activity++),
      at: new Date().toISOString(),
      userId: state.user.id,
      entryId: entry ? entry.id : null,
      clientId: entry ? entry.clientId : null,
      text: text,
      meta: entry ? entry.id + ' · ' + clientOf(entry).short : state.data.org.name + ' · workspace'
    };
    state.data.activity.unshift(event);
    state.data.activity = state.data.activity.slice(0, 40);
  }

  /* ------------------------------------------------------------------ *
   * Global search palette
   * ------------------------------------------------------------------ */

  function computePaletteResults() {
    const q = state.ui.paletteQuery.trim().toLowerCase();
    const results = [];
    const pages = [
      { label: 'Overview', icon: 'grid', href: 'overview', hint: 'Desk pulse and action queue' },
      { label: 'Entries', icon: 'entries', href: 'entries', hint: 'The clearance register' },
      { label: 'Disbursements', icon: 'bank', href: 'disbursements', hint: 'Charges, aging and recovery' },
      { label: 'Reports', icon: 'reports', href: 'reports', hint: 'Throughput and duty collected' },
      { label: 'Clients', icon: 'clients', href: 'clients', hint: 'Commercial directory' },
      { label: 'Tariff schedule', icon: 'tariff', href: 'tariff', hint: 'HS codes and duty rates' },
      { label: 'Settings', icon: 'settings', href: 'settings', hint: 'Desk profile, team and data' }
    ];
    const push = (type, iconName, title, sub, href, group, code) => {
      results.push({ type: type, icon: iconName, title: title, sub: sub, href: href, group: group, code: code || '' });
    };

    if (!q) {
      pages.forEach((page) => push('page', page.icon, page.label, page.hint, page.href, 'Jump to'));
      state.data.entries
        .slice()
        .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))
        .slice(0, 4)
        .forEach((entry) => push('entry', 'entries', entry.id + ' · ' + clientOf(entry).short, entry.reference + ' · ' + entry.port + ' · ' + statusMeta(entry.status).label, 'entries/' + entry.id, 'Recent files'));
      return results;
    }

    state.data.entries
      .filter((entry) => {
        const client = clientOf(entry);
        return [entry.id, entry.reference, entry.bl, entry.container, entry.carrier, entry.port, entry.origin, client.name, client.short].join(' ').toLowerCase().indexOf(q) !== -1;
      })
      .sort((a, b) => {
        const aId = a.id.toLowerCase().indexOf(q) === 0 ? 0 : 1;
        const bId = b.id.toLowerCase().indexOf(q) === 0 ? 0 : 1;
        return aId - bId || String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt));
      })
      .slice(0, 6)
      .forEach((entry) => push('entry', 'entries', entry.id + ' · ' + clientOf(entry).short, entry.reference + ' · ' + entry.port + ' · ' + statusMeta(entry.status).label, 'entries/' + entry.id, 'Files'));

    state.data.clients
      .filter((client) => [client.name, client.short, client.contact, client.email, client.phone].join(' ').toLowerCase().indexOf(q) !== -1)
      .slice(0, 4)
      .forEach((client) => push('client', 'clients', client.name, client.contact + ' · ' + client.email, 'clients/' + client.id, 'Clients'));

    C.TARIFF
      .filter((item) => [item.code, item.desc, item.notes, C.CHAPTER_NAMES[item.chapter] || ''].join(' ').toLowerCase().indexOf(q) !== -1)
      .slice(0, 5)
      .forEach((item) => push('tariff', 'tariff', item.code + ' · ' + item.desc, C.pct(item.duty) + ' duty · ' + C.pct(item.vat) + ' VAT · ' + item.unit, 'tariff', 'Tariff', item.code));

    pages
      .filter((page) => [page.label, page.hint].join(' ').toLowerCase().indexOf(q) !== -1)
      .slice(0, 3)
      .forEach((page) => push('page', page.icon, page.label, page.hint, page.href, 'Jump to'));

    return results;
  }

  function paletteListHTML(results) {
    if (!results.length) {
      return '<div class="palette-empty">' + icon('search') + '<strong>No matches</strong><span>Try an entry number, client name or HS code.</span></div>';
    }
    let html = '';
    let group = '';
    let index = 0;
    results.forEach((result) => {
      if (result.group !== group) {
        group = result.group;
        html += '<p class="palette-group">' + esc(group) + '</p>';
      }
      const i = index++;
      html += '<button class="palette-row' + (i === state.ui.paletteIndex ? ' is-active' : '') + '" type="button" role="option" id="palette-opt-' + i + '" data-palette-index="' + i + '" aria-selected="' + (i === state.ui.paletteIndex) + '">' +
        '<span class="palette-row__icon">' + icon(result.icon) + '</span>' +
        '<span class="palette-row__copy"><strong>' + esc(result.title) + '</strong><small>' + esc(result.sub) + '</small></span>' +
        '<span class="palette-row__type">' + esc(result.type === 'entry' ? 'File' : (result.type === 'client' ? 'Client' : (result.type === 'tariff' ? 'Tariff' : 'Go'))) + '</span>' +
        icon('chevronRight') +
      '</button>';
    });
    return html;
  }

  function renderPalette() {
    const root = document.getElementById('palette-root');
    if (!root) return;
    const results = computePaletteResults();
    state.ui.paletteResults = results;
    if (state.ui.paletteIndex >= results.length) state.ui.paletteIndex = Math.max(0, results.length - 1);
    root.innerHTML = '<div class="palette-backdrop" data-act="close-palette"></div>' +
      '<div class="palette" role="dialog" aria-modal="true" aria-labelledby="palette-title">' +
        '<h2 class="sr-only" id="palette-title">Search the workspace</h2>' +
        '<div class="palette__search">' + icon('search') +
          '<input id="palette-input" type="text" autocomplete="off" spellcheck="false" placeholder="Search entries, clients, HS codes or pages" aria-controls="palette-list" aria-autocomplete="list" aria-activedescendant="palette-opt-' + state.ui.paletteIndex + '" value="' + esc(state.ui.paletteQuery) + '">' +
          '<kbd>Esc</kbd>' +
        '</div>' +
        '<div class="palette__meta"><span id="palette-count">' + results.length + ' result' + (results.length === 1 ? '' : 's') + '</span><span>↑↓ move · Enter open</span></div>' +
        '<div class="palette__list" id="palette-list" role="listbox" aria-label="Search results">' + paletteListHTML(results) + '</div>' +
        '<div class="palette__foot"><span>' + icon('command') + ' Global search</span><span>Search covers files, clients, tariff and views</span></div>' +
      '</div>';
    const input = document.getElementById('palette-input');
    if (input) {
      input.focus();
      const end = input.value.length;
      if (input.setSelectionRange) input.setSelectionRange(end, end);
    }
  }

  function renderPaletteResults() {
    const list = document.getElementById('palette-list');
    if (!list) { renderPalette(); return; }
    const results = computePaletteResults();
    state.ui.paletteResults = results;
    if (state.ui.paletteIndex >= results.length) state.ui.paletteIndex = Math.max(0, results.length - 1);
    list.innerHTML = paletteListHTML(results);
    const count = document.getElementById('palette-count');
    if (count) count.textContent = results.length + ' result' + (results.length === 1 ? '' : 's');
    const input = document.getElementById('palette-input');
    if (input) input.setAttribute('aria-activedescendant', 'palette-opt-' + state.ui.paletteIndex);
  }

  function paintPaletteSelection() {
    const rows = Array.from(document.querySelectorAll('.palette-row'));
    rows.forEach((row, i) => {
      const active = i === state.ui.paletteIndex;
      row.classList.toggle('is-active', active);
      row.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
    });
    const input = document.getElementById('palette-input');
    if (input) input.setAttribute('aria-activedescendant', 'palette-opt-' + state.ui.paletteIndex);
  }

  function openPalette() {
    if (!state.user) return;
    previousFocus = document.activeElement;
    state.ui.notifOpen = false;
    state.ui.accountOpen = false;
    document.querySelectorAll('.popover').forEach((node) => node.remove());
    state.ui.paletteOpen = true;
    state.ui.paletteQuery = '';
    state.ui.paletteIndex = 0;
    renderPalette();
  }

  function closePalette(restoreFocus) {
    state.ui.paletteOpen = false;
    state.ui.paletteQuery = '';
    state.ui.paletteIndex = 0;
    const root = document.getElementById('palette-root');
    if (root) root.innerHTML = '';
    if (restoreFocus !== false && previousFocus && document.contains(previousFocus) && previousFocus.focus) {
      previousFocus.focus();
    }
  }

  function choosePaletteResult(index) {
    const result = state.ui.paletteResults[index];
    if (!result) return;
    if (result.type === 'tariff' && result.code) state.ui.filters.tariff.q = result.code;
    closePalette(false);
    navigate(result.href);
  }

  /* ------------------------------------------------------------------ *
   * Entry mutations
   * ------------------------------------------------------------------ */

  function duplicateEntry(id) {
    const source = entryById(id);
    if (!source) return;
    const stamp = new Date().toISOString();
    const clone = JSON.parse(JSON.stringify(source));
    clone.id = nextEntryNumber();
    clone.reference = (source.reference || source.id) + ' (copy)';
    clone.status = 'intake';
    clone.createdAt = stamp;
    clone.updatedAt = stamp;
    clone.billedAt = stamp;
    clone.statusSince = stamp;
    clone.declarationRef = '';
    clone.lodgedAt = '';
    clone.releasedAt = '';
    clone.deliveredAt = '';
    clone.closedAt = '';
    clone.arrivalDate = '';
    clone.assessment = null;
    clone.query = null;
    clone.delivery = null;
    clone.docs = {};
    C.checklist(clone).forEach((doc) => { clone.docs[doc.key] = 'missing'; });
    clone.timeline = [{ id: C.uid('evt'), at: stamp, status: 'intake', by: state.user.id, type: 'status', text: 'File opened as a duplicate of ' + source.id + '.' }];
    state.data.entries.push(clone);
    state.data.counters.entry += 1;
    logActivity(clone, 'Duplicated ' + source.id + ' as ' + clone.id + '.');
    persist('Entry ' + clone.id + ' created from ' + source.id + '.');
    state.ui.entryTab = 'overview';
    navigate('entries/' + clone.id);
  }

  function confirmDeleteEntry(id) {
    const entry = entryById(id);
    if (!entry) { toast('That file no longer exists.'); return; }
    if (!isManager()) { toast('Only a manager can delete a file.'); return; }
    const charges = state.data.disbursements.filter((d) => d.entryId === entry.id && !d.void);
    const paid = charges.some((d) => C.disbPaid(d) > 0.009);
    if (paid) {
      showModal('<div class="modal">' + modalHeader('Cannot delete', 'Payments are attached to this file', entry.id + ' has recorded client payments. Deleting it would break the ledger.') +
        '<div class="modal-body"><div class="close-warning">' + icon('alertCircle') + '<div><strong>Keep the audit trail intact.</strong><span>Void or reconcile the open charges first, then close the file instead of deleting it.</span></div></div></div>' +
        '<div class="modal-foot"><button class="btn btn--primary" type="button" data-act="close-modal">Close</button></div></div>');
      return;
    }
    showModal('<div class="modal">' + modalHeader('Delete file', 'Delete ' + entry.id + '?', 'This removes the declaration, its document checklist and ' + charges.length + ' related charge' + (charges.length === 1 ? '' : 's') + ' from this local workspace.') +
      '<div class="modal-body"><div class="close-warning">' + icon('alertCircle') + '<div><strong>This cannot be undone.</strong><span>The entry activity trail will also be removed. Export a JSON backup first if you need a record.</span></div></div></div>' +
      '<div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="button" data-act="confirm-delete-entry" data-id="' + entry.id + '">Delete file</button></div></div>');
  }

  function deleteEntryNow(id) {
    const entry = entryById(id);
    if (!entry) { closeModal(); toast('That file no longer exists.'); return; }
    if (!isManager()) { closeModal(); toast('Only a manager can delete a file.'); return; }
    const charges = state.data.disbursements.filter((d) => d.entryId === entry.id);
    if (charges.some((d) => C.disbPaid(d) > 0.009)) { closeModal(); toast('This file has payments recorded and cannot be deleted.'); return; }
    state.data.entries = state.data.entries.filter((e) => e.id !== entry.id);
    state.data.disbursements = state.data.disbursements.filter((d) => d.entryId !== entry.id);
    state.data.activity = (state.data.activity || []).filter((a) => a.entryId !== entry.id);
    closeModal();
    persist('Entry ' + entry.id + ' deleted.');
    navigate('entries');
  }

  function deleteClientNow(id) {
    const client = state.data.clients.find((c) => c.id === id);
    if (!client) { closeModal(); return; }
    if (!isManager()) { closeModal(); toast('Only a manager can delete a client.'); return; }
    if (state.data.entries.some((e) => e.clientId === client.id)) { closeModal(); toast('This client has files. Archive the client instead.'); return; }
    state.data.clients = state.data.clients.filter((c) => c.id !== client.id);
    state.data.activity = (state.data.activity || []).filter((a) => a.clientId !== client.id);
    closeModal();
    persist('Client deleted.');
    navigate('clients');
  }

  function confirmDeleteDisbursement(id) {
    const disb = disbursementById(id);
    if (!disb) return;
    if (!isManager()) { toast('Only a manager can delete a charge.'); return; }
    if (C.disbPaid(disb) > 0.009) { toast('This charge has payments and cannot be deleted.'); return; }
    showModal('<div class="modal">' + modalHeader('Ledger', 'Delete ' + disb.ref + '?', esc(disb.type) + ' · ' + C.money(disb.amount, 'USD', 2)) +
      '<div class="modal-body"><div class="close-warning">' + icon('alertCircle') + '<div><strong>This removes the charge from the ledger.</strong><span>No payments are attached, so no receipt history will be lost.</span></div></div></div>' +
      '<div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="button" data-act="confirm-delete-disbursement" data-id="' + disb.id + '">Delete charge</button></div></div>');
  }

  function deleteDisbursementNow(id) {
    const disb = disbursementById(id);
    if (!disb) { closeModal(); return; }
    if (!isManager()) { closeModal(); toast('Only a manager can delete a charge.'); return; }
    if (C.disbPaid(disb) > 0.009) { closeModal(); toast('This charge has payments and cannot be deleted.'); return; }
    const entry = entryById(disb.entryId);
    state.data.disbursements = state.data.disbursements.filter((d) => d.id !== disb.id);
    if (entry && disb.type === 'Duty & taxes' && entry.status === 'duty') {
      const remaining = state.data.disbursements.filter((d) => d.entryId === entry.id && d.type === 'Duty & taxes' && !d.void);
      if (!remaining.length) {
        entry.status = 'assessed';
        entry.statusSince = new Date().toISOString();
        entry.timeline.push({ id: C.uid('evt'), at: new Date().toISOString(), status: 'assessed', by: state.user.id, type: 'status', text: 'Duty demand ' + disb.ref + ' deleted. The file returned to assessment.' });
        entry.updatedAt = new Date().toISOString();
      }
    }
    closeModal();
    persist('Charge ' + disb.ref + ' deleted.');
    renderApp();
  }

  function voidDisbursement(id) {
    const disb = disbursementById(id);
    if (!disb) return;
    if (!isManager()) { toast('Only a manager can void a charge.'); return; }
    if (disb.void) { toast('That charge is already void.'); return; }
    if (C.disbPaid(disb) > 0.009) { toast('A charge with payments cannot be voided.'); return; }
    disb.void = true;
    disb.voidedAt = new Date().toISOString();
    disb.voidedBy = state.user.id;
    const entry = entryById(disb.entryId);
    if (entry) {
      if (disb.type === 'Duty & taxes' && entry.status === 'duty') {
        const remaining = state.data.disbursements.filter((d) => d.entryId === entry.id && d.type === 'Duty & taxes' && !d.void);
        if (!remaining.length) {
          entry.status = 'assessed';
          entry.statusSince = new Date().toISOString();
          entry.timeline.push({ id: C.uid('evt'), at: new Date().toISOString(), status: 'assessed', by: state.user.id, type: 'status', text: 'Duty demand ' + disb.ref + ' voided. The file returned to assessment.' });
        }
      }
      entry.updatedAt = new Date().toISOString();
      logActivity(entry, 'Voided charge ' + disb.ref + ' on ' + entry.id + '.');
    }
    closeModal();
    persist('Charge voided.');
    renderApp();
  }

  /* ------------------------------------------------------------------ *
   * Profile, settings and diagnostics
   * ------------------------------------------------------------------ */

  function submitOrg(form) {
    if (!isManager()) { toast('Only a manager can edit the desk profile.'); return; }
    const value = (name) => form.elements[name] ? String(form.elements[name].value || '').trim() : '';
    const name = value('name');
    if (name.length < 2) { toast('Add the trading name.'); return; }
    if (value('email') && !C.validEmail(value('email'))) { toast('Enter a valid desk email address.'); return; }
    const org = state.data.org;
    org.name = name;
    org.legalName = value('legalName');
    org.email = value('email');
    org.phone = value('phone');
    org.address = value('address');
    org.taxAuthority = value('taxAuthority');
    org.declarationPrefix = value('declarationPrefix').toUpperCase() || 'MCD';
    org.defaultFreeDays = Math.max(0, C.parseAmount(value('defaultFreeDays')));
    org.defaultStorageRate = Math.max(0, C.parseAmount(value('defaultStorageRate')));
    org.defaultDetentionRate = Math.max(0, C.parseAmount(value('defaultDetentionRate')));
    state.data.settings = Object.assign({}, state.data.settings, {
      defaultFreeDays: org.defaultFreeDays,
      defaultStorageRate: org.defaultStorageRate,
      defaultDetentionRate: org.defaultDetentionRate,
      declarationPrefix: org.declarationPrefix
    });
    persist('Desk profile saved.');
    renderApp();
  }

  function submitProfile(form) {
    const name = String(form.elements.name.value || '').trim();
    const title = String(form.elements.title.value || '').trim();
    const email = String(form.elements.email.value || '').trim().toLowerCase();
    if (name.length < 2) { toast('Add your full name.'); return; }
    if (!C.validEmail(email)) { toast('Enter a valid email address.'); return; }
    if (state.data.users.some((u) => u.id !== state.user.id && String(u.email).toLowerCase() === email)) { toast('Another seat already uses that email.'); return; }
    state.user.name = name;
    state.user.title = title || (state.user.role === 'manager' ? 'Manager' : 'Clearance officer');
    state.user.email = email;
    state.user.initials = initials(name);
    const stored = state.data.users.find((u) => u.id === state.user.id);
    if (stored) Object.assign(stored, { name: state.user.name, title: state.user.title, email: state.user.email, initials: state.user.initials });
    persist('Your details were saved.');
    renderApp();
  }

  function runDiagnostics() {
    if (!Tests || typeof Tests.run !== 'function') { toast('The test suite is not available.'); return; }
    let result;
    try {
      result = Tests.run();
    } catch (error) {
      toast('The test runner failed: ' + error.message);
      return;
    }
    state.ui.diagnostics = result;
    persist();
    renderApp();
    toast(result.failed ? result.failed + ' test' + (result.failed === 1 ? '' : 's') + ' failed.' : result.passed + '/' + result.total + ' tests passed.');
    const panel = document.getElementById('diagnostics-panel');
    if (panel && panel.scrollIntoView) window.setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  }

  /* ------------------------------------------------------------------ *
   * Shortcuts, reset and import
   * ------------------------------------------------------------------ */

  function openShortcuts() {
    const groups = [
      { title: 'Navigate', rows: [['Go to overview', 'G O'], ['Go to entries', 'G E'], ['Go to tariff', 'G T'], ['Go to clients', 'G C'], ['Go to disbursements', 'G D'], ['Go to reports', 'G R'], ['Go to settings', 'G S']] },
      { title: 'Act', rows: [['Search the workspace', modKey() + ' K'], ['New entry', 'N'], ['Focus this list\u2019s search', '/'], ['Open shortcuts', '?'], ['Close a dialog or overlay', 'Esc'], ['Open focused row', 'Enter']] }
    ];
    showModal('<div class="modal modal--shortcuts">' + modalHeader('Reference', 'Keyboard shortcuts', 'The desk is built to be driven from the keyboard.') +
      '<div class="modal-body"><div class="shortcut-sheet">' + groups.map((group) => '<section class="shortcut-group"><p class="eyebrow">' + group.title + '</p>' + group.rows.map((row) => '<div class="shortcut-row"><span>' + row[0] + '</span><kbd>' + row[1] + '</kbd></div>').join('') + '</section>').join('') + '</div>' +
      '<p class="settings-note">Search opens with ' + modKey() + ' K and covers entry numbers, references, clients, HS codes and views.</p></div>' +
      '<div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Close</button><button class="btn btn--primary" type="button" data-act="open-palette">' + icon('search') + ' Open search</button></div></div>');
  }

  function openResetModal() {
    if (!isManager()) { toast('Only a manager can reset the workspace.'); return; }
    showModal('<div class="modal">' + modalHeader('Reset workspace', 'Replace this desk with demo data?', 'Every local entry, client, charge and account created in this browser will be removed.') +
      '<div class="modal-body"><div class="close-warning">' + icon('alertCircle') + '<div><strong>This cannot be undone.</strong><span>Export a JSON backup first if you need to keep the current workspace.</span></div></div></div>' +
      '<div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="button" data-act="confirm-reset">Reset demo data</button></div></div>');
  }

  function resetWorkspace() {
    const fresh = window.buildDeclarantSeed();
    state.data = fresh;
    const saved = C.saveWorkspace(fresh);
    if (!saved.ok) {
      state.storageAvailable = false;
      state.storageWarning = 'Browser storage is unavailable. Changes will last for this tab only.';
    }
    C.clearSession();
    state.user = null;
    state.route = null;
    state.currentRouteKey = '';
    state.ui.authMode = 'signin';
    state.ui.authError = '';
    state.ui.authNotice = 'Demo data reset. Sign in with a demo account below.';
    closeModal();
    renderAuth();
    toast('Demo workspace reset.');
  }

  function validateImportedWorkspace(data) {
    if (!data || data.schema !== C.SCHEMA) return 'The file is not a Declarant workspace with schema 1.';
    if (!Array.isArray(data.users) || !data.users.length) return 'The workspace has no user accounts.';
    if (!Array.isArray(data.clients) || !Array.isArray(data.entries) || !Array.isArray(data.disbursements)) return 'The workspace is missing its client, entry or ledger tables.';
    if (!data.org || !data.org.name) return 'The workspace is missing its organisation profile.';
    return '';
  }

  function importWorkspaceFile(input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      let parsed;
      try {
        parsed = JSON.parse(String(reader.result || ''));
      } catch (error) {
        showModal('<div class="modal">' + modalHeader('Import', 'That file is not valid JSON', 'Choose a Declarant JSON backup and try again.') +
          '<div class="modal-body"><div class="blocker-list"><div class="blocker-item">' + icon('alertCircle') + '<span>The backup could not be parsed. No data was changed.</span></div></div></div>' +
          '<div class="modal-foot"><button class="btn btn--primary" type="button" data-act="close-modal">Close</button></div></div>');
        return;
      }
      const data = parsed && parsed.data ? parsed.data : parsed;
      const issue = validateImportedWorkspace(data);
      if (issue) {
        showModal('<div class="modal">' + modalHeader('Import', 'That backup cannot be used', 'No existing data was changed.') +
          '<div class="modal-body"><div class="blocker-list"><div class="blocker-item">' + icon('alertCircle') + '<span>' + esc(issue) + '</span></div></div></div>' +
          '<div class="modal-foot"><button class="btn btn--primary" type="button" data-act="close-modal">Close</button></div></div>');
        return;
      }
      pendingImport = data;
      showModal('<div class="modal">' + modalHeader('Import', 'Replace this workspace?', 'The backup will replace every local entry, client, charge and account.') +
        '<div class="modal-body">' +
          '<div class="confirm-summary"><div><span>Entries</span><strong>' + data.entries.length + '</strong></div><div><span>Clients</span><strong>' + data.clients.length + '</strong></div><div><span>Charges</span><strong>' + data.disbursements.length + '</strong></div><div><span>Seats</span><strong>' + data.users.length + '</strong></div></div>' +
          '<p class="settings-note">Source updated ' + (data.updatedAt ? C.fmtDateTime(data.updatedAt) : 'unknown') + '.</p>' +
          '<div class="close-warning">' + icon('alertCircle') + '<div><strong>Keep a backup of the current desk.</strong><span>This action cannot be undone from inside the product.</span></div></div>' +
        '</div><div class="modal-foot"><button class="btn btn--ghost" type="button" data-act="close-modal">Cancel</button><button class="btn btn--primary" type="button" data-act="confirm-import">Replace workspace</button></div></div>');
    };
    reader.onerror = function () { toast('The backup could not be read.'); };
    reader.readAsText(file);
  }

  function confirmImport() {
    if (!pendingImport) { closeModal(); return; }
    const data = pendingImport;
    pendingImport = null;
    if (!Array.isArray(data.activity)) data.activity = [];
    if (!data.counters) {
      data.counters = {
        entry: 1 + data.entries.reduce((max, e) => Math.max(max, C.num(String(e.id || '').replace(/\D/g, ''), 0)), 0),
        client: 1 + data.clients.reduce((max, c) => Math.max(max, C.num(String(c.id || '').replace(/\D/g, ''), 0)), 0),
        disbursement: 1 + data.disbursements.reduce((max, d) => Math.max(max, C.num(String(d.id || '').replace(/\D/g, ''), 0)), 0),
        activity: 1 + data.activity.reduce((max, a) => Math.max(max, C.num(String(a.id || '').replace(/\D/g, ''), 0)), 0)
      };
    }
    state.data = data;
    const previousId = state.user && state.user.id;
    const replacement = data.users.find((u) => u.id === previousId && u.active !== false);
    if (replacement) {
      state.user = replacement;
      C.saveSession({ userId: replacement.id, at: new Date().toISOString() });
    } else {
      state.user = null;
      C.clearSession();
    }
    closeModal();
    persist('Workspace imported.');
    if (state.user) renderApp();
    else renderAuth();
    toast('Workspace imported.');
  }

  /* ------------------------------------------------------------------ *
   * Exports
   * ------------------------------------------------------------------ */

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      if (link.parentNode) link.parentNode.removeChild(link);
      URL.revokeObjectURL(url);
    }, 600);
  }

  function exportEntries() {
    const rows = filteredEntries();
    const header = ['File', 'Client', 'Reference', 'Mode', 'Origin', 'Port', 'ETA', 'Status', 'Docs verified', 'Docs required', 'Currency', 'FX', 'CIF USD', 'Duty', 'Excise', 'VAT', 'Levies', 'Total tax', 'Service fee', 'Outstanding', 'Owner', 'Created'];
    const body = rows.map((entry) => {
      const facts = entryFacts(entry);
      const calc = facts.calc;
      return [
        entry.id, clientOf(entry).name, entry.reference, entry.mode, entry.origin, entry.port, entry.eta, statusMeta(entry.status).label,
        facts.docs.verified, facts.docs.required, entry.currency, entry.fxRate, calc.cifUsd, calc.totals.duty, calc.totals.excise, calc.totals.vat,
        calc.totals.levy, calc.totals.taxes, calc.fee, facts.balance.outstanding, userOf(entry.ownerId).name, C.isoDate(entry.createdAt)
      ];
    });
    downloadFile('declarant-entries-' + today() + '.csv', '\ufeff' + C.toCSV([header].concat(body)));
    toast(rows.length + ' entries exported.');
  }

  function exportDisbursements() {
    const rows = filteredDisbursements();
    const header = ['Charge', 'Entry', 'Client', 'Type', 'Description', 'Incurred', 'Due', 'Amount', 'Recovered', 'Outstanding', 'Status', 'Paid to', 'Receipt', 'Reference'];
    const body = rows.map((d) => [
      d.ref, d.entryId || '', clientOf({ clientId: d.clientId }).name, d.type, d.description, C.isoDate(d.incurredDate), C.isoDate(d.dueDate),
      d.amount, C.disbPaid(d), C.disbOutstanding(d), C.disbState(d, today()), d.paidTo || '', d.receiptNo || '', d.id
    ]);
    downloadFile('declarant-disbursements-' + today() + '.csv', '\ufeff' + C.toCSV([header].concat(body)));
    toast(rows.length + ' charges exported.');
  }

  function exportTariff() {
    const rows = filteredTariff();
    const header = ['HS code', 'Goods', 'Chapter', 'Unit', 'Duty %', 'Preference %', 'Preference bloc', 'Excise %', 'VAT %', 'Levy %', 'Permit', 'Dangerous goods', 'Notes'];
    const body = rows.map((t) => [t.code, t.desc, t.chapter, t.unit, t.duty, t.prefDuty == null ? '' : t.prefDuty, t.prefBloc || '', t.excise, t.vat, t.levy, t.permit ? 'Yes' : 'No', t.dangerous ? 'Yes' : 'No', t.notes]);
    downloadFile('declarant-tariff-' + today() + '.csv', '\ufeff' + C.toCSV([header].concat(body)));
    toast(rows.length + ' tariff lines exported.');
  }

  function exportReportCSV() {
    const m = reportMetrics();
    const series = monthSeries();
    const modes = C.MODE_LIST.map((mode) => ({ label: mode.label, count: m.entries.filter((e) => e.mode === mode.id).length }));
    const aging = activeEntries().map((entry) => ({ entry: entry, age: C.statusAge(entry, today()) })).sort((a, b) => b.age - a.age).slice(0, 6);
    const range = m.days == null ? 'All time' : 'Last ' + m.days + ' days';
    const rows = [
      ['Declarant operations report'],
      ['Period', range],
      ['Generated', C.fmtDateTime(new Date().toISOString())],
      ['Currency', 'USD'],
      [],
      ['Metric', 'Value'],
      ['Files opened', m.entries.length],
      ['Files released', m.released.length],
      ['Duty collected', m.dutyPaid],
      ['Duty computed', m.dutyTotal],
      ['Average cycle (days)', m.avgCycle],
      ['Cleared in free time (%)', m.onTimePct],
      [],
      ['Month', 'Files opened', 'Released', 'Duty collected'],
    ].concat(series.map((s) => [s.full, s.created, s.released, s.duty]));
    rows.push([], ['Mode', 'Files']);
    modes.forEach((mode) => rows.push([mode.label, mode.count]));
    rows.push([], ['Client', 'Files', 'Duty & tax']);
    m.topClients.forEach((client) => rows.push([client.client.name, client.files, client.duty]));
    rows.push([], ['Oldest open file', 'Client', 'Status', 'Days in status']);
    aging.forEach((row) => rows.push([row.entry.id, clientOf(row.entry).short, statusMeta(row.entry.status).label, row.age]));
    downloadFile('declarant-report-' + today() + '.csv', '\ufeff' + C.toCSV(rows));
    toast('Report exported.');
  }

  function exportWorkspace() {
    const payload = {
      product: 'Declarant',
      version: C.VERSION,
      schema: C.SCHEMA,
      exportedAt: new Date().toISOString(),
      data: state.data
    };
    downloadFile('declarant-backup-' + today() + '.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    toast('Workspace backup downloaded.');
  }

  function exportStatementCSV(clientId, from, to) {
    const statement = statementFor(clientId, from, to);
    if (!statement) { toast('That client no longer exists.'); return; }
    const rows = [
      ['Statement of account'],
      ['Client', statement.client.name],
      ['Period', statement.from + ' to ' + statement.to],
      ['Generated', C.fmtDateTime(statement.generatedAt)],
      ['Currency', 'USD'],
      [],
      ['Date', 'Reference', 'Description', 'Type', 'Charge', 'Payment', 'Balance'],
      ['', '', 'Opening balance', '', '', '', statement.opening]
    ];
    statement.rows.forEach((row) => rows.push([row.date, row.ref, row.description, row.kind, row.charge, row.payment, row.balance]));
    rows.push([], ['', '', 'Closing balance', '', statement.charges, statement.payments, statement.closing]);
    downloadFile('declarant-statement-' + statement.client.id + '-' + today() + '.csv', '\ufeff' + C.toCSV(rows));
    toast('Statement exported.');
  }

  /* ------------------------------------------------------------------ *
   * Printed outputs
   * ------------------------------------------------------------------ */

  function printOrgHead(label, title, reference) {
    const org = state.data.org;
    return '<header class="print-head">' +
      '<div class="print-brand"><span class="print-mark" aria-hidden="true"><i></i><i></i><i></i></span><div><strong>' + esc(String(org.name || 'Declarant').toUpperCase()) + '</strong><span>' + esc(org.legalName || '') + '</span></div></div>' +
      '<div class="print-contact"><span>' + esc(org.address || '') + '</span><span>' + esc(org.phone || '') + ' · ' + esc(org.email || '') + '</span><span>Licensed customs clearing agent · ' + esc(org.taxAuthority || '') + '</span></div>' +
    '</header>' +
    '<div class="print-rule"></div>' +
    '<div class="print-title"><div><p>' + esc(label) + '</p><h1>' + esc(title) + '</h1></div><div class="print-title__ref"><span>Reference</span><strong>' + esc(reference) + '</strong><span>' + C.fmtDate(today(), { day: '2-digit', month: 'long', year: 'numeric' }) + '</span></div></div>';
  }

  function printFoot() {
    const org = state.data.org;
    return '<footer class="print-foot"><span>' + esc(org.name) + ' · ' + esc(org.address) + ' · ' + esc(org.phone) + '</span><span>Generated ' + C.fmtDateTime(new Date().toISOString()) + ' · Declarant v' + C.VERSION + '</span></footer>';
  }

  function printDocument(title, content) {
    if (!printRoot) return;
    printRoot.innerHTML = '<article class="print-doc">' + content + printFoot() + '</article>';
    document.body.classList.add('is-printing');
    document.title = title + ' · Declarant';
    window.setTimeout(() => {
      try { window.print(); } catch (error) { cleanupPrint(); toast('The print dialog could not be opened.'); }
      window.setTimeout(cleanupPrint, 1400);
    }, 50);
  }

  function cleanupPrint() {
    document.body.classList.remove('is-printing');
    if (printRoot) printRoot.innerHTML = '';
    if (state && state.user) document.title = breadcrumb(state.route || { name: 'overview' }) + ' · Declarant';
    else document.title = 'Declarant · Customs operations';
  }

  function printEntry(id, kind) {
    const entry = entryById(id);
    if (!entry) { toast('That file no longer exists.'); return; }
    if (kind === 'worksheet') { printWorksheet(entry); return; }
    if (kind === 'delivery') {
      if (['released', 'delivered', 'closed'].indexOf(entry.status) === -1) { toast('A delivery order is available after customs release.'); return; }
      printDeliveryOrder(entry);
      return;
    }
    printEntrySummary(entry);
  }

  function printEntrySummary(entry) {
    const facts = entryFacts(entry);
    const calc = facts.calc;
    const client = clientOf(entry);
    const owner = userOf(entry.ownerId);
    const docs = facts.docs.list;
    const status = statusMeta(entry.status);
    const timeline = (entry.timeline || []).slice(-10);
    const html = printOrgHead('Customs file', 'Entry summary', entry.id) +
      '<section class="print-section"><div class="print-summary"><div><span>Client</span><strong>' + esc(client.name) + '</strong><small>' + esc(client.contact) + ' · ' + esc(client.email) + '</small></div><div><span>Status</span><strong>' + esc(status.label) + '</strong><small>' + C.statusAge(entry, today()) + ' days in status</small></div><div><span>Owner</span><strong>' + esc(owner.name) + '</strong><small>' + C.fmtDate(entry.createdAt) + ' opened</small></div><div><span>Customs value</span><strong>' + C.money(calc.cifUsd, 'USD', 2) + '</strong><small>' + esc(entry.currency) + ' at ' + C.num(entry.fxRate).toFixed(4) + '</small></div></div></section>' +
      '<section class="print-section"><h2>Parties &amp; declaration</h2><table class="print-keys">' +
        '<tr><th>Client reference</th><td>' + esc(entry.reference) + '</td><th>Declaration reference</th><td>' + esc(entry.declarationRef || 'Not lodged') + '</td></tr>' +
        '<tr><th>Transport mode</th><td>' + esc(C.MODES[entry.mode] ? C.MODES[entry.mode].label : entry.mode) + '</td><th>Incoterm</th><td>' + esc(entry.incoterm) + '</td></tr>' +
        '<tr><th>Origin</th><td>' + esc(entry.origin || '—') + '</td><th>Port / border post</th><td>' + esc(entry.port) + (entry.facility ? ' · ' + esc(entry.facility) : '') + '</td></tr>' +
        '<tr><th>Carrier</th><td>' + esc(entry.carrier || '—') + '</td><th>Voyage / flight</th><td>' + esc(entry.voyage || '—') + '</td></tr>' +
        '<tr><th>Transport document</th><td>' + esc(entry.bl || '—') + '</td><th>Container</th><td>' + esc(entry.container || '—') + '</td></tr>' +
        '<tr><th>ETA</th><td>' + C.fmtDate(entry.eta) + '</td><th>Actual arrival</th><td>' + (entry.arrivalDate ? C.fmtDate(entry.arrivalDate) : 'Not recorded') + '</td></tr>' +
        '<tr><th>Customs procedure</th><td>' + esc(entry.procedure) + '</td><th>Assessment</th><td>' + (entry.assessment ? esc(entry.assessment.ref) + ' · ' + C.fmtDate(entry.assessment.date) : 'Not assessed') + '</td></tr>' +
      '</table></section>' +
      '<section class="print-section"><h2>Document checklist</h2><table class="print-table"><thead><tr><th>Document</th><th>Requirement</th><th>Status</th><th>Hint</th></tr></thead><tbody>' +
        docs.map((doc) => '<tr><td>' + esc(doc.label) + '</td><td>' + (doc.required ? 'Required' : 'Conditional / optional') + '</td><td>' + (doc.status === 'verified' ? 'Verified' : (doc.status === 'received' ? 'Received, pending verification' : 'Missing')) + '</td><td>' + esc(doc.hint) + '</td></tr>').join('') +
      '</tbody></table></section>' +
      '<section class="print-section print-split"><div><h2>Duty &amp; tax basis</h2><table class="print-keys print-keys--stack">' +
        '<tr><th>FOB value</th><td>' + C.money(calc.fobUsd, 'USD', 2) + '</td></tr><tr><th>Freight &amp; insurance</th><td>' + C.money(calc.otherChargesUsd, 'USD', 2) + '</td></tr><tr><th>CIF customs value</th><td>' + C.money(calc.cifUsd, 'USD', 2) + '</td></tr>' +
        '<tr><th>Duty</th><td>' + C.money(calc.totals.duty, 'USD', 2) + '</td></tr><tr><th>Excise</th><td>' + C.money(calc.totals.excise, 'USD', 2) + '</td></tr><tr><th>Levies</th><td>' + C.money(calc.totals.levy, 'USD', 2) + '</td></tr><tr><th>VAT</th><td>' + C.money(calc.totals.vat, 'USD', 2) + '</td></tr>' +
        '<tr class="print-emphasis"><th>Total duty &amp; tax</th><td>' + C.money(calc.totals.taxes, 'USD', 2) + '</td></tr>' +
      '</table></div><div><h2>Client position</h2><table class="print-keys print-keys--stack">' +
        '<tr><th>Duty &amp; tax</th><td>' + C.money(calc.totals.taxes, 'USD', 2) + '</td></tr><tr><th>Agency fee</th><td>' + C.money(calc.fee, 'USD', 2) + '</td></tr><tr><th>Recovered</th><td>' + C.money(facts.balance.paid, 'USD', 2) + '</td></tr><tr class="print-emphasis"><th>Outstanding</th><td>' + C.money(facts.balance.outstanding, 'USD', 2) + '</td></tr>' +
      '</table><p class="print-note">Duty paid to ' + esc(state.data.org.taxAuthority) + ': ' + C.money(dutyOutstanding(entry), 'USD', 2) + ' still open.</p></div></section>' +
      (entry.assessment && entry.assessment.note ? '<section class="print-section"><h2>Assessment note</h2><p class="print-note">' + esc(entry.assessment.note) + '</p></section>' : '') +
      (entry.query ? '<section class="print-section"><h2>Customs query ' + esc(entry.query.ref) + '</h2><p class="print-note">' + esc(entry.query.text) + (entry.query.resolution ? ' Resolution: ' + esc(entry.query.resolution) : '') + '</p></section>' : '') +
      '<section class="print-section"><h2>File movement</h2><table class="print-table"><thead><tr><th>Date</th><th>Status</th><th>Movement</th><th>By</th></tr></thead><tbody>' +
        (timeline.length ? timeline.map((event) => '<tr><td>' + C.fmtDateTime(event.at) + '</td><td>' + esc(event.status ? statusMeta(event.status).label : '—') + '</td><td>' + esc(event.text) + '</td><td>' + esc(userOf(event.by).name) + '</td></tr>').join('') : '<tr><td colspan="4">No movement recorded.</td></tr>') +
      '</tbody></table></section>' +
      '<section class="print-signatures"><div><span>Prepared by</span><strong>' + esc(state.user.name) + '</strong><small>' + esc(state.user.title || state.user.role) + '</small></div><div><span>Authorised signature</span><i></i></div><div><span>Date</span><i></i></div></section>';
    printDocument('Entry ' + entry.id, html);
  }

  function printWorksheet(entry) {
    const calc = C.calculateEntry(entry);
    const client = clientOf(entry);
    const html = printOrgHead('Customs computation', 'Duty worksheet', entry.id) +
      '<section class="print-section"><div class="print-summary"><div><span>Client</span><strong>' + esc(client.name) + '</strong><small>' + esc(entry.reference) + '</small></div><div><span>Declaration</span><strong>' + esc(entry.declarationRef || 'Not lodged') + '</strong><small>' + esc(entry.port) + '</small></div><div><span>Currency</span><strong>' + esc(entry.currency) + '</strong><small>FX ' + C.num(entry.fxRate).toFixed(4) + ' to USD</small></div><div><span>Customs value</span><strong>' + C.money(calc.cifUsd, 'USD', 2) + '</strong><small>CIF basis</small></div></div></section>' +
      '<section class="print-section"><h2>Line-by-line computation</h2><table class="print-table print-table--numbers"><thead><tr><th>#</th><th>HS code / goods</th><th class="r">Qty</th><th class="r">Unit value</th><th class="r">FOB</th><th class="r">Freight + ins.</th><th class="r">CIF</th><th class="r">Duty</th><th class="r">Excise</th><th class="r">VAT</th><th class="r">Tax</th></tr></thead><tbody>' +
        calc.lines.map((line, index) => '<tr><td>' + String(index + 1).padStart(2, '0') + '</td><td><strong>' + esc(line.hs) + '</strong><br>' + esc(line.description) + '<small>' + esc(line.origin || 'Origin not stated') + (line.prefApplied ? ' · ' + esc(line.prefBloc) + ' preferential' : '') + '</small></td><td class="r">' + C.num(line.qty).toLocaleString('en-US') + ' ' + esc(line.unit) + '</td><td class="r">' + C.money(line.unitValue, 'USD', 2) + '</td><td class="r">' + C.money(line.fob * calc.fx, 'USD', 2) + '</td><td class="r">' + C.money(line.allocation * calc.fx, 'USD', 2) + '</td><td class="r">' + C.money(line.cifUsd, 'USD', 2) + '</td><td class="r">' + C.money(line.duty, 'USD', 2) + '<small>' + C.pct(line.appliedDutyRate) + '</small></td><td class="r">' + C.money(line.excise, 'USD', 2) + '</td><td class="r">' + C.money(line.vat, 'USD', 2) + '<small>' + C.pct(line.vatRate) + '</small></td><td class="r">' + C.money(line.taxes, 'USD', 2) + '</td></tr>').join('') +
      '</tbody><tfoot><tr><td colspan="2">Totals · ' + C.num(calc.weight).toLocaleString('en-US') + ' kg</td><td class="r"></td><td class="r"></td><td class="r">' + C.money(calc.fobUsd, 'USD', 2) + '</td><td class="r">' + C.money(calc.otherChargesUsd, 'USD', 2) + '</td><td class="r">' + C.money(calc.cifUsd, 'USD', 2) + '</td><td class="r">' + C.money(calc.totals.duty, 'USD', 2) + '</td><td class="r">' + C.money(calc.totals.excise, 'USD', 2) + '</td><td class="r">' + C.money(calc.totals.vat, 'USD', 2) + '</td><td class="r">' + C.money(calc.totals.taxes, 'USD', 2) + '</td></tr></tfoot></table></section>' +
      '<section class="print-section print-split"><div><h2>Basis</h2><ul class="print-list"><li>Invoice currency ' + esc(entry.currency) + ' converted at ' + C.num(entry.fxRate).toFixed(4) + ' to USD.</li><li>Freight and insurance allocated pro rata by each line\u2019s FOB value.</li><li>Duty is charged on CIF; excise is charged on CIF plus duty; VAT follows the applicable tariff line.</li>' + (calc.totals.preferenceSaving > 0 ? '<li>Preferential origin evidence reduces duty by ' + C.money(calc.totals.preferenceSaving, 'USD', 2) + '.</li>' : '') + '</ul><p class="print-note">Rates are illustrative and must be checked against the current authority tariff before lodgement.</p></div><div><h2>Totals</h2><table class="print-keys print-keys--stack"><tr><th>Duty</th><td>' + C.money(calc.totals.duty, 'USD', 2) + '</td></tr><tr><th>Excise</th><td>' + C.money(calc.totals.excise, 'USD', 2) + '</td></tr><tr><th>Levies</th><td>' + C.money(calc.totals.levy, 'USD', 2) + '</td></tr><tr><th>VAT</th><td>' + C.money(calc.totals.vat, 'USD', 2) + '</td></tr><tr class="print-emphasis"><th>Total duty &amp; tax</th><td>' + C.money(calc.totals.taxes, 'USD', 2) + '</td></tr><tr><th>Effective rate</th><td>' + C.pct(calc.effectiveRate) + '</td></tr></table></div></section>' +
      '<section class="print-signatures"><div><span>Prepared by</span><strong>' + esc(state.user.name) + '</strong><small>' + C.fmtDate(today()) + '</small></div><div><span>Checked by</span><i></i></div><div><span>Customs stamp</span><i></i></div></section>';
    printDocument('Duty worksheet ' + entry.id, html);
  }

  function printDeliveryOrder(entry) {
    const client = clientOf(entry);
    const calc = C.calculateEntry(entry);
    const consignee = entry.releasedTo || client.contact;
    const html = printOrgHead('Release authority', 'Delivery order', entry.id) +
      '<section class="print-section print-delivery"><div><span class="print-stamp">Released</span><p class="print-note">The consignment below has been cleared by customs and is authorised for delivery to the consignee named on this order.</p></div><div class="print-delivery__meta"><div><span>Release reference</span><strong>' + esc(entry.releaseRef || '—') + '</strong></div><div><span>Release date</span><strong>' + C.fmtDate(entry.releasedAt) + '</strong></div><div><span>Consignee</span><strong>' + esc(consignee) + '</strong></div><div><span>Client account</span><strong>' + C.money(totalOutstanding(entry), 'USD', 2) + ' open</strong></div></div></section>' +
      '<section class="print-section"><h2>Consignment</h2><table class="print-keys">' +
        '<tr><th>Client</th><td>' + esc(client.name) + '</td><th>Client reference</th><td>' + esc(entry.reference) + '</td></tr>' +
        '<tr><th>Mode</th><td>' + esc(C.MODES[entry.mode] ? C.MODES[entry.mode].label : entry.mode) + '</td><th>Port / facility</th><td>' + esc(entry.port) + (entry.facility ? ' · ' + esc(entry.facility) : '') + '</td></tr>' +
        '<tr><th>Carrier</th><td>' + esc(entry.carrier || '—') + '</td><th>Transport document</th><td>' + esc(entry.bl || '—') + '</td></tr>' +
        '<tr><th>Container</th><td>' + esc(entry.container || '—') + '</td><th>Arrival</th><td>' + C.fmtDate(entry.arrivalDate || entry.eta) + '</td></tr>' +
        '<tr><th>Packages / weight</th><td>' + C.num(entry.lines.reduce((sum, line) => sum + C.num(line.qty), 0)).toLocaleString('en-US') + ' units · ' + C.num(calc.weight).toLocaleString('en-US') + ' kg</td><th>Customs value</th><td>' + C.money(calc.cifUsd, 'USD', 2) + '</td></tr>' +
      '</table></section>' +
      '<section class="print-section"><h2>Goods</h2><table class="print-table"><thead><tr><th>HS code</th><th>Description</th><th class="r">Quantity</th><th class="r">CIF USD</th></tr></thead><tbody>' +
        calc.lines.map((line) => '<tr><td>' + esc(line.hs) + '</td><td>' + esc(line.description) + '</td><td class="r">' + C.num(line.qty).toLocaleString('en-US') + ' ' + esc(line.unit) + '</td><td class="r">' + C.money(line.cifUsd, 'USD', 2) + '</td></tr>').join('') +
      '</tbody></table></section>' +
      '<section class="print-section"><h2>Instructions</h2><ul class="print-list"><li>Quote this delivery order number at the terminal gate. Identity of the collecting driver may be requested.</li><li>Duty and taxes have been settled with ' + esc(state.data.org.taxAuthority) + '. Operational charges remain subject to the client account terms.</li><li>Any shortage or damage must be noted on the proof of delivery at the time of collection.</li></ul></section>' +
      '<section class="print-signatures"><div><span>For ' + esc(state.data.org.name) + '</span><strong>' + esc(state.user.name) + '</strong><small>Authorised signatory</small></div><div><span>Received by consignee</span><i></i></div><div><span>Date &amp; time</span><i></i></div></section>';
    printDocument('Delivery order ' + entry.id, html);
  }

  function printStatementDocument(clientId, from, to) {
    const statement = statementFor(clientId, from, to);
    if (!statement) { toast('That client no longer exists.'); return; }
    const client = statement.client;
    const rows = statement.rows;
    const html = printOrgHead('Statement of account', client.name, client.id) +
      '<section class="print-section"><div class="print-summary"><div><span>Period</span><strong>' + C.fmtDate(statement.from) + ' — ' + C.fmtDate(statement.to) + '</strong><small>Currency USD</small></div><div><span>Contact</span><strong>' + esc(client.contact) + '</strong><small>' + esc(client.email) + '</small></div><div><span>Terms</span><strong>' + client.terms + ' days</strong><small>Credit limit ' + C.money(client.creditLimit, 'USD', 2) + '</small></div><div><span>Closing balance</span><strong>' + C.money(statement.closing, 'USD', 2) + '</strong><small>Opening ' + C.money(statement.opening, 'USD', 2) + '</small></div></div></section>' +
      '<section class="print-section"><h2>Account movement</h2>' + (rows.length ? '<table class="print-table print-table--numbers"><thead><tr><th>Date</th><th>Reference</th><th>Description</th><th class="r">Charge</th><th class="r">Payment</th><th class="r">Balance</th></tr></thead><tbody>' +
        rows.map((row) => '<tr><td>' + C.fmtDate(row.date) + '</td><td>' + esc(row.ref) + '</td><td>' + esc(row.description) + '<small>' + esc(row.kind) + '</small></td><td class="r">' + (row.charge ? C.money(row.charge, 'USD', 2) : '—') + '</td><td class="r">' + (row.payment ? C.money(row.payment, 'USD', 2) : '—') + '</td><td class="r">' + C.money(row.balance, 'USD', 2) + '</td></tr>').join('') +
        '</tbody><tfoot><tr><td colspan="3">Period movement</td><td class="r">' + C.money(statement.charges, 'USD', 2) + '</td><td class="r">' + C.money(statement.payments, 'USD', 2) + '</td><td class="r">' + C.money(statement.closing, 'USD', 2) + '</td></tr></tfoot></table>' : '<p class="print-note">No fees, disbursements or payments were recorded in this period.</p>') +
      '</section>' +
      '<section class="print-section print-split"><div><h2>Summary</h2><table class="print-keys print-keys--stack"><tr><th>Opening balance</th><td>' + C.money(statement.opening, 'USD', 2) + '</td></tr><tr><th>Charges in period</th><td>' + C.money(statement.charges, 'USD', 2) + '</td></tr><tr><th>Payments in period</th><td>' + C.money(statement.payments, 'USD', 2) + '</td></tr><tr class="print-emphasis"><th>Closing balance</th><td>' + C.money(statement.closing, 'USD', 2) + '</td></tr></table></div><div><h2>Payment instructions</h2><p class="print-note">Settle to ' + esc(state.data.org.legalName || state.data.org.name) + ' quoting the client reference and charge number. Bank details are issued on the invoice. Please report any discrepancy within seven days of this statement.</p></div></section>' +
      '<section class="print-signatures"><div><span>Statement prepared by</span><strong>' + esc(state.user.name) + '</strong><small>' + C.fmtDateTime(statement.generatedAt) + '</small></div><div><span>Client acknowledgement</span><i></i></div><div><span>Date</span><i></i></div></section>';
    printDocument('Statement ' + client.id, html);
  }

  function printReportDocument() {
    const m = reportMetrics();
    const series = monthSeries();
    const modes = C.MODE_LIST.map((mode) => ({ label: mode.label, count: m.entries.filter((e) => e.mode === mode.id).length }));
    const aging = activeEntries().map((entry) => ({ entry: entry, age: C.statusAge(entry, today()) })).sort((a, b) => b.age - a.age).slice(0, 8);
    const range = m.days == null ? 'All time' : 'Last ' + m.days + ' days';
    const html = printOrgHead('Operations report', 'Clearance performance', range) +
      '<section class="print-section"><div class="print-kpis"><div><span>Files opened</span><strong>' + m.entries.length + '</strong><small>' + m.released.length + ' released</small></div><div><span>Duty collected</span><strong>' + C.money(m.dutyPaid, 'USD', 2) + '</strong><small>' + C.money(m.dutyTotal, 'USD', 2) + ' computed</small></div><div><span>Average cycle</span><strong>' + m.avgCycle + 'd</strong><small>lodged to release</small></div><div><span>Cleared in free time</span><strong>' + m.onTimePct + '%</strong><small>no demurrage</small></div></div></section>' +
      '<section class="print-section"><h2>Duty collected, six months</h2>' + dutyChartSVG(series) + '</section>' +
      '<section class="print-section print-split"><div><h2>Volume by month</h2><table class="print-table"><thead><tr><th>Month</th><th class="r">Opened</th><th class="r">Released</th><th class="r">Duty</th></tr></thead><tbody>' + series.map((s) => '<tr><td>' + esc(s.full) + '</td><td class="r">' + s.created + '</td><td class="r">' + s.released + '</td><td class="r">' + C.money(s.duty, 'USD', 2) + '</td></tr>').join('') + '</tbody></table></div><div><h2>Mode mix</h2><table class="print-table"><thead><tr><th>Mode</th><th class="r">Files</th><th class="r">Share</th></tr></thead><tbody>' + modes.map((mode) => '<tr><td>' + esc(mode.label) + '</td><td class="r">' + mode.count + '</td><td class="r">' + (m.entries.length ? C.pct((mode.count / m.entries.length) * 100, 0) : '0%') + '</td></tr>').join('') + '</tbody></table></div></section>' +
      '<section class="print-section"><h2>Top duty accounts</h2><table class="print-table"><thead><tr><th>Client</th><th class="r">Files</th><th class="r">Duty &amp; tax</th><th class="r">Share</th></tr></thead><tbody>' + m.topClients.map((row) => '<tr><td>' + esc(row.client.name) + '</td><td class="r">' + row.files + '</td><td class="r">' + C.money(row.duty, 'USD', 2) + '</td><td class="r">' + (m.dutyTotal ? C.pct((row.duty / m.dutyTotal) * 100, 0) : '0%') + '</td></tr>').join('') + '</tbody></table></section>' +
      '<section class="print-section"><h2>Oldest open stages</h2>' + (aging.length ? '<table class="print-table"><thead><tr><th>File</th><th>Client</th><th>Status</th><th class="r">Days in status</th></tr></thead><tbody>' + aging.map((row) => '<tr><td>' + esc(row.entry.id) + '</td><td>' + esc(clientOf(row.entry).short) + '</td><td>' + esc(statusMeta(row.entry.status).label) + '</td><td class="r">' + row.age + '</td></tr>').join('') + '</tbody></table>' : '<p class="print-note">No open files.</p>') + '</section>' +
      '<p class="print-note">Generated from the local Declarant workspace. Figures are operational and exclude taxes collected on behalf of customs unless stated.</p>';
    printDocument('Operations report', html);
  }

  function copyText(text) {
    const fallback = () => {
      try {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.className = 'sr-only';
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(area);
        toast(copied ? 'Copied to clipboard.' : 'Select the text and copy it manually.');
      } catch (error) {
        toast('Select the text and copy it manually.');
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard.'), fallback);
    } else {
      fallback();
    }
  }

  boot();
})();
