/* ============================================================
   LONGSHORE — form.js
   The enquiry flow: specific validation, drafts that survive
   reloads, a real success state, and a copy you can keep.
   Everything stays on the device. No server, no silent loss.
   ============================================================ */
(function () {
  "use strict";

  var LS_DRAFT = "longshore.enquiry.draft.v1";
  var LS_SENT = "longshore.enquiry.sent.v1";

  var PRODUCTS = {
    shingle: { name: "Shingle", price: "£34" },
    saltmarsh: { name: "Saltmarsh", price: "£29" },
    harbour: { name: "Harbour Winter", price: "£26" },
    fog: { name: "Fog Signal", price: "£19" },
    bundle: { name: "The Whole Coast", price: "£96" },
    tidewalker: { name: "Tidewalker", price: "£7/mo" },
  };

  var form = document.getElementById("enquiryForm");
  var successPanel = document.getElementById("formSuccess");
  if (!form || !successPanel) return;

  var F = {
    name: document.getElementById("fName"),
    email: document.getElementById("fEmail"),
    org: document.getElementById("fOrg"),
    type: document.getElementById("fType"),
    team: document.getElementById("fTeam"),
    details: document.getElementById("fDetails"),
    consent: document.getElementById("fConsent"),
    hp: document.getElementById("fWebsite"),
  };
  var E = {
    name: document.getElementById("fNameErr"),
    email: document.getElementById("fEmailErr"),
    type: document.getElementById("fTypeErr"),
    details: document.getElementById("fDetailsErr"),
    consent: document.getElementById("fConsentErr"),
  };
  var summary = document.getElementById("errorSummary");
  var submitBtn = document.getElementById("formSubmit");
  var draftBanner = document.getElementById("draftBanner");
  var draftBannerText = document.getElementById("draftBannerText");
  var chip = document.getElementById("orderChip");
  var chipText = document.getElementById("orderChipText");
  var charCount = document.getElementById("charCount");

  var lastPrefill = "";
  var sentPayload = null;
  var announceEl = null;

  function announce(msg) {
    if (!announceEl) {
      announceEl = document.createElement("div");
      announceEl.className = "visually-hidden";
      announceEl.setAttribute("aria-live", "polite");
      document.body.appendChild(announceEl);
    }
    announceEl.textContent = msg;
  }

  /* ---------------------------------------------------- storage */
  function storeGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function storeSet(key, val) {
    try { window.localStorage.setItem(key, val); return true; } catch (e) { return false; }
  }
  function storeRemove(key) {
    try { window.localStorage.removeItem(key); } catch (e) { /* fine */ }
  }

  /* ---------------------------------------------------- validation */
  function valName(v) {
    if (!v || !v.trim()) return "We need a name for the licence PDF. Even a first name will do.";
    if (v.trim().length < 2) return "One more letter — a single initial won’t survive an invoice.";
    return "";
  }

  function valEmail(v) {
    if (!v || !v.trim()) return "An email is how the download link arrives — we can’t send it without one.";
    var t = v.trim();
    if (t.length > 120) return "That’s longer than any email we’ve ever seen. Trim it and try again.";
    var at = t.indexOf("@");
    if (at < 0) return "That address has no @ in it — one small typo, and everything after it never arrives.";
    if (at !== t.lastIndexOf("@")) return "Two @s is one too many — an address only carries one.";
    var domain = t.slice(at + 1);
    if (!domain || domain.indexOf(".") < 0)
      return "The bit after the @ looks cut short — did the “.co” or “.com” fall off?";
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(t))
      return "That doesn’t read like an email address. Check it once — it’s the only address we’ll ever write to.";
    return "";
  }

  function valType(v) {
    if (!v) return "Pick the closest fit — and if none of them fit, “Something else” exists for exactly that.";
    return "";
  }

  function valDetails(v) {
    if (!v || !v.trim()) return "Tell us a little more — even twenty characters is plenty. “Sound for a harbour scene in a point-and-click” would be perfect.";
    if (v.trim().length < 20)
      return "That’s a start — but " + v.trim().length + " characters won’t tell us much. One more sentence about the project does it.";
    return "";
  }

  function valConsent(v) {
    if (!v) return "We need permission to reply by email. That’s all this tick means — no list, no newsletter.";
    return "";
  }

  var RULES = [
    { field: "name", el: F.name, err: E.name, fn: valName },
    { field: "email", el: F.email, err: E.email, fn: valEmail },
    { field: "type", el: F.type, err: E.type, fn: valType },
    { field: "details", el: F.details, err: E.details, fn: valDetails },
    { field: "consent", el: F.consent, err: E.consent, fn: valConsent },
  ];

  function showFieldError(rule, msg) {
    if (rule.err) {
      rule.err.textContent = msg;
      rule.err.hidden = !msg;
    }
    if (rule.el) {
      if (msg) rule.el.setAttribute("aria-invalid", "true");
      else rule.el.removeAttribute("aria-invalid");
    }
  }

  function validateOne(rule) {
    var v = rule.el.type === "checkbox" ? rule.el.checked : rule.el.value;
    var msg = rule.fn(v);
    showFieldError(rule, msg);
    return !msg;
  }

  function validateAll() {
    var bad = [];
    RULES.forEach(function (rule) {
      var ok = validateOne(rule);
      if (!ok) bad.push(rule);
    });
    return bad;
  }

  function clearSummary() {
    summary.hidden = true;
    summary.innerHTML = "";
  }

  function showSummary(bad) {
    var n = bad.length;
    var head = n === 1
      ? "One thing needs another look:"
      : n + " things need another look:";
    var html = "<p>" + head + "</p><ul>";
    bad.forEach(function (rule) {
      html += "<li><a href=\"#" + rule.el.id + "\">" + rule.err.textContent + "</a></li>";
    });
    html += "</ul>";
    summary.innerHTML = html;
    summary.hidden = false;
  }

  RULES.forEach(function (rule) {
    var evt = rule.el.type === "checkbox" || rule.el.tagName === "SELECT" ? "change" : "blur";
    rule.el.addEventListener(evt, function () { validateOne(rule); });
    rule.el.addEventListener("input", function () {
      if (rule.el.getAttribute("aria-invalid") === "true") validateOne(rule);
    });
  });

  /* ---------------------------------------------------- drafts */
  function collectDraft() {
    return {
      v: 1,
      t: Date.now(),
      name: F.name.value,
      email: F.email.value,
      org: F.org.value,
      type: F.type.value,
      team: F.team.value,
      details: F.details.value,
      consent: F.consent.checked,
    };
  }

  function draftIsEmpty(d) {
    return !d || (!d.name && !d.email && !d.org && !d.type && !d.team && !d.details && !d.consent);
  }

  var saveTimer = null;
  var warnedStorage = false;
  function saveDraft() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var ok = storeSet(LS_DRAFT, JSON.stringify(collectDraft()));
      if (!ok && !warnedStorage) {
        warnedStorage = true;
        var note = document.createElement("p");
        note.className = "field-help";
        note.style.color = "var(--rust-800)";
        note.textContent =
          "We couldn’t keep a draft on this device — storage is full or blocked. " +
          "The form still works; just don’t reload mid-sentence.";
        form.querySelector(".form-actions").appendChild(note);
      }
    }, 350);
  }

  form.addEventListener("input", saveDraft);
  form.addEventListener("change", saveDraft);

  function fillForm(d) {
    F.name.value = d.name || "";
    F.email.value = d.email || "";
    F.org.value = d.org || "";
    F.type.value = d.type || "";
    F.team.value = d.team || "";
    F.details.value = d.details || "";
    F.consent.checked = !!d.consent;
    RULES.forEach(function (r) { showFieldError(r, ""); });
  }

  function maybeShowDraftBanner() {
    var raw = storeGet(LS_DRAFT);
    if (!raw) return;
    var d = null;
    try { d = JSON.parse(raw); } catch (e) { storeRemove(LS_DRAFT); return; }
    if (draftIsEmpty(d)) return;
    var when = new Date(d.t || Date.now());
    var hm = when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    draftBannerText.textContent =
      "An unsent draft from " + hm + " is saved on this device — nothing has been sent yet.";
    draftBanner.hidden = false;
  }

  document.getElementById("draftRestore").addEventListener("click", function () {
    var raw = storeGet(LS_DRAFT);
    if (!raw) { draftBanner.hidden = true; return; }
    try { fillForm(JSON.parse(raw)); } catch (e) { /* leave as-is */ }
    draftBanner.hidden = true;
    announce("Draft restored.");
    F.name.focus();
  });

  document.getElementById("draftDiscard").addEventListener("click", function () {
    storeRemove(LS_DRAFT);
    draftBanner.hidden = true;
    announce("Draft discarded.");
  });

  /* ---------------------------------------------------- char count */
  if (F.details && charCount) {
    var updateCount = function () {
      var n = F.details.value.length;
      charCount.textContent = n > 1600 ? n + " / 2000" : "";
    };
    F.details.addEventListener("input", updateCount);
    updateCount();
  }

  /* ---------------------------------------------------- submit */
  function payloadFromForm() {
    return {
      name: F.name.value.trim(),
      email: F.email.value.trim(),
      org: F.org.value.trim(),
      type: F.type.value,
      typeName: F.type.options[F.type.selectedIndex] ? F.type.options[F.type.selectedIndex].text : "",
      team: F.team.value,
      details: F.details.value.trim(),
      consent: F.consent.checked,
      spam: !!(F.hp && F.hp.value),
    };
  }

  function makeRef() {
    return "LS-2026-" + (1000 + Math.floor(Math.random() * 9000));
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearSummary();
    var bad = validateAll();
    if (bad.length) {
      showSummary(bad);
      announce(bad.length === 1 ? "One field needs attention." : bad.length + " fields need attention.");
      bad[0].el.focus();
      return;
    }
    var payload = payloadFromForm();
    payload.ref = makeRef();
    payload.at = new Date().toISOString();

    submitBtn.setAttribute("aria-busy", "true");
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    /* the enquiry is processed locally; the pause is for the tide */
    setTimeout(function () {
      submitBtn.removeAttribute("aria-busy");
      submitBtn.disabled = false;
      submitBtn.textContent = "Send the enquiry";

      if (!payload.spam) {
        storeSet(LS_SENT, JSON.stringify(payload));
        storeRemove(LS_DRAFT);
        sentPayload = payload;
        renderSuccess(payload);
      } else {
        /* honeypot tripped: pretend all is well, keep nothing */
        sentPayload = null;
        renderSuccess(payload);
      }
    }, 900);
  });

  /* ---------------------------------------------------- success */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderSuccess(p) {
    form.hidden = true;
    draftBanner.hidden = true;
    chip.hidden = true;
    document.getElementById("successRef").textContent = p.ref;
    var rows = [
      ["Name", p.name],
      ["Email", p.email],
      ["Organisation", p.org || "—"],
      ["About", p.typeName || p.type || "—"],
      ["Team", p.team || "—"],
      ["Details", p.details],
    ];
    var html = "<dl>";
    rows.forEach(function (r) {
      html += "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>";
    });
    html += "</dl>";
    document.getElementById("successSummary").innerHTML = html;
    successPanel.hidden = false;
    var title = document.getElementById("successTitle");
    if (title) title.focus();
    announce("Enquiry sent. Your reference is " + p.ref + ".");
  }

  document.getElementById("startAnother").addEventListener("click", function () {
    storeRemove(LS_SENT);
    sentPayload = null;
    successPanel.hidden = true;
    form.hidden = false;
    form.reset();
    lastPrefill = "";
    RULES.forEach(function (r) { showFieldError(r, ""); });
    clearSummary();
    if (charCount) charCount.textContent = "";
    F.name.focus();
  });

  document.getElementById("downloadCopy").addEventListener("click", function () {
    if (!sentPayload) return;
    var p = sentPayload;
    var when = new Date(p.at);
    var text =
      "LONGSHORE ENQUIRY — " + p.ref + "\n" +
      "Sent " + when.toLocaleString("en-GB") + "\n\n" +
      "NAME        " + p.name + "\n" +
      "EMAIL       " + p.email + "\n" +
      "ORGANISATION " + (p.org || "—") + "\n" +
      "ABOUT       " + (p.typeName || p.type) + "\n" +
      "TEAM        " + (p.team || "—") + "\n\n" +
      "DETAILS\n" + p.details + "\n\n" +
      "Generated by the Longshore enquiry form. Kept on your device only —\n" +
      "nothing was transmitted anywhere.\n";
    try {
      var blob = new Blob([text], { type: "text/plain" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "longshore-enquiry-" + p.ref + ".txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      announce("Copy downloaded.");
    } catch (e) {
      announce("The download didn’t start — your browser blocked it. The reference is " + p.ref + ".");
    }
  });

  /* ---------------------------------------------------- order API */
  function order(id) {
    var p = PRODUCTS[id];
    if (!p) return;
    F.type.value = "order";
    var current = F.details.value;
    if (!current.trim() || current.trim() === lastPrefill.trim()) {
      lastPrefill = "I’d like to license " + p.name + " (" + p.price + ") for commercial use. ";
      F.details.value = lastPrefill;
    }
    chipText.textContent = "Ordering: " + p.name + " — " + p.price + ". The form is ready below.";
    chip.hidden = false;
    RULES.forEach(function (r) { showFieldError(r, ""); });
    announce("The enquiry form is prepared for " + p.name + ".");
    var target = document.getElementById("enquiry");
    if (target && target.scrollIntoView) {
      target.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
    }
    setTimeout(function () { F.name.focus({ preventScroll: true }); }, reduceMotion() ? 0 : 650);
  }

  function reduceMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  var chipDismiss = document.getElementById("orderChipDismiss");
  if (chipDismiss) {
    chipDismiss.addEventListener("click", function () {
      chip.hidden = true;
      announce("Order selection cleared.");
    });
  }

  /* ---------------------------------------------------- boot */
  function boot() {
    var raw = storeGet(LS_SENT);
    if (raw) {
      try {
        var p = JSON.parse(raw);
        if (p && p.ref) {
          sentPayload = p;
          renderSuccess(p);
          return;
        }
      } catch (e) { storeRemove(LS_SENT); }
    }
    maybeShowDraftBanner();
  }
  boot();

  window.LongshoreForm = { order: order };
})();
