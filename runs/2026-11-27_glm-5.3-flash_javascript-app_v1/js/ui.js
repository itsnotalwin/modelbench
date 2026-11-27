/* Fiscus — UI primitives: inline icons, toasts, accessible modals with focus
   trapping, and promise-based confirm dialogs. Everything here is framework-free
   and wired for keyboard use (Esc closes, Tab cycles, focus is restored). */
window.F = window.F || {};

F.ui = (function () {
  'use strict';

  /* ---------- icons (inline SVG, stroke-based) ---------- */

  const ICONS = {
    home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
    list: '<circle cx="3.8" cy="6" r="1.1" fill="currentColor" stroke="none"/><circle cx="3.8" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="3.8" cy="18" r="1.1" fill="currentColor" stroke="none"/><path d="M8 6h12M8 12h12M8 18h12"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
    chart: '<path d="M4 20h16"/><path d="M7 16v-5"/><path d="M12 16V7"/><path d="M17 16v-8"/>',
    sliders: '<path d="M4 7h9M17.5 7H20"/><circle cx="15" cy="7" r="2.2"/><path d="M4 12h2.5M11 12h9"/><circle cx="8.5" cy="12" r="2.2"/><path d="M4 17h8.5M17 17h3"/><circle cx="14.5" cy="17" r="2.2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    chevL: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    chevR: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    edit: '<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/><path d="m14.5 6.5 3 3"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4.5h6V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10 11v5.5M14 11v5.5"/>',
    download: '<path d="M12 4v10.5"/><path d="m7.5 11 4.5 4.5L16.5 11"/><path d="M4.5 19.5h15"/>',
    upload: '<path d="M12 14.5V4"/><path d="M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 19.5h15"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    alert: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v5"/><path d="M12 16.2h.01"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    wallet: '<rect x="3" y="7" width="18" height="12" rx="2.5"/><path d="M3 7V6a2 2 0 0 1 2-2h11"/><circle cx="16.5" cy="13" r="1.3" fill="currentColor" stroke="none"/>'
  };

  function icon(name, cls) {
    const body = ICONS[name];
    if (!body) return '';
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      body + '</svg>';
  }

  /* ---------- toasts ---------- */

  function toastRegion() { return document.getElementById('toast-region'); }

  function toast(message, opts) {
    const o = opts || {};
    const region = toastRegion();
    if (!region) return;
    const el = document.createElement('div');
    el.className = 'toast toast-' + (o.type || 'info');
    const iconName = o.type === 'success' ? 'check' : o.type === 'error' ? 'alert' : 'info';
    el.innerHTML = icon(iconName, 'toast-icon') + '<div class="toast-msg"></div>';
    el.querySelector('.toast-msg').textContent = message;

    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      el.classList.add('toast-out');
      setTimeout(() => el.remove(), 220);
    };

    if (o.action && typeof o.action.label === 'string' && typeof o.action.fn === 'function') {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toast-action';
      b.textContent = o.action.label;
      b.addEventListener('click', () => { remove(); o.action.fn(); });
      el.appendChild(b);
    }
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'toast-close';
    x.setAttribute('aria-label', 'Dismiss notification');
    x.innerHTML = icon('x');
    x.addEventListener('click', remove);
    el.appendChild(x);

    region.appendChild(el);
    while (region.children.length > 4) region.firstChild.remove();
    setTimeout(remove, o.timeout || (o.action ? 7000 : 4200));
  }

  /* ---------- modals ---------- */

  const modalStack = [];

  function modalOpen() { return modalStack.length > 0; }

  function getFocusable(el) {
    return Array.from(el.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
      'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(n => n.offsetParent !== null || n === document.activeElement);
  }

  function openModal(opts) {
    const root = document.getElementById('modal-root');
    if (!root) return { close() {}, body: null };

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const dialog = document.createElement('div');
    dialog.className = 'modal' + (opts.wide ? ' modal-wide' : '');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const headingId = 'modal-title-' + Math.random().toString(36).slice(2, 8);
    dialog.setAttribute('aria-labelledby', headingId);

    const header = document.createElement('div');
    header.className = 'modal-head';
    const h = document.createElement('h2');
    h.id = headingId;
    h.className = 'modal-title';
    h.textContent = opts.title || '';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'icon-btn modal-close';
    closeBtn.setAttribute('aria-label', 'Close dialog');
    closeBtn.innerHTML = icon('x');
    header.append(h, closeBtn);

    const body = document.createElement('div');
    body.className = 'modal-body';
    dialog.append(header, body);
    overlay.appendChild(dialog);
    root.appendChild(overlay);

    const previouslyFocused = document.activeElement;
    const entry = { overlay: overlay, dialog: dialog };

    function close() {
      const i = modalStack.indexOf(entry);
      if (i !== -1) modalStack.splice(i, 1);
      overlay.remove();
      document.body.classList.toggle('modal-open', modalStack.length > 0);
      if (typeof opts.onClose === 'function') opts.onClose();
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    }
    entry.close = close;

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
    dialog.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const focusables = getFocusable(dialog);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    document.body.classList.add('modal-open');
    modalStack.push(entry);

    if (typeof opts.build === 'function') opts.build(body, close);

    const target = dialog.querySelector('[data-autofocus]') || getFocusable(dialog)[0] || closeBtn;
    if (target && typeof target.focus === 'function') target.focus();

    return { close: close, body: body, dialog: dialog };
  }

  function closeAllModals() {
    while (modalStack.length) modalStack[modalStack.length - 1].close();
  }

  // Top-most modal closes on Escape.
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalStack.length) {
      e.preventDefault();
      modalStack[modalStack.length - 1].close();
    }
  });

  /* ---------- confirm dialog (promise-based) ---------- */

  function confirmDialog(opts) {
    return new Promise(resolve => {
      let settled = false;
      const finish = val => { if (!settled) { settled = true; resolve(val); } };

      const m = openModal({
        title: opts.title || 'Are you sure?',
        onClose: () => finish(false),
        build(body, close) {
          const desc = document.createElement('p');
          desc.className = 'confirm-text';
          desc.textContent = opts.message || '';
          body.appendChild(desc);

          let input = null;
          let errEl = null;
          if (opts.requireText) {
            const wrap = document.createElement('div');
            wrap.className = 'field';
            const label = document.createElement('label');
            label.setAttribute('for', 'confirm-echo');
            label.textContent = 'Type "' + opts.requireText + '" to continue';
            input = document.createElement('input');
            input.id = 'confirm-echo';
            input.className = 'input';
            input.autocomplete = 'off';
            input.spellcheck = false;
            input.setAttribute('data-autofocus', '');
            errEl = document.createElement('p');
            errEl.className = 'error-text';
            errEl.hidden = true;
            wrap.append(label, input, errEl);
            body.appendChild(wrap);
          }

          const actions = document.createElement('div');
          actions.className = 'modal-actions';
          const cancel = document.createElement('button');
          cancel.type = 'button';
          cancel.className = 'btn btn-ghost';
          cancel.textContent = opts.cancelLabel || 'Cancel';
          const ok = document.createElement('button');
          ok.type = 'button';
          ok.className = 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary');
          ok.textContent = opts.confirmLabel || 'Confirm';
          if (!opts.danger && !opts.requireText) ok.setAttribute('data-autofocus', '');
          cancel.addEventListener('click', close);
          ok.addEventListener('click', () => {
            if (opts.requireText && input && input.value.trim() !== opts.requireText) {
              errEl.textContent = 'Type "' + opts.requireText + '" exactly to confirm.';
              errEl.hidden = false;
              input.setAttribute('aria-invalid', 'true');
              input.focus();
              return;
            }
            settled = true;
            resolve(true);
            close();
          });
          actions.append(cancel, ok);
          body.appendChild(actions);
        }
      });
      return m;
    });
  }

  return {
    icon, toast,
    openModal, closeAllModals, modalOpen, confirmDialog,
    getFocusable
  };
})();
