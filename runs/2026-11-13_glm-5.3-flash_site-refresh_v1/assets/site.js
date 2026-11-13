/* SHUTTERHAUS VISUALS — refresh behaviour.
   No dependencies, no network. Everything here is an enhancement:
   with JavaScript off the pages still show all work, copy and contact routes
   (plates are plain links to the photograph files).
   Each block is independently guarded, so pages without plates (contact)
   still get the form handoff, and pages without a form still get the viewer. */
(function () {
  "use strict";

  /* ---------------- Mobile navigation ---------------- */
  var burger = document.querySelector(".burger");
  var nav = document.getElementById("site-nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
        burger.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("is-open") && !nav.contains(e.target) && !burger.contains(e.target)) {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
    nav.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("a")) {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------------- Portfolio view: deep-linkable mode switch ----------------
     The radios drive the layout through CSS :has(); JS only keeps the
     URL hash in step (#reading / #wall) so either mode can be linked. */
  var viewReading = document.getElementById("view-reading");
  var viewWall = document.getElementById("view-wall");
  if (viewReading && viewWall) {
    var applyViewFromHash = function () {
      if (location.hash === "#reading") { viewReading.checked = true; }
      else if (location.hash === "#wall") { viewWall.checked = true; }
    };
    applyViewFromHash();
    window.addEventListener("hashchange", applyViewFromHash);
    viewReading.addEventListener("change", function () {
      if (viewReading.checked) { try { history.replaceState(null, "", "#reading"); } catch (err) { /* file:// */ } }
    });
    viewWall.addEventListener("change", function () {
      if (viewWall.checked) { try { history.replaceState(null, "", "#wall"); } catch (err) { /* file:// */ } }
    });
  }

  /* ---------------- Enquiry form (mail handoff, no third party) ---------------- */
  var form = document.getElementById("enquiry-form");
  if (form) {
    var note = document.getElementById("enquiry-note");
    var select = form.querySelector('select[name="kind"]');
    var q = new URLSearchParams(location.search).get("package");
    if (q && select) {
      for (var oi = 0; oi < select.options.length; oi++) {
        if (select.options[oi].value === q) { select.selectedIndex = oi; break; }
      }
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (form.querySelector('[name="name"]').value || "").trim();
      var email = (form.querySelector('[name="email"]').value || "").trim();
      var msg = (form.querySelector('[name="message"]').value || "").trim();
      if (!name || !email || !msg) {
        if (note) note.textContent = "Please add your name, email and a short message.";
        return;
      }
      var subject = "Session enquiry" + (select && select.value !== "Something else" ? " \u2014 " + select.value : "");
      var body = name + " <" + email + ">\n\n" + msg + "\n\n\u2014 sent from shutterhausvisuals.co.za";
      var href = "mailto:alwin@shutterhausvisuals.co.za?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      if (note) {
        note.innerHTML = "";
        var a = document.createElement("a");
        a.href = href;
        a.textContent = "Your email app did not open? Use this link instead.";
        note.appendChild(document.createTextNode("Opening your email app with the message filled in. "));
        note.appendChild(a);
      }
      window.location.href = href;
    });
  }

  /* ---------------- Lightbox ----------------
     Keyboard model: ArrowLeft/ArrowRight move, Home/End jump to the
     first/last plate, Escape closes, Tab is trapped in the dialog, focus
     returns to the plate that opened it. */
  var plates = Array.prototype.slice.call(document.querySelectorAll("a.plate, a.strip__item"));
  var webpOK = false;
  (function () {
    var probe = new Image();
    probe.onload = function () { webpOK = probe.width === 2; };
    probe.onerror = function () { webpOK = false; };
    probe.src = "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=";
  })();

  if (plates.length) {
    var dialog = document.createElement("dialog");
    dialog.className = "lb";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Photograph viewer");
    dialog.innerHTML =
      '<button type="button" class="lb__x" aria-label="Close viewer">Close &#215;</button>' +
      '<button type="button" class="lb__nav lb__nav--p" aria-label="Previous photograph">&#8249;</button>' +
      '<div class="lb__stage">' +
      '<img class="lb__img" alt="" decoding="async" draggable="false" />' +
      "</div>" +
      '<button type="button" class="lb__nav lb__nav--n" aria-label="Next photograph">&#8250;</button>' +
      '<p class="lb__cap" aria-live="polite">' +
      '<span class="pn"></span><span class="t"></span><span class="m"></span></p>';
    document.body.appendChild(dialog);

    var img = dialog.querySelector(".lb__img");
    var capPn = dialog.querySelector(".lb__cap .pn");
    var capT = dialog.querySelector(".lb__cap .t");
    var capM = dialog.querySelector(".lb__cap .m");
    var stage = dialog.querySelector(".lb__stage");
    var btnX = dialog.querySelector(".lb__x");
    var btnP = dialog.querySelector(".lb__nav--p");
    var btnN = dialog.querySelector(".lb__nav--n");

    var at = 0;
    var returnFocus = null;
    var prevOverflow = "";

    function pad2(n) { return (n < 10 ? "0" : "") + n; }

    function show(i) {
      at = (i + plates.length) % plates.length;
      var p = plates[at];
      var d = p.dataset;
      if (d.jpg && !webpOK) {
        img.src = d.jpg;
      } else {
        img.onerror = function () { if (d.jpg) { img.onerror = null; img.src = d.jpg; } };
        img.src = d.full;
      }
      img.alt = d.alt || "";
      capPn.textContent = "Plate " + pad2(at + 1) + " / " + pad2(plates.length);
      capT.textContent = d.title ? ("\u201C" + d.title + "\u201D") : "";
      capM.textContent = [d.series, d.meta].filter(Boolean).join(" \u00B7 ");
      /* warm the neighbour so arrowing feels instant */
      var nxt = plates[(at + 1) % plates.length];
      if (nxt && nxt.dataset.full && !nxt._warm) {
        var pre = new Image();
        pre.src = nxt.dataset.full;
        nxt._warm = true;
      }
    }

    function openLb(anchor) {
      if (dialog.open) return;
      returnFocus = anchor;
      prevOverflow = document.body.style.overflow;
      show(plates.indexOf(anchor));
      dialog.showModal();
      document.body.style.overflow = "hidden";
      if (document.getElementById("app")) document.getElementById("app").inert = true;
      btnX.focus();
    }

    function closeLb() {
      if (!dialog.open) return;
      dialog.close();
      img.removeAttribute("src");
      document.body.style.overflow = prevOverflow;
      if (document.getElementById("app")) document.getElementById("app").inert = false;
      if (returnFocus && returnFocus.isConnected) {
        returnFocus.focus({ preventScroll: true });
      }
    }

    plates.forEach(function (p) {
      p.addEventListener("click", function (e) {
        e.preventDefault();
        openLb(p);
      });
    });

    btnX.addEventListener("click", closeLb);
    btnP.addEventListener("click", function () { show(at - 1); });
    btnN.addEventListener("click", function () { show(at + 1); });
    dialog.addEventListener("cancel", function (e) { e.preventDefault(); closeLb(); });
    dialog.addEventListener("click", function (e) {
      /* click on the dark backdrop (outside stage/buttons) closes */
      if (e.target === dialog) closeLb();
    });

    document.addEventListener("keydown", function (e) {
      if (!dialog.open) return;
      switch (e.key) {
        case "Escape": e.preventDefault(); closeLb(); break;
        case "ArrowRight": e.preventDefault(); show(at + 1); break;
        case "ArrowLeft": e.preventDefault(); show(at - 1); break;
        case "Home": e.preventDefault(); show(0); break;
        case "End": e.preventDefault(); show(plates.length - 1); break;
        case "Tab": {
          var focusables = [btnX, btnP, btnN];
          var idx = focusables.indexOf(document.activeElement);
          if (e.shiftKey && (idx <= 0)) { e.preventDefault(); focusables[focusables.length - 1].focus(); }
          else if (!e.shiftKey && (idx === focusables.length - 1 || idx === -1)) { e.preventDefault(); focusables[0].focus(); }
          break;
        }
      }
    });

    /* touch swipe: horizontal = previous/next, vertical pull = dismiss */
    var touch = null;
    dialog.addEventListener("touchstart", function (e) {
      if (e.touches.length === 1) touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    dialog.addEventListener("touchend", function (e) {
      if (!touch) return;
      var dx = e.changedTouches[0].clientX - touch.x;
      var dy = e.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) { show(dx < 0 ? at + 1 : at - 1); }
      else if (dy > 90 && Math.abs(dx) < 60) { closeLb(); }
    }, { passive: true });

    /* deep link: portfolio.html#p07 opens the viewer at plate 07 */
    function checkHash() {
      var m = /^#p(\d{1,2})$/.exec(location.hash);
      if (m) {
        var i = parseInt(m[1], 10) - 1;
        if (i >= 0 && i < plates.length && !dialog.open) openLb(plates[i]);
      }
    }
    window.addEventListener("hashchange", function () { if (!dialog.open) checkHash(); });
    checkHash();
  }
})();
