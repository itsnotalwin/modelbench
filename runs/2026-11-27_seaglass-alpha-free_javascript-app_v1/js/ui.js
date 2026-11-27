/* Fieldwork — DOM helpers, toasts, modal dialogs, accessibility utilities. */
(function (App) {
  'use strict';

  var ui = (App.ui = App.ui || {});

  /* ---------- element construction ---------- */
  ui.el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      var val = attrs[key];
      if (key === 'class' || key === 'className') { node.className = val || ''; return; }
      if (key === 'text') { node.textContent = val == null ? '' : String(val); return; }
      if (key === 'dataset' && val) { Object.keys(val).forEach(function (d) { node.setAttribute('data-' + d, val[d]); }); return; }
      if (key === 'on' && val) { Object.keys(val).forEach(function (ev) { node.addEventListener(ev, val[ev]); }); return; }
      if (key === 'value') { node.value = val == null ? '' : String(val); return; }
      if (key === 'checked' || key === 'disabled' || key === 'selected' || key === 'readonly' || key === 'required' || key === 'hidden') {
        if (val) { node.setAttribute(key, ''); } else { node.removeAttribute(key); }
        node[key] = !!val; return;
      }
      if (val == null || val === false) return;
      node.setAttribute(key, String(val));
    });
    ui.append(node, children);
    return node;
  };

  ui.append = function (node, children) {
    if (children == null) return node;
    if (!Array.isArray(children)) children = [children];
    children.forEach(function (c) {
      if (c == null || c === false) return;
      if (typeof c === 'string' || typeof c === 'number') { node.appendChild(document.createTextNode(String(c))); }
      else if (c instanceof Node) { node.appendChild(c); }
    });
    return node;
  };

  ui.clear = function (node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; };
  ui.text = function (node, value) { if (node) node.textContent = value == null ? '' : String(value); };

  /* ---------- screen reader / live region ---------- */
  ui.announce = function (message) {
    var region = document.getElementById('sr-announce');
    if (!region) return;
    region.textContent = '';
    // force reflow so repeated identical messages are announced
    void region.offsetWidth;
    region.textContent = String(message);
  };

  /* ---------- toasts ---------- */
  var toastTimers = {};
  ui.toast = function (message, type) {
    var region = document.getElementById('toast-region');
    if (!region) { return; }
    type = type || 'info';
    var id = 'toast-' + (App.util.id ? App.util.id() : Date.now());
    var dismiss = function () {
      var node = document.getElementById(id);
      if (node && node.parentNode) node.parentNode.removeChild(node);
      if (toastTimers[id]) { clearTimeout(toastTimers[id]); delete toastTimers[id]; }
    };
    var toast = ui.el('div', {
      id: id,
      class: 'toast toast--' + type,
      role: type === 'error' ? 'alert' : 'status'
    }, [
      ui.el('span', { class: 'toast__msg', text: String(message) }),
      ui.el('button', { class: 'toast__close', type: 'button', 'aria-label': 'Dismiss notification', text: '\u00D7', on: { click: dismiss } })
    ]);
    region.appendChild(toast);
    ui.announce(message);
    var timeout = type === 'error' ? 7000 : 4000;
    toastTimers[id] = setTimeout(dismiss, timeout);
    return dismiss;
  };

  /* ---------- modal ---------- */
  var FOCUSABLE = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
    'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function focusables(container) {
    return Array.prototype.slice.call(container.querySelectorAll(FOCUSABLE))
      .filter(function (el) { return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement; });
  }

  ui.openModal = function (content, opts) {
    opts = opts || {};
    var lastFocused = document.activeElement;
    var titleId = opts.titleId || ('modal-title-' + Date.now());

    var closeBtn = ui.el('button', { class: 'modal__close', type: 'button', 'aria-label': 'Close dialog', text: '\u00D7' });
    var header = ui.el('div', { class: 'modal__header' }, [
      opts.title ? ui.el('h2', { id: titleId, class: 'modal__title', text: opts.title }) : null,
      closeBtn
    ]);
    var body = ui.el('div', { class: 'modal__body' }, [content]);
    var dialog = ui.el('div', {
      class: 'modal', role: 'dialog', 'aria-modal': 'true', tabindex: '-1',
      'aria-labelledby': opts.title ? titleId : null,
      'aria-label': opts.title ? null : (opts.ariaLabel || 'Dialog')
    }, [header, body]);

    var overlay = ui.el('div', { class: 'modal-overlay' }, [dialog]);

    var closed = false;
    function close() {
      if (closed) return; closed = true;
      document.removeEventListener('keydown', onKey, true);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.body.classList.remove('modal-open');
      if (lastFocused && typeof lastFocused.focus === 'function') {
        try { lastFocused.focus(); } catch (e) {}
      }
      if (typeof opts.onClose === 'function') { try { opts.onClose(); } catch (e) {} }
    }

    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') {
        var items = focusables(dialog);
        if (items.length === 0) { e.preventDefault(); dialog.focus(); return; }
        var first = items[0]; var last = items[items.length - 1];
        var active = document.activeElement;
        if (e.shiftKey) {
          if (active === first || active === dialog || !dialog.contains(active)) { e.preventDefault(); last.focus(); }
        } else {
          if (active === last) { e.preventDefault(); first.focus(); }
        }
      }
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay && opts.closeOnBackdrop !== false) close(); });
    document.addEventListener('keydown', onKey, true);

    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');

    // initial focus
    var toFocus = opts.initialFocus || focusables(dialog)[0] || dialog;
    try { toFocus.focus(); } catch (e) { dialog.focus(); }

    return { close: close, dialog: dialog, overlay: overlay };
  };

  /* Confirmation dialog -> Promise<boolean>. */
  ui.confirmDialog = function (opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var settled = false;
      function done(val) { if (settled) return; settled = true; resolve(val); }
      var confirmBtn = ui.el('button', { type: 'button', class: 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary'), text: opts.confirmLabel || 'Confirm' });
      var cancelBtn = ui.el('button', { type: 'button', class: 'btn btn-ghost', text: opts.cancelLabel || 'Cancel' });
      var content = ui.el('div', {}, [
        ui.el('p', { class: 'modal__message', text: opts.message || 'Are you sure?' }),
        opts.detail ? ui.el('p', { class: 'modal__detail', text: opts.detail }) : null,
        ui.el('div', { class: 'modal__actions' }, [cancelBtn, confirmBtn])
      ]);
      var modal = ui.openModal(content, {
        title: opts.title || 'Confirm',
        ariaLabel: opts.title || 'Confirm',
        initialFocus: cancelBtn, // safe default focus
        onClose: function () { done(false); }
      });
      cancelBtn.addEventListener('click', function () { done(false); modal.close(); });
      confirmBtn.addEventListener('click', function () { done(true); modal.close(); });
    });
  };

  /* ---------- form helpers ---------- */
  ui.fieldErrorId = function (name) { return 'err-' + name; };

  ui.setFieldError = function (form, name, message) {
    var input = form.querySelector('[name="' + name + '"]');
    var err = form.querySelector('#' + ui.fieldErrorId(name));
    if (input) {
      if (message) { input.setAttribute('aria-invalid', 'true'); } else { input.removeAttribute('aria-invalid'); }
    }
    if (err) { err.textContent = message || ''; err.hidden = !message; }
  };

  ui.clearFieldErrors = function (form) {
    var errs = Array.prototype.slice.call(form.querySelectorAll('.field__error'));
    errs.forEach(function (e) { e.textContent = ''; e.hidden = true; });
    var invalid = Array.prototype.slice.call(form.querySelectorAll('[aria-invalid="true"]'));
    invalid.forEach(function (e) { e.removeAttribute('aria-invalid'); });
    var summary = form.querySelector('.form-error-summary');
    if (summary) { summary.textContent = ''; summary.hidden = true; }
  };

  ui.applyErrors = function (form, errors) {
    ui.clearFieldErrors(form);
    var first = null; var count = 0;
    Object.keys(errors || {}).forEach(function (name) {
      ui.setFieldError(form, name, errors[name]);
      count++;
      if (!first) {
        var input = form.querySelector('[name="' + name + '"]');
        if (input) first = input;
      }
    });
    var summary = form.querySelector('.form-error-summary');
    if (summary) {
      summary.textContent = count === 1 ? 'There is 1 problem to fix.' : ('There are ' + count + ' problems to fix.');
      summary.hidden = count === 0;
    }
    if (first && typeof first.focus === 'function') { try { first.focus(); } catch (e) {} }
    return count;
  };

  /* ---------- empty state ---------- */
  ui.renderEmpty = function (container, opts) {
    opts = opts || {};
    var kids = [
      ui.el(opts.headingTag || 'h2', { class: 'empty__title', text: opts.title || 'Nothing here yet' }),
      opts.message ? ui.el('p', { class: 'empty__message', text: opts.message }) : null
    ];
    if (opts.actionLabel && typeof opts.onAction === 'function') {
      kids.push(ui.el('div', { class: 'empty__action' }, [
        ui.el('button', { type: 'button', class: 'btn btn-primary', text: opts.actionLabel, on: { click: opts.onAction } })
      ]));
    }
    var node = ui.el('div', { class: 'empty', role: 'note' }, kids);
    if (container) { ui.clear(container); ui.append(container, node); }
    return node;
  };

  /* visually-hidden helper */
  ui.srOnly = function (text) { return ui.el('span', { class: 'visually-hidden', text: text }); };
})(window.App = window.App || {});
