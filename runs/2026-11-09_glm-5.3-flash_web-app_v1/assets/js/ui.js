/* ============================================================
   Galley — ui.js — DOM kit: h(), icons, toasts, modals,
   popovers, shared chips. Views are built from these parts.
   ============================================================ */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const D = G.domain;

  /* ---------- element builder ---------- */
  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'html') el.innerHTML = v; // trusted markup only (icons)
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) { child.forEach((c) => append(el, c)); return; }
    el.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function frag() {
    const f = document.createDocumentFragment();
    for (let i = 0; i < arguments.length; i++) append(f, arguments[i]);
    return f;
  }

  /* ---------- icons (hand-drawn, stroke, 24 box) ---------- */
  const PATHS = {
    board: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="14" rx="1"/>',
    rows: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    paper: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    layout: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M12 10v10"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.4c2.3.2 4 1.8 4.5 4.6"/>',
    pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6h5"/>',
    box: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>',
    command: '<path d="M9 9h6v6H9z"/><path d="M9 9H7a2 2 0 1 1 2-2v2zM15 9h2a2 2 0 1 0-2-2v2zM9 15H7a2 2 0 1 0 2 2v-2zM15 15h2a2 2 0 1 1-2 2v-2z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    cross: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    checkCircle: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5l2.5 2.5 4.8-5.5"/>',
    chevronDown: '<path d="M6 9.5l6 6 6-6"/>',
    chevronRight: '<path d="M9.5 6l6 6-6 6"/>',
    chevronLeft: '<path d="M14.5 6l-6 6 6 6"/>',
    more: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
    pen: '<path d="M14.5 5.5l4 4L8 20l-4.7 1L4.5 16.5z"/><path d="M13 7l4 4"/>',
    scissors: '<circle cx="7" cy="7" r="2.5"/><circle cx="7" cy="17" r="2.5"/><path d="M9 8.5L19 19M9 15.5L19 5"/>',
    lamp: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 1 3.5 10.9c-.8.6-1.5 1.6-1.5 2.6V17h-4v-.5c0-1-.7-2-1.5-2.6A6 6 0 0 1 12 3z"/>',
    user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6"/>',
    press: '<path d="M7 8V4h10v4"/><rect x="4" y="8" width="16" height="7" rx="1"/><path d="M6 15v5h12v-5M9 20h6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    calendar: '<rect x="4" y="5" width="16" height="16" rx="1"/><path d="M4 10h16M8 3v4M16 3v4"/>',
    alert: '<path d="M12 4L2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.5"/>',
    undo: '<path d="M4 10h9a5.5 5.5 0 1 1 0 11h-3"/><path d="M8 6l-4 4 4 4"/>',
    redo: '<path d="M20 10h-9a5.5 5.5 0 1 0 0 11h3"/><path d="M16 6l4 4-4 4"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M5 20h14"/>',
    upload: '<path d="M12 15V4M7 8.5l5-5 5 5"/><path d="M5 20h14"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2.6M12 17.9v2.6M3.5 12h2.6M17.9 12h2.6M6 6l1.9 1.9M16.1 16.1L18 18M18 6l-1.9 1.9M7.9 16.1L6 18"/>',
    grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
    hold: '<rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/>',
    tag: '<path d="M4 4h7l9 9-7 7-9-9z"/><circle cx="8.5" cy="8.5" r="1.4"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="1"/><path d="M5 15H4V4h11v1"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M8 7l.8 13h6.4L16 7"/>',
    restore: '<path d="M4 10a8 8 0 1 1 2 6"/><path d="M4 5v5h5"/>',
    filter: '<path d="M4 5h16l-6 7v6l-4 2v-8z"/>',
    sort: '<path d="M8 5v14M8 5l-3 3M8 5l3 3M16 19V5M16 19l-3-3M16 19l3-3"/>',
    arrowRight: '<path d="M4 12h16M14 6l6 6-6 6"/>',
    keyboard: '<rect x="3" y="7" width="18" height="11" rx="1.5"/><path d="M7 11h.5M11 11h.5M15 11h.5M17 11h.5M7.5 14.5h9"/>',
    bolt: '<path d="M13 3L5 14h5l-1 7 8-11h-5z"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    pin: '<path d="M9 4h6l-1 6 3.5 3.5H6.5L10 10z"/><path d="M12 13.5V21"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/>',
  };

  function icon(name, size) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size || 18);
    svg.setAttribute('height', size || 18);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = PATHS[name] || PATHS.paper;
    return svg;
  }

  /* ---------- toasts ---------- */
  const toastHost = () => document.getElementById('toasts');
  function toast(kind, msg, action, ms) {
    const host = toastHost();
    if (!host) return;
    while (host.children.length >= 4) host.removeChild(host.firstChild);
    const t = h('div', { class: 'toast toast-' + kind, role: 'status' },
      h('span', { class: 'toast-icon' }, icon(kind === 'error' ? 'alert' : kind === 'success' ? 'checkCircle' : kind === 'warn' ? 'alert' : 'bolt', 16)),
      h('span', { class: 'toast-msg' }, msg),
      action ? h('button', { class: 'toast-action', type: 'button', onclick: () => { close(); action.run(); } }, action.label) : null,
      h('button', { class: 'toast-x', type: 'button', 'aria-label': 'Dismiss', onclick: close }, icon('cross', 13))
    );
    function close() { if (t.parentNode) { t.classList.add('toast-out'); setTimeout(() => t.remove(), 180); } }
    host.appendChild(t);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      requestAnimationFrame(() => t.classList.add('toast-in'));
    } else t.classList.add('toast-in');
    const life = ms || (action ? 8000 : 5000);
    setTimeout(close, life);
    return close;
  }

  /* ---------- modal ---------- */
  let modalStack = [];
  function openModal(opts) {
    // opts: {title, body(fn or node), actions:[{label, kind, onClick(close)->bool|Promise}], onClose, wide}
    const prevFocus = document.activeElement;
    const overlay = h('div', { class: 'overlay', role: 'presentation' });
    const dialog = h('div', { class: 'modal' + (opts.wide ? ' modal-wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title });
    const close = () => {
      if (dialog.dataset.locked === '1') return;
      overlay.classList.add('overlay-out');
      setTimeout(() => overlay.remove(), 140);
      modalStack = modalStack.filter((m) => m !== api);
      if (prevFocus && prevFocus.isConnected) try { prevFocus.focus(); } catch (e) { /* focus lost is fine */ }
      if (opts.onClose) opts.onClose();
    };
    dialog.appendChild(h('div', { class: 'modal-head' },
      h('h2', { class: 'modal-title' }, opts.title),
      h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Close dialog', onclick: close }, icon('cross', 16))
    ));
    const body = h('div', { class: 'modal-body' });
    dialog.appendChild(body);
    const foot = h('div', { class: 'modal-foot' });
    (opts.actions || []).forEach((a) => {
      const btn = h('button', {
        class: 'btn ' + (a.kind ? 'btn-' + a.kind : ''), type: 'button',
        disabled: a.disabled ? '' : null,
        onclick: async () => {
          let ok = true;
          if (a.onClick) ok = await a.onClick(close, body);
          if (ok !== false) close();
        },
      }, a.label);
      if (a.autofocus) btn.dataset.autofocus = '1';
      foot.appendChild(btn);
    });
    dialog.appendChild(foot);
    if (typeof opts.body === 'function') opts.body(body, close);
    else if (opts.body) body.appendChild(opts.body);
    overlay.appendChild(dialog);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    const api = { close, el: overlay, body };
    modalStack.push(api);
    const target = dialog.querySelector('[data-autofocus]') || dialog.querySelector('input,textarea,select,button');
    if (target) setTimeout(() => target.focus(), 30);
    return api;
  }
  function topModal() { return modalStack[modalStack.length - 1] || null; }
  function closeTopModal() { const m = topModal(); if (m) m.close(); }

  function confirmModal(opts) {
    // {title, message, confirmLabel, danger, extra(node), requireCheck}
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      const body = h('div', null,
        h('p', { class: 'modal-msg' }, opts.message),
        opts.extra || null
      );
      let checked = true;
      if (opts.requireCheck) {
        const cb = h('input', { type: 'checkbox', id: 'chk-' + Date.now(), checked: true });
        cb.addEventListener('change', () => { checked = cb.checked; });
        body.appendChild(h('label', { class: 'checkline', for: cb.id }, cb, h('span', null, opts.requireCheck)));
      }
      openModal({
        title: opts.title,
        body,
        onClose: () => finish(false),
        actions: [
          { label: 'Cancel', onClick: () => { finish(false); } },
          {
            label: opts.confirmLabel || 'Confirm', kind: opts.danger ? 'danger' : 'primary', autofocus: true,
            onClick: () => { if (opts.requireCheck && !checked) return false; finish(true); },
          },
        ],
      });
    });
  }

  function promptModal(opts) {
    // {title, message, value, placeholder, confirmLabel, validate(value)->msg|null}
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      let input;
      let errEl;
      openModal({
        title: opts.title,
        body: (body) => {
          if (opts.message) body.appendChild(h('p', { class: 'modal-msg' }, opts.message));
          input = h('input', { class: 'input', type: 'text', value: opts.value || '', placeholder: opts.placeholder || '', maxlength: String(opts.maxlength || 60) });
          errEl = h('div', { class: 'field-error', role: 'alert' });
          input.addEventListener('input', () => { errEl.textContent = ''; input.classList.remove('input-bad'); });
          input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
          body.appendChild(input);
          body.appendChild(errEl);
        },
        onClose: () => finish(null),
        actions: [
          { label: 'Cancel', onClick: () => finish(null) },
          {
            label: opts.confirmLabel || 'Save', kind: 'primary', autofocus: true,
            onClick: () => {
              const v = input.value;
              const msg = opts.validate ? opts.validate(v) : null;
              if (msg) { errEl.textContent = msg; input.classList.add('input-bad'); input.focus(); return false; }
              finish(v);
            },
          },
        ],
      });
    });
  }

  /* ---------- popover menu ---------- */
  let openPopovers = [];
  function closePopovers() {
    openPopovers.forEach((p) => p.el.remove());
    openPopovers = [];
  }
  /* items: [{label, icon, hint, danger, disabled, reason, onClick}] */
  function popover(anchor, items, opts) {
    opts = opts || {};
    closePopovers();
    const el = h('div', { class: 'popover', role: 'menu' });
    items.forEach((it) => {
      if (it.separator) { el.appendChild(h('div', { class: 'popover-sep', role: 'separator' })); return; }
      const item = h('button', {
        class: 'popover-item' + (it.danger ? ' popover-danger' : ''),
        type: 'button', role: 'menuitem',
        disabled: it.disabled ? '' : null,
        onclick: () => { closePopovers(); if (it.onClick) it.onClick(); },
      },
        it.icon ? h('span', { class: 'popover-icon' }, icon(it.icon, 15)) : null,
        h('span', { class: 'popover-label' }, it.label),
        it.hint ? h('span', { class: 'popover-hint' }, it.hint) : null,
        it.reason ? h('span', { class: 'popover-reason' }, it.reason) : null
      );
      if (it.disabled) item.setAttribute('aria-disabled', 'true');
      el.appendChild(item);
    });
    document.body.appendChild(el);
    const r = anchor.getBoundingClientRect();
    const pw = el.offsetWidth, ph = el.offsetHeight;
    let x = r.left, y = r.bottom + 6;
    if (opts.align === 'right') x = r.right - pw;
    if (x + pw > window.innerWidth - 8) x = window.innerWidth - 8 - pw;
    if (x < 8) x = 8;
    if (y + ph > window.innerHeight - 8) y = r.top - ph - 6;
    el.style.left = x + 'px';
    el.style.top = Math.max(8, y) + 'px';
    const entry = { el };
    openPopovers.push(entry);
    setTimeout(() => {
      const first = el.querySelector('button:not(:disabled)');
      if (first && opts.focus !== false) first.focus();
    }, 10);
    return { el, close: closePopovers };
  }

  /* ---------- shared chips ---------- */
  function statusChip(statusId, opts) {
    opts = opts || {};
    const s = D.STATUS_MAP[statusId] || D.STATUS_MAP.pitch;
    return h('span', { class: 'chip chip-' + statusId, title: s.hint },
      icon(s.icon, opts.small ? 11 : 12),
      h('span', null, s.label)
    );
  }

  function duePill(story) {
    const st = D.dueState(story);
    if (!story.due) return h('span', { class: 'pill pill-none', title: 'No due date set' }, '\u2014');
    const label = st === 'overdue' ? Math.abs(D.daysUntil(story.due)) + 'd late'
      : st === 'today' ? 'Due today'
      : D.fmtDateShort(story.due);
    return h('span', { class: 'pill pill-' + (st || 'none'), title: st === 'overdue' ? 'Past due (' + D.fmtDate(story.due) + ')' : 'Due ' + D.fmtDate(story.due) },
      icon('clock', 11), label
    );
  }

  function writerChip(state, story, small) {
    const w = state.writers.find((x) => x.id === story.writerId);
    if (!w) return h('span', { class: 'chip chip-unassigned', title: 'No writer yet' }, icon('user', 11), 'Unassigned');
    return h('span', { class: 'chip chip-writer' + (w.active ? '' : ' chip-inactive'), title: w.name + (w.beat ? ' \u2014 ' + w.beat : '') + (w.active ? '' : ' (inactive)') },
      h('i', { class: 'writer-dot', style: { background: w.color }, 'aria-hidden': 'true' }),
      small ? D.initials(w.name) : w.name
    );
  }

  function wordBar(story) {
    const target = story.wordTarget || 0;
    const count = story.wordCount || 0;
    const pct = target ? Math.min(100, Math.round((count / target) * 100)) : 0;
    const state = count === 0 ? 'empty' : pct >= 100 ? 'done' : 'partial';
    return h('span', { class: 'wordbar wordbar-' + state, title: count.toLocaleString() + ' of ' + target.toLocaleString() + ' words' },
      h('span', { class: 'wordbar-fill', style: { width: pct + '%' } })
    );
  }

  function sectionTag(section) {
    return h('span', { class: 'sectiontag' }, section);
  }

  function emptyState(opts) {
    // {icon, title, body, actions:[{label, kind, onClick}]}
    return h('div', { class: 'empty' },
      h('div', { class: 'empty-icon' }, icon(opts.icon || 'paper', 26)),
      h('h3', { class: 'empty-title' }, opts.title),
      opts.body ? h('p', { class: 'empty-body' }, opts.body) : null,
      opts.actions && opts.actions.length
        ? h('div', { class: 'empty-actions' }, opts.actions.map((a) =>
            h('button', { class: 'btn ' + (a.kind ? 'btn-' + a.kind : ''), type: 'button', onclick: a.onClick }, a.label)))
        : null
    );
  }

  function selectEl(attrs, options, value) {
    const sel = h('select', attrs);
    options.forEach((o) => {
      const opt = h('option', { value: o.value }, o.label);
      if (String(o.value) === String(value)) opt.selected = true;
      sel.appendChild(opt);
    });
    return sel;
  }

  /* focus helper: remember and restore */
  function withFocusPreserve(container, fn) {
    const active = document.activeElement;
    const key = active && active.dataset ? active.dataset.focuskey : null;
    fn();
    if (key) {
      const next = container.querySelector('[data-focuskey="' + key.replace(/"/g, '') + '"]');
      if (next) {
        if (next.setSelectionRange && active.selectionStart != null) {
          try { next.setSelectionRange(active.selectionStart, active.selectionEnd); } catch (e) { /* not a text input */ }
        }
        next.focus();
      }
    }
  }

  G.ui = {
    h, append, clear, frag, icon,
    toast, openModal, closeTopModal, topModal, confirmModal, promptModal,
    popover, closePopovers,
    statusChip, duePill, writerChip, wordBar, sectionTag, emptyState, selectEl,
    withFocusPreserve,
  };
})();
