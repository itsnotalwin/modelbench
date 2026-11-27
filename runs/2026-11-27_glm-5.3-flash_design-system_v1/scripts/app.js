/* ============================================================
   LOAM DESIGN SYSTEM — interactions
   Minimal vanilla JS. No frameworks, no dependencies.
   Each module guards its own absence so sections can be removed.
   ============================================================ */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ----------------------------------------------------------
     Toasts
     ---------------------------------------------------------- */
  var TOAST_ICONS = {
    success: "i-check-circle",
    info: "i-info",
    warning: "i-warning",
    danger: "i-alert"
  };

  function showToast(type, title, msg) {
    var stack = $("#toast-stack");
    if (!stack) return;
    type = TOAST_ICONS[type] ? type : "info";

    var el = document.createElement("div");
    el.className = "toast toast--" + type;
    el.setAttribute("role", "status");

    var icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "icon icon--lg toast__icon");
    icon.setAttribute("aria-hidden", "true");
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#" + TOAST_ICONS[type]);
    icon.appendChild(use);

    var body = document.createElement("div");
    var t = document.createElement("p");
    t.className = "toast__title";
    t.textContent = title;
    body.appendChild(t);
    if (msg) {
      var m = document.createElement("p");
      m.className = "toast__msg";
      m.textContent = msg;
      body.appendChild(m);
    }

    var close = document.createElement("button");
    close.type = "button";
    close.className = "toast__close";
    close.setAttribute("aria-label", "Dismiss notification");
    var cIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    cIcon.setAttribute("class", "icon");
    cIcon.setAttribute("aria-hidden", "true");
    var cUse = document.createElementNS("http://www.w3.org/2000/svg", "use");
    cUse.setAttribute("href", "#i-close");
    cIcon.appendChild(cUse);
    close.appendChild(cIcon);
    close.addEventListener("click", function () { dismiss(); });

    el.appendChild(icon);
    el.appendChild(body);
    el.appendChild(close);
    stack.appendChild(el);

    function dismiss() {
      if (el.classList.contains("is-leaving")) return;
      el.classList.add("is-leaving");
      window.setTimeout(function () { el.remove(); }, 220);
    }
    window.setTimeout(dismiss, 4800);
  }

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-toast]");
    if (!trigger) return;
    showToast(
      trigger.getAttribute("data-toast-type") || "info",
      trigger.getAttribute("data-toast-title") || "Done",
      trigger.getAttribute("data-toast-msg") || ""
    );
  });

  /* ----------------------------------------------------------
     Dialogs
     ---------------------------------------------------------- */
  $$("[data-open-dialog]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var dlg = document.getElementById(btn.getAttribute("data-open-dialog"));
      if (dlg && typeof dlg.showModal === "function") dlg.showModal();
    });
  });
  $$("[data-close-dialog]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var dlg = btn.closest("dialog");
      if (dlg) dlg.close();
    });
  });
  /* Click on the backdrop area (the dialog element itself) closes. */
  $$("dialog.dialog").forEach(function (dlg) {
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) dlg.close();
    });
  });

  /* ----------------------------------------------------------
     Mobile navigation
     ---------------------------------------------------------- */
  var navToggle = $("[data-nav-toggle]");
  if (navToggle) {
    navToggle.addEventListener("click", function () {
      document.body.classList.toggle("nav-open");
      if (document.body.classList.contains("nav-open")) {
        var first = $(".sidebar__nav .nav-link");
        if (first) first.focus();
      }
    });
  }
  var backdrop = $(".backdrop");
  if (backdrop) {
    backdrop.addEventListener("click", function () {
      document.body.classList.remove("nav-open");
    });
  }
  function closeMobileNav() {
    document.body.classList.remove("nav-open");
    if (navToggle) navToggle.focus();
  }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (document.querySelector("dialog[open]")) return;
    if (document.body.classList.contains("nav-open")) closeMobileNav();
  });

  /* ----------------------------------------------------------
     Sidebar section filter (topbar search)
     ---------------------------------------------------------- */
  var navSearch = $("#nav-search");
  if (navSearch) {
    var navLinks = $$(".sidebar__nav .nav-link");
    var groups = $$(".sidebar__nav .nav-group");
    var navEmpty = $("#nav-empty");

    navSearch.addEventListener("input", function () {
      var q = navSearch.value.trim().toLowerCase();
      var total = 0;
      navLinks.forEach(function (link) {
        var hit = !q || link.textContent.toLowerCase().indexOf(q) !== -1;
        link.hidden = !hit;
        if (hit) total++;
      });
      groups.forEach(function (group) {
        var visible = $$(".nav-link", group).filter(function (l) { return !l.hidden; });
        group.hidden = visible.length === 0;
      });
      if (navEmpty) navEmpty.hidden = total !== 0;
      /* On small screens, surface the sidebar when the user starts filtering. */
      if (q && window.matchMedia("(max-width: 1080px)").matches) {
        document.body.classList.add("nav-open");
      }
    });
    navSearch.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navSearch.value) {
        navSearch.value = "";
        navSearch.dispatchEvent(new Event("input"));
      }
    });
  }

  /* ----------------------------------------------------------
     Scrollspy — highlight active section in the sidebar
     ---------------------------------------------------------- */
  (function () {
    var spied = $$("[data-spy]");
    var links = $$(".sidebar__nav .nav-link");
    if (!spied.length || !("IntersectionObserver" in window)) return;

    function setCurrent(id) {
      links.forEach(function (link) {
        if (link.getAttribute("href") === "#" + id) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      });
    }, { rootMargin: "-90px 0px -62% 0px", threshold: 0 });

    spied.forEach(function (sec) { observer.observe(sec); });
  })();

  /* ----------------------------------------------------------
     Smooth-scroll buttons (topbar "New survey", alert actions…)
     ---------------------------------------------------------- */
  $$("[data-scroll-to]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = document.getElementById(btn.getAttribute("data-scroll-to").replace(/^#/, ""));
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (btn.hasAttribute("data-focus-first")) {
        window.setTimeout(function () {
          var input = target.querySelector("input, select, textarea");
          if (input) input.focus({ preventScroll: true });
        }, 450);
      }
    });
  });

  /* ----------------------------------------------------------
     Dismissible alerts
     ---------------------------------------------------------- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-dismiss-alert]");
    if (!btn) return;
    var alert = btn.closest(".alert");
    if (alert) alert.remove();
  });

  /* ----------------------------------------------------------
     Loading-state demo button
     ---------------------------------------------------------- */
  $$("[data-loading-demo]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.classList.contains("is-loading")) return;
      btn.classList.add("is-loading");
      btn.setAttribute("aria-busy", "true");
      window.setTimeout(function () {
        btn.classList.remove("is-loading");
        btn.removeAttribute("aria-busy");
        showToast("success", "Sync complete", "12 records are up to date.");
      }, 1500);
    });
  });

  /* ----------------------------------------------------------
     Tabs (with keyboard support)
     ---------------------------------------------------------- */
  $$("[data-tabs]").forEach(function (wrap) {
    var tabs = $$('[role="tab"]', wrap);
    if (!tabs.length) return;

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute("aria-selected", selected ? "true" : "false");
        t.tabIndex = selected ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !selected;
      });
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        switch (e.key) {
          case "ArrowRight": next = tabs[(i + 1) % tabs.length]; break;
          case "ArrowLeft": next = tabs[(i - 1 + tabs.length) % tabs.length]; break;
          case "Home": next = tabs[0]; break;
          case "End": next = tabs[tabs.length - 1]; break;
          default: return;
        }
        e.preventDefault();
        select(next, true);
      });
    });
  });

  /* ----------------------------------------------------------
     Generic sortable tables (data-sortable, no pagination)
     ---------------------------------------------------------- */
  $$("table[data-sortable]").forEach(function (table) {
    if (table.id === "records-table") return; /* handled below with paging */
    var tbody = table.tBodies[0];
    if (!tbody) return;

    $$("button[data-sort-key]", table).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var th = btn.closest("th");
        var dir = th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending";
        $$("th[aria-sort]", table).forEach(function (other) { other.removeAttribute("aria-sort"); });
        th.setAttribute("aria-sort", dir);

        var key = btn.getAttribute("data-sort-key");
        var numeric = btn.getAttribute("data-sort-type") === "num";
        var rows = $$("tr", tbody);
        rows.sort(function (a, b) {
          var av = a.dataset[key] !== undefined ? a.dataset[key] : a.textContent;
          var bv = b.dataset[key] !== undefined ? b.dataset[key] : b.textContent;
          if (numeric) {
            var an = parseFloat(av), bn = parseFloat(bv);
            an = isNaN(an) ? -Infinity : an;
            bn = isNaN(bn) ? -Infinity : bn;
            return dir === "ascending" ? an - bn : bn - an;
          }
          return dir === "ascending"
            ? String(av).localeCompare(String(bv))
            : String(bv).localeCompare(String(av));
        });
        rows.forEach(function (row) { tbody.appendChild(row); });
      });
    });
  });

  /* ----------------------------------------------------------
     Records table — sort + filter + pagination + selection
     ---------------------------------------------------------- */
  (function () {
    var table = $("#records-table");
    if (!table) return;
    var tbody = table.tBodies[0];
    var allRows = $$("tr[data-record]", tbody);
    var filterInput = $("#records-filter");
    var meta = $("#records-meta");
    var pageList = $("#records-pages");
    var prevBtn = $("[data-page-prev]");
    var nextBtn = $("[data-page-next]");
    var emptyRow = $("#records-empty");
    var selectAll = $("#select-all");
    var toolbar = $("#selection-toolbar");
    var countEl = $("#selection-count");
    var perPage = 6;
    var state = { page: 1, filter: "", sortKey: null, sortDir: "ascending" };

    function sortedRows() {
      if (!state.sortKey) return allRows.slice();
      var numeric = state.sortType === "num";
      return allRows.slice().sort(function (a, b) {
        var av = a.dataset[state.sortKey] || "";
        var bv = b.dataset[state.sortKey] || "";
        if (numeric) {
          var an = parseFloat(av), bn = parseFloat(bv);
          an = isNaN(an) ? -Infinity : an;
          bn = isNaN(bn) ? -Infinity : bn;
          return state.sortDir === "ascending" ? an - bn : bn - an;
        }
        return state.sortDir === "ascending"
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      });
    }

    function render() {
      var rows = sortedRows();
      var visible = rows.filter(function (row) {
        return !state.filter || row.textContent.toLowerCase().indexOf(state.filter) !== -1;
      });

      var pages = Math.max(1, Math.ceil(visible.length / perPage));
      if (state.page > pages) state.page = pages;

      allRows.forEach(function (row) { row.hidden = true; });
      var start = (state.page - 1) * perPage;
      var slice = visible.slice(start, start + perPage);
      rows.forEach(function (row) { tbody.appendChild(row); });
      slice.forEach(function (row) { row.hidden = false; });

      /* Meta text */
      if (visible.length === 0) {
        meta.textContent = state.filter ? "No records match \u201C" + state.filter + "\u201D" : "No records";
      } else {
        meta.textContent = "Showing " + (start + 1) + "\u2013" + (start + slice.length) + " of " + visible.length + " records";
      }
      if (emptyRow) emptyRow.hidden = visible.length !== 0;

      /* Pager */
      pageList.innerHTML = "";
      for (var p = 1; p <= pages; p++) {
        (function (p) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "page-btn";
          b.textContent = String(p);
          b.setAttribute("aria-label", "Page " + p);
          if (p === state.page) b.setAttribute("aria-current", "page");
          b.addEventListener("click", function () { state.page = p; render(); });
          pageList.appendChild(b);
        })(p);
      }
      prevBtn.disabled = state.page <= 1;
      nextBtn.disabled = state.page >= pages;

      syncSelection();
    }

    /* Sorting */
    $$("button[data-sort-key]", table).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var th = btn.closest("th");
        if (state.sortKey === btn.getAttribute("data-sort-key")) {
          state.sortDir = state.sortDir === "ascending" ? "descending" : "ascending";
        } else {
          state.sortKey = btn.getAttribute("data-sort-key");
          state.sortType = btn.getAttribute("data-sort-type");
          state.sortDir = "ascending";
        }
        $$("th[aria-sort]", table).forEach(function (other) { other.removeAttribute("aria-sort"); });
        th.setAttribute("aria-sort", state.sortDir);
        render();
      });
    });

    /* Filter */
    if (filterInput) {
      filterInput.addEventListener("input", function () {
        state.filter = filterInput.value.trim().toLowerCase();
        state.page = 1;
        render();
      });
    }
    $$("[data-clear-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (filterInput) {
          filterInput.value = "";
          filterInput.dispatchEvent(new Event("input"));
          filterInput.focus();
        }
      });
    });

    /* Pagination buttons */
    if (prevBtn) prevBtn.addEventListener("click", function () { state.page--; render(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { state.page++; render(); });

    /* Selection */
    function checkedRows() { return allRows.filter(function (r) { return $(".row-check", r).checked; }); }
    function syncSelection() {
      var visible = allRows.filter(function (r) { return !r.hidden; });
      var checked = checkedRows();
      var visibleChecked = visible.filter(function (r) { return $(".row-check", r).checked; }).length;
      if (selectAll) {
        selectAll.checked = visible.length > 0 && visibleChecked === visible.length;
        selectAll.indeterminate = visibleChecked > 0 && visibleChecked < visible.length;
      }
      if (countEl) countEl.textContent = checked.length + (checked.length === 1 ? " record selected" : " records selected");
      if (toolbar) toolbar.hidden = checked.length === 0;
    }
    if (selectAll) {
      selectAll.addEventListener("change", function () {
        allRows.forEach(function (r) {
          if (!r.hidden) $(".row-check", r).checked = selectAll.checked;
        });
        render();
      });
    }
    tbody.addEventListener("change", function (e) {
      if (e.target.classList.contains("row-check")) render();
    });

    /* Bulk actions */
    $$("[data-bulk-flag]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var rows = checkedRows();
        rows.forEach(function (r) { setStatus(r, "Flagged"); });
        showToast("warning", "Records flagged", rows.length + " record" + (rows.length === 1 ? "" : "s") + " marked for review.");
        allRows.forEach(function (r) { $(".row-check", r).checked = false; });
        render();
      });
    });
    $$("[data-bulk-clear]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        allRows.forEach(function (r) { $(".row-check", r).checked = false; });
        render();
      });
    });

    function setStatus(row, status) {
      row.dataset.status = status;
      var badge = $(".js-status", row);
      if (!badge) return;
      var map = {
        "Verified": "badge--success",
        "In review": "badge--info",
        "Flagged": "badge--danger",
        "Draft": "badge--neutral"
      };
      badge.className = "badge js-status " + (map[status] || "badge--neutral");
      badge.textContent = "";
      var dot = document.createElement("span");
      dot.className = "badge__dot";
      badge.appendChild(dot);
      badge.appendChild(document.createTextNode(status));
    }

    /* Row detail dialog */
    var recordDialog = $("#record-dialog");
    $$("[data-view-record]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var row = btn.closest("tr[data-record]");
        if (!row || !recordDialog) return;
        var d = row.dataset;
        $("#rd-title").textContent = "Record " + d.id;
        $("#rd-site").textContent = d.site || "Kestrel Creek";
        $("#rd-plot").textContent = d.plot;
        $("#rd-type").textContent = d.type;
        $("#rd-surveyor").textContent = d.surveyor;
        $("#rd-date").textContent = d.date;
        $("#rd-cover").textContent = d.cover ? d.cover + "%" : "\u2014";
        $("#rd-note").textContent = d.note || "No notes recorded.";
        var badge = $("#rd-status");
        var map = {
          "Verified": "badge--success",
          "In review": "badge--info",
          "Flagged": "badge--danger",
          "Draft": "badge--neutral"
        };
        badge.className = "badge " + (map[d.status] || "badge--neutral");
        badge.textContent = d.status;
        $("#rd-flag").setAttribute("data-flag-row", d.id);
        recordDialog.showModal();
      });
    });
    var flagBtn = $("#rd-flag");
    if (flagBtn) {
      flagBtn.addEventListener("click", function () {
        var id = flagBtn.getAttribute("data-flag-row");
        var row = allRows.filter(function (r) { return r.dataset.id === id; })[0];
        if (row) {
          setStatus(row, "Flagged");
          showToast("warning", "Record flagged", id + " was marked for crew review.");
        }
        if (recordDialog) recordDialog.close();
      });
    }

    render();
  })();

  /* Demo: force the table's empty state ("Try it live" button) */
  $$("[data-demo-empty]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var input = $("#records-filter");
      if (!input) return;
      input.value = "zzzz";
      input.dispatchEvent(new Event("input"));
      var card = $("#records-table");
      if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  /* ----------------------------------------------------------
     Export dialog
     ---------------------------------------------------------- */
  var exportForm = $("#export-form");
  if (exportForm) {
    var range = $("#ex-range");
    var count = $("#ex-count");
    var COUNTS = { "season": "12", "last30": "9", "all": "148" };
    if (range && count) {
      range.addEventListener("change", function () {
        count.textContent = COUNTS[range.value] || "12";
      });
    }
    exportForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var format = $("#ex-format");
      showToast(
        "success",
        "Export queued",
        COUNTS[range.value] + " records will be prepared as " + (format ? format.value : "CSV") + " and emailed to maya@loam.example."
      );
      var dlg = exportForm.closest("dialog");
      if (dlg) dlg.close();
      exportForm.reset();
      if (count) count.textContent = COUNTS[range.value] || "12";
    });
  }

  /* ----------------------------------------------------------
     Survey form pattern — validation
     ---------------------------------------------------------- */
  var surveyForm = $("#survey-form");
  if (surveyForm) {
    var successAlert = $("#form-success");
    var successSummary = $("#form-success-summary");

    function setError(id, show) {
      var input = document.getElementById(id);
      var err = document.getElementById("err-" + id.replace(/^f-/, ""));
      var field = input ? input.closest(".field, fieldset.fieldset") : null;
      if (!input || !err) return;
      err.hidden = !show;
      if (field) field.classList.toggle("field--invalid", show);
      if (input.classList.contains("radio-card__input")) {
        var fs = input.closest("fieldset");
        if (fs) fs.classList.toggle("field--invalid", show);
        if (!show) {
          err.hidden = true;
        }
      } else {
        if (show) input.setAttribute("aria-invalid", "true");
        else input.removeAttribute("aria-invalid");
      }
    }

    var radioGroup = surveyForm.querySelector('input[name="stype"]');

    function validate() {
      var firstInvalid = null;
      function mark(id, ok) {
        setError(id, !ok);
        if (!ok && !firstInvalid) firstInvalid = document.getElementById(id);
        return ok;
      }
      var site = $("#f-site");
      mark("f-site", site.value !== "");

      var typeOk = !!surveyForm.querySelector('input[name="stype"]:checked');
      var firstRadio = surveyForm.querySelector('input[name="stype"]');
      if (firstRadio) {
        setError("f-type", !typeOk);
        if (!typeOk && !firstInvalid) {
          firstInvalid = firstRadio;
          var typeField = $("#f-type");
          if (typeField) typeField.classList.add("field--invalid");
        }
      }

      var date = $("#f-date");
      mark("f-date", date.value !== "");
      var plot = $("#f-plot");
      mark("f-plot", /^[A-Za-z]-\d{2}$/.test(plot.value.trim()));
      var cover = $("#f-cover");
      var coverVal = parseFloat(cover.value);
      mark("f-cover", cover.value !== "" && !isNaN(coverVal) && coverVal >= 0 && coverVal <= 100);
      return firstInvalid;
    }

    /* Clear errors as the user fixes fields */
    ["f-site", "f-date", "f-plot", "f-cover"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", function () {
        var field = el.closest(".field");
        if (field && field.classList.contains("field--invalid")) validate();
      });
      if (el) el.addEventListener("change", function () {
        var field = el.closest(".field");
        if (field && field.classList.contains("field--invalid")) validate();
      });
    });
    $$('input[name="stype"]', surveyForm).forEach(function (r) {
      r.addEventListener("change", function () {
        setError("f-type", false);
        var field = $("#f-type");
        if (field) field.classList.remove("field--invalid");
      });
    });

    surveyForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstInvalid = validate();
      if (firstInvalid) {
        firstInvalid.focus();
        showToast("warning", "Check the form", "Some fields need attention before this record can be saved.");
        return;
      }
      var site = $("#f-site");
      var typeName = surveyForm.querySelector('input[name="stype"]:checked');
      var siteLabel = site.options[site.selectedIndex] ? site.options[site.selectedIndex].textContent : "site";
      var typeLabel = typeName ? typeName.closest(".radio-card").querySelector(".radio-card__title").textContent.trim() : "survey";
      var plotVal = $("#f-plot").value.trim().toUpperCase();
      var dateVal = $("#f-date").value;
      /* Reset first: the reset listener hides the success alert, so the alert
         must be revealed afterwards to stay visible. */
      surveyForm.reset();
      syncRadioCards();
      successSummary.textContent = typeLabel + " record for " + siteLabel +
        " (plot " + plotVal + ", " + dateVal + ") was saved as a draft.";
      successAlert.hidden = false;
      successAlert.scrollIntoView({ behavior: "smooth", block: "center" });
      showToast("success", "Draft saved", "Survey record added to " + siteLabel + " \u00B7 Season 3.");
    });

    surveyForm.addEventListener("reset", function () {
      ["f-site", "f-date", "f-plot", "f-cover"].forEach(function (id) { setError(id, false); });
      setError("f-type", false);
      var typeField = $("#f-type");
      if (typeField) typeField.classList.remove("field--invalid");
      if (successAlert) successAlert.hidden = true;
      window.setTimeout(syncRadioCards, 0);
    });

    $$("[data-form-again]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (successAlert) successAlert.hidden = true;
        $("#f-site").focus();
      });
    });
  }

  /* ----------------------------------------------------------
     Radio cards — .is-selected fallback for older browsers
     ---------------------------------------------------------- */
  function syncRadioCards() {
    $$(".radio-card").forEach(function (card) {
      var input = card.querySelector(".radio-card__input");
      card.classList.toggle("is-selected", !!(input && input.checked));
    });
  }
  syncRadioCards();
  document.addEventListener("change", function (e) {
    if (e.target.classList.contains("radio-card__input")) {
      $$('input[name="' + e.target.name + '"]').forEach(function (r) {
        var card = r.closest(".radio-card");
        if (card) card.classList.toggle("is-selected", r.checked);
      });
    }
  });

  /* ----------------------------------------------------------
     Indeterminate checkbox demo
     ---------------------------------------------------------- */
  (function () {
    var parent = $("#plots-all");
    if (!parent) return;
    var children = $$(".plot-check");
    function sync() {
      var checked = children.filter(function (c) { return c.checked; }).length;
      parent.checked = checked === children.length;
      parent.indeterminate = checked > 0 && checked < children.length;
    }
    parent.addEventListener("change", function () {
      children.forEach(function (c) { c.checked = parent.checked; });
      sync();
    });
    children.forEach(function (c) { c.addEventListener("change", sync); });
    sync();
  })();

  /* ----------------------------------------------------------
     Pagination specimen (self-contained demo)
     ---------------------------------------------------------- */
  (function () {
    var wrap = $("#pager-demo");
    if (!wrap) return;
    var buttons = $$(".page-btn[data-page]", wrap);
    var meta = $("#pager-demo-meta");
    var prev = $("[data-pager-prev]", wrap);
    var next = $("[data-pager-next]", wrap);
    var page = 2, pages = buttons.length;

    function render() {
      buttons.forEach(function (b) {
        if (parseInt(b.getAttribute("data-page"), 10) === page) {
          b.setAttribute("aria-current", "page");
        } else {
          b.removeAttribute("aria-current");
        }
      });
      meta.textContent = "Page " + page + " of " + pages;
      prev.disabled = page <= 1;
      next.disabled = page >= pages;
    }
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        page = parseInt(b.getAttribute("data-page"), 10);
        render();
      });
    });
    prev.addEventListener("click", function () { if (page > 1) { page--; render(); } });
    next.addEventListener("click", function () { if (page < pages) { page++; render(); } });
    render();
  })();

  /* ----------------------------------------------------------
     Removable chips
     ---------------------------------------------------------- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-chip-remove]");
    if (!btn) return;
    var chip = btn.closest(".chip");
    if (chip) chip.remove();
  });

  /* ----------------------------------------------------------
     Live viewport width (breakpoints section)
     ---------------------------------------------------------- */
  (function () {
    var el = $("#vp-live");
    if (!el) return;
    function update() {
      var w = window.innerWidth;
      var name = w >= 1440 ? "xl" : w >= 1080 ? "lg" : w >= 768 ? "md" : w >= 480 ? "sm" : "xs";
      el.textContent = w + " px \u00B7 " + name;
    }
    window.addEventListener("resize", update);
    update();
  })();
})();
