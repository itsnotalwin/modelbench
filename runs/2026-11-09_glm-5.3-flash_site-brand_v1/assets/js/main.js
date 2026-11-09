/* ==========================================================================
   Sallow & Fen — behaviour
   Progressive enhancement only: every section reads fully with JS off.
   Storage is guarded; drafts are never lost silently.
   ========================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Guarded storage ---------- */
  var memory = {};
  var storageWorks = (function () {
    try {
      var k = "sf:test";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  function storeGet(key) {
    try { return storageWorks ? window.localStorage.getItem(key) : (key in memory ? memory[key] : null); }
    catch (e) { return key in memory ? memory[key] : null; }
  }
  function storeSet(key, value) {
    try {
      if (storageWorks) { window.localStorage.setItem(key, value); }
      else { memory[key] = value; }
      return true;
    } catch (e) {
      memory[key] = value;
      return false;
    }
  }
  function storeRemove(key) {
    try { if (storageWorks) window.localStorage.removeItem(key); } catch (e) { /* ignore */ }
    delete memory[key];
  }

  var storageNoticeShown = false;
  function warnIfMemoryOnly() {
    if (storageWorks || storageNoticeShown) return;
    storageNoticeShown = true;
    var status = $("#form-status");
    if (status) status.textContent = "Note: your browser is blocking local storage, so drafts and sent enquiries will only last while this page stays open. Nothing else is affected.";
  }

  /* ---------- Hero plate: arm the draw-on animation ---------- */
  (function armPlate() {
    var plate = $(".plate");
    if (!plate) return;
    $$(".draw", plate).forEach(function (el) { el.setAttribute("pathLength", "1"); });
    plate.classList.add("animate");
  })();

  /* ---------- Reveal on scroll ---------- */
  (function reveals() {
    var items = $$(".reveal");
    if (!items.length || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- Header / mobile nav ---------- */
  (function nav() {
    var toggle = $(".nav-toggle");
    var navEl = $("#site-nav");
    if (!toggle || !navEl) return;

    function setOpen(open) {
      navEl.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    navEl.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navEl.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) setOpen(false);
    });

    var head = $(".site-head");
    if (head) {
      var onScroll = function () {
        head.classList.toggle("scrolled", window.scrollY > 8);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  })();

  /* ---------- Scrollspy ---------- */
  (function scrollspy() {
    var links = $$("[data-spy]");
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      map[id] = a;
      a.setAttribute("aria-current", "false");
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = map[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(function (a) { a.setAttribute("aria-current", "false"); });
          link.setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });
    Object.keys(map).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) io.observe(sec);
    });
    /* above the first section, no nav item is current */
    var hero = document.querySelector(".hero");
    if (hero && "IntersectionObserver" in window) {
      var heroIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            links.forEach(function (a) { a.setAttribute("aria-current", "false"); });
          }
        });
      }, { rootMargin: "-10% 0px -80% 0px", threshold: 0 });
      heroIo.observe(hero);
    }
  })();

  /* ---------- Sowing calendar ---------- */
  var VARIETY_NAMES = {
    champion: "Pea ‘Champion of England’",
    auntida: "Tomato ‘Aunt Ida’s Pink’",
    bullsbl: "Beetroot ‘Bull’s Blood’",
    queen: "Squash ‘Queen of the Fens’",
    aldeburgh: "Carrot ‘Aldeburgh Early’",
    rochford: "Dwarf bean ‘Rochford Prince’",
    fenblack: "Kale ‘Fenland Black’",
    winterden: "Lettuce ‘Winter Density’",
    fcc: "Chard ‘Five Colour Marsh’",
    mussel: "Leek ‘Musselburgh’",
    frenchbf: "Radish ‘French Breakfast’",
    empress: "Nasturtium ‘Empress of India’"
  };

  var MONTHS = [
    null,
    { sowIn: ["mussel"], sowOut: [], harvest: ["fenblack", "mussel"],
      note: "Order now, sow little. The best tool this month is a pencil and the seed tin." },
    { sowIn: ["auntida", "mussel"], sowOut: ["frenchbf"], harvest: ["fenblack", "mussel", "fcc"],
      note: "First sowing under cover. The warm windowsill above the boiler earns its keep." },
    { sowIn: ["auntida"], sowOut: ["champion", "bullsbl", "fcc", "aldeburgh", "frenchbf"], harvest: ["fenblack", "mussel", "fcc"],
      note: "The last tomato sowing — after this, buy plants and stop feeling guilty." },
    { sowIn: ["queen"], sowOut: ["champion", "bullsbl", "aldeburgh", "frenchbf", "rochford", "fenblack", "empress", "mussel"], harvest: ["frenchbf", "fcc", "winterden"],
      note: "Everything wants doing at once. The beans wait for the last frost — late April here, later up country." },
    { sowIn: [], sowOut: ["rochford", "queen", "empress", "aldeburgh", "frenchbf", "bullsbl", "fcc"], harvest: ["frenchbf", "fcc", "winterden"],
      note: "Squash goes out at the end of the month, once the cold snaps stop being a threat and become a rumour." },
    { sowIn: [], sowOut: ["rochford", "fenblack", "frenchbf", "bullsbl", "fcc"], harvest: ["champion", "frenchbf", "fcc", "bullsbl"],
      note: "Last call for kale and beans. Eat peas straight off the stem in the row; we won’t tell." },
    { sowIn: [], sowOut: ["bullsbl", "frenchbf", "fcc"], harvest: ["champion", "auntida", "bullsbl", "frenchbf", "rochford"],
      note: "Water the tomatoes, not the leaves. Pick beans small and often." },
    { sowIn: ["winterden"], sowOut: ["winterden", "frenchbf"], harvest: ["auntida", "rochford", "fcc", "frenchbf", "bullsbl"],
      note: "Winter cos goes in now — the whole point is eating salad in November." },
    { sowIn: ["winterden"], sowOut: ["winterden", "frenchbf"], harvest: ["queen", "auntida", "fcc", "fenblack", "rochford"],
      note: "Squash comes in when the stem cracks like cork. Cure it somewhere warm and dry." },
    { sowIn: [], sowOut: [], harvest: ["fenblack", "mussel", "queen", "fcc"],
      note: "Nothing of ours goes in now — plant garlic from your own stock, mulch everything, start next year’s list." },
    { sowIn: [], sowOut: [], harvest: ["fenblack", "mussel", "fcc"],
      note: "Rest. Read catalogues sceptically, including ours." },
    { sowIn: [], sowOut: [], harvest: ["fenblack", "mussel"],
      note: "Sharpen things. The shortest day is behind us before you notice." }
  ];

  var MONTH_ABBR = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var selectedMonth = (function () {
    var m = new Date().getMonth() + 1;
    return (m >= 1 && m <= 12) ? m : 1;
  })();

  var state = { month: selectedMonth, types: [], sowNow: false };

  /* bound before the calendar initialises: renderCalendar() calls applyFilters() */
  var cards = $$(".seed-card");
  var countEl = $("#filter-count");
  var emptyEl = $("#library-empty");

  function fillList(ul, slugs, emptyText) {
    if (!ul) return;
    ul.innerHTML = "";
    if (!slugs.length) {
      var li = document.createElement("li");
      li.className = "is-empty";
      li.textContent = emptyText;
      ul.appendChild(li);
      return;
    }
    slugs.forEach(function (slug) {
      var li = document.createElement("li");
      li.textContent = VARIETY_NAMES[slug] || slug;
      ul.appendChild(li);
    });
  }

  function renderCalendar() {
    var data = MONTHS[state.month];
    if (!data) return;
    var srMonth = $("[data-slot=\"sr-month\"]");
    if (srMonth) srMonth.textContent = "Showing the sowing calendar for " + MONTH_ABBR[state.month];
    fillList($("[data-slot=\"sowIn\"]"), data.sowIn, "Nothing this month — honestly.");
    fillList($("[data-slot=\"sowOut\"]"), data.sowOut, "Nothing this month — rest is a job too.");
    fillList($("[data-slot=\"harvest\"]"), data.harvest, "The stores, mostly.");
    var note = $("[data-slot=\"note\"]");
    if (note) note.textContent = data.note;
    var sowNowText = $("#sownow-text");
    if (sowNowText) sowNowText.textContent = "Sowable in " + MONTH_ABBR[state.month];
    $$(".calendar__months button").forEach(function (b) {
      b.setAttribute("aria-pressed", Number(b.dataset.month) === state.month ? "true" : "false");
    });
    applyFilters();
  }

  (function initCalendar() {
    var holder = $(".calendar__months");
    if (!holder) return;
    MONTHS.forEach(function (_, i) {
      if (!i) return;
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = MONTH_ABBR[i];
      b.dataset.month = String(i);
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        state.month = i;
        renderCalendar();
      });
      holder.appendChild(b);
    });
    renderCalendar();
  })();

  /* ---------- Library filters ---------- */

  function applyFilters() {
    if (!cards || !cards.length) return;
    var shown = 0;
    cards.forEach(function (card) {
      var typeOk = !state.types.length || state.types.indexOf(card.dataset.type) !== -1;
      var sowMonths = (card.dataset.sow || "").split(",").map(Number);
      var sowOk = !state.sowNow || sowMonths.indexOf(state.month) !== -1;
      var visible = typeOk && sowOk;
      card.classList.toggle("is-hidden", !visible);
      if (visible) shown++;
    });
    if (countEl) countEl.textContent = "Showing " + shown + " of " + cards.length + " varieties";
    if (emptyEl) emptyEl.hidden = shown !== 0;
  }

  (function initFilters() {
    $$("input[name=\"type\"]").forEach(function (input) {
      input.addEventListener("change", function () {
        state.types = $$("input[name=\"type\"]:checked").map(function (i) { return i.value; });
        applyFilters();
      });
    });
    var sowNow = $("#filter-sownow");
    if (sowNow) {
      sowNow.addEventListener("change", function () {
        state.sowNow = sowNow.checked;
        applyFilters();
      });
    }
    function reset() {
      $$("input[name=\"type\"]").forEach(function (i) { i.checked = false; });
      if (sowNow) sowNow.checked = false;
      state.types = [];
      state.sowNow = false;
      applyFilters();
    }
    var resetBtn = $("#filter-reset");
    if (resetBtn) resetBtn.addEventListener("click", reset);
    var emptyReset = $("#library-empty-reset");
    if (emptyReset) emptyReset.addEventListener("click", reset);
  })();

  /* ---------- Dialogs ---------- */
  (function dialogs() {
    var lastOpener = null;
    $$("[data-dialog]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var dlg = document.getElementById(btn.dataset.dialog);
        if (!dlg || typeof dlg.showModal !== "function") return;
        lastOpener = btn;
        dlg.showModal();
      });
    });
    $$("dialog.policy").forEach(function (dlg) {
      dlg.addEventListener("click", function (e) {
        if (e.target === dlg) dlg.close();
      });
      var closer = dlg.querySelector("[data-close]");
      if (closer) closer.addEventListener("click", function () { dlg.close(); });
      dlg.addEventListener("close", function () {
        if (lastOpener) { lastOpener.focus(); lastOpener = null; }
      });
    });
  })();

  /* ---------- Enquiry form ---------- */
  (function enquiry() {
    var form = $("#enquiry");
    if (!form) return;

    var DRAFT_KEY = "sf:draft";
    var SENT_KEY = "sf:sent";
    var REF_KEY = "sf:ref";
    var MSG_MAX = 1200;

    var fields = {
      name: $("#f-name"),
      email: $("#f-email"),
      phone: $("#f-phone"),
      postcode: $("#f-postcode"),
      message: $("#f-message")
    };
    var modeSel = $("#f-mode");
    var whenSel = $("#f-when");
    var newsletter = $("#f-news");
    var errEls = {
      service: $("#err-service"),
      name: $("#err-name"),
      email: $("#err-email"),
      phone: $("#err-phone"),
      postcode: $("#err-postcode"),
      message: $("#err-message")
    };
    var summary = $("#error-summary");
    var summaryList = $("#error-summary-list");
    var statusEl = $("#form-status");
    var purposeNote = $("#f-purpose-note");
    var donePanel = $("#enquiry-done");
    var sentListWrap = $("#sent-list");
    var sentListUl = $("#sent-list-ul");

    var PURPOSE_HINTS = {
      "Garden planning session": "optional — plot size, photos, what you love to eat",
      "Allotment society talk": "optional — society, venue, rough date",
      "School seed-to-harvest workshop": "optional — school, year group, term",
      "Something else": "required — what are you after?"
    };

    function serviceName() {
      var checked = form.querySelector("input[name=\"service\"]:checked");
      return checked ? checked.value : "";
    }

    function modeLabel() {
      return modeSel.value === "onsite" ? "on-site visit" : (modeSel.value === "video" ? "video call" : "");
    }
    function whenLabel() {
      var i = whenSel.selectedIndex;
      return i > 0 ? whenSel.options[i].text.toLowerCase() : "";
    }

    /* --- validation --- */
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var PHONE_RE = /^[\d\s()+-]{7,20}$/;
    var POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

    var validators = {
      name: function (v) {
        if (!v.trim()) return "Tell us your name — even just a first name. We like knowing who we’re writing to.";
        if (v.trim().length < 2) return "That name is a little short — a couple of letters will do.";
        return "";
      },
      email: function (v) {
        if (!v.trim()) return "We need an email address to reply to.";
        if (!EMAIL_RE.test(v.trim())) return "That email doesn’t look quite right — something like mue@yourplot.co.uk.";
        return "";
      },
      phone: function (v) {
        if (!v.trim()) return "";
        if (!PHONE_RE.test(v.trim())) return "That phone number looks too short — include the area code, or leave it empty.";
        return "";
      },
      postcode: function (v) {
        if (modeSel.value !== "onsite") return "";
        if (!v.trim()) return "For an on-site visit we need a postcode — we travel 40 miles from Wortwell.";
        if (!POSTCODE_RE.test(v.trim())) return "That postcode doesn’t look like a UK one — something like IP20 0EF.";
        return "";
      },
      message: function (v) {
        if (serviceName() === "Something else" && !v.trim()) {
          return "Give us a sentence or two about what you’re after — even one line helps.";
        }
        return "";
      }
    };

    var currentErrors = {};

    function setFieldError(key, message) {
      currentErrors[key] = message || "";
      var el = fields[key];
      var errEl = errEls[key];
      if (!el) return;
      var wrap = el.closest(".field") || el.closest(".enquiry__services");
      if (message) {
        if (errEl) { errEl.textContent = message; errEl.hidden = false; }
        if (wrap) wrap.classList.add("field--invalid");
        el.setAttribute("aria-invalid", "true");
        if (errEl) el.setAttribute("aria-describedby", errEl.id);
      } else {
        if (errEl) { errEl.textContent = ""; errEl.hidden = true; }
        if (wrap) wrap.classList.remove("field--invalid");
        el.removeAttribute("aria-invalid");
        el.removeAttribute("aria-describedby");
      }
      renderSummary();
    }

    function renderSummary() {
      var keys = Object.keys(currentErrors).filter(function (k) { return currentErrors[k]; });
      if (!summary) return;
      if (!keys.length) {
        summary.hidden = true;
        summaryList.innerHTML = "";
        return;
      }
      summary.hidden = false;
      summaryList.innerHTML = "";
      keys.forEach(function (key) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        var label = key === "service" ? "Choose a session type" : (fields[key] ? (fields[key].previousElementSibling ? fields[key].previousElementSibling.textContent.trim() : key) : key);
        a.href = "#";
        a.textContent = label.replace(/\s*\(.*?\)\s*$/, "") + ": " + currentErrors[key];
        a.addEventListener("click", function (e) {
          e.preventDefault();
          var target = key === "service" ? $("#svc-plan") : fields[key];
          if (target) { target.focus(); target.scrollIntoView({ block: "center" }); }
        });
        li.appendChild(a);
        summaryList.appendChild(li);
      });
    }

    function validateField(key, silent) {
      var el = fields[key];
      var message = validators[key](el ? el.value : "");
      if (silent && message && !currentErrors[key]) {
        /* don't nag on first keystroke; will surface on submit */
        return message;
      }
      setFieldError(key, message);
      return message;
    }

    function validateService(silent) {
      var message = serviceName() ? "" : "Choose one of the four options, so we know who should reply.";
      if (silent && message && !currentErrors.service) return message;
      currentErrors.service = message;
      var errEl = errEls.service;
      if (errEl) {
        errEl.textContent = message;
        errEl.hidden = !message;
      }
      renderSummary();
      return message;
    }

    Object.keys(fields).forEach(function (key) {
      var el = fields[key];
      if (!el) return;
      var ev = (el.tagName === "SELECT") ? "change" : "input";
      el.addEventListener(ev, function () {
        el.dataset.touched = "true";
        validateField(key, false);
      });
      el.addEventListener("blur", function () {
        /* only nag on empty blur if the user typed and cleared */
        if (el.value.trim() || el.dataset.touched) validateField(key, false);
      });
    });
    $$("input[name=\"service\"]", form).forEach(function (r) {
      r.addEventListener("change", function () {
        currentErrors.service = "";
        if (errEls.service) { errEls.service.textContent = ""; errEls.service.hidden = true; }
        renderSummary();
        updatePurposeHint();
      });
    });
    modeSel.addEventListener("change", function () {
      $("#field-postcode").hidden = modeSel.value !== "onsite";
      if (modeSel.value !== "onsite") setFieldError("postcode", "");
    });

    /* --- char counter --- */
    var counter = $("#msg-count");
    function updateCounter() {
      var left = MSG_MAX - fields.message.value.length;
      if (counter) {
        counter.textContent = left.toLocaleString("en-GB") + " character" + (left === 1 ? "" : "s") + " left";
        counter.classList.toggle("is-low", left < 100);
      }
    }
    fields.message.addEventListener("input", updateCounter);

    function updatePurposeHint() {
      var s = serviceName();
      if (purposeNote && s) purposeNote.textContent = PURPOSE_HINTS[s] || "optional";
    }

    /* --- draft --- */
    var draftTimer = null;
    function readForm() {
      return {
        name: fields.name.value,
        email: fields.email.value,
        phone: fields.phone.value,
        postcode: fields.postcode.value,
        message: fields.message.value,
        service: serviceName(),
        mode: modeSel.value,
        when: whenSel.value,
        newsletter: newsletter.checked
      };
    }
    function draftIsMeaningful(d) {
      return !!(d.name.trim() || d.email.trim() || d.message.trim() || d.phone.trim());
    }
    function saveDraft() {
      var d = readForm();
      if (!draftIsMeaningful(d)) return;
      d.savedAt = new Date().toISOString();
      var ok = storeSet(DRAFT_KEY, JSON.stringify(d));
      if (!ok) warnIfMemoryOnly();
    }
    fields.message.addEventListener("input", function () {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(saveDraft, 600);
    });
    ["name", "email", "phone", "postcode"].forEach(function (key) {
      fields[key].addEventListener("blur", saveDraft);
    });
    modeSel.addEventListener("change", saveDraft);

    var restore = $("#draft-restore");
    var restoreMsg = $("#draft-restore-msg");
    function showRestoreBanner() {
      var raw = storeGet(DRAFT_KEY);
      if (!raw) return;
      var d;
      try { d = JSON.parse(raw); } catch (e) { storeRemove(DRAFT_KEY); return; }
      if (!d || !draftIsMeaningful(d)) { storeRemove(DRAFT_KEY); return; }
      var when = "";
      try {
        when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(d.savedAt));
      } catch (e) { when = ""; }
      if (restoreMsg) {
        restoreMsg.textContent = "You started an enquiry" + (when ? " on " + when : " earlier") +
          (d.service ? " — " + d.service.toLowerCase() : "") + ". Keep going?";
      }
      if (restore) restore.hidden = false;
    }
    var continueBtn = $("#draft-continue");
    var discardBtn = $("#draft-discard");
    if (continueBtn) {
      continueBtn.addEventListener("click", function () {
        var raw = storeGet(DRAFT_KEY);
        var d;
        try { d = JSON.parse(raw); } catch (e) { d = null; }
        if (d) {
          fields.name.value = d.name || "";
          fields.email.value = d.email || "";
          fields.phone.value = d.phone || "";
          fields.postcode.value = d.postcode || "";
          fields.message.value = d.message || "";
          if (d.service) {
            var r = form.querySelector("input[name=\"service\"][value=\"" + d.service + "\"]");
            if (r) r.checked = true;
          }
          if (d.mode) { modeSel.value = d.mode; $("#field-postcode").hidden = d.mode !== "onsite"; }
          if (d.when) whenSel.value = d.when;
          if (newsletter) newsletter.checked = !!d.newsletter;
          updateCounter();
          updatePurposeHint();
        }
        if (restore) restore.hidden = true;
        fields.name.focus();
      });
    }
    if (discardBtn) {
      discardBtn.addEventListener("click", function () {
        storeRemove(DRAFT_KEY);
        if (restore) restore.hidden = true;
      });
    }
    showRestoreBanner();

    /* --- sent list --- */
    function fmtDate(iso) {
      try {
        return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
      } catch (e) { return ""; }
    }
    function renderSent() {
      var raw = storeGet(SENT_KEY);
      var list;
      try { list = raw ? JSON.parse(raw) : []; } catch (e) { list = []; }
      if (!list.length || !sentListWrap || !sentListUl) return;
      sentListUl.innerHTML = "";
      list.slice(0, 3).forEach(function (item) {
        var li = document.createElement("li");
        var ref = document.createElement("span");
        ref.className = "mono";
        ref.textContent = item.ref;
        var svc = document.createElement("span");
        svc.className = "sent-service";
        svc.textContent = item.service + (item.date ? " · " + fmtDate(item.date) : "");
        var st = document.createElement("span");
        st.className = "mono";
        st.textContent = "Awaiting our reply";
        li.appendChild(ref); li.appendChild(svc); li.appendChild(st);
        sentListUl.appendChild(li);
      });
      sentListWrap.hidden = false;
    }
    renderSent();

    /* --- submit --- */
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      statusEl.textContent = "";

      var problems = [];
      problems.push(validateService(false));
      ["name", "email", "phone", "postcode", "message"].forEach(function (key) {
        problems.push(validateField(key, false));
      });
      var real = problems.filter(Boolean);

      if (real.length) {
        summary.hidden = false;
        var h = summary.querySelector("h3");
        if (h) h.focus();
        return;
      }

    var n = parseInt(storeGet(REF_KEY) || "40", 10) + 1;
    storeSet(REF_KEY, String(n));
    var ref = "ENQ-2026-" + ("00" + n).slice(-3);

      var record = readForm();
      record.ref = ref;
      record.date = new Date().toISOString();

      var raw = storeGet(SENT_KEY);
      var list;
      try { list = raw ? JSON.parse(raw) : []; } catch (e) { list = []; }
      list.unshift(record);
      list = list.slice(0, 10);
      var ok = storeSet(SENT_KEY, JSON.stringify(list));
      if (!ok) warnIfMemoryOnly();

      storeRemove(DRAFT_KEY);
      if (restore) restore.hidden = true;

      var bits = [record.service];
      var ml = modeLabel();
      if (ml && record.service === "Garden planning session") bits.push(ml);
      var wl = whenLabel();
      if (wl) bits.push(wl);
      var summaryText = bits.join(", ") + ". A reply goes to " + record.email.trim() +
        (record.service === "Garden planning session" && record.mode === "onsite" ? ", and we’ll confirm the 40-mile check against " + record.postcode.trim().toUpperCase() : "") + ".";

      $("#done-ref").textContent = ref;
      $("#done-summary").textContent = summaryText;
      form.hidden = true;
      donePanel.hidden = false;
      if (sentListWrap) sentListWrap.hidden = true;
      var h3 = donePanel.querySelector("h3");
      if (h3) { h3.setAttribute("tabindex", "-1"); h3.focus(); }
    });

    var printBtn = $("#done-print");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });
    var againBtn = $("#done-again");
    if (againBtn) {
      againBtn.addEventListener("click", function () {
        form.reset();
        $("#field-postcode").hidden = true;
        if (counter) { counter.textContent = "1,200 characters left"; counter.classList.remove("is-low"); }
        updatePurposeHint();
        donePanel.hidden = true;
        form.hidden = false;
        renderSent();
        fields.name.focus();
      });
    }

    /* --- Sowing Order prefill --- */
    $$("[data-preset-order]").forEach(function (link) {
      link.addEventListener("click", function () {
        var other = $("#svc-other");
        if (other) other.checked = true;
        if (!fields.message.value) {
          fields.message.value = "I’d like to join the 2027 Sowing Order list (£45 a year). My postcode for posting is ";
        }
        whenSel.value = "later";
        updateCounter();
        updatePurposeHint();
        saveDraft();
        fields.message.focus();
      });
    });
  })();

})();
