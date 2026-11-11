/* ============================================================
   LONGSHORE — app.js
   Chrome, reveals, counters, the tide toy, dialogs, keys.
   ============================================================ */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  /* -------------------------------------------------- header */
  ready(function () {
    var header = document.getElementById("siteHeader");
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  });

  /* -------------------------------------------------- mobile nav */
  ready(function () {
    var toggle = document.getElementById("navToggle");
    var nav = document.getElementById("siteNav");
    if (!toggle || !nav) return;
    var setOpen = function (open) {
      nav.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      var label = toggle.querySelector(".visually-hidden");
      if (label) label.textContent = open ? "Close the menu" : "Open the menu";
    };
    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("nav-open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("nav-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) setOpen(false);
    });
  });

  /* -------------------------------------------------- active section */
  ready(function () {
    var links = Array.prototype.slice.call(document.querySelectorAll("[data-nav]"));
    var map = {};
    links.forEach(function (a) {
      var id = a.getAttribute("data-nav");
      map[id] = map[id] || [];
      map[id].push(a);
    });
    var sections = Object.keys(map)
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    if (!sections.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute("aria-current"); });
        var group = map[en.target.id];
        if (group) group.forEach(function (a) { a.setAttribute("aria-current", "true"); });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(function (s) { io.observe(s); });
  });

  /* -------------------------------------------------- reveals */
  ready(function () {
    var items = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
    if (!items.length) return;
    if (!("IntersectionObserver" in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach(function (el) { io.observe(el); });
  });

  /* -------------------------------------------------- counters */
  ready(function () {
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
    if (!els.length) return;
    var fmt = function (v, dec) {
      if (dec > 0) return v.toFixed(dec);
      return Math.round(v).toLocaleString("en-GB");
    };
    var run = function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
      if (reduceMotion || !isFinite(target)) {
        el.textContent = fmt(target, dec);
        return;
      }
      var t0 = null;
      var dur = 1150;
      var step = function (ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * eased, dec);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) {
      els.forEach(run);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          run(en.target);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  });

  /* -------------------------------------------------- the tide toy */
  ready(function () {
    var clocks = Array.prototype.slice.call(document.querySelectorAll("[data-tide-clock]"));
    var countdown = document.querySelector("[data-tide-countdown]");
    var stateEl = document.querySelector("[data-tide-state]");
    var needle = document.querySelector(".tide-needle");
    if (!clocks.length) return;

    var M2 = 12.4206012 * 3600 * 1000; /* ms, principal lunar semidiurnal */
    var EPOCH = Date.UTC(2026, 10, 1, 4, 32, 0); /* a fictional zero, honestly labelled */

    function tideState(now) {
      var k = Math.floor((now - EPOCH) / M2);
      var lastHW = EPOCH + k * M2;
      var nextHW = lastHW + M2;
      while (nextHW < now) { lastHW = nextHW; nextHW += M2; }
      while (lastHW > now) { nextHW = lastHW; lastHW -= M2; }
      var lastLW = lastHW - M2 / 2;
      var nextLW = lastHW + M2 / 2;
      var period = (now - lastLW) / M2; /* 0..1 since low water */
      var height = (1 - Math.cos(2 * Math.PI * period)) / 2;
      return { lastHW: lastHW, nextHW: nextHW, lastLW: lastLW, nextLW: nextLW, height: height };
    }

    function fmtHM(ms) {
      var d = new Date(ms);
      return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }

    function fmtCountdown(ms) {
      var mins = Math.max(0, Math.round((ms - Date.now()) / 60000));
      var h = Math.floor(mins / 60);
      var m = mins % 60;
      if (h > 0) return "in " + h + "h " + (m < 10 ? "0" : "") + m + "m";
      return "in " + m + "m";
    }

    function update() {
      var t = tideState(Date.now());
      clocks.forEach(function (c) { c.textContent = fmtHM(t.nextHW); });
      if (countdown) countdown.textContent = "(" + fmtCountdown(t.nextHW) + ")";
      if (stateEl) {
        var rising = Date.now() < t.nextHW - (t.nextHW - t.lastHW) / 2;
        stateEl.textContent = rising
          ? "The flood is running — water coming in."
          : "The ebb is running — water leaving.";
      }
      if (needle) {
        var deg = -90 + 180 * t.height;
        needle.setAttribute("transform", "rotate(" + deg.toFixed(1) + " 70 70)");
      }
    }

    update();
    setInterval(update, 30000);
  });

  /* -------------------------------------------------- dialogs */
  ready(function () {
    var dlgBtns = Array.prototype.slice.call(document.querySelectorAll("[data-dialog]"));
    dlgBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var dlg = document.getElementById("dlg-" + btn.getAttribute("data-dialog"));
        if (!dlg || typeof dlg.showModal !== "function") return;
        try { dlg.showModal(); } catch (e) { /* already open */ }
      });
    });
    Array.prototype.slice.call(document.querySelectorAll(".dlg")).forEach(function (dlg) {
      dlg.addEventListener("click", function (e) {
        /* click on the backdrop (the dialog itself, not its children) closes */
        if (e.target === dlg) dlg.close();
      });
      var closer = dlg.querySelector(".dlg-close");
      if (closer) closer.addEventListener("click", function () { dlg.close(); });
    });
  });

  /* -------------------------------------------------- keys */
  ready(function () {
    document.addEventListener("keydown", function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target;
      var tag = t && t.tagName ? t.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || tag === "select" || (t && t.isContentEditable)) return;

      if (e.key === "/") {
        e.preventDefault();
        var name = document.getElementById("fName");
        var section = document.getElementById("enquiry");
        if (section && section.scrollIntoView) {
          section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
        if (name) setTimeout(function () { name.focus({ preventScroll: true }); }, reduceMotion ? 0 : 600);
        return;
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        var dlg = document.getElementById("dlg-shortcuts");
        if (dlg && typeof dlg.showModal === "function") {
          try { dlg.showModal(); } catch (err) { /* open */ }
        }
        return;
      }
      if (e.key === "p" || e.key === "P") {
        if (window.LongshoreAudio && typeof window.LongshoreAudio.toggleLast === "function") {
          e.preventDefault();
          window.LongshoreAudio.toggleLast();
        }
      }
    });
  });

  /* -------------------------------------------------- wiring: buy + preview */
  ready(function () {
    Array.prototype.slice.call(document.querySelectorAll("[data-order]")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (window.LongshoreForm) window.LongshoreForm.order(btn.getAttribute("data-order"));
      });
    });

    Array.prototype.slice.call(document.querySelectorAll("a[data-preview]")).forEach(function (link) {
      link.addEventListener("click", function () {
        var id = link.getAttribute("data-preview");
        var btn = document.querySelector('[data-scene-play="' + id + '"]');
        if (!btn) return;
        var card = btn.closest(".scene");
        setTimeout(function () {
          btn.focus({ preventScroll: true });
          if (card) {
            card.classList.add("is-playing");
            setTimeout(function () {
              if (!window.LongshoreAudio || !window.LongshoreAudio.isPlaying(id)) {
                card.classList.remove("is-playing");
              }
            }, 1600);
          }
        }, reduceMotion ? 60 : 700);
      });
    });
  });

  /* -------------------------------------------------- announcement helper */
  window.LongshoreAnnounce = function (msg) {
    var el = document.createElement("div");
    el.className = "visually-hidden";
    el.setAttribute("aria-live", "polite");
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 3000);
  };
})();
