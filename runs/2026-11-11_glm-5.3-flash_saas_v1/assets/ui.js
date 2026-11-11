/* ============================================================
   ClearDesk — shared UI utilities (formatters, modals, toasts,
   chips, CSV/JSON download, print sheets). No business logic here.
   ============================================================ */
window.CDUI = (function () {
  'use strict';

  /* ---------------- escaping & formatting ---------------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function money(v, cur) {
    var n = Number(v);
    if (!isFinite(n)) n = 0;
    var s = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    return (cur || '') + (cur ? ' ' : '') + s;
  }

  function numFmt(v, dp) {
    var n = Number(v);
    if (!isFinite(n)) n = 0;
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: dp == null ? 2 : dp }).format(n);
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function fmtDateTime(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
           d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function timeAgo(ts) {
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    var s = Math.max(0, (Date.now() - d.getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 86400 * 14) return Math.floor(s / 86400) + 'd ago';
    return fmtDate(ts);
  }

  /* ---------------- chips ---------------- */

  function statusChip(status) {
    var cls = { new: 'dark-outline', awaiting_docs: 'dashed', ready: 'dark-outline', lodged: '',
                query: 'chip-warn', assessed: 'dark-outline', paid: '', released: '', delivered: '',
                closed: 'fill', cancelled: 'strike' }[status] || '';
    var label = { new: 'New', awaiting_docs: 'Awaiting docs', ready: 'Ready to lodge', lodged: 'Lodged',
                  query: 'Customs query', assessed: 'Assessed', paid: 'Duty paid', released: 'Released',
                  delivered: 'Delivered', closed: 'Closed', cancelled: 'Cancelled' }[status] || status;
    return '<span class="chip ' + cls + '"><span class="dot"></span>' + esc(label) + '</span>';
  }

  function modeChip(mode) {
    var lbl = { sea: 'Sea', air: 'Air', road: 'Road' }[mode] || mode;
    return '<span class="chip-mode">' + esc(lbl) + '</span>';
  }

  function permitChip(client, todayIso, C) {
    var ps = C.permitStatus(client, todayIso);
    if (ps.state === 'none') return '<span class="tiny dim">No permit</span>';
    if (ps.state === 'expired') return '<span class="chip chip-warn"><span class="dot"></span>Expired ' + Math.abs(ps.days) + 'd ago</span>';
    if (ps.state === 'expiring') return '<span class="chip dark-outline"><span class="dot"></span>Expires in ' + ps.days + 'd</span>';
    return '<span class="tiny dim">Valid to ' + esc(fmtDate(client.permitExpiry)) + '</span>';
  }

  /* ---------------- toasts ---------------- */

  var _toastWrap = null;
  function ensureToasts() {
    if (!_toastWrap || !_toastWrap.isConnected) {
      _toastWrap = document.createElement('div');
      _toastWrap.className = 'toast-wrap';
      _toastWrap.setAttribute('role', 'status');
      _toastWrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(_toastWrap);
    }
    return _toastWrap;
  }
  function toast(msg, kind) {
    var wrap = ensureToasts();
    var t = document.createElement('div');
    t.className = 'toast' + (kind === 'err' ? ' err' : '');
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () {
      t.classList.add('hide');
      setTimeout(function () { t.remove(); }, 280);
    }, kind === 'err' ? 4200 : 2600);
  }

  /* ---------------- modal system ---------------- */

  var _lastFocus = null;
  var _openModals = [];

  function topModal() { return _openModals[_openModals.length - 1] || null; }

  function modal(opts) {
    opts = opts || {};
    var prevFocus = document.activeElement;
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    var box = document.createElement('div');
    box.className = 'modal' + (opts.wide ? ' wide' : '');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', opts.title || 'Dialog');
    box.innerHTML =
      '<div class="modal-head"><h3>' + esc(opts.title || '') + '</h3>' +
      '<button type="button" class="icon-btn" data-close aria-label="Close dialog">✕</button></div>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      (opts.footer ? '<div class="modal-foot">' + opts.footer + '</div>' : '');
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    requestAnimationFrame(function () { backdrop.classList.add('open'); });

    var inst = { box: box, backdrop: backdrop, closed: false, _onClose: null };
    function close(result) {
      if (inst.closed) return;
      inst.closed = true;
      _openModals = _openModals.filter(function (m) { return m !== inst; });
      backdrop.classList.remove('open');
      setTimeout(function () { backdrop.remove(); }, 140);
      if (prevFocus && prevFocus.isConnected) prevFocus.focus();
      if (inst._onClose) inst._onClose(result);
    }
    inst.close = close;

    function focusables() {
      return Array.prototype.filter.call(
        box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        function (el) { return !el.disabled && el.offsetParent !== null; });
    }

    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(null); }
      else if (e.key === 'Tab') {
        var f = focusables();
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    box.addEventListener('keydown', onKey);
    backdrop.addEventListener('mousedown', function (e) {
      if (e.target === backdrop && opts.dismissable !== false) close(null);
    });
    box.querySelector('[data-close]').addEventListener('click', function () { close(null); });

    _openModals.push(inst);
    var toFocus = box.querySelector('[data-autofocus]') || focusables()[0];
    if (toFocus) setTimeout(function () { toFocus.focus(); }, 30);
    if (opts.onMount) opts.onMount(box, close);
    return inst;
  }

  function confirmDialog(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var m = modal({
        title: opts.title || 'Confirm',
        body: '<p style="font-size:13px">' + (opts.body || esc(opts.message || 'Are you sure?')) + '</p>',
        footer:
          '<button class="btn ghost" data-act="no">Cancel</button>' +
          '<button class="btn ' + (opts.danger ? 'danger' : '') + '" data-act="yes" data-autofocus>' + esc(opts.confirmLabel || 'Confirm') + '</button>',
        onMount: function (box, close) {
          box.querySelector('[data-act="no"]').addEventListener('click', function () { close(false); });
          box.querySelector('[data-act="yes"]').addEventListener('click', function () { close(true); });
        }
      });
      m._onClose = function (result) { resolve(result === true); };
    });
  }

  function alertDialog(title, bodyHtml, confirmLabel) {
    return new Promise(function (resolve) {
      var m = modal({
        title: title,
        body: bodyHtml,
        footer: '<button class="btn" data-autofocus>' + esc(confirmLabel || 'OK') + '</button>',
        onMount: function (box, close) {
          box.querySelector('.modal-foot .btn').addEventListener('click', function () { close(true); });
        }
      });
      m._onClose = function () { resolve(true); };
    });
  }

  function promptDialog(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var result = null;
      modal({
        title: opts.title || 'Input',
        body:
          '<div class="field"><label>' + esc(opts.label || 'Value') + '</label>' +
          '<input class="input" data-autofocus id="cd-prompt-input" value="' + esc(opts.value || '') + '" placeholder="' + esc(opts.placeholder || '') + '">' +
          (opts.hint ? '<div class="hint">' + esc(opts.hint) + '</div>' : '') +
          '<div class="err-msg" data-err hidden></div></div>',
        footer:
          '<button class="btn ghost" data-act="no">Cancel</button>' +
          '<button class="btn" data-act="ok">' + esc(opts.confirmLabel || 'Save') + '</button>',
        onMount: function (box, close) {
          var input = box.querySelector('#cd-prompt-input');
          function submit() {
            var v = input.value.trim();
            if (opts.required && !v) {
              var err = box.querySelector('[data-err]');
              err.hidden = false; err.textContent = opts.requiredMsg || 'This field is required.';
              input.setAttribute('aria-invalid', 'true');
              return;
            }
            result = v;
            close(v);
          }
          box.querySelector('[data-act="ok"]').addEventListener('click', submit);
          input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
          box.querySelector('[data-act="no"]').addEventListener('click', function () { close(null); });
        }
      })._onClose = function (v) { resolve(result); };
    });
  }

  /* ---------------- downloads & print ---------------- */

  function download(filename, content, mime) {
    try {
      var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { a.remove(); URL.revokeObjectURL(a.href); }, 400);
      return true;
    } catch (e) {
      toast('Download failed: ' + e.message, 'err');
      return false;
    }
  }

  function printHtml(html) {
    var root = document.getElementById('print-root');
    if (!root) root = document.body;
    root.innerHTML = html;
    document.body.classList.add('printing');
    var cleanup = function () {
      document.body.classList.remove('printing');
      root.innerHTML = '';
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(function () {
      try { window.print(); } catch (e) { toast('Print failed: ' + e.message, 'err'); }
      setTimeout(cleanup, 800);
    }, 60);
  }

  /* ---------------- misc ---------------- */

  function sortIndicator(dir) {
    return '<span class="sort-ind">' + (dir === 'asc' ? '▲' : '▼') + '</span>';
  }

  function emptyState(title, sub, actionHtml) {
    return '<div class="empty"><div class="glyph" aria-hidden="true"></div><h3>' + esc(title) + '</h3><p>' + esc(sub) + '</p>' + (actionHtml || '') + '</div>';
  }

  function barRow(label, value, max, cls, valText) {
    var pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    return '<div class="bar-row"><div class="bar-label" title="' + esc(label) + '">' + esc(label) + '</div>' +
      '<div class="bar-track"><div class="bar-fill ' + (cls || '') + '" style="width:' + pct.toFixed(1) + '%"></div></div>' +
      '<div class="bar-val">' + esc(valText != null ? valText : numFmt(value)) + '</div></div>';
  }

  return {
    esc: esc, money: money, numFmt: numFmt, fmtDate: fmtDate, fmtDateTime: fmtDateTime, timeAgo: timeAgo,
    statusChip: statusChip, modeChip: modeChip, permitChip: permitChip,
    toast: toast, modal: modal, confirmDialog: confirmDialog, alertDialog: alertDialog, promptDialog: promptDialog,
    download: download, printHtml: printHtml, sortIndicator: sortIndicator, emptyState: emptyState, barRow: barRow
  };
})();
