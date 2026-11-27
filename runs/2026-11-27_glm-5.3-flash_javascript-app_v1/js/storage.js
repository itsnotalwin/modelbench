/* Fiscus — safe storage layer.
   Wraps localStorage behind probe-detection: when the browser blocks storage
   (private mode, permissions, quota) the app falls back to an in-memory store
   for the current session instead of crashing. */
window.F = window.F || {};

F.storage = (function () {
  'use strict';

  const KEY = 'fiscus.state.v1';
  let mode = 'memory';       // 'local' | 'memory'
  let memoryValue = null;    // session-only fallback

  function detect() {
    try {
      const probe = '__fiscus_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      mode = 'local';
    } catch (e) {
      mode = 'memory';
    }
  }

  function isPersistent() { return mode === 'local'; }

  function loadRaw() {
    if (!isPersistent()) return { state: memoryValue, corrupted: false };
    let raw = null;
    try {
      raw = window.localStorage.getItem(KEY);
    } catch (e) {
      return { state: null, corrupted: false };
    }
    if (!raw) return { state: null, corrupted: false };
    try {
      return { state: JSON.parse(raw), corrupted: false };
    } catch (e) {
      return { state: null, corrupted: true };
    }
  }

  function save(state) {
    if (!isPersistent()) {
      memoryValue = state;
      return { ok: true, persistent: false };
    }
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
      return { ok: true, persistent: true };
    } catch (e) {
      // Keep the session usable even if the write fails (e.g. quota exceeded).
      memoryValue = state;
      return { ok: false, error: 'storage-write-failed', persistent: false };
    }
  }

  function clear() {
    memoryValue = null;
    if (isPersistent()) {
      try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    }
  }

  return { detect, isPersistent, loadRaw, save, clear, KEY };
})();
