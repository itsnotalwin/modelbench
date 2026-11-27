/* Fieldwork — hash router.

   Hash-based routing keeps the app working from file:// and survives refreshes;
   the browser back/forward buttons and deep links work. Unknown routes render a
   not-found view. */
(function (App) {
  'use strict';

  var router = (App.router = App.router || {});
  var listeners = [];

  function decode(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }
  function encode(s) { return encodeURIComponent(String(s == null ? '' : s)); }

  // parse "#/project/abc/source/def?x=1"
  function parseHash() {
    var raw = window.location.hash || '';
    if (raw.charAt(0) === '#') raw = raw.slice(1);
    var query = {};
    var qIndex = raw.indexOf('?');
    if (qIndex !== -1) {
      var qs = raw.slice(qIndex + 1);
      raw = raw.slice(0, qIndex);
      qs.split('&').forEach(function (pair) {
        if (!pair) return;
        var eq = pair.indexOf('=');
        var k = eq === -1 ? pair : pair.slice(0, eq);
        var v = eq === -1 ? '' : pair.slice(eq + 1);
        query[decode(k)] = decode(v.replace(/\+/g, ' '));
      });
    }
    var parts = raw.split('/').filter(function (p) { return p !== ''; }).map(decode);
    return { parts: parts, query: query, raw: raw };
  }

  router.current = parseHash;

  router.build = function (parts, query) {
    var path = (parts || []).map(encode).join('/');
    var s = '#/' + path;
    if (query) {
      var qs = Object.keys(query).filter(function (k) { return query[k] != null && query[k] !== ''; })
        .map(function (k) { return encode(k) + '=' + encode(query[k]); }).join('&');
      if (qs) s += '?' + qs;
    }
    return s;
  };

  router.navigate = function (target) {
    if (typeof target === 'string') {
      // accept either a hash string or a built path
      if (target.charAt(0) === '#') { window.location.hash = target.slice(1); }
      else { window.location.hash = target; }
    } else if (target && Array.isArray(target.parts)) {
      window.location.hash = router.build(target.parts, target.query).slice(1);
    }
  };

  router.replace = function (target) {
    var url = window.location.href.replace(/#.*$/, '') + router.build(target.parts || [], target.query);
    try { window.history.replaceState(null, '', url); } catch (e) { router.navigate(router.build(target.parts || [], target.query)); }
    notify();
  };

  function notify() {
    var route = parseHash();
    listeners.slice().forEach(function (fn) { try { fn(route); } catch (e) { /* ignore */ } });
  }

  router.onChange = function (fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i !== -1) listeners.splice(i, 1); }; };

  router.start = function (fn) {
    if (fn) listeners.push(fn);
    window.addEventListener('hashchange', notify);
    notify();
  };

  router.home = '#/';
})(window.App = window.App || {});
