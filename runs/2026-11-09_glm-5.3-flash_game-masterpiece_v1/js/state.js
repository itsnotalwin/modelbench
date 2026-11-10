/* ============================================================
   THE LONG LIGHT — state.js
   game state model, persistence (guarded), settings
   ============================================================ */
"use strict";
window.State = (function () {

  const SAVE_PREFIX = "longlight.save.";
  const SET_KEY = "longlight.settings";
  const SLOT_COUNT = 4; // 0 = autosave, 1..3 manual
  let memoryStore = {}; // fallback when storage is unavailable
  let storageOK = false;

  function detectStorage() {
    try {
      const t = "__ll_t__";
      window.localStorage.setItem(t, "1");
      window.localStorage.removeItem(t);
      storageOK = true;
    } catch (e) {
      storageOK = false;
    }
  }

  function rawGet(key) {
    if (storageOK) {
      try { return window.localStorage.getItem(key); } catch (e) { /* fall through */ }
    }
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  }
  function rawSet(key, val) {
    if (storageOK) {
      try { window.localStorage.setItem(key, val); return true; }
      catch (e) { memoryStore[key] = val; return false; }
    }
    memoryStore[key] = val;
    return false;
  }
  function rawDel(key) {
    if (storageOK) {
      try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }
    delete memoryStore[key];
  }

  /* ---------------- the state shape ---------------- */

  function fresh(name) {
    return {
      v: 1,
      name: sanitizeName(name),
      created: Date.now(),
      chapter: 0,          // 0 = prologue crossing, 1..5 chapters, 6 = ending done
      slot: 0,             // 0..3 (morning, forenoon, afternoon, evening)
      hours: 6,            // hours left in the day
      visited: [],         // location ids already entered today (free re-entry)
      weather: "clear",    // clear | mist | fog | rain | squall | storm
      tide: "low",         // low | high  (sea-cave access)
      oilStore: 3,         // barrels in the oil store
      lampOil: 70,         // % in the lamp reservoir
      items: [],           // item ids
      marks: 2,            // brass trade tokens
      repairs: { bell: 0, lens: 0, tower: 0, skiff: 0 }, // 0..2
      trust: { bo: 0, sel: 0, tam: 0 },   // -3 .. +5
      flags: {},           // story flags
      journal: [],         // journal entry ids, in order found
      observed: [],        // sea observations recorded at night
      nights: [],          // [{n, score, tone}] per completed night
      merrilee: "unknown", // unknown | grounded | safe | wrecked
      fleetWarned: false,
      gaveWatch: false,
      selStays: null,      // null | true | false
      ending: null,
      stamp: 0,
    };
  }

  function sanitizeName(n) {
    let s = String(n == null ? "" : n).replace(/\s+/g, " ").trim();
    if (!s) s = "Edda";
    if (s.length > 20) s = s.slice(0, 20);
    return s;
  }

  let S = null; // active state

  /* ---------------- persistence ---------------- */

  function serialize() {
    return JSON.stringify(S);
  }

  function saveSlot(slot) {
    if (!S) return false;
    S.stamp = Date.now();
    const payload = { v: 1, when: S.stamp, state: S };
    const ok = rawSet(SAVE_PREFIX + slot, JSON.stringify(payload));
    return ok;
  }

  function loadSlot(slot) {
    const txt = rawGet(SAVE_PREFIX + slot);
    if (!txt) return null;
    try {
      const data = JSON.parse(txt);
      if (!data || !data.state || data.state.v !== 1) return null;
      return migrate(data.state);
    } catch (e) {
      return null;
    }
  }

  function peekSlot(slot) {
    const txt = rawGet(SAVE_PREFIX + slot);
    if (!txt) return null;
    try {
      const data = JSON.parse(txt);
      return data && data.state ? {
        name: data.state.name, chapter: data.state.chapter, when: data.when || data.state.stamp || 0,
      } : null;
    } catch (e) { return null; }
  }

  function deleteSlot(slot) { rawDel(SAVE_PREFIX + slot); }

  function migrate(st) {
    // future-proofing hook: fill any missing fields
    const base = fresh(st.name);
    for (const k of Object.keys(base)) {
      if (st[k] === undefined) st[k] = base[k];
    }
    st.repairs = Object.assign({ bell: 0, lens: 0, tower: 0, skiff: 0 }, st.repairs);
    st.trust = Object.assign({ bo: 0, sel: 0, tam: 0 }, st.trust);
    return st;
  }

  /* ---------------- settings ---------------- */

  const defaults = { music: 0.55, amb: 0.7, sfx: 0.8, motion: "full", text: "typed" };
  let settings = Object.assign({}, defaults);

  function loadSettings() {
    const txt = rawGet(SET_KEY);
    if (txt) {
      try {
        const d = JSON.parse(txt);
        settings = Object.assign({}, defaults, d);
      } catch (e) { settings = Object.assign({}, defaults); }
    }
    return settings;
  }
  function saveSettings() {
    rawSet(SET_KEY, JSON.stringify(settings));
  }
  function setSetting(k, v) { settings[k] = v; saveSettings(); }

  /* ---------------- helpers on state ---------------- */

  function hasItem(id) { return S && S.items.indexOf(id) !== -1; }
  function giveItem(id) {
    if (S && !hasItem(id)) S.items.push(id);
  }
  function takeItem(id) {
    if (!S) return;
    const i = S.items.indexOf(id);
    if (i !== -1) S.items.splice(i, 1);
  }
  function flag(id, val) { if (S) S.flags[id] = val === undefined ? true : val; }
  function getFlag(id) { return S ? S.flags[id] : undefined; }
  function trust(who, delta) {
    if (!S) return;
    S.trust[who] = Math.max(-3, Math.min(5, (S.trust[who] || 0) + delta));
  }
  function addJournal(id) {
    if (S && S.journal.indexOf(id) === -1) S.journal.push(id);
  }
  function hasJournal(id) { return S && S.journal.indexOf(id) !== -1; }

  function addObserved(id) {
    if (S && S.observed.indexOf(id) === -1) S.observed.push(id);
  }

  function nightRecord(n, score, tone) {
    if (!S) return;
    const i = S.nights.findIndex(x => x.n === n);
    if (i === -1) S.nights.push({ n: n, score: score, tone: tone });
    else S.nights[i] = { n: n, score: score, tone: tone };
  }
  function nightScore(n) {
    const r = S && S.nights.find(x => x.n === n);
    return r ? r.score : 0;
  }

  function chapterJournalMax() {
    // highest chapter whose night was completed
    return S ? S.nights.length : 0;
  }

  detectStorage();

  return {
    fresh, sanitizeName,
    get: () => S,
    set: (st) => { S = st; },
    isLoaded: () => !!S,
    serialize,
    saveSlot, loadSlot, peekSlot, deleteSlot,
    SLOT_COUNT,
    settings: () => settings,
    loadSettings, setSetting,
    hasItem, giveItem, takeItem, flag, getFlag, trust, addJournal, hasJournal,
    addObserved, nightRecord, nightScore, chapterJournalMax,
    storageOK: () => storageOK,
  };
})();
