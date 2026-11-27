/* Fieldwork — safe persistence layer.

   Wraps window.localStorage. If storage is unavailable (disabled, SecurityError,
   quota, privacy mode) the app keeps working with an in-memory fallback and
   reports `available=false`. Nothing here ever throws to the caller. */
(function (App) {
  'use strict';

  var storage = (App.storage = App.storage || {});

  function createSafeStorage() {
    var backend = null;      // window.localStorage when usable
    var memory = Object.create(null); // in-memory fallback
    var available = false;

    try {
      var testKey = '__fieldwork_probe__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      backend = window.localStorage;
      available = true;
    } catch (e) {
      backend = null;
      available = false;
    }

    return {
      get available() { return available; },

      getItem: function (key) {
        try {
          if (backend) return backend.getItem(key);
        } catch (e) { /* fall through to memory */ }
        return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
      },

      setItem: function (key, value) {
        var v = String(value);
        // Always mirror in memory so we degrade gracefully on later failures.
        memory[key] = v;
        if (backend) {
          try {
            backend.setItem(key, v);
            return true;
          } catch (e) {
            // Quota exceeded / SecurityError: keep working from memory.
            available = false;
            return false;
          }
        }
        return false;
      },

      removeItem: function (key) {
        delete memory[key];
        if (backend) {
          try { backend.removeItem(key); } catch (e) { /* ignore */ }
        }
      },

      // Read the raw string for a key from memory backup if backend read fails.
      raw: function (key) {
        try { if (backend) { var v = backend.getItem(key); if (v != null) return v; } } catch (e) {}
        return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
      }
    };
  }

  var instance = createSafeStorage();

  storage.backend = instance;
  storage.isAvailable = function () { return instance.available; };
  storage.getItem = function (k) { return instance.getItem(k); };
  storage.setItem = function (k, v) { return instance.setItem(k, v); };
  storage.removeItem = function (k) { return instance.removeItem(k); };
  storage.raw = function (k) { return instance.raw(k); };

  // Convenience: read+parse JSON safely.
  storage.getJSON = function (key, fallback) {
    var raw = instance.getItem(key);
    if (raw == null) return fallback;
    var parsed = App.util.safeJsonParse(raw);
    return parsed.ok ? parsed.value : fallback;
  };
})(window.App = window.App || {});
