/* ============================================================
   THE LONG LIGHT — ui.js
   dialogue engine, panels, portraits, icons, the typed word
   ============================================================ */
"use strict";
window.UI = (function () {

  const $ = (id) => document.getElementById(id);
  const app = () => document.getElementById("app");

  /* ---------------- tiny dom helper ---------------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  /* ---------------- icons (stroke SVG, 24 box) ---------------- */
  const ICONS = {
    jetty: '<path d="M3 14h18M5 14v7M9 14v6M15 14v6M19 14v7M3 17h18"/><path d="M7 11c1.5-1 3.5-1 5 0s3.5 1 5 0"/>',
    skiff: '<path d="M3 14q9 7 18 0l-2-5H5z"/><path d="M12 9V3l5 6"/>',
    store: '<ellipse cx="12" cy="5" rx="7" ry="2"/><path d="M5 5v13c0 1.5 3 3 7 3s7-1.5 7-3V5"/><path d="M5 10h14M5 14h14"/>',
    tower: '<path d="M9 21l1.5-13h3L15 21z"/><path d="M8 8h8l-1-3h-6z"/><path d="M7 5h10"/><circle cx="12" cy="3" r="1.4" fill="currentColor"/>',
    bell: '<path d="M12 4a6 6 0 016 6v4l2 3H4l2-3v-4a6 6 0 016-6z"/><path d="M10 20a2 2 0 004 0"/>',
    house: '<path d="M4 12l8-7 8 7"/><path d="M6 11v9h12v-9"/><rect x="10" y="14" width="4" height="6"/>',
    cliff: '<path d="M3 21l6-13 3 5 2-4 4 12z"/><path d="M9 8l1-3 2 2"/>',
    oil: '<path d="M7 8h8v11a2 2 0 01-2 2H9a2 2 0 01-2-2z"/><path d="M15 10l4-4M9 8V5h4v3"/>',
    rope: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3.5"/><path d="M5 12h3M16 12h3"/>',
    brass: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M19.1 4.9l-2.2 2.2M7.1 16.9l-2.2 2.2"/>',
    pitch: '<path d="M6 10h12v6a5 5 0 01-5 5h-2a5 5 0 01-5-5z"/><path d="M9 10V7a3 3 0 016 0v3"/>',
    canvas: '<path d="M4 6q8-3 16 0v12q-8 3-16 0z"/><path d="M4 12h16M12 6v12"/>',
    chart: '<path d="M4 5a4 4 0 018 0v14a4 4 0 00-8 0z"/><path d="M12 5a4 4 0 018 0v14a4 4 0 01-8 0"/>',
    lantern: '<path d="M9 4h6M10 4v2h4V4"/><path d="M8 6h8l1 4v7l-1 4H8l-1-4v-7z"/><circle cx="12" cy="14" r="2.5" fill="currentColor"/>',
    watch: '<circle cx="12" cy="13" r="6"/><path d="M12 10v3l2 2M9 3h6l-1 4h-4z"/>',
    glass: '<path d="M3 15l8-8M11 7l6-3 4 4-3 6-8-8z"/><circle cx="4.5" cy="15.5" r="2"/>',
    bread: '<path d="M4 12a8 5 0 0116 0v6H4z"/><path d="M8 11v4M12 10v5M16 11v4"/>',
    letter: '<rect x="3" y="6" width="18" height="13" rx="1"/><path d="M3 8l9 6 9-6"/>',
    beam: '<path d="M4 8h16M4 12h16M4 16h16"/><path d="M8 4v16"/>',
    pipe: '<path d="M4 14h9a4 4 0 004-4V7h3v3a7 7 0 01-7 7H4z"/>',
  };
  function icon(id, size) {
    const s = size || 24;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[id] || ICONS.letter) + "</svg>";
  }

  /* ---------------- portraits (two-tone woodcut busts) ---------------- */
  function portrait(whoId) {
    const P = {
      bo: '<svg viewBox="0 0 100 130"><path d="M20 130 Q22 96 50 92 Q78 96 80 130 Z" fill="#1c2632"/><ellipse cx="50" cy="62" rx="22" ry="26" fill="#25313e"/><path d="M30 72 Q30 104 50 106 Q70 104 70 72 Q64 92 50 92 Q36 92 30 72Z" fill="#31404e"/><path d="M22 40 Q24 22 50 20 Q76 22 78 40 L80 44 L20 44 Z" fill="#10161d"/><path d="M18 44 Q50 50 82 44" stroke="#e8a13d" stroke-width="2" fill="none"/><rect x="38" y="60" width="6" height="3" fill="#cfc3a9"/><rect x="56" y="60" width="6" height="3" fill="#cfc3a9"/><path d="M40 84 Q50 88 60 84" stroke="#10161d" stroke-width="2" fill="none"/><circle cx="74" cy="66" r="2" fill="#e8a13d"/></svg>',
      sel: '<svg viewBox="0 0 100 130"><path d="M18 130 Q22 98 50 94 Q78 98 82 130 Z" fill="#1e2a26"/><ellipse cx="50" cy="64" rx="20" ry="24" fill="#2a3833"/><path d="M26 56 Q26 26 50 24 Q74 26 74 56 Q70 44 50 44 Q30 44 26 56 Z" fill="#182119"/><path d="M28 58 Q28 34 50 32 Q72 34 72 58 L72 72 Q66 60 50 60 Q34 60 28 72 Z" fill="#141a15"/><rect x="42" y="62" width="6" height="3" fill="#cfc3a9"/><rect x="54" y="62" width="6" height="3" fill="#cfc3a9"/><path d="M44 80 Q50 84 56 80" stroke="#141a15" stroke-width="2" fill="none"/><path d="M28 60 Q22 84 26 104" stroke="#141a15" stroke-width="2" fill="none"/><circle cx="50" cy="106" r="4" fill="none" stroke="#9aab8c" stroke-width="1.5"/><path d="M50 96 v6" stroke="#9aab8c" stroke-width="1.5"/></svg>',
      tam: '<svg viewBox="0 0 100 130"><path d="M22 130 Q24 98 50 94 Q76 98 78 130 Z" fill="#1a2530"/><ellipse cx="50" cy="64" rx="21" ry="25" fill="#243040"/><path d="M28 78 Q28 106 50 110 Q72 106 72 78 Q64 96 50 96 Q36 96 28 78Z" fill="#3a4654"/><path d="M24 38 Q28 30 50 28 Q72 30 76 38 L76 44 L24 44 Z" fill="#0f151c"/><rect x="38" y="58" width="7" height="3" fill="#cfc3a9"/><rect x="56" y="58" width="7" height="3" fill="#cfc3a9"/><path d="M42 86 Q50 90 58 86" stroke="#0f151c" stroke-width="2" fill="none"/><path d="M74 62 Q88 58 86 70 Q85 78 76 74 Z" fill="#6f9fb8" opacity=".85"/><path d="M24 110 h52" stroke="#0f151c" stroke-width="1"/><rect x="42" y="104" width="16" height="6" rx="2" fill="none" stroke="#6f9fb8" stroke-width="1.4"/></svg>',
      aldo: '<svg viewBox="0 0 100 130"><rect x="24" y="16" width="52" height="98" fill="none" stroke="#3a4654" stroke-width="3"/><rect x="30" y="22" width="40" height="86" fill="#141a21"/><path d="M44 58 h12 v34 h-12 z" fill="#1d2731"/><path d="M42 54 h16 l-2 6 h-12 z" fill="#2a3644"/><path d="M46 44 h8 v10 h-8 z" fill="#2a3644"/><path d="M50 38 v6" stroke="#3a4654" stroke-width="2"/><circle cx="50" cy="74" r="5" fill="none" stroke="#e8a13d" stroke-width="1.4"/><path d="M50 79 v6" stroke="#e8a13d" stroke-width="1.2" opacity=".5"/><path d="M28 100 q22 8 44 0" stroke="#e8a13d" stroke-width="1.2" fill="none" opacity=".6"/></svg>',
      commission: '<svg viewBox="0 0 100 130"><ellipse cx="50" cy="62" rx="34" ry="40" fill="#1a2530"/><ellipse cx="50" cy="62" rx="30" ry="36" fill="none" stroke="#8fa0a8" stroke-width="2"/><path d="M50 38 v44" stroke="#cfc3a9" stroke-width="2.4"/><path d="M40 50 h20" stroke="#cfc3a9" stroke-width="2.4"/><path d="M38 84 q12 8 24 0" fill="#8fa0a8"/><circle cx="50" cy="44" r="6" fill="none" stroke="#cfc3a9" stroke-width="2"/><path d="M32 62 h36" stroke="#8fa0a8" stroke-width="1" opacity=".6"/><path d="M32 72 h36" stroke="#8fa0a8" stroke-width="1" opacity=".6"/></svg>',
      jory: '<svg viewBox="0 0 100 130"><path d="M20 130 Q24 100 50 96 Q76 100 80 130 Z" fill="#1d2833"/><ellipse cx="50" cy="64" rx="20" ry="24" fill="#263342"/><rect x="42" y="62" width="6" height="3" fill="#cfc3a9"/><rect x="54" y="62" width="6" height="3" fill="#cfc3a9"/><path d="M44 82 Q50 86 58 82" stroke="#141a21" stroke-width="2" fill="none"/><path d="M60 44 Q72 52 68 66" stroke="#263342" stroke-width="3" fill="none"/><circle cx="50" cy="108" r="4" fill="none" stroke="#9fc6b8" stroke-width="1.5"/></svg>',
    };
    return P[whoId] || "";
  }
  function showPortrait(whoId) {
    const box = $("dlg-portrait");
    const svg = portrait(whoId);
    if (!svg) { box.style.display = "none"; box.innerHTML = ""; return; }
    box.style.display = "grid";
    box.innerHTML = svg;
  }

  /* ---------------- screens ---------------- */
  function show(screenId) {
    const a = app();
    a.querySelectorAll(".screen").forEach((s) => s.classList.toggle("is-active", s.id === screenId));
    a.dataset.screen = screenId.replace("s-", "");
  }

  let fadeBusy = false;
  function fadeThrough(fn, dur) {
    const f = $("fader");
    if (fadeBusy) { fn(); return; }
    fadeBusy = true;
    f.classList.remove("is-clear");
    window.setTimeout(() => {
      try { fn(); } catch (e) { /* never strand the player on a black screen */ }
      window.setTimeout(() => {
        f.classList.add("is-clear");
        fadeBusy = false;
      }, 80);
    }, (window.Game && window.Game.reducedMotion()) ? 120 : 560);
  }

  /* ---------------- toasts ---------------- */
  function toast(msg, ms) {
    const box = $("toasts");
    const t = el("div", "toast", msg);
    box.appendChild(t);
    window.setTimeout(() => {
      t.classList.add("is-out");
      window.setTimeout(() => t.remove(), 500);
    }, ms || 3200);
  }

  /* ---------------- overlays ---------------- */
  const stack = [];
  function openOverlay(id) {
    const ov = $(id);
    if (!ov || ov.classList.contains("is-open")) return;
    ov.classList.add("is-open");
    ov.hidden = false;
    stack.push({ id: id, prev: document.activeElement });
    const f = ov.querySelector("button, input, [tabindex]");
    if (f) window.setTimeout(() => f.focus({ preventScroll: true }), 60);
  }
  function closeOverlay(id) {
    const ov = $(id);
    if (!ov) return;
    ov.classList.remove("is-open");
    window.setTimeout(() => { if (!ov.classList.contains("is-open")) ov.hidden = true; }, 380);
    const i = stack.findIndex((s) => s.id === id);
    if (i !== -1) {
      const rec = stack.splice(i, 1)[0];
      if (rec && rec.prev && rec.prev.focus) { try { rec.prev.focus({ preventScroll: true }); } catch (e) {} }
    }
  }
  function closeTop() {
    if (!stack.length) return false;
    closeOverlay(stack[stack.length - 1].id);
    return true;
  }
  function topOverlay() { return stack.length ? stack[stack.length - 1].id : null; }

  document.querySelectorAll("[data-close]").forEach((b) => {
    b.addEventListener("click", () => closeOverlay(b.closest(".overlay").id));
  });

  /* ---------------- typewriter ---------------- */
  function textSpeed() {
    const st = State.settings();
    return st.text === "instant" ? 0 : st.text === "fast" ? 6 : 17;
  }
  function typeInto(node, text, onDone) {
    const spd = textSpeed();
    if (spd === 0 || State.settings().motion === "calm") {
      node.textContent = text;
      if (onDone) onDone();
      return () => {};
    }
    let i = 0; let alive = true;
    const step = () => {
      if (!alive) return;
      i += 1;
      node.textContent = text.slice(0, i);
      if (i < text.length) window.setTimeout(step, spd);
      else if (onDone) onDone();
    };
    window.setTimeout(step, spd);
    return () => { alive = false; node.textContent = text; if (onDone) onDone(); };
  }
  function isTyping(node) { return node.classList.contains("is-typing"); }

  /* ============================================================
     DIALOGUE ENGINE
     ============================================================ */
  let dlg = null; // {scene, idx, onEnd}

  function startDialogue(key, onEnd, where) {
    const scene = CD.scenes[key];
    if (!scene) { if (onEnd) onEnd(); return; }
    dlg = { key: key, scene: scene, idx: 0, onEnd: onEnd || null, where: where || "", applied: {} };
    openOverlay("ov-dialogue");
    renderNode();
  }

  function endDialogue() {
    const onEnd = dlg ? dlg.onEnd : null;
    dlg = null;
    closeOverlay("ov-dialogue");
    if (onEnd) onEnd();
  }

  function fxFor(node, opt) {
    // apply option fx (node fx already applied when node shown? no — apply on choose)
    if (opt && opt.fx) Game.applyFx(opt.fx);
  }

  function nodeText(node) {
    const s = State.get();
    const raw = typeof node.text === "function" ? node.text(s) : node.text;
    return raw || "";
  }

  function renderNode() {
    if (!dlg) return;
    const scene = dlg.scene;
    let node = scene[dlg.idx];
    // walk past condition-false nodes automatically
    let guard = 0;
    while (node && node.cond && !node.cond(State.get()) && guard < 50) {
      dlg.idx += 1; node = scene[dlg.idx]; guard += 1;
    }
    if (!node || node.end) { endDialogue(); return; }

    // node-level effects fire once, when the node is shown
    if (node.fx && !dlg.applied[dlg.idx]) {
      dlg.applied[dlg.idx] = true;
      Game.applyFx(node.fx);
    }

    const charBox = CW.CHARS[node.who] || CW.CHARS.narr;
    $("dlg-name").textContent = node.who === "narr" ? "" : (node.who === "you" ? State.get().name : charBox.name);
    $("dlg-name").style.color = node.who === "narr" ? "var(--paper-dim)" : charBox.color;
    $("dlg-where").textContent = dlg.where || "";
    showPortrait(node.who);
    Snd.play(node.who === "narr" ? "page" : "select");

    const tbox = $("dlg-text");
    tbox.classList.remove("is-typing");
    tbox.innerHTML = "";
    const text = nodeText(node);
    const done = () => { tbox.classList.remove("is-typing"); renderOpts(node); };
    tbox.classList.add("is-typing");
    dlg.stopType = typeInto(tbox, text, done);

    const hint = $("dlg-hint");
    hint.textContent = (node.opts && node.opts.length) ? "choose with 1–4 or click" : "enter, space or click to continue";
  }

  function renderOpts(node) {
    const box = $("dlg-opts");
    box.innerHTML = "";
    if (!node.opts || !node.opts.length) return;
    const s = State.get();
    const opts = node.opts.filter((o) => !o.cond || o.cond(s));
    opts.forEach((o, i) => {
      const b = el("button", "dlg-opt");
      b.innerHTML = o.t + (o.note ? '<span class="opt-note">' + o.note + "</span>" : "");
      b.addEventListener("click", () => chooseOpt(node, o));
      b.dataset.idx = String(i + 1);
      box.appendChild(b);
    });
    box.dataset.count = String(opts.length);
  }

  function chooseOpt(node, o) {
    Snd.play("click");
    fxFor(node, o);
    // show the player's line, then continue
    const tbox = $("dlg-text");
    const optsBox = $("dlg-opts");
    optsBox.innerHTML = "";
    if (o.t && o.t[0] === '"' ) {
      const youLine = el("div", "you-line");
      youLine.textContent = "You — " + o.t.replace(/^"|"$/g, "");
      tbox.innerHTML = "";
      tbox.appendChild(youLine);
    }
    window.setTimeout(() => {
      if (o.to) { const i = dlg.scene.findIndex((n) => n.id === o.to); dlg.idx = i === -1 ? dlg.scene.length : i; }
      else dlg.idx += 1;
      if (o.endNode || dlg.idx >= dlg.scene.length) endDialogue();
      else renderNode();
    }, 260);
  }

  /* advance: called by click / enter / space */
  function advanceDialogue() {
    if (!dlg) return;
    const node = dlg.scene[dlg.idx];
    if (!node) { endDialogue(); return; }
    const tbox = $("dlg-text");
    if (isTyping(tbox)) {
      if (dlg.stopType) dlg.stopType();
      tbox.classList.remove("is-typing");
      renderOpts(node);
      return;
    }
    if (node.opts && node.opts.length && $("dlg-opts").children.length) return; // wait for a choice
    // no options → next node
    dlg.idx += 1;
    Snd.play("page");
    if (dlg.idx >= dlg.scene.length) endDialogue();
    else renderNode();
  }

  function pickOption(i) {
    if (!dlg) return false;
    const node = dlg.scene[dlg.idx];
    if (!node || !node.opts) return false;
    const box = $("dlg-opts");
    const btns = Array.from(box.children);
    const b = btns[i - 1];
    if (b) { b.click(); return true; }
    return false;
  }

  /* ============================================================
     GENERIC EVENT CARD (night events, location menus)
     ============================================================ */
  function showEvent(cfg) {
    // cfg: {head, text, textFn, opts:[{t, note, onPick}], noOpts}
    const ov = $("ov-event");
    $("evt-head").textContent = cfg.head || "";
    const tbox = $("evt-text");
    tbox.classList.remove("is-typing");
    const text = cfg.textFn ? cfg.textFn(State.get()) : (cfg.text || "");
    tbox.innerHTML = "";
    tbox.classList.add("is-typing");
    cfg._stop = typeInto(tbox, text, () => tbox.classList.remove("is-typing"));
    cfg._shownText = text;
    const box = $("evt-opts");
    box.innerHTML = "";
    (cfg.opts || []).forEach((o, i) => {
      const b = el("button", "dlg-opt");
      b.innerHTML = o.t + (o.note ? '<span class="opt-note">' + o.note + "</span>" : "");
      b.addEventListener("click", () => {
        Snd.play("click");
        if (o.onPick) o.onPick();
      });
      b.dataset.idx = String(i + 1);
      box.appendChild(b);
    });
    box.dataset.count = String((cfg.opts || []).length);
    cfg._btns = Array.from(box.children);
    openOverlay("ov-event");
    window._evt = cfg;
    return cfg;
  }
  function eventTyping() {
    const cfg = window._evt;
    if (!cfg) return false;
    const tbox = $("evt-text");
    if (tbox.classList.contains("is-typing")) { if (cfg._stop) cfg._stop(); tbox.classList.remove("is-typing"); return true; }
    return false;
  }
  function eventPick(i) {
    const cfg = window._evt;
    if (!cfg || !cfg._btns) return false;
    const b = cfg._btns[i - 1];
    if (b) { b.click(); return true; }
    return false;
  }
  function eventReply(head, text, onDone) {
    if (!window._evt) window._evt = { _btns: [] }; // the caller may have closed the card (the rite does)
    const cfg = window._evt;
    $("evt-head").textContent = head || "";
    const tbox = $("evt-text");
    tbox.innerHTML = "";
    tbox.classList.remove("is-typing");
    cfg._stop = typeInto(tbox, text, () => tbox.classList.remove("is-typing"));
    const box = $("evt-opts");
    box.innerHTML = "";
    const b = el("button", "dlg-opt", "Continue");
    b.addEventListener("click", () => { closeOverlay("ov-event"); window._evt = null; if (onDone) onDone(); });
    box.appendChild(b);
    cfg._btns = [b];
    box.dataset.count = "1";
  }
  function closeEvent() {
    closeOverlay("ov-event");
    window._evt = null;
  }

  /* ============================================================
     SEQUENCE — typed story text (prologue, cards, logs, endings)
     ============================================================ */
  let seq = null;
  function playSequence(lines, opts) {
    // lines: array of string | {text, paper}
    opts = opts || {};
    seq = { lines: lines.map((l) => (typeof l === "string" ? { text: l } : l)), i: 0, onDone: opts.onDone || null, label: opts.cue || "click, space or enter" };
    show("s-seq");
    $("seq-cue-label").textContent = seq.label;
    $("seq-skip").hidden = false;
    renderSeq();
  }
  function renderSeq() {
    if (!seq) return;
    const line = seq.lines[seq.i];
    const paper = $("seq-paper");
    paper.hidden = !line.paper;
    paper.classList.toggle("is-letter", line.paper === "letter");
    const tbox = $("seq-text");
    tbox.innerHTML = "";
    tbox.classList.remove("is-typing");
    tbox.classList.add("is-typing");
    seq._stop = typeInto(tbox, line.text, () => {
      tbox.classList.remove("is-typing");
      $("seq-cue").classList.add("is-on");
    });
    $("seq-cue").classList.remove("is-on");
  }
  function advanceSeq() {
    if (!seq) return false;
    const tbox = $("seq-text");
    if (tbox.classList.contains("is-typing")) {
      if (seq._stop) seq._stop();
      tbox.classList.remove("is-typing");
      $("seq-cue").classList.add("is-on");
      return true;
    }
    seq.i += 1;
    if (seq.i >= seq.lines.length) {
      const done = seq.onDone; seq = null;
      if (done) done();
      return true;
    }
    Snd.play("page");
    renderSeq();
    return true;
  }
  function skipSeq() {
    if (!seq) return;
    const tbox = $("seq-text");
    if (tbox.classList.contains("is-typing") && seq._stop) { seq._stop(); tbox.classList.remove("is-typing"); $("seq-cue").classList.add("is-on"); return; }
    while (seq) { if (!advanceSeq()) break; }
  }
  function seqActive() { return !!seq; }

  /* ============================================================
     PANELS
     ============================================================ */

  /* ---- journal ---- */
  let journalTab = "log";
  function openJournal(tab) {
    journalTab = tab || journalTab;
    openOverlay("ov-journal");
    document.querySelectorAll("#ov-journal .tab").forEach((t) => t.classList.toggle("is-on", t.dataset.tab === journalTab));
    renderJournal();
  }
  function renderJournal() {
    const body = $("journal-body");
    body.innerHTML = "";
    const s = State.get();
    if (journalTab === "log") {
      // night logs first (newest last per order kept), then discovered entries
      const wrap = el("div");
      s.nights.forEach((n) => {
        if (!n.log) return;
        const nightName = n.n === 0 ? "the teaching night" : "the " + ord(n.n) + " night";
        n.log.filter(Boolean).forEach((line, k) => {
          wrap.appendChild(el("div", "j-entry",
            "<h3>" + (k === 0 ? "Dawn, after " + nightName : "") + "</h3>" +
            '<div class="j-meta">' + (k === 0 ? "watch score " + n.score + " — " + CN.scoreNote(n.score) : "") + "</div>" +
            "<p>" + line + "</p>"));
        });
      });
      s.journal.forEach((id) => {
        const e = CW.JOURNAL[id];
        if (!e || e.tag === "deep") return;
        wrap.appendChild(el("div", "j-entry",
          "<h3>" + e.title + "</h3>" +
          '<div class="j-meta">the keeper\'s logbook</div>' +
          "<p>" + e.body + "</p>" +
          '<span class="j-tag">' + (e.tag || "station") + "</span>"));
      });
      if (!wrap.children.length) wrap.appendChild(el("p", "j-empty", "The logbook is nearly blank. A week is long on a coast this small."));
      body.appendChild(wrap);
    } else if (journalTab === "folk") {
      CW.FOLK.forEach((f) => {
        const t = s.trust[f.id] || 0;
        const div = el("div", "j-folk");
        div.innerHTML = '<div class="j-folk-portrait">' + portrait(f.id) + "</div>" +
          '<div><h3>' + f.name + "</h3>" +
          '<div class="j-standing">' + CW.standing(t) + "</div>" +
          "<p>" + f.read(s) + "</p>" +
          '<p style="font-style:normal;color:#6d5d40;margin-top:6px;">' + f.want + "</p></div>";
        body.appendChild(div);
      });
    } else {
      const ids = s.journal.filter((id) => CW.JOURNAL[id] && CW.JOURNAL[id].tag === "deep");
      if (!ids.length) { body.appendChild(el("p", "j-empty", "What the water gives, it gives to those who go and look. The caves are at low water.")); return; }
      ids.forEach((id) => {
        const e = CW.JOURNAL[id];
        body.appendChild(el("div", "j-entry", "<h3>" + e.title + "</h3><p>" + e.body + "</p>" + '<span class="j-tag">what the water gives</span>'));
      });
    }
  }
  function ord(n) { return ["", "first", "second", "third", "fourth", "fifth"][n] || n + "th"; }

  document.querySelectorAll("#ov-journal .tab").forEach((t) => {
    t.addEventListener("click", () => { journalTab = t.dataset.tab; Snd.play("click"); renderJournal(); document.querySelectorAll("#ov-journal .tab").forEach((x) => x.classList.toggle("is-on", x === t)); });
  });

  /* ---- satchel ---- */
  function openBag() {
    openOverlay("ov-bag");
    renderBag();
  }
  function renderBag() {
    const s = State.get();
    $("bag-marks").textContent = String(s.marks);
    const grid = $("bag-grid");
    grid.innerHTML = "";
    if (!s.items.length) { grid.appendChild(el("div", "bag-empty", "Empty but for crumbs and good intentions.")); return; }
    s.items.forEach((id) => {
      const it = CW.ITEMS[id];
      if (!it) return;
      const div = el("div", "bag-item");
      div.innerHTML = icon(it.icon) + '<div><h3>' + it.name + "</h3><p>" + it.desc + "</p></div>";
      grid.appendChild(div);
    });
  }

  /* ---- orders ---- */
  function openOrders() {
    openOverlay("ov-orders");
    renderOrders();
  }
  function renderOrders() {
    const s = State.get();
    const body = $("orders-body");
    body.innerHTML = "";
    const ch = CW.CHAPTERS[s.chapter];
    if (!ch) { body.appendChild(el("p", "j-empty", "No orders. Keep the light.")); return; }
    body.appendChild(el("p", "j-empty", ch.day + " — " + ch.title.toLowerCase()));
    ch.orders.forEach((o) => {
      const done = !!o.done(s);
      const div = el("div", "order" + (done ? " is-done" : ""));
      div.innerHTML = '<span class="order-mark">' + (done ? "✓" : "—") + '</span><span class="order-label">' + o.text + (o.note ? ' <span class="order-note">· ' + o.note + "</span>" : "") + "</span>";
      body.appendChild(div);
    });
  }

  /* ---- settings ---- */
  function openSettings() { openOverlay("ov-settings"); syncSettings(); }
  function syncSettings() {
    const st = State.settings();
    $("set-music").value = Math.round(st.music * 100); $("val-music").textContent = Math.round(st.music * 100);
    $("set-amb").value = Math.round(st.amb * 100); $("val-amb").textContent = Math.round(st.amb * 100);
    $("set-sfx").value = Math.round(st.sfx * 100); $("val-sfx").textContent = Math.round(st.sfx * 100);
    document.querySelectorAll("#ov-settings .seg-opt").forEach((b) => {
      if (b.dataset.motion) b.classList.toggle("is-on", b.dataset.motion === st.motion);
      if (b.dataset.text) b.classList.toggle("is-on", b.dataset.text === st.text);
    });
  }
  function bindSettings() {
    const apply = () => {
      const st = State.settings();
      Snd.setVolumes(st.music, st.amb, st.sfx);
      app().dataset.motion = st.motion;
    };
    [["set-music", "music"], ["set-amb", "amb"], ["set-sfx", "sfx"]].forEach(([id, key]) => {
      $(id).addEventListener("input", () => {
        const v = Number($(id).value) / 100;
        State.setSetting(key, v);
        $("val-" + key).textContent = $(id).value;
        apply();
      });
    });
    document.querySelectorAll("#ov-settings .seg-opt").forEach((b) => {
      b.addEventListener("click", () => {
        Snd.play("click");
        if (b.dataset.motion) State.setSetting("motion", b.dataset.motion);
        if (b.dataset.text) State.setSetting("text", b.dataset.text);
        syncSettings(); apply();
      });
    });
    apply();
  }

  /* ---- saves ---- */
  function openSaves(mode) {
    openOverlay("ov-saves");
    renderSaves(mode || (State.isLoaded() ? "both" : "load"));
  }
  function renderSaves(mode) {
    const list = $("saves-list");
    list.innerHTML = "";
    for (let i = 0; i < State.SLOT_COUNT; i++) {
      const peek = State.peekSlot(i);
      const slot = el("div", "save-slot");
      const label = i === 0 ? "Autosave" : "Log " + i;
      if (peek) {
        const d = new Date(peek.when || Date.now());
        const chName = peek.chapter >= 1 && peek.chapter <= 5 ? "Chapter " + peek.chapter + " — " + CW.CHAPTERS[peek.chapter].title : peek.chapter === 0 ? "The crossing" : "The ending";
        slot.innerHTML = '<div class="save-info"><div class="save-name">' + label + ' — ' + peek.name + '</div><div class="save-detail">' + chName + " · " + d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "</div></div>";
      } else {
        slot.innerHTML = '<div class="save-info"><div class="save-name">' + label + '</div><div class="save-detail save-empty">— blank page —</div></div>';
      }
      if (mode !== "load" && State.isLoaded()) {
        if (i !== 0) {
          const bs = el("button", "tbtn", "Write");
          bs.addEventListener("click", () => {
            const ok = State.saveSlot(i);
            Snd.play("chime");
            toast(ok ? "Marked in log " + i + "." : "Saved in memory only — this browser keeps no cookies here.");
            renderSaves(mode);
          });
          slot.appendChild(bs);
        }
      }
      if (peek) {
        const bl = el("button", "tbtn", "Open");
        bl.addEventListener("click", () => {
          const st = State.loadSlot(i);
          if (st) { Snd.play("chime"); closeOverlay("ov-saves"); Game.resumeFrom(st); }
          else toast("That page is water-damaged beyond reading.");
        });
        slot.appendChild(bl);
        if (i !== 0) {
          const bd = el("button", "ghost-btn", "Tear out");
          bd.addEventListener("click", () => {
            confirmBox("Tear out this page for good?", () => { State.deleteSlot(i); renderSaves(mode); });
          });
          slot.appendChild(bd);
        }
      }
      list.appendChild(slot);
    }
  }

  /* ---- confirm ---- */
  let confirmCb = null;
  function confirmBox(text, onYes) {
    $("confirm-text").textContent = text;
    confirmCb = onYes;
    openOverlay("ov-confirm");
  }
  function bindConfirm() {
    $("confirm-yes").addEventListener("click", () => { closeOverlay("ov-confirm"); if (confirmCb) confirmCb(); confirmCb = null; });
    $("confirm-no").addEventListener("click", () => { closeOverlay("ov-confirm"); confirmCb = null; });
  }

  /* ---- artifact / documents ---- */
  function openArtifact(docId, onDone) {
    const doc = CW.DOCUMENTS[docId];
    if (!doc) { if (onDone) onDone(); return; }
    $("artifact-title").textContent = doc.title;
    const body = $("artifact-body");
    body.innerHTML = "";
    if (doc.head) body.appendChild(el("div", "artifact-head", doc.head));
    const pre = el("div");
    pre.style.whiteSpace = "pre-wrap";
    pre.textContent = doc.body;
    body.appendChild(pre);
    Snd.play("page");
    openOverlay("ov-artifact");
    window._artifactDone = onDone || null;
  }
  function bindArtifact() {
    $("ov-artifact").addEventListener("click", (e) => {
      if (e.target.closest(".xbtn") || e.target === $("ov-artifact")) {
        const done = window._artifactDone; window._artifactDone = null;
        closeOverlay("ov-artifact");
        if (done) window.setTimeout(done, 200);
      }
    });
  }

  /* ---- name entry ---- */
  function openName() {
    openOverlay("ov-name");
    const inp = $("name-input");
    inp.value = "Edda";
    window.setTimeout(() => { inp.focus(); inp.select(); }, 80);
  }
  function bindName() {
    const go = () => {
      const n = State.sanitizeName($("name-input").value);
      closeOverlay("ov-name");
      Snd.play("ink");
      Game.newGame(n);
    };
    $("name-go").addEventListener("click", go);
    $("name-input").addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  }

  /* ---------------- global bindings ---------------- */
  function bindAll() {
    bindSettings(); bindConfirm(); bindArtifact(); bindName();
  }

  return {
    el, icon, portrait, show, fadeThrough, toast,
    openOverlay, closeOverlay, closeTop, topOverlay,
    startDialogue, advanceDialogue, pickOption, endDialogue,
    showEvent, eventTyping, eventPick, eventReply, closeEvent,
    playSequence, advanceSeq, skipSeq, seqActive,
    openJournal, openBag, openOrders, openSettings, openSaves,
    confirmBox, openArtifact, openName, bindAll, typeInto, textSpeed,
  };
})();
