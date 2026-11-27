/* Fieldwork — shared utilities (no dependencies).
   Everything attaches to the global `App` namespace. Loaded as a classic script
   so the app works from file:// with no build step. */
(function (App) {
  'use strict';

  var util = (App.util = App.util || {});

  /* ---- identifiers ---- */
  util.id = function () {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (e) { /* fall through */ }
    var s = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    return s.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  /* ---- time ---- */
  util.nowIso = function () { return new Date().toISOString(); };

  util.formatDate = function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  };

  util.formatDateTime = function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try {
      return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return d.toISOString();
    }
  };

  util.relativeTime = function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var diff = Date.now() - d.getTime();
    var sec = Math.round(diff / 1000);
    if (sec < 45) return 'just now';
    var min = Math.round(sec / 60);
    if (min < 60) return min + ' min ago';
    var hr = Math.round(min / 60);
    if (hr < 24) return hr + ' hr ago';
    var day = Math.round(hr / 24);
    if (day < 30) return day + ' day' + (day === 1 ? '' : 's') + ' ago';
    return util.formatDate(iso);
  };

  /* ---- strings ---- */
  util.norm = function (s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  };
  util.lower = function (s) { return util.norm(s).toLowerCase(); };

  util.escapeHtml = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* Normalise a tag: trim, collapse whitespace, lowercase, strip leading '#'. */
  util.normalizeTag = function (t) {
    var s = util.norm(t).toLowerCase();
    if (s.charAt(0) === '#') s = s.slice(1);
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  };

  util.uniqueStrings = function (arr) {
    var seen = {}; var out = [];
    (arr || []).forEach(function (x) {
      if (x == null) return;
      var k = String(x);
      if (!seen[k]) { seen[k] = 1; out.push(x); }
    });
    return out;
  };

  /* ---- URLs ---- */
  util.isValidUrl = function (u) {
    if (u == null || u === '') return true; // emptiness handled separately
    try {
      var url = new URL(String(u), window.location.href);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) { return false; }
  };
  /* Return a safe href only for http(s) links, else null. */
  util.safeHref = function (u) {
    if (!u) return null;
    return util.isValidUrl(u) ? String(u) : null;
  };

  /* ---- collections ---- */
  util.sortBy = function (arr, fn, dir) {
    var copy = (arr || []).slice();
    copy.sort(function (a, b) {
      var av = fn(a); var bv = fn(b);
      if (av < bv) return dir === 'desc' ? 1 : -1;
      if (av > bv) return dir === 'desc' ? -1 : 1;
      return 0;
    });
    return copy;
  };

  util.deepClone = function (obj) {
    if (obj == null) return obj;
    return JSON.parse(JSON.stringify(obj));
  };

  /* ---- JSON ---- */
  util.safeJsonParse = function (text) {
    try { return { ok: true, value: JSON.parse(text) }; }
    catch (e) { return { ok: false, error: e }; }
  };

  /* ---- misc ---- */
  util.debounce = function (fn, wait) {
    var t = null;
    return function () {
      var args = arguments; var ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  };

  util.clamp = function (n, lo, hi) { return Math.max(lo, Math.min(hi, n)); };

  util.prefersReducedMotion = function () {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  };

  /* ---- download / clipboard ---- */
  util.download = function (filename, text, mime) {
    try {
      var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 1000);
      return true;
    } catch (e) { return false; }
  };

  util.copyToClipboard = function (text) {
    // Returns a Promise<boolean>.
    return new Promise(function (resolve) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { resolve(true); }, function () { fallback(); });
        } else { fallback(); }
      } catch (e) { fallback(); }
      function fallback() {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'absolute';
          ta.style.left = '-9999px';
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          resolve(!!ok);
        } catch (e2) { resolve(false); }
      }
    });
  };

  /* ---- storage event guard ---- */
  util.isTypingTarget = function (target) {
    if (!target) return false;
    var tag = (target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (target.isContentEditable) return true;
    return false;
  };
})(window.App = window.App || {});
